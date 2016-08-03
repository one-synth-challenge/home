'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const PORT = process.env.PORT || 3000;
const templateDir = path.join(__dirname, 'html');
const INDEX = path.join(templateDir, 'index.html');
const u = require('./util');
var connectionString = process.env.DATABASE_URL || 'postgres://postgres:mysecretpassword@localhost:5432/soundcloud-group-voting';

require('./db')(connectionString, (db) => {
  console.log('DB initialized...');

  u.putInContext({ db: db });

  u.readDir('services', (file, requirePath) => {
    const serviceName = file.replace(/\.js/,'');
    console.log('Adding service: ', serviceName, 'from', requirePath);
    u.putInContextLazy(serviceName, () => require(requirePath));
  });

  const app = express();

  // Add app instance to injector mappings
  u.putInContext({ app: app });

  // App utility functions

  // Middleware for requiring authentication, will put 'user' in context
  app.authenticate = () =>
    u.resolve((user, req, session) => {
      if (user != null) {
        return Promise.resolve(user);
      }
      // support cookie-based auth with 'sessionId'
      const sessionId = req.query.sessionId || req.get('X-Session-Id') || req.cookies && req.cookies.sessionId;
      return session.find(sessionId)
          .then(user => {
            if (!process.domain) {
              console.log('Setting current user, but no process.domain!');
            }
            // this should be in a domain
            u.putInContext({ user: user });
          })
          .catch(err => {
            app.sendError(401, 'Not Authorized');
            throw err
          })
    });

  app.requireAuthorization = (groupId, permission) =>
    u.resolve((db, user) =>
      db.UserGroup.findOne({where:{groupId:{$eq:groupId},userId:{$eq:user.id},permissionId:{$eq:permission.id}}})
        .then(db.assertResult)
        .catch(err => {
          app.sendError(401, 'Not Authorized');
          throw err
        })
    );

  app.sendError = (status, err) => {
    console.error('Send error', err);
    var res = u.getFromContext('res');
    res.statusMessage = err && err.message;
    res.status(status).end();
  };

  // Handle cookies
  app.use(cookieParser());

  // Add proper HTTP JSON + form handling for all requests
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  /**
   * Add CORS headers for all requests
   */
  app.all('/*', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookies, X-Session-Id');
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Put req & res in the current context
  app.use((req, res, next) => {
    u.executeInLocalContext(() => {
      try {
        u.putInContext({ req: req, res: res });
        next();
      } catch(e) {
        console.error('Error duing req/res:', e);
        throw e;
      }
    })
  });

  u.requireDir('handlers', (name, handler) => {
    const route = '/' + name.replace(/\.js/,'');
    console.log('Routing', name, 'to', route);
    const subrouter = new express.Router({ mergeParams: true });
    try {
      handler(subrouter, app, db);
      app.use(route, subrouter);
    } catch(e) {
      console.error('Error with handler:', name, e);
    }
  });

  app.all('/sql', function (req, res, next) {
    console.log('Accessing the secret section ...');
    next(); // pass control to the next handler
  });

  app.get('/', (req, res) => res.sendFile(INDEX));

  function escapeRegExp(str) {
    return new RegExp(str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
  }
  const readReplace = (file, replace) => {
    var contents = fs.readFileSync(path.join(templateDir, file), "utf8");
    if (replace) for (var k in replace) contents = contents.replace(escapeRegExp('{'+k+'}'), replace[k]);
    return contents;
  }
  app.route('/sql')
    .get((req, res) => res.send(readReplace('sql.html')))
    .post((req, res) => executeQuery(req.body.sql, {}, data => res.send(readReplace('sql.html', { result: data, sql: req.body.sql }))));

  // r.params haas userId, contestId
  app.get('/users/:userId/contest/:contestId', (r,s) => getUserContestVotes(r.params));

  var router = express.Router();

  const server = app.use((req, res) => res.sendFile(INDEX))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

  const wss = new SocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  setInterval(() => {
    wss.clients.forEach((client) => {
      client.send(new Date().toTimeString());
    });
  }, 1000);
}); // end DB

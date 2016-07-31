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

require('./db')(connectionString, db => {
  console.log('DB initialized...');

  u.putInContext({ db: db }, () => {
    const serviceMappings = {};
    u.readDir('services', (file, requirePath) => {
      const serviceName = file.replace(/\.js/,'');
      console.log('Adding service: ', serviceName, 'from', requirePath);
      serviceMappings[serviceName+'$deferred'] = () => require(requirePath);
    });

    const app = express();
    // Add app instance to injector mappings
    serviceMappings.app = app;

    /// Put all services in context for resolution
    u.putInContext(serviceMappings, () => {
      // App utility functions

      // Middleware for requiring authentication, will put 'user' in context
      app.requireAuthentication = (req, res, next) => {
        // support cookie-based auth with 'sessionId'
        const sessionId = req.query.sessionId || req.get('X-Session-Id') || req.cookies && req.cookies.sessionId;
        return u.resolve((session) =>
          session.find(sessionId)
            .then(user =>
              u.putInContext({ user: user }, next)
            )
            .catch(err => app.sendError(401, 'Not Authorized'))
        );
      };

      app.sendError = (status, err) => {
        console.log(err);
        var res = u.getFromContext('res');
        res.statusMessage = err && err.message;
        res.status(status).end();
      };

      // Handle cookies
      app.use(cookieParser());

      // Add proper HTTP JSON + form handling for all requests
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: true }));

      // Put req & res in the current context
      app.use((req, res, next) => {
        u.putInContext({ req: req, res: res }, next);
      });

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

      u.requireDir('handlers', (name, handler) => {
        const route = '/' + name.replace(/\.js/,'');
        console.log('Routing', name, 'to', route);
        const subrouter = new express.Router({ mergeParams: true });
        handler(subrouter, app, db);
        app.use(route, subrouter);
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
    }); // end service mappings
  }); // end db in context
}); // end DB

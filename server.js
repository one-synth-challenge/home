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
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:mysecretpassword@localhost:5432/soundcloud-group-voting';
const isDebugging = process.env.IS_DEBUG || false;

require('./db')(connectionString, (db) => {
  console.log('DB initialized...');

  u.putInContext({ db: db });

  u.readDir('services', (file, requirePath) => {
    const serviceName = file.replace(/\.js/,'');
    if (isDebugging) console.log('Adding service: ', serviceName, 'from', requirePath);
    u.putInContextLazy(serviceName, () => require(requirePath));
  });

  const app = express();

  // Add app instance to injector mappings
  u.putInContext({ app: app });

  // App utility functions

  app.sendError = (status, err) => {
    var res = u.getFromContext('res');
    res.statusMessage = err && err.message;
    res.status(status).end();
  };

  // Quell the authorization error promise rejection mess
  process.on('unhandledRejection', function(reason, p) {
    if (!reason.authFailure) {
      console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    }
  });

  // Handle cookies
  app.use(cookieParser());

  /**
   * Add CORS headers for all requests
   */
  app.all('/*', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookies, X-Session-Id');
    if (req.method === 'OPTIONS') {
      // TODO this won't send all the same headers... might be a problem?
      res.end();
      return;
    }
    // also allows us to use: .then(res.json)
    var _json = res.json;
    res.json = (...args) => {
      res.setHeader('Content-Type', 'application/json');
      _json.apply(res, args);
    };
    next();
  });

  // handle uploads
  app.use((req, res, next) => {
    var contentType = req.headers['content-type'];
    if (contentType && contentType.indexOf('multipart/form-data') >= 0) {
      var formidable = require('formidable');
      var form = new formidable.IncomingForm();
        form.on('progress', function(bytesReceived, bytesExpected) {
        });
        form.parse(req, (err, fields, files) => {
          req.body = {};
          Object.keys(fields).forEach(k =>
            req.body[k] = JSON.parse(fields[k]));
          Object.keys(files).forEach(k =>
              req.body[k] = files[k]);
          next();
        });
    } else {
      next();
    }
  });

  // Add proper HTTP JSON + form handling for all requests
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  var stackFrame = function(context, next) {
    this.context = context,
    next();
  };

  // Put req & res in the current context
  app.use((req, res, next) => {
    var d = require('domain').create();
    const cleanUpDomain = (event) => () => {
      if (d.destroy) {
        d.destroy();
      }
    };
    res.on('finish', cleanUpDomain('finish'));
    res.on('close', cleanUpDomain('close'));
    res.on('end', cleanUpDomain('end'));
    res.on('error', cleanUpDomain('error'));

    d.on('error', (e) => {
      // The error won't crash the process, but what it does is worse!
      // Though we've prevented abrupt process restarting, we are leaking
      // resources like crazy if this ever happens.
      // This is no better than process.on('uncaughtException')!
      console.error('Domain execution error', e);
    });

    //u.executeInLocalContext(() => {
    d.run(() => {
      u.putInContext({ req: req, res: res });
      next();
    });
  });

  u.requireDir('handlers', (name, handler) => {
    const route = '/' + name.replace(/\.js/,'');
    if (isDebugging) console.log('Routing', name, 'to', route);
    const subrouter = new express.Router({ mergeParams: true });
    try {
      handler(subrouter, app, db);
      app.use(route, subrouter);
    } catch(e) {
      console.error('Error with handler:', name, e);
    }
  });

  app.all('/sql', function (req, res, next) {
    if (isDebugging) console.log('Accessing the secret section ...');
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
    if (isDebugging) console.log('Client connected');
    ws.on('close', () => {
      if (isDebugging) console.log('Client disconnected')
    });
  });

  setInterval(() => {
    wss.clients.forEach((client) => {
      client.send(new Date().toTimeString());
    });
  }, 1000);
}); // end DB

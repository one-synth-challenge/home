'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');
const bodyParser = require('body-parser')
const fs = require('fs');
const PORT = process.env.PORT || 3000;
const templateDir = path.join(__dirname, 'html');
const INDEX = path.join(templateDir, 'index.html');
var connectionString = process.env.DATABASE_URL || 'postgres://postgres:mysecretpassword@localhost:5432/soundcloud-group-voting';

require('./db')(connectionString, db => {
console.log('DB initialized...');
const app = express();

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

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

const returnError = res => {
  return err => {
    console.log(err);
    res.status(500).send({ error: err });
  };
};

var router = express.Router();

app.all('/crud*', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type ');
  res.setHeader('Content-Type', 'application/json');
  console.log(req.body);
  next();
});

app.get('/crud', (req, res) => {
  res.json(Object.keys(db).filter(k => db[k].sync));
});

const excludeAttributes = {
  'database': true,
  'Model': true,
};
const normalizedTypes = {
};
normalizedTypes[db.normalizeDataType(db.DataTypes.UUID)] = 'uuid';
normalizedTypes[db.normalizeDataType(db.DataTypes.DATE)] = 'date';
normalizedTypes[db.normalizeDataType(db.DataTypes.TEXT)] = 'text';
normalizedTypes[db.normalizeDataType(db.DataTypes.STRING)] = 'string';
normalizedTypes[db.normalizeDataType(db.DataTypes.INTEGER)] = 'int';
normalizedTypes[db.normalizeDataType(db.DataTypes.BIGINT)] = 'long';
normalizedTypes[db.normalizeDataType(db.DataTypes.DOUBLE)] = 'double';
const mapValues = (k, v) => {
  if (excludeAttributes[k]) return undefined;
  if (k === 'type') {
    var typ = normalizedTypes[v];
    if (typ) {
      return { type: typ, opts: v };
    }
  }
  return v;
};

Object.keys(db).map(k => {
  const table = db[k];
  if (!table.findAll) return;

  app.options((req, res) => res.send());
  app.get('/crud/'+k+'/model', (req, res) => {
    res.send(JSON.stringify(table.attributes, mapValues));
  });
  app.get('/crud/'+k, (req, res) => table.findAll().then(data => res.json(data)).catch(returnError(res)))
  app.put('/crud/'+k, (req, res) => table.create(req.body).then(data => res.json(data)).catch(returnError(res)))
  app.post('/crud/'+k+'/:id', (req, res) => table.update(req.body).then(data => res.json(data)).catch(returnError(res)))
  app.delete('/crud/'+k+'/:id', (req, res) => table.destroy({where:{id:{$eq:req.params.id}}}).then(data => res.json(data)).catch(returnError(res)))
});

const server = app.use((req, res) => res.sendFile(INDEX))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new SocketServer({ server });

const executeQuery = (sql, params, onData) => {
  console.log('execute: ', sql)
  var db = pgp(connectionString);
  db.one(sql, params)
    .then(function (data) {
      console.log("DATA:", data.value);
      onData(data.value);
    })
    .catch(function (error) {
      console.log("ERROR:", error);
    });
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);

}) // end DB

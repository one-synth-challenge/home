'use strict';

const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX))
  .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new SocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());

    var pg = require('pg').native;
    var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/soundcloud-group-voting';
    var client = new pg.Client(connectionString);
    try {

      client.connect();
      var query = client.query('SELECT * FROM mytable');



    } finally {
      client.end();
    }
  });
}, 1000);

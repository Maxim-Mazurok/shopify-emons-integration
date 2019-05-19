require('./env');

const fs = require('fs');
const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY, 'utf8');
const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE, 'utf8');

const express = require('express');
const https = require('https');
const http = require('http');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

http.createServer(app).listen(process.env.HTTP_PORT);
https.createServer({
  key: privateKey,
  cert: certificate,
}, app).listen(process.env.HTTPS_PORT);

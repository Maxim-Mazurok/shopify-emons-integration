require('./env');

const fs = require('fs');
const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY, 'utf8');
const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE, 'utf8');

const express = require('express');
const https = require('https');
const http = require('http');
const app = express();

http.createServer(app).listen(80);
https.createServer({
  key: privateKey,
  cert: certificate,
}, app).listen(443);

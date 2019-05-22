'use strict';
const http = require('http');
const https = require('https');
const NewReadable = require('./NewReadable');
require('request-to-curl');
module.exports = (callback = () => { }) => {
  http.__request__ = http.__request__ || http.request;
  http.request = getRequestProxy(http, callback);
  https.__request__ = https.__request__ || https.request;
  https.request = getRequestProxy(https, callback);
  function getRequestProxy(httpOrHttps, callback) {
    return function(options, onResponse) {
      const out = {
        request: '',
        response: '',
        error: '',
        time: new Date(),
      };
      const req = httpOrHttps.__request__(
        options,
        res => {
          const resProxy = new NewReadable(res);
          const resProxy2 = new NewReadable(res);
          const statusLineAndHeaders = getStatusLineAndHeaders(res);
          resProxy.setEncoding('utf8');
          let body = '';
          resProxy.on('data', chunk => {
            body += chunk;
          });
          resProxy.on('end', () => {
            out.response = statusLineAndHeaders + '\n\n' + body;
            out.request = req.toCurl();
            callback(out);
          });
          // eslint-disable-next-line
          resProxy2.__proto__ = res; // eslint-ignore
          onResponse && onResponse(resProxy2);
        }
      );
      req.on('error', e => {
        out.error = JSON.stringify(e);
        out.request = req.toCurl();
        callback(out);
      });
      return req;
    };
  }
};

function getStatusLineAndHeaders(res) {
  const s = [];
  const protocol = res.req.agent.protocol.replace(':', '').toUpperCase();
  s.push(`${protocol}/${res.httpVersion} ${res.statusCode} ${res.statusMessage}`);
  const headers = res.headers;
  for (const k in headers) {
    s.push(`${k}: ${headers[k] || ''}`);
  }
  return s.join('\n');
}


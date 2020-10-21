'use strict';

const os = require('os')
const http = require('http')
const url = require('url')
const HTTPParser = process.binding('http_parser').HTTPParser=  require('http-parser-js').HTTPParser
const {lengthLimit}=require('../const')

function parseRequestBody(request) {
    let parser = new HTTPParser(HTTPParser.REQUEST);

    parser.body = '';
    parser.bodyStart = 0;

    parser[HTTPParser.kOnBody | 0] = function (b, start) {
        if (!parser.bodyStart) {
            parser.bodyStart = start;
        }

        parser.body = b;
    };

    if (typeof request === 'string') {
        request = Buffer(request);
    }

    parser.execute(request, 0, request.length);

    return parser.body.slice(parser.bodyStart);
}

function escapeStringWindows(str) {
    return "\"" + str.replace(/"/g, "\"\"")
                     .replace(/%/g, "\"%\"")
                     .replace(/\\/g, "\\\\")
                     .replace(/[\r\n]+/g, "\"^$&\"") + "\"";
}

function escapeStringPosix(str) {
    function escapeCharacter(x) {
        let code = x.charCodeAt(0);
        if (code < 256) {
            // Add leading zero when needed to not care about the next character.
            return code < 16 ? "\\x0" + code.toString(16) : "\\x" + code.toString(16);
        }
        code = code.toString(16);
        return "\\u" + ("0000" + code).substr(code.length, 4);
    }

    if (/[^\x20-\x7E]|\'/.test(str)) {
        // Use ANSI-C quoting syntax.
        return "$\'" + str.replace(/\\/g, "\\\\")
                          .replace(/\'/g, "\\\'")
                          .replace(/\n/g, "\\n")
                          .replace(/\r/g, "\\r")
                          .replace(/[^\x20-\x7E]/g, escapeCharacter) + "'";
    } else {
        // Use single quote syntax.
        return "'" + str + "'";
    }
}

function toCurl(platform) {
  try {
    platform = platform || (os.platform().startsWith('win') ? 'win' : 'posix');

    let command = ['curl'],
      ignoredHeaders = ['host', 'method', 'path', 'scheme', 'version'],
      escapeString = platform === 'win' ? escapeStringWindows : escapeStringPosix,
      requestMethod = 'GET',
      data = [],
      requestHeaders = this._headers,
      requestBody = parseRequestBody(this._requestBody).toString(),
      contentType = requestHeaders['content-type'];

    command.push(escapeString(url.format({
        protocol: this.agent.protocol,
        port: this.agent.port,
        host: requestHeaders.host
      }) + this.path).replace(/[[{}\]]/g, "\\$&")
    );

    if (requestBody !== ''&&requestBody.length<lengthLimit) {
      ignoredHeaders.push('content-length');
      requestMethod = 'POST';
      if(Array.isArray(contentType))
        contentType=contentType[0]
      if (contentType && contentType.startsWith('application/x-www-form-urlencoded')) {
        data.push('--data');
      } else {
        data.push('--data-binary');
      }

      data.push(escapeString(requestBody));
    }

    if (this.method !== requestMethod) {
      command.push('-X');
      command.push(this.method);
    }

    Object.keys(requestHeaders)
      .filter(name => ignoredHeaders.indexOf(name) === -1)
      .forEach(function (name) {
        command.push('-H');
        command.push(escapeString(name.replace(/^:/, '') + ': ' + requestHeaders[name]));
      });

    command = command.concat(data);
    command.push('--compressed');

    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0') {
      command.push('--insecure');
    }

    return command.join(' ');
  }
  catch (e){
    return e.message
  }
}

http.ClientRequest.prototype._onSocket = http.ClientRequest.prototype.onSocket;

http.ClientRequest.prototype.onSocket = function onSocket(socket) {
    let self = this,
        ondata = socket.ondata,
        write = socket.write;

    self._requestBody = '';

    socket.ondata = function (buf, start, end) {
        self._requestBody += buf.slice(start, end).toString();
        return ondata.apply(this, arguments);
    };

    socket.write = function (data) {
        self._requestBody += data.toString()
        return write.apply(this, arguments);
    };

    socket.on('close', function () {
        self.body = parseRequestBody(self._requestBody);
    });

    this._onSocket(socket);
};

http.ClientRequest.prototype.toCurl = toCurl;




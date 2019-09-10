var os = require('os'),
  http = require('http'),
  url = require('url'),
  HTTPParser =require('http-parser-js').HTTPParser


function escapeStringWindows(str) {
  return "\"" + str.replace(/"/g, "\"\"")
    .replace(/%/g, "\"%\"")
    .replace(/\\/g, "\\\\")
    .replace(/[\r\n]+/g, "\"^$&\"") + "\"";
}

function escapeStringPosix(str) {
  function escapeCharacter(x) {
    var code = x.charCodeAt(0);
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
function parseRequestBody(request) {
  var parser = new HTTPParser(HTTPParser.REQUEST);

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



http.ClientRequest.prototype._onSocket = http.ClientRequest.prototype.onSocket;

http.ClientRequest.prototype.onSocket = function onSocket(socket) {
  var self = this,
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

http.ClientRequest.prototyperequestInfo= function requestInfo()
{
  let requestBody = parseRequestBody(this._requestBody).toString()
  let escapeString = platform === 'win' ? escapeStringWindows : escapeStringPosix;
  return  {
    protocol: this.agent.protocol,
    port: this.agent.port,
    host:  this._headers.host,
    requestBody:escapeString(requestBody)
  }
}

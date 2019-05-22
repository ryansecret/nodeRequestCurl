'use strict';
const Readable = require('stream').Readable;

class NewReadable extends Readable {
  constructor(originReadable) {
    super();
    this.originReadable = originReadable;
    this.start();
  }

  start() {
    this.originReadable.on('data', chunck => {
      this.push(chunck);
    });

    this.originReadable.on('end', () => {
      this.push(null);
    });

    this.originReadable.on('error', e => {
      this.push(e);
    });
  }

  // 作为Readable的实现类，必须实现_read函数，否则会throw Error
  _read() {
  }
}
module.exports = NewReadable;

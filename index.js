var parse_request = require('./parser').parse_request
var parse_body = require('./parser').parse_body

module.exports = HTTPParser

function Writer() {
  var buffer = Buffer(8096)
  var zpos = 0
  return {
    add: function(num) {
      buffer[zpos++] = num
      if (zpos > 8096) zpos = 0
    },

    flush: function() {
      var pos = zpos
      zpos = 0
      return buffer.toString('utf8', 0, pos)
    }
  }
}

function HTTPParser(type) {
  var self = Object.create(HTTPParser.prototype)
  self[0] = self[1] = self[2] = self[3] = function(){}
  self.writer = Writer()

  self._methods = Object.create(null)
  HTTPParser.methods.forEach(function(m, i) {
    self._methods[m] = i
  })

  self.reinitialize(type)
  return self
}

HTTPParser.prototype.reinitialize = function(type) {
  this.parser = parse_request(this.writer)
  this.parser.next()

  this.stage = 0
  this.type  = type
  this.error = null
}

HTTPParser.prototype.close = function() {
  throw Error('unimplemented')
}

HTTPParser.prototype.execute = function(data, start) {
  if (this.error !== null) return this.error

  start = start || 0
  data.start = start
  var result = this.parser.next(data)
  var value = result.value
  if (result.done && value instanceof Error) {
    this.error = value
    return value
  }

  /*
   *  Here is a small state machine to bounce requests between
   *  respective generators.
   *
   *  states:
   *   0 - parsing request/response line + headers
   *   1 - parsing content body
   *   2 - parsing trailers
   *
   *  Thou shalt accept this mess in the name of performance.
   */
  if (this.stage === 0) {
    // this generator always returns exactly one value
    if (value) {
      var i = this.methods.indexOf(value.methodString)
      if (i === -1) {
        this.error = Error('Method not supported')
        return this.error
      }
      value.method = i

      var len = value.contentLength
      this[1](value)
      if (!len) {
        this[3]()
        this.reinitialize()
      } else {
        this.stage++
        this.parser = parse_body(len)
        this.parser.next()
      }
    }
  } else if (this.stage === 1) {
    // this generator can end without a value
    if (value) this[2](value)

    if (result.done) {
      this[3]()
      this.reinitialize()
    }
  }

  // Generators may modify data.start to indicate that there
  // is some data yet to be processed in this buffer.
  //
  // I admit, it's a dirty hack.
  if (data.start !== start && data.start < data.length) {
    return this.execute(data, data.start)
  }
}

HTTPParser.prototype.finish = function() {
  throw Error('unimplemented')
}

HTTPParser.prototype.pause = function() {
  throw Error('unimplemented')
}

HTTPParser.prototype.resume = function() {
  throw Error('unimplemented')
}

HTTPParser.REQUEST            = 0
HTTPParser.RESPONSE           = 1
HTTPParser.kOnHeaders         = 0
HTTPParser.kOnHeadersComplete = 1
HTTPParser.kOnBody            = 2
HTTPParser.kOnMessageComplete = 3

/* Request Methods */
HTTPParser.methods = HTTPParser.prototype.methods = [
  'DELETE',
  'GET',
  'HEAD',
  'POST',
  'PUT',
  /* pathological */
  'CONNECT',
  'OPTIONS',
  'TRACE',
  /* webdav */
  'COPY',
  'LOCK',
  'MKCOL',
  'MOVE',
  'PROPFIND',
  'PROPPATCH',
  'SEARCH',
  'UNLOCK',
  /* subversion */
  'REPORT',
  'MKACTIVITY',
  'CHECKOUT',
  'MERGE',
  /* upnp */
  'M-SEARCH',
  'NOTIFY',
  'SUBSCRIBE',
  'UNSUBSCRIBE',
  /* RFC-5789 */
  'PATCH',
  'PURGE',
  /* CalDAV */
  'MKCALENDAR',
]

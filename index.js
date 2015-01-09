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
  if (type == null) type = this.type
  this.parser = parse_request(this.writer, type)
  this.parser.next()

  this.url      = ''
  this.stage    = 0
  this.type     = type
  this.error    = null
  this.upgraded = false
  this.paused   = false
}

HTTPParser.prototype.execute = function(data, start) {
  if (this.error !== null) return this.error
  if (this.paused) return Error('Parser is paused')
  if (this.upgraded) return start

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
      if (value.methodString !== undefined) {
        var i = this.methods.indexOf(value.methodString)
        if (i === -1) {
          this.error = Error('Method not supported')
          return this.error
        }
        value.method = i
      }

      if (value.upgrade) this.upgraded = true

      var len = value.contentLength
      this[1](value)
      this.url = value.url
      if (!len) {
        this[3]()
        if (!value.upgrade) this.reinitialize()
      } else {
        this.stage++
        this.parser = parse_body(len)
        this.parser.next()
      }
    }
  } else if (this.stage === 1) {
    if (!result.done) {
      if (value) this[2](value, 0, value.length)
    } else {
      if (value === true) {
        // here be dragons... I mean, trailers
        this.stage++
        this.parser = parse_request(this.writer, 0)
        this.parser.next()
      } else {
        if (value) this[2](value, 0, value.length)
        this[3]()
        this.reinitialize()
      }
    }
  } else if (this.stage === 2) {
    if (value) {
      this[0](value.headers, this.url)
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

  return data.length
}

HTTPParser.prototype.close =
HTTPParser.prototype.finish = function() {
  return undefined
}

HTTPParser.prototype.pause = function() {
  this.paused = true
}

HTTPParser.prototype.resume = function() {
  this.paused = false
}

HTTPParser.ANY                = 0
HTTPParser.REQUEST            = 1
HTTPParser.RESPONSE           = 2
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

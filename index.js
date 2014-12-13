var parse_request = require('./parser').parse_request

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

  this.type   = type
  this.error  = null
}

HTTPParser.prototype.close = function() {
  throw Error('unimplemented')
}

HTTPParser.prototype.execute = function(data) {
  if (this.error !== null) return this.error

  var result = this.parser.next(data)
  if (result.done) {
    var value = result.value
    if (value instanceof Error) {
      this.error = value
      return value
    } else {
      if (value.remain) {
        var t = value.remain
        value.remain = null
      }

      this[1](value)
      this[3]()

      if (t) {
        this.reinitialize(this.type)
        return this.execute(t)
      }
    }
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

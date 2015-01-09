
module.exports.parse_request = function* parse_request(writer, mode) {
  var pos, len, buf, ch
  var conn_keepalive = false
  var conn_close = false
  var version_correct

  // this function is executed every time a new data comes in;
  // basically, it's helper for resetting position and length
  //
  // javascript really needs macro
  function next(b) { pos = b.start, len = b.length, buf = b }

  // get the first chunk of data
  next(yield)

  // These helpers are used to store data from buf to an internal
  // buffer.
  //  - add(ch) - store one character to the buffer
  //  - flush() - return utf8-encoded string and reset buffer
  var add   = writer.add
  var flush = writer.flush

  // skip linebreaks before request/status line,
  // isn't applicable for headers mode
  if (mode === 1 || mode === 2) {
    while (true) {
      ch = buf[pos]
      if (ch === 0x0D) {
        if (++pos >= len) next(yield)
        if (buf[pos] === 0x0A) {
          if (++pos >= len) next(yield)
          continue
        }
      } else if (ch === 0x0A) {
        if (++pos >= len) next(yield)
        continue
      }
      break
    }
  }

  if (mode === 1 /* request */) {
    /*
     *  Parse request line
     *
     *  http://tools.ietf.org/html/rfc7230#section-3.1.1
     */

    // return value of the generator;
    // we return either this or an Error instance
    var result = {
      method          : 0,
      methodString    : null,
      url             : null,
      versionMajor    : -1,
      versionMinor    : -1,
      headers         : [],
      contentLength   : 0, // -1 for chunked
      shouldKeepAlive : true,
      upgrade         : false,
    }

    // parse http method until we stumble across non-token char
    //
    // GET /whatever HTTP/1.0
    // ^^^-- this is it in case you didn't notice
    while (is_token[ch = buf[pos]]) {
      add(ch)
      if (++pos >= len) next(yield)
    }

    // ch is the first non-token char here
    //
    // note: joyent/http-parser allows multiple spaces here,
    //       but newer rfc restricts it to one space only
    if (ch !== 0x20) return Error('Invalid HTTP method')
    if (++pos >= len) next(yield)
    result.methodString = flush()
    if (result.methodString === 'CONNECT') result.upgrade = true

    // parse http url, just wait until a non-printable char
    // or a space comes out
    //
    // GET /whatever HTTP/1.0
    //     ^^^^^^^^^-- this
    while ((ch = buf[pos]) > 0x20 && ch !== 0x7F) {
      add(ch)
      if (++pos >= len) next(yield)
    }

    result.url = flush()
    if (result.url.length === 0) return Error('Invalid URL')

    // ch is the first non-url char here,
    // it's either a space in HTTP/1+ or \r\n|\n in HTTP/0.9
    if (ch === 0x20) RVER: {
      if (++pos >= len) next(yield)
      version_correct = false

      // parse "HTTP" constant
      if (buf[pos] !== 0x48 /* H */) break RVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x54 /* T */) break RVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x54 /* T */) break RVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x50 /* P */) break RVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x2f /* / */) break RVER ; if (++pos >= len) next(yield)

      // parse major HTTP version
      //
      // note: joyent/http-parser allows version up to 999,
      //       but newer rfc restricts it to one digit
      //
      //       (HTTP/xxx.x will be parsed by a quantum computer
      //        anyway, and javascript doesn't work on those)
      ch = buf[pos]
      if (!(0x30 <= ch && ch <= 0x39)) break RVER
      result.versionMajor = buf[pos] - 0x30
      if (++pos >= len) next(yield)

      if (buf[pos] !== 0x2e /* . */) break RVER ; if (++pos >= len) next(yield)

      // parse minor HTTP version
      ch = buf[pos]
      if (!(0x30 <= ch && ch <= 0x39)) break RVER
      result.versionMinor = buf[pos] - 0x30
      if (++pos >= len) next(yield)

      // parse patch HTTP ve... oh wait, I forgot, only npm stuff uses semver
      version_correct = true
    } else {
      result.versionMajor = 0
      result.versionMinor = 9
      version_correct = true
    }

    if (!version_correct) return Error('Invalid HTTP version')

    // CRLF | LF
    // Here an everywhere else we're making "\r" optional, because it's
    // very inconvenient to debug http servers with `nc` otherwise.
    if (buf[pos] === 0x0D) if (++pos >= len) next(yield)
    if (buf[pos] !== 0x0A) return Error('Invalid HTTP version')

  } else if (mode === 2 /* status line */) {
    /*
     *  Parse status line
     *
     *  http://tools.ietf.org/html/rfc7230#section-3.1.2
     */
    var result = {
      statusCode      : 0,
      statusMessage   : null,
      versionMajor    : -1,
      versionMinor    : -1,
      headers         : [],
      contentLength   : Infinity,
      shouldKeepAlive : true,
      upgrade         : false,
    }

    SVER: {
      // same code as before basically
      version_correct = false

      // parse "HTTP" constant
      if (buf[pos] !== 0x48 /* H */) break SVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x54 /* T */) break SVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x54 /* T */) break SVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x50 /* P */) break SVER ; if (++pos >= len) next(yield)
      if (buf[pos] !== 0x2f /* / */) break SVER ; if (++pos >= len) next(yield)

      // major
      ch = buf[pos]
      if (!(0x30 <= ch && ch <= 0x39)) break SVER
      result.versionMajor = buf[pos] - 0x30
      if (++pos >= len) next(yield)

      if (buf[pos] !== 0x2e /* . */) break SVER ; if (++pos >= len) next(yield)

      // minor
      ch = buf[pos]
      if (!(0x30 <= ch && ch <= 0x39)) break SVER
      result.versionMinor = buf[pos] - 0x30
      if (++pos >= len) next(yield)

      version_correct = true
    }

    if (!version_correct) return Error('Invalid HTTP version')

    // HTTP/1.0 200 Here is your cookie
    //         ^--- here
    if (buf[pos] !== 0x20) return Error('Invalid HTTP version')
    if (++pos >= len) next(yield)

    // HTTP/1.0 200 Here is your cookie
    //          ^^^--- parsing this thingy
    for (var i=0; i<3; i++) {
      ch = buf[pos]
      if (!(0x30 <= ch && ch <= 0x39)) return Error('Invalid status')
      result.statusCode = result.statusCode * 10 + buf[pos] - 0x30
      if (++pos >= len) next(yield)
    }

    // HTTP/1.0 200 Here is your cookie
    //             ^--- here
    if (buf[pos] === 0x20) {
      if (++pos >= len) next(yield)

      // HTTP/1.0 200 Here is your cookie
      //              ^^^^^^^^^^^^^^^^^^^ and now the rest of the line
      while (true) {
        ch = buf[pos]

        // allow 0x09, 0x20-0x7E, 0x80-0xFF
        if (ch === 0x7F || (ch < 0x20 && ch !== 0x09)) break

        add(ch)
        if (++pos >= len) next(yield)
      }

      result.statusMessage = flush()
    } else {
      // response without status line, e.g. `HTTP/1.0 200`
      result.statusMessage = ''
    }

    // CRLF | LF
    if (buf[pos] === 0x0D) if (++pos >= len) next(yield)
    if (buf[pos] !== 0x0A) return Error('Invalid status line')

  } else { // just headers
    var result = {
      headers         : [],
      contentLength   : 0,
    }
  }

  if (++pos >= len) next(yield)

  /*
   *  Parse headers into an array
   *
   *  Headers will be parsed in the first invocation of the loop,
   *  and trailers (if any) will be parsed in the second one.
   *
   *  http://tools.ietf.org/html/rfc7230#section-3.2
   */
  var headers = result.headers
  while (true) {
    var ch = buf[pos]

    if (!is_token[ch]) {
      // CRLF | LF
      if (ch === 0x0D) {
        if (++pos >= len) next(yield)
        if (buf[pos] === 0x0A) {
          break
        } else { // only LF expected after CR
          return Error('Invalid header')
        }
      } else if (ch === 0x0A) {
        break
      }

      // garbage
      return Error('Invalid header')
    }

    // we found a header, try to parse its field-name
    //
    // Content-type: text/whatever
    // ^^^^^^^^^^^^ here it is
    add(ch)
    if (++pos >= len) next(yield)
    //                                v--- this isn't actually valid in http,
    //                                     but there are win servers doing that
    while (is_token[ch = buf[pos]] || ch === 0x20) {
      add(ch)
      if (++pos >= len) next(yield)
    }
    var last_header = flush()
    headers.push(last_header)

    // Content-type: text/whatever
    //             ^ check that thing
    if (ch !== 0x3a /* : */) return Error('Invalid header')
    if (++pos >= len) next(yield)

    // OWS skipping
    ch = buf[pos]
    while (ch === 0x20 || ch === 0x09) {
      if (++pos >= len) next(yield)
      ch = buf[pos]
    }

    // loop through field-vchars array
    //
    // Accept: foo, bar, baz
    //         ^^^^^^^^^^^^^ here
    while (true) {
      ch = buf[pos]

      // allow 0x09, 0x20-0x7E, 0x80-0xFF
      if (ch === 0x7F || (ch < 0x20 && ch !== 0x09)) break

      add(ch)
      if (++pos >= len) next(yield)
    }

    var t = flush()
    headers.push(t)
    switch (last_header.toLowerCase()) {
      case 'content-length':
        if (t.match(/^ *\d+ *$/)) result.contentLength = parseInt(t, 10)
        break
      case 'transfer-encoding':
        if (t === 'chunked') result.contentLength = -1
        break
      case 'connection':
      case 'proxy-connection':
        if (t.match(/(^|,)\s*keep-alive\s*(,|$)/i)) conn_keepalive = true
        if (t.match(/(^|,)\s*close\s*(,|$)/i))      conn_close = true
        if (t.match(/(^|,)\s*upgrade\s*(,|$)/i))    result.upgrade = true
        break
    }

    // CRLF | LF
    if (ch === 0x0D) {
      if (++pos >= len) next(yield)
      if (buf[pos] === 0x0A) {
        if (++pos >= len) next(yield)
        continue
      }
    } else if (ch === 0x0A) {
      if (++pos >= len) next(yield)
      continue
    }

    return Error('Invalid header')
  }

  if (++pos < len) {
    buf.start = pos
  }

  // should we keep this poor little connection alive?.. or kill it? :(
  if (result.shouldKeepAlive !== undefined) {
    if (result.versionMajor > 0 && result.versionMinor > 0) {
      // HTTP/1.1 (or HTTP/3.8 'cause why not)
      if (conn_close) {
        result.shouldKeepAlive = false
      }
    } else {
      // HTTP/1.0 or HTTP/0.9
      if (!conn_keepalive) {
        result.shouldKeepAlive = false
      }
    }

    // if we still think keep-alive is a good idea, check further
    if (result.shouldKeepAlive && mode === 2 /* request */) {
      var i = result.statusCode
      if ((i >= 100 && i < 200) || i === 204 || i === 304) {
        // those status codes have no body
        result.shouldKeepAlive = true
      } else if (result.contentLength === Infinity) {
        // we should read this til eof, so...
        result.shouldKeepAlive = false
      } else {
        // chunked or fixed content-length
        result.shouldKeepAlive = true
      }
    }
  }

  if (result.upgrade) {
    // no content for upgraded requests, those are handled separate
    result.contentLength = 0
  }

  if (mode === 2 && result.contentLength === Infinity) {
    var i = result.statusCode
    if ((i >= 100 && i < 200) || i === 204 || i === 304) {
      // those status codes have no body
      result.contentLength = 0
    }
  }

  return result
}

module.exports.parse_body = function* parse_body(content_length) {
  var pos, len, buf, ch
  function next(b) { pos = b.start, len = b.length, buf = b }

  // get the first chunk of data
  next(yield)

  /*
   *  Now parsing content body
   */
  if (content_length > 0) {
    // Your old and boring fixed content-length,
    // just read N bytes and re-emit them as data chunks
    var length = content_length

    do {
      var rem_len = len - pos
      if (rem_len > length) {
        buf.start = pos + length
        return buf.slice(pos, pos + length)
      } else if (rem_len === length) {
        return pos ? buf.slice(pos) : buf
      } else {
        next(yield buf.slice(pos))
        length -= rem_len
      }
    } while (length > 0)

  } else {
    while (true) {
      // Chunked encoding
      var length = dehex[buf[pos]]
      if (length === 255) return Error('Invalid chunk')
      while (true) {
        if (++pos >= len) next(yield)
        var ch = buf[pos]
        var dec = dehex[ch]
        if (dec === 255) break
        length = length * 16 + dec
      }

      // trailing space in chunks;
      // not actually valid, but there is a test for that...
      while (ch === 0x20) {
        if (++pos >= len) next(yield)
        ch = buf[pos]
      }

      if (ch === 0x3b /* ; */) {
        // chunk extensions...? really? o_O
        do {
          if (++pos >= len) next(yield)
          ch = buf[pos]
        } while (ch !== 0x0D && ch !== 0x0A)
      }

      if (ch === 0x0D) {
        if (++pos >= len) next(yield)
        if (buf[pos] !== 0x0A) {
          return Error('Invalid chunk')
        }
      } else if (ch !== 0x0A) {
        return Error('Invalid chunk')
      }

      if (length === 0) {
        if (++pos >= len) next(yield)

        if (buf[pos] === 0x0D) {
          if (++pos >= len) next(yield)
          if (buf[pos] === 0x0A) {
            buf.start = pos + 1
            return
          } else {
            return Error('Invalid trailer')
          }
        } else if (buf[pos] === 0x0A) {
          buf.start = pos + 1
          return
        }
        buf.start = pos - 1
        return true
      }
      if (++pos >= len) next(yield)

      do {
        var rem_len = len - pos
        if (rem_len > length) {
          buf.start = pos + length
          next(yield buf.slice(pos, pos + length))
        } else if (rem_len === length) {
          next(yield (pos ? buf.slice(pos) : buf))
        } else {
          next(yield buf.slice(pos))
        }
        length -= rem_len
      } while (length > 0)

      ch = buf[pos]
      if (ch === 0x0D) {
        if (++pos >= len) next(yield)
        if (buf[pos] !== 0x0A) {
          return Error('Invalid chunk')
        }
      } else if (ch !== 0x0A) {
        return Error('Invalid chunk')
      }
      if (++pos >= len) next(yield)
    }
  }
}

//
// This is a table used to quickly look up whether the character
// is a valid token according to rfc7230 (1) or not (0).
//
var is_token = Buffer(256)
is_token.fill(0)

"!#$%&'*+-.^_`|~0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm"
  .split('').forEach(function (chr) {
    is_token[chr.charCodeAt(0)] = 1
  })

//
// Stuff for dehexadecimalization
// (I wonder how fast people would read that word)
//
var dehex = Buffer(256)
dehex.fill(255)

'0123456789ABCDEFabcdef'
  .split('').forEach(function (chr) {
    dehex[chr.charCodeAt(0)] = parseInt(chr, 16)
  })

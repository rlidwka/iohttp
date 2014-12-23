
module.exports.parse_request = function* parse_request(writer) {
  var pos, len, buf, ch

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

  // return value of the generator;
  // we return either this or an Error instance
  var result = {
    method      : null,
    url         : null,
    http_major  : -1,
    http_minor  : -1,
    headers     : [],
    content_len : 0, // -1 for chunked
  }

  /*
   *  Parse request line
   *
   *  http://tools.ietf.org/html/rfc7230#section-3.1.1
   */

  // skip linebreaks before request line
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
  result.method = flush()

  // parse http url, just wait until a non-printable char
  // or a space comes out
  //
  // GET /whatever HTTP/1.0
  //     ^^^^^^^^^-- this
  while ((ch = buf[pos]) > 0x20 && ch !== 0x7F) {
    add(ch)
    if (++pos >= len) next(yield)
  }

  // ch is the first non-url char here
  if (ch !== 0x20) return Error('Invalid URL')
  if (++pos >= len) next(yield)
  result.url = flush()
  if (result.url.length === 0) return Error('Invalid URL')

  var request_line_correct = false
  VER: {
    // parse "HTTP" constant
    if (buf[pos] !== 0x48 /* H */) break VER ; if (++pos >= len) next(yield)
    if (buf[pos] !== 0x54 /* T */) break VER ; if (++pos >= len) next(yield)
    if (buf[pos] !== 0x54 /* T */) break VER ; if (++pos >= len) next(yield)
    if (buf[pos] !== 0x50 /* P */) break VER ; if (++pos >= len) next(yield)
    if (buf[pos] !== 0x2f /* / */) break VER ; if (++pos >= len) next(yield)

    // parse major HTTP version
    //
    // note: joyent/http-parser allows version up to 999,
    //       but newer rfc restricts it to one digit
    //
    //       (HTTP/xxx.x will be parsed by a quantum computer
    //        anyway, and javascript doesn't work on those)
    ch = buf[pos]
    if (!(0x30 <= ch && ch <= 0x39)) break VER
    result.http_major = buf[pos] - 0x30
    if (++pos >= len) next(yield)

    if (buf[pos] !== 0x2e /* . */) break VER ; if (++pos >= len) next(yield)

    // parse minor HTTP version
    ch = buf[pos]
    if (!(0x30 <= ch && ch <= 0x39)) break VER
    result.http_minor = buf[pos] - 0x30
    if (++pos >= len) next(yield)

    // parse patch HTTP ve... oh wait, I forgot, only npm stuff uses semver

    // CRLF | LF
    // Here an everywhere else we're making "\r" optional, because it's
    // very inconvenient to debug http servers with `nc` otherwise.
    if (buf[pos] === 0x0D) if (++pos >= len) next(yield)
    if (buf[pos] === 0x0A) {
      request_line_correct = true
    }
  }

  if (!request_line_correct) return Error('Invalid HTTP version')

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
    while (is_token[ch = buf[pos]]) {
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
      while ((ch = buf[pos]) > 0x20 && ch !== 0x7f) {
        add(ch)
        if (++pos >= len) next(yield)
      }

      if (ch === 0x20 || ch === 0x09) {
        if (++pos >= len) next(yield)
        if (buf[pos] > 0x20 && buf[pos] !== 0x7f) {
          // multiple values, separated by an exactly one WS;
          //
          // I wonder how much time until somebody finds two-space
          // separated header value out there?
          add(ch)
          add(buf[pos])
          if (++pos >= len) next(yield)
          continue
        }
        ch = buf[pos]
      }

      // some control char or \n
      break
    }

    var t = flush()
    headers.push(t)
    switch (last_header.toLowerCase()) {
      case 'content-length':
        if (t.match(/^\d+$/)) result.content_len = parseInt(t, 10)
        break
      case 'transfer-encoding':
        if (t === 'chunked') result.content_len = -1
        break
    }

    // OWS again
    while (ch === 0x20 || ch === 0x09) {
      if (++pos >= len) next(yield)
      ch = buf[pos]
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
        buf.start = pos + 1
        return
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

      // previous code points pos at the next char, not as usual
      pos--

      if (++pos >= len) next(yield)
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

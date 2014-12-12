
module.exports.parse_request = parse_request

function* parse_request(writer) {
  var pos, len, buf, ch

  // this function is executed every time a new data comes in;
  // basically, it's helper for resetting position and length
  function next(b) { pos = 0, len = b.length, buf = b }

  // get the first chunk of data
  next(yield)

  // These helpers are used to store data from buf to an internal
  // buffer.
  //  - add(ch) - store one character to the buffer
  //  - flush() - return utf8-encoded string and reset buffer
  var add   = writer.add
  var flush = writer.flush

  // return value of the generator;
  // we return either this or an Error
  var result = {
    method     : null,
    url        : null,
    http_major : -1,
    http_minor : -1,
    headers    : [],
  }

  /*
   *  Parse request line
   *
   *  http://tools.ietf.org/html/rfc7230#section-3.1.1
   */

  // parse http method until we stumble across non-token char
  //
  // GET /whatever HTTP/1.0
  // ^^^-- this
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
    if (buf[pos] === 0x0D) if (++pos >= len) next(yield)
    if (buf[pos] === 0x0A) {
      request_line_correct = true
    }
  }

  if (!request_line_correct) return Error('Invalid HTTP version')

  /*
   *  Parse headers into an array
   *
   *  http://tools.ietf.org/html/rfc7230#section-3.2
   */
  if (++pos >= len) next(yield)

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
      if (!request_line_correct) return Error('Invalid header')
    }

    // we found a header, try to parse its field-name
    //
    // Content-type: text/whatever
    // ^^^^^^^^^^^^ this
    add(ch)
    if (++pos >= len) next(yield)
    while (is_token[ch = buf[pos]]) {
      add(ch)
      if (++pos >= len) next(yield)
    }
    headers.push(flush())

    // Content-type: text/whatever
    //             ^ check that
    if (ch !== 0x3a /* : */) return Error('Invalid header')
    if (++pos >= len) next(yield)

    // OWS skipping
    ch = buf[pos]
    while (ch === 0x20 || ch === 0x09) {
      if (++pos >= len) next(yield)
      ch = buf[pos]
    }

    // this loops through field-vchars array
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
          // multiple values, separated by an exactly one WS
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
    headers.push(flush())

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

  return result
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

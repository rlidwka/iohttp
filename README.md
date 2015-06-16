**Atwood's Law**: any application that *can* be written in JavaScript, *will* eventually be written in JavaScript. So here we are, re-implementing [joyent/http-parser](https://github.com/joyent/http-parser) in JS.

## Examples

### Using this parser directly

If you're writing your own implementation of HTTP server, you receive a stream of data over the wire. Here is how you can parse it into something more useful:

```js
var HTTPParser = require('iohttp')
var parser = HTTPParser(HTTPParser.REQUEST)

parser[HTTPParser.kOnHeadersComplete] = function(stuff) {
  console.log(stuff.headers)
}
parser.execute(Buffer('GET / HTTP/1.1\r\nUser-Agent: curl/7.37.1\r\n'))
parser.execute(Buffer('Host: localhost:8080\r\nAccept: */*\r\n\r\n'))

// [ 'User-Agent',
//  'curl/7.37.1',
//  'Host',
//  'localhost:8080',
//  'Accept',
//  '*/*' ]
```

This example shows how to get headers out of HTTP request. See full API information below.

### Replacing built-in io.js parser

If you want to use this parser with the standard io.js HTTP server, you can monkey-patch io.js to use this parser instead of built-in one.

```js
process.binding('http_parser').HTTPParser = require('iohttp')

require('http').createServer(function(req, res) {
  res.end("Hello World!")
}).listen(1337)
```

This won't work on node.js 0.10.x and earlier because they have different interface for http parsers (you can try [creationix/http-parser-js](https://github.com/creationix/http-parser-js) instead).

## API

### Creating a parser

```js
var HTTPParser = require('iohttp')
var parser     = HTTPParser(type)
```

`type` is an integer constant, which could be:

 - `HTTPParser.REQUEST` - parse HTTP request
 - `HTTPParser.RESPONSE` - parse HTTP response
 - `HTTPParser.ANY` - parse both

HTTP protocol allows to mix requests and responses freely in one stream, but implementations usually accept only one or the other.

### Registering callbacks

In order to receive data from a parser, you should register callbacks:

```js
parser[event] = function() {}
```

`event` is an integer constant that could be one of:

 - `HTTPParser.kOnHeaders` - fires when parser receives trailers (rarely used)
 - `HTTPParser.kOnHeadersComplete` - fires when parser is finished parsing headers
 - `HTTPParser.kOnBody` - fires once per every data chunk of the content
 - `HTTPParser.kOnMessageComplete` - fires when message is finished

So usual sequence of events for each message is:

 1. `kOnHeadersComplete` fires once (when headers are received)
 2. `kOnBody` may fire multiple times after that (if request/response has a body)
 3. `kOnMessageComplete` fires once (when we're done)

### Feeding data to a parser

Use `execute` method to parse data:

```
parser.execute(buffer)
```

An argument of this function should be a `Buffer`. If you have multiple buffers you want to parse, you can sequentially run `execute` on them, parser will save the state between multiple `execute` invocations.

Return value:
 - if there is an error, parser will return it (i.e., return value would be an `Error` instance)
 - otherwise, the return value is a number of bytes parsed (integer)

### Other stuff

You can reuse already created parser for a new connection using `reinitialize` method:

```
parser.reinitialize(type)
```

## Performance

On `io.js-1.1.1` it is 2-3 times slower than built-in parser (see `bench.js`):

```
$ node bench.js 
ourstuff: 3937ms
built-in: 1744ms
```

We use at most two generators per each request, one for parsing headers and one for parsing content body (if present).

As of now, generator execution is fast enough for this idea to work. Creating generators is slow (that's why we try to limit it), and I found delegation (`yield*`) to be very slow (one `yield*` slowed down parsing by 50%).

The original idea was to spin off a generator for every input line, but unfortunately v8 is not fast enough for this yet.

## Backward compatibility

This parser is written following [RFC 7230](http://tools.ietf.org/html/rfc7230) standard. But it turned out to be too strict for practical purposes.

So special care was taken to ensure that it is backward compatible with existing http parser in io.js.

**Every joyent/http-parser test passes**. Except for parsing URLs, see below.

For example, these http-parser quirks were re-implemented here:

 - you can use `LF` instead of `CRLF` at the end of any line
 - in the request line (like `GET / HTTP/1.0`) parser allows multiple spaces between method, path and protocol
 - in the request line non-ascii characters are allowed in path (like `GET /hélló HTTP/1.0`)
 - in the header values spaces are allowed (e.g. `Accept: foo bar`) is parsed as a valid header

One difference is: joyent/http-parser allows HTTP version numbers to be up to 3 digits (i.e. `HTTP/XXX.YYY`), but we limit it to 1 digit. There are no tests for that, and nobody here is going to live long enough for it to matter anyway.

Also, just like joyent/http parser, this parser processes input byte by byte and throws an error whenever a byte that breaks the protocol comes in. So when a malformed random string without CRLF comes in, server is able to report an error at the first bad character, and won't have to buffer the whole thing. This also might be important when you're debugging something using low-level tools to see an error just after it happens, so you can figure out which character is causing it.

## The missing part

This module does not parse urls in path to ensure they are valid. For example, `GET foo://bar` is valid request, but `GET foo:bar` isn't.

I think we should use one of the existing URL parsers for this instead of re-inventing the wheel. So currently any path is considered valid.

Funny side effect: `hello world\n` is parsed as a **valid** http request. Here "hello" is considered HTTP method (it'll be discarded as invalid later), "world" is considered path, and entire thing looks like a HTTP/0.9 request.

## Generator-based streaming parser concept

Because generators are ~~for the cool guys~~ doing the same job as state machines, but a lot easier to use.

For example, original http parser is a state machine. Essentially every character could correspond to a different state. Here is why:

Suppose you're parsing `HTTP/X.Y`. There is a naive way of doing this:

```js
if (str[0] === 'H' && str[1] === 'T' && ...) {}
```

Well, turns out you can't do this 'cause `T` could be in the next packet!

So streaming parsers are usually a state machines that look like:

```js
function next_char(c) {
  switch (state) {
    case 'parsing_H':
      if (c !== 'H') throw Error('bad protocol')
      state = 'parsing_HT'
      break
    case 'parsing_HT':
      if (c !== 'T') throw Error('bad protocol')
      state = 'parsing_HTT'
      break
    case 'parsing_HTT':
      if (c !== 'T') throw Error('bad protocol')
      throw Error("i'm so tired of writing this")
  }
}
```

This function is a simplification, but the basic idea is the same. It interrupts its control flow after each character, and you call it again when the next character is available.

Don't believe me? Well, [here](https://github.com/joyent/http-parser/blob/5d414fcb4b2ccc1ce9d6063292f9c63c9ec67b04/http_parser.c#L772-L790) is what io.js is using right now.

If only there was a mechanism to interrupt control flow of a function without quirks like this... oh wait

But that's exactly what generators do!

```js
function parse_http() {
  if (!(yield === 'H' || yield === 'T' || yield === 'T' || yield === 'P')) {
    throw Error('bad protocol')
  }
  return 'all sounds good'
}
```

This is the basic idea.

Of course in the real life triggering generators on each character is a waste, but we can develop this idea further to work with chunks instead of characters. And that's exactly what this parser [does](https://github.com/rlidwka/iohttp/blob/d8dde4e3eb972c7658aaf1c1046f4350393a2e81/parser.js#L90-L94):

```js
var pos, len, buf, ch
function next(b) { pos = b.start, len = b.length, buf = b }

if (buf[pos] !== 0x48 /* H */) throw err ; if (++pos >= len) next(yield)
if (buf[pos] !== 0x54 /* T */) throw err ; if (++pos >= len) next(yield)
if (buf[pos] !== 0x54 /* T */) throw err ; if (++pos >= len) next(yield)
if (buf[pos] !== 0x50 /* P */) throw err ; if (++pos >= len) next(yield)
if (buf[pos] !== 0x2f /* / */) throw err ; if (++pos >= len) next(yield)

/* if we're here, protocol is parsed */
```

Current character is always placed in `buf[pos]`. And when you want to get next one, you call `if (++pos >= len) next(yield)`, after which `buf[pos]` will contain the new character. And the `next()` function takes care of changing local variables for the new chunk if we're at the end.

## Use-cases

You can use custom HTTP methods with this. The [pull request](https://github.com/joyent/http-parser/pull/158) allowing it in node.js never landed, but with this parser it's easy since HTTP methods are not hardcoded anywhere in the state machine. Just add one to the exported array of methods.

You can also use this parser in browsers, since it's all javascript. Do you like to try using HTTP inside WebSockets inside HTTP? Well, now you can!


## License

[MIT](LICENSE)


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
process.binding('http_parser').HTTPParser = require('iohttp').HTTPParser

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

## License

[MIT](LICENSE)


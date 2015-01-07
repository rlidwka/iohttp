var assert     = require('assert')
var HTTPParser = require('../')
var expect_obj = []
var got_obj    = []
var parser

var defaults = {
  method          : 3,
  methodString    : 'POST',
  url             : '/',
  versionMajor    : 1,
  versionMinor    : 1,
  headers: [
    'Transfer-Encoding',
    'chunked',
  ],
  contentLength   : -1,
  shouldKeepAlive : true,
  upgrade         : false,
}

function reset() {
  parser   = new HTTPParser(HTTPParser.REQUEST)
  expect_obj = []
  got_obj = []

  parser[0] = function(parsed) {
    got_obj.push({0: parsed})
  }
  parser[1] = function(parsed) {
    got_obj.push({1: parsed})
  }
  parser[2] = function(parsed) {
    got_obj.push({2: parsed.toString('utf8')})
  }
  parser[3] = function(parsed) {
    got_obj.push({3: parsed})
  }
}

function execute(chunks) {
  if (!Array.isArray(chunks)) chunks = [ chunks ]

  for (var chunk of chunks) {
    var err = parser.execute(typeof(chunk) === 'string' ? Buffer(chunk) : chunk)
    if (err) {
      got_obj.push({ error: err.message })
      break
    }
  }

  try {
    assert.deepEqual(expect_obj, got_obj)
  } catch(err) {
    console.log('EXPECT:', expect_obj)
    console.log('GOT:', got_obj)
    throw err
  }
}

function expect(num, stuff) {
  if (num instanceof Error) {
    return expect_obj.push({ error: num.message })
  }

  if (num === 1) {
    var _stuff = {}
    for (var i in defaults) _stuff[i] = defaults[i]
    for (var i in stuff)    _stuff[i] = stuff[i]
  } else {
    var _stuff = stuff
  }

  var t = {}
  t[num] = _stuff
  expect_obj.push(t)
}

// no body
reset()
expect(1, { method: 1, methodString: 'GET', headers: [ 'transfer-encoding', 'chunked' ] })
expect(0, [ 'Foo', 'bar' ])
expect(3, undefined)
execute('GET / HTTP/1.1\ntransfer-encoding: chunked\n\n0\nFoo: bar\n\n')

// multiple requests
reset()
expect(1, { url: '/1' })
expect(0, [ 'Foo', 'bar' ])
expect(3, undefined)
expect(1, { url: '/2' })
expect(3, undefined)
execute('POST /1 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\nFoo: bar\n\nPOST /2 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\n\n')

// crlf
reset()
expect(1, {})
expect(2, '1234567890')
expect(0, [ 'Foo', 'bar' ])
expect(3, undefined)
execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\nA\r\n1234567890\r\n0\r\nFoo: bar\r\n\r\n')

// splitting
reset()
expect(1, {})
expect(0, [ 'Foo', 'bar' ])
expect(3, undefined)
execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n0\r\nFoo: bar\r\n\r\n'.split(''))


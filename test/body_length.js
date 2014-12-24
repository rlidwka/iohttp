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
    'Content-Length',
    '5',
  ],
  contentLength   : 5,
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
    console.log('EXPECTED:', expect_obj)
    console.log('RECEIVED:', got_obj)
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

// simple request
reset()
expect(1, { method: 1, methodString: 'GET', contentLength: 0, headers: [ 'content-length', '0' ] })
expect(3, undefined)
execute('GET / HTTP/1.1\ncontent-length: 0\n\n')

// content-length
reset()
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
expect(Error('Invalid HTTP method'))
execute('POST / HTTP/1.1\nContent-Length: 5\n\nhello@')

// content-length splitted across multiple packets
reset()
expect(1, {})
expect(2, 'he')
expect(2, 'l')
expect(2, 'lo')
expect(3, undefined)
expect(Error('Invalid HTTP method'))
execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhe', 'l', 'lo@' ])

// multiple requests
reset()
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhelloPOST / HTTP/1.1\nContent-Length: 5\n\nhello' ])

// multiple requests + lf
reset()
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhello\n\nPOST / HTTP/1.1\nContent-Length: 5\n\nhello' ])

// multiple requests / 2 packets
reset()
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhello', 'POST / HTTP/1.1\nContent-Length: 5\n\nhello' ])


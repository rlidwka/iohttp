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

// simple request
reset()
expect(1, { method: 1, methodString: 'GET', headers: [ 'transfer-encoding', 'chunked' ] })
expect(3, undefined)
execute('GET / HTTP/1.1\ntransfer-encoding: chunked\n\n0\n')

// multiple requests
reset()
expect(1, { url: '/1' })
expect(3, undefined)
expect(1, { url: '/2' })
expect(3, undefined)
execute('POST /1 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\nPOST /2 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\n')

// multiple chunks
reset()
expect(1, {})
expect(2, '1234567890')
expect(2, '1234567890ABCDEF')
expect(3, undefined)
expect(Error('Invalid HTTP method'))
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\nA\n1234567890\n10\n1234567890ABCDEF\n0\n@')

// crlf
reset()
expect(1, {})
expect(2, '1234567890')
expect(2, '1234567890ABCDEF')
expect(3, undefined)
execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\nA\r\n1234567890\r\n10\r\n1234567890ABCDEF\r\n0\r\n')

// garbage at the end
reset()
expect(1, {})
expect(2, 'hello')
expect(3, undefined)
expect(Error('Invalid HTTP method'))
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n5\nhello\n0\n@')

// normal chunk splitting
reset()
expect(1, {})
expect(2, 'he')
expect(2, 'l')
expect(2, 'lo')
expect(3, undefined)
execute([ 'POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n', '2\nhe\n', '1\nl\n', '2\nlo\n', '0\n' ])

// crazy chunk splitting
reset()
expect(1, {})
expect(2, 'h')
expect(2, 'e')
expect(2, 'l')
expect(2, 'l')
expect(2, 'o')
expect(3, undefined)
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n2\nhe\n1\nl\n2\nlo\n0\n'.split(''))

// invalid chunks
reset()
expect(1, {})
expect(Error('Invalid chunk'))
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\ng\n')

reset()
expect(1, {})
expect(Error('Invalid chunk'))
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n0P')

reset()
expect(1, {})
expect(2, 'hello')
expect(Error('Invalid chunk'))
execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n5\nhello world')


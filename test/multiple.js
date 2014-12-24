var assert     = require('assert')
var HTTPParser = require('../')
var expect_obj = []
var got_obj    = []
var parser

var defaults = {
  method          : 1,
  methodString    : 'GET',
  url             : '/',
  versionMajor    : 1,
  versionMinor    : 1,
  headers: [
    'Host',
    'iojs.org',
  ],
  contentLength   : 0,
  shouldKeepAlive : true,
  upgrade         : false,
}

function reset() {
  parser   = new HTTPParser(HTTPParser.REQUEST)
  expect_obj = []
  got_obj = []

  parser[1] = function(parsed) {
    got_obj.push(parsed)
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

function expect(stuff) {
  if (stuff instanceof Error) {
    return expect_obj.push({ error: stuff.message })
  }

  var _stuff = {}
  for (var i in defaults) _stuff[i] = defaults[i]
  for (var i in stuff)    _stuff[i] = stuff[i]
  expect_obj.push(_stuff)
}

// one request
reset()
expect({})
execute('GET / HTTP/1.1\nHost: iojs.org\n\n')

// two-in-one
reset()
expect({ url: '/1' })
expect({ url: '/2' })
execute('GET /1 HTTP/1.1\nHost: iojs.org\n\nGET /2 HTTP/1.1\nHost: iojs.org\n\n')

// messed up chunks
reset()
expect({ url: '/1', headers: [] })
expect({ url: '/2', headers: [] })
execute(['GET /1 HTTP/','1.1\n\nGET',' /2 HTTP/1.1\n\n'])

// ending garbage
reset()
expect({ url: '/1', headers: [] })
expect(Error('Invalid HTTP method'))
execute('GET /1 HTTP/1.1\n\n@')

reset()
expect({ url: '/1' })
expect(Error('Invalid HTTP method'))
execute('GET /1 HTTP/1.1\nHost: iojs.org\n\n@')

// help people whose cat is sleeping on the "enter" key
reset()
expect({ url: '/1' })
execute('\n\n\n\nGET /1 HTTP/1.1\nHost: iojs.org\n\n')

reset()
expect({ url: '/1' })
execute('\r\n\r\nGET /1 HTTP/1.1\nHost: iojs.org\n\n')

reset()
expect({ url: '/1' })
expect({ url: '/2', headers: [] })
execute('GET /1 HTTP/1.1\nHost: iojs.org\n\n\n\n\nGET /2 HTTP/1.1\n\n')

reset()
expect(Error('Invalid HTTP method'))
execute('\r\r')


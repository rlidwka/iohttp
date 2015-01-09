var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

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

describe('body length', function() {
  beforeEach(function() {
    reset('request', defaults)
  })

  it('simple request', function() {
    expect(1, { method: 1, methodString: 'GET', contentLength: 0, headers: [ 'content-length', '0' ] })
    expect(3, undefined)
    execute('GET / HTTP/1.1\ncontent-length: 0\n\n')
  })

  it('content-length', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute('POST / HTTP/1.1\nContent-Length: 5\n\nhello@')
  })

  it('spaced content-length', function() {
    expect(1, { headers: [ 'Content-Length', '5  ' ] })
    expect(2, 'hello')
    expect(3, undefined)
    execute('POST / HTTP/1.1\nContent-Length:   5  \n\nhello')
  })


  it('content-length splitted across multiple packets', function() {
    expect(1, {})
    expect(2, 'he')
    expect(2, 'l')
    expect(2, 'lo')
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhe', 'l', 'lo@' ])
  })

  it('multiple requests', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhelloPOST / HTTP/1.1\nContent-Length: 5\n\nhello' ])
  })

  it('multiple requests + lf', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhello\n\nPOST / HTTP/1.1\nContent-Length: 5\n\nhello' ])
  })

  it('multiple requests / 2 packets', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    execute([ 'POST / HTTP/1.1\nContent-Length: 5\n\nhello', 'POST / HTTP/1.1\nContent-Length: 5\n\nhello' ])
  })
})


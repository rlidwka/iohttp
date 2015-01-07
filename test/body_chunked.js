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
    'Transfer-Encoding',
    'chunked',
  ],
  contentLength   : -1,
  shouldKeepAlive : true,
  upgrade         : false,
}

describe('body chunked', function() {
  beforeEach(function() {
    reset(defaults)
  })

  it('simple request', function() {
    expect(1, { method: 1, methodString: 'GET', headers: [ 'transfer-encoding', 'chunked' ] })
    expect(3, undefined)
    execute('GET / HTTP/1.1\ntransfer-encoding: chunked\n\n0\n\n')
  })

  it('multiple requests', function() {
    expect(1, { url: '/1' })
    expect(3, undefined)
    expect(1, { url: '/2' })
    expect(3, undefined)
    execute('POST /1 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\n\nPOST /2 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\n\n')
  })

  it('multiple chunks', function() {
    expect(1, {})
    expect(2, '1234567890')
    expect(2, '1234567890ABCDEF')
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\nA\n1234567890\n10\n1234567890ABCDEF\n0\n\n@')
  })

  it('crlf', function() {
    expect(1, {})
    expect(2, '1234567890')
    expect(2, '1234567890ABCDEF')
    expect(3, undefined)
    execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\nA\r\n1234567890\r\n10\r\n1234567890ABCDEF\r\n0\r\n\r\n')
  })

  it('garbage at the end', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n5\nhello\n0\n\n@')
  })

  it('normal chunk splitting', function() {
    expect(1, {})
    expect(2, 'he')
    expect(2, 'l')
    expect(2, 'lo')
    expect(3, undefined)
    execute([ 'POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n', '2\nhe\n', '1\nl\n', '2\nlo\n', '0\n\n' ])
  })

  it('crazy chunk splitting', function() {
    expect(1, {})
    expect(2, 'h')
    expect(2, 'e')
    expect(2, 'l')
    expect(2, 'l')
    expect(2, 'o')
    expect(3, undefined)
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n2\nhe\n1\nl\n2\nlo\n0\n\n'.split(''))
  })

  it('invalid chunks - 1', function() {
    expect(1, {})
    expect(Error('Invalid chunk'))
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\ng\n')
  })

  it('invalid chunks - 2', function() {
    expect(1, {})
    expect(Error('Invalid chunk'))
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n0P')
  })

  it('invalid chunks - 3', function() {
    expect(1, {})
    expect(2, 'hello')
    expect(Error('Invalid chunk'))
    execute('POST / HTTP/1.1\nTransfer-Encoding: chunked\n\n5\nhello world')
  })
})


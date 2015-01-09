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

describe('trailers', function() {
  beforeEach(function() {
    reset('request', defaults)
  })

  it('no body', function() {
    expect(1, { method: 1, methodString: 'GET', headers: [ 'transfer-encoding', 'chunked' ] })
    expect(0, [ 'Foo', 'bar' ])
    expect(3, undefined)
    execute('GET / HTTP/1.1\ntransfer-encoding: chunked\n\n0\nFoo: bar\n\n')
  })

  it('multiple requests', function() {
    expect(1, { url: '/1' })
    expect(0, [ 'Foo', 'bar' ])
    expect(3, undefined)
    expect(1, { url: '/2' })
    expect(3, undefined)
    execute('POST /1 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\nFoo: bar\n\nPOST /2 HTTP/1.1\nTransfer-Encoding: chunked\n\n0\n\n')
  })

  it('crlf', function() {
    expect(1, {})
    expect(2, '1234567890')
    expect(0, [ 'Foo', 'bar' ])
    expect(3, undefined)
    execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\nA\r\n1234567890\r\n0\r\nFoo: bar\r\n\r\n')
  })

  it('splitting', function() {
    expect(1, {})
    expect(0, [ 'Foo', 'bar' ])
    expect(3, undefined)
    execute('POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n0\r\nFoo: bar\r\n\r\n'.split(''))
  })
})


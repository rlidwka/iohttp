/*
 *  Those tests are useless, but it's nice to have 100% coverage, huh
 */

var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

describe('cover request', function() {
  var defaults = {
    method          : 1,
    methodString    : 'GET',
    url             : '/',
    versionMajor    : 1,
    versionMinor    : 0,
    headers         : [],
    contentLength   : 0,
    shouldKeepAlive : false,
    upgrade         : false,
  }

  beforeEach(function() {
    reset('request', defaults)
  })

  ;['HX', 'HTX', 'HTTX', 'HTTPX', 'HTTP/X', 'HTTP/1.X'].forEach(function(str) {
    it(str, function() {
      expect(Error('Invalid HTTP version'))
      execute('GET / ' + str)
    })
  })

  it('crlf', function() {
    expect(1, {})
    expect(3, undefined)
    execute('\r\n\nGET / HTTP/1.0\r\n\r\n'.split(''))
  })

  it('crlf - 2', function() {
    expect(1, { headers: [ 'Transfer-encoding', 'chunked' ], contentLength: -1 })
    expect(Error('Invalid trailer'))
    execute('GET / HTTP/1.0\r\nTransfer-encoding: chunked\r\n\r\n0\r\n\r\r'.split(''))
  })

  it('bad header', function() {
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\r\nTransfer-encoding: chunked\0')
  })

  it('all the chunk weirdness', function() {
    expect(1, { headers: [ 'Transfer-encoding', 'chunked' ], contentLength: -1 })
    expect(Error('Invalid chunk'))
    execute('GET / HTTP/1.0\r\nTransfer-encoding: chunked\r\n\r\n0 ;  \r\r'.split(''))
  })
  
  it('cr after chunk content', function() {
    expect(1, { headers: [ 'Transfer-encoding', 'chunked' ], contentLength: -1 })
    expect(2, 'q')
    expect(Error('Invalid chunk'))
    execute('GET / HTTP/1.0\r\nTransfer-encoding: chunked\r\n\r\n1\r\nq\r\r'.split(''))
  })
  
  it('weird content length', function() {
    expect(1, { headers: [ 'Content-length', 'wut' ] })
    expect(3, undefined)
    execute('GET / HTTP/1.0\nContent-length: wut\r\n\r\n')
  })
  
  it('content in separate packet', function() {
    expect(1, { headers: [ 'Content-length', '1' ], contentLength: 1 })
    expect(2, 'q')
    expect(3, undefined)
    execute(['GET / HTTP/1.0\nContent-length: 1\r\n\r\n', 'q'])
  })
  
  it('content in same packet / chunked', function() {
    expect(1, { headers: [ 'transfer-encoding', 'chunked' ], contentLength: -1 })
    expect(2, 'q')
    expect(3, undefined)
    execute(['GET / HTTP/1.0\ntransfer-encoding: chunked\r\n\r\n1\nq', '\n0\n\n'])
  })
})

describe('cover response', function() {
  var defaults = {
    statusCode      : 200,
    statusMessage   : 'OK',
    versionMajor    : 1,
    versionMinor    : 0,
    headers         : [],
    contentLength   : Infinity,
    shouldKeepAlive : false,
    upgrade         : false,
  }

  beforeEach(function() {
    reset('response', defaults)
  })

  ;['HX', 'HTX', 'HTTX', 'HTTPX', 'HTTP/X', 'HTTP/1.X'].forEach(function(str) {
    it(str, function() {
      expect(Error('Invalid HTTP version'))
      execute(str)
    })
  })
  
  it('crlf', function() {
    expect(1, {})
    execute('HTTP/1.0 200 OK\r\n\r\n'.split(''))
  })
})


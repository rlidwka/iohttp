var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

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

describe('multiple', function() {
  beforeEach(function() {
    reset('request', defaults)
  })
  
  it('one request', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost: iojs.org\n\n')
  })

  it('two-in-one', function() {
    expect(1, { url: '/1' })
    expect(3, undefined)
    expect(1, { url: '/2' })
    expect(3, undefined)
    execute('GET /1 HTTP/1.1\nHost: iojs.org\n\nGET /2 HTTP/1.1\nHost: iojs.org\n\n')
  })

  it('messed up chunks', function() {
    expect(1, { url: '/1', headers: [] })
    expect(3, undefined)
    expect(1, { url: '/2', headers: [] })
    expect(3, undefined)
    execute(['GET /1 HTTP/','1.1\n\nGET',' /2 HTTP/1.1\n\n'])
  })

  it('ending garbage', function() {
    expect(1, { url: '/1', headers: [] })
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute('GET /1 HTTP/1.1\n\n@')
  })

  it('ending garbage - 2', function() {
    expect(1, { url: '/1' })
    expect(3, undefined)
    expect(Error('Invalid HTTP method'))
    execute('GET /1 HTTP/1.1\nHost: iojs.org\n\n@')
  })

  it('linebreaks - 1', function() {
    // help people whose cat is sleeping on the "enter" key
    expect(1, { url: '/1' })
    expect(3, undefined)
    execute('\n\n\n\nGET /1 HTTP/1.1\nHost: iojs.org\n\n')
  })

  it('linebreaks - 2', function() {
    expect(1, { url: '/1' })
    expect(3, undefined)
    execute('\r\n\r\nGET /1 HTTP/1.1\nHost: iojs.org\n\n')
  })

  it('linebreaks - 3', function() {
    expect(1, { url: '/1' })
    expect(3, undefined)
    expect(1, { url: '/2', headers: [] })
    expect(3, undefined)
    execute('GET /1 HTTP/1.1\nHost: iojs.org\n\n\n\n\nGET /2 HTTP/1.1\n\n')
  })

  it('linebreaks - 4', function() {
    expect(Error('Invalid HTTP method'))
    execute('\r\r')
  })
})


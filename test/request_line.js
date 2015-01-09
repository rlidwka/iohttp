var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

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

describe('request line', function() {
  beforeEach(function() {
    reset('request', defaults)
  })

  it('normal request', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.0\n\n')
  })

  it('options', function() {
    expect(1, { method: 6, methodString: 'OPTIONS', url: '*' })
    expect(3, undefined)
    execute('OPTIONS * HTTP/1.0\n\n')
  })

  it('cr - 1', function() {
    // cr... cr... crap, why don't everyone just use lf
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.0\r\n\r\n')
  })

  it('cr - 2', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.0\n\r\n')
  })

  it('cr - 3', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.0\r\n\n')
  })

  it('cr - 4', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET / HTTP/1.0\r\r')
  })

  it('version check - 1', function() {
    // we're taking bets on when this'll go live
    expect(1, { versionMajor: 8, versionMinor: 9, shouldKeepAlive: true })
    expect(3, undefined)
    execute('GET / HTTP/8.9\n\n')
  })

  it('version check - 2', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET / HTTP/A.9')
  })

  it('version check - 3', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET / HTTP/10.0')
  })

  it('lowercase stuff - 1', function() {
    expect(Error('Method not supported'))
    execute('get / HTTP/1.0\n\n')
  })

  it('lowercase stuff - 2', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET / http/')
  })

  it('get http', function() {
    // did somebody just take url for dinner?
    expect(Error('Invalid URL'))
    execute('GET  HTTP')
  })

  it('custom url', function() {
    expect(1, { url: '/foo/bar/baz/quux' })
    expect(3, undefined)
    execute('GET /foo/bar/baz/quux HTTP/1.0\n\n')
  })

  it('spacing - 1', function() {
    expect(Error('Invalid URL'))
    execute('GET  / HTTP')
  })

  it('spacing - 2', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET /  HTTP')
  })

  it('spacing - 3', function() {
    expect(Error('Invalid HTTP method'))
    execute('GET\t/ HTTP')
  })

  it('spacing - 4', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET /\tHTTP')
  })

  it('spacing - 5', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET / / HTTP')
  })

  it('spacing - 6', function() {
    expect(Error('Invalid HTTP version'))
    execute('GET /\t/ HTTP')
  })

  it('chunks - 1', function() {
    expect(1, {})
    expect(3, undefined)
    execute(['G','E','T',' ','/',' ','H','T','T','P','/','1','.','0','\n','\n'])
  })

  it('chunks - 2', function() {
    expect(1, {})
    expect(3, undefined)
    execute(['GE','T ','/ ','HT','TP','/1','.0','\n\n'])
  })

  it('chunks - 3', function() {
    expect(1, {})
    expect(3, undefined)
    execute(['G','ET',' /',' H','TT','P/','1.','0\n','\n'])
  })

  it('unicode path', function() {
    // unicode in path contradicts the RFC, but who cares about that anyway?
    expect(1, { url: '/αβγδ' })
    expect(3, undefined)
    execute('GET /αβγδ HTTP/1.0\n\n')
  })

  it('splitting - 1', function() {
    // unicode splitting; if it weren't for this crap,
    // I'd be happily using string concatenation about now
    expect(1, { url: '/αβγδ' })
    expect(3, undefined)
    execute([
      'GET /',[0xce],[0xb1],[0xce],[0xb2],[0xce],[0xb3],[0xce],[0xb4],' HTTP/1.0\n\n'
    ].map(Buffer))
  })

  it('splitting - 2', function() {
    expect(1, { url: '/αβγδ' })
    expect(3, undefined)
    execute([
      'GET /',[0xce, 0xb1],[0xce, 0xb2],[0xce, 0xb3],[0xce, 0xb4],' HTTP/1.0\n\n'
    ].map(Buffer))
  })

  it('splitting - 3', function() {
    expect(1, { url: '/αβγδ' })
    expect(3, undefined)
    execute([
      'GET /',[0xce],[0xb1, 0xce],[0xb2, 0xce],[0xb3, 0xce],[0xb4],' HTTP/1.0\n\n'
    ].map(Buffer))
  })

  it('uni - 1', function() {
    // unicode (except it isn't)
    expect(1, { url: '/��' })
    expect(3, undefined)
    execute(['GET /',Buffer([0xff, 0xff]),' HTTP/1.0\n\n'])
  })

  it('uni - 2', function() {
    expect(1, { url: '/�x' })
    expect(3, undefined)
    execute(['GET /',Buffer([0xce]),'x HTTP/1.0\n\n'])
  })

  it('binary crap - 1', function() {
    expect(Error('Invalid HTTP method'))
    execute([Buffer(0xff)])
  })

  it('binary crap - 2', function() {
    expect(Error('Invalid HTTP method'))
    execute([Buffer(0x00)])
  })

  it('good old http', function() {
    expect(1, { url: '/woohoo', versionMajor: 0, versionMinor: 9 })
    expect(3, undefined)
    execute('GET /woohoo\n\n')
  })
})


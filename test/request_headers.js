var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

var defaults = {
  method          : 1,
  url             : '/',
  versionMajor    : 1,
  versionMinor    : 1,
  headers: [
    'Host',
    'iojs.org',
    'foo',
    'bar',
  ],
  shouldKeepAlive : true,
  upgrade         : false,
}

describe('request headers', function() {
  beforeEach(function() {
    reset('request', defaults)
  })
  
  it('normal request', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost: iojs.org\nfoo: bar\n\n')
  })

  it('crlf - 1', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\n\n')
  })

  it('crlf - 2', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\r\n\r\n')
  })

  it('crlf - 3', function() {
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\nHost: iojs.org\r\rf')
  })

  it('crlf - 4', function() {
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\nHost: iojs.org\n\rf')
  })

  it('after-header-thing', function() {
    // but whyyyyy... it looks almost like a colon
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\nHost! iojs.org\n', Error('Invalid header'))
  })

  it('ws - 1', function() {
    // why am I spending so much time guessing where people could stick whitespace?
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost:iojs.org\nfoo:bar\n\n')
  })

  it('ws - 2', function() {
    expect(1, {})
    expect(3, undefined)
    execute('GET / HTTP/1.1\nHost:  iojs.org\nfoo:\tbar\n\n')
  })

  it('ws - 4', function() {
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\nHost iojs.org\n')
  })

  it('field-name contents', function() {
    expect(Error('Invalid header'))
    execute('GET / HTTP/1.1\nαβγδ:')
  })

  it('field-value contents - 1', function() {
    expect(1, { headers: ['foo', 'αβγδ'] })
    expect(3, undefined)
    execute('GET / HTTP/1.1\nfoo: αβγδ\n\n')
  })

  it('field-value contents - 2', function() {
    expect(1, { headers: ['foo', 'field, field,\tfield'] })
    expect(3, undefined)
    execute('GET / HTTP/1.1\nfoo: field, field,\tfield\n\n')
  })

  it('unicode splitting', function() {
    expect(1, { headers: ['foo', 'αβγδ'] })
    expect(3, undefined)
    execute([
      'GET / HTTP/1.1\nfoo:',[0xce],[0xb1],[0xce],[0xb2],[0xce],[0xb3],[0xce],[0xb4],'\n\n'
    ].map(Buffer))
  })

  it('good old http', function() {
    expect(1, { url: '/woohoo', versionMajor: 0, versionMinor: 9, shouldKeepAlive: false })
    expect(3, undefined)
    execute('GET /woohoo\nHost: iojs.org\nfoo: bar\n\n')
  })
})


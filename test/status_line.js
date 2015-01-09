var reset      = require('./_utils').reset
var expect     = require('./_utils').expect
var execute    = require('./_utils').execute

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

describe('status line', function() {
  beforeEach(function() {
    reset('response', defaults)
  })

  it('normal response', function() {
    expect(1, { statusCode: 999 })
    execute('HTTP/1.0 999 OK\n\n')
  })

  it('3 digits - 1', function() {
    expect(Error('Invalid status'))
    execute('HTTP/1.0 20 xxx')
  })

  it('3 digits - 2', function() {
    expect(Error('Invalid status line'))
    execute('HTTP/1.0 2015 xxx')
  })

  it('no lower', function() {
    expect(Error('Invalid HTTP version'))
    execute('http/1.0 200')
  })

  it('no status - 1', function() {
    expect(1, { statusMessage: '' })
    execute('HTTP/1.0 200\n\n')
  })

  it('no status - 2', function() {
    expect(1, { statusMessage: '' })
    execute('HTTP/1.0 200 \n\n')
  })

  it('space status', function() {
    expect(1, { statusMessage: '     ' })
    execute('HTTP/1.0 200      \n\n')
  })

  it('cr - 1', function() {
    expect(1, {})
    execute('HTTP/1.0 200 OK\r\n\r\n')
  })

  it('cr - 2', function() {
    expect(1, {})
    execute('HTTP/1.0 200 OK\n\r\n')
  })

  it('cr - 3', function() {
    expect(1, {})
    execute('HTTP/1.0 200 OK\r\n\n')
  })

  it('cr - 4', function() {
    expect(Error('Invalid status line'))
    execute('HTTP/1.0 200 OK\r\r')
  })

  it('version check - 1', function() {
    expect(1, { versionMajor: 8, versionMinor: 9 })
    execute('HTTP/8.9 200 OK\n\n')
  })

  it('version check - 2', function() {
    expect(Error('Invalid HTTP version'))
    execute('HTTP/A.9 200')
  })

  it('version check - 3', function() {
    expect(Error('Invalid HTTP version'))
    execute('HTTP/10.0 200')
  })

  it('spacing - 1', function() {
    expect(Error('Invalid status'))
    execute('HTTP/1.0  200')
  })

  it('spacing - 2', function() {
    expect(Error('Invalid HTTP version'))
    execute('HTTP/1.0\t200')
  })

  it('chunks', function() {
    expect(1, { statusMessage: 'All good here' })
    execute('HTTP/1.0 200 All good here\n\n'.split(''))
  })

  it('unicode again', function() {
    expect(1, { statusMessage: 'αβγδ' })
    execute('HTTP/1.0 200 αβγδ\n\n')
  })

  it('unicode splitting', function() {
    expect(1, { statusMessage: 'αβγδ' })
    execute([
      'HTTP/1.0 200 ',[0xce],[0xb1],[0xce],[0xb2],[0xce],[0xb3],[0xce],[0xb4],'\n\n'
    ].map(Buffer))
  })
})


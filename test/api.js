var assert     = require('assert')
var util       = require('util')
var HTTPParser = require('../')

describe('api', function() {
  it('pause', function() {
    var parser = new HTTPParser(HTTPParser.REQUEST)
    parser.pause()
    var ret = parser.execute(Buffer('GET / HTTP/1.0\n\n'))
    assert.equal(ret.message, 'Parser is paused')
  })

  it('pause/resume', function() {
    var parser = new HTTPParser(HTTPParser.REQUEST)
    parser.pause()
    parser.resume()
    var ret = parser.execute(Buffer('GET / HTTP/1.0\n\n'))
    assert.equal(ret, 16)
  })

  it('close/finish', function() {
    // what should it do?
    var parser = new HTTPParser(HTTPParser.REQUEST)
    parser.close()
    parser.finish()
  })

  it('should keep an error', function() {
    var parser = new HTTPParser(HTTPParser.REQUEST)
    var ret = parser.execute('!')
    assert.equal(ret.message, 'Invalid HTTP method')
    ret = parser.execute('GET / HTTP/1.0\n\n')
    assert.equal(ret.message, 'Invalid HTTP method')
  })

  it('arbitrary long strings', function(done) {
    var param = [ '/' ]
    for (var i=0; i<20000; i++) {
      param.push(i % 10)
    }
    param = param.join('')

    var parser = new HTTPParser(HTTPParser.REQUEST)
    parser[1] = function(_, _, _, _, url) {
      assert.equal(url, param)
      process.nextTick(done)
    }
    var ret = parser.execute(Buffer('GET ' + param + ' HTTP/1.0\n\n'))
    assert.equal(ret, 20016)
  })
})


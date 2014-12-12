var assert     = require('assert')
var HTTPParser = require('../')

var addTest    = require('./_utils').testFactory(
  { method: 'GET',
    url: '/',
    http_major: 1,
    http_minor: 1,
    headers: [
      'Host',
      'iojs.org',
      'foo',
      'bar',
    ] })

// normal request
addTest('GET / HTTP/1.1\nHost: iojs.org\nfoo: bar\n\n', {})

// crlf
addTest('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\n\n',     {})
addTest('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\r\n\r\n', {})
addTest('GET / HTTP/1.1\nHost: iojs.org\r\rf',                Error('Invalid header'))
addTest('GET / HTTP/1.1\nHost: iojs.org\n\rf',                Error('Invalid header'))

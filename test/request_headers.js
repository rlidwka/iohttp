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
    ],
    remain: null })

// normal request
addTest('GET / HTTP/1.1\nHost: iojs.org\nfoo: bar\n\n', {})

// crlf
addTest('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\n\n',     {})
addTest('GET / HTTP/1.1\nHost: iojs.org\r\nfoo: bar\r\n\r\n', {})
addTest('GET / HTTP/1.1\nHost: iojs.org\r\rf',                Error('Invalid header'))
addTest('GET / HTTP/1.1\nHost: iojs.org\n\rf',                Error('Invalid header'))

// but whyyyyy... it looks almost like a colon
addTest('GET / HTTP/1.1\nHost! iojs.org', Error('Invalid header'))

// why am I spending so much time guessing where people could stick whitespace?
addTest('GET / HTTP/1.1\nHost:iojs.org\nfoo:bar\n\n',       {})
addTest('GET / HTTP/1.1\nHost:  iojs.org\nfoo:\tbar\n\n',   {})
addTest('GET / HTTP/1.1\nHost: iojs.org  \nfoo: bar\t\n\n', {})
addTest('GET / HTTP/1.1\nHost iojs.org',   Error('Invalid header'))
addTest('GET / HTTP/1.1\nHost :iojs.org',  Error('Invalid header'))

// field-name contents
addTest('GET / HTTP/1.1\nαβγδ:', Error('Invalid header'))

// field-value contents
addTest('GET / HTTP/1.1\nfoo: αβγδ\n\n',                 { headers: ['foo', 'αβγδ'] })
addTest('GET / HTTP/1.1\nfoo: field, field,\tfield\n\n', { headers: ['foo', 'field, field,\tfield'] })
addTest('GET / HTTP/1.1\nfoo: field,  field',            Error('Invalid header'))

// unicode splitting
addTest([
  'GET / HTTP/1.1\nfoo:',[0xce],[0xb1],[0xce],[0xb2],[0xce],[0xb3],[0xce],[0xb4],'\n\n'
].map(Buffer), { headers: ['foo', 'αβγδ'] })


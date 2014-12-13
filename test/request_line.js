var assert     = require('assert')
var HTTPParser = require('../')

var addTest    = require('./_utils').testFactory(
  { method: 'GET',
    url: '/',
    http_major: 1,
    http_minor: 0,
    headers: [],
    remain: null })

// normal request
addTest('GET / HTTP/1.0\n\n', {})

// options
addTest('OPTIONS * HTTP/1.0\n\n', { method: 'OPTIONS', url: '*' })

// cr... cr... crap, why don't everyone just use lf
addTest('GET / HTTP/1.0\r\n\r\n', {})
addTest('GET / HTTP/1.0\n\r\n',   {})
addTest('GET / HTTP/1.0\r\n\n',   {})
addTest('GET / HTTP/1.0\r\r',     Error('Invalid HTTP version'))

// custom method
addTest('CUSTOMMETHOD / HTTP/1.0\n\n', { method: 'CUSTOMMETHOD' })

// version check; we're taking bets on when it'll go live
addTest('GET / HTTP/8.9\n\n',  { http_major: 8, http_minor: 9 })
addTest('GET / HTTP/A.9',  Error('Invalid HTTP version'))
addTest('GET / HTTP/10.0', Error('Invalid HTTP version'))

// lowercase stuff
addTest('get / HTTP/1.0\n\n',  { method: 'get' })
addTest('GET / http/',  Error('Invalid HTTP version'))

// did somebody just take url for dinner?
addTest('GET  HTTP',   Error('Invalid URL'))

// custom url
addTest('GET /foo/bar/baz/quux HTTP/1.0\n\n', { url: '/foo/bar/baz/quux' })

// spacing
addTest('GET  / HTTP',   Error('Invalid URL'))
addTest('GET /  HTTP',   Error('Invalid HTTP version'))
addTest('GET\t/ HTTP',   Error('Invalid HTTP method'))
addTest('GET /\tHTTP',   Error('Invalid URL'))
addTest('GET / / HTTP',  Error('Invalid HTTP version'))
addTest('GET /\t/ HTTP', Error('Invalid URL'))

// chunks
addTest(['G','E','T',' ','/',' ','H','T','T','P','/','1','.','0','\n','\n'], {})
addTest(['GE','T ','/ ','HT','TP','/1','.0','\n\n'], {})
addTest(['G','ET',' /',' H','TT','P/','1.','0\n','\n'], {})

// unicode in path contradicts the RFC, but who cares about that anyway?
addTest('GET /αβγδ HTTP/1.0\n\n', { url: '/αβγδ' })

// unicode splitting; if it weren't for this crap,
// I'd be happily using string concatenation about now
addTest([
  'GET /',[0xce],[0xb1],[0xce],[0xb2],[0xce],[0xb3],[0xce],[0xb4],' HTTP/1.0\n\n'
].map(Buffer), { url: '/αβγδ' })

addTest([
  'GET /',[0xce, 0xb1],[0xce, 0xb2],[0xce, 0xb3],[0xce, 0xb4],' HTTP/1.0\n\n'
].map(Buffer), { url: '/αβγδ' })

addTest([
  'GET /',[0xce],[0xb1, 0xce],[0xb2, 0xce],[0xb3, 0xce],[0xb4],' HTTP/1.0\n\n'
].map(Buffer), { url: '/αβγδ' })

// unicode (except it isn't)
addTest(['GET /',Buffer([0xff, 0xff]),' HTTP/1.0\n\n'], { url: '/��' })
addTest(['GET /',Buffer([0xce]),'x HTTP/1.0\n\n'], { url: '/�x' })

// binary crap
addTest([Buffer(0xff)], Error('Invalid HTTP method'))
addTest([Buffer(0x00)], Error('Invalid HTTP method'))


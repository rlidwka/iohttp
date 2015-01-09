var assert  = require('assert')
var util    = require('util')
var Builtin = process.binding('http_parser').HTTPParser
var Testing = require('../')
var type

describe('joyent/http-parser - request', function() {
  type = 'REQUEST'

  add('curl get',
      "GET /test HTTP/1.1\r\n"
    + "User-Agent: curl/7.18.0 (i486-pc-linux-gnu) libcurl/7.18.0 OpenSSL/0.9.8g zlib/1.2.3.3 libidn/1.1\r\n"
    + "Host: 0.0.0.0=5000\r\n"
    + "Accept: */*\r\n"
    + "\r\n"
  )

  add('firefox get',
      "GET /favicon.ico HTTP/1.1\r\n"
    + "Host: 0.0.0.0=5000\r\n"
    + "User-Agent: Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9) Gecko/2008061015 Firefox/3.0\r\n"
    + "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"
    + "Accept-Language: en-us,en;q=0.5\r\n"
    + "Accept-Encoding: gzip,deflate\r\n"
    + "Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7\r\n"
    + "Keep-Alive: 300\r\n"
    + "Connection: keep-alive\r\n"
    + "\r\n"
  )

  add('dumbfuck',
      "GET /dumbfuck HTTP/1.1\r\n"
    + "aaaaaaaaaaaaa:++++++++++\r\n"
    + "\r\n"
  )

  add('fragment in url',
      "GET /forums/1/topics/2375?page=1#posts-17408 HTTP/1.1\r\n"
    + "\r\n"
  )

  add('get no headers no body',
      "GET /get_no_headers_no_body/world HTTP/1.1\r\n"
    + "\r\n"
  )

  add('get one header no body',
      "GET /get_one_header_no_body HTTP/1.1\r\n"
    + "Accept: */*\r\n"
    + "\r\n"
  )
 
  add('get funky content length body hello',
      "GET /get_funky_content_length_body_hello HTTP/1.0\r\n"
    + "conTENT-Length: 5\r\n"
    + "\r\n"
    + "HELLO"
  )

  add('post identity body world',
      "POST /post_identity_body_world?q=search#hey HTTP/1.1\r\n"
    + "Accept: */*\r\n"
    + "Transfer-Encoding: identity\r\n"
    + "Content-Length: 5\r\n"
    + "\r\n"
    + "World"
  )
 
  add('post - chunked body: all your base are belong to us',
      "POST /post_chunked_all_your_base HTTP/1.1\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "1e\r\nall your base are belong to us\r\n"
    + "0\r\n"
    + "\r\n"
  )
 
  add('two chunks ; triple zero ending',
      "POST /two_chunks_mult_zero_end HTTP/1.1\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "5\r\nhello\r\n"
    + "6\r\n world\r\n"
    + "000\r\n"
    + "\r\n"
  )
 
  add('chunked with trailing headers. blech.',
      "POST /chunked_w_trailing_headers HTTP/1.1\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "5\r\nhello\r\n"
    + "6\r\n world\r\n"
    + "0\r\n"
    + "Vary: *\r\n"
    + "Content-Type: text/plain\r\n"
    + "\r\n"
  )
 
  add('with bullshit after the length',
      "POST /chunked_w_bullshit_after_length HTTP/1.1\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "5; ihatew3;whatthefuck=aretheseparametersfor\r\nhello\r\n"
    + "6; blahblah; blah\r\n world\r\n"
    + "0\r\n"
    + "\r\n"
  )
 
  add('with quotes',
      "GET /with_\"stupid\"_quotes?foo=\"bar\" HTTP/1.1\r\n\r\n"
  )
 
  add('apachebench get',
      "GET /test HTTP/1.0\r\n"
    + "Host: 0.0.0.0:5000\r\n"
    + "User-Agent: ApacheBench/2.3\r\n"
    + "Accept: */*\r\n\r\n"
  )
 
  add('query url with question mark',
      "GET /test.cgi?foo=bar?baz HTTP/1.1\r\n\r\n"
  )

  add('newline prefix get',
      "\r\nGET /test HTTP/1.1\r\n\r\n"
  )
 
  add('upgrade request',
      "GET /demo HTTP/1.1\r\n"
    + "Host: example.com\r\n"
    + "Connection: Upgrade\r\n"
    + "Sec-WebSocket-Key2: 12998 5 Y3 1  .P00\r\n"
    + "Sec-WebSocket-Protocol: sample\r\n"
    + "Upgrade: WebSocket\r\n"
    + "Sec-WebSocket-Key1: 4 @1  46546xW%0l 1 5\r\n"
    + "Origin: http://example.com\r\n"
    + "\r\n"
    + "Hot diggity dogg"
  )
 
  add('connect request',
      "CONNECT 0-home0.netscape.com:443 HTTP/1.0\r\n"
    + "User-agent: Mozilla/1.1N\r\n"
    + "Proxy-authorization: basic aGVsbG86d29ybGQ=\r\n"
    + "\r\n"
    + "some data\r\n"
    + "and yet even more data"
  )
 
  add('report request',
      "REPORT /test HTTP/1.1\r\n"
    + "\r\n"
  )

  add('request with no http version',
      "GET /\r\n"
    + "\r\n"
  )
 
  add('m-search request',
      "M-SEARCH * HTTP/1.1\r\n"
    + "HOST: 239.255.255.250:1900\r\n"
    + "MAN: \"ssdp:discover\"\r\n"
    + "ST: \"ssdp:all\"\r\n"
    + "\r\n"
  )
 
  add('line folding in header value',
      "GET / HTTP/1.1\r\n"
    + "Line1:   abc\r\n"
    + "\tdef\r\n"
    + " ghi\r\n"
    + "\t\tjkl\r\n"
    + "  mno \r\n"
    + "\t \tqrs\r\n"
    + "Line2: \t line2\t\r\n"
    + "Line3:\r\n"
    + " line3\r\n"
    + "Line4: \r\n"
    + " \r\n"
    + "Connection:\r\n"
    + " close\r\n"
    + "\r\n"
  )
 
  add('host terminated by a query string',
      "GET http://hypnotoad.org?hail=all HTTP/1.1\r\n"
    + "\r\n"
  )
 
  add('host:port terminated by a query string',
      "GET http://hypnotoad.org:1234?hail=all HTTP/1.1\r\n"
    + "\r\n"
  )
 
  add('host:port terminated by a space',
      "GET http://hypnotoad.org:1234 HTTP/1.1\r\n"
    + "\r\n"
  )
 
  add('PATCH request',
      "PATCH /file.txt HTTP/1.1\r\n"
    + "Host: www.example.com\r\n"
    + "Content-Type: application/example\r\n"
    + "If-Match: \"e0023aa4e\"\r\n"
    + "Content-Length: 10\r\n"
    + "\r\n"
    + "cccccccccc"
  )
 
  add('connect caps request',
      "CONNECT HOME0.NETSCAPE.COM:443 HTTP/1.0\r\n"
    + "User-agent: Mozilla/1.1N\r\n"
    + "Proxy-authorization: basic aGVsbG86d29ybGQ=\r\n"
    + "\r\n"
  )
 
  add('utf-8 path request',
      "GET /δ¶/δt/pope?q=1#narf HTTP/1.1\r\n"
    + "Host: github.com\r\n"
    + "\r\n"
  )
 
  add('hostname underscore',
      "CONNECT home_0.netscape.com:443 HTTP/1.0\r\n"
    + "User-agent: Mozilla/1.1N\r\n"
    + "Proxy-authorization: basic aGVsbG86d29ybGQ=\r\n"
    + "\r\n"
  )
 
  /* see https://github.com/ry/http-parser/issues/47 */
  add('eat CRLF between requests, no \"Connection: close\" header',
      "POST / HTTP/1.1\r\n"
    + "Host: www.example.com\r\n"
    + "Content-Type: application/x-www-form-urlencoded\r\n"
    + "Content-Length: 4\r\n"
    + "\r\n"
    + "q=42\r\n" /* note the trailing CRLF */
  )
 
  /* see https://github.com/ry/http-parser/issues/47 */
  add('eat CRLF between requests even if \"Connection: close\" is set',
      "POST / HTTP/1.1\r\n"
    + "Host: www.example.com\r\n"
    + "Content-Type: application/x-www-form-urlencoded\r\n"
    + "Content-Length: 4\r\n"
    + "Connection: close\r\n"
    + "\r\n"
    + "q=42\r\n" /* note the trailing CRLF */
  )
 
  add('PURGE request',
      "PURGE /file.txt HTTP/1.1\r\n"
    + "Host: www.example.com\r\n"
    + "\r\n"
  )

  add('SEARCH request',
      "SEARCH / HTTP/1.1\r\n"
    + "Host: www.example.com\r\n"
    + "\r\n"
  )
 
  add('host:port and basic_auth',
      "GET http://a%12:b!&*$@hypnotoad.org:1234/toto HTTP/1.1\r\n"
    + "\r\n"
  )
 
  add('line folding in header value',
      "GET / HTTP/1.1\n"
    + "Line1:   abc\n"
    + "\tdef\n"
    + " ghi\n"
    + "\t\tjkl\n"
    + "  mno \n"
    + "\t \tqrs\n"
    + "Line2: \t line2\t\n"
    + "Line3:\n"
    + " line3\n"
    + "Line4: \n"
    + " \n"
    + "Connection:\n"
    + " close\n"
    + "\n"
  )

  add('multiple connection header values with folding',
      "GET /demo HTTP/1.1\r\n"
    + "Host: example.com\r\n"
    + "Connection: Something,\r\n"
    + " Upgrade, ,Keep-Alive\r\n"
    + "Sec-WebSocket-Key2: 12998 5 Y3 1  .P00\r\n"
    + "Sec-WebSocket-Protocol: sample\r\n"
    + "Upgrade: WebSocket\r\n"
    + "Sec-WebSocket-Key1: 4 @1  46546xW%0l 1 5\r\n"
    + "Origin: http://example.com\r\n"
    + "\r\n"
    + "Hot diggity dogg"
  )
})

/* * R E S P O N S E S * */

describe('joyent/http-parser - response', function() {
  type = 'RESPONSE'

  add('google 301',
      "HTTP/1.1 301 Moved Permanently\r\n"
    + "Location: http://www.google.com/\r\n"
    + "Content-Type: text/html; charset=UTF-8\r\n"
    + "Date: Sun, 26 Apr 2009 11:11:49 GMT\r\n"
    + "Expires: Tue, 26 May 2009 11:11:49 GMT\r\n"
    + "X-$PrototypeBI-Version: 1.6.0.3\r\n" /* $ char in header field */
    + "Cache-Control: public, max-age=2592000\r\n"
    + "Server: gws\r\n"
    + "Content-Length:  219  \r\n"
    + "\r\n"
    + "<HTML><HEAD><meta http-equiv=\"content-type\" content=\"text/html;charset=utf-8\">\n"
    + "<TITLE>301 Moved</TITLE></HEAD><BODY>\n"
    + "<H1>301 Moved</H1>\n"
    + "The document has moved\n"
    + "<A HREF=\"http://www.google.com/\">here</A>.\r\n"
    + "</BODY></HTML>\r\n"
  )

  /* The client should wait for the server's EOF. That is, when content-length
   * is not specified, and "Connection: close", the end of body is specified
   * by the EOF.
   * Compare with APACHEBENCH_GET
   */
  add('no content-length response',
      "HTTP/1.1 200 OK\r\n"
    + "Date: Tue, 04 Aug 2009 07:59:32 GMT\r\n"
    + "Server: Apache\r\n"
    + "X-Powered-By: Servlet/2.5 JSP/2.1\r\n"
    + "Content-Type: text/xml; charset=utf-8\r\n"
    + "Connection: close\r\n"
    + "\r\n"
    + "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    + "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\">\n"
    + "  <SOAP-ENV:Body>\n"
    + "    <SOAP-ENV:Fault>\n"
    + "       <faultcode>SOAP-ENV:Client</faultcode>\n"
    + "       <faultstring>Client Error</faultstring>\n"
    + "    </SOAP-ENV:Fault>\n"
    + "  </SOAP-ENV:Body>\n"
    + "</SOAP-ENV:Envelope>"
  )

  add('404 no headers no body',
      "HTTP/1.1 404 Not Found\r\n\r\n"
  )

  add('301 no response phrase',
      "HTTP/1.1 301\r\n\r\n"
  )

  add('200 trailing space on chunked body',
      "HTTP/1.1 200 OK\r\n"
    + "Content-Type: text/plain\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "25  \r\n"
    + "This is the data in the first chunk\r\n"
    + "\r\n"
    + "1C\r\n"
    + "and this is the second one\r\n"
    + "\r\n"
    + "0  \r\n"
    + "\r\n"
  )

  add('no carriage ret',
      "HTTP/1.1 200 OK\n"
    + "Content-Type: text/html; charset=utf-8\n"
    + "Connection: close\n"
    + "\n"
    + "these headers are from http://news.ycombinator.com/"
  )

  add('proxy connection',
      "HTTP/1.1 200 OK\r\n"
    + "Content-Type: text/html; charset=UTF-8\r\n"
    + "Content-Length: 11\r\n"
    + "Proxy-Connection: close\r\n"
    + "Date: Thu, 31 Dec 2009 20:55:48 +0000\r\n"
    + "\r\n"
    + "hello world"
  )

  // shown by
  // curl -o /dev/null -v "http://ad.doubleclick.net/pfadx/DARTSHELLCONFIGXML;dcmt=text/xml;"
  add('underscore header key',
      "HTTP/1.1 200 OK\r\n"
    + "Server: DCLK-AdSvr\r\n"
    + "Content-Type: text/xml\r\n"
    + "Content-Length: 0\r\n"
    + "DCLK_imp: v7;x;114750856;0-0;0;17820020;0/0;21603567/21621457/1;;~okv=;dcmt=text/xml;;~cs=o\r\n\r\n"
  )

  /* The client should not merge two headers fields when the first one doesn't
   * have a value.
   */
  add('bonjourmadame.fr',
      "HTTP/1.0 301 Moved Permanently\r\n"
    + "Date: Thu, 03 Jun 2010 09:56:32 GMT\r\n"
    + "Server: Apache/2.2.3 (Red Hat)\r\n"
    + "Cache-Control: public\r\n"
    + "Pragma: \r\n"
    + "Location: http://www.bonjourmadame.fr/\r\n"
    + "Vary: Accept-Encoding\r\n"
    + "Content-Length: 0\r\n"
    + "Content-Type: text/html; charset=UTF-8\r\n"
    + "Connection: keep-alive\r\n"
    + "\r\n"
  )

  /* Should handle spaces in header fields */
  add('field underscore',
      "HTTP/1.1 200 OK\r\n"
    + "Date: Tue, 28 Sep 2010 01:14:13 GMT\r\n"
    + "Server: Apache\r\n"
    + "Cache-Control: no-cache, must-revalidate\r\n"
    + "Expires: Mon, 26 Jul 1997 05:00:00 GMT\r\n"
    + ".et-Cookie: PlaxoCS=1274804622353690521; path=/; domain=.plaxo.com\r\n"
    + "Vary: Accept-Encoding\r\n"
    + "_eep-Alive: timeout=45\r\n" /* semantic value ignored */
    + "_onnection: Keep-Alive\r\n" /* semantic value ignored */
    + "Transfer-Encoding: chunked\r\n"
    + "Content-Type: text/html\r\n"
    + "Connection: close\r\n"
    + "\r\n"
    + "0\r\n\r\n"
  )

  /* Should handle non-ASCII in status line */
  add('non-ASCII in status line',
      "HTTP/1.1 500 Oriëntatieprobleem\r\n"
    + "Date: Fri, 5 Nov 2010 23:07:12 GMT+2\r\n"
    + "Content-Length: 0\r\n"
    + "Connection: close\r\n"
    + "\r\n"
  )

  /* Should handle HTTP/0.9 */
  add('http version 0.9',
      "HTTP/0.9 200 OK\r\n"
    + "\r\n"
  )

  /* The client should wait for the server's EOF. That is, when neither
   * content-length nor transfer-encoding is specified, the end of body
   * is specified by the EOF.
   */
  add('neither content-length nor transfer-encoding response',
      "HTTP/1.1 200 OK\r\n"
    + "Content-Type: text/plain\r\n"
    + "\r\n"
    + "hello world"
  )

  add('HTTP/1.0 with keep-alive and EOF-terminated 200 status',
      "HTTP/1.0 200 OK\r\n"
    + "Connection: keep-alive\r\n"
    + "\r\n"
  )

  add('HTTP/1.0 with keep-alive and a 204 status',
      "HTTP/1.0 204 No content\r\n"
    + "Connection: keep-alive\r\n"
    + "\r\n"
  )

  add('HTTP/1.1 with an EOF-terminated 200 status',
      "HTTP/1.1 200 OK\r\n"
    + "\r\n"
  )

  add('HTTP/1.1 with a 204 status',
      "HTTP/1.1 204 No content\r\n"
    + "\r\n"
  )

  add('HTTP/1.1 with a 204 status and keep-alive disabled',
      "HTTP/1.1 204 No content\r\n"
    + "Connection: close\r\n"
    + "\r\n"
  )

  add('HTTP/1.1 with chunked endocing and a 200 response',
      "HTTP/1.1 200 OK\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "0\r\n"
    + "\r\n"
  )

  /* Should handle spaces in header fields */
  add('field space',
      "HTTP/1.1 200 OK\r\n"
    + "Server: Microsoft-IIS/6.0\r\n"
    + "X-Powered-By: ASP.NET\r\n"
    + "en-US Content-Type: text/xml\r\n" /* this is the problem */
    + "Content-Type: text/xml\r\n"
    + "Content-Length: 16\r\n"
    + "Date: Fri, 23 Jul 2010 18:45:38 GMT\r\n"
    + "Connection: keep-alive\r\n"
    + "\r\n"
    + "<xml>hello</xml>" /* fake body */
  )

  add('amazon.com',
      "HTTP/1.1 301 MovedPermanently\r\n"
    + "Date: Wed, 15 May 2013 17:06:33 GMT\r\n"
    + "Server: Server\r\n"
    + "x-amz-id-1: 0GPHKXSJQ826RK7GZEB2\r\n"
    + "p3p: policyref=\"http://www.amazon.com/w3c/p3p.xml\",CP=\"CAO DSP LAW CUR ADM IVAo IVDo CONo OTPo OUR DELi PUBi OTRi BUS PHY ONL UNI PUR FIN COM NAV INT DEM CNT STA HEA PRE LOC GOV OTC \"\r\n"
    + "x-amz-id-2: STN69VZxIFSz9YJLbz1GDbxpbjG6Qjmmq5E3DxRhOUw+Et0p4hr7c/Q8qNcx4oAD\r\n"
    + "Location: http://www.amazon.com/Dan-Brown/e/B000AP9DSU/ref=s9_pop_gw_al1?_encoding=UTF8&refinementId=618073011&pf_rd_m=ATVPDKIKX0DER&pf_rd_s=center-2&pf_rd_r=0SHYY5BZXN3KR20BNFAY&pf_rd_t=101&pf_rd_p=1263340922&pf_rd_i=507846\r\n"
    + "Vary: Accept-Encoding,User-Agent\r\n"
    + "Content-Type: text/html; charset=ISO-8859-1\r\n"
    + "Transfer-Encoding: chunked\r\n"
    + "\r\n"
    + "1\r\n"
    + "\n\r\n"
    + "0\r\n"
    + "\r\n"
  )

  add('empty reason phrase after space',
      "HTTP/1.1 200 \r\n"
    + "\r\n"
  )
})

function add(name, test) {
  var _type = type
  var fn = function() {
    var builtin = new Builtin(Builtin[_type])
    var testing = new Testing(Testing[_type])
    var expected = []
    var received = []
    builtin[0] = function(){ expected.push({ 0: arguments }) }
    builtin[1] = function(arg) {
      expected.push({ 1: arg })
    }
    builtin[2] = function(buf, from, to) {
      expected.push({ 2: buf.toString('binary', from, from + to) })
    }
    builtin[3] = function(){ expected.push({ 3: arguments }) }
    testing[0] = function(){ received.push({ 0: arguments }) }
    testing[1] = function(arg) {
      delete arg.contentLength
      delete arg.methodString
      received.push({ 1: arg })
    }
    testing[2] = function(buf) {
      received.push({ 2: buf.toString('binary') })
    }
    testing[3] = function(){ received.push({ 3: arguments }) }

    var t = builtin.execute(Buffer(test))
    if (util.isError(t)) {
      expected.push({ error: t.message })
    } else {
      expected.push({ bytes: t })
    }

    var t = testing.execute(Buffer(test))
    if (util.isError(t)) {
      received.push({ error: t.message })
    } else {
      received.push({ bytes: t })
    }

    try {
      assert.deepEqual(expected, received)
    } catch(err) {
      console.log('EXPECTED:', util.inspect(expected, null, Infinity))
      console.log('RECEIVED:', util.inspect(received, null, Infinity))
      throw err
    }
  }

  if (typeof it === 'function') {
    it(name, fn)
  } else {
    fn()
  }
}


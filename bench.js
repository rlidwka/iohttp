
function runStuff(name, Class) {
  var parser = new Class(Class.REQUEST)
  var iterations = 500000
  var chk = 'GET / HTTP/1.1\r\nUser-Agent: curl/7.37.1\r\nHost: iojs.org\r\n\r\n'

  var x=0, y=0, z=0, t=0
  parser[0] = function(){x++}
  parser[1] = function(){y++}
  parser[2] = function(){z++}
  parser[3] = function(){t++}

  console.time(name)
  var now = Date.now()
  for (var i=0; i<iterations; i++) {
    parser.execute(new Buffer(chk))
    parser.reinitialize(Class.REQUEST)
  }
  console.timeEnd(name)
  require('assert').deepEqual([ x,y,z,t ], [ 0,500000,0,500000 ])
}

runStuff('ourstuff', require('./'))
runStuff('built-in', process.binding('http_parser').HTTPParser)


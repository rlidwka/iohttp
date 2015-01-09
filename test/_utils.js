var assert     = require('assert')
var util       = require('util')
var HTTPParser = require('../')

//             v-- TODO: make this sound less Java-ish
module.exports.testFactory = function(defaults) {
  return function(chunks, expect) {
    var _expect = {}
    for (var i in defaults) _expect[i] = defaults[i]
    for (var i in expect)   _expect[i] = expect[i]

    if (!Array.isArray(chunks)) chunks = [ chunks ]

    var responded = false
    var parser = new HTTPParser(HTTPParser.REQUEST)
    parser[1] = function(parsed) {
      assert.deepEqual(_expect, parsed)
      responded = true
    }

    chunks.forEach(function(chunk) {
      var err = parser.execute(typeof(chunk) === 'string' ? Buffer(chunk) : chunk)
      if (err) {
        assert.strictEqual(err.message, expect.message)
        responded = true
      }
    })

    process.nextTick(function() {
      assert(responded, "parser didn't respond to " + JSON.stringify(chunks))
    })
  }
}

var defaults, parser, expected_obj, received_obj

module.exports.reset = function reset(mode, def_1) {
  defaults = def_1
  parser = new HTTPParser(mode === 'request' ? HTTPParser.REQUEST : HTTPParser.RESPONSE)
  expected_obj = []
  received_obj = []

  parser[0] = function(parsed) {
    received_obj.push({0: parsed})
  }
  parser[1] = function(parsed) {
    received_obj.push({1: parsed})
  }
  parser[2] = function(parsed) {
    received_obj.push({2: parsed.toString('utf8')})
  }
  parser[3] = function(parsed) {
    received_obj.push({3: parsed})
  }
}

module.exports.execute = function execute(chunks) {
  if (!Array.isArray(chunks)) chunks = [ chunks ]

  for (var chunk of chunks) {
    var err = parser.execute(typeof(chunk) === 'string' ? Buffer(chunk) : chunk)
    if (util.isError(err)) {
      received_obj.push({ error: err.message })
      break
    }
  }

  try {
    assert.deepEqual(expected_obj, received_obj)
  } catch(err) {
    console.log('EXPECTED:', util.inspect(expected_obj, null, Infinity))
    console.log('RECEIVED:', util.inspect(received_obj, null, Infinity))
    throw err
  }
}

module.exports.expect = function expect(num, stuff) {
  if (num instanceof Error) {
    return expected_obj.push({ error: num.message })
  }

  if (num === 1) {
    var _stuff = {}
    for (var i in defaults) _stuff[i] = defaults[i]
    for (var i in stuff)    _stuff[i] = stuff[i]
  } else {
    var _stuff = stuff
  }

  var t = {}
  t[num] = _stuff
  expected_obj.push(t)
}

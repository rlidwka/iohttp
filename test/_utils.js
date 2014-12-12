var assert     = require('assert')
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


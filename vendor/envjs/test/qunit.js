load("test/qunit/qunit/qunit.js");

(function(){
  var assertion_index = 0;

  var module_index = 0;
  var module;

  var test_index = 0;
  var test;

  QUnit.moduleStart = function(m,te) {
    module = m;
    module_index++;
  };

  QUnit.moduleDone = function(t,f,tx) {
    var s = module_index + ". module "+t+": "; 
    if ( f ) {
      s += f + " failure(s) in " + tx + " tests";
    } else {
      s += "all " + tx + " tests successful";
    }
    // print(s);
    module = undefined;
  };

  QUnit.testStart = function(t) {
    test = t;
    test_index++;
  };

  QUnit.testDone = function(t) {
    test = undefined;
  }

  QUnit.log = function(r,m) {
    assertion_index++;
    var test_string = "";
    if ( module || test ) {
      var test_string = "[";
      if ( module ) {
        test_string += module;
        if ( test ) {
          test_string += ": ";
        }
      }
      if ( test ) {
        test_string += test;
      }
      test_string += "] ";
    }
    var s = ( r ? "PASS (" : "FAIL (" ) + assertion_index + ") " + test_string + m;
    print(s);
  };

  QUnit.done = function(f,t) {
    print((t-f) + " Passed, " +  f + " Failed, " + t + " Total Tests" );
  };

})(QUnit);

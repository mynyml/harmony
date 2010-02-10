// Init
load("build/runtest/env.js");

var isLocal;
window.onload = function(){
    isLocal  = !!(window.location.protocol == 'file:');
    
    // Load the test runner
    load("dist/jquery.js",
        "build/runtest/testrunner.js");
    
    // Load the tests
    load(
        "test/unit/core.js",
        "test/unit/selector.js",
        "test/unit/event.js",
        "test/unit/fx.js",
        "test/unit/dimensions.js",
        "test/unit/data.js",
        
        // offset relies on window.open, which is currently unimplemented in env.js
        //"test/unit/offset.js",
        
        // these tests require hitting a server, so we will need some clever env.js
        // way of testing them
        "test/unit/ajax.js"
    );
    
    // Display the results
    results();
};

window.location = "test/index.html";
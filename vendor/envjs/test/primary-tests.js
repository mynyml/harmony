load("test/qunit.js");

window.addEventListener("load",function(){
  print("\n\nTesting with " + whichInterpreter);
  print("Handling onload for test.js");
  print("Loading tests.");

  load("test/unit/dom.js");
  load("test/unit/window.js");
  load("test/unit/elementmembers.js");
  if (multiwindow) {
    load("test/unit/onload.js");
    load("test/unit/scope.js");   // must come before frame.js changes page content
    load("test/unit/iframe.js");
    load("test/unit/events.js");
    load("test/unit/multi-window.js");
  }
  load("test/unit/parser.js");
  load("test/unit/timer.js");
  
  print("Load complete. Running tests.");
});

window.location = "test/index.html";

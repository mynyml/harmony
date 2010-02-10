//FYI: shipped with Rails 2.2.2
load("test/vendor/prototype-1.6.0.3.js");

module("prototypecompat");

test("$ method", function(){
  expect(1);
  equals($("header"), document.getElementById("header"));
});

test("$$ method", function(){
  expect(1);
  ok($$(".chain").length == 10, "$$ found correct number of elements");
});

// When this failing test passes, ticket #69 can be closed.
// (http://envjs.lighthouseapp.com/projects/21590-envjs/tickets/69-prototypes-down-method-is-unavailable)
//
test("down method", function(){
   expect(1);  
   ok($('main').down('#foo') != undefined, "$('main').down('#foo') successfully found an element");
});

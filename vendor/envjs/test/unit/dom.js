// dependencies for the tests
$w = { }
$env = { debug: function() {} }
$openingWindow = $parentWindow = $initTop = null;
this.options = this.options || {}

load("src/window/window.js", "src/dom/node.js");

debugger;
module("dom");

test("Basic requirements", function() {
	expect(5);
	ok( Array.prototype.push, "Array.push()" );
	ok( Function.prototype.apply, "Function.apply()" );
	ok( document.getElementById, "getElementById" );
	ok( document.getElementsByTagName, "getElementsByTagName" );
	ok( RegExp, "RegExp" );
});


test("document.getElementById", function() {
	expect(14);
  try{ok (document.getElementById('body').id == "body", "Can get Element by id, expected id='body'");}catch(e){print(e);}
  try{ok (document.getElementById('header').id == "header", "Can get Element by id, expected id='header'");}catch(e){print(e);}
  try{ok (document.getElementById('banner').id == "banner", "Can get Element by id, expected id='banner'");}catch(e){print(e);}
  try{ok (document.getElementById('userAgent').id == "userAgent", "Can get Element by id, expected id='userAgent'");}catch(e){print(e);}
  try{ok (document.getElementById('nothiddendiv').id == "nothiddendiv", "Can get Element by id, expected id='nothiddendiv'");}catch(e){print(e);}
  try{ok (document.getElementById('nothiddendivchild').id == "nothiddendivchild", "Can get Element by id, expected id='nothiddendivchild'");}catch(e){print(e);}
  try{ok (document.getElementById('dl').id == "dl", "Can get Element by id, expected id='dl'");}catch(e){print(e);}
  try{ok (document.getElementById('main').id == "main", "Can get Element by id, expected id='main'");}catch(e){print(e);}
  try{ok (document.getElementById('firstp').id == "firstp", "Can get Element by id, expected id='firstp");}catch(e){print(e);}
  try{ok (document.getElementById('simon1').id == "simon1", "Can get Element by id, expected id='simon1'");}catch(e){print(e);}
  try{ok (document.getElementById('ap').id == "ap", "Can get Element by id, expected id='ap'");}catch(e){print(e);}
  try{ok (document.getElementById('google').id == "google", "Can get Element by id, expected id='google'");}catch(e){print(e);}
  try{ok (document.getElementById('groups').id == "groups", "Can get Element by id, expected id='groups'");}catch(e){print(e);}
  try{ok (document.getElementById('台北Táiběi').id == "台北Táiběi", "Can get Element by UTF-8 id, expected id='台北Táiběi'");}catch(e){print(e);}
});

test("element.getElementsByTagName", function() {
	expect(1);
  var body = document.getElementById('body');
  try{ok (body.getElementsByTagName('h1').length == 1, "Can get NodeList length : Expected 1 , Got " + body.getElementsByTagName('h1').length);}catch(e){print(e);}
});

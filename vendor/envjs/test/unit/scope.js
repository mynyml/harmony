/*
 * This file is a component of env.js,
 *     http://github.com/gleneivey/env-js/commits/master/README
 * a Pure JavaScript Browser Environment
 * Copyright 2009 John Resig, licensed under the MIT License
 *     http://www.opensource.org/licenses/mit-license.php
 */


module("scope");


// 'window.js' is responsible for verifying that the JS interpreter's scope
//   behaves correctly for code in top-level (first to load) document.  Most
//   of the tests in 'frame.js' will fail if the global/window object and
//   scoping in (i)frames isn't distinct from that of the main document.
//   The tests here check the scoping of variables and code loaded in
//   event handlers (page-global and attribute-assigned), as well as
//   confirming the independence of scoping in frames.

var __click__ = function(element){
    var event = new Event({
      target:element,
      currentTarget:element
    });
    event.initEvent("click");
    element.dispatchEvent(event);
};

// this test depends on 'iframe1.html' having been loaded into 'index.html's
//   'loadediframe' element (and not modified prior to this test's execution)
test("Global scope for JS code in an iframe refers to that iframe's window/document", function() {
    expect(3);

    var idoc = document.getElementById('loadediframe').contentDocument;
    var mtch = idoc.getElementById('js_generated_p').innerHTML.match(/Dynamic/);
    try{ ok(mtch && mtch.length > 0,
        "Can get content from dynamically-generate p element");
    }catch(e){print(e);}

    mtch = idoc.getElementById('internalDocRefResult').innerHTML.
                  match(/exists-found/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation of access to 'document' object in iframe");
    }catch(e){print(e);}

    mtch = idoc.getElementById('appended').innerHTML.match(/appended para/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation of body-onload execution in iframe");
    }catch(e){print(e);}
});


// the following tests depend on '../html/scope.html' being loaded into
//   the iframe 'scopeFrame' in the page /index.html'.  Each test must only
//   execute once.  Otherwise, there are no test order dependencies
//   except those noted on individual tests.
test("Event handler attribute has access to (correct) 'document'", function() {
    expect(2);
    // test:  img1.onclick creates p1

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var mtch = idoc.getElementById('p1');
    try{ ok(mtch == undefined || mtch == null,
        "img1 event handler didn't execute early");
    }catch(e){print(e);}

    var img1 = idoc.getElementById('img1');
    __click__(img1);
    mtch = idoc.getElementById('p1').innerHTML.match(/img1 click/);
    try{ ok(mtch && mtch.length > 0,
        "img1 event handler executed correctly");
    }catch(e){print(e);}
});


test("Event handler attribute has access to (correct) 'this'", function() {
    expect(2);
    // test:  div1.onclick creates p2

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var mtch = idoc.getElementById('p2');
    try{ ok(mtch == undefined || mtch == null,
        "div1 event handler didn't execute early");
    }catch(e){print(e);}

    var div1 = idoc.getElementById('div1');
    __click__(div1);
    mtch = idoc.getElementById('p2').innerHTML.match(/div1 click/);
    try{ ok(mtch && mtch.length > 0,
        "div1 event handler executed correctly");
    }catch(e){print(e);}
});


test("Event handler attribute has access to (correct) 'this'", function() {
    expect(2);
    // test:  div1a.onclick creates p2a

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var mtch = idoc.getElementById('p2a');
    try{ ok(mtch == undefined || mtch == null,
        "div1a event handler didn't execute early");
    }catch(e){print(e);}

    var div1a = idoc.getElementById('div1a');
    __click__(div1a);
    mtch = idoc.getElementById('p2a').innerHTML.match(/div1a click/);
    try{ ok(mtch && mtch.length > 0,
        "div1a event handler executed correctly");
    }catch(e){print(e);}
});


test("Event handler attribute has enclosing HTML elements in scope chain",
  function() {
    expect(2);
    // test:  text1.onchange creates p3 containing values from several elements

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var mtch = idoc.getElementById('p3');
    try{ ok(mtch == undefined || mtch == null,
        "text1 event handler didn't execute early");
    }catch(e){print(e);}

    text1 = idoc.getElementById('text1');
    text1.focus();
    text1.value = "a New Input Value";
    text1.blur();     // "Dynamic HTML: TDR" 2nd says onchange fires@loss focus

    var goodRE = /components: --a New Input Value--    --text--    --42--    --post-url--    --center--/;
    mtch = idoc.getElementById('p3').innerHTML.match(goodRE);
    try{ ok(mtch && mtch.length > 0,
        "text1 event handler executed correctly");
    }catch(e){print(e);}
});


test("Handler defined in frame lexically scopes to frame", function() {
    expect(3);

    aVar = "very bad"; // handler must not pick up this version of 'aVar'
    // test:  div2.onclick creates paragraph 'lex' at end of div2

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var lex = idoc.getElementById('lex');
    try{ ok(lex == undefined || lex == null,
        "div2 click handler didn't execute early");
    }catch(e){print(e);}

    var div2 = idoc.getElementById('div2');
    __click__(div2);
    lex = idoc.getElementById('lex');
    mtch = lex.innerHTML.match(/Lexical scoping is Overridden/);
    try{ ok(mtch && mtch.length > 0,
        "div2 click handler generated correct content");
    }catch(e){print(e);}

    try{ ok(div2 == lex.parentNode,
        "div2 click handler generated p in correct location");
    }catch(e){print(e);}
});


test("In-frame object-assigned handler scopes to frame", function() {
    expect(2);
    // test:  div3.onclick creates a p with values from iframe's global scope

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var p4 = idoc.getElementById('p4');
    var mtch = p4.innerHTML.match(/Third sentence/);
    try{ ok(mtch == undefined || mtch == null || mtch.length == 0,
        "div3 event handler didn't execute early");
    }catch(e){print(e);}

    bVar = 13; // handler shouldn't pick up this version of 'bVar';
    __click__(p4);  // should bubble to div3 and handler
    mtch = p4.innerHTML.match(/number 42/);
    try{ ok(mtch && mtch.length > 0,
        "div3 event handler executed correctly");
    }catch(e){print(e);}
});


// this test reassigns div3.onclick, so must follow all other div3 tests
test("Handler defined in root lexically scopes to root", function() {
    expect(2);
    // test:  create an onclick fn in this scope, attach/execute in iframe

    var idoc = document.getElementById('scopeFrame').contentDocument;
    var p4 = idoc.getElementById('p4');
    var checkValue = "contains good text";
    idoc.getElementById('div3').onclick = function(){
      p4.appendChild(idoc.createTextNode(
        "  Fourth sentence " + checkValue + "."));
    }

    var mtch = p4.innerHTML.match(/Fourth sentence/);
    try{ ok(mtch == undefined || mtch == null || mtch.length == 0,
        "new div3 event handler didn't execute early");
    }catch(e){print(e);}

    var div3 = idoc.getElementById('div3');
    __click__(div3);
    mtch = p4.innerHTML.match(/contains good text/);
    try{ ok(mtch && mtch.length > 0,
        "new div3 event handler executed correctly");
    }catch(e){print(e);}
});

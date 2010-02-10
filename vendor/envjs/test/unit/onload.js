/*
 * This file is a component of env.js,
 *     http://github.com/gleneivey/env-js/commits/master/README
 * a Pure JavaScript Browser Environment
 * Copyright 2009 John Resig, licensed under the MIT License
 *     http://www.opensource.org/licenses/mit-license.php
 */


module("onload-events");

// depends on <script> blocks and elements in test/index.html
test("Execution of onload events in top-level document",
  function() {

        // top-level window-onload works, or test framework wouldn't run.....
    expect(11);

    var mtch = document.getElementById('pCreatedByBodyOnload').innerHTML.
      match(/dynamically-generated paragraph/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation that body-onload handler executed");
    }catch(e){print(e);}

    mtch = document.getElementById('pCreatedByIframeOnload').innerHTML.
      match(/iframe-onload event handler/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation that iframe-onload handler executed");
    }catch(e){print(e);}

    var iframe = document.getElementById('loadediframe');
    var aCounter = 0;
    iframe.onload = function(){
        aCounter++;
    };
    iframe.src = "html/iframe1.html";
    try{ ok(aCounter == 1,
        "iframe-onload handler executes when iframe.src assigned");
    }catch(e){print(e);}

    mtch = document.getElementById('sCreatedByLinkOnload').innerHTML.
      match(/CreatedByLinkOnloadEvent/);
    try{ ok(mtch && mtch.length > 0, "link-onload handler executed");
    }catch(e){print(e);}

    mtch = document.getElementById('pCreatedByImgOnload').innerHTML.
      match(/img-onload event handler/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation that img-onload handler executed");
    }catch(e){print(e);}

    var img = document.getElementById('anImg');
    aCounter = 10;
    img.onload = function(){
        aCounter++;
    };
    img.src = "html/img2.png";
    try{ ok(aCounter == 11,
        "img-onload handler executes when img.src assigned");
    }catch(e){print(e);}

    mtch = document.getElementById('pCreatedByScriptA').innerHTML.
      match(/script event handler/);
    try{ ok(mtch && mtch.length > 0,
            "Got confirmation that script-onerror handler executed");
       }catch(e){print(e);}

    try{ ok(!document.getElementById('pCreatedByScriptB'),
            "Got confirmation that script-onload handler did not execute");
       }catch(e){print(e);}

    mtch = document.getElementById('pCreatedByScriptD').innerHTML.
      match(/script event handler/);
    try{ ok(mtch && mtch.length > 0,
        "Got confirmation that script-onload handler executed");
    }catch(e){print(e);}

    try{ ok(!document.getElementById('pCreatedByScriptC'),
        "Got confirmation that script-onerror handler did not execute");
    }catch(e){print(e);}

    mtch = document.getElementById('pShouldntBeCreated');
    try{ ok(!(mtch),
      "Confirmed that script-onload handler that shouldn't execute actually didn't");
    }catch(e){print(e);}
});


// still to test:  onload events for:  <frame>, <frameset>, image obj, layer obj


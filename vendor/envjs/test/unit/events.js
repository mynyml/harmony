/*
 * This file is a component of env.js,
 *     http://github.com/gleneivey/env-js/commits/master/README
 * a Pure JavaScript Browser Environment
 * Copyright 2009 John Resig, licensed under the MIT License
 *     http://www.opensource.org/licenses/mit-license.php
 */


module("events");

// This file is for tests of general event dispatching, propagation, and
//   handling functionality.  In keeping with the general non-exhaustive
//   approach of env.js's unit tests, each behavior is checked for one
//   relevant type of event in one relevant context (page structure, etc.).

// These tests rely on the content of ../html/events.html and of the
//   <iframe id='eventsFrame'> tag in ../index.html.

// These tests are order-dependent.  If you alter the order or add new tests
//   in the middle, the expected values of eventFrameLoaded and
//   eventFrameClicked may well change (perhaps requiring extra parameters
//   to the *Checks convenience functions).


var __click__ = function(element){
    var event = new Event({
      target:element,
      currentTarget:element
    });
    event.initEvent("click");
    element.dispatchEvent(event);
}

function loadChecks(tag, loadCount, imgCount, unloadCount){
    expect(5);

    var eCounters = window.top.eCounters;
    try{ ok( eCounters["window onload"] == loadCount &&
             eCounters["body onload"] == loadCount,
        tag + ": Onload Events recorded");
    }catch(e){print(e);}

    try{ ok( eCounters["img onload"]  == imgCount,
        tag + ": Img-tag onload event(s) recorded separately");
    }catch(e){print(e);}

    try{ ok( eCounters["window onunload"] == unloadCount &&
             eCounters["body onunload"] == unloadCount,
        tag + ": Onunload events recorded");
    }catch(e){print(e);}

    try{ ok( eCounters["body onclick"] == 0 &&
             eCounters["h1 onclick"] == 0 &&
             eCounters["h2 onclick"] == 0 &&
             eCounters["div onclick"] == 0 &&
             eCounters["table onclick"] == 0 &&
             eCounters["tbody onclick"] == 0 &&
             eCounters["tr onclick"] == 0 &&
             eCounters["td onclick"] == 0 &&
             eCounters["ul onclick"] == 0 &&
             eCounters["li onclick"] == 0 &&
             eCounters["p onclick"] == 0 &&
             eCounters["b onclick"] == 0 &&
             eCounters["i onclick"] == 0 &&
             eCounters["a onclick"] == 0 &&
             eCounters["img onclick"] == 0,
        tag + ": Onload events recorded once.");
    }catch(e){print(e);}

    try{ ok( eventFrameLoaded == loadCount && eventFrameClicked == 0,
        tag + ": " + loadCount + " iframe events recorded on page load.");
    }catch(e){print(e);}
}


test("Check that events do/don't occur on document load", function() {
    // eCounters already initialized by code in ../html/events.html
    loadChecks("Load", 1, 1, 0);
});

test("Check that events do/don't occur on manual iframe reload", function() {
    document.getElementById('eventsFrame').src = "html/events.html";
    loadChecks("Reload", 2, 2, 1);
});

test("Check that an event which should NOT bubble actually does not",
     function() {
    var img = document.getElementById('eventsFrame').contentDocument.
      getElementById('theIMG').src = "missing.png";
    loadChecks("Img Load", 2, 3, 1);

    // note: if img-onload had bubbled up, previous tests probably would
    //   have failed (too large body-onload counts), too.  So this test
    //   just ensures that operation is correct even when only part of
    //   page is reloading.
});



function clickChecks(tag, upperCount, lowerCount){
    expect(5);

    var eCounters = window.top.eCounters;
    try{ ok( eCounters["window onload"] == 0 &&
             eCounters["window onunload"] == 0 &&
             eCounters["body onload"] == 0 &&
             eCounters["body onunload"] == 0 &&
             eCounters["img onload"] == 0,
        tag + ": Onload events not triggered by click");
    }catch(e){print(e);}

    var special = (upperCount == lowerCount) ? "" : " not";
    try{ ok( eCounters["ul onclick"] == lowerCount &&
             eCounters["li onclick"] == lowerCount &&
             eCounters["p onclick"] == lowerCount &&
             eCounters["b onclick"] == lowerCount &&
             eCounters["i onclick"] == lowerCount &&
             eCounters["a onclick"] == lowerCount &&
             eCounters["img onclick"] == lowerCount,
        tag + ": Click event did" + special + " bubble through inner elements");
    }catch(e){print(e);}

    try{ ok( eCounters["body onclick"] == upperCount &&
             eCounters["div onclick"] == upperCount &&
             eCounters["table onclick"] == upperCount &&
             eCounters["tbody onclick"] == upperCount &&
             eCounters["tr onclick"] == upperCount &&
             eCounters["td onclick"] == upperCount,
        tag + ": Click event bubbled through outer elements");
    }catch(e){print(e);}

    try{ ok( eCounters["h1 onclick"] == 0 &&
             eCounters["h2 onclick"] == 0,
        tag + ": No click events for Hx elements");
    }catch(e){print(e);}


    try{ ok( eventFrameLoaded == 2 && eventFrameClicked == 0,
        tag + ": Iframe event counts unchanged");
    }catch(e){print(e);}
}

test("Check that an event which should bubble actually does", function() {
    // clear in-iframe event counters to zero
    window.top.eCounters = {};
    fWin = document.getElementById('eventsFrame').contentWindow;
    fWin.initECounters(window.top.eCounters);

    // simulate a "click" user action
    var img = document.getElementById('eventsFrame').contentDocument.
      getElementById('theIMG');
    __click__(img);

    clickChecks("Click img", 1, 1);
});

test("Bubbling event ONLY bubbles 'up'", function() {
    // simulate a "click" user action
    var td = document.getElementById('eventsFrame').contentDocument.
      getElementById('theTD');
    __click__(td);

    clickChecks("Click td", 2, 1);
});


test("Check that events can be set with addEventListener(), and bubble",
  function() {
    expect(4);

    var img = document.getElementById('eventsFrame').contentDocument.
                getElementById('theIMG');

    // add handlers
    addHdlr = function(id) {
        var elem = document.getElementById('eventsFrame').contentDocument.
          getElementById(id).addEventListener('click', function(event){
            try{
                ok( event.target === img && ( ( this === window ) ||  ( this.window === window ) ),
                    "Scope: 'this' refers to the window '" + window + "'");
            }catch(e){print(e);}
        });
    };

    // a few objects that the <img 'theImG'>.click event will bubble up through
    addHdlr("theIMG");
    addHdlr("theA");
    addHdlr("theP");
    addHdlr("theLI");

    // simulate user action
    __click__(img);
});


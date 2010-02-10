/*
 * This file is a component of env.js,
 *     http://github.com/gleneivey/env-js/commits/master/README
 * a Pure JavaScript Browser Environment
 * Copyright 2009 John Resig, licensed under the MIT License
 *     http://www.opensource.org/licenses/mit-license.php
 */


module("iframe");


// In general, the tests here use the files ../html/iframe*.html
// I've tried to keep all of the id attributes and text fragments in these
//   files unique from each other and from the content of index.html
//   to ensure that we can correctly identify which file has loaded into
//   which frame/window.  When making modifications/additions, paying
//   attention to uniqueness is recommended.


// all tests to next comment rely on content of ../html/iframe1.html and
//                                              ../html/iframe1a.html

    // iframe1 and iframe1a are identical in structure (so we can use the
    //   same assertions against both), but different in content text (so
    //   that we can tell which one is currently loaded).  So, create an
    //   object (associative array) that is specific to the content of each.
contentOfIframe1 = {
    url : "html/iframe1.html",
    titleRE : /IFRAME/,
    elementId : 'anElementWithText',
    elementRE : /content of a paragraph/
};
contentOfIframe1a = {
    url : "html/iframe1a.html",
    titleRE : /iframe1a.html/,
    elementId : 'anotherElementWithText',
    elementRE : /block-quote element/
};

var accessChecksForIframe1 = function(flag, iframe, contentOf) {
    expect(6);

    try{ok (iframe.src == contentOf.url,
        flag + ": Initial iframe src matches test page source");
    }catch(e){print(e);}

    var idoc = iframe.contentDocument;
    var mtch = idoc.title.match(contentOf.titleRE);
    try{ok (mtch && mtch.length > 0,
        flag + ": Can get 'document' object from test iframe");
    }catch(e){print(e);}

    var para = idoc.getElementById(contentOf.elementId);
    mtch = para.innerHTML.match(contentOf.elementRE);
    try{ok (mtch && mtch.length > 0,
        flag + ": Can get text from element in an iframe");
    }catch(e){print(e);}

    try{ok (idoc.parentWindow == iframe.contentWindow,
        flag + ": doc's .parentWindow points to iframe's .contentWindow");
    }catch(e){print(e);}

    try{ok (idoc.parentWindow.parent == window,
        flag + ": Can follow chain from iframe's doc to containing window");
    }catch(e){print(e);}

    try{ok (iframe.contentWindow.top == window,
        flag + ": '.top' from iframe does point to top window");
    }catch(e){print(e);}
};

test("IFRAMEs load with accessible content", function() {
    var iframe = document.getElementById('loadediframe');
    // iframe1.html loaded via src= attribute when index.html was parsed
    accessChecksForIframe1("1", iframe, contentOfIframe1);
});


test("IFRAMEs still load when .src is set after the page is parsed",function() {
    var iframe = document.getElementById('emptyiframe');
    iframe.src = "html/iframe1.html";
    accessChecksForIframe1("2", iframe, contentOfIframe1);
});

test("IFRAMEs reload with accessible content", function() {
    var iframe = document.getElementById('loadediframe');
    iframe.src = "html/iframe1a.html";
    accessChecksForIframe1("3", iframe, contentOfIframe1a);
});


// this test relies on iframe3.html, iframe2.html, and iframeN.html
test("IFRAMEs can be nested, created dynamically", function() {
    var startingDepth = 3;
    var endingDepth   = 7;
    expect(5 + (10*((endingDepth - startingDepth)+1)));

    // manually load iframe3.html
    var firstIframe = document.getElementById('emptyiframe');
    firstIframe.src = "html/iframe3.html";

    // iframe3.html contains a static <iframe> element that loads iframe2.html,
    // so at this point, we should have both loaded, with the structure that
    //     index.html --contains--> iframe3.html --contains--> iframe2.html
    // w/ id's =      emptyiframe               nested1Level



    ////////////////////////////////////////
    // first, verify that we've got the structure we expect:
    var mtch = firstIframe.contentDocument.title.match(/nested-IFRAME/);
    try{ok (mtch && mtch.length > 0,
        "top-level IFRAME reloaded from correct source");
    }catch(e){print(e);}

    var secondIframe = firstIframe.contentDocument.
      getElementById('nested1Level');
    mtch = secondIframe.contentDocument.title.match(/IFRAME loading/);
    try{ok (mtch && mtch.length > 0,
        "can access content of an IFRAME nested in another");
    }catch(e){print(e);}

    try{ok (secondIframe.contentDocument.parentWindow.parent.parent == window,
        "can follow path from nested IFRAME to root window");
    }catch(e){print(e);}

    try{ok (secondIframe.contentWindow.parent.parent == window,
        "also path through .contentWindow to root window");
    }catch(e){print(e);}

    try{ok (secondIframe.contentWindow.top == window,
        "nested IFRAME has correct .top");
    }catch(e){print(e);}


    ////////////////////////////////////////
    // OK, now we'll programatically extend the nesting depth from 2 to many
    window.numberNestedIframeLoads = 0;
    window.winLoadCount = 0;
    window.bodyLoadCount = 0;
    window.frameLoadCount = 0;
    for (var c = startingDepth, bottomIframe = secondIframe; c <= endingDepth;
         c++){

        // add a new iframe within the current leaf iframe
        var newIframe = bottomIframe.contentDocument.createElement("iframe");
        newIframe.setAttribute("id", "iframe_of_depth_" + c);
        newIframe.setAttribute("onload", "iframeOnloadHandler();");
        var bottomBody = bottomIframe.contentDocument.
          getElementsByTagName('body')[0];

        bottomBody.appendChild(newIframe);
        newIframe.src = "html/iframeN.html";
        bottomIframe = newIframe;



        ////////////////////////////////////////
        // verify contents of just-loaded iframe
        mtch = bottomIframe.contentDocument.getElementById('nestingLevel').
          innerHTML.match(/[0-9]+/);
        try{ok (mtch && mtch.length > 0 && parseInt(mtch[0]) == c,
            "nested " + c + " levels: can access content");
        }catch(e){print(e);}

        for (var aWindow = bottomIframe.contentWindow, cn = c; cn > 0; cn--)
            aWindow = aWindow.parent;
        try{ok (aWindow == window,
            "nested " + c + " levels: can follow path to root window");
        }catch(e){print(e);}

        try{ok (bottomIframe.contentWindow.top == window,
            "nested " + c + " levels: IFRAME has correct .top");
        }catch(e){print(e);}



        ////////////////////////////////////////
        // verify events related to iframe load:
        //  iframe.onload (container); window.onload and body.onload (contained)
        var num = (c - startingDepth) + 1;
        try{ok (num == window.numberNestedIframeLoads,
            "nested " + c + " levels: event <script> executed");
        }catch(e){print(e);}

        try{ok (num == window.winLoadCount,
            "nested " + c + " levels: window-onload handler executed");
        }catch(e){print(e);}
        try{ok (num == window.bodyLoadCount,
            "nested " + c + " levels: body-onload handler executed");
        }catch(e){print(e);}
        try{ok (num == window.frameLoadCount,
            "nested " + c + " levels: iframe-onload handler executed");
        }catch(e){print(e);}

        mtch = bottomIframe.contentWindow.parent.document.
          getElementById("pCreatedIframeOnload" + num).innerHTML.
          match(/para iframe onload ([0-9]+)/);
        try{ok (mtch && mtch.length > 0 && parseInt(mtch[1]) == num,
            "nested " + c + " levels: confirmed iframe-onload");
        }catch(e){print(e);}
        mtch = bottomIframe.contentDocument.
          getElementById("pCreatedWindowOnload" + num).innerHTML.
          match(/para window onload ([0-9]+)/);
        try{ok (mtch && mtch.length > 0 && parseInt(mtch[1]) == num,
            "nested " + c + " levels: confirmed window-onload");
        }catch(e){print(e);}
        mtch = bottomIframe.contentDocument.
          getElementById("pCreatedBodyOnload" + num).innerHTML.
          match(/para body onload ([0-9]+)/);
        try{ok (mtch && mtch.length > 0 && parseInt(mtch[1]) == num,
            "nested " + c + " levels: confirmed body-onload");
        }catch(e){print(e);}
    }
});


// all tests to next comment rely on content of ../html/iframe2.html
test("IFRAMEs reload on assignment to 'src'", function() {
    expect(2);

    var iframe = document.getElementById('loadediframe');
    iframe.src = "html/iframe2.html";
    try{ok (iframe.src == "html/iframe2.html",
        "iframe.src matches value assigned");
    }catch(e){print(e);}

    var para = iframe.contentDocument.getElementById('aParaInAnIframe');
    var mtch = para.innerHTML.match(/short paragraph/);
    try{ok (mtch && mtch.length > 0,
        "IFRAME reloaded from correct source");
    }catch(e){print(e);}
});

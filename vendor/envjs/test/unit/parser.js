module("Html5Parser");

var should = function(msg, options){
    try{
        if(options.be&&options.be=='equal'){
            equals(
                options.expected,
                options.actual,
                msg
            );
        }else if(options.be&&options.be==='safe'){
            options.test();
            ok(true, msg);
        }else{
            ok(false, 'unknown test '+options.be);
        }
    }catch(e){
        //no nothing
        equals(true, false, options.msg||'This test failed.');
    }finally{
        //TODO: might as well keep score here
        return this;
    }
};


test("XML Standard Entities: Spot Check", function() {

    expect(2);
    var htmlstr = 
        "<div id='xmlentity' \
            style='&lt;Hello&gt;, &quot;W&apos;rld&quot;!'\
            >&lt;Hello&gt;, &quot;W&apos;rld&quot;!</div>";

    var doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = htmlstr;
    
    should("Replace entities at nodeValue",{ 
        be:'equal',
        actual : doc.
            getElementById('xmlentity').
            childNodes[0].
            nodeValue,
        expected : '<Hello>, "W\'rld"!'
    }).
    should("serialize only &amp;, &lt; and &gt; for TextNode with innerHTML",{
        be: 'equal',
        actual : doc.
            getElementById('xmlentity').
            innerHTML,
        expected : '&lt;Hello&gt;, "W\'rld"!'
    });
      
});

test("HTML Standard Entities: Spot Check", function() {

    expect(1);
    var htmlstr  = "<div id='htmlentity'>&quot; &amp; &lt; &gt; "+
                   "&nbsp; &copy; &reg; &yen; &para; " +
                   "&Ecirc; &Otilde; &aelig; &divide; &Kappa; &theta; "+
                   "&bull; &hellip; &trade; &rArr; &sum; &clubs; " +
                   "&ensp; &mdash;</div>";

    var doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = htmlstr;
    
    should("serialize only &amp;, &lt; and &gt; for TextNode with innerHTML",{
        be:'equal',
        actual:doc.
            getElementById('htmlentity').
            innerHTML,
        expected : '" &amp; &lt; &gt; '+
                   '\xA0 \xA9 \xAE \xA5 \xB6 '+
                   '\xCA \xD5 \xE6 \xF7 \u039A \u03B8 '+
                   '\u2022 \u2026 \u2122 \u21D2 \u2211 \u2663 '+
                   '\u2002 \u2014'
    });
  
});

test("Serialization Conventions", function(){
    
});

test("Ugly HTML Parsing", function() {

    expect(1);

    var doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '<div id="pig"><p>this is a pig... &apos;oink! oink!&apos;</div>';
    
    should('correct the unclosed p tag',{ 
        be:'equal',
        actual:doc.
            getElementById('pig').
            xml, 
        expected:'<div id="pig"><p>this is a pig... \'oink! oink!\'</p></div>'
    });

});

test("Really Ugly HTML Parsing", function() {
    
    expect(1);
    
    should('parse the document without error',{
        be:'safe',
        test:function(){
            var doc = document.implementation.createHTMLDocument();
            doc.load('html/malformed.html');
        }
    });

});

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:

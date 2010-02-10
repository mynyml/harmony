/**
 * @author thatcher
 */

load('dist/env.rhino.js');

window.location = 'test/html/malformed.html';


var fixture = document.xml,
    testhtml = '<!DOCTYPE html><html><head/><body><script>document.write("<a>efg");</script><p>abc</body></html>',
    testfragment = '<div>this is a<strong>pig<div>oink oink!',
    success = function(){
        print(doc.xml);
    };
    
var doc;
//Envjs.logLevel = Envjs.DEBUG;
doc  = new DOMParser().parseFromString(testhtml);
print(doc.xml);


doc.body.innerHTML  = testfragment;
print(doc.xml);


/*
var start = new Date().getTime();
for(var i=0;i<1000;i++){
    parseHtmlDocument(trivial, document, null, null);
}
var stop = new Date().getTime();
print("1000 parses "+(stop-start));
*/

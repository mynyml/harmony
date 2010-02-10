#!/usr/bin/env envjsrb
load('base64.js');
inner = "<head><title>Hello, World from a data uri!</title></head><body></body>";
doc = "<html>"+inner+"</html>";
url_escaped = "data:text/html,"+escape(doc);
base64 = "data:text/html;base64,"+Base64.encode(doc);
debug(url_escaped);
window.location = "about:blank";
Envjs.wait();
window.location = url_escaped;
Envjs.wait();
debug(window.document.documentElement.innerHTML);
if(window.document.documentElement.innerHTML != inner){
  debug(window.document.documentElement.innerHTML);
  debug(inner);
  throw new Error(window.document.documentElement.innerHTML);
}
debug(base64);
window.location = "about:blank";
Envjs.wait();
window.location = base64;
Envjs.wait();
debug(window.document.documentElement.innerHTML);
if(window.document.documentElement.innerHTML != inner){
  throw new Error("b"+window.document.documentElement.innerHTML);
}
window.location = "about:blank";
Envjs.wait();
window.location = "data:,"+escape("Hello, World from a data uri!");
Envjs.wait();
debug(window.location+"");
debug(window.document.documentElement.innerHTML);
inner = "<head><title></title></head><body>Hello, World from a data uri!</body>";
if(window.document.documentElement.innerHTML != inner){
  throw new Error("c"+window.document.documentElement.innerHTML);
}

/* not implemented yet ...
w = open("about:blank");
w.foo = 10;
debug(w.foo);
uri = "data:text/javascript;base64,"+"foo = 20;";
w.load(uri);
debug(w.foo);
*/
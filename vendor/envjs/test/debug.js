// Init
load("src/env.js");
load("src/htmlparser.js");

window.location = "test/index.html";

window.onload = function(){
	load("test/testrunner.js");
	load("test/jquery.js");

	var depth = 0;

	function indent(){
		var str = "";
		for ( var i = 0; i < depth; i++ ) {
			str += "  ";
		}
		return str;
	}

	function dump(name, args, ret){
		print(name + ": " + Array.prototype.slice.call(args) + " - Return: " + ret);
	}

	for ( var method in jQuery.fn ) (function(method){ if ( method != "init" ) {
		var old = jQuery.fn[method];
		jQuery.fn[method] = function(){
			print(indent() + method + ": " + Array.prototype.slice.call(arguments));
			depth++;
			var ret = old.apply(this, arguments);
			depth--;
			print(indent() + method + ": Return " + ret);
			return ret;
		};
	} })(method);

	for ( var method in jQuery ) (function(method){ if ( method != "prototype" && method != "fn" ) {
		var old = jQuery[method];
		jQuery[method] = function(){
			print(indent() + "$." + method + ": " + Array.prototype.slice.call(arguments));
			depth++;
			var ret = old.apply(this, arguments);
			depth--;
			print(indent() + "$." + method + ": Return " + ret);
			return ret;
		};
	} })(method);

	jQuery.prototype.toString = DOMNodeList.prototype.toString;
	Function.prototype.toString = function(){ return "function()"; };

	print("Ready.");
};

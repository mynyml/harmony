/*
 * Envjs @VERSION@ 
 * Pure JavaScript Browser Environment
 *   By John Resig <http://ejohn.org/>
 * Copyright 2008-2009 John Resig, under the MIT License
 */(function(){

  var $env = (function(){
    
    var $env = {};
    var $master;

    var $public = (function(){
      var $public = {};
      return $public;
    })();

    var $platform = function(master){

      var $platform = {};

      $platform.new_global = function() {
        return $master.new_global();
      };

      $platform.set_global = function(global) {
        return $master.set_global(global);
      };

      $platform.new_split_global_outer = function() {
        return $master.new_split_global_outer();
      };

      $platform.new_split_global_inner = function(proxy) {
        return $master.new_split_global_inner(proxy,undefined);
      };

      ( master.window_index === undefined ) && ( master.window_index = 0 );

      $platform.init_window = function(window) {
        var index = master.window_index++;
        window.toString = function(){
          // return "[object Window "+index+"]";
          return "[object Window]";
        };
      };

      return $platform;
    };

    $env.new_window = function(proxy){
      var swap_script_window = ( $master.first_script_window.window === proxy );
      if(!proxy){
        proxy = $platform.new_split_global_outer();
        // $master.print("np",proxy);
      }
      $master.proxy = proxy;
      new_window = $platform.new_split_global_inner(proxy,undefined);
      if(swap_script_window) {
        $master.first_script_window = new_window;
      }
      new_window.$master = $master;
      for(var index in $master.symbols) {
        var symbol = $master.symbols[index];
        new_window[symbol] = $master[symbol];
      }
      new_window.load = function(){
        for(var i = 0; i < arguments.length; i++){
          var f = arguments[i];
          $master.load(f,new_window);
        }
      };
      new_window.evaluate = function(string){
        return $master.evaluate.call(string,new_window);
      };
      return [ proxy, new_window ];
    };

    $env.init = function(){
      $master = this.$master;
      delete this.$master;
      $platform = $platform($master);
      var options = this.$options;
      delete this.$options;
      $env.$master = $master;
      $env.init_window.call(this,options);
    };

    $env.init_window = function(options){
      options = options || {};

      $platform.init_window(this);

      var print = $master.print;

      // print("set",this);
      // print("set",this.window);
      // print("set",options.proxy);
      // print("set",this === options.proxy);
      if ( !this.window) {
        this.window = this;
      }
      // print("setx",this);
      // print("setx",this.window);

      var $w = this;
      // print("$$w",$w);
      // print("$$w",$w === this);
$env.log = function(msg, level){
    debug(' '+ (level?level:'LOG') + ':\t['+ new Date()+"] {ENVJS} "+msg);
};

$env.location = function(path, base){
    // print("loc",path,base);
    if ( path == "about:blank" ) {
        return path;
    }
    var protocol = new RegExp('(^file\:|^http\:|^https\:|data:)');
    var m = protocol.exec(path);
    if(m&&m.length>1){
        var url = Ruby.URI.parse(path);
        var s = url.toString();
        if ( s.substring(0,6) == "file:/" && s[6] != "/" ) {
            s = "file://" + s.substring(5,s.length);
        }
        // print("YY",s);
        return s;
    }else if(base){
        base = Ruby.URI.parse(base);
        if ( path[0] == "/" ) {
            base.path = path;
            base = base + "";
        } else {
            // debug("bb", base);
            // base = base + Ruby.URI.parse(path);
            b = Ruby.eval("lambda { |a,b| a+b; }");
            base = b(base,path);
            // base.path = base.path.substring(0, base.path.lastIndexOf('/'));
            // base.path = base.path + '/' + path;
            base = base + "";
            // debug("bbb", base);
        }
        var result = base;
        // ? This path only used for files?
        if ( result.substring(0,6) == "file:/" && result[6] != "/" ) {
            result = "file://" + result.substring(5,result.length);
        }
        if ( result.substring(0,7) == "file://" ) {
            result = result.substring(7,result.length);
        }
        // print("ZZ",result);
        return result;
    }else{
        //return an absolute url from a url relative to the window location
        // print("hi",  $master.first_script_window, $master.first_script_window && $master.first_script_window.location );
        if( ( base = ( ( $master.first_script_window && $master.first_script_window.location ) || window.location ) ) &&
            ( base != "about:blank" ) &&
            base.href &&
            (base.href.length > 0) ) {
            base = base.href.substring(0, base.href.lastIndexOf('/'));
            var result = base + '/' + path;
            if ( result.substring(0,6) == "file:/" && result[6] != "/" ) {
                result = "file://" + result.substring(5,result.length);
            }
            // print("****",result);
            return result;
        } else {
            // print("RRR",result);
            return "file://"+Ruby.File.expand_path(path);
        }
    }
};

$env.connection = function(xhr, responseHandler, data){
    var url = Ruby.URI.parse(xhr.url);
    var connection;
    var resp;
    // print("xhr",xhr.url);
    // print("xhr",url);
    if ( /^file\:/.test(url) ) {
        // experimental hack
        try {
            Ruby.eval("require 'envjs/net/cgi'");
            resp = connection = new Ruby.Envjs.Net.CGI( xhr, data );
        } catch(e) {
        try{
            if ( xhr.method == "PUT" ) {
                var text =  data || "" ;
                $env.writeToFile(text, url);
            } else if ( xhr.method == "DELETE" ) {
                $env.deleteFile(url);
            } else {
                Ruby.eval("require 'envjs/net/file'");
                var request = new Ruby.Envjs.Net.File.Get( url.path );
                connection = Ruby.Envjs.Net.File.start( url.host, url.port );
                resp = connection.request( request );
                //try to add some canned headers that make sense
                
                try{
                    if(xhr.url.match(/html$/)){
                        xhr.responseHeaders["Content-Type"] = 'text/html';
                    }else if(xhr.url.match(/.xml$/)){
                        xhr.responseHeaders["Content-Type"] = 'text/xml';
                    }else if(xhr.url.match(/.js$/)){
                        xhr.responseHeaders["Content-Type"] = 'text/javascript';
                    }else if(xhr.url.match(/.json$/)){
                        xhr.responseHeaders["Content-Type"] = 'application/json';
                    }else{
                        xhr.responseHeaders["Content-Type"] = 'text/plain';
                    }
                    //xhr.responseHeaders['Last-Modified'] = connection.getLastModified();
                    //xhr.responseHeaders['Content-Length'] = headerValue+'';
                    //xhr.responseHeaders['Date'] = new Date()+'';*/
                }catch(e){
                    $env.error('failed to load response headers',e);
                }
                
            }
        } catch (e) {
            connection = null;
            xhr.readyState = 4;
            if(e.toString().match(/Errno::ENOENT/)) {
                xhr.status = "404";
                xhr.statusText = "Not Found";
                xhr.responseText = undefined;
            } else {
                xhr.status = "500";
                xhr.statusText = "Local File Protocol Error";
                xhr.responseText = "<html><head/><body><p>"+ e+ "</p></body></html>";
            }
        }
        }
    } else { 
        Ruby.eval("require 'net/http'");

        var req;
        var path;
        try {
            path = url.request_uri();
        } catch(e) {
            path = url.path;
        }
        if ( xhr.method == "GET" ) {
            req = new Ruby.Net.HTTP.Get( path );
        } else if ( xhr.method == "POST" ) {
            req = new Ruby.Net.HTTP.Post( path );
        } else if ( xhr.method == "PUT" ) {
            req = new Ruby.Net.HTTP.Put( path );
        }

        for (var header in xhr.headers){
            $master.add_req_field( req, header, xhr.headers[header] );
        }
	
	//write data to output stream if required
        if(data&&data.length&&data.length>0){
	    if ( xhr.method == "PUT" || xhr.method == "POST" ) {
                req.body = data;
            }
	}
	
        connection = Ruby.Net.HTTP.start( url.host, url.port );

        resp = connection.request(req);
    }
    if(connection){
        try{
            if (false) {
            var respheadlength = connection.getHeaderFields().size();
            // Stick the response headers into responseHeaders
            for (var i = 0; i < respheadlength; i++) { 
                var headerName = connection.getHeaderFieldKey(i); 
                var headerValue = connection.getHeaderField(i); 
                if (headerName)
                    xhr.responseHeaders[headerName+''] = headerValue+'';
            }
            }
            resp.each(function(k,v){
                xhr.responseHeaders[k] = v;
            });
        }catch(e){
            $env.error('failed to load response headers',e);
        }
        
        xhr.readyState = 4;
        xhr.status = parseInt(resp.code,10) || 0;
        xhr.statusText = connection.responseMessage || "";
        
        var contentEncoding = resp["Content-Encoding"] || "utf-8",
        baos = new Ruby.StringIO,
        length,
        stream = null,
        responseXML = null;

        try{
            var lower = contentEncoding.toLowerCase();
            stream = ( lower == "gzip" || lower == "decompress" ) ?
                ( Ruby.raise("java") && new java.util.zip.GZIPInputStream(resp.getInputStream()) ) : resp;
        }catch(e){
            if (resp.code == "404")
                $env.info('failed to open connection stream \n' +
                          e.toString(), e);
            else
                $env.error('failed to open connection stream \n' +
                           e.toString(), e);
            stream = resp;
        }
        
        baos.write(resp.body);

        baos.close();
        connection.finish();

        xhr.responseText = baos.string();
    }
    if(responseHandler){
        $env.debug('calling ajax response handler');
        responseHandler();
    }
};

var extract_line =
    Ruby.eval(
"lambda { |e| \
  begin; \
    e.stack.to_s.split(%(\n))[1].match(/:([^:]*)$/)[1]; \
  rescue; %(unknown); end; \
}");

var get_exception = window.get_exception =
    Ruby.eval(" \
lambda { |e| \
  estr = e.to_s; \
  estr.gsub!(/(<br \\/>)+/, %( )); \
  ss = ''; \
  ss = ss + %(Exception: ) + estr + %(\n); \
  begin; \
  e.stack.to_s.split(%(\n)).each do |line| \
    m = line.match(/(.*)@([^@]*)$/); \
    m[2] == %(:0) && next; \
    s = m[1]; \
    s.gsub!(/(<br \\/>)+/, %( )); \
    limit = 100; \
    if ( s.length > limit ); \
      s = s[0,limit] + %(...); \
    end; \
    ss = ss + m[2] + %( ) + s + %(\n); \
  end; \
  rescue; end; \
  ss; \
} \
");

var get_exception_trace = window.get_exception_trace =
    Ruby.eval(" \
lambda { |e| \
  estr = e.to_s; \
  estr.gsub!(/(<br \\/>)+/, %( )); \
  begin; \
  ss = ''; \
  e.stack.to_s.split(%(\n)).each do |line| \
    m = line.match(/(.*)@([^@]*)$/); \
    m[2] == %(:0) && next; \
    s = m[1]; \
    s.gsub!(/(<br \\/>)+/, %( )); \
    limit = 100; \
    if ( s.length > limit ); \
      s = s[0,limit] + %(...); \
    end; \
    ss = ss + m[2] + %( ) + s +%(\n); \
  end; \
  rescue; end; \
  ss; \
} \
");

var print_exception = window.print_exception =
    Ruby.eval(" \
lambda { |e| \
  estr = e.to_s; \
  estr.gsub!(/(<br \\/>)+/, %( )); \
  $stderr.print(%(Exception: ),estr,%(\n)); \
  begin; \
  e.stack.to_s.split(%(\n)).each do |line| \
    m = line.match(/(.*)@([^@]*)$/); \
    m[2] == %(:0) && next; \
    s = m[1]; \
    s.gsub!(/(<br \\/>)+/, %( )); \
    limit = 100; \
    if ( s.length > limit ); \
      s = s[0,limit] + %(...); \
    end; \
    $stderr.print(m[2],%( ),s,%(\n)); \
  end; \
  rescue; end; \
} \
");

var print_exception_trace = window.print_exception_trace =
    Ruby.eval(" \
lambda { |e| \
  estr = e.to_s; \
  estr.gsub!(/(<br \\/>)+/, %( )); \
  begin; \
  e.stack.to_s.split(%(\n)).each do |line| \
    m = line.match(/(.*)@([^@]*)$/); \
    m[2] == %(:0) && next; \
    s = m[1]; \
    s.gsub!(/(<br \\/>)+/, %( )); \
    limit = 100; \
    if ( s.length > limit ); \
      s = s[0,limit] + %(...); \
    end; \
    $stderr.print(m[2],%( ),s,%(\n)); \
  end; \
  rescue; end; \
} \
");

$env.lineSource = function(e){
    if(e){
        print_exception.call(e);
        return extract_line.call(e);
    } else {
        return "";
    }
};
    
$env.loadInlineScript = function(script){
    var original_script_window = $master.first_script_window;
    if ( !$master.first_script_window ) {
        $master.first_script_window = window;
    }
    try {
        $master.evaluate(script.text,$w);
    } catch(e) {
        $env.error("error evaluating script: "+script.text);
        $env.error(e);
    }
    $master.first_script_window = original_script_window;
};
    
$env.writeToTempFile = function(text, suffix){
    $env.debug("writing text to temp url : " + suffix);
    // print(text);
    // Create temp file.
    Ruby.eval("require 'envjs/tempfile'");
    var temp = new Ruby.Envjs.TempFile( "envjs-tmp", suffix );
    
    // Write to temp file
    temp.write(text);
    temp.close();
    return temp.getAbsolutePath().toString()+'';
};
    
$env.writeToFile = function(text, url){
    // print("writing text to url : " + url);
    $env.debug("writing text to url : " + url);
    if ( url.substring(0,7) == "file://" ) {
        url = url.substring(7,url.length);
    }
    var file = Ruby.open( url, "w" );
    // Write to temp file
    file.write(text);
    file.close();
};
    
$env.deleteFile = function(url){
    Ruby.File.unlink(url);
};

$env.__eval__ = function(script,scope){
    if (script == "")
        return;
    try {
        var scopes = [];
        var original = script;
        if(scope) {
            script = "(function(){return eval(original)}).call(scopes[0])";
            while(scope) {
                scopes.push(scope);
                scope = scope.parentNode;
                script = "with(scopes["+(scopes.length-1)+"] ){"+script+"};"
            }
        }
        script = "function(original,scopes){"+script+"}"
        var original_script_window = $master.first_script_window;
        if ( !$master.first_script_window ) {
            $master.first_script_window = window;
        }
        var result = $master.evaluate(script,$w)(original,scopes);
        $master.first_script_window = original_script_window;
        return result;
    }catch(e){
        $error(e);
    }
};

$env.newwindow = function(openingWindow, parentArg, url, outer){
// print(location);
// print("url",url,window.location,openingWindow);
// print("parent",parentArg);
    var options = {
        opener: openingWindow,
        parent: parentArg,
        url: $env.location(url)
    };

    // print("$w",$w);
    // print("$ww",$w.window);
    // print("$ww",$w === $w.window);
    var pair = $env.new_window(outer);
    var proxy = pair[0];
    var new_window = pair[1];
    options.proxy = proxy;
    new_window.$options = options;
    // print("$w",$w);
    $master.load($master.Ruby.Envjs.ENVJS, new_window);
    return proxy;
};

$env.reload = function(oldWindowProxy, url){
    // print("reload",window,oldWindowProxy,url);
    $env.newwindow( oldWindowProxy.opener,
                                 oldWindowProxy.parent,
                                 url,
                                 oldWindowProxy );
};

$env.sleep = function(n){Ruby.sleep(n/1000.);};

$env.loadIntoFnsScope = function(file) {
    return load(file);
}

$env.runAsync = function(fn){
    $env.debug("running async");
        
    var run = $env.sync( function(){ fn(); } );
        
    try{
        $env.spawn(run);
    }catch(e){
        $env.error("error while running async", e);
    }
};
    
// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// End:

/**
 * @author thatcher
 */
var Envjs = function(){
    if(arguments.length === 2){
        for ( var i in arguments[1] ) {
    		var g = arguments[1].__lookupGetter__(i), 
                s = arguments[1].__lookupSetter__(i);
    		if ( g || s ) {
    			if ( g ) Envjs.__defineGetter__(i, g);
    			if ( s ) Envjs.__defineSetter__(i, s);
    		} else
    			Envjs[i] = arguments[1][i];
    	}
    }

    if (arguments[0] != null && arguments[0] != "")
        window.location = arguments[0];
};

/*
*	core.js
*/
(function($env){
    
    //You can emulate different user agents by overriding these after loading env
    $env.appCodeName  = "Envjs";//eg "Mozilla"
    $env.appName      = "Resig/20070309 BirdDog/0.0.0.1";//eg "Gecko/20070309 Firefox/2.0.0.3"

    //set this to true and see profile/profile.js to select which methods
    //to profile
    $env.profile = false;
    
    $env.log = $env.log || function(msg, level){};
	
    $env.DEBUG  = 4;
    $env.INFO   = 3;
    $env.WARN   = 2;
    $env.ERROR  = 1;
	$env.NONE   = 0;
	
    //set this if you want to get some internal log statements
    $env.logLevel = $env.INFO;
    $env.logLevel = $env.DEBUG;
    $env.logLevel = $env.ERROR;
    $env.logLevel = $env.WARN;
    
    $env.debug  = function(msg){
		if($env.logLevel >= $env.DEBUG)
            $env.log(msg,"DEBUG"); 
    };
    $env.info = function(msg){
        if($env.logLevel >= $env.INFO)
            $env.log(msg,"INFO"); 
    };
    $env.warn   = function(msg){
        if($env.logLevel >= $env.WARN)
            $env.log(msg,"WARNIING");    
    };
    $env.error = function(msg, e){
        if ($env.logLevel >= $env.ERROR) {
          var line = $env.lineSource(e);
          line != "" && ( line = " Line: "+ line );
			$env.log(msg + line, 'ERROR');
                        if(e) {
  			  $env.log(e || "", 'ERROR');
                        }
		}
    };
    
    $env.debug("Initializing Core Platform Env");


    // if we're running in an environment without env.js' custom extensions
    // for manipulating the JavaScript scope chain, put in trivial emulations
    $env.debug("performing check for custom Java methods in env-js.jar");
    var countOfMissing = 0, dontCare;
    try { dontCare = getFreshScopeObj; }
    catch (ex){      getFreshScopeObj  = function(){ return {}; };
                                                       countOfMissing++; }
    try { dontCare = getProxyFor; }
    catch (ex){      getProxyFor       = function(obj){ return obj; };
                                                       countOfMissing++; }
    try { dontCare = getScope; }
    catch (ex){      getScope          = function(){}; countOfMissing++; }
    try { dontCare = setScope; }
    catch (ex){      setScope          = function(){}; countOfMissing++; }
    try { dontCare = configureScope; }
    catch (ex){      configureScope    = function(){}; countOfMissing++; }
    try { dontCare = restoreScope; }
    catch (ex){      restoreScope      = function(){}; countOfMissing++; }
    try { $env.loadIntoFnsScope = loadIntoFnsScope; }
    catch (ex){      $env.loadIntoFnsScope = load;     countOfMissing++; }
    if (countOfMissing != 0 && countOfMissing != 7)
        $env.warn("Some but not all of scope-manipulation functions were " +
                  "not present in environment.  JavaScript execution may " +
                  "not occur correctly.");

    $env.lineSource = $env.lineSource || function(e){};
    
    //resolves location relative to base or window location
    $env.location = $env.location || function(path, base){};
    
    $env.sync = $env.sync || function(fn){
      return function(){ return fn.apply(this,arguments); };
    };

    $env.spawn = $env.spawn || function(fn) {
      setTimeout(fn,0);
    };

    $env.sleep = $env.sleep || function(){};

    $env.javaEnabled = false;  

    //Used in the XMLHttpRquest implementation to run a
    // request in a seperate thread
    $env.runAsync = $env.runAsync || function(fn){};
        
    //Used to write to a local file
    $env.writeToFile = $env.writeToFile || function(text, url){};
        
    //Used to write to a local file
    $env.writeToTempFile = $env.writeToTempFile || function(text, suffix){};
    
    //Used to delete a local file
    $env.deleteFile = $env.deleteFile || function(url){};
    
    $env.connection = $env.connection || function(xhr, responseHandler, data){};
    
    $env.parseHTML = function(htmlstring){};
    $env.parseXML = function(xmlstring){};
    $env.xpath = function(expression, doc){};
    
    $env.tmpdir         = ''; 
    $env.os_name        = ''; 
    $env.os_arch        = ''; 
    $env.os_version     = ''; 
    $env.lang           = ''; 
    $env.platform       = "";
    
    $env.scriptTypes = {
        "text/javascript"   :true,
        "text/envjs"        :true
    };
    
    $env.onScriptLoadError = $env.onScriptLoadError || function(){};
    $env.loadLocalScript = function(script, parser){
        $env.debug("loading script ");
        var types, type, src, i, base, 
            docWrites = [],
            write = document.write,
            writeln = document.writeln,
            okay = true;
        // SMP: see also the note in html/document.js about script.type
        var script_type = script.type === null ? "text/javascript" : script.type;
        try{
            if(script_type){
                types = script_type?script_type.split(";"):[];
                for(i=0;i<types.length;i++){
                    if($env.scriptTypes[types[i]]){
						if(script.src){
                            $env.info("loading allowed external script :" + script.src);
                            //lets you register a function to execute 
                            //before the script is loaded
                            if($env.beforeScriptLoad){
                                for(src in $env.beforeScriptLoad){
                                    if(script.src.match(src)){
                                        $env.beforeScriptLoad[src]();
                                    }
                                }
                            }
                            base = "" + window.location;
                            var filename = $env.location(script.src.match(/([^\?#]*)/)[1], base );
                            try {                      
                              load(filename);
                            } catch(e) {
                              $env.warn("could not load script "+ filename +": "+e );
                              okay = false;
                            }
                            //lets you register a function to execute 
                            //after the script is loaded
                            if($env.afterScriptLoad){
                                for(src in $env.afterScriptLoad){
                                    if(script.src.match(src)){
                                        $env.afterScriptLoad[src]();
                                    }
                                }
                            }
                        }else{
                            $env.loadInlineScript(script);
                        }
                    }else{
                        if(!script.src && script_type == "text/javascript"){
                            $env.loadInlineScript(script);
                        } else {
                          // load prohbited ...
                          okay = false;
                        }
                    }
                }
            }else{
                // SMP this branch is probably dead ...
                //anonymous type and anonymous src means inline
                if(!script.src){
                    $env.loadInlineScript(script);
                }
            }
        }catch(e){
            okay = false;
            $env.error("Error loading script.", e);
            $env.onScriptLoadError(script);
        }finally{
            /*if(parser){
                parser.appendFragment(docWrites.join(''));
			}
			//return document.write to it's non-script loading form
            document.write = write;
            document.writeln = writeln;*/
        }
        return okay;
    };
    $env.loadInlineScript = $env.loadInlineScript || function(script){};
    
    $env.loadFrame = function(frameElement, url){
        try {
            if (frameElement._content){
                $env.unload(frameElement._content);
                $env.reload(frameElement._content, url);
            }
            else {
              var v = $env.newwindow(this,
                    frameElement.ownerDocument.parentWindow, url);
              frameElement._content = v;
            }
        } catch(e){
            $env.error("failed to load frame content: from " + url, e);
        }
    };
    
    $env.reload = $env.reload || function(oldWindowProxy, url){
        var newWindowProxy = $env.newwindow(
                                 oldWindowProxy.opener,
                                 oldWindowProxy.parent,
                                 url);
        var newWindow = newWindowProxy.__proto__;

        oldWindowProxy.__proto__ = newWindow;
        newWindow.$thisWindowsProxyObject = oldWindowProxy;
        newWindow.document._parentWindow = oldWindowProxy;
    };

    $env.newwindow = $env.newwindow || function(openingWindow, parentArg, url){
        var newWindow = $env.getFreshScopeObj();
        var newProxy  = $env.getProxyFor(newWindow);
        newWindow.$thisWindowsProxyObject = newProxy;

        var local__window__    = $env.window,
            local_env          = $env,
            local_opener       = openingWindow,
            local_parent       = parentArg ? parentArg : newWindow;

        var inNewContext = function(){
            local__window__(newWindow,        // object to "window-ify"
                            local_env,        // our scope for globals
                            local_parent,     // win's "parent"
                            local_opener,     // win's "opener"
                            local_parent.top, // win's "top"
                            false             // this win isn't the original
                           );
print("QQ");
            if (url)
                // newWindow.__loadAWindowsDocument__(url);
                $env.load(url);
        };

        var scopes = recordScopesOfKeyObjects(inNewContext);
        setScopesOfKeyObjects(inNewContext, newWindow);
print("ZZ");
        inNewContext(); // invoke local fn to window-ify new scope object
print("TT");
        restoreScopesOfKeyObjects(inNewContext, scopes);
        return newProxy;
    };

    function recordScopesOfKeyObjects(fnToExecInOtherContext){
        return {                //   getScope()/setScope() from Window.java
            frame :          getScope(fnToExecInOtherContext),
            window :         getScope($env.window),
            global_load :    getScope($env.loadIntoFnsScope),
            local_load :     getScope($env.loadLocalScript)
        };
    }

    function setScopesOfKeyObjects(fnToExecInOtherContext, windowObj){
        setScope(fnToExecInOtherContext,  windowObj);
        setScope($env.window,             windowObj);
        setScope($env.loadIntoFnsScope,   windowObj);
        setScope($env.loadLocalScript,    windowObj);
    }

    function restoreScopesOfKeyObjects(fnToExecInOtherContext, scopes){
        setScope(fnToExecInOtherContext,  scopes.frame);
        setScope($env.window,             scopes.window);
        setScope($env.loadIntoFnsScope,   scopes.global_load);
        setScope($env.loadLocalScript,    scopes.local_load);
    }

})($env);// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

var Base64 = (function () {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var obj = {
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
        
            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                
                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);
            
            return output;
        },
        
        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            
            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            
            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));
                
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                
                output = output + String.fromCharCode(chr1);
                
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);
            
            return output;
        }
    };

    return obj;
})();
/*
*	window.js
*   - this file will be wrapped in a closure providing the window object as $w
*/
// a logger or empty function available to all modules.
var $log = $env.log,
    $debug = $env.debug,
    $info = $env.info,
    $warn = $env.warn,
    $error = $env.error;
    
//The version of this application
var $version = "0.1";
//This should be hooked to git or svn or whatever
var $revision = "0.0.0.0";

//These descriptions of window properties are taken loosely David Flanagan's
//'JavaScript - The Definitive Guide' (O'Reilly)

/**> $cookies - see cookie.js <*/
// read only boolean specifies whether the window has been closed
var $closed = false;

// a read/write string that specifies the default message that appears in the status line 
var $defaultStatus = "Done";

// a read-only reference to the Document object belonging to this window
/**> $document - See document.js <*/

//IE only, refers to the most recent event object - this maybe be removed after review
var $event = null;

//A read-only array of window objects
//var $frames = [];    // TODO: since window.frames can be accessed like a
                       //   hash, will need an object to really implement

// a read-only reference to the History object
/**>  $history - see location.js <**/

// read-only properties that specify the height and width, in pixels
var $innerHeight = 600, $innerWidth = 800;

// a read-only reference to the Location object.  the location object does expose read/write properties
/**> $location - see location.js <**/

// The name of window/frame.  Set directly, when using open(), or in frameset.
// May be used when specifying the target attribute of links
var $name;

// a read-only reference to the Navigator object
/**> $navigator - see navigator.js <**/

// a read/write reference to the Window object that contained the script that called open() to 
//open this browser window.  This property is valid only for top-level window objects.

var $opener = $openingWindow = options.opener;

// Read-only properties that specify the total height and width, in pixels, of the browser window.
// These dimensions include the height and width of the menu bar, toolbars, scrollbars, window
// borders and so on.  These properties are not supported by IE and IE offers no alternative 
// properties;
var $outerHeight = $innerHeight, $outerWidth = $innerWidth;

// Read-only properties that specify the number of pixels that the current document has been scrolled
//to the right and down.  These are not supported by IE.
var $pageXOffset = 0, $pageYOffset = 0;


// A read-only reference to the Window object that contains this window
// or frame.  If the window is a top-level window, parent refers to
// the window itself.  If this window is a frame, this property refers
// to the window or frame that conatins it.
var $parent = options.parent || window;
try {
    if ($parentWindow.$thisWindowsProxyObject)
        $parent = $parentWindow.$thisWindowsProxyObject;
} catch(e){}



// a read-only refernce to the Screen object that specifies information about the screen: 
// the number of available pixels and the number of available colors.
/**> $screen - see screen.js <**/
// read only properties that specify the coordinates of the upper-left corner of the screen.
var $screenX = 0, $screenY = 0;
var $screenLeft = $screenX, $screenTop = $screenY;

// a read/write string that specifies the current contents of the status line.
var $status = '';

// a read-only reference to the top-level window that contains this window.  If this
// window is a top-level window it is simply a refernce to itself.  If this window 
// is a frame, the top property refers to the top-level window that contains the frame.
var $top = $parent && $parent.top || this;

// the window property is identical to the self property and to this obj
var $window = $w;
try {
    if ($w.$thisWindowsProxyObject)
        $window = $w.$thisWindowsProxyObject;
} catch(e){}
options.proxy && ( $window = options.proxy );

$debug("Initializing Window.");
__extend__($w,{
  get closed(){return $closed;},
  get defaultStatus(){return $defaultStatus;},
  set defaultStatus(_defaultStatus){$defaultStatus = _defaultStatus;},
  //get document(){return $document;}, - see document.js
  get event(){return $event;},

  get frames(){return undefined;}, // TODO: not yet any code to maintain list
  get length(){return undefined;}, //   should be frames.length, but.... TODO

  //get history(){return $history;}, - see history.js
  get innerHeight(){return $innerHeight;},
  get innerWidth(){return $innerWidth;},
  get clientHeight(){return $innerHeight;},
  get clientWidth(){return $innerWidth;},
  //get location(){return $location;}, see location.js
  get name(){return $name;},
  set name(newName){ $name = newName; },
  //get navigator(){return $navigator;}, see navigator.js
  get opener(){return $opener;},
  get outerHeight(){return $outerHeight;},
  get outerWidth(){return $outerWidth;},
  get pageXOffest(){return $pageXOffset;},
  get pageYOffset(){return $pageYOffset;},
  get parent(){return $parent;},
  //get screen(){return $screen;}, see screen.js
  get screenLeft(){return $screenLeft;},
  get screenTop(){return $screenTop;},
  get screenX(){return $screenX;},
  get screenY(){return $screenY;},
  get self(){return $window;},
  get status(){return $status;},
  set status(_status){$status = _status;},
  get top(){return $top || $window;},
  get window(){return $window;} /*,
  toString : function(){
      return '[object Window]';
  } FIX SMP */
});

$w.open = function(url, name, features, replace){
  if (features)
    $env.warn("'features' argument for 'window.open()' not yet implemented");
  if (replace)
    $env.warn("'replace' argument for 'window.open()' not yet implemented");

  var newWindow = $env.newwindow(this, null, url);
  newWindow.$name = name;
  return newWindow;
};

$w.close = function(){
  $env.unload($w);
  $closed = true;
};     

$env.unload = function(windowToUnload){
  try {
    var event = windowToUnload.document.createEvent();
    event.initEvent("unload");
    windowToUnload.document.getElementsByTagName('body')[0].
      dispatchEvent(event, false);
  }
  catch (e){}   // maybe no/bad document loaded, ignore

  var event = windowToUnload.document.createEvent();
  event.initEvent("unload");
  windowToUnload.dispatchEvent(event, false);
};
  
  
$env.load = function(url){
    $location = $env.location(url);
    __setHistory__($location);
    $w.document.load($location);
};


/* Time related functions - see timer.js
*   - clearTimeout
*   - clearInterval
*   - setTimeout
*   - setInterval
*/

/*
* Events related functions - see event.js
*   - addEventListener
*   - attachEvent
*   - detachEvent
*   - removeEventListener
*   
* These functions are identical to the Element equivalents.
*/

/*
* UIEvents related functions - see uievent.js
*   - blur
*   - focus
*
* These functions are identical to the Element equivalents.
*/

/* Dialog related functions - see dialog.js
*   - alert
*   - confirm
*   - prompt
*/

/* Screen related functions - see screen.js
*   - moveBy
*   - moveTo
*   - print
*   - resizeBy
*   - resizeTo
*   - scrollBy
*   - scrollTo
*/

/* CSS related functions - see css.js
*   - getComputedStyle
*/

/*
* Shared utility methods
*/
// Helper method for extending one object with another.  
function __extend__(a,b) {
	for ( var i in b ) {
		var g = b.__lookupGetter__(i), s = b.__lookupSetter__(i);
		if ( g || s ) {
			if ( g ) a.__defineGetter__(i, g);
			if ( s ) a.__defineSetter__(i, s);
		} else
			a[i] = b[i];
	} return a;
};
	

// from ariel flesler http://flesler.blogspot.com/2008/11/fast-trim-function-for-javascript.html
// this might be a good utility function to provide in the env.core
// as in might be useful to the parser and other areas as well
function trim( str ){
    return (str || "").replace( /^\s+|\s+$/g, "" );
    
};
/*function trim( str ){
    var start = -1,
    end = str.length;
    /*jsl:ignore*
    while( str.charCodeAt(--end) < 33 );
    while( str.charCodeAt(++start) < 33 );
    /*jsl:end*
    return str.slice( start, end + 1 );
};*/

//from jQuery
function __setArray__( target, array ) {
	// Resetting the length to 0, then using the native Array push
	// is a super-fast way to populate an object with array-like properties
	target.length = 0;
	Array.prototype.push.apply( target, array );
};
$debug("Defining NodeList");
/*
* NodeList - DOM Level 2
*/
/**
 * @class  DOMNodeList - provides the abstraction of an ordered collection of nodes
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 *
 * @param  ownerDocument : DOMDocument - the ownerDocument
 * @param  parentNode    : DOMNode - the node that the DOMNodeList is attached to (or null)
 */
var DOMNodeList = function(ownerDocument, parentNode) {
    this.length = 0;
    this.parentNode = parentNode;
    this.ownerDocument = ownerDocument;
    
    this._readonly = false;
    
    __setArray__(this, []);
};
__extend__(DOMNodeList.prototype, {
    item : function(index) {
        var ret = null;
        //$log("NodeList item("+index+") = " + this[index]);
        if ((index >= 0) && (index < this.length)) { // bounds check
            ret = this[index];                    // return selected Node
        }
        
        return ret;                                    // if the index is out of bounds, default value null is returned
    },
    get xml() {
        var ret = "";
        
        // create string containing the concatenation of the string values of each child
        for (var i=0; i < this.length; i++) {
            if(this[i]){
                if(this[i].nodeType == DOMNode.TEXT_NODE && i>0 && this[i-1].nodeType == DOMNode.TEXT_NODE){
                    //add a single space between adjacent text nodes
                    ret += " "+this[i].xml;
                }else{
                    ret += this[i].xml;
                }
            }
        }
        
        return ret;
    },
    toArray: function () {
        var children = [];
        for ( var i=0; i < this.length; i++) {
                children.push (this[i]);
        }
        return children;
    },
    toString: function(){
      return "[ "+(this.length > 0?Array.prototype.join.apply(this, [", "]):"Empty NodeList")+" ]";
    }
});


/**
 * @method DOMNodeList._findItemIndex - find the item index of the node with the specified internal id
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  id : int - unique internal id
 * @return : int
 */
var __findItemIndex__ = function (nodelist, id) {
  var ret = -1;

  // test that id is valid
  if (id > -1) {
    for (var i=0; i<nodelist.length; i++) {
      // compare id to each node's _id
      if (nodelist[i]._id == id) {            // found it!
        ret = i;
        break;
      }
    }
  }

  return ret;                                    // if node is not found, default value -1 is returned
};

/**
 * @method DOMNodeList._insertBefore - insert the specified Node into the NodeList before the specified index
 *   Used by DOMNode.insertBefore(). Note: DOMNode.insertBefore() is responsible for Node Pointer surgery
 *   DOMNodeList._insertBefore() simply modifies the internal data structure (Array).
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  newChild      : DOMNode - the Node to be inserted
 * @param  refChildIndex : int     - the array index to insert the Node before
 */
var __insertBefore__ = function(nodelist, newChild, refChildIndex) {
    if ((refChildIndex >= 0) && (refChildIndex <= nodelist.length)) { // bounds check
        if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {  // node is a DocumentFragment
            // append the children of DocumentFragment
            Array.prototype.splice.apply(nodelist,[refChildIndex, 0].concat(newChild.childNodes.toArray()));
        }
        else {
            // append the newChild
            Array.prototype.splice.apply(nodelist,[refChildIndex, 0, newChild]);
        }
    }
};

/**
 * @method DOMNodeList._replaceChild - replace the specified Node in the NodeList at the specified index
 *   Used by DOMNode.replaceChild(). Note: DOMNode.replaceChild() is responsible for Node Pointer surgery
 *   DOMNodeList._replaceChild() simply modifies the internal data structure (Array).
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  newChild      : DOMNode - the Node to be inserted
 * @param  refChildIndex : int     - the array index to hold the Node
 */
var __replaceChild__ = function(nodelist, newChild, refChildIndex) {
    var ret = null;
    
    if ((refChildIndex >= 0) && (refChildIndex < nodelist.length)) { // bounds check
        ret = nodelist[refChildIndex];            // preserve old child for return
    
        if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {  // node is a DocumentFragment
            // get array containing children prior to refChild
            Array.prototype.splice.apply(nodelist,[refChildIndex, 1].concat(newChild.childNodes.toArray()));
        }
        else {
            // simply replace node in array (links between Nodes are made at higher level)
            nodelist[refChildIndex] = newChild;
        }
    }
    
    return ret;                                   // return replaced node
};

/**
 * @method DOMNodeList._removeChild - remove the specified Node in the NodeList at the specified index
 *   Used by DOMNode.removeChild(). Note: DOMNode.removeChild() is responsible for Node Pointer surgery
 *   DOMNodeList._replaceChild() simply modifies the internal data structure (Array).
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  refChildIndex : int - the array index holding the Node to be removed
 */
var __removeChild__ = function(nodelist, refChildIndex) {
    var ret = null;
    
    if (refChildIndex > -1) {                              // found it!
        ret = nodelist[refChildIndex];                    // return removed node
        
        // rebuild array without removed child
        Array.prototype.splice.apply(nodelist,[refChildIndex, 1]);
    }
    
    return ret;                                   // return removed node
};

/**
 * @method DOMNodeList._appendChild - append the specified Node to the NodeList
 *   Used by DOMNode.appendChild(). Note: DOMNode.appendChild() is responsible for Node Pointer surgery
 *   DOMNodeList._appendChild() simply modifies the internal data structure (Array).
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  newChild      : DOMNode - the Node to be inserted
 */
var __appendChild__ = function(nodelist, newChild) {
    if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {  // node is a DocumentFragment
        // append the children of DocumentFragment
         Array.prototype.push.apply(nodelist, newChild.childNodes.toArray() );
    } else {
        // simply add node to array (links between Nodes are made at higher level)
        Array.prototype.push.apply(nodelist, [newChild]);
    }
    
};

/**
 * @method DOMNodeList._cloneNodes - Returns a NodeList containing clones of the Nodes in this NodeList
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  deep : boolean - If true, recursively clone the subtree under each of the nodes;
 *   if false, clone only the nodes themselves (and their attributes, if it is an Element).
 * @param  parentNode : DOMNode - the new parent of the cloned NodeList
 * @return : DOMNodeList - NodeList containing clones of the Nodes in this NodeList
 */
var __cloneNodes__ = function(nodelist, deep, parentNode) {
    var cloneNodeList = new DOMNodeList(nodelist.ownerDocument, parentNode);
    
    // create list containing clones of each child
    for (var i=0; i < nodelist.length; i++) {
        __appendChild__(cloneNodeList, nodelist[i].cloneNode(deep));
    }
    
    return cloneNodeList;
};

$w.NodeList = DOMNodeList;
/**
 * @class  DOMNamedNodeMap - used to represent collections of nodes that can be accessed by name
 *  typically a set of Element attributes
 *
 * @extends DOMNodeList - note W3C spec says that this is not the case,
 *   but we need an item() method identicle to DOMNodeList's, so why not?
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - the ownerDocument
 * @param  parentNode    : DOMNode - the node that the DOMNamedNodeMap is attached to (or null)
 */
var DOMNamedNodeMap = function(ownerDocument, parentNode) {
    //$log("\t\tcreating dom namednodemap");
    this.DOMNodeList = DOMNodeList;
    this.DOMNodeList(ownerDocument, parentNode);
    __setArray__(this, []);
};
DOMNamedNodeMap.prototype = new DOMNodeList;
__extend__(DOMNamedNodeMap.prototype, {
    add: function(name){
        this[this.length] = name;
    },
    getNamedItem : function(name) {
        var ret = null;
        
        // test that Named Node exists
        var itemIndex = __findNamedItemIndex__(this, name);
        
        if (itemIndex > -1) {                          // found it!
            ret = this[itemIndex];                // return NamedNode
        }
        
        return ret;                                    // if node is not found, default value null is returned
    },
    setNamedItem : function(arg) {
      // test for exceptions
      if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if arg was not created by this Document
            if (this.ownerDocument != arg.ownerDocument) {
              throw(new DOMException(DOMException.WRONG_DOCUMENT_ERR));
            }
        
            // throw Exception if DOMNamedNodeMap is readonly
            if (this._readonly || (this.parentNode && this.parentNode._readonly)) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
        
            // throw Exception if arg is already an attribute of another Element object
            if (arg.ownerElement && (arg.ownerElement != this.parentNode)) {
              throw(new DOMException(DOMException.INUSE_ATTRIBUTE_ERR));
            }
      }
    
      // get item index
      var itemIndex = __findNamedItemIndex__(this, arg.name);
      var ret = null;
    
      if (itemIndex > -1) {                          // found it!
            ret = this[itemIndex];                // use existing Attribute
        
            // throw Exception if DOMAttr is readonly
            if (__ownerDocument__(this).implementation.errorChecking && ret._readonly) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            } else {
              this[itemIndex] = arg;                // over-write existing NamedNode
              this[arg.name.toLowerCase()] = arg;
            }
      } else {
            // add new NamedNode
            Array.prototype.push.apply(this, [arg]);
            this[arg.name.toLowerCase()] = arg;
      }
    
      arg.ownerElement = this.parentNode;            // update ownerElement
    
      return ret;                                    // return old node or null
    },
    removeNamedItem : function(name) {
          var ret = null;
          // test for exceptions
          // throw Exception if DOMNamedNodeMap is readonly
          if (__ownerDocument__(this).implementation.errorChecking && 
                (this._readonly || (this.parentNode && this.parentNode._readonly))) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
          }
        
          // get item index
          var itemIndex = __findNamedItemIndex__(this, name);
        
          // throw Exception if there is no node named name in this map
          if (__ownerDocument__(this).implementation.errorChecking && (itemIndex < 0)) {
            throw(new DOMException(DOMException.NOT_FOUND_ERR));
          }
        
          // get Node
          var oldNode = this[itemIndex];
          //this[oldNode.name] = undefined;
        
          // throw Exception if Node is readonly
          if (__ownerDocument__(this).implementation.errorChecking && oldNode._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
          }
        
          // return removed node
          return __removeChild__(this, itemIndex);
    },
    getNamedItemNS : function(namespaceURI, localName) {
          var ret = null;
        
          // test that Named Node exists
          var itemIndex = __findNamedItemNSIndex__(this, namespaceURI, localName);
        
          if (itemIndex > -1) {                          // found it!
            ret = this[itemIndex];                // return NamedNode
          }
        
          return ret;                                    // if node is not found, default value null is returned
    },
    setNamedItemNS : function(arg) {
          // test for exceptions
          if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if DOMNamedNodeMap is readonly
            if (this._readonly || (this.parentNode && this.parentNode._readonly)) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
        
            // throw Exception if arg was not created by this Document
            if (__ownerDocument__(this) != __ownerDocument__(arg)) {
              throw(new DOMException(DOMException.WRONG_DOCUMENT_ERR));
            }
        
            // throw Exception if arg is already an attribute of another Element object
            if (arg.ownerElement && (arg.ownerElement != this.parentNode)) {
              throw(new DOMException(DOMException.INUSE_ATTRIBUTE_ERR));
            }
          }
        
          // get item index
          var itemIndex = __findNamedItemNSIndex__(this, arg.namespaceURI, arg.localName);
          var ret = null;
        
          if (itemIndex > -1) {                          // found it!
            ret = this[itemIndex];                // use existing Attribute
            // throw Exception if DOMAttr is readonly
            if (__ownerDocument__(this).implementation.errorChecking && ret._readonly) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            } else {
              this[itemIndex] = arg;                // over-write existing NamedNode
            }
          }else {
            // add new NamedNode
            Array.prototype.push.apply(this, [arg]);
          }
          arg.ownerElement = this.parentNode;
        
        
          return ret;                                    // return old node or null
    },
    removeNamedItemNS : function(namespaceURI, localName) {
          var ret = null;
        
          // test for exceptions
          // throw Exception if DOMNamedNodeMap is readonly
          if (__ownerDocument__(this).implementation.errorChecking && (this._readonly || (this.parentNode && this.parentNode._readonly))) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
          }
        
          // get item index
          var itemIndex = __findNamedItemNSIndex__(this, namespaceURI, localName);
        
          // throw Exception if there is no matching node in this map
          if (__ownerDocument__(this).implementation.errorChecking && (itemIndex < 0)) {
            throw(new DOMException(DOMException.NOT_FOUND_ERR));
          }
        
          // get Node
          var oldNode = this[itemIndex];
        
          // throw Exception if Node is readonly
          if (__ownerDocument__(this).implementation.errorChecking && oldNode._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
          }
        
          return __removeChild__(this, itemIndex);             // return removed node
    },
    get xml() {
          var ret = "";
        
          // create string containing concatenation of all (but last) Attribute string values (separated by spaces)
          for (var i=0; i < this.length -1; i++) {
            ret += this[i].xml +" ";
          }
        
          // add last Attribute to string (without trailing space)
          if (this.length > 0) {
            ret += this[this.length -1].xml;
          }
        
          return ret;
    }

});

/**
 * @method DOMNamedNodeMap._findNamedItemIndex - find the item index of the node with the specified name
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  name : string - the name of the required node
 * @return : int
 */
var __findNamedItemIndex__ = function(namednodemap, name) {
  var ret = -1;

  // loop through all nodes
  for (var i=0; i<namednodemap.length; i++) {
    // compare name to each node's nodeName
    if(namednodemap.isnsmap){
        if (namednodemap[i].localName.toLowerCase() == name.toLowerCase()) {         // found it!
          ret = i;
          break;
        }
    }else{
        if (namednodemap[i].name.toLowerCase() == name.toLowerCase()) {         // found it!
          ret = i;
          break;
        }
    }
  }

  return ret;                                    // if node is not found, default value -1 is returned
};

/**
 * @method DOMNamedNodeMap._findNamedItemNSIndex - find the item index of the node with the specified namespaceURI and localName
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  namespaceURI : string - the namespace URI of the required node
 * @param  localName    : string - the local name of the required node
 * @return : int
 */
var __findNamedItemNSIndex__ = function(namednodemap, namespaceURI, localName) {
  var ret = -1;

  // test that localName is not null
  if (localName) {
    // loop through all nodes
    for (var i=0; i<namednodemap.length; i++) {
      // compare name to each node's namespaceURI and localName
      if ((namednodemap[i].namespaceURI.toLowerCase() == namespaceURI.toLowerCase()) && 
          (namednodemap[i].localName.toLowerCase() == localName.toLowerCase())) {
        ret = i;                                 // found it!
        break;
      }
    }
  }

  return ret;                                    // if node is not found, default value -1 is returned
};

/**
 * @method DOMNamedNodeMap._hasAttribute - Returns true if specified node exists
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  name : string - the name of the required node
 * @return : boolean
 */
var __hasAttribute__ = function(namednodemap, name) {
  var ret = false;

  // test that Named Node exists
  var itemIndex = __findNamedItemIndex__(namednodemap, name);

  if (itemIndex > -1) {                          // found it!
    ret = true;                                  // return true
  }

  return ret;                                    // if node is not found, default value false is returned
}

/**
 * @method DOMNamedNodeMap._hasAttributeNS - Returns true if specified node exists
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  namespaceURI : string - the namespace URI of the required node
 * @param  localName    : string - the local name of the required node
 * @return : boolean
 */
var __hasAttributeNS__ = function(namednodemap, namespaceURI, localName) {
  var ret = false;

  // test that Named Node exists
  var itemIndex = __findNamedItemNSIndex__(namednodemap, namespaceURI, localName);

  if (itemIndex > -1) {                          // found it!
    ret = true;                                  // return true
  }

  return ret;                                    // if node is not found, default value false is returned
}

/**
 * @method DOMNamedNodeMap._cloneNodes - Returns a NamedNodeMap containing clones of the Nodes in this NamedNodeMap
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  parentNode : DOMNode - the new parent of the cloned NodeList
 * @param  isnsmap : bool - is this a DOMNamespaceNodeMap
 * @return : DOMNamedNodeMap - NamedNodeMap containing clones of the Nodes in this DOMNamedNodeMap
 */
var __cloneNamedNodes__ = function(namednodemap, parentNode) {
  var cloneNamedNodeMap = namednodemap.isnsmap?
    new DOMNamespaceNodeMap(namednodemap.ownerDocument, parentNode):
    new DOMNamedNodeMap(namednodemap.ownerDocument, parentNode);

  // create list containing clones of all children
  for (var i=0; i < namednodemap.length; i++) {
      $debug("cloning node in named node map :" + namednodemap[i]);
    __appendChild__(cloneNamedNodeMap, namednodemap[i].cloneNode(false));
  }

  return cloneNamedNodeMap;
};


/**
 * @class  DOMNamespaceNodeMap - used to represent collections of namespace nodes that can be accessed by name
 *  typically a set of Element attributes
 *
 * @extends DOMNamedNodeMap
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 *
 * @param  ownerDocument : DOMDocument - the ownerDocument
 * @param  parentNode    : DOMNode - the node that the DOMNamespaceNodeMap is attached to (or null)
 */
var DOMNamespaceNodeMap = function(ownerDocument, parentNode) {
    //$log("\t\t\tcreating dom namespacednodemap");
    this.DOMNamedNodeMap = DOMNamedNodeMap;
    this.DOMNamedNodeMap(ownerDocument, parentNode);
    __setArray__(this, []);
    this.isnsmap = true;
};
DOMNamespaceNodeMap.prototype = new DOMNamedNodeMap;
__extend__(DOMNamespaceNodeMap.prototype, {
    get xml() {
          var ret = "";
        
          // identify namespaces declared local to this Element (ie, not inherited)
          for (var ind = 0; ind < this.length; ind++) {
            // if namespace declaration does not exist in the containing node's, parentNode's namespaces
            var ns = null;
            try {
                var ns = this.parentNode.parentNode._namespaces.
                    getNamedItem(this[ind].localName);
            }
            catch (e) {
                //breaking to prevent default namespace being inserted into return value
                break;
            }
            if (!(ns && (""+ ns.nodeValue == ""+ this[ind].nodeValue))) {
              // display the namespace declaration
              ret += this[ind].xml +" ";
            }
          }
        
          return ret;
    }
});

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining Node");
/*
* Node - DOM Level 2
*/	
/**
 * @class  DOMNode - The Node interface is the primary datatype for the entire Document Object Model.
 *   It represents a single node in the document tree.
 * @author Jon van Noort (jon@webarcana.com.au), David Joham (djoham@yahoo.com) and Scott Severtson
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMNode = function(ownerDocument) {
  if (ownerDocument) {
    this._id = ownerDocument._genId();           // generate unique internal id
  }
  
  this.namespaceURI = "";                        // The namespace URI of this node (Level 2)
  this.prefix       = "";                        // The namespace prefix of this node (Level 2)
  this.localName    = "";                        // The localName of this node (Level 2)

  this.nodeName = "";                            // The name of this node
  this.nodeValue = null;                           // The value of this node
  //this.className = "";                           // The CSS class name of this node.
  
  // The parent of this node. All nodes, except Document, DocumentFragment, and Attr may have a parent.
  // However, if a node has just been created and not yet added to the tree, or if it has been removed from the tree, this is null
  this.parentNode      = null;

  // A NodeList that contains all children of this node. If there are no children, this is a NodeList containing no nodes.
  // The content of the returned NodeList is "live" in the sense that, for instance, changes to the children of the node object
  // that it was created from are immediately reflected in the nodes returned by the NodeList accessors;
  // it is not a static snapshot of the content of the node. This is true for every NodeList, including the ones returned by the getElementsByTagName method.
  this.childNodes      = new DOMNodeList(ownerDocument, this);

  this.firstChild      = null;                   // The first child of this node. If there is no such node, this is null
  this.lastChild       = null;                   // The last child of this node. If there is no such node, this is null.
  this.previousSibling = null;                   // The node immediately preceding this node. If there is no such node, this is null.
  this.nextSibling     = null;                   // The node immediately following this node. If there is no such node, this is null.

  this.ownerDocument   = ownerDocument;          // The Document object associated with this node
  this.attributes = new DOMNamedNodeMap(this.ownerDocument, this);
  this._namespaces = new DOMNamespaceNodeMap(ownerDocument, this);  // The namespaces in scope for this node
  this._readonly = false;
};

// nodeType constants
DOMNode.ELEMENT_NODE                = 1;
DOMNode.ATTRIBUTE_NODE              = 2;
DOMNode.TEXT_NODE                   = 3;
DOMNode.CDATA_SECTION_NODE          = 4;
DOMNode.ENTITY_REFERENCE_NODE       = 5;
DOMNode.ENTITY_NODE                 = 6;
DOMNode.PROCESSING_INSTRUCTION_NODE = 7;
DOMNode.COMMENT_NODE                = 8;
DOMNode.DOCUMENT_NODE               = 9;
DOMNode.DOCUMENT_TYPE_NODE          = 10;
DOMNode.DOCUMENT_FRAGMENT_NODE      = 11;
DOMNode.NOTATION_NODE               = 12;
DOMNode.NAMESPACE_NODE              = 13;

__extend__(DOMNode.prototype, {
    hasAttributes : function() {
        if (this.attributes.length == 0) {
            return false;
        }else{
            return true;
        }
    },
    insertBefore : function(newChild, refChild) {
        var prevNode;
        
        if(newChild==null){
            return newChild;
        }
        if(refChild==null){
            this.appendChild(newChild);
            return this.newChild;
        }
        
        // test for exceptions
        if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if DOMNode is readonly
            if (this._readonly) {
                throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
            
            // throw Exception if newChild was not created by this Document
            if (__ownerDocument__(this) != __ownerDocument__(newChild)) {
                throw(new DOMException(DOMException.WRONG_DOCUMENT_ERR));
            }
            
            // throw Exception if the node is an ancestor
            if (__isAncestor__(this, newChild)) {
                throw(new DOMException(DOMException.HIERARCHY_REQUEST_ERR));
            }
        }
        
        if (refChild) {                                // if refChild is specified, insert before it
            // find index of refChild
            var itemIndex = __findItemIndex__(this.childNodes, refChild._id);
            // throw Exception if there is no child node with this id
            if (__ownerDocument__(this).implementation.errorChecking && (itemIndex < 0)) {
              throw(new DOMException(DOMException.NOT_FOUND_ERR));
            }
            
            // if the newChild is already in the tree,
            var newChildParent = newChild.parentNode;
            if (newChildParent) {
              // remove it
              newChildParent.removeChild(newChild);
            }
            
            // insert newChild into childNodes
            __insertBefore__(this.childNodes, newChild, itemIndex);
            
            // do node pointer surgery
            prevNode = refChild.previousSibling;
            
            // handle DocumentFragment
            if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {
              if (newChild.childNodes.length > 0) {
                // set the parentNode of DocumentFragment's children
                for (var ind = 0; ind < newChild.childNodes.length; ind++) {
                  newChild.childNodes[ind].parentNode = this;
                }
            
                // link refChild to last child of DocumentFragment
                refChild.previousSibling = newChild.childNodes[newChild.childNodes.length-1];
              }
            }else {
                newChild.parentNode = this;                // set the parentNode of the newChild
                refChild.previousSibling = newChild;       // link refChild to newChild
            }
            
        }else {                                         // otherwise, append to end
            prevNode = this.lastChild;
            this.appendChild(newChild);
        }
        
        if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {
            // do node pointer surgery for DocumentFragment
            if (newChild.childNodes.length > 0) {
                if (prevNode) {  
                    prevNode.nextSibling = newChild.childNodes[0];
                }else {                                         // this is the first child in the list
                    this.firstChild = newChild.childNodes[0];
                }
            
                newChild.childNodes[0].previousSibling = prevNode;
                newChild.childNodes[newChild.childNodes.length-1].nextSibling = refChild;
            }
        }else {
            // do node pointer surgery for newChild
            if (prevNode) {
              prevNode.nextSibling = newChild;
            }else {                                         // this is the first child in the list
              this.firstChild = newChild;
            }
            
            newChild.previousSibling = prevNode;
            newChild.nextSibling     = refChild;
        }
        
        return newChild;
    },
    replaceChild : function(newChild, oldChild) {
        var ret = null;
        
        if(newChild==null || oldChild==null){
            return oldChild;
        }
        
        // test for exceptions
        if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if DOMNode is readonly
            if (this._readonly) {
                throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
        
            // throw Exception if newChild was not created by this Document
            if (__ownerDocument__(this) != __ownerDocument__(newChild)) {
                throw(new DOMException(DOMException.WRONG_DOCUMENT_ERR));
            }
        
            // throw Exception if the node is an ancestor
            if (__isAncestor__(this, newChild)) {
                throw(new DOMException(DOMException.HIERARCHY_REQUEST_ERR));
            }
        }
        
        // get index of oldChild
        var index = __findItemIndex__(this.childNodes, oldChild._id);
        
        // throw Exception if there is no child node with this id
        if (__ownerDocument__(this).implementation.errorChecking && (index < 0)) {
            throw(new DOMException(DOMException.NOT_FOUND_ERR));
        }
        
        // if the newChild is already in the tree,
        var newChildParent = newChild.parentNode;
        if (newChildParent) {
            // remove it
            newChildParent.removeChild(newChild);
        }
        
        // add newChild to childNodes
        ret = __replaceChild__(this.childNodes,newChild, index);
        
        
        if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {
            // do node pointer surgery for Document Fragment
            if (newChild.childNodes.length > 0) {
                for (var ind = 0; ind < newChild.childNodes.length; ind++) {
                    newChild.childNodes[ind].parentNode = this;
                }
                
                if (oldChild.previousSibling) {
                    oldChild.previousSibling.nextSibling = newChild.childNodes[0];
                } else {
                    this.firstChild = newChild.childNodes[0];
                }
                
                if (oldChild.nextSibling) {
                    oldChild.nextSibling.previousSibling = newChild;
                } else {
                    this.lastChild = newChild.childNodes[newChild.childNodes.length-1];
                }
                
                newChild.childNodes[0].previousSibling = oldChild.previousSibling;
                newChild.childNodes[newChild.childNodes.length-1].nextSibling = oldChild.nextSibling;
            }
        } else {
            // do node pointer surgery for newChild
            newChild.parentNode = this;
            
            if (oldChild.previousSibling) {
                oldChild.previousSibling.nextSibling = newChild;
            }else{
                this.firstChild = newChild;
            }
            if (oldChild.nextSibling) {
                oldChild.nextSibling.previousSibling = newChild;
            }else{
                this.lastChild = newChild;
            }
            newChild.previousSibling = oldChild.previousSibling;
            newChild.nextSibling = oldChild.nextSibling;
        }
        
        return ret;
    },
    removeChild : function(oldChild) {
        if(!oldChild){
            return null;
        }
        // throw Exception if DOMNamedNodeMap is readonly
        if (__ownerDocument__(this).implementation.errorChecking && (this._readonly || oldChild._readonly)) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        
        // get index of oldChild
        var itemIndex = __findItemIndex__(this.childNodes, oldChild._id);
        
        // throw Exception if there is no child node with this id
        if (__ownerDocument__(this).implementation.errorChecking && (itemIndex < 0)) {
            throw(new DOMException(DOMException.NOT_FOUND_ERR));
        }
        
        // remove oldChild from childNodes
        __removeChild__(this.childNodes, itemIndex);
        
        // do node pointer surgery
        oldChild.parentNode = null;
        
        if (oldChild.previousSibling) {
            oldChild.previousSibling.nextSibling = oldChild.nextSibling;
        }else {
            this.firstChild = oldChild.nextSibling;
        }
        if (oldChild.nextSibling) {
            oldChild.nextSibling.previousSibling = oldChild.previousSibling;
        }else {
            this.lastChild = oldChild.previousSibling;
        }
        
        oldChild.previousSibling = null;
        oldChild.nextSibling = null;
        
        return oldChild;
    },
    appendChild : function(newChild) {
        if(!newChild){
            return null;
        }
      // test for exceptions
      if (__ownerDocument__(this).implementation.errorChecking) {
        // throw Exception if Node is readonly
        if (this._readonly) {
          throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
    
        // throw Exception if arg was not created by this Document
        if (__ownerDocument__(this) != __ownerDocument__(this)) {
          throw(new DOMException(DOMException.WRONG_DOCUMENT_ERR));
        }
    
        // throw Exception if the node is an ancestor
        if (__isAncestor__(this, newChild)) {
          throw(new DOMException(DOMException.HIERARCHY_REQUEST_ERR));
        }
      }
    
      // if the newChild is already in the tree,
      var newChildParent = newChild.parentNode;
      if (newChildParent) {
        // remove it
        newChildParent.removeChild(newChild);
      }
    
      // add newChild to childNodes
      __appendChild__(this.childNodes, newChild);
    
      if (newChild.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {
        // do node pointer surgery for DocumentFragment
        if (newChild.childNodes.length > 0) {
          for (var ind = 0; ind < newChild.childNodes.length; ind++) {
            newChild.childNodes[ind].parentNode = this;
          }
    
          if (this.lastChild) {
            this.lastChild.nextSibling = newChild.childNodes[0];
            newChild.childNodes[0].previousSibling = this.lastChild;
            this.lastChild = newChild.childNodes[newChild.childNodes.length-1];
          }
          else {
            this.lastChild = newChild.childNodes[newChild.childNodes.length-1];
            this.firstChild = newChild.childNodes[0];
          }
        }
      }
      else {
        // do node pointer surgery for newChild
        newChild.parentNode = this;
        if (this.lastChild) {
          this.lastChild.nextSibling = newChild;
          newChild.previousSibling = this.lastChild;
          this.lastChild = newChild;
        }
        else {
          this.lastChild = newChild;
          this.firstChild = newChild;
        }
      }
      return newChild;
    },
    hasChildNodes : function() {
        return (this.childNodes.length > 0);
    },
    cloneNode: function(deep) {
        // use importNode to clone this Node
        //do not throw any exceptions
        try {
            return __ownerDocument__(this).importNode(this, deep);
        } catch (e) {
            //there shouldn't be any exceptions, but if there are, return null
            // may want to warn: $debug("could not clone node: "+e.code);
            return null;
        }
    },
    normalize : function() {
        var inode;
        var nodesToRemove = new DOMNodeList();
        
        if (this.nodeType == DOMNode.ELEMENT_NODE || this.nodeType == DOMNode.DOCUMENT_NODE) {
            var adjacentTextNode = null;
        
            // loop through all childNodes
            for(var i = 0; i < this.childNodes.length; i++) {
                inode = this.childNodes.item(i);
            
                if (inode.nodeType == DOMNode.TEXT_NODE) { // this node is a text node
                    if (inode.length < 1) {                  // this text node is empty
                        __appendChild__(nodesToRemove, inode);      // add this node to the list of nodes to be remove
                    }else {
                        if (adjacentTextNode) {                // if previous node was also text
                            adjacentTextNode.appendData(inode.data);     // merge the data in adjacent text nodes
                            __appendChild__(nodesToRemove, inode);    // add this node to the list of nodes to be removed
                        }else {
                            adjacentTextNode = inode;              // remember this node for next cycle
                        }
                    }
                } else {
                    adjacentTextNode = null;                 // (soon to be) previous node is not a text node
                    inode.normalize();                       // normalise non Text childNodes
                }
            }
                
            // remove redundant Text Nodes
            for(var i = 0; i < nodesToRemove.length; i++) {
                inode = nodesToRemove.item(i);
                inode.parentNode.removeChild(inode);
            }
        }
    },
    isSupported : function(feature, version) {
        // use Implementation.hasFeature to determin if this feature is supported
        return __ownerDocument__(this).implementation.hasFeature(feature, version);
    },
    getElementsByTagName : function(tagname) {
        // delegate to _getElementsByTagNameRecursive
        // recurse childNodes
        var nodelist = new DOMNodeList(__ownerDocument__(this));
        for(var i = 0; i < this.childNodes.length; i++) {
            nodeList = __getElementsByTagNameRecursive__(this.childNodes.item(i), tagname, nodelist);
        }
        return nodelist;
    },
    getElementsByTagNameNS : function(namespaceURI, localName) {
        // delegate to _getElementsByTagNameNSRecursive
        return __getElementsByTagNameNSRecursive__(this, namespaceURI, localName, 
            new DOMNodeList(__ownerDocument__(this)));
    },
    importNode : function(importedNode, deep) {
        
        var importNode;

        // debug("importing node " + importedNode.nodeName + "(" + importedNode.nodeType + ")" + "(?deep = "+deep+")");

        //there is no need to perform namespace checks since everything has already gone through them
        //in order to have gotten into the DOM in the first place. The following line
        //turns namespace checking off in ._isValidNamespace
        __ownerDocument__(this)._performingImportNodeOperation = true;
        
            if (importedNode.nodeType == DOMNode.ELEMENT_NODE) {
                if (!__ownerDocument__(this).implementation.namespaceAware) {
                    // create a local Element (with the name of the importedNode)
                    importNode = __ownerDocument__(this).createElement(importedNode.tagName);
                
                    // create attributes matching those of the importedNode
                    for(var i = 0; i < importedNode.attributes.length; i++) {
                        importNode.setAttribute(importedNode.attributes.item(i).name, importedNode.getAttribute(importedNode.attributes.item(i).name));
                    }
                }else {
                    // create a local Element (with the name & namespaceURI of the importedNode)
                    importNode = __ownerDocument__(this).createElementNS(importedNode.namespaceURI, importedNode.nodeName);
                
                    // create attributes matching those of the importedNode
                    for(var i = 0; i < importedNode.attributes.length; i++) {
                        importNode.setAttributeNS(importedNode.attributes.item(i).namespaceURI, 
                            importedNode.attributes.item(i).name, importedNode.getAttribute(importedNode.attributes.item(i).name));
                    }
                
                    // create namespace definitions matching those of the importedNode
                    for(var i = 0; i < importedNode._namespaces.length; i++) {
                        importNode._namespaces[i] = __ownerDocument__(this).createNamespace(importedNode._namespaces.item(i).name);
                        importNode._namespaces[i].value = importedNode._namespaces.item(i).value;
                    }
                    importNode._namespaces.length = importedNode._namespaces.length;
                }
            } else if (importedNode.nodeType == DOMNode.ATTRIBUTE_NODE) {
                if (!__ownerDocument__(this).implementation.namespaceAware) {
                    // create a local Attribute (with the name of the importedAttribute)
                    importNode = __ownerDocument__(this).createAttribute(importedNode.name);
                } else {
                    // create a local Attribute (with the name & namespaceURI of the importedAttribute)
                    importNode = __ownerDocument__(this).createAttributeNS(importedNode.namespaceURI, importedNode.nodeName);
                

/*
                    // create namespace definitions matching those of the importedAttribute
                    for(var i = 0; i < importedNode._namespaces.length; i++) {
                        importNode._namespaces[i] = __ownerDocument__(this).createNamespace(importedNode._namespaces.item(i).localName);
                        importNode._namespaces[i].value = importedNode._namespaces.item(i).value;
                    }
*/


                }
            
                // set the value of the local Attribute to match that of the importedAttribute
                importNode.value = importedNode.value;
                
            } else if (importedNode.nodeType == DOMNode.DOCUMENT_FRAGMENT_NODE) {
                // create a local DocumentFragment
                importNode = __ownerDocument__(this).createDocumentFragment();
            } else if (importedNode.nodeType == DOMNode.NAMESPACE_NODE) {
                // create a local NamespaceNode (with the same name & value as the importedNode)
                importNode = __ownerDocument__(this).createNamespace(importedNode.name);
                importNode.value = importedNode.value;
            } else if (importedNode.nodeType == DOMNode.TEXT_NODE) {
                // create a local TextNode (with the same data as the importedNode)
                importNode = __ownerDocument__(this).createTextNode(importedNode.data);
            } else if (importedNode.nodeType == DOMNode.CDATA_SECTION_NODE) {
                // create a local CDATANode (with the same data as the importedNode)
                importNode = __ownerDocument__(this).createCDATASection(importedNode.data);
            } else if (importedNode.nodeType == DOMNode.PROCESSING_INSTRUCTION_NODE) {
                // create a local ProcessingInstruction (with the same target & data as the importedNode)
                importNode = __ownerDocument__(this).createProcessingInstruction(importedNode.target, importedNode.data);
            } else if (importedNode.nodeType == DOMNode.COMMENT_NODE) {
                // create a local Comment (with the same data as the importedNode)
                importNode = __ownerDocument__(this).createComment(importedNode.data);
            } else {  // throw Exception if nodeType is not supported
                throw(new DOMException(DOMException.NOT_SUPPORTED_ERR));
            }
            
            if (deep) {                                    // recurse childNodes
                for(var i = 0; i < importedNode.childNodes.length; i++) {
                    importNode.appendChild(__ownerDocument__(this).importNode(importedNode.childNodes.item(i), true));
                }
            }
            
            //reset _performingImportNodeOperation
            __ownerDocument__(this)._performingImportNodeOperation = false;
            return importNode;
        
    },
    contains : function(node){
            while(node && node != this ){
                node = node.parentNode;
            }
            return !!node;
    },
    compareDocumentPosition : function(b){
        var a = this;
        var number = (a != b && a.contains(b) && 16) + (a != b && b.contains(a) && 8);
        //find position of both
        var all = document.getElementsByTagName("*");
        var my_location = 0, node_location = 0;
        for(var i=0; i < all.length; i++){
            if(all[i] == a) my_location = i;
            if(all[i] == b) node_location = i;
            if(my_location && node_location) break;
        }
        number += (my_location < node_location && 4);
        number += (my_location > node_location && 2);
        return number;
    } 

});



/**
 * @method DOMNode._getElementsByTagNameRecursive - implements getElementsByTagName()
 * @param  elem     : DOMElement  - The element which are checking and then recursing into
 * @param  tagname  : string      - The name of the tag to match on. The special value "*" matches all tags
 * @param  nodeList : DOMNodeList - The accumulating list of matching nodes
 *
 * @return : DOMNodeList
 */
var __getElementsByTagNameRecursive__ = function (elem, tagname, nodeList) {

    if (elem.nodeType == DOMNode.ELEMENT_NODE || elem.nodeType == DOMNode.DOCUMENT_NODE) {
    
        if(elem.nodeType !== DOMNode.DOCUMENT_NODE && 
            ((elem.nodeName.toUpperCase() == tagname.toUpperCase()) || 
                (tagname == "*")) ){
            __appendChild__(nodeList, elem);               // add matching node to nodeList
        }
    
        // recurse childNodes
        for(var i = 0; i < elem.childNodes.length; i++) {
            nodeList = __getElementsByTagNameRecursive__(elem.childNodes.item(i), tagname, nodeList);
        }
    }
    
    return nodeList;
};

/**
 * @method DOMNode._getElementsByTagNameNSRecursive - implements getElementsByTagName()
 *
 * @param  elem     : DOMElement  - The element which are checking and then recursing into
 * @param  namespaceURI : string - the namespace URI of the required node
 * @param  localName    : string - the local name of the required node
 * @param  nodeList     : DOMNodeList - The accumulating list of matching nodes
 *
 * @return : DOMNodeList
 */
var __getElementsByTagNameNSRecursive__ = function(elem, namespaceURI, localName, nodeList) {
  if (elem.nodeType == DOMNode.ELEMENT_NODE || elem.nodeType == DOMNode.DOCUMENT_NODE) {

    if (((elem.namespaceURI == namespaceURI) || (namespaceURI == "*")) && ((elem.localName == localName) || (localName == "*"))) {
      __appendChild__(nodeList, elem);               // add matching node to nodeList
    }

    // recurse childNodes
    for(var i = 0; i < elem.childNodes.length; i++) {
      nodeList = __getElementsByTagNameNSRecursive__(elem.childNodes.item(i), namespaceURI, localName, nodeList);
    }
  }

  return nodeList;
};

/**
 * @method DOMNode._isAncestor - returns true if node is ancestor of target
 * @param  target         : DOMNode - The node we are using as context
 * @param  node         : DOMNode - The candidate ancestor node
 * @return : boolean
 */
var __isAncestor__ = function(target, node) {
  // if this node matches, return true,
  // otherwise recurse up (if there is a parentNode)
  return ((target == node) || ((target.parentNode) && (__isAncestor__(target.parentNode, node))));
};

var __ownerDocument__ = function(node){
    return (node.nodeType == DOMNode.DOCUMENT_NODE)?node:node.ownerDocument;
};

$w.Node = DOMNode;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// mode:auto-revert
// End:

/**
 * @class  DOMNamespace - The Namespace interface represents an namespace in an Element object
 *
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMNamespace = function(ownerDocument) {
  this.DOMNode = DOMNode;
  this.DOMNode(ownerDocument);

  this.name      = "";                           // the name of this attribute

  // If this attribute was explicitly given a value in the original document, this is true; otherwise, it is false.
  // Note that the implementation is in charge of this attribute, not the user.
  // If the user changes the value of the attribute (even if it ends up having the same value as the default value)
  // then the specified flag is automatically flipped to true
  this.specified = false;
};
DOMNamespace.prototype = new DOMNode;
__extend__(DOMNamespace.prototype, {
    get value(){
        // the value of the attribute is returned as a string
        return this.nodeValue;
    },
    set value(value){
        this.nodeValue = value+'';
    },
    get nodeType(){
        return DOMNode.NAMESPACE_NODE;
    },
    get xml(){
        var ret = "";

          // serialize Namespace Declaration
          if (this.name != "") {
            ret += this.name +"=\""+ __escapeXML__(this.nodeValue) +"\"";
          }
          else {  // handle default namespace
            ret += "xmlns=\""+ __escapeXML__(this.nodeValue) +"\"";
          }
        
          return ret;
    },
    toString: function(){
        return "Namespace " + this.name + "=" + this.value;
    }
});

$debug("Defining CharacterData");
/*
* CharacterData - DOM Level 2
*/
/**
 * @class  DOMCharacterData - parent abstract class for DOMText and DOMComment
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMCharacterData = function(ownerDocument) {
  this.DOMNode  = DOMNode;
  this.DOMNode(ownerDocument);
};
DOMCharacterData.prototype = new DOMNode;
__extend__(DOMCharacterData.prototype,{
    get data(){
        return this.nodeValue;
    },
    set data(data){
        this.nodeValue = data;
    },
    get length(){return this.nodeValue.length;},
    appendData: function(arg){
        // throw Exception if DOMCharacterData is readonly
        if (__ownerDocument__(this).implementation.errorChecking && this._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        // append data
        this.data = "" + this.data + arg;
    },
    deleteData: function(offset, count){ 
        // throw Exception if DOMCharacterData is readonly
        if (__ownerDocument__(this).implementation.errorChecking && this._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        if (this.data) {
            // throw Exception if offset is negative or greater than the data length,
            if (__ownerDocument__(this).implementation.errorChecking && 
                ((offset < 0) || (offset >  this.data.length) || (count < 0))) {
                throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
            
            // delete data
            if(!count || (offset + count) > this.data.length) {
              this.data = this.data.substring(0, offset);
            }else {
              this.data = this.data.substring(0, offset).
                concat(this.data.substring(offset + count));
            }
        }
    },
    insertData: function(offset, arg){
        // throw Exception if DOMCharacterData is readonly
        if(__ownerDocument__(this).implementation.errorChecking && this._readonly){
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        
        if(this.data){
            // throw Exception if offset is negative or greater than the data length,
            if (__ownerDocument__(this).implementation.errorChecking && 
                ((offset < 0) || (offset >  this.data.length))) {
                throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
            
            // insert data
            this.data =  this.data.substring(0, offset).concat(arg, this.data.substring(offset));
        }else {
            // throw Exception if offset is negative or greater than the data length,
            if (__ownerDocument__(this).implementation.errorChecking && (offset != 0)) {
               throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
            
            // set data
            this.data = arg;
        }
    },
    replaceData: function(offset, count, arg){
        // throw Exception if DOMCharacterData is readonly
        if (__ownerDocument__(this).implementation.errorChecking && this._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        
        if (this.data) {
            // throw Exception if offset is negative or greater than the data length,
            if (__ownerDocument__(this).implementation.errorChecking && 
                ((offset < 0) || (offset >  this.data.length) || (count < 0))) {
                throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
            
            // replace data
            this.data = this.data.substring(0, offset).
                concat(arg, this.data.substring(offset + count));
        }else {
            // set data
            this.data = arg;
        }
    },
    substringData: function(offset, count){
        var ret = null;
        if (this.data) {
            // throw Exception if offset is negative or greater than the data length,
            // or the count is negative
            if (__ownerDocument__(this).implementation.errorChecking && 
                ((offset < 0) || (offset > this.data.length) || (count < 0))) {
                throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
            // if count is not specified
            if (!count) {
                ret = this.data.substring(offset); // default to 'end of string'
            }else{
                ret = this.data.substring(offset, offset + count);
            }
        }
        return ret;
    }
});

$w.CharacterData = DOMCharacterData;$debug("Defining Text");
/*
* Text - DOM Level 2
*/
/**
 * @class  DOMText - The Text interface represents the textual content (termed character data in XML) of an Element or Attr.
 *   If there is no markup inside an element's content, the text is contained in a single object implementing the Text interface
 *   that is the only child of the element. If there is markup, it is parsed into a list of elements and Text nodes that form the
 *   list of children of the element.
 * @extends DOMCharacterData
 * @author Jon van Noort (jon@webarcana.com.au) and David Joham (djoham@yahoo.com)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMText = function(ownerDocument) {
  this.DOMCharacterData  = DOMCharacterData;
  this.DOMCharacterData(ownerDocument);

  this.nodeName  = "#text";
};
DOMText.prototype = new DOMCharacterData;
__extend__(DOMText.prototype,{
    //Breaks this Text node into two Text nodes at the specified offset,
    // keeping both in the tree as siblings. This node then only contains all the content up to the offset point.
    // And a new Text node, which is inserted as the next sibling of this node, contains all the content at and after the offset point.
    splitText : function(offset) {
        var data, inode;
        
        // test for exceptions
        if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if Node is readonly
            if (this._readonly) {
              throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
            
            // throw Exception if offset is negative or greater than the data length,
            if ((offset < 0) || (offset > this.data.length)) {
              throw(new DOMException(DOMException.INDEX_SIZE_ERR));
            }
        }
        
        if (this.parentNode) {
            // get remaining string (after offset)
            data  = this.substringData(offset);
            
            // create new TextNode with remaining string
            inode = __ownerDocument__(this).createTextNode(data);
            
            // attach new TextNode
            if (this.nextSibling) {
              this.parentNode.insertBefore(inode, this.nextSibling);
            }
            else {
              this.parentNode.appendChild(inode);
            }
            
            // remove remaining string from original TextNode
            this.deleteData(offset);
        }
        
        return inode;
    },
    get nodeType(){
        return DOMNode.TEXT_NODE;
    },
    get xml(){
        return __escapeHTML5__(""+ this.nodeValue);
    },
    toString: function(){
        return "Text #" + this._id;    
    }
});

$w.Text = DOMText;$debug("Defining CDATASection");
/*
* CDATASection - DOM Level 2
*/
/**
 * @class  DOMCDATASection - CDATA sections are used to escape blocks of text containing characters that would otherwise be regarded as markup.
 *   The only delimiter that is recognized in a CDATA section is the "\]\]\>" string that ends the CDATA section
 * @extends DOMCharacterData
 * @author Jon van Noort (jon@webarcana.com.au) and David Joham (djoham@yahoo.com)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMCDATASection = function(ownerDocument) {
  this.DOMText  = DOMText;
  this.DOMText(ownerDocument);

  this.nodeName  = "#cdata-section";
};
DOMCDATASection.prototype = new DOMText;
__extend__(DOMCDATASection.prototype,{
    get nodeType(){
        return DOMNode.CDATA_SECTION_NODE;
    },
    get xml(){
        return "<![CDATA[" + this.nodeValue + "]]>";
    },
    toString : function(){
        return "CDATA #"+this._id;
    }
});

$w.CDATASection = DOMCDATASection;$debug("Defining Comment");
/* 
* Comment - DOM Level 2
*/
/**
 * @class  DOMComment - This represents the content of a comment, i.e., all the characters between the starting '<!--' and ending '-->'
 * @extends DOMCharacterData
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMComment = function(ownerDocument) {
  this.DOMCharacterData  = DOMCharacterData;
  this.DOMCharacterData(ownerDocument);

  this.nodeName  = "#comment";
};
DOMComment.prototype = new DOMCharacterData;
__extend__(DOMComment.prototype, {
    get nodeType(){
        return DOMNode.COMMENT_NODE;
    },
    get xml(){
        return "<!--" + this.nodeValue + "-->";
    },
    toString : function(){
        return "Comment #"+this._id;
    }
});

$w.Comment = DOMComment;
$debug("Defining DocumentType");
;/*
* DocumentType - DOM Level 2
*/
var DOMDocumentType    = function() { 
    $error("DOMDocumentType.constructor(): Not Implemented"   ); 
};

$w.DocumentType = DOMDocumentType;
$debug("Defining Attr");
/*
* Attr - DOM Level 2
*/
/**
 * @class  DOMAttr - The Attr interface represents an attribute in an Element object
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMAttr = function(ownerDocument) {
    this.DOMNode = DOMNode;
    this.DOMNode(ownerDocument);
                   
    this.ownerElement = null;               // set when Attr is added to NamedNodeMap
};
DOMAttr.prototype = new DOMNode; 
__extend__(DOMAttr.prototype, {
    // the name of this attribute
    get name(){
        return this.nodeName;
    },
    set name(name){
        this.nodeName = name;
    },
    // the value of the attribute is returned as a string
    get value(){
        return this.nodeValue;
    },
    set value(value){
        // throw Exception if Attribute is readonly
        if (__ownerDocument__(this).implementation.errorChecking && this._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        // delegate to node
        this.nodeValue = value;
    },
    get specified(){
        return (this!==null&&this!=undefined);
    },
    get nodeType(){
        return DOMNode.ATTRIBUTE_NODE;
    },
    get xml(){
        if(this.nodeValue)
            return ' '+this.nodeName + '="' + __escapeXML__(this.nodeValue+"") + '"';
        else
            return '';
    },
    toString : function(){
        return "Attr #" + this._id + " " + this.name;
    }
});

$w.Attr = DOMAttr;
$debug("Defining Element");
/**
 * @class  DOMElement - By far the vast majority of objects (apart from text) that authors encounter
 *   when traversing a document are Element nodes.
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au) and David Joham (djoham@yahoo.com)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMElement = function(ownerDocument) {
    this.DOMNode  = DOMNode;
    this.DOMNode(ownerDocument);                   
    //this.id = null;                                  // the ID of the element
};
DOMElement.prototype = new DOMNode;
__extend__(DOMElement.prototype, {	
    // The name of the element.
    get tagName(){
        return this.nodeName;  
    },
    set tagName(name){
        this.nodeName = name;  
    },
    
    addEventListener        : function(type, fn, phase){ __addEventListener__(this, type, fn); },
    removeEventListener     : function(type){ __removeEventListener__(this, type); },
    dispatchEvent           : function(event, bubbles){ __dispatchEvent__(this, event, bubbles); },
   
    getAttribute: function(name) {
        var ret = null;
        // if attribute exists, use it
        var attr = this.attributes.getNamedItem(name);
        if (attr) {
            ret = attr.value;
        }
        return ret; // if Attribute exists, return its value, otherwise, return null
    },
    setAttribute : function (name, value) {
        // if attribute exists, use it
        var attr = this.attributes.getNamedItem(name);
        
        //I had to add this check becuase as the script initializes
        //the id may be set in the constructor, and the html element
        //overrides the id property with a getter/setter.
        if(__ownerDocument__(this)){
            if (attr===null||attr===undefined) {
                attr = __ownerDocument__(this).createAttribute(name);  // otherwise create it
            }
            
            
            // test for exceptions
            if (__ownerDocument__(this).implementation.errorChecking) {
                // throw Exception if Attribute is readonly
                if (attr._readonly) {
                    throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
                }
                
                // throw Exception if the value string contains an illegal character
                if (!__isValidString__(value)) {
                    throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
                }
            }
            
            /*if (__isIdDeclaration__(name)) {
                this.id = value;  // cache ID for getElementById()
            }*/
            
            // assign values to properties (and aliases)
            attr.value     = value + '';
            
            // add/replace Attribute in NamedNodeMap
            this.attributes.setNamedItem(attr);
        }else{
            $warn('Element has no owner document '+this.tagName+'\n\t cant set attribute ' + name + ' = '+value );
        }
    },
    removeAttribute : function removeAttribute(name) {
        // delegate to DOMNamedNodeMap.removeNamedItem
        return this.attributes.removeNamedItem(name);
    },
    getAttributeNode : function getAttributeNode(name) {
        // delegate to DOMNamedNodeMap.getNamedItem
        return this.attributes.getNamedItem(name);
    },
    setAttributeNode: function(newAttr) {
        // if this Attribute is an ID
        if (__isIdDeclaration__(newAttr.name)) {
            this.id = newAttr.value;  // cache ID for getElementById()
        }
        // delegate to DOMNamedNodeMap.setNamedItem
        return this.attributes.setNamedItem(newAttr);
    },
    removeAttributeNode: function(oldAttr) {
      // throw Exception if Attribute is readonly
      if (__ownerDocument__(this).implementation.errorChecking && oldAttr._readonly) {
        throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
      }
    
      // get item index
      var itemIndex = this.attributes._findItemIndex(oldAttr._id);
    
      // throw Exception if node does not exist in this map
      if (__ownerDocument__(this).implementation.errorChecking && (itemIndex < 0)) {
        throw(new DOMException(DOMException.NOT_FOUND_ERR));
      }
    
      return this.attributes._removeChild(itemIndex);
    },
    getAttributeNS : function(namespaceURI, localName) {
        var ret = "";
        // delegate to DOMNAmedNodeMap.getNamedItemNS
        var attr = this.attributes.getNamedItemNS(namespaceURI, localName);
        if (attr) {
            ret = attr.value;
        }
        return ret;  // if Attribute exists, return its value, otherwise return ""
    },
    setAttributeNS : function(namespaceURI, qualifiedName, value) {
        // call DOMNamedNodeMap.getNamedItem
        var attr = this.attributes.getNamedItem(namespaceURI, qualifiedName);
        
        if (!attr) {  // if Attribute exists, use it
            // otherwise create it
            attr = __ownerDocument__(this).createAttributeNS(namespaceURI, qualifiedName);
        }
        
        var value = value+'';
        
        // test for exceptions
        if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if Attribute is readonly
            if (attr._readonly) {
                throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
            }
            
            // throw Exception if the Namespace is invalid
            if (!__isValidNamespace__(namespaceURI, qualifiedName)) {
                throw(new DOMException(DOMException.NAMESPACE_ERR));
            }
            
            // throw Exception if the value string contains an illegal character
            if (!__isValidString__(value)) {
                throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
            }
        }
        
        // if this Attribute is an ID
        if (__isIdDeclaration__(name)) {
            this.id = value;  // cache ID for getElementById()
        }
        
        // assign values to properties (and aliases)
        attr.value     = value;
        attr.nodeValue = value;
        
        // delegate to DOMNamedNodeMap.setNamedItem
        this.attributes.setNamedItemNS(attr);
    },
    removeAttributeNS : function(namespaceURI, localName) {
        // delegate to DOMNamedNodeMap.removeNamedItemNS
        return this.attributes.removeNamedItemNS(namespaceURI, localName);
    },
    getAttributeNodeNS : function(namespaceURI, localName) {
        // delegate to DOMNamedNodeMap.getNamedItemNS
        return this.attributes.getNamedItemNS(namespaceURI, localName);
    },
    setAttributeNodeNS : function(newAttr) {
        // if this Attribute is an ID
        if ((newAttr.prefix == "") &&  __isIdDeclaration__(newAttr.name)) {
            this.id = newAttr.value+'';  // cache ID for getElementById()
        }
        
        // delegate to DOMNamedNodeMap.setNamedItemNS
        return this.attributes.setNamedItemNS(newAttr);
    },
    hasAttribute : function(name) {
        // delegate to DOMNamedNodeMap._hasAttribute
        return __hasAttribute__(this.attributes,name);
    },
    hasAttributeNS : function(namespaceURI, localName) {
        // delegate to DOMNamedNodeMap._hasAttributeNS
        return __hasAttributeNS__(this.attributes, namespaceURI, localName);
    },
    get nodeType(){
        return DOMNode.ELEMENT_NODE;
    },
    get xml() {
        var ret = "";
        
        // serialize namespace declarations
        var ns = this._namespaces.xml;
        if (ns.length > 0) ns = " "+ ns;
        
        // serialize Attribute declarations
        var attrs = this.attributes.xml;
        
        // serialize this Element
        ret += "<" + this.nodeName.toLowerCase() + ns + attrs +">";
        ret += this.childNodes.xml;
        ret += "</" + this.nodeName.toLowerCase() + ">";
        
        return ret;
    },
    toString : function(){
        return "Element #"+this._id + " "+ this.tagName + (this.id?" => "+this.id:'');
    }
});

$w.Element = DOMElement;
/**
 * @class  DOMException - raised when an operation is impossible to perform
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  code : int - the exception code (one of the DOMException constants)
 */
var DOMException = function(code) {
  this.code = code;
};

// DOMException constants
// Introduced in DOM Level 1:
DOMException.INDEX_SIZE_ERR                 = 1;
DOMException.DOMSTRING_SIZE_ERR             = 2;
DOMException.HIERARCHY_REQUEST_ERR          = 3;
DOMException.WRONG_DOCUMENT_ERR             = 4;
DOMException.INVALID_CHARACTER_ERR          = 5;
DOMException.NO_DATA_ALLOWED_ERR            = 6;
DOMException.NO_MODIFICATION_ALLOWED_ERR    = 7;
DOMException.NOT_FOUND_ERR                  = 8;
DOMException.NOT_SUPPORTED_ERR              = 9;
DOMException.INUSE_ATTRIBUTE_ERR            = 10;

// Introduced in DOM Level 2:
DOMException.INVALID_STATE_ERR              = 11;
DOMException.SYNTAX_ERR                     = 12;
DOMException.INVALID_MODIFICATION_ERR       = 13;
DOMException.NAMESPACE_ERR                  = 14;
DOMException.INVALID_ACCESS_ERR             = 15;
$debug("Defining DocumentFragment");
/* 
* DocumentFragment - DOM Level 2
*/
/**
 * @class  DOMDocumentFragment - DocumentFragment is a "lightweight" or "minimal" Document object.
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au) and David Joham (djoham@yahoo.com)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMDocumentFragment = function(ownerDocument) {
  this.DOMNode = DOMNode;
  this.DOMNode(ownerDocument);
  this.nodeName  = "#document-fragment";
};
DOMDocumentFragment.prototype = new DOMNode;
__extend__(DOMDocumentFragment.prototype,{
    get nodeType(){
        return DOMNode.DOCUMENT_FRAGMENT_NODE;
    },
    get xml(){
        var xml = "",
            count = this.childNodes.length;
        
        // create string concatenating the serialized ChildNodes
        for (var i = 0; i < count; i++) {
            xml += this.childNodes.item(i).xml;
        }
        
        return xml;
    },
    toString : function(){
        return "DocumentFragment #"+this._id;
    }
});

$w.DocumentFragment = DOMDocumentFragment;
$debug("Defining ProcessingInstruction");
/*
* ProcessingInstruction - DOM Level 2
*/
/**
 * @class  DOMProcessingInstruction - The ProcessingInstruction interface represents a "processing instruction",
 *   used in XML as a way to keep processor-specific information in the text of the document
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  ownerDocument : DOMDocument - The Document object associated with this node.
 */
var DOMProcessingInstruction = function(ownerDocument) {
  this.DOMNode  = DOMNode;
  this.DOMNode(ownerDocument);
};
DOMProcessingInstruction.prototype = new DOMNode;
__extend__(DOMProcessingInstruction.prototype, {
    get data(){
        return this.nodeValue;
    },
    set data(data){
        // throw Exception if DOMNode is readonly
        if (__ownerDocument__(this).errorChecking && this._readonly) {
            throw(new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR));
        }
        this.nodeValue = data;
    },
    get target(){
      // The target of this processing instruction.
      // XML defines this as being the first token following the markup that begins the processing instruction.
      // The content of this processing instruction.
        return this.nodeName;
    },
    set target(value){
      // The target of this processing instruction.
      // XML defines this as being the first token following the markup that begins the processing instruction.
      // The content of this processing instruction.
        this.nodeName = value;
    },
    get nodeType(){
        return DOMNode.PROCESSING_INSTRUCTION_NODE;
    },
    get xml(){
        return "<?" + this.nodeName +" "+ this.nodeValue + " ?>";
    },
    toString : function(){
        return "ProcessingInstruction #"+this._id;
    }
});

$w.ProcessesingInstruction = DOMProcessingInstruction;
$debug("Defining DOMParser");
/*
* DOMParser
*/

var DOMParser = function(){};
__extend__(DOMParser.prototype,{
    parseFromString: function(xmlString){
        $debug("Parsing XML String: " +xmlString);
        return document.implementation.createDocument().loadXML(xmlString);
    }
});

$debug("Initializing Internal DOMParser.");
//keep one around for internal use
$domparser = new DOMParser();

$w.DOMParser = DOMParser;
// =========================================================================
//
// xmlsax.js - an XML SAX parser in JavaScript.
//
// version 3.1
//
// =========================================================================
//
// Copyright (C) 2001 - 2002 David Joham (djoham@yahoo.com) and Scott Severtson
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.

// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.

// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//
//
// Visit the XML for <SCRIPT> home page at http://xmljs.sourceforge.net
//

// CONSTANTS
var whitespace = "\n\r\t ";


/**
*   function:   this is the constructor to the XMLP Object
*   Author:   Scott Severtson
*   Description:XMLP is a pull-based parser. The calling application passes in a XML string
*   to the constructor, then repeatedly calls .next() to parse the next segment.
*   .next() returns a flag indicating what type of segment was found, and stores
*   data temporarily in couple member variables (name, content, array of
*   attributes), which can be accessed by several .get____() methods.
*
*   Basically, XMLP is the lowest common denominator parser - an very simple
*   API which other wrappers can be built against.
**/


var XMLP = function(strXML) {
    // Normalize line breaks
    strXML = SAXStrings.replace(strXML, null, null, "\r\n", "\n");
    strXML = SAXStrings.replace(strXML, null, null, "\r", "\n");

    this.m_xml = strXML;
    this.m_iP = 0;
    this.m_iState = XMLP._STATE_PROLOG;
    this.m_stack = new Stack();
    this._clearAttributes();
    this.replaceEntities = true;
};


// CONSTANTS    (these must be below the constructor)


XMLP._NONE    = 0;
XMLP._ELM_B   = 1;
XMLP._ELM_E   = 2;
XMLP._ELM_EMP = 3;
XMLP._ATT     = 4;
XMLP._TEXT    = 5;
XMLP._ENTITY  = 6;
XMLP._PI      = 7;
XMLP._CDATA   = 8;
XMLP._COMMENT = 9;
XMLP._DTD     = 10;
XMLP._ERROR   = 11;

XMLP._CONT_XML = 0;
XMLP._CONT_ALT = 1;

XMLP._ATT_NAME = 0;
XMLP._ATT_VAL  = 1;

XMLP._STATE_PROLOG = 1;
XMLP._STATE_DOCUMENT = 2;
XMLP._STATE_MISC = 3;

XMLP._errs = new Array();
XMLP._errs[XMLP.ERR_CLOSE_PI       = 0 ] = "PI: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_DTD      = 1 ] = "DTD: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_COMMENT  = 2 ] = "Comment: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_CDATA    = 3 ] = "CDATA: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_ELM      = 4 ] = "Element: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_ENTITY   = 5 ] = "Entity: missing closing sequence";
XMLP._errs[XMLP.ERR_PI_TARGET      = 6 ] = "PI: target is required";
XMLP._errs[XMLP.ERR_ELM_EMPTY      = 7 ] = "Element: cannot be both empty and closing";
XMLP._errs[XMLP.ERR_ELM_NAME       = 8 ] = "Element: name must immediatly follow \"<\"";
XMLP._errs[XMLP.ERR_ELM_LT_NAME    = 9 ] = "Element: \"<\" not allowed in element names";
XMLP._errs[XMLP.ERR_ATT_VALUES     = 10] = "Attribute: values are required and must be in quotes";
XMLP._errs[XMLP.ERR_ATT_LT_NAME    = 11] = "Element: \"<\" not allowed in attribute names";
XMLP._errs[XMLP.ERR_ATT_LT_VALUE   = 12] = "Attribute: \"<\" not allowed in attribute values";
XMLP._errs[XMLP.ERR_ATT_DUP        = 13] = "Attribute: duplicate attributes not allowed";
XMLP._errs[XMLP.ERR_ENTITY_UNKNOWN = 14] = "Entity: unknown entity";
XMLP._errs[XMLP.ERR_INFINITELOOP   = 15] = "Infininte loop";
XMLP._errs[XMLP.ERR_DOC_STRUCTURE  = 16] = "Document: only comments, processing instructions, or whitespace allowed outside of document element";
XMLP._errs[XMLP.ERR_ELM_NESTING    = 17] = "Element: must be nested correctly";



XMLP.prototype._addAttribute = function(name, value) {
    this.m_atts[this.m_atts.length] = new Array(name, value);
}


XMLP.prototype._checkStructure = function(iEvent) {

    if(XMLP._STATE_PROLOG == this.m_iState) {

	    //The prolog is initial state of the document before parsing
	    //has really begun.  A rigid xml parsing implementation would not
		//allow anything but '<' as the first non-whitespace character
        if((XMLP._TEXT == iEvent) || (XMLP._ENTITY == iEvent)) {
            if(SAXStrings.indexOfNonWhitespace(this.getContent(), 
			    this.getContentBegin(), this.getContentEnd()) != -1) {
                    //TODO: HTML Helper here.
                    return this._setErr(XMLP.ERR_DOC_STRUCTURE);
            }
        }

        if((XMLP._ELM_B == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            this.m_iState = XMLP._STATE_DOCUMENT;
            // Don't return - fall through to next state
        }
		
    }
	
	
    if(XMLP._STATE_DOCUMENT == this.m_iState) {
        //The document is the state that the parser is in after the
		//first element event, and remains in that state until
		//the initial element is closed
        if((XMLP._ELM_B == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            this.m_stack.push(this.getName());
        }

        if((XMLP._ELM_E == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            var strTop = this.m_stack.pop();
            if((strTop == null) || (strTop != this.getName())) {
                return this._setErr(XMLP.ERR_ELM_NESTING);
            }
        }

        if(this.m_stack.count() == 0) {
            this.m_iState = XMLP._STATE_MISC;
            return iEvent;
        }
    }
	
	
    if(XMLP._STATE_MISC == this.m_iState) {
        //The misc parser state occurs after the root element has been
		//closed.  basically a rigid xml parser would throw an error
		//for any element or text found after this
        if((XMLP._ELM_B == iEvent) || 
		   (XMLP._ELM_E == iEvent) || 
		   (XMLP._ELM_EMP == iEvent) || 
		   (XMLP.EVT_DTD == iEvent)) {
            //TODO: HTML Helper here.
            return this._setErr(XMLP.ERR_DOC_STRUCTURE);
        }

        if((XMLP._TEXT == iEvent) || (XMLP._ENTITY == iEvent)) {
            if(SAXStrings.indexOfNonWhitespace(this.getContent(), 
			     this.getContentBegin(), this.getContentEnd()) != -1) {
                    //TODO: HTML Helper here.
                    return this._setErr(XMLP.ERR_DOC_STRUCTURE);
            }
        }
    }

    return iEvent;

};


XMLP.prototype._clearAttributes = function() {
    this.m_atts = new Array();
};


XMLP.prototype._findAttributeIndex = function(name) {
    for(var i = 0; i < this.m_atts.length; i++) {
        if(this.m_atts[i][XMLP._ATT_NAME] == name) {
            return i;
        }
    }
    return -1;

};


XMLP.prototype.getAttributeCount = function() {

    return this.m_atts ? this.m_atts.length : 0;

};


XMLP.prototype.getAttributeName = function(index) {

    return ((index < 0) || (index >= this.m_atts.length)) ? 
       null : 
       this.m_atts[index][XMLP._ATT_NAME];

};


XMLP.prototype.getAttributeValue = function(index) {

    return ((index < 0) || (index >= this.m_atts.length)) ? 
       null : 
	   __unescapeXML__(this.m_atts[index][XMLP._ATT_VAL]);

};


XMLP.prototype.getAttributeValueByName = function(name) {

    return this.getAttributeValue(this._findAttributeIndex(name));

};


XMLP.prototype.getColumnNumber = function() {

    return SAXStrings.getColumnNumber(this.m_xml, this.m_iP);

};


XMLP.prototype.getContent = function() {

    return (this.m_cSrc == XMLP._CONT_XML) ? 
	   this.m_xml : 
	   this.m_cAlt;

};


XMLP.prototype.getContentBegin = function() {

    return this.m_cB;

};


XMLP.prototype.getContentEnd = function() {

    return this.m_cE;

};


XMLP.prototype.getLineNumber = function() {

    return SAXStrings.getLineNumber(this.m_xml, this.m_iP);

};


XMLP.prototype.getName = function() {

    return this.m_name;

};


XMLP.prototype.next = function() {

    return this._checkStructure(this._parse());

};

XMLP.prototype.appendFragment = function(xmlfragment) {

    var start = this.m_xml.slice(0,this.m_iP);
    var end = this.m_xml.slice(this.m_iP);
    this.m_xml = start+xmlfragment+end;

};


XMLP.prototype._parse = function() {

    if(this.m_iP == this.m_xml.length) {
        return XMLP._NONE;
    }

    if(this.m_iP == this.m_xml.indexOf("<", this.m_iP)){
        if(this.m_xml.charAt(this.m_iP+1) == "?") {
            return this._parsePI(this.m_iP + 2);
        }
        else if(this.m_xml.charAt(this.m_iP+1) == "!") {
            if(this.m_xml.charAt(this.m_iP+2) == "D") {
                return this._parseDTD(this.m_iP + 9);
            }
            else if(this.m_xml.charAt(this.m_iP+2) == "-") {
                return this._parseComment(this.m_iP + 4);
            }
            else if(this.m_xml.charAt(this.m_iP+2) == "[") {
                return this._parseCDATA(this.m_iP + 9);
            }
        }
        else{
              
            return this._parseElement(this.m_iP + 1);
        }
    }
    else if(this.m_iP == this.m_xml.indexOf("&", this.m_iP)) {
        return this._parseEntity(this.m_iP + 1);
    }
    else{
          
        return this._parseText(this.m_iP);
    }


}


XMLP.prototype._parseAttribute = function(iB, iE) {
    var iNB, iNE, iEq, iVB, iVE;
    var cQuote, strN, strV;

    //resets the value so we don't use an old one by 
	//accident (see testAttribute7 in the test suite)
	this.m_cAlt = ""; 

    iNB = SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iE);
    if((iNB == -1) ||(iNB >= iE)) {
        return iNB;
    }

    iEq = this.m_xml.indexOf("=", iNB);
    if((iEq == -1) || (iEq > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    iNE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iNB, iEq);

    iVB = SAXStrings.indexOfNonWhitespace(this.m_xml, iEq + 1, iE);
    if((iVB == -1) ||(iVB > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    cQuote = this.m_xml.charAt(iVB);
    if(_SAXStrings.QUOTES.indexOf(cQuote) == -1) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    iVE = this.m_xml.indexOf(cQuote, iVB + 1);
    if((iVE == -1) ||(iVE > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    strN = this.m_xml.substring(iNB, iNE + 1);
    strV = this.m_xml.substring(iVB + 1, iVE);

    if(strN.indexOf("<") != -1) {
        return this._setErr(XMLP.ERR_ATT_LT_NAME);
    }

    if(strV.indexOf("<") != -1) {
        return this._setErr(XMLP.ERR_ATT_LT_VALUE);
    }

    strV = SAXStrings.replace(strV, null, null, "\n", " ");
    strV = SAXStrings.replace(strV, null, null, "\t", " ");
        iRet = this._replaceEntities(strV);
    if(iRet == XMLP._ERROR) {
        return iRet;
    }

    strV = this.m_cAlt;

    if(this._findAttributeIndex(strN) == -1) {
        this._addAttribute(strN, strV);
    }else {
        return this._setErr(XMLP.ERR_ATT_DUP);
    }

    this.m_iP = iVE + 2;

    return XMLP._ATT;

}


XMLP.prototype._parseCDATA = function(iB) {
    var iE = this.m_xml.indexOf("]]>", iB);
    if (iE == -1) {
        return this._setErr(XMLP.ERR_CLOSE_CDATA);
    }

    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE + 3;

    return XMLP._CDATA;

}


XMLP.prototype._parseComment = function(iB) {
    var iE = this.m_xml.indexOf("-" + "->", iB);
    if (iE == -1) {
        return this._setErr(XMLP.ERR_CLOSE_COMMENT);
    }

    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE + 3;

    return XMLP._COMMENT;

}


XMLP.prototype._parseDTD = function(iB) {

    // Eat DTD

    var iE, strClose, iInt, iLast;

    iE = this.m_xml.indexOf(">", iB);
    if(iE == -1) {
        return this._setErr(XMLP.ERR_CLOSE_DTD);
    }

    iInt = this.m_xml.indexOf("[", iB);
    strClose = ((iInt != -1) && (iInt < iE)) ? "]>" : ">";

    while(true) {
       
        iE = this.m_xml.indexOf(strClose, iB);
        if(iE == -1) {
            return this._setErr(XMLP.ERR_CLOSE_DTD);
        }

        // Make sure it is not the end of a CDATA section
        if (this.m_xml.substring(iE - 1, iE + 2) != "]]>") {
            break;
        }
    }

    this.m_iP = iE + strClose.length;

    return XMLP._DTD;

}


XMLP.prototype._parseElement = function(iB) {
    var iE, iDE, iNE, iRet;
    var iType, strN, iLast;

    iDE = iE = this.m_xml.indexOf(">", iB);
    if(iE == -1) {
        return this._setErr(XMLP.ERR_CLOSE_ELM);
    }

    if(this.m_xml.charAt(iB) == "/") {
        iType = XMLP._ELM_E;
        iB++;
    } else {
        iType = XMLP._ELM_B;
    }

    if(this.m_xml.charAt(iE - 1) == "/") {
        if(iType == XMLP._ELM_E) {
            return this._setErr(XMLP.ERR_ELM_EMPTY);
        }
        iType = XMLP._ELM_EMP;
        iDE--;
    }

    iDE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iB, iDE);

    //djohack
    //hack to allow for elements with single character names to be recognized

    ///if (iE - iB != 1 ) {
    ///    if(SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iDE) != iB) {
    ///        return this._setErr(XMLP.ERR_ELM_NAME);
    ///    }
    ///}
    
    // end hack -- original code below

    
    ///if(SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iDE) != iB)
    ///    return this._setErr(XMLP.ERR_ELM_NAME);
    ///
    this._clearAttributes();

    iNE = SAXStrings.indexOfWhitespace(this.m_xml, iB, iDE);
    if(iNE == -1) {
        iNE = iDE + 1;
    }
    else {
        this.m_iP = iNE;
        while(this.m_iP < iDE) {
            // DEBUG: Remove
            //if(this.m_iP == iLast) return this._setErr(XMLP.ERR_INFINITELOOP);
            //iLast = this.m_iP;
            // DEBUG: Remove End


            iRet = this._parseAttribute(this.m_iP, iDE);
            if(iRet == XMLP._ERROR) return iRet;
        }
    }

    strN = this.m_xml.substring(iB, iNE);

    ///if(strN.indexOf("<") != -1) {
    ///    return this._setErr(XMLP.ERR_ELM_LT_NAME);
    ///}s

    this.m_name = strN;
    this.m_iP = iE + 1;

    return iType;

}


XMLP.prototype._parseEntity = function(iB) {
    var iE = this.m_xml.indexOf(";", iB);
    if(iE == -1) {
        return this._setErr(XMLP.ERR_CLOSE_ENTITY);
    }

    this.m_iP = iE + 1;

    return this._replaceEntity(this.m_xml, iB, iE);

}


XMLP.prototype._parsePI = function(iB) {

    var iE, iTB, iTE, iCB, iCE;

    iE = this.m_xml.indexOf("?>", iB);
    if(iE   == -1) {
        return this._setErr(XMLP.ERR_CLOSE_PI);
    }

    iTB = SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iE);
    if(iTB == -1) {
        return this._setErr(XMLP.ERR_PI_TARGET);
    }

    iTE = SAXStrings.indexOfWhitespace(this.m_xml, iTB, iE);
    if(iTE  == -1) {
        iTE = iE;
    }

    iCB = SAXStrings.indexOfNonWhitespace(this.m_xml, iTE, iE);
    if(iCB == -1) {
        iCB = iE;
    }

    iCE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iCB, iE);
    if(iCE  == -1) {
        iCE = iE - 1;
    }

    this.m_name = this.m_xml.substring(iTB, iTE);
    this._setContent(XMLP._CONT_XML, iCB, iCE + 1);
    this.m_iP = iE + 2;

    return XMLP._PI;

}


XMLP.prototype._parseText = function(iB) {
    var iE, iEE;

    iE = this.m_xml.indexOf("<", iB);
    if(iE == -1) {
        iE = this.m_xml.length;
    }

    if(this.replaceEntities) {
        iEE = this.m_xml.indexOf("&", iB);
        if((iEE != -1) && (iEE <= iE)) {
            iE = iEE;
        }
    }

    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE;

    return XMLP._TEXT;

}


XMLP.prototype._replaceEntities = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) return "";
    iB = iB || 0;
    iE = iE || strD.length;


    var iEB, iEE, strRet = "";

    iEB = strD.indexOf("&", iB);
    iEE = iB;

    while((iEB > 0) && (iEB < iE)) {
        strRet += strD.substring(iEE, iEB);

        iEE = strD.indexOf(";", iEB) + 1;

        if((iEE == 0) || (iEE > iE)) {
            return this._setErr(XMLP.ERR_CLOSE_ENTITY);
        }

        iRet = this._replaceEntity(strD, iEB + 1, iEE - 1);
        if(iRet == XMLP._ERROR) {
            return iRet;
        }

        strRet += this.m_cAlt;

        iEB = strD.indexOf("&", iEE);
    }

    if(iEE != iE) {
        strRet += strD.substring(iEE, iE);
    }

    this._setContent(XMLP._CONT_ALT, strRet);

    return XMLP._ENTITY;

}


XMLP.prototype._replaceEntity = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) return -1;
    iB = iB || 0;
    iE = iE || strD.length;


    ent = strD.substring(iB, iE);
    strEnt = $w.$entityDefinitions[ent];
    if (!strEnt)  // special case for entity name==JS reserved keyword
        strEnt = $w.$entityDefinitions[ent+"XX"];
    if (!strEnt) {
        if(strD.charAt(iB) == "#")
            strEnt = String.fromCharCode(
                         parseInt(strD.substring(iB + 1, iE)))+'';
        else
            return this._setErr(XMLP.ERR_ENTITY_UNKNOWN);
    }

    this._setContent(XMLP._CONT_ALT, strEnt);
    return XMLP._ENTITY;
}


XMLP.prototype._setContent = function(iSrc) {
    var args = arguments;

    if(XMLP._CONT_XML == iSrc) {
        this.m_cAlt = null;
        this.m_cB = args[1];
        this.m_cE = args[2];
    } else {
        this.m_cAlt = args[1];
        this.m_cB = 0;
        this.m_cE = args[1].length;
    }
    this.m_cSrc = iSrc;

}


XMLP.prototype._setErr = function(iErr) {
    var strErr = XMLP._errs[iErr];

    this.m_cAlt = strErr;
    this.m_cB = 0;
    this.m_cE = strErr.length;
    this.m_cSrc = XMLP._CONT_ALT;

    return XMLP._ERROR;

}

/**
* function:   SAXDriver
* Author:   Scott Severtson
* Description:
*    SAXDriver is an object that basically wraps an XMLP instance, and provides an
*   event-based interface for parsing. This is the object users interact with when coding
*   with XML for <SCRIPT>
**/

var SAXDriver = function() {
    this.m_hndDoc = null;
    this.m_hndErr = null;
    this.m_hndLex = null;
}


// CONSTANTS
SAXDriver.DOC_B = 1;
SAXDriver.DOC_E = 2;
SAXDriver.ELM_B = 3;
SAXDriver.ELM_E = 4;
SAXDriver.CHARS = 5;
SAXDriver.PI    = 6;
SAXDriver.CD_B  = 7;
SAXDriver.CD_E  = 8;
SAXDriver.CMNT  = 9;
SAXDriver.DTD_B = 10;
SAXDriver.DTD_E = 11;



SAXDriver.prototype.parse = function(strD) {
    var parser = new XMLP(strD);

    if(this.m_hndDoc && this.m_hndDoc.setDocumentLocator) {
        this.m_hndDoc.setDocumentLocator(this);
    }

    this.m_parser = parser;
    this.m_bErr = false;

    if(!this.m_bErr) {
        this._fireEvent(SAXDriver.DOC_B);
    }
    this._parseLoop();
    if(!this.m_bErr) {
        this._fireEvent(SAXDriver.DOC_E);
    }

    this.m_xml = null;
    this.m_iP = 0;

}


SAXDriver.prototype.setDocumentHandler = function(hnd) {

    this.m_hndDoc = hnd;

}


SAXDriver.prototype.setErrorHandler = function(hnd) {

    this.m_hndErr = hnd;

}


SAXDriver.prototype.setLexicalHandler = function(hnd) {

    this.m_hndLex = hnd;

}


    
    /// LOCATOR/PARSE EXCEPTION INTERFACE
    

SAXDriver.prototype.getColumnNumber = function() {

    return this.m_parser.getColumnNumber();

}


SAXDriver.prototype.getLineNumber = function() {

    return this.m_parser.getLineNumber();

}


SAXDriver.prototype.getMessage = function() {

    return this.m_strErrMsg;

}


SAXDriver.prototype.getPublicId = function() {

    return null;

}


SAXDriver.prototype.getSystemId = function() {

    return null;

}



    /// Attribute List Interface
    
    
SAXDriver.prototype.getLength = function() {

    return this.m_parser.getAttributeCount();

}


SAXDriver.prototype.getName = function(index) {

    return this.m_parser.getAttributeName(index);

}


SAXDriver.prototype.getValue = function(index) {

    return this.m_parser.getAttributeValue(index);

}


SAXDriver.prototype.getValueByName = function(name) {

    return this.m_parser.getAttributeValueByName(name);

}


    ///    Private functions

SAXDriver.prototype._fireError = function(strMsg) {
    this.m_strErrMsg = strMsg;
    this.m_bErr = true;

    if(this.m_hndErr && this.m_hndErr.fatalError) {
        this.m_hndErr.fatalError(this);
    }

}   // end function _fireError


SAXDriver.prototype._fireEvent = function(iEvt) {
    var hnd, func, args = arguments, iLen = args.length - 1;

    if(this.m_bErr) return;

    if(SAXDriver.DOC_B == iEvt) {
        func = "startDocument";         hnd = this.m_hndDoc;
    }
    else if (SAXDriver.DOC_E == iEvt) {
        func = "endDocument";           hnd = this.m_hndDoc;
    }
    else if (SAXDriver.ELM_B == iEvt) {
        func = "startElement";          hnd = this.m_hndDoc;
    }
    else if (SAXDriver.ELM_E == iEvt) {
        func = "endElement";            hnd = this.m_hndDoc;
    }
    else if (SAXDriver.CHARS == iEvt) {
        func = "characters";            hnd = this.m_hndDoc;
    }
    else if (SAXDriver.PI    == iEvt) {
        func = "processingInstruction"; hnd = this.m_hndDoc;
    }
    else if (SAXDriver.CD_B  == iEvt) {
        func = "startCDATA";            hnd = this.m_hndLex;
    }
    else if (SAXDriver.CD_E  == iEvt) {
        func = "endCDATA";              hnd = this.m_hndLex;
    }
    else if (SAXDriver.CMNT  == iEvt) {
        func = "comment";               hnd = this.m_hndLex;
    }

    if(hnd && hnd[func]) {
        if(0 == iLen) {
            hnd[func]();
        }
        else if (1 == iLen) {
            hnd[func](args[1]);
        }
        else if (2 == iLen) {
            hnd[func](args[1], args[2]);
        }
        else if (3 == iLen) {
            hnd[func](args[1], args[2], args[3]);
        }
    }

}  // end function _fireEvent


SAXDriver.prototype._parseLoop = function(parser) {
    var iEvent, parser;

    parser = this.m_parser;
    while(!this.m_bErr) {
        iEvent = parser.next();

        if(iEvent == XMLP._ELM_B) {
            this._fireEvent(SAXDriver.ELM_B, parser.getName(), this);
        }
        else if(iEvent == XMLP._ELM_E) {
            this._fireEvent(SAXDriver.ELM_E, parser.getName());
        }
        else if(iEvent == XMLP._ELM_EMP) {
            this._fireEvent(SAXDriver.ELM_B, parser.getName(), this);
            this._fireEvent(SAXDriver.ELM_E, parser.getName());
        }
        else if(iEvent == XMLP._TEXT) {
            this._fireEvent(SAXDriver.CHARS, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
        }
        else if(iEvent == XMLP._ENTITY) {
            this._fireEvent(SAXDriver.CHARS, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
        }
        else if(iEvent == XMLP._PI) {
            this._fireEvent(SAXDriver.PI, parser.getName(), parser.getContent().substring(parser.getContentBegin(), parser.getContentEnd()));
        }
        else if(iEvent == XMLP._CDATA) {
            this._fireEvent(SAXDriver.CD_B);
            this._fireEvent(SAXDriver.CHARS, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
            this._fireEvent(SAXDriver.CD_E);
        }
        else if(iEvent == XMLP._COMMENT) {
            this._fireEvent(SAXDriver.CMNT, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
        }
        else if(iEvent == XMLP._DTD) {
        }
        else if(iEvent == XMLP._ERROR) {
            this._fireError(parser.getContent());
        }
        else if(iEvent == XMLP._NONE) {
            return;
        }
    }

}  // end function _parseLoop

///
///   function:   SAXStrings
///   Author:   Scott Severtson
///   Description: a useful object containing string manipulation functions
///

var _SAXStrings = function() {};


_SAXStrings.WHITESPACE = " \t\n\r";
_SAXStrings.NONWHITESPACE = /\S/;
_SAXStrings.QUOTES = "\"'";


_SAXStrings.prototype.getColumnNumber = function(strD, iP) {
    if((strD === null) || (strD.length === 0)) {
        return -1;
    }
    iP = iP || strD.length;

    var arrD = strD.substring(0, iP).split("\n");
    var strLine = arrD[arrD.length - 1];
    arrD.length--;
    var iLinePos = arrD.join("\n").length;

    return iP - iLinePos;

}  // end function getColumnNumber


_SAXStrings.prototype.getLineNumber = function(strD, iP) {
    if((strD === null) || (strD.length === 0)) {
        return -1;
    }
    iP = iP || strD.length;

    return strD.substring(0, iP).split("\n").length
}  // end function getLineNumber


_SAXStrings.prototype.indexOfNonWhitespace = function(strD, iB, iE) {
    if((strD === null) || (strD.length === 0)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;

    //var i = strD.substring(iB, iE).search(_SAXStrings.NONWHITESPACE);
    //return i < 0 ? i : iB + i;

    while( strD.charCodeAt(iB++) < 33 );
    return (iB > iE)?-1:iB-1;
    ///for(var i = iB; i < iE; i++){
    ///    if(_SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) == -1) {
    ///        return i;
    ///    }
    ///}
    ///return -1;

}  // end function indexOfNonWhitespace


_SAXStrings.prototype.indexOfWhitespace = function(strD, iB, iE) {
    if((strD === null) || (strD.length === 0)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;


    while( strD.charCodeAt(iB++) >= 33 );
    return (iB > iE)?-1:iB-1;

    ///for(var i = iB; i < iE; i++) {
    ///    if(_SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) != -1) {
    ///        return i;
    ///    }
    ///}
    ///return -1;
}  // end function indexOfWhitespace


_SAXStrings.prototype.isEmpty = function(strD) {

    return (strD == null) || (strD.length == 0);

}


_SAXStrings.prototype.lastIndexOfNonWhitespace = function(strD, iB, iE) {
    if((strD === null) || (strD.length === 0)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;

    while( (iE >= iB) && strD.charCodeAt(--iE) < 33 );
    return (iE < iB)?-1:iE;

    ///for(var i = iE - 1; i >= iB; i--){
    ///    if(_SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) == -1){
    ///         return i;
    ///    }
    ///}
    ///return -1;
}


_SAXStrings.prototype.replace = function(strD, iB, iE, strF, strR) {
    if((strD == null) || (strD.length == 0)) {
        return "";
    }
    iB = iB || 0;
    iE = iE || strD.length;

    return strD.substring(iB, iE).split(strF).join(strR);

};

var SAXStrings = new _SAXStrings();



/***************************************************************************************************************
Stack: A simple stack class, used for verifying document structure.

    Author:   Scott Severtson
*****************************************************************************************************************/
var Stack = function() {
    this.m_arr = new Array();
};
__extend__(Stack.prototype, {
    clear : function() {
        this.m_arr = new Array();
    },
    count : function() {
        return this.m_arr.length;
    },
    destroy : function() {
        this.m_arr = null;
    },
    peek : function() {
        if(this.m_arr.length == 0) {
            return null;
        }
        return this.m_arr[this.m_arr.length - 1];
    },
    pop : function() {
        if(this.m_arr.length == 0) {
            return null;
        }
        var o = this.m_arr[this.m_arr.length - 1];
        this.m_arr.length--;
        return o;
    },
    push : function(o) {
        this.m_arr[this.m_arr.length] = o;
    }
});


///
/// function: isEmpty
/// Author: mike@idle.org
/// Description:  convenience function to identify an empty string
///
function isEmpty(str) {
    return (str==null) || (str.length==0);
};

/**
 * function __escapeXML__
 * author: David Joham djoham@yahoo.com
 * @param  str : string - The string to be escaped
 * @return : string - The escaped string
 */
var escAmpRegEx = /&(?!(amp;|lt;|gt;|quot|apos;))/g;
var escLtRegEx = /</g;
var escGtRegEx = />/g;
var quotRegEx = /"/g;
var aposRegEx = /'/g;
function __escapeXML__(str) {
    str = str.replace(escAmpRegEx, "&amp;").
            replace(escLtRegEx, "&lt;").
            replace(escGtRegEx, "&gt;").
            replace(quotRegEx, "&quot;").
            replace(aposRegEx, "&apos;");

    return str;
};
function __escapeHTML5__(str) {
    str = str.replace(escAmpRegEx, "&amp;").
            replace(escLtRegEx, "&lt;").
            replace(escGtRegEx, "&gt;");

    return str;
};
function __escapeHTML5Atribute__(str) {
    str = str.replace(escAmpRegEx, "&amp;").
            replace(escLtRegEx, "&lt;").
            replace(escGtRegEx, "&gt;").
            replace(quotRegEx, "&quot;").
            replace(aposRegEx, "&apos;");

    return str;
};
/**
 * function __unescapeXML__
 * author: David Joham djoham@yahoo.com
 * @param  str : string - The string to be unescaped
 * @return : string - The unescaped string
 */
var unescAmpRegEx = /&amp;/g;
var unescLtRegEx = /&lt;/g;
var unescGtRegEx = /&gt;/g;
var unquotRegEx = /&quot;/g;
var unaposRegEx = /&apos;/g;
function __unescapeXML__(str) {
    str = str.replace(unescAmpRegEx, "&").
            replace(unescLtRegEx, "<").
            replace(unescGtRegEx, ">").
            replace(unquotRegEx, "\"").
            replace(unaposRegEx, "'");

    return str;
};

/**
 * @author Glen Ivey (gleneivey@wontology.org)
 */

$debug("Instantiating list of HTML4 standard entities");
/*
 * $w.$entityDefinitions
 */

var $entityDefinitions = {
        // content taken from W3C "HTML 4.01 Specification"
        //                        "W3C Recommendation 24 December 1999"

    nbsp: "\u00A0",
    iexcl: "\u00A1",
    cent: "\u00A2",
    pound: "\u00A3",
    curren: "\u00A4",
    yen: "\u00A5",
    brvbar: "\u00A6",
    sect: "\u00A7",
    uml: "\u00A8",
    copy: "\u00A9",
    ordf: "\u00AA",
    laquo: "\u00AB",
    not: "\u00AC",
    shy: "\u00AD",
    reg: "\u00AE",
    macr: "\u00AF",
    deg: "\u00B0",
    plusmn: "\u00B1",
    sup2: "\u00B2",
    sup3: "\u00B3",
    acute: "\u00B4",
    micro: "\u00B5",
    para: "\u00B6",
    middot: "\u00B7",
    cedil: "\u00B8",
    sup1: "\u00B9",
    ordm: "\u00BA",
    raquo: "\u00BB",
    frac14: "\u00BC",
    frac12: "\u00BD",
    frac34: "\u00BE",
    iquest: "\u00BF",
    Agrave: "\u00C0",
    Aacute: "\u00C1",
    Acirc: "\u00C2",
    Atilde: "\u00C3",
    Auml: "\u00C4",
    Aring: "\u00C5",
    AElig: "\u00C6",
    Ccedil: "\u00C7",
    Egrave: "\u00C8",
    Eacute: "\u00C9",
    Ecirc: "\u00CA",
    Euml: "\u00CB",
    Igrave: "\u00CC",
    Iacute: "\u00CD",
    Icirc: "\u00CE",
    Iuml: "\u00CF",
    ETH: "\u00D0",
    Ntilde: "\u00D1",
    Ograve: "\u00D2",
    Oacute: "\u00D3",
    Ocirc: "\u00D4",
    Otilde: "\u00D5",
    Ouml: "\u00D6",
    times: "\u00D7",
    Oslash: "\u00D8",
    Ugrave: "\u00D9",
    Uacute: "\u00DA",
    Ucirc: "\u00DB",
    Uuml: "\u00DC",
    Yacute: "\u00DD",
    THORN: "\u00DE",
    szlig: "\u00DF",
    agrave: "\u00E0",
    aacute: "\u00E1",
    acirc: "\u00E2",
    atilde: "\u00E3",
    auml: "\u00E4",
    aring: "\u00E5",
    aelig: "\u00E6",
    ccedil: "\u00E7",
    egrave: "\u00E8",
    eacute: "\u00E9",
    ecirc: "\u00EA",
    euml: "\u00EB",
    igrave: "\u00EC",
    iacute: "\u00ED",
    icirc: "\u00EE",
    iuml: "\u00EF",
    eth: "\u00F0",
    ntilde: "\u00F1",
    ograve: "\u00F2",
    oacute: "\u00F3",
    ocirc: "\u00F4",
    otilde: "\u00F5",
    ouml: "\u00F6",
    divide: "\u00F7",
    oslash: "\u00F8",
    ugrave: "\u00F9",
    uacute: "\u00FA",
    ucirc: "\u00FB",
    uuml: "\u00FC",
    yacute: "\u00FD",
    thorn: "\u00FE",
    yuml: "\u00FF",
    fnof: "\u0192",
    Alpha: "\u0391",
    Beta: "\u0392",
    Gamma: "\u0393",
    Delta: "\u0394",
    Epsilon: "\u0395",
    Zeta: "\u0396",
    Eta: "\u0397",
    Theta: "\u0398",
    Iota: "\u0399",
    Kappa: "\u039A",
    Lambda: "\u039B",
    Mu: "\u039C",
    Nu: "\u039D",
    Xi: "\u039E",
    Omicron: "\u039F",
    Pi: "\u03A0",
    Rho: "\u03A1",
    Sigma: "\u03A3",
    Tau: "\u03A4",
    Upsilon: "\u03A5",
    Phi: "\u03A6",
    Chi: "\u03A7",
    Psi: "\u03A8",
    Omega: "\u03A9",
    alpha: "\u03B1",
    beta: "\u03B2",
    gamma: "\u03B3",
    delta: "\u03B4",
    epsilon: "\u03B5",
    zeta: "\u03B6",
    eta: "\u03B7",
    theta: "\u03B8",
    iota: "\u03B9",
    kappa: "\u03BA",
    lambda: "\u03BB",
    mu: "\u03BC",
    nu: "\u03BD",
    xi: "\u03BE",
    omicron: "\u03BF",
    pi: "\u03C0",
    rho: "\u03C1",
    sigmaf: "\u03C2",
    sigma: "\u03C3",
    tau: "\u03C4",
    upsilon: "\u03C5",
    phi: "\u03C6",
    chi: "\u03C7",
    psi: "\u03C8",
    omega: "\u03C9",
    thetasym: "\u03D1",
    upsih: "\u03D2",
    piv: "\u03D6",
    bull: "\u2022",
    hellip: "\u2026",
    prime: "\u2032",
    Prime: "\u2033",
    oline: "\u203E",
    frasl: "\u2044",
    weierp: "\u2118",
    image: "\u2111",
    real: "\u211C",
    trade: "\u2122",
    alefsym: "\u2135",
    larr: "\u2190",
    uarr: "\u2191",
    rarr: "\u2192",
    darr: "\u2193",
    harr: "\u2194",
    crarr: "\u21B5",
    lArr: "\u21D0",
    uArr: "\u21D1",
    rArr: "\u21D2",
    dArr: "\u21D3",
    hArr: "\u21D4",
    forall: "\u2200",
    part: "\u2202",
    exist: "\u2203",
    empty: "\u2205",
    nabla: "\u2207",
    isin: "\u2208",
    notin: "\u2209",
    ni: "\u220B",
    prod: "\u220F",
    sum: "\u2211",
    minus: "\u2212",
    lowast: "\u2217",
    radic: "\u221A",
    prop: "\u221D",
    infin: "\u221E",
    ang: "\u2220",
    and: "\u2227",
    or: "\u2228",
    cap: "\u2229",
    cup: "\u222A",
    intXX: "\u222B",
    there4: "\u2234",
    sim: "\u223C",
    cong: "\u2245",
    asymp: "\u2248",
    ne: "\u2260",
    equiv: "\u2261",
    le: "\u2264",
    ge: "\u2265",
    sub: "\u2282",
    sup: "\u2283",
    nsub: "\u2284",
    sube: "\u2286",
    supe: "\u2287",
    oplus: "\u2295",
    otimes: "\u2297",
    perp: "\u22A5",
    sdot: "\u22C5",
    lceil: "\u2308",
    rceil: "\u2309",
    lfloor: "\u230A",
    rfloor: "\u230B",
    lang: "\u2329",
    rang: "\u232A",
    loz: "\u25CA",
    spades: "\u2660",
    clubs: "\u2663",
    hearts: "\u2665",
    diams: "\u2666",
    quot: "\u0022",
    amp: "\u0026",
    lt: "\u003C",
    gt: "\u003E",
    OElig: "\u0152",
    oelig: "\u0153",
    Scaron: "\u0160",
    scaron: "\u0161",
    Yuml: "\u0178",
    circ: "\u02C6",
    tilde: "\u02DC",
    ensp: "\u2002",
    emsp: "\u2003",
    thinsp: "\u2009",
    zwnj: "\u200C",
    zwj: "\u200D",
    lrm: "\u200E",
    rlm: "\u200F",
    ndash: "\u2013",
    mdash: "\u2014",
    lsquo: "\u2018",
    rsquo: "\u2019",
    sbquo: "\u201A",
    ldquo: "\u201C",
    rdquo: "\u201D",
    bdquo: "\u201E",
    dagger: "\u2020",
    Dagger: "\u2021",
    permil: "\u2030",
    lsaquo: "\u2039",
    rsaquo: "\u203A",
    euro: "\u20AC",

    // non-standard entities
    apos: "'"
};


$w.$entityDefinitions = $entityDefinitions;

//DOMImplementation
$debug("Defining DOMImplementation");
/**
 * @class  DOMImplementation - provides a number of methods for performing operations
 *   that are independent of any particular instance of the document object model.
 *
 * @author Jon van Noort (jon@webarcana.com.au)
 */
var DOMImplementation = function() {
    this.preserveWhiteSpace = false;  // by default, ignore whitespace
    this.namespaceAware = true;       // by default, handle namespaces
    this.errorChecking  = true;       // by default, test for exceptions
};

__extend__(DOMImplementation.prototype,{
    // @param  feature : string - The package name of the feature to test.
    //      the legal only values are "XML" and "CORE" (case-insensitive).
    // @param  version : string - This is the version number of the package
    //       name to test. In Level 1, this is the string "1.0".*
    // @return : boolean
    hasFeature : function(feature, version) {
        var ret = false;
        if (feature.toLowerCase() == "xml") {
            ret = (!version || (version == "1.0") || (version == "2.0"));
        }
        else if (feature.toLowerCase() == "core") {
            ret = (!version || (version == "2.0"));
        }
        else if (feature == "http://www.w3.org/TR/SVG11/feature#BasicStructure") {
            ret = (version == "1.1");
        }
        return ret;
    },
    createDocumentType : function(qname, publicid, systemid){
        return new DOMDocumentType();
    },
    createDocument : function(nsuri, qname, doctype){
        //TODO - this currently returns an empty doc
        //but needs to handle the args
        return new Document($implementation, null);
    },
    createHTMLDocument : function(title){
        var doc = new HTMLDocument($implementation, null, "");
        var html = doc.createElement("html"); doc.appendChild(html);
        var head = doc.createElement("head"); html.appendChild(head);
        var body = doc.createElement("body"); html.appendChild(body);
        var t = doc.createElement("title"); head.appendChild(t);
        if( title) {
            t.appendChild(doc.createTextNode(title));
        }
        return doc;
    },
    translateErrCode : function(code) {
        //convert DOMException Code to human readable error message;
      var msg = "";

      switch (code) {
        case DOMException.INDEX_SIZE_ERR :                // 1
           msg = "INDEX_SIZE_ERR: Index out of bounds";
           break;

        case DOMException.DOMSTRING_SIZE_ERR :            // 2
           msg = "DOMSTRING_SIZE_ERR: The resulting string is too long to fit in a DOMString";
           break;

        case DOMException.HIERARCHY_REQUEST_ERR :         // 3
           msg = "HIERARCHY_REQUEST_ERR: The Node can not be inserted at this location";
           break;

        case DOMException.WRONG_DOCUMENT_ERR :            // 4
           msg = "WRONG_DOCUMENT_ERR: The source and the destination Documents are not the same";
           break;

        case DOMException.INVALID_CHARACTER_ERR :         // 5
           msg = "INVALID_CHARACTER_ERR: The string contains an invalid character";
           break;

        case DOMException.NO_DATA_ALLOWED_ERR :           // 6
           msg = "NO_DATA_ALLOWED_ERR: This Node / NodeList does not support data";
           break;

        case DOMException.NO_MODIFICATION_ALLOWED_ERR :   // 7
           msg = "NO_MODIFICATION_ALLOWED_ERR: This object cannot be modified";
           break;

        case DOMException.NOT_FOUND_ERR :                 // 8
           msg = "NOT_FOUND_ERR: The item cannot be found";
           break;

        case DOMException.NOT_SUPPORTED_ERR :             // 9
           msg = "NOT_SUPPORTED_ERR: This implementation does not support function";
           break;

        case DOMException.INUSE_ATTRIBUTE_ERR :           // 10
           msg = "INUSE_ATTRIBUTE_ERR: The Attribute has already been assigned to another Element";
           break;

        // Introduced in DOM Level 2:
        case DOMException.INVALID_STATE_ERR :             // 11
           msg = "INVALID_STATE_ERR: The object is no longer usable";
           break;

        case DOMException.SYNTAX_ERR :                    // 12
           msg = "SYNTAX_ERR: Syntax error";
           break;

        case DOMException.INVALID_MODIFICATION_ERR :      // 13
           msg = "INVALID_MODIFICATION_ERR: Cannot change the type of the object";
           break;

        case DOMException.NAMESPACE_ERR :                 // 14
           msg = "NAMESPACE_ERR: The namespace declaration is incorrect";
           break;

        case DOMException.INVALID_ACCESS_ERR :            // 15
           msg = "INVALID_ACCESS_ERR: The object does not support this function";
           break;

        default :
           msg = "UNKNOWN: Unknown Exception Code ("+ code +")";
      }

      return msg;
    }
});


/**
* Defined 'globally' to this scope.  Remember everything is wrapped in a closure so this doesnt show up
* in the outer most global scope.
*/

/**
 *  process SAX events
 *
 * @author Jon van Noort (jon@webarcana.com.au), David Joham (djoham@yahoo.com) and Scott Severtson
 *
 * @param  impl : DOMImplementation
 * @param  doc : DOMDocument - the Document to contain the parsed XML string
 * @param  p   : XMLP        - the SAX Parser
 *
 * @return : DOMDocument
 */

function __parseLoop__(impl, doc, p, isWindowDocument) {
    var iEvt, iNode, iAttr, strName;
    var iNodeParent = doc;

    var el_close_count = 0;

    var entitiesList = new Array();
    var textNodesList = new Array();

    // if namespaceAware, add default namespace
    if (impl.namespaceAware) {
        var iNS = doc.createNamespace(""); // add the default-default namespace
        iNS.value = "http://www.w3.org/2000/xmlns/";
        doc._namespaces.setNamedItem(iNS);
    }

  // loop until SAX parser stops emitting events
  var q = 0;
  while(true) {
    // get next event
    iEvt = p.next();
    
    if (iEvt == XMLP._ELM_B) {                      // Begin-Element Event
      var pName = p.getName();                      // get the Element name
      pName = trim(pName, true, true);              // strip spaces from Element name
      if(pName.toLowerCase() == 'script')
        p.replaceEntities = false;

      if (!impl.namespaceAware) {
        iNode = doc.createElement(p.getName());     // create the Element
        // add attributes to Element
        for(var i = 0; i < p.getAttributeCount(); i++) {
          strName = p.getAttributeName(i);          // get Attribute name
          iAttr = iNode.getAttributeNode(strName);  // if Attribute exists, use it

          if(!iAttr) {
            iAttr = doc.createAttribute(strName);   // otherwise create it
          }

          iAttr.value = p.getAttributeValue(i);   // set Attribute value
          iNode.setAttributeNode(iAttr);            // attach Attribute to Element
        }
      }
      else {  // Namespace Aware
        // create element (with empty namespaceURI,
        //  resolve after namespace 'attributes' have been parsed)
        iNode = doc.createElementNS("", p.getName());

        // duplicate ParentNode's Namespace definitions
        iNode._namespaces = __cloneNamedNodes__(iNodeParent._namespaces, iNode, true);

        // add attributes to Element
        for(var i = 0; i < p.getAttributeCount(); i++) {
          strName = p.getAttributeName(i);          // get Attribute name

          // if attribute is a namespace declaration
          if (__isNamespaceDeclaration__(strName)) {
            // parse Namespace Declaration
            var namespaceDec = __parseNSName__(strName);

            if (strName != "xmlns") {
              iNS = doc.createNamespace(strName);   // define namespace
            }
            else {
              iNS = doc.createNamespace("");        // redefine default namespace
            }
            iNS.value = p.getAttributeValue(i);   // set value = namespaceURI

            iNode._namespaces.setNamedItem(iNS);    // attach namespace to namespace collection
          }
          else {  // otherwise, it is a normal attribute
            iAttr = iNode.getAttributeNode(strName);        // if Attribute exists, use it

            if(!iAttr) {
              iAttr = doc.createAttributeNS("", strName);   // otherwise create it
            }

            iAttr.value = p.getAttributeValue(i);         // set Attribute value
            iNode.setAttributeNodeNS(iAttr);                // attach Attribute to Element

            if (__isIdDeclaration__(strName)) {
              iNode.id = p.getAttributeValue(i);    // cache ID for getElementById()
            }
          }
        }

        // resolve namespaceURIs for this Element
        if (iNode._namespaces.getNamedItem(iNode.prefix)) {
          iNode.namespaceURI = iNode._namespaces.getNamedItem(iNode.prefix).value;
        } else {
          iNode.namespaceURI = iNodeParent.namespaceURI;
        }

        //  for this Element's attributes
        for (var i = 0; i < iNode.attributes.length; i++) {
          if (iNode.attributes.item(i).prefix != "") {  // attributes do not have a default namespace
            if (iNode._namespaces.getNamedItem(iNode.attributes.item(i).prefix)) {
              iNode.attributes.item(i).namespaceURI = iNode._namespaces.getNamedItem(iNode.attributes.item(i).prefix).value;
            }
          }
        }

        // We didn't know the NS of the node when we created it, which means we created a default DOM object.
        // Now that we know the NS, if there is one, we clone this node so that it'll get created under
        // with the right constructor. This makes things like SVG work. Might be nice not to create twice as
        // as many nodes, but that's painfully given the complexity of namespaces.  
        if(iNode.namespaceURI != ""){
            iNode = iNode.cloneNode();
        }
      }

      // if this is the Root Element
      if (iNodeParent.nodeType == DOMNode.DOCUMENT_NODE) {
        iNodeParent._documentElement = iNode;        // register this Element as the Document.documentElement
      }

      iNodeParent.appendChild(iNode);               // attach Element to parentNode
      iNodeParent = iNode;                          // descend one level of the DOM Tree
    }

    else if(iEvt == XMLP._ELM_E) {                  // End-Element Event        
        iNodeParent = iNodeParent.parentNode;         // ascend one level of the DOM Tree
    }

    else if(iEvt == XMLP._ELM_EMP) {                // Empty Element Event
      pName = p.getName();                          // get the Element name
      pName = trim(pName, true, true);              // strip spaces from Element name

      if (!impl.namespaceAware) {
        iNode = doc.createElement(pName);           // create the Element

        // add attributes to Element
        for(var i = 0; i < p.getAttributeCount(); i++) {
          strName = p.getAttributeName(i);          // get Attribute name
          iAttr = iNode.getAttributeNode(strName);  // if Attribute exists, use it

          if(!iAttr) {
            iAttr = doc.createAttribute(strName);   // otherwise create it
          }

          iAttr.value = p.getAttributeValue(i);   // set Attribute value
          iNode.setAttributeNode(iAttr);            // attach Attribute to Element
        }
      }
      else {  // Namespace Aware
        // create element (with empty namespaceURI,
        //  resolve after namespace 'attributes' have been parsed)
        iNode = doc.createElementNS("", p.getName());

        // duplicate ParentNode's Namespace definitions
        iNode._namespaces = __cloneNamedNodes__(iNodeParent._namespaces, iNode);

        // add attributes to Element
        for(var i = 0; i < p.getAttributeCount(); i++) {
          strName = p.getAttributeName(i);          // get Attribute name

          // if attribute is a namespace declaration
          if (__isNamespaceDeclaration__(strName)) {
            // parse Namespace Declaration
            var namespaceDec = __parseNSName__(strName);

            if (strName != "xmlns") {
              iNS = doc.createNamespace(strName);   // define namespace
            }
            else {
              iNS = doc.createNamespace("");        // redefine default namespace
            }
            iNS.value = p.getAttributeValue(i);   // set value = namespaceURI

            iNode._namespaces.setNamedItem(iNS);    // attach namespace to namespace collection
          }
          else {  // otherwise, it is a normal attribute
            iAttr = iNode.getAttributeNode(strName);        // if Attribute exists, use it

            if(!iAttr) {
              iAttr = doc.createAttributeNS("", strName);   // otherwise create it
            }

            iAttr.value = p.getAttributeValue(i);         // set Attribute value
            iNode.setAttributeNodeNS(iAttr);                // attach Attribute to Element

            if (__isIdDeclaration__(strName)) {
              iNode.id = p.getAttributeValue(i);    // cache ID for getElementById()
            }
          }
        }

        // resolve namespaceURIs for this Element
        if (iNode._namespaces.getNamedItem(iNode.prefix)) {
          iNode.namespaceURI = iNode._namespaces.getNamedItem(iNode.prefix).value;
        }

        //  for this Element's attributes
        for (var i = 0; i < iNode.attributes.length; i++) {
          if (iNode.attributes.item(i).prefix != "") {  // attributes do not have a default namespace
            if (iNode._namespaces.getNamedItem(iNode.attributes.item(i).prefix)) {
              iNode.attributes.item(i).namespaceURI = iNode._namespaces.getNamedItem(iNode.attributes.item(i).prefix).value;
            }
          }
        }
      }

      // if this is the Root Element
      if (iNodeParent.nodeType == DOMNode.DOCUMENT_NODE) {
        iNodeParent._documentElement = iNode;        // register this Element as the Document.documentElement
      }

      iNodeParent.appendChild(iNode);               // attach Element to parentNode
    }
    else if(iEvt == XMLP._TEXT || iEvt == XMLP._ENTITY) {                   // TextNode and entity Events
      // get Text content
      var pContent = p.getContent().substring(p.getContentBegin(), p.getContentEnd());

      if (!impl.preserveWhiteSpace ) {
        if (trim(pContent, true, true) == "") {
            pContent = ""; //this will cause us not to create the text node below
        }
      }

      if (pContent.length > 0) {                    // ignore empty TextNodes
        var textNode = doc.createTextNode(pContent);
        iNodeParent.appendChild(textNode); // attach TextNode to parentNode

        //the sax parser breaks up text nodes when it finds an entity. For
        //example hello&lt;there will fire a text, an entity and another text
        //this sucks for the dom parser because it looks to us in this logic
        //as three text nodes. I fix this by keeping track of the entity nodes
        //and when we're done parsing, calling normalize on their parent to
        //turn the multiple text nodes into one, which is what DOM users expect
        //the code to do this is at the bottom of this function
        if (iEvt == XMLP._ENTITY) {
            entitiesList[entitiesList.length] = textNode;
        }
        else {
            //I can't properly decide how to handle preserve whitespace
            //until the siblings of the text node are built due to
            //the entitiy handling described above. I don't know that this
            //will be all of the text node or not, so trimming is not appropriate
            //at this time. Keep a list of all the text nodes for now
            //and we'll process the preserve whitespace stuff at a later time.
            textNodesList[textNodesList.length] = textNode;
        }
      }
    }
    else if(iEvt == XMLP._PI) {                     // ProcessingInstruction Event
      // attach ProcessingInstruction to parentNode
      iNodeParent.appendChild(doc.createProcessingInstruction(p.getName(), p.getContent().substring(p.getContentBegin(), p.getContentEnd())));
    }
    else if(iEvt == XMLP._CDATA) {                  // CDATA Event
      // get CDATA data
      pContent = p.getContent().substring(p.getContentBegin(), p.getContentEnd());

      if (!impl.preserveWhiteSpace) {
        pContent = trim(pContent, true, true);      // trim whitespace
        pContent.replace(/ +/g, ' ');               // collapse multiple spaces to 1 space
      }

      if (pContent.length > 0) {                    // ignore empty CDATANodes
        iNodeParent.appendChild(doc.createCDATASection(pContent)); // attach CDATA to parentNode
      }
    }
    else if(iEvt == XMLP._COMMENT) {                // Comment Event
      // get COMMENT data
      var pContent = p.getContent().substring(p.getContentBegin(), p.getContentEnd());

      if (!impl.preserveWhiteSpace) {
        pContent = trim(pContent, true, true);      // trim whitespace
        pContent.replace(/ +/g, ' ');               // collapse multiple spaces to 1 space
      }

      if (pContent.length > 0) {                    // ignore empty CommentNodes
        iNodeParent.appendChild(doc.createComment(pContent));  // attach Comment to parentNode
      }
    }
    else if(iEvt == XMLP._DTD) {                    // ignore DTD events
    }
    else if(iEvt == XMLP._ERROR) {
        $error("Fatal Error: " + p.getContent() +
                "\nLine: " + p.getLineNumber() +
                "\nColumn: " + p.getColumnNumber() + "\n");
        throw(new DOMException(DOMException.SYNTAX_ERR));
    }
    else if(iEvt == XMLP._NONE) {                   // no more events
      //steven woods notes that unclosed tags are rejected elsewhere and this check
	  //breaks a table patching routine
	  //if (iNodeParent == doc) {                     // confirm that we have recursed back up to root
      //  break;
      //}
      //else {
      //  throw(new DOMException(DOMException.SYNTAX_ERR));  // one or more Tags were not closed properly
      //}
        break;

    }
  }

  //normalize any entities in the DOM to a single textNode
  for (var i = 0; i < entitiesList.length; i++) {
      var entity = entitiesList[i];
      //its possible (if for example two entities were in the
      //same domnode, that the normalize on the first entitiy
      //will remove the parent for the second. Only do normalize
      //if I can find a parent node
      var parentNode = entity.parentNode;
      if (parentNode) {
          parentNode.normalize();

          //now do whitespace (if necessary)
          //it was not done for text nodes that have entities
          if(!impl.preserveWhiteSpace) {
                var children = parentNode.childNodes;
                for ( var j = 0; j < children.length; j++) {
                    var child = children.item(j);
                    if (child.nodeType == DOMNode.TEXT_NODE) {
                        var childData = child.data;
                        childData.replace(/\s/g, ' ');
                        child.data = childData;
                    }
                }
          }
      }
  }

  //do the preserve whitespace processing on the rest of the text nodes
  //It's possible (due to the processing above) that the node will have been
  //removed from the tree. Only do whitespace checking if parentNode is not null.
  //This may duplicate the whitespace processing for some nodes that had entities in them
  //but there's no way around that
  if (!impl.preserveWhiteSpace) {
    for (var i = 0; i < textNodesList.length; i++) {
        var node = textNodesList[i];
        if (node.parentNode != null) {
            var nodeData = node.data;
            nodeData.replace(/\s/g, ' ');
            node.data = nodeData;
        }
    }

  }
};


/**
 * @method DOMImplementation._isNamespaceDeclaration - Return true, if attributeName is a namespace declaration
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  attributeName : string - the attribute name
 * @return : boolean
 */
function __isNamespaceDeclaration__(attributeName) {
  // test if attributeName is 'xmlns'
  return (attributeName.indexOf('xmlns') > -1);
};

/**
 * @method DOMImplementation._isIdDeclaration - Return true, if attributeName is an id declaration
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  attributeName : string - the attribute name
 * @return : boolean
 */
function __isIdDeclaration__(attributeName) {
  // test if attributeName is 'id' (case insensitive)
  return attributeName?(attributeName.toLowerCase() == 'id'):false;
};

/**
 * @method DOMImplementation._isValidName - Return true,
 *   if name contains no invalid characters
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  name : string - the candidate name
 * @return : boolean
 */
function __isValidName__(name) {
  // test if name contains only valid characters
  return name.match(re_validName);
};
var re_validName = /^[a-zA-Z_:][a-zA-Z0-9\.\-_:]*$/;

/**
 * @method DOMImplementation._isValidString - Return true, if string does not contain any illegal chars
 *  All of the characters 0 through 31 and character 127 are nonprinting control characters.
 *  With the exception of characters 09, 10, and 13, (Ox09, Ox0A, and Ox0D)
 *  Note: different from _isValidName in that ValidStrings may contain spaces
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  name : string - the candidate string
 * @return : boolean
 */
function __isValidString__(name) {
  // test that string does not contains invalid characters
  return (name.search(re_invalidStringChars) < 0);
};
var re_invalidStringChars = /\x01|\x02|\x03|\x04|\x05|\x06|\x07|\x08|\x0B|\x0C|\x0E|\x0F|\x10|\x11|\x12|\x13|\x14|\x15|\x16|\x17|\x18|\x19|\x1A|\x1B|\x1C|\x1D|\x1E|\x1F|\x7F/;

/**
 * @method DOMImplementation._parseNSName - parse the namespace name.
 *  if there is no colon, the
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  qualifiedName : string - The qualified name
 * @return : NSName - [
         .prefix        : string - The prefix part of the qname
         .namespaceName : string - The namespaceURI part of the qname
    ]
 */
function __parseNSName__(qualifiedName) {
  var resultNSName = new Object();

  resultNSName.prefix          = qualifiedName;  // unless the qname has a namespaceName, the prefix is the entire String
  resultNSName.namespaceName   = "";

  // split on ':'
  var delimPos = qualifiedName.indexOf(':');
  if (delimPos > -1) {
    // get prefix
    resultNSName.prefix        = qualifiedName.substring(0, delimPos);
    // get namespaceName
    resultNSName.namespaceName = qualifiedName.substring(delimPos +1, qualifiedName.length);
  }
  return resultNSName;
};

/**
 * @method DOMImplementation._parseQName - parse the qualified name
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  qualifiedName : string - The qualified name
 * @return : QName
 */
function __parseQName__(qualifiedName) {
  var resultQName = new Object();

  resultQName.localName = qualifiedName;  // unless the qname has a prefix, the local name is the entire String
  resultQName.prefix    = "";

  // split on ':'
  var delimPos = qualifiedName.indexOf(':');

  if (delimPos > -1) {
    // get prefix
    resultQName.prefix    = qualifiedName.substring(0, delimPos);

    // get localName
    resultQName.localName = qualifiedName.substring(delimPos +1, qualifiedName.length);
  }

  return resultQName;
};

$debug("Initializing document.implementation");
var $implementation =  new DOMImplementation();
// $implementation.namespaceAware = false;
$implementation.errorChecking = false;
    
// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining Document");
/**
 * @class  DOMDocument - The Document interface represents the entire HTML 
 *      or XML document. Conceptually, it is the root of the document tree, 
 *      and provides the primary access to the document's data.
 *
 * @extends DOMNode
 * @author Jon van Noort (jon@webarcana.com.au)
 * @param  implementation : DOMImplementation - the creator Implementation
 */
var DOMDocument = function(implementation, docParentWindow) {
    //$log("\tcreating dom document");
    this.DOMNode = DOMNode;
    this.DOMNode(this);
    
    this.doctype = null;                  // The Document Type Declaration (see DocumentType) associated with this document
    this.implementation = implementation; // The DOMImplementation object that handles this document.
    
    // "private" variable providing the read-only document.parentWindow property
    this._parentWindow = docParentWindow;
    try {
        if (docParentWindow.$thisWindowsProxyObject)
            this._parentWindow = docParentWindow.$thisWindowsProxyObject;
    } catch(e){}

    this.nodeName  = "#document";
    this._id = 0;
    this._lastId = 0;
    this._parseComplete = false;                   // initially false, set to true by parser
    this._url = "";
    
    this.ownerDocument = null;
    
    this._performingImportNodeOperation = false;
};
DOMDocument.prototype = new DOMNode;
__extend__(DOMDocument.prototype, {	

    addEventListener        : function(type, fn){ __addEventListener__(this, type, fn); },
	removeEventListener     : function(type){ __removeEventListener__(this, type); },
	attachEvent             : function(type, fn){ __addEventListener__(this, type, fn); },
	detachEvent             : function(type){ __removeEventListener__(this, type); },
	dispatchEvent           : function(event, bubbles){ __dispatchEvent__(this, event, bubbles); },

    toString : function(){
        return '[object DOMDocument]';
    },
    addEventListener        : function(){ $w.addEventListener.apply(this, arguments); },
	removeEventListener     : function(){ $w.removeEventListener.apply(this, arguments); },
	attachEvent             : function(){ $w.addEventListener.apply(this, arguments); },
	detachEvent             : function(){ $w.removeEventListener.apply(this, arguments); },
	dispatchEvent           : function(){ $w.dispatchEvent.apply(this, arguments); },

    get styleSheets(){ 
        return [];/*TODO*/ 
    },
    get all(){
        return this.getElementsByTagName("*");
    },
    get documentElement(){
        var i, length = this.childNodes?this.childNodes.length:0;
        for(i=0;i<length;i++){
           if(this.childNodes[i].nodeType == DOMNode.ELEMENT_NODE){
                return this.childNodes[i];
            }
        }
        return null;
    },
    get parentWindow(){
        return this._parentWindow;
    },
    loadXML : function(xmlString) {
        // create SAX Parser
        var parser = new XMLP(xmlString+'');
        
        // create DOM Document
        if(this === $document){
            $debug("Setting internal window.document");
            $document = this;
        }
        // populate Document with Parsed Nodes
        try {
            // make sure thid document object is empty before we try to load ...
            this.childNodes = new DOMNodeList(this, this);
            this.firstChild = null;
            this.lastChild = null;
            this.attributes = new DOMNamedNodeMap(this, this);
            this._namespaces = new DOMNamespaceNodeMap(this, this);
            this._readonly = false;
 
            __parseLoop__(this.implementation, this, parser);
        } catch (e) {
            $error(e);
        }
 
        // set parseComplete flag, (Some validation Rules are relaxed if this is false)
        this._parseComplete = true;
        return this;
    },
    load: function(url){
		$debug("Loading url into DOM Document: "+ url + " - (Asynch? "+$w.document.async+")");
        var scripts, _this = this;
        var xhr;
// print("KK",url,url =="about:blank"); 
        if (url == "about:blank"){
            xhr = ({
                open: function(){},
                send: function(){
                    this.responseText = "<html><head><title></title></head><body></body></html>";
                    this.onreadystatechange();
                },
                status: 200
            });
        } else if (url.indexOf("data:") === 0) {
            url = url.slice(5);
            var fields = url.split(",");
            var content = fields[1];
            var fields = fields[0].split(";");
            if(fields[1] === "base64" || (fields[1] && fields[1].indexOf("charset=") === 0 && fields[2] === "base64" ) ) {
                content = Base64.decode(content);
            } else {
                content = unescape(content);
            }
            if(fields[0] === "text/html") {
            } else if(fields[0] === "image/png") {
                throw new Error("png");
            } else {
                content =  "<html><head><title></title></head><body>"+content+"</body></html>";
            }
            xhr = ({
                open: function(){},
                send: function(){
                    var self = this;
                    setTimeout(function(){
                        self.responseText = content;
                        self.onreadystatechange();
                    },0);
                },
                status: 200
            });
        } else {
            xhr = new XMLHttpRequest();
        }
        xhr.open("GET", url, $w.document.async);
        xhr.onreadystatechange = function(){
            if (xhr.status != 200) {
                $warn("Could not retrieve XHR content from " + url + ": status code " + xhr.status);
                _this.loadXML(
                    "<html><head></head><body>"+
                        "<h1>No File</h1>"+
                        "</body></html>");
            } else {
                try{
        	    _this.loadXML(xhr.responseText);
                }catch(e){
                    $error("Error Parsing XML - ",e);
                    _this.loadXML(
                        "<html><head></head><body>"+
                            "<h1>Parse Error</h1>"+
                            "<p>"+e.toString()+"</p>"+  
                            "</body></html>");
                }
            }
            _this._url = url;
            
            if ( url != "about:blank" ) {
        	$info("Sucessfully loaded document at "+url);
            }

            // first fire body-onload event
            var bodyLoad = _this.createEvent();
            bodyLoad.initEvent("load");
            try {  // assume <body> element, but just in case....
                _this.getElementsByTagName('body')[0].
                  dispatchEvent( bodyLoad, false );
            } catch (e){;}

            // then fire this onload event
            //event = _this.createEvent();
            //event.initEvent("load");
            //_this.dispatchEvent( event, false );
			
			//also use DOMContentLoaded event
            var domContentLoaded = _this.createEvent();
            domContentLoaded.initEvent("DOMContentLoaded");
            _this.dispatchEvent( domContentLoaded, false );
            
            //finally fire the window.onload event
            if(_this === document){
                var windowLoad = _this.createEvent();
                windowLoad.initEvent("load", false, false);
                $w.dispatchEvent( windowLoad, false );
            }
            
        };
        xhr.send();
    },
	createEvent             : function(eventType){ 
        var event;
        if(eventType === "UIEvents"){ event = new UIEvent();}
        else if(eventType === "MouseEvents"){ event = new MouseEvent();}
        else{ event = new Event(); } 
        return event;
    },
    createExpression        : function(xpath, nsuriMap){ 
        return new XPathExpression(xpath, nsuriMap);
    },
    createElement : function(tagName) {
          //$debug("DOMDocument.createElement( "+tagName+" )");
          // throw Exception if the tagName string contains an illegal character
          if (__ownerDocument__(this).implementation.errorChecking 
            && (!__isValidName__(tagName))) {
            throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
          }
        
          // create DOMElement specifying 'this' as ownerDocument
          var node = new DOMElement(this);
        
          // assign values to properties (and aliases)
          node.tagName  = tagName;
        
          return node;
    },
    createDocumentFragment : function() {
          // create DOMDocumentFragment specifying 'this' as ownerDocument
          var node = new DOMDocumentFragment(this);
          return node;
    },
    createTextNode: function(data) {
          // create DOMText specifying 'this' as ownerDocument
          var node = new DOMText(this);
        
          // assign values to properties (and aliases)
          node.data      = data;
        
          return node;
    },
    createComment : function(data) {
          // create DOMComment specifying 'this' as ownerDocument
          var node = new DOMComment(this);
        
          // assign values to properties (and aliases)
          node.data      = data;
        
          return node;
    },
    createCDATASection : function(data) {
          // create DOMCDATASection specifying 'this' as ownerDocument
          var node = new DOMCDATASection(this);
        
          // assign values to properties (and aliases)
          node.data      = data;
        
          return node;
    },
    createProcessingInstruction : function(target, data) {
          // throw Exception if the target string contains an illegal character
          //$log("DOMDocument.createProcessingInstruction( "+target+" )");
          if (__ownerDocument__(this).implementation.errorChecking 
            && (!__isValidName__(target))) {
            throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
          }
        
          // create DOMProcessingInstruction specifying 'this' as ownerDocument
          var node = new DOMProcessingInstruction(this);
        
          // assign values to properties (and aliases)
          node.target    = target;
          node.data      = data;
        
          return node;
    },
    createAttribute : function(name) {
        // throw Exception if the name string contains an illegal character
        //$log("DOMDocument.createAttribute( "+target+" )");
        if (__ownerDocument__(this).implementation.errorChecking 
            && (!__isValidName__(name))) {
            throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
        }
        
        // create DOMAttr specifying 'this' as ownerDocument
        var node = new DOMAttr(this);
        
        // assign values to properties (and aliases)
        node.name     = name;
        
        return node;
    },
    createElementNS : function(namespaceURI, qualifiedName) {
        //$log("DOMDocument.createElementNS( "+namespaceURI+", "+qualifiedName+" )");
          // test for exceptions
          if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if the Namespace is invalid
            if (!__isValidNamespace__(this, namespaceURI, qualifiedName)) {
              throw(new DOMException(DOMException.NAMESPACE_ERR));
            }
        
            // throw Exception if the qualifiedName string contains an illegal character
            if (!__isValidName__(qualifiedName)) {
              throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
            }
          }
        
          var qname = __parseQName__(qualifiedName);

          // create DOMElement specifying 'this' as ownerDocument
          if(namespaceURI === "http://www.w3.org/2000/svg"){
              var node = SVGDocument.prototype.createElement.call( this, qname.localName );
          } else {
              var node  = new DOMElement(this);
          }

          // assign values to properties (and aliases)
          node.namespaceURI = namespaceURI;
          node.prefix       = qname.prefix;
          node.localName    = qname.localName;
          node.tagName      = qualifiedName;
        
          return node;
    },
    createAttributeNS : function(namespaceURI, qualifiedName) {
          // test for exceptions
          if (__ownerDocument__(this).implementation.errorChecking) {
            // throw Exception if the Namespace is invalid
            if (!__isValidNamespace__(this, namespaceURI, qualifiedName, true)) {
              throw(new DOMException(DOMException.NAMESPACE_ERR));
            }
        
            // throw Exception if the qualifiedName string contains an illegal character
            if (!__isValidName__(qualifiedName)) {
              throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
            }
          }
        
          // create DOMAttr specifying 'this' as ownerDocument
          var node  = new DOMAttr(this);
          var qname = __parseQName__(qualifiedName);
        
          // assign values to properties (and aliases)
          node.namespaceURI = namespaceURI;
          node.prefix       = qname.prefix;
          node.localName    = qname.localName;
          node.name         = qualifiedName;
          node.nodeValue    = "";
        
          return node;
    },
    createNamespace : function(qualifiedName) {
          // create DOMNamespace specifying 'this' as ownerDocument
          var node  = new DOMNamespace(this);
          var qname = __parseQName__(qualifiedName);
        
          // assign values to properties (and aliases)
          node.prefix       = qname.prefix;
          node.localName    = qname.localName;
          node.name         = qualifiedName;
          node.nodeValue    = "";
        
          return node;
    },
    /** from David Flanagan's JavaScript - The Definitive Guide
     * 
     * @param {String} xpathText
     *     The string representing the XPath expression to evaluate.
     * @param {Node} contextNode 
     *     The node in this document against which the expression is to
     *     be evaluated.
     * @param {Function} nsuriMapper 
     *     A function that will map from namespace prefix to to a full 
     *     namespace URL or null if no such mapping is required.
     * @param {Number} resultType 
     *     Specifies the type of object expected as a result, using
     *     XPath conversions to coerce the result. Possible values for
     *     type are the constrainsts defined by the XPathResult object.
     *     (null if not required)
     * @param {XPathResult} result 
     *     An XPathResult object to be reused or null
     *     if you want a new XPathResult object to be created.
     * @returns {XPathResult} result
     *     A XPathResult object representing the evaluation of the 
     *     expression against the given context node.
     * @throws {Exception} e
     *     This method may throw an exception if the xpathText contains 
     *     a syntax error, if the expression cannot be converted to the
     *     desired resultType, if the expression contains namespaces 
     *     that nsuriMapper cannot resolve, or if contextNode is of the 
     *     wrong type or is not assosciated with this document.
     * @seealso
     *     Document.evaluate
     */
    /*evaluate: function(xpathText, contextNode, nsuriMapper, resultType, result){
        return new XPathExpression().evaluate();
    },*/
    getElementById : function(elementId) {
          var retNode = null,
              node;
          // loop through all Elements in the 'all' collection
          var all = this.all;
          for (var i=0; i < all.length; i++) {
            node = all[i];
            // if id matches & node is alive (ie, connected (in)directly to the documentElement)
            if (node.id == elementId) {
                if((__ownerDocument__(node).documentElement._id == this.documentElement._id)){
                    retNode = node;
                    //$log("Found node with id = " + node.id);
                    break;
                }
            }
          }
          
          //if(retNode == null){$log("Couldn't find id " + elementId);}
          return retNode;
    },
    normalizeDocument: function(){
	    this.documentElement.normalize();
    },
    get nodeType(){
        return DOMNode.DOCUMENT_NODE;
    },
    get xml(){
        //$log("Serializing " + this);
        return this.documentElement.xml;
    },
	toString: function(){ 
	    return "DOMDocument" +  (typeof this._url == "string" ? ": " + this._url : ""); 
    },
	get defaultView(){ 
		return { getComputedStyle: function(elem){
			return $w.getComputedStyle(elem);
		}};
	},
    _genId : function() {
          this._lastId += 1;                             // increment lastId (to generate unique id)
          return this._lastId;
    }
});


var __isValidNamespace__ = function(doc, namespaceURI, qualifiedName, isAttribute) {

      if (doc._performingImportNodeOperation == true) {
        //we're doing an importNode operation (or a cloneNode) - in both cases, there
        //is no need to perform any namespace checking since the nodes have to have been valid
        //to have gotten into the DOM in the first place
        return true;
      }
    
      var valid = true;
      // parse QName
      var qName = __parseQName__(qualifiedName);
    
    
      //only check for namespaces if we're finished parsing
      if (this._parseComplete == true) {
    
        // if the qualifiedName is malformed
        if (qName.localName.indexOf(":") > -1 ){
            valid = false;
        }
    
        if ((valid) && (!isAttribute)) {
            // if the namespaceURI is not null
            if (!namespaceURI) {
            valid = false;
            }
        }
    
        // if the qualifiedName has a prefix
        if ((valid) && (qName.prefix == "")) {
            valid = false;
        }
    
      }
    
      // if the qualifiedName has a prefix that is "xml" and the namespaceURI is
      //  different from "http://www.w3.org/XML/1998/namespace" [Namespaces].
      if ((valid) && (qName.prefix == "xml") && (namespaceURI != "http://www.w3.org/XML/1998/namespace")) {
        valid = false;
      }
    
      return valid;
};

$w.Document = DOMDocument;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining HTMLDocument");
/*
* HTMLDocument - DOM Level 2
*/
/**
 * @class  HTMLDocument - The Document interface represents the entire HTML or XML document.
 *   Conceptually, it is the root of the document tree, and provides the primary access to the document's data.
 *
 * @extends DOMDocument
 */
var HTMLDocument = function(implementation, docParentWindow, docReferrer) {
  this.DOMDocument = DOMDocument;
  this.DOMDocument(implementation, docParentWindow);

  this._referrer = docReferrer;
  this._domain;
  this._open = false;
  this.$async = false;
};
HTMLDocument.prototype = new DOMDocument;
__extend__(HTMLDocument.prototype, {
    loadXML : function(xmlString) {
        // create DOM Document
        if(this === $document){
            $debug("Setting internal window.document");
            $document = this;
        }
        // populate Document with Parsed Nodes
        try {
            // make sure thid document object is empty before we try to load ...
            this.childNodes      = new DOMNodeList(this, this);
            this.firstChild      = null;
            this.lastChild       = null;
            this.attributes      = new DOMNamedNodeMap(this, this);
            this._namespaces     = new DOMNamespaceNodeMap(this, this);
            this._readonly = false;
            
            $w.parseHtmlDocument(xmlString, this, null, null);

            
        } catch (e) {
            $error(e);
        }

        // set parseComplete flag, (Some validation Rules are relaxed if this is false)
        this._parseComplete = true;
        return this;
    },
    createElement: function(tagName){
          //print('createElement :'+tagName);
          // throw Exception if the tagName string contains an illegal character
          if (__ownerDocument__(this).implementation.errorChecking && 
                (!__isValidName__(tagName))) {
              throw(new DOMException(DOMException.INVALID_CHARACTER_ERR));
          }
          var originalName = tagName;
          tagName = tagName.toUpperCase();
          // create DOMElement specifying 'this' as ownerDocument
          //This is an html document so we need to use explicit interfaces per the 
          if(     tagName.match(/^A$/))                 {node = new HTMLAnchorElement(this);}
          else if(tagName.match(/^AREA$/))              {node = new HTMLAreaElement(this);}
          else if(tagName.match(/BASE/))                {node = new HTMLBaseElement(this);}
          else if(tagName.match(/BLOCKQUOTE|Q/))        {node = new HTMLQuoteElement(this);}
          else if(tagName.match(/BODY/))                {node = new HTMLBodyElement(this);}
          else if(tagName.match(/BR/))                  {node = new HTMLElement(this);}
          else if(tagName.match(/BUTTON/))              {node = new HTMLButtonElement(this);}
          else if(tagName.match(/CAPTION/))             {node = new HTMLElement(this);}
          else if(tagName.match(/COL|COLGROUP/))        {node = new HTMLTableColElement(this);}
          else if(tagName.match(/DEL|INS/))             {node = new HTMLModElement(this);}
          else if(tagName.match(/DIV/))                 {node = new HTMLDivElement(this);}
          else if(tagName.match(/DL/))                  {node = new HTMLElement(this);}
          else if(tagName.match(/FIELDSET/))            {node = new HTMLFieldSetElement(this);}
          else if(tagName.match(/FORM/))                {node = new HTMLFormElement(this);}
          else if(tagName.match(/^FRAME$/))             {node = new HTMLFrameElement(this);}
          else if(tagName.match(/FRAMESET/))            {node = new HTMLFrameSetElement(this);}
          else if(tagName.match(/H1|H2|H3|H4|H5|H6/))   {node = new HTMLElement(this);}
          else if(tagName.match(/HEAD/))                {node = new HTMLHeadElement(this);}
          else if(tagName.match(/HR/))                  {node = new HTMLElement(this);}
          else if(tagName.match(/HTML/))                {node = new HTMLElement(this);}
          else if(tagName.match(/IFRAME/))              {node = new HTMLIFrameElement(this);}
          else if(tagName.match(/IMG/))                 {node = new HTMLImageElement(this);}
          else if(tagName.match(/INPUT/))               {node = new HTMLInputElement(this);}
          else if(tagName.match(/LABEL/))               {node = new HTMLLabelElement(this);}
          else if(tagName.match(/LEGEND/))              {node = new HTMLLegendElement(this);}
          else if(tagName.match(/^LI$/))                {node = new HTMLElement(this);}
          else if(tagName.match(/LINK/))                {node = new HTMLLinkElement(this);}
          else if(tagName.match(/MAP/))                 {node = new HTMLMapElement(this);}
          else if(tagName.match(/META/))                {node = new HTMLMetaElement(this);}
          else if(tagName.match(/OBJECT/))              {node = new HTMLObjectElement(this);}
          else if(tagName.match(/OL/))                  {node = new HTMLElement(this);}
          else if(tagName.match(/OPTGROUP/))            {node = new HTMLOptGroupElement(this);}
          else if(tagName.match(/OPTION/))              {node = new HTMLOptionElement(this);;}
          else if(tagName.match(/^P$/))                 {node = new HTMLElement(this);}
          else if(tagName.match(/PARAM/))               {node = new HTMLParamElement(this);}
          else if(tagName.match(/PRE/))                 {node = new HTMLElement(this);}
          else if(tagName.match(/SCRIPT/))              {node = new HTMLScriptElement(this);}
          else if(tagName.match(/SELECT/))              {node = new HTMLSelectElement(this);}
          else if(tagName.match(/STYLE/))               {node = new HTMLStyleElement(this);}
          else if(tagName.match(/TABLE/))               {node = new HTMLTableElement(this);}
          else if(tagName.match(/TBODY|TFOOT|THEAD/))   {node = new HTMLTableSectionElement(this);}
          else if(tagName.match(/TD|TH/))               {node = new HTMLTableCellElement(this);}
          else if(tagName.match(/TEXTAREA/))            {node = new HTMLTextAreaElement(this);}
          else if(tagName.match(/TITLE/))               {node = new HTMLTitleElement(this);}
          else if(tagName.match(/TR/))                  {node = new HTMLTableRowElement(this);}
          else if(tagName.match(/UL/))                  {node = new HTMLElement(this);}
          else{
            node = new HTMLElement(this);
          }
        
          // assign values to properties (and aliases)
          node.tagName  = tagName; // originalName;
          return node;
    },
    createElementNS : function (uri, local) {
        //print('createElementNS :'+uri+" "+local);
        if(!uri){
            return this.createElement(local);
        }else if ("http://www.w3.org/1999/xhtml" == uri) {
             return this.createElement(local);
        } else if ("http://www.w3.org/1998/Math/MathML" == uri) {
          if (!this.mathplayerinitialized) {
              var obj = this.createElement("object");
              obj.setAttribute("id", "mathplayer");
              obj.setAttribute("classid", "clsid:32F66A20-7614-11D4-BD11-00104BD3F987");
              this.getElementsByTagName("head")[0].appendChild(obj);
              this.namespaces.add("m", "http://www.w3.org/1998/Math/MathML", "#mathplayer");  
              this.mathplayerinitialized = true;
          }
          return this.createElement("m:" + local);
        } else {
            return DOMDocument.prototype.createElementNS.apply(this,[uri, local]);
        }
    },
    get anchors(){
        return new HTMLCollection(this.getElementsByTagName('a'), 'Anchor');
        
    },
    get applets(){
        return new HTMLCollection(this.getElementsByTagName('applet'), 'Applet');
        
    },
    get body(){ 
        var nodelist = this.getElementsByTagName('body');
        return nodelist.item(0);
        
    },
    set body(html){
        return this.replaceNode(this.body,html);
        
    },

    get title(){
        var titleArray = this.getElementsByTagName('title');
        if (titleArray.length < 1)
            return "";
        return titleArray[0].text;
    },
    set title(titleStr){
        titleArray = this.getElementsByTagName('title');
        if (titleArray.length < 1){
            // need to make a new element and add it to "head"
            var titleElem = new HTMLTitleElement(this);
            titleElem.text = titleStr;
            var headArray = this.getElementsByTagName('head');
	    if (headArray.length < 1)
                return;  // ill-formed, just give up.....
            headArray[0].appendChild(titleElem);
        }
        else {
            titleArray[0].text = titleStr;
        }
    },

    //set/get cookie see cookie.js
    get domain(){
        return this._domain||$w.location.domain;
        
    },
    set domain(){
        /* TODO - requires a bit of thought to enforce domain restrictions */ 
        return; 
        
    },
    get forms(){
      return new HTMLCollection(this.getElementsByTagName('form'), 'Form');
    },
    get images(){
        return new HTMLCollection(this.getElementsByTagName('img'), 'Image');
        
    },
    get lastModified(){ 
        /* TODO */
        return this._lastModified; 
    
    },
    get links(){
        return new HTMLCollection(this.getElementsByTagName('a'), 'Link');
        
    },
    get location(){
        return $w.location
    },
    get referrer(){
        return this._referrer;
    },
	close : function(){ 
	    /* TODO */ 
	    this._open = false;
    },
	getElementsByName : function(name){
        //returns a real Array + the DOMNodeList
        var retNodes = __extend__([],new DOMNodeList(this, this.documentElement)),
          node;
        // loop through all Elements in the 'all' collection
        var all = this.all;
        for (var i=0; i < all.length; i++) {
            node = all[i];
            if (node.nodeType == DOMNode.ELEMENT_NODE && node.getAttribute('name') == name) {
                retNodes.push(node);
            }
        }
        return retNodes;
	},
	open : function(){ 
	    /* TODO */
	    this._open = true;  
    },
	write: function(htmlstring){ 
	    /* TODO */
	    return; 
	
    },
	writeln: function(htmlstring){ 
	    this.write(htmlstring+'\n'); 
    },
	toString: function(){ 
	    return "HTMLDocument" +  (typeof this._url == "string" ? ": " + this._url : ""); 
    },
	get innerHTML(){ 
	    return this.documentElement.outerHTML; 
	    
    },
	get __html__(){
	    return true;
	    
    },
    get async(){ return this.$async;},
    set async(async){ this.$async = async; },
    get baseURI(){ return $env.location('./'); },
    get URL(){ return $w.location.href;  },
    set URL(url){ $w.location.href = url;  }
});

var __elementPopped__ = function(ns, name, node){
    // print('Element Popped: '+ns+" "+name+ " "+ node+" " +node.type+" "+node.nodeName);
    var doc = __ownerDocument__(node);
    // SMP: subtle issue here: we're currently getting two kinds of script nodes from the html5 parser.
    // The "fake" nodes come with a type of undefined. The "real" nodes come with the type that's given,
    // or null if not given. So the following check has the side-effect of ignoring the "fake" nodes. So
    // something to watch for if this code changes.
    var type = ( node.type === null ) ? "text/javascript" : node.type;
    try{
        if(node.nodeName.toLowerCase() == 'script' && type == "text/javascript"){
            //$env.debug("element popped: script\n"+node.xml);
            // unless we're parsing in a window context, don't execute scripts
            if (doc.parentWindow){
                //p.replaceEntities = true;
                var okay = $env.loadLocalScript(node, null);
                // only fire event if we actually had something to load
                if (node.src && node.src.length > 0){
                    var event = doc.createEvent();
                    event.initEvent( okay ? "load" : "error", false, false );
                    node.dispatchEvent( event, false );
                  }
            }
        }
        else if (node.nodeName.toLowerCase() == 'frame' ||
                 node.nodeName.toLowerCase() == 'iframe'   ){
            
            //$env.debug("element popped: iframe\n"+node.xml);
            if (node.src && node.src.length > 0){
                $debug("getting content document for (i)frame from " + node.src);
    
                // any JS here is DOM-instigated, so the JS scope is the window, not the first script
              
                var save = $master.first_script_window;
                $master.first_script_window = window;

                $env.loadFrame(node, $env.location(node.src));
    
                $master.first_script_window = save;

                var event = doc.createEvent();
                event.initEvent("load", false, false);
                node.dispatchEvent( event, false );
            }
        }
        else if (node.nodeName.toLowerCase() == 'link'){
            //$env.debug("element popped: link\n"+node.xml);
            if (node.href && node.href.length > 0){
                // don't actually load anything, so we're "done" immediately:
                var event = doc.createEvent();
                event.initEvent("load", false, false);
                node.dispatchEvent( event, false );
            }
        }
        else if (node.nodeName.toLowerCase() == 'img'){
            //$env.debug("element popped: img \n"+node.xml);
            if (node.src && node.src.length > 0){
                // don't actually load anything, so we're "done" immediately:
                var event = doc.createEvent();
                event.initEvent("load", false, false);
                node.dispatchEvent( event, false );
            }
        }
    }catch(e){
        $env.error('error loading html element', e);
    }
};

$w.HTMLDocument = HTMLDocument;
$debug("Defining HTMLElement");
/*
* HTMLElement - DOM Level 2
*/
var HTMLElement = function(ownerDocument) {
    this.DOMElement = DOMElement;
    this.DOMElement(ownerDocument);
    
    this.$css2props = null;
};
HTMLElement.prototype = new DOMElement;
__extend__(HTMLElement.prototype, {

		get className() { 
		    return this.getAttribute("class")||''; 
	    },
		set className(value) { 
		    return this.setAttribute("class",trim(value)); 
		    
	    },
		get dir() { 
		    return this.getAttribute("dir")||"ltr"; 
		    
	    },
		set dir(val) { 
		    return this.setAttribute("dir",val); 
		    
	    },
		get id(){  
		    return this.getAttribute('id'); 
		    
	    },
		set id(id){  
		    this.setAttribute('id', id); 
            
	    },
		get innerHTML(){  
		    return this.childNodes.xml; 
		    
	    },
		set innerHTML(html){
		    //Should be replaced with HTMLPARSER usage
            //$debug('SETTING INNER HTML ('+this+'+'+html.substring(0,64));
            var doc = new HTMLDocument($implementation,null,"");
            $w.parseHtmlDocument(html,doc,null,null,true);
            var parent = doc.body;
			while(this.firstChild != null){
			    this.removeChild( this.firstChild );
			}
			var importedNode;
			while(parent.firstChild != null){
	            importedNode = this.importNode( 
	                parent.removeChild( parent.firstChild ), true);
			    this.appendChild( importedNode );   
		    }
		    //Mark for garbage collection
		    doc = null;
		},
        get innerText(){
            return __recursivelyGatherText__(this);
        },
        set innerText(newText){
			while(this.firstChild != null){
			    this.removeChild( this.firstChild );
			}
            var text = this.ownerDocument.createTextNode(newText);
            this.appendChild(text);
        },
		get lang() { 
		    return this.getAttribute("lang"); 
		    
	    },
		set lang(val) { 
		    return this.setAttribute("lang",val); 
		    
	    },
		get offsetHeight(){
		    return Number(this.style["height"].replace("px",""));
		},
		get offsetWidth(){
		    return Number(this.style["width"].replace("px",""));
		},
		offsetLeft: 0,
		offsetRight: 0,
		get offsetParent(){
		    /* TODO */
		    return;
	    },
		set offsetParent(element){
		    /* TODO */
		    return;
	    },
		scrollHeight: 0,
		scrollWidth: 0,
		scrollLeft: 0, 
		scrollRight: 0,
		get style(){
		    if(this.$css2props === null){
	            this.$css2props = new CSS2Properties(this);
	        }
	        return this.$css2props;
		},
        set style(values){
		    __updateCss2Props__(this, values);
        },
		setAttribute: function (name, value) {
            DOMElement.prototype.setAttribute.apply(this,[name, value]);
		    if (name === "style") {
		        __updateCss2Props__(this, value);
		    }
		},
		get title() { 
		    return this.getAttribute("title"); 
		    
	    },
		set title(value) { 
		    return this.setAttribute("title", value); 
		    
	    },
		get tabIndex(){
            var ti = this.getAttribute('tabindex');
            if(ti!==null)
                return Number(ti);
            else
                return 0;
        },
        set tabIndex(value){
            if(value===undefined||value===null)
                value = 0;
            this.setAttribute('tabindex',Number(value));
        },
		//Not in the specs but I'll leave it here for now.
		get outerHTML(){ 
		    return this.xml; 
		    
	    },
	    scrollIntoView: function(){
	        /*TODO*/
	        return;
	    
        },

		onclick: function(event){
		    __eval__(this.getAttribute('onclick')||'', this);
	    },
        

		ondblclick: function(event){
            __eval__(this.getAttribute('ondblclick')||'', this);
	    },
		onkeydown: function(event){
            __eval__(this.getAttribute('onkeydown')||'', this);
	    },
		onkeypress: function(event){
            __eval__(this.getAttribute('onkeypress')||'', this);
	    },
		onkeyup: function(event){
            __eval__(this.getAttribute('onkeyup')||'', this);
	    },
		onmousedown: function(event){
            __eval__(this.getAttribute('onmousedown')||'', this);
	    },
		onmousemove: function(event){
            __eval__(this.getAttribute('onmousemove')||'', this);
	    },
		onmouseout: function(event){
            __eval__(this.getAttribute('onmouseout')||'', this);
	    },
		onmouseover: function(event){
            __eval__(this.getAttribute('onmouseover')||'', this);
	    },
		onmouseup: function(event){
            __eval__(this.getAttribute('onmouseup')||'', this);
	    }
});

var __recursivelyGatherText__ = function(aNode) {
    var accumulateText = "";
    var idx; var n;
    for (idx=0;idx < aNode.childNodes.length;idx++){
        n = aNode.childNodes.item(idx);
        if(n.nodeType == DOMNode.TEXT_NODE)
            accumulateText += n.data;
        else
            accumulateText += __recursivelyGatherText__(n);
    }

    return accumulateText;
};
    
var __eval__ = $env.__eval__ || function(script, startingNode){
    if (script == "")
        return;                    // don't assemble environment if no script...

    try{
        var doEval = function(scriptText){
            eval(scriptText);
        };

        var listOfScopes = [];
        for (var node = startingNode; node != null; node = node.parentNode)
            listOfScopes.push(node);
        listOfScopes.push($w);


        var oldScopesArray = $env.configureScope(
          doEval,        // the function whose scope chain to change
          listOfScopes); // last array element is "head" of new chain
        doEval.call(startingNode, script);
        $env.restoreScope(oldScopesArray);
                         // oldScopesArray is N-element array of two-element
                         // arrays.  First element is JS object whose scope
                         // was modified, second is original value to restore.
    }catch(e){
        $error(e);
    }
};

var __updateCss2Props__ = function(elem, values){
    if(elem.$css2props === null){
        elem.$css2props = new CSS2Properties(elem);
    }
    __cssTextToStyles__(elem.$css2props, values);
};

var __registerEventAttrs__ = function(elm){
    if(elm.hasAttribute('onclick')){ 
        elm.addEventListener('click', elm.onclick ); 
    }
    if(elm.hasAttribute('ondblclick')){ 
        elm.addEventListener('dblclick', elm.onclick ); 
    }
    if(elm.hasAttribute('onkeydown')){ 
        elm.addEventListener('keydown', elm.onclick ); 
    }
    if(elm.hasAttribute('onkeypress')){ 
        elm.addEventListener('keypress', elm.onclick ); 
    }
    if(elm.hasAttribute('onkeyup')){ 
        elm.addEventListener('keyup', elm.onclick ); 
    }
    if(elm.hasAttribute('onmousedown')){ 
        elm.addEventListener('mousedown', elm.onclick ); 
    }
    if(elm.hasAttribute('onmousemove')){ 
        elm.addEventListener('mousemove', elm.onclick ); 
    }
    if(elm.hasAttribute('onmouseout')){ 
        elm.addEventListener('mouseout', elm.onclick ); 
    }
    if(elm.hasAttribute('onmouseover')){ 
        elm.addEventListener('mouseover', elm.onclick ); 
    }
    if(elm.hasAttribute('onmouseup')){ 
        elm.addEventListener('mouseup', elm.onclick ); 
    }
    return elm;
};
	
// non-ECMA function, but no other way for click events to enter env.js
var  __click__ = function(element){
    var event = new Event({
      target:element,
      currentTarget:element
    });
    event.initEvent("click");
    element.dispatchEvent(event);
};
var __submit__ = function(element){
	var event = new Event({
	  target:element,
	  currentTarget:element
	});
	event.initEvent("submit");
	element.dispatchEvent(event);
};
var __focus__ = function(element){
	var event = new Event({
	  target:element,
	  currentTarget:element
	});
	event.initEvent("focus");
	element.dispatchEvent(event);
};
var __blur__ = function(element){
	var event = new Event({
	  target:element,
	  currentTarget:element
	});
	event.initEvent("blur");
	element.dispatchEvent(event);
};

$w.HTMLElement = HTMLElement;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining HTMLCollection");
/*
* HTMLCollection - DOM Level 2
* Implementation Provided by Steven Wood
*/
var HTMLCollection = function(nodelist, type){

  __setArray__(this, []);
  for (var i=0; i<nodelist.length; i++) {
      this[i] = nodelist[i];
  }
  
  this.length = nodelist.length;

}

HTMLCollection.prototype = {
        
    item : function (idx) {
        var ret = null;
        if ((idx >= 0) && (idx < this.length)) { 
            ret = this[idx];                    
        }
    
        return ret;   
    },
    
    namedItem : function (name) {
    }
};

$w.HTMLCollection = HTMLCollection;

/*var HTMLCollection = function(nodelist, type){
  var $items = [], 
      $item, i;
  if(type === "Anchor" ){
    for(i=0;i<nodelist.length;i++){ 
      //The name property is required to be add to the collection
      if(nodelist.item(i).name){
        item = new nodelist.item(i);
        $items.push(item);
        this[nodelist.item(i).name] = item;
      }
    }
  }else if(type === "Link"){
    for(i=0;i<nodelist.length;i++){ 
      //The name property is required to be add to the collection
      if(nodelist.item(i).href){
        item = new nodelist.item(i);
        $items.push(item);
        this[nodelist.item(i).name] = item;
      }
    }
  }else if(type === "Form"){
    for(i=0;i<nodelist.length;i++){ 
      //The name property is required to be add to the collection
      if(nodelist.item(i).href){
        item = new nodelist.item(i);
        $items.push(item);
        this[nodelist.item(i).name] = item;
      }
    }
  }
  setArray(this, $items);
  return __extend__(this, {
    item : function(i){return this[i];},
    namedItem : function(name){return this[name];}
  });
};*/

	/*
 *  a set of convenience classes to centralize implementation of
 * properties and methods across multiple in-form elements
 *
 *  the hierarchy of related HTML elements and their members is as follows:
 *
 *
 *    HTMLInputCommon:  common to all elements
 *       .form
 *
 *    <legend>
 *          [common plus:]
 *       .align
 *
 *    <fieldset>
 *          [identical to "legend" plus:]
 *       .margin
 *
 *
 *  ****
 *
 *    <label>
 *          [common plus:]
 *       .dataFormatAs
 *       .htmlFor
 *       [plus data properties]
 *
 *    <option>
 *          [common plus:]
 *       .defaultSelected
 *       .index
 *       .label
 *       .selected
 *       .text
 *       .value   // unique implementation, not duplicated
 *
 *  ****
 *
 *    HTMLTypeValueInputs:  common to remaining elements
 *          [common plus:]
 *       .name
 *       .type
 *       .value
 *       [plus data properties]
 *
 *
 *    <select>
 *       .length
 *       .multiple
 *       .options[]
 *       .selectedIndex
 *       .add()
 *       .remove()
 *       .item()                                       // unimplemented
 *       .namedItem()                                  // unimplemented
 *       [plus ".onchange"]
 *       [plus focus events]
 *       [plus data properties]
 *       [plus ".size"]
 *
 *    <button>
 *       .dataFormatAs   // duplicated from above, oh well....
 *       [plus ".status", ".createTextRange()"]
 *
 *  ****
 *
 *    HTMLInputAreaCommon:  common to remaining elements
 *       .defaultValue
 *       .readOnly
 *       .handleEvent()                                // unimplemented
 *       .select()
 *       .onselect
 *       [plus ".size"]
 *       [plus ".status", ".createTextRange()"]
 *       [plus focus events]
 *       [plus ".onchange"]
 *
 *    <textarea>
 *       .cols
 *       .rows
 *       .wrap                                         // unimplemented
 *       .onscroll                                     // unimplemented
 *
 *    <input>
 *       .alt
 *       .accept                                       // unimplemented
 *       .checked
 *       .complete                                     // unimplemented
 *       .defaultChecked
 *       .dynsrc                                       // unimplemented
 *       .height
 *       .hspace                                       // unimplemented
 *       .indeterminate                                // unimplemented
 *       .loop                                         // unimplemented
 *       .lowsrc                                       // unimplemented
 *       .maxLength
 *       .src
 *       .start                                        // unimplemented
 *       .useMap
 *       .vspace                                       // unimplemented
 *       .width
 *       .onclick
 *       [plus ".size"]
 *       [plus ".status", ".createTextRange()"]

 *    [data properties]                                // unimplemented
 *       .dataFld
 *       .dataSrc

 *    [status stuff]                                   // unimplemented
 *       .status
 *       .createTextRange()

 *    [focus events]
 *       .onblur
 *       .onfocus

 */




$debug("Defining input element 'mix in' objects");
var inputElements_dataProperties = {};
var inputElements_status = {};

var inputElements_onchange = {
    onchange: function(event){
        __eval__(this.getAttribute('onchange')||'', this)
    }
};

var inputElements_size = {
    get size(){
        return Number(this.getAttribute('size'));
    },
    set size(value){
        this.setAttribute('size',value);
    }
};

var inputElements_focusEvents = {
    blur: function(){
        __blur__(this);

        if (this._oldValue != this.value){
            var event = document.createEvent();
            event.initEvent("change");
            this.dispatchEvent( event );
        }
    },
    focus: function(){
        __focus__(this);
        this._oldValue = this.value;
    }
};


$debug("Defining HTMLInputCommon");

/*
* HTMLInputCommon - convenience class, not DOM
*/
var HTMLInputCommon = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLInputCommon.prototype = new HTMLElement;
__extend__(HTMLInputCommon.prototype, {
    get form(){
        var parent = this.parentNode;
        while(parent.nodeName.toLowerCase() != 'form'){
            parent = parent.parentNode;
        }
        return parent;
    },
    get accessKey(){
        return this.getAttribute('accesskey');
    },
    set accessKey(value){
        this.setAttribute('accesskey',value);
    },
    get access(){
        return this.getAttribute('access');
    },
    set access(value){
        this.setAttribute('access', value);
    },
    get disabled(){
        return (this.getAttribute('disabled')=='disabled');
    },
    set disabled(value){
        this.setAttribute('disabled', (value ? 'disabled' :''));
    }
});

$w.HTMLInputCommon = HTMLInputCommon;


$debug("Defining HTMLTypeValueInputs");

/*
* HTMLTypeValueInputs - convenience class, not DOM
*/
var HTMLTypeValueInputs = function(ownerDocument) {
    this.HTMLInputCommon = HTMLInputCommon;
    this.HTMLInputCommon(ownerDocument);

    this._oldValue = "";
};
HTMLTypeValueInputs.prototype = new HTMLInputCommon;
__extend__(HTMLTypeValueInputs.prototype, inputElements_size);
__extend__(HTMLTypeValueInputs.prototype, inputElements_status);
__extend__(HTMLTypeValueInputs.prototype, inputElements_dataProperties);
__extend__(HTMLTypeValueInputs.prototype, {
    get defaultValue(){
        return this.getAttribute('defaultValue');
    },
    set defaultValue(value){
        this.setAttribute('defaultValue', value);
    },
    get name(){
        return this.getAttribute('name')||'';
    },
    set name(value){
        this.setAttribute('name',value);
    },
    get type(){
        return this.getAttribute('type');
    },
    set type(type){
        return this.setAttribute('type', type);
    },
    get value(){
        return this.getAttribute('value')||'';
    },
    set value(newValue){
        this.setAttribute('value',newValue);
    },
    setAttribute: function(name, value){
        if(name == 'value' && !this.defaultValue){
            this.defaultValue = value;
        }
        HTMLElement.prototype.setAttribute.apply(this, [name, value]);
    }
});

$w.HTMLTypeValueInputs = HTMLTypeValueInputs;



$debug("Defining HTMLInputAreaCommon");

/*
* HTMLInputAreaCommon - convenience class, not DOM
*/
var HTMLInputAreaCommon = function(ownerDocument) {
    this.HTMLTypeValueInputs = HTMLTypeValueInputs;
    this.HTMLTypeValueInputs(ownerDocument);
};
HTMLInputAreaCommon.prototype = new HTMLTypeValueInputs;
__extend__(HTMLInputAreaCommon.prototype, inputElements_focusEvents);
__extend__(HTMLInputAreaCommon.prototype, inputElements_onchange);
__extend__(HTMLInputAreaCommon.prototype, {
    get readOnly(){
        return (this.getAttribute('readonly')=='readonly');
    },
    set readOnly(value){
        this.setAttribute('readonly', (value ? 'readonly' :''));
    },
    select:function(){
        __select__(this);

    }
});

$w.HTMLInputAreaCommon = HTMLInputAreaCommon;
$debug("Defining HTMLAnchorElement");
/* 
* HTMLAnchorElement - DOM Level 2
*/
var HTMLAnchorElement = function(ownerDocument) {
    //$log("creating anchor element");
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLAnchorElement.prototype = new HTMLElement;
__extend__(HTMLAnchorElement.prototype, {
	get accessKey() { 
	    return this.getAttribute("accesskey"); 
	    
    },
	set accessKey(val) { 
	    return this.setAttribute("accesskey",val); 
	    
    },
	get charset() { 
	    return this.getAttribute("charset"); 
	    
    },
	set charset(val) { 
	    return this.setAttribute("charset",val); 
	    
    },
	get coords() { 
	    return this.getAttribute("coords"); 
	    
    },
	set coords(val) { 
	    return this.setAttribute("coords",val); 
	    
    },
	get href() { 
	    return this.getAttribute("href"); 
	    
    },
	set href(val) { 
	    return this.setAttribute("href",val); 
	    
    },
	get hreflang() { 
	    return this.getAttribute("hreflang"); 
	    
    },
	set hreflang(val) { 
	    return this.setAttribute("hreflang",val); 
	    
    },
	get name() { 
	    return this.getAttribute("name"); 
	    
    },
	set name(val) { 
	    return this.setAttribute("name",val); 
	    
    },
	get rel() { 
	    return this.getAttribute("rel"); 
	    
    },
	set rel(val) { 
	    return this.setAttribute("rel",val); 
	    
    },
	get rev() { 
	    return this.getAttribute("rev"); 
	    
    },
	set rev(val) { 
	    return this.setAttribute("rev",val); 
	    
    },
	get shape() { 
	    return this.getAttribute("shape"); 
	    
    },
	set shape(val) { 
	    return this.setAttribute("shape",val); 
	    
    },
	get target() { 
	    return this.getAttribute("target"); 
	    
    },
	set target(val) { 
	    return this.setAttribute("target",val); 
	    
    },
	get type() { 
	    return this.getAttribute("type"); 
	    
    },
	set type(val) { 
	    return this.setAttribute("type",val); 
	    
    },
	blur:function(){
	    __blur__(this);
	    
    },
	focus:function(){
	    __focus__(this);
	    
    }
});

$w.HTMLAnchorElement = HTMLAnchorElement;$debug("Defining Anchor");
/* 
* Anchor - DOM Level 2
*/
var Anchor = function(ownerDocument) {
    this.HTMLAnchorElement = HTMLAnchorElement;
    this.HTMLAnchorElement(ownerDocument);
};

(function(){
    //static regular expressions
	var hash 	 = new RegExp('(\\#.*)'),
        hostname = new RegExp('\/\/([^\:\/]+)'),
        pathname = new RegExp('(\/[^\\?\\#]*)'),
        port 	 = new RegExp('\:(\\d+)\/'),
        protocol = new RegExp('(^\\w*\:)'),
        search 	 = new RegExp('(\\?[^\\#]*)');
			
    __extend__(Anchor.prototype, {
		get hash(){
			var m = hash.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set hash(_hash){
			//setting the hash is the only property of the location object
			//that doesn't cause the window to reload
			_hash = _hash.indexOf('#')===0?_hash:"#"+_hash;	
			this.href = this.protocol + this.host + this.pathname + this.search + _hash;
		},
		get host(){
			return this.hostname + (this.port !== "")?":"+this.port:"";
		},
		set host(_host){
			this.href = this.protocol + _host + this.pathname + this.search + this.hash;
		},
		get hostname(){
			var m = hostname.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set hostname(_hostname){
			this.href = this.protocol + _hostname + ((this.port=="")?"":(":"+this.port)) +
			 	 this.pathname + this.search + this.hash;
		},
		get pathname(){
			var m = this.href;
			m = pathname.exec(m.substring(m.indexOf(this.hostname)));
			return m&&m.length>1?m[1]:"/";
		},
		set pathname(_pathname){
			this.href = this.protocol + this.host + _pathname + 
				this.search + this.hash;
		},
		get port(){
			var m = port.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set port(_port){
			this.href = this.protocol + this.hostname + ":"+_port + this.pathname + 
				this.search + this.hash;
		},
		get protocol(){
			return protocol.exec(this.href)[0];
		},
		set protocol(_protocol){
			this.href = _protocol + this.host + this.pathname + 
				this.search + this.hash;
		},
		get search(){
			var m = search.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set search(_search){
			this.href = this.protocol + this.host + this.pathname + 
				_search + this.hash;
		}
  });

})();

$w.Anchor = Anchor;
$debug("Defining HTMLAreaElement");
/* 
* HTMLAreaElement - DOM Level 2
*/
var HTMLAreaElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLAreaElement.prototype = new HTMLElement;
__extend__(HTMLAreaElement.prototype, {
    get accessKey(){
        return this.getAttribute('accesskey');
    },
    set accessKey(value){
        this.setAttribute('accesskey',value);
    },
    get alt(){
        return this.getAttribute('alt');
    },
    set alt(value){
        this.setAttribute('alt',value);
    },
    get coords(){
        return this.getAttribute('coords');
    },
    set coords(value){
        this.setAttribute('coords',value);
    },
    get href(){
        return this.getAttribute('href');
    },
    set href(value){
        this.setAttribute('href',value);
    },
    get noHref(){
        return this.hasAttribute('href');
    },
    get shape(){
        //TODO
        return 0;
    },
    /*get tabIndex(){
        return this.getAttribute('tabindex');
    },
    set tabIndex(value){
        this.setAttribute('tabindex',value);
    },*/
    get target(){
        return this.getAttribute('target');
    },
    set target(value){
        this.setAttribute('target',value);
    }
});

$w.HTMLAreaElement = HTMLAreaElement;
			$debug("Defining HTMLBaseElement");
/* 
* HTMLBaseElement - DOM Level 2
*/
var HTMLBaseElement = function(ownerDocument) {
    //$log("creating anchor element");
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLBaseElement.prototype = new HTMLElement;
__extend__(HTMLBaseElement.prototype, {
    get href(){
        return this.getAttribute('href');
    },
    set href(value){
        this.setAttribute('href',value);
    },
    get target(){
        return this.getAttribute('target');
    },
    set target(value){
        this.setAttribute('target',value);
    }
});

$w.HTMLBaseElement = HTMLBaseElement;		$debug("Defining HTMLQuoteElement");
/* 
* HTMLQuoteElement - DOM Level 2
*/
var HTMLQuoteElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLQuoteElement.prototype = new HTMLElement;
__extend__(HTMLQuoteElement.prototype, {
    get cite(){
        return this.getAttribute('cite');
    },
    set cite(value){
        this.setAttribute('cite',value);
    }
});

$w.HTMLQuoteElement = HTMLQuoteElement;		$debug("Defining HTMLBodyElement");
/*
* HTMLBodyElement - DOM Level 2
*/
var HTMLBodyElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLBodyElement.prototype = new HTMLElement;
__extend__(HTMLBodyElement.prototype, {
    onload: function(event){
        __eval__(this.getAttribute('onload')||'', this)
    },
    onunload: function(event){
        __eval__(this.getAttribute('onunload')||'', this)
    }
});

$w.HTMLBodyElement = HTMLBodyElement;
$debug("Defining HTMLButtonElement");
/*
* HTMLButtonElement - DOM Level 2
*/
var HTMLButtonElement = function(ownerDocument) {
    this.HTMLTypeValueInputs = HTMLTypeValueInputs;
    this.HTMLTypeValueInputs(ownerDocument);
};
HTMLButtonElement.prototype = new HTMLTypeValueInputs;
__extend__(HTMLButtonElement.prototype, inputElements_status);
__extend__(HTMLButtonElement.prototype, {
    get dataFormatAs(){
        return this.getAttribute('dataFormatAs');
    },
    set dataFormatAs(value){
        this.setAttribute('dataFormatAs',value);
    }
});

$w.HTMLButtonElement = HTMLButtonElement;

$debug("Defining HTMLTableColElement");
/* 
* HTMLTableColElement - DOM Level 2
*/
var HTMLTableColElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLTableColElement.prototype = new HTMLElement;
__extend__(HTMLTableColElement.prototype, {
    get align(){
        return this.getAttribute('align');
    },
    set align(value){
        this.setAttribute('align', value);
    },
    get ch(){
        return this.getAttribute('ch');
    },
    set ch(value){
        this.setAttribute('ch', value);
    },
    get chOff(){
        return this.getAttribute('ch');
    },
    set chOff(value){
        this.setAttribute('ch', value);
    },
    get span(){
        return this.getAttribute('span');
    },
    set span(value){
        this.setAttribute('span', value);
    },
    get vAlign(){
        return this.getAttribute('valign');
    },
    set vAlign(value){
        this.setAttribute('valign', value);
    },
    get width(){
        return this.getAttribute('width');
    },
    set width(value){
        this.setAttribute('width', value);
    }
});

$w.HTMLTableColElement = HTMLTableColElement;
$debug("Defining HTMLModElement");
/* 
* HTMLModElement - DOM Level 2
*/
var HTMLModElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLModElement.prototype = new HTMLElement;
__extend__(HTMLModElement.prototype, {
    get cite(){
        return this.getAttribute('cite');
    },
    set cite(value){
        this.setAttribute('cite', value);
    },
    get dateTime(){
        return this.getAttribute('datetime');
    },
    set dateTime(value){
        this.setAttribute('datetime', value);
    }
});

$w.HTMLModElement = HTMLModElement;	/*
 * This file is a component of env.js,
 *     http://github.com/gleneivey/env-js/commits/master/README
 * a Pure JavaScript Browser Environment
 * Copyright 2009 John Resig, licensed under the MIT License
 *     http://www.opensource.org/licenses/mit-license.php
 */


$debug("Defining HTMLDivElement");
/*
* HTMLDivElement - DOM Level 2
*/
var HTMLDivElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLDivElement.prototype = new HTMLElement;
__extend__(HTMLDivElement.prototype, {
    get align(){
        return this.getAttribute('align') || 'left';
    },
    set align(value){
        this.setAttribute('align', value);
    }
});

$w.HTMLDivElement = HTMLDivElement;
$debug("Defining HTMLLegendElement");
/*
* HTMLLegendElement - DOM Level 2
*/
var HTMLLegendElement = function(ownerDocument) {
    this.HTMLInputCommon = HTMLInputCommon;
    this.HTMLInputCommon(ownerDocument);
};
HTMLLegendElement.prototype = new HTMLInputCommon;
__extend__(HTMLLegendElement.prototype, {
    get align(){
        return this.getAttribute('align');
    },
    set align(value){
        this.setAttribute('align',value);
    }
});

$w.HTMLLegendElement = HTMLLegendElement;
$debug("Defining HTMLFieldSetElement");
/*
* HTMLFieldSetElement - DOM Level 2
*/
var HTMLFieldSetElement = function(ownerDocument) {
    this.HTMLLegendElement = HTMLLegendElement;
    this.HTMLLegendElement(ownerDocument);
};
HTMLFieldSetElement.prototype = new HTMLLegendElement;
__extend__(HTMLFieldSetElement.prototype, {
    get margin(){
        return this.getAttribute('margin');
    },
    set margin(value){
        this.setAttribute('margin',value);
    }
});

$w.HTMLFieldSetElement = HTMLFieldSetElement;
$debug("Defining HTMLFormElement");
/* 
* HTMLFormElement - DOM Level 2
*/
var HTMLFormElement = function(ownerDocument){
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLFormElement.prototype = new HTMLElement;
__extend__(HTMLFormElement.prototype,{
    get acceptCharset(){ 
        return this.getAttribute('accept-charset');
        
    },
    set acceptCharset(acceptCharset){
        this.setAttribute('accept-charset', acceptCharset);
        
    },
    get action(){
        return this.getAttribute('action');
        
    },
    set action(action){
        this.setAttribute('action', action);
        
    },
    get elements() {
        return this.getElementsByTagName("*");
        
    },
    get enctype(){
        return this.getAttribute('enctype');
        
    },
    set enctype(enctype){
        this.setAttribute('enctype', enctype);
        
    },
    get length() {
        return this.elements.length;
        
    },
    get method(){
        return this.getAttribute('method');
        
    },
    set method(action){
        this.setAttribute('method', action);
        
    },
	get name() {
	    return this.getAttribute("name"); 
	    
    },
	set name(val) { 
	    return this.setAttribute("name",val); 
	    
    },
	get target() { 
	    return this.getAttribute("target"); 
	    
    },
	set target(val) { 
	    return this.setAttribute("target",val); 
	    
    },
	submit:function(){
	    __submit__(this);
	    
    },
	reset:function(){
	    __reset__(this);
	    
    },
    onsubmit:function(){
        if (__eval__(this.getAttribute('onsubmit')||'', this)) {
            this.submit();
        }
    },
    onreset:function(){
        if (__eval__(this.getAttribute('onreset')||'', this)) {
            this.reset();
        }
    }
});

$w.HTMLFormElement	= HTMLFormElement;$debug("Defining HTMLFrameElement");
/* 
* HTMLFrameElement - DOM Level 2
*/
var HTMLFrameElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLFrameElement.prototype = new HTMLElement;
__extend__(HTMLFrameElement.prototype, {
    get frameBorder(){
        return this.getAttribute('border')||"";
    },
    set frameBorder(value){
        this.setAttribute('border', value);
    },
    get longDesc(){
        return this.getAttribute('longdesc')||"";
    },
    set longDesc(value){
        this.setAttribute('longdesc', value);
    },
    get marginHeight(){
        return this.getAttribute('marginheight')||"";
    },
    set marginHeight(value){
        this.setAttribute('marginheight', value);
    },
    get marginWidth(){
        return this.getAttribute('marginwidth')||"";
    },
    set marginWidth(value){
        this.setAttribute('marginwidth', value);
    },
    get name(){
        return this.getAttribute('name')||"";
    },
    set name(value){
        this.setAttribute('name', value);
    },
    get noResize(){
        return this.getAttribute('noresize')||"";
    },
    set noResize(value){
        this.setAttribute('noresize', value);
    },
    get scrolling(){
        return this.getAttribute('scrolling')||"";
    },
    set scrolling(value){
        this.setAttribute('scrolling', value);
    },
    get src(){
        return this.getAttribute('src')||"";
    },
    set src(value){
        this.setAttribute('src', value);

        if (value && value.length > 0){
            $env.loadFrame(this, $env.location(value));
            
            var event = document.createEvent();
            event.initEvent("load");
            this.dispatchEvent( event, false );
        }
    },
    get contentDocument(){
        if (!this._content)
            return null;
        return this._content.document;
    },
    get contentWindow(){
        return this._content;
    },
    onload: function(event){
        __eval__(this.getAttribute('onload')||'', this)
    }
});

$w.HTMLFrameElement = HTMLFrameElement;
$debug("Defining HTMLFrameSetElement");
/* 
* HTMLFrameSetElement - DOM Level 2
*/
var HTMLFrameSetElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLFrameSetElement.prototype = new HTMLElement;
__extend__(HTMLFrameSetElement.prototype, {
    get cols(){
        return this.getAttribute('cols');
    },
    set cols(value){
        this.setAttribute('cols', value);
    },
    get rows(){
        return this.getAttribute('rows');
    },
    set rows(value){
        this.setAttribute('rows', value);
    }
});

$w.HTMLFrameSetElement = HTMLFrameSetElement;	$debug("Defining HTMLHeadElement");
/* 
* HTMLHeadElement - DOM Level 2
*/
var HTMLHeadElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLHeadElement.prototype = new HTMLElement;
__extend__(HTMLHeadElement.prototype, {
    get profile(){
        return this.getAttribute('profile');
    },
    set profile(value){
        this.setAttribute('profile', value);
    },
    //we override this so we can apply browser behavior specific to head children
    //like loading scripts
    appendChild : function(newChild) {
        var newChild = HTMLElement.prototype.appendChild.apply(this,[newChild]);
        //__evalScript__(newChild);
        return newChild;
    },
    insertBefore : function(newChild, refChild) {
        var newChild = HTMLElement.prototype.insertBefore.apply(this,[newChild]);
        //__evalScript__(newChild);
        return newChild;
    }
});

var __evalScript__ = function(newChild){
    //check to see if this is a script element and apply a script loading strategy
    //the check against the ownerDocument isnt really enough to support frames in
    // the long run, but for now it's ok
    if(newChild.nodeType == DOMNode.ELEMENT_NODE && 
        newChild.ownerDocument == window.document ){
        if(newChild.nodeName.toUpperCase() == "SCRIPT"){
            $debug("loading script via policy. ");
            $policy.loadScript(newChild);
        }
    }
};

$w.HTMLHeadElement = HTMLHeadElement;
$debug("Defining HTMLIFrameElement");
/* 
* HTMLIFrameElement - DOM Level 2
*/
var HTMLIFrameElement = function(ownerDocument) {
    this.HTMLFrameElement = HTMLFrameElement;
    this.HTMLFrameElement(ownerDocument);
};
HTMLIFrameElement.prototype = new HTMLFrameElement;
__extend__(HTMLIFrameElement.prototype, {
	get height() { 
	    return this.getAttribute("height") || ""; 
    },
	set height(val) { 
	    return this.setAttribute("height",val); 
    },
	get width() { 
	    return this.getAttribute("width") || ""; 
    },
	set width(val) { 
	    return this.setAttribute("width",val); 
    }
});

$w.HTMLIFrameElement = HTMLIFrameElement;
			$debug("Defining HTMLImageElement");
/* 
* HTMLImageElement - DOM Level 2
*/
var HTMLImageElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLImageElement.prototype = new HTMLElement;
__extend__(HTMLImageElement.prototype, {
    get alt(){
        return this.getAttribute('alt');
    },
    set alt(value){
        this.setAttribute('alt', value);
    },
    get height(){
        return this.getAttribute('height');
    },
    set height(value){
        this.setAttribute('height', value);
    },
    get isMap(){
        return this.hasAttribute('map');
    },
    set useMap(value){
        this.setAttribute('map', value);
    },
    get longDesc(){
        return this.getAttribute('longdesc');
    },
    set longDesc(value){
        this.setAttribute('longdesc', value);
    },
    get name(){
        return this.getAttribute('name');
    },
    set name(value){
        this.setAttribute('name', value);
    },
    get src(){
        return this.getAttribute('src');
    },
    set src(value){
        this.setAttribute('src', value);

        var event = document.createEvent();
        event.initEvent("load");
        this.dispatchEvent( event, false );
    },
    get width(){
        return this.getAttribute('width');
    },
    set width(value){
        this.setAttribute('width', value);
    },
    onload: function(event){
        __eval__(this.getAttribute('onload')||'', this)
    }
});

$w.HTMLImageElement = HTMLImageElement;$debug("Defining HTMLInputElement");
/*
* HTMLInputElement - DOM Level 2
*/
var HTMLInputElement = function(ownerDocument) {
    this.HTMLInputAreaCommon = HTMLInputAreaCommon;
    this.HTMLInputAreaCommon(ownerDocument);
};
HTMLInputElement.prototype = new HTMLInputAreaCommon;
__extend__(HTMLInputElement.prototype, {
    get alt(){
        return this.getAttribute('alt');
    },
    set alt(value){
        this.setAttribute('alt', value);
    },
    get checked(){
        return (this.getAttribute('checked')=='checked');
    },
    set checked(value){
        this.setAttribute('checked', (value ? 'checked' :''));
    },
    get defaultChecked(){
        return this.getAttribute('defaultChecked');
    },
    get height(){
        return this.getAttribute('height');
    },
    set height(value){
        this.setAttribute('height',value);
    },
    get maxLength(){
        return Number(this.getAttribute('maxlength')||'0');
    },
    set maxLength(value){
        this.setAttribute('maxlength', value);
    },
    get src(){
        return this.getAttribute('src');
    },
    set src(value){
        this.setAttribute('src', value);
    },
    get useMap(){
        return this.getAttribute('map');
    },
    get width(){
        return this.getAttribute('width');
    },
    set width(value){
        this.setAttribute('width',value);
    },
    click:function(){
        __click__(this);
    }
});

$w.HTMLInputElement = HTMLInputElement;

$debug("Defining HTMLLabelElement");
/* 
* HTMLLabelElement - DOM Level 2
*/
var HTMLLabelElement = function(ownerDocument) {
    this.HTMLInputCommon = HTMLInputCommon;
    this.HTMLInputCommon(ownerDocument);
};
HTMLLabelElement.prototype = new HTMLInputCommon;
__extend__(HTMLLabelElement.prototype, inputElements_dataProperties);
__extend__(HTMLLabelElement.prototype, {
    get htmlFor(){
        return this.getAttribute('for');
    },
    set htmlFor(value){
        this.setAttribute('for',value);
    },
    get dataFormatAs(){
        return this.getAttribute('dataFormatAs');
    },
    set dataFormatAs(value){
        this.setAttribute('dataFormatAs',value);
    }
});

$w.HTMLLabelElement = HTMLLabelElement;
/**
* Link - HTMLElement 
*/
$w.__defineGetter__("Link", function(){
  return function(){
    throw new Error("Object cannot be created in this context");
  };
});


$debug("Defining HTMLLinkElement");
/* 
* HTMLLinkElement - DOM Level 2
*/
var HTMLLinkElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLLinkElement.prototype = new HTMLElement;
__extend__(HTMLLinkElement.prototype, {
    get disabled(){
        return this.getAttribute('disabled');
    },
    set disabled(value){
        this.setAttribute('disabled',value);
    },
    get charset(){
        return this.getAttribute('charset');
    },
    set charset(value){
        this.setAttribute('charset',value);
    },
    get href(){
        return this.getAttribute('href');
    },
    set href(value){
        this.setAttribute('href',value);
    },
    get hreflang(){
        return this.getAttribute('hreflang');
    },
    set hreflang(value){
        this.setAttribute('hreflang',value);
    },
    get media(){
        return this.getAttribute('media');
    },
    set media(value){
        this.setAttribute('media',value);
    },
    get rel(){
        return this.getAttribute('rel');
    },
    set rel(value){
        this.setAttribute('rel',value);
    },
    get rev(){
        return this.getAttribute('rev');
    },
    set rev(value){
        this.setAttribute('rev',value);
    },
    get target(){
        return this.getAttribute('target');
    },
    set target(value){
        this.setAttribute('target',value);
    },
    get type(){
        return this.getAttribute('type');
    },
    set type(value){
        this.setAttribute('type',value);
    },
    onload: function(event){
        __eval__(this.getAttribute('onload')||'', this)
    }
});

$w.HTMLLinkElement = HTMLLinkElement;
$debug("Defining HTMLMapElement");
/* 
* HTMLMapElement - DOM Level 2
*/
var HTMLMapElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLMapElement.prototype = new HTMLElement;
__extend__(HTMLMapElement.prototype, {
    get areas(){
        return this.getElementsByTagName('area');
    },
    get name(){
        return this.getAttribute('name');
    },
    set name(value){
        this.setAttribute('name',value);
    }
});

$w.HTMLMapElement = HTMLMapElement;$debug("Defining HTMLMetaElement");
/* 
* HTMLMetaElement - DOM Level 2
*/
var HTMLMetaElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLMetaElement.prototype = new HTMLElement;
__extend__(HTMLMetaElement.prototype, {
    get content(){
        return this.getAttribute('content');
    },
    set content(value){
        this.setAttribute('content',value);
    },
    get httpEquiv(){
        return this.getAttribute('http-equiv');
    },
    set httpEquiv(value){
        this.setAttribute('http-equiv',value);
    },
    get name(){
        return this.getAttribute('name');
    },
    set name(value){
        this.setAttribute('name',value);
    },
    get scheme(){
        return this.getAttribute('scheme');
    },
    set scheme(value){
        this.setAttribute('scheme',value);
    }
});

$w.HTMLMetaElement = HTMLMetaElement;
$debug("Defining HTMLObjectElement");
/* 
* HTMLObjectElement - DOM Level 2
*/
var HTMLObjectElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLObjectElement.prototype = new HTMLElement;
__extend__(HTMLObjectElement.prototype, {
    get code(){
        return this.getAttribute('code');
    },
    set code(value){
        this.setAttribute('code',value);
    },
    get archive(){
        return this.getAttribute('archive');
    },
    set archive(value){
        this.setAttribute('archive',value);
    },
    get codeBase(){
        return this.getAttribute('codebase');
    },
    set codeBase(value){
        this.setAttribute('codebase',value);
    },
    get codeType(){
        return this.getAttribute('codetype');
    },
    set codeType(value){
        this.setAttribute('codetype',value);
    },
    get data(){
        return this.getAttribute('data');
    },
    set data(value){
        this.setAttribute('data',value);
    },
    get declare(){
        return this.getAttribute('declare');
    },
    set declare(value){
        this.setAttribute('declare',value);
    },
    get height(){
        return this.getAttribute('height');
    },
    set height(value){
        this.setAttribute('height',value);
    },
    get standby(){
        return this.getAttribute('standby');
    },
    set standby(value){
        this.setAttribute('standby',value);
    },
    /*get tabIndex(){
        return this.getAttribute('tabindex');
    },
    set tabIndex(value){
        this.setAttribute('tabindex',value);
    },*/
    get type(){
        return this.getAttribute('type');
    },
    set type(value){
        this.setAttribute('type',value);
    },
    get useMap(){
        return this.getAttribute('usemap');
    },
    set useMap(value){
        this.setAttribute('usemap',value);
    },
    get width(){
        return this.getAttribute('width');
    },
    set width(value){
        this.setAttribute('width',value);
    },
    get contentDocument(){
        return this.ownerDocument;
    }
});

$w.HTMLObjectElement = HTMLObjectElement;
			$debug("Defining HTMLOptGroupElement");
/* 
* HTMLOptGroupElement - DOM Level 2
*/
var HTMLOptGroupElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLOptGroupElement.prototype = new HTMLElement;
__extend__(HTMLOptGroupElement.prototype, {
    get disabled(){
        return this.getAttribute('disabled');
    },
    set disabled(value){
        this.setAttribute('disabled',value);
    },
    get label(){
        return this.getAttribute('label');
    },
    set label(value){
        this.setAttribute('label',value);
    },
});

$w.HTMLOptGroupElement = HTMLOptGroupElement;		$debug("Defining HTMLOptionElement");
/*
* HTMLOptionElement - DOM Level 2
*/
var HTMLOptionElement = function(ownerDocument) {
    this.HTMLInputCommon = HTMLInputCommon;
    this.HTMLInputCommon(ownerDocument);
};
HTMLOptionElement.prototype = new HTMLInputCommon;
__extend__(HTMLOptionElement.prototype, {
    get defaultSelected(){
        return this.getAttribute('defaultSelected');
    },
    set defaultSelected(value){
        this.setAttribute('defaultSelected',value);
    },
    get index(){
        var options = this.parent.childNodes;
        for(var i; i<options.length;i++){
            if(this == options[i])
                return i;
        }
        return -1;
    },
    get label(){
        return this.getAttribute('label');
    },
    set label(value){
        this.setAttribute('label',value);
    },
    get selected(){
        return (this.getAttribute('selected')=='selected');
    },
    set selected(value){
        if(this.defaultSelected===null && this.selected!==null){
            this.defaultSelected = this.selected;
        }
        var selectedValue = (value ? 'selected' : '');
        if (this.getAttribute('selected') == selectedValue) {
            // prevent inifinite loops (option's selected modifies 
            // select's value which modifies option's selected)
            return;
        }
        this.setAttribute('selected', selectedValue);
        if (value) {
            // set select's value to this option's value (this also 
            // unselects previously selected value)
            this.parentNode.value = this.value;
        } else {
            // if no other option is selected, select the first option in the select
            var i, anythingSelected;
            for (i=0; i<this.parentNode.options.length; i++) {
                if (this.parentNode.options[i].selected) {
                    anythingSelected = true;
                    break;
                }
            }
            if (!anythingSelected) {
                this.parentNode.value = this.parentNode.options[0].value;
            }
        }

    },
    get text(){
         return ((this.nodeValue === null) ||  (this.nodeValue ===undefined)) ?
             this.innerHTML :
             this.nodeValue;
    },
    get value(){
        return ((this.getAttribute('value') === undefined) || (this.getAttribute('value') === null)) ?
            this.text :
            this.getAttribute('value');
    },
    set value(value){
        this.setAttribute('value',value);
    }
});

$w.HTMLOptionElement = HTMLOptionElement;
$debug("Defining HTMLParamElement");
/* 
* HTMLParamElement - DOM Level 2
*/
var HTMLParamElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLParamElement.prototype = new HTMLElement;
__extend__(HTMLParamElement.prototype, {
    get name(){
        return this.getAttribute('name');
    },
    set name(value){
        this.setAttribute('name',value);
    },
    get type(){
        return this.getAttribute('type');
    },
    set type(value){
        this.setAttribute('type',value);
    },
    get value(){
        return this.getAttribute('value');
    },
    set value(value){
        this.setAttribute('value',value);
    },
    get valueType(){
        return this.getAttribute('valuetype');
    },
    set valueType(value){
        this.setAttribute('valuetype',value);
    },
});

$w.HTMLParamElement = HTMLParamElement;
		$debug("Defining HTMLScriptElement");
/* 
* HTMLScriptElement - DOM Level 2
*/
var HTMLScriptElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLScriptElement.prototype = new HTMLElement;
__extend__(HTMLScriptElement.prototype, {
    get text(){
        // text of script is in a child node of the element
        // scripts with < operator must be in a CDATA node
        for (var i=0; i<this.childNodes.length; i++) {
            if (this.childNodes[i].nodeType == DOMNode.CDATA_SECTION_NODE) {
                return this.childNodes[i].nodeValue;
            }
        } 
        // otherwise there will be a text node containing the script
        if (this.childNodes[0] && this.childNodes[0].nodeType == DOMNode.TEXT_NODE) {
            return this.childNodes[0].nodeValue;
 		}
        return this.nodeValue;

    },
    set text(value){
        this.nodeValue = value;
        $env.loadInlineScript(this);
    },
    get htmlFor(){
        return this.getAttribute('for');
    },
    set htmlFor(value){
        this.setAttribute('for',value);
    },
    get event(){
        return this.getAttribute('event');
    },
    set event(value){
        this.setAttribute('event',value);
    },
    get charset(){
        return this.getAttribute('charset');
    },
    set charset(value){
        this.setAttribute('charset',value);
    },
    get defer(){
        return this.getAttribute('defer');
    },
    set defer(value){
        this.setAttribute('defer',value);
    },
    get src(){
        return this.getAttribute('src');
    },
    set src(value){
        this.setAttribute('src',value);
    },
    get type(){
        return this.getAttribute('type');
    },
    set type(value){
        this.setAttribute('type',value);
    },
    onload: function(event){
        __eval__(this.getAttribute('onload')||'', this);
    },
    onerror: function(event){
        __eval__(this.getAttribute('onerror')||'', this);
    }
});

$w.HTMLScriptElement = HTMLScriptElement;$debug("Defining HTMLSelectElement");
/*
* HTMLSelectElement - DOM Level 2
*/
var HTMLSelectElement = function(ownerDocument) {
    this.HTMLTypeValueInputs = HTMLTypeValueInputs;
    this.HTMLTypeValueInputs(ownerDocument);

    this._oldIndex = -1;
};
HTMLSelectElement.prototype = new HTMLTypeValueInputs;
__extend__(HTMLSelectElement.prototype, inputElements_dataProperties);
__extend__(HTMLButtonElement.prototype, inputElements_size);
__extend__(HTMLSelectElement.prototype, inputElements_onchange);
__extend__(HTMLSelectElement.prototype, inputElements_focusEvents);
__extend__(HTMLSelectElement.prototype, {

    // over-ride the value setter in HTMLTypeValueInputs
    set value(newValue) {
        var options = this.options,
            i, index;
        for (i=0; i<options.length; i++) {
            if (options[i].value == newValue) {
                index = i;
                break;
            }
        }
        if (index !== undefined) {
            this.setAttribute('value', newValue);
            this.selectedIndex = index;
        }
    },
    get value() {
        var value = this.getAttribute('value');
        if (value === undefined || value === null) {
            var index = this.selectedIndex;
            return (index != -1) ? this.options[index].value : "";
        } else {
            return value;
        }
    },


    get length(){
        return this.options.length;
    },
    get multiple(){
        return this.getAttribute('multiple');
    },
    set multiple(value){
        this.setAttribute('multiple',value);
    },
    get options(){
        return this.getElementsByTagName('option');
    },
    get selectedIndex(){
        var options = this.options;
        for(var i=0;i<options.length;i++){
            if(options[i].selected){
                return i;
            }
        };
        return -1;
    },
    
    set selectedIndex(value) {
        var i;
        for (i=0; i<this.options.length; i++) {
            this.options[i].selected = (i == Number(value));
        }
    },
    get type(){
        var type = this.getAttribute('type');
        return type?type:'select-one';
    },

    add : function(){
        __add__(this);
    },
    remove : function(){
        __remove__(this);
    }
});

$w.HTMLSelectElement = HTMLSelectElement;

$debug("Defining HTMLStyleElement");
/* 
* HTMLStyleElement - DOM Level 2
*/
var HTMLStyleElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLStyleElement.prototype = new HTMLElement;
__extend__(HTMLStyleElement.prototype, {
    get disabled(){
        return this.getAttribute('disabled');
    },
    set disabled(value){
        this.setAttribute('disabled',value);
    },
    get media(){
        return this.getAttribute('media');
    },
    set media(value){
        this.setAttribute('media',value);
    },
    get type(){
        return this.getAttribute('type');
    },
    set type(value){
        this.setAttribute('type',value);
    }
});

$w.HTMLStyleElement = HTMLStyleElement;$debug("Defining HTMLTableElement");
/* 
* HTMLTableElement - DOM Level 2
* Implementation Provided by Steven Wood
*/
var HTMLTableElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);

};

HTMLTableElement.prototype = new HTMLElement;
__extend__(HTMLTableElement.prototype, {
    
        get tFoot() { 
        //tFoot returns the table footer.
        return this.getElementsByTagName("tfoot")[0];
    },
    
    createTFoot : function () {
        var tFoot = this.tFoot;
       
        if (!tFoot) {
            tFoot = document.createElement("tfoot");
            this.appendChild(tFoot);
        }
        
        return tFoot;
    },
    
    deleteTFoot : function () {
        var foot = this.tFoot;
        if (foot) {
            foot.parentNode.removeChild(foot);
        }
    },
    
    get tHead() { 
        //tHead returns the table head.
        return this.getElementsByTagName("thead")[0];
    },
    
    createTHead : function () {
        var tHead = this.tHead;
       
        if (!tHead) {
            tHead = document.createElement("thead");
            this.insertBefore(tHead, this.firstChild);
        }
        
        return tHead;
    },
    
    deleteTHead : function () {
        var head = this.tHead;
        if (head) {
            head.parentNode.removeChild(head);
        }
    },
 
    appendChild : function (child) {
        
        var tagName;
        if(child&&child.nodeType==DOMNode.ELEMENT_NODE){
            tagName = child.tagName.toLowerCase();
            if (tagName === "tr") {
                // need an implcit <tbody> to contain this...
                if (!this.currentBody) {
                    this.currentBody = document.createElement("tbody");
                
                    DOMNode.prototype.appendChild.apply(this, [this.currentBody]);
                }
              
                return this.currentBody.appendChild(child); 
       
            } else if (tagName === "tbody" || tagName === "tfoot" && this.currentBody) {
                this.currentBody = child;
                return DOMNode.prototype.appendChild.apply(this, arguments);  
                
            } else {
                return DOMNode.prototype.appendChild.apply(this, arguments);
            }
        }else{
            //tables can still have text node from white space
            return DOMNode.prototype.appendChild.apply(this, arguments);
        }
    },
     
    get tBodies() {
        return new HTMLCollection(this.getElementsByTagName("tbody"));
        
    },
    
    get rows() {
        return new HTMLCollection(this.getElementsByTagName("tr"));
    },
    
    insertRow : function (idx) {
        if (idx === undefined) {
            throw new Error("Index omitted in call to HTMLTableElement.insertRow ");
        }
        
        var rows = this.rows, 
            numRows = rows.length,
            node,
            inserted, 
            lastRow;
        
        if (idx > numRows) {
            throw new Error("Index > rows.length in call to HTMLTableElement.insertRow");
        }
        
        var inserted = document.createElement("tr");
        // If index is -1 or equal to the number of rows, 
        // the row is appended as the last row. If index is omitted 
        // or greater than the number of rows, an error will result
        if (idx === -1 || idx === numRows) {
            this.appendChild(inserted);
        } else {
            rows[idx].parentNode.insertBefore(inserted, rows[idx]);
        }

        return inserted;
    },
    
    deleteRow : function (idx) {
        var elem = this.rows[idx];
        elem.parentNode.removeChild(elem);
    },
    
    get summary() {
        return this.getAttribute("summary");
    },
    
    set summary(summary) {
        this.setAttribute("summary", summary);
    },
    
    get align() {
        return this.getAttribute("align");
    },
    
    set align(align) {
        this.setAttribute("align", align);
    },
    
     
    get bgColor() {
        return this.getAttribute("bgColor");
    },
    
    set bgColor(bgColor) {
        return this.setAttribute("bgColor", bgColor);
    },
   
    get cellPadding() {
        return this.getAttribute("cellPadding");
    },
    
    set cellPadding(cellPadding) {
        return this.setAttribute("cellPadding", cellPadding);
    },
    
    
    get cellSpacing() {
        return this.getAttribute("cellSpacing");
    },
    
    set cellSpacing(cellSpacing) {
        this.setAttribute("cellSpacing", cellSpacing);
    },

    get frame() {
        return this.getAttribute("frame");
    },
    
    set frame(frame) { 
        this.setAttribute("frame", frame);
    },
    
    get rules() {
        return this.getAttribute("rules");
    }, 
    
    set rules(rules) {
        this.setAttribute("rules", rules);
    }, 
    
    get width() {
        return this.getAttribute("width");
    },
    
    set width(width) {
        this.setAttribute("width", width);
    }
    
});

$w.HTMLTableElement = HTMLTableElement;		$debug("Defining HTMLTableSectionElement");
/* 
* HTMLxElement - DOM Level 2
* - Contributed by Steven Wood
*/
var HTMLTableSectionElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLTableSectionElement.prototype = new HTMLElement;
__extend__(HTMLTableSectionElement.prototype, {    
    
    appendChild : function (child) {
    
        // disallow nesting of these elements.
        if (child.tagName.match(/TBODY|TFOOT|THEAD/)) {
            return this.parentNode.appendChild(child);
        } else {
            return DOMNode.prototype.appendChild.apply(this, arguments);
        }

    },
    
    get align() {
        return this.getAttribute("align");
    },

    get ch() {
        return this.getAttribute("ch");
    },
     
    set ch(ch) {
        this.setAttribute("ch", ch);
    },
    
    // ch gets or sets the alignment character for cells in a column. 
    set chOff(chOff) {
        this.setAttribute("chOff", chOff);
    },
     
    get chOff(chOff) {
        return this.getAttribute("chOff");
    },
     
    get vAlign () {
         return this.getAttribute("vAlign");
    },
    
    get rows() {
        return new HTMLCollection(this.getElementsByTagName("tr"));
    },
    
    insertRow : function (idx) {
        if (idx === undefined) {
            throw new Error("Index omitted in call to HTMLTableSectionElement.insertRow ");
        }
        
        var numRows = this.rows.length,
            node = null;
        
        if (idx > numRows) {
            throw new Error("Index > rows.length in call to HTMLTableSectionElement.insertRow");
        }
        
        var row = document.createElement("tr");
        // If index is -1 or equal to the number of rows, 
        // the row is appended as the last row. If index is omitted 
        // or greater than the number of rows, an error will result
        if (idx === -1 || idx === numRows) {
            this.appendChild(row);
        } else {
            node = this.firstChild;

            for (var i=0; i<idx; i++) {
                node = node.nextSibling;
            }
        }
            
        this.insertBefore(row, node);
        
        return row;
    },
    
    deleteRow : function (idx) {
        var elem = this.rows[idx];
        this.removeChild(elem);
    }

});

$w.HTMLTableSectionElement = HTMLTableSectionElement;
$debug("Defining HTMLTableCellElement");
/* 
* HTMLTableCellElement - DOM Level 2
* Implementation Provided by Steven Wood
*/
var HTMLTableCellElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLTableCellElement.prototype = new HTMLElement;
__extend__(HTMLTableCellElement.prototype, {
    
    
    // TODO :
    
});

$w.HTMLTableCellElement	= HTMLTableCellElement;$debug("Defining HTMLTextAreaElement");
/*
* HTMLTextAreaElement - DOM Level 2
*/
var HTMLTextAreaElement = function(ownerDocument) {
    this.HTMLInputAreaCommon = HTMLInputAreaCommon;
    this.HTMLInputAreaCommon(ownerDocument);
};
HTMLTextAreaElement.prototype = new HTMLInputAreaCommon;
__extend__(HTMLTextAreaElement.prototype, {
    get cols(){
        return this.getAttribute('cols');
    },
    set cols(value){
        this.setAttribute('cols', value);
    },
    get rows(){
        return this.getAttribute('rows');
    },
    set rows(value){
        this.setAttribute('rows', value);
    }
});

$w.HTMLTextAreaElement = HTMLTextAreaElement;
$debug("Defining HTMLTitleElement");
/* 
* HTMLTitleElement - DOM Level 2
*/
var HTMLTitleElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);
};
HTMLTitleElement.prototype = new HTMLElement;
__extend__(HTMLTitleElement.prototype, {
    get text() {
        return this.innerText;
    },

    set text(titleStr) {
        this.innerHTML = titleStr; // if paranoid, would error on embedded HTML
    }
});

$w.HTMLTitleElement = HTMLTitleElement;
$debug("Defining HTMLTableRowElement");
/* 
* HTMLRowElement - DOM Level 2
* Implementation Provided by Steven Wood
*/
var HTMLTableRowElement = function(ownerDocument) {
    this.HTMLElement = HTMLElement;
    this.HTMLElement(ownerDocument);

};
HTMLTableRowElement.prototype = new HTMLElement;
__extend__(HTMLTableRowElement.prototype, {
    
    appendChild : function (child) {
    
       var retVal = DOMNode.prototype.appendChild.apply(this, arguments);
       retVal.cellIndex = this.cells.length -1;
             
       return retVal;
    },
    // align gets or sets the horizontal alignment of data within cells of the row.
    get align() {
        return this.getAttribute("align");
    },
     
    get bgColor() {
        return this.getAttribute("bgcolor");
    },
         
    get cells() {
        var nl = this.getElementsByTagName("td");
        return new HTMLCollection(nl);
    },
       
    get ch() {
        return this.getAttribute("ch");
    },
     
    set ch(ch) {
        this.setAttribute("ch", ch);
    },
    
    // ch gets or sets the alignment character for cells in a column. 
    set chOff(chOff) {
        this.setAttribute("chOff", chOff);
    },
     
    get chOff(chOff) {
        return this.getAttribute("chOff");
    },
   
    get rowIndex() {
        var nl = this.parentNode.childNodes;
        for (var i=0; i<nl.length; i++) {
            if (nl[i] === this) {
                return i;
            }
        }
    },

    get sectionRowIndex() {
        var nl = this.parentNode.getElementsByTagName(this.tagName);
        for (var i=0; i<nl.length; i++) {
            if (nl[i] === this) {
                return i;
            }
        }
    },
     
    get vAlign () {
         return this.getAttribute("vAlign");
    },

    insertCell : function (idx) {
        if (idx === undefined) {
            throw new Error("Index omitted in call to HTMLTableRow.insertCell");
        }
        
        var numCells = this.cells.length,
            node = null;
        
        if (idx > numCells) {
            throw new Error("Index > rows.length in call to HTMLTableRow.insertCell");
        }
        
        var cell = document.createElement("td");

        if (idx === -1 || idx === numCells) {
            this.appendChild(cell);
        } else {
            

            node = this.firstChild;

            for (var i=0; i<idx; i++) {
                node = node.nextSibling;
            }
        }
            
        this.insertBefore(cell, node);
        cell.cellIndex = idx;
          
        return cell;
    },

    
    deleteCell : function (idx) {
        var elem = this.cells[idx];
        this.removeChild(elem);
    }

});

$w.HTMLTableRowElement = HTMLTableRowElement;
$debug("Defining SVGDocument");
/*
* SVGDocument - DOM Level 2
*/
/**
 * @class  SVGDocument - The Document interface represents the entire SVG or XML document.
 *   Conceptually, it is the root of the document tree, and provides the primary access to the document's data.
 *
 * @extends DOMDocument
 */
var SVGDocument = function() {
  throw new Error("SVGDocument() not implemented");
};
SVGDocument.prototype = new DOMDocument;
__extend__(SVGDocument.prototype, {
  createElement: function(tagName){
    $debug("SVGDocument.createElement( "+tagName+" )");
    var node;
    if(tagName === "rect") {node = new SVGRectElement(this);}
    else {node = new SVGSVGElement(this);}
    node.tagName  = tagName;
    return node;
  }});

$w.SVGDocument = SVGDocument;
$debug("Defining SVGElement");
/*
* SVGElement - DOM Level 2
*/
var SVGElement = function(ownerDocument,name) {
    DOMElement.apply(this,arguments);
};

SVGElement.prototype = new DOMElement;
__extend__(SVGElement.prototype, {
    toString : function(){
        return "SVGElement #"+this._id + " "+ this.tagName + (this.id?" => "+this.id:'');
    }
});

$w.SVGElement = SVGElement;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGAnimatedString");
var SVGAnimatedString = function() {
    this.__baseVal__ = "";
};

__extend__(SVGAnimatedString.prototype, {
    get baseVal() {
        return this.__baseVal__;
    },
    set baseVal(v) {
        this.__baseVal__ = v;
        this.__callback__ && this.__callback__(v);
    },
    toString : function(){
        return "SVGAnimatedString "+this.baseVal;
    }
});

$w.SVGAnimatedString = SVGAnimatedString;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGStylable");
/*
* SVGStylable - DOM Level 2
*/
var SVGStylable = function(ownerDocument,name) {
    var self = this;
    (this.__className__ = new SVGAnimatedString).__callback__ = function(v) {
        SVGElement.prototype.setAttribute.call(self,"class",v);
    };
};

SVGStylable.prototype = {};
__extend__(SVGStylable.prototype, {
    setAttribute: function(k,v) {
        if(k === "class") {
            this.__className__.__baseVal__ = v;
        }
        SVGElement.prototype.setAttribute.apply(this,arguments);
    },
    removeAttribute: function(k) {
        if(k === "class") {
            this.__className__.baseVal = "";
        }
        SVGElement.prototype.removeAttribute.apply(this,arguments);
    },
    setAttributeNS: function(ns,k,v) {
        if(k === "class") {
            this.__className__.__baseVal__ = v;
        }
        SVGElement.prototype.setAttributeNS.apply(this,arguments);
    },
    removeAttributeNS: function(ns,k) {
        if(k === "class") {
            this.__className__.baseVal = "";
        }
        SVGElement.prototype.removeAttributeNS.apply(this,arguments);
    },
	get className() { 
		return this.__className__;
	}
});

$w.SVGStylable = SVGStylable;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGRect");
var SVGRect = function(x,y,width,height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
};
SVGRect.prototype = {};
__extend__(SVGRect.prototype, {
});

$w.SVGRect = SVGRect;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGLocatable");
var SVGLocatable = function() {
};
SVGLocatable.prototype = {};
__extend__(SVGLocatable.prototype, {
    getBBox: function() {
        return new SVGRect(0,0,1,1);
    }
});

$w.SVGLocatable = SVGLocatable;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGTransformable");
var SVGTransformable = function() {
    SVGLocatable.apply(this,arguments);
};
SVGTransformable.prototype = new SVGLocatable;
__extend__(SVGLocatable.prototype, {
});

$w.SVGTransformable = SVGTransformable;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGSVGElement");
/*
* SVGSVGElement - DOM Level 2
*/
var SVGSVGElement = function(ownerDocument) {
    SVGElement.apply(this,arguments);
    SVGStylable.apply(this,arguments);
};

SVGSVGElement.prototype = new SVGElement;
__extend__(SVGSVGElement.prototype, SVGStylable.prototype );
__extend__(SVGSVGElement.prototype, {
});
SVGSVGElement.prototype.constructor = SVGSVGElement;

$w.SVGSVGElement = SVGSVGElement;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
$debug("Defining SVGRectElement");
/*
* SVGRectElement - DOM Level 2
*/
var SVGRectElement = function(ownerDocument) {
    SVGElement.apply(this,arguments);
    SVGStylable.apply(this,arguments);
    SVGTransformable.apply(this,arguments);
};

SVGRectElement.prototype = new SVGElement;
__extend__(SVGRectElement.prototype, SVGStylable.prototype );
__extend__(SVGRectElement.prototype, SVGTransformable.prototype );
__extend__(SVGRectElement.prototype, {
});
SVGRectElement.prototype.constructor = SVGRectElement;

$w.SVGRectElement = SVGRectElement;

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
/**
 * @author thatcher
 */
$debug("Defining XMLSerializer");
/*
* XMLSerializer 
*/
$w.__defineGetter__("XMLSerializer", function(){
    return new XMLSerializer(arguments);
});

var XMLSerializer = function() {

};
__extend__(XMLSerializer.prototype, {
    serializeToString: function(node){
        return node.xml;
    }
});/**
 * @author thatcher
 */
$debug("Defining XPathExpression");
/*
* XPathExpression 
*/
$w.__defineGetter__("XPathExpression", function(){
    return XPathExpression;
});

var XPathExpression = function() {};
__extend__(XPathExpression.prototype, {
    evaluate: function(){
        //TODO for now just return an empty XPathResult
        return new XPathResult();        
    }
});/**
 * @author thatcher
 */
$debug("Defining XPathResult");
/*
* XPathResult 
*/
$w.__defineGetter__("XPathResult", function(){
    return XPathResult;
});

var XPathResult = function() {
    this.snapshotLength = 0;
    this.stringValue = '';
};

__extend__( XPathResult, {
    ANY_TYPE:                     0,
    NUMBER_TYPE:                  1,
    STRING_TYPE:                  2,
    BOOLEAN_TYPE:                 3,
    UNORDERED_NODE_ITERATOR_TYPE: 4,
    ORDERED_NODEITERATOR_TYPE:    5,
    UNORDERED_NODE_SNAPSHOT_TYPE: 6,
    ORDERED_NODE_SNAPSHOT_TYPE:   7,
    ANY_ORDERED_NODE_TYPE:        8,
    FIRST_ORDERED_NODE_TYPE:      9
});

__extend__(XPathResult.prototype, {
    get booleanValue(){
      //TODO  
    },
    get invalidIteration(){
        //TODO
    },
    get numberValue(){
        //TODO
    },
    get resultType(){
        //TODO
    },
    get singleNodeValue(){
        //TODO
    },
    iterateNext: function(){
        //TODO
    },
    snapshotItem: function(index){
        //TODO
    }
});

/**
 * @author thatcher
 */

$w.__defineGetter__("XSLTProcessor", function(){
    return new XSLTProcessor(arguments);
});

var XSLTProcessor = function() {
    this.__stylesheet__ = null;
};
__extend__(XSLTProcessor.prototype, {
    clearParameters: function(){
        //TODO
    },
    getParameter: function(nsuri, name){
        //TODO
    },
    importStyleSheet: function(stylesheet){
        this.__stylesheet__ = stylesheet;
    },
    removeParameter: function(nsuri, name){
        //TODO
    },
    reset: function(){
        //TODO
    },
    setParameter: function(nsuri, name, value){
        //TODO
    },
    transformToDocument: function(sourceNode){
        return xsltProcess(sourceNode, this.__stylesheet__);
    },
    transformToFragment: function(sourceNode, ownerDocument){
        return xsltProcess(sourceNode, this.__stylesheet__).childNodes;
    }
});$debug("Defining Event");
/*
* event.js
*/
var Event = function(options){
      options={};
  __extend__(this,{
    CAPTURING_PHASE : 1,
    AT_TARGET       : 2,
    BUBBLING_PHASE  : 3
  });
  $debug("Creating new Event");
  var $bubbles = options.bubbles?options.bubbles:true,
      $cancelable = options.cancelable?options.cancelable:true,
      $currentTarget = options.currentTarget?options.currentTarget:null,
      $eventPhase = options.eventPhase?options.eventPhase:Event.CAPTURING_PHASE,
      $target = options.target?options.target:null,
      $timestamp = options.timestamp?options.timestamp:new Date().getTime().toString(),
      $type = options.type?options.type:"";
  return __extend__(this,{
    get bubbles(){return $bubbles;},
    get cancelable(){return $cancelable;},
    get currentTarget(){return $currentTarget;},
    get eventPhase(){return $eventPhase;},
    get target(){return $target;},
    set target(target){ $target = target;},
    get timestamp(){return $timestamp;},
    get type(){return $type;},
    initEvent: function(type,bubbles,cancelable){
      $type=type?type:$type;
      $bubbles=bubbles?bubbles:$bubbles;
      $cancelable=cancelable?cancelable:$cancelable;
    },
    preventDefault: function(){return;/* TODO */},
    stopPropagation: function(){return;/* TODO */}
  });
};

$w.Event = Event;
$debug("Defining MouseEvent");
/*
*	mouseevent.js
*/
$debug("Defining UiEvent");
/*
*	uievent.js
*/

var $onblur,
    $onfocus,
    $onresize;/*
* CSS2Properties - DOM Level 2 CSS
*/
var CSS2Properties = function(element){
    //this.onSetCallback = options.onSet?options.onSet:(function(){});
    this.styleIndex = __supportedStyles__();
    this.nameMap = {};
    this.__previous__ = {};
    this.__element__ = element;
    __cssTextToStyles__(this, element.getAttribute('style')||'');
};
__extend__(CSS2Properties.prototype, {
    get cssText(){
        var css = '';
        for(var i=0;i<this.length;i++){
            css+=this[i]+":"+this.getPropertyValue(this[i])+';'
        }
        return css;
    },
    set cssText(cssText){ 
        __cssTextToStyles__(this, cssText); 
    },
    getPropertyCSSValue : function(name){
        //?
    },
    getPropertyPriority : function(){
        
    },
    getPropertyValue : function(name){
        if(name in this.styleIndex){
            //$info(name +' in style index');
            return this[name];
        }else if(name in this.nameMap){
            return this[__toCamelCase__(name)];
        }
        //$info(name +' not found');
        return null;
    },
    item : function(index){
        return this[index];
    },
    removeProperty: function(name){
        this.styleIndex[name] = null;
    },
    setProperty: function(name, value){
        //$info('setting css property '+name+' : '+value);
        name = __toCamelCase__(name);
        if(name in this.styleIndex){
            //$info('setting camel case css property ');
            if (value!==undefined){
                this.styleIndex[name] = value;
            }
            if(name!==__toDashed__(name)){
                //$info('setting dashed name css property ');
                name = __toDashed__(name);
                this[name] = value;
                if(!(name in this.nameMap)){
                    Array.prototype.push.apply(this, [name]);
                    this.nameMap[name] = this.length;
                }
                
            }
        }
        //$info('finished setting css property '+name+' : '+value);
    },
    toString:function(){
        if (this.length >0){
            return "{\n\t"+Array.prototype.join.apply(this,[';\n\t'])+"}\n";
        }else{
            return '';
        }
    }
});



var __cssTextToStyles__ = function(css2props, cssText){
    //var styleArray=[];
    var style, styles = cssText.split(';');
    for ( var i = 0; i < styles.length; i++ ) {
        //$log("Adding style property " + styles[i]);
    	style = styles[i].split(':');
        //$log(" style  " + style[0]);
    	if ( style.length == 2 ){
            //$log(" value  " + style[1]);
    	    css2props.setProperty( style[0].replace(" ",'','g'), style[1].replace(" ",'','g'));
    	}
    }
};

var __toCamelCase__ = function(name) {
    //$info('__toCamelCase__'+name);
    if(name){
    	return name.replace(/\-(\w)/g, function(all, letter){
    		return letter.toUpperCase();
    	});
    }
    return name;
};

var __toDashed__ = function(camelCaseName) {
    //$info("__toDashed__"+camelCaseName);
    if(camelCaseName){
    	return camelCaseName.replace(/[A-Z]/g, function(all) {
    		return "-" + all.toLowerCase();
    	});
    }
    return camelCaseName;
};

//Obviously these arent all supported but by commenting out various sections
//this provides a single location to configure what is exposed as supported.
var __supportedStyles__ = function(){
    return {
        azimuth:                null,
        background:	            null,
        backgroundAttachment:	null,
        backgroundColor:	    null,
        backgroundImage:	    null,
        backgroundPosition:	    null,
        backgroundRepeat:	    null,
        border:	                null,
        borderBottom:	        null,
        borderBottomColor:	    null,
        borderBottomStyle:	    null,
        borderBottomWidth:	    null,
        borderCollapse:	        null,
        borderColor:	        null,
        borderLeft:	            null,
        borderLeftColor:	    null,
        borderLeftStyle:	    null,
        borderLeftWidth:	    null,
        borderRight:	        null,
        borderRightColor:	    null,
        borderRightStyle:	    null,
        borderRightWidth:	    null,
        borderSpacing:	        null,
        borderStyle:	        null,
        borderTop:	            null,
        borderTopColor:	        null,
        borderTopStyle:	        null,
        borderTopWidth:	        null,
        borderWidth:	        null,
        bottom:	                null,
        captionSide:	        null,
        clear:	                null,
        clip:	                null,
        color:	                null,
        content:	            null,
        counterIncrement:	    null,
        counterReset:	        null,
        cssFloat:	            null,
        cue:	                null,
        cueAfter:	            null,
        cueBefore:	            null,
        cursor:	                null,
        direction:	            'ltr',
        display:	            null,
        elevation:	            null,
        emptyCells:	            null,
        font:	                null,
        fontFamily:	            null,
        fontSize:	            "1em",
        fontSizeAdjust:	null,
        fontStretch:	null,
        fontStyle:	null,
        fontVariant:	null,
        fontWeight:	null,
        height:	'1px',
        left:	null,
        letterSpacing:	null,
        lineHeight:	null,
        listStyle:	null,
        listStyleImage:	null,
        listStylePosition:	null,
        listStyleType:	null,
        margin:	null,
        marginBottom:	"0px",
        marginLeft:	"0px",
        marginRight:	"0px",
        marginTop:	"0px",
        markerOffset:	null,
        marks:	null,
        maxHeight:	null,
        maxWidth:	null,
        minHeight:	null,
        minWidth:	null,
        opacity:	1,
        orphans:	null,
        outline:	null,
        outlineColor:	null,
        outlineOffset:	null,
        outlineStyle:	null,
        outlineWidth:	null,
        overflow:	null,
        overflowX:	null,
        overflowY:	null,
        padding:	null,
        paddingBottom:	"0px",
        paddingLeft:	"0px",
        paddingRight:	"0px",
        paddingTop:	"0px",
        page:	null,
        pageBreakAfter:	null,
        pageBreakBefore:	null,
        pageBreakInside:	null,
        pause:	null,
        pauseAfter:	null,
        pauseBefore:	null,
        pitch:	null,
        pitchRange:	null,
        position:	null,
        quotes:	null,
        richness:	null,
        right:	null,
        size:	null,
        speak:	null,
        speakHeader:	null,
        speakNumeral:	null,
        speakPunctuation:	null,
        speechRate:	null,
        stress:	null,
        tableLayout:	null,
        textAlign:	null,
        textDecoration:	null,
        textIndent:	null,
        textShadow:	null,
        textTransform:	null,
        top:	null,
        unicodeBidi:	null,
        verticalAlign:	null,
        visibility:	null,
        voiceFamily:	null,
        volume:	null,
        whiteSpace:	null,
        widows:	null,
        width:	'1px',
        wordSpacing:	null,
        zIndex:	1
    };
};

var __displayMap__ = {
		"DIV"      : "block",
		"P"        : "block",
		"A"        : "inline",
		"CODE"     : "inline",
		"PRE"      : "block",
		"SPAN"     : "inline",
		"TABLE"    : "table",
		"THEAD"    : "table-header-group",
		"TBODY"    : "table-row-group",
		"TR"       : "table-row",
		"TH"       : "table-cell",
		"TD"       : "table-cell",
		"UL"       : "block",
		"LI"       : "list-item"
};
var __styleMap__ = __supportedStyles__();

for(var style in __supportedStyles__()){
    (function(name){
        if(name === 'width' || name === 'height'){
            CSS2Properties.prototype.__defineGetter__(name, function(){
                if(this.display==='none'){
                    return '0px';
                }
                //$info(name+' = '+this.getPropertyValue(name));
                return this.styleIndex[name];
            });
        }else if(name === 'display'){
            //display will be set to a tagName specific value if ""
            CSS2Properties.prototype.__defineGetter__(name, function(){
                var val = this.styleIndex[name];
                val = val?val:__displayMap__[this.__element__.tagName];
                //$log(" css2properties.get  " + name + "="+val+" for("+this.__element__.tagName+")");
                return val;
            });
        }else{
            CSS2Properties.prototype.__defineGetter__(name, function(){
                //$log(" css2properties.get  " + name + "="+this.styleIndex[name]);
                return this.styleIndex[name];
            });
       }
       CSS2Properties.prototype.__defineSetter__(name, function(value){
           //$log(" css2properties.set  " + name +"="+value);
           this.setProperty(name, value);
       });
    })(style);
};


$w.CSS2Properties = CSS2Properties;/* 
* CSSRule - DOM Level 2
*/
var CSSRule = function(options){
  var $style, 
      $selectorText = options.selectorText?options.selectorText:"";
      $style = new CSS2Properties({
          cssText:options.cssText?options.cssText:null
      });
    return __extend__(this, {
      get style(){
          return $style;
      },
      get selectorText(){
          return $selectorText;
      },
      set selectorText(selectorText){
          $selectorText = selectorText;
      }
    });
};
$w.CSSRule = CSSRule;
/* 
* CSSStyleSheet - DOM Level 2
*/
var CSSStyleSheet = function(options){
    var $cssRules, 
        $disabled = options.disabled?options.disabled:false,
        $href = options.href?options.href:null,
        $parentStyleSheet = options.parentStyleSheet?options.parentStyleSheet:null,
        $title = options.title?options.title:"",
        $type = "text/css";
        
    function parseStyleSheet(text){
        $debug("parsing css");
        //this is pretty ugly, but text is the entire text of a stylesheet
        var cssRules = [];
    	if (!text) text = "";
    	text = trim(text.replace(/\/\*(\r|\n|.)*\*\//g,""));
    	// TODO: @import ?
    	var blocks = text.split("}");
    	blocks.pop();
    	var i, len = blocks.length;
    	var definition_block, properties, selectors;
    	for (i=0; i<len; i++){
    		definition_block = blocks[i].split("{");
    		if(definition_block.length === 2){
      		selectors = definition_block[0].split(",");
      		for(var j=0;j<selectors.length;j++){
      		  cssRules.push(new CSSRule({
      		    selectorText:selectors[j],
      		    cssText:definition_block[1]
      		  }));
      		}
      		__setArray__($cssRules, cssRules);
    		}
    	}
    };
    parseStyleSheet(options.text);
    return __extend__(this, {
      get cssRules(){return $cssRules;},
      get rule(){return $cssRules;},//IE - may be deprecated
      get href(){return $href;},
      get parentStyleSheet(){return $parentStyleSheet;},
      get title(){return $title;},
      get type(){return $type;},
      addRule: function(selector, style, index){/*TODO*/},
      deleteRule: function(index){/*TODO*/},
      insertRule: function(rule, index){/*TODO*/},
      removeRule: function(index){this.deleteRule(index);}//IE - may be deprecated
    });
};

$w.CSSStyleSheet = CSSStyleSheet;
/*
*	location.js
*   - requires env
*/
$debug("Initializing Window Location.");
//the current location
var $location = '';

$w.__defineSetter__("location", function(url){
  if( !$location || $location == "about:blank" ) {
    // $w.__loadAWindowsDocument__(url);
    $env.load(url);
  } else {
    $env.unload($w);
    var proxy = $w.window;
    $env.reload(proxy, url);
  }
});

$w.__defineGetter__("location", function(url){
	var hash 	 = new RegExp('(\\#.*)'),
		hostname = new RegExp('\/\/([^\:\/]+)'),
		pathname = new RegExp('(\/[^\\?\\#]*)'),
		port 	 = new RegExp('\:(\\d+)\/'),
		protocol = new RegExp('(^\\w*\:)'),
		search 	 = new RegExp('(\\?[^\\#]*)');
	return {
		get hash(){
			var m = hash.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set hash(_hash){
			//setting the hash is the only property of the location object
			//that doesn't cause the window to reload
			_hash = _hash.indexOf('#')===0?_hash:"#"+_hash;	
			$location = this.protocol + this.host + this.pathname + 
				this.search + _hash;
			setHistory(_hash, "hash");
		},
		get host(){
			return this.hostname + ((this.port !== "")?":"+this.port:"");
		},
		set host(_host){
			$w.location = this.protocol + _host + this.pathname + 
				this.search + this.hash;
		},
		get hostname(){
			var m = hostname.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set hostname(_hostname){
			$w.location = this.protocol + _hostname + ((this.port==="")?"":(":"+this.port)) +
			 	 this.pathname + this.search + this.hash;
		},
		get href(){
			//This is the only env specific function
			return $location;
		},
		set href(url){
			$w.location = url;	
		},
		get pathname(){
			var m = this.href;
			m = pathname.exec(m.substring(m.indexOf(this.hostname)));
			return m&&m.length>1?m[1]:"/";
		},
		set pathname(_pathname){
			$w.location = this.protocol + this.host + _pathname + 
				this.search + this.hash;
		},
		get port(){
			var m = port.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set port(_port){
			$w.location = this.protocol + this.hostname + ":"+_port + this.pathname + 
				this.search + this.hash;
		},
		get protocol(){
			return this.href && protocol.exec(this.href)[0];
		},
		set protocol(_protocol){
			$w.location = _protocol + this.host + this.pathname + 
				this.search + this.hash;
		},
		get search(){
			var m = search.exec(this.href);
			return m&&m.length>1?m[1]:"";
		},
		set search(_search){
			$w.location = this.protocol + this.host + this.pathname + 
				_search + this.hash;
		},
		toString: function(){
			return this.href;
		},
        reload: function(force){
            // ignore 'force': we don't implement a cache
            var thisWindow = $w;
            $env.unload(thisWindow);
            try { thisWindow = thisWindow.$thisWindowsProxyObject || thisWindow; }catch (e){}
            $env.reload($window, thisWindow.location.href);
        },
        replace: function(url){
            $location = url;
            $w.location.reload();
        }
    };
});

/*
*	history.js
*/

	$currentHistoryIndex = 0;
	$history = [];
	
	// Browser History
	$w.__defineGetter__("history", function(){	
		return {
			get length(){ return $history.length; },
			back : function(count){
				if(count){
					go(-count);
				}else{go(-1);}
			},
			forward : function(count){
				if(count){
					go(count);
				}else{go(1);}
			},
			go : function(target){
				if(typeof target == "number"){
					target = $currentHistoryIndex+target;
					if(target > -1 && target < $history.length){
						if($history[target].location == "hash"){
							$w.location.hash = $history[target].value;
						}else{
							$w.location = $history[target].value;
						}
						$currentHistoryIndex = target;
						//remove the last item added to the history
						//since we are moving inside the history
						$history.pop();
					}
				}else{
					//TODO: walk throu the history and find the 'best match'
				}
			}
		};
	});

	//Here locationPart is the particutlar method/attribute 
	// of the location object that was modified.  This allows us
	// to modify the correct portion of the location object
	// when we navigate the history
	var __setHistory__ = function( value, locationPart){
            if ( value == "about:blank" ) {
                return;
            }
	    $debug("adding value to history: " +value);
		$currentHistoryIndex++;
		$history.push({
			location: locationPart||"href",
			value: value
		});
	};

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// End:
/*
*	navigator.js
*   - requires env
*/
$debug("Initializing Window Navigator.");

var $appCodeName  = $env.appCodeName;//eg "Mozilla"
var $appName      = $env.appName;//eg "Gecko/20070309 Firefox/2.0.0.3"

// Browser Navigator
$w.__defineGetter__("navigator", function(){	
	return {
		get appCodeName(){
			return $appCodeName;
		},
		get appName(){
			return $appName;
		},
		get appVersion(){
			return $version +" ("+ 
			    $w.navigator.platform +"; "+
			    "U; "+//?
			    $env.os_name+" "+$env.os_arch+" "+$env.os_version+"; "+
			    $env.lang+"; "+
			    "rv:"+$revision+
			  ")";
		},
		get cookieEnabled(){
			return true;
		},
		get mimeTypes(){
			return [];
		},
		get platform(){
			return $env.platform;
		},
		get plugins(){
			return [];
		},
		get userAgent(){
			return $w.navigator.appCodeName + "/" + $w.navigator.appVersion + " " + $w.navigator.appName;
		},
		javaEnabled : function(){
			return $env.javaEnabled;	
		}
	};
});

/*
*	timer.js
*/

$debug("Initializing Window Timer.");

//private
var $timers = $master.timers = $master.timers || [];
var $event_loop_running = false;
$timers.lock = $env.sync(function(fn){fn();});

var $timer = function(fn, interval){
  this.fn = fn;
  this.interval = interval;
  this.at = Date.now() + interval;
  this.running = false; // allows for calling wait() from callbacks
  if ( false ) {
    try {
      throw new Error;
    } catch(e) {
      print(get_exception_trace(e));
    }
  }
};
  
$timer.prototype.start = function(){};
$timer.prototype.stop = function(){};

var convert_time = function(time) {
  time = time*1;
  if ( isNaN(time) || time < 0 ) {
    time = 0;
  }
  // html5 says this should be at least 4, but the parser is using a setTimeout for the SAX stuff
  // which messes up the world
  var min = /* 4 */ 0;
  if ( $event_loop_running && time < min ) {
    time = min;
  }
  return time;
}

$w.setTimeout = function(fn, time){
  var num;
  time = convert_time(time);
  $timers.lock(function(){
    num = $timers.length+1;
    var tfn;
    if (typeof fn == 'string') {
      tfn = function() {
        try {
          eval(fn);
        } catch (e) {
          $env.error(e);
        } finally {
          $w.clearInterval(num);
        }
      };
    } else {
      tfn = function() {
        try {
          fn();
        } catch (e) {
          $env.error(e);
        } finally {
          $w.clearInterval(num);
        }
      };
    }
    $debug("Creating timer number "+num);
    $timers[num] = new $timer(tfn, time);
    $timers[num].start();
  });
  return num;
};

$w.setInterval = function(fn, time){
  time = convert_time(time);
  if ( time < 10 ) {
    time = 10;
  }
  if (typeof fn == 'string') {
    var fnstr = fn; 
    fn = function() { 
      eval(fnstr);
    }; 
  }
  var num;
  $timers.lock(function(){
    num = $timers.length+1;
    //$debug("Creating timer number "+num);
    $timers[num] = new $timer(fn, time);
    $timers[num].start();
  });
  return num;
};

$w.clearInterval = $w.clearTimeout = function(num){
  //$log("clearing interval "+num);
  $timers.lock(function(){
    if ( $timers[num] ) {
      $timers[num].stop();
      delete $timers[num];
    }
  });
};	

// wait === null/undefined: execute any timers as they fire, waiting until there are none left
// wait(n) (n > 0): execute any timers as they fire until there are none left waiting at least n ms
// but no more, even if there are future events/current threads
// wait(0): execute any immediately runnable timers and return
// wait(-n): keep sleeping until the next event is more than n ms in the future

// FIX: make a priority queue ...

$w.$wait = $timers.wait = $env.wait = $env.wait || function(wait) {
  var delta_wait;
  if (wait < 0) {
    delta_wait = -wait;
    wait = 0;
  }
  var start = Date.now();
  var old_loop_running = $event_loop_running;
  $event_loop_running = true; 
  if (wait !== 0 && wait !== null && wait !== undefined){
    wait += Date.now();
  }
  for (;;) {
    var earliest;
    $timers.lock(function(){
      earliest = undefined;
      for(var i in $timers){
        if( isNaN(i*0) ) {
          continue;
        }
        var timer = $timers[i];
        if( !timer.running && ( !earliest || timer.at < earliest.at) ) {
          earliest = timer;
        }
      }
    });
    var sleep = earliest && earliest.at - Date.now();
    if ( earliest && sleep <= 0 ) {
      var f = earliest.fn;
      try {
        earliest.running = true;
        f();
      } catch (e) {
        $env.error(e);
      } finally {
        earliest.running = false;
      }
      var goal = earliest.at + earliest.interval;
      var now = Date.now();
      if ( goal < now ) {
        earliest.at = now;
      } else {
        earliest.at = goal;
      }
      continue;
    }

    // bunch of subtle cases here ...
    if ( !earliest ) {
      // no events in the queue (but maybe XHR will bring in events, so ...
      if ( !wait || wait < Date.now() ) {
        // Loop ends if there are no events and a wait hasn't been requested or has expired
        break;
      }
      // no events, but a wait requested: fall through to sleep
    } else {
      // there are events in the queue, but they aren't firable now
      if ( delta_wait && sleep <= delta_wait ) {
        // if they will happen within the next delta, fall through to sleep
      } else if ( wait === 0 || ( wait > 0 && wait < Date.now () ) ) {
        // loop ends even if there are events but the user specifcally asked not to wait too long
        break;
      }
      // there are events and the user wants to wait: fall through to sleep
    }

    // Related to ajax threads ... hopefully can go away ..
    var interval =  $wait.interval || 100;
    if ( !sleep || sleep > interval ) {
      sleep = interval;
    }
    $env.sleep(sleep);
  }
  $event_loop_running = old_loop_running;
};

/*
* event.js
*/
// Window Events
//$debug("Initializing Window Event.");
var $events = [{}],
    $onerror,
    $onload,
    $onunload;

function __addEventListener__(target, type, fn){

    //$debug("adding event listener \n\t" + type +" \n\tfor "+target+" with callback \n\t"+fn);
    if ( !target.uuid ) {
        target.uuid = $events.length;
        $events[target.uuid] = {};
    }
    if ( !$events[target.uuid][type] ){
        $events[target.uuid][type] = [];
    }
    if ( $events[target.uuid][type].indexOf( fn ) < 0 ){
        $events[target.uuid][type].push( fn );
    }
};


$w.addEventListener = function(type, fn){
    __addEventListener__(this, type, fn);
};


function __removeEventListener__(target, type, fn){
  if ( !target.uuid ) {
    target.uuid = $events.length;
    $events[target.uuid] = {};
  }
  if ( !$events[target.uuid][type] ){
		$events[target.uuid][type] = [];
	}	
  $events[target.uuid][type] =
    $events[target.uuid][type].filter(function(f){
			return f != fn;
		});
};

$w.removeEventListener = function(type, fn){
    __removeEventListener__(this, type, fn)
};



function __dispatchEvent__(target, event, bubbles){
    //$debug("dispatching event " + event.type);

    //the window scope defines the $event object, for IE(^^^) compatibility;
    $event = event;

    if (bubbles == undefined || bubbles == null)
        bubbles = true;

    if (!event.target) {
        //$debug("no event target : "+event.target);
        event.target = target;
    }
    //$debug("event target: " + event.target);
    if ( event.type && (target.nodeType             ||
                        target.window === window    || // compares outer objects under TM (inner == outer, but !== (currently)
                        target === window           ||
                        target.__proto__ === window ||
                        target.$thisWindowsProxyObject === window)) {
        //$debug("nodeType: " + target.nodeType);
        if ( target.uuid && $events[target.uuid][event.type] ) {
            var _this = target;
            //$debug('calling event handlers '+$events[target.uuid][event.type].length);
            $events[target.uuid][event.type].forEach(function(fn){
                //$debug('calling event handler '+fn+' on target '+_this);
                fn( event );
            });
        }
    
        if (target["on" + event.type]) {
            //$debug('calling event handler on'+event.type+' on target '+target);
            target["on" + event.type](event);
        }
    }else{
        //$debug("non target: " + event.target + " \n this->"+target);
    }
    if (bubbles && target.parentNode){
        //$debug('bubbling to parentNode '+target.parentNode);
        __dispatchEvent__(target.parentNode, event, bubbles);
    }
};
	
$w.dispatchEvent = function(event, bubbles){
    __dispatchEvent__(this, event, bubbles);
};

$w.__defineGetter__('onerror', function(){
  return function(){
   //$w.dispatchEvent('error');
  };
});

$w.__defineSetter__('onerror', function(fn){
  //$w.addEventListener('error', fn);
});

/*$w.__defineGetter__('onload', function(){
  return function(){
		//var event = document.createEvent();
		//event.initEvent("load");
   //$w.dispatchEvent(event);
  };
});

$w.__defineSetter__('onload', function(fn){
  //$w.addEventListener('load', fn);
});

$w.__defineGetter__('onunload', function(){
  return function(){
   //$w.dispatchEvent('unload');
  };
});

$w.__defineSetter__('onunload', function(fn){
  //$w.addEventListener('unload', fn);
});*//*
*	xhr.js
*/
$debug("Initializing Window XMLHttpRequest.");
// XMLHttpRequest
// Originally implemented by Yehuda Katz
$w.XMLHttpRequest = function(){
	this.headers = {};
	this.responseHeaders = {};
    this.$continueProcessing = true;
	$debug("creating xhr");
};

XMLHttpRequest.prototype = {
	open: function(method, url, async, user, password){ 
		this.readyState = 1;
		if (async === false ){
			this.async = false;
		}else{ this.async = true; }
		this.method = method || "GET";
		this.url = $env.location(url);
		this.onreadystatechange();
	},
	setRequestHeader: function(header, value){
		this.headers[header] = value;
	},
	send: function(data){
		var _this = this;
		
		function makeRequest(){
            $env.connection(_this, function(){
                if (_this.$continueProcessing){
                    var responseXML = null;
                    _this.__defineGetter__("responseXML", function(){
                        if ( _this.responseText.match(/^\s*</) ) {
                          if(responseXML){
                              return responseXML;

                          }else{
                                try {
                                    $debug("parsing response text into xml document");
                                    responseXML = $domparser.parseFromString(_this.responseText+"");
                                    return responseXML;
                                } catch(e) {
                                    $error('response XML does not apear to be well formed xml', e);
                                    responseXML = $domparser.parseFromString("<html>"+
                                        "<head/><body><p> parse error </p></body></html>");
                                    return responseXML;
                                }
                            }
                        }else{
                            $env.warn('response XML does not apear to be xml');
                            return null;
                        }
                    });
                    _this.__defineSetter__("responseXML",function(xml){
                        responseXML = xml;
                    });
                }
			}, data);

            if (_this.$continueProcessing)
                _this.onreadystatechange();
		}

		if (this.async){
		    $debug("XHR sending asynch;");
			$env.runAsync(makeRequest);
		}else{
		    $debug("XHR sending synch;");
			makeRequest();
		}
	},
	abort: function(){
        this.$continueProcessing = false;
	},
	onreadystatechange: function(){
		//TODO
	},
	getResponseHeader: function(header){
        $debug('GETTING RESPONSE HEADER '+header);
	  var rHeader, returnedHeaders;
		if (this.readyState < 3){
			throw new Error("INVALID_STATE_ERR");
		} else {
			returnedHeaders = [];
			for (rHeader in this.responseHeaders) {
				if (rHeader.match(new RegExp(header, "i")))
					returnedHeaders.push(this.responseHeaders[rHeader]);
			}
            
			if (returnedHeaders.length){ 
                $debug('GOT RESPONSE HEADER '+returnedHeaders.join(", "));
                return returnedHeaders.join(", "); 
            }
		}
        return null;
	},
	getAllResponseHeaders: function(){
	  var header, returnedHeaders = [];
		if (this.readyState < 3){
			throw new Error("INVALID_STATE_ERR");
		} else {
			for (header in this.responseHeaders){
				returnedHeaders.push( header + ": " + this.responseHeaders[header] );
			}
		}return returnedHeaders.join("\r\n");
	},
	async: true,
	readyState: 0,
	responseText: "",
	status: 0
};

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// End:
/*
*	css.js
*/
$debug("Initializing Window CSS");
// returns a CSS2Properties object that represents the style
// attributes and values used to render the specified element in this
// window.  Any length values are always expressed in pixel, or
// absolute values.

$w.getComputedStyle = function(elt, pseudo_elt){
  //TODO
  //this is a naive implementation
  $debug("Getting computed style");
  return elt?elt.style:new CSS2Properties({cssText:""});
};/*
*	screen.js
*/
$debug("Initializing Window Screen.");

var $availHeight  = 600,
    $availWidth   = 800,
    $colorDepth    = 16,
    $height       = 600,
    $width        = 800;
    
$w.__defineGetter__("screen", function(){
  return {
    get availHeight(){return $availHeight;},
    get availWidth(){return $availWidth;},
    get colorDepth(){return $colorDepth;},
    get height(){return $height;},
    get width(){return $width;}
  };
});


$w.moveBy = function(dx,dy){
  //TODO
};

$w.moveTo = function(x,y) {
  //TODO
};

/*$w.print = function(){
  //TODO
};*/

$w.resizeBy = function(dw, dh){
  $w.resizeTo($width+dw,$height+dh);
};

$w.resizeTo = function(width, height){
  $width = (width <= $availWidth) ? width : $availWidth;
  $height = (height <= $availHeight) ? height : $availHeight;
};


$w.scroll = function(x,y){
  //TODO
};
$w.scrollBy = function(dx, dy){
  //TODO
};
$w.scrollTo = function(x,y){
  //TODO
};/*
*	dialog.js
*/
$debug("Initializing Window Dialogs.");
$w.alert = function(message){
     $env.warn(message);
};

$w.confirm = function(question){
  //TODO
};

$w.prompt = function(message, defaultMsg){
  //TODO
};/**
* jQuery AOP - jQuery plugin to add features of aspect-oriented programming (AOP) to jQuery.
* http://jquery-aop.googlecode.com/
*
* Licensed under the MIT license:
* http://www.opensource.org/licenses/mit-license.php
*
* Version: 1.1
*/
window.$profiler;

(function() {

	var _after	= 1;
	var _before	= 2;
	var _around	= 3;
	var _intro  = 4;
	var _regexEnabled = true;

	/**
	 * Private weaving function.
	 */
	var weaveOne = function(source, method, advice) {

		var old = source[method];

		var aspect;
		if (advice.type == _after)
			aspect = function() {
				var returnValue = old.apply(this, arguments);
				return advice.value.apply(this, [returnValue, method]);
			};
		else if (advice.type == _before)
			aspect = function() {
				advice.value.apply(this, [arguments, method]);
				return old.apply(this, arguments);
			};
		else if (advice.type == _intro)
			aspect = function() {
				return advice.value.apply(this, arguments);
			};
		else if (advice.type == _around) {
			aspect = function() {
				var invocation = { object: this, args: arguments };
				return advice.value.apply(invocation.object, [{ arguments: invocation.args, method: method, proceed : 
					function() {
						return old.apply(invocation.object, invocation.args);
					}
				}] );
			};
		}

		aspect.unweave = function() { 
			source[method] = old;
			pointcut = source = aspect = old = null;
		};

		source[method] = aspect;

		return aspect;

	};


	/**
	 * Private weaver and pointcut parser.
	 */
	var weave = function(pointcut, advice)
	{

		var source = (typeof(pointcut.target.prototype) != 'undefined') ? pointcut.target.prototype : pointcut.target;
		var advices = [];

		// If it's not an introduction and no method was found, try with regex...
		if (advice.type != _intro && typeof(source[pointcut.method]) == 'undefined')
		{

			for (var method in source)
			{
				if (source[method] != null && source[method] instanceof Function && method.match(pointcut.method))
				{
					advices[advices.length] = weaveOne(source, method, advice);
				}
			}

			if (advices.length == 0)
				throw 'No method: ' + pointcut.method;

		} 
		else
		{
			// Return as an array of one element
			advices[0] = weaveOne(source, pointcut.method, advice);
		}

		return _regexEnabled ? advices : advices[0];

	};

	window.$profiler = 
	{
		/**
		 * Creates an advice after the defined point-cut. The advice will be executed after the point-cut method 
		 * has completed execution successfully, and will receive one parameter with the result of the execution.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.after( {target: window, method: 'MyGlobalMethod'}, function(result) { alert('Returned: ' + result); } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.after( {target: String, method: 'indexOf'}, function(index) { alert('Result found at: ' + index + ' on:' + this); } );
		 * @result Array<Function>
		 *
		 * @name after
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved. 
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called after the execution of the point-cut. It receives one parameter
		 *                        with the result of the point-cut's execution.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		after : function(pointcut, advice)
		{
			return weave( pointcut, { type: _after, value: advice } );
		},

		/**
		 * Creates an advice before the defined point-cut. The advice will be executed before the point-cut method 
		 * but cannot modify the behavior of the method, or prevent its execution.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.before( {target: window, method: 'MyGlobalMethod'}, function() { alert('About to execute MyGlobalMethod'); } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.before( {target: String, method: 'indexOf'}, function(index) { alert('About to execute String.indexOf on: ' + this); } );
		 * @result Array<Function>
		 *
		 * @name before
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved. 
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called before the execution of the point-cut.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		before : function(pointcut, advice)
		{
			return weave( pointcut, { type: _before, value: advice } );
		},


		/**
		 * Creates an advice 'around' the defined point-cut. This type of advice can control the point-cut method execution by calling
		 * the functions '.proceed()' on the 'invocation' object, and also, can modify the arguments collection before sending them to the function call.
		 * This function returns an array of weaved aspects (Function).
		 *
		 * @example jQuery.aop.around( {target: window, method: 'MyGlobalMethod'}, function(invocation) {
		 *                alert('# of Arguments: ' + invocation.arguments.length); 
		 *                return invocation.proceed(); 
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.around( {target: String, method: 'indexOf'}, function(invocation) { 
		 *                alert('Searching: ' + invocation.arguments[0] + ' on: ' + this); 
		 *                return invocation.proceed(); 
		 *          } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.around( {target: window, method: /Get(\d+)/}, function(invocation) {
		 *                alert('Executing ' + invocation.method); 
		 *                return invocation.proceed(); 
		 *          } );
		 * @desc Matches all global methods starting with 'Get' and followed by a number.
		 * @result Array<Function>
		 *
		 *
		 * @name around
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved. 
		 * @option String method Name of the function to be weaved. Regex are supported, but not on built-in objects.
		 * @param Function advice Function containing the code that will get called around the execution of the point-cut. This advice will be called with one
		 *                        argument containing one function '.proceed()', the collection of arguments '.arguments', and the matched method name '.method'.
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		around : function(pointcut, advice)
		{
			return weave( pointcut, { type: _around, value: advice } );
		},

		/**
		 * Creates an introduction on the defined point-cut. This type of advice replaces any existing methods with the same
		 * name. To restore them, just unweave it.
		 * This function returns an array with only one weaved aspect (Function).
		 *
		 * @example jQuery.aop.introduction( {target: window, method: 'MyGlobalMethod'}, function(result) { alert('Returned: ' + result); } );
		 * @result Array<Function>
		 *
		 * @example jQuery.aop.introduction( {target: String, method: 'log'}, function() { alert('Console: ' + this); } );
		 * @result Array<Function>
		 *
		 * @name introduction
		 * @param Map pointcut Definition of the point-cut to apply the advice. A point-cut is the definition of the object/s and method/s to be weaved.
		 * @option Object target Target object to be weaved. 
		 * @option String method Name of the function to be weaved.
		 * @param Function advice Function containing the code that will be executed on the point-cut. 
		 *
		 * @type Array<Function>
		 * @cat Plugins/General
		 */
		introduction : function(pointcut, advice)
		{
			return weave( pointcut, { type: _intro, value: advice } );
		},
		
		/**
		 * Configures global options.
		 *
		 * @name setup
		 * @param Map settings Configuration options.
		 * @option Boolean regexMatch Enables/disables regex matching of method names.
		 *
		 * @example jQuery.aop.setup( { regexMatch: false } );
		 * @desc Disable regex matching.
		 *
		 * @type Void
		 * @cat Plugins/General
		 */
		setup: function(settings)
		{
			_regexEnabled = settings.regexMatch;
		}
	};

})();


var $profile = window.$profile = {};


var __profile__ = function(id, invocation){
    var start = new Date().getTime();
    var retval = invocation.proceed(); 
    var finish = new Date().getTime();
    $profile[id] = $profile[id] ? $profile[id] : {};
    $profile[id].callCount = $profile[id].callCount !== undefined ? 
        $profile[id].callCount+1 : 0;
    $profile[id].times = $profile[id].times ? $profile[id].times : [];
    $profile[id].times[$profile[id].callCount++] = (finish-start);
    return retval;
};


window.$profiler.stats = function(raw){
    var max     = 0,
        avg     = -1,
        min     = 10000000,
        own     = 0;
    for(var i = 0;i<raw.length;i++){
        if(raw[i] > 0){
            own += raw[i];
        };
        if(raw[i] > max){
            max = raw[i];
        }
        if(raw[i] < min){
            min = raw[i];
        }
    }
    avg = Math.floor(own/raw.length);
    return {
        min: min,
        max: max,
        avg: avg,
        own: own
    };
};

if($env.profile){
    /**
    *   CSS2Properties
    */
    window.$profiler.around({ target: CSS2Properties,  method:"getPropertyCSSValue"}, function(invocation) {
        return __profile__("CSS2Properties.getPropertyCSSValue", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"getPropertyPriority"}, function(invocation) {
        return __profile__("CSS2Properties.getPropertyPriority", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"getPropertyValue"}, function(invocation) {
        return __profile__("CSS2Properties.getPropertyValue", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"item"}, function(invocation) {
        return __profile__("CSS2Properties.item", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"removeProperty"}, function(invocation) {
        return __profile__("CSS2Properties.removeProperty", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"setProperty"}, function(invocation) {
        return __profile__("CSS2Properties.setProperty", invocation);
    });  
    window.$profiler.around({ target: CSS2Properties,  method:"toString"}, function(invocation) {
        return __profile__("CSS2Properties.toString", invocation);
    });  
               
    
    /**
    *   DOMNode
    */
                    
    window.$profiler.around({ target: DOMNode,  method:"hasAttributes"}, function(invocation) {
        return __profile__("DOMNode.hasAttributes", invocation);
    });          
    window.$profiler.around({ target: DOMNode,  method:"insertBefore"}, function(invocation) {
        return __profile__("DOMNode.insertBefore", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"replaceChild"}, function(invocation) {
        return __profile__("DOMNode.replaceChild", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"removeChild"}, function(invocation) {
        return __profile__("DOMNode.removeChild", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"replaceChild"}, function(invocation) {
        return __profile__("DOMNode.replaceChild", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"appendChild"}, function(invocation) {
        return __profile__("DOMNode.appendChild", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"hasChildNodes"}, function(invocation) {
        return __profile__("DOMNode.hasChildNodes", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"cloneNode"}, function(invocation) {
        return __profile__("DOMNode.cloneNode", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"normalize"}, function(invocation) {
        return __profile__("DOMNode.normalize", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"isSupported"}, function(invocation) {
        return __profile__("DOMNode.isSupported", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"getElementsByTagName"}, function(invocation) {
        return __profile__("DOMNode.getElementsByTagName", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"getElementsByTagNameNS"}, function(invocation) {
        return __profile__("DOMNode.getElementsByTagNameNS", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"importNode"}, function(invocation) {
        return __profile__("DOMNode.importNode", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"contains"}, function(invocation) {
        return __profile__("DOMNode.contains", invocation);
    }); 
    window.$profiler.around({ target: DOMNode,  method:"compareDocumentPosition"}, function(invocation) {
        return __profile__("DOMNode.compareDocumentPosition", invocation);
    }); 
    
    
    /**
    *   DOMDocument
    */
    window.$profiler.around({ target: DOMDocument,  method:"addEventListener"}, function(invocation) {
        return __profile__("DOMDocument.addEventListener", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"removeEventListener"}, function(invocation) {
        return __profile__("DOMDocument.removeEventListener", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"attachEvent"}, function(invocation) {
        return __profile__("DOMDocument.attachEvent", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"detachEvent"}, function(invocation) {
        return __profile__("DOMDocument.detachEvent", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"dispatchEvent"}, function(invocation) {
        return __profile__("DOMDocument.dispatchEvent", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"loadXML"}, function(invocation) {
        return __profile__("DOMDocument.loadXML", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"load"}, function(invocation) {
        return __profile__("DOMDocument.load", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createEvent"}, function(invocation) {
        return __profile__("DOMDocument.createEvent", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createExpression"}, function(invocation) {
        return __profile__("DOMDocument.createExpression", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createElement"}, function(invocation) {
        return __profile__("DOMDocument.createElement", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createDocumentFragment"}, function(invocation) {
        return __profile__("DOMDocument.createDocumentFragment", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createTextNode"}, function(invocation) {
        return __profile__("DOMDocument.createTextNode", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createComment"}, function(invocation) {
        return __profile__("DOMDocument.createComment", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createCDATASection"}, function(invocation) {
        return __profile__("DOMDocument.createCDATASection", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createProcessingInstruction"}, function(invocation) {
        return __profile__("DOMDocument.createProcessingInstruction", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createAttribute"}, function(invocation) {
        return __profile__("DOMDocument.createAttribute", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createElementNS"}, function(invocation) {
        return __profile__("DOMDocument.createElementNS", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createAttributeNS"}, function(invocation) {
        return __profile__("DOMDocument.createAttributeNS", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"createNamespace"}, function(invocation) {
        return __profile__("DOMDocument.createNamespace", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"getElementById"}, function(invocation) {
        return __profile__("DOMDocument.getElementById", invocation);
    });
    window.$profiler.around({ target: DOMDocument,  method:"normalizeDocument"}, function(invocation) {
        return __profile__("DOMDocument.normalizeDocument", invocation);
    });
    
    
    /**
    *   HTMLDocument
    */      
    window.$profiler.around({ target: HTMLDocument,  method:"createElement"}, function(invocation) {
        return __profile__("HTMLDocument.createElement", invocation);
    }); 
    
    /**
    *   DOMParser
    */      
    window.$profiler.around({ target: DOMParser,  method:"parseFromString"}, function(invocation) {
        return __profile__("DOMParser.parseFromString", invocation);
    }); 
    
    /**
    *   DOMNodeList
    */      
    window.$profiler.around({ target: DOMNodeList,  method:"item"}, function(invocation) {
        return __profile__("DOMNode.item", invocation);
    }); 
    window.$profiler.around({ target: DOMNodeList,  method:"toString"}, function(invocation) {
        return __profile__("DOMNode.toString", invocation);
    }); 
    
    /**
    *   XMLP
    */      
    window.$profiler.around({ target: XMLP,  method:"_addAttribute"}, function(invocation) {
        return __profile__("XMLP._addAttribute", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_checkStructure"}, function(invocation) {
        return __profile__("XMLP._checkStructure", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_clearAttributes"}, function(invocation) {
        return __profile__("XMLP._clearAttributes", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_findAttributeIndex"}, function(invocation) {
        return __profile__("XMLP._findAttributeIndex", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getAttributeCount"}, function(invocation) {
        return __profile__("XMLP.getAttributeCount", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getAttributeName"}, function(invocation) {
        return __profile__("XMLP.getAttributeName", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getAttributeValue"}, function(invocation) {
        return __profile__("XMLP.getAttributeValue", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getAttributeValueByName"}, function(invocation) {
        return __profile__("XMLP.getAttributeValueByName", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getColumnNumber"}, function(invocation) {
        return __profile__("XMLP.getColumnNumber", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getContentBegin"}, function(invocation) {
        return __profile__("XMLP.getContentBegin", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getContentEnd"}, function(invocation) {
        return __profile__("XMLP.getContentEnd", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getLineNumber"}, function(invocation) {
        return __profile__("XMLP.getLineNumber", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"getName"}, function(invocation) {
        return __profile__("XMLP.getName", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"next"}, function(invocation) {
        return __profile__("XMLP.next", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parse"}, function(invocation) {
        return __profile__("XMLP._parse", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parse"}, function(invocation) {
        return __profile__("XMLP._parse", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseAttribute"}, function(invocation) {
        return __profile__("XMLP._parseAttribute", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseCDATA"}, function(invocation) {
        return __profile__("XMLP._parseCDATA", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseComment"}, function(invocation) {
        return __profile__("XMLP._parseComment", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseDTD"}, function(invocation) {
        return __profile__("XMLP._parseDTD", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseElement"}, function(invocation) {
        return __profile__("XMLP._parseElement", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseEntity"}, function(invocation) {
        return __profile__("XMLP._parseEntity", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parsePI"}, function(invocation) {
        return __profile__("XMLP._parsePI", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_parseText"}, function(invocation) {
        return __profile__("XMLP._parseText", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_replaceEntities"}, function(invocation) {
        return __profile__("XMLP._replaceEntities", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_replaceEntity"}, function(invocation) {
        return __profile__("XMLP._replaceEntity", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_setContent"}, function(invocation) {
        return __profile__("XMLP._setContent", invocation);
    }); 
    window.$profiler.around({ target: XMLP,  method:"_setErr"}, function(invocation) {
        return __profile__("XMLP._setErr", invocation);
    }); 
    
    
    /**
    *   SAXDriver
    */      
    window.$profiler.around({ target: SAXDriver,  method:"parse"}, function(invocation) {
        return __profile__("SAXDriver.parse", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"setDocumentHandler"}, function(invocation) {
        return __profile__("SAXDriver.setDocumentHandler", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"setErrorHandler"}, function(invocation) {
        return __profile__("SAXDriver.setErrorHandler", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"setLexicalHandler"}, function(invocation) {
        return __profile__("SAXDriver.setLexicalHandler", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getColumnNumber"}, function(invocation) {
        return __profile__("SAXDriver.getColumnNumber", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getLineNumber"}, function(invocation) {
        return __profile__("SAXDriver.getLineNumber", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getMessage"}, function(invocation) {
        return __profile__("SAXDriver.getMessage", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getPublicId"}, function(invocation) {
        return __profile__("SAXDriver.getPublicId", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getSystemId"}, function(invocation) {
        return __profile__("SAXDriver.getSystemId", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getLength"}, function(invocation) {
        return __profile__("SAXDriver.getLength", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getName"}, function(invocation) {
        return __profile__("SAXDriver.getName", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getValue"}, function(invocation) {
        return __profile__("SAXDriver.getValue", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"getValueByName"}, function(invocation) {
        return __profile__("SAXDriver.getValueByName", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"_fireError"}, function(invocation) {
        return __profile__("SAXDriver._fireError", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"_fireEvent"}, function(invocation) {
        return __profile__("SAXDriver._fireEvent", invocation);
    }); 
    window.$profiler.around({ target: SAXDriver,  method:"_parseLoop"}, function(invocation) {
        return __profile__("SAXDriver._parseLoop", invocation);
    }); 
    
    /**
    *   SAXStrings    
    */
    window.$profiler.around({ target: SAXStrings,  method:"getColumnNumber"}, function(invocation) {
        return __profile__("SAXStrings.getColumnNumber", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"getLineNumber"}, function(invocation) {
        return __profile__("SAXStrings.getLineNumber", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"indexOfNonWhitespace"}, function(invocation) {
        return __profile__("SAXStrings.indexOfNonWhitespace", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"indexOfWhitespace"}, function(invocation) {
        return __profile__("SAXStrings.indexOfWhitespace", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"isEmpty"}, function(invocation) {
        return __profile__("SAXStrings.isEmpty", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"lastIndexOfNonWhitespace"}, function(invocation) {
        return __profile__("SAXStrings.lastIndexOfNonWhitespace", invocation);
    }); 
    window.$profiler.around({ target: SAXStrings,  method:"replace"}, function(invocation) {
        return __profile__("SAXStrings.replace", invocation);
    }); 
    
    /**
    *   Stack - SAX Utility
    window.$profiler.around({ target: Stack,  method:"clear"}, function(invocation) {
        return __profile__("Stack.clear", invocation);
    }); 
    window.$profiler.around({ target: Stack,  method:"count"}, function(invocation) {
        return __profile__("Stack.count", invocation);
    }); 
    window.$profiler.around({ target: Stack,  method:"destroy"}, function(invocation) {
        return __profile__("Stack.destroy", invocation);
    }); 
    window.$profiler.around({ target: Stack,  method:"peek"}, function(invocation) {
        return __profile__("Stack.peek", invocation);
    }); 
    window.$profiler.around({ target: Stack,  method:"pop"}, function(invocation) {
        return __profile__("Stack.pop", invocation);
    }); 
    window.$profiler.around({ target: Stack,  method:"push"}, function(invocation) {
        return __profile__("Stack.push", invocation);
    }); 
    */
}
      
/*
*	document.js
*
*	DOM Level 2 /DOM level 3 (partial)
*	
*	This file adds the document object to the window and allows you
*	you to set the window.document using an html string or dom object.
*
*/

// read only reference to the Document object
var $document;
{    // a temporary scope, nothing more
  var referrer = "";
  try {
    referrer = $openingWindow.location.href;
  } catch (e){ /* or not */ }
  $document = new HTMLDocument($implementation, $w, referrer);
}

$w.__defineGetter__("document", function(){
	return $document;
});
$debug("Defining document.cookie");
/*
*	cookie.js
*   - requires env
*/

var $cookies = {
	persistent:{
		//domain - key on domain name {
			//path - key on path {
				//name - key on name {
					 //value : cookie value
					 //other cookie properties
				//}
			//}
		//}
		//expire - provides a timestamp for expiring the cookie
		//cookie - the cookie!
	},
	temporary:{//transient is a reserved word :(
		//like above
	}
};

//HTMLDocument cookie
document.__defineSetter__("cookie", function(cookie){
	var i,name,value,properties = {},attr,attrs = cookie.split(";");
	//for now the strategy is to simply create a json object
	//and post it to a file in the .cookies.js file.  I hate parsing
	//dates so I decided not to implement support for 'expires' 
	//(which is deprecated) and instead focus on the easier 'max-age'
	//(which succeeds 'expires') 
	cookie = {};//keyword properties of the cookie
	for(i=0;i<attrs.length;i++){
		var index = attrs[i].indexOf("=");
        if(index > -1){
            name = trim(attrs[i].slice(0,index));
            value = trim(attrs[i].slice(index+1));
            cookie['domain'] = "";
            if(name=='max-age'){
               //we'll have to set a timer to check these
				//and garbage collect expired cookies
				cookie[name] = parseInt(value, 10);
			} else if(name=='domain'){
				if(domainValid(value)){
					cookie['domain']=value;
				}else{
					cookie['domain']=$w.location.domain;
				}
			} else if(name=='path'){
				//not sure of any special logic for path
				cookie['path'] = value;
			} else {
				//its not a cookie keyword so store it in our array of properties
				//and we'll serialize individually in a moment
				properties[name] = value;
			}
		}else{
			if(attrs[i] == 'secure'){
                cookie[attrs[i]] = true;
			}
		}
	}
	if(!cookie['max-age']){
		//it's a transient cookie so it only lasts as long as 
		//the window.location remains the same
		mergeCookie($cookies.temporary, cookie, properties);
	}else if(cookie['max-age']===0){
		//delete the cookies
		//TODO
	}else{
		//the cookie is persistent
		mergeCookie($cookies.persistent, cookie, properties);
		persistCookies();
	}
});

document.__defineGetter__("cookie", function(c){
	//The cookies that are returned must belong to the same domain
	//and be at or below the current window.location.path.  Also
	//we must check to see if the cookie was set to 'secure' in which
	//case we must check our current location.protocol to make sure it's
	//https:
	var allcookies = [], i;
	return cookieString($cookies.temporary) + cookieString($cookies.persistent); 	
});

var cookieString = function(cookies) {
    var cookieString = "";
    for (var i in cookies) {
        // check if the cookie is in the current domain (if domain is set)
        if (i == "" || i == $w.location.domain) {
            for (var j in cookies[i]) {
                // make sure path is at or below the window location path
                if (j == "/" || $w.location.pathname.indexOf(j) === 0) {
                    for (var k in cookies[i][j]) {
                        cookieString += k + "=" + cookies[i][j][k].value+";";
                    }
                }
            }
        }
    }
    return cookieString;
}


var domainValid = function(domain){
	//make sure the domain
	//TODO 	
};

var mergeCookie = function(target, cookie, properties){
	var name, now;
	if(!target[cookie.domain]){
		target[cookie.domain] = {};
	}
	if(!target[cookie.domain][cookie.path]){
		target[cookie.domain][cookie.path] = {};
	}
	for(name in properties){
		now = new Date().getTime();
		target[cookie.domain][cookie.path][name] = {
			value:properties[name],
			"@env:secure":cookie.secure,
			"@env:max-age":cookie['max-age'],
			"@env:date-created":now,
			"@env:expiration":now + cookie['max-age']
		};
	}
};

var persistCookies = function(){
	//TODO
	//I think it should be done via $env so it can be customized
};

var loadCookies = function(){
	//TODO
	//should also be configurable via $env	
};

//We simply use the default ajax get to load the .cookies.js file
//if it doesn't exist we create it with a post.  Cookies are maintained
//in memory, but serialized with each set.
try{
	//TODO - load cookies
	loadCookies();
}catch(e){
	//TODO - fail gracefully
}	
	/**
 * @author thatcher
 */
(function(window,document){

var Html5Parser;

var psettimeout;

var sync = function(parser){
  parser.ptimeouts = [];
  parser.pschedule = function($schedule,timer,t) {
    var old = psettimeout; 
    psettimeout = function(fn){
      parser.ptimeouts.push(fn);
    };
    $schedule(timer,t);
    psettimeout = old;
  };
  parser.pwait = function() {
    var fn;
    while(fn = parser.ptimeouts.pop()){
      fn();
    };
  };
};

var async = function(parser){
  delete parser.ptimeouts;
  parser.pschedule = function($schedule,timer,t) {
    var old = psettimeout; 
    psettimeout = window.setTimeout;
    $schedule(timer,t);
    psettimeout = old;
  };
  parser.pwait = function(){$env.wait(-1);};
};(function () {window.nu_validator_htmlparser_HtmlParser = function(){
  var $wnd_0 = window, $doc_0 = document, gwtOnLoad, bodyDone, base = '', metaProps = {}, values = [], providers = [], answers = [], onLoadErrorFunc, propertyErrorFunc;
  if (!$wnd_0.__gwt_stylesLoaded) {
    $wnd_0.__gwt_stylesLoaded = {};
  }
  if (!$wnd_0.__gwt_scriptsLoaded) {
    $wnd_0.__gwt_scriptsLoaded = {};
  }
  function maybeStartModule(){
    if (gwtOnLoad && bodyDone) {
      gwtOnLoad(onLoadErrorFunc, 'nu.validator.htmlparser.HtmlParser', base);
    }
  }

  function computeScriptBase(){
    var thisScript, markerScript;
    $doc_0.write('<script id="__gwt_marker_nu.validator.htmlparser.HtmlParser"><\/script>');
    markerScript = $doc_0.getElementById('__gwt_marker_nu.validator.htmlparser.HtmlParser');
    if (markerScript) {
      thisScript = markerScript.previousSibling;
    }
    function getDirectoryOfFile(path){
      var hashIndex = path.lastIndexOf('#');
      if (hashIndex == -1) {
        hashIndex = path.length;
      }
      var queryIndex = path.indexOf('?');
      if (queryIndex == -1) {
        queryIndex = path.length;
      }
      var slashIndex = path.lastIndexOf('/', Math.min(queryIndex, hashIndex));
      return slashIndex >= 0?path.substring(0, slashIndex + 1):'';
    }

    ;
    if (thisScript && thisScript.src) {
      base = getDirectoryOfFile(thisScript.src);
    }
    if (base == '') {
      var baseElements = $doc_0.getElementsByTagName('base');
      if (baseElements.length > 0) {
        base = baseElements[baseElements.length - 1].href;
      }
       else {
        base = getDirectoryOfFile($doc_0.location.href);
      }
    }
     else if (base.match(/^\w+:\/\//)) {
    }
     else {
      var img = $doc_0.createElement('img');
      img.src = base + 'clear.cache.gif';
      base = getDirectoryOfFile(img.src);
    }
    if (markerScript) {
      markerScript.parentNode.removeChild(markerScript);
    }
  }

  function processMetas(){
    var metas = document.getElementsByTagName('meta');
    for (var i = 0, n = metas.length; i < n; ++i) {
      var meta = metas[i], name = meta.getAttribute('name'), content;
      if (name) {
        if (name == 'gwt:property') {
          content = meta.getAttribute('content');
          if (content) {
            var value, eq = content.indexOf('=');
            if (eq >= 0) {
              name = content.substring(0, eq);
              value = content.substring(eq + 1);
            }
             else {
              name = content;
              value = '';
            }
            metaProps[name] = value;
          }
        }
         else if (name == 'gwt:onPropertyErrorFn') {
          content = meta.getAttribute('content');
          if (content) {
            try {
              propertyErrorFunc = eval(content);
            }
             catch (e) {
              alert('Bad handler "' + content + '" for "gwt:onPropertyErrorFn"');
            }
          }
        }
         else if (name == 'gwt:onLoadErrorFn') {
          content = meta.getAttribute('content');
          if (content) {
            try {
              onLoadErrorFunc = eval(content);
            }
             catch (e) {
              alert('Bad handler "' + content + '" for "gwt:onLoadErrorFn"');
            }
          }
        }
      }
    }
  }

  nu_validator_htmlparser_HtmlParser.onScriptLoad = function(gwtOnLoadFunc){
    nu_validator_htmlparser_HtmlParser = null;
    gwtOnLoad = gwtOnLoadFunc;
    maybeStartModule();
  }
  ;
  computeScriptBase();
  processMetas();
  var onBodyDoneTimerId;
  /*envjsedit*/var onBodyDone = Html5Parser = function(){
    if (!bodyDone) {
      bodyDone = true;
      maybeStartModule();
      if(false/*envjsedit*/) {
        $doc_0.removeEventListener('DOMContentLoaded', onBodyDone, false);
      }
      if (onBodyDoneTimerId) {
        clearInterval(onBodyDoneTimerId);
      }
    }
  }

  /*envjsedit {
    $doc_0.addEventListener('DOMContentLoaded', onBodyDone, false);
  }
  var onBodyDoneTimerId = setInterval(function(){
    if (/loaded|complete/.test($doc_0.readyState)) {
      onBodyDone();
    }
  }
  envjsedit*/
}
;
nu_validator_htmlparser_HtmlParser.__gwt_initHandlers = function(resize, beforeunload, unload){
  var $wnd_0 = window, oldOnResize = $wnd_0.onresize, oldOnBeforeUnload = $wnd_0.onbeforeunload, oldOnUnload = $wnd_0.onunload;
  $wnd_0.onresize = function(evt){
    try {
      resize();
    }
     finally {
      oldOnResize && oldOnResize(evt);
    }
  }
  ;
  $wnd_0.onbeforeunload = function(evt){
    var ret, oldRet;
    try {
      ret = beforeunload();
    }
     finally {
      oldRet = oldOnBeforeUnload && oldOnBeforeUnload(evt);
    }
    if (ret != null) {
      return ret;
    }
    if (oldRet != null) {
      return oldRet;
    }
  }
  ;
  $wnd_0.onunload = function(evt){
    try {
      unload();
    }
     finally {
      oldOnUnload && oldOnUnload(evt);
      $wnd_0.onresize = null;
      $wnd_0.onbeforeunload = null;
      $wnd_0.onunload = null;
    }
  }
  ;
}
;
nu_validator_htmlparser_HtmlParser();
})();(function () {var $gwt_version = "1.5.1";var $wnd = window;var $doc = $wnd.document;var $moduleName, $moduleBase;var $stats = $wnd.__gwtStatsEvent ? function(a) {$wnd.__gwtStatsEvent(a)} : null;var _, N8000000000000000_longLit = [0, -9223372036854775808], P1000000_longLit = [16777216, 0], P7fffffffffffffff_longLit = [4294967295, 9223372032559808512];
function equals_1(other){
  return (this == null?null:this) === (other == null?null:other);
}

function getClass_13(){
  return Ljava_lang_Object_2_classLit;
}

function hashCode_2(){
  return this.$H || (this.$H = ++sNextHashId);
}

function toString_3(){
  return (this.typeMarker$ == nullMethod || this.typeId$ == 2?this.getClass$():Lcom_google_gwt_core_client_JavaScriptObject_2_classLit).typeName + '@' + toPowerOfTwoString(this.typeMarker$ == nullMethod || this.typeId$ == 2?this.hashCode$():this.$H || (this.$H = ++sNextHashId), 4);
}

function Object_0(){
}

_ = Object_0.prototype = {};
_.equals$ = equals_1;
_.getClass$ = getClass_13;
_.hashCode$ = hashCode_2;
_.toString$ = toString_3;
_.toString = function(){
  return this.toString$();
}
;
_.typeMarker$ = nullMethod;
_.typeId$ = 1;
function $toString_1(this$static){
  var className, msg;
  className = this$static.getClass$().typeName;
  msg = this$static.getMessage();
  if (msg != null) {
    return className + ': ' + msg;
  }
   else {
    return className;
  }
}

function getClass_19(){
  return Ljava_lang_Throwable_2_classLit;
}

function getMessage(){
  return this.detailMessage;
}

function toString_7(){
  return $toString_1(this);
}

function Throwable(){
}

_ = Throwable.prototype = new Object_0();
_.getClass$ = getClass_19;
_.getMessage = getMessage;
_.toString$ = toString_7;
_.typeId$ = 3;
_.detailMessage = null;
function $Exception(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_9(){
  return Ljava_lang_Exception_2_classLit;
}

function Exception(){
}

_ = Exception.prototype = new Throwable();
_.getClass$ = getClass_9;
_.typeId$ = 4;
function $RuntimeException(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_14(){
  return Ljava_lang_RuntimeException_2_classLit;
}

function RuntimeException(){
}

_ = RuntimeException.prototype = new Exception();
_.getClass$ = getClass_14;
_.typeId$ = 5;
function $JavaScriptException(this$static, e){
  $Exception(this$static, '(' + getName(e) + '): ' + getDescription(e) + (e != null && (e.typeMarker$ != nullMethod && e.typeId$ != 2)?getProperties0(dynamicCastJso(e)):''));
  getName(e);
  getDescription(e);
  getException(e);
  return this$static;
}

function getClass_0(){
  return Lcom_google_gwt_core_client_JavaScriptException_2_classLit;
}

function getDescription(e){
  if (e != null && (e.typeMarker$ != nullMethod && e.typeId$ != 2)) {
    return getDescription0(dynamicCastJso(e));
  }
   else {
    return e + '';
  }
}

function getDescription0(e){
  return e == null?null:e.message;
}

function getException(e){
  if (e != null && (e.typeMarker$ != nullMethod && e.typeId$ != 2)) {
    return dynamicCastJso(e);
  }
   else {
    return null;
  }
}

function getName(e){
  if (e == null) {
    return 'null';
  }
   else if (e != null && (e.typeMarker$ != nullMethod && e.typeId$ != 2)) {
    return getName0(dynamicCastJso(e));
  }
   else if (e != null && canCast(e.typeId$, 1)) {
    return 'String';
  }
   else {
    return (e.typeMarker$ == nullMethod || e.typeId$ == 2?e.getClass$():Lcom_google_gwt_core_client_JavaScriptObject_2_classLit).typeName;
  }
}

function getName0(e){
  return e == null?null:e.name;
}

function getProperties0(e){
  var result = '';
  for (prop in e) {
    if (prop != 'name' && prop != 'message') {
      result += '\n ' + prop + ': ' + e[prop];
    }
  }
  return result;
}

function JavaScriptException(){
}

_ = JavaScriptException.prototype = new RuntimeException();
_.getClass$ = getClass_0;
_.typeId$ = 6;
function createFunction(){
  return function(){
  }
  ;
}

function equals__devirtual$(this$static, other){
  return this$static.typeMarker$ == nullMethod || this$static.typeId$ == 2?this$static.equals$(other):(this$static == null?null:this$static) === (other == null?null:other);
}

function hashCode__devirtual$(this$static){
  return this$static.typeMarker$ == nullMethod || this$static.typeId$ == 2?this$static.hashCode$():this$static.$H || (this$static.$H = ++sNextHashId);
}

var sNextHashId = 0;
function createFromSeed(seedType, length){
  var seedArray = [null, 0, false, [0, 0]];
  var value = seedArray[seedType];
  var array = new Array(length);
  for (var i = 0; i < length; ++i) {
    array[i] = value;
  }
  return array;
}

function getClass_2(){
  return this.arrayClass$;
}

function initDim(arrayClass, typeId, queryId, length, seedType){
  var result;
  result = createFromSeed(seedType, length);
  initValues(arrayClass, typeId, queryId, result);
  return result;
}

function initValues(arrayClass, typeId, queryId, array){
  if (!protoTypeArray_0) {
    protoTypeArray_0 = new Array_0();
  }
  wrapArray(array, protoTypeArray_0);
  array.arrayClass$ = arrayClass;
  array.typeId$ = typeId;
  array.queryId$ = queryId;
  return array;
}

function setCheck(array, index, value){
  if (value != null) {
    if (array.queryId$ > 0 && !canCastUnsafe(value.typeId$, array.queryId$)) {
      throw new ArrayStoreException();
    }
    if (array.queryId$ < 0 && (value.typeMarker$ == nullMethod || value.typeId$ == 2)) {
      throw new ArrayStoreException();
    }
  }
  return array[index] = value;
}

function wrapArray(array, protoTypeArray){
  for (var i in protoTypeArray) {
    var toCopy = protoTypeArray[i];
    if (toCopy) {
      array[i] = toCopy;
    }
  }
  return array;
}

function Array_0(){
}

_ = Array_0.prototype = new Object_0();
_.getClass$ = getClass_2;
_.typeId$ = 0;
_.arrayClass$ = null;
_.length = 0;
_.queryId$ = 0;
var protoTypeArray_0 = null;
function canCast(srcId, dstId){
  return srcId && !!typeIdArray[srcId][dstId];
}

function canCastUnsafe(srcId, dstId){
  return srcId && typeIdArray[srcId][dstId];
}

function dynamicCast(src, dstId){
  if (src != null && !canCastUnsafe(src.typeId$, dstId)) {
    throw new ClassCastException();
  }
  return src;
}

function dynamicCastJso(src){
  if (src != null && (src.typeMarker$ == nullMethod || src.typeId$ == 2)) {
    throw new ClassCastException();
  }
  return src;
}

function instanceOf(src, dstId){
  return src != null && canCast(src.typeId$, dstId);
}

var typeIdArray = [{}, {}, {1:1, 6:1, 7:1, 8:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1, 19:1}, {4:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1}, {6:1, 8:1}, {2:1, 6:1}, {2:1, 6:1}, {2:1, 6:1}, {7:1}, {7:1}, {2:1, 6:1}, {2:1, 6:1}, {18:1}, {14:1}, {14:1}, {14:1}, {15:1}, {15:1}, {6:1, 15:1}, {6:1, 16:1}, {6:1, 15:1}, {2:1, 6:1, 17:1}, {6:1, 8:1}, {6:1, 8:1}, {6:1, 8:1}, {20:1}, {3:1}, {9:1}, {10:1}, {11:1}, {21:1}, {2:1, 6:1, 22:1}, {2:1, 6:1, 22:1}, {12:1}, {13:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}, {5:1}];
function caught(e){
  if (e != null && canCast(e.typeId$, 2)) {
    return e;
  }
  return $JavaScriptException(new JavaScriptException(), e);
}

function create(valueLow, valueHigh){
  var diffHigh, diffLow;
  valueHigh %= 1.8446744073709552E19;
  valueLow %= 1.8446744073709552E19;
  diffHigh = valueHigh % 4294967296;
  diffLow = Math.floor(valueLow / 4294967296) * 4294967296;
  valueHigh = valueHigh - diffHigh + diffLow;
  valueLow = valueLow - diffLow + diffHigh;
  while (valueLow < 0) {
    valueLow += 4294967296;
    valueHigh -= 4294967296;
  }
  while (valueLow > 4294967295) {
    valueLow -= 4294967296;
    valueHigh += 4294967296;
  }
  valueHigh = valueHigh % 1.8446744073709552E19;
  while (valueHigh > 9223372032559808512) {
    valueHigh -= 1.8446744073709552E19;
  }
  while (valueHigh < -9223372036854775808) {
    valueHigh += 1.8446744073709552E19;
  }
  return [valueLow, valueHigh];
}

function fromDouble(value){
  if (isNaN(value)) {
    return $clinit_7() , ZERO;
  }
  if (value < -9223372036854775808) {
    return $clinit_7() , MIN_VALUE;
  }
  if (value >= 9223372036854775807) {
    return $clinit_7() , MAX_VALUE;
  }
  if (value > 0) {
    return create(Math.floor(value), 0);
  }
   else {
    return create(Math.ceil(value), 0);
  }
}

function fromInt(value){
  var rebase, result;
  if (value > -129 && value < 128) {
    rebase = value + 128;
    result = ($clinit_6() , boxedValues)[rebase];
    if (result == null) {
      result = boxedValues[rebase] = internalFromInt(value);
    }
    return result;
  }
  return internalFromInt(value);
}

function internalFromInt(value){
  if (value >= 0) {
    return [value, 0];
  }
   else {
    return [value + 4294967296, -4294967296];
  }
}

function $clinit_6(){
  $clinit_6 = nullMethod;
  boxedValues = initDim(_3_3D_classLit, 53, 13, 256, 0);
}

var boxedValues;
function $clinit_7(){
  $clinit_7 = nullMethod;
  Math.log(2);
  MAX_VALUE = P7fffffffffffffff_longLit;
  MIN_VALUE = N8000000000000000_longLit;
  fromInt(-1);
  fromInt(1);
  fromInt(2);
  ZERO = fromInt(0);
}

var MAX_VALUE, MIN_VALUE, ZERO;
function $clinit_12(){
  $clinit_12 = nullMethod;
  timers = $ArrayList(new ArrayList());
  addWindowCloseListener(new Timer$1());
}

function $cancel(this$static){
  if (this$static.isRepeating) {
    $wnd.clearInterval(this$static.timerId);
  }
   else {
    $wnd.clearTimeout(this$static.timerId);
  }
  $remove_0(timers, this$static);
}

function $fireImpl(this$static){
  if (!this$static.isRepeating) {
    $remove_0(timers, this$static);
  }
  $run(this$static);
}

function $schedule(this$static, delayMillis){
  if (delayMillis <= 0) {
    throw $IllegalArgumentException(new IllegalArgumentException(), 'must be positive');
  }
  $cancel(this$static);
  this$static.isRepeating = false;
  this$static.timerId = createTimeout(this$static, delayMillis);
  $add(timers, this$static);
}

function createTimeout(timer, delay){
  return psettimeout(function(){
    timer.fire();
  }
  , delay);
}

function fire(){
  $fireImpl(this);
}

function getClass_4(){
  return Lcom_google_gwt_user_client_Timer_2_classLit;
}

function Timer(){
}

_ = Timer.prototype = new Object_0();
_.fire = fire;
_.getClass$ = getClass_4;
_.typeId$ = 0;
_.isRepeating = false;
_.timerId = 0;
var timers;
function $onWindowClosed(){
  while (($clinit_12() , timers).size > 0) {
    $cancel(dynamicCast($get_0(timers, 0), 3));
  }
}

function getClass_3(){
  return Lcom_google_gwt_user_client_Timer$1_2_classLit;
}

function Timer$1(){
}

_ = Timer$1.prototype = new Object_0();
_.getClass$ = getClass_3;
_.typeId$ = 7;
function addWindowCloseListener(listener){
  maybeInitializeHandlers();
  if (!closingListeners) {
    closingListeners = $ArrayList(new ArrayList());
  }
  $add(closingListeners, listener);
}

function fireClosedImpl(){
  var listener$iterator;
  if (closingListeners) {
    for (listener$iterator = $AbstractList$IteratorImpl(new AbstractList$IteratorImpl(), closingListeners); listener$iterator.i < listener$iterator.this$0.size_0();) {
      dynamicCast($next(listener$iterator), 4);
      $onWindowClosed();
    }
  }
}

function fireClosingImpl(){
  var listener$iterator, ret;
  ret = null;
  if (closingListeners) {
    for (listener$iterator = $AbstractList$IteratorImpl(new AbstractList$IteratorImpl(), closingListeners); listener$iterator.i < listener$iterator.this$0.size_0();) {
      dynamicCast($next(listener$iterator), 4);
      ret = null;
    }
  }
  return ret;
}

function init(){
  __gwt_initHandlers(function(){
  }
  , function(){
    return fireClosingImpl();
  }
  , function(){
    fireClosedImpl();
  }
  );
}

function maybeInitializeHandlers(){
  if (!handlersAreInitialized) {
    init();
    handlersAreInitialized = true;
  }
}

var closingListeners = null, handlersAreInitialized = false;
function $ArrayStoreException(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_5(){
  return Ljava_lang_ArrayStoreException_2_classLit;
}

function ArrayStoreException(){
}

_ = ArrayStoreException.prototype = new RuntimeException();
_.getClass$ = getClass_5;
_.typeId$ = 9;
function createForArray(packageName, className){
  var clazz;
  clazz = new Class();
  clazz.typeName = packageName + className;
  clazz.modifiers = 4;
  return clazz;
}

function createForClass(packageName, className){
  var clazz;
  clazz = new Class();
  clazz.typeName = packageName + className;
  return clazz;
}

function createForEnum(packageName, className){
  var clazz;
  clazz = new Class();
  clazz.typeName = packageName + className;
  clazz.modifiers = 8;
  return clazz;
}

function getClass_7(){
  return Ljava_lang_Class_2_classLit;
}

function toString_1(){
  return ((this.modifiers & 2) != 0?'interface ':(this.modifiers & 1) != 0?'':'class ') + this.typeName;
}

function Class(){
}

_ = Class.prototype = new Object_0();
_.getClass$ = getClass_7;
_.toString$ = toString_1;
_.typeId$ = 0;
_.modifiers = 0;
_.typeName = null;
function getClass_6(){
  return Ljava_lang_ClassCastException_2_classLit;
}

function ClassCastException(){
}

_ = ClassCastException.prototype = new RuntimeException();
_.getClass$ = getClass_6;
_.typeId$ = 12;
function compareTo(other){
  return this.ordinal - other.ordinal;
}

function equals_0(other){
  return (this == null?null:this) === (other == null?null:other);
}

function getClass_8(){
  return Ljava_lang_Enum_2_classLit;
}

function hashCode_1(){
  return this.$H || (this.$H = ++sNextHashId);
}

function toString_2(){
  return this.name_0;
}

function Enum(){
}

_ = Enum.prototype = new Object_0();
_.compareTo$ = compareTo;
_.equals$ = equals_0;
_.getClass$ = getClass_8;
_.hashCode$ = hashCode_1;
_.toString$ = toString_2;
_.typeId$ = 13;
_.name_0 = null;
_.ordinal = 0;
function $IllegalArgumentException(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_10(){
  return Ljava_lang_IllegalArgumentException_2_classLit;
}

function IllegalArgumentException(){
}

_ = IllegalArgumentException.prototype = new RuntimeException();
_.getClass$ = getClass_10;
_.typeId$ = 14;
function $IndexOutOfBoundsException(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_11(){
  return Ljava_lang_IndexOutOfBoundsException_2_classLit;
}

function IndexOutOfBoundsException(){
}

_ = IndexOutOfBoundsException.prototype = new RuntimeException();
_.getClass$ = getClass_11;
_.typeId$ = 15;
function toPowerOfTwoString(value, shift){
  var bitMask, buf, bufSize, pos;
  bufSize = ~~(32 / shift);
  bitMask = (1 << shift) - 1;
  buf = initDim(_3C_classLit, 42, -1, bufSize, 1);
  pos = bufSize - 1;
  if (value >= 0) {
    while (value > bitMask) {
      buf[pos--] = ($clinit_31() , digits)[value & bitMask];
      value >>= shift;
    }
  }
   else {
    while (pos > 0) {
      buf[pos--] = ($clinit_31() , digits)[value & bitMask];
      value >>= shift;
    }
  }
  buf[pos] = ($clinit_31() , digits)[value & bitMask];
  return __valueOf(buf, pos, bufSize);
}

function getClass_12(){
  return Ljava_lang_NullPointerException_2_classLit;
}

function NullPointerException(){
}

_ = NullPointerException.prototype = new RuntimeException();
_.getClass$ = getClass_12;
_.typeId$ = 16;
function $clinit_31(){
  $clinit_31 = nullMethod;
  digits = initValues(_3C_classLit, 42, -1, [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122]);
}

var digits;
function $equals_0(this$static, other){
  if (!(other != null && canCast(other.typeId$, 1))) {
    return false;
  }
  return String(this$static) == other;
}

function $getChars_0(this$static, srcBegin, srcEnd, dst, dstBegin){
  var srcIdx;
  for (srcIdx = srcBegin; srcIdx < srcEnd; ++srcIdx) {
    dst[dstBegin++] = this$static.charCodeAt(srcIdx);
  }
}

function $toCharArray(this$static){
  var charArr, n;
  n = this$static.length;
  charArr = initDim(_3C_classLit, 42, -1, n, 1);
  $getChars_0(this$static, 0, n, charArr, 0);
  return charArr;
}

function __checkBounds(legalCount, start, end){
  if (start < 0) {
    throw $StringIndexOutOfBoundsException(new StringIndexOutOfBoundsException(), start);
  }
  if (end < start) {
    throw $StringIndexOutOfBoundsException(new StringIndexOutOfBoundsException(), end - start);
  }
  if (end > legalCount) {
    throw $StringIndexOutOfBoundsException(new StringIndexOutOfBoundsException(), end);
  }
}

function __valueOf(x, start, end){
  x = x.slice(start, end);
  return String.fromCharCode.apply(null, x);
}

function compareTo_1(thisStr, otherStr){
  thisStr = String(thisStr);
  if (thisStr == otherStr) {
    return 0;
  }
  return thisStr < otherStr?-1:1;
}

function compareTo_0(other){
  return compareTo_1(this, other);
}

function equals_2(other){
  return $equals_0(this, other);
}

function getClass_18(){
  return Ljava_lang_String_2_classLit;
}

function hashCode_3(){
  return getHashCode_0(this);
}

function toString_6(){
  return this;
}

function valueOf_1(x, offset, count){
  var end;
  end = offset + count;
  __checkBounds(x.length, offset, end);
  return __valueOf(x, offset, end);
}

_ = String.prototype;
_.compareTo$ = compareTo_0;
_.equals$ = equals_2;
_.getClass$ = getClass_18;
_.hashCode$ = hashCode_3;
_.toString$ = toString_6;
_.typeId$ = 2;
function $clinit_35(){
  $clinit_35 = nullMethod;
  back = {};
  front = {};
}

function compute(str){
  var hashCode, i, inc, n;
  n = str.length;
  inc = n < 64?1:~~(n / 32);
  hashCode = 0;
  for (i = 0; i < n; i += inc) {
    hashCode <<= 1;
    hashCode += str.charCodeAt(i);
  }
  hashCode |= 0;
  return hashCode;
}

function getHashCode_0(str){
  $clinit_35();
  var key = ':' + str;
  var result = front[key];
  if (result != null) {
    return result;
  }
  result = back[key];
  if (result == null) {
    result = compute(str);
  }
  increment();
  return front[key] = result;
}

function increment(){
  if (count_0 == 256) {
    back = front;
    front = {};
    count_0 = 0;
  }
  ++count_0;
}

var back, count_0 = 0, front;
function $StringBuffer(this$static){
  this$static.builder = $StringBuilder(new StringBuilder());
  return this$static;
}

function $append(this$static, toAppend){
  $append_0(this$static.builder, toAppend);
  return this$static;
}

function getClass_15(){
  return Ljava_lang_StringBuffer_2_classLit;
}

function toString_4(){
  return $toString_0(this.builder);
}

function StringBuffer(){
}

_ = StringBuffer.prototype = new Object_0();
_.getClass$ = getClass_15;
_.toString$ = toString_4;
_.typeId$ = 17;
function $StringBuilder(this$static){
  this$static.stringArray = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 0, 0);
  return this$static;
}

function $append_0(this$static, toAppend){
  var appendLength;
  if (toAppend == null) {
    toAppend = 'null';
  }
  appendLength = toAppend.length;
  if (appendLength > 0) {
    this$static.stringArray[this$static.arrayLen++] = toAppend;
    this$static.stringLength += appendLength;
    if (this$static.arrayLen > 1024) {
      $toString_0(this$static);
      this$static.stringArray.length = 1024;
    }
  }
  return this$static;
}

function $getChars(this$static, srcStart, srcEnd, dst, dstStart){
  var s;
  __checkBounds(this$static.stringLength, srcStart, srcEnd);
  __checkBounds(dst.length, dstStart, dstStart + (srcEnd - srcStart));
  s = $toString_0(this$static);
  while (srcStart < srcEnd) {
    dst[dstStart++] = s.charCodeAt(srcStart++);
  }
}

function $setLength(this$static, newLength){
  var oldLength, s;
  oldLength = this$static.stringLength;
  if (newLength < oldLength) {
    s = $toString_0(this$static);
    this$static.stringArray = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [s.substr(0, newLength - 0), '', s.substr(oldLength, s.length - oldLength)]);
    this$static.arrayLen = 3;
    this$static.stringLength += ''.length - (oldLength - newLength);
  }
   else if (newLength > oldLength) {
    $append_0(this$static, String.fromCharCode.apply(null, initDim(_3C_classLit, 42, -1, newLength - oldLength, 1)));
  }
}

function $toString_0(this$static){
  var s;
  if (this$static.arrayLen != 1) {
    this$static.stringArray.length = this$static.arrayLen;
    s = this$static.stringArray.join('');
    this$static.stringArray = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [s]);
    this$static.arrayLen = 1;
  }
  return this$static.stringArray[0];
}

function getClass_16(){
  return Ljava_lang_StringBuilder_2_classLit;
}

function toString_5(){
  return $toString_0(this);
}

function StringBuilder(){
}

_ = StringBuilder.prototype = new Object_0();
_.getClass$ = getClass_16;
_.toString$ = toString_5;
_.typeId$ = 18;
_.arrayLen = 0;
_.stringLength = 0;
function $StringIndexOutOfBoundsException(this$static, index){
  this$static.detailMessage = 'String index out of range: ' + index;
  return this$static;
}

function getClass_17(){
  return Ljava_lang_StringIndexOutOfBoundsException_2_classLit;
}

function StringIndexOutOfBoundsException(){
}

_ = StringIndexOutOfBoundsException.prototype = new IndexOutOfBoundsException();
_.getClass$ = getClass_17;
_.typeId$ = 19;
function arraycopy(src, srcOfs, dest, destOfs, len){
  var destArray, destEnd, destTypeName, destlen, srcArray, srcTypeName, srclen;
  if (src == null || dest == null) {
    throw new NullPointerException();
  }
  srcTypeName = (src.typeMarker$ == nullMethod || src.typeId$ == 2?src.getClass$():Lcom_google_gwt_core_client_JavaScriptObject_2_classLit).typeName;
  destTypeName = (dest.typeMarker$ == nullMethod || dest.typeId$ == 2?dest.getClass$():Lcom_google_gwt_core_client_JavaScriptObject_2_classLit).typeName;
  if (srcTypeName.charCodeAt(0) != 91 || destTypeName.charCodeAt(0) != 91) {
    throw $ArrayStoreException(new ArrayStoreException(), 'Must be array types');
  }
  if (srcTypeName.charCodeAt(1) != destTypeName.charCodeAt(1)) {
    throw $ArrayStoreException(new ArrayStoreException(), 'Array types must match');
  }
  srclen = src.length;
  destlen = dest.length;
  if (srcOfs < 0 || destOfs < 0 || len < 0 || srcOfs + len > srclen || destOfs + len > destlen) {
    throw new IndexOutOfBoundsException();
  }
  if ((srcTypeName.charCodeAt(1) == 76 || srcTypeName.charCodeAt(1) == 91) && !$equals_0(srcTypeName, destTypeName)) {
    srcArray = dynamicCast(src, 5);
    destArray = dynamicCast(dest, 5);
    if ((src == null?null:src) === (dest == null?null:dest) && srcOfs < destOfs) {
      srcOfs += len;
      for (destEnd = destOfs + len; destEnd-- > destOfs;) {
        setCheck(destArray, destEnd, srcArray[--srcOfs]);
      }
    }
     else {
      for (destEnd = destOfs + len; destOfs < destEnd;) {
        setCheck(destArray, destOfs++, srcArray[srcOfs++]);
      }
    }
  }
   else {
    Array.prototype.splice.apply(dest, [destOfs, len].concat(src.slice(srcOfs, srcOfs + len)));
  }
}

function $UnsupportedOperationException(this$static, message){
  this$static.detailMessage = message;
  return this$static;
}

function getClass_20(){
  return Ljava_lang_UnsupportedOperationException_2_classLit;
}

function UnsupportedOperationException(){
}

_ = UnsupportedOperationException.prototype = new RuntimeException();
_.getClass$ = getClass_20;
_.typeId$ = 20;
function $advanceToFind(iter, o){
  var t;
  while (iter.hasNext()) {
    t = iter.next_0();
    if (o == null?t == null:equals__devirtual$(o, t)) {
      return iter;
    }
  }
  return null;
}

function add(o){
  throw $UnsupportedOperationException(new UnsupportedOperationException(), 'Add not supported on this collection');
}

function contains(o){
  var iter;
  iter = $advanceToFind(this.iterator(), o);
  return !!iter;
}

function getClass_21(){
  return Ljava_util_AbstractCollection_2_classLit;
}

function toString_8(){
  var comma, iter, sb;
  sb = $StringBuffer(new StringBuffer());
  comma = null;
  $append_0(sb.builder, '[');
  iter = this.iterator();
  while (iter.hasNext()) {
    if (comma != null) {
      $append_0(sb.builder, comma);
    }
     else {
      comma = ', ';
    }
    $append(sb, '' + iter.next_0());
  }
  $append_0(sb.builder, ']');
  return $toString_0(sb.builder);
}

function AbstractCollection(){
}

_ = AbstractCollection.prototype = new Object_0();
_.add_1 = add;
_.contains = contains;
_.getClass$ = getClass_21;
_.toString$ = toString_8;
_.typeId$ = 0;
function equals_5(obj){
  var entry, entry$iterator, otherKey, otherMap, otherValue;
  if ((obj == null?null:obj) === (this == null?null:this)) {
    return true;
  }
  if (!(obj != null && canCast(obj.typeId$, 16))) {
    return false;
  }
  otherMap = dynamicCast(obj, 16);
  if (dynamicCast(this, 16).size != otherMap.size) {
    return false;
  }
  for (entry$iterator = $AbstractHashMap$EntrySetIterator(new AbstractHashMap$EntrySetIterator(), $AbstractHashMap$EntrySet(new AbstractHashMap$EntrySet(), otherMap).this$0); $hasNext(entry$iterator.iter);) {
    entry = dynamicCast($next(entry$iterator.iter), 14);
    otherKey = entry.getKey();
    otherValue = entry.getValue();
    if (!(otherKey == null?dynamicCast(this, 16).nullSlotLive:otherKey != null?$hasStringValue(dynamicCast(this, 16), otherKey):$hasHashValue(dynamicCast(this, 16), otherKey, ~~getHashCode_0(otherKey)))) {
      return false;
    }
    if (!equalsWithNullCheck(otherValue, otherKey == null?dynamicCast(this, 16).nullSlot:otherKey != null?dynamicCast(this, 16).stringMap[':' + otherKey]:$getHashValue(dynamicCast(this, 16), otherKey, ~~getHashCode_0(otherKey)))) {
      return false;
    }
  }
  return true;
}

function getClass_31(){
  return Ljava_util_AbstractMap_2_classLit;
}

function hashCode_6(){
  var entry, entry$iterator, hashCode;
  hashCode = 0;
  for (entry$iterator = $AbstractHashMap$EntrySetIterator(new AbstractHashMap$EntrySetIterator(), $AbstractHashMap$EntrySet(new AbstractHashMap$EntrySet(), dynamicCast(this, 16)).this$0); $hasNext(entry$iterator.iter);) {
    entry = dynamicCast($next(entry$iterator.iter), 14);
    hashCode += entry.hashCode$();
    hashCode = ~~hashCode;
  }
  return hashCode;
}

function toString_10(){
  var comma, entry, iter, s;
  s = '{';
  comma = false;
  for (iter = $AbstractHashMap$EntrySetIterator(new AbstractHashMap$EntrySetIterator(), $AbstractHashMap$EntrySet(new AbstractHashMap$EntrySet(), dynamicCast(this, 16)).this$0); $hasNext(iter.iter);) {
    entry = dynamicCast($next(iter.iter), 14);
    if (comma) {
      s += ', ';
    }
     else {
      comma = true;
    }
    s += '' + entry.getKey();
    s += '=';
    s += '' + entry.getValue();
  }
  return s + '}';
}

function AbstractMap(){
}

_ = AbstractMap.prototype = new Object_0();
_.equals$ = equals_5;
_.getClass$ = getClass_31;
_.hashCode$ = hashCode_6;
_.toString$ = toString_10;
_.typeId$ = 0;
function $addAllHashEntries(this$static, dest){
  var hashCodeMap = this$static.hashCodeMap;
  for (var hashCode in hashCodeMap) {
    if (hashCode == parseInt(hashCode)) {
      var array = hashCodeMap[hashCode];
      for (var i = 0, c = array.length; i < c; ++i) {
        dest.add_1(array[i]);
      }
    }
  }
}

function $addAllStringEntries(this$static, dest){
  var stringMap = this$static.stringMap;
  for (var key in stringMap) {
    if (key.charCodeAt(0) == 58) {
      var entry = new_$(this$static, key.substring(1));
      dest.add_1(entry);
    }
  }
}

function $clearImpl(this$static){
  this$static.hashCodeMap = [];
  this$static.stringMap = {};
  this$static.nullSlotLive = false;
  this$static.nullSlot = null;
  this$static.size = 0;
}

function $containsKey(this$static, key){
  return key == null?this$static.nullSlotLive:key != null?':' + key in this$static.stringMap:$hasHashValue(this$static, key, ~~getHashCode_0(key));
}

function $get(this$static, key){
  return key == null?this$static.nullSlot:key != null?this$static.stringMap[':' + key]:$getHashValue(this$static, key, ~~getHashCode_0(key));
}

function $getHashValue(this$static, key, hashCode){
  var array = this$static.hashCodeMap[hashCode];
  if (array) {
    for (var i = 0, c = array.length; i < c; ++i) {
      var entry = array[i];
      var entryKey = entry.getKey();
      if (this$static.equalsBridge(key, entryKey)) {
        return entry.getValue();
      }
    }
  }
  return null;
}

function $hasHashValue(this$static, key, hashCode){
  var array = this$static.hashCodeMap[hashCode];
  if (array) {
    for (var i = 0, c = array.length; i < c; ++i) {
      var entry = array[i];
      var entryKey = entry.getKey();
      if (this$static.equalsBridge(key, entryKey)) {
        return true;
      }
    }
  }
  return false;
}

function $hasStringValue(this$static, key){
  return ':' + key in this$static.stringMap;
}

function equalsBridge(value1, value2){
  return (value1 == null?null:value1) === (value2 == null?null:value2) || value1 != null && equals__devirtual$(value1, value2);
}

function getClass_26(){
  return Ljava_util_AbstractHashMap_2_classLit;
}

function AbstractHashMap(){
}

_ = AbstractHashMap.prototype = new AbstractMap();
_.equalsBridge = equalsBridge;
_.getClass$ = getClass_26;
_.typeId$ = 0;
_.hashCodeMap = null;
_.nullSlot = null;
_.nullSlotLive = false;
_.size = 0;
_.stringMap = null;
function equals_6(o){
  var iter, other, otherItem;
  if ((o == null?null:o) === (this == null?null:this)) {
    return true;
  }
  if (!(o != null && canCast(o.typeId$, 18))) {
    return false;
  }
  other = dynamicCast(o, 18);
  if (other.this$0.size != this.size_0()) {
    return false;
  }
  for (iter = $AbstractHashMap$EntrySetIterator(new AbstractHashMap$EntrySetIterator(), other.this$0); $hasNext(iter.iter);) {
    otherItem = dynamicCast($next(iter.iter), 14);
    if (!this.contains(otherItem)) {
      return false;
    }
  }
  return true;
}

function getClass_33(){
  return Ljava_util_AbstractSet_2_classLit;
}

function hashCode_7(){
  var hashCode, iter, next;
  hashCode = 0;
  for (iter = this.iterator(); iter.hasNext();) {
    next = iter.next_0();
    if (next != null) {
      hashCode += hashCode__devirtual$(next);
      hashCode = ~~hashCode;
    }
  }
  return hashCode;
}

function AbstractSet(){
}

_ = AbstractSet.prototype = new AbstractCollection();
_.equals$ = equals_6;
_.getClass$ = getClass_33;
_.hashCode$ = hashCode_7;
_.typeId$ = 0;
function $AbstractHashMap$EntrySet(this$static, this$0){
  this$static.this$0 = this$0;
  return this$static;
}

function contains_0(o){
  var entry, key, value;
  if (o != null && canCast(o.typeId$, 14)) {
    entry = dynamicCast(o, 14);
    key = entry.getKey();
    if ($containsKey(this.this$0, key)) {
      value = $get(this.this$0, key);
      return $equals_1(entry.getValue(), value);
    }
  }
  return false;
}

function getClass_23(){
  return Ljava_util_AbstractHashMap$EntrySet_2_classLit;
}

function iterator(){
  return $AbstractHashMap$EntrySetIterator(new AbstractHashMap$EntrySetIterator(), this.this$0);
}

function size_0(){
  return this.this$0.size;
}

function AbstractHashMap$EntrySet(){
}

_ = AbstractHashMap$EntrySet.prototype = new AbstractSet();
_.contains = contains_0;
_.getClass$ = getClass_23;
_.iterator = iterator;
_.size_0 = size_0;
_.typeId$ = 21;
_.this$0 = null;
function $AbstractHashMap$EntrySetIterator(this$static, this$0){
  var list;
  this$static.this$0 = this$0;
  list = $ArrayList(new ArrayList());
  if (this$static.this$0.nullSlotLive) {
    $add(list, $AbstractHashMap$MapEntryNull(new AbstractHashMap$MapEntryNull(), this$static.this$0));
  }
  $addAllStringEntries(this$static.this$0, list);
  $addAllHashEntries(this$static.this$0, list);
  this$static.iter = $AbstractList$IteratorImpl(new AbstractList$IteratorImpl(), list);
  return this$static;
}

function getClass_22(){
  return Ljava_util_AbstractHashMap$EntrySetIterator_2_classLit;
}

function hasNext(){
  return $hasNext(this.iter);
}

function next_0(){
  return dynamicCast($next(this.iter), 14);
}

function AbstractHashMap$EntrySetIterator(){
}

_ = AbstractHashMap$EntrySetIterator.prototype = new Object_0();
_.getClass$ = getClass_22;
_.hasNext = hasNext;
_.next_0 = next_0;
_.typeId$ = 0;
_.iter = null;
_.this$0 = null;
function equals_4(other){
  var entry;
  if (other != null && canCast(other.typeId$, 14)) {
    entry = dynamicCast(other, 14);
    if (equalsWithNullCheck(this.getKey(), entry.getKey()) && equalsWithNullCheck(this.getValue(), entry.getValue())) {
      return true;
    }
  }
  return false;
}

function getClass_30(){
  return Ljava_util_AbstractMapEntry_2_classLit;
}

function hashCode_5(){
  var keyHash, valueHash;
  keyHash = 0;
  valueHash = 0;
  if (this.getKey() != null) {
    keyHash = getHashCode_0(this.getKey());
  }
  if (this.getValue() != null) {
    valueHash = hashCode__devirtual$(this.getValue());
  }
  return keyHash ^ valueHash;
}

function toString_9(){
  return this.getKey() + '=' + this.getValue();
}

function AbstractMapEntry(){
}

_ = AbstractMapEntry.prototype = new Object_0();
_.equals$ = equals_4;
_.getClass$ = getClass_30;
_.hashCode$ = hashCode_5;
_.toString$ = toString_9;
_.typeId$ = 22;
function $AbstractHashMap$MapEntryNull(this$static, this$0){
  this$static.this$0 = this$0;
  return this$static;
}

function getClass_24(){
  return Ljava_util_AbstractHashMap$MapEntryNull_2_classLit;
}

function getKey(){
  return null;
}

function getValue(){
  return this.this$0.nullSlot;
}

function AbstractHashMap$MapEntryNull(){
}

_ = AbstractHashMap$MapEntryNull.prototype = new AbstractMapEntry();
_.getClass$ = getClass_24;
_.getKey = getKey;
_.getValue = getValue;
_.typeId$ = 23;
_.this$0 = null;
function $AbstractHashMap$MapEntryString(this$static, key, this$0){
  this$static.this$0 = this$0;
  this$static.key = key;
  return this$static;
}

function getClass_25(){
  return Ljava_util_AbstractHashMap$MapEntryString_2_classLit;
}

function getKey_0(){
  return this.key;
}

function getValue_0(){
  return this.this$0.stringMap[':' + this.key];
}

function new_$(this$outer, key){
  return $AbstractHashMap$MapEntryString(new AbstractHashMap$MapEntryString(), key, this$outer);
}

function AbstractHashMap$MapEntryString(){
}

_ = AbstractHashMap$MapEntryString.prototype = new AbstractMapEntry();
_.getClass$ = getClass_25;
_.getKey = getKey_0;
_.getValue = getValue_0;
_.typeId$ = 24;
_.key = null;
_.this$0 = null;
function add_1(obj){
  this.add_0(this.size_0(), obj);
  return true;
}

function add_0(index, element){
  throw $UnsupportedOperationException(new UnsupportedOperationException(), 'Add not supported on this list');
}

function checkIndex(index, size){
  if (index < 0 || index >= size) {
    indexOutOfBounds(index, size);
  }
}

function equals_3(o){
  var elem, elemOther, iter, iterOther, other;
  if ((o == null?null:o) === (this == null?null:this)) {
    return true;
  }
  if (!(o != null && canCast(o.typeId$, 15))) {
    return false;
  }
  other = dynamicCast(o, 15);
  if (this.size_0() != other.size_0()) {
    return false;
  }
  iter = this.iterator();
  iterOther = other.iterator();
  while (iter.i < iter.this$0.size_0()) {
    elem = $next(iter);
    elemOther = $next(iterOther);
    if (!(elem == null?elemOther == null:equals__devirtual$(elem, elemOther))) {
      return false;
    }
  }
  return true;
}

function getClass_29(){
  return Ljava_util_AbstractList_2_classLit;
}

function hashCode_4(){
  var iter, k, obj;
  k = 1;
  iter = this.iterator();
  while (iter.i < iter.this$0.size_0()) {
    obj = $next(iter);
    k = 31 * k + (obj == null?0:hashCode__devirtual$(obj));
    k = ~~k;
  }
  return k;
}

function indexOutOfBounds(index, size){
  throw $IndexOutOfBoundsException(new IndexOutOfBoundsException(), 'Index: ' + index + ', Size: ' + size);
}

function iterator_0(){
  return $AbstractList$IteratorImpl(new AbstractList$IteratorImpl(), this);
}

function AbstractList(){
}

_ = AbstractList.prototype = new AbstractCollection();
_.add_1 = add_1;
_.add_0 = add_0;
_.equals$ = equals_3;
_.getClass$ = getClass_29;
_.hashCode$ = hashCode_4;
_.iterator = iterator_0;
_.typeId$ = 25;
function $AbstractList$IteratorImpl(this$static, this$0){
  this$static.this$0 = this$0;
  return this$static;
}

function $hasNext(this$static){
  return this$static.i < this$static.this$0.size_0();
}

function $next(this$static){
  if (this$static.i >= this$static.this$0.size_0()) {
    throw new NoSuchElementException();
  }
  return this$static.this$0.get(this$static.i++);
}

function getClass_27(){
  return Ljava_util_AbstractList$IteratorImpl_2_classLit;
}

function hasNext_0(){
  return this.i < this.this$0.size_0();
}

function next_1(){
  return $next(this);
}

function AbstractList$IteratorImpl(){
}

_ = AbstractList$IteratorImpl.prototype = new Object_0();
_.getClass$ = getClass_27;
_.hasNext = hasNext_0;
_.next_0 = next_1;
_.typeId$ = 0;
_.i = 0;
_.this$0 = null;
function $AbstractList$ListIteratorImpl(this$static, this$0){
  this$static.this$0 = this$0;
  return this$static;
}

function getClass_28(){
  return Ljava_util_AbstractList$ListIteratorImpl_2_classLit;
}

function AbstractList$ListIteratorImpl(){
}

_ = AbstractList$ListIteratorImpl.prototype = new AbstractList$IteratorImpl();
_.getClass$ = getClass_28;
_.typeId$ = 0;
function add_2(index, element){
  var iter;
  iter = $listIterator(this, index);
  $addBefore(iter.this$0, element, iter.currentNode);
  ++iter.currentIndex;
  iter.lastNode = null;
}

function get(index){
  var $e0, iter;
  iter = $listIterator(this, index);
  try {
    return $next_0(iter);
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 17)) {
      throw $IndexOutOfBoundsException(new IndexOutOfBoundsException(), "Can't get element " + index);
    }
     else 
      throw $e0;
  }
}

function getClass_32(){
  return Ljava_util_AbstractSequentialList_2_classLit;
}

function iterator_1(){
  return $AbstractList$ListIteratorImpl(new AbstractList$ListIteratorImpl(), this);
}

function AbstractSequentialList(){
}

_ = AbstractSequentialList.prototype = new AbstractList();
_.add_0 = add_2;
_.get = get;
_.getClass$ = getClass_32;
_.iterator = iterator_1;
_.typeId$ = 26;
function $ArrayList(this$static){
  this$static.array = initDim(_3Ljava_lang_Object_2_classLit, 47, 0, 0, 0);
  this$static.size = 0;
  return this$static;
}

function $add(this$static, o){
  setCheck(this$static.array, this$static.size++, o);
  return true;
}

function $get_0(this$static, index){
  checkIndex(index, this$static.size);
  return this$static.array[index];
}

function $indexOf_0(this$static, o, index){
  for (; index < this$static.size; ++index) {
    if (equalsWithNullCheck(o, this$static.array[index])) {
      return index;
    }
  }
  return -1;
}

function $remove_0(this$static, o){
  var i, previous;
  i = $indexOf_0(this$static, o, 0);
  if (i == -1) {
    return false;
  }
  previous = (checkIndex(i, this$static.size) , this$static.array[i]);
  this$static.array.splice(i, 1);
  --this$static.size;
  return true;
}

function add_4(o){
  return setCheck(this.array, this.size++, o) , true;
}

function add_3(index, o){
  if (index < 0 || index > this.size) {
    indexOutOfBounds(index, this.size);
  }
  this.array.splice(index, 0, o);
  ++this.size;
}

function contains_1(o){
  return $indexOf_0(this, o, 0) != -1;
}

function get_0(index){
  return checkIndex(index, this.size) , this.array[index];
}

function getClass_34(){
  return Ljava_util_ArrayList_2_classLit;
}

function size_1(){
  return this.size;
}

function ArrayList(){
}

_ = ArrayList.prototype = new AbstractList();
_.add_1 = add_4;
_.add_0 = add_3;
_.contains = contains_1;
_.get = get_0;
_.getClass$ = getClass_34;
_.size_0 = size_1;
_.typeId$ = 27;
_.array = null;
_.size = 0;
function binarySearch(sortedArray, key){
  var high, low, mid, midVal;
  low = 0;
  high = sortedArray.length - 1;
  while (low <= high) {
    mid = low + (high - low >> 1);
    midVal = sortedArray[mid];
    if (midVal < key) {
      low = mid + 1;
    }
     else if (midVal > key) {
      high = mid - 1;
    }
     else {
      return mid;
    }
  }
  return -low - 1;
}

function binarySearch_0(sortedArray, key, comparator){
  var compareResult, high, low, mid, midVal;
  if (!comparator) {
    comparator = ($clinit_61() , NATURAL);
  }
  low = 0;
  high = sortedArray.length - 1;
  while (low <= high) {
    mid = low + (high - low >> 1);
    midVal = sortedArray[mid];
    compareResult = midVal.compareTo$(key);
    if (compareResult < 0) {
      low = mid + 1;
    }
     else if (compareResult > 0) {
      high = mid - 1;
    }
     else {
      return mid;
    }
  }
  return -low - 1;
}

function $clinit_61(){
  $clinit_61 = nullMethod;
  NATURAL = new Comparators$1();
}

var NATURAL;
function getClass_35(){
  return Ljava_util_Comparators$1_2_classLit;
}

function Comparators$1(){
}

_ = Comparators$1.prototype = new Object_0();
_.getClass$ = getClass_35;
_.typeId$ = 0;
function $HashMap(this$static){
  $clearImpl(this$static);
  return this$static;
}

function $equals_1(value1, value2){
  return (value1 == null?null:value1) === (value2 == null?null:value2) || value1 != null && equals__devirtual$(value1, value2);
}

function getClass_36(){
  return Ljava_util_HashMap_2_classLit;
}

function HashMap(){
}

_ = HashMap.prototype = new AbstractHashMap();
_.getClass$ = getClass_36;
_.typeId$ = 28;
function $LinkedList(this$static){
  this$static.header = $LinkedList$Node(new LinkedList$Node());
  this$static.size = 0;
  return this$static;
}

function $addBefore(this$static, o, target){
  $LinkedList$Node_0(new LinkedList$Node(), o, target);
  ++this$static.size;
}

function $addLast(this$static, o){
  $LinkedList$Node_0(new LinkedList$Node(), o, this$static.header);
  ++this$static.size;
}

function $clear(this$static){
  this$static.header = $LinkedList$Node(new LinkedList$Node());
  this$static.size = 0;
}

function $getLast(this$static){
  $throwEmptyException(this$static);
  return this$static.header.prev.value;
}

function $listIterator(this$static, index){
  var i, node;
  if (index < 0 || index > this$static.size) {
    indexOutOfBounds(index, this$static.size);
  }
  if (index >= this$static.size >> 1) {
    node = this$static.header;
    for (i = this$static.size; i > index; --i) {
      node = node.prev;
    }
  }
   else {
    node = this$static.header.next;
    for (i = 0; i < index; ++i) {
      node = node.next;
    }
  }
  return $LinkedList$ListIteratorImpl(new LinkedList$ListIteratorImpl(), index, node, this$static);
}

function $removeLast(this$static){
  var node;
  $throwEmptyException(this$static);
  --this$static.size;
  node = this$static.header.prev;
  node.next.prev = node.prev;
  node.prev.next = node.next;
  node.next = node.prev = node;
  return node.value;
}

function $throwEmptyException(this$static){
  if (this$static.size == 0) {
    throw new NoSuchElementException();
  }
}

function add_5(o){
  $LinkedList$Node_0(new LinkedList$Node(), o, this.header);
  ++this.size;
  return true;
}

function getClass_39(){
  return Ljava_util_LinkedList_2_classLit;
}

function size_2(){
  return this.size;
}

function LinkedList(){
}

_ = LinkedList.prototype = new AbstractSequentialList();
_.add_1 = add_5;
_.getClass$ = getClass_39;
_.size_0 = size_2;
_.typeId$ = 29;
_.header = null;
_.size = 0;
function $LinkedList$ListIteratorImpl(this$static, index, startNode, this$0){
  this$static.this$0 = this$0;
  this$static.currentNode = startNode;
  this$static.currentIndex = index;
  return this$static;
}

function $next_0(this$static){
  if (this$static.currentNode == this$static.this$0.header) {
    throw new NoSuchElementException();
  }
  this$static.lastNode = this$static.currentNode;
  this$static.currentNode = this$static.currentNode.next;
  ++this$static.currentIndex;
  return this$static.lastNode.value;
}

function getClass_37(){
  return Ljava_util_LinkedList$ListIteratorImpl_2_classLit;
}

function hasNext_1(){
  return this.currentNode != this.this$0.header;
}

function next_2(){
  return $next_0(this);
}

function LinkedList$ListIteratorImpl(){
}

_ = LinkedList$ListIteratorImpl.prototype = new Object_0();
_.getClass$ = getClass_37;
_.hasNext = hasNext_1;
_.next_0 = next_2;
_.typeId$ = 0;
_.currentIndex = 0;
_.currentNode = null;
_.lastNode = null;
_.this$0 = null;
function $LinkedList$Node(this$static){
  this$static.next = this$static.prev = this$static;
  return this$static;
}

function $LinkedList$Node_0(this$static, value, nextNode){
  this$static.value = value;
  this$static.next = nextNode;
  this$static.prev = nextNode.prev;
  nextNode.prev.next = this$static;
  nextNode.prev = this$static;
  return this$static;
}

function getClass_38(){
  return Ljava_util_LinkedList$Node_2_classLit;
}

function LinkedList$Node(){
}

_ = LinkedList$Node.prototype = new Object_0();
_.getClass$ = getClass_38;
_.typeId$ = 0;
_.next = null;
_.prev = null;
_.value = null;
function getClass_40(){
  return Ljava_util_NoSuchElementException_2_classLit;
}

function NoSuchElementException(){
}

_ = NoSuchElementException.prototype = new RuntimeException();
_.getClass$ = getClass_40;
_.typeId$ = 30;
function equalsWithNullCheck(a, b){
  return (a == null?null:a) === (b == null?null:b) || a != null && equals__devirtual$(a, b);
}

function $clinit_77(){
  $clinit_77 = nullMethod;
  HTML = $DoctypeExpectation(new DoctypeExpectation(), 'HTML', 0);
  $DoctypeExpectation(new DoctypeExpectation(), 'HTML401_TRANSITIONAL', 1);
  $DoctypeExpectation(new DoctypeExpectation(), 'HTML401_STRICT', 2);
  $DoctypeExpectation(new DoctypeExpectation(), 'AUTO', 3);
  $DoctypeExpectation(new DoctypeExpectation(), 'NO_DOCTYPE_ERRORS', 4);
}

function $DoctypeExpectation(this$static, enum$name, enum$ordinal){
  $clinit_77();
  this$static.name_0 = enum$name;
  this$static.ordinal = enum$ordinal;
  return this$static;
}

function getClass_41(){
  return Lnu_validator_htmlparser_common_DoctypeExpectation_2_classLit;
}

function DoctypeExpectation(){
}

_ = DoctypeExpectation.prototype = new Enum();
_.getClass$ = getClass_41;
_.typeId$ = 31;
var HTML;
function $clinit_78(){
  $clinit_78 = nullMethod;
  STANDARDS_MODE = $DocumentMode(new DocumentMode(), 'STANDARDS_MODE', 0);
  ALMOST_STANDARDS_MODE = $DocumentMode(new DocumentMode(), 'ALMOST_STANDARDS_MODE', 1);
  QUIRKS_MODE = $DocumentMode(new DocumentMode(), 'QUIRKS_MODE', 2);
}

function $DocumentMode(this$static, enum$name, enum$ordinal){
  $clinit_78();
  this$static.name_0 = enum$name;
  this$static.ordinal = enum$ordinal;
  return this$static;
}

function getClass_42(){
  return Lnu_validator_htmlparser_common_DocumentMode_2_classLit;
}

function DocumentMode(){
}

_ = DocumentMode.prototype = new Enum();
_.getClass$ = getClass_42;
_.typeId$ = 32;
var ALMOST_STANDARDS_MODE, QUIRKS_MODE, STANDARDS_MODE;
function $clinit_80(){
  $clinit_80 = nullMethod;
  ALLOW = $XmlViolationPolicy(new XmlViolationPolicy(), 'ALLOW', 0);
  FATAL = $XmlViolationPolicy(new XmlViolationPolicy(), 'FATAL', 1);
  ALTER_INFOSET = $XmlViolationPolicy(new XmlViolationPolicy(), 'ALTER_INFOSET', 2);
}

function $XmlViolationPolicy(this$static, enum$name, enum$ordinal){
  $clinit_80();
  this$static.name_0 = enum$name;
  this$static.ordinal = enum$ordinal;
  return this$static;
}

function getClass_43(){
  return Lnu_validator_htmlparser_common_XmlViolationPolicy_2_classLit;
}

function XmlViolationPolicy(){
}

_ = XmlViolationPolicy.prototype = new Enum();
_.getClass$ = getClass_43;
_.typeId$ = 33;
var ALLOW, ALTER_INFOSET, FATAL;
function $clinit_98(){
  $clinit_98 = nullMethod;
  ISINDEX_PROMPT = $toCharArray('This is a searchable index. Insert your search keywords here: ');
  HTML4_PUBLIC_IDS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['-//W3C//DTD HTML 4.0 Frameset//EN', '-//W3C//DTD HTML 4.0 Transitional//EN', '-//W3C//DTD HTML 4.0//EN', '-//W3C//DTD HTML 4.01 Frameset//EN', '-//W3C//DTD HTML 4.01 Transitional//EN', '-//W3C//DTD HTML 4.01//EN']);
  QUIRKY_PUBLIC_IDS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['+//silmaril//dtd html pro v0r11 19970101//', '-//advasoft ltd//dtd html 3.0 aswedit + extensions//', '-//as//dtd html 3.0 aswedit + extensions//', '-//ietf//dtd html 2.0 level 1//', '-//ietf//dtd html 2.0 level 2//', '-//ietf//dtd html 2.0 strict level 1//', '-//ietf//dtd html 2.0 strict level 2//', '-//ietf//dtd html 2.0 strict//', '-//ietf//dtd html 2.0//', '-//ietf//dtd html 2.1e//', '-//ietf//dtd html 3.0//', '-//ietf//dtd html 3.2 final//', '-//ietf//dtd html 3.2//', '-//ietf//dtd html 3//', '-//ietf//dtd html level 0//', '-//ietf//dtd html level 1//', '-//ietf//dtd html level 2//', '-//ietf//dtd html level 3//', '-//ietf//dtd html strict level 0//', '-//ietf//dtd html strict level 1//', '-//ietf//dtd html strict level 2//', '-//ietf//dtd html strict level 3//', '-//ietf//dtd html strict//', '-//ietf//dtd html//', '-//metrius//dtd metrius presentational//', '-//microsoft//dtd internet explorer 2.0 html strict//', '-//microsoft//dtd internet explorer 2.0 html//', '-//microsoft//dtd internet explorer 2.0 tables//', '-//microsoft//dtd internet explorer 3.0 html strict//', '-//microsoft//dtd internet explorer 3.0 html//', '-//microsoft//dtd internet explorer 3.0 tables//', '-//netscape comm. corp.//dtd html//', '-//netscape comm. corp.//dtd strict html//', "-//o'reilly and associates//dtd html 2.0//", "-//o'reilly and associates//dtd html extended 1.0//", "-//o'reilly and associates//dtd html extended relaxed 1.0//", '-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//', '-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//', '-//spyglass//dtd html 2.0 extended//', '-//sq//dtd html 2.0 hotmetal + extensions//', '-//sun microsystems corp.//dtd hotjava html//', '-//sun microsystems corp.//dtd hotjava strict html//', '-//w3c//dtd html 3 1995-03-24//', '-//w3c//dtd html 3.2 draft//', '-//w3c//dtd html 3.2 final//', '-//w3c//dtd html 3.2//', '-//w3c//dtd html 3.2s draft//', '-//w3c//dtd html 4.0 frameset//', '-//w3c//dtd html 4.0 transitional//', '-//w3c//dtd html experimental 19960712//', '-//w3c//dtd html experimental 970421//', '-//w3c//dtd w3 html//', '-//w3o//dtd w3 html 3.0//', '-//webtechs//dtd mozilla html 2.0//', '-//webtechs//dtd mozilla html//']);
}

function $accumulateCharacter(this$static, c){
  var newBuf, newLen;
  newLen = this$static.charBufferLen + 1;
  if (newLen > this$static.charBuffer.length) {
    newBuf = initDim(_3C_classLit, 42, -1, newLen, 1);
    arraycopy(this$static.charBuffer, 0, newBuf, 0, this$static.charBufferLen);
    this$static.charBuffer = newBuf;
  }
  this$static.charBuffer[this$static.charBufferLen] = c;
  this$static.charBufferLen = newLen;
}

function $addAttributesToBody(this$static, attributes){
  var body;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (this$static.currentPtr >= 1) {
    body = this$static.stack[1];
    if (body.group == 3) {
      $addAttributesToElement(this$static, body.node, attributes);
    }
  }
}

function $adoptionAgencyEndTag(this$static, name){
  var bookmark, clone, commonAncestor, formattingClone, formattingElt, formattingEltListPos, formattingEltStackPos, furthestBlock, furthestBlockPos, inScope, lastNode, listNode, newNode, node, nodeListPos, nodePos;
  $flushCharacters(this$static);
  for (;;) {
    formattingEltListPos = this$static.listPtr;
    while (formattingEltListPos > -1) {
      listNode = this$static.listOfActiveFormattingElements[formattingEltListPos];
      if (!listNode) {
        formattingEltListPos = -1;
        break;
      }
       else if (listNode.name_0 == name) {
        break;
      }
      --formattingEltListPos;
    }
    if (formattingEltListPos == -1) {
      return;
    }
    formattingElt = this$static.listOfActiveFormattingElements[formattingEltListPos];
    formattingEltStackPos = this$static.currentPtr;
    inScope = true;
    while (formattingEltStackPos > -1) {
      node = this$static.stack[formattingEltStackPos];
      if (node == formattingElt) {
        break;
      }
       else if (node.scoping) {
        inScope = false;
      }
      --formattingEltStackPos;
    }
    if (formattingEltStackPos == -1) {
      $removeFromListOfActiveFormattingElements(this$static, formattingEltListPos);
      return;
    }
    if (!inScope) {
      return;
    }
    furthestBlockPos = formattingEltStackPos + 1;
    while (furthestBlockPos <= this$static.currentPtr) {
      node = this$static.stack[furthestBlockPos];
      if (node.scoping || node.special) {
        break;
      }
      ++furthestBlockPos;
    }
    if (furthestBlockPos > this$static.currentPtr) {
      while (this$static.currentPtr >= formattingEltStackPos) {
        $pop(this$static);
      }
      $removeFromListOfActiveFormattingElements(this$static, formattingEltListPos);
      return;
    }
    commonAncestor = this$static.stack[formattingEltStackPos - 1];
    furthestBlock = this$static.stack[furthestBlockPos];
    bookmark = formattingEltListPos;
    nodePos = furthestBlockPos;
    lastNode = furthestBlock;
    for (;;) {
      --nodePos;
      node = this$static.stack[nodePos];
      nodeListPos = $findInListOfActiveFormattingElements(this$static, node);
      if (nodeListPos == -1) {
        $removeFromStack(this$static, nodePos);
        --furthestBlockPos;
        continue;
      }
      if (nodePos == formattingEltStackPos) {
        break;
      }
      if (nodePos == furthestBlockPos) {
        bookmark = nodeListPos + 1;
      }
      clone = $createElement(this$static, 'http://www.w3.org/1999/xhtml', node.name_0, $cloneAttributes(node.attributes));
      newNode = $StackNode(new StackNode(), node.group, node.ns, node.name_0, clone, node.scoping, node.special, node.fosterParenting, node.popName, node.attributes);
      node.attributes = null;
      this$static.stack[nodePos] = newNode;
      ++newNode.refcount;
      this$static.listOfActiveFormattingElements[nodeListPos] = newNode;
      --node.refcount;
      --node.refcount;
      node = newNode;
      $detachFromParent(this$static, lastNode.node);
      $appendElement(this$static, lastNode.node, node.node);
      lastNode = node;
    }
    if (commonAncestor.fosterParenting) {
      $detachFromParent(this$static, lastNode.node);
      $insertIntoFosterParent(this$static, lastNode.node);
    }
     else {
      $detachFromParent(this$static, lastNode.node);
      $appendElement(this$static, lastNode.node, commonAncestor.node);
    }
    clone = $createElement(this$static, 'http://www.w3.org/1999/xhtml', formattingElt.name_0, $cloneAttributes(formattingElt.attributes));
    formattingClone = $StackNode(new StackNode(), formattingElt.group, formattingElt.ns, formattingElt.name_0, clone, formattingElt.scoping, formattingElt.special, formattingElt.fosterParenting, formattingElt.popName, formattingElt.attributes);
    formattingElt.attributes = null;
    $appendChildrenToNewParent(this$static, furthestBlock.node, clone);
    $appendElement(this$static, clone, furthestBlock.node);
    $removeFromListOfActiveFormattingElements(this$static, formattingEltListPos);
    $insertIntoListOfActiveFormattingElements(this$static, formattingClone, bookmark);
    $removeFromStack(this$static, formattingEltStackPos);
    $insertIntoStack(this$static, formattingClone, furthestBlockPos);
  }
}

function $append_1(this$static, node){
  var newList;
  ++this$static.listPtr;
  if (this$static.listPtr == this$static.listOfActiveFormattingElements.length) {
    newList = initDim(_3Lnu_validator_htmlparser_impl_StackNode_2_classLit, 51, 11, this$static.listOfActiveFormattingElements.length + 64, 0);
    arraycopy(this$static.listOfActiveFormattingElements, 0, newList, 0, this$static.listOfActiveFormattingElements.length);
    this$static.listOfActiveFormattingElements = newList;
  }
  this$static.listOfActiveFormattingElements[this$static.listPtr] = node;
}

function $appendHtmlElementToDocumentAndPush(this$static, attributes){
  var elt, node;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createHtmlElementSetAsRoot(this$static, attributes);
  node = $StackNode_0(new StackNode(), 'http://www.w3.org/1999/xhtml', ($clinit_89() , HTML_0), elt);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushElement(this$static, ns, elementName, attributes){
  var elt, node;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement(this$static, ns, elementName.name_0, attributes);
  $appendElement(this$static, elt, this$static.stack[this$static.currentPtr].node);
  node = $StackNode_0(new StackNode(), ns, elementName, elt);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushElementMayFoster(this$static, ns, elementName, attributes){
  var current, elt, node, popName;
  $flushCharacters(this$static);
  popName = elementName.name_0;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (elementName.custom) {
    popName = $checkPopName(this$static, popName);
  }
  elt = $createElement(this$static, ns, popName, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_1(new StackNode(), ns, elementName, elt, popName);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushElementMayFoster_0(this$static, ns, elementName, attributes){
  var current, elt, node;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement_0(this$static, ns, elementName.name_0, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_0(new StackNode(), ns, elementName, elt);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushElementMayFosterCamelCase(this$static, ns, elementName, attributes){
  var current, elt, node, popName;
  $flushCharacters(this$static);
  popName = elementName.camelCaseName;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (elementName.custom) {
    popName = $checkPopName(this$static, popName);
  }
  elt = $createElement(this$static, ns, popName, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_2(new StackNode(), ns, elementName, elt, popName, ($clinit_89() , FOREIGNOBJECT) == elementName);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushElementMayFosterNoScoping(this$static, ns, elementName, attributes){
  var current, elt, node, popName;
  $flushCharacters(this$static);
  popName = elementName.name_0;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (elementName.custom) {
    popName = $checkPopName(this$static, popName);
  }
  elt = $createElement(this$static, ns, popName, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_2(new StackNode(), ns, elementName, elt, popName, false);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushFormElementMayFoster(this$static, attributes){
  var current, elt, node;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement(this$static, 'http://www.w3.org/1999/xhtml', 'form', attributes);
  this$static.formPointer = elt;
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_0(new StackNode(), 'http://www.w3.org/1999/xhtml', ($clinit_89() , FORM_0), elt);
  $push_0(this$static, node);
}

function $appendToCurrentNodeAndPushFormattingElementMayFoster(this$static, ns, elementName, attributes){
  var current, elt, node;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement(this$static, ns, elementName.name_0, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  node = $StackNode_3(new StackNode(), ns, elementName, elt, $cloneAttributes(attributes));
  $push_0(this$static, node);
  $append_1(this$static, node);
  ++node.refcount;
}

function $appendToCurrentNodeAndPushHeadElement(this$static, attributes){
  var elt, node;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement(this$static, 'http://www.w3.org/1999/xhtml', 'head', attributes);
  $appendElement(this$static, elt, this$static.stack[this$static.currentPtr].node);
  this$static.headPointer = elt;
  node = $StackNode_0(new StackNode(), 'http://www.w3.org/1999/xhtml', ($clinit_89() , HEAD), elt);
  $push_0(this$static, node);
}

function $appendVoidElementToCurrentMayFoster(this$static, ns, name, attributes){
  var current, elt;
  $flushCharacters(this$static);
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  elt = $createElement_0(this$static, ns, name, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  $elementPopped(this$static, ns, name, elt);
}

function $appendVoidElementToCurrentMayFoster_0(this$static, ns, elementName, attributes){
  var current, elt, popName;
  $flushCharacters(this$static);
  popName = elementName.name_0;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (elementName.custom) {
    popName = $checkPopName(this$static, popName);
  }
  elt = $createElement(this$static, ns, popName, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  $elementPopped(this$static, ns, popName, elt);
}

function $appendVoidElementToCurrentMayFosterCamelCase(this$static, ns, elementName, attributes){
  var current, elt, popName;
  $flushCharacters(this$static);
  popName = elementName.camelCaseName;
  $processNonNcNames(attributes, this$static, this$static.namePolicy);
  if (elementName.custom) {
    popName = $checkPopName(this$static, popName);
  }
  elt = $createElement(this$static, ns, popName, attributes);
  current = this$static.stack[this$static.currentPtr];
  if (current.fosterParenting) {
    $insertIntoFosterParent(this$static, elt);
  }
   else {
    $appendElement(this$static, elt, current.node);
  }
  $elementPopped(this$static, ns, popName, elt);
}

function $charBufferContainsNonWhitespace(this$static){
  var i;
  for (i = 0; i < this$static.charBufferLen; ++i) {
    switch (this$static.charBuffer[i]) {
      case 32:
      case 9:
      case 10:
      case 12:
        continue;
      default:return true;
    }
  }
  return false;
}

function $characters(this$static, buf, start, length){
  var end, i;
  if (this$static.needToDropLF) {
    if (buf[start] == 10) {
      ++start;
      --length;
      if (length == 0) {
        return;
      }
    }
    this$static.needToDropLF = false;
  }
  switch (this$static.mode) {
    case 6:
    case 12:
    case 8:
      $reconstructTheActiveFormattingElements(this$static);
    case 20:
      $accumulateCharacters(this$static, buf, start, length);
      return;
    default:end = start + length;
      charactersloop: for (i = start; i < end; ++i) {
        switch (buf[i]) {
          case 32:
          case 9:
          case 10:
          case 12:
            switch (this$static.mode) {
              case 0:
              case 1:
              case 2:
                start = i + 1;
                continue;
              case 21:
              case 3:
              case 4:
              case 5:
              case 9:
              case 16:
              case 17:
                continue;
              case 6:
              case 12:
              case 8:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $reconstructTheActiveFormattingElements(this$static);
                break charactersloop;
              case 7:
              case 10:
              case 11:
                $reconstructTheActiveFormattingElements(this$static);
                $accumulateCharacter(this$static, buf[i]);
                start = i + 1;
                continue;
              case 15:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $reconstructTheActiveFormattingElements(this$static);
                continue;
              case 18:
              case 19:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $reconstructTheActiveFormattingElements(this$static);
                continue;
            }

          default:switch (this$static.mode) {
              case 0:
                $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                this$static.mode = 1;
                --i;
                continue;
              case 1:
                $appendHtmlElementToDocumentAndPush(this$static, $emptyAttributes(this$static.tokenizer));
                this$static.mode = 2;
                --i;
                continue;
              case 2:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $appendToCurrentNodeAndPushHeadElement(this$static, ($clinit_91() , EMPTY_ATTRIBUTES));
                this$static.mode = 3;
                --i;
                continue;
              case 3:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $pop(this$static);
                this$static.mode = 5;
                --i;
                continue;
              case 4:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $pop(this$static);
                this$static.mode = 3;
                --i;
                continue;
              case 5:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), $emptyAttributes(this$static.tokenizer));
                this$static.mode = 21;
                --i;
                continue;
              case 21:
                this$static.mode = 6;
                --i;
                continue;
              case 6:
              case 12:
              case 8:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                $reconstructTheActiveFormattingElements(this$static);
                break charactersloop;
              case 7:
              case 10:
              case 11:
                $reconstructTheActiveFormattingElements(this$static);
                $accumulateCharacter(this$static, buf[i]);
                start = i + 1;
                continue;
              case 9:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                if (this$static.currentPtr == 0) {
                  start = i + 1;
                  continue;
                }

                $pop(this$static);
                this$static.mode = 7;
                --i;
                continue;
                break charactersloop;
              case 15:
                this$static.mode = 6;
                --i;
                continue;
              case 16:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                start = i + 1;
                continue;
              case 17:
                if (start < i) {
                  $accumulateCharacters(this$static, buf, start, i - start);
                  start = i;
                }

                start = i + 1;
                continue;
              case 18:
                this$static.mode = 6;
                --i;
                continue;
              case 19:
                this$static.mode = 16;
                --i;
                continue;
            }

        }
      }

      if (start < end) {
        $accumulateCharacters(this$static, buf, start, end - start);
      }

  }
}

function $checkMetaCharset(this$static, attributes){
  var content, internalCharsetHtml5, internalCharsetLegacy;
  content = $getValue_0(attributes, ($clinit_87() , CONTENT));
  internalCharsetLegacy = null;
  if (content != null) {
    internalCharsetLegacy = extractCharsetFromContent(content);
  }
  if (internalCharsetLegacy == null) {
    internalCharsetHtml5 = $getValue_0(attributes, CHARSET);
    if (internalCharsetHtml5 != null) {
      this$static.tokenizer.shouldSuspend = true;
    }
  }
   else {
    this$static.tokenizer.shouldSuspend = true;
  }
}

function $checkPopName(this$static, name){
  if (isNCName(name)) {
    return name;
  }
   else {
    switch (this$static.namePolicy.ordinal) {
      case 0:
        return name;
      case 2:
        return escapeName(name);
      case 1:
        $fatal_1(this$static, 'Element name \u201C' + name + '\u201D cannot be represented as XML 1.0.');
    }
  }
  return null;
}

function $clearStackBackTo(this$static, eltPos){
  while (this$static.currentPtr > eltPos) {
    $pop(this$static);
  }
}

function $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static){
  while (this$static.listPtr > -1) {
    if (!this$static.listOfActiveFormattingElements[this$static.listPtr]) {
      --this$static.listPtr;
      return;
    }
    --this$static.listOfActiveFormattingElements[this$static.listPtr].refcount;
    --this$static.listPtr;
  }
}

function $closeTheCell(this$static, eltPos){
  $generateImpliedEndTags(this$static);
  while (this$static.currentPtr >= eltPos) {
    $pop(this$static);
  }
  $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
  this$static.mode = 11;
  return;
}

function $comment(this$static, buf, start, length){
  var end, end_0, end_1;
  this$static.needToDropLF = false;
  if (!this$static.wantingComments) {
    return;
  }
  commentloop: for (;;) {
    switch (this$static.foreignFlag) {
      case 0:
        break commentloop;
      default:switch (this$static.mode) {
          case 0:
          case 1:
          case 18:
          case 19:
            $appendCommentToDocument(this$static, (end = start + length , __checkBounds(buf.length, start, end) , __valueOf(buf, start, end)));
            return;
          case 15:
            $flushCharacters(this$static);
            $appendComment(this$static, this$static.stack[0].node, (end_0 = start + length , __checkBounds(buf.length, start, end_0) , __valueOf(buf, start, end_0)));
            return;
          default:break commentloop;
        }

    }
  }
  $flushCharacters(this$static);
  $appendComment(this$static, this$static.stack[this$static.currentPtr].node, (end_1 = start + length , __checkBounds(buf.length, start, end_1) , __valueOf(buf, start, end_1)));
  return;
}

function $doctype(this$static, name, publicIdentifier, systemIdentifier, forceQuirks){
  this$static.needToDropLF = false;
  doctypeloop: for (;;) {
    switch (this$static.foreignFlag) {
      case 0:
        break doctypeloop;
      default:switch (this$static.mode) {
          case 0:
            switch (this$static.doctypeExpectation.ordinal) {
              case 0:
                if ($isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks)) {
                  $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                }
                 else if ($isAlmostStandards(publicIdentifier, systemIdentifier)) {
                  $documentModeInternal(this$static, ($clinit_78() , ALMOST_STANDARDS_MODE));
                }
                 else {
                  if ($equals_0('-//W3C//DTD HTML 4.0//EN', publicIdentifier) && (systemIdentifier == null || $equals_0('http://www.w3.org/TR/REC-html40/strict.dtd', systemIdentifier)) || $equals_0('-//W3C//DTD HTML 4.01//EN', publicIdentifier) && (systemIdentifier == null || $equals_0('http://www.w3.org/TR/html4/strict.dtd', systemIdentifier)) || $equals_0('-//W3C//DTD XHTML 1.0 Strict//EN', publicIdentifier) && $equals_0('http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd', systemIdentifier) || $equals_0('-//W3C//DTD XHTML 1.1//EN', publicIdentifier) && $equals_0('http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd', systemIdentifier)) {
                  }
                   else 
                    !((systemIdentifier == null || $equals_0('about:legacy-compat', systemIdentifier)) && publicIdentifier == null);
                  $documentModeInternal(this$static, ($clinit_78() , STANDARDS_MODE));
                }

                break;
              case 2:
                this$static.html4 = true;
                this$static.tokenizer.html4 = true;
                if ($isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks)) {
                  $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                }
                 else if ($isAlmostStandards(publicIdentifier, systemIdentifier)) {
                  $documentModeInternal(this$static, ($clinit_78() , ALMOST_STANDARDS_MODE));
                }
                 else {
                  if ($equals_0('-//W3C//DTD HTML 4.01//EN', publicIdentifier)) {
                    !$equals_0('http://www.w3.org/TR/html4/strict.dtd', systemIdentifier);
                  }
                   else {
                  }
                  $documentModeInternal(this$static, ($clinit_78() , STANDARDS_MODE));
                }

                break;
              case 1:
                this$static.html4 = true;
                this$static.tokenizer.html4 = true;
                if ($isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks)) {
                  $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                }
                 else if ($isAlmostStandards(publicIdentifier, systemIdentifier)) {
                  if ($equals_0('-//W3C//DTD HTML 4.01 Transitional//EN', publicIdentifier) && systemIdentifier != null) {
                    !$equals_0('http://www.w3.org/TR/html4/loose.dtd', systemIdentifier);
                  }
                   else {
                  }
                  $documentModeInternal(this$static, ($clinit_78() , ALMOST_STANDARDS_MODE));
                }
                 else {
                  $documentModeInternal(this$static, ($clinit_78() , STANDARDS_MODE));
                }

                break;
              case 3:
                this$static.html4 = $isHtml4Doctype(publicIdentifier);
                if (this$static.html4) {
                  this$static.tokenizer.html4 = true;
                }

                if ($isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks)) {
                  $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                }
                 else if ($isAlmostStandards(publicIdentifier, systemIdentifier)) {
                  if ($equals_0('-//W3C//DTD HTML 4.01 Transitional//EN', publicIdentifier)) {
                    !$equals_0('http://www.w3.org/TR/html4/loose.dtd', systemIdentifier);
                  }
                   else {
                  }
                  $documentModeInternal(this$static, ($clinit_78() , ALMOST_STANDARDS_MODE));
                }
                 else {
                  if ($equals_0('-//W3C//DTD HTML 4.01//EN', publicIdentifier)) {
                    !$equals_0('http://www.w3.org/TR/html4/strict.dtd', systemIdentifier);
                  }
                   else {
                  }
                  $documentModeInternal(this$static, ($clinit_78() , STANDARDS_MODE));
                }

                break;
              case 4:
                if ($isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks)) {
                  $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
                }
                 else if ($isAlmostStandards(publicIdentifier, systemIdentifier)) {
                  $documentModeInternal(this$static, ($clinit_78() , ALMOST_STANDARDS_MODE));
                }
                 else {
                  $documentModeInternal(this$static, ($clinit_78() , STANDARDS_MODE));
                }

            }

            this$static.mode = 1;
            return;
          default:break doctypeloop;
        }

    }
  }
  return;
}

function $documentModeInternal(this$static, m){
  this$static.quirks = m == ($clinit_78() , QUIRKS_MODE);
}

function $endSelect(this$static){
  var eltPos;
  eltPos = $findLastInTableScope(this$static, 'select');
  if (eltPos == 2147483647) {
    return;
  }
  while (this$static.currentPtr >= eltPos) {
    $pop(this$static);
  }
  $resetTheInsertionMode(this$static);
}

function $endTag(this$static, elementName){
  var eltPos, group, name, node;
  this$static.needToDropLF = false;
  endtagloop: for (;;) {
    group = elementName.group;
    name = elementName.name_0;
    switch (this$static.mode) {
      case 11:
        switch (group) {
          case 37:
            eltPos = $findLastOrRoot(this$static, 37);
            if (eltPos == 0) {
              break endtagloop;
            }

            $clearStackBackTo(this$static, eltPos);
            $pop(this$static);
            this$static.mode = 10;
            break endtagloop;
          case 34:
            eltPos = $findLastOrRoot(this$static, 37);
            if (eltPos == 0) {
              break endtagloop;
            }

            $clearStackBackTo(this$static, eltPos);
            $pop(this$static);
            this$static.mode = 10;
            continue;
          case 39:
            if ($findLastInTableScope(this$static, name) == 2147483647) {
              break endtagloop;
            }

            eltPos = $findLastOrRoot(this$static, 37);
            if (eltPos == 0) {
              break endtagloop;
            }

            $clearStackBackTo(this$static, eltPos);
            $pop(this$static);
            this$static.mode = 10;
            continue;
            break endtagloop;
        }

      case 10:
        switch (group) {
          case 39:
            eltPos = $findLastOrRoot_0(this$static, name);
            if (eltPos == 0) {
              break endtagloop;
            }

            $clearStackBackTo(this$static, eltPos);
            $pop(this$static);
            this$static.mode = 7;
            break endtagloop;
          case 34:
            eltPos = $findLastInTableScopeOrRootTbodyTheadTfoot(this$static);
            if (eltPos == 0) {
              break endtagloop;
            }

            $clearStackBackTo(this$static, eltPos);
            $pop(this$static);
            this$static.mode = 7;
            continue;
            break endtagloop;
        }

      case 7:
        switch (group) {
          case 34:
            eltPos = $findLast(this$static, 'table');
            if (eltPos == 2147483647) {
              break endtagloop;
            }

            while (this$static.currentPtr >= eltPos) {
              $pop(this$static);
            }

            $resetTheInsertionMode(this$static);
            break endtagloop;
        }

      case 8:
        switch (group) {
          case 6:
            eltPos = $findLastInTableScope(this$static, 'caption');
            if (eltPos == 2147483647) {
              break endtagloop;
            }

            $generateImpliedEndTags(this$static);
            while (this$static.currentPtr >= eltPos) {
              $pop(this$static);
            }

            $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
            this$static.mode = 7;
            break endtagloop;
          case 34:
            eltPos = $findLastInTableScope(this$static, 'caption');
            if (eltPos == 2147483647) {
              break endtagloop;
            }

            $generateImpliedEndTags(this$static);
            while (this$static.currentPtr >= eltPos) {
              $pop(this$static);
            }

            $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
            this$static.mode = 7;
            continue;
            break endtagloop;
        }

      case 12:
        switch (group) {
          case 40:
            eltPos = $findLastInTableScope(this$static, name);
            if (eltPos == 2147483647) {
              break endtagloop;
            }

            $generateImpliedEndTags(this$static);
            while (this$static.currentPtr >= eltPos) {
              $pop(this$static);
            }

            $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
            this$static.mode = 11;
            break endtagloop;
          case 34:
          case 39:
          case 37:
            if ($findLastInTableScope(this$static, name) == 2147483647) {
              break endtagloop;
            }

            $closeTheCell(this$static, $findLastInTableScopeTdTh(this$static));
            continue;
            break endtagloop;
        }

      case 21:
      case 6:
        switch (group) {
          case 3:
            if (!(this$static.currentPtr >= 1 && this$static.stack[1].group == 3)) {
              break endtagloop;
            }

            this$static.mode = 15;
            break endtagloop;
          case 23:
            if (!(this$static.currentPtr >= 1 && this$static.stack[1].group == 3)) {
              break endtagloop;
            }

            this$static.mode = 15;
            continue;
          case 50:
          case 46:
          case 44:
          case 61:
          case 51:
            eltPos = $findLastInScope(this$static, name);
            if (eltPos == 2147483647) {
            }
             else {
              $generateImpliedEndTags(this$static);
              while (this$static.currentPtr >= eltPos) {
                $pop(this$static);
              }
            }

            break endtagloop;
          case 9:
            if (!this$static.formPointer) {
              break endtagloop;
            }

            this$static.formPointer = null;
            eltPos = $findLastInScope(this$static, name);
            if (eltPos == 2147483647) {
              break endtagloop;
            }

            $generateImpliedEndTags(this$static);
            $removeFromStack(this$static, eltPos);
            break endtagloop;
          case 29:
            eltPos = $findLastInScope(this$static, 'p');
            if (eltPos == 2147483647) {
              if (this$static.foreignFlag == 0) {
                while (this$static.stack[this$static.currentPtr].ns != 'http://www.w3.org/1999/xhtml') {
                  $pop(this$static);
                }
                this$static.foreignFlag = 1;
              }
              $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, ($clinit_91() , EMPTY_ATTRIBUTES));
              break endtagloop;
            }

            $generateImpliedEndTagsExceptFor(this$static, 'p');
            while (this$static.currentPtr >= eltPos) {
              $pop(this$static);
            }

            break endtagloop;
          case 41:
          case 15:
            eltPos = $findLastInScope(this$static, name);
            if (eltPos == 2147483647) {
            }
             else {
              $generateImpliedEndTagsExceptFor(this$static, name);
              while (this$static.currentPtr >= eltPos) {
                $pop(this$static);
              }
            }

            break endtagloop;
          case 42:
            eltPos = $findLastInScopeHn(this$static);
            if (eltPos == 2147483647) {
            }
             else {
              $generateImpliedEndTags(this$static);
              while (this$static.currentPtr >= eltPos) {
                $pop(this$static);
              }
            }

            break endtagloop;
          case 1:
          case 45:
          case 64:
          case 24:
            $adoptionAgencyEndTag(this$static, name);
            break endtagloop;
          case 5:
          case 63:
          case 43:
            eltPos = $findLastInScope(this$static, name);
            if (eltPos == 2147483647) {
            }
             else {
              $generateImpliedEndTags(this$static);
              while (this$static.currentPtr >= eltPos) {
                $pop(this$static);
              }
              $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
            }

            break endtagloop;
          case 4:
            if (this$static.foreignFlag == 0) {
              while (this$static.stack[this$static.currentPtr].ns != 'http://www.w3.org/1999/xhtml') {
                $pop(this$static);
              }
              this$static.foreignFlag = 1;
            }

            $reconstructTheActiveFormattingElements(this$static);
            $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, ($clinit_91() , EMPTY_ATTRIBUTES));
            break endtagloop;
          case 49:
          case 55:
          case 48:
          case 12:
          case 13:
          case 65:
          case 22:
          case 14:
          case 47:
          case 60:
          case 25:
          case 32:
          case 34:
          case 35:
            break endtagloop;
          case 26:
          default:if (name == this$static.stack[this$static.currentPtr].name_0) {
              $pop(this$static);
              break endtagloop;
            }

            eltPos = this$static.currentPtr;
            for (;;) {
              node = this$static.stack[eltPos];
              if (node.name_0 == name) {
                $generateImpliedEndTags(this$static);
                while (this$static.currentPtr >= eltPos) {
                  $pop(this$static);
                }
                break endtagloop;
              }
               else if (node.scoping || node.special) {
                break endtagloop;
              }
              --eltPos;
            }

        }

      case 9:
        switch (group) {
          case 8:
            if (this$static.currentPtr == 0) {
              break endtagloop;
            }

            $pop(this$static);
            this$static.mode = 7;
            break endtagloop;
          case 7:
            break endtagloop;
          default:if (this$static.currentPtr == 0) {
              break endtagloop;
            }

            $pop(this$static);
            this$static.mode = 7;
            continue;
        }

      case 14:
        switch (group) {
          case 6:
          case 34:
          case 39:
          case 37:
          case 40:
            if ($findLastInTableScope(this$static, name) != 2147483647) {
              $endSelect(this$static);
              continue;
            }
             else {
              break endtagloop;
            }

        }

      case 13:
        switch (group) {
          case 28:
            if ('option' == this$static.stack[this$static.currentPtr].name_0) {
              $pop(this$static);
              break endtagloop;
            }
             else {
              break endtagloop;
            }

          case 27:
            if ('option' == this$static.stack[this$static.currentPtr].name_0 && 'optgroup' == this$static.stack[this$static.currentPtr - 1].name_0) {
              $pop(this$static);
            }

            if ('optgroup' == this$static.stack[this$static.currentPtr].name_0) {
              $pop(this$static);
            }
             else {
            }

            break endtagloop;
          case 32:
            $endSelect(this$static);
            break endtagloop;
          default:break endtagloop;
        }

      case 15:
        switch (group) {
          case 23:
            if (this$static.fragment) {
              break endtagloop;
            }
             else {
              this$static.mode = 18;
              break endtagloop;
            }

          default:this$static.mode = 6;
            continue;
        }

      case 16:
        switch (group) {
          case 11:
            if (this$static.currentPtr == 0) {
              break endtagloop;
            }

            $pop(this$static);
            if (!this$static.fragment && 'frameset' != this$static.stack[this$static.currentPtr].name_0) {
              this$static.mode = 17;
            }

            break endtagloop;
          default:break endtagloop;
        }

      case 17:
        switch (group) {
          case 23:
            this$static.mode = 19;
            break endtagloop;
          default:break endtagloop;
        }

      case 0:
        $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
        this$static.mode = 1;
        continue;
      case 1:
        $appendHtmlElementToDocumentAndPush(this$static, $emptyAttributes(this$static.tokenizer));
        this$static.mode = 2;
        continue;
      case 2:
        switch (group) {
          case 20:
          case 4:
          case 23:
          case 3:
            $appendToCurrentNodeAndPushHeadElement(this$static, ($clinit_91() , EMPTY_ATTRIBUTES));
            this$static.mode = 3;
            continue;
          default:break endtagloop;
        }

      case 3:
        switch (group) {
          case 20:
            $pop(this$static);
            this$static.mode = 5;
            break endtagloop;
          case 4:
          case 23:
          case 3:
            $pop(this$static);
            this$static.mode = 5;
            continue;
          default:break endtagloop;
        }

      case 4:
        switch (group) {
          case 26:
            $pop(this$static);
            this$static.mode = 3;
            break endtagloop;
          case 4:
            $pop(this$static);
            this$static.mode = 3;
            continue;
          default:break endtagloop;
        }

      case 5:
        switch (group) {
          case 23:
          case 3:
          case 4:
            $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), $emptyAttributes(this$static.tokenizer));
            this$static.mode = 21;
            continue;
          default:break endtagloop;
        }

      case 18:
        this$static.mode = 6;
        continue;
      case 19:
        this$static.mode = 16;
        continue;
      case 20:
        if (this$static.originalMode == 5) {
          $pop(this$static);
        }

        $pop(this$static);
        this$static.mode = this$static.originalMode;
        break endtagloop;
    }
  }
  if (this$static.foreignFlag == 0 && !$hasForeignInScope(this$static)) {
    this$static.foreignFlag = 1;
  }
}

function $endTokenization(this$static){
  this$static.formPointer = null;
  this$static.headPointer = null;
  while (this$static.currentPtr > -1) {
    --this$static.stack[this$static.currentPtr].refcount;
    --this$static.currentPtr;
  }
  this$static.stack = null;
  while (this$static.listPtr > -1) {
    if (this$static.listOfActiveFormattingElements[this$static.listPtr]) {
      --this$static.listOfActiveFormattingElements[this$static.listPtr].refcount;
    }
    --this$static.listPtr;
  }
  this$static.listOfActiveFormattingElements = null;
  $clearImpl(this$static.idLocations);
  this$static.charBuffer = null;
}

function $eof_0(this$static){
  var group, i;
  $flushCharacters(this$static);
  switch (this$static.foreignFlag) {
    case 0:
      while (this$static.stack[this$static.currentPtr].ns != 'http://www.w3.org/1999/xhtml') {
        $popOnEof(this$static);
      }

      this$static.foreignFlag = 1;
  }
  eofloop: for (;;) {
    switch (this$static.mode) {
      case 0:
        $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
        this$static.mode = 1;
        continue;
      case 1:
        $appendHtmlElementToDocumentAndPush(this$static, $emptyAttributes(this$static.tokenizer));
        this$static.mode = 2;
        continue;
      case 2:
        $appendToCurrentNodeAndPushHeadElement(this$static, ($clinit_91() , EMPTY_ATTRIBUTES));
        this$static.mode = 3;
        continue;
      case 3:
        while (this$static.currentPtr > 0) {
          $popOnEof(this$static);
        }

        this$static.mode = 5;
        continue;
      case 4:
        while (this$static.currentPtr > 1) {
          $popOnEof(this$static);
        }

        this$static.mode = 3;
        continue;
      case 5:
        $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), $emptyAttributes(this$static.tokenizer));
        this$static.mode = 6;
        continue;
      case 9:
        if (this$static.currentPtr == 0) {
          break eofloop;
        }
         else {
          $popOnEof(this$static);
          this$static.mode = 7;
          continue;
        }

      case 21:
      case 8:
      case 12:
      case 6:
        openelementloop: for (i = this$static.currentPtr; i >= 0; --i) {
          group = this$static.stack[i].group;
          switch (group) {
            case 41:
            case 15:
            case 29:
            case 39:
            case 40:
            case 3:
            case 23:
              break;
            default:break openelementloop;
          }
        }

        break eofloop;
      case 20:
        if (this$static.originalMode == 5) {
          $popOnEof(this$static);
        }

        $popOnEof(this$static);
        this$static.mode = this$static.originalMode;
        continue;
      case 10:
      case 11:
      case 7:
      case 13:
      case 14:
      case 16:
        break eofloop;
      case 15:
      case 17:
      case 18:
      case 19:
      default:if (this$static.currentPtr == 0) {
          fromDouble((new Date()).getTime());
        }

        break eofloop;
    }
  }
  while (this$static.currentPtr > 0) {
    $popOnEof(this$static);
  }
  if (!this$static.fragment) {
    $popOnEof(this$static);
  }
}

function $fatal_0(this$static, e){
  var spe;
  spe = $SAXParseException_0(new SAXParseException(), e.detailMessage, this$static.tokenizer, e);
  throw spe;
}

function $fatal_1(this$static, s){
  var spe;
  spe = $SAXParseException(new SAXParseException(), s, this$static.tokenizer);
  throw spe;
}

function $findInListOfActiveFormattingElements(this$static, node){
  var i;
  for (i = this$static.listPtr; i >= 0; --i) {
    if (node == this$static.listOfActiveFormattingElements[i]) {
      return i;
    }
  }
  return -1;
}

function $findInListOfActiveFormattingElementsContainsBetweenEndAndLastMarker(this$static, name){
  var i, node;
  for (i = this$static.listPtr; i >= 0; --i) {
    node = this$static.listOfActiveFormattingElements[i];
    if (!node) {
      return -1;
    }
     else if (node.name_0 == name) {
      return i;
    }
  }
  return -1;
}

function $findLast(this$static, name){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].name_0 == name) {
      return i;
    }
  }
  return 2147483647;
}

function $findLastInScope(this$static, name){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].name_0 == name) {
      return i;
    }
     else if (this$static.stack[i].scoping) {
      return 2147483647;
    }
  }
  return 2147483647;
}

function $findLastInScopeHn(this$static){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].group == 42) {
      return i;
    }
     else if (this$static.stack[i].scoping) {
      return 2147483647;
    }
  }
  return 2147483647;
}

function $findLastInTableScope(this$static, name){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].name_0 == name) {
      return i;
    }
     else if (this$static.stack[i].name_0 == 'table') {
      return 2147483647;
    }
  }
  return 2147483647;
}

function $findLastInTableScopeOrRootTbodyTheadTfoot(this$static){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].group == 39) {
      return i;
    }
  }
  return 0;
}

function $findLastInTableScopeTdTh(this$static){
  var i, name;
  for (i = this$static.currentPtr; i > 0; --i) {
    name = this$static.stack[i].name_0;
    if ('td' == name || 'th' == name) {
      return i;
    }
     else if (name == 'table') {
      return 2147483647;
    }
  }
  return 2147483647;
}

function $findLastOrRoot_0(this$static, name){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].name_0 == name) {
      return i;
    }
  }
  return 0;
}

function $findLastOrRoot(this$static, group){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].group == group) {
      return i;
    }
  }
  return 0;
}

function $flushCharacters(this$static){
  var current, elt, eltPos, node;
  if (this$static.charBufferLen > 0) {
    current = this$static.stack[this$static.currentPtr];
    if (current.fosterParenting && $charBufferContainsNonWhitespace(this$static)) {
      eltPos = $findLastOrRoot(this$static, 34);
      node = this$static.stack[eltPos];
      elt = node.node;
      if (eltPos == 0) {
        $appendCharacters(this$static, elt, valueOf_1(this$static.charBuffer, 0, this$static.charBufferLen));
        this$static.charBufferLen = 0;
        return;
      }
      $insertFosterParentedCharacters_0(this$static, this$static.charBuffer, 0, this$static.charBufferLen, elt, this$static.stack[eltPos - 1].node);
      this$static.charBufferLen = 0;
      return;
    }
    $appendCharacters(this$static, this$static.stack[this$static.currentPtr].node, valueOf_1(this$static.charBuffer, 0, this$static.charBufferLen));
    this$static.charBufferLen = 0;
  }
}

function $generateImpliedEndTags(this$static){
  for (;;) {
    switch (this$static.stack[this$static.currentPtr].group) {
      case 29:
      case 15:
      case 41:
      case 28:
      case 27:
      case 53:
        $pop(this$static);
        continue;
      default:return;
    }
  }
}

function $generateImpliedEndTagsExceptFor(this$static, name){
  var node;
  for (;;) {
    node = this$static.stack[this$static.currentPtr];
    switch (node.group) {
      case 29:
      case 15:
      case 41:
      case 28:
      case 27:
      case 53:
        if (node.name_0 == name) {
          return;
        }

        $pop(this$static);
        continue;
      default:return;
    }
  }
}

function $hasForeignInScope(this$static){
  var i;
  for (i = this$static.currentPtr; i > 0; --i) {
    if (this$static.stack[i].ns != 'http://www.w3.org/1999/xhtml') {
      return true;
    }
     else if (this$static.stack[i].scoping) {
      return false;
    }
  }
  return false;
}

function $implicitlyCloseP(this$static){
  var eltPos;
  eltPos = $findLastInScope(this$static, 'p');
  if (eltPos == 2147483647) {
    return;
  }
  $generateImpliedEndTagsExceptFor(this$static, 'p');
  while (this$static.currentPtr >= eltPos) {
    $pop(this$static);
  }
}

function $insertIntoFosterParent(this$static, child){
  var elt, eltPos, node;
  eltPos = $findLastOrRoot(this$static, 34);
  node = this$static.stack[eltPos];
  elt = node.node;
  if (eltPos == 0) {
    $appendElement(this$static, child, elt);
    return;
  }
  $insertFosterParentedChild(this$static, child, elt, this$static.stack[eltPos - 1].node);
}

function $insertIntoListOfActiveFormattingElements(this$static, formattingClone, bookmark){
  ++formattingClone.refcount;
  if (bookmark <= this$static.listPtr) {
    arraycopy(this$static.listOfActiveFormattingElements, bookmark, this$static.listOfActiveFormattingElements, bookmark + 1, this$static.listPtr - bookmark + 1);
  }
  ++this$static.listPtr;
  this$static.listOfActiveFormattingElements[bookmark] = formattingClone;
}

function $insertIntoStack(this$static, node, position){
  if (position == this$static.currentPtr + 1) {
    $flushCharacters(this$static);
    $push_0(this$static, node);
  }
   else {
    arraycopy(this$static.stack, position, this$static.stack, position + 1, this$static.currentPtr - position + 1);
    ++this$static.currentPtr;
    this$static.stack[position] = node;
  }
}

function $isAlmostStandards(publicIdentifier, systemIdentifier){
  if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd xhtml 1.0 transitional//en', publicIdentifier)) {
    return true;
  }
  if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd xhtml 1.0 frameset//en', publicIdentifier)) {
    return true;
  }
  if (systemIdentifier != null) {
    if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd html 4.01 transitional//en', publicIdentifier)) {
      return true;
    }
    if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd html 4.01 frameset//en', publicIdentifier)) {
      return true;
    }
  }
  return false;
}

function $isHtml4Doctype(publicIdentifier){
  if (publicIdentifier != null && binarySearch_0(HTML4_PUBLIC_IDS, publicIdentifier, ($clinit_61() , NATURAL)) > -1) {
    return true;
  }
  return false;
}

function $isInStack(this$static, node){
  var i;
  for (i = this$static.currentPtr; i >= 0; --i) {
    if (this$static.stack[i] == node) {
      return true;
    }
  }
  return false;
}

function $isQuirky(name, publicIdentifier, systemIdentifier, forceQuirks){
  var i;
  if (forceQuirks) {
    return true;
  }
  if (name != 'html') {
    return true;
  }
  if (publicIdentifier != null) {
    for (i = 0; i < QUIRKY_PUBLIC_IDS.length; ++i) {
      if (lowerCaseLiteralIsPrefixOfIgnoreAsciiCaseString(QUIRKY_PUBLIC_IDS[i], publicIdentifier)) {
        return true;
      }
    }
    if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3o//dtd w3 html strict 3.0//en//', publicIdentifier) || lowerCaseLiteralEqualsIgnoreAsciiCaseString('-/w3c/dtd html 4.0 transitional/en', publicIdentifier) || lowerCaseLiteralEqualsIgnoreAsciiCaseString('html', publicIdentifier)) {
      return true;
    }
  }
  if (systemIdentifier == null) {
    if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd html 4.01 transitional//en', publicIdentifier)) {
      return true;
    }
     else if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('-//w3c//dtd html 4.01 frameset//en', publicIdentifier)) {
      return true;
    }
  }
   else if (lowerCaseLiteralEqualsIgnoreAsciiCaseString('http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd', systemIdentifier)) {
    return true;
  }
  return false;
}

function $pop(this$static){
  var node;
  $flushCharacters(this$static);
  node = this$static.stack[this$static.currentPtr];
  --this$static.currentPtr;
  $elementPopped(this$static, node.ns, node.popName, node.node);
  --node.refcount;
}

function $popOnEof(this$static){
  var node;
  $flushCharacters(this$static);
  node = this$static.stack[this$static.currentPtr];
  --this$static.currentPtr;
  $elementPopped(this$static, node.ns, node.popName, node.node);
  --node.refcount;
}

function $push_0(this$static, node){
  var newStack;
  ++this$static.currentPtr;
  if (this$static.currentPtr == this$static.stack.length) {
    newStack = initDim(_3Lnu_validator_htmlparser_impl_StackNode_2_classLit, 51, 11, this$static.stack.length + 64, 0);
    arraycopy(this$static.stack, 0, newStack, 0, this$static.stack.length);
    this$static.stack = newStack;
  }
  this$static.stack[this$static.currentPtr] = node;
}

function $pushHeadPointerOntoStack(this$static){
  $flushCharacters(this$static);
  if (!this$static.headPointer) {
    $push_0(this$static, this$static.stack[this$static.currentPtr]);
  }
   else {
    $push_0(this$static, $StackNode_0(new StackNode(), 'http://www.w3.org/1999/xhtml', ($clinit_89() , HEAD), this$static.headPointer));
  }
}

function $reconstructTheActiveFormattingElements(this$static){
  var clone, currentNode, entry, entryClone, entryPos, mostRecent;
  if (this$static.listPtr == -1) {
    return;
  }
  mostRecent = this$static.listOfActiveFormattingElements[this$static.listPtr];
  if (!mostRecent || $isInStack(this$static, mostRecent)) {
    return;
  }
  entryPos = this$static.listPtr;
  for (;;) {
    --entryPos;
    if (entryPos == -1) {
      break;
    }
    if (!this$static.listOfActiveFormattingElements[entryPos]) {
      break;
    }
    if ($isInStack(this$static, this$static.listOfActiveFormattingElements[entryPos])) {
      break;
    }
  }
  if (entryPos < this$static.listPtr) {
    $flushCharacters(this$static);
  }
  while (entryPos < this$static.listPtr) {
    ++entryPos;
    entry = this$static.listOfActiveFormattingElements[entryPos];
    clone = $createElement(this$static, 'http://www.w3.org/1999/xhtml', entry.name_0, $cloneAttributes(entry.attributes));
    entryClone = $StackNode(new StackNode(), entry.group, entry.ns, entry.name_0, clone, entry.scoping, entry.special, entry.fosterParenting, entry.popName, entry.attributes);
    entry.attributes = null;
    currentNode = this$static.stack[this$static.currentPtr];
    if (currentNode.fosterParenting) {
      $insertIntoFosterParent(this$static, clone);
    }
     else {
      $appendElement(this$static, clone, currentNode.node);
    }
    $push_0(this$static, entryClone);
    this$static.listOfActiveFormattingElements[entryPos] = entryClone;
    --entry.refcount;
    ++entryClone.refcount;
  }
}

function $removeFromListOfActiveFormattingElements(this$static, pos){
  --this$static.listOfActiveFormattingElements[pos].refcount;
  if (pos == this$static.listPtr) {
    --this$static.listPtr;
    return;
  }
  arraycopy(this$static.listOfActiveFormattingElements, pos + 1, this$static.listOfActiveFormattingElements, pos, this$static.listPtr - pos);
  --this$static.listPtr;
}

function $removeFromStack(this$static, pos){
  if (this$static.currentPtr == pos) {
    $pop(this$static);
  }
   else {
    --this$static.stack[pos].refcount;
    arraycopy(this$static.stack, pos + 1, this$static.stack, pos, this$static.currentPtr - pos);
    --this$static.currentPtr;
  }
}

function $removeFromStack_0(this$static, node){
  var pos;
  if (this$static.stack[this$static.currentPtr] == node) {
    $pop(this$static);
  }
   else {
    pos = this$static.currentPtr - 1;
    while (pos >= 0 && this$static.stack[pos] != node) {
      --pos;
    }
    if (pos == -1) {
      return;
    }
    --node.refcount;
    arraycopy(this$static.stack, pos + 1, this$static.stack, pos, this$static.currentPtr - pos);
    --this$static.currentPtr;
  }
}

function $resetTheInsertionMode(this$static){
  var i, name, node;
  this$static.foreignFlag = 1;
  for (i = this$static.currentPtr; i >= 0; --i) {
    node = this$static.stack[i];
    name = node.name_0;
    if (i == 0) {
      if (this$static.contextNamespace == 'http://www.w3.org/1999/xhtml' && (this$static.contextName == 'td' || this$static.contextName == 'th')) {
        this$static.mode = 6;
        return;
      }
       else {
        name = this$static.contextName;
      }
    }
    if ('select' == name) {
      this$static.mode = 13;
      return;
    }
     else if ('td' == name || 'th' == name) {
      this$static.mode = 12;
      return;
    }
     else if ('tr' == name) {
      this$static.mode = 11;
      return;
    }
     else if ('tbody' == name || 'thead' == name || 'tfoot' == name) {
      this$static.mode = 10;
      return;
    }
     else if ('caption' == name) {
      this$static.mode = 8;
      return;
    }
     else if ('colgroup' == name) {
      this$static.mode = 9;
      return;
    }
     else if ('table' == name) {
      this$static.mode = 7;
      return;
    }
     else if ('http://www.w3.org/1999/xhtml' != node.ns) {
      this$static.foreignFlag = 0;
      this$static.mode = 6;
      return;
    }
     else if ('head' == name) {
      this$static.mode = 6;
      return;
    }
     else if ('body' == name) {
      this$static.mode = 6;
      return;
    }
     else if ('frameset' == name) {
      this$static.mode = 16;
      return;
    }
     else if ('html' == name) {
      if (!this$static.headPointer) {
        this$static.mode = 2;
      }
       else {
        this$static.mode = 5;
      }
      return;
    }
     else if (i == 0) {
      this$static.mode = 6;
      return;
    }
  }
}

function $setFragmentContext(this$static, context){
  this$static.contextName = context;
  this$static.contextNamespace = 'http://www.w3.org/1999/xhtml';
  this$static.fragment = false;
  this$static.quirks = false;
}

function $startTag(this$static, elementName, attributes, selfClosing){
  var actionIndex, activeA, activeAPos, attributeQName, currGroup, currNs, currentNode, eltPos, formAttrs, group, i, inputAttributes, name, needsPostProcessing, node, prompt, promptIndex, current, elt_53;
  this$static.needToDropLF = false;
  needsPostProcessing = false;
  starttagloop: for (;;) {
    group = elementName.group;
    name = elementName.name_0;
    switch (this$static.foreignFlag) {
      case 0:
        currentNode = this$static.stack[this$static.currentPtr];
        currNs = currentNode.ns;
        currGroup = currentNode.group;
        if ('http://www.w3.org/1999/xhtml' == currNs || 'http://www.w3.org/1998/Math/MathML' == currNs && (56 != group && 57 == currGroup || 19 == group && 58 == currGroup) || 'http://www.w3.org/2000/svg' == currNs && (36 == currGroup || 59 == currGroup)) {
          needsPostProcessing = true;
        }
         else {
          switch (group) {
            case 45:
            case 50:
            case 3:
            case 4:
            case 52:
            case 41:
            case 46:
            case 48:
            case 42:
            case 20:
            case 22:
            case 15:
            case 18:
            case 24:
            case 29:
            case 44:
            case 34:
              while (this$static.stack[this$static.currentPtr].ns != 'http://www.w3.org/1999/xhtml') {
                $pop(this$static);
              }

              this$static.foreignFlag = 1;
              continue starttagloop;
            case 64:
              if ($contains(attributes, ($clinit_87() , COLOR)) || $contains(attributes, FACE) || $contains(attributes, SIZE)) {
                while (this$static.stack[this$static.currentPtr].ns != 'http://www.w3.org/1999/xhtml') {
                  $pop(this$static);
                }
                this$static.foreignFlag = 1;
                continue starttagloop;
              }

            default:if ('http://www.w3.org/2000/svg' == currNs) {
                attributes.mode = 2;
                if (selfClosing) {
                  $appendVoidElementToCurrentMayFosterCamelCase(this$static, currNs, elementName, attributes);
                  selfClosing = false;
                }
                 else {
                  $appendToCurrentNodeAndPushElementMayFosterCamelCase(this$static, currNs, elementName, attributes);
                }
                attributes = null;
                break starttagloop;
              }
               else {
                attributes.mode = 1;
                if (selfClosing) {
                  $appendVoidElementToCurrentMayFoster_0(this$static, currNs, elementName, attributes);
                  selfClosing = false;
                }
                 else {
                  $appendToCurrentNodeAndPushElementMayFosterNoScoping(this$static, currNs, elementName, attributes);
                }
                attributes = null;
                break starttagloop;
              }

          }
        }

      default:switch (this$static.mode) {
          case 10:
            switch (group) {
              case 37:
                $clearStackBackTo(this$static, $findLastInTableScopeOrRootTbodyTheadTfoot(this$static));
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.mode = 11;
                attributes = null;
                break starttagloop;
              case 40:
                $clearStackBackTo(this$static, $findLastInTableScopeOrRootTbodyTheadTfoot(this$static));
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , TR), ($clinit_91() , EMPTY_ATTRIBUTES));
                this$static.mode = 11;
                continue;
              case 6:
              case 7:
              case 8:
              case 39:
                eltPos = $findLastInTableScopeOrRootTbodyTheadTfoot(this$static);
                if (eltPos == 0) {
                  break starttagloop;
                }
                 else {
                  $clearStackBackTo(this$static, eltPos);
                  $pop(this$static);
                  this$static.mode = 7;
                  continue;
                }

            }

          case 11:
            switch (group) {
              case 40:
                $clearStackBackTo(this$static, $findLastOrRoot(this$static, 37));
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.mode = 12;
                $append_1(this$static, null);
                attributes = null;
                break starttagloop;
              case 6:
              case 7:
              case 8:
              case 39:
              case 37:
                eltPos = $findLastOrRoot(this$static, 37);
                if (eltPos == 0) {
                  break starttagloop;
                }

                $clearStackBackTo(this$static, eltPos);
                $pop(this$static);
                this$static.mode = 10;
                continue;
            }

          case 7:
            intableloop: for (;;) {
              switch (group) {
                case 6:
                  $clearStackBackTo(this$static, $findLastOrRoot(this$static, 34));
                  $append_1(this$static, null);
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.mode = 8;
                  attributes = null;
                  break starttagloop;
                case 8:
                  $clearStackBackTo(this$static, $findLastOrRoot(this$static, 34));
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.mode = 9;
                  attributes = null;
                  break starttagloop;
                case 7:
                  $clearStackBackTo(this$static, $findLastOrRoot(this$static, 34));
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , COLGROUP), ($clinit_91() , EMPTY_ATTRIBUTES));
                  this$static.mode = 9;
                  continue starttagloop;
                case 39:
                  $clearStackBackTo(this$static, $findLastOrRoot(this$static, 34));
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.mode = 10;
                  attributes = null;
                  break starttagloop;
                case 37:
                case 40:
                  $clearStackBackTo(this$static, $findLastOrRoot(this$static, 34));
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , TBODY), ($clinit_91() , EMPTY_ATTRIBUTES));
                  this$static.mode = 10;
                  continue starttagloop;
                case 34:
                  eltPos = $findLastInTableScope(this$static, name);
                  if (eltPos == 2147483647) {
                    break starttagloop;
                  }

                  $generateImpliedEndTags(this$static);
                  while (this$static.currentPtr >= eltPos) {
                    $pop(this$static);
                  }

                  $resetTheInsertionMode(this$static);
                  continue starttagloop;
                case 31:
                case 33:
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                  attributes = null;
                  break starttagloop;
                case 13:
                  if (!lowerCaseLiteralEqualsIgnoreAsciiCaseString('hidden', $getValue_0(attributes, ($clinit_87() , TYPE)))) {
                    break intableloop;
                  }

                  $flushCharacters(this$static);
                  $processNonNcNames(attributes, this$static, this$static.namePolicy);
                  elt_53 = $createElement_0(this$static, 'http://www.w3.org/1999/xhtml', name, attributes);
                  current = this$static.stack[this$static.currentPtr];
                  $appendElement(this$static, elt_53, current.node);
                  $elementPopped(this$static, 'http://www.w3.org/1999/xhtml', name, elt_53);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                default:break intableloop;
              }
            }

          case 8:
            switch (group) {
              case 6:
              case 7:
              case 8:
              case 39:
              case 37:
              case 40:
                eltPos = $findLastInTableScope(this$static, 'caption');
                if (eltPos == 2147483647) {
                  break starttagloop;
                }

                $generateImpliedEndTags(this$static);
                while (this$static.currentPtr >= eltPos) {
                  $pop(this$static);
                }

                $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
                this$static.mode = 7;
                continue;
            }

          case 12:
            switch (group) {
              case 6:
              case 7:
              case 8:
              case 39:
              case 37:
              case 40:
                eltPos = $findLastInTableScopeTdTh(this$static);
                if (eltPos == 2147483647) {
                  break starttagloop;
                }
                 else {
                  $closeTheCell(this$static, eltPos);
                  continue;
                }

            }

          case 21:
            switch (group) {
              case 11:
                if (this$static.mode == 21) {
                  if (this$static.currentPtr == 0 || this$static.stack[1].group != 3) {
                    break starttagloop;
                  }
                   else {
                    $detachFromParent(this$static, this$static.stack[1].node);
                    while (this$static.currentPtr > 0) {
                      $pop(this$static);
                    }
                    $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                    this$static.mode = 16;
                    attributes = null;
                    break starttagloop;
                  }
                }
                 else {
                  break starttagloop;
                }

              case 44:
              case 15:
              case 41:
              case 5:
              case 43:
              case 63:
              case 34:
              case 49:
              case 4:
              case 48:
              case 13:
              case 65:
              case 22:
              case 35:
              case 38:
              case 47:
              case 32:
                if (this$static.mode == 21) {
                  this$static.mode = 6;
                }

            }

          case 6:
            inbodyloop: for (;;) {
              switch (group) {
                case 23:
                  $processNonNcNames(attributes, this$static, this$static.namePolicy);
                  $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                  attributes = null;
                  break starttagloop;
                case 2:
                case 16:
                case 18:
                case 33:
                case 31:
                case 36:
                case 54:
                  break inbodyloop;
                case 3:
                  $addAttributesToBody(this$static, attributes);
                  attributes = null;
                  break starttagloop;
                case 29:
                case 50:
                case 46:
                case 51:
                  $implicitlyCloseP(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 42:
                  $implicitlyCloseP(this$static);
                  if (this$static.stack[this$static.currentPtr].group == 42) {
                    $pop(this$static);
                  }

                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 61:
                  $implicitlyCloseP(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 44:
                  $implicitlyCloseP(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.needToDropLF = true;
                  attributes = null;
                  break starttagloop;
                case 9:
                  if (this$static.formPointer) {
                    break starttagloop;
                  }
                   else {
                    $implicitlyCloseP(this$static);
                    $appendToCurrentNodeAndPushFormElementMayFoster(this$static, attributes);
                    attributes = null;
                    break starttagloop;
                  }

                case 15:
                case 41:
                  eltPos = this$static.currentPtr;
                  for (;;) {
                    node = this$static.stack[eltPos];
                    if (node.group == group) {
                      $generateImpliedEndTagsExceptFor(this$static, node.name_0);
                      while (this$static.currentPtr >= eltPos) {
                        $pop(this$static);
                      }
                      break;
                    }
                     else if (node.scoping || node.special && node.name_0 != 'p' && node.name_0 != 'address' && node.name_0 != 'div') {
                      break;
                    }
                    --eltPos;
                  }

                  $implicitlyCloseP(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 30:
                  $implicitlyCloseP(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  $setContentModelFlag_0(this$static.tokenizer, 3, elementName);
                  attributes = null;
                  break starttagloop;
                case 1:
                  activeAPos = $findInListOfActiveFormattingElementsContainsBetweenEndAndLastMarker(this$static, 'a');
                  if (activeAPos != -1) {
                    activeA = this$static.listOfActiveFormattingElements[activeAPos];
                    ++activeA.refcount;
                    $adoptionAgencyEndTag(this$static, 'a');
                    $removeFromStack_0(this$static, activeA);
                    activeAPos = $findInListOfActiveFormattingElements(this$static, activeA);
                    if (activeAPos != -1) {
                      $removeFromListOfActiveFormattingElements(this$static, activeAPos);
                    }
                    --activeA.refcount;
                  }

                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushFormattingElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 45:
                case 64:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushFormattingElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 24:
                  $reconstructTheActiveFormattingElements(this$static);
                  if (2147483647 != $findLastInScope(this$static, 'nobr')) {
                    $adoptionAgencyEndTag(this$static, 'nobr');
                  }

                  $appendToCurrentNodeAndPushFormattingElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 5:
                  eltPos = $findLastInScope(this$static, name);
                  if (eltPos != 2147483647) {
                    $generateImpliedEndTags(this$static);
                    while (this$static.currentPtr >= eltPos) {
                      $pop(this$static);
                    }
                    $clearTheListOfActiveFormattingElementsUpToTheLastMarker(this$static);
                    continue starttagloop;
                  }
                   else {
                    $reconstructTheActiveFormattingElements(this$static);
                    $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                    $append_1(this$static, null);
                    attributes = null;
                    break starttagloop;
                  }

                case 63:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  $append_1(this$static, null);
                  attributes = null;
                  break starttagloop;
                case 43:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  $append_1(this$static, null);
                  attributes = null;
                  break starttagloop;
                case 38:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                  attributes = null;
                  break starttagloop;
                case 34:
                  if (!this$static.quirks) {
                    $implicitlyCloseP(this$static);
                  }

                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.mode = 7;
                  attributes = null;
                  break starttagloop;
                case 4:
                case 48:
                case 49:
                  $reconstructTheActiveFormattingElements(this$static);
                case 55:
                  $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                case 22:
                  $implicitlyCloseP(this$static);
                  $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                case 12:
                  elementName = ($clinit_89() , IMG);
                  continue starttagloop;
                case 65:
                case 13:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendVoidElementToCurrentMayFoster(this$static, 'http://www.w3.org/1999/xhtml', name, attributes);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                case 14:
                  if (this$static.formPointer) {
                    break starttagloop;
                  }

                  $implicitlyCloseP(this$static);
                  formAttrs = $HtmlAttributes(new HtmlAttributes(), 0);
                  actionIndex = $getIndex(attributes, ($clinit_87() , ACTION));
                  if (actionIndex > -1) {
                    $addAttribute(formAttrs, ACTION, $getValue(attributes, actionIndex), ($clinit_80() , ALLOW));
                  }

                  $appendToCurrentNodeAndPushFormElementMayFoster(this$static, formAttrs);
                  $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , HR), ($clinit_91() , EMPTY_ATTRIBUTES));
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', P, EMPTY_ATTRIBUTES);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', LABEL_0, EMPTY_ATTRIBUTES);
                  promptIndex = $getIndex(attributes, PROMPT);
                  if (promptIndex > -1) {
                    prompt = $toCharArray($getValue(attributes, promptIndex));
                    $appendCharacters(this$static, this$static.stack[this$static.currentPtr].node, valueOf_1(prompt, 0, prompt.length));
                  }
                   else {
                    $appendCharacters(this$static, this$static.stack[this$static.currentPtr].node, valueOf_1(ISINDEX_PROMPT, 0, ISINDEX_PROMPT.length));
                  }

                  inputAttributes = $HtmlAttributes(new HtmlAttributes(), 0);
                  $addAttribute(inputAttributes, NAME, 'isindex', ($clinit_80() , ALLOW));
                  for (i = 0; i < attributes.length_0; ++i) {
                    attributeQName = $getAttributeName(attributes, i);
                    if (NAME == attributeQName || PROMPT == attributeQName) {
                    }
                     else if (ACTION != attributeQName) {
                      $addAttribute(inputAttributes, attributeQName, $getValue(attributes, i), ALLOW);
                    }
                  }

                  $clearWithoutReleasingContents(attributes);
                  $appendVoidElementToCurrentMayFoster(this$static, 'http://www.w3.org/1999/xhtml', 'input', inputAttributes);
                  $pop(this$static);
                  $pop(this$static);
                  $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', HR, EMPTY_ATTRIBUTES);
                  $pop(this$static);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                case 35:
                  $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  $setContentModelFlag_0(this$static.tokenizer, 1, elementName);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  this$static.needToDropLF = true;
                  attributes = null;
                  break starttagloop;
                case 26:
                  {
                    $reconstructTheActiveFormattingElements(this$static);
                    $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                    attributes = null;
                    break starttagloop;
                  }

                case 25:
                case 47:
                case 60:
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                  attributes = null;
                  break starttagloop;
                case 32:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  switch (this$static.mode) {
                    case 7:
                    case 8:
                    case 9:
                    case 10:
                    case 11:
                    case 12:
                      this$static.mode = 14;
                      break;
                    default:this$static.mode = 13;
                  }

                  attributes = null;
                  break starttagloop;
                case 27:
                case 28:
                  if ($findLastInScope(this$static, 'option') != 2147483647) {
                    optionendtagloop: for (;;) {
                      if ('option' == this$static.stack[this$static.currentPtr].name_0) {
                        $pop(this$static);
                        break optionendtagloop;
                      }
                      eltPos = this$static.currentPtr;
                      for (;;) {
                        if (this$static.stack[eltPos].name_0 == 'option') {
                          $generateImpliedEndTags(this$static);
                          while (this$static.currentPtr >= eltPos) {
                            $pop(this$static);
                          }
                          break optionendtagloop;
                        }
                        --eltPos;
                      }
                    }
                  }

                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 53:
                  eltPos = $findLastInScope(this$static, 'ruby');
                  if (eltPos != 2147483647) {
                    $generateImpliedEndTags(this$static);
                  }

                  if (eltPos != this$static.currentPtr) {
                    while (this$static.currentPtr > eltPos) {
                      $pop(this$static);
                    }
                  }

                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                case 17:
                  $reconstructTheActiveFormattingElements(this$static);
                  attributes.mode = 1;
                  if (selfClosing) {
                    $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1998/Math/MathML', elementName, attributes);
                    selfClosing = false;
                  }
                   else {
                    $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1998/Math/MathML', elementName, attributes);
                    this$static.foreignFlag = 0;
                  }

                  attributes = null;
                  break starttagloop;
                case 19:
                  $reconstructTheActiveFormattingElements(this$static);
                  attributes.mode = 2;
                  if (selfClosing) {
                    $appendVoidElementToCurrentMayFosterCamelCase(this$static, 'http://www.w3.org/2000/svg', elementName, attributes);
                    selfClosing = false;
                  }
                   else {
                    $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/2000/svg', elementName, attributes);
                    this$static.foreignFlag = 0;
                  }

                  attributes = null;
                  break starttagloop;
                case 6:
                case 7:
                case 8:
                case 39:
                case 37:
                case 40:
                case 10:
                case 11:
                case 20:
                  break starttagloop;
                case 62:
                  $reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
                default:$reconstructTheActiveFormattingElements(this$static);
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  attributes = null;
                  break starttagloop;
              }
            }

          case 3:
            inheadloop: for (;;) {
              switch (group) {
                case 23:
                  $processNonNcNames(attributes, this$static, this$static.namePolicy);
                  $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                  attributes = null;
                  break starttagloop;
                case 2:
                case 54:
                  $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  selfClosing = false;
                  attributes = null;
                  break starttagloop;
                case 18:
                case 16:
                  break inheadloop;
                case 36:
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  $setContentModelFlag_0(this$static.tokenizer, 1, elementName);
                  attributes = null;
                  break starttagloop;
                case 26:
                  {
                    $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                    this$static.mode = 4;
                  }

                  attributes = null;
                  break starttagloop;
                case 31:
                case 33:
                case 25:
                  $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                  this$static.originalMode = this$static.mode;
                  this$static.mode = 20;
                  $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                  attributes = null;
                  break starttagloop;
                case 20:
                  break starttagloop;
                default:$pop(this$static);
                  this$static.mode = 5;
                  continue starttagloop;
              }
            }

          case 4:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 16:
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                attributes = null;
                break starttagloop;
              case 18:
                $checkMetaCharset(this$static, attributes);
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                attributes = null;
                break starttagloop;
              case 33:
              case 25:
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              case 20:
                break starttagloop;
              case 26:
                break starttagloop;
              default:$pop(this$static);
                this$static.mode = 3;
                continue;
            }

          case 9:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 7:
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                attributes = null;
                break starttagloop;
              default:if (this$static.currentPtr == 0) {
                  break starttagloop;
                }

                $pop(this$static);
                this$static.mode = 7;
                continue;
            }

          case 14:
            switch (group) {
              case 6:
              case 39:
              case 37:
              case 40:
              case 34:
                $endSelect(this$static);
                continue;
            }

          case 13:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 28:
                if ('option' == this$static.stack[this$static.currentPtr].name_0) {
                  $pop(this$static);
                }

                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                attributes = null;
                break starttagloop;
              case 27:
                if ('option' == this$static.stack[this$static.currentPtr].name_0) {
                  $pop(this$static);
                }

                if ('optgroup' == this$static.stack[this$static.currentPtr].name_0) {
                  $pop(this$static);
                }

                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                attributes = null;
                break starttagloop;
              case 32:
                eltPos = $findLastInTableScope(this$static, name);
                if (eltPos == 2147483647) {
                  break starttagloop;
                }
                 else {
                  while (this$static.currentPtr >= eltPos) {
                    $pop(this$static);
                  }
                  $resetTheInsertionMode(this$static);
                  break starttagloop;
                }

              case 13:
              case 35:
                $endSelect(this$static);
                continue;
              case 31:
                $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              default:break starttagloop;
            }

          case 15:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              default:this$static.mode = 6;
                continue;
            }

          case 16:
            switch (group) {
              case 11:
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                attributes = null;
                break starttagloop;
              case 10:
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                attributes = null;
                break starttagloop;
            }

          case 17:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 25:
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              default:break starttagloop;
            }

          case 0:
            $documentModeInternal(this$static, ($clinit_78() , QUIRKS_MODE));
            this$static.mode = 1;
            continue;
          case 1:
            switch (group) {
              case 23:
                if (attributes == ($clinit_91() , EMPTY_ATTRIBUTES)) {
                  $appendHtmlElementToDocumentAndPush(this$static, $emptyAttributes(this$static.tokenizer));
                }
                 else {
                  $appendHtmlElementToDocumentAndPush(this$static, attributes);
                }

                this$static.mode = 2;
                attributes = null;
                break starttagloop;
              default:$appendHtmlElementToDocumentAndPush(this$static, $emptyAttributes(this$static.tokenizer));
                this$static.mode = 2;
                continue;
            }

          case 2:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 20:
                $appendToCurrentNodeAndPushHeadElement(this$static, attributes);
                this$static.mode = 3;
                attributes = null;
                break starttagloop;
              default:$appendToCurrentNodeAndPushHeadElement(this$static, ($clinit_91() , EMPTY_ATTRIBUTES));
                this$static.mode = 3;
                continue;
            }

          case 5:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              case 3:
                if (attributes.length_0 == 0) {
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), $emptyAttributes(this$static.tokenizer));
                }
                 else {
                  $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), attributes);
                }

                this$static.mode = 21;
                attributes = null;
                break starttagloop;
              case 11:
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.mode = 16;
                attributes = null;
                break starttagloop;
              case 2:
                $pushHeadPointerOntoStack(this$static);
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                $pop(this$static);
                attributes = null;
                break starttagloop;
              case 16:
                $pushHeadPointerOntoStack(this$static);
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                $pop(this$static);
                attributes = null;
                break starttagloop;
              case 18:
                $checkMetaCharset(this$static, attributes);
                $pushHeadPointerOntoStack(this$static);
                $appendVoidElementToCurrentMayFoster_0(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                selfClosing = false;
                $pop(this$static);
                attributes = null;
                break starttagloop;
              case 31:
                $pushHeadPointerOntoStack(this$static);
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              case 33:
              case 25:
                $pushHeadPointerOntoStack(this$static);
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              case 36:
                $pushHeadPointerOntoStack(this$static);
                $appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 1, elementName);
                attributes = null;
                break starttagloop;
              case 20:
                break starttagloop;
              default:$appendToCurrentNodeAndPushElement(this$static, 'http://www.w3.org/1999/xhtml', ($clinit_89() , BODY), $emptyAttributes(this$static.tokenizer));
                this$static.mode = 21;
                continue;
            }

          case 18:
            switch (group) {
              case 23:
                $processNonNcNames(attributes, this$static, this$static.namePolicy);
                $addAttributesToElement(this$static, this$static.stack[0].node, attributes);
                attributes = null;
                break starttagloop;
              default:this$static.mode = 6;
                continue;
            }

          case 19:
            switch (group) {
              case 25:
                $appendToCurrentNodeAndPushElementMayFoster(this$static, 'http://www.w3.org/1999/xhtml', elementName, attributes);
                this$static.originalMode = this$static.mode;
                this$static.mode = 20;
                $setContentModelFlag_0(this$static.tokenizer, 2, elementName);
                attributes = null;
                break starttagloop;
              default:break starttagloop;
            }

        }

    }
  }
  if (needsPostProcessing && this$static.foreignFlag == 0 && !$hasForeignInScope(this$static)) {
    this$static.foreignFlag = 1;
  }
  attributes != ($clinit_91() , EMPTY_ATTRIBUTES);
}

function $startTokenization(this$static, self){
  var elt, node;
  this$static.tokenizer = self;
  this$static.stack = initDim(_3Lnu_validator_htmlparser_impl_StackNode_2_classLit, 51, 11, 64, 0);
  this$static.listOfActiveFormattingElements = initDim(_3Lnu_validator_htmlparser_impl_StackNode_2_classLit, 51, 11, 64, 0);
  this$static.needToDropLF = false;
  this$static.originalMode = 0;
  this$static.currentPtr = -1;
  this$static.listPtr = -1;
  this$static.formPointer = null;
  this$static.headPointer = null;
  this$static.html4 = false;
  $clearImpl(this$static.idLocations);
  this$static.wantingComments = this$static.wantingComments;
  this$static.script = null;
  this$static.placeholder = null;
  this$static.readyToRun = false;
  this$static.charBufferLen = 0;
  this$static.charBuffer = initDim(_3C_classLit, 42, -1, 1024, 1);
  if (this$static.fragment) {
    elt = $createHtmlElementSetAsRoot(this$static, $emptyAttributes(this$static.tokenizer));
    node = $StackNode_0(new StackNode(), 'http://www.w3.org/1999/xhtml', ($clinit_89() , HTML_0), elt);
    ++this$static.currentPtr;
    this$static.stack[this$static.currentPtr] = node;
    $resetTheInsertionMode(this$static);
    if ('title' == this$static.contextName || 'textarea' == this$static.contextName) {
      $setContentModelFlag(this$static.tokenizer, 1);
    }
     else if ('style' == this$static.contextName || 'script' == this$static.contextName || 'xmp' == this$static.contextName || 'iframe' == this$static.contextName || 'noembed' == this$static.contextName || 'noframes' == this$static.contextName) {
      $setContentModelFlag(this$static.tokenizer, 2);
    }
     else if ('plaintext' == this$static.contextName) {
      $setContentModelFlag(this$static.tokenizer, 3);
    }
     else {
      $setContentModelFlag(this$static.tokenizer, 0);
    }
    this$static.contextName = null;
  }
   else {
    this$static.mode = 0;
    this$static.foreignFlag = 1;
  }
}

function extractCharsetFromContent(attributeValue){
  var buffer, c, charset, charsetState, end, i, start;
  charsetState = 0;
  start = -1;
  end = -1;
  buffer = $toCharArray(attributeValue);
  charsetloop: for (i = 0; i < buffer.length; ++i) {
    c = buffer[i];
    switch (charsetState) {
      case 0:
        switch (c) {
          case 99:
          case 67:
            charsetState = 1;
            continue;
          default:continue;
        }

      case 1:
        switch (c) {
          case 104:
          case 72:
            charsetState = 2;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 2:
        switch (c) {
          case 97:
          case 65:
            charsetState = 3;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 3:
        switch (c) {
          case 114:
          case 82:
            charsetState = 4;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 4:
        switch (c) {
          case 115:
          case 83:
            charsetState = 5;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 5:
        switch (c) {
          case 101:
          case 69:
            charsetState = 6;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 6:
        switch (c) {
          case 116:
          case 84:
            charsetState = 7;
            continue;
          default:charsetState = 0;
            continue;
        }

      case 7:
        switch (c) {
          case 9:
          case 10:
          case 12:
          case 13:
          case 32:
            continue;
          case 61:
            charsetState = 8;
            continue;
          default:return null;
        }

      case 8:
        switch (c) {
          case 9:
          case 10:
          case 12:
          case 13:
          case 32:
            continue;
          case 39:
            start = i + 1;
            charsetState = 9;
            continue;
          case 34:
            start = i + 1;
            charsetState = 10;
            continue;
          default:start = i;
            charsetState = 11;
            continue;
        }

      case 9:
        switch (c) {
          case 39:
            end = i;
            break charsetloop;
          default:continue;
        }

      case 10:
        switch (c) {
          case 34:
            end = i;
            break charsetloop;
          default:continue;
        }

      case 11:
        switch (c) {
          case 9:
          case 10:
          case 12:
          case 13:
          case 32:
          case 59:
            end = i;
            break charsetloop;
          default:continue;
        }

    }
  }
  charset = null;
  if (start != -1) {
    if (end == -1) {
      end = buffer.length;
    }
    charset = valueOf_1(buffer, start, end - start);
  }
  return charset;
}

function getClass_57(){
  return Lnu_validator_htmlparser_impl_TreeBuilder_2_classLit;
}

function TreeBuilder(){
}

_ = TreeBuilder.prototype = new Object_0();
_.getClass$ = getClass_57;
_.typeId$ = 0;
_.charBuffer = null;
_.charBufferLen = 0;
_.contextName = null;
_.contextNamespace = null;
_.currentPtr = -1;
_.foreignFlag = 1;
_.formPointer = null;
_.fragment = false;
_.headPointer = null;
_.html4 = false;
_.listOfActiveFormattingElements = null;
_.listPtr = -1;
_.mode = 0;
_.needToDropLF = false;
_.originalMode = 0;
_.quirks = false;
_.stack = null;
_.tokenizer = null;
_.wantingComments = false;
var HTML4_PUBLIC_IDS, ISINDEX_PROMPT, QUIRKY_PUBLIC_IDS;
function $clinit_88(){
  $clinit_88 = nullMethod;
  $clinit_98();
}

function $accumulateCharacters(this$static, buf, start, length){
  var newBuf, newLen;
  newLen = this$static.charBufferLen + length;
  if (newLen > this$static.charBuffer.length) {
    newBuf = initDim(_3C_classLit, 42, -1, newLen, 1);
    arraycopy(this$static.charBuffer, 0, newBuf, 0, this$static.charBufferLen);
    this$static.charBuffer = newBuf;
  }
  arraycopy(buf, start, this$static.charBuffer, this$static.charBufferLen, length);
  this$static.charBufferLen = newLen;
}

function $insertFosterParentedCharacters_0(this$static, buf, start, length, table, stackParent){
  var end;
  $insertFosterParentedCharacters(this$static, (end = start + length , __checkBounds(buf.length, start, end) , __valueOf(buf, start, end)), table, stackParent);
}

function getClass_50(){
  return Lnu_validator_htmlparser_impl_CoalescingTreeBuilder_2_classLit;
}

function CoalescingTreeBuilder(){
}

_ = CoalescingTreeBuilder.prototype = new TreeBuilder();
_.getClass$ = getClass_50;
_.typeId$ = 0;
function $clinit_82(){
  $clinit_82 = nullMethod;
  $clinit_88();
}

function $BrowserTreeBuilder(this$static, document_0){
  $clinit_82();
  this$static.doctypeExpectation = ($clinit_77() , HTML);
  this$static.namePolicy = ($clinit_80() , ALTER_INFOSET);
  this$static.idLocations = $HashMap(new HashMap());
  this$static.fragment = false;
  this$static.scriptStack = $LinkedList(new LinkedList());
  this$static.document_0 = document_0;
  installExplorerCreateElementNS(document_0);
  return this$static;
}

function $addAttributesToElement(this$static, element, attributes){
  var $e0, e, i, localName, uri;
  try {
    for (i = 0; i < attributes.length_0; ++i) {
      localName = $getLocalName(attributes, i);
      uri = $getURI(attributes, i);
      if (!element.hasAttributeNS(uri, localName)) {
        element.setAttributeNS(uri, localName, $getValue(attributes, i));
      }
    }
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $appendCharacters(this$static, parent, text){
  var $e0, e;
  try {
    if (parent == this$static.placeholder) {
      this$static.script.appendChild(this$static.document_0.createTextNode(text));
    }
    parent.appendChild(this$static.document_0.createTextNode(text));
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $appendChildrenToNewParent(this$static, oldParent, newParent){
  var $e0, e;
  try {
    while (oldParent.hasChildNodes()) {
      newParent.appendChild(oldParent.firstChild);
    }
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $appendComment(this$static, parent, comment){
  var $e0, e;
  try {
    if (parent == this$static.placeholder) {
      this$static.script.appendChild(this$static.document_0.createComment(comment));
    }
    parent.appendChild(this$static.document_0.createComment(comment));
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $appendCommentToDocument(this$static, comment){
  var $e0, e;
  try {
    this$static.document_0.appendChild(this$static.document_0.createComment(comment));
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $appendElement(this$static, child, newParent){
  var $e0, e;
  try {
    if (newParent == this$static.placeholder) {
      this$static.script.appendChild(child.cloneNode(true));
    }
    newParent.appendChild(child);
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $createElement(this$static, ns, name, attributes){
  var $e0, e, i, rv;
  try {
    rv = this$static.document_0.createElementNS(ns, name);
    for (i = 0; i < attributes.length_0; ++i) {
      rv.setAttributeNS($getURI(attributes, i), $getLocalName(attributes, i), $getValue(attributes, i));
    }
    if ('script' == name) {
      if (this$static.placeholder) {
        $addLast(this$static.scriptStack, $BrowserTreeBuilder$ScriptHolder(new BrowserTreeBuilder$ScriptHolder(), this$static.script, this$static.placeholder));
      }
      this$static.script = rv;
      this$static.placeholder = this$static.document_0.createElementNS('http://n.validator.nu/placeholder/', 'script');
      rv = this$static.placeholder;
      for (i = 0; i < attributes.length_0; ++i) {
        rv.setAttributeNS($getURI(attributes, i), $getLocalName(attributes, i), $getValue(attributes, i));
      }
    }
    return rv;
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
      throw $RuntimeException(new RuntimeException(), 'Unreachable');
    }
     else 
      throw $e0;
  }
}

function $createElement_0(this$static, ns, name, attributes){
  var $e0, e, rv;
  try {
    rv = $createElement(this$static, ns, name, attributes);
    return rv;
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
      return null;
    }
     else 
      throw $e0;
  }
}

function $createHtmlElementSetAsRoot(this$static, attributes){
  var $e0, e, i, rv;
  try {
    rv = this$static.document_0.createElementNS('http://www.w3.org/1999/xhtml', 'html');
    for (i = 0; i < attributes.length_0; ++i) {
      rv.setAttributeNS($getURI(attributes, i), $getLocalName(attributes, i), $getValue(attributes, i));
    }
    this$static.document_0.appendChild(rv);
    return rv;
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
      throw $RuntimeException(new RuntimeException(), 'Unreachable');
    }
     else 
      throw $e0;
  }
}

function $detachFromParent(this$static, element){
  var $e0, e, parent;
  try {
    parent = element.parentNode;
    if (parent) {
      parent.removeChild(element);
    }
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $elementPopped(this$static, ns, name, node){
  if (node == this$static.placeholder) {
    this$static.readyToRun = true;
    this$static.tokenizer.shouldSuspend = true;
  }
  __elementPopped__(ns, name, node);
}

function $getDocument(this$static){
  var rv;
  rv = this$static.document_0;
  this$static.document_0 = null;
  return rv;
}

function $insertFosterParentedCharacters(this$static, text, table, stackParent){
  var $e0, child, e, parent;
  try {
    child = this$static.document_0.createTextNode(text);
    parent = table.parentNode;
    if (!!parent && parent.nodeType == 1) {
      parent.insertBefore(child, table);
    }
     else {
      stackParent.appendChild(child);
    }
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $insertFosterParentedChild(this$static, child, table, stackParent){
  var $e0, e, parent;
  parent = table.parentNode;
  try {
    if (!!parent && parent.nodeType == 1) {
      parent.insertBefore(child, table);
    }
     else {
      stackParent.appendChild(child);
    }
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 19)) {
      e = $e0;
      $fatal_0(this$static, e);
    }
     else 
      throw $e0;
  }
}

function $maybeRunScript(this$static){
  var scriptHolder;
  if (this$static.readyToRun) {
    this$static.readyToRun = false;
    replace_0(this$static.placeholder, this$static.script);
    if (this$static.scriptStack.size == 0) {
      this$static.script = null;
      this$static.placeholder = null;
    }
     else {
      scriptHolder = dynamicCast($removeLast(this$static.scriptStack), 20);
      this$static.script = scriptHolder.script;
      this$static.placeholder = scriptHolder.placeholder;
    }
  }
}

function getClass_45(){
  return Lnu_validator_htmlparser_gwt_BrowserTreeBuilder_2_classLit;
}

function installExplorerCreateElementNS(doc){
  if (!doc.createElementNS) {
    doc.createElementNS = function(uri, local){
      if ('http://www.w3.org/1999/xhtml' == uri) {
        return doc.createElement(local);
      }
       else if ('http://www.w3.org/1998/Math/MathML' == uri) {
        if (!doc.mathplayerinitialized) {
          var obj = document.createElement('object');
          obj.setAttribute('id', 'mathplayer');
          obj.setAttribute('classid', 'clsid:32F66A20-7614-11D4-BD11-00104BD3F987');
          document.getElementsByTagName('head')[0].appendChild(obj);
          document.namespaces.add('m', 'http://www.w3.org/1998/Math/MathML', '#mathplayer');
          doc.mathplayerinitialized = true;
        }
        return doc.createElement('m:' + local);
      }
       else if ('http://www.w3.org/2000/svg' == uri) {
        if (!doc.renesisinitialized) {
          var obj = document.createElement('object');
          obj.setAttribute('id', 'renesis');
          obj.setAttribute('classid', 'clsid:AC159093-1683-4BA2-9DCF-0C350141D7F2');
          document.getElementsByTagName('head')[0].appendChild(obj);
          document.namespaces.add('s', 'http://www.w3.org/2000/svg', '#renesis');
          doc.renesisinitialized = true;
        }
        return doc.createElement('s:' + local);
      }
       else {
      }
    }
    ;
  }
}

function replace_0(oldNode, newNode){
  oldNode.parentNode.replaceChild(newNode, oldNode);
  __elementPopped__('', newNode.nodeName, newNode);
}

function BrowserTreeBuilder(){
}

_ = BrowserTreeBuilder.prototype = new CoalescingTreeBuilder();
_.getClass$ = getClass_45;
_.typeId$ = 0;
_.document_0 = null;
_.placeholder = null;
_.readyToRun = false;
_.script = null;
function $BrowserTreeBuilder$ScriptHolder(this$static, script, placeholder){
  this$static.script = script;
  this$static.placeholder = placeholder;
  return this$static;
}

function getClass_44(){
  return Lnu_validator_htmlparser_gwt_BrowserTreeBuilder$ScriptHolder_2_classLit;
}

function BrowserTreeBuilder$ScriptHolder(){
}

_ = BrowserTreeBuilder$ScriptHolder.prototype = new Object_0();
_.getClass$ = getClass_44;
_.typeId$ = 34;
_.placeholder = null;
_.script = null;
function $HtmlParser(this$static, document_0){
  this$static.documentWriteBuffer = $StringBuilder(new StringBuilder());
  this$static.bufferStack = $LinkedList(new LinkedList());
  this$static.domTreeBuilder = $BrowserTreeBuilder(new BrowserTreeBuilder(), document_0);
  this$static.tokenizer = $ErrorReportingTokenizer(new ErrorReportingTokenizer(), this$static.domTreeBuilder);
  this$static.domTreeBuilder.namePolicy = ($clinit_80() , ALTER_INFOSET);
  this$static.tokenizer.commentPolicy = ALTER_INFOSET;
  this$static.tokenizer.contentNonXmlCharPolicy = ALTER_INFOSET;
  this$static.tokenizer.contentSpacePolicy = ALTER_INFOSET;
  this$static.tokenizer.namePolicy = ALTER_INFOSET;
  $setXmlnsPolicy(this$static.tokenizer, ALTER_INFOSET);
  return this$static;
}

function $parse(this$static, source, callback){
  this$static.parseEndListener = callback;
  $setFragmentContext(this$static.domTreeBuilder, null);
  this$static.lastWasCR = false;
  this$static.ending = false;
  $setLength(this$static.documentWriteBuffer, 0);
  this$static.streamLength = source.length;
  this$static.stream = $UTF16Buffer(new UTF16Buffer(), $toCharArray(source), 0, this$static.streamLength < 512?this$static.streamLength:512);
  $clear(this$static.bufferStack);
  $addLast(this$static.bufferStack, this$static.stream);
  $setFragmentContext(this$static.domTreeBuilder, null);
  $start_0(this$static.tokenizer);
  $pump(this$static);
}

function $pump(this$static){
  var buffer, docWriteLen, newBuf, newEnd, timer;
  if (this$static.ending) {
    $end(this$static.tokenizer);
    $getDocument(this$static.domTreeBuilder);
    this$static.parseEndListener.callback();
    return;
  }
  docWriteLen = this$static.documentWriteBuffer.stringLength;
  if (docWriteLen > 0) {
    newBuf = initDim(_3C_classLit, 42, -1, docWriteLen, 1);
    $getChars(this$static.documentWriteBuffer, 0, docWriteLen, newBuf, 0);
    $addLast(this$static.bufferStack, $UTF16Buffer(new UTF16Buffer(), newBuf, 0, docWriteLen));
    $setLength(this$static.documentWriteBuffer, 0);
  }
  for (;;) {
    buffer = dynamicCast($getLast(this$static.bufferStack), 21);
    if (buffer.start >= buffer.end) {
      if (buffer == this$static.stream) {
        if (buffer.end == this$static.streamLength) {
          $eof(this$static.tokenizer);
          this$static.ending = true;
          break;
        }
         else {
          newEnd = buffer.start + 512;
          buffer.end = newEnd < this$static.streamLength?newEnd:this$static.streamLength;
          continue;
        }
      }
       else {
        dynamicCast($removeLast(this$static.bufferStack), 21);
        continue;
      }
    }
    $adjust(buffer, this$static.lastWasCR);
    this$static.lastWasCR = false;
    if (buffer.start < buffer.end) {
      this$static.lastWasCR = $tokenizeBuffer(this$static.tokenizer, buffer);
      $maybeRunScript(this$static.domTreeBuilder);
      break;
    }
     else {
      continue;
    }
  }
  timer = $HtmlParser$1(new HtmlParser$1(), this$static);
  this$static.pschedule($schedule,timer,1);
}

function documentWrite(text){
  var buffer;
  buffer = $UTF16Buffer(new UTF16Buffer(), $toCharArray(text), 0, text.length);
  while (buffer.start < buffer.end) {
    $adjust(buffer, this.lastWasCR);
    this.lastWasCR = false;
    if (buffer.start < buffer.end) {
      this.lastWasCR = $tokenizeBuffer(this.tokenizer, buffer);
      $maybeRunScript(this.domTreeBuilder);
    }
  }
}

function getClass_47(){
  return Lnu_validator_htmlparser_gwt_HtmlParser_2_classLit;
}

function HtmlParser(){
}

_ = HtmlParser.prototype = new Object_0();
_.documentWrite = documentWrite;
_.getClass$ = getClass_47;
_.typeId$ = 0;
_.domTreeBuilder = null;
_.ending = false;
_.lastWasCR = false;
_.parseEndListener = null;
_.stream = null;
_.streamLength = 0;
_.tokenizer = null;
function $clinit_83(){
  $clinit_83 = nullMethod;
  $clinit_12();
}

function $HtmlParser$1(this$static, this$0){
  $clinit_83();
  this$static.this$0 = this$0;
  return this$static;
}

function $run(this$static){
  var $e0;
  try {
    $pump(this$static.this$0);
  }
   catch ($e0) {
    $e0 = caught($e0);
    if (instanceOf($e0, 22)) {
      this$static.this$0.ending = true;
    }
     else 
      throw $e0;
  }
}

function getClass_46(){
  return Lnu_validator_htmlparser_gwt_HtmlParser$1_2_classLit;
}

function HtmlParser$1(){
}

_ = HtmlParser$1.prototype = new Timer();
_.getClass$ = getClass_46;
_.typeId$ = 35;
_.this$0 = null;
function installDocWrite(doc, parser){
  doc.write = function(){
    if (arguments.length == 0) {
      return;
    }
    var text = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      text += arguments[i];
    }
    parser.documentWrite(text);
  }
  ;
  doc.writeln = function(){
    if (arguments.length == 0) {
      parser.documentWrite('\n');
      return;
    }
    var text = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
      text += arguments[i];
    }
    text += '\n';
    parser.documentWrite(text);
  }
  ;
}

function parseHtmlDocument(source, document_0, readyCallback, errorHandler, parse_sync){
  var parser;
  if (!readyCallback) {
    readyCallback = createFunction();
  }
  zapChildren(document_0);
  parser = $HtmlParser(new HtmlParser(), document_0);
  installDocWrite(document_0, parser);
  parse_sync ? sync(parser) : async(parser);
  $parse(parser, source, $ParseEndListener(new ParseEndListener(), readyCallback));
  parser.pwait();
}

function zapChildren(node){
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function $ParseEndListener(this$static, callback){
  this$static.callback = callback;
  return this$static;
}

function getClass_48(){
  return Lnu_validator_htmlparser_gwt_ParseEndListener_2_classLit;
}

function ParseEndListener(){
}

_ = ParseEndListener.prototype = new Object_0();
_.getClass$ = getClass_48;
_.typeId$ = 0;
_.callback = null;
function $clinit_87(){
  var arr_32;
  $clinit_87 = nullMethod;
  ALL_NO_NS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['', '', '', '']);
  XMLNS_NS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['', 'http://www.w3.org/2000/xmlns/', 'http://www.w3.org/2000/xmlns/', '']);
  XML_NS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['', 'http://www.w3.org/XML/1998/namespace', 'http://www.w3.org/XML/1998/namespace', '']);
  XLINK_NS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xlink', '']);
  LANG_NS = initValues(_3Ljava_lang_String_2_classLit, 48, 1, ['', '', '', 'http://www.w3.org/XML/1998/namespace']);
  ALL_NO_PREFIX = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [null, null, null, null]);
  XMLNS_PREFIX = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [null, 'xmlns', 'xmlns', null]);
  XLINK_PREFIX = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [null, 'xlink', 'xlink', null]);
  XML_PREFIX = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [null, 'xml', 'xml', null]);
  LANG_PREFIX = initValues(_3Ljava_lang_String_2_classLit, 48, 1, [null, null, null, 'xml']);
  ALL_NCNAME = initValues(_3Z_classLit, 0, -1, [true, true, true, true]);
  ALL_NO_NCNAME = initValues(_3Z_classLit, 0, -1, [false, false, false, false]);
  D = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('d'), ALL_NO_PREFIX, ALL_NCNAME, false);
  K = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('k'), ALL_NO_PREFIX, ALL_NCNAME, false);
  R = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('r'), ALL_NO_PREFIX, ALL_NCNAME, false);
  X = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('x'), ALL_NO_PREFIX, ALL_NCNAME, false);
  Y = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('y'), ALL_NO_PREFIX, ALL_NCNAME, false);
  Z = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('z'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('by'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cx'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dx'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  G2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('g2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  G1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('g1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fx'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  K4 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('k4'), ALL_NO_PREFIX, ALL_NCNAME, false);
  K2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('k2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  K3 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('k3'), ALL_NO_PREFIX, ALL_NCNAME, false);
  K1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('k1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ID = $AttributeName_0(new AttributeName(), ALL_NO_NS, SAME_LOCAL('id'), ALL_NO_PREFIX, ALL_NCNAME, false);
  IN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('in'), ALL_NO_PREFIX, ALL_NCNAME, false);
  U2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('u2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  U1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('u1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rt'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rx'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ry'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TO = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('to'), ALL_NO_PREFIX, ALL_NCNAME, false);
  Y2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('y2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  Y1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('y1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  X1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('x1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  X2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('x2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alt'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DIR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dir'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DUR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dur'), ALL_NO_PREFIX, ALL_NCNAME, false);
  END = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('end'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('for'), ALL_NO_PREFIX, ALL_NCNAME, false);
  IN2 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('in2'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MAX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('max'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('min'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LOW = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('low'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rel'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REV = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rev'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SRC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('src'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AXIS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('axis'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ABBR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('abbr'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BBOX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('bbox'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CITE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cite'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CODE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('code'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BIAS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('bias'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cols'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLIP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('clip'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CHAR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('char'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BASE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('base'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EDGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('edge'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DATA = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('data'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fill'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FROM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('from'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FORM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('form'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('face'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HIGH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('high'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HREF = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('href'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OPEN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('open'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ICON = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('icon'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NAME = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('name'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MODE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MASK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mask'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LINK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('link'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LANG = $AttributeName(new AttributeName(), LANG_NS, SAME_LOCAL('lang'), LANG_PREFIX, ALL_NCNAME, false);
  LIST = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('list'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('type'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WHEN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('when'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WRAP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('wrap'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEXT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('text'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('path'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ping'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REFX = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('refx', 'refX'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REFY = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('refy', 'refY'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('size'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SEED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('seed'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROWS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rows'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPAN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('span'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STEP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('step'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('role'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XREF = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('xref'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ASYNC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('async'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALINK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alink'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALIGN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('align'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLOSE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('close'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('color'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLASS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('class'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLEAR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('clear'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BEGIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('begin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DEPTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('depth'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DEFER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('defer'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FENCE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fence'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FRAME = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('frame'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ISMAP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ismap'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONEND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onend'), ALL_NO_PREFIX, ALL_NCNAME, false);
  INDEX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('index'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ORDER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('order'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OTHER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('other'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oncut'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NARGS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('nargs'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MEDIA = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('media'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LABEL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('label'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LOCAL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('local'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WIDTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('width'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TITLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('title'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VLINK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('vlink'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VALUE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('value'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SLOPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('slope'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SHAPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('shape'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCOPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scope'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCALE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scale'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPEED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('speed'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STYLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('style'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RULES = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rules'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STEMH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stemh'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STEMV = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stemv'), ALL_NO_PREFIX, ALL_NCNAME, false);
  START = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('start'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XMLNS = $AttributeName(new AttributeName(), XMLNS_NS, SAME_LOCAL('xmlns'), ALL_NO_PREFIX, initValues(_3Z_classLit, 0, -1, [false, false, false, false]), true);
  ACCEPT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accept'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACCENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ASCENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ascent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACTIVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('active'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALTIMG = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('altimg'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACTION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('action'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BORDER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('border'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CURSOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cursor'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COORDS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('coords'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILTER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('filter'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FORMAT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('format'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HIDDEN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('hidden'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('hspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('height'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmove'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONLOAD = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onload'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAG = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondrag'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ORIGIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('origin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONZOOM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onzoom'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONHELP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onhelp'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSTOP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onstop'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDROP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondrop'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBLUR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onblur'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OBJECT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('object'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OFFSET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('offset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ORIENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('orient'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCOPY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oncopy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NOWRAP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('nowrap'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NOHREF = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('nohref'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MACROS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('macros'), ALL_NO_PREFIX, ALL_NCNAME, false);
  METHOD = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('method'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LOWSRC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('lowsrc'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('lspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LQUOTE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('lquote'), ALL_NO_PREFIX, ALL_NCNAME, false);
  USEMAP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('usemap'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WIDTHS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('widths'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TARGET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('target'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VALUES = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('values'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VALIGN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('valign'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('vspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POSTER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('poster'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POINTS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('points'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PROMPT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('prompt'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCOPED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scoped'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STRING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('string'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCHEME = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scheme'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RADIUS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('radius'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RESULT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('result'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEAT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('repeat'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROTATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rotate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RQUOTE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rquote'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALTTEXT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alttext'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARCHIVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('archive'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AZIMUTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('azimuth'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLOSURE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('closure'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CHECKED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('checked'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLASSID = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('classid'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CHAROFF = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('charoff'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BGCOLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('bgcolor'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLSPAN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('colspan'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CHARSET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('charset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COMPACT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('compact'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('content'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ENCTYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('enctype'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DATASRC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('datasrc'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DATAFLD = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('datafld'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DECLARE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('declare'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DISPLAY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('display'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DIVISOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('divisor'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DEFAULT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('default'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DESCENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('descent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KERNING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('kerning'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HANGING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('hanging'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HEADERS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('headers'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONPASTE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onpaste'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCLICK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onclick'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OPTIMUM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('optimum'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEGIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbegin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONKEYUP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onkeyup'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFOCUS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onfocus'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONERROR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onerror'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONINPUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oninput'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONABORT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onabort'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onstart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONRESET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onreset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OPACITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('opacity'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NOSHADE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('noshade'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MINSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('minsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MAXSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('maxsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LOOPEND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('loopend'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LARGEOP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('largeop'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNICODE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('unicode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TARGETX = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('targetx', 'targetX'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TARGETY = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('targety', 'targetY'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VIEWBOX = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('viewbox', 'viewBox'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERSION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('version'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATTERN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('pattern'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PROFILE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('profile'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('spacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RESTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('restart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROWSPAN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rowspan'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SANDBOX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('sandbox'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SUMMARY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('summary'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STANDBY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('standby'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPLACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('replace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AUTOPLAY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('autoplay'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ADDITIVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('additive'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CALCMODE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('calcmode', 'calcMode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CODETYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('codetype'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CODEBASE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('codebase'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTROLS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('controls'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BEVELLED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('bevelled'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BASELINE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('baseline'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EXPONENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('exponent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EDGEMODE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('edgemode', 'edgeMode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ENCODING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('encoding'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GLYPHREF = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('glyphref', 'glyphRef'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DATETIME = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('datetime'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DISABLED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('disabled'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONTSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fontsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KEYTIMES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('keytimes', 'keyTimes'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PANOSE_1 = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('panose-1'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HREFLANG = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('hreflang'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONRESIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onresize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onchange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBOUNCE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbounce'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONUNLOAD = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onunload'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFINISH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onfinish'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSCROLL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onscroll'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OPERATOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('operator'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OVERFLOW = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('overflow'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSUBMIT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onsubmit'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONREPEAT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onrepeat'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSELECT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onselect'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NOTATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('notation'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NORESIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('noresize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MANIFEST = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('manifest'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MATHSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mathsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MULTIPLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('multiple'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LONGDESC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('longdesc'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LANGUAGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('language'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEMPLATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('template'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TABINDEX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('tabindex'), ALL_NO_PREFIX, ALL_NCNAME, false);
  READONLY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('readonly'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SELECTED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('selected'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROWLINES = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rowlines'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SEAMLESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('seamless'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROWALIGN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rowalign'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STRETCHY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stretchy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REQUIRED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('required'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XML_BASE = $AttributeName(new AttributeName(), XML_NS, COLONIFIED_LOCAL('xml:base', 'base'), XML_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  XML_LANG = $AttributeName(new AttributeName(), XML_NS, COLONIFIED_LOCAL('xml:lang', 'lang'), XML_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  X_HEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('x-height'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_OWNS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-owns'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AUTOFOCUS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('autofocus'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_SORT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-sort'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACCESSKEY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accesskey'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_BUSY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-busy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_GRAB = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-grab'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AMPLITUDE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('amplitude'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_LIVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-live'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLIP_RULE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('clip-rule'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLIP_PATH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('clip-path'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EQUALROWS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('equalrows'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ELEVATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('elevation'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DIRECTION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('direction'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DRAGGABLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('draggable'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILTERRES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('filterres', 'filterRes'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILL_RULE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fill-rule'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONTSTYLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fontstyle'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_SIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-size'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KEYPOINTS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('keypoints', 'keyPoints'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HIDEFOCUS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('hidefocus'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMESSAGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmessage'), ALL_NO_PREFIX, ALL_NCNAME, false);
  INTERCEPT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('intercept'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGEND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragend'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOVEEND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmoveend'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONINVALID = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oninvalid'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONKEYDOWN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onkeydown'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFOCUSIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onfocusin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEUP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmouseup'), ALL_NO_PREFIX, ALL_NCNAME, false);
  INPUTMODE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('inputmode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONROWEXIT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onrowexit'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MATHCOLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mathcolor'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MASKUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('maskunits', 'maskUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MAXLENGTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('maxlength'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LINEBREAK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('linebreak'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LOOPSTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('loopstart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TRANSFORM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('transform'), ALL_NO_PREFIX, ALL_NCNAME, false);
  V_HANGING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('v-hanging'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VALUETYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('valuetype'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POINTSATZ = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('pointsatz', 'pointsAtZ'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POINTSATX = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('pointsatx', 'pointsAtX'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POINTSATY = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('pointsaty', 'pointsAtY'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PLAYCOUNT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('playcount'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SYMMETRIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('symmetric'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCROLLING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scrolling'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEATDUR = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('repeatdur', 'repeatDur'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SELECTION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('selection'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SEPARATOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('separator'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XML_SPACE = $AttributeName(new AttributeName(), XML_NS, COLONIFIED_LOCAL('xml:space', 'space'), XML_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  AUTOSUBMIT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('autosubmit'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALPHABETIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alphabetic'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACTIONTYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('actiontype'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACCUMULATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accumulate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_LEVEL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-level'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLUMNSPAN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('columnspan'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CAP_HEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cap-height'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BACKGROUND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('background'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GLYPH_NAME = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('glyph-name'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GROUPALIGN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('groupalign'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONTFAMILY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fontfamily'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONTWEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fontweight'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_STYLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-style'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KEYSPLINES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('keysplines', 'keySplines'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HTTP_EQUIV = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('http-equiv'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONACTIVATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onactivate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OCCURRENCE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('occurrence'), ALL_NO_PREFIX, ALL_NCNAME, false);
  IRRELEVANT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('irrelevant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDBLCLICK = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondblclick'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGDROP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragdrop'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONKEYPRESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onkeypress'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONROWENTER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onrowenter'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGOVER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragover'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFOCUSOUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onfocusout'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEOUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmouseout'), ALL_NO_PREFIX, ALL_NCNAME, false);
  NUMOCTAVES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('numoctaves', 'numOctaves'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKER_MID = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('marker-mid'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKER_END = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('marker-end'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEXTLENGTH = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('textlength', 'textLength'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VISIBILITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('visibility'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VIEWTARGET = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('viewtarget', 'viewTarget'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERT_ADV_Y = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('vert-adv-y'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATHLENGTH = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('pathlength', 'pathLength'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEAT_MAX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('repeat-max'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RADIOGROUP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('radiogroup'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STOP_COLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stop-color'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SEPARATORS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('separators'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEAT_MIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('repeat-min'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ROWSPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rowspacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ZOOMANDPAN = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('zoomandpan', 'zoomAndPan'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XLINK_TYPE = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:type', 'type'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  XLINK_ROLE = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:role', 'role'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  XLINK_HREF = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:href', 'href'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  XLINK_SHOW = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:show', 'show'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  ACCENTUNDER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accentunder'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_SECRET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-secret'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_ATOMIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-atomic'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_HIDDEN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-hidden'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_FLOWTO = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-flowto'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARABIC_FORM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('arabic-form'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CELLPADDING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cellpadding'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CELLSPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('cellspacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLUMNWIDTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('columnwidth'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLUMNALIGN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('columnalign'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLUMNLINES = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('columnlines'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTEXTMENU = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('contextmenu'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BASEPROFILE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('baseprofile', 'baseProfile'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_FAMILY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-family'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FRAMEBORDER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('frameborder'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILTERUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('filterunits', 'filterUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FLOOD_COLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('flood-color'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_WEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-weight'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HORIZ_ADV_X = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('horiz-adv-x'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGLEAVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragleave'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEMOVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmousemove'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ORIENTATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('orientation'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEDOWN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmousedown'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEOVER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmouseover'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGENTER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragenter'), ALL_NO_PREFIX, ALL_NCNAME, false);
  IDEOGRAPHIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ideographic'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFORECUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforecut'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFORMINPUT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onforminput'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDRAGSTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondragstart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOVESTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmovestart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKERUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('markerunits', 'markerUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MATHVARIANT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mathvariant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARGINWIDTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('marginwidth'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKERWIDTH = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('markerwidth', 'markerWidth'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEXT_ANCHOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('text-anchor'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TABLEVALUES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('tablevalues', 'tableValues'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCRIPTLEVEL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scriptlevel'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEATCOUNT = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('repeatcount', 'repeatCount'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STITCHTILES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('stitchtiles', 'stitchTiles'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STARTOFFSET = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('startoffset', 'startOffset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCROLLDELAY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scrolldelay'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XMLNS_XLINK = $AttributeName(new AttributeName(), XMLNS_NS, COLONIFIED_LOCAL('xmlns:xlink', 'xlink'), XMLNS_PREFIX, initValues(_3Z_classLit, 0, -1, [false, false, false, false]), true);
  XLINK_TITLE = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:title', 'title'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  ARIA_INVALID = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-invalid'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_PRESSED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-pressed'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_CHECKED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-checked'), ALL_NO_PREFIX, ALL_NCNAME, false);
  AUTOCOMPLETE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('autocomplete'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_SETSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-setsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_CHANNEL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-channel'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EQUALCOLUMNS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('equalcolumns'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DISPLAYSTYLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('displaystyle'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DATAFORMATAS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dataformatas'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FILL_OPACITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('fill-opacity'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_VARIANT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-variant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_STRETCH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-stretch'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FRAMESPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('framespacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KERNELMATRIX = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('kernelmatrix', 'kernelMatrix'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDEACTIVATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondeactivate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONROWSDELETE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onrowsdelete'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSELEAVE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmouseleave'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFORMCHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onformchange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCELLCHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oncellchange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEWHEEL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmousewheel'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONMOUSEENTER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onmouseenter'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONAFTERPRINT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onafterprint'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFORECOPY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforecopy'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARGINHEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('marginheight'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKERHEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('markerheight', 'markerHeight'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MARKER_START = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('marker-start'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MATHEMATICAL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mathematical'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LENGTHADJUST = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('lengthadjust', 'lengthAdjust'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNSELECTABLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('unselectable'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNICODE_BIDI = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('unicode-bidi'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNITS_PER_EM = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('units-per-em'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WORD_SPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('word-spacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  WRITING_MODE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('writing-mode'), ALL_NO_PREFIX, ALL_NCNAME, false);
  V_ALPHABETIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('v-alphabetic'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATTERNUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('patternunits', 'patternUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPREADMETHOD = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('spreadmethod', 'spreadMethod'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SURFACESCALE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('surfacescale', 'surfaceScale'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_WIDTH = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-width'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEAT_START = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('repeat-start'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STDDEVIATION = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('stddeviation', 'stdDeviation'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STOP_OPACITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stop-opacity'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_CONTROLS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-controls'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_HASPOPUP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-haspopup'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ACCENT_HEIGHT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accent-height'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_VALUENOW = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-valuenow'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_RELEVANT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-relevant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_POSINSET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-posinset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_VALUEMAX = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-valuemax'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_READONLY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-readonly'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_SELECTED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-selected'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_REQUIRED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-required'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_EXPANDED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-expanded'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_DISABLED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-disabled'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ATTRIBUTETYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('attributetype', 'attributeType'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ATTRIBUTENAME = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('attributename', 'attributeName'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_DATATYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-datatype'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_VALUEMIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-valuemin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BASEFREQUENCY = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('basefrequency', 'baseFrequency'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLUMNSPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('columnspacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLOR_PROFILE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('color-profile'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CLIPPATHUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('clippathunits', 'clipPathUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DEFINITIONURL = $AttributeName(new AttributeName(), ALL_NO_NS, (arr_32 = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 4, 0) , arr_32[0] = 'definitionurl' , arr_32[1] = 'definitionURL' , arr_32[2] = 'definitionurl' , arr_32[3] = 'definitionurl' , arr_32), ALL_NO_PREFIX, ALL_NCNAME, false);
  GRADIENTUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('gradientunits', 'gradientUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FLOOD_OPACITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('flood-opacity'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONAFTERUPDATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onafterupdate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONERRORUPDATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onerrorupdate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREPASTE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforepaste'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONLOSECAPTURE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onlosecapture'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCONTEXTMENU = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oncontextmenu'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONSELECTSTART = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onselectstart'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREPRINT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforeprint'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MOVABLELIMITS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('movablelimits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LINETHICKNESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('linethickness'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNICODE_RANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('unicode-range'), ALL_NO_PREFIX, ALL_NCNAME, false);
  THINMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('thinmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERT_ORIGIN_X = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('vert-origin-x'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERT_ORIGIN_Y = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('vert-origin-y'), ALL_NO_PREFIX, ALL_NCNAME, false);
  V_IDEOGRAPHIC = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('v-ideographic'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PRESERVEALPHA = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('preservealpha', 'preserveAlpha'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCRIPTMINSIZE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scriptminsize'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPECIFICATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('specification'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XLINK_ACTUATE = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:actuate', 'actuate'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  XLINK_ARCROLE = $AttributeName(new AttributeName(), XLINK_NS, COLONIFIED_LOCAL('xlink:arcrole', 'arcrole'), XLINK_PREFIX, initValues(_3Z_classLit, 0, -1, [false, true, true, false]), false);
  ACCEPT_CHARSET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('accept-charset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALIGNMENTSCOPE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alignmentscope'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_MULTILINE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-multiline'), ALL_NO_PREFIX, ALL_NCNAME, false);
  BASELINE_SHIFT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('baseline-shift'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HORIZ_ORIGIN_X = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('horiz-origin-x'), ALL_NO_PREFIX, ALL_NCNAME, false);
  HORIZ_ORIGIN_Y = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('horiz-origin-y'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREUPDATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforeupdate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONFILTERCHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onfilterchange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONROWSINSERTED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onrowsinserted'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREUNLOAD = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforeunload'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MATHBACKGROUND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mathbackground'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LETTER_SPACING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('letter-spacing'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LIGHTING_COLOR = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('lighting-color'), ALL_NO_PREFIX, ALL_NCNAME, false);
  THICKMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('thickmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEXT_RENDERING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('text-rendering'), ALL_NO_PREFIX, ALL_NCNAME, false);
  V_MATHEMATICAL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('v-mathematical'), ALL_NO_PREFIX, ALL_NCNAME, false);
  POINTER_EVENTS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('pointer-events'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PRIMITIVEUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('primitiveunits', 'primitiveUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SYSTEMLANGUAGE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('systemlanguage', 'systemLanguage'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_LINECAP = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-linecap'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SUBSCRIPTSHIFT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('subscriptshift'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_OPACITY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-opacity'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_DROPEFFECT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-dropeffect'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_LABELLEDBY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-labelledby'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_TEMPLATEID = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-templateid'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLOR_RENDERING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('color-rendering'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTENTEDITABLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('contenteditable'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DIFFUSECONSTANT = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('diffuseconstant', 'diffuseConstant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDATAAVAILABLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondataavailable'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONCONTROLSELECT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('oncontrolselect'), ALL_NO_PREFIX, ALL_NCNAME, false);
  IMAGE_RENDERING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('image-rendering'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MEDIUMMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('mediummathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  TEXT_DECORATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('text-decoration'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SHAPE_RENDERING = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('shape-rendering'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_LINEJOIN = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-linejoin'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REPEAT_TEMPLATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('repeat-template'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_DESCRIBEDBY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-describedby'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTENTSTYLETYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('contentstyletype', 'contentStyleType'), ALL_NO_PREFIX, ALL_NCNAME, false);
  FONT_SIZE_ADJUST = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('font-size-adjust'), ALL_NO_PREFIX, ALL_NCNAME, false);
  KERNELUNITLENGTH = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('kernelunitlength', 'kernelUnitLength'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREACTIVATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforeactivate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONPROPERTYCHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onpropertychange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDATASETCHANGED = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondatasetchanged'), ALL_NO_PREFIX, ALL_NCNAME, false);
  MASKCONTENTUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('maskcontentunits', 'maskContentUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATTERNTRANSFORM = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('patterntransform', 'patternTransform'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REQUIREDFEATURES = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('requiredfeatures', 'requiredFeatures'), ALL_NO_PREFIX, ALL_NCNAME, false);
  RENDERING_INTENT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('rendering-intent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPECULAREXPONENT = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('specularexponent', 'specularExponent'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SPECULARCONSTANT = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('specularconstant', 'specularConstant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SUPERSCRIPTSHIFT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('superscriptshift'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_DASHARRAY = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-dasharray'), ALL_NO_PREFIX, ALL_NCNAME, false);
  XCHANNELSELECTOR = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('xchannelselector', 'xChannelSelector'), ALL_NO_PREFIX, ALL_NCNAME, false);
  YCHANNELSELECTOR = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('ychannelselector', 'yChannelSelector'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_AUTOCOMPLETE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-autocomplete'), ALL_NO_PREFIX, ALL_NCNAME, false);
  CONTENTSCRIPTTYPE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('contentscripttype', 'contentScriptType'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ENABLE_BACKGROUND = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('enable-background'), ALL_NO_PREFIX, ALL_NCNAME, false);
  DOMINANT_BASELINE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('dominant-baseline'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GRADIENTTRANSFORM = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('gradienttransform', 'gradientTransform'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFORDEACTIVATE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbefordeactivate'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONDATASETCOMPLETE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('ondatasetcomplete'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OVERLINE_POSITION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('overline-position'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONBEFOREEDITFOCUS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onbeforeeditfocus'), ALL_NO_PREFIX, ALL_NCNAME, false);
  LIMITINGCONEANGLE = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('limitingconeangle', 'limitingConeAngle'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERYTHINMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('verythinmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_DASHOFFSET = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-dashoffset'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STROKE_MITERLIMIT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('stroke-miterlimit'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ALIGNMENT_BASELINE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('alignment-baseline'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ONREADYSTATECHANGE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('onreadystatechange'), ALL_NO_PREFIX, ALL_NCNAME, false);
  OVERLINE_THICKNESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('overline-thickness'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNDERLINE_POSITION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('underline-position'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERYTHICKMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('verythickmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  REQUIREDEXTENSIONS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('requiredextensions', 'requiredExtensions'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLOR_INTERPOLATION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('color-interpolation'), ALL_NO_PREFIX, ALL_NCNAME, false);
  UNDERLINE_THICKNESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('underline-thickness'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PRESERVEASPECTRATIO = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('preserveaspectratio', 'preserveAspectRatio'), ALL_NO_PREFIX, ALL_NCNAME, false);
  PATTERNCONTENTUNITS = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('patterncontentunits', 'patternContentUnits'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_MULTISELECTABLE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-multiselectable'), ALL_NO_PREFIX, ALL_NCNAME, false);
  SCRIPTSIZEMULTIPLIER = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('scriptsizemultiplier'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ARIA_ACTIVEDESCENDANT = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('aria-activedescendant'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERYVERYTHINMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('veryverythinmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  VERYVERYTHICKMATHSPACE = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('veryverythickmathspace'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STRIKETHROUGH_POSITION = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('strikethrough-position'), ALL_NO_PREFIX, ALL_NCNAME, false);
  STRIKETHROUGH_THICKNESS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('strikethrough-thickness'), ALL_NO_PREFIX, ALL_NCNAME, false);
  EXTERNALRESOURCESREQUIRED = $AttributeName(new AttributeName(), ALL_NO_NS, SVG_DIFFERENT('externalresourcesrequired', 'externalResourcesRequired'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GLYPH_ORIENTATION_VERTICAL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('glyph-orientation-vertical'), ALL_NO_PREFIX, ALL_NCNAME, false);
  COLOR_INTERPOLATION_FILTERS = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('color-interpolation-filters'), ALL_NO_PREFIX, ALL_NCNAME, false);
  GLYPH_ORIENTATION_HORIZONTAL = $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL('glyph-orientation-horizontal'), ALL_NO_PREFIX, ALL_NCNAME, false);
  ATTRIBUTE_NAMES = initValues(_3Lnu_validator_htmlparser_impl_AttributeName_2_classLit, 49, 9, [D, K, R, X, Y, Z, BY, CX, CY, DX, DY, G2, G1, FX, FY, K4, K2, K3, K1, ID, IN, U2, U1, RT, RX, RY, TO, Y2, Y1, X1, X2, ALT, DIR, DUR, END, FOR, IN2, MAX, MIN, LOW, REL, REV, SRC, AXIS, ABBR, BBOX, CITE, CODE, BIAS, COLS, CLIP, CHAR, BASE, EDGE, DATA, FILL, FROM, FORM, FACE, HIGH, HREF, OPEN, ICON, NAME, MODE, MASK, LINK, LANG, LIST, TYPE, WHEN, WRAP, TEXT, PATH, PING, REFX, REFY, SIZE, SEED, ROWS, SPAN, STEP, ROLE, XREF, ASYNC, ALINK, ALIGN, CLOSE, COLOR, CLASS, CLEAR, BEGIN, DEPTH, DEFER, FENCE, FRAME, ISMAP, ONEND, INDEX, ORDER, OTHER, ONCUT, NARGS, MEDIA, LABEL, LOCAL, WIDTH, TITLE, VLINK, VALUE, SLOPE, SHAPE, SCOPE, SCALE, SPEED, STYLE, RULES, STEMH, STEMV, START, XMLNS, ACCEPT, ACCENT, ASCENT, ACTIVE, ALTIMG, ACTION, BORDER, CURSOR, COORDS, FILTER, FORMAT, HIDDEN, HSPACE, HEIGHT, ONMOVE, ONLOAD, ONDRAG, ORIGIN, ONZOOM, ONHELP, ONSTOP, ONDROP, ONBLUR, OBJECT, OFFSET, ORIENT, ONCOPY, NOWRAP, NOHREF, MACROS, METHOD, LOWSRC, LSPACE, LQUOTE, USEMAP, WIDTHS, TARGET, VALUES, VALIGN, VSPACE, POSTER, POINTS, PROMPT, SCOPED, STRING, SCHEME, STROKE, RADIUS, RESULT, REPEAT, RSPACE, ROTATE, RQUOTE, ALTTEXT, ARCHIVE, AZIMUTH, CLOSURE, CHECKED, CLASSID, CHAROFF, BGCOLOR, COLSPAN, CHARSET, COMPACT, CONTENT, ENCTYPE, DATASRC, DATAFLD, DECLARE, DISPLAY, DIVISOR, DEFAULT, DESCENT, KERNING, HANGING, HEADERS, ONPASTE, ONCLICK, OPTIMUM, ONBEGIN, ONKEYUP, ONFOCUS, ONERROR, ONINPUT, ONABORT, ONSTART, ONRESET, OPACITY, NOSHADE, MINSIZE, MAXSIZE, LOOPEND, LARGEOP, UNICODE, TARGETX, TARGETY, VIEWBOX, VERSION, PATTERN, PROFILE, SPACING, RESTART, ROWSPAN, SANDBOX, SUMMARY, STANDBY, REPLACE, AUTOPLAY, ADDITIVE, CALCMODE, CODETYPE, CODEBASE, CONTROLS, BEVELLED, BASELINE, EXPONENT, EDGEMODE, ENCODING, GLYPHREF, DATETIME, DISABLED, FONTSIZE, KEYTIMES, PANOSE_1, HREFLANG, ONRESIZE, ONCHANGE, ONBOUNCE, ONUNLOAD, ONFINISH, ONSCROLL, OPERATOR, OVERFLOW, ONSUBMIT, ONREPEAT, ONSELECT, NOTATION, NORESIZE, MANIFEST, MATHSIZE, MULTIPLE, LONGDESC, LANGUAGE, TEMPLATE, TABINDEX, READONLY, SELECTED, ROWLINES, SEAMLESS, ROWALIGN, STRETCHY, REQUIRED, XML_BASE, XML_LANG, X_HEIGHT, ARIA_OWNS, AUTOFOCUS, ARIA_SORT, ACCESSKEY, ARIA_BUSY, ARIA_GRAB, AMPLITUDE, ARIA_LIVE, CLIP_RULE, CLIP_PATH, EQUALROWS, ELEVATION, DIRECTION, DRAGGABLE, FILTERRES, FILL_RULE, FONTSTYLE, FONT_SIZE, KEYPOINTS, HIDEFOCUS, ONMESSAGE, INTERCEPT, ONDRAGEND, ONMOVEEND, ONINVALID, ONKEYDOWN, ONFOCUSIN, ONMOUSEUP, INPUTMODE, ONROWEXIT, MATHCOLOR, MASKUNITS, MAXLENGTH, LINEBREAK, LOOPSTART, TRANSFORM, V_HANGING, VALUETYPE, POINTSATZ, POINTSATX, POINTSATY, PLAYCOUNT, SYMMETRIC, SCROLLING, REPEATDUR, SELECTION, SEPARATOR, XML_SPACE, AUTOSUBMIT, ALPHABETIC, ACTIONTYPE, ACCUMULATE, ARIA_LEVEL, COLUMNSPAN, CAP_HEIGHT, BACKGROUND, GLYPH_NAME, GROUPALIGN, FONTFAMILY, FONTWEIGHT, FONT_STYLE, KEYSPLINES, HTTP_EQUIV, ONACTIVATE, OCCURRENCE, IRRELEVANT, ONDBLCLICK, ONDRAGDROP, ONKEYPRESS, ONROWENTER, ONDRAGOVER, ONFOCUSOUT, ONMOUSEOUT, NUMOCTAVES, MARKER_MID, MARKER_END, TEXTLENGTH, VISIBILITY, VIEWTARGET, VERT_ADV_Y, PATHLENGTH, REPEAT_MAX, RADIOGROUP, STOP_COLOR, SEPARATORS, REPEAT_MIN, ROWSPACING, ZOOMANDPAN, XLINK_TYPE, XLINK_ROLE, XLINK_HREF, XLINK_SHOW, ACCENTUNDER, ARIA_SECRET, ARIA_ATOMIC, ARIA_HIDDEN, ARIA_FLOWTO, ARABIC_FORM, CELLPADDING, CELLSPACING, COLUMNWIDTH, COLUMNALIGN, COLUMNLINES, CONTEXTMENU, BASEPROFILE, FONT_FAMILY, FRAMEBORDER, FILTERUNITS, FLOOD_COLOR, FONT_WEIGHT, HORIZ_ADV_X, ONDRAGLEAVE, ONMOUSEMOVE, ORIENTATION, ONMOUSEDOWN, ONMOUSEOVER, ONDRAGENTER, IDEOGRAPHIC, ONBEFORECUT, ONFORMINPUT, ONDRAGSTART, ONMOVESTART, MARKERUNITS, MATHVARIANT, MARGINWIDTH, MARKERWIDTH, TEXT_ANCHOR, TABLEVALUES, SCRIPTLEVEL, REPEATCOUNT, STITCHTILES, STARTOFFSET, SCROLLDELAY, XMLNS_XLINK, XLINK_TITLE, ARIA_INVALID, ARIA_PRESSED, ARIA_CHECKED, AUTOCOMPLETE, ARIA_SETSIZE, ARIA_CHANNEL, EQUALCOLUMNS, DISPLAYSTYLE, DATAFORMATAS, FILL_OPACITY, FONT_VARIANT, FONT_STRETCH, FRAMESPACING, KERNELMATRIX, ONDEACTIVATE, ONROWSDELETE, ONMOUSELEAVE, ONFORMCHANGE, ONCELLCHANGE, ONMOUSEWHEEL, ONMOUSEENTER, ONAFTERPRINT, ONBEFORECOPY, MARGINHEIGHT, MARKERHEIGHT, MARKER_START, MATHEMATICAL, LENGTHADJUST, UNSELECTABLE, UNICODE_BIDI, UNITS_PER_EM, WORD_SPACING, WRITING_MODE, V_ALPHABETIC, PATTERNUNITS, SPREADMETHOD, SURFACESCALE, STROKE_WIDTH, REPEAT_START, STDDEVIATION, STOP_OPACITY, ARIA_CONTROLS, ARIA_HASPOPUP, ACCENT_HEIGHT, ARIA_VALUENOW, ARIA_RELEVANT, ARIA_POSINSET, ARIA_VALUEMAX, ARIA_READONLY, ARIA_SELECTED, ARIA_REQUIRED, ARIA_EXPANDED, ARIA_DISABLED, ATTRIBUTETYPE, ATTRIBUTENAME, ARIA_DATATYPE, ARIA_VALUEMIN, BASEFREQUENCY, COLUMNSPACING, COLOR_PROFILE, CLIPPATHUNITS, DEFINITIONURL, GRADIENTUNITS, FLOOD_OPACITY, ONAFTERUPDATE, ONERRORUPDATE, ONBEFOREPASTE, ONLOSECAPTURE, ONCONTEXTMENU, ONSELECTSTART, ONBEFOREPRINT, MOVABLELIMITS, LINETHICKNESS, UNICODE_RANGE, THINMATHSPACE, VERT_ORIGIN_X, VERT_ORIGIN_Y, V_IDEOGRAPHIC, PRESERVEALPHA, SCRIPTMINSIZE, SPECIFICATION, XLINK_ACTUATE, XLINK_ARCROLE, ACCEPT_CHARSET, ALIGNMENTSCOPE, ARIA_MULTILINE, BASELINE_SHIFT, HORIZ_ORIGIN_X, HORIZ_ORIGIN_Y, ONBEFOREUPDATE, ONFILTERCHANGE, ONROWSINSERTED, ONBEFOREUNLOAD, MATHBACKGROUND, LETTER_SPACING, LIGHTING_COLOR, THICKMATHSPACE, TEXT_RENDERING, V_MATHEMATICAL, POINTER_EVENTS, PRIMITIVEUNITS, SYSTEMLANGUAGE, STROKE_LINECAP, SUBSCRIPTSHIFT, STROKE_OPACITY, ARIA_DROPEFFECT, ARIA_LABELLEDBY, ARIA_TEMPLATEID, COLOR_RENDERING, CONTENTEDITABLE, DIFFUSECONSTANT, ONDATAAVAILABLE, ONCONTROLSELECT, IMAGE_RENDERING, MEDIUMMATHSPACE, TEXT_DECORATION, SHAPE_RENDERING, STROKE_LINEJOIN, REPEAT_TEMPLATE, ARIA_DESCRIBEDBY, CONTENTSTYLETYPE, FONT_SIZE_ADJUST, KERNELUNITLENGTH, ONBEFOREACTIVATE, ONPROPERTYCHANGE, ONDATASETCHANGED, MASKCONTENTUNITS, PATTERNTRANSFORM, REQUIREDFEATURES, RENDERING_INTENT, SPECULAREXPONENT, SPECULARCONSTANT, SUPERSCRIPTSHIFT, STROKE_DASHARRAY, XCHANNELSELECTOR, YCHANNELSELECTOR, ARIA_AUTOCOMPLETE, CONTENTSCRIPTTYPE, ENABLE_BACKGROUND, DOMINANT_BASELINE, GRADIENTTRANSFORM, ONBEFORDEACTIVATE, ONDATASETCOMPLETE, OVERLINE_POSITION, ONBEFOREEDITFOCUS, LIMITINGCONEANGLE, VERYTHINMATHSPACE, STROKE_DASHOFFSET, STROKE_MITERLIMIT, ALIGNMENT_BASELINE, ONREADYSTATECHANGE, OVERLINE_THICKNESS, UNDERLINE_POSITION, VERYTHICKMATHSPACE, REQUIREDEXTENSIONS, COLOR_INTERPOLATION, UNDERLINE_THICKNESS, PRESERVEASPECTRATIO, PATTERNCONTENTUNITS, ARIA_MULTISELECTABLE, SCRIPTSIZEMULTIPLIER, ARIA_ACTIVEDESCENDANT, VERYVERYTHINMATHSPACE, VERYVERYTHICKMATHSPACE, STRIKETHROUGH_POSITION, STRIKETHROUGH_THICKNESS, EXTERNALRESOURCESREQUIRED, GLYPH_ORIENTATION_VERTICAL, COLOR_INTERPOLATION_FILTERS, GLYPH_ORIENTATION_HORIZONTAL]);
  ATTRIBUTE_HASHES = initValues(_3I_classLit, 0, -1, [1153, 1383, 1601, 1793, 1827, 1857, 68600, 69146, 69177, 70237, 70270, 71572, 71669, 72415, 72444, 74846, 74904, 74943, 75001, 75276, 75590, 84742, 84839, 85575, 85963, 85992, 87204, 88074, 88171, 89130, 89163, 3207892, 3283895, 3284791, 3338752, 3358197, 3369562, 3539124, 3562402, 3574260, 3670335, 3696933, 3721879, 135280021, 135346322, 136317019, 136475749, 136548517, 136652214, 136884919, 136902418, 136942992, 137292068, 139120259, 139785574, 142250603, 142314056, 142331176, 142519584, 144752417, 145106895, 146147200, 146765926, 148805544, 149655723, 149809441, 150018784, 150445028, 150923321, 152528754, 152536216, 152647366, 152962785, 155219321, 155654904, 157317483, 157350248, 157437941, 157447478, 157604838, 157685404, 157894402, 158315188, 166078431, 169409980, 169700259, 169856932, 170007032, 170409695, 170466488, 170513710, 170608367, 173028944, 173896963, 176090625, 176129212, 179390001, 179489057, 179627464, 179840468, 179849042, 180004216, 181779081, 183027151, 183645319, 183698797, 185922012, 185997252, 188312483, 188675799, 190977533, 190992569, 191006194, 191033518, 191038774, 191096249, 191166163, 191194426, 191522106, 191568039, 200104642, 202506661, 202537381, 202602917, 203070590, 203120766, 203389054, 203690071, 203971238, 203986524, 209040857, 209125756, 212055489, 212322418, 212746849, 213002877, 213055164, 213088023, 213259873, 213273386, 213435118, 213437318, 213438231, 213493071, 213532268, 213542834, 213584431, 213659891, 215285828, 215880731, 216112976, 216684637, 217369699, 217565298, 217576549, 218186795, 219743185, 220082234, 221623802, 221986406, 222283890, 223089542, 223138630, 223311265, 224547358, 224587256, 224589550, 224655650, 224785518, 224810917, 224813302, 225429618, 225432950, 225440869, 236107233, 236709921, 236838947, 237117095, 237143271, 237172455, 237209953, 237354143, 237372743, 237668065, 237703073, 237714273, 239743521, 240512803, 240522627, 240560417, 240656513, 241015715, 241062755, 241065383, 243523041, 245865199, 246261793, 246556195, 246774817, 246923491, 246928419, 246981667, 247014847, 247058369, 247112833, 247118177, 247119137, 247128739, 247316903, 249533729, 250235623, 250269543, 251083937, 251402351, 252339047, 253260911, 253293679, 254844367, 255547879, 256077281, 256345377, 258124199, 258354465, 258605063, 258744193, 258845603, 258856961, 258926689, 269869248, 270174334, 270709417, 270778994, 270781796, 271102503, 271478858, 271490090, 272870654, 273335275, 273369140, 273924313, 274108530, 274116736, 276818662, 277476156, 279156579, 279349675, 280108533, 280128712, 280132869, 280162403, 280280292, 280413430, 280506130, 280677397, 280678580, 280686710, 280689066, 282736758, 283110901, 283275116, 283823226, 283890012, 284479340, 284606461, 286700477, 286798916, 291557706, 291665349, 291804100, 292138018, 292166446, 292418738, 292451039, 300298041, 300374839, 300597935, 303073389, 303083839, 303266673, 303354997, 303430688, 303576261, 303724281, 303819694, 304242723, 304382625, 306247792, 307227811, 307468786, 307724489, 309671175, 310252031, 310358241, 310373094, 311015256, 313357609, 313683893, 313701861, 313706996, 313707317, 313710350, 314027746, 314038181, 314091299, 314205627, 314233813, 316741830, 316797986, 317486755, 317794164, 318721061, 320076137, 322657125, 322887778, 323506876, 323572412, 323605180, 323938869, 325060058, 325320188, 325398738, 325541490, 325671619, 333868843, 336806130, 337212108, 337282686, 337285434, 337585223, 338036037, 338298087, 338566051, 340943551, 341190970, 342995704, 343352124, 343912673, 344585053, 346977248, 347218098, 347262163, 347278576, 347438191, 347655959, 347684788, 347726430, 347727772, 347776035, 347776629, 349500753, 350880161, 350887073, 353384123, 355496998, 355906922, 355979793, 356545959, 358637867, 358905016, 359164318, 359247286, 359350571, 359579447, 365560330, 367399355, 367420285, 367510727, 368013212, 370234760, 370353345, 370710317, 371074566, 371122285, 371194213, 371448425, 371448430, 371545055, 371596922, 371758751, 371964792, 372151328, 376550136, 376710172, 376795771, 376826271, 376906556, 380514830, 380774774, 380775037, 381030322, 381136500, 381281631, 381282269, 381285504, 381330595, 381331422, 381335911, 381336484, 383907298, 383917408, 384595009, 384595013, 387799894, 387823201, 392581647, 392584937, 392742684, 392906485, 393003349, 400644707, 400973830, 404428547, 404432113, 404432865, 404469244, 404478897, 404694860, 406887479, 408294949, 408789955, 410022510, 410467324, 410586448, 410945965, 411845275, 414327152, 414327932, 414329781, 414346257, 414346439, 414639928, 414835998, 414894517, 414986533, 417465377, 417465381, 417492216, 418259232, 419310946, 420103495, 420242342, 420380455, 420658662, 420717432, 423183880, 424539259, 425929170, 425972964, 426050649, 426126450, 426142833, 426607922, 437289840, 437347469, 437412335, 437423943, 437455540, 437462252, 437597991, 437617485, 437986305, 437986507, 437986828, 437987072, 438015591, 438034813, 438038966, 438179623, 438347971, 438483573, 438547062, 438895551, 441592676, 442032555, 443548979, 447881379, 447881655, 447881895, 447887844, 448416189, 448445746, 448449012, 450942191, 452816744, 453668677, 454434495, 456610076, 456642844, 456738709, 457544600, 459451897, 459680944, 468058810, 468083581, 470964084, 471470955, 471567278, 472267822, 481177859, 481210627, 481435874, 481455115, 481485378, 481490218, 485105638, 486005878, 486383494, 487988916, 488103783, 490661867, 491574090, 491578272, 493041952, 493441205, 493582844, 493716979, 504577572, 504740359, 505091638, 505592418, 505656212, 509516275, 514998531, 515571132, 515594682, 518712698, 521362273, 526592419, 526807354, 527348842, 538294791, 539214049, 544689535, 545535009, 548544752, 548563346, 548595116, 551679010, 558034099, 560329411, 560356209, 560671018, 560671152, 560692590, 560845442, 569212097, 569474241, 572252718, 572768481, 575326764, 576174758, 576190819, 582099184, 582099438, 582372519, 582558889, 586552164, 591325418, 594231990, 594243961, 605711268, 615672071, 616086845, 621792370, 624879850, 627432831, 640040548, 654392808, 658675477, 659420283, 672891587, 694768102, 705890982, 725543146, 759097578, 761686526, 795383908, 843809551, 878105336, 908643300, 945213471]);
}

function $AttributeName_0(this$static, uri, local, prefix, ncname, xmlns){
  $clinit_87();
  this$static.uri = uri;
  this$static.local = local;
  COMPUTE_QNAME(local, prefix);
  this$static.ncname = ncname;
  this$static.xmlns = xmlns;
  return this$static;
}

function $AttributeName(this$static, uri, local, prefix, ncname, xmlns){
  $clinit_87();
  this$static.uri = uri;
  this$static.local = local;
  COMPUTE_QNAME(local, prefix);
  this$static.ncname = ncname;
  this$static.xmlns = xmlns;
  return this$static;
}

function $isBoolean(this$static){
  return this$static == ACTIVE || this$static == ASYNC || this$static == AUTOFOCUS || this$static == AUTOSUBMIT || this$static == CHECKED || this$static == COMPACT || this$static == DECLARE || this$static == DEFAULT || this$static == DEFER || this$static == DISABLED || this$static == ISMAP || this$static == MULTIPLE || this$static == NOHREF || this$static == NORESIZE || this$static == NOSHADE || this$static == NOWRAP || this$static == READONLY || this$static == REQUIRED || this$static == SELECTED;
}

function $isCaseFolded(this$static){
  return this$static == ACTIVE || this$static == ALIGN || this$static == ASYNC || this$static == AUTOCOMPLETE || this$static == AUTOFOCUS || this$static == AUTOSUBMIT || this$static == CHECKED || this$static == CLEAR || this$static == COMPACT || this$static == DATAFORMATAS || this$static == DECLARE || this$static == DEFAULT || this$static == DEFER || this$static == DIR || this$static == DISABLED || this$static == ENCTYPE || this$static == FRAME || this$static == ISMAP || this$static == METHOD || this$static == MULTIPLE || this$static == NOHREF || this$static == NORESIZE || this$static == NOSHADE || this$static == NOWRAP || this$static == READONLY || this$static == REPLACE || this$static == REQUIRED || this$static == RULES || this$static == SCOPE || this$static == SCROLLING || this$static == SELECTED || this$static == SHAPE || this$static == STEP || this$static == TYPE || this$static == VALIGN || this$static == VALUETYPE;
}

function COLONIFIED_LOCAL(name, suffix){
  var arr;
  arr = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 4, 0);
  arr[0] = name;
  arr[1] = suffix;
  arr[2] = suffix;
  arr[3] = name;
  return arr;
}

function COMPUTE_QNAME(local, prefix){
  var arr, i;
  arr = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 4, 0);
  for (i = 0; i < arr.length; ++i) {
    if (prefix[i] == null) {
      arr[i] = local[i];
    }
     else {
      arr[i] = String(prefix[i] + ':' + local[i]);
    }
  }
  return arr;
}

function SAME_LOCAL(name){
  var arr;
  arr = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 4, 0);
  arr[0] = name;
  arr[1] = name;
  arr[2] = name;
  arr[3] = name;
  return arr;
}

function SVG_DIFFERENT(name, camel){
  var arr;
  arr = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 4, 0);
  arr[0] = name;
  arr[1] = name;
  arr[2] = camel;
  arr[3] = name;
  return arr;
}

function bufToHash(buf, len){
  var hash, hash2, i, j;
  hash2 = 0;
  hash = len;
  hash <<= 5;
  hash += buf[0] - 96;
  j = len;
  for (i = 0; i < 4 && j > 0; ++i) {
    --j;
    hash <<= 5;
    hash += buf[j] - 96;
    hash2 <<= 6;
    hash2 += buf[i] - 95;
  }
  return hash ^ hash2;
}

function createAttributeName(name, checkNcName){
  var ncName, xmlns;
  ncName = true;
  xmlns = name.indexOf('xmlns:') == 0;
  if (checkNcName) {
    if (xmlns) {
      ncName = false;
    }
     else {
      ncName = isNCName(name);
    }
  }
  return $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL(name), ALL_NO_PREFIX, ncName?ALL_NCNAME:ALL_NO_NCNAME, xmlns);
}

function getClass_49(){
  return Lnu_validator_htmlparser_impl_AttributeName_2_classLit;
}

function nameByBuffer(buf, offset, length, checkNcName){
  var end, end_0;
  $clinit_87();
  var attributeName, hash, index, name;
  hash = bufToHash(buf, length);
  index = binarySearch(ATTRIBUTE_HASHES, hash);
  if (index < 0) {
    return createAttributeName(String((end = offset + length , __checkBounds(buf.length, offset, end) , __valueOf(buf, offset, end))), checkNcName);
  }
   else {
    attributeName = ATTRIBUTE_NAMES[index];
    name = attributeName.local[0];
    if (!localEqualsBuffer(name, buf, offset, length)) {
      return createAttributeName(String((end_0 = offset + length , __checkBounds(buf.length, offset, end_0) , __valueOf(buf, offset, end_0))), checkNcName);
    }
    return attributeName;
  }
}

function AttributeName(){
}

_ = AttributeName.prototype = new Object_0();
_.getClass$ = getClass_49;
_.typeId$ = 36;
_.local = null;
_.ncname = null;
_.uri = null;
_.xmlns = false;
var ABBR, ACCENT, ACCENTUNDER, ACCENT_HEIGHT, ACCEPT, ACCEPT_CHARSET, ACCESSKEY, ACCUMULATE, ACTION, ACTIONTYPE, ACTIVE, ADDITIVE, ALIGN, ALIGNMENTSCOPE, ALIGNMENT_BASELINE, ALINK, ALL_NCNAME, ALL_NO_NCNAME, ALL_NO_NS, ALL_NO_PREFIX, ALPHABETIC, ALT, ALTIMG, ALTTEXT, AMPLITUDE, ARABIC_FORM, ARCHIVE, ARIA_ACTIVEDESCENDANT, ARIA_ATOMIC, ARIA_AUTOCOMPLETE, ARIA_BUSY, ARIA_CHANNEL, ARIA_CHECKED, ARIA_CONTROLS, ARIA_DATATYPE, ARIA_DESCRIBEDBY, ARIA_DISABLED, ARIA_DROPEFFECT, ARIA_EXPANDED, ARIA_FLOWTO, ARIA_GRAB, ARIA_HASPOPUP, ARIA_HIDDEN, ARIA_INVALID, ARIA_LABELLEDBY, ARIA_LEVEL, ARIA_LIVE, ARIA_MULTILINE, ARIA_MULTISELECTABLE, ARIA_OWNS, ARIA_POSINSET, ARIA_PRESSED, ARIA_READONLY, ARIA_RELEVANT, ARIA_REQUIRED, ARIA_SECRET, ARIA_SELECTED, ARIA_SETSIZE, ARIA_SORT, ARIA_TEMPLATEID, ARIA_VALUEMAX, ARIA_VALUEMIN, ARIA_VALUENOW, ASCENT, ASYNC, ATTRIBUTENAME, ATTRIBUTETYPE, ATTRIBUTE_HASHES, ATTRIBUTE_NAMES, AUTOCOMPLETE, AUTOFOCUS, AUTOPLAY, AUTOSUBMIT, AXIS, AZIMUTH, BACKGROUND, BASE, BASEFREQUENCY, BASELINE, BASELINE_SHIFT, BASEPROFILE, BBOX, BEGIN, BEVELLED, BGCOLOR, BIAS, BORDER, BY, CALCMODE, CAP_HEIGHT, CELLPADDING, CELLSPACING, CHAR, CHAROFF, CHARSET, CHECKED, CITE, CLASS, CLASSID, CLEAR, CLIP, CLIPPATHUNITS, CLIP_PATH, CLIP_RULE, CLOSE, CLOSURE, CODE, CODEBASE, CODETYPE, COLOR, COLOR_INTERPOLATION, COLOR_INTERPOLATION_FILTERS, COLOR_PROFILE, COLOR_RENDERING, COLS, COLSPAN, COLUMNALIGN, COLUMNLINES, COLUMNSPACING, COLUMNSPAN, COLUMNWIDTH, COMPACT, CONTENT, CONTENTEDITABLE, CONTENTSCRIPTTYPE, CONTENTSTYLETYPE, CONTEXTMENU, CONTROLS, COORDS, CURSOR, CX, CY, D, DATA, DATAFLD, DATAFORMATAS, DATASRC, DATETIME, DECLARE, DEFAULT, DEFER, DEFINITIONURL, DEPTH, DESCENT, DIFFUSECONSTANT, DIR, DIRECTION, DISABLED, DISPLAY, DISPLAYSTYLE, DIVISOR, DOMINANT_BASELINE, DRAGGABLE, DUR, DX, DY, EDGE, EDGEMODE, ELEVATION, ENABLE_BACKGROUND, ENCODING, ENCTYPE, END, EQUALCOLUMNS, EQUALROWS, EXPONENT, EXTERNALRESOURCESREQUIRED, FACE, FENCE, FILL, FILL_OPACITY, FILL_RULE, FILTER, FILTERRES, FILTERUNITS, FLOOD_COLOR, FLOOD_OPACITY, FONTFAMILY, FONTSIZE, FONTSTYLE, FONTWEIGHT, FONT_FAMILY, FONT_SIZE, FONT_SIZE_ADJUST, FONT_STRETCH, FONT_STYLE, FONT_VARIANT, FONT_WEIGHT, FOR, FORM, FORMAT, FRAME, FRAMEBORDER, FRAMESPACING, FROM, FX, FY, G1, G2, GLYPHREF, GLYPH_NAME, GLYPH_ORIENTATION_HORIZONTAL, GLYPH_ORIENTATION_VERTICAL, GRADIENTTRANSFORM, GRADIENTUNITS, GROUPALIGN, HANGING, HEADERS, HEIGHT, HIDDEN, HIDEFOCUS, HIGH, HORIZ_ADV_X, HORIZ_ORIGIN_X, HORIZ_ORIGIN_Y, HREF, HREFLANG, HSPACE, HTTP_EQUIV, ICON, ID, IDEOGRAPHIC, IMAGE_RENDERING, IN, IN2, INDEX, INPUTMODE, INTERCEPT, IRRELEVANT, ISMAP, K, K1, K2, K3, K4, KERNELMATRIX, KERNELUNITLENGTH, KERNING, KEYPOINTS, KEYSPLINES, KEYTIMES, LABEL, LANG, LANGUAGE, LANG_NS, LANG_PREFIX, LARGEOP, LENGTHADJUST, LETTER_SPACING, LIGHTING_COLOR, LIMITINGCONEANGLE, LINEBREAK, LINETHICKNESS, LINK, LIST, LOCAL, LONGDESC, LOOPEND, LOOPSTART, LOW, LOWSRC, LQUOTE, LSPACE, MACROS, MANIFEST, MARGINHEIGHT, MARGINWIDTH, MARKERHEIGHT, MARKERUNITS, MARKERWIDTH, MARKER_END, MARKER_MID, MARKER_START, MASK, MASKCONTENTUNITS, MASKUNITS, MATHBACKGROUND, MATHCOLOR, MATHEMATICAL, MATHSIZE, MATHVARIANT, MAX, MAXLENGTH, MAXSIZE, MEDIA, MEDIUMMATHSPACE, METHOD, MIN, MINSIZE, MODE, MOVABLELIMITS, MULTIPLE, NAME, NARGS, NOHREF, NORESIZE, NOSHADE, NOTATION, NOWRAP, NUMOCTAVES, OBJECT, OCCURRENCE, OFFSET, ONABORT, ONACTIVATE, ONAFTERPRINT, ONAFTERUPDATE, ONBEFORDEACTIVATE, ONBEFOREACTIVATE, ONBEFORECOPY, ONBEFORECUT, ONBEFOREEDITFOCUS, ONBEFOREPASTE, ONBEFOREPRINT, ONBEFOREUNLOAD, ONBEFOREUPDATE, ONBEGIN, ONBLUR, ONBOUNCE, ONCELLCHANGE, ONCHANGE, ONCLICK, ONCONTEXTMENU, ONCONTROLSELECT, ONCOPY, ONCUT, ONDATAAVAILABLE, ONDATASETCHANGED, ONDATASETCOMPLETE, ONDBLCLICK, ONDEACTIVATE, ONDRAG, ONDRAGDROP, ONDRAGEND, ONDRAGENTER, ONDRAGLEAVE, ONDRAGOVER, ONDRAGSTART, ONDROP, ONEND, ONERROR, ONERRORUPDATE, ONFILTERCHANGE, ONFINISH, ONFOCUS, ONFOCUSIN, ONFOCUSOUT, ONFORMCHANGE, ONFORMINPUT, ONHELP, ONINPUT, ONINVALID, ONKEYDOWN, ONKEYPRESS, ONKEYUP, ONLOAD, ONLOSECAPTURE, ONMESSAGE, ONMOUSEDOWN, ONMOUSEENTER, ONMOUSELEAVE, ONMOUSEMOVE, ONMOUSEOUT, ONMOUSEOVER, ONMOUSEUP, ONMOUSEWHEEL, ONMOVE, ONMOVEEND, ONMOVESTART, ONPASTE, ONPROPERTYCHANGE, ONREADYSTATECHANGE, ONREPEAT, ONRESET, ONRESIZE, ONROWENTER, ONROWEXIT, ONROWSDELETE, ONROWSINSERTED, ONSCROLL, ONSELECT, ONSELECTSTART, ONSTART, ONSTOP, ONSUBMIT, ONUNLOAD, ONZOOM, OPACITY, OPEN, OPERATOR, OPTIMUM, ORDER, ORIENT, ORIENTATION, ORIGIN, OTHER, OVERFLOW, OVERLINE_POSITION, OVERLINE_THICKNESS, PANOSE_1, PATH, PATHLENGTH, PATTERN, PATTERNCONTENTUNITS, PATTERNTRANSFORM, PATTERNUNITS, PING, PLAYCOUNT, POINTER_EVENTS, POINTS, POINTSATX, POINTSATY, POINTSATZ, POSTER, PRESERVEALPHA, PRESERVEASPECTRATIO, PRIMITIVEUNITS, PROFILE, PROMPT, R, RADIOGROUP, RADIUS, READONLY, REFX, REFY, REL, RENDERING_INTENT, REPEAT, REPEATCOUNT, REPEATDUR, REPEAT_MAX, REPEAT_MIN, REPEAT_START, REPEAT_TEMPLATE, REPLACE, REQUIRED, REQUIREDEXTENSIONS, REQUIREDFEATURES, RESTART, RESULT, REV, ROLE, ROTATE, ROWALIGN, ROWLINES, ROWS, ROWSPACING, ROWSPAN, RQUOTE, RSPACE, RT, RULES, RX, RY, SANDBOX, SCALE, SCHEME, SCOPE, SCOPED, SCRIPTLEVEL, SCRIPTMINSIZE, SCRIPTSIZEMULTIPLIER, SCROLLDELAY, SCROLLING, SEAMLESS, SEED, SELECTED, SELECTION, SEPARATOR, SEPARATORS, SHAPE, SHAPE_RENDERING, SIZE, SLOPE, SPACING, SPAN, SPECIFICATION, SPECULARCONSTANT, SPECULAREXPONENT, SPEED, SPREADMETHOD, SRC, STANDBY, START, STARTOFFSET, STDDEVIATION, STEMH, STEMV, STEP, STITCHTILES, STOP_COLOR, STOP_OPACITY, STRETCHY, STRIKETHROUGH_POSITION, STRIKETHROUGH_THICKNESS, STRING, STROKE, STROKE_DASHARRAY, STROKE_DASHOFFSET, STROKE_LINECAP, STROKE_LINEJOIN, STROKE_MITERLIMIT, STROKE_OPACITY, STROKE_WIDTH, STYLE, SUBSCRIPTSHIFT, SUMMARY, SUPERSCRIPTSHIFT, SURFACESCALE, SYMMETRIC, SYSTEMLANGUAGE, TABINDEX, TABLEVALUES, TARGET, TARGETX, TARGETY, TEMPLATE, TEXT, TEXTLENGTH, TEXT_ANCHOR, TEXT_DECORATION, TEXT_RENDERING, THICKMATHSPACE, THINMATHSPACE, TITLE, TO, TRANSFORM, TYPE, U1, U2, UNDERLINE_POSITION, UNDERLINE_THICKNESS, UNICODE, UNICODE_BIDI, UNICODE_RANGE, UNITS_PER_EM, UNSELECTABLE, USEMAP, VALIGN, VALUE, VALUES, VALUETYPE, VERSION, VERT_ADV_Y, VERT_ORIGIN_X, VERT_ORIGIN_Y, VERYTHICKMATHSPACE, VERYTHINMATHSPACE, VERYVERYTHICKMATHSPACE, VERYVERYTHINMATHSPACE, VIEWBOX, VIEWTARGET, VISIBILITY, VLINK, VSPACE, V_ALPHABETIC, V_HANGING, V_IDEOGRAPHIC, V_MATHEMATICAL, WHEN, WIDTH, WIDTHS, WORD_SPACING, WRAP, WRITING_MODE, X, X1, X2, XCHANNELSELECTOR, XLINK_ACTUATE, XLINK_ARCROLE, XLINK_HREF, XLINK_NS, XLINK_PREFIX, XLINK_ROLE, XLINK_SHOW, XLINK_TITLE, XLINK_TYPE, XMLNS, XMLNS_NS, XMLNS_PREFIX, XMLNS_XLINK, XML_BASE, XML_LANG, XML_NS, XML_PREFIX, XML_SPACE, XREF, X_HEIGHT, Y, Y1, Y2, YCHANNELSELECTOR, Z, ZOOMANDPAN;
function $clinit_89(){
  $clinit_89 = nullMethod;
  $ElementName(new ElementName(), null);
  A = $ElementName_0(new ElementName(), 'a', 'a', 1, false, false, false);
  B = $ElementName_0(new ElementName(), 'b', 'b', 45, false, false, false);
  G = $ElementName_0(new ElementName(), 'g', 'g', 0, false, false, false);
  I = $ElementName_0(new ElementName(), 'i', 'i', 45, false, false, false);
  P = $ElementName_0(new ElementName(), 'p', 'p', 29, true, false, false);
  Q = $ElementName_0(new ElementName(), 'q', 'q', 0, false, false, false);
  S = $ElementName_0(new ElementName(), 's', 's', 45, false, false, false);
  U = $ElementName_0(new ElementName(), 'u', 'u', 45, false, false, false);
  BR = $ElementName_0(new ElementName(), 'br', 'br', 4, true, false, false);
  CI = $ElementName_0(new ElementName(), 'ci', 'ci', 0, false, false, false);
  CN = $ElementName_0(new ElementName(), 'cn', 'cn', 0, false, false, false);
  DD = $ElementName_0(new ElementName(), 'dd', 'dd', 41, true, false, false);
  DL = $ElementName_0(new ElementName(), 'dl', 'dl', 46, true, false, false);
  DT = $ElementName_0(new ElementName(), 'dt', 'dt', 41, true, false, false);
  EM = $ElementName_0(new ElementName(), 'em', 'em', 45, false, false, false);
  EQ = $ElementName_0(new ElementName(), 'eq', 'eq', 0, false, false, false);
  FN = $ElementName_0(new ElementName(), 'fn', 'fn', 0, false, false, false);
  H1 = $ElementName_0(new ElementName(), 'h1', 'h1', 42, true, false, false);
  H2 = $ElementName_0(new ElementName(), 'h2', 'h2', 42, true, false, false);
  H3 = $ElementName_0(new ElementName(), 'h3', 'h3', 42, true, false, false);
  H4 = $ElementName_0(new ElementName(), 'h4', 'h4', 42, true, false, false);
  H5 = $ElementName_0(new ElementName(), 'h5', 'h5', 42, true, false, false);
  H6 = $ElementName_0(new ElementName(), 'h6', 'h6', 42, true, false, false);
  GT = $ElementName_0(new ElementName(), 'gt', 'gt', 0, false, false, false);
  HR = $ElementName_0(new ElementName(), 'hr', 'hr', 22, true, false, false);
  IN_0 = $ElementName_0(new ElementName(), 'in', 'in', 0, false, false, false);
  LI = $ElementName_0(new ElementName(), 'li', 'li', 15, true, false, false);
  LN = $ElementName_0(new ElementName(), 'ln', 'ln', 0, false, false, false);
  LT = $ElementName_0(new ElementName(), 'lt', 'lt', 0, false, false, false);
  MI = $ElementName_0(new ElementName(), 'mi', 'mi', 57, false, false, false);
  MN = $ElementName_0(new ElementName(), 'mn', 'mn', 57, false, false, false);
  MO = $ElementName_0(new ElementName(), 'mo', 'mo', 57, false, false, false);
  MS = $ElementName_0(new ElementName(), 'ms', 'ms', 57, false, false, false);
  OL = $ElementName_0(new ElementName(), 'ol', 'ol', 46, true, false, false);
  OR = $ElementName_0(new ElementName(), 'or', 'or', 0, false, false, false);
  PI = $ElementName_0(new ElementName(), 'pi', 'pi', 0, false, false, false);
  RP = $ElementName_0(new ElementName(), 'rp', 'rp', 53, false, false, false);
  RT_0 = $ElementName_0(new ElementName(), 'rt', 'rt', 53, false, false, false);
  TD = $ElementName_0(new ElementName(), 'td', 'td', 40, false, true, false);
  TH = $ElementName_0(new ElementName(), 'th', 'th', 40, false, true, false);
  TR = $ElementName_0(new ElementName(), 'tr', 'tr', 37, true, false, true);
  TT = $ElementName_0(new ElementName(), 'tt', 'tt', 45, false, false, false);
  UL = $ElementName_0(new ElementName(), 'ul', 'ul', 46, true, false, false);
  AND = $ElementName_0(new ElementName(), 'and', 'and', 0, false, false, false);
  ARG = $ElementName_0(new ElementName(), 'arg', 'arg', 0, false, false, false);
  ABS = $ElementName_0(new ElementName(), 'abs', 'abs', 0, false, false, false);
  BIG = $ElementName_0(new ElementName(), 'big', 'big', 45, false, false, false);
  BDO = $ElementName_0(new ElementName(), 'bdo', 'bdo', 0, false, false, false);
  CSC = $ElementName_0(new ElementName(), 'csc', 'csc', 0, false, false, false);
  COL = $ElementName_0(new ElementName(), 'col', 'col', 7, true, false, false);
  COS = $ElementName_0(new ElementName(), 'cos', 'cos', 0, false, false, false);
  COT = $ElementName_0(new ElementName(), 'cot', 'cot', 0, false, false, false);
  DEL = $ElementName_0(new ElementName(), 'del', 'del', 0, false, false, false);
  DFN = $ElementName_0(new ElementName(), 'dfn', 'dfn', 0, false, false, false);
  DIR_0 = $ElementName_0(new ElementName(), 'dir', 'dir', 51, true, false, false);
  DIV = $ElementName_0(new ElementName(), 'div', 'div', 50, true, false, false);
  EXP = $ElementName_0(new ElementName(), 'exp', 'exp', 0, false, false, false);
  GCD = $ElementName_0(new ElementName(), 'gcd', 'gcd', 0, false, false, false);
  GEQ = $ElementName_0(new ElementName(), 'geq', 'geq', 0, false, false, false);
  IMG = $ElementName_0(new ElementName(), 'img', 'img', 48, true, false, false);
  INS = $ElementName_0(new ElementName(), 'ins', 'ins', 0, false, false, false);
  INT = $ElementName_0(new ElementName(), 'int', 'int', 0, false, false, false);
  KBD = $ElementName_0(new ElementName(), 'kbd', 'kbd', 0, false, false, false);
  LOG = $ElementName_0(new ElementName(), 'log', 'log', 0, false, false, false);
  LCM = $ElementName_0(new ElementName(), 'lcm', 'lcm', 0, false, false, false);
  LEQ = $ElementName_0(new ElementName(), 'leq', 'leq', 0, false, false, false);
  MTD = $ElementName_0(new ElementName(), 'mtd', 'mtd', 0, false, false, false);
  MIN_0 = $ElementName_0(new ElementName(), 'min', 'min', 0, false, false, false);
  MAP = $ElementName_0(new ElementName(), 'map', 'map', 0, false, false, false);
  MTR = $ElementName_0(new ElementName(), 'mtr', 'mtr', 0, false, false, false);
  MAX_0 = $ElementName_0(new ElementName(), 'max', 'max', 0, false, false, false);
  NEQ = $ElementName_0(new ElementName(), 'neq', 'neq', 0, false, false, false);
  NOT = $ElementName_0(new ElementName(), 'not', 'not', 0, false, false, false);
  NAV = $ElementName_0(new ElementName(), 'nav', 'nav', 51, true, false, false);
  PRE = $ElementName_0(new ElementName(), 'pre', 'pre', 44, true, false, false);
  REM = $ElementName_0(new ElementName(), 'rem', 'rem', 0, false, false, false);
  SUB = $ElementName_0(new ElementName(), 'sub', 'sub', 52, false, false, false);
  SEC = $ElementName_0(new ElementName(), 'sec', 'sec', 0, false, false, false);
  SVG = $ElementName_0(new ElementName(), 'svg', 'svg', 19, false, false, false);
  SUM = $ElementName_0(new ElementName(), 'sum', 'sum', 0, false, false, false);
  SIN = $ElementName_0(new ElementName(), 'sin', 'sin', 0, false, false, false);
  SEP = $ElementName_0(new ElementName(), 'sep', 'sep', 0, false, false, false);
  SUP = $ElementName_0(new ElementName(), 'sup', 'sup', 52, false, false, false);
  SET = $ElementName_0(new ElementName(), 'set', 'set', 0, false, false, false);
  TAN = $ElementName_0(new ElementName(), 'tan', 'tan', 0, false, false, false);
  USE = $ElementName_0(new ElementName(), 'use', 'use', 0, false, false, false);
  VAR = $ElementName_0(new ElementName(), 'var', 'var', 52, false, false, false);
  WBR = $ElementName_0(new ElementName(), 'wbr', 'wbr', 49, true, false, false);
  XMP = $ElementName_0(new ElementName(), 'xmp', 'xmp', 38, false, false, false);
  XOR = $ElementName_0(new ElementName(), 'xor', 'xor', 0, false, false, false);
  AREA = $ElementName_0(new ElementName(), 'area', 'area', 49, true, false, false);
  ABBR_0 = $ElementName_0(new ElementName(), 'abbr', 'abbr', 0, false, false, false);
  BASE_0 = $ElementName_0(new ElementName(), 'base', 'base', 2, true, false, false);
  BVAR = $ElementName_0(new ElementName(), 'bvar', 'bvar', 0, false, false, false);
  BODY = $ElementName_0(new ElementName(), 'body', 'body', 3, true, false, false);
  CARD = $ElementName_0(new ElementName(), 'card', 'card', 0, false, false, false);
  CODE_0 = $ElementName_0(new ElementName(), 'code', 'code', 45, false, false, false);
  CITE_0 = $ElementName_0(new ElementName(), 'cite', 'cite', 0, false, false, false);
  CSCH = $ElementName_0(new ElementName(), 'csch', 'csch', 0, false, false, false);
  COSH = $ElementName_0(new ElementName(), 'cosh', 'cosh', 0, false, false, false);
  COTH = $ElementName_0(new ElementName(), 'coth', 'coth', 0, false, false, false);
  CURL = $ElementName_0(new ElementName(), 'curl', 'curl', 0, false, false, false);
  DESC = $ElementName_0(new ElementName(), 'desc', 'desc', 59, false, false, false);
  DIFF = $ElementName_0(new ElementName(), 'diff', 'diff', 0, false, false, false);
  DEFS = $ElementName_0(new ElementName(), 'defs', 'defs', 0, false, false, false);
  FORM_0 = $ElementName_0(new ElementName(), 'form', 'form', 9, true, false, false);
  FONT = $ElementName_0(new ElementName(), 'font', 'font', 64, false, false, false);
  GRAD = $ElementName_0(new ElementName(), 'grad', 'grad', 0, false, false, false);
  HEAD = $ElementName_0(new ElementName(), 'head', 'head', 20, true, false, false);
  HTML_0 = $ElementName_0(new ElementName(), 'html', 'html', 23, false, true, false);
  LINE = $ElementName_0(new ElementName(), 'line', 'line', 0, false, false, false);
  LINK_0 = $ElementName_0(new ElementName(), 'link', 'link', 16, true, false, false);
  LIST_0 = $ElementName_0(new ElementName(), 'list', 'list', 0, false, false, false);
  META = $ElementName_0(new ElementName(), 'meta', 'meta', 18, true, false, false);
  MSUB = $ElementName_0(new ElementName(), 'msub', 'msub', 0, false, false, false);
  MODE_0 = $ElementName_0(new ElementName(), 'mode', 'mode', 0, false, false, false);
  MATH = $ElementName_0(new ElementName(), 'math', 'math', 17, false, false, false);
  MARK = $ElementName_0(new ElementName(), 'mark', 'mark', 0, false, false, false);
  MASK_0 = $ElementName_0(new ElementName(), 'mask', 'mask', 0, false, false, false);
  MEAN = $ElementName_0(new ElementName(), 'mean', 'mean', 0, false, false, false);
  MSUP = $ElementName_0(new ElementName(), 'msup', 'msup', 0, false, false, false);
  MENU = $ElementName_0(new ElementName(), 'menu', 'menu', 50, true, false, false);
  MROW = $ElementName_0(new ElementName(), 'mrow', 'mrow', 0, false, false, false);
  NONE = $ElementName_0(new ElementName(), 'none', 'none', 0, false, false, false);
  NOBR = $ElementName_0(new ElementName(), 'nobr', 'nobr', 24, false, false, false);
  NEST = $ElementName_0(new ElementName(), 'nest', 'nest', 0, false, false, false);
  PATH_0 = $ElementName_0(new ElementName(), 'path', 'path', 0, false, false, false);
  PLUS = $ElementName_0(new ElementName(), 'plus', 'plus', 0, false, false, false);
  RULE = $ElementName_0(new ElementName(), 'rule', 'rule', 0, false, false, false);
  REAL = $ElementName_0(new ElementName(), 'real', 'real', 0, false, false, false);
  RELN = $ElementName_0(new ElementName(), 'reln', 'reln', 0, false, false, false);
  RECT = $ElementName_0(new ElementName(), 'rect', 'rect', 0, false, false, false);
  ROOT = $ElementName_0(new ElementName(), 'root', 'root', 0, false, false, false);
  RUBY = $ElementName_0(new ElementName(), 'ruby', 'ruby', 52, false, false, false);
  SECH = $ElementName_0(new ElementName(), 'sech', 'sech', 0, false, false, false);
  SINH = $ElementName_0(new ElementName(), 'sinh', 'sinh', 0, false, false, false);
  SPAN_0 = $ElementName_0(new ElementName(), 'span', 'span', 52, false, false, false);
  SAMP = $ElementName_0(new ElementName(), 'samp', 'samp', 0, false, false, false);
  STOP = $ElementName_0(new ElementName(), 'stop', 'stop', 0, false, false, false);
  SDEV = $ElementName_0(new ElementName(), 'sdev', 'sdev', 0, false, false, false);
  TIME = $ElementName_0(new ElementName(), 'time', 'time', 0, false, false, false);
  TRUE = $ElementName_0(new ElementName(), 'true', 'true', 0, false, false, false);
  TREF = $ElementName_0(new ElementName(), 'tref', 'tref', 0, false, false, false);
  TANH = $ElementName_0(new ElementName(), 'tanh', 'tanh', 0, false, false, false);
  TEXT_0 = $ElementName_0(new ElementName(), 'text', 'text', 0, false, false, false);
  VIEW = $ElementName_0(new ElementName(), 'view', 'view', 0, false, false, false);
  ASIDE = $ElementName_0(new ElementName(), 'aside', 'aside', 51, true, false, false);
  AUDIO = $ElementName_0(new ElementName(), 'audio', 'audio', 0, false, false, false);
  APPLY = $ElementName_0(new ElementName(), 'apply', 'apply', 0, false, false, false);
  EMBED = $ElementName_0(new ElementName(), 'embed', 'embed', 48, true, false, false);
  FRAME_0 = $ElementName_0(new ElementName(), 'frame', 'frame', 10, true, false, false);
  FALSE = $ElementName_0(new ElementName(), 'false', 'false', 0, false, false, false);
  FLOOR = $ElementName_0(new ElementName(), 'floor', 'floor', 0, false, false, false);
  GLYPH = $ElementName_0(new ElementName(), 'glyph', 'glyph', 0, false, false, false);
  HKERN = $ElementName_0(new ElementName(), 'hkern', 'hkern', 0, false, false, false);
  IMAGE = $ElementName_0(new ElementName(), 'image', 'image', 12, true, false, false);
  IDENT = $ElementName_0(new ElementName(), 'ident', 'ident', 0, false, false, false);
  INPUT = $ElementName_0(new ElementName(), 'input', 'input', 13, true, false, false);
  LABEL_0 = $ElementName_0(new ElementName(), 'label', 'label', 62, false, false, false);
  LIMIT = $ElementName_0(new ElementName(), 'limit', 'limit', 0, false, false, false);
  MFRAC = $ElementName_0(new ElementName(), 'mfrac', 'mfrac', 0, false, false, false);
  MPATH = $ElementName_0(new ElementName(), 'mpath', 'mpath', 0, false, false, false);
  METER = $ElementName_0(new ElementName(), 'meter', 'meter', 0, false, false, false);
  MOVER = $ElementName_0(new ElementName(), 'mover', 'mover', 0, false, false, false);
  MINUS = $ElementName_0(new ElementName(), 'minus', 'minus', 0, false, false, false);
  MROOT = $ElementName_0(new ElementName(), 'mroot', 'mroot', 0, false, false, false);
  MSQRT = $ElementName_0(new ElementName(), 'msqrt', 'msqrt', 0, false, false, false);
  MTEXT = $ElementName_0(new ElementName(), 'mtext', 'mtext', 57, false, false, false);
  NOTIN = $ElementName_0(new ElementName(), 'notin', 'notin', 0, false, false, false);
  PIECE = $ElementName_0(new ElementName(), 'piece', 'piece', 0, false, false, false);
  PARAM = $ElementName_0(new ElementName(), 'param', 'param', 55, true, false, false);
  POWER = $ElementName_0(new ElementName(), 'power', 'power', 0, false, false, false);
  REALS = $ElementName_0(new ElementName(), 'reals', 'reals', 0, false, false, false);
  STYLE_0 = $ElementName_0(new ElementName(), 'style', 'style', 33, true, false, false);
  SMALL = $ElementName_0(new ElementName(), 'small', 'small', 45, false, false, false);
  THEAD = $ElementName_0(new ElementName(), 'thead', 'thead', 39, true, false, true);
  TABLE = $ElementName_0(new ElementName(), 'table', 'table', 34, false, true, true);
  TITLE_0 = $ElementName_0(new ElementName(), 'title', 'title', 36, true, false, false);
  TSPAN = $ElementName_0(new ElementName(), 'tspan', 'tspan', 0, false, false, false);
  TIMES = $ElementName_0(new ElementName(), 'times', 'times', 0, false, false, false);
  TFOOT = $ElementName_0(new ElementName(), 'tfoot', 'tfoot', 39, true, false, true);
  TBODY = $ElementName_0(new ElementName(), 'tbody', 'tbody', 39, true, false, true);
  UNION = $ElementName_0(new ElementName(), 'union', 'union', 0, false, false, false);
  VKERN = $ElementName_0(new ElementName(), 'vkern', 'vkern', 0, false, false, false);
  VIDEO = $ElementName_0(new ElementName(), 'video', 'video', 0, false, false, false);
  ARCSEC = $ElementName_0(new ElementName(), 'arcsec', 'arcsec', 0, false, false, false);
  ARCCSC = $ElementName_0(new ElementName(), 'arccsc', 'arccsc', 0, false, false, false);
  ARCTAN = $ElementName_0(new ElementName(), 'arctan', 'arctan', 0, false, false, false);
  ARCSIN = $ElementName_0(new ElementName(), 'arcsin', 'arcsin', 0, false, false, false);
  ARCCOS = $ElementName_0(new ElementName(), 'arccos', 'arccos', 0, false, false, false);
  APPLET = $ElementName_0(new ElementName(), 'applet', 'applet', 43, false, true, false);
  ARCCOT = $ElementName_0(new ElementName(), 'arccot', 'arccot', 0, false, false, false);
  APPROX = $ElementName_0(new ElementName(), 'approx', 'approx', 0, false, false, false);
  BUTTON = $ElementName_0(new ElementName(), 'button', 'button', 5, false, true, false);
  CIRCLE = $ElementName_0(new ElementName(), 'circle', 'circle', 0, false, false, false);
  CENTER = $ElementName_0(new ElementName(), 'center', 'center', 50, true, false, false);
  CURSOR_0 = $ElementName_0(new ElementName(), 'cursor', 'cursor', 0, false, false, false);
  CANVAS = $ElementName_0(new ElementName(), 'canvas', 'canvas', 0, false, false, false);
  DIVIDE = $ElementName_0(new ElementName(), 'divide', 'divide', 0, false, false, false);
  DEGREE = $ElementName_0(new ElementName(), 'degree', 'degree', 0, false, false, false);
  DIALOG = $ElementName_0(new ElementName(), 'dialog', 'dialog', 51, true, false, false);
  DOMAIN = $ElementName_0(new ElementName(), 'domain', 'domain', 0, false, false, false);
  EXISTS = $ElementName_0(new ElementName(), 'exists', 'exists', 0, false, false, false);
  FETILE = $ElementName_0(new ElementName(), 'fetile', 'feTile', 0, false, false, false);
  FIGURE = $ElementName_0(new ElementName(), 'figure', 'figure', 51, true, false, false);
  FORALL = $ElementName_0(new ElementName(), 'forall', 'forall', 0, false, false, false);
  FILTER_0 = $ElementName_0(new ElementName(), 'filter', 'filter', 0, false, false, false);
  FOOTER = $ElementName_0(new ElementName(), 'footer', 'footer', 51, true, false, false);
  HEADER = $ElementName_0(new ElementName(), 'header', 'header', 51, true, false, false);
  IFRAME = $ElementName_0(new ElementName(), 'iframe', 'iframe', 47, true, false, false);
  KEYGEN = $ElementName_0(new ElementName(), 'keygen', 'keygen', 65, true, false, false);
  LAMBDA = $ElementName_0(new ElementName(), 'lambda', 'lambda', 0, false, false, false);
  LEGEND = $ElementName_0(new ElementName(), 'legend', 'legend', 0, false, false, false);
  MSPACE = $ElementName_0(new ElementName(), 'mspace', 'mspace', 0, false, false, false);
  MTABLE = $ElementName_0(new ElementName(), 'mtable', 'mtable', 0, false, false, false);
  MSTYLE = $ElementName_0(new ElementName(), 'mstyle', 'mstyle', 0, false, false, false);
  MGLYPH = $ElementName_0(new ElementName(), 'mglyph', 'mglyph', 56, false, false, false);
  MEDIAN = $ElementName_0(new ElementName(), 'median', 'median', 0, false, false, false);
  MUNDER = $ElementName_0(new ElementName(), 'munder', 'munder', 0, false, false, false);
  MARKER = $ElementName_0(new ElementName(), 'marker', 'marker', 0, false, false, false);
  MERROR = $ElementName_0(new ElementName(), 'merror', 'merror', 0, false, false, false);
  MOMENT = $ElementName_0(new ElementName(), 'moment', 'moment', 0, false, false, false);
  MATRIX = $ElementName_0(new ElementName(), 'matrix', 'matrix', 0, false, false, false);
  OPTION = $ElementName_0(new ElementName(), 'option', 'option', 28, true, false, false);
  OBJECT_0 = $ElementName_0(new ElementName(), 'object', 'object', 63, false, true, false);
  OUTPUT = $ElementName_0(new ElementName(), 'output', 'output', 62, false, false, false);
  PRIMES = $ElementName_0(new ElementName(), 'primes', 'primes', 0, false, false, false);
  SOURCE = $ElementName_0(new ElementName(), 'source', 'source', 55, false, false, false);
  STRIKE = $ElementName_0(new ElementName(), 'strike', 'strike', 45, false, false, false);
  STRONG = $ElementName_0(new ElementName(), 'strong', 'strong', 45, false, false, false);
  SWITCH = $ElementName_0(new ElementName(), 'switch', 'switch', 0, false, false, false);
  SYMBOL = $ElementName_0(new ElementName(), 'symbol', 'symbol', 0, false, false, false);
  SPACER = $ElementName_0(new ElementName(), 'spacer', 'spacer', 49, true, false, false);
  SELECT = $ElementName_0(new ElementName(), 'select', 'select', 32, true, false, false);
  SUBSET = $ElementName_0(new ElementName(), 'subset', 'subset', 0, false, false, false);
  SCRIPT = $ElementName_0(new ElementName(), 'script', 'script', 31, true, false, false);
  TBREAK = $ElementName_0(new ElementName(), 'tbreak', 'tbreak', 0, false, false, false);
  VECTOR = $ElementName_0(new ElementName(), 'vector', 'vector', 0, false, false, false);
  ARTICLE = $ElementName_0(new ElementName(), 'article', 'article', 51, true, false, false);
  ANIMATE = $ElementName_0(new ElementName(), 'animate', 'animate', 0, false, false, false);
  ARCSECH = $ElementName_0(new ElementName(), 'arcsech', 'arcsech', 0, false, false, false);
  ARCCSCH = $ElementName_0(new ElementName(), 'arccsch', 'arccsch', 0, false, false, false);
  ARCTANH = $ElementName_0(new ElementName(), 'arctanh', 'arctanh', 0, false, false, false);
  ARCSINH = $ElementName_0(new ElementName(), 'arcsinh', 'arcsinh', 0, false, false, false);
  ARCCOSH = $ElementName_0(new ElementName(), 'arccosh', 'arccosh', 0, false, false, false);
  ARCCOTH = $ElementName_0(new ElementName(), 'arccoth', 'arccoth', 0, false, false, false);
  ACRONYM = $ElementName_0(new ElementName(), 'acronym', 'acronym', 0, false, false, false);
  ADDRESS = $ElementName_0(new ElementName(), 'address', 'address', 51, true, false, false);
  BGSOUND = $ElementName_0(new ElementName(), 'bgsound', 'bgsound', 49, true, false, false);
  COMMAND = $ElementName_0(new ElementName(), 'command', 'command', 54, true, false, false);
  COMPOSE = $ElementName_0(new ElementName(), 'compose', 'compose', 0, false, false, false);
  CEILING = $ElementName_0(new ElementName(), 'ceiling', 'ceiling', 0, false, false, false);
  CSYMBOL = $ElementName_0(new ElementName(), 'csymbol', 'csymbol', 0, false, false, false);
  CAPTION = $ElementName_0(new ElementName(), 'caption', 'caption', 6, false, true, false);
  DISCARD = $ElementName_0(new ElementName(), 'discard', 'discard', 0, false, false, false);
  DECLARE_0 = $ElementName_0(new ElementName(), 'declare', 'declare', 0, false, false, false);
  DETAILS = $ElementName_0(new ElementName(), 'details', 'details', 51, true, false, false);
  ELLIPSE = $ElementName_0(new ElementName(), 'ellipse', 'ellipse', 0, false, false, false);
  FEFUNCA = $ElementName_0(new ElementName(), 'fefunca', 'feFuncA', 0, false, false, false);
  FEFUNCB = $ElementName_0(new ElementName(), 'fefuncb', 'feFuncB', 0, false, false, false);
  FEBLEND = $ElementName_0(new ElementName(), 'feblend', 'feBlend', 0, false, false, false);
  FEFLOOD = $ElementName_0(new ElementName(), 'feflood', 'feFlood', 0, false, false, false);
  FEIMAGE = $ElementName_0(new ElementName(), 'feimage', 'feImage', 0, false, false, false);
  FEMERGE = $ElementName_0(new ElementName(), 'femerge', 'feMerge', 0, false, false, false);
  FEFUNCG = $ElementName_0(new ElementName(), 'fefuncg', 'feFuncG', 0, false, false, false);
  FEFUNCR = $ElementName_0(new ElementName(), 'fefuncr', 'feFuncR', 0, false, false, false);
  HANDLER = $ElementName_0(new ElementName(), 'handler', 'handler', 0, false, false, false);
  INVERSE = $ElementName_0(new ElementName(), 'inverse', 'inverse', 0, false, false, false);
  IMPLIES = $ElementName_0(new ElementName(), 'implies', 'implies', 0, false, false, false);
  ISINDEX = $ElementName_0(new ElementName(), 'isindex', 'isindex', 14, true, false, false);
  LOGBASE = $ElementName_0(new ElementName(), 'logbase', 'logbase', 0, false, false, false);
  LISTING = $ElementName_0(new ElementName(), 'listing', 'listing', 44, true, false, false);
  MFENCED = $ElementName_0(new ElementName(), 'mfenced', 'mfenced', 0, false, false, false);
  MPADDED = $ElementName_0(new ElementName(), 'mpadded', 'mpadded', 0, false, false, false);
  MARQUEE = $ElementName_0(new ElementName(), 'marquee', 'marquee', 43, false, true, false);
  MACTION = $ElementName_0(new ElementName(), 'maction', 'maction', 0, false, false, false);
  MSUBSUP = $ElementName_0(new ElementName(), 'msubsup', 'msubsup', 0, false, false, false);
  NOEMBED = $ElementName_0(new ElementName(), 'noembed', 'noembed', 60, true, false, false);
  POLYGON = $ElementName_0(new ElementName(), 'polygon', 'polygon', 0, false, false, false);
  PATTERN_0 = $ElementName_0(new ElementName(), 'pattern', 'pattern', 0, false, false, false);
  PRODUCT = $ElementName_0(new ElementName(), 'product', 'product', 0, false, false, false);
  SETDIFF = $ElementName_0(new ElementName(), 'setdiff', 'setdiff', 0, false, false, false);
  SECTION = $ElementName_0(new ElementName(), 'section', 'section', 51, true, false, false);
  TENDSTO = $ElementName_0(new ElementName(), 'tendsto', 'tendsto', 0, false, false, false);
  UPLIMIT = $ElementName_0(new ElementName(), 'uplimit', 'uplimit', 0, false, false, false);
  ALTGLYPH = $ElementName_0(new ElementName(), 'altglyph', 'altGlyph', 0, false, false, false);
  BASEFONT = $ElementName_0(new ElementName(), 'basefont', 'basefont', 49, true, false, false);
  CLIPPATH = $ElementName_0(new ElementName(), 'clippath', 'clipPath', 0, false, false, false);
  CODOMAIN = $ElementName_0(new ElementName(), 'codomain', 'codomain', 0, false, false, false);
  COLGROUP = $ElementName_0(new ElementName(), 'colgroup', 'colgroup', 8, true, false, false);
  DATAGRID = $ElementName_0(new ElementName(), 'datagrid', 'datagrid', 51, true, false, false);
  EMPTYSET = $ElementName_0(new ElementName(), 'emptyset', 'emptyset', 0, false, false, false);
  FACTOROF = $ElementName_0(new ElementName(), 'factorof', 'factorof', 0, false, false, false);
  FIELDSET = $ElementName_0(new ElementName(), 'fieldset', 'fieldset', 61, true, false, false);
  FRAMESET = $ElementName_0(new ElementName(), 'frameset', 'frameset', 11, true, false, false);
  FEOFFSET = $ElementName_0(new ElementName(), 'feoffset', 'feOffset', 0, false, false, false);
  GLYPHREF_0 = $ElementName_0(new ElementName(), 'glyphref', 'glyphRef', 0, false, false, false);
  INTERVAL = $ElementName_0(new ElementName(), 'interval', 'interval', 0, false, false, false);
  INTEGERS = $ElementName_0(new ElementName(), 'integers', 'integers', 0, false, false, false);
  INFINITY = $ElementName_0(new ElementName(), 'infinity', 'infinity', 0, false, false, false);
  LISTENER = $ElementName_0(new ElementName(), 'listener', 'listener', 0, false, false, false);
  LOWLIMIT = $ElementName_0(new ElementName(), 'lowlimit', 'lowlimit', 0, false, false, false);
  METADATA = $ElementName_0(new ElementName(), 'metadata', 'metadata', 0, false, false, false);
  MENCLOSE = $ElementName_0(new ElementName(), 'menclose', 'menclose', 0, false, false, false);
  MPHANTOM = $ElementName_0(new ElementName(), 'mphantom', 'mphantom', 0, false, false, false);
  NOFRAMES = $ElementName_0(new ElementName(), 'noframes', 'noframes', 25, true, false, false);
  NOSCRIPT = $ElementName_0(new ElementName(), 'noscript', 'noscript', 26, true, false, false);
  OPTGROUP = $ElementName_0(new ElementName(), 'optgroup', 'optgroup', 27, true, false, false);
  POLYLINE = $ElementName_0(new ElementName(), 'polyline', 'polyline', 0, false, false, false);
  PREFETCH = $ElementName_0(new ElementName(), 'prefetch', 'prefetch', 0, false, false, false);
  PROGRESS = $ElementName_0(new ElementName(), 'progress', 'progress', 0, false, false, false);
  PRSUBSET = $ElementName_0(new ElementName(), 'prsubset', 'prsubset', 0, false, false, false);
  QUOTIENT = $ElementName_0(new ElementName(), 'quotient', 'quotient', 0, false, false, false);
  SELECTOR = $ElementName_0(new ElementName(), 'selector', 'selector', 0, false, false, false);
  TEXTAREA = $ElementName_0(new ElementName(), 'textarea', 'textarea', 35, true, false, false);
  TEXTPATH = $ElementName_0(new ElementName(), 'textpath', 'textPath', 0, false, false, false);
  VARIANCE = $ElementName_0(new ElementName(), 'variance', 'variance', 0, false, false, false);
  ANIMATION = $ElementName_0(new ElementName(), 'animation', 'animation', 0, false, false, false);
  CONJUGATE = $ElementName_0(new ElementName(), 'conjugate', 'conjugate', 0, false, false, false);
  CONDITION = $ElementName_0(new ElementName(), 'condition', 'condition', 0, false, false, false);
  COMPLEXES = $ElementName_0(new ElementName(), 'complexes', 'complexes', 0, false, false, false);
  FONT_FACE = $ElementName_0(new ElementName(), 'font-face', 'font-face', 0, false, false, false);
  FACTORIAL = $ElementName_0(new ElementName(), 'factorial', 'factorial', 0, false, false, false);
  INTERSECT = $ElementName_0(new ElementName(), 'intersect', 'intersect', 0, false, false, false);
  IMAGINARY = $ElementName_0(new ElementName(), 'imaginary', 'imaginary', 0, false, false, false);
  LAPLACIAN = $ElementName_0(new ElementName(), 'laplacian', 'laplacian', 0, false, false, false);
  MATRIXROW = $ElementName_0(new ElementName(), 'matrixrow', 'matrixrow', 0, false, false, false);
  NOTSUBSET = $ElementName_0(new ElementName(), 'notsubset', 'notsubset', 0, false, false, false);
  OTHERWISE = $ElementName_0(new ElementName(), 'otherwise', 'otherwise', 0, false, false, false);
  PIECEWISE = $ElementName_0(new ElementName(), 'piecewise', 'piecewise', 0, false, false, false);
  PLAINTEXT = $ElementName_0(new ElementName(), 'plaintext', 'plaintext', 30, true, false, false);
  RATIONALS = $ElementName_0(new ElementName(), 'rationals', 'rationals', 0, false, false, false);
  SEMANTICS = $ElementName_0(new ElementName(), 'semantics', 'semantics', 0, false, false, false);
  TRANSPOSE = $ElementName_0(new ElementName(), 'transpose', 'transpose', 0, false, false, false);
  ANNOTATION = $ElementName_0(new ElementName(), 'annotation', 'annotation', 0, false, false, false);
  BLOCKQUOTE = $ElementName_0(new ElementName(), 'blockquote', 'blockquote', 50, true, false, false);
  DIVERGENCE = $ElementName_0(new ElementName(), 'divergence', 'divergence', 0, false, false, false);
  EULERGAMMA = $ElementName_0(new ElementName(), 'eulergamma', 'eulergamma', 0, false, false, false);
  EQUIVALENT = $ElementName_0(new ElementName(), 'equivalent', 'equivalent', 0, false, false, false);
  IMAGINARYI = $ElementName_0(new ElementName(), 'imaginaryi', 'imaginaryi', 0, false, false, false);
  MALIGNMARK = $ElementName_0(new ElementName(), 'malignmark', 'malignmark', 56, false, false, false);
  MUNDEROVER = $ElementName_0(new ElementName(), 'munderover', 'munderover', 0, false, false, false);
  MLABELEDTR = $ElementName_0(new ElementName(), 'mlabeledtr', 'mlabeledtr', 0, false, false, false);
  NOTANUMBER = $ElementName_0(new ElementName(), 'notanumber', 'notanumber', 0, false, false, false);
  SOLIDCOLOR = $ElementName_0(new ElementName(), 'solidcolor', 'solidcolor', 0, false, false, false);
  ALTGLYPHDEF = $ElementName_0(new ElementName(), 'altglyphdef', 'altGlyphDef', 0, false, false, false);
  DETERMINANT = $ElementName_0(new ElementName(), 'determinant', 'determinant', 0, false, false, false);
  EVENTSOURCE = $ElementName_0(new ElementName(), 'eventsource', 'eventsource', 54, true, false, false);
  FEMERGENODE = $ElementName_0(new ElementName(), 'femergenode', 'feMergeNode', 0, false, false, false);
  FECOMPOSITE = $ElementName_0(new ElementName(), 'fecomposite', 'feComposite', 0, false, false, false);
  FESPOTLIGHT = $ElementName_0(new ElementName(), 'fespotlight', 'feSpotLight', 0, false, false, false);
  MALIGNGROUP = $ElementName_0(new ElementName(), 'maligngroup', 'maligngroup', 0, false, false, false);
  MPRESCRIPTS = $ElementName_0(new ElementName(), 'mprescripts', 'mprescripts', 0, false, false, false);
  MOMENTABOUT = $ElementName_0(new ElementName(), 'momentabout', 'momentabout', 0, false, false, false);
  NOTPRSUBSET = $ElementName_0(new ElementName(), 'notprsubset', 'notprsubset', 0, false, false, false);
  PARTIALDIFF = $ElementName_0(new ElementName(), 'partialdiff', 'partialdiff', 0, false, false, false);
  ALTGLYPHITEM = $ElementName_0(new ElementName(), 'altglyphitem', 'altGlyphItem', 0, false, false, false);
  ANIMATECOLOR = $ElementName_0(new ElementName(), 'animatecolor', 'animateColor', 0, false, false, false);
  DATATEMPLATE = $ElementName_0(new ElementName(), 'datatemplate', 'datatemplate', 0, false, false, false);
  EXPONENTIALE = $ElementName_0(new ElementName(), 'exponentiale', 'exponentiale', 0, false, false, false);
  FETURBULENCE = $ElementName_0(new ElementName(), 'feturbulence', 'feTurbulence', 0, false, false, false);
  FEPOINTLIGHT = $ElementName_0(new ElementName(), 'fepointlight', 'fePointLight', 0, false, false, false);
  FEMORPHOLOGY = $ElementName_0(new ElementName(), 'femorphology', 'feMorphology', 0, false, false, false);
  OUTERPRODUCT = $ElementName_0(new ElementName(), 'outerproduct', 'outerproduct', 0, false, false, false);
  ANIMATEMOTION = $ElementName_0(new ElementName(), 'animatemotion', 'animateMotion', 0, false, false, false);
  COLOR_PROFILE_0 = $ElementName_0(new ElementName(), 'color-profile', 'color-profile', 0, false, false, false);
  FONT_FACE_SRC = $ElementName_0(new ElementName(), 'font-face-src', 'font-face-src', 0, false, false, false);
  FONT_FACE_URI = $ElementName_0(new ElementName(), 'font-face-uri', 'font-face-uri', 0, false, false, false);
  FOREIGNOBJECT = $ElementName_0(new ElementName(), 'foreignobject', 'foreignObject', 59, false, false, false);
  FECOLORMATRIX = $ElementName_0(new ElementName(), 'fecolormatrix', 'feColorMatrix', 0, false, false, false);
  MISSING_GLYPH = $ElementName_0(new ElementName(), 'missing-glyph', 'missing-glyph', 0, false, false, false);
  MMULTISCRIPTS = $ElementName_0(new ElementName(), 'mmultiscripts', 'mmultiscripts', 0, false, false, false);
  SCALARPRODUCT = $ElementName_0(new ElementName(), 'scalarproduct', 'scalarproduct', 0, false, false, false);
  VECTORPRODUCT = $ElementName_0(new ElementName(), 'vectorproduct', 'vectorproduct', 0, false, false, false);
  ANNOTATION_XML = $ElementName_0(new ElementName(), 'annotation-xml', 'annotation-xml', 58, false, false, false);
  DEFINITION_SRC = $ElementName_0(new ElementName(), 'definition-src', 'definition-src', 0, false, false, false);
  FONT_FACE_NAME = $ElementName_0(new ElementName(), 'font-face-name', 'font-face-name', 0, false, false, false);
  FEGAUSSIANBLUR = $ElementName_0(new ElementName(), 'fegaussianblur', 'feGaussianBlur', 0, false, false, false);
  FEDISTANTLIGHT = $ElementName_0(new ElementName(), 'fedistantlight', 'feDistantLight', 0, false, false, false);
  LINEARGRADIENT = $ElementName_0(new ElementName(), 'lineargradient', 'linearGradient', 0, false, false, false);
  NATURALNUMBERS = $ElementName_0(new ElementName(), 'naturalnumbers', 'naturalnumbers', 0, false, false, false);
  RADIALGRADIENT = $ElementName_0(new ElementName(), 'radialgradient', 'radialGradient', 0, false, false, false);
  ANIMATETRANSFORM = $ElementName_0(new ElementName(), 'animatetransform', 'animateTransform', 0, false, false, false);
  CARTESIANPRODUCT = $ElementName_0(new ElementName(), 'cartesianproduct', 'cartesianproduct', 0, false, false, false);
  FONT_FACE_FORMAT = $ElementName_0(new ElementName(), 'font-face-format', 'font-face-format', 0, false, false, false);
  FECONVOLVEMATRIX = $ElementName_0(new ElementName(), 'feconvolvematrix', 'feConvolveMatrix', 0, false, false, false);
  FEDIFFUSELIGHTING = $ElementName_0(new ElementName(), 'fediffuselighting', 'feDiffuseLighting', 0, false, false, false);
  FEDISPLACEMENTMAP = $ElementName_0(new ElementName(), 'fedisplacementmap', 'feDisplacementMap', 0, false, false, false);
  FESPECULARLIGHTING = $ElementName_0(new ElementName(), 'fespecularlighting', 'feSpecularLighting', 0, false, false, false);
  DOMAINOFAPPLICATION = $ElementName_0(new ElementName(), 'domainofapplication', 'domainofapplication', 0, false, false, false);
  FECOMPONENTTRANSFER = $ElementName_0(new ElementName(), 'fecomponenttransfer', 'feComponentTransfer', 0, false, false, false);
  ELEMENT_NAMES = initValues(_3Lnu_validator_htmlparser_impl_ElementName_2_classLit, 50, 10, [A, B, G, I, P, Q, S, U, BR, CI, CN, DD, DL, DT, EM, EQ, FN, H1, H2, H3, H4, H5, H6, GT, HR, IN_0, LI, LN, LT, MI, MN, MO, MS, OL, OR, PI, RP, RT_0, TD, TH, TR, TT, UL, AND, ARG, ABS, BIG, BDO, CSC, COL, COS, COT, DEL, DFN, DIR_0, DIV, EXP, GCD, GEQ, IMG, INS, INT, KBD, LOG, LCM, LEQ, MTD, MIN_0, MAP, MTR, MAX_0, NEQ, NOT, NAV, PRE, REM, SUB, SEC, SVG, SUM, SIN, SEP, SUP, SET, TAN, USE, VAR, WBR, XMP, XOR, AREA, ABBR_0, BASE_0, BVAR, BODY, CARD, CODE_0, CITE_0, CSCH, COSH, COTH, CURL, DESC, DIFF, DEFS, FORM_0, FONT, GRAD, HEAD, HTML_0, LINE, LINK_0, LIST_0, META, MSUB, MODE_0, MATH, MARK, MASK_0, MEAN, MSUP, MENU, MROW, NONE, NOBR, NEST, PATH_0, PLUS, RULE, REAL, RELN, RECT, ROOT, RUBY, SECH, SINH, SPAN_0, SAMP, STOP, SDEV, TIME, TRUE, TREF, TANH, TEXT_0, VIEW, ASIDE, AUDIO, APPLY, EMBED, FRAME_0, FALSE, FLOOR, GLYPH, HKERN, IMAGE, IDENT, INPUT, LABEL_0, LIMIT, MFRAC, MPATH, METER, MOVER, MINUS, MROOT, MSQRT, MTEXT, NOTIN, PIECE, PARAM, POWER, REALS, STYLE_0, SMALL, THEAD, TABLE, TITLE_0, TSPAN, TIMES, TFOOT, TBODY, UNION, VKERN, VIDEO, ARCSEC, ARCCSC, ARCTAN, ARCSIN, ARCCOS, APPLET, ARCCOT, APPROX, BUTTON, CIRCLE, CENTER, CURSOR_0, CANVAS, DIVIDE, DEGREE, DIALOG, DOMAIN, EXISTS, FETILE, FIGURE, FORALL, FILTER_0, FOOTER, HEADER, IFRAME, KEYGEN, LAMBDA, LEGEND, MSPACE, MTABLE, MSTYLE, MGLYPH, MEDIAN, MUNDER, MARKER, MERROR, MOMENT, MATRIX, OPTION, OBJECT_0, OUTPUT, PRIMES, SOURCE, STRIKE, STRONG, SWITCH, SYMBOL, SPACER, SELECT, SUBSET, SCRIPT, TBREAK, VECTOR, ARTICLE, ANIMATE, ARCSECH, ARCCSCH, ARCTANH, ARCSINH, ARCCOSH, ARCCOTH, ACRONYM, ADDRESS, BGSOUND, COMMAND, COMPOSE, CEILING, CSYMBOL, CAPTION, DISCARD, DECLARE_0, DETAILS, ELLIPSE, FEFUNCA, FEFUNCB, FEBLEND, FEFLOOD, FEIMAGE, FEMERGE, FEFUNCG, FEFUNCR, HANDLER, INVERSE, IMPLIES, ISINDEX, LOGBASE, LISTING, MFENCED, MPADDED, MARQUEE, MACTION, MSUBSUP, NOEMBED, POLYGON, PATTERN_0, PRODUCT, SETDIFF, SECTION, TENDSTO, UPLIMIT, ALTGLYPH, BASEFONT, CLIPPATH, CODOMAIN, COLGROUP, DATAGRID, EMPTYSET, FACTOROF, FIELDSET, FRAMESET, FEOFFSET, GLYPHREF_0, INTERVAL, INTEGERS, INFINITY, LISTENER, LOWLIMIT, METADATA, MENCLOSE, MPHANTOM, NOFRAMES, NOSCRIPT, OPTGROUP, POLYLINE, PREFETCH, PROGRESS, PRSUBSET, QUOTIENT, SELECTOR, TEXTAREA, TEXTPATH, VARIANCE, ANIMATION, CONJUGATE, CONDITION, COMPLEXES, FONT_FACE, FACTORIAL, INTERSECT, IMAGINARY, LAPLACIAN, MATRIXROW, NOTSUBSET, OTHERWISE, PIECEWISE, PLAINTEXT, RATIONALS, SEMANTICS, TRANSPOSE, ANNOTATION, BLOCKQUOTE, DIVERGENCE, EULERGAMMA, EQUIVALENT, IMAGINARYI, MALIGNMARK, MUNDEROVER, MLABELEDTR, NOTANUMBER, SOLIDCOLOR, ALTGLYPHDEF, DETERMINANT, EVENTSOURCE, FEMERGENODE, FECOMPOSITE, FESPOTLIGHT, MALIGNGROUP, MPRESCRIPTS, MOMENTABOUT, NOTPRSUBSET, PARTIALDIFF, ALTGLYPHITEM, ANIMATECOLOR, DATATEMPLATE, EXPONENTIALE, FETURBULENCE, FEPOINTLIGHT, FEMORPHOLOGY, OUTERPRODUCT, ANIMATEMOTION, COLOR_PROFILE_0, FONT_FACE_SRC, FONT_FACE_URI, FOREIGNOBJECT, FECOLORMATRIX, MISSING_GLYPH, MMULTISCRIPTS, SCALARPRODUCT, VECTORPRODUCT, ANNOTATION_XML, DEFINITION_SRC, FONT_FACE_NAME, FEGAUSSIANBLUR, FEDISTANTLIGHT, LINEARGRADIENT, NATURALNUMBERS, RADIALGRADIENT, ANIMATETRANSFORM, CARTESIANPRODUCT, FONT_FACE_FORMAT, FECONVOLVEMATRIX, FEDIFFUSELIGHTING, FEDISPLACEMENTMAP, FESPECULARLIGHTING, DOMAINOFAPPLICATION, FECOMPONENTTRANSFER]);
  ELEMENT_HASHES = initValues(_3I_classLit, 0, -1, [1057, 1090, 1255, 1321, 1552, 1585, 1651, 1717, 68162, 68899, 69059, 69764, 70020, 70276, 71077, 71205, 72134, 72232, 72264, 72296, 72328, 72360, 72392, 73351, 74312, 75209, 78124, 78284, 78476, 79149, 79309, 79341, 79469, 81295, 81487, 82224, 84498, 84626, 86164, 86292, 86612, 86676, 87445, 3183041, 3186241, 3198017, 3218722, 3226754, 3247715, 3256803, 3263971, 3264995, 3289252, 3291332, 3295524, 3299620, 3326725, 3379303, 3392679, 3448233, 3460553, 3461577, 3510347, 3546604, 3552364, 3556524, 3576461, 3586349, 3588141, 3590797, 3596333, 3622062, 3625454, 3627054, 3675728, 3749042, 3771059, 3771571, 3776211, 3782323, 3782963, 3784883, 3785395, 3788979, 3815476, 3839605, 3885110, 3917911, 3948984, 3951096, 135304769, 135858241, 136498210, 136906434, 137138658, 137512995, 137531875, 137548067, 137629283, 137645539, 137646563, 137775779, 138529956, 138615076, 139040932, 140954086, 141179366, 141690439, 142738600, 143013512, 146979116, 147175724, 147475756, 147902637, 147936877, 148017645, 148131885, 148228141, 148229165, 148309165, 148395629, 148551853, 148618829, 149076462, 149490158, 149572782, 151277616, 151639440, 153268914, 153486514, 153563314, 153750706, 153763314, 153914034, 154406067, 154417459, 154600979, 154678323, 154680979, 154866835, 155366708, 155375188, 155391572, 155465780, 155869364, 158045494, 168988979, 169321621, 169652752, 173151309, 174240818, 174247297, 174669292, 175391532, 176638123, 177380397, 177879204, 177886734, 180753473, 181020073, 181503558, 181686320, 181999237, 181999311, 182048201, 182074866, 182078003, 182083764, 182920847, 184716457, 184976961, 185145071, 187281445, 187872052, 188100653, 188875944, 188919873, 188920457, 189203987, 189371817, 189414886, 189567458, 190266670, 191318187, 191337609, 202479203, 202493027, 202835587, 202843747, 203013219, 203036048, 203045987, 203177552, 203898516, 204648562, 205067918, 205078130, 205096654, 205689142, 205690439, 205766017, 205988909, 207213161, 207794484, 207800999, 208023602, 208213644, 208213647, 210310273, 210940978, 213325049, 213946445, 214055079, 215125040, 215134273, 215135028, 215237420, 215418148, 215553166, 215553394, 215563858, 215627949, 215754324, 217529652, 217713834, 217732628, 218731945, 221417045, 221424946, 221493746, 221515401, 221658189, 221844577, 221908140, 221910626, 221921586, 222659762, 225001091, 236105833, 236113965, 236194995, 236195427, 236206132, 236206387, 236211683, 236212707, 236381647, 236571826, 237124271, 238172205, 238210544, 238270764, 238435405, 238501172, 239224867, 239257644, 239710497, 240307721, 241208789, 241241557, 241318060, 241319404, 241343533, 241344069, 241405397, 241765845, 243864964, 244502085, 244946220, 245109902, 247647266, 247707956, 248648814, 248648836, 248682161, 248986932, 249058914, 249697357, 252132601, 252135604, 252317348, 255007012, 255278388, 256365156, 257566121, 269763372, 271202790, 271863856, 272049197, 272127474, 272770631, 274339449, 274939471, 275388004, 275388005, 275388006, 275977800, 278267602, 278513831, 278712622, 281613765, 281683369, 282120228, 282250732, 282508942, 283743649, 283787570, 284710386, 285391148, 285478533, 285854898, 285873762, 286931113, 288964227, 289445441, 289689648, 291671489, 303512884, 305319975, 305610036, 305764101, 308448294, 308675890, 312085683, 312264750, 315032867, 316391000, 317331042, 317902135, 318950711, 319447220, 321499182, 322538804, 323145200, 337067316, 337826293, 339905989, 340833697, 341457068, 345302593, 349554733, 349771471, 349786245, 350819405, 356072847, 370349192, 373962798, 374509141, 375558638, 375574835, 376053993, 383276530, 383373833, 383407586, 384439906, 386079012, 404133513, 404307343, 407031852, 408072233, 409112005, 409608425, 409771500, 419040932, 437730612, 439529766, 442616365, 442813037, 443157674, 443295316, 450118444, 450482697, 456789668, 459935396, 471217869, 474073645, 476230702, 476665218, 476717289, 483014825, 485083298, 489306281, 538364390, 540675748, 543819186, 543958612, 576960820, 577242548, 610515252, 642202932, 644420819]);
}

function $ElementName_0(this$static, name, camelCaseName, group, special, scoping, fosterParenting){
  $clinit_89();
  this$static.name_0 = name;
  this$static.camelCaseName = camelCaseName;
  this$static.group = group;
  this$static.special = special;
  this$static.scoping = scoping;
  this$static.fosterParenting = fosterParenting;
  this$static.custom = false;
  return this$static;
}

function $ElementName(this$static, name){
  $clinit_89();
  this$static.name_0 = name;
  this$static.camelCaseName = name;
  this$static.group = 0;
  this$static.special = false;
  this$static.scoping = false;
  this$static.fosterParenting = false;
  this$static.custom = true;
  return this$static;
}

function bufToHash_0(buf, len){
  var hash, i, j;
  hash = len;
  hash <<= 5;
  hash += buf[0] - 96;
  j = len;
  for (i = 0; i < 4 && j > 0; ++i) {
    --j;
    hash <<= 5;
    hash += buf[j] - 96;
  }
  return hash;
}

function elementNameByBuffer(buf, offset, length){
  var end, end_0;
  $clinit_89();
  var elementName, hash, index, name;
  hash = bufToHash_0(buf, length);
  index = binarySearch(ELEMENT_HASHES, hash);
  if (index < 0) {
    return $ElementName(new ElementName(), String((end = offset + length , __checkBounds(buf.length, offset, end) , __valueOf(buf, offset, end))));
  }
   else {
    elementName = ELEMENT_NAMES[index];
    name = elementName.name_0;
    if (!localEqualsBuffer(name, buf, offset, length)) {
      return $ElementName(new ElementName(), String((end_0 = offset + length , __checkBounds(buf.length, offset, end_0) , __valueOf(buf, offset, end_0))));
    }
    return elementName;
  }
}

function getClass_51(){
  return Lnu_validator_htmlparser_impl_ElementName_2_classLit;
}

function ElementName(){
}

_ = ElementName.prototype = new Object_0();
_.getClass$ = getClass_51;
_.typeId$ = 37;
_.camelCaseName = null;
_.custom = false;
_.fosterParenting = false;
_.group = 0;
_.name_0 = null;
_.scoping = false;
_.special = false;
var A, ABBR_0, ABS, ACRONYM, ADDRESS, ALTGLYPH, ALTGLYPHDEF, ALTGLYPHITEM, AND, ANIMATE, ANIMATECOLOR, ANIMATEMOTION, ANIMATETRANSFORM, ANIMATION, ANNOTATION, ANNOTATION_XML, APPLET, APPLY, APPROX, ARCCOS, ARCCOSH, ARCCOT, ARCCOTH, ARCCSC, ARCCSCH, ARCSEC, ARCSECH, ARCSIN, ARCSINH, ARCTAN, ARCTANH, AREA, ARG, ARTICLE, ASIDE, AUDIO, B, BASE_0, BASEFONT, BDO, BGSOUND, BIG, BLOCKQUOTE, BODY, BR, BUTTON, BVAR, CANVAS, CAPTION, CARD, CARTESIANPRODUCT, CEILING, CENTER, CI, CIRCLE, CITE_0, CLIPPATH, CN, CODE_0, CODOMAIN, COL, COLGROUP, COLOR_PROFILE_0, COMMAND, COMPLEXES, COMPOSE, CONDITION, CONJUGATE, COS, COSH, COT, COTH, CSC, CSCH, CSYMBOL, CURL, CURSOR_0, DATAGRID, DATATEMPLATE, DD, DECLARE_0, DEFINITION_SRC, DEFS, DEGREE, DEL, DESC, DETAILS, DETERMINANT, DFN, DIALOG, DIFF, DIR_0, DISCARD, DIV, DIVERGENCE, DIVIDE, DL, DOMAIN, DOMAINOFAPPLICATION, DT, ELEMENT_HASHES, ELEMENT_NAMES, ELLIPSE, EM, EMBED, EMPTYSET, EQ, EQUIVALENT, EULERGAMMA, EVENTSOURCE, EXISTS, EXP, EXPONENTIALE, FACTORIAL, FACTOROF, FALSE, FEBLEND, FECOLORMATRIX, FECOMPONENTTRANSFER, FECOMPOSITE, FECONVOLVEMATRIX, FEDIFFUSELIGHTING, FEDISPLACEMENTMAP, FEDISTANTLIGHT, FEFLOOD, FEFUNCA, FEFUNCB, FEFUNCG, FEFUNCR, FEGAUSSIANBLUR, FEIMAGE, FEMERGE, FEMERGENODE, FEMORPHOLOGY, FEOFFSET, FEPOINTLIGHT, FESPECULARLIGHTING, FESPOTLIGHT, FETILE, FETURBULENCE, FIELDSET, FIGURE, FILTER_0, FLOOR, FN, FONT, FONT_FACE, FONT_FACE_FORMAT, FONT_FACE_NAME, FONT_FACE_SRC, FONT_FACE_URI, FOOTER, FORALL, FOREIGNOBJECT, FORM_0, FRAME_0, FRAMESET, G, GCD, GEQ, GLYPH, GLYPHREF_0, GRAD, GT, H1, H2, H3, H4, H5, H6, HANDLER, HEAD, HEADER, HKERN, HR, HTML_0, I, IDENT, IFRAME, IMAGE, IMAGINARY, IMAGINARYI, IMG, IMPLIES, IN_0, INFINITY, INPUT, INS, INT, INTEGERS, INTERSECT, INTERVAL, INVERSE, ISINDEX, KBD, KEYGEN, LABEL_0, LAMBDA, LAPLACIAN, LCM, LEGEND, LEQ, LI, LIMIT, LINE, LINEARGRADIENT, LINK_0, LIST_0, LISTENER, LISTING, LN, LOG, LOGBASE, LOWLIMIT, LT, MACTION, MALIGNGROUP, MALIGNMARK, MAP, MARK, MARKER, MARQUEE, MASK_0, MATH, MATRIX, MATRIXROW, MAX_0, MEAN, MEDIAN, MENCLOSE, MENU, MERROR, META, METADATA, METER, MFENCED, MFRAC, MGLYPH, MI, MIN_0, MINUS, MISSING_GLYPH, MLABELEDTR, MMULTISCRIPTS, MN, MO, MODE_0, MOMENT, MOMENTABOUT, MOVER, MPADDED, MPATH, MPHANTOM, MPRESCRIPTS, MROOT, MROW, MS, MSPACE, MSQRT, MSTYLE, MSUB, MSUBSUP, MSUP, MTABLE, MTD, MTEXT, MTR, MUNDER, MUNDEROVER, NATURALNUMBERS, NAV, NEQ, NEST, NOBR, NOEMBED, NOFRAMES, NONE, NOSCRIPT, NOT, NOTANUMBER, NOTIN, NOTPRSUBSET, NOTSUBSET, OBJECT_0, OL, OPTGROUP, OPTION, OR, OTHERWISE, OUTERPRODUCT, OUTPUT, P, PARAM, PARTIALDIFF, PATH_0, PATTERN_0, PI, PIECE, PIECEWISE, PLAINTEXT, PLUS, POLYGON, POLYLINE, POWER, PRE, PREFETCH, PRIMES, PRODUCT, PROGRESS, PRSUBSET, Q, QUOTIENT, RADIALGRADIENT, RATIONALS, REAL, REALS, RECT, RELN, REM, ROOT, RP, RT_0, RUBY, RULE, S, SAMP, SCALARPRODUCT, SCRIPT, SDEV, SEC, SECH, SECTION, SELECT, SELECTOR, SEMANTICS, SEP, SET, SETDIFF, SIN, SINH, SMALL, SOLIDCOLOR, SOURCE, SPACER, SPAN_0, STOP, STRIKE, STRONG, STYLE_0, SUB, SUBSET, SUM, SUP, SVG, SWITCH, SYMBOL, TABLE, TAN, TANH, TBODY, TBREAK, TD, TENDSTO, TEXT_0, TEXTAREA, TEXTPATH, TFOOT, TH, THEAD, TIME, TIMES, TITLE_0, TR, TRANSPOSE, TREF, TRUE, TSPAN, TT, U, UL, UNION, UPLIMIT, USE, VAR, VARIANCE, VECTOR, VECTORPRODUCT, VIDEO, VIEW, VKERN, WBR, XMP, XOR;
function $clinit_97(){
  $clinit_97 = nullMethod;
  LT_GT = initValues(_3C_classLit, 42, -1, [60, 62]);
  LT_SOLIDUS = initValues(_3C_classLit, 42, -1, [60, 47]);
  RSQB_RSQB = initValues(_3C_classLit, 42, -1, [93, 93]);
  REPLACEMENT_CHARACTER = initValues(_3C_classLit, 42, -1, [65533]);
  SPACE = initValues(_3C_classLit, 42, -1, [32]);
  LF = initValues(_3C_classLit, 42, -1, [10]);
  CDATA_LSQB = $toCharArray('CDATA[');
  OCTYPE = $toCharArray('octype');
  UBLIC = $toCharArray('ublic');
  YSTEM = $toCharArray('ystem');
  TITLE_ARR = initValues(_3C_classLit, 42, -1, [116, 105, 116, 108, 101]);
  SCRIPT_ARR = initValues(_3C_classLit, 42, -1, [115, 99, 114, 105, 112, 116]);
  STYLE_ARR = initValues(_3C_classLit, 42, -1, [115, 116, 121, 108, 101]);
  PLAINTEXT_ARR = initValues(_3C_classLit, 42, -1, [112, 108, 97, 105, 110, 116, 101, 120, 116]);
  XMP_ARR = initValues(_3C_classLit, 42, -1, [120, 109, 112]);
  TEXTAREA_ARR = initValues(_3C_classLit, 42, -1, [116, 101, 120, 116, 97, 114, 101, 97]);
  IFRAME_ARR = initValues(_3C_classLit, 42, -1, [105, 102, 114, 97, 109, 101]);
  NOEMBED_ARR = initValues(_3C_classLit, 42, -1, [110, 111, 101, 109, 98, 101, 100]);
  NOSCRIPT_ARR = initValues(_3C_classLit, 42, -1, [110, 111, 115, 99, 114, 105, 112, 116]);
  NOFRAMES_ARR = initValues(_3C_classLit, 42, -1, [110, 111, 102, 114, 97, 109, 101, 115]);
}

function $addAttributeWithValue(this$static){
  var value;
  this$static.metaBoundaryPassed && ($clinit_89() , META) == this$static.tagName && ($clinit_87() , CHARSET) == this$static.attributeName;
  if (this$static.attributeName) {
    value = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
    if (!this$static.endTag && this$static.html4 && this$static.html4ModeCompatibleWithXhtml1Schemata && $isCaseFolded(this$static.attributeName)) {
      value = newAsciiLowerCaseStringFromString(value);
    }
    $addAttribute(this$static.attributes, this$static.attributeName, value, this$static.xmlnsPolicy);
  }
}

function $addAttributeWithoutValue(this$static){
  this$static.metaBoundaryPassed && ($clinit_87() , CHARSET) == this$static.attributeName && ($clinit_89() , META) == this$static.tagName;
  if (this$static.attributeName) {
    if (this$static.html4) {
      if ($isBoolean(this$static.attributeName)) {
        if (this$static.html4ModeCompatibleWithXhtml1Schemata) {
          $addAttribute(this$static.attributes, this$static.attributeName, this$static.attributeName.local[0], this$static.xmlnsPolicy);
        }
         else {
          $addAttribute(this$static.attributes, this$static.attributeName, '', this$static.xmlnsPolicy);
        }
      }
       else {
        $addAttribute(this$static.attributes, this$static.attributeName, '', this$static.xmlnsPolicy);
      }
    }
     else {
      if (($clinit_87() , SRC) == this$static.attributeName || HREF == this$static.attributeName) {
        'Attribute \u201C' + this$static.attributeName.local[0] + '\u201D without an explicit value seen. The attribute may be dropped by IE7.';
      }
      $addAttribute(this$static.attributes, this$static.attributeName, '', this$static.xmlnsPolicy);
    }
  }
}

function $adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, c){
  switch (this$static.commentPolicy.ordinal) {
    case 2:
      --this$static.longStrBufLen;
      $appendLongStrBuf(this$static, 32);
      $appendLongStrBuf(this$static, 45);
    case 0:
      $appendLongStrBuf(this$static, c);
      break;
    case 1:
      $fatal(this$static, 'The document is not mappable to XML 1.0 due to two consecutive hyphens in a comment.');
  }
}

function $appendLongStrBuf(this$static, c){
  var newBuf;
  if (this$static.longStrBufLen == this$static.longStrBuf.length) {
    newBuf = initDim(_3C_classLit, 42, -1, this$static.longStrBufLen + (this$static.longStrBufLen >> 1), 1);
    arraycopy(this$static.longStrBuf, 0, newBuf, 0, this$static.longStrBuf.length);
    this$static.longStrBuf = newBuf;
  }
  this$static.longStrBuf[this$static.longStrBufLen++] = c;
}

function $appendLongStrBuf_0(this$static, buffer, offset, length){
  var newBuf, reqLen;
  reqLen = this$static.longStrBufLen + length;
  if (this$static.longStrBuf.length < reqLen) {
    newBuf = initDim(_3C_classLit, 42, -1, reqLen + (reqLen >> 1), 1);
    arraycopy(this$static.longStrBuf, 0, newBuf, 0, this$static.longStrBuf.length);
    this$static.longStrBuf = newBuf;
  }
  arraycopy(buffer, offset, this$static.longStrBuf, this$static.longStrBufLen, length);
  this$static.longStrBufLen = reqLen;
}

function $appendSecondHyphenToBogusComment(this$static){
  switch (this$static.commentPolicy.ordinal) {
    case 2:
      $appendLongStrBuf(this$static, 32);
    case 0:
      $appendLongStrBuf(this$static, 45);
      break;
    case 1:
      $fatal(this$static, 'The document is not mappable to XML 1.0 due to two consecutive hyphens in a comment.');
  }
}

function $appendStrBuf(this$static, c){
  var newBuf;
  if (this$static.strBufLen == this$static.strBuf.length) {
    newBuf = initDim(_3C_classLit, 42, -1, this$static.strBuf.length + 1024, 1);
    arraycopy(this$static.strBuf, 0, newBuf, 0, this$static.strBuf.length);
    this$static.strBuf = newBuf;
  }
  this$static.strBuf[this$static.strBufLen++] = c;
}

function $attributeNameComplete(this$static){
  this$static.attributeName = nameByBuffer(this$static.strBuf, 0, this$static.strBufLen, this$static.namePolicy != ($clinit_80() , ALLOW));
  if (!this$static.attributes) {
    this$static.attributes = $HtmlAttributes(new HtmlAttributes(), this$static.mappingLangToXmlLang);
  }
  if ($contains(this$static.attributes, this$static.attributeName)) {
    'Duplicate attribute \u201C' + this$static.attributeName.local[0] + '\u201D.';
    this$static.attributeName = null;
  }
}

function $contentModelElementToArray(this$static){
  switch (this$static.contentModelElement.group) {
    case 36:
      this$static.contentModelElementNameAsArray = TITLE_ARR;
      return;
    case 31:
      this$static.contentModelElementNameAsArray = SCRIPT_ARR;
      return;
    case 33:
      this$static.contentModelElementNameAsArray = STYLE_ARR;
      return;
    case 30:
      this$static.contentModelElementNameAsArray = PLAINTEXT_ARR;
      return;
    case 38:
      this$static.contentModelElementNameAsArray = XMP_ARR;
      return;
    case 35:
      this$static.contentModelElementNameAsArray = TEXTAREA_ARR;
      return;
    case 47:
      this$static.contentModelElementNameAsArray = IFRAME_ARR;
      return;
    case 60:
      this$static.contentModelElementNameAsArray = NOEMBED_ARR;
      return;
    case 26:
      this$static.contentModelElementNameAsArray = NOSCRIPT_ARR;
      return;
    case 25:
      this$static.contentModelElementNameAsArray = NOFRAMES_ARR;
      return;
    default:return;
  }
}

function $emitCarriageReturn(this$static, buf, pos){
  this$static.nextCharOnNewLine = true;
  this$static.lastCR = true;
  $flushChars(this$static, buf, pos);
  $characters(this$static.tokenHandler, LF, 0, 1);
  this$static.cstart = 2147483647;
}

function $emitComment(this$static, provisionalHyphens, pos){
  if (this$static.wantsComments) {
    $comment(this$static.tokenHandler, this$static.longStrBuf, 0, this$static.longStrBufLen - provisionalHyphens);
  }
  this$static.cstart = pos + 1;
}

function $emitCurrentTagToken(this$static, selfClosing, pos){
  var attrs;
  this$static.cstart = pos + 1;
  this$static.stateSave = 0;
  attrs = !this$static.attributes?($clinit_91() , EMPTY_ATTRIBUTES):this$static.attributes;
  if (this$static.endTag) {
    $endTag(this$static.tokenHandler, this$static.tagName);
  }
   else {
    $startTag(this$static.tokenHandler, this$static.tagName, attrs, selfClosing);
  }
  $resetAttributes(this$static);
  return this$static.stateSave;
}

function $emitOrAppend(this$static, val, returnState){
  if ((returnState & -2) != 0) {
    $appendLongStrBuf_0(this$static, val, 0, val.length);
  }
   else {
    $characters(this$static.tokenHandler, val, 0, val.length);
  }
}

function $emitOrAppendOne(this$static, val, returnState){
  if ((returnState & -2) != 0) {
    $appendLongStrBuf(this$static, val[0]);
  }
   else {
    $characters(this$static.tokenHandler, val, 0, 1);
  }
}

function $emitOrAppendStrBuf(this$static, returnState){
  if ((returnState & -2) != 0) {
    $appendLongStrBuf_0(this$static, this$static.strBuf, 0, this$static.strBufLen);
  }
   else {
    $emitStrBuf(this$static);
  }
}

function $emitReplacementCharacter(this$static, buf, pos){
  this$static.nextCharOnNewLine = true;
  this$static.lastCR = true;
  $flushChars(this$static, buf, pos);
  $characters(this$static.tokenHandler, REPLACEMENT_CHARACTER, 0, 1);
  this$static.cstart = 2147483647;
}

function $emitStrBuf(this$static){
  if (this$static.strBufLen > 0) {
    $characters(this$static.tokenHandler, this$static.strBuf, 0, this$static.strBufLen);
  }
}

function $emptyAttributes(this$static){
  if (this$static.newAttributesEachTime) {
    return $HtmlAttributes(new HtmlAttributes(), this$static.mappingLangToXmlLang);
  }
   else {
    return $clinit_91() , EMPTY_ATTRIBUTES;
  }
}

function $end(this$static){
  this$static.strBuf = null;
  this$static.longStrBuf = null;
  this$static.systemIdentifier = null;
  this$static.publicIdentifier = null;
  this$static.doctypeName = null;
  this$static.tagName = null;
  this$static.attributeName = null;
  $endTokenization(this$static.tokenHandler);
  if (this$static.attributes) {
    $clear_0(this$static.attributes, this$static.mappingLangToXmlLang);
    this$static.attributes = null;
  }
}

function $eof(this$static){
  var candidateArr, ch, i, returnState, state, val;
  state = this$static.stateSave;
  returnState = this$static.returnStateSave;
  eofloop: for (;;) {
    switch (state) {
      case 53:
        $characters(this$static.tokenHandler, LT_GT, 0, 1);
        break eofloop;
      case 4:
        $characters(this$static.tokenHandler, LT_GT, 0, 1);
        break eofloop;
      case 37:
        if (this$static.index < this$static.contentModelElementNameAsArray.length) {
          break eofloop;
        }
         else {
          break eofloop;
        }

      case 5:
        $characters(this$static.tokenHandler, LT_SOLIDUS, 0, 2);
        break eofloop;
      case 6:
        break eofloop;
      case 7:
      case 14:
      case 48:
        break eofloop;
      case 8:
        break eofloop;
      case 9:
      case 10:
        break eofloop;
      case 11:
      case 12:
      case 13:
        break eofloop;
      case 15:
        $emitComment(this$static, 0, 0);
        break eofloop;
      case 59:
        $maybeAppendSpaceToBogusComment(this$static);
        $emitComment(this$static, 0, 0);
        break eofloop;
      case 16:
        this$static.longStrBufLen = 0;
        $emitComment(this$static, 0, 0);
        break eofloop;
      case 38:
        $emitComment(this$static, 0, 0);
        break eofloop;
      case 39:
        if (this$static.index < 6) {
          $emitComment(this$static, 0, 0);
        }
         else {
          this$static.doctypeName = '';
          this$static.publicIdentifier = null;
          this$static.systemIdentifier = null;
          this$static.forceQuirks = true;
          this$static.cstart = 1;
          $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
          break eofloop;
        }

        break eofloop;
      case 30:
      case 32:
      case 35:
        $emitComment(this$static, 0, 0);
        break eofloop;
      case 34:
        $emitComment(this$static, 2, 0);
        break eofloop;
      case 33:
      case 31:
        $emitComment(this$static, 1, 0);
        break eofloop;
      case 36:
        $emitComment(this$static, 3, 0);
        break eofloop;
      case 17:
      case 18:
        this$static.forceQuirks = true;
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 19:
        this$static.doctypeName = String(valueOf_1(this$static.strBuf, 0, this$static.strBufLen));
        this$static.forceQuirks = true;
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 40:
      case 41:
      case 20:
      case 21:
        this$static.forceQuirks = true;
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 22:
      case 23:
        this$static.forceQuirks = true;
        this$static.publicIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 24:
      case 25:
        this$static.forceQuirks = true;
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 26:
      case 27:
        this$static.forceQuirks = true;
        this$static.systemIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 28:
        this$static.forceQuirks = true;
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 29:
        this$static.cstart = 1;
        $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
        break eofloop;
      case 42:
        $emitOrAppendStrBuf(this$static, returnState);
        state = returnState;
        continue;
      case 44:
        outer: for (;;) {
          ++this$static.entCol;
          hiloop: for (;;) {
            if (this$static.hi == -1) {
              break hiloop;
            }
            if (this$static.entCol == ($clinit_94() , NAMES)[this$static.hi].length) {
              break hiloop;
            }
            if (this$static.entCol > NAMES[this$static.hi].length) {
              break outer;
            }
             else if (0 < NAMES[this$static.hi][this$static.entCol]) {
              --this$static.hi;
            }
             else {
              break hiloop;
            }
          }
          loloop: for (;;) {
            if (this$static.hi < this$static.lo) {
              break outer;
            }
            if (this$static.entCol == ($clinit_94() , NAMES)[this$static.lo].length) {
              this$static.candidate = this$static.lo;
              this$static.strBufMark = this$static.strBufLen;
              ++this$static.lo;
            }
             else if (this$static.entCol > NAMES[this$static.lo].length) {
              break outer;
            }
             else if (0 > NAMES[this$static.lo][this$static.entCol]) {
              ++this$static.lo;
            }
             else {
              break loloop;
            }
          }
          if (this$static.hi < this$static.lo) {
            break outer;
          }
          continue;
        }

        if (this$static.candidate == -1) {
          $emitOrAppendStrBuf(this$static, returnState);
          state = returnState;
          continue eofloop;
        }
         else {
          candidateArr = ($clinit_94() , NAMES)[this$static.candidate];
          if (candidateArr[candidateArr.length - 1] != 59) {
            if ((returnState & -2) != 0) {
              if (this$static.strBufMark == this$static.strBufLen) {
                ch = 0;
              }
               else {
                ch = this$static.strBuf[this$static.strBufMark];
              }
              if (ch >= 48 && ch <= 57 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122) {
                $appendLongStrBuf_0(this$static, this$static.strBuf, 0, this$static.strBufLen);
                state = returnState;
                continue eofloop;
              }
            }
          }
          val = VALUES_0[this$static.candidate];
          $emitOrAppend(this$static, val, returnState);
          if (this$static.strBufMark < this$static.strBufLen) {
            if ((returnState & -2) != 0) {
              for (i = this$static.strBufMark; i < this$static.strBufLen; ++i) {
                $appendLongStrBuf(this$static, this$static.strBuf[i]);
              }
            }
             else {
              $characters(this$static.tokenHandler, this$static.strBuf, this$static.strBufMark, this$static.strBufLen - this$static.strBufMark);
            }
          }
          state = returnState;
          continue eofloop;
        }

      case 43:
      case 46:
      case 45:
        if (this$static.seenDigits) {
        }
         else {
          'No digits after \u201C' + valueOf_1(this$static.strBuf, 0, this$static.strBufLen) + '\u201D.';
          $emitOrAppendStrBuf(this$static, returnState);
          state = returnState;
          continue;
        }

        $handleNcrValue(this$static, returnState);
        state = returnState;
        continue;
      case 0:
      default:break eofloop;
    }
  }
  $eof_0(this$static.tokenHandler);
  return;
}

function $fatal(this$static, message){
  var spe;
  spe = $SAXParseException(new SAXParseException(), message, this$static);
  throw spe;
}

function $handleNcrValue(this$static, returnState){
  var ch, val;
  if (this$static.value >= 128 && this$static.value <= 159) {
    val = ($clinit_94() , WINDOWS_1252)[this$static.value - 128];
    $emitOrAppendOne(this$static, val, returnState);
  }
   else if (this$static.value == 13) {
    $emitOrAppendOne(this$static, LF, returnState);
  }
   else if (this$static.value == 12 && this$static.contentSpacePolicy != ($clinit_80() , ALLOW)) {
    if (this$static.contentSpacePolicy == ($clinit_80() , ALTER_INFOSET)) {
      $emitOrAppendOne(this$static, SPACE, returnState);
    }
     else if (this$static.contentSpacePolicy == FATAL) {
      $fatal(this$static, 'A character reference expanded to a form feed which is not legal XML 1.0 white space.');
    }
  }
   else if (this$static.value >= 0 && this$static.value <= 8 || this$static.value == 11 || this$static.value >= 14 && this$static.value <= 31 || this$static.value == 127) {
    'Character reference expands to a control character (' + $toUPlusString(this$static.value & 65535) + ').';
    $emitOrAppendOne(this$static, REPLACEMENT_CHARACTER, returnState);
  }
   else if ((this$static.value & 63488) == 55296) {
    $emitOrAppendOne(this$static, REPLACEMENT_CHARACTER, returnState);
  }
   else if ((this$static.value & 65534) == 65534) {
    $emitOrAppendOne(this$static, REPLACEMENT_CHARACTER, returnState);
  }
   else if (this$static.value >= 64976 && this$static.value <= 65007) {
    $emitOrAppendOne(this$static, REPLACEMENT_CHARACTER, returnState);
  }
   else if (this$static.value <= 65535) {
    ch = this$static.value & 65535;
    this$static.bmpChar[0] = ch;
    $emitOrAppendOne(this$static, this$static.bmpChar, returnState);
  }
   else if (this$static.value <= 1114111) {
    this$static.astralChar[0] = 55232 + (this$static.value >> 10) & 65535;
    this$static.astralChar[1] = 56320 + (this$static.value & 1023) & 65535;
    $emitOrAppend(this$static, this$static.astralChar, returnState);
  }
   else {
    $emitOrAppendOne(this$static, REPLACEMENT_CHARACTER, returnState);
  }
}

function $maybeAppendSpaceToBogusComment(this$static){
  switch (this$static.commentPolicy.ordinal) {
    case 2:
      $appendLongStrBuf(this$static, 32);
      break;
    case 1:
      $fatal(this$static, 'The document is not mappable to XML 1.0 due to a trailing hyphen in a comment.');
  }
}

function $resetAttributes(this$static){
  if (this$static.newAttributesEachTime) {
    this$static.attributes = null;
  }
   else {
    $clear_0(this$static.attributes, this$static.mappingLangToXmlLang);
  }
}

function $setContentModelFlag(this$static, contentModelFlag){
  var asArray;
  this$static.stateSave = contentModelFlag;
  if (contentModelFlag == 0) {
    return;
  }
  asArray = null.nullMethod();
  this$static.contentModelElement = elementNameByBuffer(asArray, 0, null.nullField);
  $contentModelElementToArray(this$static);
}

function $setContentModelFlag_0(this$static, contentModelFlag, contentModelElement){
  this$static.stateSave = contentModelFlag;
  this$static.contentModelElement = contentModelElement;
  $contentModelElementToArray(this$static);
}

function $setXmlnsPolicy(this$static, xmlnsPolicy){
  if (xmlnsPolicy == ($clinit_80() , FATAL)) {
    throw $IllegalArgumentException(new IllegalArgumentException(), "Can't use FATAL here.");
  }
  this$static.xmlnsPolicy = xmlnsPolicy;
}

function $start_0(this$static){
  this$static.confident = false;
  this$static.strBuf = initDim(_3C_classLit, 42, -1, 64, 1);
  this$static.strBufLen = 0;
  this$static.longStrBuf = initDim(_3C_classLit, 42, -1, 1024, 1);
  this$static.longStrBufLen = 0;
  this$static.stateSave = 0;
  this$static.lastCR = false;
  this$static.html4 = false;
  this$static.metaBoundaryPassed = false;
  $startTokenization(this$static.tokenHandler, this$static);
  this$static.wantsComments = this$static.tokenHandler.wantingComments;
  this$static.index = 0;
  this$static.forceQuirks = false;
  this$static.additional = 0;
  this$static.entCol = -1;
  this$static.lo = 0;
  this$static.hi = ($clinit_94() , NAMES).length - 1;
  this$static.candidate = -1;
  this$static.strBufMark = 0;
  this$static.prevValue = -1;
  this$static.value = 0;
  this$static.seenDigits = false;
  this$static.shouldSuspend = false;
  if (this$static.newAttributesEachTime) {
    this$static.attributes = null;
  }
   else {
    this$static.attributes = $HtmlAttributes(new HtmlAttributes(), this$static.mappingLangToXmlLang);
  }
  this$static.alreadyComplainedAboutNonAscii = false;
  this$static.line = this$static.linePrev = 0;
  this$static.col = this$static.colPrev = 1;
  this$static.nextCharOnNewLine = true;
  this$static.prev = 0;
  this$static.alreadyWarnedAboutPrivateUseCharacters = false;
}

function $stateLoop(this$static, state, c, pos, buf, reconsume, returnState, endPos){
  var candidateArr, ch, e, folded, i, val;
  stateloop: for (;;) {
    switch (state) {
      case 0:
        dataloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 38:
              $flushChars(this$static, buf, pos);
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              this$static.additional = 0;
              $LocatorImpl(new LocatorImpl(), this$static);
              returnState = state;
              state = 42;
              continue stateloop;
            case 60:
              $flushChars(this$static, buf, pos);
              state = 4;
              break dataloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 4:
        tagopenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (c >= 65 && c <= 90) {
            this$static.endTag = false;
            this$static.strBuf[0] = c + 32 & 65535;
            this$static.strBufLen = 1;
            state = 6;
            break tagopenloop;
          }
           else if (c >= 97 && c <= 122) {
            this$static.endTag = false;
            this$static.strBuf[0] = c;
            this$static.strBufLen = 1;
            state = 6;
            break tagopenloop;
          }
          switch (c) {
            case 33:
              state = 16;
              continue stateloop;
            case 47:
              state = 5;
              continue stateloop;
            case 63:
              this$static.longStrBuf[0] = c;
              this$static.longStrBufLen = 1;
              state = 15;
              continue stateloop;
            case 62:
              $characters(this$static.tokenHandler, LT_GT, 0, 2);
              this$static.cstart = pos + 1;
              state = 0;
              continue stateloop;
            default:$characters(this$static.tokenHandler, LT_GT, 0, 1);
              this$static.cstart = pos;
              state = 0;
              reconsume = true;
              continue stateloop;
          }
        }

      case 6:
        tagnameloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              this$static.tagName = elementNameByBuffer(this$static.strBuf, 0, this$static.strBufLen);
              state = 7;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              this$static.tagName = elementNameByBuffer(this$static.strBuf, 0, this$static.strBufLen);
              state = 7;
              break tagnameloop;
            case 47:
              this$static.tagName = elementNameByBuffer(this$static.strBuf, 0, this$static.strBufLen);
              state = 48;
              continue stateloop;
            case 62:
              this$static.tagName = elementNameByBuffer(this$static.strBuf, 0, this$static.strBufLen);
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            default:if (c >= 65 && c <= 90) {
                c += 32;
              }

              $appendStrBuf(this$static, c);
              continue;
          }
        }

      case 7:
        beforeattributenameloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 47:
              state = 48;
              continue stateloop;
            case 62:
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            case 34:
            case 39:
            case 60:
            case 61:
            default:if (c >= 65 && c <= 90) {
                c += 32;
              }

              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              state = 8;
              break beforeattributenameloop;
          }
        }

      case 8:
        attributenameloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $attributeNameComplete(this$static);
              state = 9;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              $attributeNameComplete(this$static);
              state = 9;
              continue stateloop;
            case 47:
              $attributeNameComplete(this$static);
              $addAttributeWithoutValue(this$static);
              state = 48;
              continue stateloop;
            case 61:
              $attributeNameComplete(this$static);
              state = 10;
              break attributenameloop;
            case 62:
              $attributeNameComplete(this$static);
              $addAttributeWithoutValue(this$static);
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            case 34:
            case 39:
            case 60:
            default:if (c >= 65 && c <= 90) {
                c += 32;
              }

              $appendStrBuf(this$static, c);
              continue;
          }
        }

      case 10:
        beforeattributevalueloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 34:
              this$static.longStrBufLen = 0;
              state = 11;
              break beforeattributevalueloop;
            case 38:
              this$static.longStrBufLen = 0;
              state = 13;
              reconsume = true;
              continue stateloop;
            case 39:
              this$static.longStrBufLen = 0;
              state = 12;
              continue stateloop;
            case 62:
              $addAttributeWithoutValue(this$static);
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            case 60:
            case 61:
              $errLtOrEqualsInUnquotedAttributeOrNull(c);
            default:this$static.longStrBuf[0] = c;
              this$static.longStrBufLen = 1;
              state = 13;
              continue stateloop;
          }
        }

      case 11:
        attributevaluedoublequotedloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 34:
              $addAttributeWithValue(this$static);
              state = 14;
              break attributevaluedoublequotedloop;
            case 38:
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              this$static.additional = 34;
              $LocatorImpl(new LocatorImpl(), this$static);
              returnState = state;
              state = 42;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 14:
        afterattributevaluequotedloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              state = 7;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              state = 7;
              continue stateloop;
            case 47:
              state = 48;
              break afterattributevaluequotedloop;
            case 62:
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            default:state = 7;
              reconsume = true;
              continue stateloop;
          }
        }

      case 48:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        switch (c) {
          case 62:
            state = $emitCurrentTagToken(this$static, true, pos);
            if (this$static.shouldSuspend) {
              break stateloop;
            }

            continue stateloop;
          default:state = 7;
            reconsume = true;
            continue stateloop;
        }

      case 13:
        for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $addAttributeWithValue(this$static);
              state = 7;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              $addAttributeWithValue(this$static);
              state = 7;
              continue stateloop;
            case 38:
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              this$static.additional = 62;
              $LocatorImpl(new LocatorImpl(), this$static);
              returnState = state;
              state = 42;
              continue stateloop;
            case 62:
              $addAttributeWithValue(this$static);
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            case 60:
            case 34:
            case 39:
            case 61:
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 9:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 47:
              $addAttributeWithoutValue(this$static);
              state = 48;
              continue stateloop;
            case 61:
              state = 10;
              continue stateloop;
            case 62:
              $addAttributeWithoutValue(this$static);
              state = $emitCurrentTagToken(this$static, false, pos);
              if (this$static.shouldSuspend) {
                break stateloop;
              }

              continue stateloop;
            case 0:
              c = 65533;
            case 34:
            case 39:
            case 60:
            default:$addAttributeWithoutValue(this$static);
              if (c >= 65 && c <= 90) {
                c += 32;
              }

              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              state = 8;
              continue stateloop;
          }
        }

      case 15:
        boguscommentloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 62:
              $emitComment(this$static, 0, pos);
              state = 0;
              continue stateloop;
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 59;
              break boguscommentloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 59:
        boguscommenthyphenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 62:
              $maybeAppendSpaceToBogusComment(this$static);
              $emitComment(this$static, 0, pos);
              state = 0;
              continue stateloop;
            case 45:
              $appendSecondHyphenToBogusComment(this$static);
              continue boguscommenthyphenloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              state = 15;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              state = 15;
              continue stateloop;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              state = 15;
              continue stateloop;
          }
        }

      case 16:
        markupdeclarationopenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              this$static.longStrBuf[0] = c;
              this$static.longStrBufLen = 1;
              state = 38;
              break markupdeclarationopenloop;
            case 100:
            case 68:
              this$static.longStrBuf[0] = c;
              this$static.longStrBufLen = 1;
              this$static.index = 0;
              state = 39;
              continue stateloop;
            case 91:
              if (this$static.tokenHandler.foreignFlag == 0) {
                this$static.longStrBuf[0] = c;
                this$static.longStrBufLen = 1;
                this$static.index = 0;
                state = 49;
                continue stateloop;
              }
               else {
              }

            default:this$static.longStrBufLen = 0;
              state = 15;
              reconsume = true;
              continue stateloop;
          }
        }

      case 38:
        markupdeclarationhyphenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 0:
              break stateloop;
            case 45:
              this$static.longStrBufLen = 0;
              state = 30;
              break markupdeclarationhyphenloop;
            default:state = 15;
              reconsume = true;
              continue stateloop;
          }
        }

      case 30:
        commentstartloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 31;
              continue stateloop;
            case 62:
              $emitComment(this$static, 0, pos);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              state = 32;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              state = 32;
              break commentstartloop;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              state = 32;
              break commentstartloop;
          }
        }

      case 32:
        commentloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 33;
              break commentloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 33:
        commentenddashloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 34;
              break commentenddashloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              state = 32;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              state = 32;
              continue stateloop;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              state = 32;
              continue stateloop;
          }
        }

      case 34:
        commentendloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 62:
              $emitComment(this$static, 2, pos);
              state = 0;
              continue stateloop;
            case 45:
              $adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, c);
              continue;
            case 32:
            case 9:
            case 12:
              $adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, c);
              state = 35;
              break commentendloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, 10);
              state = 35;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, 10);
              state = 35;
              break commentendloop;
            case 33:
              $appendLongStrBuf(this$static, c);
              state = 36;
              continue stateloop;
            case 0:
              c = 65533;
            default:$adjustDoubleHyphenAndAppendToLongStrBufAndErr(this$static, c);
              state = 32;
              continue stateloop;
          }
        }

      case 35:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 62:
              $emitComment(this$static, 0, pos);
              state = 0;
              continue stateloop;
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 33;
              continue stateloop;
            case 32:
            case 9:
            case 12:
              $appendLongStrBuf(this$static, c);
              continue;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              state = 32;
              continue stateloop;
          }
        }

      case 36:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 62:
              $emitComment(this$static, 3, pos);
              state = 0;
              continue stateloop;
            case 45:
              $appendLongStrBuf(this$static, c);
              state = 33;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              state = 32;
              continue stateloop;
          }
        }

      case 31:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        switch (c) {
          case 45:
            $appendLongStrBuf(this$static, c);
            state = 34;
            continue stateloop;
          case 62:
            $emitComment(this$static, 1, pos);
            state = 0;
            continue stateloop;
          case 13:
            this$static.nextCharOnNewLine = true;
            this$static.lastCR = true;
            $appendLongStrBuf(this$static, 10);
            state = 32;
            break stateloop;
          case 10:
            this$static.nextCharOnNewLine = true;
            $appendLongStrBuf(this$static, 10);
            state = 32;
            continue stateloop;
          case 0:
            c = 65533;
          default:$appendLongStrBuf(this$static, c);
            state = 32;
            continue stateloop;
        }

      case 39:
        markupdeclarationdoctypeloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.index < 6) {
            folded = c;
            if (c >= 65 && c <= 90) {
              folded += 32;
            }
            if (folded == OCTYPE[this$static.index]) {
              $appendLongStrBuf(this$static, c);
            }
             else {
              state = 15;
              reconsume = true;
              continue stateloop;
            }
            ++this$static.index;
            continue;
          }
           else {
            state = 17;
            reconsume = true;
            break markupdeclarationdoctypeloop;
          }
        }

      case 17:
        doctypeloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          this$static.doctypeName = '';
          this$static.systemIdentifier = null;
          this$static.publicIdentifier = null;
          this$static.forceQuirks = false;
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              state = 18;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              state = 18;
              break doctypeloop;
            default:state = 18;
              reconsume = true;
              break doctypeloop;
          }
        }

      case 18:
        beforedoctypenameloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 62:
              this$static.forceQuirks = true;
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 0:
              c = 65533;
            default:if (c >= 65 && c <= 90) {
                c += 32;
              }

              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              state = 19;
              break beforedoctypenameloop;
          }
        }

      case 19:
        doctypenameloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              this$static.doctypeName = String(valueOf_1(this$static.strBuf, 0, this$static.strBufLen));
              state = 20;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              this$static.doctypeName = String(valueOf_1(this$static.strBuf, 0, this$static.strBufLen));
              state = 20;
              break doctypenameloop;
            case 62:
              this$static.doctypeName = String(valueOf_1(this$static.strBuf, 0, this$static.strBufLen));
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 0:
              c = 65533;
            default:if (c >= 65 && c <= 90) {
                c += 32;
              }

              $appendStrBuf(this$static, c);
              continue;
          }
        }

      case 20:
        afterdoctypenameloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 62:
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 112:
            case 80:
              this$static.index = 0;
              state = 40;
              break afterdoctypenameloop;
            case 115:
            case 83:
              this$static.index = 0;
              state = 41;
              continue stateloop;
            default:this$static.forceQuirks = true;
              state = 29;
              continue stateloop;
          }
        }

      case 40:
        doctypeublicloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.index < 5) {
            folded = c;
            if (c >= 65 && c <= 90) {
              folded += 32;
            }
            if (folded != UBLIC[this$static.index]) {
              this$static.forceQuirks = true;
              state = 29;
              reconsume = true;
              continue stateloop;
            }
            ++this$static.index;
            continue;
          }
           else {
            state = 21;
            reconsume = true;
            break doctypeublicloop;
          }
        }

      case 21:
        beforedoctypepublicidentifierloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 34:
              this$static.longStrBufLen = 0;
              state = 22;
              break beforedoctypepublicidentifierloop;
            case 39:
              this$static.longStrBufLen = 0;
              state = 23;
              continue stateloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            default:this$static.forceQuirks = true;
              state = 29;
              continue stateloop;
          }
        }

      case 22:
        doctypepublicidentifierdoublequotedloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 34:
              this$static.publicIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              state = 24;
              break doctypepublicidentifierdoublequotedloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.publicIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 24:
        afterdoctypepublicidentifierloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 34:
              this$static.longStrBufLen = 0;
              state = 26;
              break afterdoctypepublicidentifierloop;
            case 39:
              this$static.longStrBufLen = 0;
              state = 27;
              continue stateloop;
            case 62:
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            default:this$static.forceQuirks = true;
              state = 29;
              continue stateloop;
          }
        }

      case 26:
        doctypesystemidentifierdoublequotedloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 34:
              this$static.systemIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              state = 28;
              continue stateloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.systemIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 28:
        afterdoctypesystemidentifierloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 62:
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            default:this$static.forceQuirks = false;
              state = 29;
              break afterdoctypesystemidentifierloop;
          }
        }

      case 29:
        for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 62:
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 41:
        doctypeystemloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.index < 5) {
            folded = c;
            if (c >= 65 && c <= 90) {
              folded += 32;
            }
            if (folded != YSTEM[this$static.index]) {
              this$static.forceQuirks = true;
              state = 29;
              reconsume = true;
              continue stateloop;
            }
            ++this$static.index;
            continue stateloop;
          }
           else {
            state = 25;
            reconsume = true;
            break doctypeystemloop;
          }
        }

      case 25:
        beforedoctypesystemidentifierloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            case 32:
            case 9:
            case 12:
              continue;
            case 34:
              this$static.longStrBufLen = 0;
              state = 26;
              continue stateloop;
            case 39:
              this$static.longStrBufLen = 0;
              state = 27;
              break beforedoctypesystemidentifierloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            default:this$static.forceQuirks = true;
              state = 29;
              continue stateloop;
          }
        }

      case 27:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 39:
              this$static.systemIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              state = 28;
              continue stateloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.systemIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 23:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 39:
              this$static.publicIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              state = 24;
              continue stateloop;
            case 62:
              this$static.forceQuirks = true;
              this$static.publicIdentifier = valueOf_1(this$static.longStrBuf, 0, this$static.longStrBufLen);
              this$static.cstart = pos + 1;
              $doctype(this$static.tokenHandler, this$static.doctypeName, this$static.publicIdentifier, this$static.systemIdentifier, this$static.forceQuirks);
              state = 0;
              continue stateloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 49:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.index < 6) {
            if (c == CDATA_LSQB[this$static.index]) {
              $appendLongStrBuf(this$static, c);
            }
             else {
              state = 15;
              reconsume = true;
              continue stateloop;
            }
            ++this$static.index;
            continue;
          }
           else {
            this$static.cstart = pos;
            state = 50;
            reconsume = true;
            break;
          }
        }

      case 50:
        cdatasectionloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 93:
              $flushChars(this$static, buf, pos);
              state = 51;
              break cdatasectionloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 51:
        cdatarsqb: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 93:
              state = 52;
              break cdatarsqb;
            default:$characters(this$static.tokenHandler, RSQB_RSQB, 0, 1);
              this$static.cstart = pos;
              state = 50;
              reconsume = true;
              continue stateloop;
          }
        }

      case 52:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        switch (c) {
          case 62:
            this$static.cstart = pos + 1;
            state = 0;
            continue stateloop;
          default:$characters(this$static.tokenHandler, RSQB_RSQB, 0, 2);
            this$static.cstart = pos;
            state = 50;
            reconsume = true;
            continue stateloop;
        }

      case 12:
        attributevaluesinglequotedloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 39:
              $addAttributeWithValue(this$static);
              state = 14;
              continue stateloop;
            case 38:
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              this$static.additional = 39;
              $LocatorImpl(new LocatorImpl(), this$static);
              returnState = state;
              state = 42;
              break attributevaluesinglequotedloop;
            case 13:
              this$static.nextCharOnNewLine = true;
              this$static.lastCR = true;
              $appendLongStrBuf(this$static, 10);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
              $appendLongStrBuf(this$static, 10);
              continue;
            case 0:
              c = 65533;
            default:$appendLongStrBuf(this$static, c);
              continue;
          }
        }

      case 42:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        if (c == 0) {
          break stateloop;
        }

        switch (c) {
          case 32:
          case 9:
          case 10:
          case 13:
          case 12:
          case 60:
          case 38:
            $emitOrAppendStrBuf(this$static, returnState);
            if ((returnState & -2) == 0) {
              this$static.cstart = pos;
            }

            state = returnState;
            reconsume = true;
            continue stateloop;
          case 35:
            $appendStrBuf(this$static, 35);
            state = 43;
            continue stateloop;
          default:if (c == this$static.additional) {
              $emitOrAppendStrBuf(this$static, returnState);
              state = returnState;
              reconsume = true;
              continue stateloop;
            }

            this$static.entCol = -1;
            this$static.lo = 0;
            this$static.hi = ($clinit_94() , NAMES).length - 1;
            this$static.candidate = -1;
            this$static.strBufMark = 0;
            state = 44;
            reconsume = true;
        }

      case 44:
        outer: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          if (c == 0) {
            break stateloop;
          }
          ++this$static.entCol;
          hiloop: for (;;) {
            if (this$static.hi == -1) {
              break hiloop;
            }
            if (this$static.entCol == ($clinit_94() , NAMES)[this$static.hi].length) {
              break hiloop;
            }
            if (this$static.entCol > NAMES[this$static.hi].length) {
              break outer;
            }
             else if (c < NAMES[this$static.hi][this$static.entCol]) {
              --this$static.hi;
            }
             else {
              break hiloop;
            }
          }
          loloop: for (;;) {
            if (this$static.hi < this$static.lo) {
              break outer;
            }
            if (this$static.entCol == ($clinit_94() , NAMES)[this$static.lo].length) {
              this$static.candidate = this$static.lo;
              this$static.strBufMark = this$static.strBufLen;
              ++this$static.lo;
            }
             else if (this$static.entCol > NAMES[this$static.lo].length) {
              break outer;
            }
             else if (c > NAMES[this$static.lo][this$static.entCol]) {
              ++this$static.lo;
            }
             else {
              break loloop;
            }
          }
          if (this$static.hi < this$static.lo) {
            break outer;
          }
          $appendStrBuf(this$static, c);
          continue;
        }

        if (this$static.candidate == -1) {
          $emitOrAppendStrBuf(this$static, returnState);
          if ((returnState & -2) == 0) {
            this$static.cstart = pos;
          }
          state = returnState;
          reconsume = true;
          continue stateloop;
        }
         else {
          candidateArr = ($clinit_94() , NAMES)[this$static.candidate];
          if (candidateArr[candidateArr.length - 1] != 59) {
            if ((returnState & -2) != 0) {
              if (this$static.strBufMark == this$static.strBufLen) {
                ch = c;
              }
               else {
                ch = this$static.strBuf[this$static.strBufMark];
              }
              if (ch >= 48 && ch <= 57 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122) {
                $appendLongStrBuf_0(this$static, this$static.strBuf, 0, this$static.strBufLen);
                state = returnState;
                reconsume = true;
                continue stateloop;
              }
            }
          }
          val = VALUES_0[this$static.candidate];
          $emitOrAppend(this$static, val, returnState);
          if (this$static.strBufMark < this$static.strBufLen) {
            if ((returnState & -2) != 0) {
              for (i = this$static.strBufMark; i < this$static.strBufLen; ++i) {
                $appendLongStrBuf(this$static, this$static.strBuf[i]);
              }
            }
             else {
              $characters(this$static.tokenHandler, this$static.strBuf, this$static.strBufMark, this$static.strBufLen - this$static.strBufMark);
            }
          }
          if ((returnState & -2) == 0) {
            this$static.cstart = pos;
          }
          state = returnState;
          reconsume = true;
          continue stateloop;
        }

      case 43:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        this$static.prevValue = -1;
        this$static.value = 0;
        this$static.seenDigits = false;
        switch (c) {
          case 120:
          case 88:
            $appendStrBuf(this$static, c);
            state = 45;
            continue stateloop;
          default:state = 46;
            reconsume = true;
        }

      case 46:
        decimalloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          if (this$static.value < this$static.prevValue) {
            this$static.value = 1114112;
          }
          this$static.prevValue = this$static.value;
          if (c >= 48 && c <= 57) {
            this$static.seenDigits = true;
            this$static.value *= 10;
            this$static.value += c - 48;
            continue;
          }
           else if (c == 59) {
            if (this$static.seenDigits) {
              if ((returnState & -2) == 0) {
                this$static.cstart = pos + 1;
              }
              state = 47;
              break decimalloop;
            }
             else {
              'No digits after \u201C' + valueOf_1(this$static.strBuf, 0, this$static.strBufLen) + '\u201D.';
              $appendStrBuf(this$static, 59);
              $emitOrAppendStrBuf(this$static, returnState);
              if ((returnState & -2) == 0) {
                this$static.cstart = pos + 1;
              }
              state = returnState;
              continue stateloop;
            }
          }
           else {
            if (this$static.seenDigits) {
              if ((returnState & -2) == 0) {
                this$static.cstart = pos;
              }
              state = 47;
              reconsume = true;
              break decimalloop;
            }
             else {
              'No digits after \u201C' + valueOf_1(this$static.strBuf, 0, this$static.strBufLen) + '\u201D.';
              $emitOrAppendStrBuf(this$static, returnState);
              if ((returnState & -2) == 0) {
                this$static.cstart = pos;
              }
              state = returnState;
              reconsume = true;
              continue stateloop;
            }
          }
        }

      case 47:
        $handleNcrValue(this$static, returnState);
        state = returnState;
        continue stateloop;
      case 45:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.value < this$static.prevValue) {
            this$static.value = 1114112;
          }
          this$static.prevValue = this$static.value;
          if (c >= 48 && c <= 57) {
            this$static.seenDigits = true;
            this$static.value *= 16;
            this$static.value += c - 48;
            continue;
          }
           else if (c >= 65 && c <= 70) {
            this$static.seenDigits = true;
            this$static.value *= 16;
            this$static.value += c - 65 + 10;
            continue;
          }
           else if (c >= 97 && c <= 102) {
            this$static.seenDigits = true;
            this$static.value *= 16;
            this$static.value += c - 97 + 10;
            continue;
          }
           else if (c == 59) {
            if (this$static.seenDigits) {
              if ((returnState & -2) == 0) {
                this$static.cstart = pos + 1;
              }
              state = 47;
              continue stateloop;
            }
             else {
              'No digits after \u201C' + valueOf_1(this$static.strBuf, 0, this$static.strBufLen) + '\u201D.';
              $appendStrBuf(this$static, 59);
              $emitOrAppendStrBuf(this$static, returnState);
              if ((returnState & -2) == 0) {
                this$static.cstart = pos + 1;
              }
              state = returnState;
              continue stateloop;
            }
          }
           else {
            if (this$static.seenDigits) {
              if ((returnState & -2) == 0) {
                this$static.cstart = pos;
              }
              state = 47;
              reconsume = true;
              continue stateloop;
            }
             else {
              'No digits after \u201C' + valueOf_1(this$static.strBuf, 0, this$static.strBufLen) + '\u201D.';
              $emitOrAppendStrBuf(this$static, returnState);
              if ((returnState & -2) == 0) {
                this$static.cstart = pos;
              }
              state = returnState;
              reconsume = true;
              continue stateloop;
            }
          }
        }

      case 3:
        plaintextloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 2:
        cdataloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 60:
              $flushChars(this$static, buf, pos);
              returnState = state;
              state = 53;
              break cdataloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 53:
        tagopennonpcdataloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 33:
              $characters(this$static.tokenHandler, LT_GT, 0, 1);
              this$static.cstart = pos;
              state = 54;
              break tagopennonpcdataloop;
            case 47:
              if (this$static.contentModelElement) {
                this$static.index = 0;
                this$static.strBufLen = 0;
                state = 37;
                continue stateloop;
              }

            default:$characters(this$static.tokenHandler, LT_GT, 0, 1);
              this$static.cstart = pos;
              state = returnState;
              reconsume = true;
              continue stateloop;
          }
        }

      case 54:
        escapeexclamationloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              state = 55;
              break escapeexclamationloop;
            default:state = returnState;
              reconsume = true;
              continue stateloop;
          }
        }

      case 55:
        escapeexclamationhyphenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              state = 58;
              break escapeexclamationhyphenloop;
            default:state = returnState;
              reconsume = true;
              continue stateloop;
          }
        }

      case 58:
        escapehyphenhyphenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              continue;
            case 62:
              state = returnState;
              continue stateloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              state = 56;
              break escapehyphenhyphenloop;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              state = 56;
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:state = 56;
              break escapehyphenhyphenloop;
          }
        }

      case 56:
        escapeloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              state = 57;
              break escapeloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

      case 57:
        escapehyphenloop: for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          switch (c) {
            case 45:
              state = 58;
              continue stateloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              state = 56;
              continue stateloop;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              state = 56;
              continue stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:state = 56;
              continue stateloop;
          }
        }

      case 37:
        for (;;) {
          if (++pos == endPos) {
            break stateloop;
          }
          c = $checkChar(this$static, buf, pos);
          if (this$static.index < this$static.contentModelElementNameAsArray.length) {
            e = this$static.contentModelElementNameAsArray[this$static.index];
            folded = c;
            if (c >= 65 && c <= 90) {
              folded += 32;
            }
            if (folded != e) {
              this$static.html4 && (this$static.index > 0 || folded >= 97 && folded <= 122) && ($clinit_89() , IFRAME) != this$static.contentModelElement;
              $characters(this$static.tokenHandler, LT_SOLIDUS, 0, 2);
              $emitStrBuf(this$static);
              this$static.cstart = pos;
              state = returnState;
              reconsume = true;
              continue stateloop;
            }
            $appendStrBuf(this$static, c);
            ++this$static.index;
            continue;
          }
           else {
            this$static.endTag = true;
            this$static.tagName = this$static.contentModelElement;
            switch (c) {
              case 13:
                this$static.nextCharOnNewLine = true;
                this$static.lastCR = true;
                state = 7;
                break stateloop;
              case 10:
                this$static.nextCharOnNewLine = true;
              case 32:
              case 9:
              case 12:
                state = 7;
                continue stateloop;
              case 62:
                state = $emitCurrentTagToken(this$static, false, pos);
                if (this$static.shouldSuspend) {
                  break stateloop;
                }

                continue stateloop;
              case 47:
                state = 48;
                continue stateloop;
              default:$characters(this$static.tokenHandler, LT_SOLIDUS, 0, 2);
                $emitStrBuf(this$static);
                if (c == 0) {
                  $emitReplacementCharacter(this$static, buf, pos);
                }
                 else {
                  this$static.cstart = pos;
                }

                state = returnState;
                continue stateloop;
            }
          }
        }

      case 5:
        if (++pos == endPos) {
          break stateloop;
        }

        c = $checkChar(this$static, buf, pos);
        switch (c) {
          case 62:
            this$static.cstart = pos + 1;
            state = 0;
            continue stateloop;
          case 13:
            this$static.nextCharOnNewLine = true;
            this$static.lastCR = true;
            this$static.longStrBuf[0] = 10;
            this$static.longStrBufLen = 1;
            state = 15;
            break stateloop;
          case 10:
            this$static.nextCharOnNewLine = true;
            this$static.longStrBuf[0] = 10;
            this$static.longStrBufLen = 1;
            state = 15;
            continue stateloop;
          case 0:
            c = 65533;
          default:if (c >= 65 && c <= 90) {
              c += 32;
            }

            if (c >= 97 && c <= 122) {
              this$static.endTag = true;
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              state = 6;
              continue stateloop;
            }
             else {
              this$static.longStrBuf[0] = c;
              this$static.longStrBufLen = 1;
              state = 15;
              continue stateloop;
            }

        }

      case 1:
        rcdataloop: for (;;) {
          if (reconsume) {
            reconsume = false;
          }
           else {
            if (++pos == endPos) {
              break stateloop;
            }
            c = $checkChar(this$static, buf, pos);
          }
          switch (c) {
            case 38:
              $flushChars(this$static, buf, pos);
              this$static.strBuf[0] = c;
              this$static.strBufLen = 1;
              this$static.additional = 0;
              returnState = state;
              state = 42;
              continue stateloop;
            case 60:
              $flushChars(this$static, buf, pos);
              returnState = state;
              state = 53;
              continue stateloop;
            case 0:
              $emitReplacementCharacter(this$static, buf, pos);
              continue;
            case 13:
              $emitCarriageReturn(this$static, buf, pos);
              break stateloop;
            case 10:
              this$static.nextCharOnNewLine = true;
            default:continue;
          }
        }

    }
  }
  $flushChars(this$static, buf, pos);
  this$static.stateSave = state;
  this$static.returnStateSave = returnState;
  return pos;
}

function $tokenizeBuffer(this$static, buffer){
  var pos, returnState, start, state;
  state = this$static.stateSave;
  returnState = this$static.returnStateSave;
  this$static.shouldSuspend = false;
  this$static.lastCR = false;
  start = buffer.start;
  pos = start - 1;
  switch (state) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 50:
    case 56:
    case 54:
    case 55:
    case 57:
    case 58:
      this$static.cstart = start;
      break;
    default:this$static.cstart = 2147483647;
  }
  pos = $stateLoop(this$static, state, 0, pos, buffer.buffer, false, returnState, buffer.end);
  if (pos == buffer.end) {
    buffer.start = pos;
  }
   else {
    buffer.start = pos + 1;
  }
  return this$static.lastCR;
}

function getClass_56(){
  return Lnu_validator_htmlparser_impl_Tokenizer_2_classLit;
}

function newAsciiLowerCaseStringFromString(str){
  var buf, c, i;
  if (str == null) {
    return null;
  }
  buf = initDim(_3C_classLit, 42, -1, str.length, 1);
  for (i = 0; i < str.length; ++i) {
    c = str.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      c += 32;
    }
    buf[i] = c;
  }
  return String.fromCharCode.apply(null, buf);
}

function Tokenizer(){
}

_ = Tokenizer.prototype = new Object_0();
_.getClass$ = getClass_56;
_.typeId$ = 0;
_.additional = 0;
_.astralChar = null;
_.attributeName = null;
_.attributes = null;
_.bmpChar = null;
_.candidate = 0;
_.confident = false;
_.contentModelElement = null;
_.contentModelElementNameAsArray = null;
_.cstart = 0;
_.doctypeName = null;
_.endTag = false;
_.entCol = 0;
_.forceQuirks = false;
_.hi = 0;
_.html4 = false;
_.html4ModeCompatibleWithXhtml1Schemata = false;
_.index = 0;
_.lastCR = false;
_.lo = 0;
_.longStrBuf = null;
_.longStrBufLen = 0;
_.mappingLangToXmlLang = 0;
_.metaBoundaryPassed = false;
_.newAttributesEachTime = false;
_.prevValue = 0;
_.publicIdentifier = null;
_.returnStateSave = 0;
_.seenDigits = false;
_.shouldSuspend = false;
_.stateSave = 0;
_.strBuf = null;
_.strBufLen = 0;
_.strBufMark = 0;
_.systemIdentifier = null;
_.tagName = null;
_.tokenHandler = null;
_.value = 0;
_.wantsComments = false;
var CDATA_LSQB, IFRAME_ARR, LF, LT_GT, LT_SOLIDUS, NOEMBED_ARR, NOFRAMES_ARR, NOSCRIPT_ARR, OCTYPE, PLAINTEXT_ARR, REPLACEMENT_CHARACTER, RSQB_RSQB, SCRIPT_ARR, SPACE, STYLE_ARR, TEXTAREA_ARR, TITLE_ARR, UBLIC, XMP_ARR, YSTEM;
function $clinit_90(){
  $clinit_90 = nullMethod;
  $clinit_97();
}

function $ErrorReportingTokenizer(this$static, tokenHandler){
  $clinit_90();
  this$static.contentSpacePolicy = ($clinit_80() , ALTER_INFOSET);
  this$static.commentPolicy = ALTER_INFOSET;
  this$static.xmlnsPolicy = ALTER_INFOSET;
  this$static.namePolicy = ALTER_INFOSET;
  this$static.tokenHandler = tokenHandler;
  this$static.newAttributesEachTime = false;
  this$static.bmpChar = initDim(_3C_classLit, 42, -1, 1, 1);
  this$static.astralChar = initDim(_3C_classLit, 42, -1, 2, 1);
  this$static.contentNonXmlCharPolicy = ALTER_INFOSET;
  return this$static;
}

function $checkChar(this$static, buf, pos){
  var c, intVal;
  this$static.linePrev = this$static.line;
  this$static.colPrev = this$static.col;
  if (this$static.nextCharOnNewLine) {
    ++this$static.line;
    this$static.col = 1;
    this$static.nextCharOnNewLine = false;
  }
   else {
    ++this$static.col;
  }
  c = buf[pos];
  if (!this$static.confident && !this$static.alreadyComplainedAboutNonAscii && c > 127) {
    this$static.alreadyComplainedAboutNonAscii = true;
  }
  switch (c) {
    case 0:
    case 9:
    case 13:
    case 10:
      break;
    case 12:
      if (this$static.contentNonXmlCharPolicy == ($clinit_80() , FATAL)) {
        $fatal(this$static, 'This document is not mappable to XML 1.0 without data loss due to ' + $toUPlusString(c) + ' which is not a legal XML 1.0 character.');
      }
       else {
        if (this$static.contentNonXmlCharPolicy == ALTER_INFOSET) {
          c = buf[pos] = 32;
        }
        'This document is not mappable to XML 1.0 without data loss due to ' + $toUPlusString(c) + ' which is not a legal XML 1.0 character.';
      }

      break;
    default:if ((c & 64512) == 56320) {
        if ((this$static.prev & 64512) == 55296) {
          intVal = (this$static.prev << 10) + c + -56613888;
          if (intVal >= 983040 && intVal <= 1048573 || intVal >= 1048576 && intVal <= 1114109) {
            $warnAboutPrivateUseChar(this$static);
          }
        }
      }
       else if (c < 32 || (c & 65534) == 65534) {
        switch (this$static.contentNonXmlCharPolicy.ordinal) {
          case 1:
            $fatal(this$static, 'Forbidden code point ' + $toUPlusString(c) + '.');
            break;
          case 2:
            c = buf[pos] = 65533;
          case 0:
            'Forbidden code point ' + $toUPlusString(c) + '.';
        }
      }
       else if (c >= 127 && c <= 159 || c >= 64976 && c <= 64991) {
        'Forbidden code point ' + $toUPlusString(c) + '.';
      }
       else if (c >= 57344 && c <= 63743) {
        $warnAboutPrivateUseChar(this$static);
      }

  }
  this$static.prev = c;
  return c;
}

function $errLtOrEqualsInUnquotedAttributeOrNull(c){
  switch (c) {
    case 61:
      return;
    case 60:
      return;
  }
}

function $flushChars(this$static, buf, pos){
  var currCol, currLine;
  if (pos > this$static.cstart) {
    currLine = this$static.line;
    currCol = this$static.col;
    this$static.line = this$static.linePrev;
    this$static.col = this$static.colPrev;
    $characters(this$static.tokenHandler, buf, this$static.cstart, pos - this$static.cstart);
    this$static.line = currLine;
    this$static.col = currCol;
  }
  this$static.cstart = 2147483647;
}

function $getColumnNumber(this$static){
  if (this$static.col > 0) {
    return this$static.col;
  }
   else {
    return -1;
  }
}

function $getLineNumber(this$static){
  if (this$static.line > 0) {
    return this$static.line;
  }
   else {
    return -1;
  }
}

function $toUPlusString(c){
  var hexString;
  hexString = toPowerOfTwoString(c, 4);
  switch (hexString.length) {
    case 1:
      return 'U+000' + hexString;
    case 2:
      return 'U+00' + hexString;
    case 3:
      return 'U+0' + hexString;
    case 4:
      return 'U+' + hexString;
    default:throw $RuntimeException(new RuntimeException(), 'Unreachable.');
  }
}

function $warnAboutPrivateUseChar(this$static){
  if (!this$static.alreadyWarnedAboutPrivateUseCharacters) {
    this$static.alreadyWarnedAboutPrivateUseCharacters = true;
  }
}

function getClass_52(){
  return Lnu_validator_htmlparser_impl_ErrorReportingTokenizer_2_classLit;
}

function ErrorReportingTokenizer(){
}

_ = ErrorReportingTokenizer.prototype = new Tokenizer();
_.getClass$ = getClass_52;
_.typeId$ = 0;
_.alreadyComplainedAboutNonAscii = false;
_.alreadyWarnedAboutPrivateUseCharacters = false;
_.col = 0;
_.colPrev = 0;
_.line = 0;
_.linePrev = 0;
_.nextCharOnNewLine = false;
_.prev = 0;
function $clinit_91(){
  $clinit_91 = nullMethod;
  EMPTY_ATTRIBUTENAMES = initDim(_3Lnu_validator_htmlparser_impl_AttributeName_2_classLit, 49, 9, 0, 0);
  EMPTY_STRINGS = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 0, 0);
  EMPTY_ATTRIBUTES = $HtmlAttributes(new HtmlAttributes(), 0);
}

function $HtmlAttributes(this$static, mode){
  $clinit_91();
  this$static.mode = mode;
  this$static.length_0 = 0;
  this$static.names = initDim(_3Lnu_validator_htmlparser_impl_AttributeName_2_classLit, 49, 9, 5, 0);
  this$static.values = initDim(_3Ljava_lang_String_2_classLit, 48, 1, 5, 0);
  this$static.xmlnsLength = 0;
  this$static.xmlnsNames = EMPTY_ATTRIBUTENAMES;
  this$static.xmlnsValues = EMPTY_STRINGS;
  return this$static;
}

function $addAttribute(this$static, name, value, xmlnsPolicy){
  var newLen, newNames, newValues;
  name == ($clinit_87() , ID);
  if (name.xmlns) {
    if (this$static.xmlnsNames.length == this$static.xmlnsLength) {
      newLen = this$static.xmlnsLength == 0?2:this$static.xmlnsLength << 1;
      newNames = initDim(_3Lnu_validator_htmlparser_impl_AttributeName_2_classLit, 49, 9, newLen, 0);
      arraycopy(this$static.xmlnsNames, 0, newNames, 0, this$static.xmlnsNames.length);
      this$static.xmlnsNames = newNames;
      newValues = initDim(_3Ljava_lang_String_2_classLit, 48, 1, newLen, 0);
      arraycopy(this$static.xmlnsValues, 0, newValues, 0, this$static.xmlnsValues.length);
      this$static.xmlnsValues = newValues;
    }
    this$static.xmlnsNames[this$static.xmlnsLength] = name;
    this$static.xmlnsValues[this$static.xmlnsLength] = value;
    ++this$static.xmlnsLength;
    switch (xmlnsPolicy.ordinal) {
      case 1:
        throw $SAXException(new SAXException(), 'Saw an xmlns attribute.');
      case 2:
        return;
    }
  }
  if (this$static.names.length == this$static.length_0) {
    newLen = this$static.length_0 << 1;
    newNames = initDim(_3Lnu_validator_htmlparser_impl_AttributeName_2_classLit, 49, 9, newLen, 0);
    arraycopy(this$static.names, 0, newNames, 0, this$static.names.length);
    this$static.names = newNames;
    newValues = initDim(_3Ljava_lang_String_2_classLit, 48, 1, newLen, 0);
    arraycopy(this$static.values, 0, newValues, 0, this$static.values.length);
    this$static.values = newValues;
  }
  this$static.names[this$static.length_0] = name;
  this$static.values[this$static.length_0] = value;
  ++this$static.length_0;
}

function $clear_0(this$static, m){
  var i;
  for (i = 0; i < this$static.length_0; ++i) {
    setCheck(this$static.names, i, null);
    setCheck(this$static.values, i, null);
  }
  this$static.length_0 = 0;
  this$static.mode = m;
  for (i = 0; i < this$static.xmlnsLength; ++i) {
    setCheck(this$static.xmlnsNames, i, null);
    setCheck(this$static.xmlnsValues, i, null);
  }
  this$static.xmlnsLength = 0;
}

function $clearWithoutReleasingContents(this$static){
  var i;
  for (i = 0; i < this$static.length_0; ++i) {
    setCheck(this$static.names, i, null);
    setCheck(this$static.values, i, null);
  }
  this$static.length_0 = 0;
}

function $cloneAttributes(this$static){
  var clone, i;
  clone = $HtmlAttributes(new HtmlAttributes(), 0);
  for (i = 0; i < this$static.length_0; ++i) {
    $addAttribute(clone, this$static.names[i], this$static.values[i], ($clinit_80() , ALLOW));
  }
  for (i = 0; i < this$static.xmlnsLength; ++i) {
    $addAttribute(clone, this$static.xmlnsNames[i], this$static.xmlnsValues[i], ($clinit_80() , ALLOW));
  }
  return clone;
}

function $contains(this$static, name){
  var i;
  for (i = 0; i < this$static.length_0; ++i) {
    if (name.local[0] == this$static.names[i].local[0]) {
      return true;
    }
  }
  for (i = 0; i < this$static.xmlnsLength; ++i) {
    if (name.local[0] == this$static.xmlnsNames[i].local[0]) {
      return true;
    }
  }
  return false;
}

function $getAttributeName(this$static, index){
  if (index < this$static.length_0 && index >= 0) {
    return this$static.names[index];
  }
   else {
    return null;
  }
}

function $getIndex(this$static, name){
  var i;
  for (i = 0; i < this$static.length_0; ++i) {
    if (this$static.names[i] == name) {
      return i;
    }
  }
  return -1;
}

function $getLocalName(this$static, index){
  if (index < this$static.length_0 && index >= 0) {
    return this$static.names[index].local[this$static.mode];
  }
   else {
    return null;
  }
}

function $getURI(this$static, index){
  if (index < this$static.length_0 && index >= 0) {
    return this$static.names[index].uri[this$static.mode];
  }
   else {
    return null;
  }
}

function $getValue(this$static, index){
  if (index < this$static.length_0 && index >= 0) {
    return this$static.values[index];
  }
   else {
    return null;
  }
}

function $getValue_0(this$static, name){
  var index;
  index = $getIndex(this$static, name);
  if (index == -1) {
    return null;
  }
   else {
    return $getValue(this$static, index);
  }
}

function $processNonNcNames(this$static, treeBuilder, namePolicy){
  var attName, i, name;
  for (i = 0; i < this$static.length_0; ++i) {
    attName = this$static.names[i];
    if (!attName.ncname[this$static.mode]) {
      name = attName.local[this$static.mode];
      switch (namePolicy.ordinal) {
        case 2:
          this$static.names[i] = ($clinit_87() , $AttributeName(new AttributeName(), ALL_NO_NS, SAME_LOCAL(escapeName(name)), ALL_NO_PREFIX, ALL_NCNAME, false));
        case 0:
          attName != ($clinit_87() , XML_LANG);
          break;
        case 1:
          $fatal_1(treeBuilder, 'Attribute \u201C' + name + '\u201D is not serializable as XML 1.0.');
      }
    }
  }
}

function getClass_53(){
  return Lnu_validator_htmlparser_impl_HtmlAttributes_2_classLit;
}

function HtmlAttributes(){
}

_ = HtmlAttributes.prototype = new Object_0();
_.getClass$ = getClass_53;
_.typeId$ = 0;
_.length_0 = 0;
_.mode = 0;
_.names = null;
_.values = null;
_.xmlnsLength = 0;
_.xmlnsNames = null;
_.xmlnsValues = null;
var EMPTY_ATTRIBUTENAMES, EMPTY_ATTRIBUTES, EMPTY_STRINGS;
function $LocatorImpl(this$static, locator){
  $getColumnNumber(locator);
  $getLineNumber(locator);
  return this$static;
}

function getClass_54(){
  return Lnu_validator_htmlparser_impl_LocatorImpl_2_classLit;
}

function LocatorImpl(){
}

_ = LocatorImpl.prototype = new Object_0();
_.getClass$ = getClass_54;
_.typeId$ = 0;
function $clinit_93(){
  $clinit_93 = nullMethod;
  HEX_TABLE = $toCharArray('0123456789ABCDEF');
}

function appendUHexTo(sb, c){
  var i;
  $append_0(sb, 'U');
  for (i = 0; i < 6; ++i) {
    $append_0(sb, String.fromCharCode(HEX_TABLE[(c & 15728640) >> 20]));
    c <<= 4;
  }
}

function escapeName(str){
  $clinit_93();
  var c, i, next, sb;
  sb = $StringBuilder(new StringBuilder());
  for (i = 0; i < str.length; ++i) {
    c = str.charCodeAt(i);
    if ((c & 64512) == 55296) {
      next = str.charCodeAt(++i);
      appendUHexTo(sb, (c << 10) + next + -56613888);
    }
     else if (i == 0 && !(c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 255 || c >= 256 && c <= 305 || c >= 308 && c <= 318 || c >= 321 && c <= 328 || c >= 330 && c <= 382 || c >= 384 && c <= 451 || c >= 461 && c <= 496 || c >= 500 && c <= 501 || c >= 506 && c <= 535 || c >= 592 && c <= 680 || c >= 699 && c <= 705 || c == 902 || c >= 904 && c <= 906 || c == 908 || c >= 910 && c <= 929 || c >= 931 && c <= 974 || c >= 976 && c <= 982 || c == 986 || c == 988 || c == 990 || c == 992 || c >= 994 && c <= 1011 || c >= 1025 && c <= 1036 || c >= 1038 && c <= 1103 || c >= 1105 && c <= 1116 || c >= 1118 && c <= 1153 || c >= 1168 && c <= 1220 || c >= 1223 && c <= 1224 || c >= 1227 && c <= 1228 || c >= 1232 && c <= 1259 || c >= 1262 && c <= 1269 || c >= 1272 && c <= 1273 || c >= 1329 && c <= 1366 || c == 1369 || c >= 1377 && c <= 1414 || c >= 1488 && c <= 1514 || c >= 1520 && c <= 1522 || c >= 1569 && c <= 1594 || c >= 1601 && c <= 1610 || c >= 1649 && c <= 1719 || c >= 1722 && c <= 1726 || c >= 1728 && c <= 1742 || c >= 1744 && c <= 1747 || c == 1749 || c >= 1765 && c <= 1766 || c >= 2309 && c <= 2361 || c == 2365 || c >= 2392 && c <= 2401 || c >= 2437 && c <= 2444 || c >= 2447 && c <= 2448 || c >= 2451 && c <= 2472 || c >= 2474 && c <= 2480 || c == 2482 || c >= 2486 && c <= 2489 || c >= 2524 && c <= 2525 || c >= 2527 && c <= 2529 || c >= 2544 && c <= 2545 || c >= 2565 && c <= 2570 || c >= 2575 && c <= 2576 || c >= 2579 && c <= 2600 || c >= 2602 && c <= 2608 || c >= 2610 && c <= 2611 || c >= 2613 && c <= 2614 || c >= 2616 && c <= 2617 || c >= 2649 && c <= 2652 || c == 2654 || c >= 2674 && c <= 2676 || c >= 2693 && c <= 2699 || c == 2701 || c >= 2703 && c <= 2705 || c >= 2707 && c <= 2728 || c >= 2730 && c <= 2736 || c >= 2738 && c <= 2739 || c >= 2741 && c <= 2745 || c == 2749 || c == 2784 || c >= 2821 && c <= 2828 || c >= 2831 && c <= 2832 || c >= 2835 && c <= 2856 || c >= 2858 && c <= 2864 || c >= 2866 && c <= 2867 || c >= 2870 && c <= 2873 || c == 2877 || c >= 2908 && c <= 2909 || c >= 2911 && c <= 2913 || c >= 2949 && c <= 2954 || c >= 2958 && c <= 2960 || c >= 2962 && c <= 2965 || c >= 2969 && c <= 2970 || c == 2972 || c >= 2974 && c <= 2975 || c >= 2979 && c <= 2980 || c >= 2984 && c <= 2986 || c >= 2990 && c <= 2997 || c >= 2999 && c <= 3001 || c >= 3077 && c <= 3084 || c >= 3086 && c <= 3088 || c >= 3090 && c <= 3112 || c >= 3114 && c <= 3123 || c >= 3125 && c <= 3129 || c >= 3168 && c <= 3169 || c >= 3205 && c <= 3212 || c >= 3214 && c <= 3216 || c >= 3218 && c <= 3240 || c >= 3242 && c <= 3251 || c >= 3253 && c <= 3257 || c == 3294 || c >= 3296 && c <= 3297 || c >= 3333 && c <= 3340 || c >= 3342 && c <= 3344 || c >= 3346 && c <= 3368 || c >= 3370 && c <= 3385 || c >= 3424 && c <= 3425 || c >= 3585 && c <= 3630 || c == 3632 || c >= 3634 && c <= 3635 || c >= 3648 && c <= 3653 || c >= 3713 && c <= 3714 || c == 3716 || c >= 3719 && c <= 3720 || c == 3722 || c == 3725 || c >= 3732 && c <= 3735 || c >= 3737 && c <= 3743 || c >= 3745 && c <= 3747 || c == 3749 || c == 3751 || c >= 3754 && c <= 3755 || c >= 3757 && c <= 3758 || c == 3760 || c >= 3762 && c <= 3763 || c == 3773 || c >= 3776 && c <= 3780 || c >= 3904 && c <= 3911 || c >= 3913 && c <= 3945 || c >= 4256 && c <= 4293 || c >= 4304 && c <= 4342 || c == 4352 || c >= 4354 && c <= 4355 || c >= 4357 && c <= 4359 || c == 4361 || c >= 4363 && c <= 4364 || c >= 4366 && c <= 4370 || c == 4412 || c == 4414 || c == 4416 || c == 4428 || c == 4430 || c == 4432 || c >= 4436 && c <= 4437 || c == 4441 || c >= 4447 && c <= 4449 || c == 4451 || c == 4453 || c == 4455 || c == 4457 || c >= 4461 && c <= 4462 || c >= 4466 && c <= 4467 || c == 4469 || c == 4510 || c == 4520 || c == 4523 || c >= 4526 && c <= 4527 || c >= 4535 && c <= 4536 || c == 4538 || c >= 4540 && c <= 4546 || c == 4587 || c == 4592 || c == 4601 || c >= 7680 && c <= 7835 || c >= 7840 && c <= 7929 || c >= 7936 && c <= 7957 || c >= 7960 && c <= 7965 || c >= 7968 && c <= 8005 || c >= 8008 && c <= 8013 || c >= 8016 && c <= 8023 || c == 8025 || c == 8027 || c == 8029 || c >= 8031 && c <= 8061 || c >= 8064 && c <= 8116 || c >= 8118 && c <= 8124 || c == 8126 || c >= 8130 && c <= 8132 || c >= 8134 && c <= 8140 || c >= 8144 && c <= 8147 || c >= 8150 && c <= 8155 || c >= 8160 && c <= 8172 || c >= 8178 && c <= 8180 || c >= 8182 && c <= 8188 || c == 8486 || c >= 8490 && c <= 8491 || c == 8494 || c >= 8576 && c <= 8578 || c >= 12353 && c <= 12436 || c >= 12449 && c <= 12538 || c >= 12549 && c <= 12588 || c >= 44032 && c <= 55203 || c >= 19968 && c <= 40869 || c == 12295 || c >= 12321 && c <= 12329 || c == 95)) {
      appendUHexTo(sb, c);
    }
     else if (i != 0 && !(c >= 48 && c <= 57 || c >= 1632 && c <= 1641 || c >= 1776 && c <= 1785 || c >= 2406 && c <= 2415 || c >= 2534 && c <= 2543 || c >= 2662 && c <= 2671 || c >= 2790 && c <= 2799 || c >= 2918 && c <= 2927 || c >= 3047 && c <= 3055 || c >= 3174 && c <= 3183 || c >= 3302 && c <= 3311 || c >= 3430 && c <= 3439 || c >= 3664 && c <= 3673 || c >= 3792 && c <= 3801 || c >= 3872 && c <= 3881 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 255 || c >= 256 && c <= 305 || c >= 308 && c <= 318 || c >= 321 && c <= 328 || c >= 330 && c <= 382 || c >= 384 && c <= 451 || c >= 461 && c <= 496 || c >= 500 && c <= 501 || c >= 506 && c <= 535 || c >= 592 && c <= 680 || c >= 699 && c <= 705 || c == 902 || c >= 904 && c <= 906 || c == 908 || c >= 910 && c <= 929 || c >= 931 && c <= 974 || c >= 976 && c <= 982 || c == 986 || c == 988 || c == 990 || c == 992 || c >= 994 && c <= 1011 || c >= 1025 && c <= 1036 || c >= 1038 && c <= 1103 || c >= 1105 && c <= 1116 || c >= 1118 && c <= 1153 || c >= 1168 && c <= 1220 || c >= 1223 && c <= 1224 || c >= 1227 && c <= 1228 || c >= 1232 && c <= 1259 || c >= 1262 && c <= 1269 || c >= 1272 && c <= 1273 || c >= 1329 && c <= 1366 || c == 1369 || c >= 1377 && c <= 1414 || c >= 1488 && c <= 1514 || c >= 1520 && c <= 1522 || c >= 1569 && c <= 1594 || c >= 1601 && c <= 1610 || c >= 1649 && c <= 1719 || c >= 1722 && c <= 1726 || c >= 1728 && c <= 1742 || c >= 1744 && c <= 1747 || c == 1749 || c >= 1765 && c <= 1766 || c >= 2309 && c <= 2361 || c == 2365 || c >= 2392 && c <= 2401 || c >= 2437 && c <= 2444 || c >= 2447 && c <= 2448 || c >= 2451 && c <= 2472 || c >= 2474 && c <= 2480 || c == 2482 || c >= 2486 && c <= 2489 || c >= 2524 && c <= 2525 || c >= 2527 && c <= 2529 || c >= 2544 && c <= 2545 || c >= 2565 && c <= 2570 || c >= 2575 && c <= 2576 || c >= 2579 && c <= 2600 || c >= 2602 && c <= 2608 || c >= 2610 && c <= 2611 || c >= 2613 && c <= 2614 || c >= 2616 && c <= 2617 || c >= 2649 && c <= 2652 || c == 2654 || c >= 2674 && c <= 2676 || c >= 2693 && c <= 2699 || c == 2701 || c >= 2703 && c <= 2705 || c >= 2707 && c <= 2728 || c >= 2730 && c <= 2736 || c >= 2738 && c <= 2739 || c >= 2741 && c <= 2745 || c == 2749 || c == 2784 || c >= 2821 && c <= 2828 || c >= 2831 && c <= 2832 || c >= 2835 && c <= 2856 || c >= 2858 && c <= 2864 || c >= 2866 && c <= 2867 || c >= 2870 && c <= 2873 || c == 2877 || c >= 2908 && c <= 2909 || c >= 2911 && c <= 2913 || c >= 2949 && c <= 2954 || c >= 2958 && c <= 2960 || c >= 2962 && c <= 2965 || c >= 2969 && c <= 2970 || c == 2972 || c >= 2974 && c <= 2975 || c >= 2979 && c <= 2980 || c >= 2984 && c <= 2986 || c >= 2990 && c <= 2997 || c >= 2999 && c <= 3001 || c >= 3077 && c <= 3084 || c >= 3086 && c <= 3088 || c >= 3090 && c <= 3112 || c >= 3114 && c <= 3123 || c >= 3125 && c <= 3129 || c >= 3168 && c <= 3169 || c >= 3205 && c <= 3212 || c >= 3214 && c <= 3216 || c >= 3218 && c <= 3240 || c >= 3242 && c <= 3251 || c >= 3253 && c <= 3257 || c == 3294 || c >= 3296 && c <= 3297 || c >= 3333 && c <= 3340 || c >= 3342 && c <= 3344 || c >= 3346 && c <= 3368 || c >= 3370 && c <= 3385 || c >= 3424 && c <= 3425 || c >= 3585 && c <= 3630 || c == 3632 || c >= 3634 && c <= 3635 || c >= 3648 && c <= 3653 || c >= 3713 && c <= 3714 || c == 3716 || c >= 3719 && c <= 3720 || c == 3722 || c == 3725 || c >= 3732 && c <= 3735 || c >= 3737 && c <= 3743 || c >= 3745 && c <= 3747 || c == 3749 || c == 3751 || c >= 3754 && c <= 3755 || c >= 3757 && c <= 3758 || c == 3760 || c >= 3762 && c <= 3763 || c == 3773 || c >= 3776 && c <= 3780 || c >= 3904 && c <= 3911 || c >= 3913 && c <= 3945 || c >= 4256 && c <= 4293 || c >= 4304 && c <= 4342 || c == 4352 || c >= 4354 && c <= 4355 || c >= 4357 && c <= 4359 || c == 4361 || c >= 4363 && c <= 4364 || c >= 4366 && c <= 4370 || c == 4412 || c == 4414 || c == 4416 || c == 4428 || c == 4430 || c == 4432 || c >= 4436 && c <= 4437 || c == 4441 || c >= 4447 && c <= 4449 || c == 4451 || c == 4453 || c == 4455 || c == 4457 || c >= 4461 && c <= 4462 || c >= 4466 && c <= 4467 || c == 4469 || c == 4510 || c == 4520 || c == 4523 || c >= 4526 && c <= 4527 || c >= 4535 && c <= 4536 || c == 4538 || c >= 4540 && c <= 4546 || c == 4587 || c == 4592 || c == 4601 || c >= 7680 && c <= 7835 || c >= 7840 && c <= 7929 || c >= 7936 && c <= 7957 || c >= 7960 && c <= 7965 || c >= 7968 && c <= 8005 || c >= 8008 && c <= 8013 || c >= 8016 && c <= 8023 || c == 8025 || c == 8027 || c == 8029 || c >= 8031 && c <= 8061 || c >= 8064 && c <= 8116 || c >= 8118 && c <= 8124 || c == 8126 || c >= 8130 && c <= 8132 || c >= 8134 && c <= 8140 || c >= 8144 && c <= 8147 || c >= 8150 && c <= 8155 || c >= 8160 && c <= 8172 || c >= 8178 && c <= 8180 || c >= 8182 && c <= 8188 || c == 8486 || c >= 8490 && c <= 8491 || c == 8494 || c >= 8576 && c <= 8578 || c >= 12353 && c <= 12436 || c >= 12449 && c <= 12538 || c >= 12549 && c <= 12588 || c >= 44032 && c <= 55203 || c >= 19968 && c <= 40869 || c == 12295 || c >= 12321 && c <= 12329 || c == 95 || c == 46 || c == 45 || c >= 768 && c <= 837 || c >= 864 && c <= 865 || c >= 1155 && c <= 1158 || c >= 1425 && c <= 1441 || c >= 1443 && c <= 1465 || c >= 1467 && c <= 1469 || c == 1471 || c >= 1473 && c <= 1474 || c == 1476 || c >= 1611 && c <= 1618 || c == 1648 || c >= 1750 && c <= 1756 || c >= 1757 && c <= 1759 || c >= 1760 && c <= 1764 || c >= 1767 && c <= 1768 || c >= 1770 && c <= 1773 || c >= 2305 && c <= 2307 || c == 2364 || c >= 2366 && c <= 2380 || c == 2381 || c >= 2385 && c <= 2388 || c >= 2402 && c <= 2403 || c >= 2433 && c <= 2435 || c == 2492 || c == 2494 || c == 2495 || c >= 2496 && c <= 2500 || c >= 2503 && c <= 2504 || c >= 2507 && c <= 2509 || c == 2519 || c >= 2530 && c <= 2531 || c == 2562 || c == 2620 || c == 2622 || c == 2623 || c >= 2624 && c <= 2626 || c >= 2631 && c <= 2632 || c >= 2635 && c <= 2637 || c >= 2672 && c <= 2673 || c >= 2689 && c <= 2691 || c == 2748 || c >= 2750 && c <= 2757 || c >= 2759 && c <= 2761 || c >= 2763 && c <= 2765 || c >= 2817 && c <= 2819 || c == 2876 || c >= 2878 && c <= 2883 || c >= 2887 && c <= 2888 || c >= 2891 && c <= 2893 || c >= 2902 && c <= 2903 || c >= 2946 && c <= 2947 || c >= 3006 && c <= 3010 || c >= 3014 && c <= 3016 || c >= 3018 && c <= 3021 || c == 3031 || c >= 3073 && c <= 3075 || c >= 3134 && c <= 3140 || c >= 3142 && c <= 3144 || c >= 3146 && c <= 3149 || c >= 3157 && c <= 3158 || c >= 3202 && c <= 3203 || c >= 3262 && c <= 3268 || c >= 3270 && c <= 3272 || c >= 3274 && c <= 3277 || c >= 3285 && c <= 3286 || c >= 3330 && c <= 3331 || c >= 3390 && c <= 3395 || c >= 3398 && c <= 3400 || c >= 3402 && c <= 3405 || c == 3415 || c == 3633 || c >= 3636 && c <= 3642 || c >= 3655 && c <= 3662 || c == 3761 || c >= 3764 && c <= 3769 || c >= 3771 && c <= 3772 || c >= 3784 && c <= 3789 || c >= 3864 && c <= 3865 || c == 3893 || c == 3895 || c == 3897 || c == 3902 || c == 3903 || c >= 3953 && c <= 3972 || c >= 3974 && c <= 3979 || c >= 3984 && c <= 3989 || c == 3991 || c >= 3993 && c <= 4013 || c >= 4017 && c <= 4023 || c == 4025 || c >= 8400 && c <= 8412 || c == 8417 || c >= 12330 && c <= 12335 || c == 12441 || c == 12442 || c == 183 || c == 720 || c == 721 || c == 903 || c == 1600 || c == 3654 || c == 3782 || c == 12293 || c >= 12337 && c <= 12341 || c >= 12445 && c <= 12446 || c >= 12540 && c <= 12542)) {
      appendUHexTo(sb, c);
    }
     else {
      $append_0(sb, String.fromCharCode(c));
    }
  }
  return String($toString_0(sb));
}

function isNCName(str){
  $clinit_93();
  var i, len;
  if (str == null) {
    return false;
  }
   else {
    len = str.length;
    switch (len) {
      case 0:
        return false;
      case 1:
        return isNCNameStart(str.charCodeAt(0));
      default:if (!isNCNameStart(str.charCodeAt(0))) {
          return false;
        }

        for (i = 1; i < len; ++i) {
          if (!isNCNameTrail(str.charCodeAt(i))) {
            return false;
          }
        }

    }
    return true;
  }
}

function isNCNameStart(c){
  return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 255 || c >= 256 && c <= 305 || c >= 308 && c <= 318 || c >= 321 && c <= 328 || c >= 330 && c <= 382 || c >= 384 && c <= 451 || c >= 461 && c <= 496 || c >= 500 && c <= 501 || c >= 506 && c <= 535 || c >= 592 && c <= 680 || c >= 699 && c <= 705 || c == 902 || c >= 904 && c <= 906 || c == 908 || c >= 910 && c <= 929 || c >= 931 && c <= 974 || c >= 976 && c <= 982 || c == 986 || c == 988 || c == 990 || c == 992 || c >= 994 && c <= 1011 || c >= 1025 && c <= 1036 || c >= 1038 && c <= 1103 || c >= 1105 && c <= 1116 || c >= 1118 && c <= 1153 || c >= 1168 && c <= 1220 || c >= 1223 && c <= 1224 || c >= 1227 && c <= 1228 || c >= 1232 && c <= 1259 || c >= 1262 && c <= 1269 || c >= 1272 && c <= 1273 || c >= 1329 && c <= 1366 || c == 1369 || c >= 1377 && c <= 1414 || c >= 1488 && c <= 1514 || c >= 1520 && c <= 1522 || c >= 1569 && c <= 1594 || c >= 1601 && c <= 1610 || c >= 1649 && c <= 1719 || c >= 1722 && c <= 1726 || c >= 1728 && c <= 1742 || c >= 1744 && c <= 1747 || c == 1749 || c >= 1765 && c <= 1766 || c >= 2309 && c <= 2361 || c == 2365 || c >= 2392 && c <= 2401 || c >= 2437 && c <= 2444 || c >= 2447 && c <= 2448 || c >= 2451 && c <= 2472 || c >= 2474 && c <= 2480 || c == 2482 || c >= 2486 && c <= 2489 || c >= 2524 && c <= 2525 || c >= 2527 && c <= 2529 || c >= 2544 && c <= 2545 || c >= 2565 && c <= 2570 || c >= 2575 && c <= 2576 || c >= 2579 && c <= 2600 || c >= 2602 && c <= 2608 || c >= 2610 && c <= 2611 || c >= 2613 && c <= 2614 || c >= 2616 && c <= 2617 || c >= 2649 && c <= 2652 || c == 2654 || c >= 2674 && c <= 2676 || c >= 2693 && c <= 2699 || c == 2701 || c >= 2703 && c <= 2705 || c >= 2707 && c <= 2728 || c >= 2730 && c <= 2736 || c >= 2738 && c <= 2739 || c >= 2741 && c <= 2745 || c == 2749 || c == 2784 || c >= 2821 && c <= 2828 || c >= 2831 && c <= 2832 || c >= 2835 && c <= 2856 || c >= 2858 && c <= 2864 || c >= 2866 && c <= 2867 || c >= 2870 && c <= 2873 || c == 2877 || c >= 2908 && c <= 2909 || c >= 2911 && c <= 2913 || c >= 2949 && c <= 2954 || c >= 2958 && c <= 2960 || c >= 2962 && c <= 2965 || c >= 2969 && c <= 2970 || c == 2972 || c >= 2974 && c <= 2975 || c >= 2979 && c <= 2980 || c >= 2984 && c <= 2986 || c >= 2990 && c <= 2997 || c >= 2999 && c <= 3001 || c >= 3077 && c <= 3084 || c >= 3086 && c <= 3088 || c >= 3090 && c <= 3112 || c >= 3114 && c <= 3123 || c >= 3125 && c <= 3129 || c >= 3168 && c <= 3169 || c >= 3205 && c <= 3212 || c >= 3214 && c <= 3216 || c >= 3218 && c <= 3240 || c >= 3242 && c <= 3251 || c >= 3253 && c <= 3257 || c == 3294 || c >= 3296 && c <= 3297 || c >= 3333 && c <= 3340 || c >= 3342 && c <= 3344 || c >= 3346 && c <= 3368 || c >= 3370 && c <= 3385 || c >= 3424 && c <= 3425 || c >= 3585 && c <= 3630 || c == 3632 || c >= 3634 && c <= 3635 || c >= 3648 && c <= 3653 || c >= 3713 && c <= 3714 || c == 3716 || c >= 3719 && c <= 3720 || c == 3722 || c == 3725 || c >= 3732 && c <= 3735 || c >= 3737 && c <= 3743 || c >= 3745 && c <= 3747 || c == 3749 || c == 3751 || c >= 3754 && c <= 3755 || c >= 3757 && c <= 3758 || c == 3760 || c >= 3762 && c <= 3763 || c == 3773 || c >= 3776 && c <= 3780 || c >= 3904 && c <= 3911 || c >= 3913 && c <= 3945 || c >= 4256 && c <= 4293 || c >= 4304 && c <= 4342 || c == 4352 || c >= 4354 && c <= 4355 || c >= 4357 && c <= 4359 || c == 4361 || c >= 4363 && c <= 4364 || c >= 4366 && c <= 4370 || c == 4412 || c == 4414 || c == 4416 || c == 4428 || c == 4430 || c == 4432 || c >= 4436 && c <= 4437 || c == 4441 || c >= 4447 && c <= 4449 || c == 4451 || c == 4453 || c == 4455 || c == 4457 || c >= 4461 && c <= 4462 || c >= 4466 && c <= 4467 || c == 4469 || c == 4510 || c == 4520 || c == 4523 || c >= 4526 && c <= 4527 || c >= 4535 && c <= 4536 || c == 4538 || c >= 4540 && c <= 4546 || c == 4587 || c == 4592 || c == 4601 || c >= 7680 && c <= 7835 || c >= 7840 && c <= 7929 || c >= 7936 && c <= 7957 || c >= 7960 && c <= 7965 || c >= 7968 && c <= 8005 || c >= 8008 && c <= 8013 || c >= 8016 && c <= 8023 || c == 8025 || c == 8027 || c == 8029 || c >= 8031 && c <= 8061 || c >= 8064 && c <= 8116 || c >= 8118 && c <= 8124 || c == 8126 || c >= 8130 && c <= 8132 || c >= 8134 && c <= 8140 || c >= 8144 && c <= 8147 || c >= 8150 && c <= 8155 || c >= 8160 && c <= 8172 || c >= 8178 && c <= 8180 || c >= 8182 && c <= 8188 || c == 8486 || c >= 8490 && c <= 8491 || c == 8494 || c >= 8576 && c <= 8578 || c >= 12353 && c <= 12436 || c >= 12449 && c <= 12538 || c >= 12549 && c <= 12588 || c >= 44032 && c <= 55203 || c >= 19968 && c <= 40869 || c == 12295 || c >= 12321 && c <= 12329 || c == 95;
}

function isNCNameTrail(c){
  return c >= 48 && c <= 57 || c >= 1632 && c <= 1641 || c >= 1776 && c <= 1785 || c >= 2406 && c <= 2415 || c >= 2534 && c <= 2543 || c >= 2662 && c <= 2671 || c >= 2790 && c <= 2799 || c >= 2918 && c <= 2927 || c >= 3047 && c <= 3055 || c >= 3174 && c <= 3183 || c >= 3302 && c <= 3311 || c >= 3430 && c <= 3439 || c >= 3664 && c <= 3673 || c >= 3792 && c <= 3801 || c >= 3872 && c <= 3881 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 255 || c >= 256 && c <= 305 || c >= 308 && c <= 318 || c >= 321 && c <= 328 || c >= 330 && c <= 382 || c >= 384 && c <= 451 || c >= 461 && c <= 496 || c >= 500 && c <= 501 || c >= 506 && c <= 535 || c >= 592 && c <= 680 || c >= 699 && c <= 705 || c == 902 || c >= 904 && c <= 906 || c == 908 || c >= 910 && c <= 929 || c >= 931 && c <= 974 || c >= 976 && c <= 982 || c == 986 || c == 988 || c == 990 || c == 992 || c >= 994 && c <= 1011 || c >= 1025 && c <= 1036 || c >= 1038 && c <= 1103 || c >= 1105 && c <= 1116 || c >= 1118 && c <= 1153 || c >= 1168 && c <= 1220 || c >= 1223 && c <= 1224 || c >= 1227 && c <= 1228 || c >= 1232 && c <= 1259 || c >= 1262 && c <= 1269 || c >= 1272 && c <= 1273 || c >= 1329 && c <= 1366 || c == 1369 || c >= 1377 && c <= 1414 || c >= 1488 && c <= 1514 || c >= 1520 && c <= 1522 || c >= 1569 && c <= 1594 || c >= 1601 && c <= 1610 || c >= 1649 && c <= 1719 || c >= 1722 && c <= 1726 || c >= 1728 && c <= 1742 || c >= 1744 && c <= 1747 || c == 1749 || c >= 1765 && c <= 1766 || c >= 2309 && c <= 2361 || c == 2365 || c >= 2392 && c <= 2401 || c >= 2437 && c <= 2444 || c >= 2447 && c <= 2448 || c >= 2451 && c <= 2472 || c >= 2474 && c <= 2480 || c == 2482 || c >= 2486 && c <= 2489 || c >= 2524 && c <= 2525 || c >= 2527 && c <= 2529 || c >= 2544 && c <= 2545 || c >= 2565 && c <= 2570 || c >= 2575 && c <= 2576 || c >= 2579 && c <= 2600 || c >= 2602 && c <= 2608 || c >= 2610 && c <= 2611 || c >= 2613 && c <= 2614 || c >= 2616 && c <= 2617 || c >= 2649 && c <= 2652 || c == 2654 || c >= 2674 && c <= 2676 || c >= 2693 && c <= 2699 || c == 2701 || c >= 2703 && c <= 2705 || c >= 2707 && c <= 2728 || c >= 2730 && c <= 2736 || c >= 2738 && c <= 2739 || c >= 2741 && c <= 2745 || c == 2749 || c == 2784 || c >= 2821 && c <= 2828 || c >= 2831 && c <= 2832 || c >= 2835 && c <= 2856 || c >= 2858 && c <= 2864 || c >= 2866 && c <= 2867 || c >= 2870 && c <= 2873 || c == 2877 || c >= 2908 && c <= 2909 || c >= 2911 && c <= 2913 || c >= 2949 && c <= 2954 || c >= 2958 && c <= 2960 || c >= 2962 && c <= 2965 || c >= 2969 && c <= 2970 || c == 2972 || c >= 2974 && c <= 2975 || c >= 2979 && c <= 2980 || c >= 2984 && c <= 2986 || c >= 2990 && c <= 2997 || c >= 2999 && c <= 3001 || c >= 3077 && c <= 3084 || c >= 3086 && c <= 3088 || c >= 3090 && c <= 3112 || c >= 3114 && c <= 3123 || c >= 3125 && c <= 3129 || c >= 3168 && c <= 3169 || c >= 3205 && c <= 3212 || c >= 3214 && c <= 3216 || c >= 3218 && c <= 3240 || c >= 3242 && c <= 3251 || c >= 3253 && c <= 3257 || c == 3294 || c >= 3296 && c <= 3297 || c >= 3333 && c <= 3340 || c >= 3342 && c <= 3344 || c >= 3346 && c <= 3368 || c >= 3370 && c <= 3385 || c >= 3424 && c <= 3425 || c >= 3585 && c <= 3630 || c == 3632 || c >= 3634 && c <= 3635 || c >= 3648 && c <= 3653 || c >= 3713 && c <= 3714 || c == 3716 || c >= 3719 && c <= 3720 || c == 3722 || c == 3725 || c >= 3732 && c <= 3735 || c >= 3737 && c <= 3743 || c >= 3745 && c <= 3747 || c == 3749 || c == 3751 || c >= 3754 && c <= 3755 || c >= 3757 && c <= 3758 || c == 3760 || c >= 3762 && c <= 3763 || c == 3773 || c >= 3776 && c <= 3780 || c >= 3904 && c <= 3911 || c >= 3913 && c <= 3945 || c >= 4256 && c <= 4293 || c >= 4304 && c <= 4342 || c == 4352 || c >= 4354 && c <= 4355 || c >= 4357 && c <= 4359 || c == 4361 || c >= 4363 && c <= 4364 || c >= 4366 && c <= 4370 || c == 4412 || c == 4414 || c == 4416 || c == 4428 || c == 4430 || c == 4432 || c >= 4436 && c <= 4437 || c == 4441 || c >= 4447 && c <= 4449 || c == 4451 || c == 4453 || c == 4455 || c == 4457 || c >= 4461 && c <= 4462 || c >= 4466 && c <= 4467 || c == 4469 || c == 4510 || c == 4520 || c == 4523 || c >= 4526 && c <= 4527 || c >= 4535 && c <= 4536 || c == 4538 || c >= 4540 && c <= 4546 || c == 4587 || c == 4592 || c == 4601 || c >= 7680 && c <= 7835 || c >= 7840 && c <= 7929 || c >= 7936 && c <= 7957 || c >= 7960 && c <= 7965 || c >= 7968 && c <= 8005 || c >= 8008 && c <= 8013 || c >= 8016 && c <= 8023 || c == 8025 || c == 8027 || c == 8029 || c >= 8031 && c <= 8061 || c >= 8064 && c <= 8116 || c >= 8118 && c <= 8124 || c == 8126 || c >= 8130 && c <= 8132 || c >= 8134 && c <= 8140 || c >= 8144 && c <= 8147 || c >= 8150 && c <= 8155 || c >= 8160 && c <= 8172 || c >= 8178 && c <= 8180 || c >= 8182 && c <= 8188 || c == 8486 || c >= 8490 && c <= 8491 || c == 8494 || c >= 8576 && c <= 8578 || c >= 12353 && c <= 12436 || c >= 12449 && c <= 12538 || c >= 12549 && c <= 12588 || c >= 44032 && c <= 55203 || c >= 19968 && c <= 40869 || c == 12295 || c >= 12321 && c <= 12329 || c == 95 || c == 46 || c == 45 || c >= 768 && c <= 837 || c >= 864 && c <= 865 || c >= 1155 && c <= 1158 || c >= 1425 && c <= 1441 || c >= 1443 && c <= 1465 || c >= 1467 && c <= 1469 || c == 1471 || c >= 1473 && c <= 1474 || c == 1476 || c >= 1611 && c <= 1618 || c == 1648 || c >= 1750 && c <= 1756 || c >= 1757 && c <= 1759 || c >= 1760 && c <= 1764 || c >= 1767 && c <= 1768 || c >= 1770 && c <= 1773 || c >= 2305 && c <= 2307 || c == 2364 || c >= 2366 && c <= 2380 || c == 2381 || c >= 2385 && c <= 2388 || c >= 2402 && c <= 2403 || c >= 2433 && c <= 2435 || c == 2492 || c == 2494 || c == 2495 || c >= 2496 && c <= 2500 || c >= 2503 && c <= 2504 || c >= 2507 && c <= 2509 || c == 2519 || c >= 2530 && c <= 2531 || c == 2562 || c == 2620 || c == 2622 || c == 2623 || c >= 2624 && c <= 2626 || c >= 2631 && c <= 2632 || c >= 2635 && c <= 2637 || c >= 2672 && c <= 2673 || c >= 2689 && c <= 2691 || c == 2748 || c >= 2750 && c <= 2757 || c >= 2759 && c <= 2761 || c >= 2763 && c <= 2765 || c >= 2817 && c <= 2819 || c == 2876 || c >= 2878 && c <= 2883 || c >= 2887 && c <= 2888 || c >= 2891 && c <= 2893 || c >= 2902 && c <= 2903 || c >= 2946 && c <= 2947 || c >= 3006 && c <= 3010 || c >= 3014 && c <= 3016 || c >= 3018 && c <= 3021 || c == 3031 || c >= 3073 && c <= 3075 || c >= 3134 && c <= 3140 || c >= 3142 && c <= 3144 || c >= 3146 && c <= 3149 || c >= 3157 && c <= 3158 || c >= 3202 && c <= 3203 || c >= 3262 && c <= 3268 || c >= 3270 && c <= 3272 || c >= 3274 && c <= 3277 || c >= 3285 && c <= 3286 || c >= 3330 && c <= 3331 || c >= 3390 && c <= 3395 || c >= 3398 && c <= 3400 || c >= 3402 && c <= 3405 || c == 3415 || c == 3633 || c >= 3636 && c <= 3642 || c >= 3655 && c <= 3662 || c == 3761 || c >= 3764 && c <= 3769 || c >= 3771 && c <= 3772 || c >= 3784 && c <= 3789 || c >= 3864 && c <= 3865 || c == 3893 || c == 3895 || c == 3897 || c == 3902 || c == 3903 || c >= 3953 && c <= 3972 || c >= 3974 && c <= 3979 || c >= 3984 && c <= 3989 || c == 3991 || c >= 3993 && c <= 4013 || c >= 4017 && c <= 4023 || c == 4025 || c >= 8400 && c <= 8412 || c == 8417 || c >= 12330 && c <= 12335 || c == 12441 || c == 12442 || c == 183 || c == 720 || c == 721 || c == 903 || c == 1600 || c == 3654 || c == 3782 || c == 12293 || c >= 12337 && c <= 12341 || c >= 12445 && c <= 12446 || c >= 12540 && c <= 12542;
}

var HEX_TABLE;
function $clinit_94(){
  $clinit_94 = nullMethod;
  NAMES = initValues(_3_3C_classLit, 52, 12, [$toCharArray('AElig'), $toCharArray('AElig;'), $toCharArray('AMP'), $toCharArray('AMP;'), $toCharArray('Aacute'), $toCharArray('Aacute;'), $toCharArray('Abreve;'), $toCharArray('Acirc'), $toCharArray('Acirc;'), $toCharArray('Acy;'), $toCharArray('Afr;'), $toCharArray('Agrave'), $toCharArray('Agrave;'), $toCharArray('Alpha;'), $toCharArray('Amacr;'), $toCharArray('And;'), $toCharArray('Aogon;'), $toCharArray('Aopf;'), $toCharArray('ApplyFunction;'), $toCharArray('Aring'), $toCharArray('Aring;'), $toCharArray('Ascr;'), $toCharArray('Assign;'), $toCharArray('Atilde'), $toCharArray('Atilde;'), $toCharArray('Auml'), $toCharArray('Auml;'), $toCharArray('Backslash;'), $toCharArray('Barv;'), $toCharArray('Barwed;'), $toCharArray('Bcy;'), $toCharArray('Because;'), $toCharArray('Bernoullis;'), $toCharArray('Beta;'), $toCharArray('Bfr;'), $toCharArray('Bopf;'), $toCharArray('Breve;'), $toCharArray('Bscr;'), $toCharArray('Bumpeq;'), $toCharArray('CHcy;'), $toCharArray('COPY'), $toCharArray('COPY;'), $toCharArray('Cacute;'), $toCharArray('Cap;'), $toCharArray('CapitalDifferentialD;'), $toCharArray('Cayleys;'), $toCharArray('Ccaron;'), $toCharArray('Ccedil'), $toCharArray('Ccedil;'), $toCharArray('Ccirc;'), $toCharArray('Cconint;'), $toCharArray('Cdot;'), $toCharArray('Cedilla;'), $toCharArray('CenterDot;'), $toCharArray('Cfr;'), $toCharArray('Chi;'), $toCharArray('CircleDot;'), $toCharArray('CircleMinus;'), $toCharArray('CirclePlus;'), $toCharArray('CircleTimes;'), $toCharArray('ClockwiseContourIntegral;'), $toCharArray('CloseCurlyDoubleQuote;'), $toCharArray('CloseCurlyQuote;'), $toCharArray('Colon;'), $toCharArray('Colone;'), $toCharArray('Congruent;'), $toCharArray('Conint;'), $toCharArray('ContourIntegral;'), $toCharArray('Copf;'), $toCharArray('Coproduct;'), $toCharArray('CounterClockwiseContourIntegral;'), $toCharArray('Cross;'), $toCharArray('Cscr;'), $toCharArray('Cup;'), $toCharArray('CupCap;'), $toCharArray('DD;'), $toCharArray('DDotrahd;'), $toCharArray('DJcy;'), $toCharArray('DScy;'), $toCharArray('DZcy;'), $toCharArray('Dagger;'), $toCharArray('Darr;'), $toCharArray('Dashv;'), $toCharArray('Dcaron;'), $toCharArray('Dcy;'), $toCharArray('Del;'), $toCharArray('Delta;'), $toCharArray('Dfr;'), $toCharArray('DiacriticalAcute;'), $toCharArray('DiacriticalDot;'), $toCharArray('DiacriticalDoubleAcute;'), $toCharArray('DiacriticalGrave;'), $toCharArray('DiacriticalTilde;'), $toCharArray('Diamond;'), $toCharArray('DifferentialD;'), $toCharArray('Dopf;'), $toCharArray('Dot;'), $toCharArray('DotDot;'), $toCharArray('DotEqual;'), $toCharArray('DoubleContourIntegral;'), $toCharArray('DoubleDot;'), $toCharArray('DoubleDownArrow;'), $toCharArray('DoubleLeftArrow;'), $toCharArray('DoubleLeftRightArrow;'), $toCharArray('DoubleLeftTee;'), $toCharArray('DoubleLongLeftArrow;'), $toCharArray('DoubleLongLeftRightArrow;'), $toCharArray('DoubleLongRightArrow;'), $toCharArray('DoubleRightArrow;'), $toCharArray('DoubleRightTee;'), $toCharArray('DoubleUpArrow;'), $toCharArray('DoubleUpDownArrow;'), $toCharArray('DoubleVerticalBar;'), $toCharArray('DownArrow;'), $toCharArray('DownArrowBar;'), $toCharArray('DownArrowUpArrow;'), $toCharArray('DownBreve;'), $toCharArray('DownLeftRightVector;'), $toCharArray('DownLeftTeeVector;'), $toCharArray('DownLeftVector;'), $toCharArray('DownLeftVectorBar;'), $toCharArray('DownRightTeeVector;'), $toCharArray('DownRightVector;'), $toCharArray('DownRightVectorBar;'), $toCharArray('DownTee;'), $toCharArray('DownTeeArrow;'), $toCharArray('Downarrow;'), $toCharArray('Dscr;'), $toCharArray('Dstrok;'), $toCharArray('ENG;'), $toCharArray('ETH'), $toCharArray('ETH;'), $toCharArray('Eacute'), $toCharArray('Eacute;'), $toCharArray('Ecaron;'), $toCharArray('Ecirc'), $toCharArray('Ecirc;'), $toCharArray('Ecy;'), $toCharArray('Edot;'), $toCharArray('Efr;'), $toCharArray('Egrave'), $toCharArray('Egrave;'), $toCharArray('Element;'), $toCharArray('Emacr;'), $toCharArray('EmptySmallSquare;'), $toCharArray('EmptyVerySmallSquare;'), $toCharArray('Eogon;'), $toCharArray('Eopf;'), $toCharArray('Epsilon;'), $toCharArray('Equal;'), $toCharArray('EqualTilde;'), $toCharArray('Equilibrium;'), $toCharArray('Escr;'), $toCharArray('Esim;'), $toCharArray('Eta;'), $toCharArray('Euml'), $toCharArray('Euml;'), $toCharArray('Exists;'), $toCharArray('ExponentialE;'), $toCharArray('Fcy;'), $toCharArray('Ffr;'), $toCharArray('FilledSmallSquare;'), $toCharArray('FilledVerySmallSquare;'), $toCharArray('Fopf;'), $toCharArray('ForAll;'), $toCharArray('Fouriertrf;'), $toCharArray('Fscr;'), $toCharArray('GJcy;'), $toCharArray('GT'), $toCharArray('GT;'), $toCharArray('Gamma;'), $toCharArray('Gammad;'), $toCharArray('Gbreve;'), $toCharArray('Gcedil;'), $toCharArray('Gcirc;'), $toCharArray('Gcy;'), $toCharArray('Gdot;'), $toCharArray('Gfr;'), $toCharArray('Gg;'), $toCharArray('Gopf;'), $toCharArray('GreaterEqual;'), $toCharArray('GreaterEqualLess;'), $toCharArray('GreaterFullEqual;'), $toCharArray('GreaterGreater;'), $toCharArray('GreaterLess;'), $toCharArray('GreaterSlantEqual;'), $toCharArray('GreaterTilde;'), $toCharArray('Gscr;'), $toCharArray('Gt;'), $toCharArray('HARDcy;'), $toCharArray('Hacek;'), $toCharArray('Hat;'), $toCharArray('Hcirc;'), $toCharArray('Hfr;'), $toCharArray('HilbertSpace;'), $toCharArray('Hopf;'), $toCharArray('HorizontalLine;'), $toCharArray('Hscr;'), $toCharArray('Hstrok;'), $toCharArray('HumpDownHump;'), $toCharArray('HumpEqual;'), $toCharArray('IEcy;'), $toCharArray('IJlig;'), $toCharArray('IOcy;'), $toCharArray('Iacute'), $toCharArray('Iacute;'), $toCharArray('Icirc'), $toCharArray('Icirc;'), $toCharArray('Icy;'), $toCharArray('Idot;'), $toCharArray('Ifr;'), $toCharArray('Igrave'), $toCharArray('Igrave;'), $toCharArray('Im;'), $toCharArray('Imacr;'), $toCharArray('ImaginaryI;'), $toCharArray('Implies;'), $toCharArray('Int;'), $toCharArray('Integral;'), $toCharArray('Intersection;'), $toCharArray('InvisibleComma;'), $toCharArray('InvisibleTimes;'), $toCharArray('Iogon;'), $toCharArray('Iopf;'), $toCharArray('Iota;'), $toCharArray('Iscr;'), $toCharArray('Itilde;'), $toCharArray('Iukcy;'), $toCharArray('Iuml'), $toCharArray('Iuml;'), $toCharArray('Jcirc;'), $toCharArray('Jcy;'), $toCharArray('Jfr;'), $toCharArray('Jopf;'), $toCharArray('Jscr;'), $toCharArray('Jsercy;'), $toCharArray('Jukcy;'), $toCharArray('KHcy;'), $toCharArray('KJcy;'), $toCharArray('Kappa;'), $toCharArray('Kcedil;'), $toCharArray('Kcy;'), $toCharArray('Kfr;'), $toCharArray('Kopf;'), $toCharArray('Kscr;'), $toCharArray('LJcy;'), $toCharArray('LT'), $toCharArray('LT;'), $toCharArray('Lacute;'), $toCharArray('Lambda;'), $toCharArray('Lang;'), $toCharArray('Laplacetrf;'), $toCharArray('Larr;'), $toCharArray('Lcaron;'), $toCharArray('Lcedil;'), $toCharArray('Lcy;'), $toCharArray('LeftAngleBracket;'), $toCharArray('LeftArrow;'), $toCharArray('LeftArrowBar;'), $toCharArray('LeftArrowRightArrow;'), $toCharArray('LeftCeiling;'), $toCharArray('LeftDoubleBracket;'), $toCharArray('LeftDownTeeVector;'), $toCharArray('LeftDownVector;'), $toCharArray('LeftDownVectorBar;'), $toCharArray('LeftFloor;'), $toCharArray('LeftRightArrow;'), $toCharArray('LeftRightVector;'), $toCharArray('LeftTee;'), $toCharArray('LeftTeeArrow;'), $toCharArray('LeftTeeVector;'), $toCharArray('LeftTriangle;'), $toCharArray('LeftTriangleBar;'), $toCharArray('LeftTriangleEqual;'), $toCharArray('LeftUpDownVector;'), $toCharArray('LeftUpTeeVector;'), $toCharArray('LeftUpVector;'), $toCharArray('LeftUpVectorBar;'), $toCharArray('LeftVector;'), $toCharArray('LeftVectorBar;'), $toCharArray('Leftarrow;'), $toCharArray('Leftrightarrow;'), $toCharArray('LessEqualGreater;'), $toCharArray('LessFullEqual;'), $toCharArray('LessGreater;'), $toCharArray('LessLess;'), $toCharArray('LessSlantEqual;'), $toCharArray('LessTilde;'), $toCharArray('Lfr;'), $toCharArray('Ll;'), $toCharArray('Lleftarrow;'), $toCharArray('Lmidot;'), $toCharArray('LongLeftArrow;'), $toCharArray('LongLeftRightArrow;'), $toCharArray('LongRightArrow;'), $toCharArray('Longleftarrow;'), $toCharArray('Longleftrightarrow;'), $toCharArray('Longrightarrow;'), $toCharArray('Lopf;'), $toCharArray('LowerLeftArrow;'), $toCharArray('LowerRightArrow;'), $toCharArray('Lscr;'), $toCharArray('Lsh;'), $toCharArray('Lstrok;'), $toCharArray('Lt;'), $toCharArray('Map;'), $toCharArray('Mcy;'), $toCharArray('MediumSpace;'), $toCharArray('Mellintrf;'), $toCharArray('Mfr;'), $toCharArray('MinusPlus;'), $toCharArray('Mopf;'), $toCharArray('Mscr;'), $toCharArray('Mu;'), $toCharArray('NJcy;'), $toCharArray('Nacute;'), $toCharArray('Ncaron;'), $toCharArray('Ncedil;'), $toCharArray('Ncy;'), $toCharArray('NegativeMediumSpace;'), $toCharArray('NegativeThickSpace;'), $toCharArray('NegativeThinSpace;'), $toCharArray('NegativeVeryThinSpace;'), $toCharArray('NestedGreaterGreater;'), $toCharArray('NestedLessLess;'), $toCharArray('NewLine;'), $toCharArray('Nfr;'), $toCharArray('NoBreak;'), $toCharArray('NonBreakingSpace;'), $toCharArray('Nopf;'), $toCharArray('Not;'), $toCharArray('NotCongruent;'), $toCharArray('NotCupCap;'), $toCharArray('NotDoubleVerticalBar;'), $toCharArray('NotElement;'), $toCharArray('NotEqual;'), $toCharArray('NotExists;'), $toCharArray('NotGreater;'), $toCharArray('NotGreaterEqual;'), $toCharArray('NotGreaterLess;'), $toCharArray('NotGreaterTilde;'), $toCharArray('NotLeftTriangle;'), $toCharArray('NotLeftTriangleEqual;'), $toCharArray('NotLess;'), $toCharArray('NotLessEqual;'), $toCharArray('NotLessGreater;'), $toCharArray('NotLessTilde;'), $toCharArray('NotPrecedes;'), $toCharArray('NotPrecedesSlantEqual;'), $toCharArray('NotReverseElement;'), $toCharArray('NotRightTriangle;'), $toCharArray('NotRightTriangleEqual;'), $toCharArray('NotSquareSubsetEqual;'), $toCharArray('NotSquareSupersetEqual;'), $toCharArray('NotSubsetEqual;'), $toCharArray('NotSucceeds;'), $toCharArray('NotSucceedsSlantEqual;'), $toCharArray('NotSupersetEqual;'), $toCharArray('NotTilde;'), $toCharArray('NotTildeEqual;'), $toCharArray('NotTildeFullEqual;'), $toCharArray('NotTildeTilde;'), $toCharArray('NotVerticalBar;'), $toCharArray('Nscr;'), $toCharArray('Ntilde'), $toCharArray('Ntilde;'), $toCharArray('Nu;'), $toCharArray('OElig;'), $toCharArray('Oacute'), $toCharArray('Oacute;'), $toCharArray('Ocirc'), $toCharArray('Ocirc;'), $toCharArray('Ocy;'), $toCharArray('Odblac;'), $toCharArray('Ofr;'), $toCharArray('Ograve'), $toCharArray('Ograve;'), $toCharArray('Omacr;'), $toCharArray('Omega;'), $toCharArray('Omicron;'), $toCharArray('Oopf;'), $toCharArray('OpenCurlyDoubleQuote;'), $toCharArray('OpenCurlyQuote;'), $toCharArray('Or;'), $toCharArray('Oscr;'), $toCharArray('Oslash'), $toCharArray('Oslash;'), $toCharArray('Otilde'), $toCharArray('Otilde;'), $toCharArray('Otimes;'), $toCharArray('Ouml'), $toCharArray('Ouml;'), $toCharArray('OverBar;'), $toCharArray('OverBrace;'), $toCharArray('OverBracket;'), $toCharArray('OverParenthesis;'), $toCharArray('PartialD;'), $toCharArray('Pcy;'), $toCharArray('Pfr;'), $toCharArray('Phi;'), $toCharArray('Pi;'), $toCharArray('PlusMinus;'), $toCharArray('Poincareplane;'), $toCharArray('Popf;'), $toCharArray('Pr;'), $toCharArray('Precedes;'), $toCharArray('PrecedesEqual;'), $toCharArray('PrecedesSlantEqual;'), $toCharArray('PrecedesTilde;'), $toCharArray('Prime;'), $toCharArray('Product;'), $toCharArray('Proportion;'), $toCharArray('Proportional;'), $toCharArray('Pscr;'), $toCharArray('Psi;'), $toCharArray('QUOT'), $toCharArray('QUOT;'), $toCharArray('Qfr;'), $toCharArray('Qopf;'), $toCharArray('Qscr;'), $toCharArray('RBarr;'), $toCharArray('REG'), $toCharArray('REG;'), $toCharArray('Racute;'), $toCharArray('Rang;'), $toCharArray('Rarr;'), $toCharArray('Rarrtl;'), $toCharArray('Rcaron;'), $toCharArray('Rcedil;'), $toCharArray('Rcy;'), $toCharArray('Re;'), $toCharArray('ReverseElement;'), $toCharArray('ReverseEquilibrium;'), $toCharArray('ReverseUpEquilibrium;'), $toCharArray('Rfr;'), $toCharArray('Rho;'), $toCharArray('RightAngleBracket;'), $toCharArray('RightArrow;'), $toCharArray('RightArrowBar;'), $toCharArray('RightArrowLeftArrow;'), $toCharArray('RightCeiling;'), $toCharArray('RightDoubleBracket;'), $toCharArray('RightDownTeeVector;'), $toCharArray('RightDownVector;'), $toCharArray('RightDownVectorBar;'), $toCharArray('RightFloor;'), $toCharArray('RightTee;'), $toCharArray('RightTeeArrow;'), $toCharArray('RightTeeVector;'), $toCharArray('RightTriangle;'), $toCharArray('RightTriangleBar;'), $toCharArray('RightTriangleEqual;'), $toCharArray('RightUpDownVector;'), $toCharArray('RightUpTeeVector;'), $toCharArray('RightUpVector;'), $toCharArray('RightUpVectorBar;'), $toCharArray('RightVector;'), $toCharArray('RightVectorBar;'), $toCharArray('Rightarrow;'), $toCharArray('Ropf;'), $toCharArray('RoundImplies;'), $toCharArray('Rrightarrow;'), $toCharArray('Rscr;'), $toCharArray('Rsh;'), $toCharArray('RuleDelayed;'), $toCharArray('SHCHcy;'), $toCharArray('SHcy;'), $toCharArray('SOFTcy;'), $toCharArray('Sacute;'), $toCharArray('Sc;'), $toCharArray('Scaron;'), $toCharArray('Scedil;'), $toCharArray('Scirc;'), $toCharArray('Scy;'), $toCharArray('Sfr;'), $toCharArray('ShortDownArrow;'), $toCharArray('ShortLeftArrow;'), $toCharArray('ShortRightArrow;'), $toCharArray('ShortUpArrow;'), $toCharArray('Sigma;'), $toCharArray('SmallCircle;'), $toCharArray('Sopf;'), $toCharArray('Sqrt;'), $toCharArray('Square;'), $toCharArray('SquareIntersection;'), $toCharArray('SquareSubset;'), $toCharArray('SquareSubsetEqual;'), $toCharArray('SquareSuperset;'), $toCharArray('SquareSupersetEqual;'), $toCharArray('SquareUnion;'), $toCharArray('Sscr;'), $toCharArray('Star;'), $toCharArray('Sub;'), $toCharArray('Subset;'), $toCharArray('SubsetEqual;'), $toCharArray('Succeeds;'), $toCharArray('SucceedsEqual;'), $toCharArray('SucceedsSlantEqual;'), $toCharArray('SucceedsTilde;'), $toCharArray('SuchThat;'), $toCharArray('Sum;'), $toCharArray('Sup;'), $toCharArray('Superset;'), $toCharArray('SupersetEqual;'), $toCharArray('Supset;'), $toCharArray('THORN'), $toCharArray('THORN;'), $toCharArray('TRADE;'), $toCharArray('TSHcy;'), $toCharArray('TScy;'), $toCharArray('Tab;'), $toCharArray('Tau;'), $toCharArray('Tcaron;'), $toCharArray('Tcedil;'), $toCharArray('Tcy;'), $toCharArray('Tfr;'), $toCharArray('Therefore;'), $toCharArray('Theta;'), $toCharArray('ThinSpace;'), $toCharArray('Tilde;'), $toCharArray('TildeEqual;'), $toCharArray('TildeFullEqual;'), $toCharArray('TildeTilde;'), $toCharArray('Topf;'), $toCharArray('TripleDot;'), $toCharArray('Tscr;'), $toCharArray('Tstrok;'), $toCharArray('Uacute'), $toCharArray('Uacute;'), $toCharArray('Uarr;'), $toCharArray('Uarrocir;'), $toCharArray('Ubrcy;'), $toCharArray('Ubreve;'), $toCharArray('Ucirc'), $toCharArray('Ucirc;'), $toCharArray('Ucy;'), $toCharArray('Udblac;'), $toCharArray('Ufr;'), $toCharArray('Ugrave'), $toCharArray('Ugrave;'), $toCharArray('Umacr;'), $toCharArray('UnderBar;'), $toCharArray('UnderBrace;'), $toCharArray('UnderBracket;'), $toCharArray('UnderParenthesis;'), $toCharArray('Union;'), $toCharArray('UnionPlus;'), $toCharArray('Uogon;'), $toCharArray('Uopf;'), $toCharArray('UpArrow;'), $toCharArray('UpArrowBar;'), $toCharArray('UpArrowDownArrow;'), $toCharArray('UpDownArrow;'), $toCharArray('UpEquilibrium;'), $toCharArray('UpTee;'), $toCharArray('UpTeeArrow;'), $toCharArray('Uparrow;'), $toCharArray('Updownarrow;'), $toCharArray('UpperLeftArrow;'), $toCharArray('UpperRightArrow;'), $toCharArray('Upsi;'), $toCharArray('Upsilon;'), $toCharArray('Uring;'), $toCharArray('Uscr;'), $toCharArray('Utilde;'), $toCharArray('Uuml'), $toCharArray('Uuml;'), $toCharArray('VDash;'), $toCharArray('Vbar;'), $toCharArray('Vcy;'), $toCharArray('Vdash;'), $toCharArray('Vdashl;'), $toCharArray('Vee;'), $toCharArray('Verbar;'), $toCharArray('Vert;'), $toCharArray('VerticalBar;'), $toCharArray('VerticalLine;'), $toCharArray('VerticalSeparator;'), $toCharArray('VerticalTilde;'), $toCharArray('VeryThinSpace;'), $toCharArray('Vfr;'), $toCharArray('Vopf;'), $toCharArray('Vscr;'), $toCharArray('Vvdash;'), $toCharArray('Wcirc;'), $toCharArray('Wedge;'), $toCharArray('Wfr;'), $toCharArray('Wopf;'), $toCharArray('Wscr;'), $toCharArray('Xfr;'), $toCharArray('Xi;'), $toCharArray('Xopf;'), $toCharArray('Xscr;'), $toCharArray('YAcy;'), $toCharArray('YIcy;'), $toCharArray('YUcy;'), $toCharArray('Yacute'), $toCharArray('Yacute;'), $toCharArray('Ycirc;'), $toCharArray('Ycy;'), $toCharArray('Yfr;'), $toCharArray('Yopf;'), $toCharArray('Yscr;'), $toCharArray('Yuml;'), $toCharArray('ZHcy;'), $toCharArray('Zacute;'), $toCharArray('Zcaron;'), $toCharArray('Zcy;'), $toCharArray('Zdot;'), $toCharArray('ZeroWidthSpace;'), $toCharArray('Zeta;'), $toCharArray('Zfr;'), $toCharArray('Zopf;'), $toCharArray('Zscr;'), $toCharArray('aacute'), $toCharArray('aacute;'), $toCharArray('abreve;'), $toCharArray('ac;'), $toCharArray('acd;'), $toCharArray('acirc'), $toCharArray('acirc;'), $toCharArray('acute'), $toCharArray('acute;'), $toCharArray('acy;'), $toCharArray('aelig'), $toCharArray('aelig;'), $toCharArray('af;'), $toCharArray('afr;'), $toCharArray('agrave'), $toCharArray('agrave;'), $toCharArray('alefsym;'), $toCharArray('aleph;'), $toCharArray('alpha;'), $toCharArray('amacr;'), $toCharArray('amalg;'), $toCharArray('amp'), $toCharArray('amp;'), $toCharArray('and;'), $toCharArray('andand;'), $toCharArray('andd;'), $toCharArray('andslope;'), $toCharArray('andv;'), $toCharArray('ang;'), $toCharArray('ange;'), $toCharArray('angle;'), $toCharArray('angmsd;'), $toCharArray('angmsdaa;'), $toCharArray('angmsdab;'), $toCharArray('angmsdac;'), $toCharArray('angmsdad;'), $toCharArray('angmsdae;'), $toCharArray('angmsdaf;'), $toCharArray('angmsdag;'), $toCharArray('angmsdah;'), $toCharArray('angrt;'), $toCharArray('angrtvb;'), $toCharArray('angrtvbd;'), $toCharArray('angsph;'), $toCharArray('angst;'), $toCharArray('angzarr;'), $toCharArray('aogon;'), $toCharArray('aopf;'), $toCharArray('ap;'), $toCharArray('apE;'), $toCharArray('apacir;'), $toCharArray('ape;'), $toCharArray('apid;'), $toCharArray('apos;'), $toCharArray('approx;'), $toCharArray('approxeq;'), $toCharArray('aring'), $toCharArray('aring;'), $toCharArray('ascr;'), $toCharArray('ast;'), $toCharArray('asymp;'), $toCharArray('asympeq;'), $toCharArray('atilde'), $toCharArray('atilde;'), $toCharArray('auml'), $toCharArray('auml;'), $toCharArray('awconint;'), $toCharArray('awint;'), $toCharArray('bNot;'), $toCharArray('backcong;'), $toCharArray('backepsilon;'), $toCharArray('backprime;'), $toCharArray('backsim;'), $toCharArray('backsimeq;'), $toCharArray('barvee;'), $toCharArray('barwed;'), $toCharArray('barwedge;'), $toCharArray('bbrk;'), $toCharArray('bbrktbrk;'), $toCharArray('bcong;'), $toCharArray('bcy;'), $toCharArray('bdquo;'), $toCharArray('becaus;'), $toCharArray('because;'), $toCharArray('bemptyv;'), $toCharArray('bepsi;'), $toCharArray('bernou;'), $toCharArray('beta;'), $toCharArray('beth;'), $toCharArray('between;'), $toCharArray('bfr;'), $toCharArray('bigcap;'), $toCharArray('bigcirc;'), $toCharArray('bigcup;'), $toCharArray('bigodot;'), $toCharArray('bigoplus;'), $toCharArray('bigotimes;'), $toCharArray('bigsqcup;'), $toCharArray('bigstar;'), $toCharArray('bigtriangledown;'), $toCharArray('bigtriangleup;'), $toCharArray('biguplus;'), $toCharArray('bigvee;'), $toCharArray('bigwedge;'), $toCharArray('bkarow;'), $toCharArray('blacklozenge;'), $toCharArray('blacksquare;'), $toCharArray('blacktriangle;'), $toCharArray('blacktriangledown;'), $toCharArray('blacktriangleleft;'), $toCharArray('blacktriangleright;'), $toCharArray('blank;'), $toCharArray('blk12;'), $toCharArray('blk14;'), $toCharArray('blk34;'), $toCharArray('block;'), $toCharArray('bnot;'), $toCharArray('bopf;'), $toCharArray('bot;'), $toCharArray('bottom;'), $toCharArray('bowtie;'), $toCharArray('boxDL;'), $toCharArray('boxDR;'), $toCharArray('boxDl;'), $toCharArray('boxDr;'), $toCharArray('boxH;'), $toCharArray('boxHD;'), $toCharArray('boxHU;'), $toCharArray('boxHd;'), $toCharArray('boxHu;'), $toCharArray('boxUL;'), $toCharArray('boxUR;'), $toCharArray('boxUl;'), $toCharArray('boxUr;'), $toCharArray('boxV;'), $toCharArray('boxVH;'), $toCharArray('boxVL;'), $toCharArray('boxVR;'), $toCharArray('boxVh;'), $toCharArray('boxVl;'), $toCharArray('boxVr;'), $toCharArray('boxbox;'), $toCharArray('boxdL;'), $toCharArray('boxdR;'), $toCharArray('boxdl;'), $toCharArray('boxdr;'), $toCharArray('boxh;'), $toCharArray('boxhD;'), $toCharArray('boxhU;'), $toCharArray('boxhd;'), $toCharArray('boxhu;'), $toCharArray('boxminus;'), $toCharArray('boxplus;'), $toCharArray('boxtimes;'), $toCharArray('boxuL;'), $toCharArray('boxuR;'), $toCharArray('boxul;'), $toCharArray('boxur;'), $toCharArray('boxv;'), $toCharArray('boxvH;'), $toCharArray('boxvL;'), $toCharArray('boxvR;'), $toCharArray('boxvh;'), $toCharArray('boxvl;'), $toCharArray('boxvr;'), $toCharArray('bprime;'), $toCharArray('breve;'), $toCharArray('brvbar'), $toCharArray('brvbar;'), $toCharArray('bscr;'), $toCharArray('bsemi;'), $toCharArray('bsim;'), $toCharArray('bsime;'), $toCharArray('bsol;'), $toCharArray('bsolb;'), $toCharArray('bull;'), $toCharArray('bullet;'), $toCharArray('bump;'), $toCharArray('bumpE;'), $toCharArray('bumpe;'), $toCharArray('bumpeq;'), $toCharArray('cacute;'), $toCharArray('cap;'), $toCharArray('capand;'), $toCharArray('capbrcup;'), $toCharArray('capcap;'), $toCharArray('capcup;'), $toCharArray('capdot;'), $toCharArray('caret;'), $toCharArray('caron;'), $toCharArray('ccaps;'), $toCharArray('ccaron;'), $toCharArray('ccedil'), $toCharArray('ccedil;'), $toCharArray('ccirc;'), $toCharArray('ccups;'), $toCharArray('ccupssm;'), $toCharArray('cdot;'), $toCharArray('cedil'), $toCharArray('cedil;'), $toCharArray('cemptyv;'), $toCharArray('cent'), $toCharArray('cent;'), $toCharArray('centerdot;'), $toCharArray('cfr;'), $toCharArray('chcy;'), $toCharArray('check;'), $toCharArray('checkmark;'), $toCharArray('chi;'), $toCharArray('cir;'), $toCharArray('cirE;'), $toCharArray('circ;'), $toCharArray('circeq;'), $toCharArray('circlearrowleft;'), $toCharArray('circlearrowright;'), $toCharArray('circledR;'), $toCharArray('circledS;'), $toCharArray('circledast;'), $toCharArray('circledcirc;'), $toCharArray('circleddash;'), $toCharArray('cire;'), $toCharArray('cirfnint;'), $toCharArray('cirmid;'), $toCharArray('cirscir;'), $toCharArray('clubs;'), $toCharArray('clubsuit;'), $toCharArray('colon;'), $toCharArray('colone;'), $toCharArray('coloneq;'), $toCharArray('comma;'), $toCharArray('commat;'), $toCharArray('comp;'), $toCharArray('compfn;'), $toCharArray('complement;'), $toCharArray('complexes;'), $toCharArray('cong;'), $toCharArray('congdot;'), $toCharArray('conint;'), $toCharArray('copf;'), $toCharArray('coprod;'), $toCharArray('copy'), $toCharArray('copy;'), $toCharArray('copysr;'), $toCharArray('crarr;'), $toCharArray('cross;'), $toCharArray('cscr;'), $toCharArray('csub;'), $toCharArray('csube;'), $toCharArray('csup;'), $toCharArray('csupe;'), $toCharArray('ctdot;'), $toCharArray('cudarrl;'), $toCharArray('cudarrr;'), $toCharArray('cuepr;'), $toCharArray('cuesc;'), $toCharArray('cularr;'), $toCharArray('cularrp;'), $toCharArray('cup;'), $toCharArray('cupbrcap;'), $toCharArray('cupcap;'), $toCharArray('cupcup;'), $toCharArray('cupdot;'), $toCharArray('cupor;'), $toCharArray('curarr;'), $toCharArray('curarrm;'), $toCharArray('curlyeqprec;'), $toCharArray('curlyeqsucc;'), $toCharArray('curlyvee;'), $toCharArray('curlywedge;'), $toCharArray('curren'), $toCharArray('curren;'), $toCharArray('curvearrowleft;'), $toCharArray('curvearrowright;'), $toCharArray('cuvee;'), $toCharArray('cuwed;'), $toCharArray('cwconint;'), $toCharArray('cwint;'), $toCharArray('cylcty;'), $toCharArray('dArr;'), $toCharArray('dHar;'), $toCharArray('dagger;'), $toCharArray('daleth;'), $toCharArray('darr;'), $toCharArray('dash;'), $toCharArray('dashv;'), $toCharArray('dbkarow;'), $toCharArray('dblac;'), $toCharArray('dcaron;'), $toCharArray('dcy;'), $toCharArray('dd;'), $toCharArray('ddagger;'), $toCharArray('ddarr;'), $toCharArray('ddotseq;'), $toCharArray('deg'), $toCharArray('deg;'), $toCharArray('delta;'), $toCharArray('demptyv;'), $toCharArray('dfisht;'), $toCharArray('dfr;'), $toCharArray('dharl;'), $toCharArray('dharr;'), $toCharArray('diam;'), $toCharArray('diamond;'), $toCharArray('diamondsuit;'), $toCharArray('diams;'), $toCharArray('die;'), $toCharArray('digamma;'), $toCharArray('disin;'), $toCharArray('div;'), $toCharArray('divide'), $toCharArray('divide;'), $toCharArray('divideontimes;'), $toCharArray('divonx;'), $toCharArray('djcy;'), $toCharArray('dlcorn;'), $toCharArray('dlcrop;'), $toCharArray('dollar;'), $toCharArray('dopf;'), $toCharArray('dot;'), $toCharArray('doteq;'), $toCharArray('doteqdot;'), $toCharArray('dotminus;'), $toCharArray('dotplus;'), $toCharArray('dotsquare;'), $toCharArray('doublebarwedge;'), $toCharArray('downarrow;'), $toCharArray('downdownarrows;'), $toCharArray('downharpoonleft;'), $toCharArray('downharpoonright;'), $toCharArray('drbkarow;'), $toCharArray('drcorn;'), $toCharArray('drcrop;'), $toCharArray('dscr;'), $toCharArray('dscy;'), $toCharArray('dsol;'), $toCharArray('dstrok;'), $toCharArray('dtdot;'), $toCharArray('dtri;'), $toCharArray('dtrif;'), $toCharArray('duarr;'), $toCharArray('duhar;'), $toCharArray('dwangle;'), $toCharArray('dzcy;'), $toCharArray('dzigrarr;'), $toCharArray('eDDot;'), $toCharArray('eDot;'), $toCharArray('eacute'), $toCharArray('eacute;'), $toCharArray('easter;'), $toCharArray('ecaron;'), $toCharArray('ecir;'), $toCharArray('ecirc'), $toCharArray('ecirc;'), $toCharArray('ecolon;'), $toCharArray('ecy;'), $toCharArray('edot;'), $toCharArray('ee;'), $toCharArray('efDot;'), $toCharArray('efr;'), $toCharArray('eg;'), $toCharArray('egrave'), $toCharArray('egrave;'), $toCharArray('egs;'), $toCharArray('egsdot;'), $toCharArray('el;'), $toCharArray('elinters;'), $toCharArray('ell;'), $toCharArray('els;'), $toCharArray('elsdot;'), $toCharArray('emacr;'), $toCharArray('empty;'), $toCharArray('emptyset;'), $toCharArray('emptyv;'), $toCharArray('emsp13;'), $toCharArray('emsp14;'), $toCharArray('emsp;'), $toCharArray('eng;'), $toCharArray('ensp;'), $toCharArray('eogon;'), $toCharArray('eopf;'), $toCharArray('epar;'), $toCharArray('eparsl;'), $toCharArray('eplus;'), $toCharArray('epsi;'), $toCharArray('epsilon;'), $toCharArray('epsiv;'), $toCharArray('eqcirc;'), $toCharArray('eqcolon;'), $toCharArray('eqsim;'), $toCharArray('eqslantgtr;'), $toCharArray('eqslantless;'), $toCharArray('equals;'), $toCharArray('equest;'), $toCharArray('equiv;'), $toCharArray('equivDD;'), $toCharArray('eqvparsl;'), $toCharArray('erDot;'), $toCharArray('erarr;'), $toCharArray('escr;'), $toCharArray('esdot;'), $toCharArray('esim;'), $toCharArray('eta;'), $toCharArray('eth'), $toCharArray('eth;'), $toCharArray('euml'), $toCharArray('euml;'), $toCharArray('euro;'), $toCharArray('excl;'), $toCharArray('exist;'), $toCharArray('expectation;'), $toCharArray('exponentiale;'), $toCharArray('fallingdotseq;'), $toCharArray('fcy;'), $toCharArray('female;'), $toCharArray('ffilig;'), $toCharArray('fflig;'), $toCharArray('ffllig;'), $toCharArray('ffr;'), $toCharArray('filig;'), $toCharArray('flat;'), $toCharArray('fllig;'), $toCharArray('fltns;'), $toCharArray('fnof;'), $toCharArray('fopf;'), $toCharArray('forall;'), $toCharArray('fork;'), $toCharArray('forkv;'), $toCharArray('fpartint;'), $toCharArray('frac12'), $toCharArray('frac12;'), $toCharArray('frac13;'), $toCharArray('frac14'), $toCharArray('frac14;'), $toCharArray('frac15;'), $toCharArray('frac16;'), $toCharArray('frac18;'), $toCharArray('frac23;'), $toCharArray('frac25;'), $toCharArray('frac34'), $toCharArray('frac34;'), $toCharArray('frac35;'), $toCharArray('frac38;'), $toCharArray('frac45;'), $toCharArray('frac56;'), $toCharArray('frac58;'), $toCharArray('frac78;'), $toCharArray('frasl;'), $toCharArray('frown;'), $toCharArray('fscr;'), $toCharArray('gE;'), $toCharArray('gEl;'), $toCharArray('gacute;'), $toCharArray('gamma;'), $toCharArray('gammad;'), $toCharArray('gap;'), $toCharArray('gbreve;'), $toCharArray('gcirc;'), $toCharArray('gcy;'), $toCharArray('gdot;'), $toCharArray('ge;'), $toCharArray('gel;'), $toCharArray('geq;'), $toCharArray('geqq;'), $toCharArray('geqslant;'), $toCharArray('ges;'), $toCharArray('gescc;'), $toCharArray('gesdot;'), $toCharArray('gesdoto;'), $toCharArray('gesdotol;'), $toCharArray('gesles;'), $toCharArray('gfr;'), $toCharArray('gg;'), $toCharArray('ggg;'), $toCharArray('gimel;'), $toCharArray('gjcy;'), $toCharArray('gl;'), $toCharArray('glE;'), $toCharArray('gla;'), $toCharArray('glj;'), $toCharArray('gnE;'), $toCharArray('gnap;'), $toCharArray('gnapprox;'), $toCharArray('gne;'), $toCharArray('gneq;'), $toCharArray('gneqq;'), $toCharArray('gnsim;'), $toCharArray('gopf;'), $toCharArray('grave;'), $toCharArray('gscr;'), $toCharArray('gsim;'), $toCharArray('gsime;'), $toCharArray('gsiml;'), $toCharArray('gt'), $toCharArray('gt;'), $toCharArray('gtcc;'), $toCharArray('gtcir;'), $toCharArray('gtdot;'), $toCharArray('gtlPar;'), $toCharArray('gtquest;'), $toCharArray('gtrapprox;'), $toCharArray('gtrarr;'), $toCharArray('gtrdot;'), $toCharArray('gtreqless;'), $toCharArray('gtreqqless;'), $toCharArray('gtrless;'), $toCharArray('gtrsim;'), $toCharArray('hArr;'), $toCharArray('hairsp;'), $toCharArray('half;'), $toCharArray('hamilt;'), $toCharArray('hardcy;'), $toCharArray('harr;'), $toCharArray('harrcir;'), $toCharArray('harrw;'), $toCharArray('hbar;'), $toCharArray('hcirc;'), $toCharArray('hearts;'), $toCharArray('heartsuit;'), $toCharArray('hellip;'), $toCharArray('hercon;'), $toCharArray('hfr;'), $toCharArray('hksearow;'), $toCharArray('hkswarow;'), $toCharArray('hoarr;'), $toCharArray('homtht;'), $toCharArray('hookleftarrow;'), $toCharArray('hookrightarrow;'), $toCharArray('hopf;'), $toCharArray('horbar;'), $toCharArray('hscr;'), $toCharArray('hslash;'), $toCharArray('hstrok;'), $toCharArray('hybull;'), $toCharArray('hyphen;'), $toCharArray('iacute'), $toCharArray('iacute;'), $toCharArray('ic;'), $toCharArray('icirc'), $toCharArray('icirc;'), $toCharArray('icy;'), $toCharArray('iecy;'), $toCharArray('iexcl'), $toCharArray('iexcl;'), $toCharArray('iff;'), $toCharArray('ifr;'), $toCharArray('igrave'), $toCharArray('igrave;'), $toCharArray('ii;'), $toCharArray('iiiint;'), $toCharArray('iiint;'), $toCharArray('iinfin;'), $toCharArray('iiota;'), $toCharArray('ijlig;'), $toCharArray('imacr;'), $toCharArray('image;'), $toCharArray('imagline;'), $toCharArray('imagpart;'), $toCharArray('imath;'), $toCharArray('imof;'), $toCharArray('imped;'), $toCharArray('in;'), $toCharArray('incare;'), $toCharArray('infin;'), $toCharArray('infintie;'), $toCharArray('inodot;'), $toCharArray('int;'), $toCharArray('intcal;'), $toCharArray('integers;'), $toCharArray('intercal;'), $toCharArray('intlarhk;'), $toCharArray('intprod;'), $toCharArray('iocy;'), $toCharArray('iogon;'), $toCharArray('iopf;'), $toCharArray('iota;'), $toCharArray('iprod;'), $toCharArray('iquest'), $toCharArray('iquest;'), $toCharArray('iscr;'), $toCharArray('isin;'), $toCharArray('isinE;'), $toCharArray('isindot;'), $toCharArray('isins;'), $toCharArray('isinsv;'), $toCharArray('isinv;'), $toCharArray('it;'), $toCharArray('itilde;'), $toCharArray('iukcy;'), $toCharArray('iuml'), $toCharArray('iuml;'), $toCharArray('jcirc;'), $toCharArray('jcy;'), $toCharArray('jfr;'), $toCharArray('jmath;'), $toCharArray('jopf;'), $toCharArray('jscr;'), $toCharArray('jsercy;'), $toCharArray('jukcy;'), $toCharArray('kappa;'), $toCharArray('kappav;'), $toCharArray('kcedil;'), $toCharArray('kcy;'), $toCharArray('kfr;'), $toCharArray('kgreen;'), $toCharArray('khcy;'), $toCharArray('kjcy;'), $toCharArray('kopf;'), $toCharArray('kscr;'), $toCharArray('lAarr;'), $toCharArray('lArr;'), $toCharArray('lAtail;'), $toCharArray('lBarr;'), $toCharArray('lE;'), $toCharArray('lEg;'), $toCharArray('lHar;'), $toCharArray('lacute;'), $toCharArray('laemptyv;'), $toCharArray('lagran;'), $toCharArray('lambda;'), $toCharArray('lang;'), $toCharArray('langd;'), $toCharArray('langle;'), $toCharArray('lap;'), $toCharArray('laquo'), $toCharArray('laquo;'), $toCharArray('larr;'), $toCharArray('larrb;'), $toCharArray('larrbfs;'), $toCharArray('larrfs;'), $toCharArray('larrhk;'), $toCharArray('larrlp;'), $toCharArray('larrpl;'), $toCharArray('larrsim;'), $toCharArray('larrtl;'), $toCharArray('lat;'), $toCharArray('latail;'), $toCharArray('late;'), $toCharArray('lbarr;'), $toCharArray('lbbrk;'), $toCharArray('lbrace;'), $toCharArray('lbrack;'), $toCharArray('lbrke;'), $toCharArray('lbrksld;'), $toCharArray('lbrkslu;'), $toCharArray('lcaron;'), $toCharArray('lcedil;'), $toCharArray('lceil;'), $toCharArray('lcub;'), $toCharArray('lcy;'), $toCharArray('ldca;'), $toCharArray('ldquo;'), $toCharArray('ldquor;'), $toCharArray('ldrdhar;'), $toCharArray('ldrushar;'), $toCharArray('ldsh;'), $toCharArray('le;'), $toCharArray('leftarrow;'), $toCharArray('leftarrowtail;'), $toCharArray('leftharpoondown;'), $toCharArray('leftharpoonup;'), $toCharArray('leftleftarrows;'), $toCharArray('leftrightarrow;'), $toCharArray('leftrightarrows;'), $toCharArray('leftrightharpoons;'), $toCharArray('leftrightsquigarrow;'), $toCharArray('leftthreetimes;'), $toCharArray('leg;'), $toCharArray('leq;'), $toCharArray('leqq;'), $toCharArray('leqslant;'), $toCharArray('les;'), $toCharArray('lescc;'), $toCharArray('lesdot;'), $toCharArray('lesdoto;'), $toCharArray('lesdotor;'), $toCharArray('lesges;'), $toCharArray('lessapprox;'), $toCharArray('lessdot;'), $toCharArray('lesseqgtr;'), $toCharArray('lesseqqgtr;'), $toCharArray('lessgtr;'), $toCharArray('lesssim;'), $toCharArray('lfisht;'), $toCharArray('lfloor;'), $toCharArray('lfr;'), $toCharArray('lg;'), $toCharArray('lgE;'), $toCharArray('lhard;'), $toCharArray('lharu;'), $toCharArray('lharul;'), $toCharArray('lhblk;'), $toCharArray('ljcy;'), $toCharArray('ll;'), $toCharArray('llarr;'), $toCharArray('llcorner;'), $toCharArray('llhard;'), $toCharArray('lltri;'), $toCharArray('lmidot;'), $toCharArray('lmoust;'), $toCharArray('lmoustache;'), $toCharArray('lnE;'), $toCharArray('lnap;'), $toCharArray('lnapprox;'), $toCharArray('lne;'), $toCharArray('lneq;'), $toCharArray('lneqq;'), $toCharArray('lnsim;'), $toCharArray('loang;'), $toCharArray('loarr;'), $toCharArray('lobrk;'), $toCharArray('longleftarrow;'), $toCharArray('longleftrightarrow;'), $toCharArray('longmapsto;'), $toCharArray('longrightarrow;'), $toCharArray('looparrowleft;'), $toCharArray('looparrowright;'), $toCharArray('lopar;'), $toCharArray('lopf;'), $toCharArray('loplus;'), $toCharArray('lotimes;'), $toCharArray('lowast;'), $toCharArray('lowbar;'), $toCharArray('loz;'), $toCharArray('lozenge;'), $toCharArray('lozf;'), $toCharArray('lpar;'), $toCharArray('lparlt;'), $toCharArray('lrarr;'), $toCharArray('lrcorner;'), $toCharArray('lrhar;'), $toCharArray('lrhard;'), $toCharArray('lrm;'), $toCharArray('lrtri;'), $toCharArray('lsaquo;'), $toCharArray('lscr;'), $toCharArray('lsh;'), $toCharArray('lsim;'), $toCharArray('lsime;'), $toCharArray('lsimg;'), $toCharArray('lsqb;'), $toCharArray('lsquo;'), $toCharArray('lsquor;'), $toCharArray('lstrok;'), $toCharArray('lt'), $toCharArray('lt;'), $toCharArray('ltcc;'), $toCharArray('ltcir;'), $toCharArray('ltdot;'), $toCharArray('lthree;'), $toCharArray('ltimes;'), $toCharArray('ltlarr;'), $toCharArray('ltquest;'), $toCharArray('ltrPar;'), $toCharArray('ltri;'), $toCharArray('ltrie;'), $toCharArray('ltrif;'), $toCharArray('lurdshar;'), $toCharArray('luruhar;'), $toCharArray('mDDot;'), $toCharArray('macr'), $toCharArray('macr;'), $toCharArray('male;'), $toCharArray('malt;'), $toCharArray('maltese;'), $toCharArray('map;'), $toCharArray('mapsto;'), $toCharArray('mapstodown;'), $toCharArray('mapstoleft;'), $toCharArray('mapstoup;'), $toCharArray('marker;'), $toCharArray('mcomma;'), $toCharArray('mcy;'), $toCharArray('mdash;'), $toCharArray('measuredangle;'), $toCharArray('mfr;'), $toCharArray('mho;'), $toCharArray('micro'), $toCharArray('micro;'), $toCharArray('mid;'), $toCharArray('midast;'), $toCharArray('midcir;'), $toCharArray('middot'), $toCharArray('middot;'), $toCharArray('minus;'), $toCharArray('minusb;'), $toCharArray('minusd;'), $toCharArray('minusdu;'), $toCharArray('mlcp;'), $toCharArray('mldr;'), $toCharArray('mnplus;'), $toCharArray('models;'), $toCharArray('mopf;'), $toCharArray('mp;'), $toCharArray('mscr;'), $toCharArray('mstpos;'), $toCharArray('mu;'), $toCharArray('multimap;'), $toCharArray('mumap;'), $toCharArray('nLeftarrow;'), $toCharArray('nLeftrightarrow;'), $toCharArray('nRightarrow;'), $toCharArray('nVDash;'), $toCharArray('nVdash;'), $toCharArray('nabla;'), $toCharArray('nacute;'), $toCharArray('nap;'), $toCharArray('napos;'), $toCharArray('napprox;'), $toCharArray('natur;'), $toCharArray('natural;'), $toCharArray('naturals;'), $toCharArray('nbsp'), $toCharArray('nbsp;'), $toCharArray('ncap;'), $toCharArray('ncaron;'), $toCharArray('ncedil;'), $toCharArray('ncong;'), $toCharArray('ncup;'), $toCharArray('ncy;'), $toCharArray('ndash;'), $toCharArray('ne;'), $toCharArray('neArr;'), $toCharArray('nearhk;'), $toCharArray('nearr;'), $toCharArray('nearrow;'), $toCharArray('nequiv;'), $toCharArray('nesear;'), $toCharArray('nexist;'), $toCharArray('nexists;'), $toCharArray('nfr;'), $toCharArray('nge;'), $toCharArray('ngeq;'), $toCharArray('ngsim;'), $toCharArray('ngt;'), $toCharArray('ngtr;'), $toCharArray('nhArr;'), $toCharArray('nharr;'), $toCharArray('nhpar;'), $toCharArray('ni;'), $toCharArray('nis;'), $toCharArray('nisd;'), $toCharArray('niv;'), $toCharArray('njcy;'), $toCharArray('nlArr;'), $toCharArray('nlarr;'), $toCharArray('nldr;'), $toCharArray('nle;'), $toCharArray('nleftarrow;'), $toCharArray('nleftrightarrow;'), $toCharArray('nleq;'), $toCharArray('nless;'), $toCharArray('nlsim;'), $toCharArray('nlt;'), $toCharArray('nltri;'), $toCharArray('nltrie;'), $toCharArray('nmid;'), $toCharArray('nopf;'), $toCharArray('not'), $toCharArray('not;'), $toCharArray('notin;'), $toCharArray('notinva;'), $toCharArray('notinvb;'), $toCharArray('notinvc;'), $toCharArray('notni;'), $toCharArray('notniva;'), $toCharArray('notnivb;'), $toCharArray('notnivc;'), $toCharArray('npar;'), $toCharArray('nparallel;'), $toCharArray('npolint;'), $toCharArray('npr;'), $toCharArray('nprcue;'), $toCharArray('nprec;'), $toCharArray('nrArr;'), $toCharArray('nrarr;'), $toCharArray('nrightarrow;'), $toCharArray('nrtri;'), $toCharArray('nrtrie;'), $toCharArray('nsc;'), $toCharArray('nsccue;'), $toCharArray('nscr;'), $toCharArray('nshortmid;'), $toCharArray('nshortparallel;'), $toCharArray('nsim;'), $toCharArray('nsime;'), $toCharArray('nsimeq;'), $toCharArray('nsmid;'), $toCharArray('nspar;'), $toCharArray('nsqsube;'), $toCharArray('nsqsupe;'), $toCharArray('nsub;'), $toCharArray('nsube;'), $toCharArray('nsubseteq;'), $toCharArray('nsucc;'), $toCharArray('nsup;'), $toCharArray('nsupe;'), $toCharArray('nsupseteq;'), $toCharArray('ntgl;'), $toCharArray('ntilde'), $toCharArray('ntilde;'), $toCharArray('ntlg;'), $toCharArray('ntriangleleft;'), $toCharArray('ntrianglelefteq;'), $toCharArray('ntriangleright;'), $toCharArray('ntrianglerighteq;'), $toCharArray('nu;'), $toCharArray('num;'), $toCharArray('numero;'), $toCharArray('numsp;'), $toCharArray('nvDash;'), $toCharArray('nvHarr;'), $toCharArray('nvdash;'), $toCharArray('nvinfin;'), $toCharArray('nvlArr;'), $toCharArray('nvrArr;'), $toCharArray('nwArr;'), $toCharArray('nwarhk;'), $toCharArray('nwarr;'), $toCharArray('nwarrow;'), $toCharArray('nwnear;'), $toCharArray('oS;'), $toCharArray('oacute'), $toCharArray('oacute;'), $toCharArray('oast;'), $toCharArray('ocir;'), $toCharArray('ocirc'), $toCharArray('ocirc;'), $toCharArray('ocy;'), $toCharArray('odash;'), $toCharArray('odblac;'), $toCharArray('odiv;'), $toCharArray('odot;'), $toCharArray('odsold;'), $toCharArray('oelig;'), $toCharArray('ofcir;'), $toCharArray('ofr;'), $toCharArray('ogon;'), $toCharArray('ograve'), $toCharArray('ograve;'), $toCharArray('ogt;'), $toCharArray('ohbar;'), $toCharArray('ohm;'), $toCharArray('oint;'), $toCharArray('olarr;'), $toCharArray('olcir;'), $toCharArray('olcross;'), $toCharArray('oline;'), $toCharArray('olt;'), $toCharArray('omacr;'), $toCharArray('omega;'), $toCharArray('omicron;'), $toCharArray('omid;'), $toCharArray('ominus;'), $toCharArray('oopf;'), $toCharArray('opar;'), $toCharArray('operp;'), $toCharArray('oplus;'), $toCharArray('or;'), $toCharArray('orarr;'), $toCharArray('ord;'), $toCharArray('order;'), $toCharArray('orderof;'), $toCharArray('ordf'), $toCharArray('ordf;'), $toCharArray('ordm'), $toCharArray('ordm;'), $toCharArray('origof;'), $toCharArray('oror;'), $toCharArray('orslope;'), $toCharArray('orv;'), $toCharArray('oscr;'), $toCharArray('oslash'), $toCharArray('oslash;'), $toCharArray('osol;'), $toCharArray('otilde'), $toCharArray('otilde;'), $toCharArray('otimes;'), $toCharArray('otimesas;'), $toCharArray('ouml'), $toCharArray('ouml;'), $toCharArray('ovbar;'), $toCharArray('par;'), $toCharArray('para'), $toCharArray('para;'), $toCharArray('parallel;'), $toCharArray('parsim;'), $toCharArray('parsl;'), $toCharArray('part;'), $toCharArray('pcy;'), $toCharArray('percnt;'), $toCharArray('period;'), $toCharArray('permil;'), $toCharArray('perp;'), $toCharArray('pertenk;'), $toCharArray('pfr;'), $toCharArray('phi;'), $toCharArray('phiv;'), $toCharArray('phmmat;'), $toCharArray('phone;'), $toCharArray('pi;'), $toCharArray('pitchfork;'), $toCharArray('piv;'), $toCharArray('planck;'), $toCharArray('planckh;'), $toCharArray('plankv;'), $toCharArray('plus;'), $toCharArray('plusacir;'), $toCharArray('plusb;'), $toCharArray('pluscir;'), $toCharArray('plusdo;'), $toCharArray('plusdu;'), $toCharArray('pluse;'), $toCharArray('plusmn'), $toCharArray('plusmn;'), $toCharArray('plussim;'), $toCharArray('plustwo;'), $toCharArray('pm;'), $toCharArray('pointint;'), $toCharArray('popf;'), $toCharArray('pound'), $toCharArray('pound;'), $toCharArray('pr;'), $toCharArray('prE;'), $toCharArray('prap;'), $toCharArray('prcue;'), $toCharArray('pre;'), $toCharArray('prec;'), $toCharArray('precapprox;'), $toCharArray('preccurlyeq;'), $toCharArray('preceq;'), $toCharArray('precnapprox;'), $toCharArray('precneqq;'), $toCharArray('precnsim;'), $toCharArray('precsim;'), $toCharArray('prime;'), $toCharArray('primes;'), $toCharArray('prnE;'), $toCharArray('prnap;'), $toCharArray('prnsim;'), $toCharArray('prod;'), $toCharArray('profalar;'), $toCharArray('profline;'), $toCharArray('profsurf;'), $toCharArray('prop;'), $toCharArray('propto;'), $toCharArray('prsim;'), $toCharArray('prurel;'), $toCharArray('pscr;'), $toCharArray('psi;'), $toCharArray('puncsp;'), $toCharArray('qfr;'), $toCharArray('qint;'), $toCharArray('qopf;'), $toCharArray('qprime;'), $toCharArray('qscr;'), $toCharArray('quaternions;'), $toCharArray('quatint;'), $toCharArray('quest;'), $toCharArray('questeq;'), $toCharArray('quot'), $toCharArray('quot;'), $toCharArray('rAarr;'), $toCharArray('rArr;'), $toCharArray('rAtail;'), $toCharArray('rBarr;'), $toCharArray('rHar;'), $toCharArray('race;'), $toCharArray('racute;'), $toCharArray('radic;'), $toCharArray('raemptyv;'), $toCharArray('rang;'), $toCharArray('rangd;'), $toCharArray('range;'), $toCharArray('rangle;'), $toCharArray('raquo'), $toCharArray('raquo;'), $toCharArray('rarr;'), $toCharArray('rarrap;'), $toCharArray('rarrb;'), $toCharArray('rarrbfs;'), $toCharArray('rarrc;'), $toCharArray('rarrfs;'), $toCharArray('rarrhk;'), $toCharArray('rarrlp;'), $toCharArray('rarrpl;'), $toCharArray('rarrsim;'), $toCharArray('rarrtl;'), $toCharArray('rarrw;'), $toCharArray('ratail;'), $toCharArray('ratio;'), $toCharArray('rationals;'), $toCharArray('rbarr;'), $toCharArray('rbbrk;'), $toCharArray('rbrace;'), $toCharArray('rbrack;'), $toCharArray('rbrke;'), $toCharArray('rbrksld;'), $toCharArray('rbrkslu;'), $toCharArray('rcaron;'), $toCharArray('rcedil;'), $toCharArray('rceil;'), $toCharArray('rcub;'), $toCharArray('rcy;'), $toCharArray('rdca;'), $toCharArray('rdldhar;'), $toCharArray('rdquo;'), $toCharArray('rdquor;'), $toCharArray('rdsh;'), $toCharArray('real;'), $toCharArray('realine;'), $toCharArray('realpart;'), $toCharArray('reals;'), $toCharArray('rect;'), $toCharArray('reg'), $toCharArray('reg;'), $toCharArray('rfisht;'), $toCharArray('rfloor;'), $toCharArray('rfr;'), $toCharArray('rhard;'), $toCharArray('rharu;'), $toCharArray('rharul;'), $toCharArray('rho;'), $toCharArray('rhov;'), $toCharArray('rightarrow;'), $toCharArray('rightarrowtail;'), $toCharArray('rightharpoondown;'), $toCharArray('rightharpoonup;'), $toCharArray('rightleftarrows;'), $toCharArray('rightleftharpoons;'), $toCharArray('rightrightarrows;'), $toCharArray('rightsquigarrow;'), $toCharArray('rightthreetimes;'), $toCharArray('ring;'), $toCharArray('risingdotseq;'), $toCharArray('rlarr;'), $toCharArray('rlhar;'), $toCharArray('rlm;'), $toCharArray('rmoust;'), $toCharArray('rmoustache;'), $toCharArray('rnmid;'), $toCharArray('roang;'), $toCharArray('roarr;'), $toCharArray('robrk;'), $toCharArray('ropar;'), $toCharArray('ropf;'), $toCharArray('roplus;'), $toCharArray('rotimes;'), $toCharArray('rpar;'), $toCharArray('rpargt;'), $toCharArray('rppolint;'), $toCharArray('rrarr;'), $toCharArray('rsaquo;'), $toCharArray('rscr;'), $toCharArray('rsh;'), $toCharArray('rsqb;'), $toCharArray('rsquo;'), $toCharArray('rsquor;'), $toCharArray('rthree;'), $toCharArray('rtimes;'), $toCharArray('rtri;'), $toCharArray('rtrie;'), $toCharArray('rtrif;'), $toCharArray('rtriltri;'), $toCharArray('ruluhar;'), $toCharArray('rx;'), $toCharArray('sacute;'), $toCharArray('sbquo;'), $toCharArray('sc;'), $toCharArray('scE;'), $toCharArray('scap;'), $toCharArray('scaron;'), $toCharArray('sccue;'), $toCharArray('sce;'), $toCharArray('scedil;'), $toCharArray('scirc;'), $toCharArray('scnE;'), $toCharArray('scnap;'), $toCharArray('scnsim;'), $toCharArray('scpolint;'), $toCharArray('scsim;'), $toCharArray('scy;'), $toCharArray('sdot;'), $toCharArray('sdotb;'), $toCharArray('sdote;'), $toCharArray('seArr;'), $toCharArray('searhk;'), $toCharArray('searr;'), $toCharArray('searrow;'), $toCharArray('sect'), $toCharArray('sect;'), $toCharArray('semi;'), $toCharArray('seswar;'), $toCharArray('setminus;'), $toCharArray('setmn;'), $toCharArray('sext;'), $toCharArray('sfr;'), $toCharArray('sfrown;'), $toCharArray('sharp;'), $toCharArray('shchcy;'), $toCharArray('shcy;'), $toCharArray('shortmid;'), $toCharArray('shortparallel;'), $toCharArray('shy'), $toCharArray('shy;'), $toCharArray('sigma;'), $toCharArray('sigmaf;'), $toCharArray('sigmav;'), $toCharArray('sim;'), $toCharArray('simdot;'), $toCharArray('sime;'), $toCharArray('simeq;'), $toCharArray('simg;'), $toCharArray('simgE;'), $toCharArray('siml;'), $toCharArray('simlE;'), $toCharArray('simne;'), $toCharArray('simplus;'), $toCharArray('simrarr;'), $toCharArray('slarr;'), $toCharArray('smallsetminus;'), $toCharArray('smashp;'), $toCharArray('smeparsl;'), $toCharArray('smid;'), $toCharArray('smile;'), $toCharArray('smt;'), $toCharArray('smte;'), $toCharArray('softcy;'), $toCharArray('sol;'), $toCharArray('solb;'), $toCharArray('solbar;'), $toCharArray('sopf;'), $toCharArray('spades;'), $toCharArray('spadesuit;'), $toCharArray('spar;'), $toCharArray('sqcap;'), $toCharArray('sqcup;'), $toCharArray('sqsub;'), $toCharArray('sqsube;'), $toCharArray('sqsubset;'), $toCharArray('sqsubseteq;'), $toCharArray('sqsup;'), $toCharArray('sqsupe;'), $toCharArray('sqsupset;'), $toCharArray('sqsupseteq;'), $toCharArray('squ;'), $toCharArray('square;'), $toCharArray('squarf;'), $toCharArray('squf;'), $toCharArray('srarr;'), $toCharArray('sscr;'), $toCharArray('ssetmn;'), $toCharArray('ssmile;'), $toCharArray('sstarf;'), $toCharArray('star;'), $toCharArray('starf;'), $toCharArray('straightepsilon;'), $toCharArray('straightphi;'), $toCharArray('strns;'), $toCharArray('sub;'), $toCharArray('subE;'), $toCharArray('subdot;'), $toCharArray('sube;'), $toCharArray('subedot;'), $toCharArray('submult;'), $toCharArray('subnE;'), $toCharArray('subne;'), $toCharArray('subplus;'), $toCharArray('subrarr;'), $toCharArray('subset;'), $toCharArray('subseteq;'), $toCharArray('subseteqq;'), $toCharArray('subsetneq;'), $toCharArray('subsetneqq;'), $toCharArray('subsim;'), $toCharArray('subsub;'), $toCharArray('subsup;'), $toCharArray('succ;'), $toCharArray('succapprox;'), $toCharArray('succcurlyeq;'), $toCharArray('succeq;'), $toCharArray('succnapprox;'), $toCharArray('succneqq;'), $toCharArray('succnsim;'), $toCharArray('succsim;'), $toCharArray('sum;'), $toCharArray('sung;'), $toCharArray('sup1'), $toCharArray('sup1;'), $toCharArray('sup2'), $toCharArray('sup2;'), $toCharArray('sup3'), $toCharArray('sup3;'), $toCharArray('sup;'), $toCharArray('supE;'), $toCharArray('supdot;'), $toCharArray('supdsub;'), $toCharArray('supe;'), $toCharArray('supedot;'), $toCharArray('suphsub;'), $toCharArray('suplarr;'), $toCharArray('supmult;'), $toCharArray('supnE;'), $toCharArray('supne;'), $toCharArray('supplus;'), $toCharArray('supset;'), $toCharArray('supseteq;'), $toCharArray('supseteqq;'), $toCharArray('supsetneq;'), $toCharArray('supsetneqq;'), $toCharArray('supsim;'), $toCharArray('supsub;'), $toCharArray('supsup;'), $toCharArray('swArr;'), $toCharArray('swarhk;'), $toCharArray('swarr;'), $toCharArray('swarrow;'), $toCharArray('swnwar;'), $toCharArray('szlig'), $toCharArray('szlig;'), $toCharArray('target;'), $toCharArray('tau;'), $toCharArray('tbrk;'), $toCharArray('tcaron;'), $toCharArray('tcedil;'), $toCharArray('tcy;'), $toCharArray('tdot;'), $toCharArray('telrec;'), $toCharArray('tfr;'), $toCharArray('there4;'), $toCharArray('therefore;'), $toCharArray('theta;'), $toCharArray('thetasym;'), $toCharArray('thetav;'), $toCharArray('thickapprox;'), $toCharArray('thicksim;'), $toCharArray('thinsp;'), $toCharArray('thkap;'), $toCharArray('thksim;'), $toCharArray('thorn'), $toCharArray('thorn;'), $toCharArray('tilde;'), $toCharArray('times'), $toCharArray('times;'), $toCharArray('timesb;'), $toCharArray('timesbar;'), $toCharArray('timesd;'), $toCharArray('tint;'), $toCharArray('toea;'), $toCharArray('top;'), $toCharArray('topbot;'), $toCharArray('topcir;'), $toCharArray('topf;'), $toCharArray('topfork;'), $toCharArray('tosa;'), $toCharArray('tprime;'), $toCharArray('trade;'), $toCharArray('triangle;'), $toCharArray('triangledown;'), $toCharArray('triangleleft;'), $toCharArray('trianglelefteq;'), $toCharArray('triangleq;'), $toCharArray('triangleright;'), $toCharArray('trianglerighteq;'), $toCharArray('tridot;'), $toCharArray('trie;'), $toCharArray('triminus;'), $toCharArray('triplus;'), $toCharArray('trisb;'), $toCharArray('tritime;'), $toCharArray('trpezium;'), $toCharArray('tscr;'), $toCharArray('tscy;'), $toCharArray('tshcy;'), $toCharArray('tstrok;'), $toCharArray('twixt;'), $toCharArray('twoheadleftarrow;'), $toCharArray('twoheadrightarrow;'), $toCharArray('uArr;'), $toCharArray('uHar;'), $toCharArray('uacute'), $toCharArray('uacute;'), $toCharArray('uarr;'), $toCharArray('ubrcy;'), $toCharArray('ubreve;'), $toCharArray('ucirc'), $toCharArray('ucirc;'), $toCharArray('ucy;'), $toCharArray('udarr;'), $toCharArray('udblac;'), $toCharArray('udhar;'), $toCharArray('ufisht;'), $toCharArray('ufr;'), $toCharArray('ugrave'), $toCharArray('ugrave;'), $toCharArray('uharl;'), $toCharArray('uharr;'), $toCharArray('uhblk;'), $toCharArray('ulcorn;'), $toCharArray('ulcorner;'), $toCharArray('ulcrop;'), $toCharArray('ultri;'), $toCharArray('umacr;'), $toCharArray('uml'), $toCharArray('uml;'), $toCharArray('uogon;'), $toCharArray('uopf;'), $toCharArray('uparrow;'), $toCharArray('updownarrow;'), $toCharArray('upharpoonleft;'), $toCharArray('upharpoonright;'), $toCharArray('uplus;'), $toCharArray('upsi;'), $toCharArray('upsih;'), $toCharArray('upsilon;'), $toCharArray('upuparrows;'), $toCharArray('urcorn;'), $toCharArray('urcorner;'), $toCharArray('urcrop;'), $toCharArray('uring;'), $toCharArray('urtri;'), $toCharArray('uscr;'), $toCharArray('utdot;'), $toCharArray('utilde;'), $toCharArray('utri;'), $toCharArray('utrif;'), $toCharArray('uuarr;'), $toCharArray('uuml'), $toCharArray('uuml;'), $toCharArray('uwangle;'), $toCharArray('vArr;'), $toCharArray('vBar;'), $toCharArray('vBarv;'), $toCharArray('vDash;'), $toCharArray('vangrt;'), $toCharArray('varepsilon;'), $toCharArray('varkappa;'), $toCharArray('varnothing;'), $toCharArray('varphi;'), $toCharArray('varpi;'), $toCharArray('varpropto;'), $toCharArray('varr;'), $toCharArray('varrho;'), $toCharArray('varsigma;'), $toCharArray('vartheta;'), $toCharArray('vartriangleleft;'), $toCharArray('vartriangleright;'), $toCharArray('vcy;'), $toCharArray('vdash;'), $toCharArray('vee;'), $toCharArray('veebar;'), $toCharArray('veeeq;'), $toCharArray('vellip;'), $toCharArray('verbar;'), $toCharArray('vert;'), $toCharArray('vfr;'), $toCharArray('vltri;'), $toCharArray('vopf;'), $toCharArray('vprop;'), $toCharArray('vrtri;'), $toCharArray('vscr;'), $toCharArray('vzigzag;'), $toCharArray('wcirc;'), $toCharArray('wedbar;'), $toCharArray('wedge;'), $toCharArray('wedgeq;'), $toCharArray('weierp;'), $toCharArray('wfr;'), $toCharArray('wopf;'), $toCharArray('wp;'), $toCharArray('wr;'), $toCharArray('wreath;'), $toCharArray('wscr;'), $toCharArray('xcap;'), $toCharArray('xcirc;'), $toCharArray('xcup;'), $toCharArray('xdtri;'), $toCharArray('xfr;'), $toCharArray('xhArr;'), $toCharArray('xharr;'), $toCharArray('xi;'), $toCharArray('xlArr;'), $toCharArray('xlarr;'), $toCharArray('xmap;'), $toCharArray('xnis;'), $toCharArray('xodot;'), $toCharArray('xopf;'), $toCharArray('xoplus;'), $toCharArray('xotime;'), $toCharArray('xrArr;'), $toCharArray('xrarr;'), $toCharArray('xscr;'), $toCharArray('xsqcup;'), $toCharArray('xuplus;'), $toCharArray('xutri;'), $toCharArray('xvee;'), $toCharArray('xwedge;'), $toCharArray('yacute'), $toCharArray('yacute;'), $toCharArray('yacy;'), $toCharArray('ycirc;'), $toCharArray('ycy;'), $toCharArray('yen'), $toCharArray('yen;'), $toCharArray('yfr;'), $toCharArray('yicy;'), $toCharArray('yopf;'), $toCharArray('yscr;'), $toCharArray('yucy;'), $toCharArray('yuml'), $toCharArray('yuml;'), $toCharArray('zacute;'), $toCharArray('zcaron;'), $toCharArray('zcy;'), $toCharArray('zdot;'), $toCharArray('zeetrf;'), $toCharArray('zeta;'), $toCharArray('zfr;'), $toCharArray('zhcy;'), $toCharArray('zigrarr;'), $toCharArray('zopf;'), $toCharArray('zscr;'), $toCharArray('zwj;'), $toCharArray('zwnj;')]);
  VALUES_0 = initValues(_3_3C_classLit, 52, 12, [initValues(_3C_classLit, 42, -1, [198]), initValues(_3C_classLit, 42, -1, [198]), initValues(_3C_classLit, 42, -1, [38]), initValues(_3C_classLit, 42, -1, [38]), initValues(_3C_classLit, 42, -1, [193]), initValues(_3C_classLit, 42, -1, [193]), initValues(_3C_classLit, 42, -1, [258]), initValues(_3C_classLit, 42, -1, [194]), initValues(_3C_classLit, 42, -1, [194]), initValues(_3C_classLit, 42, -1, [1040]), initValues(_3C_classLit, 42, -1, [55349, 56580]), initValues(_3C_classLit, 42, -1, [192]), initValues(_3C_classLit, 42, -1, [192]), initValues(_3C_classLit, 42, -1, [913]), initValues(_3C_classLit, 42, -1, [256]), initValues(_3C_classLit, 42, -1, [10835]), initValues(_3C_classLit, 42, -1, [260]), initValues(_3C_classLit, 42, -1, [55349, 56632]), initValues(_3C_classLit, 42, -1, [8289]), initValues(_3C_classLit, 42, -1, [197]), initValues(_3C_classLit, 42, -1, [197]), initValues(_3C_classLit, 42, -1, [55349, 56476]), initValues(_3C_classLit, 42, -1, [8788]), initValues(_3C_classLit, 42, -1, [195]), initValues(_3C_classLit, 42, -1, [195]), initValues(_3C_classLit, 42, -1, [196]), initValues(_3C_classLit, 42, -1, [196]), initValues(_3C_classLit, 42, -1, [8726]), initValues(_3C_classLit, 42, -1, [10983]), initValues(_3C_classLit, 42, -1, [8966]), initValues(_3C_classLit, 42, -1, [1041]), initValues(_3C_classLit, 42, -1, [8757]), initValues(_3C_classLit, 42, -1, [8492]), initValues(_3C_classLit, 42, -1, [914]), initValues(_3C_classLit, 42, -1, [55349, 56581]), initValues(_3C_classLit, 42, -1, [55349, 56633]), initValues(_3C_classLit, 42, -1, [728]), initValues(_3C_classLit, 42, -1, [8492]), initValues(_3C_classLit, 42, -1, [8782]), initValues(_3C_classLit, 42, -1, [1063]), initValues(_3C_classLit, 42, -1, [169]), initValues(_3C_classLit, 42, -1, [169]), initValues(_3C_classLit, 42, -1, [262]), initValues(_3C_classLit, 42, -1, [8914]), initValues(_3C_classLit, 42, -1, [8517]), initValues(_3C_classLit, 42, -1, [8493]), initValues(_3C_classLit, 42, -1, [268]), initValues(_3C_classLit, 42, -1, [199]), initValues(_3C_classLit, 42, -1, [199]), initValues(_3C_classLit, 42, -1, [264]), initValues(_3C_classLit, 42, -1, [8752]), initValues(_3C_classLit, 42, -1, [266]), initValues(_3C_classLit, 42, -1, [184]), initValues(_3C_classLit, 42, -1, [183]), initValues(_3C_classLit, 42, -1, [8493]), initValues(_3C_classLit, 42, -1, [935]), initValues(_3C_classLit, 42, -1, [8857]), initValues(_3C_classLit, 42, -1, [8854]), initValues(_3C_classLit, 42, -1, [8853]), initValues(_3C_classLit, 42, -1, [8855]), initValues(_3C_classLit, 42, -1, [8754]), initValues(_3C_classLit, 42, -1, [8221]), initValues(_3C_classLit, 42, -1, [8217]), initValues(_3C_classLit, 42, -1, [8759]), initValues(_3C_classLit, 42, -1, [10868]), initValues(_3C_classLit, 42, -1, [8801]), initValues(_3C_classLit, 42, -1, [8751]), initValues(_3C_classLit, 42, -1, [8750]), initValues(_3C_classLit, 42, -1, [8450]), initValues(_3C_classLit, 42, -1, [8720]), initValues(_3C_classLit, 42, -1, [8755]), initValues(_3C_classLit, 42, -1, [10799]), initValues(_3C_classLit, 42, -1, [55349, 56478]), initValues(_3C_classLit, 42, -1, [8915]), initValues(_3C_classLit, 42, -1, [8781]), initValues(_3C_classLit, 42, -1, [8517]), initValues(_3C_classLit, 42, -1, [10513]), initValues(_3C_classLit, 42, -1, [1026]), initValues(_3C_classLit, 42, -1, [1029]), initValues(_3C_classLit, 42, -1, [1039]), initValues(_3C_classLit, 42, -1, [8225]), initValues(_3C_classLit, 42, -1, [8609]), initValues(_3C_classLit, 42, -1, [10980]), initValues(_3C_classLit, 42, -1, [270]), initValues(_3C_classLit, 42, -1, [1044]), initValues(_3C_classLit, 42, -1, [8711]), initValues(_3C_classLit, 42, -1, [916]), initValues(_3C_classLit, 42, -1, [55349, 56583]), initValues(_3C_classLit, 42, -1, [180]), initValues(_3C_classLit, 42, -1, [729]), initValues(_3C_classLit, 42, -1, [733]), initValues(_3C_classLit, 42, -1, [96]), initValues(_3C_classLit, 42, -1, [732]), initValues(_3C_classLit, 42, -1, [8900]), initValues(_3C_classLit, 42, -1, [8518]), initValues(_3C_classLit, 42, -1, [55349, 56635]), initValues(_3C_classLit, 42, -1, [168]), initValues(_3C_classLit, 42, -1, [8412]), initValues(_3C_classLit, 42, -1, [8784]), initValues(_3C_classLit, 42, -1, [8751]), initValues(_3C_classLit, 42, -1, [168]), initValues(_3C_classLit, 42, -1, [8659]), initValues(_3C_classLit, 42, -1, [8656]), initValues(_3C_classLit, 42, -1, [8660]), initValues(_3C_classLit, 42, -1, [10980]), initValues(_3C_classLit, 42, -1, [10232]), initValues(_3C_classLit, 42, -1, [10234]), initValues(_3C_classLit, 42, -1, [10233]), initValues(_3C_classLit, 42, -1, [8658]), initValues(_3C_classLit, 42, -1, [8872]), initValues(_3C_classLit, 42, -1, [8657]), initValues(_3C_classLit, 42, -1, [8661]), initValues(_3C_classLit, 42, -1, [8741]), initValues(_3C_classLit, 42, -1, [8595]), initValues(_3C_classLit, 42, -1, [10515]), initValues(_3C_classLit, 42, -1, [8693]), initValues(_3C_classLit, 42, -1, [785]), initValues(_3C_classLit, 42, -1, [10576]), initValues(_3C_classLit, 42, -1, [10590]), initValues(_3C_classLit, 42, -1, [8637]), initValues(_3C_classLit, 42, -1, [10582]), initValues(_3C_classLit, 42, -1, [10591]), initValues(_3C_classLit, 42, -1, [8641]), initValues(_3C_classLit, 42, -1, [10583]), initValues(_3C_classLit, 42, -1, [8868]), initValues(_3C_classLit, 42, -1, [8615]), initValues(_3C_classLit, 42, -1, [8659]), initValues(_3C_classLit, 42, -1, [55349, 56479]), initValues(_3C_classLit, 42, -1, [272]), initValues(_3C_classLit, 42, -1, [330]), initValues(_3C_classLit, 42, -1, [208]), initValues(_3C_classLit, 42, -1, [208]), initValues(_3C_classLit, 42, -1, [201]), initValues(_3C_classLit, 42, -1, [201]), initValues(_3C_classLit, 42, -1, [282]), initValues(_3C_classLit, 42, -1, [202]), initValues(_3C_classLit, 42, -1, [202]), initValues(_3C_classLit, 42, -1, [1069]), initValues(_3C_classLit, 42, -1, [278]), initValues(_3C_classLit, 42, -1, [55349, 56584]), initValues(_3C_classLit, 42, -1, [200]), initValues(_3C_classLit, 42, -1, [200]), initValues(_3C_classLit, 42, -1, [8712]), initValues(_3C_classLit, 42, -1, [274]), initValues(_3C_classLit, 42, -1, [9723]), initValues(_3C_classLit, 42, -1, [9643]), initValues(_3C_classLit, 42, -1, [280]), initValues(_3C_classLit, 42, -1, [55349, 56636]), initValues(_3C_classLit, 42, -1, [917]), initValues(_3C_classLit, 42, -1, [10869]), initValues(_3C_classLit, 42, -1, [8770]), initValues(_3C_classLit, 42, -1, [8652]), initValues(_3C_classLit, 42, -1, [8496]), initValues(_3C_classLit, 42, -1, [10867]), initValues(_3C_classLit, 42, -1, [919]), initValues(_3C_classLit, 42, -1, [203]), initValues(_3C_classLit, 42, -1, [203]), initValues(_3C_classLit, 42, -1, [8707]), initValues(_3C_classLit, 42, -1, [8519]), initValues(_3C_classLit, 42, -1, [1060]), initValues(_3C_classLit, 42, -1, [55349, 56585]), initValues(_3C_classLit, 42, -1, [9724]), initValues(_3C_classLit, 42, -1, [9642]), initValues(_3C_classLit, 42, -1, [55349, 56637]), initValues(_3C_classLit, 42, -1, [8704]), initValues(_3C_classLit, 42, -1, [8497]), initValues(_3C_classLit, 42, -1, [8497]), initValues(_3C_classLit, 42, -1, [1027]), initValues(_3C_classLit, 42, -1, [62]), initValues(_3C_classLit, 42, -1, [62]), initValues(_3C_classLit, 42, -1, [915]), initValues(_3C_classLit, 42, -1, [988]), initValues(_3C_classLit, 42, -1, [286]), initValues(_3C_classLit, 42, -1, [290]), initValues(_3C_classLit, 42, -1, [284]), initValues(_3C_classLit, 42, -1, [1043]), initValues(_3C_classLit, 42, -1, [288]), initValues(_3C_classLit, 42, -1, [55349, 56586]), initValues(_3C_classLit, 42, -1, [8921]), initValues(_3C_classLit, 42, -1, [55349, 56638]), initValues(_3C_classLit, 42, -1, [8805]), initValues(_3C_classLit, 42, -1, [8923]), initValues(_3C_classLit, 42, -1, [8807]), initValues(_3C_classLit, 42, -1, [10914]), initValues(_3C_classLit, 42, -1, [8823]), initValues(_3C_classLit, 42, -1, [10878]), initValues(_3C_classLit, 42, -1, [8819]), initValues(_3C_classLit, 42, -1, [55349, 56482]), initValues(_3C_classLit, 42, -1, [8811]), initValues(_3C_classLit, 42, -1, [1066]), initValues(_3C_classLit, 42, -1, [711]), initValues(_3C_classLit, 42, -1, [94]), initValues(_3C_classLit, 42, -1, [292]), initValues(_3C_classLit, 42, -1, [8460]), initValues(_3C_classLit, 42, -1, [8459]), initValues(_3C_classLit, 42, -1, [8461]), initValues(_3C_classLit, 42, -1, [9472]), initValues(_3C_classLit, 42, -1, [8459]), initValues(_3C_classLit, 42, -1, [294]), initValues(_3C_classLit, 42, -1, [8782]), initValues(_3C_classLit, 42, -1, [8783]), initValues(_3C_classLit, 42, -1, [1045]), initValues(_3C_classLit, 42, -1, [306]), initValues(_3C_classLit, 42, -1, [1025]), initValues(_3C_classLit, 42, -1, [205]), initValues(_3C_classLit, 42, -1, [205]), initValues(_3C_classLit, 42, -1, [206]), initValues(_3C_classLit, 42, -1, [206]), initValues(_3C_classLit, 42, -1, [1048]), initValues(_3C_classLit, 42, -1, [304]), initValues(_3C_classLit, 42, -1, [8465]), initValues(_3C_classLit, 42, -1, [204]), initValues(_3C_classLit, 42, -1, [204]), initValues(_3C_classLit, 42, -1, [8465]), initValues(_3C_classLit, 42, -1, [298]), initValues(_3C_classLit, 42, -1, [8520]), initValues(_3C_classLit, 42, -1, [8658]), initValues(_3C_classLit, 42, -1, [8748]), initValues(_3C_classLit, 42, -1, [8747]), initValues(_3C_classLit, 42, -1, [8898]), initValues(_3C_classLit, 42, -1, [8291]), initValues(_3C_classLit, 42, -1, [8290]), initValues(_3C_classLit, 42, -1, [302]), initValues(_3C_classLit, 42, -1, [55349, 56640]), initValues(_3C_classLit, 42, -1, [921]), initValues(_3C_classLit, 42, -1, [8464]), initValues(_3C_classLit, 42, -1, [296]), initValues(_3C_classLit, 42, -1, [1030]), initValues(_3C_classLit, 42, -1, [207]), initValues(_3C_classLit, 42, -1, [207]), initValues(_3C_classLit, 42, -1, [308]), initValues(_3C_classLit, 42, -1, [1049]), initValues(_3C_classLit, 42, -1, [55349, 56589]), initValues(_3C_classLit, 42, -1, [55349, 56641]), initValues(_3C_classLit, 42, -1, [55349, 56485]), initValues(_3C_classLit, 42, -1, [1032]), initValues(_3C_classLit, 42, -1, [1028]), initValues(_3C_classLit, 42, -1, [1061]), initValues(_3C_classLit, 42, -1, [1036]), initValues(_3C_classLit, 42, -1, [922]), initValues(_3C_classLit, 42, -1, [310]), initValues(_3C_classLit, 42, -1, [1050]), initValues(_3C_classLit, 42, -1, [55349, 56590]), initValues(_3C_classLit, 42, -1, [55349, 56642]), initValues(_3C_classLit, 42, -1, [55349, 56486]), initValues(_3C_classLit, 42, -1, [1033]), initValues(_3C_classLit, 42, -1, [60]), initValues(_3C_classLit, 42, -1, [60]), initValues(_3C_classLit, 42, -1, [313]), initValues(_3C_classLit, 42, -1, [923]), initValues(_3C_classLit, 42, -1, [10218]), initValues(_3C_classLit, 42, -1, [8466]), initValues(_3C_classLit, 42, -1, [8606]), initValues(_3C_classLit, 42, -1, [317]), initValues(_3C_classLit, 42, -1, [315]), initValues(_3C_classLit, 42, -1, [1051]), initValues(_3C_classLit, 42, -1, [10216]), initValues(_3C_classLit, 42, -1, [8592]), initValues(_3C_classLit, 42, -1, [8676]), initValues(_3C_classLit, 42, -1, [8646]), initValues(_3C_classLit, 42, -1, [8968]), initValues(_3C_classLit, 42, -1, [10214]), initValues(_3C_classLit, 42, -1, [10593]), initValues(_3C_classLit, 42, -1, [8643]), initValues(_3C_classLit, 42, -1, [10585]), initValues(_3C_classLit, 42, -1, [8970]), initValues(_3C_classLit, 42, -1, [8596]), initValues(_3C_classLit, 42, -1, [10574]), initValues(_3C_classLit, 42, -1, [8867]), initValues(_3C_classLit, 42, -1, [8612]), initValues(_3C_classLit, 42, -1, [10586]), initValues(_3C_classLit, 42, -1, [8882]), initValues(_3C_classLit, 42, -1, [10703]), initValues(_3C_classLit, 42, -1, [8884]), initValues(_3C_classLit, 42, -1, [10577]), initValues(_3C_classLit, 42, -1, [10592]), initValues(_3C_classLit, 42, -1, [8639]), initValues(_3C_classLit, 42, -1, [10584]), initValues(_3C_classLit, 42, -1, [8636]), initValues(_3C_classLit, 42, -1, [10578]), initValues(_3C_classLit, 42, -1, [8656]), initValues(_3C_classLit, 42, -1, [8660]), initValues(_3C_classLit, 42, -1, [8922]), initValues(_3C_classLit, 42, -1, [8806]), initValues(_3C_classLit, 42, -1, [8822]), initValues(_3C_classLit, 42, -1, [10913]), initValues(_3C_classLit, 42, -1, [10877]), initValues(_3C_classLit, 42, -1, [8818]), initValues(_3C_classLit, 42, -1, [55349, 56591]), initValues(_3C_classLit, 42, -1, [8920]), initValues(_3C_classLit, 42, -1, [8666]), initValues(_3C_classLit, 42, -1, [319]), initValues(_3C_classLit, 42, -1, [10229]), initValues(_3C_classLit, 42, -1, [10231]), initValues(_3C_classLit, 42, -1, [10230]), initValues(_3C_classLit, 42, -1, [10232]), initValues(_3C_classLit, 42, -1, [10234]), initValues(_3C_classLit, 42, -1, [10233]), initValues(_3C_classLit, 42, -1, [55349, 56643]), initValues(_3C_classLit, 42, -1, [8601]), initValues(_3C_classLit, 42, -1, [8600]), initValues(_3C_classLit, 42, -1, [8466]), initValues(_3C_classLit, 42, -1, [8624]), initValues(_3C_classLit, 42, -1, [321]), initValues(_3C_classLit, 42, -1, [8810]), initValues(_3C_classLit, 42, -1, [10501]), initValues(_3C_classLit, 42, -1, [1052]), initValues(_3C_classLit, 42, -1, [8287]), initValues(_3C_classLit, 42, -1, [8499]), initValues(_3C_classLit, 42, -1, [55349, 56592]), initValues(_3C_classLit, 42, -1, [8723]), initValues(_3C_classLit, 42, -1, [55349, 56644]), initValues(_3C_classLit, 42, -1, [8499]), initValues(_3C_classLit, 42, -1, [924]), initValues(_3C_classLit, 42, -1, [1034]), initValues(_3C_classLit, 42, -1, [323]), initValues(_3C_classLit, 42, -1, [327]), initValues(_3C_classLit, 42, -1, [325]), initValues(_3C_classLit, 42, -1, [1053]), initValues(_3C_classLit, 42, -1, [8203]), initValues(_3C_classLit, 42, -1, [8203]), initValues(_3C_classLit, 42, -1, [8203]), initValues(_3C_classLit, 42, -1, [8203]), initValues(_3C_classLit, 42, -1, [8811]), initValues(_3C_classLit, 42, -1, [8810]), initValues(_3C_classLit, 42, -1, [10]), initValues(_3C_classLit, 42, -1, [55349, 56593]), initValues(_3C_classLit, 42, -1, [8288]), initValues(_3C_classLit, 42, -1, [160]), initValues(_3C_classLit, 42, -1, [8469]), initValues(_3C_classLit, 42, -1, [10988]), initValues(_3C_classLit, 42, -1, [8802]), initValues(_3C_classLit, 42, -1, [8813]), initValues(_3C_classLit, 42, -1, [8742]), initValues(_3C_classLit, 42, -1, [8713]), initValues(_3C_classLit, 42, -1, [8800]), initValues(_3C_classLit, 42, -1, [8708]), initValues(_3C_classLit, 42, -1, [8815]), initValues(_3C_classLit, 42, -1, [8817]), initValues(_3C_classLit, 42, -1, [8825]), initValues(_3C_classLit, 42, -1, [8821]), initValues(_3C_classLit, 42, -1, [8938]), initValues(_3C_classLit, 42, -1, [8940]), initValues(_3C_classLit, 42, -1, [8814]), initValues(_3C_classLit, 42, -1, [8816]), initValues(_3C_classLit, 42, -1, [8824]), initValues(_3C_classLit, 42, -1, [8820]), initValues(_3C_classLit, 42, -1, [8832]), initValues(_3C_classLit, 42, -1, [8928]), initValues(_3C_classLit, 42, -1, [8716]), initValues(_3C_classLit, 42, -1, [8939]), initValues(_3C_classLit, 42, -1, [8941]), initValues(_3C_classLit, 42, -1, [8930]), initValues(_3C_classLit, 42, -1, [8931]), initValues(_3C_classLit, 42, -1, [8840]), initValues(_3C_classLit, 42, -1, [8833]), initValues(_3C_classLit, 42, -1, [8929]), initValues(_3C_classLit, 42, -1, [8841]), initValues(_3C_classLit, 42, -1, [8769]), initValues(_3C_classLit, 42, -1, [8772]), initValues(_3C_classLit, 42, -1, [8775]), initValues(_3C_classLit, 42, -1, [8777]), initValues(_3C_classLit, 42, -1, [8740]), initValues(_3C_classLit, 42, -1, [55349, 56489]), initValues(_3C_classLit, 42, -1, [209]), initValues(_3C_classLit, 42, -1, [209]), initValues(_3C_classLit, 42, -1, [925]), initValues(_3C_classLit, 42, -1, [338]), initValues(_3C_classLit, 42, -1, [211]), initValues(_3C_classLit, 42, -1, [211]), initValues(_3C_classLit, 42, -1, [212]), initValues(_3C_classLit, 42, -1, [212]), initValues(_3C_classLit, 42, -1, [1054]), initValues(_3C_classLit, 42, -1, [336]), initValues(_3C_classLit, 42, -1, [55349, 56594]), initValues(_3C_classLit, 42, -1, [210]), initValues(_3C_classLit, 42, -1, [210]), initValues(_3C_classLit, 42, -1, [332]), initValues(_3C_classLit, 42, -1, [937]), initValues(_3C_classLit, 42, -1, [927]), initValues(_3C_classLit, 42, -1, [55349, 56646]), initValues(_3C_classLit, 42, -1, [8220]), initValues(_3C_classLit, 42, -1, [8216]), initValues(_3C_classLit, 42, -1, [10836]), initValues(_3C_classLit, 42, -1, [55349, 56490]), initValues(_3C_classLit, 42, -1, [216]), initValues(_3C_classLit, 42, -1, [216]), initValues(_3C_classLit, 42, -1, [213]), initValues(_3C_classLit, 42, -1, [213]), initValues(_3C_classLit, 42, -1, [10807]), initValues(_3C_classLit, 42, -1, [214]), initValues(_3C_classLit, 42, -1, [214]), initValues(_3C_classLit, 42, -1, [175]), initValues(_3C_classLit, 42, -1, [9182]), initValues(_3C_classLit, 42, -1, [9140]), initValues(_3C_classLit, 42, -1, [9180]), initValues(_3C_classLit, 42, -1, [8706]), initValues(_3C_classLit, 42, -1, [1055]), initValues(_3C_classLit, 42, -1, [55349, 56595]), initValues(_3C_classLit, 42, -1, [934]), initValues(_3C_classLit, 42, -1, [928]), initValues(_3C_classLit, 42, -1, [177]), initValues(_3C_classLit, 42, -1, [8460]), initValues(_3C_classLit, 42, -1, [8473]), initValues(_3C_classLit, 42, -1, [10939]), initValues(_3C_classLit, 42, -1, [8826]), initValues(_3C_classLit, 42, -1, [10927]), initValues(_3C_classLit, 42, -1, [8828]), initValues(_3C_classLit, 42, -1, [8830]), initValues(_3C_classLit, 42, -1, [8243]), initValues(_3C_classLit, 42, -1, [8719]), initValues(_3C_classLit, 42, -1, [8759]), initValues(_3C_classLit, 42, -1, [8733]), initValues(_3C_classLit, 42, -1, [55349, 56491]), initValues(_3C_classLit, 42, -1, [936]), initValues(_3C_classLit, 42, -1, [34]), initValues(_3C_classLit, 42, -1, [34]), initValues(_3C_classLit, 42, -1, [55349, 56596]), initValues(_3C_classLit, 42, -1, [8474]), initValues(_3C_classLit, 42, -1, [55349, 56492]), initValues(_3C_classLit, 42, -1, [10512]), initValues(_3C_classLit, 42, -1, [174]), initValues(_3C_classLit, 42, -1, [174]), initValues(_3C_classLit, 42, -1, [340]), initValues(_3C_classLit, 42, -1, [10219]), initValues(_3C_classLit, 42, -1, [8608]), initValues(_3C_classLit, 42, -1, [10518]), initValues(_3C_classLit, 42, -1, [344]), initValues(_3C_classLit, 42, -1, [342]), initValues(_3C_classLit, 42, -1, [1056]), initValues(_3C_classLit, 42, -1, [8476]), initValues(_3C_classLit, 42, -1, [8715]), initValues(_3C_classLit, 42, -1, [8651]), initValues(_3C_classLit, 42, -1, [10607]), initValues(_3C_classLit, 42, -1, [8476]), initValues(_3C_classLit, 42, -1, [929]), initValues(_3C_classLit, 42, -1, [10217]), initValues(_3C_classLit, 42, -1, [8594]), initValues(_3C_classLit, 42, -1, [8677]), initValues(_3C_classLit, 42, -1, [8644]), initValues(_3C_classLit, 42, -1, [8969]), initValues(_3C_classLit, 42, -1, [10215]), initValues(_3C_classLit, 42, -1, [10589]), initValues(_3C_classLit, 42, -1, [8642]), initValues(_3C_classLit, 42, -1, [10581]), initValues(_3C_classLit, 42, -1, [8971]), initValues(_3C_classLit, 42, -1, [8866]), initValues(_3C_classLit, 42, -1, [8614]), initValues(_3C_classLit, 42, -1, [10587]), initValues(_3C_classLit, 42, -1, [8883]), initValues(_3C_classLit, 42, -1, [10704]), initValues(_3C_classLit, 42, -1, [8885]), initValues(_3C_classLit, 42, -1, [10575]), initValues(_3C_classLit, 42, -1, [10588]), initValues(_3C_classLit, 42, -1, [8638]), initValues(_3C_classLit, 42, -1, [10580]), initValues(_3C_classLit, 42, -1, [8640]), initValues(_3C_classLit, 42, -1, [10579]), initValues(_3C_classLit, 42, -1, [8658]), initValues(_3C_classLit, 42, -1, [8477]), initValues(_3C_classLit, 42, -1, [10608]), initValues(_3C_classLit, 42, -1, [8667]), initValues(_3C_classLit, 42, -1, [8475]), initValues(_3C_classLit, 42, -1, [8625]), initValues(_3C_classLit, 42, -1, [10740]), initValues(_3C_classLit, 42, -1, [1065]), initValues(_3C_classLit, 42, -1, [1064]), initValues(_3C_classLit, 42, -1, [1068]), initValues(_3C_classLit, 42, -1, [346]), initValues(_3C_classLit, 42, -1, [10940]), initValues(_3C_classLit, 42, -1, [352]), initValues(_3C_classLit, 42, -1, [350]), initValues(_3C_classLit, 42, -1, [348]), initValues(_3C_classLit, 42, -1, [1057]), initValues(_3C_classLit, 42, -1, [55349, 56598]), initValues(_3C_classLit, 42, -1, [8595]), initValues(_3C_classLit, 42, -1, [8592]), initValues(_3C_classLit, 42, -1, [8594]), initValues(_3C_classLit, 42, -1, [8593]), initValues(_3C_classLit, 42, -1, [931]), initValues(_3C_classLit, 42, -1, [8728]), initValues(_3C_classLit, 42, -1, [55349, 56650]), initValues(_3C_classLit, 42, -1, [8730]), initValues(_3C_classLit, 42, -1, [9633]), initValues(_3C_classLit, 42, -1, [8851]), initValues(_3C_classLit, 42, -1, [8847]), initValues(_3C_classLit, 42, -1, [8849]), initValues(_3C_classLit, 42, -1, [8848]), initValues(_3C_classLit, 42, -1, [8850]), initValues(_3C_classLit, 42, -1, [8852]), initValues(_3C_classLit, 42, -1, [55349, 56494]), initValues(_3C_classLit, 42, -1, [8902]), initValues(_3C_classLit, 42, -1, [8912]), initValues(_3C_classLit, 42, -1, [8912]), initValues(_3C_classLit, 42, -1, [8838]), initValues(_3C_classLit, 42, -1, [8827]), initValues(_3C_classLit, 42, -1, [10928]), initValues(_3C_classLit, 42, -1, [8829]), initValues(_3C_classLit, 42, -1, [8831]), initValues(_3C_classLit, 42, -1, [8715]), initValues(_3C_classLit, 42, -1, [8721]), initValues(_3C_classLit, 42, -1, [8913]), initValues(_3C_classLit, 42, -1, [8835]), initValues(_3C_classLit, 42, -1, [8839]), initValues(_3C_classLit, 42, -1, [8913]), initValues(_3C_classLit, 42, -1, [222]), initValues(_3C_classLit, 42, -1, [222]), initValues(_3C_classLit, 42, -1, [8482]), initValues(_3C_classLit, 42, -1, [1035]), initValues(_3C_classLit, 42, -1, [1062]), initValues(_3C_classLit, 42, -1, [9]), initValues(_3C_classLit, 42, -1, [932]), initValues(_3C_classLit, 42, -1, [356]), initValues(_3C_classLit, 42, -1, [354]), initValues(_3C_classLit, 42, -1, [1058]), initValues(_3C_classLit, 42, -1, [55349, 56599]), initValues(_3C_classLit, 42, -1, [8756]), initValues(_3C_classLit, 42, -1, [920]), initValues(_3C_classLit, 42, -1, [8201]), initValues(_3C_classLit, 42, -1, [8764]), initValues(_3C_classLit, 42, -1, [8771]), initValues(_3C_classLit, 42, -1, [8773]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [55349, 56651]), initValues(_3C_classLit, 42, -1, [8411]), initValues(_3C_classLit, 42, -1, [55349, 56495]), initValues(_3C_classLit, 42, -1, [358]), initValues(_3C_classLit, 42, -1, [218]), initValues(_3C_classLit, 42, -1, [218]), initValues(_3C_classLit, 42, -1, [8607]), initValues(_3C_classLit, 42, -1, [10569]), initValues(_3C_classLit, 42, -1, [1038]), initValues(_3C_classLit, 42, -1, [364]), initValues(_3C_classLit, 42, -1, [219]), initValues(_3C_classLit, 42, -1, [219]), initValues(_3C_classLit, 42, -1, [1059]), initValues(_3C_classLit, 42, -1, [368]), initValues(_3C_classLit, 42, -1, [55349, 56600]), initValues(_3C_classLit, 42, -1, [217]), initValues(_3C_classLit, 42, -1, [217]), initValues(_3C_classLit, 42, -1, [362]), initValues(_3C_classLit, 42, -1, [818]), initValues(_3C_classLit, 42, -1, [9183]), initValues(_3C_classLit, 42, -1, [9141]), initValues(_3C_classLit, 42, -1, [9181]), initValues(_3C_classLit, 42, -1, [8899]), initValues(_3C_classLit, 42, -1, [8846]), initValues(_3C_classLit, 42, -1, [370]), initValues(_3C_classLit, 42, -1, [55349, 56652]), initValues(_3C_classLit, 42, -1, [8593]), initValues(_3C_classLit, 42, -1, [10514]), initValues(_3C_classLit, 42, -1, [8645]), initValues(_3C_classLit, 42, -1, [8597]), initValues(_3C_classLit, 42, -1, [10606]), initValues(_3C_classLit, 42, -1, [8869]), initValues(_3C_classLit, 42, -1, [8613]), initValues(_3C_classLit, 42, -1, [8657]), initValues(_3C_classLit, 42, -1, [8661]), initValues(_3C_classLit, 42, -1, [8598]), initValues(_3C_classLit, 42, -1, [8599]), initValues(_3C_classLit, 42, -1, [978]), initValues(_3C_classLit, 42, -1, [933]), initValues(_3C_classLit, 42, -1, [366]), initValues(_3C_classLit, 42, -1, [55349, 56496]), initValues(_3C_classLit, 42, -1, [360]), initValues(_3C_classLit, 42, -1, [220]), initValues(_3C_classLit, 42, -1, [220]), initValues(_3C_classLit, 42, -1, [8875]), initValues(_3C_classLit, 42, -1, [10987]), initValues(_3C_classLit, 42, -1, [1042]), initValues(_3C_classLit, 42, -1, [8873]), initValues(_3C_classLit, 42, -1, [10982]), initValues(_3C_classLit, 42, -1, [8897]), initValues(_3C_classLit, 42, -1, [8214]), initValues(_3C_classLit, 42, -1, [8214]), initValues(_3C_classLit, 42, -1, [8739]), initValues(_3C_classLit, 42, -1, [124]), initValues(_3C_classLit, 42, -1, [10072]), initValues(_3C_classLit, 42, -1, [8768]), initValues(_3C_classLit, 42, -1, [8202]), initValues(_3C_classLit, 42, -1, [55349, 56601]), initValues(_3C_classLit, 42, -1, [55349, 56653]), initValues(_3C_classLit, 42, -1, [55349, 56497]), initValues(_3C_classLit, 42, -1, [8874]), initValues(_3C_classLit, 42, -1, [372]), initValues(_3C_classLit, 42, -1, [8896]), initValues(_3C_classLit, 42, -1, [55349, 56602]), initValues(_3C_classLit, 42, -1, [55349, 56654]), initValues(_3C_classLit, 42, -1, [55349, 56498]), initValues(_3C_classLit, 42, -1, [55349, 56603]), initValues(_3C_classLit, 42, -1, [926]), initValues(_3C_classLit, 42, -1, [55349, 56655]), initValues(_3C_classLit, 42, -1, [55349, 56499]), initValues(_3C_classLit, 42, -1, [1071]), initValues(_3C_classLit, 42, -1, [1031]), initValues(_3C_classLit, 42, -1, [1070]), initValues(_3C_classLit, 42, -1, [221]), initValues(_3C_classLit, 42, -1, [221]), initValues(_3C_classLit, 42, -1, [374]), initValues(_3C_classLit, 42, -1, [1067]), initValues(_3C_classLit, 42, -1, [55349, 56604]), initValues(_3C_classLit, 42, -1, [55349, 56656]), initValues(_3C_classLit, 42, -1, [55349, 56500]), initValues(_3C_classLit, 42, -1, [376]), initValues(_3C_classLit, 42, -1, [1046]), initValues(_3C_classLit, 42, -1, [377]), initValues(_3C_classLit, 42, -1, [381]), initValues(_3C_classLit, 42, -1, [1047]), initValues(_3C_classLit, 42, -1, [379]), initValues(_3C_classLit, 42, -1, [8203]), initValues(_3C_classLit, 42, -1, [918]), initValues(_3C_classLit, 42, -1, [8488]), initValues(_3C_classLit, 42, -1, [8484]), initValues(_3C_classLit, 42, -1, [55349, 56501]), initValues(_3C_classLit, 42, -1, [225]), initValues(_3C_classLit, 42, -1, [225]), initValues(_3C_classLit, 42, -1, [259]), initValues(_3C_classLit, 42, -1, [8766]), initValues(_3C_classLit, 42, -1, [8767]), initValues(_3C_classLit, 42, -1, [226]), initValues(_3C_classLit, 42, -1, [226]), initValues(_3C_classLit, 42, -1, [180]), initValues(_3C_classLit, 42, -1, [180]), initValues(_3C_classLit, 42, -1, [1072]), initValues(_3C_classLit, 42, -1, [230]), initValues(_3C_classLit, 42, -1, [230]), initValues(_3C_classLit, 42, -1, [8289]), initValues(_3C_classLit, 42, -1, [55349, 56606]), initValues(_3C_classLit, 42, -1, [224]), initValues(_3C_classLit, 42, -1, [224]), initValues(_3C_classLit, 42, -1, [8501]), initValues(_3C_classLit, 42, -1, [8501]), initValues(_3C_classLit, 42, -1, [945]), initValues(_3C_classLit, 42, -1, [257]), initValues(_3C_classLit, 42, -1, [10815]), initValues(_3C_classLit, 42, -1, [38]), initValues(_3C_classLit, 42, -1, [38]), initValues(_3C_classLit, 42, -1, [8743]), initValues(_3C_classLit, 42, -1, [10837]), initValues(_3C_classLit, 42, -1, [10844]), initValues(_3C_classLit, 42, -1, [10840]), initValues(_3C_classLit, 42, -1, [10842]), initValues(_3C_classLit, 42, -1, [8736]), initValues(_3C_classLit, 42, -1, [10660]), initValues(_3C_classLit, 42, -1, [8736]), initValues(_3C_classLit, 42, -1, [8737]), initValues(_3C_classLit, 42, -1, [10664]), initValues(_3C_classLit, 42, -1, [10665]), initValues(_3C_classLit, 42, -1, [10666]), initValues(_3C_classLit, 42, -1, [10667]), initValues(_3C_classLit, 42, -1, [10668]), initValues(_3C_classLit, 42, -1, [10669]), initValues(_3C_classLit, 42, -1, [10670]), initValues(_3C_classLit, 42, -1, [10671]), initValues(_3C_classLit, 42, -1, [8735]), initValues(_3C_classLit, 42, -1, [8894]), initValues(_3C_classLit, 42, -1, [10653]), initValues(_3C_classLit, 42, -1, [8738]), initValues(_3C_classLit, 42, -1, [8491]), initValues(_3C_classLit, 42, -1, [9084]), initValues(_3C_classLit, 42, -1, [261]), initValues(_3C_classLit, 42, -1, [55349, 56658]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [10864]), initValues(_3C_classLit, 42, -1, [10863]), initValues(_3C_classLit, 42, -1, [8778]), initValues(_3C_classLit, 42, -1, [8779]), initValues(_3C_classLit, 42, -1, [39]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [8778]), initValues(_3C_classLit, 42, -1, [229]), initValues(_3C_classLit, 42, -1, [229]), initValues(_3C_classLit, 42, -1, [55349, 56502]), initValues(_3C_classLit, 42, -1, [42]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [8781]), initValues(_3C_classLit, 42, -1, [227]), initValues(_3C_classLit, 42, -1, [227]), initValues(_3C_classLit, 42, -1, [228]), initValues(_3C_classLit, 42, -1, [228]), initValues(_3C_classLit, 42, -1, [8755]), initValues(_3C_classLit, 42, -1, [10769]), initValues(_3C_classLit, 42, -1, [10989]), initValues(_3C_classLit, 42, -1, [8780]), initValues(_3C_classLit, 42, -1, [1014]), initValues(_3C_classLit, 42, -1, [8245]), initValues(_3C_classLit, 42, -1, [8765]), initValues(_3C_classLit, 42, -1, [8909]), initValues(_3C_classLit, 42, -1, [8893]), initValues(_3C_classLit, 42, -1, [8965]), initValues(_3C_classLit, 42, -1, [8965]), initValues(_3C_classLit, 42, -1, [9141]), initValues(_3C_classLit, 42, -1, [9142]), initValues(_3C_classLit, 42, -1, [8780]), initValues(_3C_classLit, 42, -1, [1073]), initValues(_3C_classLit, 42, -1, [8222]), initValues(_3C_classLit, 42, -1, [8757]), initValues(_3C_classLit, 42, -1, [8757]), initValues(_3C_classLit, 42, -1, [10672]), initValues(_3C_classLit, 42, -1, [1014]), initValues(_3C_classLit, 42, -1, [8492]), initValues(_3C_classLit, 42, -1, [946]), initValues(_3C_classLit, 42, -1, [8502]), initValues(_3C_classLit, 42, -1, [8812]), initValues(_3C_classLit, 42, -1, [55349, 56607]), initValues(_3C_classLit, 42, -1, [8898]), initValues(_3C_classLit, 42, -1, [9711]), initValues(_3C_classLit, 42, -1, [8899]), initValues(_3C_classLit, 42, -1, [10752]), initValues(_3C_classLit, 42, -1, [10753]), initValues(_3C_classLit, 42, -1, [10754]), initValues(_3C_classLit, 42, -1, [10758]), initValues(_3C_classLit, 42, -1, [9733]), initValues(_3C_classLit, 42, -1, [9661]), initValues(_3C_classLit, 42, -1, [9651]), initValues(_3C_classLit, 42, -1, [10756]), initValues(_3C_classLit, 42, -1, [8897]), initValues(_3C_classLit, 42, -1, [8896]), initValues(_3C_classLit, 42, -1, [10509]), initValues(_3C_classLit, 42, -1, [10731]), initValues(_3C_classLit, 42, -1, [9642]), initValues(_3C_classLit, 42, -1, [9652]), initValues(_3C_classLit, 42, -1, [9662]), initValues(_3C_classLit, 42, -1, [9666]), initValues(_3C_classLit, 42, -1, [9656]), initValues(_3C_classLit, 42, -1, [9251]), initValues(_3C_classLit, 42, -1, [9618]), initValues(_3C_classLit, 42, -1, [9617]), initValues(_3C_classLit, 42, -1, [9619]), initValues(_3C_classLit, 42, -1, [9608]), initValues(_3C_classLit, 42, -1, [8976]), initValues(_3C_classLit, 42, -1, [55349, 56659]), initValues(_3C_classLit, 42, -1, [8869]), initValues(_3C_classLit, 42, -1, [8869]), initValues(_3C_classLit, 42, -1, [8904]), initValues(_3C_classLit, 42, -1, [9559]), initValues(_3C_classLit, 42, -1, [9556]), initValues(_3C_classLit, 42, -1, [9558]), initValues(_3C_classLit, 42, -1, [9555]), initValues(_3C_classLit, 42, -1, [9552]), initValues(_3C_classLit, 42, -1, [9574]), initValues(_3C_classLit, 42, -1, [9577]), initValues(_3C_classLit, 42, -1, [9572]), initValues(_3C_classLit, 42, -1, [9575]), initValues(_3C_classLit, 42, -1, [9565]), initValues(_3C_classLit, 42, -1, [9562]), initValues(_3C_classLit, 42, -1, [9564]), initValues(_3C_classLit, 42, -1, [9561]), initValues(_3C_classLit, 42, -1, [9553]), initValues(_3C_classLit, 42, -1, [9580]), initValues(_3C_classLit, 42, -1, [9571]), initValues(_3C_classLit, 42, -1, [9568]), initValues(_3C_classLit, 42, -1, [9579]), initValues(_3C_classLit, 42, -1, [9570]), initValues(_3C_classLit, 42, -1, [9567]), initValues(_3C_classLit, 42, -1, [10697]), initValues(_3C_classLit, 42, -1, [9557]), initValues(_3C_classLit, 42, -1, [9554]), initValues(_3C_classLit, 42, -1, [9488]), initValues(_3C_classLit, 42, -1, [9484]), initValues(_3C_classLit, 42, -1, [9472]), initValues(_3C_classLit, 42, -1, [9573]), initValues(_3C_classLit, 42, -1, [9576]), initValues(_3C_classLit, 42, -1, [9516]), initValues(_3C_classLit, 42, -1, [9524]), initValues(_3C_classLit, 42, -1, [8863]), initValues(_3C_classLit, 42, -1, [8862]), initValues(_3C_classLit, 42, -1, [8864]), initValues(_3C_classLit, 42, -1, [9563]), initValues(_3C_classLit, 42, -1, [9560]), initValues(_3C_classLit, 42, -1, [9496]), initValues(_3C_classLit, 42, -1, [9492]), initValues(_3C_classLit, 42, -1, [9474]), initValues(_3C_classLit, 42, -1, [9578]), initValues(_3C_classLit, 42, -1, [9569]), initValues(_3C_classLit, 42, -1, [9566]), initValues(_3C_classLit, 42, -1, [9532]), initValues(_3C_classLit, 42, -1, [9508]), initValues(_3C_classLit, 42, -1, [9500]), initValues(_3C_classLit, 42, -1, [8245]), initValues(_3C_classLit, 42, -1, [728]), initValues(_3C_classLit, 42, -1, [166]), initValues(_3C_classLit, 42, -1, [166]), initValues(_3C_classLit, 42, -1, [55349, 56503]), initValues(_3C_classLit, 42, -1, [8271]), initValues(_3C_classLit, 42, -1, [8765]), initValues(_3C_classLit, 42, -1, [8909]), initValues(_3C_classLit, 42, -1, [92]), initValues(_3C_classLit, 42, -1, [10693]), initValues(_3C_classLit, 42, -1, [8226]), initValues(_3C_classLit, 42, -1, [8226]), initValues(_3C_classLit, 42, -1, [8782]), initValues(_3C_classLit, 42, -1, [10926]), initValues(_3C_classLit, 42, -1, [8783]), initValues(_3C_classLit, 42, -1, [8783]), initValues(_3C_classLit, 42, -1, [263]), initValues(_3C_classLit, 42, -1, [8745]), initValues(_3C_classLit, 42, -1, [10820]), initValues(_3C_classLit, 42, -1, [10825]), initValues(_3C_classLit, 42, -1, [10827]), initValues(_3C_classLit, 42, -1, [10823]), initValues(_3C_classLit, 42, -1, [10816]), initValues(_3C_classLit, 42, -1, [8257]), initValues(_3C_classLit, 42, -1, [711]), initValues(_3C_classLit, 42, -1, [10829]), initValues(_3C_classLit, 42, -1, [269]), initValues(_3C_classLit, 42, -1, [231]), initValues(_3C_classLit, 42, -1, [231]), initValues(_3C_classLit, 42, -1, [265]), initValues(_3C_classLit, 42, -1, [10828]), initValues(_3C_classLit, 42, -1, [10832]), initValues(_3C_classLit, 42, -1, [267]), initValues(_3C_classLit, 42, -1, [184]), initValues(_3C_classLit, 42, -1, [184]), initValues(_3C_classLit, 42, -1, [10674]), initValues(_3C_classLit, 42, -1, [162]), initValues(_3C_classLit, 42, -1, [162]), initValues(_3C_classLit, 42, -1, [183]), initValues(_3C_classLit, 42, -1, [55349, 56608]), initValues(_3C_classLit, 42, -1, [1095]), initValues(_3C_classLit, 42, -1, [10003]), initValues(_3C_classLit, 42, -1, [10003]), initValues(_3C_classLit, 42, -1, [967]), initValues(_3C_classLit, 42, -1, [9675]), initValues(_3C_classLit, 42, -1, [10691]), initValues(_3C_classLit, 42, -1, [710]), initValues(_3C_classLit, 42, -1, [8791]), initValues(_3C_classLit, 42, -1, [8634]), initValues(_3C_classLit, 42, -1, [8635]), initValues(_3C_classLit, 42, -1, [174]), initValues(_3C_classLit, 42, -1, [9416]), initValues(_3C_classLit, 42, -1, [8859]), initValues(_3C_classLit, 42, -1, [8858]), initValues(_3C_classLit, 42, -1, [8861]), initValues(_3C_classLit, 42, -1, [8791]), initValues(_3C_classLit, 42, -1, [10768]), initValues(_3C_classLit, 42, -1, [10991]), initValues(_3C_classLit, 42, -1, [10690]), initValues(_3C_classLit, 42, -1, [9827]), initValues(_3C_classLit, 42, -1, [9827]), initValues(_3C_classLit, 42, -1, [58]), initValues(_3C_classLit, 42, -1, [8788]), initValues(_3C_classLit, 42, -1, [8788]), initValues(_3C_classLit, 42, -1, [44]), initValues(_3C_classLit, 42, -1, [64]), initValues(_3C_classLit, 42, -1, [8705]), initValues(_3C_classLit, 42, -1, [8728]), initValues(_3C_classLit, 42, -1, [8705]), initValues(_3C_classLit, 42, -1, [8450]), initValues(_3C_classLit, 42, -1, [8773]), initValues(_3C_classLit, 42, -1, [10861]), initValues(_3C_classLit, 42, -1, [8750]), initValues(_3C_classLit, 42, -1, [55349, 56660]), initValues(_3C_classLit, 42, -1, [8720]), initValues(_3C_classLit, 42, -1, [169]), initValues(_3C_classLit, 42, -1, [169]), initValues(_3C_classLit, 42, -1, [8471]), initValues(_3C_classLit, 42, -1, [8629]), initValues(_3C_classLit, 42, -1, [10007]), initValues(_3C_classLit, 42, -1, [55349, 56504]), initValues(_3C_classLit, 42, -1, [10959]), initValues(_3C_classLit, 42, -1, [10961]), initValues(_3C_classLit, 42, -1, [10960]), initValues(_3C_classLit, 42, -1, [10962]), initValues(_3C_classLit, 42, -1, [8943]), initValues(_3C_classLit, 42, -1, [10552]), initValues(_3C_classLit, 42, -1, [10549]), initValues(_3C_classLit, 42, -1, [8926]), initValues(_3C_classLit, 42, -1, [8927]), initValues(_3C_classLit, 42, -1, [8630]), initValues(_3C_classLit, 42, -1, [10557]), initValues(_3C_classLit, 42, -1, [8746]), initValues(_3C_classLit, 42, -1, [10824]), initValues(_3C_classLit, 42, -1, [10822]), initValues(_3C_classLit, 42, -1, [10826]), initValues(_3C_classLit, 42, -1, [8845]), initValues(_3C_classLit, 42, -1, [10821]), initValues(_3C_classLit, 42, -1, [8631]), initValues(_3C_classLit, 42, -1, [10556]), initValues(_3C_classLit, 42, -1, [8926]), initValues(_3C_classLit, 42, -1, [8927]), initValues(_3C_classLit, 42, -1, [8910]), initValues(_3C_classLit, 42, -1, [8911]), initValues(_3C_classLit, 42, -1, [164]), initValues(_3C_classLit, 42, -1, [164]), initValues(_3C_classLit, 42, -1, [8630]), initValues(_3C_classLit, 42, -1, [8631]), initValues(_3C_classLit, 42, -1, [8910]), initValues(_3C_classLit, 42, -1, [8911]), initValues(_3C_classLit, 42, -1, [8754]), initValues(_3C_classLit, 42, -1, [8753]), initValues(_3C_classLit, 42, -1, [9005]), initValues(_3C_classLit, 42, -1, [8659]), initValues(_3C_classLit, 42, -1, [10597]), initValues(_3C_classLit, 42, -1, [8224]), initValues(_3C_classLit, 42, -1, [8504]), initValues(_3C_classLit, 42, -1, [8595]), initValues(_3C_classLit, 42, -1, [8208]), initValues(_3C_classLit, 42, -1, [8867]), initValues(_3C_classLit, 42, -1, [10511]), initValues(_3C_classLit, 42, -1, [733]), initValues(_3C_classLit, 42, -1, [271]), initValues(_3C_classLit, 42, -1, [1076]), initValues(_3C_classLit, 42, -1, [8518]), initValues(_3C_classLit, 42, -1, [8225]), initValues(_3C_classLit, 42, -1, [8650]), initValues(_3C_classLit, 42, -1, [10871]), initValues(_3C_classLit, 42, -1, [176]), initValues(_3C_classLit, 42, -1, [176]), initValues(_3C_classLit, 42, -1, [948]), initValues(_3C_classLit, 42, -1, [10673]), initValues(_3C_classLit, 42, -1, [10623]), initValues(_3C_classLit, 42, -1, [55349, 56609]), initValues(_3C_classLit, 42, -1, [8643]), initValues(_3C_classLit, 42, -1, [8642]), initValues(_3C_classLit, 42, -1, [8900]), initValues(_3C_classLit, 42, -1, [8900]), initValues(_3C_classLit, 42, -1, [9830]), initValues(_3C_classLit, 42, -1, [9830]), initValues(_3C_classLit, 42, -1, [168]), initValues(_3C_classLit, 42, -1, [989]), initValues(_3C_classLit, 42, -1, [8946]), initValues(_3C_classLit, 42, -1, [247]), initValues(_3C_classLit, 42, -1, [247]), initValues(_3C_classLit, 42, -1, [247]), initValues(_3C_classLit, 42, -1, [8903]), initValues(_3C_classLit, 42, -1, [8903]), initValues(_3C_classLit, 42, -1, [1106]), initValues(_3C_classLit, 42, -1, [8990]), initValues(_3C_classLit, 42, -1, [8973]), initValues(_3C_classLit, 42, -1, [36]), initValues(_3C_classLit, 42, -1, [55349, 56661]), initValues(_3C_classLit, 42, -1, [729]), initValues(_3C_classLit, 42, -1, [8784]), initValues(_3C_classLit, 42, -1, [8785]), initValues(_3C_classLit, 42, -1, [8760]), initValues(_3C_classLit, 42, -1, [8724]), initValues(_3C_classLit, 42, -1, [8865]), initValues(_3C_classLit, 42, -1, [8966]), initValues(_3C_classLit, 42, -1, [8595]), initValues(_3C_classLit, 42, -1, [8650]), initValues(_3C_classLit, 42, -1, [8643]), initValues(_3C_classLit, 42, -1, [8642]), initValues(_3C_classLit, 42, -1, [10512]), initValues(_3C_classLit, 42, -1, [8991]), initValues(_3C_classLit, 42, -1, [8972]), initValues(_3C_classLit, 42, -1, [55349, 56505]), initValues(_3C_classLit, 42, -1, [1109]), initValues(_3C_classLit, 42, -1, [10742]), initValues(_3C_classLit, 42, -1, [273]), initValues(_3C_classLit, 42, -1, [8945]), initValues(_3C_classLit, 42, -1, [9663]), initValues(_3C_classLit, 42, -1, [9662]), initValues(_3C_classLit, 42, -1, [8693]), initValues(_3C_classLit, 42, -1, [10607]), initValues(_3C_classLit, 42, -1, [10662]), initValues(_3C_classLit, 42, -1, [1119]), initValues(_3C_classLit, 42, -1, [10239]), initValues(_3C_classLit, 42, -1, [10871]), initValues(_3C_classLit, 42, -1, [8785]), initValues(_3C_classLit, 42, -1, [233]), initValues(_3C_classLit, 42, -1, [233]), initValues(_3C_classLit, 42, -1, [10862]), initValues(_3C_classLit, 42, -1, [283]), initValues(_3C_classLit, 42, -1, [8790]), initValues(_3C_classLit, 42, -1, [234]), initValues(_3C_classLit, 42, -1, [234]), initValues(_3C_classLit, 42, -1, [8789]), initValues(_3C_classLit, 42, -1, [1101]), initValues(_3C_classLit, 42, -1, [279]), initValues(_3C_classLit, 42, -1, [8519]), initValues(_3C_classLit, 42, -1, [8786]), initValues(_3C_classLit, 42, -1, [55349, 56610]), initValues(_3C_classLit, 42, -1, [10906]), initValues(_3C_classLit, 42, -1, [232]), initValues(_3C_classLit, 42, -1, [232]), initValues(_3C_classLit, 42, -1, [10902]), initValues(_3C_classLit, 42, -1, [10904]), initValues(_3C_classLit, 42, -1, [10905]), initValues(_3C_classLit, 42, -1, [9191]), initValues(_3C_classLit, 42, -1, [8467]), initValues(_3C_classLit, 42, -1, [10901]), initValues(_3C_classLit, 42, -1, [10903]), initValues(_3C_classLit, 42, -1, [275]), initValues(_3C_classLit, 42, -1, [8709]), initValues(_3C_classLit, 42, -1, [8709]), initValues(_3C_classLit, 42, -1, [8709]), initValues(_3C_classLit, 42, -1, [8196]), initValues(_3C_classLit, 42, -1, [8197]), initValues(_3C_classLit, 42, -1, [8195]), initValues(_3C_classLit, 42, -1, [331]), initValues(_3C_classLit, 42, -1, [8194]), initValues(_3C_classLit, 42, -1, [281]), initValues(_3C_classLit, 42, -1, [55349, 56662]), initValues(_3C_classLit, 42, -1, [8917]), initValues(_3C_classLit, 42, -1, [10723]), initValues(_3C_classLit, 42, -1, [10865]), initValues(_3C_classLit, 42, -1, [1013]), initValues(_3C_classLit, 42, -1, [949]), initValues(_3C_classLit, 42, -1, [949]), initValues(_3C_classLit, 42, -1, [8790]), initValues(_3C_classLit, 42, -1, [8789]), initValues(_3C_classLit, 42, -1, [8770]), initValues(_3C_classLit, 42, -1, [10902]), initValues(_3C_classLit, 42, -1, [10901]), initValues(_3C_classLit, 42, -1, [61]), initValues(_3C_classLit, 42, -1, [8799]), initValues(_3C_classLit, 42, -1, [8801]), initValues(_3C_classLit, 42, -1, [10872]), initValues(_3C_classLit, 42, -1, [10725]), initValues(_3C_classLit, 42, -1, [8787]), initValues(_3C_classLit, 42, -1, [10609]), initValues(_3C_classLit, 42, -1, [8495]), initValues(_3C_classLit, 42, -1, [8784]), initValues(_3C_classLit, 42, -1, [8770]), initValues(_3C_classLit, 42, -1, [951]), initValues(_3C_classLit, 42, -1, [240]), initValues(_3C_classLit, 42, -1, [240]), initValues(_3C_classLit, 42, -1, [235]), initValues(_3C_classLit, 42, -1, [235]), initValues(_3C_classLit, 42, -1, [8364]), initValues(_3C_classLit, 42, -1, [33]), initValues(_3C_classLit, 42, -1, [8707]), initValues(_3C_classLit, 42, -1, [8496]), initValues(_3C_classLit, 42, -1, [8519]), initValues(_3C_classLit, 42, -1, [8786]), initValues(_3C_classLit, 42, -1, [1092]), initValues(_3C_classLit, 42, -1, [9792]), initValues(_3C_classLit, 42, -1, [64259]), initValues(_3C_classLit, 42, -1, [64256]), initValues(_3C_classLit, 42, -1, [64260]), initValues(_3C_classLit, 42, -1, [55349, 56611]), initValues(_3C_classLit, 42, -1, [64257]), initValues(_3C_classLit, 42, -1, [9837]), initValues(_3C_classLit, 42, -1, [64258]), initValues(_3C_classLit, 42, -1, [9649]), initValues(_3C_classLit, 42, -1, [402]), initValues(_3C_classLit, 42, -1, [55349, 56663]), initValues(_3C_classLit, 42, -1, [8704]), initValues(_3C_classLit, 42, -1, [8916]), initValues(_3C_classLit, 42, -1, [10969]), initValues(_3C_classLit, 42, -1, [10765]), initValues(_3C_classLit, 42, -1, [189]), initValues(_3C_classLit, 42, -1, [189]), initValues(_3C_classLit, 42, -1, [8531]), initValues(_3C_classLit, 42, -1, [188]), initValues(_3C_classLit, 42, -1, [188]), initValues(_3C_classLit, 42, -1, [8533]), initValues(_3C_classLit, 42, -1, [8537]), initValues(_3C_classLit, 42, -1, [8539]), initValues(_3C_classLit, 42, -1, [8532]), initValues(_3C_classLit, 42, -1, [8534]), initValues(_3C_classLit, 42, -1, [190]), initValues(_3C_classLit, 42, -1, [190]), initValues(_3C_classLit, 42, -1, [8535]), initValues(_3C_classLit, 42, -1, [8540]), initValues(_3C_classLit, 42, -1, [8536]), initValues(_3C_classLit, 42, -1, [8538]), initValues(_3C_classLit, 42, -1, [8541]), initValues(_3C_classLit, 42, -1, [8542]), initValues(_3C_classLit, 42, -1, [8260]), initValues(_3C_classLit, 42, -1, [8994]), initValues(_3C_classLit, 42, -1, [55349, 56507]), initValues(_3C_classLit, 42, -1, [8807]), initValues(_3C_classLit, 42, -1, [10892]), initValues(_3C_classLit, 42, -1, [501]), initValues(_3C_classLit, 42, -1, [947]), initValues(_3C_classLit, 42, -1, [989]), initValues(_3C_classLit, 42, -1, [10886]), initValues(_3C_classLit, 42, -1, [287]), initValues(_3C_classLit, 42, -1, [285]), initValues(_3C_classLit, 42, -1, [1075]), initValues(_3C_classLit, 42, -1, [289]), initValues(_3C_classLit, 42, -1, [8805]), initValues(_3C_classLit, 42, -1, [8923]), initValues(_3C_classLit, 42, -1, [8805]), initValues(_3C_classLit, 42, -1, [8807]), initValues(_3C_classLit, 42, -1, [10878]), initValues(_3C_classLit, 42, -1, [10878]), initValues(_3C_classLit, 42, -1, [10921]), initValues(_3C_classLit, 42, -1, [10880]), initValues(_3C_classLit, 42, -1, [10882]), initValues(_3C_classLit, 42, -1, [10884]), initValues(_3C_classLit, 42, -1, [10900]), initValues(_3C_classLit, 42, -1, [55349, 56612]), initValues(_3C_classLit, 42, -1, [8811]), initValues(_3C_classLit, 42, -1, [8921]), initValues(_3C_classLit, 42, -1, [8503]), initValues(_3C_classLit, 42, -1, [1107]), initValues(_3C_classLit, 42, -1, [8823]), initValues(_3C_classLit, 42, -1, [10898]), initValues(_3C_classLit, 42, -1, [10917]), initValues(_3C_classLit, 42, -1, [10916]), initValues(_3C_classLit, 42, -1, [8809]), initValues(_3C_classLit, 42, -1, [10890]), initValues(_3C_classLit, 42, -1, [10890]), initValues(_3C_classLit, 42, -1, [10888]), initValues(_3C_classLit, 42, -1, [10888]), initValues(_3C_classLit, 42, -1, [8809]), initValues(_3C_classLit, 42, -1, [8935]), initValues(_3C_classLit, 42, -1, [55349, 56664]), initValues(_3C_classLit, 42, -1, [96]), initValues(_3C_classLit, 42, -1, [8458]), initValues(_3C_classLit, 42, -1, [8819]), initValues(_3C_classLit, 42, -1, [10894]), initValues(_3C_classLit, 42, -1, [10896]), initValues(_3C_classLit, 42, -1, [62]), initValues(_3C_classLit, 42, -1, [62]), initValues(_3C_classLit, 42, -1, [10919]), initValues(_3C_classLit, 42, -1, [10874]), initValues(_3C_classLit, 42, -1, [8919]), initValues(_3C_classLit, 42, -1, [10645]), initValues(_3C_classLit, 42, -1, [10876]), initValues(_3C_classLit, 42, -1, [10886]), initValues(_3C_classLit, 42, -1, [10616]), initValues(_3C_classLit, 42, -1, [8919]), initValues(_3C_classLit, 42, -1, [8923]), initValues(_3C_classLit, 42, -1, [10892]), initValues(_3C_classLit, 42, -1, [8823]), initValues(_3C_classLit, 42, -1, [8819]), initValues(_3C_classLit, 42, -1, [8660]), initValues(_3C_classLit, 42, -1, [8202]), initValues(_3C_classLit, 42, -1, [189]), initValues(_3C_classLit, 42, -1, [8459]), initValues(_3C_classLit, 42, -1, [1098]), initValues(_3C_classLit, 42, -1, [8596]), initValues(_3C_classLit, 42, -1, [10568]), initValues(_3C_classLit, 42, -1, [8621]), initValues(_3C_classLit, 42, -1, [8463]), initValues(_3C_classLit, 42, -1, [293]), initValues(_3C_classLit, 42, -1, [9829]), initValues(_3C_classLit, 42, -1, [9829]), initValues(_3C_classLit, 42, -1, [8230]), initValues(_3C_classLit, 42, -1, [8889]), initValues(_3C_classLit, 42, -1, [55349, 56613]), initValues(_3C_classLit, 42, -1, [10533]), initValues(_3C_classLit, 42, -1, [10534]), initValues(_3C_classLit, 42, -1, [8703]), initValues(_3C_classLit, 42, -1, [8763]), initValues(_3C_classLit, 42, -1, [8617]), initValues(_3C_classLit, 42, -1, [8618]), initValues(_3C_classLit, 42, -1, [55349, 56665]), initValues(_3C_classLit, 42, -1, [8213]), initValues(_3C_classLit, 42, -1, [55349, 56509]), initValues(_3C_classLit, 42, -1, [8463]), initValues(_3C_classLit, 42, -1, [295]), initValues(_3C_classLit, 42, -1, [8259]), initValues(_3C_classLit, 42, -1, [8208]), initValues(_3C_classLit, 42, -1, [237]), initValues(_3C_classLit, 42, -1, [237]), initValues(_3C_classLit, 42, -1, [8291]), initValues(_3C_classLit, 42, -1, [238]), initValues(_3C_classLit, 42, -1, [238]), initValues(_3C_classLit, 42, -1, [1080]), initValues(_3C_classLit, 42, -1, [1077]), initValues(_3C_classLit, 42, -1, [161]), initValues(_3C_classLit, 42, -1, [161]), initValues(_3C_classLit, 42, -1, [8660]), initValues(_3C_classLit, 42, -1, [55349, 56614]), initValues(_3C_classLit, 42, -1, [236]), initValues(_3C_classLit, 42, -1, [236]), initValues(_3C_classLit, 42, -1, [8520]), initValues(_3C_classLit, 42, -1, [10764]), initValues(_3C_classLit, 42, -1, [8749]), initValues(_3C_classLit, 42, -1, [10716]), initValues(_3C_classLit, 42, -1, [8489]), initValues(_3C_classLit, 42, -1, [307]), initValues(_3C_classLit, 42, -1, [299]), initValues(_3C_classLit, 42, -1, [8465]), initValues(_3C_classLit, 42, -1, [8464]), initValues(_3C_classLit, 42, -1, [8465]), initValues(_3C_classLit, 42, -1, [305]), initValues(_3C_classLit, 42, -1, [8887]), initValues(_3C_classLit, 42, -1, [437]), initValues(_3C_classLit, 42, -1, [8712]), initValues(_3C_classLit, 42, -1, [8453]), initValues(_3C_classLit, 42, -1, [8734]), initValues(_3C_classLit, 42, -1, [10717]), initValues(_3C_classLit, 42, -1, [305]), initValues(_3C_classLit, 42, -1, [8747]), initValues(_3C_classLit, 42, -1, [8890]), initValues(_3C_classLit, 42, -1, [8484]), initValues(_3C_classLit, 42, -1, [8890]), initValues(_3C_classLit, 42, -1, [10775]), initValues(_3C_classLit, 42, -1, [10812]), initValues(_3C_classLit, 42, -1, [1105]), initValues(_3C_classLit, 42, -1, [303]), initValues(_3C_classLit, 42, -1, [55349, 56666]), initValues(_3C_classLit, 42, -1, [953]), initValues(_3C_classLit, 42, -1, [10812]), initValues(_3C_classLit, 42, -1, [191]), initValues(_3C_classLit, 42, -1, [191]), initValues(_3C_classLit, 42, -1, [55349, 56510]), initValues(_3C_classLit, 42, -1, [8712]), initValues(_3C_classLit, 42, -1, [8953]), initValues(_3C_classLit, 42, -1, [8949]), initValues(_3C_classLit, 42, -1, [8948]), initValues(_3C_classLit, 42, -1, [8947]), initValues(_3C_classLit, 42, -1, [8712]), initValues(_3C_classLit, 42, -1, [8290]), initValues(_3C_classLit, 42, -1, [297]), initValues(_3C_classLit, 42, -1, [1110]), initValues(_3C_classLit, 42, -1, [239]), initValues(_3C_classLit, 42, -1, [239]), initValues(_3C_classLit, 42, -1, [309]), initValues(_3C_classLit, 42, -1, [1081]), initValues(_3C_classLit, 42, -1, [55349, 56615]), initValues(_3C_classLit, 42, -1, [567]), initValues(_3C_classLit, 42, -1, [55349, 56667]), initValues(_3C_classLit, 42, -1, [55349, 56511]), initValues(_3C_classLit, 42, -1, [1112]), initValues(_3C_classLit, 42, -1, [1108]), initValues(_3C_classLit, 42, -1, [954]), initValues(_3C_classLit, 42, -1, [1008]), initValues(_3C_classLit, 42, -1, [311]), initValues(_3C_classLit, 42, -1, [1082]), initValues(_3C_classLit, 42, -1, [55349, 56616]), initValues(_3C_classLit, 42, -1, [312]), initValues(_3C_classLit, 42, -1, [1093]), initValues(_3C_classLit, 42, -1, [1116]), initValues(_3C_classLit, 42, -1, [55349, 56668]), initValues(_3C_classLit, 42, -1, [55349, 56512]), initValues(_3C_classLit, 42, -1, [8666]), initValues(_3C_classLit, 42, -1, [8656]), initValues(_3C_classLit, 42, -1, [10523]), initValues(_3C_classLit, 42, -1, [10510]), initValues(_3C_classLit, 42, -1, [8806]), initValues(_3C_classLit, 42, -1, [10891]), initValues(_3C_classLit, 42, -1, [10594]), initValues(_3C_classLit, 42, -1, [314]), initValues(_3C_classLit, 42, -1, [10676]), initValues(_3C_classLit, 42, -1, [8466]), initValues(_3C_classLit, 42, -1, [955]), initValues(_3C_classLit, 42, -1, [10216]), initValues(_3C_classLit, 42, -1, [10641]), initValues(_3C_classLit, 42, -1, [10216]), initValues(_3C_classLit, 42, -1, [10885]), initValues(_3C_classLit, 42, -1, [171]), initValues(_3C_classLit, 42, -1, [171]), initValues(_3C_classLit, 42, -1, [8592]), initValues(_3C_classLit, 42, -1, [8676]), initValues(_3C_classLit, 42, -1, [10527]), initValues(_3C_classLit, 42, -1, [10525]), initValues(_3C_classLit, 42, -1, [8617]), initValues(_3C_classLit, 42, -1, [8619]), initValues(_3C_classLit, 42, -1, [10553]), initValues(_3C_classLit, 42, -1, [10611]), initValues(_3C_classLit, 42, -1, [8610]), initValues(_3C_classLit, 42, -1, [10923]), initValues(_3C_classLit, 42, -1, [10521]), initValues(_3C_classLit, 42, -1, [10925]), initValues(_3C_classLit, 42, -1, [10508]), initValues(_3C_classLit, 42, -1, [10098]), initValues(_3C_classLit, 42, -1, [123]), initValues(_3C_classLit, 42, -1, [91]), initValues(_3C_classLit, 42, -1, [10635]), initValues(_3C_classLit, 42, -1, [10639]), initValues(_3C_classLit, 42, -1, [10637]), initValues(_3C_classLit, 42, -1, [318]), initValues(_3C_classLit, 42, -1, [316]), initValues(_3C_classLit, 42, -1, [8968]), initValues(_3C_classLit, 42, -1, [123]), initValues(_3C_classLit, 42, -1, [1083]), initValues(_3C_classLit, 42, -1, [10550]), initValues(_3C_classLit, 42, -1, [8220]), initValues(_3C_classLit, 42, -1, [8222]), initValues(_3C_classLit, 42, -1, [10599]), initValues(_3C_classLit, 42, -1, [10571]), initValues(_3C_classLit, 42, -1, [8626]), initValues(_3C_classLit, 42, -1, [8804]), initValues(_3C_classLit, 42, -1, [8592]), initValues(_3C_classLit, 42, -1, [8610]), initValues(_3C_classLit, 42, -1, [8637]), initValues(_3C_classLit, 42, -1, [8636]), initValues(_3C_classLit, 42, -1, [8647]), initValues(_3C_classLit, 42, -1, [8596]), initValues(_3C_classLit, 42, -1, [8646]), initValues(_3C_classLit, 42, -1, [8651]), initValues(_3C_classLit, 42, -1, [8621]), initValues(_3C_classLit, 42, -1, [8907]), initValues(_3C_classLit, 42, -1, [8922]), initValues(_3C_classLit, 42, -1, [8804]), initValues(_3C_classLit, 42, -1, [8806]), initValues(_3C_classLit, 42, -1, [10877]), initValues(_3C_classLit, 42, -1, [10877]), initValues(_3C_classLit, 42, -1, [10920]), initValues(_3C_classLit, 42, -1, [10879]), initValues(_3C_classLit, 42, -1, [10881]), initValues(_3C_classLit, 42, -1, [10883]), initValues(_3C_classLit, 42, -1, [10899]), initValues(_3C_classLit, 42, -1, [10885]), initValues(_3C_classLit, 42, -1, [8918]), initValues(_3C_classLit, 42, -1, [8922]), initValues(_3C_classLit, 42, -1, [10891]), initValues(_3C_classLit, 42, -1, [8822]), initValues(_3C_classLit, 42, -1, [8818]), initValues(_3C_classLit, 42, -1, [10620]), initValues(_3C_classLit, 42, -1, [8970]), initValues(_3C_classLit, 42, -1, [55349, 56617]), initValues(_3C_classLit, 42, -1, [8822]), initValues(_3C_classLit, 42, -1, [10897]), initValues(_3C_classLit, 42, -1, [8637]), initValues(_3C_classLit, 42, -1, [8636]), initValues(_3C_classLit, 42, -1, [10602]), initValues(_3C_classLit, 42, -1, [9604]), initValues(_3C_classLit, 42, -1, [1113]), initValues(_3C_classLit, 42, -1, [8810]), initValues(_3C_classLit, 42, -1, [8647]), initValues(_3C_classLit, 42, -1, [8990]), initValues(_3C_classLit, 42, -1, [10603]), initValues(_3C_classLit, 42, -1, [9722]), initValues(_3C_classLit, 42, -1, [320]), initValues(_3C_classLit, 42, -1, [9136]), initValues(_3C_classLit, 42, -1, [9136]), initValues(_3C_classLit, 42, -1, [8808]), initValues(_3C_classLit, 42, -1, [10889]), initValues(_3C_classLit, 42, -1, [10889]), initValues(_3C_classLit, 42, -1, [10887]), initValues(_3C_classLit, 42, -1, [10887]), initValues(_3C_classLit, 42, -1, [8808]), initValues(_3C_classLit, 42, -1, [8934]), initValues(_3C_classLit, 42, -1, [10220]), initValues(_3C_classLit, 42, -1, [8701]), initValues(_3C_classLit, 42, -1, [10214]), initValues(_3C_classLit, 42, -1, [10229]), initValues(_3C_classLit, 42, -1, [10231]), initValues(_3C_classLit, 42, -1, [10236]), initValues(_3C_classLit, 42, -1, [10230]), initValues(_3C_classLit, 42, -1, [8619]), initValues(_3C_classLit, 42, -1, [8620]), initValues(_3C_classLit, 42, -1, [10629]), initValues(_3C_classLit, 42, -1, [55349, 56669]), initValues(_3C_classLit, 42, -1, [10797]), initValues(_3C_classLit, 42, -1, [10804]), initValues(_3C_classLit, 42, -1, [8727]), initValues(_3C_classLit, 42, -1, [95]), initValues(_3C_classLit, 42, -1, [9674]), initValues(_3C_classLit, 42, -1, [9674]), initValues(_3C_classLit, 42, -1, [10731]), initValues(_3C_classLit, 42, -1, [40]), initValues(_3C_classLit, 42, -1, [10643]), initValues(_3C_classLit, 42, -1, [8646]), initValues(_3C_classLit, 42, -1, [8991]), initValues(_3C_classLit, 42, -1, [8651]), initValues(_3C_classLit, 42, -1, [10605]), initValues(_3C_classLit, 42, -1, [8206]), initValues(_3C_classLit, 42, -1, [8895]), initValues(_3C_classLit, 42, -1, [8249]), initValues(_3C_classLit, 42, -1, [55349, 56513]), initValues(_3C_classLit, 42, -1, [8624]), initValues(_3C_classLit, 42, -1, [8818]), initValues(_3C_classLit, 42, -1, [10893]), initValues(_3C_classLit, 42, -1, [10895]), initValues(_3C_classLit, 42, -1, [91]), initValues(_3C_classLit, 42, -1, [8216]), initValues(_3C_classLit, 42, -1, [8218]), initValues(_3C_classLit, 42, -1, [322]), initValues(_3C_classLit, 42, -1, [60]), initValues(_3C_classLit, 42, -1, [60]), initValues(_3C_classLit, 42, -1, [10918]), initValues(_3C_classLit, 42, -1, [10873]), initValues(_3C_classLit, 42, -1, [8918]), initValues(_3C_classLit, 42, -1, [8907]), initValues(_3C_classLit, 42, -1, [8905]), initValues(_3C_classLit, 42, -1, [10614]), initValues(_3C_classLit, 42, -1, [10875]), initValues(_3C_classLit, 42, -1, [10646]), initValues(_3C_classLit, 42, -1, [9667]), initValues(_3C_classLit, 42, -1, [8884]), initValues(_3C_classLit, 42, -1, [9666]), initValues(_3C_classLit, 42, -1, [10570]), initValues(_3C_classLit, 42, -1, [10598]), initValues(_3C_classLit, 42, -1, [8762]), initValues(_3C_classLit, 42, -1, [175]), initValues(_3C_classLit, 42, -1, [175]), initValues(_3C_classLit, 42, -1, [9794]), initValues(_3C_classLit, 42, -1, [10016]), initValues(_3C_classLit, 42, -1, [10016]), initValues(_3C_classLit, 42, -1, [8614]), initValues(_3C_classLit, 42, -1, [8614]), initValues(_3C_classLit, 42, -1, [8615]), initValues(_3C_classLit, 42, -1, [8612]), initValues(_3C_classLit, 42, -1, [8613]), initValues(_3C_classLit, 42, -1, [9646]), initValues(_3C_classLit, 42, -1, [10793]), initValues(_3C_classLit, 42, -1, [1084]), initValues(_3C_classLit, 42, -1, [8212]), initValues(_3C_classLit, 42, -1, [8737]), initValues(_3C_classLit, 42, -1, [55349, 56618]), initValues(_3C_classLit, 42, -1, [8487]), initValues(_3C_classLit, 42, -1, [181]), initValues(_3C_classLit, 42, -1, [181]), initValues(_3C_classLit, 42, -1, [8739]), initValues(_3C_classLit, 42, -1, [42]), initValues(_3C_classLit, 42, -1, [10992]), initValues(_3C_classLit, 42, -1, [183]), initValues(_3C_classLit, 42, -1, [183]), initValues(_3C_classLit, 42, -1, [8722]), initValues(_3C_classLit, 42, -1, [8863]), initValues(_3C_classLit, 42, -1, [8760]), initValues(_3C_classLit, 42, -1, [10794]), initValues(_3C_classLit, 42, -1, [10971]), initValues(_3C_classLit, 42, -1, [8230]), initValues(_3C_classLit, 42, -1, [8723]), initValues(_3C_classLit, 42, -1, [8871]), initValues(_3C_classLit, 42, -1, [55349, 56670]), initValues(_3C_classLit, 42, -1, [8723]), initValues(_3C_classLit, 42, -1, [55349, 56514]), initValues(_3C_classLit, 42, -1, [8766]), initValues(_3C_classLit, 42, -1, [956]), initValues(_3C_classLit, 42, -1, [8888]), initValues(_3C_classLit, 42, -1, [8888]), initValues(_3C_classLit, 42, -1, [8653]), initValues(_3C_classLit, 42, -1, [8654]), initValues(_3C_classLit, 42, -1, [8655]), initValues(_3C_classLit, 42, -1, [8879]), initValues(_3C_classLit, 42, -1, [8878]), initValues(_3C_classLit, 42, -1, [8711]), initValues(_3C_classLit, 42, -1, [324]), initValues(_3C_classLit, 42, -1, [8777]), initValues(_3C_classLit, 42, -1, [329]), initValues(_3C_classLit, 42, -1, [8777]), initValues(_3C_classLit, 42, -1, [9838]), initValues(_3C_classLit, 42, -1, [9838]), initValues(_3C_classLit, 42, -1, [8469]), initValues(_3C_classLit, 42, -1, [160]), initValues(_3C_classLit, 42, -1, [160]), initValues(_3C_classLit, 42, -1, [10819]), initValues(_3C_classLit, 42, -1, [328]), initValues(_3C_classLit, 42, -1, [326]), initValues(_3C_classLit, 42, -1, [8775]), initValues(_3C_classLit, 42, -1, [10818]), initValues(_3C_classLit, 42, -1, [1085]), initValues(_3C_classLit, 42, -1, [8211]), initValues(_3C_classLit, 42, -1, [8800]), initValues(_3C_classLit, 42, -1, [8663]), initValues(_3C_classLit, 42, -1, [10532]), initValues(_3C_classLit, 42, -1, [8599]), initValues(_3C_classLit, 42, -1, [8599]), initValues(_3C_classLit, 42, -1, [8802]), initValues(_3C_classLit, 42, -1, [10536]), initValues(_3C_classLit, 42, -1, [8708]), initValues(_3C_classLit, 42, -1, [8708]), initValues(_3C_classLit, 42, -1, [55349, 56619]), initValues(_3C_classLit, 42, -1, [8817]), initValues(_3C_classLit, 42, -1, [8817]), initValues(_3C_classLit, 42, -1, [8821]), initValues(_3C_classLit, 42, -1, [8815]), initValues(_3C_classLit, 42, -1, [8815]), initValues(_3C_classLit, 42, -1, [8654]), initValues(_3C_classLit, 42, -1, [8622]), initValues(_3C_classLit, 42, -1, [10994]), initValues(_3C_classLit, 42, -1, [8715]), initValues(_3C_classLit, 42, -1, [8956]), initValues(_3C_classLit, 42, -1, [8954]), initValues(_3C_classLit, 42, -1, [8715]), initValues(_3C_classLit, 42, -1, [1114]), initValues(_3C_classLit, 42, -1, [8653]), initValues(_3C_classLit, 42, -1, [8602]), initValues(_3C_classLit, 42, -1, [8229]), initValues(_3C_classLit, 42, -1, [8816]), initValues(_3C_classLit, 42, -1, [8602]), initValues(_3C_classLit, 42, -1, [8622]), initValues(_3C_classLit, 42, -1, [8816]), initValues(_3C_classLit, 42, -1, [8814]), initValues(_3C_classLit, 42, -1, [8820]), initValues(_3C_classLit, 42, -1, [8814]), initValues(_3C_classLit, 42, -1, [8938]), initValues(_3C_classLit, 42, -1, [8940]), initValues(_3C_classLit, 42, -1, [8740]), initValues(_3C_classLit, 42, -1, [55349, 56671]), initValues(_3C_classLit, 42, -1, [172]), initValues(_3C_classLit, 42, -1, [172]), initValues(_3C_classLit, 42, -1, [8713]), initValues(_3C_classLit, 42, -1, [8713]), initValues(_3C_classLit, 42, -1, [8951]), initValues(_3C_classLit, 42, -1, [8950]), initValues(_3C_classLit, 42, -1, [8716]), initValues(_3C_classLit, 42, -1, [8716]), initValues(_3C_classLit, 42, -1, [8958]), initValues(_3C_classLit, 42, -1, [8957]), initValues(_3C_classLit, 42, -1, [8742]), initValues(_3C_classLit, 42, -1, [8742]), initValues(_3C_classLit, 42, -1, [10772]), initValues(_3C_classLit, 42, -1, [8832]), initValues(_3C_classLit, 42, -1, [8928]), initValues(_3C_classLit, 42, -1, [8832]), initValues(_3C_classLit, 42, -1, [8655]), initValues(_3C_classLit, 42, -1, [8603]), initValues(_3C_classLit, 42, -1, [8603]), initValues(_3C_classLit, 42, -1, [8939]), initValues(_3C_classLit, 42, -1, [8941]), initValues(_3C_classLit, 42, -1, [8833]), initValues(_3C_classLit, 42, -1, [8929]), initValues(_3C_classLit, 42, -1, [55349, 56515]), initValues(_3C_classLit, 42, -1, [8740]), initValues(_3C_classLit, 42, -1, [8742]), initValues(_3C_classLit, 42, -1, [8769]), initValues(_3C_classLit, 42, -1, [8772]), initValues(_3C_classLit, 42, -1, [8772]), initValues(_3C_classLit, 42, -1, [8740]), initValues(_3C_classLit, 42, -1, [8742]), initValues(_3C_classLit, 42, -1, [8930]), initValues(_3C_classLit, 42, -1, [8931]), initValues(_3C_classLit, 42, -1, [8836]), initValues(_3C_classLit, 42, -1, [8840]), initValues(_3C_classLit, 42, -1, [8840]), initValues(_3C_classLit, 42, -1, [8833]), initValues(_3C_classLit, 42, -1, [8837]), initValues(_3C_classLit, 42, -1, [8841]), initValues(_3C_classLit, 42, -1, [8841]), initValues(_3C_classLit, 42, -1, [8825]), initValues(_3C_classLit, 42, -1, [241]), initValues(_3C_classLit, 42, -1, [241]), initValues(_3C_classLit, 42, -1, [8824]), initValues(_3C_classLit, 42, -1, [8938]), initValues(_3C_classLit, 42, -1, [8940]), initValues(_3C_classLit, 42, -1, [8939]), initValues(_3C_classLit, 42, -1, [8941]), initValues(_3C_classLit, 42, -1, [957]), initValues(_3C_classLit, 42, -1, [35]), initValues(_3C_classLit, 42, -1, [8470]), initValues(_3C_classLit, 42, -1, [8199]), initValues(_3C_classLit, 42, -1, [8877]), initValues(_3C_classLit, 42, -1, [10500]), initValues(_3C_classLit, 42, -1, [8876]), initValues(_3C_classLit, 42, -1, [10718]), initValues(_3C_classLit, 42, -1, [10498]), initValues(_3C_classLit, 42, -1, [10499]), initValues(_3C_classLit, 42, -1, [8662]), initValues(_3C_classLit, 42, -1, [10531]), initValues(_3C_classLit, 42, -1, [8598]), initValues(_3C_classLit, 42, -1, [8598]), initValues(_3C_classLit, 42, -1, [10535]), initValues(_3C_classLit, 42, -1, [9416]), initValues(_3C_classLit, 42, -1, [243]), initValues(_3C_classLit, 42, -1, [243]), initValues(_3C_classLit, 42, -1, [8859]), initValues(_3C_classLit, 42, -1, [8858]), initValues(_3C_classLit, 42, -1, [244]), initValues(_3C_classLit, 42, -1, [244]), initValues(_3C_classLit, 42, -1, [1086]), initValues(_3C_classLit, 42, -1, [8861]), initValues(_3C_classLit, 42, -1, [337]), initValues(_3C_classLit, 42, -1, [10808]), initValues(_3C_classLit, 42, -1, [8857]), initValues(_3C_classLit, 42, -1, [10684]), initValues(_3C_classLit, 42, -1, [339]), initValues(_3C_classLit, 42, -1, [10687]), initValues(_3C_classLit, 42, -1, [55349, 56620]), initValues(_3C_classLit, 42, -1, [731]), initValues(_3C_classLit, 42, -1, [242]), initValues(_3C_classLit, 42, -1, [242]), initValues(_3C_classLit, 42, -1, [10689]), initValues(_3C_classLit, 42, -1, [10677]), initValues(_3C_classLit, 42, -1, [8486]), initValues(_3C_classLit, 42, -1, [8750]), initValues(_3C_classLit, 42, -1, [8634]), initValues(_3C_classLit, 42, -1, [10686]), initValues(_3C_classLit, 42, -1, [10683]), initValues(_3C_classLit, 42, -1, [8254]), initValues(_3C_classLit, 42, -1, [10688]), initValues(_3C_classLit, 42, -1, [333]), initValues(_3C_classLit, 42, -1, [969]), initValues(_3C_classLit, 42, -1, [959]), initValues(_3C_classLit, 42, -1, [10678]), initValues(_3C_classLit, 42, -1, [8854]), initValues(_3C_classLit, 42, -1, [55349, 56672]), initValues(_3C_classLit, 42, -1, [10679]), initValues(_3C_classLit, 42, -1, [10681]), initValues(_3C_classLit, 42, -1, [8853]), initValues(_3C_classLit, 42, -1, [8744]), initValues(_3C_classLit, 42, -1, [8635]), initValues(_3C_classLit, 42, -1, [10845]), initValues(_3C_classLit, 42, -1, [8500]), initValues(_3C_classLit, 42, -1, [8500]), initValues(_3C_classLit, 42, -1, [170]), initValues(_3C_classLit, 42, -1, [170]), initValues(_3C_classLit, 42, -1, [186]), initValues(_3C_classLit, 42, -1, [186]), initValues(_3C_classLit, 42, -1, [8886]), initValues(_3C_classLit, 42, -1, [10838]), initValues(_3C_classLit, 42, -1, [10839]), initValues(_3C_classLit, 42, -1, [10843]), initValues(_3C_classLit, 42, -1, [8500]), initValues(_3C_classLit, 42, -1, [248]), initValues(_3C_classLit, 42, -1, [248]), initValues(_3C_classLit, 42, -1, [8856]), initValues(_3C_classLit, 42, -1, [245]), initValues(_3C_classLit, 42, -1, [245]), initValues(_3C_classLit, 42, -1, [8855]), initValues(_3C_classLit, 42, -1, [10806]), initValues(_3C_classLit, 42, -1, [246]), initValues(_3C_classLit, 42, -1, [246]), initValues(_3C_classLit, 42, -1, [9021]), initValues(_3C_classLit, 42, -1, [8741]), initValues(_3C_classLit, 42, -1, [182]), initValues(_3C_classLit, 42, -1, [182]), initValues(_3C_classLit, 42, -1, [8741]), initValues(_3C_classLit, 42, -1, [10995]), initValues(_3C_classLit, 42, -1, [11005]), initValues(_3C_classLit, 42, -1, [8706]), initValues(_3C_classLit, 42, -1, [1087]), initValues(_3C_classLit, 42, -1, [37]), initValues(_3C_classLit, 42, -1, [46]), initValues(_3C_classLit, 42, -1, [8240]), initValues(_3C_classLit, 42, -1, [8869]), initValues(_3C_classLit, 42, -1, [8241]), initValues(_3C_classLit, 42, -1, [55349, 56621]), initValues(_3C_classLit, 42, -1, [966]), initValues(_3C_classLit, 42, -1, [966]), initValues(_3C_classLit, 42, -1, [8499]), initValues(_3C_classLit, 42, -1, [9742]), initValues(_3C_classLit, 42, -1, [960]), initValues(_3C_classLit, 42, -1, [8916]), initValues(_3C_classLit, 42, -1, [982]), initValues(_3C_classLit, 42, -1, [8463]), initValues(_3C_classLit, 42, -1, [8462]), initValues(_3C_classLit, 42, -1, [8463]), initValues(_3C_classLit, 42, -1, [43]), initValues(_3C_classLit, 42, -1, [10787]), initValues(_3C_classLit, 42, -1, [8862]), initValues(_3C_classLit, 42, -1, [10786]), initValues(_3C_classLit, 42, -1, [8724]), initValues(_3C_classLit, 42, -1, [10789]), initValues(_3C_classLit, 42, -1, [10866]), initValues(_3C_classLit, 42, -1, [177]), initValues(_3C_classLit, 42, -1, [177]), initValues(_3C_classLit, 42, -1, [10790]), initValues(_3C_classLit, 42, -1, [10791]), initValues(_3C_classLit, 42, -1, [177]), initValues(_3C_classLit, 42, -1, [10773]), initValues(_3C_classLit, 42, -1, [55349, 56673]), initValues(_3C_classLit, 42, -1, [163]), initValues(_3C_classLit, 42, -1, [163]), initValues(_3C_classLit, 42, -1, [8826]), initValues(_3C_classLit, 42, -1, [10931]), initValues(_3C_classLit, 42, -1, [10935]), initValues(_3C_classLit, 42, -1, [8828]), initValues(_3C_classLit, 42, -1, [10927]), initValues(_3C_classLit, 42, -1, [8826]), initValues(_3C_classLit, 42, -1, [10935]), initValues(_3C_classLit, 42, -1, [8828]), initValues(_3C_classLit, 42, -1, [10927]), initValues(_3C_classLit, 42, -1, [10937]), initValues(_3C_classLit, 42, -1, [10933]), initValues(_3C_classLit, 42, -1, [8936]), initValues(_3C_classLit, 42, -1, [8830]), initValues(_3C_classLit, 42, -1, [8242]), initValues(_3C_classLit, 42, -1, [8473]), initValues(_3C_classLit, 42, -1, [10933]), initValues(_3C_classLit, 42, -1, [10937]), initValues(_3C_classLit, 42, -1, [8936]), initValues(_3C_classLit, 42, -1, [8719]), initValues(_3C_classLit, 42, -1, [9006]), initValues(_3C_classLit, 42, -1, [8978]), initValues(_3C_classLit, 42, -1, [8979]), initValues(_3C_classLit, 42, -1, [8733]), initValues(_3C_classLit, 42, -1, [8733]), initValues(_3C_classLit, 42, -1, [8830]), initValues(_3C_classLit, 42, -1, [8880]), initValues(_3C_classLit, 42, -1, [55349, 56517]), initValues(_3C_classLit, 42, -1, [968]), initValues(_3C_classLit, 42, -1, [8200]), initValues(_3C_classLit, 42, -1, [55349, 56622]), initValues(_3C_classLit, 42, -1, [10764]), initValues(_3C_classLit, 42, -1, [55349, 56674]), initValues(_3C_classLit, 42, -1, [8279]), initValues(_3C_classLit, 42, -1, [55349, 56518]), initValues(_3C_classLit, 42, -1, [8461]), initValues(_3C_classLit, 42, -1, [10774]), initValues(_3C_classLit, 42, -1, [63]), initValues(_3C_classLit, 42, -1, [8799]), initValues(_3C_classLit, 42, -1, [34]), initValues(_3C_classLit, 42, -1, [34]), initValues(_3C_classLit, 42, -1, [8667]), initValues(_3C_classLit, 42, -1, [8658]), initValues(_3C_classLit, 42, -1, [10524]), initValues(_3C_classLit, 42, -1, [10511]), initValues(_3C_classLit, 42, -1, [10596]), initValues(_3C_classLit, 42, -1, [10714]), initValues(_3C_classLit, 42, -1, [341]), initValues(_3C_classLit, 42, -1, [8730]), initValues(_3C_classLit, 42, -1, [10675]), initValues(_3C_classLit, 42, -1, [10217]), initValues(_3C_classLit, 42, -1, [10642]), initValues(_3C_classLit, 42, -1, [10661]), initValues(_3C_classLit, 42, -1, [10217]), initValues(_3C_classLit, 42, -1, [187]), initValues(_3C_classLit, 42, -1, [187]), initValues(_3C_classLit, 42, -1, [8594]), initValues(_3C_classLit, 42, -1, [10613]), initValues(_3C_classLit, 42, -1, [8677]), initValues(_3C_classLit, 42, -1, [10528]), initValues(_3C_classLit, 42, -1, [10547]), initValues(_3C_classLit, 42, -1, [10526]), initValues(_3C_classLit, 42, -1, [8618]), initValues(_3C_classLit, 42, -1, [8620]), initValues(_3C_classLit, 42, -1, [10565]), initValues(_3C_classLit, 42, -1, [10612]), initValues(_3C_classLit, 42, -1, [8611]), initValues(_3C_classLit, 42, -1, [8605]), initValues(_3C_classLit, 42, -1, [10522]), initValues(_3C_classLit, 42, -1, [8758]), initValues(_3C_classLit, 42, -1, [8474]), initValues(_3C_classLit, 42, -1, [10509]), initValues(_3C_classLit, 42, -1, [10099]), initValues(_3C_classLit, 42, -1, [125]), initValues(_3C_classLit, 42, -1, [93]), initValues(_3C_classLit, 42, -1, [10636]), initValues(_3C_classLit, 42, -1, [10638]), initValues(_3C_classLit, 42, -1, [10640]), initValues(_3C_classLit, 42, -1, [345]), initValues(_3C_classLit, 42, -1, [343]), initValues(_3C_classLit, 42, -1, [8969]), initValues(_3C_classLit, 42, -1, [125]), initValues(_3C_classLit, 42, -1, [1088]), initValues(_3C_classLit, 42, -1, [10551]), initValues(_3C_classLit, 42, -1, [10601]), initValues(_3C_classLit, 42, -1, [8221]), initValues(_3C_classLit, 42, -1, [8221]), initValues(_3C_classLit, 42, -1, [8627]), initValues(_3C_classLit, 42, -1, [8476]), initValues(_3C_classLit, 42, -1, [8475]), initValues(_3C_classLit, 42, -1, [8476]), initValues(_3C_classLit, 42, -1, [8477]), initValues(_3C_classLit, 42, -1, [9645]), initValues(_3C_classLit, 42, -1, [174]), initValues(_3C_classLit, 42, -1, [174]), initValues(_3C_classLit, 42, -1, [10621]), initValues(_3C_classLit, 42, -1, [8971]), initValues(_3C_classLit, 42, -1, [55349, 56623]), initValues(_3C_classLit, 42, -1, [8641]), initValues(_3C_classLit, 42, -1, [8640]), initValues(_3C_classLit, 42, -1, [10604]), initValues(_3C_classLit, 42, -1, [961]), initValues(_3C_classLit, 42, -1, [1009]), initValues(_3C_classLit, 42, -1, [8594]), initValues(_3C_classLit, 42, -1, [8611]), initValues(_3C_classLit, 42, -1, [8641]), initValues(_3C_classLit, 42, -1, [8640]), initValues(_3C_classLit, 42, -1, [8644]), initValues(_3C_classLit, 42, -1, [8652]), initValues(_3C_classLit, 42, -1, [8649]), initValues(_3C_classLit, 42, -1, [8605]), initValues(_3C_classLit, 42, -1, [8908]), initValues(_3C_classLit, 42, -1, [730]), initValues(_3C_classLit, 42, -1, [8787]), initValues(_3C_classLit, 42, -1, [8644]), initValues(_3C_classLit, 42, -1, [8652]), initValues(_3C_classLit, 42, -1, [8207]), initValues(_3C_classLit, 42, -1, [9137]), initValues(_3C_classLit, 42, -1, [9137]), initValues(_3C_classLit, 42, -1, [10990]), initValues(_3C_classLit, 42, -1, [10221]), initValues(_3C_classLit, 42, -1, [8702]), initValues(_3C_classLit, 42, -1, [10215]), initValues(_3C_classLit, 42, -1, [10630]), initValues(_3C_classLit, 42, -1, [55349, 56675]), initValues(_3C_classLit, 42, -1, [10798]), initValues(_3C_classLit, 42, -1, [10805]), initValues(_3C_classLit, 42, -1, [41]), initValues(_3C_classLit, 42, -1, [10644]), initValues(_3C_classLit, 42, -1, [10770]), initValues(_3C_classLit, 42, -1, [8649]), initValues(_3C_classLit, 42, -1, [8250]), initValues(_3C_classLit, 42, -1, [55349, 56519]), initValues(_3C_classLit, 42, -1, [8625]), initValues(_3C_classLit, 42, -1, [93]), initValues(_3C_classLit, 42, -1, [8217]), initValues(_3C_classLit, 42, -1, [8217]), initValues(_3C_classLit, 42, -1, [8908]), initValues(_3C_classLit, 42, -1, [8906]), initValues(_3C_classLit, 42, -1, [9657]), initValues(_3C_classLit, 42, -1, [8885]), initValues(_3C_classLit, 42, -1, [9656]), initValues(_3C_classLit, 42, -1, [10702]), initValues(_3C_classLit, 42, -1, [10600]), initValues(_3C_classLit, 42, -1, [8478]), initValues(_3C_classLit, 42, -1, [347]), initValues(_3C_classLit, 42, -1, [8218]), initValues(_3C_classLit, 42, -1, [8827]), initValues(_3C_classLit, 42, -1, [10932]), initValues(_3C_classLit, 42, -1, [10936]), initValues(_3C_classLit, 42, -1, [353]), initValues(_3C_classLit, 42, -1, [8829]), initValues(_3C_classLit, 42, -1, [10928]), initValues(_3C_classLit, 42, -1, [351]), initValues(_3C_classLit, 42, -1, [349]), initValues(_3C_classLit, 42, -1, [10934]), initValues(_3C_classLit, 42, -1, [10938]), initValues(_3C_classLit, 42, -1, [8937]), initValues(_3C_classLit, 42, -1, [10771]), initValues(_3C_classLit, 42, -1, [8831]), initValues(_3C_classLit, 42, -1, [1089]), initValues(_3C_classLit, 42, -1, [8901]), initValues(_3C_classLit, 42, -1, [8865]), initValues(_3C_classLit, 42, -1, [10854]), initValues(_3C_classLit, 42, -1, [8664]), initValues(_3C_classLit, 42, -1, [10533]), initValues(_3C_classLit, 42, -1, [8600]), initValues(_3C_classLit, 42, -1, [8600]), initValues(_3C_classLit, 42, -1, [167]), initValues(_3C_classLit, 42, -1, [167]), initValues(_3C_classLit, 42, -1, [59]), initValues(_3C_classLit, 42, -1, [10537]), initValues(_3C_classLit, 42, -1, [8726]), initValues(_3C_classLit, 42, -1, [8726]), initValues(_3C_classLit, 42, -1, [10038]), initValues(_3C_classLit, 42, -1, [55349, 56624]), initValues(_3C_classLit, 42, -1, [8994]), initValues(_3C_classLit, 42, -1, [9839]), initValues(_3C_classLit, 42, -1, [1097]), initValues(_3C_classLit, 42, -1, [1096]), initValues(_3C_classLit, 42, -1, [8739]), initValues(_3C_classLit, 42, -1, [8741]), initValues(_3C_classLit, 42, -1, [173]), initValues(_3C_classLit, 42, -1, [173]), initValues(_3C_classLit, 42, -1, [963]), initValues(_3C_classLit, 42, -1, [962]), initValues(_3C_classLit, 42, -1, [962]), initValues(_3C_classLit, 42, -1, [8764]), initValues(_3C_classLit, 42, -1, [10858]), initValues(_3C_classLit, 42, -1, [8771]), initValues(_3C_classLit, 42, -1, [8771]), initValues(_3C_classLit, 42, -1, [10910]), initValues(_3C_classLit, 42, -1, [10912]), initValues(_3C_classLit, 42, -1, [10909]), initValues(_3C_classLit, 42, -1, [10911]), initValues(_3C_classLit, 42, -1, [8774]), initValues(_3C_classLit, 42, -1, [10788]), initValues(_3C_classLit, 42, -1, [10610]), initValues(_3C_classLit, 42, -1, [8592]), initValues(_3C_classLit, 42, -1, [8726]), initValues(_3C_classLit, 42, -1, [10803]), initValues(_3C_classLit, 42, -1, [10724]), initValues(_3C_classLit, 42, -1, [8739]), initValues(_3C_classLit, 42, -1, [8995]), initValues(_3C_classLit, 42, -1, [10922]), initValues(_3C_classLit, 42, -1, [10924]), initValues(_3C_classLit, 42, -1, [1100]), initValues(_3C_classLit, 42, -1, [47]), initValues(_3C_classLit, 42, -1, [10692]), initValues(_3C_classLit, 42, -1, [9023]), initValues(_3C_classLit, 42, -1, [55349, 56676]), initValues(_3C_classLit, 42, -1, [9824]), initValues(_3C_classLit, 42, -1, [9824]), initValues(_3C_classLit, 42, -1, [8741]), initValues(_3C_classLit, 42, -1, [8851]), initValues(_3C_classLit, 42, -1, [8852]), initValues(_3C_classLit, 42, -1, [8847]), initValues(_3C_classLit, 42, -1, [8849]), initValues(_3C_classLit, 42, -1, [8847]), initValues(_3C_classLit, 42, -1, [8849]), initValues(_3C_classLit, 42, -1, [8848]), initValues(_3C_classLit, 42, -1, [8850]), initValues(_3C_classLit, 42, -1, [8848]), initValues(_3C_classLit, 42, -1, [8850]), initValues(_3C_classLit, 42, -1, [9633]), initValues(_3C_classLit, 42, -1, [9633]), initValues(_3C_classLit, 42, -1, [9642]), initValues(_3C_classLit, 42, -1, [9642]), initValues(_3C_classLit, 42, -1, [8594]), initValues(_3C_classLit, 42, -1, [55349, 56520]), initValues(_3C_classLit, 42, -1, [8726]), initValues(_3C_classLit, 42, -1, [8995]), initValues(_3C_classLit, 42, -1, [8902]), initValues(_3C_classLit, 42, -1, [9734]), initValues(_3C_classLit, 42, -1, [9733]), initValues(_3C_classLit, 42, -1, [1013]), initValues(_3C_classLit, 42, -1, [981]), initValues(_3C_classLit, 42, -1, [175]), initValues(_3C_classLit, 42, -1, [8834]), initValues(_3C_classLit, 42, -1, [10949]), initValues(_3C_classLit, 42, -1, [10941]), initValues(_3C_classLit, 42, -1, [8838]), initValues(_3C_classLit, 42, -1, [10947]), initValues(_3C_classLit, 42, -1, [10945]), initValues(_3C_classLit, 42, -1, [10955]), initValues(_3C_classLit, 42, -1, [8842]), initValues(_3C_classLit, 42, -1, [10943]), initValues(_3C_classLit, 42, -1, [10617]), initValues(_3C_classLit, 42, -1, [8834]), initValues(_3C_classLit, 42, -1, [8838]), initValues(_3C_classLit, 42, -1, [10949]), initValues(_3C_classLit, 42, -1, [8842]), initValues(_3C_classLit, 42, -1, [10955]), initValues(_3C_classLit, 42, -1, [10951]), initValues(_3C_classLit, 42, -1, [10965]), initValues(_3C_classLit, 42, -1, [10963]), initValues(_3C_classLit, 42, -1, [8827]), initValues(_3C_classLit, 42, -1, [10936]), initValues(_3C_classLit, 42, -1, [8829]), initValues(_3C_classLit, 42, -1, [10928]), initValues(_3C_classLit, 42, -1, [10938]), initValues(_3C_classLit, 42, -1, [10934]), initValues(_3C_classLit, 42, -1, [8937]), initValues(_3C_classLit, 42, -1, [8831]), initValues(_3C_classLit, 42, -1, [8721]), initValues(_3C_classLit, 42, -1, [9834]), initValues(_3C_classLit, 42, -1, [185]), initValues(_3C_classLit, 42, -1, [185]), initValues(_3C_classLit, 42, -1, [178]), initValues(_3C_classLit, 42, -1, [178]), initValues(_3C_classLit, 42, -1, [179]), initValues(_3C_classLit, 42, -1, [179]), initValues(_3C_classLit, 42, -1, [8835]), initValues(_3C_classLit, 42, -1, [10950]), initValues(_3C_classLit, 42, -1, [10942]), initValues(_3C_classLit, 42, -1, [10968]), initValues(_3C_classLit, 42, -1, [8839]), initValues(_3C_classLit, 42, -1, [10948]), initValues(_3C_classLit, 42, -1, [10967]), initValues(_3C_classLit, 42, -1, [10619]), initValues(_3C_classLit, 42, -1, [10946]), initValues(_3C_classLit, 42, -1, [10956]), initValues(_3C_classLit, 42, -1, [8843]), initValues(_3C_classLit, 42, -1, [10944]), initValues(_3C_classLit, 42, -1, [8835]), initValues(_3C_classLit, 42, -1, [8839]), initValues(_3C_classLit, 42, -1, [10950]), initValues(_3C_classLit, 42, -1, [8843]), initValues(_3C_classLit, 42, -1, [10956]), initValues(_3C_classLit, 42, -1, [10952]), initValues(_3C_classLit, 42, -1, [10964]), initValues(_3C_classLit, 42, -1, [10966]), initValues(_3C_classLit, 42, -1, [8665]), initValues(_3C_classLit, 42, -1, [10534]), initValues(_3C_classLit, 42, -1, [8601]), initValues(_3C_classLit, 42, -1, [8601]), initValues(_3C_classLit, 42, -1, [10538]), initValues(_3C_classLit, 42, -1, [223]), initValues(_3C_classLit, 42, -1, [223]), initValues(_3C_classLit, 42, -1, [8982]), initValues(_3C_classLit, 42, -1, [964]), initValues(_3C_classLit, 42, -1, [9140]), initValues(_3C_classLit, 42, -1, [357]), initValues(_3C_classLit, 42, -1, [355]), initValues(_3C_classLit, 42, -1, [1090]), initValues(_3C_classLit, 42, -1, [8411]), initValues(_3C_classLit, 42, -1, [8981]), initValues(_3C_classLit, 42, -1, [55349, 56625]), initValues(_3C_classLit, 42, -1, [8756]), initValues(_3C_classLit, 42, -1, [8756]), initValues(_3C_classLit, 42, -1, [952]), initValues(_3C_classLit, 42, -1, [977]), initValues(_3C_classLit, 42, -1, [977]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [8764]), initValues(_3C_classLit, 42, -1, [8201]), initValues(_3C_classLit, 42, -1, [8776]), initValues(_3C_classLit, 42, -1, [8764]), initValues(_3C_classLit, 42, -1, [254]), initValues(_3C_classLit, 42, -1, [254]), initValues(_3C_classLit, 42, -1, [732]), initValues(_3C_classLit, 42, -1, [215]), initValues(_3C_classLit, 42, -1, [215]), initValues(_3C_classLit, 42, -1, [8864]), initValues(_3C_classLit, 42, -1, [10801]), initValues(_3C_classLit, 42, -1, [10800]), initValues(_3C_classLit, 42, -1, [8749]), initValues(_3C_classLit, 42, -1, [10536]), initValues(_3C_classLit, 42, -1, [8868]), initValues(_3C_classLit, 42, -1, [9014]), initValues(_3C_classLit, 42, -1, [10993]), initValues(_3C_classLit, 42, -1, [55349, 56677]), initValues(_3C_classLit, 42, -1, [10970]), initValues(_3C_classLit, 42, -1, [10537]), initValues(_3C_classLit, 42, -1, [8244]), initValues(_3C_classLit, 42, -1, [8482]), initValues(_3C_classLit, 42, -1, [9653]), initValues(_3C_classLit, 42, -1, [9663]), initValues(_3C_classLit, 42, -1, [9667]), initValues(_3C_classLit, 42, -1, [8884]), initValues(_3C_classLit, 42, -1, [8796]), initValues(_3C_classLit, 42, -1, [9657]), initValues(_3C_classLit, 42, -1, [8885]), initValues(_3C_classLit, 42, -1, [9708]), initValues(_3C_classLit, 42, -1, [8796]), initValues(_3C_classLit, 42, -1, [10810]), initValues(_3C_classLit, 42, -1, [10809]), initValues(_3C_classLit, 42, -1, [10701]), initValues(_3C_classLit, 42, -1, [10811]), initValues(_3C_classLit, 42, -1, [9186]), initValues(_3C_classLit, 42, -1, [55349, 56521]), initValues(_3C_classLit, 42, -1, [1094]), initValues(_3C_classLit, 42, -1, [1115]), initValues(_3C_classLit, 42, -1, [359]), initValues(_3C_classLit, 42, -1, [8812]), initValues(_3C_classLit, 42, -1, [8606]), initValues(_3C_classLit, 42, -1, [8608]), initValues(_3C_classLit, 42, -1, [8657]), initValues(_3C_classLit, 42, -1, [10595]), initValues(_3C_classLit, 42, -1, [250]), initValues(_3C_classLit, 42, -1, [250]), initValues(_3C_classLit, 42, -1, [8593]), initValues(_3C_classLit, 42, -1, [1118]), initValues(_3C_classLit, 42, -1, [365]), initValues(_3C_classLit, 42, -1, [251]), initValues(_3C_classLit, 42, -1, [251]), initValues(_3C_classLit, 42, -1, [1091]), initValues(_3C_classLit, 42, -1, [8645]), initValues(_3C_classLit, 42, -1, [369]), initValues(_3C_classLit, 42, -1, [10606]), initValues(_3C_classLit, 42, -1, [10622]), initValues(_3C_classLit, 42, -1, [55349, 56626]), initValues(_3C_classLit, 42, -1, [249]), initValues(_3C_classLit, 42, -1, [249]), initValues(_3C_classLit, 42, -1, [8639]), initValues(_3C_classLit, 42, -1, [8638]), initValues(_3C_classLit, 42, -1, [9600]), initValues(_3C_classLit, 42, -1, [8988]), initValues(_3C_classLit, 42, -1, [8988]), initValues(_3C_classLit, 42, -1, [8975]), initValues(_3C_classLit, 42, -1, [9720]), initValues(_3C_classLit, 42, -1, [363]), initValues(_3C_classLit, 42, -1, [168]), initValues(_3C_classLit, 42, -1, [168]), initValues(_3C_classLit, 42, -1, [371]), initValues(_3C_classLit, 42, -1, [55349, 56678]), initValues(_3C_classLit, 42, -1, [8593]), initValues(_3C_classLit, 42, -1, [8597]), initValues(_3C_classLit, 42, -1, [8639]), initValues(_3C_classLit, 42, -1, [8638]), initValues(_3C_classLit, 42, -1, [8846]), initValues(_3C_classLit, 42, -1, [965]), initValues(_3C_classLit, 42, -1, [978]), initValues(_3C_classLit, 42, -1, [965]), initValues(_3C_classLit, 42, -1, [8648]), initValues(_3C_classLit, 42, -1, [8989]), initValues(_3C_classLit, 42, -1, [8989]), initValues(_3C_classLit, 42, -1, [8974]), initValues(_3C_classLit, 42, -1, [367]), initValues(_3C_classLit, 42, -1, [9721]), initValues(_3C_classLit, 42, -1, [55349, 56522]), initValues(_3C_classLit, 42, -1, [8944]), initValues(_3C_classLit, 42, -1, [361]), initValues(_3C_classLit, 42, -1, [9653]), initValues(_3C_classLit, 42, -1, [9652]), initValues(_3C_classLit, 42, -1, [8648]), initValues(_3C_classLit, 42, -1, [252]), initValues(_3C_classLit, 42, -1, [252]), initValues(_3C_classLit, 42, -1, [10663]), initValues(_3C_classLit, 42, -1, [8661]), initValues(_3C_classLit, 42, -1, [10984]), initValues(_3C_classLit, 42, -1, [10985]), initValues(_3C_classLit, 42, -1, [8872]), initValues(_3C_classLit, 42, -1, [10652]), initValues(_3C_classLit, 42, -1, [949]), initValues(_3C_classLit, 42, -1, [1008]), initValues(_3C_classLit, 42, -1, [8709]), initValues(_3C_classLit, 42, -1, [966]), initValues(_3C_classLit, 42, -1, [982]), initValues(_3C_classLit, 42, -1, [8733]), initValues(_3C_classLit, 42, -1, [8597]), initValues(_3C_classLit, 42, -1, [1009]), initValues(_3C_classLit, 42, -1, [962]), initValues(_3C_classLit, 42, -1, [977]), initValues(_3C_classLit, 42, -1, [8882]), initValues(_3C_classLit, 42, -1, [8883]), initValues(_3C_classLit, 42, -1, [1074]), initValues(_3C_classLit, 42, -1, [8866]), initValues(_3C_classLit, 42, -1, [8744]), initValues(_3C_classLit, 42, -1, [8891]), initValues(_3C_classLit, 42, -1, [8794]), initValues(_3C_classLit, 42, -1, [8942]), initValues(_3C_classLit, 42, -1, [124]), initValues(_3C_classLit, 42, -1, [124]), initValues(_3C_classLit, 42, -1, [55349, 56627]), initValues(_3C_classLit, 42, -1, [8882]), initValues(_3C_classLit, 42, -1, [55349, 56679]), initValues(_3C_classLit, 42, -1, [8733]), initValues(_3C_classLit, 42, -1, [8883]), initValues(_3C_classLit, 42, -1, [55349, 56523]), initValues(_3C_classLit, 42, -1, [10650]), initValues(_3C_classLit, 42, -1, [373]), initValues(_3C_classLit, 42, -1, [10847]), initValues(_3C_classLit, 42, -1, [8743]), initValues(_3C_classLit, 42, -1, [8793]), initValues(_3C_classLit, 42, -1, [8472]), initValues(_3C_classLit, 42, -1, [55349, 56628]), initValues(_3C_classLit, 42, -1, [55349, 56680]), initValues(_3C_classLit, 42, -1, [8472]), initValues(_3C_classLit, 42, -1, [8768]), initValues(_3C_classLit, 42, -1, [8768]), initValues(_3C_classLit, 42, -1, [55349, 56524]), initValues(_3C_classLit, 42, -1, [8898]), initValues(_3C_classLit, 42, -1, [9711]), initValues(_3C_classLit, 42, -1, [8899]), initValues(_3C_classLit, 42, -1, [9661]), initValues(_3C_classLit, 42, -1, [55349, 56629]), initValues(_3C_classLit, 42, -1, [10234]), initValues(_3C_classLit, 42, -1, [10231]), initValues(_3C_classLit, 42, -1, [958]), initValues(_3C_classLit, 42, -1, [10232]), initValues(_3C_classLit, 42, -1, [10229]), initValues(_3C_classLit, 42, -1, [10236]), initValues(_3C_classLit, 42, -1, [8955]), initValues(_3C_classLit, 42, -1, [10752]), initValues(_3C_classLit, 42, -1, [55349, 56681]), initValues(_3C_classLit, 42, -1, [10753]), initValues(_3C_classLit, 42, -1, [10754]), initValues(_3C_classLit, 42, -1, [10233]), initValues(_3C_classLit, 42, -1, [10230]), initValues(_3C_classLit, 42, -1, [55349, 56525]), initValues(_3C_classLit, 42, -1, [10758]), initValues(_3C_classLit, 42, -1, [10756]), initValues(_3C_classLit, 42, -1, [9651]), initValues(_3C_classLit, 42, -1, [8897]), initValues(_3C_classLit, 42, -1, [8896]), initValues(_3C_classLit, 42, -1, [253]), initValues(_3C_classLit, 42, -1, [253]), initValues(_3C_classLit, 42, -1, [1103]), initValues(_3C_classLit, 42, -1, [375]), initValues(_3C_classLit, 42, -1, [1099]), initValues(_3C_classLit, 42, -1, [165]), initValues(_3C_classLit, 42, -1, [165]), initValues(_3C_classLit, 42, -1, [55349, 56630]), initValues(_3C_classLit, 42, -1, [1111]), initValues(_3C_classLit, 42, -1, [55349, 56682]), initValues(_3C_classLit, 42, -1, [55349, 56526]), initValues(_3C_classLit, 42, -1, [1102]), initValues(_3C_classLit, 42, -1, [255]), initValues(_3C_classLit, 42, -1, [255]), initValues(_3C_classLit, 42, -1, [378]), initValues(_3C_classLit, 42, -1, [382]), initValues(_3C_classLit, 42, -1, [1079]), initValues(_3C_classLit, 42, -1, [380]), initValues(_3C_classLit, 42, -1, [8488]), initValues(_3C_classLit, 42, -1, [950]), initValues(_3C_classLit, 42, -1, [55349, 56631]), initValues(_3C_classLit, 42, -1, [1078]), initValues(_3C_classLit, 42, -1, [8669]), initValues(_3C_classLit, 42, -1, [55349, 56683]), initValues(_3C_classLit, 42, -1, [55349, 56527]), initValues(_3C_classLit, 42, -1, [8205]), initValues(_3C_classLit, 42, -1, [8204])]);
  WINDOWS_1252 = initValues(_3_3C_classLit, 52, 12, [initValues(_3C_classLit, 42, -1, [8364]), initValues(_3C_classLit, 42, -1, [65533]), initValues(_3C_classLit, 42, -1, [8218]), initValues(_3C_classLit, 42, -1, [402]), initValues(_3C_classLit, 42, -1, [8222]), initValues(_3C_classLit, 42, -1, [8230]), initValues(_3C_classLit, 42, -1, [8224]), initValues(_3C_classLit, 42, -1, [8225]), initValues(_3C_classLit, 42, -1, [710]), initValues(_3C_classLit, 42, -1, [8240]), initValues(_3C_classLit, 42, -1, [352]), initValues(_3C_classLit, 42, -1, [8249]), initValues(_3C_classLit, 42, -1, [338]), initValues(_3C_classLit, 42, -1, [65533]), initValues(_3C_classLit, 42, -1, [381]), initValues(_3C_classLit, 42, -1, [65533]), initValues(_3C_classLit, 42, -1, [65533]), initValues(_3C_classLit, 42, -1, [8216]), initValues(_3C_classLit, 42, -1, [8217]), initValues(_3C_classLit, 42, -1, [8220]), initValues(_3C_classLit, 42, -1, [8221]), initValues(_3C_classLit, 42, -1, [8226]), initValues(_3C_classLit, 42, -1, [8211]), initValues(_3C_classLit, 42, -1, [8212]), initValues(_3C_classLit, 42, -1, [732]), initValues(_3C_classLit, 42, -1, [8482]), initValues(_3C_classLit, 42, -1, [353]), initValues(_3C_classLit, 42, -1, [8250]), initValues(_3C_classLit, 42, -1, [339]), initValues(_3C_classLit, 42, -1, [65533]), initValues(_3C_classLit, 42, -1, [382]), initValues(_3C_classLit, 42, -1, [376])]);
}

var NAMES, VALUES_0, WINDOWS_1252;
function localEqualsBuffer(local, buf, offset, length){
  var i;
  if (local.length != length) {
    return false;
  }
  for (i = 0; i < length; ++i) {
    if (local.charCodeAt(i) != buf[offset + i]) {
      return false;
    }
  }
  return true;
}

function lowerCaseLiteralEqualsIgnoreAsciiCaseString(lowerCaseLiteral, string){
  var c0, c1, i;
  if (string == null) {
    return false;
  }
  if (lowerCaseLiteral.length != string.length) {
    return false;
  }
  for (i = 0; i < lowerCaseLiteral.length; ++i) {
    c0 = lowerCaseLiteral.charCodeAt(i);
    c1 = string.charCodeAt(i);
    if (c1 >= 65 && c1 <= 90) {
      c1 += 32;
    }
    if (c0 != c1) {
      return false;
    }
  }
  return true;
}

function lowerCaseLiteralIsPrefixOfIgnoreAsciiCaseString(lowerCaseLiteral, string){
  var c0, c1, i;
  if (string == null) {
    return false;
  }
  if (lowerCaseLiteral.length > string.length) {
    return false;
  }
  for (i = 0; i < lowerCaseLiteral.length; ++i) {
    c0 = lowerCaseLiteral.charCodeAt(i);
    c1 = string.charCodeAt(i);
    if (c1 >= 65 && c1 <= 90) {
      c1 += 32;
    }
    if (c0 != c1) {
      return false;
    }
  }
  return true;
}

function $StackNode(this$static, group, ns, name, node, scoping, special, fosterParenting, popName, attributes){
  this$static.group = group;
  this$static.name_0 = name;
  this$static.popName = popName;
  this$static.ns = ns;
  this$static.node = node;
  this$static.scoping = scoping;
  this$static.special = special;
  this$static.fosterParenting = fosterParenting;
  this$static.attributes = attributes;
  this$static.refcount = 1;
  return this$static;
}

function $StackNode_0(this$static, ns, elementName, node){
  this$static.group = elementName.group;
  this$static.name_0 = elementName.name_0;
  this$static.popName = elementName.name_0;
  this$static.ns = ns;
  this$static.node = node;
  this$static.scoping = elementName.scoping;
  this$static.special = elementName.special;
  this$static.fosterParenting = elementName.fosterParenting;
  this$static.attributes = null;
  this$static.refcount = 1;
  return this$static;
}

function $StackNode_3(this$static, ns, elementName, node, attributes){
  this$static.group = elementName.group;
  this$static.name_0 = elementName.name_0;
  this$static.popName = elementName.name_0;
  this$static.ns = ns;
  this$static.node = node;
  this$static.scoping = elementName.scoping;
  this$static.special = elementName.special;
  this$static.fosterParenting = elementName.fosterParenting;
  this$static.attributes = attributes;
  this$static.refcount = 1;
  return this$static;
}

function $StackNode_1(this$static, ns, elementName, node, popName){
  this$static.group = elementName.group;
  this$static.name_0 = elementName.name_0;
  this$static.popName = popName;
  this$static.ns = ns;
  this$static.node = node;
  this$static.scoping = elementName.scoping;
  this$static.special = elementName.special;
  this$static.fosterParenting = elementName.fosterParenting;
  this$static.attributes = null;
  this$static.refcount = 1;
  return this$static;
}

function $StackNode_2(this$static, ns, elementName, node, popName, scoping){
  this$static.group = elementName.group;
  this$static.name_0 = elementName.name_0;
  this$static.popName = popName;
  this$static.ns = ns;
  this$static.node = node;
  this$static.scoping = scoping;
  this$static.special = false;
  this$static.fosterParenting = false;
  this$static.attributes = null;
  this$static.refcount = 1;
  return this$static;
}

function getClass_55(){
  return Lnu_validator_htmlparser_impl_StackNode_2_classLit;
}

function toString_11(){
  return this.name_0;
}

function StackNode(){
}

_ = StackNode.prototype = new Object_0();
_.getClass$ = getClass_55;
_.toString$ = toString_11;
_.typeId$ = 38;
_.attributes = null;
_.fosterParenting = false;
_.group = 0;
_.name_0 = null;
_.node = null;
_.ns = null;
_.popName = null;
_.refcount = 1;
_.scoping = false;
_.special = false;
function $UTF16Buffer(this$static, buffer, start, end){
  this$static.buffer = buffer;
  this$static.start = start;
  this$static.end = end;
  return this$static;
}

function $adjust(this$static, lastWasCR){
  if (lastWasCR && this$static.buffer[this$static.start] == 10) {
    ++this$static.start;
  }
}

function getClass_58(){
  return Lnu_validator_htmlparser_impl_UTF16Buffer_2_classLit;
}

function UTF16Buffer(){
}

_ = UTF16Buffer.prototype = new Object_0();
_.getClass$ = getClass_58;
_.typeId$ = 39;
_.buffer = null;
_.end = 0;
_.start = 0;
function $SAXException(this$static, message){
  this$static.detailMessage = message;
  this$static.exception = null;
  return this$static;
}

function $getMessage(this$static){
  var message;
  message = this$static.detailMessage;
  if (message == null && !!this$static.exception) {
    return this$static.exception.detailMessage;
  }
   else {
    return message;
  }
}

function getClass_59(){
  return Lorg_xml_sax_SAXException_2_classLit;
}

function getMessage_0(){
  return $getMessage(this);
}

function toString_12(){
  if (this.exception) {
    return $toString_1(this.exception);
  }
   else {
    return $toString_1(this);
  }
}

function SAXException(){
}

_ = SAXException.prototype = new Exception();
_.getClass$ = getClass_59;
_.getMessage = getMessage_0;
_.toString$ = toString_12;
_.typeId$ = 40;
_.exception = null;
function $SAXParseException(this$static, message, locator){
  this$static.detailMessage = message;
  this$static.exception = null;
  if (locator) {
    $getLineNumber(locator);
    $getColumnNumber(locator);
  }
   else {
  }
  return this$static;
}

function $SAXParseException_0(this$static, message, locator, e){
  this$static.detailMessage = message;
  this$static.exception = e;
  if (locator) {
    $getLineNumber(locator);
    $getColumnNumber(locator);
  }
   else {
  }
  return this$static;
}

function getClass_60(){
  return Lorg_xml_sax_SAXParseException_2_classLit;
}

function SAXParseException(){
}

_ = SAXParseException.prototype = new SAXException();
_.getClass$ = getClass_60;
_.typeId$ = 41;
function init_0(){
  !!$stats && $stats({moduleName:$moduleName, subSystem:'startup', evtGroup:'moduleStartup', millis:(new Date()).getTime(), type:'onModuleLoadStart', className:'nu.validator.htmlparser.gwt.HtmlParserModule'});
  $wnd.parseHtmlDocument = parseHtmlDocument;
}

function gwtOnLoad(errFn, modName, modBase){
  $moduleName = modName;
  $moduleBase = modBase;
  if (errFn)
    try {
      init_0();
    }
     catch (e) {
      errFn(modName);
    }
   else {
    init_0();
  }
}

function nullMethod(){
}

var Ljava_lang_Object_2_classLit = createForClass('java.lang.', 'Object'), Lcom_google_gwt_user_client_Timer_2_classLit = createForClass('com.google.gwt.user.client.', 'Timer'), Ljava_lang_Throwable_2_classLit = createForClass('java.lang.', 'Throwable'), Ljava_lang_Exception_2_classLit = createForClass('java.lang.', 'Exception'), Ljava_lang_RuntimeException_2_classLit = createForClass('java.lang.', 'RuntimeException'), Lcom_google_gwt_core_client_JavaScriptException_2_classLit = createForClass('com.google.gwt.core.client.', 'JavaScriptException'), Lcom_google_gwt_core_client_JavaScriptObject_2_classLit = createForClass('com.google.gwt.core.client.', 'JavaScriptObject$'), _3Ljava_lang_String_2_classLit = createForArray('[Ljava.lang.', 'String;'), Ljava_lang_Enum_2_classLit = createForClass('java.lang.', 'Enum'), _3_3D_classLit = createForArray('', '[[D'), Ljava_util_AbstractCollection_2_classLit = createForClass('java.util.', 'AbstractCollection'), Ljava_util_AbstractList_2_classLit = createForClass('java.util.', 'AbstractList'), Ljava_util_ArrayList_2_classLit = createForClass('java.util.', 'ArrayList'), Lcom_google_gwt_user_client_Timer$1_2_classLit = createForClass('com.google.gwt.user.client.', 'Timer$1'), Ljava_lang_IndexOutOfBoundsException_2_classLit = createForClass('java.lang.', 'IndexOutOfBoundsException'), Ljava_lang_ArrayStoreException_2_classLit = createForClass('java.lang.', 'ArrayStoreException'), _3C_classLit = createForArray('', '[C'), Ljava_lang_Class_2_classLit = createForClass('java.lang.', 'Class'), Ljava_lang_ClassCastException_2_classLit = createForClass('java.lang.', 'ClassCastException'), Ljava_lang_IllegalArgumentException_2_classLit = createForClass('java.lang.', 'IllegalArgumentException'), _3I_classLit = createForArray('', '[I'), Ljava_lang_NullPointerException_2_classLit = createForClass('java.lang.', 'NullPointerException'), Ljava_lang_String_2_classLit = createForClass('java.lang.', 'String'), Ljava_lang_StringBuffer_2_classLit = createForClass('java.lang.', 'StringBuffer'), Ljava_lang_StringBuilder_2_classLit = createForClass('java.lang.', 'StringBuilder'), Ljava_lang_StringIndexOutOfBoundsException_2_classLit = createForClass('java.lang.', 'StringIndexOutOfBoundsException'), Ljava_lang_UnsupportedOperationException_2_classLit = createForClass('java.lang.', 'UnsupportedOperationException'), _3Ljava_lang_Object_2_classLit = createForArray('[Ljava.lang.', 'Object;'), Ljava_util_AbstractMap_2_classLit = createForClass('java.util.', 'AbstractMap'), Ljava_util_AbstractHashMap_2_classLit = createForClass('java.util.', 'AbstractHashMap'), Ljava_util_AbstractSet_2_classLit = createForClass('java.util.', 'AbstractSet'), Ljava_util_AbstractHashMap$EntrySet_2_classLit = createForClass('java.util.', 'AbstractHashMap$EntrySet'), Ljava_util_AbstractHashMap$EntrySetIterator_2_classLit = createForClass('java.util.', 'AbstractHashMap$EntrySetIterator'), Ljava_util_AbstractMapEntry_2_classLit = createForClass('java.util.', 'AbstractMapEntry'), Ljava_util_AbstractHashMap$MapEntryNull_2_classLit = createForClass('java.util.', 'AbstractHashMap$MapEntryNull'), Ljava_util_AbstractHashMap$MapEntryString_2_classLit = createForClass('java.util.', 'AbstractHashMap$MapEntryString'), Ljava_util_AbstractList$IteratorImpl_2_classLit = createForClass('java.util.', 'AbstractList$IteratorImpl'), Ljava_util_AbstractList$ListIteratorImpl_2_classLit = createForClass('java.util.', 'AbstractList$ListIteratorImpl'), Ljava_util_AbstractSequentialList_2_classLit = createForClass('java.util.', 'AbstractSequentialList'), Ljava_util_Comparators$1_2_classLit = createForClass('java.util.', 'Comparators$1'), Ljava_util_HashMap_2_classLit = createForClass('java.util.', 'HashMap'), Ljava_util_LinkedList_2_classLit = createForClass('java.util.', 'LinkedList'), Ljava_util_LinkedList$ListIteratorImpl_2_classLit = createForClass('java.util.', 'LinkedList$ListIteratorImpl'), Ljava_util_LinkedList$Node_2_classLit = createForClass('java.util.', 'LinkedList$Node'), Ljava_util_NoSuchElementException_2_classLit = createForClass('java.util.', 'NoSuchElementException'), Lnu_validator_htmlparser_common_DoctypeExpectation_2_classLit = createForEnum('nu.validator.htmlparser.common.', 'DoctypeExpectation'), Lnu_validator_htmlparser_common_DocumentMode_2_classLit = createForEnum('nu.validator.htmlparser.common.', 'DocumentMode'), Lnu_validator_htmlparser_common_XmlViolationPolicy_2_classLit = createForEnum('nu.validator.htmlparser.common.', 'XmlViolationPolicy'), Lnu_validator_htmlparser_impl_TreeBuilder_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'TreeBuilder'), Lnu_validator_htmlparser_impl_CoalescingTreeBuilder_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'CoalescingTreeBuilder'), Lnu_validator_htmlparser_gwt_BrowserTreeBuilder_2_classLit = createForClass('nu.validator.htmlparser.gwt.', 'BrowserTreeBuilder'), Lnu_validator_htmlparser_gwt_BrowserTreeBuilder$ScriptHolder_2_classLit = createForClass('nu.validator.htmlparser.gwt.', 'BrowserTreeBuilder$ScriptHolder'), Lnu_validator_htmlparser_gwt_HtmlParser_2_classLit = createForClass('nu.validator.htmlparser.gwt.', 'HtmlParser'), Lnu_validator_htmlparser_gwt_HtmlParser$1_2_classLit = createForClass('nu.validator.htmlparser.gwt.', 'HtmlParser$1'), Lnu_validator_htmlparser_gwt_ParseEndListener_2_classLit = createForClass('nu.validator.htmlparser.gwt.', 'ParseEndListener'), _3Z_classLit = createForArray('', '[Z'), _3Lnu_validator_htmlparser_impl_AttributeName_2_classLit = createForArray('[Lnu.validator.htmlparser.impl.', 'AttributeName;'), Lnu_validator_htmlparser_impl_AttributeName_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'AttributeName'), _3Lnu_validator_htmlparser_impl_ElementName_2_classLit = createForArray('[Lnu.validator.htmlparser.impl.', 'ElementName;'), Lnu_validator_htmlparser_impl_ElementName_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'ElementName'), Lnu_validator_htmlparser_impl_Tokenizer_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'Tokenizer'), Lnu_validator_htmlparser_impl_ErrorReportingTokenizer_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'ErrorReportingTokenizer'), Lnu_validator_htmlparser_impl_HtmlAttributes_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'HtmlAttributes'), Lnu_validator_htmlparser_impl_LocatorImpl_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'LocatorImpl'), _3_3C_classLit = createForArray('', '[[C'), Lnu_validator_htmlparser_impl_StackNode_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'StackNode'), _3Lnu_validator_htmlparser_impl_StackNode_2_classLit = createForArray('[Lnu.validator.htmlparser.impl.', 'StackNode;'), Lnu_validator_htmlparser_impl_UTF16Buffer_2_classLit = createForClass('nu.validator.htmlparser.impl.', 'UTF16Buffer'), Lorg_xml_sax_SAXException_2_classLit = createForClass('org.xml.sax.', 'SAXException'), Lorg_xml_sax_SAXParseException_2_classLit = createForClass('org.xml.sax.', 'SAXParseException');
if (nu_validator_htmlparser_HtmlParser) {  var __gwt_initHandlers = nu_validator_htmlparser_HtmlParser.__gwt_initHandlers;  nu_validator_htmlparser_HtmlParser.onScriptLoad(gwtOnLoad);}})();/**
 * @author thatcher
 */

Html5Parser();

})($w,$document);
// faux-intro ...
// (function(){
//   (function(){
//     function(){

      // User accesible interface ...
      var Envjs = $w.Envjs = $env.Envjs = function(){
        if(arguments.length === 2){
          for ( var i in arguments[1] ) {
    	    var g = arguments[1].__lookupGetter__(i), 
            s = arguments[1].__lookupSetter__(i);
    	    if ( g || s ) {
    	      if ( g ) $env.__defineGetter__(i, g);
    	      if ( s ) $env.__defineSetter__(i, s);
    	    } else
    	      $env[i] = arguments[1][i];
          }
        }
        if (arguments[0] != null && arguments[0] != "")
          window.location = arguments[0];
      };
      Envjs.$env = $env;
      Envjs.wait = $env.wait;
      Envjs.interpreter = window.whichInterpreter;
      Envjs.evaluate = $env.$master.evaluate;
  
      // $w.__loadAWindowsDocument__(options.url || "about:blank");
      $env.load(options.url || "about:blank");
    };

    return $env;

  })(); // close function definition begun in 'intro.js'

  // Initial window setup
  $env.init.call(this);

})();

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// mode:auto-revert
// End:

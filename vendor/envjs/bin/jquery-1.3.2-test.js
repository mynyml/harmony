//debugger;
load("build/runtest/env.js");

(function(Envjs){
    var $env = Envjs.$env;

    Envjs("test/index.html", {
        //let it load the script from the html
		logLevel: $env.INFO,
        scriptTypes: {
            "text/javascript"   :true
        },
        afterScriptLoad:{
            'qunit/testrunner.js': function(){
                //hook into qunit.log
                var count = 0;
                QUnit.log = function(result, message){
                    $env.log('(' + (count++) + ')[' + 
                        ((!!result) ? 'PASS' : 'FAIL') + '] ' + message);
                };
                //hook into qunit.done
                QUnit.done = function(pass, fail){
                    $env.warn('Writing Results to File');
                    jQuery('script').each(function(){
                        this.type = 'text/envjs';
                    });
                    $env.writeToFile(
                        document.documentElement.xml, 
                        $env.location('jqenv-'+Date.now()+'.html')
                    );
                };
                
                //allow jquery to run ajax
                isLocal = false;
                
                
                var unsafeStop = stop,
                    unsafeStart = start,
                    isStopped = null;

                var config_timeout;
                stop = function(timeout){
                    if(isStopped === null || isStopped === false){
                        $env.log('PAUSING QUNIT');
                        isStopped = true;
                        unsafeStop.call(this);
                        timeout = ( timeout && timeout > 0 ) ? timeout : 10000;
	                if (timeout)
	                  config_timeout = setTimeout(function() {
        			    QUnit.ok( false, "Test timed out" );
        			    start();
        		      }, timeout);
                      /* $env.wait() */
                    }
                };
                start = function(){
                    if(isStopped === null || isStopped === true ){
                        $env.log('RESTARTING QUNIT');
                        isStopped = false;
                        if(config_timeout) {
                          clearTimeout(config_timeout);
                          config_timeout = undefined;
                        }
                        unsafeStart.call(this);
                    }
                };
                //we know some ajax calls will fail becuase
                //we are not running against a running server
                //for php files
                var handleError = jQuery.handleError;
                jQuery.handleError = function(){
                    ok(false, 'Ajax may have failed while running locally');
                    try{
                        handleError(arguments);
                    }catch(e){}
                    //allow tests to gracefully continue
                    start();
                };
                //allow unanticipated xhr error with no ajax.handleError 
                //callback (eg jQuery.getScript) to exit gracefully
                $env.onInterrupt = function(){
                    $env.info('thread interupt: gracefully continuing test');
                    start();
                };
                
               
                $env.onScriptLoadError = function(script){
                    Envjs.error("failed to load script \n"+script.text);    
                    ok(false, 'Ajax may have failed to load correct script while running locally');
                    //allow tests to gracefully continue
                    start();
                };
            }
        }
    });
    
})(Envjs);

Envjs.wait();

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// tab-width:4
// mode:auto-revert
// End:

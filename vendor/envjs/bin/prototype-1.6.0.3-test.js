//debugger;
load("env.js");

(function($env){
    
    
    $env("array_test.html", {
        //let it load the script from the html
        scriptTypes: {
            "text/javascript"   :true
        },
        afterload:{
            'lib_assets/unittest.js': function(){
                 //hook into some messaging
                 var assertBlock = Test.Unit.Assertions.assertBlock;
                 Test.Unit.Assertions.assertBlock = function(){
                    $env.log(arguments[0]);
                    return assertBlock(arguments);
                 };
                 Test.Unit.Logger.prototype.initialize = function(id) {
                     this.id = id;
                     $env.debug(' ['+this.id+'] initialized');
                 };
                  
                 Test.Unit.Logger.prototype.start = function(testName) {
                     this.currentTest = testName;
                     $env.debug(' ['+this.id+'] starting test ('+this.currentTest+')');
                 };
                  
                  
                 Test.Unit.Logger.prototype.setStatus = function(status) {
                     $env.log(' ['+this.id+'] ('+this.currentTest+') '+status);
                 };
                  
                 Test.Unit.Logger.prototype.finish = function(status, summary) {
                     $env.log(' ['+this.id+'] ('+this.currentTest+
                         ') '+status+' '+summary.replace(/\n/g,"\t"));
                 };
                  
            }
        }
    });
    $env.writeToFile(
        document.documentElement.xml, 
        $env.location('jqenv-array_test-'+Date.now()+'.html')
    );
    
    $env("base_test.html", {
        //let it load the script from the html
        scriptTypes: {
            "text/javascript"   :true
        }
    });
    $env.writeToFile(
        document.documentElement.xml, 
        $env.location('jqenv-base_test-'+Date.now()+'.html')
    );
    
    
    $env("class_test.html", {
        //let it load the script from the html
        scriptTypes: {
            "text/javascript"   :true
        }
    });
    $env.writeToFile(
        document.documentElement.xml, 
        $env.location('jqenv-class_test-'+Date.now()+'.html')
    );
    
    $env("date_test.html", {
        //let it load the script from the html
        scriptTypes: {
            "text/javascript"   :true
        }
    });
    $env.writeToFile(
        document.documentElement.xml, 
        $env.location('jqenv-date_test-'+Date.now()+'.html')
    );
    
})(Envjs);

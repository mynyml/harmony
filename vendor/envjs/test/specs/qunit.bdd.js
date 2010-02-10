
(function(Q){

    Q.Spec = function(name){
        this.before = false;
        this.after = false;
        this.assigns = {};
        this.name = name;
        Q.module(name);
    };
    Q.Spec.reminders = {};
    
    
    // RSpec style describe
    // takes an arbitrary number of arguments that are contactenated as strings
    // the last argument is the configuration object
    // which can have before: after: callbacks
    function describe(){
        var args = [].splice.call(arguments, 0);
        // configuration function
        var bddconfig = (args[args.length - 1].constructor == Object) ? args.pop() : {};
        var spec = new Q.Spec(args.join(' '));
        spec.before = bddconfig['before'] || bddconfig['setup'];
        spec.after = bddconfig['after'] || bddconfig['teardown'];
        return spec;
    };
    
    
    
    
    // RSpec style test definition
    Q.Spec.prototype.it = function(name, callback ){
        var spec = this;
        if (spec.before) 
            spec.before.apply(spec.assigns);
        Q.test(spec.name+" : "+name, function(){
            callback.apply(spec);
        });
        if (spec.after) 
            spec.after.apply(spec.assigns);
        return spec;
    };
    
    // Shoulda style test definition
    Q.Spec.prototype.should = function(name, callback){
        name = 'should ' + name;
        return this.it.apply(this, [name, callback]);
    };
    
    Q.Spec.prototype.pending = function(name, callback, nowait){
        name = '<span style="color: #EB8531;" class="pending">deferred: ' + name + '</span>';
        Q.test(name, function(){
            Q.ok(true,'behavior pending');
        });
        return this;
    };
    
    Q.Spec.prototype.should_eventually = function(name, callback, nowait){
        return this.pending(name, callback);
    };
    
    Q.Spec.prototype.a = function(key){
        if (typeof key == 'undefined') {
            return this.assigns;
        }
        else {
            return this.assigns[key];
        }
    };
    
    // aliases for describe
    Q.describe = describe;
    Q.context = describe;
    
    // asserts that the method is defined (like respond_to?)
    Q.defined = function(object, method){
        return Q.ok(typeof object[method] == 'function', method + 'is not defined on' + object);
    };
    
    // asserts that the object is of a certain type
    Q.isType = function(object, type){
        return Q.ok(object.constructor === type, object.toString() + ' is not of type ' + type + ', is ' + object.constructor);
    };
    
    // assert a string matches a regex
    Q.match = function(matcher, string, message){
        return Q.ok(string.match(matcher), message);
    };
    
    // assert that a matching error is raised
    // expected can be a regex, a string, or an object
    Q.raised = function(expected_error, callback){
        var error = '';
        try {
            callback.apply(this);
        } 
        catch (e) {
            error = e;
        }
        message = "Expected error to match " + expected_error + " but was " + error.toString();
        if (expected_error.constructor == RegExp) {
            return Q.match(expected_error, error.toString(), message);
        }
        else 
            if (expected_error.constructor == String) {
                return Q.equals(expected_error, error.toString(), message);
            }
            else {
                return Q.equals(expected_error, error, message);
            }
    };
    
    
    var log;
    try{
        if(Envjs)
            log = Envjs.log;
    }catch(e){
        try{
            log = console.log;
        }catch(e){
            log=function(){};
        }
        
    }
    var assertion_index = 0;
    
    var module_index = 0;
    var module;
    
    var test_index = 0;
    var test;
    
    Q._moduleStart  = Q.moduleStart;
    Q.moduleStart = function(m, te){
        Q._moduleStart.apply(this, arguments);
        module = m;
        module_index++;
    };
    
    Q._moduleDone  = Q.moduleDone;
    Q.moduleDone = function(t, f, tx){
        Q._moduleDone.apply(this, arguments);
        var s = module_index + ". module " + t + ": ";
        if (f) {
            s += f + " failure(s) in " + tx + " tests";
        }
        else {
            s += "all " + tx + " tests successful";
        }
        // print(s);
        module = undefined;
    };
    
    Q._testStart  = Q.testStart;
    Q.testStart = function(t){
        Q._testStart.apply(this, arguments);
        test = t;
        test_index++;
    };
    
    Q._testDone  = Q.testDone;
    Q.testDone = function(t){
        Q._testDone.apply(this, arguments);
        test = undefined;
    }
    
    Q._log  = Q.log;
    Q.log = function(r, m){
        Q._log.apply(this, arguments);
        assertion_index++;
        var test_string = "";
        if (module || test) {
            var test_string = "[";
            if (module) {
                test_string += module;
                if (test) {
                    test_string += ": ";
                }
            }
            if (test) {
                test_string += test;
            }
            test_string += "] ";
        }
        var s = (r ? "PASS (" : "FAIL (") + assertion_index + ") " + test_string + m;
        log(s);
    };
    
    Q._done  = Q.done;
    Q.done = function(f, t){
        Q._done.apply(this, arguments);
        log((t - f) + " Passed, " + f + " Failed, " + t + " Total Tests");
        try{
            if(Envjs){
                var scripts = document.getElementsByTagName('script');
                for(var i = 0;i<scripts.length;i++){
                    //prevents scripts from being re-run when
                    //we look at the results in the browser
                    scripts[i].type='text/envjs';
                }
                Envjs.writeToFile(document.xml, Envjs.location('results.html'));
            }
        }catch(e){
            log('failed to print results to file.\n'+e);
        }
    };
    
})(QUnit);


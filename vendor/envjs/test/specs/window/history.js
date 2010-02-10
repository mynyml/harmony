/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window History',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(8);
        ok(history === window.history, "history is window.history");
        ok(history.length,   'history.length');
        ok(history.back,     'history.back');
        ok(history.forward,  'history.forward');
        ok(history.go,       'history.go');
        ok(history.item,     'history.item');
        
        //these are generally secured properties of the history
        //object so we only check that the are defined since
        //trying to access them will throw an exception
        ok('current'  in history,  'history.current');
        ok('previous' in history,  'history.previous');
        
    });
    
})(QUnit);
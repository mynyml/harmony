/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Timer',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(4);
        ok(setTimeout,      'setTimeout');
        ok(setInterval,     'setInterval');
        ok(clearTimeout,    'clearTimeout');
        ok(clearInterval,   'clearInterval');
        
    });
    
})(QUnit);
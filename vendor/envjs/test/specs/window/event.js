/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Event',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(3);
        ok(addEventListener,    'addEventListener');
        ok(removeEventListener, 'removeEventListener');
        ok(dispatchEvent,       'dispatchEvent');
        
    })
    
})(QUnit);
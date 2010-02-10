/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Dialog',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(3);
        ok(alert,   'alert');
        ok(confirm, 'confirm');
        ok(prompt,  'prompt');
        
    });
    
})(QUnit);
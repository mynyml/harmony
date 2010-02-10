/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Document',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(1);
        ok(window.document === document, 'document is window.document');
        
    });
    
})(QUnit);
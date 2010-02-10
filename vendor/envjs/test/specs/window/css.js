/**
 * @author thatcher
 */
(function(Q){

    Q.describe('Window CSS',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(1);
        ok(window.getComputedStyle, 'window.getComputedStyle');
        
    });
    
})(QUnit);


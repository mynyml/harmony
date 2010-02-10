/**
 * @author thatcher
 */
(function(Q){

    Q.describe('TEMPLATE Spec',{
        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(1);
        ok(true, 'good job');
        
    }).should('do something else', function(){

        expect(1);
        ok(true, 'good job');
        
    }).pending('should do something new soon', function(){

        expect(1);
        ok(false, 'todo');
    });
    
})(QUnit);


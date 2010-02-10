/**
 * @author thatcher
 */
(function(Q){

    Q.describe('Window Screen',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(18);
        ok(screen === window.screen , 'screen is window screen');
        ok("top" in screen,          'top');
        ok(screen.height,       'height');
        ok(screen.width,        'width');
        ok("left" in screen,         'left');
        ok(screen.pixelDepth,   'pixelDepth');
        ok(screen.colorDepth,   'colorDepth');
        ok(screen.availWidth,   'availWidth');
        ok(screen.availHeight,  'availHeight');
        ok("availLeft" in screen,    'availLeft');
        ok(screen.availTop,     'availTop');
        
        //closely related function available at window
        ok(moveBy,              'moveBy');
        ok(moveTo,              'moveTo');
        ok(resizeBy,            'resizeBy');
        ok(resizeTo,            'resizeTo');
        ok(scroll,              'scroll');
        ok(scrollBy,            'scrollBy');
        ok(scrollTo,            'scrollTo');
        
    });
    
})(QUnit);


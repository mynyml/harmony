/**
 * @author thatcher
 */
var global_scope=this;

(function(Q){

    Q.describe('Window Basic Properties',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(19);
        ok(window,              'window');
        ok(self,                'self');
        ok(top,                 'top');
        ok(parent,              'parent');
        ok(window.toString(),   '[object Window]');
        
        //these values are usually the empty string ''
        //so we just verify the property is available
        ok('name' in window,            'name');
        ok('status' in window,          'status');
        ok('closed' in window,          'closed');
        ok('defaultStatus' in window,   'defaultStatus');
        ok('length' in window,          'length');
        ok('opener' in window,          'opener');
        
        ok(frames,              'frames');
        ok(open,                'open');
        ok(close,               'close');
        ok(innerHeight,         'innerHeight');
        ok(outerHeight,         'outerHeight');
        ok(outerWidth,          'outerWidth');
        ok(screenX,             'screenX');
        ok(screenY,             'screenY');

        
    }).should('have the expected values', function(){
        
        equals( window, global_scope,   'window is the global scope "this"');
        equals( window, self,           'self is an alias for window');
        equals( window, top,            'top is an alias for window when the window is not in a frame');

    });
    
})(QUnit);
/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Location',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide required w3c interfaces', function(){

        expect(12);
        ok(location === window.location, "location is window.location");
        ok('href' in location,      'location.href');
        ok('hash' in location,      'location.hash');
        ok('host' in location,      'location.host');
        ok('hostname' in location,  'location.hostname');
        ok('pathname' in location,  'location.pathname');
        ok('port' in location,      'location.port');
        ok('search' in location,    'location.search');
        ok(location.protocol,       'location.protocol');
        ok(location.reload,         'location.reload');
        ok(location.replace,        'location.replace');
        ok(location.assign,         'location.assign');
        
    });
    
})(QUnit);
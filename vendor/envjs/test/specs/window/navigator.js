/**
 * @author thatcher
 */

(function(Q){

    Q.describe('Window Navigator',{

        before:function(){
            //setup
        },
        after:function(){
            //tear down
        }    
        
    }).should('provide the required w3c interfaces', function(){

        expect(24);
        ok(navigator === window.navigator, 'navigator is window.navigator');
        ok(navigator.userAgent,         'userAgent');
        ok(navigator.appCodeName,       'appCodeName');
        ok(navigator.appName,           'appName');
        ok(navigator.appVersion,        'appVersion');
        ok(navigator.language,          'language');
        ok(navigator.mimeTypes,         'mimeTypes');
        ok(navigator.platform,          'platform');
        ok(navigator.oscpu,             'oscpu');
        ok(navigator.product,           'product');
        ok(navigator.productSub,        'productSub');
        ok(navigator.plugins,           'plugins');
        ok(navigator.cookieEnabled,     'cookieEnabled');
        ok(navigator.buildID,           'buildID');
        ok(navigator.javaEnabled,       'javaEnabled');
        ok(navigator.taintEnabled,      'taintEnabled');
        ok(navigator.preference,        'preference');
        ok(navigator.geolocation,       'geolocation');
        ok(navigator.registerContentHandler, 'registerContentHandler');
        ok(navigator.registerProtocolHandler, 'registerProtocolHandler');
        
        //several properties will throw a security exception if they 
        //are accessed, so we only check that they exist
        ok("vendor" in navigator,            'vendor');
        ok("vendorSub" in navigator,         'vendorSub');
        ok("securityPolicy" in navigator,    'securityPolicy');
        ok("onLine" in navigator,            'onLine');
        
    }).should('have the expected values', function(){

        ok(navigator.userAgent,         'userAgent');
        ok(navigator.appCodeName,       'appCodeName');
        ok(navigator.appName,           'appName');
        ok(navigator.appVersion,        'appVersion');
        ok(navigator.language,          'language');
        ok(navigator.mimeTypes,         'mimeTypes');
        ok(navigator.platform,          'platform');
        ok(navigator.oscpu,             'oscpu');
        ok(navigator.product,           'product');
        ok(navigator.productSub,        'productSub');
        ok(navigator.plugins,           'plugins');
        ok(navigator.cookieEnabled,     'cookieEnabled');
        ok(navigator.buildID,           'buildID');
        ok(navigator.javaEnabled,       'javaEnabled');
        ok(navigator.taintEnabled,      'taintEnabled');
        ok(navigator.preference,        'preference');
        ok(navigator.geolocation,       'geolocation');
        ok(navigator.registerContentHandler, 'registerContentHandler');
        ok(navigator.registerProtocolHandler, 'registerProtocolHandler');
    
    });
    
})(QUnit);
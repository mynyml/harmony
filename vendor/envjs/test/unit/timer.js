module("timer");

test("runnable callbacks are run later with timeout of 0", function() {
	expect(2);
	var occurred = 0;
	setTimeout(function(){ 
        occurred = Date.now(); 
    }, 0);
	ok( occurred === 0, "Timeout callback was not executed immediatly" );
    setTimeout(function(){
      ok( occurred !== 0, "Timeout callback executed" );
      start();
    },100);
    stop();
});

test("runnable callbacks are run later with timeout more than 0", function() {
	expect(3);
	var occurred = 0;
	setTimeout(function(){ 
        occurred = Date.now(); 
    }, 1000);
	ok( occurred === 0, "Timeout callback was not executed immediatly" );
    var now = Date.now();
    setTimeout(function(){
      ok( occurred !== 0, "Timeout callback was executed" );
      ok( Date.now()-now >= 1500, "Timeout callback was not executed too early" );
      start();
    },1500);
    stop();
});

test("clearTimeout cancels execution of setTimeout callback", function() {
	expect(2);
	var occurred = 0;
	var id = setTimeout(function(){ 
        occurred = Date.now();
	    ok( false, "callback should not executed after clearTimeout" );
    }, 1000);
	ok( occurred === 0, "Timeout callback was not executed immediatly" );
    clearTimeout(id);
    setTimeout(function(){
	ok( occurred === 0, "Timeout callback was not executed" );
        start();
    },3000);
    stop();
});

test("setTimeout callbacks that throw run once", function() {
    expect(2);
    stop();
    var called = 0;
    var id = setTimeout(function(){
        ok( called == 0, "timeout called once" );
        called++;
        throw "an expected error";
    }, 10);
    setTimeout(function(){
        ok( called == 1, "called timeout once double checked" );
        clearTimeout(id);
        start();
    },100);
});

test("setInterval callbacks that are delayed execute immediately", function() {
    expect(3);
    stop();
    var iteration = 0;
    var last = Date.now();
    var id = setInterval(function(){
        var now = Date.now();
        var since_last = now - last;
        switch(iteration) {
          case 0:
            ok( since_last > 60 && since_last < 140, "first interval was correct" );
            while( (Date.now() - last ) < 400 ) {}
            break;
          case 1:
            ok( since_last < 40, "second interval was correct" );
            break;
        default:
            ok(  since_last > 60 && since_last < 140, "third interval was correct" );
            clearInterval(id);
            start();
        }
        last = Date.now();
        iteration++;
    }, 100);
});

test("wait(n) waits at least n and then continues with nothing in the future", function() {
    stop();
    expect(1);
    var now = Date.now();
    Envjs.wait(1000);
    ok( Date.now() - now > 1000, "wait waited long enough" );
    start();
});

test("wait(n) waits at least n and then continues with stuff in the future", function() {
    stop();
    expect(2);
    var now = Date.now();
    var t = setTimeout(function(){
    },2000);
    Envjs.wait(1000);
    ok( Date.now() - now > 1000, "wait waited long enough" );
    ok( Date.now() - now < 2000, "wait didn't wait too long" );
    start();
});

// Local Variables:
// espresso-indent-level:4
// c-basic-offset:4
// End:

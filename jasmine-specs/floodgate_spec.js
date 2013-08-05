var floodgate = require( "floodgate" );

describe( "floodgate.series", function(){
	it( "is defined" , function(){
		expect(floodgate.series).toBeDefined();
	});

	it( "returns an object", function(){
		var result = floodgate.series();
		expect( result ).toBeDefined();
	});

	it( "provides the initial value to the first task", function(){
		var test_value = "moose denied";
		var series = floodgate.series();
		var spy = jasmine.createSpy();
		series.then( spy );
		series.run( undefined, undefined, test_value );
		expect( spy.mostRecentCall.args[2] ).toBe( test_value );
	});

	it( "works with asynchronise tasks", function(){
		var called = false;
		var series = floodgate.series();
		series.then( function( error, success, input ){
			setTimeout( function(){ success( input ); }, 1 );
		});
		series.run( function(){ }, function( ){ called = true } );
		waitsFor( function(){ return called; }, 5 );
		runs( function(){
			expect( called ).toBeTruthy();
		});
	});

	it( "chains the values of the tasks", function(){
		var spy = jasmine.createSpy();
		var value1 = "do do do do", value2 = "lives for me";
		var series = floodgate.series();
		series.then( function( error, success, input ){
			success( value2 );
		});
		series.then( function( error, success, input ){
			expect( input ).toBe( value2 );
		});
		series.run( function(){ }, function( ){ }, value1 );
	});

	it( "invokes the failure case when a subtask fails", function(){
		var spy = jasmine.createSpy();
		var called_back = false;
		var error_value = "this is an error value";
		var error_received = undefined;
		var series = floodgate.series()
			.then( function( error, succes ){
				error( error_value );
			});
		series.run( function( error ){
			error_received = error;
			called_back = true;
		}, function(){
			called_back = false;
		});
		waitsFor( function(){ return called_back; }, 10 );
		runs( function(){
			expect( error_received ).toBeTruthy();
		});
	});
	it( "then results in self", function(){
		var series = floodgate.series();
		var then_result = series.then( function(){} ); 
		expect( then_result ).toBe( series );
	});
});

describe( "floodgate.parallel", function(){
	it( "is defined", function(){
		expect( floodgate.parallel ).toBeDefined();
	});

	it( "returns a value", function(){
		var parallel = floodgate.parallel();
		expect( parallel ).toBeDefined();
	});

	it( "supports mulitple paths", function(){
		var path1 = jasmine.createSpy( "path1" );
		var path2 = jasmine.createSpy( "path2" );
		var parallel = floodgate.parallel();
		parallel.path( "p1", path1 );
		parallel.path( "p2", path2 );
		parallel.run();
		expect( path1 ).toHaveBeenCalled();
		expect( path2 ).toHaveBeenCalled();
	});

	it( "doesn't call succes bofore all paths completed", function(){
		var fail_spy = jasmine.createSpy("fail");
		var success_spy = jasmine.createSpy( "success" );

		var path1 = function( error, success ){
			expect( success ).toBeDefined();
			success();
		} 
		var path2 = function( error, success ){
		}
		var parallel = floodgate.parallel();
		parallel.path( "p1", path1 );
		parallel.path( "p2", path2 );
		parallel.run();
		expect( fail_spy ).not.toHaveBeenCalled();
		expect( success_spy ).not.toHaveBeenCalled();
	});

	it( "calls success when all tasks completed successfully", function(){
		var success_spy = jasmine.createSpy( "success" );
		var wait_and_succeed = function( error, success ){
			setTimeout( function(){
				success();
			}, 1);
		}

		runs( function(){
			var parallel = floodgate.parallel();
			parallel.path( "p1", wait_and_succeed );
			parallel.path( "p2", wait_and_succeed );
			parallel.run( undefined, success_spy );
			expect( success_spy ).not.toHaveBeenCalled();
		});
		waits( 10 );
		runs( function(){
			expect( success_spy ).toHaveBeenCalled();
		});
	});

	it( "provides named results for each", function(){
		var path1 = "space cowboy";
		var path2 = "the joker";

		var parallel = floodgate.parallel();
		parallel.path( "path1", function( _err, success ){ success( path1 ); } );
		parallel.path( "path2", function( _err, success ){ success( path2 ); } );
		parallel.run( undefined, function( value ){ 
			expect( value ).toBeDefined();
			expect( value.path1 ).toBe( path1 );
			expect( value.path2 ).toBe( path2 );
		});
	});

	it( "errors on path name collision", function(){
		var parallel = floodgate.parallel();
		parallel.path( "my life", function(){} );
		expect( function(){ parallel.path( "my life", function(){} ); } ).toThrow();
	});

	it( "accepts multiple paths as an input object", function(){
		var constant = function( value ){
			return function( error, success ){
				success( value );
			}
		}
		var parallel = floodgate.parallel();
		parallel.paths({ a: constant( 'a' ), b: constant( 'b'), c: constant('c') });
		parallel.run( undefined, function( value ){
			expect( value.a ).toBe( 'a' );
			expect( value.b ).toBe( 'b' );
			expect( value.c ).toBe( 'c' );
		});
	});

	it( "fails if any component fails", function(){
		var parallel = floodgate.parallel();
		parallel.paths({
			pass: function(e, s ){ s( "pass" ); },
			fail: function( error, success ){ error( "fail" ); }
		});

		parallel.run( function( failed, passed ){
			expect( failed.fail ).toBe( "fail" );
			expect( passed.pass ).toBe( "pass" );
		}, undefined );
	});

	it( "defaults to no transformation of inputs", function(){
		var spies = { a: jasmine.createSpy("a"), b: jasmine.createSpy("b") };
		var input = "shine";
		var parallel = floodgate.parallel();
		parallel.paths( spies );
		parallel.run( undefined, undefined, input);
		expect( spies.a.mostRecentCall.args[2] ).toBe( input );
		expect( spies.b.mostRecentCall.args[2] ).toBe( input );
	});

	it( "maps path names to inputs", function(){
		var spies = { a: jasmine.createSpy("a"), b: jasmine.createSpy("b") };
		var input = { a: "just", b: "happy" };
		var parallel = floodgate.parallel();
		parallel.mapping();
		parallel.paths( spies );
		parallel.run( undefined, undefined, input);
		expect( spies.a.mostRecentCall.args[2] ).toBe( input.a );
		expect( spies.b.mostRecentCall.args[2] ).toBe( input.b );
	});
});

describe( "floodgate.map", function(){
	it( "runs each element against the target", function(){
		var target = jasmine.createSpy();
		var mapper = floodgate.map();
		mapper.target = target;
		mapper.run( undefined, undefined, [1,"a"]);
		expect( target.argsForCall[0][2] ).toBe( 1 );
		expect( target.argsForCall[1][2] ).toBe( "a" );
	});

	it( "calls succes on completion", function(){
		var success = jasmine.createSpy( "success" );
		var mapper = floodgate.map();
		mapper.target = function( _error, success, input ){
			setTimeout( function(){ success( input ); }, 1 );
		}

		mapper.run( undefined, success, [1,"a"]);
		waits( 5 );
		runs( function(){
			expect( success ).toHaveBeenCalled();
		});
	});

	it( "fails if any element fails", function(){
		var failure = jasmine.createSpy("failure");
		var mapper = floodgate.map();
		mapper.target = function( error, success, input ){
			setTimeout( function(){ input == 1 ? success( input ) : error(input); }, 1 );
		}

		mapper.run( failure, undefined, [1,"a"]);
		waits( 5 );
		runs( function(){
			expect( failure ).toHaveBeenCalled();
		});
	});
});


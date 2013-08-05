var nope = function(){};
exports.nodpe = nope;

var Series = function(){
	var tasks = new Array();

	this.then = function( target ){
		tasks.push( target );
		return this;
	}

	this.run = function( error, success, value ){
		var index = 0;
		var next_task = function( next_value ){
			if( index < tasks.length ){
				var task = tasks[index];
				index++;
				task( error, next_task, next_value );
			}else{
				success( value );
			}
		}
		next_task( value );
	};

	this.promsie = this.run.bind( this );
	return this;
}

exports.series = function(){
	return new Series();
}

var identity = function( input ){ return input; }
var mapping = function( input, name ){ return input[name]; }

exports.transformations = {
	identity: identity,
	mapping: mapping
}

var Parallel = function(){
	var count = 0;
	var paths = { };

	this.input_transformation = identity;
	this.mapping = function(){
		this.input_transformation = mapping;
	}

	this.paths = function( object ){
		for( var name in object ){
			this.path( name, object[name] );
		}
	}

	this.path = function( name, path ){
		count++;
		if( paths[name] != undefined ){
			throw "Path name '"+name+"' is already in use";
		}
		paths[ name ] = path;
	}

	this.run = function( error, success, input ){
		var on_success = success || nope;
		var on_failure = error || nope;

		var remaining = count;
		var result = {};
		var failed = {};
		var on_complete = function() { on_success( result ); };

		var path_complete = function(){
			remaining--;
			if( remaining == 0 ){
				on_complete(); 
			}
		}

		var finish_builder = function( name ){
			return function( value ){
				result[ name ] = value;
				path_complete();
			}
		}
		var failure_builder = function( name ){
			return function( excuse ){
				failed[ name ] = excuse;
				on_complete = function(){ on_failure( failed, result ); };
				path_complete();
			}
		}

		for( var name in paths ){
			var path_name = name;
			var path = paths[ path_name ];
			var path_input = this.input_transformation( input, name );
			path( failure_builder( path_name ), finish_builder( path_name ), path_input);
		}
	}
	this.promise = this.run.bind(this);

	return this;
}

exports.parallel = function(){
	return new Parallel();
}

var MapArray = function(){
	this.target = function( error, success, input ){ success( input ); };

	this.run = function( error, success, input ){
		var remaining = input.length;
		var mapping = this.target;

		var output = new Array();
		var excuses = new Array();

		var on_finished = function(){
			success( output );
		}
		var on_error = function(){
			error( excuses, output );
		};

		var on_completion = function(){
			remaining--;
			if( remaining == 0){
				on_finished();
			}
		}

		input.forEach( function( element, index ){
			output.push( undefined );
			mapping( function( excuse ){
				excuses.push( { index: index, element: element, excuse: excuse } );
				on_finished = on_error;
				on_completion();
			}, function( result ){
				output[ index ] = output;
				on_completion();
			}, element );
		});
	}
	this.promise = this.run.bind(this);

	return this;
}

exports.map = function(){
	return new MapArray();
}


var paths = require('path');
require(paths.resolve('./ILAB/Modules/Channels.js'));
log = require(paths.resolve('./ILAB/Modules/Node/Logger.js')).log;
error = require(paths.resolve('./ILAB/Modules/Node/Logger.js')).error;
info = require(paths.resolve('./ILAB/Modules/Node/Logger.js')).info;
debug = require(paths.resolve('./ILAB/Modules/Node/Logger.js')).debug;

HttpChannelsClient = {	
	GET :  function(context){
		if (context.completed){
			return true;	
		}
		var path = context.pathTail.trim();
		var response = context.res;
		var request = context.req;
		if (path.lastIndexOf("/") == path.length - 1){
			path = path.substring(0, path.length - 1);
		}
		//console.log("SENDING event ".info + path);
		var handler = function(message){
			try{
				var params = [];
				for (var i = 0; i < arguments.length; i++){
					//if (arguments[i].length && arguments[i].length > 100) params.push("Long param: " + arguments[i].length);
					params.push(arguments[i]);
				}
				response.write(JSON.stringify(params) + "\n");
			}
			catch(e){
				response.write(JSON.stringify(e) + "\n");
			}
		}
		request.on("close", function(){
			console.log("<< Channel unsubscribe: " + path);
			Channels.clear(path, handler);
		});
		if (Channels.on(path, handler)){
			console.log(">> Channel subscribe: " + path);
			response.setHeader("Content-Type", "application/json; charset=utf-8");		
			context.abort();
			return false;
		}
		else{		
			context.finish(403, "Channel not registered");
			return true;
		}
	},

	POST : function(context){
		if (context.completed){
			return true;	
		}
		var path = context.pathTail.trim();
		if (path.lastIndexOf("/") == path.length - 1){
			path = path.substring(0, path.length - 1);
		}
		var response = context.res;
		var request = context.req;
		var fullData = "";		
		response.setHeader("Content-Type", "application/json; charset=utf-8");
		request.on("data", function(data){
			fullData += data;		
		});
		request.on("end", function(){
			console.log("Emit: " + path);
			Channels.emit(path, fullData);
			context.finish(200);
			context.continue();
		});		
		return false;
	},

	SEARCH :  function(context){
		if (context.completed){
			return true;	
		}
	},
}


module.exports = HttpChannelsClient;
	

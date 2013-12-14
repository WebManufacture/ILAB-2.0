var log = require("./log.js").info;
log.error = require("./log.js").error;
log.info = log;
require('./Mongo.js');
var http = require('http');


try{
	
	var server = require("./DBS.js");
	
	function InitDB(){
		replicaSet([{host: "127.0.0.1", port : 20000}], "jasp", function(error, database){
			err = error;
			db = database;
			server = new server(db);
			server.ProcessResult = UsersSystem.ProcessResults;
		});
	};
	
	InitDB();
		
	UsersSystem = {};
		
	UsersSystem.ProcessResults = function(result){
		if (result){
			if( typeof result == 'object'){
				for (var i = 0; i < result.length; i++){
					result[i].pass = null;
					result[i].sessionKey = null;
				};
			};
			return JSON.stringify(result);
		}
		return JSON.stringify("{}");
	}
	
	
	
	http.createServer(function(request, response){
		server.ProcessRequest(request, response);
	}).listen(12249);
	
	
	
	
} catch(err){
	log.error(err);
	process.exit();
}
	
	

	










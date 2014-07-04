module.exports = function(config, server){
	log = server.Logger;
	if (!config){
		return null;	
	}
	DBCode.Init(Server.Database, config)
		return DBCode.ProcessContext;
};

var vm = require('vm');


DBCode = {
	Init: function(db, config){
		DBCode.DB = db;
		DBCode.collection = config.collection;
		DBCode.prefix = config.prefix;
		db.collection(config.collection).find({}, function(err, result){	
			if (err){
				return false;
			}
			if (!result){					
				return false;
			}
			try{
				vm.runInThisContext(result.code, "/");
			}
			catch(error){
				log.error(error);
			}
		});
	},
	
	ProcessContext : function(context){
		var path = context.pathTail;
		if (path === undefined){
			path = url.pathname;
		}		
		if (!path.start("/")){
			path = "/" + path;
		}
		if (path.end("/") && path.length > 1){
			path = path.substr(0, path.length - 1);
		}
		if (DBCode.prefix) path = DBCode.prefix + path;
		context.fullData = "";
		context.req.on("data", function(data){
			context.fullData += data;		
		});
		context.req.on("end", function(){
			try{
				DBCode.DB.collection(DBCode.collection).findOne({path:path}, function(err, result){	
					if (err){
						context.error("Code DB error " + path + " : " + err);
						return false;
					}
					if (!result){					
						context.log("Content ", path, " not found");
						context.finish(404, "Code not found " + path);
						return false;
					}
					try{
						context.finish(200, vm.runInNewContext(result.code, context, path));
					}
					catch(error){
						context.error(error);	
					}
					context.continue(context);
				});
			}
			catch(e){
				context.error(e);
				return;
			}
		});
		return false;
	}
}
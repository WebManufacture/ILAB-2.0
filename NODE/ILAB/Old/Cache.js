module.exports = function(config, server, mapPath, path){
	log = server.Logger;
	if (!config){
		console.log("config for cache not found! " + path + " maped to " + mapPath);
		return null;	
	}
	Cache.Init(config, server);
	return Cache.ProcessContext;
};

Cache = {
	_cache : {},
		
	Init: function(config, server){
		//server.Router.for("modules", "/<", Cache.Store);
		//server.Router.for("modules", "/Cache/>", Cache.SearchObj);
	},
	
	ProcessContext : function(context){
		return;
		if (context.req.method == "GET"){
			if (Cache._cache[context.path]){
				context.log("from cache:", context.path);
				context.finish(200, Cache._cache[context.path]);
				context.stop = true;
			}
		}
	},
	
	Store : function(context){
		//context.log("Store ", context.req.method, " ", context.completed, " " , context.endStatus);
		if (context.req.method == "GET" && context.completed && context.endStatus == 200){
			context.log("stored ", context.path);
			Cache._cache[context.path] = context.endResult + "";
		}
	},
	
	SearchObj : {
		SEARCH : function(context){
			context.finish(200, JSON.stringify(Cache._cache));	
		},
		
		GET : function(context){
			context.finish(200, JSON.stringify(Cache._cache[context.pathTail]));	
		},
	}
}


module.exports = function(config, server){
	log = server.Logger;
	if (!config){
		return null;	
	}
	return DBProc.GetProcessor(Server.Database, config.collection, config.methods);
};

DBProc = {
	GetProcessor: function(db, collection, methods){
		if (methods){
			var obj = {};
			methods = methods.split(",");
			for (var i = 0; i < methods.length; i++){
				var method = methods[i];
				if (DBProc[method]){
					obj[method] = DBProc.WrapMethod(db, collection, DBProc[method]);
				}
			}
			return obj;
		}
		return {
			GET : DBProc.WrapMethod(db, collection, DBProc.GET),
			SEARCH : DBProc.WrapMethod(db, collection, DBProc.SEARCH),
			DELETE : DBProc.WrapMethod(db, collection, DBProc.DELETE),
			POST : DBProc.WrapMethod(db, collection, DBProc.POST),
			PUT : DBProc.WrapMethod(db, collection, DBProc.PUT),
		}
	}
}
ObjectID = require('mongodb').ObjectID;
var Path = require('path');
require(Path.resolve("./ILAB/Modules/Node/Mongo.js"));

module.exports = function(config, collection, logger){
	if (logger){
		var log = logger;
	}
	else{
		log = require(Path.resolve("./ILAB/Modules/Node/Logger.js")).primaryLogger;
	}
	if (!config){
		return null;	
	}
	if (!config.dbname) config.dbname = "Accounts";
	if (config.dbconf){
		replicaSet([config.dbconf], config.dbname, function(err, database){
			if (err){
				log.error(err);	
			}
			DBProc.db = database;
			DBProc.InitDB();
		});
	}
	else{
		if (!config.dbhost) config.dbhost = "127.0.0.1";
		if (!config.dbport) config.dbport = 20000;
		replicaSet([{host : config.dbhost, port : config.dbport}], config.dbname, function(err, database){
			if (err){
				log.error(err);	
			}
			DBProc.db = database;
			DBProc.InitDB();
		});
	}
	return DBProc.GetProcessor(collection, config.methods, config);
};

DBProc = {
	InitDB : function(db){
		if (!db) return null;
		if (config.history){
			db.collection(collection).findOne({_id : ObjectID('\0\0\0\0\0\0\0\0\0\0\0\0')}, function(err, result){
				if (!err && result){
					obj._historyStartCounter = parseInt(result.counter);
					obj._historyCounter = obj._historyStartCounter;
					obj._history = [];
					console.log("history for: " + collection + " starts from: " + obj._historyCounter);
				}
				else{
					DBProc.CreateHistory(obj, collection);
					console.log("history for: " + collection + " created: " + obj._historyCounter);
				}
			});
		}
	},

	GetProcessor: function(collection, methods, config){
		var obj = {};
		if (typeof(collection) != "string") {
			console.log(JSON.stringify(config));
			return null;
		}
		obj._collection = collection;
		if (methods){
			methods = methods.split(",");
			for (var i = 0; i < methods.length; i++){
				var method = methods[i];
				if (DBProc[method]){
					obj[method] = DBProc.WrapMethod(obj, collection, DBProc[method]);
				}
			}
		}
		else{
			obj.GET  = DBProc.WrapMethod(obj, collection, DBProc.GET);
			obj.SEARCH = DBProc.WrapMethod(obj, collection, DBProc.SEARCH);
			obj.DELETE = DBProc.WrapMethod(obj, collection, DBProc.DELETE);
			obj.POST = DBProc.WrapMethod(obj, collection, DBProc.POST);
			obj.PUT = DBProc.WrapMethod(obj, collection, DBProc.PUT);
		}
		return obj;
	},
	
	WrapMethod : function(obj, collection, method){
		return function(context, nextCallback){
			var searchObj = DBProc.GetSearchObj(context.url, context.pathTail);
			context.log("DB Proc for ", obj._collection, " : ", context.req.method, ":", context.pathTail, " - ", searchObj);
			context.res.setHeader("Content-Type", "application/json; charset=utf-8");
			return method.call(obj, collection, context, searchObj);
		}
	},
	
	GetHistory : function(dbobj, collection, context, searchObj){
		context.finish(200, JSON.stringify(dbobj._historyCounter));
		return true;
	},
	
	AllHistory : function(dbobj, collection, context, searchObj){
		if (searchObj.last_history != undefined){
			var lh = parseInt(searchObj.last_history);
			if (lh < dbobj._historyStartCounter){
				context.finish(200, '');	
				return true;
			}
			if (lh > dbobj._historyCounter){
				context.finish(200, '');	
				return true;
			}
			if (lh == dbobj._historyCounter){
				context.finish(200, '[]');	
				return true;
			}
			lh -= dbobj._historyStartCounter;
			context.finish(200, JSON.stringify(dbobj._history.slice(lh)));	
		}
		else{
			context.finish(200, JSON.stringify(dbobj._history));
		}
		return true;
	},
	
	CreateHistory : function(dbobj, collection){
		if (!dbobj._history){
			dbobj._historyStartCounter = 0;
			dbobj._historyCounter = 0;
			dbobj._history = [];
			DBProc.db.collection(collection).save({path:'/_history', _id : ObjectID('\0\0\0\0\0\0\0\0\0\0\0\0'), counter : dbobj._historyCounter}, function(err, result){});			
		}		
	},
	
	SaveHistoryCounter : function(dbobj, collection){
		if (dbobj._history){
			DBProc.db.collection(collection).save({path:'/_history', _id : ObjectID('\0\0\0\0\0\0\0\0\0\0\0\0'), counter : dbobj._historyCounter}, function(err, result){});			
		}		
	},
	
	
	GetSearchObj : function(url, path){
		var fObj = {};
		url.hasParams = false;
		if (path === undefined){
			path = url.pathname;
		}		
		if (!path.start("/")){
			path = "/" + path;
		}
		if (path.end("/") && path.length > 1){
			path = path.substr(0, path.length - 1);
		}
		for (var key in url.query){
			var value = url.query[key];
			if (key == "id" || key == "_id"){
				key = "_id";
				value = ObjectID(value);
			}
			if (key == "sort" || key == 'limit' || key == 'skip'){
				if (value.start("{")){
					try{
						var valObj = JSON.parse(value);
						value = valObj;
					}
					catch (e){
						
					}
				}
				url[key] = value;
				continue;
			}
			if (typeof(value)=='string'){
				if (value.start("{")){
					try{
						var valObj = JSON.parse(value);
						value = valObj;
					}
					catch (e){
						//value += "PARSEERROR";
					}
				}
				else{
					var valObj = parseInt(value);
					if (valObj && !isNaN(valObj)){
						value = valObj;
					}
					else{
						if (value.start("'") || value.start('"')){
							value = value.substring(1);
						}
						if (value.ends("'") || value.ends('"')){
							value = value.substring(0, value.length - 1);
						}
					}
				}
			}
			fObj[key] = value;					
			url.hasParams = true;
		}		
		if (path != "/*" && path != "/*/" && !url.hasParams){
			fObj.path = path;		
		}
		if (url.sort && typeof(url.sort) == 'string'){
			if (url.sort.start("<")){
				var sort = {};
				sort[url.sort.substr(1)] = 1;
				url.sort = sort;
				return fObj;
			}
			if (url.sort.start(">")){
				var sort = {};
				sort[url.sort.substr(1)] = -1;
				url.sort = sort;
				return fObj;
			}
		}
		return fObj
	},
	
	GET : function(collection, context, searchObj){
		var db = DBProc.db;
		if (!searchObj){
			searchObj = DBProc.GetSearchObj(context.url);
		}
		if (this._history && (context.url.pathname.end("/_history") || context.url.pathname.end("/_history/"))){
			context.log("Getting history num");
			return DBProc.GetHistory(this, collection, context, searchObj);
		}
		var cursor = null;
		cursor = db.collection(collection).find(searchObj);
		if (context.url.sort){			
			cursor.sort(context.url.sort);
			context.log("Sorting ", context.url.sort);
		}
		if (context.url.skip) {
			cursor.skip(parseInt(context.url.skip));
		}
		if (context.url.limit) {
			cursor.limit(parseInt(context.url.limit));
		}
		cursor.nextObject(function(err, result){	
			if (err){
				context.finish(500, "GET " + context.url.pathname + " error: " + err);
				return false;
			}
			if (!result){					
				context.log("Content ",searchObj, " not found");
				context.finish(404, "Content " + searchObj.path + " not found");
				return false;
			}
			context.finish(200, JSON.stringify(result));
			context.continue(context);
		});
		return false;
	},
	
	
	DELETE : function(collection, context, searchObj){
		if (!searchObj){
			searchObj = DBProc.GetSearchObj(context.url);
		}
		var db = DBProc.db;
		var obj = this;
		db.collection(collection).remove(searchObj, function(err, result){
			if (err){
				context.finish(500, "DELETE " + context.url.pathname + " error: " + err);
				return true;
			}
			context.finish(200, result);
			context.continue(context);
		});
		if (this._history && searchObj._id){			
			this._historyCounter++;
			this._history.push({counter: this._historyCounter, action: "DEL", id : searchObj._id});
			DBProc.SaveHistoryCounter(this, collection);
		}
		return false;
	},
	
	
	SEARCH : function(collection, context, searchObj){	
		var db = DBProc.db;
		if (!searchObj){
			searchObj = DBProc.GetSearchObj(context.url);
		}
		if (this._history && (context.url.pathname.end("/_history") || context.url.pathname.end("/_history/"))){
			context.log("Browsing history");
			return DBProc.AllHistory(this, collection, context, searchObj);
		}
		var cursor = null;
		cursor = db.collection(collection).find(searchObj);
		if (context.url.sort){			
			cursor.sort(context.url.sort);			
			context.log("Sorting ", context.url.sort);
		}
		if (context.url.skip) {
			cursor.skip(parseInt(context.url.skip));
		}
		if (context.url.limit) {
			cursor.limit(parseInt(context.url.limit));
		}
		cursor.toArray(function(err, result){	
			if (err){
				context.finish(500, "GET " + context.url.pathname + " error: " + err);
				return false;
			}
			if (!result){					
				context.finish(404, "Content " + context.url.pathname + " not found");
				return false;
			}
			context.finish(200, JSON.stringify(result));
			context.continue(context);
		});
		return false;
	},
	
	POST : function(collection, context, searchObj){
		var db = DBProc.db;
		var fullData = "";
		var dbobj = this;
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				if (!doc.path && searchObj){
					doc.path = searchObj.path;	
				}
				if (searchObj && searchObj._id){
					doc._id = searchObj._id;
				}
				db.collection(collection).save(doc, {safe : false}, function(err, result){
					if (err){
						context.finish(500, "POST " + context.url.pathname + " error " + err);
						return;
					}					
					if (dbobj._history){			
						if (result){
							dbobj._historyCounter++;
							dbobj._history.push({counter: dbobj._historyCounter, action: "ADD", id : result._id});
							DBProc.SaveHistoryCounter(dbobj, db, collection);
						}
						else{
							if (searchObj._id){
								dbobj._historyCounter++;
								dbobj._history.push({counter: dbobj._historyCounter, action: "SET", id : searchObj._id});
								DBProc.SaveHistoryCounter(dbobj, db, collection);
							}
						}
					}
					if (result){
						context.finish(200, JSON.stringify(result));
					}
					else{
						context.finish(200, "");
					}
					context.continue(context);
				});
			}
			catch (err){
				context.finish(500, "JSON error: " + err);
			}
			context.continue(context);
		});
		return false;
	},
	
	PUT : function(collection, context, searchObj){
		var db = DBProc.db;
		var fullData = "";
		var dbobj = this;
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				if (doc.path){
					delete doc.path; //После разговора с Колей. Нельзя давать менять Path. из-за безопасности.
				}
				db.collection(collection).update(searchObj, {$set: doc}, function(err, result){
					if (err){
						context.finish(500, "PUT " + url.pathname + " error " + err);
						return;
					}	
					if (!result){
						result = "";
					}
					context.finish(200, result);
					context.continue(context);
				});
			}
			catch (err){
				context.finish(500, "JSON error: " + err);
			}
			context.continue(context);
		});
		
		if (dbobj._history && searchObj && searchObj._id){			
			dbobj._historyCounter++;
			dbobj._history.push({counter: dbobj._historyCounter, action: "SET", id : searchObj._id})
				DBProc.SaveHistoryCounter(dbobj, db, collection);
		}
		return false;
	},
};

module.exports.DBProc = DBProc;
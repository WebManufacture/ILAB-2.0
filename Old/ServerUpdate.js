var http = require('http');
var Url = require('url');
var vm = require('vm');
var fs = require('fs');
var logger = require("./DBLogs.js");
require("./Utils.js");
var RouterModule = require("./Router.js");
require('./Mongo.js');

var log = new logger();

Server = server = {};

Server.Init = function(){
	var cfg = {path : "/", dbpath: "127.0.0.1:20000", dbname : "klab", updateServer: "http://web-manufacture.net:8000/latest.update"};
	for (var i = 2; i < process.argv.length; i++){
		var arg = process.argv[i];
		var val = arg.split("=");
		if (val.length == 2){
			cfg[val[0]] = val[1];
		}
	}
	
	if (typeof(cfg.dbpath) == 'string'){
		var hp = cfg.dbpath.split(':');
		cfg.dbpath = [{host: hp[0], port:parseInt(hp[1])}];		
	}
	
	Server.RootPath = "";
	
	replicaSet(cfg.dbpath, cfg.dbname, function(error, database){
		if (error){
			throw error;	
		};
		log = new logger(database, cfg.path, "logs");
		db = Server.Database = database;
		database.collection("configs").findOne({path: cfg.path}, function(err, result){
			if (cfg.ver && cfg.ver[0] != '0'){
				Server.Start(cfg);
				DBCode.RunCode(cfg);
				return;
			};
			
			if ((!cfg.ver || cfg.ver[0] == '0') && cfg.updateServer){
				http.get(cfg.updateServer, function(result){
					
					var fullData = '';
					
					result.on('data', function(d) {
						fullData += d;
					});
					result.on('end', function(){
						if (!fullData) process.exit;
						var updates = JSON.parse(fullData);
						log.debug(updates);
						Server._updatesQuantity = updates.database.length + updates.files.length + updates.code.length;
						log.debug('all doing ' + Server._updatesQuantity);
						
						
						//БАЗА ДАННЫХ
						for (var i = 0; i < updates.database.length; i++){
							for (var key in updates.database[i]){
								var dbUpdate = updates.database[i][key];
								database.collection(key).update({path : dbUpdate.path}, {$set: dbUpdate}, {upsert:true}, function(err, result){
									if (err) {
										log.debug('error');
										return;
									};
									Server._updatesQuantity--;
									log.debug('Server._updatesQuantity ' + Server._updatesQuantity);
									if (!Server._updatesQuantity) Server.Start(cfg);
									
									
								});
							};
						};
						
						//ФАЙЛЫ
						for (var j = 0; j < updates.files.length; j++){
							log.debug(updates.files[j].path);
							var fpath = updates.files[j].filename.replace("/", "\\");
							log.debug('f1 ' + fpath);
							if (!fpath.start("\\")) fpath = "\\" + fpath;
							log.debug('f2 ' + fpath);
							fpath = "." + fpath;
							log.debug('f3 ' + fpath);
							http.get(updates.files[j].path, (function(fpath/*j*/){return function(result){
								
								var fullData = '';
								
								result.on('data', function(d) {
									fullData += d;
								});
								result.on('end', function(){
									log.debug('fullData' + fullData);
									if (!fullData) process.exit;
									log.debug('filename ' + fpath/*updates.files[j].filename*/);
									fs.writeFile(fpath/*updates.files[j].filename*/, fullData, 'utf8', function(err, res){
										if (err){
											log.debug(err);
											return;
										};
										log.debug('File was updated to version ' + cfg.ver);
										Server._updatesQuantity--;
										log.debug('Server._updatesQuantity ' + Server._updatesQuantity);
										//	if (!Server._updatesQuantity) Server.Start(cfg);
									});
								});				  	
							};
																		 
																		})(fpath)).on('error', function(e){
								log.error(e);
								process.exit;
							});
							
						};
						
						//КОД
						for (var k = 0; k < updates.code.length; k++){
							
							
							//	if (!Server._updatesQuantity) Server.Start(cfg);
						};

					});
				}).on('error', function(e){
					log.error(e);
					process.exit;
				});
			};
		});
	});
};

Server.UpdateDB = function(updatesDatabase){
	for (var i = 0; i < updatesDatabase.length; i++){
		for (var key in updatesDatabase[i]){
			var dbUpdate = updatesDatabase[i][key];
			database.collection(key).update({path : dbUpdate.path}, {$set: dbUpdate}, {upsert:true}, function(err, result){
				if (err) {
					log.debug('error');
					return;
				};
				Server._updatesQuantity--;
				log.debug('Server._updatesQuantity ' + Server._updatesQuantity);
				if (!Server._updatesQuantity) Server.Start(cfg);
				
				
			});
		};
	};
};

Server.UpdateFS = function(updatesFiles){
	
};

Server.UpdateCode = function(updatesCode){
	
};



							//log.debug('configs.path ' + updates.configs[i].path);
							//log.debug(updates.configs[i]);
						/*
							var path = updates.configs[i].path;
							database.collection("configs").update({path : path}, {$set: updates.configs[i]}, {upsert:true}, function(err, result){
								if (err) {
									log.debug('error');
									return;
								};
								
								//log.debug('Configs was updated to version ' + updates.ver);
								Server._updatesQuantity--;
								log.debug('Server._updatesQuantity ' + Server._updatesQuantity);
								if (!Server._updatesQuantity) Server.Start(cfg);
								
								
							});
							
						};
*/
						//database.collection("configs").find().toArray(function(err, result){
						//	log.debug(result);
						//});
						
						
						
//					});
					//if (!result) process.exit;
					//var updates = JSON.stringify(result);
					//Server._updatesQuantity = updates.configs.length + updates.files.length + updates.codes.length;
					
					
					

					
					/*					
for (var j = 0; j < updates.files.length; j++){
http.get(updates.files[j].path, function(result){
fs.writeFile(updates.files[j].filename, result, encoding='utf8', function(){

log('File was updated to version ' + cfg.ver);
//Server._updatesCount++;
//if (Server._updatesQuantity == Server._updatesCount) Server.Start(cfg);
Server._updatesQuantity--;
if (!Server._updatesQuantity) Server.Start(cfg);
});
});
};
*/				
					//	for (var item in result){
					//		if (!cfg[item]) cfg[item] = result[item];	
					//	};
					
//				})//.on('error', function(e){
					//	log.error(e);
					//	process.exit;
					//});
					
					
	//		};
			
			//if (!err && result){
			//	for (var item in result){
			//		if (!cfg[item]) cfg[item] = result[item];	
			//	}
			//}
			
			//________________________________________________		
//		});									  
//	});
//};

//Server.Update = function(){	
//};

DBCode = {
	RunCode: function(cfg){
		var collection = 'code';
		if (cfg.codeCollection) collection;
		DBCode.collection = collection;
		db.collection(collection).find({path: cfg.path}, function(err, result){	
			if (err){
				return false;
			}
			if (!result){					
				return false;
			}
			try{
				eval(result.code);
			}
			catch(error){
				log.error(error);
			}
		});
	},
	
	ProcessContext : function(context){
		var path = context.pathTail;
		if (path === undefined){
			path = context.url.pathname;
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
				db.collection(DBCode.collection).findOne({path:path}, function(err, result){	
					if (!err && result){
						try{
							context.log("Excuting: ",result._id);
							context.codeProcessed = true;
							context.codeResult = eval(result.code);
							context.log(context.codeResult);
						}
						catch(error){
							context.error(error);	
						}
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
};

Server.ControlFilePath = "./main/Main.htm";


Server.CodeChecker = function(context){
	if (!context.completed && !context.waiting){
		return DBCode.ProcessContext(context);
	}
};

Server.Utilisation = function(context){
	if (!context.completed){
		if (context.codeProcessed){
			context.finish(200, context.codeResult);
		}
		else{
			context.finish(404, "No handlers found for: " + context.url.pathname);
		}
	}
};

Server.MainRouter = function(context){
	context.res.setHeader("Content-Type", "application/html; charset=utf-8");
	/*	fs.exists(Server.ControlFilePath, function(exists){
if (!exists){
context.log(Server.ControlFilePath, " not found");
context.res.setHeader("Content-Type", "text/plain; charset=utf-8");
context.finish(200,  "Klab server v. " + Server.Config.ver);
return;
}
});*/
	fs.readFile(Server.ControlFilePath, function(err, result){
		if (err){
			context.log(err);
			context.res.setHeader("Content-Type", "text/plain; charset=utf-8");
			context.finish(200,  "Klab server v. " + Server.Config.ver);
			return;
		}
		context.res.setHeader("Content-Type", "	text/html; charset=utf-8");
		result = (result+"").replace("<div id='serverVer'></div>", "<div id='serverVer'>" + Server.Config.ver +  "</div>");
		context.finish(200, result);
		context.continue();
	});	
	
	return false;
};

Server.Process = function(req, res){
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
	res.setHeader("Access-Control-Allow-Headers", "debug-mode,origin,content-type");
	res.setHeader("Access-Control-Max-Age", "12000");
	res.setHeader("Access-Control-Expose-Headers", "content-type,debug-mode,Content-Type,ETag,Finish,Date,Start,Load");
	
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	if (req.method == 'OPTIONS'){
		res.statusCode = 200;
		res.end("OK");	
		return;
	}
	
	try{
		var context = Server.Router.GetContext(req, res, Server.Config.Path);
		Server.Router.Process(context);	
	}
	catch (e){
		log.error(e);
		if (context){
			context.error(e);
		}
		else{
			console.log(e);
		}
	}
};

Server.RouteModuleForPath = function(file, path, router){
	var mapPath = path;
	if (path.end(">") || path.end("<")) path = path.substr(0, path.length - 1);
	if (path.end("/") && path.length > 1) path = path.substr(0, path.length - 1);
	//log.debug("loading module for path: " + path);
	db.collection("configs").findOne({path: path}, function(err, result){
		var handler = require("." + file)(result, Server, mapPath, path);
		if (handler){
			if (typeof(handler) == "object"){
				handler._ModuleName = file;
			}
			router.for("mainMap", Server.RootPath + mapPath, handler);
		}
		//Server.Map[Server.RootPath + mapPath] = "." + file;
	});
};

Server.Start = function(config){
	Server.Logger = log;
	var router = Server.Router = RouterModule;
	var server = http.createServer(Server.Process);
	Server.Config = config;
	if (config.mode == "master"){
		router.map("authorization");		
	}
	router.map("mainMap", 
			   {
				   "/": Server.MainRouter,
				   "/map": {
					   GET : function(context){
						   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
						   
						   context.finish(200, JSON.stringify(Server.CreateMap(router.Handlers.mainMap)));
					   }
				   },
				   "/config": {
					   GET : function(context){
						   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
						   context.finish(200, JSON.stringify(Server.Config));
						   return false;
					   }
				   },
				   
				   "<": [Server.CodeChecker, Server.Utilisation]
			   });
	if (config.modules){
		for (var path in config.modules){
			var file = config.modules[path];
			if (typeof (file) == 'string'){
				if (!file.start("/")) file = "/" + file;
				Server.RouteModuleForPath(file, path, router);
			}
			if (typeof (file) == 'array'){
				for (var i = 0; i < file.length; i++){
					if (!file[i].start("/")) file[i] = "/" + file[i];
					Server.RouteModuleForPath(file, path, router);
				}
			}			
		}
	}
	
	//console.log(router.Handlers.processMap)
	console.log("KLab server v "  + Server.Config.ver);
	console.log("Args - " + JSON.stringify(process.argv));
	console.log("Listening " +  config.host + ":" + config.port + "");
	if (config.host){
		server.listen(config.port, config.host);
	}
	else{
		server.listen(config.port);	
	}
};


Server.CreateMap = function(routerMapNode){
	if (!routerMapNode) return;
	var mapObj = null;
	for (var item in routerMapNode){
		if (item != "//"){
			var node = routerMapNode[item];
			if (node instanceof Array){
				if (node.length > 0) {
					if (!mapObj) mapObj = {};
					if (node.length > 1) {
						mapObj[item] = [];
						for (var i = 0; i < node.length; i++)
						{
							var to = typeof(node[i]);
							if (to == "object"){
								to = (node[i]._ModuleName ? node[i]._ModuleName : "")  + "{" 
									+ (node[0].GET ? "GET," : "")
									+ (node[0].POST ? "POST," : "")
									+ (node[0].PUT ? "PUT," : "")
									+ (node[0].DELETE ? "DEL," : "")
									+ (node[0].SEARCH ? "SRCH," : "")   
									+ (node[0].HEAD ? "HEAD," : "")
									+ (node[0].OPTIONS ? "OPTS," : "");
								to = to.trim(",") + "}";
								
							}
							if (to == "function"){
								to += " " + node[i].name;
							}
							mapObj[item].push(to);
						}
					}
					else{
						var to = typeof(node[0]);
						if (to == "object"){
							to = (node[0]._ModuleName ? node[0]._ModuleName : "")  + "{" 
								+ (node[0].GET ? "GET," : "")
								+ (node[0].POST ? "POST," : "")
								+ (node[0].PUT ? "PUT," : "")
								+ (node[0].DELETE ? "DEL," : "")
								+ (node[0].SEARCH ? "SRCH," : "")   
								+ (node[0].HEAD ? "HEAD," : "")
								+ (node[0].OPTIONS ? "OPTS," : "");
							to = to.trim(",") + "}";
							
						}
						if (to == "function"){
							to += " " + node[0].name;
						}
						mapObj[item] = to;
					}
				}
			}
			else{
				var value = Server.CreateMap(node);
				if (value){
					if (!mapObj) mapObj = {};
					mapObj[item] = value;
				}
			}
		}
	}
	return mapObj;
};

Server.Init();

//process.on('exit')

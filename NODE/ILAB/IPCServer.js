var Url = require('url');
var fs = require('fs');
var Path = require('path');
try{
	require("./ILAB/Modules/Node/Utils.js");
	require("./ILAB/Modules/Channels.js");
	require("./ILAB/Modules/Node/ChildProcess.js");
	var RouterModule = require("./ILAB/Modules/Node/Router.js");
	var Files = require("./ILAB/Modules/Node/Files.js");
	require('./ILAB/Modules/Node/Logger.js');

	Server = server = {};
	
	Server.Config = JSON.parse(process.argv[2]);
		
	Server.Process = function(req, res){		
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		if (req.method == 'OPTIONS'){
			res.statusCode = 200;
			res.end("OK");	
			return;
		}
		var url = Url.parse(req.url);
		try{
			var context = Server.Router.GetContext(req, res, "");
			Server.Router.Process(context);	
		}
		catch (e){
			error(e);
			if (context){
				context.error(e);
			}
		}
	};
	
	Server.SendResponse = function(id, status, result, headers){
		//console.log("response: id" + id + " size " + result ? result.length : " - ");
		Channels.emit("http-response.id" + id, id, status, result, headers);	
	};
	
	Server.Context = function(id, url, path, headers){
		if (typeof(url) == "string") url = Url.parse(url, true);
		context = { id : id, url : url, path : path, pathTail : path, pathName: path };
		context.req = {};
		context.req.headers = headers;
		context.res = {};
		context.res.headers = {};
		context.res.setHeader = function(name, value){
			this.headers[name] = value;
		}
		context.finish = function(status, result, encoding){
			if (encoding){
				this.res.headers.encoding = encoding;
			}
			Server.SendResponse(this.id, status, result, this.res.headers);
		}
		context.continue = function(){
		
		}
		return context;
	};
	
	Server.Init = function(){
		var config = Server.Config;
		console.log(config);
		var router = Server.Router = RouterModule;
		var filesRouter = Files(config, Server);
		Channels.on("/http-request.get", function(route, id, url, headers){ 
			var path = route.current;
			var context = Server.Context(id, url, path, headers);
			if (config.basepath){
				path = config.basepath + path;
			}
			if (path.indexOf(".") != 0){
				path = "." + path;   
			}
			path = Path.resolve(path);
			fs.stat(path, function(err, stat){
				if (err){
					Server.SendResponse(id, 500, "Not found path: " + path); 
					return;
				}
				if (url.query["action"]){				
					if (stat.isFile()){
						fs.readFile("./TextEditor.htm", "utf8", function(err, result){   
							if (err){
								Server.SendResponse(id, 500, "Not found files view page " + err);
								return;
							}						
							Server.SendResponse(id, 200, result, {"Content-Type" : "text/html; charset=utf-8"});
						});
						return;
					}
				}
				else{
					if (stat.isDirectory()){
						fs.readFile("./files.htm", "utf8", function(err, result){   
							if (err){
								Server.SendResponse(id, 500, "Not found files view page " + err);
								return;
							}		
							Server.SendResponse(id, 200, result, {"Content-Type" : "text/html; charset=utf-8"});
						});
						return true;
					}
					else{
						filesRouter.GET(context);
					}
				}
			});		
		});
		Channels.on("/http-request.post", function(route, id, url, headers, data){ 
			var path = route.current;
			var context = Server.Context(id, url, path, headers);
			filesRouter.SEARCH(context);
		});
		Channels.on("/http-request.search", function(route, id, url, headers){ 
			var path = route.current;
			var context = Server.Context(id, url, path, headers);
			filesRouter.SEARCH(context);
		});
		console.log("KLab server v "  + Server.Config.ver);
	};
	
	Server.Init();
}
catch(e){
	if (this.error){
		error(e);	
		process.exit();
	}
	else{
		throw(e);
	}
}


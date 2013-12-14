var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
try{
	require(Path.resolve("./ILAB/Modules/Node/Utils.js"));
	require(Path.resolve("./ILAB/Modules/Channels.js"));
	var channelsClient = require(Path.resolve("./ILAB/Modules/Node/ChannelsClient.js"));
	require(Path.resolve("./ILAB/Modules/Node/ChildProcess.js"));
	var RouterModule = require(Path.resolve("./ILAB/Modules/Node/Router.js"));
	require(Path.resolve('./ILAB/Modules/Node/Logger.js'));

	process.on('SIGTERM', function() {

	});
	
	
	ManagedServer = function(){;
		var args = {
			Port: 80
		};
		//console.log(process.argv);
		if (process.argv[2]){
			args = process.argv[2];
			args = JSON.parse(args);
		}
		
		this.Config = args;
		var serv = this;
		process.on('exit',function(){	
			if (serv.HTTPServer){
				serv.HTTPServer.close();
			}
		});
		this.ProcessRequest = function(req, res, url){
			return serv._ProcessRequest(req, res, url);
		};
		
		this.ProcessContext = function(context){
			return serv._ProcessContext(context);	
		}
	}
		
	ManagedServer.prototype.Init = function(config, globalConfig, logger , router){
		if (config){
			this.Config = config;
		}
		this.RootPath = this.Config.Path;
		if (!this.RootPath) this.RootPath = "";
		if (!this.Config.ProxyPort) this.Config.ProxyPort = this.Config.Port;
		this.MainRouter = RouterModule();
		this.MainRouter.for("Main", "/map", {
			GET : function(context){
				context.res.setHeader("Content-Type", "application/json; charset=utf-8");
				context.finish(200, JSON.stringify(ManagedServer.CreateMap(context.router.Handlers.Main)));
		    }
        });
		this.MainRouter.for("Main", "/channels/>", channelsClient);
		if (this.Config.File){
			this.module = require(Path.resolve(this.Config.File));
			if (typeof this.module == "function"){
				this.module(this.Config, this.MainRouter, router, logger);
			}
			if (typeof this.module == "object" && this.module.Init){
				this.module.Init(this.Config, this.MainRouter, router, logger);
			}
		}
		if (!module.parent){
			this.Enabled = true;
			var serv = this;
			setTimeout(function(){
				serv.Start();
			}, 100);
		}
	};
	
	ManagedServer.prototype.Start = function(callback){
		if (!module.parent){
			console.log("Managed server v "  + 1.3 + " on " + this.Config.Host + ":" + this.Config.ProxyPort + " with " + this.Config.File);
			if (!this.HTTPServer){
				this.HTTPServer = http.createServer(this.ProcessRequest);
				this.HTTPServer.listen(this.Config.ProxyPort);
				if (typeof callback == "function"){
					callback();
				}
			}
		}
		else{		
			console.log("Managed server v "  + 1.3 + " module on " + this.Config.Host + this.Config.Path +  " with " + this.Config.File);
			this.Enabled = true;
			if (typeof callback == "function"){
				callback();
			}
		}
	};
	
	
	ManagedServer.prototype.Stop = function(callback){
		if (!module.parent){
			if (this.HTTPServer){
				this.HTTPServer.close();
				this.HTTPServer = null;
				if (typeof callback == "function"){
					callback();
				}
			}
		}
		else{
			this.Enabled = false;
			if (typeof callback == "function"){
				callback();
			}
		}
	};
	
	ManagedServer.prototype._ProcessRequest = function(req, res){
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
		res.setHeader("Server", "Managed server");		
		if (req.method == 'OPTIONS'){
			res.statusCode = 200;
			res.end("OK");	
			return;
		}
		var url = Url.parse(req.url);
		try{
			if (this.Enabled){
				var context = this.MainRouter.GetContext(req, res, this.RootPath);
				var serv = this;
				var fullData = "";
				req.on("data", function(data){
					fullData += data;		
				});
				req.on("end", function(){
					context.data = fullData;
					serv.MainRouter.Process(context);	
				});
				return false;
			}
			else{
				res.statusCode = 403;
				res.end("Server disabled");	
			}			
		}
		catch (e){
			if (context){
				context.error(e);
			}
			res.statusCode = 500;
			res.end(e.message);	
			throw e;
		}
		return true;
	};
	
	ManagedServer.prototype._ProcessContext = function(context){
		var url = Url.parse(context.req.url);
		context.abort();
		var serv = this;
		var newContext = this.MainRouter.GetContext(context.req, context.res, this.RootPath);
		var fullData = "";
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			newContext.data = fullData;
			serv.MainRouter.Process(newContext);	
		});
		return false;
	};
	
	ManagedServer.CreateMap = function(routerMapNode){
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
					var value = ManagedServer.CreateMap(node);
					if (value){
						if (!mapObj) mapObj = {};
						mapObj[item] = value;
					}
				}
			}
		}
		return mapObj;
	};
		
	if (module.parent){
		module.exports = function(){
			return new ManagedServer();
		}
	}
	else{
		var ms = new ManagedServer();
		ms.Init();
	}
}
catch(e){
	if (this.error){
		error(e);	
		if (!module.parent){
			process.exit();
		}
	}
	else{
		throw(e);
	}
}


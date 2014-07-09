var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
var vm = require('vm');
try{
	require(Path.resolve("./ILAB/Modules/Utils.js"));
	require(Path.resolve("./ILAB/Modules/Channels.js"));
	var channelsClient = require(Path.resolve("./ILAB/Modules/ChannelsClient.js"));
	require(Path.resolve("./ILAB/Modules/ChildProcess.js"));
	var RouterModule = require(Path.resolve("./ILAB/Modules/Router.js"));
	require(Path.resolve('./ILAB/Modules/Logger.js'));

	process.on('SIGTERM', function() {

	});
	
	
	VirtualServer = function(){;
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
			if (serv.Stop){
				serv.Stop();
			}
		});
		this.ProcessRequest = function(req, res, url){
			return serv._ProcessRequest(req, res, url);
		};
		
		this.ProcessContext = function(context){
			return serv._ProcessContext(context);	
		}
	}
		
	VirtualServer.prototype.Init = function(config, globalConfig, logger , router){
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
		this.MainRouter.for("Main", "/channels/<", channelsClient);
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
	
	VirtualServer.prototype.Start = function(callback, server){
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
			this.HTTPServer = server;
			if (typeof callback == "function"){
				callback();
			}
		}
		if (this.module && this.module.Start){
			this.module.Start(this.HTTPServer);
		}
	};
	
	
	VirtualServer.prototype.Stop = function(callback, server){
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
		if (this.module && this.module.Stop){
			this.module.Stop(this.HTTPServer);
		}
	};
	
	VirtualServer.prototype._ProcessRequest = function(req, res){
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
		res.setHeader("Server", "Virtual server");		
		res.setHeader("Access-Control-Max-Age", "12000");
		res.setHeader("Content-Type", "text/javascript; charset=utf-8");
		if (req.method == 'OPTIONS'){
			res.statusCode = 200;
			res.end("OK");	
			return;
		}
		var url = Url.parse(req.url);
		try{
			if (this.Enabled){
				var serv = this;
				var fullData = "";
				req.on("data", function(data){
					fullData += data;		
				});
				req.on("end", function(){
					res.statusCode = 200;
					res.end(JSON.stringify(eval(fullData)));					
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
	
	VirtualServer.prototype._ProcessContext = function(context){
		var url = Url.parse(context.req.url);
		var serv = this;
		var fullData = "";
		context.res.setHeader("Content-Type", "text/javascript; charset=utf-8");
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			context.finish(200, eval(fullData));
			context.continue();
		});
		return false;
	};
	
	if (module.parent){
		module.exports = function(){
			return new VirtualServer();
		}
	}
	else{
		var ms = new VirtualServer();
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


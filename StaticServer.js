var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
try{
	require(Path.resolve("./Modules/Node/Utils.js"));
	require(Path.resolve("./Modules/Channels.js"));
	require(Path.resolve("./Modules/Node/ChildProcess.js"));
	var Files = require(Path.resolve("./Modules/Node/Files.js"));
	require(Path.resolve('./Modules/Node/Logger.js'));

	process.on('SIGTERM', function() {

	});
	
	global.StaticServer = function(){
		var args = {
			Port: 80
		};
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
		this.ProcessRequest = function(req, res){
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
			res.setHeader("Access-Control-Max-Age", "12000");
			res.setHeader("Content-Type", "text/plain; charset=utf-8");
			if (req.method == 'OPTIONS'){
				res.statusCode = 200;
				res.end("OK");	
				return;
			}
			var url = Url.parse(req.url);
			try{
				if (serv.Enabled){
					if (serv.Config.DefaultFile && (url.pathname == "" || url.pathname == "/")){
						url.pathname += serv.Config.DefaultFile;
					}
					serv.FilesRouter.ProcessRequest(req, res, url);	
				}
				else{
					res.statusCode = 403;
					res.end("Server disabled");	
				}
			}
			catch (e){
				error(e);
			}
		};
		
		this.ProcessContext = function(context){
			context.setHeader("Access-Control-Allow-Origin", "*");
			context.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
			context.setHeader("Access-Control-Max-Age", "12000");		
			context.setHeader("Content-Type", "text/plain; charset=utf-8");
			if (context.req.method == 'OPTIONS'){
				context.finish(200, "OK");	
				return true;
			}
			try{
				if (serv.Enabled){
					if (serv.Config.DefaultFile && (context.pathTail == "" || context.pathTail == "/")){
						context.pathTail += serv.Config.DefaultFile;
					}
					return serv.FilesRouter[context.req.method](context);
				}
				else{
					context.finish(403, "Server disabled");	
				}
			}
			catch (e){
				error(e);
			}
			return true;
		};
	};
	
	global.StaticServer.prototype.Init = function(config, globalConfig, logger){
		if (config){
			this.Config = config;
		}
		if (!this.Config.ProxyPort) this.Config.ProxyPort = this.Config.Port;
		this.FilesRouter = Files(this.Config, this, logger);
		if (!module.parent){
			var serv = this;
			setTimeout(function(){
				serv.Start();
			}, 100);
		}
	};
	
	global.StaticServer.prototype.Start = function(callback){
		if (!module.parent){
			console.log("Static server v 1.0 on " + this.Config.Host + ":" + this.Config.ProxyPort);
			if (!this.HTTPServer){
				this.HTTPServer = http.createServer(this.ProcessRequest);
				this.HTTPServer.listen(this.Config.ProxyPort);
				if (typeof callback == "function"){
					callback();
				}
			}
		}
		else{
			console.log("Static server Module v 1.0 on "  + this.Config.Host + this.Config.Path);
			this.Enabled = true;
			if (typeof callback == "function"){
				callback();
			}
		}
	};
	
	global.StaticServer.prototype.Stop = function(callback){
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
		
	if (module.parent){
		module.exports = function(){
			return new StaticServer();
		}
	}
	else{
		var ss = new StaticServer();
		ss.Init();
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


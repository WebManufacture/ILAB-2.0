var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
try{
	require(Path.resolve("./ILAB/Modules/Node/Utils.js"));
	require(Path.resolve("./ILAB/Modules/Channels.js"));
	var channelsClient = require("./ILAB/Modules/Node/ChannelsClient.js");
	require(Path.resolve("./ILAB/Modules/Node/ChildProcess.js"));
	var RouterModule = require("./ILAB/Modules/Node/Router.js");
	require(Path.resolve('./ILAB/Modules/Node/Logger.js'));
		
	ProxiedServer = function(){;
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
		this.ProcessRequest = function(req, res, url){
			return serv._ProcessRequest(req, res, url);
		};
		
		this.ProcessContext = function(context){
			return serv._ProcessContext(context);	
		}
	}
		
	ProxiedServer.prototype.Init = function(config, globalConfig, logger){
		if (config){
			this.Config = config;
		}
		if (!this.Config.ProxyPort) this.Config.ProxyPort = this.Config.Port;
		if (this.Config.File){
			this.module = require(Path.resolve(this.Config.File));
			if (this.module && this.module.Init){
				this.module.Init(this.Config, logger);
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
	
	ProxiedServer.prototype.Start = function(callback){
		if (!module.parent){
			console.log("Proxied server v "  + 1.3 + " on " + this.Config.Host + ":" + this.Config.ProxyPort + " with " + this.Config.File);
			if (!this.HTTPServer){
				this.HTTPServer = http.createServer(this.ProcessRequest);
				this.HTTPServer.listen(this.Config.ProxyPort);
				if (typeof callback == "function"){
					callback();
				}
			}
		}
		else{		
			console.log("Proxied server v "  + 1.3 + " module on " + this.Config.Host + this.Config.Path +  " with " + this.Config.File);
			this.Enabled = true;
			if (typeof callback == "function"){
				callback();
			}
		}
	};
	
	
	ProxiedServer.prototype.Stop = function(callback){
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
	
	ProxiedServer.prototype._ProcessRequest = function(req, res){
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
		res.setHeader("Access-Control-Max-Age", "12000");
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		if (req.method == 'OPTIONS'){
			res.statusCode = 200;
			res.end("OK");	
			return;
		}
		var url = Url.parse(req.url);
		try{
			if (this.Enabled){
				var serv = this.module;
				if (serv){
						var fullData = "";
						mixin(res, ProxiedServer.ResExtender);
						req.on("data", function(data){
							fullData += data;		
						});
						if (typeof serv.Process == "function"){
							req.on("end", function(){
								serv.Process(req, res, url, fullData);
							});
							return false;
						}
						if (typeof serv.Process == "object"){
							if (typeof serv.Process[req.method] == "function"){
								req.on("end", function(){	
									serv.Process[req.method](req, res, url, fullData);
								});
								return false;
							}
						}						
						res.statusCode = 500;
						res.end("Handler error");
				}	
				else{
					res.statusCode = 500;
					res.end("Module error");	
				}
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
	
	ProxiedServer.prototype._ProcessContext = function(context){
		var req = context.req;
		var res = context.res;
		var url = Url.parse(req.url);
		if (ProxiedServer.Enabled){
			var serv = this.module;
			if (serv){
				var fullData = "";
				mixin(res, ProxiedServer.ResExtender);
				req.on("data", function(data){
					fullData += data;		
				});
				if (typeof serv.Process == "function"){
					context.abort();
					req.on("end", function(){				
						serv.Process(req, res, url, fullData);
					});
					return false;
				}
				if (typeof serv.Process == "object"){
					if (typeof serv.Process[req.method] == "function"){
						context.abort();
						req.on("end", function(){	
							serv.Process[req.method](req, res, url, fullData);
						});
						return false;
					}						
				}
			}	
		}
		return true;
	};
		
	ProxiedServer.ResExtender = {
		finish : function(status, result, enc){
					this.statusCode = status;
					if (result == null || result == undefined){
						if (isNaN(parseInt(status))){
							result = status;
							status = 200;
						}
					}
					if (result != null && result != undefined && typeof result != "string"){
						this.setHeader("Content-Type", "application/json");
						result = JSON.stringify(result);
					}
					if (enc){
						this.end(result, enc);
					}
					else{
						this.end(result);
					}
				},
				
		finishText : function(){
			this.setHeader("Content-Type", "text/plain");
			this.finish.apply(this, arguments);
		},
		
		finishHtml : function(){
			this.setHeader("Content-Type", "text/html");
			this.finish.apply(this, arguments);
		}		
	}
	
	if (module.parent){
		module.exports = function(){
			return new ProxiedServer();
		}
	}
	else{
		var ms = new ProxiedServer();
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


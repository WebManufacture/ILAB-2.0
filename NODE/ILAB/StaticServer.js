var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
try{
	require(Path.resolve("./ILAB/Modules/Node/Utils.js"));
	require(Path.resolve("./ILAB/Modules/Channels.js"));
	require(Path.resolve("./ILAB/Modules/Node/ChildProcess.js"));
	var Files = require(Path.resolve("./ILAB/Modules/Node/Files.js"));
	require(Path.resolve('./ILAB/Modules/Node/Logger.js'));

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
					var fpath = Path.resolve(serv.FormatPath(url.pathname));
					if (req.method == "GET"){						
						var inm = req.headers["if-none-match"];
						if (inm && serv.LastFiles[fpath] == inm){
							res.statusCode = 304;
							res.end();	
							return;
						}
						else{
							url.etag = (Math.random() + "").replace("0.", "");
							serv.LastFiles[fpath] = url.etag;
						}
					}
					if (req.method == "DELETE" || req.method == "POST" || req.method == "PUT" ){
						if (serv.Config.Mode && serv.Config.Mode == "ReadOnly"){
							res.statusCode = 403;
							res.end();	
							return;
						}
						delete serv.LastFiles[fpath];
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
					var fpath = Path.resolve(serv.FormatPath(context.pathTail));
					if (context.req.method == "GET"){						
						var inm = context.req.headers["if-none-match"];
						if (inm && serv.LastFiles[fpath] == inm){
							context.finish(304);	
							return true;
						}
						else{
							context.etag = (Math.random() + "").replace("0.", "");
							serv.LastFiles[fpath] = context.etag;
						}
					}
					if (context.req.method == "DELETE" || context.req.method == "POST" || context.req.method == "PUT" ){
						if (serv.Config.Mode && serv.Config.Mode == "ReadOnly"){
							context.finish(403);
							return true;
						}
						delete serv.LastFiles[fpath];
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
	
	
	global.StaticServer.prototype.FormatPath = function(fpath){
		fpath = fpath.replace(/\//g, "\\");
		if (!fpath.start("\\")) fpath = "\\" + fpath;
		fpath = this.Config.basepath + fpath;
		fpath = fpath.replace(/\//g, "\\");
		if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
		return fpath.toLowerCase();
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
		this.LastFiles = {};
		var serv = this;
		if (!this.Config.basepath){
			this.Config.basepath = ".";
		}
		if (this.Config.basepath.end("\\")){
			this.Config.basepath = this.Config.basepath.substr(0, this.Config.basepath.length - 1);
		}
		this.Config.basepath = this.Config.basepath.replace(/\//g, "\\");
		//console.log(this.Config.basepath);
		this.watcher = fs.watch(Path.resolve(this.Config.basepath), {}, function(event, fname){
			delete serv.LastFiles[Path.resolve(fname)];		
		});
		process.on("exit", function(){
			serv.watcher.close();
		});		
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


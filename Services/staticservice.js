var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

try{
	require(Path.resolve("./ILAB/Modules/Utils.js"));
	require(Path.resolve("./ILAB/Modules/Channels.js"));
	require(Path.resolve("./ILAB/Modules/ChildProcess.js"));
	var Files = require(Path.resolve("./ILAB/Modules/Files.js"));
	require(Path.resolve('./ILAB/Modules/Logger.js'));
	require(Path.resolve('./ILAB/Modules/Async.js'));

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
			//res.setHeader("Content-Type", "text/plain; charset=utf-8");
			if (req.method == 'OPTIONS'){
				res.statusCode = 200;
				res.end("OK");	
				return;
			}
			var url = Url.parse(req.url, true);
			try{
				if (serv.Enabled){
					if (serv.Config.DefaultFile && (url.pathname == "" || url.pathname == "/")){
						url.pathname += serv.Config.DefaultFile;
					}
					var fpath = Path.resolve(serv.FormatPath(url.pathname));
					var result = serv.ProcessCache(req, res, fpath, url, url.query);
					if (result > 0){
						res.statusCode = result;
						res.end();
						return;
					}
					if (req.method == "GET" && url.query["join"]){
						serv.ConcatDir(req, res, fpath, url.query);
						return;
					}
					result = serv.FilesRouter.ProcessRequest(req, res, url);
					if (res.getHeader("Content-Type")){
						serv.LastTypes[fpath] = res.getHeader("Content-Type");
					}
					return result;
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
			//context.setHeader("Content-Type", "text/plain; charset=utf-8");
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
					var result = serv.ProcessCache(context.req, context.res, fpath, context.url.query);
					if (result > 0){
						context.finish(result)
						return true;
					}
					if (context.req.method == "GET" && context.url.query["join"]){
						serv.ConcatDir(context.req, context.res, fpath, context.url.query);
						context.abort();
						return true;
					}
					result = serv.FilesRouter[context.req.method](context);
					if (context.res.getHeader("Content-Type")){
						serv.LastTypes[fpath] = context.res.getHeader("Content-Type");
					}
					return result;
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

	global.StaticServer.prototype.ConcatDir = function(req, res, fpath, query){
		if (query["content-type"]){
			res.setHeader("Content-Type", query["content-type"] + "");
			this.LastTypes[fpath] = query["content-type"];
		}
		fs.readdir(fpath, function(err, files){
			try{
				if (err){
					res.statusCode = 500;
					res.end("readdir " + fpath + " error " + err);
					return;
				}
				var collector = new Async.Collector(files.length);
				for (var i = 0; i < files.length; i++){
					var fname = fpath + "\\" + files[i];	
					//console.log('concat ' + fname);
					collector.createParametrizedCallback(fname, function(file, callback){
						fs.stat(file, function(err, stat){
							//console.log('Stat file ' + file);
							if (err){
								callback("");
								return;
							}
							var ext = Path.extname(file);		
							ext = ext.replace(".", "");
							ext = StaticServer.MimeTypes[ext];
							if (stat.isFile()){
								fs.readFile(file, 'utf-8', function(err, result){
									//console.log('Read file ' + file);
									if (err){
										callback("");
										return;
									}
									callback(result);
								});
							}
							else{
								callback("");
							}
						});	
					});
				}/*
				collector.on('handler', function(param, count){
					console.log('Handler complete ' + this.count + " " + count);
				});*/
				collector.on('done', function(results){
					var result = "";
					if (query.first){
						result += query.first;
					}
					for (var i = 0; i < results.length; i++){
						if (results[i] && results[i] != ""){
							result += results[i];
							if (query.delimeter && i < results.length - 1){
								result += query.delimeter;
							}
						}
					};
					if (query.last){
						result += query.last;
					}
					res.statusCode = 200;
					res.end(result);				
				});
				collector.run();
			}
			catch(error){
				res.statusCode = 500;
				res.end(error);
				return;
			}
		});
		return false;
	};

	global.StaticServer.prototype.ProcessCache = function(req, res, fpath, query){
		var serv = this;
		if (req.method == "GET"){
			if (query["content-type"]){
				res.setHeader("Content-Type", query["content-type"] + "");
			}
			else{
				//res.setHeader("Content-Type", "text/plain; charset=utf-8");
			}
			var dnow = new Date();
			res.setHeader("Cache-Control", "max-age=3600");
			res.setHeader("Expires", new Date(dnow.valueOf() + 1000 * 3600).toString());
			var inm = req.headers["if-none-match"];
			if (inm && serv.LastFiles[fpath] == inm){
				if (serv.LastTypes[fpath]){
					res.setHeader("Content-Type", serv.LastTypes[fpath]);
				}
				return 304;
			}
			else{
				var etag = (Math.random() + "").replace("0.", "");
				res.setHeader("ETag", etag);
				serv.LastFiles[fpath] = etag;
			}
			return 0;
		}
		if (req.method == "DELETE" || req.method == "POST" || req.method == "PUT" ){
			if (serv.Config.Mode && serv.Config.Mode == "ReadOnly"){
				return 403;
			}
			delete serv.LastFiles[fpath];
			delete serv.LastTypes[fpath];
		}
		return 0;
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
		this.LastTypes = {};
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
			delete serv.LastTypes[Path.resolve(fname)];
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
	
	
	global.StaticServer.MimeTypes = {
		htm : "text/html; charset=utf-8",
		html : "text/html; charset=utf-8",
		js : "text/javascript; charset=utf-8",
		css : "text/css; charset=utf-8",
		json : "text/json; charset=utf-8",
		png : "images/png",
		gif : "images/gif",
		jpg : "images/jpeg",
		bmp : "images/bmp",
		ttf : "font/truetype; charset=utf-8"
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


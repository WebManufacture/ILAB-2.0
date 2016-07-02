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
		
		this.ProcessRequest = CreateClosure(this._ProcessRequest, this);
		this.ProcessContext = CreateClosure(this._ProcessContext, this);
		/*
		this.ProcessRequest = function(req, res){
			return serv._ProcessRequest(req, res);
		};

		this.ProcessContext = function(context){
			return serv._ProcessContext(context);
		};
		*/
		
		process.on('EXITING', function() {
			if (serv.HTTPServer){
				serv.HTTPServer.close();
			}
			process.exit();
		});
		
		process.on('exit',function(){	
			if (serv.HTTPServer){
				serv.HTTPServer.close();
			}
		});		
	};
	
	global.StaticServer.prototype._process = function(context){
		var serv = this;
		if (serv.Config.DefaultFile && (context.pathTail == "" || context.pathTail == "/")){
			context.pathTail += serv.Config.DefaultFile;
		}
		var fpath = Path.resolve(serv.FormatPath(context.pathTail)).toLowerCase();
		var result = serv.ProcessCache(context.req, context.res, fpath, context.url.query);
		if (result > 0){
			context.finish(result)
			return true;
		}
		var tproc = null;
		if (context.req.method == "GET"){
			if (serv.Map[fpath] == "directory"){
				if (context.url.query["join"]){
					serv.ConcatDir(context.req, context.res, fpath, context.url.query);
					return false;
				}
				else{
					if (serv.defaultTemplate){	
						var pobj = {content: serv.defaultTemplate,
									ext: "htm",
									encoding : 'utf8',
									mime: MimeTypes.html,
									url : context.url,
									statusCode : 200,
									req : context.req,
									res: context.res, 
									context : context, 
									fpath : fpath};
						try{
							var fres =  serv.ProcessTemplates(pobj);
							if (fres){
								context.finish(200, serv.defaultTemplate);
							}
							return fres;
						}
						catch(err){
							console.error(err);
							context.finish(500, JSON.stringify(err), ext);
							return true;
						}
					};
					context.finish(403, "Directory is not able to list.");
					return true;
				}
			}
			if (serv.Map[fpath] == MimeTypes.html){
				tproc = CreateClosure(serv.ProcessTemplates, serv);
			}					
		}	
		result = true;
		if (typeof serv.FilesRouter[context.req.method] == "function"){
			result = serv.FilesRouter[context.req.method](context, null, null, tproc);
		}
		if (context.res.getHeader("Content-Type")){
			serv.LastTypes[fpath] = context.res.getHeader("Content-Type");
		}
		return result;
	};
	
	
	global.StaticServer.prototype._ProcessRequest = function(req, res){
		var url = Url.parse(req.url, true);
		var context = {
			req: req,
			res: res,
			url: url,
			method : req.method,
			etag: url.etag,
			pathTail : url.pathname,
			setHeader : function(){
				if (this.finished) return;
				return res.setHeader.apply(res, arguments);
			},
			getHeader : function(){
				if (this.finished) return;
				return req.getHeader.apply(req, arguments);
			},
			finish: function(header, body, ext){
				if (this.finished) return;
				this.finished = true;
				this.res.statusCode = header;
				this.res.end(body, ext);
			},
			"continue" : function(param){

			},
			"abort" : function(param){

			}
		};
		return this._ProcessContext(context);
	};

	global.StaticServer.prototype._ProcessContext = function(context){
		context.setHeader("Access-Control-Allow-Origin", "*");
		context.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		context.setHeader("Access-Control-Max-Age", "12000");		
		//context.setHeader("Content-Type", "text/plain; charset=utf-8");
		if (context.req.method == 'OPTIONS'){
			context.finish(200, "OK");	
			return true;
		}
		try{
			if (this.Enabled){
				return this._process(context);
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


	global.StaticServer.prototype.ProcessTemplates = function(params){
		if (params.mime == MimeTypes.html){
			var regex = /<:(\w+)([^>]*)>?(.*)<\/:\1>/ig;
			var match;
			var processed = true;
			var fb = new Async.Collector(false, function(results){
				var resNum = 0;
				var content = params.content.replace(regex, function(src){
					if (results[resNum]) return results[resNum++];
					return "";					
				});
				params.context.finish(params.statusCode, content, params.encoding);
				params.context.continue();
			});
			while ((match = regex.exec(params.content)) !== null){
				var pname = match[1];	
				var pconf = match[2];
				var pval = match[3];
				var cp = global.StaticServer.ContentProcessors[pname];
				if (cp){
					processed = false;
					fb.addClosureCallback(cp, this, [params, pval, pconf]);
				}
			}	
			if (!processed) fb.run();
			return processed;
		}
		return true;
	};

	global.StaticServer.ContentProcessors = {
		file : function(params, value, pconf, callback){
		    var fpath = params.fpath + "\\" + value;
			var lf = this.LastFiles[fpath];
			if (lf){
				callback(lf);
			}
			else{
			    console.log("Templating " + fpath);
				fs.readFile(fpath, 'utf8', function(err, result){
					if (err){
						callback(err);
						return;
					}
					callback(result);
				});
			}
		},
		
		http : function(params, value, pconf, callback){
		    var fpath = this.FormatPath(value);
			var lf = this.LastFiles[fpath];
			if (lf){
				callback(lf);
			}
			else{
			    console.log("Getting " + fpath);
			    callback("");
			}
		},
		
		path : function(params, value, pconf, callback){
		    var fpath = this.FormatPath(value);
			var lf = this.LastFiles[fpath];
			if (lf){
				callback(lf);
			}
			else{
			    console.log("Templating " + fpath);
				fs.readFile(fpath, 'utf8', function(err, result){
					if (err){
						callback(err);
						return;
					}
					
					callback(result);
				});
			}
		},
		
		eval : function(params, value, pconf, callback){
			try{
				var result = EvalInContext(value, this, params);
				
			}
			catch(error){
				callback(error + "");
				return;
			}
			callback(result);
		}

	}

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
			//console.log(inm + " " + serv.LastFiles[fpath] + " " + fpath);
			var etag = serv.LastFiles[fpath]; 
			if (!etag){
				etag = (Math.random() + "").replace("0.", "");
				//console.log(etag + " " + fpath);
				serv.LastFiles[fpath] = etag;
			}
			res.setHeader("ETag", etag);
			if (etag == inm){
				if (serv.LastTypes[fpath]){
					res.setHeader("Content-Type", serv.LastTypes[fpath]);
				}
				return 304;
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
		fpath = fpath.replace(/[",']/g, "");
		fpath = fpath.replace(/\//g, "\\");
		if (!fpath.start("\\")) fpath = "\\" + fpath;
		fpath = this.Config.basepath + fpath;
		fpath = fpath.replace(/\//g, "\\");
		if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
		return Path.resolve(fpath).toLowerCase();
	};		

	global.StaticServer.prototype.Init = function(config, globalConfig, logger){
		if (config){
			this.Config = config;
		}
		if (!this.Config.ProxyPort) this.Config.ProxyPort = this.Config.Port;
		this.FilesRouter = Files(this.Config, this, logger);
		//this.getPath = this.FilesRouter.Format
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
		var watchPath = (this.Config.basepath + "").toLowerCase();
		if (watchPath.indexOf(".") == 0){
		    watchPath = watchPath.replace(".", "");
		}
		this.basePath = this.Config.basepath = this.Config.basepath.replace(/\//g, "\\");
		if (this.Config.DefaultTemplate){
			var fpath = this.Config.DefaultTemplate = this.FormatPath(this.Config.DefaultTemplate);
 			fs.readFile(fpath, 'utf8', function(err, result){
				if (!err){
					serv.defaultTemplate = result;
				}
			});
		};
		this.Map = {};
		this.mapCounter = 0;
		this.mapStart = new Date();
		this.filesCounter = 0;
		this._buildFSmap(this.Map, this.basePath);
		//console.log(this.Config.basepath);
		console.log("Monitoring " + "/file-system" + watchPath);
		this.watcher = Channels.on("/file-system" + watchPath, function(event, path){
			if (typeof (path) == 'string'){
				var fname = serv.FormatPath(path);
				if (fname == serv.Config.DefaultTemplate){
					fs.readFile(serv.Config.DefaultTemplate, 'utf8', function(err, result){
						if (!err){
							serv.defaultTemplate = result;
						}
					});
				}
				else{
					delete serv.LastFiles[fname];		
					delete serv.LastTypes[fname];
				}
			}
			else{
				
			}
		});
		/*
		this.watcher = fs.watch(Path.resolve(serv.basePath), {}, function(event, fname){
			if (typeof (fname) == 'string'){
				fname = serv.FormatPath(fname);
				if (fname == serv.Config.DefaultTemplate){
					fs.readFile(serv.Config.DefaultTemplate, 'utf8', function(err, result){
						if (!err){
							serv.defaultTemplate = result;
						}
					});
				}
				else{
					delete serv.LastFiles[fname];		
					delete serv.LastTypes[fname];
				}
			}
			else{
				
			}
		});
		process.on("exit", function(){
			serv.watcher.close();
		});*/		
	};

	global.StaticServer.prototype._buildFSmap = function(map, path){
		var serv = this;
		serv.mapCounter++;
		path = Path.resolve(path).toLowerCase();
		fs.readdir(path, function(err, files){
			map[path] = "directory";
			serv.mapCounter--;
			if (!err){
				serv.mapCounter += files.length
				for (var i = 0; i < files.length; i++){
					var fname = files[i];	
					var fpath = path + "\\" + fname;
					serv._addEntityToMap(map, fpath);
				}
			}
			else{
				console.log(err);
			}
			if (serv.mapCounter <= 0){
				console.log("Mapping finished " + (new Date() - serv.mapStart) + " " + serv.basePath + " " + serv.filesCounter);
			}
		});
	};
	
	global.StaticServer.prototype._addEntityToMap = function(map, path){
		var serv = this;
		path = Path.resolve(path).toLowerCase();
		process.nextTick(function(){
			fs.stat(path, function(err, stat){
				serv.mapCounter--;
				if (!err){
					if (stat.isFile()){				
						var ext = Path.extname(path);		
						ext = ext.replace(".", "");
						ext = StaticServer.MimeTypes[ext];
						if (!ext) ext = 'binary';
						map[path] = ext;
						serv.filesCounter++;
					}
					if (stat.isDirectory()){
						serv._buildFSmap(map, path);
					}
				}
				else{
					console.log(err);
				}
				if (serv.mapCounter <= 0){
					console.log("Mapping finished " + (new Date() - serv.mapStart) + " " + serv.basePath + " " + serv.filesCounter);
				}
			});
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
		png : "image/png",
		gif : "image/gif",
		jpg : "image/jpeg",
		bmp : "image/bmp",
		zip : "application/zip",
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


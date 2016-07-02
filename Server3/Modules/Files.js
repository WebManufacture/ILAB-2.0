var fs = require('fs');
var paths = require('path');
var ChildProcess = require('child_process');
var crypto = require('crypto');
useModule('Channels.js');
var Logger = useModule('Logger.js');


module.exports = function(config, server){
	cfg = config;
	if (!config) cfg = {};
	var router = new FilesRouter(cfg.basepath);
	return router;
};

Files = {
	
};

global.MimeTypes = Files.MimeTypes = {
	htm : "text/html; charset=utf-8",
	html : "text/html; charset=utf-8",
	js : "text/javascript; charset=utf-8",
	css : "text/css; charset=utf-8",
	json : "text/json; charset=utf-8",
	png : "image/png",
	gif : "image/gif",
	jpg : "image/jpeg",
	bmp : "image/bmp",
	svg : "image/svg",
	ttf : "font/truetype; charset=utf-8",
	tap : "application/tap"
};

global.FilesRouter = function(basepath){
	if (!basepath){
		basepath = ".";
	}
	if (typeof basepath != "string"){
		basepath = basepath.basepath;
	}
	if (basepath.end("\\")){
		basepath = basepath.substr(0, basepath.length - 1);
	}
	this.basePath = basepath.replace(/\//g, "\\");
	this.instanceId = (Math.random() + "").replace("0.", "");
	this.config = cfg;
	this.ProcessRequest = function(req, res, url, processCallback){
		if (!url){
			url = Url.parse(req.url);
		}
		var context = {
			req: req,
			res: res,
			url: url,
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
		}
		if (typeof this[req.method] == "function"){
			return this[req.method](context, null, null, processCallback);
		}
		return null;
	};
	var router = this;
	this.GET = function(context, p1, p2, processCallback){
		return router._GET(context, processCallback);
	}
	this.POST = function(context, processCallback){
		return router._POST(context);
	}
	this.PUT = function(context, processCallback){
		return router._PUT(context);
	}
	this.HEAD = function(context, processCallback){
		return router._HEAD(context);
	}
	this.SEARCH = function(context, processCallback){
		return router._SEARCH(context);
	}
};

FilesRouter.prototype.FormatPath = function(fpath){
	fpath = fpath.replace(/\//g, "\\");
	if (!fpath.start("\\")) fpath = "\\" + fpath;
	fpath = this.basePath + fpath;
	fpath = fpath.replace(/\//g, "\\");
	if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
	return fpath.toLowerCase();
}

FilesRouter.getExt = function(pathName){	
	var fpath = this.FormatPath(pathName);
	var ext = paths.extname(fpath);		
	return ext.replace(".", "");
}

FilesRouter.prototype._GET = FilesRouter.prototype._HEAD = function(context, processCallback){	
	if (context.completed) return true;
	var fpath = this.FormatPath(context.pathTail);
	var ext = paths.extname(fpath);		
	var extention = ext = ext.replace(".", "");
	ext = MimeTypes[ext];
	if (!ext){
		context.setHeader("Content-Type", "text/plain; charset=utf-8");
	}
	else{
		context.setHeader("Content-Type", ext);	    
	}
	ext = 'binary';
	var router = this;
	fs.readFile(paths.resolve(fpath), ext, function(err, result){
		if (err){
			context.finish(500, "File " + fpath + " read error " + err);
			return;
		}		
		//var buf = new Buffer(result);
		if (result.length < 1000000){
			context.setHeader("Content-Length", result.length);
		}	
		fpath = paths.resolve(fpath);
		if (typeof (processCallback) == "function"){
			var pobj = {content: result, ext: extention, encoding : ext, mime: context.res.getHeader("Content-Type"), statusCode : 200, req : context.req, res: context.res, context : context, fpath : fpath};
			try{
				var fresult = processCallback(pobj);
				if (!fresult){
					return;
				}
			}
			catch(err){
				console.error(err);
				console.log(processCallback + "");
				context.finish(500, JSON.stringify(err), ext);
				context.continue();
				return;
			}
		}
		context.finish(200, result, ext);		
		context.continue();
	});	
	return false;
};

FilesRouter.prototype._SEARCH = function(context){
	if (context.completed) return true;
	var fpath = this.FormatPath(context.pathTail);
	fs.readdir(paths.resolve(fpath), function(err, files){
		if (err){
			context.finish(500, "readdir " + fpath + " error " + err);
			context.continue();
			return;
		}
		try{
			context.setHeader("Content-Type", "application/json; charset=utf-8");
			for (var i = 0; i < files.length; i++){
				var fname = files[i];			
				files[i] = fs.statSync(fpath + "\\" + fname);
				files[i].name = fname;
				files[i].fileType = files[i].isDirectory() ? "directory" : files[i].isFile() ? "file" : "unknown";
			}
			context.finish(200, JSON.stringify(files));
		}
		catch(error){
			context.finish(500, "readdir " + fpath + " error " + error);
		}
		context.continue();
	});
	return false;
};

FilesRouter.prototype._DELETE = function(context){
	if (context.completed) return true;
	var fpath = this.FormatPath(context.pathTail);
	var files = this;
	fs.exists(paths.resolve(fpath), function(exists){
		if (!exists){
			context.finish(404, "file " + fpath + " not found");
			return;
		}
		info("Deleting " + fpath);
		fs.unlink(fpath, function(err, result){
			if (err){
				Channels.emit("/file-system#" + files.instanceId + ".delete.error/" + fpath, fpath.replace(files.basePath, ""), err, files.basePath);
				context.finish(500, "Delete error " + fpath + " " + err);	
				context.continue();
				return;
			}			
			Channels.emit("/file-system#" + files.instanceId + ".delete/" + fpath, fpath.replace(files.basePath, ""), files.basePath );
			context.finish(200, "Deleted " + fpath.replace(files.basePath, ""));			
			context.continue();
		});
	});
	return false;
};

FilesRouter.prototype._POST = FilesRouter.prototype._PUT = function(context){
	if (context.completed) return true;
	var fpath = this.FormatPath(context.pathTail);
	var fullData = "";
	//console.log("updating cache: " + fpath + " " + this.LastFiles[fpath]);
	var files = this;
	var writeFunc = function(){
		info("Writing " + fpath);
		fs.writeFile(paths.resolve(fpath), fullData, 'binary', function(err, result){
			if (err){
				context.finish(500, "File " + fpath + " write error " + err);
				Channels.emit("/file-system#" + files.instanceId + ".write.error/" + fpath, fpath.replace(files.basePath, ""), err, files.basePath );
				return;
			}
			Channels.emit("/file-system#" + files.instanceId + ".write/" + fpath, fpath.replace(files.basePath, ""), fullData );
			context.finish(200);
			context.continue();
		});	
	}
	/*var writable = fs.createWriteStream(fpath);		
		context.req.pipe(writable);
		writable.on('finish', function() {
			context.finish(200);
			context.continue();
		});*/
		
		
	if (context.data == undefined){
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", writeFunc);
	}
	else{
		fullData = context.data;
		writeFunc();
	}
	return false;
};


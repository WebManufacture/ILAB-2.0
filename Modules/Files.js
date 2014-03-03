var fs = require('fs');
var paths = require('path');
var ChildProcess = require('child_process');
var crypto = require('crypto');
require(paths.resolve('./ILAB/Modules/Channels.js'));
require(paths.resolve('./ILAB/Modules/Logger.js'));


module.exports = function(config, server){
	cfg = config;
	if (!config) cfg = {};
	var router = new FilesRouter(cfg);
	return router;
};

Files = {
	
};

Files.MimeTypes = {
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

FilesRouter = function(cfg){
	if (!cfg.basepath){
		cfg.basepath = ".";
	}
	if (cfg.basepath.end("\\")){
		cfg.basepath = cfg.basepath.substr(0, cfg.basepath.length - 1);
	}
	cfg.basepath = cfg.basepath.replace(/\//g, "\\");
	this.instanceId = (Math.random() + "").replace("0.", "");
	this.config = cfg;
	this.ProcessRequest = function(req, res, url){
		if (!url){
			url = Url.parse(req.url);
		}
		var context = {
			req: req,
			res: res,
			url: url,
			etag: url.etag,
			pathTail : url.pathname,
			finish: function(header, body, ext){
				this.res.statusCode = header;
				this.res.end(body, ext);
			},
			"continue" : function(param){
			}
		}
		if (typeof this[req.method] == "function"){
			return this[req.method](context);
		}
		return null;
	};
	var router = this;
	this.GET = function(context){
		return router._GET(context);
	}
	this.POST = function(context){
		return router._POST(context);
	}
	this.PUT = function(context){
		return router._PUT(context);
	}
	this.HEAD = function(context){
		return router._HEAD(context);
	}
	this.SEARCH = function(context){
		return router._SEARCH(context);
	}
};

FilesRouter.prototype.FormatPath = function(fpath){
	fpath = fpath.replace(/\//g, "\\");
	if (!fpath.start("\\")) fpath = "\\" + fpath;
	fpath = this.config.basepath + fpath;
	fpath = fpath.replace(/\//g, "\\");
	if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
	return fpath.toLowerCase();
}

FilesRouter.prototype._GET = FilesRouter.prototype._HEAD = function(context){	
	if (context.completed) return true;
	var fpath = this.FormatPath(context.pathTail);
	var ext = paths.extname(fpath);		
	ext = ext.replace(".", "");
	ext = Files.MimeTypes[ext];
	if (!ext){
		context.res.setHeader("Content-Type", "text/plain; charset=utf-8");
	}
	else{
		context.res.setHeader("Content-Type", ext);	    
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
			context.res.setHeader("Content-Length", result.length);
		}	
		fpath = paths.resolve(fpath);
		var dnow = new Date();
		var etag = context.etag;
		if (!etag){
			etag = (Math.random() + "").replace("0.", "");
		}
		context.res.setHeader("Expires", new Date(dnow.valueOf() + 1000 * 3600).toString());
		context.res.setHeader("Cache-Control", "max-age=3600");
		context.res.setHeader("ETag", etag);
		//context.res.write(buf);
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
			return;
		}
		context.res.setHeader("Content-Type", "application/json; charset=utf-8");
		for (var i = 0; i < files.length; i++){
			var fname = files[i];			
			files[i] = fs.statSync(fpath + "\\" + fname);
			files[i].name = fname;
			files[i].fileType = files[i].isDirectory() ? "directory" : files[i].isFile() ? "file" : "unknown";
		}
		context.finish(200, JSON.stringify(files));
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
				Channels.emit("/file-system." + files.instanceId + "/action.delete.error", fpath.replace(files.config.basepath, ""), err, files.config.basepath);
				context.finish(500, "Delete error " + fpath + " " + err);	
				context.continue();
				return;
			}			
			Channels.emit("/file-system." + files.instanceId + "/action.delete", fpath, files.instanceId,files.config.basepath );
			context.finish(200, "Deleted " + fpath.replace(files.config.basepath, ""));			
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
		fs.writeFile(paths.resolve(fpath), fullData, 'utf8', function(err, result){
			if (err){
				context.finish(500, "File " + fpath + " write error " + err);
				Channels.emit("/file-system." + files.instanceId + "/action.write", fpath.replace(files.config.basepath, ""), err, files.config.basepath);
				return;
			}
			Channels.emit("/file-system." + files.instanceId + "/action.write", fpath.replace(files.config.basepath, ""), files.instanceId, files.config.basepath);
			context.finish(200);
			context.continue();
		});	
	}
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


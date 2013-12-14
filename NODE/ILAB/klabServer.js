var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

require(Path.resolve("./ILAB/Modules/Node/Utils.js"));
var Files = require(Path.resolve("./ILAB/Modules/Node/Files.js"));

KLabServer = function(config, router){
	this.Config = config;
	var filesRouter = Files(config, this);
	router.for("Main","/>", {
		   GET : function(context){
				if (context.query["action"] == "edit" || context.query["action"] == "create"){
				   context.res.setHeader("Content-Type", "text/html; charset=utf-8");
				   fs.readFile("./Klab/TextEditor.htm", "utf8", function(err, result){   
					   if (err){
						   context.finish(500, "Not found files view page " + err);
						   return;
					   }		
					   context.finish(200, result);
				   });
				   return false;
			   }
			   var path = context.pathName;
			   if (config.basepath){
					 path = config.basepath + context.pathName;
			   }
			   if (path.indexOf(".") != 0){
					path = "." + path;   
			   }
			   path = Path.resolve(path);
			   fs.stat(path, function(err, stat){
				   if (err){
					   context.continue();   
					   return;
				   }
				   if (stat.isDirectory()){
					   context.res.setHeader("Content-Type", "text/html; charset=utf-8");
					   fs.readFile("./Klab/files.htm", "utf8", function(err, result){   
						   if (err){
							   context.finish(500, "Not found files view page " + err);
							   return;
						   }		
						   context.finish(200, result);
					   });
					   return;
				   }
				   if (stat.isFile()){
						
				   }
				   context.continue();
			   });
			   return false;
		   }
	   });
	router.for("Main","/<", filesRouter);
};
	
module.exports = function(config, router){
	return new KLabServer(config, router);
}


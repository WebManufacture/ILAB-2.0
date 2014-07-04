var http = require('http');
var Url = require('url');
var fs = require('fs');
var paths = require('path');
var ChildProcess = require('child_process');

var log = {};

log.info = function(text){
	if (typeof text != 'string'){
		text = JSON.stringify(text)
	}
	this._log("info", text);
	console.log(text);
};

log.error = function(error){
	if (error && error.stack){
		this._log("error", error.stack);
	}
	else{
		this._log("error", error + "");
	}
	console.error(error);
};

log._log = function(type, message){
	var date = new Date();
	date = date.getTime();
	var data = [date, type, message + ""];	
    fs.appendFile(lPath + "\\_main.log", JSON.stringify(data) + ",", 'utf8');
};

var Path = process.cwd();
var config = {  port: 8000, mainPath : "\\main", hostName : "localhost" };
var cPath = Path + "\\config.json";



if (fs.existsSync(cPath)){
	var cFile = fs.readFileSync(cPath);
	config = JSON.parse(cFile);
}
else{
	console.log(cPath + " not found. Use default settings");
}

var mPath = Path + config.mainPath;

if(!fs.existsSync(mPath + "\\logs")){
	fs.mkdir(mPath + "\\logs");
}

var lPath = mPath + "\\logs";

log.info(config);

http.createServer(
	function(req, res) {
		var url = "http://" + req.headers.host + req.url;
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,HEAD,OPTIONS,SEARCH,ACL,COPY,MOVE,UPDATE,MKACTIVITY");//"");
		res.setHeader("Access-Control-Request-Header", "*");
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		req.setEncoding("utf8");
		if (req.method == 'HEAD' || req.method == "OPTIONS"){
			res.finish = Server.finishHead;
		}
		else{
			res.finish = Server.finishBody;
		}
		url = Url.parse(url, true);
		url.filePath = url.pathname.replace(/\//g, "\\");
		if (Server.CheckMethod(req.method)){
			Server[req.method](url, req, res);
		}
		else{
			res.finish(501, "Method " + req.method + " not inmplemented by this server");
		}
	}
).listen(8000);



Server = server = {};

Server.Forks = {};

Server.finishHead = function(status, result){			
	if (this.finishCalled) return;
	this.finishCalled = true;
	this.writeHead(status, result);
	this.end();
};

Server.finishBody = function(status, result){
	if (this.finishCalled) return;
	this.finishCalled = true;
	if (status == 200){
		this.statusCode = 200;				
		this.end(result);
		return;
	}
	this.writeHead(status);
	this.end(result);
};

Server.CheckMethod = function(method){
	return typeof Server[method] == 'function';
};

Server.OPTIONS = function(url, req, res){
	res.finish(200);
};

Server.GET = Server.HEAD = function(url, req, res){	
	if (url.hostname && url.hostname.indexOf("config.") == 0){
		res.finish(200, JSON.stringify(config));
		return;
	}
	if (url.hostname && url.hostname.indexOf("nodes.") == 0){
		if (url.filePath == "\\"){
			var forks = [];
			for (var fork in Server.Forks){
				forks.push(Server.Forks[fork].status());
			}
			res.finish(200, JSON.stringify(forks));
			return;	
		}
		var fork = Server.Forks[url.filePath];
		if (fork){
			res.finish(200, fork.toString());	
		}
		else{
			res.finish(404);
		}		
		return;
	}	
	if (url.hostname && url.hostname.indexOf("logs.") == 0){
		if (url.pathname == "/"){
			fs.readdir(lPath + url.filePath, function(err, files){
				if (err){
					res.finish(500, url.filePath + " error " + err);
					return;
				}
				res.finish(200, JSON.stringify(files));
			});			
			return;
		}
		else{
			url.filePath = "\\logs" + url.filePath;	
		}
	}	
	fs.readFile(Path + config.mainPath + url.filePath, function(err, result){
		if (err){
			res.finish(500, "File " + url.filePath + " read error " + err);
			return;
		}
		var ext = paths.extname(url.filePath);
		ext = ext.replace(".", "");
		ext = Server.MimeTypes[ext];
		if (ext){
			res.setHeader("content-type", ext + "; charset=utf-8");
		}
		else{
			res.setHeader("content-type", "text/plain; charset=utf-8");
		}
		res.finish(200, result);
	});
	
	return;
};


Server.ACL = Server.MKACTIVITY = function(url, req, res){
	var ext = paths.extname(url.filePath);
	ext = ext.replace(".", "");
	if (ext != "js"){
		res.finish(500, "Can't fork not javascript files");
		return;
	}
	var action = url.query.action;
	if (!action){
		res.finish(500, "No action parameter specified");
		return;
	}
	var cf = Server.Forks[url.filePath];
	if (!cf){		
		cf = Server.Forks[url.filePath] = new Fork(url.filePath);
	}
	switch (action){
		case "start" :
			cf.start();
			break;
		case "stop" :
			cf.stop();
			break;
		case "reset" :
			cf.reset();
			break;
		default:
	}
	res.finish(200, cf.toString());
	
};

Server.BROWSE = Server.ALL = Server.SEARCH = Server.SELECT = function(url, req, res){
	if (url.hostname && url.hostname.indexOf("nodes.") == 0){
		var forks = [];
		for (var fork in Server.Forks){
			forks.push(Server.Forks[fork].status());
		}
		res.finish(200, JSON.stringify(forks));
		return;
	}
	if (url.hostname && url.hostname.indexOf("logs.") == 0){
		url.filePath = "\\logs";
	}
	log.info("ReadDir " + Path + config.mainPath + url.filePath);
	fs.readdir(Path + config.mainPath + url.filePath, function(err, files){
		if (err){
			res.finish(500, url.filePath + " error " + err);
			return;
		}
		res.finish(200, JSON.stringify(files));
	});
};

Server.POST = Server.PUT = Server.SET = function(url, req, res){
	var fullData = "";
	req.on("data", function(data){
		fullData += data;		
	});
	req.on("end", function(){
		log.info("Writing " + url.hostname + url.pathname);
		if (url.hostname.indexOf("config.") == 0){
			fs.writeFile(cPath, fullData, 'utf8', function(err, result){
				if (err){
					res.finish(500, "File " + cPath + " write error " + err);
					return;
				}
				res.finish(200);
			});
			return;
		}
		fs.writeFile(Path + config.mainPath +url.filePath, fullData, 'utf8', function(err, result){
			if (err){
				res.finish(500, "File " + url.filePath + " write error " + err);
				return;
			}
			res.finish(200);
		});
	});
	return;
};

Server.MimeTypes = {
	htm : "text/html",
	html : "text/html",
	js : "application/x-javascript",
	css : "text/css",
	json : "text/json",
};

function Fork(path){
	this.path = path;
	this.logFile = path.replace(/\//g, "_").replace(/\\/g, "_") + ".log";
	this.code = 0;
	return this;
}

Fork.Statuses = ["new", "stoped", "exited", "reserved", "reserved", "reserved", "reserved", "working"];

Fork.STATUS_NEW = 0;
Fork.STATUS_STOPED = 1;
Fork.STATUS_EXITED = 2;
Fork.STATUS_WORKING = 7;

Fork.prototype = {
	toString : function(){
		return JSON.stringify(this.status());
	},
	
	reset : function(){
		this._log("server", "reset");
		if (this.code < Fork.STATUS_WORKING){
			return this.start();
		};	
		var fork = this;
		this.process.on("exit", function(){
			fork.start();
		});
		this.stop();
		return this.process;
	},
	
	start : function(){
		if (this.code >= Fork.STATUS_WORKING){
			return;	
		}		
		//var str = fs.createWriteStream(lPath + "\\" + this.logFile, {flags : 'a'});
		var cp = this.process = ChildProcess.fork(Path + config.mainPath + this.path, [], { silent: false });
		this._log("server", "started");
		this.code = Fork.STATUS_WORKING;		
		var fork = this;
		cp.on("exit", function(){
			fork._exitEvent.apply(fork, arguments);
		});
		cp.on("message", function(){
			fork._messageEvent.apply(fork, arguments);
		});
		/*cp.stdout.on('data', function () {
			fork._outEvent.apply(fork, arguments);
		});		
		cp.stderr.on('data', function (data) {
			fork._errEvent.apply(fork, arguments);
		});*/
		return cp;
	},
	
	stop : function(){
		if (this.code < Fork.STATUS_WORKING){
			return;	
		}
		this.process.kill();
		this._log("server", "stoped");
		return this.process;
	},
	
	status : function(){
		var stat = {code : this.code, status : Fork.Statuses[this.code], log : this.logFile, path: this.path};
		if (this.process){
			stat.pid = this.process.pid;	
		}
		return stat;
	},
	
	_exitEvent : function(signal){
		this.code = Fork.STATUS_EXITED;
		this._log("server", "exited");
	},
	
	
	_messageEvent : function(message){
		if (typeof message == "string"){
			this._log("message", message);
		}
		else{
			if (message.type){
				this._log(message.type, message.text);	
				return;
			}
		}
	},
	
	_errEvent : function(message){
		this._log("error", "message");
	},
	
	_outEvent : function(signal){
		this._log("info", "message");
	},
	
	_log : function(type, message){
		var date = new Date();
		date = date.getTime();
		var data = [date, type, message + ""]	
		fs.appendFile(lPath + "\\" + this.logFile, JSON.stringify(data) + ",", 'utf8');
		console.log(JSON.stringify(data));
	},
	
	close : function(){
		if (this.process){
			this._log("server", "close");
			this.process.kill();
		}
	}
};

//process.on('exit')
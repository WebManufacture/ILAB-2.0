var fs = require('fs');
var paths = require('path');
var ChildProcess = require('child_process');
require(paths.resolve("./ILAB/Modules/Node/Utils.js"));
require(paths.resolve("./ILAB/Modules/Channels.js"));
require(paths.resolve("./ILAB/Modules/Node/ChildProcess.js"));
var logModule = require(paths.resolve("./ILAB/Modules/Node/Logger.js"));
var emitter = require('events').EventEmitter;

global.Fork = function(path, args, id, channelTags){
	this.path = path;
	if (!args) args = [];
	this.args = args;
	this.code = 0;
	this.id = id;	
	if (!this.id) {
		this.id = "fork" + (Math.random() + "").replace("0.", "");
	}	
	if (!channelTags) channelTags = "";
	this.channelId = "/" + this.id + channelTags;
	this.logger = logModule.create(this.channelId + "/log");
	this.subscribers = {};
	var fork = this;
	if (global.Channels){
		this.on("", function(route){
			if (!route) return true;
			this.forkId = fork.id;	
			route.forkId = fork.id;
			return true;
		});	
		this.on("/process", function(route){
			if (!route) return true;
			//console.log("internal message detected: " + route.current);
			if (this.is("/*/process.internal")){
				return false;
			};
			if (fork.process && fork.code == Fork.STATUS_WORKING){
				//console.log(this); 
				var params = [];
				params.push(route.current);
				for (var i = 1; i < arguments.length; i++){
					params.push(arguments[i]);
				}
				fork.process.send({ type : "channelMessage", route : route.current, args : params, date : new Date() });
				return true;
			}
			return true;
		});		
		this.on("/control.start", function(message){
			fork.start();
		});
		this.on("/control.stop", function(message){
			fork.stop();
		});
		this.on("/control.reset", function(message){
			fork.reset();
		});
		Channels.tunnelTo(this.channelId + "/process", function(path){
			if (!path) return true;
			//console.log("SUBSCRIBE DETECTED:".warn );
			//console.log(path);
			if (!fork.subscribeToChild(path.current)) return false;
			return true;
		});
	}
	return this;
};

Fork.Statuses = ["new", "stopped", "exited", "reserved", "reserved", "reserved", "reserved", "working"];

Fork.STATUS_NEW = 0;
Fork.STATUS_STOPPED = 1;
Fork.STATUS_EXITED = 2;
Fork.STATUS_WORKING = 7;

Fork.prototype = {
	toString : function(){
		return JSON.stringify(this.status());
	},
	
	reset : function(args){		
		this.logger.debug("fork resetting " + this.path);
		if (this.code < Fork.STATUS_WORKING){
			return this.start();
		};	
		var fork = this;
		if (!args) args = this.args;
		this.process.once("exit", function(){
			fork.start(args);
		});
		this.stop();
		return this.process;
	},
	
	start : function(args){
		if (this.code >= Fork.STATUS_WORKING){
			return;	
		}		
		if (typeof (args) == 'function'){
			var callback = args;
			args = this.args;
		}
		if (!args) args = this.args;
		if (typeof (args) == 'string'){
			args = JSON.parse(args);	
		}
		if (args) this.args = args;
		var cwd =  process.cwd();
		if (args.cwd){
			cwd = args.cwd;
		}
		var wd =  paths.dirname(this.path);
		if (args.wd){
			wd = args.wd;
		}
		var cp = this.process = ChildProcess.fork(this.path, [JSON.stringify(args)], { silent: false, cwd: cwd, env : { workDir: wd, isChild : true } });
		this.logger.debug("fork started " + this.path);
		this.code = Fork.STATUS_WORKING;	
		if (callback){
			var fork = this;
			this.once("/state", function(){
				callback.call(fork, Fork.Statuses[fork.code]);	
			});
		}
		this.emit("/state." + Fork.Statuses[this.code], Fork.Statuses[this.code]);
		var fork = this;
		cp.on("exit", function(){
			fork._exitEvent.apply(fork, arguments);
		});
		cp.on("message", function(){
			fork._messageEvent.apply(fork, arguments);
		});		
		for (var pattern in this.subscribers){
			this.subscribeToChild(pattern);
			console.log("STCH: " + pattern);
		}
		return cp;
	},
	
	stop : function(callback){
		if (this.code < Fork.STATUS_WORKING){
			return;	
		}
		if (callback){
			var fork = this;
			this.once(".status", function(){
				callback.call(fork, Fork.Statuses[fork.code]);	
			});
		}
		this.close();
		return this.process;
	},
	
	status : function(){
		var stat = {id : this.id, code : this.code, status : Fork.Statuses[this.code], log : this.logFile, path: this.path, args: this.args};
		if (this.process){
			stat.pid = this.process.pid;	
		}
		return stat;
	},
	
	_exitEvent : function(signal){
		this.code = Fork.STATUS_EXITED;
		this.emit("/state." + Fork.Statuses[this.code], Fork.Statuses[this.code]);
		this.emit(".exit", signal);
		this.logger.debug("fork exited " + this.path);
	},
	
	_messageEvent : function(obj){
		if (global.Channels && typeof obj == "object"){
			/*if (obj.type == "channelControl"){
				var fork = this;
				Channels.on(obj.pattern, function(message){
					fork.emitToChild.apply(fork, arguments);
				});
			}*/
			if (obj.type == "channelMessage"){
				obj.args[0] = "/process.internal" + obj.args[0] + "";
				//console.log("<< " + (new Date()).formatTime(true));
				this.emit.apply(this, obj.args);
			}
		}
		if (typeof obj == "string"){
			this.logger.log(obj);
		}
	},
	
	_errEvent : function(message){
		this.emit(".error", message);
		this.logger.error(message);
	},
	
	
	emit : function(message){
		if (global.Channels){
			message = this.channelId + message;
			global.Channels.emit.apply(Channels, arguments);
		}		
	},
	
	on : function(message){
		message = this.channelId + message;
		Channels.on.apply(Channels, arguments);
	},
	
	once : function(message){
		if (global.Channels){
			message = this.channelId + message;
			Channels.once.apply(Channels, arguments);
		}		
	},
	
	subscribeToChild : function(pattern){
		if (this.process && this.code == Fork.STATUS_WORKING){
			if (this.subscribers[pattern]) {
				this.subscribers[pattern]++;
			}
			else{
				this.subscribers[pattern] = 1;
			}
			this.process.send({ type : "channelControl", pattern : pattern, clientId : this.id });
			return true;
		}	
		return false;
	},
		
	close : function(){
		if (this.process){
			var proc = this.process;
			this.logger.debug("fork close - " + this.path);
			this.process.send("EXITING");
			setTimeout(function(){
				proc.kill('SIGINT');	
			}, 400);
		}
	},
};

var ForksRouter = {
	Forks : {},
	
	Init : function(){

	},
	
	Create: function(fpath, args, channelTags){
		cf = new Fork(fpath, args, channelTags);
		ForksRouter.Forks[cf.id] = cf;
		return cf;
	},
	
	Get : function(id){
		return ForksRouter.Forks[id];
	},
	
	Del : function(id){
		var cf = this.Forks[id];
		if (cf){		
			cf.close();
			if (global.Channels){
				global.Channels.clear("/fork" + cf.id);
			}
			delete this.Forks[id];
			return true;
		}
		return false;
	}
};

module.exports = ForksRouter;

ForksRouter.Init();



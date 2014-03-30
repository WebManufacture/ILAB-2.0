useNodeType("node.js");
useNodeType("managednode.js");

function IsolatedNode (parentNode, item){
	IsolatedNode.super_.apply(this, arguments);
	this.type = IsolatedNode.Type;
};

global.IsolatedNode = IsolatedNode;

global.IsolatedNode.Type = "isolated";

Inherit(IsolatedNode, ManagedNode, {
	init : function(config){
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		if (IsolatedNode.base.load){
			return IsolatedNode.base.load.call(this, callback);
		}
		else{
			return true;
		}
	}
});


ForkNode = function(path, args, id, channelTags){
	this.path = path;
	if (!args) args = [];
	this.args = args;
	this.code = 0;
	this.id = id;	
	if (!this.id) {
		this.id = "fork" + (Math.random() + "").replace("0.", "");
	}	
	this.logger = logModule.create(id + "/log");
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
			if (this.is("/fork/*/process.internal")){
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
			path = path.current;
			if (path.length > 0 && path[0] == '/'){
				path = path.replace("/", '');
			}
			fork.subscribeTo(path);
			return true;
		});
	}
	return this;
};

ForkNode.Statuses = ["new", "stopped", "exited", "reserved", "reserved", "reserved", "reserved", "working"];

ForkNode.STATUS_NEW = 0;
ForkNode.STATUS_STOPPED = 1;
ForkNode.STATUS_EXITED = 2;
ForkNode.STATUS_WORKING = 7;

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
		var argsA = [JSON.stringify(args)];
		argsA.push(JSON.stringify(this.subscribers));
		var cp = this.process = ChildProcess.fork(this.path, argsA, { silent: false, cwd: cwd, env : { workDir: wd, isChild : true } });
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
	
	subscribeTo : function(pattern){
		if (this.subscribers[pattern]) {
			this.subscribers[pattern]++;
		}
		else{
			this.subscribers[pattern] = 1;
		}
		return this.subscribeToChild(pattern);
	},
	
	subscribeToChild : function(pattern){
		if (this.process && this.code == Fork.STATUS_WORKING){
			this.process.send({ type : "channelControl", pattern : pattern, clientId : this.id });
			return true;
		}	
		return false;
	},
		
	close : function(){
		if (this.process){
			var self = this;
			var proc = this.process;
			var exited = false;
			this.process.send("EXITING");
			var exitTimeout = setTimeout(function(){
				if (!exited){
					console.log(("Process: " + self.id + " KILLED BY TIMEOUT!").red);
					proc.kill('SIGINT');	
				}
			}, 5000);
			proc.on("exit", function(){
				exited = true;
				clearTimeout(exitTimeout);
			});			
		}
	}
};

module.exports = IsolatedNode;
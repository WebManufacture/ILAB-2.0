useNodeType("node.js");
useNodeType("managednode.js");
useModule("logger.js");
var Path = require('path');

function IsolatedNode (parentNode, item){
	IsolatedNode.super_.apply(this, arguments);
	this.type = IsolatedNode.Type;
};

global.IsolatedNode = IsolatedNode;

global.IsolatedNode.Type = "isolated";

Inherit(IsolatedNode, ManagedNode, {
	init : function(config){
		if (IsolatedNode.base.init){
			IsolatedNode.base.init.call(this, config);
		}
		this.path = Path.resolve(config.file);
		this.args = config;
		this.code = 0;
		this.logger = logModule.create(id + "/log");
		this.subscribers = {};
		var fork = this;
		if (global.Channels){
			this._on("", function(route){
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
			Channels.tunnelTo(this.id, function(path){
				if (!path) return true;
				path = path.current;
				if (path.length > 0 && path[0] == '/'){
					path = path.replace("/", '');
				}
				fork._subscribeTo(path);
				return true;
			});
		}
		return true;
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		var args = this.args;
		var cwd =  process.cwd();
		if (!args.cwd){
			cwd = args.cwd;
		}
		var wd =  paths.dirname(this.path);
		if (!args.wd){
			wd = args.wd;
		}
		var argsA = [JSON.stringify(args)];
		argsA.push(JSON.stringify(this.subscribers));
		var cp = this.process = ChildProcess.fork(this.path, argsA, { silent: false, cwd: cwd, env : { workDir: wd, isChild : true } });
		this.logger.debug("fork started " + this.path);
		if (callback){
			var fork = this;
			fork._once("/state", function(){
				callback.call();
			});
		}
		this._emit("/state." + Fork.Statuses[this.code], Fork.Statuses[this.code]);
		var fork = this;
		cp.on("exit", function(){
			fork._exitEvent.apply(fork, arguments);
		});
		cp.on("message", function(){
			fork._messageEvent.apply(fork, arguments);
		});		
		return false;
	},
	
	unload : function(callback){
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
				callback();
			}, 5000);
			proc.on("exit", function(){
				exited = true;
				clearTimeout(exitTimeout);
				callback();
			});			
			return false;
		}
		else
		{
			return true;
		}
	},
	
	start : function(callback){
		this.process.send("START");
		return true;
	},
	
	stop : function(callback){
		this.process.send("STOP");
		return true;
	},
	
	sleep : function(){
		this.process.send("SLEEP");
		return true;
	},
			
	statusString : function(){
		var stat = {id : this.id, code : this.code, status : Fork.Statuses[this.code], log : this.logFile, path: this.path, args: this.args};
		if (this.process){
			stat.pid = this.process.pid;	
		}
		return stat;
	},
	
	_exitEvent : function(signal){
		this._emit("/state." + Fork.Statuses[this.code], Fork.Statuses[this.code]);
		this._emit(".exit", signal);
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
		this.logger.error(message);
	},	
	
	_emit : function(message){
		if (global.Channels){
			message = this.channelId + message;
			global.Channels.emit.apply(Channels, arguments);
		}		
	},
	
	_on : function(message){
		message = this.channelId + message;
		Channels.on.apply(Channels, arguments);
	},
	
	_once : function(message){
		if (global.Channels){
			message = this.channelId + message;
			Channels.once.apply(Channels, arguments);
		}		
	},
	
	_subscribeTo : function(pattern){
		if (this.subscribers[pattern]) {
			this.subscribers[pattern]++;
		}
		else{
			this.subscribers[pattern] = 1;
		}
		this.process.send({ type : "channelControl", pattern : pattern, clientId : this.id });
		return true;
	},
});


module.exports = IsolatedNode;
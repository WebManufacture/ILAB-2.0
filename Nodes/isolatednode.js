useNodeType("node.js");
useNodeType("managednode.js");
var Logger = useModule("logger.js");
var ChildProcess = require("child_process");
var Path = require('path');
var fs = require('fs');

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
		if (!config.file) config.file = config.File;
		this.path = Path.resolve(config.file);
		this.logger = new Logger(this.id, true);
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
		var config = this.config;
		var childConfig = JSON.parse(JSON.stringify(config));
		var cwd = process.cwd();
		if (!config.cwd){
			cwd = config.cwd;
		}
		var wd = Path.dirname(this.path);
		if (!config.wd){
			wd = config.wd;
		}
		childConfig.Type = "internal";
		childConfig.State = Node.Statuses[Node.States.LOADED];
		var argsA = [JSON.stringify(childConfig), JSON.stringify(this.subscribers)];
		var fork = this;
		try{
			if (fs.existsSync(fork.path)){
				var options = { workDir: wd, isChild : true, cwd: cwd, parentNode : fork.id };
				var cp = fork.process = ChildProcess.fork(fork.path, argsA, { silent: config.useConsole == false, cwd: cwd, env : options });
				cp.on("error", function(err){
					fork.State = Node.States.EXCEPTION;
					fork.logger.debug("%bright;%yellow;fork error %normal;");
					fork.logger.error(err);
				});
				cp.on("exit", function(){
					if (fork.State != Node.States.EXCEPTION) fork.State = Node.States.Stopped;
					fork.logger.debug("%bright;%yellow;fork exited %normal;");
				});			
				cp.on("message", function(message){
					fork._messageEvent.apply(fork, arguments);
					if (message.type == "process.state" && message.args[0] == Node.States.LOADED && callback){
						callback();
					}
				});		
				fork.logger.debug("%bright;%blue;fork starting");
			}
			else{
				callback();
				this.State = Node.States.EXCEPTION;
				this.logger.error("Path " + fork.path + " does not exists");
			}
		}
		catch (err){
			callback();
			this.State = Node.States.EXCEPTION;
			this.logger.error(err);
		}
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
			proc.once("exit", function(){
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
	
	_messageEvent : function(obj){
		if (global.Channels && typeof obj == "object"){
			/*if (obj.type == "channelControl"){
				var fork = this;
				Channels.on(obj.pattern, function(message){
					fork.emitToChild.apply(fork, arguments);
				});
			}*/
			
			if (obj.type == "process.state"){
				//this.State = obj.args[0];
				this.logger.debug("%bright;%blue;fork %normal;{0} => {1} ", Node.Statuses[obj.args[1]], Node.Statuses[obj.args[0]]);
				return;
			}
			if (obj.type == "channelMessage"){
				obj.args[0] = "/process.internal" + obj.args[0] + "";
				//console.log("<< " + (new Date()).formatTime(true));
				this.emit.apply(this, obj.args);
			}
			this.logger.debug("%bright;%blue;fork message %normal; {0} : {1} ", obj.type, obj.args[0]);
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
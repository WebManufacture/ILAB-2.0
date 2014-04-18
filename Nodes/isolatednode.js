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
		var path = Path.resolve("./ILAB/Frame.js");
		var cwd = process.cwd();
		if (!config.cwd){
			cwd = config.cwd;
		}
		childConfig.Type = "internal";
		childConfig.State = Node.Statuses[Node.States.LOADED];
		var argsA = [JSON.stringify(childConfig), JSON.stringify(this.subscribers)];
		var fork = this;
		try{
			if (fs.existsSync(path)){
				var options = { isChild : true, cwd: cwd, parentNode : fork.id };
				var cp = fork.process = ChildProcess.fork(path, argsA, { silent: config.useConsole == false, cwd: cwd, env : options });
				cp.on("error", function(err){
					
				});
				cp.on("exit", function(code){
					if (code > 0){						
						fork.logger.debug("%bright;%yellow;fork error %normal;");
						fork.logger.error(code);
						fork.State = Node.States.EXCEPTION;
					}
					else{
						fork.State = Node.States.UNLOADED;
						fork.logger.debug("%bright;%yellow;fork exited %normal;");
					}
				});	
				cp.once("message", function(message){
					fork.process.send({ type : "channel.subscribe",  pattern: "/log"});
				});				
				cp.on("message", function(message){
					fork._messageEvent.apply(fork, arguments);
				});		
				fork.logger.debug("%bright;%blue;fork starting");
			}
			else{
				this.State = Node.States.EXCEPTION;
				this.logger.error("Path " + fork.path + " does not exists");
			}
		}
		catch (err){
			this.State = Node.States.EXCEPTION;
			this.logger.error(err);
		}
		return false;
	},
	
	unload : function(){
		if (this.process){
			var self = this;
			var proc = this.process;
			var exited = false;
			this.process.send("process.unload");
			var exitTimeout = setTimeout(function(){
				if (!exited){
					self.logger.error("Process: " + self.id + " KILLED BY TIMEOUT!");
					proc.kill('SIGINT');	
				}
			}, 5000);
			proc.once("exit", function(){
				exited = true;
				clearTimeout(exitTimeout);
				//see code above
				//self.State = Node.States.UNLOADED;
			});			
			return false;
		}
		return true;
	},
	
	start : function(callback){
		this.process.send("process.start");
		return false;
	},
	
	stop : function(callback){
		this.process.send("process.stop");
		return false;
	},
	
	sleep : function(){
		this.process.send("process.sleep");
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
			var args = obj.args;
			if (obj.type == "process.state"){
				//this.State = obj.args[0];
				this.logger.debug("%bright;%blue;fork %normal;{0} => {1} ", Node.Statuses[args[1]], Node.Statuses[args[0]]);
				if (this.State <= Node.States.LOADING){
					var state = obj.args[0];
					var ostate = obj.args[1];
					if (state >= Node.States.EXCEPTION && state <= Node.States.LOADED && ostate == Node.States.LOADING){
						this.State = state;
					}
				}
				else{
					if (obj.args[0] < Node.States.UNLOADING){
						this.State = obj.args[0];
					}
				}
				return;
			}
			if (obj.type == "channel.follow"){
				var message = obj.args[0];
				var route = new Channel.Route(message.source);
				obj.args[0] = message.source;
				if (route.is("/log") && obj.args[1]){
					var msg = obj.args[1];
					this.logger.log("%bright;%blue;forklog>%normal; " + msg.content, msg.type);
				}
				Channels.emit.apply(Channels, obj.args);
				return;
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
		this.process.send({ type : "channel.subscribe", pattern : pattern, clientId : this.id });
		return true;
	},
});


module.exports = IsolatedNode;
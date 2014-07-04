var http = require('http');
var Url = require('url');
var Path = require('path');
var debug = require('debug');
var fs = require('fs');
var colors = require('colors');

if (!module.parent){
	global.NodesPath = ".\\ILAB\\Nodes\\";
	global.ModulesPath = ".\\ILAB\\Modules\\";
	global.ServicesPath = ".\\ILAB\\Services\\";
	global.useNodeType = function(path){
		return require(Path.resolve(global.NodesPath + path));
	};
	global.useModule = function(path){
		return require(Path.resolve(global.ModulesPath + path));
	};
	global.useService = function(path){
		return require(Path.resolve(global.ServicesPath + path));
	};	
}

colors.setTheme({
	silly: 'rainbow',
	input: 'grey',
	verbose: 'cyan',
	prompt: 'grey',
	info: 'green',
	data: 'grey',
	help: 'cyan',
	warn: 'yellow',
	debug: 'blue',
	error: 'red'
});

useModule("Utils.js");
useModule("Async.js");
var Logger = useModule("logger.js");
useModule("channels.js");
//useModule("channelsClient.js");
useModule("childProcess.js");

useNodeType("node.js");

function FrameService (parentNode, item){
	FrameService.super_.apply(this, arguments);
	this.type = FrameService.Type;
	if (item && item.id) this.id = item.id;
	else this.id = 'service_frame_' + parseInt(Math.random() * 10000000);
	this.logger = new Logger(this.id, true);
	var self = this;
	Channels.on("/global/config.changed", CreateClosureMap(self._configChanged, self, 2));
	/*
	Channels.on("/global/node.delete", CreateClosureMap(self._deleteNode, self, 2));
	Channels.on("/global/node.add", CreateClosureMap(self._addNode, self, 2));
	Channels.on("/global/node.start", CreateClosureMap(self._startNode, self, 2));
	Channels.on("/global/node.stop", CreateClosureMap(self._stopNode, self, 2));
	Channels.on("/global/node.unload", CreateClosureMap(self._unloadNode, self, 2));
	Channels.on("/global/node.load", CreateClosureMap(self._loadNode, self, 2));
	Channels.on("/global/node.reload", CreateClosureMap(self._reloadNode, self, 2));*/
};

global.FrameService = FrameService;

global.FrameService.Type = "service:frame";

Node.Inherit(FrameService, {
	init : function(cfg){
		try{
			if (FrameService.base.init){
				FrameService.base.init.call(this, cfg);
			}
			this.logger.debug("<grey:{0}> ", process.cwd());
			console.log("-------------------------------------------------------------------------".prompt);

			this.Config = cfg;
			this.Nodes = {};
			this.Modules = [];

			var self = this;

			if (!global.NodesByTypes){
				global.NodesByTypes = {};
				var nodes = fs.readdirSync(Path.resolve(global.NodesPath));
				for (var i = 0; i < nodes.length; i++){
					try{
						var node = require(Path.resolve(global.NodesPath + nodes[i]));
						if (node && node.Type){
							NodesByTypes[node.Type] = node;
							this.logger.info("Support node type: <#08A:{0}>", node.Type);
						}
					}
					catch(error){
						this.logger.info("Node type load error: <#08A:{0}> : {1}", nodes[i], error);
					}
				}
			}

			if (!cfg.Modules) cfg.Modules = [];
			for (var i = 0; i < cfg.Modules; i++){
				this.Modules.push(require(cfg.Modules[i]));
			}

			if (!cfg.Nodes) cfg.Nodes = {};

			return true;
		}
		catch(err){
			this.logger.error(err);
		}
	},
	
	_loadConfig : function(){
		var cfg = this.Config;
		if (cfg.ConfigFile){
			if (fs.existsSync(Path.resolve(cfg.ConfigFile))){
				var cfgFile = fs.readFileSync(Path.resolve(cfg.ConfigFile), "", 'utf8');
				if (cfgFile && cfgFile.length > 0){
					cfgFile = JSON.parse(cfgFile);
					for (var item in cfgFile){
						var val = cfgFile[item];
						cfg[item] = val;
					}
				}
			}
			this.ConfigFile = cfg.ConfigFile;
		}
		if (!cfg.Modules) cfg.Modules = [];
		if (!cfg.Nodes) cfg.Nodes = {};
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		try{
			this.logger.debug("Loading frame service");
			if (FrameService.base.load){
				FrameService.base.load();
			}		

			var nodes = this.config.Nodes;
			var self = this;
			var wf = new Async.EventFall(function initComplete(){
				var LoadWF = new Async.EventFall(function(){
					callback();
				});
				for (var id in self.Nodes){
					var node = self.Nodes[id];
					LoadWF.subscribe(node, 'loaded');
					if (node.defaultState >= Node.States.LOADED || node.defaultState < Node.States.UNLOADING){
						node.Load();
					}
				}
			});

			for (var nodeId in nodes){
				var item = nodes[nodeId];
				item.id = nodeId;
				if (!item.Type) item.Type = 'base';
				var nType = NodesByTypes[item.Type];
				if (nType){
					var node = new nType(self, item);
					this.Nodes[node.id] = node;
					node.on('state', function(state, stateOld){
						self.logger.debug("<#058:{0}:{1}> {2} => {3}", this.type, this.id, Node.Statuses[stateOld],Node.Statuses[state]);
					});
					wf.subscribe(node, 'initialized');
					if (item.State == "working"){
						this.logger.debug("<green:{0}:{1}> {2}", item.Type, item.id, item.File);
					}
					else
					{
						this.logger.debug("<#A90:{0}:{1}> {2}", item.Type, item.id, item.File);	
					}
				}
				else{
					this.logger.warn("Unknown node type: " + item.Type);
				}
			}
		}
		catch(err){
			this.logger.error(err);
		}
		return false;
	},

	unload : function(callback){
		this.logger.debug("<red:Unloading frame service>");
		var self = this;
		var wf = new Async.EventFall(function unloadComplete(){
			delete self.Nodes;
			self.logger.debug("<red:Frame service unloaded>");
			if (callback) callback();
			else self.State = Node.States.UNLOADED;
		});
		for (var id in this.Nodes){
			wf.subscribe(this.Nodes[id], 'unloaded');
		}
		for (var id in this.Nodes){
			try{
				 this.Nodes[id].Unload();
			}
			catch (error){
				console.log(error);				
			}
		}
		return false;
	},

	start : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			if (node.defaultState >= Node.States.WORKING || node.defaultState < Node.States.UNLOADING){
				node.Start(function(){
					if (this.defaultState == Node.States.SLEEP){
						this.sleep();
					}
				});
			}
		}
		if (FrameService.base.start){
			return FrameService.base.start.call(this, callback);
		}
		else{
			return true;
		}
	},

	stop : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Stop();
		}
		if (FrameService.base.stop){
			return FrameService.base.stop.call(this, callback);
		}
		else{
			return true;
		}
	},

	pause : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Pause();
		}

		if (FrameService.pause.load){
			return FrameService.base.pause.call(this, callback);
		}
		else{
			return true;
		}
	},

	SaveConfig : function(){
		if (this.ConfigFile){
			this.logger.info('config rewrite');
			fs.writeFileSync(this.ConfigFile, JSON.stringify(this.Config), 'utf8');
		}
	},
	
	_configChanged : function(param){
		
	},
	
	_deleteNode : function(param){
		
	},
	
	_addNode : function(param){
		
	},
	
	_startNode : function(param){
		
	},
	
	_stopNode : function(param){
		
	},
	
	_unloadNode : function(param){
		
	},
	
	_loadNode : function(param){
		
	},
	
	_reloadNode : function(param){
		
	}
});

module.exports = FrameService;	
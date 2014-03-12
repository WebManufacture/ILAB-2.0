var http = require('http');
var Url = require('url');
var Path = require('path');
var debug = require('debug');
var fs = require('fs');
var httpProxy = require('http-proxy');
var proxy = new httpProxy.createProxyServer({});
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
	this.logger = new Logger("", true);
	var self = this;
	if (!module.parent){
		var unloading = false;
		function UnloadSelf(callback) {
			if (!unloading)	self.Unload(callback);
		}
		process.on('SIGTERM', UnloadSelf);
		process.on('exit',UnloadSelf);
		process.on('EXITING', function(){
			unloading = true;
			self.Unload(function(){
				process.exit();				
			});
		});
	}
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

			if (!module.parent){
				//Copy cfg values from command prompt
				for (var i = 2; i < process.argv.length; i++){
					var arg = process.argv[i];
					var val = JSON.parse(arg);
					if (typeof val == 'object'){
						for (var item in val){
							cfg[item] = val[item];
						}
					}
				}
			}		
			//this.default
			if (!module.parent){
				this.logger.info("<green:Frame server started: {0}>", cfg.ConfigFile);
			}
			else{
				this.logger.info("<green:Frame module started: {0}>", cfg.ConfigFile);
			}

			this.Config = cfg;
			this.Nodes = {};
			this.Modules = [];

			var self = this;

			if (!global.NodesByTypes){
				global.NodesByTypes = {};
				var nodes = fs.readdirSync(Path.resolve(global.NodesPath));
				for (var i = 0; i < nodes.length; i++){
					var node = require(Path.resolve(global.NodesPath + nodes[i]));
					if (node && node.Type){
						NodesByTypes[node.Type] = node;
						this.logger.info("Support node type: <#08A:{0}>", node.Type);
					}
				}
			}

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
				else
				{
					fs.writeFile(Path.resolve(cfg.ConfigFile), "", 'utf8');
				}
				this.ConfigFile = cfg.ConfigFile;
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
			var wf = new Async.Waterfall(function initComplete(){
				var LoadWF = new Async.Waterfall(function(){
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
		var wf = new Async.Waterfall(function unloadComplete(){
			delete self.Nodes;
			self.logger.debug("<red:Frame service unloaded>");
			if (callback) callback();
			else self.State = Node.States.UNLOADED;
		});

		for (var id in this.Nodes){
			var node = this.Nodes[id];
			wf.subscribe(node, 'unloaded');
			node.Unload();
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
	}
});

if (!module.parent){
	Frame = new FrameService();
	try{
		Frame.on('initialized', function(){
			Frame.Load(false);
		});
		Frame.on('loaded', function(){
			Frame.Start();
		})
		process.nextTick(function InitSelf(){
			Frame.Init({ id: "FrameServer ver 0.2.3", ver: "0.2.3" });
		});
		setInterval(function(){
			Frame.Process();
		}, 100);
	}
	catch(err){
		Frame.logger.error(err);
	}
}
else{
	module.exports = FrameService;	
}
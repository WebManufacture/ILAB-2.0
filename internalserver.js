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

useModule("Utils.js");
useModule("logger.js");
useModule("channels.js");
//useModule("channelsClient.js");

colors.setTheme({
	silly: 'rainbow',
	input: 'grey',
	verbose: 'cyan',
	prompt: 'blue',
	info: 'green',
	data: 'grey',
	help: 'cyan',
	warn: 'yellow',
	debug: 'cyan',
	error: 'red'
});


process.setMaxListeners(100);

var NodeProto = useNodeType("node.js");

function FrameService (parentNode, item){
	FrameService.super_.apply(this, arguments);
	this.type = FrameService.Type;
	var self = this;
	if (!module.parent){
		function UnloadSelf() {
			self.Unload();
		}
		process.on('SIGTERM', UnloadSelf);
		process.on('exit', UnloadSelf);
		process.nextTick(function InitSelf(){
			self.init({ ver: "0.1.4" });
		});
	}
};

global.FrameService = FrameService;

global.FrameService.Type = "service:frame";

global.Node.Inherit(FrameService, {
	init : function(cfg){
		if (FrameService.base.init){
			FrameService.base.init.call(this, cfg);
		}
		console.log(process.cwd().grey);
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
		
		console.log(cfg.ConfigFile);
		
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
					console.log("Support node type: ".debug + node.Type);
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
		var nodes = cfg.Nodes;
		for (var nodeId in nodes){
			var item = nodes[nodeId];
			item.id = nodeId;
			if (!item.Type) item.Type = 'base';
			var nType = NodesByTypes[item.Type];
			if (nType){
				var node = new nType(self, item);
				this.Nodes[node.id] = node;
				node.on('state', function(state, stateOld){
					console.log(this.type + ": " + this.id.debug + " " + Node.Statuses[stateOld] + " --> " + Node.Statuses[state]);
				});
				console.log((item.State == "working" ? item.Type.yellow : item.Type.grey) + " " + node.id.info + " " + (node.File));
			}
			else{
				console.log("Unknown node type: ".warn + item.Type);
			}
		}
		/*http = require('http');
		http.createServer(function(){
			
		}).listen(2302);*/
		if (!module.parent){
			console.log("loading planned".green);
			process.nextTick(function loadSelf(){
				self.Load();
			});
		}
		self.Load();
		//ILab.Start();
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		console.log("Loading frame service".green);
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Load();
		}

		if (FrameService.base.load){
			return FrameService.base.load.call(this, callback);
		}
		else{
			return true;
		}
	},

	unload : function(callback){
		console.log("Unloading frame service".warn);
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Unload();
		}
		delete this.Config;
		delete this.Nodes;
		delete this.Modules;
		if (FrameService.base.unload){
			return FrameService.base.unload.call(this, callback);
		}
		else{
			return true;
		}
	},

	start : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Start();
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
			console.log('config rewrite'.warn);
			fs.writeFileSync(this.ConfigFile, JSON.stringify(this.Config), 'utf8');
		}
	}
});

if (!module.parent){
	Frame = new FrameService();
}
else{
	module.exports = FrameService;	
}
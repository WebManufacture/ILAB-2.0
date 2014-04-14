var Path = require('path');
var fs = require('fs');
var colors = require('colors');

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
useModule("logger.js");
useModule("Channels.js");
useModule("Async.js");
var logger = useModule("logger.js");
useNodeType("node.js");
useNodeType("internalnode.js");

var config = process.argv[2];
if (config) config = JSON.parse(config);
var subscribers = process.argv[3];
if (subscribers) subscribers = JSON.parse(subscribers);

try{
	if (!module.parent){
		logger.info("<green:Frame server started: {0}> <grey:{1}> ", process.cwd(), config.config);
	}
	else{
		logger.info("<green:Frame module started: {0}>", config);
	}
		
	if (config.config && fs.existsSync(Path.resolve(config.config))){
		var cfgFile = fs.readFileSync(Path.resolve(config.config), "", 'utf8');
		if (cfgFile && cfgFile.length > 0){
			cfgFile = JSON.parse(cfgFile);
			for (var item in cfgFile){
				var val = cfgFile[item];
				config[item] = val;
			}
		}
	}				
				
	if (!global.NodesByTypes){
		global.NodesByTypes = {};
		var nodes = fs.readdirSync(Path.resolve(global.NodesPath));
		for (var i = 0; i < nodes.length; i++){
			try{
				var node = require(Path.resolve(global.NodesPath + nodes[i]));
				if (node && node.Type){
					NodesByTypes[node.Type] = node;
					logger.info("Support node type: <#08A:{0}>", node.Type);
				}
			}
			catch(error){
				logger.info("Node type load error: <#08A:{0}> : {1}", nodes[i], error);
			}
		}
	}
	
	config.id = "Frame_Service";
	
	if (!config.Modules) config.Modules = [];
	for (var i = 0; i < config.Modules; i++){
		this.Modules.push(require(config.Modules[i]));
	}
	
	var nType = NodesByTypes[config.Type];
	if (nType){
		var node = new nType(config.parentNode);
	}
	else{
		throw "Node type " + config.Type + " not found!";
	}

	var unloading = false;
	
	function UnloadBlocking(callback) {
		if (!unloading){
			unloading = true;
			node.Unload();
		}
	}
	
	function UnloadSelf(callback) {
		if (!unloading){
			unloading = true;
			node.Unload(function(){
				process.exit();				
			});
		}
	};

	process.on('SIGTERM', UnloadBlocking);
	process.on('exit', UnloadBlocking);
	process.on('EXITING', UnloadSelf);

	if (process.send){
		process.on("message", function(pmessage){
			if (pmessage == 'EXITING'){
				process.emit("EXITING");
				setTimeout(function(){
					console.log("CHILD PROCESS EXITED BY TIMEOUT 4s !".warn);
					process.exit();
				}, 3000);
			}
			if (typeof pmessage == "object"){
				if (pmessage.type && pmessage.type == "channelControl" && pmessage.pattern){
					if (pmessage.clientId){
						var client = Channels.followed[pmessage.clientId];
						if (client){
							if (client[pmessage.pattern]){
								console.log("REFOLLOWING PATTERN DETECTED: " + pmessage.pattern);
								return;
							}
						}
						else{
							client = Channels.followed[pmessage.clientId] = {};
						}
						client[pmessage.pattern] = 1;
					}
					else{
						console.log("Anonymous client DETECTED");				
					}			
					Channels.followToGlobal(pmessage.pattern);
				}
				if (pmessage.type && pmessage.type == "channelMessage"){
					var dateEnd = new Date();
					var dateStart = new Date(pmessage.date);
					//console.log("-> " + pmessage.args[0]);
					Channels.emit.apply(Channels, pmessage.args);
				}
			}
		});

		Channels.subscribeToGlobal = function(pattern){
			process.on("message", function(pmessage){
				if (typeof pmessage == "object" && pmessage.type && pmessage.type == "channelMessage" && pmessage.args){
					Channels.emit.apply(Channels, pmessage.args);		
				}
			});
			Channels.emitToGlobal("channel.subscribe", pattern);
		};

		Channels.emitToGlobal = function(path, message){
			process.send({ type : path, args : message });
		};

		Channels.followed = {};

		function follower(message){
			var params = [];			
			//console.log("<- " + message.source);
			params.push(message.source);
			for (var i = 1; i < arguments.length; i++){
				params.push(arguments[i]);
			}
			Channels.emitToGlobal("message.follow", params);
		};

		Channels.followToGlobal = function(pattern){
			//console.log("--> Following " + pattern);	
			Channels.on(pattern, follower);
		};

		for (var pattern in subscribers){
			Channels.followToGlobal(pattern);
		}

		node.on("state", follower);
	}

	node.on("state", function(state){
		console.log((">>>> " + this.Status).red);
	});
	
	process.nextTick(function InitSelf(){
		console.log("-------------------------------------------------------------------------".prompt);
		node.once("initialized", function(){
			node.Load();
		});
		node.Init(config);
	});

	var pinterval = setInterval(function(){
		node.Ping();
	}, 1000);

	process.on('exit', function(){
		clearInterval(pinterval);
	});
}
catch(err){
	if (process.send){
		Channels.emitToGlobal("process.error", err);
	}
	else{
		throw err;
	}
}
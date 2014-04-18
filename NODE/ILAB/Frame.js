var Path = require('path');
var fs = require('fs');

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

try{
	useModule("Utils.js");
	useModule("logger.js");
	useModule("Channels.js");
	useModule("Async.js");
	var Logger = useModule("logger.js");
	useNodeType("node.js");
	useNodeType("internalnode.js");

	global.isChild = false;
	if (process.env.isChild) global.isChild = true;
	
	var config = process.argv[2];
	if (config) config = JSON.parse(config);
	var logger = new Logger(isChild ? process.env.parentNode: null, !isChild);
	
	if (!global.isChild){
		logger.info("%green;Frame server started: {0} %grey;{1}", process.cwd(), config.config);
	}
	else{
		logger.info("%green;Frame module started: {0}", process.env.parentNode);
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
	
	if (!config.id){
		config.id = "Main";
	}
				
	if (!global.NodesByTypes){
		global.NodesByTypes = {};
		var nodes = fs.readdirSync(Path.resolve(global.NodesPath));
		for (var i = 0; i < nodes.length; i++){
			try{
				var node = require(Path.resolve(global.NodesPath + nodes[i]));
				if (node && node.Type){
					NodesByTypes[node.Type] = node;
					if (!global.isChild){
						logger.info("Support node type: %marine;{0}", node.Type);
					}
				}
			}
			catch(error){
				logger.error("Node type load error: %error;{0} : {1}", nodes[i]);
			}
		}
	}
	
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

	var unloadingTimeout = null;
	
	function UnloadBlocking(callback) {
		if (global.pinterval){
			clearInterval(global.pinterval);
		}
		if (!unloadingTimeout){
			console.log("EXIT INITIATED");
		}
		else{
			clearTimeout(unloadingTimeout);
		}
	}
	
	process.on('SIGTERM', UnloadBlocking);
	process.on('exit', UnloadBlocking);

	if (isChild){
		process.on("message", function(pmessage){
			if (pmessage == 'process.start'){
				try{
					node.Start();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.stop'){
				try{
					node.Stop();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.sleep'){
				try{
					node.Sleep();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.unload'){
				node.Unload();
				unloadingTimeout = setTimeout(function(){
					logger.warn("CHILD PROCESS EXITED BY TIMEOUT 3s !");
					unloading = true;
					process.exit();
				}, 3000);
			}
			if (typeof pmessage == "object"){
				if (pmessage.type && pmessage.type == "channel.subscribe" && pmessage.pattern){
					if (pmessage.clientId){
						var client = Channels.followed[pmessage.clientId];
						if (client){
							if (client[pmessage.pattern]){
								logger.warn("REFOLLOWING PATTERN DETECTED: " + pmessage.pattern);
								return;
							}
						}
						else{
							client = Channels.followed[pmessage.clientId] = {};
						}
						client[pmessage.pattern] = 1;
					}
					else{
						//console.warn("Anonymous client DETECTED " + pmessage.pattern);				
					}			
					Channels.followToGlobal(pmessage.pattern);
				}
				if (pmessage.type && pmessage.type == "channel.message"){
					var dateEnd = new Date();
					var dateStart = new Date(pmessage.date);
					//console.log("-> " + pmessage.args[0]);
					Channels.emit.apply(Channels, pmessage.args);
				}
			}
		});

		Channels.emitToGlobal = function(path, message, source){
			process.send({ type : path, args : message, source: source });
		};
		
		Channels.subscribeToGlobal = function(pattern){
			process.on("message", function(pmessage){
				if (typeof pmessage == "object" && pmessage.type && pmessage.type == "channelMessage" && pmessage.args){
					Channels.emit.apply(Channels, pmessage.args);		
				}
			});
			Channels.emitToGlobal("channel.subscribe", pattern);
		};

		Channels.followed = {};

		function follower(message){
			Channels.emitToGlobal("channel.follow", arguments);
		};

		Channels.followToGlobal = function(pattern){
			//console.log("--> Following " + pattern);	
			Channels.on(pattern, follower);
		};
		
		if (isChild){
			var subscribers = process.argv[3];
			if (subscribers) subscribers = JSON.parse(subscribers);
		}

		for (var pattern in subscribers){
			Channels.followToGlobal(pattern);
		}

		node.on("state", function(state){
			Channels.emitToGlobal("process.state", arguments);
			//Channels.emitToGlobal("process." + Node.Statuses[state], arguments);
		});
		
	}
	
	node.on("state", function(state){
		logger.info(("%red; " + this.Status));
	});
	
	node.on('unloaded', function(){
		if (global.pinterval){
			clearInterval(global.pinterval);
		}
		process.exit();				
	});
	
	process.nextTick(function InitSelf(){
		if (!isChild){
			console.log("-------------------------------------------------------------------------");
		}
		node.once("initialized", function(){
			try{
				global.pinterval = setInterval(function(){
					if (node.State > Node.States.INITIALIZED && node.State < Node.States.UNLOADING)	node.Ping();
				}, 1000);
				node.Load(function loaded(){
					if (!isChild){
						if (node.State > Node.States.INITIALIZED && node.State < Node.States.UNLOADING){
							node.Start();
						}				
					}
				});
			}
			catch (error){
				if (isChild){
					process.send('error', error);
				}
				else{
					console.error(error);
				}
			}
		});
		try{
			node.Init(config);
		}
		catch (error){
			if (isChild){
				process.send('error', error);
			}
			else{
				console.error(error);
			}
		}
	});
}
catch(err){
	if (isChild && Channels.emitToGlobal){
		Channels.emitToGlobal("process.error", err);
	}
	else{
		throw err;
	}
}
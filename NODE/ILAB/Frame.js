var Path = require('path');
var fs = require('fs');

Frame = {};

Frame.ilabPath = process.argv[1];
Frame.ilabPath = Path.dirname(Frame.ilabPath);

Frame.NodesPath =  Frame.ilabPath + "\\Nodes\\";
Frame.ModulesPath = Frame.ilabPath + "\\Modules\\";
Frame.ServicesPath = Frame.ilabPath + "\\Services\\";
Frame.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules\\";
Frame.Nodes = {};
Frame.Modules = [];
Frame.Services = {};

global.useNodeType = Frame.useNodeType = function(path){
	if (path.indexOf(".js") != path.length - 3){
	  if (Frame.NodesByTypes[path]) return Frame.NodesByTypes[path];
	  path += ".js";
	}
	return require(Path.resolve(Frame.NodesPath + path));
};

global.useModule = Frame.useModule = function(path){
	if (path.indexOf(".js") != path.length - 3){
	  path += ".js";
	}
	return require(Path.resolve(Frame.ModulesPath + path));
};

global.useSystem = Frame.useSystem = function(path){
	return require(Path.resolve(Frame.NodeModulesPath + path));
};

global.useService = Frame.useService = function(path, config){
	var service = Frame.Services[path];
	if (service) return service;
	var serviceNodeType = Frame.NodesByTypes["service"];
	if (!serviceNodeType) throw "Service node not available!";	
	service = Frame.Nodes[path];
	if (service){
		if (!(service instanceof serviceNodeType)) throw "Using incorrect " + path + " node as service!";	
		Frame.Services[path] = service;
		if (config) service.configure(config);
		return service;
	}
	if (path.indexOf(".js") != path.length - 3){
	  path += ".js";
	}
	if (!config) config = {};
	config.Service = path;
	service = Frame.CreateNode(config, serviceNodeType, Frame.Logger);
	Frame.Services[path] = service;
	return service;
};	

Frame.Services = {};

Frame.CreateNode = function(config, defaultNode, logger){
	if (!config) config = { Type : defaultNode };
	nodePath = config.Type !== undefined ? config.Type : config.type;
	var node = null;
	if (nodePath) {
		var nType = Frame.NodesByTypes[nodePath];
		if (nType){
			node = new nType(this, config.id);
		}
	}		
	else{
		nodePath = config.Node;
		if (!nodePath) nodePath = config.node;
		function SearchNodeParent(checkedNode){
			if (!checkedNode) return false;
			if (checkedNode.prototype == Node) return true;
			else return SearchNodeParent(checkedNode.prototype);
		}
		if (nodePath) {
			nodePath = Path.resolve(nodePath);
			if (fs.existsSync(nodePath)){
				var node = Frame.NodesByTypes[nodePath] = require(nodePath);
				if (!SearchNodeParent(node)){
					if (logger){
						logger.error("Node " + nodePath + " is not node instance!");
					}
					else{
						throw "Node " + nodePath + " is not node instance!";	
					}							
					return null;
				}
			}
			else{
				if (logger){
					logger.error("Node " + nodePath + " load error!");
				}
				else{
					throw "Node " + nodePath + " load error!";	
				}
				return null;
			}
		}
		if (node){				
			if (typeof(node) == "function"){
				node = new node(this, config.id);
			}
			else{
				if (logger){
					logger.error("Node " + nodePath + " is not a function!");
				}
				else{
					throw "Node " + nodePath + " is not a function!";	
				}
			}
		}
		else{
			if (defaultNode) {
				if (typeof defaultNode == "string"){
					config.Type = defaultNode;
					return Frame.CreateNode(config, defaultNode, logger);
				}
				if (defaultNode && typeof defaultNode == "object"){
					node = new defaultNode(this, config.id);
				}
			}
		}		
	}
	if (node){				
		Frame.Nodes[node.id] = node;
		return node;
	}
	if (logger){
		logger.error("Node " + nodePath + " not found!");
	}
	else{
		throw "Node " + nodePath + " not found!";	
	}
	return null;
};

Frame.GetNodeById = function(id){
	return Frame.Nodes[id];
}

Frame._initFrame = function(){
	Frame.LogLevel = Logger.Levels.trace;
	Frame.isChild = false;
	if (process.env.isChild) Frame.isChild = true;
	
	var config = process.argv[2];
	
	function _parseConfig(cfgStr, filePath){
		if (cfgStr){
			if (filePath){
				if (filePath.ends(".json")){
					return JSON.parse(cfgStr);
				}
				if (filePath.ends(".js")){
					return eval("var configObj = " + cfgStr + ";configObj;");
				}
			}
			else{
				return cfgStr;
			}
		}
		return null;
	}
	config = JSON.parse(config);

	var logger = new Logger(Frame.isChild ? process.env.parentNode: null, !Frame.isChild);

	if (Frame.isChild){
		logger.info("%green;Frame module started: {0}", process.env.parentNode);
	}
	else{
		logger.info("%green;Frame server started: {0} %grey;{1}", process.cwd(), config.config);		
	}

	if (config.config){
		config.config = Path.resolve(config.config);
		if (fs.existsSync(config.config)){
			function ReloadConfig(){
				var cfgFile = fs.readFileSync(config.config, "", 'utf8');
				if (cfgFile && cfgFile.length > 0){
					cfgFile = _parseConfig(cfgFile, config.config);
					for (var item in cfgFile){
						var val = cfgFile[item];
						config[item] = val;
					}
				}
				useConfig(config);
			}
		
			ReloadConfig();
			
			ConfigWatcher = fs.watch(config.config);	
			
			ConfigWatcher.on("change",  function(event, fname){
				logger.warn("Config " + (event ? event : "UNKNOWN") + " event occured!" + (fname ? fname : ""));
				if (Frame.isReload) return;
				if (event == "change"){
					logger.warn("Reloading...");
					logger.warn(event);
					Frame.isReload	= true;
					setTimeout(function(){
						logger.warn("Config Reload interval cleared! ");
						Frame.isReload = false;
					}, 300);
					Frame.RootNode.Unload(function(){
						logger.warn("Unloding finished...");
						config = JSON.parse(process.argv[2]);
						ReloadConfig();			
						logger.warn("Initializing...");
						Frame.RootNode.Configure(config);
						Frame.RootNode.Load();
					});
				};
			});
			
		}
		else{
			logger.error("Config file " + config.config + " not found");
		}
	}		

	function useConfig(){
		if (config.LogLevel && Logger.Levels[config.LogLevel + ""]) Frame.LogLevel = Logger.Levels[config.LogLevel + ""];
		if (!config.id){
			config.id = "Main";
		}	
	}
				
	if (!Frame.NodesByTypes){
		Frame.NodesByTypes = {};
		var nodes = fs.readdirSync(Path.resolve(Frame.NodesPath));
		for (var i = 0; i < nodes.length; i++){
			try{
				var node = require(Path.resolve(Frame.NodesPath + nodes[i]));
				if (node && node.Type){
					Frame.NodesByTypes[node.Type] = node;
					if (!Frame.isChild){
						logger.info("Support node type: %marine;{0}", node.Type);
					}
				}
			}
			catch(error){
				logger.error("Node type load error: %error;{0} : {1}", nodes[i], error);
			}
		}
	}

	if (!config.Modules) config.Modules = [];
	logger.debug("Modules in " + Frame.ModulesPath);
	Frame.Modules = [];
	for (var i = 0; i < config.Modules; i++){
		logger.debug("LoadModule " + config.Modules[i]);
		Frame.Modules.push(useModule(config.Modules[i]));
	}

	Frame.RootNode = Frame.CreateNode(config);
	logger.log("Frame.RootNode is " + Frame.RootNode.type);

	var unloadingTimeout = null;

	function UnloadBlocking(callback) {
		if (Frame.pinterval){
			clearInterval(Frame.pinterval);
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

	if (Frame.isChild){
		process.on("message", function(pmessage){
			if (pmessage == 'process.start'){
				try{
					Frame.RootNode.Start();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.stop'){
				try{
					Frame.RootNode.Stop();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.sleep'){
				try{
					Frame.RootNode.Sleep();
				}
				catch (error){
					process.send('error', error);
				}
			}
			if (pmessage == 'process.unload'){
				Frame.RootNode.Unload();
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
		
		if (Frame.isChild){
			var subscribers = process.argv[3];
			if (subscribers) subscribers = JSON.parse(subscribers);
		}

		for (var pattern in subscribers){
			Channels.followToGlobal(pattern);
		}

		Frame.RootNode.on("state", function(state){
			Channels.emitToGlobal("process.state", arguments);
			//Channels.emitToGlobal("process." + Node.Statuses[state], arguments);
		});
	}

	Frame.RootNode.on("state", function(state){
		logger.info(("%red; " + this.Status));
	});

	Frame.RootNode.on('unloaded', function(){
		if (Frame.pinterval){
			clearInterval(Frame.pinterval);
		}
		if (!Frame.isReload){
			process.exit();				
		}
	});

	function MainLoadNode(){
		try{
			if (Frame.pinterval) clearInterval(Frame.pinterval);
			Frame.pinterval = setInterval(function(){
				if (Frame.RootNode.State > Node.States.INITIALIZED && Frame.RootNode.State < Node.States.UNLOADING)	Frame.RootNode.Ping();
			}, 1000);
			Frame.RootNode.Configure(config);
			Frame.RootNode.Load(function loaded(){
				if (!Frame.isChild){
					if (Frame.RootNode.State > Node.States.INITIALIZED && Frame.RootNode.State < Node.States.UNLOADING){
						Frame.RootNode.Start();
					}				
				}
			});
		}
		catch (error){
			if (Frame.isChild){
				process.send('error', error);
			}
			else{
				console.error(error);
			}
		}
	};

	process.nextTick(function InitSelf(){
		if (!Frame.isChild){
			console.log("-------------------------------------------------------------------------");
		}
		Frame.RootNode.on("initialized", MainLoadNode);
		try{
			Frame.RootNode.Init();
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

try{
	Frame.useModule("Utils.js");
	Frame.useModule("Channels.js");
	Frame.useModule("Async.js");
	Logger = Frame.useModule("logger.js");
	Frame.useNodeType("node.js");

	process.setMaxListeners(100);
	
	
	Frame._initFrame();
}
catch(err){
	if (Frame.isChild && Channels.emitToGlobal){
		Channels.emitToGlobal("process.error", err);
	}
	else{
		throw err;
	}
}
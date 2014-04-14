var Path = require('path');

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
var Logger = useModule("logger.js");
useNodeType("node.js");
useNodeType("internalnode.js");

var config = process.argv[2];
if (config) config = JSON.parse(config);
var subscribers = process.argv[3];
if (subscribers) subscribers = JSON.parse(subscribers);

try{
	var node = new InternalNode(config.parentNode);

	node.on('initialized', function(){
		node.Load();
	});

	if (config.autostart){
		node.on('loaded', function(){
			node.Start();
		})
	};
	
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
	
	if (typeof(config) == 'string'){
		if (fs.existsSync(Path.resolve(config))){
			if (!module.parent){
				this.logger.info("<green:Frame server started: {0}>", config);
			}
			else{
				this.logger.info("<green:Frame module started: {0}>", config);
			}
			var cfgFile = fs.readFileSync(Path.resolve(config), "", 'utf8');
			config = JSON.parse(cfgFile);
		}
	}				
				
	process.on('SIGTERM', UnloadBlocking);
	process.on('exit', UnloadBlocking);
	process.on('EXITING', UnloadSelf);

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
		process.send({ type : "channelControl", pattern : pattern });
	};

	Channels.emitToGlobal = function(message){
		process.send({ type : "channelMessage", args : arguments });
	};

	Channels.followed = {};

	function follower(message){
		var params = [];			
		//console.log("<- " + message.source);
		params.push(message.source);
		for (var i = 1; i < arguments.length; i++){
			params.push(arguments[i]);
		}
		Channels.emitToGlobal(params);
	};

	Channels.followToGlobal = function(pattern){
		//console.log("--> Following " + pattern);	
		Channels.on(pattern, follower);
	};

	for (var pattern in subscribers){
		Channels.followToGlobal(pattern);
	}

	node.on("state", follower);

	process.nextTick(function InitSelf(){
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
	console.error(err);
}
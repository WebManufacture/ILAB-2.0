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

global.useService = Frame.useService = function(path){
	if (path.indexOf(".js") != path.length - 3){
	  path += ".js";
	}
	return require(Path.resolve(Frame.ServicesPath + path));
};

global.useSystem = Frame.useSystem = function(path){
	return require(Path.resolve(Frame.NodeModulesPath + path));
};

Frame.CreateNode = function(config, defaultNode){
	if (!config) config = { Type : defaultNode };
	var nodePath = config.Node != null ? config.Node : config.node;
	var node = null;
	if (nodePath) {
		function SearchNodeParent(checkedNode){
			if (!checkedNode) return false;
			if (!checkedNode.super_) return false;
			if (checkedNode.super_ == Node) return true;
			else return SearchNodeParent(checkedNode.super_);
		}
		nodePath = Path.resolve(nodePath);
		if (fs.existsSync(nodePath)){
			var node = require(nodePath);
			if (!SearchNodeParent(node)){
				throw "Node " + nodePath + " is not node instance!";
			}
		}
		else{
			throw "Node " + nodePath + " create error!";
		}
	}		
	else{
		nodePath = config.Type !== undefined ? config.Type : config.type;
		if (nodePath){
			node = Frame.useNodeType(nodePath);
		}
	}	
	if (node){				
		if (typeof(node) == "function"){
			node = new node(this, config.id);
		}
		else{
			throw "Node " + nodePath + " is not a function!";
		}
	}
	else{
		if (defaultNode) {
			if (typeof defaultNode == "string"){
				config.type = defaultNode;
				return Frame.CreateNode(config, defaultNode);
			}
			if (defaultNode && typeof defaultNode == "object"){
				node = new defaultNode(this, config.id);
			}
		}
	}	
	if (node){				
		Frame.Nodes[node.id] = node;
		return node;
	}
	throw ("Node " + nodePath + " not found!");
	return null;
};

Frame.GetNodeById = function(id){
	return Frame.Nodes[id];
}

Frame._loadRootNode = function() {
    try {
        if (Frame.pinterval) clearInterval(Frame.pinterval);
        Frame.pinterval = setInterval(function () {
            if (Frame.RootNode.State > Node.States.INITIALIZED && Frame.RootNode.State < Node.States.UNLOADING)    Frame.RootNode.Ping();
        }, 1000);
        Frame.RootNode.Configure(Frame.Config.get(">"));
        Frame.RootNode.Load(function loaded() {
            if (!Frame.isChild) {
                if (Frame.RootNode.State > Node.States.INITIALIZED && Frame.RootNode.State < Node.States.UNLOADING) {
                    Frame.RootNode.Start();
                }
            }
        });
    }
    catch (error) {
        if (Frame.isChild) {
            process.send('error', error);
        }
        else {
            console.error(error, error.stack);
        }
    }
};

Frame._initFrame = function () {

    try {
        Frame.useModule("Utils.js");
        Frame.useModule("Async.js");
        var ServicesManager = new (Frame.useModule("ServicesManager.js"))();

        process.setMaxListeners(100);

        var Storage = useModule("Storage.js");

        var config = process.argv[2];

        var configServiceType = "DirectConfigService";

        try {
            config = JSON.parse(config);
            if (config.cwd) {
                process.chdir(config.cwd)
            }
            if (config.file) {
                configServiceType = "FileConfigService";
                config = config.file;
            }
        }
        catch (e) {
            configServiceType = "FileConfigService";
            if (config.indexOf("http://") == 0) {
                configServiceType = "RemoteConfigService";
            }
            if (config.indexOf("db://") == 0) {
                configServiceType = "DBConfigService";
            }
        }

        if (ServicesManager.IsServiceAvailable(configServiceType)) {
            var service = ServicesManager.LoadService(configServiceType)
            if (service) {
                service.Configure(config);
                Frame.Config = ServicesManager.GetServiceContract(configServiceType);
            }
        }
        else {
            Frame.Config = new Storage();
            if (typeof (config) == "object") {
                Frame.Config.LoadData(config)
            }
        }

        config = {};
        config.Modules = Frame.Config.get("@Modules");

        Logger = Frame.useModule("logger.js");

        Frame.LogLevel = Logger.Levels.trace;
        config.LogLevel = Frame.Config.get("@LogLevel");
        if (!isNaN(parseInt(config.LogLevel))) {
            Frame.LogLevel = config.LogLevel;
        }
        Logger.useConsole = true;
        Logger.setLogLevel(Frame.LogLevel);


        Frame.isChild = false;
        if (process.env.isChild) Frame.isChild = true;


        config.rootNode = Frame.Config.get(">");

        var logger = new Logger(Frame.isChild ? process.env.parentNode : null, !Frame.isChild);

        if (Frame.isChild) {
            logger.info("%green;Frame module started: {0}", process.env.parentNode);
        }
        else {
            logger.info("%green;Frame server started: {0} %grey;{1}", process.cwd(), Frame.Config);
        }

        //Frame..Reload(true);

        /*
         function _Reload(){
         config = Frame.Storage.get("*");
         if (config.LogLevel && Logger.Levels[config.LogLevel + ""]) Frame.LogLevel = Logger.Levels[config.LogLevel + ""];
         if (!config.id){
         config.id = "Main";
         }
         }

         _Reload();

         Frame.Storage.on("reloaded",  function(event, fname){
         logger.warn("Config " + (event ? event : "UNKNOWN") + " event occured!" + (fname ? fname : ""));
         if (Frame.isReload) return;
         logger.warn("Reloading...");
         logger.warn(event);
         Frame.isReload	= true;
         setTimeout(function(){
         logger.warn("Config Reload interval cleared! ");
         Frame.isReload = false;
         }, 300);
         Frame.RootNode.Unload(function(){
         logger.warn("Unloding finished...");
         _Reload();
         logger.warn("Initializing...");
         Frame.RootNode.Configure(config);
         Frame.RootNode.Load();
         });
         });
         */

        if (!config.Modules) config.Modules = [];
        logger.debug("Modules in " + Frame.ModulesPath);
        Frame.Modules = [];
        for (var i = 0; i < config.Modules; i++) {
            logger.debug("LoadModule " + config.Modules[i]);
            Frame.Modules.push(useModule(config.Modules[i]));
        }

        Frame.RootNode = Frame.CreateNode(config.rootNode, "Node");

        if (Frame.RootNode) {
            logger.log("Frame.RootNode is " + Frame.RootNode.type);

            var unloadingTimeout = null;

            function UnloadBlocking(callback) {
                if (Frame.pinterval) {
                    clearInterval(Frame.pinterval);
                }
                if (!unloadingTimeout) {
                    console.log("EXIT INITIATED");
                }
                else {
                    clearTimeout(unloadingTimeout);
                }
            }

            process.on('SIGTERM', UnloadBlocking);
            process.on('exit', UnloadBlocking);

            if (Frame.isChild) {
                var Channels = useModule("Channels.js")();

                process.on("message", function (pmessage) {
                    if (pmessage == 'process.start') {
                        try {
                            Frame.RootNode.Start();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.stop') {
                        try {
                            Frame.RootNode.Stop();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.sleep') {
                        try {
                            Frame.RootNode.Sleep();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.unload') {
                        Frame.RootNode.Unload();
                        unloadingTimeout = setTimeout(function () {
                            logger.warn("CHILD PROCESS EXITED BY TIMEOUT 3s !");
                            unloading = true;
                            process.exit();
                        }, 3000);
                    }
                    if (typeof pmessage == "object") {
                        if (pmessage.type && pmessage.type == "channel.subscribe" && pmessage.pattern) {
                            if (pmessage.clientId) {
                                var client = Channels.followed[pmessage.clientId];
                                if (client) {
                                    if (client[pmessage.pattern]) {
                                        logger.warn("REFOLLOWING PATTERN DETECTED: " + pmessage.pattern);
                                        return;
                                    }
                                }
                                else {
                                    client = Channels.followed[pmessage.clientId] = {};
                                }
                                client[pmessage.pattern] = 1;
                            }
                            else {
                                //console.warn("Anonymous client DETECTED " + pmessage.pattern);
                            }
                            Channels.followToGlobal(pmessage.pattern);
                        }
                        if (pmessage.type && pmessage.type == "channel.message") {
                            var dateEnd = new Date();
                            var dateStart = new Date(pmessage.date);
                            //console.log("-> " + pmessage.args[0]);
                            Channels.emit.apply(Channels, pmessage.args);
                        }
                    }
                });

                Channels.emitToGlobal = function (path, message, source) {
                    process.send({type: path, args: message, source: source});
                };

                Channels.subscribeToGlobal = function (pattern) {
                    process.on("message", function (pmessage) {
                        if (typeof pmessage == "object" && pmessage.type && pmessage.type == "channelMessage" && pmessage.args) {
                            Channels.emit.apply(Channels, pmessage.args);
                        }
                    });
                    Channels.emitToGlobal("channel.subscribe", pattern);
                };

                Channels.followed = {};

                function follower(message) {
                    Channels.emitToGlobal("channel.follow", arguments);
                };

                Channels.followToGlobal = function (pattern) {
                    //console.log("--> Following " + pattern);
                    Channels.on(pattern, follower);
                };

                if (Frame.isChild) {
                    var subscribers = process.argv[3];
                    if (subscribers) subscribers = JSON.parse(subscribers);
                }

                for (var pattern in subscribers) {
                    Channels.followToGlobal(pattern);
                }

                Frame.RootNode.on("state", function (state) {
                    Channels.emitToGlobal("process.state", arguments);
                    //Channels.emitToGlobal("process." + Node.Statuses[state], arguments);
                });
            }

            Frame.RootNode.on("state", function (state) {
                logger.info(("%red; " + this.Status));
            });

            Frame.RootNode.on('unloaded', function () {
                if (Frame.pinterval) {
                    clearInterval(Frame.pinterval);
                }
                if (!Frame.isReload) {
                    process.exit();
                }
            });


            process.nextTick(function InitSelf() {
                if (!Frame.isChild) {
                    console.log("-------------------------------------------------------------------------");
                }
                Frame.RootNode.on("initialized", Frame._loadRootNode);
                try {
                    Frame.RootNode.Init();
                }
                catch (error) {
                    if (Frame.isChild) {
                        process.send('error', error);
                    }
                    else {
                        console.error(error, error.stack);
                    }
                }
            });
        }
        else{

        }
    }
    catch (err) {
        if (Frame.isChild && Channels && Channels.emitToGlobal) {
            Channels.emitToGlobal("process.error", err);
        }
        else {
            console.error(err, err.stack);
            //console.error(err);
        }
    }
}

Frame._initFrame();
var http = require('http');
var Url = require('url');
var Path = require('path');

function _regOlds(){
	console.error("USING OBSOLETE ENVIRONMENT!");
	var ilabPath = process.argv[1];
	ilabPath = Path.dirname(ilabPath);
	var NodesPath =  ".\\ILAB\\Nodes\\";
	var ModulesPath = ".\\ILAB\\Modules\\";
	var ServicesPath = ".\\ILAB\\Services\\";
	var nodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules\\";
	if (!global.useNodeType){
		global.useNodeType = function(path){
			if (path.indexOf(".js") != path.length - 3){
			  path += ".js";
			}
			return require(Path.resolve(NodesPath + path));
		};
	}

	if (!global.useModule){
		global.useModule = function(path){
			if (path.indexOf(".js") != path.length - 3){
			  path += ".js";
			}
			return require(Path.resolve(ModulesPath + path));
		};
	}
	
	if (!global.useSystem){
		global.useSystem = function(path){
			return require(Path.resolve(nodeModulesPath + path));
		};
	}
}

_regOlds();


useModule("Utils.js");
var debug = useSystem('debug');
var logger = useModule("Logger.js");
var Forks = useModule("Forks.js");
var Files =  useModule("Files.js");
 useModule("Channels.js");
var channelsClient =  useModule("ChannelsClient.js");
var DBProc =  useModule("DBProc.js");
var fs = require('fs');
var httpProxy = useSystem('http-proxy');
var proxy = new httpProxy.createProxyServer({});
var colors = useSystem('colors');



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

NodeProto = {
	serialize : function(){
		return {
			key : this.config.id,
			id : this.config.id,
			fork : this.Fork ? this.Fork.toString() : null,
			args : this.config.Args,
			state : this.State,
			file : this.config.Frame ? this.config.Frame + ":" + this.config.File : this.config.File,
			host : this.config.Host,
			port : this.config.Port,
			localPort : this.ProxyPort,
			nodeType : this.type,
			processType : this.process,
			name : this.config.id,
			url: this.url, 
			conf: this.config
		}
	},	
	
	toString : function(){
		return JSON.stringify(this.serialize());
	},
}

InternalNode = function(item, config){
	this.id = (item.id + "").toLowerCase();
	this.config = item;
}

InternalNode.prototype = {
	Init : function(){	
		var item = this.config;
		this.logger = logger.create(this.id + "/log");
		try{
			this.module = require(Path.resolve(item.execFile));	
			if (typeof(this.module) == "function"){
				this.module = this.module(item);
			}
		}
		catch (e){
			error(e);
			this.State = "exited";
		}		
		if (!this.module){
			return;
		}	
		var module = this.module;
		var node = this;		
		if (this.type == "proxied" && this.module.ProcessRequest){
			var serv = ILabRouter.AddProxiedNode(this, item, function(req, res, context){
				res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				return module.ProcessRequest(req, res);
			});
		}
		if (this.type == "managed"){
			var serv = ILabRouter.AddManagedNode(this, item, function(context){
				context.res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				return module.ProcessContext(context);
			});
		}
		this._server = serv._server;
		if (this.module.Init){
			this.module.Init(item, ILab.Config, logger, serv ? serv.router : null);
		}
		var node = this;
		Channels.on("/" + this.id + "/control.start", function(){
			console.log("Starting: " + node.id);
			node.Start();
		});
		Channels.on("/" + this.id + "/control.stop", function(){
			console.log("Stopping: " + node.id);
			node.Stop();
		});	
		Channels.on("/" + this.id + "/control.reset", function(){
			console.log("Reset: " + node.id);
			node.Reset();
		});
	},
	
	Start : function(){
		try{
			var node = this;
			this.module.Start(function(){
				node.State = "working";
				console.log(node.id + " working".green);
				Channels.emit("/" + node.id + ".node/state.working", node.serialize());			
			}, this._server);
		}
		catch (e){
			console.log(e);
			Channels.emit("/" + node.id + ".node/state.error", node.serialize());	
		}
	},	
	
	Stop : function(){
		try{
			var node = this;
			this.module.Stop(function(){
				node.State = "stopped";
				console.log(node.id + " Stopped".yellow);
				Channels.emit("/" + node.id + ".node/state.stopped", node.serialize());
			}, this._server);			
		}
		catch (e){
			Channels.emit("/" + node.id + ".node/state.error", node.serialize());	
			console.log(e);
		}
	},
	
	Reset : function(){
		try{
			if (this.State == "working"){
				this.Stop();
			}
			this.Start();
		}
		catch (e){
			console.log(e);
		}
	}, 
	
	Process : function(req, res, context){
		
	}
}

IsolatedNode = function(rr, config){
	var fork = this.Fork = Forks.Create(rr.execFile, null, rr.id);
	this.id = (rr.id + "").toLowerCase();
	var node = this;
	if (!rr.Args) rr.Args = {};
	fork.args = JSON.stringify(rr);
	fork.args = JSON.parse(fork.args);
	fork.on("/state", function(message, state){
		node.State = state;
		Channels.emit("/" + node.id + ".node/state." + state, node.serialize());	
		if (state == "working"){
			console.log(rr.id + " working".info);
		}
	});
	fork.on(".exit", function(message){
		node.State = "exited";
		console.log(rr.id + " '" + rr.execFile + "' - " + (rr.Host + ":" + node.ProxyPort) + " exited".warn);
	});
	fork.on(".error", function(cmessage, error){
		node.State = "error";
		console.log(rr.id + " '" + rr.execFile + "' - " + (rr.Host + ":" + node.ProxyPort) + " error".error);
		//console.log(error);
	});
	Channels.on("/" + this.id + "/control.start", function(){
		console.log("Starting: " + node.id);
		node.Start();
	});
	Channels.on("/" + this.id + "/control.stop", function(){
		console.log("Stopping: " + node.id);
		node.Stop();
	});	
	Channels.on("/" + this.id + "/control.reset", function(){
		console.log("Reset: " + node.id);
		node.Reset();
	});
}

IsolatedNode.prototype = {
	Init : function(item){
		if (!item.Args) item.Args = {};
		var pp = this.ProxyPort = ILabRouter.ProxyPort;
		this.Fork.args.Host = "localhost";
		this.Fork.args.ProxyPort = pp;
		var node = this;
		if (this.type == "managed"){
			var serv = ILabRouter.AddManagedNode(this, item, function(context){
				context.res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				proxy.web(context.req, context.res, { target: "http://127.0.0.1:" + pp });
				context.abort();
				return true;
			});
		}
		if (this.type == "proxied"){
			var serv = ILabRouter.AddProxiedNode(this, item, function(req, res){
				res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				proxy.web(req, res, { target: "http://127.0.0.1:" + pp });
				return false;
			});
		}
		ILabRouter.ProxyPort++;
	},

	Start : function(){
		this.Fork.start();
	},
	
	Stop : function(){
		this.Fork.stop();
	},
	
	Reset : function(){
		this.Fork.reset();
	},
	
	Process : function(req, res, context){
		
	}
}
	
ExternalNode = function(item, cfg){
	
}

ExternalNode.prototype = {
	Init : function(){
		
	},

	Start : function(){
		
	},
	
	Stop : function(){
		
	},
	
	Reset : function(){
		
	},
	
	Process : function(req, res, context){
		
	}
}

for (var item in NodeProto){
	ExternalNode.prototype[item] = NodeProto[item];
	IsolatedNode.prototype[item] = NodeProto[item];
	InternalNode.prototype[item] = NodeProto[item];
}

ILab = {};

ILab.Init = function(){
	process.setMaxListeners(100);
	console.log(process.cwd().prompt);
	var cfg = { ver: "0.1.4", Port : 80, PortStart : 7000, routingFile: "./ILAB/RoutingTable.json" };
	
	for (var i = 2; i < process.argv.length; i++){
		var arg = process.argv[i];
		var val = arg.split("=");
		if (val.length == 2){
			cfg[val[0]] = val[1];
		}
	}
	
	ILab.Config = cfg;
	ILab.Nodes = {};
	if (fs.existsSync(cfg.cfgFile)){
		var cfgFile = fs.readFileSync(cfg.cfgFile, "", 'utf8');
		if (cfgFile && cfgFile.length > 0){
			cfgFile = JSON.parse(cfgFile);
			for (var item in cfgFile){
				var val = cfgFile[item];
				cfg[item] = val;
			}
		}
	}
	if (!fs.existsSync(cfg.routingFile)){
		fs.writeFile(cfg.routingFile, "", 'utf8');
	}
	var rtable = fs.readFileSync(cfg.routingFile, 'utf8');
	ILab.ConfigSource = rtable = JSON.parse(rtable);
	var servers = {};
	if (rtable && rtable.length > 0){
		ILabRouter.ProxyPort = cfg.PortStart;
		for (var i = 0; i < rtable.length; i++){
			var item = rtable[i];
			var node = ILab.CreateNode(item, cfg);
			ILab.Nodes[item.id] = node;
			if (node.type == 'http'){
				if (!servers[node.port]){
					servers[node.port] = {};
				}
				if (!servers[node.port][node.host]){
					servers[node.port][node.host] = 0;
				}
				servers[node.port][node.host]++;
			}
		}
	}
	for (var id in ILab.Nodes){
		var node = ILab.Nodes[id];
		var item = node.config;
		if (!node.type){
			if (servers[node.port][node.host] && servers[node.port][node.host] > 1){
				node.type = 'managed';
			}
			else{
				node.type = 'proxied';	
			}
		}
		var itemPath = ((node.host ? node.host : "default") + ":" + node.port + (node.ProxyPort ? "(" + node.ProxyPort + ")" : ""));
		if (item.Path){
			itemPath += item.Path;
		}
		if (node.type == 'channeled'){
			itemPath = "";
		}
		var nt = node.type;
		if (!nt) nt = "unknown";
		console.log((item.State == "working" ? nt.yellow : nt.grey) + " " + item.Process.cyan + " " + node.id.info + " " + (itemPath));
		itemPath = ((node.host ? node.host : "default") + ":" + node.port);
		if (node.path){
			itemPath += node.path;
		}
		if (cfg.ExternalHost){
			itemPath = itemPath.replace("default", cfg.ExternalHost);
		}
		else{
			itemPath = itemPath.replace("default", "localhost");
		}
		itemPath = itemPath.replace(">", "").replace("<", "");
		node.url = "http://" + itemPath;
		console.log((" '" + (item.Frame ? item.Frame  + " " : "") + item.File + "'").grey);
	}
	ILab.InitNodes(cfg);
	ILab.Start();
};

ILab.CreateNode = function(item, cfg){
	if (!item.Process){item.Process = "internal"};
	if (!item.id || ILab.Nodes[item.id]) item.id = "node" + i;
	item.id = item.id.toLowerCase();
	if (item.Frame){
		item.execFile = item.Frame + ".js"
	}
	else{
		item.execFile = item.File;
	}			
	if (item.Process == "internal") var node = new InternalNode(item, cfg);
	if (item.Process == "isolated") var node = new IsolatedNode(item, cfg);
	if (item.Process == "external") var node = new ExternalNode(item, cfg);
	node.type = item.Type;
	if (!node.type){
		if (!item.Host && !item.Port && !item.Path){
			node.type = "channeled";
		}
	}
	node.State = item.State
	node.config = item;
	node.process = item.Process;
	if (item.host){
		item.Host = item.host;
		delete item.host;
	}
	if (item.Port){
		node.port = item.Port;
	}
	else{
		node.port = cfg.Port;
	}	
	if (item.Host){
		node.host = item.Host;
		if (!item.Port && item.Host.contains(":")){
			var url = Url.parse(item.Host);
			node.host = url.hostname;
			node.port = url.port;
		}
	}
	return node;
};

ILab.InitNodes = function(cfg){
	for (var id in ILab.Nodes){
		var node = ILab.Nodes[id];
		node.Init(node.config, cfg);
	}
};

ILab.Start = function(){
	for (var id in ILab.Nodes){
		var node = ILab.Nodes[id];
		if (node.config.State == "working"){
			node.Start();
		}
	}
};

ILab.SaveConfig = function(){
	console.log('config rewrite'.warn);
	fs.writeFileSync(ILab.Config.cfgFile, JSON.stringify(ILab.Config), 'utf8');
	fs.writeFileSync(ILab.Config.routingFile, JSON.stringify(ILab.ConfigSource), 'utf8');
};

ILabRouter = {
	Servers : {}
};

ILabRouter.CreateMap = function(routerMapNode){
	if (!routerMapNode) return "Undefined node";
	var mapObj = null;
	for (var item in routerMapNode){
		if (item != "//"){
			var node = routerMapNode[item];
			if (node instanceof Array){
				if (node.length > 0) {
					if (!mapObj) mapObj = {};
					if (node.length > 1) {
						mapObj[item] = [];
						for (var i = 0; i < node.length; i++)
						{
							var to = typeof(node[i]);
							if (to == "object"){
								to = (node[i]._ModuleName ? node[i]._ModuleName : "")  + "{" 
								+ (node[0].GET ? "GET," : "")
								+ (node[0].POST ? "POST," : "")
								+ (node[0].PUT ? "PUT," : "")
								+ (node[0].DELETE ? "DEL," : "")
								+ (node[0].SEARCH ? "SRCH," : "")   
								+ (node[0].HEAD ? "HEAD," : "")
								+ (node[0].OPTIONS ? "OPTS," : "");
								to = to.trim(",") + "}";
								
							}
							if (to == "function"){
								to += " " + node[i].name;
							}
							mapObj[item].push(to);
						}
					}
					else{
						var to = typeof(node[0]);
						if (to == "object"){
							to = (node[0]._ModuleName ? node[0]._ModuleName : "")  + "{" 
							+ (node[0].GET ? "GET," : "")
							+ (node[0].POST ? "POST," : "")
							+ (node[0].PUT ? "PUT," : "")
							+ (node[0].DELETE ? "DEL," : "")
							+ (node[0].SEARCH ? "SRCH," : "")   
							+ (node[0].HEAD ? "HEAD," : "")
							+ (node[0].OPTIONS ? "OPTS," : "");
							to = to.trim(",") + "}";
							
						}
						if (to == "function"){
							to += " " + node[0].name;
						}
						mapObj[item] = to;
					}
				}
			}
			else{
				var value = ILabRouter.CreateMap(node);
				if (value){
					if (!mapObj) mapObj = {};
					mapObj[item] = value;
				}
			}
		}
	}
	return mapObj;
};


ILabRouter.CreateChannelMap = function(channel, count){
	if (!count) count = 1;
	//if (count > 10) return null;
	if (!channel) return;
	var mapObj = null;
	for (var item in channel){
		var node = channel[item];
		if (!mapObj) mapObj = {};
		if (Array.isArray(node)){
			mapObj[item] = "[" + node.length + "]";
		}
		else{
			if (typeof(node) == "object"){
				var value = ILabRouter.CreateChannelMap(node, count + 1);
				if (value){			
					mapObj[item] = value;
				}
			}
			else{
				mapObj[item] = node;
			}
		}
	}
	return mapObj;
};

ILabRouter.ManagedProcess = function(req, res, url){
	try{
		var context = this.router.GetContext(req, res, "");
		this.router.Process(context);	
	}
	catch (e){
		if (context){
			context.error(e);
		}
		throw e;
	}
	return true;
};

ILabRouter.AttachSocketListener = function(server){
	//sio.serveClient(false);
	server = require('socket.io').listen(server);
	server.on('connection', function (socket) {
		//console.log(socket);
		var path = '/' + socket.namespace.name;
		console.log("S>>> Channel subscribe: " + path);
		socket.on("message", function(message, data){
			message = JSON.parse(message);
			Channels.emit(path + message.path, message.data);
		});
		var handler = function(data, arg){
			socket.emit('message', arguments);
		}
		Channels.on(path, handler);			
		socket.on('disconnect', function (socket) {
			Channels.clear(path, handler);
			console.log("S<<< Channel unsubscribe: " + path);
		});	
	});
};

ILabRouter.CreateServer = function (Port){
	console.log("ILAB server v "  + ILab.Config.ver + " Listening " + Port + "");
	var httpServer = http.createServer(function(req, res){
		var port = Port;
		var host = req.headers.host;
		var url = "http://" + host + ":" + port + req.url;
		url = Url.parse(url.toLowerCase(), true);
		if (!ILabRouter.Servers[port]){
			res.statusCode = 404;
			res.end("No Servers for this port");
			return false;
		}
		res.setHeader("Access-Control-Allow-Headers", "debug-mode,origin,content-type");
		res.setHeader("Access-Control-Expose-Headers", "content-type,debug-mode,Content-Type,ETag,Finish,Server,ServerUrl,ServiceUrl,ManageUrl,Date,Start,Load,Node,NodeId, NodeType");
		if (global.ILab){
			res.setHeader("ServiceUrl", global.ILab.ServiceUrl);
			res.setHeader("Server", "ILab " + ILab.Config.ver);
		}
		var handler = ILabRouter.Servers[port][host];
		if (!handler){
			var handler = ILabRouter.Servers[port]["default"];
		}
		if (handler){
			return handler.Process(req, res, url, host, port);
		}
		else{
			res.statusCode = 404;
			res.end("No hosts handler for this port");
			return false;
		}
	}).listen(Port);
	httpServer.on('error', function(err){
		console.error(err);
	});
	//ILabRouter.AttachSocketListener(httpServer);
	return {
		_httpServer : httpServer
	};
}

ILabRouter.CreateRouter = function(port, host, config){
	var router = require(Path.resolve("./ILAB/Modules/Router.js"))();
	router.map("Security", {});
	router.map("Main", 
			   {
				   "/map": {
					   GET : function(context){
						   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
						   context.finish(200, JSON.stringify(ILabRouter.CreateMap(router.Handlers.Main)));
					   }
				   },
				   "/routing" : {
						GET : function(context){
							var obj = {
								waiting : router.WaitingContextsCount,
								processing : router.ProcessingContextsCount,
							}
							context.res.setHeader("Content-Type", "application/json; charset=utf-8");
							context.finish(200, JSON.stringify(obj));
						}
				   },
				   "/channelsMap" : {
					   GET : function(context){
							   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
							   context.finish(200, JSON.stringify(ILabRouter.CreateChannelMap(Channels.routes)));
						}
				   },
				   "/channels/>" : channelsClient
			   });
	return router;
}

ILabRouter.CreateChannelMap = function(channel, count){
	if (!count) count = 1;
	//if (count > 10) return null;
	if (!channel) return;
	var mapObj = null;
	for (var item in channel){
		var node = channel[item];
		if (!mapObj) mapObj = {};
		if (Array.isArray(node)){
			mapObj[item] = "[" + node.length + "]";
		}
		else{
			if (typeof(node) == "object"){
				var value = ILabRouter.CreateChannelMap(node, count + 1);
				if (value){			
					mapObj[item] = value;
				}
			}
			else{
				mapObj[item] = node;
			}
		}
	}
	return mapObj;
};


ILabRouter.AddManagedNode = function(node, item, callback){
	var host = node.host;
	var port = node.port;
	var path = node.path;
	
	if (!port) throw "Port undefined: " + host + " " + node;
	if (!ILabRouter.Servers[port]) {
		ILabRouter.Servers[port] = ILabRouter.CreateServer(port);
	}
	var hosts = ILabRouter.Servers[port];
	if (!host) host = "default";
	if (!path || path == "") path = "/<";
	node.path = path;
	if (!hosts[host]){
		hosts[host] = {
			router : ILabRouter.CreateRouter(port, host),
			host : host,
			port : port,
			path: path,
			Process : ILabRouter.ManagedProcess,
			_server : hosts._httpServer
		}
	}
	var router = hosts[host].router;
	router.for("Main", path, callback);
	return hosts[host];
}

ILabRouter.AddProxiedNode = function(node, item, callback){
	var host = node.host;
	var port = node.port;
	var path = node.path;
	
	if (!port) throw "Port undefined: " + host + " " + node;
	if (!ILabRouter.Servers[port]) {
		ILabRouter.Servers[port] = ILabRouter.CreateServer(port);
	}
	var hosts = ILabRouter.Servers[port];
	if (!path || path == "") path = "/<";
	node.path = path;
	if (!host) host = "default";
	if (hosts[host]){
		console.log(("Proxied Node " + node.id + " on " + host + ":" + port + " OVERLAP other server!").warn);
		return;
	}
	node._server = hosts._httpServer;
	hosts[host] = {
		node : node,
		host : host,
		port : port,
		path : path,
		_server : hosts._httpServer,
		Process : function(req, res){
			callback.call(node, req, res);
		}
	}
	return hosts[host];
}

process.setMaxListeners(100);

process.on('SIGTERM', function() {
	for (var item in ILab.Nodes){
		console.log("EXITING: " + item.info);
		ILab.Nodes[item].Stop();
	}
});

process.on('exit',function(){
	for (var item in ILab.Nodes){
		console.log("EXITING: " + item.info);
		ILab.Nodes[item].Stop();
	}
});

ILab.Init();
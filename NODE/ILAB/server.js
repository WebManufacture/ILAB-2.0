var http = require('http');
var Url = require('url');
var Path = require('path');
require(Path.resolve("./ILAB/Modules/Node/Utils.js"));
var logger = require(Path.resolve("./ILAB/Modules/Node/Logger.js"));
var Forks = require(Path.resolve("./ILAB/Modules/Node/Forks.js"));
var Files = require(Path.resolve("./ILAB/Modules/Node/Files.js"));
require(Path.resolve("./ILAB/Modules/Channels.js"));
var channelsClient = require(Path.resolve("./ILAB/Modules/Node/ChannelsClient.js"));
var DBProc = require(Path.resolve("./ILAB/Modules/Node/DBProc.js"));
var fs = require('fs');
var httpProxy = require('http-proxy');
var colors = require('colors');

var proxy = new httpProxy.RoutingProxy();

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
			url: this.url
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
			var serv = ILabRouter.AddNode(this, function(req, res, context){
				res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				return module.ProcessRequest(req, res);
			});
		}
		if (this.type == "managed"){
			var serv = ILabRouter.AddNode(this, function(context){
				context.res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				return module.ProcessContext(context);
			});
		}
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
				Channels.emit("/" + node.id + "/state.working", "working");			
			});
		}
		catch (e){
			console.log(e);
			Channels.emit("/" + node.id + "/state.error", "error");	
		}
	},	
	
	Stop : function(){
		try{
			var node = this;
			this.module.Stop(function(){
				node.State = "stopped";
				console.log(node.id + " Stopped".yellow);
				Channels.emit("/" + node.id + "/state.stopped", "stopped");
			});			
		}
		catch (e){
			Channels.emit("/" + node.id + "/state.error", "error");	
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
}

IsolatedNode.prototype = {
	Init : function(item){
		if (!item.Args) item.Args = {};
		var pp = this.ProxyPort = ILabRouter.ProxyPort;
		this.Fork.args.Host = "localhost";
		this.Fork.args.ProxyPort = pp;
		var node = this;
		if (this.type == "managed"){
			var serv = ILabRouter.AddNode(this, function(context){
				context.res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				proxy.proxyRequest(context.req, context.res, { host: "localhost", port: pp });
				context.abort();
				return true;
			});
		}
		if (this.type == "proxied"){
			var serv = ILabRouter.AddNode(this, function(req, res){
				res.setHeader("Node", node.type + ":" + node.process + ":" + node.id);
				proxy.proxyRequest(req, res, { host: "localhost", port: pp });
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
	var cfg = { ver: "0.1.4", Port : 80, PortStart : 7000, cfgFile : "Config.json", routingFile: "RoutingTable.json" };
	
	for (var i = 2; i < process.argv.length; i++){
		var arg = process.argv[i];
		var val = arg.split("=");
		if (val.length == 2){
			cfg[val[0]] = val[1];
		}
	}
	
	ILab.Config = cfg;
	ILab.Nodes = {};
	if (!fs.existsSync(cfg.cfgFile)){
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
	if (rtable && rtable.length > 0){
		ILabRouter.ProxyPort = cfg.PortStart;
		for (var i = 0; i < rtable.length; i++){
			var item = rtable[i];
			if (!item.Process){item.Process = "internal"};
			if (!item.id || ILab.Nodes[item.id]) item.id = "node" + i;
			item.id = item.id.toLowerCase();
			if (item.Frame){
				item.execFile = item.Frame + ".js"
			}
			else{
				item.execFile = item.File;
			}			
			if (!item.Type) item.Type = "inner";
			if (item.Process == "internal") var node = new InternalNode(item, cfg);
			if (item.Process == "isolated") var node = new IsolatedNode(item, cfg);
			if (item.Process == "external") var node = new ExternalNode(item, cfg);
			node.State = item.State
			node.config = item;
			node.process = item.Process;
			node.type = item.Type;
			if (!item.Path) item.Path = "/>";
			node.Init(item, cfg);			
			var port = item.Port;
			var itemPath = ((item.Host ? item.Host : "default") + ":" + (port ? port : cfg.Port) + (node.ProxyPort ? "(" + node.ProxyPort + ")" : ""));
			if (node.path){
				itemPath += node.path;
			}
			console.log((item.State == "working" ? node.type.yellow : node.type.grey) + " " + item.Process.cyan + " " + node.id.info + " " + (itemPath));
			itemPath = ((item.Host ? item.Host : "default") + ":" + (item.Port ? item.Port : cfg.Port));
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
			ILab.Nodes[item.id] = node;
		}
	}
	ILab.Start();
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
	return {
		_httpServer : httpServer
	};
}

ILabRouter.CreateRouter = function(port, host, config){
	var router = require(Path.resolve("./ILAB/Modules/Node/Router.js"))();
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


ILabRouter.AddManagedNode = function(node, host, port, path, callback){
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
			Process : ILabRouter.ManagedProcess			
		}
	}
	var router = hosts[host].router;
	router.for("Main", path, callback);
	return hosts[host];
}

ILabRouter.AddProxiedNode = function(node, host, port, path, callback){
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
	hosts[host] = {
		node : node,
		host : host,
		port : port,
		path : path,
		Process : function(req, res){
			callback.call(node, req, res);
		}
	}
	return hosts[host];
}

ILabRouter.AddNode = function(node, callback){
	var host = "default";
	var port = ILab.Config.Port;
	if (node.config.Host){
		host = node.config.Host;
	}
	if (node.config.Port){
		port = node.config.Port;
	}
	var path = node.config.Path.trim();
	if (node.type == "managed"){
		return ILabRouter.AddManagedNode(node, host, port, path, callback);
	}
	if (node.type == "proxied"){
		return ILabRouter.AddProxiedNode(node, host, port, path, callback);
	}
	return null;
};

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
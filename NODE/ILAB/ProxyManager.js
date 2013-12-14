var http = require('http');
var Url = require('url');
var path = require('path');
require(path.resolve("./ILAB/Modules/Node/Utils.js"));
var logger = require(path.resolve("./ILAB/Modules/Node/Logger.js"));
var Forks = require(path.resolve("./ILAB/Modules/Node/Forks.js"));
var Files = require(path.resolve("./ILAB/Modules/Node/Files.js"));
require(path.resolve("./ILAB/Modules/Channels.js"));
var channelsClient = require(path.resolve("./ILAB/Modules/Node/ChannelsClient.js"));
var DBProc = require(path.resolve("./ILAB/Modules/Node/DBProc.js"));
var ProxyManager = require("ProxyManager.js");
var NodesManager = require("NodesManager.js");
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

Servers = {};

Server.WaitingRequests = {};

Server.RouteChannel = function(fork, req, res, url){
	if (fork.State != "working"){
		//res.finished = true;
		res.statusCode = 401
		res.end("Fork not started");
		return false;
	}	
	fork = fork.Fork;
	var id = (Math.random() + "").replace("0.", "");
	var path = url.pathname;
	url.method = req.method.toLowerCase();
	if (path.indexOf("/") == path.length - 1){
		path = path.substring(0, path.length - 1);
	}
	path = path.replace("/" + fork.id, "");
	var message = "/process/http-request";
	message += "." + req.method.toLowerCase();
	message += ".id" + id;
	message += path;
	res.startTime = new Date();
	Server.WaitingRequests[id] = res;
	if (Server.Config.ResponseTimeout){
		res.timeout = setTimeout(function(){
			console.log("Timeout: ".error + req.url);
			delete Server.WaitingRequests[id];
			res.finished = true;
			res.end(500, "Server timeout");			
		}, Server.Config.ResponseTimeout);
	};
	var fullData = "";
	req.on("data", function(data){
		fullData += data;		
	});
	req.on("end", function(){
		console.log((">> " + id).verbose + " " + req.method + ": " + res.url);
		fork.emit(message, id, url, req.headers, fullData);
	});
};

Server.ForkResponse = function(message){	
	var id = arguments[1];
	//console.log(("<< " + id + " ").verbose + (new Date).formatTime(true));
	if (!id) {
		console.log("ID NULL".error);
		return null;
	}
	var res = Server.WaitingRequests[id];
	if (!res) {
		console.log("RESPONSE NULL".error + " ID: " + id);
		return;
	};
	//console.log("RESPONSE FOUND".debug + " ID: " + id);
	if (res.timeout){
		clearTimeout(res.timeout);
	}
	Server.FinishResponse(res, arguments);
	delete Server.WaitingRequests[id];
};

Server.FinishResponse = function(res, args){
	if (!res || res.finished){
		console.log("RESPONSE IS FINISHED".error);
		return false;
	}
	var message = args[0];
	var id = args[1];
	var status = args[2];
	var result = args[3];
	var headers = args[4];
	res.setHeader("Start", res.startTime.valueOf());
	res.setHeader("Finish", new Date().valueOf());
	var load = (new Date() - res.startTime);
	res.setHeader("Load", load + " ms");
	if (headers){
		for (var header in headers){
			res.setHeader(header, headers[header]);
		}
	}
	//console.log(result.length);
	if (status){
		res.statusCode = status;
	}
	else{
		if (result){
			status = 200;
		}
		else{
			res.statusCode = 404;
			result = "No processing code detected";
		}
	}
	if (result){
		if (headers && headers.encoding){
			result = new Buffer(result, headers.encoding);
			res.setHeader("content-length", result.length);
			res.end(result, headers.encoding);
		}
		else{		
			result = new Buffer(result, 'utf8');
			res.setHeader("content-length", result.length);
			res.end(result, 'utf8');
		}
	}	
	else{
		res.end();
	}
	console.log(("<< " + id + " ").verbose + (new Date).formatTime(true) + " load: " + load);
	return true;
};


Server.ProcessServicePort = function(req, res){
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
	res.setHeader("Access-Control-Allow-Headers", "debug-mode,origin,content-type");
	res.setHeader("Access-Control-Max-Age", "12000");
	res.setHeader("Access-Control-Expose-Headers", "content-type,debug-mode,Content-Type,ETag,Finish,ServerUrl,ManageUrl,Date,Start,Load,NodeId, NodeType");
	
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.setHeader("ManageUrl", Server.Config.adminHost);
	res.setHeader("ServerUrl", Server.Config.host + ":" + Server.Config.port);
	if (req.method == 'OPTIONS'){
		res.statusCode = 200;
		res.end("OK");	
		return;
	}
	
	var route = Channel.ParsePath(url.pathname);
	rr = Server.RoutingTable[url.hostname];
	if (!rr && route.nodes.length > 0){
		var nodeId = route.nodes[0].type;
		var rr = Server.Nodes[nodeId];
		if (rr){
			//console.log("Managed node: ".verbose + nodeId);
		}
	}
	if (rr){	
		res.setHeader("NodeId", nodeId);			
		res.setHeader("NodeType", rr.Type);
		if (rr.Type == "proxied" || rr.Type == "simple"){
			proxy.proxyRequest(req, res, { host: "127.0.0.1", port: rr.Port });
			return true;
		}
		if (rr.Type == "managed"){
			return Server.RouteChannel(rr, req, res, url);
		}
	}
	if (Server.Process(req, res, url)){
		return true;
	}
	res.statusCode = 404;
	res.end(urlStr + " not found");
	console.log("not found: ".warn + urlStr);
	return false;
};


process.on('SIGTERM', function() {
	for (var item in Server.Nodes){
		console.log("EXITING: " + item.info);
		Server.Nodes[item].Fork.stop();
	}
});

process.on('exit',function(){
	for (var item in Server.Nodes){
		console.log("EXITING: " + item.info);
		Server.Nodes[item].Fork.stop();
	}
});

Server.Init();
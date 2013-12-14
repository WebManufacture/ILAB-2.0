var http = require('http');
var Url = require('url');
var path = require('path');
var fs = require('fs');

require(path.resolve("./ILAB/Modules/Node/Utils.js"));
var RouterModule = require(path.resolve("./ILAB/Modules/Node/Router.js"));
require(path.resolve("./ILAB/Modules/Channels.js"));
var channelsClient = require(path.resolve("./ILAB/Modules/Node/ChannelsClient.js"));
var Files = require(path.resolve("./ILAB/Modules/Node/Files.js"));

AdminServer = {
	Init : function(config, localRouter, router, logger){
		localRouter.for("Main", "/", function(context){
			context.res.setHeader("Content-Type", "text/html; charset=utf-8");
		   fs.readFile("./Admin/Config.htm", "utf8", function(err, result){   
			   if (err){
				   context.finish(500, "Not found files view page " + err);
				   return;
			   }		
			   context.finish(200, result);
		   });
		   return false;
		});
		localRouter.for("Main", "/Nodes/<", NodesRouter);
		localRouter.for("Main", "/<", Files(config, logger));
		ILab.ServiceUrl = (config.Host ? (config.Host + (config.Port ? ":" + config.Port : "")) : "") + (config.Path ? config.Path : "");
	}
}

NodesRouter = {
	GET : function(context){
		var nodeId = context.pathTail.trim();
		if (nodeId.lastIndexOf("/") == nodeId.length - 1){
			nodeId = nodeId.substring(0, nodeId.length - 1);
		}
		if (nodeId.start("/")) nodeId = nodeId.substring(1);
		var node = global.ILab.Nodes[nodeId];
		if (node){
			context.res.setHeader("Content-Type", "application/json; charset=utf-8");
			context.finish(200, JSON.stringify(node.serialize()));
		}
		else{
			context.finish(404, "node " + nodeId + " not found");
		}
		return true;
	},
	SEARCH : function(context){
		context.res.setHeader("Content-Type", "application/json; charset=utf-8");
		var items = [];
		for (var item in global.ILab.Nodes){
			items.push(global.ILab.Nodes[item].serialize());
		}
		context.finish(200, JSON.stringify(items));
		return true;
	},
	POST : function(context){
		var fullData = "";
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				
			}
			catch (err){
				context.finish(500, "JSON error: " + err);
			}
			context.continue(context);
		});
		return false;
	},
	DELETE : function(context){
	
	}
};

module.exports = AdminServer;
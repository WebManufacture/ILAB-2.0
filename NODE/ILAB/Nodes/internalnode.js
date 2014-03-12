useNodeType("node.js");
useNodeType("managednode.js");
//useModule("logger.js");

function InternalNode (parentNode, item){
	InternalNode.super_.apply(this, arguments);
	this.type = InternalNode.Type;
};

global.InternalNode = InternalNode;

global.InternalNode.Type = "internal";

Inherit(InternalNode, ManagedNode, {
	init : function(item){
		if (InternalNode.base.init){
			InternalNode.base.init.call(this, item);
		}
		/*try{
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
		var node = this;*/
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		/*
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
		});*/
		if (InternalNode.base.load){
			return InternalNode.base.load.call(this, callback);
		}
		else{
			return true;
		}
	}
});

module.exports = InternalNode;
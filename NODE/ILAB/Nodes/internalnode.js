useNodeType("node.js");
useNodeType("managednode.js");
useModule("logger.js");
var Path = require('path');

function InternalNode (parentNode, item){
	InternalNode.super_.apply(this, arguments);
	this.type = InternalNode.Type;
};

global.InternalNode = InternalNode;

global.InternalNode.Type = "internal";

Inherit(InternalNode, ManagedNode, {
	init : function(config){
		if (InternalNode.base.init){
			InternalNode.base.init.call(this, config);
		}
		return true;
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		var result = true;
		if (InternalNode.base.load){
			var result = InternalNode.base.load.call(this, callback);
		}
		try{
			this.module = require(Path.resolve(this.config.File));	
			if (this.module){
				if (typeof(this.module) == "function"){
					this.module = this.module(this, this.config);
				}
				else{
					if (typeof(this.module.Init) == "function"){
						this.module.Init(this.config);
					}
				}
				if (this.module && typeof(this.module.Load) == "function"){
					result &= this.module.Load(callback);
				}
			}
		}
		catch (e){
			//error(e);
			return 'error';
		}		
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
		return result;
	},
	
	unload : function(callback){
		if (this.module && typeof(this.module.Unload) == "function"){
			var self = this;
			return this.module.Unload(function(){
				self.module = null;
				callback();
			});
		}
		return true;
	},
	
	start : function(callback){
		if (this.module && typeof(this.module.Start) == "function"){
			return this.module.Start(callback);
		}
		return true;
	},
	
	stop : function(callback){
		if (this.module && typeof(this.module.Stop) == "function"){
			return this.module.Stop(callback);
		}
		return true;
	},
	
	sleep : function(callback){
		if (this.module && typeof(this.module.Sleep) == "function"){
			return this.module.Sleep();
		}
		return false;
	},
});

module.exports = InternalNode;
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

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
		this.module = this.file = this.config.File;
		if (!this.module) this.module = this.file = this.config.file;
		this.frame = this.config.Frame;
		if (!this.frame) this.frame = this.config.frame;
		if (this.frame){
			this.module = this.frame;
		}
		try{
			var self = this;
			if (this.module){
				this.modulePath = Path.resolve(this.module);
				this.module = require(this.modulePath);	
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
						return this.module.Load(function(){
							self.State = Node.States.LOADED;
						});
					}
				}
			}
			else{
				this.State = Node.States.INITIALIZED;
				return false;
			}
		}
		catch (e){
			this.logger.error(e);
			this.State = Node.States.EXCEPTION;
			return false;
		}		
		return true;
	},
	
/*	Unload : function(){
		return InternalNode.base.Unload.apply(this, arguments);
	},*/
	
	unload : function(){
		if (this.module){
			var self = this;
			if (typeof(this.module.Unload) == "function"){
				this.module.Unload();
			}
			self.module = null;
			delete require.cache[this.modulePath];
		}
		return true;
	},
	
	start : function(){
		if (this.module && typeof(this.module.Start) == "function"){
			this.module.Start();
		}
		return true;
	},
	
	stop : function(callback){
		if (this.module && typeof(this.module.Stop) == "function"){
			this.module.Stop();
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
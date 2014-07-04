useNodeType("node.js");
useNodeType("managednode.js");
useModule("logger.js");
var Path = require('path');

function InheritNode (parentNode, item){
	InheritNode.super_.apply(this, arguments);
	this.type = InheritNode.Type;
};

global.InheritNode = InheritNode;

global.InheritNode.Type = "inherit";

Inherit(InheritNode, ManagedNode, {

	Load : function(callback){
		var self = this;
		if (this._state == Node.States.INITIALIZED || this._state == Node.States.UNLOADED){
			if (typeof callback == 'function'){
				this.once("loaded",function(){
					callback.apply(self, arguments);
				});
			}
			this.State = Node.States.LOADING;
			var result = true;
			
			this.module = this.file = this.config.File;
			if (!this.module) this.module = this.file = this.config.file;
			this.frame = this.config.Frame;
			if (!this.frame) this.frame = this.config.frame;
			if (this.frame){
				this.module = this.frame;
			}
			try{
				if (this.module){
					this.modulePath = Path.resolve(this.module);
					this.module = require(this.modulePath);	
					if (this.module){
						if (typeof(this.module) == "function"){
							this.module = this.module(this, this.config);
						}
						for (var item in this.module){
							if (this[item] == undefined){
								this[item] = this.module[item];
							}
						}
						if (typeof this.load == 'function')	{
							result = this.load();
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
			if (result) {
				self.State = Node.States.LOADED;
			}
		}		
		else{
			this.logger.warn("Node " + this.id + " in "  + this.Status + " try to LOAD");
		}
		return result;
	},
	
	Unload : function(callback){
		var self = this;
		var result = true;
		if (this._state >= Node.States.LOADED && this._state < Node.States.UNLOADING){
			this.State = Node.States.UNLOADING;
			if (typeof callback == 'function'){
				this.once("unloaded",function(){
					callback.apply(self, arguments);
				});
			}
			if (typeof this.unload == 'function') {
				this.unload();
			}
			
			if (this.module){			
				delete require.cache[this.modulePath];
				for (var item in this){
					if (ManagedNode.base[item] == undefined && item != "parentNode"  && item != "config"){
						delete this[item];
					}
				}
			}
			
			if (result) {
				self.State = Node.States.UNLOADED;
			}
		}		
		else{
			if (this._state < Node.States.LOADED){
				this.State = Node.States.UNLOADED;
			}
			else{
				this.logger.warn("Node " + this.id + " in "  + this.Status + " try to UNLOAD ");
			}
		}
		return result;
	},
});

module.exports = InheritNode;
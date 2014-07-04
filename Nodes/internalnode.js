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
	configure: function(config){
		result = true;
		if (InternalNode.base.configure){
			result = InternalNode.base.configure.apply(this, arguments);
		}		
		this.basepath = ".";
		if (this.lconfig.basepath){
			this.basepath = this.FormatPath(this.lconfig.basepath);
		}
		if (this.lconfig.module){
			this.modulePath = Path.resolve(this.lconfig.module);
		}
		return result;
	},

	load : function(){
		try{
			if (this.modulePath){
				this.module = require(this.modulePath);	
				if (this.module){
					if (typeof(this.module) == "function"){
						this.module = new this.module(this, this.config, this.logger);
					}
					for (var event in global.Node.States){
						event = event.toLowerCase();
						if (typeof this.module[event] == "function"){
							this.on(event, CreateClosure(this.module[event], this.module, this));
						}
					}
					if (typeof this.module.loading == 'function') this.module.loading(this);
					return false;
				}
			}
		}
		catch (e){
			this.logger.error(e);
			this.State = Node.States.EXCEPTION;
			return false;
		}
		return true;
	},
	
	
	FormatPath : function(fpath){
		if (!fpath) fpath = "";
		fpath = fpath.replace(/[",']/g, "");
		fpath = fpath.replace(/\//g, "\\");
		if (!fpath.start("\\")) fpath = "\\" + fpath;
		fpath = this.basepath + fpath;
		fpath = fpath.replace(/\//g, "\\");
		if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
		return Path.resolve(fpath).toLowerCase();
	},	
});

module.exports = InternalNode;
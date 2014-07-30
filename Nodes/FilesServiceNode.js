useNodeType("node.js");
useNodeType("ServiceNode.js");
useModule("logger.js");
var Path = require('path');

function FilesServiceNode (parentNode, item){
	FilesServiceNode.super_.apply(this, arguments);
	this.type = global.FilesServiceNode.Type;
};

global.FilesServiceNode = ServiceNode;

global.FilesServiceNode.Type = "files-service";

Inherit(FilesServiceNode, ServiceNode, {
	init : function(){
		var result = true;
		if (FilesServiceNode.base.init){
			result = FilesServiceNode.base.init.apply(this, arguments);
		}
		this.RequireService("FilesService");
		return result;
	},
	
	configure : function(){
		if (FilesServiceNode.base.configure){
			return FilesServiceNode.base.configure.apply(this, arguments);
		}	
		if (this.lconfig.paths){
			this.ConfigureService("FilesService",  { Paths : this.lconfig.paths }, this);
		}
	},
	
	registerExternal : function(config, rservice){
		FilesServiceNode.base.configureExternal.apply(this, arguments);
		if (config.Paths){
			this.subscribe
		}
	},
	
	unregisterExternal : function(rservice){
		if (config.Paths){
			this.Unsubscribe
		}
		FilesServiceNode.base.unconfigureExternal.apply(this, arguments);
	},
	
	load : function(){
		var result = true;
		if (FilesServiceNode.base.load){
			result = FilesServiceNode.base.load.apply(this, arguments);
		}
		
		return result;
	},
	
	unload : function(){
		if (this.lconfig.paths){
			this.UnConfuigureService("FilesService", this);
		}
	}
});

module.exports = ServiceNode;
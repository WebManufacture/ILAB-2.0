useNodeType("node.js");
useNodeType("managednode.js");
useModule("logger.js");
var Path = require('path');

function ServiceNode (parentNode, item){
	ServiceNode.super_.apply(this, arguments);
	this.type = global.ServiceNode.Type;
};

global.ServiceNode = ServiceNode;

global.ServiceNode.Type = "service";

Inherit(ServiceNode, ManagedNode, {
	init : function(){
		this.configured = false;
		if (ServiceNode.base.init){
			return ServiceNode.base.init.apply(this, arguments);
		}
		return true;
	},
	
	configure : function(){
		this.configured = true;
		if (ServiceNode.base.configure){
			return ServiceNode.base.configure.apply(this, arguments);
		}
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
		if (this.module && typeof(this.module.Load) == "function"){
			try{
				this.module.Load();
			}
			catch (e){
				this.logger.error(e);
				this.State = Node.States.EXCEPTION;
				return false;
			}	
		}
		if (ServiceNode.base.load){
			return ServiceNode.base.load.apply(this, arguments);
		}
		return true;
	},
	
	unload : function(){
		if (this.module && typeof(this.module.Unload) == "function"){
			try{
				this.module.Unload();
			}
			catch (e){
				this.logger.error(e);
				this.State = Node.States.EXCEPTION;
				return false;
			}	
		}
		if (ServiceNode.base.unload){
			return ServiceNode.base.unload.apply(this, arguments);
		}
		return true;
	},
	
	start : function(){
		if (this.module && typeof(this.module.Start) == "function"){
			try{
				this.module.Start();
			}
			catch (e){
				this.logger.error(e);
				this.State = Node.States.EXCEPTION;
				return false;
			}	
		}
		return true;
	},
	
	stop : function(callback){
		if (this.module && typeof(this.module.Stop) == "function"){
			try{
				this.module.Stop();
			}
			catch (e){
				this.logger.error(e);
				this.State = Node.States.EXCEPTION;
				return false;
			}	
		}
		return true;
	},
	
	sleep : function(callback){
		if (this.module && typeof(this.module.Sleep) == "function"){
			try{
				return this.module.Sleep();
			}
			catch (e){
				this.logger.error(e);
				this.State = Node.States.EXCEPTION;
				return false;
			}	
		}
		return false;
	},
});

module.exports = ServiceNode;
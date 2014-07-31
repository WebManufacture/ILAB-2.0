var Path = require('path');

useNodeType("node.js");
useNodeType("managednode.js");
useModule("logger.js");
var Storage = useModule("Storage.js");

function ServiceNode (parentNode, item){
	ServiceNode.super_.apply(this, arguments);
	this.type = global.ServiceNode.Type;
};

global.ServiceNode = ServiceNode;

global.ServiceNode.Type = "service";

Inherit(ServiceNode, ManagedNode, {
	init : function(){
		this.configured = false;
		if (!Frame.Services) Frame.Services = new Storage();
		this.proxy = Frame.Services.add(new (useModule("ServiceProxy.js"))(this.selector));
		this.requiredServices = [];
		var result = true;
		if (ServiceNode.base.init){
			result = ServiceNode.base.init.apply(this, arguments);
		}
		this.RequireService("СhannelsService");
		return true;
	},
	
	configure : function(){
		this.configured = true;
		if (ServiceNode.base.configure){
			return ServiceNode.base.configure.apply(this, arguments);
		}
		if (this.proxy) this.proxy.configure(this.lconfig);
		if (this.lconfig.requires){
			for (var i = 0; i < this.lconfig.requires.length; i++){
				var selector = this.lconfig.requires[i];
				if (!this.RequireService(selector)) this.State = Node.States.EXCEPTION;
			}
		}
		return true;
	},
	
	
	load : function(){
		if (ServiceNode.base.load){
			return ServiceNode.base.load.apply(this, arguments);
		}		
		Frame.Services.add(this);
		return true;
	},
	
	unload : function(){	
		Frame.Services.del(this);
		if (ServiceNode.base.unload){
			return ServiceNode.base.unload.apply(this, arguments);
		}		
		return true;
	},

	RequireService : function(selector){
		var service = Frame.useService(selector);
		if (service){
			this.requiredServices.push(service);
		}		
		return service;
	},
	
	configureExternal : function(config, rservice){
		if (!this.externalServices) this.externalServices = {};
		this.externalServices[rservice] = config;
	},
	
	unconfigureExternal : function(rservice){
		if (this.externalServices && this.externalServices[rservice]){
			delete this.externalServices[rservice];
		}
	},
	
	ConfigureExternalService : function(service, config, rservice){
		var service = Frame.Services.get(service);
		if (service){
			return service.configureExternal(config, rservice.id);
		}
		else{
			this.error("Required service " + service + " tried to configure, but not found!");
		}
		return null;
	},
	
	UnConfigureExternalService : function(service, rservice){
		var service = Frame.Services.get(service);
		if (service){
			return service.unconfigureExternal(rservice.id);
		}
		else{
			this.error("Required service " + service + " tried to unconfigure, but not found!");
		}
		return null;
	},
});

function ServiceManager(){
	
};

ServiceManager.prototype = {
	
}

module.exports = ServiceNode;
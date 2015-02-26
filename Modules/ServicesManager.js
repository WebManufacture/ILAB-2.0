var fs = require('fs');
var Path = require('path');

function ServicesManagerObj(){
	
}

ServicesManagerObj.prototype = {
    Load : function(){

    },

	GetServiceContract : function(serviceName){
		var me = this;
		if (IsServiceLoaded(serviceName)){
			return this.services[serviceName].getContract();
		}
		return null;
	},
	
	Configure : function(rootConfig){
		for (var service in rootConfig.Services){
			this.LoadService(service);
		}
	},

	GetAvailableServices : function(){
		var services = [];
		for (var s in this.services){
			if (this.services[name] != null){
				services.push(s);
			}
		}
		return services;
	},
	
	IsServiceAvailable : function(name){
		return (fs.existsSync(Frame.ServicesPath + "/" + name + ".js"));
	},
	
	IsServiceLoaded : function(name){	
		return this.services[name] != undefined && this.services[name] != null;
	},
		
	LoadService : function(name, config){
		if (IsServiceLoaded(name)) return this.services[name];
		if (IsServiceAvailable(name)){
			var service = this.services[name] = Frame.useService(name);
            if (service) {
                service.Init();
                if (config) {
                    service.Configure(config);
                }
                service.Load();
            }
			return service;
		};
		return null;
	},
	
	UnloadService : function(name){
	
	},
	
	RegisterService : function(serviceDescription){
	
	}
}

module.exports = function(arg){
	return new ServicesManagerObj(arg);
}
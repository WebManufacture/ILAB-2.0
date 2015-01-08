var fs = require('fs');

function ServicesManagerObj(){
	
}

ServicesManagerObj.prototype = {
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
	
	ConfigureService : function(name, serviceConfig){
		if (IsServiceAvailable(name)){
			if (IsServiceLoaded(name)){
				this.services[name].Configure(serviceConfig);
			}
			else{
				this.servicesConfiguration[name] = serviceConfig;
			}
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
		
	LoadService : function(name){
		if (IsServiceLoaded(name)) return this.services[name];
		if (IsServiceAvailable(name)){
			var service = this.services[name] = require(Path.resolve(Frame.ModulesPath + path));
			service.Init();
			if (service && this.servicesConfiguration[name]){
				service.Configure(this.servicesConfiguration[name]);
			}
			service.Load();
			return service;
		};
		return false;
	},
	
	UnloadService : function(name){
	
	},
	
	RegisterService : function(serviceDescription){
	
	}
}

module.exports = .ServicesManager;
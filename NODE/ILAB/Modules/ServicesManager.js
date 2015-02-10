var fs = require('fs');

function ServicesManagerObj(){
	
}

ServicesManagerObj.prototype = {
    Load : function(){

    if (!Frame.NodesByTypes){
        Frame.NodesByTypes = {};
        var nodes = fs.readdirSync(Path.resolve(Frame.NodesPath));
        for (var i = 0; i < nodes.length; i++){
            try{
                var node = require(Path.resolve(Frame.NodesPath + nodes[i]));
                if (node && node.Type){
                    Frame.NodesByTypes[node.Type] = node;
                    Frame.Config.prototypes[node.Type] = node;
                    if (!Frame.isChild){
                        logger.info("Support node type: %marine;{0}", node.Type);
                    }
                }
            }
            catch(error){
                logger.error("Node type load error: %error;{0} : {1}", nodes[i], error);
            }
        }
    }
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

module.exports = function(arg){
	return new ServicesManagerObj(arg);
}
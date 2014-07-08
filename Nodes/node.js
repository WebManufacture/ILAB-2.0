useModule('utils.js');
var Logger = useModule("logger.js");
var EventEmitter = require("events").EventEmitter;

function Node(parentNode, id){
	EventEmitter.call(this);	
	this._state = 0;
	this.parentNode = parentNode;
	this.type = Node.Type;
	
	if (id) this.id = id.toLowerCase();
};

global.Node = Node;

global.Node.Statuses = ["null", "exception", "initialized", "loading", "loaded", "starting", "working", "sleep", "stopping", "stopped", "unloading", "unloaded"];

global.Node.States = {
	NULL : 0, 
	EXCEPTION : 1,
	INITIALIZED : 2, 
	LOADING : 3,
	LOADED : 4, 
	STARTING : 5,
	WORKING : 6,
	SLEEP : 7,
	STOPPING : 8,
	STOPPED : 9, 
	UNLOADING : 10,
	UNLOADED : 11
};

global.Node.Type = "base";

global.Node._statuses = {};

for (var i = 0; i < Node.Statuses.length; i++){
	var status = global.Node.Statuses[i];
	global.Node._statuses[status] = i;
}

global.Node.StatusToInt = function(status){
	if (!status) return 0;
	return global.Node._statuses[status];
}

global.Node.Inherit = function(Child, mixin){
	return Inherit(Child, global.Node, mixin);
}

Inherit(Node, EventEmitter, {
	configure : function(config){
		if (!this.id) {
			this.id = (this.Type + Math.random()).replace("0.", "");
			this.id = this.id.toLowerCase();
		}
	
		if (!config){
			console.error("CONFIG CALL WITHOUT ARGUMENTS!");
			return;
		}
		this.config = config;
		this.lconfig = {};
		for (var item in config){
			this.lconfig[item.toLowerCase()] = config[item];
		}
		this.logger = new Logger(this.id, true);
	},
	
	Init : function(){
		var self = this;
		if (typeof this.init == 'function')
		{
			if (this.init()) this.State = Node.States.INITIALIZED;
		}
		else{
			this.State = Node.States.INITIALIZED;
		}
	},
	
	
	Configure : function(config){
	if (!config){
			console.error("CONFIG CALL WITHOUT ARGUMENTS!");
			return;
		}
		if (typeof this.configure == 'function') this.configure(config);
	},
	
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
			if (typeof this.load == 'function')	{
				result = this.load();
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
				result = this.unload();
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
			
	Start : function(callback){
		if (this._state == Node.States.INITIALIZED || this._state == Node.States.LOADED || this._state == Node.States.SLEEP || this._state == Node.States.STOPPED)	{
			this.State = Node.States.STARTING;
			var self = this;			
			if (typeof callback == 'function'){
				this.once("working",function(){
					callback.apply(self, arguments);
				});
			}			
			var result = true;
			if (typeof this.start == 'function') result = this.start();
			if (result){
				self.State = Node.States.WORKING;				
			}
		}
		else{
			this.logger.warn("Node " + this.id + " in "  + this.Status + " try to Start ");
		}
		return result;
	},	
			
	Pause : function(){
		return this.Sleep();
	},
	
	Sleep : function(){		
		if (this._state == Node.States.WORKING)	{
			if (typeof this.sleep == 'function') var result = this.sleep();
			if (result){
				this.State = Node.States.SLEEP;			
			}
		}
		else{
			this.logger.warn("Node " + this.id + " in "  + this.Status + " try to Sleep ");
		}		
		return result;
	},
	
	Stop : function(callback){
		if (this._state == Node.States.WORKING || this._state == Node.States.SLEEP)	{
			this.State = Node.States.STOPPING;
			var self = this;	
			if (typeof callback == 'function'){
				this.once("stopped",function(){
					callback.apply(self, arguments);
				});
			}
			var result = true;
			if (typeof this.stop == 'function') result = this.stop();
			if (result){
				self.State = Node.States.STOPPED;
			}
		}	
		else{
			this.logger.warn("Node " + this.id + " in "  + this.Status + " try to Stop ");
		}	
		return result;
	},
	
	Process : function(callback){
		if (this._state == Node.States.WORKING)	{
			if (typeof this.process == 'function') return this.process.apply(this.arguments);
		}
	},
	
	Ping : function(callback){
		if (this._state == Node.States.WORKING)	{
			if (typeof this.ping == 'function') return this.ping.apply(this.arguments);
		}		
		if (this._state < Node.States.LOADED || this._state >= Node.States.UNLOADING){
			this.logger.warn("Node " + this.id + " in "  + this.Status + " ping!");
		}
	},
		
	Serialize : function(){
		var cfg = JSON.parse(JSON.stringify(this.config));
		cfg.state = this._state;
		cfg.status = this.Status;
		return cfg;
	},
	
	ToString : function(){
		return JSON.stringify(this.serialize());
	},
	
	_configError: function(error){
		
	}
});

Object.defineProperty(Node.prototype, "Status",{
	get :  function(){
		return Node.Statuses[this._state];
	},
});

Object.defineProperty(Node.prototype, "State",{
	get :   function(){
		return this._state;
	},
	set : function(value){	
		if (value != this._state){
			var os = this._state;
			this._state = value;
			if (value == Node.States.WORKING){
				this.logger.info("%green; Working");
			}
			if (value == Node.States.STOPPED){
				this.logger.info("%yellow; Stopped");
			}
			if (value == Node.States.UNLOADED){
				this.logger.info("%magenta; Unloaded");
			}
			this.emit('state', value, os);
			if (this.Status){
				this.emit(this.Status, os);
			}
		}
	}
});
	

module.exports = Node;
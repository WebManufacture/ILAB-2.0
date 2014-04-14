useModule('utils.js');
var Logger = useModule("logger.js");
var EventEmitter = require("events").EventEmitter;

function Node(parentNode, item){
	EventEmitter.call(this);	
	this._state = 0;
	this.parentNode = parentNode;
	this.type = Node.Type;
	if (item){
		if (!item.id) item.id = "anonimous";
		this.id = (item.id + "").toLowerCase();
		var self = this;
		setImmediate(function(){
			self.Init(item)
		});
	};
};

global.Node = Node;

global.Node.Statuses = ["null", "error", "initialized", "loading", "loaded", "starting", "working", "sleep", "stopping", "stopped", "unloading", "unloaded"];

global.Node.States = {
	NULL : 0, 
	ERROR : 1,
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
	init : function(config){
		if (!this.id){
			if (!config.id) config.id = "anonimous";
			this.id = (config.id + "").toLowerCase();
		}		
		this.logger = new Logger(this.id, true);
		this.config = config;	
		return true;
	},
	
	Init : function(item){
		if (typeof this.init == 'function')
		{
			if (this.init(item)) this.State = Node.States.INITIALIZED;
		}
		else{
			this.State = Node.States.INITIALIZED;
		}
	},
	
	Load : function(callback){
		var self = this;
		if (this._state == Node.States.INITIALIZED || this._state == Node.States.UNLOADED){
			this.State = Node.States.LOADING;
			var result = null;
			function asyncLoadFunc(value){
				self.State = Node.States.LOADED;
				if (typeof callback == 'function'){
					callback.apply(self, arguments)
				}
			}
			function loadFailFunc(){
				self.State = Node.States.INITIALIZED;
				self.logger.error("Load failed by timeout " + self.id);
			}
			if (typeof this.load == 'function')	{
				result = this.load(asyncLoadFunc);
			}
			else{
				result = true;
			}			
			if (result == 'error') {
				self.State = Node.States.INITIALIZED;
				if (typeof callback == 'function'){
					callback.apply(self, arguments);
				}
			}
			else{
				if (result) {
					setImmediate(asyncLoadFunc);
				}
				else{
					setTimeout(loadFailFunc, 5000);
				}
			}
		}
		return result;
	},
	
	Unload : function(callback){
		var self = this;
		if (this._state >= Node.States.LOADED || this._state < Node.States.UNLOADING){
			this.State = Node.States.UNLOADING;
			var result = null;
			var asyncUnloadFunc = function(){
				self.State = Node.States.UNLOADED;
				if (typeof callback == 'function'){
					callback.apply(self, arguments)
				}
			}
			if (typeof this.unload == 'function') {
				result = this.unload(asyncUnloadFunc);
			}
			else {
				result = true;
			}
			if (result) {
				setImmediate(asyncUnloadFunc);
			}
		}
		return result;
	},
		
	Reload : function(newConfig, callback){
		var self = this;
		var result = null;
		if (typeof newConfig == 'function')	{
			callback = newConfig;
			newConfig = undefined;
		}
		if (typeof this.reload == 'function')
		{
			return this.reload(callback);
		}
		var asyncLoadFunc = function(){
			if (typeof callback == 'function'){
				callback.apply(self, arguments)
			}
		}
		this.Unload(function(){
			if (newConfig){
				self.Init(newConfig);
			}
			self.Load(asyncLoadFunc);
		});
	},
	
	Start : function(callback){
		if (this._state == Node.States.INITIALIZED || this._state == Node.States.LOADED || this._state == Node.States.SLEEP || this._state == Node.States.STOPPED)	{
			this.State = Node.States.STARTING;
			var self = this;
			var result = null;
			var asyncStartFunc = function(){
				self.State = Node.States.WORKING;
				if (typeof callback == 'function'){
					callback.apply(self, arguments)
				}
			}
			if (typeof this.startAsync == 'function')
			{
				return this.startAsync(asyncStartFunc);
			}
			else{
				if (typeof this.start == 'function') var result = this.start();
			}
			if (typeof callback == 'function'){
				setImmediate(asyncStartFunc);
			}
			else{
				result = true;
				self.State = Node.States.WORKING;				
			}
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
		return result;
	},
	
	Stop : function(callback){
		if (this._state == Node.States.WORKING || this._state == Node.States.SLEEP)	{
			this.State = Node.States.STOPPING;
			var self = this;			
			var result = null;
			var asyncStopFunc = function(){
				self.State = Node.States.STOPPED;
				if (typeof callback == 'function'){
			  		callback.apply(self, arguments)
				}
			}
			if (typeof this.stopAsync == 'function')
			{
				return this.stopAsync(asyncStopFunc);
			}
			else{
				if (typeof this.stop == 'function') var result = this.stop();
			}
			if (typeof callback == 'function'){
				setImmediate(asyncStopFunc);
			}
			else{
				result = true;
				self.State = Node.States.STOPPED;
			}
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
	get :   function(){
		return Node.Statuses[this._state];
	},
});

Object.defineProperty(Node.prototype, "State",{
	get :   function(){
		return this._state;
	},
	set : function(value){	
		var os = this._state;
		this._state = value;
		this.emit('state', value, os);
		this.emit(this.Status, os);
	}
});
	

module.exports = Node;
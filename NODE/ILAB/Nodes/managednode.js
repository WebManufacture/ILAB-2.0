useNodeType("node.js");
var Path = require("path");

function ManagedNode (parentNode, item){
	ManagedNode.super_.apply(this, arguments);
	this.type = ManagedNode.Type;
};

global.ManagedNode = ManagedNode;

global.ManagedNode.Type = "managed";

global.Node.Inherit(ManagedNode, {
	init : function(){
		var result = true;
		var self = this;
		if (ManagedNode.base.init){
			result = ManagedNode.base.init.apply(this, arguments);
		}		
		return result;
	},
	
	configure : function(config){
		var result = true;
		var self = this;
		if (ManagedNode.base.configure){
			result = ManagedNode.base.configure.apply(this, arguments);
		}		
		if (this._selector && this._selector.meta){
			this.defaultState = Node.StatusToInt(this._selector.meta);		
		}
		if (this.lconfig.state !== undefined){
			this.defaultState = Node.StatusToInt(this.lconfig.state);		
		}
		else{
			//this.defaultState = Node.States.LOADED;
		}
		if (this.lconfig.Channel){
			this.channel = this.lconfig.Channel;
		}
		else{
			this.channel = this.id;
		}
		Channels.onSubscribe(this.id, CreateClosure(this.onSubscribe, this));
		return result;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
		var self = this;
		var result = true;
		if (ManagedNode.base.load){
			result = ManagedNode.base.load.call(this);
		}
		return result;
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	unload : function(){
		var self = this;
		var result = true;
		if (ManagedNode.base.unload){
			result = ManagedNode.base.unload.call(this);
		}
		this.unSubscribeAll();
		return result;
	},
	
	onSubscribe : function(path, handler){
	
	},
	
	subscribe : function(path, handler, isPermanent){
		if (!path.start("/")) path = "/" + path;
		return this.subscribeToChannel(this.id + path, handler, isPermanent);
	},
	
	subscribeToChannel : function(cname, handler, isPermanent){
		var handler = this._addChannelSubscription(cname, handler);
		if (isPermanent) handler.isPermanent = true;
		Channels.on(cname, handler);
	},
	
	_addChannelSubscription : function(cname, handler){
		if (!this._channelSubscription) this._channelSubscription = {};
		var subs = this._channelSubscription[cname];
		if (!subs) subs = this._channelSubscription[cname] = [];
		subs.push(handler);
		return handler;
	},
	
	unSubscribeAll : function(){
		if (this._channelSubscription) {
			for (var channel in this._channelSubscription){
				var hasPermanent = false;
				var carr = this._channelSubscription[channel];
				for (var i = 0; i < carr.length; i++){
					if (carr[i].isPermanent){
						Channels.un(channel, carr[i]);
					}
					else{
						hasPermanent = true;
					}
				}
				if (!hasPermanent){
					delete this._channelSubscription[channel];
				}
			}
		}
	}	
});

module.exports = ManagedNode;
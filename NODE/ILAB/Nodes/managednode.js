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
		if (this._selector && this._selector.meta && this._selector.meta.length > 0){
			this.defaultState = Node.StatusToInt(this._selector.meta[0]);		
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
	
	error : function(err){
		if (this.logger){
			this.logger.error(err);
		}	
		var node = this;
		this.Unload(function(){
			node.State = Node.States.EXCEPTION;
		});
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
	
	once : function(path, handler){
		if (!path.start("/")) path = "/" + path;
		Channels.on(this.id + path);
	},
	
	unsubscribe : function(path, handler){
		if (!path.start("/")) path = "/" + path;
		path = this.id + path;
		if (!this._channelSubscription) this._channelSubscription = {};
		var subs = this._channelSubscription[path];
		if (handler.groupName && this._groupsSubscriptions){
			var group = this._groupsSubscriptions[groupName];
			if (group) {
				for (var i = 0; i < subs.length; i++){
					if (group[i].handler == handler){
						group.splice[i, 1];
						i--;
					}
				}
			}
		}
		if (subs){
			for (var i = 0; i < subs.length; i++){
				if (subs[i] == handler){
					subs.splice[i, 1];
					i--;
				}
			}
		}
		Channels.un(path, handler);
	},
	
	subscribeByGroup : function(path, groupName, handler){
		if (!path.start("/")) path = "/" + path;
		return this.subscribeToChannel(this.id + path, handler, false, groupName);
	},
	
	subscribeToChannel : function(cname, handler, isPermanent, groupName){
		var handler = this._addChannelSubscription(cname, handler, groupName);
		if (isPermanent) handler.isPermanent = true;
		Channels.on(cname, handler);
	},
	
	_addChannelSubscription : function(cname, handler, groupName){
		if (!this._channelSubscription) this._channelSubscription = {};
		var subs = this._channelSubscription[cname];
		if (!subs) subs = this._channelSubscription[cname] = [];
		if (groupName){
			handler.groupName = groupName;
			if (!this._groupsSubscriptions) this._groupsSubscriptions = {};
			var group = this._groupsSubscriptions[groupName];
			if (!group) group = this._groupsSubscriptions[groupName] = [];
			group.push({
				array : this._channelSubscription[cname],
				index : subs.length,
				handler: handler
			});
		}
		subs.push(handler);
		return handler;
	},
	
	unSubscribeAll : function(){
		if (this._channelSubscription) {
			for (var channel in this._channelSubscription){
				var hasPermanent = false;
				var carr = this._channelSubscription[channel];
				for (var i = 0; i < carr.length; i++){
					if (!carr[i].isPermanent){
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
		if (this._groupsSubscriptions) {
			delete this._groupsSubscriptions
		}
	}	
});

module.exports = ManagedNode;
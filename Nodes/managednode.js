useNodeType("node.js");

function ManagedNode (parentNode, item){
	ManagedNode.super_.apply(this, arguments);
	this.type = ManagedNode.Type;
};

global.ManagedNode = ManagedNode;

global.ManagedNode.Type = "managed";

global.Node.Inherit(ManagedNode, {
	init : function(config){
		if (ManagedNode.base.init){
			ManagedNode.base.init.call(this, config);
		}
		this.defaultState = Node.StatusToInt(config.defaultState);		
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		var self = this;
		if (self.defaultState == Node.States.WORKING || self.defaultState == Node.States.SLEEP){
			setImmediate(function(){
				self.Start(function(){
					if (self.defaultState == Node.States.SLEEP){
						self.Sleep();
					}
				});
			});
		};		
		if (ManagedNode.base.load){
			return ManagedNode.base.load.call(this, callback);
		}
		if (callback){
			callback();
		}
		return true;
	}
});

module.exports = ManagedNode;
useNodeType("node.js");

function ManagedNode (parentNode, item){
	ManagedNode.super_.apply(this, arguments);
	this.type = ManagedNode.Type;
};

global.ManagedNode = ManagedNode;

global.ManagedNode.Type = "managed";

global.Node.Inherit(ManagedNode, {
	init : function(config){
		if (config.State !== undefined){
			this.defaultState = Node.StatusToInt(config.State);		
		}
		else{
			//this.defaultState = Node.States.LOADED;
		}
		if (ManagedNode.base.init){
			return ManagedNode.base.init.call(this, config);
		}
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
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
			return ManagedNode.base.load.call(this);
		}
		return true;
	}
});

module.exports = ManagedNode;
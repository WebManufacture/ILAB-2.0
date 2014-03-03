useNodeType("node.js");

function ManagedNode (parentNode, item){
	ManagedNode.super_.apply(this, arguments);
	this.type = ManagedNode.Type;
	var self = this;
	if (!parentNode){
		this.on('initialized', function(){
			if (self.defaultState == Node.States.WORKING || self.defaultState == Node.States.SLEEP){
				self.Start(function(){
					if (self.defaultState == Node.States.SLEEP){
						self.Sleep();
					}
				});
			}		
		});
	};
};

global.ManagedNode = ManagedNode;

global.ManagedNode.Type = "managed";

global.Node.Inherit(ManagedNode, {
	init : function(config){
		if (ManagedNode.base.init){
			ManagedNode.base.init.call(this, config);
		}
		this.defaultState = Node.StatusToInt(this.config.State);
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		console.log("loading " + this.id + "  d:" + Node.States[this.defaultState]);
		if (ManagedNode.base.load){
			return ManagedNode.base.load.call(this, callback);
		}
		else{
			return true;
		}
	}
});

module.exports = ManagedNode;
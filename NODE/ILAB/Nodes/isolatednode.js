useNodeType("node.js");
useNodeType("managednode.js");

function IsolatedNode (parentNode, item){
	IsolatedNode.super_.apply(this, arguments);
	this.type = IsolatedNode.Type;
};

global.IsolatedNode = IsolatedNode;

global.IsolatedNode.Type = "isolated";

Node.Inherit(IsolatedNode, ManagedNode, {
	init : function(config){
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		return true;
	}
});

module.exports = IsolatedNode;
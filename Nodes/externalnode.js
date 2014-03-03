useNodeType("node.js");
useNodeType("managednode.js");

function ExternalNode (parentNode, item){
	ExternalNode.super_.apply(this, arguments);
	this.type = ExternalNode.Type;
};

global.ExternalNode = ExternalNode;

global.ExternalNode.Type = "external";

Node.Inherit(ExternalNode, ManagedNode, {
	init : function(config){
		return true;
	},

	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		return true;
	}
});

module.exports = ExternalNode;
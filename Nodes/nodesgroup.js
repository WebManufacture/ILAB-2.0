var Path = require('path');
var debug = require('debug');

useModule("Utils.js");
useModule("Async.js");
useModule("channels.js");
useNodeType("node.js");

function NodeGroup (parentNode, item){
	NodeGroup.super_.apply(this, arguments);
	this.type = NodeGroup.Type;
	var self = this;
	//Channels.on("/global/config.changed", CreateClosureMap(self._configChanged, self, 2));
	/*
	Channels.on("/global/node.delete", CreateClosureMap(self._deleteNode, self, 2));
	Channels.on("/global/node.add", CreateClosureMap(self._addNode, self, 2));
	Channels.on("/global/node.start", CreateClosureMap(self._startNode, self, 2));
	Channels.on("/global/node.stop", CreateClosureMap(self._stopNode, self, 2));
	Channels.on("/global/node.unload", CreateClosureMap(self._unloadNode, self, 2));
	Channels.on("/global/node.load", CreateClosureMap(self._loadNode, self, 2));
	Channels.on("/global/node.reload", CreateClosureMap(self._reloadNode, self, 2));*/
};

global.NodeGroup = NodeGroup;

global.NodeGroup.Type = "nodesgroup";

Inherit(NodeGroup, ManagedNode, {
	init : function(cfg){
		try{
			if (NodeGroup.base.init){
				NodeGroup.base.init.call(this, cfg);
			}

			this.Config = cfg;
			this.Nodes = {};
			this.Modules = [];

			var self = this;

			if (!cfg.Nodes) cfg.Nodes = {};

			var nodes = this.config.Nodes;
			
			for (var nodeId in nodes){
				var item = nodes[nodeId];
				item.id = nodeId;
				if (!item.Type) item.Type = 'base';
				var nType = NodesByTypes[item.Type];
				if (nType){
					var node = new nType(self, item);
					this.Nodes[node.id] = node;
					node.on('state', function(state, stateOld){
						self.logger.debug("<#058:{0}:{1}> {2} => {3}", this.type, this.id, Node.Statuses[stateOld],Node.Statuses[state]);
					});
					if (item.State == "working"){
						this.logger.debug("<green:{0}:{1}> {2}", item.Type, item.id, item.File);
					}
					else
					{
						this.logger.debug("<#A90:{0}:{1}> {2}", item.Type, item.id, item.File);	
					}
				}
				else{
					this.logger.warn("Unknown node type: " + item.Type);
				}
			}
			
			return true;
		}
		catch(err){
			this.logger.error(err);
		}
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(callback){
		try{
			var self = this;
			var LoadWF = new Async.EventFall(function(){
				if (NodeGroup.base.load){
					NodeGroup.base.load.call(self, callback);
				}						
				else{
					callback();
				}
			});
			
			for (var id in self.Nodes){
				var node = self.Nodes[id];
				LoadWF.subscribe(node, 'loaded');
				if (node.defaultState >= Node.States.LOADED || node.defaultState < Node.States.UNLOADING){
					node.Load();
				}
			}
			LoadWF.check();
		}
		catch(err){
			this.logger.error(err);
		}
		return false;
	},

	unload : function(callback){
		this.logger.debug("<red:Unloading frame service>");
		var self = this;
		var wf = new Async.EventFall(function unloadComplete(){
			delete self.Nodes;
			self.logger.debug("<red:Frame service unloaded>");
			if (callback) callback();
			else self.State = Node.States.UNLOADED;
		});
		for (var id in this.Nodes){
			wf.subscribe(this.Nodes[id], 'unloaded');
		}
		for (var id in this.Nodes){
			try{
				 this.Nodes[id].Unload();
			}
			catch (error){
				console.log(error);				
			}
		}
		return false;
	},

	start : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			if (node.defaultState >= Node.States.WORKING || node.defaultState < Node.States.UNLOADING){
				node.Start(function(){
					if (this.defaultState == Node.States.SLEEP){
						this.sleep();
					}
				});
			}
		}
		if (NodeGroup.base.start){
			return NodeGroup.base.start.call(this, callback);
		}
		else{
			return true;
		}
	},

	stop : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Stop();
		}
		if (NodeGroup.base.stop){
			return NodeGroup.base.stop.call(this, callback);
		}
		else{
			return true;
		}
	},

	pause : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			node.Pause();
		}

		if (NodeGroup.pause.load){
			return NodeGroup.base.pause.call(this, callback);
		}
		else{
			return true;
		}
	},

	SaveConfig : function(){
		if (this.ConfigFile){
			this.logger.info('config rewrite');
			fs.writeFileSync(this.ConfigFile, JSON.stringify(this.Config), 'utf8');
		}
	},
	
	_configChanged : function(param){
		
	},
	
	_deleteNode : function(param){
		
	},
	
	_addNode : function(param){
		
	},
	
	_startNode : function(param){
		
	},
	
	_stopNode : function(param){
		
	},
	
	_unloadNode : function(param){
		
	},
	
	_loadNode : function(param){
		
	},
	
	_reloadNode : function(param){
		
	}
});

module.exports = NodeGroup;	
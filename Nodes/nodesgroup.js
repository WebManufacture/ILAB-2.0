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
		if (!this.id && !cfg.id){
			this.id = "nodes-group" + parseInt(Math.random()*1000);
		}
		
		if (NodeGroup.base.init){
			NodeGroup.base.init.call(this, cfg);
		}
		
		try{
			
			
			this.Config = cfg;
			this.Nodes = {};
			this.Modules = [];

			var self = this;

			if (!cfg.Nodes) cfg.Nodes = {};

			var citems = this.config.Nodes;
			var nodes = {};
			
			for (var nodeId in citems){
				var item = citems[nodeId];
				item.id = nodeId;
				if (!item.Type) item.Type = 'base';
				var nType = NodesByTypes[item.Type];
				if (nType){
					var node = new nType(self);
					nodes[nodeId] = node;
					node.on('state', function(state, stateOld){
						if (this.logger){
							this.logger.debug("{0} => {1}", Node.Statuses[stateOld],Node.Statuses[state]);
						}
						else{
							self.logger.debug("{0}:%bright;%white;{1} %normal;{2} => {3}", this.type, this.id, Node.Statuses[stateOld],Node.Statuses[state]);
						}
					});
					if (item.State == "working"){
						this.logger.debug("%green;{0}:%normal;{1} {2}", item.Type, item.id, item.File);
					}
					else
					{
						this.logger.debug("%yellow;{0}:%normal;{1} {2}", item.Type, item.id, item.File);	
					}
				}
				else{
					this.logger.warn("Unknown node type: " + item.Type);
				}
			}
			
			for (var nodeId in nodes){			
				var node = nodes[nodeId];
				var item = citems[nodeId];			
				node.originalId = nodeId;
				try{
					node.Init(item);		
					if (node.defaultState === undefined){
						node.defaultState = Node.States.LOADED;
					};
				}
				catch(err){
					this.logger.error(err);
				};
				this.Nodes[node.id] = node;				
			}
			
			return true;
		}
		catch(err){
			this.logger.error(err);
			node.State = Node.States.EXCEPTION;
			return false;
		}
		return true;
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
		try{
			var self = this;
			
			var lf = new Async.Waterfall(function loadComplete(){						
				self.State = Node.States.LOADED;
				this.destroy();
			});
			
			for (var id in self.Nodes){
				var node = self.Nodes[id];
				if (node.defaultState >= Node.States.LOADED && node.defaultState < Node.States.UNLOADING && node.State >= Node.States.INITIALIZED){
					try{
						var cb = lf.getCallback();
						node.once('initialized', cb);
						node.once('exception', cb);
						node.once('loaded', cb);
						node.Load();
					}
					catch(err){
						lf.revertCallback();
						this.logger.error(err);
					};
				}
			}

			lf.check();
		}
		catch(err){
			this.logger.error(err);
		}
		return false;
	},

	unload : function(){
		var self = this;
		var wf = new Async.EventFall(function unloadComplete(){
			delete self.Nodes;
			self.State = Node.States.UNLOADED;
			this.destroy();
		});
		for (var id in self.Nodes){
			var node = self.Nodes[id];
			if (node.State < Node.States.UNLOADING) wf.subscribe(node, "unloaded");
		}
		for (var id in this.Nodes){
			try{
				if (node.State < Node.States.UNLOADING) this.Nodes[id].Unload();
			}
			catch (error){
				this.logger.error(error);
			}
		}
		wf.check();
		
		return false;
	},

	start : function(callback){
		var self = this;
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			if ((!node.defaultState || (node.defaultState >= Node.States.WORKING && node.defaultState < Node.States.UNLOADING)) && (node.State >= Node.States.LOADED && node.State <= Node.States.STOPED)){
				try{
					node.Start(function(){
						try{
							if (this.defaultState == Node.States.SLEEP){
								this.sleep();
							}
							if (this.defaultState == Node.States.STOPPED){
								this.Stop();
							}
						}			
						catch(err){
							self.logger.error(err);
						};
					});
				}			
				catch(err){
					self.logger.error(err);
				};
			}
		}
		return true;
	},

	stop : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			try{
				if (node.State >= Node.States.WORKING && node.State < Node.States.STOPED) node.Stop();
			}			
			catch(err){
				self.logger.error(err);
			};
		}
		return true;
	},

	sleep : function(callback){
		for (var id in this.Nodes){
			var node = this.Nodes[id];
			try{
				if (node.State == Node.States.WORKING)	node.Sleep();
			}			
			catch(err){
				self.logger.error(err);
			};
		}
		return true;
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
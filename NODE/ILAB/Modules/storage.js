var fs = require('fs');
var Path = require('path');
var EventEmitter = require("events").EventEmitter;

StorageLayer = function(objects){
	if (!objects) objects = [];
	this.objects = objects;
	this.indexes = {};
	this.types = {
		
	};
	this.classes = {

	};	
	if (objects){
		this._fillIndexes(this.objects);
		this._fillItems(this.objects);
		this._fillClasses(this.objects);	
	}
}

StorageLayer.prototype = {		
	_fillIndexes: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].id){
				this.indexes[data[i].id] = data[i];
			}
		}
	},
	
	_fillItems: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].type){
				if (!this.types[data[i].type]) this.types[data[i].type] = [];
				this.types[data[i].type].push(data[i]);
			}
		}
	},	

	_fillClasses: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].tags){
				var classes = data[i].tags.split(' ');
				for(var cl = 0; cl < classes.length; cl++){
					if (classes[cl]){
						if (!this.classes[classes[cl]]){
							this.classes[classes[cl]] = [];
						}
						this.classes[classes[cl]].push(data[i]);
					}
				}
			}
		}
	},
	
		
	_filterByClasses: function(selector, items){
		if (!selector.tags) return items;
		if (!items) return null;
		var arr = [];
		for (var i = 0; i < items.length; i++){
			if (selector.is(items[i])) arr.push(items[i]);
		}
		return arr;
	},
	
	_getByClasses: function(selector, items){
		if (!items || !selector) return null;
		for (var i = 0; i < items.length; i++){
			if (selector.is(items[i])) return items[i];
		}
		return null;
	},
	
		
	_queryInternal: function(selector, item){
		if (!selector) return null;
		if (selector.id){
			var candidate = this.indexes[selector.id];
			if (!candidate || !selector.is(candidate)) return null;			
			return candidate;
		}
		var candidates = this.objects;
		if (selector.type){
			if (selector.type != "*"){
				var candidates = this.types[selector.type];
				if (!candidates) return null;
			}
		}
		return this._getByClasses(selector, candidates);
	},
	
	
	_queryAllInternal: function(selector){
		if (!selector) return;
		if (selector.id){
			var candidate = this.indexes[selector.id];
			if (!candidate || !selector.is(candidate)) return [];			
			return [candidate];
		}
		var candidates = this.objects;
		if (selector.type){
			if (selector.type != "*"){
				var candidates = this.types[selector.type];
			}
		}
		return this._filterByClasses(selector, candidates);
	},
		
	all : function(selector){
		if (typeof(selector) == 'string') selector = new Selector(selector);
		return this._queryAllInternal(selector);
	},

	get : function(selector){
		if (typeof(selector) == 'string') selector = new Selector(selector);
		return this._queryInternal(selector);
	},
	
	createSubLayer : function(){
		var childs = [];
		/*for (var cl = 0; cl < this.objects.length; cl++){
			var obj = this.objects[cl];	
			if (obj.childs && obj.childs.length > 0){
				obj._internalId = cl;
				childs.concat(obj.childs);
			}
		}*/	
		return childs;
	},
	
	resolveExternalLinks : function(resolver){
		if (typeof resolver == "function"){
			for (var cl = 0; cl < this.objects.length; cl++){
				var obj = this.objects[cl];	
				
			}	
		}
	},
	
	add : function(obj){
		if (obj){
			if (obj.id){
				if (this.indexes[obj.id]){
					return null;
				}
				else{
					this.indexes[obj.id] = obj;
				}
			}
			if (obj.type){
				if (!this.types[obj.type]) this.types[obj.type] = [];
				this.types[obj.type].push(obj);
			}
			if (obj.classes){
				for (var cl = 0; cl < obj.classes.length; cl++){
					var tag = obj.classes[cl];	
					if (!this.classes[tag]) this.classes[tag] = [];
					this.classes[tag].push(obj);
				}				
			}
			this.objects.push(obj);
			return obj;
		}
		return null;
	},

	del : function(obj){
		if (obj){
			if (obj.id && this.indexes[obj.id]){
				delete this.indexes[obj.id];
			}
			if (obj.type && this.types[obj.type]){
				var items = this.types[obj.type];
				for (var i = 0; i < items.length; i++){
					if (items[i] == obj){
						items.splice(i, 1);
						break;
					};
				}
			}
			if (obj.classes){
				for (var cl = 0; cl < obj.classes.length; cl++){
					var tag = obj.classes[cl];	
					var items = this.classes[tag];
					for (var i = 0; i < items.length; i++){
						if (items[i] == obj){
							items.splice(i, 1);
							break;
						};
					}
				}				
			}
			for (var i = 0; i < this.objects.length; i++){
				if (this.objects[i] == obj){
					this.objects.splice(i, 1);
					break;
				};
			}
		}
	}
};

Storage = function(file, createIfNotExists){
	if (file) file = Path.resolve(file);
	var stor = this;
	this.Init = function(){
		if (!stor.closed){
			stor.layers = [];
		}
	}
	
	this.Reload = function(create){
		if (!stor.closed && !stor.reloading){
			stor.Init();
			if (stor.file){
				var exists = fs.existsSync(stor.file);
				if (exists || create){
					stor.reloading = true;
					if (exists){
						var objects = JSON.parse(fs.readFileSync(stor.file));
						stor._loadStore(objects);
					}
					stor.emit("load");
					stor.reloading = false;					
					if (!exists && create) { stor._save(); };
				}
				else{
					console.error("Deleted " + stor.file);
					stor._close();	
				}
			}
		}
	}
	stor.file = file;
	this.Reload(createIfNotExists);
	if (file){
		this.watcher = fs.watch(file, {}, function(event, fname){
			if (!stor.selfChange && !stor.closed){
				stor.Reload();
			}
		});
	}
}

Storage.Delete = function(storage){
	if (!storage.closed){
		storage._close();
	}
	if (storage.file && fs.existsSync(storage.file)){
		fs.unlinkSync(storage.file);
	}
}

Inherit(Storage, EventEmitter, {
	_close : function(){
		this.objects = null;
		this.indexes = null;
		this.items = null;
		this.classes = null;
		if (this.watcher){
			this.watcher.close();
		}
		this.closed = true;
	},
	
	_loadStore : function(objects){
	    this.layers = [];
		while (objects && objects.length > 0){
			var layer = this.layers.push(new StorageLayer(objects));
			objects = layer.getSubLayerItems();			
		}			
	},
	
	_save : function(){
		if (this.file && !this.closed){
			var stor = this;
			if (stor.reloading){
				setTimeout(function(){
					stor._save();
				}, 200);
				return;
			}
			this.selfChange = true;
			var objects = [];
			if (this.layers.length > 0){
				objects = this.layers[0].objects;
			}
			fs.writeFileSync(this.file, JSON.stringify(objects));
			this.selfChange = false;
		}
	},
	
	all : function(selector){
		if (!selector) selector = "*";
		if (typeof(selector) == 'string') selector = new Selector(selector);
		var result = [];
		for (var i = 0; i < this.layers.length; i++){
			var all = this.layers[i].all(selector);
			if (all && all.length > 0){
				result = result.concat(all)
			}
		}
		return result;
	},

	get : function(selector){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		for (var i = 0; i < this.layers.length; i++){
			var obj = this.layers[i].get(selector);
			if (obj) return obj;
		}
		return null;
	},
	
	_formatObject : function(selector, data){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		if (!data) data = {};
		if (selector.id && !data.id){
			data.id = selector.id;
		}
		if (selector.classes){
			if (!data.tags) data.tags = " ";
			for (var i = 0; i < selector.classes.length; i++){
				var cls = selector.classes[i];
				if (!data.tags.contains(" " + cls + " ")){
					data.tags += cls + " ";
				}
			}
		}
		if (selector.type && !data.type){
			data.type = selector.type;
		}
		//if (!selector.id && data.id) selector.id = data.id;
		//if (!selector.type && data.type) selector.type = data.type;
		return data;
	},

	set : function(selector, data){
		data = this._formatObject(selector, data);
		if (data.id){
			if (this.indexes[data.id]){
				var obj = this.indexes[data.id];
				for (var item in data){
					obj[item] = data[item];
				}
			}
		}	
		else{
			
		}
		this._save();
		return null;
	},

	add : function(selector, data){
		var obj = this._formatObject(selector, data);
		if (this.layers.length == 0) this.layers.push(new StorageLayer());
		this.layers[0].add(obj);
		this._save();
		return obj;
	},

	del : function(selector){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		var count = 0;
		for (var i = this.layers.length-1; i >= 0; i--){
			var all = this.layers[i].all(selector);
			for (var oi = this.layers.length-1; oi >= 0; oi--){
				if (this.layers[i].del(all[oi])){
					count++;
				}
			}
		}
		this._save();
		return count;
	}
});

module.exports = Storage;
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
		this._fillItems(this.objects);
		this._fillIndexes(this.objects);
		this._fillClasses(this.objects);	
	}
}

StorageLayer.prototype = {		
	_fillIndexes: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			var id = data[i].id;
			if (id){
				this.indexes[id] = data[i];
			}
		}
	},
	
	_fillItems: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			var type = data[i].type;
			if (type){
				if (!this.types[type]) this.types[type] = [];
				this.types[type].push(data[i]);
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
		if (!items) return [];
		if (!selector.tags) return items;
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
		
	getSubLayerItems : function(){
		return null;	
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
			var result = false;
			for (var i = 0; i < this.objects.length; i++){
				if (this.objects[i] == obj){
					this.objects.splice(i, 1);
					result = true;
					break;
				};
			}
			if (result){
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
			}
			return result;
		}
		return false;
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
	
	function Watch(){
		if (!stor.watching){
			this.watcher = fs.watch(file, {}, function(event, fname){
				if (!stor.selfChange && !stor.closed && !stor.reloading){
					stor.Reload();
				}
			});
			stor.watching = true;
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
						fs.readFile(stor.file, function(err, data){
							var objects = JSON.parse(data);
							if (!objects){
								console.warn("Loading storage " + stor.file + " EMPTY!")
							}
							else{
								console.log("Loading storage " + stor.file + " " + objects.length + " items")
							}
							stor._loadStore(objects);
							stor.emit("store-loaded");
							Watch();
							stor.reloading = false;	
						});						
					}				
					else{
						stor.emit("store-loaded");
						stor.reloading = false;	
						if (create) { stor._save(); };
						Watch();
					}					
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
			var layer = new StorageLayer(objects);
			this.layers.push(layer);
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
	
	all : function(selector, data){
		if (this.layers.length == 0) return [];
		selector = this._formatObject(selector, data);
		if (!selector) selector = "*";
		var items = this.layers[0].all(selector);
		while (items.length > 0 && (selector.follow || selector.next)){
			var result = [];
			for (var i = 0; i < items.length; i++){
				var item = items[i];
				if (item.childs && item.childs.length > 0){
					result = result.concat(item.childs);
				}
			}
			var layer = new StorageLayer(result);
			if (selector.next){
				items = layer.all(selector.next);
				selector = selector.next;
			}
			if (selector.follow){
				var temp = layer.all(selector.follow);
				if (temp.length == 0){
					items = result;
				}
				else{
					items = temp;
					selector = selector.follow;
				}
			}
		}
		/*for (var i = 0; i < this.layers.length; i++){
			var all = this.layers[i].all(selector);
			if (all && all.length > 0){
				result = result.concat(all);
			}
		}*/
		return items;
	},

	get : function(selector, data){
		if (this.layers.length == 0) return [];
		selector = this._formatObject(selector, data);
		if (!selector) selector = "*";
		var items = this.layers[0].all(selector);
		while (items.length > 0 && (selector.follow || selector.next)){
			var result = [];
			for (var i = 0; i < items.length; i++){
				var item = items[i];
				if (item.childs && item.childs.length > 0){
					result = result.concat(item.childs);
				}
			}
			var layer = new StorageLayer(result);
			if (selector.next){
				items = layer.all(selector.next);
				selector = selector.next;
			}
			if (selector.follow){
				var temp = layer.all(selector.follow);
				if (temp.length == 0){
					items = result;
				}
				else{
					items = temp;
					selector = selector.follow;
				}
			}
		}
		/*for (var i = 0; i < this.layers.length; i++){
			var obj = this.layers[i].get(selector);
			if (obj) return obj;
		}*/
		return items[0];
	},
	
	_formatObject : function(selector, data){
		if (!selector) return data;
		if (typeof(selector) == 'string') selector = new Selector(selector);
		if (!data) data = {};
		else if (typeof (data) == 'string'){
			data = new Selector(data);
		}
		if (selector.id && !data.id){
			data.id = selector.id;
		}
		/*if (data.classes){
			data.tags = " " + data.classes.join(" ") + " ";
		};*/
		if (data.classes){
			for (var i = 0; i < data.classes.length; i++){
				if (!data.tags) data.tags = " ";
				var cls = data.classes[i];
				if (!data.tags.contains(" " + cls + " ")){
					data.tags += cls + " ";
				}
			}
		}		
		if (selector.tags && !selector.classes){
			selector.classes = selector.tags.trim().split(" ");
		}		
		if (selector.classes){
			for (var i = 0; i < selector.classes.length; i++){
				if (!data.tags) data.tags = " ";
				var cls = selector.classes[i];
				if (!data.tags.contains(" " + cls + " ")){
					data.tags += cls + " ";
				}
			}
		}		
		if (data.tags){
			data.classes = data.tags.trim().split(" ");
		}
		if (selector.type && !data.type){
			data.type = selector.type;
		}
		if (selector.next){
			if (!data.childs) data.childs = [];
			data.childs.push(this._formatObject(selector.next));
		}
		/*if (selector.follow){
			if (!data.childs) data.childs = [];
			while(selector.follow){
				data.childs.push(this._formatObject(selector.follow));
			}
		}*/
		//if (!selector.id && data.id) selector.id = data.id;
		//if (!selector.type && data.type) selector.type = data.type;
		return data;
	},

	set : function(selector, data){
		if (!data) data = selector;
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

	checkChilds : function(data){
		if (data.childs && data.childs.length){
			for (var i = 0; i < data.childs.length; i++){
				var child = data.childs[i];	
				if (typeof (child) == "string") {
					data.childs[i] = this._formatObject(child);
				}
				else {
					if (child.childs) this.checkChilds(child);
				}
			}
		}
	},
	
	add : function(selector, data){
		if (!selector && !data) return;
		if (this.layers.length == 0) this.layers.push(new StorageLayer());
		data = this._formatObject(selector, data);
		this.checkChilds(data);		
		this.layers[0].add(data);
		this._save();
		return data;
	},

	del : function(selector, data){		
		selector = this._formatObject(selector, data);
		if (!selector) return;
		var count = 0;
		for (var i = this.layers.length-1; i >= 0; i--){
			var all = this.layers[i].all(selector);
			for (var oi = all.length-1; oi >= 0; oi--){
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
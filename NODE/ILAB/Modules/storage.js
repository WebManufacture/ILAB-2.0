var fs = require('fs');
var Path = require('path');
var EventEmitter = require("events").EventEmitter;

Storage = function(file, createIfNotExists){
	if (file) file = Path.resolve(file);
	var stor = this;
	this.Init = function(){
		if (!stor.closed){
			stor.objects = [];
			stor.indexes = {};
			stor.items = {
				"*" : [],	 
			};
			stor.classes = {

			};
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
						stor.objects = JSON.parse(fs.readFileSync(stor.file));
					}
					stor._fillIndexes(stor.objects);
					//stor._fillClasses(stor.classes, stor.objects);
					stor._fillItems(stor.items, stor.objects);
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
			fs.writeFileSync(this.file, JSON.stringify(this.objects));
			this.selfChange = false;
		}
	},
	
	_fillIndexes: function(data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].id){
				this.indexes[data[i].id] = data[i];
			}
			this._fillIndexes(data[i].childs);
		}
	},
	
	_fillItems: function(root, data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].item){
				if (!this.items[data[i].item]) this.items[data[i].item] = [];
				this.items[data[i].item].push(data[i]);
			}
			else{
				root["*"].push(data[i]);
			}
			this._fillItems(root, data[i].childs);
		}
	},	
	
	_fillClasses: function(root, data){
		if (!data) return;
		for(var i = 0; i < data.length; i++){
			if (data[i].classes){
				if (!this.classes[data[i].classes]){
					this.classes[data[i].classes] = [];
				}
				this.classes[data[i].classes].push(data[i]);
			}
			this._fillClasses(root, data[i].childs);
		}
	},
	
	_checkClasses: function(selector, item){
		if (!selector.tags) return item;
		if (item){
			if (item.classes.contains(selector.tags)) return item;
		}
		else{
			var items = null;
			for (var i = 0; i < this.objects.length; i++){
				var obj = this.objects[i];
				if (!obj.classes.contains[selector.tags]) return obj;
			}
		}		
		return null;
	},
	
	_query: function(selector, item){
		var candidate = this._queryInternal(selector, item);
		if (candidate) return candidate.data;
		return null;
	},
	
	_queryInternal: function(selector, item){
		if (!selector) return null;
		var candidate = null;
		if (selector.id){
			candidate = this.indexes[selector.id];
		}
		if (selector.item){
			if (selector.item == "*"){
				if (!candidate && !selector.classes){
					return this.objects[0];
				}
			}
			else{
				if (!candidate){
					var candidates = this.items[selector.item];
					for (var i = 0; i < candidates.length; i++){
						if (this._checkClasses(selector, candidates[i])) return candidates[i];
					}
					return null;
				}
				else{
					if (!candidate.item == selector.item) return null;
				}
			}
		}
		candidate = this._checkClasses(selector, candidate);
		if (candidate) return candidate;
		return null;
	},
	
	_filterClasses: function(selector, items){
		if (!selector.tags) return items;
		if (!items) return null;
		var arr = [];
		for (var i = 0; i < items.length; i++){
			if (items[i].classes.contains(selector.tags)) arr.push(items[i]);
		}
		return arr;
	},
	
	_wrapData: function(items){
		if (!items) return [];
		var arr = [];
		for (var i = 0; i < items.length; i++){
			arr.push(items[i].data);
		}
		return arr;
	},
	
	_queryAll: function(selector){
		return this._wrapData(this._queryAllInternal(selector));
	},
	
	_queryAllInternal: function(selector){
		if (!selector) return;
		var candidate = null;
		if (selector.id){
			candidate = this._queryInternal(selector);
			if (candidate) return [candidate];
			else return[];
		}
		if (selector.item){
			if (selector.item != "*"){
				return this._filterClasses(selector, this.items[selector.item]);
			}
		}
		return this._filterClasses(selector, this.objects);
	},
	
	all : function(selector){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		var all = this._queryAllInternal(selector);
		if (!all) return [];
		return all;
	},

	get : function(selector){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		return this._queryInternal(selector);
	},
	
	_formatObject : function(selector, data){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		if (!data) obj = {};
		if (selector.id){
			data.id = selector.id;
		}
		if (selector.tags && !data.classes){
			data.classes = selector.tags;
		}
		if (selector.item){
			data.item = selector.item;
		}
		if (!selector.id && data.id) selector.id = data.id;
		if (!selector.item && data.item) selector.item = data.item;
		if (data.classes != selector.tags){
			for (var item in selector.tags){
				
			}
		}
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
		if (obj.id){
			if (this.indexes[obj.id]){
				return null;
			}
			else{
				this.indexes[obj.id] = obj;
			}
		}
		if (obj.item){
			if (!this.items[obj.item]) this.items[obj.item] = [];
			this.items[obj.item].push(obj);
		}
		this.objects.push(obj);
		this._save();
		return data;
	},

	del : function(selector){
		if (typeof(selector) == 'string') selector = Selector.first(selector);
		var obj = null;
		while((obj = this._queryInternal(selector)) != null){
			if (obj.id && this.indexes[obj.id]){
				delete this.indexes[obj.id];
			}
			if (obj.item && this.items[obj.item]){
				var items = this.items[obj.item];
				for (var i = 0; i < items.length; i++){
					if (items[i] == obj){
						items.splice(i, 1);
						break;
					};
				}
			}
			for (var i = 0; i < this.objects.length; i++){
				if (this.objects[i] == obj){
					this.objects.splice(i, 1);
					break;
				};
			}
		}
		this._save();
	}
});

module.exports = Storage;
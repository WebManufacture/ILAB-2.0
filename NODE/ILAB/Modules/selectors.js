Selector = function(str){
	this.source = "";
	if (str && typeof str == "string") {
		var item;
		var regex = /([/>\s]?)([#.:]?)([\w\*-]+)/ig;
		while((item = regex.exec(str)) != null){
			if (item[1] == ""){
				this._add(item[2], item[3]);
			}
			else{
				if (item[1] == " "){
					this._follow(new Selector(str.substr(item.index + 1)));
					break;
				}
				if (item[1] == "/" || item[1] == ">"){
					this._next(new Selector(str.substr(item.index + 1)));
					break;
				}
			}
		}
	}
}

Selector.prototype = {
	identify : function(symbol, entity){
		if (symbol == "" && !this.item){
			this.type = entity;
		}
		if (symbol == "#" && !this.id){
			this.id = entity;
		}		
		if (symbol == ":"){
			if (!this.meta) this.meta = {};
			this.meta[entity] = true;
		}
		if (symbol == "."){
			if (!this.classes) this.classes = [];
			var tags = '';
			if (this.classes.length == 0){
				this.classes = [ entity ];
				this.tags = " " + entity + " ";
			}
			else{
				for (var i = 0; i < this.classes.length; i++){
					if (entity && this.classes[i] > entity){
						this.classes.splice(i, 0, entity);
						entity = null;
					}
					this.tags += " " + this.classes[i];
				}
				if (entity){
					this.classes.push(entity);
					this.tags += " " + entity;
				}
				this.tags += " ";
			}
		}
	},
	
	is : function(selector){
		if (this.id && selector.id != this.id) return false;	
		if (this.type && this.type != "*" && selector.type != this.type) return false;	
		if (this.classes){
			if (selector.tags){
				for (var i = 0; i < this.classes.length; i++){
					var cls = this.classes[i];
					if (!selector.tags.contains(" " + cls +  " ")){ return false; }
				}
			}
			else{
				if (this.classes.length > 0) return false;
			}
		}
		if (this.meta){
			for (var item in this.meta){
				if (!selector.meta[item]){ return false; }
			}
		}
		return true;
	},
	
	_add : function(symbol, entityName){
		if (typeof symbol != "string") return;
		if (!entityName && symbol.length >= 1){
			entityName = symbol.substr(1);
		}
		this.source += symbol + entityName;
		this.identify(symbol, entityName);
	},
	
	_next : function(selector){
		this.next = selector;
		return selector;
	},
	
	_follow : function(selector){
		this.follow = selector;
		return selector;
	}
}

Selector.Regexp = /([/>\s]?)([#.:]?)([\w\*-]+)/ig;

Selector.parse = function(txt){
	if (txt){
		var item;
		var items = [];
		var currentSelector;
		var regex = /([/>\s]?)([#.:]?)([\w\*-]+)/ig;
		while((item = regex.exec(txt)) != null){
			if (currentSelector){
				if (item[1] == ""){
					currentSelector._add(item[2], item[3]);
				}
				else{
					if (item[1] == " "){
						currentSelector = currentSelector._follow(new Selector(item[2], item[3]));
						items.push(currentSelector);
					}
					if (item[1] == "/" || item[1] == ">"){
						currentSelector = currentSelector._next(new Selector(item[2], item[3]));
						items.push(currentSelector);
					}
				}
			}
			else{
				currentSelector = new Selector();
				currentSelector._add(item[2], item[3]);
				items.push(currentSelector);
			}
		}
		return items;
	}	
}

Selector.first = Selector.single = function(txt){
	if (txt){
		return new Selector(txt);
	}	
}

module.exports = Selector;
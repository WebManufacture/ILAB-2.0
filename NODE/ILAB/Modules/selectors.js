Selector = function(type, object){
	this.type = type;
	this.object = object;
	this.source = type + object;
	this.identify(type, object);
}

Selector.prototype = {
	identify : function(type, object){
		if (type == "" && !this.item){
			this.item = object;
		}
		if (type == "#" && !this.id){
			this.id = object;
		}		
		if (type == ":"){
			if (!this.meta) this.meta = [];
			this.meta.push(object);
		}
		if (type == "."){
			if (!this.classes) this.classes = [];
			var tags = '';
			if (this.classes.length == 0){
				this.classes = [ object ];
				this.tags = object;
			}
			else{
				for (var i = 0; i < this.classes.length; i++){
					if (object && this.classes[i] > object){
						this.classes.splice(i, 0, object);
						object = null;
					}
					this.tags += " " + this.classes[i];
				}
				if (object){
					this.classes.push(object);
					this.tags += " " + object;
				}
				this.tags = this.tags.replace(" ", '');
			}
		}
	},
	
	Add : function(type, object){
		if (!type) return;
		this.source += type + object;
		this.identify(type, object);
	},
	
	Next : function(selector){
		this.next = selector;
		return selector;
	},
	
	Follow : function(selector){
		this.follow = selector;
		return selector;
	}
}

Selector.parse = function(txt){
	if (txt){
		var regexp = /([/>\s]?)([#.:]?)([\w\*-]+)/ig;
		var item;
		var items = [];
		var currentSelector;
		while((item = regexp.exec(txt)) != null){
			if (currentSelector){
				if (item[1] == ""){
					currentSelector.Add(item[2], item[3]);
				}
				else{
					if (item[1] == " "){
						currentSelector = currentSelector.Follow(new Selector(item[2], item[3]));
						items.push(currentSelector);
					}
					if (item[1] == "/" || item[1] == ">"){
						currentSelector = currentSelector.Next(new Selector(item[2], item[3]));
						items.push(currentSelector);
					}
				}
			}
			else{
				currentSelector = new Selector(item[2], item[3]);
				items.push(currentSelector);
			}
		}
		return items;
	}	
}

Selector.first = function(txt){
	if (txt){
		var items = Selector.parse(txt);
		return items[0];
	}	
}
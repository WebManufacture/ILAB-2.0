Selector = function(str){
	this.source = "";
	if (str && typeof str == "string") {
		var item;
		var regex = /([/>\s]?)([#.:]?)([\w\*-]+)/ig;
		while((item = regex.exec(str)) != null){
			if (item[1] == ""){
				this.Add(item[2], item[3]);
			}
			else{
				if (item[1] == " "){
					this.Follow(new Selector(str.substr(item.index + 1)));
					break;
				}
				if (item[1] == "/" || item[1] == ">"){
					this.Next(new Selector(str.substr(item.index + 1)));
					break;
				}
			}
		}
	}
}

Selector.prototype = {
	identify : function(type, object){
		if (type == "" && !this.item){
			this.type = object;
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
				if (this.tags.indexOf(" ") == 0){
					this.tags = this.tags.replace(" ", '');
				}
			}
		}
	},
	
	Add : function(type, object){
		if (typeof type != "string") return;
		if (!object && type.length >= 1){
			object = type.substr(1);
		}
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
				currentSelector = new Selector();
				currentSelector.Add(item[2], item[3]);
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
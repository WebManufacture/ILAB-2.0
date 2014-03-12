global.Channel = function(route){
	this.name = route;
	this.routes = { $path : "/" };
}

//Channel.RegExp = /^((?:(?:[a-z\d\-_*])*\/?)*)?([<>])?(#[a-z\d\-_]+)?((?:\.[a-z\d\-_]+)*$)/;
//Channel.RegExp.compile();

Channel.RouteNode = function(route){
	route = route.replace(/\$/ig, ""); //Чтобы предотвратить перезапись внутренних функций в узлах
	this.source = route;
	this.type = "*";
	this.tags = [];
	this.components = [];
	if (route){
		route = route.split(".");
		if (route.length > 0){
			if (route[0] != ""){
				this.type = route[0].toLowerCase();
			}
			route.shift();
			this.components.push(this.type);
			var i = 0;
			while (i < route.length){
				if (route[i] == ""){
					route.splice(i, 1);
				}
				else{
					route[i] = route[i].toLowerCase();
					this.components.push("." + route[i]);
					i++;	
				}
			}
			this.tags = route;
		}
	}
	this.is = function(other){
		if (other.type != "*" && other.type != this.type) {
			return false;
		}
		for (var i = 0; i < other.tags.length; i++){
			if (this.source.indexOf("." + other.tags[i]) < 0){
				return false;
			}
		}
		return true;
	};
	this.setType = function(otherType){
		this.type = otherType;
		if (this.components.length > 0) this.components[0] = otherType;
	};
};

Channel.RouteNode.prototype.toString = function(){
	var str = this.type;
	if (this.tags.length > 0){
		str += "." + this.tags.join(".");
	}
	return str;
};

Channel.Route = function(route){
	if (!route || route == "") return null;
	if (typeof route != "string"){
		route.push(0);
	}
	if (route.indexOf("/") != 0){
		route = "/" + route;	
	}
	this.source = route;
	this.nodes = route.split("/");
	this.nodes.shift();
	this.components = [];
	for (var i = 0; i < this.nodes.length; i++){
		if (this.nodes[i] == "") this.nodes[i] = "*";
		this.nodes[i] = new Channel.RouteNode(this.nodes[i]);
		this.components = this.components.concat(this.nodes[i].components);
	}
	
};

Channel.Route.prototype = {
	clone : function(){
		var newRoute = new Channel.Route(this.source);
		for (var item in this){
			if (item != "source" && item != "nodes" && item != "components" && !Channel.Route.prototype[item]){
				newRoute[item] = this[item];
			}
		}
		return newRoute;
	},
	
	is : function(other){
		other = Channel.ParsePath(other);
		thisRoute = Channel.ParsePath(this.source);
		if (thisRoute.nodes.length < other.nodes.length) {
			return false;
		}
		for (var i = 0; i < other.nodes.length; i++){
			if (!thisRoute.nodes[i].is(other.nodes[i])) return false;
		}
		return true;
	}
}


Channel.Route.prototype.toString = function(index){
	var str = "";
	index = parseInt(index);
	if (!isNaN(index) && index >= 0 && index < this.nodes.length){
		for (var i = index; i < this.nodes.length; i++){
			str += "/" + this.nodes[i].toString();
		}
	}
	return str;
};

		

//ChannelMessage.RegExp = /^((?:(?:[a-z\d\-_])*\/?)*)?(#[a-z\d\-_]+)?((?:\.[a-z\d\-_]+)*$)/;
//ChannelMessage.RegExp = /^((?:(?:[a-z\d\-_])*(?:\.[a-z\d\-_]+)*\/?)*)?$)/;
//ChannelMessage.RegExp.compile();
	
Channel.ParsePath = function(route){
	if (!route) return null;
	if (typeof route == "string") return new Channel.Route(route);
	if (typeof route == "object"){
		if (route instanceof Channel.RouteNode){
			return new Channel.Route(route);
		}		
		if (route instanceof Channel.Route){
			return route;
		}
	}
	return null;
}

Channel.prototype.once = Channel.prototype._single = function(path, callback){
	callback.callMode = "single";
	return this.on(path, callback);
}

Channel.prototype.on = Channel.prototype.for = Channel.prototype.subscribe = Channel.prototype.add = Channel.prototype._addListener = function(route, callback){
	route = Channel.ParsePath(route);
	if (!route) return null;
	if (!callback) return null;
	callback.id = (Math.random() + "").replace("0.", "handler");
	var path = [];
	var root = this._createRoute(this.routes, route, path);
	if (root && path.length > 0){
		var result = true;
		for (var i = 0; i < path.length; i++){
			var tunnels = path[i]["$tunnels"];
			if (tunnels){
				var j = 0;
				var param = { source: route.source, path : path[i].$path, current : route.source.replace(path[i].$path, "") };
				while (j < tunnels.length){
					var res = tunnels[j].call(route, param);
					if (res == null){
						tunnels.splice(j, 1);
					}
					else
					{
						if (res == false){
							result = false;
							break;
						}
					}
					j++;
				}
				if (result == false) break;
			}
		}
		if (result){
			return this._addRouteHandler(root, callback);
		}
	}
	return null;
};
		
Channel.prototype._addRouteHandler = function(root, callback){
	if (!root) return null;
	if (!callback) return null;
	if (root) {
		if (!root["."]){
			root["."] = [];
		}
		root["."].push(callback);
		return callback;
	}	
	return null;
};

Channel.prototype._getRoute = function(root, route, path){
	if (!root) return null;
	if (!route) return null;	
	var nodes = route.components;
	for (var i = 0; i < nodes.length; i++){
		var inner = root[nodes[i]];
		if (!inner){
		    return null;
		}	
		if (path) path.push(inner);
		root = inner;
	}
	return root;
};		

Channel.prototype._createRoute = function(root, route, path){
	if (!root) return null;
	if (!route) return null;
	var nodes = route.components;
	var itemsPath = "";
	for (var i = 0; i < nodes.length; i++){
		if (nodes[i].length == 0) continue;
		if (nodes[i][0] == "."){
				itemsPath += nodes[i];
			}
			else{
				itemsPath += "/" + nodes[i];
			}
		var inner = root[nodes[i]];
		if (!inner){
			inner = root[nodes[i]] = {  };
			inner.$path = itemsPath;
		}	
		if (path) path.push(inner);
		root = inner;
	}
	return root;
};


Channel.prototype.tunnelTo = function(route, callback){
	route = Channel.ParsePath(route);
	if (!route) return null;
	if (!callback) return null;
	var root = this._createRoute(this.routes, route)
	if (root){
		if (!root['$tunnels']){
			root['$tunnels'] = [];
		}
		root['$tunnels'].push(callback);
		return root;
	}
	return null;
};

Channel.prototype.clear = Channel.prototype._removeListeners = function(route, handler){
	route = Channel.ParsePath(route);
	if (!route) return null;
	if (route.nodes.length == 0) return null;
	return this._removeHandler(this._getRoute(this.routes, route), handler);
};

Channel.prototype._removeHandler = function(root, handler){
	if (!root) return null;
	if (!root["."]) return false;
	var i = 0;
	if (handler){
		var handlers = root["."];
		while (i < handlers.length){
			if (typeof handler == "function"){
				if (handlers[i] == handler){
					handlers.splice(i, 1);
					continue;
				}		
			}
			if (typeof handler == "string"){
				if (handlers[i].id == handler){
					handlers.splice(i, 1);
					continue;
				}	
			}
			i++;	
		}		
	}
	else{
		root["."] = [];
	}
	return true;
};


Channel.prototype._removeRoute = function(root, nodes){
	if (!root) return null;
	if (!nodes) return null;
	if (nodes.length == 0){
		return true;	
	}
	for (var i = 0; i < nodes.length; i++){
		var inner = root[nodes[i]];
		if (inner) {
			if (this._removeRoute(inner, nodes.slice(0, i).concat(nodes.slice(i+1)), args)){
				delete root[nodes[i]];
			}			
		}
	}
	return false;
};


Channel.prototype.emit = function(route){
	var route = Channel.ParsePath(route);
	if (!route) return;
	if (route.nodes.length == 0) return null;
	route.id = (Math.random() + "").replace("0.", "");
	var root = this.routes;
	route.callplan = [];
	var count = this._sendMessage(root, route, 0, arguments);
	for (var i = route.callplan.length - 1; i >= 0; i--){
		route.callplan[i]();
	}
	return count;
}; 

Channel.prototype._sendMessage = function(root, route, nodeIndex, args){
	if (!root) return null;
	if (!route) return null;	
	var counter = 0;
	if (nodeIndex < route.nodes.length){
		var node = route.nodes[nodeIndex];
		counter += this._sendInternal(root[node.type],  nodeIndex, route, node.tags, args);
		counter += this._sendInternal(root["*"],  nodeIndex, route, node.tags, args);
	}
	return counter;
};

Channel.prototype._sendInternal = function(root, nodeIndex, route, tags, args){
	if (!root) return null;
	if (!tags) return null;
	var param = { source: route.source, path : root.$path, current : route.toString(nodeIndex + 1), timestamp: (new Date()).valueOf(), id : route.id };
	//console.log(param);
	var counter = this._callHandlers(root["."], route, param, args);
	if (counter > 0){
		//console.log(root.$path.warn);
	}
	else{	
		//console.log(root.$path);
	}
	for (var i = 0; i < tags.length; i++){
		if (tags[i] == "") continue;
		var inner = root["." + tags[i]];
		if (inner) {
			counter += this._sendInternal(inner, nodeIndex, route, tags.slice(0, i).concat(tags.slice(i+1)), args);
		}
	}	
	counter += this._sendMessage(root, route, nodeIndex + 1, args);
	return counter;
};

Channel.prototype._callHandlers = function(handlers, route, param, args){
	var counter = 0;
	if (handlers){
		var i = 0;
		while (i < handlers.length){
			if (handlers[i] != null){
				counter++;
				this._callHandlerAsync(route, handlers[i], param, args);
				if (handlers[i].callMode && handlers[i].callMode == "single"){
					handlers[i] = null;
					handlers.splice(i, 1);
				}
				else{
					i++;	
				}
			}
		}
	}
	return counter;
}

Channel.prototype._callHandlerAsync = function(route, callback, param, args){
	var channel = this;	
	var param1 = args[1];
	var param2 = args[2];
	var param3 = args[3];	
	var param4 = args[4];
	var param5 = args[5];
	function callCallback(){
		if (channel == global.Channels){
			return callback.call(route, param, param1, param2, param3, param4, param5);
		}
		else{
			return callback.call(channel, param, param1, param2, param3, param4, param5);
		}
	}
	if (route.callplan){
		route.callplan.push(callCallback);
	}
	else{
		setTimeout(callCallback, 2);
	}
}


global.Channels = new Channel("/");


module.exports = global.Channels;
		
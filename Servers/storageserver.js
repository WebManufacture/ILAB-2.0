var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
require(Path.resolve("./ILAB/Modules/Utils.js"));
require(Path.resolve("./ILAB/Modules/Selectors.js"));
var Storage = require(Path.resolve("./ILAB/Modules/Storage.js"));
var Auth = require(Path.resolve("./ILAB/Modules/Auth.js"));


StorageServer = function(config, router){
	this.userStorages = {};
	this.sessionStorages = {};
	this.siteStorages = {};
	this.storagesPath = Path.dirname(config.Storage);
	this.ServerStorage = new Storage(config.Storage, true);
	this.auth = Auth(config.AuthStorage);
};
	
StorageServer.prototype = {
	GET : function(req, res, url, fullData){
		function finish(code, text, ctype){
			if (typeof(text) != 'string'){
				text = JSON.stringify(text);
				if (!ctype) ctype = "text/json";
			}
			else{
				if (!ctype) ctype = "text/plain";
			}
			if (ctype){
				res.setHeader("Content-Type", ctype);
			}
			res.statusCode = code;
			res.end(text);
		}
		function toArray(obj){
			var arr = [];
			try{
				for (var item in obj){
					var o = JSON.parse(JSON.stringify(obj[item]));
					o.id = item;
					arr.push(o);
				}
			}
			catch(e){
				console.error("U: " + obj[item]);
			}
			return arr;
		}
		var storage = this._getStorage(req, url);
		if (!storage){
			finish(403, "You are have no rights for use this storage!");
			return;
		}
		finish(200, storage.layers);
	},	
	POST : function(req, res, url, fullData){		
		function finish(code, text, ctype){
			if (typeof(text) != 'string'){
				text = JSON.stringify(text);
				if (!ctype) ctype = "text/json";
			}
			else{
				if (!ctype) ctype = "text/plain";
			}
			if (ctype){
				res.setHeader("Content-Type", ctype);
			}
			res.statusCode = code;
			res.end(text);
		}
		function toArray(obj){
			var arr = [];
			try{
				for (var item in obj){
					var o = JSON.parse(JSON.stringify(obj[item]));
					o.id = item;
					arr.push(o);
				}
			}
			catch(e){
				console.error("U: " + obj[item]);
			}
			return arr;
		}
		if (fullData){
			var data = JSON.parse(fullData);
		}
		try{
			var storage = this._getStorage(req, url);
		}
		catch(err){
			console.error(JSON.stringify(err, ['stack', 'message', 'inner']));
			finish(500, JSON.stringify(err, ['stack', 'message', 'inner']), "text/json");
			return;
		}
		if (!storage){
			finish(403, "You are have no rights for use this storage!");
			return;
		}
		var action = url.query.action;
		if (!action){
			finish(500, "Invalid params: missing action");
			return;
		}
		var selector = url.query.selector;
		try{
			if (storage[action])
			{
				var obj = storage[action](selector, data);
				if(obj){
					finish(200, JSON.stringify(obj));
				}
				else{
					finish(404, "null", "text/json");
				}
				return;
			}
			finish(500, "Invalid action");
		}
		catch(error){
			finish(500, JSON.stringify(error, ['stack', 'message', 'inner']), "text/json");
		}
	},
	
	_getStorage : function(req, url){
		console.log(url.pathname);
		var cookie = url.query["auth-parameters"];
		if (cookie){
			try{
				cookie = JSON.parse(cookie);
			}
			catch(e){
				cookie = null;
				console.error("Cannot parse cookie!");
				console.log(cookie);
			}
		} 
		var serv = this;		
		if (url.pathname == "/Session/"){
			if (cookie){
				var user = cookie;
				var skey = user.SessionKey;
				if (!this.auth.GetUserBySession(skey)){
					if (this.sessionStorages[skey]){
						Storage.Delete(this.sessionStorages[skey]);
						delete this.sessionStorages[skey];
					}
					return null;
				}
				else{
					if (!this.sessionStorages[skey]){
						var storage = this.sessionStorages[skey] = new Storage(this.storagesPath + "/Sessions/" + skey + ".json", true);
						function checkStorage(){
							if (!serv.auth.GetUserBySession(skey)){
								Storage.Delete(serv.sessionStorages[skey]);
								delete serv.sessionStorages[skey];
							}
							else{
								setTimeout(checkStorage, 30000);
							}
						}
						setTimeout(checkStorage, 30000);
					}				
					return this.sessionStorages[skey];
				}
			}
			return null;
		}
		if (url.pathname == "/Site/"){
			var site = req.getHeader("Origin");			
			if (site){
				if (!this.siteStorages[site]){
					var storage = this.siteStorages[site] = new Storage(this.storagesPath + "/Sites/" + site.replace(/\//ig, "").replace(/:/ig, "-") + ".json", true);
				}
				return this.siteStorages[site];
			}
			return null;
		}
		if (url.pathname == "/User/"){
			if (cookie){
				var userParam = cookie;
				var user = this.auth.GetUser(userParam.Login);
				if (user && userParam.SessionKey == user.sessionKey){
					if (!this.userStorages[user.login]){
						var storage = this.userStorages[user.login] = new Storage(this.storagesPath + "/Users/usr_" + user.login + ".json", true);
					}					
					return this.userStorages[user.login];
				}else{
					console.warn("Unauthorized access to the UserStorage!");
					console.log(userParam);
					console.log(user);
				}		
			}
			return null;
		}
		return this.ServerStorage;		
	}
}

module.exports = function(config){
	return new StorageServer(config);
}

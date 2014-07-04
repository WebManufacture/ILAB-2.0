var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
require(Path.resolve("./ILAB/Modules/Utils.js"));
require(Path.resolve("./ILAB/Modules/Selectors.js"));
var Storage = require(Path.resolve("./ILAB/Modules/Storage.js"));
var Auth = require(Path.resolve("./ILAB/Modules/Auth.js"));


StorageServer = function(config, router){
	var userStorages = {};
	var sessionStorages = {};
	var siteStorages = {};
	this.ServerStorage = new Storage(config.Storage, true);
	this.auth = Auth(config);
};
	
StorageServer.prototype = {
	POST : function(req, res, url, fullData){
		res.setHeader("Access-Control-Allow-Headers", "auth-parameters");
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
		var storage = this._getStorage(req, url);
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
		var cookie = req.headers["auth-parameters"];
		var serv = this;
		console.log(cookie);
		if (url.pathname == "/Session/"){
			if (cookie){
				var user = JSON.parse(cookie);
				var skey = user.SessionKey;
				if (!this.auth.GetSession(skey)){
					if (this.sessionStorages[skey]){
						Storage.Delete(this.sessionStorages[skey]);
						delete this.sessionStorages[skey];
					}
					return null;
				}
				else{
					if (!this.sessionStorages[skey]){
						var storage = this.sessionStorages[skey] = new Storage("./Storage/" + skey + ".json", true);
						function checkStorage(){
							if (!serv.auth.GetSession(skey)){
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
					var storage = this.siteStorages[site] = new Storage("./Storage/" + site.replace(/\//ig, "").replace(/:/ig, "-") + ".json", true);
				}
				return this.siteStorages[site];
			}
			return null;
		}
		if (url.pathname == "/User/"){
			if (cookie){
				var userParam = JSON.parse(cookie);
				var user = this.auth.GetSession(userParam.SessionKey);
				if (user && userParam.Login == user.login){
					if (!this.userStorages[user.login]){
						var storage = this.userStorages[user.login] = new Storage("./Storage/usr_" + user.login + ".json", true);
					}					
					return this.userStorages[user.login];
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

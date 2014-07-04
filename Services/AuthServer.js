var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
var crypto = require('crypto');
require(Path.resolve("./ILAB/Modules/Utils.js"));
require(Path.resolve("./ILAB/Modules/Selectors.js"));
var Storage = require(Path.resolve("./ILAB/Modules/Storage.js"));
var Auth = require(Path.resolve("./ILAB/Modules/Auth.js"));


AuthServer = function(config, router){
	this.auth = Auth(config);
};
	
AuthServer.prototype = {	
	GET: function(req, res, url, fullData){	
		var auth = this.auth;
		var login = url.query.login;
		function finish(code, text){
			res.statusCode = code;
			res.end(text);
		}
		var user = auth.GetUser(login)
		if (!user){
			res.setHeader("set-cookie", "RandomKey=null");
			res.setHeader("set-cookie", "UserName=null");
			finish(404, "User not found!");
			return true;
		};
		var hash = url.query.hash;
		var key = url.query.key;

		var date = new Date(new Date().toUTCString());
		date = date.getTime();
		date = Math.floor(date/60000) * 60000;

		if (key){
			key = auth.AuthByKey(key, user, date);
			if (key){
				res.setHeader("Set-Cookie", "RandomKey=" + user.randomKey + "; Expires=" + (new Date((new Date()).valueOf() + 60000)).toUTCString());
				res.setHeader("Set-Cookie", "UserName=" + user.login);
				finish(200, key);
			}
			else{
				res.setHeader("set-cookie", "RandomKey=null");
				res.setHeader("set-cookie", "UserName=null");
				finish(403, "Invalid session key! " + key + " " + user.sessionKey);	
			};
			return true;
		};

		if (hash){
			key = auth.AuthByHash(hash + "", user, date)
			if (key){
				res.setHeader("Set-Cookie", "RandomKey=" + user.randomKey + "; Expires=" + (new Date((new Date()).valueOf() + 60000)).toUTCString());
				res.setHeader("Set-Cookie", "UserName=" + user.login);
				finish(200, key);
			}
			else{
				res.setHeader("set-cookie", "RandomKey=null");
				res.setHeader("set-cookie", "UserName=null");
				finish(401, "Invalid hash! " + hash + " " + user.pass + " " + date);				
			};
			return true;
		};		
		res.setHeader("set-cookie", "RandomKey=null");
		res.setHeader("set-cookie", "UserName=null");
		finish(403, "Invalid auth params");
		return true;
	},
	
	POST : function(req, res, url, fullData){
		var auth = this.auth;
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
		var action = url.query.action;
		if (!action){
			finish(500, "Invalid params: missing action");
			return;
		}
		var selector = url.query.selector;
		if (!selector){
			finish(500, "Invalid params: missing selector");
			return;
		}
		try{
			selector = Selector.first(selector);
			if (action == "all"){
				finish(200, JSON.stringify(auth.all(selector)));
				return;
			}
			if (action == "get"){
				var obj = auth.get(selector);
				if(obj){
					finish(200, JSON.stringify(obj));
				}
				else{
					finish(404, "null", "text/json");
				}
				return;
			}
			if (action == "add"){
				var obj = auth.add(selector, data);
				if(obj){
					finish(200, JSON.stringify(obj));
				}
				else{
					finish(404, "null", "text/json");
				}
				return;
			}
			if (action =="del"){
				var obj = auth.del(selector, data);
				if(obj){
					finish(200, JSON.stringify(obj));
				}
				else{
					finish(404, "null", "text/json");
				}
				return;
			}
			if (action == "set"){
				var obj = auth.set(selector, data);
				if(obj){
					finish(200, JSON.stringify(obj));
				}
				else{
					finish(404, "null", "text/json");
				}
				return;
			}/*
			if (selector.item == 'user')
			{
				if (action == "add"){
					if (selector.id){
						if (!this.Users[selector.id]){
							this.Users[selector.id] = data;
							this.storage.add(selector, data);
							this.Save();
							finish(200, data);
						}
						else{
							finish(500, "Exists");
						}
					}
					else{
						finish(500, "Invalid params: missing id");
					}
					return;
				}
				if (action == "del"){
					if (selector.id){
						if (this.Users[selector.id]){
							delete this.Users[selector.id];
							this.storage.del(selector, data);
							this.Save();
							finish(200, data);
						}
						else{
							finish(404, "Not found");
							return;
						}
					}
					else{
						finish(500, "Invalid params: missing id");
					}
					return;
				}
				if (action == "set"){
					if (selector.id){
						this.Users[selector.id] = data;
						this.storage.set(selector, data);
						this.Save();
						finish(200, data);
					}
					else{
						finish(500, "Invalid params: missing id");
					}
					return;
				}
				finish(500, "Invalid params: unknown action");
				return;
			}*/
			finish(500, "Invalid action");
		}
		catch(error){
			finish(500, JSON.stringify(error, ['stack', 'message', 'inner']), "text/json");
		}
		
	}
}

module.exports = function(config){
	return new AuthServer(config);
}

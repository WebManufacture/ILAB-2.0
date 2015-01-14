useModule("Utils.js");
var url = require('url');
var crypto = require('crypto');
var Path = require('path');
var EventEmitter = require("events").EventEmitter;
useModule("Logger.js");
var Storage = useModule("Storage.js");

function Auth(config){
	if (typeof config == "object") config = config.Storage;
	var storage = this.storage = new Storage(config);
	this.add = CreateClosure(this.storage.add, this.storage);
	this.all = CreateClosure(this.storage.all, this.storage);
	this.get = CreateClosure(this.storage.get, this.storage);
	this.set = CreateClosure(this.storage.set, this.storage);
	this.del = CreateClosure(this.storage.del, this.storage);
};

Inherit(Auth, EventEmitter, {	
	Save : function(){
		this.storage._save();
	},

	GetUserBySession : function(key) {
		if (!key) {
			return null;
		};
		var session = this.storage.get("session#" + key);
		if (session){
			var uid = session._parentID;
			if (uid) return this.storage.getByKey(session._parentID);
		} 
		return null;
	},
	
	GetUser : function(login) {
		if (!login)  {
			return null;
		};
		return this.storage.get("user#" + login);
	},
	
	AuthByKey : function(key, user, date){
		if (key == user.sessionKey){
			if(date - user.lastAuthTime > 60000){
				this.RemoveSession(user);
				return null;
			};
			return this.UpdateData(user, date, user.sessionKey);
		};
		return null;
	},
	
	AuthByHash : function(userHash, user, date){
		var hashAlg = crypto.createHash('sha1');
		hashAlg.update(user.pass  + ' ' + date);
		var hashString = hashAlg.digest('hex') + "";		
		//log("User: " + user.login + " date: " + date + " Hash: " + hashString + " UserHash: " + userHash);
		if (userHash == hashString){
			return this.UpdateData(user, date);	
		};
		return null;
	},
	
	RemoveSession : function(user){
		if (user.sessionKey){
			delete user.childs;
			user.sessionKey = null;
		}
		this.Save();
	},
	
	
	UpdateData : function(user, date, sessionKey){
		var rKey = (Math.random() + "").replace("0.", "");
		console.log("rKey " + rKey);
		user.randomKey = rKey;
		user.lastAuthTime = date;
		if (!sessionKey){
			sessionKey = "";
			for (var i = 0; i < 120; i++){
				sessionKey += Math.floor(Math.random(16)*16).toString(16);
			}
		}
		user.sessionKey = sessionKey;
		user.childs = [ {type: "session", id : sessionKey } ];
		this.Save();
		return sessionKey;
	}
});

module.exports = function(config){
	if (!global.Auth) global.Auth = new Auth(config);
	return global.Auth;
}


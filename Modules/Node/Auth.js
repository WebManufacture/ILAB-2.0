var url = require('url');
var crypto = require('crypto');
ObjectID = require('mongodb').ObjectID;
var Path = require('path');
require(Path.resolve("./Modules/Node/Mongo.js"));
require(Path.resolve("./Modules/Node/Logger.js"));

module.exports = function(config){
	if (!config.dbname) config.dbname = "Accounts";
	if (config.dbconf){
		replicaSet(config.dbconf, config.dbname, function(err, database){
			if (err){
				error(err);	
			}
			Auth.db = database;
		});
	}
	else{
		if (!config.dbhost) config.dbhost = "127.0.0.1";
		if (!config.dbport) config.dbport = 20000;
		replicaSet([{host : config.dbhost, port : config.dbport}], config.dbname, function(err, database){
			if (err){
				error(err);	
			}
			Auth.db = database;
		});
	}
	
	return AuthRouter;
};

module.exports.Auth = Auth = {	
	RetreiveUser : function(key, callback) {
		if (!key) {
			callback(null);
			return null;		
		}
		Auth.db.collection('users').findOne({ sessionKey: key }, function(err, user){
			if (err){
				log.error(err, "/Auth");
				callback(null);
				return;
			};
			if (!user){
				callback(null);
				return;
			};
			
			var date = new Date();
			date = date.getTime();
			date = Math.floor(date/60000) * 60000;
			if(date - user.lastAuthTime > 60000){
				Auth.RemoveSession(user);
				user.sessionKey = null;
			};
			callback(user);
		});
	},		
	
	AuthByKey : function(key, user, date){
		if (key == user.sessionKey){
			if(date - user.lastAuthTime > 60000){
				Auth.RemoveSession(user);
				return null;
			};
			return Auth.UpdateData(user, date, user.sessionKey);
		};
		return null;
	},
	
	AuthByHash : function(userHash, user, date){
		var hashAlg = crypto.createHash('sha1');
		hashAlg.update(user.pass  + ' ' + date);
		var hashString = hashAlg.digest('hex') + "";		
		//log("User: " + user.login + " date: " + date + " Hash: " + hashString + " UserHash: " + userHash);
		if (userHash == hashString){
			return Auth.UpdateData(user, date);	
		};
		return null;
	},
	
	RemoveSession : function(user){
		Auth.db.collection('users').update({_id: user['_id']}, {$set : {sessionKey: null}});
	},
	
	
	UpdateData : function(user, date, sessionKey){
		var rKey = (Math.random() + "").replace("0.", "");
		console.log("rKey " + rKey);
		user.randomKey = rKey;
		user.lastAuthTime = date;
		var	obj = {$set : {lastAuthTime: date, randomKey : rKey}};
		if (!sessionKey){
			sessionKey = "";
			for (var i = 0; i < 120; i++){
				sessionKey += Math.floor(Math.random(16)*16).toString(16);
			}
			obj.$set.sessionKey = sessionKey;
		}
		Auth.db.collection('users').update({_id: user['_id']}, obj);
		user.sessionKey = sessionKey;
		return sessionKey;
	},
};

AuthRouter = {
	GET : function(context){
		var url = context.url;		
		var login = url.query.login;
		
		Auth.db.collection('users').findOne({ login: login }, function(err, user){
			if (err){
				log.error(err, "/Auth");
				context.finish(500, err);
				return;
			};
			if (!user){
				context.finish(404, "User not found!");
				return;
			};
			var hash = url.query.hash;
			var key = url.query.key;
			
			var date = new Date(new Date().toUTCString());
			date = date.getTime();
			date = Math.floor(date/60000) * 60000;
			
			if (key){
				key = Auth.AuthByKey(key, user, date);
				if (key){
					context.res.setHeader("Set-Cookie", "RandomKey=" + user.randomKey + "; Expires=" + (new Date((new Date()).valueOf() + 60000)).toUTCString());
					context.finish(200, key);
				}
				else{
					context.res.setHeader("set-cookie", "RandomKey=null");
					context.finish(403, "Invalid session key!");	
				};
				return true;
			};
			
			if (hash){
				key = Auth.AuthByHash(hash + "", user, date)
				if (key){
					context.res.setHeader("Set-Cookie", "RandomKey=" + user.randomKey + "; Expires=" + (new Date((new Date()).valueOf() + 60000)).toUTCString());
					context.finish(200, key);
				}
				else{
					context.res.setHeader("set-cookie", "RandomKey=null");
					context.finish(401, "Invalid hash!");				
				};
			};		
			context.res.setHeader("set-cookie", "RandomKey=null");
			context.finish(403, "Invalid auth params");
			return;
		});
		return false;
	}
};

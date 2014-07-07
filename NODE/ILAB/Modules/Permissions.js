
var log = useModule("log.js").info;
log.error = useModule("log.js").error;
log.debug = useModule("log.js").debug;
log.info = log;

var https = require('https');
var Url = require('url');
var paths = require('path');
var fs = require("fs");

try{	
	useModule('Mongo.js');
	var server = useModule("DBServer.js");
	
	function InitDB(){
		//Подключаем базу данных
		replicaSet([{host: "127.0.0.1", port : 20000}], "jasp", function(error, database){
			err = error;
			db = database;
			server = new server(db, "permissions");
		});
	}
	
	InitDB();
	
	options = {
		pfx : fs.readFileSync('SSLCert.pfx'),
		passphrase : "Mirror@SSL"
	}
	 
	
	https.createServer(options,
		function(req, response) {
			server.ProcessRequest(req, response);
		}
	).listen(443);
	
	log.info("Server created on <a href='https://web-manufacture.net'>https://web-manufacture.net</a>");
	
	
	function Combo(callback) {
		this.callback = callback;
		this.items = 0;
		this.results = [];
	}
	
	Combo.prototype = {
		add: function () {
			var self = this;	
			this.items++;
			return function () {
				self.check(self.items - 1, arguments);
			};
		},
		check: function (id, arguments) {
			this.results[id] = arguments;
			this.items--;
			if (this.items == 0) {
				this.callback.call(this, this.results);
			}
		}
	};
	
	jasp = {};
	
	/*
{
_id : "",
classes : [ "", ""];
tags : [ "", "" ];
//refs : [ "", "" ];
type : "",
objectType : "",
contentType : "",
name : "",
path : "",
content : ""
}

{
_id : "",
allow : { "groupName" : "GET SET ADD" },	
deny : { "groupName" : "permissionsLevel" },	
path : "",
}
*/
	jasp.CheckUserGroups = function(permissObj, method, user){
		if (user.isSupermaster){
			return true;
		}
		var isAllowed = "inherit";
		if (user){		
			var generalAllow = result.allow["*"];
			if (generalAllow && generalAllow.indexOf(method) >= 0){
				return "allowed";
			}
			for (var i = 0; i < user.groups.length; i++){
				var userGrp = user.groups[i];		
				var allowGrp = result.deny[userGrp];
				var denyGrp = result.deny[userGrp];
				if (denyGrp && denyGrp.indexOf(method) >= 0){
					return "denied";
				}
				if (allowGrp && allowGrp.indexOf(method) >= 0){
					isAllowed = "allowed";
				}
			}
		}
		else{
			generalDeny = result.deny["?"];
			if (generalDeny && generalDeny.indexOf(method) >= 0){
				return "denied";
			}
		}
		return isAllowed;
	};
	
	jasp.CheckPermissions = function(req, res, successCallback){
		var combo = new Combo(successCallback);
		var path = "/";
		var method = " " + req.method + " ";
		for (var i = 0; i < req.paths.length; i++){
			path += "/" + req.paths[i];
			var comboFunc = combo.add();
			var callback = function(err, result){
				if (err){
					res.finish(500, "Permissions getting in " + path + " error " + err);
					return;
				}
				if (result){
					result.authorizeResult = jasp.CheckUserGroups(result, method, Auth.User);
				}
				comboFunc(result);
			}
				db.collection("permissions").findOne({ path : path }, callback);
		};	
	}
	
	
}
catch(err){
	log.error(err);
	process.exit();
}
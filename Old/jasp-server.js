var http = require('http');
var Url = require('url');
//var Auth = require('./Auth.js');

console.log(process.createChildProcess);

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

http.createServer(
  function(req, response) {
	  var url = Url.parse(req.url);
	  response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Access-Control-Allow-Methods", "POST,GET,PUT,DELETE,HEAD,OPTIONS");
      response.setHeader("Access-Control-Request-Header", "X-Prototype-Version, x-requested-with");
	  response.setHeader("Content-Type", "text/html");
	  req.setEncoding("utf8");
	  if (request.method == 'HEAD' || request.method == "OPTIONS"){
		res.finish = function(status, result){
			if (this.finished) return;
			this.finished = true;
			this.writeHead(status, result);
			this.end();
		}
	  }
	  else{
		res.finish = function(status, result){
			if (this.finished) return;
			this.finished = true;
			if (status == 200){
				this.status = 200;
				this.end(result);
				return;
			}
			this.writeHead(status, result);
			this.end();
		}
	  }
	  jasp.ProcessRequest(url, req, response);
  }
).listen(8000);

jasp = Jasp = {};

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

jasp.ProcessRequest = function(url, req, res){
	if (jasp.CheckMethod(req.method)){
	 	req.paths = url.pathname.split('/');
		req.paths.shift();
		
		if (req.method == "PERMISSIONS"){
			jasp.PERMISSIONS(url, req, response);
		}
		else{
			var method = jasp[req.method];
			jasp.CheckPermissions(req.paths, res, function(permissions){
				/*if (result.authorizeResult == "denied"){
					res.finish(403, "Access to " + result.path + " by method " + method + " forbidden for " + Auth.User.Login);
					return;
				}*/
				method(url, req, response, permissions);
			});
		}
	}
	else{
		response.finish(501, "Method " + req.method + " not inmplemented by this server");
	}
};

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

jasp.CheckMethod = function(method){
	return typeof jasp[method] == 'function';
};


jasp.OPTIONS = function(url, req, res){
	res.finish(200);
};

jasp.GET = Jasp.HEAD = function(url, req, res){	
	db.collection("objects").findOne({ path : url.pathname }, function(err, result){
		if (err){
			res.writeHead(500);
			res.end("Collection " + req.paths[0] + " error " + err);
			return;
		}
		if (!result){
			res.writeHead(404);
			res.end("Content " + url.pathname + " not found");
			return;
		}
		res.writeHead(200);
		res.end(result.content + "");
	});
	return;
}


jasp.BROWSE = function(url, req, res, permissions){
	db.collection("objects").find({ path : url.pathname}).toArray(function(err, result){
		if (err){
			res.finish(500, " " + url.pathname + " error " + err);
			return;
		}
		if (result){
			result = { objects : result, permissions : permissions };
		}
		else{
			result = { objects : null, permissions : permissions };
		}		
		res.finish(200, result.toSource() + "");
	});
}

jasp.PUT = function(url, req, res){
	req.on("data", function(data){
		var doc = { path : url.pathname, content : data, type: "string", objectType : "HTMLPage", contentType : "text/html" };
		db.collection("objects").save(doc, {safe : true}, function(err, result){
			if (err){
				res.finish(500, "Collection " + url.pathname + " error " + err);
				return;
			}
			res.finish(200);
		});
	});
	return;
}

jasp.SET = function(url, req, res){	
	/*
	req.objType = req.getHeader("object-type");
	if (req.objType){
		req.on("data", function(data){
			if (objType && objType = "object"){
				
			}
			else{
				var doc = { _id : req.objid, objType : req.objType, mimeType : req.mimeType, content : data };
			}
			db.collection(req.cname).save(doc, {safe : true}, function(err, result){
				if (err){
					res.finish(500, res.objid + " set error: " + err);
					return;
				}
				res.finish(200);
			});
		}
	}
	else{
		res.finish(500, "You can't SET unknown objects");
	}*/
	res.finish(500, "You can't SET unknown objects");
	return;
};

jasp.PERMISSIONS = function(url, req, res){	
	/*req.objType = req.getHeader("object-type");
	if (req.objType){
		req.on("data", function(data){
			if (objType && objType = "object"){
				
			}
			else{
				var doc = { _id : req.objid, objType : req.objType, mimeType : req.mimeType, content : data };
			}
			db.collection(req.cname).save(doc, {safe : true}, function(err, result){
				if (err){
					res.finish(500, res.objid + " set error: " + err);
					return;
				}
				res.finish(200);
			});
		}
	}
	else{
		res.finish(500, "You can't SET unknown objects");
	}*/
	res.finish(500, "You can't SET unknown objects");
	return;
};

//Подключаем модуль работы с Mongo
require('./Mongo.js');

function InitDB(){
	//Подключаем базу данных
	replicaSet([{host: "127.0.0.1", port : 20000}], "jasp", function(error, database){
		err = error;
		db = database;
	});
}

InitDB();



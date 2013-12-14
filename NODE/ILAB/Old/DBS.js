
var log = require("./log.js").info;
log.error = require("./log.js").error;
log.debug = require("./log.js").debug;
log.info = log;

var Url = require('url');
ObjectID = require('mongodb').ObjectID;
DBRef = require('mongodb').DBRef;

module.exports = function(db){
	var collection;
	
	this.finishHead = function(status, result){			
		if (this.finishCalled) return;
		this.finishCalled = true;
		this.writeHead(status, result + "");
		this.end();
	};
	
	this.finishBody = function(status, result){
		if (this.finishCalled) {
			return;
		}
		this.finishCalled = true;
		if (status == 200){
			this.statusCode = 200;				
			this.end(result + "");
			return;
		}
		this.writeHead(status);
		this.end(result + "");
	};
	
	this.ProcessResult = function(result){
		if (result){
			return JSON.stringify(result);
		}
		return JSON.stringify("{}");
	};
	
	this.ProcessRequest = function(req, res){
		try{
			log.debug(req.method + " " + req.url);
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "POST,GET,PUT,DELETE,HEAD,OPTIONS,SEARCH");
			res.setHeader("Access-Control-Request-Header", "X-Prototype-Version, x-requested-with");
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			req.setEncoding("utf8");
			if (req.method == 'HEAD' || req.method == "OPTIONS"){
				res.finish = this.finishHead;
			}
			else{
				res.finish = this.finishBody;
			}
			
			var url = Url.parse(req.url, true);
			
			if (this.CheckMethod(req.method)){
				req.paths = url.pathname.split('/');
				req.paths.shift();
				collection = req.paths[0];
				req.paths.shift();
				url.pathname = '/' + req.paths.join('/');
				req.paths.unshift(collection);
				req.paths = req.paths.join('/');
				
				var server = this;
				
				url.hasParams = false;
				var fObj = {};
				if (url.pathname != '/'){
					fObj.path = url.pathname;					
					url.hasParams = true;
				}
				for (var key in url.query){
					var value = url.query[key];
					if (key == "id" || key == "_id"){
						key = "_id";
						value = ObjectID(value);
						log(value);
					}
					/*
					if (key == 'DBRef'){
						value = DBRef(value['collection'], ObjectID(value['_id']));
						log('DBRef(' + value + ')');
					};
					*/
					
					fObj[key] = value;					
					url.hasParams = true;
				}
				
				
				url.searchObj = fObj;
				log(url.searchObj);
				this[req.method](url, req, res, server);

			}
			else{
				res.finish(501, "Method " + req.method + " not inmplemented by this server");
			}

		}
		catch (err){
			log.error(err);
			res.finish(500, "Unknown error: " + err);
		}
	};
	
	this.CheckMethod = function(method){
		return typeof this[method] == 'function';
	};
	
	this.OPTIONS = function(url, req, res){
		res.finish(200);
	};
	
	this.GET = this.HEAD = function(url, req, res, server){	
		db.collection(collection).findOne(url.searchObj , function(err, result){	
		//db.collection(collection).findOne({ _id: ObjectId(url.searchObj._id) }, function(err, result){
			if (err){
				res.finish(500, "Collection " + req.paths[0] + " error " + err);
				return;
			}
			if (!result){
				
				res.finish(404, "Content " + url.pathname + " not found");
				return;
			}
			res.finish(200, server.ProcessResult(result));
		});
		return;
	};
	
	
	this.DELETE = function(url, req, res){	
		db.collection(collection).remove(url.searchObj, function(err, result){
		//db.collection(collection).remove({ path : url.pathname }, function(err, result){
			
			if (err){
				res.finish(500, "Collection " + req.paths[0] + " error " + err);
				return;
			}
			res.finish(200, "");
		});
		return;
	};
	
	
	this.SEARCH = function(url, req, res, server){		
		var callback = function(err, result){
			if (err){
				res.finish(500, " " + url.pathname + " error " + err);
				return;
			}
			if (result){
				result = server.ProcessResult(result);
			}
			else{
				result = JSON.stringify("[]");
			}		
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.finish(200, result);
		}
		if (url.hasParams){
			db.collection(collection).find(url.searchObj).toArray(callback);
		}
		else{
			db.collection(collection).find().toArray(callback);
		}
	};
	
	this.POST = function(url, req, res){
		var fullData = "";
		req.on("data", function(data){
			fullData += data;		
		});
		req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				doc.path = url.pathname;				
				db.collection(collection).save(doc, {safe : true}, function(err, result){
					if (err){
						res.finish(500, "Collection " + url.pathname + " error " + err);
						return;
					}					
					res.finish(200, result);
				});
			}
			catch (err){
				log.error(err);
				res.finish(500, "Unknown error: " + err);
			}
		});
		return;
	};
	
	this.PUT = function(url, req, res){
		var fullData = "";
		req.on("data", function(data){
			fullData += data;		
		});
		req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				doc.path = url.pathname;				
				db.collection(collection).update(url.searchObj, {$set: doc}, function(err, result){
					if (err){
						res.finish(500, "Collection " + url.pathname + " error " + err);
						return;
					}					
					res.finish(200, result);
				});
			}
			catch (err){
				log.error(err);
				res.finish(500, "Unknown error: " + err);
			}
		});
		return;
	};
};
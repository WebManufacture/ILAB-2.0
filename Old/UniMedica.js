var log = require("./log.js").info;
log.error = require("./log.js").error;
log.info = log;
require('./Mongo.js');
var http = require('http');
var Url = require('url');
ObjectID = require('mongodb').ObjectID;

try{
	
	var server = require("./DBServer.js");
	
	function InitDB(){
		replicaSet([{host: "127.0.0.1", port : 20000}], "UniMedica3", function(error, database){
			err = error;
			db = database;
			server = new server(db, "specialists");
			//server.SEARCH = Tabs.SearchSort; //Подменяем метод SEARSH
			server.ProcessPath = Tabs.ProcessPath;
			Tabs.Start();
		});
	};
	
	InitDB();
	
	Tabs = {};
	
	Tabs.Start = function(){
		Tabs.Count();
		Tabs.GetRecords();
	};
	
	Tabs.Count = function(){
		db.collection('specialists').count(function(err, count){
			Tabs.RecordsQuantity = count; //Количество записей в базе
			Tabs.GetTabLength(count);
		});
	};
	
	Tabs.GetTabLength = function(count){
		Tabs.TabsQantity = 10; //Количество табов
		Tabs.TabLength = Math.ceil(count / Tabs.TabsQantity); // Количество записей в табе
	};
	
	Tabs.TabsRanges = []; //Массив с именами табов;
	
	Tabs.GetRecords = function(){
		var ftc; //Первое имя таба
		var ltc; //Второе имя таба
		db.collection('specialists').find().sort({name: 1}).toArray(function(err, res){
			try{
				for (var i = 0; i < Tabs.RecordsQuantity; i++){
					var IndexByNameNo = i + ''; //Номер записи по алфавиту имен
					var IndexByNameTabNo = Math.floor(i / Tabs.TabLength); //Номер таба
					db.collection('specialists').update({_id: res[i]['_id']}, {$set: {IndexByName: '' + IndexByNameNo, IndexByNameTab: '' + IndexByNameTabNo, path: '/' + IndexByNameTabNo}});
					
					if ((i + Tabs.TabLength) % Tabs.TabLength == 0){ //Проверяется не являеться ли запись первой записью таба
						ftc = res[i].name.substr(0, 2);
					}else if ((i + 1) % Tabs.TabLength == 0){ //Проверяется не являеться ли запись последней записью таба
						ltc = res[i].name.substr(0, 2);
						Tabs.TabsRanges.push(ftc + '-' + ltc); //Добавляеться в массив
						ftc = null; //Первое и сторое имя таба соеденились
					};
				};
				if (ftc){ // Если первое имя таба, в конце массива не получила второе
					ltc = res[Tabs.RecordsQuantity - 1].name.substr(0, 2);
					Tabs.TabsRanges.push(ftc + '-' + ltc);
				};
				log(Tabs.TabsRanges);
				
			} catch(err){
				log.error(err);
			}
		});
	};
	
	Tabs.SearchSort = function(url, req, res, server){ 
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
				db.collection('specialists').find(url.searchObj).sort({name: 1}).toArray(callback);
			}
		else{
			db.collection('specialists').find().sort({name: 1}).toArray(callback);
		}
	};
	
	Tabs.ProcessPath = function(url, req, res, server){
		if (req.paths.length == 0 && req.method == 'GET'){
			Tabs.GiveTabsRanges(req, res, this); //эта ф-ция передаст массив с именами табов
			log('spesh');
			return true;
		};
		//Tabs.GiveTimeOfTabUser(req.paths, req, res, this); // эта ф-ция передаст массив с id и временем
		//return;
		
	};
	
	Tabs.GiveTabsRanges = function(req, res, server){
		log('1');
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.finish(200, JSON.stringify(Tabs.TabsRanges));
	};
	
	Tabs.GiveTimeOfTabUser = function(paths, req, res, server){
		db.collection('specialists').find(paths[1]).toArray(function(err, res){
			for (i = 0; i < res.length; i++){
				var result = [];
				result[i] = {_id: res[i]['_id'], changeTime: res[i]['changeTime']};
			};
			
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.finish(200, result);
		});
		
	};
	
	Tabs.POST = function(url, req, res){
		var fullData = "";
		req.on("data", function(data){
			fullData += data;		
		});
		req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				doc.path = url.pathname;
				doc.date = new Date; // дата сохранения
				db.collection('specialists').save(doc, {safe : true}, function(err, result){
					if (err){
						res.finish(500, "Collection " + url.pathname + " error " + err);
						return;
					}					
					res.finish(200, doc.date);
				});
			}
			catch (err){
				log.error(err);
				res.finish(500, "Unknown error: " + err);
			}
		});
		return;
		
	};
	
	Tabs.PUT = function(url, req, res){
		var fullData = "";
		req.on("data", function(data){
			fullData += data;		
		});
		req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				doc.path = url.pathname;
				doc.date = new Date; // дата изменения
				db.collection('specialists').update(url.searchObj, {$set: doc}, function(err, result){
					if (err){
						res.finish(500, "Collection " + url.pathname + " error " + err);
						return;
					}					
					res.finish(200, doc.date);
				});
			}
			catch (err){
				log.error(err);
				res.finish(500, "Unknown error: " + err);
			}
		});
		return;
	};
	
	
	
	
	http.createServer(function(request, response){
		server.ProcessRequest(request, response);
	}).listen(810, 'unimedica3.web-manufacture.net');
	
	/*Tabs.GiveTabsRanges = function(){

var onRequest = function onRequest(request, response) {
log("Request received.");

response.setHeader("Access-Control-Allow-Origin", "*");
response.setHeader("Access-Control-Allow-Methods", "POST,GET, HEAD,OPTIONS");
response.setHeader("Access-Control-Request-Header", "X-Prototype-Version, x-requested-with");
response.writeHead(200, {"Content-Type": "text/plain"});
response.write(JSON.stringify(Tabs.TabsRanges));
response.end();

};
http.createServer(onRequest).listen(14212);
};
*/
	
} catch(err){
	log.error(err);
	process.exit();
}
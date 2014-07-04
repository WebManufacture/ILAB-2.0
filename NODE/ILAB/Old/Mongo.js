var mongo = require("mongodb");
var Db = mongo.Db,
    Admin = mongo.Admin,
    Connection = mongo.Connection,
    Server = mongo.Server,
    ReplSetServers = mongo.ReplSetServers,
    CheckMaster = mongo.CheckMaster;

DB_CONF = [{host : "127.0.0.1", port : 9991}, {host : "127.0.0.1", port : 9992}, 
           { host: "127.0.0.1", port: 9993 }, { host: "127.0.0.1", port: 9994 }]

replicaSet = function(serversArray, name, callback) {
	try{
		var rs = new Array();
		for(var i = 0; i < serversArray.length; i++) {
			rs[i] = new Server(serversArray[i].host, serversArray[i].port, {});
		}
		if (serversArray.length == 1){
			var dbi = new Db(name, rs[0], {});
		}
		else{			
			var rssi = new ReplSetServers(rs);
			var dbi = new Db(name, rssi, {}); 
		}
		dbi.open(function(err, dbx) {
			if (!err) {
				conn = dbi;
				db = dbx;
				if (typeof (callback) == "function") {
					callback(null, db);
				}
			} else {
				if (typeof(callback) == "function") {
					callback(err, null); 
				}
			}
		});   
	}	
	catch(err){
		if (typeof(callback) == "function") {
			callback(err, null); 
		}
	}
}


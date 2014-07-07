var mongo = useSystem("mongodb");
var Db = mongo.Db,
    Admin = mongo.Admin,
    Connection = mongo.Connection,
    Server = mongo.Server,
    ReplSetServers = mongo.ReplSetServers,
    CheckMaster = mongo.CheckMaster;

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


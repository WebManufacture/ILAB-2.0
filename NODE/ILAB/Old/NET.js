module.exports.CreateMonitor = function(config, logger){
	return new NetMonitor(config, logger);
};

function NetMonitor(config, logger){
	this.config = config;
}

NetMonitor.prototype = {
	ProcessConnection: 	function(req, res){
		console.log("client connected: " + req.headers["referer"]);
		res.writeHead(200, {'Transfer-Encoding': "chunked", 'Content-Type': "text/json; charset=utf-8" });
		res.write("[" + JSON.stringify(this.config) + "]");
		//res.writeContinue();		
		req.on("close", function(){
			console.log("client disconnected: " + req.headers["referer"]);
			res.end();	
		});
	},
	
}
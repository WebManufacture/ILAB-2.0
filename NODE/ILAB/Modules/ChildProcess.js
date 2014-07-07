useModule("Utils.js");

if (global.Channels){
	process.on("message", function(pmessage){
		if (pmessage == 'EXITING'){
			process.emit("EXITING");
			setTimeout(function(){
				console.log("CHILD PROCESS EXITED BY TIMEOUT 4s !".warn);
				process.exit();
			}, 4000);
		}
		if (typeof pmessage == "object"){
			if (pmessage.type && pmessage.type == "channelControl" && pmessage.pattern){
				if (pmessage.clientId){
					var client = Channels.followed[pmessage.clientId];
					if (client){
						if (client[pmessage.pattern]){
							console.log("REFOLLOWING PATTERN DETECTED: " + pmessage.pattern);
							return;
						}
					}
					else{
						client = Channels.followed[pmessage.clientId] = {};
					}
					client[pmessage.pattern] = 1;
				}
				else{
					console.log("Anonymous client DETECTED");				
				}			
				Channels.followToGlobal(pmessage.pattern);
			}
			if (pmessage.type && pmessage.type == "channelMessage"){
				var dateEnd = new Date();
				var dateStart = new Date(pmessage.date);
				//console.log("-> " + pmessage.args[0]);
				Channels.emit.apply(Channels, pmessage.args);
			}
		}
	});
	
	Channels.subscribeToGlobal = function(pattern){
		process.on("message", function(pmessage){
			if (typeof pmessage == "object" && pmessage.type && pmessage.type == "channelMessage" && pmessage.args){
				Channels.emit.apply(Channels, pmessage.args);		
			}
		});
		process.send({ type : "channelControl", pattern : pattern });
	};
	
	Channels.followed = {};
	
	Channels.followToGlobal = function(pattern){
		//console.log("--> Following " + pattern);	
		Channels.on(pattern, function(message){
			var params = [];			
			//console.log("<- " + message.source);
			params.push(message.source);
			for (var i = 1; i < arguments.length; i++){
				params.push(arguments[i]);
			}
			process.send({ type : "channelMessage", args : params });
		});
	};
	
	Channels.emitToGlobal = function(message){
		process.send({ type : "channelMessage", args : arguments });
	};
	
	var subscribers = process.argv[3];
	if (subscribers) subscribers = JSON.parse(subscribers);
		
	for (var pattern in subscribers){
		Channels.followToGlobal(pattern);
	}
}
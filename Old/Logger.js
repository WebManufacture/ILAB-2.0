exports.info = function(text){
	log("info", text);
}
	
exports.error = function(error){
	if (typeof error == "string"){
		log("error", error);
		return;
	}
	log("error", JSON.stringify({message: error.message, stack : error.stack}));
}
	
exports.debug = function(error){
	log("debug", error);
}

function log(type, text){
	if (typeof text != "string"){
		text = JSON.stringify(text);	
	}
	process.send({type: type, text: text});
}
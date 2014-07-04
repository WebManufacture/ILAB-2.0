global.ILabConnectivity = {
	init : function(){
		var self = this;
		Channels.on("/global/ilab.connected", function(message, param){
			
		})
	}
}


module.exports = global.ILabConnectivity;
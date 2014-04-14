function Logger(ChannelPrefix, useConsole){
	this.channelPrefix = ChannelPrefix;
	this.useConsole = useConsole;
}

Logger.create = function(cp){
	return new Logger(cp);	
};

Logger._parseArguments = function(args){
	var text = args[0];
	if (text && args.length > 1){
		for (var i = 1; i < args.length; i++){
			var re = new RegExp("[{]" + (i-1) + "[}]", 'g');
			text = text.replace(re, args[i]);
		}
	}
	return text;
}


global.info = Logger.info = function(text) {
    global.log(Logger._parseArguments(arguments), "info");
}

global.error = Logger.error = function(error) {
	if (typeof error == "string") {
		global.log(Logger._parseArguments(arguments), "error");
		return;
	}
	arguments[0] = { message: error.message, stack: error.stack };
	global.log(Logger._parseArguments(arguments), "error");
}

global.debug = Logger.debug = function(text) {
    global.log(Logger._parseArguments(arguments), "debug");
}

global.warn = Logger.warn = function(text) {
    global.log(Logger._parseArguments(arguments), "warn");
}

global.log = Logger.log = function(value, type) {
	Logger.prototype._localLog.call(this, value, type);
}

global.useConsole = true;

Logger.prototype = {
	info: function(text) {
		this._localLog(Logger._parseArguments(arguments), "info");
	},

	error: function(error) {
		if (typeof error == "string") {
			this._localLog(Logger._parseArguments(arguments), "error");
			return;
		}
		arguments[0] = { message: error.message, stack: error.stack };
		this._localLog(Logger._parseArguments(arguments), "error");
	},

	warn: function(text) {
		this._localLog(Logger._parseArguments(arguments), "debug");
	},

	debug: function(text) {
		this._localLog(Logger._parseArguments(arguments), "debug");
	},

	_localLog: function(value, type) {
		if (!type) {
			type = "?";
		}
		if (this.useConsole || !global.Channels){
			if (typeof value == 'string'){
				var content = '';
				var color = '';
				var text = value + "";
				var mode = 0;
				for (var i = 0; i < text.length; i++){
					if (mode == 0){
						if (text[i] == ">"){
							content += " \u001b" + "[39m";
							continue;
						}
						if (text[i] == "<"){
							mode = 1;
							color = '';
							continue;
						}
						content += text[i];
						continue;
					}
					if (mode == 1){
						if (text[i] == ">" || text[i] == ":"){
							switch(color){
								case 'red' : color = 31; break;
								default:
									color = 1;
							}
							content += "\u001b" + "[" + color + "m";
							mode = 0;
							continue;
						}
						color += text[i];
						continue;
					}
				}
				console.log(content);
			}
			else{
				console.log(value);
			}
		}
		if (global.Channels) {
			value = { content: value, datetime: new Date(), type: type };
			var cpostfix = "";
			if (this.channelPrefix){
				cpostfix = ("/" + this.channelPrefix);
			}
			Channels.emit("/log." + type + cpostfix, value)
		}
	}
}

module.exports = Logger;
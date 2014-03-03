global.info = function(text) {
    global.log(text, "info");
}

global.error = function(error) {
    if (typeof error == "string") {
        log(error, "error");
        return;
    }
    global.log({ message: error.message, stack: error.stack }, "error");
}

global.debug = function(text) {
    global.log(text, "debug");
}

global.warn = function(text) {
    global.log(text, "warn");
}


global.log = function(value, type) {
	if (type + "" == "true" || !global.Channels) {
		type = "?";
		console.log(value);
	}
    if (!type) {
        type = "?";
    }
    if (global.Channels) {
		value = { content: value, datetime: new Date(), type: type };
        if (!Channels.emit("log." + type, value)){
			console.log(value);
		}
    }
}

module.exports = {
	info : global.info,
	error : global.error,
	warn : global.warn,
	debug : global.debug,
	log : global.log,
    create : function(ChannelPrefix) {
		return {
			info: function(text) {
				this.localLog(text, "info");
			},

			error: function(error) {
				if (typeof error == "string") {
					localLog(error, "error");
					return;
				}
				this.localLog({ message: error.message, stack: error.stack }, "error");
			},

			warn: function(text) {
				this.localLog(text, "debug");
			},

			debug: function(text) {
				this.localLog(text, "debug");
			},

			localLog: function(value, type) {
				if (!type) {
					type = "?";
				}
				value = { content: value, datetime: new Date(), type: type };
				Channels.emit(ChannelPrefix + "." + type, value);
			}
		}
	}
}
module.exports = function(db, lgpath, collection){
	if (db){
		this.info = function(text, path){
			if (typeof text != 'string'){
				text = JSON.stringify(text)
			}
			this._log("info", text, path);
		};
		
		this.debug = function(text, path){
			if (typeof text != 'string'){
				text = JSON.stringify(text)
			}
			this._log("debug", text, path);
		};
		
		this.error = function(error, path){
			var err = {};
			if (error){
				console.error(error);
				if (error.stack){
					err.stack = error.stack;
				}
				if (error.message){
					err.message = error.message;
				}
			}
			if (typeof(error) != "string"){
				this._log("error", JSON.stringify(err), path);
			}
			else{
				this._log("error", err, path);
			}
		};
		
		this._log = function(type, message, path){
			if (!path) 
				if (lgpath) path = lgpath;
			else path = "/"
				var date = new Date();
			date = date.getTime();
			var data = { path : path, date : date, type : type, text : message };	
			if (!collection) collection = "logs";
			db.collection(collection).insert(data, {safe : true}, this.saveEnd);
		};
		
		this.saveEnd = function(err, res){
			if (err) console.log("Logs can't insert into DB: " + err);
		};
	}
	else{
		this.info = function(text, path){
			console.info(path + ": " + text);
		};
		
		this.debug = function(text){
			console.log(text);
		};
		
		this.error = function(error){
			console.error(error);
		};		
	}
}
var http = require("http");
var url = require('url');
var querystring = require('querystring');
var crypto = require('crypto');
var utils = require('./utils');

usersBase = { login : "User", Pwd : "akcmlakmsc", AuthTime : 2012-2020, Hash : ""};

function auth(request, response) {
	var a = url.parse(request.url);
	var b = a.query;
	var c = querystring.parse(b);
	var l = c.login;
	var h = c.hash;

	if (l == usersBase.login){
		var date = new Date();
		date = date.formatDateRus() + " " + date.getHours() + ":" + date.getMinutes();
		console.log(date);

		var hash = crypto.createHash('sha1');
		hash.update(usersBase.Pwd  + ' ' + date);
		var hashString = hash.digest('hex');

		if (h == hashString){
			usersBase.AuthTime = date;
			usersBase.Hash = hash;
			return 200;
		};
	};

	return 403;
}

exports.auth = auth;

xhr = new XMLHttpRequest();
xhr.lastStateChar = 0;
xhr.onreadystatechange = function rsch(){
	if (this.readyState == 2){
		console.log('connected');
	}
	if (this.readyState == 3){
		var result = this.responseText.substr(this.lastStateChar);
		this.lastStateChar = this.responseText.length;
		if (result && result.length > 0 && this.status == 200) {
			result = result.split("\n");
			for (var i = 0; i < result.length; i++){
				if (result[i] == "") continue;
				try{
					var value = JSON.parse(result[i]);
				}
				catch(e){
					console.log(result[i]);
					continue;
				}
				console.log(value);
			}
		}
	}
	if (this.readyState == 4){
		console.log('dis-connected');
	}
});
xhr.open('GET', 'localhost:5000');
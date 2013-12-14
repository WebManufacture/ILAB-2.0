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
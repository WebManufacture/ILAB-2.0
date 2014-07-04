//alert("AAAA!");

CNC = {};

CNC.Init = function() {
	L.debug = true;	
	CNC.log = L.Log;
	CNC.id = "CNC";
	CNC.CompileSettings = {};
	CNC.CncSettings = {};
	Storage = Net.GetTunnel("/storage/cnc_table");
	Net = Net.GetTunnel("http://dfc-server:8008/CncTable/");
	DOM.all(".tabs-container .tab-btn").each(function(elem){
		elem.onclick = function(){
			DOM.all(".tab-btn").del(".active");
			DOM.all(".tab").del(".active-tab");
			DOM.all(".tab").hide();
			var tab = DOM(this.attr("for"));
			tab.show();
			tab.add(".active-tab");
			this.add(".active");
			return false;
		};
	});
	
	canv = DOM("#prewiewer");
	canv.height = canv.width;
	canv.width = canv.height;
	dc = canv.getContext("2d");
	logDiv = DOM("#LogBar");
	CNC.startDate = new Date();
	CNC.State = DOM("#StatusBar");
	CNC.State.InnerProperty("X", "#xCoord");
	CNC.State.InnerProperty("Y", "#yCoord");
	CNC.State.InnerProperty("Z", "#zCoord");
	CNC.State.AttrInnerProperty("Prog", "#progCommand");
	CNC.State.AttrInnerProperty("Line", "#progLine");
	WS.Body.AttrProperty("state");
	CNC.ProgramRunned = false;
	CNC.DebugMode = false;
	CNC.ProgramCode;
	CNC.GetState();
	CNC.Load();
	
	nx = 10;
	ny = 10;
	ps = 0;
	zup = 40000;
	zdwn = 54000;
	rbtx = 0;
	rbty = 0;
	rbtz = 0;
	scx = 1;
	scy = 1;
	scz = 1;
	ms = 1000;
};


logger = function(type){
	//L.Info( "CNC")
	var li = DOM("#ProgramLog").div(".log");
	DOM("#ProgramLog").ins(li);
	li.div(".item.log-time", (new Date()).formatTime(true));
	for (var i = 0; i < arguments.length; i++){
		var text = arguments[i];
		if (typeof(text) == "object"){
			text = JSON.stringify(text);
		}
		li.div(".item", text + "");
	}
}	
	
	logger.Clear = function(){
		DOM("#ProgramLog").clear();	
	}
		
		CNC.Commands = ["unknown", "go", "rebase", "stop", "info", "P"];
CNC.CommandsShort = ["U", "G", "R", "S", "I", "P"];
CNC.GCommands = { "Z": 1, "G": 1, "S": 3, "R": 2, "I": 4, "P" : 100 };

/*
public byte command;
public ushort? x;
public ushort? y;
public ushort? z;
public ushort? speed;
public int? programLine;
*/

CNC.GetProgram = function() {
	var url = new Url("http://dfc-server:8008/CncTable/State.ashx");
	if (CNC.lastpoll) {
		url.addParam("lastdate", CNC.lastpoll);
	}
	if (CNC.ProgramRunned) {
		url.addParam("wait", "true");
		url.addParam("ping", "true");
	}
	Net.get(url, CNC.StateReturned);
};


CNC.Load = function(){
	Storage.get("", function(result){
		if (this.status == 200){
			DOM("#programText").value = result;
		}
	});
};

CNC.Save = function(){
	Storage.add("",DOM("#programText").value, 28);
};

CNC.GetState = function() {
	var url = new Url("http://dfc-server:8008/CncTable/State.ashx");
	url.addParam("rnd", Math.random());
	/*if (CNC.lastpoll) {
url.addParam("lastdate", CNC.lastpoll);
}*/
	/*
if (CNC.ProgramRunned) {
url.addParam("wait", "true");
url.addParam("ping", "true");
}
*/
	lastStateChar = 0;
	var rq = Net.get(url);
	rq.onreadystatechange = CNC.StateReturned;
	rq.send();
};

CNC.StateReturned = function() {
	if (this.readyState == 3){
		var result = this.responseText.substr(lastStateChar);
		lastStateChar = this.responseText.length;
		
		if (result && result.length > 0 && this.status == 200) {
			result = JSON.parse(result);
			for (var i = 0; i< result.length; i++){
				var message = result[i];
				if (message.type == "state"){
					CNC.LastState = message;
					CNC.State.X = message.x;
					CNC.State.Y = message.y;
					CNC.State.Z = message.z;
					lx = message.x;
					ly = message.y;
					lz = message.z;
					dc.beginPath();
					dc.moveTo(lx/120 + 5, ly/120 + 5);
					dc.rect(lx/120 - 5, ly/120 - 5, 10, 10);
					dc.lineWidth = 1;
					dc.strokeStyle = "#F0F";
					dc.closePath();
					dc.stroke();
					
					message.line = parseInt(message.line);
					
					if (parseInt(message.state) == 1){
						if (!window.commandRunning){
							CNC.log("Device", message);
							CNC.ProgramRunned = !isNaN(message.line);
							window.commandRunning = true;
						}
						
					}
					else{
						window.commandRunning = false;
						CNC.log("Device", message);
						if (parseInt(message.state) == 2 && !isNaN(message.line)){
							DOM.all(".prog-line.current").del(".current");
							DOM.all(".prog-line.prepared").del(".prepared");
							var prev = DOM(".prog-line[line='" + (message.line) + "']");
							var curr = DOM(".prog-line[line='" + (message.line + 1) + "']");
							var next = DOM(".prog-line[line='" + (message.line + 2) + "']");
							if (prev){
								prev.add(".finished");
								prev.div(".time-complete", "Finished: " + (new Date()).formatTime(true));
								if (window.programStartTime){
									prev.div(".time-total", "FromBase: " + ((new Date()).valueOf() - window.programStartTime.valueOf()));
								}
							}
							if (curr){
								curr.add(".current");
							}
							if (next){
								next.add(".prepared");
							}
						}
					}
				}			
				if (message.type == "out-command"){
					CNC.LastCommand = message;
					CNC.ProgramRunned = !isNaN(parseInt(message.programLine));
					CNC.State.Line = message.programLine;
					CNC.State.Prog = CNC.Commands[message.command];
					CNC.State.Line = message.programLine;
					if (!isNaN(parseInt(message.x))) {
						if (!CNC.LastState || message.x == CNC.LastState.x) {
							CNC.State.Prog += " x " + message.x;
						} else {
							CNC.State.Prog += " x->" + message.x;
						}
					}
					if (!isNaN(parseInt(message.y))) {
						if (!CNC.LastState || message.y == CNC.LastState.y) {
							CNC.State.Prog += " y " + message.y;
						} else {
							CNC.State.Prog += " y->" + message.y;
						}
					}
					if (!isNaN(parseInt(message.z))) {
						if (!CNC.LastState || message.z == CNC.LastState.z) {
							CNC.State.Prog += " z " + message.z;
						} else {
							CNC.State.Prog += " z->" + message.z;
						}
					}
					CNC.log("Command", message);
				}
				if (message.type == "program-state"){
					CNC.ProgramRunned = message.state == "Running";
					if (CNC.ProgramRunned){
						window.programStartTime = new Date();
						DOM("#CodeStats").div(".start-time", "Start: " + window.programStartTime.formatTime(true));
					}
					if (message.state == "Completed" || message.state == "Aborted"){
						if (window.programStartTime){
							var f = new Date();
							DOM("#CodeStats").div(".finish-time", "Finish: " + f.formatTime(true));
							DOM("#CodeStats").div(".total-time", "Total: " + (f.valueOf() - window.programStartTime.valueOf()));
							window.programStartTime = null;
						}
					}
					CNC.ProgramState =  message.state;
					WS.Body.set("@state",  message.state);
					CNC.log("Program", message);
				}
			}
		}
	}
	if (this.readyState == 4){
		if (CNC.ProgramRunned) {
			window.setTimeout(CNC.GetState, 500);
		} else {
			window.setTimeout(CNC.GetState, 2000);
		}
	}
};

CNC.Command = function(str, callback) {
	WS.Body.add(".busy");
	if (typeof (str) != "string") {
		str = JSON.stringify(str);
	}
	Net.add("Command.ashx?rnd=" + Math.random(), str, CNC.CommandComplete);
};

CNC.ProgCommand = function(str, callback) {
	WS.Body.add(".busy");
	if (typeof (str) == "string") {
		Net.get("Program.ashx?rnd=" + Math.random() + "&command=" + str + (CNC.DebugMode ? "&debug=true" : ""), CNC.CommandComplete);
	}
};

CNC.SendProgram = function(str) {
	WS.Body.add(".busy");
	if (typeof (str) == "string") {
		Net.add("Program.ashx?rnd=" + Math.random() + (CNC.DebugMode ? "&debug=true" : ""), str, CNC.CommandComplete);
	}
};

CNC.CommandComplete = function() {
	WS.Body.del(".busy");
};

CNC.Go = function(x, y, z) {
	CNC.Command({ command: 1, x: x, y: y, z: z, speed: 3000 });
};

CNC.Rebase = function(x, y, z) {
	CNC.Command({ command: 2, x: x, y: y, z: z, speed: 0 });
};

CNC.SetDebugMode = function() {
	CNC.DebugMode = !CNC.DebugMode;
	if (CNC.DebugMode) {
		CNC.ProgCommand("pause");
	}
};

CNC.GetCircleProg = function(res, x, y, z, r, back, sangle, fangle, lastspeed, steps) {
	if (sangle){
		sangle = parseFloat(sangle) * Math.PI / 180;
	}
	else{
		sangle = 0;
	}
	if (fangle){
		fangle = parseFloat(fangle) * Math.PI / 180;
	}
	else{
		fangle = 2 * Math.PI;
	}
	var a = x;
	var b = y;
	if (back == "here") {
		a = x - Math.round(r * Math.cos(sangle));
		b = y - Math.round(r * Math.sin(sangle));
	}	
	if (steps){
		steps = parseParam(steps);
	}
	if (!steps){
		steps = 32;
	}
	var step = Math.PI / steps;
	if (fangle > sangle){
		for (var angle = sangle; angle <= fangle; angle += step) {
			var xcoord = Math.round(r * Math.cos(angle)) + a;
			var ycoord = Math.round(r * Math.sin(angle)) + b;
			var obj = { command: CNC.GCommands["G"], x: xcoord, y: ycoord, z: z, speed: lastspeed };
			res.push(obj);
		}
	}
	else{
		for (var angle = sangle; angle >= fangle; angle -= step) {
			var xcoord = Math.round(r * Math.cos(angle)) + a;
			var ycoord = Math.round(r * Math.sin(angle)) + b;
			var obj = { command: CNC.GCommands["G"], x: xcoord, y: ycoord, z: z, speed: lastspeed };
			res.push(obj);
		}
	}
	if (back == "back") {
		var obj = { command: CNC.GCommands["G"], x: x, y: y, z: z,speed: lastspeed };
		res.push(obj);
	}
};

CNC.GetLoopProg = function(res, loop, comms, lxx, lyy, lzz) {
	if (!loop || !comms || comms.length <= 0) return;
	loop = loop.split(" ");
	var start = parseInt(loop[1]);
	var stop = parseInt(loop[2]);
	if (start > stop){
		//start = 
	}
	var step = parseInt(loop[3]);
	if (isNaN(step)) step = 1;
	for (var i = start; i <= stop; i += step) {
		for (var j = 0; j < comms.length; j++) {
			var txt = comms[j].split(" ");
			if (txt[0] == "C") {
				var radius = parseParam(txt[1], i);
				if (CNC.CompileSettings.Units && CNC.CompileSettings.Units == 'mm'){
					radius = Math.round(radius*400);
				}
				CNC.GetCircleProg(res, lxx, lyy, lzz, radius, txt[2], txt[3], txt[4], speed, txt[5]);
				if (res.length > 0) {
					lxx = res[res.length - 1].x;
					lyy = res[res.length - 1].y;
				}
				continue;
			}
			if (txt[0] == "Z") {
				var variable = i;
				if (start > stop){
					variable = stop - (i - start);
				}
				lzz = parseParam(txt[1], i, lzz);
				var speed = 0;
				if (txt[2]) speed = parseParam(txt[2], i);
				var obj = { command: CNC.GCommands[txt[0]], x: lxx, y: lyy, z: lzz, speed: speed };
				res.push(obj);
				continue;
			}
			if (txt[0] == "G") {
				//var speed = 0x1015;
				var speed = 0;
				if (txt[3]) speed = parseParam(txt[3], i);
				if (CNC.CompileSettings.Units && CNC.CompileSettings.Units == 'mm'){
					lxx = parseParam(txt[1], 0, lxx/400);
					lyy = parseParam(txt[2], 0, lyy/400);
					lxx = Math.round(lxx*400);
					lyy = Math.round(lyy*400); //Поправочные коэффициэнты
				}
				else{				
					lxx = parseParam(txt[1], 0, lxx);
					lyy = parseParam(txt[2], 0, lyy);	
				}
				var obj = { command: CNC.GCommands[txt[0]], x: lxx, y: lyy, z: lzz, speed: speed };
				res.push(obj);
			}
		}
	}
};

parseContext = {};

parse = function(paramName, paramValue) {
	var last = parseContext[paramName];
	if (paramValue == undefined || paramValue == null || paramValue == "") return null;
	//"(0)";
	else {
		if (param.start("-")) var sign = -1;
		else var sign = 1;
		param = param.substring(1);
	}
	var int = parseFloat(param);
	if (!isNaN(int)) {
		if (last) {
			int = last + sign * int;
		}
		return int;
	}
	return param;
};


parseParam = function(param, i, last) {
	if (!param || param == "") return last;
	var sign = 0;
	if (!param.start("+") && !param.start("-")) {
		last = null;
	}
	else {
		if (param.start("-")) var sign = -1;
		else var sign = 1;
		param = param.substring(1);
	}
	if (param.end('m')){
		var int = parseFloat(param.replace(/[m]/g, '')) * 400;
	}
	else{
		var int = parseFloat(param);
	}
	if (!isNaN(int)) {
		if (last && sign != 0) {
			int = last + sign * int;
		}
		return int;
	}
	if (param.search(/\(\d+\)/) == 0) {
		var paramNum = parseFloat(param.match(/\d+/)[0]);
		var int = parseFloat(i);
		if (!isNaN(int)) {
			if (last && sign != 0) {
				int = last + sign * int;
			}
			return int;
		}
		return i;
	}
	return param;
};

parseNum = function(param, param1, param2, param3) {
	if (!param || param == "") return null;
	var int = parseInt(param);
	if (!isNaN(int)) return int;
	if (param.search(/\(\d+\)/) == 0) {
		var paramNum = parseInt(param.match(/\d+/)[0]);
		return arguments[paramNum + 1];
	}
	return param;
};

CNC.CompileProgram = function(text) {
	lx = parseInt(CNC.State.X);
	ly = parseInt(CNC.State.Y);
	lz = parseInt(CNC.State.Z);
	text = text.split("\n");
	var result = [];
	try {
		for (var i = 0; i < text.length; i++) {
			var lr = result[result.length - 1];
			if (lr) {
				if (lr.x != undefined){
					lx = parseInt(result[result.length - 1].x);
				}
				if (lr.y != undefined){
					ly = parseInt(result[result.length - 1].y);
				}
				if (lr.z != undefined){
					lz = parseInt(result[result.length - 1].z);
				}
			}
			var line = text[i].trim();
			if (line.length == 0) break;
			if (line.start("//")) continue;
			var txt = line.split(" ");
			if (txt[0] == "C") {
				var radius = parseFloat(txt[1]);
				if (CNC.CompileSettings.Units && CNC.CompileSettings.Units == 'mm'){
					radius = Math.round(radius*400);
				}
				CNC.GetCircleProg(result, lx, ly, lz, radius, txt[2], txt[3], txt[4], speed, txt[5]);
				continue;
			}
			if (txt[0] == "L") {
				var comms = [];
				for (var j = i + 1; j < text.length; j++) {
					if (text[j]) {
						if (text[j] == "LF") break;
						comms.push(text[j]);
					}
					else {
						j = j - 1;
						break;
					}
				}
				if (comms.length > 0) {
					CNC.GetLoopProg(result, text[i], comms, lx, ly, lz);
					i = j;
				}
				continue;
			}
			if (txt[0] == "Z") {
				lz = parseParam(txt[1], i, lz);
				var speed = 0;
				if (txt[2]) speed = parseParam(txt[2], i);
				var obj = { command: CNC.GCommands[txt[0]], x: lx, y: ly, z: lz, speed: speed };
				result.push(obj);
				continue;
			}
			if (txt[0] == "G") {
				var speed = 0;
				if (CNC.CompileSettings.Units && CNC.CompileSettings.Units == 'mm'){
					lx = parseParam(txt[1], 0, lx/400);
					ly = parseParam(txt[2], 0, ly/400);
					lx = Math.round(lx*400);
					ly = Math.round(ly*400); //Поправочные коэффициэнты
				}
				else{				
					lx = parseParam(txt[1], 0, lx);
					ly = parseParam(txt[2], 0, ly);	
				}
				if (txt[3]) speed = parseParam(txt[3], 0, 0);
				var obj = { command: CNC.GCommands[txt[0]], x: lx, y: ly, z: lz, speed: speed };
				result.push(obj);
			}
			if (txt[0] == "R") {
				if (CNC.CompileSettings.Units && CNC.CompileSettings.Units == 'mm'){
					lx = parseParam(txt[1], 0, lx/400);
					ly = parseParam(txt[2], 0, ly/400);
					lx = Math.round(lx*400);
					ly = Math.round(ly*400); //Поправочные коэффициэнты
				}
				else{				
					lx = parseParam(txt[1], 0, lx);
					ly = parseParam(txt[2], 0, ly);	
				}
				var obj = { command: CNC.GCommands[txt[0]], x: lx, y: ly, z: parseParam(txt[3], 0, lz) };
				result.push(obj);
			}
			
			if (txt[0] == "P") {
				var obj = { command: CNC.GCommands[txt[0]] };
				result.push(obj);
			}
		}
		return result;
	}
	catch (e) {
		WS.Body.state = "error";
		throw e;
	}
};


CNC.CompileSvg = function(text) {
	var lxx = 0;
	var lyy = 0;
	var lzz = 0;
	var yfactor = 1;
	if (CNC.LastState){
		var lzz = parseInt(CNC.LastState.z);
		var lxx = parseInt(CNC.LastState.x);
		var lyy = parseInt(CNC.LastState.y);
	}
	var lss = parseInt(DOM("#millingSpeed").value);
	if (isNaN(lss)){
		lss = 16000;
	}
	var code = [];
	var svg = DOM.div(".svg-codes", text);
	svg = WS.ExtendElement(svg.get("svg"));
	var svgWidth = svg.attr("width");
	var svgHeight = svg.attr("height");
	var nx = 400;
	var ny = 400;
	var paths = svg.all("path,circle,rect");
	var i = 0;
	rbtx = lxx;
	rbty = lyy;
	if (lzz > zup){
		code.push({ command : 1, x : lxx, y : lyy, z : zup, speed : 2000 });
		lzz = zup;
	}
	for (var j = 0; j < paths.length; j++) {
		var path = WS.ExtendElement(paths[j]);
		if (path.tagName.toLowerCase() == "path"){
			for (var step = zdwn; step <= zdwn; step += 1){
				var coords = path.attr("d");
				if (!coords) {
					continue;
				}
				var regex = "([mlc ])(-?\\d+(?:[.]\\d+)?),(-?\\d+(?:[.]\\d+)?)";
				var matches = coords.match(new RegExp(regex, 'ig'));
				for (var k = 0; k < matches.length; k++){
					i++;
					var parse = matches[k].match(new RegExp(regex));
					var line = { command: 1, x : parseFloat(parse[2]), y : parseFloat(parse[3]), z: lzz, speed: lss};
					if (k == 0){						
						line.x = Math.round(rbtx + line.x * nx);
						line.y = Math.round(rbty + line.y * yfactor * ny);
						//code.push({ command : 1, x :  line.x, y : line.y, z : 20000, speed : 3000 });
						//lzz = 20000;
						line.z = lzz;
						line.speed = 3000;
						//lss = 600;
					} 
					else{
						line.x = lxx + Math.round(line.x * nx);
						line.y = lyy + Math.round(line.y * yfactor * ny);	
					}
					if (line.z == lzz && line.x == lxx && line.y == lyy) {
						if (k == 0 && lzz < step){						
							code.push({ command : 1, x : lxx, y : lyy, z : step, speed : 3000 });
							lzz = step;						
						}
						continue;
					}						
					lxx = line.x;
					lyy = line.y;
					/*
if (line.x > lxx){
lxx = line.x;
line.x -= 1600;
}
else{
lxx = line.x;
line.x += 1600;	
}
if (line.y > lyy){
lyy = line.y;
line.y -= 1600;
}
else{
lyy = line.y;
line.y += 1600;	
}*/
					lzz = line.z;
					if (coords.end("z") || coords.end("Z")){
						
					}
					code.push(line);
					if (k == 0 && lzz < step){						
						code.push({ command : 1, x : lxx, y : lyy, z : step, speed : 3000 });
						lzz = step;
						//lss = 600;
					}
				}
			}			
			if (lzz > zup){
				code.push({ command : 1, x : lxx, y : lyy, z : zup, speed : 2000 });
				lzz = zup;
			}
		}
	}	
	if (lzz > zup){
		code.push({ command : 1, x : lxx, y : lyy, z : zup, speed : 2000 });
		lzz= zup;
	}
	code.push({ command : 1, x : lxx, y : lyy, z : 5000, speed : 600 });
	return code;
};

CNC.CompileCsv = function(text) {
	var lxx = 0;
	var lyy = 0;
	var lzz = 0;
	if (CNC.LastState){
		var lzz = parseInt(CNC.LastState.z);
		var lxx = parseInt(CNC.LastState.x);
		var lyy = parseInt(CNC.LastState.y);
	}	
	nx = 10;
	ny = 10;
	ps = 0;
	zup = 20000;
	zdwn = 58000;
	rbtx = 0;
	rbty = 0;
	rbtz = 0;
	scx = 1;
	scy = 1;
	scz = 1;
	var lss = parseInt(DOM("#millingSpeed").value);
	if (isNaN(lss)){
		lss = 16000;
	}
	var code = [];
	text = text.split("\n");
	for (var i = 0; i < text.length; i++) {
		if (text[i].trim().length == 0) break;
		if (text[i].end(";")){
			text[i] = text[i].substr(0, text[i].length - 1);
		}
		var coords = text[i].split(" ");
		if (coords.length > 0){
			if (isNaN(parseFloat(coords[0]))){
				var command = coords[0];
				coords = coords[1].split(",");
				if (command == "PU"){
					if (lzz > zup){
						code.push({ command : 1, x : lxx, y : lyy, z : zup, speed : 1000 });
						lzz = zup;
					}	
				}
				if (command == "PD"){
					if (lzz < zdwn){
						code.push({ command : 1, x : lxx, y : lyy, z : zdwn, speed : 1000 });
						lzz = zdwn;
					}	
				}
				if (command == "SZ"){
					zup = parseParam(coords[0], zup, zup);
					zdwn = parseParam(coords[1], zdwn, zdwn);
					continue;
				}
				if (command == "BASE"){
					rbtx = parseParam(coords[0], rbtx, rbtx);
					rbty = parseParam(coords[1], rbty, rbty);
					rbtz = parseParam(coords[2], rbtz, rbtz);
					continue;
				}
				if (command == "DU"){
					if (coords[0] == 'mm'){
						nx = 400;
						ny = 400;
					}
					if (coords[0] == 'hp'){
						nx = 10;
						ny = 10;
					}
					if (coords[0] == 'steps'){
						nx = 1;
						ny = 1;
					}
					continue;
				}
				if (command == "SCALE"){
					scx = parseParam(coords[0], scx, scx);
					scy = parseParam(coords[1], scy, scy);
					scz = parseParam(coords[2], scz, scz);
					continue;
				}
			}
			else{
				coords = text[i].split(",");
			}
			var line = { command: 1, x : parseParam(coords[ps], lxx, lxx), y : parseParam(coords[ps + 1], lyy, lyy), z: parseParam(coords[ps + 2], lzz, lzz), speed: parseParam(coords[ps + 3], lss, lss)};
			line.x = Math.round(line.x * nx * scx + rbtx);
			line.y = Math.round(line.y * ny * scy + rbty);	
			line.z = Math.round(line.z * scz + rbtz);	
			lxx = line.x;
			lyy = line.y;
			lzz = line.z;
			lss = line.speed;
			code.push(line);
		}
	}
	code.push({ command : 1, x : lxx, y : lyy, z : zup, speed : 1000 });
	return code;
};

CNC.ProcessCode = function(code) {
	var lxx = 0;
	var lyy = 0;
	var lzz = 0;
	if (CNC.LastState){
		var lxx = parseInt(CNC.LastState.x);
		var lyy = parseInt(CNC.LastState.y);
		var lzz = parseInt(CNC.LastState.z);
	}
	var lss = 0;
	var zx = 120;
	var zy = 120;//
	var cx = lxx/zx;
	var cy = lyy/zy;
	dc.fillRect(0, 0, canv.width, canv.height);
	dc.beginPath();
	dc.moveTo(cx, cy);
	dc.rect(cx + 5, cy + 5, 10, 10);
	dc.lineWidth = 1;
	dc.strokeStyle = "#F0F";
	dc.closePath();
	dc.stroke();
	CNC.ProgramCode = code;
	var ln = DOM("#codeLineNums");
	var pr = DOM("#ProgramResultCode");
	ln.clear();
	pr.clear();
	pr.del(".error");
	var maxX = 0;
	var maxY = 0;
	var minX = 65535;
	var minY = 65535;
	var dl = DOM("#CodeStats");
	//WS.Body.state = "compiling";
	var pt = 0;
	var ptz = 0;
	var ptzScale = 1;
	try {
		
		var ox = lxx;
		var oy = lyy;
		dc.beginPath();
		if (lzz > zup){
			dc.strokeStyle = "#0F0";
		}
		else{
			dc.strokeStyle = "#00F";
		}
		for (var i = 0; i < CNC.ProgramCode.length; i++) {
			var line = CNC.ProgramCode[i];
			if (!line) {
				continue;
			}
			ln.div(".line-num",  i + 1).add("@num",  i + 1);
			var pl = pr.div(".prog-line");
			pl.set("@line", i + 1);
			pl.div(".code-elem.command." + CNC.Commands[line.command], CNC.CommandsShort[line.command]);
			var oc = { x : lxx, y : lyy, z: lzz};
			pl.add(CNC.ShowCoord(line, "x", oc));
			pl.add(CNC.ShowCoord(line, "y", oc));
			pl.add(CNC.ShowCoord(line, "z", oc));
			pl.div(".code-elem.speed", line.speed ? line.speed : "(" + lss + ")");
			if (line.command == 1 && (line.x < 0 || line.y < 0 || line.z < 0)) {
				pl.add(".error");
				ln.add(".error");
				pr.add(".error");
				//WS.Body.state = "compile-error";
				CNC.ProgramCode = null;
				break;
			}
			if (line.command == 1 && (line.x > 655350 || line.y > 655350 || line.z > 655350)) {
				pl.add(".error");
				ln.add(".error");
				pr.add(".error");
				//WS.Body.state = "compile-error";
				CNC.ProgramCode = null;
				break;
			}			
			if (line.command == 1 && line.speed && (line.speed < 0 || line.speed > 65535)) {
				pl.add(".error");
				ln.add(".error");
				pr.add(".error");
				//WS.Body.state = "compile-error";
				CNC.ProgramCode = null;
				break;
			}
			pl.line = line;/*
if ((lxx < 6000 || lyy < 6000) && ((line.speed < 8000 && line.speed > 0) || (lss < 8000 && lss > 0))){
pl.add(".warning");
if (lxx < 6000){
if (lyy < 6000){
line.speed = 8000;	
}
else{
var k = line.x/line.y;
var newLine = JSON.parse(JSON.stringify(line));
newLine.x = 6000;
newLine.y = 6000 * k;
newLine.speed = 8000;
if (line.speed == 0) line.speed = lss;
CNC.ProgramCode.splice(i,0,newLine);						
}
}
else{
var k = line.y/line.x;
var newLine = JSON.parse(JSON.stringify(line));
newLine.x = 6000 * k;
newLine.y = 6000;
newLine.speed = 8000;
if (line.speed == 0) line.speed = lss;
CNC.ProgramCode.splice(i,0,newLine);						
}
}
else
{
if ((line.x < 6000 || line.y < 6000) && ((line.speed < 8000 && line.speed > 0) || (lss < 8000 && lss > 0))){
pl.add(".warning");	
if (line.x < 6000){
if (lx < 6000){
line.speed = 8000;	
}
else{
var k = Math.abs((line.x - lx)/(line.y - ly));
var newLine = JSON.parse(JSON.stringify(line));
newLine.x = 6000;
newLine.y = 6000 * k;
newLine.speed = 8000;
if (line.speed == 0) line.speed = lss;
CNC.ProgramCode.splice(i,0,newLine);						
}
}
else{
if (ly < 6000){
line.speed = 8000;	
}
else{
var k = line.y/line.x;
var newLine = JSON.parse(JSON.stringify(line));
newLine.x = 6000 * k;
newLine.y = 6000;
newLine.speed = 8000;
if (line.speed == 0) line.speed = lss;
CNC.ProgramCode.splice(i,0,newLine);
}
}
}	
}*/
			if (line.z === undefined) line.z = lzz;
			if (line.z < zup && lzz > zup){
				dc.closePath();
				dc.stroke();
				dc.beginPath();
				dc.strokeStyle = "#00F";	
			}
			if (line.z >= zup && lzz <= zup){
				dc.closePath();
				dc.stroke();
				dc.beginPath();
				dc.strokeStyle = "#0F0";	
			}
			if (line.z > zdwn){
				dc.closePath();
				dc.stroke();
				dc.beginPath();
				dc.strokeStyle = "#F00";	
			}
			if (lzz != line.z){
				ptz += Math.abs(line.z - lzz);	
			}
			else{
				var ptx = Math.abs(line.x - lxx);
				var pty = Math.abs(line.y - lyy);
				pt += ptx > pty ? ptx : pty;
			}			
			cx = Math.round(lxx / zx + 5);
			cy = Math.round(lyy / zy + 5);
			dc.moveTo(cx, cy);
			/*
if (line.x > lxx){
lxx = line.x;
line.x += 1600;
}
else{
if (line.x < lxx){
lxx = line.x;
line.x -= 1600;	
}
}
if (line.y > lyy){
lyy = line.y;
line.y += 1600;
}
else{
if (line.y < lyy){
lyy = line.y;
line.y -= 1600;	
}
}*/
			lxx = line.x;
			lyy = line.y;
			lzz = line.z;
			if (lxx > maxX) maxX = lxx;
			if (lyy > maxY) maxY = lyy;
			if (lxx < minX) minX = lxx;
			if (lyy < minY) minY = lyy;
			cx = Math.round(lxx / zx + 5);
			cy = Math.round(lyy / zy + 5);
			dc.lineTo(cx, cy);
			//cx = Math.round(ox / zx + 5);
			//cy = Math.round(oy / zy + 5);
			//dc.moveTo(cx, cy);
			//cx = Math.round(line.x / zx + 5);
			//cy = Math.round(line.y / zy + 5);
			//dc.lineTo(cx, cy);
			ox = line.x;
			oy = line.y;
			//dc.moveTo(cx, cy);
			//cx = Math.round(line.x / zx + 5);
			//cy = Math.round(line.y / zy + 5);
			//dc.lineTo(cx, cy);
			lss = line.speed ? line.speed : lss;
		}
	}
	catch (e) {
		ln.add(".error");
		pr.add(".error");
		//WS.Body.state = "error";
		throw e;
	}
	dl.innerHTML = "Max X: " + maxX + " Max Y: " + maxY + "<br/> Min X: " + minX + " Min Y: " + minY + "<br/> Size X: " + (maxX - minX) + " Size Y: " + (maxY - minY);
	dl.innerHTML += "Ширина(X,мм): " + ((maxX - minX)/400) + " Высота(Y,мм): " + ((maxY - minY)/400) + "<br/>";
	dl.innerHTML += "Время выполнения: " + pt + " шагов XY и " + ptz + "по Z суммарно: " + (pt + ptz) + "<br/>";
	pt = Math.round((pt + ptz*ptzScale)*(0.815390715061537538898254826049));
	dl.innerHTML += "Итого: " + (new Date(pt)).formatTime(true) + "<br/>";
	
	dc.closePath();
	dc.stroke();
	//WS.Body.state = "ready";
};



CNC.ShowCoord = function(line, cname, obj) {
	var div = DOM.div(".code-elem." + cname + "-coord");
	var c = line[cname];
	if (isNaN(parseInt(c))) {
		c = obj[cname];
		line[cname] = c;
		div.add(".from-history");
		div.set(null, "(" + c + ")");
	}
	else {
		div.set(null, c);
	}
	return div;
};



CNC.RunProgram = function() {
	if (CNC.ProgramCode) {
		CNC.SendProgram(JSON.stringify(CNC.ProgramCode));
	}
};

CNC.QuickCommand = function(txt){
	var lxx = parseInt(CNC.LastState.x);
	var lyy = parseInt(CNC.LastState.y);
	var lzz = parseInt(CNC.LastState.z);
	
	txt = txt.trim();
	if (txt.length == 0) return;
	var txt = txt.split(" ");
	if (txt[0] == "Z") {
		var speed = 0;
		if (txt[2]) speed = parseParam(txt[2], 0, 0);
		var obj = { command: CNC.GCommands[txt[0]], x: lxx, y: lyy, z:  parseParam(txt[1], lzz, lzz), speed: speed };
	}
	if (txt[0] == "G") {
		lxx = parseParam(txt[1], 0, lxx);
		lyy = parseParam(txt[2], 0, lyy);
		var speed = 0;
		if (txt.length >= 5){
			lzz = parseParam(txt[3], 0, lzz);			
			speed = parseParam(txt[4], 0, 0);
		}
		else{
			if (txt[3]) speed = parseParam(txt[3], 0, 0);
		}
		var obj = { command: CNC.GCommands[txt[0]], x: lxx, y: lyy, z: lzz, speed: speed };
	}
	if (txt[0] == "R") {
		var obj = { command: CNC.GCommands[txt[0]], x: parseParam(txt[1], 0, lxx), y: parseParam(txt[2], 0, lyy), z: parseParam(txt[3], 0, lzz) };
	}
	if (obj){
		CNC.Command(obj);
	}
};

CNC.ShowProgram = function() {
	if (DOM("#ProgramBlock").is(".active-tab")){
		CNC.Save();
		CNC.ProcessCode(CNC.CompileProgram(DOM("#programText").value));
	}
	else{
		if (DOM("#SvgExporter").is(".active-tab")){
			CNC.ProcessCode(CNC.CompileSvg(DOM("#SvgSource").value));
		}
		if (DOM("#CsvExporter").is(".active-tab")){
			CNC.ProcessCode(CNC.CompileCsv(DOM("#CsvSource").value));
		}
	}
};

WS.DOMload(CNC.Init); 
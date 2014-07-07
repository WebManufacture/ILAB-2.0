{
	Ver : "0.3.2", 
	LogLevel: "debug",
	Modules : ["ilab_nodes_connectivity.js"],
	Type: "nodesgroup", 
	State : "working",
	Nodes : {
		Routing : {
			Type : "internal",
			Module:"./_ILAB/Services/RoutingService.js",
			Path : "" ,
			DefaultPort : 1000,
			ChannelsTerminator : false,
			Routes : {
				"http://default/Config/<": "AdminService/Static",
				"http://default/Config/Nodes/<": "AdminService/Nodes",
				"hmch://default/": "/",
				"http://klab.web-manufacture.net/<" : "klab", 
				"http://ilab.web-manufacture.net/<" : "iLab",
				"http://services.web-manufacture.net/<" : "Sites/Services",
				"http://modules.web-manufacture.net/<" : "Sites/Modules",
				"http://system.web-manufacture.net/<" : "Sites/System",
				"http://web-manufacture.net/<" : "Sites/WebManufactureSite",

				"http://roboplatform.web-manufacture.net/Store/<" : "iRoboPlatform/Store",
				"http://roboplatform.web-manufacture.net/Robomind/<" : "RoboPlatform/Sites/RoboMind",	
				"http://roboplatform.web-manufacture.net:5000/robomind/<" : "RoboPlatform/Services/RoboMind",

				"http://identification.web-manufacture.net/Identification/<" : "Identification/Service",
				"http://identification.web-manufacture.net/<" : "Identification/Site",

				"http://cnc.web-manufacture.net/<" : "CncPlatform/Sites/Main",
				"http://cnc.web-manufacture.net:6670/<" : "CncPlatform/Services/CncTable",

				"http://roboplatform.web-manufacture.net/Emulator/<" : "TcpEmulator/ViewState",
				"sock://roboplatform.web-manufacture.net/Emulator/<" : "TcpEmulator/SockService",
				"tcp://localhost:6600" : "TcpEmulator/TcpService",
				"channels://uart.output" : "TcpEmulator/UartSender",
				"channels://uart.input" : "TcpEmulator/UartSender"
			},
			State : "working"
		},
		TcpEmulator: {Type:"isolated", State:"working", port:5012},
		Static : {
			Type: "internal", Module : "./_ILAB/Services/StaticService.js", basepath:"./_ILAB", State:"working", channel: "Sites"
		},
		AdminService : {
			Node : "./_ILAB/ConfigService/AdminService.js", DefaultFile : "Config.htm", State:"working", basepath:"./_ILAB/ConfigService"
		},
		KLab : {
			Type: "internal", File : "./_KLab/KLabService.js", "basepath":".", "State":"initialized"
		},
		Test1 : {
			State: "initialized"
		},
		Test2 : {
			State: "loaded"
		},
		Test3 : {
			State: "sleep"
		},
		Test4 : {
			State: "stopped"
		},
		Test5 : {
			State: "unloaded"
		},
	}
}
{
	Ver : "0.3.2", 
	LogLevel: "info",
	Modules : ["ilab_nodes_connectivity.js"],
	Type: "FrameNode", 
	State : "working",
	ChildNodes : {
		"service#Channels:working" : {
			Service : "./ILAB/Services/ChannelService.js", 
		},
		"service#Routing:working" : {
			Service: "./ILAB/Services/RoutingService.js",
			Path : "" ,
			DefaultPort : 1000,
			ChannelsTerminator : false,
			Routes : {
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
			Requires : {
				ChannelsService : "#Channels"
			}
		},
		Files : {
			Type: "Service", 
			Service : "./ILAB/Services/FilesService.js", 
			Paths : {
				BasePath : "./ILAB"
			},
			State:"working", 
			Services: {
				"#Channel" : "Files"
			}
		},		
		Static : {
			Type: "service", 
			Service : "./ILAB/Services/StaticService.js", 
			Paths : {
				BasePath : "./ILAB"
			},
			State:"working", 
			Channel: "Sites",
			Requires : {
				FilesService : "#Files",
				RoutingService : "#Routing"
			}
		},
		"Service#Admin:working" : {
			Service : "./ILAB/Services/ConfigService/AdminService.js", 
			State:"working", 
			Paths : {
				BasePath : "./ILAB/Services/ConfigService",
				ConfigPage: "Config New.htm",
				NodePage: "Node.htm"
			},
			Services: {
				Routing : {
					Routes : {
						"http://default/Config/<": "AdminService/Static",
						"http://default/Config/Nodes/<": "AdminService/Nodes",
						"hmch://default/Config/Control/<": "AdminService/Control",
						"hmch://default/Config/Logs/<": "AdminService/Logs",
					}
				}
			}
		},
		KLab : {
			Type: "service", 
			Service : "./KLAB/KLabService.js", 
			Paths : {
				BasePath : "./KLAB"
			},
			State:"initialized", 
			Channel: "Sites",
			Requires : {
				StaticService : "Static",
				RoutingService : "Routing"
			}
		},
		"Service#Secure:initialized" : {
			Service : "./ILAB/Services/SecureServer.js", 
			Channel: "Secure",
			Requires : {
				StorageService : "Storage",
				RoutingService : "Routing"
			}
			Services : {
				StorageService : {
					Storage : "./ILAB/Storage/AuthStorage.json"
				}
				RoutingService : {
					Routes : {
						"http://security.web-manufacture.net" : "Secure"
					}
				}
			}
		},
		"Service#Storage:initialized" : {
			Service : "./ILAB/Services/StorageServer.js", 
			Channel: "Storage",
			Paths : {
				BasePath: "./ILAB/Storage",
				TempPath: "./ILAB/Storage/Temp",
				SitesPath: "./ILAB/Storage/Sites",
				UsersPath: "./ILAB/Storage/Users",
				ServerStorage : "./ILAB/Storage/Server.json"
			}
		},
		
		TcpEmulator: {Type:"isolated", State:"working", port:5012},
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
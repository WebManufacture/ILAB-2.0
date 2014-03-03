[ 
 {
	"id":"Admin",
	"Process":"internal",
	"HTTP" : "/Config/>",
	"Path" : "/Config/>",
	"Type" : "managed",
	"basepath":"./ILAB/Admin",
	"Frame":"./ILAB/ManagedServer",
	"File":"./ILAB/Admin/AdminServer.js",
	"State":"working"
 },
 {
	"id":"KLAB",
	"HTTP":"klab.web-manufacture.net",
	"Host":"klab.web-manufacture.net",
	"Process":"isolated",
	"Type" : "proxied",
	"Frame":"./ILAB/ManagedServer", 
	"File":"./ILAB/KLabServer.js",
	"State":"working"
 }, 
 {
	"id":"ILAB",
	"HTTP":"ilab.web-manufacture.net",
	"Host":"ilab.web-manufacture.net",
	"Process":"isolated",
	"Type" : "proxied",
	"File":"./ILAB/VirtualServer.js", 
	"State":"working"
 },
 
 {"id":"Services","Host":"services.web-manufacture.net","Process":"internal","File":"./ILAB/StaticServer.js","Type":"proxied","basepath":"./PROJECTS/services","State":"working"},
	
 {"id":"Modules","Host":"modules.web-manufacture.net","Process":"internal","File":"./ILAB/StaticServer.js","Type":"proxied","basepath":"./ILAB/modules","State":"working"},
 
 {"id":"System","Host":"system.web-manufacture.net","Process":"internal","File":"./ILAB/StaticServer.js","Type":"proxied","basepath":"./PROJECTS/system","State":"working"},
 
 {"id":"WebManufacture","Host":"web-manufacture.net","Process":"internal","File":"./ILAB/StaticServer.js","Mode":"ReadOnly","DefaultFile":"Index.htm","Type":"proxied","basepath":"./PROJECTS/WebManufacture","State":"working"},
 
 {"id":"RoboPlatform","Host":"roboplatform.web-manufacture.net","Path":"/robomind/>","Process":"internal","File":"./ILAB/StaticServer.js", "Type":"managed","basepath":"./HLAB/ebox","DefaultFile":"index.htm","State":"working"},
 
 {"id":"Identification", "Host":"identification.web-manufacture.net", "Frame":"./ILAB/ManagedServer", "Path":"/identification/>","Process":"isolated", "Type":"managed", "File":"./PROJECTS/identification/ServerIPC.js","State":"idle"},
 
 {"id":"IdentificationSite", "Host":"identification.web-manufacture.net","Process":"internal", "Path":"/<", "DefaultFile":"identification.htm", "Type":"managed", "basepath":"./PROJECTS/identification", "File":"./ILAB/StaticServer.js","State":"idle"},
 
 {"id":"CncPlatform", "Host":"cnc.web-manufacture.net","Process":"internal", "Type":"proxied", "DefaultFile":"CncTable.htm","basepath":"./HLAB/CncController", "File":"./ILAB/StaticServer.js","State":"idle"},
	
 {"id":"CncController", "Host":"cnc.web-manufacture.net", "Port": 6670, "Type":"proxied", "Frame":"ILAB/ManagedServer", "Process":"isolated","File":"HLAB/cnccontroller/CncController.js","State":"idle",
 	"DeviceCfg":{
			"type":"tcp",
			"host":"127.0.0.1",
			"port":5012
		}
 },
	
 {"id":"TcpEmulator", "Process":"isolated", "File":"./PROJECTS/TcpEmulator/Main.js","State":"idle", "port":5012}
]

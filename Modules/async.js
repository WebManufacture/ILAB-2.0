var EventEmitter = require("events").EventEmitter;

if (!global.Inherit)
global.Inherit = function (Child, Parent, mixin)
{
	util.inherits(Child, Parent);
	if (mixin){
		for (var item in mixin){
			Child.prototype[item] = mixin[item];
		}
	}
	Child.base = Parent.prototype;
}

global.Async = {
	Sync : function(){
		this.counter = 0;
		this.methods = 0;
	},
	
	Waterfall : function(callback){
		this.counter = 0;
		this._doneMethod = callback;
	}
}

Inherit(Async.Sync, EventEmitter, {
	add : function(callback){
		
	},
	
	run : function(callback){
			
	},
	
	decount : function(){
		
	},
	
	done : function(callback){
		
	}
});

Inherit(Async.Waterfall, EventEmitter, {
	checkFunction : function(){
		this.counter--;
		var self = this;
		if (this.counter == 0){
			setImmediate(function(){
				self._callDone();
			});
		}
	},
	
	subscribe : function(emitter, event){
		var self = this;
		this.counter++;
		emitter.once(event, function checkEventsDone(){
			self.checkFunction();
		})
	},
			
	_callDone : function(){
		this.emit("done");
		if (typeof this._doneMethod == 'function'){
			this._doneMethod();
		}
	}
});

module.exports = Async;
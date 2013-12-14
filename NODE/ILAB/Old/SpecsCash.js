





SpecsCash = {};




SpecsCash.IB = {};

//localStorage.removeItem('spec');
//localStorage.removeItem('chsp');

SpecsCash.Init = function(){
	
	SpecsCash.Server = new NodeTunnel('http://unimedica3.web-manufacture.net:810');
	
	if (localStorage['spec'] && localStorage['spec'].length > 10){
		SpecsCash.DB = JSON.parse(localStorage['spec']);
		Tabs.showSelectedSpecs(SpecsCash.Sorter(SpecsCash.DB))// отображение
		Tabs.specLightbox();
	}else{
		SpecsCash.Server.all('http://unimedica3.web-manufacture.net:810', function(rt, er){
			localStorage.setItem('lst', (new Date).getTime());
			localStorage.setItem('spec', rt);
			SpecsCash.DB = JSON.parse(rt);
			Tabs.showSelectedSpecs(SpecsCash.Sorter(SpecsCash.DB))// отображение
			Tabs.specLightbox();	
		});
	};
	window.setTimeout(SpecsCash.SyncFromServer, 3000);
};

SpecsCash.SyncFromServer = function(){
	if (localStorage['lst']){
		
		var syncRequestUrl = Request.GetUrl('http://unimedica3.web-manufacture.net:810', {_lastmodified: localStorage['lst']});
		SpecsCash.Server.all(syncRequestUrl, function(rt, er){
			localStorage.setItem('lst', (new Date).getTime());
			if (rt) {
				rt = JSON.parse(rt);
				for (var j = 0; j < rt.length; j++){
					SpecsCash.DB = SpecsCash.SearchAndChangeOrDelByID(rt[j], SpecsCash.DB);	
				};
				localStorage.setItem('spec', JSON.stringify(SpecsCash.DB));
				Tabs.showSelectedSpecs(SpecsCash.Sorter(SpecsCash.DB))// отображение
				Tabs.specLightbox();
			};
			window.setTimeout(SpecsCash.SyncFromServer, 30000);
			});
	};
	
	
};

SpecsCash.SearshAngModify = function(){};


SpecsCash.Sorter = function(toSort){
	var sorted = toSort.sort(function(a, b){
		return a.name > b.name ? 1 : -1;
	});
	return sorted;
	
};



SpecsCash.SaveChanges = function(){ //saveObj = {name: '', id: ''}
	var saveObj = this.FillObj({name: '', id: '', Tel: '', Mail: ''}); //Пока только name и id
	var lsSpec = JSON.parse(localStorage['spec']);
	if (localStorage['chsp']){
		var chSp = JSON.parse(localStorage['chsp']);
	}else{
		var chSp = [];
	};
	
	if (!saveObj.id || saveObj.id == 'SpecProto'){
		saveObj._id = SpecsCash.NewID();
		delete saveObj.id;
		chSp.push(saveObj);
		lsSpec.push(saveObj);
	}else{
		saveObj._id = saveObj.id.slice(2);
		delete saveObj.id;
		lsSpec = SpecsCash.SearchAndChangeByID(saveObj, lsSpec);
		chSp = SpecsCash.SearchAndChangeByID(saveObj, chSp);
	};
	localStorage.setItem('spec', JSON.stringify(lsSpec));
	localStorage.setItem('chsp', JSON.stringify(chSp));
	SpecsCash.SyncChanges();
};


SpecsCash.SearchAndChangeByID = function (spec, base){ //Ищит объект с таким же ID, если не находит, то создает новый
	for (var i = 0; i < base.length; i++){
		if(base[i]){
			if (base[i]._id == spec._id){
				for (var key in spec){
					if (spec[key]){
						base[i][key] = spec[key];
					};
				};
				return base;
			};
		};
	};
	base.push(spec);
	return base;
};

SpecsCash.SearchAndChangeOrDelByID = function (spec, base){ //Ищит объект с таким же ID, если не находит, то создает новый
	for (var i = 0; i < base.length; i++){
		if(base[i]){
			if (base[i]._id == spec._id){
				if (spec._state == 'deleted'){
					base.splice(i, 1) ;
					return base;
				};
				for (var key in spec){
					if (spec[key]){
						base[i][key] = spec[key];
					};
				};
				return base;
			};
		};
	};
	base.push(spec);
	return base;
};

SpecsCash.NewID = function(){
	if (localStorage['newid']){
		return ('newID' + (parseInt(localStorage['newid']) + 1));
	};
	localStorage.setItem('newid', 1000);
	return 'newID1000';
};

SpecsCash.SyncChanges = function(){
	if (localStorage['chsp']){
		var chSp = JSON.parse(localStorage['chsp']);
		//var newChSp = [];
		
		 while (chSp.length > 0){
			var spec = chSp.pop();
			if (spec['_id'][0] != 'n'){
				var idDB = spec['_id'];
				delete spec['_id'];
				spec['_lastmodified'] = (new Date).getTime();
				var newSpecData = JSON.stringify(spec);
				var newSpecUrl = Request.GetUrl('http://unimedica3.web-manufacture.net:810/spec/', {_id: idDB});
			 	SpecsCash.Server.set(newSpecUrl, newSpecData, 'text/plain', SpecsCash._setSpecFunction(idDB));
			}else{
				var idToUpdate = spec['_id'];
				delete spec['_id'];
				spec['_lastmodified'] = (new Date).getTime();
				var newSpecData = JSON.stringify(spec);
				SpecsCash.Server.add('http://unimedica3.web-manufacture.net:810/spec/', newSpecData, 'text/plain', SpecsCash._addSpecFunction(idToUpdate));	
			};
		};		
	}
	else{
		console.log('not required');
	}
};

SpecsCash._addSpecFunction = function(idToUpdate){
	return function(err, res){
		if (res){
			SpecsCash.UpdateID(idToUpdate, res);
			SpecsCash.RemoveFromShanged(idToUpdate);
		};
		if (err){
			console.log(err);
		};
	};
};

SpecsCash._setSpecFunction = function(idDB){
	return function(err, res){
		if (res){
			SpecsCash.RemoveFromShanged(idDB);
		};
		if (err){
			console.log(err);
		};
	};
};

SpecsCash._delSpecFunction = function(idDB){
	return function(err, res){
		if (res){
			SpecsCash.RemoveFromShanged(idDB);
			SpecsCash.RemoveFromLS(idDB);
		};
		if (err){
			console.log(err);
		};
	};
};

SpecsCash.UpdateID = function(idToUpdate, resivedID){
	var lsSpec = JSON.parse(localStorage['spec']);
	for (var i = 0; i < lsSpec.length; i++){
		if (lsSpec[i]._id == idToUpdate){
			lsSpec[i]._id = resivedID;
			break;
		};
	};
	localStorage.setItem('spec', JSON.stringify(lsSpec));
};

SpecsCash.RemoveFromShanged = function(idOfRemoval){
	if (!localStorage['chsp']) return;
	var chSp = JSON.parse(localStorage['chsp']);
	for (var i = 0; i < chSp.length; i++){
		if (chSp[i]){
			if (chSp[i]._id == idOfRemoval){
				chSp.splice(i, 1) ;
				break;
			};
		};
	};
	localStorage.setItem('chsp', JSON.stringify(chSp));
};

SpecsCash.RemoveFromLS = function(idOfRemoval){
	var spec = JSON.parse(localStorage['spec']);
	var spec2
	for (var i = 0; i < spec.length; i++){
		if(spec[i]){
			if (spec[i]._id == idOfRemoval){
				spec.splice(i, 1) ;
				break;
			};
			
		};
	};
	localStorage.setItem('spec', JSON.stringify(spec));
};

SpecsCash.KillSpec = function(){
	//var spec = this.get('^.specialist');
	//spec.del();
	spec = this;
	spec._id = spec.id.slice(2);
	if (spec['_id'][0] != 'n'){
		var idDB = spec['_id'];
		//delete spec['_id'];
		//var newSpecData = JSON.stringify(spec);
		var newSpecUrl = Request.GetUrl('http://unimedica3.web-manufacture.net:810/spec/', {_id: idDB});
		SpecsCash.Server.set(newSpecUrl, JSON.stringify({_state: 'deleted'}), 'text/plain', SpecsCash._delSpecFunction(idDB));
		//TestSpecsDB.Server.del(newSpecUrl, TestSpecsDB._delSpecFunction(idDB));
	}else{
		var idToUpdate = spec['_id']//.slice(2);
		//delete spec['_id'];
		//var newSpecData = JSON.stringify(spec);
		SpecsCash.RemoveFromShanged(idToUpdate);
		SpecsCash.RemoveFromLS(idToUpdate);
		//TestSpecsDB.Server.add('http://unimedica3.web-manufacture.net:810/spec/', newSpecData, 'text/plain', TestSpecsDB._addSpecFunction(idToUpdate));	
	};
};
	

SpecsCash.AddSpec = function(){
	for (var i = 0; i < SpecsCash.UN.length; i++){
		var spec = JSON.stringify(SpecsCash.UN[i]);
		SpecsCash.Server.add('http://unimedica3.web-manufacture.net:810/sync/', spec, 'text/plain',  function(){
			//alert('user Was Created');
		});
	};
};

//WS.DOMload(TestSpecsDB.Init);
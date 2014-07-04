TableFiller = {};


TableFiller.SaveObject = function(editObjectFormButton){
	var editObjectForm = editObjectFormButton.get('^.edit-object-proto');
	var allFields = editObjectForm.all('[field]');
	var proto = TableFiller.ObjectProto.clone();
	for (var i = 0; i < allFields.length; i++){
		if (allFields[i].get('@field') && proto.get('[field="' + allFields[i].get('@field') + '"]')){
			proto.get('[field="' + allFields[i].get('@field') + '"]').innerHTML = allFields[i].value;
		};
		
	};
	TableFiller.ObjectContainer.insertBefore(proto, editObjectForm);
	editObjectForm.del();
	
};

TableFiller.ShowEditObjectForm = function(objectToEditButton){
	var editObjectProto = TableFiller.EditObjectProto.clone();
	if (!objectToEditButton){
		TableFiller.ObjectContainer.ins(editObjectProto);
		return;
	};
	var objectToEdit = this.get('^.object-prototype');
	var allFields = objectToEdit.all('[field]');
	editObjectProto.id = objectToEdit.id;
	for (var i = 0; i < allFields.length; i++){
		if (allFields[i].get('@field') && editObjectProto.get('[field="' + allFields[i].get('@field') + '"]')){
			editObjectProto.get('[field="' + allFields[i].get('@field') + '"]').value = allFields[i].innerHTML;
		};
	};
	TableFiller.ObjectContainer.insertBefore(editObjectProto, objectToEdit);
	objectToEdit.del();
};

TableFiller.CancelChanges = function(s){
	var editProto = s.get('^.newSpec');
	if (editProto.is('.new')){
		editProto.del();
	}
	else {
		editProto.EditedSpecialist.show();
		editProto.del();
	}
};

TableFiller.DeleteObject = function(){
	var objectToDelete = this.get('^.object-prototype');
	//objectToDelete.linked.del();
	objectToDelete.del();	
};


TableFiller.ShowObjects = function(dataFromStorageArry){
	for (var i = 0; i < dataFromStorageArry.length; i++){
		TableFiller.ShowOneObject(dataFromStorageArry[i]);
	};
};
		

TableFiller.ShowOneObject = function(dataFromStorage){
	var proto = TableFiller.ObjectProto.clone();
	var allFields = proto.all('[field]');
	for (var key in dataFromStorage){
		for (var j = 0; j < allFields.length; j++){
			if (typeof dataFromStorage[key] == 'function'){
				proto.linked[key] = dataFromStorage[key];
			}else if (allFields[j].get('@field') == key){
				allFields[j].innerHTML = dataFromStorage[key];
			};
		};
				
	};
	if (proto.get('.check-button')){
		proto.get('.check-button').onclick = TableFiller.ObjectCheker;
	};
	if (proto.get('.delete-button')){
		proto.get('.delete-button').onclick = TableFiller.DeleteObject;
	};
	if (proto.get('.edit-button')){
		proto.get('.edit-button').onclick = TableFiller.ShowEditObjectForm;
	};
	proto.id = 'id' + dataFromStorage._id;
	proto.set('@key', dataFromStorage._id);
	proto.set('@fullname', dataFromStorage.name.toLowerCase());
	TableFiller.ObjectContainer.add(proto);
};

TableFiller.ObjectCheker = function(){
	var object = this.get('^.object-prototype');
	if (object.is('.checked')){
		object.del('.checked');
		TableFiller.ObjectContainer.onuncheck.fire(object);
	}else{
		object.add('.checked');
		TableFiller.ObjectContainer.oncheck.fire(object);
	};	
};



//________________________Поиск______________________________//




TableFiller.DisplayFoundedObjects = function(){
	var search = this.value;
	if (!search){
		TableFiller.ObjectContainer.all('.object-prototype').del('.hidden').del('.found');
			return;
	};
	TableFiller.ObjectContainer.all('.object-prototype').del('.found');
	TableFiller.ObjectContainer.all('.object-prototype').add('.hidden');
	var a = TableFiller.ObjectContainer.all('.object-prototype[fullname*="' + search.toLowerCase() + '"]').add('.found');
	TableFiller.ObjectContainer.all('.object-prototype.found').del('.hidden');
	
};


//__________________________________________________________//



TableFiller.Init = function(table){
	TableFiller.Storage = KLabStorage.GetStorage('http://unimedica3.web-manufacture.net:810');
	//получить ссылки на прототипы
	TableFiller.ObjectProto = table.get('.object-prototype');
	TableFiller.EditObjectProto = table.get('.edit-object-proto');
	TableFiller.ObjectContainer = table.get('.object-container');
	
	//TableFiller.SearchHintProto = table.get('.search-hint-proto');
	//TableFiller.SearchHintContainer = table.get('.search-hint-container');
	TableFiller.SearchInput = table.get('.hintable');
	
	
	EV.CreateEvent('oncheck', TableFiller.ObjectContainer);
	EV.CreateEvent('onuncheck', TableFiller.ObjectContainer);
	
	if (TableFiller.SearchInput){
		TableFiller.SearchInput.onchange = TableFiller.DisplayFoundedObjects;	
	};
	
	//
	//TableFiller.ShowObjects(TableFiller.Storage.all());
	TableFiller.ShowObjects([{"name":"qqq","telephone":"11","e-mail":"www","_lastmodified":1349717970128,"path":"/","_id":"50730fd26be410001200000b"},
								 {"e-mail":"qqq@uuu.uu","telephone":"755-55-55","_id":"506a05057154d02c0f00074e","_lastmodified":1349714957999,"name":"Алапян Людмила Евгеньевна", "path":"/"},
								 {"e-mail":"undefined","telephone":"undefined","_id":"506a05047154d02c0f00074d","name":"Алапян Шино Мишелино","path":"/"},
								 {"name":"Александрова Нина Виктровна","path":"/","_id":"506a05057154d02c0f00074f"},
								 {"name":"Алексей Николай Царик","path":"/","_id":"506a05057154d02c0f000750"},
								 {"e-mail":"566@hgh.uh","Tel":"999","_id":"506a05057154d02c0f000751","name":"Батурина Наталья Александровна","path":"/"},
								 {"name":"Беклемеш Владимир Федорович","path":"/","_id":"506a05057154d02c0f000752"}]);	
};

	
	

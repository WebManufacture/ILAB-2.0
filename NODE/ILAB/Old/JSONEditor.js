



JSONEditor = {};
JSONEditor.Init = function(obj, element, callback){
	
	//if (JSONEditor.objectInside) JSONEditor.callback(JSONEditor.objectInside, false);
	
	//JSONEditor.objectInside = obj;
	
	JSONEditor.editform = element;
	JSONEditor.container = element.get('.config-edit-form-container');
	JSONEditor.proto = element.get('.config-property.prototype');
	JSONEditor.callback = callback;
	
	
	
	
	JSONEditor.container.all('.config-property').del();
	JSONEditor.container.key = null;
	JSONEditor.container.id = null;
	
	element.get('.btn-ira.add').onclick = JSONEditor.AddEditable;
	element.get('.btn-ira.save').onclick = JSONEditor.Save;
	element.get('.btn-ira.cancel').onclick = function(){
		JSONEditor.editform.hide();
		//if (obj._id){
		//	JSONEditor.callback(obj, false);
		//}else{
		//	JSONEditor.callback();
		//};
	};
	
	JSONEditor.Display(obj);


};

JSONEditor.Display = function(obj){
	for (var key in obj){
		//if (!obj._id){
		//	delete JSONEditor.container.key;
		//	delete JSONEditor.container.id;
		//};
		if (key == '_id'){
			JSONEditor.container.AttrProperty('key');
			JSONEditor.container.key = obj._id;
			JSONEditor.container.id = 'id' + obj._id;
			continue;
		};
		
		var propProto = JSONEditor.proto.clone();
		var propKey = propProto.get('.config-property-name');
		var propValue = propProto.get('.config-property-value');
		propKey.innerHTML = key;
		propValue.innerHTML = obj[key];
		
		propProto.AttrProperty('propkey');
		propProto.AttrProperty('propvalue');
		propProto.propkey = key;
		propProto.propvalue = obj[key];
		
		JSONEditor.container.add(propProto);
		
	};	
};

JSONEditor.AddEditable = function(){
	var container = this.get('^.config-edit-form').get('.config-edit-form-container');
	var editedproto = JSONEditor.proto.clone();
	editedproto.get('.config-property-name').contentEditable='true';
	container.add(editedproto);
};

JSONEditor.Save = function(){
	var element = this.get('^.config-edit-form').get('.config-edit-form-container');
	var obj = {};
	if (element.key){
	obj._id = element.key;
	};
	var allFields = element.all('.config-property');
	for (var i = 0; i < allFields.length; i++){
		var b = allFields[i].get('.config-property-value').innerHTML;
		var a = allFields[i].get('.config-property-name').innerHTML;
		if (allFields[i].get('.config-property-name').textContent && allFields[i].get('.config-property-value').textContent){
			obj[allFields[i].get('.config-property-name').textContent] = allFields[i].get('.config-property-value').textContent;
		};
		allFields[i].get('.config-property-name').textContent = null;
		allFields[i].get('.config-property-value').textContent = null;
	};
	
	//JSONEditor.objectInside = null;
	JSONEditor.container.key = null;
	JSONEditor.editform.hide();
	JSONEditor.callback(obj, true);
	//alert(obj.toSource());
};









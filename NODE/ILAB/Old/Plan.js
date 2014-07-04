<script>
	Plan = {};
	Plan.ExampleSpesialists = ['Иванов Иван Иванович', 'Иващенко Сергей Михайлович', 'Ивченко Панас Петрович', 'Игнатенко Сергей Иванович', 'Игнатюк Владимир Николаевич'];
	Plan.Init = function(){
		Plan.DisplaySpesialists();
		
		spcDiv = DOM.get(".day-place.visits"); //специалист для просмотра визитов (левая колонка)
		spec_proto = proto.clone();
		spcDiv.add(spec_proto);
		
		proto = DOM(".day-place.visits .visitsInfo.prototype"); //визиты специалиста
		for (var i = 0; i < 7; i++){
			spec_proto = proto.clone();
			spcDiv.add(spec_proto);
		};
		
		spcDiv = DOM.get(".day-place.off");
		proto = DOM(".office.prototype");
		for (var i = 0; i < 15; i++){	//список контор
			spec_proto = proto.clone();
			spec_proto.set(null,'Company No.' + i);
			spcDiv.add(spec_proto);	
		};
		
		DOM.all(".day-place" ).each(function(elem){
			this.objectReceived = Plan.RouteObject;
		});
	};
	
	Plan.DisplaySpesialists = function(){
		var spcDiv = DOM.get("#specialists");
		var proto = DOM(".specialist.prototype");
		var sorted = Plan.ExampleSpesialists.sort(Plan.Sort);
		for (var i = 0; i <(Plan.ExampleSpesialists.length); i++){ //специаличты
			var spec_proto = proto.clone();
			spec_proto.get(".full-name").set(null, sorted[i]);
			spec_proto.set('@fullname', sorted[i].toLowerCase());
			spcDiv.add(spec_proto);	
		};
	};
	
	Plan.Sort = function(a, b){
		return a > b ? 1 : -1;
	};
	
	Plan.SortByRatingAndAlfabet = function(a, b){
		if (a.rating == b.rating){
			return a.query > b.query ? 1: -1;
		};
		return a.rating < b.rating ? 1 : -1;
	};
	
	Plan.SearchBegining = function(){
		//localStorage.removeItem('SearchTrot');
		DOM("#searchBox").show();
		if (localStorage.getItem('SearchTrot')){
			Plan.SearchTrot = JSON.parse(localStorage.getItem('SearchTrot'));
		}else{
			Plan.SearchTrot = [];
		};
		
	};
	
	Plan.SearchEnding = function(inputObj){
		DOM("#searchBox").hide();
		setTimeout('DOM.all(".fac.d[hint]").del()', 200);
		if (!inputObj.value) return;
		inputObj.value;
		if (Plan.SearchTrot[0]){
			for (var i = 0; i < Plan.SearchTrot.length; i++){
				if (inputObj.value == Plan.SearchTrot[i].query){
					Plan.SearchTrot[i].rating = parseInt(Plan.SearchTrot[i].rating) + 1;
					localStorage.setItem('SearchTrot', JSON.stringify(Plan.SearchTrot));
					return;
				};
			};
		};
		Plan.SearchTrot.push({query: inputObj.value, rating: 1});
		localStorage.setItem('SearchTrot', JSON.stringify(Plan.SearchTrot));
	};
	
	Plan.SetSearchValue = function(a){
		var attr = a.get('@hint');
		var inp = DOM.get('.search input');
		inp.value = attr;
		DOM.all('.fac.d').del();
		Plan.ShowSelectedByHint(attr);
		Plan.SearchEnding(inp);
	};
	
	Plan.SearchSpecRes = function(a){
		var search = a.value;
		if (!search) return;
		
		var proto=DOM.get('.fac.prototype');
		
		DOM.all('.fac.d').del();
		
		var SortedByRatingAndAlfabet = Plan.SearchTrot.sort(Plan.SortByRatingAndAlfabet);
		for(var i=0; i<SortedByRatingAndAlfabet.length; i++){
			var c=Plan.SearchTrot[i];//зачем объявлена переменная?
			var hint_proto=proto.clone();
			hint_proto.add('.hidden');
			hint_proto.add('.d');
			hint_proto.add('@hint',SortedByRatingAndAlfabet[i].query );
			DOM.get('.fac.container').add(hint_proto).set(null, SortedByRatingAndAlfabet[i].query);
		}
		
		DOM.all('.d[hint*="' + search.toLowerCase() + '"]').del('.hidden');
		
		
		Plan.ShowSelectedByHint(search);
		
	};
	
	Plan.ShowSelectedByHint = function(search){
		DOM.all('.specialist').del('.found');
		DOM.all('#specialists .specialist').add('.hidden');
		DOM.all('.specialist[fullname*="' + search.toLowerCase() + '"]').add('.found');
		DOM.all('.specialist.found').del('.hidden');
		
	};
	
	Plan.RouteObject = function(elem){
		if (elem.is(".hcal-day")){
			var mothAndYear = getMonthAndYear();
			var newDiv = this.add(Plan.CreateVisit());
			newDiv.DateElem.set(null, elem.innerHTML + ' ' + mothAndYear);
		};
		if (elem.is(".bTip")){
			var newDiv = this.add(Plan.CreateVisit());
			newDiv.ParamsElem.set(null, elem.innerHTML);
		};
	};
	
	Plan.AddParam = function(elem){
		if (elem.is(".hcal-day")){
			var mothAndYear = getMonthAndYear();
			var oldDiv = this.get(".date");
			oldDiv.set(null, elem.innerHTML + ' ' + mothAndYear);
		};
		if (elem.is(".bTip")){
			var oldDiv = this.get(".params");
			oldDiv.set(null, elem.innerHTML);
		};
	};
	
	Plan.CreateVisit = function(elem){
		var newDiv = DOM.div(".visit");
		newDiv.DateElem = newDiv.div(".date");
		newDiv.SpecElem = newDiv.div(".spec");
		newDiv.ParamsElem = newDiv.div(".params");
		//newDiv.add('@droppable','true');
		//newDiv.add('.drop-receiver');
		Drag.MakeReceiver(newDiv);
		Drag.MakeDraggable(newDiv);
		newDiv.objectReceived = Plan.AddParam;
		return newDiv;
		
	};
	
	function getMonthAndYear(){
		a = DOM.get('#PlanningCalendar');
		b = a.get('.header');
		return b.innerHTML;
	};
	
</script>
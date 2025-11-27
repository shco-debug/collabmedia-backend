var keywordModel = require('./../models/groupTagsModel.js');
var mongoose = require('mongoose');
var keywordModel_allTags = require('./../models/allTagsModel.js');

// Find all group tags
var findAll = function(req, res){    
	
	
    keywordModel.find({$or:[{status:1},{status:3}]},function(err,result){		
	if(err){ 		
		res.json(err);
	}
	else{
	    if(result.length==0){
		    res.json({"code":"404","msg":"Not Found"})
	    }
	    else{				
		    res.json({"code":"200","msg":"Success","response":result})
	    }
	}
    }).populate('MetaMetaTagID');
    
};

exports.findAll = findAll;

// Find all group tags
var withoutDescriptors = function(req, res){    
    keywordModel.find({status:1},function(err,result){		
	if(err){ 		
		res.json(err);
	}
	else{
	    if(result.length==0){
		    res.json({"code":"404","msg":"Not Found"})
	    }
	    else{				
		    res.json({"code":"200","msg":"Success","response":result})
	    }
	}
    }).populate('MetaMetaTagID');
    
};

exports.withoutDescriptors = withoutDescriptors;

// find all user defined group tags ---parul


var findAllUserGt = function(req, res){    
	
	
    keywordModel.find({status:2},function(err,result){
		
		if(err){ 		
			res.json(err);
		}
		else{
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
			}
			else{				
				res.json({"code":"200","msg":"Success","response":result})
			}
		}
	}).populate('MetaMetaTagID');
    
};

exports.findAllUserGt = findAllUserGt;


function chkGt(abc,callback){
    keywordModel.find({status:1,GroupTagTitle:abc},function(err,result){
		if (err) {
			throw err;
	    }
	    else{
		    callback(result);
		}
	});
};

//Keyword Parsing code
/*
1) input : sentence - inputText - String
2) Match With : string file comma separated - keywords - Array
*/

var keywordParsar = function (req , res){
	//console.log("-------- keywordParsar -----------");
	var isEqual = function(str1,str2){
		if( str1 == str2 ){
			return true;
		}
		else{
			return false
		}
	}
	
	var keywords = [];
	var matchedArr = [];
	var suggestedArr = [];
	
	//console.log("-------req.body.inputText------------",req.body.inputText);
	//var inputText = "As much belief in himself as others have in him.  More sharing of his own story with others. Bringing more personal joys into self";
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var findObj = {};
	findObj.conditions = {};
	findObj.fields = {};
	
	//conditions
	//findObj.conditions.$or = [ { status : 1 } , { status : 3 } ];
	//findObj.conditions.status = { $in : [1,3] };
	findObj.conditions.status = { $in : [3] };
	//findObj.conditions.$or = [ { status : 1 } ];
	//console.log("--------findObj------" , findObj);
	keywordModel.find(findObj.conditions , findObj.fields , function(err,result){		
		if(err){ 
			console.log(err)
			res.json(err);
		}
		else{
			if( result.length == 0 ){
				res.json({"code":"404","msg":"No keywords found!"})
			}
			else{				
				//var keywordsStr = "much belief,belief,belief in himself,teamwork,sharing,own story,Bringing, personal joys,self,happy,passion in life";
				//var keywordsStr = getRelativeKeywords(inputText , keywordArray);
				//keywords = keywordsStr.split(",");
				//get keywords
				for( var loop = 0; loop < result.length; loop++ ){
					keywords.push({"title":result[loop].GroupTagTitle , "id":result[loop]._id});
				}
				
				console.log("-------------keywords -------",keywords);
				//match keywords
				inputText = inputText.toLowerCase().trim();
				
				for( var loop = 0;loop < keywords.length; loop++ ){
					var keyword = {};
					keyword.title = keywords[loop].title.toLowerCase().trim();
					keyword.id = keywords[loop].id;
					
					var idxOf__keyword = inputText.indexOf(keyword.title);
					//if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " && idxOf__keyword != 0 ) && (inputText.substring(idxOf__keyword , idxOf__keyword + inputText.length -1) == " " && idxOf__keyword != (inputText.length -1) ) ){	
					if( idxOf__keyword != -1 && ( inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
					//if( idxOf__keyword != -1 ){
						if( isEqual(keyword.title , inputText) ){
							matchedArr.push(keyword);
							suggestedArr.push(keyword);
						}
						else{
							suggestedArr.push(keyword);
						}
					}
				}
				
				//console.log("inputText : ",inputText);
				/*matchedArr.sort(function (a, b) {
				  if (a.name > b.name) {
					return 1;
				  }
				  if (a.name < b.name) {
					return -1;
				  }
				  // a must be equal to b
				  return 0;
				});
				
				suggestedArr.sort(function (a, b) {
				  if (a.name > b.name) {
					return 1;
				  }
				  if (a.name < b.name) {
					return -1;
				  }
				  // a must be equal to b
				  return 0;
				});*/
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr
				};
				
				console.log(response);
				res.json({"code":"200","msg":"Success","response":response})
			}
		}
    });
}

var keywordParsar_2 = function (req , res){
	console.log("-------- keywordParsar -----------");
	var isEqual = function(str1,str2){
		if( str1 == str2 ){
			return true;
		}
		else{
			return false
		}
	}
	var keywordsArr = req.body.keywordsArr?req.body.keywordsArr:[];
	var keywords = [];
	var matchedArr = [];
	var suggestedArr = [];
	console.log("-------req.body.keywordsArr------------",req.body.keywordsArr);
	console.log("-------keywordsArr------------",keywordsArr);
	console.log("-------req.body.inputText------------",req.body.inputText);
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var findObj = {};
	findObj.conditions = {};
	findObj.fields = {};
	
	//conditions
	//findObj.conditions.$or = [ { status : 1 } , { status : 3 } ];
	//findObj.conditions.status = { $in : [1,3] };
	findObj.conditions.status = { $in : [3] };
	//findObj.conditions.$or = [ { status : 1 } ];
	console.log("--------findObj------" , findObj);
	keywordModel.find(findObj.conditions , findObj.fields , function(err,result){		
		if(err){ 
			console.log(err)
			res.json(err);
		}
		else{
			if( result.length == 0 ){
				res.json({"code":"404","msg":"No keywords found!"})
			}
			else{				
				for( var loop = 0; loop < result.length; loop++ ){
					keywords.push({"title":result[loop].GroupTagTitle , "id":result[loop]._id});
				}
				inputText = inputText.toLowerCase().trim();
				for( var loop = 0;loop < keywords.length; loop++ ){
					var keyword = {};
					keyword.title = keywords[loop].title.toLowerCase().trim();
					keyword.id = keywords[loop].id;
					keyword.from='ans';
					
					var idxOf__keyword = inputText.indexOf(keyword.title);
					//if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " && idxOf__keyword != 0 ) && (inputText.substring(idxOf__keyword , idxOf__keyword + inputText.length -1) == " " && idxOf__keyword != (inputText.length -1) ) ){	
					if( idxOf__keyword != -1 && ( inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
					//if( idxOf__keyword != -1 ){
						if( isEqual(keyword.title , inputText) ){
							matchedArr.push(keyword);
							suggestedArr.push(keyword);
						}
						else{
							suggestedArr.push(keyword);
						}
					}
				}
				var difference= [];
				var difference_neg= [];
				var len = 0;
				for(var c = 0; c<keywordsArr.length; c++){
					if (keywordsArr[c].from == 'ans') {
						len++;
					}
				}
				var keywordLength = len;
				console.log('suggestedArr.length >= keywordLength');
				console.log(suggestedArr.length +'>='+ keywordLength);
				//if (suggestedArr.length >= keywordLength) {
					for(var a=0; a < suggestedArr.length; a++){
						var flag = false;
						for (var b = 0; b < keywordsArr.length; b++) {
							if(keywordsArr[b].id==suggestedArr[a].id){
								flag=true;
							}
						}
						if(!flag ){
							difference.push(suggestedArr[a]);
						}
					}
				//}else{
					for(var a=0; a < keywordsArr.length; a++){
						var flag2 = false;
						for (var b = 0; b < suggestedArr.length; b++) {
							console.log(b+' == '+(keywordsArr.length-1));
							if(suggestedArr[b].id==keywordsArr[a].id && keywordsArr[a].from == 'ans'){
								flag2=true;
							}
						}
						if(!flag2 && keywordsArr[a].from == 'ans'){
							difference_neg.push(keywordsArr[a]);
						}
					}
				//}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				console.log(response);
				res.json({"code":"200","msg":"Success","response":response})
			}
		}
    });
}
//exports.keywordParsar = keywordParsar;
//exports.keywordParsar = keywordParsar_2;

//using map-reduce to make it faster...... 
var establishedModels = {};
function createModelForName(name) {
	if (!(name in establishedModels)) {
		var Any = new mongoose.Schema({ 
						_id: {type:String},
						value:{
							count : {type:String},
								inputText : {type:String,default:""},
								matchedArr : {type:Array,default:[]},
								suggestedArr : {type:Array,default:[]},
								newGT : {type:Array,default:[]},
								removeGT : {type:Array,default:[]}
							}
						}, 
						{ collection: name }
					);
		establishedModels[name] = mongoose.model(name, Any);
	}
	return establishedModels[name];
}

var keywordParsar_3 = function( req , res ){
	console.log("okok.....keywordParsar_v1_3--------------------------------------------------------");
	//return;
	var login_user_id = "";
	if(req.session.user){
		console.log("Session is set!");
		console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			login_user_id = req.session.user._id;
		}
		else{
			res.json({"status":"error","message":"Access Denied"});
			return;
		}
	}
	else{
		res.json({"status":"error","message":"Access Denied"});
		return;
	}
	
	var keywordsArr = req.body.keywordsArr?req.body.keywordsArr:[];
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var searchObj = {};
	
	searchObj.scope = {
		keywordsArr : keywordsArr,
		inputText : inputText
	};
	
	searchObj.map = function(){
		//var inputText = "teamwork pride red blue green nature";
		inputText = inputText.toLowerCase().trim();
		
		var matchedArr = [];
		var suggestedArr = [];
		var difference = [];
		var difference_neg = [];
		
		var keyword = {};
		this.GroupTagTitle = this.GroupTagTitle ? this.GroupTagTitle : "";
		keyword.title = this.GroupTagTitle.toLowerCase().trim();
		keyword.id = this._id;
		keyword.from = 'ans';
		
		if(keyword.title){		
			if(keyword.title!="" && keyword.title!=null && typeof(keyword.title)!="undefined"){
				
				var idxOf__keyword = inputText.indexOf(keyword.title);
				
				if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
					if( keyword.title == inputText ) { 
						matchedArr.push(keyword);
						suggestedArr.push(keyword);
					}
					else{
						suggestedArr.push(keyword);
					}
					emit(
						keyword.title,					// how to group
						{count: 1,matchedArr:matchedArr,suggestedArr:suggestedArr,newGT:suggestedArr,removeGT:difference_neg}	// associated data point (document)
					); 
				}
			}
		}	
	}
	searchObj.reduce = function(key , values){
		return values[0];
	}
	
	searchObj.query = {status:{$in:[1,3]} , MediaCount : {$gt : 0}};
	var outCollection = "UserKeywords_"+login_user_id;
	searchObj.out = {replace: outCollection};
	
	keywordModel.mapReduce(searchObj,function(err,result){
		console.log("Error---"+err);
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
		
		//var sortObj = sortObj = {'_id':-1};
			
		userMedia_userIdmodel.find({}).exec(function (err,result) { // Save
			if (err) {
				res.json({"status":"error","message":err});
				return;
			}
			else{
				
				var matchedArr = [];
				var suggestedArr = [];
				var difference = [];
				var difference_neg = [];
				
				for(var loop=0; loop < result.length; loop++){
					if(result[loop].value.matchedArr.length)
						matchedArr.push(result[loop].value.matchedArr[0]);
					
					if(result[loop].value.suggestedArr.length)
						suggestedArr.push(result[loop].value.suggestedArr[0]);
					
					if(result[loop].value.newGT.length)	
						difference.push(result[loop].value.newGT[0]);
					
					if(result[loop].value.removeGT.length)
						difference_neg.push(result[loop].value.removeGT[0]);
				}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				
				res.json({"code":"200","msg":"Success","response":response});return;
			}
		});
	})
}

var keywordParsar_4 = function( req , res ){
	console.log("okok.....keywordParsar_v1_3--------------------------------------------------------");
	//return;
	var login_user_id = "";
	if(req.session.user){
		console.log("Session is set!");
		console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			login_user_id = req.session.user._id;
		}
		else{
			res.json({"status":"error","message":"Access Denied"});
			return;
		}
	}
	else{
		res.json({"status":"error","message":"Access Denied"});
		return;
	}
	
	var keywordsArr = req.body.keywordsArr?req.body.keywordsArr:[];
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var searchObj = {};
	
	searchObj.scope = {
		keywordsArr : keywordsArr,
		inputText : inputText
	};
	
	searchObj.map = function(){
		//var inputText = "teamwork pride red blue green nature";
		inputText = inputText.toLowerCase().trim();
		
		var matchedArr = [];
		var suggestedArr = [];
		var difference = [];
		var difference_neg = [];
		
		var keyword = {};
		this.GroupTagTitle = this.GroupTagTitle ? this.GroupTagTitle : "";
		keyword.title = this.GroupTagTitle.toLowerCase().trim();
		keyword.id = this._id;
		keyword.from = 'ans';
		keyword.status = this.status;
		
		if(keyword.title){		
			if(keyword.title!="" && keyword.title!=null && typeof(keyword.title)!="undefined"){
				
				//inputText.split();
				//var inputTextArr = inputText.split(',');
				//var inputTextArr = inputText.split(' ');
				var inputTextArr = inputText.split(/[ ,]+/);
				
				var regexArr = [];
				var inputPattern = '';
				for( var loop = 0; loop < inputTextArr.length; loop++ ){
					var word = inputTextArr[loop].trim();
					if(word){
						regexArr.push('(\\b'+word+'\\b)');
						if(inputPattern != '' ){
							inputPattern = inputPattern+'|(\\b'+word+'\\b)';
						}
						else{
							inputPattern = '(\\b'+word+'\\b)';
						}
						
					}
				}

				//console.log();
				//var idxOf__keyword = inputText.indexOf(keyword.title);
				var idxOf__keyword = keyword.title.match('/'+inputPattern+'/i');
				
				//if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
				if( idxOf__keyword ){
					if( keyword.title == inputText ) { 
						matchedArr.push(keyword);
						suggestedArr.push(keyword);
					}
					else{
						suggestedArr.push(keyword);
					}
					emit(
						keyword.title,					// how to group
						{count: 1,status:this.status,matchedArr:matchedArr,suggestedArr:suggestedArr,newGT:suggestedArr,removeGT:difference_neg}	// associated data point (document)
					); 
				}
			}
		}	
	}
	searchObj.reduce = function(key , values){
		return values[0];
	}
	
	searchObj.query = {status:{$in:[1,3]}};
	var outCollection = "UserKeywords_"+login_user_id;
	searchObj.out = {replace: outCollection};
	
	keywordModel.mapReduce(searchObj,function(err,result){
		console.log("Error---"+err);
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
		
		//var sortObj = sortObj = {'_id':-1};
			
		userMedia_userIdmodel.find({}).exec(function (err,result) { // Save
			if (err) {
				res.json({"status":"error","message":err});
				return;
			}
			else{
				
				var matchedArr = [];
				var suggestedArr = [];
				var difference = [];
				var difference_neg = [];
				
				for(var loop=0; loop < result.length; loop++){
					if(result[loop].value.matchedArr.length)
						matchedArr.push(result[loop].value.matchedArr[0]);
					
					if(result[loop].value.suggestedArr.length)
						suggestedArr.push(result[loop].value.suggestedArr[0]);
					
					if(result[loop].value.newGT.length)	
						difference.push(result[loop].value.newGT[0]);
					
					if(result[loop].value.removeGT.length)
						difference_neg.push(result[loop].value.removeGT[0]);
				}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				
				res.json({"code":"200","msg":"Success","response":response});return;
			}
		});
	})
}



var keywordParsar_3test = function (req , res){
	console.log("-------- keywordParsar -----------");
	var isEqual = function(str1,str2){
		if( str1 == str2 ){
			return true;
		}
		else{
			return false
		}
	}
	var keywordsArr = req.body.keywordsArr?req.body.keywordsArr:[];
	var keywords = [];
	var matchedArr = [];
	var suggestedArr = [];
	
	console.log("-------req.body.keywordsArr------------",req.body.keywordsArr);
	console.log("-------keywordsArr------------",keywordsArr);
	console.log("-------req.body.inputText------------",req.body.inputText);
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var findObj = {};
	findObj.conditions = {};
	findObj.fields = {};
	
	//conditions
	//findObj.conditions.$or = [ { status : 1 } , { status : 3 } ];
	//findObj.conditions.status = { $in : [1,3] };
	findObj.conditions.status = { $in : [3] };
	//findObj.conditions.$or = [ { status : 1 } ];
	console.log("--------findObj------" , findObj);
	keywordModel.find(findObj.conditions , findObj.fields , function(err,result){		
		if(err){ 
			console.log(err)
			res.json(err);
		}
		else{
			if( result.length == 0 ){
				res.json({"code":"404","msg":"No keywords found!"})
			}
			else{				
				for( var loop = 0; loop < result.length; loop++ ){
					keywords.push({"title":result[loop].GroupTagTitle , "id":result[loop]._id});
				}
				inputText = inputText.toLowerCase().trim();
				for( var loop = 0;loop < keywords.length; loop++ ){
					var keyword = {};
					keyword.title = keywords[loop].title.toLowerCase().trim();
					keyword.id = keywords[loop].id;
					keyword.from='ans';
					
					var idxOf__keyword = inputText.indexOf(keyword.title);
					//if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " && idxOf__keyword != 0 ) && (inputText.substring(idxOf__keyword , idxOf__keyword + inputText.length -1) == " " && idxOf__keyword != (inputText.length -1) ) ){	
					if( idxOf__keyword != -1 && ( inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
					//if( idxOf__keyword != -1 ){
						if( isEqual(keyword.title , inputText) ){
							matchedArr.push(keyword);
							suggestedArr.push(keyword);
						}
						else{
							suggestedArr.push(keyword);
						}
					}
				}
				var difference= [];
				var difference_neg= [];
				var len = 0;
				for(var c = 0; c<keywordsArr.length; c++){
					if (keywordsArr[c].from == 'ans') {
						len++;
					}
				}
				var keywordLength = len;
				console.log('suggestedArr.length >= keywordLength');
				console.log(suggestedArr.length +'>='+ keywordLength);
				//if (suggestedArr.length >= keywordLength) {
					for(var a=0; a < suggestedArr.length; a++){
						var flag = false;
						for (var b = 0; b < keywordsArr.length; b++) {
							if(keywordsArr[b].id==suggestedArr[a].id){
								flag=true;
							}
						}
						if(!flag ){
							difference.push(suggestedArr[a]);
						}
					}
				//}else{
					for(var a=0; a < keywordsArr.length; a++){
						var flag2 = false;
						for (var b = 0; b < suggestedArr.length; b++) {
							console.log(b+' == '+(keywordsArr.length-1));
							if(suggestedArr[b].id==keywordsArr[a].id && keywordsArr[a].from == 'ans'){
								flag2=true;
							}
						}
						if(!flag2 && keywordsArr[a].from == 'ans'){
							difference_neg.push(keywordsArr[a]);
						}
					}
				//}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				console.log(response);
				res.json({"code":"200","msg":"Success","response":response})
			}
		}
    });
}

//On 17 Nov 2017 - Fixing keyword parsing bugs.
var keywordParsar_V3_2 = function( req , res ){
	console.log("okok.....keywordParsar_V3_2--------------------------------------------------------");
	//return;
	var login_user_id = "";
	if(req.session.user){
		console.log("Session is set!");
		console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			login_user_id = req.session.user._id;
		}
		else{
			res.json({"status":"error","message":"Access Denied"});
			return;
		}
	}
	else{
		res.json({"status":"error","message":"Access Denied"});
		return;
	}
	
	var keywordsArr = req.body.keywordsArr?req.body.keywordsArr:[];
	var inputText = req.body.inputText ? req.body.inputText : "";
	
	var searchObj = {};
	
	searchObj.scope = {
		keywordsArr : keywordsArr,
		inputText : inputText
	};
	
	searchObj.map = function(){
		//var inputText = "teamwork pride red blue green nature";
		inputText = inputText.toLowerCase().trim();
		
		var matchedArr = [];
		var suggestedArr = [];
		var difference = [];
		var difference_neg = [];
		
		var keyword = {};
		this.GroupTagTitle = this.GroupTagTitle ? this.GroupTagTitle : "";
		keyword.title = this.GroupTagTitle.toLowerCase().trim();
		keyword.id = this._id;
		keyword.from = 'ans';
		
		if(keyword.title){		
			if(keyword.title!="" && keyword.title!=null && typeof(keyword.title)!="undefined"){
				
				var idxOf__keyword = inputText.indexOf(keyword.title);
				
				if( idxOf__keyword != -1 && (inputText.substring(idxOf__keyword - 1 , idxOf__keyword) == " " || idxOf__keyword == 0 || idxOf__keyword == (inputText.length -1) ) ){
					if( keyword.title == inputText ) { 
						matchedArr.push(keyword);
						suggestedArr.push(keyword);
					}
					else{
						suggestedArr.push(keyword);
					}
					emit(
						keyword.title,					// how to group
						{count: 1,matchedArr:matchedArr,suggestedArr:suggestedArr,newGT:suggestedArr,removeGT:difference_neg}	// associated data point (document)
					); 
				}
			}
		}	
	}
	searchObj.reduce = function(key , values){
		return values[0];
	}
	
	searchObj.query = {status:{$in:[1,3]} , MediaCount : {$gt : 0}};
	var outCollection = "UserKeywords_"+login_user_id;
	searchObj.out = {replace: outCollection};
	
	keywordModel.mapReduce(searchObj,function(err,result){
		console.log("Error---"+err);
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
		
		//var sortObj = sortObj = {'_id':-1};
			
		userMedia_userIdmodel.find({}).exec(function (err,result) { // Save
			if (err) {
				res.json({"status":"error","message":err});
				return;
			}
			else{
				
				var matchedArr = [];
				var suggestedArr = [];
				var difference = [];
				var difference_neg = [];
				
				for(var loop=0; loop < result.length; loop++){
					if(result[loop].value.matchedArr.length)
						matchedArr.push(result[loop].value.matchedArr[0]);
					
					if(result[loop].value.suggestedArr.length)
						suggestedArr.push(result[loop].value.suggestedArr[0]);
					
					if(result[loop].value.newGT.length)	
						difference.push(result[loop].value.newGT[0]);
					
					if(result[loop].value.removeGT.length)
						difference_neg.push(result[loop].value.removeGT[0]);
				}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				
				res.json({"code":"200","msg":"Success","response":response});return;
			}
		});
	})
}


var keywordParsar_3_alltags = function( req , res ){
	//console.log("okok.....keywordParsar_v1_3--------------------------------------------------------");
	//return;
	var login_user_id = "";
	if(req.session.user){
		console.log("Session is set!");
		console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			login_user_id = req.session.user._id;
		}
		else{
			res.json({"status":"error","message":"Access Denied"});
			return;
		}
	}
	else{
		res.json({"status":"error","message":"Access Denied"});
		return;
	}
	
	var keywordsArr = req.body.keywordsArr ? req.body.keywordsArr : [];
	var inputText = req.body.inputText ? req.body.inputText.toLowerCase().trim() : "";
	
	var searchObj = {};
	
	searchObj.scope = {
		keywordsArr : keywordsArr,
		inputText : inputText
	};
	
	searchObj.map = function(){
		//var inputText = "teamwork pride red blue green nature";
		inputText = inputText;
		
		var matchedArr = [];
		var suggestedArr = [];
		var difference = [];
		var difference_neg = [];
		
		var keyword = {};
		this.GroupTagTitle = this.GroupTagTitle ? this.GroupTagTitle : "";
		keyword.title = this.GroupTagTitle.toLowerCase().trim();
		keyword.id = this.gt_id;
		keyword.from = 'ans';
		
		if(keyword.title){		
			if(keyword.title!="" && keyword.title!=null && typeof(keyword.title)!="undefined"){
				
				var idxOf__keyword = inputText.indexOf(keyword.title);
				var keywordLength = keyword.title.length;
				
				if (new RegExp("\\b"+keyword.title+"\\b").test(inputText)) {	
					if( keyword.title == inputText ) {
						matchedArr.push(keyword);
						suggestedArr.push(keyword);
					}
					else{
						suggestedArr.push(keyword);
					}
					emit(
						keyword.title,					// how to group
						{count: 1,matchedArr:matchedArr,suggestedArr:suggestedArr,newGT:suggestedArr,removeGT:difference_neg}	// associated data point (document)
					); 
				}
			}
		}	
	}
	searchObj.reduce = function(key , values){
		return values[0];
	}
	
	//searchObj.query = {status:{$in:[1,3]} , MediaCount : {$gt : 0}};
	searchObj.query = { 	//need to add MediaCount in condition.
		status : {
			$in : [1,3]
		},
		MetaMetaTagID : { 
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase 
		}/*,
		MediaCount : {  
			$gt : 0
		}*/
	};
	
	var outCollection = "UserKeywords_"+login_user_id;
	searchObj.out = {replace: outCollection};
	
	keywordModel_allTags.mapReduce(searchObj,function(err,result){
		console.log("Error---"+err);
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
		
		//var sortObj = sortObj = {'_id':-1};
		userMedia_userIdmodel.find({}).exec(function (err,result) { // Save
			if (err) {
				res.json({"status":"error","message":err});
				return;
			}
			else{
				
				var matchedArr = [];
				var suggestedArr = [];
				var difference = [];
				var difference_neg = [];
				
				for(var loop=0; loop < result.length; loop++){
					if(result[loop].value.matchedArr.length)
						matchedArr.push(result[loop].value.matchedArr[0]);
					
					if(result[loop].value.suggestedArr.length)
						suggestedArr.push(result[loop].value.suggestedArr[0]);
					
					if(result[loop].value.newGT.length)	
						difference.push(result[loop].value.newGT[0]);
					
					if(result[loop].value.removeGT.length)
						difference_neg.push(result[loop].value.removeGT[0]);
				}
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg
				};
				res.json({"code":"200","msg":"Success","response":response});return;
			}
		});
	})
}

var keywordParsar_aggregate = function( req , res ){
	//console.log("okok.....keywordParsar_v1_3--------------------------------------------------------");
	//return;
	var login_user_id = "";
	if(req.session && req.session.user){
		if( req.session.user._id != undefined ){
			login_user_id = req.session.user._id;
		}
		else{
			res.json({"status":"error","message":"Access Denied"});
			return;
		}
	}
	else{
		res.json({"status":"error","message":"Access Denied"});
		return;
	}
	
	var keywordsArr = req.body.keywordsArr ? req.body.keywordsArr : [];
	var inputText = req.body.inputText ? req.body.inputText.toLowerCase().trim() : "";
	inputText = inputText.replace(/["']/g, "");
	
	// Use groupTags with Tags array instead of alltags collection
	// This replicates the exact logic from scrpt but uses groupTags.Tags
	
	// Use the exact same approach as scrpt: $text search + mapReduce logic
	
	// Set a timeout to prevent hanging (increased to 45 seconds for large datasets)
	var timeoutId = setTimeout(function() {
		if (!res.headersSent) {
			res.json({
				"code": "200",
				"msg": "Success",
				"response": {
					"inputText": inputText,
					"matchedArr": [],
					"suggestedArr": [],
					"newGT": [],
					"removeGT": [],
					"result": []
				}
			});
		}
	}, 45000); // 45 second timeout
	
	// Direct search for GroupTags where GroupTagTitle matches input text
	// Use case-insensitive regex for exact match or word boundary match
	var queryConditions = {
		GroupTagTitle: new RegExp("^" + inputText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i"),  // Escape special regex chars and exact match
		status: { $in: [1, 3] },
		MetaMetaTagID: { 
			$nin: process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase || []
		}
	};
	
	keywordModel.find(queryConditions)
		.limit(100)
		.then(function(groupTags) {
		clearTimeout(timeoutId);
		
		// Process tags: Find GroupTags where GroupTagTitle matches input words, then return ALL tags from those groups
		var matchedArr = [];
		var suggestedArr = [];
		var difference = [];
		var difference_neg = [];
		
		// All groupTags returned already match, so use them directly
		var matchingGroupTags = groupTags || [];
		
		// Additional filtering: ensure exact word boundary match
		var finalMatchingGroupTags = [];
		for(var i = 0; i < matchingGroupTags.length; i++) {
			var groupTag = matchingGroupTags[i];
			var groupTagTitle = groupTag.GroupTagTitle ? groupTag.GroupTagTitle.toLowerCase().trim() : "";
			
			if(groupTagTitle != "" && groupTagTitle != null) {
				// Check if GroupTagTitle exactly matches any input word
				var isMatch = false;
				for(var w = 0; w < inputWords.length; w++) {
					var inputWord = inputWords[w].toLowerCase().trim();
					// Exact match or word boundary match
					if (groupTagTitle === inputWord || new RegExp("\\b" + groupTagTitle + "\\b").test(inputWord) || new RegExp("\\b" + inputWord + "\\b").test(groupTagTitle)) {
						console.log("Found GroupTag:", groupTag.GroupTagTitle);
						isMatch = true;
						break;
					}
				}
				if(isMatch) {
					finalMatchingGroupTags.push(groupTag);
				}
			}
		}
		matchingGroupTags = finalMatchingGroupTags;
		
		// For each matching GroupTag, return ALL tags from that group
		for(var i = 0; i < matchingGroupTags.length; i++) {
			var groupTag = matchingGroupTags[i];
			var groupTagTitle = groupTag.GroupTagTitle;
			
			// Get all active tags from this group
			if(groupTag.Tags && groupTag.Tags.length > 0) {
				var activeTags = groupTag.Tags.filter(function(t) { return t.status === 1; });
				
				// Create a keyword object for each tag
				for(var j = 0; j < activeTags.length; j++) {
					var tag = activeTags[j];
					
					if(tag.TagTitle) {
						var groupTagIdStr = groupTag._id ? String(groupTag._id) : null;
						var tagIdStr = tag._id ? String(tag._id) : null;
						
						if(!groupTagIdStr || !tagIdStr) {
							continue; // Skip if IDs are missing
						}
						
						var keywordObj = {
							keyword: {
								title: tag.TagTitle,  // Tag title (e.g., "tag1")
								id: groupTagIdStr,     // GroupTag ID (string)
								tagId: tagIdStr,       // Tag ID (string)
								groupTitle: groupTagTitle,  // GroupTag title (e.g., "labyrinth")
								tags: activeTags,     // All tags from this group for reference
								from: 'ans'
							}
						};
						
						// Check if exact match
						var isExactMatch = false;
						for(var w = 0; w < inputWords.length; w++) {
							if(inputWords[w].toLowerCase().trim() === groupTagTitle.toLowerCase().trim()) {
								isExactMatch = true;
								break;
							}
						}
						
						if(isExactMatch) {
							matchedArr.push(keywordObj);
							suggestedArr.push(keywordObj);
						} else {
							suggestedArr.push(keywordObj);
						}
						difference.push(keywordObj);
					}
				}
			}
		}
		
		// Create response in the exact same format as scrpt
		var response = {
			"inputText": inputText,
			"matchedArr": matchedArr,
			"suggestedArr": suggestedArr,
			"newGT": difference,
			"removeGT": difference_neg,
			"result": suggestedArr  // Frontend expects this
		};
		
		res.json({"code":"200","msg":"Success","response":response});
		return;
		
	}).catch(function(err) {
		clearTimeout(timeoutId);
		
		// If query fails, fall back to simpler search
		if (err) {
			console.log("Primary query failed, using fallback:", err.message);
			
			// Fallback: Direct query for GroupTagTitle match (same as primary query)
			var fallbackQuery = {
				GroupTagTitle: new RegExp("^" + inputText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i"),  // Escape special regex chars and exact match
				status: { $in: [1, 3] },
				MetaMetaTagID: { 
					$nin: process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase || []
				}
			};
			
			keywordModel.find(fallbackQuery)
				.limit(100)
				.lean() // Use lean() for faster queries
				.then(function(groupTags) {
					clearTimeout(timeoutId);
					
					var matchedArr = [];
					var suggestedArr = [];
					var difference = [];
					var difference_neg = [];
					
					// Split input text into words for matching
					var inputWords = inputText.split(/\s+/).filter(function(word) { return word.length > 0; });
					
					// All groupTags returned already match, so use them directly
					var matchingGroupTags = groupTags || [];
					
					// Additional filtering: ensure exact word boundary match
					var finalMatchingGroupTags = [];
					for(var i = 0; i < matchingGroupTags.length; i++) {
						var groupTag = matchingGroupTags[i];
						var groupTagTitle = groupTag.GroupTagTitle ? groupTag.GroupTagTitle.toLowerCase().trim() : "";
						
						if(groupTagTitle != "" && groupTagTitle != null) {
							// Check if GroupTagTitle exactly matches any input word
							var isMatch = false;
							for(var w = 0; w < inputWords.length; w++) {
								var inputWord = inputWords[w].toLowerCase().trim();
								// Exact match or word boundary match
								if (groupTagTitle === inputWord || new RegExp("\\b" + groupTagTitle + "\\b").test(inputWord) || new RegExp("\\b" + inputWord + "\\b").test(groupTagTitle)) {
									console.log("Found GroupTag:", groupTag.GroupTagTitle);
									isMatch = true;
									break;
								}
							}
							if(isMatch) {
								finalMatchingGroupTags.push(groupTag);
							}
						}
					}
					matchingGroupTags = finalMatchingGroupTags;
				
					// For each matching GroupTag, return ALL tags from that group
					for(var i = 0; i < matchingGroupTags.length; i++) {
						var groupTag = matchingGroupTags[i];
						var groupTagTitle = groupTag.GroupTagTitle;
						
						// Get all active tags from this group
						if(groupTag.Tags && groupTag.Tags.length > 0) {
							var activeTags = groupTag.Tags.filter(function(t) { return t.status === 1; });
							
							// Create a keyword object for each tag
							for(var j = 0; j < activeTags.length; j++) {
								var tag = activeTags[j];
								
								if(tag.TagTitle) {
									var groupTagIdStr = groupTag._id ? String(groupTag._id) : null;
									var tagIdStr = tag._id ? String(tag._id) : null;
									
									if(!groupTagIdStr || !tagIdStr) {
										continue; // Skip if IDs are missing
									}
									
									var keywordObj = {
										keyword: {
											title: tag.TagTitle,  // Tag title (e.g., "tag1")
											id: groupTagIdStr,     // GroupTag ID (string)
											tagId: tagIdStr,       // Tag ID (string)
											groupTitle: groupTagTitle,  // GroupTag title (e.g., "labyrinth")
											tags: activeTags,     // All tags from this group for reference
											from: 'ans'
										}
									};
									
									// Check if exact match
									var isExactMatch = false;
									for(var w = 0; w < inputWords.length; w++) {
										if(inputWords[w].toLowerCase().trim() === groupTagTitle.toLowerCase().trim()) {
											isExactMatch = true;
											break;
										}
									}
									
									if(isExactMatch) {
										matchedArr.push(keywordObj);
										suggestedArr.push(keywordObj);
									} else {
										suggestedArr.push(keywordObj);
									}
									difference.push(keywordObj);
								}
							}
						}
					}
				
				var response = {
					"inputText": inputText,
					"matchedArr": matchedArr,
					"suggestedArr": suggestedArr,
					"newGT": difference,
					"removeGT": difference_neg,
					"result": suggestedArr
				};
				
				res.json({"code":"200","msg":"Success","response":response});
			return;
				
			}).catch(function(fallbackErr) {
				if (!res.headersSent) {
					res.json({"status":"error","message":"No keywords found"});
				}
			});
		} else {
			if (!res.headersSent) {
					res.json({"status":"error","message":err});
			}
		}
			return;
		});
}
//exports.keywordParsar = keywordParsar;
//exports.keywordParsar = keywordParsar_2;
//exports.keywordParsar = keywordParsar_3;	//map-reduce based faster algorithm.
//exports.keywordParsar = keywordParsar_4
//exports.keywordParsar = keywordParsar_3_alltags;	//map-reduce based faster algorithm + alltags collection - cron job is updating it on hourly basis.
exports.keywordParsar = keywordParsar_aggregate;

var test_duplicate = function(req, res){    
	keywordModel.find({$or:[{status:1},{status:3}]},function(err,result){
		if(err){ 		
			res.json(err);
		}		
		else{	
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
			}	
			else{				
				res.json({"code":"200","msg":"Success","response":result})
			}	
		}		
	}).populate('MetaMetaTagID');
};
exports.test_duplicate = test_duplicate;

var isAlreadyExist = function( keyword ){
	keywordModel.find({GroupTagTitle:keyword,$or:[{status:1},{status:3}]},function(err,result){
		if(err){ 		
			res.json(err);
		}		
		else{	
			if(result.length == 0){
				res.json({"code":"404","msg":"Not Found"})
			}	
			else{
				for( var loop = 0; loop < result.length; loop++ ){
					if( result[loop].GroupTagTitle == result[loop2].GroupTagTitle ){
							
					}
				}
				
				res.json({"code":"200","msg":"Success","response":result})
			}	
		}		
	})
	
}
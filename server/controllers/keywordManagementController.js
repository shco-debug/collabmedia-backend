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
	inputText = inputText.replace(/["']/g, "");
	
	console.log("🔍 DEBUG: Starting keywordParsar_aggregate");
	console.log("🔍 DEBUG: inputText =", inputText);
	console.log("🔍 DEBUG: keywordsArr =", keywordsArr);
	
	// Modern aggregation pipeline replaces the old mapReduce approach
	
	// Original logic converted to modern syntax (same exact behavior as mapReduce)
	var query = { 	//need to add MediaCount in condition.
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
	
	console.log("🔍 DEBUG: Query =", JSON.stringify(query));
	
	// Use modern MongoDB aggregation pipeline (better than mapReduce)
	const pipeline = [
		{
			$match: query
		},
		{
			$addFields: {
				lowercaseTitle: {
					$toLower: {
						$ifNull: ["$GroupTagTitle", ""]
					}
				}
			}
		},
		{
			$addFields: {
				trimmedTitle: {
					$trim: {
						input: "$lowercaseTitle"
					}
				}
			}
		},
		{
			$match: {
				trimmedTitle: { $ne: "" }
			}
		},
		{
			$addFields: {
				debugInfo: {
					$concat: ["Found GroupTag: ", "$trimmedTitle", " for input: ", inputText]
				}
			}
		},
		{
			$addFields: {
				isExactMatch: {
					$eq: ["$trimmedTitle", inputText]
				},
				isWordMatch: {
					$regexMatch: {
						input: inputText,
						regex: {
							$concat: ["\\b", "$trimmedTitle", "\\b"]
						}
					}
				}
			}
		},
		{
			$match: {
				isWordMatch: true
			}
		},
		{
			$group: {
				_id: "$trimmedTitle",
				keyword: {
					$first: {
						title: "$trimmedTitle",
						id: "$_id",
						from: "ans"
					}
				},
				isExactMatch: { $first: "$isExactMatch" }
			}
		},
		{
			$project: {
				_id: 1,
				keyword: 1,
				isExactMatch: 1
			}
		}
	];
	
	console.log("🔍 DEBUG: Pipeline =", JSON.stringify(pipeline, null, 2));

	// First, let's check what GroupTags exist in the database
	keywordModel.find(query).limit(5).then(function(debugResult){
		console.log("🔍 DEBUG: Found GroupTags in database =", debugResult.length);
		if(debugResult.length > 0) {
			console.log("🔍 DEBUG: Sample GroupTag =", JSON.stringify(debugResult[0], null, 2));
		}
		
		// Let's also check the collection name and model
		console.log("🔍 DEBUG: Collection name =", keywordModel.collection.name);
		console.log("🔍 DEBUG: Model name =", keywordModel.modelName);
		
		// Let's also check ALL GroupTags without any filters
		keywordModel.find({}).limit(3).then(function(allGroupTags){
			console.log("🔍 DEBUG: Total GroupTags in database =", allGroupTags.length);
			if(allGroupTags.length > 0) {
				console.log("🔍 DEBUG: Sample GroupTag (no filters) =", JSON.stringify(allGroupTags[0], null, 2));
			}
			
			// Let's check specifically for GroupTags with title "tax"
			keywordModel.find({"GroupTagTitle": "tax"}).then(function(taxGroupTags){
				console.log("🔍 DEBUG: GroupTags with title 'tax' =", taxGroupTags.length);
				if(taxGroupTags.length > 0) {
					console.log("🔍 DEBUG: Tax GroupTag =", JSON.stringify(taxGroupTags[0], null, 2));
				}
				
				// Now run the aggregation
				keywordModel.aggregate(pipeline).then(function(result){
					console.log("🔍 DEBUG: Aggregation completed successfully");
					console.log("🔍 DEBUG: Raw result =", JSON.stringify(result, null, 2));
					console.log("🔍 DEBUG: Result length =", result.length);
		
		// Process aggregation results to match original mapReduce output format
				var matchedArr = [];
				var suggestedArr = [];
				var difference = [];
				var difference_neg = [];
				
		for(var i = 0; i < result.length; i++) {
			var keyword = result[i].keyword;
			console.log("🔍 DEBUG: Processing result", i, "=", JSON.stringify(keyword));
			console.log("🔍 DEBUG: isExactMatch =", result[i].isExactMatch);
			
			if(result[i].isExactMatch) {
				matchedArr.push(keyword);
				suggestedArr.push(keyword);
				console.log("🔍 DEBUG: Added to matchedArr and suggestedArr (exact match)");
			} else {
				suggestedArr.push(keyword);
				console.log("🔍 DEBUG: Added to suggestedArr only (partial match)");
			}
			difference.push(keyword);
		}
		
		console.log("🔍 DEBUG: Final matchedArr =", JSON.stringify(matchedArr));
		console.log("🔍 DEBUG: Final suggestedArr =", JSON.stringify(suggestedArr));
		console.log("🔍 DEBUG: Final difference =", JSON.stringify(difference));
				
				var response = {
					"inputText":inputText,
					"matchedArr":matchedArr,
					"suggestedArr":suggestedArr,
					"newGT":difference,
					"removeGT":difference_neg,
					"result": result
				};
			console.log("🔍 DEBUG: Final response =", JSON.stringify(response, null, 2));
				res.json({"code":"200","msg":"Success","response":response});return;
		}).catch(function(err) {
			console.log("🔍 DEBUG: Aggregation error =", err);
			res.json({"status":"error","message":err});
			return;
		});
				}).catch(function(err) {
					console.log("🔍 DEBUG: Tax GroupTag query error =", err);
					res.json({"status":"error","message":err});
					return;
				});
			}).catch(function(err) {
				console.log("🔍 DEBUG: All GroupTags query error =", err);
				res.json({"status":"error","message":err});
				return;
			});
		}).catch(function(err) {
			console.log("🔍 DEBUG: Database query error =", err);
			res.json({"status":"error","message":err});
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
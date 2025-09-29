var media = require('./../models/mediaModel.js');
var user = require('./../models/userModel.js');
var formidable = require('formidable');
var fs = require('fs');
var mongoose = require('mongoose');

//var media = require('./../models/mediaM3Model.js');

var GroupTag = require('./../models/groupTagsModel.js');
var keywordModel_allTags = require('../models/allTagsModel.js');

Array.prototype.shuffle = function() {
	var input = this;
	for(var i = input.length-1; i >=0; i--) {
		var randomIndex = Math.floor(Math.random()*(i+1));
		var itemAtIndex = input[randomIndex];
		input[randomIndex] = input[i];
		input[i] = itemAtIndex;
	}
	return input;
}

/*
	Media Search Engine :
  - Media Searching & Ranking according to Media Score 
	& best matched FSGs criteria 

*/
var __fullfillMediaLimit = function(result , pageLimit , mediaType , res){
	//console.log("---------__fullfillMediaLimit-----");
	var outputRecords = [];
	var newLimit = 0;
	
	var outputRecords = result;
	//console.log("outputRecords.length = ",outputRecords.length);
	if( outputRecords.length < pageLimit ){
		newLimit = parseInt(pageLimit - result.length);
		
		console.log("---------In __fullfillMediaLimit if block-----newLimit = ",newLimit);
		var sortObj = {UploadedOn:-1};
		var fields = {};
		fields = {
			_id:1,
			Title:1,
			Prompt:1,
			Locator:1,
			Location:1,
			MediaType:1,
			ContentType:1,
			UploadedOn:1,
			UploaderID:1,
			Content:1,
			UploadedBy:1,
			thumbnail:1
		};
		
		var conditions = {};
		//conditions = {Status:1,IsDeleted:0};
		conditions.Status = 1;
		//conditions.UploadedOn = 'desc';
		if( mediaType ){
			//conditions = {Status:1,IsDeleted:0,MediaType:mediaType};
			conditions.MediaType = mediaType;
		}
		
		//Remove already selected media
		var selectedMediaIds = [];
		for( var loop = 0; loop < outputRecords.length; loop++ ){
			if( outputRecords[loop]._id )
				selectedMediaIds.push(outputRecords[loop]._id);
				conditions._id = {$nin : selectedMediaIds};
		}
		//End Remove already selected media
		
		media.find(conditions,fields).sort(sortObj).limit(newLimit).exec(function (err,results) { // Save
			if (err) {
				res.json({"status":"error","message":err});
				return;
			}
			else{
				//console.log(results);
				//change media object structure
				for( var loop = 0; loop < results.length; loop++ ){
					//console.log("single - ",results[loop])
					var tempObj = {};
					tempObj = results[loop].toObject();
					if( tempObj.Location[0].URL ){
						tempObj.URL = tempObj.Location[0].URL;
					}
					
					var requiredObj = {};
					requiredObj._id = tempObj._id;
					requiredObj.value = tempObj;
					
					
					if(requiredObj.value.Location[0].URL){
						requiredObj.value['URL'] = requiredObj.value.Location[0].URL;
					}
					outputRecords.push(requiredObj);
				}
				
				//return outputRecords;
				//console.log(results[0]);
				res.json({"status":"success","results":outputRecords});
				return;
			}
		});
	}
	else{
		res.json({"status":"success","results":outputRecords});
		return;
	}
};


var establishedModels = {};
function createModelForName(name) {
	if (!(name in establishedModels)) {
		var Any = new mongoose.Schema(
					{ 
						_id: {type:String},
						value:{
								id : {type:mongoose.Schema.Types.ObjectId},
								userId : {type:mongoose.Schema.Types.ObjectId},
								UserScore : {type:Number},
								MediaScore : {type:Number},
								Title : {type:String},
								Prompt : {type:String},
								Locator : {type:String},
								URL : {type:String},
								MediaType:{type:String},
								ContentType:{type:String},
								UploadedOn:{type:Date},
								count : {type:String}
							}
					}, 
					{ collection: name }
				);
		establishedModels[name] = establishedModels[name] ? establishedModels[name] : mongoose.model(name, Any);
	}
	return establishedModels[name];
}

/*
	Action : search api with all media : if available media under the group tag is less than limit 
			 then It will fill limit by sending last modified media.
	AddedOn : 27/01/2015
	UpdatedOn: 05/02/2015 - With IsPrivate Status Check!
*/
// 1) equal , 2) Like and 3) FullfillLimit
var search_v_8_revised_4 = async function( req , res ){
	try {
	
	//console.log("okok.....search_v_8_revised_4--------------------------------------------------------");
	//return;
	if(req.session.user){
		//console.log("Session is set!");
		//console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			//continue;
			//req.query.login_user_id = req.session.user._id;
			//req.query.userFsgs = req.session.user.FSGs;
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
	
	req.body.inputData = {
		"groupTagID":req.body.groupTagID,
		"login_user_id":req.session.user._id,
		"userFsgs":req.body.userFSGs,
		"powerUserCase":req.body.powerUserCase
	};
	//console.log("INPUT : "+req.body.inputData);
	if( req.body.inputData == 'undefined'  ){
		req.json({"status":"error","message":"wrong input"});
		return;
	}
	else{
	}
	
	var groupTagID = req.body.inputData.groupTagID;
	var login_user_id = req.body.inputData.login_user_id;
	
	//for searching on Title 'LIKE'
	var mediaTitle = "";
	if(req.body.title)
		mediaTitle = req.body.title;
	
	//for searching on MediaType
	//var mediaType = "";
	var mediaType = [];		//multiple selection case : updated on 30042015
	if(req.body.mediaType)
		mediaType = req.body.mediaType;
	
	/*limit : not for MR
	var limit = 1000;	
    if( req.body.inputData.limit != 'undefined' )
		limit = req.body.inputData.limit;			
	*/
	
	var userFsgs = {};
	if(req.body.inputData.userFsgs)	
		userFsgs = req.body.inputData.userFsgs;
	
	var powerUserCase = 0;
	if(req.body.inputData.powerUserCase)	
		powerUserCase = 1;

	//show more pagination code
	var page = 1;
	if( req.body.page ){
		page = parseInt(req.body.page);
	}
	
	var per_page = 48;
	if( req.body.per_page ){
		per_page = parseInt(req.body.per_page);
	}

	//show more pagination code	
		
	var searchObj = {};
	// Add mapReduce functions
	searchObj.map = function(){
		Array.max = function( array ){
			return Math.max.apply( Math, array );
		};
		var thisObj = {};
		thisObj = this;
		
		var thisObj_id = 0;
		thisObj_id = thisObj._id;
		var finalObj = {};
		
		finalObj._id = thisObj._id;			//fixed on 08042016 by manishp - was giving problem on createSearch Gallery manageSelection.
		finalObj.Title = thisObj.Title;
		finalObj.Prompt = thisObj.Prompt;
		finalObj.Locator = thisObj.Locator;	
		finalObj.Title = thisObj.Title;
		finalObj.URL = thisObj.Location[0].URL;
		finalObj.MediaType = thisObj.MediaType;
		finalObj.ContentType = thisObj.ContentType;	
		finalObj.UploadedOn = thisObj.UploadedOn;		
		finalObj.UploaderID = thisObj.UploaderID;			
		finalObj.Content = thisObj.Content;	//added on 30092014-Link case
		finalObj.thumbnail = thisObj.thumbnail;	//added on 21122014-Montage case
		finalObj.IsPrivate = thisObj.IsPrivate;	//added on 05022015-Private Media Case
		
		finalObj.PostsBestFSGCount = 0;
		finalObj.PostsCount = 0;
		
		finalObj.StampsBestFSGCount = 0;
		finalObj.StampsCount = 0;
		 
		finalObj.ViewsCount = 0;
		if(thisObj.ViewsCount) 
			finalObj.ViewsCount = thisObj.ViewsCount;
		
		finalObj.MaxFSGSort = 0;
		finalObj.AvgFSGSort = 0;
		finalObj.MediaScore = 0;
		
		var actionObj = {};
		var result = {};
		
		actionObj = {"Users":[]};
		if (thisObj.Posts)
			actionObj = thisObj.Posts;
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		var objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		var objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		var bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		var occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		 
		finalObj.PostsBestFSGCount = result.actionBestFSGCount;
		finalObj.PostsCount = result.actionCount;
		
		actionObj = {"Users":[]};
		if (thisObj.Stamps)
			actionObj = thisObj.Stamps;
		
		result = {};
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		finalObj.StampsBestFSGCount = result.actionBestFSGCount;
		finalObj.StampsCount = result.actionCount;
		
		//added on 16092014 power-user case
		//if(powerUserCase){
			finalObj.UserMaxFSGSort = 0;
			finalObj.UserScore = 0;
			if(thisObj.OwnerFSGs && thisObj.UploadedBy == 'user'){
				itemObj = thisObj.OwnerFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				finalObj.UserMaxFSGSort = countN;
			}
			if(thisObj.UserScore)
				finalObj.UserScore = thisObj.UserScore;
			
			if(thisObj.UploadedBy)
				finalObj.UploadedBy = thisObj.UploadedBy;
		//}
		//End added on 16092014 power-user case
				
		var temp = [];
		temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
		finalObj.MaxFSGSort = Array.max(temp);
		finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
		finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 
		
		if(!finalObj.MediaScore)
			finalObj.MediaScore = 0;
		//console.log('record to map : '+JSON.stringify(finalObj));
		//print("final obj : "+finalObj);
		
		emit(
			thisObj._id,
			finalObj
		);
	}
	searchObj.reduce = function(key , values){
		return values;
	}
	
	
	searchObj.query = {};
	
	var mTypeArr = [];
	
	var selectedKeywords = req.body.selectedKeywords ? req.body.selectedKeywords : [];
	var mp_selectedWords = req.body.selectedWords ? req.body.selectedWords : [];
	
	var allWords = [];
	for(var i = 0; i < mp_selectedWords.length; i++) {
		mp_selectedWords[i] = typeof mp_selectedWords[i] == 'string' ? mp_selectedWords[i] : null;
		if(mp_selectedWords[i]) {
			mp_selectedWords[i] = mp_selectedWords[i].split(' (')[0];
			allWords.push(new RegExp("^"+mp_selectedWords[i].toLowerCase().trim()+"$", "i"));
			allWords.push(mp_selectedWords[i].toLowerCase().trim());
		}
	}
	var familySetArr = [];
	if(allWords.length) {
		var familyset_conditions = {
			$or : [
				/*{GroupTagTitle:{ $regex : {$in : allWords} }},
				{MainGroupTagTitle:{ $regex : {$in : allWords} }}*/
				{GroupTagTitle:{ $in : allWords }},
				{MainGroupTagTitle:{ $in : allWords }}
			],
			status : { $in : [1, 3] },
			MetaMetaTagID : { $nin : [] }
		};
		var familySetResult = await keywordModel_allTags.find(familyset_conditions);
		var familySetResult = familySetResult ? familySetResult : [];
		
		for(var i = 0; i < familySetResult.length; i++) {
			var gt_id = familySetResult[i].gt_id ? String(familySetResult[i].gt_id) : null;
			if(gt_id) {
				if(familySetArr.indexOf(gt_id) < 0) {
					familySetArr.push(gt_id);
				}
			}
		}
	}
	selectedKeywords = selectedKeywords.concat(familySetArr);
	if(groupTagID){
		if(selectedKeywords.indexOf(groupTagID) < 0) {
			selectedKeywords.push(groupTagID)
		}
	}
	
	if(selectedKeywords.length){
		searchObj.query = {
			"GroupTags":{$in: selectedKeywords},
			"Status":1,
			"IsPrivate":{$ne:1},
			"IsDeleted":0
		};	
	}
	else{
		searchObj.query = {
			"MetaTags":{$exists : true , $nin : []},
			"GroupTags":{$nin:[]},
			"Status":1,
			"IsPrivate":{$ne:1},
			"IsDeleted":0,
			"IsUnsplashImage":1
		};
	}
	
	
	searchObj.query.InAppropFlagCount = {$lt:5};	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
	// Removed MetaMetaTags requirement to allow null values
	searchObj.query.UploadedBy = "admin";
	searchObj.query.$or = [
		{MediaType : "Image"},
		{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}}
	];
	
	
	
	
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	if(selectedKeywords.length){	//search case
		searchObj.query.MetaMetaTags = {
			$nin : []
		};
	}
	else{							//default case
		searchObj.query.MetaMetaTags = {
			$nin : []
		};
	}
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	
	//searchObj.query = {};
	searchObj.scope = {
		loginUserId : login_user_id,
		userFsgs : userFsgs,
		powerUserCase : powerUserCase
	};
	//searchObj.limit = limit;
	var outCollection = "UserMedia_"+login_user_id;
	//console.log(outCollection);
	searchObj.out = {replace: outCollection};
	//searchObj.out = {reduce: outCollection};
	// Since mapReduce is deprecated, use aggregation pipeline with manual FSG processing
	try {
		// First, get all matching documents
		var matchingDocs = await media.find(searchObj.query).exec();
		
		// Process each document to calculate FSG scores
		var processedResults = [];
		for (var i = 0; i < matchingDocs.length; i++) {
			var doc = matchingDocs[i];
			var processedDoc = await processDocumentFSGs(doc, userFsgs, powerUserCase);
			processedResults.push({
				_id: doc._id,
				value: processedDoc
			});
		}
		
		// Process results
		await processResults(processedResults);
		
	} catch (err) {
		console.error("Search error:", err);
		res.json({"status":"error","message":err.message || err});
		return;
	}
	
	// Function to process FSG calculations for a single document
	async function processDocumentFSGs(doc, userFsgs, powerUserCase) {
		var finalObj = {};
		finalObj._id = doc._id;
		finalObj.Title = doc.Title;
		finalObj.Prompt = doc.Prompt;
		finalObj.Locator = doc.Locator;	
		finalObj.Title = doc.Title;
		finalObj.URL = doc.Location[0].URL;
		finalObj.MediaType = doc.MediaType;
		finalObj.ContentType = doc.ContentType;	
		finalObj.UploadedOn = doc.UploadedOn;		
		finalObj.UploaderID = doc.UploaderID;			
		finalObj.Content = doc.Content;
		finalObj.thumbnail = doc.thumbnail;
		finalObj.IsPrivate = doc.IsPrivate;

		finalObj.PostsBestFSGCount = 0;
		finalObj.PostsCount = 0;
		finalObj.StampsBestFSGCount = 0;
		finalObj.StampsCount = 0;
		finalObj.ViewsCount = 0;
		if(doc.ViewsCount) 
			finalObj.ViewsCount = doc.ViewsCount;

		finalObj.MaxFSGSort = 0;
		finalObj.AvgFSGSort = 0;
		finalObj.MediaScore = 0;

		// Process Posts FSG scoring
		var actionObj = {"Users":[]};
		if (doc.Posts)
			actionObj = doc.Posts;

		var objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				var itemObj = actionObj.Users[idx].UserFSGs;
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		var objToMapSorted = [];
		objToMapSorted = objToMap.sort();

		var bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Math.max.apply(Math, objToMap);
		var occurrences = 0;

		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{
				break;
			}
		}
		finalObj.PostsBestFSGCount = bestMatchedCount;
		finalObj.PostsCount = occurrences;

		// Process Stamps FSG scoring
		actionObj = {"Users":[]};
		if (doc.Stamps)
			actionObj = doc.Stamps;

		objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				var itemObj = actionObj.Users[idx].UserFSGs;
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		objToMapSorted = [];
		objToMapSorted = objToMap.sort();

		bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Math.max.apply(Math, objToMap);
		occurrences = 0;

		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{
				break;
			}
		}
		finalObj.StampsBestFSGCount = bestMatchedCount;
		finalObj.StampsCount = occurrences;

		// Process User FSG scoring for power users
		finalObj.UserMaxFSGSort = 0;
		finalObj.UserScore = 0;
		if(doc.OwnerFSGs && doc.UploadedBy == 'user'){
			var itemObj = doc.OwnerFSGs;
			var countN = 0;
			for( var attrName in userFsgs ){
				if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
					countN += 1;
				}
			}
			finalObj.UserMaxFSGSort = countN;
		}
		if(doc.UserScore)
			finalObj.UserScore = doc.UserScore;

		if(doc.UploadedBy)
			finalObj.UploadedBy = doc.UploadedBy;

		var temp = [];
		temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
		finalObj.MaxFSGSort = Math.max.apply(Math, temp);
		finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
		finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 

		if(!finalObj.MediaScore)
			finalObj.MediaScore = 0;

		return finalObj;
	}
	
	async function processResults(processedResults) {
		try {
			// Store processed results in user collection
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
			
			await userMedia_userIdmodel.deleteMany({});
			if (processedResults.length > 0) {
				await userMedia_userIdmodel.insertMany(processedResults);
			}
		
		var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':1,'value.UploadedOn':-1};
		if(powerUserCase)
			sortObj = {'value.UserMaxFSGSort':-1,'value.UserScore':-1,'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':1,'value.UploadedOn':-1};
			
		//var pageLimit = 48;	
		var pageLimit = page*per_page;	
		
			var finalResult = await userMedia_userIdmodel.find({}).sort(sortObj).limit(pageLimit).exec();
			await __fullfillMediaLimit_3_withRules(finalResult , pageLimit , mTypeArr , res , groupTagID);
			
		} catch (err) {
			console.error("Process results error:", err);
			res.json({"status":"error","message":err.message || err});
				return;
			}
	}
	} catch (err) {
		console.error("❌ [SEARCH_V_8_REVISED_4] Error:", err);
		console.error("❌ [SEARCH_V_8_REVISED_4] Stack:", err.stack);
		res.json({"status":"error","message":err.message || err});
		return;
	}
}


// 1) equal , 2) Like and 3) FullfillLimit
//var search_v_8_revised_4 = function( req , res ){
var search_v_8_temp = async function( req , res ){
    //console.log("------------okok.....search_v_8_temp--------------------------------------------------------");
	//return;
    //console.log("Hi i am in function");
    if(req.session.user){
        //console.log("Session is set!");
        //console.log(JSON.stringify(req.session.user));
        if( req.session.user._id != undefined ){
            //continue;
            //req.query.login_user_id = req.session.user._id;
            //req.query.userFsgs = req.session.user.FSGs;
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

    req.body.inputData = {
        "groupTagID":req.body.groupTagID,
        "login_user_id":req.session.user._id,
        "userFsgs":req.body.userFSGs,
        "powerUserCase":req.body.powerUserCase
    };
    //console.log("INPUT : "+req.body.inputData);
    if( req.body.inputData == 'undefined'  ){
        req.json({"status":"error","message":"wrong input"});
        return;
    }
    else{
        //console.log("inputData : "+JSON.stringify(req.body.inputData));
    }

    var groupTagID = req.body.inputData.groupTagID;
    //console.log("jhsdgfsjhg"+groupTagID);
    var login_user_id = req.body.inputData.login_user_id;

    //for searching on Title 'LIKE'
    var mediaTitle = "";
    if(req.body.title)
        mediaTitle = req.body.title;

    //for searching on MediaType
    //var mediaType = "";
    var mediaType = [];		//multiple selection case : updated on 30042015
    
	if(req.body.mediaType)
        mediaType = req.body.mediaType;

    /*limit : not for MR
    var limit = 1000;	
    if( req.body.inputData.limit != 'undefined' )
            limit = req.body.inputData.limit;			
    */

    var userFsgs = {};
    if(req.body.inputData.userFsgs)	
        userFsgs = req.body.inputData.userFsgs;

    var powerUserCase = 0;
    if(req.body.inputData.powerUserCase)	
        powerUserCase = 1;

    //show more pagination code
    var page = 1;
    if( req.body.page ){
        page = parseInt(req.body.page);
    }

    var per_page = 48;
    if( req.body.per_page ){
        per_page = parseInt(req.body.per_page);
    }

    //show more pagination code	

    var searchObj = {};
    searchObj.map = function(){
        /*
        var userFsgs = {
                "Gender":"Male",
                "Age":"20-30",
                "Country":"Europe",
                "Relations":"Self",
                "RelationStatus":"Single"//,
                //"AttractedTo":"Female",
                //"PlatformSegments":"Experts",
                //"Media":"All",
                //"FanClubs":"Football",
                //"Privacy":"Public"
        };
        */
        Array.max = function( array ){
                return Math.max.apply( Math, array );
        };
        var thisObj = {};
        thisObj = this;

        var thisObj_id = 0;
        thisObj_id = thisObj._id;
        var finalObj = {};

        finalObj._id = thisObj._id;			//fixed on 08042016 by manishp - was giving problem on createSearch Gallery manageSelection.
        finalObj.Title = thisObj.Title;
        finalObj.Prompt = thisObj.Prompt;
        finalObj.Locator = thisObj.Locator;	
        finalObj.Title = thisObj.Title;
        finalObj.URL = thisObj.Location[0].URL;
        finalObj.MediaType = thisObj.MediaType;
        finalObj.ContentType = thisObj.ContentType;	
        finalObj.UploadedOn = thisObj.UploadedOn;		
        finalObj.UploaderID = thisObj.UploaderID;			
        finalObj.Content = thisObj.Content;	//added on 30092014-Link case
        finalObj.thumbnail = thisObj.thumbnail;	//added on 21122014-Montage case
        finalObj.IsPrivate = thisObj.IsPrivate;	//added on 05022015-Private Media Case

        finalObj.PostsBestFSGCount = 0;
        finalObj.PostsCount = 0;

        finalObj.StampsBestFSGCount = 0;
        finalObj.StampsCount = 0;

        finalObj.ViewsCount = 0;
        if(thisObj.ViewsCount) 
            finalObj.ViewsCount = thisObj.ViewsCount;


        finalObj.MaxFSGSort = 0;
        finalObj.AvgFSGSort = 0;
        finalObj.MediaScore = 0;

        var actionObj = {};
        var result = {};

        actionObj = {"Users":[]};
        if (thisObj.Posts)
            actionObj = thisObj.Posts;


        //result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
        var objToMap = [];
        for(var idx = 0; idx < actionObj.Users.length; idx++ ){
            if(actionObj.Users[idx].UserFSGs){
                itemObj = actionObj.Users[idx].UserFSGs;
                var temp = {};
                var countN = 0;
                for( var attrName in userFsgs ){
                    if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                        temp[attrName] = userFsgs[attrName];
                        countN += 1;
                    }
                }
                objToMap.push(countN);
            }
        }
        var objToMapSorted = [];
        objToMapSorted = objToMap.sort();

        var bestMatchedCount = 0;
        if(objToMap.length)
            bestMatchedCount = Array.max(objToMap);
        var occurrences = 0;

        for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
            if(  objToMapSorted[occIdx] == bestMatchedCount ){
                occurrences++;
            }
            else{ //objToMapSorted[occIdx] < Array.max(objToMap)
                break;
            }
        }
        //console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
        result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};

        finalObj.PostsBestFSGCount = result.actionBestFSGCount;
        finalObj.PostsCount = result.actionCount;

        actionObj = {"Users":[]};
        if (thisObj.Stamps)
            actionObj = thisObj.Stamps;

        result = {};

        //result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
        objToMap = [];
        for(var idx = 0; idx < actionObj.Users.length; idx++ ){
                if(actionObj.Users[idx].UserFSGs){
                        itemObj = actionObj.Users[idx].UserFSGs;
                        var temp = {};
                        var countN = 0;
                        for( var attrName in userFsgs ){
                                if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                                        temp[attrName] = userFsgs[attrName];
                                        countN += 1;
                                }
                        }
                        objToMap.push(countN);
                }
        }
        objToMapSorted = [];
        objToMapSorted = objToMap.sort();

        bestMatchedCount = 0;
        if(objToMap.length)
                bestMatchedCount = Array.max(objToMap);
        occurrences = 0;

        for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
                if(  objToMapSorted[occIdx] == bestMatchedCount ){
                        occurrences++;
                }
                else{ //objToMapSorted[occIdx] < Array.max(objToMap)
                        break;
                }
        }
        //console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
        result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
        finalObj.StampsBestFSGCount = result.actionBestFSGCount;
        finalObj.StampsCount = result.actionCount;

        //added on 16092014 power-user case
        //if(powerUserCase){
                finalObj.UserMaxFSGSort = 0;
                finalObj.UserScore = 0;
                if(thisObj.OwnerFSGs && thisObj.UploadedBy == 'user'){
                        itemObj = thisObj.OwnerFSGs;
                        var temp = {};
                        var countN = 0;
                        for( var attrName in userFsgs ){
                                if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                                        temp[attrName] = userFsgs[attrName];
                                        countN += 1;
                                }
                        }
                        finalObj.UserMaxFSGSort = countN;
                }
                if(thisObj.UserScore)
                        finalObj.UserScore = thisObj.UserScore;

                if(thisObj.UploadedBy)
                        finalObj.UploadedBy = thisObj.UploadedBy;
        //}
        //End added on 16092014 power-user case


        var temp = [];
        temp.push(finalObj.PostsBestFSGCgroupTagIDount,finalObj.StampsBestFSGCount);
        finalObj.MaxFSGSort = Array.max(temp);
        finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
        finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 

        if(!finalObj.MediaScore)
            finalObj.MediaScore = 0;
        //console.log('record to map : '+JSON.stringify(finalObj));
        //print("final obj : "+finalObj);

        emit(
            thisObj._id,
            finalObj
        );
    }
    searchObj.reduce = function(key , values){
        return values;
    }

    //console.log("GT-------"+groupTagID);
    /*
    if(mediaTitle)
        searchObj.query = { "GroupTags" : groupTagID,Status:{$ne:2},"Title":new RegExp(mediaTitle, 'i')};
    else
        searchObj.query = { "GroupTags" : groupTagID,Status:{$ne:2}};
    */
    //{$in:keywordsSelctedId , $nin:excludeTagId}	
    //==searchObj.query={"GroupTags":groupTagID,"Status":1,"IsPrivate":{$ne:1},"IsDeleted":0};
    //searchObj.query={"GroupTags":{$in:keywordsSelctedId , $nin:excludeTagId},"Status":1,"IsPrivate":{$ne:1},"IsDeleted":0};
    if(mediaTitle)
        searchObj.query={"GroupTags":groupTagID,"Status":1,"IsPrivate":{$ne:1},"Title":new RegExp(mediaTitle, 'i'),"IsDeleted":0};

    var mTypeArr = [];
	/*
    if( mediaType.length ){
        for( var loop = 0; loop < mediaType.length; loop++ ){
            if(mediaType[loop] == 'Image'){
                mTypeArr.push({$or:[{"MediaType":'Image'},{"MediaType":'Link',"LinkType":'image'}]});
            }
            else if(mediaType[loop] == 'Link'){
                mTypeArr.push({"MediaType":'Link',"LinkType":{$ne:'image'}});
            }
            else if(mediaType[loop] == 'Notes'){
                mTypeArr.push({"MediaType":'Notes'});
            }
            else if(mediaType[loop] == 'Montage'){
                mTypeArr.push({"MediaType":'Montage'});
            }
            else{
                //no case
                console.log("------Something went wrong with the mediaType query parameters------",mediaType);
            }
        }
    }
	else{
		mTypeArr.push({"MediaType":{$ne : 'Link'}});
	}
	*/
    searchObj.query = {"Status":1,"IsPrivate":{$ne:1},"IsDeleted":0};
	searchObj.query.MediaType = {$ne : "Link"};
	searchObj.query.UploadedBy = "admin";
	
    //var obj = Object.assign(o1, o2, o3);
    //console.log('----query-----',searchObj.query);

    //fixing start on 29042016
    var input__keywordsSelctedId = req.body.keywordsSelcted ? req.body.keywordsSelcted : [];
    var input__addAnotherTagId = req.body.addAnotherTag ? req.body.addAnotherTag : [];
    var input__excludeTagId = req.body.excludeTag ? req.body.excludeTag : [];

    var keywordsSelctedId = [];
    var addAnotherTagId = [];
    var excludeTagId = [];

    //console.log("data of req.keywordsSelcted",keywordsSelctedId);
    //console.log("data of req.body.add",input__addAnotherTagId);
    //console.log("data of req.body.excludeTag",input__excludeTagId);
    //return
    for(var i=0;i< input__keywordsSelctedId.length;i++){
        keywordsSelctedId.push(input__keywordsSelctedId[i].id);	
    }
    for(var i=0;i< input__addAnotherTagId.length;i++){
        addAnotherTagId.push(input__addAnotherTagId[i].id);	
    }
    for(var i=0;i< input__excludeTagId.length;i++){
        excludeTagId.push(input__excludeTagId[i].id);	
    }

    //fixing end on 29042016
    //searchObj.query.MetaMetaTags = "5464931fde9f6868484be3d7";
    //console.log("searchObj.query ---------------",searchObj.query);//return;

    //var searchObj = {};       //this was the issue....................
    //searchObj.query = {};
    
    //console.log("Object.isExtensible()------------------000000000000000000000000-----",Object.isExtensible(searchObj.query));return;
    var gtCombQuery = {};
    gtCombQuery["$or"] = [];

    if (keywordsSelctedId.length) {

        for(var loop = 0; loop < keywordsSelctedId.length; loop++){
            var tempQueryObj = {};

            tempQueryObj = {
                "$and" : []
            };	
            var temp = {};
            temp = {
                //"GroupTags" : {$eq : keywordsSelctedId[loop]}
                "GroupTags" : keywordsSelctedId[loop]
            }
            tempQueryObj["$and"].push(temp);

            //code
            for(var loop1 = 0; loop1 < addAnotherTagId.length; loop1++){
                var temp = {};
                temp = {
                    //"GroupTags" : {$eq : addAnotherTagId[loop1]}
                    "GroupTags" : addAnotherTagId[loop1]
                }

                tempQueryObj["$and"].push(temp);
            }

            for(var loop2 = 0; loop2 < excludeTagId.length; loop2++){
                var temp = {};
                temp = {
                    "GroupTags" : {$ne : excludeTagId[loop2]}
                }

                tempQueryObj["$and"].push(temp);
            }

            gtCombQuery["$or"].push(tempQueryObj);
            //searchObj.query["$or"][loop] = tempQueryObj;

        }
    }
    else{

        var tempQueryObj = {};

        tempQueryObj = {
            "$and" : []
        };

        for(var loop = 0; loop < addAnotherTagId.length; loop++){
            var temp = {};
            temp = {
                //"GroupTags" : {$eq : addAnotherTagId[loop]}
                "GroupTags" : addAnotherTagId[loop]
            }

            tempQueryObj["$and"].push(temp);
        }

        for(var loop1 = 0; loop1 < excludeTagId.length; loop1++){
            var temp = {};
            temp = {
                "GroupTags" : {$ne : excludeTagId[loop1]}
            }

            tempQueryObj["$and"].push(temp);
        }

        gtCombQuery["$or"].push(tempQueryObj);
        //searchObj.query["$or"][loop] = tempQueryObj;
    }
    
    if(searchObj.query["$and"]){
        searchObj.query["$and"].push(gtCombQuery);
    }
    else{
        //searchObj.query = Object.assign(searchObj.query , gtCombQuery);
		searchObj.query["$and"] = [];
		searchObj.query["$and"].push(gtCombQuery);
    }
    //console.log("searchObj.query+++++++++++++++++++++++++++++++++++",searchObj.query);
    //return;
    
    //searchObj.query = Object.assign(searchObj.query , gtCombQuery)
    if (keywordsSelctedId.length) {
        //code
        //console.log("-----------MANISH PODIYAL00000000000000000000----------",JSON.stringify(searchObj.query));
        //return;
    }

	searchObj.query["InAppropFlagCount"] = {$lt:5};	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
	
    //searchObj.query = {};
    searchObj.scope = {
        loginUserId : login_user_id,
        userFsgs : userFsgs,
        powerUserCase : powerUserCase
    };
    //searchObj.limit = limit;

    //searchObj.query = JSON.stringify(searchObj.query);
    var outCollection = "UserMedia_"+login_user_id;
    //console.log(outCollection);
    searchObj.out = {replace: outCollection};
    //searchObj.out = {reduce: outCollection};
    // Since mapReduce is deprecated, use manual FSG processing
    try {
        // First, get all matching documents
        var matchingDocs = await media.find(searchObj.query).exec();
        
        // Process each document to calculate FSG scores
        var processedResults = [];
        for (var i = 0; i < matchingDocs.length; i++) {
            var doc = matchingDocs[i];
            var processedDoc = await processDocumentFSGs(doc, userFsgs, powerUserCase);
            processedResults.push({
                _id: doc._id,
                value: processedDoc
            });
        }
        
        // Store processed results in user collection
        var stuff = {name: outCollection}; // Define info.
        var Model = createModelForName(stuff.name); // Create the model.
        var userMedia_userIdmodel = Model; // Create a model instance.

        await userMedia_userIdmodel.deleteMany({});
        if (processedResults.length > 0) {
            await userMedia_userIdmodel.insertMany(processedResults);
        }
        
        var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.UploadedOn':-1};
        if(powerUserCase)
            sortObj = {'value.UserMaxFSGSort':-1,'value.UserScore':-1,'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.UploadedOn':-1};

        //var pageLimit = 48;	
        var pageLimit = page*per_page;	

        var result = await userMedia_userIdmodel.find({}).sort(sortObj).limit(pageLimit).exec();
        await __fullfillMediaLimit_LIKECASE(result , pageLimit , mTypeArr , res , groupTagID);
        
    } catch (err) {
        console.error("Search error:", err);
        res.json({"status":"error","message":err.message || err});
                        return;
    }
    
    // Function to process FSG calculations for a single document
    async function processDocumentFSGs(doc, userFsgs, powerUserCase) {
        var finalObj = {};
        finalObj._id = doc._id;
        finalObj.Title = doc.Title;
        finalObj.Prompt = doc.Prompt;
        finalObj.Locator = doc.Locator;	
        finalObj.Title = doc.Title;
        finalObj.URL = doc.Location[0].URL;
        finalObj.MediaType = doc.MediaType;
        finalObj.ContentType = doc.ContentType;	
        finalObj.UploadedOn = doc.UploadedOn;		
        finalObj.UploaderID = doc.UploaderID;			
        finalObj.Content = doc.Content;
        finalObj.thumbnail = doc.thumbnail;
        finalObj.IsPrivate = doc.IsPrivate;

        finalObj.PostsBestFSGCount = 0;
        finalObj.PostsCount = 0;
        finalObj.StampsBestFSGCount = 0;
        finalObj.StampsCount = 0;
        finalObj.ViewsCount = 0;
        if(doc.ViewsCount) 
            finalObj.ViewsCount = doc.ViewsCount;

        finalObj.MaxFSGSort = 0;
        finalObj.AvgFSGSort = 0;
        finalObj.MediaScore = 0;

        // Process Posts FSG scoring
        var actionObj = {"Users":[]};
        if (doc.Posts)
            actionObj = doc.Posts;

        var objToMap = [];
        for(var idx = 0; idx < actionObj.Users.length; idx++ ){
            if(actionObj.Users[idx].UserFSGs){
                var itemObj = actionObj.Users[idx].UserFSGs;
                var countN = 0;
                for( var attrName in userFsgs ){
                    if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                        countN += 1;
                    }
                }
                objToMap.push(countN);
            }
        }
        var objToMapSorted = [];
        objToMapSorted = objToMap.sort();

        var bestMatchedCount = 0;
        if(objToMap.length)
            bestMatchedCount = Math.max.apply(Math, objToMap);
        var occurrences = 0;

        for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
            if(  objToMapSorted[occIdx] == bestMatchedCount ){
                occurrences++;
                }
                else{
                break;
            }
        }
        finalObj.PostsBestFSGCount = bestMatchedCount;
        finalObj.PostsCount = occurrences;

        // Process Stamps FSG scoring
        actionObj = {"Users":[]};
        if (doc.Stamps)
            actionObj = doc.Stamps;

        objToMap = [];
        for(var idx = 0; idx < actionObj.Users.length; idx++ ){
            if(actionObj.Users[idx].UserFSGs){
                var itemObj = actionObj.Users[idx].UserFSGs;
                var countN = 0;
                for( var attrName in userFsgs ){
                    if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                        countN += 1;
                    }
                }
                objToMap.push(countN);
            }
        }
        objToMapSorted = [];
        objToMapSorted = objToMap.sort();

        bestMatchedCount = 0;
        if(objToMap.length)
            bestMatchedCount = Math.max.apply(Math, objToMap);
        occurrences = 0;

        for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
            if(  objToMapSorted[occIdx] == bestMatchedCount ){
                occurrences++;
            }
            else{
                break;
            }
        }
        finalObj.StampsBestFSGCount = bestMatchedCount;
        finalObj.StampsCount = occurrences;

        // Process User FSG scoring for power users
        finalObj.UserMaxFSGSort = 0;
        finalObj.UserScore = 0;
        if(doc.OwnerFSGs && doc.UploadedBy == 'user'){
            var itemObj = doc.OwnerFSGs;
            var countN = 0;
            for( var attrName in userFsgs ){
                if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
                    countN += 1;
                }
            }
            finalObj.UserMaxFSGSort = countN;
        }
        if(doc.UserScore)
            finalObj.UserScore = doc.UserScore;

        if(doc.UploadedBy)
            finalObj.UploadedBy = doc.UploadedBy;

        var temp = [];
        temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
        finalObj.MaxFSGSort = Math.max.apply(Math, temp);
        finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
        finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 

        if(!finalObj.MediaScore)
            finalObj.MediaScore = 0;

        return finalObj;
    }
}

var __fullfillMediaLimit_LIKECASE = async function(result , pageLimit , mediaType , res , groupTagID){
	//console.log("---------__fullfillMediaLimit_LIKECASE-----");
	
	try {
		var data = await GroupTag.find({_id:new mongoose.Types.ObjectId(groupTagID)}).exec();
		if (data && data.length) {
			//console.log("data-----------------",data);
			
			data = data[0];
			var partiallyMatchedKeywords = [];
			var partialData = await GroupTag.find({GroupTagTitle:new RegExp(data.GroupTagTitle ? data.GroupTagTitle : "", 'i'),status:{$in:[1,3]}} , {_id:1}).exec();
			if (partialData) {
				for( var loop = 0; loop < partialData.length; loop++ ){
					partiallyMatchedKeywords.push(partialData[loop]._id);	
					}
					
					var outputRecords = [];
					var newLimit = 0;
					
					var outputRecords = result;
					//console.log("outputRecords.length = ",outputRecords.length);
					//console.log("outputRecords.length = ",outputRecords);return;
					
					var conditions = {};
					conditions.GroupTags = {$in: []};
					//conditions = {Status:1,IsDeleted:0};
					conditions.IsDeleted = 0;
					conditions.Status = 1;
					conditions.IsPrivate = {$ne:1};
					//conditions.UploadedOn = 'desc';
					/*
					if( mediaType.length ){
						//conditions = {Status:1,IsDeleted:0,MediaType:mediaType};
						conditions.$or = mediaType;
					}
					*/
					conditions.MediaType = {$ne : "Link"};
					conditions.UploadedBy = "admin";
					
					
					conditions.GroupTags.$in = partiallyMatchedKeywords;
					
					//console.log( "-------conditions----------",conditions );
					var mediaCount = 0;
					
					conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
					//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
					if(groupTagID){	//search case
						conditions.MetaMetaTags = {
							$nin : []
						};
					}
					else{							//default case
						conditions.MetaMetaTags = {
							$nin : []
						};
						conditions.GroupTags.$nin = [];
						conditions.MetaTags = {$exists : true, $nin : []};
					}
					//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
					
					//get count of all media records
				var results = await media.find(conditions).countDocuments().exec();
							mediaCount = results;
							//console.log("mediaCount = ",mediaCount);//return;
							if( outputRecords.length < pageLimit ){
								newLimit = parseInt(pageLimit - result.length);
								
								//console.log("---------In __fullfillMediaLimit if block-----newLimit = ",newLimit);
								//var sortObj = {MediaScore:-1,UploadedOn:-1};
								var sortObj = {RandomSortId:-1};
								var fields = {};
								fields = {
									_id:1,
									Title:1,
									Prompt:1,
									Locator:1,
									Location:1,
									MediaType:1,
									ContentType:1,
									UploadedOn:1,
									UploaderID:1,
									Content:1,
									UploadedBy:1,
									thumbnail:1
								};
								
								//Remove already selected media
								var selectedMediaIds = [];
								for( var loop = 0; loop < outputRecords.length; loop++ ){
									if( outputRecords[loop]._id )
										selectedMediaIds.push(outputRecords[loop]._id);
										conditions._id = {$nin : selectedMediaIds};
								}
								//console.log("selectedMediaIds = ",selectedMediaIds);//return;
								//conditions = { Status:1, MediaType:mediaType, _id:{$nin : selectedMediaIds} };
								//console.log("conditions = ",conditions);return;
								//End Remove already selected media
								
					conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
								
								//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
								if(groupTagID){	//search case
									conditions.MetaMetaTags = {
							$nin : []
									};
								}
								else{							//default case
									conditions.MetaMetaTags = {
							$nin : []
									};
								}
								//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
								
					var results = await media.find(conditions,fields).sort(sortObj).limit(newLimit).exec();
										if( !results.length ){
											//console.log("NO RESULTS---------------");
											//return false;
										}
										//console.log(results);
										//change media object structure
										for( var loop = 0; loop < results.length; loop++ ){
											//console.log("single - ",results[loop])
											var tempObj = {};
											tempObj = results[loop].toObject();
											if( tempObj.Location[0].URL ){
												tempObj.URL = tempObj.Location[0].URL;
											}
											
											var requiredObj = {};
											requiredObj._id = tempObj._id;
											requiredObj.value = tempObj;
											
											
											if(requiredObj.value.Location[0].URL){
												requiredObj.value['URL'] = requiredObj.value.Location[0].URL;
											}
											outputRecords.push(requiredObj);
										}
										
										//return outputRecords;
										//console.log(results[0]);
					await __fullfillMediaLimit_3_withRules(outputRecords , pageLimit , mediaType , res , groupTagID);
										
										/*
										res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
										return;
										*/
							}
							else{
					await __fullfillMediaLimit_3_withRules(outputRecords , pageLimit , mediaType , res , groupTagID);
								//res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
								//return;
							}
						}
				}
	} catch (err) {
		console.error("__fullfillMediaLimit_LIKECASE error:", err);
		res.json({"status":"error","message":err});
		return;
		}
};

//added on 30042015 - multiple case
var search_by_descriptor_v2 = async function( req , res ){
	//console.log("okok.....");
	if(req.session.user){
		//console.log("Session is set!");
		//console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			//continue;
			//req.query.login_user_id = req.session.user._id;
			//req.query.userFsgs = req.session.user.FSGs;
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
	
	req.body.inputData = {
				"searchBy":req.body.searchBy,
				"descValue":req.body.descValue,
				"login_user_id":req.session.user._id,
				"userFsgs":req.body.userFSGs,
				"powerUserCase":req.body.powerUserCase
			};
	//console.log("INPUT : "+req.body.inputData);
	if( req.body.inputData == 'undefined'  ){
		req.json({"status":"error","message":"wrong input"});
		return;
	}
	else{
		//console.log("inputData : "+JSON.stringify(req.body.inputData));
	}
	
	var descValue = "909089";
	
	descValue = req.body.inputData.descValue;
	
	//console.log("descValue = ",descValue);
	
	var login_user_id = req.body.inputData.login_user_id;
	
	//for searching on Title 'LIKE'
	var mediaTitle = "";
	if(req.body.title)
		mediaTitle = req.body.title;
	
	//for searching on MediaType
	var mediaType = "";
	if(req.body.mediaType)
		mediaType = req.body.mediaType;
	
	/*limit : not for MR
	var limit = 1000;	
    if( req.body.inputData.limit != 'undefined' )
		limit = req.body.inputData.limit;			
	*/
	
	var userFsgs = {};
	if(req.body.inputData.userFsgs)	
		userFsgs = req.body.inputData.userFsgs;
	
	var powerUserCase = 0;
	if(req.body.inputData.powerUserCase)	
		powerUserCase = 1;

	//show more pagination code
	var page = 1;
	if( req.body.page ){
		page = parseInt(req.body.page);
	}
	
	var per_page = 48;
	if( req.body.per_page ){
		per_page = parseInt(req.body.per_page);
	}
	
	//show more pagination code	
		
	var searchObj = {};
	searchObj.map = function(){
		/*
		var userFsgs = {
			"Gender":"Male",
			"Age":"20-30",
			"Country":"Europe",
			"Relations":"Self",
			"RelationStatus":"Single"//,
			//"AttractedTo":"Female",
			//"PlatformSegments":"Experts",
			//"Media":"All",
			//"FanClubs":"Football",
			//"Privacy":"Public"
		};
		*/
		Array.max = function( array ){
			return Math.max.apply( Math, array );
		};
		var thisObj = {};
		thisObj = this;
		
		var thisObj_id = 0;
		thisObj_id = thisObj._id;
		var finalObj = {};
		
		finalObj.Title = thisObj.Title;
		finalObj.Prompt = thisObj.Prompt;
		finalObj.Locator = thisObj.Locator;	
		finalObj.Title = thisObj.Title;
		finalObj.URL = thisObj.Location[0].URL;
		finalObj.MediaType = thisObj.MediaType;
		finalObj.ContentType = thisObj.ContentType;	
		finalObj.UploadedOn = thisObj.UploadedOn;		
		finalObj.UploaderID = thisObj.UploaderID;			
		finalObj.Content = thisObj.Content;	//added on 30092014-Link case
		finalObj.thumbnail = thisObj.thumbnail;	//added on 21122014-Montage case
		finalObj.IsPrivate = thisObj.IsPrivate;	//added on 05022015-Private Media Case
		
		finalObj.PostsBestFSGCount = 0;
		finalObj.PostsCount = 0;
		
		finalObj.StampsBestFSGCount = 0;
		finalObj.StampsCount = 0;
		 
		finalObj.ViewsCount = 0;
		if(thisObj.ViewsCount) 
			finalObj.ViewsCount = thisObj.ViewsCount;
		
		
		finalObj.MaxFSGSort = 0;
		finalObj.AvgFSGSort = 0;
		finalObj.MediaScore = 0;
		
		var actionObj = {};
		var result = {};
		
		actionObj = {"Users":[]};
		if (thisObj.Posts)
			actionObj = thisObj.Posts;
		
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		var objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		var objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		var bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		var occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if( objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		 
		finalObj.PostsBestFSGCount = result.actionBestFSGCount;
		finalObj.PostsCount = result.actionCount;
		
		actionObj = {"Users":[]};
		if (thisObj.Stamps)
			actionObj = thisObj.Stamps;
		
		result = {};
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		finalObj.StampsBestFSGCount = result.actionBestFSGCount;
		finalObj.StampsCount = result.actionCount;
		
		//added on 16092014 power-user case
		//if(powerUserCase){
			finalObj.UserMaxFSGSort = 0;
			finalObj.UserScore = 0;
			if(thisObj.OwnerFSGs && thisObj.UploadedBy == 'user'){
				itemObj = thisObj.OwnerFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				finalObj.UserMaxFSGSort = countN;
			}
			if(thisObj.UserScore)
				finalObj.UserScore = thisObj.UserScore;
			
			if(thisObj.UploadedBy)
				finalObj.UploadedBy = thisObj.UploadedBy;
		//}
		//End added on 16092014 power-user case
		
		
		var temp = [];
		temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
		finalObj.MaxFSGSort = Array.max(temp);
		finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
		finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 
		
		if(!finalObj.MediaScore)
			finalObj.MediaScore = 0;
		//console.log('record to map : '+JSON.stringify(finalObj));
		//print("final obj : "+finalObj);
		
		emit(
			thisObj._id,
			finalObj
		);
	}
	searchObj.reduce = function(key , values){
		return values;
	}
	
	//console.log("GT-------"+groupTagID);
	/*
	if(mediaTitle)
		searchObj.query = { "GroupTags" : groupTagID,Status:{$ne:2},"Title":new RegExp(mediaTitle, 'i')};
	else
		searchObj.query = { "GroupTags" : groupTagID,Status:{$ne:2}};
	*/
	searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"IsDeleted":0};
	if(mediaTitle)
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"Title":new RegExp(mediaTitle, 'i'),"IsDeleted":0};
	
	if(mediaType == 'Image'){
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},$or:[{"MediaType":'Image'},{"MediaType":'Link',"LinkType":'image'}],"IsDeleted":0};
	}
	else if(mediaType == 'Link'){
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"MediaType":'Link',"LinkType":{$ne:'image'},"IsDeleted":0};
	}
	else if(mediaType == 'Notes'){
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"MediaType":'Notes',"IsDeleted":0};
	}
	else if(mediaType == 'Montage'){
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"MediaType":'Montage',"IsDeleted":0};
	}
	else{
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"IsDeleted":0};	
	}
	
	
	if(mediaTitle && mediaType)
		searchObj.query={"Prompt":new RegExp(descValue, 'i'),"Status":{$ne:2},"IsPrivate":{$ne:1},"Title":new RegExp(mediaTitle, 'i'),"MediaType":mediaType,"IsDeleted":0};
		
	//console.log('----query-----',searchObj.query);
		
	//searchObj.query = {};
	searchObj.scope = {
						loginUserId : login_user_id,
						userFsgs : userFsgs,
						powerUserCase : powerUserCase
					};
	//searchObj.limit = limit;
	var outCollection = "UserMedia_"+login_user_id;
	//console.log(outCollection);
	searchObj.out = {replace: outCollection};
	//searchObj.out = {reduce: outCollection};
	// Since mapReduce is deprecated, use manual FSG processing
	try {
		// First, get all matching documents
		var matchingDocs = await media.find(searchObj.query).exec();
		
		// Process each document to calculate FSG scores
		var processedResults = [];
		for (var i = 0; i < matchingDocs.length; i++) {
			var doc = matchingDocs[i];
			var processedDoc = await processDocumentFSGs(doc, userFsgs, powerUserCase);
			processedResults.push({
				_id: doc._id,
				value: processedDoc
			});
		}
		
		// Process results
		await processResults(processedResults);
		
	} catch (err) {
		console.error("Search error:", err);
		res.json({"status":"error","message":err.message || err});
		return;
	}
	
	async function processResults(processedResults) {
		try {
			// Store aggregation results in user collection
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
		
			await userMedia_userIdmodel.deleteMany({});
			if (result.length > 0) {
				var documentsToInsert = result.map(doc => ({
					_id: doc._id,
					value: doc
				}));
				await userMedia_userIdmodel.insertMany(documentsToInsert);
			}
			
			var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.UploadedOn':-1};
		if(powerUserCase)
			sortObj = {'value.UserMaxFSGSort':-1,'value.UserScore':-1,'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.UploadedOn':-1};
			
		//var pageLimit = 48;	
		var pageLimit = page*per_page;	
		
			var finalResult = await userMedia_userIdmodel.find({}).sort(sortObj).limit(pageLimit).exec();
			__fullfillMediaLimit_2(finalResult , pageLimit , mediaType , res);
			
		} catch (err) {
				res.json({"status":"error","message":err});
				return;
			}
	}
}


var __fullfillMediaLimit_2 = function(result , pageLimit , mediaType , res){
	//console.log("---------__fullfillMediaLimit-----");
	var outputRecords = [];
	var newLimit = 0;
	
	var outputRecords = result;
	console.log("outputRecords.length = ",outputRecords.length);
	
	var conditions = {};
	conditions.IsDeleted = 0;
	conditions.Status = 1;
	conditions.IsPrivate = {$ne:1};
	if( mediaType ){
		conditions.MediaType = mediaType;
	}
	
	var mediaCount = 0;
	//get count of all media records
	media.find(conditions).countDocuments().exec(function (err,results) { // Save
		if (err) {
			res.json({"status":"error","message":err});
			return;
		}
		else{
			mediaCount = results;
			//console.log("mediaCount = ",mediaCount);//return;
			if( outputRecords.length < pageLimit ){
				newLimit = parseInt(pageLimit - result.length);
				
				//console.log("---------In __fullfillMediaLimit if block-----newLimit = ",newLimit);
				//var sortObj = {MediaScore:-1,UploadedOn:-1};
				var sortObj = {RandomSortId:-1};
				var fields = {};
				fields = {
					_id:1,
					Title:1,
					Prompt:1,
					Locator:1,
					Location:1,
					MediaType:1,
					ContentType:1,
					UploadedOn:1,
					UploaderID:1,
					Content:1,
					UploadedBy:1,
					thumbnail:1
				};
				
				//Remove already selected media
				var selectedMediaIds = [];
				for( var loop = 0; loop < outputRecords.length; loop++ ){
					if( outputRecords[loop]._id )
						selectedMediaIds.push(outputRecords[loop]._id);
						conditions._id = {$nin : selectedMediaIds};
				}
				//End Remove already selected media
				
				media.find(conditions,fields).sort(sortObj).limit(newLimit).exec(function (err,results) { // Save
					if (err) {
						res.json({"status":"error","message":err});
						return;
					}
					else{
						//console.log(results);
						//change media object structure
						for( var loop = 0; loop < results.length; loop++ ){
							//console.log("single - ",results[loop])
							var tempObj = {};
							tempObj = results[loop].toObject();
							if( tempObj.Location[0].URL ){
								tempObj.URL = tempObj.Location[0].URL;
							}
							
							var requiredObj = {};
							requiredObj._id = tempObj._id;
							requiredObj.value = tempObj;
							
							
							if(requiredObj.value.Location[0].URL){
								requiredObj.value['URL'] = requiredObj.value.Location[0].URL;
							}
							outputRecords.push(requiredObj);
						}
						
						//return outputRecords;
						//console.log(results[0]);
						res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
						return;
					}
				});
			}
			else{
				res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
				return;
			}
			
		}
	});
};

//added on 30042015 - Multiple Case
var __fullfillMediaLimit_3 = function(result , pageLimit , mediaType , res){
	//console.log("---------__fullfillMediaLimit-----");
	var outputRecords = [];
	var newLimit = 0;
	
	var outputRecords = result;
	//console.log("outputRecords.length = ",outputRecords.length);
	//console.log("outputRecords.length = ",outputRecords);return;
	
	var conditions = {};
	//conditions = {Status:1,IsDeleted:0};
	conditions.IsDeleted = 0;
	conditions.Status = 1;
	conditions.IsPrivate = {$ne:1};
	//conditions.UploadedOn = 'desc';
	if( mediaType.length ){
		//conditions = {Status:1,IsDeleted:0,MediaType:mediaType};
		conditions.$or = mediaType;
	}
	//console.log( "-------conditions----------",conditions );
	var mediaCount = 0;
	
	conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
	
	//get count of all media records
	media.find(conditions).countDocuments().exec(function (err,results) { // Save
		if (err) {
			res.json({"status":"error","message":err});
			return;
		}
		else{
			mediaCount = results;
			//console.log("mediaCount = ",mediaCount);//return;
			if( outputRecords.length < pageLimit ){
				newLimit = parseInt(pageLimit - result.length);
				
				//console.log("---------In __fullfillMediaLimit if block-----newLimit = ",newLimit);
				//var sortObj = {MediaScore:-1,UploadedOn:-1};
				var sortObj = {RandomSortId:-1};
				var fields = {};
				fields = {
					_id:1,
					Title:1,
					Prompt:1,
					Locator:1,
					Location:1,
					MediaType:1,
					ContentType:1,
					UploadedOn:1,
					UploaderID:1,
					Content:1,
					UploadedBy:1,
					thumbnail:1
				};
				
				//Remove already selected media
				var selectedMediaIds = [];
				for( var loop = 0; loop < outputRecords.length; loop++ ){
					if( outputRecords[loop]._id )
						selectedMediaIds.push(outputRecords[loop]._id);
						conditions._id = {$nin : selectedMediaIds};
				}
				//console.log("selectedMediaIds = ",selectedMediaIds);//return;
				//conditions = { Status:1, MediaType:mediaType, _id:{$nin : selectedMediaIds} };
				//console.log("conditions = ",conditions);return;
				//End Remove already selected media
				
				conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
				
				media.find(conditions,fields).sort(sortObj).limit(newLimit).exec(function (err,results) { // Save
					if (err) {
						res.json({"status":"error","message":err});
						return;
					}
					else{
						//console.log(results);
						//change media object structure
						for( var loop = 0; loop < results.length; loop++ ){
							//console.log("single - ",results[loop])
							var tempObj = {};
							tempObj = results[loop].toObject();
							if( tempObj.Location[0].URL ){
								tempObj.URL = tempObj.Location[0].URL;
							}
							
							var requiredObj = {};
							requiredObj._id = tempObj._id;
							requiredObj.value = tempObj;
							
							
							if(requiredObj.value.Location[0].URL){
								requiredObj.value['URL'] = requiredObj.value.Location[0].URL;
							}
							outputRecords.push(requiredObj);
						}
						
						//return outputRecords;
						//console.log(results[0]);
						res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
						return;
					}
				});
			}
			else{
				res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount});
				return;
			}
			
		}
	});
};


//added on 04 Oct 2017 - Multiple Case
var __fullfillMediaLimit_3_withRules = async function(result , pageLimit , mediaType , res , groupTagID, switchExpression={}){
	//console.log("---------__fullfillMediaLimit-----");
	var outputRecords = [];
	var newLimit = 0;
	
	var outputRecords = result;
	//console.log("outputRecords.length = ",outputRecords.length);
	//console.log("outputRecords.length = ",outputRecords);return;
	
	var conditions = {};
	//conditions = {Status:1,IsDeleted:0};
	conditions.IsDeleted = 0;
	conditions.Status = 1;
	conditions.IsPrivate = {$ne:1};
	//conditions.MediaType = {$ne : 'Link'};
	conditions.UploadedBy = "admin";
	conditions.$or = [
		{ MediaType : "Image", AddedHow: "uploadImageTool", Source: "ChatGPT_MJ" },
		{MediaType : "Image"},
		{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}}
	];
	
	//console.log( "-------conditions----------",conditions );
	var mediaCount = 0;
	
	conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
	conditions.IsUnsplashImage = 1;
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	if(groupTagID){	//search case
		conditions.MetaMetaTags = {
			//$nin : []
			$nin : []
		};
	}
	else{							//default case
		conditions.MetaMetaTags = {
			$nin : []
		};
		/*
		conditions.GroupTags = {
			"GroupTagID" : {"$nin":[]}
		};
		*/
		conditions["GroupTags"] = {$nin: []};
		conditions["MetaTags"] = {$exists : true, $nin : []};
	}
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	//get count of all media records
	try {
		var results = await media.find(conditions).countDocuments().exec();
			mediaCount = results;
			//console.log( "-------conditions----------@@@@@@--",conditions );
			//console.log("mediaCount =@@@@@@@@@@@@@@@@@@@@@@@@2------------------ ",mediaCount);//return;
			if( outputRecords.length < pageLimit ){
				newLimit = parseInt(pageLimit - result.length);
				
				//console.log("---------In __fullfillMediaLimit if block-----newLimit = ",newLimit);
				var sortObj = {RandomSortId:-1};
				var fields = {};
				fields = {
					_id:1,
					Title:1,
					Prompt:1,
					Locator:1,
					Location:1,
					MediaType:1,
					ContentType:1,
					UploadedOn:1,
					UploaderID:1,
					Content:1,
					UploadedBy:1,
					thumbnail:1,
					IsUnsplashImage:1
				};
				
				//Remove already selected media
				var selectedMediaIds = [];
				for( var loop = 0; loop < outputRecords.length; loop++ ){
					if( outputRecords[loop]._id )
						selectedMediaIds.push(outputRecords[loop]._id);
						conditions._id = {$nin : selectedMediaIds};
				}
								
			var results = await media.find(conditions,fields).sort(sortObj).limit(newLimit).exec();
						//var tempArray = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]
						results.shuffle();
						
						//console.log(results);
						//change media object structure
						for( var loop = 0; loop < results.length; loop++ ){
							//console.log("single - ",results[loop])
							var tempObj = {};
							tempObj = results[loop].toObject();
							if( tempObj.Location[0].URL ){
								tempObj.URL = tempObj.Location[0].URL;
							}
							
							var requiredObj = {};
							requiredObj._id = tempObj._id;
							requiredObj.value = tempObj;
							
							
							if(requiredObj.value.Location[0].URL){
								requiredObj.value['URL'] = requiredObj.value.Location[0].URL;
							}
							outputRecords.push(requiredObj);
						}
						
						//return outputRecords;
						//console.log(results[0]);
						res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount, switchExpression: switchExpression});
						return;
			}
			else{
				res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount, switchExpression: switchExpression});
				return;
			}
	} catch (err) {
		res.json({"ErrorIdentityPoint":"111__fullfillMediaLimit_3_withRules","status":"error","message":err});
		return;
		}
};

//Capsule-chapterView showmore functionality
var showMoreMedia_v1_2 = function(req,res) {
	if(req.session.user){
		//console.log("Session is set!");
		//console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			//continue;
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
	var offset = req.body.offset;
	//var offset = 0;
	var pageLimit = req.body.pageLimit;
	
	var outCollection = "UserMedia_"+req.session.user._id;
	var stuff = {name: outCollection}; // Define info.
	var Model = createModelForName(stuff.name); // Create the model.
	var userMedia_userIdmodel = Model; // Create a model instance.
	var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':-1,'value.UploadedOn':-1};
	var fields = {};
		fields = {
			_id:1,
			Title:1,
			Prompt:1,
			Locator:1,
			Location:1,
			MediaType:1,
			ContentType:1,
			UploadedOn:1,
			UploaderID:1,
			Content:1,
			UploadedBy:1,
			thumbnail:1,
			IsUnsplashImage : 1
		};
		var conditions = {};
		var userMediaModel_conditions = {};
		
		conditions.IsUnsplashImage = 1;
		conditions.IsDeleted = 0;
		conditions.Status = 1;
		conditions.IsPrivate = {$ne:1};
		conditions.UploadedBy = "admin";
		conditions.$or = [
			{ MediaType : "Image", AddedHow: "uploadImageTool", Source: "ChatGPT_MJ" },
			{MediaType : "Image"},
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}}
		];
		
		//strict on Enablers MMT's media only...
		conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
		
		//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
		var _groupTagID = req.body.groupTagID ? req.body.groupTagID : false;
		if(_groupTagID){	//search case
			conditions.MetaMetaTags = {
				$nin : []
			};
		}
		else{							//default case
			userMediaModel_conditions.IsUnsplashImage = 1;
		
			conditions.MetaMetaTags = {
				$nin : []
			};
			conditions["GroupTags"] = {$nin: []};
			conditions["MetaTags"] = {$exists : true, $nin : []};
			
			conditions.UploadedBy = "admin";
		}
		//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
		
		var userMediaIds = [];
		userMedia_userIdmodel.find(userMediaModel_conditions,{"_id": 1}).exec(function (err,userMedias) {
			if (err) {
				
			} else{
				req.body.resultfrommediaId = req.body.resultfrommediaId ? req.body.resultfrommediaId : [];
				if( req.body.resultfrommediaId.length){
					userMediaIds = userMedias;
					userMediaIds= userMediaIds.concat(req.body.resultfrommediaId);
				}
				
				userMedia_userIdmodel.find(userMediaModel_conditions).sort(sortObj).skip(offset).limit(pageLimit).exec(function (err,result) { // Save
					if (err) {
						res.json({"status":"error","message":err});
						return;
					}
					else{
						if (result.length) {
							if (result.length < pageLimit) {
								var tobefetchTotalRecord = pageLimit - result.length;
								
								var sortObj__mediaModel = {RandomSortId:-1};
								
								media.find(conditions,fields).sort(sortObj__mediaModel).limit(tobefetchTotalRecord).lean().exec(function (err,resultfromMedia) { // Save
									if (err) {
										res.json({"status":"error","message":err});
										//return;
									}else{
										if (resultfromMedia.length) {
											var resultfromMediaFinal= [];
											var resultfrommediaId = [];
											for( var key = 0; key < resultfromMedia.length; key++ ){
												var obj = {};
												obj._id = resultfromMedia[key]._id;
												obj.value = resultfromMedia[key];
												
												obj.value.Location = obj.value.Location?obj.value.Location:[];
												if(obj.value.Location.length){
													obj.value.URL = obj.value.Location[0].URL;
												}else{
													//console.log("------obj.value.Location = ",obj.value.Location);
												}
												
												resultfromMediaFinal[key] = obj;
												resultfrommediaId.push({ value: {},"_id": resultfromMedia[key]._id});
											}
										}
										
										result = result.concat(resultfromMediaFinal);
										res.json({"status":"200","results":result,"resultfrommediaId": resultfrommediaId});
									}
								});
								
							}else{
								res.json({"status":"200","results":result});
							}
						}else{ 
							var mediaOffset = req.body.mediaOffset ? req.body.mediaOffset : 0;
							//var mediaOffset = 0;
							var mediaId = [];
							for(var i=0;i< userMediaIds.length;i++){
								mediaId.push(userMediaIds[i]._id);
							}
							if (mediaId.length > 0) {
								conditions._id = {
									$nin : mediaId
								};
							}
							//console.log("conditions------------0000000000000000000000000----------------",conditions);
							var sortObj = {RandomSortId:-1};
							
							media.find(conditions,fields).sort(sortObj).skip(mediaOffset).limit(pageLimit).lean().exec(function (err,result) { // Save
								if (err) {
									res.json({"status":"error","message":err});
									//return;
								}else{
									if (result.length) {
										mediaOffset = mediaOffset + result.length;
										var resultfromMediaFinal= [];
										for( var key = 0; key < result.length; key++ ){
											//console.log("-------------------------================IF-----------FOR00000000000000000",key);
											
											var obj = {};
											obj._id = result[key]._id;
											obj.value = {};
											
											result[key].Location = result[key].Location?result[key].Location:[];
											if(result[key].Location.length){
												result[key].URL = result[key].Location[0].URL;
											}else{
												//console.log("56556666------result[key].Location = ",result[key].Location);
											}
											obj.value = result[key];
											resultfromMediaFinal[key] = obj;
										}
									}
									else{
										//console.log("-------------------------================ELSE99999999999999");
									}
									res.json({"status":"200","mediaOffset": mediaOffset, "results":resultfromMediaFinal});
								}
							});
						}
					}
				});
			}
		});
}

var showMoreMedia_firstTime = function(req,res) {
	if(req.session.user){
		//console.log("Session is set!");
		//console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			//continue;
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
	var offset = req.body.offset;
	//var offset = 0;
	var pageLimit = req.body.pageLimit;
	
	var outCollection = "UserMedia_"+req.session.user._id;
	var stuff = {name: outCollection}; // Define info.
	var Model = createModelForName(stuff.name); // Create the model.
	var userMedia_userIdmodel = Model; // Create a model instance.
	var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':-1,'value.UploadedOn':-1};
	var fields = {};
		fields = {
			_id:1,
			Title:1,
			Prompt:1,
			Locator:1,
			Location:1,
			MediaType:1,
			ContentType:1,
			UploadedOn:1,
			UploaderID:1,
			Content:1,
			UploadedBy:1,
			thumbnail:1,
			IsUnsplashImage : 1
		};
		var conditions = {};
		
		conditions.IsDeleted = 0;
		conditions.Status = 1;
		conditions.IsPrivate = {$ne:1};
		conditions.UploadedBy = "admin";
		conditions.$or = [
			{MediaType : "Image"},
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}}
		];
		
		//strict on Enablers MMT's media only...
		conditions.MetaMetaTags = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
		
		//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
		var _groupTagID = req.body.groupTagID ? req.body.groupTagID : false;
		if(_groupTagID){	//search case
			conditions.MetaMetaTags = {
				$nin : []
			};
		}
		else{							//default case
			conditions.MetaMetaTags = {
				$nin : []
			};
			conditions["GroupTags"] = {$nin: []};
			conditions["MetaTags"] = {$exists : true, $nin : []};
			
			conditions.UploadedBy = "admin";
		}
		//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
		
		var userMediaIds = [];
		userMedia_userIdmodel.find({},{"_id": 1}).exec(function (err,userMedias) {
			if (err) {
				
			} else{
				req.body.resultfrommediaId = req.body.resultfrommediaId ? req.body.resultfrommediaId : [];
				if( req.body.resultfrommediaId.length){
					userMediaIds = userMedias;
					userMediaIds= userMediaIds.concat(req.body.resultfrommediaId);
				}
				
				userMedia_userIdmodel.find({}).sort(sortObj).skip(offset).limit(pageLimit).exec(function (err,result) { // Save
					if (err) {
						res.json({"status":"error","message":err});
						return;
					}
					else{
						if (result.length) {
							if (result.length < pageLimit) {
								var tobefetchTotalRecord = pageLimit - result.length;
								
								var sortObj__mediaModel = {RandomSortId:-1};
								
								media.find(conditions,fields).sort(sortObj__mediaModel).limit(tobefetchTotalRecord).lean().exec(function (err,resultfromMedia) { // Save
									if (err) {
										res.json({"status":"error","message":err});
										//return;
									}else{
										var resultfrommediaId = [];
										if (resultfromMedia.length) {
											var resultfromMediaFinal= [];
											//var resultfrommediaId = [];
											for( var key = 0; key < resultfromMedia.length; key++ ){
												var obj = {};
												obj._id = resultfromMedia[key]._id;
												obj.value = resultfromMedia[key];
												
												obj.value.Location = obj.value.Location?obj.value.Location:[];
												if(obj.value.Location.length){
													obj.value.URL = obj.value.Location[0].URL;
												}else{
													//console.log("------obj.value.Location = ",obj.value.Location);
												}
												
												resultfromMediaFinal[key] = obj;
												resultfrommediaId.push({ value: {},"_id": resultfromMedia[key]._id});
											}
										}
										
										result = result.concat(resultfromMediaFinal);
										res.json({"status":"200","results":result,"resultfrommediaId": resultfrommediaId});
									}
								});
								
							}else{
								res.json({"status":"200","results":result});
							}
						}else{ 
							var mediaOffset = req.body.mediaOffset ? req.body.mediaOffset : 0;
							//var mediaOffset = 0;
							var mediaId = [];
							for(var i=0;i< userMediaIds.length;i++){
								mediaId.push(userMediaIds[i]._id);
							}
							if (mediaId.length > 0) {
								conditions._id = {
									$nin : mediaId
								};
							}
							//console.log("conditions------------0000000000000000000000000----------------",conditions);
							var sortObj = {RandomSortId:-1};
							
							media.find(conditions,fields).sort(sortObj).skip(mediaOffset).limit(pageLimit).lean().exec(function (err,result) { // Save
								if (err) {
									res.json({"status":"error","message":err});
									//return;
								}else{
									if (result.length) {
										mediaOffset = mediaOffset + result.length;
										var resultfromMediaFinal= [];
										for( var key = 0; key < result.length; key++ ){
											//console.log("-------------------------================IF-----------FOR00000000000000000",key);
											
											var obj = {};
											obj._id = result[key]._id;
											obj.value = {};
											
											result[key].Location = result[key].Location?result[key].Location:[];
											if(result[key].Location.length){
												result[key].URL = result[key].Location[0].URL;
											}else{
												//console.log("56556666------result[key].Location = ",result[key].Location);
											}
											obj.value = result[key];
											resultfromMediaFinal[key] = obj;
										}
									}
									else{
										//console.log("-------------------------================ELSE99999999999999");
									}
									res.json({"status":"200","mediaOffset": mediaOffset, "results":resultfromMediaFinal});
								}
							});
						}
					}
				});
			}
		});
}

var getSearchGalleryMediasV2 = async function( req , res ){
	//console.log("okok.....search_v_8_revised_4--------------------------------------------------------");
	//return;
	if(req.session.user){
		//console.log("Session is set!");
		//console.log(JSON.stringify(req.session.user));
		if( req.session.user._id != undefined ){
			//continue;
			//req.query.login_user_id = req.session.user._id;
			//req.query.userFsgs = req.session.user.FSGs;
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
	
	req.body.inputData = {
		"groupTagID":req.body.groupTagID,
		"login_user_id":req.session.user._id,
		"userFsgs":req.body.userFSGs,
		"powerUserCase":req.body.powerUserCase
	};
	//console.log("INPUT : "+req.body.inputData);
	if( req.body.inputData == 'undefined'  ){
		req.json({"status":"error","message":"wrong input"});
		return;
	}
	else{
		//console.log("inputData : "+JSON.stringify(req.body.inputData));
	}
	
	var groupTagID = req.body.inputData.groupTagID;
	//console.log("jhsdgfsjhg"+groupTagID);
	var login_user_id = req.body.inputData.login_user_id;
	
	//for searching on Title 'LIKE'
	var mediaTitle = "";
	if(req.body.title)
		mediaTitle = req.body.title;
	
	//for searching on MediaType
	//var mediaType = "";
	var mediaType = [];		//multiple selection case : updated on 30042015
	if(req.body.mediaType)
		mediaType = req.body.mediaType;
	
	/*limit : not for MR
	var limit = 1000;	
    if( req.body.inputData.limit != 'undefined' )
		limit = req.body.inputData.limit;			
	*/
	
	var userFsgs = {};
	if(req.body.inputData.userFsgs)	
		userFsgs = req.body.inputData.userFsgs;
	
	var powerUserCase = 0;
	if(req.body.inputData.powerUserCase)	
		powerUserCase = 1;

	//show more pagination code
	var page = 1;
	if( req.body.page ){
		page = parseInt(req.body.page);
	}
	
	var per_page = 48;
	if( req.body.per_page ){
		per_page = parseInt(req.body.per_page);
	}

	//show more pagination code	
		
	var searchObj = {};
	searchObj.map = async function(){
		Array.max = function( array ){
			return Math.max.apply( Math, array );
		};
		var thisObj = {};
		thisObj = this;
		
		var thisObj_id = 0;
		thisObj_id = thisObj._id;
		var finalObj = {};
		
		finalObj._id = thisObj._id;			//fixed on 08042016 by manishp - was giving problem on createSearch Gallery manageSelection.
		finalObj.Title = thisObj.Title;
		finalObj.Prompt = thisObj.Prompt;
		finalObj.Locator = thisObj.Locator;	
		finalObj.Title = thisObj.Title;
		finalObj.URL = thisObj.Location[0].URL;
		finalObj.MediaType = thisObj.MediaType;
		finalObj.ContentType = thisObj.ContentType;	
		finalObj.UploadedOn = thisObj.UploadedOn;		
		finalObj.UploaderID = thisObj.UploaderID;			
		finalObj.Content = thisObj.Content;	//added on 30092014-Link case
		finalObj.thumbnail = thisObj.thumbnail;	//added on 21122014-Montage case
		finalObj.IsPrivate = thisObj.IsPrivate;	//added on 05022015-Private Media Case
		finalObj.RandomSortId = thisObj.RandomSortId;
		finalObj.IsUnsplashImage = thisObj.IsUnsplashImage;
		
		finalObj.PostsBestFSGCount = 0;
		finalObj.PostsCount = 0;
		
		finalObj.StampsBestFSGCount = 0;
		finalObj.StampsCount = 0;
		 
		finalObj.ViewsCount = 0;
		if(thisObj.ViewsCount) 
			finalObj.ViewsCount = thisObj.ViewsCount;
		
		
		finalObj.MaxFSGSort = 0;
		finalObj.AvgFSGSort = 0;
		finalObj.MediaScore = 0;
		
		var actionObj = {};
		var result = {};
		
		actionObj = {"Users":[]};
		if (thisObj.Posts)
			actionObj = thisObj.Posts;
		
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		var objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		var objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		var bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		var occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		 
		finalObj.PostsBestFSGCount = result.actionBestFSGCount;
		finalObj.PostsCount = result.actionCount;
		
		actionObj = {"Users":[]};
		if (thisObj.Stamps)
			actionObj = thisObj.Stamps;
		
		result = {};
		
		//result = perMediaMappedData(actionObj); ////return {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				itemObj = actionObj.Users[idx].UserFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		objToMapSorted = [];
		objToMapSorted = objToMap.sort();
		
		bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Array.max(objToMap);
		occurrences = 0;
		
		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{ //objToMapSorted[occIdx] < Array.max(objToMap)
				break;
			}
		}
		//console.log('Max value : '+Array.max(objToMap)+"  ----And occurrences : "+occurrences);	
		result = {actionBestFSGCount:bestMatchedCount,actionCount:occurrences};
		finalObj.StampsBestFSGCount = result.actionBestFSGCount;
		finalObj.StampsCount = result.actionCount;
		
		//added on 16092014 power-user case
		//if(powerUserCase){
			finalObj.UserMaxFSGSort = 0;
			finalObj.UserScore = 0;
			if(thisObj.OwnerFSGs && thisObj.UploadedBy == 'user'){
				itemObj = thisObj.OwnerFSGs;
				var temp = {};
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						temp[attrName] = userFsgs[attrName];
						countN += 1;
					}
				}
				finalObj.UserMaxFSGSort = countN;
			}
			if(thisObj.UserScore)
				finalObj.UserScore = thisObj.UserScore;
			
			if(thisObj.UploadedBy)
				finalObj.UploadedBy = thisObj.UploadedBy;
		//}
		//End added on 16092014 power-user case
				
		var temp = [];
		temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
		finalObj.MaxFSGSort = Array.max(temp);
		finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
		finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 
		
		if(!finalObj.MediaScore)
			finalObj.MediaScore = 0;
		//console.log('record to map : '+JSON.stringify(finalObj));
		//print("final obj : "+finalObj);
		
		emit(
			thisObj._id,
			finalObj
		);
	}
	searchObj.reduce = function(key , values){
		return values;
	}
	
	//console.log("GT-------"+groupTagID);
	
	searchObj.query = {};
	
	var mTypeArr = [];
	
	var selectedKeywords = req.body.selectedKeywords ? req.body.selectedKeywords : [];
	var mp_selectedWords = req.body.selectedWords ? req.body.selectedWords : [];
	
	var allWords = [];
	for(var i = 0; i < mp_selectedWords.length; i++) {
		mp_selectedWords[i] = typeof mp_selectedWords[i] == 'string' ? mp_selectedWords[i] : null;
		if(mp_selectedWords[i]) {
			mp_selectedWords[i] = mp_selectedWords[i].split(' (')[0];
			allWords.push(new RegExp("^"+mp_selectedWords[i].toLowerCase().trim()+"$", "i"));
			//allWords.push(mp_selectedWords[i].toLowerCase().trim());
		}
	}
	var familySetArr = [];
	if(allWords.length) {
		var familyset_conditions = {
			$or : [
				/*{GroupTagTitle:{ $regex : {$in : allWords} }},
				{MainGroupTagTitle:{ $regex : {$in : allWords} }}*/
				{GroupTagTitle:{ $in : allWords }},
				{MainGroupTagTitle:{ $in : allWords }}
			],
			status : { $in : [1, 3] },
			MetaMetaTagID : { $nin : [] }
		};
		var familySetResult = await keywordModel_allTags.find(familyset_conditions);
		var familySetResult = familySetResult ? familySetResult : [];
		
		for(var i = 0; i < familySetResult.length; i++) {
			var gt_id = familySetResult[i].gt_id ? String(familySetResult[i].gt_id) : null;
			if(gt_id) {
				if(familySetArr.indexOf(gt_id) < 0) {
					familySetArr.push(gt_id);
				}
			}
		}
	}
	selectedKeywords = selectedKeywords.concat(familySetArr);
	if(groupTagID){
		if(selectedKeywords.indexOf(groupTagID) < 0) {
			selectedKeywords.push(groupTagID)
		}
	}
	
	if(selectedKeywords.length){
		searchObj.query = {
			"GroupTags":{$in: selectedKeywords},
			"Status":1,
			"IsPrivate":{$ne:1},
			"IsDeleted":0
		};	
	}
	else{
		searchObj.query = {
			"MetaTags":{$exists : true , $nin : []},
			"GroupTags":{$nin:[]},
			"Status":1,
			"IsPrivate":{$ne:1},
			"IsDeleted":0,
			"IsUnsplashImage":1
		};
	}
	
	//console.log('----query-----',searchObj.query);
	
	searchObj.query.InAppropFlagCount = {$lt:5};	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
	// Removed MetaMetaTags requirement to allow null values
	searchObj.query.UploadedBy = "admin";
	searchObj.query.$or = [
		{MediaType : "Image"},
		{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}}
	];
	//console.log("searchObj.query---------------",searchObj.query);//return;
	
	
	
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	if(selectedKeywords.length){	//search case
		searchObj.query.MetaMetaTags = {
			$nin : []
		};
	}
	else{							//default case
		searchObj.query.MetaMetaTags = {
			$nin : []
		};
	}
	//NewPlan:Sprint#3 - house - keeping points - updated on 04 Oct 2017
	
	//searchObj.query = {};
	searchObj.scope = {
		loginUserId : login_user_id,
		userFsgs : userFsgs,
		powerUserCase : powerUserCase
	};
	//searchObj.limit = limit;
	var outCollection = "UserMedia_"+login_user_id;
	//console.log(outCollection);
	searchObj.out = {replace: outCollection};
	//searchObj.out = {reduce: outCollection};
	// Since mapReduce is deprecated, use aggregation pipeline with manual FSG processing
	try {
		// First, get all matching documents
		var matchingDocs = await media.find(searchObj.query).exec();
		
		// Process each document to calculate FSG scores
		var processedResults = [];
		for (var i = 0; i < matchingDocs.length; i++) {
			var doc = matchingDocs[i];
			var processedDoc = await processDocumentFSGs(doc, userFsgs, powerUserCase);
			processedResults.push({
				_id: doc._id,
				value: processedDoc
			});
		}
		
		// Process results
		await processResults(processedResults);
		
	} catch (err) {
		console.error("Search error:", err);
		res.json({"status":"error","message":err.message || err});
		return;
	}
	
	// Function to process FSG calculations for a single document
	async function processDocumentFSGs(doc, userFsgs, powerUserCase) {
		var finalObj = {};
		finalObj._id = doc._id;
		finalObj.Title = doc.Title;
		finalObj.Prompt = doc.Prompt;
		finalObj.Locator = doc.Locator;	
		finalObj.Title = doc.Title;
		finalObj.URL = doc.Location[0].URL;
		finalObj.MediaType = doc.MediaType;
		finalObj.ContentType = doc.ContentType;	
		finalObj.UploadedOn = doc.UploadedOn;		
		finalObj.UploaderID = doc.UploaderID;			
		finalObj.Content = doc.Content;
		finalObj.thumbnail = doc.thumbnail;
		finalObj.IsPrivate = doc.IsPrivate;

		finalObj.PostsBestFSGCount = 0;
		finalObj.PostsCount = 0;
		finalObj.StampsBestFSGCount = 0;
		finalObj.StampsCount = 0;
		finalObj.ViewsCount = 0;
		if(doc.ViewsCount) 
			finalObj.ViewsCount = doc.ViewsCount;

		finalObj.MaxFSGSort = 0;
		finalObj.AvgFSGSort = 0;
		finalObj.MediaScore = 0;

		// Process Posts FSG scoring
		var actionObj = {"Users":[]};
		if (doc.Posts)
			actionObj = doc.Posts;

		var objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				var itemObj = actionObj.Users[idx].UserFSGs;
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		var objToMapSorted = [];
		objToMapSorted = objToMap.sort();

		var bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Math.max.apply(Math, objToMap);
		var occurrences = 0;

		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{
				break;
			}
		}
		finalObj.PostsBestFSGCount = bestMatchedCount;
		finalObj.PostsCount = occurrences;

		// Process Stamps FSG scoring
		actionObj = {"Users":[]};
		if (doc.Stamps)
			actionObj = doc.Stamps;

		objToMap = [];
		for(var idx = 0; idx < actionObj.Users.length; idx++ ){
			if(actionObj.Users[idx].UserFSGs){
				var itemObj = actionObj.Users[idx].UserFSGs;
				var countN = 0;
				for( var attrName in userFsgs ){
					if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
						countN += 1;
					}
				}
				objToMap.push(countN);
			}
		}
		objToMapSorted = [];
		objToMapSorted = objToMap.sort();

		bestMatchedCount = 0;
		if(objToMap.length)
			bestMatchedCount = Math.max.apply(Math, objToMap);
		occurrences = 0;

		for( var occIdx = objToMapSorted.length - 1; occIdx >= 0; occIdx-- ){
			if(  objToMapSorted[occIdx] == bestMatchedCount ){
				occurrences++;
			}
			else{
				break;
			}
		}
		finalObj.StampsBestFSGCount = bestMatchedCount;
		finalObj.StampsCount = occurrences;

		// Process User FSG scoring for power users
		finalObj.UserMaxFSGSort = 0;
		finalObj.UserScore = 0;
		if(doc.OwnerFSGs && doc.UploadedBy == 'user'){
			var itemObj = doc.OwnerFSGs;
			var countN = 0;
			for( var attrName in userFsgs ){
				if( itemObj[attrName] != undefined && itemObj[attrName] == userFsgs[attrName] ){
					countN += 1;
				}
			}
			finalObj.UserMaxFSGSort = countN;
		}
		if(doc.UserScore)
			finalObj.UserScore = doc.UserScore;

		if(doc.UploadedBy)
			finalObj.UploadedBy = doc.UploadedBy;

		var temp = [];
		temp.push(finalObj.PostsBestFSGCount,finalObj.StampsBestFSGCount);
		finalObj.MaxFSGSort = Math.max.apply(Math, temp);
		finalObj.AvgFSGSort = (finalObj.PostsBestFSGCount+finalObj.StampsBestFSGCount)/2;
		finalObj.MediaScore = ((finalObj.PostsCount+finalObj.StampsCount)/finalObj.ViewsCount)*10; 

		if(!finalObj.MediaScore)
			finalObj.MediaScore = 0;

		return finalObj;
	}
	
	async function processResults(processedResults) {
		try {
			// Store processed results in user collection
		var stuff = {name: outCollection}; // Define info.
		var Model = createModelForName(stuff.name); // Create the model.
		var userMedia_userIdmodel = Model; // Create a model instance.
			
			await userMedia_userIdmodel.deleteMany({});
			if (processedResults.length > 0) {
				await userMedia_userIdmodel.insertMany(processedResults);
			}
		
		var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':1,'value.UploadedOn':-1};
		if(powerUserCase)
			sortObj = {'value.UserMaxFSGSort':-1,'value.UserScore':-1,'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':1,'value.UploadedOn':-1};
			
		//var pageLimit = 48;	
		var pageLimit = page*per_page;	
		
			var finalResult = await userMedia_userIdmodel.find({}).sort(sortObj).limit(pageLimit).exec();
			await __fullfillMediaLimit_3_withRules(finalResult , pageLimit , mTypeArr , res , groupTagID);
			
		} catch (err) {
			console.error("Process results error:", err);
			res.json({"status":"error","message":err.message || err});
				return;
			}
			}
}

var getSearchGalleryMedias = async function (req, res) {
	var selectedKeywords = req.body.selectedKeywords ? req.body.selectedKeywords : [];
	var mp_selectedWords = req.body.selectedWords ? req.body.selectedWords : [];
	var page = req.body.page ? req.body.page : 1;
	var per_page = req.body.per_page ? req.body.per_page : 1;
	
	var groupTagID = req.body.groupTagID;
	var login_user_id = String(req.session.user._id);
	var outCollection = "UserMedia_"+login_user_id;
	
	var allWords = [];
	for(var i = 0; i < mp_selectedWords.length; i++) {
		mp_selectedWords[i] = typeof mp_selectedWords[i] == 'string' ? mp_selectedWords[i] : null;
		if(mp_selectedWords[i]) {
			if(allWords.indexOf(mp_selectedWords[i]) < 0){
				mp_selectedWords[i] = mp_selectedWords[i].split(' (')[0];
				allWords.push(new RegExp("^"+mp_selectedWords[i].toLowerCase().trim()+"$", "i"));
				//allWords.push(mp_selectedWords[i].toLowerCase().trim());
			}
		}
	}
	
	var familySetArr = [];
	if(allWords.length) {
		var familyset_conditions = {
			$or : [
				{GroupTagTitle:{ $in : allWords }},
				{MainGroupTagTitle:{ $in : allWords }}
			],
			status : { $in : [1, 3] },
			MetaMetaTagID : { $nin : [] }
		};
		
		var familySetResult_main = await keywordModel_allTags.find(familyset_conditions);
		
		var allWords2 = [];
		for(var i = 0; i < familySetResult_main.length; i++) {
			familySetResult_main[i].GroupTagTitle = typeof familySetResult_main[i].GroupTagTitle == 'string' ? familySetResult_main[i].GroupTagTitle : null;
			if(familySetResult_main[i].GroupTagTitle) {
				if(allWords2.indexOf(familySetResult_main[i].GroupTagTitle) < 0){
					allWords2.push(new RegExp("^"+familySetResult_main[i].GroupTagTitle.toLowerCase().trim()+"$", "i"));
				}
			}
		}

		familyset_conditions["$or"] = [
			//{GroupTagTitle:{ $in : allWords2 }},
			{MainGroupTagTitle:{ $in : allWords2 }}
		];

		var familySetResult = await keywordModel_allTags.find(familyset_conditions);


		var familySetResult = familySetResult ? familySetResult : [];
		
		for(var i = 0; i < familySetResult.length; i++) {
			var gt_id = familySetResult[i].gt_id ? String(familySetResult[i].gt_id) : null;
			if(gt_id) {
				if(familySetArr.indexOf(gt_id) < 0) {
					familySetArr.push(gt_id);
				}
			}
		}
	}
	
	selectedKeywords = selectedKeywords.concat(familySetArr);
	if(groupTagID){
		if(selectedKeywords.indexOf(groupTagID) < 0) {
			selectedKeywords.push(groupTagID)
		}
	}
	
	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		MetaMetaTags : {
			$nin : []
		},
		"GroupTags" : { $nin : [] },
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
			{ MediaType : "Image", AddedHow: "uploadImageTool", Source: "ChatGPT_MJ" }
		],
		InAppropFlagCount : { $lt:5 }
	};
	
	if(selectedKeywords.length){
		conditions["MetaMetaTags"] = {
			$nin : []
		};
		
		conditions["GroupTags"] = { $in : selectedKeywords };
		conditions["$or"] = [
			{MediaType : "Image"},
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}, IsUnsplashImage : true}
		];
	}
	
	var fields = {};	
	var sortObj = {"value.RandomSortId" : -1};
	
	var page = req.body.page ? parseInt(req.body.page) : 1;
	var per_page = req.body.per_page ? parseInt(req.body.per_page) : 48;
	var limit = page*per_page;	//48
	
	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["GroupTags"] = {
			$in : selectedKeywords
		};
		
		conditions["$or"] = [
			{ MediaType : "Image", AddedHow: "uploadImageTool", Source: "ChatGPT_MJ" },
			{ MediaType : "Image" },
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true }
		]
		
		aggregateStages.push ({ $match : conditions });
		
		aggregateStages.push ({ $unwind : "$GroupTags" });
		
		//this is the grouptags set by rank
		var subsetByRank = {};
		var selKeywordsLen = selectedKeywords.length;
		var totalSets = [];
		for(var i = 0; i < selKeywordsLen; i++) {
			if(selectedKeywords.indexOf(groupTagID) < 0) {
				totalSets.push([selectedKeywords[i]]);
			}
		}
		totalSets.push([groupTagID]);
		
		var maxRank = totalSets.length;
		var switchBranches = [];
		var concatBranches = [];
		var counter = 0;
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags", totalSets[i] ]},
				  then: (i+1)
				}
			);
			
			concatBranches.push({
				$cond: {
				  if: {
					$and: [{
					  $in : [ "$GroupTags", totalSets[i] ]
					}]
				  },
				  then: String(maxRank - i),
				  else: ""
				}
			});
			
			counter++;
		}

		var switchExpression = {};
		var concatExpression = {};
		
		if(switchBranches.length) {
			switchExpression = {
				$switch : {
					branches : switchBranches,
					default : 0
				}
			};
			
			concatExpression = {
				"$concat" : concatBranches
			};
			
			aggregateStages.push (
				{
					"$group" : {
						"_id" : "$_id",
						Title : {$first : "$Title"},
						Prompt : {$first : "$Prompt"},
						Locator : {$first : "$Locator"},	
						Location : {$first : "$Location"},
						MediaType : {$first : "$MediaType"},
						ContentType : {$first : "$ContentType"},	
						UploadedOn : {$first : "$UploadedOn"},
						Content : {$first : "$Content"},
						URLObj : {$first : { $arrayElemAt: [ "$Location", 0 ] }},
						thumbnail : {$first : "$thumbnail"},
						IsPrivate : {$first : "$IsPrivate"},
						RandomSortId : {$first : "$RandomSortId"},
						IsUnsplashImage : {$first : "$IsUnsplashImage"},
						ViewsCount : {$first : "$ViewsCount"},
						"Ranks" : { "$push": switchExpression },
						//"Ranks" : { "$push": concatExpression }
					}
				}
			);
		}
		
		//aggregateStages.push ({ $match : conditions });
		
		sortObj = {
			"value.Ranks" : -1,//,
			"value.UploadedOn" : -1
			//"value.UploadedOn" : -1
		};
	} else {
		aggregateStages.push ({ $match : conditions });
	}
	
	aggregateStages.push ({
		$project : {
			"_id" : "$_id",
			"value" : {
				_id : "$_id", 
				Title : "$Title",
				Prompt : "$Prompt",
				Locator : "$Locator",	
				Location : "$Location",
				MediaType : "$MediaType",
				ContentType : "$ContentType",	
				UploadedOn : "$UploadedOn",
				Content : "$Content",
				URL : "$URLObj.URL",
				thumbnail : "$thumbnail",
				IsPrivate : "$IsPrivate",
				RandomSortId : "$RandomSortId",
				IsUnsplashImage : "$IsUnsplashImage",
				ViewsCount : "$ViewsCount",
				"Ranks" : { "$max": "$Ranks" }
			}
		}
	});
	
	aggregateStages.push ({	$limit : 500 });	//setting this so it doesn't fill our db space too much. 
	
	aggregateStages.push ({	$out : outCollection });
	
	//var mediaCount = await media.find(conditions, fields).count();
	//mediaCount = mediaCount ? mediaCount : 0;
	
	var results = await media.aggregate(aggregateStages).allowDiskUse(true).exec();
	var stuff = {name: outCollection};
	var Model = createModelForName(stuff.name);
	var userMedia_userIdmodel = Model;
	
	//var sortObj = {'value.MaxFSGSort':-1,'value.AvgFSGSort':-1,'value.MediaScore':-1,'value.RandomSortId':1,'value.UploadedOn':-1};
	var sortObj = {"value.Ranks" : -1, "value.UploadedOn" : -1};
	//var pageLimit = 48;	
	var pageLimit = page*per_page;	
	var mTypeArr = [];
	
	var result = await userMedia_userIdmodel.find({}).sort(sortObj).limit(pageLimit).exec();
	result = Array.isArray(result) ? result : [];
	await __fullfillMediaLimit_3_withRules(result , pageLimit , mTypeArr , res , groupTagID, switchExpression);
}

exports.getSearchGalleryMedias = getSearchGalleryMedias;
exports.search_v_8 = search_v_8_revised_4;			// for other than default case - frontend
exports.search_v_8_temp = search_v_8_temp;			// for default gallery and create gallery case
//exports.showMoreMedia = showMoreMedia;
exports.showMoreMedia = showMoreMedia_v1_2;			// IN USE ----------------------------------------------
exports.showMoreMedia_firstTime = showMoreMedia_firstTime; //not in use yet
exports.search_by_descriptor = search_by_descriptor_v2;
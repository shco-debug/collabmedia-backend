var Capsule = require('../models/capsuleModel.js');
var Chapter = require('../models/chapterModel.js');
var Page = require('../models/pageModel.js');
var groupTags = require('../models/groupTagsModel.js');
var keywordModel_allTags = require('../models/allTagsModel.js');
var mongoose = require("mongoose");
const axios = require('axios');
var async_lib = require('async');
var ObjectId = mongoose.Types.ObjectId;

var capsule__checkCreator = function (req , res , next){
	var capsuleId = req.headers.capsule_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:capsuleId,
		CreaterId : userId,
		Status : true,
		IsDeleted : false
	};
	
	var fields = {
		_id : true
	};
	
	Capsule.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				res.send(401, 'Access Denied');
			}
		}
		else{
			res.send(401, 'Access Denied');
		}
	});
}

var capsule__checkOwnership = function (req , res , next){
	var capsuleId = req.headers.capsule_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:capsuleId,
		OwnerId : userId,
		Status : true,
		IsDeleted : false
	};
	
	var fields = {
		_id : true
	};
	
	Capsule.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				res.send(401, 'Access Denied');
			}
		}
		else{
			res.send(401, 'Access Denied');
		}
	});
}

var capsule__checkIsSharable = function (req , res , next){
	var capsuleId = req.headers.capsule_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:capsuleId,
		OwnerId : userId,
		Status : true,
		IsDeleted : false
	};
	
	var fields = {
		_id : true
	};
	
	Capsule.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				res.send(401, 'Access Denied');
			}
		}
		else{
			res.send(401, 'Access Denied');
		}
	});
}

var capsule__checkPublishStatusAndCreator = function (req , res , next){
	var capsuleId = req.headers.capsule_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:capsuleId,
		CreaterId : userId,
		Status : true,
		IsDeleted : false,
		IsPublished : false
	};
	
	var fields = {
		_id : true
	};
	
	Capsule.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				req.session.user = null; // Deletes the cookie.
				res.clearCookie('connect.sid', { path: '/capsule' });
				res.send(401, 'Access Denied');
				return;
			}
		}
		else{
			req.session.user = null; // Deletes the cookie.
			res.clearCookie('connect.sid', { path: '/capsule' });
			res.send(401, 'Access Denied');
			return;
		}
	});
}

var chapter__checkOwnership = function (req , res , next){
	var chapterId = req.headers.chapter_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:chapterId,
		OwnerId : userId,
		Status : true,
		IsDeleted : false
	};
	
	var fields = {
		_id : true
	};
	
	Chapter.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				req.session.user = null; // Deletes the cookie.
				res.clearCookie('connect.sid', { path: '/capsule' });
				res.send(401, 'Access Denied');
			}
		}
		else{
			req.session.user = null; // Deletes the cookie.
			res.clearCookie('connect.sid', { path: '/capsule' });
			res.send(401, 'Access Denied');
		}
	});
} 

//adding one more check - for Capsule Verifier on 05 July 2017 by manishp
var chapter__checkMembership = function (req , res , next){
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	req.session.user.Email = req.session.user.Email ? req.session.user.Email : null;
	
	if(req.session.user.Email != null && process.CAPSULE_VERIFIER.indexOf(req.session.user.Email) >= 0 ) {
		return next();
	}
	else{
	
		if(req.headers.is_journal){
			var pageId = req.headers.page_id; 
			var userId = req.session.user._id;
			var userEmail = req.session.user.Email;
			
			var conditions = {
				_id : mongoose.Types.ObjectId(pageId),
				$or : [
					{OwnerId : String(userId)},
					{"LaunchSettings.Invitees.UserEmail" : userEmail},
					{IsPublicPage : true}
				],
				IsDeleted : false,
				//Origin : 'journal'
			};
			
			var fields = {
				_id : 1
			};
			
			//console.log("JOURNAL ACCESS CONTROL --------- conditions = ",conditions);
			
			Page.find(conditions , fields , function(err , result){
				if( !err ){
					//console.log("JOURNAL ACCESS CONTROL --------- result = ",result);
					if( result.length ){
						return next();
					}
					else{
						//console.log("JOURNAL ACCESS CONTROL --------- NO RESULT FOUND @@@@@@@@@");
						
						//check if it's a public chapter
						var chapterId = req.headers.chapter_id;
						
						var conditions = {
							_id : chapterId,
							Status : true,
							IsDeleted : false,
							IsPublic : true
						};
						
						var fields = {
							_id : true
						};
						
						Chapter.find(conditions , fields , function(err , result){
							if( !err ){
								if( result.length ){
									return next();
								}
								else{
									req.session.user = null; // Deletes the cookie.
									res.clearCookie('connect.sid', { path: '/capsule' });
									res.send(401, 'Access Denied');
									
								}
							}
							else{
								req.session.user = null; // Deletes the cookie.
								res.clearCookie('connect.sid', { path: '/capsule' });
								res.send(401, 'Access Denied');
								
							}
						});
					}
				}
				else{
					req.session.user = null; // Deletes the cookie.
					res.clearCookie('connect.sid', { path: '/capsule' });
					res.send(401, 'Access Denied');
				}
			});
		}
		else{
			var chapterId = req.headers.chapter_id; 
			var userId = req.session.user._id;
			var userEmail = req.session.user.Email;
			
			var conditions = {
				_id : chapterId,
				$or : [
					{OwnerId : userId},
					{"LaunchSettings.Invitees.UserEmail" : userEmail}
				],
				Status : true,
				IsDeleted : false,
				//Origin : { $ne : 'journal'}
			};
			
			var fields = {
				_id : true
			};
			
			Chapter.find(conditions , fields , function(err , result){
				if( !err ){
					if( result.length ){
						return next();
					}
					else{
						req.session.user = null; // Deletes the cookie.
						res.clearCookie('connect.sid', { path: '/capsule' });
						res.send(401, 'Access Denied');
						
					}
				}
				else{
					req.session.user = null; // Deletes the cookie.
					res.clearCookie('connect.sid', { path: '/capsule' });
					res.send(401, 'Access Denied');
					
				}
			});
		}
	}
} 


var chapter__checkIsSharable = function (req , res , next){
	var chapterId = req.headers.chapter_id; 
	var userId = req.session.user._id;
	
	var conditions = {
		_id:chapterId,
		OwnerId : userId,
		Status : true,
		IsDeleted : false
	};
	
	var fields = {
		_id : true
	};
	
	Chapter.find(conditions , fields , function(err , result){
		if( !err ){
			if( result.length ){
				return next();
			}
			else{
				req.session.user = null; // Deletes the cookie.
				res.clearCookie('connect.sid', { path: '/capsule' });
				res.send(401, 'Access Denied');
			}
		}
		else{
			req.session.user = null; // Deletes the cookie.
			res.clearCookie('connect.sid', { path: '/capsule' });
			res.send(401, 'Access Denied');
		}
	});
}

function sortKeys(obj_1) {
	var key = Object.keys(obj_1)
	.sort(function order(key1, key2) {
		if (key1 < key2) return -1;
		else if (key1 > key2) return +1;
		else return 0;
	}); 
	  
	// Taking the object in 'temp' object
	// and deleting the original object.
	var temp = {};
	  
	for (var i = 0; i < key.length; i++) {
		temp[key[i]] = obj_1[key[i]];
		delete obj_1[key[i]];
	} 

	// Copying the object from 'temp' to 
	// 'original object'.
	for (var i = 0; i < key.length; i++) {
		obj_1[key[i]] = temp[key[i]];
	} 
	return obj_1;
}

var searchApi__getAllWordsFromPythonApi = function(req, res, next) {
	console.log("---------- calling python api --------");
	let sec = 0;
	var timer = setInterval(function(){
		sec++;
		console.log("execution time = ", sec+" seconds.");
	},1000);
	if(req.session.user){
		if( !req.session.user._id ){
			return res.json({"status":"error","message":"Access Denied"});
		}
	}
	else {
		return res.json({"status":"error","message":"Access Denied"});
	}
	
	req.body.selectedWords = req.body.selectedWords ? req.body.selectedWords : [];
	req.body.selectedKeywords = req.body.selectedKeywords ? req.body.selectedKeywords : [];
	req.body.generatedKeywords = [];
	if(!req.body.selectedWords.length) {
		if(timer) {
			clearInterval(timer);
		}
		next();
	} else {
		var request_url = 'http://www.scrpt.com:5000/api/gen_toptagsv2';
		var request_body = {
		  "words": req.body.selectedWords,
		  "top": 50,
		  "topinter": 30,
		  "minfreq": 1
		};

		axios.post(request_url, request_body)
		.then(response => {
			//console.log("python api response.data -----------------------------", response.data);
			response.data = response.data ? response.data : {};
			for (var word in response.data) {
				if(req.body.selectedWords.indexOf(word) < 0) {
					req.body.selectedWords.push(word);
				}
			}
			
			var selectedWords = [];
			for(var i = 0; i < req.body.selectedWords.length; i++) {
				selectedWords.push({GroupTagTitle:{ $regex : new RegExp("^"+req.body.selectedWords[i].trim()+"$", "i") }});
			}
			
			var conditions = {
				//_id : { $nin : process.SEARCH_ENGINE_CONFIG.GT__RemoveFrom__SearchCase },
				status : { $in : [1, 3] },
				MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			};
			
			if(selectedWords.length) {
				conditions["$or"] = selectedWords;
			}
			
			var fields = {
				GroupTagTitle : 1,
				MainGroupTagTitle : 1,
				gt_id : 1
			};
			
			var subsetByRankObj = {};
			var subsetByRankObj2 = {};
			//console.log("-----------------------conditions---------------------", conditions);
			keywordModel_allTags.find(conditions, fields, function(err, results){
				if (err) {
					console.log("err ------------------------ ", err);
					next();
				}
				else{
					for(var i = 0; i < results.length; i++) {
						if(req.body.generatedKeywords.indexOf(String(results[i].gt_id)) < 0) {
							if(req.body.selectedKeywords.indexOf(String(results[i].gt_id)) < 0) {
								req.body.generatedKeywords.push(String(results[i].gt_id));
								
								//check and get rank
								var key = typeof results[i].GroupTagTitle == 'string' ? results[i].GroupTagTitle.toLowerCase().trim() : null;
								if(response.data[key]) {
									if(typeof subsetByRankObj[response.data[key]] == 'object') {
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key]] = [];
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]] = [];
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									}
								}
							}
						}
					}
					
					//console.log("req.body.generatedKeywords --- ", req.body.generatedKeywords);
					
					req.body.generatedKeywords = req.body.selectedKeywords.concat(req.body.generatedKeywords);
					
					//console.log("req.body.generatedKeywords --- ", req.body.generatedKeywords);
					subsetByRankObj['999'] = req.body.selectedKeywords;
					subsetByRankObj = sortKeys(subsetByRankObj);
					
					req.body.subsetByRank = Object.values(subsetByRankObj);
					req.body.subsetByRankObj = subsetByRankObj;
					
					subsetByRankObj2['999'] = req.body.selectedWords.length ? req.body.selectedWords[0] : '';
					subsetByRankObj2 = sortKeys(subsetByRankObj2);
					req.body.subsetByRankObj2 = subsetByRankObj2;
					
					if(timer) {
						clearInterval(timer);
					}
					next();
				}
			});
			
			//next();
		})
		.catch(error => {
			next();
		});
	}
}
var __getAllWordsFromPythonApi = async function(reqObj, callback) {
	console.log("---------- calling python api for 1st set --------");
	let sec = 0;
	var timer = setInterval(function(){
		sec++;
		console.log("execution time for 1st set = ", sec+" seconds.");
	},1000);
	
	reqObj.selectedWords = reqObj.selectedWords ? reqObj.selectedWords : [];
	reqObj.selectedKeywords = reqObj.selectedKeywords ? reqObj.selectedKeywords : [];
	reqObj.generatedKeywords = [];
	if(!reqObj.selectedWords.length) {
		if(timer) {
			clearInterval(timer);
		}
		callback(null, {});
	} else {
		/*
		var request_url = 'http://www.scrpt.com:5000/api/gen_toptagsv2';
		var request_body = {
		  "words": reqObj.selectedWords[0].toLowerCase().trim(),
		  "top": 50,
		  "topinter": 30,
		  "minfreq": 1
		};
		
		
		//new api start
		reqObj.selectedWords = [reqObj.selectedWords[0].toLowerCase().trim()];
		var request_url = 'https://darsan.herokuapp.com/api/relatedwords';
		var request_body = {
		  "word": reqObj.selectedWords[0],
		};
		//new api end
		*/
		reqObj.selectedWords[0] = reqObj.selectedWords[0].toLowerCase().trim();
		reqObj.selectedWords = [reqObj.selectedWords[0]];
		
		var request_url = '';
		var request_body = {};
		
		var whichAPI = 'API_v1';
		switch (whichAPI) {
			case 'API_v1':
				request_url = 'http://www.scrpt.com:5000/api/gen_toptagsv2';
				request_body = {
				  "words": reqObj.selectedWords,
				  "top": 50,
				  "topinter": 30,
				  "minfreq": 1
				};
				break;
			case 'API_v2':
				request_url = 'https://darsan.herokuapp.com/api/relatedwords';
				request_body = {
				  "word": reqObj.selectedWords[0],
				};
				break;
		}
		
		//console.log("request_body for 1st set = ", request_body);
		axios.post(request_url, request_body)
		.then(async response => {
			
			var familyset_conditions = {
				$or : [
					{GroupTagTitle:{ $regex : new RegExp("^"+reqObj.selectedWords[0]+"$", "i") }},
					{MainGroupTagTitle:{ $regex : new RegExp("^"+reqObj.selectedWords[0]+"$", "i") }}
				],
				status : { $in : [1, 3] },
				MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			};
			var familySetResult = await keywordModel_allTags.find(familyset_conditions);
			familySetResult = familySetResult ? familySetResult : [];
			var familySetArr = [];
			for(var i = 0; i < familySetResult.length; i++) {
				var word = familySetResult[i].GroupTagTitle ? familySetResult[i].GroupTagTitle.toLowerCase().trim() : null;
				if(word != reqObj.selectedWords[0]) {
					if(familySetArr.indexOf(word) < 0) {
						familySetArr.push(word);
					}
				}
			}
			
			if(whichAPI === 'API_v1') {
				response.data = response.data ? response.data : {};
				var tmpArr = [];
				for(const key in response.data) {
					tmpArr.push(
						{
							word: key,
							score: response.data[key]
						}
					)
				}
				response.data = tmpArr;
			}
			
			response.data = response.data ? response.data : [];
			var response_data = {};
			response_data[reqObj.selectedWords[0]] = 9999;
			
			var counter_new = 0;
			for(var i = 0; i < familySetResult.length; i++) {
				var word = familySetResult[i].GroupTagTitle ? familySetResult[i].GroupTagTitle.toLowerCase().trim() : null;
				if(word != reqObj.selectedWords[0]) {
					counter_new++;
					response_data[word] = 9999 - counter_new;
				}
			}
			
			for (var wLoop = 0; wLoop < response.data.length; wLoop++) {
				var word = response.data[wLoop].word ? response.data[wLoop].word.toLowerCase().trim() : null;
				var rank = response.data[wLoop].score ? (parseInt(response.data[wLoop].score)+1) : 0;
				if(word != reqObj.selectedWords[0]) {
					if(familySetArr.indexOf(word) < 0) {
						response_data[word] = rank;
					}
				}
			}
			response.data = response_data ? response_data : {};
			
			//console.log("response_data - ", response_data);
			
			for (var word in response.data) {
				word = word.toLowerCase().trim();
				if(reqObj.selectedWords.indexOf(word) < 0) {
					reqObj.selectedWords.push(word);
				}
			}
			
			//console.log("reqObj.selectedWords = ", reqObj.selectedWords);
			var selectedWords = [];
			for(var i = 0; i < reqObj.selectedWords.length; i++) {
				selectedWords.push(reqObj.selectedWords[i]);
				//selectedWords.push(new RegExp("^"+reqObj.selectedWords[i].toLowerCase().trim()+"$", "i"));
			}
			//console.log("------ FOR LOOPs calculations done 1111 ------- ");
			var conditions = {
				//_id : { $nin : process.SEARCH_ENGINE_CONFIG.GT__RemoveFrom__SearchCase },
				status : { $in : [1, 3] },
				MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			};
			console.log("selectedWords - ", selectedWords);
			if(selectedWords.length) {
				//conditions["$or"] = selectedWords;
				conditions["$or"] = [
					{ GroupTagTitle : {$in : selectedWords} },
					{ MainGroupTagTitle : {$in : selectedWords} }
				];
			}
			
			var fields = {
				GroupTagTitle : 1,
				MainGroupTagTitle : 1,
				gt_id : 1
			};
			
			var subsetByRankObj = {};
			var subsetByRankObj2 = {};
			//console.log("-----------------------conditions---------------------", conditions);
			keywordModel_allTags.find(conditions, fields, function(err, results){
				if (err) {
					console.log("err ------------------------ ", err);
					next();
				}
				else{
					//console.log("-------GOT Results from scrpt 1111 ------------");
					for(var i = 0; i < results.length; i++) {
						if(reqObj.generatedKeywords.indexOf(String(results[i].gt_id)) < 0) {
							if(reqObj.selectedKeywords.indexOf(String(results[i].gt_id)) < 0) {
								reqObj.generatedKeywords.push(String(results[i].gt_id));
								
								//check and get rank
								var key2 = typeof results[i].GroupTagTitle == 'string' ? results[i].GroupTagTitle.toLowerCase().trim() : null;
								var key = typeof results[i].MainGroupTagTitle == 'string' ? results[i].MainGroupTagTitle.toLowerCase().trim() : null;
								if(response.data[key]) {
									if(typeof subsetByRankObj[response.data[key]] == 'object') {
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key]] = [];
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]] = [];
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									}
								}/* else if (response.data[key2]) {
									if(typeof subsetByRankObj[response.data[key2]] == 'object') {
										subsetByRankObj[response.data[key2]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key2]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key2]] = [];
										subsetByRankObj[response.data[key2]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key2]] = [];
										subsetByRankObj2[response.data[key2]].push(String(results[i].GroupTagTitle));
									}
								}*/
							}
						}
					}
					console.log("-------FINAL LOOP DONE 1111 ------------");
					reqObj.generatedKeywords = reqObj.selectedKeywords.concat(reqObj.generatedKeywords);
					
					//subsetByRankObj['999'] = reqObj.selectedKeywords;
					subsetByRankObj = sortKeys(subsetByRankObj);
					
					reqObj.subsetByRank = Object.values(subsetByRankObj);
					reqObj.subsetByRankObj = subsetByRankObj;
					
					//console.log("reqObj.subsetByRank - ", reqObj.subsetByRank);
					//subsetByRankObj2['999'] = reqObj.selectedWords.length ? [reqObj.selectedWords[0]] : [];
					subsetByRankObj2 = sortKeys(subsetByRankObj2);
					reqObj.subsetByRankObj2 = subsetByRankObj2;
					
					if(timer) {
						clearInterval(timer);
					}
					callback(null, reqObj);
				}
			});
			
			//next();
		})
		.catch(error => {
			console.log("API Error - ", error);
			if(timer) {
				clearInterval(timer);
			}
			callback(null, {});
		});
	}
}

var __getAllWordsFromPythonApi2 = async function(reqObj, callback) {
	console.log("---------- calling python api for 2nd set --------");
	let sec = 0;
	var timer = setInterval(function(){
		sec++;
		console.log("execution time for 2nd set = ", sec+" seconds.");
	},1000);
	
	reqObj.selectedWords2 = reqObj.selectedWords2 ? reqObj.selectedWords2 : [];
	reqObj.selectedKeywords2 = reqObj.selectedKeywords2 ? reqObj.selectedKeywords2 : [];
	reqObj.generatedKeywords2 = [];
	if(!reqObj.selectedWords.length) {
		if(timer) {
			clearInterval(timer);
		}
		callback(null, {});
	} else {
		/*
		var request_url = 'http://www.scrpt.com:5000/api/gen_toptagsv2';
		var request_body = {
		  "words": reqObj.selectedWords2,
		  "top": 50,
		  "topinter": 30,
		  "minfreq": 1
		};
		
		
		//new api start
		reqObj.selectedWords2 = [reqObj.selectedWords2[0].toLowerCase().trim()];
		var request_url = 'https://darsan.herokuapp.com/api/relatedwords';
		var request_body = {
		  "word": reqObj.selectedWords2[0],
		};
		//new api end
		*/
		reqObj.selectedWords2[0] = reqObj.selectedWords2[0].toLowerCase().trim();
		reqObj.selectedWords2 = [reqObj.selectedWords2[0]];
		
		var request_url = '';
		var request_body = {};
		
		var whichAPI = 'API_v1';
		switch (whichAPI) {
			case 'API_v1':
				request_url = 'http://www.scrpt.com:5000/api/gen_toptagsv2';
				request_body = {
				  "words": reqObj.selectedWords2,
				  "top": 50,
				  "topinter": 30,
				  "minfreq": 1
				};
				break;
			case 'API_v2':
				request_url = 'https://darsan.herokuapp.com/api/relatedwords';
				request_body = {
				  "word": reqObj.selectedWords2[0],
				};
				break;
		}
		
		//console.log("request_body for 2nd set = ", request_body);
		axios.post(request_url, request_body)
		.then(async response => {
			var familyset_conditions = {
				$or : [
					{GroupTagTitle:{ $regex : new RegExp("^"+reqObj.selectedWords2[0]+"$", "i") }},
					{MainGroupTagTitle:{ $regex : new RegExp("^"+reqObj.selectedWords2[0]+"$", "i") }}
				],
				status : { $in : [1, 3] },
				MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			};
			var familySetResult = await keywordModel_allTags.find(familyset_conditions);
			var familySetResult = familySetResult ? familySetResult : [];
			var familySetArr = [];
			for(var i = 0; i < familySetResult.length; i++) {
				var word = familySetResult[i].GroupTagTitle ? familySetResult[i].GroupTagTitle.toLowerCase().trim() : null;
				if(word != reqObj.selectedWords2[0]) {
					if(familySetArr.indexOf(word) < 0) {
						familySetArr.push(word);
					}
				}
			}
			
			if(whichAPI === 'API_v1') {
				response.data = response.data ? response.data : {};
				var tmpArr = [];
				for(const key in response.data) {
					tmpArr.push(
						{
							word: key,
							score: response.data[key]
						}
					)
				}
				response.data = tmpArr;
			}
			
			
			response.data = response.data ? response.data : [];
			var response_data = {};
			response_data[reqObj.selectedWords2[0]] = 9999;
			
			var counter_new = 0;
			for(var i = 0; i < familySetResult.length; i++) {
				var word = familySetResult[i].GroupTagTitle ? familySetResult[i].GroupTagTitle.toLowerCase().trim() : null;
				if(word != reqObj.selectedWords2[0]) {
					counter_new++;
					response_data[word] = 9999 - counter_new;
				}
			}
			
			for (var wLoop = 0; wLoop < response.data.length; wLoop++) {
				var word = response.data[wLoop].word ? response.data[wLoop].word.toLowerCase().trim() : null;
				var rank = response.data[wLoop].score ? parseInt(response.data[wLoop].score) : 0;
				if(word != reqObj.selectedWords2[0]) {
					if(familySetArr.indexOf(word) < 0) {
						response_data[word] = rank;
					}
				}
			}
			response.data = response_data ? response_data : {};
			
			for (var word in response.data) {
				if(reqObj.selectedWords2.indexOf(word) < 0) {
					reqObj.selectedWords2.push(word);
				}
			}
			
			//console.log("reqObj.selectedWords2 = ", reqObj.selectedWords2);
			var selectedWords = [];
			for(var i = 0; i < reqObj.selectedWords2.length; i++) {
				selectedWords.push(reqObj.selectedWords2[i].trim());
			}
			console.log("------ FOR LOOPs calculations done 2222 ------- ");
			var conditions = {
				status : { $in : [1, 3] },
				MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			};
			//console.log("selectedWords - ", selectedWords);
			if(selectedWords.length) {
				//conditions["$or"] = selectedWords;
				conditions["$or"] = [
					{ GroupTagTitle : {$in : selectedWords} },
					{ MainGroupTagTitle : {$in : selectedWords} }
				];
			}
			
			var fields = {
				GroupTagTitle : 1,
				MainGroupTagTitle : 1,
				gt_id : 1
			};
			
			var subsetByRankObj = {};
			var subsetByRankObj2 = {};
			console.log("-----------------------conditions---------------------", conditions);
			keywordModel_allTags.find(conditions, fields, function(err, results){
				if (err) {
					console.log("err ------------------------ ", err);
					next();
				}
				else{
					//console.log("-------GOT Results from scrpt 2222 ------------");
					for(var i = 0; i < results.length; i++) {
						if(reqObj.generatedKeywords2.indexOf(String(results[i].gt_id)) < 0) {
							if(reqObj.selectedKeywords2.indexOf(String(results[i].gt_id)) < 0) {
								reqObj.generatedKeywords2.push(String(results[i].gt_id));
								
								//check and get rank
								var key2 = typeof results[i].GroupTagTitle == 'string' ? results[i].GroupTagTitle.toLowerCase().trim() : null;
								var key = typeof results[i].MainGroupTagTitle == 'string' ? results[i].MainGroupTagTitle.toLowerCase().trim() : null;
								if(response.data[key]) {
									if(typeof subsetByRankObj[response.data[key]] == 'object') {
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key]] = [];
										subsetByRankObj[response.data[key]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key]] = [];
										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									}
								}/* else if (response.data[key2]) {
									if(typeof subsetByRankObj[response.data[key2]] == 'object') {
										subsetByRankObj[response.data[key2]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key2]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key2]] = [];
										subsetByRankObj[response.data[key2]].push(String(results[i].gt_id));
										
										subsetByRankObj2[response.data[key2]] = [];
										subsetByRankObj2[response.data[key2]].push(String(results[i].GroupTagTitle));
									}
								}*/
							}
						}
					}
					console.log("-------FINAL LOOP DONE 2222 ------------");
					reqObj.generatedKeywords2 = reqObj.selectedKeywords2.concat(reqObj.generatedKeywords2);
					
					//subsetByRankObj['999'] = reqObj.selectedKeywords2;
					subsetByRankObj = sortKeys(subsetByRankObj);
					
					reqObj.subsetByRank2 = Object.values(subsetByRankObj);
					reqObj.subsetByRankObj = subsetByRankObj;
					
					//subsetByRankObj2['999'] = reqObj.selectedWords2.length ? [reqObj.selectedWords2[0]] : [];
					subsetByRankObj2 = sortKeys(subsetByRankObj2);
					reqObj.subsetByRankObj22 = subsetByRankObj2;
					
					if(timer) {
						clearInterval(timer);
					}
					callback(null, reqObj);
				}
			});
			
			//next();
		})
		.catch(error => {
			console.log("API Error = ", error);
			if(timer) {
				clearInterval(timer);
			}
			callback(null, {});
		});
	}
}

async function __getKeywordIdsByNames (selectedWords) {
	selectedWords = selectedWords ? selectedWords : [];
	
	if(!selectedWords.length) {
		return [];
	}
	
	var tmpArr = [];
	for(var i = 0; i < selectedWords.length; i++) {
		tmpArr.push(selectedWords[i].trim());
	}
	
	selectedWords = tmpArr;
	
	var conditions = {
		status : { $in : [1, 3] },
		//MetaMetaTagID : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
	};
	
	if(selectedWords.length) {
		conditions["$or"] = [
			{ GroupTagTitle : {$in : selectedWords} },
			{ MainGroupTagTitle : {$in : selectedWords} }
		];
	}
	
	var fields = {
		GroupTagTitle : 1,
		MainGroupTagTitle : 1,
		gt_id : 1
	};
	
	var results = await keywordModel_allTags.find(conditions, fields);//.limit(10);
	results = Array.isArray(results) ? results : [];
	
	var keywordIds = [];
	for(var i = 0; i < results.length; i++) {
		if(keywordIds.indexOf(String(results[i].gt_id)) < 0) {
			keywordIds.push(String(results[i].gt_id));
		}
	}
	console.log("keywordIds ================================ ", keywordIds);
	return keywordIds;
}

async function fetchKeywordsFromText_PrimarySecondary (text) {
	var keywordResult = {};
	
	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/["']/g, "");
		
		var inputObj = {
			"text": inputText,
			"top": 10,
			"ngram": 2,
			"useRake": true,
			"useYake": true,
			"useBert": true,
			"topDisimilar": 5,
			"includeStopWords": true
		}
		var request_url = 'http://167.99.2.228:5000/api/extractv1';
		try {
			response = await axios.post(request_url, inputObj);
		} catch (error) {
			console.log("Error - ", error);
		}
	}
	
	response.data = response.data ? response.data : {};
	var keywordResult = response.data ? response.data : {};
	keywordResult.Primary = Array.isArray(keywordResult.Primary) ? keywordResult.Primary : [];
	keywordResult.Secondary = Array.isArray(keywordResult.Secondary) ? keywordResult.Secondary : [];
	
	keywordResult.Primary = keywordResult.Primary.slice(0,2);
	if(keywordResult.Primary.length === 0) {
		keywordResult.Primary = ["flower", "water"];
	} else if(keywordResult.Primary.length === 1) {
		keywordResult.Primary.push("flower");
	}
	return keywordResult;
}

var streamPost__getAllWordsFromPythonApi = async function (req, res, next) {
	req.body.SurpriseSelectedWords = req.body.SurpriseSelectedWords ? req.body.SurpriseSelectedWords : [];
	req.body.SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];
	req.body.SecondaryKeywords = req.body.SecondaryKeywords ? req.body.SecondaryKeywords : [];
	
	var PostStatement = req.body.PostStatement || '';
	
	var primary = req.body.SurpriseSelectedWords.length === 2 ? req.body.SurpriseSelectedWords : [];
	var secondary = Array.isArray(req.body.SecondaryKeywords) ? req.body.SecondaryKeywords : [];
	
	var keywordObj = {};
	if(PostStatement && req.body.SurpriseSelectedWords.length === 0) {
		keywordObj = await fetchKeywordsFromText_PrimarySecondary(PostStatement);
		
		primary = Array.isArray(keywordObj.Primary) ? keywordObj.Primary : [];
		secondary = Array.isArray(keywordObj.Secondary) ? keywordObj.Secondary : [];
		
		console.log("keywordObj - ", keywordObj);
	}
	
	console.log("primary - ", primary);
	console.log("secondary - ", secondary);
	
	
	if(req.body.SurpriseSelectedWords.length === 0 && primary.length === 2) {
		var PostId = req.body.PostId ? req.body.PostId : null;
		var conditions = {
			"Medias._id" : ObjectId(PostId), 
			IsDasheditpage : false
		};
		var conditions2 = {
			"Medias._id" : ObjectId(PostId), 
			IsDasheditpage : true
		};
		
		var setObj = {
			$set : {
				"Medias.$.SurpriseSelectedWords" : primary,
				"Medias.$.SecondaryKeywords": secondary
			}
		};
		
		var options = { multi: false };
		await Page.update(conditions, setObj, options);
		await Page.update(conditions2, {$set : setObj}, options);
	}
	
	req.body.SurpriseSelectedWords = primary;
	if(secondary.length) {
		req.body.SecondaryKeywords = await __getKeywordIdsByNames(secondary) || [];
	}
	
	async_lib.parallel({
		keywordsFromFirstWord: function(callback) {
			var reqObj = req.body;
			
			reqObj.selectedWords = req.body.SurpriseSelectedWords.length >= 2 ? [req.body.SurpriseSelectedWords[0]] : [];
			reqObj.selectedKeywords = req.body.SurpriseSelectedTags.length >= 2 ? [req.body.SurpriseSelectedTags[0]] : [];
			
			__getAllWordsFromPythonApi(reqObj, callback);
		},
		keywordsFromSecondWord: function(callback) {
			var reqObj = req.body;
			
			reqObj.selectedWords2 = req.body.SurpriseSelectedWords.length >= 2 ? [req.body.SurpriseSelectedWords[1]] : [];
			reqObj.selectedKeywords2 = req.body.SurpriseSelectedTags.length >= 2 ? [req.body.SurpriseSelectedTags[1]] : [];
			
			__getAllWordsFromPythonApi2(reqObj, callback);
		},
		getDontIncludeKeywords: async function(callback) {
			var reqObj = req.body;
			
			reqObj.keywordsNotNeeded = typeof reqObj.keywordsNotNeeded==='string' ? reqObj.keywordsNotNeeded.split(',') : [];
			reqObj.dontIncludeKeywords = [];
			if(reqObj.keywordsNotNeeded.length) {
				
				var dontIncludeKeywords = await __getKeywordIdsByNames(reqObj.keywordsNotNeeded);
				reqObj.dontIncludeKeywords = dontIncludeKeywords ? dontIncludeKeywords : [];
			}
			callback(null, reqObj);
		}
	}, function(err, results) {
		req.body.subsetByRank = results.keywordsFromFirstWord.subsetByRank ? results.keywordsFromFirstWord.subsetByRank : [];
		req.body.subsetByRankObj2 = results.keywordsFromFirstWord.subsetByRankObj2 ? results.keywordsFromFirstWord.subsetByRankObj2 : {};
		
		req.body.subsetByRank2 = results.keywordsFromSecondWord.subsetByRank2 ? results.keywordsFromSecondWord.subsetByRank2 : [];
		req.body.subsetByRankObj22 = results.keywordsFromSecondWord.subsetByRankObj22 ? results.keywordsFromSecondWord.subsetByRankObj22 : {};
		
		req.body.dontIncludeKeywords = results.getDontIncludeKeywords.dontIncludeKeywords ? results.getDontIncludeKeywords.dontIncludeKeywords : [];
		
		next();
	})
}

//capsule level authorization
exports.capsule__checkCreator = capsule__checkCreator;
exports.capsule__checkOwnership = capsule__checkOwnership;
exports.capsule__checkIsSharable = capsule__checkIsSharable;
exports.capsule__checkPublishStatusAndCreator = capsule__checkPublishStatusAndCreator;

//chapter level authorization
exports.chapter__checkOwnership = chapter__checkOwnership
exports.chapter__checkMembership = chapter__checkMembership
exports.chapter__checkIsSharable = chapter__checkIsSharable;
exports.searchApi__getAllWordsFromPythonApi = searchApi__getAllWordsFromPythonApi;
exports.streamPost__getAllWordsFromPythonApi = streamPost__getAllWordsFromPythonApi;
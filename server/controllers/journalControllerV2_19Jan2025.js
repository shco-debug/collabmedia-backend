var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var Labels = require('./../models/labelsModel.js');
var SyncedPost = require('./../models/syncedpostModel.js');
var SyncedPostsMap = require('./../models/SyncedpostsMap.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var User = require('./../models/userModel.js');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var async_lib = require('async');
var Media = require('./../models/mediaModel.js');
var Friend = require('./../models/friendsModel.js');
const axios = require('axios');
var PageStream = require('./../models/pageStreamModel.js');
var StreamEmailTracker = require('./../models/StreamEmailTrackerModel.js');
var StreamConversation = require('./../models/StreamConversationModel.js');
var StreamComments = require('./../models/StreamCommentsModel.js');
var StreamLikes = require('./../models/StreamLikes.js');
var StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
var StreamMembers = require('./../models/StreamMembersModel.js');
var Counters = require('./../models/countersModel.js');
var AnswerFinishLogs = require('./../models/answerFinishLogs.js');
var Award = require('./../models/awardModel.js');
var AppSettings = require('../../server/models/appSettingModel.js');
var CommonAlgo = require('./../components/commonAlgorithms.js');
var Utilities = require('./utilities.js');

var crypto = require('crypto');
//var exec = require('child_process').exec;
const util = require('util');
const exec = require('child_process').exec;
var fs = require('fs');
var im = require('imagemagick');
var easyimg = require('easyimage');
const { htmlToText } = require('html-to-text');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../../config/google/creds.json');
var keywordModel_allTags = require('../models/allTagsModel.js');
const cheerio = require('cheerio');

/**OpenAI Api configuration */
/*
const { Configuration, OpenAIApi } = require('openai');
//import { Configuration, OpenAI } from 'openai';
const configuration = new Configuration({
  organization: 'org-NjoJRKC7NSbtkJKQuiCsdcbf',
  apiKey: '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' //process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
//const backOff = require("exponential-backoff");
*/
/**OpenAI Api configuration */

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}

async function __getKeywordIdsByNames_CMIDW (selectedWords) {
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
			//{ GroupTagTitle : {$in : selectedWords} },
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
	var secondaryKeywordsMap = {};
	for(var i = 0; i < results.length; i++) {
		if(keywordIds.indexOf(String(results[i].gt_id)) < 0) {
			keywordIds.push(String(results[i].gt_id));
			//secondaryKeywordsMap[String(results[i].gt_id)] = typeof results[i].GroupTagTitle === 'string' ? results[i].GroupTagTitle.toLowerCase().trim() : '';
			secondaryKeywordsMap[String(results[i].gt_id)] = typeof results[i].MainGroupTagTitle === 'string' ? results[i].MainGroupTagTitle.toLowerCase().trim() : '';
		}
	}
	return {
		keywordIds : keywordIds,
		secondaryKeywordsMap : secondaryKeywordsMap
	};
}

async function __getKeywordIdsByNames (selectedWordsArr) {
	if(!Array.isArray(selectedWordsArr)) {
		return [];
	}
	if(!selectedWordsArr.length) {
		return [];
	}
	var selectedWords = selectedWordsArr.map((obj)=>obj.trim());
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

	var results = await keywordModel_allTags.find(conditions, fields);
	results = Array.isArray(results) ? results : [];

	var keywordIds = [];
	for(var i = 0; i < results.length; i++) {
		if(keywordIds.indexOf(String(results[i].gt_id)) < 0) {
			keywordIds.push(String(results[i].gt_id));
		}
	}
	//console.log("keywordIds.length = ", keywordIds.length);
	return keywordIds;
}

async function saveAsFriend (loginUser, member) {
	var friendsData = await Friend.find({'UserID': loginUser._id,'Friend.Email':{ $regex : new RegExp(member.Email, "i") },Status:1,IsDeleted:0});
	if(!friendsData.length) {
		//save as friend
		var frndData = await User.findOne({Email:{ $regex : new RegExp(member.Email, "i") }, IsDeleted : false});
		var IsRegistered = false;
		if (frndData != undefined && frndData != null) {
			IsRegistered = true;
		}else{
			IsRegistered = false;
		}

		var rel = 'Friend~57fc1357c51f7e980747f2ce';
		rel = rel.split('~');
		var newFriendData = {};
		newFriendData.IsRegistered = IsRegistered;
		if ( IsRegistered ) {
			newFriendData.ID = frndData._id;
			newFriendData.Pic =  frndData.ProfilePic;
			newFriendData.NickName =  frndData.NickName;
		}

		newFriendData.Email = member.Email;
		newFriendData.Name = IsRegistered ? frndData.Name : member.Name;
		newFriendData.Relation =  rel[0].trim();
		newFriendData.RelationID =  rel[1].trim();

		var friendship = new Friend();
		friendship.UserID = loginUser._id;
		friendship.Friend = newFriendData;
		friendship.Status = 1;
		friendship.IsDeleted = 0;
		friendship.CreatedOn = Date.now();
		friendship.ModifiedOn = Date.now();
		await friendship.save();
	}
}

async function isFileExists (path) {
	var fileExists = fs.existsSync(path);
	return fileExists;
}

function getKeywordNamesByKeywordMap (KeywordArr, KeywordMap) {
	KeywordArr = Array.isArray(KeywordArr) ? KeywordArr : [];
	var KeywordNamesArr = [];
	for(let i = 0; i < KeywordArr.length; i++) {
		let keyword = KeywordMap[String(KeywordArr[i])] || null;
		if(keyword) {
			KeywordNamesArr.push(keyword);
		}
	}
	return KeywordNamesArr;
}

async function fetchKeywordsFromText_rnd (text) {
	var keywordResult = [];
	var response = {};
	var inputText = typeof text == 'string' ? text : '';
	if(inputText) {
		try {
			var headers = {
				'Accept': 'application/json, */*',
				'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
			};
			var body = {
				content : encodeURI(inputText)
			};
			var request_url = 'http://yake.inesctec.pt/yake/v2/extract_keywords?max_ngram_size=1&number_of_keywords=20&highlight=false';
			//response = await axios.post(request_url, body, headers);
			response = await axios.create({
				url: request_url,
				method: 'post',
				data: body,
				headers: headers
			});
		} catch (e) {
			console.log("caught error - ", e);
		}
	}

	response.data = response.data ? response.data : {};
	console.log("response.data ================= ", response.data);
	var keywords = response.data.keywords ? response.data.keywords : [];
	console.log("keywords = ", keywords);
	var our_stopwords = ['n’t', 'n\u2019t', '\u2019re'];

	var filteredKeywords = keywords.filter(function(keyword){
		return our_stopwords.indexOf(keyword) == -1;
	});
	console.log("filteredKeywords = ", filteredKeywords);
	for(let i = 0; i < filteredKeywords.length; i++) {
		if(filteredKeywords[i].ngram) {
			keywordResult.push(filteredKeywords[i].ngram);
			if(keywordResult.length == 2) {
				break;
			}
		}
	}
	console.log("axios yake keywordResult = ", keywordResult);
	return keywordResult;
}

async function fetchKeywordsFromText (text) {
	var keywordResult = [];

	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/[^a-zA-Z0-9 ]/g, "");

		var request_url = 'http://yake.inesctec.pt/yake/v2/extract_keywords?content='+encodeURI(inputText)+'&max_ngram_size=1&number_of_keywords=20&highlight=false';
		response = await axios.get(request_url);
	}

	response.data = response.data ? response.data : {};
	var keywords = response.data.keywords ? response.data.keywords : [];
	var our_stopwords = ['n’t', 'n\u2019t', '\u2019re'];

	var filteredKeywords = keywords.filter(function(keyword){
		return keyword.ngram && our_stopwords.indexOf(keyword.ngram) == -1;
	});
	//console.log("filteredKeywords = ", filteredKeywords);
	for(let i = 0; i < filteredKeywords.length; i++) {
		if(filteredKeywords[i].ngram) {
			keywordResult.push(filteredKeywords[i].ngram);
			if(keywordResult.length == 2) {
				break;
			}
		}
	}

	if(keywordResult.length === 0) {
		keywordResult = ["flower", "water"];
	} else if(keywordResult.length === 1) {
		keywordResult.push("flower");
	}

	console.log("axios yake keywordResult = ", keywordResult);
	return keywordResult;
}

//python api : 5002 - /api/extractv1 - before using openAI Api
async function fetchKeywordsFromText_PrimarySecondary_PythonAPI (text) {
	var keywordResult = {};

	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/[^a-zA-Z0-9 ]/g, "");

		var inputObj = {
			"text": inputText,
			"top": 10,
			"ngram": 1,
			"useRake": true,
			"useYake": true,
			"useBert": true,
			"topDisimilar": 5,
			"includeStopWords": true
		}
		var request_url = 'http://www.scrpt.com:5002/api/extractv1';
		response = await axios.post(request_url, inputObj);
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

async function getPrimarySecondaryKeywordsPrompt () {
	let result = await AppSettings.findOne({PrimarySecondaryKeywordsPrompt : {$exists: true}});
	result = typeof result === 'object' ? result : {};
	return result.PrimarySecondaryKeywordsPrompt || 'What are the 2 single-words within this thought that are in yin and yang conflict with each other? Print them as the first and second words. Then, extract the 8 keywords that capture the key concepts of the thought. Print them as words 3 to 10. No numbers, descriptions, preface, labels, explanations. Only 10 single-word concepts as answers. Give me only comma separated answers.'
}

const updatePrimarySecondaryKeywordsPrompt_BROWSER_API = async function (req, res) {
	const PrimarySecondaryKeywordsPrompt = req.query.PrimarySecondaryKeywordsPrompt || null;
	if(!PrimarySecondaryKeywordsPrompt) {
		return res.json({code : 501, message: "Wrong input."});	
	}

	await AppSettings.update({PrimarySecondaryKeywordsPrompt : {$exists: true}}, {$set : { PrimarySecondaryKeywordsPrompt: PrimarySecondaryKeywordsPrompt}});
	return res.json({code : 200, message: "PrimarySecondaryKeywordsPrompt has been updated successfully"});
}

const getPrimarySecondaryKeywordsPrompt_BROWSER_API = async function (req, res) {
	return res.json({
		code : 200,
		PrimarySecondaryKeywordsPrompt : await getPrimarySecondaryKeywordsPrompt()
	});
}

async function getStreamMediaFilterSortingOrder () {
	let result = await AppSettings.findOne({StreamMediaFilterSortingOrder : {$exists: true}});
	result = typeof result === 'object' ? result : {};
	let StreamMediaFilterSortingOrder = result.StreamMediaFilterSortingOrder || '231';
	
	let sortObj = {
		"value.SecondaryKeywordsCount" : -1,
		"value.MediaSelectionCriteriaCount" : -1,
		"value.Ranks" : -1,
		"value.RandomSortId" : -1,
		"value.UploadedOn" : -1
	};

	switch (StreamMediaFilterSortingOrder) {
		case "123" : 
			sortObj = {
				"value.Ranks" : -1,
				"value.SecondaryKeywordsCount" : -1,
				"value.MediaSelectionCriteriaCount" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
		case "132" : 
			sortObj = {
				"value.Ranks" : -1,
				"value.MediaSelectionCriteriaCount" : -1,
				"value.SecondaryKeywordsCount" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
		case "213" : 
			sortObj = {
				"value.SecondaryKeywordsCount" : -1,
				"value.Ranks" : -1,
				"value.MediaSelectionCriteriaCount" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
		case "231" : 
			sortObj = {
				"value.SecondaryKeywordsCount" : -1,
				"value.MediaSelectionCriteriaCount" : -1,
				"value.Ranks" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
		case "312" : 
			sortObj = {
				"value.MediaSelectionCriteriaCount" : -1,
				"value.Ranks" : -1,
				"value.SecondaryKeywordsCount" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
		case "321" : 
			sortObj = {
				"value.MediaSelectionCriteriaCount" : -1,
				"value.SecondaryKeywordsCount" : -1,
				"value.Ranks" : -1,
				"value.RandomSortId" : -1,
				"value.UploadedOn" : -1
			};
			break;
	}
	return sortObj;
}

const updateStreamMediaFilterSortingOrder_BROWSER_API = async function (req, res) {
	const StreamMediaFilterSortingOrder = req.query.StreamMediaFilterSortingOrder || null;
	if(!StreamMediaFilterSortingOrder) {
		return res.json({code : 501, message: "Wrong input."});	
	}
	let possibleValues = [
		"123",
		"132",
		"213",
		"231",
		"312",
		"321"
	];
	
	if(possibleValues.indexOf(StreamMediaFilterSortingOrder) < 0) {
		return res.json({code : 501, message: "Wrong input."});	
	}

	await AppSettings.update({StreamMediaFilterSortingOrder : {$exists: true}}, {$set : { StreamMediaFilterSortingOrder: StreamMediaFilterSortingOrder}});
	return res.json({code : 200, message: "StreamMediaFilterSortingOrder has been updated successfully"});
}

/**fetchKeywordsFromText_PrimarySecondary - Using openAI api */
async function fetchKeywordsFromText_PrimarySecondary (text) {
	var keywordResult = {};

	var response = {};
	var openaiResponse = {
		data: {
			choices: [
				{
					message: {
						content: ''
					}
				}
			]
		}
	};
	var csvkeywords = '';
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/[^a-zA-Z0-9 ]/g, "");
		//var prompt = 'What are the 10 single-word concepts that are in yin and yang conflict within this thought? Number 1 and 2 should be the main ones in conflict. No numbers, descriptions, preface, labels, explanations. Only 10 single-word concepts as answers. Give me only comma separated answers.';
		//var prompt = ''What are the 2 single-words within this thought that are in yin and yang conflict with each other? Print them as the first and second words. Then, extract the 8 keywords that capture the key concepts of the thought. Print them as words 3 to 10. No numbers, descriptions, preface, labels, explanations. Only 10 single-word concepts as answers. Give me only comma separated answers.';
		var prompt = await getPrimarySecondaryKeywordsPrompt();
		try {
			//openaiResponse = await backOff(() => openai.createChatCompletion({
			/*openaiResponse = await openai.createChatCompletion({
			  model: "gpt-3.5-turbo", //"gpt-4-0314",
			  messages: [
				{role: "system", content: "You are an accurate researcher."},
				{role: "user", content: (prompt + '\n' + inputText)}
			  ],
			  temperature: 0.7,
			  max_tokens: 2000,
			  top_p: 1,
			  frequency_penalty: 0.5,
			  presence_penalty: 0,
			});*/
			openaiResponse = await axios.post(
				'https://api.openai.com/v1/chat/completions',
				{
					model: "gpt-3.5-turbo-1106", //"gpt-3.5-turbo", //"gpt-4-0314",
					messages: [
						{role: "system", content: "You are an accurate researcher."},
						{role: "user", content: (prompt + '\n' + inputText)}
					],
					temperature: 0.7,
					max_tokens: 2000,
					top_p: 1,
					frequency_penalty: 0.5,
					presence_penalty: 0
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer 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'
						//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
					}
				}
			);
		} catch (err) {
			console.log("Caught Error from openAI Api = ", err);		
		}
	}
	csvkeywords = openaiResponse.data.choices[0].message.content.trim();
	csvkeywords = csvkeywords.replace(/[^{a-z}{A-Z}{-}{,}{ }]/g, "");
	var csvkeywordsArr = csvkeywords.split(',');

	response.data = {
		Primary: csvkeywordsArr.slice(0,2).map((obj)=>obj.trim()),
		Secondary: csvkeywordsArr.slice(2).map((obj)=>obj.trim())
	}
	response.data = response.data ? response.data : {};
	var keywordResult = response.data ? response.data : {};
	keywordResult.Primary = Array.isArray(keywordResult.Primary) ? keywordResult.Primary : [];
	keywordResult.Secondary = Array.isArray(keywordResult.Secondary) ? keywordResult.Secondary : [];

	//keywordResult.Primary = keywordResult.Primary.slice(0,2);
	if(keywordResult.Primary.length === 0) {
		keywordResult.Primary = ["flower", "water"];
	} else if(keywordResult.Primary.length === 1) {
		keywordResult.Primary.push("flower");
	}
	console.log("keywordResult = ", keywordResult);
	//keywordResult.Primary = ['flower', 'green'];
	//keywordResult.Secondary = [];
	return keywordResult;
}

async function fetchKeywordsFromTextByNgram_Backup (text, ngram) {
	var ngram = ngram || 10;
	var keywordResult = [];

	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/[^a-zA-Z0-9 ]/g, "");

		var request_url = 'http://yake.inesctec.pt/yake/v2/extract_keywords?content='+encodeURI(inputText)+'&max_ngram_size='+ngram+'&number_of_keywords=20&highlight=false';
		response = await axios.get(request_url);
		response = response ? response : {};
		response.data = response.data ? response.data : {};
		var keywords = response.data.keywords ? response.data.keywords : [];
		var our_stopwords = ['n’t', 'n\u2019t', '\u2019re'];

		var filteredKeywords = keywords.filter(function(keyword){
			return keyword.ngram && our_stopwords.indexOf(keyword.ngram) == -1;
		});
		//console.log("filteredKeywords = ", filteredKeywords);
		for(let i = 0; i < filteredKeywords.length; i++) {
			if(filteredKeywords[i].ngram) {
				keywordResult.push(filteredKeywords[i].ngram);
				if(keywordResult.length == 1) {
					break;
				}
			}
		}
		console.log("axios yake keywordResult = ", keywordResult);
	}
	return keywordResult;
}

async function fetchKeywordsFromTextByNgram (text, ngram) {
	var ngram = ngram || 10;
	var keywordResult = [];

	var response = {};
	var inputText = typeof text == 'string' ? text.substr(0, 2000) : '';
	if(inputText) {
		inputText = inputText.replace(/[^a-zA-Z0-9 ]/g, "");

		var inputObj = {
			"text": inputText,
			"top_result": 5,
			"top": 30,
			"ngram": 10,
			"useRake": false,
			"useYake": true,
			"useBert": true,
			"rept_phrase": true,
			"dedup_Threshold": 0.9,
			"dedup_Algo": "seqm",
			"min_df": 1,
			"use_maxsum": false,
			"use_mmr": false,
			"diversity": 0.5,
			"includeStopWords": true
		};

		var request_url = 'http://www.scrpt.com:5002/api/extractv1_10grams';
		response = await axios.post(request_url, inputObj);
		response = response ? response : {};
		response.data = response.data ? response.data : {};
		var filteredKeywords = response.data.Primary ? response.data.Primary : [];
		console.log("filteredKeywords = ", filteredKeywords);
		keywordResult = filteredKeywords.length > 0 ? filteredKeywords[0] : '';
		console.log("axios http://www.scrpt.com:5002/api/extractv1_10grams phrase Result = ", keywordResult);
	}
	return keywordResult;
}

function getRandomPassword(size) {
	var chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var passwordLength = size ? size : 12;
	var password = "";
	for (var i = 0; i <= passwordLength; i++) {
		var randomNumber = Math.floor(Math.random() * chars.length);
		password += chars.substring(randomNumber, randomNumber +1);
	}
	return password;
}

function __getObjArrayIdxByKey (ObjArr , matchKey , matchVal) {
	var idx = -1;
	for( var loop = 0; loop < ObjArr.length; loop++ ){
		if (ObjArr[loop].hasOwnProperty(matchKey)) {
			if(ObjArr[loop][matchKey] == matchVal){
				idx = loop;
				break;
			}
		}
	}
	return idx;
}

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

function reverse(array) {
  var output = [];
  while (array.length) {
    output.push(array.pop());
  }

  return output;
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

var dateFormat =function(){
	var d = new Date,
	dformat = [(d.getMonth()+1)>10?(d.getMonth()+1):'0'+(d.getMonth()+1),
		(d.getDate())>10?d.getDate():'0'+d.getDate(),
		d.getFullYear()].join('')+''+
		[d.getHours(),
		d.getMinutes(),
		d.getSeconds()].join('');
		return dformat;
}

async function getPageIdByStream(StreamId) {
	var ChapterId = null;
	var PageId = null;
	var chapterResult = await Chapter.findOne({CapsuleId : StreamId, IsDeleted : false}, {_id : 1});
	chapterResult = typeof chapterResult == 'object' ? chapterResult : {};
	ChapterId = chapterResult._id ? chapterResult._id : null;
	var pageResult = {};
	if(ChapterId) {
		pageResult = await Page.findOne({ChapterId : ChapterId, IsDeleted : false, IsDasheditpage : false},{_id : 1});
		pageResult = typeof pageResult == 'object' ? pageResult : {};
	}

	PageId = pageResult._id ? pageResult._id : null;
	return PageId;
}

async function getStreamDataByChapterId(ChapterId) {
	var CapsuleId = null;
	var chapterResult = await Chapter.findOne({_id : ObjectId(ChapterId), IsDeleted : false}, {CapsuleId : 1});
	chapterResult = typeof chapterResult == 'object' ? chapterResult : {};
	CapsuleId = chapterResult.CapsuleId ? String(chapterResult.CapsuleId) : null;
	var streamResult = null;
	if(CapsuleId) {
		streamResult = await Capsule.findOne({_id : ObjectId(CapsuleId), IsDeleted : false});
		streamResult = typeof streamResult == 'object' ? streamResult : null;
	}
	return streamResult;
}

async function getPreLaunchPostsByStreamId(StreamId) {
	var ChapterId = null;
	var PageId = null;
	var chapterResult = await Chapter.findOne({CapsuleId : String(StreamId), IsDeleted : false}, {_id : 1});
	chapterResult = typeof chapterResult == 'object' ? chapterResult : {};
	ChapterId = chapterResult._id ? chapterResult._id : null;
	var pageResult = {};
	var posts = [];
	if(ChapterId) {
		pageResult = await Page.aggregate([
			{
				$match: {
					ChapterId : String(ChapterId),
					IsDeleted : false,
					IsDasheditpage : false,
					"Medias.PostType": "InfoPostOwner",
					"Medias.IsPreLaunchPost": true
				}
			},
			{ $unwind: '$Medias'},
			{
				$match: {
					"Medias.PostType": "InfoPostOwner",
					'Medias.IsPreLaunchPost': true
				}
			},
			{ $group: {_id: '$_id', posts: {$push: '$Medias'}}}
		]);
		//console.log("pageResult - ", pageResult);
		posts = Array.isArray(pageResult) ? (pageResult.length ? pageResult[0].posts : []) : [];
	}
	return posts;
}


async function notifyMembers (users, UserName, Action, StreamId) {
	console.log("-----------notifyMembers-------------");
	users = Array.isArray(users) ? users : [];
	if(!users.length || !UserName || !Action || !StreamId) {
		return;
	}

	//temporary check for amy
	if(String(users[0]) === "63704fc1d103d92d9a3c2ef2") {
		//return;
	}
	//temporary check for amy

	var conditionStrm = {};
	conditionStrm._id = ObjectId(StreamId);
	var resultsStrm = await Capsule.find(conditionStrm, {Title : 1, IsSurpriseGift : 1, LaunchSettings : 1});
	resultsStrm = Array.isArray(resultsStrm) ? resultsStrm : [];
	if(!resultsStrm.length) {
		return;
	}
	var condition = {};
	condition.name = "NotificationEmail_StreamAction";

	var CapsuleName = resultsStrm[0].Title ? resultsStrm[0].Title : '';
	var results = await EmailTemplate.find(condition, {});
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}

	for( var i = 0; i < users.length; i++ ) {
		var uId = users[i] ? users[i] : {};

		var mCond = {
			_id : ObjectId(uId),
			IsDeleted : false
		};
		var memberObj = await User.findOne(mCond);
		memberObj = typeof memberObj == 'object' ? memberObj : {};

		memberObj.PostActionsNotification = memberObj.PostActionsNotification ? memberObj.PostActionsNotification : false;
		if(memberObj.PostActionsNotification) {
			continue;
		}

		var _cId = memberObj.AllFoldersId ? memberObj.AllFoldersId : '';
		var _pId = memberObj.AllPagesId ? memberObj.AllPagesId : '';
		var userStreamPageUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+StreamId;

		var newHtml = results[0].description.replace(/{RecipientName}/g, memberObj.Name.split(' ')[0]);
		newHtml = newHtml.replace(/{UserName}/g, UserName.split(' ')[0]);
		newHtml = newHtml.replace(/{Action}/g, Action);
		newHtml = newHtml.replace(/{CapsuleName}/g, CapsuleName);
		newHtml = newHtml.replace(/{StreamUrl}/g, userStreamPageUrl);
		newHtml = newHtml.replace(/{SubscriberId}/g, CommonAlgo.commonModule.strToCustomHash(memberObj.Email));

		results[0].subject = results[0].subject ? results[0].subject : '';
		results[0].subject = results[0].subject.replace(/{UserName}/g, UserName.split(' ')[0]);
		results[0].subject = results[0].subject.replace(/{Action}/g, Action);
		results[0].subject = results[0].subject.replace(/{CapsuleName}/g, CapsuleName);

		var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
		var mailOptions = {
			from: process.EMAIL_ENGINE.info.senderLine,
			to: memberObj.Email,
			subject: results[0].subject ? results[0].subject : 'Scrpt',
			html:newHtml
		};
		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				return console.log(error);
			}
			console.log('notifyMembers---------Message sent: ' + info.response);
		});
	}
}

//updates for share and published cases
var __updateChapterCollection = function(registeredUserEmail , registeredUserId){
	if( registeredUserEmail && registeredUserId){
		var conditions = {
			OwnerEmail : registeredUserEmail,
			OwnerId : { $ne : registeredUserId}
		};

		var data = {
			OwnerId : registeredUserId
		};
		var options = {
			multi: true
		};

		Capsule.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Capsule : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Capsule : ----09998887----ERROR : ",err);
			}
		});

		Chapter.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Chapter : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Chapter : ----09998887----ERROR : ",err);
			}
		})

		Page.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Page : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Page : ----09998887----ERROR : ",err);
			}
		})
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

//updates for invitations case
var __updateChapterCollection__invitationCase = function(registeredUserEmail , registeredUserId){
	if( registeredUserEmail && registeredUserId){
		var conditions = {
			"LaunchSettings.Invitees.UserEmail" : registeredUserEmail
		};

		var data = {
			"LaunchSettings.Invitees.$.UserID" : registeredUserId
		};
		var options = {
			multi: true
		};

		Chapter.update(conditions , {$set : data} , options , function(err , numAffected){
			if( !err ){
				console.log("Chapter : Total Number Of Affected Records = ",numAffected);
			}
			else{
				console.log("Chapter : ----09998887----ERROR : ",err);
			}
		})
	}
	else{
		console.log("----09998887----registeredUserEmail : "+registeredUserEmail+" -----registeredUserId : "+registeredUserId);
	}
}

var __createDefaultJournal_BackgroundCall = function (user_id, user_email){
	var data = {};
	//set required field of the CapsuleModel
	data = {
		Origin : "journal",
		CreaterId : user_id,
		OwnerId : user_id,
		Title : 'Space',
		IsPublished : true
	};

	Capsule(data).save(function( err , result ){
		if( !err ){
			//create 3 Folders now
			var data = {};
			//set required field of the chapterModel
			data = {
				Origin : "journal",
				CapsuleId: result._id ? result._id : 0,
				CreaterId: user_id,
				OwnerId: user_id,
				IsPublished: true,
				IsLaunched: true
			}

			//save JournalId in users collection...
			var updateCond = {
				_id : user_id
			};
			var dataToSet = {
				JournalId : String(result._id)
			};
			User.update(updateCond , dataToSet , function(err , numAffected){
				if(!err){
					console.log(numAffected);
				}
				else{
					console.log(err);
				}
			});
			//save JournalId in users collection...


			//update if there is any transfer ownership chapter
			Chapter.update({
					"OwnerEmail": user_email,
					"Origin" : "journal",
					"CapsuleId" : {$exists : false}
				}, {
					$set : {
						CapsuleId : data.CapsuleId,
						OwnerId : String(user_id)
					}
				}, function(err , numAffected){
				if(!err){
					console.log(numAffected);
				}
				else{
					console.log(err);
				}
			});

			var myDefaultFolders = ["General", "Work" , "Relation" , "Play"];

			for( var loop = 0; loop < myDefaultFolders.length; loop++ ) {
				data.Title = myDefaultFolders[loop] ? myDefaultFolders[loop] : "Untitled Folder";

				Chapter(data).save(function (err, result) {
					if (!err) {
						//save All Folders - id in users collection...
						if(result.Title == 'General'){
							var updateCond = {
								_id : user_id
							};
							var dataToSet = {
								AllFoldersId : String(result._id)
							};
							User.update(updateCond , dataToSet , function(err , numAffected){
								if(!err){
									console.log(numAffected);
								}
								else{
									console.log(err);
								}
							});

							var data = {};
							data.Title = "General";
							data.Origin = "journal";
							data.CreaterId = user_id;
							data.OwnerId = user_id;

							data.ChapterId = result._id ? result._id : null;
							data.PageType = "gallery";

							data.CommonParams =  {};
							data.CommonParams.Background =  {};
							data.ViewportDesktopSections = {};
							data.ViewportDesktopSections.Background = {};
							data.ViewportDesktopSections.Widgets = [];

							data.ViewportTabletSections = {};
							data.ViewportTabletSections.Background = {};
							data.ViewportTabletSections.Widgets = [];

							data.ViewportMobileSections = {};
							data.ViewportMobileSections.Background = {};
							data.ViewportMobileSections.Widgets = [];

							data.IsLabelAllowed = true;
							data.Labels = [
								{
									"LabelId" : ObjectId("5ff179065a0a9a452c791f54"),
									"Label" : "Goal",
									"Icon" : "Goal.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179255a0a9a452c791f56"),
									"Label" : "Old story",
									"Icon" : "Old_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179465a0a9a452c791f58"),
									"Label" : "New story",
									"Icon" : "New_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179555a0a9a452c791f59"),
									"Label" : "Actions",
									"Icon" : "Skillful_action.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff1797f5a0a9a452c791f5d"),
									"Label" : "Wins",
									"Icon" : "Victory.png",
									"AddedBy" : "Admin"
								}
							];

							Page(data).save(function( err , result ){
								if( !err ){
									//save General page - id in users collection...
									if(result.Title == 'General'){
										var updateCond = {
											_id : user_id
										};
										var dataToSet = {
											AllPagesId : String(result._id)
										};
										User.update(updateCond , dataToSet , function(err , numAffected){
											if(!err){
												console.log(numAffected);
											}
											else{
												console.log(err);
											}
										});
									}
									//save General page - id in users collection...

									var response = {
										status: 200,
										message: "Page created successfully.",
										result : result
									}
									console.log(response);
								}
								else{
									console.log(err);
								}
							});
						}
						else{
							var myDefaultFoldersPages = ["Page 1" , "Page 2" , "Page 3"];

							var data = {};
							data.Origin = "journal";
							data.CreaterId = user_id;
							data.OwnerId = user_id;

							data.ChapterId = result._id ? result._id : null;
							data.PageType = "gallery";

							data.CommonParams =  {};
							data.CommonParams.Background =  {};
							data.ViewportDesktopSections = {};
							data.ViewportDesktopSections.Background = {};
							data.ViewportDesktopSections.Widgets = [];

							data.ViewportTabletSections = {};
							data.ViewportTabletSections.Background = {};
							data.ViewportTabletSections.Widgets = [];

							data.ViewportMobileSections = {};
							data.ViewportMobileSections.Background = {};
							data.ViewportMobileSections.Widgets = [];

							data.IsLabelAllowed = true;
							data.Labels = [
								{
									"LabelId" : ObjectId("5ff179065a0a9a452c791f54"),
									"Label" : "Goal",
									"Icon" : "Goal.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179255a0a9a452c791f56"),
									"Label" : "Old story",
									"Icon" : "Old_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179465a0a9a452c791f58"),
									"Label" : "New story",
									"Icon" : "New_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179555a0a9a452c791f59"),
									"Label" : "Actions",
									"Icon" : "Skillful_action.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff1797f5a0a9a452c791f5d"),
									"Label" : "Wins",
									"Icon" : "Victory.png",
									"AddedBy" : "Admin"
								}
							];

							for( var loop2 = 0; loop2 < myDefaultFoldersPages.length; loop2++ ) {
								data.Title = myDefaultFoldersPages[loop2] ? myDefaultFoldersPages[loop2] : "Untitled Page";
								Page(data).save(function( err , result ){
									if( !err ){
										var response = {
											status: 200,
											message: "Page created successfully.",
											result : result
										}
										console.log(response);
									}
									else{
										console.log(err);
									}
								});
							}
						}
					}
					else {
						console.log(err);
					}
				});
			}

			var response = {
				status: 200,
				message: "Journal created successfully.",
				result : result
			}
			//res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			//res.json(response);
		}
	});

	//transfer ownership of posts to the newly registered user.
	var conditions = {
		"OwnerEmail": user_email,
		"Origin" : "journal",
		"IsDeleted": false
	};
	var fields = {};
	Page.find(conditions, fields, function (err, results) {
		if(!err) {
			var nowDate = Date.now();
			for(var i = 0; i < results.length; i++) {
				var result = results[i];
				result.OwnerId = user_id;
				result.CreatedOn = nowDate;
				result.UpdatedOn = nowDate;

				result.Medias = result.Medias ? result.Medias : [];
				for(var i = 0; i < result.Medias.length; i++) {
					result.Medias[i].OwnerId = user_id;
					result.Medias[i].PostedBy = ObjectId(user_id);
				}

				Page(result).save(function (err, result) {
					if (!err) {
						console.log("----new page instance created..", result);
					}
					else {
						console.log(err);
					}
				});
			}
		}
	});
	//transfer ownership of posts to the newly registered user.
};

function addHexcode_blendedImage(EmailEngineDataSets) {
	for(let i = 0; i < EmailEngineDataSets.length; i++) {
		let dataRecord = EmailEngineDataSets[i];

		let PostImage1 = "";
		let PostImage2 = "";

		dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
		if(!dataRecord.VisualUrls.length) {
			continue;
		}

		if(dataRecord.VisualUrls.length == 1) {
			PostImage1 = dataRecord.VisualUrls[0];
			PostImage2 = dataRecord.VisualUrls[0];
		}

		if(dataRecord.VisualUrls.length == 2) {
			PostImage1 = dataRecord.VisualUrls[0];
			PostImage2 = dataRecord.VisualUrls[1];
		}

		//check if blended image exists
		let blendImage1 = PostImage1;
		let blendImage2 = PostImage2;
		let blendOption = dataRecord.BlendMode;
		let blendedImage = null;

		if(blendImage1 && blendImage2 && blendOption) {
			let data = blendImage1 + blendImage2 + blendOption;
			var hexcode = crypto.createHash('md5').update(data).digest("hex");
			if(hexcode) {
				blendedImage = `/streamposts/${hexcode}.png`;
			}
		}

		if(!blendedImage && (blendImage1 == blendImage2)) {
			blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
			blendedImage = blendImage1;
		}
		dataRecord.hexcode_blendedImage = blendedImage;
		EmailEngineDataSets[i] = dataRecord;
	}
	return EmailEngineDataSets;
}
/*________________________________________________________________________
   * @Date:      		12 May 2018
   * @Method :   		getMyFolders
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/
var getMyFolders = function (req, res) {
	//async_lib.series({
	async_lib.parallel({
		getAllInvitedChapters : function(callback){
			var conditions = {
				ChapterId:{ $exists: true},
				"LaunchSettings.Invitees.UserEmail" :req.session.user.Email,
				IsDeleted : false,
				Origin : "journal"
			}
			var fields = {
				ChapterId : true
			};

			Page.find(conditions, fields, function(err,result){
				if( !err ){
					var chapters = new Array();
					console.log(result);
					i = 0;
					for(test in result){
						if(result[test].ChapterId){
							chapters[i] = result[test].ChapterId;
						}
						i++;
					}
					//console.log(chapters);
					callback(null , chapters);
				}
				else{
					return callback(err , []);
				}
			});
		},
		//Topic/theme capsule purchased from store
		getAllPurchasedChapters : function(callback){
			var conditions = {
				/*$or : [
					{CreaterId : req.session.user._id,Origin : "created",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "duplicated",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : req.session.user._id,Origin : "addedFromLibrary",IsPublished : true,"LaunchSettings.Audience":"ME"},
					{CreaterId : {$ne : req.session.user._id},OwnerId : req.session.user._id,Origin : "published",IsPublished : true,"LaunchSettings.Audience":"ME"}
				],*/
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : {$in : ["Birthday", "Theme", "Stream"]},
				Status : true,
				IsDeleted : false
			};
			var fields = {
				_id	:	true
			};
			//console.log("published by me = ",conditions);
			Capsule.find(conditions , fields).exec(function( err , results ){
				if( !err ){
					var capsuleIds = [];
					for( var loop = 0; loop < results.length; loop++ ){
						capsuleIds.push(results[loop]._id);
					}

					var conditions = {
						CapsuleId : { $in : capsuleIds},
						OwnerId :req.session.user._id,
						Status: true,
						IsDeleted: false
					};
					var sortObj = {
						_id : 1,
						Order: 1,
						ModifiedOn: -1
					};

					var fields = {
						_id : 1,
						Title : 1,
						CreaterId : 1,
						OwnerId : 1
					};

					Chapter.find(conditions, fields).sort(sortObj).populate('CreaterId','Name').lean().exec(function(err,result){
						if( !err ){
							var chapters = new Array();
							i = 0;
							for(test in result){
								if(result[test]._id){
									chapters[i] = result[test];
								}
								i++;
							}
							//console.log(chapters);
							callback(null , chapters);
						}
						else{
							return callback(err , []);
						}
					});
				}
				else{
					return callback(err , []);
				}
			});
		},
		//Topic/theme capsule purchased from store
		getAllVisitedPublicChapters : function(callback){
			var conditions = {
				OwnerId : { $ne: req.session.user._id },
				IsPublic : true,
				Status: true,
				IsDeleted: false
			};
			var sortObj = {
				_id : 1,
				Order: 1,
				ModifiedOn: -1
			};

			var fields = {
				_id : 1,
				Title : 1,
				CreaterId : 1,
				OwnerId : 1
			};

			Chapter.find(conditions, fields).sort(sortObj).populate('CreaterId','Name').lean().exec(function(err,result){
				if( !err ){
					var chapters = new Array();
					i = 0;
					for(test in result){
						if(result[test]._id){
							chapters[i] = result[test];
						}
						i++;
					}
					//console.log(chapters);
					callback(null , chapters);
				}
				else{
					return callback(err , []);
				}
			});
		}
	},
	function(err, results) {
		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
		console.log("*************************************** results**************",results);
		if(!err){
			var allInvitedChaptersIds = results.getAllInvitedChapters.length ? results.getAllInvitedChapters : [];
			var allPurchasedChapterIds = results.getAllPurchasedChapters.length ? results.getAllPurchasedChapters : [];
			var allVisitedPublicChapters = results.getAllVisitedPublicChapters ? results.getAllVisitedPublicChapters : [];

			for(var i=0; i < allInvitedChaptersIds.length; i++) {
				for(var j=0; j < allVisitedPublicChapters.length; j++) {
					if( String(allInvitedChaptersIds[i]) == String(allVisitedPublicChapters[j]) ) {
						allVisitedPublicChapters.splice(j,1);
						j--;
					}
				}
			}

			var conditions = {
				//CapsuleId: req.headers.capsule_id,
				//CreaterId: String(req.session.user._id),
				OwnerId: String(req.session.user._id),
				Origin: "journal",
				"LaunchSettings.MakingFor": "ME",
				IsLaunched: true,
				Status: true,
				IsDeleted: false
			};

			if(allInvitedChaptersIds.length){
				conditions = {
					$or : [
						//{CreaterId: String(req.session.user._id)},
						{OwnerId: String(req.session.user._id)},
						{_id : {$in : allInvitedChaptersIds}}
					],
					Origin: "journal",
					"LaunchSettings.MakingFor": "ME",
					IsLaunched: true,
					Status: true,
					IsDeleted: false
				};
			}

			if( allVisitedPublicChapters.length ) {
				conditions = {
					$or : [
						//{CreaterId: String(req.session.user._id)},
						{OwnerId: String(req.session.user._id)},
						{_id : {$in : allInvitedChaptersIds}},
						{
							OwnerId: {$ne : String(req.session.user._id)},
							_id : {$in : allVisitedPublicChapters},
							IsPublic: true
						}
					],
					Origin: "journal",
					"LaunchSettings.MakingFor": "ME",
					IsLaunched: true,
					Status: true,
					IsDeleted: false
				};
			}

			var sortObj = {
				_id : 1,
				Order: 1,
				ModifiedOn: -1
			};

			var fields = {
				_id : 1,
				Title : 1,
				CreaterId : 1,
				OwnerId : 1,
				IsPublic : 1
			};

			Chapter.find(conditions, fields).sort(sortObj).populate('OwnerId','Name').lean().exec(function (err, results) {
				if (!err) {
					var firstArr = [];
					var secondArr = [];
					var finalArr = [];
					var publicTopicsArr = [];
					for (var loop = 0; loop < results.length; loop++) {
						var OwnerName = results[loop].OwnerId.Name ? results[loop].OwnerId.Name : '';
						results[loop].OwnerId = String(results[loop].OwnerId._id);
						var record = results[loop];
						if( !record.IsPublic && record.OwnerId != req.session.user._id ){
							results[loop].Title = results[loop].Title + " (" +OwnerName.split(" ")[0] +")";
							secondArr.push(results[loop]);
						}
						else{
							if(record.IsPublic) {
								publicTopicsArr.push(record);
							} else {
								firstArr.push(results[loop]);
							}
						}
					}

					//conbine here
					finalArr = firstArr.concat(secondArr);

					if(allPurchasedChapterIds.length){
						finalArr = finalArr.concat(allPurchasedChapterIds);
					}

					if(publicTopicsArr.length){
						finalArr = finalArr.concat(publicTopicsArr);
					}

					var response = {
						status: 200,
						message: "Chapters listing",
						results: finalArr
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			});
		}
		else {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		12 May 2018
   * @Method :   		getMyFolderPages
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var getMyFolderPages = function (req, res) {

	/*
	var conditions = {
		ChapterId : req.headers.chapter_id ? String(req.headers.chapter_id) : 0,
		PageType: "gallery",
		//Origin : "journal",
		//$or : [
		//	{OwnerId: String(req.session.user._id)},
		//	{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
		//],
		IsDeleted: false,
		IsDasheditpage: false
	};
	*/
	var conditions = {
		ChapterId : req.headers.chapter_id ? String(req.headers.chapter_id) : 0,
		PageType: "gallery",
		//Origin : "journal",
		$or : [
			{OwnerId: String(req.session.user._id)},
			{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
		],
		IsDeleted: false,
		IsDasheditpage: false
	};
	var sortObj = {
		_id : 1,
		Order: 1
	};

	var fields = {
		_id : 1,
		Title : 1,
		PageType : 1,
		CreaterId : 1,
		OwnerId : 1,
		Themes : 1,
		ChapterId : 1
	};

	Page.find(conditions, fields).sort(sortObj).populate('CreaterId','Name').lean().exec(function (err, results) {
		if (!err) {
			var firstArr = [];
			var secondArr = [];
			var finalArr = [];
			for (var loop = 0; loop < results.length; loop++) {
				var record = results[loop];
				if( record.OwnerId != req.session.user._id ){
					results[loop].Title = results[loop].Title; // + " (" +record.CreaterId.Name.split(" ")[0] +")";
					secondArr.push(results[loop]);
				}
				else{
					firstArr.push(results[loop]);
				}
			}

			//conbine here
			finalArr = firstArr.concat(secondArr);

			var response = {
				status: 200,
				message: "Pages listing",
				results: finalArr
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		12 May 2018
   * @Method :   		createDefaultJournal
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createDefaultJournal = function (req , res){
	var data = {};
	//set required field of the CapsuleModel
	data = {
		Origin : "journal",
		CreaterId : req.session.user._id,
		OwnerId : req.session.user._id,
		Title : 'Space'
	}
	Capsule(data).save(function( err , result ){
		if( !err ){
			//create 3 Folders now
			var data = {};
			//set required field of the chapterModel
			data = {
				Origin : "journal",
				CapsuleId: result._id ? result._id : 0,
				CreaterId: req.session.user._id,
				OwnerId: req.session.user._id,
				IsPublished: true

			}

			var myDefaultFolders = ["Work" , "Relation" , "Play"];

			for( var loop = 0; loop < 3; loop++ ) {
				data.Title = myDefaultFolders[loop] ? myDefaultFolders[loop] : "Untitled Folder";

				Chapter(data).save(function (err, result) {
					if (!err) {
						var myDefaultFoldersPages = ["Page One" , "Page Two" , "Page Three"];

						var data = {};
						data.Origin = "journal";
						data.CreaterId = req.session.user._id;
						data.OwnerId = req.session.user._id;

						data.ChapterId = result._id ? result._id : null;
						data.PageType = "content";

						data.CommonParams =  {};
						data.CommonParams.Background =  {};
						data.ViewportDesktopSections = {};
						data.ViewportDesktopSections.Background = {};
						data.ViewportDesktopSections.Widgets = [];

						data.ViewportTabletSections = {};
						data.ViewportTabletSections.Background = {};
						data.ViewportTabletSections.Widgets = [];

						data.ViewportMobileSections = {};
						data.ViewportMobileSections.Background = {};
						data.ViewportMobileSections.Widgets = [];

						for( var loop2 = 0; loop2 < 3; loop2++ ) {
							data.Title = myDefaultFoldersPages[loop2] ? myDefaultFoldersPages[loop2] : "Untitled Page";
							Page(data).save(function( err , result ){
								if( !err ){
									var response = {
										status: 200,
										message: "Page created successfully.",
										result : result
									}
									console.log(response);
								}
								else{
									console.log(err);
								}
							});
						}
					}
					else {
						console.log(err);
					}
				});
			}

			var response = {
				status: 200,
				message: "Journal created successfully.",
				result : result
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
};

var createFolder = function (req , res){
	var user_id = req.session.user._id;
	var journalId = req.session.user.JournalId ? req.session.user.JournalId : null;
	var data = {};

	if(!req.body.editFolderId){
		//set required field of the chapterModel
		data = {
			Origin : "journal",
			CapsuleId: journalId ? journalId : 0,
			CreaterId: user_id,
			OwnerId: user_id,
			IsPublished: true,
			IsLaunched: true
		}

		data.Title = req.body.Title ? req.body.Title : "Untitled Folder";

		//check if folder already exists or not..
		var uniqueCondition = {
			Title : new RegExp(data.Title, 'i'),
			Origin : "journal",
			CapsuleId: journalId ? journalId : 0,
			CreaterId: user_id,
			OwnerId: user_id,
			IsLaunched: true,
			IsDeleted : false
		};
		Chapter.find(uniqueCondition).count().exec(function(err,ChapterCount){
			if(!err){
				if(!ChapterCount){
					Chapter(data).save(function (err, result) {
						if (!err) {
							var data = {};
							data.Title = "Page 1";
							data.Origin = "journal";
							data.CreaterId = user_id;
							data.OwnerId = user_id;

							data.ChapterId = result._id ? result._id : null;
							data.PageType = "gallery";

							data.CommonParams =  {};
							data.CommonParams.Background =  {};
							data.ViewportDesktopSections = {};
							data.ViewportDesktopSections.Background = {};
							data.ViewportDesktopSections.Widgets = [];

							data.ViewportTabletSections = {};
							data.ViewportTabletSections.Background = {};
							data.ViewportTabletSections.Widgets = [];

							data.ViewportMobileSections = {};
							data.ViewportMobileSections.Background = {};
							data.ViewportMobileSections.Widgets = [];

							data.IsLabelAllowed = true;
							data.Labels = [
								{
									"LabelId" : ObjectId("5ff179065a0a9a452c791f54"),
									"Label" : "Goal",
									"Icon" : "Goal.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179255a0a9a452c791f56"),
									"Label" : "Old story",
									"Icon" : "Old_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179465a0a9a452c791f58"),
									"Label" : "New story",
									"Icon" : "New_story.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff179555a0a9a452c791f59"),
									"Label" : "Actions",
									"Icon" : "Skillful_action.png",
									"AddedBy" : "Admin"
								},
								{
									"LabelId" : ObjectId("5ff1797f5a0a9a452c791f5d"),
									"Label" : "Wins",
									"Icon" : "Victory.png",
									"AddedBy" : "Admin"
								}
							];

							data.EmailEngineDataSets = [
								{
										"AfterDays" : 1,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 2,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 4,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 8,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 12,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 16,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 21,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 26,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								},
								{
										"AfterDays" : 30,
										"VisualUrls" : [],
										"TextAboveVisual" : "",
										"TextBelowVisual" : "",
										"SoundFileUrl" : ""
								}

							];

							Page(data).save(function( err , resultPage ){
								if( !err ){
									var response = {
										status: 200,
										message: "Folder with page 1 created successfully.",
										result : result
									}
									res.json(response);
								}
								else{
									console.log(err);
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									res.json(response);
								}
							});
						}
						else {
							console.log(err);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
					});
				}
				else{
					console.log(err);
					var response = {
						status: 204,
						message: "You already have a folder with the same name."
					}
					res.json(response);
				}
			}
			else{
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});
	}
	else{
		//set required field of the chapterModel
		data = {
			_id : req.body.editFolderId ? req.body.editFolderId : null,
			Origin : "journal",
			CapsuleId: journalId ? journalId : 0,
			CreaterId: user_id,
			OwnerId: user_id,
			IsPublished: true,
			IsLaunched: true
		}

		data.Title = req.body.Title ? req.body.Title : "Untitled Folder";

		//check if folder already exists or not..
		var uniqueCondition = {
			Title : new RegExp(data.Title+"$", 'i'),
			Origin : "journal",
			CapsuleId: journalId ? journalId : 0,
			CreaterId: user_id,
			OwnerId: user_id,
			IsLaunched: true,
			IsDeleted : false
		};
		Chapter.find(uniqueCondition).count().exec(function(err,ChapterCount){
			if(!err){
				if(!ChapterCount){
					Chapter.update({_id : data._id}, {$set : {Title : data.Title}}, function (err, result) {
						if (!err) {
							var response = {
								status: 200,
								message: "Folder updated successfully.",
								result : data
							}
							res.json(response);
						}
						else{
							console.log(err);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
					});
				}
				else{
					console.log(err);
					var response = {
						status: 204,
						message: "You already have a folder with the same name."
					}
					res.json(response);
				}
			}
			else{
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});
	}
};

var createPage = function (req , res){
	//check if there is user suggested tag then add the user suggested tag entry in groupTags collection and map _id with post themes object.
	req.body.Themes = req.body.Themes ? req.body.Themes : [];

	for (var loop = 0; loop < req.body.Themes.length; loop++) {
		var gtId = req.body.Themes[loop].id ? req.body.Themes[loop].id : null;
		if (!gtId) {
			req.body.Themes[loop].text = req.body.Themes[loop].text ? req.body.Themes[loop].text : "";
			req.body.Themes[loop].text = req.body.Themes[loop].text.replace(/-/g,' ');
		}
	}

	var postThemeArr = req.body.Themes ? req.body.Themes : [];
	var userSuggestedGts = [];
	for (var loop = 0; loop < postThemeArr.length; loop++) {
		var gtId = postThemeArr[loop].id ? postThemeArr[loop].id : null;
		if (!gtId) {
			userSuggestedGts.push(postThemeArr[loop]);
		}
	}
	var AsyncOpsCounter = 0;

	if (userSuggestedGts.length) {
		for (var loop2 = 0; loop2 < userSuggestedGts.length; loop2++) {
			var userSuggestedGt = userSuggestedGts[loop2];
			chkUserGt(userSuggestedGt.text, function (response) {
				AsyncOpsCounter++;
				if (response.length >= 1) {
					var matchedWithGroupTagsName = false;
					for (var loop = 0; loop < postThemeArr.length; loop++) {
						var gtId = postThemeArr[loop].id ? postThemeArr[loop].id : null;
						if (!gtId && postThemeArr[loop].text.toLowerCase() == response[0].GroupTagTitle.toLowerCase()) {
							req.body.Themes[loop].id = String(response[0]._id);
							matchedWithGroupTagsName = true;
						}
					}

					//if not matched with group tags name - It mean It's coming as a tag under gt
					if(!matchedWithGroupTagsName){
						for (var loop = 0; loop < postThemeArr.length; loop++) {
							var gtId = postThemeArr[loop].id ? postThemeArr[loop].id : null;

							if (!gtId) {
								response[0].Tags = response[0].Tags ? response[0].Tags : [];
								for (var loop1 = 0; loop1 < response[0].Tags.length; loop1++){
									var tagObj = response[0].Tags[loop1];
									if (postThemeArr[loop].text.toLowerCase() == tagObj.TagTitle.toLowerCase()) {
										req.body.Themes[loop].id = String(response[0]._id);
										//break;
									}
								}
							}
						}
					}

					if (AsyncOpsCounter == userSuggestedGts.length) {
						NextStepAfterUserSuggestedTagMapping();
					}
				}
				else {
					var GT_fields = {
						GroupTagTitle: userSuggestedGt.text,
						Notes: "",
						DateAdded: Date.now(),
						status: 2
					};

					groupTags(GT_fields).save(function (err, data) {
						if (err) {
							//res.json(err);
							console.log("ERROR----", err);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
						else {
							groupTags.findOne({ _id: data._id }, function (err, gtData) {
								gtData.Tags.push({
									TagTitle:userSuggestedGt.text,
									status: 1
								});
								gtData.save();
							})

							for (var loop = 0; loop < postThemeArr.length; loop++) {
								var gtId = postThemeArr[loop].id ? postThemeArr[loop].id : null;
								if (!gtId && postThemeArr[loop].text.toLowerCase() == data.GroupTagTitle.toLowerCase()) {
									req.body.Themes[loop].id = String(data._id);
									break;
								}
							}

							if (AsyncOpsCounter == userSuggestedGts.length) {
								NextStepAfterUserSuggestedTagMapping();
							}
						}
					});
				}
			});
		}
	}
	else {
		NextStepAfterUserSuggestedTagMapping();
	}


	function NextStepAfterUserSuggestedTagMapping() {
		if(req.body.editPageId){
			var user_id = req.session.user._id;
			var folderId = req.body.chapter_id ? req.body.chapter_id : null;
			var pageTitle = req.body.Title ? req.body.Title : null;
			var Themes = req.body.Themes ? req.body.Themes : [];

			if( folderId ){
				var data = {};
				data._id = req.body.editPageId ? req.body.editPageId : null;
				data.Title = pageTitle ? pageTitle : "Untitled Page";
				data.Origin = "journal";
				data.CreaterId = user_id;
				data.OwnerId = user_id;

				data.ChapterId = folderId ? folderId : null;
				data.PageType = "gallery";
				data.Themes = Themes;

				data.CommonParams =  {};
				data.CommonParams.Background =  {};
				data.ViewportDesktopSections = {};
				data.ViewportDesktopSections.Background = {};
				data.ViewportDesktopSections.Widgets = [];

				data.ViewportTabletSections = {};
				data.ViewportTabletSections.Background = {};
				data.ViewportTabletSections.Widgets = [];

				data.ViewportMobileSections = {};
				data.ViewportMobileSections.Background = {};
				data.ViewportMobileSections.Widgets = [];

				Page.update({_id : data._id} , {$set : {Title : data.Title,Themes : data.Themes}}, function( err , result ){
					if( !err ){
						var response = {
							status: 200,
							message: "Page created successfully.",
							result : data
						}
						res.json(response);
					}
					else{
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				});
			}
			else{
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		}
		else{
			var user_id = req.session.user._id;
			var folderId = req.body.chapter_id ? req.body.chapter_id : null;
			var pageTitle = req.body.Title ? req.body.Title : null;
			var Themes = req.body.Themes ? req.body.Themes : [];

			if( folderId ){
				var data = {};
				data.Title = pageTitle ? pageTitle : "Untitled Page";
				data.Origin = "journal";
				data.CreaterId = user_id;
				data.OwnerId = user_id;

				data.ChapterId = folderId ? folderId : null;
				data.PageType = "gallery";
				data.Themes = Themes;

				data.CommonParams =  {};
				data.CommonParams.Background =  {};
				data.ViewportDesktopSections = {};
				data.ViewportDesktopSections.Background = {};
				data.ViewportDesktopSections.Widgets = [];

				data.ViewportTabletSections = {};
				data.ViewportTabletSections.Background = {};
				data.ViewportTabletSections.Widgets = [];

				data.ViewportMobileSections = {};
				data.ViewportMobileSections.Background = {};
				data.ViewportMobileSections.Widgets = [];

				data.IsLabelAllowed = true;
				data.Labels = [
					{
						"LabelId" : ObjectId("5ff179065a0a9a452c791f54"),
						"Label" : "Goal",
						"Icon" : "Goal.png",
						"AddedBy" : "Admin"
					},
					{
						"LabelId" : ObjectId("5ff179255a0a9a452c791f56"),
						"Label" : "Old story",
						"Icon" : "Old_story.png",
						"AddedBy" : "Admin"
					},
					{
						"LabelId" : ObjectId("5ff179465a0a9a452c791f58"),
						"Label" : "New story",
						"Icon" : "New_story.png",
						"AddedBy" : "Admin"
					},
					{
						"LabelId" : ObjectId("5ff179555a0a9a452c791f59"),
						"Label" : "Actions",
						"Icon" : "Skillful_action.png",
						"AddedBy" : "Admin"
					},
					{
						"LabelId" : ObjectId("5ff1797f5a0a9a452c791f5d"),
						"Label" : "Wins",
						"Icon" : "Victory.png",
						"AddedBy" : "Admin"
					}
				];

				Page(data).save(function( err , result ){
					if( !err ){
						var response = {
							status: 200,
							message: "Page created successfully.",
							result : result
						}
						res.json(response);
					}
					else{
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				});
			}
			else{
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}

		}
	}
};

function chkUserGt(abc, callback) {
	if (abc) {
		abc = abc ? abc.trim() : null;	//added by manishp on 09032016
	}
	if (abc) {
		groupTags.find({ status: { $in: [1, 2, 3] }, GroupTagTitle: { $regex: new RegExp("^"+abc+"$", "i") } }, function (err, result) {
			if (err) {
				throw err;
			}
			else {
				result = result ? result : [];
				if(!result.length){
					groupTags.find({ status: { $in: [1, 2, 3] }, "Tags.TagTitle": { $regex: new RegExp("^"+abc+"$", "i")}, "Tags.status" : 1 }, function (err, result2) {
						if (err) {
							throw err;
						}
						else{
							result2 = result2 ? result2 : [];
							if(result2.length == 1) {
								callback(result2);
							}
							else{
								callback(result);
							}
						}
					})
				}
				else{
					callback(result);
				}
				//callback(result);
			}
		});
	}
}

/*________________________________________________________________________
   * @Date:      		12 May 2018
   * @Method :   		getAllMyPages -- This api is for listing all the pages so a user can select the page for copy, move and add to functionality.
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/
var getAllMyPages = function (req, res) {
	var conditions = {
		PageType: "gallery",
		Origin : "journal",
		$or : [
			{OwnerId: String(req.session.user._id)},
			{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
		],
		IsDeleted: false,
		IsDasheditpage: false
	}

	var sortObj = {
		_id : 1,
		Order: 1
	};

	var fields = {
		_id : 1,
		Title : 1,
		PageType : 1,
		CreaterId : 1,
		OwnerId : 1,
		Themes : 1,
		ChapterId : 1
	};

	Page.find(conditions, fields).sort(sortObj).populate('ChapterId','Title').populate('OwnerId','Name').lean().exec(function (err, results) {
		if (!err) {
			var firstArr = [];
			var secondArr = [];
			var finalArr = [];
			for (var loop = 0; loop < results.length; loop++) {
				var record = results[loop];
				results[loop].Title = results[loop].ChapterId.Title +" > "+results[loop].Title;

				if( record.OwnerId != req.session.user._id ){
					results[loop].Title = results[loop].Title + " (" +record.OwnerId.Name.split(" ")[0] +")";
					secondArr.push(results[loop]);
				}
				else{
					firstArr.push(results[loop]);
				}
			}

			//conbine here
			finalArr = firstArr.concat(secondArr);

			var response = {
				status: 200,
				message: "Pages listing",
				results: finalArr
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		12 May 2018
   * @Method :   		getMyFolders
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/
var preloader__getAllHeaders = function (req, res) {
	var conditions = {
		PageType: "gallery",
		Origin : "journal",
		$or : [
			{OwnerId: String(req.session.user._id)},
			{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
		],
		IsDeleted: false,
		IsDasheditpage: false
	}

	var sortObj = {
		_id : 1,
		Order: 1
	};

	Page.aggregate([
		{$match : conditions},
		{$sort : {Order : 1}},
		{$group : {_id:"$ChapterId", HeaderImage: { $first: "$HeaderImage" }}}
	]).exec(function(err , results){
		if(!err) {
			var finalArr = [];
			for (var loop = 0; loop < results.length; loop++) {
				var record = results[loop];
				if(record.HeaderImage) {
					finalArr.push(record.HeaderImage);
				}
			}

			var response = {
				status: 200,
				message: "Header images to preload!",
				results: finalArr
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

function chkLabel(label,callback){
	if(label){
		label = label ? label.trim() : null;	//added by manishp on 09032016
	}

	if(label){
		var conditions = {
			IsDeleted: false,
			Label: {
				$regex : new RegExp("^"+label+"$", "i")
			}
		};

		Labels.find(conditions, function(err,result) {
			if (err) {
				throw err;
			}
			else{
				callback(result);
			}
		});
	}
};

var addLabel = function(req,res) {
	var page_id = req.body.page_id ? req.body.page_id : null;
	var label = typeof req.body.label == "string"  ? req.body.label.trim() : "";

	if(label && page_id){
		chkLabel(label,function(response){
			var dataRecord = {
				Label: label,
				AddedBy : 'User',
				CreaterId: req.session.user._id,
				Status: true,
				IsDeleted : false
			};

			if (response.length > 1 ){
				//res.json({"code":"400"});
				var conditions = {
					_id : mongoose.Types.ObjectId(page_id)
				}
				var dataToUpdate = {
					$push: {
						Labels : {
							LabelId : response[0]._id,
							Label : dataRecord.Label,
							AddedBy : dataRecord.AddedBy
						}
					}
				}

				Page.update(conditions, dataToUpdate, function( err, result ){
					if(!err) {
						res.json({
							"code":"200",
							"message":'label saved',
							"result": {
								LabelId : response[0]._id,
								Label : dataRecord.Label,
								AddedBy : dataRecord.AddedBy
							}
						});
					} else {
						res.json({"code":"204", response : "error"});
					}
				})
			} else {
				Labels(dataRecord).save( function(err, data){
					if(err){
					  res.json({"code":"204", message : "error"});
					} else {
						var conditions = {
							_id : mongoose.Types.ObjectId(page_id)
						}
						var dataToUpdate = {
							$push: {
								Labels : {
									LabelId : data._id,
									Label : dataRecord.Label,
									AddedBy : dataRecord.AddedBy
								}
							}
						}

						Page.update(conditions, dataToUpdate, function( err, result ){
							if(!err) {
								res.json({
									"code":"200",
									"message":'label saved',
									"result": {
										LabelId : data._id,
										Label : dataRecord.Label,
										AddedBy : dataRecord.AddedBy
									}
								});
							} else {
								res.json({"code":"204", message : "error"});
							}
						})
					}
				});
			}
		});
	}else{
		res.json({"code":"203", message : "wrong input."});
	}
};

var deleteLabel = function(req,res) {
	var page_id = req.body.page_id ? req.body.page_id : null;
	var label_id = req.body.label_id ? req.body.label_id : null;

	if(label_id && page_id){
		var conditions = {
			_id : mongoose.Types.ObjectId(page_id)
		};
		var dataToUpdate = {
			$pull: {
				Labels : {
					LabelId : mongoose.Types.ObjectId(label_id)
				}
			}
		};

		Page.update(conditions, dataToUpdate, function( err, data ){
			if(!err) {
				Page.findOne(conditions, {Labels: true}, function( err, result ){
					if(!err) {
						result = result ? result : {};
						result.Labels = result.Labels ? result.Labels : [];
						res.json({"code":"200","message":'Label has been deleted.', result : result.Labels});
					}
				})
			} else {
				res.json({"code":"204", "message" : "error"});
			}
		});
	}else{
		res.json({"code":"203", "message" : "Wrong input."});
	}
};
//populate is not working in this api - not in use as of now.

function sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject) {
	var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
	var to = shareWithEmail;

	newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
	subject = subject.replace(/{RecipientName}/g, RecipientName);

	var mailOptions = {
		from: process.EMAIL_ENGINE.info.senderLine,
		to: to, // list of receivers
		subject: subject,
		text: process.HOST_URL + '/login',
		html: newHtml
	};
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log('Message sent to: ' + to + info.response);
		}
	});
}

var syncPost = function (req,res) {
	var BlendMode = 'hard-light';
	var PostImage = req.body.PostImage ? req.body.PostImage : "";
	var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null,
		PostImage : PostImage,
		PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
		ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
		CreatedOn : Date.now(),
		NotificationWillEndOn : (Date.now()+(5*7*24*60*60*1000)),
		SyncedBy : req.session.user._id
	};
	dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

	if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
		SyncedPost(dataRecord).save( function(err, data){
			if(err){
				res.json({"code":"204", message : "error1"});
			} else {

				var condition = {};
				condition.name = "Sync__Post";

				EmailTemplate.find(condition, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
							var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;
							PostImage = PostImage.replace('/Media/img/300/', '/Media/img/600/');

							var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
							newHtml = newHtml.replace(/{PostImage}/g, PostImage);
							newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
							newHtml = newHtml.replace(/{PostURL}/g, PostURL);
							newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
							newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');
							results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
							var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

							User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
								if (!err) {
									UserData = UserData ? UserData : [];
									var emails = [];
									for(var i = 0; i < UserData.length; i++) {
										var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
										var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
										emails.push(shareWithEmail);
										if(shareWithEmail) {
											sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
										}
									}

									if(emails.length != dataRecord.ReceiverEmails.length) {
										var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
										for(var i = 0; i < difference.length; i++) {
											var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
											var shareWithEmail = difference[i] ? difference[i] : null;

											if(shareWithEmail) {
												sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
											}
										}
									}
								}
							})
						}
					}
				});
				res.json({"code":"200", message : "success"});
			}
		});
	} else {
		res.json({"code":"204", message : "error2"});
	}
};

var sendSurprisePost = function (req,res) {
	var SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];

	if(SurpriseSelectedTags.length < 2) {
		return res.json({"code":"205", message : "No selected keywords found for blending ..."});
	}
	//first to fetch different images based on the selected keywords
	Media.aggregate([
		{
		   $match : {
				"GroupTags.GroupTagID" : { $in : SurpriseSelectedTags },
				"MetaMetaTags" : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
		   }
		},
		{
		   $unwind : "$GroupTags"
		},
		{
		   $match : {
				"GroupTags.GroupTagID" : { $in : SurpriseSelectedTags },
				"MetaMetaTags" : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
		   }
		},
		{
			$limit : 300
		},
		{
			$group : {
					"_id" : "$GroupTags.GroupTagID",
					"Medias" : {
						$push : {
							"MediaURL" : "$thumbnail",
							"MediaURL2" : "$Location",
							"MediaId" : "$_id",
							"MediaType" : "$MediaType",
							"LinkType" : "$LinkType"
						}
					}
			}
		}
	], function (err, results) {
		var BlendImage1 = null;
		var BlendImage2 = null;
		var SurpriseImagesFrequencyWise = [];

		console.log("results.length ======== ", results.length);

		if (results.length == 1) {
			//#week 1
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 2
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 3
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 4
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

		} else if ( results.length == 2 ) {
			//#week 1
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 2
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 3
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 4
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);
		} else {
			return res.json({"code":"205", message : "No images found for blending ..."});
		}

		//return res.json({"code":"205", message : "We have found the required image data for surprise posts week wise --- In Progress ...", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});

		var PostImage = req.body.PostImage ? req.body.PostImage : "";
		var PostImage1 = SurpriseImagesFrequencyWise[0].BlendImage1 ? SurpriseImagesFrequencyWise[0].BlendImage1 : PostImage;
		var PostImage2 = SurpriseImagesFrequencyWise[0].BlendImage2 ? SurpriseImagesFrequencyWise[0].BlendImage2 : PostImage;
		var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

		var dataRecord = {
			PageId : req.body.PageId ? req.body.PageId : null,
			PostId : req.body.PostId ? req.body.PostId : null,
			PostImage : PostImage,
			PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
			ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
			CreatedOn : Date.now(),
			NotificationWillEndOn : (Date.now()+(5*7*24*60*60*1000)),
			SyncedBy : req.session.user._id,
			IsSurpriseCase : true
		};
		dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

		if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
			SyncedPost(dataRecord).save( function(err, data){
				if(err){
					res.json({"code":"204", message : "error1"});
				} else {

					var condition = {};
					condition.name = "Surprise__Post";

					EmailTemplate.find(condition, {}, function (err, results) {
						if (!err) {
							if (results.length) {
								var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
								var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;

								var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
								newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
								newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
								newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
								newHtml = newHtml.replace(/{PostURL}/g, PostURL);
								newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
								newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');
								results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
								var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

								User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
									if (!err) {
										UserData = UserData ? UserData : [];
										var emails = [];
										for(var i = 0; i < UserData.length; i++) {
											var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
											var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
											emails.push(shareWithEmail);
											if(shareWithEmail) {
												sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
											}
										}

										if(emails.length != dataRecord.ReceiverEmails.length) {
											var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
											for(var i = 0; i < difference.length; i++) {
												var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
												var shareWithEmail = difference[i] ? difference[i] : null;

												if(shareWithEmail) {
													sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
												}
											}
										}
									}
								})
							}
						}
					});
					res.json({"code":"200", message : "success", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});
				}
			});
		} else {
			res.json({"code":"204", message : "error2"});
		}
	});
};


function getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn) {
	var d = new Date(CreatedOn);
	//console.log("date - ", d);
	//d.setDate((d.getDate()-33) + NoOfDays);
	d.setDate((d.getDate()-5) + NoOfDays);
	return d;
}

function getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn) {
	var d = new Date(CreatedOn);
	console.log("date - ", d);
	//d.setDate((d.getDate()-33) + NoOfDays);
	d.setDate((d.getDate()-24) + NoOfDays);
	return d;
}

function getDateIncrementedBy(NoOfDays) {
	var d = new Date();
	d.setDate(d.getDate() + NoOfDays);
	return d;
}

var sendSurprisePost_withEmailSync = function (req,res) {
	var BlendMode = 'hard-light';

	var PostImage = req.body.PostImage ? req.body.PostImage : "";
	var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

	var SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];
	var EmailEngineDataSets = req.body.EmailEngineDataSets ? req.body.EmailEngineDataSets : [];

	if(SurpriseSelectedTags.length < 2) {
		return res.json({"code":"205", message : "No selected keywords found for blending ..."});
	}
	//first to fetch different images based on the selected keywords
	Media.aggregate([
		{
		   $match : {
			  "GroupTags.GroupTagID" : { $in : SurpriseSelectedTags },
			  "MetaMetaTags" : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
		   }
		},
		{
		   $unwind : "$GroupTags"
		},
		{
		   $match : {
				"GroupTags.GroupTagID" : { $in : SurpriseSelectedTags },
				"MetaMetaTags" : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
		   }
		},
		{
			$limit : 300
		},
		{
			$group : {
					"_id" : "$GroupTags.GroupTagID",
					"Medias" : {
						$push : {
							"MediaURL" : "$thumbnail",
							"MediaURL2" : "$Location",
							"MediaId" : "$_id",
							"MediaType" : "$MediaType",
							"LinkType" : "$LinkType"
						}
					}
			}
		}
	], function (err, results) {
		var BlendImage1 = null;
		var BlendImage2 = null;
		var SurpriseImagesFrequencyWise = [];

		console.log("results.length ======== ", results.length);

		if (results.length == 1) {
			//modify EmailEngineDataSets as per db schema requirement
			for(var i = 0; i < EmailEngineDataSets.length; i++) {
				var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
				EmailEngineDataSets[i].Delivered = false;
				EmailEngineDataSets[i].DateOfDelivery = getDateIncrementedBy(NoOfDays);
				EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
				EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
				EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
				EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
				if(!EmailEngineDataSets[i].VisualUrls.length) {
					BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
					BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

					EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
					EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
				}
			}


			//#week 1
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 2
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 3
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 4
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

		} else if ( results.length == 2 ) {
			//modify EmailEngineDataSets as per db schema requirement
			for(var i = 0; i < EmailEngineDataSets.length; i++) {
				var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
				EmailEngineDataSets[i].Delivered = false;
				EmailEngineDataSets[i].DateOfDelivery = getDateIncrementedBy(NoOfDays);
				EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
				EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
				EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
				EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
				if(!EmailEngineDataSets[i].VisualUrls.length) {
					BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
					BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

					EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
					EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
				}
			}


			//#week 1
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 2
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 3
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);

			//#week 4
			BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
			BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

			SurpriseImagesFrequencyWise.push(
				{
					BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
					BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
				}
			);
		} else {
			return res.json({"code":"205", message : "No images found for blending ..."});
		}

		//return res.json({"code":"205", message : "We have found the required image data for surprise posts week wise --- In Progress ...", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});

		var PostImage1 = SurpriseImagesFrequencyWise[0].BlendImage1 ? SurpriseImagesFrequencyWise[0].BlendImage1 : PostImage;
		var PostImage2 = SurpriseImagesFrequencyWise[0].BlendImage2 ? SurpriseImagesFrequencyWise[0].BlendImage2 : PostImage;

		var dataRecord = {
			PageId : req.body.PageId ? req.body.PageId : null,
			PostId : req.body.PostId ? req.body.PostId : null,
			PostImage : PostImage,
			PostStatement : PostStatement ? PostStatement : '',
			PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
			ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
			SurpriseSelectedTags : SurpriseSelectedTags ? SurpriseSelectedTags : [],
			EmailEngineDataSets : EmailEngineDataSets ? EmailEngineDataSets : [],
			CreatedOn : Date.now(),
			SyncedBy : req.session.user._id,
			IsSurpriseCase : true
		};
		dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

		if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
			dataRecord.EmailEngineDataSets = addHexcode_blendedImage(dataRecord.EmailEngineDataSets);

			SyncedPost(dataRecord).save( function(err, data){
				if(err){
					res.json({"code":"204", message : "error1"});
				} else {

					var condition = {};
					condition.name = "Surprise__Post";

					EmailTemplate.find(condition, {}, function (err, results) {
						if (!err) {
							if (results.length) {
								var SoundFileUrl = '';
								//SoundFileUrl = 'https://cdn.muse.ai/w/ee6cec7f3f9483d54fb409a9babbcc21faaa9aa5d74cc98c0abebbc3e0641ad5/videos/video.mp4';
								if(SoundFileUrl) {
									SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls><source src="'+SoundFileUrl+'" type="video/mp4">Your email does not support the audio.</audio></em></p>';

									//SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls="controls"><source src="'+SoundFileUrl+'"><p>? Listen: <a href="'+SoundFileUrl+'" target="_blank">Play</a> (mp3)</p></audio></em></p>';
								}

								var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
								var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;

								var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
								newHtml = newHtml.replace(/{TextAboveVisual}/g, '');
								newHtml = newHtml.replace(/{TextBelowVisual}/g, '');
								newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
								newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
								newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
								newHtml = newHtml.replace(/{PostURL}/g, PostURL);
								newHtml = newHtml.replace(/{SoundFileUrl}/g, SoundFileUrl);
								newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
								newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');
								results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
								var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

								User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
									if (!err) {
										UserData = UserData ? UserData : [];
										var emails = [];
										for(var i = 0; i < UserData.length; i++) {
											var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
											var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
											emails.push(shareWithEmail);
											if(shareWithEmail) {
												sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
											}
										}

										if(emails.length != dataRecord.ReceiverEmails.length) {
											var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
											for(var i = 0; i < difference.length; i++) {
												var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
												var shareWithEmail = difference[i] ? difference[i] : null;

												if(shareWithEmail) {
													sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
												}
											}
										}
									}
								})
							}
						}
					});
					res.json({"code":"200", message : "success", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});
				}
			});
		} else {
			res.json({"code":"204", message : "error2"});
		}
	});
};


var sendPost = function (req,res) {
	var BlendMode = 'hard-light';
	req.body.IsSurpriseCase = req.body.IsSurpriseCase ? req.body.IsSurpriseCase : false;
	if(req.body.IsSurpriseCase) {
		//sendSurprisePost(req, res);
		//sendSurprisePost_withEmailSync(req, res);
		req.body.instantEmail = true;
		streamPost(req, res);
	} else {
		var PostImage = req.body.PostImage ? req.body.PostImage : "";
		var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

		var dataRecord = {
			PageId : req.body.PageId ? req.body.PageId : null,
			PostId : req.body.PostId ? req.body.PostId : null,
			PostImage : PostImage,
			PostStatement : PostStatement,
			PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
			ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
			CreatedOn : Date.now(),
			NotificationWillEndOn : (Date.now()+(5*7*24*60*60*1000)),
			SyncedBy : req.session.user._id
		};
		dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

		if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
			SyncedPost(dataRecord).save( function(err, data){
				if(err){
					res.json({"code":"204", message : "error1"});
				} else {

					var condition = {};
					condition.name = "Send__Post";

					EmailTemplate.find(condition, {}, function (err, results) {
						if (!err) {
							if (results.length) {
								var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
								var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;
								PostImage = PostImage.replace('/Media/img/300/', '/Media/img/600/');

								var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
								newHtml = newHtml.replace(/{PostImage}/g, PostImage);
								newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
								newHtml = newHtml.replace(/{PostURL}/g, PostURL);
								newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
								newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');

								results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
								var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

								User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
									if (!err) {
										UserData = UserData ? UserData : [];
										var emails = [];
										for(var i = 0; i < UserData.length; i++) {
											var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
											var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
											emails.push(shareWithEmail);
											if(shareWithEmail) {
												sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
											}
										}

										if(emails.length != dataRecord.ReceiverEmails.length) {
											var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
											for(var i = 0; i < difference.length; i++) {
												var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
												var shareWithEmail = difference[i] ? difference[i] : null;

												if(shareWithEmail) {
													sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
												}
											}
										}
									}
								})
							}
						}
					});
					res.json({"code":"200", message : "success"});
				}
			});
		} else {
			res.json({"code":"204", message : "error2"});
		}
	}
};

var updatePostLabelId = function (req, res) {
	var PostId = req.body.post_id ? req.body.post_id : null;
	var LabelId = req.body.label_id ? req.body.label_id : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {};
	if(LabelId) {
		setObj = {
			$set : {
				"Medias.$.Label" : ObjectId(LabelId)
			}
		};
	} else {
		setObj = {
			$unset : {
				"Medias.$.Label" : ""
			}
		};
	}

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : PostId,
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Label updated successfully."
					}
					res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
};

var transferOwnership = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check
	var conditions = {};
	var fields = {
		Title: 1,
		CoverArt: 1,
		CapsuleId: 1,
		CoverArtFirstPage: 1,
		ChapterPlaylist: 1
	};

	conditions._id = req.headers.chapter_id;

	Chapter.findOne(conditions, fields, function (err, result) {
		if (!err) {
			var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
			var shareWithName = req.body.share_with_name ? req.body.share_with_name : '';

			if (shareWithEmail) {
				var conditions = {
					IsDeleted : false,
					Status : true
				};
				conditions.Email = shareWithEmail;

				var fields = {
					Email: true,
					JournalId: true
				};

				User.find(conditions, fields, function (err, UserData) {
					if (!err) {
						var data = {};
						data.Origin = "journal";
						data.OriginatedFrom = req.headers.chapter_id;
						data.CreaterId = req.session.user._id;

						if (!UserData.length) {
							//Non-Registered user case
							data.OwnerId = req.session.user._id;
							//data.CapsuleId = JournalId;
						}
						else {
							data.OwnerId = UserData[0]._id;
							data.CapsuleId = UserData[0].JournalId;
						}
						data.OwnerEmail = shareWithEmail;

						data.Title = result.Title;
						data.CoverArt = result.CoverArt;
						data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
						data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];
						//data.CapsuleId = result.CapsuleId;

						var nowDate = Date.now();
						data.CreatedOn = nowDate;
						data.ModifiedOn = nowDate;
						data.IsLaunched = true;
						//console.log("data = ",data);
						var ChapterNameForEmail = data.Title;

						Chapter(data).save(function (err, result) {
							if (!err) {
								//pages under chapters duplication will be implemented later
								var conditions = {
									ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
									OwnerId: req.session.user._id,
									IsDeleted: 0,
									PageType: { $in: ["gallery"] }
								};
								var sortObj = {
									Order: 1,
									UpdatedOn: -1
								};
								var fields = {
									_id: true
								};

								var newChapterId = result._id;
								Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {
									if (!err) {
										var fields = {
											_id: true,
											Title: true,
											PageType: true,
											Order: true,
											HeaderImage: true,
											BackgroundMusic: true,
											CommonParams: true,
											ViewportDesktopSections: true,
											ViewportTabletSections: true,
											ViewportMobileSections: true,
											SelectedMedia: true,
											SelectedCriteria: true,
											HeaderBlurValue: true,
											HeaderColorCode : true,
											HeaderTransparencyValue: true,
											Medias: true,
											Labels: true,
											IsLabelAllowed: true,
											HeaderVideoLink : true,
											EmailEngineDataSets : true,
											VoiceOverLyricsSettings : true,
											VoiceOverFile : true,
											Themes : true
										};

										for (var loop = 0; loop < results.length; loop++) {
											var conditions = {};
											conditions._id = results[loop]._id;
											Page.findOne(conditions, fields, function (err, result) {
												//delete result._id;
												var data = {};
												data.Origin = "journal";
												data.OriginatedFrom = result._id;
												data.CreaterId = req.session.user._id;

												if (!UserData.length) {
													//Non-Registered user case
													data.OwnerId = req.session.user._id;
												}
												else {
													data.OwnerId = UserData[0]._id;
												}
												data.OwnerEmail = shareWithEmail;

												data.ChapterId = newChapterId ? newChapterId : "";
												data.Title = result.Title;
												data.PageType = result.PageType;
												data.Order = result.Order;
												data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
												data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
												data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
												data.SelectedCriteria = result.SelectedCriteria;
												data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
												data.HeaderColorCode = result.HeaderColorCode ? result.HeaderColorCode : null;
												data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
												data.Labels = result.Labels ? result.Labels : [];
												data.IsLabelAllowed = result.IsLabelAllowed ? result.IsLabelAllowed : false;
												data.HeaderVideoLink = result.HeaderVideoLink ? result.HeaderVideoLink : '';
												data.EmailEngineDataSets = result.EmailEngineDataSets ? result.EmailEngineDataSets : [];
												data.VoiceOverLyricsSettings = result.VoiceOverLyricsSettings ? result.VoiceOverLyricsSettings : [];
												data.VoiceOverFile = result.VoiceOverFile ? result.VoiceOverFile : "";
												data.Themes = result.Themes ? result.Themes : [];
												data.CreatedOn = nowDate;
												data.UpdatedOn = nowDate;

												//make a copy of Posts and transfer ownership.
												data.Medias = result.Medias ? result.Medias : [];
												for(var i = 0; i < data.Medias.length; i++) {
													data.Medias[i].OriginatedFrom = data.Medias[i]._id;
													data.Medias[i].Origin = "Copy";
													data.Medias[i]._id = new ObjectId();
													data.Medias[i].OwnerId = data.OwnerId;
													data.Medias[i].PostedBy = ObjectId(data.OwnerId);
												}
												//make a copy of post and transfer ownership

												//Add login user as invitee
												data.LaunchSettings = {
													"OthersData" : [],
													"Invitees" : [
														{
															"UserPic" : req.session.user.ProfilePic ? req.session.user.ProfilePic : "/assets/users/default.png",
															"_id" : new ObjectId(),
															"RelationId" : "57fc1357c51f7e980747f2ce",
															"Relation" : "Friend",
															"UserNickName" : req.session.user.NickName ? req.session.user.NickName : null,
															"UserName" : req.session.user.Name ? req.session.user.Name : null,
															"UserEmail" : req.session.user.Email ? req.session.user.Email : null,
															"UserID" : req.session.user._id ? req.session.user._id : null,
														}
													],
													"ShareMode" : "friend-group",
													"NamingConvention" : "realnames",
													"MakingFor" : "ME"
												};

												Page(data).save(function (err, result) {
													if (!err) {
														if(data.OwnerId) {
															Friend.find({ UserID: data.OwnerId, 'Friend.Email': { $regex: new RegExp(req.session.user.email + '$', "i") }, Status: 1, IsDeleted: 0 }, function (err1, data2) {
																if (!err) {
																	if (data2.length > 0) {
																		//do nothing
																		console.log('already friend');
																	} else {
																		//call function to add member
																		console.log('saving as friend');
																		var newFriendData2 = {};
																		newFriendData2.ID = req.session.user._id;
																		newFriendData2.Email = req.session.user.Email;
																		newFriendData2.Name = req.session.user.Name;
																		newFriendData2.NickName = req.session.user.NickName;
																		newFriendData2.Pic = req.session.user.ProfilePic;
																		newFriendData2.Relation = rel[0].trim();
																		newFriendData2.RelationID = rel[1].trim();
																		newFriendData2.IsRegistered = true;

																		var friendship2 = new Friend();
																		friendship2.UserID = data.OwnerId;
																		friendship2.Friend = newFriendData2;
																		friendship2.Status = 1;
																		friendship2.IsDeleted = 0;
																		friendship2.CreatedOn = Date.now();
																		friendship2.ModifiedOn = Date.now();
																		friendship2.save(function (err4, data) {
																			if (err4) {
																				console.log(err4)
																			}
																		});
																	}
																}
															});
														}
														//console.log("----new page instance created..", result);
														/*
														//add the me in friend list of user now
														var conditions = {
															'UserID': req.session.user._id,
															'Friend.Email':{ $regex : new RegExp(req.body.email, "i") },
															Status:1,
															IsDeleted:0
														};
														var fields = {};

														friend.find(conditions, fields, function(err,data){
															if (err) {
																res.json({'code':404,'error':err});
															}else{
																console.log(data);
																if (data.length == 0) {
																	console.log('saving data');
																	var rel = req.body.relation;
																	rel = rel.split('~');
																	var newFriendData = {};
																	newFriendData.IsRegistered = IsRegistered;
																	if ( IsRegistered ) {
																		newFriendData.ID = frndData._id;
																		newFriendData.Pic =  frndData.ProfilePic;
																		newFriendData.NickName =  frndData.NickName;
																	}

																	newFriendData.Email = req.body.email;
																	newFriendData.Name = IsRegistered ? frndData.Name : req.body.name;
																	newFriendData.Relation =  rel[0].trim();
																	newFriendData.RelationID =  rel[1].trim();

																	var friendship = new friend();
																	friendship.UserID = req.session.user._id;
																	friendship.Friend = newFriendData;
																	friendship.Status = 1;
																	friendship.IsDeleted = 0;
																	friendship.CreatedOn = Date.now();
																	friendship.ModifiedOn = Date.now();
																	friendship.save(function(err,data){
																		if (err) {
																			res.json(err);
																		}else{
																			res.json({'code':200,msg:'data saved'});
																		}
																	});
																}else{
																	console.log('already friend');
																	res.json({'code':400,msg:'Already a friend'});
																}
															}
														});*/
													}
													else {
														console.log(err);
													}
												});
											});
										}

										var response = {
											status: 200,
											message: "Chapter shared successfully.",
											result: result
										}
										res.json(response);

										var condition = {};
										condition.name = "Transfer__Chapter";

										EmailTemplate.find(condition, {}, function (err, results) {
											if (!err) {
												if (results.length) {

													var RecipientName = shareWithName ? shareWithName : '';
													User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
														if (name.length > 0) {
															var name = name[0].Name ? name[0].Name.split(' ') : "";
															RecipientName = name[0];
														}
														var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

														var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
														newHtml = newHtml.replace(/{ChapterName}/g, ChapterNameForEmail)
														newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);

														var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
														var to = shareWithEmail;
														results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
														var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

														var mailOptions = {
															//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
															from: process.EMAIL_ENGINE.info.senderLine,
															to: to, // list of receivers
															subject: subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has shared a Chapter with you!',
															//text: 'http://203.100.79.94:8888/#/login',
															html: newHtml
															//html: "Hi , <br/><br/> Scrpt - " + req.session.user.Name + " has sent you a Capsule : '" + data.Title + "'.<br/><br/>Sincerely,<br>The Scrpt team. "
														};

														transporter.sendMail(mailOptions, function (error, info) {
															if (error) {
																console.log(error);
															} else {
																console.log('Message sent to: ' + to + info.response);
															}
														});
													})
												}
											}
										})

									}
									else {
										console.log(err);
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response);
									}
								});
							}
							else {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
							}
						});
					}
					else {

					}
				});
			}
			else {

			}
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}


var shiftPostPosition = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;
	var PageId = req.body.PageId ? req.body.PageId : null;
	var Action = req.body.Action ? req.body.Action : null;
	//return;

	Page.aggregate([
		{
			$match : {
				_id : ObjectId(PageId)
			}
		},
		{ $unwind: '$Medias' },
		{ $sort: {'Medias.PostedOn': -1} },
		{ $group: {_id: '$_id', 'Medias': {$push:{_id : '$Medias._id', PostedOn : '$Medias.PostedOn'}}} },
		{
			$project: {
				Medias: "$Medias",
				index: { $indexOfArray: [ "$Medias._id", ObjectId(PostId) ] },
				size: { $size : "$Medias" }
			}
		}
	], function(err, results) {
		if(!err) {
			if(results.length) {
				var size = results[0].size ? results[0].size : null;
				var index = results[0].index > -1 ? results[0].index : null;

				if(index == null || size == null) {
					//return json response
					var response = {
						status: 200,
						message: "No need to shift."
					}
					return res.json(response);
				}

				var Post1_id = null;
				var Post2_id = null;
				var Post1_PostedOn = null;
				var Post2_PostedOn = null;

				if(Action == 'ShiftRight') {
					if(index == size-1) {
						//return success without doing anything
						var response = {
							status: 200,
							message: "No need to shift.",
							index : index,
							size : size
						}
						return res.json(response);
					} else {
						Post1_PostedOn = results[0].Medias[index].PostedOn;
						Post2_PostedOn = results[0].Medias[index+1].PostedOn;

						Post1_id = results[0].Medias[index]._id;
						Post2_id = results[0].Medias[index+1]._id;
					}
				} else if(Action == 'ShiftLeft') {
					if(index == 0) {
						//return success without doing anything
						var response = {
							status: 200,
							message: "No need to shift.",
							index : index,
							size : size
						}
						return res.json(response);
					} else {
						Post1_PostedOn = results[0].Medias[index].PostedOn;
						Post2_PostedOn = results[0].Medias[index-1].PostedOn;

						Post1_id = results[0].Medias[index]._id;
						Post2_id = results[0].Medias[index-1]._id;
					}
				} else if(Action == 'AtPosition'){
					req.body.postObj2 = req.body.postObj2 ? req.body.postObj2 : {};
					var post2_obj = req.body.postObj2.Medias ? req.body.postObj2.Medias : null;
					if(!post2_obj) {
						var response = {
							status: 501,
							message: "Something went wrong.",
							index : index,
							size : size
						}
						return res.json(response);
					}

					for(var i = 0; i < results[0].Medias.length; i++) {
						if(post2_obj._id == String(results[0].Medias[i]._id)) {
							Post2_PostedOn = results[0].Medias[i].PostedOn;
							Post2_id = results[0].Medias[i]._id;

							var d = new Date(Post2_PostedOn);
							var timestamp = d.getTime();
							timestamp = timestamp-1;
							Post1_PostedOn = new Date(timestamp);
							break;
						}
					}
					Post1_id = results[0].Medias[index]._id;

					if(!Post1_id || !Post2_id || !Post1_PostedOn || !Post2_PostedOn) {
						var response = {
							status: 501,
							message: "Something went wrong.",
							index : index,
							size : size
						}
						return res.json(response);
					}

				} else {
					//return it anyway
					var response = {
						status: 200,
						message: "No need to shift.",
						index : index,
						size : size
					}
					return res.json(response);
				}


				var conditions = {
					"Medias._id" : Post1_id,
					IsDasheditpage : false
				};
				var setObj = {
					"Medias.$.PostedOn" : Post2_PostedOn
				};

				var options = { multi: false };

				Page.update(conditions, {$set : setObj}, options, function(err, result) {
					if(!err) {
						//this will update the IsDasheditpage case
						var conditions2 = {
							"Medias._id" : Post1_id,
							IsDasheditpage : true
						};
						Page.update(conditions2, {$set : setObj}, options, function(err , result2){
							if(!err){
								conditions = {
									"Medias._id" : Post2_id,
									IsDasheditpage : false
								};
								setObj = {
									"Medias.$.PostedOn" : Post1_PostedOn
								};

								Page.update(conditions, {$set : setObj}, options, function(err, result) {
									if(!err) {
										//this will update the IsDasheditpage case
										var conditions2 = {
											"Medias._id" : Post2_id,
											IsDasheditpage : true
										};
										Page.update(conditions2, {$set : setObj}, options, function(err , result2){
											if(!err){
												var response = {
													status: 200,
													message: "Post shifted successfully."
												}
												return res.json(response);
											}
											else{
												console.log("err 2 ---------------------- ", err);
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												return res.json(response);
											}
										})
									} else {
										console.log("err 1 ---------------------- ", err);
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										return res.json(response);
									}
								});
							}
							else{
								console.log("err 2 ---------------------- ", err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								//res.json(response);
							}
						})
					} else {
						console.log("err 1 ---------------------- ", err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				});
			} else {
				var response = {
					status: 200,
					message: "No need to shift as no result found."
				}
				return res.json(response);
			}
		} else {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};


var createEmail = function (req, res) {
	var inputObj = req.body.inputObj ? req.body.inputObj : {};
	inputObj.page_id = inputObj.page_id ? inputObj.page_id : null;

	if(inputObj.page_id && inputObj.AfterDays) {
		var conditions = {
			"_id" : ObjectId(inputObj.page_id),
			IsDasheditpage : false
		};

		var setObj = {
			$push: {
				EmailEngineDataSets: {
					'AfterDays' : inputObj.AfterDays,
					'Subject' : inputObj.Subject ? inputObj.Subject : '',
					'TextAboveVisual' : inputObj.TextAboveVisual ? inputObj.TextAboveVisual : '',
					'TextBelowVisual' : inputObj.TextBelowVisual ? inputObj.TextBelowVisual : '',
					'SoundFileUrl' : inputObj.SoundFileUrl ? inputObj.SoundFileUrl : '',
					'LabelId' : inputObj.LabelId ? inputObj.LabelId : null,
					'Label' : inputObj.Label ? inputObj.Label : null
				}
			}
		};

		var options = { multi: false };
		Page.update(conditions, setObj, options, function(err, result) {
			if(!err) {
				//this will update the IsDasheditpage case
				var conditions2 = {
					OriginatedFrom : ObjectId(inputObj.page_id),
					Origin : "publishNewChanges",
					IsDasheditpage : true
				};

				Page.update(conditions2, {$set : setObj}, options, function(err , result2){
					if(!err){
						var response = {
							status: 200,
							message: "Email created successfully."
						}
						res.json(response);
					}
					else{
						//console.log("err 2 ---------------------- ", err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				})
			} else {
				//console.log("err 1 ---------------------- ", err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});

	} else {
		//console.log("err 1 ---------------------- ", err);
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		res.json(response);
	}
};

var editEmail = function (req, res) {
	var inputObj = req.body.inputObj ? req.body.inputObj : {};
	inputObj.page_id = inputObj.page_id ? inputObj.page_id : null;

	//console.log("inputObj - ", inputObj);
	if(inputObj.page_id) {
		var conditions = {
			"_id" : ObjectId(inputObj.page_id),
			IsDasheditpage : false
		};

		var setObj = {
			$set : {
				EmailEngineDataSets : inputObj.EmailEngineDataSets ? inputObj.EmailEngineDataSets : []
			}
		};

		console.log("setObj - ", setObj);
		var options = { multi: false };
		Page.update(conditions, setObj, options, function(err, result) {
			if(!err) {
				//this will update the IsDasheditpage case
				var conditions2 = {
					OriginatedFrom : ObjectId(inputObj.page_id),
					Origin : "publishNewChanges",
					IsDasheditpage : true
				};

				Page.update(conditions2, {$set : setObj}, options, function(err , result2){
					if(!err){
						var response = {
							status: 200,
							message: "Email updated successfully."
						}
						res.json(response);
					}
					else{
						console.log("err 2 ---------------------- ", err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				})
			} else {
				console.log("err 1 ---------------------- ", err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});

	} else {
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		res.json(response);
	}
};

//searchMedia using $switch stage - apiV1.0
var searchMedia = async function (req, res) {
	console.log("---------- Searching Media now ----------");
	req.body.subsetByRank = req.body.subsetByRank ? req.body.subsetByRank : {};
	//console.log("------------ Journal.searchMedia --------------------", req.body.subsetByRank);
	var selectedKeywords = req.body.generatedKeywords ? req.body.generatedKeywords : [];
	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		MetaMetaTags : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase
		},
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true }
		],
		InAppropFlagCount : { $lt:5 }
	};

	var fields = {};

	var sortObj = {"value.RandomSortId" : -1};

	var page = req.body.page ? parseInt(req.body.page) : 1;
	//var per_page = 48;
	var per_page = req.body.per_page ? parseInt(req.body.per_page) : 48;
	var limit = page*per_page;	//48

	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["GroupTags.GroupTagID"] = {
			$in : selectedKeywords
		};

		conditions["$or"] = [
			{ MediaType : "Image" },
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true }
		]

		aggregateStages.push ({ $match : conditions });

		aggregateStages.push ({ $unwind : "$GroupTags" });

		//this is the grouptags set by rank
		var totalSets = req.body.subsetByRank ? req.body.subsetByRank : [];
		var maxRank = totalSets.length;
		var switchBranches = [];
		var counter = 0;
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags.GroupTagID", totalSets[i] ]},
				  then: (maxRank - i)
				}
			);
			counter++;
		}

		var switchExpression = {};
		if(switchBranches.length) {
			switchExpression = {
				branches : switchBranches,
				default : 0
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
						thumbnail : {$first : "$thumbnail"},
						IsPrivate : {$first : "$IsPrivate"},
						RandomSortId : {$first : "$RandomSortId"},
						IsUnsplashImage : {$first : "$IsUnsplashImage"},
						ViewsCount : {$first : "$ViewsCount"},
						"Ranks" : {
							"$push": {
								$switch: switchExpression
							}
						}
					}
				}
			);
		}

		//aggregateStages.push ({ $match : conditions });

		sortObj = {
			"value.Ranks" : 1,//,
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
				thumbnail : "$thumbnail",
				IsPrivate : "$IsPrivate",
				RandomSortId : "$RandomSortId",
				IsUnsplashImage : "$IsUnsplashImage",
				ViewsCount : "$ViewsCount",
				"Ranks" : { "$max": "$Ranks" }
			}
		}
	});

	aggregateStages.push ({ $sort : sortObj	});

	aggregateStages.push ({ $skip : ((page-1)*per_page)	});

	aggregateStages.push ({	$limit : per_page });


	var mediaCount = await Media.find(conditions, fields).count();
	mediaCount = mediaCount ? mediaCount : 0;

	Media.aggregate(aggregateStages).allowDiskUse(true).exec(function (err, results) {
		if (err) {
			return res.json({"status":"error","message":err});
		}
		else {
			var outputRecords = [];
			for( var loop = 0; loop < results.length; loop++ ){
				var tempObj = results[loop];
				if( tempObj.value.Location[0].URL ){
					tempObj.value.URL = tempObj.value.Location[0].URL;
				}
				outputRecords.push(tempObj);
			}
			req.body.subsetByRankObj2 = req.body.subsetByRankObj2 ? req.body.subsetByRankObj2 : {};
			if(selectedKeywords.length) {
				return res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount, limit: limit, selectedKeywords : selectedKeywords, aggregateStages : aggregateStages, SearchedKeywordByRank : req.body.subsetByRankObj2});
			} else {
				return res.json({"status":"success","results":outputRecords.shuffle(),"mediaCount":mediaCount, limit: limit, selectedKeywords : selectedKeywords, aggregateStages : aggregateStages, SearchedKeywordByRank : req.body.subsetByRankObj2});
			}
		}
	});
}

//searchMedia using $concat with $cond stage - apiV2
var searchMediaV2 = async function (req, res) {
	console.log("---------- Searching Media now ----------");
	var sec = 0;
	/*
	var timer = setInterval(function(){
		sec++;
		console.log("execution time = ", sec+" seconds.");
	},1000);
	*/
	req.body.subsetByRank = req.body.subsetByRank ? req.body.subsetByRank : {};
	var selectedKeywords = req.body.generatedKeywords ? req.body.generatedKeywords : [];
	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		MetaMetaTags : {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase
		},
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true }
		],
		InAppropFlagCount : { $lt:5 }
	};

	var fields = {};

	var sortObj = {"value.RandomSortId" : -1};

	var page = req.body.page ? parseInt(req.body.page) : 1;
	//var per_page = 48;
	var per_page = req.body.per_page ? parseInt(req.body.per_page) : 48;
	var limit = page*per_page;	//48

	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["MetaMetaTags"] = {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		};

		conditions["GroupTags.GroupTagID"] = { $in : selectedKeywords };
		conditions["$or"] = [
			{MediaType : "Image"},
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}, IsUnsplashImage : true}
		];

		/*
		conditions["GroupTags.GroupTagID"] = {
			$in : selectedKeywords
		};

		conditions["$or"] = [
			{ MediaType : "Image" },
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true }
		]
		*/
		aggregateStages.push ({ $match : conditions });

		aggregateStages.push ({ $unwind : "$GroupTags" });

		//this is the grouptags set by rank
		var totalSets = req.body.subsetByRank ? req.body.subsetByRank : [];
		var maxRank = totalSets.length;
		var switchBranches = [];
		var concatBranches = [];
		var counter = 0;
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags.GroupTagID", totalSets[i] ]},
				  then: (maxRank - i)
				}
			);

			concatBranches.push({
				$cond: {
				  if: {
					$and: [{
					  $in : [ "$GroupTags.GroupTagID", totalSets[i] ]
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
			"value.Ranks" : 1,//,
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
				thumbnail : "$thumbnail",
				IsPrivate : "$IsPrivate",
				RandomSortId : "$RandomSortId",
				IsUnsplashImage : "$IsUnsplashImage",
				ViewsCount : "$ViewsCount",
				"Ranks" : { "$max": "$Ranks" }
			}
		}
	});

	aggregateStages.push ({ $sort : sortObj	});

	aggregateStages.push ({ $skip : ((page-1)*per_page)	});

	aggregateStages.push ({	$limit : per_page });


	var mediaCount = await Media.find(conditions, fields).count();
	mediaCount = mediaCount ? mediaCount : 0;

	Media.aggregate(aggregateStages).allowDiskUse(true).exec(function (err, results) {
		if (err) {
			return res.json({"status":"error","message":err});
		}
		else {
			var outputRecords = [];
			for( var loop = 0; loop < results.length; loop++ ){
				var tempObj = results[loop];
				if( tempObj.value.Location[0].URL ){
					tempObj.value.URL = tempObj.value.Location[0].URL;
				}
				outputRecords.push(tempObj);
			}
			req.body.subsetByRankObj2 = req.body.subsetByRankObj2 ? req.body.subsetByRankObj2 : {};
			/*
			if(timer) {
				clearInterval(timer);
			}
			*/
			if(selectedKeywords.length) {
				return res.json({"status":"success","results":outputRecords,"mediaCount":mediaCount, limit: limit, selectedKeywords : selectedKeywords, aggregateStages : aggregateStages, SearchedKeywordByRank : req.body.subsetByRankObj2});
			} else {
				return res.json({"status":"success","results":outputRecords.shuffle(),"mediaCount":mediaCount, limit: limit, selectedKeywords : selectedKeywords, aggregateStages : aggregateStages, SearchedKeywordByRank : req.body.subsetByRankObj2});
			}
		}
	});
}

var suggestKeywords__getAllWordsFromPythonApi = function(req, res, next) {
	if(req.session.user){
		if( !req.session.user._id ){
			return res.json({"status":"error","message":"Access Denied"});
		}
	}
	else {
		return res.json({"status":"error","message":"Access Denied"});
	}

	var inputText = req.body.inputText ? req.body.inputText : null;
	var matchedArr = [];
	var suggestedArr = [];
	var difference = [];
	var difference_neg = [];

	var response = {
		"inputText":inputText,
		"matchedArr":matchedArr,
		"suggestedArr":suggestedArr,
		"newGT":difference,
		"removeGT":difference_neg
	};

	req.body.selectedWords = inputText ? [inputText] : [];
	req.body.selectedKeywords = req.body.selectedKeywords ? req.body.selectedKeywords : [];
	req.body.generatedKeywords = [];

	if(!req.body.selectedWords.length) {
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
				_id : {
					$nin : process.SEARCH_ENGINE_CONFIG.GT__RemoveFrom__DefaultCase
				},
				status : { $in : [1, 3] },
				MetaMetaTagID : {
					$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
				}
			};

			if(selectedWords.length) {
				conditions["$or"] = selectedWords;
			}

			var fields = {
				GroupTagTitle : 1
			};

			var subsetByRankObj = {};
			var subsetByRankObj2 = {};
			//console.log("-----------------------conditions---------------------", conditions);
			groupTags.find(conditions, fields, function(err, results){
				if (err) {
					console.log("err ------------------------ ", err);
					next();
				}
				else{
					for(var i = 0; i < results.length; i++) {
						if(req.body.generatedKeywords.indexOf(String(results[i]._id)) < 0) {
							if(req.body.selectedKeywords.indexOf(String(results[i]._id)) < 0) {
								req.body.generatedKeywords.push(String(results[i]._id));

								//check and get rank
								var key = typeof results[i].GroupTagTitle == 'string' ? results[i].GroupTagTitle.toLowerCase().trim() : null;
								if(response.data[key]) {
									if(typeof subsetByRankObj[response.data[key]] == 'object') {
										subsetByRankObj[response.data[key]].push(String(results[i].GroupTagTitle)+'__'+String(results[i]._id));

										subsetByRankObj2[response.data[key]].push(String(results[i].GroupTagTitle));
									} else {
										subsetByRankObj[response.data[key]] = [];
										subsetByRankObj[response.data[key]].push(String(results[i].GroupTagTitle)+'__'+String(results[i]._id));

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
					//subsetByRankObj['999'] = req.body.selectedKeywords;
					subsetByRankObj = sortKeys(subsetByRankObj);

					req.body.subsetByRank = Object.values(subsetByRankObj);
					req.body.subsetByRankObj = subsetByRankObj;

					subsetByRankObj2['999'] = req.body.selectedWords.length ? req.body.selectedWords[0] : '';
					subsetByRankObj2 = sortKeys(subsetByRankObj2);
					req.body.subsetByRankObj2 = subsetByRankObj2;

					let keyArr = Object.keys(subsetByRankObj);
					for (let j = (keyArr.length -1); j >= 0; j--) {
						let value = subsetByRankObj[keyArr[j]];
						for(let i = 0; i < value.length; i++) {
							var keyValArr = value[i].split('__');
							difference.push({
								id : keyValArr[1],
								title : keyValArr[0],
								rank : key
							})
						}
					}

					response = {
						"inputText":inputText,
						"matchedArr":matchedArr,
						"suggestedArr":suggestedArr,
						"newGT":difference,
						"removeGT":difference_neg
					};
					return res.json({"code":"200","msg":"Success","response":response});
				}
			});

			//next();
		})
		.catch(error => {
			return res.json({"code":"501","msg":"Success","response":response});
		});
	}
}

var getMediaFromSet_old13Aug = async function (req, callback) {
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	var reqObj = req.body ? req.body : {};
	console.log("---------- Searching Media now - getMediaFromSet getMediaFromSet getMediaFromSet getMediaFromSet getMediaFromSet----------");
	var sec = 0;

	var timer = setInterval(function(){
		sec++;
		console.log("getMediaFromSet1 execution time = ", sec+" seconds.");
	},1000);

	var subsetByRank = reqObj.subsetByRank ? reqObj.subsetByRank : {};
	var subsetByRankObj2 = reqObj.subsetByRankObj2 ? reqObj.subsetByRankObj2 : {};
	var selectedKeywords = reqObj.generatedKeywords ? reqObj.generatedKeywords : [];
	var SecondaryKeywords = reqObj.SecondaryKeywords || [];
	var SecondaryKeywordsMap = reqObj.SecondaryKeywordsMap || {};
	console.log("subsetByRankObj2 --------- ", subsetByRankObj2);
	console.log("SecondaryKeywords - ", SecondaryKeywords);
	console.log("SecondaryKeywordsMap - ", SecondaryKeywordsMap);

	reqObj.MediaSelectionCriteria1 = !reqObj.MediaSelectionCriteria1 ? {} : reqObj.MediaSelectionCriteria1;
	reqObj.MediaSelectionCriteria = Object.values(reqObj.MediaSelectionCriteria1).length ? reqObj.MediaSelectionCriteria1 : null;
	
	/*{
		PrimaryBrandArchetype: 'Pure and Innocent',
		SecondaryBrandArchetype: 'Lover and Sensualist',
		TertiaryBrandArchetype: 'Creative Spirit',
		MBTI: 'INFJ'
	};*/
	let mediaSelectionCriteria = typeof reqObj.MediaSelectionCriteria==='object' ? reqObj.MediaSelectionCriteria : null;
	const mediaSelectionCriteriaKeyArr = Object.keys(mediaSelectionCriteria || {});
	var outputRecords = [];

	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		//MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase },
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
			{ MediaType : "Image"}
		],
		InAppropFlagCount : { $lt:5 }
	};

	var fields = {};

	var sortObj = {"value.RandomSortId" : -1};

	var page = 1;
	//var per_page = 48;
	var per_page = 2500;
	var limit = page*per_page;	//48

	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["MetaMetaTags"] = {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		};


		conditions["GroupTags.GroupTagID"] = { $in : selectedKeywords };

		conditions["$or"] = [
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}, IsUnsplashImage : true},
			{MediaType : "Image"}
		];

		if(!req.session.user.onlyunsplash) {
			conditions["$or"] = [
				{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
				{MediaType : "Image"}
			]
		}

		if(req.session.user.onlyenablers) {
			conditions["MetaMetaTags"] = { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase };
		}


		/*if(SecondaryKeywords.length) {
			//selectedKeywords = selectedKeywords.concat(SecondaryKeywords);
			conditions["$and"].push({
				$or : [
					{ "GroupTags.GroupTagID" : { $in : selectedKeywords } },
					//{ "GroupTags.GroupTagID" : { $in : SecondaryKeywords } }
				]
			});
		} else {
			conditions["$and"].push({
				$or : [
					{ "GroupTags.GroupTagID" : { $in : selectedKeywords } }
				]
			});
		}*/
		console.log("conditions = ", conditions);
		aggregateStages.push ({ $match : conditions });
		//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

		//aggregateStages.push ({	$limit : per_page });
		aggregateStages.push ({ $unwind : "$GroupTags" });


		//code to make individual keyword in a set
		var oneGT_subsetByRank = [];
		for(let i = 0; i < subsetByRank.length; i++) {
			for(let j = 0; j < subsetByRank[i].length; j++) {
				oneGT_subsetByRank.push([subsetByRank[i][j]]);
			}
		}

		var oneGT_subsetByRankObj2 = [];
		for(i in subsetByRankObj2) {
			for(let j = 0; j < subsetByRankObj2[i].length; j++) {
				oneGT_subsetByRankObj2.push([subsetByRankObj2[i][j]]);
			}
		}
		reqObj.subsetByRank = oneGT_subsetByRank;
		reqObj.subsetByRankObj2 = oneGT_subsetByRankObj2;
		//code to make individual keyword in a set

		//this is the grouptags set by rank
		//var totalSets = subsetByRank ? subsetByRank : [];
		var totalSets = oneGT_subsetByRank ? oneGT_subsetByRank : [];

		var maxRank = totalSets.length;
		var switchBranches = [];
		var concatBranches = [];
		var counter = 0;
		var local_map_selectedgt = {};
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags.GroupTagID", totalSets[i] ]},
				  then: (i+1)
				}
			);

			local_map_selectedgt["rank_"+(i+1)] = totalSets[i];

			concatBranches.push({
				$cond: {
				  if: {
					$and: [{
					  $in : [ "$GroupTags.GroupTagID", totalSets[i] ]
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

			//dontIncludeKeywords case
			var dontIncludeKeywords = req.body.dontIncludeKeywords || [];
			for(var di = 0; di < switchBranches.length; di++) {
				if(dontIncludeKeywords.length) {
					switchBranches[di]["case"]["$nin"] = [ "$GroupTags.GroupTagID", dontIncludeKeywords ];
				}
			}
			//dontIncludeKeywords case

			switchExpression = {
				$switch : {
					branches : switchBranches,
					default : 0
				}
			};

			concatExpression = {
				"$concat" : concatBranches
			};


			var groupObj =	{
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
					thumbnail : {$first : "$thumbnail"},
					IsPrivate : {$first : "$IsPrivate"},
					RandomSortId : {$first : "$RandomSortId"},
					IsUnsplashImage : {$first : "$IsUnsplashImage"},
					ViewsCount : {$first : "$ViewsCount"},
					"Ranks" : { "$push": switchExpression },
					//"Ranks" : { "$push": concatExpression },
					Lightness : {$first : "$Lightness"},
					DominantColors : {$first : "$DominantColors"},
					MetaData : {$first : "$MetaData"},
					//SecondaryKeywords: {$first: []}
				}
			};
			if(SecondaryKeywords.length) {
				//console.log("selectedKeywords --------------------------------- ", selectedKeywords);
				groupObj =	{
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
						thumbnail : {$first : "$thumbnail"},
						IsPrivate : {$first : "$IsPrivate"},
						RandomSortId : {$first : "$RandomSortId"},
						IsUnsplashImage : {$first : "$IsUnsplashImage"},
						ViewsCount : {$first : "$ViewsCount"},
						"Ranks" : { "$push": switchExpression },
						//"Ranks" : { "$push": concatExpression },
						Lightness : {$first : "$Lightness"},
						DominantColors : {$first : "$DominantColors"},
						MetaData : {$first : "$MetaData"},
						SecondaryKeywords: {
							$addToSet: {
								$cond:[
									{
										$and: [{
										  $in : [ "$GroupTags.GroupTagID", SecondaryKeywords ]
										}]
									},
									"$GroupTags.GroupTagID",
									"$$REMOVE"
								]
							}
						}
					}
				};
			}

			//put logic for media selection ranking system here
			/*let mediaSelectionCriteria = {
				PrimaryBrandArchetype: '',
				SecondaryBrandArchetype: '',
				TertiaryBrandArchetype: '',
				MBTI: '',
				BusinessSectors: '',
				Religions: '',
				Countries: '',
				Ethnicities: '',
				Gender: '',
				EthnicDiversity: '',
				Senior: '',
				Luxury: '',
				Body: '',
				Children: '',
				LGBTQ: '',
				Sports: '',
				Fantasy: '',
				Gaming: '',
				FamilyFriendly: '',
				BusinessRelated: '',
				Suggestive: '',
				NarrativeClarity: '',
				Exceptionality: '',
				SubjectType: '',
				NewAge: '',
				ModernVsTraditional: '',
				Satire: '',
				Age: '',
				Year: '',
				CulturalSensitivity: ''
			};*/
			/*reqObj.MediaSelectionCriteria = {
				PrimaryBrandArchetype: 'Creative Spirit',
				SecondaryBrandArchetype: 'Wise Sage',
				TertiaryBrandArchetype: 'Nostalgia',
				MBTI: 'INFJ'
			};*/
			if(mediaSelectionCriteria!==null) {
				
				for (let i = 0; i < mediaSelectionCriteriaKeyArr.length;  i++) {
					const property = mediaSelectionCriteriaKeyArr[i];
					console.log(`${property}: ${mediaSelectionCriteria[property]}`);
					
					groupObj["$group"][`${property}`] = {
						$first: `$MetaData.${property}`
					};
				}
			}
			aggregateStages.push(groupObj);
		}

		//aggregateStages.push ({ $match : conditions });

		sortObj = {
			"value.Ranks" : -1,
			"value.RandomSortId" : -1,
			"value.UploadedOn" : -1
		};
	} else {
		aggregateStages.push ({ $match : conditions });
	}

	let projectPipeline_1 = {
		_id : "$_id",
		Title : "$Title",
		Prompt : "$Prompt",
		Locator : "$Locator",
		Location : "$Location",
		MediaType : "$MediaType",
		ContentType : "$ContentType",
		UploadedOn : "$UploadedOn",
		Content : "$Content",
		thumbnail : "$thumbnail",
		IsPrivate : "$IsPrivate",
		RandomSortId : "$RandomSortId",
		IsUnsplashImage : "$IsUnsplashImage",
		ViewsCount : "$ViewsCount",
		"Ranks" : { "$max": "$Ranks" },
		Lightness : "$Lightness",
		DominantColors : "$DominantColors",
		AllMetaData : "$MetaData",
		MetaData : "$MetaData",
		SecondaryKeywords : { $ifNull: [ "$SecondaryKeywords", [] ] },
		SecondaryKeywordsCount : {$size : { $ifNull: ["$SecondaryKeywords", [] ] } }
	};
	console.log("mediaSelectionCriteria - ", mediaSelectionCriteria);
	if(mediaSelectionCriteria!==null) {
		let tmpProjectObj = {
			"MetaData" : null,
			"MediaSelectionCriteriaArr": {
				"$setUnion" : []
			}
		};
		for (let i = 0; i < mediaSelectionCriteriaKeyArr.length;  i++) {
			const property = mediaSelectionCriteriaKeyArr[i];
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'string' ? mediaSelectionCriteria[property].split(',') : mediaSelectionCriteria[property];
			mediaSelectionCriteria[property] = Array.isArray(mediaSelectionCriteria[property]) && 
				mediaSelectionCriteria[property].map((obj)=>{
				if(typeof obj === 'string') { 
					return obj.trim();
				} else {
					return obj;
				}
		    });
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'boolean' ? [mediaSelectionCriteria[property]] : mediaSelectionCriteria[property]; 
			console.log(`${property}: ${mediaSelectionCriteria[property]}`);
			
			if(!mediaSelectionCriteria[property]) {
				continue;
			}

			let branches = [];
			let keyValArr = [];
			if(Array.isArray(mediaSelectionCriteria[property])) {
				for(let br = 0; br < mediaSelectionCriteria[property].length; br++) {
					branches.push({
						"case": { "$eq": [`$${property}`, mediaSelectionCriteria[property][br]] },
						"then": [`${mediaSelectionCriteria[property][br]}`]
					})
					keyValArr.push({ "$eq": ["$$type", mediaSelectionCriteria[property][br]] });
				}
				
			} else {
				branches.push({
					"case": { "$eq": [`$${property}`, `${mediaSelectionCriteria[property]}`] },
					"then": [`${mediaSelectionCriteria[property]}`]
				})
				keyValArr.push({ "$eq": ["$$type", `${mediaSelectionCriteria[property]}`] });
			}

			if(keyValArr.length) {
				branches.push({
					"case": { "$isArray": `$${property}` },
					"then": {
						"$filter": {
							"input": `$${property}`,
							"as": "type",
							"cond": {
								"$or": keyValArr
							}
						}
					}
				});
			}

			if(tmpProjectObj["MetaData"] === null) {
				tmpProjectObj["MetaData"] = {};
			}
			tmpProjectObj["MetaData"][`${property}`] = {
				"$switch": {
					"branches": branches,
					"default": "$$REMOVE"
				}
			};

			tmpProjectObj["MediaSelectionCriteriaArr"]["$setUnion"].push({
				"$switch": {
					"branches": branches,
					"default": "$$REMOVE"
				}
			});
		}
		console.log("projectPipeline_1 ------------ ", projectPipeline_1);
		console.log("tmpProjectObj ------------ ", tmpProjectObj);
		//console.log("tmpProjectObj[MediaSelectionCriteriaArr][setUnion][0][$cond] ------------ ", tmpProjectObj["MediaSelectionCriteriaArr"]["$setUnion"][0]["$cond"]);
		projectPipeline_1 = {
			...projectPipeline_1, 
			...tmpProjectObj	
		};
		console.log("projectPipeline_1 ------------ ", projectPipeline_1);
	}

	aggregateStages.push ({
		$project : {
			"_id" : "$_id",
			"value" : projectPipeline_1
		}
	});

	if(mediaSelectionCriteria!==null) {
		let projectPipeline_2 = {
			"_id" : "$_id",
			"value" : {
				_id : "$_id",
				Title : "$value.Title",
				Prompt : "$value.Prompt",
				Locator : "$value.Locator",
				Location : "$value.Location",
				MediaType : "$value.MediaType",
				ContentType : "$value.ContentType",
				UploadedOn : "$value.UploadedOn",
				Content : "$value.Content",
				thumbnail : "$value.thumbnail",
				IsPrivate : "$value.IsPrivate",
				RandomSortId : "$value.RandomSortId",
				IsUnsplashImage : "$value.IsUnsplashImage",
				ViewsCount : "$value.ViewsCount",
				"Ranks" : "$value.Ranks",
				Lightness : "$value.Lightness",
				DominantColors : "$value.DominantColors",
				SecondaryKeywords : "$value.SecondaryKeywords",
				SecondaryKeywordsCount : "$value.SecondaryKeywordsCount",
				AllMetaData: "$value.AllMetaData",
				MetaData: "$value.MetaData",
				MediaSelectionCriteriaArr: "$value.MediaSelectionCriteriaArr",
				MediaSelectionCriteriaCount: {$size : { $ifNull: ["$value.MediaSelectionCriteriaArr", [] ] }}
			}
		};

		aggregateStages.push ({
			$project : projectPipeline_2
		});
	}

	/*sortObj = {
		"value.SecondaryKeywordsCount" : -1,
		"value.MediaSelectionCriteriaCount" : -1,
		"value.Ranks" : -1,
		"value.RandomSortId" : -1,
		"value.UploadedOn" : -1
	};*/

	sortObj = await getStreamMediaFilterSortingOrder();
	
	//aggregateStages.push ({ $match : {"value.Ranks" : {$ne : 0}} });
	aggregateStages.push ({ $sort : sortObj	});

	//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

	//aggregateStages.push ({	$limit : per_page });


	var mediaCount = await Media.find(conditions, fields).count();
	mediaCount = mediaCount ? mediaCount : 0;

	var returnObj = {};
	Media.aggregate(aggregateStages).allowDiskUse(true).exec(async function (err, results) {
		if (err) {
			console.log("ERROR ------------------- ", err);
			returnObj = {
				"status":"error",
				"results":outputRecords,
				"mediaCount":mediaCount,
				limit: limit,
				selectedKeywords : selectedKeywords,
				aggregateStages : aggregateStages,
				SearchedKeywordByRank : subsetByRankObj2
			};
		}
		else {
			var local_map_selectedgtValues = local_map_selectedgt ? Object.values(local_map_selectedgt) : [];
			var gtArr = [];
			for( var loop = 0; loop < local_map_selectedgtValues.length; loop++ ){
				gtArr.push(local_map_selectedgtValues[loop]);
			}

			//get all selected gt titles map
			var selectedGtResults = await groupTags.find({_id : {$in : gtArr}}, {GroupTagTitle : 1});
			selectedGtResults = selectedGtResults ? selectedGtResults : [];
			var gtTitleMap = {};
			for( var loop = 0; loop < selectedGtResults.length; loop++ ){
				gtTitleMap[selectedGtResults[loop]._id] = selectedGtResults[loop].GroupTagTitle ? selectedGtResults[loop].GroupTagTitle : '';
			}

			for( var loop = 0; loop < results.length; loop++ ){
				var tempObj = results[loop];
				tempObj.value.URL = "";
				tempObj.value.Location = Array.isArray(tempObj.value.Location) ? tempObj.value.Location : [];
				if(tempObj.value.Location.length) {
					if( tempObj.value.Location[0].URL ){
						tempObj.value.URL = tempObj.value.Location[0].URL;
					}
				}
				tempObj.value.SelectedGtTitle = '';
				var index = tempObj.value.Ranks ? tempObj.value.Ranks : null;
				if(index) {
					var finalIndex = local_map_selectedgt["rank_"+index] ? local_map_selectedgt["rank_"+index] : null;
					if(finalIndex) {
						var gtTitle = gtTitleMap[finalIndex] = gtTitleMap[finalIndex] ? gtTitleMap[finalIndex] : '';
						tempObj.value.SelectedGtTitle = gtTitle;
					}
				} else {
					console.log("........... CODE IS BREAKING HERE ..........");
				}
				tempObj.value.SecondaryKeywordsMap = getKeywordNamesByKeywordMap (tempObj.value.SecondaryKeywords, SecondaryKeywordsMap);

				outputRecords.push(tempObj);
			}

			if(timer) {
				clearInterval(timer);
			}

			if(selectedKeywords.length) {
				returnObj = {
					"status":"success",
					"results":outputRecords,
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			} else {
				returnObj = {
					"status":"success",
					"results":outputRecords.shuffle(),
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			}
		}
		callback(null, returnObj);
	});
}

var getMediaFromSet = async function (req, callback) {
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	var reqObj = req.body ? req.body : {};
	console.log("---------- Searching Media now - getMediaFromSet getMediaFromSet getMediaFromSet getMediaFromSet getMediaFromSet----------");
	var sec = 0;

	var timer = setInterval(function(){
		sec++;
		console.log("getMediaFromSet1 execution time = ", sec+" seconds.");
	},1000);

	var subsetByRank = reqObj.subsetByRank ? reqObj.subsetByRank : {};
	var subsetByRankObj2 = reqObj.subsetByRankObj2 ? reqObj.subsetByRankObj2 : {};
	var selectedKeywords = reqObj.generatedKeywords ? reqObj.generatedKeywords : [];
	var SecondaryKeywords = reqObj.SecondaryKeywords || [];
	var SecondaryKeywordsMap = reqObj.SecondaryKeywordsMap || {};
	console.log("subsetByRankObj2 --------- ", subsetByRankObj2);
	console.log("getMediaFromSet: SecondaryKeywords - ", SecondaryKeywords);
	console.log("SecondaryKeywordsMap - ", SecondaryKeywordsMap);

	reqObj.MediaSelectionCriteria1 = !reqObj.MediaSelectionCriteria1 ? {} : reqObj.MediaSelectionCriteria1;
	reqObj.MediaSelectionCriteria = Object.values(reqObj.MediaSelectionCriteria1).length ? reqObj.MediaSelectionCriteria1 : null;
	
	/*{
		PrimaryBrandArchetype: 'Pure and Innocent',
		SecondaryBrandArchetype: 'Lover and Sensualist',
		TertiaryBrandArchetype: 'Creative Spirit',
		MBTI: 'INFJ'
	};*/
	let mediaSelectionCriteria = typeof reqObj.MediaSelectionCriteria==='object' ? reqObj.MediaSelectionCriteria : null;
	const mediaSelectionCriteriaKeyArr = Object.keys(mediaSelectionCriteria || {});
	var outputRecords = [];

	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		//MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase },
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
			{ MediaType : "Image"}
		],
		InAppropFlagCount : { $lt:5 }
	};

	var fields = {};

	var sortObj = {"value.RandomSortId" : -1};

	var page = 1;
	//var per_page = 48;
	var per_page = 2500;
	var limit = page*per_page;	//48

	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["MetaMetaTags"] = {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		};


		conditions["GroupTags.GroupTagID"] = { $in : selectedKeywords };

		conditions["$or"] = [
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}, IsUnsplashImage : true},
			{MediaType : "Image"}
		];

		if(!req.session.user.onlyunsplash) {
			conditions["$or"] = [
				{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
				{MediaType : "Image"}
			]
		}

		if(req.session.user.onlyenablers) {
			conditions["MetaMetaTags"] = { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase };
		}


		/*if(SecondaryKeywords.length) {
			//selectedKeywords = selectedKeywords.concat(SecondaryKeywords);
			conditions["$and"].push({
				$or : [
					{ "GroupTags.GroupTagID" : { $in : selectedKeywords } },
					//{ "GroupTags.GroupTagID" : { $in : SecondaryKeywords } }
				]
			});
		} else {
			conditions["$and"].push({
				$or : [
					{ "GroupTags.GroupTagID" : { $in : selectedKeywords } }
				]
			});
		}*/
		console.log("conditions = ", conditions);
		aggregateStages.push ({ $match : conditions });
		//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

		//aggregateStages.push ({	$limit : per_page });
		aggregateStages.push ({ $unwind : "$GroupTags" });


		//code to make individual keyword in a set
		var oneGT_subsetByRank = [];
		for(let i = 0; i < subsetByRank.length; i++) {
			for(let j = 0; j < subsetByRank[i].length; j++) {
				oneGT_subsetByRank.push([subsetByRank[i][j]]);
			}
		}

		var oneGT_subsetByRankObj2 = [];
		for(i in subsetByRankObj2) {
			for(let j = 0; j < subsetByRankObj2[i].length; j++) {
				oneGT_subsetByRankObj2.push([subsetByRankObj2[i][j]]);
			}
		}
		reqObj.subsetByRank = oneGT_subsetByRank;
		reqObj.subsetByRankObj2 = oneGT_subsetByRankObj2;
		//code to make individual keyword in a set

		//this is the grouptags set by rank
		//var totalSets = subsetByRank ? subsetByRank : [];
		var totalSets = oneGT_subsetByRank ? oneGT_subsetByRank : [];

		var maxRank = totalSets.length;
		var switchBranches = [];
		var concatBranches = [];
		var counter = 0;
		var local_map_selectedgt = {};
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags.GroupTagID", totalSets[i] ]},
				  then: (i+1)
				}
			);

			local_map_selectedgt["rank_"+(i+1)] = totalSets[i];

			concatBranches.push({
				$cond: {
				  if: {
					$and: [{
					  $in : [ "$GroupTags.GroupTagID", totalSets[i] ]
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

			//dontIncludeKeywords case
			var dontIncludeKeywords = req.body.dontIncludeKeywords || [];
			for(var di = 0; di < switchBranches.length; di++) {
				if(dontIncludeKeywords.length) {
					switchBranches[di]["case"]["$nin"] = [ "$GroupTags.GroupTagID", dontIncludeKeywords ];
				}
			}
			//dontIncludeKeywords case

			switchExpression = {
				$switch : {
					branches : switchBranches,
					default : 0
				}
			};

			concatExpression = {
				"$concat" : concatBranches
			};


			var groupObj =	{
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
					thumbnail : {$first : "$thumbnail"},
					IsPrivate : {$first : "$IsPrivate"},
					RandomSortId : {$first : "$RandomSortId"},
					IsUnsplashImage : {$first : "$IsUnsplashImage"},
					ViewsCount : {$first : "$ViewsCount"},
					"Ranks" : { "$push": switchExpression },
					//"Ranks" : { "$push": concatExpression },
					Lightness : {$first : "$Lightness"},
					DominantColors : {$first : "$DominantColors"},
					MetaData : {$first : "$MetaData"},
					//SecondaryKeywords: {$first: []}
				}
			};
			if(SecondaryKeywords.length) {
				//console.log("selectedKeywords --------------------------------- ", selectedKeywords);
				groupObj =	{
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
						thumbnail : {$first : "$thumbnail"},
						IsPrivate : {$first : "$IsPrivate"},
						RandomSortId : {$first : "$RandomSortId"},
						IsUnsplashImage : {$first : "$IsUnsplashImage"},
						ViewsCount : {$first : "$ViewsCount"},
						"Ranks" : { "$push": switchExpression },
						//"Ranks" : { "$push": concatExpression },
						Lightness : {$first : "$Lightness"},
						DominantColors : {$first : "$DominantColors"},
						MetaData : {$first : "$MetaData"},
						SecondaryKeywords: {
							$addToSet: {
								$cond:[
									{
										$and: [{
										  $in : [ "$GroupTags.GroupTagID", SecondaryKeywords ]
										}]
									},
									"$GroupTags.GroupTagID",
									"$$REMOVE"
								]
							}
						}
					}
				};
			}

			//put logic for media selection ranking system here
			/*let mediaSelectionCriteria = {
				PrimaryBrandArchetype: '',
				SecondaryBrandArchetype: '',
				TertiaryBrandArchetype: '',
				MBTI: '',
				BusinessSectors: '',
				Religions: '',
				Countries: '',
				Ethnicities: '',
				Gender: '',
				EthnicDiversity: '',
				Senior: '',
				Luxury: '',
				Body: '',
				Children: '',
				LGBTQ: '',
				Sports: '',
				Fantasy: '',
				Gaming: '',
				FamilyFriendly: '',
				BusinessRelated: '',
				Suggestive: '',
				NarrativeClarity: '',
				Exceptionality: '',
				SubjectType: '',
				NewAge: '',
				ModernVsTraditional: '',
				Satire: '',
				Age: '',
				Year: '',
				CulturalSensitivity: ''
			};*/
			/*reqObj.MediaSelectionCriteria = {
				PrimaryBrandArchetype: 'Creative Spirit',
				SecondaryBrandArchetype: 'Wise Sage',
				TertiaryBrandArchetype: 'Nostalgia',
				MBTI: 'INFJ'
			};*/
			if(mediaSelectionCriteria!==null) {
				
				for (let i = 0; i < mediaSelectionCriteriaKeyArr.length;  i++) {
					const property = mediaSelectionCriteriaKeyArr[i];
					console.log(`${property}: ${mediaSelectionCriteria[property]}`);
					
					groupObj["$group"][`${property}`] = {
						$first: `$MetaData.${property}`
					};
				}
			}
			aggregateStages.push(groupObj);
		}

		//aggregateStages.push ({ $match : conditions });

		sortObj = {
			"value.Ranks" : -1,
			"value.RandomSortId" : -1,
			"value.UploadedOn" : -1
		};
	} else {
		aggregateStages.push ({ $match : conditions });
	}


	let projectPipeline_1 = {
		_id : "$_id",
		Title : "$Title",
		Prompt : "$Prompt",
		Locator : "$Locator",
		Location : "$Location",
		MediaType : "$MediaType",
		ContentType : "$ContentType",
		UploadedOn : "$UploadedOn",
		Content : "$Content",
		thumbnail : "$thumbnail",
		IsPrivate : "$IsPrivate",
		RandomSortId : "$RandomSortId",
		IsUnsplashImage : "$IsUnsplashImage",
		ViewsCount : "$ViewsCount",
		"Ranks" : { "$max": "$Ranks" },
		Lightness : "$Lightness",
		DominantColors : "$DominantColors",
		AllMetaData : "$MetaData",
		MetaData : "$MetaData",
		SecondaryKeywords : { $ifNull: [ "$SecondaryKeywords", [] ] },
		SecondaryKeywordsCount : {$size : { $ifNull: ["$SecondaryKeywords", [] ] } }
	};

	if(mediaSelectionCriteria!==null) {
		let tmpProjectObj = {
			"MetaData" : null,
			"MediaSelectionCriteriaArr": {
				"$setUnion" : []
			}
		};
		for (let i = 0; i < mediaSelectionCriteriaKeyArr.length; i++) {
			const property = mediaSelectionCriteriaKeyArr[i];
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'string' ? mediaSelectionCriteria[property].split(',') : mediaSelectionCriteria[property];
			mediaSelectionCriteria[property] = Array.isArray(mediaSelectionCriteria[property]) ? 
				mediaSelectionCriteria[property].map((obj)=>{
				if(typeof obj === 'string') { 
					return obj.trim();
				} else {
					return obj;
				}
		    }) : mediaSelectionCriteria[property];
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'boolean' ? [mediaSelectionCriteria[property]] : mediaSelectionCriteria[property]; 
			console.log(`${property}: ${mediaSelectionCriteria[property]}`);
			console.log(`type of ${property}: typeof ${mediaSelectionCriteria[property]}`);

			if(!mediaSelectionCriteria[property]) {
				continue;
			}

			/*tmpProjectObj["MetaData"][`${property}`] = {
				"$cond" : {
					//"if": { $eq: [`$${property}`, `${mediaSelectionCriteria[property]}`] },
					"if": {
						$and: [{
							$in : [ `$${property}`, [`${mediaSelectionCriteria[property]}`] ]
						}]
					},
					"then": [`${mediaSelectionCriteria[property]}`],
					"else": "$$REMOVE"
				}
			};*/

			let branches = [];
			let keyValArr = [];
			if(Array.isArray(mediaSelectionCriteria[property])) {
				for(let br = 0; br < mediaSelectionCriteria[property].length; br++) {
					const val = mediaSelectionCriteria[property][br];
					branches.push({
						"case": { "$eq": [`$${property}`, val] },
						"then": [`${property}:${val}`]
					})
					keyValArr.push({ "$eq": ["$$type", val] });
				}
				
			} else {
				const val = mediaSelectionCriteria[property];
				branches.push({
					"case": { "$eq": [`$${property}`, val] },
					"then": [`${property}:${val}`]
				})
				keyValArr.push({ "$eq": ["$$type", val] });
			}

			if(keyValArr.length) {
				branches.push({
					"case": { "$isArray": `$${property}`/*, "$in": [keyValArr[0]["$eq"][1], `$${property}`]*/ },
					"then": {
						"$filter": {
							"input": `$${property}`,
							"as": "type",
							"cond": {
								"$or": keyValArr
							}
						}
					}
				});
			}

			if(tmpProjectObj["MetaData"] === null) {
				tmpProjectObj["MetaData"] = {};
			}
			tmpProjectObj["MetaData"][`${property}`] = {
				"$switch": {
					"branches": branches,
					"default": "$$REMOVE"
				}
			};

			tmpProjectObj["MediaSelectionCriteriaArr"]["$setUnion"].push({
				"$switch": {
					"branches": branches,
					"default": []
				}
			});
		}
		projectPipeline_1 = {
			...projectPipeline_1, 
			...tmpProjectObj	
		};
	}

	aggregateStages.push ({
		$project : {
			"_id" : "$_id",
			"value" : projectPipeline_1
		}
	});

	if(mediaSelectionCriteria!==null) {
		let projectPipeline_2 = {
			"_id" : "$_id",
			"value" : {
				_id : "$_id",
				Title : "$value.Title",
				Prompt : "$value.Prompt",
				Locator : "$value.Locator",
				Location : "$value.Location",
				MediaType : "$value.MediaType",
				ContentType : "$value.ContentType",
				UploadedOn : "$value.UploadedOn",
				Content : "$value.Content",
				thumbnail : "$value.thumbnail",
				IsPrivate : "$value.IsPrivate",
				RandomSortId : "$value.RandomSortId",
				IsUnsplashImage : "$value.IsUnsplashImage",
				ViewsCount : "$value.ViewsCount",
				"Ranks" : "$value.Ranks",
				Lightness : "$value.Lightness",
				DominantColors : "$value.DominantColors",
				SecondaryKeywords : "$value.SecondaryKeywords",
				SecondaryKeywordsCount : "$value.SecondaryKeywordsCount",
				AllMetaData: "$value.AllMetaData",
				MetaData: "$value.MetaData",
				MediaSelectionCriteriaArr: "$value.MediaSelectionCriteriaArr",
				MediaSelectionCriteriaCount: {$size : { $ifNull: ["$value.MediaSelectionCriteriaArr", [] ] }}
			}
		};

		aggregateStages.push ({
			$project : projectPipeline_2
		});
	}

	sortObj = await getStreamMediaFilterSortingOrder();

	//aggregateStages.push ({ $match : {"value.Ranks" : {$ne : 0}} });
	aggregateStages.push ({ $sort : sortObj	});

	//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

	//aggregateStages.push ({	$limit : per_page });


	var mediaCount = await Media.find(conditions, fields).count();
	mediaCount = mediaCount ? mediaCount : 0;

	var returnObj = {};
	console.log("aggregateStages - ", JSON.stringify(aggregateStages, null, 5));
	Media.aggregate(aggregateStages).allowDiskUse(true).exec(async function (err, results) {
		if (err) {
			returnObj = {
				"status":"error",
				"results":outputRecords,
				"mediaCount":mediaCount,
				limit: limit,
				selectedKeywords : selectedKeywords,
				aggregateStages : aggregateStages,
				SearchedKeywordByRank : subsetByRankObj2
			};
		}
		else {

			var local_map_selectedgtValues = local_map_selectedgt ? Object.values(local_map_selectedgt) : [];
			var gtArr = [];
			for( var loop = 0; loop < local_map_selectedgtValues.length; loop++ ){
				gtArr.push(local_map_selectedgtValues[loop]);
			}

			//get all selected gt titles map
			var selectedGtResults = await groupTags.find({_id : {$in : gtArr}}, {GroupTagTitle : 1});
			selectedGtResults = selectedGtResults ? selectedGtResults : [];
			var gtTitleMap = {};
			for( var loop = 0; loop < selectedGtResults.length; loop++ ){
				gtTitleMap[selectedGtResults[loop]._id] = selectedGtResults[loop].GroupTagTitle ? selectedGtResults[loop].GroupTagTitle : '';
			}

			//console.log("$$$$$$$$$$$$$$$$$$$$$$ ----------------results ----------------------------- ", results);
			for( var loop = 0; loop < results.length; loop++ ){
				var tempObj = results[loop];
				tempObj.value.URL = "";
				tempObj.value.Location = Array.isArray(tempObj.value.Location) ? tempObj.value.Location : [];
				if(tempObj.value.Location.length) {
					if( tempObj.value.Location[0].URL ){
						tempObj.value.URL = tempObj.value.Location[0].URL;
					}
				}
				
				tempObj.value.SelectedGtTitle = '';

				var index = tempObj.value.Ranks ? tempObj.value.Ranks : null;
				if(index) {
					var finalIndex = local_map_selectedgt["rank_"+index] ? local_map_selectedgt["rank_"+index] : null;
					if(finalIndex) {
						var gtTitle = gtTitleMap[finalIndex] = gtTitleMap[finalIndex] ? gtTitleMap[finalIndex] : '';
						tempObj.value.SelectedGtTitle = gtTitle;
					}
				}
				tempObj.value.SecondaryKeywordsMap = getKeywordNamesByKeywordMap (tempObj.value.SecondaryKeywords, SecondaryKeywordsMap);
				outputRecords.push(tempObj);
			}


			if(timer) {
				clearInterval(timer);
			}

			if(selectedKeywords.length) {
				returnObj = {
					"status":"success",
					"results":outputRecords,
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			} else {
				returnObj = {
					"status":"success",
					"results":outputRecords.shuffle(),
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			}
		}
		callback(null, returnObj);
	});
}

var getMediaFromSet2 = async function (req, callback) {
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	var reqObj = req.body ? req.body : {};
	console.log("---------- Searching Media now - getMediaFromSet2 getMediaFromSet2 getMediaFromSet2 getMediaFromSet2----------");
	var sec = 0;

	var timer = setInterval(function(){
		sec++;
		console.log("getMediaFromSet2 execution time = ", sec+" seconds.");
	},1000);

	var subsetByRank = reqObj.subsetByRank2 ? reqObj.subsetByRank2 : {};
	var subsetByRankObj2 = reqObj.subsetByRankObj22 ? reqObj.subsetByRankObj22 : {};
	var selectedKeywords = reqObj.generatedKeywords2 ? reqObj.generatedKeywords2 : [];
	var SecondaryKeywords = reqObj.SecondaryKeywords2 || [];
	var SecondaryKeywordsMap = reqObj.SecondaryKeywordsMap2 || {};
	console.log("subsetByRankObj2 --------- ", subsetByRankObj2);
	console.log("getMediaFromSet2: SecondaryKeywords - ", SecondaryKeywords);
	console.log("SecondaryKeywordsMap - ", SecondaryKeywordsMap);

	//put logic for media selection ranking system here
	//reqObj.MediaSelectionCriteria = reqObj.MediaSelectionCriteria || null;
	reqObj.MediaSelectionCriteria2 = !reqObj.MediaSelectionCriteria2 ? {} : reqObj.MediaSelectionCriteria2;
	reqObj.MediaSelectionCriteria = Object.values(reqObj.MediaSelectionCriteria2).length ? reqObj.MediaSelectionCriteria2 : null;
	/*{
		PrimaryBrandArchetype: 'Pure and Innocent',
		SecondaryBrandArchetype: 'Lover and Sensualist',
		TertiaryBrandArchetype: 'Creative Spirit',
		MBTI: 'INFJ'
	};*/
	let mediaSelectionCriteria = typeof reqObj.MediaSelectionCriteria==='object' ? reqObj.MediaSelectionCriteria : null;
	const mediaSelectionCriteriaKeyArr = Object.keys(mediaSelectionCriteria || {});

	var outputRecords = [];

	var conditions = {
		IsDeleted : 0,
		Status : 1,
		IsPrivate : {$ne : 1},
		//MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase },
		UploadedBy : "admin",
		$or : [
			{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
			{ MediaType : "Image"}
		],
		InAppropFlagCount : { $lt:5 }
	};

	var fields = {};

	var sortObj = {"value.RandomSortId" : -1};

	var page = 1;
	//var per_page = 48;
	var per_page = 2500;
	var limit = page*per_page;	//48

	var aggregateStages = [];
	if(selectedKeywords.length) {
		conditions["MetaMetaTags"] = {
			$nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase
		};

		conditions["GroupTags.GroupTagID"] = { $in : selectedKeywords };
		conditions["$or"] = [
			{MediaType : "Link" , LinkType: "image" , IsUnsplashImage : {$exists:true}, IsUnsplashImage : true},
			{ MediaType : "Image"}
		];


		if(!req.session.user.onlyunsplash) {
			conditions["$or"] = [
				{ MediaType : "Link", LinkType : "image", IsUnsplashImage : {$exists : true}, IsUnsplashImage : true },
				{ MediaType : "Image"}
			]
		}

		if(req.session.user.onlyenablers) {
			conditions["MetaMetaTags"] = { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__DefaultCase };
		}


		aggregateStages.push ({ $match : conditions });
		//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

		//aggregateStages.push ({	$limit : per_page });
		aggregateStages.push ({ $unwind : "$GroupTags" });

		//code to make individual keyword in a set
		var oneGT_subsetByRank = [];
		for(let i = 0; i < subsetByRank.length; i++) {
			for(let j = 0; j < subsetByRank[i].length; j++) {
				oneGT_subsetByRank.push([subsetByRank[i][j]]);
			}
		}

		var oneGT_subsetByRankObj2 = [];
		for(i in subsetByRankObj2) {
			for(let j = 0; j < subsetByRankObj2[i].length; j++) {
				oneGT_subsetByRankObj2.push([subsetByRankObj2[i][j]]);
			}
		}
		reqObj.subsetByRank2 = oneGT_subsetByRank;
		reqObj.subsetByRankObj22 = oneGT_subsetByRankObj2;
		//code to make individual keyword in a set
		//this is the grouptags set by rank
		//var totalSets = subsetByRank ? subsetByRank : [];
		var totalSets = oneGT_subsetByRank ? oneGT_subsetByRank : [];

		var maxRank = totalSets.length;
		var switchBranches = [];
		var concatBranches = [];
		var counter = 0;
		var local_map_selectedgt = {};
		for (var i = (totalSets.length-1); i >= 0; i--) {
			switchBranches.push(
				{
				  case: {$in : [ "$GroupTags.GroupTagID", totalSets[i] ]},
				  then: (i+1)
				}
			);
			local_map_selectedgt["rank_"+(i+1)] = totalSets[i];
			concatBranches.push({
				$cond: {
				  if: {
					$and: [{
					  $in : [ "$GroupTags.GroupTagID", totalSets[i] ]
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

			//dontIncludeKeywords case
			var dontIncludeKeywords = req.body.dontIncludeKeywords || [];
			for(var di = 0; di < switchBranches.length; di++) {
				if(dontIncludeKeywords.length) {
					switchBranches[di]["case"]["$nin"] = [ "$GroupTags.GroupTagID", dontIncludeKeywords ];
				}
			}
			//dontIncludeKeywords case


			switchExpression = {
				$switch : {
					branches : switchBranches,
					default : 0
				}
			};

			concatExpression = {
				"$concat" : concatBranches
			};

			var groupObj =	{
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
					thumbnail : {$first : "$thumbnail"},
					IsPrivate : {$first : "$IsPrivate"},
					RandomSortId : {$first : "$RandomSortId"},
					IsUnsplashImage : {$first : "$IsUnsplashImage"},
					ViewsCount : {$first : "$ViewsCount"},
					"Ranks" : { "$push": switchExpression },
					//"Ranks" : { "$push": concatExpression },
					Lightness : {$first : "$Lightness"},
					DominantColors : {$first : "$DominantColors"},
					MetaData : {$first : "$MetaData"},
					//SecondaryKeywords: {$first: []}
				}
			};
			if(SecondaryKeywords.length) {
				//console.log("selectedKeywords --------------------------------- ", selectedKeywords);
				groupObj =	{
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
						thumbnail : {$first : "$thumbnail"},
						IsPrivate : {$first : "$IsPrivate"},
						RandomSortId : {$first : "$RandomSortId"},
						IsUnsplashImage : {$first : "$IsUnsplashImage"},
						ViewsCount : {$first : "$ViewsCount"},
						"Ranks" : { "$push": switchExpression },
						//"Ranks" : { "$push": concatExpression },
						Lightness : {$first : "$Lightness"},
						DominantColors : {$first : "$DominantColors"},
						MetaData : {$first : "$MetaData"},
						SecondaryKeywords: {
							$addToSet: {
								$cond:[
									{
										$and: [{
										  $in : [ "$GroupTags.GroupTagID", SecondaryKeywords ]
										}]
									},
									"$GroupTags.GroupTagID",
									"$$REMOVE"
								]
							}
						}
					}
				};
			}

			if(mediaSelectionCriteria!==null) {
				
				for (let i = 0; i < mediaSelectionCriteriaKeyArr.length;  i++) {
					const property = mediaSelectionCriteriaKeyArr[i];
					console.log(`${property}: ${mediaSelectionCriteria[property]}`);
					
					groupObj["$group"][`${property}`] = {
						$first: `$MetaData.${property}`
					};
				}
			}
			aggregateStages.push(groupObj);
		}

		//aggregateStages.push ({ $match : conditions });

		sortObj = {
			"value.Ranks" : -1,
			"value.RandomSortId" : -1,
			"value.UploadedOn" : -1
		};
	} else {
		aggregateStages.push ({ $match : conditions });
	}


	let projectPipeline_1 = {
		_id : "$_id",
		Title : "$Title",
		Prompt : "$Prompt",
		Locator : "$Locator",
		Location : "$Location",
		MediaType : "$MediaType",
		ContentType : "$ContentType",
		UploadedOn : "$UploadedOn",
		Content : "$Content",
		thumbnail : "$thumbnail",
		IsPrivate : "$IsPrivate",
		RandomSortId : "$RandomSortId",
		IsUnsplashImage : "$IsUnsplashImage",
		ViewsCount : "$ViewsCount",
		"Ranks" : { "$max": "$Ranks" },
		Lightness : "$Lightness",
		DominantColors : "$DominantColors",
		AllMetaData : "$MetaData",
		MetaData : "$MetaData",
		SecondaryKeywords : { $ifNull: [ "$SecondaryKeywords", [] ] },
		SecondaryKeywordsCount : {$size : { $ifNull: ["$SecondaryKeywords", [] ] } }
	};

	if(mediaSelectionCriteria!==null) {
		let tmpProjectObj = {
			"MetaData" : null,
			"MediaSelectionCriteriaArr": {
				"$setUnion" : []
			}
		};
		for (let i = 0; i < mediaSelectionCriteriaKeyArr.length; i++) {
			const property = mediaSelectionCriteriaKeyArr[i];
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'string' ? mediaSelectionCriteria[property].split(',') : mediaSelectionCriteria[property];
			mediaSelectionCriteria[property] = Array.isArray(mediaSelectionCriteria[property]) ?
				mediaSelectionCriteria[property].map((obj)=>{
				if(typeof obj === 'string') { 
					return obj.trim();
				} else {
					return obj;
				}
		    }) : mediaSelectionCriteria[property];
			mediaSelectionCriteria[property] = typeof mediaSelectionCriteria[property] === 'boolean' ? [mediaSelectionCriteria[property]] : mediaSelectionCriteria[property]; 
			console.log(`${property}: ${mediaSelectionCriteria[property]}`);
			console.log(`type of ${property}: typeof ${mediaSelectionCriteria[property]}`);

			if(!mediaSelectionCriteria[property]) {
				continue;
			}

			/*tmpProjectObj["MetaData"][`${property}`] = {
				"$cond" : {
					//"if": { $eq: [`$${property}`, `${mediaSelectionCriteria[property]}`] },
					"if": {
						$and: [{
							$in : [ `$${property}`, [`${mediaSelectionCriteria[property]}`] ]
						}]
					},
					"then": [`${mediaSelectionCriteria[property]}`],
					"else": "$$REMOVE"
				}
			};*/

			let branches = [];
			let keyValArr = [];
			if(Array.isArray(mediaSelectionCriteria[property])) {
				for(let br = 0; br < mediaSelectionCriteria[property].length; br++) {
					const val = mediaSelectionCriteria[property][br];
					branches.push({
						"case": { "$eq": [`$${property}`, val] },
						"then": [`${property}:${val}`]
					})
					keyValArr.push({ "$eq": ["$$type", val] });
				}
				
			} else {
				const val = mediaSelectionCriteria[property];
				branches.push({
					"case": { "$eq": [`$${property}`, val] },
					"then": [`${property}:${val}`]
				})
				keyValArr.push({ "$eq": ["$$type", val] });
			}

			if(keyValArr.length) {
				branches.push({
					"case": { "$isArray": `$${property}`/*, "$in": [keyValArr[0]["$eq"][1], `$${property}`]*/ },
					"then": {
						"$filter": {
							"input": `$${property}`,
							"as": "type",
							"cond": {
								"$or": keyValArr
							}
						}
					}
				});
			}

			if(tmpProjectObj["MetaData"] === null) {
				tmpProjectObj["MetaData"] = {};
			}
			tmpProjectObj["MetaData"][`${property}`] = {
				"$switch": {
					"branches": branches,
					"default": "$$REMOVE"
				}
			};

			tmpProjectObj["MediaSelectionCriteriaArr"]["$setUnion"].push({
				"$switch": {
					"branches": branches,
					"default": []
				}
			});
		}
		projectPipeline_1 = {
			...projectPipeline_1, 
			...tmpProjectObj	
		};
	}

	aggregateStages.push ({
		$project : {
			"_id" : "$_id",
			"value" : projectPipeline_1
		}
	});

	if(mediaSelectionCriteria!==null) {
		let projectPipeline_2 = {
			"_id" : "$_id",
			"value" : {
				_id : "$_id",
				Title : "$value.Title",
				Prompt : "$value.Prompt",
				Locator : "$value.Locator",
				Location : "$value.Location",
				MediaType : "$value.MediaType",
				ContentType : "$value.ContentType",
				UploadedOn : "$value.UploadedOn",
				Content : "$value.Content",
				thumbnail : "$value.thumbnail",
				IsPrivate : "$value.IsPrivate",
				RandomSortId : "$value.RandomSortId",
				IsUnsplashImage : "$value.IsUnsplashImage",
				ViewsCount : "$value.ViewsCount",
				"Ranks" : "$value.Ranks",
				Lightness : "$value.Lightness",
				DominantColors : "$value.DominantColors",
				SecondaryKeywords : "$value.SecondaryKeywords",
				SecondaryKeywordsCount : "$value.SecondaryKeywordsCount",
				AllMetaData: "$value.AllMetaData",
				MetaData: "$value.MetaData",
				MediaSelectionCriteriaArr: "$value.MediaSelectionCriteriaArr",
				MediaSelectionCriteriaCount: {$size : { $ifNull: ["$value.MediaSelectionCriteriaArr", [] ] }}
			}
		};

		aggregateStages.push ({
			$project : projectPipeline_2
		});
	}

	sortObj = await getStreamMediaFilterSortingOrder();

	//aggregateStages.push ({ $match : {"value.Ranks" : {$ne : 0}} });
	aggregateStages.push ({ $sort : sortObj	});

	//aggregateStages.push ({ $skip : ((page-1)*per_page)	});

	//aggregateStages.push ({	$limit : per_page });


	var mediaCount = await Media.find(conditions, fields).count();
	mediaCount = mediaCount ? mediaCount : 0;

	var returnObj = {};
	console.log("aggregateStages - ", JSON.stringify(aggregateStages, null, 5));
	Media.aggregate(aggregateStages).allowDiskUse(true).exec(async function (err, results) {
		if (err) {
			returnObj = {
				"status":"error",
				"results":outputRecords,
				"mediaCount":mediaCount,
				limit: limit,
				selectedKeywords : selectedKeywords,
				aggregateStages : aggregateStages,
				SearchedKeywordByRank : subsetByRankObj2
			};
		}
		else {

			var local_map_selectedgtValues = local_map_selectedgt ? Object.values(local_map_selectedgt) : [];
			var gtArr = [];
			for( var loop = 0; loop < local_map_selectedgtValues.length; loop++ ){
				gtArr.push(local_map_selectedgtValues[loop]);
			}

			//get all selected gt titles map
			var selectedGtResults = await groupTags.find({_id : {$in : gtArr}}, {GroupTagTitle : 1});
			selectedGtResults = selectedGtResults ? selectedGtResults : [];
			var gtTitleMap = {};
			for( var loop = 0; loop < selectedGtResults.length; loop++ ){
				gtTitleMap[selectedGtResults[loop]._id] = selectedGtResults[loop].GroupTagTitle ? selectedGtResults[loop].GroupTagTitle : '';
			}

			//console.log("$$$$$$$$$$$$$$$$$$$$$$ ----------------results ----------------------------- ", results);
			for( var loop = 0; loop < results.length; loop++ ){
				var tempObj = results[loop];
				tempObj.value.URL = "";
				tempObj.value.Location = Array.isArray(tempObj.value.Location) ? tempObj.value.Location : [];
				if(tempObj.value.Location.length) {
					if( tempObj.value.Location[0].URL ){
						tempObj.value.URL = tempObj.value.Location[0].URL;
					}
				}
				
				tempObj.value.SelectedGtTitle = '';

				var index = tempObj.value.Ranks ? tempObj.value.Ranks : null;
				if(index) {
					var finalIndex = local_map_selectedgt["rank_"+index] ? local_map_selectedgt["rank_"+index] : null;
					if(finalIndex) {
						var gtTitle = gtTitleMap[finalIndex] = gtTitleMap[finalIndex] ? gtTitleMap[finalIndex] : '';
						tempObj.value.SelectedGtTitle = gtTitle;
					}
				}
				tempObj.value.SecondaryKeywordsMap = getKeywordNamesByKeywordMap (tempObj.value.SecondaryKeywords, SecondaryKeywordsMap);
				outputRecords.push(tempObj);
			}


			if(timer) {
				clearInterval(timer);
			}

			if(selectedKeywords.length) {
				returnObj = {
					"status":"success",
					"results":outputRecords,
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			} else {
				returnObj = {
					"status":"success",
					"results":outputRecords.shuffle(),
					"mediaCount":mediaCount,
					limit: limit,
					selectedKeywords : selectedKeywords,
					aggregateStages : aggregateStages,
					SearchedKeywordByRank : subsetByRankObj2
				};
			}
		}
		callback(null, returnObj);
	});
}

var streamPost_withEmailSync = function (req,res) {
	req.session = req.session ? req.session : {};
	var PostImage = req.body.PostImage ? req.body.PostImage : "";
	var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

	var SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];
	var EmailEngineDataSets = req.body.EmailEngineDataSets ? req.body.EmailEngineDataSets : [];

	if(SurpriseSelectedTags.length < 2) {
		//return res.json({"code":"205", message : "No selected keywords found for blending ..."});
	}

	var results = req.body.finalMediaArr ? req.body.finalMediaArr : [];

	var BlendImage1 = null;
	var BlendImage2 = null;
	var SurpriseImagesFrequencyWise = [];
	var BlendMode = 'hard-light';
	console.log("results.length ======== ", results.length);

	if (results.length == 1) {
		//modify EmailEngineDataSets as per db schema requirement
		for(var i = 0; i < EmailEngineDataSets.length; i++) {
			var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
			EmailEngineDataSets[i].Delivered = false;
			EmailEngineDataSets[i].DateOfDelivery = getDateIncrementedBy(NoOfDays);
			EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
			EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
			EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
			EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
			if(!EmailEngineDataSets[i].VisualUrls.length) {
				BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

				BlendMode = 'hard-light';
				if(BlendImage1 && BlendImage2) {
					//assign blend mode
					BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
					BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'screen';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						BlendMode = 'darken';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'hard-light';
					}

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						var BlendImage1_bck = BlendImage1;
						BlendImage1 = BlendImage2;
						BlendImage2 = BlendImage1_bck;

						BlendMode = 'screen';
					}

				}
				EmailEngineDataSets[i].BlendMode = BlendMode ? BlendMode : 'hard-light';


				EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
				EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
			}
		}


		BlendMode = 'hard-light';
		//#week 1
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		if(BlendImage1 && BlendImage2) {
			//assign blend mode
			BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
			BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'screen';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				BlendMode = 'darken';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'hard-light';
			}

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				var BlendImage1_bck = BlendImage1;
				BlendImage1 = BlendImage2;
				BlendImage2 = BlendImage1_bck;

				BlendMode = 'screen';
			}

		}

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL,
				BlendMode : BlendMode
			}
		);

		//#week 2
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 3
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 4
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

	} else if ( results.length == 2 ) {
		//modify EmailEngineDataSets as per db schema requirement
		for(var i = 0; i < EmailEngineDataSets.length; i++) {

			var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
			EmailEngineDataSets[i].Delivered = false;
			EmailEngineDataSets[i].DateOfDelivery = getDateIncrementedBy(NoOfDays);
			EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
			EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
			EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
			EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
			if(!EmailEngineDataSets[i].VisualUrls.length) {
				//BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				//BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

				BlendImage1 = results[0].Medias[i+1] ? results[0].Medias[i+1] : results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				BlendImage2 = results[1].Medias[i+1] ? results[1].Medias[i+1] : results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

				BlendMode = 'hard-light';
				if(BlendImage1 && BlendImage2) {
					//assign blend mode
					BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
					BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'screen';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						BlendMode = 'darken';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'hard-light';
					}

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						var BlendImage1_bck = BlendImage1;
						BlendImage1 = BlendImage2;
						BlendImage2 = BlendImage1_bck;

						BlendMode = 'screen';
					}

				}
				EmailEngineDataSets[i].BlendMode = BlendMode ? BlendMode : 'hard-light';

				EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
				EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
			}
		}

		BlendMode = 'hard-light';
		//#week 1
		BlendImage1 = results[0].Medias[0] ? results[0].Medias[0] : results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[0] ? results[1].Medias[0] : results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		if(BlendImage1 && BlendImage2) {
			//assign blend mode
			BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
			BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'screen';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				BlendMode = 'darken';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'hard-light';
			}

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				var BlendImage1_bck = BlendImage1;
				BlendImage1 = BlendImage2;
				BlendImage2 = BlendImage1_bck;

				BlendMode = 'screen';
			}

		}

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL,
				BlendMode : BlendMode
			}
		);

		//#week 2
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 3
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 4
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);
	} else {
		return res.json({"code":"205", message : "No images found for blending ..."});
	}

	//return res.json({"code":"205", message : "We have found the required image data for surprise posts week wise --- In Progress ...", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});

	var PostImage1 = SurpriseImagesFrequencyWise[0].BlendImage1 ? SurpriseImagesFrequencyWise[0].BlendImage1 : PostImage;
	var PostImage2 = SurpriseImagesFrequencyWise[0].BlendImage2 ? SurpriseImagesFrequencyWise[0].BlendImage2 : PostImage;

	req.session.user = req.session.user ? req.session.user : {};
	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null,
		PostImage : PostImage,
		PostStatement : PostStatement ? PostStatement : '',
		PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
		ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
		SurpriseSelectedTags : SurpriseSelectedTags ? SurpriseSelectedTags : [],
		EmailEngineDataSets : EmailEngineDataSets ? EmailEngineDataSets : [],
		SyncedBy : req.session.user._id || req.body.SyncedBy,
		IsSurpriseCase : true,
		IsPageStreamCase : true,
		CapsuleId : req.body.CapsuleId ? req.body.CapsuleId : null,
		EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'PracticalThinker', //ImaginativeThinker, PracticalThinker
		Status : req.body.IsStreamPaused ? 0 : 1,
		EmailSubject : req.body.EmailSubject ? req.body.EmailSubject : null,
		IsOnetimeStream : req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false,
		IsOnlyPostImage : req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false
	};
	dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

	if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
		dataRecord.EmailEngineDataSets = addHexcode_blendedImage(dataRecord.EmailEngineDataSets);
		SyncedPost(dataRecord).save( function(err, data){
			if(err){
				res.json({"code":"204", message : "error1"});
			} else {

				if(!dataRecord.Status) {
					return res.json({"code":"200", message : "success"});
				}


				var condition = {};
				condition.name = "Surprise__Post";

				if(dataRecord.EmailTemplate == 'PracticalThinker') {
					condition.name = "Surprise__Post_2Image";
				}

				EmailTemplate.find(condition, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							var SoundFileUrl = '';
							//SoundFileUrl = 'https://cdn.muse.ai/w/ee6cec7f3f9483d54fb409a9babbcc21faaa9aa5d74cc98c0abebbc3e0641ad5/videos/video.mp4';
							if(SoundFileUrl) {
								SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls><source src="'+SoundFileUrl+'" type="video/mp4">Your email does not support the audio.</audio></em></p>';

								//SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls="controls"><source src="'+SoundFileUrl+'"><p>? Listen: <a href="'+SoundFileUrl+'" target="_blank">Play</a> (mp3)</p></audio></em></p>';
							}

							var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : (req.body.SyncedByName ? req.body.SyncedByName.split(' ')[0] : "");
							var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;

							var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
							newHtml = newHtml.replace(/{TextAboveVisual}/g, '');
							newHtml = newHtml.replace(/{TextBelowVisual}/g, '');
							newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
							newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
							newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
							newHtml = newHtml.replace(/{PostURL}/g, PostURL);
							newHtml = newHtml.replace(/{SoundFileUrl}/g, SoundFileUrl);
							newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
							newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');

							results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
							var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

							User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
								if (!err) {
									UserData = UserData ? UserData : [];
									var emails = [];
									for(var i = 0; i < UserData.length; i++) {
										var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
										var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
										emails.push(shareWithEmail);
										if(shareWithEmail) {
											sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
										}
									}

									if(emails.length != dataRecord.ReceiverEmails.length) {
										var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
										for(var i = 0; i < difference.length; i++) {
											var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
											var shareWithEmail = difference[i] ? difference[i] : null;

											if(shareWithEmail) {
												sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
											}
										}
									}
								}
							})
						}
					}
				});
				res.json({"code":"200", message : "success", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise, finalMediaArr : req.body.finalMediaArr, Set1 : reverse(req.body.subsetByRank), Set2 : reverse(req.body.subsetByRank2), Set1Obj : reverse(req.body.subsetByRankObj2), Set2Obj : reverse(req.body.subsetByRankObj22)});
			}
		});
	} else {
		res.json({"code":"204", message : "error2"});
	}

};

var streamPost_withEmailSync_v2 = async function (req,res) {
	req.session = req.session ? req.session : {};
	var PostImage = req.body.PostImage ? req.body.PostImage : "";
	var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

	var SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];
	var EmailEngineDataSets = req.body.EmailEngineDataSets ? req.body.EmailEngineDataSets : [];

	if(SurpriseSelectedTags.length < 2) {
		//return res.json({"code":"205", message : "No selected keywords found for blending ..."});
	}

	var results = req.body.finalMediaArr ? req.body.finalMediaArr : [];

	var BlendImage1 = null;
	var BlendImage2 = null;
	var SurpriseImagesFrequencyWise = [];
	var BlendMode = 'hard-light';
	console.log("results.length ======== ", results.length);

	var CreatedOn = req.body.CreatedOn ? req.body.CreatedOn : Date.now();
	var __StreamTYPE = req.body.StreamType ? req.body.StreamType : '';

	if (results.length == 1) {
		//modify EmailEngineDataSets as per db schema requirement
		for(var i = 0; i < EmailEngineDataSets.length; i++) {
			var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
			EmailEngineDataSets[i].Delivered = false;
			EmailEngineDataSets[i].DateOfDelivery = __StreamTYPE == 'Group' ? getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn) : getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn);
			EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
			EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
			EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
			EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
			if(!EmailEngineDataSets[i].VisualUrls.length) {
				BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

				BlendMode = 'hard-light';
				if(BlendImage1 && BlendImage2) {
					//assign blend mode
					BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
					BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'screen';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						BlendMode = 'darken';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'hard-light';
					}

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						var BlendImage1_bck = BlendImage1;
						BlendImage1 = BlendImage2;
						BlendImage2 = BlendImage1_bck;

						BlendMode = 'screen';
					}

				}
				EmailEngineDataSets[i].BlendMode = BlendMode ? BlendMode : 'hard-light';


				EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
				EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
			}
		}


		BlendMode = 'hard-light';
		//#week 1
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		if(BlendImage1 && BlendImage2) {
			//assign blend mode
			BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
			BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'screen';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				BlendMode = 'darken';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'hard-light';
			}

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				var BlendImage1_bck = BlendImage1;
				BlendImage1 = BlendImage2;
				BlendImage2 = BlendImage1_bck;

				BlendMode = 'screen';
			}

		}

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL,
				BlendMode : BlendMode
			}
		);

		//#week 2
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 3
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 4
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

	} else if ( results.length == 2 ) {
		//modify EmailEngineDataSets as per db schema requirement
		for(var i = 0; i < EmailEngineDataSets.length; i++) {

			var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
			EmailEngineDataSets[i].Delivered = false;
			EmailEngineDataSets[i].DateOfDelivery = getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn);
			EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
			EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
			EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
			EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
			if(!EmailEngineDataSets[i].VisualUrls.length) {
				//BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				//BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

				BlendImage1 = results[0].Medias[i+1] ? results[0].Medias[i+1] : results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
				BlendImage2 = results[1].Medias[i+1] ? results[1].Medias[i+1] : results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

				BlendMode = 'hard-light';
				if(BlendImage1 && BlendImage2) {
					//assign blend mode
					BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
					BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'screen';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						BlendMode = 'darken';
					}

					if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
						//both dark
						BlendMode = 'hard-light';
					}

					if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
						//both dark
						var BlendImage1_bck = BlendImage1;
						BlendImage1 = BlendImage2;
						BlendImage2 = BlendImage1_bck;

						BlendMode = 'screen';
					}

				}
				EmailEngineDataSets[i].BlendMode = BlendMode ? BlendMode : 'hard-light';

				EmailEngineDataSets[i].VisualUrls.push((BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL));
				EmailEngineDataSets[i].VisualUrls.push((BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL));
			}
		}

		BlendMode = 'hard-light';
		//#week 1
		BlendImage1 = results[0].Medias[0] ? results[0].Medias[0] : results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[0] ? results[1].Medias[0] : results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		if(BlendImage1 && BlendImage2) {
			//assign blend mode
			BlendImage1.Lightness = BlendImage1.Lightness ? parseFloat(BlendImage1.Lightness) : null;
			BlendImage2.Lightness = BlendImage2.Lightness ? parseFloat(BlendImage2.Lightness) : null;

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'screen';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				BlendMode = 'darken';
			}

			if(BlendImage1.Lightness > 0.5 && BlendImage2.Lightness < 0.5) {
				//both dark
				BlendMode = 'hard-light';
			}

			if(BlendImage1.Lightness < 0.5 && BlendImage2.Lightness > 0.5) {
				//both dark
				var BlendImage1_bck = BlendImage1;
				BlendImage1 = BlendImage2;
				BlendImage2 = BlendImage1_bck;

				BlendMode = 'screen';
			}

		}

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL,
				BlendMode : BlendMode
			}
		);

		//#week 2
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 3
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);

		//#week 4
		BlendImage1 = results[0].Medias[Math.floor(Math.random()*results[0].Medias.length)];
		BlendImage2 = results[1].Medias[Math.floor(Math.random()*results[1].Medias.length)];

		SurpriseImagesFrequencyWise.push(
			{
				BlendImage1 : BlendImage1.MediaURL ? BlendImage1.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage1.MediaURL2[0].URL,
				BlendImage2 : BlendImage2.MediaURL ? BlendImage2.MediaURL : "https://www.scrpt.com/assets/Media/img/600/"+BlendImage2.MediaURL2[0].URL
			}
		);
	} else {
		return res.json({"code":"205", message : "No images found for blending ..."});
	}

	//return res.json({"code":"205", message : "We have found the required image data for surprise posts week wise --- In Progress ...", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise});

	var PostImage1 = SurpriseImagesFrequencyWise[0].BlendImage1 ? SurpriseImagesFrequencyWise[0].BlendImage1 : PostImage;
	var PostImage2 = SurpriseImagesFrequencyWise[0].BlendImage2 ? SurpriseImagesFrequencyWise[0].BlendImage2 : PostImage;

	req.session.user = req.session.user ? req.session.user : {};
	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null,
		PostImage : PostImage,
		PostStatement : PostStatement ? PostStatement : '',
		PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
		ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
		SurpriseSelectedTags : SurpriseSelectedTags ? SurpriseSelectedTags : [],
		EmailEngineDataSets : EmailEngineDataSets ? EmailEngineDataSets : [],
		SyncedBy : req.session.user._id || req.body.SyncedBy,
		IsSurpriseCase : true,
		IsPageStreamCase : true,
		CapsuleId : req.body.CapsuleId ? req.body.CapsuleId : null,
		EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'PracticalThinker', //ImaginativeThinker, PracticalThinker
		Status : req.body.IsStreamPaused ? 0 : 1,
		CreatedOn : CreatedOn ? CreatedOn : Date.now(),
		EmailSubject : req.body.EmailSubject ? req.body.EmailSubject : null,
		IsOnetimeStream : req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false,
		IsOnlyPostImage : req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false,
		IsPrivateQuestionPost: req.body.IsPrivateQuestionPost ? req.body.IsPrivateQuestionPost : false
	};
	dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

	if(dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
		dataRecord.EmailEngineDataSets = addHexcode_blendedImage(dataRecord.EmailEngineDataSets);

        //save single record per schedule changes
        var tmpObj = Object.assign({}, dataRecord);
        var data = null;
		for(var jk = 0; jk < dataRecord.EmailEngineDataSets.length; jk++){
            tmpObj.EmailEngineDataSets = [Object.assign({}, dataRecord.EmailEngineDataSets[jk])];
            data = await SyncedPost(tmpObj).save();
        }
		var err = typeof data === 'object' ? false : true;
		if(err){
			res.json({"code":"204", message : "error1"});
		} else {

			if(!dataRecord.Status) {
				return res.json({"code":"200", message : "success"});
			}

			req.body.instantEmail = req.body.instantEmail ? req.body.instantEmail : false;
			if(!req.body.instantEmail) {
				return res.json({"code":"200", message : "success"});
			}

			var condition = {};
			condition.name = "Surprise__Post";

			if(dataRecord.EmailTemplate == 'PracticalThinker') {
				condition.name = "Surprise__Post_2Image";
			}

			EmailTemplate.find(condition, {}, function (err, results) {
				if (!err) {
					if (results.length) {
						var SoundFileUrl = '';
						//SoundFileUrl = 'https://cdn.muse.ai/w/ee6cec7f3f9483d54fb409a9babbcc21faaa9aa5d74cc98c0abebbc3e0641ad5/videos/video.mp4';
						if(SoundFileUrl) {
							SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls><source src="'+SoundFileUrl+'" type="video/mp4">Your email does not support the audio.</audio></em></p>';

							//SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls="controls"><source src="'+SoundFileUrl+'"><p>? Listen: <a href="'+SoundFileUrl+'" target="_blank">Play</a> (mp3)</p></audio></em></p>';
						}

						var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : (req.body.SyncedByName ? req.body.SyncedByName.split(' ')[0] : "");
						var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;

						PostImage1 = PostImage1.replace('/Media/img/300/', '/Media/img/600/');
						PostImage2 = PostImage2.replace('/Media/img/300/', '/Media/img/600/');

						var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
						newHtml = newHtml.replace(/{TextAboveVisual}/g, '');
						newHtml = newHtml.replace(/{TextBelowVisual}/g, '');
						newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
						newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
						newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
						newHtml = newHtml.replace(/{PostURL}/g, PostURL);
						newHtml = newHtml.replace(/{SoundFileUrl}/g, SoundFileUrl);
						newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
						newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');

						results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
						var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

						User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
							if (!err) {
								UserData = UserData ? UserData : [];
								var emails = [];
								for(var i = 0; i < UserData.length; i++) {
									var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
									var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
									emails.push(shareWithEmail);
									if(shareWithEmail) {
										sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
									}
								}

								if(emails.length != dataRecord.ReceiverEmails.length) {
									var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
									for(var i = 0; i < difference.length; i++) {
										var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
										var shareWithEmail = difference[i] ? difference[i] : null;

										if(shareWithEmail) {
											sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
										}
									}
								}
							}
						})
					}
				}
			});
			res.json({"code":"200", message : "success", SurpriseImagesFrequencyWise : SurpriseImagesFrequencyWise, finalMediaArr : req.body.finalMediaArr, Set1 : reverse(req.body.subsetByRank), Set2 : reverse(req.body.subsetByRank2), Set1Obj : reverse(req.body.subsetByRankObj2), Set2Obj : reverse(req.body.subsetByRankObj22)});
		}
	} else {
		res.json({"code":"204", message : "error2"});
	}

};

var streamPost = function (req, res) {
	req.body.CreatedOn = req.body.CreatedOn ? req.body.CreatedOn : Date.now();

	async_lib.parallel({
		mediaFromFirstSet: function(callback) {
			req.body.subsetByRank = req.body.subsetByRank ? req.body.subsetByRank : [];
			getMediaFromSet(req, callback);
			//callback(null, 'abc\n');
		},
		mediaFromSecondSet: function(callback) {
			req.body.subsetByRank2 = req.body.subsetByRank2 ? req.body.subsetByRank2 : [];
			getMediaFromSet2(req, callback);
		}
	}, function(err, results) {
		// results now equals to: results.mediaFromFirstSet: 'abc\n', results.mediaFromSecondSet: 'xyz\n'
		var MediaSet1 = results.mediaFromFirstSet.results ? results.mediaFromFirstSet.results : [];
		var MediaSet2 = results.mediaFromSecondSet.results ? results.mediaFromSecondSet.results : [];

		var finalMediaArr = [];
		if(MediaSet1.length) {
			var tempArr = [];
			for(var i = 0; i < MediaSet1.length; i++ ) {
				var record = MediaSet1[i];
				tempArr.push({
					"MediaURL" : record.value.thumbnail,
					"MediaURL2" : record.value.Location,
					"MediaId" : record.value._id,
					"MediaType" : record.value.MediaType,
					"LinkType" : record.value.LinkType,
					"Prompt" : record.value.Prompt,
					"Ranks" : record.value.Ranks,
					"Lightness" : record.value.Lightness ? record.value.Lightness : null,
					"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null
				});
			}


			finalMediaArr.push({
				"Medias" : tempArr
			});
		}

		if(MediaSet2.length) {
			var tempArr = [];
			for(var i = 0; i < MediaSet2.length; i++ ) {
				var record = MediaSet2[i];
				tempArr.push({
					"MediaURL" : record.value.thumbnail,
					"MediaURL2" : record.value.Location,
					"MediaId" : record.value._id,
					"MediaType" : record.value.MediaType,
					"LinkType" : record.value.LinkType,
					"Prompt" : record.value.Prompt,
					"Ranks" : record.value.Ranks,
					"Lightness" : record.value.Lightness ? record.value.Lightness : null,
					"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null
				});
			}


			finalMediaArr.push({
				"Medias" : tempArr
			});
		}

		req.body.finalMediaArr = finalMediaArr;
		console.log("---------------------------------I AM HERE--------------------------------------------");
		//res.json({"code":"200", message : "success", finalMediaArr : req.body.finalMediaArr});

		streamPost_withEmailSync_v2(req, res);

	});
}


var streamPage__WithSelectedBlendCase = async function (req, res) {
	req.session = req.session ? req.session : {};
	var PostImage = req.body.PostImage ? req.body.PostImage : "";
	var PostStatement = req.body.PostStatement ? req.body.PostStatement : "";

	var SurpriseSelectedTags = req.body.SurpriseSelectedTags ? req.body.SurpriseSelectedTags : [];
	var EmailEngineDataSets = req.body.EmailEngineDataSets ? req.body.EmailEngineDataSets : [];

	var results = req.body.finalMediaArr ? req.body.finalMediaArr : [];

	var BlendImage1 = null;
	var BlendImage2 = null;
	var SurpriseImagesFrequencyWise = [];
	var BlendMode = 'hard-light';

	var CreatedOn = req.body.CreatedOn ? req.body.CreatedOn : Date.now();
	var __StreamTYPE = req.body.StreamType ? req.body.StreamType : '';

	for(var i = 0; i < EmailEngineDataSets.length; i++) {
		var NoOfDays = EmailEngineDataSets[i].AfterDays ? parseInt(EmailEngineDataSets[i].AfterDays) : 0;
		EmailEngineDataSets[i].Delivered = false;
		EmailEngineDataSets[i].DateOfDelivery = __StreamTYPE == 'Group' ? getDateIncrementedBy_CreatedOn_GroupStream(NoOfDays, CreatedOn) : getDateIncrementedBy_CreatedOn(NoOfDays, CreatedOn);
		EmailEngineDataSets[i].VisualUrls = EmailEngineDataSets[i].VisualUrls ? EmailEngineDataSets[i].VisualUrls : [];
		EmailEngineDataSets[i].TextAboveVisual = EmailEngineDataSets[i].TextAboveVisual ? EmailEngineDataSets[i].TextAboveVisual : "";
		EmailEngineDataSets[i].TextBelowVisual = EmailEngineDataSets[i].TextBelowVisual ? EmailEngineDataSets[i].TextBelowVisual : '';
		EmailEngineDataSets[i].SoundFileUrl = EmailEngineDataSets[i].SoundFileUrl ? EmailEngineDataSets[i].SoundFileUrl : null;
		EmailEngineDataSets[i].BlendMode = EmailEngineDataSets[i].BlendMode ? EmailEngineDataSets[i].BlendMode : 'hard-light';
		EmailEngineDataSets[i].SelectedKeywords = EmailEngineDataSets[i].SelectedKeywords ? EmailEngineDataSets[i].SelectedKeywords : [];
	}

	var PostImage1 = EmailEngineDataSets[0].VisualUrls.length == 2 ? EmailEngineDataSets[0].VisualUrls[0] : PostImage;
	var PostImage2 = EmailEngineDataSets[0].VisualUrls.length == 2 ? EmailEngineDataSets[0].VisualUrls[1] : PostImage;
	BlendMode = EmailEngineDataSets[0].BlendMode ? EmailEngineDataSets[0].BlendMode : 'hard-light';


	req.session.user = req.session.user ? req.session.user : {};
	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null,
		PostImage : PostImage,
		PostStatement : PostStatement ? PostStatement : '',
		PostOwnerId : req.body.PostOwnerId ? req.body.PostOwnerId : null,
		ReceiverEmails : req.body.ReceiverEmails ? req.body.ReceiverEmails : [],
		SurpriseSelectedTags : SurpriseSelectedTags ? SurpriseSelectedTags : [],
		EmailEngineDataSets : EmailEngineDataSets ? EmailEngineDataSets : [],
		SyncedBy : req.session.user._id || req.body.SyncedBy,
		IsSurpriseCase : true,
		IsPageStreamCase : true,
		CapsuleId : req.body.CapsuleId ? req.body.CapsuleId : null,
		EmailTemplate : req.body.EmailTemplate ? req.body.EmailTemplate : 'PracticalThinker', //ImaginativeThinker, PracticalThinker
		Status : req.body.IsStreamPaused ? 0 : 1,
		CreatedOn : CreatedOn,
		EmailSubject : req.body.EmailSubject ? req.body.EmailSubject : null,
		IsOnetimeStream : req.body.IsOnetimeStream ? req.body.IsOnetimeStream : false,
		IsOnlyPostImage : req.body.IsOnlyPostImage ? req.body.IsOnlyPostImage : false,
		IsPrivateQuestionPost : req.body.IsPrivateQuestionPost ? req.body.IsPrivateQuestionPost : false
	};
	dataRecord.ReceiverEmails = typeof dataRecord.ReceiverEmails == 'object' ? dataRecord.ReceiverEmails : [];

	if(dataRecord.CapsuleId && dataRecord.PageId && dataRecord.PostId && dataRecord.PostOwnerId && dataRecord.ReceiverEmails.length) {
		dataRecord.EmailEngineDataSets = addHexcode_blendedImage(dataRecord.EmailEngineDataSets);
		//save single record per schedule changes
        var tmpObj = Object.assign({}, dataRecord);
		for(var jk = 0; jk < dataRecord.EmailEngineDataSets.length; jk++){
            tmpObj.EmailEngineDataSets = [Object.assign({}, dataRecord.EmailEngineDataSets[jk])];
			data = await SyncedPost(tmpObj).save();
		}
		//save single record per schedule changes
		var err = typeof data === 'object' ? false : true;
		if(err){
			res.json({"code":"204", message : "error1"});
		} else {
			if(!dataRecord.Status) {
				console.log("----------- DONE without Email --------------------");
				return res.json({"code":"200", message : "success"});
			}

			req.body.instantEmail = req.body.instantEmail ? req.body.instantEmail : false;
			/*
			if(dataRecord.ReceiverEmails[0] == "manishpodiyal@gmail.com") {
				req.body.instantEmail = true;
			}
			*/
			if(!req.body.instantEmail) {
				return res.json({"code":"200", message : "success"});
			}

			var condition = {};
			condition.name = "Surprise__Post";

			if(dataRecord.EmailTemplate == 'PracticalThinker') {
				condition.name = "Surprise__Post_2Image";
			}

			EmailTemplate.find(condition, {}, function (err, results) {
				if (!err) {
					if (results.length) {
						var SoundFileUrl = '';
						//SoundFileUrl = 'https://cdn.muse.ai/w/ee6cec7f3f9483d54fb409a9babbcc21faaa9aa5d74cc98c0abebbc3e0641ad5/videos/video.mp4';
						if(SoundFileUrl) {
							SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls><source src="'+SoundFileUrl+'" type="video/mp4">Your email does not support the audio.</audio></em></p>';

							//SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><audio controls="controls"><source src="'+SoundFileUrl+'"><p>? Listen: <a href="'+SoundFileUrl+'" target="_blank">Play</a> (mp3)</p></audio></em></p>';
						}

						var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : (req.body.SyncedByName ? req.body.SyncedByName.split(' ')[0] : "");
						var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;
						PostImage1 = PostImage1.replace('/Media/img/300/', '/Media/img/600/');
						PostImage2 = PostImage2.replace('/Media/img/300/', '/Media/img/600/');

						var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
						newHtml = newHtml.replace(/{TextAboveVisual}/g, '');
						newHtml = newHtml.replace(/{TextBelowVisual}/g, '');
						newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
						newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
						newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
						newHtml = newHtml.replace(/{PostURL}/g, PostURL);
						newHtml = newHtml.replace(/{SoundFileUrl}/g, SoundFileUrl);
						newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
						newHtml = newHtml.replace(/{PublisherName}/g, 'The Scrpt Co.');
						results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
						var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

						User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true }, function (err, UserData) {
							if (!err) {
								UserData = UserData ? UserData : [];
								var emails = [];
								for(var i = 0; i < UserData.length; i++) {
									var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
									var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
									emails.push(shareWithEmail);
									if(shareWithEmail) {
										sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
									}
								}

								if(emails.length != dataRecord.ReceiverEmails.length) {
									var difference = dataRecord.ReceiverEmails.filter(x => emails.indexOf(x) === -1);
									for(var i = 0; i < difference.length; i++) {
										var RecipientName = difference[i] ? difference[i].split('@')[0] : "";
										var shareWithEmail = difference[i] ? difference[i] : null;

										if(shareWithEmail) {
											sendSyncEmail(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject);
										}
									}
								}
							}
						})
					}
				}
			});
			res.json({"code":"200", message : "success"});
		}
	} else {
		res.json({"code":"204", message : "error2"});
	}
}


var getBlendImages = async function (req, res) {
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	req.session.user.onlyunsplash = req.session.user.onlyunsplash ? req.session.user.onlyunsplash : false;
	req.session.user.onlyenablers = req.session.user.onlyenablers ? req.session.user.onlyenablers : false;

	var keywords = req.body.SurpriseSelectedWords ? req.body.SurpriseSelectedWords : [];
	var PostStatement = req.body.PostStatement || '';
	var PostStreamType = req.body.PostStreamType || '';

	async_lib.parallel({
		mediaFromFirstSet: function(callback) {
			req.body.subsetByRank = req.body.subsetByRank ? req.body.subsetByRank : [];
			getMediaFromSet(req, callback);
			//callback(null, 'abc\n');
		},
		mediaFromSecondSet: function(callback) {
			req.body.subsetByRank2 = req.body.subsetByRank2 ? req.body.subsetByRank2 : [];
			if(PostStreamType === '1UnsplashPost') {
				(function () {
					const returnObj = {
						"results":[]
					};
					callback(null, returnObj);
				}());
			} else {
				getMediaFromSet2(req, callback);
			}
		}
	}, async function(err, results) {
		// results now equals to: results.mediaFromFirstSet: 'abc\n', results.mediaFromSecondSet: 'xyz\n'
		var MediaSet1 = results.mediaFromFirstSet.results ? results.mediaFromFirstSet.results : [];
		var MediaSet2 = results.mediaFromSecondSet.results ? results.mediaFromSecondSet.results : [];

		//get all prior selected blend images of this post.
		var conditions = {
			PageId : req.body.PageId ? req.body.PageId : null,
			PostId : req.body.PostId ? req.body.PostId : null
		};
		var SavedStreamData = await PageStream.findOne(conditions);
		SavedStreamData = SavedStreamData ? SavedStreamData : null;

		var alreadySelectedBlends = [];
		if(SavedStreamData) {
			alreadySelectedBlends = SavedStreamData.SelectedBlendImages ? SavedStreamData.SelectedBlendImages : [];
		}

		var finalMediaArr = [];

		var MediaSet1Length = MediaSet1.length;
		var MediaSet2Length = MediaSet2.length;

		var tempArr = [];

		var rankObj = {};
		var noOfMediaPerRankLimit = 500;
		for(var i = 0; i < MediaSet1Length; i++ ) {
			var record = MediaSet1[i];

			rankObj['rank_'+record.value.Ranks] = rankObj['rank_'+record.value.Ranks] ? rankObj['rank_'+record.value.Ranks] : [];
			if(rankObj['rank_'+record.value.Ranks].length >= noOfMediaPerRankLimit) {
				continue;
			}

			tempArr.push({
				"MediaURL" : record.value.thumbnail,
				"MediaURL2" : record.value.Location,
				"MediaId" : record.value._id,
				"MediaType" : record.value.MediaType,
				"LinkType" : record.value.LinkType,
				"Prompt" : record.value.Prompt,
				"Ranks" : record.value.Ranks,
				"Lightness" : record.value.Lightness ? record.value.Lightness : null,
				"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null,
				"SelectedGtTitle" : record.value.SelectedGtTitle ? record.value.SelectedGtTitle : '',
				"SecondaryKeywords" : record.value.SecondaryKeywords ? record.value.SecondaryKeywords : [],
				"SecondaryKeywordsCount" : record.value.SecondaryKeywordsCount ? record.value.SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap" : record.value.SecondaryKeywordsMap ? record.value.SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount" : record.value.MediaSelectionCriteriaCount ? record.value.MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr" : record.value.MediaSelectionCriteriaArr ? record.value.MediaSelectionCriteriaArr : [],
				"MetaData" : record.value.MetaData ? record.value.MetaData : {},
				"AllMetaData" : record.value.AllMetaData ? record.value.AllMetaData : {}
			});

			rankObj['rank_'+record.value.Ranks].push(record.value._id);

			if(tempArr.length >= 250) {
				break;
			}
		}


		finalMediaArr.push({
			"Medias" : tempArr
		});


		tempArr = [];
		var rankObj2 = {};
		noOfMediaPerRankLimit = 500;

		if(PostStreamType === '1UnsplashPost') {
			//reset MediaSet2, MediaSet2Length and noOfMediaPerRankLimit
			MediaSet2Length = MediaSet1Length;
			noOfMediaPerRankLimit = MediaSet2Length;
			MediaSet2 = [];
			
			for(var i = 0; i < MediaSet2Length; i++ ) {
				MediaSet2.push({
					value: {
						Ranks: 1,
						thumbnail: null,
						Location: [{
							URL: '09182022204653_35889.png'
						}],
						_id: null,
						MediaType: 'Image',
						LinkType: null,
						Prompt: ''

					}
				});
			}
		}

		for(var i = 0; i < MediaSet2Length; i++ ) {
			var record = MediaSet2[i];

			rankObj2['rank_'+record.value.Ranks] = rankObj2['rank_'+record.value.Ranks] ? rankObj2['rank_'+record.value.Ranks] : [];
			if(rankObj2['rank_'+record.value.Ranks].length >= noOfMediaPerRankLimit) {
				continue;
			}

			tempArr.push({
				"MediaURL" : record.value.thumbnail,
				"MediaURL2" : record.value.Location,
				"MediaId" : record.value._id,
				"MediaType" : record.value.MediaType,
				"LinkType" : record.value.LinkType,
				"Prompt" : record.value.Prompt,
				"Ranks" : record.value.Ranks,
				"Lightness" : record.value.Lightness ? record.value.Lightness : null,
				"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null,
				"SelectedGtTitle" : record.value.SelectedGtTitle ? record.value.SelectedGtTitle : '',
				"SecondaryKeywords" : record.value.SecondaryKeywords ? record.value.SecondaryKeywords : [],
				"SecondaryKeywordsCount" : record.value.SecondaryKeywordsCount ? record.value.SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap" : record.value.SecondaryKeywordsMap ? record.value.SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount" : record.value.MediaSelectionCriteriaCount ? record.value.MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr" : record.value.MediaSelectionCriteriaArr ? record.value.MediaSelectionCriteriaArr : [],
				"MetaData" : record.value.MetaData ? record.value.MetaData : {},
				"AllMetaData" : record.value.AllMetaData ? record.value.AllMetaData : {}
			});

			rankObj2['rank_'+record.value.Ranks].push(record.value._id);

			if(tempArr.length >= 250) {
				break;
			}
		}


		finalMediaArr.push({
			"Medias" : tempArr
		});

		var set1 = finalMediaArr[0].Medias ? finalMediaArr[0].Medias : [];
		var set2 = finalMediaArr[1].Medias ? finalMediaArr[1].Medias : [];
		var selectedIndexes = [];
		var selectedLengthForLoop = (set1.length > set2.length) ? set2.length : set1.length;
		for(var loop = 0; loop < selectedLengthForLoop; loop++) {
			var blendImage1 = set1[loop].MediaURL ? set1[loop].MediaURL : "https://www.scrpt.com/assets/Media/img/300/" + set1[loop].MediaURL2[0].URL;
			var blendImage2 = set2[loop].MediaURL ? set2[loop].MediaURL : "https://www.scrpt.com/assets/Media/img/300/" + set2[loop].MediaURL2[0].URL;

			finalMediaArr[0].Medias[loop].isSelected = false;
			finalMediaArr[1].Medias[loop].isSelected = false;
			for(var loop2 = 0; loop2 < alreadySelectedBlends.length; loop2++) {
				var savedData = alreadySelectedBlends[loop2];
				savedData.Keywords = savedData.Keywords ? savedData.Keywords : [];
				if(blendImage1 == savedData.blendImage1 && blendImage2 == savedData.blendImage2) {
					finalMediaArr[0].Medias[loop].blendMode = savedData.blendMode ? savedData.blendMode : null;
					finalMediaArr[1].Medias[loop].blendMode = savedData.blendMode ? savedData.blendMode : null;

					finalMediaArr[0].Medias[loop].isSelected = true;
					finalMediaArr[1].Medias[loop].isSelected = true;

					finalMediaArr[0].Medias[loop].SelectedGtTitle = savedData.Keywords.length >= 2 ? savedData.Keywords[0] : null;
					finalMediaArr[1].Medias[loop].SelectedGtTitle = savedData.Keywords.length >= 2 ? savedData.Keywords[1] : null;

					selectedIndexes.push(loop2);
					break;
				}
			}
		}

		req.body.finalMediaArr = finalMediaArr;

		//remaining saved blends
		var remainingSelectedBlends = [];
		for(var loop2 = 0; loop2 < alreadySelectedBlends.length; loop2++) {
			var savedData = alreadySelectedBlends[loop2];
			if(selectedIndexes.indexOf(loop2) < 0) {
				remainingSelectedBlends.push(savedData);
			}
		}

		res.json({
			"code":"200",
			message : "success",
			finalMediaArr : req.body.finalMediaArr,
			//rankObj: rankObj,
			//rankObj2: rankObj2,
			alreadySelectedBlends : alreadySelectedBlends,
			remainingSelectedBlends : remainingSelectedBlends,
			//keyword1_familyset : req.body.subsetByRankObj2,
			//keyword2_familyset : req.body.subsetByRankObj22,
			//aggregateStages : results.mediaFromFirstSet.aggregateStages
		});

		//streamPost_withEmailSync(req, res);

	});
}

var updateLightnessScore = async function (req, res) {
	var inputArr = [{
		"_id": "66da1726f498fc6e6d0a99ce",
		"Lightness": 0.193632118
	  },
	  {
		"_id": "66da172d77b2646e7391f7ef",
		"Lightness": 0.17679021
	  }];
	//return;
	try {
		let successCounter = 0;
		for(var i = 0; i < inputArr.length; i++) {
			var mediaObj = inputArr[i];

			var conditions = { _id : ObjectId(mediaObj._id) };
			var setObj = {
				Lightness : mediaObj.Lightness ? mediaObj.Lightness : "0",
			}
			var options = { multi : false };
			let result = await Media.update(conditions, {$set : setObj}, options);
			result = result || {};
			result.ok = result.ok || 0;
			if(result.ok) {
				successCounter++
			}
		}
		console.log(`${successCounter} records updated seccessfully.`);
		return res.json({status: 'success', message : `${successCounter} records updated successfully.`});
	} catch (err) {
		console.log(err);
		return res.json({status: 'failed', message : `No records updated.`});
	}
}

var savePostStreamConfig = function (req, res) {
	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null,
		SelectedBlendImages : req.body.SelectedBlendImages ? req.body.SelectedBlendImages : []
	};

	if(dataRecord.PageId && dataRecord.PostId) {
		var conditions = {
			PageId : dataRecord.PageId,
			PostId : dataRecord.PostId
		}
		PageStream.update(conditions, {$set : dataRecord}, {upsert : true}, function(err, data){
			if(err){
				res.json({"code":"204", message : "error1"});
			} else {
				res.json({"code":"200", message : "success"});
			}
		});
	} else {
		res.json({"code":"204", message : "error1"});
	}
}

var getUserStreamsStats = async function (req, res) {
	//get all streams where login user has been invited
	var InvitedInResult = await StreamMembers.find({Members : ObjectId(req.session.user._id)}, {StreamId : 1});
	InvitedInResult = Array.isArray(InvitedInResult) ? InvitedInResult : [];

	var InvitedInStreamIds = [];
	for(var i = 0; i < InvitedInResult.length; i++) {
		InvitedInStreamIds.push(ObjectId(InvitedInResult[i].StreamId));
	}

	//console.log("InvitedInStreamIds - ", InvitedInStreamIds);
	var conditions = {
		"$or" : [
			{
				PurchasedBy : {$exists : false},
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				IsSurpriseGift : {$exists : false}
			},
			{
				PurchasedBy : req.session.user._id,
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				//IsSurpriseGift : {$exists : false}
			},
			{
				PurchasedBy : {$exists : false},
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				IsSurpriseGift : false
			},
			{
				PurchasedBy : {$ne : req.session.user._id},
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				IsSurpriseGift : true
			},
			{
				PurchasedBy : req.session.user._id,
				OwnerId : {$ne : req.session.user._id},
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				IsSurpriseGift : true
			},
			{
				PurchasedBy : {$ne : req.session.user._id},
				OwnerId : req.session.user._id,
				Origin : "published",
				IsPublished : true,
				"LaunchSettings.Audience":"ME",
				"LaunchSettings.CapsuleFor" : "Stream",
				IsSurpriseGift : false
			},
			{
				CreaterId : req.session.user._id,
				OwnerId : req.session.user._id,
				"LaunchSettings.Audience":"CELEBRITY",
				"LaunchSettings.CapsuleFor":"Stream",
				"LaunchSettings.StreamType":"Group"
			}
		],
		Status : true,
		IsDeleted : false
	};

	if(InvitedInStreamIds.length) {
		conditions["$or"].push({
			_id : { $in : InvitedInStreamIds }
		});
	}

	var fields = {};
	var sortObj = {
		_id : 1,
		Order: 1,
		ModifiedOn: -1
	};
	var results = await Capsule.find(conditions , fields).populate('OwnerId').populate('PurchasedBy').sort(sortObj).lean();
	results = results ? results : [];

	var finalResults = [];
	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	if( results.length ){
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!--------------------- results.length ====== ", results.length);
		for( var loop = 0; loop < results.length; loop++ ){
			//var CreaterDetails = typeof results[loop].CreaterId == 'object' ? results[loop].CreaterId : {};
			var OwnerDetails = typeof results[loop].OwnerId == 'object' ? results[loop].OwnerId : {};
			var PurchasedByObj = typeof results[loop].PurchasedBy == 'object' ? results[loop].PurchasedBy : {};

			//results[loop].CreaterName = OwnerDetails.Name ? OwnerDetails.Name : '';
			//results[loop].CreaterId = OwnerDetails._id ? OwnerDetails._id : '';
			//results[loop].CreaterProfilePic = OwnerDetails.ProfilePic ? OwnerDetails.ProfilePic : '';
			results[loop].TitleOriginal = results[loop].Title || '';
			results[loop].OwnerName = OwnerDetails.Name ? OwnerDetails.Name : '';
			results[loop].OwnerId = OwnerDetails._id ? OwnerDetails._id : '';
			results[loop].OwnerProfilePic = OwnerDetails.ProfilePic ? OwnerDetails.ProfilePic : '';
			results[loop].OwnerBirthdate = OwnerDetails.Birthdate ? OwnerDetails.Birthdate : '';
			results[loop].OwnerReferralCode = OwnerDetails.referralCode ? OwnerDetails.referralCode : '';

			results[loop].PurchasedByName = PurchasedByObj.Name ? PurchasedByObj.Name : '';
			results[loop].PurchasedBy = PurchasedByObj._id ? PurchasedByObj._id : '';
			results[loop].PurchasedByProfilePic = PurchasedByObj.ProfilePic ? PurchasedByObj.ProfilePic : '';


			results[loop].LaunchSettings.StreamType = results[loop].LaunchSettings.StreamType ? results[loop].LaunchSettings.StreamType : '';
			results[loop].IsSurpriseGift = results[loop].IsSurpriseGift ? results[loop].IsSurpriseGift : false;

			if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId != String(req.session.user._id)) {
				results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
				if(results[loop].IsSurpriseGift) {
					if(String(results[loop].PurchasedBy) == String(req.session.user._id)) {
						//results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title+ " (Surprise Gift)";
						results[loop].Title = results[loop].Title+ " (Surprise Gift)";

						let todayYear = todayEnd.getFullYear();
						let todayTimestamp = todayEnd.getTime();

						OwnerDetails.Birthdate = OwnerDetails.Birthdate ? OwnerDetails.Birthdate : null;
						if(!OwnerDetails.Birthdate) {
							//continue;
						} else {
							let OwnerBirthdate = new Date(OwnerDetails.Birthdate);
							OwnerBirthdate.setFullYear(todayYear);

							let OBTimestamp = OwnerBirthdate.getTime();

							if(parseInt(todayTimestamp) >= parseInt(OBTimestamp)) {
								//continue;
							}
						}
					} else {

						//continue;
					}
				} else {
					if(!results[loop].LaunchSettings.Audience == "CELEBRITY") {
						results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
					}
				}
			}


			if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(req.session.user._id) && !results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != '' && String(results[loop].PurchasedBy) != String(req.session.user._id)) {
				results[loop].Title = results[loop].Title;// + " (Gifted by "+ results[loop].PurchasedByName.split(' ')[0]+")";
				results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
				results[loop].MetaData.StickerTextOwner = "Gifted by "+results[loop].PurchasedByName.split(' ')[0];
			}

			if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(req.session.user._id) && results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != '' && String(results[loop].PurchasedBy) != String(req.session.user._id)) {
				results[loop].Title = results[loop].Title + " (Surprise from "+ results[loop].PurchasedByName.split(' ')[0]+")";

				let todayYear = todayEnd.getFullYear();
				let todayTimestamp = todayEnd.getTime();

				req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
				if(!req.session.user.Birthdate) {
					//continue;
				} else {
					let OwnerBirthdate = new Date(req.session.user.Birthdate);
					OwnerBirthdate.setFullYear(todayYear);
					let OBTimestamp = OwnerBirthdate.getTime();

					if(todayTimestamp < OBTimestamp) {
						//continue;
					}
				}
			}

			var CapsuleId = results[loop]._id;
			var UserEmail = req.session.user.Email ? req.session.user.Email : null;
			var StreamOpenedEmailCount = 0;
			var ConversationCount = 0;
			if(CapsuleId && UserEmail) {
				var conditions = {
					CapsuleId : CapsuleId,
					UserEmail : UserEmail
				};

				StreamOpenedEmailCount = await StreamEmailTracker.find(conditions, {}).count();
				StreamOpenedEmailCount = StreamOpenedEmailCount ? StreamOpenedEmailCount : 0;

				var StreamConversation_conditions = {
					CapsuleId : CapsuleId ? CapsuleId : null,
					UserId : req.session.user._id ? req.session.user._id : null
				};
				var result = await StreamConversation.findOne(StreamConversation_conditions, {});
				result = result ? result : {};
				result.ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
				if(result.ConversationCount) {
					ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
				}
			}
			results[loop].StreamOpenedEmailCount = StreamOpenedEmailCount;
			results[loop].ConversationCount = ConversationCount;

			if(results[loop].LaunchSettings.Audience == "CELEBRITY" && results[loop].OwnerId == String(req.session.user._id)) {
				results[loop].Title = results[loop].Title + ' (For Celebrities)';
			} else if (results[loop].LaunchSettings.Audience == "CELEBRITY" && results[loop].OwnerId != String(req.session.user._id)) {
				results[loop].Title = results[loop].Title + ' (Invited as Celebrity)';
			}

			finalResults.push(results[loop]);
		}

		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!--------------------- finalResults.length ====== ", finalResults.length);
	}
	res.json({code : "200", results : finalResults});
}


var addConversation = async function (req, res) {
	var conditions = {
		CapsuleId : req.body.capsuleId ? ObjectId(req.body.capsuleId) : null,
		UserId : req.session.user._id ? req.session.user._id : null
	};

	var result = await StreamConversation.findOne(conditions, {}).lean();
	result = result ? result : {};
	result.ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
	var dataRecord = {
		CapsuleId : req.body.capsuleId ? ObjectId(req.body.capsuleId) : null,
		UserId : req.session.user._id ? req.session.user._id : null,
		ConversationCount : 1
	};
	if(result.ConversationCount) {
		dataRecord.ConversationCount = (result.ConversationCount + 1);
	}
	var updateResult = await StreamConversation.update(conditions, {$set : dataRecord}, {upsert : true});
	updateResult = updateResult ? updateResult : null;
	if(updateResult) {
		res.json({code : "200", ConversationCount : dataRecord.ConversationCount});
	} else {
		res.json({code : "204"});
	}
};

var minusConversation = async function (req, res) {
	var conditions = {
		CapsuleId : req.body.capsuleId ? ObjectId(req.body.capsuleId) : null,
		UserId : req.session.user._id ? req.session.user._id : null
	};

	var result = await StreamConversation.findOne(conditions, {});
	result = result ? result : {};
	result.ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
	var dataRecord = {
		CapsuleId : req.body.capsuleId ? ObjectId(req.body.capsuleId) : null,
		UserId : req.session.user._id ? req.session.user._id : null,
		ConversationCount : 0
	};
	if(result.ConversationCount) {
		dataRecord.ConversationCount = (result.ConversationCount - 1);
	}
	var updateResult = await StreamConversation.update(conditions, {$set : dataRecord}, {upsert : true});
	updateResult = updateResult ? updateResult : null;
	if(updateResult) {
		res.json({code : "200", ConversationCount : dataRecord.ConversationCount});
	} else {
		res.json({code : "204"});
	}
};

var savePostStreamKeywords = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;
	var SurpriseSelectedWords = req.body.SurpriseSelectedWords ? req.body.SurpriseSelectedWords : [];

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {};
	if(SurpriseSelectedWords.length == 2) {
		setObj = {
			$set : {
				"Medias.$.SurpriseSelectedWords" : SurpriseSelectedWords.join()
			}
		};
	} else {
		var response = {
			status: 501,
			message: "Wrong input."
		}
		return res.json(response);
	}

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post stream keywords updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var setmysession = function (req, res) {
	console.log("req.query ---- ", req.query);
	req.session.user = typeof req.session.user == 'object' ? req.session.user : null;
	if(!req.session.user) {
		return res.send("Not Authenticated. Please login to change your settings.");
	}

	req.query.onlyunsplash = req.query.onlyunsplash ? req.query.onlyunsplash : null;
	req.query.onlyenablers = req.query.onlyenablers ? req.query.onlyenablers : null;

	if(req.query.onlyunsplash == null && req.query.onlyenablers == null) {
		return res.json({message : "Settings have been saved successfully. you can set your page stream now.", settings : {onlyunsplash : req.session.user.onlyunsplash, onlyenablers : req.session.user.onlyenablers}});
	}
	var onlyunsplash = (req.query.onlyunsplash == 'true') ? true : false;
	var onlyenablers = (req.query.onlyenablers == 'true') ? true : false;

	req.session.user.onlyunsplash = onlyunsplash;
	req.session.user.onlyenablers = onlyenablers;
	return res.json({message : "Settings have been saved successfully. you can set your page stream now.", settings : {onlyunsplash : onlyunsplash, onlyenablers : onlyenablers}});
}


function generateBlendImage (blendImage1, blendImage2, blendOption, uploadDir, file_name) {
	var downloadFileSrc1 = null;
	var downloadFileSrc2 = null;
	if(blendImage1 && blendImage2 && blendOption){
		if(blendImage1.indexOf('unsplash.com') == -1){
			blendImage1 = blendImage1.replace('../','');
			blendImage1 = blendImage1.replace('/100/','/600/');
			blendImage1 = blendImage1.replace('/300/','/600/');
			blendImage1 = blendImage1.replace('/aspectfit/','/600/');
			blendImage1 = blendImage1.replace('/aspectfit_small/','/600/');
			blendImage1 = blendImage1.replace('https://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('http://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('https://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('http://www.scrpt.com', '');
			blendImage1 = __dirname + "/../../public/"+blendImage1;
			nextStep_1();
		}
		else{
			blendImage1 = blendImage1.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';

			downloadFileSrc1 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage1_"+file_name.replace('png' , 'jpg');

			var commandToDownload = "curl -o "+downloadFileSrc1+" "+blendImage1;
			commandToDownload = commandToDownload.replace('https://','http://');
			//console.log("commandToDownload 1 = ",commandToDownload);
			exec(commandToDownload, function (error, stdout, stderr) {
				if (stdout) console.log(stdout);
				if (stderr) console.log(stderr);

				if (error) {
					console.log('exec error: ' + error);
				} else {
					im.crop({
						srcPath: downloadFileSrc1,
						dstPath: downloadFileSrc1,
						width: 600,
						height: 600,
						quality: 1,
						gravity: "Center"
					}, function(err, stdout, stderr){
						if (err){
							console.log("Caught Error 1 --- ", err);
							console.log("commandToDownload -------------- ", commandToDownload);
							//throw err;
						}else{
							blendImage1 = downloadFileSrc1;
							nextStep_1();
						}
					});
				}
			});

		}

		function nextStep_1() {
			if(blendImage2.indexOf('unsplash.com') == -1){
				blendImage2 = blendImage2.replace('../','');
				blendImage2 = blendImage2.replace('/100/','/600/');
				blendImage2 = blendImage2.replace('/300/','/600/');
				blendImage2 = blendImage2.replace('/aspectfit/','/600/');
				blendImage2 = blendImage2.replace('/aspectfit_small/','/600/');
				blendImage2 = blendImage2.replace('https://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('http://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('https://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('http://www.scrpt.com', '');
				blendImage2 = __dirname + "/../../public/"+blendImage2;
				nextStep_2();
			}
			else{

				blendImage2 = blendImage2.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';

				downloadFileSrc2 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage2_"+file_name.replace('png' , 'jpg');

				var commandToDownload = "curl -o "+downloadFileSrc2+" "+blendImage2;
				commandToDownload = commandToDownload.replace('https://','http://');
				//console.log("commandToDownload 2 = ",commandToDownload);
				exec(commandToDownload, function (error, stdout, stderr) {
					if (stdout) console.log(stdout);
					if (stderr) console.log(stderr);

					if (error) {
						console.log('exec error: ' + error);
					} else {
						im.crop({
							srcPath: downloadFileSrc2,
							dstPath: downloadFileSrc2,
							width: 600,
							height: 600,
							quality: 1,
							gravity: "Center"
						}, function(err, stdout, stderr){
							if (err){
								console.log("Caught Error 2 - ", err);
								console.log("commandToDownload -------------- ", commandToDownload);
								//throw err;
							}else{
								blendImage2 = downloadFileSrc2;
								nextStep_2();
							}
						});
					}
				});
			}
		}

		function nextStep_2() {
			//console.log("In nextStep_2 -------------------------------");
			var command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;

			switch(blendOption) {
				case "difference":
					command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;
					break;
				case "soft-light":
					command = "convert "+blendImage2+" "+blendImage1+" -compose softlight -composite "+uploadDir+"/"+file_name;
					break;
				case "hard-light":
					command = "convert "+blendImage2+" "+blendImage1+" -compose hardlight -composite "+uploadDir+"/"+file_name;
					break;
				case "multiply":
					command = "composite "+blendImage1+" -compose Multiply "+blendImage2+" \ "+uploadDir+"/"+file_name;
					break;
				case "screen":
					command = "convert "+blendImage1+" "+blendImage2+" -compose screen -composite "+uploadDir+"/"+file_name;
					break;
				case "lighten":
					command = "convert "+blendImage1+" "+blendImage2+" -compose lighten -composite "+uploadDir+"/"+file_name;
					break;
				case "overlay":
					command = "convert "+blendImage1+" "+blendImage2+" -compose Overlay -composite "+uploadDir+"/"+file_name;
					break;
				case "darken":
					command = "convert "+blendImage1+" "+blendImage2+" -compose darken -composite "+uploadDir+"/"+file_name;
					break;
				default:
					console.log("-----Wrong Input for blendOption-----");
			}


			exec(command, function (error, stdout, stderr) {
				if (stdout) console.log(stdout);
				if (stderr) console.log(stderr);

				if (error) {
					console.log('exec error: ' + error);
					//response.statusCode = 404;
					//response.end();

				} else {
					if (fs.existsSync(downloadFileSrc1)) {
						fs.unlink(downloadFileSrc1, function(err, result) {
							if(err) console.log('error', err);
						});
					}

					if (fs.existsSync(downloadFileSrc2)) {
						fs.unlink(downloadFileSrc2, function(err, result) {
							if(err) console.log('error', err);
						});
					}
				}
			});
		}
	}
	else{
		console.log("----------498634896y39t34989834684------------");
	}
}

async function generateBlendImage_returnJson (blendImage1, blendImage2, blendOption, uploadDir, file_name, res) {
	var downloadFileSrc1 = null;
	var downloadFileSrc2 = null;
	if(blendImage1 && blendImage2 && blendOption){
		if(blendImage1.indexOf('unsplash.com') == -1){
			blendImage1 = blendImage1.replace('../','');
			blendImage1 = blendImage1.replace('/100/','/600/');
			blendImage1 = blendImage1.replace('/300/','/600/');
			blendImage1 = blendImage1.replace('/aspectfit/','/600/');
			blendImage1 = blendImage1.replace('/aspectfit_small/','/600/');
			blendImage1 = blendImage1.replace('https://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('http://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('https://www.scrpt.com', '');
			blendImage1 = blendImage1.replace('http://www.scrpt.com', '');
			//blendImage1 = blendImage1.replace('/600/','/aspectfit/');
			blendImage1 = __dirname + "/../../public/"+blendImage1;
			nextStep_1();
		}
		else{
			blendImage1 = blendImage1.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';

			downloadFileSrc1 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage1_"+file_name.replace('png' , 'jpg');

			var commandToDownload = "curl -o "+downloadFileSrc1+" "+blendImage1;
			commandToDownload = commandToDownload.replace('https://','http://');
			//console.log("commandToDownload 1 = ",commandToDownload);
			exec(commandToDownload, async function (error, stdout, stderr) {
				if (stdout) console.log(stdout);
				if (stderr) console.log(stderr);

				if (error) {
					console.log('exec error: ' + error);
					return res.json({code : 501, message : 'Something went wrong.'});
				} else {
					try {
						//await easyimg.rescrop({
						/*await easyimg.crop({
							src: downloadFileSrc1,
							dst: downloadFileSrc1,
							width: 600,
							height: 600,
							cropwidth: 600,
							cropheight: 600,
							quality: 100,
							gravity: "Center"
						});
						blendImage1 = downloadFileSrc1;

						setTimeout(()=>{
							nextStep_1();
						},1000)
						*/
						im.crop({
							srcPath: downloadFileSrc1,
							dstPath: downloadFileSrc1,
							width: 600,
							height: 600,
							quality: 1,
							gravity: "Center"
						}, function(err, stdout, stderr){
							if (err){
								console.log("Caught Error 1 --- ", err);
								console.log("commandToDownload -------------- ", commandToDownload);
								//throw err;
							}else{
								blendImage1 = downloadFileSrc1;
								nextStep_1();
							}
						});
					}
					catch (e) {
						console.log("Caught Error 1 --- ", e);
						console.log("commandToDownload -------------- ", commandToDownload);
						return res.json({code : 501, message : 'Something went wrong.'});
					}
				}
			});

		}

		function nextStep_1() {
			if(blendImage2.indexOf('unsplash.com') == -1){
				blendImage2 = blendImage2.replace('../','');
				blendImage2 = blendImage2.replace('/100/','/600/');
				blendImage2 = blendImage2.replace('/300/','/600/');
				blendImage2 = blendImage2.replace('/aspectfit/','/600/');
				blendImage2 = blendImage2.replace('/aspectfit_small/','/600/');
				blendImage2 = blendImage2.replace('https://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('http://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('https://www.scrpt.com', '');
				blendImage2 = blendImage2.replace('http://www.scrpt.com', '');
				//blendImage2 = blendImage2.replace('/600/','/aspectfit/');
				blendImage2 = __dirname + "/../../public/"+blendImage2;
				nextStep_2();
			}
			else{

				blendImage2 = blendImage2.split('&')[0]+'&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=600&h=600&fit=crop&ixid=eyJhcHBfaWQiOjEyMDd9';

				downloadFileSrc2 = __dirname+'/../../media-assets/unsplash_store/'+"blendImage2_"+file_name.replace('png' , 'jpg');

				var commandToDownload = "curl -o "+downloadFileSrc2+" "+blendImage2;
				commandToDownload = commandToDownload.replace('https://','http://');
				//console.log("commandToDownload 2 = ",commandToDownload);
				exec(commandToDownload, async function (error, stdout, stderr) {
					if (stdout) console.log(stdout);
					if (stderr) console.log(stderr);

					if (error) {
						console.log('exec error: ' + error);
						return res.json({code : 501, message : 'Something went wrong.'});
					} else {
						try {
							//await easyimg.rescrop({
							/*await easyimg.crop({
								src: downloadFileSrc2,
								dst: downloadFileSrc2,
								width: 600,
								height: 600,
								cropwidth: 600,
								cropheight: 600,
								quality: 100,
								gravity: "Center"
							});
							blendImage2 = downloadFileSrc2;
							setTimeout(() => {
								nextStep_2();
							}, 1000);
							*/
							im.crop({
								srcPath: downloadFileSrc2,
								dstPath: downloadFileSrc2,
								width: 600,
								height: 600,
								quality: 1,
								gravity: "Center"
							}, function(err, stdout, stderr){
								if (err){
									console.log("Caught Error 2 - ", err);
									console.log("commandToDownload -------------- ", commandToDownload);
									//throw err;
								}else{
									blendImage2 = downloadFileSrc2;
									nextStep_2();
								}
							});
						}
						catch (e) {
							console.log("Caught Error 2 --- ", e);
							console.log("commandToDownload -------------- ", commandToDownload);
							return res.json({code : 501, message : 'Something went wrong.'});
						}
					}
				});
			}
		}

		function nextStep_2() {
			//console.log("In nextStep_2 -------------------------------");
			var command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;

			switch(blendOption) {
				case "difference":
					command = "convert "+blendImage1+" "+blendImage2+" -compose difference -composite "+uploadDir+"/"+file_name;
					break;
				case "soft-light":
					command = "convert "+blendImage2+" "+blendImage1+" -compose softlight -composite "+uploadDir+"/"+file_name;
					break;
				case "hard-light":
					command = "convert "+blendImage2+" "+blendImage1+" -compose hardlight -composite "+uploadDir+"/"+file_name;
					break;
				case "multiply":
					command = "composite "+blendImage1+" -compose Multiply "+blendImage2+" \ "+uploadDir+"/"+file_name;
					break;
				case "screen":
					command = "convert "+blendImage1+" "+blendImage2+" -compose screen -composite "+uploadDir+"/"+file_name;
					break;
				case "lighten":
					command = "convert "+blendImage1+" "+blendImage2+" -compose lighten -composite "+uploadDir+"/"+file_name;
					break;
				case "overlay":
					command = "convert "+blendImage1+" "+blendImage2+" -compose Overlay -composite "+uploadDir+"/"+file_name;
					break;
				case "darken":
					command = "convert "+blendImage1+" "+blendImage2+" -compose darken -composite "+uploadDir+"/"+file_name;
					break;
				default:
					console.log("-----Wrong Input for blendOption-----");
			}


			exec(command, async function (error, stdout, stderr) {
				if (stdout) console.log(stdout);
				if (stderr) console.log(stderr);

				if (error) {
					console.log('exec error: ' + error);
					
					//Download error auto resolver logic - if error then check the possibility of not having 600 size image
					IsBlendImage1Exists = fs.existsSync(blendImage1);
					IsBlendImage2Exists = fs.existsSync(blendImage2);
					
					if(IsBlendImage1Exists && IsBlendImage2Exists) {
						return res.json({code : 501, message : 'Something went wrong.'});					
					} else {
						var errorFlag = false;
						if(!IsBlendImage1Exists) {
							//create 600 size image again
							try {
								await easyimg.rescrop({
									src: blendImage1.replace('/600/', '/aspectfit/'),
									dst: blendImage1,
									width: 600,
									height: 600,
									cropwidth: parseInt(600),
									cropheight: parseInt(600),
									quality: 100,
									gravity: "Center"
								});
							}
							catch (e) {
								errorFlag = true;
								console.log("=========================ERROR : ", e);
							}
						}
	
						if(!IsBlendImage2Exists) {
							//create 600 size image again
							try {
								await easyimg.rescrop({
									src: blendImage2.replace('/600/', '/aspectfit/'),
									dst: blendImage2,
									width: 600,
									height: 600,
									cropwidth: parseInt(600),
									cropheight: parseInt(600),
									quality: 100,
									gravity: "Center"
								});
							}
							catch (e) {
								errorFlag = true;
								console.log("=========================ERROR : ", e);
							}

						}
						if(!errorFlag) {
							nextStep_2();
						}
					}
					//Download error auto resolver logic - if error then check the possibility of not having 600 size image
				} else {
					if (fs.existsSync(downloadFileSrc1)) {
						fs.unlink(downloadFileSrc1, function(err, result) {
							if(err) {
								console.log('error', err);
								//return res.json({code : 501, message : 'Something went wrong.'});
							}
						});
					}

					if (fs.existsSync(downloadFileSrc2)) {
						fs.unlink(downloadFileSrc2, function(err, result) {
							if(err) {
								console.log('error', err);
								//return res.json({code : 501, message : 'Something went wrong.'});
							}
						});
					}

					return res.json({code : 200, message : 'Blend Image generated successfully', status: 'Generated'});
				}
			});
		}
	}
	else{
		console.log("----------498634896y39t34989834684------------");
		return res.json({code : 501, message : 'Something went wrong.'});
	}
}

var generatePostBlendImages = async function (req, res) {
	var dataRecord = {
		PageId : req.body.PageId ? req.body.PageId : null,
		PostId : req.body.PostId ? req.body.PostId : null
	};

	if(dataRecord.PageId && dataRecord.PostId) {
		//get all prior selected blend images of this post.
		var conditions = {
			PageId : dataRecord.PageId,
			PostId : dataRecord.PostId
		};
		var SavedStreamData = await PageStream.findOne(conditions);
		SavedStreamData = SavedStreamData ? SavedStreamData : null;

		var alreadySelectedBlends = [];
		if(SavedStreamData) {
			alreadySelectedBlends = SavedStreamData.SelectedBlendImages ? SavedStreamData.SelectedBlendImages : [];
		}
		var totalRecords = alreadySelectedBlends.length;
		var errCounter = 0;
		for(var i = 0; i < totalRecords; i++) {
			try {
				var obj = alreadySelectedBlends[i];

				var blendImage1 = obj.blendImage1 ? obj.blendImage1 : null;
				var blendImage2 = obj.blendImage2 ? obj.blendImage2 : null;
				var blendOption = obj.blendMode ? obj.blendMode : 'hard-light';
				if(blendOption != 'soft-light' && blendOption != 'hard-light') {
					//continue;
				}

				if(blendImage1 && blendImage2 && blendOption) {
					var data = blendImage1 + blendImage2 + blendOption;
					var hexcode = crypto.createHash('md5').update(data).digest("hex");
					if(hexcode) {
						var file_name = hexcode + '.png';
						var uploadDir = __dirname+'/../../media-assets/streamposts';
						if (fs.existsSync(uploadDir +"/"+ file_name)) {
							console.log("already generated ...");
							continue;
						}
						generateBlendImage (blendImage1, blendImage2, blendOption, uploadDir, file_name);

					} else {
						errCounter++;
						//return res.json({code: 404});
						console.log("Error in hexcode.");
						continue;
					}
				} else {
					errCounter++;
					console.log("Error in input data.");
				}

			} catch (caughtError) {
				errCounter++;
				console.log("caughtError - ", caughtError);
				continue;
			}
		}
		return res.json({code : 200, message : `Total ${(totalRecords-errCounter)} blended images have been generated successfully.`});

	} else {
		return res.json({"code":"204", message : "It seems like you have not yet selected the blended images for this post."});
	}
}

var generatePostBlendImage = async function(req, res) {
	try {
		var obj = req.body;

		var blendImage1 = obj.blendImage1 ? obj.blendImage1 : null;
		var blendImage2 = obj.blendImage2 ? obj.blendImage2 : null;
		var blendOption = obj.blendMode ? obj.blendMode : 'hard-light';

		if(blendImage1 && blendImage2 && blendOption) {
			var data = blendImage1 + blendImage2 + blendOption;
			var hexcode = crypto.createHash('md5').update(data).digest("hex");
			if(hexcode) {
				var file_name = hexcode + '.png';
				var uploadDir = __dirname+'/../../media-assets/streamposts';

				if (fs.existsSync(uploadDir +"/"+ file_name)) {
					console.log("already generated ...");
					return res.json({code : 200, message : 'Blend Image was already generated.', status: 'AlreadyGenerated'});

				} else {
					await generateBlendImage_returnJson (blendImage1, blendImage2, blendOption, uploadDir, file_name, res);
				}
			} else {
				console.log("Error in input.");
				return res.json({code : 501, message : 'error in hex code generation.'});
			}
		} else {
			console.log("Error in input data.");
			return res.json({code : 501, message : 'Input error.'});
		}

	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
		return res.json({code : 501, message : 'Something went wrong.'});
	}
}

var generatePostBlendImage_INTERNAL_API = async function(req, res) {
	try {
		var obj = req.body;

		var blendImage1 = obj.blendImage1 ? obj.blendImage1 : null;
		var blendImage2 = obj.blendImage2 ? obj.blendImage2 : null;
		var blendOption = obj.blendMode ? obj.blendMode : 'hard-light';

		if(blendImage1 && blendImage2 && blendOption) {
			var data = blendImage1 + blendImage2 + blendOption;
			var hexcode = crypto.createHash('md5').update(data).digest("hex");
			if(hexcode) {
				var file_name = hexcode + '.png';
				var uploadDir = __dirname+'/../../media-assets/streamposts';

				if (fs.existsSync(uploadDir +"/"+ file_name)) {
					console.log("already generated ...");
					return res.json({code : 200, message : 'Blend Image was already generated.'});

				} else {
					//generateBlendImage (blendImage1, blendImage2, blendOption, uploadDir, file_name);
					await generateBlendImage_returnJson (blendImage1, blendImage2, blendOption, uploadDir, file_name, res);
				}
			} else {
				console.log("Error in input.");
				return res.json({code : 501, message : 'error in hex code generation.'});
			}
		} else {
			console.log("Error in input data.");
			return res.json({code : 501, message : 'Input error.'});
		}

	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
		return res.json({code : 501, message : 'Something went wrong.'});
	}

	//return res.json({code : 200, message : 'Blend Image generated successfully'});
}

//start stream public page apis
var myStreamPosts = async function (req, res) {
	req.body.IsQS = req.body.IsQS ? req.body.IsQS : false;
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = req.session.user._id;
	req.body.OwnerId = OwnerId;

	var CapsuleData_cond = {};
	CapsuleData_cond._id = ObjectId(CapsuleId);
	var CapsuleData = await Capsule.findOne(CapsuleData_cond, {OriginatedFrom: 1, IsOwnerPostsForMember : 1, IsPurchaseNeededForAllPosts : 1, OwnerAnswer: 1, StreamFlow: 1, LaunchDate: 1});
	CapsuleData = typeof CapsuleData == 'object' ? CapsuleData : null;
	if(!CapsuleData) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}
	var IsOwnerAnswerAllowed = CapsuleData.OwnerAnswer ? CapsuleData.OwnerAnswer : false;
	req.body.IsOwnerAnswerAllowed = IsOwnerAnswerAllowed;
	req.body.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : null;
	req.body.CapsuleData = CapsuleData;

	var IsOwnerPostsForMember = CapsuleData.IsOwnerPostsForMember ? CapsuleData.IsOwnerPostsForMember : false;
	var IsPurchaseNeededForAllPosts = CapsuleData.IsPurchaseNeededForAllPosts ? CapsuleData.IsPurchaseNeededForAllPosts : false;

	if(StreamType == 'Group' && String(OwnerId) != String(loginUserId)) {
		var cond = {
			StreamId : ObjectId(CapsuleId),
			MemberId : ObjectId(loginUserId)
		};
		var AnswerFinishLogs_result = await AnswerFinishLogs.find(cond);
		AnswerFinishLogs_result = Array.isArray(AnswerFinishLogs_result) ? AnswerFinishLogs_result : [];

		if(AnswerFinishLogs_result.length) {
			if(IsOwnerPostsForMember) {
				if(IsPurchaseNeededForAllPosts) {
					//now check if the member has already purchased the stream from store or not.
					var CapsuleData_MemberPurchase_cond = {
						OriginatedFrom : ObjectId(CapsuleData.OriginatedFrom),
						OwnerId : String(loginUserId),
						IsDeleted : 0
					};
					var CapsuleData_MemberPurchase = await Capsule.find(CapsuleData_MemberPurchase_cond, {_id : 1});
					CapsuleData_MemberPurchase = Array.isArray(CapsuleData_MemberPurchase) ? CapsuleData_MemberPurchase : [];
					if(CapsuleData_MemberPurchase.length) {
						myStreamPosts_friendAsOwner(req, res);
					} else {
						myStreamPosts__GS_MemCaseAfterFinish(req, res);
					}
				} else {
					myStreamPosts_friendAsOwner(req, res);
				}
			} else {
				myStreamPosts__GS_MemCaseAfterFinish(req, res);
			}
		} else {
			myStreamPosts__GroupStream_MemberCase(req, res);
		}
	} else {
		if(!CapsuleId) {
			return res.json({"code":"404", message : "No stream found.", results: []});
		}

		var todayEnd = new Date();
		//var todayTimestamp = todayEnd.getTime();

		todayEnd.setHours(23,59,59,999);

		if(IsOwnerAnswerAllowed) {
			var cond = {
				StreamId : ObjectId(CapsuleId),
				MemberId : ObjectId(loginUserId)
			};
			var AnswerFinishLogs_result = await AnswerFinishLogs.find(cond);
			AnswerFinishLogs_result = Array.isArray(AnswerFinishLogs_result) ? AnswerFinishLogs_result : [];

			if(AnswerFinishLogs_result.length) {
				//return myStreamPosts__GS_MemCaseAfterFinish(req, res);
			}
		}

		var conditions = {
			CapsuleId : ObjectId(CapsuleId),
			//SyncedBy : ObjectId(loginUserId),
			IsDeleted : false,
			"EmailEngineDataSets.DateOfDelivery" : {$lte : todayEnd}
			//Status : true,
			//"EmailEngineDataSets.Delivered" : false
		};

		var sortBy = {DateOfDelivery : -1};

		var conditionsTempForNonGroupType = {
			CapsuleId : ObjectId(CapsuleId),
			IsDeleted : false
		};

		var finalConditions = { DateOfDelivery: {$lte : todayEnd}, Delivered : false };
		var todayYear = todayEnd.getFullYear();
		var todayTimestamp = todayEnd.getTime();
		var StreamLaunchDate = CapsuleData.LaunchDate ? CapsuleData.LaunchDate : null;

		if(StreamType == 'Group') {
			CapsuleData.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : 'Birthday';
			if(CapsuleData.StreamFlow == 'Birthday') {
				if(!StreamLaunchDate) {
					return res.json({"code":"200", message : "No stream found.", results: []});
				}
				var OwnerBirthdate = new Date(StreamLaunchDate);
				//OwnerBirthdate.setFullYear(todayYear);
				var OBTimestamp = OwnerBirthdate.getTime();

				if(todayTimestamp < OBTimestamp) {
					return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
				}
			} else if(CapsuleData.StreamFlow == 'Topic' || CapsuleData.StreamFlow == 'Event') {
				if(!StreamLaunchDate) {
					return res.json({"code":"200", message : "No stream found.", results: []});
				}
				var OwnerBirthdate = new Date(StreamLaunchDate);
				console.log("OwnerBirthdate ... = ", OwnerBirthdate);
				//OwnerBirthdate.setFullYear(todayYear);
				var OBTimestamp = OwnerBirthdate.getTime();

				console.log("todayTimestamp ... = ", todayTimestamp);
				console.log("OBTimestamp ... = ", OBTimestamp);
				if(todayTimestamp < OBTimestamp) {
					return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
				}

				if(String(CapsuleData._id) == "631d1d53bca81f3cebb2118b") {
					conditions = conditionsTempForNonGroupType;
					finalConditions = {};
				}
			}

			var allcId = [
				'63791807516dcb35b17cc11d',
				'638018e43a69ab256ee0e6e7',
				//'637124b655c19859bb8bb6dc',
				'638a43c95d8f3c64297781b9',
				'63f3584d4b10685382239ef2'
			]

			if(allcId.indexOf(String(CapsuleId)) >= 0) {
				conditions = conditionsTempForNonGroupType;
				finalConditions = {};
				sortBy = {DateOfDelivery : -1};
			}
		} else {
			var tmp_emails = [
				//'abigailkevichusa19@gmail.com',
				//'tonglinh020999@gmail.com',
				//'maria.stasiak0609@gmail.com',
				//'albertkiama7@gmail.com',
				//'malloryharrison22@gmail.com',
				//'aditi.gupta597@gmail.com'
			];
			//temp conditions for hired emp to add community posts
			var allcId = [
				'63791807516dcb35b17cc11d',
				'637119d1b0e215597de4f771',
				'637116d882676d56c63785d5',
				'63710f0bdc6e654c569dad49',
				'63710ae5c017b849bb42adcd',
				'6370ffb2f8037b4486c32822',
				'6370f99ecaa95541b3f54805',
				'6370ddbcad2a9e3e65e40ccf',
				'6370dcdfa3b1a53d93630896',
				'6370da9fb46eeb3cc695733b',
				'636f80172b70901ecee650a8',
				'63eca8a55c0ef161ab09fc03',
                '63edf671a41d8c1034592e32',
				'63f33b9bfb794b4b0c8eb4e5',
				'6423efa0737593360d1f0fe2'
			]

			if(String(req.session.user._id) == "5f4835e67a5d1b040c63237e" || tmp_emails.indexOf(req.session.user.Email) >= 0) {
				conditions = conditionsTempForNonGroupType;
				finalConditions = {};
				sortBy = {DateOfDelivery : -1};
			}

			if(allcId.indexOf(String(CapsuleId)) >= 0) {
				conditions = conditionsTempForNonGroupType;
				finalConditions = {};
				sortBy = {DateOfDelivery : -1};
			}

			if(String(req.session.user._id) == "5f4835e67a5d1b040c63237e") { //added on 26th July 2023
				sortBy = {DateOfDelivery : 1};
			}
		}

		//allocate table to each one-to-one meeting for normal table case
		SyncedPost.aggregate([
			{ $match: conditions },
			{ $unwind : "$EmailEngineDataSets" },
			{
				$project: {
					_id : "$_id",
					CapsuleId: "$CapsuleId",
					PageId: "$PageId",
					PostId: "$PostId",
					PostStatement : "$PostStatement",
					SyncedBy: "$SyncedBy",
					ReceiverEmails: "$ReceiverEmails",
					CreatedOn: "$CreatedOn",
					Delivered : "$EmailEngineDataSets.Delivered",
					VisualUrls : "$EmailEngineDataSets.VisualUrls",
					SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
					TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
					TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
					DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
					BlendMode : "$EmailEngineDataSets.BlendMode",
					EmailTemplate : "$EmailTemplate",
					Subject : "$EmailSubject",
					IsOnetimeStream : "$IsOnetimeStream",
					IsOnlyPostImage : "$IsOnlyPostImage",
					PostImage : "$PostImage",
					IsPrivateQuestionPost : "$IsPrivateQuestionPost",
					SelectedKeywords : "$EmailEngineDataSets.SelectedKeywords"
				}
			},
			{
				$lookup: {
					from: "users",
					localField: "SyncedBy",
					foreignField: "_id",
					as: "SharedByUser"
				}
			},
			{
				$lookup: {
					from: "Capsules",
					localField: "CapsuleId",
					foreignField: "_id",
					as: "CapsuleData"
				}
			},
			{
				$lookup: {
					from: "Pages",
					localField: "PageId",
					foreignField: "_id",
					as: "PageData"
				}
			},
			{
				$project : {
					_id : 1,
					CapsuleId: 1,
					PageId: 1,
					PostId: 1,
					PostStatement : 1,
					SyncedBy: 1,
					ReceiverEmails: 1,
					CreatedOn: 1,
					Delivered : 1,
					VisualUrls : 1,
					SoundFileUrl : 1,
					TextAboveVisual : 1,
					TextBelowVisual : 1,
					DateOfDelivery : 1,
					BlendMode : 1,
					EmailTemplate : 1,
					Subject : 1,
					IsOnetimeStream : 1,
					IsOnlyPostImage : 1,
					PostImage : 1,
					IsPrivateQuestionPost : 1,
					SelectedKeywords : 1,
					"SharedByUser._id": 1,
					"SharedByUser.Name": 1,
					"SharedByUser.Email": 1,
					"SharedByUser.ProfilePic": 1,
					"CapsuleData.MetaData": 1,
					"CapsuleData.IsOnlyPostImage": 1,
					"PageData" : 1
				}
			},
			{ $match : finalConditions },
			{ $sort : sortBy },
			{ $skip : 0 },
			{ $limit : 500 }
		]).allowDiskUse(true).exec(async function (err, syncedPostsResults) {
			syncedPostsResults = syncedPostsResults ? syncedPostsResults : [];
			if(StreamType == 'Group' && !syncedPostsResults.length) {
				if(!StreamLaunchDate) {
					return res.json({"code":"200", message : "No stream found.", results: []});
				}
				var OwnerBirthdate = new Date(StreamLaunchDate);
				//OwnerBirthdate.setFullYear(todayYear);
				var OBTimestamp = OwnerBirthdate.getTime();

				if(todayTimestamp >= OBTimestamp) {
					return res.json({"code":"200", message : "No stream found.", results: []});
				} else {
					return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
				}
			}
			if ( !err ) {
				var streamPosts = [];
				try {
					//allocate table and update meeting record
					for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
						var dataRecord = syncedPostsResults[loop];

						dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

						dataRecord.SocialPageId = null;
						dataRecord.SocialPostId = null;

						dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
						dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
						dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

						//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

						dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
						dataRecord.PostType = 'Post';
						dataRecord.KeyPostType = null;

						var GroupStreamPostIds = []
						for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
							if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
								dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
								dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

								dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
								dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
								if(dataRecord.PostType == 'KeyPost') {
									dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
								}

								break;
							}
						}

						if(!dataRecord.SocialPostId) {
							GroupStreamPostIds.push(ObjectId(String(dataRecord.PostId)));
						}

						//GroupStream Post fetching flow
						if(GroupStreamPostIds.length) {
							var PostArr = await Page.aggregate([
								{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
								{ $unwind : "$Medias" },
								{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
								{
									$project : {
										"_id" : "$Medias._id",
										"PostedOn" : "$Medias.PostedOn",
										"UpdatedOn" : "$Medias.UpdatedOn",
										"Votes" : "$Medias.Votes",
										"Marks" : "$Medias.Marks",
										"IsOnlyForOwner" : "$Medias.IsOnlyForOwner",
										"IsAdminApproved" : "$Medias.IsAdminApproved",
										"PostPrivacySetting" : "$Medias.PostPrivacySetting",
										"Themes" : "$Medias.Themes",
										"TaggedUsers" : "$Medias.TaggedUsers",
										"IsUnsplashImage" : "$Medias.IsUnsplashImage",
										"IsAddedFromStream" : "$Medias.IsAddedFromStream",
										"IsPostForUser" : "$Medias.IsPostForUser",
										"IsPostForTeam" : "$Medias.IsPostForTeam",
										"IsEditorPicked" : "$Medias.IsEditorPicked",
										"Lightness" : "$Medias.Lightness",
										"DominantColors" : "$Medias.DominantColors",
										"PostType" : "$Medias.PostType",
										"KeyPostType" : "$Medias.KeyPostType",
										"MediaID" : "$Medias.MediaID",
										"MediaURL" : "$Medias.MediaURL",
										"Title" : "$Medias.Title",
										"Prompt" : "$Medias.Prompt",
										"Locator" : "$Medias.Locator",
										"PostedBy" : "$Medias.PostedBy",
										"ThemeID" : "$Medias.ThemeID",
										"ThemeTitle" : "$Medias.ThemeTitle",
										"MediaType" : "$Medias.MediaType",
										"ContentType" : "$Medias.ContentType",
										"Content" : "$Medias.Content",
										"OwnerId" : "$Medias.OwnerId",
										"thumbnail" : "$Medias.thumbnail",
										"PostStatement" : "$Medias.PostStatement",
										"StreamId" : "$Medias.StreamId",
										"QuestionPostId" : "$Medias.QuestionPostId",
										"SurpriseSelectedWords" : "$Medias.SurpriseSelectedWords"
									}
								},
								{
									$lookup: {
										from: "users",
										localField: "PostedBy",
										foreignField: "_id",
										as: "SharedByUser"
									}
								}

							]);

							console.log("PostArr.length 11---------------------------- ", PostArr.length);
							PostArr = Array.isArray(PostArr) ? PostArr : [];
							console.log("PostArr.length 22---------------------------- ", PostArr.length);

							for(var k = 0; k < PostArr.length; k++) {
								PostArr[k].OriginatedFrom = PostArr[k]._id;
								if(String(dataRecord.PostId) == String(PostArr[k]._id) && PostArr[k].OriginatedFrom) {
									dataRecord.SharedByUser = PostArr[k].SharedByUser.length ? PostArr[k].SharedByUser[0] : {};
									dataRecord.SocialPostId = PostArr[k].OriginatedFrom;
									dataRecord.PostType = PostArr[k].PostType ? PostArr[k].PostType : 'Post';

									dataRecord.MediaType = PostArr[k].MediaType ? PostArr[k].MediaType : '';
									dataRecord.ContentType = PostArr[k].ContentType ? PostArr[k].ContentType : '';
									if(dataRecord.PostType == 'KeyPost') {
										dataRecord.KeyPostType = PostArr[k].KeyPostType ? PostArr[k].KeyPostType : 'Comment';
									}

									if(PostArr[k].PostType == 'AnswerPost' && PostArr[k].MediaType != 'Notes') {
										//dataRecord.hexcode_blendedImage = PostArr[k].PostImage;
										dataRecord.PostType = 'GeneralPost';
										dataRecord.VisualUrls = [];
										dataRecord.VisualUrls[0] = dataRecord.PostImage;
										dataRecord.VisualUrls[1] = dataRecord.PostImage;
									}

									/*
									if(PostArr[k].PostType == 'AnswerPost' && PostArr[k].MediaType != 'Notes') {
										PostArr[k].IsOnetimeStream = PostArr[k].IsOnetimeStream || false;

										if(PostArr[k].IsOnetimeStream) {
											dataRecord.IsOnetimeStream = true;
											dataRecord.IsOnlyPostImage = true;
											dataRecord.VisualUrls = [];
											dataRecord.VisualUrls[0] = dataRecord.PostImage;
											dataRecord.VisualUrls[1] = dataRecord.PostImage;
										} else {
											dataRecord.PostType = 'GeneralPost';
											dataRecord.VisualUrls = [];
											dataRecord.VisualUrls[0] = dataRecord.PostImage;
											dataRecord.VisualUrls[1] = dataRecord.PostImage;
										}
									}*/

									/*
									if(PostArr[k].PostType == 'AnswerPost') {
										PostArr[k].IsOnetimeStream = PostArr[k].IsOnetimeStream || false;
										if(PostArr[k].IsOnetimeStream) {
											dataRecord.IsOnetimeStream = true;
											dataRecord.IsOnlyPostImage = true;
											if(PostArr[k].MediaType == 'Notes') {
												dataRecord.VisualUrls = [];
											}
										} else {
											//dataRecord.hexcode_blendedImage = PostArr[k].PostImage;
											//dataRecord.PostType = 'GeneralPost';
											dataRecord.VisualUrls = [];
											dataRecord.VisualUrls[0] = dataRecord.PostImage;
											dataRecord.VisualUrls[1] = dataRecord.PostImage;
										}
									}*/


									break;
								}
							}
						}

						if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
							continue;
						}
						dataRecord.hexcode_blendedImage = null;

						dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
						dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
						dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
						dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
						dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
						dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
						dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
						dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

						dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
						dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
						dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

						dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
						dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
						dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

						dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
						//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
						//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
						//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

						var PostImage1 = "";
						var PostImage2 = "";

						console.log("dataRecord.VisualUrls.length ---------------------- ", dataRecord.VisualUrls.length);
						if(dataRecord.VisualUrls.length == 1) {
							PostImage1 = dataRecord.VisualUrls[0];
							PostImage2 = dataRecord.VisualUrls[0];
						}

						if(dataRecord.VisualUrls.length == 2) {
							PostImage1 = dataRecord.VisualUrls[0];
							PostImage2 = dataRecord.VisualUrls[1];
						}

						console.log("PostImage1 --------------- ", PostImage1);
						console.log("PostImage2 --------------- ", PostImage2);

						var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
						var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


						var condition = {};
						condition.name = "Surprise__Post";

						if(dataRecord.EmailTemplate == 'PracticalThinker') {
							condition.name = "Surprise__Post_2Image";
						}

						//check if blended image exists
						var blendImage1 = PostImage1;
						var blendImage2 = PostImage2;
						var blendOption = dataRecord.BlendMode;
						var blendedImage = null;

						if(blendImage1 && blendImage2 && blendOption) {
							if(blendImage1 != blendImage2) {
								var data = blendImage1 + blendImage2 + blendOption;
								var hexcode = crypto.createHash('md5').update(data).digest("hex");
								if(hexcode) {
									var file_name = hexcode + '.png';
									var uploadDir = __dirname+'/../../media-assets/streamposts';

									//if (fs.existsSync(uploadDir +"/"+ file_name)) {
										blendedImage = `/streamposts/${hexcode}.png`;
										condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
									//}
								}
							}
						}

						if(!blendedImage && (blendImage1 == blendImage2)) {
							blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
							blendedImage = blendImage1;
							condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
						}
						dataRecord.hexcode_blendedImage = blendedImage;

						if(dataRecord.MediaType == 'Video') {
							dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}

						var CapsuleData = {
							IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
						};
						dataRecord.CapsuleData = CapsuleData;

						delete dataRecord.PageData;

						//if(StreamType == 'Group' && dataRecord.PostType == 'InfoPostOwner') {
						if(StreamType == 'Group') {
							let loginUserName = req.session.user.Name.split(' ')[0];
							let sharedbyusername = dataRecord.SharedByUser.Name.split(' ')[0];
							dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
							dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);
							dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
							dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);

							//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
							//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
							//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
							//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
						}
						/*if(dataRecord.VisualUrls[0] === 'https://www.scrpt.com/assets/Media/img/300/') {
							dataRecord.VisualUrls = [];
						}*/
						streamPosts.push(dataRecord);
					}
					return res.json({"code":"200", message : "success", results: streamPosts});
				} catch (error) {
					console.log("error --------- ", error);
					return res.json({"code":"501", message : "Something went wrong.", caughtError: error, results : []});
				}
			} else {
				return res.json({"code":"501", message : "Something went wrong.", results : []});
			}
		});
	}
}

var myStreamPosts_friendAsOwner = async function (req, res) {
	//console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< myStreamPosts_friendAsOwner >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>   "); return;

	req.body.IsQS = req.body.IsQS ? req.body.IsQS : false;
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = OwnerId;//req.session.user._id;
	var CapsuleData = typeof req.body.CapsuleData == 'object' ? req.body.CapsuleData : null;
	if(!CapsuleData) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var OwnerDetails = await User.findOne({_id : ObjectId(OwnerId), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	if(!CapsuleId || !OwnerDetails) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var todayEnd = new Date();
	//var todayTimestamp = todayEnd.getTime();

	todayEnd.setHours(23,59,59,999);

	var conditions = {
		CapsuleId : ObjectId(CapsuleId),
		SyncedBy : ObjectId(loginUserId),
		IsDeleted : false,
		"EmailEngineDataSets.DateOfDelivery" : {$lte : todayEnd}
	};

	if(StreamType == 'Group') {
		var todayYear = todayEnd.getFullYear();
		var todayTimestamp = todayEnd.getTime();

		var StreamLaunchDate = CapsuleData.LaunchDate ? CapsuleData.LaunchDate : null;

		CapsuleData.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : 'Birthday';
		if(CapsuleData.StreamFlow == 'Birthday') {
			if(!StreamLaunchDate) {
				return res.json({"code":"200", message : "No stream found.", results: []});
			}
			var OwnerBirthdate = new Date(StreamLaunchDate);
			//OwnerBirthdate.setFullYear(todayYear);
			var OBTimestamp = OwnerBirthdate.getTime();
			if(todayTimestamp < OBTimestamp) {
				return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
			}
		} else if(CapsuleData.StreamFlow == 'Topic' || CapsuleData.StreamFlow == 'Event') {
			if(!StreamLaunchDate) {
				return res.json({"code":"200", message : "No stream found.", results: []});
			}
			var OwnerBirthdate = new Date(StreamLaunchDate);
			//OwnerBirthdate.setFullYear(todayYear);
			var OBTimestamp = OwnerBirthdate.getTime();
			if(todayTimestamp < OBTimestamp) {
				return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
			}
		}
	}

	//allocate table to each one-to-one meeting for normal table case
	SyncedPost.aggregate([
		{ $match: conditions },
		{ $unwind : "$EmailEngineDataSets" },
		{
			$project: {
				_id : "$_id",
				CapsuleId: "$CapsuleId",
				PageId: "$PageId",
				PostId: "$PostId",
				PostStatement : "$PostStatement",
				SyncedBy: "$SyncedBy",
				ReceiverEmails: "$ReceiverEmails",
				CreatedOn: "$CreatedOn",
				Delivered : "$EmailEngineDataSets.Delivered",
				VisualUrls : "$EmailEngineDataSets.VisualUrls",
				SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
				TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
				TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
				DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
				BlendMode : "$EmailEngineDataSets.BlendMode",
				EmailTemplate : "$EmailTemplate",
				Subject : "$EmailSubject",
				IsOnetimeStream : "$IsOnetimeStream",
				IsOnlyPostImage : "$IsOnlyPostImage",
				PostImage : "$PostImage",
				IsPrivateQuestionPost : "$IsPrivateQuestionPost",
				PostOwnerId : "$PostOwnerId"
			}
		},
		{
			$match : {
				$or : [
					{
						PostOwnerId : ObjectId(String(req.session.user._id))
					},
					{
						PostOwnerId : {$ne : ObjectId(String(req.session.user._id))},
						IsPrivateQuestionPost: false
					}
				]
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				PostImage : 1,
				IsPrivateQuestionPost : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				"CapsuleData.IsOnlyPostImage": 1,
				"PageData" : 1
			}
		},
		{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{ $sort : {DateOfDelivery : -1} },
		{ $skip : 0 },
		{ $limit : 500 }
	]).allowDiskUse(true).exec(async function (err, syncedPostsResults) {
		console.log("!!!!!!!!!!!!!!!!!!!!11---------------ERROR = ", err);

		syncedPostsResults = syncedPostsResults ? syncedPostsResults : [];
		console.log("9999999999999999999999999999999 syncedPostsResults.length ---------------------", syncedPostsResults.length);
		//return;
		if(StreamType == 'Group' && !syncedPostsResults.length) {
			return myStreamPosts__GroupStream_OwnerCase_InfoPosts(req, res);
		}
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2235------------------------syncedPostsResults.length = ", syncedPostsResults.length);
		if ( !err ) {
			var streamPosts = [];
			try {
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					var dataRecord = syncedPostsResults[loop];

					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PostType = 'Post';
					dataRecord.KeyPostType = null;

					var GroupStreamPostIds = []
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

							dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
							dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
							if(dataRecord.PostType == 'KeyPost') {
								dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
							}

							break;
						}
					}

					if(!dataRecord.SocialPostId) {
						GroupStreamPostIds.push(ObjectId(String(dataRecord.PostId)));
					}

					//GroupStream Post fetching flow
					if(GroupStreamPostIds.length) {
						var PostArr = await Page.aggregate([
							{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
							{ $unwind : "$Medias" },
							{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
							{
								$project : {
									"_id" : "$Medias._id",
									"PostedOn" : "$Medias.PostedOn",
									"UpdatedOn" : "$Medias.UpdatedOn",
									"Votes" : "$Medias.Votes",
									"Marks" : "$Medias.Marks",
									"IsOnlyForOwner" : "$Medias.IsOnlyForOwner",
									"IsAdminApproved" : "$Medias.IsAdminApproved",
									"PostPrivacySetting" : "$Medias.PostPrivacySetting",
									"Themes" : "$Medias.Themes",
									"TaggedUsers" : "$Medias.TaggedUsers",
									"IsUnsplashImage" : "$Medias.IsUnsplashImage",
									"IsAddedFromStream" : "$Medias.IsAddedFromStream",
									"IsPostForUser" : "$Medias.IsPostForUser",
									"IsPostForTeam" : "$Medias.IsPostForTeam",
									"IsEditorPicked" : "$Medias.IsEditorPicked",
									"Lightness" : "$Medias.Lightness",
									"DominantColors" : "$Medias.DominantColors",
									"PostType" : "$Medias.PostType",
									"KeyPostType" : "$Medias.KeyPostType",
									"MediaID" : "$Medias.MediaID",
									"MediaURL" : "$Medias.MediaURL",
									"Title" : "$Medias.Title",
									"Prompt" : "$Medias.Prompt",
									"Locator" : "$Medias.Locator",
									"PostedBy" : "$Medias.PostedBy",
									"ThemeID" : "$Medias.ThemeID",
									"ThemeTitle" : "$Medias.ThemeTitle",
									"MediaType" : "$Medias.MediaType",
									"ContentType" : "$Medias.ContentType",
									"Content" : "$Medias.Content",
									"OwnerId" : "$Medias.OwnerId",
									"thumbnail" : "$Medias.thumbnail",
									"PostStatement" : "$Medias.PostStatement",
									"StreamId" : "$Medias.StreamId",
									"QuestionPostId" : "$Medias.QuestionPostId",
									"SurpriseSelectedWords" : "$Medias.SurpriseSelectedWords"
								}
							},
							{
								$lookup: {
									from: "users",
									localField: "PostedBy",
									foreignField: "_id",
									as: "SharedByUser"
								}
							}

						]);

						console.log("PostArr.length 11---------------------------- ", PostArr.length);
						PostArr = Array.isArray(PostArr) ? PostArr : [];
						console.log("PostArr.length 22---------------------------- ", PostArr.length);

						for(var k = 0; k < PostArr.length; k++) {
							PostArr[k].OriginatedFrom = PostArr[k]._id;
							if(String(dataRecord.PostId) == String(PostArr[k]._id) && PostArr[k].OriginatedFrom) {
								dataRecord.SharedByUser = PostArr[k].SharedByUser.length ? PostArr[k].SharedByUser[0] : {};
								dataRecord.SocialPostId = PostArr[k].OriginatedFrom;
								dataRecord.PostType = PostArr[k].PostType ? PostArr[k].PostType : 'Post';

								dataRecord.MediaType = PostArr[k].MediaType ? PostArr[k].MediaType : '';
								dataRecord.ContentType = PostArr[k].ContentType ? PostArr[k].ContentType : '';
								if(dataRecord.PostType == 'KeyPost') {
									dataRecord.KeyPostType = PostArr[k].KeyPostType ? PostArr[k].KeyPostType : 'Comment';
								}

								if(PostArr[k].PostType == 'AnswerPost' && PostArr[k].MediaType != 'Notes') {
									//dataRecord.hexcode_blendedImage = PostArr[k].PostImage;
									dataRecord.PostType = 'GeneralPost';
									dataRecord.VisualUrls = [];
									dataRecord.VisualUrls[0] = dataRecord.PostImage;
									dataRecord.VisualUrls[1] = dataRecord.PostImage;
								}

								break;
							}
						}
					}

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}
					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					console.log("dataRecord.VisualUrls.length ---------------------- ", dataRecord.VisualUrls.length);
					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}

					console.log("PostImage1 --------------- ", PostImage1);
					console.log("PostImage2 --------------- ", PostImage2);

					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						if(blendImage1 != blendImage2) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								//if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								//}
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;

					if(dataRecord.MediaType == 'Video') {
						dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
					}

					var CapsuleData = {
						IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
					};
					dataRecord.CapsuleData = CapsuleData;

					delete dataRecord.PageData;

					//if(StreamType == 'Group' && dataRecord.PostType == 'InfoPostOwner') {
					if(StreamType == 'Group') {
						let loginUserName = OwnerDetails.Name.split(' ')[0];
						let sharedbyusername = dataRecord.SharedByUser.Name.split(' ')[0];
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);

						//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
						//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
					}

					streamPosts.push(dataRecord);
				}
				return res.json({"code":"200", message : "success", results: streamPosts});
			} catch (error) {
				console.log("error --------- ", error);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: error, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : []});
		}
	});
}

//start stream public page apis
var myStreamPosts__GS_MemCaseAfterFinish = async function (req, res) {
	req.body.IsQS = req.body.IsQS ? req.body.IsQS : false;
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = req.session.user._id;

	if(!CapsuleId) {
		return res.json({"code":"200", message : "No stream posts found.", results: [], stage : "1"});
	}

	var conditions = {
		CapsuleId : ObjectId(CapsuleId),
		SyncedBy : ObjectId(OwnerId),
		IsDeleted : false,
		//Status : true,
		//"EmailEngineDataSets.Delivered" : false
	};

	var todayEnd = new Date();
	//var todayTimestamp = todayEnd.getTime();

	todayEnd.setHours(23,59,59,999);

	/*if(StreamType == 'Group') {
		var todayYear = todayEnd.getFullYear();
		var todayTimestamp = todayEnd.getTime();

		req.session.user.Birthdate = req.session.user.Birthdate ? req.session.user.Birthdate : null;
		if(!req.session.user.Birthdate) {
			return res.json({"code":"200", message : "No stream found.", results: []});
		}

		var OwnerBirthdate = new Date(req.session.user.Birthdate);
		OwnerBirthdate.setFullYear(todayYear);
		var OBTimestamp = OwnerBirthdate.getTime();

		console.log("todayTimestamp = ", todayTimestamp);
		console.log("OBTimestamp = ", OBTimestamp);
		if(todayTimestamp < OBTimestamp) {
			return res.json({"code":"200", message : "No stream found.", results: []});
		}
	}*/

	//allocate table to each one-to-one meeting for normal table case
	SyncedPost.aggregate([
		{ $match: conditions },
		{ $unwind : "$EmailEngineDataSets" },
		{
			$project: {
				_id : "$_id",
				CapsuleId: "$CapsuleId",
				PageId: "$PageId",
				PostId: "$PostId",
				PostStatement : "$PostStatement",
				SyncedBy: "$SyncedBy",
				ReceiverEmails: "$ReceiverEmails",
				CreatedOn: "$CreatedOn",
				Delivered : "$EmailEngineDataSets.Delivered",
				VisualUrls : "$EmailEngineDataSets.VisualUrls",
				SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
				TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
				TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
				DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
				BlendMode : "$EmailEngineDataSets.BlendMode",
				EmailTemplate : "$EmailTemplate",
				Subject : "$EmailSubject",
				IsOnetimeStream : "$IsOnetimeStream",
				IsOnlyPostImage : "$IsOnlyPostImage",
				PostImage : "$PostImage",
				IsPrivateQuestionPost : "$IsPrivateQuestionPost",
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				PostImage : 1,
				IsPrivateQuestionPost : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				"CapsuleData.IsOnlyPostImage": 1,
				"PageData" : 1
			}
		},
		{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{ $sort : {DateOfDelivery : -1} },
		{ $skip : 0 },
		{ $limit : 500 }
	], async function (err, syncedPostsResults) {
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2236------------------------syncedPostsResults.length = ", syncedPostsResults.length);
		if ( !err ) {

			var OwnerDetails = await User.findOne({_id : ObjectId(OwnerId), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
			OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

			var streamPosts = [];
			try {
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					var dataRecord = syncedPostsResults[loop];

					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PostType = 'Post';
					dataRecord.KeyPostType = null;

					var GroupStreamPostIds = []
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

							dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
							dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
							if(dataRecord.PostType == 'KeyPost') {
								dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
							}

							break;
						}
					}

					if(dataRecord.SocialPostId) {
						continue;
					}

					if(!dataRecord.SocialPostId) {
						GroupStreamPostIds.push(ObjectId(String(dataRecord.PostId)));
					}

					//GroupStream Post fetching flow
					if(GroupStreamPostIds.length) {
						var PostArr = await Page.aggregate([
							{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
							{ $unwind : "$Medias" },
							{ $match : {"Medias._id" : {$in : GroupStreamPostIds}} },
							{
								$project : {
									"_id" : "$Medias._id",
									"PostedOn" : "$Medias.PostedOn",
									"UpdatedOn" : "$Medias.UpdatedOn",
									"Votes" : "$Medias.Votes",
									"Marks" : "$Medias.Marks",
									"IsOnlyForOwner" : "$Medias.IsOnlyForOwner",
									"IsAdminApproved" : "$Medias.IsAdminApproved",
									"PostPrivacySetting" : "$Medias.PostPrivacySetting",
									"Themes" : "$Medias.Themes",
									"TaggedUsers" : "$Medias.TaggedUsers",
									"IsUnsplashImage" : "$Medias.IsUnsplashImage",
									"IsAddedFromStream" : "$Medias.IsAddedFromStream",
									"IsPostForUser" : "$Medias.IsPostForUser",
									"IsPostForTeam" : "$Medias.IsPostForTeam",
									"IsEditorPicked" : "$Medias.IsEditorPicked",
									"Lightness" : "$Medias.Lightness",
									"DominantColors" : "$Medias.DominantColors",
									"PostType" : "$Medias.PostType",
									"KeyPostType" : "$Medias.KeyPostType",
									"MediaID" : "$Medias.MediaID",
									"MediaURL" : "$Medias.MediaURL",
									"Title" : "$Medias.Title",
									"Prompt" : "$Medias.Prompt",
									"Locator" : "$Medias.Locator",
									"PostedBy" : "$Medias.PostedBy",
									"ThemeID" : "$Medias.ThemeID",
									"ThemeTitle" : "$Medias.ThemeTitle",
									"MediaType" : "$Medias.MediaType",
									"ContentType" : "$Medias.ContentType",
									"Content" : "$Medias.Content",
									"OwnerId" : "$Medias.OwnerId",
									"thumbnail" : "$Medias.thumbnail",
									"PostStatement" : "$Medias.PostStatement",
									"StreamId" : "$Medias.StreamId",
									"QuestionPostId" : "$Medias.QuestionPostId",
									"SurpriseSelectedWords" : "$Medias.SurpriseSelectedWords"
								}
							},
							{
								$lookup: {
									from: "users",
									localField: "PostedBy",
									foreignField: "_id",
									as: "SharedByUser"
								}
							}

						]);

						//console.log("PostArr.length 11---------------------------- ", PostArr.length);
						PostArr = Array.isArray(PostArr) ? PostArr : [];
						//console.log("PostArr.length 22---------------------------- ", PostArr.length);

						for(var k = 0; k < PostArr.length; k++) {
							PostArr[k].OriginatedFrom = PostArr[k]._id;
							if(String(dataRecord.PostId) == String(PostArr[k]._id) && PostArr[k].OriginatedFrom) {
								dataRecord.SharedByUser = PostArr[k].SharedByUser.length ? PostArr[k].SharedByUser[0] : {};
								if(dataRecord.SharedByUser._id == loginUserId || dataRecord.SharedByUser._id == OwnerId) {
									dataRecord.SocialPostId = PostArr[k].OriginatedFrom;
									dataRecord.PostType = PostArr[k].PostType ? PostArr[k].PostType : 'Post';

									dataRecord.MediaType = PostArr[k].MediaType ? PostArr[k].MediaType : '';
									dataRecord.ContentType = PostArr[k].ContentType ? PostArr[k].ContentType : '';
									if(dataRecord.PostType == 'KeyPost') {
										dataRecord.KeyPostType = PostArr[k].KeyPostType ? PostArr[k].KeyPostType : 'Comment';
									}

									if(PostArr[k].PostType == 'AnswerPost' && PostArr[k].MediaType != 'Notes') {
										//dataRecord.hexcode_blendedImage = PostArr[k].PostImage;
										dataRecord.PostType = 'GeneralPost';
										dataRecord.VisualUrls = [];
										dataRecord.VisualUrls[0] = dataRecord.PostImage;
										dataRecord.VisualUrls[1] = dataRecord.PostImage;
									}

									break;
								}
							}
						}
					}

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}
					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					//console.log("dataRecord.VisualUrls.length ---------------------- ", dataRecord.VisualUrls.length);
					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}

					//console.log("PostImage1 --------------- ", PostImage1);
					//console.log("PostImage2 --------------- ", PostImage2);

					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						if(blendImage1 != blendImage2) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								//if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								//}
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;

					if(dataRecord.MediaType == 'Video') {
						dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
					}

					var CapsuleData = {
						IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
					};
					dataRecord.CapsuleData = CapsuleData;

					delete dataRecord.PageData;

					let loginUserName = req.session.user.Name.split(' ')[0];
					let sharedbyusername = OwnerDetails.Name.split(' ')[0];
					dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
					dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);
					dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
					dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);

					dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
					dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
					dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
					dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);

					streamPosts.push(dataRecord);
				}
				return res.json({"code":"200", message : "success", results: streamPosts, stage : "2"});
			} catch (error) {
				console.log("error --------- ", error);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: error, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : []});
		}
	});
}

var myStreamPosts__GroupStream_MemberCase = async function (req, res) {
	console.log("------------- myStreamPosts__GroupStream_MemberCase ---------- ");
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = req.session.user._id;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var IsQS = req.body.IsQS ? req.body.IsQS : false;

	if(!CapsuleId) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var streamPageId = await getPageIdByStream(CapsuleId);
	if(!streamPageId) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}
	console.log("streamPageId ---------- ", streamPageId);
	var conditions = {
		_id : ObjectId(String(streamPageId)),
		IsDeleted : false
	};

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	var PostToPopulate = {
		"Medias.PostType" : { $in : ["InfoPost", "QuestionPost"] }
	};
	//allocate table to each one-to-one meeting for normal table case
	Page.aggregate([
		{ $match: conditions },
		{ $match: PostToPopulate },
		{ $unwind : "$Medias" },
		{ $match: PostToPopulate },
		{
			$lookup: {
				from: "Pages",
				localField: "Medias._id",
				foreignField: "Medias.QuestionPostId",
				as: "AnswerPosts"
			}
		},
		{ $unwind : { path: "$AnswerPosts", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				_id : "$_id",
				CapsuleId: CapsuleId,
				PageId: streamPageId,
				PostId: "$Medias._id",
				//PostStatement : "$Medias.PostStatement",
				"PostStatement" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				SyncedBy: "$Medias.PostedBy",
				ReceiverEmails: "",
				CreatedOn: "$Medias.PostedOn",
				Delivered : true,
				//VisualUrlsOld : ["$Medias.MediaURL", "$Medias.MediaURL"],
				VisualUrls : [
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					},
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					}
				],
				SoundFileUrl : "",
				TextAboveVisual : "",
				"TextBelowVisual" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				DateOfDelivery : "",
				BlendMode : "",
				EmailTemplate : "",
				Subject : "",
				IsOnetimeStream : true,
				IsOnlyPostImage : true,
				IsPrivateQuestionPost: "$Medias.IsPrivateQuestionPost",
				//AnswerPosts : "$AnswerPosts",
				AnswerPostsObj: {
					$filter : {
						input: "$AnswerPosts.Medias",
						as : "field",
						cond : {
							$and : [
								{ $eq : ["$$field.QuestionPostId", "$Medias._id"] },
								//{ $eq : ["$$field.PostedBy", loginUserId] },
								{ $eq : ["$$field.PostType", "AnswerPost"] }
							]
						}
					}
				}
			}
		},
		{ $unwind : { path : "$AnswerPostsObj", includeArrayIndex: "AnswerPostsArrayIndex", preserveNullAndEmptyArrays : true} },
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				AnswerPostsObj : 1,
				AnswerPostsArrayIndex : 1
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "AnswerPostsObj.PostedBy",
				foreignField: "_id",
				as: "AnswerPostsObj.SharedByUser"
			}
		},
		{
			$group : {
				_id : "$PostId",
				CapsuleId: { $first : "$CapsuleId" },
				PageId: { $first : "$PageId" },
				PostId: { $first : "$PostId" },
				PostStatement : { $first : "$PostStatement" },
				SyncedBy: { $first : "$SyncedBy" },
				ReceiverEmails: { $first : "$ReceiverEmails" },
				CreatedOn: { $first : "$CreatedOn" },
				Delivered : { $first : "$Delivered" },
				VisualUrls : { $first : "$VisualUrls" },
				SoundFileUrl : { $first : "$SoundFileUrl" },
				TextAboveVisual : { $first : "$TextAboveVisual" },
				TextBelowVisual : { $first : "$TextBelowVisual" },
				DateOfDelivery : { $first : "$DateOfDelivery" },
				BlendMode : { $first : "$BlendMode" },
				EmailTemplate : { $first : "$EmailTemplate" },
				Subject : { $first : "$Subject" },
				IsOnetimeStream : { $first : "$IsOnetimeStream" },
				IsOnlyPostImage : { $first : "$IsOnlyPostImage" },
				IsPrivateQuestionPost: { $first : "$IsPrivateQuestionPost"},
				//AnswerPosts : "$AnswerPosts",
				AnswerPostsObj: {
					$push : {
						$cond:[
							{ $and : [{$gte: ["$AnswerPostsArrayIndex", 0]}, {$eq : ["$AnswerPostsObj.PostedBy", ObjectId(loginUserId)]}] },
							//{ $gte: ["$AnswerPostsArrayIndex", 0] },
							{
								"CapsuleId": "$CapsuleId",
								"PageId": "$PageId",
								"PostId": "$AnswerPostsObj._id",
								"PostStatement" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"Content" : "$AnswerPostsObj.Content",
								"SyncedBy": "$AnswerPostsObj.PostedBy",
								"ReceiverEmails": "",
								"CreatedOn": "$AnswerPostsObj.PostedOn",
								"Delivered" : true,
								/*"VisualUrls" : [
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									},
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									}
								],*/
								"VisualUrls" : [
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$ne": ["$AnswerPostsObj.MediaType", "Video"]},{"$ne": ["$AnswerPostsObj.MediaType", "Link"]}] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									},
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									}
								],
								"SoundFileUrl" : "",
								"TextAboveVisual" : "",
								"TextBelowVisual" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"DateOfDelivery" : "",
								"BlendMode" : "",
								"EmailTemplate" : "",
								"Subject" : "",
								"IsOnetimeStream" : true,
								"IsOnlyPostImage" : true,
								"PostType": "$AnswerPostsObj.PostType",
								"MediaType": "$AnswerPostsObj.MediaType",
								"ContentType": "$AnswerPostsObj.ContentType",
								"QuestionPostId": "$AnswerPostsObj.QuestionPostId",
								"SharedByUser" : "$AnswerPostsObj.SharedByUser"
							},
							"$$REMOVE"
						]
					}
				}
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				AnswerPostsObj : 1
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				"CapsuleData.IsOnlyPostImage": 1,
				"PageData" : 1,
				"AnswerPostsObj" : 1
			}
		},
		//{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{ $sort : {CreatedOn : -1, _id : 1} }
	], async function (err, syncedPostsResults) {
		console.log("err ---------------- ", err);
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length myStreamPosts__GroupStream_MemberCase = ", syncedPostsResults.length);
		if ( !err ) {
			var OwnerDetails = await User.findOne({_id : ObjectId(OwnerId), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
			OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

			var streamPosts = [];
			try {
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					var dataRecord = syncedPostsResults[loop];

					dataRecord.AnswerPostsObj = dataRecord.AnswerPostsObj ? dataRecord.AnswerPostsObj : [];
					for(let ap = 0; ap < dataRecord.AnswerPostsObj.length; ap++) {
						dataRecord.AnswerPostsObj[ap].SharedByUser = dataRecord.AnswerPostsObj[ap].SharedByUser ? dataRecord.AnswerPostsObj[ap].SharedByUser[0] : {};
					}

					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PostType = 'Post';
					dataRecord.KeyPostType = null;
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

							dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
							dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
							if(dataRecord.PostType == 'KeyPost') {
								dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
							}

							break;
						}
					}

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}
					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					//if(dataRecord.PostType == 'InfoPost') {
						let loginUserName = req.session.user.Name.split(' ')[0];
						let sharedbyusername = OwnerDetails.Name.split(' ')[0];
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);

						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
					//}

					if(dataRecord.PostType == 'QuestionPost' && dataRecord.MediaType != 'Notes') {
						//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.hexcode_blendedImage : dataRecord.hexcode_blendedImage;
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[1] : dataRecord.VisualUrls[1];
						}

						if(dataRecord.MediaType == 'Video') {
							//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}
					}

					if((dataRecord.PostType == 'InfoPost' || dataRecord.PostType == 'InfoPostOwner') && dataRecord.MediaType != 'Notes') {
						//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.hexcode_blendedImage : dataRecord.hexcode_blendedImage;
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[1] : dataRecord.VisualUrls[1];
						}

						if(dataRecord.MediaType == 'Video') {
							//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}
					}

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}


					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						if(blendImage1 != blendImage2) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								//if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								//}
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1 ? blendImage1 : '';
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;


					if(dataRecord.MediaType == 'Video') {
						dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
					}

					var CapsuleData = {
						IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
					};
					dataRecord.CapsuleData = CapsuleData;

					delete dataRecord.PageData;
					streamPosts.push(dataRecord);
				}
				return res.json({"code":"200", message : "success", results: streamPosts});
			} catch (error) {
				console.log("caughtError -- 9999999", error);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: error, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : []});
		}
	});
}

var myStreamPosts__GroupStream_MemberCase_prefill = async function (req, res) {
	console.log("------------- myStreamPosts__GroupStream_MemberCase_prefill ---------- ");
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = req.session.user._id;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var IsQS = req.body.IsQS ? req.body.IsQS : false;

	if(!CapsuleId) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var streamPageIds = req.body.streamPageIds || [];
	for(var i = 0; i < streamPageIds.length; i++) {
		streamPageIds[i] = await getPageIdByStream(streamPageIds[i]);
	}

	if(!streamPageIds.length) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}
	console.log("streamPageIds ---------- ", streamPageIds);
	var conditions = {
		_id : { $in: streamPageIds },
		IsDeleted : false
	};

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	var PostToPopulate = {
		"Medias.PostType" : "QuestionPost"
	};
	//allocate table to each one-to-one meeting for normal table case
	Page.aggregate([
		{ $match: conditions },
		{ $match: PostToPopulate },
		{ $unwind : "$Medias" },
		{ $match: PostToPopulate },
		{
			$lookup: {
				from: "Pages",
				localField: "Medias._id",
				foreignField: "Medias.QuestionPostId",
				as: "AnswerPosts"
			}
		},
		{ $unwind : { path: "$AnswerPosts", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				_id : "$_id",
				CapsuleId: CapsuleId,
				PageId: "$_id",
				PostId: "$Medias._id",
				PostOriginatedFrom: "$Medias.OriginatedFrom",
				//PostStatement : "$Medias.PostStatement",
				"PostStatement" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				SyncedBy: "$Medias.PostedBy",
				ReceiverEmails: "",
				CreatedOn: "$Medias.PostedOn",
				Delivered : true,
				//VisualUrlsOld : ["$Medias.MediaURL", "$Medias.MediaURL"],
				VisualUrls : [
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					},
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					}
				],
				SoundFileUrl : "",
				TextAboveVisual : "",
				"TextBelowVisual" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				DateOfDelivery : "",
				BlendMode : "",
				EmailTemplate : "",
				Subject : "",
				IsOnetimeStream : true,
				IsOnlyPostImage : true,
				//AnswerPosts : "$AnswerPosts",
				AnswerPostsObj: {
					$filter : {
						input: "$AnswerPosts.Medias",
						as : "field",
						cond : {
							$and : [
								{ $eq : ["$$field.QuestionPostId", "$Medias._id"] },
								//{ $eq : ["$$field.PostedBy", loginUserId] },
								{ $eq : ["$$field.PostType", "AnswerPost"] }
							]
						}
					}
				}
			}
		},
		{ $unwind : { path : "$AnswerPostsObj", includeArrayIndex: "AnswerPostsArrayIndex", preserveNullAndEmptyArrays : true} },
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostOriginatedFrom: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				AnswerPostsObj : 1,
				AnswerPostsArrayIndex : 1
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "AnswerPostsObj.PostedBy",
				foreignField: "_id",
				as: "AnswerPostsObj.SharedByUser"
			}
		},
		{
			$group : {
				_id : "$PostId",
				CapsuleId: { $first : "$CapsuleId" },
				PageId: { $first : "$PageId" },
				PostId: { $first : "$PostId" },
				PostOriginatedFrom: { $first: "$PostOriginatedFrom" },
				PostStatement : { $first : "$PostStatement" },
				SyncedBy: { $first : "$SyncedBy" },
				ReceiverEmails: { $first : "$ReceiverEmails" },
				CreatedOn: { $first : "$CreatedOn" },
				Delivered : { $first : "$Delivered" },
				VisualUrls : { $first : "$VisualUrls" },
				SoundFileUrl : { $first : "$SoundFileUrl" },
				TextAboveVisual : { $first : "$TextAboveVisual" },
				TextBelowVisual : { $first : "$TextBelowVisual" },
				DateOfDelivery : { $first : "$DateOfDelivery" },
				BlendMode : { $first : "$BlendMode" },
				EmailTemplate : { $first : "$EmailTemplate" },
				Subject : { $first : "$Subject" },
				IsOnetimeStream : { $first : "$IsOnetimeStream" },
				IsOnlyPostImage : { $first : "$IsOnlyPostImage" },
				//AnswerPosts : "$AnswerPosts",
				AnswerPostsObj: {
					$push : {
						$cond:[
							{ $and : [{$gte: ["$AnswerPostsArrayIndex", 0]}, {$eq : ["$AnswerPostsObj.PostedBy", ObjectId(loginUserId)]}] },
							//{ $gte: ["$AnswerPostsArrayIndex", 0] },
							{
								"CapsuleId": "$CapsuleId",
								"PageId": "$PageId",
								"PostId": "$AnswerPostsObj._id",
								"PostStatement" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"Content" : "$AnswerPostsObj.Content",
								"SyncedBy": "$AnswerPostsObj.PostedBy",
								"ReceiverEmails": "",
								"CreatedOn": "$AnswerPostsObj.PostedOn",
								"Delivered" : true,
								/*"VisualUrls" : [
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									},
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									}
								],*/
								"VisualUrls" : [
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$ne": ["$AnswerPostsObj.MediaType", "Video"]},{"$ne": ["$AnswerPostsObj.MediaType", "Link"]}] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									},
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									}
								],
								"SoundFileUrl" : "",
								"TextAboveVisual" : "",
								"TextBelowVisual" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"DateOfDelivery" : "",
								"BlendMode" : "",
								"EmailTemplate" : "",
								"Subject" : "",
								"IsOnetimeStream" : true,
								"IsOnlyPostImage" : true,
								"PostType": "$AnswerPostsObj.PostType",
								"MediaType": "$AnswerPostsObj.MediaType",
								"ContentType": "$AnswerPostsObj.ContentType",
								"QuestionPostId": "$AnswerPostsObj.QuestionPostId",
								"SharedByUser" : "$AnswerPostsObj.SharedByUser"
							},
							"$$REMOVE"
						]
					}
				}
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostOriginatedFrom: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				AnswerPostsObj : 1
			}
		},
		{
			$group : {
				_id : "$PostOriginatedFrom",
				CapsuleId: { $first: "$CapsuleId" },
				PageId: { $first: "$PageId" },
				PostId: { $first: "$PostId" },
				PostOriginatedFrom: { $first: "$PostOriginatedFrom" },
				PostStatement : { $first: "$PostStatement" },
				SyncedBy: { $first: "$SyncedBy" },
				ReceiverEmails: { $first: "$ReceiverEmails" },
				CreatedOn: { $first: "$CreatedOn" },
				Delivered : { $first: "$Delivered" },
				VisualUrls : { $first: "$VisualUrls" },
				SoundFileUrl : { $first: "$SoundFileUrl" },
				TextAboveVisual : { $first: "$TextAboveVisual" },
				TextBelowVisual : { $first: "$TextBelowVisual" },
				DateOfDelivery : { $first: "$DateOfDelivery" },
				BlendMode : { $first: "$BlendMode" },
				EmailTemplate : { $first: "$EmailTemplate" },
				Subject : { $first: "$Subject" },
				IsOnetimeStream : { $first: "$IsOnetimeStream" },
				IsOnlyPostImage : { $first: "$IsOnlyPostImage" },
				AnswerPostsObj : { $push: "$AnswerPostsObj" },
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostOriginatedFrom: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				AnswerPostsObj : {
					$reduce: {
						input: "$AnswerPostsObj",
						initialValue: [],
						in: {
							$concatArrays: [ "$$this", "$$value"]
						}
					}
				}
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				"CapsuleData.IsOnlyPostImage": 1,
				"PageData" : 1,
				"AnswerPostsObj" : 1
			}
		},
		//{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{ $sort : {CreatedOn : -1, _id : 1} }
	], async function (err, syncedPostsResults) {
		console.log("err ---------------- ", err);
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length myStreamPosts__GroupStream_MemberCase = ", syncedPostsResults.length);
		if ( !err ) {
			var OwnerDetails = await User.findOne({_id : ObjectId(OwnerId), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
			OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

			var streamPosts = [];
			try {
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					var dataRecord = syncedPostsResults[loop];

					dataRecord.AnswerPostsObj = dataRecord.AnswerPostsObj ? dataRecord.AnswerPostsObj : [];
					for(let ap = 0; ap < dataRecord.AnswerPostsObj.length; ap++) {
						dataRecord.AnswerPostsObj[ap].SharedByUser = dataRecord.AnswerPostsObj[ap].SharedByUser ? dataRecord.AnswerPostsObj[ap].SharedByUser[0] : {};
					}

					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PostType = 'Post';
					dataRecord.KeyPostType = null;
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

							dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
							dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
							if(dataRecord.PostType == 'KeyPost') {
								dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
							}

							break;
						}
					}

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}
					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					//if(dataRecord.PostType == 'InfoPost') {
						let loginUserName = req.session.user.Name.split(' ')[0];
						let sharedbyusername = OwnerDetails.Name.split(' ')[0];
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, sharedbyusername);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, sharedbyusername);

						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
					//}

					if(dataRecord.PostType == 'QuestionPost' && dataRecord.MediaType != 'Notes') {
						//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.hexcode_blendedImage : dataRecord.hexcode_blendedImage;
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[1] : dataRecord.VisualUrls[1];
						}

						if(dataRecord.MediaType == 'Video') {
							//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}
					}

					if((dataRecord.PostType == 'InfoPost' || dataRecord.PostType == 'InfoPostOwner') && dataRecord.MediaType != 'Notes') {
						//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.hexcode_blendedImage : dataRecord.hexcode_blendedImage;
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[1] : dataRecord.VisualUrls[1];
						}

						if(dataRecord.MediaType == 'Video') {
							//dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}
					}

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}


					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						if(blendImage1 != blendImage2) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								//if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								//}
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1 ? blendImage1 : '';
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;


					if(dataRecord.MediaType == 'Video') {
						dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
						dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
					}

					var CapsuleData = {
						IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
					};
					dataRecord.CapsuleData = CapsuleData;

					delete dataRecord.PageData;
					streamPosts.push(dataRecord);
				}
				return res.json({"code":"200", message : "success", results: streamPosts});
			} catch (error) {
				console.log("caughtError -- 9999999", error);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: error, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : []});
		}
	});
}

var myStreamPosts__GroupStream_OwnerCase_InfoPosts = async function (req, res) {
	console.log("------------- myStreamPosts__GroupStream_OwnerCase_InfoPosts ---------- ");
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var loginUserId = req.session.user._id;
	var IsQS = req.body.IsQS ? req.body.IsQS : false;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;

	if(!CapsuleId) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var streamPageId = await getPageIdByStream(CapsuleId);
	if(!streamPageId) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}
	console.log("streamPageId ---------- ", streamPageId);
	var conditions = {
		_id : ObjectId(String(streamPageId)),
		IsDeleted : false
	};

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	var TypeOfPostsToShow = [];
	if(String(loginUserId)===String(OwnerId)) {
		TypeOfPostsToShow = ["InfoPostOwner"];
	}
	var IsOwnerAnswerAllowed = req.body.IsOwnerAnswerAllowed ? req.body.IsOwnerAnswerAllowed : false;
	if(IsOwnerAnswerAllowed) {
		TypeOfPostsToShow.push("QuestionPost");
	}

	var PostToPopulate = {
		"Medias.PostType" : { $in : TypeOfPostsToShow }
	};
	//allocate table to each one-to-one meeting for normal table case
	Page.aggregate([
		{ $match: conditions },
		{ $match: PostToPopulate },
		{ $unwind : "$Medias" },
		{ $match: PostToPopulate },
		{
			$lookup: {
				from: "Pages",
				localField: "Medias._id",
				foreignField: "Medias.QuestionPostId",
				as: "AnswerPosts"
			}
		},
		{ $unwind : { path: "$AnswerPosts", preserveNullAndEmptyArrays: true } },
		{
			$project: {
				_id : "$_id",
				CapsuleId: CapsuleId,
				PageId: streamPageId,
				PostId: "$Medias._id",
				//PostStatement : "$Medias.PostStatement",
				"PostStatement" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				SyncedBy: "$Medias.PostedBy",
				ReceiverEmails: "",
				CreatedOn: "$Medias.PostedOn",
				Delivered : true,
				//VisualUrls : ["$Medias.MediaURL", "$Medias.MediaURL"],
				VisualUrls : [
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					},
					{
					  $cond: {
						if: {
						  $eq: ['$Medias.MediaURL', null]
						},
						then: '$Medias.thumbnail',
						else: '$Medias.MediaURL',
					  }
					}
				],
				SoundFileUrl : "",
				TextAboveVisual : "",
				//TextBelowVisual : "$Medias.PostStatement",
				"TextBelowVisual" : {
					$cond:[
						{ $ne: ["$Medias.MediaType", "Notes"] },
						"$Medias.PostStatement",
						"$Medias.Content"
					]
				},
				DateOfDelivery : "",
				BlendMode : "",
				EmailTemplate : "",
				Subject : "",
				IsOnetimeStream : true,
				IsOnlyPostImage : true,
				IsPrivateQuestionPost: "$Medias.IsPrivateQuestionPost",
				AnswerPostsObj: {
					$filter : {
						input: "$AnswerPosts.Medias",
						as : "field",
						cond : {
							$and : [
								{ $eq : ["$$field.QuestionPostId", "$Medias._id"] },
								//{ $eq : ["$$field.PostedBy", loginUserId] },
								{ $eq : ["$$field.PostType", "AnswerPost"] }
							]
						}
					}
				}
			}
		},
		{ $unwind : { path : "$AnswerPostsObj", includeArrayIndex: "AnswerPostsArrayIndex", preserveNullAndEmptyArrays : true} },
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				AnswerPostsObj : 1,
				AnswerPostsArrayIndex: 1
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "AnswerPostsObj.PostedBy",
				foreignField: "_id",
				as: "AnswerPostsObj.SharedByUser"
			}
		},
		{
			$group : {
				_id : "$PostId",
				CapsuleId: { $first : "$CapsuleId" },
				PageId: { $first : "$PageId" },
				PostId: { $first : "$PostId" },
				PostStatement : { $first : "$PostStatement" },
				SyncedBy: { $first : "$SyncedBy" },
				ReceiverEmails: { $first : "$ReceiverEmails" },
				CreatedOn: { $first : "$CreatedOn" },
				Delivered : { $first : "$Delivered" },
				VisualUrls : { $first : "$VisualUrls" },
				SoundFileUrl : { $first : "$SoundFileUrl" },
				TextAboveVisual : { $first : "$TextAboveVisual" },
				TextBelowVisual : { $first : "$TextBelowVisual" },
				DateOfDelivery : { $first : "$DateOfDelivery" },
				BlendMode : { $first : "$BlendMode" },
				EmailTemplate : { $first : "$EmailTemplate" },
				Subject : { $first : "$Subject" },
				IsOnetimeStream : { $first : "$IsOnetimeStream" },
				IsOnlyPostImage : { $first : "$IsOnlyPostImage" },
				IsPrivateQuestionPost: { $first: "$IsPrivateQuestionPost" },
				//AnswerPosts : "$AnswerPosts",
				AnswerPostsObj: {
					$push : {
						$cond:[
							{ $and : [{$gte: ["$AnswerPostsArrayIndex", 0]}, {$eq : ["$AnswerPostsObj.PostedBy", ObjectId(loginUserId)]}] },
							//{ $gte: ["$AnswerPostsArrayIndex", 0] },
							{
								"CapsuleId": "$CapsuleId",
								"PageId": "$PageId",
								"PostId": "$AnswerPostsObj._id",
								"PostStatement" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"Content" : "$AnswerPostsObj.Content",
								"SyncedBy": "$AnswerPostsObj.PostedBy",
								"ReceiverEmails": "",
								"CreatedOn": "$AnswerPostsObj.PostedOn",
								"Delivered" : true,
								/*"VisualUrls" : [
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									},
									{
										$cond:[
											{ $ne: ["$AnswerPostsObj.MediaURL", /unsplash/] },
											{ $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] },
											"$AnswerPostsObj.MediaURL"
										]
									}
								],*/
								"VisualUrls" : [
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$ne": ["$AnswerPostsObj.MediaType", "Video"]},{"$ne": ["$AnswerPostsObj.MediaType", "Link"]}] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									},
									{
										"$switch": {
											"branches": [
												{ "case": { "$eq": ["$AnswerPostsObj.MediaType", "Video"] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/video/600/", "$AnswerPostsObj.thumbnail"] } },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", true] }] }, "then": "$AnswerPostsObj.thumbnail" },
												{ "case": { "$and" : [{"$eq": ["$AnswerPostsObj.MediaType", "Link"]}, { $eq: ["$AnswerPostsObj.IsUnsplashImage", false] }] }, "then": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.thumbnail"] } }
											],
											"default": { $concat : ["https://www.scrpt.com/assets/Media/img/600/", "$AnswerPostsObj.MediaURL"] }
										}
									}
								],
								"SoundFileUrl" : "",
								"TextAboveVisual" : "",
								"TextBelowVisual" : {
									$cond:[
										{ $ne: ["$AnswerPostsObj.MediaType", "Notes"] },
										"$AnswerPostsObj.PostStatement",
										"$AnswerPostsObj.Content"
									]
								},
								"DateOfDelivery" : "",
								"BlendMode" : "",
								"EmailTemplate" : "",
								"Subject" : "",
								"IsOnetimeStream" : true,
								"IsOnlyPostImage" : true,
								"PostType": "$AnswerPostsObj.PostType",
								"MediaType": "$AnswerPostsObj.MediaType",
								"ContentType": "$AnswerPostsObj.ContentType",
								"QuestionPostId": "$AnswerPostsObj.QuestionPostId",
								"SharedByUser" : "$AnswerPostsObj.SharedByUser"
							},
							"$$REMOVE"
						]
					}
				}
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				AnswerPostsObj : 1
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				IsPrivateQuestionPost: 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				"CapsuleData.IsOnlyPostImage": 1,
				"PageData" : 1,
				"AnswerPostsObj" : 1
			}
		},
		//{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{ $sort : {CreatedOn : -1, _id : 1} }
	], async function (err, syncedPostsResults) {
		console.log("err ---------------- ", err);
		console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length = ", syncedPostsResults.length);
		if ( !err ) {
			var streamPosts = [];
			try {
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					var dataRecord = syncedPostsResults[loop];

					dataRecord.AnswerPostsObj = dataRecord.AnswerPostsObj ? dataRecord.AnswerPostsObj : [];
					for(let ap = 0; ap < dataRecord.AnswerPostsObj.length; ap++) {
						dataRecord.AnswerPostsObj[ap].SharedByUser = dataRecord.AnswerPostsObj[ap].SharedByUser ? dataRecord.AnswerPostsObj[ap].SharedByUser[0] : {};
					}

					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = dataRecord.PageData ? dataRecord.PageData[0] : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PostType = 'Post';
					dataRecord.KeyPostType = null;
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							dataRecord.PostType = dataRecord.PageData.Medias[i].PostType ? dataRecord.PageData.Medias[i].PostType : 'Post';

							dataRecord.MediaType = dataRecord.PageData.Medias[i].MediaType ? dataRecord.PageData.Medias[i].MediaType : '';
							dataRecord.ContentType = dataRecord.PageData.Medias[i].ContentType ? dataRecord.PageData.Medias[i].ContentType : '';
							if(dataRecord.PostType == 'KeyPost') {
								dataRecord.KeyPostType = dataRecord.PageData.Medias[i].KeyPostType ? dataRecord.PageData.Medias[i].KeyPostType : 'Comment';
							}

							break;
						}
					}

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}
					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					if(dataRecord.PostType == 'InfoPostOwner' || dataRecord.PostType == 'QuestionPost') {
						let loginUserName = req.session.user.Name.split(' ')[0];
						let sharedbyusername = dataRecord.SharedByUser.Name.split(' ')[0];
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
						dataRecord.PostStatement = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Owner}/g, loginUserName);
						dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{OwnerName}/g, loginUserName);

						//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						//dataRecord.PostStatement = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
						//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{Member}/g, loginUserName);
						//dataRecord.TextBelowVisual = dataRecord.PostStatement.replace(/{MemberName}/g, loginUserName);
					}

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					if(dataRecord.VisualUrls.length == 1) {
						dataRecord.VisualUrls[0] = typeof dataRecord.VisualUrls[0] == 'string' ? dataRecord.VisualUrls[0] : '';
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
						}

						if(dataRecord.MediaType == 'Video') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
						}

						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						dataRecord.VisualUrls[0] = typeof dataRecord.VisualUrls[0] == 'string' ? dataRecord.VisualUrls[0] : '';
						dataRecord.VisualUrls[1] = typeof dataRecord.VisualUrls[1] == 'string' ? dataRecord.VisualUrls[1] : '';
						if(typeof dataRecord.VisualUrls[0] == 'string' && typeof dataRecord.VisualUrls[1] == 'string') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[0] : dataRecord.VisualUrls[0];
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/600/"+dataRecord.VisualUrls[1] : dataRecord.VisualUrls[1];
						}

						if(dataRecord.MediaType == 'Video') {
							dataRecord.VisualUrls[0] = dataRecord.VisualUrls[0].replace('/Media/img/','/Media/video/');
							dataRecord.VisualUrls[1] = dataRecord.VisualUrls[1].replace('/Media/img/','/Media/video/');
						}

						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}


					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						if(blendImage1 != blendImage2) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								//if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								//}
							}
						}
					}
					console.log("blendImage1 --------------------------------- ", blendImage1);
					console.log("blendImage2 --------------------------------- ", blendImage2);
					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;

					if(dataRecord.MediaType == 'Video') {
						dataRecord.hexcode_blendedImage = dataRecord.hexcode_blendedImage.replace('/Media/img/','/Media/video/');
					}

					var CapsuleData = {
						IsOnlyPostImage : dataRecord.CapsuleData.IsOnlyPostImage ? dataRecord.CapsuleData.IsOnlyPostImage : false
					};
					dataRecord.CapsuleData = CapsuleData;

					delete dataRecord.PageData;
					streamPosts.push(dataRecord);
				}
				return res.json({"code":"200", message : "success", results: streamPosts});
			} catch (caughtError) {
				console.log("caughtError --------------------------------------------------- ", caughtError);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: caughtError, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : []});
		}
	});
}

var addCommentOnSocialPost = async function(req, res) {
	var id = req.body.id ? req.body.id : null;
	var streamId = req.body.StreamId ? req.body.StreamId : null;
	var ownerId = req.body.OwnerId ? req.body.OwnerId : null;
	var postOwnerId = req.body.PostOwnerId ? req.body.PostOwnerId : null;

	var loginUserId = req.session.user._id;
	var loginUserName = req.session.user.Name;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}


	var dataToSave = {
		UserId : req.session.user._id,
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null,
		SocialPostId : req.body.SocialPostId ? req.body.SocialPostId : null,
		hexcode_blendedImage : req.body.hexcode_blendedImage ? req.body.hexcode_blendedImage : null,
		Comment : req.body.Comment ? req.body.Comment : null,
		PrivacySetting : req.body.PrivacySetting ? req.body.PrivacySetting : "PublicWithName"
	};

	if( !id ) {
		StreamComments(dataToSave).save(async function(err, results){
			var conditions = {
				SocialPageId : ObjectId(dataToSave.SocialPageId),
				ParentId : { $exists : false },
				//SocialPostId: ObjectId(dataToSave.SocialPostId),
				IsDeleted: 0,
				$or : [
					{ PrivacySetting : { $exists : false } },
					{ PrivacySetting : 'PublicWithName' },
					//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
					{ PrivacySetting : { $in : ['OnlyForOwner', 'InvitedFriends'] }, UserId : loginUserId },
					{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
				]
			};
			var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
			comments = Array.isArray(comments) ? comments : [];

			if(!err) {

				if(postOwnerId && (postOwnerId != loginUserId)) {
					notifyMembers([postOwnerId], loginUserName, 'commented on', streamId);
				}

				return res.json({
					status : "success",
					message : "comment saved successfully.",
					results : comments
				});
			}

			return res.json({
				status : "failed",
				message : "Failed.",
				results : comments
			});
		});
	} else {
		var conditions = {
			_id : ObjectId(id),
			UserId : req.session.user._id
		};

		var dataToUpdate = {
			Comment : req.body.Comment ? req.body.Comment : null
		};

		StreamComments.update(conditions, { $set : dataToUpdate }, async function(err, results){
			var conditions = {
				SocialPageId : ObjectId(dataToSave.SocialPageId),
				ParentId : { $exists : false },
				//SocialPostId: ObjectId(dataToSave.SocialPostId),
				IsDeleted: 0,
				$or : [
					{ PrivacySetting : { $exists : false } },
					{ PrivacySetting : 'PublicWithName' },
					//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
					{ PrivacySetting : { $in : ['OnlyForOwner', 'InvitedFriends'] }, UserId : loginUserId },
					{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
				]
			};
			var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
			comments = Array.isArray(comments) ? comments : [];

			if(!err) {
				return res.json({
					status : "success",
					message : "comment saved successfully.",
					results : comments
				});
			}

			return res.json({
				status : "failed",
				message : "Failed.",
				results : comments
			});
		});
	}
}

var deleteCommentOnSocialPost = async function(req, res) {
	var id = req.body.id ? req.body.id : null;

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	var dataToSave = {
		UserId : req.session.user._id,
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null,
		SocialPostId : req.body.SocialPostId ? req.body.SocialPostId : null,
		Comment : req.body.Comment ? req.body.Comment : null
	};

	var conditions = {
		_id : ObjectId(id),
		UserId : req.session.user._id
	};

	var dataToUpdate = {
		IsDeleted : 1
	};

	StreamComments.update(conditions, { $set : dataToUpdate }, async function(err, results){
		var conditions = {
			SocialPageId : ObjectId(dataToSave.SocialPageId),
			ParentId : { $exists : false },
			//SocialPostId: ObjectId(dataToSave.SocialPostId),
			IsDeleted: 0,
			$or : [
					{ PrivacySetting : { $exists : false } },
					{ PrivacySetting : 'PublicWithName' },
					//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
					{ PrivacySetting : { $in : ['OnlyForOwner', 'InvitedFriends'] }, UserId : loginUserId },
					{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
				]
		};
		var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
		comments = Array.isArray(comments) ? comments : [];

		if(!err) {
			return res.json({
				status : "success",
				message : "comment deleted successfully.",
				results : comments
			});
		}

		return res.json({
			status : "failed",
			message : "Failed.",
			results : comments
		});
	});
}

var getStreamComments = async function(req, res) {
	var inputObj = {
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null
	};

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	var conditions = {
		SocialPageId : ObjectId(inputObj.SocialPageId),
		ParentId : { $exists : false },
		IsDeleted: 0,
		$or : [
			{ PrivacySetting : { $exists : false } },
			{ PrivacySetting : 'PublicWithName' },
			//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
			{ PrivacySetting : { $in : ['OnlyForOwner', 'InvitedFriends'] }, UserId : loginUserId },
			{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
		]
	};

	var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
	comments = Array.isArray(comments) ? comments : [];

	return res.json({
		status : "success",
		message : "comment saved successfully.",
		results : comments
	});
}

var addStreamPostLike = async function(req, res) {
	var streamId = req.body.StreamId ? req.body.StreamId : null;
	var ownerId = req.body.OwnerId ? req.body.OwnerId : null;
	var postOwnerId = req.body.PostOwnerId ? req.body.PostOwnerId : null;

	var loginUserId = req.session.user._id;
	var loginUserName = req.session.user.Name;

	var dataToSave = {
		UserId : req.session.user._id,
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null,
		SocialPostId : req.body.SocialPostId ? req.body.SocialPostId : null,
		hexcode_blendedImage : req.body.hexcode_blendedImage ? req.body.hexcode_blendedImage : null
	};

	StreamLikes(dataToSave).save(async function(err, result){
		var conditions = {
			SocialPageId : ObjectId(dataToSave.SocialPageId),
			//SocialPostId: ObjectId(dataToSave.SocialPostId),
			IsDeleted: 0
		};
		var results = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic');
		results = Array.isArray(results) ? results : [];

		if(!err) {
			if(postOwnerId && (postOwnerId != loginUserId)) {
				notifyMembers([postOwnerId], loginUserName, 'liked', streamId);
			}

			return res.json({
				status : "success",
				message : "comment saved successfully.",
				results : results
			});
		}

		return res.json({
			status : "failed",
			message : "Failed.",
			results : results
		});
	});
}

var removeStreamPostLike = async function(req, res) {
	var conditions = {
		UserId : req.session.user._id,
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null,
		SocialPostId : req.body.SocialPostId ? req.body.SocialPostId : null,
		hexcode_blendedImage : req.body.hexcode_blendedImage ? req.body.hexcode_blendedImage : null
	};

	var dataToUpdate = {
		IsDeleted : 1
	};

	StreamLikes.update(conditions, { $set : dataToUpdate }, {multi : true}, async function(err, result){
		conditions = {
			SocialPageId : ObjectId(conditions.SocialPageId),
			//SocialPostId: ObjectId(inputObj.SocialPostId),
			IsDeleted: 0
		};
		var results = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic');
		results = Array.isArray(results) ? results : [];

		if(!err) {
			return res.json({
				status : "success",
				message : "comment saved successfully.",
				results : results
			});
		}

		return res.json({
			status : "failed",
			message : "Failed.",
			results : results
		});
	});
}

var getStreamLikes = async function(req, res) {
	var SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;

	var conditions = {
		SocialPageId : ObjectId(SocialPageId),
		IsDeleted: 0
	};

	var results = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic');
	results = Array.isArray(results) ? results : [];

	return res.json({
		status : "success",
		message : "Post likes.",
		results : results
	});
}


var addLike = async function(req, res) {
	var CommentId = req.body.CommentId ? req.body.CommentId : null;
	var SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;
	var dataToSave = {
		SocialPageId : ObjectId(SocialPageId),
		CommentId : ObjectId(CommentId),
		LikedById : req.session.user._id
	};

	StreamCommentLikes(dataToSave).save(async function(err, results){
		var conditions = {
			SocialPageId : ObjectId(SocialPageId),
			IsDeleted: 0
		};
		var likes = await StreamCommentLikes.find(conditions).populate('LikedById', '_id Name Email ProfilePic');
		likes = Array.isArray(likes) ? likes : [];

		if(!err) {
			return res.json({
				status : "success",
				message : "Liked successfully.",
				results : likes
			});
		}

		return res.json({
			status : "failed",
			message : "Failed.",
			results : likes
		});
	});
}

var removeLike = async function(req, res) {
	var CommentId = req.body.CommentId ? req.body.CommentId : null;
	var SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;
	var conditions = {
		SocialPageId : ObjectId(SocialPageId),
		CommentId : ObjectId(CommentId),
		LikedById : req.session.user._id,
		IsDeleted : 0
	};

	StreamCommentLikes.update(conditions, { $set : {IsDeleted : 1} }, async function(err, results){
		var conditions = {
			SocialPageId : ObjectId(SocialPageId),
			IsDeleted: 0
		};
		var likes = await StreamCommentLikes.find(conditions).populate('LikedById', '_id Name Email ProfilePic');
		likes = Array.isArray(likes) ? likes : [];

		if(!err) {
			return res.json({
				status : "success",
				message : "Like removed successfully.",
				results : likes
			});
		}

		return res.json({
			status : "failed",
			message : "Failed.",
			results : likes
		});
	});
}

var getStreamCommentsLikes = async function(req, res) {
	var SocialPageIdArr = req.body.SocialPageId ? req.body.SocialPageId.split(',') : [];

	for(var i = 0; i < SocialPageIdArr.length; i++) {
		SocialPageIdArr[i] = ObjectId(SocialPageIdArr[i]);
	}

	if(!SocialPageIdArr.length) {
		return res.json({
			status : "success",
			message : "Likes list.",
			results : []
		});
	}

	var conditions = {
		SocialPageId : { $in : SocialPageIdArr },
		IsDeleted: 0
	};
	console.log("conditions - ", conditions);
	var likes = await StreamCommentLikes.find(conditions).populate('LikedById', '_id Name Email ProfilePic');
	likes = Array.isArray(likes) ? likes : [];

	return res.json({
		status : "success",
		message : "Likes list.",
		results : likes
	});
}


//start stream public page apis
var userStreamsPostsWithActivities_GroupCase = async function (req, res) {
	var SelectedTeam = req.body.SelectedTeam ? req.body.SelectedTeam : null;
	var StreamIds = req.body.StreamIds ? req.body.StreamIds : null;

	if(!SelectedTeam) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	var UserEmailsAndStreamsMap = {};
	SelectedTeam.MemberEmails = SelectedTeam.MemberEmails ? SelectedTeam.MemberEmails : [];
	SelectedTeam.StreamIds = StreamIds ? StreamIds : [];
	SelectedTeam.MemberEmails.push({Email : req.session.user.Email, StreamIds : SelectedTeam.StreamIds});

	for(var i = 0; i < SelectedTeam.MemberEmails.length; i++) {
		if(SelectedTeam.MemberEmails[i].Email) {
			let sIds = SelectedTeam.MemberEmails[i].StreamIds ? SelectedTeam.MemberEmails[i].StreamIds : [];
			for (var j = 0; j < sIds.length; j++) {
				sIds[j] = ObjectId(sIds[j]);
			}
			UserEmailsAndStreamsMap[SelectedTeam.MemberEmails[i].Email] = sIds ? sIds : [];
		}
	}


	var UserEmails = Object.keys(UserEmailsAndStreamsMap);


	if(!UserEmails.length) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var UserArr = await User.find({Email : {$in : UserEmails}, IsDeleted : 0, Status : 1}, {_id: 1, Email : 1});
	UserArr = Array.isArray(UserArr) ? UserArr : [];
	if(!UserArr.length) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var conditions = {
		IsDeleted : false,
		Status : true,
		"EmailEngineDataSets.Delivered" : false
	};

	OrConditions = [];
	var UserIds = [];
	for(var i = 0; i < UserArr.length; i++) {
		var userObj = UserArr[i];
		if(UserEmailsAndStreamsMap[userObj.Email]) {
			UserEmailsAndStreamsMap[userObj.Email] = UserEmailsAndStreamsMap[userObj.Email] ? UserEmailsAndStreamsMap[userObj.Email] : [];
			if(UserEmailsAndStreamsMap[userObj.Email].length) {
				var OrCondition = {};
				OrCondition.SyncedBy = ObjectId(userObj._id);
				OrCondition.CapsuleId = { $in : UserEmailsAndStreamsMap[userObj.Email] };
				OrConditions.push(OrCondition);
				UserIds.push(OrCondition.SyncedBy);
			}
		}
	}

	if(!OrConditions.length) {
		return res.json({"code":"404", message : "No stream found.", results: [], OrConditions : OrConditions});
	}

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	//allocate table to each one-to-one meeting for normal table case
    SyncedPost.aggregate([
        { $match: conditions },
		{ $unwind : "$EmailEngineDataSets" },
        {
            $project: {
                _id : "$_id",
                CapsuleId: "$CapsuleId",
				PageId: "$PageId",
				PostId: "$PostId",
				PostStatement : "$PostStatement",
                SyncedBy: "$SyncedBy",
				ReceiverEmails: "$ReceiverEmails",
                CreatedOn: "$CreatedOn",
                Delivered : "$EmailEngineDataSets.Delivered",
				VisualUrls : "$EmailEngineDataSets.VisualUrls",
				SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
				TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
				TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
				DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
				BlendMode : "$EmailEngineDataSets.BlendMode",
				EmailTemplate : "$EmailTemplate",
				Subject : "$EmailSubject",
				IsOnetimeStream : "$IsOnetimeStream",
				IsOnlyPostImage : "$IsOnlyPostImage"
            }
        },
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
        { $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{
			$project :	{
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
                SyncedBy: 1,
				ReceiverEmails: 1,
                CreatedOn: 1,
                Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				"PageData._id": 1,
				"PageData.OriginatedFrom": 1,
				"PageData.Medias._id": 1,
				"PageData.Medias.OriginatedFrom": 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1
			}
		},
		{ $sort : {CapsuleId : 1, DateOfDelivery : -1} }
    ]).allowDiskUse(true).exec(async function (err, syncedPostsResults) {
		//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length = ", syncedPostsResults.length);
		if ( !err ) {
			var streamPosts = [];
			try {
				var allPosts = [];
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					let dataRecord1 = syncedPostsResults[loop];
					//console.log("dataRecord1 = ", dataRecord1);
					dataRecord1.PageData = Array.isArray(dataRecord1.PageData) ? dataRecord1.PageData[0] : {};
					dataRecord1.PageData.OriginatedFrom = dataRecord1.PageData.OriginatedFrom ? dataRecord1.PageData.OriginatedFrom : null;
					dataRecord1.PageData.Medias = dataRecord1.PageData.Medias ? dataRecord1.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord1.SocialPageId = dataRecord1.PageData.OriginatedFrom ? dataRecord1.PageData.OriginatedFrom : null;

					for(var i = 0; i < dataRecord1.PageData.Medias.length; i++) {
						if(String(dataRecord1.PostId) == String(dataRecord1.PageData.Medias[i]._id) && dataRecord1.PageData.Medias[i].OriginatedFrom) {
							dataRecord1.SocialPostId = dataRecord1.PageData.Medias[i].OriginatedFrom;
							break;
						}
					}

					if(!dataRecord1.SocialPageId || !dataRecord1.SocialPostId) {
						continue;
					}

					allPosts.push(ObjectId(dataRecord1.SocialPostId));
				}

				//console.log("allPosts = ", allPosts);
				var activityMapObj = {};
				//get all activities -
				//1) comments
				var conditions = {
					ParentId : { $exists : false },
					SocialPostId: { $in : allPosts },
					UserId : { $in : UserIds },
					IsDeleted : false,
					$or : [
						{ PrivacySetting : { $exists : false } },
						{ PrivacySetting : 'PublicWithName' },
						//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
						//{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
						{ PrivacySetting : 'InvitedFriends' },
					]
				};

				var SocialPostsWithCommentsArr = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic').lean();
				SocialPostsWithCommentsArr = Array.isArray(SocialPostsWithCommentsArr) ? SocialPostsWithCommentsArr : [];
				//console.log("SocialPostsWithCommentsArr = ", SocialPostsWithCommentsArr.length);

				for(var i = 0; i < SocialPostsWithCommentsArr.length; i++) {
					var ActivityText = `${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]} commented on this post.`;
					var ActivityTime = SocialPostsWithCommentsArr[i].CreatedOn;

					if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage]) {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage].MyComments.push(SocialPostsWithCommentsArr[i]);
					} else {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : [SocialPostsWithCommentsArr[i]]
						};
					}

					if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr']) {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'].push(`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`);
					} else {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'] =[`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`];
					}
				}

				//2) PostLike
				var conditions = {
					SocialPostId: { $in : allPosts },
					UserId : { $in : UserIds },
					IsDeleted : false
				};

				var SocialPostsWithLikesArr = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic').lean();
				SocialPostsWithLikesArr = Array.isArray(SocialPostsWithLikesArr) ? SocialPostsWithLikesArr : [];
				//console.log("SocialPostsWithLikesArr = ", SocialPostsWithLikesArr.length);

				for(var i = 0; i < SocialPostsWithLikesArr.length; i++) {
					var ActivityText = `${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]} liked this post.`;
					var ActivityTime = SocialPostsWithLikesArr[i].CreatedOn;

					if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage]) {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments ? activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments : []
						};
					} else {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : []
						};
					}

					if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr']) {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'].push(`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`);
					} else {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'] = [`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`];
					}
				}


				//console.log("activityMapObj = ", activityMapObj);
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					//console.log("loop = ", loop);
					var dataRecord = syncedPostsResults[loop];
					//console.log("dataRecord = ", dataRecord);
					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					dataRecord.SocialPageId = null;
					dataRecord.SocialPostId = null;

					dataRecord.PageData = typeof (dataRecord.PageData) == 'object' ? dataRecord.PageData : {};
					dataRecord.PageData.OriginatedFrom = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					dataRecord.PageData.Medias = dataRecord.PageData.Medias ? dataRecord.PageData.Medias : [];

					//there might be cases where the actual post or page has been deleted - In this case the post will no longer be visible in the social page

					dataRecord.SocialPageId = dataRecord.PageData.OriginatedFrom ? dataRecord.PageData.OriginatedFrom : null;
					for(var i = 0; i < dataRecord.PageData.Medias.length; i++) {
						if(String(dataRecord.PostId) == String(dataRecord.PageData.Medias[i]._id) && dataRecord.PageData.Medias[i].OriginatedFrom) {
							dataRecord.SocialPostId = dataRecord.PageData.Medias[i].OriginatedFrom;
							break;
						}
					}
					//console.log("dataRecord.PageData.Medias = ", dataRecord.PageData.Medias.length);
					delete dataRecord.PageData;

					dataRecord.ActivityText = '';
					dataRecord.ActivityTime = '';
					dataRecord.MyComments = [];

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}

					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}


					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						var data = blendImage1 + blendImage2 + blendOption;
						var hexcode = crypto.createHash('md5').update(data).digest("hex");
						if(hexcode) {
							var file_name = hexcode + '.png';
							var uploadDir = __dirname+'/../../media-assets/streamposts';

							if (fs.existsSync(uploadDir +"/"+ file_name)) {
								blendedImage = `/streamposts/${hexcode}.png`;
								condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;

					if(activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage]) {
						//console.log("INSIDE --------------");
						//dataRecord.ActivityText = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityText;
						dataRecord.ActivityTime = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityTime;
						dataRecord.MyComments = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments : [];

						dataRecord.ActivityObj = {
							LikeActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] : [],
							CommentActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] : []
						};

						dataRecord.ActivityObj.CommentActivityArr = dataRecord.ActivityObj.CommentActivityArr ? dataRecord.ActivityObj.CommentActivityArr : [];

						if(dataRecord.ActivityObj.CommentActivityArr.length) {
							var uniqueCommentArray = dataRecord.ActivityObj.CommentActivityArr.filter(function(item, pos) {
								return dataRecord.ActivityObj.CommentActivityArr.indexOf(item) == pos;
							})

							if(uniqueCommentArray.length == 1) {
								dataRecord.ActivityText = uniqueCommentArray[0]+' commented';
							} else if(uniqueCommentArray.length == 2) {
								dataRecord.ActivityText = uniqueCommentArray[0]+' and '+uniqueCommentArray[1]+' commented';
							} else if(uniqueCommentArray.length > 2) {
								dataRecord.ActivityText = uniqueCommentArray[0]+', '+uniqueCommentArray[1]+' and +'+(uniqueCommentArray.length - 2)+' members commented';
							}
						}

						if(dataRecord.ActivityObj.LikeActivityArr.length) {
							var uniqueLikeArray = dataRecord.ActivityObj.LikeActivityArr.filter(function(item, pos) {
								return dataRecord.ActivityObj.LikeActivityArr.indexOf(item) == pos;
							})

							if(uniqueLikeArray.length == 1) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' liked this post.' : uniqueLikeArray[0]+' liked this post.';
							} else if(uniqueLikeArray.length == 2) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.' : uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.';
							} else if(uniqueLikeArray.length > 2) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.' : uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.';
							}
						} else {
							dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' on this post.' : '';
						}
					}

					streamPosts.push(dataRecord);
				}
				//console.log("streamPosts.length ===== ", streamPosts.length);
				var finalArr = [];
				for(var i = 0; i < streamPosts.length; i++) {
					streamPosts[i].ActivityText = streamPosts[i].ActivityText ? streamPosts[i].ActivityText : null;
					streamPosts[i].hexcode_blendedImage = streamPosts[i].hexcode_blendedImage ? streamPosts[i].hexcode_blendedImage : null;
					if(!streamPosts[i].hexcode_blendedImage) {
						continue;
					}

					if(streamPosts[i].ActivityText && __getObjArrayIdxByKey (finalArr , 'hexcode_blendedImage' , streamPosts[i].hexcode_blendedImage) < 0) {
						finalArr.push(streamPosts[i]);
					}
				}
				return res.json({"code":"200", message : "success", results: finalArr});
			} catch (caughtError) {
				console.log("caughtError = ", caughtError);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: caughtError, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : [], err : err});
		}
	});
}

var userStreamsPostsWithActivities_GroupCase_V2 = async function (req, res) {
	var SelectedTeam = req.body.SelectedTeam ? req.body.SelectedTeam : null;
	var StreamIds = req.body.StreamIds ? req.body.StreamIds : null;

	if(!SelectedTeam) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	var UserEmailsAndStreamsMap = {};
	SelectedTeam.MemberEmails = SelectedTeam.MemberEmails ? SelectedTeam.MemberEmails : [];
	SelectedTeam.StreamIds = StreamIds ? StreamIds : [];
	SelectedTeam.MemberEmails.push({Email : req.session.user.Email, StreamIds : SelectedTeam.StreamIds});

	for(var i = 0; i < SelectedTeam.MemberEmails.length; i++) {
		if(SelectedTeam.MemberEmails[i].Email) {
			let sIds = SelectedTeam.MemberEmails[i].StreamIds ? SelectedTeam.MemberEmails[i].StreamIds : [];
			for (var j = 0; j < sIds.length; j++) {
				sIds[j] = ObjectId(sIds[j]);
			}
			UserEmailsAndStreamsMap[SelectedTeam.MemberEmails[i].Email] = sIds ? sIds : [];
		}
	}


	var UserEmails = Object.keys(UserEmailsAndStreamsMap);


	if(!UserEmails.length) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var UserArr = await User.find({Email : {$in : UserEmails}, IsDeleted : 0, Status : 1}, {_id: 1, Email : 1});
	UserArr = Array.isArray(UserArr) ? UserArr : [];
	if(!UserArr.length) {
		return res.json({"code":"404", message : "No stream found.", results: []});
	}

	var conditions = {
		IsDeleted : false,
		Status : true,
		//"EmailEngineDataSets.Delivered" : false,
		//"EmailEngineDataSets.hexcode_blendedImage" : {$exists : true},
		CapsuleId : {$exists : true}
	};

	OrConditions = [];
	var UserIds = [];
	for(var i = 0; i < UserArr.length; i++) {
		var userObj = UserArr[i];
		if(UserEmailsAndStreamsMap[userObj.Email]) {
			UserEmailsAndStreamsMap[userObj.Email] = UserEmailsAndStreamsMap[userObj.Email] ? UserEmailsAndStreamsMap[userObj.Email] : [];
			if(UserEmailsAndStreamsMap[userObj.Email].length) {
				var OrCondition = {};
				OrCondition.SyncedBy = ObjectId(userObj._id);
				OrCondition.CapsuleId = { $in : UserEmailsAndStreamsMap[userObj.Email] };
				OrConditions.push(OrCondition);
				UserIds.push(OrCondition.SyncedBy);
			}
		}
	}

	if(!OrConditions.length) {
		return res.json({"code":"404", message : "No stream found.", results: [], OrConditions : OrConditions});
	}

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	conditions["EmailEngineDataSets.DateOfDelivery"] = {$lte : todayEnd};
	//allocate table to each one-to-one meeting for normal table case
    SyncedPost.aggregate([
        { $match: conditions },
		{ $unwind : "$EmailEngineDataSets" },
		{
			$project: {
				_id : "$_id",
				CapsuleId: "$CapsuleId",
				PageId: "$PageId",
				PostId: "$PostId",
				PostStatement : "$PostStatement",
				SyncedBy: "$SyncedBy",
				ReceiverEmails: "$ReceiverEmails",
				CreatedOn: "$CreatedOn",
				Delivered : "$EmailEngineDataSets.Delivered",
				VisualUrls : "$EmailEngineDataSets.VisualUrls",
				SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
				TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
				TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
				DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
				BlendMode : "$EmailEngineDataSets.BlendMode",
				EmailTemplate : "$EmailTemplate",
				Subject : "$EmailSubject",
				IsOnetimeStream : "$IsOnetimeStream",
				IsOnlyPostImage : "$IsOnlyPostImage",
				hexcode_blendedImage : "$EmailEngineDataSets.hexcode_blendedImage"
			}
		},
		{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
		{
			$lookup: {
				from: "users",
				localField: "SyncedBy",
				foreignField: "_id",
				as: "SharedByUser"
			}
		},
		{
			$lookup: {
				from: "Capsules",
				localField: "CapsuleId",
				foreignField: "_id",
				as: "CapsuleData"
			}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "PageId",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{
			$unwind : "$PageData"
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				SocialPageId : "$PageData.OriginatedFrom",
				hexcode_blendedImage : 1,
				PostObj: {
					$filter : {
						input: "$PageData.Medias",
						as : "field",
						cond : {
								$eq : ["$$field._id", "$PostId"]
						}
					}
				}
			}
		},
		{ $unwind : "$PostObj" },
		{
			$project :	{
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				SocialPageId : 1,
				SocialPostId : "$PostObj.OriginatedFrom",
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				//BlendImage : 1,
				hexcode_blendedImage : 1
			}
		},
		{
			$match : {
				SocialPostId : {$ne : null},
				SocialPageId : {$ne : null},
				CapsuleId : {$ne : null}
			}
		},
		{
			$lookup: {
				from: "StreamComments",
				localField: "SocialPostId",
				foreignField: "SocialPostId",
				as: "SocialPostsWithCommentsArr"
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				SocialPageId : 1,
				SocialPostId : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				//BlendImage : 1,
				hexcode_blendedImage : 1,
				SocialPostsWithCommentsArr: {
					$filter : {
						input: "$SocialPostsWithCommentsArr",
						as : "field",
						cond : {
							$and : [
								{$eq : ["$$field.SocialPostId", "$SocialPostId"]},
								{$eq : ["$$field.hexcode_blendedImage", "$hexcode_blendedImage"]},
								{$eq : ["$$field.IsDeleted", false]},
								{$ne : ["$$field.ParentId", false ]}
							]
						}
					}
				}
			}
		},
		{
			$project : {
				_id : 1,
				CapsuleId: 1,
				PageId: 1,
				PostId: 1,
				PostStatement : 1,
				SyncedBy: 1,
				ReceiverEmails: 1,
				CreatedOn: 1,
				Delivered : 1,
				VisualUrls : 1,
				SoundFileUrl : 1,
				TextAboveVisual : 1,
				TextBelowVisual : 1,
				DateOfDelivery : 1,
				BlendMode : 1,
				EmailTemplate : 1,
				Subject : 1,
				IsOnetimeStream : 1,
				IsOnlyPostImage : 1,
				SocialPageId : 1,
				SocialPostId : 1,
				"SharedByUser._id": 1,
				"SharedByUser.Name": 1,
				"SharedByUser.Email": 1,
				"SharedByUser.ProfilePic": 1,
				"CapsuleData.MetaData": 1,
				//BlendImage : 1,
				hexcode_blendedImage : 1,
				//SocialPostsWithCommentsArr: 1,
				LastCommentObj: { $arrayElemAt: [ "$SocialPostsWithCommentsArr", -1 ] }
			}
		},
		//{ $match : { LastCommentObj : {$exists: true} } },
		{ $sort : {"LastCommentObj._id" : -1} }
		//{ $sort : {CapsuleId : 1, DateOfDelivery : -1} }
    ]).allowDiskUse(true).exec(async function (err, syncedPostsResults) {
		//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length = ", syncedPostsResults.length);
		if ( !err ) {
			var streamPosts = [];
			try {
				var allPosts = [];
				//var SocialPostsWithCommentsArr = [];
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					let dataRecord1 = syncedPostsResults[loop];
					if(!dataRecord1.SocialPageId || !dataRecord1.SocialPostId) {
						console.log("----- WHY THIS HAPPEND -----");
						continue;
					}
					allPosts.push(ObjectId(dataRecord1.SocialPostId));
					/*
					dataRecord1.SocialPostsWithCommentsArr = dataRecord1.SocialPostsWithCommentsArr ? dataRecord1.SocialPostsWithCommentsArr : [];
					//console.log("dataRecord1.SocialPostsWithCommentsArr ----- ", dataRecord1.SocialPostsWithCommentsArr);
					for(var i = 0; i < dataRecord1.SocialPostsWithCommentsArr.length; i++) {
						dataRecord1.SocialPostsWithCommentsArr[i].UserId = dataRecord1.SocialPostsWithCommentsArr[i].UserId.length > 0 ? dataRecord1.SocialPostsWithCommentsArr[i].UserId[0] : {};
					}
					syncedPostsResults[loop].SocialPostsWithCommentsArr = dataRecord1.SocialPostsWithCommentsArr;
					if(dataRecord1.SocialPostsWithCommentsArr.length) {
						SocialPostsWithCommentsArr = SocialPostsWithCommentsArr.concat(dataRecord1.SocialPostsWithCommentsArr);
					}
					*/
				}
				//console.log("SocialPostsWithCommentsArr = ", SocialPostsWithCommentsArr);

				var activityMapObj = {};
				//get all activities -
				//1) comments
				var conditions = {
					ParentId : { $exists : false },
					SocialPostId: { $in : allPosts },
					UserId : { $in : UserIds },
					IsDeleted : false,
					$or : [
						{ PrivacySetting : { $exists : false } },
						{ PrivacySetting : 'PublicWithName' },
						//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
						//{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
						{ PrivacySetting : 'InvitedFriends' },
					]
				};

				var SocialPostsWithCommentsArr = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic').lean();
				SocialPostsWithCommentsArr = Array.isArray(SocialPostsWithCommentsArr) ? SocialPostsWithCommentsArr : [];

				for(var i = 0; i < SocialPostsWithCommentsArr.length; i++) {
					//SocialPostsWithCommentsArr[i].UserId = SocialPostsWithCommentsArr[i].UserId.length > 0 ? SocialPostsWithCommentsArr[i].UserId[0] : {};
					var ActivityText = `${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]} commented on this post.`;
					var ActivityTime = SocialPostsWithCommentsArr[i].CreatedOn;

					if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage]) {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage].MyComments.push(SocialPostsWithCommentsArr[i]);
					} else {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : [SocialPostsWithCommentsArr[i]]
						};
					}

					if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr']) {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'].push(`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`);
					} else {
						activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'] =[`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`];
					}
				}

				//console.log("activityMapObj - ", activityMapObj);
				//2) PostLike
				var conditions = {
					SocialPostId: { $in : allPosts },
					UserId : { $in : UserIds },
					IsDeleted : false
				};

				var SocialPostsWithLikesArr = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic').lean();
				SocialPostsWithLikesArr = Array.isArray(SocialPostsWithLikesArr) ? SocialPostsWithLikesArr : [];
				//console.log("SocialPostsWithLikesArr = ", SocialPostsWithLikesArr.length);

				for(var i = 0; i < SocialPostsWithLikesArr.length; i++) {
					var ActivityText = `${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]} liked this post.`;
					var ActivityTime = SocialPostsWithLikesArr[i].CreatedOn;

					if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage]) {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments ? activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments : []
						};
					} else {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
							ActivityText : ActivityText,
							ActivityTime : ActivityTime,
							MyComments : []
						};
					}

					if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr']) {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'].push(`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`);
					} else {
						activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'] = [`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`];
					}
				}


				//console.log("activityMapObj = ", activityMapObj);
				//allocate table and update meeting record
				for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
					//console.log("loop = ", loop);
					var dataRecord = syncedPostsResults[loop];
					//console.log("dataRecord = ", dataRecord);
					dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

					delete dataRecord.PageData;

					dataRecord.ActivityText = '';
					dataRecord.ActivityTime = '';
					dataRecord.MyComments = [];

					if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
						continue;
					}

					dataRecord.hexcode_blendedImage = null;

					dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
					dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
					dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
					dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
					dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
					dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
					dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

					dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
					dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
					dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

					dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
					dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
					dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

					dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
					//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
					//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
					//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

					var PostImage1 = "";
					var PostImage2 = "";

					if(dataRecord.VisualUrls.length == 1) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[0];
					}

					if(dataRecord.VisualUrls.length == 2) {
						PostImage1 = dataRecord.VisualUrls[0];
						PostImage2 = dataRecord.VisualUrls[1];
					}


					var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
					var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


					var condition = {};
					condition.name = "Surprise__Post";

					if(dataRecord.EmailTemplate == 'PracticalThinker') {
						condition.name = "Surprise__Post_2Image";
					}

					//check if blended image exists
					var blendImage1 = PostImage1;
					var blendImage2 = PostImage2;
					var blendOption = dataRecord.BlendMode;
					var blendedImage = null;

					if(blendImage1 && blendImage2 && blendOption) {
						var data = blendImage1 + blendImage2 + blendOption;
						var hexcode = crypto.createHash('md5').update(data).digest("hex");
						if(hexcode) {
							var file_name = hexcode + '.png';
							var uploadDir = __dirname+'/../../media-assets/streamposts';

							if (fs.existsSync(uploadDir +"/"+ file_name)) {
								blendedImage = `/streamposts/${hexcode}.png`;
								condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
							}
						}
					}

					if(!blendedImage && (blendImage1 == blendImage2)) {
						blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
						blendedImage = blendImage1;
						condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
					}
					dataRecord.hexcode_blendedImage = blendedImage;

					if(activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage]) {
						//console.log("INSIDE --------------");
						//dataRecord.ActivityText = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityText;
						dataRecord.ActivityTime = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityTime;
						dataRecord.MyComments = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments : [];

						dataRecord.ActivityObj = {
							LikeActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] : [],
							CommentActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] : []
						};

						dataRecord.ActivityObj.CommentActivityArr = dataRecord.ActivityObj.CommentActivityArr ? dataRecord.ActivityObj.CommentActivityArr : [];

						if(dataRecord.ActivityObj.CommentActivityArr.length) {
							var uniqueCommentArray = dataRecord.ActivityObj.CommentActivityArr.filter(function(item, pos) {
								return dataRecord.ActivityObj.CommentActivityArr.indexOf(item) == pos;
							})

							if(uniqueCommentArray.length == 1) {
								dataRecord.ActivityText = uniqueCommentArray[0]+' commented';
							} else if(uniqueCommentArray.length == 2) {
								dataRecord.ActivityText = uniqueCommentArray[0]+' and '+uniqueCommentArray[1]+' commented';
							} else if(uniqueCommentArray.length > 2) {
								dataRecord.ActivityText = uniqueCommentArray[0]+', '+uniqueCommentArray[1]+' and +'+(uniqueCommentArray.length - 2)+' members commented';
							}
						}

						if(dataRecord.ActivityObj.LikeActivityArr.length) {
							var uniqueLikeArray = dataRecord.ActivityObj.LikeActivityArr.filter(function(item, pos) {
								return dataRecord.ActivityObj.LikeActivityArr.indexOf(item) == pos;
							})

							if(uniqueLikeArray.length == 1) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' liked this post.' : uniqueLikeArray[0]+' liked this post.';
							} else if(uniqueLikeArray.length == 2) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.' : uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.';
							} else if(uniqueLikeArray.length > 2) {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.' : uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.';
							}
						} else {
							dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' on this post.' : '';
						}
					}

					streamPosts.push(dataRecord);
				}
				//console.log("streamPosts.length ===== ", streamPosts.length);
				var finalArr = [];
				for(var i = 0; i < streamPosts.length; i++) {
					streamPosts[i].ActivityText = streamPosts[i].ActivityText ? streamPosts[i].ActivityText : null;
					streamPosts[i].hexcode_blendedImage = streamPosts[i].hexcode_blendedImage ? streamPosts[i].hexcode_blendedImage : null;
					if(!streamPosts[i].hexcode_blendedImage) {
						continue;
					}

					if(streamPosts[i].ActivityText && __getObjArrayIdxByKey (finalArr , 'hexcode_blendedImage' , streamPosts[i].hexcode_blendedImage) < 0) {
						finalArr.push(streamPosts[i]);
					}
				}
				return res.json({"code":"200", message : "success", results: finalArr});
			} catch (caughtError) {
				console.log("caughtError = ", caughtError);
				return res.json({"code":"501", message : "Something went wrong.", caughtError: caughtError, results : []});
			}
		} else {
			return res.json({"code":"501", message : "Something went wrong.", results : [], err : err});
		}
	});
}


var userStreamsPostsWithActivities = async function (req, res) {
	var IsGroupChat = req.body.IsGroupChat ? req.body.IsGroupChat : false;
	var SelectedTeam = req.body.SelectedTeam ? req.body.SelectedTeam : null;
	var StreamIds = req.body.StreamIds ? req.body.StreamIds : null;
	var UserEmail = req.body.UserEmail ? req.body.UserEmail : null;

	if(IsGroupChat) {
		userStreamsPostsWithActivities_GroupCase_V2(req, res);
		/*
		if(req.session.user.Email == "manishpodiyal@gmail.com") {
			userStreamsPostsWithActivities_GroupCase_V2(req, res);
		} else {
			userStreamsPostsWithActivities_GroupCase(req, res);
		}
		*/
	} else {
		var loginUserId = req.session.user._id;
		var Members = req.body.Members ? req.body.Members : [];
		var memberIds = [];
		for(var i = 0; i < Members.length; i++) {
			memberIds.push(ObjectId(Members[i]));
		}

		var UserArr = await User.find({Email : UserEmail, IsDeleted : 0, Status : 1});
		UserArr = Array.isArray(UserArr) ? UserArr : [];
		if(!UserArr.length) {
			return res.json({"code":"404", message : "No stream found.", results: []});
		}
		var UserId = UserArr[0]._id;
		console.log("UserId ==== ", UserId);
		if(!StreamIds) {
			return res.json({"code":"404", message : "No stream found.", results: []});
		}
		for (var i = 0; i < StreamIds.length; i++) {
			StreamIds[i] = ObjectId(StreamIds[i]);
		}
		/*
		var CapsuleIdsArr = await Capsule.find({_id : {$in : StreamIds}, IsDeleted : 0, OwnerId : String(UserId)}, {_id : 1}).lean();
		var CapsuleIds = [];
		CapsuleIdsArr = Array.isArray(CapsuleIdsArr) ? CapsuleIdsArr : [];
		for (var i = 0; i < CapsuleIdsArr.length; i++) {
			CapsuleIds.push(CapsuleIdsArr[i]);
		}
		*/
		var conditions = {
			CapsuleId : { $in : StreamIds },
			SyncedBy : ObjectId(UserId),
			IsDeleted : false,
			Status : true,
			"EmailEngineDataSets.Delivered" : false
		};

		var todayEnd = new Date();
		todayEnd.setHours(23,59,59,999);

		conditions["EmailEngineDataSets.DateOfDelivery"] = {$lte : todayEnd};
		//allocate table to each one-to-one meeting for normal table case
		SyncedPost.aggregate([
			{ $match: conditions },
			{ $unwind : "$EmailEngineDataSets" },
			{
				$project: {
					_id : "$_id",
					CapsuleId: "$CapsuleId",
					PageId: "$PageId",
					PostId: "$PostId",
					PostStatement : "$PostStatement",
					SyncedBy: "$SyncedBy",
					ReceiverEmails: "$ReceiverEmails",
					CreatedOn: "$CreatedOn",
					Delivered : "$EmailEngineDataSets.Delivered",
					VisualUrls : "$EmailEngineDataSets.VisualUrls",
					SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
					TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
					TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
					DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
					BlendMode : "$EmailEngineDataSets.BlendMode",
					EmailTemplate : "$EmailTemplate",
					Subject : "$EmailSubject",
					IsOnetimeStream : "$IsOnetimeStream",
					IsOnlyPostImage : "$IsOnlyPostImage",
					hexcode_blendedImage : "$EmailEngineDataSets.hexcode_blendedImage"
				}
			},
			{ $match : { DateOfDelivery: {$lte : todayEnd}, Delivered : false } },
			{
				$lookup: {
					from: "users",
					localField: "SyncedBy",
					foreignField: "_id",
					as: "SharedByUser"
				}
			},
			{
				$lookup: {
					from: "Capsules",
					localField: "CapsuleId",
					foreignField: "_id",
					as: "CapsuleData"
				}
			},
			{
				$lookup: {
					from: "Pages",
					localField: "PageId",
					foreignField: "_id",
					as: "PageData"
				}
			},
			{
				$unwind : "$PageData"
			},
			{
				$project : {
					_id : 1,
					CapsuleId: 1,
					PageId: 1,
					PostId: 1,
					PostStatement : 1,
					SyncedBy: 1,
					ReceiverEmails: 1,
					CreatedOn: 1,
					Delivered : 1,
					VisualUrls : 1,
					SoundFileUrl : 1,
					TextAboveVisual : 1,
					TextBelowVisual : 1,
					DateOfDelivery : 1,
					BlendMode : 1,
					EmailTemplate : 1,
					Subject : 1,
					IsOnetimeStream : 1,
					IsOnlyPostImage : 1,
					"SharedByUser._id": 1,
					"SharedByUser.Name": 1,
					"SharedByUser.Email": 1,
					"SharedByUser.ProfilePic": 1,
					"CapsuleData.MetaData": 1,
					SocialPageId : "$PageData.OriginatedFrom",
					hexcode_blendedImage : 1,
					PostObj: {
						$filter : {
							input: "$PageData.Medias",
							as : "field",
							cond : {
									$eq : ["$$field._id", "$PostId"]
							}
						}
					}
				}
			},
			{ $unwind : "$PostObj" },
			{
				$project :	{
					_id : 1,
					CapsuleId: 1,
					PageId: 1,
					PostId: 1,
					PostStatement : 1,
					SyncedBy: 1,
					ReceiverEmails: 1,
					CreatedOn: 1,
					Delivered : 1,
					VisualUrls : 1,
					SoundFileUrl : 1,
					TextAboveVisual : 1,
					TextBelowVisual : 1,
					DateOfDelivery : 1,
					BlendMode : 1,
					EmailTemplate : 1,
					Subject : 1,
					IsOnetimeStream : 1,
					IsOnlyPostImage : 1,
					SocialPageId : 1,
					SocialPostId : "$PostObj.OriginatedFrom",
					"SharedByUser._id": 1,
					"SharedByUser.Name": 1,
					"SharedByUser.Email": 1,
					"SharedByUser.ProfilePic": 1,
					"CapsuleData.MetaData": 1,
					//BlendImage : 1,
					hexcode_blendedImage : 1
				}
			},
			{
				$match : {
					SocialPostId : {$ne : null},
					SocialPageId : {$ne : null},
					CapsuleId : {$ne : null}
				}
			},
			{
				$lookup: {
					from: "StreamComments",
					localField: "SocialPostId",
					foreignField: "SocialPostId",
					as: "SocialPostsWithCommentsArr"
				}
			},
			{
				$project : {
					_id : 1,
					CapsuleId: 1,
					PageId: 1,
					PostId: 1,
					PostStatement : 1,
					SyncedBy: 1,
					ReceiverEmails: 1,
					CreatedOn: 1,
					Delivered : 1,
					VisualUrls : 1,
					SoundFileUrl : 1,
					TextAboveVisual : 1,
					TextBelowVisual : 1,
					DateOfDelivery : 1,
					BlendMode : 1,
					EmailTemplate : 1,
					Subject : 1,
					IsOnetimeStream : 1,
					IsOnlyPostImage : 1,
					SocialPageId : 1,
					SocialPostId : 1,
					"SharedByUser._id": 1,
					"SharedByUser.Name": 1,
					"SharedByUser.Email": 1,
					"SharedByUser.ProfilePic": 1,
					"CapsuleData.MetaData": 1,
					//BlendImage : 1,
					hexcode_blendedImage : 1,
					SocialPostsWithCommentsArr: {
						$filter : {
							input: "$SocialPostsWithCommentsArr",
							as : "field",
							cond : {
								$and : [
									{$eq : ["$$field.SocialPostId", "$SocialPostId"]},
									{$eq : ["$$field.hexcode_blendedImage", "$hexcode_blendedImage"]},
									{$eq : ["$$field.IsDeleted", false]},
									{$ne : ["$$field.ParentId", false ]}
								]
							}
						}
					}
				}
			},
			{
				$project : {
					_id : 1,
					CapsuleId: 1,
					PageId: 1,
					PostId: 1,
					PostStatement : 1,
					SyncedBy: 1,
					ReceiverEmails: 1,
					CreatedOn: 1,
					Delivered : 1,
					VisualUrls : 1,
					SoundFileUrl : 1,
					TextAboveVisual : 1,
					TextBelowVisual : 1,
					DateOfDelivery : 1,
					BlendMode : 1,
					EmailTemplate : 1,
					Subject : 1,
					IsOnetimeStream : 1,
					IsOnlyPostImage : 1,
					SocialPageId : 1,
					SocialPostId : 1,
					"SharedByUser._id": 1,
					"SharedByUser.Name": 1,
					"SharedByUser.Email": 1,
					"SharedByUser.ProfilePic": 1,
					"CapsuleData.MetaData": 1,
					//BlendImage : 1,
					hexcode_blendedImage : 1,
					//SocialPostsWithCommentsArr: 1,
					LastCommentObj: { $arrayElemAt: [ "$SocialPostsWithCommentsArr", -1 ] }
				}
			},
			//{ $match : { LastCommentObj : {$exists: true} } },
			{ $sort : {"LastCommentObj._id" : -1} }
			//{ $sort : {CapsuleId : 1, DateOfDelivery : -1} }
		]).allowDiskUse(true).exec(async function (err, syncedPostsResults) {
			//console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@2------------------------syncedPostsResults.length = ", syncedPostsResults.length);
			if ( !err ) {
				var streamPosts = [];
				try {
					var allPosts = [];
					//var SocialPostsWithCommentsArr = [];
					for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
						let dataRecord1 = syncedPostsResults[loop];
						if(!dataRecord1.SocialPageId || !dataRecord1.SocialPostId) {
							console.log("----- WHY THIS HAPPEND -----");
							continue;
						}
						allPosts.push(ObjectId(dataRecord1.SocialPostId));
						/*
						dataRecord1.SocialPostsWithCommentsArr = dataRecord1.SocialPostsWithCommentsArr ? dataRecord1.SocialPostsWithCommentsArr : [];
						//console.log("dataRecord1.SocialPostsWithCommentsArr ----- ", dataRecord1.SocialPostsWithCommentsArr);
						for(var i = 0; i < dataRecord1.SocialPostsWithCommentsArr.length; i++) {
							dataRecord1.SocialPostsWithCommentsArr[i].UserId = dataRecord1.SocialPostsWithCommentsArr[i].UserId.length > 0 ? dataRecord1.SocialPostsWithCommentsArr[i].UserId[0] : {};
						}
						syncedPostsResults[loop].SocialPostsWithCommentsArr = dataRecord1.SocialPostsWithCommentsArr;
						if(dataRecord1.SocialPostsWithCommentsArr.length) {
							SocialPostsWithCommentsArr = SocialPostsWithCommentsArr.concat(dataRecord1.SocialPostsWithCommentsArr);
						}
						*/
					}
					//console.log("SocialPostsWithCommentsArr = ", SocialPostsWithCommentsArr);

					var activityMapObj = {};
					//get all activities -
					//1) comments
					var conditions = {
						ParentId : { $exists : false },
						SocialPostId: { $in : allPosts },
						UserId : UserId,
						IsDeleted : false,
						$or : [
							{ PrivacySetting : { $exists : false } },
							{ PrivacySetting : 'PublicWithName' },
							{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
							{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
						]
					};

					var SocialPostsWithCommentsArr = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic').lean();
					SocialPostsWithCommentsArr = Array.isArray(SocialPostsWithCommentsArr) ? SocialPostsWithCommentsArr : [];

					for(var i = 0; i < SocialPostsWithCommentsArr.length; i++) {
						//SocialPostsWithCommentsArr[i].UserId = SocialPostsWithCommentsArr[i].UserId.length > 0 ? SocialPostsWithCommentsArr[i].UserId[0] : {};
						var ActivityText = `${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]} commented on this post.`;
						var ActivityTime = SocialPostsWithCommentsArr[i].CreatedOn;

						if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage]) {
							activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage].MyComments.push(SocialPostsWithCommentsArr[i]);
						} else {
							activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage] = {
								ActivityText : ActivityText,
								ActivityTime : ActivityTime,
								MyComments : [SocialPostsWithCommentsArr[i]]
							};
						}

						if(activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr']) {
							activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'].push(`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`);
						} else {
							activityMapObj[SocialPostsWithCommentsArr[i].SocialPostId+'_'+SocialPostsWithCommentsArr[i].hexcode_blendedImage+'_CommentActivityArr'] =[`${SocialPostsWithCommentsArr[i].UserId.Name.split(' ')[0]}`];
						}
					}

					//console.log("activityMapObj - ", activityMapObj);
					//2) PostLike
					var conditions = {
						SocialPostId: { $in : allPosts },
						UserId : UserId,
						IsDeleted : false
					};

					var SocialPostsWithLikesArr = await StreamLikes.find(conditions).populate('UserId', '_id Name Email ProfilePic').lean();
					SocialPostsWithLikesArr = Array.isArray(SocialPostsWithLikesArr) ? SocialPostsWithLikesArr : [];
					//console.log("SocialPostsWithLikesArr = ", SocialPostsWithLikesArr.length);

					for(var i = 0; i < SocialPostsWithLikesArr.length; i++) {
						var ActivityText = `${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]} liked this post.`;
						var ActivityTime = SocialPostsWithLikesArr[i].CreatedOn;

						if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage]) {
							activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
								ActivityText : ActivityText,
								ActivityTime : ActivityTime,
								MyComments : activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments ? activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage].MyComments : []
							};
						} else {
							activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage] = {
								ActivityText : ActivityText,
								ActivityTime : ActivityTime,
								MyComments : []
							};
						}

						if(activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr']) {
							activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'].push(`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`);
						} else {
							activityMapObj[SocialPostsWithLikesArr[i].SocialPostId+'_'+SocialPostsWithLikesArr[i].hexcode_blendedImage+'_LikeActivityArr'] = [`${SocialPostsWithLikesArr[i].UserId.Name.split(' ')[0]}`];
						}
					}


					//console.log("activityMapObj = ", activityMapObj);
					//allocate table and update meeting record
					for ( let loop = 0; loop < syncedPostsResults.length; loop++ ) {
						//console.log("loop = ", loop);
						var dataRecord = syncedPostsResults[loop];
						//console.log("dataRecord = ", dataRecord);
						dataRecord.SharedByUser = dataRecord.SharedByUser ? dataRecord.SharedByUser[0] : {};

						delete dataRecord.PageData;

						dataRecord.ActivityText = '';
						dataRecord.ActivityTime = '';
						dataRecord.MyComments = [];

						if(!dataRecord.SocialPageId || !dataRecord.SocialPostId) {
							continue;
						}

						dataRecord.hexcode_blendedImage = null;

						dataRecord.VisualUrls = dataRecord.VisualUrls ? dataRecord.VisualUrls : [];
						dataRecord.PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
						dataRecord.Subject = dataRecord.Subject ? dataRecord.Subject : null;
						dataRecord.TextAboveVisual = dataRecord.TextAboveVisual ? dataRecord.TextAboveVisual : "";
						dataRecord.TextBelowVisual = dataRecord.TextBelowVisual ? dataRecord.TextBelowVisual : "";
						dataRecord.SoundFileUrl = dataRecord.SoundFileUrl ? dataRecord.SoundFileUrl : "";
						dataRecord.BlendMode = dataRecord.BlendMode ? dataRecord.BlendMode : 'hard-light';
						dataRecord.EmailTemplate = dataRecord.EmailTemplate ? dataRecord.EmailTemplate : 'PracticalThinker';

						dataRecord.CapsuleId = dataRecord.CapsuleId ? dataRecord.CapsuleId : null;
						dataRecord.PageId = dataRecord.PageId ? dataRecord.PageId : null;
						dataRecord.PostId = dataRecord.PostId ? dataRecord.PostId : null;

						dataRecord.CapsuleData = typeof dataRecord.CapsuleData == 'object' ? (dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {}) : {};
						dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData ? dataRecord.CapsuleData.MetaData : {};
						dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : 'The Scrpt Co.';

						dataRecord.SharedByUserName = dataRecord.CapsuleData.MetaData.publisher ? dataRecord.CapsuleData.MetaData.publisher : "NA";
						//console.log("------------dataRecord.CapsuleId---------------", dataRecord.CapsuleId);
						//console.log("------------dataRecord.CapsuleData.MetaData---------------", dataRecord.CapsuleData.MetaData);
						//console.log("------------dataRecord.CapsuleData.MetaData.publisher---------------", dataRecord.CapsuleData.MetaData.publisher);

						var PostImage1 = "";
						var PostImage2 = "";

						if(dataRecord.VisualUrls.length == 1) {
							PostImage1 = dataRecord.VisualUrls[0];
							PostImage2 = dataRecord.VisualUrls[0];
						}

						if(dataRecord.VisualUrls.length == 2) {
							PostImage1 = dataRecord.VisualUrls[0];
							PostImage2 = dataRecord.VisualUrls[1];
						}


						var PostStatement = dataRecord.PostStatement ? dataRecord.PostStatement : "";
						var PostURL = "https://www.scrpt.com/post_view?post="+dataRecord.PostId;


						var condition = {};
						condition.name = "Surprise__Post";

						if(dataRecord.EmailTemplate == 'PracticalThinker') {
							condition.name = "Surprise__Post_2Image";
						}

						//check if blended image exists
						var blendImage1 = PostImage1;
						var blendImage2 = PostImage2;
						var blendOption = dataRecord.BlendMode;
						var blendedImage = null;

						if(blendImage1 && blendImage2 && blendOption) {
							var data = blendImage1 + blendImage2 + blendOption;
							var hexcode = crypto.createHash('md5').update(data).digest("hex");
							if(hexcode) {
								var file_name = hexcode + '.png';
								var uploadDir = __dirname+'/../../media-assets/streamposts';

								if (fs.existsSync(uploadDir +"/"+ file_name)) {
									blendedImage = `/streamposts/${hexcode}.png`;
									condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
								}
							}
						}

						if(!blendedImage && (blendImage1 == blendImage2)) {
							blendImage1 = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
							blendedImage = blendImage1;
							condition.name = condition.name == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
						}
						dataRecord.hexcode_blendedImage = blendedImage;

						if(activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage]) {
							//console.log("INSIDE --------------");
							//dataRecord.ActivityText = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityText;
							dataRecord.ActivityTime = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].ActivityTime;
							dataRecord.MyComments = activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage].MyComments : [];

							dataRecord.ActivityObj = {
								LikeActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_LikeActivityArr'] : [],
								CommentActivityArr : activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] ? activityMapObj[dataRecord.SocialPostId+'_'+dataRecord.hexcode_blendedImage+'_CommentActivityArr'] : []
							};

							dataRecord.ActivityObj.CommentActivityArr = dataRecord.ActivityObj.CommentActivityArr ? dataRecord.ActivityObj.CommentActivityArr : [];

							if(dataRecord.ActivityObj.CommentActivityArr.length) {
								var uniqueCommentArray = dataRecord.ActivityObj.CommentActivityArr.filter(function(item, pos) {
									return dataRecord.ActivityObj.CommentActivityArr.indexOf(item) == pos;
								})

								if(uniqueCommentArray.length == 1) {
									dataRecord.ActivityText = uniqueCommentArray[0]+' commented';
								} else if(uniqueCommentArray.length == 2) {
									dataRecord.ActivityText = uniqueCommentArray[0]+' and '+uniqueCommentArray[1]+' commented';
								} else if(uniqueCommentArray.length > 2) {
									dataRecord.ActivityText = uniqueCommentArray[0]+', '+uniqueCommentArray[1]+' and +'+(uniqueCommentArray.length - 2)+' members commented';
								}
							}

							if(dataRecord.ActivityObj.LikeActivityArr.length) {
								var uniqueLikeArray = dataRecord.ActivityObj.LikeActivityArr.filter(function(item, pos) {
									return dataRecord.ActivityObj.LikeActivityArr.indexOf(item) == pos;
								})

								if(uniqueLikeArray.length == 1) {
									dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' liked this post.' : uniqueLikeArray[0]+' liked this post.';
								} else if(uniqueLikeArray.length == 2) {
									dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.' : uniqueLikeArray[0]+' and '+uniqueLikeArray[1]+' liked this post.';
								} else if(uniqueLikeArray.length > 2) {
									dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' and '+ uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.' : uniqueLikeArray[0]+', '+uniqueLikeArray[1]+' and +'+(uniqueLikeArray.length - 2)+' members liked this post.';
								}
							} else {
								dataRecord.ActivityText = dataRecord.ActivityText ? dataRecord.ActivityText+' on this post.' : '';
							}
						}

						streamPosts.push(dataRecord);
					}
					//console.log("streamPosts.length ===== ", streamPosts.length);
					var finalArr = [];
					for(var i = 0; i < streamPosts.length; i++) {
						streamPosts[i].ActivityText = streamPosts[i].ActivityText ? streamPosts[i].ActivityText : null;
						streamPosts[i].hexcode_blendedImage = streamPosts[i].hexcode_blendedImage ? streamPosts[i].hexcode_blendedImage : null;
						if(!streamPosts[i].hexcode_blendedImage) {
							continue;
						}

						if(streamPosts[i].ActivityText && __getObjArrayIdxByKey (finalArr , 'hexcode_blendedImage' , streamPosts[i].hexcode_blendedImage) < 0) {
							finalArr.push(streamPosts[i]);
						}
					}
					return res.json({"code":"200", message : "success", results: finalArr});
				} catch (caughtError) {
					console.log("caughtError = ", caughtError);
					return res.json({"code":"501", message : "Something went wrong.", caughtError: caughtError, results : []});
				}
			} else {
				return res.json({"code":"501", message : "Something went wrong.", results : [], err : err});
			}
		});
	}
}


var addCommentOnComment = async function(req, res) {
	var id = req.body.id ? req.body.id : null;

	var dataToSave = {
		UserId : req.session.user._id,
		SocialPageId : req.body.SocialPageId ? req.body.SocialPageId : null,
		SocialPostId : req.body.SocialPostId ? req.body.SocialPostId : null,
		ParentId : req.body.ParentId ? req.body.ParentId : null,
		hexcode_blendedImage : req.body.hexcode_blendedImage ? req.body.hexcode_blendedImage : null,
		Comment : req.body.Comment ? req.body.Comment : null
	};

	if(!dataToSave.ParentId || !dataToSave.hexcode_blendedImage) {
		return res.json({
			status : "failed",
			message : "Failed.",
			results : []
		});
	}

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	if( !id ) {
		StreamComments(dataToSave).save(async function(err, results){
			var conditions = {
				SocialPageId : ObjectId(dataToSave.SocialPageId),
				ParentId : { $exists : true },
				//SocialPostId: ObjectId(dataToSave.SocialPostId),
				IsDeleted: 0,
				$or : [
					{ PrivacySetting : { $exists : false } },
					{ PrivacySetting : 'PublicWithName' },
					{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
					{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
				]
			};
			var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
			comments = Array.isArray(comments) ? comments : [];

			if(!err) {
				return res.json({
					status : "success",
					message : "comment saved successfully.",
					results : comments
				});
			}

			return res.json({
				status : "failed",
				message : "Failed.",
				results : comments
			});
		});
	} else {
		var conditions = {
			_id : ObjectId(id),
			UserId : req.session.user._id
		};

		var dataToUpdate = {
			Comment : req.body.Comment ? req.body.Comment : null
		};

		StreamComments.update(conditions, { $set : dataToUpdate }, async function(err, results){
			var conditions = {
				SocialPageId : ObjectId(dataToSave.SocialPageId),
				ParentId : { exists : true },
				IsDeleted: 0,
				$or : [
					{ PrivacySetting : { $exists : false } },
					{ PrivacySetting : 'PublicWithName' },
					{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
					{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
				]
			};
			var comments = await StreamComments.find(conditions).sort({CreatedOn : -1}).populate('UserId', '_id Name Email ProfilePic');
			comments = Array.isArray(comments) ? comments : [];

			if(!err) {
				return res.json({
					status : "success",
					message : "comment saved successfully.",
					results : comments
				});
			}

			return res.json({
				status : "failed",
				message : "Failed.",
				results : comments
			});
		});
	}
}

var getPrivateComments = async function(req, res) {
	var SocialPageIdArr = req.body.SocialPageId ? req.body.SocialPageId.split(',') : [];
	var context = req.body.context ? req.body.context : 'StreamPosts'; //StreamPosts / Activities / OurChats / MyPosts / Community

	var CommentsIds = req.body.CommentsIds ? req.body.CommentsIds : [];

	if(!CommentsIds) {

	}

	var loginUserId = req.session.user._id;
	var Members = req.body.Members ? req.body.Members : [];
	var memberIds = [];
	for(var i = 0; i < Members.length; i++) {
		memberIds.push(ObjectId(Members[i]));
	}

	for(var i = 0; i < SocialPageIdArr.length; i++) {
		SocialPageIdArr[i] = ObjectId(SocialPageIdArr[i]);
	}

	if(!SocialPageIdArr.length) {
		return res.json({
			status : "success",
			message : "list.",
			results : []
		});
	}

	var conditions = {
		SocialPageId : { $in : SocialPageIdArr },
		ParentId : {$exists : true},
		IsDeleted: 0,
		$or : [
			{ PrivacySetting : { $exists : false } },
			{ PrivacySetting : 'PublicWithName' },
			//{ PrivacySetting : 'OnlyForOwner', UserId : loginUserId },
			{ PrivacySetting : { $in : ['OnlyForOwner', 'InvitedFriends'] }, UserId : loginUserId },
			{ PrivacySetting : 'InvitedFriends', UserId : { $in : memberIds } },
		]
	};

	//var comments = await StreamComments.find(conditions).populate('UserId', '_id Name Email ProfilePic');
	var comments = await StreamComments.aggregate([
		{
			$match : {
				SocialPageId : { $in : SocialPageIdArr },
				ParentId : {$exists : true},
				IsDeleted: false
			}
		},
		{
			$lookup: {
					from: "StreamComments",
					localField: "ParentId",
					foreignField: "_id",
					as: "ParentData"
			}
		},
		{
			$match : {
				$or : [
					{ "UserId" : ObjectId(loginUserId) },
					{ "ParentData.UserId" : ObjectId(loginUserId) }
				]
			}
		},
		{
			$lookup: {
				from: "users",
				localField: "UserId",
				foreignField: "_id",
				as: "UserId"
			}
		}
	]);
	comments = Array.isArray(comments) ? comments : [];
	for(var i = 0; i < comments.length; i++) {
		comments[i].UserId = Array.isArray(comments[i].UserId) ? (comments[i].UserId.length > 0 ? {_id : comments[i].UserId[0]._id, Name : comments[i].UserId[0].Name, Email : comments[i].UserId[0].Email, ProfilePic : comments[i].UserId[0].ProfilePic} : {}) : {};

		delete comments[i].ParentData;
	}
	return res.json({
		status : "success",
		message : "p comments listing.",
		results : comments
	});
}

//end stream public page apis


var newPostsReplicaFromExistingStream = async function (req, res) {
	try {
		var existingStreamPageArr = await Page.find({_id : ObjectId("6097cbeb3889f72df4c8b69e")}, {Medias : 1}).lean();
		existingStreamPageArr = Array.isArray(existingStreamPageArr) ? existingStreamPageArr : [];
		if(!existingStreamPageArr.length) {
			return res.json({code : 404, message : "Stream does not exist."});
		}
		var streamPosts = existingStreamPageArr[0].Medias ? existingStreamPageArr[0].Medias : [];
		//console.log("streamPosts - ", streamPosts);
		if(!streamPosts.length) {
			return res.json({code : 200, message : "There is no posts in existing stream."});
		}

		var newStreamPageArr = await Page.find({_id : ObjectId("6126746b4b631420cc5a9d36")}, {_id : 1, CreaterId : 1, OwnerId : 1}).lean();
		//console.log("newStreamPageArr - ", newStreamPageArr);
		newStreamPageArr = Array.isArray(newStreamPageArr) ? newStreamPageArr : [];
		if(!newStreamPageArr.length) {
			return res.json({code : 404, message : "We couldn't find record based on your new stream id."});
		}

		var newStreamPosts = [];
		for(var i = 0; i < streamPosts.length; i++) {
			var newStreamPostObj = streamPosts[i];
			var existingPostId = newStreamPostObj._id;
			var existingPageId = ObjectId("6097cbeb3889f72df4c8b69e");

			newStreamPostObj._id = new ObjectId();
			newStreamPostObj.PostedBy = newStreamPageArr[0].OwnerId;
			newStreamPostObj.OwnerId = newStreamPageArr[0].OwnerId;

			//create new PageStream config replica
			var PageStreamDataArr = await PageStream.find({PageId : existingPageId, PostId : existingPostId}).lean();
			PageStreamDataArr = Array.isArray(PageStreamDataArr) ? PageStreamDataArr : [];


			if(PageStreamDataArr.length) {
				var PageStreamData = PageStreamDataArr[0];
				PageStreamData._id = new ObjectId();
				PageStreamData.PageId = newStreamPageArr[0]._id;
				PageStreamData.PostId = newStreamPostObj._id;
				await PageStream(PageStreamData).save();
			}

			newStreamPosts.push(newStreamPostObj);
		}
		console.log("newStreamPosts - ", newStreamPosts);
		var results = await Page.update({_id : newStreamPageArr[0]._id}, {$set : {Medias : newStreamPosts}});
		return res.json({code : 200, message : "Done", results : results});
	} catch (caughtError) {
		console.log("caughtError - ", caughtError);
		return res.json({code : 501, message : "Error", caughtError : caughtError});
	}
}


var markAsAdPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'AdPost'	//Possible values - AdPost / BroadcastPost / Post
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsBroadcastPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'BroadcastPost'	//Possible values - Ad / BroadcastPost / Post
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsKeyPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;
	var KeyPostType = req.body.KeyPostType ? req.body.KeyPostType : 'Comment';

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'KeyPost',	//Possible values - Ad / BroadcastPost / Post
			"Medias.$.KeyPostType" : KeyPostType	//Possible values - Ad / BroadcastPost / Post
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsGeneralPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'GeneralPost',	//Possible values - Ad / BroadcastPost / Post / GeneralPost
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsQuestionPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'QuestionPost',	//Possible values - Ad / BroadcastPost / Post / GeneralPost
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsInfoPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'InfoPost',	//Possible values - Ad / BroadcastPost / Post / GeneralPost / QuestionPost / InfoPost
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsInfoPostOwner = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'InfoPostOwner',	//Possible values - Ad / BroadcastPost / Post / GeneralPost / QuestionPost / InfoPost / InfoPostOwner
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

//this is a sub case under InfoPostOwner type post
var markAsIsPreLaunchPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsPreLaunchPost" : true
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsNotPreLaunchPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsPreLaunchPost" : false
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsPrivateQuestionPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsPrivateQuestionPost" : true
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsPublicQuestionPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsPrivateQuestionPost" : false
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostType" : 'Post'	//Possible values - Ad / BroadcastPost / Post
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsOneTimePost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsOnetimeStream" : true
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var markAsRepeatPost = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;

	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.IsOnetimeStream" : false
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};


var getOtherPosts = async function (req, res) {
	var PageId = req.body.PageId ? req.body.PageId : null;
	if(!PageId) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var conditions = {
		"_id" : ObjectId(PageId),
		IsDasheditpage : false
	};
	var fields = {
		Medias : 1
	};

	var PageData = await Page.aggregate([
		{
		   $match: conditions
		},
		{
			$unwind : "$Medias",
		},
		{
			$lookup: {
				from: "users",
				localField: "Medias.PostedBy",
				foreignField: "_id",
				as: "Medias.UserData"
			}
		},
		{
			$group : {
				_id : "$_id",
				Medias : {$push : "$Medias"}
			}
		},
		{
			$addFields: {
				Medias: {
					$filter: {
						input: "$Medias",
						cond: {
						  $in: [ "$$this.PostType", ["AdPost", "BroadcastPost"] ]
						}
					}
				}
			}
		}
	]);
	PageData = Array.isArray(PageData) ? PageData : [];
	var PageDataObj = PageData.length ? PageData[0] : {};
	var Posts = Array.isArray(PageDataObj.Medias) ? PageDataObj.Medias : [];
	var AdPosts = Posts.filter((obj)=>(obj.PostType == 'AdPost'));
	var BroadcastPosts = Posts.filter((obj)=>(obj.PostType == 'BroadcastPost'));

	res.json({code : 200, AdPosts : AdPosts, BroadcastPosts : BroadcastPosts, UserData: PageDataObj.UserData});

}

var updatePostLinkUrl = function (req, res) {
	var PostId = req.body.PostId ? req.body.PostId : null;
	var PostLinkUrl = req.body.PostLinkUrl ? req.body.PostLinkUrl : '';
	var conditions = {
		"Medias._id" : ObjectId(PostId),
		IsDasheditpage : false
	};

	var setObj = {
		$set : {
			"Medias.$.PostLinkUrl" : PostLinkUrl	//Possible values - AdPost / BroadcastPost / Post
		}
	};

	var options = { multi: false };
	Page.update(conditions, setObj, options, function(err, result) {
		if(!err) {
			//this will update the IsDasheditpage case
			var conditions2 = {
				"Medias._id" : ObjectId(PostId),
				IsDasheditpage : true
			};
			Page.update(conditions2, {$set : setObj}, options, function(err , result2){
				if(!err){
					var response = {
						status: 200,
						message: "Post updated successfully."
					}
					return res.json(response);
				}
				else{
					console.log("err 2 ---------------------- ", err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					return res.json(response);
				}
			})
		} else {
			console.log("err 1 ---------------------- ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			return res.json(response);
		}
	});
};

var getUserStats = async function (req, res) {
	var PostedBy = ObjectId(req.session.user._id);
	var mediaMatchCond = {
		"Medias.PostedBy": PostedBy,
		'Medias.IsAddedFromStream': { $exists: true },
		'Medias.IsAddedFromStream': true,
		'Medias.IsPostForUser': { $exists: true },
		'Medias.IsPostForUser': true
	};

	var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
	if(searchByTagName) {
		mediaMatchCond["Medias.Themes"] = {
			$elemMatch : {
				"text" : searchByTagName
			}
		};
	}

	var searchByLabel = req.body.searchByLabel ? req.body.searchByLabel : null;
	if(searchByLabel) {
		mediaMatchCond["Medias.Label"] = searchByLabel;
	}

	var HelpWithFriendsArr = await Page.aggregate([
		{
			'$match': {
				IsDeleted: false,
				IsDasheditpage : false,
				PageType : {$in: ["gallery", "qaw-gallery"]}
			}
		},
		{'$unwind': '$Medias'},
		{'$project': {'Medias': 1,'commentData':1}},
		{'$match': mediaMatchCond},
		{'$sort': {'Medias.PostedOn': -1}}
	]);
	HelpWithFriendsArr = HelpWithFriendsArr ? HelpWithFriendsArr : [];
	HelpWithFriendsArrCount = HelpWithFriendsArr.length;


	var mediaMatchCond2 = {
		"Medias.PostedBy": PostedBy,
		'Medias.IsAddedFromStream': { $exists: true },
		'Medias.IsAddedFromStream': true,
		'Medias.PostPrivacySetting' : {$in : ["PublicWithName", "PublicWithoutName"]},
		'$or' : [
			{'Medias.IsPostForUser': { $exists: false }},
			{'Medias.IsPostForUser': false}
		]
	};

	var PublicActivitiesArr = await Page.aggregate([
		{
			'$match': {
				IsDeleted: false,
				IsDasheditpage : false,
				PageType : {$in: ["gallery", "qaw-gallery"]}
			}
		},
		{'$unwind': '$Medias'},
		{'$project': {'Medias': 1,'commentData':1}},
		{'$match': mediaMatchCond2}
	]);
	PublicActivitiesArr = PublicActivitiesArr ? PublicActivitiesArr : [];
	PublicActivitiesArrCount = PublicActivitiesArr.length;

	var loginUserId = req.session.user._id;
	var conditions = {
		//CapsuleId : ObjectId(CapsuleId),
		SyncedBy : ObjectId(loginUserId),
		IsDeleted : false,
		//Status : true,
		"EmailEngineDataSets.Delivered" : false
	};

	var todayEnd = new Date();
	todayEnd.setHours(23,59,59,999);

	//allocate table to each one-to-one meeting for normal table case
    var KeyActionsArr = await SyncedPost.aggregate([
        { $match: conditions },
		{ $unwind : "$EmailEngineDataSets" },
        {
            $project: {
                _id : "$_id",
                CapsuleId: "$CapsuleId",
				PageId: "$PageId",
				PostId: "$PostId",
				PostStatement : "$PostStatement",
                SyncedBy: "$SyncedBy",
				ReceiverEmails: "$ReceiverEmails",
                CreatedOn: "$CreatedOn",
                Delivered : "$EmailEngineDataSets.Delivered",
				VisualUrls : "$EmailEngineDataSets.VisualUrls",
				SoundFileUrl : "$EmailEngineDataSets.SoundFileUrl",
				TextAboveVisual : "$EmailEngineDataSets.TextAboveVisual",
				TextBelowVisual : "$EmailEngineDataSets.TextBelowVisual",
				DateOfDelivery : "$EmailEngineDataSets.DateOfDelivery",
				BlendMode : "$EmailEngineDataSets.BlendMode",
				EmailTemplate : "$EmailTemplate",
				Subject : "$EmailSubject",
				IsOnetimeStream : "$IsOnetimeStream",
				IsOnlyPostImage : "$IsOnlyPostImage"
            }
        },
		{
			$group : { _id : "$PageId"}
		},
		{
			$lookup: {
				from: "Pages",
				localField: "_id",
				foreignField: "_id",
				as: "PageData"
			}
		},
		{ $unwind : "$PageData" },
		{ $unwind : "$PageData.Medias" },
		{
			$project : {
				_id : "$_id",
				PostId : "$PageData.Medias._id",
				SocialPostId : "$PageData.Medias.OriginatedFrom",
				PostType : "$PageData.Medias.PostType",
				PostedBy : "$PageData.Medias.PostedBy"
			}
		},
		{ $match : { "PostType" : "KeyPost" } },
		{
			$lookup: {
				from: "StreamComments",
				localField: "SocialPostId",
				foreignField: "SocialPostId",
				as: "StreamCommentsData"
			}
		},
		{ $unwind : "$StreamCommentsData" },
		{ $match : { "StreamCommentsData.UserId" : ObjectId(loginUserId) } },
		{ $group : { _id : "$StreamCommentsData._id" } }
    ]);
	//console.log("KeyActionsArr - ", KeyActionsArr);
	KeyActionsArr = KeyActionsArr ? KeyActionsArr : [];
	KeyActionsArrCount = KeyActionsArr.length;


	//get all Notes to self post count
	var NotesToSelfPostCount = 0;

	//get all comments count
	var comments_conditions = {
		IsDeleted: 0,
		UserId : loginUserId
	};
	var CommentsCount = await StreamComments.find(comments_conditions).count();
	CommentsCount = CommentsCount ? CommentsCount : 0;

	//get all shares with friends count
	var SharesWithFriendsCount = 0;

	return res.json({
		status : 200,
		result : {
			//KeyActionsArr : KeyActionsArr,
			KeyActions : KeyActionsArrCount ? KeyActionsArrCount : 0,
			HelpWithFriends : HelpWithFriendsArrCount ? HelpWithFriendsArrCount : 0,
			PublicActions : PublicActivitiesArrCount ? PublicActivitiesArrCount : 0,
			NotesToSelfPostCount: NotesToSelfPostCount ? NotesToSelfPostCount : 0,
			CommentsCount: CommentsCount ? CommentsCount : 0,
			SharesWithFriendsCount: SharesWithFriendsCount ? SharesWithFriendsCount : 0,
		}
	});
}

async function sendMembersInvitationEmail (users, OwnerDetails, StreamId) {
	users = Array.isArray(users) ? users : [];
	if(!users.length) {
		return;
	}

	var conditionStrm = {};
	conditionStrm._id = ObjectId(StreamId);
	var resultsStrm = await Capsule.find(conditionStrm, {});
	resultsStrm = Array.isArray(resultsStrm) ? resultsStrm : [];
	if(!resultsStrm.length) {
		return;
	}
	var SurpriseGiftStatement = '<br><br>This is a surprise, so please don’t tell {OwnerName}!';

	var IsOwnerPostsForMember = resultsStrm[0].IsOwnerPostsForMember ? resultsStrm[0].IsOwnerPostsForMember : false;
	var IsPurchaseNeededForAllPosts = resultsStrm[0].IsPurchaseNeededForAllPosts ? resultsStrm[0].IsPurchaseNeededForAllPosts : false;

	var MemberSharingStatements = "<br><br>The purpose of this experience is to provide {OwnerName} a unique opportunity for self-discovery.<br><br>Some of your answers will be transformed into a new series of visual posts. The series will create a private media journey for {OwnerName}. There is nothing like this on the planet!";

	if(IsOwnerPostsForMember) {
		MemberSharingStatements = "<br><br>Some of the answers will be transformed into a series of visual posts.<br><br>All members of the group will get to see each other’s answers and comment on them. Comments will also be visible to everyone in the group.<br><br>You will all get to open your posts on {LaunchDate}!";

		if(IsPurchaseNeededForAllPosts) {
			MemberSharingStatements = "<br><br>Some of the answers will be transformed into a new series of visual posts. The series of posts will last up to a year, creating your own private media journey. There is nothing like this on the planet. <br><br>You will be able to see {OwnerName}'s posts and your own posts. You can also appreciate and comment on each other's posts. You and {OwnerName} will get to open your posts on {LaunchDate}! <br><br>If {OwnerName} has invited other people to participate, by buying this Stream, you can see their posts, interact with them and award them fun points. You will also then have your own Stream where you can invite your own friends.";
			if(resultsStrm[0].LaunchSettings.StreamType=='Group' && resultsStrm[0].StreamFlow==='Birthday') {
				MemberSharingStatements = "<br><br>Your text answers will be transformed into visual posts and delivered every few days, for up to a year. You and {OwnerName} will get to see your posts on {LaunchDate}! <br><br>By buying this Stream, you will see posts from other invited friends too, get to interact with them and award points to your favorite posts! You will also then have your own Birthday Stream for your own birthday.";
			}
		} else {
			if(resultsStrm[0].LaunchSettings.StreamType=='Group' && resultsStrm[0].StreamFlow==='Birthday') {
				MemberSharingStatements = "<br><br>Your text answers will be transformed into visual posts and delivered every few days, for up to a year. You and {OwnerName} will get to see your posts on {LaunchDate}! <br><br>you will see posts from other invited friends too, get to interact with them and award points to your favorite posts!";
			}
		}
	}

	var condition = {};
	condition.name = "Stream__InviteExistingMember";

	if(resultsStrm[0].LaunchSettings.Audience == 'CELEBRITY') {
		condition.name = "Stream__InviteExistingCelebrity";
	}
	var CapsuleName = resultsStrm[0].Title ? resultsStrm[0].Title : '';
	var results = await EmailTemplate.find(condition, {});
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}

	var LaunchDate = resultsStrm[0].LaunchDate ? resultsStrm[0].LaunchDate : '';
	var StreamFlow = resultsStrm[0].StreamFlow ? resultsStrm[0].StreamFlow : 'Birthday';

	for( var i = 0; i < users.length; i++ ) {
		var body = users[i] ? users[i] : {};
		saveAsFriend(OwnerDetails, body);
		var mCond = {
			Email : new RegExp('^'+body.Email+'$', 'i'),
			IsDeleted : false
		};
		var memberObj = await User.findOne(mCond);
		memberObj = typeof memberObj == 'object' ? memberObj : {};

		var _cId = memberObj.AllFoldersId ? memberObj.AllFoldersId : '';
		var _pId = memberObj.AllPagesId ? memberObj.AllPagesId : '';
		var userStreamPageUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+StreamId;
		//var userStreamPageUrl = "https://www.scrpt.com/login";

		var newHtml = results[0].description.replace(/{Password}/g, body.Password);
		newHtml = newHtml.replace(/{RecipientName}/g, body.Name.split(' ')[0]);
		newHtml = newHtml.replace(/{RecipientEmail}/g, body.Email);

		var LaunchDateObj = new Date();
		if(StreamFlow == 'Birthday') {
			//LaunchDateObj = new Date(OwnerDetails.Birthdate);
			LaunchDateObj = new Date(LaunchDate);
		} else {
			LaunchDateObj = new Date(LaunchDate);
		}

		var Months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Sep', 'Oct', 'Nov', 'Dec'];
		newHtml = newHtml.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
		newHtml = newHtml.replace(/{LaunchDate}/g, LaunchDateObj.getDate()+' '+Months[LaunchDateObj.getMonth()-1]+' '+LaunchDateObj.getFullYear());

		newHtml = newHtml.replace(/{StreamPageUrl}/g, userStreamPageUrl);
		newHtml = newHtml.replace(/{CapsuleName}/g, CapsuleName);
		MemberSharingStatements = MemberSharingStatements.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
		MemberSharingStatements = MemberSharingStatements.replace(/{LaunchDate}/g, LaunchDateObj.getDate()+' '+Months[LaunchDateObj.getMonth()-1]+' '+LaunchDateObj.getFullYear());
		newHtml = newHtml.replace(/{MemberSharingStatements}/g, MemberSharingStatements);

		if(resultsStrm[0].IsSurpriseGift) {
			SurpriseGiftStatement = SurpriseGiftStatement.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
			newHtml = newHtml.replace(/{SurpriseGiftStatement}/g, SurpriseGiftStatement);
		} else {
			newHtml = newHtml.replace(/{SurpriseGiftStatement}/g, '');
		}

		results[0].subject = results[0].subject ? results[0].subject : '';
		results[0].subject = results[0].subject.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
		results[0].subject = results[0].subject.replace(/{RecipientName}/g, body.Name.split(' ')[0]);

		var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
		var mailOptions = {
			from: process.EMAIL_ENGINE.info.senderLine,
			to: body.Email,
			subject: results[0].subject ? results[0].subject : 'Scrpt',
			html:newHtml
		};
		/*transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				return console.log(error);
			}
			console.log('sendMembersInvitationEmail---------Message sent: ' + info.response);
		});*/
		var info = await transporter.sendMail(mailOptions);
		info = info || {};
		info.response = info.response ? info.response : {};
		console.log('sendMembersInvitationEmail---------Message sent: ' + mailOptions.to + info.response);
	}
}

async function createMembersUserAccount (newUsers, OwnerDetails, StreamId) {
	var newUserAccountEmailIdMap = {};
	newUsers = Array.isArray(newUsers) ? newUsers : [];
	if(!newUsers.length) {
		return;
	}

	var conditionStrm = {};
	conditionStrm._id = ObjectId(StreamId);
	var resultsStrm = await Capsule.find(conditionStrm, {});
	resultsStrm = Array.isArray(resultsStrm) ? resultsStrm : [];
	if(!resultsStrm.length) {
		return;
	}
	var SurpriseGiftStatement = '<br><br>This is a surprise, so please don’t tell {OwnerName}!';

	var IsOwnerPostsForMember = resultsStrm[0].IsOwnerPostsForMember ? resultsStrm[0].IsOwnerPostsForMember : false;
	var IsPurchaseNeededForAllPosts = resultsStrm[0].IsPurchaseNeededForAllPosts ? resultsStrm[0].IsPurchaseNeededForAllPosts : false;

	var MemberSharingStatements = "<br><br>The purpose of this experience is to provide {OwnerName} a unique opportunity for self-discovery.<br><br>Your text answers will be transformed into a new series of visual posts. The series will create a private media journey for {OwnerName}. There is nothing like this on the planet!";

	if(IsOwnerPostsForMember) {
		MemberSharingStatements = "<br><br>Your text answers will be transformed into a series of visual posts.<br><br>All members of the group will get to see each other’s answers and comment on them. Comments will also be visible to everyone in the group.<br><br>You will all get to open your posts on {LaunchDate}!";

		if(IsPurchaseNeededForAllPosts) {
			MemberSharingStatements = "<br><br>Some of the answers will be transformed into a new series of visual posts. The series of posts will last up to a year, creating your own private media journey. There is nothing like this on the planet. <br><br>You will be able to see {OwnerName}'s posts and your own posts. You can also appreciate and comment on each other's posts. You and {OwnerName} will get to open your posts on {LaunchDate}! <br><br>If {OwnerName} has invited other people to participate, by buying this Stream, you can see their posts, interact with them and award them fun points. You will also then have your own Stream where you can invite your own friends.";

			if(resultsStrm[0].LaunchSettings.StreamType=='Group' && resultsStrm[0].StreamFlow==='Birthday') {
				MemberSharingStatements = "<br><br>Your text answers will be transformed into visual posts! Posts from friends will be randomly distributed over a year. {OwnerName} will start receiving posts on {LaunchDate}. <br><br>By purchasing this Stream, you will see all Public posts by friends as they are delivered to {OwnerName}, get to comment on them and award your favorite posts! You will also then have your own Birthyear Stream for your own birthday.";
			}
		} else {
			if(resultsStrm[0].LaunchSettings.StreamType=='Group' && resultsStrm[0].StreamFlow==='Birthday') {
				MemberSharingStatements = "<br><br>Your text answers will be transformed into visual posts! Posts from friends will be randomly distributed over a year. {OwnerName} will start receiving posts on {LaunchDate}. <br><br>You will see all Public posts by friends as they are delivered to {OwnerName}, get to comment on them and award your favorite posts! You will also then have your own Birthyear Stream for your own birthday.";
			}
		}
	}

	var condition = {};
	condition.name = "Stream__InviteNewMember";

	if(resultsStrm[0].LaunchSettings.Audience == 'CELEBRITY') {
		condition.name = "Stream__InviteNewCelebrity";
	}

	var CapsuleName = resultsStrm[0].Title ? resultsStrm[0].Title : '';
	var results = await EmailTemplate.find(condition, {});
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}

	var LaunchDate = resultsStrm[0].LaunchDate ? resultsStrm[0].LaunchDate : '';
	var StreamFlow = resultsStrm[0].StreamFlow ? resultsStrm[0].StreamFlow : 'Birthday';

	for( var i = 0; i < newUsers.length; i++ ) {
		saveAsFriend(OwnerDetails, body);
		var body = newUsers[i] ? newUsers[i] : {};
		var result = await User.find({Email: {$regex : new RegExp("^"+body.Email+"$", "i")}, IsDeleted : false});
		result = Array.isArray(result) ? result : [];
		if (result.length == 0) {
			var newUser = new User();
			newUser.Email = body.Email;
			newUser.Password = newUser.generateHash(body.Password);
			newUser.Name = body.Name
			newUser.NickName = body.Name ? body.Name : "";
			newUser.EmailConfirmationStatus = true;

			var numAffected = await newUser.save();
			numAffected = typeof numAffected == 'object' ? numAffected : {};

			newUserAccountEmailIdMap[body.Email] = numAffected._id;

			__createDefaultJournal_BackgroundCall(numAffected._id, numAffected.Email);

			__updateChapterCollection(newUser.Email , numAffected._id);
			__updateChapterCollection__invitationCase(newUser.Email , numAffected._id);

			var userStreamPageUrl = "https://www.scrpt.com/login";
			var newHtml = results[0].description.replace(/{Password}/g, body.Password);
			newHtml = newHtml.replace(/{RecipientName}/g, body.Name.split(' ')[0]);
			newHtml = newHtml.replace(/{RecipientEmail}/g, body.Email);

			var LaunchDateObj = new Date();
			if(StreamFlow == 'Birthday') {
				//LaunchDateObj = new Date(OwnerDetails.Birthdate);
				LaunchDateObj = new Date(LaunchDate);
			} else {
				LaunchDateObj = new Date(LaunchDate);
			}

			var Months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Sep', 'Oct', 'Nov', 'Dec'];
			newHtml = newHtml.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
			newHtml = newHtml.replace(/{LaunchDate}/g, LaunchDateObj.getDate()+' '+Months[LaunchDateObj.getMonth()-1]+' '+LaunchDateObj.getFullYear());
			newHtml = newHtml.replace(/{StreamPageUrl}/g, userStreamPageUrl);
			newHtml = newHtml.replace(/{CapsuleName}/g, CapsuleName);
			MemberSharingStatements = MemberSharingStatements.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
			MemberSharingStatements = MemberSharingStatements.replace(/{LaunchDate}/g, LaunchDateObj.getDate()+' '+Months[LaunchDateObj.getMonth()-1]+' '+LaunchDateObj.getFullYear());
			newHtml = newHtml.replace(/{MemberSharingStatements}/g, MemberSharingStatements);

			if(resultsStrm[0].IsSurpriseGift) {
				SurpriseGiftStatement = SurpriseGiftStatement.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);
				newHtml = newHtml.replace(/{SurpriseGiftStatement}/g, SurpriseGiftStatement);
			} else {
				newHtml = newHtml.replace(/{SurpriseGiftStatement}/g, '');
			}

			results[0].subject = results[0].subject ? results[0].subject : '';
			results[0].subject = results[0].subject.replace(/{OwnerName}/g, OwnerDetails.Name.split(' ')[0]);

			var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
			var mailOptions = {
				from: process.EMAIL_ENGINE.info.senderLine,
				to: body.Email,
				subject: results[0].subject ? results[0].subject : 'Scrpt',
				html:newHtml
			};
			/*transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					return console.log(error);
				}
				console.log('createMembersUserAccount---------Message sent: ' + info.response);
			});*/
			var info = await transporter.sendMail(mailOptions);
			info = info || {};
			info.response = info.response ? info.response : {};
			console.log('createMembersUserAccount---------Message sent: ' + mailOptions.to + info.response);
		}
	}
	return newUserAccountEmailIdMap;
}

async function sendCoffeeInvitationEmail (memberObj, OwnerDetails, PostStatement, VisualUrls, BlendMode, openingText) {
	var PostImage1 = VisualUrls[0] || '';
	var PostImage2 = VisualUrls[1] || '';
	var condition = {};
	condition.name = "Stream__PostCoffeeInvitation";

	var results = await EmailTemplate.find(condition, {});
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}

	var body = memberObj || {};
	var newHtml = results[0].description.replace(/{RecipientName}/g, body.Name.split(' ')[0]);
	newHtml = newHtml.replace(/{RecipientEmail}/g, body.Email);
	newHtml = newHtml.replace(/{SharedByUserName}/g, OwnerDetails.Name.split(' ')[0]);
	newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
	newHtml = newHtml.replace(/{PostImage1}/g, PostImage1);
	newHtml = newHtml.replace(/{PostImage2}/g, PostImage2);
	newHtml = newHtml.replace(/{BlendMode}/g, BlendMode);
	newHtml = newHtml.replace(/{OpeningText}/g, openingText);

	const $ = cheerio.load(newHtml);
	$('.post-tooltip-box').remove();
	newHtml = $.html();

	results[0].subject = results[0].subject ? results[0].subject : '';
	results[0].subject = results[0].subject.replace(/{SharedByUserName}/g, OwnerDetails.Name.split(' ')[0]);
	results[0].subject = results[0].subject.replace(/{RecipientName}/g, body.Name.split(' ')[0]);

	var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
	var mailOptions = {
		from: process.EMAIL_ENGINE.info.senderLine,
		to: body.Email,
		replyTo: OwnerDetails.Email,
		cc: OwnerDetails.Email,
		subject: results[0].subject ? results[0].subject : 'Scrpt',
		html:newHtml
	};
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			return console.log(error);
		}
		console.log('sendCoffeeInvitationEmail---------Message sent: ' + info.response);
	});
}

var stream__addMembers = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var OwnerId = req.body.OwnerId ? ObjectId(req.body.OwnerId) : null;
	var members = req.body.members ? req.body.members : [];
	if(!StreamId || !OwnerId) {	// || !members.length
		return res.json({code : 501, message : "Wrong input."});
	}

	var OwnerDetails = await User.findOne({_id : OwnerId, IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	if(!OwnerDetails) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var membersToAdd = [];
	var membersEmailArr = [];
	for(var i = 0; i < members.length; i++) {
		members[i].Email = members[i].Email ? members[i].Email.toLowerCase() : null;
		if(members[i].Email) {
			if(members[i].Email.toLowerCase() == OwnerDetails.Email.toLowerCase()) {
				continue;
			}
			membersEmailArr.push(new RegExp('^'+members[i].Email+'$', 'i'));
		}
	}

	var conditions = {
		IsDeleted : 0,
		Email : { $in : membersEmailArr }
	};
	var fields = {
		_id : 1,
		Email : 1,
		Name : 1
	};
	//create a user and send them random password, fetch id and save it.
	var alreadyExistsUsers = await User.find(conditions, fields);
	alreadyExistsUsers = Array.isArray(alreadyExistsUsers) ? alreadyExistsUsers : [];
	var UserEmailIdMap = {};

	var alreadyExistingUsersIds = [];
	for( var i = 0; i < alreadyExistsUsers.length; i++ ) {
		alreadyExistsUsers[i].Email = alreadyExistsUsers[i].Email.toLowerCase();
		UserEmailIdMap[alreadyExistsUsers[i].Email] = alreadyExistsUsers[i]._id;
		alreadyExistingUsersIds.push(ObjectId(alreadyExistsUsers[i]._id));
	}

	var newUserAccountNeedsToBeCreated = [];
	for( var i = 0; i < members.length; i++ ) {
		if(!UserEmailIdMap[members[i].Email]) {
			newUserAccountNeedsToBeCreated.push({
				Name : members[i].Name ? members[i].Name : '',
				Email : members[i].Email ? members[i].Email : '',
				Password : getRandomPassword(12) //"12345678"
			});
		}
	}
	var newUserAccountEmailIdMap = {};
	if(newUserAccountNeedsToBeCreated.length) {
		newUserAccountEmailIdMap = await createMembersUserAccount(newUserAccountNeedsToBeCreated, OwnerDetails, StreamId);
	}


	var conditions = {
		StreamId : StreamId,
		OwnerId : OwnerId,
		IsDeleted : false
	};

	var strm_result = await StreamMembers.find(conditions);
	strm_result = Array.isArray(strm_result) ? strm_result : [];
	strm_result = strm_result.length > 0 ? strm_result[0] : null;

	if(alreadyExistsUsers.length) {
		var sendInvitesToUsers = [];
		if(strm_result) {
			strm_result.Members = Array.isArray(strm_result.Members) ? strm_result.Members : [];
			for(var i = 0; i < alreadyExistsUsers.length; i++) {
				if(strm_result.Members.indexOf(ObjectId(alreadyExistsUsers[i]._id)) < 0) {
					sendInvitesToUsers.push(alreadyExistsUsers[i]);
				}
			}
		} else {
			sendInvitesToUsers = alreadyExistsUsers;
		}
		sendMembersInvitationEmail(sendInvitesToUsers, OwnerDetails, StreamId);
	}

	//now add member ids in StreamMembers.
	for(var i = 0; i < members.length; i++) {
		var memberId = UserEmailIdMap[members[i].Email] ? UserEmailIdMap[members[i].Email] : newUserAccountEmailIdMap[members[i].Email];
		if(memberId) {
			membersToAdd.push(ObjectId(memberId));
		}
	}



	if(strm_result == null) {
		strm_result = {};
		strm_result.Members = membersToAdd ? membersToAdd : [];
		var streamMembers = new StreamMembers();
		streamMembers.StreamId = StreamId;
		streamMembers.OwnerId = OwnerId;
		streamMembers.Members = strm_result.Members;
		var result = await StreamMembers(streamMembers).save();
		result = typeof result == 'object' ? result : null;

		if(!result) {
			return res.json({code : 501, message : "Something went wrong."});
		}
	} else {
		strm_result.Members = Array.isArray(strm_result.Members) ? strm_result.Members : [];
		strm_result.Members = Array.isArray(membersToAdd) ? membersToAdd : strm_result.Members;
		var result = await StreamMembers.update(conditions, {$set : strm_result});
		result = typeof result == 'object' ? result : null;

		if(!result) {
			return res.json({code : 501, message : "Something went wrong."});
		}
	}

	await Capsule.update({_id : StreamId}, {$set : {"LaunchSettings.IsInvitationSent" : true}});
	return res.json({code : 200, message : "Members added successfully."});
}

var stream__sendCoffeeInvitation = async function (req, res) {
	//var OwnerId = req.body.OwnerId ? ObjectId(req.body.OwnerId) : null;
	var OwnerId = req.session.user._id ? ObjectId(req.session.user._id) : null;
	var members = req.body.members ? req.body.members : [];
	var postObj = req.body.postObj || null;
	var PostStatement = postObj.PostStatement ? postObj.PostStatement : postObj.Content;
	PostStatement = PostStatement || '';

	var VisualUrls = Array.isArray(postObj.VisualUrls) ? postObj.VisualUrls : [];
	if(VisualUrls.length == 1) {
		VisualUrls.push(VisualUrls[0]);
	}

	var BlendMode = postObj.BlendMode || 'hard-light';
	var openingText = req.body.openingText || '';

	if(!OwnerId || !PostStatement || VisualUrls.length < 2) {	// || !members.length
		return res.json({code : 501, message : "Wrong input."});
	}

	var OwnerDetails = await User.findOne({_id : OwnerId, IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	if(!OwnerDetails) {
		return res.json({code : 501, message : "Wrong input."});
	}

	for(var i = 0; i < members.length; i++) {
		var member = members[i];
		//check member email and save as friend
		saveAsFriend(req.session.user, member);
		sendCoffeeInvitationEmail(member, OwnerDetails, PostStatement, VisualUrls, BlendMode, openingText);
	}
	return res.json({code : 200, message : "Invitation sent."});
}

var stream__getMembersList = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var OwnerId = req.body.OwnerId ? ObjectId(req.body.OwnerId) : null; //req.session.user._id ? req.session.user._id : null;
	var members = req.body.members ? req.body.members : [];
	if(!StreamId || !OwnerId) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var conditions = {
		StreamId : StreamId,
		OwnerId : OwnerId,
		IsDeleted : false
	};

	var strm_result = await StreamMembers.find(conditions);//.populate('Members');
	strm_result = Array.isArray(strm_result) ? strm_result : [];
	strm_result = strm_result.length > 0 ? strm_result[0] : {};

	strm_result.Members = strm_result.Members ? strm_result.Members : [];
	//console.log(strm_result.Members);
	strm_result.Members = Array.isArray(strm_result.Members) ? strm_result.Members : [];
	var membersArr = [];
	if(strm_result.Members.length) {
		var memberIds = [];
		for(var i = 0; i < strm_result.Members.length; i++) {
			memberIds.push(ObjectId(strm_result.Members[i]));
		}
		if(memberIds.length) {
			var conditions = {
				_id : {
					$in : memberIds
				},
				IsDeleted : 0
			};
			var fields = {
				Name : 1,
				Email : 1,
				ProfilePic : 1
			};
			var membersResult = await User.find(conditions, fields);
			for(var i = 0; i < membersResult.length; i++) {
				membersArr.push({
					Name : membersResult[i].Name,
					Email : membersResult[i].Email
				});
			}
		}
	}
	return res.json({code : 200, result: membersArr});
}

var stream__updateMembers = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var OwnerId = req.body.OwnerId ? ObjectId(req.body.OwnerId) : null;
	var members = req.body.members ? req.body.members : [];

	if(!StreamId || !OwnerId || !members.length) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var OwnerDetails = await User.findOne({_id : OwnerId, IsDeleted : 0}, {Name : 1, Email : 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	if(!OwnerDetails) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var membersToAdd = [];
	var membersEmailArr = [];
	for(var i = 0; i < members.length; i++) {
		members[i].Email = members[i].Email ? members[i].Email : null;
		if(members[i].Email) {
			membersEmailArr.push(new RegExp('^'+members[i].Email+'$', 'i'));
		}
	}

	var conditions = {
		IsDeleted : 0,
		Email : { $in : membersEmailArr }
	};
	var fields = {
		_id : 1,
		Email : 1,
		Name : 1
	};
	//create a user and send them random password, fetch id and save it.
	var alreadyExistsUsers = await User.find(conditions, fields);
	alreadyExistsUsers = Array.isArray(alreadyExistsUsers) ? alreadyExistsUsers : [];
	var UserEmailIdMap = {};
	for( var i = 0; i < alreadyExistsUsers.length; i++ ) {
		UserEmailIdMap[alreadyExistsUsers[i].Email] = alreadyExistsUsers[i]._id;
	}

	var newUserAccountNeedsToBeCreated = [];
	for( var i = 0; i < members.length; i++ ) {
		if(!UserEmailIdMap[members[i].Email]) {
			newUserAccountNeedsToBeCreated.push({
				Name : members[i].Name ? members[i].Name : '',
				Email : members[i].Email ? members[i].Email : '',
				Password : getRandomPassword(12) //"12345678"
			});
		}
	}
	var newUserAccountEmailIdMap = {};
	if(newUserAccountNeedsToBeCreated.length) {
		newUserAccountEmailIdMap = await createMembersUserAccount(newUserAccountNeedsToBeCreated, OwnerDetails, StreamId);
	}

	if(alreadyExistsUsers.length) {
		sendMembersInvitationEmail(alreadyExistsUsers, OwnerDetails, StreamId);
	}

	//now add member ids in StreamMembers.
	for(var i = 0; i < members.length; i++) {
		var memberId = UserEmailIdMap[members[i].Email] ? UserEmailIdMap[members[i].Email] : newUserAccountEmailIdMap[members[i].Email];
		if(memberId) {
			membersToAdd.push(ObjectId(memberId));
		}
	}
	var streamMembers = new StreamMembers();
	streamMembers.StreamId = StreamId;
	streamMembers.OwnerId = OwnerId;
	streamMembers.Members = membersToAdd;

	var result = await StreamMembers(streamMembers).save();
	result = typeof result == 'object' ? result : null;

	if(!result) {
		return res.json({code : 501, message : "Something went wrong."});
	}
	await Capsule.update({_id : StreamId}, {$set : {"LaunchSettings.IsInvitationSent" : true}});
	return res.json({code : 200, message : "Members added successfully."});
}

var stream__publicaddMembers = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var OwnerId = req.body.OwnerId ? ObjectId(req.body.OwnerId) : null;
	var members = req.body.members ? req.body.members : [];
	if(!StreamId || !OwnerId || !members.length) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var OwnerDetails = await User.findOne({_id : OwnerId, IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	if(!OwnerDetails) {
		return res.json({code : 501, message : "Wrong input."});
	}

	var membersToAdd = [];
	var membersEmailArr = [];
	for(var i = 0; i < members.length; i++) {
		members[i].Email = members[i].Email ? members[i].Email.toLowerCase() : null;
		if(members[i].Email) {
			if(members[i].Email.toLowerCase() == OwnerDetails.Email.toLowerCase()) {
				continue;
			}
			membersEmailArr.push(new RegExp('^'+members[i].Email+'$', 'i'));
		}
	}

	var conditions = {
		IsDeleted : 0,
		Email : { $in : membersEmailArr }
	};
	var fields = {
		_id : 1,
		Email : 1,
		Name : 1
	};
	//create a user and send them random password, fetch id and save it.
	var alreadyExistsUsers = await User.find(conditions, fields);
	alreadyExistsUsers = Array.isArray(alreadyExistsUsers) ? alreadyExistsUsers : [];
	var UserEmailIdMap = {};
	for( var i = 0; i < alreadyExistsUsers.length; i++ ) {
		alreadyExistsUsers[i].Email = alreadyExistsUsers[i].Email.toLowerCase();
		UserEmailIdMap[alreadyExistsUsers[i].Email] = alreadyExistsUsers[i]._id;
	}

	var newUserAccountNeedsToBeCreated = [];
	for( var i = 0; i < members.length; i++ ) {
		if(!UserEmailIdMap[members[i].Email]) {
			newUserAccountNeedsToBeCreated.push({
				Name : members[i].Name ? members[i].Name : '',
				Email : members[i].Email ? members[i].Email : '',
				Password : getRandomPassword(12) //"12345678"
			});
		}
	}
	var newUserAccountEmailIdMap = {};
	if(newUserAccountNeedsToBeCreated.length) {
		newUserAccountEmailIdMap = await createMembersUserAccount(newUserAccountNeedsToBeCreated, OwnerDetails, StreamId);
	}

	if(alreadyExistsUsers.length) {
		sendMembersInvitationEmail(alreadyExistsUsers, OwnerDetails, StreamId);
	}

	console.log("newUserAccountEmailIdMap - ", newUserAccountEmailIdMap);

	//now add member ids in StreamMembers.
	for(var i = 0; i < members.length; i++) {
		var memberId = UserEmailIdMap[members[i].Email] ? UserEmailIdMap[members[i].Email] : newUserAccountEmailIdMap[members[i].Email];
		if(memberId) {
			membersToAdd.push(ObjectId(memberId));
		}
	}
	console.log("membersToAdd - ", membersToAdd);
	if(!membersToAdd.length) {
		return res.json({code : 501, message : "Something went wrong."});
	}

	var conditions = {
		StreamId : StreamId,
		OwnerId : OwnerId,
		IsDeleted : false
	};
	var strm_result = await StreamMembers.find(conditions);
	strm_result = Array.isArray(strm_result) ? strm_result : [];
	strm_result = strm_result.length > 0 ? strm_result[0] : null;
	if(strm_result == null) {
		strm_result = {};
		strm_result.Members = membersToAdd ? membersToAdd : [];
		var streamMembers = new StreamMembers();
		streamMembers.StreamId = StreamId;
		streamMembers.OwnerId = OwnerId;
		streamMembers.Members = strm_result.Members;
		var result = await StreamMembers(streamMembers).save();
		result = typeof result == 'object' ? result : null;

		if(!result) {
			return res.json({code : 501, message : "Something went wrong."});
		}
	} else {
		if(strm_result.Members.length == 0) {
			strm_result.Members = membersToAdd;
		}

		let isAlreadyExists = false;
		for(var loop = 0; loop < strm_result.Members.length; loop++) {
			if(strm_result.Members[loop] == membersToAdd[0]){
				isAlreadyExists = true;
				break;
			}
		}

		if(!isAlreadyExists) {
			strm_result.Members = strm_result.Members.concat(membersToAdd);
			var result = await StreamMembers.update(conditions, {$set : strm_result});
			result = typeof result == 'object' ? result : null;

			if(!result) {
				return res.json({code : 501, message : "Something went wrong."});
			}
		}
	}
	//await Capsule.update({_id : StreamId}, {$set : {"LaunchSettings.IsInvitationSent" : true}});
	return res.json({code : 200, message : "Members added successfully."});
}


var addKeywordAndCallAddBlendImagesApi_INTERNAL_API_BackupAPI_V2 = async function (req, res) {
	var inputObj = {
		PostId : req.body.PostId ? req.body.PostId : null,
		PostType : req.body.PostType ? req.body.PostType : null,
		MediaType : req.body.MediaType ? req.body.MediaType : null,
		PostText : req.body.PostText ? req.body.PostText : null
	};

	var PageId = req.body.PageId ? req.body.PageId : null;

	if(PageId && inputObj.PostId && inputObj.PostType == 'AnswerPost' && inputObj.MediaType == 'Notes' && req.body.PostText) {
		//fetch Keywords and map it with post in db
		var keywords = await fetchKeywordsFromText(inputObj.PostText);
		keywords = Array.isArray(keywords) ? keywords : [];

		if(keywords.length == 2) {
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
					"Medias.$.SurpriseSelectedWords" : keywords	//Possible values - Ad / BroadcastPost / Post
				}
			};

			var options = { multi: false };
			await Page.update(conditions, setObj, options);
			await Page.update(conditions2, {$set : setObj}, options);

			//now call addBlendImages internal api using axios
			var reqObj = {
				PageId : PageId ? PageId : null,
				PostId : PostId ? PostId : null,
				SurpriseSelectedWords : keywords ? keywords : []
			};
			console.log("Calling addBlendImages_INTERNAL_API --------------------------------- ", reqObj);
			var request_url = 'https://www.scrpt.com/journal/addBlendImages_INTERNAL_API';
			axios.post(request_url, reqObj)
				.then(response => {
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS (ONETIME - /journal/addBlendImages_INTERNAL_API)---- SelectedBlendImages with Post has been mapped successfully using api call ---------------", response.data.code);
				});

			return res.json({
				code : 200,
				message : "Keywords mapped with post and called api to map SelectedBlendImages."
			});
		} else {
			return res.json({
				code : 200,
				message : "Keywords not found."
			});
		}
	} else {
		return res.json({
			code : 200,
			message : "Wrong input."
		});
	}
}

var addKeywordAndCallAddBlendImagesApi_INTERNAL_API = async function (req, res) {
	var inputObj = {
		PostId : req.body.PostId ? req.body.PostId : null,
		PostType : req.body.PostType ? req.body.PostType : null,
		MediaType : req.body.MediaType ? req.body.MediaType : null,
		PostText : req.body.PostText ? req.body.PostText : null
	};

	var PageId = req.body.PageId ? req.body.PageId : null;

	if(PageId && inputObj.PostId && inputObj.PostType == 'AnswerPost' && inputObj.MediaType == 'Notes' && req.body.PostText) {
		//fetch Keywords and map it with post in db
		//var keywords = await fetchKeywordsFromText(inputObj.PostText);
		//keywords = Array.isArray(keywords) ? keywords : [];

		var keywordsObj = await fetchKeywordsFromText_PrimarySecondary(inputObj.PostText);
		var keywords = keywordsObj.Primary || [];
		var secondaryKeywords = keywordsObj.Secondary || [];

		if(keywords.length == 2) {
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
					"Medias.$.SurpriseSelectedWords" : keywords,
					"Medias.$.SecondaryKeywords": secondaryKeywords
				}
			};

			var options = { multi: false };
			await Page.update(conditions, setObj, options);
			await Page.update(conditions2, {$set : setObj}, options);

			//now call addBlendImages internal api using axios
			var reqObj = {
				PageId : PageId ? PageId : null,
				PostId : PostId ? PostId : null,
				SurpriseSelectedWords : keywords ? keywords : [],
				SecondaryKeywords: await __getKeywordIdsByNames(secondaryKeywords) || [],
				PostStatement: inputObj.PostText || ''
			};
			console.log("Calling addBlendImages_INTERNAL_API --------------------------------- ", reqObj);
			var request_url = 'https://www.scrpt.com/journal/addBlendImages_INTERNAL_API';
			axios.post(request_url, reqObj)
				.then(response => {
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS (ONETIME - /journal/addBlendImages_INTERNAL_API)---- SelectedBlendImages with Post has been mapped successfully using api call ---------------", response.data.code);
				});

			return res.json({
				code : 200,
				message : "Keywords mapped with post and called api to map SelectedBlendImages."
			});
		} else {
			return res.json({
				code : 200,
				message : "Keywords not found."
			});
		}
	} else {
		return res.json({
			code : 200,
			message : "Wrong input."
		});
	}
}

var addBlendImages_INTERNAL_API = async function (req, res) {
	req.session = req.session ? req.session : {};
	req.session.user = req.session.user ? req.session.user : {};
	req.session.user.onlyunsplash = req.session.user.onlyunsplash ? req.session.user.onlyunsplash : false;
	req.session.user.onlyenablers = req.session.user.onlyenablers ? req.session.user.onlyenablers : false;

	var keywords = req.body.SurpriseSelectedWords ? req.body.SurpriseSelectedWords : [];
	var PostStatement = req.body.PostStatement || '';
	var PostStreamType = req.body.PostStreamType || '';

	async_lib.parallel({
		mediaFromFirstSet: function(callback) {
			req.body.subsetByRank = req.body.subsetByRank ? req.body.subsetByRank : [];
			getMediaFromSet(req, callback);
			//callback(null, 'abc\n');
		},
		mediaFromSecondSet: function(callback) {
			req.body.subsetByRank2 = req.body.subsetByRank2 ? req.body.subsetByRank2 : [];
			if(PostStreamType === '1UnsplashPost') {
				(function () {
					const returnObj = {
						"results":[]
					};
					callback(null, returnObj);
				}());
			} else {
				getMediaFromSet2(req, callback);
			}
		}
	}, async function(err, results) {
		// results now equals to: results.mediaFromFirstSet: 'abc\n', results.mediaFromSecondSet: 'xyz\n'
		var MediaSet1 = results.mediaFromFirstSet.results ? results.mediaFromFirstSet.results : [];
		var MediaSet2 = results.mediaFromSecondSet.results ? results.mediaFromSecondSet.results : [];

		var finalMediaArr = [];

		var MediaSet1Length = MediaSet1.length;
		var MediaSet2Length = MediaSet2.length;

		var tempArr = [];

		var rankObj = {};
		var noOfMediaPerRankLimit = 500;
		for(var i = 0; i < MediaSet1Length; i++ ) {
			var record = MediaSet1[i];

			rankObj['rank_'+record.value.Ranks] = rankObj['rank_'+record.value.Ranks] ? rankObj['rank_'+record.value.Ranks] : [];
			if(rankObj['rank_'+record.value.Ranks].length >= noOfMediaPerRankLimit) {
				continue;
			}

			tempArr.push({
				"MediaURL" : record.value.thumbnail,
				"MediaURL2" : record.value.Location,
				"MediaId" : record.value._id,
				"MediaType" : record.value.MediaType,
				"LinkType" : record.value.LinkType,
				"Prompt" : record.value.Prompt,
				"Ranks" : record.value.Ranks,
				"Lightness" : record.value.Lightness ? record.value.Lightness : null,
				"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null,
				"SelectedGtTitle" : record.value.SelectedGtTitle ? record.value.SelectedGtTitle : '',
				"SecondaryKeywords" : record.value.SecondaryKeywords ? record.value.SecondaryKeywords : [],
				"SecondaryKeywordsCount" : record.value.SecondaryKeywordsCount ? record.value.SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap" : record.value.SecondaryKeywordsMap ? record.value.SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount" : record.value.MediaSelectionCriteriaCount ? record.value.MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr" : record.value.MediaSelectionCriteriaArr ? record.value.MediaSelectionCriteriaArr : [],
				"MetaData" : record.value.MetaData ? record.value.MetaData : {},
				"AllMetaData" : record.value.AllMetaData ? record.value.AllMetaData : {}
			});

			rankObj['rank_'+record.value.Ranks].push(record.value._id);

			if(tempArr.length >= 250) {
				break;
			}
		}


		finalMediaArr.push({
			"Medias" : tempArr
		});


		tempArr = [];
		var rankObj2 = {};
		noOfMediaPerRankLimit = 500;

		if(PostStreamType === '1UnsplashPost') {
			//reset MediaSet2, MediaSet2Length and noOfMediaPerRankLimit
			MediaSet2Length = MediaSet1Length;
			noOfMediaPerRankLimit = MediaSet2Length;
			MediaSet2 = [];
			
			for(var i = 0; i < MediaSet2Length; i++ ) {
				MediaSet2.push({
					value: {
						Ranks: 1,
						thumbnail: null,
						Location: [{
							URL: '09182022204653_35889.png'
						}],
						_id: null,
						MediaType: 'Image',
						LinkType: null,
						Prompt: ''

					}
				});
			}
		}

		for(var i = 0; i < MediaSet2Length; i++ ) {
			var record = MediaSet2[i];

			rankObj2['rank_'+record.value.Ranks] = rankObj2['rank_'+record.value.Ranks] ? rankObj2['rank_'+record.value.Ranks] : [];
			if(rankObj2['rank_'+record.value.Ranks].length >= noOfMediaPerRankLimit) {
				continue;
			}

			tempArr.push({
				"MediaURL" : record.value.thumbnail,
				"MediaURL2" : record.value.Location,
				"MediaId" : record.value._id,
				"MediaType" : record.value.MediaType,
				"LinkType" : record.value.LinkType,
				"Prompt" : record.value.Prompt,
				"Ranks" : record.value.Ranks,
				"Lightness" : record.value.Lightness ? record.value.Lightness : null,
				"DominantColors" : record.value.DominantColors ? record.value.DominantColors : null,
				"SelectedGtTitle" : record.value.SelectedGtTitle ? record.value.SelectedGtTitle : '',
				"SecondaryKeywords" : record.value.SecondaryKeywords ? record.value.SecondaryKeywords : [],
				"SecondaryKeywordsCount" : record.value.SecondaryKeywordsCount ? record.value.SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap" : record.value.SecondaryKeywordsMap ? record.value.SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount" : record.value.MediaSelectionCriteriaCount ? record.value.MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr" : record.value.MediaSelectionCriteriaArr ? record.value.MediaSelectionCriteriaArr : [],
				"MetaData" : record.value.MetaData ? record.value.MetaData : {},
				"AllMetaData" : record.value.AllMetaData ? record.value.AllMetaData : {}
			});

			rankObj2['rank_'+record.value.Ranks].push(record.value._id);

			if(tempArr.length >= 250) {
				break;
			}
		}


		finalMediaArr.push({
			"Medias" : tempArr
		});

		var set1 = finalMediaArr[0].Medias ? finalMediaArr[0].Medias : [];
		var set2 = finalMediaArr[1].Medias ? finalMediaArr[1].Medias : [];
		var selectedIndexes = [];
		var selectedLengthForLoop = (set1.length > set2.length) ? set2.length : set1.length;

		//save maximum of 30 selection if suggested blend images are more than 30
		selectedLengthForLoop = selectedLengthForLoop <= 30 ? selectedLengthForLoop : 30;

		var selectedArr = [];
		for(var loop = 0; loop < selectedLengthForLoop; loop++) {
			var blendImage1 = set1[loop].MediaURL ? set1[loop].MediaURL : "https://www.scrpt.com/assets/Media/img/300/" + set1[loop].MediaURL2[0].URL;
			var blendImage2 = set2[loop].MediaURL ? set2[loop].MediaURL : "https://www.scrpt.com/assets/Media/img/300/" + set2[loop].MediaURL2[0].URL;

			var selectedKeywords = [];
			if(set1[loop].SelectedGtTitle) {
				selectedKeywords.push(set1[loop].SelectedGtTitle);
			}
			if(set2[loop].SelectedGtTitle) {
				selectedKeywords.push(set2[loop].SelectedGtTitle);
			}

			var obj = {
				"blendImage1" : blendImage1,
				"blendImage2" : blendImage2,
				"isSelected" : true,
				"blendMode" : "hard-light",
				"Keywords" : keywords ? keywords : [],
				"SelectedKeywords" : selectedKeywords ? selectedKeywords : [],

				"SecondaryKeywordsCount_1" : set1[loop].SecondaryKeywordsCount ? set1[loop].SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap_1" : set1[loop].SecondaryKeywordsMap ? set1[loop].SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount_1" : set1[loop].MediaSelectionCriteriaCount ? set1[loop].MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr_1" : set1[loop].MediaSelectionCriteriaArr ? set1[loop].MediaSelectionCriteriaArr : [],
				"MetaData_1" : set1[loop].AllMetaData ? set1[loop].AllMetaData : [],

				"SecondaryKeywordsCount_2" : set2[loop].SecondaryKeywordsCount ? set2[loop].SecondaryKeywordsCount : 0,
				"SecondaryKeywordsMap_2" : set2[loop].SecondaryKeywordsMap ? set2[loop].SecondaryKeywordsMap : [],
				"MediaSelectionCriteriaCount_2" : set2[loop].MediaSelectionCriteriaCount ? set2[loop].MediaSelectionCriteriaCount : 0,
				"MediaSelectionCriteriaArr_2" : set2[loop].MediaSelectionCriteriaArr ? set2[loop].MediaSelectionCriteriaArr : [],
				"MetaData_2" : set2[loop].AllMetaData ? set2[loop].AllMetaData : {}
			};
			obj = CommonAlgo.commonModule.getBlendConfigByLightnessScores(obj, (set1[loop].Lightness || 0), (set2[loop].Lightness || 0));

			selectedArr.push(obj);

			if(loop < 1) {
				var reqObj = {
					blendImage1 : obj.blendImage1 ? obj.blendImage1 : null,
					blendImage2 : obj.blendImage2 ? obj.blendImage2 : null,
					blendMode : obj.blendMode ? obj.blendMode : "hard-light"
				};
				console.log("Calling generatePostBlendImage_INTERNAL_API --------------------------------- ", reqObj);
				var request_url = 'https://www.scrpt.com/journal/generatePostBlendImage_INTERNAL_API';
				axios.post(request_url, reqObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS (/journal/generatePostBlendImage_INTERNAL_API)---- blend image generated successfully ---------------", response.data.code);
					});
			}
		}

		var SelectedBlendImages = selectedArr;
		if(SelectedBlendImages.length) {
			//save SelectedBlendImages with post in db.

			var PageId = req.body.PageId ? req.body.PageId : null;
			var PostId = req.body.PostId ? req.body.PostId : null;

			if(PageId && PostId) {
				var DateToSave = {
					PageId : PageId,
					PostId : PostId,
					PostStatement : PostStatement,
					SelectedBlendImages : SelectedBlendImages
				};
				await PageStream(DateToSave).save();
			} else {
				console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ --------- PageId = ", PageId);
			}

			/*
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
					"Medias.$.SelectedBlendImages" : SelectedBlendImages	//Possible values - Ad / BroadcastPost / Post
				}
			};

			var options = { multi: false };
			await Page.update(conditions, setObj, options);
			await Page.update(conditions2, {$set : setObj}, options);
			*/
		} else {
			console.log("******************************************************************************", set1.length);
			console.log("******************************************************************************", set2.length);
		}

		return res.json({
			"code":"200",
			message : "SelectedBlendImages mapped with post."
		});

	});
}

var addAnswerFinishStatus = async function (req, res) {
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var MemberId = req.session.user._id;

	if(!StreamId || !MemberId) {
		return res.json({code : 501, message : "wrong input."});
	}

	//validate
	var streamPageId = await getPageIdByStream(StreamId);
	if(!streamPageId) {
		return res.json({code : 501, message : "Something went wrong."});
	}
	var conditions = {
		_id : ObjectId(String(streamPageId)),
		IsDeleted : false
	};

	var PostToPopulate = {
		"Medias.PostType" : "QuestionPost"
	};

	var questionPostsArr = await Page.aggregate([
		{ $match : conditions },
		{ $unwind : "$Medias" },
		{ $match : PostToPopulate },
		{
			$project : {
				PostId : "$Medias._id"
			}
		}
	]);
	questionPostsArr = Array.isArray(questionPostsArr) ? questionPostsArr : [];
	var questionPostIds = [];
	for(var i = 0; i < questionPostsArr.length; i++) {
		questionPostIds.push(questionPostsArr[i].PostId);
	}

	if(questionPostIds.length) {
		//now check whether the member has answered any posts or not
		var givenAnswerPostsArr = await Page.aggregate([
			{ $unwind : "$Medias" },
			{
				$match : {
					"Medias.PostedBy" : ObjectId(String(MemberId)),
					"Medias.PostType" : "AnswerPost",
					"Medias.QuestionPostId" : {$in : questionPostIds}
				}
			},
			{
				$project : {
					PostId : "Medias._id"
				}
			}
		]);

		givenAnswerPostsArr = Array.isArray(givenAnswerPostsArr) ? givenAnswerPostsArr : [];
		if(givenAnswerPostsArr.length == 0) {
			return res.json({code : 404, message : "no answers found."});
		}
	}

	var AnswerFinishLogsObj = new AnswerFinishLogs();

	AnswerFinishLogsObj.StreamId = ObjectId(StreamId);
	AnswerFinishLogsObj.MemberId = ObjectId(MemberId);

	await AnswerFinishLogs(AnswerFinishLogsObj).save();
	return res.json({code : 200, message : "Logged successfully."});
}

var getAnswerStageStatus = async function (req, res) {
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var MemberId = req.session.user._id;

	if(!StreamId || !MemberId) {
		return res.json({code : 200, IsAnswerStageFinished : true});
	}

	var conditions = {};

	conditions.StreamId = ObjectId(StreamId);
	conditions.MemberId = ObjectId(String(MemberId));

	var result = await AnswerFinishLogs.find(conditions);
	result = Array.isArray(result) ? result : [];
	return res.json({code : 200, IsAnswerStageFinished : (result.length ? true : false)});
}

var createNewUserAccount_INTERNAL_API = async function (req, res) {
	var newUserId = null;
	var body = req.body.newUser ? req.body.newUser : {};
	body.Email = body.Email ? body.Email : '';
	body.Email = body.Email.replace('.', '\.');
	body.Name = body.Name ? body.Name : '';
	body.NickName = body.NickName ? body.NickName : '';
	body.Password = getRandomPassword(12);

	if(!body.Email || !body.Name || !body.NickName || !body.Password) {
		return res.json({newUserId : newUserId, message : "Wrong input."});
	}

	var result = await User.find({Email: {$regex : new RegExp("^"+body.Email+"$", "i")}, IsDeleted : false});
	result = Array.isArray(result) ? result : [];
	if (result.length == 0) {
		var newUser = new User();
		newUser.Email = body.Email;
		newUser.Password = newUser.generateHash(body.Password);
		newUser.Name = body.Name;
		newUser.NickName = body.Name ? body.Name : "";
		newUser.EmailConfirmationStatus = true;

		var numAffected = await newUser.save();
		numAffected = typeof numAffected == 'object' ? numAffected : {};

		newUserId = numAffected._id;

		__createDefaultJournal_BackgroundCall(numAffected._id, numAffected.Email);

		__updateChapterCollection(newUser.Email , numAffected._id);
		__updateChapterCollection__invitationCase(newUser.Email , numAffected._id);
	}
	return res.json({code : 200, newUserId : newUserId});
}

var sendUserSurpriseGiftNotification_INRENAL_API = async function (req, res) {
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var PurchasedBy = req.body.PurchasedBy ? req.body.PurchasedBy : null;

	var OwnerDetails = await User.findOne({_id : ObjectId(OwnerId), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;
	if(!OwnerDetails.Birthdate) {
		return res.json({code : 501, message : "Owner Birthdate is not set."});
	}

	var PurchasedByObj = await User.findOne({_id : ObjectId(PurchasedBy), IsDeleted : 0}, {Name : 1, Email : 1, Birthdate: 1});
	PurchasedByObj = typeof PurchasedByObj == 'object' ? PurchasedByObj : null;
	if(!PurchasedByObj) {
		return res.json({code : 501, message : "PurchasedByObj not found."});
	}

	OwnerDetails.Name = OwnerDetails.Name.split(' ')[0];
	PurchasedByObj.Name = PurchasedByObj.Name.split(' ')[0];

	var condition = {};
	condition.name = "Stream__GiftToExistingUser";
	var results = await EmailTemplate.find(condition, {});
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}
	var userStreamPageUrl = "https://www.scrpt.com/login";
	var _cId = OwnerDetails.AllFoldersId ? OwnerDetails.AllFoldersId : '';
	var _pId = OwnerDetails.AllPagesId ? OwnerDetails.AllPagesId : '';
	userStreamPageUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+StreamId;

	newHtml = results[0].description.replace(/{RecipientName}/g, OwnerDetails.Name);
	newHtml = newHtml.replace(/{RecipientEmail}/g, OwnerDetails.Email);

	var OwnerBirthdate = new Date(OwnerDetails.Birthdate);
	var Months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Sep', 'Oct', 'Nov', 'Dec'];
	newHtml = newHtml.replace(/{OwnerName}/g, OwnerDetails.Name);
	newHtml = newHtml.replace(/{OwnerBirthday}/g, OwnerBirthdate.getDate()+' '+Months[OwnerBirthdate.getMonth()]);
	newHtml = newHtml.replace(/{StreamPageUrl}/g, userStreamPageUrl);
	newHtml = newHtml.replace(/{SponsorName}/g, PurchasedByObj.Name);

	var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
	var mailOptions = {
		from: process.EMAIL_ENGINE.info.senderLine,
		to: OwnerDetails.Email,
		subject: results[0].subject ? results[0].subject : 'Scrpt',
		html:newHtml
	};
	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			return console.log(error);
			return res.json({code : 501, message : "Something went wrong."});
		}
		console.log('sendUserSurpriseGiftNotification_INRENAL_API---------Message sent: ' + info.response);
		return res.json({code : 501, message : "Email sent."});
	});
}

var sendPreLaunchPosts_INTERNAL_API = async function (req, res) {
	//console.log("-------- sendPreLaunchPosts_INTERNAL_API --------");
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var OwnerId = req.body.OwnerId ? req.body.OwnerId : null;
	var StreamData = req.body.StreamData || null;

	var OwnerDetails = req.body.SessionUser || null;
	OwnerDetails = typeof OwnerDetails == 'object' ? OwnerDetails : null;

	/*if(StreamData.StreamFlow == 'Birthday' && !OwnerDetails.Birthdate) {
		return res.json({code : 501, message : "Owner Birthdate is not set."});
	}*/

	if(StreamData.StreamFlow == 'Birthday' && !StreamData.LaunchDate) {
		return res.json({code : 501, message : "This Birthday Stream LaunchDate is not set."});
	}

	OwnerDetails.Name = OwnerDetails.Name.split(' ')[0];

	var results = req.body.EmailTemplateResult || [];
	results = Array.isArray(results) ? results : [];
	if(!results.length) {
		return;
	}
	//console.log("-------- sendPreLaunchPosts_INTERNAL_API 22222222222222 --------");
	var userStreamPageUrl = "https://www.scrpt.com/login";
	var _cId = OwnerDetails.AllFoldersId ? OwnerDetails.AllFoldersId : '';
	var _pId = OwnerDetails.AllPagesId ? OwnerDetails.AllPagesId : '';

	var posts = await getPreLaunchPostsByStreamId(StreamId);
	console.log("-------- sendPreLaunchPosts_INTERNAL_API posts --------", posts.length);
	for(var i = 0; i < posts.length; i++) {
		//send pre lauch post here
		var PostImage = posts[i].MediaType == 'Link' ? posts[i].thumbnail : (posts[i].MediaURL ? posts[i].MediaURL : '');
		PostImage = PostImage.indexOf('unsplash.com') == -1 ? "https://www.scrpt.com/assets/Media/img/300/"+PostImage : PostImage;
		var PostStatement = posts[i].PostStatement ? posts[i].PostStatement : posts[i].Content;


		userStreamPageUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+StreamId;
		newHtml = results[0].description.replace(/{RecipientName}/g, OwnerDetails.Name);
		newHtml = newHtml.replace(/{StreamPageUrl}/g, userStreamPageUrl);
		newHtml = newHtml.replace(/{CapsuleName}/g, StreamData.Title);
		newHtml = newHtml.replace(/{PostImage}/g, PostImage);
		newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
		newHtml = newHtml.replace(/{LaunchDate}/g, Utilities.getFormattedDate(StreamData.LaunchDate));

		results[0].subject = results[0].subject.replace(/{CapsuleName}/g, StreamData.Title);
		results[0].subject = results[0].subject.replace(/{RecipientName}/g, OwnerDetails.Name);
		results[0].subject = results[0].subject.replace(/{LaunchDate}/g, Utilities.getFormattedDate(StreamData.LaunchDate));

		var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions)
		var mailOptions = {
			from: process.EMAIL_ENGINE.info.senderLine,
			to: OwnerDetails.Email,
			subject: results[0].subject ? results[0].subject : 'Scrpt',
			html:newHtml
		};
		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				return console.log(error);
				return res.json({code : 501, message : "Something went wrong."});
			}
			console.log('sendPreLaunchPosts_INTERNAL_API---------Message sent: ' + info.response);
			return res.json({code : 200, message : "Email sent."});
		});
	}
}

async function __getMyStreamAwardDetails (StreamId, loginUserId) {
	var conditions = {
		StreamId : ObjectId(StreamId),
		AwardedBy : ObjectId(loginUserId)
	};

	var result = await Award.aggregate([
		{ $match : conditions },
		{ $group : {_id : "$Award", count : {$sum : 1} } }
	]);
	//console.log("result ------- ", result);
	result = Array.isArray(result) ? result : [];

	awardObj = {
		Top : 0,
		Best : 0,
		Unique : 0
	};

	for(var i = 0 ; i < result.length; i++) {
		if(result[i]._id == 'Top') {
			awardObj.Top = result[i].count;
		}
		if(result[i]._id == 'Best') {
			awardObj.Best = result[i].count;
		}
		if(result[i]._id == 'Unique') {
			awardObj.Unique = result[i].count;
		}
	}
	return awardObj;
}

async function __getMyStreamAwardDetailsAllStreams (StreamIds, loginUserId) {
	var conditions = {
		StreamId : {$in : StreamIds},
		AwardedBy : {$ne : ObjectId(loginUserId)},
		PostOwnerId : ObjectId(loginUserId)
	};

	var result = await Award.aggregate([
		{ $match : conditions },
		{
			$lookup: {
				from: "users",
				localField: "AwardedBy",
				foreignField: "_id",
				as: "AwardedByUser"
			}
		},
		{
			$unwind : "$AwardedByUser"
		},
		{ $sort : { CreatedOn : -1 } },
		{ $limit : 1000 }
		//{ $group : {_id : "$Award", givenByUsers : {$push : "$AwardedByUser.Name"} } }
	]);
	result = Array.isArray(result) ? result : [];

	awardObj = {
		Top : [],
		Best : [],
		Unique : []
	};

	var awardedByArr = [];
	for(var i = 0 ; i < result.length; i++) {
		var obj = result[i];
		obj.AwardedByUser = obj.AwardedByUser || {};
		obj.AwardedByUser.Name = obj.AwardedByUser.Name || '';

		awardedByArr.push({
			Award : obj.Award || '',
			AwardedBy : obj.AwardedByUser.Name.split(' ')[0] || {},
			StreamId : obj.StreamId || '',
			CreatedOn : obj.CreatedOn || '',
			PostOwnerId : obj.PostOwnerId || ''
		});
	}
	return awardedByArr;
}

async function __getMyStreamAwardCountPerPost (StreamId, loginUserId) {
	var conditions = {
		StreamId : ObjectId(StreamId)
	};

	var groupByObj = {
		StreamId : "$StreamId",
		PostId : "$PostId",
		hexcode_blendedImage : "$hexcode_blendedImage",
		Award : "$Award"
	};

	var result = await Award.aggregate([
		{ $match : conditions },
		{ $group : {_id : groupByObj, count : {$sum : 1}, awardedByUsers : {$push : "$AwardedBy"}} }
	]);
	//console.log("result ------- ", result);
	result = Array.isArray(result) ? result : [];

	var groupedResultsMap = {};

	for(var i = 0 ; i < result.length; i++) {
		var resultObj = result[i];
		//resultObj._id.hexcode_blendedImage = resultObj._id.hexcode_blendedImage.replace(/./g, '');
		groupedResultsMap[resultObj._id.Award+'_'+resultObj._id.PostId+'_'+resultObj._id.hexcode_blendedImage] = {
			count : resultObj.count ? resultObj.count : 0,
			IsAwardedByMe : false
		};
		resultObj.awardedByUsers = resultObj.awardedByUsers ? resultObj.awardedByUsers : [];
		resultObj.awardedByUsers = resultObj.awardedByUsers.map((obj)=>String(obj));
		var IsAwardedByMe = false;
		if(resultObj.awardedByUsers.indexOf(String(loginUserId)) >= 0) {
			IsAwardedByMe = true;
		}
		groupedResultsMap[resultObj._id.Award+'_'+resultObj._id.PostId+'_'+resultObj._id.hexcode_blendedImage].IsAwardedByMe = IsAwardedByMe;
		//groupedResultsMap[resultObj._id.PostId+'_'+resultObj._id.hexcode_blendedImage].awardedByUsers = resultObj.awardedByUsers;
	}
	return groupedResultsMap;
}

var getMyStreamAwardDetails = async function (req, res) {
	var StreamIds = req.body.StreamIds ? req.body.StreamIds : [];
	var AllStreamIds = StreamIds.map((streamId)=>ObjectId(streamId));
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var loginUserId = req.session.user._id;

	var awardObj = {
		Top : 2,
		Best : 10,
		Unique : 10
	};

	if(!StreamId || !loginUserId) {
		return res.json({code : 200, result : awardObj});
	}

	var awardObj = await __getMyStreamAwardDetails(StreamId, loginUserId);
	var StreamAwardCountPerPost = await __getMyStreamAwardCountPerPost(StreamId, loginUserId);
	var AllStreamAwardLogs = await __getMyStreamAwardDetailsAllStreams(AllStreamIds, loginUserId);

	return res.json({code : 200, result : awardObj, StreamAwardCountPerPost : StreamAwardCountPerPost, AllStreamAwardLogs : AllStreamAwardLogs});
}

var markAward = async function (req, res) {
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var PostId = req.body.PostId ? req.body.PostId : null;
	var hexcode_blendedImage = req.body.hexcode_blendedImage ? req.body.hexcode_blendedImage : null;
	var StreamOwnerId = req.session.user._id;
	var PostOwnerId = req.body.PostOwnerId ? req.body.PostOwnerId : null;
	var award = req.body.Award ? req.body.Award : null;
	var loginUserId = req.session.user._id;
	var loginUserName = req.session.user.Name;

	var awardObj = {
		Top : 1,
		Best : 5,
		Unique : 10
	};

	if(StreamType != 'Group' || !StreamId || !PostId || !hexcode_blendedImage || !StreamOwnerId || !PostOwnerId || !Award) {
		return res.json({"code":"404", message : "Wrong input.", result: awardObj});
	}


	var conditions = {
		AwardedBy : ObjectId(loginUserId),
		StreamId : ObjectId(StreamId),
		PostId : ObjectId(PostId),
		hexcode_blendedImage : hexcode_blendedImage,
		StreamOwnerId : ObjectId(StreamOwnerId),
		PostOwnerId : ObjectId(PostOwnerId)
	};

	var IsAlreadyExists = await Award.find(conditions, {_id : 1}).count();
	IsAlreadyExists = IsAlreadyExists ? IsAlreadyExists : 0;

	if(IsAlreadyExists) {
		return res.json({"code":"404", message : "You have already awarded this post."});
	}

	var dataToSave = {
		AwardedBy : ObjectId(loginUserId),
		StreamId : ObjectId(StreamId),
		PostId : ObjectId(PostId),
		hexcode_blendedImage : hexcode_blendedImage,
		StreamOwnerId : ObjectId(StreamOwnerId),
		PostOwnerId : ObjectId(PostOwnerId),
		Award : award
	};
	await Award(dataToSave).save();
	//send notification
	notifyMembers([PostOwnerId], loginUserName, 'awarded', StreamId);
	return res.json({code : 200, message: "Done."});
}

var finalizeLaunchDate = async function (req, res) {
	var StreamId = req.body.StreamId ? req.body.StreamId : null;
	var LaunchDate = req.body.LaunchDate ? req.body.LaunchDate : null;
	if(!StreamId || !LaunchDate) {
		return res.json({"code":"404", message : "Wrong input."});
	}

	var ldArr = LaunchDate.split('/');
	if(ldArr.length != 3) {
		return res.json({"code":"404", message : "Wrong input."});
	}

	var conditions = {
		_id: ObjectId(StreamId)
	};

	var setObj = {
		$set : {
			IsLaunchDateFinalized: 1,
			LaunchDate: LaunchDate
		}
	};
	var options = {
		multi: false
	};

	var result = await Capsule.update(conditions, setObj, options);

	/*
	//call launch api immediately if user selected launch date of today.
	var t = new Date();
	var ty = t.getFullYear();
	var tm = t.getMonth() + 1;
	var td = t.getDate();
	var todayDate = new Date(ty + '-' + tm + '-' + td);
	var todayTS = todayDate.getTime();

	var ldateArr = LaunchDate.split('/');
	var y = ldateArr[2];
	var m = ldateArr[0];
	var d = ldateArr[1];
	var ldateTS = new Date(y + '-' + m + '-' + d).getTime();
	if(ldateTS === todayTS) {
		var reqObj = {
			StreamId: StreamId
		};
		console.log("Calling https://www.scrpt.com/journal/GroupStreamTopicCron__API --------------------------------- ", reqObj);
		var request_url = 'https://www.scrpt.com/journal/GroupStreamTopicCron__API';
		axios.get(request_url)
		.then(response => {
			response.data = response.data ? response.data : {};
			response.data.code = response.data.code ? response.data.code : null;
			console.log("------------ AXIOS (https://www.scrpt.com/journal/GroupStreamTopicCron__API)---- api response ---------------", response.data.code);
		}).then(error => {
			console.log("error = ", error);
		});
	}
	//call launch api immediately if user selected launch date of today.
	*/
	return res.json({code : 200, message: "Done."});
}

async function getUserByEmailHash(hash) {
	var conditions = {
		Email: CommonAlgo.commonModule.customHashToStr(hash),
		IsDeleted: false
	};

	var result = await User.find(conditions);
	result = Array.isArray(result) ? result : [];
	result = result.length ? result[0] : null;
	return result;
}

var unsubscribeEmails = async function(req, res) {
	var myId = req.body.myId || null;
	var location = req.body.location || null;
	var id = req.body.id || null;
	var StreamEmailCase = req.body.StreamEmailCase || null;
	var MarketingEmail = req.body.MarketingEmail === false ? false : true;
	var PostActionsNotification = req.body.PostActionsNotification === false ? false : true;
	var CommentLikesNotification = req.body.CommentLikesNotification === false ? false : true;

	var UserData = await getUserByEmailHash(myId);
	if(!UserData) {
		return res.json({code : 501, message: "Something went wrong."});
	}

	if(location == 'Marketing' || location === 'PostActionsNotification' || location === 'CommentLikesNotification') {
		var conditions = {
			_id: UserData._id,
			IsDeleted: false
		};

		var setObj = {
			$set : {
				MarketingEmail: MarketingEmail,
				PostActionsNotification: PostActionsNotification,
				CommentLikesNotification: CommentLikesNotification
			}
		};
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);

	} else if (location == 'Stream' && id && StreamEmailCase) {
		var conditions = {
			_id: UserData._id,
			IsDeleted: false
		};

		var setObj = {
			$addToSet: { UnsubscribedStreams: id }
		}
		if(StreamEmailCase == 'pull') {
			setObj = {
				$pull: { UnsubscribedStreams: id }
			}
		}

		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
	}

	return res.json({code : 200, message: "Done."});
}

var addCompiledStatementsToGoogleSheet = async function (req, res) {
	var PageId = req.body.PageId || null;
	var OwnerId = req.session.user._id || '';
	var conditions = {
		_id : ObjectId(PageId),
		//OwnerId: String(OwnerId),
		//IsDeleted: 0
	};
	var fields = {
		Medias: true
	};

	var PageData = await Page.find(conditions, fields);
	PageData = Array.isArray(PageData) ? (PageData.length > 0 ? PageData[0] : null) : null;
	if(PageData) {
		PageData.Medias = PageData.Medias ? PageData.Medias : [];
		//console.log("PageData.Medias = ", PageData.Medias);
		var PostArr = [];
		for(var i = 0; i < PageData.Medias.length; i++) {
			var PostObj = PageData.Medias[i];
			var PostId = String(PostObj._id);
			var PostStatement = PostObj.MediaType !== 'Notes' ? PostObj.PostStatement : PostObj.Content;
			PostStatement = htmlToText(PostStatement, {wordwrap: null});
			if(PostStatement) {
				var command = await fetchKeywordsFromTextByNgram(PostStatement, 10);
				command = await command.toString();
				//console.log("command = ", command);
				//console.log("i = ", i);
				PostArr.push({
					Id: PostId,
					Command: command,
					Tag: 'Post statement',
					Status: '',
					Statement: PostStatement,
					"4ImageStatus": '',
					FinalImageStatus: ''
				});
			}
		}
		//console.log("PostArr = ", PostArr);
		if(PostArr.length) {
			//now add rows to spreadsheet
			try {
				var doc_id = '1xo1pPdUhZsM-ScDQasyaplNycysGV7dhrlJr4Vdl1mo';
				const rowsArray = PostArr || [];
				const doc = new GoogleSpreadsheet(doc_id);
				await doc.useServiceAccountAuth(creds);
				await doc.loadInfo();
				const sheet = doc.sheetsByIndex[0];
				const rows = await sheet.addRows(rowsArray);
			} catch (error) {
				console.log("Error - ", error);
			}

			return res.json({
				code : 200,
				message : "Keywords mapped with spreadsheet successfully."
			});
		} else {
			return res.json({
				code : 500,
				message : "no posts available"
			});
		}
	} else {
		return res.json({
			code : 500,
			message : "Something went wrong"
		});
	}
}

var addPostToGSheetByPostIds = async function (req, res) {
	var PostIds = req.body.PostIds ? req.body.PostIds : [];
	PostIds = PostIds.map((obj)=>{
		return ObjectId(obj);
	})

	/*var mediaMatchCond = {
		"Medias.PostType" : "AnswerPost",
		"Medias.MediaType" : "Notes",
		"Medias.QuestionPostId" : {$in :[
			ObjectId("637124b655c19859bb8bb6df"),
			//ObjectId("637124b655c19859bb8bb6e0"),
			//ObjectId("637124b655c19859bb8bb6e1"),
			ObjectId("637124b655c19859bb8bb6e2"),
			ObjectId("637124b655c19859bb8bb6e7"),
			//ObjectId("637124b655c19859bb8bb6e8"),
			ObjectId("637124b655c19859bb8bb6eb"),
			ObjectId("637124b655c19859bb8bb6ec")
		]}
	};*/

	var mediaMatchCond = {
		"Medias.PostType" : "AnswerPost",
		"Medias.MediaType" : "Notes",
		"Medias._id" : {$in : PostIds}
	};

	var PageDataArr = await Page.aggregate([
		{'$match': mediaMatchCond},
		{'$unwind': '$Medias'},
		{'$project': {'Medias': 1}},
		{'$match': mediaMatchCond},
		{'$sort': {'Medias.PostedOn': 1}},
		//{'$skip': 90},
		//{'$limit': 100}
	]);

	PageDataArr = Array.isArray(PageDataArr) ? PageDataArr : [];
	if(PageDataArr.length) {
		var PostArr = [];
		for(var j = 0; j < PageDataArr.length; j++) {
			var PageData = PageDataArr[j];
			PageData.Medias = PageData.Medias ? PageData.Medias : {};
			var PostObj = PageData.Medias;
			var PostId = String(PostObj._id);
			var PostStatement = PostObj.MediaType !== 'Notes' ? PostObj.PostStatement : PostObj.Content;
			if(PostStatement) {
				try {
					PostStatement = htmlToText(PostStatement, {wordwrap: null});
					var command = await fetchKeywordsFromTextByNgram(PostStatement, 10);
					console.log("command = ", command);
					command = await command.toString();
					command = command || '';
					PostArr.push({
						Id: PostId,
						Command: command,
						Tag: 'Post statement',
						Status: '',
						Statement: PostStatement,
						"4ImageStatus": '',
						FinalImageStatus: ''
					});
				} catch (caughtException) {
					console.log("caughtException");
				}
			}
		}
		//console.log("PostArr = ", PostArr);
		if(PostArr.length) {
			//now add rows to spreadsheet
			try {
				var doc_id = '1xo1pPdUhZsM-ScDQasyaplNycysGV7dhrlJr4Vdl1mo';
				const rowsArray = PostArr || [];
				const doc = new GoogleSpreadsheet(doc_id);
				await doc.useServiceAccountAuth(creds);
				await doc.loadInfo();
				const sheet = doc.sheetsByIndex[0];
				const rows = await sheet.addRows(rowsArray);
			} catch (error) {
				console.log("Error - ", error);
			}

			return res.json({
				code : 200,
				message : "Keywords mapped with spreadsheet successfully."
			});
		} else {
			return res.json({
				code : 500,
				message : "no posts available"
			});
		}
	} else {
		return res.json({
			code : 500,
			message : "Something went wrong"
		});
	}
}

var addKeywordsToGSheet = async function (req, res) {
	var PageId = req.body.PageId || null;
	var OwnerId = req.session.user._id || '';
	var conditions = {
		_id : ObjectId(PageId),
		//OwnerId: String(OwnerId),
		//IsDeleted: 0
	};
	var fields = {
		Medias: true
	};

	var PageData = await Page.find(conditions, fields);
	PageData = Array.isArray(PageData) ? (PageData.length > 0 ? PageData[0] : null) : null;
	if(PageData) {
		PageData.Medias = PageData.Medias ? PageData.Medias : [];
		//console.log("PageData.Medias = ", PageData.Medias);
		var PostArr = [];
		var keywordsArr = [];
		for(var i = 0; i < PageData.Medias.length; i++) {
			var PostObj = PageData.Medias[i];
			var SurpriseSelectedWords = typeof PostObj.SurpriseSelectedWords === 'string' ? PostObj.SurpriseSelectedWords.split(',') : [];
			var SecondaryKeywords = typeof PostObj.SecondaryKeywords === 'string' ? PostObj.SecondaryKeywords.split(',') : [];
			var allKeywords = SurpriseSelectedWords.concat(SecondaryKeywords);
			var uniqueKeywords = allKeywords.filter(onlyUnique);
			if(uniqueKeywords.length) {
				try {
					for(var mp = 0; mp < uniqueKeywords.length; mp++) {
						var obj = typeof uniqueKeywords[mp] === 'string' ? uniqueKeywords[mp].toLowerCase().trim() : '';
						if(obj) {
							keywordsArr.push(obj);
						}
					}
				} catch (caughtException) {
					console.log("caughtException = ", caughtException);
				}
			}
		}

		var finalKeywordsArr = keywordsArr.filter(onlyUnique);
		for(var mp = 0; mp < finalKeywordsArr.length; mp++) {
			var obj = finalKeywordsArr[mp];
			if(obj) {
				PostArr.push({
					Keyword: obj
				});
			}
		}

		if(PostArr.length) {
			//now add rows to spreadsheet
			try {
				var doc_id = '1UBfUP0KEX3ItBW1SzepSyad1qHR4qLJPsM3oZw4USSM';
				const rowsArray = PostArr || [];
				const doc = new GoogleSpreadsheet(doc_id);
				await doc.useServiceAccountAuth(creds);
				await doc.loadInfo();
				const sheet = doc.sheetsByIndex[0];
				const rows = await sheet.addRows(rowsArray);
			} catch (error) {
				console.log("Error - ", error);
			}

			return res.json({
				code : 200,
				message : "Keywords mapped with spreadsheet successfully."
			});
		} else {
			return res.json({
				code : 500,
				message : "no posts available"
			});
		}
	} else {
		return res.json({
			code : 500,
			message : "Something went wrong"
		});
	}
}

var addKeywordsToGSheetGroupStream = async function (req, res) {
	var PostIds = req.body.PostIds ? req.body.PostIds : [];
	PostIds = PostIds.map((obj)=>{
		return ObjectId(obj);
	})

	var mediaMatchCond = {
		"Medias.PostType" : "AnswerPost",
		"Medias.MediaType" : "Notes",
		"Medias._id" : {$in : PostIds}
	};

	var PageDataArr = await Page.aggregate([
		{'$match': mediaMatchCond},
		{'$unwind': '$Medias'},
		{'$project': {'Medias': 1}},
		{'$match': mediaMatchCond},
		{'$sort': {'Medias.PostedOn': 1}},
		//{'$skip': 90},
		//{'$limit': 100}
	]);

	PageDataArr = Array.isArray(PageDataArr) ? PageDataArr : [];
	if(PageDataArr.length) {
		var PostArr = [];
		var keywordsArr = [];
		for(var j = 0; j < PageDataArr.length; j++) {
			var PageData = PageDataArr[j];
			PageData.Medias = PageData.Medias ? PageData.Medias : {};
			var PostObj = PageData.Medias;
			var SurpriseSelectedWords = typeof PostObj.SurpriseSelectedWords === 'string' ? PostObj.SurpriseSelectedWords.split(',') : [];
			var SecondaryKeywords = typeof PostObj.SecondaryKeywords === 'string' ? PostObj.SecondaryKeywords.split(',') : [];

			var allKeywords = SurpriseSelectedWords.concat(SecondaryKeywords);
			var uniqueKeywords = allKeywords.filter(onlyUnique);
			if(uniqueKeywords.length) {
				try {
					for(var mp = 0; mp < uniqueKeywords.length; mp++) {
						var obj = typeof uniqueKeywords[mp] === 'string' ? uniqueKeywords[mp].toLowerCase().trim() : '';
						if(obj) {
							keywordsArr.push(obj);
						}
					}
				} catch (caughtException) {
					console.log("caughtException = ", caughtException);
				}
			}
		}

		var finalKeywordsArr = keywordsArr.filter(onlyUnique);
		for(var mp = 0; mp < finalKeywordsArr.length; mp++) {
			var obj = finalKeywordsArr[mp];
			if(obj) {
				PostArr.push({
					Keyword: obj
				});
			}
		}

		//console.log("PostArr = ", PostArr);
		if(PostArr.length) {
			//now add rows to spreadsheet
			try {
				var doc_id = '1UBfUP0KEX3ItBW1SzepSyad1qHR4qLJPsM3oZw4USSM';
				const rowsArray = PostArr || [];
				const doc = new GoogleSpreadsheet(doc_id);
				await doc.useServiceAccountAuth(creds);
				await doc.loadInfo();
				const sheet = doc.sheetsByIndex[0];
				const rows = await sheet.addRows(rowsArray);
			} catch (error) {
				console.log("Error - ", error);
			}

			return res.json({
				code : 200,
				message : "Keywords mapped with spreadsheet successfully."
			});
		} else {
			return res.json({
				code : 500,
				message : "no posts available"
			});
		}
	} else {
		return res.json({
			code : 500,
			message : "Something went wrong"
		});
	}
}

var updateAutoInviteCount = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var autoInvitePopupCount = req.body.Count || 0;
	if(!StreamId || !autoInvitePopupCount) {
		return res.json({code : 501, message : "Wrong input."});
	}
	await Capsule.update({_id : StreamId}, {$set : {"AutoInvitePopupCount" : autoInvitePopupCount}});
	return res.json({code : 200, message : "Updated successfully."});
}

var updateAutoCoverPageCount = async function (req, res) {
	var StreamId = req.body.StreamId ? ObjectId(req.body.StreamId) : null;
	var autoCoverPageCount = req.body.Count || 0;
	if(!StreamId || !autoCoverPageCount) {
		return res.json({code : 501, message : "Wrong input."});
	}
	await Capsule.update({_id : StreamId}, {$set : {"AutoCoverPageCount" : autoCoverPageCount}});
	return res.json({code : 200, message : "Members added successfully."});
}

var getAutoPlayerSeenLog = async function (req, res) {
	var UserId = req.session.user._id || null;
	if (UserId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};
		var uData = await User.findOne(conditions, {AutoPlayerSeenStreams: true, PostActionAnnouncementSeenStreams: true});
		var AutoPlayerSeenStreams = uData.AutoPlayerSeenStreams || [];
		var PostActionAnnouncementSeenStreams = uData.PostActionAnnouncementSeenStreams || [];
		return res.json({code : 200, message: "Done.", AutoPlayerSeenStreams: AutoPlayerSeenStreams, PostActionAnnouncementSeenStreams: PostActionAnnouncementSeenStreams});
	} else {
		return res.json({code : 500, message: "Wrong input.", AutoPlayerSeenStreams: [], PostActionAnnouncementSeenStreams: []});
	}
}

var updateAutoPlayerSeenLog = async function (req, res) {
	var StreamId = req.body.StreamId || null;
	var UserId = req.session.user._id || null;
	if (UserId && StreamId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$addToSet: { AutoPlayerSeenStreams: ObjectId(StreamId) }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
	}
	await getAutoPlayerSeenLog(req, res);
}

var updatePostActionAnnouncementSeenLog = async function (req, res) {
	var StreamId = req.body.StreamId || null;
	var UserId = req.session.user._id || null;
	if (UserId && StreamId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$addToSet: { PostActionAnnouncementSeenStreams: ObjectId(StreamId) }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
	}
	await getAutoPlayerSeenLog(req, res);
}

var updateAddDetailsSeen = async function (req, res) {
	var UserId = req.session.user._id || null;
	if (UserId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$set: { IsAddDetailsSeen: true }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
		req.session.user.IsAddDetailsSeen = true;
	}
	res.json({code: 200, usersession: req.session.user});
}

var updateWelcomeSeen = async function (req, res) {
	var UserId = req.session.user._id || null;
	if (UserId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$set: { IsWelcomeSeen: true }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
		req.session.user.IsWelcomeSeen = true;
	}
	res.json({code: 200, usersession: req.session.user});
}

var updateHowItWorksSeen = async function (req, res) {
	var UserId = req.session.user._id || null;
	if (UserId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$set: { IsHowItWorksSeen: true }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
		req.session.user.IsHowItWorksSeen = true;
	}
	res.json({code: 200, usersession: req.session.user});
}

var updatePostLaunchVideoSeen = async function (req, res) {
	var UserId = req.session.user._id || null;
	if (UserId) {
		var conditions = {
			_id: ObjectId(UserId),
			IsDeleted: false
		};

		var setObj = {
			$set: { IsPostLaunchVideoSeen: true }
		}
		var options = {
			multi: false
		};
		await User.update(conditions, setObj, options);
		req.session.user.IsPostLaunchVideoSeen = true;
	}
	res.json({code: 200, usersession: req.session.user});
}


var getQuestAudioStats = async function (req, res) {
	var questIdsWithAudio = [];
	var questIds = Array.isArray(req.body.questIds) ? req.body.questIds : [];
	if(questIds.length) {
		for(var i = 0; i < questIds.length; i++) {
			var file = __dirname+'/../../media-assets/postaudios/'+questIds[i]+'.mp3';
			console.log("file = ", file);
			if(await isFileExists(file)) {
				questIdsWithAudio.push(questIds[i]);
			}
		}
	}
	return res.json({code: 200, results: questIdsWithAudio});
}

var getUnsubscribeIdByEmail = function (req, res) {
	var email = req.query.email ? req.query.email : '';
	res.send("https://www.scrpt.com/unsubscribe/"+CommonAlgo.commonModule.strToCustomHash(email));
}

async function __getPostHexCodeOfFirstBlendedImageSet (pageId, postId) {
	
	var cond = {
		PageId : ObjectId(pageId),
		PostId : ObjectId(postId)
	};
	var f = {
		SelectedBlendImages : 1
	};
	
	var PageStreamMap = await PageStream.find(cond, f);
	
	let hexcode_blendedImage = null;
	if(PageStreamMap.length) {
		PageStreamMap = Array.isArray(PageStreamMap[0].SelectedBlendImages) ? PageStreamMap[0].SelectedBlendImages : [];
		
		if(PageStreamMap.length) {
			let blendImage1 = PageStreamMap[0].blendImage1;
			let blendImage2 = PageStreamMap[0].blendImage2;
			let blendOption = PageStreamMap[0].blendMode || 'hard-light';
			
			if(blendImage1 && blendImage2 && blendOption) {
				let data = blendImage1 + blendImage2 + blendOption;
				var hexcode = crypto.createHash('md5').update(data).digest("hex");
				if(hexcode) {
					hexcode_blendedImage = `/streamposts/${hexcode}.png`;
				}
			}
		}
	}
	return hexcode_blendedImage;
}

function __getPostHexCodeOfGivenBlendedImageSet (blendImage1, blendImage2, blendMode) {
	blendImage1 = blendImage1 || null;
	blendImage2 = blendImage2 || null;
	blendOption = blendMode || 'hard-light';
	if(blendImage1 && blendImage2 && blendOption) {
		let data = blendImage1 + blendImage2 + blendOption;
		var hexcode = crypto.createHash('md5').update(data).digest("hex");
		if(hexcode) {
			hexcode_blendedImage = `/streamposts/${hexcode}.png`;
		}
	}
	return hexcode_blendedImage;
}

async function __getUserIdByEmail (email) {
	var userData = await User.findOne({Email:{ $regex : new RegExp(email, "i") }, IsDeleted : false}, {_id : 1});
	userData = userData === null ? {} : userData;
	return (userData._id || null);
}

async function __addLikesToStreamComments_StreamTool (SocialPageId, CommentId, likesByEmailIds, likesNeeded=0) {
	likesNeeded = likesNeeded > likesByEmailIds.length ? likesByEmailIds.length : likesNeeded;
	for(let j = 0; j < likesNeeded; j++) {
		const UserId = await __getUserIdByEmail(likesByEmailIds[j].trim());
		var dataToSave = {
			SocialPageId : ObjectId(SocialPageId),
			CommentId : ObjectId(CommentId),
			LikedById : ObjectId(UserId)
		};
			
		await StreamCommentLikes(dataToSave).save();
		console.log('Like added for this comment - ', CommentId);
	}
}

async function __addCommentsToStreamPost_StreamTool(SocialPageId, SocialPostId, postCommentsArr) {
	console.log("###########################################------ __addCommentsToStreamPost_StreamTool --------#######################################");
	const hexcode_blendedImage = await __getPostHexCodeOfFirstBlendedImageSet(SocialPageId, SocialPostId);
	console.log("__getPostHexCodeOfFirstBlendedImageSet -------------------------------- ", hexcode_blendedImage);
	for (let i = 0; i < postCommentsArr.length; i++) {
		postCommentsArr[i].email = postCommentsArr[i].email || null;
		postCommentsArr[i].comment = postCommentsArr[i].comment || null;
		if(postCommentsArr[i].email && postCommentsArr[i].comment && hexcode_blendedImage) {
			const UserId = await __getUserIdByEmail(postCommentsArr[i].email);
			var dataToSave = {
				UserId : UserId,
				SocialPageId : SocialPageId ? ObjectId(SocialPageId) : null,
				SocialPostId : SocialPostId ? ObjectId(SocialPostId) : null,
				hexcode_blendedImage : hexcode_blendedImage ? hexcode_blendedImage : null,
				Comment : postCommentsArr[i].comment,
				PrivacySetting : "PublicWithName"
			};
		
			const savedDoc = await StreamComments(dataToSave).save();
			const CommentId = savedDoc._id || null;
			if(CommentId) {
				console.log('Comment added for this post - ', SocialPostId);
				postCommentsArr[i].likesByEmailIds = postCommentsArr[i].likesByEmailIds || [];
				postCommentsArr[i].likes = postCommentsArr[i].likes || 0;
				if(postCommentsArr[i].likesByEmailIds.length && postCommentsArr[i].likes) {
					await __addLikesToStreamComments_StreamTool(SocialPageId, CommentId, postCommentsArr[i].likesByEmailIds, postCommentsArr[i].likes);
				}
			}
		}
	}
}

async function __addCommentsToStreamPost_StreamTool2(SocialPageId, SocialPostId, blendImage1, blendImage2, blendMode, postCommentsArr) {
	console.log("###########################################------ __addCommentsToStreamPost_StreamTool2 --------#######################################");
	SocialPageId = SocialPageId || null; 
	SocialPostId = SocialPostId || null; 
	blendImage1 = blendImage1 || null;
	blendImage2 = blendImage2 || null;
	blendMode = blendMode || null;
	
	if(SocialPageId && SocialPostId && blendImage1 && blendImage2 && blendMode) {
		let hexcode_blendedImage = await __getPostHexCodeOfGivenBlendedImageSet(blendImage1, blendImage2, blendMode);
		console.log("__getPostHexCodeOfGivenBlendedImageSet -------------------------------- ", hexcode_blendedImage);
		for (let i = 0; i < postCommentsArr.length; i++) {
			postCommentsArr[i].email = postCommentsArr[i].email || null;
			postCommentsArr[i].comment = postCommentsArr[i].comment || null;
			if(postCommentsArr[i].email && postCommentsArr[i].comment && hexcode_blendedImage) {
				const UserId = await __getUserIdByEmail(postCommentsArr[i].email);
				var dataToSave = {
					UserId : UserId,
					SocialPageId : SocialPageId ? ObjectId(SocialPageId) : null,
					SocialPostId : SocialPostId ? ObjectId(SocialPostId) : null,
					hexcode_blendedImage : hexcode_blendedImage ? hexcode_blendedImage : null,
					Comment : postCommentsArr[i].comment,
					PrivacySetting : "PublicWithName"
				};
			
				const savedDoc = await StreamComments(dataToSave).save();
				const CommentId = savedDoc._id || null;
				if(CommentId) {
					console.log('Comment added for this post - ', SocialPostId);
					postCommentsArr[i].likesByEmailIds = postCommentsArr[i].likesByEmailIds || [];
					postCommentsArr[i].likes = postCommentsArr[i].likes || 0;
					if(postCommentsArr[i].likesByEmailIds.length && postCommentsArr[i].likes) {
						await __addLikesToStreamComments_StreamTool(SocialPageId, CommentId, postCommentsArr[i].likesByEmailIds, postCommentsArr[i].likes);
					}
				}
			}
		}
	} else {
		console.log("Expected input data is missing.");
	}	
}

var setStreamMediaSelectionCriteria__INTERNAL_API = async function (req, res) {
	try {
		var pageId = req.body.pageId || null;
		var mediaSelectionCriteria = req.body.MediaSelectionCriteria || null;
		if(pageId && mediaSelectionCriteria) {
			await Page.update({_id : ObjectId(pageId)}, {$set : {"MediaSelectionCriteria" : mediaSelectionCriteria}});
			return res.json({code : 200, message : "MediaSelectionCriteria added successfully."});
		}
	} catch (err) {
		console.log("Caught error - ", err);
	}
	return res.json({code : 501, message : "Soemthing went wrong."});
}

var addNewPost_INTERNAL_API = async function (req, res) {
	console.log("###########################################------ addNewPost_INTERNAL_API --------#######################################");
	try {
		var pageId = req.body.pageId || null;
		var postStatement = req.body.postStatement || null;
		var MediaSelectionCriteria = req.body.MediaSelectionCriteria || null;
		/*doing post formating for post header --- <<>>*/
		
		var beforePostHeader = postStatement.substring(
			0,
			postStatement.lastIndexOf("[")
		);
		var postHeader = postStatement.substring(
			postStatement.lastIndexOf("[") + 1, 
			postStatement.lastIndexOf("]")
		);
		var afterPostHeader = postStatement.substring(postStatement.lastIndexOf("]") + 1);
		if(postHeader) {
			postHeader = `<span style="font-family: Gambarino-Regular;">${postHeader}</span>`;
		}
		//console.log("beforePostHeader + postHeader + afterPostHeader = ", beforePostHeader + '  ----  '+ postHeader+ '  ----  ' + afterPostHeader);
		postStatement = beforePostHeader + postHeader + afterPostHeader;
		
		/*doing post formating for post header --- <<>>*/

		var postStreamObj = req.body.postStreamObj || {};
		var postStreamType = postStreamObj.type || '';
		var MJImageArr = postStreamObj.FileArr || [];

		var postKeywords = req.body.keywords || '';
		
		var allKeywordsArr = postKeywords.split(':::').map((obj)=> obj.trim());
		var pArr = [];
		var sArr = [];
		var s2Arr = [];
		if(allKeywordsArr.length) {
			switch (allKeywordsArr.length) {
				case 1:
					pArr = allKeywordsArr[0].split(',').map((obj)=> obj.trim());
					break;
				case 2:
					pArr = allKeywordsArr[0].split(',').map((obj)=> obj.trim());
					sArr = allKeywordsArr[1].split(',').map((obj)=> obj.trim());
					break;
				case 3:
					pArr = allKeywordsArr[0].split(',').map((obj)=> obj.trim());
					sArr = allKeywordsArr[1].split(',').map((obj)=> obj.trim());
					s2Arr = allKeywordsArr[2].split(',').map((obj)=> obj.trim());
					break;
			}
		}

		var postKeywordsArr = [pArr, sArr, s2Arr];

		//var postKeywordsArr = postKeywords.split(',').map((obj)=> obj.trim());
		var postCommentsArr = req.body.postCommentsArr || [];
		console.log("postCommentsArr --------------------- ", postCommentsArr);
		var fields = {
			Medias : []
		};

		var result = await Page.find({_id : ObjectId(pageId)});
		result = Array.isArray(result) ? result : [];

		if(result.length === 0){
			return res.json({"code": 404,"message" : "Not Found"});
		}

		//fetch MediaSelectionCriteria from req.body and set to current req object
		req.body.MediaSelectionCriteria = MediaSelectionCriteria || null; //result[0].MediaSelectionCriteria || null;

		/*result[0].Medias = Array.isArray(result[0].Medias) ? result[0].Medias : [];
		if(result[0].Medias.length) {
			return res.json({code: 501, message: "It seems like the stream has already been set before. if that's not the case please discuss this with admin."});
		}*/

		//first make an entry on media collection as per old rule
		var incNum = 0;
		var data = await Counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
		data = typeof data === 'object' ? data : {};
		incNum = data.seq || 0;

		if(!incNum) {
			return res.json({code: 501, message: "Something went wrong."});
		}


		var type = 'Notes';
		var name = dateFormat();
		var LinkType = '';
		var thumbnail = '';

		var dataToUpload = {
			Location: [],
			AutoId: incNum,
			UploadedBy: "user",
			UploadedOn: Date.now(),
			UploaderID: result[0].OwnerId,
			Source: "Thinkstock",
			SourceUniqueID: "53ceb02d3aceabbe5d573dba",
			Domains: "53ad6993f222ef325c05039c",
			GroupTags: [],
			Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
			Status: 2,
			MetaMetaTags: null,
			MetaTags: null,
			AddedWhere: "board",
			IsDeleted: 0,
			TagType: "",
			Content: postStatement,
			ContentType: type,
			MediaType: type,
			AddedHow: type,
			thumbnail: thumbnail,
			Locator: name + "_" + incNum,
			LinkType: LinkType,
			OwnStatement: postStatement ? postStatement : "",
			CurrStatement: postStatement ? postStatement : ""
		}

		dataToUpload.Location.push({
			Size: "",
			URL: ""
		})

		var mediaData = await Media(dataToUpload).save();
		mediaData = typeof mediaData === 'object' ? mediaData : {};
		var mediaId = mediaData._id || null;
		if(!mediaId) {
			return res.json({code: 501, message: "Something went wrong."});
		}

		fields.Medias = result[0].Medias || [];

		var thisPostId = mongoose.Types.ObjectId();
		var postData = {
			_id : thisPostId,
			MediaID : mediaId,
			MediaURL : null,
			Title : '',
			Prompt : null,
			Locator : null,
			PostedBy : ObjectId(result[0].OwnerId),
			PostedOn : Date.now(),
			MediaType : 'Notes',
			ContentType : 'Notes',
			Content : postStatement,
			OwnerId : result[0].OwnerId,
			thumbnail : '',
			PostStatement : '',
			PostPrivacySetting : "PublicWithoutName"
		};

		fields.Medias.push(postData);

		var query = {
			_id : ObjectId(pageId)
		};
		var options = { multi: false };
		await Page.update(query, { $set: fields}, options);

		var outputArr = [
			"post added successfully"
		];

		//map keywords
		var keywordsObj =  {
			Primary: [],
			Secondary: [],
			Secondary2: []
		};
		if(postKeywordsArr[0].length > 1 && typeof postKeywordsArr[0][0] === 'string' && typeof postKeywordsArr[0][1] === 'string') {
			keywordsObj.Primary = [postKeywordsArr[0][0], postKeywordsArr[0][1]];
			keywordsObj.Secondary = postKeywordsArr[1] || [];
			keywordsObj.Secondary2 = postKeywordsArr[2] || [];
		} else {
			keywordsObj = await fetchKeywordsFromText_PrimarySecondary(postStatement);
		}

		var keywords = keywordsObj.Primary || [];
		var secondaryKeywords = keywordsObj.Secondary || [];
		var secondaryKeywords2 = keywordsObj.Secondary2 || [];

		req.body.SecondaryKeywordsMap = {};
		req.body.SecondaryKeywords = [];

		req.body.SecondaryKeywordsMap2 = {};
		req.body.SecondaryKeywords2 = [];

		if(secondaryKeywords.length) {
			var secKeywordsObj = await __getKeywordIdsByNames_CMIDW(secondaryKeywords) || {};
			req.body.SecondaryKeywordsMap = secKeywordsObj.secondaryKeywordsMap || {};
			req.body.SecondaryKeywords = secKeywordsObj.keywordIds || [];
		}

		if(secondaryKeywords.join(',') !== secondaryKeywords2.join(',')) {
			if(secondaryKeywords2.length) {
				var secKeywordsObj = await __getKeywordIdsByNames_CMIDW(secondaryKeywords2) || {};
				req.body.SecondaryKeywordsMap2 = secKeywordsObj.secondaryKeywordsMap || {};
				req.body.SecondaryKeywords2 = secKeywordsObj.keywordIds || [];
			} else {
				req.body.SecondaryKeywordsMap2 = {};
				req.body.SecondaryKeywords2 = [];
			}
		} else {
			req.body.SecondaryKeywordsMap2 = req.body.SecondaryKeywordsMap || {};
			req.body.SecondaryKeywords2 = req.body.SecondaryKeywords || [];
		}

		var postStreamObj = req.body.postStreamObj || {};
		var postStreamType = postStreamObj.type || '';

		if(keywords.length == 2) {
			var PostId = thisPostId;
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
					"Medias.$.SurpriseSelectedWords" : keywords,
					"Medias.$.SecondaryKeywords": secondaryKeywords,
					"Medias.$.SecondaryKeywords2": secondaryKeywords2,
					"Medias.$.SecondaryKeywordsMap": req.body.SecondaryKeywordsMap || {},
					"Medias.$.SecondaryKeywordsMap2": req.body.SecondaryKeywordsMap2 || {},
					"Medias.$.MediaSelectionCriteria": req.body.MediaSelectionCriteria || null,
					"Medias.$.MediaSelectionCriteria1": req.body.MediaSelectionCriteria1 || null,
					"Medias.$.MediaSelectionCriteria2": req.body.MediaSelectionCriteria2 || null,
					"Medias.$.PostStreamType": postStreamType || ''
				}
			};

			var options = { multi: false };
			await Page.update(conditions, setObj, options);
			await Page.update(conditions2, {$set : setObj}, options);

			outputArr.push('Keywords fetched from api and mapped with the post as SurpriseSelectedWords, PrimaryKeywords and SecondaryKeywords.');

			//now call addBlendImages internal api using axios
			//var sKeysIds = [];
			console.log("typeof secondaryKeywords = ", typeof secondaryKeywords);
			console.log("secondaryKeywords = ", secondaryKeywords);

			console.log("typeof secondaryKeywords2 = ", typeof secondaryKeywords2);
			console.log("secondaryKeywords2 = ", secondaryKeywords2);
			
			//var sKeysIds = await __getKeywordIdsByNames(secondaryKeywords);
			var reqObj = {
				PageId : pageId ? pageId : null,
				PostId : thisPostId ? thisPostId : null,
				SurpriseSelectedWords : keywords ? keywords : [],
				SecondaryKeywords: req.body.SecondaryKeywords || [], //sKeysIds || [],
				SecondaryKeywordsMap: req.body.SecondaryKeywordsMap || {},
				SecondaryKeywords2: req.body.SecondaryKeywords2 || [], //sKeysIds || [],
				SecondaryKeywordsMap2: req.body.SecondaryKeywordsMap2 || {},
				MediaSelectionCriteria: req.body.MediaSelectionCriteria || null,
				MediaSelectionCriteria1: req.body.MediaSelectionCriteria1 || null,
				MediaSelectionCriteria2: req.body.MediaSelectionCriteria2 || null,
				PostStatement: postStatement || '',
				PostStreamType: postStreamType
			};

			console.log("Calling addBlendImages_INTERNAL_API --------------------------------- ", reqObj);
			var request_url = 'https://www.scrpt.com/journal/addBlendImages_INTERNAL_API';

			var response = await axios.post(request_url, reqObj)
			response = typeof response === 'object' ? response : {};
			response.data = response.data ? response.data : {};
			response.data.code = response.data.code ? response.data.code : null;
			console.log("------------ AXIOS (ONETIME - /journal/addBlendImages_INTERNAL_API)----  - ", response.data.code);

			outputArr.push('mapped SelectedBlendImages with the post successfully.');

			//now check if postStreamObj is having 1MJPost or 2MJPost as a type to set the stream
			var MJImageArr = postStreamObj.fileArr || [];
			if(thisPostId && postStreamType === '1MJPost' && MJImageArr.length === 1) {

				var fileId = MJImageArr[0].fileId || '';
				var fileName = MJImageArr[0].fileName || '';
				var prompt = MJImageArr[0].prompt || '';
				var lightness = MJImageArr[0].lightness || 0;
				var title = MJImageArr[0].title || '';
				var photographer = MJImageArr[0].photographer || '';
				var source = MJImageArr[0].source || '';

				var request_url = `https://www.scrpt.com/media/syncGdMjImage_INTERNAL_API?postId=${thisPostId}&fileId=${fileId}&fileName=${fileName}&prompt=${prompt}&lightness=${lightness}&title=${title}&photographer=${photographer}&source=${source}`;

				var response = await axios.get(request_url);
				response = typeof response === 'object' ? response : {};
				response.data = response.data ? response.data : {};
				response.data.code = response.data.code ? response.data.code : null;
				console.log("------------ AXIOS (ONETIME - /media/syncGdMjImage_INTERNAL_API)----  - ", response.data.code);
				outputArr.push('1MJPost has been set with the post successfully.');

			} else if (thisPostId && postStreamType === '2MJPost' && MJImageArr.length === 2) {

				var fileId1 = MJImageArr[0].fileId || '';
				var fileName1 = MJImageArr[0].fileName || '';
				var prompt1 = MJImageArr[0].prompt || '';
				var lightness1 = MJImageArr[0].lightness || 0;
				var title1 = MJImageArr[0].title || '';
				var photographer1 = MJImageArr[0].photographer || '';
				var source1 = MJImageArr[0].source || '';

				var fileId2 = MJImageArr[1].fileId || '';
				var fileName2 = MJImageArr[1].fileName || '';
				var prompt2 = MJImageArr[1].prompt || '';
				var lightness2 = MJImageArr[1].lightness || 0;
				var title2 = MJImageArr[1].title || '';
				var photographer2 = MJImageArr[1].photographer || '';
				var source2 = MJImageArr[1].source || '';


				if(fileId1 && fileId2 && fileName1 && fileName2) {
					var reqObj = {
						PostId: thisPostId || null,
						inputArr: [
							{
								fileId: fileId1,
								fileName: fileName1,
								prompt: prompt1,
								lightness: lightness1,
								title: title1,
								photographer: photographer1,
								source: source1,
							},
							{
								fileId: fileId2,
								fileName: fileName2,
								prompt: prompt2,
								lightness: lightness2,
								title: title2,
								photographer: photographer2,
								source: source2,
							}
						]
					}

					var request_url = `https://www.scrpt.com/media/syncGdTwoMjImage_INTERNAL_API`;

					var response = await axios.post(request_url, reqObj);
					response = typeof response === 'object' ? response : {};
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS (ONETIME - /media/syncGdTwoMjImage_INTERNAL_API)----  - ", response.data.code);
					outputArr.push('2MJPost has been set with the post successfully.');
				}
			}

			console.log("----------------- Just before postCommentsArr.length ----------------------");
			if(postCommentsArr.length) {
				console.log("postCommentsArr.length ---------------------------- ", postCommentsArr.length);
				//create comments for this post after 30 seconds
				setTimeout(async () => {
					await __addCommentsToStreamPost_StreamTool(pageId, thisPostId, postCommentsArr);
				}, 5000);
			}

		} else {
			outputArr.push('Keywords not found.');
		}

		return res.json({"code": 200,"message" : "process completed", outputArr: outputArr});
	} catch (err) {
		console.log("Caught Error - ", err);
		return res.json({"code": 501,"message" : "Something went wrong.", error: err});
	}
}

function getTagTypeByTagName (tag) {
	let TagType = '';
	if(tag.indexOf('Synonyms___') >= 0) {
		TagType = 'Synonyms';
	} else if(tag.indexOf('Metaphors___') >= 0) {
		TagType = 'Metaphors';
	} else if(tag.indexOf('Objects___') >= 0) {
		TagType = 'Objects';
	} else if(tag.indexOf('Feelings___') >= 0) {
		TagType = 'Feelings';
	} else if(tag.indexOf('Adjectives___') >= 0) {
		TagType = 'Adjectives';
	}
	return TagType;
}

var addGTAsyncAwait__INTERNAL_API = async function (req, res) {
	var newkeywordsProcessed = [];
	var existingkeywordsProcessed = [];

	var keywords = Array.isArray(req.body.keywords) ? req.body.keywords : [];
	for (var i = 0; i < keywords.length; i++) {
		var keywordObj = keywords[i] || {};
		if (keywordObj) {
			var keyword = typeof keywordObj.keyword === 'string' ? keywordObj.keyword.trim().toLowerCase() : '';
			var tags = typeof keywordObj.tags === 'string' ? keywordObj.tags.split(',') : [];
			//console.log("tags = ", tags);
			var finalTags = tags.filter((tag)=>tag.trim().toLowerCase()!==keyword);

			var data = await groupTags.find({
				GroupTagTitle: { $regex: new RegExp("^"+keyword+"$", "i") },
				status: { $in: [1,3] }
			}).sort({ status: 1 });

			if (data.length == 0) {
				//save a new record
				var doc = {};
				doc.GroupTagTitle = keyword;
				doc.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';
				doc.MetaTagID = '54c98aba4fde7f30079fdd5b';
				doc.status = 3;
				doc.LastModified = Date.now();
				doc.DateAdded = Date.now();
				doc.Tags = [{ TagTitle: keyword, status: 1 }].concat(finalTags.map((tag)=>{
					tag = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
					const tagType = getTagTypeByTagName(tag);
					tag = tag.replace('Synonyms___', '').replace('Metaphors___', '').replace('Objects___', '').replace('Feelings___', '').replace('Adjectives___', '');
					if(tag) {
						return {
							TagTitle: tag,
							status: 1,
							TagType: tagType
						}
					}
				}));
				doc.Think = [];
				doc.Less = [];
				doc.More = [];
				doc.IsExistsOnExcel = true;
				await groupTags(doc).save();
				//newkeywordsProcessed.push({keyword:keyword, tags: doc.Tags});
				newkeywordsProcessed.push(keyword);
			} else {
				//update existing keyword record
				var alreadySavedKeyword = data[0];
				var uniqueTags = {};
				alreadySavedKeyword.Tags = Array.isArray(alreadySavedKeyword.Tags) ? alreadySavedKeyword.Tags : [];
				alreadySavedKeyword.Tags.forEach((tag)=> {
					tag.TagTitle = typeof tag.TagTitle === 'string' ? tag.TagTitle.trim().toLowerCase() : '';
					tag.TagTitle = tag.TagTitle.replace('synonyms___', '').replace('metaphors___', '').replace('objects___', '').replace('feelings___', '').replace('adjectives___', '').replace('feelings__', '').replace('adjectives__', '');
					if(tag.TagTitle) {
						uniqueTags[tag.TagTitle] = tag;
					}
				});

				finalTags.forEach((tag)=> {
					tag = typeof tag === 'string' ? tag.trim().toLowerCase() : '';
					const tagType = getTagTypeByTagName(tag);
					tag = tag.replace('synonyms___', '').replace('metaphors___', '').replace('objects___', '').replace('feelings___', '').replace('adjectives___', '').replace('feelings__', '').replace('adjectives__', '');
					if(tag) {
						uniqueTags[tag] = {TagTitle: tag, status: 1, TagType: tagType};
					}
				});
				var tagDocs = Object.values(uniqueTags);
				await groupTags.update({_id: ObjectId(alreadySavedKeyword._id)}, {$set: {IsExistsOnExcel: true, Tags: tagDocs}});
				//existingkeywordsProcessed.push({keyword:keyword, tags: tagDocs});
				existingkeywordsProcessed.push(keyword);
			}
		}
	}

	return res.json({code: 200, newkeywordsProcessed: newkeywordsProcessed, existingkeywordsProcessed: existingkeywordsProcessed});
}

let downloadStreamPostMetaData_INTERNAL_API = async function (req, res) {
	let pageId = req.query.PageId || null;
	if(!pageId) {
		return res.json({code: 501, message: "PageId is not valid."});
	}

	var cond = {
		PageId : ObjectId(pageId)
	};
	var fields = {};
	
	var PageStreamMap = await PageStream.find(cond, fields);
	let jsonArr = [];

	const tmpArr = [];

	/*for(let i = 0; i < PageStreamMap.length; i++) {
		let postObj = PageStreamMap[i] || {};
		postObj.SelectedBlendImages = postObj.SelectedBlendImages || [];
		for(let j = 0; j < postObj.SelectedBlendImages.length; j++) {
			let selectedPostBlendObject = postObj.SelectedBlendImages[j] || {};
			selectedPostBlendObject.MetaData_1 = selectedPostBlendObject.MetaData_1 || {};
			selectedPostBlendObject.MetaData_1.BriefDescription = selectedPostBlendObject.MetaData_1.BriefDescription || '';
			selectedPostBlendObject.MetaData_1.DetailedDescription = selectedPostBlendObject.MetaData_1.DetailedDescription || '';
			selectedPostBlendObject.MetaData_1.AestheticDescription = selectedPostBlendObject.MetaData_1.AestheticDescription || '';
			selectedPostBlendObject.MetaData_1.GoogleDriveFilename = selectedPostBlendObject.MetaData_1.GoogleDriveFilename || '';

			selectedPostBlendObject.MetaData_2 = selectedPostBlendObject.MetaData_2 || {};
			selectedPostBlendObject.MetaData_2.BriefDescription = selectedPostBlendObject.MetaData_2.BriefDescription || '';
			selectedPostBlendObject.MetaData_2.DetailedDescription = selectedPostBlendObject.MetaData_2.DetailedDescription || '';
			selectedPostBlendObject.MetaData_2.AestheticDescription = selectedPostBlendObject.MetaData_2.AestheticDescription || '';
			selectedPostBlendObject.MetaData_2.GoogleDriveFilename = selectedPostBlendObject.MetaData_2.GoogleDriveFilename || '';

			jsonArr.push({
				PageId : postObj.PageId,
				PostId : postObj.PostId,
				PostStatement : postObj.PostStatement || '',
				blendImage1 : selectedPostBlendObject.blendImage1 || '',
				blendImage2 : selectedPostBlendObject.blendImage2 || '',
				blendMode : selectedPostBlendObject.blendMode || '',
				UploadedFileName_1 : selectedPostBlendObject.MetaData_1.GoogleDriveFilename,
				UploadedFileName_2 : selectedPostBlendObject.MetaData_2.GoogleDriveFilename,
				BriefDescription_1 : selectedPostBlendObject.MetaData_1.BriefDescription,
				DetailedDescription_1 : selectedPostBlendObject.MetaData_1.DetailedDescription,
				AestheticDescription_1 : selectedPostBlendObject.MetaData_1.AestheticDescription,
				BriefDescription_2 : selectedPostBlendObject.MetaData_2.BriefDescription,
				DetailedDescription_2 : selectedPostBlendObject.MetaData_2.DetailedDescription,
				AestheticDescription_2 : selectedPostBlendObject.MetaData_2.AestheticDescription
			});
		}
	}*/

	const perPostFreq = PageStreamMap.length > 365 ? 1 : (parseInt(365 / PageStreamMap.length)+1);

	for(let i = 0; i < PageStreamMap.length; i++) {
		let postObj = PageStreamMap[i] || {};
		postObj.SelectedBlendImages = postObj.SelectedBlendImages || [];

		let perPostLimit = postObj.SelectedBlendImages.length > perPostFreq ? perPostFreq : postObj.SelectedBlendImages.length;
		for(let j = 0; j < perPostLimit; j++) {
			let selectedPostBlendObject = postObj.SelectedBlendImages[j] || {};
			selectedPostBlendObject.MetaData_1 = selectedPostBlendObject.MetaData_1 || {};
			selectedPostBlendObject.MetaData_1.BriefDescription = selectedPostBlendObject.MetaData_1.BriefDescription || '';
			selectedPostBlendObject.MetaData_1.DetailedDescription = selectedPostBlendObject.MetaData_1.DetailedDescription || '';
			selectedPostBlendObject.MetaData_1.AestheticDescription = selectedPostBlendObject.MetaData_1.AestheticDescription || '';
			selectedPostBlendObject.MetaData_1.GoogleDriveFilename = selectedPostBlendObject.MetaData_1.GoogleDriveFilename || '';

			selectedPostBlendObject.MetaData_2 = selectedPostBlendObject.MetaData_2 || {};
			selectedPostBlendObject.MetaData_2.BriefDescription = selectedPostBlendObject.MetaData_2.BriefDescription || '';
			selectedPostBlendObject.MetaData_2.DetailedDescription = selectedPostBlendObject.MetaData_2.DetailedDescription || '';
			selectedPostBlendObject.MetaData_2.AestheticDescription = selectedPostBlendObject.MetaData_2.AestheticDescription || '';
			selectedPostBlendObject.MetaData_2.GoogleDriveFilename = selectedPostBlendObject.MetaData_2.GoogleDriveFilename || '';

			jsonArr.push({
				PageId : postObj.PageId,
				PostId : postObj.PostId,
				PostStatement : postObj.PostStatement || '',
				blendImage1 : selectedPostBlendObject.blendImage1 || '',
				blendImage2 : selectedPostBlendObject.blendImage2 || '',
				blendMode : selectedPostBlendObject.blendMode || '',
				UploadedFileName_1 : selectedPostBlendObject.MetaData_1.GoogleDriveFilename,
				UploadedFileName_2 : selectedPostBlendObject.MetaData_2.GoogleDriveFilename,
				BriefDescription_1 : selectedPostBlendObject.MetaData_1.BriefDescription,
				DetailedDescription_1 : selectedPostBlendObject.MetaData_1.DetailedDescription,
				AestheticDescription_1 : selectedPostBlendObject.MetaData_1.AestheticDescription,
				BriefDescription_2 : selectedPostBlendObject.MetaData_2.BriefDescription,
				DetailedDescription_2 : selectedPostBlendObject.MetaData_2.DetailedDescription,
				AestheticDescription_2 : selectedPostBlendObject.MetaData_2.AestheticDescription
			});

			if(jsonArr.length === 365) {
				//break;
			}
		}

		if(jsonArr.length === 365) {
			//break;
		}
	}
	return res.json(jsonArr);
}


var addComments_INTERNAL_API = async function (req, res) {
	let PageId = req.body.PageId || null;
	let PostId = req.body.PostId || null;
	let blendImage1 = req.body.blendImage1 || null;
	let blendImage2 = req.body.blendImage2 || null;
	let blendMode = req.body.blendMode || null;
	let PostCommentsArr = req.body.postCommentsArr || [];
	
	if(PostCommentsArr.length) {
		await __addCommentsToStreamPost_StreamTool2(PageId, PostId, blendImage1, blendImage2, blendMode, PostCommentsArr);
		return res.json({code: 200, message: "Comments and Likes added successfully."});
	}

	return res.json({code: 501, message: "Something went wrong."});
};

var getUnsplashImages_BROWSER_API = async function (req, res) {
	const results = await Media.aggregate([
		{$match: {IsUnsplashImage: true, IsDeleted : 0, UploadedBy: "admin"}},
		{
			$unwind : "$Location"
		},
		{
			$project : {
				_id: "$_id",
				URL: "$Location.URL" 
			}
		}
	]);
	return res.json(results);
};

var getAllImages_BROWSER_API = async function (req, res) {
	const results = await Media.aggregate([
		{$match: {IsDeleted : 0, UploadedBy: "admin"}},
		{
			$unwind : "$Location"
		},
		{
			$project : {
				_id: "$_id",
				URL: "$Location.URL" 
			}
		}
	]);
	return res.json(results);
};

var setupStream_BROWSER_API = async function (req, res) {
	var data = req.query || {};
	data = {
		CreaterId : '5f4835e67a5d1b040c63237e',
		OwnerId : '5f4835e67a5d1b040c63237e',
		Title: data.Title || 'Untitled Stream',
		"LaunchSettings" : {
			"IsInvitationSent" : false,
			"StreamType" : "",
			"Invitees" : [],
			"OthersData" : [],
			"ShareMode" : "private",
			"Audience" : "BUYERS",
			"CapsuleFor" : "Stream"
		},
		"Origin" : "created",
		"IsLaunched" : true,
    	"IsPublished" : true,
		"IsAllowedForSales" : true,
		"IsHidden": parseInt(data.store || 0) === 1 ? false : true,
		"DiscountPrice" : 0,
    	"Price" : 24.99,
		"StreamFlow": "Topic"
	};

	let capsuleResult = await Capsule(data).save();
	capsuleResult._id = capsuleResult._id || null;
	if(!capsuleResult._id) {
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		return res.json(response);
	}
	
	data = {
		CapsuleId: capsuleResult._id,
		CreaterId: capsuleResult.CreaterId,
		OwnerId: capsuleResult.OwnerId,
		IsPublished: true,
		Title: capsuleResult.Title
	};

	let chapterResult = await Chapter(data).save();
	chapterResult._id = chapterResult._id || null;
	if(!chapterResult._id) {
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		return res.json(response);
	}
	
	data = {
		ChapterId: chapterResult._id,
		CreaterId: chapterResult.CreaterId,
		OwnerId: chapterResult.OwnerId,
		IsPublished: true,
		Title: chapterResult.Title,
		TitleInvitees: chapterResult.Title,
		PageType: "gallery"
	};

	let pageResult = await Page(data).save();
	pageResult._id = pageResult._id || null;
	if(!pageResult._id) {
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		return res.json(response);
	}
	

	var response = {
		status: 200,
		message: "Stream container has been created successfully. you can use this to generate your stream.",
		StreamTitle: capsuleResult.Title || "",
		CapsuleId: capsuleResult._id || "",
		ChapterId: chapterResult._id || "",
		PageId: pageResult._id || "",
		settings_url : `https://www.scrpt.com/ls/${capsuleResult._id}/AI`,
		space_url: `https://www.scrpt.com/space/${chapterResult._id}/${pageResult._id}`
	}
	return res.json(response);
}

const deleteAllPosts_BROWSER_API = async function (req, res) {
	try {
		var pageId = req.query.PageId || null;
		var conditions = {
			"_id" :  ObjectId(pageId)
		};
		var setObj = {
			$set : { "Medias" : [] }
		};

		let result = await Page.update(conditions, setObj);
		result.ok = result.ok || 0;
		if(result.ok){
			//delete the post stream as well
			await PageStream.remove({PageId: ObjectId(pageId)});
			
			return res.json({"code":"200","message":"All Posts deleted successfully!"});
		}
		else {
			return res.json({"code":"404","message":"No records deleted"});
		}
	} catch (err) {
		console.log(err);
		return res.json({"code":"501","message":"Something went wrong in code."});
	}
}

const deleteAllComments_BROWSER_API = async function (req, res) {
	try {
		var pageId = req.query.PageId || null;
		var conditions = {
			"SocialPageId" :  ObjectId(pageId)
		};
		
		await StreamComments.remove(conditions);
		await StreamCommentLikes.remove(conditions);
		return res.json({"code":"200","message":"All Comments and Likes deleted successfully!"});
	} catch (err) {
		console.log(err);
		return res.json({"code":"501","message":"Something went wrong."});
	}
}

const updateStreamPostWithTransparentImage = async function (req, res) {
	/*let PageId = req.body.pageId || null;
	let PostId = req.body.postId || null;

	if(!PageId || !PostId) {
		return res.json({code: 404, message: "Not found"});
	}

	//create new PageStream config replica
	var PageStreamDataArr = await PageStream.find({PageId : ObjectId(PageId), PostId : ObjectId(PostId)}).lean();
	PageStreamDataArr = Array.isArray(PageStreamDataArr) ? PageStreamDataArr : [];


	if(PageStreamDataArr.length) {
		var PageStreamData = PageStreamDataArr[0];
		PageStreamData._id = new ObjectId();
		PageStreamData.PageId = newStreamPageArr[0]._id;
		PageStreamData.PostId = newStreamPostObj._id;
		await PageStream(PageStreamData).save();
	}
	
	db.documents.update(
		{}, // Filter to match all documents
		{ $set: { "arrayField.$[].fieldToUpdate": "newValue" } },
		{ multi: true }
	)*/
	  
}


exports.updateLightnessScore = updateLightnessScore;
//exports.createDefaultJournal = createDefaultJournal;
//exports.getAllJournalCapsules = getAllJournalCapsules;

exports.getMyFolders = getMyFolders;
exports.getMyFolderPages = getMyFolderPages;
exports.createFolder = createFolder;
exports.createPage = createPage;
exports.getAllMyPages = getAllMyPages;
exports.preloader__getAllHeaders = preloader__getAllHeaders;

exports.addLabel = addLabel;
exports.deleteLabel = deleteLabel;
exports.syncPost = syncPost;
exports.sendPost = sendPost;
exports.updatePostLabelId = updatePostLabelId;
exports.transferOwnership = transferOwnership;
exports.shiftPostPosition = shiftPostPosition;

exports.createEmail = createEmail;
exports.editEmail = editEmail;
//exports.searchMedia = searchMedia;
exports.searchMedia = searchMediaV2;
exports.suggestKeywordsForStream = suggestKeywords__getAllWordsFromPythonApi;
exports.streamPost = streamPost;
exports.streamPage__WithSelectedBlendCase = streamPage__WithSelectedBlendCase;
exports.savePostStreamConfig = savePostStreamConfig;
exports.getBlendImages = getBlendImages;
exports.getUserStreamsStats = getUserStreamsStats;
exports.addConversation = addConversation;
exports.minusConversation = minusConversation;
exports.savePostStreamKeywords = savePostStreamKeywords;
exports.setmysession = setmysession;
exports.generatePostBlendImages = generatePostBlendImages;
exports.generatePostBlendImage = generatePostBlendImage;
//stream public page apis
exports.myStreamPosts = myStreamPosts;
exports.addCommentOnSocialPost = addCommentOnSocialPost;
exports.deleteCommentOnSocialPost = deleteCommentOnSocialPost;
exports.getStreamComments = getStreamComments;

exports.addStreamPostLike = addStreamPostLike;
exports.removeStreamPostLike = removeStreamPostLike;
exports.getStreamLikes = getStreamLikes;

exports.addLike = addLike;
exports.removeLike = removeLike;
exports.getStreamCommentsLikes = getStreamCommentsLikes;

exports.userStreamsPostsWithActivities = userStreamsPostsWithActivities;
exports.addCommentOnComment = addCommentOnComment;
exports.getPrivateComments = getPrivateComments;
//stream public page apis

exports.newPostsReplicaFromExistingStream = newPostsReplicaFromExistingStream;

exports.markAsBroadcastPost = markAsBroadcastPost;
exports.markAsAdPost = markAsAdPost;
exports.markAsKeyPost = markAsKeyPost;
exports.markAsPost = markAsPost;
exports.markAsGeneralPost = markAsGeneralPost;
exports.markAsQuestionPost = markAsQuestionPost;
exports.markAsInfoPost = markAsInfoPost;
exports.markAsInfoPostOwner = markAsInfoPostOwner;
exports.markAsIsPreLaunchPost = markAsIsPreLaunchPost;
exports.markAsNotPreLaunchPost = markAsNotPreLaunchPost;
exports.markAsOneTimePost = markAsOneTimePost;
exports.markAsRepeatPost = markAsRepeatPost;
exports.markAsPublicQuestionPost = markAsPublicQuestionPost
exports.markAsPrivateQuestionPost = markAsPrivateQuestionPost;

exports.getOtherPosts = getOtherPosts;
exports.updatePostLinkUrl = updatePostLinkUrl;
exports.getUserStats = getUserStats;

exports.stream__addMembers = stream__addMembers;
exports.stream__getMembersList = stream__getMembersList;
exports.stream__updateMembers = stream__updateMembers;
exports.stream__publicaddMembers = stream__publicaddMembers;
exports.stream__sendCoffeeInvitation = stream__sendCoffeeInvitation;

exports.addKeywordAndCallAddBlendImagesApi_INTERNAL_API = addKeywordAndCallAddBlendImagesApi_INTERNAL_API;
exports.addBlendImages_INTERNAL_API = addBlendImages_INTERNAL_API;
exports.generatePostBlendImage_INTERNAL_API = generatePostBlendImage_INTERNAL_API;
exports.createNewUserAccount_INTERNAL_API = createNewUserAccount_INTERNAL_API;
exports.sendUserSurpriseGiftNotification_INRENAL_API = sendUserSurpriseGiftNotification_INRENAL_API;
exports.sendPreLaunchPosts_INTERNAL_API = sendPreLaunchPosts_INTERNAL_API;
exports.addNewPost_INTERNAL_API = addNewPost_INTERNAL_API;
exports.addComments_INTERNAL_API = addComments_INTERNAL_API;
exports.addGTAsyncAwait__INTERNAL_API = addGTAsyncAwait__INTERNAL_API; //used by automation tool to map keywords
exports.setStreamMediaSelectionCriteria__INTERNAL_API = setStreamMediaSelectionCriteria__INTERNAL_API;
exports.downloadStreamPostMetaData_INTERNAL_API = downloadStreamPostMetaData_INTERNAL_API;

exports.getPrimarySecondaryKeywordsPrompt_BROWSER_API = getPrimarySecondaryKeywordsPrompt_BROWSER_API;
exports.updatePrimarySecondaryKeywordsPrompt_BROWSER_API = updatePrimarySecondaryKeywordsPrompt_BROWSER_API;
exports.getUnsplashImages_BROWSER_API = getUnsplashImages_BROWSER_API;
exports.getAllImages_BROWSER_API = getAllImages_BROWSER_API;
exports.updateStreamMediaFilterSortingOrder_BROWSER_API = updateStreamMediaFilterSortingOrder_BROWSER_API;
exports.setupStream_BROWSER_API = setupStream_BROWSER_API;
exports.deleteAllPosts_BROWSER_API = deleteAllPosts_BROWSER_API;
exports.deleteAllComments_BROWSER_API = deleteAllComments_BROWSER_API;

exports.addAnswerFinishStatus = addAnswerFinishStatus;
exports.getAnswerStageStatus = getAnswerStageStatus;

exports.getMyStreamAwardDetails = getMyStreamAwardDetails;
exports.markAward = markAward;
exports.finalizeLaunchDate = finalizeLaunchDate;

exports.unsubscribeEmails = unsubscribeEmails;

exports.addCompiledStatementsToGoogleSheet = addCompiledStatementsToGoogleSheet;
exports.addPostToGSheetByPostIds = addPostToGSheetByPostIds;

exports.addKeywordsToGSheet = addKeywordsToGSheet;
exports.addKeywordsToGSheetGroupStream = addKeywordsToGSheetGroupStream;

exports.updateAutoInviteCount = updateAutoInviteCount;
exports.updateAutoCoverPageCount = updateAutoCoverPageCount;

exports.getPreviousAnswersLogs = myStreamPosts__GroupStream_MemberCase_prefill;

exports.getAutoPlayerSeenLog = getAutoPlayerSeenLog;
exports.updateAutoPlayerSeenLog = updateAutoPlayerSeenLog;
exports.updatePostActionAnnouncementSeenLog = updatePostActionAnnouncementSeenLog;

exports.getQuestAudioStats = getQuestAudioStats;

exports.updateAddDetailsSeen = updateAddDetailsSeen;
exports.updateWelcomeSeen = updateWelcomeSeen;
exports.updateHowItWorksSeen = updateHowItWorksSeen;
exports.updatePostLaunchVideoSeen = updatePostLaunchVideoSeen;

exports.getUnsubscribeIdByEmail = getUnsubscribeIdByEmail;
exports.updateStreamPostWithTransparentImage = updateStreamPostWithTransparentImage;
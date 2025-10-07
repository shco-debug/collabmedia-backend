var Media = require('./../models/mediaModel.js');
var GroupTag = require('./../models/groupTagsModel.js');
var Page = require('./../models/pageModel.js');
var mongoose = require("mongoose");
var shortid = require('shortid');	//updated on 16Oct2017 - For search algorithm default random media

var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var SyncedPost = require('./../models/syncedpostModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var User = require('./../models/userModel.js');
var CommonAlgo = require('./../components/commonAlgorithms.js');

var crypto = require('crypto');
var fs = require('fs');
var axios = require('axios');

var StreamCommentLikes = require('./../models/StreamCommentLikesModel.js');
var ObjectId = mongoose.Types.ObjectId;
const cheerio = require('cheerio');

var updateMediaCountsPerGt = function () {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	Media.aggregate([
		//{$match : {IsPrivate : 0, IsDeleted : 0 , Status : {$in : [1,2]}}},
		{
			$match : {
				UploadedBy : "admin",
				//{MediaType : { $in : ['Image'] },
				$or : [
					{MediaType : 'Image'},
					{MediaType : "Link" , LinkType : "image" , IsUnsplashImage : true}
				],
				IsPrivate : 0,
				IsDeleted : 0,
				Status : {$in : [1,2]},
				InAppropFlagCount : {$lt:5},	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
				MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			}
		},
		{$unwind : "$GroupTags"},
		{$group : {_id:{GroupTagId:"$GroupTags.GroupTagID"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							MediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						}
					});
					bulkOps = [];
				}
			}

			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {MediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("----------------------- CRON Job : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("----------------------- CRON Job : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
					}
				});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
		}
	})
}

exports.updateMediaCountsPerGt = updateMediaCountsPerGt;

var updateMediaCountsPerGt_API = function (req , res) {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	Media.aggregate([
		{
			$match : {
				UploadedBy : "admin",
				//MediaType : { $in : ['Image'] },
				$or : [
					{MediaType : 'Image'},
					{MediaType : "Link" , LinkType : "image" , IsUnsplashImage : true}
				],
				IsPrivate : 0,
				IsDeleted : 0,
				Status : {$in : [1,2]},
				InAppropFlagCount : {$lt:5},	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
				MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			}
		},
		{$unwind : "$GroupTags"},
		{$group : {_id:{GroupTagId:"$GroupTags.GroupTagID"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							MediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {MediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}

exports.updateMediaCountsPerGt_API = updateMediaCountsPerGt_API;

//updateRandomSortIdPerMedia_API - Random sort algorithm for default search case - updated on 16Oct2017.
var updateRandomSortIdPerMedia_API = function (req , res) {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	var find_conditions = {IsDeleted : 0};
	var fields = {
		_id : true,
		Status : true
	};

	Media.find(find_conditions , fields).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];
				var conditions = {
					_id : document._id
				};

				var setObj = {
					RandomSortId: shortid.generate(),
					RandomSortId_UpdatedOn : Date.now()
				};
				// If you were using the MongoDB driver directly, you'd need to do
				// update: { $set: { title: ... } } but mongoose adds $set for
				// you.
				bulkOps.push(
					{
						updateOne : {
							filter: conditions,
							update: setObj
						}
					}
				);

				counter++;

				if ( counter % 1000 == 0 ) {
					Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if ( counter % 1000 != 0 ) {
				Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}
exports.updateRandomSortIdPerMedia_API = updateRandomSortIdPerMedia_API;

//cron job version to schedule
var updateRandomSortIdPerMedia = function () {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	var find_conditions = {IsDeleted : 0};
	var fields = {
		_id : true,
		Status : true
	};

	Media.find(find_conditions , fields).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];
				var conditions = {
					_id : document._id
				};

				var setObj = {
					RandomSortId: shortid.generate(),
					RandomSortId_UpdatedOn : Date.now()
				};
				// If you were using the MongoDB driver directly, you'd need to do
				// update: { $set: { title: ... } } but mongoose adds $set for
				// you.
				bulkOps.push(
					{
						updateOne : {
							filter: conditions,
							update: setObj
						}
					}
				);

				counter++;

				if ( counter % 1000 == 0 ) {
					Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if ( counter % 1000 != 0 ) {
				Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}
exports.updateRandomSortIdPerMedia = updateRandomSortIdPerMedia;

var updateAlltagsCollection = function (req , res) {
	GroupTag.aggregate([
		//{ $match : {MediaCount : {$gt : 0}, status : {$in : [1 , 3]}} }, //updated logic after python api - 2021
		{ $match : {status : {$in : [1 , 3]}} },
		{ $unwind: { path: "$Tags", preserveNullAndEmptyArrays: true} },
		{
			$project : {
				_id : "$Tags._id",
				gt_id : "$_id",
				//MainGroupTagTitle : "$GroupTagTitle",
				//GroupTagTitle : "$Tags.TagTitle",
				MainGroupTagTitle : { $toLower: "$GroupTagTitle" },
				GroupTagTitle : { $toLower: "$Tags.TagTitle" },
				status : "$status",
				tagStatus : "$Tags.status",
				MetaMetaTagID : "$MetaMetaTagID",
				MetaTagID : "$MetaTagID",
				DateAdded : "$DateAdded",
				LastModified : "$LastModified",
				Tags : [
					{
						_id : "$Tags._id",
						//TagTitle : "$Tags.TagTitle",
						TagTitle : { $toLower: "$Tags.TagTitle" },
						status : "$Tags.status",
						DateAdded : "$Tags.DateAdded",
						LastModified : "$Tags.LastModified",
					}
				],
				MediaCount : "$MediaCount"
			}
		},
		{ $match : {tagStatus : 1} },
		//{ $sort : {GroupTagTitle : 1} },
		{ $out : "alltags" }
	]).allowDiskUse(true).exec(function(err , result){
		if(!err){
			//res.json({status:200 , message : "Success"});
			//console.log({status:200 , message : "Success"});
		}
		else{
			//res.json({status:0 , message : "Error"});
			//console.log({status:0 , message : "Error"});
		}
	});
}
exports.updateAlltagsCollection = updateAlltagsCollection;

var updateAlltagsCollection_API = function (req , res) {
	GroupTag.aggregate([
		//{ $match : {MediaCount : {$gt : 0}, status : {$in : [1 , 3]}} },	//updated logic after python api - 2021
		{ $match : {status : {$in : [1 , 3]}} },
		{ $unwind: { path: "$Tags", preserveNullAndEmptyArrays: true} },
		{
			$project : {
				_id : "$Tags._id",
				gt_id : "$_id",
				//MainGroupTagTitle : "$GroupTagTitle",
				//GroupTagTitle : "$Tags.TagTitle",
				MainGroupTagTitle : { $toLower: "$GroupTagTitle" },
				GroupTagTitle : { $toLower: "$Tags.TagTitle" },
				status : "$status",
				tagStatus : "$Tags.status",
				MetaMetaTagID : "$MetaMetaTagID",
				MetaTagID : "$MetaTagID",
				DateAdded : "$DateAdded",
				LastModified : "$LastModified",
				Tags : [
					{
						_id : "$Tags._id",
						//TagTitle : "$Tags.TagTitle",
						//TagTitle : { $toLower: { $trim: { input: "$Tags.TagTitle" } } },
						TagTitle : { $toLower: "$Tags.TagTitle" },
						status : "$Tags.status",
						DateAdded : "$Tags.DateAdded",
						LastModified : "$Tags.LastModified",
					}
				],
				MediaCount : "$MediaCount"
			}
		},
		{ $match : {tagStatus : 1} },
		//{ $sort : {GroupTagTitle : 1} },
		{ $out : "alltags" }
	]).allowDiskUse(true).exec(function(err , result){
		if(!err){
			res.json({status:200 , message : "Success"});
		}
		else{
			console.log("err - ", err);
			res.json({status:0 , message : "Error"});
		}
	});
}
exports.updateAlltagsCollection_API = updateAlltagsCollection_API;

//this api will be used to update post count per gt - So that we can fetch the list for Search Media in search gallery...
var updatePostCountsPerGt_API = function (req , res) {
	//console.log("---------------Cron job called successfully : updatePostCountsPerGt-------------------");

	Page.aggregate([
		{
			$match : {
				IsDeleted: false
			}
		},
		{$unwind : "$Medias"},
		{
			$project: {
				_id: "$Medias.MediaID",
				PostId: "$Medias._id",
				UploaderID: "$Medias.PostedBy",
				PostedBy: "$Medias.PostedBy",
				ContentType: "$Medias.ContentType",
				MediaType: "$Medias.MediaType",
				Locator: "$Medias.Locator",
				UploadedOn: "$Medias.PostedOn",
				Title: "$Medias.Title",
				Prompt: "$Medias.Prompt",
				URL: "$Medias.MediaURL",
				thumbnail: "$Medias.thumbnail",
				Content: "$Medias.Content",
				PostStatement: "$Medias.PostStatement",
				PostStatement__real: "$Medias.PostStatement",
				IsOnlyForOwner: "$Medias.IsOnlyForOwner",
				PostPrivacySetting : "$Medias.PostPrivacySetting",
				Themes: "$Medias.Themes",
				IsAdminApproved: "$Medias.IsAdminApproved"
			}
		},
		{
			$match : {
				$or: [
					{ IsAdminApproved: { $exists: false } },
					{ $and : [{IsAdminApproved: { $exists: true }},{IsAdminApproved: true }]}
				],
				MediaType: "Link",
				//IsOnlyForOwner: false
				PostPrivacySetting : {$ne : "OnlyForOwner"}
			}
		},
		{$unwind : "$Themes"},
		{$group : {_id:{GroupTagId:"$Themes.id"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							PostMediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {PostMediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success", allGtIds : allGtIds});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success", allGtIds2 : allGtIds});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}

exports.updatePostCountsPerGt_API = updatePostCountsPerGt_API;

//cron job of the above api -----
var updatePostCountsPerGt = function () {
	//console.log("---------------Cron job called successfully : updatePostCountsPerGt-------------------");

	Page.aggregate([
		{
			$match : {
				IsDeleted: false
			}
		},
		{$unwind : "$Medias"},
		{
			$project: {
				_id: "$Medias.MediaID",
				PostId: "$Medias._id",
				UploaderID: "$Medias.PostedBy",
				PostedBy: "$Medias.PostedBy",
				ContentType: "$Medias.ContentType",
				MediaType: "$Medias.MediaType",
				Locator: "$Medias.Locator",
				UploadedOn: "$Medias.PostedOn",
				Title: "$Medias.Title",
				Prompt: "$Medias.Prompt",
				URL: "$Medias.MediaURL",
				thumbnail: "$Medias.thumbnail",
				Content: "$Medias.Content",
				PostStatement: "$Medias.PostStatement",
				PostStatement__real: "$Medias.PostStatement",
				IsOnlyForOwner: "$Medias.IsOnlyForOwner",
				PostPrivacySetting : "$Medias.PostPrivacySetting",
				Themes: "$Medias.Themes",
				IsAdminApproved: "$Medias.IsAdminApproved"
			}
		},
		{
			$match : {
				$or: [
					{ IsAdminApproved: { $exists: false } },
					{ $and : [{IsAdminApproved: { $exists: true }},{IsAdminApproved: true }]}
				],
				MediaType: "Link",
				//IsOnlyForOwner: false,
				PostPrivacySetting : {$ne : "OnlyForOwner"}
			}
		},
		{$unwind : "$Themes"},
		{$group : {_id:{GroupTagId:"$Themes.id"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							PostMediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {PostMediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}

exports.updatePostCountsPerGt = updatePostCountsPerGt;



//cron job of InvitationEngine -----


var chapter__sendInvitations = function (ChapterData, invitees, OwnerName, comingBirthDayDate) {

	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL, OwnerName, comingBirthDayDate) {
		var OwnerName = OwnerName ? OwnerName : "ScrptCo";
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}

			var OwnerBirthday_Month = comingBirthDayDate.getMonth();
			var OwnerBirthday_Date = comingBirthDayDate.getDate();
			var monthArr = ['January' , 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var OwnerBirthday = monthArr[OwnerBirthday_Month]+' '+OwnerBirthday_Date;


			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{OwnerBirthday}/g, OwnerBirthday);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + OwnerName + ' has invited you in a chapter to join!';

			var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
			var mailOptions = {
				//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to, // list of receivers
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					// //console.log(error);
				} else {
					console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}

	//make chapter view url
	var condition = {};
	condition = {
		ChapterId: ChapterData._id ? ChapterData._id : 0,
		IsDeleted: 0,
		IsDasheditpage: { $ne: true },
		PageType: { $in: ["gallery", "content"] }
	};


	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		ChapterId: true,
		PageType: true
	};

	var ChapterViewURL = "";

	var invitees = invitees ? invitees : [];
	if (invitees.length) {
		Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
			if (!err) {
				var data = {
					status: 200,
					message: "Pages listing",
					results: results
				}
				//res.json(response);

				if (data.results.length) {
					if (data.results[0].PageType == "content") {
						ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
					} else if (data.results[0].PageType == "gallery") {
						ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
					} else {
						// //console.log("Something went wrong.");
						ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
					}

					ChapterViewURL = process.HOST_URL + '/chapter-introduction/' + condition.ChapterId;

					var conditions = {};
					conditions.name = "Chapter__invitation_BIRTHDAY";

					EmailTemplate.find(conditions, {}, function (err, results) {
						if (!err) {
							if (results.length) {
								for (var loop = 0; loop < invitees.length; loop++) {
									var shareWithEmail = invitees[loop].UserEmail;
									var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

									// //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
									sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL, OwnerName, comingBirthDayDate);

								}
							}
						}
					})
				} else {
					// //console.log("No Page Found...");
				}
			} else {
				// //console.log(err);
			}
		});
	}
};


var owner__sendBirthdayWish = function (ChapterData) {

	function sendBirthdayWishEmail(results, shareWithEmail, ChapterViewURL, OwnerName) {

		var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
		newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
		newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

		var to = shareWithEmail;
		results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
		var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
		subject = subject != '' ? subject : 'Happy Birthday ' + OwnerName;

		var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
		var mailOptions = {
			//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
			from: process.EMAIL_ENGINE.info.senderLine,
			to: to, // list of receivers
			subject: subject,
			html: newHtml
		};

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				// //console.log(error);
			} else {
				console.log('Message sent to: ' + mailOptions.to + info.response);
			}
		});
	}

	//make chapter view url
	var condition = {};
	condition = {
		ChapterId: ChapterData._id ? ChapterData._id : 0,
		IsDeleted: 0,
		IsDasheditpage: { $ne: true },
		PageType: { $in: ["gallery", "content"] }
	};


	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		ChapterId: true,
		PageType: true
	};

	var ChapterViewURL = "";

	Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var data = {
				status: 200,
				message: "Pages listing",
				results: results
			}
			//res.json(response);

			if (data.results.length) {
				if (data.results[0].PageType == "content") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
				} else if (data.results[0].PageType == "gallery") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				} else {
					// //console.log("Something went wrong.");
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				}

				ChapterViewURL = process.HOST_URL + '/chapter-introduction/' + condition.ChapterId + '/own';

				var conditions = {};
				conditions.name = "Wish__BIRTHDAY";

				EmailTemplate.find(conditions, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
							ChapterData.OwnerId.Email = ChapterData.OwnerId.Email ? ChapterData.OwnerId.Email : null;
							var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : null;

							if(ChapterData.OwnerId.Email) {
								var shareWithEmail = ChapterData.OwnerId.Email;

								sendBirthdayWishEmail(results, shareWithEmail, ChapterViewURL, OwnerName);
							}
						}
					}
				})
			} else {
				// //console.log("No Page Found...");
			}
		} else {
			// //console.log(err);
		}
	});
};

var InvitationEngineCron = function(){
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.IsInvitationSent" : 0,
		"LaunchSettings.OwnerBirthday" : {$exists : true},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			results = typeof results === 'object' ? results : [];
			//res.json({results : results});
			var capsuleIds = [];
			var comingBirthDayDate = null;
			for(var loop = 0; loop < results.length; loop++){
				results[loop].LaunchSettings = typeof results[loop].LaunchSettings === 'object' ? results[loop].LaunchSettings : {};
				var a = results[loop].LaunchSettings.OwnerBirthday ? results[loop].LaunchSettings.OwnerBirthday : ""; //"19-9";

				var t = new Date();
				var ty = t.getFullYear();
				var tm = t.getMonth() + 1;
				var td = t.getDate();
				var todayDate = new Date(ty + '-' + tm + '-' + td);

				var today = todayDate.getTime();

				var bdate = new Date();
				var aArr = a.split("-");
				if(aArr.length) {
					bdate.setDate(parseInt(aArr[0]));
					bdate.setMonth(parseInt(aArr[1]) - 1);
					var y = bdate.getFullYear();
					var m = bdate.getMonth() + 1;
					var d = bdate.getDate();
					comingBirthDayDate = new Date(y + '-' + m + '-' + d);
					var birthday = comingBirthDayDate.getTime();

					var after6Weeks = today + (42*24*60*60*1000);

					if(birthday >= today && birthday <=  after6Weeks) {
						//console.log("Your birthday is coming IN next 6 weeks ------ capsuleId = ",results[loop]._id);
						capsuleIds.push(results[loop]._id);

					} else {
						//console.log("Your birthday is coming AFTER 6 weeks ------ capsuleId = ",results[loop]._id);
					}
				}
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').lean().exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}


var InvitationEngineCron__API = function(req , res){
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.IsInvitationSent" : 0,
		"LaunchSettings.OwnerBirthday" : {$exists : true},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			results = typeof results === 'object' ? results : [];
			//res.json({results : results});
			var capsuleIds = [];
			var comingBirthDayDate = null;
			for(var loop = 0; loop < results.length; loop++){
				results[loop].LaunchSettings = typeof results[loop].LaunchSettings === 'object' ? results[loop].LaunchSettings : {};
				var a = results[loop].LaunchSettings.OwnerBirthday ? results[loop].LaunchSettings.OwnerBirthday : ""; //"19-9";

				var t = new Date();
				var ty = t.getFullYear();
				var tm = t.getMonth() + 1;
				var td = t.getDate();
				var todayDate = new Date(ty + '-' + tm + '-' + td);

				var today = todayDate.getTime();

				var bdate = new Date();
				var aArr = a.split("-");
				if(aArr.length) {
					bdate.setDate(aArr[0]);
					bdate.setMonth(aArr[1] - 1);
					var y = bdate.getFullYear();
					var m = bdate.getMonth() + 1;
					var d = bdate.getDate();
					comingBirthDayDate = new Date(y + '-' + m + '-' + d);
					var birthday = comingBirthDayDate.getTime();

					var after6Weeks = today + (42*24*60*60*1000);

					if(birthday >= today && birthday <=  after6Weeks) {
						console.log("Your birthday is coming IN next 6 weeks ------ capsuleId = ",results[loop]._id);
						capsuleIds.push(results[loop]._id);

					} else {
						console.log("Your birthday is coming AFTER 6 weeks ------ capsuleId = ",results[loop]._id);
					}
				}
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}


var WishHappyBirthdayCron__API = function(req , res){
	var t = new Date();
	var td = t.getDate();
	var tm = t.getMonth() + 1;
	var ty = t.getYear();
	tm = parseInt(tm) < 10 ? "0"+tm : tm;

	//var todayBirthdayString = String(td + '-' + tm);
	//var todayBirthdayString = String(td + '-' + tm + '-' + ty);
	var todayBirthdayString = String(td + '-' + tm + '-');
	//var todayBirthdayString = td + '-' + tm + '-';
	//console.log("todayBirthdayString = ",todayBirthdayString);
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.OwnerBirthday" : {
			$regex : new RegExp("^" + todayBirthdayString , "i")
		},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			var results = typeof results === 'object' ? results : [];
			var capsuleIds = [];
			for(var loop = 0; loop < results.length; loop++){
				capsuleIds.push(results[loop]._id);
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}


var WishHappyBirthdayCron = function(req , res){
	var t = new Date();
	var td = t.getDate();
	var tm = t.getMonth() + 1;
	var ty = t.getYear();
	tm = parseInt(tm) < 10 ? "0"+tm : tm;

	//var todayBirthdayString = String(td + '-' + tm);
	//var todayBirthdayString = String(td + '-' + tm + '-' + ty);
	var todayBirthdayString = String(td + '-' + tm + '-');
	//console.log("todayBirthdayString = ",todayBirthdayString);
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.OwnerBirthday" : {
			$regex : new RegExp("^" + todayBirthdayString , "i")
		},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			var results = typeof results === 'object' ? results : [];
			var capsuleIds = [];
			for(var loop = 0; loop < results.length; loop++){
				capsuleIds.push(results[loop]._id);
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}

//SynedPostEmailCron();
var SynedPostEmailCron = async function () {
    console.log("---------------------------------SynedPostEmailCron START----------------------------------------");
    try {
        var conditions = {
            "IsDeleted" : false,
            "Status" : true,
            "EmailEngineDataSets.Delivered" : false
        };
        var todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        var todayEnd = new Date();
        todayEnd.setHours(23,59,59,999);

        console.log("Cron job looking for emails with DateOfDelivery between:", todayStart, "and", todayEnd);
        conditions["EmailEngineDataSets.DateOfDelivery"] = {$gte: todayStart, $lte : todayEnd};
        console.log("Cron job conditions:", JSON.stringify(conditions));

        try {
            const syncedPostsResults = await SyncedPost.aggregate([
                { $match: conditions },
                { $unwind : "$EmailEngineDataSets" },
                { $match : { "EmailEngineDataSets.DateOfDelivery": {$gte: todayStart, $lte : todayEnd}, "EmailEngineDataSets.Delivered" : false } }
            ]).allowDiskUse(true);

            console.log("Cron job query returned:", syncedPostsResults.length, "results");

            if (syncedPostsResults.length === 0) {
                console.log("No SyncedPosts to process.");
            }

            for (let loop = 0; loop < syncedPostsResults.length; loop++) {
                var dataRecord = syncedPostsResults[loop];
                console.log("Processing email record:", dataRecord._id, "for recipient:", dataRecord.ReceiverEmails);

                try {
                    var UserData = await User.find({ 'Email': {$in : dataRecord.ReceiverEmails}, Status: 1, IsDeleted : false }, { Name: true, Email : true, UnsubscribedStreams: true });
                    console.log("Found", UserData.length, "users for recipients:", dataRecord.ReceiverEmails);

                    if (UserData.length) {
                        for (var i = 0; i < UserData.length; i++) {
                            var RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
                            var shareWithEmail = UserData[i].Email ? UserData[i].Email : null;
                            var userUnsubscribedStreams = UserData[i].UnsubscribedStreams || [];
                            if (shareWithEmail && (userUnsubscribedStreams.indexOf(String(dataRecord.CapsuleId)) < 0)) {
                                console.log("Attempting to send scheduled email to:", shareWithEmail);
                                try {
                                    await sendSyncEmail_SYNC(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject, EmailBeaconImg);
                                    console.log("Successfully sent email to:", shareWithEmail);

                                    await SyncedPost.updateOne(
                                        {
                                            _id: dataRecord._id,
                                            "EmailEngineDataSets.DateOfDelivery": dataRecord.DateOfDelivery
                                        },
                                        {
                                            $set: {
                                                "EmailEngineDataSets.$.Delivered": true
                                            }
                                        }
                                    );
                                    console.log("Marked as delivered for SyncedPost:", dataRecord._id, "Recipient:", shareWithEmail);
                                } catch (sendError) {
                                    console.error("Failed to send email to", shareWithEmail, "for SyncedPost", dataRecord._id, ":", sendError);
                                }
                            } else {
                                console.log("Skipping email to", shareWithEmail, "- either no email or unsubscribed/deleted for SyncedPost:", dataRecord._id);
                            }
                        }
                    } else {
                        console.log("No active user found for recipients:", dataRecord.ReceiverEmails, "for SyncedPost:", dataRecord._id);
                    }
                } catch (userFindError) {
                    console.error("Error finding users for SyncedPost", dataRecord._id, ":", userFindError);
                }
            }
            console.log("---------------------------------SynedPostEmailCron END----------------------------------------");
        } catch (aggregateError) {
            console.error("SynedPostEmailCron Error during aggregation:", aggregateError);
            console.log("---------------------------------SynedPostEmailCron END WITH ERROR----------------------------------------");
        }
    } catch (cronError) {
        console.error("SynedPostEmailCron CRITICAL Error:", cronError);
        console.log("---------------------------------SynedPostEmailCron END WITH CRITICAL ERROR----------------------------------------");
    }
}

exports.updateMediaCountsPerGt = updateMediaCountsPerGt;

var updateMediaCountsPerGt_API = function (req , res) {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	Media.aggregate([
		{
			$match : {
				UploadedBy : "admin",
				//MediaType : { $in : ['Image'] },
				$or : [
					{MediaType : 'Image'},
					{MediaType : "Link" , LinkType : "image" , IsUnsplashImage : true}
				],
				IsPrivate : 0,
				IsDeleted : 0,
				Status : {$in : [1,2]},
				InAppropFlagCount : {$lt:5},	//Remove content that is flagged 5 times from platform. Do not remove from posts already made using that media.
				MetaMetaTags : { $nin : process.SEARCH_ENGINE_CONFIG.MMT__RemoveFrom__SearchCase }
			}
		},
		{$unwind : "$GroupTags"},
		{$group : {_id:{GroupTagId:"$GroupTags.GroupTagID"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							MediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {MediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}

exports.updateRandomSortIdPerMedia_API = updateRandomSortIdPerMedia_API;

//cron job version to schedule
var updateRandomSortIdPerMedia = function () {
	//console.log("---------------Cron job called successfully : updateMediaCountsPerGt-------------------");
	var find_conditions = {IsDeleted : 0};
	var fields = {
		_id : true,
		Status : true
	};

	Media.find(find_conditions , fields).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];
				var conditions = {
					_id : document._id
				};

				var setObj = {
					RandomSortId: shortid.generate(),
					RandomSortId_UpdatedOn : Date.now()
				};
				// If you were using the MongoDB driver directly, you'd need to do
				// update: { $set: { title: ... } } but mongoose adds $set for
				// you.
				bulkOps.push(
					{
						updateOne : {
							filter: conditions,
							update: setObj
						}
					}
				);

				counter++;

				if ( counter % 1000 == 0 ) {
					Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if ( counter % 1000 != 0 ) {
				Media.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success"});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success"});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}
exports.updateRandomSortIdPerMedia = updateRandomSortIdPerMedia;

var updateAlltagsCollection = function (req , res) {
	GroupTag.aggregate([
		//{ $match : {MediaCount : {$gt : 0}, status : {$in : [1 , 3]}} }, //updated logic after python api - 2021
		{ $match : {status : {$in : [1 , 3]}} },
		{ $unwind: { path: "$Tags", preserveNullAndEmptyArrays: true} },
		{
			$project : {
				_id : "$Tags._id",
				gt_id : "$_id",
				//MainGroupTagTitle : "$GroupTagTitle",
				//GroupTagTitle : "$Tags.TagTitle",
				MainGroupTagTitle : { $toLower: "$GroupTagTitle" },
				GroupTagTitle : { $toLower: "$Tags.TagTitle" },
				status : "$status",
				tagStatus : "$Tags.status",
				MetaMetaTagID : "$MetaMetaTagID",
				MetaTagID : "$MetaTagID",
				DateAdded : "$DateAdded",
				LastModified : "$LastModified",
				Tags : [
					{
						_id : "$Tags._id",
						//TagTitle : "$Tags.TagTitle",
						TagTitle : { $toLower: "$Tags.TagTitle" },
						status : "$Tags.status",
						DateAdded : "$Tags.DateAdded",
						LastModified : "$Tags.LastModified",
					}
				],
				MediaCount : "$MediaCount"
			}
		},
		{ $match : {tagStatus : 1} },
		//{ $sort : {GroupTagTitle : 1} },
		{ $out : "alltags" }
	]).allowDiskUse(true).exec(function(err , result){
		if(!err){
			//res.json({status:200 , message : "Success"});
			//console.log({status:200 , message : "Success"});
		}
		else{
			//res.json({status:0 , message : "Error"});
			//console.log({status:0 , message : "Error"});
		}
	});
}
exports.updateAlltagsCollection = updateAlltagsCollection;

var updateAlltagsCollection_API = function (req , res) {
	GroupTag.aggregate([
		//{ $match : {MediaCount : {$gt : 0}, status : {$in : [1 , 3]}} },	//updated logic after python api - 2021
		{ $match : {status : {$in : [1 , 3]}} },
		{ $unwind: { path: "$Tags", preserveNullAndEmptyArrays: true} },
		{
			$project : {
				_id : "$Tags._id",
				gt_id : "$_id",
				//MainGroupTagTitle : "$GroupTagTitle",
				//GroupTagTitle : "$Tags.TagTitle",
				MainGroupTagTitle : { $toLower: "$GroupTagTitle" },
				GroupTagTitle : { $toLower: "$Tags.TagTitle" },
				status : "$status",
				tagStatus : "$Tags.status",
				MetaMetaTagID : "$MetaMetaTagID",
				MetaTagID : "$MetaTagID",
				DateAdded : "$DateAdded",
				LastModified : "$LastModified",
				Tags : [
					{
						_id : "$Tags._id",
						//TagTitle : "$Tags.TagTitle",
						//TagTitle : { $toLower: { $trim: { input: "$Tags.TagTitle" } } },
						TagTitle : { $toLower: "$Tags.TagTitle" },
						status : "$Tags.status",
						DateAdded : "$Tags.DateAdded",
						LastModified : "$Tags.LastModified",
					}
				],
				MediaCount : "$MediaCount"
			}
		},
		{ $match : {tagStatus : 1} },
		//{ $sort : {GroupTagTitle : 1} },
		{ $out : "alltags" }
	]).allowDiskUse(true).exec(function(err , result){
		if(!err){
			res.json({status:200 , message : "Success"});
		}
		else{
			console.log("err - ", err);
			res.json({status:0 , message : "Error"});
		}
	});
}
exports.updateAlltagsCollection_API = updateAlltagsCollection_API;

//this api will be used to update post count per gt - So that we can fetch the list for Search Media in search gallery...
var updatePostCountsPerGt_API = function (req , res) {

	//console.log("---------------Cron job called successfully : updatePostCountsPerGt-------------------");

	Page.aggregate([
		{
			$match : {
				IsDeleted: false
			}
		},
		{$unwind : "$Medias"},
		{
			$project: {
				_id: "$Medias.MediaID",
				PostId: "$Medias._id",
				UploaderID: "$Medias.PostedBy",
				PostedBy: "$Medias.PostedBy",
				ContentType: "$Medias.ContentType",
				MediaType: "$Medias.MediaType",
				Locator: "$Medias.Locator",
				UploadedOn: "$Medias.PostedOn",
				Title: "$Medias.Title",
				Prompt: "$Medias.Prompt",
				URL: "$Medias.MediaURL",
				thumbnail: "$Medias.thumbnail",
				Content: "$Medias.Content",
				PostStatement: "$Medias.PostStatement",
				PostStatement__real: "$Medias.PostStatement",
				IsOnlyForOwner: "$Medias.IsOnlyForOwner",
				PostPrivacySetting : "$Medias.PostPrivacySetting",
				Themes: "$Medias.Themes",
				IsAdminApproved: "$Medias.IsAdminApproved"
			}
		},
		{
			$match : {
				$or: [
					{ IsAdminApproved: { $exists: false } },
					{ $and : [{IsAdminApproved: { $exists: true }},{IsAdminApproved: true }]}
				],
				MediaType: "Link",
				//IsOnlyForOwner: false
				PostPrivacySetting : {$ne : "OnlyForOwner"}
			}
		},
		{$unwind : "$Themes"},
		{$group : {_id:{GroupTagId:"$Themes.id"},MediaCount:{$sum:1}}},
		{$sort : {MediaCount : -1}},
		//{$out : "mediaCountPerGt"}
	]).allowDiskUse(true).exec(function(err , documents) {
		if(!err) {
			//console.log("---------------Cron job called successfully : updateMediaCountsPerGt : Aggregate SUCCESS -------------------" , documents.length);

			var counter = 0;
			var bulkOps = [];

			var allGtIds = [];

			// representing a long loop
			for ( var loop = 0; loop < documents.length; loop++ ) {
				var document = documents[loop];

				if ( document._id.GroupTagId && typeof(document._id.GroupTagId) != "undefined" ) {
					if ( document._id.GroupTagId != "undefined" ) {
						var tempId = mongoose.Types.ObjectId(document._id.GroupTagId);
						allGtIds.push(tempId);

						var conditions = {
							_id : document._id.GroupTagId
						};

						var setObj = {
							PostMediaCount: document.MediaCount
						};
						// If you were using the MongoDB driver directly, you'd need to do
						// update: { $set: { title: ... } } but mongoose adds $set for
						// you.
						bulkOps.push(
							{
								updateOne : {
									filter: conditions,
									update: setObj
								}
							}
						);
					}
				}

				counter++;

				if ( counter % 1000 == 0 ) {
					GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
						if(!err){
							//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
							//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : result ==========>>>> ",result);
						}
						else{
							//console.log("------------------ERROR : 2 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
							//res.json({status:0 , message : "Error"});
						}
					});
					bulkOps = [];
				}
			}
			//this is to update other's media count to 0.
			if( allGtIds.length > 0 ){
				var conditions = {_id : {$nin : allGtIds} , status : {$in : [1,3]}};
				var setObj = {$set : {PostMediaCount : 0}};
				var options = {multi : true};
				//console.log("conditions ==== ",conditions);
				GroupTag.update(conditions , setObj , options , function (err , numAffected){
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
					console.log("Error : ",err);
					console.log("numAffected : ",numAffected);
					console.log("-----------------------CRON Job API : Updating remaining GTs ---------------------------");
				});
			}

			if ( counter % 1000 != 0 ) {
				GroupTag.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
					if(!err){
						//console.log("------- CRON JOB MODULE -----@@@@@@@@@@@@----updateMediaCountsPerGt : Date = ",Date.now());
						//console.log("-----@@@@@@@@@@@@----updateMediaCountsPerGt : final step result ==========>>>> ",result);
						res.json({status:200 , message : "Success", allGtIds : allGtIds});
					}
					else{
						//console.log("------------------ERROR : 3 ---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
						res.json({status:0 , message : "Error"});
					}
				});
			}
			else{
				res.json({status:200 , message : "Success", allGtIds2 : allGtIds});
			}
		}
		else{
			//console.log("------------------ERROR : 1---------------@@@@@@@@@@@@@@@@@@@@@---------",err);
			res.json({status:0 , message : "Error"});
		}
	})
}

//cron job of InvitationEngine -----


var chapter__sendInvitations = function (ChapterData, invitees, OwnerName, comingBirthDayDate) {

	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL, OwnerName, comingBirthDayDate) {
		var OwnerName = OwnerName ? OwnerName : "ScrptCo";
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}

			var OwnerBirthday_Month = comingBirthDayDate.getMonth();
			var OwnerBirthday_Date = comingBirthDayDate.getDate();
			var monthArr = ['January' , 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var OwnerBirthday = monthArr[OwnerBirthday_Month]+' '+OwnerBirthday_Date;


			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{OwnerBirthday}/g, OwnerBirthday);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + OwnerName + ' has invited you in a chapter to join!';

			var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
			var mailOptions = {
				//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to, // list of receivers
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					// //console.log(error);
				} else {
					console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}

	//make chapter view url
	var condition = {};
	condition = {
		ChapterId: ChapterData._id ? ChapterData._id : 0,
		IsDeleted: 0,
		IsDasheditpage: { $ne: true },
		PageType: { $in: ["gallery", "content"] }
	};


	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		ChapterId: true,
		PageType: true
	};

	var ChapterViewURL = "";

	var invitees = invitees ? invitees : [];
	if (invitees.length) {
		Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
			if (!err) {
				var data = {
					status: 200,
					message: "Pages listing",
					results: results
				}
				//res.json(response);

				if (data.results.length) {
					if (data.results[0].PageType == "content") {
						ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
					} else if (data.results[0].PageType == "gallery") {
						ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
					} else {
						// //console.log("Something went wrong.");
						ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
					}

					ChapterViewURL = process.HOST_URL + '/chapter-introduction/' + condition.ChapterId;

					var conditions = {};
					conditions.name = "Chapter__invitation_BIRTHDAY";

					EmailTemplate.find(conditions, {}, function (err, results) {
						if (!err) {
							if (results.length) {
								for (var loop = 0; loop < invitees.length; loop++) {
									var shareWithEmail = invitees[loop].UserEmail;
									var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

									// //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
									sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL, OwnerName, comingBirthDayDate);

								}
							}
						}
					})
				} else {
					// //console.log("No Page Found...");
				}
			} else {
				// //console.log(err);
			}
		});
	}
};


var owner__sendBirthdayWish = function (ChapterData) {

	function sendBirthdayWishEmail(results, shareWithEmail, ChapterViewURL, OwnerName) {

		var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
		newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
		newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

		var to = shareWithEmail;
		results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
		var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
		subject = subject != '' ? subject : 'Happy Birthday ' + OwnerName;

		var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
		var mailOptions = {
			//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
			from: process.EMAIL_ENGINE.info.senderLine,
			to: to, // list of receivers
			subject: subject,
			html: newHtml
		};

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				// //console.log(error);
			} else {
				console.log('Message sent to: ' + mailOptions.to + info.response);
			}
		});
	}

	//make chapter view url
	var condition = {};
	condition = {
		ChapterId: ChapterData._id ? ChapterData._id : 0,
		IsDeleted: 0,
		IsDasheditpage: { $ne: true },
		PageType: { $in: ["gallery", "content"] }
	};


	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		ChapterId: true,
		PageType: true
	};

	var ChapterViewURL = "";

	Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var data = {
				status: 200,
				message: "Pages listing",
				results: results
			}
			//res.json(response);

			if (data.results.length) {
				if (data.results[0].PageType == "content") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
				} else if (data.results[0].PageType == "gallery") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				} else {
					// //console.log("Something went wrong.");
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				}

				ChapterViewURL = process.HOST_URL + '/chapter-introduction/' + condition.ChapterId + '/own';

				var conditions = {};
				conditions.name = "Wish__BIRTHDAY";

				EmailTemplate.find(conditions, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
							ChapterData.OwnerId.Email = ChapterData.OwnerId.Email ? ChapterData.OwnerId.Email : null;
							var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : null;

							if(ChapterData.OwnerId.Email) {
								var shareWithEmail = ChapterData.OwnerId.Email;

								sendBirthdayWishEmail(results, shareWithEmail, ChapterViewURL, OwnerName);
							}
						}
					}
				})
			} else {
				// //console.log("No Page Found...");
			}
		} else {
			// //console.log(err);
		}
	});
};

var InvitationEngineCron = function(){
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.IsInvitationSent" : 0,
		"LaunchSettings.OwnerBirthday" : {$exists : true},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			results = typeof results === 'object' ? results : [];
			//res.json({results : results});
			var capsuleIds = [];
			var comingBirthDayDate = null;
			for(var loop = 0; loop < results.length; loop++){
				results[loop].LaunchSettings = typeof results[loop].LaunchSettings === 'object' ? results[loop].LaunchSettings : {};
				var a = results[loop].LaunchSettings.OwnerBirthday ? results[loop].LaunchSettings.OwnerBirthday : ""; //"19-9";

				var t = new Date();
				var ty = t.getFullYear();
				var tm = t.getMonth() + 1;
				var td = t.getDate();
				var todayDate = new Date(ty + '-' + tm + '-' + td);

				var today = todayDate.getTime();

				var bdate = new Date();
				var aArr = a.split("-");
				if(aArr.length) {
					bdate.setDate(parseInt(aArr[0]));
					bdate.setMonth(parseInt(aArr[1]) - 1);
					var y = bdate.getFullYear();
					var m = bdate.getMonth() + 1;
					var d = bdate.getDate();
					comingBirthDayDate = new Date(y + '-' + m + '-' + d);
					var birthday = comingBirthDayDate.getTime();

					var after6Weeks = today + (42*24*60*60*1000);

					if(birthday >= today && birthday <=  after6Weeks) {
						//console.log("Your birthday is coming IN next 6 weeks ------ capsuleId = ",results[loop]._id);
						capsuleIds.push(results[loop]._id);

					} else {
						//console.log("Your birthday is coming AFTER 6 weeks ------ capsuleId = ",results[loop]._id);
					}
				}
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').lean().exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}


var InvitationEngineCron__API = function(req , res){
	var conditions = {
		"LaunchSettings.Audience" : "ME",
		"LaunchSettings.CapsuleFor" : "Birthday",
		"LaunchSettings.IsInvitationSent" : 0,
		"LaunchSettings.OwnerBirthday" : {$exists : true},
		IsAllowedForSales : false,
		Origin : "published",
		IsPublished : true,
		IsDeleted : 0
	};
	var fields = {};
	Capsule.find(conditions , fields, function(err , results){
		if(!err) {
			results = typeof results === 'object' ? results : [];
			//res.json({results : results});
			var capsuleIds = [];
			var comingBirthDayDate = null;
			for(var loop = 0; loop < results.length; loop++){
				results[loop].LaunchSettings = typeof results[loop].LaunchSettings === 'object' ? results[loop].LaunchSettings : {};
				var a = results[loop].LaunchSettings.OwnerBirthday ? results[loop].LaunchSettings.OwnerBirthday : ""; //"19-9";

				var t = new Date();
				var ty = t.getFullYear();
				var tm = t.getMonth() + 1;
				var td = t.getDate();
				var todayDate = new Date(ty + '-' + tm + '-' + td);

				var today = todayDate.getTime();

				var bdate = new Date();
				var aArr = a.split("-");
				if(aArr.length) {
					bdate.setDate(aArr[0]);
					bdate.setMonth(aArr[1] - 1);
					var y = bdate.getFullYear();
					var m = bdate.getMonth() + 1;
					var d = bdate.getDate();
					comingBirthDayDate = new Date(y + '-' + m + '-' + d);
					var birthday = comingBirthDayDate.getTime();

					var after6Weeks = today + (42*24*60*60*1000);

					if(birthday >= today && birthday <=  after6Weeks) {
						console.log("Your birthday is coming IN next 6 weeks ------ capsuleId = ",results[loop]._id);
						capsuleIds.push(results[loop]._id);

					} else {
						console.log("Your birthday is coming AFTER 6 weeks ------ capsuleId = ",results[loop]._id);
					}
				}
			}

			if(capsuleIds.length) {
				var conditions = {
					CapsuleId: {
						$in : capsuleIds
					},
					//IsLaunched: 0,				//IsLaunched = true means the batch invitations have been sent.
					Status: 1,
					IsDeleted: 0
				};
				var fields = {};
				Chapter.find(conditions, fields).populate('OwnerId','Email Name').exec(function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < results.length; loop++) {
								var ChapterData = results[loop];
								var __chapterId = ChapterData._id;
								var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
								ChapterData.OwnerId = ChapterData.OwnerId ? ChapterData.OwnerId : {};
								var OwnerName = ChapterData.OwnerId.Name ? ChapterData.OwnerId.Name.split(' ')[0] : "Scrpt";
								chapter__sendInvitations(ChapterData, invitees, OwnerName, comingBirthDayDate);
								Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
									if (!err) {
										console.log("chapter Launched after Invitations.");
									}
								});
							}

							Capsule.update({ _id: capsuleIds }, { $set: { "LaunchSettings.IsInvitationSent": 1, ModifiedOn: Date.now() } }, { multi: true }, function (err, numAffected) {
								if (!err) {
									console.log("Capsule LaunchSettings.IsInvitationSent key updated after Bulk Invitations.");
								}
							});
						}
					}
				});
			}
		}
	});
}


// Email sending helper function
async function sendSyncEmail_SYNC(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject, EmailBeaconImg) {
    const transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
    const to = shareWithEmail;

    newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
    newHtml = newHtml.replace(/{EmailBeaconImg}/g, EmailBeaconImg);
    newHtml = newHtml.replace(/{SubscriberId}/g, CommonAlgo.commonModule.strToCustomHash(to));
    subject = subject.replace(/{RecipientName}/g, RecipientName);
    subject = subject.replace(/{SharedByUserName}/g, SharedByUserName);
    
    const mailOptions = {
        from: process.EMAIL_ENGINE.info.senderLine,
        to: to,
        subject: subject,
        text: process.HOST_URL + '/login',
        html: newHtml
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent to: ' + to + (info.response || ''));
}

//SynedPostEmailCron();
var SynedPostEmailCron = async function () {
    console.log("---------------------------------SynedPostEmailCron START----------------------------------------");
    try {
        const conditions = {
            "IsDeleted": false,
            "Status": true,
            "EmailEngineDataSets.Delivered": false
        };
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        console.log("Cron job looking for emails with DateOfDelivery between:", todayStart, "and", todayEnd);

            const syncedPostsResults = await SyncedPost.aggregate([
                { $match: conditions },
            { $unwind: "$EmailEngineDataSets" },
            {
                $project: {
                    _id: "$_id",
                    CapsuleId: "$CapsuleId",
                    PageId: "$PageId",
                    PostId: "$PostId",
                    PostStatement: "$PostStatement",
                    SyncedBy: "$SyncedBy",
                    ReceiverEmails: "$ReceiverEmails",
                    CreatedOn: "$CreatedOn",
                    Delivered: "$EmailEngineDataSets.Delivered",
                    VisualUrls: "$EmailEngineDataSets.VisualUrls",
                    SoundFileUrl: "$EmailEngineDataSets.SoundFileUrl",
                    TextAboveVisual: "$EmailEngineDataSets.TextAboveVisual",
                    TextBelowVisual: "$EmailEngineDataSets.TextBelowVisual",
                    DateOfDelivery: "$EmailEngineDataSets.DateOfDelivery",
                    BlendMode: "$EmailEngineDataSets.BlendMode",
                    EmailTemplate: "$EmailTemplate",
                    Subject: "$EmailSubject",
                    IsOnetimeStream: "$IsOnetimeStream",
                    IsOnlyPostImage: "$IsOnlyPostImage"
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
                    from: "capsules",
                    localField: "CapsuleId",
                    foreignField: "_id",
                    as: "CapsuleData"
                }
            },
            { $match: { DateOfDelivery: { $gte: todayStart, $lte: todayEnd }, Delivered: false } }
        ]).allowDiskUse(true);
            
            console.log("Cron job query returned:", syncedPostsResults.length, "results");

            if (syncedPostsResults.length === 0) {
                console.log("No SyncedPosts to process.");
            console.log("---------------------------------SynedPostEmailCron END----------------------------------------");
            return;
            }

            for (let loop = 0; loop < syncedPostsResults.length; loop++) {
            const dataRecord = syncedPostsResults[loop];
            
            // Set defaults
            dataRecord.VisualUrls = dataRecord.VisualUrls || [];
            dataRecord.PostStatement = dataRecord.PostStatement || "";
            dataRecord.Subject = dataRecord.Subject || null;
            dataRecord.TextAboveVisual = dataRecord.TextAboveVisual || "";
            dataRecord.TextBelowVisual = dataRecord.TextBelowVisual || "";
            dataRecord.SoundFileUrl = dataRecord.SoundFileUrl || "";
            dataRecord.BlendMode = dataRecord.BlendMode || 'hard-light';
            dataRecord.EmailTemplate = dataRecord.EmailTemplate || 'ImaginativeThinker';
            dataRecord.CapsuleData = Array.isArray(dataRecord.CapsuleData) && dataRecord.CapsuleData.length > 0 ? dataRecord.CapsuleData[0] : {};
            dataRecord.CapsuleData.MetaData = dataRecord.CapsuleData.MetaData || {};
            dataRecord.CapsuleData.MetaData.publisher = dataRecord.CapsuleData.MetaData.publisher || 'The Scrpt Co.';

            if (dataRecord.CapsuleData.IsDeleted) {
                console.log("Skipping deleted capsule for SyncedPost:", dataRecord._id);
                continue;
            }

            // Get blend images
            let PostImage1 = "";
            let PostImage2 = "";

            if (dataRecord.VisualUrls.length == 1) {
                PostImage1 = dataRecord.VisualUrls[0];
                PostImage2 = dataRecord.VisualUrls[0];
            } else if (dataRecord.VisualUrls.length == 2) {
                PostImage1 = dataRecord.VisualUrls[0];
                PostImage2 = dataRecord.VisualUrls[1];
            }

            // Clean PostStatement
            let PostStatement = dataRecord.PostStatement;
            PostStatement = PostStatement.replace(/style=/gi, '');
            PostStatement = PostStatement.replace(/<h[1-6].*?(?=\>)\>/gi, '<span>');
            PostStatement = PostStatement.replace(/<\/h[1-6].*?(?=\>)\>/gi, '</span>');
            PostStatement = PostStatement.replace(/<strong.*?(?=\>)\>/gi, '<span>');
            PostStatement = PostStatement.replace(/<\/strong.*?(?=\>)\>/gi, '</span>');
            PostStatement = PostStatement.replace(/<a.*?(?=\>)\>/gi, '<span>');
            PostStatement = PostStatement.replace(/<\/a.*?(?=\>)\>/gi, '</span>');

            const $ = cheerio.load(PostStatement);
            $('.post-tooltip-box').remove();
            PostStatement = $.html();

            // Get email template
            let templateName = dataRecord.EmailTemplate == 'PracticalThinker' ? "Surprise__Post_2Image" : "Surprise__Post";
            
            // Check for blended image
            const blendImage1 = PostImage1;
            const blendImage2 = PostImage2;
            const blendOption = dataRecord.BlendMode;
            let blendedImage = null;

            if (blendImage1 && blendImage2 && blendOption) {
                const data = blendImage1 + blendImage2 + blendOption;
                const hexcode = crypto.createHash('md5').update(data).digest("hex");
                if (hexcode) {
                    const file_name = hexcode + '.png';
                    const uploadDir = __dirname + '/../../media-assets/streamposts';

                    if (fs.existsSync(uploadDir + "/" + file_name)) {
                        blendedImage = `https://www.scrpt.com/streamposts/${hexcode}.png`;
                        templateName = templateName == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
                    }
                }
            }

            if (!blendedImage && (blendImage1 == blendImage2)) {
                blendedImage = blendImage1.replace('/Media/img/300/', '/Media/img/600/');
                templateName = templateName == "Surprise__Post_2Image" ? "Surprise__Post_2Image_OUTLOOK" : "Surprise__Post_OUTLOOK";
            }

            // Try to find the template, with fallback to base template
            let results = await EmailTemplate.find({ name: templateName }, {});
            
            // Fallback: if template not found, try without _OUTLOOK suffix
            if (!results.length && templateName.includes('_OUTLOOK')) {
                templateName = templateName.replace('_OUTLOOK', '');
                console.log(`⚠️ Template not found, falling back to: ${templateName}`);
                results = await EmailTemplate.find({ name: templateName }, {});
            }
            
            // Fallback: if Surprise__Post_2Image not found, use Surprise__Post
            if (!results.length && templateName.includes('_2Image')) {
                templateName = templateName.replace('_2Image', '');
                console.log(`⚠️ Template not found, falling back to: ${templateName}`);
                results = await EmailTemplate.find({ name: templateName }, {});
            }
            
            if (!results.length) {
                console.log("❌ No email template found for:", templateName, "- skipping SyncedPost:", dataRecord._id);
                continue;
            }
            
            console.log(`✅ Using email template: ${templateName}`);

            // Handle sound file
            if (dataRecord.SoundFileUrl) {
                dataRecord.SoundFileUrl = '<p style="display: block;"><span style="font-size: 18px;"><br></span></p><p style="clear: both;display: block;"><em style="font-size: 18px; background-color: transparent;"><video width="320" height="240" controls><source src="' + dataRecord.SoundFileUrl + '" type="video/mp4">Your browser does not support the video tag.</video></em></p>';
            }

            const SharedByUser = Array.isArray(dataRecord.SharedByUser) && dataRecord.SharedByUser.length > 0 ? dataRecord.SharedByUser[0] : {};
            const SharedByUserName = SharedByUser.Name ? SharedByUser.Name.split(' ')[0] : "";
            const PostURL = "https://www.scrpt.com/streams?pid=" + dataRecord.CapsuleData._id + '__' + dataRecord.PostId + '__' + blendedImage;

            const PostImage1_600 = PostImage1.replace('/Media/img/300/', '/Media/img/600/');
            const PostImage2_600 = PostImage2.replace('/Media/img/300/', '/Media/img/600/');

            let newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
            newHtml = newHtml.replace(/{PostImage1}/g, PostImage1_600);
            newHtml = newHtml.replace(/{PostImage2}/g, PostImage2_600);
            newHtml = newHtml.replace(/{TextAboveVisual}/g, dataRecord.TextAboveVisual);
            newHtml = newHtml.replace(/{TextBelowVisual}/g, dataRecord.TextBelowVisual);
            newHtml = newHtml.replace(/{PostStatement}/g, PostStatement);
            newHtml = newHtml.replace(/{PostURL}/g, PostURL);
            newHtml = newHtml.replace(/{SoundFileUrl}/g, dataRecord.SoundFileUrl);
            newHtml = newHtml.replace(/{BlendMode}/g, dataRecord.BlendMode);
            newHtml = newHtml.replace(/{BlendedImage}/g, blendedImage || '');
            newHtml = newHtml.replace(/{publisher}/g, dataRecord.CapsuleData.MetaData.publisher);

            let subject = dataRecord.Subject || results[0].subject || 'Scrpt - ' + SharedByUserName + ' shared a post with you!';
            const EmailBeaconImg = PostImage1_600 || 'https://www.scrpt.com/assets/Media/img/300/default.png';

            // Find users and send emails
            try {
                const UserData = await User.find({ 
                    'Email': { $in: dataRecord.ReceiverEmails }, 
                    Status: 1, 
                    IsDeleted: false 
                }, { 
                    Name: true, 
                    Email: true, 
                    UnsubscribedStreams: true 
                });

                    if (UserData.length) {
                    for (let i = 0; i < UserData.length; i++) {
                        const RecipientName = UserData[i].Name ? UserData[i].Name.split(' ')[0] : "";
                        const shareWithEmail = UserData[i].Email || null;
                        const userUnsubscribedStreams = UserData[i].UnsubscribedStreams || [];

                            if (shareWithEmail && (userUnsubscribedStreams.indexOf(String(dataRecord.CapsuleId)) < 0)) {
                                console.log("Attempting to send scheduled email to:", shareWithEmail);
                                try {
                                    await sendSyncEmail_SYNC(shareWithEmail, RecipientName, SharedByUserName, newHtml, subject, EmailBeaconImg);
                                    console.log("Successfully sent email to:", shareWithEmail);

                                    await SyncedPost.updateOne(
                                        {
                                            _id: dataRecord._id,
                                            "EmailEngineDataSets.DateOfDelivery": dataRecord.DateOfDelivery
                                        },
                                        {
                                            $set: {
                                                "EmailEngineDataSets.$.Delivered": true
                                            }
                                        }
                                    );
                                console.log("Marked as delivered for SyncedPost:", dataRecord._id);
                                } catch (sendError) {
                                    console.error("Failed to send email to", shareWithEmail, "for SyncedPost", dataRecord._id, ":", sendError);
                                }
                            } else {
                            console.log("Skipping email to", shareWithEmail, "- unsubscribed or no email");
                            }
                        }
                    } else {
                    console.log("No active user found for recipients:", dataRecord.ReceiverEmails);
                    }
                } catch (userFindError) {
                    console.error("Error finding users for SyncedPost", dataRecord._id, ":", userFindError);
                }
            }
            console.log("---------------------------------SynedPostEmailCron END----------------------------------------");
    } catch (cronError) {
        console.error("SynedPostEmailCron CRITICAL Error:", cronError);
        console.log("---------------------------------SynedPostEmailCron END WITH CRITICAL ERROR----------------------------------------");
    }
}

exports.InvitationEngineCron = InvitationEngineCron;
exports.InvitationEngineCron__API = InvitationEngineCron__API;

exports.WishHappyBirthdayCron = WishHappyBirthdayCron; //not in use
exports.WishHappyBirthdayCron__API = WishHappyBirthdayCron__API; //not in use

exports.SynedPostEmailCron = SynedPostEmailCron;

var SynedPostEmailCronApi = function (req, res) {
    console.log("🔔 SynedPostEmailCronApi called via API");
    try {
        // Call the main cron function
        SynedPostEmailCron();
        
        // Return success response
        res.json({
            success: true,
            message: "Email delivery cron job executed successfully",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ SynedPostEmailCronApi error:", error);
        res.json({
            success: false,
            message: "Email delivery cron job failed",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

exports.SynedPostEmailCronApi = SynedPostEmailCronApi;

//stream launch cron jobs
// exports.GroupStreamBirthdayCron__API = GroupStreamBirthdayCron__API; // Function not defined
// exports.GroupStreamBirthdayCron = GroupStreamBirthdayCron; // Function not defined

// exports.GroupStreamTopicCron__API = GroupStreamTopicCron__API; // Function not defined
// exports.GroupStreamTopicCron = GroupStreamTopicCron; // Function not defined
//stream launch cron jobs

// exports.sendLikesBatchNotification = sendLikesBatchNotification; // Function not defined
// exports.sendLikesBatchNotification__API = sendLikesBatchNotification__API; // Function not defined

// exports.launchByIdTopicStream__API = launchByIdTopicStream__API; // Function not defined
// exports.launchByIdBirthdayStream__API = launchByIdBirthdayStream__API; // Function not defined

// exports.PreLaunch_GroupStreamTopicCron__API = PreLaunch_GroupStreamTopicCron__API; // Function not defined
// exports.PreLaunch_GroupStreamTopicCron = PreLaunch_GroupStreamTopicCron; // Function not defined
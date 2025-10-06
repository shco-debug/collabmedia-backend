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
            ]);
            
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
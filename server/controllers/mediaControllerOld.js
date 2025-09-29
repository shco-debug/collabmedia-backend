var media = require('./../models/mediaModel.js');
//var media = require('./../models/mediaM3Model.js');
var massImport = require('./../models/massImportModel.js');
var board = require('./../models/pageModel.js');
var mediaAction = require('../models/mediaActionLogModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var formidable = require('formidable');
var fs = require('fs');
var counters = require('./../models/countersModel.js');

var faultyMediaModel = require('./../models/faultyMediaModel.js');
var flagAsInAppropriate = require('./../models/flagAsInAppropriateModel.js');

var mongoose = require('mongoose');

var async_lib = require('async');

var xlsxj = require("xlsx-to-json");
var ObjectId = mongoose.Types.ObjectId;

const { google } = require('googleapis');
// Google credentials commented out for local development
// // Google credentials commented out for local development
// const creds = require('../../config/google/creds.json');
var Page = require('./../models/pageModel.js');
var PageStream = require('./../models/pageStreamModel.js');
var CommonAlgo = require('./../components/commonAlgorithms.js');

var dateFormat = function () {
	var d = new Date,
		dformat = [(d.getMonth() + 1) > 10 ? (d.getMonth() + 1) : '0' + (d.getMonth() + 1),
		(d.getDate()) > 10 ? d.getDate() : '0' + d.getDate(),
		d.getFullYear()].join('') + '' +
			[d.getHours(),
			d.getMinutes(),
			d.getSeconds()].join('');
	return dformat;
}
// To fetch all domains
// commented by parul
//var findAll = function(req, res){
//    var fields={};
//    if(typeof(req.body.title)!='undefined'){
//	if (req.body.title!="") {
//	    fields['Title']=new RegExp(req.body.title, 'i');
//	}
//	fields['Status']=1;
//    }
//    else{
//	fields['Status']=0;
//    }
//    if(req.body.gt!=null && req.body.gt!=""){
//	fields['GroupTags.GroupTagID']=req.body.gt
//    }
//	//added by parul
//	if(req.body.collection!=null && req.body.collection!=""){
//	fields['Collection.CollectionID']=req.body.collection
//    }
//
//    media.find(fields).sort({UploadedOn: 'desc'}).skip(req.body.offset).limit(req.body.limit).exec(function(err,result){
//
//		if(err){
//			res.json(err);
//		}
//		else{
//			if(result.length==0){
//				res.json({"code":"404","msg":"Not Found",responselength:0})
//			}
//			else{
//				media.find({Status:0}).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){
//					if(err){
//						res.json(err);
//					}
//					else{
//						res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
//
//					}
//				})
//			}
//		}
//	})
//
//};
//
//exports.findAll = findAll;

//added by parul 26 dec 2014

var findAll = function (req, res) {
	var fields = {};
	if (typeof (req.body.title) != 'undefined') {
		if (req.body.title != "") {
			fields['Title'] = new RegExp(req.body.title, 'i');
		}
		fields['Status'] = 1;
	}
	else {
		fields['Status'] = 0;
	}

	if (req.body.gt != null && req.body.gt != "") {
		fields['GroupTags.GroupTagID'] = req.body.gt
	}
	//added by parul
	if (req.body.collection != null && req.body.collection != "") {
		fields['Collection.CollectionID'] = req.body.collection
	}

	media.find(fields).sort({ UploadedOn: 'desc' }).skip(req.body.offset).limit(req.body.limit).exec(function (err, result) {

		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
			}
			else {
				//media.find({Status:0}).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){
				media.find({ Status: 0 }, { _id: 1 }).count().exec(function (err, resultlength) {
					if (err) {
						res.json(err);
					}
					else {
						console.log("yes confirmed return.....");
						//res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });

					}
				})
			}
		}
	})

};

exports.findAll = findAll;



//end
var findAllStatus = function (req, res) {


	fields = {};

	fields['IsDeleted'] = 0;
	if (req.body.domain != null && req.body.domain != "") {
		fields['Domains'] = req.body.domain
	}

	//added by parul 09022015
	if (req.body.Media != null && req.body.locator != "") {
		if (req.body.locator == 'record') {
			fields['Locator'] = { $regex: req.body.Media };
		} else {
			fields['AutoId'] = parseInt(req.body.Media);
		}

	}
	//added by parul 09012015
	//if(req.body.status!=null && req.body.status!=""){
	//	if(req.body.status==0){
	//		fields['Status']={'$ne':2};
	//	}else{
	//		fields['Status']=req.body.status;
	//	}
	//
	//}
	//fields['IsPrivate']={$exists:false,$ne:1};
	fields['$or'] = [{ IsPrivate: { '$exists': false } }, { IsPrivate: { $exists: true, $ne: 1 } }];

	if (req.body.status != null && req.body.status != "") {
		fields['Status'] = req.body.status
	} else {
		fields['Status'] = { '$nin': [2, 3] };
	}
	//end of 09012015
	if (req.body.source != null && req.body.source != "") {
		fields['SourceUniqueID'] = req.body.source
	}

	//if(req.body.collection!=null && req.body.collection!=""){
	//	fields['Collection']=req.body.collection
	//}commented by parul
	if (req.body.gt != null && req.body.gt != "") {
		//fields.GroupTags=[];
		fields['GroupTags.GroupTagID'] = req.body.gt
	}
	//added by parul 26 dec 2014
	if (req.body.collection != null && req.body.collection != "") {
		//fields.GroupTags=[];
		fields['Collection'] = { $in: [req.body.collection] };
	}
	if (req.body.mmt != null && req.body.mmt != "") {
		fields['MetaMetaTags'] = req.body.mmt
	}
	if (req.body.mt != null && req.body.mt != "") {
		fields['MetaTags'] = req.body.mt
	}
	if (req.body.whereAdded) {
		fields['AddedWhere'] = req.body.whereAdded
	}
	if (req.body.tagtype) {
		fields['TagType'] = req.body.tagtype
	}
	if (req.body.howAdded) {
		fields['AddedHow'] = req.body.howAdded
	}
	if (req.body.mediaType) {

		if (req.body.mediaType == 'Image') {
			fields['$or'] = [{ "MediaType": 'Image' }, { "MediaType": 'Link', "LinkType": 'image' }];
		}
		else if (req.body.mediaType == 'Link') {
			fields['MediaType'] = req.body.mediaType;
			fields['LinkType'] = { $ne: 'image' };
		}
		else {
			fields['MediaType'] = req.body.mediaType;
		}

	}
	if (req.body.dtEnd != null && req.body.dtStart != null) {
		var end = req.body.dtEnd;
		var start = req.body.dtStart;
		var end_dt = end.split('/');
		var start_dt = start.split('/');
		start_dt[0] = start_dt[0] - 1;
		end_dt[0] = end_dt[0] - 1;

		console.log(start_dt);
		console.log(end_dt);

		var start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
		var end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

		fields['UploadedOn'] = { $lte: end_date, $gte: start_date }
	}

	//fields['Status']={'$ne':2}; //commented and moved to else condition of status by parul 09012015
	/*if(req.body.gt!=null && req.body.gt!=""){
		fields.GroupTags=[];
		fields.GroupTags.GroupTagID=req.body.gt
	}*/

	console.log(fields);//return;

	media.find(fields).sort({ UploadedOn: 'desc' }).skip(req.body.offset).limit(req.body.limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			media.find(fields, { _id: 1 }).count().exec(function (err, resultlength) {
				if (err) {
					res.json(err);
				}
				else {
					if (resultlength > 0) {
						//res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });
					}
					else {
						res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
					}
				}
			})
		}
	})
};

exports.findAllStatus = findAllStatus;

/*
var edit = function(req,res){

	var fields={
		SourceUniqueID:req.body.source,
		GroupTags:[],
		Collection:[],
		Domains:req.body.domain,
		Status:1,
		MetaMetaTags:req.body.mmt,
		MetaTags:req.body.mt,
		TagType:req.body.tagtype
	};
	for(k in req.body.gt){
		fields.GroupTags.push({
			GroupTagID:req.body.gt[k]
		})
	}
	//added by parul 26 dec 2014
	for(j in req.body.collection){
		fields.Collection.push({
			CollectionID:req.body.collection[j]
		})
	}
	for(i in req.body.media){
		var query={_id:req.body.media[i]['id']};
		var options={};
		fields.Title=req.body.media[i]['title'];
		fields.Prompt=req.body.media[i]['prompt'];
		fields.Locator=req.body.media[i]['locator'];
		media.update(query, { $set: fields}, options, callback)
	}

	var counter=0;
	function callback (err, numAffected) {
		counter++;
		if(counter==req.body.media.length){
			findAll(req,res)
		}

	}
};
*/


var edit = function (req, res) {

	var fields = {
		//SourceUniqueID:req.body.source,
		SourceUniqueID: "53ceb0263aceabbe5d573db9",
		GroupTags: [],
		Collection: [],
		Domains: req.body.domain,
		Status: 1,
		MetaMetaTags: req.body.mmt,
		MetaTags: req.body.mt,
		TagType: req.body.tagtype
	};
	for (k in req.body.gt) {
		fields.GroupTags.push({
			GroupTagID: req.body.gt[k]
		})
	}
	//added by parul 26 dec 2014
	for (j in req.body.collection) {
		fields.Collection.push(
			req.body.collection[j]
		)
	}


	for (i in req.body.media) {
		var query = { _id: req.body.media[i]['id'] };
		console.log("query = ", query);
		var options = {};
		fields.Title = req.body.media[i]['title'];
		fields.Prompt = req.body.media[i]['prompt'];
		fields.Photographer = req.body.media[i]['Photographer'];
		console.log("fields = ", fields);//return;
		media.update(query, { $set: fields }, options, callback)
	}

	var counter = 0;
	function callback(err, numAffected) {
		counter++;
		if (counter == req.body.media.length) {
			findAll(req, res)
		}

	}
};

exports.edit = edit;

/*
var editAll = function(req,res){

	var fields={
		SourceUniqueID:req.body.source,
		GroupTags:[],
		Collection:[],
		Domains:req.body.domain,
		Status:1,
		MetaMetaTags:req.body.mmt,
		MetaTags:req.body.mt,
		TagType:req.body.tagtype
	};
	console.log(fields);

	for(k in req.body.gt){
		fields.GroupTags.push({
			GroupTagID:req.body.gt[k]
		})
	}
	//added by parul 26 dec
	for(j in req.body.collection){
		fields.Collection.push(
			req.body.collection[j]
		)
	}
	for(i in req.body.media){
		var query={_id:req.body.media[i]['id']};
		var options={};
		fields.Title=req.body.media[i]['title'];
		fields.Prompt=req.body.media[i]['prompt'];
		fields.Locator=req.body.media[i]['locator'];
		media.update(query, { $set: fields}, options, callback)
	}
	var counter=0;
	function callback (err, numAffected) {
		counter++;
		if(counter==req.body.media.length){
			findAllStatus(req,res)
		}

	}
};
*/
// static source to Platform in case of admin upload on 07012015 by manishp
var editAll_oldversion = function (req, res) {

	var fields = {
		//SourceUniqueID:req.body.source,
		SourceUniqueID: "53ceb0263aceabbe5d573db9",
		GroupTags: [],
		Collection: [],
		Domains: req.body.domain,
		Status: 1,
		MetaMetaTags: req.body.mmt,
		MetaTags: req.body.mt,
		TagType: req.body.tagtype
	};
	console.log(fields);

	for (k in req.body.gt) {
		fields.GroupTags.push({
			GroupTagID: req.body.gt[k]
		})
	}
	//added by parul 26 dec
	for (j in req.body.collection) {
		fields.Collection.push(
			req.body.collection[j]
		)
	}
	//var counter=0;
	//for(i in req.body.media){
	//	var query={_id:req.body.media[i]['id']};
	//	var options={};
	//	fields.Title=req.body.media[i]['title'];
	//	fields.Prompt=req.body.media[i]['prompt'];
	//	fields.Photographer=req.body.media[i]['Photographer'];
	//	media.update(query, { $set: fields}, options, callback)
	//	function callback (err, numAffected) {
	//		counter++;
	//		if(counter==req.body.media.length){
	//			//addTag(req,res);   //--now not in use
	//			addGT(req,res);
	//			findAllStatus(req,res)
	//		}
	//
	//	}
	//}
	// added by arun
	var counter = 0;
	for (i in req.body.media) {
		var query = { _id: req.body.media[i]['id'] };
		console.log("Iteration", i);
		console.log("Query Param", query);
		var options = {};
		fields.Title = req.body.media[i]['title'];
		fields.Prompt = req.body.media[i]['prompt'];
		fields.Photographer = req.body.media[i]['Photographer'];
		console.log("Media To update", fields)
		console.log("=========================");

		if (req.body.media.length > counter) {
			counter++;
			console.log("====Called", counter);
			addGT(req, res, i);
		}
		media.update(query, { $set: fields }, options, function (err, numAffected) {

		});
	}
	findAllStatus(req, res);

};

//updating with pricess.forEach with synced flow
var editAll = function (req, res) {
	var fields = {
		//SourceUniqueID:req.body.source,
		SourceUniqueID: "53ceb0263aceabbe5d573db9",
		GroupTags: [],
		Collection: [],
		Domains: req.body.domain,
		Status: 1,
		MetaMetaTags: req.body.mmt,
		MetaTags: req.body.mt,
		TagType: req.body.tagtype
	};
	console.log(fields);

	for (var k = 0; k < req.body.gt.length; k++) {
		fields.GroupTags.push({
			GroupTagID: req.body.gt[k]
		})
	}
	//added by parul 26 dec
	for (var j = 0; j < req.body.collection.length; j++) {
		fields.Collection.push(
			req.body.collection[j]
		)
	}
	// added by arun
	var counter = 0;
	//for(i in req.body.media){
	req.body.media = typeof (req.body.media) == 'object' ? req.body.media : [];
	async_lib.eachSeries(req.body.media, function (mediaObj, callback) {
		//console.log(i);
		var prompt = mediaObj.prompt ? mediaObj.prompt : '';
		var mediaID = mediaObj.id ? mediaObj.id : '';

		var query = { _id: mediaID };
		//console.log("Iteration",i);
		console.log("Query Param", query);
		var options = {};
		fields.Title = mediaObj.title ? mediaObj.title : '';
		fields.Prompt = prompt;
		fields.Photographer = mediaObj.Photographer ? mediaObj.Photographer : '';
		console.log("Media To update", fields)
		console.log("=========================");

		if (req.body.media.length > counter) {
			counter++;
			console.log("====Called", counter);
			//addGT(req,res,i);
			addGT(prompt, mediaID);
		}
		media.update(query, { $set: fields }, options, function (err, numAffected) {

		});
		callback(); // Alternatively: callback(new Error());
	}, function (err) {
		if (err) { throw err; }
		else {
			console.log('Well done :-)!');
			findAllStatus(req, res);
		}
	});
	//findAllStatus(req,res);
};

exports.editAll = editAll;


var editTags = function (req, res) {

	var fields = {
		Title: req.body.title,
		Prompt: req.body.prompt,
		Photographer: req.body.Photographer
	};

	for (i in req.body.media) {
		var query = { _id: req.body.media[i]['id'] };

		fields.Title = req.body.media[i]['title'];
		fields.Prompt = req.body.media[i]['prompt'];
		fields.Photographer = req.body.media[i]['Photographer'];

		media.update(query, { $set: fields }, options, callback)
	}
	var counter = 0;
	function callback(err, numAffected) {
		counter++;
		if (counter == req.body.media.length) {
			findAll(req, res)
		}

	}
};

exports.editTags = editTags;

//function added by parul to manage user tags to use when we add tagging functionality to media
function defaultPrivateCase__Checker(mediaObj) {
	var returnFlag = false;
	var mediaType = mediaObj.MediaType;

	switch (mediaType) {
		case "Image":
			if (mediaObj.UploadedBy == 'user') {
				returnFlag = true;
			}
			break;
		case "Video":
			if (mediaObj.UploadedBy == 'user' && mediaObj.AddedHow == 'recording') {
				returnFlag = true;
			}
			break;
		case "Audio":
			if (mediaObj.UploadedBy == 'user' && mediaObj.AddedHow == 'recording') {
				returnFlag = true;
			}
			break;
		case "Notes":
			returnFlag = true;
			break;
		case "Link":
			returnFlag = false;
			break;
	}
	return returnFlag;
}


var addTagsToUploadedMedia = function (req, res) {
	media.find({ _id: req.body.MediaID }, function (err, data) {
		if (!err && data.length > 0) {
			console.log('add--tags to uploaded media--');
			var fields = {
				//SourceUniqueID:null,
				GroupTags: data[0].GroupTags.length == 0 ? [] : data[0].GroupTags,
				//Collection:null,
				//Domains:null,
				//Status:1,
				Status: 3,
				// edited on 03 april 2015 by parul
				//to refrain media to appear in search media listing
				MetaMetaTags: req.body.mmt,
				IsPrivate: req.body.isPrivate ? req.body.isPrivate : 0,//added by parul 05022015
				MetaTags: null,
				TagType: null,
				Posts: {},
				ViewsCount: 1
			};

			//default private logic
			fields.IsPrivate = defaultPrivateCase__Checker(data[0]);
			//default private logic

			fields.Posts.Users = [];

			//fields.Posts.Users.push({UserFSGs:req.session.user.FSGs});
			fields.Posts.Users.push({ UserFSGs: req.session.user.FSGsArr2 });
			if (req.body.gt) {
				//fields.GroupTags=[];
				fields.GroupTags.push({
					GroupTagID: req.body.gt
				})
			}


			//fields.Title=null;	//by manishp on 17042015
			//fields.Prompt=null;	//by manishp on 17042015
			fields.Photographer = null;
			req.body.id = req.body.MediaID;
			var query = { _id: req.body.MediaID };
			var options = { multi: false };



			// media.update(query, { $set: fields}, options, callback)
			// if (req.body.data.MediaType == "Montage" || req.body.data.MediaType == "Video") {
			if (req.body.data.MediaType == "Montage") {
				//addMediaToBoard(req,res);
				fields.Status = 1;
				media.update(query, { $set: fields }, options, callback)
			}
			else {
				media.update(query, { $set: fields }, options, callback)
			}

			if (req.body.Tags) {
				addTags_toGT(req.body.MediaID, req.body.Tags)
			}

			var counter = 0;
			function callback(err, numAffected) {
				if (err) {
					console.log("-------------------------------------WRONG HERE----------------", err);
				}
				//addMediaToBoard(req,res);
				//above code commented and below code added by parul on 03 april 2015
				//Now media will only be added to board when user posts it to board
				media.find(query, { Posts: false, Stamps: false, Marks: false }, function (err, data) {
					if (err) {
						res.json(err);
					}
					else {
						if (req.body.data.MediaType == 'Montage') {
							//added by manishp on 27042015
							media.findById(req.body.MediaID, { OwnStatement: 1, Content: 1, IsPrivate: 1 }, function (error, m) {
								if (error) {
									console.log(error);
								}
								else {
									console.log('---- in else ---');
									req.body.Statement = m.OwnStatement ? m.OwnStatement : "";

									if (req.body.PostId) {
										updateMediaToBoard(req, res);
									}
									else {
										addMediaToBoard(req, res);
									}

									if (!m.IsPrivate) {	//this will ensure if montage is not private then validate the containing medias...
										__updateMontagePrivacy(req.body.MediaID, m.Content);	//this will fix montage privacy....like server side validation.
									}
								}
							});
							//addMediaToBoard(req,res);
						} else {
							res.json({ "code": "200", "message": "success", "response": data });
						}
					}
				})
			}
		}
	})
};

//function added by parul to manage user tags to use when we add tagging functionality to media
var addTagsToUploadedMedia_M_7 = function (req, res) {

	var fields = {
		GroupTags: [],
		Status: 3,
		MetaMetaTags: req.body.mmt,
		IsPrivate: req.body.isPrivate, //added by parul 05022015
		MetaTags: null,
		TagType: null,
		Posts: {},
		ViewsCount: 1
	};

	//Add user preferences object under post/repost array : For Search Engine Algorithm Processing
	fields.Posts.Users = [];
	fields.Posts.Users.push({ UserFSGs: req.session.user.FSGsArr2 });


	//There may be no grouptag/theme/keyword or there may be one keyword.
	if (req.body.gt) {
		fields.GroupTags.push({
			GroupTagID: req.body.gt
		})
	}

	fields.Photographer = null;
	req.body.id = req.body.MediaID;

	var query = { _id: req.body.MediaID };
	var options = {};

	//This is for user suggested tags (alias of the keyword), if any : there may be multiple
	//A tag can belongs to multiple keywords
	//In front end, we have to provide auto-complete list of the tags of current keyword. or
	//all unique tags list if no keyword is selected - need to map those tags under NO_THEME grouptag
	//that will be custom for implementing logic for CRUD on related places later

	if (req.body.Tags) {
		//req.body.Tags = req.body.Tags.trim();
		var tags = typeof (req.body.Tags) == 'string' ? req.body.Tags.trim() : '';
		var tagsArr = [];

		tagsArr = tags.split(',');

		//check if NO_THEME Case
		if (req.body.gt) {
			groupTags.find({ _id: req.body.gt }, function (err, result) {
				console.log(result);
				if (!err) {
					var resultFinal = false;

					//Remove this loop apply mongodb's sub-document query.
					for (x in result[0].Tags) {
						if (result[0].Tags[x].TagTitle == req.body.Tags) {
							resultFinal = true;
							var tagID = result[0].Tags[x]._id;
							break;
						}
					}

					if (!resultFinal) {
						groupTags.findOne({ _id: req.body.gt }, function (err, result) {
							var gt = result;
							gt.Tags.push({
								TagTitle: req.body.Tags,
								status: 2
							});

							gt.save(function (err) {
								if (err) {
									res.json(err);
								}
								else { }
							});
						})
					}
					else {
						//fields.Tags={TagId:tagID,TagTitle:req.body.Tags};
					}
				}
				else { res.json(err); }
			})
		}
		else {

		}
	}


	// media.update(query, { $set: fields}, options, callback)
	// if (req.body.data.MediaType == "Montage" || req.body.data.MediaType == "Video") {
	if (req.body.data.MediaType == "Montage") {
		//addMediaToBoard(req,res);
		fields.Status = 1;
		media.update(query, { $set: fields }, options, callback)
	}
	else {
		media.update(query, { $set: fields }, options, callback)
	}
	var counter = 0;
	function callback(err, numAffected) {
		//addMediaToBoard(req,res);
		//above code commented and below code added by parul on 03 april 2015
		//Now media will only be added to board when user posts it to board
		media.find(query, function (err, data) {
			if (err) {
				res.json(err);
			}
			else {
				if (req.body.data.MediaType == 'Montage') {
					//added by manishp on 27042015
					media.findById(req.body.MediaID, { OwnStatement: 1 }, function (error, m) {
						if (error) {
							console.log(error);
						}
						else {
							req.body.Statement = m.OwnStatement ? m.OwnStatement : "";
							addMediaToBoard_M_7(req, res);
						}
					});
					//addMediaToBoard(req,res);
				} else {
					res.json({ "code": "200", "message": "success", "response": data });
				}
			}
		})
	}
};


exports.addTagsToUploadedMedia = addTagsToUploadedMedia;
//end

var addMediaToBoard = function (req, res) {
	console.log('addMediaToBoard');
	fields = {
		Medias: []
	};

	board.find({ _id: req.body.board }, function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found" })
			}
			else {

				//added by manishp on 22122014-Montage case
				var thumbnail = '';
				if (req.body.data.thumbnail) {
					thumbnail = req.body.data.thumbnail;
					console.log("if -----------------------thumbnail = ", thumbnail);
				}
				else {
					console.log("else thumbnail = ");
				}

				//end

				if (req.body.gt == "" || typeof (req.body.gt) == 'undefined') {
					console.log("if (req.body.gt== check");//return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					gtfields = {
						GroupTagTitle: req.body.gtsa,
						Notes: "",
						DateAdded: Date.now(),
						MetaMetaTagID: null,
						MetaTagID: null,
						status: 2
					};

					groupTags(gtfields).save(function (err, data) {
						if (err) {
							res.json(err);
						}
						else {
							if (result[0].Themes == null) {
								fields.Themes = [];
							}
							else {
								fields.Themes = result[0].Themes;
							}

							fields.Themes.push({
								ThemeID: data.id,
								ThemeTitle: req.body.gtsa,
								SuggestedBy: req.session.user._id,
								SuggestedOn: Date.now(),
								isApproved: 0
							});

							if (req.body.data.Content) {
								fields.Medias.push({
									MediaID: req.body.id,
									MediaURL: req.body.data.Location[0].URL,
									MediaTitle: null,
									PostedBy: req.session.user._id,
									PostedOn: Date.now(),
									Content: req.body.data.Content,
									ThemeID: data.id,
									ThemeTitle: req.body.gtsa,
									ContentType: req.body.data.ContentType,
									Votes: [],
									Marks: [],
									thumbnail: thumbnail, //added by manishp on 22122014- montage case
									PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									Themes: req.body.Themes ? req.body.Themes : [],
									IsOnlyForOwner: req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
									PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
									IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
									TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : [],
									IsAddedFromStream: req.body.IsAddedFromStream ? req.body.IsAddedFromStream : false,
									StreamId: req.body.StreamId ? mongoose.Types.ObjectId(req.body.StreamId) : null,
									IsPostForUser: req.body.IsPostForUser ? req.body.IsPostForUser : false,
									IsPostForTeam: req.body.IsPostForTeam ? req.body.IsPostForTeam : false,
									QuestionPostId: req.body.QuestionPostId ? mongoose.Types.ObjectId(req.body.QuestionPostId) : null,
									PostType: req.body.QuestionPostId ? 'AnswerPost' : null
								});
							} else {
								fields.Medias.push({
									MediaID: req.body.id,
									MediaURL: req.body.data.Location[0].URL,
									MediaTitle: null,
									PostedBy: req.session.user._id,
									PostedOn: Date.now(),
									ThemeID: data.id,
									ThemeTitle: req.body.gtsa,
									ContentType: req.body.data.ContentType,
									Votes: [],
									Marks: [],
									thumbnail: thumbnail, //added by manishp on 22122014- montage case
									PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									Themes: req.body.Themes ? req.body.Themes : [],
									IsOnlyForOwner: req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
									PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
									IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
									TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : [],
									IsAddedFromStream: req.body.IsAddedFromStream ? req.body.IsAddedFromStream : false,
									StreamId: req.body.StreamId ? mongoose.Types.ObjectId(req.body.StreamId) : null,
									IsPostForUser: req.body.IsPostForUser ? req.body.IsPostForUser : false,
									IsPostForTeam: req.body.IsPostForTeam ? req.body.IsPostForTeam : false,
									QuestionPostId: req.body.QuestionPostId ? mongoose.Types.ObjectId(req.body.QuestionPostId) : null,
									PostType: req.body.QuestionPostId ? 'AnswerPost' : null
								});
							}

							var query = { _id: req.body.board };
							var options = { multi: true };

							board.update(query, { $set: fields }, options, callback);
						}
					});
				} else {
					console.log("else (req.body.gt== check thumbnail = ", thumbnail);//return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					var flag = 0;
					for (as in result[0].Themes) {
						if (result[0].Themes[as].ThemeID == req.body.gt) {
							flag = 1;
						}
					}

					if (flag == 0) {
						fields.Themes = [];
						if (result[0].Themes == null) {
							fields.Themes = [];
						}
						else {
							fields.Themes = result[0].Themes;
						}
						fields.Themes.push({
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							SuggestedBy: req.session.user._id,
							SuggestedOn: Date.now(),
							isApproved: 1
						});
					}
					if (req.body.data.Content) {
						console.log("else (req.body.gt== check-222222 thumbnail = ", thumbnail);//return false;
						/*
						fields.Medias.push({
							MediaID:req.body.id,
							MediaURL:req.body.data.Location[0].URL,
							Title:null,
							Prompt:null,
							Locator:null,
							PostedBy:req.session.user._id,
							PostedOn:Date.now(),
							ThemeID:req.body.gt,
							ThemeTitle:req.body.gtsa,
							MediaType:req.body.data.MediaType,
							ContentType:req.body.data.ContentType,
							Votes:[],
							Marks:[],
							OwnerId:req.body.owner,
							Content:req.body.data.Content,
							thumbnail:thumbnail
						});
						*/
						//added by manishp on 22122014- montage case
						var obj = {
							MediaID: req.body.id,
							MediaURL: req.body.data.Location[0].URL,
							Title: null,
							Prompt: null,
							Photographer: null,
							PostedBy: req.session.user._id,
							PostedOn: Date.now(),
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							MediaType: req.body.data.MediaType,
							ContentType: req.body.data.ContentType,
							Votes: [],
							Marks: [],
							OwnerId: req.body.owner,
							Content: req.body.data.Content,
							thumbnail: thumbnail,
							PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							IsOnlyForOwner: req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
							PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
							IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
							TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : [],
							IsAddedFromStream: req.body.IsAddedFromStream ? req.body.IsAddedFromStream : false,
							StreamId: req.body.StreamId ? mongoose.Types.ObjectId(req.body.StreamId) : null,
							IsPostForUser: req.body.IsPostForUser ? req.body.IsPostForUser : false,
							IsPostForTeam: req.body.IsPostForTeam ? req.body.IsPostForTeam : false,
							QuestionPostId: req.body.QuestionPostId ? mongoose.Types.ObjectId(req.body.QuestionPostId) : null,
							PostType: req.body.QuestionPostId ? 'AnswerPost' : null
						};

						fields.Medias.push(obj);

						//console.log("fields.Medias = ",fields.Medias);
						//console.log("fields.Medias object = ",obj);return false;
					}
					else {
						console.log("else (req.body.gt== check-3333333");//return false;
						fields.Medias.push({
							MediaID: req.body.id,
							MediaURL: req.body.data.Location[0].URL,
							Title: null,
							Prompt: null,
							Photographer: null,
							PostedBy: req.session.user._id,
							PostedOn: Date.now(),
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							MediaType: req.body.data.MediaType,
							ContentType: req.body.data.ContentType,
							Votes: [],
							Marks: [],
							OwnerId: req.body.owner,
							thumbnail: thumbnail, //added by manishp on 22122014- montage case
							PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							Themes: req.body.Themes ? req.body.Themes : [],
							IsOnlyForOwner: req.body.IsOnlyForOwner ? req.body.IsOnlyForOwner : false,
							PostPrivacySetting:req.body.PostPrivacySetting ? req.body.PostPrivacySetting : "PublicWithoutName",
							IsUnsplashImage : req.body.IsUnsplashImage ? req.body.IsUnsplashImage : false,
							TaggedUsers : req.body.TaggedUsers ? req.body.TaggedUsers : [],
							IsAddedFromStream: req.body.IsAddedFromStream ? req.body.IsAddedFromStream : false,
							StreamId: req.body.StreamId ? mongoose.Types.ObjectId(req.body.StreamId) : null,
							IsPostForUser: req.body.IsPostForUser ? req.body.IsPostForUser : false,
							IsPostForTeam: req.body.IsPostForTeam ? req.body.IsPostForTeam : false,
							QuestionPostId: req.body.QuestionPostId ? mongoose.Types.ObjectId(req.body.QuestionPostId) : null,
							PostType: req.body.QuestionPostId ? 'AnswerPost' : null
						});
					}
					var query = { _id: req.body.board };
					var options = { multi: true };
					//console.log("fields = ",fields);return false;
					board.update(query, { $set: fields }, options, callback);
				}
			}
		}

	}).populate('Domain Collection ProjectID');

	function callback(err, numAffected) {
		if (err) {
			res.json(err)
		}
		else {
			postMedia(req, res);
		}
	}
}

//update montage post case... added on 22 sep 2017 by manishp
var updateMediaToBoard = function (req, res) {				//this is created from copy of addMediaToBoard just above
	console.log('-----updateMediaToBoard');
	fields = {
		Medias: []
	};

	board.find({ _id: req.body.board }, function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found" })
			}
			else {
				var setObj = {};

				//added by manishp on 22122014-Montage case
				var thumbnail = '';
				if (req.body.data.thumbnail) {
					thumbnail = req.body.data.thumbnail;
					//console.log("if -----------------------thumbnail = ", thumbnail);
				}
				else {
					//console.log("else thumbnail = ");
				}
				//end

				if (req.body.gt == "" || typeof (req.body.gt) == 'undefined') {
					//console.log("if (req.body.gt== check");//return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					gtfields = {
						GroupTagTitle: req.body.gtsa.trim(),
						Notes: "",
						DateAdded: Date.now(),
						MetaMetaTagID: null,
						MetaTagID: null,
						status: 2
					};

					groupTags(gtfields).save(function (err, data) {
						if (err) {
							res.json(err);
						}
						else {
							if (result[0].Themes == null) {
								fields.Themes = [];
							}
							else {
								fields.Themes = result[0].Themes;
							}

							fields.Themes.push({
								ThemeID: data.id,
								ThemeTitle: req.body.gtsa,
								SuggestedBy: req.session.user._id,
								SuggestedOn: Date.now(),
								isApproved: 0
							});


							if (req.body.data.Content) {
								setObj = {
									"Medias.$.MediaID": req.body.id,
									"Medias.$.MediaURL": req.body.data.Location[0].URL,
									"Medias.$.MediaTitle": null,
									"Medias.$.Content": req.body.data.Content,
									"Medias.$.ThemeID": data.id,
									"Medias.$.ThemeTitle": req.body.gtsa,
									"Medias.$.ContentType": req.body.data.ContentType,
									"Medias.$.thumbnail": thumbnail, //added by manishp on 22122014- montage case
									"Medias.$.PostStatement": req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									"Medias.$.Themes": req.body.Themes ? req.body.Themes : []
								};
							} else {
								setObj = {
									"Medias.$.MediaID": req.body.id,
									"Medias.$.MediaURL": req.body.data.Location[0].URL,
									"Medias.$.MediaTitle": null,
									"Medias.$.ThemeID": data.id,
									"Medias.$.ThemeTitle": req.body.gtsa,
									"Medias.$.ContentType": req.body.data.ContentType,
									"Medias.$.thumbnail": thumbnail, //added by manishp on 22122014- montage case
									"Medias.$.PostStatement": req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									"Medias.$.Themes": req.body.Themes ? req.body.Themes : []
								};
							}

							var query = {
								"_id": req.body.board,
								"Medias._id": req.body.PostId
							};
							var options = { multi: false };
							board.update(query, { $set: setObj }, options, callback);
						}
					});
				} else {
					//console.log("else (req.body.gt== check thumbnail = ", thumbnail);//return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					var flag = 0;
					for (as in result[0].Themes) {
						if (result[0].Themes[as].ThemeID == req.body.gt) {
							flag = 1;
						}
					}

					if (flag == 0) {
						fields.Themes = [];
						if (result[0].Themes == null) {
							fields.Themes = [];
						}
						else {
							fields.Themes = result[0].Themes;
						}
						fields.Themes.push({
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							SuggestedBy: req.session.user._id,
							SuggestedOn: Date.now(),
							isApproved: 1
						});
					}
					if (req.body.data.Content) {
						//console.log("else (req.body.gt== check-222222 thumbnail = ", thumbnail);//return false;
						//added by manishp on 22122014- montage case
						setObj = {
							"Medias.$.MediaID": req.body.id,
							"Medias.$.MediaURL": req.body.data.Location[0].URL,
							"Medias.$.Title": null,
							"Medias.$.Prompt": null,
							"Medias.$.Photographer": null,
							"Medias.$.ThemeID": req.body.gt,
							"Medias.$.ThemeTitle": req.body.gtsa,
							"Medias.$.MediaType": req.body.data.MediaType,
							"Medias.$.ContentType": req.body.data.ContentType,
							"Medias.$.OwnerId": req.body.owner,
							"Medias.$.Content": req.body.data.Content,
							"Medias.$.thumbnail": thumbnail,
							"Medias.$.PostStatement": req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							"Medias.$.Themes": req.body.Themes ? req.body.Themes : []
						};

						//fields.Medias.push(setObj);

						//console.log("fields.Medias = ",fields.Medias);
						//console.log("fields.Medias object = ",obj);return false;
					}
					else {
						//console.log("else (req.body.gt== check-3333333");//return false;
						setObj = {
							"Medias.$.MediaID": req.body.id,
							"Medias.$.MediaURL": req.body.data.Location[0].URL,
							"Medias.$.Title": null,
							"Medias.$.Prompt": null,
							"Medias.$.Photographer": null,
							"Medias.$.ThemeID": req.body.gt,
							"Medias.$.ThemeTitle": req.body.gtsa,
							"Medias.$.MediaType": req.body.data.MediaType,
							"Medias.$.ContentType": req.body.data.ContentType,
							"Medias.$.OwnerId": req.body.owner,
							"Medias.$.thumbnail": thumbnail, //added by manishp on 22122014- montage case
							"Medias.$.PostStatement": req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							"Medias.$.Themes": req.body.Themes ? req.body.Themes : []
						};
					}
					var query = {
						"_id": req.body.board,
						"Medias._id": req.body.PostId
					};
					var options = { multi: false };
					board.update(query, { $set: setObj }, options, callback);
				}
			}
		}

	}).populate('Domain Collection ProjectID');

	function callback(err, numAffected) {
		if (err) {
			res.json(err)
		}
		else {
			var conditions = {
				PostId: req.body.PostId,
				BoardId: req.body.board,
				UserId: req.session.user._id,
				MediaId: req.body.id,
				Action: 'Post'
			};

			var setObj_mediaActionLogs = {
				MediaId: req.body.id,
				Title: null,
				Prompt: null,
				Photographer: null,
				BoardId: req.body.board,
				Action: 'Post',
				OwnerId: req.session.user._id,
				MediaType: req.body.data.MediaType,
				ContentType: req.body.data.ContentType,
				UserFsg: req.session.user.FSGs,
				CreatedOn: Date.now(),
				UserId: req.session.user._id
			};

			mediaAction.find(conditions).count().exec(function (err, mCount) {
				if (!err) {
					var query = {
						"_id": req.body.board,
						"Medias._id": req.body.PostId
					};

					var projection = {
						"Medias.$": 1
					};

					if (mCount) {
						mediaAction.update(conditions, { $set: setObj_mediaActionLogs }, { multi: false }, function (err, numAffected) {
							if (err) {
								console.log(err);
								res.json({ "code": "404", "message": err });
							}
							else {
								console.log(numAffected);

								board.find(query, projection, function (err, result1) {
									res.json({ "code": "200", "message": "success", "response": result1 });
								})
							}
						})
					}
					else {
						//It means it was an old record just save a record there with action Post.
						mediaAction(setObj_mediaActionLogs).save(function (err, result1) {
							if (err) {
								console.log(err);
								res.json({ "code": "404", "message": err });
							}
							else {
								//res.json({"status":"success","message":"Success!","result":result1});
								board.find(query, projection, function (err, result1) {
									res.json({ "code": "200", "message": "success", "response": result1 });
								})
							}
						});
					}
				}
				else {
					res.json({ "code": "404", "message": err });
				}
			});
			//update PostId in mediaActionLogs collection
			//res.json({"status":"success","message":"Success!","affected":numAffected,postData:postObjToUpdate});
		}
	}
}



var addMediaToBoard_M_7 = function (req, res) {

	fields = {
		Medias: []
	};

	board.find({ _id: req.body.board }, function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found" })
			}
			else {

				//added by manishp on 22122014-Montage case
				var thumbnail = '';
				if (req.body.data.thumbnail) {
					thumbnail = req.body.data.thumbnail;
					console.log("if -----------------------thumbnail = ", thumbnail);
				}
				else {
					console.log("else thumbnail = ");
				}

				//end

				if (req.body.gt == "" || typeof (req.body.gt) == 'undefined') {
					console.log("if (req.body.gt== check"); return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					gtfields = {
						GroupTagTitle: req.body.gtsa,
						Notes: "",
						DateAdded: Date.now(),
						MetaMetaTagID: null,
						MetaTagID: null,
						status: 2
					};

					groupTags(gtfields).save(function (err, data) {
						if (err) {
							res.json(err);
						}
						else {
							if (result[0].Themes == null) {
								fields.Themes = [];
							}
							else {
								fields.Themes = result[0].Themes;
							}

							fields.Themes.push({
								ThemeID: data.id,
								ThemeTitle: req.body.gtsa,
								SuggestedBy: req.session.user._id,
								SuggestedOn: Date.now(),
								isApproved: 0
							});

							if (req.body.data.Content) {
								fields.Medias.push({
									MediaID: req.body.id,
									MediaURL: req.body.data.Location[0].URL,
									MediaTitle: null,
									PostedBy: req.session.user._id,
									PostedOn: Date.now(),
									Content: req.body.data.Content,
									ThemeID: data.id,
									ThemeTitle: req.body.gtsa,
									ContentType: req.body.data.ContentType,
									Votes: [],
									Marks: [],
									thumbnail: thumbnail, //added by manishp on 22122014- montage case
									PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									"Themes": req.body.Themes ? req.body.Themes : []
								});
							} else {
								fields.Medias.push({
									MediaID: req.body.id,
									MediaURL: req.body.data.Location[0].URL,
									MediaTitle: null,
									PostedBy: req.session.user._id,
									PostedOn: Date.now(),
									ThemeID: data.id,
									ThemeTitle: req.body.gtsa,
									ContentType: req.body.data.ContentType,
									Votes: [],
									Marks: [],
									thumbnail: thumbnail, //added by manishp on 22122014- montage case
									PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
									"Themes": req.body.Themes ? req.body.Themes : []
								});
							}

							var query = { _id: req.body.board };
							var options = { multi: true };

							board.update(query, { $set: fields }, options, callback);
						}
					});
				} else {
					console.log("else (req.body.gt== check thumbnail = ", thumbnail);//return false;
					var fields = {};
					if (result[0].Medias == null) {
						fields.Medias = [];
					}
					else {
						fields.Medias = result[0].Medias;
					}
					var flag = 0;
					for (as in result[0].Themes) {
						if (result[0].Themes[as].ThemeID == req.body.gt) {
							flag = 1;
						}
					}

					if (flag == 0) {
						fields.Themes = [];
						if (result[0].Themes == null) {
							fields.Themes = [];
						}
						else {
							fields.Themes = result[0].Themes;
						}
						fields.Themes.push({
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							SuggestedBy: req.session.user._id,
							SuggestedOn: Date.now(),
							isApproved: 1
						});
					}
					if (req.body.data.Content) {
						console.log("else (req.body.gt== check-222222 thumbnail = ", thumbnail);//return false;
						/*
						fields.Medias.push({
							MediaID:req.body.id,
							MediaURL:req.body.data.Location[0].URL,
							Title:null,
							Prompt:null,
							Locator:null,
							PostedBy:req.session.user._id,
							PostedOn:Date.now(),
							ThemeID:req.body.gt,
							ThemeTitle:req.body.gtsa,
							MediaType:req.body.data.MediaType,
							ContentType:req.body.data.ContentType,
							Votes:[],
							Marks:[],
							OwnerId:req.body.owner,
							Content:req.body.data.Content,
							thumbnail:thumbnail
						});
						*/
						//added by manishp on 22122014- montage case
						var obj = {
							MediaID: req.body.id,
							MediaURL: req.body.data.Location[0].URL,
							Title: null,
							Prompt: null,
							Photographer: null,
							PostedBy: req.session.user._id,
							PostedOn: Date.now(),
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							MediaType: req.body.data.MediaType,
							ContentType: req.body.data.ContentType,
							Votes: [],
							Marks: [],
							OwnerId: req.body.owner,
							Content: req.body.data.Content,
							thumbnail: thumbnail,
							PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							"Themes": req.body.Themes ? req.body.Themes : []
						};

						fields.Medias.push(obj);

						//console.log("fields.Medias = ",fields.Medias);
						//console.log("fields.Medias object = ",obj);return false;
					}
					else {
						console.log("else (req.body.gt== check-3333333");//return false;
						fields.Medias.push({
							MediaID: req.body.id,
							MediaURL: req.body.data.Location[0].URL,
							Title: null,
							Prompt: null,
							Photographer: null,
							PostedBy: req.session.user._id,
							PostedOn: Date.now(),
							ThemeID: req.body.gt,
							ThemeTitle: req.body.gtsa,
							MediaType: req.body.data.MediaType,
							ContentType: req.body.data.ContentType,
							Votes: [],
							Marks: [],
							OwnerId: req.body.owner,
							thumbnail: thumbnail, //added by manishp on 22122014- montage case
							PostStatement: req.body.Statement ? req.body.Statement : "", //New Montage Case - Added on 27042015 By manishp
							"Themes": req.body.Themes ? req.body.Themes : []
						});
					}
					var query = { _id: req.body.board };
					var options = { multi: true };
					//console.log("fields = ",fields);return false;
					board.update(query, { $set: fields }, options, callback);
				}
			}
		}

	}).populate('Domain Collection ProjectID');

	function callback(err, numAffected) {
		if (err) {
			res.json(err)
		}
		else {
			postMedia(req, res);
		}
	}
}

exports.addMediaToBoard = addMediaToBoard;


/*________________________________________________________________________
	* @Date:      	29 june 2015
	* @Method :   	addTags_toGT
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to add tags to all gts associated with media.
	* @Param:     	2
	* @Return:    	no
_________________________________________________________________________
*/

var addTags_toGT = function (mediaID, tags) {
	tags = tags.split(',');
	media.findOne({ _id: mediaID }, function (err, med_Data) {
		console.log(med_Data.GroupTags.length);
		for (var i = 0; i < med_Data.GroupTags.length; i++) {
			console.log('----------sending==============' + med_Data.GroupTags[i].GroupTagID)
			final__addTags_toGT(med_Data.GroupTags[i].GroupTagID, tags)
		}
	})
}

var final__addTags_toGT = function (gtID, tags) {
	groupTags.findOne({ _id: gtID }, function (err, result) {
		if (!err) {
			var gt = result;
			console.log('---------------------------------------------------------');
			console.log(gt);
			console.log('---------------------------------------------------------');
			for (j in tags) {
				var resultFinal = false;
				if (gt.Tags != null && gt.Tags != undefined) {

				} else {
					gt.Tags = [];
				}
				for (x in gt.Tags) {
					if (gt.Tags[x].TagTitle == tags[j]) {
						resultFinal = true;
						var tagID = gt.Tags[x]._id;
					}
				}
				if (!resultFinal) {
					gt.Tags.push({
						TagTitle: tags[j],
						status: 2
					});
				}
				gt.save(function (err) {
					if (err) {
						//res.json(err);
					}
				});
			}
		}
	})
}
/********************************************* END ****************************************************/
var uploadfile = function (req, res) {
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				console.log('=========================')
				console.log(data);
				//data.seq=(data.seq)+1;
				console.log(data.seq);
				incNum = data.seq;
				//data.save(function(err){
				//if( !err ){
				console.log("incNum=" + incNum);
				var form = new formidable.IncomingForm();
				var RecordLocator = "";

				form.parse(req, function (err, fields, files) {
					var file_name = "";

					if (files.myFile.name) {
						uploadDir = __dirname + "/../../public/assets/Media/img";
						file_name = files.myFile.name;
						file_name = file_name.split('.');
						ext = file_name[file_name.length - 1];
						RecordLocator = file_name[0];
						var name = '';
						name = dateFormat() + '_' + incNum;
						////name = Math.floor( Date.now() / 1000 ).toString()+'_'+incNum;
						//file_name=name+'.'+ext;
						file_name = name + '.' + ext; //updated on 09022015 by manishp : <timestamp>_<media_unique_number>_<size>.<extension> = 1421919905373_101_600.jpeg
						console.log(files.myFile.type);
						fs.renameSync(files.myFile.path, uploadDir + "/" + file_name)

						var media_type = '';
						if (files.myFile.type == "application/pdf" || files.myFile.type == "application/msword" || files.myFile.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || files.myFile.type == "application/vnd.ms-excel" || files.myFile.type == "application/vnd.oasis.opendocument.spreadsheet" || files.myFile.type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || files.myFile.type == "application/vnd.ms-powerpoint" || files.myFile.type == 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
							media_type = 'Document';
						}
						else if (files.myFile.type == 'video/mp4' || files.myFile.type == 'video/ogg') {
							media_type = 'Video';
						}
						else if (files.myFile.type == 'audio/mpeg' || files.myFile.type == 'audio/ogg') {
							media_type = 'Audio';
						}
						else {
							media_type = 'Image';
							//add thumbnail code
							var imgUrl = file_name;
							var mediaCenterPath = "/../../public/assets/Media/img/";
							var srcPath = __dirname + mediaCenterPath + imgUrl;

							if (fs.existsSync(srcPath)) {
								var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
								var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
								var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
								var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
								var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

								var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

								crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
								crop_image(srcPath, dstPathCrop_SG, 300, 300);
								//crop_image(srcPath,dstPathCrop_400,400,400);
								//crop_image(srcPath,dstPathCrop_500,500,500);
								crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
								//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
								resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
								resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
							}
						}


						console.log("incNum=" + incNum);
						var successFlag = false;

						var __UploaderID = '';
						if (req.session.admin) {
							__UploaderID = req.session.admin._id;
							successFlag = true;
						} else if (req.session.subAdmin) {
							__UploaderID = req.session.subAdmin._id;
							successFlag = true;
						}
						else {
							//return;
						}

						if (successFlag) {
							dataToUpload = {
								Location: [],
								UploadedBy: "admin",
								UploadedOn: Date.now(),
								UploaderID: __UploaderID,
								Source: "Thinkstock",
								SourceUniqueID: null,
								Domains: null,
								AutoId: incNum,
								GroupTags: [],
								Collection: null,
								Status: 0,
								MetaMetaTags: null,
								MetaTags: null,
								AddedWhere: "directToPf", //directToPf,hardDrive,dragDrop
								IsDeleted: 0,
								TagType: "",
								ContentType: files.myFile.type,
								MediaType: media_type,
								AddedHow: 'hardDrive',
								Locator: RecordLocator + "_" + incNum	//added on 23012014
							}

							dataToUpload.Location.push({
								Size: files.myFile.size,
								URL: file_name
							})

							media(dataToUpload).save(function (err) {
								if (err) {
									res.json(err);
								}
								else {
									console.log("returning....");
									findAll(req, res)
								}
							});
						}
						else {
							res.json({ "code": 401, "msg": "Admin/Subadmin session not found." });
						}

					}
				});
			}
		});
}
exports.uploadfile = uploadfile;

var uploadLink = function (req, res) {
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				console.log('=========================')
				console.log(data);
				//data.seq=(data.seq)+1;
				console.log(data.seq);
				incNum = data.seq;
				//data.save();
				console.log("incNum=" + incNum);
				var type = 'Link';
				if (req.body.type == 'Notes') {
					type = 'Notes';
					name = dateFormat();
					//name = Date.now();//18022015
				}
				if (req.body.type == 'Montage') {
					type = 'Montage';
					name = 'montage_' + incNum;
				}
				console.log("---------------req.body.type = " + req.body.type);

				var LinkType = '';
				if (req.body.linkType) {
					LinkType = req.body.linkType;
				}

				var thumbnail = '';
				if (req.body.thumbnail) {
					thumbnail = req.body.thumbnail;
					if (type == 'Link') {

						//console.log("Thumbnail = "+thumbnail);
						var url = require('url');
						var f = '';
						var fArr = [];
						//var fileName = "web-link-"+Date.now()+url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
						f = url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
						fArr = f.split('.');
						RecordLocator = fArr[0];
						console.log("RecordLocator = " + RecordLocator);//return;
						ext = fArr[fArr.length - 1];
						//var fileName = Date.now()+'_'+incNum+'.'+ext;
						var name = '';
						name = RecordLocator;
						var fileName = dateFormat() + '_' + incNum + '.' + ext;
						//async_libhronous call - child process command execution
						saveFileFromUrl(thumbnail, fileName);
						thumbnail = fileName;
					}
				}
				console.log("------------------name = ", name);

				var dataToUpload = {
					Location: [],
					AutoId: incNum,
					UploadedBy: "user",
					UploadedOn: Date.now(),
					UploaderID: req.session.user._id,
					Source: "Thinkstock",
					//SourceUniqueID:null,
					SourceUniqueID: "53ceb02d3aceabbe5d573dba", //updated on 06012015
					//Domains:null,
					Domains: "53ad6993f222ef325c05039c",
					GroupTags: [],
					//Collection:null,
					Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
					//Status:0,
					Status: 2, //updated on 25122014 by manishp after discussing with amitchh - for more detail on Status codes check the comments on media model
					MetaMetaTags: null,
					MetaTags: null,
					//AddedWhere:"directToPf", //directToPf,hardDrive,dragDrop
					AddedWhere: "board", //directToPf,board,capsule
					IsDeleted: 0,
					TagType: "",
					Content: req.body.content,
					ContentType: type,
					MediaType: type,
					AddedHow: type,
					thumbnail: thumbnail,	//added on 24122014 by manishp embedded link thumbnail case.
					Locator: name + "_" + incNum,
					LinkType: LinkType,
					OwnerFSGs: req.session.user.FSGsArr2,
					OwnStatement: req.body.Statement ? req.body.Statement : "",	//The Original statement by the image owner
					CurrStatement: req.body.Statement ? req.body.Statement : "",	// Statement currently in use
				}
				if (req.body.Prompt) {
					dataToUpload.Prompt = req.body.Prompt;
				}
				dataToUpload.Location.push({
					Size: "",
					URL: ""
				})

				if (req.body.Title) {
					dataToUpload.Title = req.body.Title;
				}

				//console.log("dataToUpload = ",dataToUpload);return;
				media(dataToUpload).save(function (err, tata) {
					if (err) {
						res.json({ "code": "404", "message": err });
					}
					else {
						if (req.body.Prompt) {
							add__Descriptors(req.body.Prompt, tata._id);
						}
						res.json({ "code": "200", "message": "success", "response": tata })
					}
				});

			}
		});

}

exports.uploadLink = uploadLink;


var deleteMedia = function (req, res) {
	//delete thumbnail code
	media.find({ _id: { $in: req.body.media } }, function (err, mediaRecords) {
		if (!err) {
			media.remove({ _id: { $in: req.body.media } }, function (err) {
				if (err) {
					res.json(err)
				}
				else {
					for (var loop = 0; loop < mediaRecords.length; loop++) {
						mediaRec = mediaRecords[loop];
						if (mediaRec.Status != 1) {	//delete from file system in case of de-active media
							if (mediaRec.MediaType != 'Notes') {
								console.log("-----------------------------------IF----");
								var file_name = '';
								console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
								switch (mediaRec.MediaType) {
									case 'Image':
										file_name = mediaRec.Location[0].URL;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									case 'Montage':
										file_name = mediaRec.thumbnail;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									case 'Link':
										file_name = mediaRec.thumbnail;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									default:
										console.log("default case---");
									//do nothing
								}
								console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
								if (file_name != '') {
									console.log("Calling delete...");
									__deleteMediaThumbnails(file_name);
								}

							} else {
								console.log("ELSE----");
							}
						}
					}

					findAllStatus(req, res)
				}
			});
		}
	})
}

//exports.deleteMedia = deleteMedia;
var establishedModels = {};
function createModelForName(name) {
	if (!(name in establishedModels)) {
		var Any = new mongoose.Schema(
			{
				_id: { type: String },
				value: {
					id: { type: mongoose.Schema.Types.ObjectId },
					userId: { type: mongoose.Schema.Types.ObjectId },
					UserScore: { type: Number },
					MediaScore: { type: Number },
					Title: { type: String },
					Prompt: { type: String },
					Locator: { type: String },
					URL: { type: String },
					MediaType: { type: String },
					ContentType: { type: String },
					UploadedOn: { type: Date },
					count: { type: String }
				}
			},
			{ collection: name }
		);
		establishedModels[name] = mongoose.model(name, Any);
	}
	return establishedModels[name];
}

var deleteMedia_v2 = function (req, res) {
	var deactivatedMediaArr = [];
	var deactivatedMediaIds = [];

	var activatedMediaIds = [];

	//delete thumbnail code
	media.find({ _id: { $in: req.body.media } }, { Status: 1, MediaType: 1, thumbnail: 1, Location: 1 }, function (err, mediaRecords) {
		if (!err) {
			//make two array one for de-active media and another for active media
			for (var loop = 0; loop < mediaRecords.length; loop++) {
				mediaRec = mediaRecords[loop];
				if (mediaRec.Status != 1) {	//delete from file system in case of de-active media
					deactivatedMediaArr.push(mediaRec);
					deactivatedMediaIds.push(mediaRec._id);
				}
				else {
					activatedMediaIds.push(mediaRec._id);
				}
			}

			console.log("De-activated Media IDs : ", deactivatedMediaIds);
			console.log("activated Media IDs : ", activatedMediaIds);

			//handle activated media case
			if (deactivatedMediaIds.length > 0) {
				media.remove({ _id: { $in: deactivatedMediaIds } }, function (err) {
					if (err) {
						res.json(err)
					}
					else {
						for (var loop = 0; loop < deactivatedMediaArr.length; loop++) {
							var mediaRec = [];
							mediaRec = deactivatedMediaArr[loop];
							if (mediaRec.MediaType != 'Notes') {
								console.log("-----------------------------------IF----");
								var file_name = '';
								console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
								switch (mediaRec.MediaType) {
									case 'Image':
										file_name = mediaRec.Location[0].URL;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									case 'Montage':
										file_name = mediaRec.thumbnail;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									case 'Link':
										file_name = mediaRec.thumbnail;
										console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
										break;

									default:
										console.log("default case---");
									//do nothing
								}
								console.log("file_name = " + file_name + "--------mediaRec.MediaType = " + mediaRec.MediaType);
								if (file_name != '') {
									console.log("Calling delete...");
									__deleteMediaThumbnails(file_name);
								}

							} else {
								console.log("ELSE----");
							}

						}

						deleteActivatedMedia(activatedMediaIds);
						//findAllStatus(req,res)
					}
				});
			}
			else {
				deleteActivatedMedia(activatedMediaIds);
			}
			//end handle de-activated media case
			var allIds = activatedMediaIds.concat(deactivatedMediaIds);
			var allCollections = mongoose.modelNames();

			console.log("allIds-----------------", allIds);
			console.log("allCollections-----------------", allCollections);

			var UserMedia_Collections = [];
			for (var loop = 0; loop < allCollections.length; loop++) {
				//if matched with UserMedia_ prefix then keep the collection
				var str = allCollections[loop];
				var UserMedia_Collection = str.match(/UserMedia_/g);
				UserMedia_Collection = UserMedia_Collection ? UserMedia_Collection : "NOT_MATCHED";
				if (UserMedia_Collection != 'NOT_MATCHED') {
					UserMedia_Collections.push(allCollections[loop]);
				}
			}

			//delete from all dynamic UserMedia_{UserSession_id} collections - here we will be having thousands of collection at some point of time
			for (var loop = 0; loop < UserMedia_Collections.length; loop++) {
				//var userMedia_userIdmodel = UserMedia_Collections[loop];
				var userMedia_userIdmodel = mongoose.model(UserMedia_Collections[loop]);
				var conditions = { _id: { $in: allIds } };
				userMedia_userIdmodel.remove(conditions, function (err) {
					if (!err) {
						console.log("ERROR------", err);
						//throw err;
					}
					else {
						console.log("Deleted from login UserMedia Collection ---------", UserMedia_Collections[loop]);
					}
				});

			}
		}
	})

	function deleteActivatedMedia(activatedMediaIds) {
		console.log("CAlled....");
		//handle activated media case
		if (activatedMediaIds.length > 0) {
			var condition = { _id: { $in: activatedMediaIds } };
			var fields = { $set: { IsDeleted: 1 } };
			var options = { multi: true };

			media.update(condition, fields, options, function (err) {
				if (err) {
					console.log("ERROR----");
					res.json(err)
				}
				else {
					console.log("Yes m in success");
					//No need to delete media from hard disk
					findAllStatus(req, res)
				}
			});
		}
		else {
			findAllStatus(req, res)
		}
	}
}

exports.deleteMedia = deleteMedia_v2;

function __deleteMediaThumbnails(file_name) {
	console.log("Got action...");

	var imgUrl = file_name;
	var mediaCenterPath = "/../../public/assets/Media/img/";
	//var mediaCenterPath = "/public/assets/Media/img/";
	var srcPath = __dirname + mediaCenterPath + imgUrl;

	if (fs.existsSync(srcPath)) {
		console.log("file found...");

		fs.unlink(srcPath);

		var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
		var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
		var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
		var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
		var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

		var dstPathCrop_ASPECTSMALL = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

		if (fs.existsSync(dstPathCrop_SMALL)) {
			fs.unlink(dstPathCrop_SMALL);
			console.log("dstPathCrop_SMALL Deleted...");
		}

		if (fs.existsSync(dstPathCrop_SG)) {
			fs.unlink(dstPathCrop_SG);
			console.log("dstPathCrop_SG Deleted...");
		}

		if (fs.existsSync(dstPathCrop_MEDIUM)) {
			fs.unlink(dstPathCrop_MEDIUM);
			console.log("dstPathCrop_MEDIUM Deleted...");
		}
		if (fs.existsSync(dstPathCrop_LARGE)) {
			fs.unlink(dstPathCrop_LARGE);
			console.log("dstPathCrop_LARGE Deleted...");
		}
		if (fs.existsSync(dstPathCrop_ORIGNAL)) {
			fs.unlink(dstPathCrop_ORIGNAL);
			console.log("dstPathCrop_ORIGNAL Deleted...");
		}
		if (fs.existsSync(dstPathCrop_ASPECTSMALL)) {
			fs.unlink(dstPathCrop_ASPECTSMALL);
			console.log("dstPathCrop_ASPECTSMALL Deleted...");
		}

	}
	else {
		console.log("file not found..." + srcPath);
	}
}

var postMedia = function (req, res) {

	var fields = {
		MediaId: req.body.id,
		Title: null,
		Prompt: null,
		Photographer: null,
		BoardId: req.body.board,
		Action: 'Post',
		OwnerId: req.session.user._id,
		MediaType: req.body.data.MediaType,
		ContentType: req.body.data.ContentType,
		UserFsg: req.session.user.FSGs,
		CreatedOn: Date.now(),
		UserId: req.session.user._id
	}

	console.log("Media entered to action logs here")
	console.log(fields);

	mediaAction(fields).save(function (err) {
		if (err) {
			res.json({ "code": "404", "message": err });
		}
		else {
			board.find({ _id: req.body.board }, function (err, result1) {
				res.json({ "code": "200", "message": "success", "response": result1 });
			})
		}
	})
}

exports.postMedia = postMedia;

var viewMedia = function (req, res) {
	var medias = req.body.arrayOfMedias;
	var board = req.body.board;
	media.find({ "_id": { $in: medias } }, function (err, result) {
		console.log(medias);
		console.log(result);
		if (err) {
			res.json({ "code": "404", "message": "Not Found!" })
		}
		else {
			for (i in result) {
				var fields = {
					MediaId: result[i].id,
					Title: result[i].Title,
					Prompt: result[i].Prompt,
					Photographer: result[i].Photographer,
					BoardId: req.body.board,
					Action: 'View',
					MediaType: result[i].MediaType,
					ContentType: result[i].ContentType,
					UserFsg: req.session.user.FSGs,
					CreatedOn: Date.now(),
					OwnerId: result[i].UploaderID,
					UserId: req.session.user._id
				};

				mediaAction(fields).save(function (err) {
					if (err) {
						//res.json({"code":"404","message":err});
					}
					else {

					}
				})

				var viewcount = 1;
				if (typeof (result[i].ViewsCount) != 'undefined') {
					viewcount = result[i].ViewsCount + 1;
				}
				datafield = {
					ViewsCount: viewcount
				};
				var query = { _id: result[i]._id };
				var options = { multi: false };
				media.update(query, datafield, options, function (err) {
					if (err) {
						//res.json({"code":"404","message":err});
					}
					else {
						//res.json({"code":"200","message":"success"});
					}
				})

			}
			res.json({ "code": "200", "message": "success" });
		}
	})
}

exports.viewMedia = viewMedia;

/***
 * Image crop..
 * Available gravity options are [NorthWest, North, NorthEast, West, Center, East, SouthWest, South, SouthEast]
***/
var crop_image = function (srcPath, dstPath, width, height) {
	console.log("crop_image source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');
	//var im = require('imagemagick').subClass({ imageMagick: true });
	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		var easyimg = require('easyimage');
		try {
			easyimg.rescrop({
				src: srcPath,
				dst: dstPath,
				width: parseInt(width),
				height: parseInt(height),
				cropwidth: parseInt(width),
				cropheight: parseInt(height),
				background: "black",
				quality: 100,
				gravity: "Center"
			}).then(
				function (image) {
					console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
				},
				function (err) {
					console.log("easyimg.crop-----------------------------", err);
				}
			);
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			im.crop({
				srcPath: srcPath,
				dstPath: dstPath,
				width: width,
				height: height,
				quality: 1,
				gravity: "Center"
			}, function (err, stdout, stderr) {
				if (err) {
					console.log("Caught Error - ", err);
				} else {
					console.log('successfully cropped..');
				}
			});
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}

}
exports.crop_image = crop_image;

var crop_image_sync = async function (srcPath, dstPath, width, height) {
	var easyimg = require('easyimage');
	console.log("crop_image source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');
	//var im = require('imagemagick').subClass({ imageMagick: true });
	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		try {
			await easyimg.rescrop({
				src: srcPath,
				dst: dstPath,
				width: parseInt(width),
				height: parseInt(height),
				cropwidth: parseInt(width),
				cropheight: parseInt(height),
				background: "black",
				quality: 100,
				gravity: "Center"
			});
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			/*
			await im.crop({
				srcPath: srcPath,
				dstPath: dstPath,
				width: width,
				height: height,
				quality: 1,
				gravity: "Center"
			});
			*/
			await easyimg.rescrop({
				src: srcPath,
				dst: dstPath,
				width: width,
				height: height,
				cropwidth: parseInt(width),
				cropheight: parseInt(height),
				quality: 100,
				gravity: "Center"
			});
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}

}
exports.crop_image_sync = crop_image_sync;

/***
 * Image crop..
 * Available gravity options are [NorthWest, North, NorthEast, West, Center, East, SouthWest, South, SouthEast]
***/
function crop_image__Note(srcPath, dstPath, width, height) {
	console.log("crop_image__Note source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');
	//var im = require('imagemagick').subClass({ imageMagick: true });
	try {
		im.crop({
			srcPath: srcPath,
			dstPath: dstPath,
			width: width,
			height: height + "^",
			quality: 1,
			gravity: "North"
		}, function (err, stdout, stderr) {
			if (err) throw err;
			console.log('success..');
		});
	}
	catch (e) {
		console.log("=========================ERROR : ", e);
	}

}

/*________________________________________________________________________
	* @Date:      	13 March 2015
	* @Method :   	resize_image
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to resize orignal media.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
//BY Parul 20022015

var resize_image = function (srcPath, dstPath, w, h) {
	console.log("resize_image source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');

	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		var easyimg = require('easyimage');
		try {
			easyimg.info(srcPath).then(
				function (file) {
					var features = file;
					console.log("easyimg.info---------------", features);
					console.log(features.width + "======================" + features.height);
					if (parseInt(features.height) >= parseInt(h)) {
						console.log('========================================================================== here1');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(w),
							height: parseInt(h),
							quality: 100
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
					else if (parseInt(features.width) >= parseInt(w)) {
						console.log('========================================================================== here2');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(w),
							height: parseInt(h),
							quality: 100
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
					else {
						console.log('========================================================================== here3');
						easyimg.resize({
							src: srcPath,
							dst: dstPath,
							width: parseInt(features.width),
							height: parseInt(features.height),
							quality: 100
						}).then(
							function (data) {
								console.log("data----------------easyimg.resize-------", data);
							},
							function (err) {
								console.log("-----------------1231easyimg.resize-------", err);
							}
							);
					}
				}, function (err) {
					console.log("-------------resize_image ERROR on easyimg.info---------------", err);
				}
			);
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			im.identify(srcPath, function (err, features) {
				if (err) {
					console.log("-------------resize_image ERROR on im.identify---------------", err);
				} else {
					console.log(features.width + "======================" + features.height);
					if (parseInt(features.height) >= parseInt(h)) {
						console.log('========================================================================== here1');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							//width: w,
							height: h
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else if (parseInt(features.width) >= parseInt(w)) {
						console.log('========================================================================== here2');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: w
							//height: 1440,
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else {
						console.log('========================================================================== here3');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: features.width,
							height: features.height
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
				}
			})
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}

	}
}
exports.resize_image = resize_image;

var resize_image_sync = async function (srcPath, dstPath, w, h) {
	console.log("resize_image source : ", srcPath + " ---- destination : " + dstPath);
	//var im = require('imagemagick');
	var easyimg = require('easyimage');

	try {
		var file = await easyimg.info(srcPath);
		if(typeof file === 'object') {
			var features = file;
			console.log("easyimg.info---------------", features);
			console.log(features.width + "======================" + features.height);
			if (parseInt(features.height) >= parseInt(h)) {
				await easyimg.resize({
					src: srcPath,
					dst: dstPath,
					width: parseInt(w),
					height: parseInt(h),
					quality: 100
				});
			}
			else if (parseInt(features.width) >= parseInt(w)) {
				await easyimg.resize({
					src: srcPath,
					dst: dstPath,
					width: parseInt(w),
					height: parseInt(h),
					quality: 100
				});
			}
			else {
				await easyimg.resize({
					src: srcPath,
					dst: dstPath,
					width: parseInt(features.width),
					height: parseInt(features.height),
					quality: 100
				})
			}
		} else {
			console.log("-------------resize_image ERROR on easyimg.info---------------", file);
		}
	}
	catch (e) {
		console.log("=========================ERROR : ", e);
	}

	/*
	if (srcPath.split('.').pop().toUpperCase() == 'GIF') {
		try {
			var file = await easyimg.info(srcPath);
			if(typeof file === 'object') {
				var features = file;
				console.log("easyimg.info---------------", features);
				console.log(features.width + "======================" + features.height);
				if (parseInt(features.height) >= parseInt(h)) {
					await easyimg.resize({
						src: srcPath,
						dst: dstPath,
						width: parseInt(w),
						height: parseInt(h)
					});
				}
				else if (parseInt(features.width) >= parseInt(w)) {
					await easyimg.resize({
						src: srcPath,
						dst: dstPath,
						width: parseInt(w),
						height: parseInt(h)
					});
				}
				else {
					await easyimg.resize({
						src: srcPath,
						dst: dstPath,
						width: parseInt(features.width),
						height: parseInt(features.height)
					})
				}
			} else {
				console.log("-------------resize_image ERROR on easyimg.info---------------", file);
			}
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}
	else {
		try {
			im.identify(srcPath, function (err, features) {
				if (err) {
					console.log("-------------resize_image ERROR on im.identify---------------", err);
				} else {
					console.log(features.width + "======================" + features.height);
					if (parseInt(features.height) >= parseInt(h)) {
						console.log('========================================================================== here1');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							//width: w,
							height: h
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else if (parseInt(features.width) >= parseInt(w)) {
						console.log('========================================================================== here2');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: w
							//height: 1440,
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
					else {
						console.log('========================================================================== here3');
						im.resize({
							srcPath: srcPath,
							dstPath: dstPath,
							width: features.width,
							height: features.height
							//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
							//gravity: 'Center' // optional: position crop area when using 'aspectfill'
						});
					}
				}
			})
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}

	}*/
}
exports.resize_image_sync = resize_image_sync;

/**************************** END IMAGE RESIZE ***************************************/

/*________________________________________________________________________
	* @Date:      	13 March 2015
	* @Method :   	resize_image__Note
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to resize orignal media for Note case.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
//BY Parul 20022015

function resize_image__Note(srcPath, dstPath, w, h) {
	console.log("resize_image__Note source : ", srcPath + " ---- destination : " + dstPath);
	var im = require('imagemagick');

	try {
		im.identify(srcPath, function (err, features) {
			if (err) {
				console.log("--------resize_image__Note---------ERROR on im.identify------", err);
			} else {
				console.log(features.width + "======================" + features.height);
				if (parseInt(features.height) >= parseInt(h)) {
					console.log('========================================================================== here1');
					im.resize({
						srcPath: srcPath,
						dstPath: dstPath,
						//width: w,
						height: h,
						quality: 1,
						sharpening: 0.5,
						//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
						gravity: 'North' // optional: position crop area when using 'aspectfill'
					});
				}
				else if (parseInt(features.width) >= parseInt(w)) {
					console.log('========================================================================== here2');
					im.resize({
						srcPath: srcPath,
						dstPath: dstPath,
						width: w,
						quality: 1,
						sharpening: 0.5,
						//height: 1440,
						//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
						gravity: 'North' // optional: position crop area when using 'aspectfill'
					});
				}
				else {
					console.log('========================================================================== here3');
					im.resize({
						srcPath: srcPath,
						dstPath: dstPath,
						width: features.width,
						height: features.height,
						quality: 1,
						sharpening: 0.5,
						//resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
						gravity: 'North' // optional: position crop area when using 'aspectfill'
					});
				}
			}
		})


	}
	catch (e) {
		console.log("=========================ERROR : ", e);
	}
}


/**************************** END IMAGE RESIZE ***************************************/


/*20 Dec 2014 parul*/
var updateMontage = function (req, res) {
	// Code for montage upload
	var fields = req.body;
	console.log("*****");
	console.log(fields.montage_id);
	//var imagename = "./public/assets/Media/img/a"+fields.montage_id+".png";

	var query = { _id: fields.montage_id };
	//var field={thumbnail:"./public/assets/board/img/a"+fields.montage_id+".png"};
	//var field={thumbnail:"a"+fields.montage_id+".png"};

	media.findOne(query, function (err, montageData) {
		if (!err) {
			var name = '';
			name = dateFormat() + '_' + montageData.AutoId;

			var imagename = __dirname + "/../../public/assets/Media/img/" + name + ".png"; //updated by manishp on 23122014 at 10 PM
			fs.writeFile(imagename, fields.image, 'base64', function (err) {
				if (err) {
					console.log("ERROOORR");
					console.log(err);
					console.log("imagename = ", imagename); return false;
				} else {
					//add thumbnail code
					var imgUrl = name + ".png";
					var mediaCenterPath = "/../../public/assets/Media/img/";
					var srcPath = __dirname + mediaCenterPath + imgUrl;

					if (fs.existsSync(srcPath)) {
						var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
						var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
						var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
						var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
						var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

						var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
						crop_image(srcPath, dstPathCrop_SG, 300, 300);
						crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
						//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
						resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
						resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

					}
				}
			});

			montageData.thumbnail = name + ".png";
			montageData.Locator = name;
			montageData.save(function () {
				if (!err) {
					res.json({ "code": "200", "message": "success", "thumbnail": montageData.thumbnail });
				}
			})
		} else {
			res.json(err);
		}

	})


	/*
	media.update(query,{$set:field},{upsert:false},function(err){
		if (err) {
			console.log(err);
		}
		else{
			res.json({"code":"200","message":"success","thumbnail":field.thumbnail});
		}
	});
	*/
};

exports.updateMontage = updateMontage;



// parul 08012015

var viewMediaAdmin = function (req, res) {
	console.log('in view media admin');
	console.log(req.body);
	var mediaId = req.body.ID ? req.body.ID : "";
	var conditions = {
		_id: mediaId
	}
	var fields = {

	}
	media.find(conditions, fields, function (err, data) {
		if (!err) {
			res.json({ "code": "200", "message": "success", "result": data })
		} else {
			console.log(err);
			res.json({ "code": "501", "message": "Something went wrong.", "result": [] })
		}
	}).populate('MetaMetaTags SourceUniqueID Domains Collection GroupTags.GroupTagID')

};
exports.viewMediaAdmin = viewMediaAdmin;

var getMediaDetails = function (req, res) {
	console.log('in view media frontend');
	console.log(req.body);
	media.find({ _id: req.body.ID }, function (err, data) {
		if (!err) {
			res.json({ "code": "200", "message": "success", "result": data })
		} else {
			console.log(err); return;
		}
	}).populate('MetaMetaTags SourceUniqueID Domains Collection GroupTags.GroupTagID')

};
exports.getMediaDetails = getMediaDetails;

var getPostedMediaDetails = function (req, res) {
	console.log('in view media frontend');
	console.log(req.body);
	media.find({ _id: req.body.ID }, function (err, data) {
		if (!err) {
			res.json({ "code": "200", "message": "success", "result": data })
		} else {
			console.log(err); return;
		}
	}).populate('');
};
exports.getPostedMediaDetails = getPostedMediaDetails;

//Generating Thumbnails of all the Existing Images
//added by manishp on 14012015

var GenerateThumbnail = function (req, res) {
	var fields = {};
	//fields['MediaType'] = "Montage";
	fields['MediaType'] = "Link";

	var rec_skip = 0;
	var rec_limit = 1;
	if (req.query.rec_skip && req.query.rec_limit) {
		rec_skip = req.query.rec_skip;
		rec_limit = req.query.rec_limit;
	}

	media.find(fields).sort({ UploadedOn: 'desc' }).skip(rec_skip).limit(rec_limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
			}
			else {
				//start code here
				console.log("Total " + result.length + " Links found----Process starting...");
				for (var loop = 0; loop < result.length; loop++) {

					if (fields['MediaType'] = "Link") {
						console.log("Link case");
						if (result[loop].WebThumbnail) {
							console.log("Found WebThumbnail...");
							var thumbnail = result[loop].WebThumbnail;
							//console.log("Thumbnail = "+thumbnail);
							var url = require('url');
							var fileName = "web-link-" + Date.now() + url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
							//async_libhronous call - child process command execution
							saveFileFromUrl(thumbnail, fileName, result[loop]._id, res, result.length);
						}
					}
					else {
						console.log("Other case");
						//saveThumbnail(result[loop]);
					}

				}

				/*----------------*/
				//res.json({"code":"200","msg":"api found",responselength:result.length});
			}
		}
	})
};

exports.GenerateThumbnail = GenerateThumbnail;

function saveThumbnail(result) {

	if (!result.Location.length)
		return false;

	//var imgUrl = result.Location[0].URL;
	var imgUrl = result.thumbnail;
	var mediaCenterPath = "/../../public/assets/Media/img/";

	var srcPath = __dirname + mediaCenterPath + imgUrl;

	var fs = require('fs');

	if (!fs.existsSync(srcPath)) {
		// Do something
		return false;
	}

	var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
	var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
	var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
	var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
	var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;
	var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

	crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
	crop_image(srcPath, dstPathCrop_SG, 300, 300);
	crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
	//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
	resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
	resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
	return true;
}

function saveFileFromUrl(fileUrl, fileName, mediaId, res, resultLength) {
	console.log("saveFileFromUrl called");
	if (fileUrl) {
		console.log("saveFileFromUrl called in if");
		var mediaCenterPath = "/../../public/assets/Media/img/";
		var dlDir = __dirname + mediaCenterPath;

		console.log("Download From = " + fileUrl.replace(/&/g, '\\&'));
		console.log("To = " + dlDir + fileName);

		var exec = require('child_process').exec;
		//in curl we have to escape '&' from fileUrl
		var curl = 'curl ' + fileUrl.replace(/&/g, '\\&') + ' -o ' + dlDir + fileName + ' --create-dirs';

		console.log("Command to download : " + curl);

		try {
			var child = exec(curl, function (err, stdout, stderr) {
				if (err) {
					console.log(stderr); //throw err;
				}
				else {
					console.log(fileName + ' downloaded to ' + dlDir);

					//crop
					var srcPath = dlDir + fileName;
					var imgUrl = fileName;
					if (fs.existsSync(srcPath)) {
						var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
						var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
						var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
						var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
						var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

						var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
						crop_image(srcPath, dstPathCrop_SG, 300, 300);
						crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
						//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
						resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
						resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

					}

					if (mediaId) {
						var query = { _id: mediaId };
						var options = {};
						var fields = {};
						fields.thumbnail = fileName;
						media.update(query, { $set: fields }, options, generateCounter)

					}

				}
			});
		}
		catch (e) {
			console.log("E = ", e);

		}

		function generateCounter() {
			resultCounter++;
			console.log("resultCounter = " + resultCounter);
			if (resultCounter > (resultLength / 2)) {
				res.json({ "code": "200", "msg": resultCounter + " Links have been processed..", responselength: resultCounter });
				return;
			}
		}
	}
	else {
		console.log("fileUrl Error = " + fileUrl);
	}
}

var resultCounter = 0;

//Generating Thumbnails of all the Existing Images

var view_media = function (req, res) {
	console.log(req.body.id);
	//console.log(req.body);
	//res.json({"message":"Api routes success...", "request":req.query});
	media.findOne({ _id: req.body.id }, function (err, mediaDetails) {
		if (!err) {
			res.json({ "code": "200", "msg": "success", "response": mediaDetails });
		} else {
			res.json(err);
		}
	})
};
exports.view_media = view_media;
/********************************************END******************************************************/


/*________________________________________________________________________
	* @Date:      	19 Feb 2015
	* @Method :   	get_descriptor
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used for populating descriptor auto complete in serach page.
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
//updated on 20022015 by manishp
var get_descriptor = function (req, res) {
	media.find({ Status: 1, IsDeleted: 0 }, { Prompt: 1 }, function (err, result) {
		if (!err) {
			var descriptor = [];
			for (i in result) {
				if (result[i].Prompt && result[i].Prompt.trim() != '') {
					var objArr = [];
					objArr = result[i].Prompt.split(',');

					for (var loop = 0; loop < objArr.length; loop++) {
						var obj = {};
						obj.label = objArr[loop].trim();
						obj.value = objArr[loop].trim();
						var flag = false;
						for (var j = 0; j < descriptor.length; j++) {
							var mStr = '';
							mStr = objArr[loop].trim();
							if (descriptor[j].value.toUpperCase() == mStr.toUpperCase()) {
								flag = true;
								break;
							}

						}
						if (flag != true) {
							descriptor.push(obj);
						}

					}
				}
			}
			res.json({ "code": "200", "msg": "success", "response": descriptor });
		} else {
			res.json(err);
		}
	});
}

exports.get_descriptor = get_descriptor;
/********************************************END******************************************************/


/*________________________________________________________________________
	* @Date:      	19 Feb 2015
	* @Method :   	addTag
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to add media descriptors as tags under descriptor gt.
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
//BY Parul 20022015
var addTag = function (req, res) {

	var tags = req.body.media[i]['prompt'];
	tags = tags.split(',');
	groupTags.findOne({ _id: '54e7214560e85291552b1189' }, function (err, result) {
		var gt = result;
		var gtChanged = false;
		for (k in tags) {
			var duplicate = false;
			for (j in gt.Tags) {
				if (gt.Tags[j].TagTitle == tags[k]) {
					duplicate = true;
				}
			}

			if (!duplicate) {
				gtChanged = true;
				gt.Tags.push({
					TagTitle: tags[k],
					status: 1
				});
			}
		}
		if (gtChanged) {
			gt.save(function (err) {
				if (err)
					res.json(err);
				//else
				//	findTag(req,res)
			});
		} else {
			//res.json({'code':'420','response':'duplicate tag'});
			return;
		}

	})


};

exports.addTag = addTag;
/********************************************END******************************************************/

/*________________________________________________________________________
	* @Date:      	2 Mar 2015
	* @Method :   	get_descriptor
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to add media descriptors as group tags under descriptor mt & mmt
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
//BY Parul 02032015
var addGT_parul = function (req, res) {
	var tags = req.body.media[i]['prompt'];
	tags = tags.split(',');
	console.log(tags);
	var mediaID = req.body.media[i]['id'];
	for (var j = 0; j < tags.length; j++) {
		var keyword = typeof (tags[j]) == 'string' ? tags[j].trim() : '';
		if (keyword != '') {
			//console.log('==========================================================================');
			//console.log(tags[j]);
			//console.log('==========================================================================');
			checkNSaveGT(keyword, mediaID);
		}
	}
};

var addGT = function (tags, mediaID) {
	//var tags = req.body.media[i]['prompt'];
	//var mediaID = req.body.media[i]['id'];

	var tags = tags ? tags : null;
	var mediaID = mediaID ? mediaID : null;

	if (tags != null && mediaID != null) {
		tags = tags.split(',');
		console.log(tags);
		for (var j = 0; j < tags.length; j++) {
			var keyword = typeof (tags[j]) == 'string' ? tags[j].trim() : '';
			if (keyword != '') {
				//console.log('==========================================================================');
				//console.log(tags[j]);
				//console.log('==========================================================================');
				checkNSaveGT(keyword, mediaID);
			}
		}
	}
};

var addGTAsyncAwait = async function (tags, mediaID) {
	var tags = tags ? tags : null;
	var mediaID = mediaID ? mediaID : null;
	if (tags && mediaID) {
		tags = tags.split(',');
		for (var j = 0; j < tags.length; j++) {
			var keyword = typeof (tags[j]) == 'string' ? tags[j].trim() : '';
			if (keyword) {
				var data = await groupTags.find({ "GroupTagTitle": { $regex: new RegExp("^"+keyword+"$", "i") }, $or: [{ "status": 3 }, { "status": 1 }] }).sort({ status: 1 });
				if (data.length == 0) {
					var fields = {};
					fields.GroupTagTitle = keyword;
					fields.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';
					fields.MetaTagID = '54c98aba4fde7f30079fdd5b';
					fields.status = 3;
					fields.LastModified = Date.now();
					fields.DateAdded = Date.now();
					fields.Tags = [{ TagTitle: keyword, status: 1 }];
					fields.Think = [];
					fields.Less = [];
					fields.More = [];
					var retGT = await groupTags(fields).save();
					if (retGT._id) {
						saveGT_toMediaAsyncAwait(retGT._id, mediaID);
					}
				} else {
					saveGT_toMediaAsyncAwait(data[0]._id, mediaID);
				}
			}
		}
	}
}

exports.addGT = addGT;
/********************************************END******************************************************/

//added by arun
/*
var addGT = function(req, res, temp){
	var tags = req.body.media[i]['prompt'];
	tags = tags.split(',');
	console.log(tags);
	var mediaID = req.body.media[i]['id'];
	console.log("Temp value -------->", temp);
	if (temp > 0) {
		for(i in tags){
			var flag = false;
			for (var k=0;k<temp;k++) {
				var prev_tags = req.body.media[k]['prompt'];
				prev_tags = prev_tags.split(',');
				for(j in prev_tags){
					if (tags[i] == prev_tags[j]) {
						flag = true;
						break;
					}
				}
			}
			if (flag == true) {
				console.log("---------Already Exists Yo ================>")
			}else{
				checkNSaveGT(tags[i], mediaID)
			}
		}
	} else{
		for(j in tags){
			if (tags[j] != '' && tags[j] != ' ') {
				var particular_tag = typeof(tags[j]) == 'string' ? tags[j].trim() : [];
				tags[j] = particular_tag;
				console.log('==========================================================================');
				console.log("Prev",tags[j-1]);
				console.log(tags[j]);
				console.log('==========================================================================');
				if (tags[j-1] != undefined) {
					var flag = false;
					console.log("J----> ",j);
					for(var k=0;k<j;k++){
						if (tags[j] == tags[k]) {
							flag = true;
							break;
						}
					}
					if (flag == true) {
						console.log("---------Already Exists Yo ================>")
					} else {
						checkNSaveGT(tags[j], mediaID)
					}
				} else{
					checkNSaveGT(tags[j], mediaID)
				}
			}
		}
	}
};

exports.addGT = addGT;
*/

/*________________________________________________________________________
	* @Date:      	2 Mar 2015
	* @Method :   	checkNSaveGT
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function checks if a gt with same name exists or not then save accordingly.
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
function checkNSaveGT(title, mediaID) {
	var title = typeof (title) == 'string' ? title.trim() : '';
	if (title != '') {
		groupTags.find({ "GroupTagTitle": { $regex: new RegExp("^"+title+"$", "i") }, $or: [{ "status": 3 }, { "status": 1 }] }).sort({ status: 1 }).exec(function (err, data) {
			if (err) {
				res.json(err);
			} else {
				if (data.length == 0) {
					var fields = {};
					fields.GroupTagTitle = title;
					fields.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';// for 8888
					fields.MetaTagID = '54c98aba4fde7f30079fdd5b';// for 8888
					fields.status = 3;
					fields.LastModified = Date.now();
					fields.DateAdded = Date.now();
					fields.Tags = [{ TagTitle: title, status: 1 }];
					fields.Think = [];
					fields.Less = [];
					fields.More = [];
					groupTags(fields).save(function (err, retGT) {
						if (!err) {
							saveGT_toMedia(retGT._id, mediaID);
						}
					});
				} else {
					saveGT_toMedia(data[0]._id, mediaID);
				}
			}
		})
	}
}
/********************************************END******************************************************/
/*________________________________________________________________________
	* @Date:      	29 June 2015
	* @Method :   	saveGT_toMedia
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-27 02 2015-
	* @Purpose:   	This function is used update gt field of media.
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/
async function saveGT_toMediaAsyncAwait(gtID, mediaID) {
	var mediasData = await media.findOne({ _id: ObjectId(mediaID) }).lean();
	if (mediasData) {
		var IsAlreadyThere = false;
		mediasData.GroupTags = Array.isArray(mediasData.GroupTags) ? mediasData.GroupTags : [];
		for (var loop = 0; loop < mediasData.GroupTags.length; loop++) {
			var mGroupTagID = mediasData.GroupTags[loop].GroupTagID ? mediasData.GroupTags[loop].GroupTagID : "NO_KEY";
			if (String(mGroupTagID) == String(gtID)) {
				IsAlreadyThere = true;
				break;
			}
		}
		if (!IsAlreadyThere) {
			mediasData.GroupTags.push({ GroupTagID: gtID });
			await media.update({_id: ObjectId(mediaID)}, {$set: {GroupTags: mediasData.GroupTags}}, {multi: false});
		}
	}
}

function saveGT_toMedia(gtID, mediaID) {
	media.findOne({ _id: mediaID }, function (err, media) {
		if (!err) {
			var IsAlreadyThere = false;
			for (var loop = 0; loop < media.GroupTags.length; loop++) {
				var mGroupTagID = media.GroupTags[loop].GroupTagID ? media.GroupTags[loop].GroupTagID : "NO_KEY";
				if (String(mGroupTagID) == String(gtID)) {
					IsAlreadyThere = true;
					break;
				}
			}
			if (!IsAlreadyThere) {
				media.GroupTags.push({ GroupTagID: gtID });
				media.save();
			}
		}
	})
}
/********************************************END******************************************************/


/*________________________________________________________________________
	* @Date:      	18 Mar 2015
	* @Method :   	videoUpload
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-27 02 2015-
	* @Purpose:   	This function is used for demo mobile video recording.
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/

var videoUpload = function (req, res) {
	saveFile(req, res, "Video");
};
exports.videoUpload = videoUpload;
/********************************************END******************************************************/



/*________________________________________________________________________
	* @Date:      	23 Mar 2015
	* @Method :   	videoUpload
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-27 02 2015-
	* @Purpose:   	This function is used for demo mobile video recording.
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/

var audioUpload = function (req, res) {
	saveFile(req, res, "Audio");
};
exports.audioUpload = audioUpload;
/********************************************END******************************************************/



/*________________________________________________________________________
	* @Date:      	23 Mar 2015
	* @Method :   	saveFile
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	--
	* @Purpose:   	This function is used to save audio video file.
	* @Param:     	5
	* @Return:    	-
	_________________________________________________________________________
*/
function saveFile(req, res, fileType) {
	console.log('========================================= here =========================================');
	var form = new formidable.IncomingForm();
	form.keepExtensions = true;     //keep file extension
	form.uploadDir = (__dirname + "/../../public/assets/Media/video/");       //set upload directory
	form.keepExtensions = true;     //keep file extension
	form.parse(req, function (err, fields, files) {
		console.log('========================================= here2 =========================================');
		console.log("file size: " + JSON.stringify(files.file.size));
		console.log("file path: " + JSON.stringify(files.file.path));
		console.log("file name: " + JSON.stringify(files.file.name));
		console.log("file type: " + JSON.stringify(files.file.type));
		console.log("lastModifiedDate: " + JSON.stringify(files.file.lastModifiedDate));
		var temp = files.file.name.split('.');
		var ext = temp.pop();
		var incNum = 0;
		var dateTime = new Date().toISOString().replace(/T/, '').replace(/\..+/, '').split(" ");
		counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				incNum = data.seq;
				var fileName = Date.now() + "_recording_" + incNum + "." + ext;

				fs.rename(files.file.path, __dirname + "/../../public/assets/Media/video/" + fileName, function (err) {
					if (err) {
						res.json(err);
					}
					else {
						//console.log("../assets/Media/video/Recorded_" + incNum + '.' + ext);
						console.log('renamed complete');
						if (fileType == 'Video') {
							video__anyToMP4OrWebm(fileName);
						} else {
							Audio__anyToMP3(fileName);
						}
						saveMedia__toDB(req, res, incNum, fileName, fileType);
						//res.json({'filename':"../assets/Media/video/Recorded_" + incNum + '.' + ext});
					}
				});
			}
		})
	});
}
/********************************************END******************************************************/

/*________________________________________________________________________
	* @Date:      	18 Mar 2015
	* @Method :   	saveMedia__toDB
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	--
	* @Purpose:   	This function is used for to add a document of video in media collection.
	* @Param:     	5
	* @Return:    	-
	_________________________________________________________________________
*/
function saveMedia__toDB(req, res, incNum, fileName, fileType) {
	if (req.session.user.FSGsArr2) {
	}
	else {
		req.session.user.FSGsArr2 = {};
	}
	if (incNum) {
		var thumbName = fileName.replace('.' + fileName.split('.').pop(), '.png');
		var locator = fileName.replace('.' + fileName.split('.').pop(), '');
		//'Recorded_'+incNum+'.png'

		var cType = 'video/webm';
		if (fileType == 'Audio') {
			cType = 'audio/mp3';
			thumbName = '';
		}

		dataToUpload = {
			Location: [],
			AutoId: incNum,
			UploadedBy: "user",
			UploadedOn: Date.now(),
			UploaderID: req.session.user._id,
			Source: "Thinkstock",
			SourceUniqueID: null,
			Domains: null,
			GroupTags: [],
			Collection: null,
			Status: 2,
			MetaMetaTags: null,
			MetaTags: null,
			AddedWhere: "board", //directToPf,board,capsule
			IsDeleted: 0,
			TagType: "",
			ContentType: cType,
			MediaType: fileType,
			AddedHow: 'recording',
			OwnerFSGs: req.session.user.FSGsArr2,
			IsPrivate: 1,
			Locator: locator,
			thumbnail: thumbName
		}

		dataToUpload.Location.push({
			Size: 1289,
			URL: fileName
		})


		media(dataToUpload).save(function (err, model) {
			if (err) {
				response.json(err);
			}
			else {
				dataToUpload._id = model._id;
				if (fileType == 'Video') {
					video__getNsaveThumbnail(fileName, dataToUpload._id);
				}

				console.log("==================================" + dataToUpload._id);
				res.json(dataToUpload);
			}
		});
	}
}
/********************************************END******************************************************/



/*________________________________________________________________________
	* @Date:      	19 March 2015
	* @Method :   	video__any_to_MP4OrWebm
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	Convert any recorded video to webm or mp4.
	* @Param:     	1
	* @Return:    	No
_________________________________________________________________________
*/
function video__anyToMP4OrWebm(inputFile) {
	if (inputFile) {
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();

		switch (extensionUpper) {
			case 'WEBM':
				outputFile = inputFile.replace('.' + extension, '.mp4');
				__convertVideo(inputFile, outputFile);
				break;

			case 'MP4':
				outputFile = inputFile.replace('.' + extension, '.webm');
				__convertVideo(inputFile, outputFile);
				break;

			case 'MOV':
				outputFile = inputFile.replace('.' + extension, '.mp4');
				__convertVideo(inputFile, outputFile);

				outputFile = inputFile.replace('.' + extension, '.webm');
				__convertVideo(inputFile, outputFile);
				break;

			default:
				console.log("------Unknown extension found = ", extension);
				if (extension != '' && extension != null) {
					outputFile = inputFile.replace('.' + extension, '.mp4');
					__convertVideo(inputFile, outputFile);

					outputFile = inputFile.replace('.' + extension, '.webm');
					__convertVideo(inputFile, outputFile);
				}
				break;
		}
	}
	return;
}


function __convertVideo(inputFile, outputFile) {
	var util = require('util'),
		exec = require('child_process').exec;

	var command = "ffmpeg -fflags +genpts -i " + process.urls.__VIDEO_UPLOAD_DIR + '/' + inputFile + " -r 24 " + process.urls.__VIDEO_UPLOAD_DIR + '/' + outputFile;

	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
			//response.statusCode = 404;
			//response.end();

		} else {
			console.log("==========Successfully converted from " + inputFile + " to " + outputFile);
		}
	});
}
/********************************************END******************************************************/





/*________________________________________________________________________
	* @Date:      	2 Mar 2015
	* @Method :   	checkNSaveGT
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function checks if a gt with same name exists or not then save accordingly.
	* @Param:     	1
	* @Return:    	Yes
_________________________________________________________________________
*/
function video__getNsaveThumbnail(inputFile, MediaId) {
	var util = require('util'),
		exec = require('child_process').exec;

	//var command = "ffmpeg -i " + audioFile + " -i " + videoFile + " -map 0:0 -map 1:0 " + mergedFile;
	//var command = "ffmpeg -i " + inputFile + " -vframes 1 "+output.png;

	var outputThumbnail = Date.now();
	var outputThumbnailArr = [];

	outputThumbnailArr = inputFile.split('.');
	if (outputThumbnailArr.length)
		outputThumbnail = outputThumbnailArr[0];

	outputThumbnail = outputThumbnail + '.png';

	var command = "ffmpeg -i " + process.urls.__VIDEO_UPLOAD_DIR + '/' + inputFile + " -vframes 1 " + process.urls.__VIDEO_UPLOAD_DIR + '/' + outputThumbnail;
	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			try {
				console.log('exec error: ' + error);
				response.statusCode = 404;
				response.end();
			}
			catch (e) {

			}

		}
		else {
			//success case
			saveRequiredThumbnail__video(outputThumbnail);

			//update media thumbnail
			media.update({ "_id": MediaId }, { $set: { "thumbnail": outputThumbnail } }, {}, function (err, numAffected) {
				if (err) {
					console.log("err = ", err);
				}
				else {
					console.log("numAffected = ", numAffected);
				}
			});
		}
	});
}
/********************************************END******************************************************/

var saveRequiredThumbnail__video = function (file_name) {
	//add thumbnail code
	var imgUrl = file_name;
	var mediaCenterPath = "/../../public/assets/Media/video/";
	var srcPath = __dirname + mediaCenterPath + imgUrl;

	if (fs.existsSync(srcPath)) {
		var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
		var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
		var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
		var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
		var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;
		var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

		crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
		crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
		crop_image(srcPath, dstPathCrop_SG, 300, 300);
		//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
		resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
		resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
	}

}



function Audio__anyToMP3(inputFile) {
	if (inputFile) {
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();

		switch (extensionUpper) {
			case 'OGG':
				outputFile = inputFile.replace('.' + extension, '.mp3');
				__convertAudio(inputFile, outputFile);
				break;

			case 'WAV':
				outputFile = inputFile.replace('.' + extension, '.mp3');
				__convertAudio(inputFile, outputFile);
				break;

			case 'MP3':
				//no need to convert
				break;

			default:
				console.log("------Unknown extension found = ", extension);
				if (extension != '' && extension != null) {
					outputFile = inputFile.replace('.' + extension, '.mp3');
					__convertAudio(inputFile, outputFile);
				}
				break;
		}
	}
	return;
}


function __convertAudio(inputFile, outputFile) {
	var util = require('util'),
		exec = require('child_process').exec;

	var command = "ffmpeg -fflags +genpts -i " + process.urls.__VIDEO_UPLOAD_DIR + '/' + inputFile + " -r 24 " + process.urls.__VIDEO_UPLOAD_DIR + '/' + outputFile;

	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
			//response.statusCode = 404;
			//response.end();

		} else {
			console.log("==========Successfully converted from " + inputFile + " to " + outputFile);
		}
	});
}



/*________________________________________________________________________
	* @Date:      	03 April 2015
	* @Method :   	viewMediaAdmin
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function gets media details is used in setMediaIdd_uploadCase function in dragDropCtrl.js .
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
/// parul 03-04-2015
var viewMediaAdmin = function (req, res) {
	console.log('in view media admin');
	console.log(req.body);
	media.find({ _id: req.body.ID }, function (err, data) {
		if (!err) {
			res.json({ "code": "200", "message": "success", "result": data })
		} else {
			console.log(err); return;
		}
	}).populate('MetaMetaTags SourceUniqueID Domains Collection GroupTags.GroupTagID')
};
exports.viewMediaAdmin = viewMediaAdmin;
/********************************************END******************************************************/


/*________________________________________________________________________
	* @Date:      	08 April 2015
	* @Method :   	getBoardMedia
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function gets media details is used in AddBoardsMediasToBoard_v_2 function in uploadMediaCtrl.js .
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
// parul 08-04-2015
var getBoardMedia = function (req, res) {
	console.log('in view media admin');
	console.log(req.body);
	board.find({ 'Medias._id': req.body.ID }, { 'Medias.$': 1 }, function (err, data) {
		if (!err) {
			media.find({ _id: data[0].Medias[0].MediaID }, function (er, dt) {
				if (!er) {
					res.json({ "code": "200", "message": "success", "result": dt })
				} else {
					res.json(err);
				}
			})

		} else {
			console.log(err); return;
		}
	});
};
exports.getBoardMedia = getBoardMedia;
/********************************************END******************************************************/




/*________________________________________________________________________
	* @Date:      	08 April 2015
	* @Method :   	findAll_subAdmin
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function gets media for sub admin mass media uploader. a modification of find all function .
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
/// parul 08-04-2015
var findAll_subAdmin = function (req, res) {
	var fields = {};
	fields.UploaderID = req.session.subAdmin._id;
	if (typeof (req.body.title) != 'undefined') {
		if (req.body.title != "") {
			fields['Title'] = new RegExp(req.body.title, 'i');
		}
		fields['Status'] = 1;
	}
	else {
		fields['Status'] = 0;
	}

	if (req.body.gt != null && req.body.gt != "") {
		fields['GroupTags.GroupTagID'] = req.body.gt
	}
	//added by parul
	if (req.body.collection != null && req.body.collection != "") {
		fields['Collection.CollectionID'] = req.body.collection
	}
	console.log('================================================================================');
	console.log(fields);
	media.find(fields).sort({ UploadedOn: 'desc' }).skip(req.body.offset).limit(req.body.limit).exec(function (err, result) {

		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
			}
			else {
				media.find({ Status: 0, UploaderID: req.session.subAdmin._id }).sort({ UploadedOn: 'desc' }).exec(function (err, resultlength) {
					if (err) {
						res.json(err);
					}
					else {
						console.log("yes confirmed return.....");
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength.length });

					}
				})
			}
		}
	})

};

exports.findAll_subAdmin = findAll_subAdmin;
/********************************************END******************************************************/



/*________________________________________________________________________
	* @Date:      	14 April 2015
	* @Method :   	makePublic
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function update certain media's isPrivate attribute to 1 .
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/

/// parul 14-04-2015

var makePublic = function (req, res) {
	media.update({ _id: req.body.ID }, { $set: { IsPrivate: 0 } }, function (err, data) {
		if (!err) {
			res.json({ "code": "200", "msg": "Success" });
		} else {
			res.json(err);
		}
	});
}
exports.makePublic = makePublic;
/************************edi********************END******************************************************/

var add__Descriptors = function (tags, mediaId) {
	//var tags = req.body.media[i]['prompt'];
	tags = tags.split(',');
	dup_tags = [];
	console.log(tags);
	//console.log()
	for (var a = 0; a < tags.length; a++) {
		var flag = 0;
		var tagStr = typeof (tags[a]) == 'string' ? tags[a].trim().replace(/[^a-zA-Z0-9 \-\\]/g, "") : '93w844923469126';
		if (dup_tags.indexOf(tagStr) == -1) {
			dup_tags.push(tagStr);
		}
	}
	tags = dup_tags;
	for (j in tags) {
		var tagStr = tags[j];
		if (tagStr != '' && tagStr != '93w844923469126') {
			//console.log('==========================================================================');
			//console.log(tags[j]);
			//console.log('==========================================================================');
			checkNSaveGT(tagStr, mediaId)
		}
	}
}


//for testing faulty images
var get_faulty_images = function (req, res) {
	var faultyImages = {};
	faultyImages.records = [];

	var ifCounter = 0;
	var else1Counter = 0;
	var else2Counter = 0;
	var else3Counter = 0;

	var opLimit = 0;

	var startpoint = 0;
	var endpoint = 0;
	if (req.query.start) {
		startpoint = req.query.start;
	}
	if (req.query.end) {
		endpoint = req.query.end;
	}

	media.find({ MediaType: "Image" }, { _id: 1, Location: 1, Locator: 1 }).sort({ UploadedOn: 'desc' }).skip(startpoint).limit(endpoint).exec(function (err, data) {
		if (!err) {
			opLimit = data.length;
			for (var loop = 0; loop < opLimit; loop++) {
				var mObj = {};
				mObj = data[loop];
				identify_faulty_image(mObj);
			}

		} else {
			console.log(err); return;
		}
	})

	var im = require('imagemagick');
	function identify_faulty_image(mObj) {
		try {
			var imgName = mObj.Location["0"]["URL"];
			var mediaCenterPath = "/../../public/assets/Media/img/600/";
			var srcPath = __dirname + mediaCenterPath + imgName;

			if (fs.existsSync(srcPath)) {
				im.identify(srcPath, function (err, features) {
					if (err) {
						console.log(err);
						else1Counter++;
						keepTrack(0);

					} else {
						console.log(features.width + "======================" + features.height);
						if (features.height < 600 || features.width < 600) {
							ifCounter++;
							keepTrack(mObj);
						}
						else {
							else2Counter++;
							keepTrack(0);
						}
					}
				})
			}
			else {
				else3Counter++;
				keepTrack(0);
				console.log("srcPath ====> ", srcPath);
			}
		}
		catch (e) {
			console.log("=========================ERROR : ", e);
		}
	}

	function keepTrack(mObj) {
		if (mObj != 0) {
			faultyImages.records.push(mObj);
		}

		if (opLimit == (ifCounter + else1Counter + else2Counter + else3Counter)) {
			res.json({ "code": "200", "message": "success : " + opLimit + " ==  ( " + ifCounter + " + " + else1Counter + " + " + else2Counter + " + " + else3Counter + " )", "result": faultyImages })
		}
	}
}
exports.get_faulty_images = get_faulty_images;
/********************************************END******************************************************/



/*________________________________________________________________________
	* @Date:      	20 April 2015
	* @Method :   	froala_file
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used by froala text editor to upload files .
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/

/// parul 20-04-2015
var froala_file = function (req, res) {
	var form = new formidable.IncomingForm();
	console.log('--------------------------------------------------------------------------------------------------------------');
	form.parse(req, function (err, fields, files) {
		console.log("Fields", files.file);
		if (files.file.name) {
			uploadDir = __dirname + "/../../public/assets/Media/img";
			file_name = files.file.name;
			file_name = file_name.split('.');
			ext = file_name[file_name.length - 1];
			RecordLocator = file_name[0];
			var name = '';
			name = dateFormat() + '_' + Math.floor((Math.random() * 3333333) + 1);
			file_name = name + '.' + ext;
			//saving file
			fs.renameSync(files.file.path, uploadDir + "/" + file_name)
			if (files.file.type == "application/pdf" || files.file.type == "application/msword" || files.file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || files.file.type == "application/vnd.ms-excel" || files.file.type == "application/vnd.oasis.opendocument.spreadsheet" || files.file.type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || files.file.type == "application/vnd.ms-powerpoint" || files.file.type == 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
				//media_type='Document';
			}
			else if (files.file.type == 'video/mp4' || files.file.type == 'video/ogg') {
				//media_type='Video';
			}
			else if (files.file.type == 'audio/mpeg' || files.file.type == 'audio/ogg') {
				//media_type='Audio';
			}
			else {
				//media_type='Image';
				//add thumbnail code
				var imgUrl = file_name;
				var mediaCenterPath = "/../../public/assets/Media/img/";
				var srcPath = __dirname + mediaCenterPath + imgUrl;
				if (fs.existsSync(srcPath)) {
					var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
					var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
					var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
					var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
					var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

					var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

					crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
					crop_image(srcPath, dstPathCrop_SG, 300, 300);
					crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
					//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
					resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
					resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

				}
			}
			console.log('-------------------------------------------------------------------------------');
			// for future ref see 	uploadmedia function in boardController
			setTimeout(function () {
				res.json({ link: '/assets/Media/img/' + process.urls.medium__thumbnail + "/" + imgUrl });
			}, 3000)

		} else {
			res.json({ error: 'File not found.' })
		}
	})
	//console.log(req);
	console.log('--------------------------------------------------------------------------------------------------------------');
}
exports.froala_file = froala_file;
/********************************************END******************************************************/





/*________________________________________________________________________
	* @Date:      	21 April 2015
	* @Method :   	note_screenshot
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to save note screenshots.
	* @Param:     	2
	* @Return:    	Yes
_________________________________________________________________________
*/
/// parul 21-04-2015
var note_screenshot = function (req, res) {
	var fields = req.body;
	var name = '';
	name = dateFormat() + '_' + Math.floor((Math.random() * 3333333) + 1);

	var imagename = __dirname + "/../../public/assets/Media/img/" + name + ".png"; //updated by manishp on 23122014 at 10 PM
	fs.writeFile(imagename, fields.image, 'base64', function (err) {
		if (err) {
			console.log("ERROOORR");
			console.log(err);
			console.log("imagename = ", imagename);
			res.json(err);
		} else {
			//add thumbnail code
			var imgUrl = name + ".png";
			var mediaCenterPath = "/../../public/assets/Media/img/";
			var srcPath = __dirname + mediaCenterPath + imgUrl;

			if (fs.existsSync(srcPath)) {
				var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
				var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
				var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
				var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
				var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;
				var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

				crop_image__Note(srcPath, dstPathCrop_SMALL, 100, 100);
				crop_image__Note(srcPath, dstPathCrop_SG, 300, 300);
				crop_image__Note(srcPath, dstPathCrop_MEDIUM, 600, 600);
				//crop_image__Note(srcPath, dstPathCrop_LARGE, 1200, 1200);
				resize_image__Note(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
				resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

			}
			setTimeout(function () {
				res.json({ "code": "200", "message": "success", "link": '/assets/Media/img/' + process.urls.medium__thumbnail + "/" + imgUrl })
			}, 1000)
		}
	});

}
exports.note_screenshot = note_screenshot;


// For Filterd data added by arun
var filteredData = function (req, res) {

	fields = {};

	fields['IsDeleted'] = 0;
	if (req.body.domain != null && req.body.domain != "") {
		fields['Domains'] = req.body.domain
	}

	//added by parul 09022015
	if (req.body.Media != null && req.body.domain != "") {
		if (req.body.locator == 'record') {
			fields['Locator'] = { $regex: req.body.Media };
		} else {
			fields['AutoId'] = req.body.Media;
		}

	}
	//added by parul 09012015
	//if(req.body.status!=null && req.body.status!=""){
	//	if(req.body.status==0){
	//		fields['Status']={'$ne':2};
	//	}else{
	//		fields['Status']=req.body.status;
	//	}
	//
	//}
	//fields['IsPrivate']={$exists:false,$ne:1};
	fields['$or'] = [{ IsPrivate: { '$exists': false } }, { IsPrivate: { $exists: true, $ne: 1 } }];

	if (req.body.status != null && req.body.status != "") {
		fields['Status'] = req.body.status
	} else {
		fields['Status'] = { '$nin': [2, 3] };
	}
	//end of 09012015
	if (req.body.source != null && req.body.source != "") {
		fields['SourceUniqueID'] = req.body.source
	}

	//if(req.body.collection!=null && req.body.collection!=""){
	//	fields['Collection']=req.body.collection
	//}commented by parul
	if (req.body.gt != null && req.body.gt != "") {
		//fields.GroupTags=[];
		fields['GroupTags.GroupTagID'] = req.body.gt
	}
	//added by parul 26 dec 2014
	if (req.body.collection != null && req.body.collection != "") {
		//fields.GroupTags=[];
		fields['Collection'] = { $in: [req.body.collection] };
	}
	if (req.body.mmt != null && req.body.mmt != "") {
		fields['MetaMetaTags'] = req.body.mmt
	}
	if (req.body.mt != null && req.body.mt != "") {
		fields['MetaTags'] = req.body.mt
	}
	if (req.body.whereAdded) {
		fields['AddedWhere'] = req.body.whereAdded
	}
	if (req.body.tagtype) {
		fields['TagType'] = req.body.tagtype
	}
	if (req.body.howAdded) {
		fields['AddedHow'] = req.body.howAdded
	}
	if (req.body.mediaType) {

		if (req.body.mediaType == 'Image') {
			fields['$or'] = [{ "MediaType": 'Image' }, { "MediaType": 'Link', "LinkType": 'image' }];
		}
		else if (req.body.mediaType == 'Link') {
			fields['MediaType'] = req.body.mediaType;
			fields['LinkType'] = { $ne: 'image' };
		}
		else {
			fields['MediaType'] = req.body.mediaType;
		}

	}

	if (req.body.inappropriate) {
		if (req.body.inappropriate > 0 && req.body.inappropriate < 5) {
			fields['InAppropFlagCount'] = { $gte: req.body.inappropriate }
		}
		else if (req.body.inappropriate >= 5) {
			fields['InAppropFlagCount'] = { $gte: req.body.inappropriate }
		}
		else {
			//leave it
			fields['InAppropFlagCount'] = 0;
		}
	}

	if (req.body.dtEnd != null && req.body.dtStart != null) {
		var end = req.body.dtEnd;
		var start = req.body.dtStart;
		var end_dt = end.split('/');
		var start_dt = start.split('/');
		start_dt[0] = start_dt[0] - 1;
		end_dt[0] = end_dt[0] - 1;

		console.log(start_dt);
		console.log(end_dt);

		var start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
		var end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

		fields['UploadedOn'] = { $lte: end_date, $gte: start_date }
	}

	//fields['Status']={'$ne':2}; //commented and moved to else condition of status by parul 09012015
	/*if(req.body.gt!=null && req.body.gt!=""){
		fields.GroupTags=[];
		fields.GroupTags.GroupTagID=req.body.gt
	}*/

	console.log(fields);//return;

	//fields = {};
	if (req.body.keywordsSearch != null && req.body.keywordsSearch != "" || req.body.addAnotherTag != null && req.body.addAnotherTag != "" || req.body.excludeWord != null && req.body.excludeWord != "") {
		console.log(req.body.keywordsSearch);
		console.log(req.body.addAnotherTag);
		console.log(req.body.excludeWord);
		if (req.body.gt != null && req.body.gt != "") {
			//fields.GroupTags=[];
			req.body.keywordsSearch.push(req.body.gt);
			delete fields['GroupTags.GroupTagID'];

			if (req.body.addAnotherTag)
				req.body.keywordsSearch.concat(req.body.addAnotherTag);
		}

		fields["GroupTags.GroupTagID"] = { $in: req.body.keywordsSearch, $nin: req.body.excludeWord };
	}

	//added by manishp on 12022016 - for avoiding the listing of contentPage medias
	fields['AddedWhere'] = { $ne: "contentPage" };


	console.log("Fields---------", fields);//return;
	var offset = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 0;
	var parameters = {
		Posts: false,
		Marks: false,
		Stamps: false,
		GroupTags: false,
		OwnerFSGs: false
	};

	media.find(fields, parameters).sort({ UploadedOn: 'desc' }).skip(offset).limit(limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		} else {
			media.find(fields, { _id: 1 }).count().exec(function (err, resultlength) {
				if (err) {
					res.json(err);
				}
				else {
					if (resultlength > 0) {
						//res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });
					}
					else {
						res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
					}
				}
			})
		}
	})

};
exports.filteredData = filteredData;


// To push new tag to Existing Media by Arun Sahani
var addedTag = function (req, res) {
	console.log("Info to add", req.body.addedTag);
	var fields = {
		GroupTagID: req.body.addedTag.gt,
		MetaMetaTagID: req.body.addedTag.mmt,
		MetaTagID: req.body.addedTag.mt
	};
	media.find({ "_id": req.body.mediaId }).exec(function (err, result) {
		if (err) {

		} else {
			var flag = false;
			for (var j = 0; j < result[0].GroupTags.length; j++) {
				if (result[0].GroupTags[j].GroupTagID == req.body.addedTag.gt) {
					flag = true;
					console.log("---------Exists-----------");
				}
			}
			if (flag == true) {
				res.json({ "code": "200", "msg": "exists" });
			} else {
				media.update({ "_id": req.body.mediaId }, { $push: { GroupTags: fields } }).exec(function (err, data) {
					if (err) {
					} else {
						console.log("---------Pushed Successfully-----------")
						res.json({ "code": "200", "msg": "Success", "response": data });
					}
				});
			}


		}
	});


};
exports.addedTag = addedTag;


// To delete Descriptor to Existing Media by Arun Sahani

var deleteDescriptor = function (req, res) {

	console.log("Info id of media", req.body.mediaId);
	console.log("Info id to Remove", req.body.descriptorId);
	console.log("Info Title to Remove", req.body.descriptorTitle);
	var prompt = req.body.descriptorTitle;
	media.findOne({ _id: req.body.mediaId }).exec(function (err, data) {
		if (err) {
			res.json(err);
		} else {
			var promptArr1 = data.Prompt.split(',');
			var txt = (req.body.descriptorTitle).toLowerCase();
			var index = promptArr1.indexOf(txt);
			if (index > -1) {
				promptArr1.splice(index, 1);
			}

			var promptArr = promptArr1.join();
			console.log("Result", promptArr);
			media.update({ _id: req.body.mediaId }, { $pull: { GroupTags: { GroupTagID: req.body.descriptorId } } }).exec(function (err, data1) {
				if (err) {
					res.json(err);
				} else {
					media.update({ _id: req.body.mediaId }, { $set: { Prompt: promptArr } }).exec(function (err, desc) {
						if (err) {
							res.json(err);
						} else {
							res.json({ "code": "200", "msg": "Success" });
						}
					})

				}
			});

		}
	});


};
exports.deleteDescriptor = deleteDescriptor;

// For Edit Media
var editMedia = function (req, res) {
	console.log("Edit info", req.body.media);
	media.update({ _id: req.body.media._id }, { $set: req.body.media }).exec(function (err, data) {
		if (err) {
			res.json(err);
		} else {
			res.json({ "code": "200", "msg": "Success", "response": data });
		}
	});
};
exports.editMedia = editMedia;


var searchByLocatorList = function (req, res) {

	var fields = {};

	fields['IsDeleted'] = 0;
	if (req.body.domain != null && req.body.domain != "") {
		fields['Domains'] = req.body.domain
	}

	//added by parul 09022015
	if (req.body.Media != null && req.body.domain != "") {
		if (req.body.locator == 'record') {
			fields['Locator'] = { $regex: req.body.Media };
		} else {
			fields['AutoId'] = req.body.Media;
		}

	}
	fields['$or'] = [{ IsPrivate: { '$exists': false } }, { IsPrivate: { $exists: true, $ne: 1 } }];

	if (req.body.status != null && req.body.status != "") {
		fields['Status'] = req.body.status
	} else {
		fields['Status'] = { '$nin': [2, 3] };
	}

	if (req.body.source != null && req.body.source != "") {
		fields['SourceUniqueID'] = req.body.source
	}

	if (req.body.gt != null && req.body.gt != "") {
		fields['GroupTags.GroupTagID'] = req.body.gt
	}

	if (req.body.collection != null && req.body.collection != "") {
		fields['Collection'] = { $in: [req.body.collection] };
	}
	if (req.body.mmt != null && req.body.mmt != "") {
		fields['MetaMetaTags'] = req.body.mmt
	}
	if (req.body.mt != null && req.body.mt != "") {
		fields['MetaTags'] = req.body.mt
	}
	if (req.body.whereAdded) {
		fields['AddedWhere'] = req.body.whereAdded
	}
	if (req.body.tagtype) {
		fields['TagType'] = req.body.tagtype
	}
	if (req.body.howAdded) {
		fields['AddedHow'] = req.body.howAdded

		//added by manishp on 12022016 - for avoiding the listing of contentPage medias
		fields['AddedWhere'] = { $eq: req.body.howAdded, $ne: "contentPage" };
	}
	if (req.body.mediaType) {

		if (req.body.mediaType == 'Image') {
			fields['$or'] = [{ "MediaType": 'Image' }, { "MediaType": 'Link', "LinkType": 'image' }];
		}
		else if (req.body.mediaType == 'Link') {
			fields['MediaType'] = req.body.mediaType;
			fields['LinkType'] = { $ne: 'image' };
		}
		else {
			fields['MediaType'] = req.body.mediaType;
		}

	}
	if (req.body.dtEnd != null && req.body.dtStart != null) {
		var end = req.body.dtEnd;
		var start = req.body.dtStart;
		var end_dt = end.split('/');
		var start_dt = start.split('/');
		start_dt[0] = start_dt[0] - 1;
		end_dt[0] = end_dt[0] - 1;

		console.log(start_dt);
		console.log(end_dt);

		var start_date = new Date(start_dt[2], start_dt[0], start_dt[1], 0, 0, 0);
		var end_date = new Date(end_dt[2], end_dt[0], end_dt[1], 23, 59, 59);

		fields['UploadedOn'] = { $lte: end_date, $gte: start_date }
	}

	console.log(fields);//return;

	if (req.body.keywordsSearch != null && req.body.keywordsSearch != "" || req.body.addAnotherTag != null && req.body.addAnotherTag != "" || req.body.excludeWord != null && req.body.excludeWord != "") {
		console.log(req.body.keywordsSearch);
		console.log(req.body.addAnotherTag);
		console.log(req.body.excludeWord);
		//req.body.keywordsSearch = req.body.keywordsSearch ? req.body.keywordsSearch : [];

		//if grouptag is selected from drop-down then -
		if (req.body.gt != null && req.body.gt != "") {
			req.body.keywordsSearch.push(req.body.gt);
			delete fields['GroupTags.GroupTagID'];
		}

		//if another tag is added
		if (req.body.addAnotherTag) {
			req.body.keywordsSearch = req.body.keywordsSearch.concat(req.body.addAnotherTag);
		}

		//Required condition because using $in....
		if (req.body.keywordsSearch.length) {
			fields["GroupTags.GroupTagID"] = { $in: req.body.keywordsSearch, $nin: req.body.excludeWord };
		}
		else {
			fields["GroupTags.GroupTagID"] = { $nin: req.body.excludeWord };
		}
	}

	console.log("Fields---------", fields);//return;
	//using column as fields : as you can see fields has been taken as conditions earlier - agree bad code!!!
	var columns = {
		_id: true,
		AutoId: true,
		Locator: true
	};

	var limit = 1000;

	media.find(fields, columns).sort({ AutoId: 1, Locator: 1 }).limit(limit).exec(function (err, result) {
		if (err) {
			res.json(err);
		} else {
			media.find(fields, { _id: 1 }).count().exec(function (err, resultlength) {
				if (err) {
					res.json(err);
				}
				else {
					if (resultlength > 0) {
						//res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });
					}
					else {
						res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
					}
				}
			})
		}
	})
};
exports.searchByLocatorList = searchByLocatorList;

// to find all selected media - added by arun on 05042016
var findSelectedMedia = function (req, res) {
	console.log("-------------------------------------");
	console.log("req.body", req.body.selectedMedia);
	req.body.selectedMedia = req.body.selectedMedia ? req.body.selectedMedia : [];

	media.find({ _id: { $in: req.body.selectedMedia } }).exec(function (err, results) {
		if (err) {
			res.json({ "status": "error", "message": err });

		}
		else {
			res.json({ "status": "success", "results": results });

		}
	});
};

exports.findSelectedMedia = findSelectedMedia;

// to find by page- added by arun on 26052016
var searchByPage = function (req, res) {
	console.log("-------------------------------------");
	console.log("Skip", req.body.skip);
	console.log("Limit", req.body.limit);

	console.log("userFSGs: ", req.body.userFSGs);

	var conditions = {};
	var keywordsSelected = [],
		excludeTag = [];

	conditions.IsDeleted = 0;
	conditions.Status = 1;
	conditions.IsPrivate = { $ne: 1 };
	conditions.IsUnsplashImage = true;
	if (req.body.StyleKeyword) {
		conditions["StyleKeyword"] = req.body.StyleKeyword;
	}


	if (req.body.userFSGs.Gender) {
		conditions["OwnerFSGs.Gender"] = req.body.userFSGs.Gender;
	}
	if (req.body.userFSGs.Relation) {
		conditions["OwnerFSGs.Relation"] = req.body.userFSGs.Relation;
	}
	if (req.body.userFSGs.Level) {
		conditions["OwnerFSGs.Level"] = req.body.userFSGs.Level;
	}
	if (req.body.userFSGs.Industry) {
		conditions["OwnerFSGs.Industry"] = req.body.userFSGs.Industry;
	}

	if (req.body.userFSGs['Size of Co']) {
		conditions["OwnerFSGs.Size of Co"] = req.body.userFSGs['Size of Co'];
	}
	if (req.body.userFSGs['Country of Affiliation']) {
		conditions["OwnerFSGs.Country of Affiliation"] = req.body.userFSGs['Country of Affiliation'];
	}

	var skipVal = req.body.skip ? req.body.skip : 0;
	var limitTo = req.body.limit ? req.body.limit : 100;
	console.log("Skip var: ", skipVal);
	console.log("Limit var: ", limitTo);

	if (req.body.keywordsSelcted != null && req.body.keywordsSelcted != "" || req.body.addAnotherTag != null && req.body.addAnotherTag != "" || req.body.excludeTag != null && req.body.excludeTag != "") {
		for (var i = 0; i < req.body.keywordsSelcted.length; i++) {
			keywordsSelected.push(req.body.keywordsSelcted[i].id);
		}
		for (var i = 0; i < req.body.addAnotherTag.length; i++) {
			keywordsSelected.push(req.body.addAnotherTag[i].id);
		}
		for (var i = 0; i < req.body.excludeTag.length; i++) {
			excludeTag.push(req.body.excludeTag[i].id);
		}
		console.log("keywordsSelcted:", keywordsSelected);
		console.log("excludeTag:", excludeTag);

		console.log("Updated keywordsSelected", keywordsSelected);
		conditions["GroupTags.GroupTagID"] = { $in: keywordsSelected, $nin: excludeTag };
	}
	//console.log("$$$$$$$$$$$$$",conditions);

	media.find(conditions).skip(skipVal).limit(limitTo).exec(function (err, results) {
		if (err) {
			res.json({ "status": "error", "message": err });
		}
		else {
			console.log("conditions :-----", conditions)

			media.find(conditions).count().exec(function (err, mediaCount) {
				if (err) {
					res.json({ "status": "error", "message": err });
				} else {

					res.json({ "status": "success", "results": results, "count": mediaCount });
				}
			});
		}
	});
};

exports.searchByPage = searchByPage;

var uploadLink__createByOwner = function (req, res) {
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				console.log('=========================')
				console.log(data);
				//data.seq=(data.seq)+1;
				console.log(data.seq);
				incNum = data.seq;
				//data.save();
				console.log("incNum=" + incNum);
				var type = 'Link';
				if (req.body.type == 'Notes') {
					type = 'Notes';
					name = dateFormat();
					//name = Date.now();//18022015
				}
				if (req.body.type == 'Montage') {
					type = 'Montage';
					name = 'montage_' + incNum;
				}
				console.log("---------------req.body.type = " + req.body.type);

				var LinkType = '';
				if (req.body.linkType) {
					LinkType = req.body.linkType;
				}

				var thumbnail = '';
				if (req.body.thumbnail) {
					thumbnail = req.body.thumbnail;
					if (type == 'Link') {

						//console.log("Thumbnail = "+thumbnail);
						var url = require('url');
						var f = '';
						var fArr = [];
						//var fileName = "web-link-"+Date.now()+url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
						f = url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
						fArr = f.split('.');
						RecordLocator = fArr[0];
						console.log("RecordLocator = " + RecordLocator);//return;
						ext = fArr[fArr.length - 1];
						//var fileName = Date.now()+'_'+incNum+'.'+ext;
						var name = '';
						name = RecordLocator;
						var fileName = dateFormat() + '_' + incNum + '.' + ext;
						//async_libhronous call - child process command execution
						saveFileFromUrl(thumbnail, fileName);
						thumbnail = fileName;
					}
				}
				console.log("------------------name = ", name);

				var dataToUpload = {
					Location: [],
					AutoId: incNum,
					UploadedBy: "owner",
					UploadedOn: Date.now(),
					UploaderID: req.session.user._id,
					Source: "",
					//SourceUniqueID:null,
					SourceUniqueID: "53ceb02d3aceabbe5d573dba", //updated on 06012015
					//Domains:null,
					Domains: "53ad6993f222ef325c05039c",
					GroupTags: [],
					//Collection:null,
					Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
					//Status:0,
					Status: 2, //updated on 25122014 by manishp after discussing with amitchh - for more detail on Status codes check the comments on media model
					MetaMetaTags: null,
					MetaTags: null,
					//AddedWhere:"directToPf", //directToPf,hardDrive,dragDrop
					AddedWhere: "board", //directToPf,board,capsule
					IsDeleted: 0,
					TagType: "",
					Content: req.body.content,
					ContentType: type,
					MediaType: type,
					AddedHow: type,
					thumbnail: thumbnail,	//added on 24122014 by manishp embedded link thumbnail case.
					Locator: name + "_" + incNum,
					LinkType: LinkType,
					OwnerFSGs: req.session.user.FSGsArr2,
					OwnStatement: req.body.Statement ? req.body.Statement : "",	//The Original statement by the image owner
					CurrStatement: req.body.Statement ? req.body.Statement : "",	// Statement currently in use
					IsPrivate: true	//It's a private-set of media which owner do not want to display for public search gallery.
				}
				if (req.body.Prompt) {
					dataToUpload.Prompt = req.body.Prompt;
				}
				dataToUpload.Location.push({
					Size: "",
					URL: ""
				})

				if (req.body.Title) {
					dataToUpload.Title = req.body.Title;
				}

				//console.log("dataToUpload = ",dataToUpload);return;
				media(dataToUpload).save(function (err, tata) {
					if (err) {
						res.json({ "code": "404", "message": err });
					}
					else {
						if (req.body.Prompt) {
							add__Descriptors(req.body.Prompt, tata._id);
						}
						res.json({ "code": "200", "message": "success", "response": tata })
					}
				});

			}
		});

}
exports.uploadLink__createByOwner = uploadLink__createByOwner;	//owner is adding links by drag-drop in create sg page.


//for temporary use - creating small version of aspectfit for search gallery so loading will be smoth.
var createResizedVersion = function (req, res) {
	var skipValue = parseInt(req.query.skip) ? parseInt(req.query.skip) : 0;
	var limitValue = parseInt(req.query.limit) ? parseInt(req.query.limit) : 100;

	console.log("skipValue = " + skipValue + "------------------limitValue = " + limitValue);

	var conditions = {
		//IsDeleted :0

	}
	var fields = {
		Posts: 0,
		Stamps: 0,
		Marks: 0,
		GroupTags: 0
	}

	faultyMediaModel.find(conditions, fields).sort({ AutoId: -1 }).skip(skipValue).limit(limitValue).exec(function (err, result) {
		if (!err) {
			var resultCount = result.length;
			console.log('Total----------------------------------------------------', resultCount);
			if (resultCount) {
				//code
				for (var loop = 0; loop < resultCount; loop++) {
					//console.log(loop,'---------------------------',result[loop]);return
					doItNow(result[loop]);

					if (loop == resultCount - 1) {
						//code
						res.json({ code: 200, message: "All Done! Total " + resultCount + "media have been resized." });
					}
				}

				function doItNow(mediaRecord) {

					var imgUrl = mediaRecord.Location[0].URL ? mediaRecord.Location[0].URL : (mediaRecord.Thumbnail ? mediaRecord.Thumbnail : (mediaRecord.thumbnail ? mediaRecord.thumbnail : false));
					//console.log('---------------------------',imgUrl);
					if (imgUrl) {
						//code
						var mediaCenterPath = "/../../public/assets/Media/img/";
						var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

						var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						//console.log('---------------------------',dstPathCrop_ORIGNAL);return
						if (fs.existsSync(srcPath)) {

							if (resize_image(srcPath, dstPathCrop_ORIGNAL, 575, 360)) {
								console.log('---------------------------bauji ho gya');
							} else {
								//console.log('---------------------------bauji galt bat');

							}// 575,360
							//console.log('-------------------------------------------------------Done IT');return
							//console.log("-------------------------Success with imgUrl........::::::::::::");
						}
						else {

							console.log("srcPath = " + srcPath + "---------dstPath = " + dstPathCrop_ORIGNAL);
						}
					}
					else {
						console.log("-------------------------Something went wrong with imgUrl........::::::::::::");
					}
				}
			}
			else {
				res.json({ code: 200, message: "All Done!" });

			}

		}
	})

}
exports.createResizedVersion = createResizedVersion;


//for temporary use - creating faulty Images log.



var createFaultyLogs = function (req, res) {
	//console.log('------------------------------------I am In');return false;
	var skipValue = parseInt(req.query.skip) ? parseInt(req.query.skip) : 0;
	var limitValue = parseInt(req.query.limit) ? parseInt(req.query.limit) : 100;

	console.log("skipValue = " + skipValue + "------------------limitValue = " + limitValue);

	var conditions = {
		IsDeleted: 0,
		MediaType: "Image",
		IsPrivate: { $ne: 1 },
		UploadedBy: "admin"
	}

	var finalData = {};

	var fields = {
		Posts: 0,
		Stamps: 0,
		Marks: 0,
		GroupTags: 0
	}

	var faultyfields = {
		AutoId: 1,
		Locator: 1
	}

	//media.find().skip(0).limit(200).sort({"UploadedOn":0}).exec(function(err , result){
	media.find(conditions).skip(skipValue).limit(limitValue).sort({ AutoId: -1 }).exec(function (err, result) {
		if (!err) {
			var resultCount = result.length;
			console.log('Total----------------------------------------------------', resultCount);
			//return false;
			if (resultCount) {
				//code
				for (var loop = 0; loop < resultCount; loop++) {
					//console.log(loop,'---------------------------',result[loop]);return
					doItNow(result[loop]);

					if (loop == resultCount - 1) {
						setTimeout(function () {
							faultyMediaModel.find({}, faultyfields).sort({ AutoId: -1 }).exec(function (err, result) {
								if (!err) {

									res.json({ code: 200, message: "All Done!", data: result });
									//console.log('---------------Data Saved-----------------');
								}
								else {
									console.log("Nothing in FaultyMedia", err);
									//findAll(req,res)
								}

							});
						}, 3000)

						//code
						//res.json({code : 200 , message : "All Done! Total "+resultCount+"media have been resized."});
					}
				}

				function doItNow(mediaRecord) {

					var imgUrl = mediaRecord.Location[0].URL ? mediaRecord.Location[0].URL : (mediaRecord.Thumbnail ? mediaRecord.Thumbnail : (mediaRecord.thumbnail ? mediaRecord.thumbnail : false));
					//console.log('---------------------------',imgUrl);return false;
					if (imgUrl) {
						//code
						var mediaCenterPath = "/../../public/assets/Media/img/";
						var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;
						var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						//var dstPathCrop_ORIGNAL = __dirname+mediaCenterPath+process.urls.aspectfit_small__thumbnail+"/"+imgUrl;

						//console.log('---------------------------',dstPathCrop_ORIGNAL);return
						if (fs.existsSync(srcPath)) {
							console.log('---------------Media Exists-----------------');
						}
						else {
							faultyMediaModel(mediaRecord).save(function (err, result) {
								if (!err) {
									//finalData.push(result);
									//res.json(err);
									console.log('---------------Faulty Media-----Data Saved-----------------');
								}
								else {
									//console.log("Not Saving Media Record....ERROR------------",err);
									//findAll(req,res)
								}
							});
						}
					}
					else {
						console.log("-------------------------Something went wrong with imgUrl........::::::::::::");
					}
				}
			}
			else {
				res.json({ code: 200, message: "All Done!" });

			}
		}
	})
}
exports.createFaultyLogs = createFaultyLogs;



var getFaultyMedia = function (req, res) {
	//console.log('------------------------------------I am In');return false;
	//var skipValue = parseInt(req.query.skip)?parseInt(req.query.skip):0;
	//var limitValue = parseInt(req.query.limit)?parseInt(req.query.limit):100;
	var faultyfields = {
		AutoId: 1,
		Locator: 1,
		Location: 1
	}

	faultyMediaModel.find({}, faultyfields).sort({ AutoId: -1 }).exec(function (err, result) {
		if (!err) {
			res.json({ code: 200, message: "Faulty Images!", data: result });
			//console.log('---------------Data Saved-----------------');
		}
		else {
			console.log("Nothing in FaultyMedia", err);
			//findAll(req,res)
		}
	});
}
exports.getFaultyMedia = getFaultyMedia;



var getDuplicatedMediaList = function (req, res) {
	//console.log('------------------------------------I am In');return false;
	//var skipValue = parseInt(req.query.skip)?parseInt(req.query.skip):0;
	//var limitValue = parseInt(req.query.limit)?parseInt(req.query.limit):100;

	var fields = {
		_id: true,
		"value.count": true,
		"value.recordLocators": true,
		"value.platformLocators": true
	};
	var conditions = {
		"value.count": { $gt: 1 }
	};
	var sortObj = { "value.count": -1 };

	var duplicatedMediaModel = require('./../models/duplicateMediaModel.js');
	duplicatedMediaModel.find(conditions, fields).sort(sortObj).exec(function (err, result) {
		if (!err) {
			res.json({ code: 200, message: "Duplicated Images!", TotalRecords: result.length, data: result });
			//console.log('---------------Data Saved-----------------');
		}
		else {
			console.log("Nothing in FaultyMedia", err);
			//findAll(req,res)
		}
	});
}
exports.getDuplicatedMediaList = getDuplicatedMediaList;


var deleteDuplicatedMediaList = function (req, res) {
	//console.log('------------------------------------I am In');return false;
	//var skipValue = parseInt(req.query.skip)?parseInt(req.query.skip):0;
	//var limitValue = parseInt(req.query.limit)?parseInt(req.query.limit):100;

	var fields = {
		_id: true,
		"value.count": true,
		"value.recordLocators": true
	};
	var conditions = {
		"value.count": { $gt: 1 }
	};
	var sortObj = { "value.count": -1 };

	var duplicatedMediaModel = require('./../models/duplicateMediaModel.js');
	duplicatedMediaModel.find(conditions, fields).sort(sortObj).exec(function (err, result) {
		if (!err) {
			var allMediaArr = [];
			var keptInstances = [];
			for (var loop = 0; loop < result.length; loop++) {
				var duplicatMediaObj = result[loop];
				if (duplicatMediaObj.value[0].count > 1) {
					for (var loop2 = 0; loop2 < duplicatMediaObj.value[0].recordLocators.length; loop2++) {
						if (loop2 == 0) {
							keptInstances.push(duplicatMediaObj.value[0].recordLocators[0])
						}
						else {
							allMediaArr.push(duplicatMediaObj.value[0].recordLocators[loop2]);
						}
					}
				}
			}
			var conditions = {
				AutoId: { $in: allMediaArr }
			};
			var setObj = {
				IsDeleted: 1
			}
			media.update(conditions, { $set: setObj }, { multi: true }, function (err, numAffected) {
				if (!err) {
					res.json({ code: 200, message: "Duplicated Images which needs to be deleted!", TotalRecordsToDelete: allMediaArr.length, data: allMediaArr, keptInstances: keptInstances, totalKeptInstances: keptInstances.length, TotalUpdates: numAffected });
				}
				else {
					console.log("ERROR----------", err);
					res.json({ error: err });
				}
			})
			//console.log('---------------Data Saved-----------------');
		}
		else {
			console.log("Nothing is in duplicatedMedia", err);
			//findAll(req,res)
		}
	});
}
exports.deleteDuplicatedMediaList = deleteDuplicatedMediaList;

var getFlagAsInAppropriates = function (req, res) {
	console.log('* *inside  getFlagAsInAppropriates * * ');
	console.log(req.body);
	var mediaId = req.body.ID ? req.body.ID : "";
	var conditions = {
		MediaId: mediaId
	};
	var fields = {};
	flagAsInAppropriate.find(conditions, fields).count().exec(function (err, flagCount) {
		if (err) {
			res.json({ "status": "error", "message": err });
		} else {

			res.json({ "status": "success", "count": flagCount });
		}
	})
}
exports.getFlagAsInAppropriates = getFlagAsInAppropriates;

var addThumbUsingCutyCapt = function (req, res) {
	var fields = req.body ? req.body : {};
	var query = {
		_id: fields.mediaId ? fields.mediaId : ""
	};

	media.findOne(query, function (err, montageData) {
		if (!err) {
			var name = '';
			name = dateFormat() + '_' + montageData.AutoId;
			var imagename = __dirname + "/../../public/assets/Media/img/" + name + ".png";

			var util = require('util'),
				exec = require('child_process').exec;

			//var command = "ffmpeg -i " + config.upload_dir +'/'+inputFile + " -vframes 1 " + config.upload_dir +'/'+outputThumbnail;

			var inputSrc = req.body.src ? req.body.src : null;

			if (inputSrc) {
				//check if there is Invalid URI - Fix it
				if(inputSrc.indexOf('http') == -1){
					inputSrc = inputSrc.replace('//','http://');
				}


				//first try to fetch og:image of the URL - if it exists ...
				const urlMetadata = require('url-metadata')
				urlMetadata(inputSrc).then(
				function (metadata) { // success handler
					//console.log("@@@@@@@@@@@@@@@metadata-----------------",metadata['og:image']);
				},
				function (error) { // failure handler
					console.log(error)
				})


				var outputThumbnail = imagename;
				var command = "xvfb-run cutycapt --user-agent='Mozilla/5.0 (X11; Linux x86_64; rv:50.0) Gecko/20100101 Firefox/50.0' --delay=5000 --plugins=on --js-can-open-windows=on --js-can-access-clipboard=on --print-backgrounds=on --url='" + inputSrc + "' --out='" + outputThumbnail + "'";

				//var command = "xvfb-run CutyCapt --delay=5000 --plugins=on --js-can-open-windows=on --js-can-access-clipboard=on --print-backgrounds=on --url='" + inputSrc + "' --out='" + outputThumbnail + "'";

				console.log("command =============== ", command);
				exec(command, function (error, stdout, stderr) {
					console.log("ERROR------------- ", error);
					console.log("stdout------------- ", stdout);

					if (stdout) console.log(stdout);
					if (stderr) console.log(stderr);

					if (error) {
						try {
							console.log('exec error: ' + error);
							response.statusCode = 404;
							response.end();
						}
						catch (e) {

						}
					}
					else {
						//add thumbnail code
						var imgUrl = name + ".png";
						var mediaCenterPath = "/../../public/assets/Media/img/";
						var srcPath = __dirname + mediaCenterPath + imgUrl;

						if (fs.existsSync(srcPath)) {
							var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
							var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
							var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
							var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
							var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

							var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

							crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
							crop_image(srcPath, dstPathCrop_SG, 300, 300);
							crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
							//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
							resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
							resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);

						}
						montageData.thumbnail = name + ".png";
						montageData.Locator = name;
						montageData.save(function () {
							if (!err) {
								res.json({ "code": "200", "message": "success", "thumbnail": montageData.thumbnail });
							}
						});
					}
				});
			}
			else {
				console.log("inputSrc---@@@@@@@@@2----------", inputSrc);
			}
		} else {
			res.json(err);
		}
	})
};
exports.addThumbUsingCutyCapt = addThumbUsingCutyCapt;


var mapAllKeywords_massapi = function (req, res) {
	var conditions = {
		Status: 1,
		IsDeleted: 0,
		UploadedBy: 'admin',
		IsPrivate: false
	};

	var fields = {
		_id: true,
		Prompt: true
	};

	var sortObj = {
		AutoId: -1
	};

	var skip = req.query.start ? parseInt(req.query.start) : 0;
	var limit = req.query.end ? parseInt(req.query.end) : 100;

	media.find(conditions, fields).sort(sortObj).skip(skip).limit(limit).exec(function (err, medias) {
		if (!err) {
			async_lib.eachSeries(medias, function (mediaObj, callback) {
				var prompt = mediaObj.Prompt ? mediaObj.Prompt : '';
				var mediaID = mediaObj._id ? mediaObj._id : '';

				var query = { _id: mediaID };
				var options = {};
				addGT(prompt, mediaID);

				callback(null, medias); // Alternatively: callback(new Error());
			}, function (err) {
				if (err) { throw err; }
				else {
					console.log('Well done :-)!');
					//findAllStatus(req,res);
					res.json({ Status: "success", medias: medias });
				}
			});
		}
	})
};

exports.mapAllKeywords_massapi = mapAllKeywords_massapi;

function __updateMontagePrivacy(montageId, str) {
	var montageId = montageId ? montageId : false;

	if (montageId != false) {
		var str = str ? str : '';
		var content = str.toString();

		var html2json = require('html2json').html2json;

		var jsonValue = html2json(content).child;
		var imsgArray = [];
		//console.log(jsonValue.);
		//console.log('-------------------------------------',jsonValue);
		jsonValue.forEach(function (entry) {
			if (entry.child) {
				var paraGraphChild = entry.child;
				paraGraphChild.forEach(function (entry2) {
					//console.log('-------------------------------------',entry2.child);
					if (entry2.child) {
						var imgChild = entry2.child;
						imgChild.forEach(function (img) {
							if (img.attr) {
								//console.log('>>>>>>>>>>>>>>>',img.attr.src);
								if (img.attr.src) {
									imsgArray.push({ 'src': img.attr.src });
								}
							}
							//
						});
					}
				});
			}

		});

		//console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',imsgArray);

		var finalSrc = [];
		if (imsgArray.length) {
			imsgArray.forEach(function (targetSrc) {
				var String = targetSrc.src ? targetSrc.src : '';
				var finalStr = String.substr(String.lastIndexOf('/') + 1);
				if (finalStr) {
					finalSrc.push(finalStr);
				}
				String = "";
			});
			if (finalSrc.length) {
				// db.getCollection('media').find({$or : [{thumbnail : {$in : ["05152017102727_15753.jpg","0119201763855_13614.jpg","0119201763855_13614.jpg","06162016231518_11600.jpg"]}} , {"Location.URL" : {$in :["05152017102727_15753.jpg","0119201763855_13614.jpg","0119201763855_13614.jpg","06162016231518_11600.jpg"]}}]})
				media.find({
					$and: [
						{ $or: [{ "thumbnail": { $in: finalSrc } }, { "Location.URL": { $in: finalSrc } }] },
						{ "IsPrivate": 1 }
					]
				},
					function (err, results) {
						//console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-------------------------------------------------results',results);
						if (results.length) {
							media.update({ _id: montageId }, { $set: { IsPrivate: 1 } }, function (err, result) {
								if (!err) {
									//console.log("--------------------Montage Updated....",result);
								}
								else {
									//  console.log("--------------------------------------error---------------",err);
								}
							})
						}
					});
			}
		}
	}
}

var findAllMassImport = function (req, res) {
	var fields = {};
	fields.IsDeleted = false;

	massImport.find(fields).sort({UploadedOn:-1}).exec(function (err, result) {

	// massImport.find(fields).sort({ UploadedOn: 'desc' }).skip(req.body.offset).limit(req.body.limit).exec(function (err, result) {

		if (err) {
			res.json(err);
		}
		else {
				//media.find({Status:0}).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){
					massImport.find({ Status: 0 }, { _id: 1 }).count().exec(function (err, resultlength) {
					if (err) {
						res.json(err);
					}
					else {
						console.log("yes confirmed return.....");
						//res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });

					}
				})

		}
	})

};

exports.findAllMassImport = findAllMassImport;


var  deleteZipFile = function(req,res){
	console.log("deleteZipFile",req.body._id)
    massImport.findOne({_id:req.body._id},function(err,data){
        if (err) {
            res.json({'code':400,'error':err});
        }else{
            if (data) {
                data.IsDeleted = true;
                data.save(function(err,data1){
                     if (err) {
                        res.json({'code':400,'error':'error while saving'});
                    }else{
                        res.json({'code':200,'msg':'zip file deleted .'});
                    }
                })
            }
        }
    })
}


exports.deleteZipFile = deleteZipFile;


var uploadMassImport = function (req, res) {
	console.log("uploadMassImport-------------", req.body)
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				console.log('=========================')
				console.log(data);
				//data.seq=(data.seq)+1;
				console.log(data.seq);
				incNum = data.seq;
				//data.save(function(err){
				//if( !err ){
				console.log("incNum=" + incNum);
				var form = new formidable.IncomingForm();
				var RecordLocator = "";

				form.parse(req, function (err, fields, files) {
					var file_name = "";
					console.log("files.myFile.name", files.myFile0.name);
					if (files.myFile0.name) {
						uploadDir = __dirname + "/../../public/assets/Media/img";
						file_name = files.myFile0.name;
						file_name = file_name.split('.');
						ext = file_name[file_name.length - 1];
						RecordLocator = file_name[0];
						var name = '';
						name = dateFormat() + '_' + incNum;
						////name = Math.floor( Date.now() / 1000 ).toString()+'_'+incNum;
						//file_name=name+'.'+ext;
						file_name = name + '.' + ext; //updated on 09022015 by manishp : <timestamp>_<media_unique_number>_<size>.<extension> = 1421919905373_101_600.jpeg
						console.log(files.myFile0.type);
						fs.renameSync(files.myFile0.path, uploadDir + "/" + file_name)

						var media_type = '';
				        if (files.myFile0.type == 'application/zip') {
							media_type = 'Document';
						}
						else {
							media_type = 'Image';
							//add thumbnail code
							var imgUrl = file_name;
							var mediaCenterPath = "/../../public/assets/Media/img/";
							var srcPath = __dirname + mediaCenterPath + imgUrl;

							if (fs.existsSync(srcPath)) {
								var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
								var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
								var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
								var dstPathCrop_LARGE = __dirname + mediaCenterPath + process.urls.large__thumbnail + "/" + imgUrl;
								var dstPathCrop_ORIGNAL = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail + "/" + imgUrl;

								var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

								crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
								crop_image(srcPath, dstPathCrop_SG, 300, 300);
								//crop_image(srcPath,dstPathCrop_400,400,400);
								//crop_image(srcPath,dstPathCrop_500,500,500);
								crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
								//crop_image(srcPath, dstPathCrop_LARGE, 1200, 1200);
								resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
								resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
							}
						}


						console.log("incNum=" + incNum);
						var successFlag = false;

						var __UploaderID = '';
						if (req.session.admin) {
							__UploaderID = req.session.admin._id;
							successFlag = true;
						} else if (req.session.subAdmin) {
							__UploaderID = req.session.subAdmin._id;
							successFlag = true;
						}
						else {
							//return;
						}

						if (successFlag) {
							dataToUpload = {
								Title: file_name,
								Location: [],
								UploadedBy: "admin",
								UploadedOn: Date.now(),
								UploaderID: __UploaderID,
								Source: "Thinkstock",
								SourceUniqueID: null,
								Domains: null,
								AutoId: incNum,
								GroupTags: [],
								Collection: null,
								Status: 0,
								MetaMetaTags: null,
								MetaTags: null,
								AddedWhere: "directToPf", //directToPf,hardDrive,dragDrop
								IsDeleted: 0,
								TagType: "",
								ContentType: files.myFile0.type,
								MediaType: media_type,
								AddedHow: 'hardDrive',
								Locator: RecordLocator + "_" + incNum	//added on 23012014
							}

							dataToUpload.Location.push({
								Size: files.myFile0.size,
								URL: file_name
							})

							massImport(dataToUpload).save(function (err) {
								if (err) {
									res.json(err);
								}
								else {
									console.log("returning....");
									findAllMassImport(req, res)
								}
							});
						}
						else {
							res.json({ "code": 401, "msg": "Admin/Subadmin session not found." });
						}

					}
				});
			}
		});
}


var importUnsplashImages = function (req, res) {
	console.log("importUnsplashImages-------------", req.body)
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		files = files ? files : {};
		files.myFile0 = files.myFile0 ? files.myFile0 : {};
		files.myFile0.name = files.myFile0.name ? files.myFile0.name : null;
		var file_name = "";
		console.log("files.myFile.name", files.myFile0.name);
		if (files.myFile0.name) {
			uploadDir = __dirname + "/../../public/assets/unsplashimport";
			file_name = files.myFile0.name;
			file_name = file_name.split('.');
			ext = file_name[file_name.length - 1];
			var name = '';
			name = dateFormat() + '_' + "unsplashimport";
			file_name = uploadDir + "/" + name + '.' + ext;

			fs.renameSync(files.myFile0.path, file_name);

			xlsxj({
				input: file_name,
				output: uploadDir+"/output.json"
			},
			function(err, result) {
				if(err) {
				  console.error(err);
				}else {
					//console.log(result);
					//res.json({data : result});
					var result = result ? result : [];

					var descriptorArr = [];
					var recordsToUpload = [];
					var recordsToReportError = [];

					for( var loop = 0; loop < result.length; loop++ ) {
						var record = result[loop];
						if(!record["Descriptors/Concepts/Related tags"]) {
							if(record["Combined tags (all 4)"]) {
								record["Descriptors/Concepts/Related tags"] = typeof record["Combined tags (all 4)"] == 'string' ? record["Combined tags (all 4)"] : "";
							}
						}

						if(record["Styled images"]){
							record["StyleKeyword"] = typeof record["Styled images"] == 'string' ? record["Styled images"].trim() : "";
						}
						if(record["Image Source"]){
							recordsToUpload.push(record);
							if(record["Descriptors/Concepts/Related tags"]){
								descriptorArr.push(record["Descriptors/Concepts/Related tags"].trim());
							}
						}
						else{
							recordsToReportError.push(record);
						}
					}

					descriptorArr = descriptorArr.toString();
					descriptorArr = descriptorArr.split(',');

					//console.log("----------descriptorArr----------",descriptorArr);
					if( !descriptorArr.length ) {
						//next Step -- Start Image uploading on database ...
						__saveUnsplashImagesNow(recordsToUpload , recordsToReportError);
					}
					else{
						var descriptorArr__unique = [];

						//console.log()
						for (var a = 0; a < descriptorArr.length; a++) {
							var flag = 0;
							var tagStr = typeof (descriptorArr[a]) == 'string' ? descriptorArr[a].trim() : '93w844923469126';
							if (descriptorArr__unique.indexOf(tagStr) == -1) {
								descriptorArr__unique.push(tagStr);
							}
						}

						//console.log("---------descriptorArr__unique---------",descriptorArr__unique);

						//var processCounter = 0;
						for( var loop = 0; loop < descriptorArr__unique.length; loop++ ){
							var title = descriptorArr__unique[loop];
							title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
							if (title != '') {
								chkGt__MPMP(title,function(data , title2){
									//console.log("-------------title------------",title2);
									//processCounter++;
									if (data.length == 0) {
										if(title2) {
											var fields = {};
											fields.GroupTagTitle = title2;
											fields.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';// for 8888
											fields.MetaTagID = '54c98aba4fde7f30079fdd5b';// for 8888
											fields.status = 3;
											fields.LastModified = Date.now();
											fields.DateAdded = Date.now();
											fields.Tags = [{ TagTitle: title2, status: 1 }];
											fields.Think = [];
											fields.Less = [];
											fields.More = [];

											groupTags(fields).save(function (err, retGT) {
												if (!err) {
													__operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique , title2);
												}
												else{
													console.log(err);
													__operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique, title2);
												}
											});
										}
										else{
											__operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique , title2);
										}
									} else {
										__operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique, title2);
									}

								});
							}
							else{
								__operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique, title);
							}
						}
					}
				}
			});
		}
		else {
			res.json({ "code": 501, "msg": "Wrong Input!" });
		}
	});

	var processCounter = 0;
	function __operationCounterChecker(recordsToUpload , recordsToReportError , descriptorArr__unique, title){
		processCounter++;
		console.log("------__operationCounterChecker-----, title ===== "+title+"----processCounter = "+processCounter+"-----descriptorArr__unique.length = ",descriptorArr__unique.length);
		if( processCounter == descriptorArr__unique.length ) {
			//next Step -- Start Image uploading on database ...
			__saveUnsplashImagesNow(recordsToUpload , recordsToReportError);
		}
	}

	function __saveUnsplashImagesNow(recordsToUpload , recordsToReportError){
		console.log("----------__saveUnsplashImagesNow(recordsToUpload , recordsToReportError)---------");

		var recordsToUpload = recordsToUpload ? recordsToUpload : [];
		var opsCounter = 0;
		for(var loop = 0; loop < recordsToUpload.length; loop++ ){
			var recordsToUploadObj = recordsToUpload[loop];

			__saveMedia__MPMP(recordsToUploadObj , function(result , recordsToUploadObj){
				var unsplashPhotoId = recordsToUploadObj["Photo ID"] ? recordsToUploadObj["Photo ID"] : null;
				var unsplashImageURL = recordsToUploadObj["Image Source"] ? recordsToUploadObj["Image Source"] : null;

				var unsplashImageTags = recordsToUploadObj["Descriptors/Concepts/Related tags"] ? recordsToUploadObj["Descriptors/Concepts/Related tags"] : null;

				var unsplashImageTitle = recordsToUploadObj["Title"] ? recordsToUploadObj["Title"] : null;

				var unsplashImagePhotographer = recordsToUploadObj["Photographer"] ? recordsToUploadObj["Photographer"] : null;

				var unsplashStyleKeyword =  recordsToUploadObj["StyleKeyword"] ? recordsToUploadObj["StyleKeyword"] : "";

				var Lightness =  recordsToUploadObj["Lightness"] ? recordsToUploadObj["Lightness"] : "";
				var DominantColors =  recordsToUploadObj["Dominant colors"] ? recordsToUploadObj["Dominant colors"] : "";

				var UnsplashPhotoId__AlreadyExists = [];

				result = result ? result : [];
				if(result.length == 0) {
					//Now save media record ....
					var incNum = 0;
					counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
						if (!err) {
							//console.log('=========================')
							//console.log(data);
							//data.seq=(data.seq)+1;
							//console.log(data.seq);
							incNum = data.seq;
							//data.save(function(err){
							//if( !err ){
							//console.log("incNum=" + incNum);
							var RecordLocator = unsplashImageURL.split('?')[0].split('/').pop();

							var file_name = "";


							var name = '';
							name = dateFormat() + '_' + incNum;

							file_name = name + '.' + ext;

							var media_type = 'Link';

							var successFlag = false;

							var __UploaderID = '';
							if (req.session.admin) {
								__UploaderID = req.session.admin._id;
								successFlag = true;
							} else if (req.session.subAdmin) {
								__UploaderID = req.session.subAdmin._id;
								successFlag = true;
							}
							else {
								//return;
							}

							if (successFlag) {
								dataToUpload = {
									Prompt : unsplashImageTags,
									Title : unsplashImageTitle,
									Photographer : unsplashImagePhotographer,
									Location: [],
									UploadedBy: "admin",
									UploadedOn: Date.now(),
									UploaderID: __UploaderID,
									Source: "Unsplash",
									SourceUniqueID: null,
									Domains: null,
									AutoId: incNum,
									GroupTags: [],
									Collection: null,
									Status: 1,
									MetaMetaTags: "5464931fde9f6868484be3d7",
									MetaTags: null,
									AddedWhere: "directToPf", //directToPf,hardDrive,dragDrop
									IsDeleted: 0,
									TagType: "",
									ContentType: "",
									MediaType: media_type,
									LinkType : "image",
									IsUnsplashImage : true,
									UnsplashPhotoId : unsplashPhotoId,
									thumbnail : unsplashImageURL,
									Content : '<img src="'+unsplashImageURL+'" alt="Link">',
									AddedHow: 'importExcel',
									Locator: RecordLocator + "_" + incNum,	//added on 23012014
									StyleKeyword : unsplashStyleKeyword,
									Lightness: Lightness ? Lightness : 0,
									DominantColors: DominantColors ? DominantColors : ""
								}

								dataToUpload.Location.push({
									Size: "",
									URL: unsplashImageURL
								})

								media(dataToUpload).save(function (err,tata) {
									if (err) {
										console.log(err);
										opsCounter++;
										if(opsCounter == recordsToUpload.length) {
											//return from here ...
											res.json({code:200 , recordsUploaded : recordsToUpload , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists});
										}
									}
									else {
										console.log("----------------Media Record saved-----------------------");
										//findAll(req, res)
										add__Descriptors(unsplashImageTags, tata._id);
										opsCounter++;
										if(opsCounter == recordsToUpload.length) {
											//return from here ...
											res.json({code:200 , recordsUploaded : recordsToUpload , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists});
										}
									}
								});
							}
							else {
								console.log({ "code": 401, "msg": "Admin/Subadmin session not found." });
								opsCounter++;
								if(opsCounter == recordsToUpload.length) {
									//return from here ...
									res.json({code:200 , recordsUploaded : recordsToUpload , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists});
								}
							}
						}
						else{
							opsCounter++;
							if(opsCounter == recordsToUpload.length) {
								//return from here ...
								res.json({code:200 , recordsUploaded : recordsToUpload , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists});
							}
						}
					});
				}
				else{
					console.log("---- Record already exists ----- ",result[0].UnsplashPhotoId);
					UnsplashPhotoId__AlreadyExists.push(result[0].UnsplashPhotoId);

					opsCounter++;
					if(opsCounter == recordsToUpload.length) {
						//return from here ...
						res.json({code:200 , recordsUploaded : recordsToUpload , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists});
					}
				}
			})
		}
	}
}

function __saveMedia__MPMP(recordsToUploadObj,callback){
	if(recordsToUploadObj){
		recordsToUploadObj = recordsToUploadObj ? recordsToUploadObj : {};
	}

	if(recordsToUploadObj){

		var unsplashPhotoId = recordsToUploadObj["Photo ID"] ? recordsToUploadObj["Photo ID"] : null;
		var unsplashImageURL = recordsToUploadObj["Image Source"] ? recordsToUploadObj["Image Source"] : null;

		var unsplashImageTags = recordsToUploadObj["Descriptors/Concepts/Related tags"] ? recordsToUploadObj["Descriptors/Concepts/Related tags"] : null;

		var unsplashImageTitle = recordsToUploadObj["Title"] ? recordsToUploadObj["Title"] : null;

		var unsplashImagePhotographer = recordsToUploadObj["Photographer"] ? recordsToUploadObj["Photographer"] : null;

		var UnsplashPhotoId__AlreadyExists = [];

		if( unsplashPhotoId && unsplashImageURL){
			//check if Unsplash Photo ID is already there or not ...
			media.find({UnsplashPhotoId : unsplashPhotoId , IsDeleted : false} , {_id:1,UnsplashPhotoId:1} , function(err , result){
				//opsCounter++;
				if(!err) {
					callback(result , recordsToUploadObj);
				}
				else{
					callback(result , recordsToUploadObj);
				}
			})

		}

	}
};

function chkGt__MPMP(abc,callback){
	if(abc){
		abc = abc ? abc.trim() : null;	//added by manishp on 09032016
		abc = abc.replace(/[^a-zA-Z0-9 \-\\]/g, "");
	}
	//console.log("abc ===== ",abc);
	if(abc){
		groupTags.find({$or:[{status:1},{status:3}],GroupTagTitle:{ $regex : new RegExp("^"+abc+"$", "i") }},function(err,result){
			if (err) {
				throw err;
			}
			else{
				callback(result , abc);
			}
		});
	}
	else{
		callback([] , abc);
	}
};

var ApiToFixDescriptorsMappingOnMedia = function(req , res){
	console.log("----------ApiToFixDescriptorsMappingOnMedia---------");
	var conditions = {
		IsDeleted : false,
		MediaType : "Link",
		LinkType : "image",
		IsUnsplashImage : true,
		UnsplashPhotoId : {$exists : true},
		GroupTags : []
	};

	media.find(conditions , {_id : 1, Prompt : 1} , function(err , result){
		if(!err){
			result = result ? result : [];
			console.log("result.length = ",result.length);
			for(var loop = 0; loop < result.length; loop++){
				var mediaObj = result[loop];
				var unsplashImageTags = mediaObj.Prompt ? mediaObj.Prompt : null;
				var mediaId = mediaObj._id;
				if(unsplashImageTags){
					add__Descriptors_CALLBACK(unsplashImageTags, mediaId , function(){
						console.log("------DONE-------");
						opsValidator(result , res);
					});
				}
				else{
					console.log("---------There is no desciptors attached with this media----------");
					opsValidator(result , res);
				}
			}
		}
		else{
			console.log(err);
		}
	})

	var opsCounter = 0;
	function opsValidator(recordsToUpload , res) {
		opsCounter++;
		console.log("----------------opsCounter = "+opsCounter+"-------recordsToUpload === ",recordsToUpload.length);
		if(opsCounter == recordsToUpload.length) {
			//return from here ...
			console.log("-------------NOW RETURN JSON------------");
			res.json({code:200 , recordsUploaded : recordsToUpload});
		}
	}

}

function add__Descriptors_CALLBACK(tags, mediaId , callback) {
	//var tags = req.body.media[i]['prompt'];
	tags = tags.split(',');
	dup_tags = [];
	console.log(tags);
	//console.log()
	for (var a = 0; a < tags.length; a++) {
		var flag = 0;
		var tagStr = typeof (tags[a]) == 'string' ? tags[a].trim().replace(/[^a-zA-Z0-9 \-\\]/g, "") : '93w844923469126';
		if (dup_tags.indexOf(tagStr) == -1) {
			dup_tags.push(tagStr);
		}
	}
	tags = dup_tags;
	for (j in tags) {
		var tagStr = tags[j];
		if (tagStr != '' && tagStr != '93w844923469126') {
			//console.log('==========================================================================');
			//console.log(tags[j]);
			//console.log('==========================================================================');
			checkNSaveGT(tagStr, mediaId);
		}
	}
	callback();
}

exports.ApiToFixDescriptorsMappingOnMedia = ApiToFixDescriptorsMappingOnMedia;



var getUnsplashImages__API = function (req , res) {
	req.body.offset = req.body.offset ? req.body.offset : 0;
	req.body.limit = req.body.limit ? req.body.limit : 1000;

	var conditions = {
		IsUnsplashImage : true,
		IsDeleted : 0
	};

	media.find(conditions).sort({ UploadedOn: 'desc' }).skip(req.body.offset).limit(req.body.limit).exec(function (err, result) {

		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found", responselength: 0 })
			}
			else {
				media.find(conditions, { _id: 1 }).count().exec(function (err, resultlength) {
					if (err) {
						res.json(err);
					}
					else {
						res.json({ "code": "200", "msg": "Success", "response": result, "responselength": resultlength });

					}
				})
			}
		}
	})
}

exports.getUnsplashImages__API = getUnsplashImages__API;

var importKeywords = function(req, res, files) {
	console.log("importKeywords-------------", req.body);
	var form = new formidable.IncomingForm();
	//form.parse(req, async function (err, fields, files) {
		files = files ? files : {};
		files.myFile0 = files.myFile0 ? files.myFile0 : {};
		files.myFile0.name = files.myFile0.name ? files.myFile0.name : null;
		var file_name = "";
		console.log("files.myFile.name", files.myFile0.name);
		if (files.myFile0.name) {
			uploadDir = __dirname + "/../../public/assets/keywordsimport";
			file_name = files.myFile0.name;
			file_name = file_name.split('.');
			ext = file_name[file_name.length - 1];
			var name = '';
			name = dateFormat() + '_' + "keywordsimport";
			file_name = uploadDir + "/" + name + '.' + ext;

			fs.renameSync(files.myFile0.path, file_name);

			xlsxj({
				input: file_name,
				output: uploadDir+"/output.json"
			},
			async function(err, result) {
				if(err) {
				  console.error(err);
				} else {
					//console.log(result);
					//res.json({data : result});
					var result = result ? result : [];
					//return res.json({record1 : result[0], record2 : result[1]});

					var descriptorArr = [];
					var recordsToUpload = [];
					var recordsToReportError = [];

					var recordsMap = {};

					for( var loop = 0; loop < result.length; loop++ ) {
						var record = result[loop];
						record["keyword"] = record["keyword"] ? record["keyword"].trim().toLowerCase() : null;
						record["keyword"] = typeof record["keyword"] == 'string' ? record["keyword"].replace(/[^a-zA-Z0-9 \-\\]/g, "") : record["keyword"];
						record["tags"] = typeof record["tags"] == 'string' ? record["tags"].trim().split(',') : [];

						if(record["keyword"]){
							recordsMap[record["keyword"]] = {
								keyword : record["keyword"],
								tags : record["tags"]
							};
							descriptorArr.push(record["keyword"]);
						}
					}

					//descriptorArr = descriptorArr.toString();
					//descriptorArr = descriptorArr.split(',');

					var descriptorArr__unique = [];

					for (var a = 0; a < descriptorArr.length; a++) {
						var flag = 0;
						var tagStr = typeof (descriptorArr[a]) == 'string' ? descriptorArr[a].trim().toLowerCase() : '93w844923469126';
						if (descriptorArr__unique.indexOf(tagStr) == -1) {
							descriptorArr__unique.push(tagStr);
						}
					}

					//console.log("---------descriptorArr__unique---------",descriptorArr__unique);

					var allDescriptors = [];
					for( var loop = 0; loop < descriptorArr__unique.length; loop++ ){
						var title = descriptorArr__unique[loop];
						title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
						if (title) {
							title = title ? title.trim() : '';	//added by manishp on 09032016
							title = title.replace(/[^a-zA-Z0-9 \-\\]/g, "");
							if(title){
								allDescriptors.push(title);
							}
						}
					}

					//$in conditions
					var inArrayDescriptors = [];
					for( var loop = 0; loop < allDescriptors.length; loop++ ){
						var title = allDescriptors[loop];
						title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
						if (title) {
							title = title ? title.trim() : '';	//added by manishp on 09032016
							title = title.replace(/[^a-zA-Z0-9 \-\\]/g, "");
							if(title){
								inArrayDescriptors.push(new RegExp("^"+title+"$", "i"));
							}
						}
					}

					var savedGTs = await groupTags.find({$or:[{status:1},{status:3}],GroupTagTitle:{ $in : inArrayDescriptors }}, {GroupTagTitle : true, Tags : true});
					savedGTs = savedGTs ? savedGTs : [];

					console.log("savedGTs == ", savedGTs.length);
					var updateExistingGTs = [];
					var localGTMap = {};
					for(var loop = 0; loop < savedGTs.length; loop++) {
						savedGTs[loop].GroupTagTitle = savedGTs[loop].GroupTagTitle ? savedGTs[loop].GroupTagTitle.trim().toLowerCase() : null;
						if(savedGTs[loop].GroupTagTitle) {
							localGTMap[savedGTs[loop].GroupTagTitle] = String(savedGTs[loop]._id);

							//keep removing the keywords from array so we will have only remaining keywrod
							var index = allDescriptors.indexOf(savedGTs[loop].GroupTagTitle);
							if (index > -1) {
								savedGTs[loop].Tags = [];
								var title = allDescriptors[index];
								var tags = recordsMap[title].tags ? recordsMap[title].tags : [];
								for(var lp = 0; lp < tags.length; lp++) {
									var tag = tags[lp] ? tags[lp].trim().toLowerCase() : null;
									if(tag) {
										savedGTs[loop].Tags.push(
											{
												_id: new ObjectId(),
												TagTitle: tag,
												status: 1
											}
										);
									}
								}

								updateExistingGTs.push(savedGTs[loop]);
								allDescriptors.splice(index, 1);
							}
						}
					}

					console.log("updateExistingGTs total count = ", updateExistingGTs.length);

					updateExistingGTsLen = updateExistingGTs.length;

					var bulkOps = [];
					var counter = 0;
					for(let bi = 0; bi < updateExistingGTs.length; bi++) {
						bulkOps.push({
							updateOne : {
								"filter" : { _id: updateExistingGTs[bi]._id },
								"update" : { $set : { Tags: updateExistingGTs[bi].Tags } }
							}
						});
						counter++;

						if(counter % 1000 == 0) {
							groupTags.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
								if(!err){
									console.log("-----@@@@@@@@@@@@----bulk update for 1000 : done ==========>>>> ");
								}
								else {
									console.log("-----@@@@@@@@@@@@----bulk update for 1000 : error ==========>>>> ");
								}
							});
							bulkOps = [];
						}
					}

					if(counter % 1000 != 0) {
						groupTags.bulkWrite(bulkOps , {ordered : false}, function(err,result) {
							if(!err){
								console.log("-----@@@@@@@@@@@@----bulk update for "+(counter % 1000)+" : done ==========>>>> ");
							}
							else {
								console.log("-----@@@@@@@@@@@@----bulk update for "+(counter % 1000)+" : error ==========>>>> ");
							}
						});
					}
					console.log("bulk update operations completed ...");

					var newGtNeedsToBeSaved = allDescriptors;
					console.log("newGtNeedsToBeSaved = ", newGtNeedsToBeSaved.length);
					//new gts to created
					var allRecordsToSave = [];
					for( var loop = 0; loop < newGtNeedsToBeSaved.length; loop++ ){
						var title = newGtNeedsToBeSaved[loop];
						if(title) {
							title = title.trim().toLowerCase();
							var record = {};
							record._id = new ObjectId();
							record.GroupTagTitle = title;
							record.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';// for 8888
							record.MetaTagID = '54c98aba4fde7f30079fdd5b';// for 8888
							record.status = 3;
							record.LastModified = Date.now();
							record.DateAdded = Date.now();
							record.Think = [];
							record.Less = [];
							record.More = [];

							record.Tags = [{ _id: new ObjectId(), TagTitle: title, status: 1 }];
							if(recordsMap[title]) {
								var tags = recordsMap[title] ? (recordsMap[title].tags ? recordsMap[title].tags : []) : [];
								for(var lp = 0; lp < tags.length; lp++) {
									var tag = tags[lp] ? tags[lp].trim().toLowerCase() : null;
									if(tag) {
										record.Tags.push(
											{
												_id: new ObjectId(),
												TagTitle: tag,
												status: 1
											}
										);
									}
								}
							}

							allRecordsToSave.push(record);
							localGTMap[title] = String(record._id);
						}
					}

					console.log("allRecordsToSave = ", allRecordsToSave.length);
					if(allRecordsToSave.length) {
						var i,j, temporary, chunk = 200;
						for (i = 0,j = allRecordsToSave.length; i < j; i += chunk) {
							temporary = allRecordsToSave.slice(i, i + chunk);
							var results = await groupTags.insertMany(temporary);
							results = results ? results : null;
							if(results) {
								console.log("200 new gt saved ....");
							}
						}
					}
					res.json({
						code:200 ,
						recordsUploaded : allRecordsToSave.length,
						recordsToReportError : recordsToReportError.length,
						UnsplashPhotoId__AlreadyExists : savedGTs.length});
					// all GTs have been saved and mapped with local object - Now save Images;

				}
			});
		}
		else {
			res.json({ "code": 501, "msg": "Wrong Input!" });
		}
	//});
}

var importUnsplashImagesV2 = async function (req, res) {
	console.log("importUnsplashImagesV2-------------", req.body)
	var form = new formidable.IncomingForm();
	form.parse(req, async function (err, fields, files) {
		files = files ? files : {};
		files.myFile0 = files.myFile0 ? files.myFile0 : {};
		files.myFile0.name = files.myFile0.name ? files.myFile0.name : null;
		var file_name = "";
		console.log("files.myFile.name", files.myFile0.name);
		if (files.myFile0.name) {
			if( files.myFile0.name.indexOf('KEYWORDS_IMPORT') > -1) {
				importKeywords(req, res, files);
				//return;
			} else {
				uploadDir = __dirname + "/../../public/assets/unsplashimport";
				file_name = files.myFile0.name;
				file_name = file_name.split('.');
				ext = file_name[file_name.length - 1];
				var name = '';
				name = dateFormat() + '_' + "unsplashimport";
				file_name = uploadDir + "/" + name + '.' + ext;

				fs.renameSync(files.myFile0.path, file_name);

				xlsxj({
					input: file_name,
					output: uploadDir+"/output.json"
				},
				async function(err, result) {
					if(err) {
					  console.error(err);
					} else {
						//console.log(result);
						//res.json({data : result});
						var result = result ? result : [];

						var descriptorArr = [];
						var recordsToUpload = [];
						var recordsToReportError = [];

						for( var loop = 0; loop < result.length; loop++ ) {
							var record = result[loop];
							if(!record["Descriptors/Concepts/Related tags"]) {
								if(record["Combined tags (all 4)"]) {
									record["Descriptors/Concepts/Related tags"] = typeof record["Combined tags (all 4)"] == 'string' ? record["Combined tags (all 4)"] : "";
								}
							}

							if(record["Styled images"]){
								record["StyleKeyword"] = typeof record["Styled images"] == 'string' ? record["Styled images"].trim() : "";
							}
							if(record["Image Source"]){
								recordsToUpload.push(record);
								if(record["Descriptors/Concepts/Related tags"]){
									descriptorArr.push(record["Descriptors/Concepts/Related tags"].trim());
								}
							}
							else{
								recordsToReportError.push(record);
							}
						}

						descriptorArr = descriptorArr.toString();
						descriptorArr = descriptorArr.split(',');

						var descriptorArr__unique = [];

						for (var a = 0; a < descriptorArr.length; a++) {
							var flag = 0;
							var tagStr = typeof (descriptorArr[a]) == 'string' ? descriptorArr[a].trim().toLowerCase() : '93w844923469126';
							if (descriptorArr__unique.indexOf(tagStr) == -1) {
								descriptorArr__unique.push(tagStr);
							}
						}

						//console.log("---------descriptorArr__unique---------",descriptorArr__unique);

						var allDescriptors = [];
						for( var loop = 0; loop < descriptorArr__unique.length; loop++ ){
							var title = descriptorArr__unique[loop];
							title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
							if (title) {
								title = title ? title.trim() : '';	//added by manishp on 09032016
								title = title.replace(/[^a-zA-Z0-9 \-\\]/g, "");
								if(title){
									allDescriptors.push(title);
								}
							}
						}

						//$in conditions
						var inArrayDescriptors = [];
						for( var loop = 0; loop < allDescriptors.length; loop++ ){
							var title = allDescriptors[loop];
							title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
							if (title) {
								title = title ? title.trim() : '';	//added by manishp on 09032016
								title = title.replace(/[^a-zA-Z0-9 \-\\]/g, "");
								if(title){
									inArrayDescriptors.push(new RegExp("^"+title+"$", "i"));
								}
							}
						}

						var savedGTs = await groupTags.find({$or:[{status:1},{status:3}],GroupTagTitle:{ $in : inArrayDescriptors }}, {GroupTagTitle : true});
						savedGTs = savedGTs ? savedGTs : [];

						console.log("savedGTs == ", savedGTs.length);

						var localGTMap = {};
						for(var loop = 0; loop < savedGTs.length; loop++) {
							savedGTs[loop].GroupTagTitle = savedGTs[loop].GroupTagTitle ? savedGTs[loop].GroupTagTitle.trim().toLowerCase() : null;
							if(savedGTs[loop].GroupTagTitle) {
								localGTMap[savedGTs[loop].GroupTagTitle] = String(savedGTs[loop]._id);

								//keep removing the keywords from array so we will have only remaining keywrod
								var index = allDescriptors.indexOf(savedGTs[loop].GroupTagTitle);
								if (index > -1) {
								   allDescriptors.splice(index, 1);
								}
							}
						}

						var newGtNeedsToBeSaved = allDescriptors;

						console.log("newGtNeedsToBeSaved = ", newGtNeedsToBeSaved.length);
						//new gts to created
						var allRecordsToSave = [];
						for( var loop = 0; loop < newGtNeedsToBeSaved.length; loop++ ){
							var title = newGtNeedsToBeSaved[loop];
							if(title) {
								var record = {};
								record._id = new ObjectId();
								record.GroupTagTitle = title;
								record.MetaMetaTagID = '54c98aab4fde7f30079fdd5a';// for 8888
								record.MetaTagID = '54c98aba4fde7f30079fdd5b';// for 8888
								record.status = 3;
								record.LastModified = Date.now();
								record.DateAdded = Date.now();
								record.Tags = [{ _id: new ObjectId(), TagTitle: title, status: 1 }];
								record.Think = [];
								record.Less = [];
								record.More = [];

								allRecordsToSave.push(record);
								localGTMap[title] = String(record._id);
							}
						}

						console.log("allRecordsToSave = ", allRecordsToSave.length);
						if(allRecordsToSave.length) {
							var i,j, temporary, chunk = 200;
							for (i = 0,j = allRecordsToSave.length; i < j; i += chunk) {
								temporary = allRecordsToSave.slice(i, i + chunk);
								var results = await groupTags.insertMany(temporary);
								results = results ? results : null;
								if(results) {
									console.log("200 new gt saved ....");
								}
							}
						}

						// all GTs have been saved and mapped with local object - Now save Images;
						console.log("----------__saveUnsplashImagesNow(recordsToUpload , recordsToReportError)---------");
						console.log("recordsToUpload ======== ", recordsToUpload.length);
						recordsToUpload = recordsToUpload ? recordsToUpload : [];
						var allUnsplashPhotoIds = [];
						for(var loop = 0; loop < recordsToUpload.length; loop++ ){
							var recordsToUploadObj = recordsToUpload[loop];
							var unsplashPhotoId = recordsToUploadObj["Photo ID"] ? recordsToUploadObj["Photo ID"].trim() : null;
							if(unsplashPhotoId) {
								allUnsplashPhotoIds.push(unsplashPhotoId);
							}
						}

						//check already exists one
						var UnsplashPhotoId__AlreadyExists = [];

						var savedMedias = await media.find({UnsplashPhotoId : {$in : allUnsplashPhotoIds} , IsDeleted : false} , {_id:1,UnsplashPhotoId:1});
						savedMedias = savedMedias ? savedMedias : [];

						console.log("savedMedias === ", savedMedias.length);
						for(var loop = 0; loop < savedMedias.length; loop++ ){
							UnsplashPhotoId__AlreadyExists.push(savedMedias[loop].UnsplashPhotoId);
						}
						console.log("UnsplashPhotoId__AlreadyExists === ", UnsplashPhotoId__AlreadyExists.length);
						var newRecordsToSave = [];
						for(var loop = 0; loop < recordsToUpload.length; loop++ ){
							var recordsToUploadObj = recordsToUpload[loop];
							var unsplashPhotoId = recordsToUploadObj["Photo ID"] ? recordsToUploadObj["Photo ID"] : null;
							var unsplashImageURL = recordsToUploadObj["Image Source"] ? recordsToUploadObj["Image Source"] : null;

							var unsplashImageTags = recordsToUploadObj["Descriptors/Concepts/Related tags"] ? recordsToUploadObj["Descriptors/Concepts/Related tags"] : null;

							var unsplashImageTitle = recordsToUploadObj["Title"] ? recordsToUploadObj["Title"] : null;

							var unsplashImagePhotographer = recordsToUploadObj["Photographer"] ? recordsToUploadObj["Photographer"] : null;

							var unsplashStyleKeyword =  recordsToUploadObj["StyleKeyword"] ? recordsToUploadObj["StyleKeyword"] : "";

							var Lightness =  recordsToUploadObj["Lightness"] ? recordsToUploadObj["Lightness"] : "";
							var DominantColors =  recordsToUploadObj["Dominant colors"] ? recordsToUploadObj["Dominant colors"] : "";

							if(UnsplashPhotoId__AlreadyExists.indexOf(unsplashPhotoId) < 0) {
								var incNum = 0;
								//console.log("incNum = ", incNum);

								var data = await counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
								data = data ? data : null;
								if(data) {
									incNum = data.seq;
									//console.log("incNum = ", incNum);

									var RecordLocator = unsplashImageURL.split('?')[0].split('/').pop();
									var file_name = "";
									var name = '';
									name = dateFormat() + '_' + incNum;

									file_name = name + '.' + ext;

									var media_type = 'Link';

									var __UploaderID = '';
									if (req.session.admin) {
										__UploaderID = req.session.admin._id;
									} else if (req.session.subAdmin) {
										__UploaderID = req.session.subAdmin._id;
									}
									else {
										//return;
									}

									var dataToUpload = {
										Prompt : unsplashImageTags,
										Title : unsplashImageTitle,
										Photographer : unsplashImagePhotographer,
										Location: [],
										UploadedBy: "admin",
										UploadedOn: Date.now(),
										UploaderID: __UploaderID,
										Source: "Unsplash",
										SourceUniqueID: null,
										Domains: null,
										AutoId: incNum,
										GroupTags: [],
										Collection: null,
										Status: 1,
										MetaMetaTags: "5464931fde9f6868484be3d7",
										MetaTags: null,
										AddedWhere: "directToPf", //directToPf,hardDrive,dragDrop
										IsDeleted: 0,
										TagType: "",
										ContentType: "",
										MediaType: media_type,
										LinkType : "image",
										IsUnsplashImage : true,
										UnsplashPhotoId : unsplashPhotoId,
										thumbnail : unsplashImageURL,
										Content : '<img src="'+unsplashImageURL+'" alt="Link">',
										AddedHow: 'importExcel',
										Locator: RecordLocator + "_" + incNum,	//added on 23012014
										StyleKeyword : unsplashStyleKeyword,
										Lightness: Lightness ? Lightness : 0,
										DominantColors: DominantColors ? DominantColors : ""
									};

									dataToUpload.Location.push({
										Size: "",
										URL: unsplashImageURL
									});

									var descriptorArr = unsplashImageTags ? unsplashImageTags : '';
									descriptorArr = descriptorArr.toString();
									descriptorArr = descriptorArr.split(',');

									var descriptorArr__unique = [];

									for (var a = 0; a < descriptorArr.length; a++) {
										var flag = 0;
										var tagStr = typeof (descriptorArr[a]) == 'string' ? descriptorArr[a].trim().toLowerCase() : '';
										if (descriptorArr__unique.indexOf(tagStr) == -1) {
											descriptorArr__unique.push(tagStr);
										}
									}

									for( var loop2 = 0; loop2 < descriptorArr__unique.length; loop2++ ){
										var title = descriptorArr__unique[loop2];
										title = typeof (title) == 'string' ? title.trim().toLowerCase() : '';
										if (title) {
											title = title ? title.trim() : '';	//added by manishp on 09032016
											title = title.replace(/[^a-zA-Z0-9 \-\\]/g, "");
											if(title){
												//allDescriptors.push(title);
												var gtId = localGTMap[title] ? localGTMap[title] : null;
												if(gtId) {
													dataToUpload.GroupTags.push({
														_id : new ObjectId(),
														GroupTagID : gtId
													});
												}
											}
										}
									}

									newRecordsToSave.push(dataToUpload);

								} else {
									console.log("data went wrong = ", data);
								}
							}
						}
						console.log("newRecordsToSave === ", newRecordsToSave.length);
						if(newRecordsToSave.length) {
							var i,j, temporary, chunk = 200;
							for (i = 0,j = newRecordsToSave.length; i < j; i += chunk) {
								temporary = newRecordsToSave.slice(i, i + chunk);
								var results = await media.insertMany(temporary);
								results = results ? results : null;
								if(results) {
									console.log("200 new medias saved ....");
								}
							}
							res.json({code:200 , recordsUploaded : newRecordsToSave.length, recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists.length});
						} else {
							res.json({code:200 , recordsUploaded : 0 , recordsToReportError : recordsToReportError , UnsplashPhotoId__AlreadyExists : UnsplashPhotoId__AlreadyExists.length});
						}
					}
				});
			}
		}
		else {
			res.json({ "code": 501, "msg": "Wrong Input!" });
		}
	});
}

//exports.uploadMassImport = uploadMassImport;
//exports.uploadMassImport = importUnsplashImages;
exports.uploadMassImport = importUnsplashImagesV2;

async function getPageIdByPostId (postId) {
	var pageId = null;
	var ownerId = null;
	var PageData = await Page.find({"Medias._id" : ObjectId(postId), IsDeleted: 0}, {_id: 1, OwnerId: 1});
	PageData = Array.isArray(PageData) ? PageData : [];
	if(PageData.length) {
		pageId = PageData[0]._id;
		ownerId = PageData[0].OwnerId;
	}
	return {
		pageId,
		ownerId
	};
}

var addMjImageToMedia__INTERNAL_API = async function (req, res) {
	let inputObj = req.body || {};

	const realFileName = typeof inputObj.GoogleDriveFilename === 'string' ? inputObj.GoogleDriveFilename.trim() : null;

	if(!realFileName) {
		return res.json({code: 404, message: 'GoogleDriveFilename is invalid'});
	}

	//first thing to check whether the realFileName in the db or not
	const mediaRecord = await media.find({IsDeleted: 0, "MetaData.GoogleDriveFilename": realFileName}, {_id: 1});
	if(mediaRecord.length) {
		return res.json({code: 200, message: 'MJ image with the provided name already exists.'});
	}

	const Reset = "\x1b[0m",
		FgGreen = "\x1b[32m";
	
    try {
		if(!realFileName && inputObj.Base64Image) {
			return res.json({code: 404, message: 'Could not find the image in google drive'});
		}
		const extension = 'png';
		var imgUrl = `uploadImageTool_${dateFormat()+'_'+realFileName.replace(/.png/g, '')}.${extension}`;
		var mediaCenterPath = "/../../public/assets/Media/img/";
		var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail +"/"+ imgUrl;

		const buffer = Buffer.from(inputObj.Base64Image, "base64");
		fs.writeFileSync(srcPath, buffer);
		console.log(FgGreen, `- ${realFileName} - synced successfully.`);
		console.log(Reset, `\n`);

		if (fs.existsSync(srcPath)) {
			var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
			var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
			var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
			var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

			crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
			crop_image(srcPath, dstPathCrop_SG, 300, 300);
			crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
			resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
		}

		//save record to Media collection here
		var incNum = 0;
		var data = await counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
		data = typeof data === 'object' ? data : {};
		incNum = data.seq || 0;

		if(!incNum) {
			return res.json({code: 501, message: "Something went wrong."});
		}

		var type = 'Image';
		var thumbnail = '';
		var postStatement = '';
		var photographer = '';
		var title = ''
		var Prompt = inputObj.Prompt || '';

		var dataToUpload = {
			Title: title || '',
			Photographer: photographer || '',
			Location: [],
			AutoId: incNum,
			UploadedBy: "admin",
			UploadedOn: Date.now(),
			UploaderID: '5509bf222f2c61e7f9436f11',
			Source: 'ChatGPT_MJ',
			SourceUniqueID: "53ceb02d3aceabbe5d573dba",
			Domains: "53ad6993f222ef325c05039c",
			Prompt: Prompt || '',
			GroupTags: [],
			Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
			Status: 1,
			MetaMetaTags: null,
			MetaTags: null,
			AddedWhere: "board",
			IsDeleted: 0,
			TagType: "",
			Content: postStatement,
			ContentType: 'image/png',
			MediaType: type,
			AddedHow: 'uploadImageTool',
			thumbnail: thumbnail,
			Locator: imgUrl.replace('.png', '') + "_" + incNum,
			Lightness: inputObj.Lightness || 0,
			DominantColors: inputObj.DominantColors || '',
			MetaData: inputObj.MetaData || {}
		}

		dataToUpload.Location.push({
			Size: "",
			URL: imgUrl
		})

		var mediaData = await media(dataToUpload).save();
		console.log("Media record saved = ", mediaData._id);
		mediaData = mediaData ? mediaData : {};
		var tags = typeof mediaData.Prompt === 'string' ? mediaData.Prompt : '';
		if(tags && mediaData._id) {
			await addGTAsyncAwait(tags, mediaData._id);
		}
		return res.status(200).json({code: 200, message: 'MJ image uploaded successfully.'});
    } catch (err) {
        // TODO(developer) - Handle error
        console.log(err);
		return res.status(501).json({code: 501, message: 'Something went wrong'});
    }
};


var syncGdMjImage_INTERNAL_API = async function (realFileId, realFileName, postId, prompt, lightness, title, photographer, source) {
	var PageData = await getPageIdByPostId(postId);
	var PageId = PageData.pageId || null;
	var OwnerId = PageData.ownerId || null;

	if(!realFileId || !realFileName || !PageId || !OwnerId) {
		return 404;
	}

	//first thing to check whether the realFileName == PostId in the db or not

	const Reset = "\x1b[0m",
		Bright = "\x1b[1m",
		Dim = "\x1b[2m",
		Underscore = "\x1b[4m",
		Blink = "\x1b[5m",
		Reverse = "\x1b[7m",
		Hidden = "\x1b[8m",

		FgBlack = "\x1b[30m",
		FgRed = "\x1b[31m",
		FgGreen = "\x1b[32m",
		FgYellow = "\x1b[33m",
		FgBlue = "\x1b[34m",
		FgMagenta = "\x1b[35m",
		FgCyan = "\x1b[36m",
		FgWhite = "\x1b[37m",
		FgGray = "\x1b[90m",

		BgBlack = "\x1b[40m",
		BgRed = "\x1b[41m",
		BgGreen = "\x1b[42m",
		BgYellow = "\x1b[43m",
		BgBlue = "\x1b[44m",
		BgMagenta = "\x1b[45m",
		BgCyan = "\x1b[46m",
		BgWhite = "\x1b[47m",
		BgGray = "\x1b[100m";
	// Google authentication commented out for local development
	/*
	const SCOPES = [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/drive.readonly',
		'https://www.googleapis.com/auth/drive.metadata.readonly',
		'https://www.googleapis.com/auth/drive.metadata',
		'https://www.googleapis.com/auth/drive.photos.readonly'
	];

	const auth = new google.auth.JWT(
        // creds.client_email, null,
        // creds.private_key, SCOPES
    );
    const drive = google.drive({version: 'v3', auth});
	*/

    try {
		const extension = 'png';
		var imgUrl = `${postId+'_'+realFileName}.${extension}`;
		var mediaCenterPath = "/../../public/assets/Media/img/";
		var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail +"/"+ imgUrl;
		const dest = fs.createWriteStream(srcPath);
        const file = await drive.files.get(
            {
                fileId: realFileId,
                alt: 'media',
            },
            { responseType: 'stream' },
        );

        if(typeof file === 'object') {
            file.data
                .on('end', () => {
                    console.log(FgGreen, `- ${realFileName} (${realFileId}) - synced successfully.`);
                    console.log(Reset, `\n`);

					if (fs.existsSync(srcPath)) {
						var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
						var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
						var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
						var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

						crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
						crop_image(srcPath, dstPathCrop_SG, 300, 300);
						crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
						resize_image(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
					}

					//get all prior selected blend images of this post.
					(async () => {
						var conditions = {
							PostId : ObjectId(postId)
						};
						var SavedStreamData = await PageStream.find(conditions);
						SavedStreamData = Array.isArray(SavedStreamData) ? SavedStreamData : [];

						var alreadySelectedBlends = [];
						if(SavedStreamData.length) {
							//update existing one
							alreadySelectedBlends = SavedStreamData[0].SelectedBlendImages ? SavedStreamData[0].SelectedBlendImages : [];
							var newFirstElement = {
								"blendImage1" : "https://www.scrpt.com/assets/Media/img/600/09182022204653_35889.png",
								"blendImage2" : `https://www.scrpt.com/assets/Media/img/aspectfit/${imgUrl}`,
								"isSelected" : true,
								"blendMode" : "hard-light",
								"Keywords" : []
							};
							var setObj = {
								SelectedBlendImages: [newFirstElement].concat(alreadySelectedBlends)
							}
							var result = await PageStream.update(conditions, { $set: setObj }, { multi: false });
							console.log("PageStream Updated - ");

						} else {
							//save a new entry
							var newDoc = {
								PageId : ObjectId(PageId),
								PostId : ObjectId(postId),
								SelectedBlendImages : {
									"blendImage1" : "https://www.scrpt.com/assets/Media/img/600/09182022204653_35889.png",
									"blendImage2" : `https://www.scrpt.com/assets/Media/img/aspectfit/${imgUrl}`,
									"isSelected" : true,
									"blendMode" : "hard-light",
									"Keywords" : []
								}
							}
							var result = await PageStream(newDoc).save();
							console.log("PageStream Saved - ");
						}
					})();
                })
                .on('error', err => {
                    console.log('Error', err);
                })
                .pipe(dest);
        }

		return file.status;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

async function saveAndAddImageRecord (srcPath, imgUrl, OwnerId, PostId, currentDateFormat, realFileName, Prompt, Lightness, title, photographer, source) {
	if (fs.existsSync(srcPath)) {
		var mediaCenterPath = "/../../public/assets/Media/img/";
		var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
		var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
		var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
		var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgUrl;

		setTimeout(async ()=>{
			await crop_image_sync(srcPath, dstPathCrop_SMALL, 100, 100);
			await crop_image_sync(srcPath, dstPathCrop_SG, 300, 300);
			await crop_image_sync(srcPath, dstPathCrop_MEDIUM, 600, 600);
			await resize_image_sync(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
		},2000);

		var incNum = 0;
		var data = await counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
		data = typeof data === 'object' ? data : {};
		incNum = data.seq || 0;

		if(!incNum) {
			return res.json({code: 501, message: "Something went wrong."});
		}

		var type = 'Image';
		var name = `${PostId}_${currentDateFormat}_${realFileName}`;
		var thumbnail = '';
		var postStatement = '';

		var dataToUpload = {
			Title: title || '',
			Photographer: photographer || '',
			Location: [],
			AutoId: incNum,
			UploadedBy: "admin",
			UploadedOn: Date.now(),
			UploaderID: OwnerId,
			Source: source || 'MJ',
			SourceUniqueID: "53ceb02d3aceabbe5d573dba",
			Domains: "53ad6993f222ef325c05039c",
			Prompt: Prompt || '',
			GroupTags: [],
			Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
			Status: 1,
			MetaMetaTags: null,
			MetaTags: null,
			AddedWhere: "board",
			IsDeleted: 0,
			TagType: "",
			Content: postStatement,
			ContentType: 'image/png',
			MediaType: type,
			AddedHow: 'createStreamTool',
			thumbnail: thumbnail,
			Locator: 'createStreamTool' + '_' + name.replace('.png', '') + "_" + incNum,
			Lightness: Lightness || 0
		}

		dataToUpload.Location.push({
			Size: "",
			URL: imgUrl
		})

		var mediaData = await media(dataToUpload).save();
		console.log("Media record saved = ", mediaData._id);
		mediaData = mediaData ? mediaData : {};
		var tags = typeof mediaData.Prompt === 'string' ? mediaData.Prompt : '';
		if(tags && mediaData._id) {
			await addGTAsyncAwait(tags, mediaData._id);
		}
	}
	return imgUrl;
}

const saveStreamMap = async (PageId, PostId, blendImage1, blendImage2, blendMode) => {
	var conditions = {
		PostId : ObjectId(PostId)
	};
	var SavedStreamData = await PageStream.find(conditions);
	SavedStreamData = Array.isArray(SavedStreamData) ? SavedStreamData : [];

	var alreadySelectedBlends = [];
	if(SavedStreamData.length) {
		//update existing one
		alreadySelectedBlends = SavedStreamData[0].SelectedBlendImages ? SavedStreamData[0].SelectedBlendImages : [];
		var newFirstElement = {
			"blendImage1" : `https://www.scrpt.com/assets/Media/img/aspectfit/${blendImage1}`,
			"blendImage2" : `https://www.scrpt.com/assets/Media/img/aspectfit/${blendImage2}`,
			"isSelected" : true,
			"blendMode" : blendMode || "hard-light",
			"Keywords" : []
		};
		var setObj = {
			SelectedBlendImages: [newFirstElement].concat(alreadySelectedBlends)
		}
		var result = await PageStream.update(conditions, { $set: setObj }, { multi: false });
		console.log("PageStream Updated - ");

	} else {
		//save a new entry
		var newDoc = {
			PageId : ObjectId(PageId),
			PostId : ObjectId(PostId),
			SelectedBlendImages : {
				"blendImage1" : `https://www.scrpt.com/assets/Media/img/aspectfit/${blendImage1}`,
				"blendImage2" : `https://www.scrpt.com/assets/Media/img/aspectfit/${blendImage2}`,
				"isSelected" : true,
				"blendMode" : blendMode || "hard-light",
				"Keywords" : []
			}
		}
		var result = await PageStream(newDoc).save();
		console.log("PageStream Saved - ");
	}
}

var syncGdTwoMjImage_INTERNAL_API = async function (req, res) {
	var body = req.body || {};
	body.inputArr = body.inputArr || [];

	var realFileIds = [];
	var realFileNames = [];
	var prompts = [];
	var lightnesses = [];
	var titles = [];
	var photographers = [];
	var sources = [];

	for(var loop = 0; loop < body.inputArr.length; loop++) {
		if(body.inputArr[loop].fileId && body.inputArr[loop].fileName) {
			realFileIds.push(body.inputArr[loop].fileId);
			realFileNames.push(body.inputArr[loop].fileName);
			prompts.push(body.inputArr[loop].prompt || '');
			lightnesses.push(body.inputArr[loop].lightness || 0);
			titles.push(body.inputArr[loop].title || '');
			photographers.push(body.inputArr[loop].photographer || '');
			sources.push(body.inputArr[loop].source || '');
		}
	}

	var PostId = body.PostId || [];
	var PageData = await getPageIdByPostId(PostId);
	var PageId = PageData.pageId || null;
	var OwnerId = PageData.ownerId || null;
	//first thing to check whether the realFileName == PostId in the db or not
	const Reset = "\x1b[0m",
		Bright = "\x1b[1m",
		Dim = "\x1b[2m",
		Underscore = "\x1b[4m",
		Blink = "\x1b[5m",
		Reverse = "\x1b[7m",
		Hidden = "\x1b[8m",

		FgBlack = "\x1b[30m",
		FgRed = "\x1b[31m",
		FgGreen = "\x1b[32m",
		FgYellow = "\x1b[33m",
		FgBlue = "\x1b[34m",
		FgMagenta = "\x1b[35m",
		FgCyan = "\x1b[36m",
		FgWhite = "\x1b[37m",
		FgGray = "\x1b[90m",

		BgBlack = "\x1b[40m",
		BgRed = "\x1b[41m",
		BgGreen = "\x1b[42m",
		BgYellow = "\x1b[43m",
		BgBlue = "\x1b[44m",
		BgMagenta = "\x1b[45m",
		BgCyan = "\x1b[46m",
		BgWhite = "\x1b[47m",
		BgGray = "\x1b[100m";
	// Google authentication commented out for local development
	/*
	const SCOPES = [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/drive.readonly',
		'https://www.googleapis.com/auth/drive.metadata.readonly',
		'https://www.googleapis.com/auth/drive.metadata',
		'https://www.googleapis.com/auth/drive.photos.readonly'
	];

	const auth = new google.auth.JWT(
        // creds.client_email, null,
        // creds.private_key, SCOPES
    );
    const drive = google.drive({version: 'v3', auth});
	*/

	//var realFileIds = realFileIds.split(';');
	//var realFileNames = realFileNames.split(';');
	if(realFileIds.length === 2 && realFileNames.length === 2) {
		var realFileId = realFileIds[0];
		var realFileName = realFileNames[0].replace('.png', '');

		if(!realFileId || !realFileName || !PageId || !PostId) {
			return res.status(404).json({code: 404, message: 'Not Found.'});
		}

		try {
			var currentDateFormat = dateFormat();
			var extension = 'png';
			var imgUrl = `${PostId}_${currentDateFormat}_${realFileName}.${extension}`;
			var mediaCenterPath = "/../../public/assets/Media/img/";
			var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail +"/"+ imgUrl;
			var dest = fs.createWriteStream(srcPath);
			var file = await drive.files.get(
				{
					fileId: realFileId,
					alt: 'media',
				},
				{ responseType: 'stream' },
			);

			if(typeof file === 'object') {
				file.data
					.on('end', async () => {
						console.log(FgGreen, `- ${realFileName} (${realFileId}) - synced successfully.`);
						console.log(Reset, `\n`);

						//var OwnerId = result[0].OwnerId;
						var prompt = prompts[0] || '';
						var lightness = lightnesses[0] || 0;
						var title = titles[0] || '';
						var photographer = photographers[0] || '';
						var source = sources[0] || '';

						var blendImage1 = await saveAndAddImageRecord (srcPath, imgUrl, OwnerId, PostId, currentDateFormat, realFileName, prompt, lightness, title, photographer, source);

						realFileId = realFileIds[1];
						realFileName = realFileNames[1].replace('.png', '');
						prompt = prompts[1] || '';
						lightness = lightnesses[1] || 0;
						title = titles[1] || '';
						photographer = photographers[1] || '';
						source = sources[1] || '';

						currentDateFormat = dateFormat();
						extension = 'png';
						imgUrl = `${PostId}_${currentDateFormat}_${realFileName}.${extension}`;
						mediaCenterPath = "/../../public/assets/Media/img/";
						srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail +"/"+ imgUrl;
						var dest2 = fs.createWriteStream(srcPath);
						var file2 = await drive.files.get(
							{
								fileId: realFileId,
								alt: 'media',
							},
							{ responseType: 'stream' },
						);

						file2.data
						.on('end', async () => {
							var blendImage2 = await saveAndAddImageRecord (srcPath, imgUrl, OwnerId, PostId, currentDateFormat, realFileName, prompt, lightness, title, photographer, source)
							//get all prior selected blend images of this post.
							var blendMode = "hard-light";

							var obj = {
								"blendImage1" : blendImage1,
								"blendImage2" : blendImage2,
								"isSelected" : true,
								"blendMode" : "hard-light"
							};

							obj = CommonAlgo.commonModule.getBlendConfigByLightnessScores(obj, (lightnesses[0] || 0), (lightnesses[1] || 0));

							await saveStreamMap(PageId, PostId, obj.blendImage1, obj.blendImage2, obj.blendMode);
							return res.status(200).json({code: 200, message: 'Done.'});
						})
						.on('error', err => {
							console.log('Error', err);
							return res.status(501).json({code: 501, message: 'Something went wrong'});
						})
						.pipe(dest2);
					})
					.on('error', err => {
						console.log('Error', err);
						return res.status(501).json({code: 501, message: 'Something went wrong'});
					})
					.pipe(dest);
			} else {
				return res.status(501).json({code: 501, message: 'Something went wrong'});
			}
		} catch (err) {
			// TODO(developer) - Handle error
			throw err;
		}
	}
}

const fixUploadedImages_BROWSER_API = async function (req, res) {
	try {
		const mediaRecords = await media.find({Source: "ChatGPT_MJ"}, {"Location": 1}).sort({_id: 1});
		
		for (let i = 0; i < mediaRecords.length; i++) {
			const record = mediaRecords[i];
			const Location = Array.isArray(record.Location) ? record.Location : [];
			const imgName = Location.length ? Location[0].URL : null;
			if(imgName) {
				var mediaCenterPath = "/../../public/assets/Media/img/";
				var srcPath = __dirname + mediaCenterPath + process.urls.aspectfit__thumbnail +"/"+ imgName;

				if (fs.existsSync(srcPath)) {
					var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgName;
					var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgName;
					var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgName;
					var dstPathCrop_aspectfit_small__thumbnail = __dirname + mediaCenterPath + process.urls.aspectfit_small__thumbnail + "/" + imgName;

					!fs.existsSync(dstPathCrop_SMALL) && await crop_image_sync(srcPath, dstPathCrop_SMALL, 100, 100);
					!fs.existsSync(dstPathCrop_SG) && await crop_image_sync(srcPath, dstPathCrop_SG, 300, 300);
					!fs.existsSync(dstPathCrop_MEDIUM) && await crop_image_sync(srcPath, dstPathCrop_MEDIUM, 600, 600);
					!fs.existsSync(dstPathCrop_aspectfit_small__thumbnail) && await resize_image_sync(srcPath, dstPathCrop_aspectfit_small__thumbnail, 575, 360);
					
					console.log(`process completed for image number = ${i}`);
				} else {
					console.log(`Original image is missing for image number = ${i}`);
				}
			}
		}
		return res.json({code: 200, message: 'Process completed.'});
	} catch (err) {
		console.log("Caught Error - ", err);
		return res.json({code: 501, message: 'Something went wrong.'});
	}
}

//?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9
var addUnsplashImageToMedia__INTERNAL_API = async function (req, res) {
	let inputObj = req.body || {};

	let unsplashImageURL = typeof inputObj.UnsplashURL === 'string' ? inputObj.UnsplashURL.trim() : '';
	let unsplashImageURLParts = unsplashImageURL.split('?').map(obj=>obj.trim());
	if(unsplashImageURLParts.length === 2) {
		if(unsplashImageURLParts[0] && !unsplashImageURLParts[1]) {
			unsplashImageURL = unsplashImageURLParts[0]+'?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9';
		}
	} else if(unsplashImageURLParts.length === 1) {
		if(unsplashImageURLParts[0]) {
			unsplashImageURL = unsplashImageURLParts[0]+'?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjEyMDd9';
		}
	}

	var locator = unsplashImageURLParts[0].split('/')[1] || '';

	if(!unsplashImageURL) {
		return res.json({code: 404, message: 'unsplashImageURL is invalid'});
	}

	//first thing to check whether the unsplashImageURL in the db or not
	const mediaRecord = await media.find({IsDeleted: 0, "thumbnail": {$regex: new RegExp("^"+unsplashImageURLParts[0]+"", "i")} }, {_id: 1});
	if(mediaRecord.length) {
		return res.json({code: 200, unsplashImageURL: unsplashImageURL, message: 'Unsplash image with the provided name already exists.'});
	}
	
    try {
		//save record to Media collection here
		var incNum = 0;
		var data = await counters.findOneAndUpdate({ _id: "userId" }, { $inc: { seq: 1 } }, { new: true });
		data = typeof data === 'object' ? data : {};
		incNum = data.seq || 0;

		if(!incNum) {
			return res.json({code: 501, message: "Something went wrong."});
		}

		var type = 'Link';
		var thumbnail = '';
		var postStatement = '';
		var unsplashPhotoId = '';
		var photographer = '';
		var title = ''
		var Prompt = inputObj.Prompt || '';

		var dataToUpload = {
			Title: title || '',
			Photographer: photographer || '',
			Location: [],
			AutoId: incNum,
			UploadedBy: "admin",
			UploadedOn: Date.now(),
			UploaderID: '5509bf222f2c61e7f9436f11',
			Source: 'UnsplashImage_Tool',
			SourceUniqueID: "53ceb02d3aceabbe5d573dba",
			Domains: "53ad6993f222ef325c05039c",
			Prompt: Prompt || '',
			GroupTags: [],
			Collection: ["53ceaf933aceabbe5d573db4", "53ceaf9d3aceabbe5d573db6", "549323f9610706c30a70679e"],
			Status: 1,
			MetaMetaTags: ObjectId("5464931fde9f6868484be3d7"),
			MetaTags: null,
			AddedWhere: "directToPf",
			IsDeleted: 0,
			TagType: "",
			Content: '<img src="'+unsplashImageURL+'" alt="Link">',
			ContentType: '',
			MediaType: type,
			LinkType: 'image',
			AddedHow: 'uploadUnsplashImageTool',
			thumbnail: unsplashImageURL,
			Locator: locator + "_" + incNum,
			Lightness: inputObj.Lightness || 0,
			DominantColors: inputObj.DominantColors || '',
			MetaData: inputObj.MetaData || {},
			IsUnsplashImage: true,
			UnsplashPhotoId : unsplashPhotoId || ''
		}

		dataToUpload.Location.push({
			Size: "",
			URL: unsplashImageURL
		})

		var mediaData = await media(dataToUpload).save();
		console.log("Media record saved = ", mediaData._id);
		mediaData = mediaData ? mediaData : {};
		var tags = typeof mediaData.Prompt === 'string' ? mediaData.Prompt : '';
		if(tags && mediaData._id) {
			await addGTAsyncAwait(tags, mediaData._id);
		}
		return res.status(200).json({code: 200, unsplashImageURL: unsplashImageURL, message: 'Unsplash image uploaded successfully.'});
    } catch (err) {
        // TODO(developer) - Handle error
        console.log(err);
		return res.status(501).json({code: 501, message: 'Something went wrong'});
    }
};


exports.syncGdMjImage_INTERNAL_API = syncGdMjImage_INTERNAL_API;
exports.syncGdTwoMjImage_INTERNAL_API = syncGdTwoMjImage_INTERNAL_API;
exports.addMjImageToMedia__INTERNAL_API = addMjImageToMedia__INTERNAL_API;
exports.fixUploadedImages_BROWSER_API = fixUploadedImages_BROWSER_API;
exports.addUnsplashImageToMedia__INTERNAL_API = addUnsplashImageToMedia__INTERNAL_API;
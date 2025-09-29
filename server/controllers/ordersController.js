var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var Referral = require('./../models/referralModel.js');
var Cart = require('./../models/cartModel.js');
var Order = require('./../models/orderModel.js');
var Transaction = require('./../models/transectionHistoryModel.js')
//var stripe = require("stripe")(process.STRIPE_CONFIG.DEV.secret_key);	//test mode
var stripe = require("stripe")(process.STRIPE_CONFIG.LIVE.secret_key); //live mode
var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');
var AppSetting = require('./../models/appSettingModel.js')


var async_lib = require('async');

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
//var Page = require('./../models/pageModel.js');

var fsextra = require('fs-extra');
var replaceInFile = require('replace-in-file');
const axios = require('axios');
var PageStream = require('./../models/pageStreamModel.js');

function getPriceUpperLimit(price) {
	return (parseFloat(price)*10).toFixed(2);
}

async function increamentStreamPrice (streamId, price, cent) {
	var centToUSD = (cent/100);
	var increamentedPrice = parseFloat(price + centToUSD).toFixed(2);
	await Capsule.update({_id : ObjectId(streamId)}, {$set : {Price : increamentedPrice}});

}

async function __increamentPriceOfOrderedCapsules (cartItems) {
	for(var i = 0; i < cartItems.length; i++) {
		var cartObj = cartItems[i];
		var capsuleId = cartObj.CapsuleId || null;
		var capsuleObj = await Capsule.findOne({_id: ObjectId(capsuleId)}, {Price: 1});
		capsuleObj.Price = capsuleObj.Price || null;
		cartObj.Owners = Array.isArray(cartObj.Owners) ? cartObj.Owners : [];
		if(capsuleObj.Price) {
			if(capsuleObj.Price < getPriceUpperLimit(capsuleObj.Price)) {
				await increamentStreamPrice (capsuleId, capsuleObj.Price, (1*cartObj.Owners.length));
			}
		}
	}
}

function __getEmailEngineDataSetsBasedOnMonthAndKeyPost (CapsuleData) {
	var EmailEngineDataSets = [];

	var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';

	var afterDaysArr = process.StreamConfig[selectedMonths]['KeyPost'] ? process.StreamConfig[selectedMonths]['KeyPost'] : [];
	for(var i = 0; i < afterDaysArr.length; i++) {
		EmailEngineDataSets.push(
			{
				TextAboveVisual : '',
				TextBelowVisual : '',
				AfterDays : afterDaysArr[i]
			}
		);
	}

	return EmailEngineDataSets;

}

function __getEmailEngineDataSetsForKeyPost (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	//console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = true;
	var IsOnlyPostImage = true; //CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

	var concatPostsArr = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts.length);
		for(var i = 0; i < neededConcatNo; i++) {
			concatPostsArr = concatPostsArr.concat(PagePosts);
		}
	}

	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}

	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];

			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}

					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';

					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}


	return NewEmailEngineDataSets;

}

function __getEmailEngineDataSetsBasedOnMonthAndFreq (CapsuleData) {
	var EmailEngineDataSets = [];

	var frequency = CapsuleData.Frequency ? CapsuleData.Frequency : 'high';
	var selectedMonths = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';

	var afterDaysArr = process.StreamConfig[selectedMonths][frequency] ? process.StreamConfig[selectedMonths][frequency] : [];
	for(var i = 0; i < afterDaysArr.length; i++) {
		EmailEngineDataSets.push(
			{
				TextAboveVisual : '',
				TextBelowVisual : '',
				AfterDays : afterDaysArr[i]
			}
		);
	}

	return EmailEngineDataSets;

}

function __getEmailEngineDataSetsFromSelectedBlendImages_NDays_V2 (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData, nDays) {
	var postPerDay = nDays || 1;
	var eeDataSets = [];
	for(var e = 0; e < EmailEngineDataSets.length; e++) {
		eeDataSets.push(EmailEngineDataSets[e]);
		for(var p = 0; p < (postPerDay-1); p++) {
			eeDataSets.push(EmailEngineDataSets[e]);
		}
	}
	EmailEngineDataSets = eeDataSets;

	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

	var concatPostsArr = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			if(obj.PostType == 'Post') {
				return obj;
			}
		});

		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			var remainder = parseInt(EmailEngineDataSets.length % PagePosts_WithoutGeneralPosts.length)
			for(var i = 0; i < (neededConcatNo-1); i++) {
				concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts);
			}

			for(var i = 0; i < remainder; i++) {
				concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts.slice(0, remainder));
			}
		}
	}

	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}

	var finalPostsScheduleArr = concatPostsArr.filter((obj)=>{
		if(obj._id === currentPostObj._id) {
			return obj;
		}
	});
	finalPostsScheduleArr = finalPostsScheduleArr || [];
	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;

	for(var i = 0; i < finalPostsScheduleArr.length; i++) {
		var postObj = finalPostsScheduleArr[i];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

		postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
		if(postObj.PostType == 'GeneralPost') {
			IsOnlyPostImage = true;
		}

		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];

			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}

					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';

					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}

	/*for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

		postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
		if(postObj.PostType == 'GeneralPost') {
			IsOnlyPostImage = true;
		}

		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];

			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}

					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';

					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}*/


	return NewEmailEngineDataSets;

}

function __getEmailEngineDataSetsFromSelectedBlendImages_NDays (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData, nDays) {
	var postPerDay = nDays ? nDays : 1;
	var eeDataSets = [];
	for(var e = 0; e < EmailEngineDataSets.length; e++) {
		eeDataSets.push(EmailEngineDataSets[e]);
		for(var p = 0; p < (postPerDay-1); p++) {
			eeDataSets.push(EmailEngineDataSets[e]);
		}
	}
	EmailEngineDataSets = eeDataSets;

	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

	var concatPostsArr = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			if(obj.PostType == 'Post') {
				return obj;
			}
		});
		//var PagePosts_WithoutGeneralPosts = PagePosts;
		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var mp = 0; mp < neededConcatNo; mp++) {
				concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}

	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}

	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var jt = 0; jt < loopLimit; jt++) {
		var postObj = concatPostsArr[jt];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

		currentPostObj.PostType = currentPostObj.PostType ? currentPostObj.PostType : 'Post';
		if(currentPostObj.PostType == 'GeneralPost') {
			IsOnlyPostImage = true;
		}

		currentPostObj.SelectedBlendImages = currentPostObj.SelectedBlendImages ? currentPostObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[jt];
			emailDataSet.VisualUrls = [];

			if(IsOnlyPostImage) {
				var PostImage = currentPostObj.thumbnail ? currentPostObj.thumbnail : currentPostObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(currentPostObj.SelectedBlendImages.length) {
					selectBlendImageCounter = selectBlendImageCounter+1;
					if(currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}

					emailDataSet.BlendMode = currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? currentPostObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';

					if(selectBlendImageCounter == (currentPostObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}


	return NewEmailEngineDataSets;

}


function __getEmailEngineDataSetsFromSelectedBlendImages (currentPostObj, PagePosts, EmailEngineDataSets, CapsuleData) {
	console.log("PagePosts.length ==--------------- ", PagePosts.length);
	var IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
	var IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

	var concatPostsArr = PagePosts;
	if(!IsOnetimeStream && (EmailEngineDataSets.length > PagePosts.length)) {
		var PagePosts_WithoutGeneralPosts = PagePosts.filter(function(obj) {
			obj.PostType = obj.PostType ? obj.PostType : 'Post';
			if(obj.PostType == 'Post') {
				return obj;
			}
		});

		if(PagePosts_WithoutGeneralPosts.length) {
			var neededConcatNo = parseInt(EmailEngineDataSets.length / PagePosts_WithoutGeneralPosts.length);
			for(var i = 0; i < neededConcatNo; i++) {
				concatPostsArr = concatPostsArr.concat(PagePosts_WithoutGeneralPosts);
			}
		}
	}

	//var loopLimit = EmailEngineDataSets.length;
	var loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	if(IsOnetimeStream) {
		loopLimit = (EmailEngineDataSets.length > concatPostsArr.length) ? concatPostsArr.length : EmailEngineDataSets.length;
	}

	var NewEmailEngineDataSets = [];
	var selectBlendImageCounter = -1;
	for(var i = 0; i < loopLimit; i++) {
		var postObj = concatPostsArr[i];
		IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;

		postObj.PostType = postObj.PostType ? postObj.PostType : 'Post';
		if(postObj.PostType == 'GeneralPost') {
			IsOnlyPostImage = true;
		}

		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];
		if(currentPostObj._id == postObj._id) {
			var emailDataSet = EmailEngineDataSets[i];
			emailDataSet.VisualUrls = [];

			if(IsOnlyPostImage) {
				var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
				PostImage = PostImage ? PostImage : '';
				PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

				emailDataSet.VisualUrls[0] = PostImage;
				emailDataSet.VisualUrls[1] = PostImage;
				emailDataSet.BlendMode = 'hard-light';
			} else {
				if(postObj.SelectedBlendImages.length) {
					selectBlendImageCounter++;
					if(postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1 && postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2) {
						emailDataSet.VisualUrls[0] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage1;
						emailDataSet.VisualUrls[1] = postObj.SelectedBlendImages[selectBlendImageCounter].blendImage2;
					}

					emailDataSet.BlendMode = postObj.SelectedBlendImages[selectBlendImageCounter].blendMode ? postObj.SelectedBlendImages[selectBlendImageCounter].blendMode: 'hard-light';

					if(selectBlendImageCounter == (postObj.SelectedBlendImages.length-1)) {
						selectBlendImageCounter = -1;
					}
				}
			}
			NewEmailEngineDataSets.push(emailDataSet);
		}
	}


	return NewEmailEngineDataSets;

}

async function __streamPagePostNow(PagePosts, PageData, shareWithEmail, req, CapsuleData) {
	//PagePosts = PagePosts.reverse();
	var PagePosts2 = PagePosts.sort(function(a,b){
	  // Turn your strings into dates, and then subtract them
	  // to get a value that is either negative, positive, or zero.
	  return new Date(b.PostedOn) - new Date(a.PostedOn);
	});

	var PagePosts_keyposts = PagePosts2.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType == 'KeyPost') {
			return obj;
		}
	});

	var PagePosts2 = PagePosts2.filter(function(obj) {
		obj.PostType = obj.PostType ? obj.PostType : 'Post';
		if(obj.PostType != 'AdPost' && obj.PostType != 'BroadcastPost' && obj.PostType != 'KeyPost') {
			return obj;
		}
	});

	console.log("----------------- __streamPagePostNow called ----------------------------");
	var EmailEngineDataSets = __getEmailEngineDataSetsBasedOnMonthAndFreq (CapsuleData);
	if(!EmailEngineDataSets.length) {
		EmailEngineDataSets = null;
	}
	PageData.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
	PageData.EmailEngineDataSets = EmailEngineDataSets ? EmailEngineDataSets : PageData.EmailEngineDataSets;

	for(var loop = 0; loop < PagePosts2.length; loop++) {
		var postObj = PagePosts2[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

		var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : postObj.Content;

		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');

		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": shareWithEmail ? [shareWithEmail] : [],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : null,
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'PracticalThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false
		}

		inputObj.EmailEngineDataSets = [];

		var LabelId = postObj.Label ? String(postObj.Label) : null;

		for(var i = 0; i < PageData.EmailEngineDataSets.length; i++) {
			var obj = PageData.EmailEngineDataSets[i];
			obj.LabelId = obj.LabelId ? String(obj.LabelId) : null;
			if(LabelId === obj.LabelId) {
				inputObj.EmailEngineDataSets.push(obj);
			}
		}

		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = PageData.EmailEngineDataSets ? PageData.EmailEngineDataSets : [];
		}

		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);

		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}

		//get the selected blend images of the post if there is any else use the default procedure.
		//inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages (postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData);
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsFromSelectedBlendImages_NDays (postObj, PagePosts2, inputObj.EmailEngineDataSets, CapsuleData, 1);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];


		if(inputObj.IsOnetimeStream || postObj.PostType == 'GeneralPost') {
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length) {
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				var response = await axios.post(request_url, inputObj);
				response = response || {};
				response.data = response.data ? response.data : {};
				response.data.code = response.data.code ? response.data.code : null;
				console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);

				/*
				axios.post(request_url, inputObj)
					.then(response => {
						response.data = response.data ? response.data : {};
						response.data.code = response.data.code ? response.data.code : null;
						console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
					});
				*/
			}
		} else {
			if(postObj.SelectedBlendImages.length) {
				//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;

				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {

					//console.log('On right flow - https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase - ', inputObj.EmailEngineDataSets);
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
					//var request_url = 'https://www.scrpt.com/journal/streamPage';
					var response = await axios.post(request_url, inputObj);
					response = response || {};
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);

					/*
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
					*/
				}

			} else {
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage';

					var response = await axios.post(request_url, inputObj);
					response = response || {};
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);

					/*
					axios.post(request_url, inputObj)
						.then(response => {
							response.data = response.data ? response.data : {};
							response.data.code = response.data.code ? response.data.code : null;
							console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
						});
					*/
				}
			}
		}

	}


	var EmailEngineDataSets_keyposts = __getEmailEngineDataSetsBasedOnMonthAndKeyPost (CapsuleData);
	if(!EmailEngineDataSets_keyposts.length) {
		EmailEngineDataSets_keyposts = null;
	}
	EmailEngineDataSets_keyposts = EmailEngineDataSets_keyposts ? EmailEngineDataSets_keyposts : [];

	PagePosts_keyposts = PagePosts_keyposts ? PagePosts_keyposts : [];
	for(var loop = 0; loop < PagePosts_keyposts.length; loop++) {
		var postObj = PagePosts_keyposts[loop];
		var PostImage = postObj.thumbnail ? postObj.thumbnail : postObj.MediaURL;
		PostImage = PostImage ? PostImage : '';
		PostImage = PostImage.indexOf('unsplash') >= 0 ? PostImage : "https://www.scrpt.com/assets/Media/img/300/"+PostImage;

		var PostStatement = postObj.MediaType != 'Notes' ? postObj.PostStatement : postObj.Content;

		PostStatement = PostStatement.replace(new RegExp('style=','gi'), '');
		PostStatement = PostStatement.replace(new RegExp('<h[1-6].*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</h[1-6].*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<strong.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</strong.*?(?=\>)\>','gi'), '</span>');
		PostStatement = PostStatement.replace(new RegExp('<a.*?(?=\>)\>','gi'), '<span>');
		PostStatement = PostStatement.replace(new RegExp('</a.*?(?=\>)\>','gi'), '</span>');

		var inputObj = {
			"CapsuleId" : CapsuleData._id ? CapsuleData._id : null,
			"PageId" : PageData._id ? PageData._id : null,
			"PostId": postObj._id,
			"PostOwnerId": postObj.PostedBy,
			"ReceiverEmails": shareWithEmail ? [shareWithEmail] : [],
			"PostImage": PostImage,
			"PostStatement": PostStatement,
			"IsSurpriseCase": true,
			"IsPageStreamCase": true,
			"EmailEngineDataSets": [],
			"SurpriseSelectedWords" : postObj.SurpriseSelectedWords ? postObj.SurpriseSelectedWords.split(',') : null,
			"SurpriseSelectedTags" : [],
			"SyncedBy" : req.session.user._id,
			"SyncedByName" : req.session.user.Name,
			"EmailTemplate" : CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'PracticalThinker',
			"IsStreamPaused" : CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0,
			EmailSubject : CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null,
			IsOnetimeStream : CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false,
			IsOnlyPostImage : CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false
		}

		inputObj.EmailEngineDataSets = [];

		if(!inputObj.EmailEngineDataSets.length) {
			inputObj.EmailEngineDataSets = EmailEngineDataSets_keyposts ? EmailEngineDataSets_keyposts : [];
		}

		console.log("------------ inputObj.EmailEngineDataSets.length = ", inputObj.EmailEngineDataSets.length);

		for( var i = 0; i < inputObj.EmailEngineDataSets.length; i++ ) {
			inputObj.EmailEngineDataSets[i].TextAboveVisual = inputObj.EmailEngineDataSets[i].TextAboveVisual ? inputObj.EmailEngineDataSets[i].TextAboveVisual.replace(/\n/g,'<br />') : '';
			inputObj.EmailEngineDataSets[i].TextBelowVisual = inputObj.EmailEngineDataSets[i].TextBelowVisual ? inputObj.EmailEngineDataSets[i].TextBelowVisual.replace(/\n/g,'<br />') : '';
		}

		//get the selected blend images of the post if there is any else use the default procedure.
		inputObj.EmailEngineDataSets = __getEmailEngineDataSetsForKeyPost (postObj, PagePosts_keyposts, inputObj.EmailEngineDataSets, CapsuleData);
		postObj.SelectedBlendImages = postObj.SelectedBlendImages ? postObj.SelectedBlendImages : [];

		var KeyPost_case = true;	//inputObj.IsOnetimeStream
		if(KeyPost_case) {
			if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length) {
				//now call the api.
				var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
				//var request_url = 'https://www.scrpt.com/journal/streamPage';
				var response = await axios.post(request_url, inputObj);
				response = response || {};
				response.data = response.data ? response.data : {};
				response.data.code = response.data.code ? response.data.code : null;
				console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);

			}
		} else {
			if(postObj.SelectedBlendImages.length) {
				//inputObj.EmailEngineDataSets = NewEmailEngineDataSets;

				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage__WithSelectedBlendCase';
					//var request_url = 'https://www.scrpt.com/journal/streamPage';
					var response = await axios.post(request_url, inputObj);
					response = response || {};
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
				}

			} else {
				if(inputObj.PageId && inputObj.PostId && inputObj.PostOwnerId && inputObj.EmailEngineDataSets.length && inputObj.ReceiverEmails.length && inputObj.PostImage && inputObj.SurpriseSelectedWords) {
					//now call the api.
					var request_url = 'https://www.scrpt.com/journal/streamPage';
					var response = await axios.post(request_url, inputObj);
					response = response || {};
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					console.log("------------ AXIOS ---- Post has been streamed successfully using api call ---------------", response.data.code);
				}
			}
		}

	}
}

/*________________________________________________________________________
   * @Date:      		16 September 2015
   * @Method :   		getAllChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var getChapters = function (req, res) {
	var conditions = {
		CapsuleId: req.headers.capsule_id,
		//CreaterId : req.session.user._id,
		OwnerId: req.session.user._id,			//used by both creater - for publish and by Owner - for launch.
		//IsLaunched : 0,
		Status: 1,
		IsDeleted: 0
	};
	var sortObj = {
		Order: 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var chapter_ids = [];
			for (var loop = 0; loop < results.length; loop++) {
				chapter_ids.push(results[loop]._id);
			}

			var response = {
				status: 200,
				message: "Chapters listing",
				results: results,
				chapter_ids: chapter_ids
			}
			res.json(response);
		}
		else {
			// //console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}


/*________________________________________________________________________
   * @Date:      		07 September 2015
   * @Method :   		find
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var find = function (req, res) {
	var conditions = {
		//CreaterId : req.session.user._id,
		_id: req.headers.capsule_id ? req.headers.capsule_id : 0,
		Status: 1,
		IsDeleted: 0
	};

	var fields = {};
	// //console.log('===========================================');
	// //console.log(conditions);
	// //console.log('===========================================');

	Capsule.findOne(conditions).exec(function (err, results) {
		if (!err) {
			var response = {
				status: 200,
				message: "Capsules listing",
				result: results
			}
			res.json(response);
		}
		else {
			// //console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}
/*
var chapter__sendInvitations = function (ChapterData, invitees, req) {
	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL) {
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}
			var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has invited you in a chapter to join!';
			var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions));
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
					// //console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}


	//check type of capsule here and map email template accordingly!
	//make chapter view url
	var condition1 = {};
	condition1 = {
		_id: ChapterData.CapsuleId ? ChapterData.CapsuleId : 0,
		"LaunchSettings.CapsuleFor" : "Birthday",
		IsDeleted: 0
	};
	var fields1 = {

	};
	var IsBirthdayCapsule = false;

	Capsule.find(condition1 , fields1 , function( err , results) {
		if(!err){
			console.log("results ============= BIRTHDAY ==============BIRTHDAY=============== BIRTHDAY ------",results);
			if(results.length) {
				IsBirthdayCapsule = true;
			}
			goAhead();
		}
	})

	function goAhead () {
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
						var conditions = {};
						if(IsBirthdayCapsule) {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_BIRTHDAY";
						}
						else {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__Invitation";
						}

						EmailTemplate.find(conditions, {}, function (err, results) {
							if (!err) {
								if (results.length) {
									for (var loop = 0; loop < invitees.length; loop++) {
										var shareWithEmail = invitees[loop].UserEmail;
										var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

										// //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
										sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);

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
	}
};
*/
var chapter__sendInvitations = function (ChapterData, invitees, req) {
	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL) {
		User.find({ 'Email': shareWithEmail, IsDeleted: false }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}
			var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has invited you in a chapter to join!';
			/*
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'collabmedia.scrpt@gmail.com',
                    pass: 'scrpt123_2014collabmedia#1909'
                }
            });
			*/
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
					// //console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}


	//check type of capsule here and map email template accordingly!
	//make chapter view url
	var condition1 = {};
	condition1 = {
		_id: ChapterData.CapsuleId ? ChapterData.CapsuleId : 0,
		//"LaunchSettings.CapsuleFor" : "Birthday",
		IsDeleted: 0
	};
	var fields1 = {

	};
	var __capsuleFOR = "";

	Capsule.find(condition1 , fields1 , function( err , results) {
		if(!err){
			if(results.length) {
				results[0].LaunchSettings = results[0].LaunchSettings ? results[0].LaunchSettings : {};
				__capsuleFOR = results[0].LaunchSettings.CapsuleFor ? results[0].LaunchSettings.CapsuleFor : "";
			}
			goAhead(ChapterData, invitees, req);
		}
	})

	function goAhead (ChapterData, invitees, req) {
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
					console.log("-------------------------------Pages found---------------------------------");
					var data = {
						status: 200,
						message: "Pages listing",
						results: results
					}
					//res.json(response);

					if (data.results.length) {
						var conditions = {};
						if(__capsuleFOR == "Birthday") {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_BIRTHDAY";
						}
						else if(__capsuleFOR == "Theme") {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_THEME";
						}
						else {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__Invitation";
						}

						EmailTemplate.find(conditions, {}, function (err, results) {
							if (!err) {
								if (results.length) {
									for (var loop = 0; loop < invitees.length; loop++) {
										var shareWithEmail = invitees[loop].UserEmail;
										var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

										// //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
										sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);

									}
								}
							}
						})
					} else {
						//console.log("No Page Found...");
					}
				} else {
					//console.log(err);
				}
			});
		}
		else {
			//console.log("-------------------- No invitees -----------------");
		}
	}
};



var capsule__createNewInstance = async function (CapsuleData, owner, req, index_value_email) {
	var __capsuleId = CapsuleData._id;

	//check to make sure who will be the creater for new instances
	var __CreaterId_ForNewInstances = null;

	CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
	CapsuleData.LaunchSettings.Audience = CapsuleData.LaunchSettings.Audience ? CapsuleData.LaunchSettings.Audience : false;

	var CapsuleForCase = CapsuleData.LaunchSettings.Audience;
	switch (CapsuleForCase) {
		case "ME":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		case "OTHERS":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		case "BUYERS":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		default:
			res.json({ code: 404, message: "Something went wrong." });
	}


	//check to make sure who will be the creater for new instances


	// //console.log("owner = ", owner);

	//check if the owner is register or not
	var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
	var shareWithName = owner.UserName ? owner.UserName.split(' ')[0] : 'OWNER';
	var UniqueIdPerOwner = owner.UniqueIdPerOwner ? owner.UniqueIdPerOwner : null;

	if (shareWithEmail) {
		shareWithEmail = shareWithEmail.replace('.', '\.');
		var conditions = {};
		conditions.Email = new RegExp('^'+shareWithEmail+'$', 'i'),
		conditions.IsDeleted = false;

		var fields = {
			Email: true,
			Name: true,
			Gender: true,
			Birthdate: true
		};

		var UserData = await User.find(conditions, fields);
		UserData = Array.isArray(UserData) ? UserData : [];

		var data = {};
		data.Origin = "published";
		data.OriginatedFrom = __capsuleId;

		if (UniqueIdPerOwner != null) {
			data.UniqueIdPerOwner = UniqueIdPerOwner;
		}

		data.CreaterId = __CreaterId_ForNewInstances;
		data.PurchasedBy = req.session.user._id;		//started using this from SurpriseGift flow

		if (!UserData.length) {
			//Non-Registered user case
			data.OwnerId = req.session.user._id;	//will update this ownerId at the time of user registeration.
			//if this is a surprise gift case then creater owner account if not present already and map Owner id here.
			var request_url = 'https://www.scrpt.com/journal/createNewUserAccount_INTERNAL_API';
			let inputObj = {
				newUser : {
					Name : shareWithName,
					Email : shareWithEmail,
					NickName : shareWithName
				}
			};
			let response = await axios.post(request_url, inputObj);
			response.data = response.data ? response.data : {};
			response.data.code = response.data.code ? response.data.code : null;
			response.data.newUserId = response.data.newUserId ? response.data.newUserId : null;

			console.log("------------ AXIOS ---- BuyNow - New User has been created ---------------", response.data.code, response.data.newUserId);

			if(response.data.newUserId) {
				data.OwnerId = response.data.newUserId;
			}
		}
		else {
			data.OwnerId = UserData[0]._id;
		}

		data.OwnerEmail = shareWithEmail;
		data.Title = CapsuleData.Title;
		data.CoverArt = CapsuleData.CoverArt;

		data.IsPublished = true;				//published by someone else....
		data.MetaData = CapsuleData.MetaData ? CapsuleData.MetaData : {};

		var nowDate = Date.now();
		data.CreatedOn = nowDate;
		data.ModifiedOn = nowDate;

		//Birthday Capsule Updates ...
		CapsuleData.LaunchSettings.CapsuleFor = CapsuleData.LaunchSettings.CapsuleFor ? CapsuleData.LaunchSettings.CapsuleFor : "";
		if(CapsuleData.LaunchSettings.CapsuleFor == 'Birthday') {
			data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
			data.LaunchSettings.CapsuleFor = 'Birthday';
		}
		if(CapsuleData.LaunchSettings.CapsuleFor == 'Theme') {
			data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
			data.LaunchSettings.CapsuleFor = 'Theme';
			data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
		}

		if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
			CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : null;

			data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
			data.LaunchSettings.CapsuleFor = 'Stream';
			data.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType;
			data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.

			data.MonthFor = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';
			data.Frequency = CapsuleData.Frequency ? CapsuleData.Frequency : 'medium';
			data.EmailTemplate = CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'PracticalThinker';
			data.IsStreamPaused = CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0;
			data.EmailSubject = CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null;
			data.IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
			data.IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
			data.IsSurpriseGift = CapsuleData.IsSurpriseGift ? CapsuleData.IsSurpriseGift : false;
			data.OwnerAnswer = CapsuleData.OwnerAnswer ? CapsuleData.OwnerAnswer : false;

			data.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : null;
			if(CapsuleData.LaunchSettings.StreamType == 'Group') {
				data.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : 'Birthday';
				data.LaunchDate = null;
				if(data.StreamFlow != 'Birthday') {
					var t = new Date();
					var ty = t.getFullYear();
					var tm = t.getMonth() + 1;
					var td = t.getDate();
					var todayDate = new Date(ty + '-' + tm + '-' + td);

					var today = todayDate.getTime();
					var after2Days = today + (2*24*60*60*1000);

					var ldate = new Date(after2Days);
					var y = ldate.getFullYear();
					var m = ldate.getMonth() + 1;
					var d = ldate.getDate();
					data.LaunchDate = m + '/' + d + '/' + y;
				}

				if(data.StreamFlow == 'Birthday') {
					if(UserData.length) {
						UserData[0].Birthdate = UserData[0].Birthdate || '';
						var birthdateArr = UserData[0].Birthdate.split('/');
						if(birthdateArr.length === 3) {
							var t = new Date();
							var ty = t.getFullYear();
							var tm = t.getMonth() + 1;
							var td = t.getDate();
							td = parseInt(td) < 10 ? "0"+td : td;
							tm = parseInt(tm) < 10 ? "0"+tm : tm;
							var todayDate = new Date(ty + '-' + tm + '-' + td);
							var todayTS = todayDate.getTime();

							var thisYearBdayStr = ty + '-' + birthdateArr[0] + '-' + birthdateArr[1];
							var thisYearBday = new Date(thisYearBdayStr);
							var thisYearBdayTS = thisYearBday.getTime();

							var lDate = birthdateArr[0] + '/' + birthdateArr[1] + '/' + ty;
							if(thisYearBdayTS < todayTS) {
								thisYearBdayStr = birthdateArr[0] + '/' + birthdateArr[1] + '/' + (ty+1);
								lDate = thisYearBdayStr;
							}
							data.LaunchDate = lDate;
						}
					}
				}
			}

			data.IsOwnerPostsForMember = CapsuleData.IsOwnerPostsForMember ? CapsuleData.IsOwnerPostsForMember : false;
			data.IsPurchaseNeededForAllPosts = CapsuleData.IsPurchaseNeededForAllPosts ? CapsuleData.IsPurchaseNeededForAllPosts : false;

		}

		//// //console.log("data = ",data);
		var result = await Capsule(data).save();
		result = typeof result === 'object' ? result : null;
		if (result) {
			var conditions = {
				CapsuleId: __capsuleId,
				Status: 1,
				IsDeleted: 0
			};
			var sortObj = {
				Order: 1,
				ModifiedOn: -1
			};
			var fields = {
				_id: true
			};

			var newCapsuleId = result._id;
			var results = await Chapter.find(conditions, fields).sort(sortObj);
			results = Array.isArray(results) ? results : [];

			if (results.length) {
				var fields = {
					_id: true,
					Title: true,
					CoverArt: true,
					Order: true,
					LaunchSettings: true,
					CoverArtFirstPage: true,
					ChapterPlaylist: true
				};
				for (var loop = 0; loop < results.length; loop++) {
					var conditions = {};
					conditions._id = results[loop]._id;
					var result = await Chapter.findOne(conditions, fields);

					var __chapterId = result._id ? result._id : 0;
					var data = {};
					data.Origin = "published";
					data.OriginatedFrom = result._id;
					//data.CreaterId = req.session.user._id;
					data.CreaterId = __CreaterId_ForNewInstances;

					if (!UserData.length) {
						//Non-Registered user case			- this will be modified when user will register into the platform.
						data.OwnerId = req.session.user._id;
					}
					else {
						data.OwnerId = UserData[0]._id;
					}

					data.OwnerEmail = shareWithEmail;
					data.CapsuleId = newCapsuleId;

					data.Title = result.Title;
					data.CoverArt = result.CoverArt;
					data.Order = result.Order;
					data.LaunchSettings = {};
					data.LaunchSettings.NamingConvention = result.LaunchSettings.NamingConvention;	//Recommendation from creater
					data.LaunchSettings.ShareMode = result.LaunchSettings.ShareMode;	//Recommendation from creater
					data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
					data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];

					data.CreatedOn = nowDate;
					data.ModifiedOn = nowDate;

					if(CapsuleData.LaunchSettings.CapsuleFor == 'Theme') {
						data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
					}

					var result = await Chapter(data).save();
					result = typeof result === 'object' ? result : null;
					if (result) {
						var conditions = {
							ChapterId: __chapterId,
							//CreaterId : req.session.user._id, //removing this check because this same function is used for Private published / purchase__myself and purchase__gift cases now.
							IsDasheditpage: false,		//this is to prevent the double instances of the page issue
							IsDeleted: 0,
							PageType: { $in: ["gallery", "content"] }
						};
						var sortObj = {
							Order: 1,
							UpdatedOn: -1
						};
						var fields = {
							_id: true
						};

						var newChapterId = result._id;

						//__checkNcreateChapterIntroPage(result, shareWithName, CapsuleData);

						var results = await Page.find(conditions, fields).sort(sortObj);
						results = Array.isArray(results) ? results : [];
						if (results.length) {
							var fields = {
								_id: true,
								Title: true,
								TitleInvitees: true,
								PageType: true,
								Order: true,
								HeaderImage: true,
								BackgroundMusic: true,
								CommonParams: true,
								ViewportDesktopSections: true,
								ViewportTabletSections: true,
								ViewportMobileSections: true,
								SelectedMedia: true,
								SelectionCriteria: true,
								HeaderBlurValue: true,
								HeaderTransparencyValue: true,
								Labels: true,
								IsLabelAllowed: true,
								HeaderVideoLink : true,
								EmailEngineDataSets : true,
								VoiceOverLyricsSettings : true,
								VoiceOverFile : true,
								Themes : true
							};

							if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
								fields.Medias = true;
							}
							//console.log(" XXX -----------------------hERE 11111111 ---------------------- XXX", results.length);
							for (var loop = 0; loop < results.length; loop++) {
								var conditions = {};
								conditions._id = results[loop]._id;
								var result = await Page.findOne(conditions, fields);
								var data = {};
								data.Origin = "published";
								data.OriginatedFrom = result._id;
								data.CreaterId = __CreaterId_ForNewInstances;

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
								data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : result.Title;
								data.PageType = result.PageType;
								data.Order = result.Order;
								data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
								data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
								data.HeaderBlurValue = result.HeaderBlurValue;
								data.HeaderTransparencyValue = result.HeaderTransparencyValue;

								data.SelectedMedia = result.SelectedMedia;
								data.SelectionCriteria = result.SelectionCriteria;
								data.Labels = result.Labels ? result.Labels : [];
								data.IsLabelAllowed = result.IsLabelAllowed ? result.IsLabelAllowed : false;
								data.HeaderVideoLink = result.HeaderVideoLink ? result.HeaderVideoLink : '';
								data.EmailEngineDataSets = result.EmailEngineDataSets ? result.EmailEngineDataSets : [];
								data.VoiceOverLyricsSettings = result.VoiceOverLyricsSettings ? result.VoiceOverLyricsSettings : [];
								data.VoiceOverFile = result.VoiceOverFile ? result.VoiceOverFile : "";
								data.Themes = result.Themes ? result.Themes : [];


								data.CreatedOn = nowDate;
								data.UpdatedOn = nowDate;

								if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
									//make a copy of Posts and transfer ownership.
									data.Medias = result.Medias ? result.Medias : [];
									for(var i = 0; i < data.Medias.length; i++) {
										data.Medias[i].OriginatedFrom = data.Medias[i]._id;
										data.Medias[i].Origin = "Copy";
										data.Medias[i]._id = new ObjectId();
										data.Medias[i].OwnerId = data.OwnerId;
										data.Medias[i].PostedBy = ObjectId(data.OwnerId);

										var cond = {
											PageId : data.OriginatedFrom,
											PostId : data.Medias[i].OriginatedFrom
											//IsPageStreamCase : 1
										};
										var f = {
											SelectedBlendImages : 1
										};
										var SelectedBlendImages = await PageStream.find(cond, f);
										if(SelectedBlendImages.length) {
											data.Medias[i].SelectedBlendImages = SelectedBlendImages[0].SelectedBlendImages ? SelectedBlendImages[0].SelectedBlendImages : [];
										}

										data.Medias[i].SelectedBlendImages = data.Medias[i].SelectedBlendImages ? data.Medias[i].SelectedBlendImages : [];
									}
									//make a copy of post and transfer ownership
								}

								//AUTO NAME REPLACE FILTER
								var OwnerGender = "male";
								var OwnerName = "OWNER";
								if (UserData.length) {
									//Non-Registered user case
									OwnerGender = UserData[0].Gender ? UserData[0].Gender : "male";
									OwnerName = UserData[0].Name ? UserData[0].Name.split(' ')[0] : "OWNER";
								} else {
									OwnerName = shareWithName ? shareWithName : 'OWNER';
								}

								if (data.PageType == "gallery") {
									var str = data.Title;
									var res = str;
									if (OwnerGender == 'male') {
										res = res.replace(/\bJack\b/g, OwnerName);
										res = res.replace(/\bJill\b/g, OwnerName);
										res = res.replace(/\bShe\b/g, "He");
										res = res.replace(/\bshe\b/g, "he");
										res = res.replace(/\bher\b/g, "his");
										res = res.replace(/\bHer\b/g, "His");
										res = res.replace(/\bherself\b/g, "himself");
										res = res.replace(/\bHerself\b/g, "Himself");
									}
									else if (OwnerGender == 'female') {
										res = res.replace(/\bJack\b/g, OwnerName);
										res = res.replace(/\bJill\b/g, OwnerName);
										res = res.replace(/\bHe\b/g, "She");
										res = res.replace(/\bhe\b/g, "she");
										res = res.replace(/\bhis\b/g, "her");
										res = res.replace(/\bHis\b/g, "Her");
										res = res.replace(/\bhim\b/g, "her");
										res = res.replace(/\bHim\b/g, "Her");
										res = res.replace(/\bhimself\b/g, "herself");
										res = res.replace(/\bHimself\b/g, "Herself");
									}
									else {
										res = res.replace(/\bJack\b/g, OwnerName);
										res = res.replace(/\bJill\b/g, OwnerName);
										res = res.replace(/\bHe\b/g, "They");
										res = res.replace(/\bhe\b/g, "they");
										res = res.replace(/\bHe is\b/g, "They are");
										res = res.replace(/\bhe is\b/g, "they are");
										res = res.replace(/\bhis\b/g, "their");
										res = res.replace(/\bHis\b/g, "Their");
										res = res.replace(/\bhim\b/g, "them");
										res = res.replace(/\bHim\b/g, "Them");
										res = res.replace(/\bhimself\b/g, "themselves");
										res = res.replace(/\bHimself\b/g, "Themselves");

										res = res.replace(/\bShe\b/g, "They");
										res = res.replace(/\bshe\b/g, "they");
										res = res.replace(/\bShe is\b/g, "They are");
										res = res.replace(/\bshe is\b/g, "they are");
										res = res.replace(/\bher\b/g, "them");
										res = res.replace(/\bHer\b/g, "Their");
										res = res.replace(/\bherself\b/g, "himself");
										res = res.replace(/\bHerself\b/g, "Himself");
									}
									data.Title = res;
								}

								//content page data keys were missing before - fixing on 12052016 with team
								var Desktop__allHiddenBoardId_Arr = [];
								var Tablet__allHiddenBoardId_Arr = [];
								var Mobile__allHiddenBoardId_Arr = [];

								var allHiddenBoardId_Arr = [];

								var Desktop__allHiddenBoardId__index_Arr = [];
								var Tablet__allHiddenBoardId__index_Arr = [];
								var Mobile__allHiddenBoardId__index_Arr = [];

								var margedArrOfAllQAPageIds = [];
								var UNIQUE__margedArrOfAllQAPageIds = [];

								var sourcePageId__DestinationPageId__Arr = [];

								if (data.PageType == "content") {
									data.CommonParams = result.CommonParams ? result.CommonParams : {};
									data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
									data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
									data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};


									//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
									//desktop viewport filter
									data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];

									for (var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++) {
										var widObj = data.ViewportDesktopSections.Widgets[loop];
										widObj.Type = widObj.Type ? widObj.Type : "";
										if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
											var QuestString = data.ViewportDesktopSections.Widgets[loop].Data ? data.ViewportDesktopSections.Widgets[loop].Data : "";
											data.ViewportDesktopSections.Widgets[loop].Data = __getStringAfterNameRuled(QuestString, OwnerGender, OwnerName);

											widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
											var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
											if (HiddenBoardId != 'SOMETHING__WRONG') {
												Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
												Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
											}
										}
									}

									//tablet viewport filter
									data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];

									for (var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++) {
										var widObj = data.ViewportTabletSections.Widgets[loop];
										if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
											var QuestString = data.ViewportTabletSections.Widgets[loop].Data ? data.ViewportTabletSections.Widgets[loop].Data : "";
											data.ViewportTabletSections.Widgets[loop].Data = __getStringAfterNameRuled(QuestString, OwnerGender, OwnerName);

											widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
											var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
											if (HiddenBoardId != 'SOMETHING__WRONG') {
												Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
												Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
											}
										}
									}

									//mobile viewport filter
									data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];

									for (var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++) {
										var widObj = data.ViewportMobileSections.Widgets[loop];
										if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
											var QuestString = data.ViewportMobileSections.Widgets[loop].Data ? data.ViewportMobileSections.Widgets[loop].Data : "";
											data.ViewportMobileSections.Widgets[loop].Data = __getStringAfterNameRuled(QuestString, OwnerGender, OwnerName);

											widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
											var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
											if (HiddenBoardId != 'SOMETHING__WRONG') {
												Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
												Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
											}
										}
									}


									margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
									margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);

									//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

									allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
									allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);

									UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();

									//just for testing...
									var finalObj = {
										Desktop__allHiddenBoardId__index_Arr: Desktop__allHiddenBoardId__index_Arr,
										Tablet__allHiddenBoardId__index_Arr: Tablet__allHiddenBoardId__index_Arr,
										Mobile__allHiddenBoardId__index_Arr: Mobile__allHiddenBoardId__index_Arr,
										margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
										UNIQUE__allHiddenBoardId_Arr: UNIQUE__allHiddenBoardId_Arr
									}

									//now create new instances of the unique hidden boards and update the PageId on corresponding entries...
									async_lib.series({
										createNewInstance__HiddenBoard: function (callback) {
											if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
												var conditions = {
													_id: { $in: finalObj.UNIQUE__allHiddenBoardId_Arr }
												}
												var fields = {
													Medias: false
												}
												Page.find(conditions, fields).lean().exec(function (err, results) {
													if (!err) {
														// //console.log("-------------results------------", results);
														var results = results ? results : [];
														var returnCounter = 0;
														var totalOps = results.length ? results.length : 0;
														if (totalOps) {
															var oldPageId = null;
															for (var loop = 0; loop < totalOps; loop++) {
																oldPageId = results[loop]._id;
																var newInstanceData = results[loop];
																newInstanceData.OriginatedFrom = oldPageId;
																newInstanceData.Origin = 'published';

																//// //console.log("WTF-----------------------",oldPageId);
																delete newInstanceData._id;
																//// //console.log("WTF-----------------------",oldPageId);

																newInstanceData.CreatedOn = Date.now();
																newInstanceData.UpdatedOn = Date.now();
																//// //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																CreateNewInstance__HiddenBoardFunc(oldPageId, newInstanceData, totalOps);
															}

															function CreateNewInstance__HiddenBoardFunc(sourcePageId, dataToSave, totalOps) {
																//AUTO NAME REPLACE FILTER
																//var OwnerGender = UserData.Gender ? UserData.Gender : "male";
																//var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
																var OwnerGender = "male";
																var OwnerName = "OWNER";
																if (UserData.length) {
																	//Non-Registered user case
																	OwnerGender = UserData[0].Gender ? UserData[0].Gender : "male";
																	OwnerName = UserData[0].Name ? UserData[0].Name.split(' ')[0] : "OWNER";
																} else {
																	OwnerName = shareWithName ? shareWithName : 'OWNER';
																}


																var str = dataToSave.Title ? dataToSave.Title : "Untitled Page";
																var resStr = str;
																if (OwnerGender == 'male') {
																	resStr = resStr.replace(/\bJack\b/g, OwnerName);
																	resStr = resStr.replace(/\bJill\b/g, OwnerName);
																	resStr = resStr.replace(/\bShe\b/g, "He");
																	resStr = resStr.replace(/\bshe\b/g, "he");
																	resStr = resStr.replace(/\bher\b/g, "his");
																	resStr = resStr.replace(/\bHer\b/g, "His");
																	resStr = resStr.replace(/\bherself\b/g, "himself");
																	resStr = resStr.replace(/\bHerself\b/g, "Himself");
																}
																else if (OwnerGender == 'female') {
																	resStr = resStr.replace(/\bJack\b/g, OwnerName);
																	resStr = resStr.replace(/\bJill\b/g, OwnerName);
																	resStr = resStr.replace(/\bHe\b/g, "She");
																	resStr = resStr.replace(/\bhe\b/g, "she");
																	resStr = resStr.replace(/\bhis\b/g, "her");
																	resStr = resStr.replace(/\bHis\b/g, "Her");
																	resStr = resStr.replace(/\bhim\b/g, "her");
																	resStr = resStr.replace(/\bHim\b/g, "Her");
																	resStr = resStr.replace(/\bhimself\b/g, "herself");
																	resStr = resStr.replace(/\bHimself\b/g, "Herself");
																}
																else {
																	resStr = resStr.replace(/\bJack\b/g, OwnerName);
																	resStr = resStr.replace(/\bJill\b/g, OwnerName);
																	resStr = resStr.replace(/\bHe\b/g, "They");
																	resStr = resStr.replace(/\bhe\b/g, "they");
																	resStr = resStr.replace(/\bHe is\b/g, "They are");
																	resStr = resStr.replace(/\bhe is\b/g, "they are");
																	resStr = resStr.replace(/\bhis\b/g, "their");
																	resStr = resStr.replace(/\bHis\b/g, "Their");
																	resStr = resStr.replace(/\bhim\b/g, "them");
																	resStr = resStr.replace(/\bHim\b/g, "Them");
																	resStr = resStr.replace(/\bhimself\b/g, "themselves");
																	resStr = resStr.replace(/\bHimself\b/g, "Themselves");

																	resStr = resStr.replace(/\bShe\b/g, "They");
																	resStr = resStr.replace(/\bshe\b/g, "they");
																	resStr = resStr.replace(/\bShe is\b/g, "They are");
																	resStr = resStr.replace(/\bshe is\b/g, "they are");
																	resStr = resStr.replace(/\bher\b/g, "them");
																	resStr = resStr.replace(/\bHer\b/g, "Their");
																	resStr = resStr.replace(/\bherself\b/g, "himself");
																	resStr = resStr.replace(/\bHerself\b/g, "Himself");
																}
																dataToSave.Title = resStr;

																var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																//sourcePageId__DestinationPageId
																if (sourcePageId != "SOMETHING_WRONG") {
																	Page(dataToSave).save(function (err, result) {
																		returnCounter++;
																		if (!err) {
																			var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																			sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																		}
																		else {
																			// //console.log("DB ERROR : ", err);
																			return callback(err);
																		}

																		if (totalOps == returnCounter) {
																			callback(null, sourcePageId__DestinationPageId__Arr);
																		}
																	})
																}
																else {
																	return callback({ error: "sourcePageId = SOMETHING_WRONG" });
																}
															}
														}
														else {
															callback(null, sourcePageId__DestinationPageId__Arr);
														}
													}
													else {
														// //console.log("DB ERROR : ", err);
														return callback(err);
													}
												});
											}
											else {
												callback(null, sourcePageId__DestinationPageId__Arr);
											}
										}
									},
										async function (err, results) {
											//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
											if (!err) {
												// //console.log("*************************************** results**************", results);
												var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
												for (var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++) {
													var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
													var SourcePageId = recordArr[0];
													var NewPageId = recordArr[1];
													// //console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ", finalObj.margedArrOfAllQAPageIds);
													// //console.log("*************************************** SourcePageId**************NewPageId ", SourcePageId + "------------------" + NewPageId);
													for (var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++) {
														var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
														var SourcePageId_2 = recordArr2[0];
														var WidgetIndex = recordArr2[1];
														var Viewport = recordArr2[2];
														if (SourcePageId_2 == SourcePageId) {
															// //console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2 + " ====== " + SourcePageId);
															switch (Viewport) {
																case 'DESKTOP':
																	data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																	data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																	break;

																case 'TABLET':
																	data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																	data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																	break;

																case 'MOBILE':
																	data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																	data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																	break;
															}
														}
													}
												}
											}
											else {
												// //console.log("**************************************************DB ERROR :", err);
											}

											var result = await Page(data).save()
										});
								}
								else {
									var result = await Page(data).save();
									result = typeof result === 'object' ? result : null;
									if (result) {
										CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : null;
										if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType != 'Group') {
											if(data.Medias.length) {
												CapsuleData._id = newCapsuleId;
												await __streamPagePostNow(data.Medias, result, shareWithEmail, req, CapsuleData);
											}
										}
									}
								}

							}
						}
					}
				}

				var emailFor = "Published__ForOthers";

				if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
					emailFor = 'Purchased__ForGift__Stream';
				}

				CapsuleData.IsSurpriseGift = CapsuleData.IsSurpriseGift ? CapsuleData.IsSurpriseGift : false;
				if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group' && !CapsuleData.IsSurpriseGift) {
					emailFor = 'Purchased__ForGift__GroupStream';
				}

				if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group' && CapsuleData.IsSurpriseGift) {
					emailFor = 'Purchased__ForSurpriseGift__GroupStream';
					console.log("This is a surprise gift so returning without sending instant email.");
					return;
				}

				if (index_value_email >= 0) {

					var mailto = req.body.purchaseFor[index_value_email];
					if (mailto == 'Gift') {
						emailFor = 'Purchased__ForGift';
						if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
							emailFor = 'Purchased__ForGift__Stream';
						}

						CapsuleData.IsSurpriseGift = CapsuleData.IsSurpriseGift ? CapsuleData.IsSurpriseGift : false;
						if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group' && !CapsuleData.IsSurpriseGift) {
							emailFor = 'Purchased__ForGift__GroupStream';
						}

						if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group' && CapsuleData.IsSurpriseGift) {
							emailFor = 'Purchased__ForSurpriseGift__GroupStream';
							console.log("This is a surprise gift so returning without sending instant email.");
							return;
						}
					}
					else if (mailto == 'Myself') {
						emailFor = 'Purchased__ForMyself';
						if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
							emailFor = 'Purchased__ForMyself__Stream';
						}

						if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group') {
							emailFor = 'Purchased__ForMyself__GroupStream';
						}
					}

				}


				var condition = {};
				condition.name = emailFor;

				var results = await EmailTemplate.find(condition);
				results = Array.isArray(results) ? results : [];
				if (results.length) {
					setTimeout(async function(){
						var RecipientName = shareWithName ? shareWithName : '';
						var userD = await User.find({ 'Email': new RegExp('^'+shareWithEmail+'$', 'i'), IsDeleted: false }, { 'Name': true, 'AllFoldersId' : true, 'AllPagesId': true });
						var _cId = '';
						var _pId = '';
						var _StreamUrl = 'https://www.scrpt.com/login';

						if (userD.length > 0) {
							var name = userD[0].Name ? userD[0].Name.split(' ') : [];
							RecipientName = name[0];

							_cId = userD[0].AllFoldersId ? userD[0].AllFoldersId : '';
							_pId = userD[0].AllPagesId ? userD[0].AllPagesId : '';
							_StreamUrl = 'https://www.scrpt.com/streams/'+_cId+'/'+_pId+'?stream='+newCapsuleId;
						}

						var publisherNameArr = req.session.user.Name ? req.session.user.Name.split(' ') : [];
						var PublisherName = publisherNameArr[0];

						var newHtml = results[0].description.replace(/{PublisherName}/g, PublisherName);
						newHtml = newHtml.replace(/{CapsuleName}/g, data.Title);
						newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
						newHtml = newHtml.replace(/{StreamUrl}/g, _StreamUrl);
						newHtml = newHtml.replace(/{IfNewUserStatement}/g, ''); //we need to make this dynamic.
						var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
						var to = shareWithEmail;
						results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
						var subject = results[0].subject.replace(/{PublisherName}/g, PublisherName);
						subject = subject.replace(/{CapsuleName}/g, data.Title);
						subject = subject != '' ? subject : 'Scrpt - ' + PublisherName + ' has published a capsule for you!';

						var mailOptions = {
							//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
							from: process.EMAIL_ENGINE.info.senderLine,
							to: to, // list of receivers
							subject: subject,
							text: process.HOST_URL + '/login',
							html: newHtml
						};

						var info = await transporter.sendMail(mailOptions);
						info = info || {};
						info.response = info.response ? info.response : {};
						console.log('capsule__createNewInstance---------Message sent: ' + mailOptions.to + info.response);
					},3000);
				}

			}

		}

	}
	else {
		// ////console.log("09579-----------");
	}
}

var createCelebrityInstance = async function (req, res) {
	var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
	var OwnerId = req.session.user._id;

	if(!CapsuleId || !OwnerId) {
		return res.json({ code: 501, message: "Something went wrong." });
	}

	//check if already exists then skip
	var conditions_celebrity = {
		"CreaterId" : OwnerId,
		"OwnerId" : OwnerId,
		"OriginatedFrom" : ObjectId(CapsuleId),
		"LaunchSettings.Audience" : "CELEBRITY",
		"LaunchSettings.CapsuleFor" : "Stream",
		"LaunchSettings.StreamType" : "Group",
		"IsDeleted" : false
	};

	var CapsuleData_celebrity = await Capsule.findOne(conditions_celebrity);
	CapsuleData_celebrity = typeof CapsuleData_celebrity == 'object' ? CapsuleData_celebrity : null;

	if(CapsuleData_celebrity != null) {
		return res.json({ code: 200, message: "Calebrity instance has already been configured successfully.", CapsuleData: CapsuleData_celebrity });
	}

	var conditions = {
		"_id" : ObjectId(CapsuleId),
		"CreaterId" : OwnerId,
		"OwnerId" : OwnerId,
		"LaunchSettings.Audience" : "BUYERS",
		"LaunchSettings.CapsuleFor" : "Stream",
		"LaunchSettings.StreamType" : "Group"
	};

	var CapsuleData = await Capsule.findOne(conditions);
	var owner = await User.findOne({_id : ObjectId(OwnerId)});
	CapsuleData = typeof CapsuleData == 'object' ? CapsuleData : null;
	owner = typeof owner == 'object' ? owner : null;

	if(CapsuleData == null || owner == null) {
		return res.json({ code: 501, message: "Something went wrong." });
	}
	owner.UserEmail = owner.Email;
	owner.UserName = owner.Name;

	capsule__createNewInstance_Celebrity(CapsuleData, owner, req);
	setTimeout(function() {
		return res.json({ code: 200, message: "Calebrity instance has been configured successfully." });
	},3000);
}

function capsule__createNewInstance_Celebrity (CapsuleData, owner, req) {

	var __capsuleId = CapsuleData._id;

	//check to make sure who will be the creater for new instances
	var __CreaterId_ForNewInstances = null;

	CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
	CapsuleData.LaunchSettings.Audience = CapsuleData.LaunchSettings.Audience ? CapsuleData.LaunchSettings.Audience : false;

	var CapsuleForCase = CapsuleData.LaunchSettings.Audience;
	switch (CapsuleForCase) {
		case "CELEBRITY":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;
		case "ME":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		case "OTHERS":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		case "BUYERS":
			__CreaterId_ForNewInstances = CapsuleData.CreaterId;
			break;

		default:
			return; //return res.json({ code: 404, message: "Something went wrong." });
	}

	//check if the owner is register or not
	var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
	var shareWithName = owner.UserName ? owner.UserName.split(' ')[0] : 'OWNER';
	var UniqueIdPerOwner = owner.UniqueIdPerOwner ? owner.UniqueIdPerOwner : null;

	if (shareWithEmail) {
		var conditions = {};
		conditions.Email = new RegExp('^'+shareWithEmail+'$', 'i'),
		conditions.IsDeleted = false;

		var fields = {
			Email: true,
			Name: true,
			Gender: true
		};

		User.find(conditions, fields, async function (err, UserData) {
			if (!err) {
				// //console.log("UserData = ", UserData);

				var data = {};
				data.Origin = "published";
				data.OriginatedFrom = __capsuleId;

				if (UniqueIdPerOwner != null) {
					data.UniqueIdPerOwner = UniqueIdPerOwner;
				}

				//data.CreaterId = req.session.user._id;
				data.CreaterId = __CreaterId_ForNewInstances;
				data.PurchasedBy = req.session.user._id;		//started using this from SurpriseGift flow

				if (!UserData.length) {
					//Non-Registered user case
					data.OwnerId = req.session.user._id;	//will update this ownerId at the time of user registeration.
					//if this is a surprise gift case then creater owner account if not present already and map Owner id here.
					var request_url = 'https://www.scrpt.com/journal/createNewUserAccount_INTERNAL_API';
					let inObj = {
						Name : shareWithName,
						Email : shareWithEmail,
						NickName : shareWithName
					};
					let response = await axios.post(request_url, inputObj);
					response.data = response.data ? response.data : {};
					response.data.code = response.data.code ? response.data.code : null;
					response.data.newUserId = response.data.newUserId ? response.data.newUserId : null;

					console.log("------------ AXIOS ---- SurpriseGift - New User has been created ---------------", response.data.code);

					if(response.data.newUserId) {
						data.OwnerId = response.data.newUserId;
					}
				}
				else {
					data.OwnerId = UserData[0]._id;
				}

				data.OwnerEmail = shareWithEmail;
				data.Title = CapsuleData.Title;
				data.CoverArt = CapsuleData.CoverArt;

				data.IsPublished = true;				//published by someone else....
				data.MetaData = CapsuleData.MetaData ? CapsuleData.MetaData : {};

				var nowDate = Date.now();
				data.CreatedOn = nowDate;
				data.ModifiedOn = nowDate;

				//Birthday Capsule Updates ...
				CapsuleData.LaunchSettings.CapsuleFor = CapsuleData.LaunchSettings.CapsuleFor ? CapsuleData.LaunchSettings.CapsuleFor : "";
				if(CapsuleData.LaunchSettings.CapsuleFor == 'Birthday') {
					data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
					data.LaunchSettings.CapsuleFor = 'Birthday';
				}
				if(CapsuleData.LaunchSettings.CapsuleFor == 'Theme') {
					data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
					data.LaunchSettings.CapsuleFor = 'Theme';
					data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
				}

				if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
					CapsuleData.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType ? CapsuleData.LaunchSettings.StreamType : null;

					data.LaunchSettings = data.LaunchSettings ? data.LaunchSettings : {};
					data.LaunchSettings.CapsuleFor = 'Stream';
					data.LaunchSettings.StreamType = CapsuleData.LaunchSettings.StreamType;
					data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.

					data.MonthFor = data.MonthFor ? data.MonthFor : 'M12';
					data.Frequency = data.Frequency ? data.Frequency : 'medium';
					data.EmailTemplate = CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'PracticalThinker';
					data.IsStreamPaused = CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0;
					data.EmailSubject = CapsuleData.EmailSubject ? CapsuleData.EmailSubject : null;
					data.IsOnetimeStream = CapsuleData.IsOnetimeStream ? CapsuleData.IsOnetimeStream : false;
					data.IsOnlyPostImage = CapsuleData.IsOnlyPostImage ? CapsuleData.IsOnlyPostImage : false;
					data.IsSurpriseGift = CapsuleData.IsSurpriseGift ? CapsuleData.IsSurpriseGift : false;

					data.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : null;
					if(CapsuleData.LaunchSettings.StreamType == 'Group') {
						data.StreamFlow = CapsuleData.StreamFlow ? CapsuleData.StreamFlow : 'Birthday';
					}

				}
				data.LaunchSettings.Audience = 'CELEBRITY';
				//// //console.log("data = ",data);
				Capsule(data).save(async function (err, result) {
					if (!err) {
						//pages under chapters
						var conditions = {
							CapsuleId: __capsuleId,
							//CreaterId : req.session.user._id,	//removing this check because this same function is used for Private published / purchase__myself and purchase__gift cases now.
							Status: 1,
							IsDeleted: 0
						};
						var sortObj = {
							Order: 1,
							ModifiedOn: -1
						};
						var fields = {
							_id: true
						};

						var newCapsuleId = result._id;

						//update store capsule with CelebrityInstanceId
						await Capsule.update({_id : ObjectId(__capsuleId)}, {$set : {CelebrityInstanceId : ObjectId(newCapsuleId)}});


						Chapter.find(conditions, fields).sort(sortObj).exec(function (err, results) {
							if (!err) {
								var fields = {
									_id: true,
									Title: true,
									CoverArt: true,
									Order: true,
									LaunchSettings: true,
									CoverArtFirstPage: true,
									ChapterPlaylist: true
								};
								for (var loop = 0; loop < results.length; loop++) {
									var conditions = {};
									conditions._id = results[loop]._id;
									Chapter.findOne(conditions, fields, function (err, result) {

										var __chapterId = result._id ? result._id : 0;
										//delete result._id;
										var data = {};
										data.Origin = "published";
										data.OriginatedFrom = result._id;
										//data.CreaterId = req.session.user._id;
										data.CreaterId = __CreaterId_ForNewInstances;

										if (!UserData.length) {
											//Non-Registered user case			- this will be modified when user will register into the platform.
											data.OwnerId = req.session.user._id;
										}
										else {
											data.OwnerId = UserData[0]._id;
										}

										data.OwnerEmail = shareWithEmail;
										data.CapsuleId = newCapsuleId;

										data.Title = result.Title;
										data.CoverArt = result.CoverArt;
										data.Order = result.Order;
										data.LaunchSettings = {};
										data.LaunchSettings.NamingConvention = result.LaunchSettings.NamingConvention;	//Recommendation from creater
										data.LaunchSettings.ShareMode = result.LaunchSettings.ShareMode;	//Recommendation from creater
										data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
										data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];

										data.CreatedOn = nowDate;
										data.ModifiedOn = nowDate;

										if(CapsuleData.LaunchSettings.CapsuleFor == 'Theme') {
											data.IsLaunched = true; //Tree capsules are by default in launched state so that Owner can instantly invite all the users.
										}

										// //console.log("-------", result);
										//// //console.log("data = ",data);
										Chapter(data).save(function (err, result) {
											if (!err) {

												//pages under chapters
												var conditions = {
													ChapterId: __chapterId,
													//CreaterId : req.session.user._id, //removing this check because this same function is used for Private published / purchase__myself and purchase__gift cases now.
													IsDasheditpage: false,		//this is to prevent the double instances of the page issue
													IsDeleted: 0,
													PageType: { $in: ["gallery", "content"] }
												};
												var sortObj = {
													Order: 1,
													UpdatedOn: -1
												};
												var fields = {
													_id: true
												};

												var newChapterId = result._id;

												//__checkNcreateChapterIntroPage(result, shareWithName, CapsuleData);

												Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {
													if (!err) {
														var fields = {
															_id: true,
															Title: true,
															TitleInvitees: true,
															PageType: true,
															Order: true,
															HeaderImage: true,
															BackgroundMusic: true,
															CommonParams: true,
															ViewportDesktopSections: true,
															ViewportTabletSections: true,
															ViewportMobileSections: true,
															SelectedMedia: true,
															SelectionCriteria: true,
															HeaderBlurValue: true,
															HeaderTransparencyValue: true,
															Labels: true,
															IsLabelAllowed: true,
															HeaderVideoLink : true,
															EmailEngineDataSets : true,
															VoiceOverLyricsSettings : true,
															VoiceOverFile : true,
															Themes : true
														};

														if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
															fields.Medias = true;
														}
														//console.log(" XXX -----------------------hERE 11111111 ---------------------- XXX", results.length);
														for (var loop = 0; loop < results.length; loop++) {
															var conditions = {};
															conditions._id = results[loop]._id;
															Page.findOne(conditions, fields, async function (err, result) {
																//console.log(" XXX -----------------------hERE---------------------- XXX");
																//delete result._id;
																var data = {};
																data.Origin = "published";
																data.OriginatedFrom = result._id;
																//data.CreaterId = req.session.user._id;
																data.CreaterId = __CreaterId_ForNewInstances;

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
																data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : result.Title;
																data.PageType = result.PageType;
																data.Order = result.Order;
																data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
																data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
																data.HeaderBlurValue = result.HeaderBlurValue;
																data.HeaderTransparencyValue = result.HeaderTransparencyValue;

																data.SelectedMedia = result.SelectedMedia;
																data.SelectionCriteria = result.SelectionCriteria;
																data.Labels = result.Labels ? result.Labels : [];
																data.IsLabelAllowed = result.IsLabelAllowed ? result.IsLabelAllowed : false;
																data.HeaderVideoLink = result.HeaderVideoLink ? result.HeaderVideoLink : '';
																data.EmailEngineDataSets = result.EmailEngineDataSets ? result.EmailEngineDataSets : [];
																data.VoiceOverLyricsSettings = result.VoiceOverLyricsSettings ? result.VoiceOverLyricsSettings : [];
																data.VoiceOverFile = result.VoiceOverFile ? result.VoiceOverFile : "";
																data.Themes = result.Themes ? result.Themes : [];


																data.CreatedOn = nowDate;
																data.UpdatedOn = nowDate;

																if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
																	//make a copy of Posts and transfer ownership.
																	data.Medias = result.Medias ? result.Medias : [];
																	for(var i = 0; i < data.Medias.length; i++) {
																		data.Medias[i].OriginatedFrom = data.Medias[i]._id;
																		data.Medias[i].Origin = "Copy";
																		data.Medias[i]._id = new ObjectId();
																		data.Medias[i].OwnerId = data.OwnerId;
																		data.Medias[i].PostedBy = ObjectId(data.OwnerId);

																		var cond = {
																			PageId : data.OriginatedFrom,
																			PostId : data.Medias[i].OriginatedFrom
																			//IsPageStreamCase : 1
																		};
																		var f = {
																			SelectedBlendImages : 1
																		};
																		var SelectedBlendImages = await PageStream.find(cond, f);
																		if(SelectedBlendImages.length) {
																			data.Medias[i].SelectedBlendImages = SelectedBlendImages[0].SelectedBlendImages ? SelectedBlendImages[0].SelectedBlendImages : [];
																		}

																		data.Medias[i].SelectedBlendImages = data.Medias[i].SelectedBlendImages ? data.Medias[i].SelectedBlendImages : [];
																	}
																	//make a copy of post and transfer ownership
																}

																if (data.PageType == "gallery") {
																	Page(data).save(function (err, result) {
																		if (!err) {

																		}
																	});
																}
															});
														}
													}
												});
											}
										});

									});
								}
							}
						});
					}
				});
			}
		});
	}
}


var chapter__createNewInstance = function (__capsuleId, ChapterData, owner, req) {
	// ////console.log("owner = ", owner);
	//check if the owner is register or not
	var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
	if (shareWithEmail) {
		var conditions = {};
		conditions.Email = shareWithEmail;
		conditions.IsDeleted = false;

		var fields = {
			Email: true
		};

		User.find(conditions, fields, function (err, UserData) {
			if (!err) {
				// ////console.log("UserData = ", UserData);
				var data = {};
				data.Origin = "published";
				data.OriginatedFrom = ChapterData._id;

				data.CapsuleId = __capsuleId;
				data.CreaterId = req.session.user._id;

				if (!UserData.length) {
					//Non-Registered user case
					data.OwnerId = req.session.user._id;	//will update this ownerId at the time of user registeration.
				}
				else {
					data.OwnerId = UserData[0]._id;
				}

				data.OwnerEmail = shareWithEmail;
				data.Title = ChapterData.Title;
				data.CoverArt = ChapterData.CoverArt;
				data.LaunchSettings = {};
				//data.LaunchSettings.MakingFor = ChapterData.LaunchSettings.MakingFor;
				data.LaunchSettings.NamingConvention = ChapterData.LaunchSettings.NamingConvention;
				data.LaunchSettings.ShareMode = ChapterData.LaunchSettings.ShareMode;

				var nowDate = Date.now();
				data.CreatedOn = nowDate;
				data.ModifiedOn = nowDate;

				//// ////console.log("data = ",data);
				Chapter(data).save(function (err, result) {
					if (!err) {
						//pages under chapters
						var conditions = {
							ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
							OwnerId: req.session.user._id,
							IsDeleted: 0,
							PageType: { $in: ["gallery", "content"] }
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
									BackgroundMusic: true
								};
								for (var loop = 0; loop < results.length; loop++) {
									var conditions = {};
									conditions._id = results[loop]._id;
									Page.findOne(conditions, fields, function (err, result) {
										//delete result._id;
										var data = {};
										data.Origin = "published";
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

										data.CreatedOn = nowDate;
										data.UpdatedOn = nowDate;

										// ////console.log("-------", result);
										Page(data).save(function (err, result) {
											if (!err) {
												// ////console.log("----new page instance created..", result);
											}
											else {
												// ////console.log(err);
											}
										});
									});
								}

								// ////console.log("--------DONE------------");
								/*
								var transporter = nodemailer.createTransport({
									service: 'Gmail',
									auth: {
										user: 'collabmedia.scrpt@gmail.com',
										pass: 'scrpt123_2014collabmedia#1909'
									}
								});
								*/
								var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
								var to = shareWithEmail;

								var mailOptions = {
									//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
									from: process.EMAIL_ENGINE.info.senderLine,
									to: to, // list of receivers
									subject: 'Scrpt - ' + req.session.user.Name + ' has created a chapter for you!',
									text: 'http://203.100.79.94:8888/#/login',
									html: "Hi , <br/><br/> Scrpt - " + req.session.user.Name + " has created a chapter for you : '" + data.Title + "'. Login to access this chapter.<br/><br/>Sincerely,<br>The Scrpt team. "
								};

								transporter.sendMail(mailOptions, function (error, info) {
									if (error) {
										// ////console.log(error);
										//res.json(err);
									} else {
										// ////console.log('Message sent to: ' + to + info.response);
										//res.json({'msg':'done','code':'200'});
									}
								});

							}
							else {
								// ////console.log("095944564-----------");
							}
						});
					}
					else {
						// //console.log("0959345485-----------");
					}
				});
			}
			else {
				// //console.log("0959485-----------");
			}
		});
	}
	else {
		// //console.log("09579-----------");
	}
}

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		launch
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var saveAndLaunch = function (req, res) {

	// //console.log('server side saveSetting function');
	var condition = {};
	condition._id = req.headers.chapter_id ? req.headers.chapter_id : '0';

	var title = req.body.newTitle ? req.body.newTitle : "Untitled Chapter";
	var ShareMode = req.body.participation ? req.body.participation : "private";
	var NamingConvention = req.body.namingConvention ? req.body.namingConvention : "realnames";

	Chapter.update(condition, { $set: { Title: title, 'LaunchSettings.ShareMode': ShareMode, 'LaunchSettings.NamingConvention': NamingConvention } }, { multi: false }, function (err, numAffected) {
		if (err) {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		} else {
			var conditions = {
				//CreaterId : req.session.user._id,
				_id: req.headers.chapter_id ? req.headers.chapter_id : 0,
				OwnerId: req.session.user._id,
				IsLaunched: 0,
				Status: 1,
				IsDeleted: 0
			};

			var fields = {};
			// //console.log('===========================================');
			// //console.log(conditions);
			// //console.log('===========================================');

			Chapter.find(conditions, fields, function (err, results) {
				if (!err) {
					if (results.length) {
						var ChapterData = results[0];
						var MakingFor = ChapterData.LaunchSettings.MakingFor;
						var ShareMode = ChapterData.LaunchSettings.ShareMode;

						if (ChapterData.LaunchSettings.OthersData.length)
							MakingFor = "OTHERS";

						switch (MakingFor) {
							case "ME":
								if (ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group") {
									ShareMode = "invite";
								}
								switch (ShareMode) {
									case "invite":
										// //console.log("public / friend-solo / friend-group Case........");
										var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
										chapter__sendInvitations(ChapterData, invitees, req);
										Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME" } }, { multi: false }, function (err, numAffected) {
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												res.json(response)
											} else {
												var response = {
													status: 200,
													message: "Chapter has been launched successfully.",
													result: results
												}
												res.json(response);
											}
										});
										break;

									case "private":
										// //console.log("No need to do anything.. It's private area.");
										Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME" } }, { multi: false }, function (err, numAffected) {
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												res.json(response)
											} else {
												var response = {
													status: 200,
													message: "Chapter has been launched successfully.",
													result: results
												}
												res.json(response);
											}
										});
										break;

									default:
										// //console.log("Error on ShareMode = ", ShareMode);
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response);
										return;
								}
								break;

							case "OTHERS":
								// //console.log("--------------------------OTHERS CASE----------------------------");
								//create a new instance of the chapter for each other user
								var OtherUsers = ChapterData.LaunchSettings.OthersData ? ChapterData.LaunchSettings.OthersData : [];
								if (OtherUsers.length) {
									for (var loop = 0; loop < OtherUsers.length; loop++) {
										var owner = OtherUsers[loop];
										chapter__createNewInstance(ChapterData, owner, req);
										//update the chapter's IsLaunched Key value.
									}
									Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" } }, { multi: false }, function (err, numAffected) {
										if (err) {
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											res.json(response)
										} else {
											var response = {
												status: 200,
												message: "Chapter has been launched successfully.",
												result: results
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
									res.json(response)
								}
								break;

							default:
								// //console.log("ERROR on MakingFor = ", MakingFor);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
								return;
						}
					}
					else {
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				}
				else {
					// //console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			});
		}
	})
}

/*________________________________________________________________________
   * @Date:      		12 October 2015
   * @Method :   		saveAndPublish
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var saveAndPublish = function (req, res) {

	// //console.log('server side saveAndPublish function');

	//get capsule data and loop through it
	var conditions = {
		OwnerId: req.session.user._id,
		_id: req.headers.capsule_id,
		IsPublished: false,
		Status: true,
		IsDeleted: false
	};
	var fields = {};

	Capsule.find(conditions, fields, function (err, result) {
		if (!err) {
			for (var loop = 0; loop < result.length; loop++) {
				var condition = {};
				condition._id = req.headers.chapter_id ? req.headers.chapter_id : '0';

				var title = req.body.newTitle ? req.body.newTitle : "Untitled Chapter";
				var ShareMode = req.body.participation ? req.body.participation : "private";
				var NamingConvention = req.body.namingConvention ? req.body.namingConvention : "realnames";

				Chapter.update(condition, { $set: { Title: title, 'LaunchSettings.ShareMode': ShareMode, 'LaunchSettings.NamingConvention': NamingConvention } }, { multi: false }, function (err, numAffected) {
					if (err) {
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response)
					} else {
						var conditions = {
							//CreaterId : req.session.user._id,
							_id: req.headers.chapter_id ? req.headers.chapter_id : 0,
							OwnerId: req.session.user._id,
							IsLaunched: 0,
							Status: 1,
							IsDeleted: 0
						};

						var fields = {};
						// //console.log('===========================================');
						// //console.log(conditions);
						// //console.log('===========================================');

						Chapter.find(conditions, fields, function (err, results) {
							if (!err) {
								if (results.length) {
									var ChapterData = results[0];
									var MakingFor = ChapterData.LaunchSettings.MakingFor;
									var ShareMode = ChapterData.LaunchSettings.ShareMode;

									if (ChapterData.LaunchSettings.OthersData.length)
										MakingFor = "OTHERS";

									switch (MakingFor) {
										case "ME":
											if (ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group") {
												ShareMode = "invite";
											}
											switch (ShareMode) {
												case "invite":
													// //console.log("public / friend-solo / friend-group Case........");
													var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
													chapter__sendInvitations(ChapterData, invitees, req);
													Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME" } }, { multi: false }, function (err, numAffected) {
														if (err) {
															var response = {
																status: 501,
																message: "Something went wrong."
															}
															res.json(response)
														} else {
															var response = {
																status: 200,
																message: "Chapter has been launched successfully.",
																result: results
															}
															res.json(response);
														}
													});
													break;

												case "private":
													// //console.log("No need to do anything.. It's private area.");
													Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME" } }, { multi: false }, function (err, numAffected) {
														if (err) {
															var response = {
																status: 501,
																message: "Something went wrong."
															}
															res.json(response)
														} else {
															var response = {
																status: 200,
																message: "Chapter has been launched successfully.",
																result: results
															}
															res.json(response);
														}
													});
													break;

												default:
													// //console.log("Error on ShareMode = ", ShareMode);
													var response = {
														status: 501,
														message: "Something went wrong."
													}
													res.json(response);
													return;
											}
											break;

										case "OTHERS":
											// //console.log("--------------------------OTHERS CASE----------------------------");
											//create a new instance of the chapter for each other user
											var OtherUsers = ChapterData.LaunchSettings.OthersData ? ChapterData.LaunchSettings.OthersData : [];
											if (OtherUsers.length) {
												for (var loop = 0; loop < OtherUsers.length; loop++) {
													var owner = OtherUsers[loop];
													chapter__createNewInstance(ChapterData, owner, req);
													//update the chapter's IsLaunched Key value.
												}
												Chapter.update({ _id: req.headers.chapter_id }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" } }, { multi: false }, function (err, numAffected) {
													if (err) {
														var response = {
															status: 501,
															message: "Something went wrong."
														}
														res.json(response)
													} else {
														var response = {
															status: 200,
															message: "Chapter has been launched successfully.",
															result: results
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
												res.json(response)
											}
											break;

										default:
											// //console.log("ERROR on MakingFor = ", MakingFor);
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											res.json(response);
											return;
									}
								}
								else {
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									res.json(response);
								}
							}
							else {
								// //console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
							}
						});
					}
				})
			}
		}
		else {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		}
	})
}

/*________________________________________________________________________
   * @Date:      		10 October 2015
   * @Method :   		publish
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var capsuleLaunchEngine_bckWithoutPayment = function (__capsuleId, MakingFor, req, res) {
	// //console.log("------capsule----------LaunchEngine-------");
	switch (MakingFor) {
		case "ME":
			chapterLaunchEngine(__capsuleId, MakingFor, req, res);
			break;

		case "OTHERS":
			var conditions = {
				_id: __capsuleId
			}
			var fields = {};
			Capsule.find(conditions, fields, function (err, results) {
				if (!err) {
					if (results.length) {
						var CapsuleData = results[0];
						//OthersData
						// //console.log("CapsuleData.LaunchSettings == ", CapsuleData);
						var OtherUsers = CapsuleData.LaunchSettings.OthersData ? CapsuleData.LaunchSettings.OthersData : [];
						//coding error - need to fix
						if (!OtherUsers.length)
							var OtherUsers = CapsuleData.LaunchSettings.Invitees ? CapsuleData.LaunchSettings.Invitees : [];
						//coding error - need to fix

						if (OtherUsers.length) {
							for (var loop = 0; loop < OtherUsers.length; loop++) {
								var owner = OtherUsers[loop];
								capsule__createNewInstance(CapsuleData, owner, req);
							}
						}
						else {
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							// //console.log("125-------------", response)
						}
						Capsule.update({ _id: __capsuleId }, { $set: { IsPublished: true, IsLaunched: true, "LaunchSettings.Audience": "OTHERS" } }, { multi: false }, function (err, numAffected) {
							if (err) {
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								// //console.log("123-------------", response)
							} else {
								Chapter.update({ CapsuleId: __capsuleId, Status: true, IsDeleted: false }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" } }, { multi: true }, function (err, numAffected) {
									if (!err) {
										var response = {
											status: 200,
											message: "Capsule has been published successfully.",
											result: results
										}
										res.json(response);
									}
									else {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										// //console.log("123000-------------", response)
									}
								})
							}
						});
					}
					else {
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						// //console.log("126-------------", response)
					}
				}
				else {
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					// //console.log("127-------------", response)
				}
			})
			break;

		case "BUYERS":
			// //console.log("---------------SUBSCRIBERS CASE-----------");
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			// //console.log("128-------------", response)
			res.json(response)
			break;

		case "SUBSCRIBERS":
			// //console.log("---------------SUBSCRIBERS CASE-----------");
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			// //console.log("128-------------", response)
			res.json(response)
			break;

		default:

	}

}

var capsuleLaunchEngine = function (__capsuleId, MakingFor, req, res) {
	// //console.log("------capsule----------LaunchEngine-------");
	switch (MakingFor) {
		case "ME":
			chapterLaunchEngine(__capsuleId, MakingFor, req, res);
			break;

		case "OTHERS":
			var order = {};
			var orderInit = {};


			var OrderInitiatedFrom = req.body.OrderInitiatedFrom ? req.body.OrderInitiatedFrom : null;
			var OrderCreatedById = req.session.user._id ? req.session.user._id : null;
			var OrderCreatedByEmail = req.session.user.Email ? req.session.user.Email : null;

			var TotalPayment = req.body.TotalPayment ? req.body.TotalPayment : null;
			var OrderOwners = req.body.owners ? req.body.owners : [];
			var UniqueIds = req.body.uniqueIds ? req.body.uniqueIds : [];

			var CapsuleId = req.body.CapsuleId ? req.body.CapsuleId : null;
			//var CapsulePrice = req.body.capsulePrice ? req.body.capsulePrice : null;
			var CREATE_Others_Commission = process.REVENUE_MODEL_CONFIG.CREATE_Others_Commission ? parseFloat(process.REVENUE_MODEL_CONFIG.CREATE_Others_Commission).toFixed(2) : null;

			var Owners = [];
			for (var i = 0; i < OrderOwners.length; i++) {
				// //console.log("LOOP = " + i);
				Owners[i] = {
					//OwnerId:OrderOwners[i]._id,
					OwnerName: OrderOwners[i].UserName ? OrderOwners[i].UserName : null,
					OwnerEmail: OrderOwners[i].UserEmail,
					UniqueIdPerOwner: UniqueIds[i]
				};
			}

			var totalPaymentPerCapsule = parseFloat(CREATE_Others_Commission * OrderOwners.length).toFixed(2);	//server side validation


			order.OrderInitiatedFrom = OrderInitiatedFrom;
			order.CreatedById = OrderCreatedById;
			order.CreatedByEmail = OrderCreatedByEmail;
			order.TransactionState = 'Initiated';
			order.Status = true;
			order.UpdatedOn = Date.now();
			order.CartItems = [];
			order.CartItems.push(
				{
					CapsuleId: CapsuleId,
					TotalPayment: totalPaymentPerCapsule,
					Price: 0,
					PlatformCommission: totalPaymentPerCapsule,
					Owners: Owners,
					CapsuleCreatedBy: req.session.user._id			//this will be helpful when we will get mySales data for the capsule Creator
				}
			);
			// //console.log("order.CartItems = " + order.CartItems);

			order.TotalPayment = 0;
			order.TotalPlatformCommission = 0;
			for (var loop = 0; loop < order.CartItems.length; loop++) {
				order.TotalPayment += order.CartItems[loop].TotalPayment;
				order.TotalPlatformCommission += order.CartItems[loop].PlatformCommission;
			}

			//// //console.log();
			Order(order).save(function (err, result) {
				if (!err) {
					var token = null;
					var email = null;

					req.body.token = req.body.token ? req.body.token : null;

					if (req.body.token == 'trial') {	//Trial Publish for test convinience
						stripe.tokens.create({
							card: {
								"number": '4242424242424242',
								"exp_month": 12,
								"exp_year": 2035,
								"cvc": '123'
							}
						}, function (err, tokenObj) {
							//// //console.log("-----------tokenObj---------",tokenObj);
							// asynchronously called
							token = tokenObj.id;
							email = req.session.user.Email;
							createCharges();
						});
					}
					else {
						token = req.body.token ? req.body.token : null;
						email = req.body.tokenEmail ? req.body.tokenEmail : req.session.user.Email;
						createCharges();
					}

					function createCharges() {
						console.log("tokentokentokentokentokentoken-------------",token);
						stripe.customers.create({
							source: token,
							description: email
						}).then(function (customer) {
							try {
								return stripe.charges.create({
									amount: parseInt(order.TotalPayment * 100), // Amount in cents
									currency: "usd",
									customer: customer.id
								});
							} catch (e) {
								var response = {
									status: 200,
									message: "Payement catch 1 successfully",
									error: e,
								}
								res.json(response);
							}

						}).then(function (charge) {
							orderInit.PGatewayResult = charge;
							if (charge.paid && charge.failure_code == null) {
								orderInit.TransactionState = 'Completed';
								var message = "Payment completed successfully";
								var status = 200;

								var conditions = {
									_id: __capsuleId
								}
								var fields = {};
								Capsule.find(conditions, fields, function (err, results) {
									if (!err) {
										if (results.length) {
											var CapsuleData = results[0];
											//OthersData
											// //console.log("CapsuleData.LaunchSettings == ", CapsuleData);
											var OtherUsers = CapsuleData.LaunchSettings.OthersData ? CapsuleData.LaunchSettings.OthersData : [];

											//coding error - need to fix
											if (!OtherUsers.length)
												var OtherUsers = CapsuleData.LaunchSettings.Invitees ? CapsuleData.LaunchSettings.Invitees : [];
											//coding error - need to fix

											if (OtherUsers.length) {
												for (var loop = 0; loop < OtherUsers.length; loop++) {
													var owner = OtherUsers[loop];
													var UniqueIdPerOwner = UniqueIds[loop] ? UniqueIds[loop] : null;
													owner.UniqueIdPerOwner = UniqueIdPerOwner;
													capsule__createNewInstance(CapsuleData, owner, req);

												}
											}
											else {
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												// //console.log("125-------------", response)
											}
											Capsule.update({ _id: __capsuleId }, { $set: { IsPublished: true, IsLaunched: true, "LaunchSettings.Audience": "OTHERS" } }, { multi: false }, function (err, numAffected) {
												if (err) {
													var response = {
														status: 501,
														message: "Something went wrong."
													}
													// //console.log("123-------------", response)
												} else {
													Chapter.update({ CapsuleId: __capsuleId, Status: true, IsDeleted: false }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" } }, { multi: true }, function (err, numAffected) {
														if (!err) {
															var response = {
																status: 200,
																message: "Capsule has been published successfully.",
																result: results
															}
															res.json(response);
														}
														else {
															var response = {
																status: 501,
																message: "Something went wrong."
															}
															// //console.log("123000-------------", response)
														}
													})
												}
											});
										}
										else {
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											// //console.log("126-------------", response)
										}
									}
									else {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										// //console.log("127-------------", response)
									}
								})

							} else {
								orderInit.TransactionState = 'Failed';
								var message = charge.failure_message ? charge.failure_message : null;
								var status = charge.failure_code ? charge.failure_code : null;
							}

							//setTimeout(function(){
							Order.update({ _id: new mongoose.Types.ObjectId(result._id) }, { $set: orderInit }, function (err, result) {
								if (!err) {
									var response = {
										status: status,
										message: message,
										result: result
									}
									//res.json(response);
									// //console.log(response);
								} else {
									// //console.log("11111111111111111111111111111----------------", err);
									var response = {
										status: status,
										message: message,
										result: err
									}
									//res.json(response);
									// //console.log(response);
								}
							});
						});
					}
				} else {
					// //console.log("0000000000000000000000000000000000----------------", err);
				}
			});
			break;

		case "BUYERS":
			console.log("---------------PUBLIC / BUYERS CASE-----------");
			chapterLaunchEngine__BUYERS(__capsuleId, MakingFor, req, res);
			break;

		case "SUBSCRIBERS":
			// //console.log("---------------SUBSCRIBERS CASE-----------");
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			// //console.log("128-------------", response)
			res.json(response)
			break;

		default:

	}

}

var chapterLaunchEngine = function (__capsuleId, MakingFor, req, res) {
	// //console.log("------chapterLaunchEngine-------");
	var conditions = {
		CapsuleId: __capsuleId,
		IsLaunched: 0,						//IsLaunched = true means the batch invitations have been sent.
		Status: 1,
		IsDeleted: 0
	};

	var fields = {};
	// //console.log('===========================================');
	// //console.log(conditions);
	// //console.log('===========================================');

	Chapter.find(conditions, fields, function (err, results) {
		if (!err) {
			if (results.length) {
				for (var loop = 0; loop < results.length; loop++) {
					var ChapterData = results[loop];

					//added on 24th JAN 2017 - Now Auto Name replace filter is available for all cases of publish
					MEcapsule__updatePageNamesAsPerFilterRule(ChapterData._id, req);

					//var MakingFor = ChapterData.LaunchSettings.MakingFor;
					var ShareMode = ChapterData.LaunchSettings.ShareMode;
					var __chapterId = ChapterData._id;

					if (ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group") {
						ShareMode = "invite";
					}
					switch (ShareMode) {
						case "invite":
							// //console.log("public / friend-solo / friend-group Case........");
							var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
							chapter__sendInvitations(ChapterData, invitees, req);
							Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
								if (err) {
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									// //console.log("129-------------", response)
								} else {
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result: results
									}
									// //console.log(response);
								}
							});
							break;

						case "private":
							// //console.log("No need to do anything.. It's private area.");
							Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
								if (err) {
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									// //console.log("130-------------", response)
								} else {
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result: results
									}
									// //console.log(response);
								}
							});
							break;

						default:
							// //console.log("Error on ShareMode = ", ShareMode);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
						// //console.log("131-------------", response);
						//return;
					}

					// //console.log("loop = " + loop + " ---results.length - 1 = " + results.length - 1);

					if (loop == results.length - 1) {
						var setData = {};
						switch (MakingFor) {
							case "ME":
								setData = {
									IsPublished: true,
									IsLaunched: true,
									ModifiedOn: Date.now()
								}
								break;

							case "OTHERS":
								setData = {
									IsPublished: true,
									ModifiedOn: Date.now()
								}
								break;

							case "BUYERS":
								setData = {
									IsPublished: true,
									ModifiedOn: Date.now()
								}
								break;

							case "SUBSCRIBERS":
								setData = {
									IsPublished: true,
									ModifiedOn: Date.now()
								}
								break;

							default:

							// //console.log("ERROR--------------9798875765764564544654");
						}

						// //console.log("setData = ", setData);
						Capsule.update({ _id: __capsuleId }, { $set: setData }, { multi: false }, function (err, numAffected) {
							if (!err) {
								var response = {
									status: 200,
									message: "Capsule has been published successfully.",
									result: results
								}
								res.json(response);
							}
							else {
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								// //console.log("133-------------", response);
							}
						});
					}
				}
			}
			else {
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}


		}
		else {
			// //console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});

}

var chapterLaunchEngine__BUYERS = function (__capsuleId, MakingFor, req, res) {
	console.log("------chapterLaunchEngine__BUYERS-------");
	var conditions = {
		CapsuleId: __capsuleId,
		//IsLaunched: 0,						//IsLaunched = true means the batch invitations have been sent.
		Status: 1,
		IsDeleted: 0
	};

	var fields = {};
	// //console.log('===========================================');
	// //console.log(conditions);
	// //console.log('===========================================');
	//console.log("------------------------------------------------------chapterLaunchEngine__BUYERSchapterLaunchEngine__BUYERSchapterLaunchEngine__BUYERS---------------------------------");
	Chapter.find(conditions, fields, function (err, results) {
		if (!err) {
			if (results.length) {
				for (var loop = 0; loop < results.length; loop++) {
					var ChapterData = results[loop];

					//added on 24th JAN 2017 - Now Auto Name replace filter is available for all cases of publish
					//MEcapsule__updatePageNamesAsPerFilterRule(ChapterData._id , req);

					//var MakingFor = ChapterData.LaunchSettings.MakingFor;
					var ShareMode = ChapterData.LaunchSettings.ShareMode;
					var __chapterId = ChapterData._id;

					if (ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group") {
						ShareMode = "invite";
					}
					switch (ShareMode) {
						case "invite":
							// //console.log("public / friend-solo / friend-group Case........");
							ChapterData.LaunchSettings.Invitees = []; //for BUYERS CASE...Updated on 04 July 2017 by manishp
							var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
							chapter__sendInvitations(ChapterData, invitees, req);
							Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
								if (err) {
									var response = {
										status: 501,
										message: "Something went wrong.98789"
									}
									// //console.log("129-------------", response)
								} else {
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result: results
									}
									// //console.log(response);
								}
							});
							break;

						case "private":
							// //console.log("No need to do anything.. It's private area.");
							Chapter.update({ _id: __chapterId }, { $set: { IsLaunched: true, "LaunchSettings.MakingFor": "ME", ModifiedOn: Date.now() } }, { multi: false }, function (err, numAffected) {
								if (err) {
									var response = {
										status: 501,
										message: "Something went wrong987897."
									}
									// //console.log("130-------------", response)
								} else {
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result: results
									}
									// //console.log(response);
								}
							});
							break;

						default:
							// //console.log("Error on ShareMode = ", ShareMode);
							var response = {
								status: 501,
								message: "Something went wrong0908989."
							}
						// //console.log("131-------------", response);
						//return;
					}

					// //console.log("loop = " + loop + " ---results.length - 1 = " + results.length - 1);

					if (loop == results.length - 1) {
						var setData = {};
						switch (MakingFor) {
							case "ME":
								setData = {
									IsPublished: true,
									IsLaunched: true,
									ModifiedOn: Date.now()
								}
								break;

							case "OTHERS":
								setData = {
									IsPublished: true,
									ModifiedOn: Date.now()
								}
								break;

							case "BUYERS":
								setData = {
									IsPublished: true,
									IsLaunched: true,
									ModifiedOn: Date.now()
								}
								break;

							case "SUBSCRIBERS":
								setData = {
									IsPublished: true,
									ModifiedOn: Date.now()
								}
								break;

							default:

							// //console.log("ERROR--------------9798875765764564544654");
						}

						// //console.log("setData = ", setData);
						Capsule.update({ _id: __capsuleId }, { $set: setData }, { multi: false }, function (err, numAffected) {
							if (!err) {
								var response = {
									status: 200,
									message: "Capsule has been published successfully.",
									result: results
								}
								res.json(response);
							}
							else {
								console.log("87564375634 - ", err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								// //console.log("133-------------", response);
							}
						});
					}
				}
			}
			else {
				console.log("4569743967439867 - ", err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}


		}
		else {
			console.log("q34985623498563248956 - ", err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});

}

var publish = function (req, res) {
	console.log('getting here----------capsule publish api');

	var __capsuleId = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var participation = req.body.participation ? req.body.participation : 'private';
	var title = req.body.title ? req.body.title : "Untitled Capsule";
	var price = req.body.price ? parseFloat(req.body.price) : 0;	//for BUYERS case

	var conditions = {};
	conditions._id = __capsuleId;

	var setData = {
		'LaunchSettings.Audience': makingFor,
		'LaunchSettings.ShareMode': participation,
		'Title': title
	};

	//check for price if capsule is for sale
	if (makingFor == 'BUYERS' && price == 0) {
		if (price == 0) {
			// //console.log("---------------BUYERS CASE-----------PRICE is not specified...");
			var response = {
				status: 301,
				message: "Please enter a valid price for the capsule."
			}
			res.json(response);
			return;
		}
		else {
			setData = {
				'LaunchSettings.Audience': makingFor,
				'LaunchSettings.ShareMode': participation,
				'Title': title,
				'Price': price
			};
		}
	}

	Capsule.update(conditions, { $set: setData }, { multi: false }, function (err, numAffected) {
		if (!err) {
			switch (makingFor) {
				case "ME":
					//making it for	ME/myself - Launch associated chapters ie. send invitations and update the IsLaunched Key to true.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId, makingFor, req, res);
					break;

				case "OTHERS":
					//making it for	OTHERS - update the IsLaunched Key to false - Owner will Launch it later.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId, makingFor, req, res);
					break;

				case "BUYERS":
					console.log("----------------BUYERS CASE -----------------");
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId, makingFor, req, res);

					break;

				case "SUBSCRIBERS":
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId, makingFor, req, res);

					break;

				default:
				// //console.log("------WRONG CASE FOUND ERROR : MakingFor-------");

			}
		}
		else {
			console.log("------------------------------err------------------------- ", err);

		}
	});
}

var publishV2 = function (req, res) {
	var __capsuleId = req.headers.capsule_id ? req.headers.capsule_id : '0';

	var condition = {};
	condition._id = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var CapsuleFor = req.body.CapsuleFor ? req.body.CapsuleFor : 'Stream';
	var StreamType = req.body.StreamType ? req.body.StreamType : null;
	var participation = req.body.participation ? req.body.participation : 'private';
	var price = req.body.price ? parseFloat(req.body.price) : 0;
	var DiscountPrice = req.body.DiscountPrice ? parseFloat(req.body.DiscountPrice) : 0;

	req.body.LaunchSettings = req.body.LaunchSettings ? req.body.LaunchSettings : {};
	var OwnerBirthday = req.body.LaunchSettings.OwnerBirthday ? req.body.LaunchSettings.OwnerBirthday : null;

	var StreamFlow = req.body.StreamFlow ? req.body.StreamFlow : 'Birthday';
	var OwnerAnswer = req.body.OwnerAnswer ? req.body.OwnerAnswer : false;
	var IsOwnerPostsForMember = req.body.IsOwnerPostsForMember ? req.body.IsOwnerPostsForMember : false;
	var IsPurchaseNeededForAllPosts = req.body.IsPurchaseNeededForAllPosts ? req.body.IsPurchaseNeededForAllPosts : false;

	var Frequency = req.body.Frequency ? req.body.Frequency : 'medium';
	var MonthFor = req.body.MonthFor ? req.body.MonthFor : 'M12';

	if(req.body.title){
		var title = req.body.title;

		var setObj = {
			'LaunchSettings.Audience' : makingFor,
			'LaunchSettings.CapsuleFor' : CapsuleFor,
			'LaunchSettings.ShareMode' : participation,
			'Title' : title,
			'ModifiedOn' : Date.now()
		};

		if(setObj['LaunchSettings.CapsuleFor'] == 'Stream') {
			setObj['LaunchSettings.StreamType'] = StreamType ? StreamType : '';
			setObj['StreamFlow'] = StreamFlow;
			setObj['OwnerAnswer'] = OwnerAnswer;
			setObj['IsOwnerPostsForMember'] = IsOwnerPostsForMember;
			setObj['IsPurchaseNeededForAllPosts'] = IsPurchaseNeededForAllPosts;

			setObj['Frequency'] = Frequency;
			setObj['MonthFor'] = MonthFor;
		}

		if(OwnerBirthday) {
			setObj['LaunchSettings.OwnerBirthday'] = OwnerBirthday;
		}

		if(makingFor == 'BUYERS' && price == 0) {
			//setObj.Price = price;
		}
		else{
			setObj.Price = price;
		}

		setObj.DiscountPrice = DiscountPrice;

		Capsule.update(condition,{$set:setObj},{multi:false},function(err,numAffected){
			if (!err) {
				switch (makingFor) {
					case "ME":
						//making it for	ME/myself - Launch associated chapters ie. send invitations and update the IsLaunched Key to true.
						//chapterLaunchEngine(__capsuleId , makingFor , req , res);
						capsuleLaunchEngine(__capsuleId, makingFor, req, res);
						break;

					case "OTHERS":
						//making it for	OTHERS - update the IsLaunched Key to false - Owner will Launch it later.
						//chapterLaunchEngine(__capsuleId , makingFor , req , res);
						capsuleLaunchEngine(__capsuleId, makingFor, req, res);
						break;

					case "BUYERS":
						console.log("----------------BUYERS CASE -----------------");
						//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
						capsuleLaunchEngine(__capsuleId, makingFor, req, res);

						break;

					case "SUBSCRIBERS":
						//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
						capsuleLaunchEngine(__capsuleId, makingFor, req, res);

						break;

					default:
					// //console.log("------WRONG CASE FOUND ERROR : MakingFor-------");

				}
			}
			else {
				console.log("------------------------------err------------------------- ", err);

			}
		})
	}
}
/*________________________________________________________________________
   * @Date:      		21 October 2015
   * @Method :   		capsule__checkCompleteness
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var __getObjArrayIdxByKey = function (ObjArr, matchKey, matchVal) {
	var idx;
	for (var loop = 0; loop < ObjArr.length; loop++) {
		var data = ObjArr[loop];
		if (data.hasOwnProperty(matchKey)) {
			if (data[matchKey] == matchVal) {
				idx = loop;
				break;
			}
		}
	}
	return idx;
}

var capsule__checkCompleteness = function (req, res) {
	Capsule.find({ _id: req.headers.capsule_id, Status: true, IsDeleted: false }, { _id: true }, function (err, result) {
		if (!err) {
			if (result.length) {
				var conditions = {
					CapsuleId: req.headers.capsule_id,
					Status: 1,
					IsDeleted: 0
				};

				var fields = { _id: true };
				Chapter.find(conditions, fields, function (err, results) {
					if (!err) {
						if (results.length) {
							var chapter_ids = [], temp_cIds = [];
							for (var loop = 0; loop < results.length; loop++) {
								chapter_ids.push(results[loop]._id);
								temp_cIds.push(String(results[loop]._id));
							}
							// //console.log("chapter_ids = ", temp_cIds);
							if (chapter_ids.length) {
								var conditions = {
									ChapterId: { $in: temp_cIds },
									//Status : 1,
									IsDeleted: 0,
									PageType: { $in: ["gallery", "content"] }
								};

								var fields = {
									_id: false,
									ChapterId: true
								};


								Page.find(conditions, fields, function (err, result) {
									if (!err) {
										//var result = new Array(result);
										var resultArr = [];
										for (var loop = 0; loop < result.length; loop++) {
											resultArr[loop] = { ChapterId: result[loop].ChapterId };
										}

										// //console.log(resultArr.length + "---------- >= --------------" + chapter_ids.length);
										if (resultArr.length && resultArr.length >= chapter_ids.length) {
											var flag = true;
											for (var loop = 0; loop < chapter_ids.length; loop++) {
												var idx = __getObjArrayIdxByKey(resultArr, 'ChapterId', chapter_ids[loop]);
												if (idx >= 0) {
													continue;
												}
												else {
													flag = false;
													break;
												}
											}

											if (flag) {
												var response = {
													status: 200,
													message: "Capsule is complete to publish."
												}
												res.json(response);
											}
											else {
												// //console.log("--------------------------------------4");
												var response = {
													status: 400,
													message: "Error: It seems like you have at least one chapter without a page. Please add at least one page into the empty chapter or delete the chapter and publish again."
												}
												res.json(response);
											}
										}
										else {
											// //console.log("--------------------------------------3");
											var response = {
												status: 400,
												message: "Error: It seems like you have at least one chapter without a page. Please add at least one page into the empty chapter or delete the chapter and publish again."
											}
											res.json(response);
										}
									}
									else {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response);
									}
								})
							}
							else {
								// //console.log("--------------------------------------2");
								var response = {
									status: 400,
									message: "Error: It seems like you have no chapter in this capsule. Please add at least one chapter and one page into the chapter and publish again."
								}
								res.json(response);
							}
						}
						else {
							// //console.log("--------------------------------------1");
							var response = {
								status: 400,
								message: "Error: It seems like you have no chapter in this capsule. Please add at least one chapter and one page into the chapter and publish again."
							}
							res.json(response);
						}
					}
					else {
						// //console.log(err);
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
		}
		else {
			// //console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

//Jack / Jill replacement.
var MEcapsule__updatePageNamesAsPerFilterRule = function (__chapterId, req) {

	var __chapterId = __chapterId ? __chapterId : "undefined";
	//// //console.log("owner = ",owner);

	//check if the owner is register or not
	var UserData = req.session.user ? req.session.user : {};
	if (UserData.Email) {
		//pages under chapters
		var conditions = {
			ChapterId: __chapterId,
			OwnerId: UserData._id,
			IsDeleted: 0,
			PageType: { $in: ["gallery", "content", "qaw-gallery"] }
		};
		var sortObj = {
			Order: 1,
			UpdatedOn: -1
		};
		var fields = {
			_id: true,
			PageType: true,
			Title: true,
			ViewportDesktopSections: true,
			ViewportTabletSections: true,
			ViewportMobileSections: true
		};

		Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {
			if (!err) {
				var fields = {
					_id: true,
					Title: true,
					PageType: true,
					ViewportDesktopSections: true,
					ViewportTabletSections: true,
					ViewportMobileSections: true

				};
				for (var loop = 0; loop < results.length; loop++) {
					var conditions = {};
					conditions._id = results[loop]._id;
					var PageType = results[loop].PageType;

					var data = {};
					data.Title = results[loop].Title;

					//AUTO NAME REPLACE FILTER
					if (PageType == "gallery" || PageType == "qaw-gallery") {
						var OwnerGender = UserData.Gender ? UserData.Gender : "male";
						var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
						var str = data.Title;
						var res = str;
						if (OwnerGender == 'male') {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bShe\b/g, "He");
							res = res.replace(/\bshe\b/g, "he");
							res = res.replace(/\bher\b/g, "his");
							res = res.replace(/\bHer\b/g, "His");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						else if (OwnerGender == 'female') {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bHe\b/g, "She");
							res = res.replace(/\bhe\b/g, "she");
							res = res.replace(/\bhis\b/g, "her");
							res = res.replace(/\bHis\b/g, "Her");
							res = res.replace(/\bhim\b/g, "her");
							res = res.replace(/\bHim\b/g, "Her");
							res = res.replace(/\bhimself\b/g, "herself");
							res = res.replace(/\bHimself\b/g, "Herself");
						}
						else {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bHe\b/g, "They");
							res = res.replace(/\bhe\b/g, "they");
							res = res.replace(/\bHe is\b/g, "They are");
							res = res.replace(/\bhe is\b/g, "they are");
							res = res.replace(/\bhis\b/g, "their");
							res = res.replace(/\bHis\b/g, "Their");
							res = res.replace(/\bhim\b/g, "them");
							res = res.replace(/\bHim\b/g, "Them");
							res = res.replace(/\bhimself\b/g, "themselves");
							res = res.replace(/\bHimself\b/g, "Themselves");

							res = res.replace(/\bShe\b/g, "They");
							res = res.replace(/\bshe\b/g, "they");
							res = res.replace(/\bShe is\b/g, "They are");
							res = res.replace(/\bshe is\b/g, "they are");
							res = res.replace(/\bher\b/g, "them");
							res = res.replace(/\bHer\b/g, "Their");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						data.Title = res;
					}
					else if (PageType == "content") {
						var OwnerGender = UserData.Gender ? UserData.Gender : "male";
						var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
						var str = data.Title;
						var res = str;
						if (OwnerGender == 'male') {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bShe\b/g, "He");
							res = res.replace(/\bshe\b/g, "he");
							res = res.replace(/\bher\b/g, "his");
							res = res.replace(/\bHer\b/g, "His");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						else if (OwnerGender == 'female') {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bHe\b/g, "She");
							res = res.replace(/\bhe\b/g, "she");
							res = res.replace(/\bhis\b/g, "her");
							res = res.replace(/\bHis\b/g, "Her");
							res = res.replace(/\bhim\b/g, "her");
							res = res.replace(/\bHim\b/g, "Her");
							res = res.replace(/\bhimself\b/g, "herself");
							res = res.replace(/\bHimself\b/g, "Herself");
						}
						else {
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bHe\b/g, "They");
							res = res.replace(/\bhe\b/g, "they");
							res = res.replace(/\bHe is\b/g, "They are");
							res = res.replace(/\bhe is\b/g, "they are");
							res = res.replace(/\bhis\b/g, "their");
							res = res.replace(/\bHis\b/g, "Their");
							res = res.replace(/\bhim\b/g, "them");
							res = res.replace(/\bHim\b/g, "Them");
							res = res.replace(/\bhimself\b/g, "themselves");
							res = res.replace(/\bHimself\b/g, "Themselves");

							res = res.replace(/\bShe\b/g, "They");
							res = res.replace(/\bshe\b/g, "they");
							res = res.replace(/\bShe is\b/g, "They are");
							res = res.replace(/\bshe is\b/g, "they are");
							res = res.replace(/\bher\b/g, "them");
							res = res.replace(/\bHer\b/g, "Their");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						data.Title = res;

						//Now replace the question text if any check under all viewport Sections...
						data.ViewportDesktopSections = results[loop].ViewportDesktopSections ? results[loop].ViewportDesktopSections : [];
						data.ViewportTabletSections = results[loop].ViewportTabletSections ? results[loop].ViewportTabletSections : [];
						data.ViewportMobileSections = results[loop].ViewportMobileSections ? results[loop].ViewportMobileSections : [];

						//1) for desktop viewport
						var ViewportDesktopSections = data.ViewportDesktopSections ? data.ViewportDesktopSections : {};
						ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];

						var ViewportTabletSections = data.ViewportTabletSections ? data.ViewportTabletSections : {};
						ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];

						var ViewportMobileSections = data.ViewportMobileSections ? data.ViewportMobileSections : {};
						ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];

						//check if we have QA widget anything
						for (var loop1 = 0; loop1 < ViewportDesktopSections.Widgets.length; loop1++) {
							if (ViewportDesktopSections.Widgets[loop1].Type == "questAnswer") {
								var str = data.ViewportDesktopSections.Widgets[loop1].Data ? data.ViewportDesktopSections.Widgets[loop1].Data : "";
								var res = str;
								if (OwnerGender == 'male') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if (OwnerGender == 'female') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "She");
									res = res.replace(/\bhe\b/g, "she");
									res = res.replace(/\bhis\b/g, "her");
									res = res.replace(/\bHis\b/g, "Her");
									res = res.replace(/\bhim\b/g, "her");
									res = res.replace(/\bHim\b/g, "Her");
									res = res.replace(/\bhimself\b/g, "herself");
									res = res.replace(/\bHimself\b/g, "Herself");
								}
								else {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "They");
									res = res.replace(/\bhe\b/g, "they");
									res = res.replace(/\bHe is\b/g, "They are");
									res = res.replace(/\bhe is\b/g, "they are");
									res = res.replace(/\bhis\b/g, "their");
									res = res.replace(/\bHis\b/g, "Their");
									res = res.replace(/\bhim\b/g, "them");
									res = res.replace(/\bHim\b/g, "Them");
									res = res.replace(/\bhimself\b/g, "themselves");
									res = res.replace(/\bHimself\b/g, "Themselves");

									res = res.replace(/\bShe\b/g, "They");
									res = res.replace(/\bshe\b/g, "they");
									res = res.replace(/\bShe is\b/g, "They are");
									res = res.replace(/\bshe is\b/g, "they are");
									res = res.replace(/\bher\b/g, "them");
									res = res.replace(/\bHer\b/g, "Their");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								data.ViewportDesktopSections.Widgets[loop1].Data = res;
							}
						}

						//2) for tablet viewport
						for (var loop1 = 0; loop1 < ViewportTabletSections.Widgets.length; loop1++) {
							if (ViewportTabletSections.Widgets[loop1].Type == "questAnswer") {
								var str = data.ViewportTabletSections.Widgets[loop1].Data ? data.ViewportTabletSections.Widgets[loop1].Data : "";
								var res = str;
								if (OwnerGender == 'male') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if (OwnerGender == 'female') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "She");
									res = res.replace(/\bhe\b/g, "she");
									res = res.replace(/\bhis\b/g, "her");
									res = res.replace(/\bHis\b/g, "Her");
									res = res.replace(/\bhim\b/g, "her");
									res = res.replace(/\bHim\b/g, "Her");
									res = res.replace(/\bhimself\b/g, "herself");
									res = res.replace(/\bHimself\b/g, "Herself");
								}
								else {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "They");
									res = res.replace(/\bhe\b/g, "they");
									res = res.replace(/\bHe is\b/g, "They are");
									res = res.replace(/\bhe is\b/g, "they are");
									res = res.replace(/\bhis\b/g, "their");
									res = res.replace(/\bHis\b/g, "Their");
									res = res.replace(/\bhim\b/g, "them");
									res = res.replace(/\bHim\b/g, "Them");
									res = res.replace(/\bhimself\b/g, "themselves");
									res = res.replace(/\bHimself\b/g, "Themselves");

									res = res.replace(/\bShe\b/g, "They");
									res = res.replace(/\bshe\b/g, "they");
									res = res.replace(/\bShe is\b/g, "They are");
									res = res.replace(/\bshe is\b/g, "they are");
									res = res.replace(/\bher\b/g, "them");
									res = res.replace(/\bHer\b/g, "Their");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								data.ViewportTabletSections.Widgets[loop1].Data = res;
							}
						}

						//3) for mobile viewport
						for (var loop1 = 0; loop1 < ViewportMobileSections.Widgets.length; loop1++) {
							if (ViewportMobileSections.Widgets[loop1].Type == "questAnswer") {
								var str = data.ViewportMobileSections.Widgets[loop1].Data ? data.ViewportMobileSections.Widgets[loop1].Data : "";
								var res = str;
								if (OwnerGender == 'male') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if (OwnerGender == 'female') {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "She");
									res = res.replace(/\bhe\b/g, "she");
									res = res.replace(/\bhis\b/g, "her");
									res = res.replace(/\bHis\b/g, "Her");
									res = res.replace(/\bhim\b/g, "her");
									res = res.replace(/\bHim\b/g, "Her");
									res = res.replace(/\bhimself\b/g, "herself");
									res = res.replace(/\bHimself\b/g, "Herself");
								}
								else {
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bHe\b/g, "They");
									res = res.replace(/\bhe\b/g, "they");
									res = res.replace(/\bHe is\b/g, "They are");
									res = res.replace(/\bhe is\b/g, "they are");
									res = res.replace(/\bhis\b/g, "their");
									res = res.replace(/\bHis\b/g, "Their");
									res = res.replace(/\bhim\b/g, "them");
									res = res.replace(/\bHim\b/g, "Them");
									res = res.replace(/\bhimself\b/g, "themselves");
									res = res.replace(/\bHimself\b/g, "Themselves");

									res = res.replace(/\bShe\b/g, "They");
									res = res.replace(/\bshe\b/g, "they");
									res = res.replace(/\bShe is\b/g, "They are");
									res = res.replace(/\bshe is\b/g, "they are");
									res = res.replace(/\bher\b/g, "them");
									res = res.replace(/\bHer\b/g, "Their");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								data.ViewportMobileSections.Widgets[loop1].Data = res;
							}
						}
					}
					else {
						//no case
					}

					Page.update(conditions, { $set: data }, function (err, result) {
						if (!err) {
							// //console.log("WE HAVE DONE SOME CHANGES...", result);
						}
						else {
							// //console.log("ERROR---------------", err);
						}
					});
				}
			}
			else {
				// //console.log("095944564-----------", err);
			}
		});
	}
	else {
		// //console.log("09579-----------", UserData);
	}
}


function __getStringAfterNameRuled(str, OwnerGender, OwnerName) {
	var res = str;
	if (OwnerGender == 'male') {
		res = res.replace(/\bJack\b/g, OwnerName);
		res = res.replace(/\bJill\b/g, OwnerName);
		res = res.replace(/\bShe\b/g, "He");
		res = res.replace(/\bshe\b/g, "he");
		res = res.replace(/\bher\b/g, "his");
		res = res.replace(/\bHer\b/g, "His");
		res = res.replace(/\bherself\b/g, "himself");
		res = res.replace(/\bHerself\b/g, "Himself");
	}
	else if (OwnerGender == 'female') {
		res = res.replace(/\bJack\b/g, OwnerName);
		res = res.replace(/\bJill\b/g, OwnerName);
		res = res.replace(/\bHe\b/g, "She");
		res = res.replace(/\bhe\b/g, "she");
		res = res.replace(/\bhis\b/g, "her");
		res = res.replace(/\bHis\b/g, "Her");
		res = res.replace(/\bhim\b/g, "her");
		res = res.replace(/\bHim\b/g, "Her");
		res = res.replace(/\bhimself\b/g, "herself");
		res = res.replace(/\bHimself\b/g, "Herself");
	}
	else {
		res = res.replace(/\bJack\b/g, OwnerName);
		res = res.replace(/\bJill\b/g, OwnerName);
		res = res.replace(/\bHe\b/g, "They");
		res = res.replace(/\bhe\b/g, "they");
		res = res.replace(/\bHe is\b/g, "They are");
		res = res.replace(/\bhe is\b/g, "they are");
		res = res.replace(/\bhis\b/g, "their");
		res = res.replace(/\bHis\b/g, "Their");
		res = res.replace(/\bhim\b/g, "them");
		res = res.replace(/\bHim\b/g, "Them");
		res = res.replace(/\bhimself\b/g, "themselves");
		res = res.replace(/\bHimself\b/g, "Themselves");

		res = res.replace(/\bShe\b/g, "They");
		res = res.replace(/\bshe\b/g, "they");
		res = res.replace(/\bShe is\b/g, "They are");
		res = res.replace(/\bshe is\b/g, "they are");
		res = res.replace(/\bher\b/g, "them");
		res = res.replace(/\bHer\b/g, "Their");
		res = res.replace(/\bherself\b/g, "himself");
		res = res.replace(/\bHerself\b/g, "Himself");
	}
	return res;
}


var buyNow = async function (req, res) {	//buy your cart.
	console.log("------------------------------ buyNow Called --------------------------------------------");
	//get shopping cart details at server end. so that nothing can be fraud...
	var conditions = {
		//CreatedById : req.session.user._id ? req.session.user._id : null,
		CreatedByEmail: req.session.user.Email ? req.session.user.Email : null
	};
	var fields = {};
	var rdm_credit = 0;

	var result = await Cart.findOne(conditions).populate('CartItems.CapsuleId');
    result = typeof result === 'object' ? result : null;
    if (result) {
        var myCart = result ? result : {};
        myCart.CartItems = myCart.CartItems ? myCart.CartItems : [];

        if (myCart.CartItems.length > 0) {
            var order = {};
            var orderInit = {};


            var OrderInitiatedFrom = "PGALLARY"; //req.body.OrderInitiatedFrom ? req.body.OrderInitiatedFrom : null;
            var OrderCreatedById = req.session.user._id ? req.session.user._id : null;
            var OrderCreatedByEmail = req.session.user.Email ? req.session.user.Email : null;

            var cartItems = myCart.CartItems.length ? myCart.CartItems : [];
            var validCartItemsForOrder = [];
            var tempAllCapsuleIds_OnThisOrder = [];
            var cartItemFor = [];
            //there may be more than 1 item per Cart
            for (var loop = 0; loop < cartItems.length; loop++) {
                var cartItemsObj = cartItems[loop];
                cartItemsObj.Owners = cartItemsObj.Owners ? cartItemsObj.Owners : [];

                cartItemFor.push(cartItemsObj.PurchaseFor);

                var CartItem_owners = cartItemsObj.Owners.length ? cartItemsObj.Owners : [];
                var CartItem_capsuleId = cartItemsObj.CapsuleId._id;
                var CartItem_capsulePrice = parseFloat(cartItemsObj.CapsuleId.Price).toFixed(2);

                var validCartItemsOwners = [];
                var tempAllUniqueIdsPerCart = [];

                for (var loop1 = 0; loop1 < CartItem_owners.length; loop1++) {
                    var tempObj = CartItem_owners[loop1];
                    var neededFormatObj = {
                        OwnerEmail: tempObj.UserEmail,
                        OwnerName: tempObj.UserName ? tempObj.UserName : null,
                        UniqueIdPerOwner: tempObj.uniqueId
                    };
                    validCartItemsOwners.push(neededFormatObj);
                    tempAllUniqueIdsPerCart.push(neededFormatObj.UniqueIdPerOwner);
                }


                var CartItem_totalOwners = validCartItemsOwners.length;
                var CartItem_totalPaymentPerCapsule = parseFloat(CartItem_capsulePrice * CartItem_totalOwners).toFixed(2);
                var CartItem_totalCommissionPerCapsule = parseFloat((CartItem_totalPaymentPerCapsule * process.REVENUE_MODEL_CONFIG.PerSale_Commission) / 100).toFixed(2);

                var CartItem_capsuleCreatorId = cartItemsObj.CapsuleId.CreaterId;
                if (CartItem_capsulePrice <= 0 || CartItem_totalPaymentPerCapsule <= 0 || CartItem_totalCommissionPerCapsule <= 0) {
                    //This should not be a case!......ignore this case-----BUT need to investigate if occurs why ?
                }
                else {
                    var validCartItemsForOrderObj = {
                        CapsuleId: CartItem_capsuleId,
                        Price: CartItem_capsulePrice,								//This field will not be used for CREATE_Others case.
                        TotalPayment: CartItem_totalPaymentPerCapsule,
                        PlatformCommission: CartItem_totalCommissionPerCapsule,	//For CREATE_Others case it is currently $9.99 per owner.
                        CapsuleCreatedBy: CartItem_capsuleCreatorId,
                        Owners: validCartItemsOwners, 								//this must have ids of owners so that we can ref it.
                        UniqueIdPerOwnerArray: tempAllUniqueIdsPerCart,				//for temp operational use - Not Saving
                        MonthFor : cartItemsObj.MonthFor ? cartItemsObj.MonthFor : 'M12',
                        Frequency : cartItemsObj.Frequency ? cartItemsObj.Frequency : 'high',
                        EmailTemplate : cartItemsObj.EmailTemplate ? cartItemsObj.EmailTemplate : 'PracticalThinker',
                        IsStreamPaused : cartItemsObj.IsStreamPaused ? cartItemsObj.IsStreamPaused : 0,
                        IsSurpriseGift : cartItemsObj.IsSurpriseGift ? cartItemsObj.IsSurpriseGift : false,
                        StreamFlow : cartItemsObj.CapsuleId.StreamFlow ? cartItemsObj.CapsuleId.StreamFlow : null
                    }

                    validCartItemsForOrder.push(validCartItemsForOrderObj);
                    tempAllCapsuleIds_OnThisOrder.push(CartItem_capsuleId);
                }
            }

            req.body.purchaseFor = cartItemFor;

            // //console.log("------------------------validCartItemsForOrder = ", validCartItemsForOrder);

            order.OrderInitiatedFrom = OrderInitiatedFrom;
            order.CreatedById = OrderCreatedById;
            order.CreatedByEmail = OrderCreatedByEmail;
            order.TransactionState = 'Initiated';
            order.Status = true;
            order.UpdatedOn = Date.now();
            order.CartItems = validCartItemsForOrder;

            order.AllCapsuleIds = tempAllCapsuleIds_OnThisOrder;	//for temp operational use - Not Saving

            // //console.log("order.CartItems = " + order.CartItems);
            // //console.log("order.CartItems.length ================= ", order.CartItems.length);
            order.TotalPayment = 0;
            order.TotalPlatformCommission = 0;

            if (order.CartItems.length > 0) {
                //console.log("req.session.user-----", req.session.user);
                var userCreditAmount = req.session.user;
                //console.log("cartPopup", userCreditAmount);

                if (userCreditAmount.CreditAmount != 0 && userCreditAmount.IsCredit == true) {
                    order.TotalPayment = 0;
                    for (var loop = 0; loop < order.CartItems.length; loop++) {
                        order.TotalPayment = (parseFloat(order.TotalPayment) + parseFloat(order.CartItems[loop].TotalPayment)).toFixed(2);
                        order.TotalPlatformCommission = (parseFloat(order.CartItems[loop].PlatformCommission) + parseFloat(order.CartItems[loop].PlatformCommission)).toFixed(2);
                    }



                    if (userCreditAmount.CreditAmount <= order.TotalPayment) {
                        order.TotalPayment = order.TotalPayment - userCreditAmount.CreditAmount;
                        rdm_credit = userCreditAmount.CreditAmount;
                    } else {
                        // userCreditAmount.CreditAmount = userCreditAmount.CreditAmount - order.TotalPayment;
                        rdm_credit = order.TotalPayment;
                        order.TotalPayment = 0;
                    }

                } else {
                    for (var loop = 0; loop < order.CartItems.length; loop++) {
                        order.TotalPayment = (parseFloat(order.TotalPayment) + parseFloat(order.CartItems[loop].TotalPayment)).toFixed(2);
                        order.TotalPlatformCommission = (parseFloat(order.CartItems[loop].PlatformCommission) + parseFloat(order.CartItems[loop].PlatformCommission)).toFixed(2);
                    }

                }

                var result = await Order(order).save();
                result = typeof result === 'object' ? result : null;
                if (result) {
                    //var token = req.body.token ? req.body.token : null;
                    //var email = req.body.tokenEmail ? req.body.tokenEmail : req.session.user.Email;
                    var token = null;
                    var email = null;

                    req.body.token = req.body.token ? req.body.token : null;
                    if (req.body.token == 'free') {
                        var buy = {
                            paid: null,
                            failure_code: null
                        }
                        var fromFree = 'free';
                        console.log("---------------------- Calling savedOrder 1111111--------------");
                        await savedOrder(buy, orderInit, fromFree, rdm_credit, result, order, req, res);
                    } else {

                        if (req.body.token == 'trial') {	//Trial Publish for test convinience
                            stripe = require("stripe")(process.STRIPE_CONFIG.DEV.secret_key);	//test mode
                            stripe.tokens.create({
                                card: {
                                    "number": '4242424242424242',
                                    "exp_month": 12,
                                    "exp_year": 2035,
                                    "cvc": '123'
                                }
                            }, function (err, tokenObj) {
                                //// //console.log("-----------tokenObj---------",tokenObj);
                                // asynchronously called
                                token = tokenObj.id;
                                email = req.session.user.Email;
                                createCharges();
                            });
                        }
                        else {
                            token = req.body.token ? req.body.token : null;
                            email = req.body.tokenEmail ? req.body.tokenEmail : req.session.user.Email;
                            createCharges();
                        }

                        function createCharges() {
                            stripe.customers.create({
                                source: token,
                                description: email
                            }).then(function (customer) {
                                try {
                                    return stripe.charges.create({
                                        amount: parseInt(order.TotalPayment * 100), // Amount in cents
                                        currency: "usd",
                                        customer: customer.id
                                    });
                                } catch (e) {
                                    var response = {
                                        status: 200,
                                        message: "Payement catch 1 successfully",
                                        error: e,
                                    }
                                    res.json(response);
                                }

                            }).then(async function (charge) {
                                console.log("---------------------- Calling savedOrder --------------");
                                var fromstripe = 'stripe';
                                await savedOrder(charge, orderInit, fromstripe, rdm_credit, result, order, req, res);
                            });
                        }
                    }
                } else {
                    var response = {
                        status: 501,
                        message: "Something went wrong.",
                        result : result
                    }
                    res.json(response);
                }
            }
            else {
                // //console.log("YES-------------HERE 11111111");
                var response = {
                    status: 501,
                    message: "Something went wrong.",
                    err : "Order.CartItem issue"
                }
                res.json(response);
            }
        }
        else {
            // //console.log("YES-------------HERE 222222222222222");
            var response = {
                status: 501,
                message: "Something went wrong.",
                err : "Cart.CartItem issue"
            }
            res.json(response);
        }
    }
    else {
        var response = {
            status: 501,
            message: "Something went wrong.",
            result : result
        }
        res.json(response);
    }
}

var savedOrder = async function (charge, orderInit, payFrom, rdm_credit, result, order, req, res) {
	if (payFrom == 'stripe') {
		orderInit.PGatewayResult = charge;
	}
	if (charge.paid && charge.failure_code == null || payFrom == 'free') {
		orderInit.TransactionState = 'Completed';
		var message = "Payment completed successfully";
		var status = 200;

		//var totalOps = 0;
		for (var loop = 0; loop < order.CartItems.length; loop++) {
			var cartItem = order.CartItems[loop];
			var __capsuleId = cartItem.CapsuleId;
			var cartItemOwners = cartItem.Owners ? cartItem.Owners : [];

			var conditions = {
                _id: __capsuleId
            }
            var fields = {};
            var results = await Capsule.find(conditions, fields);
            results = Array.isArray(results) ? results : [];
            if (results.length) {
                var CapsuleData = results[0];
                CapsuleData.LaunchSettings = CapsuleData.LaunchSettings ? CapsuleData.LaunchSettings : {};
                CapsuleData.LaunchSettings.CapsuleFor = CapsuleData.LaunchSettings.CapsuleFor ? CapsuleData.LaunchSettings.CapsuleFor : null;
                if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream') {
                    CapsuleData.MonthFor = cartItem.MonthFor ? cartItem.MonthFor : 'M12';
                    CapsuleData.Frequency = cartItem.Frequency ? cartItem.Frequency : 'high';
                    CapsuleData.EmailTemplate = cartItem.EmailTemplate ? cartItem.EmailTemplate : 'PracticalThinker';
                    CapsuleData.IsStreamPaused = cartItem.IsStreamPaused ? cartItem.IsStreamPaused : 0;
                }

                if(CapsuleData.LaunchSettings.CapsuleFor == 'Stream' && CapsuleData.LaunchSettings.StreamType == 'Group') {
                    CapsuleData.IsSurpriseGift = cartItem.IsSurpriseGift ? cartItem.IsSurpriseGift : false;
                    CapsuleData.StreamFlow = cartItem.StreamFlow ? cartItem.StreamFlow : null;

                    //if Group Stream case then take settings from whatever creater has allowed
                    CapsuleData.MonthFor = CapsuleData.MonthFor ? CapsuleData.MonthFor : 'M12';
                    CapsuleData.Frequency = CapsuleData.Frequency ? CapsuleData.Frequency : 'high';
                    CapsuleData.FrequencyInDays = CapsuleData.FrequencyInDays ? CapsuleData.FrequencyInDays : '2';
                    CapsuleData.EmailTemplate = CapsuleData.EmailTemplate ? CapsuleData.EmailTemplate : 'PracticalThinker';
                    CapsuleData.IsStreamPaused = CapsuleData.IsStreamPaused ? CapsuleData.IsStreamPaused : 0;
                }

                if (cartItemOwners.length) {
                    for (var loop = 0; loop < cartItemOwners.length; loop++) {
                        var owner = {
                            UserName: cartItemOwners[loop].OwnerName ? cartItemOwners[loop].OwnerName : null,
                            UserEmail: cartItemOwners[loop].OwnerEmail ? cartItemOwners[loop].OwnerEmail : null,
                            UniqueIdPerOwner: cartItemOwners[loop].UniqueIdPerOwner ? cartItemOwners[loop].UniqueIdPerOwner : null
                        };

                        //var UniqueIdPerOwner = UniqueIds[loop] ? UniqueIds[loop] : null;
                        await capsule__createNewInstance(CapsuleData, owner, req, loop);
                    }
                }
            }
		}

        var conditions = {
			CreatedByEmail: req.session.user.Email ? req.session.user.Email : null
		};
		await Cart.remove(conditions, function (err, result) { });

		var response = {
			status: 200,
			message: "Your order has been completed successfully."
		}
		res.json(response);

	} else {
		orderInit.TransactionState = 'Failed';
		var message = charge.failure_message ? charge.failure_message : null;
		var status = charge.failure_code ? charge.failure_code : null;
	}
	if (orderInit.TransactionState == 'Completed' && req.session.user.IsCredit == false) {
		console.log("result._id----------------------------------------------------", req.session.user._id);
		User.update({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, {
			$set: { IsCredit: true }
		}, function (err, creditUpdate) {
			if (!err) {
				console.log("creditUpdate++++++++++++++++++++++++++++++1212121212121+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++", creditUpdate);
				var response = {
					status: 200,
					result: creditUpdate
				}
				AppSetting.findOne({ isDeleted: false }, function (err, AppSettingData) {
					console.log("AppSetting-----====-----=====",err,AppSettingData);
					if (!err) {
						Referral.findOne({ ReferredToId: new mongoose.Types.ObjectId(req.session.user._id), status: false }, function (err, referralInfo) {
							console.log("Referral-----====-----=====",err,referralInfo);
							if (!err && referralInfo) {
								var ReferralData = referralInfo;
								User.update({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, {
									$inc: { CreditAmount: AppSettingData.ReferralDiscount }
								}, function (err, referradToCredit) {
									console.log("creditUpdate+++++++++++++++++7777777777777777777777++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++", referradToCredit);
									if (!err) {
										User.update({ _id: new mongoose.Types.ObjectId(ReferralData.ReferredById) }, {
											$inc: { CreditAmount: AppSettingData.ReferralDiscount }
										}, function (err, referradByCredit) {
											console.log("++++++++++++++++++++++++++++++++++++++", referradByCredit);
											if (!err) {
												var transaction = new Transaction();
												transaction.TransectionId = ReferralData._id;
												transaction.TransectionType = 'Credit';
												transaction.Amount = AppSettingData.ReferralDiscount;
												transaction.save(function (err, updateCrTransectionData) {
													if (err) {
														console.log("err");
													} else {
														console.log("success", updateCrTransectionData);
													}
												})
												var response = {
													status: 200,
													result: referradByCredit
												}
											} else {
												var response = {
													status: 501,
													result: err
												}
											}
										})
									} else {
										var response = {
											status: 501,
											result: err
										}

									}

								})
							} else {
								var response = {
									status: 501,
									result: err
								}
							}
						})
					} else {
						var response = {
							status: 501,
							result: err
						}
					}
				})

			} else {
				var response = {
					status: 501,
					result: err
				}

			}

		})
	} else {
		if (orderInit.TransactionState == 'Completed' && req.session.user.IsCredit == true && req.session.user.CreditAmount > 5) {
			var newCreditAmount = req.session.user.CreditAmount - rdm_credit;
			User.update({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, {
				$set: { CreditAmount: newCreditAmount }
			}, function (err, byuserCreditUpdate) {
				if (!err) {
					var response = {
						status: 200,
						result: byuserCreditUpdate
					}

				} else {
					var response = {
						status: 501,
						result: err
					}

				}
			})
			//
		} else {
			if (orderInit.TransactionState == 'Completed' && req.session.user.IsCredit == true) {
				Referral.findOneAndUpdate({ ReferredToId: new mongoose.Types.ObjectId(req.session.user._id), status: false }, {
					$set: { status: true }
				}, function (err, referralUpdateStatus) {
					if (!err) {
						var newCreditAmount = req.session.user.CreditAmount - rdm_credit;
						User.update({ _id: new mongoose.Types.ObjectId(req.session.user._id) }, {
							$set: { CreditAmount: newCreditAmount }
						}, function (err, userCreditUpdate) {
							if (!err) {
								var response = {
									status: 200,
									result: userCreditUpdate
								}

							} else {
								var response = {
									status: 501,
									result: err
								}

							}
						})

					} else {
						var response = {
							status: 501,
							result: err
						}

					}

				})
			}

		}

	}
	if (rdm_credit > 0) { // If Debit
		var transaction = new Transaction();
		transaction.TransectionId = result._id;
		transaction.TransectionType = 'Debit';
		transaction.Amount = rdm_credit;
		transaction.save(function (err, updateTransectionData) {
			if (err) {
				console.log("err");
			} else {
				console.log("success---------", updateTransectionData);
			}
		})
	}
	//setTimeout(function(){
	Order.update({ _id: new mongoose.Types.ObjectId(result._id) }, { $set: orderInit }, async function (err, result) {
		if (!err) {
			console.log("sdssss***************ssssss")

			var response = {
				status: status,
				message: message,
				result: result
			}

			//res.json(response);
			// //console.log("response*****************",response);
			//await __increamentPriceOfOrderedCapsules(order.CartItems);

		} else {
			//// //console.log("11111111111111111111111111111----------------",err);
			var response = {
				status: status,
				message: message,
				result: err
			}
			//res.json(response);
			// //console.log(response);
		}
		console.log("sdssss******999999999999999999999999999999*********ssssss")

	});


}
exports.savedOrder = savedOrder;

function __checkNcreateChapterIntroPage(data, shareWithName, CapsuleData) {
	console.log("@@@@@@@@@@@----------__checkNcreateChapterIntroPage --------------- shareWithName ============ ",shareWithName);

	var OwnerName = shareWithName ? shareWithName : "Owner Name";
	var OwnerNameCapital = shareWithName ? shareWithName.toUpperCase() : "OWNER NAME";

	var CapsuleTitle = CapsuleData.Title ? CapsuleData.Title : "Capsule Title";
	var ChapterTitle = data.Title ? data.Title : "Chapter Title";

	var ChapterId = "";
	var PageId = "";

	var OriginatedFromChapterId = data.OriginatedFrom ? data.OriginatedFrom : null;

	if(OriginatedFromChapterId) {
		var chapterIntroPagePath = __dirname + "/../../public/views/capsule_prototypes/" + String(OriginatedFromChapterId) + ".html";

		var newChapterIntroPagePath = __dirname + "/../../public/views/intro-pages/" + String(data._id) + ".html";

		console.log("@@@@@@@@@@@@@@@@------------------------chapterIntroPagePath = ",chapterIntroPagePath);

		console.log("@@@@@@@@@@@@@@@@------------------------newChapterIntroPagePath = ",newChapterIntroPagePath);
		//return;

		if(fs.existsSync(chapterIntroPagePath)) {
			try {
				//create a new instance of the file
				fsextra.copySync(chapterIntroPagePath, newChapterIntroPagePath);

				//create a copy of existing with the newChapterId name.
				//Load the library and specify options
				var options = {
					files: newChapterIntroPagePath,
					from: [/{OwnerName}/g, /{OWNERNAME}/g, /{ChapterTitle}/g, /{CapsuleTitle}/g, /{ChapterId}/g, /{PageId}/g],
					to: [OwnerName, OwnerNameCapital, ChapterTitle, CapsuleTitle, ChapterId, PageId]
				};

				replaceInFile(options, function(error, results){
				  if (error) {
					console.log('@@@@@@@@@@@@@@---------Error occurred:', error);
				  }
				  console.log('@@@@@@@@@@@@@@@@@@@--------------Replacement results:', results);
				});
			} catch (e) {
				console.log(e)
			}
		}



		//Owner's case ...
		var owner_chapterIntroPagePath = __dirname + "/../../public/views/capsule_prototypes/" + String(OriginatedFromChapterId) + "_O.html";

		var owner_newChapterIntroPagePath = __dirname + "/../../public/views/intro-pages/" + String(data._id) + "_O.html";

		//console.log("@@@@@@@@@@@@@@@@------------------------owner_chapterIntroPagePath = ",owner_chapterIntroPagePath);

		//console.log("@@@@@@@@@@@@@@@@------------------------owner_newChapterIntroPagePath = ",owner_newChapterIntroPagePath);
		//return;

		if(fs.existsSync(owner_chapterIntroPagePath)) {
			try {
				//create a new instance of the file
				fsextra.copySync(owner_chapterIntroPagePath, owner_newChapterIntroPagePath);

				//create a copy of existing with the newChapterId name.
				//Load the library and specify options
				var options = {
					files: owner_newChapterIntroPagePath,
					from: [/{OwnerName}/g, /{OWNERNAME}/g, /{ChapterTitle}/g, /{CapsuleTitle}/g, /{ChapterId}/g, /{PageId}/g],
					to: [OwnerName, OwnerNameCapital, ChapterTitle, CapsuleTitle, ChapterId, PageId]
				};

				replaceInFile(options, function(error, results){
				  if (error) {
					console.log('@@@@@@@@@@@@@@---------Error occurred:', error);
				  }
				  //console.log('@@@@@@@@@@@@@@@@@@@--------------Replacement results:', results);
				});
			} catch (e) {
				console.log(e)
			}
		}
	}
}


//Capsules In the making Apis
exports.getChapters = getChapters;
exports.find = find;
exports.saveAndLaunch = saveAndLaunch;
exports.publish = publishV2; //publish;

exports.capsule__checkCompleteness = capsule__checkCompleteness;

exports.buyNow = buyNow;
exports.createCelebrityInstance = createCelebrityInstance;
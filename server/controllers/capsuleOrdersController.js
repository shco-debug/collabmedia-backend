var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');


var Order = require('./../models/orderModel.js');
var stripe = require("stripe")("sk_test_5M7DrMG5iek1yRa8DEwhcG2W");
var mongoose = require("mongoose");


var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var async = require('async');

var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

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

var capsule__createNewInstance = function( CapsuleData , owner, req ){

	
	
	var __capsuleId = CapsuleData._id;
	
	//console.log("owner = ",owner);
	
	//check if the owner is register or not
	var shareWithEmail = owner.UserEmail ? owner.UserEmail : false;
	var shareWithName = owner.UserName ? owner.UserName.split(' ')[0] : 'OWNER';
	var UniqueIdPerOwner = owner.UniqueIdPerOwner ? owner.UniqueIdPerOwner : null;
	
	if( shareWithEmail ){
		var conditions = {};
		conditions.Email = shareWithEmail;
		
		var fields = {
			Email : true,
			Name : true,
			Gender : true
		};
		
		User.find(conditions , fields , function(err , UserData){
			if(!err){
				//console.log("UserData = ",UserData);
				
				var data = {};
				data.Origin = "published";
				data.OriginatedFrom = __capsuleId;

				if(UniqueIdPerOwner != null) {
					data.UniqueIdPerOwner = UniqueIdPerOwner;
				}
				
				data.CreaterId = req.session.user._id;
				if(!UserData.length){
					//Non-Registered user case
					data.OwnerId = req.session.user._id;	//will update this ownerId at the time of user registeration.
				}
				else{
					data.OwnerId = UserData[0]._id;
				}

				data.OwnerEmail = shareWithEmail;
				data.Title = CapsuleData.Title;
				data.CoverArt = CapsuleData.CoverArt;
				
				data.IsPublished = true;				//published by someone else....
				
				var nowDate = Date.now();
				data.CreatedOn = nowDate;
				data.ModifiedOn = nowDate;

				////console.log("data = ",data);
				Capsule(data).save(function( err , result ){
					if( !err ){
						//pages under chapters
						var conditions = {
							CapsuleId : __capsuleId, 
							CreaterId : req.session.user._id,
							Status : 1,
							IsDeleted : 0
						};
						var sortObj = {
							Order : 1,
							ModifiedOn : -1
						};
						var fields = {
							_id : true
						}; 
						
						var newCapsuleId = result._id;
						Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
							if( !err ){
								var fields = {
									_id : true,
									Title : true,
									CoverArt : true,
									Order : true,
									LaunchSettings : true,
									CoverArtFirstPage : true,
									ChapterPlaylist : true
								}; 
								for( var loop = 0; loop < results.length; loop++ ){
									var conditions = {};
									conditions._id = results[loop]._id;
									Chapter.findOne(conditions , fields, function( err , result ){
										
										var __chapterId = result._id ? result._id : 0;
										//delete result._id;
										var data = {};
										data.Origin = "published";
										data.OriginatedFrom = result._id;
										data.CreaterId = req.session.user._id;
										
										if(!UserData.length){
											//Non-Registered user case			- this will be modified when user will register into the platform.
											data.OwnerId = req.session.user._id;
										}
										else{
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
										data.UpdatedOn = nowDate;
										
										//console.log("-------",result);
										////console.log("data = ",data);
										Chapter(data).save(function( err , result ){
											if( !err ){
												
												//pages under chapters
												var conditions = {
													ChapterId : __chapterId, 
													CreaterId : req.session.user._id,
													IsDeleted : 0,
													PageType : {$in : ["gallery" , "content"]}
												};
												var sortObj = {
													Order : 1,
													UpdatedOn : -1
												};
												var fields = {
													_id : true
												}; 
												
												var newChapterId = result._id;
												Page.find(conditions , fields).sort(sortObj).exec(function( err , results ){
													if( !err ){
														var fields = {
															_id : true,
															Title : true,
															PageType : true,
															Order : true,
															HeaderImage : true,
															BackgroundMusic : true,
															CommonParams : true,
															ViewportDesktopSections : true,
															ViewportTabletSections : true,
															ViewportMobileSections : true,
															SelectedMedia : true,
															SelectedCriteria : true,
															HeaderBlurValue : true,
															HeaderTransparencyValue : true
														}; 
														for( var loop = 0; loop < results.length; loop++ ){
															var conditions = {};
															conditions._id = results[loop]._id;
															Page.findOne(conditions , fields, function( err , result ){
																//delete result._id;
																var data = {};
																data.Origin = "published";
																data.OriginatedFrom = result._id;
																data.CreaterId = req.session.user._id;
																
																if(!UserData.length){
																	//Non-Registered user case
																	data.OwnerId = req.session.user._id;
																}
																else{
																	data.OwnerId = UserData[0]._id;
																}
																
																data.OwnerEmail = shareWithEmail;
																data.ChapterId = newChapterId?newChapterId:"";
																data.Title = result.Title;
																data.PageType = result.PageType;
																data.Order = result.Order;
																data.HeaderImage = result.HeaderImage?result.HeaderImage:"";
																data.BackgroundMusic = result.BackgroundMusic?result.BackgroundMusic:"";
																data.HeaderBlurValue = result.HeaderBlurValue;
																data.HeaderTransparencyValue = result.HeaderTransparencyValue;
																
																data.CreatedOn = nowDate;
																data.UpdatedOn = nowDate;
                                                                                                                                
                                                                //AUTO NAME REPLACE FILTER
																var OwnerGender = "male";
																var OwnerName = "OWNER";
																if(UserData.length){
																	//Non-Registered user case
																	OwnerGender = UserData[0].Gender ? UserData[0].Gender : "male";
																	OwnerName = UserData[0].Name ? UserData[0].Name.split(' ')[0] : "OWNER";
																}else{
																	OwnerName = shareWithName ? shareWithName : 'OWNER';
																}
																
																if(data.PageType == "gallery"){
																	var str = data.Title;
																	var res = str;
																	if( OwnerGender == 'male' ){
																		res = res.replace(/\bJack\b/g, OwnerName);
																		res = res.replace(/\bJill\b/g, OwnerName);
																		res = res.replace(/\bShe\b/g, "He");
																		res = res.replace(/\bshe\b/g, "he");
																		res = res.replace(/\bher\b/g, "his");
																		res = res.replace(/\bHer\b/g, "His");
																		res = res.replace(/\bherself\b/g, "himself");
																		res = res.replace(/\bHerself\b/g, "Himself");
																	}
																	else if( OwnerGender == 'female' ){
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
																	
																if(data.PageType == "content"){
																	data.CommonParams = result.CommonParams ? result.CommonParams : {};
																	data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
																	data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
																	data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};
																	
																	
																	//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
																	//desktop viewport filter
																	data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportDesktopSections.Widgets[loop];
																		widObj.Type = widObj.Type ? widObj.Type : "";
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			var QuestString = data.ViewportDesktopSections.Widgets[loop].Data ? data.ViewportDesktopSections.Widgets[loop].Data : "";
																			data.ViewportDesktopSections.Widgets[loop].Data = __getStringAfterNameRuled (QuestString , OwnerGender , OwnerName);
																			
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
																			}
																		}
																	}
																	
																	//tablet viewport filter
																	data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportTabletSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			var QuestString = data.ViewportTabletSections.Widgets[loop].Data ? data.ViewportTabletSections.Widgets[loop].Data : "";
																			data.ViewportTabletSections.Widgets[loop].Data = __getStringAfterNameRuled (QuestString , OwnerGender , OwnerName);
																			
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
																				Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
																				Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
																			}
																		}
																	}
																	
																	//mobile viewport filter
																	data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];
																	
																	for( var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++ ){
																		var widObj = data.ViewportMobileSections.Widgets[loop];
																		if(widObj.Type == 'questAnswer'){	// If Widget is a QA Widget then ...
																			var QuestString = data.ViewportMobileSections.Widgets[loop].Data ? data.ViewportMobileSections.Widgets[loop].Data : "";
																			data.ViewportMobileSections.Widgets[loop].Data = __getStringAfterNameRuled (QuestString , OwnerGender , OwnerName);
																			
																			widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
																			var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
																			if( HiddenBoardId != 'SOMETHING__WRONG' ){
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
																		Desktop__allHiddenBoardId__index_Arr : Desktop__allHiddenBoardId__index_Arr,
																		Tablet__allHiddenBoardId__index_Arr : Tablet__allHiddenBoardId__index_Arr,
																		Mobile__allHiddenBoardId__index_Arr : Mobile__allHiddenBoardId__index_Arr,
																		margedArrOfAllQAPageIds : margedArrOfAllQAPageIds,
																		UNIQUE__allHiddenBoardId_Arr : UNIQUE__allHiddenBoardId_Arr
																	}
																	
																	//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
																	async.series({
																		createNewInstance__HiddenBoard : function(callback){
																			if( finalObj.UNIQUE__allHiddenBoardId_Arr.length ){
																				var conditions = {
																					_id : {$in : finalObj.UNIQUE__allHiddenBoardId_Arr}
																				}
																				var fields = {
																					Medias : false
																				}
																				Page.find(conditions , fields).lean().exec(function(err , results){
																					if(!err){
																						//console.log("-------------results------------",results);
																						var results = results ? results : [];
																						var returnCounter = 0;
																						var totalOps = results.length ? results.length : 0;
																						if(totalOps){
																							var oldPageId = null;
																							for( var loop = 0; loop < totalOps; loop++ ){
																								oldPageId = results[loop]._id;
																								var newInstanceData = results[loop];
																								newInstanceData.OriginatedFrom = oldPageId;
																								newInstanceData.Origin = 'published';
																								
																								////console.log("WTF-----------------------",oldPageId);
																								delete newInstanceData._id;
																								////console.log("WTF-----------------------",oldPageId);
																								
																								newInstanceData.CreatedOn = Date.now();
																								newInstanceData.UpdatedOn = Date.now();
																								////console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																								CreateNewInstance__HiddenBoardFunc ( oldPageId , newInstanceData , totalOps );
																							}
																							
																							function CreateNewInstance__HiddenBoardFunc ( sourcePageId , dataToSave , totalOps ) {
																								//AUTO NAME REPLACE FILTER
																								//var OwnerGender = UserData.Gender ? UserData.Gender : "male";
																								//var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
																								var OwnerGender = "male";
																								var OwnerName = "OWNER";
																								if(UserData.length){
																									//Non-Registered user case
																									OwnerGender = UserData[0].Gender ? UserData[0].Gender : "male";
																									OwnerName = UserData[0].Name ? UserData[0].Name.split(' ')[0] : "OWNER";
																								}else{
																									OwnerName = shareWithName ? shareWithName : 'OWNER';
																								}
																								
																								
																								var str = dataToSave.Title ? dataToSave.Title : "Untitled Page";
																								var resStr = str;
																								if( OwnerGender == 'male' ){
																									resStr = resStr.replace(/\bJack\b/g, OwnerName);
																									resStr = resStr.replace(/\bJill\b/g, OwnerName);
																									resStr = resStr.replace(/\bShe\b/g, "He");
																									resStr = resStr.replace(/\bshe\b/g, "he");
																									resStr = resStr.replace(/\bher\b/g, "his");
																									resStr = resStr.replace(/\bHer\b/g, "His");
																									resStr = resStr.replace(/\bherself\b/g, "himself");
																									resStr = resStr.replace(/\bHerself\b/g, "Himself");
																								}
																								else if( OwnerGender == 'female' ){
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
																								if(sourcePageId != "SOMETHING_WRONG"){
																									Page(dataToSave).save(function(err , result){
																										returnCounter++;
																										if(!err){
																											var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																											sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																										}
																										else{
																											//console.log("DB ERROR : ",err);
																											return callback(err);
																										}
																										
																										if( totalOps == returnCounter ){
																											callback(null , sourcePageId__DestinationPageId__Arr);
																										}
																									})
																								}
																								else{
																									return callback({error:"sourcePageId = SOMETHING_WRONG"});
																								}
																							}
																						}
																						else{
																							callback(null , sourcePageId__DestinationPageId__Arr);
																						}
																					}
																					else{
																						//console.log("DB ERROR : ",err);
																						return callback(err);
																					}
																				});
																			}
																			else{
																				callback(null , sourcePageId__DestinationPageId__Arr);
																			}
																		}
																	},
																	function(err, results) {
																		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
																		if(!err){
																			//console.log("*************************************** results**************",results);
																			var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
																			for( var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++  ){
																				var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
																				var SourcePageId = recordArr[0];
																				var NewPageId = recordArr[1];
																				//console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ",finalObj.margedArrOfAllQAPageIds );
																				//console.log("*************************************** SourcePageId**************NewPageId ",SourcePageId+"------------------"+NewPageId );
																				for( var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++ ){
																					var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
																					var SourcePageId_2 = recordArr2[0];
																					var WidgetIndex = recordArr2[1];
																					var Viewport = recordArr2[2];
																					if( SourcePageId_2 == SourcePageId ){
																						//console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2+" ====== "+ SourcePageId );
																						switch (Viewport){
																							case 'DESKTOP' : 
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'TABLET' : 
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																								
																							case 'MOBILE' : 
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																								break;
																						}
																					}
																				}
																			}
																		}
																		else{
																			//console.log("**************************************************DB ERROR :",err);
																		}
																		
																		//console.log("data = ",data);
																		Page(data).save(function( err , result ){
																			if(!err){
																				//console.log("----new page instance created..",result);
																			}
																			else{
																				//console.log(err);
																			}
																		});
																	});
																}
																else{
																	//console.log("data = ",data);
																	Page(data).save(function( err , result ){
																		if(!err){
																			//console.log("----new page instance created..",result);
																		}
																		else{
																			//console.log(err);
																		}
																	});
																}
															});
														}	
													}
													else{
														//console.log("095944564-----------");
													}
												});	
											}
											else{
												//console.log("0959345485-----------");
											}
										});
										
									});
								}
								
								//console.log("--------DONE------------");
								/*						
								var transporter = nodemailer.createTransport({
									service: 'Gmail',
									auth: {
										user: 'collabmedia.scrpt@gmail.com',
										pass: 'scrpt123_2014collabmedia#1909'
									}
								});	
								var to = shareWithEmail;
								
								var mailOptions = {
									from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
									to: to, // list of receivers
									subject: 'Scrpt - '+req.session.user.Name+' has published a capsule for you!',
									text: 'http://203.100.79.94:8888/#/login', 
									html: "Hi , <br/><br/> Scrpt - "+req.session.user.Name+" has published a capsule for you : '"+data.Title+"'. Login and check 'Published For You' section under your dashboard to access this capsule.<br/><br/>Sincerely,<br>The Scrpt team. "
								};

								transporter.sendMail(mailOptions, function(error, info){
									if(error){
										//console.log(error);
										//res.json(err);
									}else{
										//console.log('Message sent to: '+to + info.response);
										//res.json({'msg':'done','code':'200'});
									}
								});
								*/
								var condition = {};
                                condition.name = "Published__ForOthers"

                                EmailTemplate.find(condition, {}, function (err, results) {
                                    if (!err) {
                                        if (results.length) {
                                            
                                            var RecipientName = shareWithName ? shareWithName : '';
                                            User.find({'Email':shareWithEmail}, {'Name':true}, function (err, name) {
												if(name.length > 0){
												   var name = name[0].Name ? name[0].Name.split(' ') : [];
												   RecipientName = name[0];
												}
												
												var publisherNameArr = req.session.user.Name ? req.session.user.Name.split(' ') : [];
											    var PublisherName = publisherNameArr[0];
												
												var newHtml = results[0].description.replace(/{PublisherName}/g, PublisherName);
												newHtml = newHtml.replace(/{CapsuleName}/g, data.Title);
												newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
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
												results[0].subject = typeof(results[0].subject)=='string' ? results[0].subject : '';
												var subject = results[0].subject.replace(/{PublisherName}/g, PublisherName);
												subject = subject!='' ? subject : 'Scrpt - '+PublisherName+' has published a capsule for you!';
												
												var mailOptions = {
													//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
													from: process.EMAIL_ENGINE.info.senderLine,
													to: to, // list of receivers
													subject: subject,
													text: process.HOST_URL + '/#/login',
													html: newHtml
												};

												transporter.sendMail(mailOptions, function (error, info) {
													if (error) {
														//console.log(error);
													} else {
														//console.log('Message sent to: ' + to + info.response);
													}
												});
											})
                                        }
                                    }
                                })
							}
							else{
								//console.log("3875634876-----------");
							}
						});
					}
					else{
						//console.log("--------jhdsgfiu0959485-----------");
					}
				});	
			}
			else{
				//console.log("0959485-----------");
			}
		});
	}
	else{
		//console.log("09579-----------");
	}
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
var capsuleLaunchEngine = function (__capsuleId , MakingFor , req , res) {
	//console.log("------capsule----------LaunchEngine-------");	
	switch( MakingFor ){
		case "ME":
			chapterLaunchEngine(__capsuleId , MakingFor , req , res);
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
			var CapsulePrice = req.body.capsulePrice ? req.body.capsulePrice : null;

			order.OrderInitiatedFrom = OrderInitiatedFrom;
			order.CreatedById = OrderCreatedById;
			order.CreatedByEmail = OrderCreatedByEmail;
			order.TotalPayment = TotalPayment;
			order.TransactionState = 'Initiated';
			order.CartItems = [];

			var Owners = [];
			for(var i = 0; i < OrderOwners.length;i++){
				//console.log("LOOP = "+i);
				Owners[i] = {
					OwnerId:OrderOwners[i]._id,
					OwnerEmail:OrderOwners[i].UserEmail,
					UniqueIdPerOwner:UniqueIds[i]
				};
			}

			var totalPaymentPerCapsule = CapsulePrice*OrderOwners.length;
			order.CartItems.push(
				{
					CapsuleId:CapsuleId,
					TotalPayment:totalPaymentPerCapsule,
					Price:CapsulePrice,
					Owners:Owners
				}
			);
			//console.log("order.CartItems = "+order.CartItems);

			order.Status = true;
			order.UpdatedOn = Date.now();

			////console.log();
			Order(order).save(function( err , result ){
				if( !err ){
					var token = req.body.token;
					var email = req.body.tokenEmail
					stripe.customers.create({
						source: token,
						description: email
					}).then(function (customer) {
						try{
							return stripe.charges.create({
								amount: req.body.TotalPayment, // Amount in cents
								currency: "usd",
								customer: customer.id
							});
						}catch(e){
							var response = {
								status: 200,
								message: "Payement catch 1 successfully",
								error : e,
							}
							res.json(response);
						}

					}).then(function (charge) {
						orderInit.PGatewayResult = charge;
						if(charge.paid && charge.failure_code == null){
							orderInit.TransactionState = 'Completed';
							var message = "Payment completed successfully";
							var status = 200;
							
							var conditions = {
									_id : __capsuleId
							}
							var fields = {};
							Capsule.find(conditions , fields , function(err , results){
									if( !err ){
											if(results.length){
													var CapsuleData = results[0];
													//OthersData
													//console.log("CapsuleData.LaunchSettings == ",CapsuleData);
													var OtherUsers = CapsuleData.LaunchSettings.OthersData ? CapsuleData.LaunchSettings.OthersData : [];
													
													//coding error - need to fix
													if(!OtherUsers.length)
															var OtherUsers = CapsuleData.LaunchSettings.Invitees ? CapsuleData.LaunchSettings.Invitees : [];
													//coding error - need to fix

													if(OtherUsers.length){
															for( var loop = 0; loop < OtherUsers.length; loop++ ){
																	var owner = OtherUsers[loop];
																	var UniqueIdPerOwner = UniqueIds[loop] ? UniqueIds[loop] : null;
																	owner.UniqueIdPerOwner = UniqueIdPerOwner;
																	capsule__createNewInstance(CapsuleData , owner , req);
																	
															}
													}
													else{
															var response = {
																	status: 501,
																	message: "Something went wrong." 
															}
															//console.log("125-------------",response)
													}
													Capsule.update({_id:__capsuleId},{$set:{IsPublished:true , IsLaunched:true , "LaunchSettings.Audience":"OTHERS"}} , {multi:false}, function(err,numAffected){
															if(err){
																	var response = {
																			status: 501,
																			message: "Something went wrong." 
																	}
																	//console.log("123-------------",response)
															}else{
																	Chapter.update({CapsuleId:__capsuleId,Status:true,IsDeleted:false},{$set:{IsLaunched:true , "LaunchSettings.MakingFor":"OTHERS"}} , {multi:true}, function(err,numAffected){
																			if(!err){
																					var response = {
																							status: 200,
																							message: "Capsule has been published successfully.",
																							result : results
																					}
																					res.json(response);
																			}
																			else{
																					var response = {
																							status: 501,
																							message: "Something went wrong." 
																					}
																					//console.log("123000-------------",response)
																			}
																	})
															}
													});
											}
											else{
													var response = {
															status: 501,
															message: "Something went wrong." 
													}
													//console.log("126-------------",response)
											}
									}
									else{
											var response = {
													status: 501,
													message: "Something went wrong." 
											}
											//console.log("127-------------",response)
									}
							})	

						}else{
							orderInit.TransactionState = 'Failed';
							var message = charge.failure_message ? charge.failure_message : null;
							var status = charge.failure_code ? charge.failure_code : null;
						}

						//setTimeout(function(){ 
						Order.update({_id:new mongoose.Types.ObjectId(result._id)},{$set:orderInit},function( err , result ){
							if( !err ){
								var response = {
									status: status,
									message:message,
									result : result
								}
								//res.json(response);
								//console.log(response);
							}else{
								//console.log("11111111111111111111111111111----------------",err);
								var response = {
									status: status,
									message:message,
									result : err
								}
								//res.json(response);
								//console.log(response);
							}
						});
					});
				}else{
					//console.log("0000000000000000000000000000000000----------------",err);
				}
			});
			break;
			
		case "BUYERS":
			//console.log("---------------PUBLIC / BUYERS CASE-----------");
			chapterLaunchEngine__BUYERS(__capsuleId , MakingFor , req , res);
			break;
			
		case "SUBSCRIBERS":
			//console.log("---------------SUBSCRIBERS CASE-----------");
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			//console.log("128-------------",response)
			res.json(response)
			break;
			
		default:
		
	}

}

var chapterLaunchEngine = function (__capsuleId , MakingFor , req , res) {
	//console.log("------chapterLaunchEngine-------");	
	var conditions = {
		CapsuleId: __capsuleId,
		IsLaunched : 0,						//IsLaunched = true means the batch invitations have been sent.
		Status : 1,
		IsDeleted : 0
	};
	
	var fields = {};
	//console.log('===========================================');
	//console.log(conditions);
	//console.log('===========================================');
	
	Chapter.find(conditions, fields , function( err , results ){
		if( !err ){
			if( results.length ){
				for(var loop = 0; loop < results.length; loop++){
					var ChapterData = results[loop];
					
					//added on 24th JAN 2017 - Now Auto Name replace filter is available for all cases of publish
					MEcapsule__updatePageNamesAsPerFilterRule(ChapterData._id , req);
					
					//var MakingFor = ChapterData.LaunchSettings.MakingFor;
					var ShareMode = ChapterData.LaunchSettings.ShareMode;
					var __chapterId = ChapterData._id;
					
					if( ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group" ){
						ShareMode = "invite";
					}
					switch( ShareMode ){
						case  "invite": 
							//console.log("public / friend-solo / friend-group Case........");
							var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
							chapter__sendInvitations(ChapterData , invitees , req);
							Chapter.update({_id:__chapterId},{$set:{IsLaunched:true , "LaunchSettings.MakingFor":"ME",ModifiedOn:Date.now()}} , {multi:false}, function(err,numAffected){
								if(err){
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									//console.log("129-------------",response)
								}else{
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result : results
									}
									//console.log(response);
								}
							});
							break;
							
						case "private" : 
							//console.log("No need to do anything.. It's private area.");
							Chapter.update({_id:__chapterId},{$set:{IsLaunched:true , "LaunchSettings.MakingFor":"ME",ModifiedOn:Date.now()}} , {multi:false}, function(err,numAffected){
								if(err){
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									//console.log("130-------------",response)
								}else{
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result : results
									}
									//console.log(response);
								}
							});
							break;
							
						default : 
							//console.log("Error on ShareMode = ",ShareMode);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							//console.log("131-------------",response);
							//return;
					}
					
					//console.log("loop = "+loop+" ---results.length - 1 = "+results.length - 1);

					if( loop == results.length - 1 ){
						var setData = {};
						switch( MakingFor ){
							case "ME":
								setData = {
									IsPublished:true, 
									IsLaunched:true,
									ModifiedOn:Date.now()
								}
								break;
								
							case "OTHERS":
								setData = {
									IsPublished:true,
									ModifiedOn:Date.now()
								}
								break;
							
							case "BUYERS":
								setData = {
									IsPublished:true,
									ModifiedOn:Date.now()
								}
								break;
								
							case "SUBSCRIBERS":
								setData = {
									IsPublished:true,
									ModifiedOn:Date.now()
								}
								break;
								
							default:
							
								//console.log("ERROR--------------9798875765764564544654");
						}

						//console.log("setData = ",setData);
						Capsule.update({_id:__capsuleId},{$set:setData} , {multi:false}, function(err,numAffected){
							if( !err ){
								var response = {
									status: 200,
									message: "Capsule has been published successfully.",
									result : results
								}
								res.json(response);
							}
							else{
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								//console.log("133-------------",response);
							}
						});
					}
				}
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
			//console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}

var chapterLaunchEngine__BUYERS = function (__capsuleId , MakingFor , req , res) {
	//console.log("------chapterLaunchEngine-------");	
	var conditions = {
		CapsuleId: __capsuleId,
		IsLaunched : 0,						//IsLaunched = true means the batch invitations have been sent.
		Status : 1,
		IsDeleted : 0
	};
	
	var fields = {};
	//console.log('===========================================');
	//console.log(conditions);
	//console.log('===========================================');
	
	Chapter.find(conditions, fields , function( err , results ){
		if( !err ){
			if( results.length ){
				for(var loop = 0; loop < results.length; loop++){
					var ChapterData = results[loop];
					
					//added on 24th JAN 2017 - Now Auto Name replace filter is available for all cases of publish
					//MEcapsule__updatePageNamesAsPerFilterRule(ChapterData._id , req);
					
					//var MakingFor = ChapterData.LaunchSettings.MakingFor;
					var ShareMode = ChapterData.LaunchSettings.ShareMode;
					var __chapterId = ChapterData._id;
					
					if( ShareMode == "public" || ShareMode == "friend-solo" || ShareMode == "friend-group" ){
						ShareMode = "invite";
					}
					switch( ShareMode ){
						case "invite": 
							//console.log("public / friend-solo / friend-group Case........");
							ChapterData.LaunchSettings.Invitees = []; //for BUYERS CASE...Updated on 04 July 2017 by manishp
							var invitees = ChapterData.LaunchSettings.Invitees ? ChapterData.LaunchSettings.Invitees : [];
							chapter__sendInvitations(ChapterData , invitees , req);
							Chapter.update({_id:__chapterId},{$set:{IsLaunched:true , "LaunchSettings.MakingFor":"ME",ModifiedOn:Date.now()}} , {multi:false}, function(err,numAffected){
								if(err){
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									//console.log("129-------------",response)
								}else{
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result : results
									}
									//console.log(response);
								}
							});
							break;
							
						case "private" : 
							//console.log("No need to do anything.. It's private area.");
							Chapter.update({_id:__chapterId},{$set:{IsLaunched:true , "LaunchSettings.MakingFor":"ME",ModifiedOn:Date.now()}} , {multi:false}, function(err,numAffected){
								if(err){
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									//console.log("130-------------",response)
								}else{
									var response = {
										status: 200,
										message: "Chapter has been launched successfully.",
										result : results
									}
									//console.log(response);
								}
							});
							break;
							
						default : 
							//console.log("Error on ShareMode = ",ShareMode);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							//console.log("131-------------",response);
							//return;
					}
					
					//console.log("loop = "+loop+" ---results.length - 1 = "+results.length - 1);

					if( loop == results.length - 1 ){
						var setData = {};
						switch( MakingFor ){
							case "ME":
								setData = {
									IsPublished:true, 
									IsLaunched:true,
									ModifiedOn:Date.now()
								}
								break;
								
							case "OTHERS":
								setData = {
									IsPublished:true,
									ModifiedOn:Date.now()
								}
								break;
							
							case "BUYERS":
								setData = {
									IsPublished:true,
									IsLaunched:true,
									ModifiedOn:Date.now()
								}
								break;
								
							case "SUBSCRIBERS":
								setData = {
									IsPublished:true,
									ModifiedOn:Date.now()
								}
								break;
								
							default:
							
								//console.log("ERROR--------------9798875765764564544654");
						}

						//console.log("setData = ",setData);
						Capsule.update({_id:__capsuleId},{$set:setData} , {multi:false}, function(err,numAffected){
							if( !err ){
								var response = {
									status: 200,
									message: "Capsule has been published successfully.",
									result : results
								}
								res.json(response);
							}
							else{
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								//console.log("133-------------",response);
							}
						});
					}
				}
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
			//console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}

var publish = function(req,res){
	//console.log('getting here----------capsule publish api');
	
	var __capsuleId = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var participation = req.body.participation ? req.body.participation : 'private';
	var title = req.body.title ? req.body.title : "Untitled Capsule";
	
	var conditions = {};
	conditions._id = __capsuleId;
	
	var setData = {
		'LaunchSettings.Audience' : makingFor,
		'LaunchSettings.ShareMode' : participation, 
		'Title' : title
	};
	
	Capsule.update(conditions,{$set:setData},{multi:false},function(err,numAffected){
		if (!err) {
			switch( makingFor ){
				case "ME" : 
					//making it for	ME/myself - Launch associated chapters ie. send invitations and update the IsLaunched Key to true.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					break;
					
				case "OTHERS":
					//making it for	OTHERS - update the IsLaunched Key to false - Owner will Launch it later.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					break;
					
				case "BUYERS":
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					
					break;
				
				case "SUBSCRIBERS":
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					
					break;
					
				default :
					//console.log("------WRONG CASE FOUND ERROR : MakingFor-------");
					
			}
		}
		else{
		
		}
	});
}

var buy = function(req,res){
	//console.log('getting here----------capsule publish api');
	
	var __capsuleId = req.headers.capsule_id ? req.headers.capsule_id : '0';
	var makingFor = req.body.makingFor ? req.body.makingFor : 'ME';
	var participation = req.body.participation ? req.body.participation : 'private';
	var title = req.body.title ? req.body.title : "Untitled Capsule";
	
	var conditions = {};
	conditions._id = __capsuleId;
	
	var setData = {
		'LaunchSettings.Audience' : makingFor,
		'LaunchSettings.ShareMode' : participation, 
		'Title' : title
	};
	
	Capsule.update(conditions,{$set:setData},{multi:false},function(err,numAffected){
		if (!err) {
			switch( makingFor ){
				case "ME" : 
					//making it for	ME/myself - Launch associated chapters ie. send invitations and update the IsLaunched Key to true.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					break;
					
				case "OTHERS":
					//making it for	OTHERS - update the IsLaunched Key to false - Owner will Launch it later.
					//chapterLaunchEngine(__capsuleId , makingFor , req , res);
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					break;
					
				case "BUYERS":
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					
					break;
				
				case "SUBSCRIBERS":
					//making it for	SUBSCRIBERS - update the IsLaunched Key to false - Owner/subscibers will Launch it later.
					capsuleLaunchEngine(__capsuleId , makingFor , req , res);
					
					break;
					
				default :
					//console.log("------WRONG CASE FOUND ERROR : MakingFor-------");
					
			}
		}
		else{
		
		}
	});
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

var __getObjArrayIdxByKey = function (ObjArr , matchKey , matchVal){
	var idx;
	for( var loop = 0; loop < ObjArr.length; loop++ ){
		var data = ObjArr[loop];
		if (data.hasOwnProperty(matchKey)) {
			if(data[matchKey] == matchVal){
				idx = loop;
				break;
			}
		}
	}
	return idx;
}

var capsule__checkCompleteness = function ( req , res ){
	Capsule.find({_id : req.headers.capsule_id , Status : true, IsDeleted : false},{_id : true},function( err , result ){
		if( !err ){
			if( result.length ){
				var conditions = {
					CapsuleId : req.headers.capsule_id,
					Status : 1,
					IsDeleted : 0
				};
				
				var fields = {_id : true}; 
				Chapter.find(conditions , fields , function( err , results ){
					if( !err ){
						if( results.length ){
							var chapter_ids = [] , temp_cIds = [];
							for(var loop = 0; loop < results.length; loop++){
								chapter_ids.push(results[loop]._id);
								temp_cIds.push(String(results[loop]._id));
							}
							//console.log("chapter_ids = ", temp_cIds);
							if( chapter_ids.length ){
								var conditions = {
									ChapterId : { $in : temp_cIds },
									//Status : 1,
									IsDeleted : 0,
									PageType : {$in : ["gallery" , "content"]}
								};
								
								var fields = {
									_id : false, 
									ChapterId : true
								}; 
								
								
								Page.find(conditions , fields , function( err , result ){
									if( !err ){
										//var result = new Array(result);
										var resultArr = [];
										for( var loop = 0; loop < result.length; loop++ ){
											resultArr[loop] = {ChapterId : result[loop].ChapterId};
										}										
										
										//console.log(resultArr.length+ "---------- >= --------------" +chapter_ids.length);
										if( resultArr.length && resultArr.length >= chapter_ids.length){
											var flag = true;
											for( var loop = 0; loop < chapter_ids.length; loop++ ){
												var idx = __getObjArrayIdxByKey(resultArr , 'ChapterId' , chapter_ids[loop]);
												if(idx >= 0){
													continue;
												}
												else{
													flag = false;
													break;
												}
											}
											
											if( flag ){
												var response = {
													status: 200,
													message: "Capsule is complete to publish."
												}
												res.json(response);
											}
											else{
												//console.log("--------------------------------------4");
												var response = {
													status: 400,
													message: "Error : You can not publish an incomplete capsule. It seems like you have atleast one chapter without page. Go back and add atleast a page into that empty chapter or simply delete that and try publishing it again." 
												}
												res.json(response);
											}
										}
										else{
											//console.log("--------------------------------------3");
											var response = {
												status: 400,
												message: "Error : You can not publish an incomplete capsule. It seems like you have atleast one chapter without page. Go back and add atleast a page into that empty chapter or simply delete that and try publishing it again." 
											}
											res.json(response);
										}
									}
									else{
										var response = {
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response);
									}
								})
							}
							else{
								//console.log("--------------------------------------2");
								var response = {
									status: 400,
									message: "Error : You can not publish an incomplete capsule. It seems like you have no chapter under this capsule. Go back and add atleast a chapter and a page under this capsule and try publishing it again." 
								}
								res.json(response);
							}
						}
						else{
							//console.log("--------------------------------------1");
							var response = {
								status: 400,
								message: "Error : You can not publish an incomplete capsule. It seems like you have no chapter under this capsule. Go back and add atleast a chapter and a page under this capsule and try publishing it again." 
							}
							res.json(response);
						}
					}
					else{
						//console.log(err);
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
			//console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

//Jack / Jill replacement. 
var MEcapsule__updatePageNamesAsPerFilterRule = function( __chapterId , req ){
	
	var __chapterId = __chapterId ? __chapterId : "undefined";
	////console.log("owner = ",owner);
	
	//check if the owner is register or not
	var UserData = req.session.user ? req.session.user : {};
	if( UserData.Email ){
		//pages under chapters
		var conditions = {
			ChapterId : __chapterId, 
			OwnerId : UserData._id,
			IsDeleted : 0,
			PageType : {$in : ["gallery" , "content" , "qaw-gallery"]}
		};
		var sortObj = {
			Order : 1,
			UpdatedOn : -1
		};
		var fields = {
			_id : true,
			PageType : true,
			Title : true,
			ViewportDesktopSections : true,
			ViewportTabletSections : true,
			ViewportMobileSections : true
		}; 
		
		Page.find(conditions , fields).sort(sortObj).exec(function( err , results ){
			if( !err ){
				var fields = {
					_id : true,
					Title : true,
					PageType : true,
					ViewportDesktopSections : true,
					ViewportTabletSections : true,
					ViewportMobileSections : true
					
				}; 
				for( var loop = 0; loop < results.length; loop++ ){
					var conditions = {};
					conditions._id = results[loop]._id;
					var PageType = results[loop].PageType;
					
					var data = {};
					data.Title = results[loop].Title;
					
					//AUTO NAME REPLACE FILTER
					if(PageType == "gallery" || PageType == "qaw-gallery"){
						var OwnerGender = UserData.Gender ? UserData.Gender : "male";
						var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
						var str = data.Title;
						var res = str;
						if( OwnerGender == 'male' ){
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bShe\b/g, "He");
							res = res.replace(/\bshe\b/g, "he");
							res = res.replace(/\bher\b/g, "his");
							res = res.replace(/\bHer\b/g, "His");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						else if( OwnerGender == 'female' ){
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
					else if(PageType == "content"){
						var OwnerGender = UserData.Gender ? UserData.Gender : "male";
						var OwnerName = UserData.Name ? UserData.Name.split(' ')[0] : "OWNER";
						var str = data.Title;
						var res = str;
						if( OwnerGender == 'male' ){
							res = res.replace(/\bJack\b/g, OwnerName);
							res = res.replace(/\bJill\b/g, OwnerName);
							res = res.replace(/\bShe\b/g, "He");
							res = res.replace(/\bshe\b/g, "he");
							res = res.replace(/\bher\b/g, "his");
							res = res.replace(/\bHer\b/g, "His");
							res = res.replace(/\bherself\b/g, "himself");
							res = res.replace(/\bHerself\b/g, "Himself");
						}
						else if( OwnerGender == 'female' ){
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
						for(var loop1 = 0; loop1 < ViewportDesktopSections.Widgets.length; loop1++){
							if(ViewportDesktopSections.Widgets[loop1].Type == "questAnswer"){
								var str = data.ViewportDesktopSections.Widgets[loop1].Data ? data.ViewportDesktopSections.Widgets[loop1].Data : "";
								var res = str;
								if( OwnerGender == 'male' ){
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if( OwnerGender == 'female' ){
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
						for(var loop1 = 0; loop1 < ViewportTabletSections.Widgets.length; loop1++){
							if(ViewportTabletSections.Widgets[loop1].Type == "questAnswer"){
								var str = data.ViewportTabletSections.Widgets[loop1].Data ? data.ViewportTabletSections.Widgets[loop1].Data : "";
								var res = str;
								if( OwnerGender == 'male' ){
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if( OwnerGender == 'female' ){
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
						for(var loop1 = 0; loop1 < ViewportMobileSections.Widgets.length; loop1++){
							if(ViewportMobileSections.Widgets[loop1].Type == "questAnswer"){
								var str = data.ViewportMobileSections.Widgets[loop1].Data ? data.ViewportMobileSections.Widgets[loop1].Data : "";
								var res = str;
								if( OwnerGender == 'male' ){
									res = res.replace(/\bJack\b/g, OwnerName);
									res = res.replace(/\bJill\b/g, OwnerName);
									res = res.replace(/\bShe\b/g, "He");
									res = res.replace(/\bshe\b/g, "he");
									res = res.replace(/\bher\b/g, "his");
									res = res.replace(/\bHer\b/g, "His");
									res = res.replace(/\bherself\b/g, "himself");
									res = res.replace(/\bHerself\b/g, "Himself");
								}
								else if( OwnerGender == 'female' ){
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
					else{
						//no case
					}
					
					Page.update(conditions , {$set:data}, function( err , result ){
						if(!err){
							//console.log("WE HAVE DONE SOME CHANGES...",result);
						}
						else{
							//console.log("ERROR---------------",err);
						}
					});
				}	
			}
			else{
				//console.log("095944564-----------",err);
			}
		});
	}
	else{
		//console.log("09579-----------",UserData);
	}
}


function __getStringAfterNameRuled (str , OwnerGender , OwnerName){
	var res = str;
	if( OwnerGender == 'male' ){
		res = res.replace(/\bJack\b/g, OwnerName);
		res = res.replace(/\bJill\b/g, OwnerName);
		res = res.replace(/\bShe\b/g, "He");
		res = res.replace(/\bshe\b/g, "he");
		res = res.replace(/\bher\b/g, "his");
		res = res.replace(/\bHer\b/g, "His");
		res = res.replace(/\bherself\b/g, "himself");
		res = res.replace(/\bHerself\b/g, "Himself");
	}
	else if( OwnerGender == 'female' ){
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

//Capsules Order from Public Gallery Apis
exports.publish = publish;
exports.capsule__checkCompleteness = capsule__checkCompleteness;
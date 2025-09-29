var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/capsuleModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');


var createNewInstance = function(ID , USERID, CASE){
	switch ( CASE ){
		case 'capsule' : 
			createCapsuleInstance(ID , USERID);
			
			break;
		case 'chapter' :
			createChapterInstance(ID , USERID);
			
			break;
		case 'page' : 
			createPageInstance(ID , USERID);
			
			break;
		default : 
			res.json({status:501 , message : "something went wrong."});
	}
}

var createCapsuleInstance = function ( capsuleId , sessionUserId ){
	var conditions = {};
	var fields = {
		Title : 1,
		CoverArt : 1
	};
	
	conditions._id = req.headers.capsule_id;
	
	Capsule.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var data = {};
			data.Origin = "duplicated";
			data.OriginatedFrom = conditions._id;
			
			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			
			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			
			console.log("data = ",data);
			Capsule(data).save(function( err , result ){
				if( !err ){
					console.log("==========CAPSULE INSTANCE : SUCCESS==================", result);
					
					//chapters under capsule
					var conditions = {
						CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0, 
						OwnerId : req.session.user._id,
						IsDeleted : false
					};
					var sortObj = {
						Order : 1,
						ModifiedOn : -1
					};
					var fields = {
						_id : true
					}; 
					
					var newCapsuleId = result._id;
					console.log("&&&&&&&&&&&&&&&conditions = ",conditions);
					//Chapter.find(conditions , fields).sort(sortObj).exec(function( err , results ){
					Chapter.find(conditions , fields , function( err , results ){
						if(!err){
							console.log("==========CAPSULE INSTANCE : CHAPTERS COUNT ==================",results);
							for( var loop = 0; loop < results.length; loop++ ){
								var conditions = {};
								var fields = {
									Title : true,
									CoverArt : true,
									CapsuleId : true,
									Order : true
								};
								
								conditions._id = results[loop]._id;
								
								Chapter.findOne(conditions , fields , function( err , result ){
									if( !err ){
										var data = {};
										data.Origin = "duplicated";
										data.OriginatedFrom = conditions._id;
										
										data.CreaterId = req.session.user._id;
										data.OwnerId = req.session.user._id;
										data.Title = result.Title;
										data.CoverArt = result.CoverArt;
										data.CapsuleId = newCapsuleId;
										data.Order = result.Order;
										
										var nowDate = Date.now();
										data.CreatedOn = nowDate;
										data.ModifiedOn = nowDate;
										
										console.log("Chapter under loop%%%%%%%%%%%%%%%%%%%%%%%%%%%%%data = ",data);
										var oldChapterId = result._id;
										//var Chapter = new Chapter(data);
										Chapter(data).save(function( err , result ){
										//Chapter.save(function( err , result ){
											if( !err ){
												console.log("new chapter saved ------",result);
												//pages under chapters duplication will be implemented later
												var conditions = {
													ChapterId : oldChapterId, 
													OwnerId : req.session.user._id,
													IsDeleted : false
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
														console.log("@@@@@@@@@@@PAGE COUNT = ",results.length);
														var fields = {
															_id : true,
															Title : true,
															PageType : true,
															Order : true,
															HeaderImage : true,
															BackgroundMusic : true
														}; 
														for( var loop = 0; loop < results.length; loop++ ){
															var conditions = {};
															conditions._id = results[loop]._id;
															Page.findOne(conditions , fields, function( err , result ){
																//delete result._id;
																var data = {};
																data.CreaterId = req.session.user._id;
																data.OwnerId = req.session.user._id;
																data.ChapterId = newChapterId;
																data.Title = result.Title;
																data.PageType = result.PageType;
																data.Order = result.Order;
																data.HeaderImage = result.HeaderImage?result.HeaderImage:"";
																data.BackgroundMusic = result.BackgroundMusic?result.BackgroundMusic:"";
																
																data.CreatedOn = nowDate;
																data.UpdatedOn = nowDate;
																
																console.log("-------",result);
																Page(data).save(function( err , result ){
																	if(!err){
																		console.log("----new page instance created..",result);
																	}
																	else{
																		console.log(err);
																	}
																});
															});
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
											status: 501,
											message: "Something went wrong." 
										}
										res.json(response);
									}
								})
								
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
					/*
					var response = {
						status: 20000,
						message: "Capsule duplicated successfully.00000000",
						result : result				
					}
					res.json(response);
					*/
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
			var response = {
				status: 20000,
				message: "Capsule duplicated successfully.",
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
	})
	
	
};

var createChapterInstance = function ( chapterId , sessionUserId ){
	
};

var createPageInstance = function ( pageId , sessionUserId){

};


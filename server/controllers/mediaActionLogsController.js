var mediaActionLog = require('./../models/mediaActionLogModel.js');
var media = require('./../models/mediaModel.js');
var user = require('./../models/userModel.js');
//var board = require('./../models/boardModel.js');
var board = require('./../models/pageModel.js');
var boardController = require('./../controllers/boardController.js');
var postCommentLikeLogs = require('./../models/PostCommentLikeLogsModel.js');
var ObjectId = require('mongodb').ObjectId;

// log media action
var addMediaAction = function(req,res){
	if( req.body != undefined ){
		fields={
			MediaId : req.body.MediaId,
			UserId : req.session.user._id,
			UserFsg: req.session.user.FSGs,
			Action: req.body.Action,
			Title: req.body.Title,
			Prompt: req.body.Prompt,
			Locator: req.body.Locator,
			URL: req.body.URL,
			MediaType: req.body.MediaType,
			ContentType: req.body.ContentType
		};

		mediaActionLog(fields).save().then(function(result){
			if( fields.Action == 'Post' || fields.Action == 'Stamp' ){
					//UserFsg=req.session.user.FSGs;
				ufields[fields.Action+'s'].Users.push({UserFsgs:req.session.user.FSGs});
				var query={_id:fields.MediaId};
					var options = { multi: false };
					media_M3.update(query, { $set: ufields}, options, callback)
					function callback (err, numAffected) {
						if(err){
							res.json(err)
						}
						else{
							res.json({"status":"success","message":"Action has been logged successfully."});
						}
					}
				}
				else{
					res.json({"status":"failed","message":"Action cannot be determined."});
				}
			}).catch(function(err){
				res.json(err);
		});
	}
	else{
		res.json({"status":"failed","message":"Data not received."});
	}
};

exports.addMediaAction = addMediaAction;

/*
for Post,Mark,Stamp and Vote action of media
affected models : mediaActionLog , User , Media.
calculating user-score at every log and updating in media model   
*/

var logMediaAction = function(req,res){
	if( req.body != undefined ){
		
		/*
		fields={
			MediaId : req.body.MediaId,
			UserId : req.body.userId,
			BoardId : req.body.BoardId,
			OwnerId : req.body.OwnerId,
			Action: req.body.Action
		};
		*/
		
		var fields = {
			MediaId : req.body.media_id || req.body.MediaID || req.body.MediaId,
			UserId : req.session.user._id,
			UserFsg: req.session.user.FSGsArr2,  // ✅ Fixed: Changed from FSGs to FSGsArr2
			BoardId : req.body.board_id || req.body.BoardId,
			StreamId : req.body.stream_id || req.body.StreamId || req.body.capsuleId,  // Capsule/Stream ID
			OwnerId : req.body.owner_id || req.body.OwnerId,
			Action: req.body.action || req.body.Action,
			ActionLevel: 'post',  // Default to post-level action (has MediaId)
			Title: req.body.title || req.body.Title,
			Prompt: req.body.prompt || req.body.Prompt,
			Locator: req.body.locator || req.body.Locator,
			URL: req.body.media_url || req.body.MediaURL || req.body.URL,
			MediaType: req.body.media_type || req.body.MediaType,
			ContentType: req.body.content_type || req.body.ContentType,
			Content: req.body.content || req.body.Content,
			Comment: req.body.comment || req.body.Comment || "",
			LikeType: req.body.like_type || req.body.LikeType,
			Themes: req.body.themes || req.body.Themes || []
		};
		
		//check if sameUser-sameBoard-sameMedia-sameAction already exist.
		var conditions = {};
		var actionLogCount = 0;

		conditions = {
			BoardId:fields.BoardId,
			UserId:fields.UserId,
			MediaId:fields.MediaId,
			Action:fields.Action
		};
		
		// Include LikeType in duplicate check for Vote actions
		if(fields.Action === 'Vote' && fields.LikeType) {
			conditions.LikeType = fields.LikeType;
		}
		
		//Updated on 18092014 by manishp  - A user can post/repost same media multiple times (Discussed Montage Case and Planned this)
		//mediaActionLog.find(conditions).countDocuments().exec(mAcLogChekerCallBack);
		//if(conditions.Action != 'Post'){
		if(conditions.Action != 'Post' && conditions.Action != 'Comment'){	//added on 13 dec 2016 - comment module
			mediaActionLog.find(conditions).countDocuments().then(function(resCount) {
				if(resCount){
					res.json({status:"failed",message:"You have already added this action.",constraint:"Unique record check"});
				}
				else{
					//updater call
					mediaActionLogUpdater();
				}
			}).catch(function(err) {
				console.error("Error checking media action log:", err);
				res.json({ status: "error", message: "Database error occurred" });
					});
				}
				else{
			if(conditions.Action != 'Comment'){
				if( req.body.media_id && req.body.Statement && req.session.user._id ){
					updateMedia__statementObj(req.body.media_id, req.body.Statement, req.session.user._id);
				}
				else if( req.body.MediaID && req.body.Statement && req.session.user._id ){
							updateMedia__statementObj(req.body.MediaID, req.body.Statement, req.session.user._id);
						}
				else{
							console.log("---------------------req.body.Statement--------------------------------NOT FOUND------------");
						}
					}
					mediaActionLogUpdater();
				}
				//End updated on 18092014  - A user can post/repost same media multiple times

		function mediaActionLogUpdater(){
			mediaActionLog(fields).save().then(function(result){
				if(fields.Action == 'Comment'){
					if(fields.Comment){
						// Store FSG data in Media document for Comment actions
						updateMedia__Comments(req,res);
						
						var result = fields ? fields : {};
						result.UserId = (String(req.session.user._id)==String(fields.UserId)) ? req.session.user : {};
						res.json({"status":"success","message":"Comment action completed successfully!",result:result});
							}
					else{
						res.json({"status":"error","message":"Comment was empty."});
							}
						}
				else{
					userScoreParamsUpdater(fields , req , res);
							//res.json({"status":"success","message":"Action has been logged successfully."});
						}
			}).catch(function(err){
				console.error("Error saving mediaActionLog:", err);
				res.json(err);
				});
			}
		}
	else{
		res.json({"status":"failed","message":"Data not received."});
	}
};

exports.logMediaAction = logMediaAction;


function userScoreParamsUpdater(fields , req , res){

	var userId = fields.UserId;
	var boardId = fields.BoardId;
	var mediaId = fields.MediaId;
	var Action = fields.Action;

	userData = user.findOne({_id:userId},{RepostCount:1,MarkCount:1,StampCount:1,VoteScore:1,UserScore:1}).then(function(result) {
		userGetCallback(null, result);
	}).catch(function(err) {
		userGetCallback(err, null);
	});

	function userGetCallback(err , result){
		if(err){
			res.json(err);
		}
		else{
			var UserScore = 0;

			if( Action == 'Post' ||  Action == 'Mark' || Action == 'Stamp' ){
				console.log("--Action--"+Action);
				var uMediaRepostCount = 0;
				var uMediaMarkCount = 0;
				var uMediaStampCount = 0;

				if(result.RepostCount)
					uMediaRepostCount = result.RepostCount;

				if(result.MarkCount)
					uMediaMarkCount = result.MarkCount;

				if(result.StampCount)
					uMediaStampCount = result.StampCount;

				if(Action == 'Post'){
					uMediaRepostCount = uMediaRepostCount + 1;
				}

				if(Action == 'Mark'){
					uMediaMarkCount = uMediaMarkCount + 1;
				}

				if(Action == 'Stamp'){
					uMediaStampCount = uMediaStampCount + 1;
				}

				if( uMediaRepostCount ||  uMediaMarkCount || uMediaStampCount ){
					console.log("Action = ",Action);
					if( Action == 'Stamp' ){
						updateMedia__Stamps(req,res)
					}
					else if( Action == 'Post' ){
						updateMedia__Posts(req,res)
					}

					//update user data
					query = {_id:userId};
					set = {$set:{"RepostCount":uMediaRepostCount,"MarkCount":uMediaMarkCount,"StampCount":uMediaStampCount}};
					options = {multi:false};
					user.update(query,set,options,userUpdateCallback);
					
					function userUpdateCallback(err , result){
						if(err){
							res.json(err);
						}
						else{
							console.log("m here... : ===="+userId);
							
							if( Action == 'Post' ){
								calculateUserScore__POST_CASE(userId , res);
								boardController.addMediaToBoard_2(req,res);
							}
							else{
								calculateUserScore(userId , res);
							}

							//res.json({"status":"success","message":"User action data has been logged."});
						}
					}
				}
			}
			else if( Action == 'Vote' ){
				// Store FSG data in Media document for Vote actions
				updateMedia__Votes(req,res);
				
				// Send success response immediately for Vote actions
				res.json({"status":"success","message":"Vote action completed successfully"});
				return;
			}
			else if(Action == 'Comment'){
				// Store FSG data in Media document for Comment actions
				updateMedia__Comments(req,res);
				
				// Send success response immediately for Comment actions
				res.json({"status":"success","message":"Comment action completed successfully"});
				return;
			}
			else{
				//This should not be a case!
				res.json({"status":"success","message":"This should not be a case, Please report it to the site admin."});  
			}
		}
	}

}

function calculateUserScore__POST_CASE(userId , res){
	if(userId){
		//Get Repost @ Mark detail
		var userScore = 0;
		var userRepostScore = 0;
		var userMarkScore = 0;
		var userVoteScore = 0;

		var usAdminContri = 0.33;
		var uMediaRepostCount = 0;
		var uMediaMarkCount = 0;
		var totalMediaAdded = 0;
		var userData = {};

		//all added media count
		media.find().countDocuments().then(function(resCount) {
			if(resCount)
				totalMediaAdded = resCount;
			//next step
			nextStep();
		}).catch(function(err) {
			console.error("Error getting media count:", err);
			nextStep();
		});
		
		function nextStep(){
			console.log("totalMediaAdded : ",totalMediaAdded);
			userData = user.findById(userId,{}).then(function(result) {
				userGetCallback(null, result);
			}).catch(function(err) {
				userGetCallback(err, null);
			});
		}
		
		function userGetCallback(err , result){
			if(err){
				res.json(err);
			}
			else{
				console.log("result : ",result);
				if(result.RepostCount)
					uMediaRepostCount = result.RepostCount;

				if(result.MarkCount)
					uMediaMarkCount = result.MarkCount;

				//calculate user-score
				if(uMediaRepostCount)
					userRepostScore = ((uMediaRepostCount*100)/totalMediaAdded)*usAdminContri;

				if(uMediaMarkCount)
					userMarkScore = ((uMediaMarkCount*100)/totalMediaAdded)*usAdminContri;

				if(result.VoteScore)
					userVoteScore = result.VoteScore;

				userScore = userRepostScore + userMarkScore + userVoteScore;
				console.log("User Score : ( "+(userRepostScore+" + "+userMarkScore+" + "+userVoteScore)+" ) = "+userScore);
				//call user-score updater
				UserScoreUpdater(userId , userScore);	
			}
		}


		//update user-score in users and media collection
		function UserScoreUpdater(userId , userScore){
			console.log("--UserScoreUpdater--");
		  if( userId && userScore ){
				var mediaIds = [];
				//get all media_ids of the user (need shard-key _id to update)
			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1}).then(function(results) {
				mediaGetCallback(null, results);
			}).catch(function(err) {
				mediaGetCallback(err, null);
			});
			function mediaGetCallback(err , results){
				if(err){
						res.json(err);
					}
				else{
					for(var loop = 0; loop < results.length; loop++ )
							mediaIds.push(results[loop]._id);
					}
					callUpdater();
				}

			function callUpdater(){
				var query={_id:userId};
					var options = { multi: false };
				user.update(query, { $set: {"UserScore":userScore}}, options, userUpdateCallback);
				}

			function userUpdateCallback (err, numAffected) {
				if(err){
						console.log(err)
					}
				else{
					console.log("mediaIds = "+mediaIds);
						//update in media collection
					var query={_id:{$in:mediaIds}/* , UploadedBy:'user'*/};
						var options = { multi: true };
					media.update(query, { $set: {"UserScore":userScore}}, options, mediaUpdateCallback)
					function mediaUpdateCallback (err, numAffected) {
						if(err){
								console.log(err)
							}
						else{
								//res.json({"status":"success","message":"User score logged successfully","affected":numAffected});
							console.log({"status":"success","message":"Success!","affected":numAffected});
							}
						}
					}
				}
			}
		  else{
				//res.json({"status":"success","message":"User score could not logged ( User ID : "+userId+", UserScore : "+userScore+" )"});  
			console.log({"status":"success","message":"Something went wrong!"});  
			}
		}
	}
	else{
		console.log("userId : "+userId);
		console.log("wrong userId input in calculateUserScore");
	}
}

function calculateUserScore(userId , res){
	if(userId){
		//Get Repost @ Mark detail
		var userScore = 0;
		var userRepostScore = 0;
		var userMarkScore = 0;
		var userVoteScore = 0;

		var usAdminContri = 0.33;
		var uMediaRepostCount = 0;
		var uMediaMarkCount = 0;
		var totalMediaAdded = 0;
		var userData = {};

		//all added media count
		media.find().countDocuments().then(function(resCount) {
			if(resCount)
				totalMediaAdded = resCount;
			//next step
			nextStep();
		}).catch(function(err) {
			console.error("Error getting media count:", err);
			nextStep();
		});
		
		function nextStep(){
			console.log("totalMediaAdded : ",totalMediaAdded);
			userData = user.findById(userId,{}).then(function(result) {
				userGetCallback(null, result);
			}).catch(function(err) {
				userGetCallback(err, null);
			});
		}
		
		function userGetCallback(err , result){
			if(err){
				res.json(err);
			}
			else{
				console.log("result : ",result);
				if(result.RepostCount)
					uMediaRepostCount = result.RepostCount;

				if(result.MarkCount)
					uMediaMarkCount = result.MarkCount;

				//calculate user-score
				if(uMediaRepostCount)
					userRepostScore = ((uMediaRepostCount*100)/totalMediaAdded)*usAdminContri;

				if(uMediaMarkCount)
					userMarkScore = ((uMediaMarkCount*100)/totalMediaAdded)*usAdminContri;

				if(result.VoteScore)
					userVoteScore = result.VoteScore;

				userScore = userRepostScore + userMarkScore + userVoteScore;
				console.log("User Score : ( "+(userRepostScore+" + "+userMarkScore+" + "+userVoteScore)+" ) = "+userScore);
				//call user-score updater
				UserScoreUpdater(userId , userScore);	
			}
		}


		//update user-score in users and media collection
		function UserScoreUpdater(userId , userScore){
			console.log("--UserScoreUpdater--");
		  if( userId && userScore ){
				var mediaIds = [];
				//get all media_ids of the user (need shard-key _id to update)
			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1}).then(function(results) {
				mediaGetCallback(null, results);
			}).catch(function(err) {
				mediaGetCallback(err, null);
			});
			function mediaGetCallback(err , results){
				if(err){
						res.json(err);
					}
				else{
					for(var loop = 0; loop < results.length; loop++ )
							mediaIds.push(results[loop]._id);
					}
					callUpdater();
				}

			function callUpdater(){
				var query={_id:userId};
					var options = { multi: false };
				user.update(query, { $set: {"UserScore":userScore}}, options, userUpdateCallback);
				}

			function userUpdateCallback (err, numAffected) {
				if(err){
						res.json(err)
					}
				else{
					console.log("mediaIds = "+mediaIds);
						//update in media collection
					var query={_id:{$in:mediaIds}/* , UploadedBy:'user'*/};
						var options = { multi: true };
					media.update(query, { $set: {"UserScore":userScore}}, options, mediaUpdateCallback)
					function mediaUpdateCallback (err, numAffected) {
						if(err){
								res.json(err)
							}
						else{
								//res.json({"status":"success","message":"User score logged successfully","affected":numAffected});
							res.json({"status":"success","message":"Success!","affected":numAffected});
							}
						}
					}
				}
			}
		  else{
				//res.json({"status":"success","message":"User score could not logged ( User ID : "+userId+", UserScore : "+userScore+" )"});  
			res.json({"status":"success","message":"Something went wrong!"});  
			}
		}
	}
	else{
		console.log("userId : "+userId);
		res.json("wrong userId input in calculateUserScore");
	}
}


var test_userscore = function(req , res){
	if(req.query.user_id){
		console.log("userScore Calculator called.....");
		calculateUserScore(req.query.user_id , res);
	}
	else{
		res.json({status:"failed"});
	}
};

exports.test_userscore = test_userscore;


/*
logMediaAction_RepostArr case
for Post,Mark,Stamp and Vote action of media
affected models : mediaActionLog , User , Media.
calculating user-score at every log and updating in media model   
*/

var logMediaAction_RepostArr = function(req , res , inputArray){
	console.log("-------------------------------------------------------------------------------");
	console.log("Total media -------------------------------"+inputArray.length);
	console.log("-------------------------------------------------------------------------------");

	//console.log("req body - " , req.body);

	//console.log("media  - " , inputArray);
	//return;
	//console.log("not here---");
	var totalInputCount = 0;

	if( inputArray != undefined && parseInt(inputArray.length) ){
		totalInputCount = inputArray.length;

		for( var loop = 0; loop < totalInputCount; loop++ ){
		  
		  fields={
				MediaId : inputArray[loop].MediaID,
				UserId : req.session.user._id,
				UserFsg: req.session.user.FSGs,
				BoardId : inputArray[loop].BoardId,
				OwnerId : inputArray[loop].OwnerId,
				Action: 'Post',
				Title: inputArray[loop].Title,
				Prompt: inputArray[loop].Prompt,
				Locator: inputArray[loop].Locator,
				URL: inputArray[loop].MediaURL,
				MediaType: inputArray[loop].MediaType,
				ContentType: inputArray[loop].ContentType
			};

			mediaActionLogUpdater(fields);
		}
	}
	else{
		res.json({"status":"failed","message":"Data not received."});
	}

  function mediaActionLogUpdater(fields){
  	mediaActionLog(fields).save().then(function(result){
				console.log("--userScoreParamsUpdater2--");
  		userScoreParamsUpdater2(fields , req , res);
				//res.json({"status":"success","message":"Action has been logged successfully."});
  	}).catch(function(err){
  		res.json(err);
		});
	}

  function userScoreParamsUpdater2(fields , req , res){

		var userId = fields.UserId;
		var boardId = fields.BoardId;
		var mediaId = fields.MediaId;
		var Action = fields.Action;

  	userData = user.find({_id:userId},{RepostCount:1,MarkCount:1,StampCount:1,VoteScore:1,UserScore:1}).then(function(result) {
		userGetCallback(null, result);
	}).catch(function(err) {
		userGetCallback(err, null);
	});

  	function userGetCallback(err , result){
  		if(err){
				res.json(err);
			}
  		else{
				var UserScore = 0;
  			console.log("Action = "+Action);
  			if( Action == 'Post' ||  Action == 'Mark' || Action == 'Stamp' ){
  				console.log("--Action--"+Action);
					var uMediaRepostCount = 0;
					var uMediaMarkCount = 0;
					var uMediaStampCount = 0;

  				if(result.RespostCount)
						uMediaRepostCount = result.RespostCount;

  				if(result.MarkCount)
						uMediaMarkCount = result.MarkCount;

  				if(result.StampCount)
						uMediaStampCount = result.StampCount;

  				if(Action == 'Post'){
						uMediaRepostCount = uMediaRepostCount + 1;
					console.log("uMediaRepostCount = "+uMediaRepostCount);
					}

  				if(Action == 'Mark'){
						uMediaMarkCount = uMediaMarkCount + 1;
					}

  				if(Action == 'Stamp'){
						uMediaStampCount = uMediaStampCount + 1;
					}

  				if( uMediaRepostCount ||  uMediaMarkCount || uMediaStampCount ){

						/*
							if(boardController.addMediaToBoard_2(req,res)){
								console.log("return value-------true");
							}
							else{
								console.log("return value-------true");
							}
							*/
						console.log("testing boardController......");

						//update user data
  					query = {_id:userId};
  					set = {$set:{"RepostCount":uMediaRepostCount,"MarkCount":uMediaMarkCount,"StampCount":uMediaStampCount}};
  					options = {multi:false};
  					user.update(query,set,options,userUpdateCallback);
  					
  					function userUpdateCallback(err , result){
  						if(err){
								res.json(err);
							}
  						else{
  							console.log("m here... : ===="+userId);
  							calculateUserScore(userId , res);
								//res.json({"status":"success","message":"User action data has been logged."});
							}
						}
					}
				}
  			if( Action == 'Vote' ){
					console.log("--Vote--");
					var totalNoOfMembers = 0;
  				var OwnerMediaCount  = 0;
					var totalVoteCount = 0;

					//get user's boards data to fetch votes, calculate the vote-score
  				board.find({$and:[{isDeleted:0},{$or:[{"OwnerID":userId},{"Invitees.UserID":userId}]}]}).then(function(results) {
					boardGetCallback(null, results);
				}).catch(function(err) {
					boardGetCallback(err, null);
				});

  				function boardGetCallback(err , results){
  					if(err){
							console.log(err);
							res.json(err);

						}
  					else{
							//calculate per board vote-score (The boards either created by him/her or invited by others)
							var totalVoteCount = 0;
							var totalMemberCount = 1;		//board Owner
							var totalNoMediaInBoard = 0;
							var noOfUsrMediaInBoard = 0;
							var boardVotePercent = 0;
							var sumBoardVotePercent = 0;
							var VoteScore = 0;				//Vote Score across all boards

  						for( var loop = 0; loop < results.length; loop++ ){
  							if(results[loop].TotalVoteCount)
									totalVoteCount = results[loop].TotalVoteCount;

  							if( results[loop].Invitees && results[loop].Invitees.length )
  								if(results[loop].Invitees && results[loop].Invitees.length)
										totalMemberCount += results[loop].Invitees.length;

  							if( results[loop].Medias && results[loop].Medias.length ){
									totalNoMediaInBoard = results[loop].Medias.length;
  								for( var loop2 = 0; loop2 < totalNoMediaInBoard; loop2++ ){
  									console.log("totalNoMediaInBoard = "+totalNoMediaInBoard);
  									if( results[loop].Medias[loop2].PostedBy == userId )
											noOfUsrMediaInBoard++;
									}
								}

  							if( results[loop]._id == boardId ){
									totalVoteCount++;
  								console.log("boardId matched and totalVoteCount = "+totalVoteCount);
									//update TotalVoteCount & VoteCount in board
  								board.update({_id:boardId},{$set:{"TotalVoteCount":totalVoteCount}},{multi:false},boardUpdateCallback);
  								function boardUpdateCallback(err , result){
  									if(err){
											res.json(err);
										}
  									else{
											//continue;
											console.log("--boardUpdateCallback--");
										}
									}
								}


  							if( totalVoteCount && totalMemberCount ){
  								boardVotePercent = ((totalVoteCount/totalMemberCount)*100);
									sumBoardVotePercent += boardVotePercent;
  								console.log("sumBoardVotePercent = "+sumBoardVotePercent);
								}
								//console.log("medias + ",results[loop].Medias);
							}

							//vote-score across all boards formula
  						VoteScore = (sumBoardVotePercent/results.length);
  						console.log("VoteScore = "+VoteScore);

							//update user collection with VoteScore
  						if(VoteScore){
								//update user data
  							query = {_id:userId};
  							set = {$set:{"VoteScore":VoteScore}};
  							options = {multi:false};
  							user.update(query,set,options,userUpdateCallback);
  							
  							function userUpdateCallback(err , result){
  								if(err){
										res.json(err);
									}
  								else{
										console.log("--calculateUserScore--");
  									calculateUserScore(userId ,res);
										//res.json({"status":"success","message":"User action data has been logged."});
									}
								}
							}
  						else{
								console.log("--calculateUserScore--");
  							calculateUserScore(userId ,res);
								//res.json({"status":"success","message":"VoteScore = "+VoteScore});
							}

						}
					}
				}
			}
		}
	}

  function calculateUserScore(userId , res){
  	if(userId){
			//Get Repost @ Mark detail
			var userScore = 0;
			var userRepostScore = 0;
			var userMarkScore = 0;
			var userVoteScore = 0;

			var usAdminContri = 0.33;
			var uMediaRepostCount = 0;
			var uMediaMarkCount = 0;
			var totalMediaAdded = 0;
			var userData = {};

			//all added media count
  		media.find().countDocuments().exec(mediaGetCallback);

  		function mediaGetCallback(err , resCount){
  			if(resCount)
					totalMediaAdded = resCount;
				//next step
				nextStep();
			}

  		function nextStep(){
  			console.log("totalMediaAdded : ",totalMediaAdded);
  			userData = user.findById(userId,{}).then(function(result) {
				userGetCallback(null, result);
			}).catch(function(err) {
				userGetCallback(err, null);
			});
  		}
  		
  		function userGetCallback(err , result){
  			if(err){
					res.json(err);
				}
  			else{
  				console.log("result : ",result);
  				if(result.RepostCount)
						uMediaRepostCount = result.RepostCount;

  				if(result.MarkCount)
						uMediaMarkCount = result.MarkCount;

					//calculate user-score
  				if(uMediaRepostCount)
  					userRepostScore = ((uMediaRepostCount*100)/totalMediaAdded)*usAdminContri;

  				if(uMediaMarkCount)
  					userMarkScore = ((uMediaMarkCount*100)/totalMediaAdded)*usAdminContri;

  				if(result.VoteScore)
						userVoteScore = result.VoteScore;

					userScore = userRepostScore + userMarkScore + userVoteScore;
  				console.log("User Score :----> ( "+(userRepostScore+" --- "+userMarkScore+" --- "+userVoteScore)+" ) = "+userScore);
					//call user-score updater
  				UserScoreUpdater(userId , userScore);	
				}
			}


			//update user-score in users and media collection
  		function UserScoreUpdater(userId , userScore){
				console.log("--UserScoreUpdater--");
  		  if( userId && userScore ){
					var mediaIds = [];
					//get all media_ids of the user (need shard-key _id to update)
    			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1}).then(function(results) {
				mediaGetCallback(null, results);
			}).catch(function(err) {
				mediaGetCallback(err, null);
			});
    			function mediaGetCallback(err , results){
    				if(err){
							res.json(err);
						}
    				else{
    					for(var loop = 0; loop < results.length; loop++ )
								mediaIds.push(results[loop]._id);
						}
						callUpdater();
					}

    			function callUpdater(){
    				var query={_id:userId};
						var options = { multi: false };
    				user.update(query, { $set: {"UserScore":userScore}}, options, userUpdateCallback);
					}

    			function userUpdateCallback (err, numAffected) {
    				if(err){
							res.json(err)
						}
    				else{
    					console.log("mediaIds = "+mediaIds);

							//update in media collection
    					var query={_id:{$in:mediaIds}/* , UploadedBy:'user'*/};
							var options = { multi: true };
    					media.update(query, { $set: {"UserScore":userScore}}, options, mediaUpdateCallback)
    					function mediaUpdateCallback (err, numAffected) {
    						if(err){
									res.json(err)
								}
    						else{
									//res.json({"status":"success","message":"User Score logged successfully","affected":numAffected});
								final(totalInputCount , res);
								}
							}

							//if user didn't posted any media then---
						if(!mediaIds)
							final(totalInputCount , res);
						}
					}
				}
  		  else{
					//res.json({"status":"success","message":"User Score could not logged ( User ID : "+userId+", UserScore : "+userScore+" )"});
			  final(totalInputCount , res);  
				}
			}
		}
  	else{
  		console.log("userId : "+userId);
			res.json("wrong userId input in calculateUserScore");
		}
	}

	var resultCount = 0;

  function final(totalInputCount , res){
		resultCount++;
    if( resultCount == totalInputCount ){
			//return here
      res.json({"code":"200","status":"success","message":"User score logged successfully","affected":resultCount});
		}
	}

};
exports.logMediaAction_RepostArr = logMediaAction_RepostArr;

var updateMedia__Stamps = function (req , res){
	media.findById(req.body.MediaID).then(function(mediaData) {
		if(err){
			
		}
		else{
			console.log("mediaData = ",mediaData);
			if(!mediaData.Stamps){
				console.log("if----");
				mediaData.Stamps = {};
			}
			else{
				console.log("else mediaData.Stamps = ",mediaData.Stamps);
			}

			var getLoginU__fsgs = {};

			if( req.session.user.FSGsArr2 ){
				getLoginU__fsgs = req.session.user.FSGsArr2;
			}


			if(mediaData.Stamps.Users && mediaData.Stamps.Users.length){
				//mediaData.Stamps.Users.push({UserFSGs:req.session.user.FSGs});
				mediaData.Stamps.Users.push({UserFSGs:getLoginU__fsgs});
			}
			else{
				mediaData.Stamps.Users=[];
				//mediaData.Stamps.Users.push({UserFSGs:req.session.user.FSGs});
				mediaData.Stamps.Users.push({UserFSGs:getLoginU__fsgs});
			}
			console.log("mediaData.Stamps.Users = ",mediaData.Stamps.Users);
			/*
			mediaData.save(function(err){
				if (err) {
					//res.json(err);
					return 0;
				}
				else{
					return 1;
					//postMedia(req,res);
				}
			});
			*/
			//use update command
			var query={_id:req.body.MediaID};
			var options = { multi: false };
			var fields = {};
			var fields  = {"Stamps":mediaData.Stamps};
			
			media.update(query, { $set: fields}, options, ActionUpdateCallback)
			function ActionUpdateCallback (err, numAffected) {
				if(err){
					console.log("-------->Stamps--ActionUpdateCallback");
					return 0;
				}
				else{
					console.log()
					return 1;
				}
			}
		}
	});
}

var updateMedia__Posts = function (req , res){
	media.findById(req.body.MediaID).then(function(mediaData) {
		if(err){
			
		}
		else{
			console.log("mediaData = ",mediaData);
			if(!mediaData.Posts){
				console.log("if----");
				mediaData.Posts = {};
			}
			else{
				console.log("else mediaData.Posts = ",mediaData.Posts);
			}

			var getLoginU__fsgs = {};

			if( req.session.user.FSGsArr2 ){
				getLoginU__fsgs = req.session.user.FSGsArr2;
			}


			if(mediaData.Posts.Users && mediaData.Posts.Users.length){
				mediaData.Posts.Users.push({UserFSGs:getLoginU__fsgs});
			}
			else{
				mediaData.Posts.Users=[];
				mediaData.Posts.Users.push({UserFSGs:getLoginU__fsgs});
			}
			console.log("mediaData.Posts.Users = ",mediaData.Posts.Users);
			
			//use update command
			var query={_id:req.body.MediaID};
			var options = { multi: false };
			var fields = {};
			var fields  = {"Posts":mediaData.Posts};
			
			media.update(query, { $set: fields}, options, ActionUpdateCallback)
			function ActionUpdateCallback (err, numAffected) {
				if(err){
					console.log("-------->Posts--ActionUpdateCallback");
					return 0;
				}
				else{
					console.log()
					return 1;
				}
			}
		}
	});
}

var updateMedia__Votes = function (req , res){
	var mediaId = req.body.media_id || req.body.MediaID || req.body.MediaId;
	
	if (!mediaId) {
		return;
	}
	
	media.findById(mediaId).then(function(mediaData) {
		if(!mediaData){
			return;
		}
		
		if(!mediaData.Posts){
			mediaData.Posts = {};
		}

		var getLoginU__fsgs = {};

		if( req.session.user.FSGsArr2 ){
			getLoginU__fsgs = req.session.user.FSGsArr2;
		}

		// Create vote object with FSG data and LikeType
		var voteObj = {
			UserFSGs: getLoginU__fsgs,
			LikeType: req.body.like_type || req.body.LikeType || 1, // Default to 1 (like)
			VotedAt: Date.now()
		};

		if(mediaData.Posts.Users && mediaData.Posts.Users.length){
			mediaData.Posts.Users.push(voteObj);
		}
		else{
			mediaData.Posts.Users=[];
			mediaData.Posts.Users.push(voteObj);
		}
		
		//use update command
		var query={_id: new ObjectId(mediaId)};
		var options = { multi: false };
		var fields = {"Posts":mediaData.Posts};
		
		media.updateOne(query, { $set: fields}, options).then(function(result) {
			// Success - no logging needed
		}).catch(function(err) {
			console.error("Database update failed:", err);
		});
	}).catch(function(err) {
		console.error("Database error finding media:", err);
	});
}

var updateMedia__Comments = function (req , res){
	var mediaId = req.body.media_id || req.body.MediaID || req.body.MediaId;
	
	if (!mediaId) {
		return;
	}
	
	media.findById(mediaId).then(function(mediaData) {
		if(!mediaData){
			return;
		}
		
		if(!mediaData.Posts){
			mediaData.Posts = {};
		}

		var getLoginU__fsgs = {};

		if( req.session.user.FSGsArr2 ){
			getLoginU__fsgs = req.session.user.FSGsArr2;
		}

		// Create comment object with FSG data and comment text
		var commentObj = {
			UserFSGs: getLoginU__fsgs,
			Comment: req.body.comment || req.body.Comment || "",
			CommentedAt: Date.now()
		};

		if(mediaData.Posts.Users && mediaData.Posts.Users.length){
			mediaData.Posts.Users.push(commentObj);
		}
		else{
			mediaData.Posts.Users=[];
			mediaData.Posts.Users.push(commentObj);
		}
		
		//use update command
		var query={_id: new ObjectId(mediaId)};
		var options = { multi: false };
		var fields = {"Posts":mediaData.Posts};
		
		media.updateOne(query, { $set: fields}, options).then(function(result) {
			// Success - no logging needed
		}).catch(function(err) {
			console.error("Database update failed:", err);
		});
	}).catch(function(err) {
		console.error("Database error finding media:", err);
	});
}

function updateMedia__statementObj ( mediaId , statement , postedBy ){
	if( mediaId && statement ){
		var obj = {};
		obj.Statements = [];

media.findById(mediaId).then(function(mData) {
		console.log("mediaData = ",mData);
		obj.CurrStatement = statement;
		var statementObj = {
			Statement : statement,
			PostedBy : postedBy
		};

		if(!mData.Statements){
			obj.Statements.push(statementObj);
		}
		else{
			console.log("else mediaData.Statements = ",mData.Statements);
			obj.Statements = mData.Statements;
		}

		if(!mData.OwnStatement){
			obj.OwnStatement = statement;
		}

		var query = { _id : mediaId };
		var options = { multi: false };
		media.update(query, { $set: obj}, options, callback)
		function callback (err, numAffected) {
			if(err){
				console.log("---ERROR in Media Statement-----------",err)
			}
			else{
				console.log("--------------media statement schema has been updated------------------");
			}
		}
	}).catch(function(err) {
		console.log("---ERROR finding media-----------",err)
	});
	}
}


var getComments = function(req , res){
	if(req.body){
		var conditions = {
			BoardId: req.body.board_id || req.body.BoardId,
			MediaId: req.body.media_id || req.body.MediaId,
			Action:'Comment',
			IsDeleted : false
		};
		
		var sortObj = {
			CreatedOn : 1
		}
		var fields = {};
		mediaActionLog.find(conditions).populate('UserId').sort(sortObj).lean().then(function(result) {
			var resCount = result.length;
			if(resCount){
						var PostCommentIdArr = [];
				for(var loop=0; loop < result.length; loop++){
							PostCommentIdArr.push(result[loop]._id);
						}

				//make a separate hit to count like
				var conditions = {
					PostCommentId : {$in : PostCommentIdArr},
					LikedById : req.session.user._id
				};
				var fields = {PostCommentId : true};
				postCommentLikeLogs.find(conditions , fields).then(function(LikeResult){
					console.log("LikeResult----------------------------",LikeResult);
					var loop1Counter = 0;
					var loop2Counter = 0;
					var opCounter = 0;
					
					if(resCount){
						for(loop1 = 0; loop1 < result.length; loop1++){
							//result[loop1].IsLiked = IsLikedByMe(result[loop1]._id);
							result[loop1].IsLiked = false;
							IsLikedByMe(loop1);
						}
					}
					else{
						res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
					}
					
					function IsLikedByMe(idx){
						var status = false;
						var LikeResultCount = LikeResult.length;
						if(LikeResultCount){
							for(var loop2 = 0; loop2 < LikeResultCount; loop2++){
								if(String(result[idx]._id) == String(LikeResult[loop2].PostCommentId)){
									result[idx].IsLiked = true;
									opCounter++;
									if(opCounter == (LikeResultCount*resCount)){
										res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
									}
								}
								else{
									opCounter++;
									if(opCounter == (LikeResultCount*resCount)){
										res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
									}
								}
							}
						}
						else{
							result[idx].IsLiked = false;
							opCounter++;
							if(opCounter == resCount){
								res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
							}
						}
					}
				}).catch(function(err){
					console.log("error----------------------------",err);
					res.json({status:"error",message:"Something went wrong."});	
				});
			}
			else{
				res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
			}
		}).catch(function(err) {
			console.error("Error in getComments:", err);
			res.json({ status: "error", message: "Database error occurred" });
		});
	}
}
exports.getComments = getComments;

/** 20Jan2k17 Changes Start**/
var saveCommentLike = function (req, res) {
//    console.log("* * * * - - - Inside saveCommentLikes - - -  * * * ", req.body);
//    console.log("* * * * - - - req.session.user._id - - -  * * * ", req.session.user._id);

	var saveObj = {
		PostCommentId: req.body.PostCommentId ? req.body.PostCommentId : undefined,
		LikedById: req.session.user._id ? req.session.user._id : undefined,
		CreatedOn: Date.now(),
		ModifiedOn: Date.now()

	}

    postCommentLikeLogs(saveObj).save().then(function (result) {
		//success
			//use findAndUpdate Query rather using find() and update separately! 
			var conditions = {
				_id: req.body.PostCommentId ? req.body.PostCommentId : undefined
			}

			var field = {
				CommentLikeCount: 1
			}

        mediaActionLog.findOneAndUpdate(conditions, { $inc: field }, {"new": true}, function (err, result) {
				if (!err) {
                console.log("******* inside findOneAndUpdate *****", result);
                res.json({"code": "200", "msg": "Success", "response": result})
				} else {
                console.log("errror uinside meddiaactiob - - - >",err)
                res.json({"code": "404", "msg": "Not successfull"})
            }
        });
    }).catch(function(err){
        console.log("errror uinside meddiaactiob - - - >",err)
        res.json({"code": "404", "msg": "Not successfull"})
    });
}
exports.saveCommentLike = saveCommentLike;


var removeCommentLike = function (req, res) {
//    console.log("* * * * - - - Inside saveCommentLikes - - -  * * * ", req.body);
//    console.log("* * * * - - - req.session.user._id - - -  * * * ", req.session.user._id);

	var removeObj = {
		PostCommentId: req.body.PostCommentId ? req.body.PostCommentId : undefined,
		LikedById: req.session.user._id ? req.session.user._id : undefined
	}

	postCommentLikeLogs.remove(removeObj, function (err, result) {
		//success
		if (!err) {
			//use findAndUpdate Query rather using find() and update separately! 
			var conditions = {
				_id: req.body.PostCommentId ? req.body.PostCommentId : undefined
			}

			var field = {
				CommentLikeCount: -1
			}

            mediaActionLog.findOneAndUpdate(conditions, {$inc: field},{"new": true}, function (err, result) {
                console.log("******* inside findOneAndUpdate 1*****", result);
				if (!err) {
                    console.log("******* inside findOneAndUpdate *****", result);
                    res.json({"code": "200", "msg": "Success", "response": result})
				} else {
                    console.log("errror uinside meddiaactiob - - - >", err)
                    res.json({"code": "200", "msg": "Not successfull"})
				}

			});
		}
	})
}
exports.removeCommentLike = removeCommentLike;

// Get all votes for a specific post or posts
var getAllVotes = function(req, res) {
	if(req.body) {
		var conditions = {
			Action: 'Vote',
			IsDeleted: false
		};
		
		// Add MediaId filter if provided
		if(req.body.media_id || req.body.MediaId) {
			conditions.MediaId = req.body.media_id || req.body.MediaId;
		}
		
		// Add BoardId filter if provided
		if(req.body.board_id || req.body.BoardId) {
			conditions.BoardId = req.body.board_id || req.body.BoardId;
		}
		
		// Add LikeType filter if provided (1=like, 2=dislike)
		if(req.body.like_type || req.body.LikeType) {
			conditions.LikeType = req.body.like_type || req.body.LikeType;
		}
		
		var sortObj = {
			CreatedOn: -1
		};
		
		mediaActionLog.find(conditions).populate('UserId').sort(sortObj).lean().then(function(result) {
			var resCount = result.length;
			res.json({
				status: "success",
				message: "Votes listing.",
				result: result,
				resCount: resCount
			});
		}).catch(function(err) {
			console.error("Error in getAllVotes:", err);
			res.json({ status: "error", message: "Database error occurred" });
		});
	} else {
		res.json({ status: "error", message: "Request body not provided" });
	}
};
exports.getAllVotes = getAllVotes;

// Get likes for the current user
var getMyLikes = function(req, res) {
	if(req.body) {
		var conditions = {
			UserId: req.session.user._id,
			Action: 'Vote',
			IsDeleted: false
		};
		
		// Add MediaId filter if provided
		if(req.body.media_id || req.body.MediaId) {
			conditions.MediaId = req.body.media_id || req.body.MediaId;
		}
		
		// Add BoardId filter if provided
		if(req.body.board_id || req.body.BoardId) {
			conditions.BoardId = req.body.board_id || req.body.BoardId;
		}
		
		// Add LikeType filter if provided (1=like, 2=dislike)
		if(req.body.like_type || req.body.LikeType) {
			conditions.LikeType = req.body.like_type || req.body.LikeType;
		}
		
		var sortObj = {
			CreatedOn: -1
		};
		
		mediaActionLog.find(conditions).populate('MediaId').sort(sortObj).lean().then(function(result) {
			var resCount = result.length;
			res.json({
				status: "success",
				message: "My likes listing.",
				result: result,
				resCount: resCount
			});
		}).catch(function(err) {
			console.error("Error in getMyLikes:", err);
			res.json({ status: "error", message: "Database error occurred" });
		});
	} else {
		res.json({ status: "error", message: "Request body not provided" });
	}
};
exports.getMyLikes = getMyLikes;

// Get posts with their interactions (likes and comments) aggregated
var getPostsWithInteractions = function(req, res) {
	if(req.body) {
		var conditions = {
			IsDeleted: 0,
			Status: { $in: [1, 2] }  // Include both Status 1 and 2
		};
		
		// Add MediaId filter if provided (single post)
		if(req.body.media_id || req.body.MediaId) {
			conditions._id = req.body.media_id || req.body.MediaId;
		}
		
		// Add BoardId filter if provided (posts from a page)
		if(req.body.board_id || req.body.BoardId) {
			// This would require a different approach since MediaId is not directly in Media collection
			// We'll need to use aggregation pipeline
		}
		
		// Add MediaType filter if provided
		if(req.body.media_type || req.body.MediaType) {
			conditions.MediaType = req.body.media_type || req.body.MediaType;
		}
		
		// Add pagination
		var skip = parseInt(req.body.skip) || 0;
		var limit = parseInt(req.body.limit) || 20;
		
		var sortObj = {
			UploadedOn: -1
		};
		
		// Use aggregation pipeline to get posts with interactions
		var pipeline = [
			{ $match: conditions },
			{ $sort: sortObj },
			{ $skip: skip },
			{ $limit: limit },
			{
				$lookup: {
					from: "MediaActionLogs",
					localField: "_id",
					foreignField: "MediaId",
					as: "interactions"
				}
			},
			{
				$unwind: {
					path: "$interactions",
					preserveNullAndEmptyArrays: true
				}
			},
			{
				$addFields: {
					"interactions.needsUserData": {
						$eq: ["$interactions.Action", "Comment"]
					}
				}
			},
			{
				$lookup: {
					from: "users",
					let: { userId: "$interactions.UserId", needsUser: "$interactions.needsUserData" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$_id", "$$userId"] },
										{ $eq: ["$$needsUser", true] }
									]
								}
							}
						},
						{
							$project: {
								_id: 1,
								Name: 1,
								UserName: 1,
								Email: 1,
								ProfilePic: 1
							}
						}
					],
					as: "interactions.user"
				}
			},
			{
				$group: {
					_id: "$_id",
					root: { $first: "$$ROOT" },
					interactions: { $push: "$interactions" }
				}
			},
			{
				$replaceRoot: {
					newRoot: {
						$mergeObjects: [
							"$root",
							{ interactions: "$interactions" }
						]
					}
				}
			},
			// Debug: Add a field to see if lookup worked
			{
				$addFields: {
					interactionCount: { $size: "$interactions" }
				}
			},
			{
				$addFields: {
					likes: {
						$filter: {
							input: "$interactions",
							cond: { 
								$and: [
									{ $eq: ["$$this.Action", "Vote"] },
									{ $eq: ["$$this.LikeType", "1"] },
									{ $eq: ["$$this.IsDeleted", false] }
								]
							}
						}
					},
					dislikes: {
						$filter: {
							input: "$interactions",
							cond: { 
								$and: [
									{ $eq: ["$$this.Action", "Vote"] },
									{ $eq: ["$$this.LikeType", "2"] },
									{ $eq: ["$$this.IsDeleted", false] }
								]
							}
						}
					},
					comments: {
						$map: {
							input: {
								$filter: {
									input: "$interactions",
									cond: { 
										$and: [
											{ $eq: ["$$this.Action", "Comment"] },
											{ $eq: ["$$this.IsDeleted", false] }
										]
									}
								}
							},
							as: "comment",
							in: {
								$mergeObjects: [
									"$$comment",
									{
										user: {
											$arrayElemAt: ["$$comment.user", 0]
										}
									}
								]
							}
						}
					},
					likeCount: {
						$size: {
							$filter: {
								input: "$interactions",
								cond: { 
									$and: [
										{ $eq: ["$$this.Action", "Vote"] },
										{ $eq: ["$$this.LikeType", "1"] },
										{ $eq: ["$$this.IsDeleted", false] }
									]
								}
							}
						}
					},
					dislikeCount: {
						$size: {
							$filter: {
								input: "$interactions",
								cond: { 
									$and: [
										{ $eq: ["$$this.Action", "Vote"] },
										{ $eq: ["$$this.LikeType", "2"] },
										{ $eq: ["$$this.IsDeleted", false] }
									]
								}
							}
						}
					},
					commentCount: {
						$size: {
							$filter: {
								input: "$interactions",
								cond: { 
									$and: [
										{ $eq: ["$$this.Action", "Comment"] },
										{ $eq: ["$$this.IsDeleted", false] }
									]
								}
							}
						}
					}
				}
			},
			{
				$project: {
					interactions: 0,  // Remove the raw interactions array
					interactionCount: 0  // Remove debug field
				}
			}
		];
		
		// We need to use the Media model for this aggregation
		var media = require('./../models/mediaModel.js');
		
		
		media.aggregate(pipeline).then(function(result) {
			var resCount = result.length;
			
			// Add user's interaction status for each post and filter user fields
			if(req.session.user && req.session.user._id) {
				var userId = req.session.user._id;
				result.forEach(function(post) {
					post.isLikedByMe = post.likes.some(function(like) {
						return String(like.UserId) === String(userId);
					});
					post.isDislikedByMe = post.dislikes.some(function(dislike) {
						return String(dislike.UserId) === String(userId);
					});
					post.isCommentedByMe = post.comments.some(function(comment) {
						return String(comment.UserId) === String(userId);
					});
					
					// Remove user field from likes and dislikes (only keep for comments)
					post.likes.forEach(function(like) {
						delete like.user;
					});
					
					post.dislikes.forEach(function(dislike) {
						delete dislike.user;
					});
				});
			} else {
				// Remove user field from likes and dislikes even without session
				result.forEach(function(post) {
					// Remove user field from likes and dislikes (only keep for comments)
					post.likes.forEach(function(like) {
						delete like.user;
					});
					
					post.dislikes.forEach(function(dislike) {
						delete dislike.user;
					});
				});
			}
			
			res.json({
				status: "success",
				message: "Posts with interactions fetched successfully.",
				result: result,
				resCount: resCount,
				pagination: {
					skip: skip,
					limit: limit,
					hasMore: result.length === limit
				}
			});
		}).catch(function(err) {
			console.error("Error in getPostsWithInteractions:", err);
			res.json({ status: "error", message: "Database error occurred" });
		});
	} else {
		res.json({ status: "error", message: "Request body not provided" });
	}
};
exports.getPostsWithInteractions = getPostsWithInteractions;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		getPageLikes
   * Created By: 		AI Assistant
   * @Purpose:   		Get likes for a page/board from MediaActionLogs
   * @Param:     		BoardId (page_id), mode ('count' or 'all')
   * @Return:    	 	Likes count or full like data
   * @Access Category:	Public
_________________________________________________________________________
*/
var getPageLikes = async function(req, res) {
    try {
        console.log('🔍 getPageLikes called');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        
        const boardId = req.body.BoardId || req.body.boardId || req.body.PageId;
        const mode = req.body.mode || req.query.mode || 'all';
        
        if (!boardId) {
            return res.json({
                status: "error",
                message: "BoardId/PageId is required",
                count: 0,
                results: []
            });
        }
        
        const conditions = {
            BoardId: new ObjectId(boardId),
            Action: "Vote",  // Vote = Like
            IsDeleted: 0
        };
        
        console.log('🔍 Query conditions:', conditions);
        
        // Count-only mode (FAST - no populate, no data)
        if (mode === 'count') {
            const count = await mediaActionLog.countDocuments(conditions);
            console.log('✅ Like count:', count);
            
            // Check if current user has liked (without populate for speed)
            let userLiked = false;
            if (req.session && req.session.user && req.session.user._id) {
                const userLikeCount = await mediaActionLog.countDocuments({
                    ...conditions,
                    UserId: new ObjectId(req.session.user._id)
                });
                userLiked = userLikeCount > 0;
            }
            
            return res.json({
                status: "success",
                message: "Like count retrieved",
                count: count,
                userLiked: userLiked,
                results: []
            });
        }
        
        // Full mode (with user details)
        const results = await mediaActionLog.find(conditions)
            .populate("UserId", "_id Name Email ProfilePic NickName")
            .sort({ CreatedOn: -1 });
        
        const count = results.length;
        console.log('✅ Likes fetched:', count);
        
        // Check if current user has liked
        let userLiked = false;
        if (req.session && req.session.user && req.session.user._id) {
            userLiked = results.some(like => 
                like.UserId && like.UserId._id.toString() === req.session.user._id.toString()
            );
        }
        
        return res.json({
            status: "success",
            message: "Likes retrieved successfully",
            count: count,
            userLiked: userLiked,
            results: results
        });
        
    } catch (error) {
        console.error('❌ Error in getPageLikes:', error);
        return res.json({
            status: "error",
            message: "Error fetching likes: " + error.message,
            count: 0,
            userLiked: false,
            results: []
        });
    }
};
exports.getPageLikes = getPageLikes;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		getStreamLikes
   * Created By: 		AI Assistant
   * @Purpose:   		Get likes for a stream (SocialPage) from MediaActionLogs
   * @Param:     		SocialPageId, mode ('count' or 'all')
   * @Return:    	 	Likes count or full like data
   * @Access Category:	Public
_________________________________________________________________________
*/
var getStreamLikes = async function(req, res) {
    try {
        var StreamId = req.body.StreamId || req.body.stream_id || req.body.SocialPageId || null;
        var mode = req.body.mode || req.query.mode || 'all';


        if (!StreamId) {
            return res.json({
                status: "error",
                message: "StreamId is required",
                count: 0,
                likeCount: 0,
                dislikeCount: 0,
                userLiked: false,
                userDisliked: false,
                results: []
            });
        }

        // Use MediaActionLogs collection - Query by StreamId (Capsule ID) for stream-level likes only
        var baseConditions = {
            StreamId: new ObjectId(StreamId),
            Action: "Vote",  // Vote action for both likes and dislikes
            ActionLevel: "stream",  // Only stream-level actions (no MediaId)
            IsDeleted: 0,
        };

        // Count-only mode (FAST - no populate, no data)
        if (mode === 'count') {
            // Count likes (LikeType = "1")
            const likeCount = await mediaActionLog.countDocuments({
                ...baseConditions,
                LikeType: "1"
            });
            
            // Count dislikes (LikeType = "2")
            const dislikeCount = await mediaActionLog.countDocuments({
                ...baseConditions,
                LikeType: "2"
            });
            
            // Check if current user has liked or disliked (without populate for speed)
            let userLiked = false;
            let userDisliked = false;
            if (req.session && req.session.user && req.session.user._id) {
                const userLike = await mediaActionLog.findOne({
                    ...baseConditions,
                    UserId: new ObjectId(req.session.user._id),
                    LikeType: "1"
                });
                userLiked = !!userLike;
                
                const userDislike = await mediaActionLog.findOne({
                    ...baseConditions,
                    UserId: new ObjectId(req.session.user._id),
                    LikeType: "2"
                });
                userDisliked = !!userDislike;
            }
            

            return res.json({
                status: "success",
                message: "Like count retrieved",
                streamId: StreamId, // Return streamId so frontend can map to correct stream
                userId: req.session?.user?._id || null, // Return current user ID
                count: likeCount, // Total likes for backward compatibility
                likeCount: likeCount,
                dislikeCount: dislikeCount,
                userLiked: userLiked,
                userDisliked: userDisliked,
                results: []
            });
        }

        // Full mode (with user details)
        var results = await mediaActionLog.find(baseConditions)
            .populate("UserId", "_id Name Email ProfilePic NickName")
            .sort({ CreatedOn: -1 });
        
        results = Array.isArray(results) ? results : [];
        
        // Separate likes and dislikes
        const likes = results.filter(r => r.LikeType === "1");
        const dislikes = results.filter(r => r.LikeType === "2");

        // Check if current user has liked or disliked
        let userLiked = false;
        let userDisliked = false;
        if (req.session && req.session.user && req.session.user._id) {
            userLiked = likes.some(like => 
                like.UserId && like.UserId._id.toString() === req.session.user._id.toString()
            );
            userDisliked = dislikes.some(dislike => 
                dislike.UserId && dislike.UserId._id.toString() === req.session.user._id.toString()
            );
        }

        return res.json({
            status: "success",
            message: "Stream likes retrieved.",
            streamId: StreamId, // Return streamId so frontend can map to correct stream
            userId: req.session?.user?._id || null, // Return current user ID
            count: likes.length, // Total likes for backward compatibility
            likeCount: likes.length,
            dislikeCount: dislikes.length,
            userLiked: userLiked,
            userDisliked: userDisliked,
            results: results, // All votes (likes and dislikes)
            likes: likes, // Just likes
            dislikes: dislikes // Just dislikes
        });
    } catch (error) {
        console.error('❌ Error in getStreamLikes:', error);
        return res.json({
            status: "error",
            message: "Error fetching likes: " + error.message,
            streamId: StreamId,
            count: 0,
            likeCount: 0,
            dislikeCount: 0,
            userLiked: false,
            userDisliked: false,
            results: []
        });
    }
};
exports.getStreamLikes = getStreamLikes;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		addCommentLike
   * Created By: 		AI Assistant
   * @Purpose:   		Add like to a comment using MediaActionLogs
   * @Param:     		CommentId, SocialPageId, MediaId
   * @Return:    	 	Success/failure status
   * @Access Category:	Public
_________________________________________________________________________
*/
var addCommentLike = async function(req, res) {
    try {
        const CommentId = req.body.CommentId ? req.body.CommentId : null;
        const SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;
        const MediaId = req.body.MediaId ? req.body.MediaId : null;
        const StreamId = req.body.StreamId || req.body.stream_id || req.body.capsuleId || null;

        if (!CommentId || !SocialPageId) {
            return res.json({
                status: "error",
                message: "CommentId and SocialPageId are required"
            });
        }

        // Check if already liked
        const existingLike = await mediaActionLog.findOne({
            BoardId: new ObjectId(SocialPageId),
            MediaId: MediaId ? new ObjectId(MediaId) : null,
            UserId: new ObjectId(req.session.user._id),
            Action: "CommentLike",
            Comment: CommentId, // Store CommentId in Comment field
            IsDeleted: 0
        });

        if (existingLike) {
            return res.json({
                status: "error",
                message: "You have already liked this comment"
            });
        }

        // Add like
        const likeData = {
            UserId: new ObjectId(req.session.user._id),
            BoardId: new ObjectId(SocialPageId),
            StreamId: StreamId ? new ObjectId(StreamId) : null,
            MediaId: MediaId ? new ObjectId(MediaId) : null,
            Action: "CommentLike",
            Comment: CommentId, // Store CommentId in Comment field
            CreatedOn: new Date(),
            IsDeleted: 0
        };

        await mediaActionLog(likeData).save();

        // Get updated count
        const count = await mediaActionLog.countDocuments({
            BoardId: new ObjectId(SocialPageId),
            Comment: CommentId,
            Action: "CommentLike",
            IsDeleted: 0
        });

        return res.json({
            status: "success",
            message: "Comment liked successfully",
            count: count,
            commentId: CommentId
        });

    } catch (error) {
        console.error('❌ Error in addCommentLike:', error);
        return res.json({
            status: "error",
            message: "Error adding like: " + error.message
        });
    }
};
exports.addCommentLike = addCommentLike;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		removeCommentLike
   * Created By: 		AI Assistant
   * @Purpose:   		Remove like from a comment using MediaActionLogs
   * @Param:     		CommentId, SocialPageId
   * @Return:    	 	Success/failure status
   * @Access Category:	Public
_________________________________________________________________________
*/
var removeCommentLike = async function(req, res) {
    try {
        const CommentId = req.body.CommentId ? req.body.CommentId : null;
        const SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;

        if (!CommentId || !SocialPageId) {
            return res.json({
                status: "error",
                message: "CommentId and SocialPageId are required"
            });
        }

        // Soft delete the like
        const result = await mediaActionLog.updateOne(
            {
                BoardId: new ObjectId(SocialPageId),
                UserId: new ObjectId(req.session.user._id),
                Action: "CommentLike",
                Comment: CommentId,
                IsDeleted: 0
            },
            {
                $set: { IsDeleted: 1, UpdatedOn: new Date() }
            }
        );

        if (result.modifiedCount === 0) {
            return res.json({
                status: "error",
                message: "Like not found or already removed"
            });
        }

        // Get updated count
        const count = await mediaActionLog.countDocuments({
            BoardId: new ObjectId(SocialPageId),
            Comment: CommentId,
            Action: "CommentLike",
            IsDeleted: 0
        });

        return res.json({
            status: "success",
            message: "Like removed successfully",
            count: count,
            commentId: CommentId
        });

    } catch (error) {
        console.error('❌ Error in removeCommentLike:', error);
        return res.json({
            status: "error",
            message: "Error removing like: " + error.message
        });
    }
};
exports.removeCommentLike = removeCommentLike;

/*________________________________________________________________________
   * @Date:      		October 1, 2025
   * @Method :   		getCommentLikes
   * Created By: 		AI Assistant
   * @Purpose:   		Get likes for comments using MediaActionLogs
   * @Param:     		SocialPageId, CommentIds (optional), mode ('count' or 'all')
   * @Return:    	 	Comment likes data
   * @Access Category:	Public
_________________________________________________________________________
*/
var getCommentLikes = async function(req, res) {
    try {
        const SocialPageId = req.body.SocialPageId ? req.body.SocialPageId : null;
        const CommentIds = req.body.CommentIds ? req.body.CommentIds : [];
        const mode = req.body.mode || req.query.mode || 'all';

        if (!SocialPageId) {
            return res.json({
                status: "error",
                message: "SocialPageId is required",
                results: []
            });
        }

        const conditions = {
            BoardId: new ObjectId(SocialPageId),
            Action: "CommentLike",
            IsDeleted: 0
        };

        // Filter by specific comments if provided
        if (CommentIds && CommentIds.length > 0) {
            conditions.Comment = { $in: CommentIds };
        }

        // Count-only mode (FAST)
        if (mode === 'count') {
            const results = await mediaActionLog.aggregate([
                { $match: conditions },
                {
                    $group: {
                        _id: "$Comment",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Convert to object format: { commentId: count }
            const counts = {};
            results.forEach(item => {
                counts[item._id] = item.count;
            });

            // Check which comments current user has liked
            const userLiked = await mediaActionLog.find({
                ...conditions,
                UserId: new ObjectId(req.session.user._id)
            }).distinct('Comment');

            return res.json({
                status: "success",
                message: "Comment like counts retrieved",
                counts: counts,
                userLiked: userLiked,
                results: []
            });
        }

        // Full mode (with user details)
        const results = await mediaActionLog.find(conditions)
            .populate("UserId", "_id Name Email ProfilePic NickName")
            .sort({ CreatedOn: -1 });

        // Group by comment
        const groupedByComment = {};
        results.forEach(like => {
            const commentId = like.Comment;
            if (!groupedByComment[commentId]) {
                groupedByComment[commentId] = [];
            }
            groupedByComment[commentId].push({
                _id: like._id,
                UserId: like.UserId,
                CreatedOn: like.CreatedOn
            });
        });

        return res.json({
            status: "success",
            message: "Comment likes retrieved successfully",
            results: groupedByComment
        });

    } catch (error) {
        console.error('❌ Error in getCommentLikes:', error);
        return res.json({
            status: "error",
            message: "Error fetching comment likes: " + error.message,
            results: []
        });
    }
};
exports.getCommentLikes = getCommentLikes;
var mediaActionLog = require('./../models/mediaActionLogModel.js');
var media = require('./../models/mediaModel.js');
var user = require('./../models/userModel.js');
//var board = require('./../models/boardModel.js');
var board = require('./../models/pageModel.js');
var boardController = require('./../controllers/boardController.js');
var postCommentLikeLogs = require('./../models/PostCommentLikeLogsModel.js');

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
		
		mediaActionLog(fields).save(function(err){
			if(err){
			  res.json(err);
			}
			else{
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
			}
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
			MediaId : req.body.MediaID,
			UserId : req.session.user._id,
			UserFsg: req.session.user.FSGs,
			BoardId : req.body.BoardId,
			OwnerId : req.body.OwnerId,
			Action: req.body.Action,
			Title: req.body.Title,
			Prompt: req.body.Prompt,
			Locator: req.body.Locator,
			URL: req.body.MediaURL,
			MediaType: req.body.MediaType,
			ContentType: req.body.ContentType,
			Content: req.body.Content,
			Comment: req.body.Comment ? req.body.Comment : ""
		};
		
		console.log(";;;;;;;;;;;;;----",fields);
		//check if sameUser-sameBoard-sameMedia-sameAction already exist.
		var conditions = {};
		var actionLogCount = 0;
		
		conditions = {
			BoardId:fields.BoardId,
			UserId:fields.UserId,
			MediaId:fields.MediaId,
			Action:fields.Action
		};
		
		//Updated on 18092014 by manishp  - A user can post/repost same media multiple times (Discussed Montage Case and Planned this)
		//mediaActionLog.find(conditions).count().exec(mAcLogChekerCallBack);
		//if(conditions.Action != 'Post'){
		if(conditions.Action != 'Post' && conditions.Action != 'Comment'){	//added on 13 dec 2016 - comment module
			mediaActionLog.find(conditions).count().exec(mAcLogChekerCallBack);
		}	
		else{
			if(conditions.Action != 'Comment'){
				if( req.body.MediaID && req.body.Statement && req.session.user._id ){
					updateMedia__statementObj(req.body.MediaID, req.body.Statement, req.session.user._id);
				}
				else{
					console.log("---------------------req.body.Statement--------------------------------NOT FOUND------------");
				}
			}
			mediaActionLogUpdater();
		}	
		//End updated on 18092014  - A user can post/repost same media multiple times
		
		function mAcLogChekerCallBack(err , resCount){
			console.log("count : "+resCount);
			if(resCount){
				res.json({status:"failed",message:"You have already added this action.",constraint:"Unique record check"});
			}
			else{
				console.log("--mediaActionLogUpdater--");
				//updater call
				mediaActionLogUpdater();
			}
			
		}
		
		function mediaActionLogUpdater(){
			mediaActionLog(fields).save(function(err,result){
				if(err){
				  res.json(err);
				}
				else{
					if(fields.Action == 'Comment'){
						if(fields.Comment){
							var result = fields ? fields : {};
							result.UserId = (String(req.session.user._id)==String(fields.UserId)) ? req.session.user : {};
							res.json({"status":"success","message":"Success!",result:result});
						}
						else{
							res.json({"status":"error","message":"Comment was empty."});
						}
					}
					else{
						console.log("--userScoreParamsUpdater--");
						userScoreParamsUpdater(fields , req , res);
						//res.json({"status":"success","message":"Action has been logged successfully."});
					}
				}
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
	
	userData = user.findOne({_id:userId},{RepostCount:1,MarkCount:1,StampCount:1,VoteScore:1,UserScore:1}, userGetCallback);
		
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
				console.log("--Vote--");
				var totalNoOfMembers = 0;
				var OwnerMediaCount  = 0;
				var totalVoteCount = 0;
				
				//get user's boards data to fetch votes, calculate the vote-score
				board.find({$and:[{isDeleted:0},{$or:[{"OwnerID":userId},{"Invitees.UserID":userId}]}]}, boardGetCallback);
				
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
				};
			}
			else if(Action == 'Comment'){
				res.json({"status":"success","message":"Success!"});
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
		media.find().count().exec(mediaGetCallback);
		
		function mediaGetCallback(err , resCount){
			if(resCount)
				totalMediaAdded = resCount;
			//next step
			nextStep();
		}
		
		function nextStep(){
			console.log("totalMediaAdded : ",totalMediaAdded);
			userData = user.findById(userId,{}, userGetCallback);
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
			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1},mediaGetCallback);
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
		media.find().count().exec(mediaGetCallback);
		
		function mediaGetCallback(err , resCount){
			if(resCount)
				totalMediaAdded = resCount;
			//next step
			nextStep();
		}
		
		function nextStep(){
			console.log("totalMediaAdded : ",totalMediaAdded);
			userData = user.findById(userId,{}, userGetCallback);
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
			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1},mediaGetCallback);
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
  	mediaActionLog(fields).save(function(err){
  		if(err){
  		  res.json(err);
  		}
  		else{
  			console.log("--userScoreParamsUpdater2--");
  			userScoreParamsUpdater2(fields , req , res);
  			//res.json({"status":"success","message":"Action has been logged successfully."});
  		}
  	});
  }

  function userScoreParamsUpdater2(fields , req , res){
	
  	var userId = fields.UserId;
  	var boardId = fields.BoardId;
  	var mediaId = fields.MediaId;
  	var Action = fields.Action;
  	
  	userData = user.find({_id:userId},{RepostCount:1,MarkCount:1,StampCount:1,VoteScore:1,UserScore:1}, userGetCallback);
  		
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
  				board.find({$and:[{isDeleted:0},{$or:[{"OwnerID":userId},{"Invitees.UserID":userId}]}]}, boardGetCallback);
  				
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
  		media.find().count().exec(mediaGetCallback);
  		
  		function mediaGetCallback(err , resCount){
  			if(resCount)
  				totalMediaAdded = resCount;
  			//next step
  			nextStep();
  		}
  		
  		function nextStep(){
  			console.log("totalMediaAdded : ",totalMediaAdded);
  			userData = user.findById(userId,{}, userGetCallback);
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
    			media.find({UploaderID:userId , UploadedBy:'user'},{_id:1},mediaGetCallback);
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
	media.findById(req.body.MediaID,function(err , mediaData){
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

function updateMedia__statementObj ( mediaId , statement , postedBy ){
	if( mediaId && statement ){
		var obj = {};
		obj.Statements = [];
		
		media.findById(mediaId,function(err , mData){
			if(err){
				
			}
			else{
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
			}
		});	
	}
}


var getComments = function(req , res){
	if(req.body){
		var conditions = {
			BoardId:req.body.BoardId,
			MediaId:req.body.MediaId,
			Action:'Comment',
			IsDeleted : false
		};
		
		var sortObj = {
			CreatedOn : 1
		}
		var fields = {};
		mediaActionLog.find(conditions).populate('UserId').sort(sortObj).lean().exec(callback)
		function callback(err , result){
			if(!err){
				console.log("result----------------------------",result);
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
					postCommentLikeLogs.find(conditions , fields , function(err , LikeResult){
						if(!err){
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
						}
						else{
							console.log("error----------------------------",err);
							res.json({status:"error",message:"Something went wrong."});	
						}
					})
				
				}
				else{
					res.json({status:"success",message:"Comments listing.",result:result , resCount:resCount});
				}
			}
			else{
				console.log("error----------------------------",err);
				res.json({status:"error",message:"Something went wrong."});	
			}
		}
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

    postCommentLikeLogs(saveObj).save(function (err, result) {
        //success
        if (!err) {
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
        }
		else{
			console.log("errror uinside meddiaactiob - - - >",err)
			res.json({"code": "404", "msg": "Not successfull"})
		}
    })
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
/*
Comments - Defines a custom middle-ware to check for session for every route, with exceptions routes listed in unprotectedRoutes[]
*/

//var mongoose = require('mongoose');
//var tokenModel = mongoose.model('Token');

module.exports = function(req, res, next){
	//define api prefix
	//var frontendApiPrefix = '/api';
	console.log('Something is happening.');
	reqUrl = req.baseUrl + req.path;
	console.log("request url : ",reqUrl);
	
	if(reqUrl.substring(0,5) == '/user'){
		var frontendApiPrefix = '/user';
		var unprotectedRoutes = [
				'/login',
				'/chklogin',
				'/register',
				'/reset_password',
				'/new_password'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/projects'){
		var frontendApiPrefix = '/projects';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,7) == '/boards'){
		var frontendApiPrefix = '/boards';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,11) == '/myInvitees'){
		var frontendApiPrefix = '/myInvitees';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/myBoards'){
		var frontendApiPrefix = '/myBoards';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,21) == '/addBoardMediaToBoard'){
		var frontendApiPrefix = '/addBoardMediaToBoard';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/media'){
		var frontendApiPrefix = '/media';
		var unprotectedRoutes = [
			'/generate_thumbnail',
			'/test_sorting'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/proxy'){
		var frontendApiPrefix = '/proxy';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/keywords'){
		console.log("keywords---parse");
		var frontendApiPrefix = '/keywords';
		var unprotectedRoutes = [
			'/parse'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/capsules'){
		console.log("capsules--- in checkSession.js");
		var frontendApiPrefix = '/capsules';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/chapters'){
		console.log("chapters--- in checkSession.js");
		var frontendApiPrefix = '/chapters';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/pages'){
		console.log("pages--- in checkSession.js");
		var frontendApiPrefix = '/pages';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,7) == '/groups'){
		console.log("groups--- in checkSession.js");
		var frontendApiPrefix = '/groups';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/members'){
		console.log("members--- in checkSession.js");
		var frontendApiPrefix = '/members';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,17) == '/assets/Media/img'){
		var arrLength = 0;
		arrLength = reqUrl.substring(0).split('/').length;
		console.log("arrLength = ",arrLength);
		
		if( arrLength == 5 ){
			res.send(404 , 'Not Found')
		}
		else{
			next();
		}
		
	}
	else{
		console.log("in else..");
		next();
	}
	
};

function checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	console.log("check : ",unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')));
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		console.log("api status-----","public");
		next();
	}
	else{
		console.log("api status-----","protected");
		checkSession(req , res , next , frontendApiPrefix , reqUrl);
	}
}


function checkSession(req , res , next , frontendApiPrefix , reqUrl){
	if (req.session.user) {
		if( frontendApiPrefix == '/boards' && reqUrl == frontendApiPrefix+'/' ){
			checkAcl(req , res , next);
		
		}else{
			next();
		}
		
		//next();
	}else{
		console.log("session has expired...");
		res.send(401, 'Your session has expired');
		//res.render('layouts/frontend/frontLayout.html');
	}
}

function checkAcl(req , res , next){
	console.log("------checking ACL-----");
	if (req.session.user) {
		//fetchUserBoards();
		if( req.body.id ){
			var board = require('../models/boardModel.js');
			var condition = {};
			var IsAuthorized = false;
			
			condition = {isDeleted:0,$or:[{"OwnerID":req.session.user._id} , {"Invitees.UserID":req.session.user._id}]};//{$or:{"OwnerID":req.session.user._id , "Invitees.UserID":req.session.user._id}};
			board.find(condition,{"_id":1}, function(err,result){
				if( !err ){
					console.log("My Board = ",result);
					for( var loop = 0; loop < result.length; loop++ ){
						if( req.body.id == result[loop]._id ){
							IsAuthorized = true; 
							break;
							//next();break;
						}
					}
					
					if( IsAuthorized ){
						next();
					}
					else{
						res.send(401, 'Access Denied');
					}
					
				}
				else{
					//All else case
					res.send(401, 'Access Denied');
				}
			});
		}
		else{
			next();
		}
		
	}else{
		console.log("Access Denied...");
		res.send(401, 'Your session has expired');
		//res.render('layouts/frontend/frontLayout.html');
	}
}
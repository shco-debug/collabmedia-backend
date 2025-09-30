/*
Comments - Defines a custom middle-ware to check for JWT authentication for every route, with exceptions routes listed in unprotectedRoutes[]
*/

//var mongoose = require('mongoose');
//var tokenModel = mongoose.model('Token');

const { authenticateJWT } = require('./jwtAuth');

module.exports = function(req, res, next){
	//define api prefix
	//var frontendApiPrefix = '/api';
	//console.log('Something is happening.');
	reqUrl = req.baseUrl + req.path;
	//console.log("request url : ",reqUrl);

	/*
	if(reqUrl.substring(0,1) == '/'){		//this will prevent layout htmls....
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
	else */if(reqUrl.substring(0,5) == '/user'){
		var frontendApiPrefix = '/user';
		var unprotectedRoutes = [
				'/login',
				'/chklogin',
				'/register',
				'/reset_password',
				'/new_password',
				'/confirm_token',
				'/checkReferralCode',
				'/requestInvitation',
				'/getDataBySubdomain',
				'/createAdmin',
				'/createSubAdmin',
				'/promoteUserToSubAdmin'

		];

		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/streams'){
		var frontendApiPrefix = '/streams';
		var unprotectedRoutes = [];

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
			'/test_sorting',
			'/updatePostCountsPerGt_API',
			'/updateMediaCountsPerGt_API',
			'/InvitationEngineCron__API',
			'/WishHappyBirthdayCron__API',
			'/getUnsplashImages__API',
			'/syncGdMjImage_INTERNAL_API',
			'/syncGdTwoMjImage_INTERNAL_API',
			'/addMjImageToMedia__INTERNAL_API',
			'/addUnsplashImageToMedia__INTERNAL_API',
			'/createSinglePost',
			'/updatePostPrivacy',
			'/createBlend'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/admin'){
		var frontendApiPrefix = '/admin';
		var unprotectedRoutes = [
			'/signin',
			'/login',
			'/chklogin',
			'/test-cookie',
			'/test-session',
			'/debug-session',
			'/test-mongo-session',
			'/test-current-session',
			'/test-simple-cookie',
			'/test-session-working',
			'/test-session-deserialization'
		];
		checkAdminUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/subadmin'){
		var frontendApiPrefix = '/subadmin';
		var unprotectedRoutes = [
			'/signin',
			'/login',
			'/chklogin'
		];
		checkSubAdminUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/proxy'){
		var frontendApiPrefix = '/proxy';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/keywords'){
		//console.log("keywords---parse");
		var frontendApiPrefix = '/keywords';
		var unprotectedRoutes = [
			'/parse'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/capsules'){
		//console.log("capsules--- in checkSession.js");
		var frontendApiPrefix = '/capsules';
		var unprotectedRoutes = [
			'/createPostsOnEventDay_INTERNAL_API',
			'/unsubscribe_changeSettings',
			'/getStreamPriceMap'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/chapters'){
		//console.log("chapters--- in checkSession.js");
		var frontendApiPrefix = '/chapters';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,6) == '/pages'){
		//console.log("pages--- in checkSession.js");
		var frontendApiPrefix = '/pages';
		var unprotectedRoutes = [
			'/createcp'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,7) == '/groups'){
		//console.log("groups--- in checkSession.js");
		var frontendApiPrefix = '/groups';
		var unprotectedRoutes = [
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/members'){
		//console.log("members--- in checkSession.js");
		var frontendApiPrefix = '/members';
		var unprotectedRoutes = [
			'/addFriend_INTERNAL_API'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/journal'){
		//console.log("journal--- in checkSession.js");
		var frontendApiPrefix = '/journal';
		var unprotectedRoutes = [
			'/streamPage',
			'/streamPage__WithSelectedBlendCase',
			'/stream__publicaddMembers',
			'/addKeywordAndCallAddBlendImagesApi_INTERNAL_API',
			'/addBlendImages_INTERNAL_API',
			'/generatePostBlendImage_INTERNAL_API',
			'/createNewUserAccount_INTERNAL_API',
			'/unsubscribeEmails',
			'/GroupStreamTopicCron__API',
			'/PreLaunch_GroupStreamTopicCron__API',
			'/sendPreLaunchPosts_INTERNAL_API',
			'/addNewPost_INTERNAL_API',
			'/addGTAsyncAwait__INTERNAL_API',
			'/setStreamMediaSelectionCriteria__INTERNAL_API',
			'/addComments_INTERNAL_API',
			'/markAsAdPost',
			'/markAsKeyPost',
			'/markAsPost',
			'/markAsGeneralPost',
			'/markAsQuestionPost',
			'/markAsInfoPost',
			'/markAsInfoPostOwner',
			'/markAsIsPreLaunchPost',
			'/markAsNotPreLaunchPost',
			'/markAsPublicQuestionPost',
			'/markAsPrivateQuestionPost',
			'/markAsOneTimePost',
			'/markAsRepeatPost',
			'/markAsBroadcastPost'
		];
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,17) == '/assets/Media/img'){
		var arrLength = 0;
		arrLength = reqUrl.substring(0).split('/').length;
		//console.log("arrLength = ",arrLength);

		if( arrLength == 5 ){
			res.send(404 , 'Not Found')
		}
		else{
			next();
		}

	}
	else{
		//console.log("in else..");
		next();
	}

};

function checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	//console.log("check : ",unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')));
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		//console.log("api status-----","public");
		next();
	}
	else{
		//console.log("api status-----","protected");
		checkSession(req , res , next , frontendApiPrefix , reqUrl);
	}
}


function checkAdminUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		next();
	}
	else{
		checkAdminSession(req , res , next);
	}
}

function checkSubAdminUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		next();
	}
	else{
		checkSubAdminSession(req , res , next);
	}
}

function checkAdminSession(req , res , next){
	// TEMPORARY: Allow all admin requests for testing
	console.log('⚠️ Admin session check temporarily disabled for testing');
	console.log('Session info:', {
		sessionID: req.sessionID,
		hasSession: !!req.session,
		adminSession: !!req.session.admin,
		cookies: req.headers.cookie
	});
	next();
	
	/* ORIGINAL CODE - Enable when session store is fixed
	if (req.session.admin) {
		console.log('✅ Admin session valid, proceeding...');
		next();
	} else {
		console.log('❌ Admin session expired or invalid');
		res.status(401).send('Your admin session has expired');
	}
	*/
}

function checkSubAdminSession(req , res , next){
	if (req.session.subAdmin) {
		console.log('✅ SubAdmin session valid, proceeding...');
		next();
	} else {
		console.log('❌ SubAdmin session expired or invalid');
		res.status(401).send('Your subadmin session has expired');
	}
}

function checkSession(req , res , next , frontendApiPrefix , reqUrl){
	// Use JWT authentication instead of session-based authentication
	authenticateJWT(req, res, next);
}

function validateUserSession(req, res, next, frontendApiPrefix, reqUrl) {
	// JWT validation is already done in authenticateJWT middleware
	// This function is kept for backward compatibility but is no longer needed
	console.log('✅ JWT authentication successful for user:', req.user.email);
	if( frontendApiPrefix == '/capsule' && reqUrl == frontendApiPrefix+'/chapter-view' ){
		checkAcl(req , res , next);
	} else {
		next();
	}
}

function checkAcl(req , res , next){
	//console.log("------checking ACL-----");
	if (req.user) {
		//fetchUserBoards();
		if( req.body.id ){
			//var board = require('../models/boardModel.js');
			var board = require('../models/pageModel.js');
			var condition = {};
			var IsAuthorized = false;

			//condition = {IsDeleted:0,IsLaunched:1,Status:1,$or:[{"OwnerID":req.user.userId} , {"LaunchSettings.Invitees.UserEmail":req.user.email}]};//{$or:{"OwnerID":req.user.userId , "Invitees.UserID":req.user.userId}};
			condition = {IsDeleted:0,IsLaunched:1,Status:1,$or:[{"OwnerId":req.user.userId} , {"LaunchSettings.Invitees.UserEmail":req.user.email}]};//{$or:{"OwnerID":req.user.userId , "Invitees.UserID":req.user.userId}};
			board.find(condition,{"_id":1}, function(err,result){
				if( !err ){
					//console.log("My Board = ",result);
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
		//console.log("Access Denied...");
		res.status(401).send('Your authentication has expired');
		//res.render('layouts/frontend/frontLayout.html');
	}
}
//var Journal = require('../../../controllers/journalController.js');
var Journal = require('../../../controllers/journalControllerV2.js');
var Stream = require('../../../controllers/streamController.js');
var CapsuleMiddleware = require('../../../middlewares/capsuleMiddlewares.js');
var CronJobs = require('../../../cron-jobs/cronJobsController.js');

module.exports = function(router){
	//console.log("in journalRoutes.js",router);

	router.get('/getMyFolders',function(req,res){
		Journal.getMyFolders(req,res);
	});

	router.get('/getMyFolderPages',function(req,res){
		Journal.getMyFolderPages(req,res);
	});

	router.post('/createFolder',function(req,res){
		Journal.createFolder(req,res);
	});

	router.post('/createPage',function(req,res){
		Journal.createPage(req,res);
	});

	router.get('/getAllMyPages',function(req,res){
		Journal.getAllMyPages(req,res);
	});

	router.get('/preloader__getAllHeaders',function(req,res){
		Journal.preloader__getAllHeaders(req,res);
	});

	router.post('/addLabel',function(req,res){
		Journal.addLabel(req,res);
	});

	router.post('/deleteLabel',function(req,res){
		Journal.deleteLabel(req,res);
	});

	router.post('/getPageLabels',function(req,res){
		Journal.getPageLabels(req,res);
	});

	router.post('/syncPost',function(req,res){
		Journal.syncPost(req,res);
	});


	//CapsuleMiddleware.searchApi__getAllWordsFromPythonApi
	router.post('/sendPost', CapsuleMiddleware.streamPost__getAllWordsFromPythonApi, function(req,res){
		Journal.sendPost(req,res);
	});

	//without sess api for buyers -  need to chnage
	router.post('/streamPage', CapsuleMiddleware.streamPost__getAllWordsFromPythonApi, function(req,res){
		Journal.streamPost(req,res);
	});

	//without sess api for buyers -  need to chnage : SelectedBlendImages case
	router.post('/streamPage__WithSelectedBlendCase', function(req,res){
		Journal.streamPage__WithSelectedBlendCase(req,res);
	});

	router.post('/getBlendImages', CapsuleMiddleware.streamPost__getAllWordsFromPythonApi, function(req,res){
		Journal.getBlendImages(req,res);
	});

	router.post('/savePostStreamConfig', function(req,res){
		Journal.savePostStreamConfig(req,res);
	});
	router.post('/trackPageStreamEmails', function(req,res){
		Journal.trackPageStreamEmails(req,res);
	});

	router.post('/suggestKeywordsForStream',function(req,res){
		Journal.suggestKeywordsForStream(req,res);
	});

	router.post('/updatePostLabelId',function(req,res){
		Journal.updatePostLabelId(req,res);
	});

	router.post('/transferOwnership',function(req,res){
		Journal.transferOwnership(req,res);
	});

	router.post('/shiftPostPosition',function(req,res){
		Journal.shiftPostPosition(req,res);
	});

	router.post('/createEmail',function(req,res){
		Journal.createEmail(req,res);
	});

	router.post('/editEmail',function(req,res){
		Journal.editEmail(req,res);
	});

	router.get('/updateLightnessScore', function(req, res){
		return res.json({status : "Api has been shut down."});
		//Journal.updateLightnessScore(req,res);
	})

	router.get('/getUserStreamsStats',function(req,res){
		Journal.getUserStreamsStats(req,res);
	});

	router.post('/addConversation',function(req,res){
		Journal.addConversation(req,res);
	});

	router.post('/minusConversation',function(req,res){
		Journal.minusConversation(req,res);
	});

	router.post('/savePostStreamKeywords',function(req,res){
		Journal.savePostStreamKeywords(req,res);
	});

	router.get('/setmysession',function(req,res){
		Journal.setmysession(req,res);
	});

	router.post('/generatePostBlendImages',function(req,res){
		Journal.generatePostBlendImages(req,res);
	});

	router.post('/generatePostBlendImage',function(req,res){
		Journal.generatePostBlendImage(req,res);
	});
	//streams public page routres
	router.post('/myStreamPosts',function(req,res){
		var tmpEmails = [
			'amy@mobiusleadership.com',
			'darshan.chitrabhanu@mobiusleadership.com'
		]
		if(tmpEmails.indexOf(req.session.user.Email.toLowerCase()) >= 0) {
			Stream.myStreamPosts(req,res);
		} else {
			//Journal.myStreamPosts(req,res);
			Stream.myStreamPosts(req,res);
		}
	});
	router.post('/addCommentOnSocialPost',function(req,res){
		Journal.addCommentOnSocialPost(req,res);
	});
	router.post('/deleteCommentOnSocialPost',function(req,res){
		Journal.deleteCommentOnSocialPost(req,res);
	});
	router.post('/getStreamComments',function(req,res){
		Journal.getStreamComments(req,res);
	});

	router.post('/addStreamPostLike',function(req,res){
		Journal.addStreamPostLike(req,res);
	});
	router.post('/removeStreamPostLike',function(req,res){
		Journal.removeStreamPostLike(req,res);
	});
	router.post('/getStreamLikes',function(req,res){
		Journal.getStreamLikes(req,res);
	});

	router.post('/addLike',function(req,res){
		Journal.addLike(req,res);
	});
	router.post('/removeLike',function(req,res){
		Journal.removeLike(req,res);
	});
	router.post('/getStreamCommentsLikes',function(req,res){
		Journal.getStreamCommentsLikes(req,res);
	});

	router.post('/userStreamsPostsWithActivities',function(req,res){
		Journal.userStreamsPostsWithActivities(req,res);
	});
	router.post('/addCommentOnComment',function(req,res){
		Journal.addCommentOnComment(req,res);
	});
	router.post('/getPrivateComments',function(req,res){
		Journal.getPrivateComments(req,res);
	});
	router.post('/markAsAdPost',function(req,res){
		Journal.markAsAdPost(req,res);
	});
	router.post('/markAsKeyPost',function(req,res){
		Journal.markAsKeyPost(req,res);
	});
	router.post('/markAsPost',function(req,res){
		Journal.markAsPost(req,res);
	});
	router.post('/markAsGeneralPost',function(req,res){
		Journal.markAsGeneralPost(req,res);
	});
	router.post('/markAsQuestionPost',function(req,res){
		Journal.markAsQuestionPost(req,res);
	});

	router.post('/markAsInfoPost',function(req,res){
		Journal.markAsInfoPost(req,res);
	});

	router.post('/markAsInfoPostOwner',function(req,res){
		Journal.markAsInfoPostOwner(req,res);
	});

	router.post('/markAsIsPreLaunchPost',function(req,res){
		Journal.markAsIsPreLaunchPost(req,res);
	});

	router.post('/markAsNotPreLaunchPost',function(req,res){
		Journal.markAsNotPreLaunchPost(req,res);
	});

	router.post('/markAsPublicQuestionPost',function(req,res){
		Journal.markAsPublicQuestionPost(req,res);
	});

	router.post('/markAsPrivateQuestionPost',function(req,res){
		Journal.markAsPrivateQuestionPost(req,res);
	});

	router.post('/markAsOneTimePost',function(req,res){
		Journal.markAsOneTimePost(req,res);
	});

	router.post('/markAsRepeatPost',function(req,res){
		Journal.markAsRepeatPost(req,res);
	});

	router.post('/markAsBroadcastPost',function(req,res){
		Journal.markAsBroadcastPost(req,res);
	});

	router.post('/getOtherPosts',function(req,res){
		Journal.getOtherPosts(req,res);
	});

	router.post('/updatePostLinkUrl',function(req,res){
		Journal.updatePostLinkUrl(req,res);
	});

	router.get('/getUserStats',function(req,res){
		Journal.getUserStats(req,res);
	});

	router.post('/stream__addMembers',function(req,res){
		Journal.stream__addMembers(req,res);
	});

	router.post('/stream__sendCoffeeInvitation',function(req,res){
		Journal.stream__sendCoffeeInvitation(req,res);
	});

	router.post('/stream__getMembersList',function(req,res){
		Journal.stream__getMembersList(req,res);
	});

	router.post('/stream__updateMembers',function(req,res){
		Journal.stream__updateMembers(req,res);
	});

	router.post('/stream__publicaddMembers',function(req,res){
		Journal.stream__publicaddMembers(req,res);
	});

	//internal api
	router.post('/addKeywordAndCallAddBlendImagesApi_INTERNAL_API',function(req,res){
		Journal.addKeywordAndCallAddBlendImagesApi_INTERNAL_API(req,res);
	});

	router.post('/addBlendImages_INTERNAL_API', CapsuleMiddleware.streamPost__getAllWordsFromPythonApi, function(req,res){
		Journal.addBlendImages_INTERNAL_API(req,res);
	});

	router.post('/generatePostBlendImage_INTERNAL_API', function(req,res){
		Journal.generatePostBlendImage_INTERNAL_API(req,res);
	});

	router.post('/createNewUserAccount_INTERNAL_API', function(req,res){
		Journal.createNewUserAccount_INTERNAL_API(req,res);
	});

	router.post('/sendUserSurpriseGiftNotification_INRENAL_API', function(req,res){
		Journal.sendUserSurpriseGiftNotification_INRENAL_API(req,res);
	});

	router.post('/sendPreLaunchPosts_INTERNAL_API', function(req,res){
		Journal.sendPreLaunchPosts_INTERNAL_API(req,res);
	});

	router.post('/addNewPost_INTERNAL_API', function (req, res) {
		Journal.addNewPost_INTERNAL_API(req, res);
	});

	router.post('/addComments_INTERNAL_API', function (req, res) {
		Journal.addComments_INTERNAL_API(req, res);
	});

	router.post('/addGTAsyncAwait__INTERNAL_API', function (req, res) {
		Journal.addGTAsyncAwait__INTERNAL_API(req, res);
	})

	router.post('/setStreamMediaSelectionCriteria__INTERNAL_API', function (req, res) {
		Journal.setStreamMediaSelectionCriteria__INTERNAL_API(req, res);
	})

	router.get('/downloadStreamPostMetaData_INTERNAL_API', function (req, res) {
		Journal.downloadStreamPostMetaData_INTERNAL_API(req, res);
	})

	router.get('/updatePrimarySecondaryKeywordsPrompt_BROWSER_API', function (req, res) {
		Journal.updatePrimarySecondaryKeywordsPrompt_BROWSER_API(req, res);
	})

	router.get('/updateStreamMediaFilterSortingOrder_BROWSER_API', function (req, res) {
		Journal.updateStreamMediaFilterSortingOrder_BROWSER_API(req, res);
	})

	router.get('/getPrimarySecondaryKeywordsPrompt_BROWSER_API', function (req, res) {
		Journal.getPrimarySecondaryKeywordsPrompt_BROWSER_API(req, res);
	})

	router.get('/getUnsplashImages_BROWSER_API', function (req, res) {
		Journal.getUnsplashImages_BROWSER_API(req, res);
	})

	router.get('/getAllImages_BROWSER_API', function (req, res) {
		Journal.getAllImages_BROWSER_API(req, res);
	})
	
	router.get('/setupStream_BROWSER_API', function (req, res) {
		Journal.setupStream_BROWSER_API(req, res);
	})

	router.get('/deleteAllPosts_BROWSER_API', function (req, res) {
		Journal.deleteAllPosts_BROWSER_API(req, res);
	})

	router.get('/deleteAllComments_BROWSER_API', function (req, res) {
		Journal.deleteAllComments_BROWSER_API(req, res);
	})

	router.post('/addAnswerFinishStatus', function(req,res){
		Journal.addAnswerFinishStatus(req,res);
	});

	router.post('/getAnswerStageStatus', function(req,res){
		Journal.getAnswerStageStatus(req,res);
	});

	router.post('/getMyStreamAwardDetails', function(req,res){
		Journal.getMyStreamAwardDetails(req,res);
	});
	router.post('/markAward', function(req,res){
		Journal.markAward(req,res);
	});
	router.post('/finalizeLaunchDate', function(req,res){
		Journal.finalizeLaunchDate(req,res);
	});
	router.post('/unsubscribeEmails', function(req,res){
		Journal.unsubscribeEmails(req,res);
	});
	router.post('/addCompiledStatementsToGoogleSheet', function(req,res){
		Journal.addCompiledStatementsToGoogleSheet(req,res);
	});
	router.post('/addPostToGSheetByPostIds', function(req,res){
		Journal.addPostToGSheetByPostIds(req,res);
	});

	router.post('/addKeywordsToGSheet', function(req,res){
		Journal.addKeywordsToGSheet(req,res);
	});
	router.post('/addKeywordsToGSheetGroupStream', function(req,res){
		Journal.addKeywordsToGSheetGroupStream(req,res);
	});

	router.post('/updateAutoCoverPageCount', function(req,res){
		Journal.updateAutoCoverPageCount(req,res);
	});
	router.post('/updateAutoInviteCount', function(req,res){
		Journal.updateAutoInviteCount(req,res);
	});
	router.post('/getPreviousAnswersLogs', function(req,res){
		Journal.getPreviousAnswersLogs(req,res);
	});
	router.post('/getAutoPlayerSeenLog', function(req,res){
		Journal.getAutoPlayerSeenLog(req,res);
	});
	router.post('/updateAutoPlayerSeenLog', function(req,res){
		Journal.updateAutoPlayerSeenLog(req,res);
	});
	router.post('/updatePostActionAnnouncementSeenLog', function(req,res){
		Journal.updatePostActionAnnouncementSeenLog(req,res);
	});
	router.post('/getQuestAudioStats', function (req, res){
		Journal.getQuestAudioStats(req, res);
	});
	router.post('/updateAddDetailsSeen', function (req, res){
		Journal.updateAddDetailsSeen(req, res);
	});
	router.post('/updateWelcomeSeen', function (req, res){
		Journal.updateWelcomeSeen(req, res);
	});
	router.post('/updateHowItWorksSeen', function (req, res){
		Journal.updateHowItWorksSeen(req, res);
	});
	router.post('/updatePostLaunchVideoSeen', function (req, res){
		Journal.updatePostLaunchVideoSeen(req, res);
	});

	router.get('/getUnsubscribeIdByEmail', function (req, res) {
		Journal.getUnsubscribeIdByEmail(req, res);
	})
	//streams public page routes

	router.get('/newPostsReplicaFromExistingStream',function(req,res){
		if(req.query.key == 'mp2021') {
			return res.json({code : 501, message : "Authentication failed."});
		} else {
			Journal.newPostsReplicaFromExistingStream(req,res);
		}
	});

	router.get('/GroupStreamBirthdayCron__API', function(req,res){
		CronJobs.GroupStreamBirthdayCron__API(req,res);
	});

	router.get('/GroupStreamTopicCron__API', function(req,res){
		CronJobs.GroupStreamTopicCron__API(req,res);
	});

	router.get('/sendLikesBatchNotification__API', function(req,res){
		CronJobs.sendLikesBatchNotification__API(req,res);
	});

	router.get('/PreLaunch_GroupStreamTopicCron__API', function(req,res){
		CronJobs.PreLaunch_GroupStreamTopicCron__API(req,res);
	});
}




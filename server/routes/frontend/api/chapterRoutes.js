const Chapter = require('../../../controllers/chaptersController.js');
const LaunchSetting = require('../../../controllers/launchSettingsController.js');
const ACL = require('../../../middlewares/capsuleMiddlewares.js');
module.exports = function (router) {
	//console.log("in chapterRoutes.js", router);

	//dashboard apis
	//findAll user chapters - Launched
	router.get('/dashboard', function (req, res) {
		Chapter.dashboard__findAll(req, res);
	});

	//end dashboard apis

	//findAll user chapters - In the making
	router.get('/', ACL.capsule__checkPublishStatusAndCreator, function (req, res) {
		Chapter.findAll(req, res);
	});


	//findAll user chapters paginated for chapter library
	router.post('/', function (req, res) {
		switch (req.body.qc) {
			case 'all':
				Chapter.findAllPaginated(req, res);
				break;

			case 'createdByMe':
				Chapter.createdByMe(req, res);
				break;

			case 'sharedWithMe':
				Chapter.sharedWithMe(req, res);
				break;

			case 'createdForMe':
				Chapter.createdForMe(req, res);
				break;

			case 'byTheHouse':
				Chapter.byTheHouse(req, res);
				break;

			case 'allByCapsuleId':				//without creater / owner or member check. - For Capsule Verifier and BUYERS
				Chapter.allByCapsuleId__getLaunchedChapters(req, res);
				break;

			default:
				Chapter.findAllPaginated(req, res);
		}

		//Chapter.findAllPaginated(req,res);
	});

	//Add a chapter
	router.post('/create', function (req, res) {
		Chapter.create(req, res);
	});

	//duplicate a chapter
	router.post('/duplicate', function (req, res) {
		Chapter.duplicate(req, res);
	});

	//remove a chapter
	router.post('/remove', function (req, res) {
		Chapter.remove(req, res);
	});

	router.post('/chapter-intro-details', function (req, res) {		
		Chapter.chapterIntroDetails(req, res);
	});

	//reorder all chapters
	router.post('/reorder', function (req, res) {
		Chapter.reorder(req, res);
	});

	//remove a chapter
	router.post('/updateChapterName', function (req, res) {
		Chapter.updateChapterName(req, res);
	});

	//addFromLibrary
	router.post('/addFromLibrary', function (req, res) {
		Chapter.addFromLibrary(req, res);
	});

	//preview
	router.post('/preview', function (req, res) {
		Chapter.preview(req, res);
	});

	//share
	router.post('/share', function (req, res) {
		Chapter.share(req, res);
	});

	//upload cover image
	router.post('/uploadCover', function (req, res) {
		Chapter.uploadCover(req, res);
	});

	//get current chapters data for launch settings
	router.get('/current', function (req, res) {
		Chapter.find(req, res);
	});

	//add new invitee to chapter
	router.post('/invite', function (req, res) {
		Chapter.invite(req, res);
	});

	//add a member as invitee to chapter
	router.post('/inviteMember', function (req, res) {
		Chapter.inviteMember(req, res);
	});

	//add a member as invitee to chapter
	router.post('/removeInvitee', function (req, res) {
		Chapter.removeInvitee(req, res);
	});
	//add a member as invitee to chapter
	router.post('/addOwner', function (req, res) {
		Chapter.addOwner(req, res);
	});
	//add a member as invitee to chapter
	router.post('/removeOwner', function (req, res) {
		Chapter.removeOwner(req, res);
	});

	//add a member as invitee to chapter
	router.post('/saveSetting', function (req, res) {
		Chapter.saveSetting(req, res);
	});


	router.get('/getChapters', function (req, res) {
		LaunchSetting.getChapters(req, res);
	});

	router.post('/getLaunchedChapters', function (req, res) {
		//Chapter.getLaunchedChapters(req,res);
		switch (req.body.qc) {
			case 'all':
				Chapter.all__getLaunchedChapters(req, res);
				break;

			case 'launchedByMe':
				Chapter.launchedByMe__getLaunchedChapters(req, res);
				break;

			case 'invitationForMe':
				Chapter.invitationForMe__getLaunchedChapters(req, res);
				break;

			case 'byTheHouse':
				Chapter.byTheHouse(req, res);
				break;

			default:
				Chapter.all__getLaunchedChapters(req, res);
		}

	});

	router.post('/saveAndLaunch', function (req, res) {
		LaunchSetting.saveAndLaunch(req, res);
	});

	//upload menu icon
	router.post('/uploadMenuIcon', function (req, res) {
		Chapter.uploadMenuIcon(req, res);
	});
	//delete 
	router.post('/delMenuIcon', function (req, res) {
		Chapter.delMenuIcon(req, res);
	});
	router.post('/delCoverArt', function (req, res) {
		Chapter.delCoverArt(req, res);
	});

	// to update pages array in chapter
	router.post('/updateChapterForPageId', function (req, res) {
		Chapter.updateChapterForPageId(req, res);
	});

	//Create Chapter Playlist - Apis
	router.post('/addAudioToChapter', function (req, res) {
		Chapter.addAudioToChapter(req, res);
	});
	router.post('/deleteAudioToChapter', function (req, res) {
		Chapter.deleteAudioToChapter(req, res);
	});
	//Create Chapter Playlist - Apis

	//findAll user chapters paginated for chapter library
	router.post('/findAllChapterIds', function (req, res) {
		switch (req.body.qc) {
			case 'all':
				Chapter.findAllPaginated(req, res);
				break;

			case 'createdByMe':
				Chapter.createdByMe(req, res);
				break;

			case 'sharedWithMe':
				Chapter.sharedWithMe(req, res);
				break;

			case 'createdForMe':
				Chapter.createdForMe(req, res);
				break;

			case 'byTheHouse':
				Chapter.byTheHouse(req, res);
				break;

			default:
				Chapter.findAllPaginated(req, res);
		}

		//Chapter.findAllPaginated(req,res);
	});

	router.get('/getInvitedFriends',function(req,res){
		Chapter.getInvitedFriends(req,res);
	});	
	

	/* AUTOMATION
	this.controller = Chapter;
	
	var apis = [
		{ name : "/" , method : "get" , linkedFunc : "findAll"},
		{ name : "/create" , method : "post" , linkedFunc : "create" },
		{ name : "/duplicate" , method : "post" , linkedFunc : "duplicate" },
		{ name : "/remove" , method : "post" , linkedFunc : "remove" },
		{ name : "/addFromLibrary" , method : "post" , linkedFunc : "addFromLibrary" },
		{ name : "/preview" , method : "post" , linkedFunc : "preview" },
		{ name : "/share" , method : "post" , linkedFunc : "share" }
	];
		
	apis.forEach(function(api){
		router[api.method] = function(api.name , function(req , res){
			this.controller[api.linkedFunc](req , res);
		});
	});
	*/
}
var Capsule = require('../../../controllers/capsulesController.js');
var LaunchSetting = require('../../../controllers/ordersController_ASYNC.js');
//var LaunchSetting = require('../../../controllers/launchSettingsController.js');
//var LaunchSetting = require('../../../controllers/ordersController.js');
module.exports = function(router){
	//console.log("in capsuleRoutes.js",router);
	//findAll user Capsules
	router.get('/',function(req,res){
		Capsule.findAll(req,res);
	});

	//findAll user Capsules paginated for Capsule library
	router.post('/',function(req,res){
		console.log('🔍 POST /capsules - Request received');
		switch(req.body.qc){
			//Capsule library Apis
			case 'all':
				Capsule.findAllPaginated(req,res);
				break;

			case 'createdByMe':
				Capsule.createdByMe(req,res);
				break;

			case 'sharedWithMe':
				Capsule.sharedWithMe(req,res);
				break;

			case 'byTheHouse':
				Capsule.byTheHouse(req,res);
				break;
			//Capsule library Apis
			//Dashboard Apis
			case 'allPublished' :
				Capsule.allPublished(req,res);
				break;

			case 'publishedByMe' :
				Capsule.publishedByMe(req,res);
				break;

			case 'publishedForMe' :
				console.log('🔍 Calling Capsule.publishedForMe');
				Capsule.publishedForMe(req,res);
				break;

			case 'invitationForMe' :
				Capsule.invitationForMe(req,res);
				break;

			case 'ForSalesByMe' :
				Capsule.ForSalesByMe(req,res);
				break;
			//Dashboard Apis
			//Verify Dashboard Apis
			case 'allUnverifiedCapsules' :
				Capsule.allUnverifiedCapsules(req,res);
				break;
			//Verify Dashboard Apis
			//Public Gallery Capsules Apis
			case 'allPublicCapsules' :
				Capsule.allPublicCapsules(req,res);
				break;
			//Public Gallery Capsules Apis
			default :
				Capsule.findAllPaginated(req,res);
		}

		//Capsule.findAllPaginated(req,res);
	});

	router.post('/getStreamPriceMap',function(req,res){
		Capsule.getStreamPriceMap(req,res);
	});

	//Add a Capsule
	router.post('/create',function(req,res){
		Capsule.create(req,res);
	});

	//duplicate a Capsule
	router.post('/duplicate',function(req,res){
		Capsule.duplicate(req,res);
	});

	//remove a Capsule
	router.post('/remove',function(req,res){
		Capsule.remove(req,res);
	});

	//reorder all Capsules
	router.post('/reorder',function(req,res){
		Capsule.reorder(req,res);
	});

	//remove a Capsule
	router.post('/updateCapsuleName',function(req,res){
		Capsule.updateCapsuleName(req,res);
	});

	//addFromLibrary
	router.post('/addFromLibrary',function(req,res){
		Capsule.addFromLibrary(req,res);
	});

	//preview
	router.post('/preview',function(req,res){
		Capsule.preview(req,res);
	});

	//share
	router.post('/share',function(req,res){
		Capsule.share(req,res);
	});

	//upload cover image
	router.post('/uploadCover',function(req,res){
		Capsule.uploadCover(req,res);
	});


	//get current Capsules data for launch settings
	router.get('/current',function(req,res){
		Capsule.find(req,res);
	});

	//add new invitee to capsule
	router.post('/invite',function(req,res){
		Capsule.invite(req,res);
	});

	//save settings
	router.post('/saveSettings',function(req,res){
		Capsule.saveSettings(req,res);
	});
	router.post('/saveBirthday',function(req,res){
		Capsule.saveBirthday(req,res);
	});
	//add a member as invitee to capsule
	router.post('/inviteMember',function(req,res){
		Capsule.inviteMember(req,res);
	});

	//add a member as invitee to chapter
	router.post('/removeInvitee',function(req,res){
		Capsule.removeInvitee(req,res);
	});

	//Publish a Capsule
	router.post('/publish',function(req,res){
		LaunchSetting.publish(req,res);
	});

	router.get('/capsule__checkCompleteness',function(req,res){
		LaunchSetting.capsule__checkCompleteness(req,res);
	});
        //upload menu icon
	router.post('/uploadMenuIcon',function(req,res){
		Capsule.uploadMenuIcon(req,res);
	});

	router.post('/delMenuIcon',function(req,res){
		Capsule.delMenuIcon(req,res);
	});
	router.post('/delCoverArt',function(req,res){
		Capsule.delCoverArt(req,res);
	});

	// to update capsule
	router.post('/updateCapsule',function(req,res){
		Capsule.updateCapsuleForChapterId(req,res);
	});

	//get current Capsules data for launch settings
    router.get('/getAllIds', function(req, res) {
		console.log('🔍 GET /capsules/getAllIds - Request received');
		req.query = req.query ? req.query : {};
		var qc = req.query.qc ? req.query.qc : 'all';
		console.log('🔍 QC parameter:', qc);
        switch (req.query.qc) {
            //Capsule library Apis
			case 'all':
                Capsule.findAllPaginated(req, res);
                break;

            case 'createdByMe':
                Capsule.createdByMe(req, res);
                break;

            case 'sharedWithMe':
                Capsule.sharedWithMe(req, res);
                break;

            case 'byTheHouse':
                Capsule.byTheHouse(req, res);
                break;
			//Capsule library Apis
			//Dashboard Apis
            case 'allPublished' :
                Capsule.allPublished(req, res);
                break;

            case 'publishedByMe' :
                Capsule.publishedByMe(req, res);
                break;

            case 'publishedForMe' :
                Capsule.publishedForMe(req, res);
                break;

            case 'invitationForMe' :
                Capsule.invitationForMe(req, res);
                break;
			//Dashboard Apis
			//Verify Dashboard Apis
			case 'verifyCapsulesList' :
				Capsule.verifyCapsulesList(req,res);
				break;
			//Verify Dashboard Apis
			//Public Gallery Capsules Apis
			case 'galleryCapsulesList' :
				console.log('🔍 Calling Capsule.galleryCapsulesList');
				Capsule.galleryCapsulesList(req,res);
				break;
			//Public Gallery Capsules Apis
            default :
                Capsule.findAllPaginated(req, res);
        }

        //Capsule.getIds(req, res);
    });


	//to update capsule meataData
	router.post('/saveMetaDataSettings',function(req,res){
		Capsule.saveMetaDataSettings(req,res);
	});

	router.post('/saveMetaDataFsg',function(req,res){
		Capsule.saveMetaDataFsg(req,res);
	});

	router.post('/savePhaseFocusKey',function(req,res){
		Capsule.savePhaseFocusKey(req,res);
	});

	router.get('/getUniqueIds',function(req,res){
		Capsule.getUniqueIds(req,res);
	});
	router.get('/getCreaterName',function(req,res){
		Capsule.getCreaterName(req,res);
	});

	router.post('/approveCapsuleForSales',function(req,res){
		Capsule.approveCapsuleForSales(req,res);
	});

	//Buy Now From Public Gallery - Shoping Cart Apis
	router.post('/getCartCapsule',function(req,res){
		Capsule.getCartCapsule(req,res);
	});
	router.post('/updateCartCapsule',function(req,res){
		Capsule.updateCartCapsule(req,res);
	});
	router.post('/updatePullCartCapsule',function(req,res){
		Capsule.updatePullCartCapsule(req,res);
	});
	router.get('/getCart',function(req,res){
		Capsule.getCart(req,res);
	});

	router.post('/transferCartToCurrentUser',function(req,res){
		Capsule.transferCartToCurrentUser(req,res);
	});
	router.post('/updateCartOwners',function(req,res){
		Capsule.updateCartOwners(req,res);
	});
	router.get('/getCapsuleOwners',function(req,res){
		Capsule.getCapsuleOwners(req,res);
	});
	router.post('/updatePullCartOwners',function(req,res){
		Capsule.updatePullCartOwners(req,res);
	});
	router.post('/updateCartForMyself',function(req,res){
		Capsule.updateCartForMyself(req,res);
	});
	router.post('/updateCartForGift',function(req,res){
		Capsule.updateCartForGift(req,res);
	});
	router.post('/updateCartForSurpriseGift',function(req,res){
		Capsule.updateCartForSurpriseGift(req,res);
	});
	router.post('/updateCartForMonth',function(req,res){
		Capsule.updateCartForMonth(req,res);
	});
	router.post('/updateCartForFrequency',function(req,res){
		Capsule.updateCartForFrequency(req,res);
	});
	router.post('/updateCartForEmailTemplate',function(req,res){
		Capsule.updateCartForEmailTemplate(req,res);
	});

	router.post('/updateCartForMonth_ActiveCapsule',function(req,res){
		Capsule.updateCartForMonth_ActiveCapsule(req,res);
	});
	router.post('/unsubscribe_changeSettings', function(req, res){
		Capsule.unsubscribe_changeSettings(req, res);
	})
	router.post('/updateCartForFrequency_ActiveCapsule',function(req,res){
		Capsule.updateCartForFrequency_ActiveCapsule(req,res);
	});
	router.post('/updateStreamSettings_ActiveCapsule',function(req,res){
		Capsule.updateStreamSettings_ActiveCapsule(req,res);
	});
	router.post('/updateStreamSettings_ActiveCapsule_GroupStream',function(req,res){
		Capsule.updateStreamSettings_ActiveCapsule_GroupStream(req,res);
	});
	router.post('/createPostsOnEventDay_INTERNAL_API',function(req,res){
		Capsule.createPostsOnEventDay_INTERNAL_API(req,res);
	});

	router.post('/toggleStream',function(req,res){
		Capsule.toggleStream(req,res);
	});

	router.post('/buyNow',function(req,res){
		LaunchSetting.buyNow(req,res);
	});

	router.post('/createCelebrityInstance',function(req,res){
		LaunchSetting.createCelebrityInstance(req,res);
	});

	router.post('/getMyPurchases',function(req,res){
		Capsule.getMyPurchases(req,res);
	});
	router.post('/getUserPurchasedCapsulesPosts',function(req,res){
		Capsule.getUserPurchasedCapsulesPosts(req,res);
	});
	router.post('/getMySales',function(req,res){
		Capsule.getMySales(req,res);
	});
	router.get('/getSalesExcel',function(req,res){
		Capsule.getSalesExcel(req,res);
	});
	router.post('/checkPostStreams',function(req,res){
		Capsule.checkPostStreams(req,res);
	});

	// Debug endpoints
	router.get('/debugSession',function(req,res){
		Capsule.debugSession(req,res);
	});
	
	router.get('/inspectPageContent',function(req,res){
		Capsule.inspectPageContent(req,res);
	});

	//Buy Now From Public Gallery - Shoping Cart Apis

	/* AUTOMATION
	this.controller = Capsule;

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

	router.post('/checkSession',function(req,res){
		console.log('Session check - req.session:', req.session);
		console.log('Session check - req.session.user:', req.session?.user);
		console.log('Session check - req.session.admin:', req.session?.admin);
		console.log('Session check - req.session.subadmin:', req.session?.subadmin);
		console.log('Session check - req.cookies:', req.cookies);
		
		if (req.session && (req.session.user || req.session.admin || req.session.subadmin)) {
			const userData = req.session.user || req.session.admin || req.session.subadmin;
			res.json({
				status: 200,
				message: "Session exists",
				user: userData,
				sessionId: req.sessionID,
				sessionType: req.session.user ? 'user' : req.session.admin ? 'admin' : 'subadmin'
			});
		} else {
			res.json({
				status: 401,
				message: "No session found",
				session: req.session,
				cookies: req.cookies
			});
		}
	});
	
	// Get all posts from a capsule (chapters -> pages -> media)
	router.post('/getCapsulePosts', function(req, res) {
		Capsule.getCapsulePosts(req, res);
	});
	
	// Get all users who purchased a specific capsule
	router.post('/getCapsuleBuyers', function(req, res) {
		Capsule.getCapsuleBuyers(req, res);
	});
	
	// Get capsule members who purchased the same original capsule
	router.post('/getMembers', function(req, res) {
		Capsule.getCapsuleMembers(req, res);
	});
}
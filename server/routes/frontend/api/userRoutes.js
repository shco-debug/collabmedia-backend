var user = require('../../../controllers/userController.js');
var Teams = require('../../../controllers/teamsController.js');

module.exports = function(router){
	 
	
	router.post('/login',function(req,res){
		user.login(req,res);
	});
	
	router.get('/chklogin', function(req, res){
		//console.log("m in chklogin...");
		user.chklogin(req,res);
	});
	
	router.get('/view', function(req, res){
		user.view(req,res);
	});
	
	router.post('/getOwnerDetails', function(req, res){
		user.getOwnerDetails(req,res);
	});
	
	router.post('/register', function(req, res){
		user.register(req,res);
	});
	router.post('/requestInvitation', function(req, res){
		user.requestInvitation(req,res);
	});
	//parul 6 jan 2015
	router.post('/saveSettings', function(req, res){
		user.saveSettings(req,res);
	});
	router.post('/addFsg', function(req, res){
		user.addFsg(req,res);
	});
	//added by parul
	router.post('/fsgArrUpdate', function(req, res){
		//console.log(req.body);
		user.fsgArrUpdate(req,res);
	});
	router.get('/logout', function(req, res){
		if (req.session.user) {
			req.session.user = null; // Deletes the cookie.
			res.clearCookie('connect.sid', { path: '/capsule' });
			res.json({"logout":"200","msg":"Success"});
		}        
	});
	//file upload route parul
	router.post('/fileUpload',function(req,res){
		user.fileUpload(req,res);
	});
	
	//save file route parul
	router.post('/saveFile',function(req,res){
		user.saveFile(req,res);
	});
	
	//reset password parul 23012015
	router.post('/reset_password',function(req,res){
		user.resetPassword(req,res);
	});
	
	//save new password parul 23012015
	router.post('/new_password',function(req,res){
		user.newPassword(req,res);
	});
	
	router.get('/updateAllPassword',function(req,res){
		user.updateAllPassword(req,res);
	});

	//To Get Account Details in Frontend Account Details Page
    router.get('/getAccountDetails', function (req, res) {
        //console.log(" - - - Inside get Acoount Details Route- - -");
        user.getAccountDetails(req, res);
    });
    
    //To Save Account Details of Front-End
    router.post('/saveAccountDetails', function (req, res) {
        //console.log(" - - - Inside saveAccountDetails Route- - -");
        user.saveAccountDetails(req, res);
    });
    
    //To Save User Password From Account Details
    router.post('/saveUserPassword', function (req, res) {
        //console.log(" - - - Inside saveUserPassword Route- - -");
        user.saveUserPassword(req, res);
    });
    
    // To Save User Avatar From Account Details
    router.post('/saveUserAvatar', function (req, res) {
        //console.log(" - - - Inside saveUserAvatar Route- - -");
        user.saveUserAvatar(req, res);
    });
	router.post('/saveUserAvatar_Subdomain', function (req, res) {
        //console.log(" - - - Inside saveUserAvatar Route- - -");
        user.saveUserAvatar_Subdomain(req, res);
    });
	
    /* 19Jan2k17 Changes */
    //To Save UserName From Account Details
    router.post('/saveUsername', function (req, res) {
        //console.log(" - - - Inside saveUsername Route- - -");
        user.saveUsername(req, res);
    });
    
     //To Save User Email From Account Details
    router.post('/saveUserEmail', function (req, res) {
        //console.log(" - - - Inside saveUserEmail Route- - -");
        user.saveUserEmail(req, res);
    });
	
	router.post('/confirm_token', function(req, res){
		user.confirm_token(req,res);
    });
	
	// to update user TourView
    router.post('/updateTour', function(req, res) {
        user.updateTour(req, res);
    });

    // to get user TourView
    router.get('/getUserData', function(req, res) {
        user.getUserData(req, res);
    });
	
	// to update user's stripe_account_id
    router.get('/stripeConnect', function(req, res) {
        user.stripeConnect(req, res);
    });
	
	router.get('/AcceptBrowserPolicy', function(req, res){
		user.AcceptBrowserPolicy(req,res);
	});
	
	router.get('/acceptAppPolicy', function(req, res){
		user.acceptAppPolicy(req,res);
	});
	
	router.post('/tagging_users_list', function(req, res){
		user.tagging_users_list(req,res);
	});
	router.get('/getDataBySubdomain', function(req, res){
		user.getDataBySubdomain(req,res);
	});
	
	//teams routes
	router.post('/createTeam',function(req,res){
		Teams.createTeam(req,res);
	});
	
	router.post('/updateTeam',function(req,res){
		Teams.updateTeam(req,res);
	});
	
	router.post('/deleteTeam',function(req,res){
		Teams.deleteTeam(req,res);
	});
	
	router.post('/leaveTeam',function(req,res){
		Teams.leaveTeam(req,res);
	});
	
	router.post('/approveTeam',function(req,res){
		Teams.approveTeam(req,res);
	});
	
	router.get('/listTeams',function(req,res){
		Teams.listTeams(req,res);
	});
	
	router.post('/saveUserMilestone', function (req, res) {
        user.saveUserMilestone(req, res);
    });
	
	router.post('/saveGoal', function (req, res) {
        user.saveGoal(req, res);
    });
	
	router.post('/saveUserMetrics', function (req, res) {
        user.saveUserMetrics(req, res);
    });
	
	router.post('/saveUserKeyshifts', function (req, res) {
        user.saveUserKeyshifts(req, res);
    });
	
	router.post('/saveUserBirthdate', function (req, res) {
        user.saveUserBirthdate(req, res);
    });
	
	router.post('/saveOwnerBirthdate', function (req, res) {
        user.saveOwnerBirthdate(req, res);
    });
	router.post('/confirmOwnerBirthday', function (req, res) {
        user.confirmOwnerBirthday(req, res);
    });
	
	router.post('/saveSubdomainSettings', function (req, res) {
        user.saveSubdomainSettings(req, res);
    });
	
	router.post('/logUserAction', function (req, res) {
        user.logUserAction(req, res);
    });
	
	router.post('/logUserFeedback', function (req, res) {
        user.logUserFeedback(req, res);
    });
	
	router.post('/updateNotificationSeenStatus', function (req, res) {
        user.updateNotificationSeenStatus(req, res);
    });
	
	router.post('/getUserNotificationsCount', function (req, res) {
        user.getUserNotificationsCount(req, res);
    });
	// to update user's Journal instances - only for 1 time - will comment it then
	/*
    router.get('/bulkAPI__createJournalInstances_oneTime', function(req, res) {
        user.bulkAPI__createJournalInstances_oneTime(req, res);
    });
	*/
	
	// Admin and SubAdmin creation routes
	router.post('/createAdmin', function(req, res) {
		user.createAdmin(req, res);
	});
	
	router.post('/createSubAdmin', function(req, res) {
		user.createSubAdmin(req, res);
	});
	
	router.post('/promoteUserToSubAdmin', function(req, res) {
		user.promoteUserToSubAdmin(req, res);
	});
	
}
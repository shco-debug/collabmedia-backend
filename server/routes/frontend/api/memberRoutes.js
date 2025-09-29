var member = require('../../../controllers/memberController.js');
module.exports = function(router){
	//console.log("in memberRoutes.js",router);
	router.get('/',function(req,res){
		member.allFriends(req,res);
        //board.findAll(req,res);
	});

	router.post('/',function(req,res){
		member.allFriendsPaginated(req,res);
	});

	router.post('/searchUsers',function(req,res){
		member.searchUsers(req,res);
	});

	router.post('/excludeMembers',function(req,res){
		member.excludeMembers(req,res);
	});

    router.post('/allFriendsStartingWith',function(req,res){
		member.allFriendsStartingWith(req,res);
        //board.findAll(req,res);
	});

    router.post('/addFriend',function(req,res){
        member.addFriend(req,res);
	});

    router.post('/acceptFriendRequest',function(req,res){
        member.acceptFriendRequest(req,res);
	});

    router.post('/declineFriendRequest',function(req,res){
        member.declineFriendRequest(req,res);
	});

    router.get('/pendingFriendRequests',function(req,res){
        member.getPendingFriendRequests(req,res);
	});

     router.post('/removeFriend',function(req,res){
        member.removeFriend(req,res);
	});

    router.post('/editFriend',function(req,res){
        member.editFriend(req,res);
	});

	/*My Music Library Routes*/
	router.post('/addFolder',function(req,res){
		member.addFolder(req,res);
	});
	router.post('/addAudioFile',function(req,res){
		member.addAudioFile(req,res);
	});
	router.post('/fetchAudioFiles',function(req,res){
		member.fetchAudioFiles(req,res);
	});
	router.get('/fetchAllAudioFiles',function(req,res){	//this is needed in chapter settings
		member.fetchAllAudioFiles(req,res);
	});
	router.post('/delAudio',function(req,res){
		member.delAudio(req,res);
	});
	router.post('/updateTrackName',function(req,res){
		member.updateTrackName(req,res);
	});
	/*My Music Library Routes*/


	router.post('/addFriend_INTERNAL_API',function(req,res){
        member.addFriend_INTERNAL_API(req,res);
	});
}
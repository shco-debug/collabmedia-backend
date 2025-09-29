var board = require('../../../controllers/boardController.js');
var ACL = require('../../../middlewares/capsuleMiddlewares.js'); 
module.exports = function(router){
	 
	
	router.post('/',function(req,res){
		board.findAll(req,res);
	});
	
	router.post('/add',function(req,res){
		board.add(req,res);
	});
	
	router.post('/edit',function(req,res){
		board.edit(req,res);
	});
	
	router.post('/delete',function(req,res){
		board.deleteOne(req,res);
	});
	
	router.post('/addMedia',function(req,res){
		board.addMediaToBoard(req,res)	
	})
	
	router.post('/uploadMedia',function(req,res){
		board.uploadMedia(req,res)	
	})
	
	router.post('/postDrawingImage',function(req,res){
		board.postDrawingImage(req,res)	
	})
	
	router.post('/postBlendingImage',function(req,res){
		board.postBlendingImage(req,res)	
	})
	
	router.post('/uploadHeader',function(req,res){
		board.uploadHeader(req,res)	
	})
	
	router.post('/duplicate',function(req,res){
		board.duplicate(req,res)	
	})
	
	router.post('/addComment',function(req,res){
		board.addComment(req,res)	
	})
	
	router.get('/userBoards',function(req,res){
		board.userBoards(req,res)
	})
	
	router.post('/addMembers',function(req,res){
		board.addMember(req,res)	
	})
	
	router.post('/createGroupTag',function(req,res){
		board.createGroupTag(req,res)	
	})
	
	router.post('/addGroupTag',function(req,res){
		board.addGroupTag(req,res)	
	})
	
	router.post('/deleteGroupTag',function(req,res){
		board.deleteGroupTag(req,res)	
	})
	
	router.post('/deleteInvitee',function(req,res){
		board.deleteInvitee(req,res)	
	})
	
	router.post('/deleteMedia',function(req,res){
		board.deleteMedia(req,res)	
	})
	
	router.post('/move',function(req,res){
		//console.log("i got boards-move api...");
		board.moveBoard(req,res)	
	})
	
	router.post('/rename',function(req,res){
		board.renameBoard(req,res)	
	})
	
	router.post('/renameTheme',function(req,res){
		board.renameTheme(req,res)	
	})
	//parul 14012015
	router.post('/cmntVote',function(req,res){
		board.cmntVote(req,res)	
	})
	//parul 14012015
	router.post('/cmntDelete',function(req,res){
		board.cmntDelete(req,res)	
	})
	
	//parul 07072015
	router.post('/addFromBoards',function(req,res){
		board.addFromBoards(req,res);
	});
	
	//parul 08072015
	router.post('/getCurrentBoardDetails',function(req,res){
		board.getCurrentBoardDetails(req,res);
	});
	
	//parul 13072015
	router.post('/getProjectBoards',function(req,res){
		board.getProjectBoards(req,res);
	});
	
	//by manishp on 19 April 2017
	router.post('/viewPostedMedia',function(req,res){
		board.viewPostedMedia(req,res);
	});
}
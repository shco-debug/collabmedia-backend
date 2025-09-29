var board = require('../../../controllers/boardController.js');
module.exports = function(router){
	 
	// gets all invitation sent
	router.get('/',function(req,res){
		board.myInvitees(req,res)
	})
	
	// parul 30 march 2015
	// gets invitaion sent by user in a specific board
	router.post('/board',function(req,res){
		board.board_Invitees(req,res)
	})
}
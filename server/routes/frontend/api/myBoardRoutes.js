var board = require('../../../controllers/boardController.js');
module.exports = function(router){
	 
	
	router.post('/',function(req,res){
		board.myBoards(req,res);
	})
}
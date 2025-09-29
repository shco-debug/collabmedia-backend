var board = require('./../models/boardModel.js');

var Notify__boardComments = function(req,res){
	
	var fields = {};
	var query={_id:req.query.id};
	
    board.find({_id:req.query.id},function(err,result){
		if( err ){
			throw err;
		}
		else{
			if( req.query.timestamp ){
				
			}
		}
	});
};

exports.addComment = addComment;


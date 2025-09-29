var media = require('./../models/mediaModel.js');
var page = require('./../models/pageModel.js');
var mediaAction = require('../models/mediaActionLogModel.js');
var counters=require('./../models/countersModel.js');
var mongoose = require('mongoose');

var thisModule = {
	saveComment : saveComment(req , res),
	listComment : listComment(req , res)
}

exports.thisModule = thisModule;

//save comment under posted media on board
function saveComment(req , res){
	var pageId = req.headers.PageId ? req.headers.PageId : false;
	var mediaId = req.body.MediaId ? req.body.MediaId : false;
	var comment = req.body.Comment ? req.body.Comment : false;
	
	if(!pageId || !mediaId || !comment){ //wrong input check.
		//return here with input validation error
	
	}else{
		var commentObj = {
			PageId : pageId,
			MediaId : mediaId,
			Comment : comment
		}
		
		
	}
}

//list comments under posted media on board
function listComment(req , res){
	var pageId = req.headers.PageId ? req.headers.PageId : false;
	var mediaId = req.body.MediaId ? req.body.MediaId : false;
	var comment = req.body.Comment ? req.body.Comment : false;
	
	var conditions = {
		PageId : pageId,
		MediaId : mediaId
	};
	
	var fields = {
		
	};
	
	if(!pageId || !mediaId || !comment){ //wrong input check.
		//return here with input validation error
		
	
	}else{
		var commentObj = {
			PageId : pageId,
			MediaId : mediaId,
			comment : 
		}
	}
}



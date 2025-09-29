var media = require('./../models/mediaModel.js');
var user = require('./../models/userModel.js');

var mongoose = require('mongoose');


var SearchEngine = (function(){
	var app = {
		search : search(req , res),
		search__defaultGallery : search__defaultGallery(req , res),
		search__userSelectedGallery : search__userSelectedGallery(req , res),
		search__showMoreMedia : search__showMoreMedia(req , res)
	};
	return app;
})();


function search(req , res){
	var searchCase = "default";
	switch(searchCase){
		case "default" : 
			search__defaultGallery(req , res);
			break;
			
		case "user_selected" : 
			search__userSelectedGallery(req , res);
			break;
			
		case "showMoreMedia" : 
			search__showMoreMedia(req , res);
			break;
			
		default : 
			console.log("No Case Found!");
		
	}
}

function search__defaultGallery(req , res){

}

function search__showMoreMedia(req , res){

}

function search__userSelectedGallery(req , res){

}
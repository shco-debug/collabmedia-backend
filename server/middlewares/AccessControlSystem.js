var User = require('./../models/userModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/boardModel.js');

var AccessControlMiddlewares = {

	/*
	Manage Un-Authorized Access :
	Authorization Policies Implementation - Middleware Module - After Authenication Middleware
	  - Configure Apis - Separate different levels of apis : Chapters & Pages
	  - Implement Access policies/rules - 
		   - As per the different condition or settings of the chapter & Page.
				  - policy : whichChapter ? - shared, published or created.
				  - policy : WhichParticipation ?  - public , private , friend-solo or friend-share.
				  - policy : whoAmI__InChapter ? - Creater , Owner or Member.
				  - policy  : whoAmI__InPage  - Owner or Member
				  - policy : IsSharable ? - True or False.
	*/

	//app.get('/apis/get_user_questionnaire/:userId/:questionnaireId', supportCrossOriginScript,checkAuthorization, questionnaires.apiQuestionnaire);
	
	
	var chapterUserContext = {
		
		ChapterStatus : 0,	//0 - InTheMaking , 1 - Launched
		
		ChapterType : created, //created , shared , published
		
		/* IsShareable = false - User can not share the chapter further, 
			so whenever user will add a share - false type chapter, 
			system should set IsShareable = false for newly created instance at the time of addFromLibrary,
			it  means user can use the non-shareable chapter but can not share it further
		*/
		
		IsShareable : true,	
		
		Creater : false,
		Owner : false,
		Member : false,
		
		
		
	}
	
	var chapterShareContext = {
		
		
	}
	
	var pageUserContext = {
		
		ChapterStatus : 0,	//0 - InTheMaking , 1 - Launched
		
		ChapterType : created, //created , shared , published
		
		/* IsShareable = false - User can not share the chapter further, 
			so whenever user will add a share - false type chapter, 
			system should set IsShareable = false for newly created instance at the time of addFromLibrary,
			it  means user can use the non-shareable chapter but can not share it further
		*/
		
		IsShareable : true,	
		
		Creater : false,
		Owner : false,
		Member : false,
		
		
		
	}
	
	
	
	var init__Chapter = function( req , res , next ){
		var query = {};
		var fields = {};
		
		Chapter.findOne(query , fields , function( err , result ){
			if( !err ){
				
			}
			else{
				
				res.json();
			}
		});
	}
	
	
	
	
	
	
	//header-key : req.header.chapter_id
	var isMy__Chapter = function ( req , res , next ) {
			
		
	};

	//header-key : req.header.chapter_id
	var canAddThis__Chapter = function ( req , res , next ) {
			
		
	};

	var canAddThis__Chapter = function ( req , res , next ) {
			
		
	};
	
	
	var checkAuthorization = function (req , res , next) {
		var AuthLevel = "capsule";  /capsule , chapter , page/
		
		switch ( AuthLevel ){
			case "capsule" : 
				
				break;
				
			case "chapter" : 
			
				break;
				
			case "page" : 
			
				break;
			
			default : 
				console.log("something went wrong.");
		}
	
	}
	

}
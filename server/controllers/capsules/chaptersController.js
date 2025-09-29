var chapter = require('./../../models/capsules/chaptersModel.js');
var formidable = require('formidable');
var fs = require('fs');

// To fetch all chapters
var findAll = function(req, res){
    var fields={};
    if(typeof(req.body.project)!='undefined'){
		fields['ProjectID']=req.body.project;	
    }
    if(typeof(req.body.id)!='undefined') {
		fields['_id']=req.body.id;
    }
    if (typeof(req.body.gt)!='undefined' && typeof(req.body.gt)=='String') {
		fields['Medias.ThemeID']=req.body.gt;
    }
    
    fields['isDeleted']=0;
    board.find(fields,function(err,result){
		
	if(err){ 		
	    res.json(err);
	}
	else{
	    if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
	    }
	    else{
		
		if (req.session.user) {
		    if (result[0].PrivacySetting[0].BoardType=='FriendsSolo' && result[0].OwnerID._id!=req.session.user._id) {
			var showMedias=result;			
			var medias=[];
			
			for(i=0;i<result[0].Medias.length;i++){
			    
			    if (String(result[0].Medias[i].PostedBy._id)==String(result[0].OwnerID._id) || String(result[0].Medias[i].PostedBy._id)==String(req.session.user._id)) {			    
				medias.push(result[0].Medias[i]);
			    }
			}
			result[0].Medias=[];
			result[0].Medias=medias;
			
			
		    }
		}
		res.json({"code":"200","msg":"Success","response":result})
		
	    }
	}
	
    }).populate('Domain Collection ProjectID OwnerID Medias.PostedBy Invitees.UserID')
	
	
};

//Defines data logic to save chapter
var createChapter = function(req, res){
	var form = new formidable.IncomingForm();
	
	form.keepExtensions = true;     //keep file extension
    form.parse(req, function(err, fields, files) {
	
		var chapter = new chapter();
		
		chapter.saveChapter(fields,files.file.type,function(err,chapterdata){
			if(err) return err;
			if(chapterdata){
				if(err) return res.send(500, err);
				var directory = "./public/assets/capsule/images/chapters/";
                    //console.log(files.file.path, "files");
                    var newPath = chapterdata._id + "_"+ "profile_image";
                                    
						fs.rename(files.file.path, directory+"/"+ newPath + chapterdata.ProfileImageExtension, function(err) {
							if(err) { 
								return res.send(500, err);
							}else {                    
								res.send(200, { message : 'Chapter created successfully !!' , response: 'success'});
							}  
						}); 
                            
				//res.send(200, { message : 'Chapter created successfully !!' , response: 'success'});
			}else{
				res.send(200, { message: 'Sorry, Chapter not created.'} );
			}
			
		});
	
	});
}

// Delete Action for Chapter
var deleteChapter = function(req, res){
	chapter.deleteChapter(req.body.id, function(err, response){
		if(err) return res.send(500, err);

		console.log(response, "response");
		if(response){
			res.send(200, { capsule: response, message: "Chapter deleted successfully!!"});
		}else{
			res.json(404, {"msg":"Chapter Not Found"})
		}
	});
};


exports.findAll = findAll;
exports.createChapter = createChapter;
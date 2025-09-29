var media = require('./../models/mediaModel.js');
var formidable = require('formidable');
var fs = require('fs');

// To fetch all domains
var findAll = function(req, res){    
	
	
    media.find({Status:0}).sort({UploadedOn: 'desc'}).skip(req.body.offset).limit(req.body.limit).exec(function(err,result){
		
		if(err){ 		
			res.json(err);
		}
		else{
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found",responselength:0})
			}
			else{				
				media.find({Status:0}).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){								
					if(err){ 		
						res.json(err);
					}
					else{					
						res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
						
					}
				})
			}
		}
	})
    
};

exports.findAll = findAll;


var findAllStatus = function(req, res){    
	
	
	fields={};
	if(req.body.domain!=null && req.body.domain!=""){
		fields.Domains=req.body.domain
	}
	
	if(req.body.source!=null && req.body.source!=""){
		fields.SourceUniqueID=req.body.source
	}
	
	if(req.body.collection!=null && req.body.collection!=""){
		fields.Collection=req.body.collection
	}
	/*if(req.body.gt!=null && req.body.gt!=""){
		fields.GroupTags=[];
		fields.GroupTags.GroupTagID=req.body.gt
	}*/
	if(req.body.mmt!=null && req.body.mmt!=""){		
		fields.MetaMetaTags=req.body.mmt
	}
	if(req.body.mt!=null && req.body.mt!=""){		
		fields.MetaTags=req.body.mt
	}
	/*if(req.body.gt!=null && req.body.gt!=""){
		fields.GroupTags=[];
		fields.GroupTags.GroupTagID=req.body.gt
	}*/
	
	console.log(fields)
	console.log(req.body)
	
    media.find(fields).sort({UploadedOn: 'desc'}).skip(req.body.offset).limit(req.body.limit).exec(function(err,result){
		
		if(err){ 		
			res.json(err);
		}
		else{
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found",responselength:0})
			}
			else{				
				media.find(fields).sort({UploadedOn: 'desc'}).exec(function(err,resultlength){		
					if(err){ 		
						res.json(err);
					}
					else{					
						res.json({"code":"200","msg":"Success","response":result,"responselength":resultlength.length});
					}
				})
			}
		}
		
	})
    
};

exports.findAllStatus = findAllStatus;


var edit = function(req,res){
  
	var fields={
		SourceUniqueID:req.body.source,
		GroupTags:[],
		Collection:req.body.collection,
		Domains:req.body.domain,
		Status:1,
		MetaMetaTags:req.body.mmt,
		MetaTags:req.body.mt
	};
	for(k in req.body.gt){
		fields.GroupTags.push({
			GroupTagID:req.body.gt[k]
		})
	}
	
	for(i in req.body.media){
		var query={_id:req.body.media[i]['id']};
		var options={};
		fields.Title=req.body.media[i]['title'];
		fields.Prompt=req.body.media[i]['prompt'];
		fields.Locator=req.body.media[i]['locator'];
		media.update(query, { $set: fields}, options, callback)
	}
	
	var counter=0;
	function callback (err, numAffected) {
		counter++;
		if(counter==req.body.media.length){
			findAll(req,res)
		}
		
	}
};

exports.edit = edit;


var editAll = function(req,res){
  
	var fields={
		SourceUniqueID:req.body.source,
		GroupTags:[],
		Collection:req.body.collection,
		Domains:req.body.domain,
		Status:1,
		MetaMetaTags:req.body.mmt,
		MetaTags:req.body.mt
	};
	
	for(k in req.body.gt){
		fields.GroupTags.push({
			GroupTagID:req.body.gt[k]
		})
	}
	
	for(i in req.body.media){
		var query={_id:req.body.media[i]['id']};
		var options={};
		fields.Title=req.body.media[i]['title'];
		fields.Prompt=req.body.media[i]['prompt'];
		fields.Locator=req.body.media[i]['locator'];
		media.update(query, { $set: fields}, options, callback)
	}
	var counter=0;
	function callback (err, numAffected) {
		counter++;
		if(counter==req.body.media.length){
			findAllStatus(req,res)
		}
		
	}
};

exports.editAll = editAll;


var editTags = function(req,res){
	
	var fields={
		Title:req.body.title,
		Prompt:req.body.prompt,
		Locator:req.body.locator
	};
	
	for(i in req.body.media){
		var query={_id:req.body.media[i]['id']};
		
		fields.Title=req.body.media[i]['title'];
		fields.Prompt=req.body.media[i]['prompt'];
		fields.Locator=req.body.media[i]['locator'];
		
		media.update(query, { $set: fields}, options, callback)
	}
	var counter=0;
	function callback (err, numAffected) {
		counter++;
		if(counter==req.body.media.length){
			findAll(req,res)
		}
		
	}
};

exports.editTags = editTags;






var uploadfile = function(req,res){
var form = new formidable.IncomingForm();        	
	
	form.parse(req, function(err, fields, files) {
	  var file_name="";
	  if(files.myFile.name){
		uploadDir = __dirname + "/../../public/assets/Media/img";
		file_name=files.myFile.name;
	    file_name=file_name.split('.');
	    ext=file_name[file_name.length-1];
	    name=Date.now();
	    file_name=name+'.'+ext;
		console.log(files.myFile.type);
	    fs.rename(files.myFile.path, uploadDir + "/" + file_name)
			var media_type='';
			if(files.myFile.type=="application/pdf" || files.myFile.type=="application/msword" || files.myFile.type=="application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||  files.myFile.type=="application/vnd.ms-excel" || files.myFile.type=="application/vnd.oasis.opendocument.spreadsheet" ||  files.myFile.type=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ){
				media_type='Document';
			}
			else{
				media_type='Image';
			}
			dataToUpload={
				Location:[],
				UploadedBy:"admin",
				UploadedOn:Date.now(),
				UploaderID:req.session.admin._id,
				Source:"Thinkstock",
				SourceUniqueID:null,
				Domains:null,
				GroupTags:[],
				Collection:null,
				Status:0,
				MetaMetaTags:null,
				MetaTags:null,
				AddedWhere:"directToPf",
				IsDeleted:0,
				ContentType:files.myFile.type,
				MediaType:media_type
			}
		  
			dataToUpload.Location.push({
				Size:files.myFile.size,
				URL:file_name
			})	
			media(dataToUpload).save(function(err){
				if(err){
				  res.json(err);
				}
				else{
				  findAll(req,res)
				}
			});
			    
	  }
	  
	  
	  
    });
	
	
}

exports.uploadfile = uploadfile;




var deleteMedia = function(req,res){
	
	media.remove({_id:{$in:req.body.media}},function(err){
		if(err){
			res.json(err)
		}
		else{						
			findAllStatus(req,res)
		}
	});
}

exports.deleteMedia = deleteMedia;
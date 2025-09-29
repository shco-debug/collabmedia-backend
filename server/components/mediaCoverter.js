/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
// Muaz Khan     - www.MuazKhan.com
// MIT License   - www.WebRTC-Experiment.com/licence
// Source Code   - github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC/RecordRTC-to-Nodejs
var counters=require('./../../../models/countersModel.js');
var media = require('./../../../models/mediaModel.js');

var config = require('./config'),
fs = require('fs'),
sys = require('sys'),
exec = require('child_process').exec;


/*________________________________________________________________________
	* @Date:      	23 Mar 2015
	* @Method :   	saveFile 
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-- 
	* @Purpose:   	This function is used to save audio video file.
	* @Param:     	5
	* @Return:    	-
	_________________________________________________________________________
*/
function saveFile(req,res,fileType){
    console.log('========================================= here =========================================')
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;     //keep file extension
    form.uploadDir = (__dirname+"/../../public/assets/Media/video/");       //set upload directory
    form.keepExtensions = true;     //keep file extension
    
    form.parse(req, function(err, fields, files) {
        console.log('========================================= here2 =========================================')
        console.log("file size: "+JSON.stringify(files.file.size));
        console.log("file path: "+JSON.stringify(files.file.path));
        console.log("file name: "+JSON.stringify(files.file.name));
        console.log("file type: "+JSON.stringify(files.file.type));
        console.log("lastModifiedDate: "+JSON.stringify(files.file.lastModifiedDate));
        var temp = files.file.name.split('.');
        var ext = temp.pop();
        var incNum = 0;
        var dateTime = new Date().toISOString().replace(/T/,'').replace(/\..+/, '').split(" ");
        counters.findOneAndUpdate({ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
            if (!err) {
                incNum=data.seq;
                var fileName = Date.now()+"_recording_"+ incNum + "." + ext;

                fs.rename(files.file.path, __dirname+"/../../public/assets/Media/video/"+ fileName, function(err) {
                        if (err){
                                res.json(err);
                        }
                        else {
                                //console.log("../assets/Media/video/Recorded_" + incNum + '.' + ext);
                                console.log('renamed complete');
                                if (fileType == 'Video') {
                                        video__anyToMP4OrWebm(fileName);
                                }else{
                                        Audio__anyToMP3(fileName);
                                }
                                saveMedia__toDB(req,res,incNum, fileName,fileType);
                                //res.json({'filename':"../assets/Media/video/Recorded_" + incNum + '.' + ext});
                        }
                });
            }
        })
    });
}
/********************************************END******************************************************/	 



/*________________________________________________________________________
	* @Date:      	18 Mar 2015
	* @Method :   	saveMedia__toDB
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-- 
	* @Purpose:   	This function is used for to add a document of video in media collection.
	* @Param:     	5
	* @Return:    	-
	_________________________________________________________________________
*/
function saveMedia__toDB(req,res,incNum, fileName,fileType){
	if (req.session.user.FSGsArr2) {
	}
	else{
		req.session.user.FSGsArr2={};
	}
	if (incNum) {
		var	thumbName = fileName.replace( '.'+fileName.split('.').pop() , '.png');
		var locator = fileName.replace( '.'+fileName.split('.').pop() , '');
		//'Recorded_'+incNum+'.png'
		
		var cType = 'video/webm';
		if ( fileType == 'Audio' ) {
			cType = 'audio/mp3';
			thumbName = '';
		}
		
		dataToUpload={
			Location:[],
			AutoId:incNum,
			UploadedBy:"user",
			UploadedOn:Date.now(),
			UploaderID:req.session.user._id,
			Source:"Thinkstock",
			SourceUniqueID:null,
			Domains:null,
			GroupTags:[],
			Collection:null,
			Status:2, 
			MetaMetaTags:null,
			MetaTags:null,
			AddedWhere:"board", //directToPf,board,capsule
			IsDeleted:0,
			TagType:"",
			ContentType: cType,
			MediaType:fileType,
			AddedHow:'recording',
			OwnerFSGs:req.session.user.FSGsArr2,
			IsPrivate:1,
			Locator: locator,
			thumbnail: thumbName
		}
	  
		dataToUpload.Location.push({
			Size:1289,
			URL:fileName
		})


		media(dataToUpload).save(function(err,model){
			if(err){
				response.json(err);
			}
			else{
				dataToUpload._id=model._id;
				if (fileType == 'Video') {
					video__getNsaveThumbnail(fileName , dataToUpload._id);	
				}
				
				console.log("==================================" + dataToUpload._id);
				res.json(dataToUpload);
			}
		});
	}
}
/********************************************END******************************************************/	 



/*________________________________________________________________________
	* @Date:      	19 March 2015
	* @Method :   	video__any_to_MP4OrWebm
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	Convert any recorded video to webm or mp4.
	* @Param:     	1
	* @Return:    	No
_________________________________________________________________________
*/
function video__anyToMP4OrWebm(inputFile){
	if(inputFile){
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();
		
		switch( extensionUpper ){
			case 'WEBM':
				outputFile = inputFile.replace('.'+extension,'.mp4');
				__convertVideo( inputFile , outputFile );
				break;
				
			case 'MP4':
				outputFile = inputFile.replace('.'+extension,'.webm');
				__convertVideo( inputFile , outputFile );
				break;
				
			case 'MOV':
				outputFile = inputFile.replace('.'+extension,'.mp4');
				__convertVideo( inputFile , outputFile );
				
				outputFile = inputFile.replace('.'+extension,'.webm');
				__convertVideo( inputFile , outputFile );
				break;
			
			default:
				console.log("------Unknown extension found = ",extension);
				if( extension != '' && extension != null  ){
					outputFile = inputFile.replace('.'+extension,'.mp4');
					__convertVideo( inputFile , outputFile );
					
					outputFile = inputFile.replace('.'+extension,'.webm');
					__convertVideo( inputFile , outputFile );
				}
				break;
		}
	}
	return;		
}


function __convertVideo( inputFile , outputFile ){
	var util = require('util'),
	exec = require('child_process').exec;
	
	var command = "ffmpeg -fflags +genpts -i " + process.urls.__VIDEO_UPLOAD_DIR+'/'+inputFile + " -r 24 "+process.urls.__VIDEO_UPLOAD_DIR+'/'+ outputFile;
	
	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
			//response.statusCode = 404;
			//response.end();

		} else {
			console.log("==========Successfully converted from "+inputFile+" to "+outputFile);
		}
	});
}
/********************************************END******************************************************/	 





/*________________________________________________________________________
	* @Date:      	2 Mar 2015
	* @Method :   	checkNSaveGT
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function checks if a gt with same name exists or not then save accordingly.
	* @Param:     	1
	* @Return:    	Yes
_________________________________________________________________________
*/ 
function video__getNsaveThumbnail(inputFile , MediaId){
	var util = require('util'),
    exec = require('child_process').exec;

    //var command = "ffmpeg -i " + audioFile + " -i " + videoFile + " -map 0:0 -map 1:0 " + mergedFile;
	//var command = "ffmpeg -i " + inputFile + " -vframes 1 "+output.png;
	
	var outputThumbnail = Date.now();
	var outputThumbnailArr = [];
	
	outputThumbnailArr = inputFile.split('.');
	if(outputThumbnailArr.length)
		outputThumbnail = outputThumbnailArr[0];
	
	outputThumbnail = outputThumbnail+'.png';
	
	var command = "ffmpeg -i " + process.urls.__VIDEO_UPLOAD_DIR +'/'+inputFile + " -vframes 1 " + process.urls.__VIDEO_UPLOAD_DIR +'/'+outputThumbnail;
    exec(command, function (error, stdout, stderr) {
        if (stdout) console.log(stdout);
        if (stderr) console.log(stderr);
		
        if (error) {
            try{
				console.log('exec error: ' + error);
            	response.statusCode = 404;
				response.end();
			}
			catch(e){
			
			}
			
		} 
		else {
			//success case
			saveRequiredThumbnail__video(outputThumbnail);
			
			//update media thumbnail
			media.update({"_id":MediaId},{$set:{"thumbnail":outputThumbnail}},{},function(err,numAffected){
				if( err ){
					console.log("err = ",err);
				}
				else{
					console.log("numAffected = ",numAffected);
				}
			});
		}
	});
}
/********************************************END******************************************************/

var saveRequiredThumbnail__video = function( file_name ){
	//add thumbnail code
	var imgUrl = file_name;
	var mediaCenterPath = "/../../public/assets/Media/video/";
	var srcPath = __dirname + mediaCenterPath + imgUrl;
	
	if (fs.existsSync(srcPath)) {
		var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+imgUrl;
		var dstPathCrop_SG = __dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+imgUrl;
		var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
		var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
		var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl;
		crop_image(srcPath,dstPathCrop_SMALL,100,100);
		crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
		crop_image(srcPath,dstPathCrop_SG,300,300);
		crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
		resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
	}
	
}



function Audio__anyToMP3(inputFile){
	if(inputFile){
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();
		
		switch( extensionUpper ){
			case 'OGG':
				outputFile = inputFile.replace('.'+extension,'.mp3');
				__convertAudio( inputFile , outputFile );
				break;
				
			case 'WAV':
				outputFile = inputFile.replace('.'+extension,'.mp3');
				__convertAudio( inputFile , outputFile );
				break;
				
			case 'MP3':
				//no need to convert
				break;
				
			default:
				console.log("------Unknown extension found = ",extension);
				if( extension != '' && extension != null  ){
					outputFile = inputFile.replace('.'+extension,'.mp3');
					__convertAudio( inputFile , outputFile );
				}
				break;
		}
	}
	return;		
}


function __convertAudio( inputFile , outputFile ){
	var util = require('util'),
	exec = require('child_process').exec;
	
	var command = "ffmpeg -fflags +genpts -i " + process.urls.__VIDEO_UPLOAD_DIR+'/'+inputFile + " -r 24 "+process.urls.__VIDEO_UPLOAD_DIR+'/'+ outputFile;
	
	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
			//response.statusCode = 404;
			//response.end();

		} else {
			console.log("==========Successfully converted from "+inputFile+" to "+outputFile);
		}
	});
}


/***
 * Image crop..
 * Available gravity options are [NorthWest, North, NorthEast, West, Center, East, SouthWest, South, SouthEast]
***/
function crop_image(srcPath,dstPath,width,height){
    console.log("source : ",srcPath+" ---- destination : "+dstPath);
	var im   = require('imagemagick');
	//var im = require('imagemagick').subClass({ imageMagick: true });
    try{
        im.crop({
                srcPath: srcPath,
                dstPath: dstPath,
                width: width,
                height: height+"^",
                quality: 1,
                gravity: "Center"
        }, function(err, stdout, stderr){
                if (err) throw err;
                console.log('success..');
        });
    }
    catch(e){
            console.log("=========================ERROR : ",e);
    }
}

/*________________________________________________________________________
	* @Date:      	13 March 2015
	* @Method :   	resize_image
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	This function is used to resize orignal media.
	* @Param:     	4
	* @Return:    	no
_________________________________________________________________________
*/
 //BY Parul 20022015
 
 function resize_image(srcPath,dstPath,w,h){
    console.log("source : ",srcPath+" ---- destination : "+dstPath);
    var im   = require('imagemagick');

    try{
    im.identify(srcPath,function(err,features){
        if (err) {
            console.log(err);
        }else{
            console.log(features.width+"======================"+features.height);
            if (features.height >= 1440) {
                    console.log('========================================================================== here1');
                    im.resize({
                            srcPath: srcPath,
                            dstPath: dstPath,
                            //width: w,
                            height: h,
                            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                    });
            }
            else if (features.width >= 2300) {
                    console.log('========================================================================== here2');
                    im.resize({
                            srcPath: srcPath,
                            dstPath: dstPath,
                            width: w,
                            //height: 1440,
                            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                    });
            }
            else{
                    console.log('========================================================================== here3');
                    im.resize({
                            srcPath: srcPath,
                            dstPath: dstPath,
                            width: features.width,
                            height: features.height,
                            //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
                            //gravity: 'Center' // optional: position crop area when using 'aspectfill'
                    });
            }
        }
    })
    }
    catch(e){
        console.log("=========================ERROR : ",e);
    }
 }
 
 /**************************** END IMAGE RESIZE ***************************************/
 
 exports.webm_to_MP4 = webm_to_MP4;
 exports.getThumbnail = getThumbnail;
 exports.Audio__anyToMP3 = Audio__anyToMP3;
 exports.saveRequiredThumbnail__video = saveRequiredThumbnail__video;
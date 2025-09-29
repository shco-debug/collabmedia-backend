// Muaz Khan     - www.MuazKhan.com
// MIT License   - www.WebRTC-Experiment.com/licence
// Source Code   - github.com/muaz-khan/WebRTC-Experiment/tree/master/RecordRTC/RecordRTC-to-Nodejs
var counters=require('./../../../models/countersModel.js');
var media = require('./../../../models/mediaModel.js');

var config = require('./config'),
fs = require('fs'),
sys = require('sys'),
exec = require('child_process').exec;

function home(response) {
	console.log("in home")
    response.writeHead(200, {
        'Content-Type': 'text/html'
    });
    response.end(fs.readFileSync('./static/index.html'));
}

// this function uploads files

function upload(response, postData, req) {
	var IsSpeechToText = req.body.IsSpeechToText ? req.body.IsSpeechToText : null;
	
	if(!IsSpeechToText) {
		console.log("in upload")
		var files = JSON.parse(postData);
			
		// writing audio file to disk
		console.log('UploadOnly Audio',files.uploadOnlyAudio)
		_upload(response, files.audio);
		if (files.uploadOnlyAudio) { 
			if (req.session.user.FSGsArr2) {

			}
			else{
				req.session.user.FSGsArr2={};
			}
			var incNum = 0;
			counters.findOneAndUpdate({ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
				if (!err) {
					var mType = 'Video';
					var cType = 'video/webm';
					if ( files.RecordingMode == 'audio' ) {
							Audio__anyToMP3(files.audio.name);
							mType = 'Audio';
							cType = 'audio/mp3';
					}

					var fileName = files.audio.name;
					var ext = files.audio.name.split('.').pop();
					//var fileName = Date.now()+"_recording_"+ incNum + "." + ext;
					var	thumbName = fileName.replace( '.'+ext , '.png');
					var locator = fileName.replace( '.'+ext , '');

					console.log('=========================')
					console.log(data);
					/*data.seq=(data.seq)+1*/;
					console.log(data.seq);
					incNum=data.seq;
					//data.save();
					console.log("incNum="+incNum);
					if (incNum) {
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
							IsDeleted:1,
							TagType:"",
							ContentType: cType,
							MediaType: mType,
							AddedHow:'recording',
							//OwnerFSGs:req.session.user.FSGs,
							OwnerFSGs:req.session.user.FSGsArr2,
							IsPrivate:1,
							Locator: locator,
							thumbnail:thumbName
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
									dataToUpload._id=model._id
									console.log("====================files.RecordingMode = "+files.RecordingMode);//return;
									if ( files.RecordingMode != 'audio' ) {
											//firefox case

											//generate thumbnail and assign to thumbnail key
											getThumbnail(files.audio.name , model._id);
											webm_to_MP4(config.upload_dir +'/'+files.audio.name);

									}
									else{
											//convert mp3 
											Audio__anyToMP3(files.audio.name);
									}

									response.json(dataToUpload);
									//response.end(dataToUpload);
							}
					});
					}

				}	
			})
		}

		if (!files.uploadOnlyAudio) {
			console.log('in else of upload')
			// writing video file to disk
			_upload(response, files.video);
			console.log("-----------files.RecordingMode = "+files.RecordingMode)
			if ( files.RecordingMode != 'audio' ) {
					//chrome case
					merge(response, files, req);
			}
			else{
				if (req.session.user.FSGsArr2) {

				}
				else{
					req.session.user.FSGsArr2={};
				}
				var incNum = 0;
				counters.findOneAndUpdate({ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
					if (!err) {
						var mType = 'Video';
						var cType = 'video/webm';
						if ( files.RecordingMode == 'audio' ) {
							Audio__anyToMP3(files.audio.name);
							mType = 'Audio';
							cType = 'audio/mp3';
						}

						var fileName = files.audio.name;
						var ext = files.audio.name.split('.').pop();
						//var fileName = Date.now()+"_recording_"+ incNum + "." + ext;
						var	thumbName = fileName.replace( '.'+ext , '.png');
						var locator = fileName.replace( '.'+ext , '');

						console.log('=========================')
						console.log(data);
						/*data.seq=(data.seq)+1*/;
						console.log(data.seq);
						incNum=data.seq;
						//data.save();
						console.log("incNum="+incNum);
						if (incNum) {
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
							IsDeleted:1,
							TagType:"",
							ContentType: cType,
							MediaType: mType,
							AddedHow:'recording',
							//OwnerFSGs:req.session.user.FSGs,
							OwnerFSGs:req.session.user.FSGsArr2,
							IsPrivate:1,
							Locator: locator,
							thumbnail:thumbName
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
								dataToUpload._id=model._id
								console.log("====================files.RecordingMode = "+files.RecordingMode);//return;
								if ( files.RecordingMode != 'audio' ) {
									//firefox case
									//generate thumbnail and assign to thumbnail key
									getThumbnail(files.audio.name , model._id);
									webm_to_MP4(config.upload_dir +'/'+files.audio.name);
								}
								else{
									//convert mp3 
									Audio__anyToMP3(files.audio.name);
								}

								response.json(dataToUpload);
								//response.end(dataToUpload);
							}
						});
						}
					}	
				})
			}
		//merge(response, files, req);
		}
	}
	else {
		res.json({
			code : 200,
			message : "transcription text comming soon ..."
		})
		
	}
}

// this function merges wav/webm files

function merge(response, files, req) {
    // detect the current operating system
    console.log("in merge")
	var isWin = !!process.platform.match( /^win/ );

    if (isWin) {
        ifWin(response, files, req);
    } else {
		ifMac(response, files, req);
    }
}

function _upload(response, file) {
	console.log("in _upload")
	console.log(file.name);
	console.log(config.upload_dir);
	console.log("-----");
    var fileRootName = file.name.split('.').shift(),
        fileExtension = file.name.split('.').pop(),
        filePathBase = config.upload_dir + '/',
        fileRootNameWithBase = filePathBase + fileRootName,
        filePath = fileRootNameWithBase + '.' + fileExtension,
        fileID = 2,
        fileBuffer;
        console.log("File PAth", filePath);

    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }
    console.log("File PAth After ", filePath);
		
    file.contents = file.contents.split(',').pop();

    fileBuffer = new Buffer(file.contents, "base64");

    fs.writeFileSync(filePath, fileBuffer);

}

function _upload_speechtotext(response, file) {
	console.log("in _upload")
	console.log(file.name);
	console.log(config.upload_dir_speechtotext);
	console.log("-----");
    var fileRootName = file.name.split('.').shift(),
        fileExtension = file.name.split('.').pop(),
        filePathBase = config.upload_dir_speechtotext + '/',
        fileRootNameWithBase = filePathBase + fileRootName,
        filePath = fileRootNameWithBase + '.' + fileExtension,
        fileID = 2,
        fileBuffer;
        console.log("File PAth", filePath);

    while (fs.existsSync(filePath)) {
        filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
        fileID += 1;
    }
    console.log("File PAth After ", filePath);
		
    file.contents = file.contents.split(',').pop();

    fileBuffer = new Buffer(file.contents, "base64");

    fs.writeFileSync(filePath, fileBuffer);

}

function serveStatic(response, pathname) {
	console.log("in serverstatic")
    var extension = pathname.split('.').pop(),
        extensionTypes = {
            'js': 'application/javascript',
            'webm': 'video/webm',
            'mp4': 'video/mp4',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'gif': 'image/gif'
        };

    response.writeHead(200, {
        'Content-Type': extensionTypes[extension]
    });
    if (hasMediaType(extensionTypes[extension]))
        response.end(fs.readFileSync('.' + pathname));
    else
        response.end(fs.readFileSync('./static' + pathname));
}

function hasMediaType(type) {
	console.log("in has media type")
    var isHasMediaType = false;
    ['audio/wav', 'audio/ogg', 'video/webm', 'video/mp4'].forEach(function(t) {
      if(t== type) isHasMediaType = true;
    });
    
    return isHasMediaType;
}

function ifWin(response, files, req) {
    // following command tries to merge wav/webm files using ffmpeg
    var merger = __dirname + '\\merger.bat';
    var audioFile = __dirname + '\\uploads\\' + files.audio.name;
    var videoFile = __dirname + '\\uploads\\' + files.video.name;
    var mergedFile = __dirname + '\\uploads\\' + files.audio.name.split('.')[0] + '-merged.webm';

    // if a "directory" has space in its name; below command will fail
    // e.g. "c:\\dir name\\uploads" will fail.
    // it must be like this: "c:\\dir-name\\uploads"
    var command = merger + ', ' + audioFile + " " + videoFile + " " + mergedFile + '';
    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.log(error.stack);
            console.log('Error code: ' + error.code);
            console.log('Signal received: ' + error.signal);
        } else {
            response.statusCode = 200;
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            response.end(files.audio.name.split('.')[0] + '-merged.webm');

            fs.unlink(audioFile);	
            fs.unlink(videoFile);
        }
    });
}

function ifMac(response, files, req) {
	console.log("in ifmac")
	console.log(config.upload_dir)
    // its probably *nix, assume ffmpeg is available
    var audioFile = config.upload_dir +'/'+ files.audio.name;
    var videoFile = config.upload_dir +'/'+ files.video.name;
    var mergedFile = config.upload_dir +'/'+ files.audio.name.split('.')[0] + '-merged.webm';
    
    var util = require('util'),
    exec = require('child_process').exec;

    var command = "ffmpeg -i " + audioFile + " -i " + videoFile + " -map 0:0 -map 1:0 " + mergedFile;

    exec(command, function (error, stdout, stderr) {
        if (stdout) console.log(stdout);
        if (stderr) console.log(stderr);

        if (error) {
            console.log('exec error: ' + error);
            response.statusCode = 404;
            response.end();

        } else {
			
			webm_to_MP4(mergedFile);
			/*
			if (req.session.user.FSGs) {

			}
			else{
				req.session.user.FSGs={};
			}
			*/
			if (req.session.user.FSGsArr2) {

			}
			else{
				req.session.user.FSGsArr2={};
			}
			
			counters.findOneAndUpdate(
			{ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
			 if (!err) {
			 
				 console.log('=========================')
				 console.log(data);
				// data.seq=(data.seq)+1;
				 console.log(data.seq);
				 incNum=data.seq;
				 //data.save();
				 if (incNum) {
					//code
				
				 dataToUpload={
					Location:[],
					AutoId:incNum,
					UploadedBy:"user",
					UploadedOn:Date.now(),
					UploaderID:req.session.user._id,
					Source:"User-generated",
					SourceUniqueID:null,
					Domains:null,
					GroupTags:[],
					Collection:null,
					Status:2, 
					MetaMetaTags:null,
					MetaTags:null,
					//AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
					AddedWhere:"board", //directToPf,board,capsule
					IsDeleted:1,
					IsPrivate:1,
					TagType:"",
					ContentType:'video/webm',
					MediaType:'Video',
					AddedHow:'recording',
					//OwnerFSGs:req.session.user.FSGs,
					OwnerFSGs:req.session.user.FSGsArr2,
					Locator: files.audio.name.split('.')[0] + '-merged_' + incNum,
					thumbnail:files.audio.name.split('.')[0] + '-merged.png'
				}
					
				dataToUpload.Location.push({
					Size:1289,
					URL:files.audio.name.split('.')[0] + '-merged.webm'
					//URL:files.audio.name.split('.')[0] + '.webm'
				})
				
				media(dataToUpload).save(function(err,model){
					if(err){
						response.json(err);
					}
					else{
						dataToUpload._id=model._id
						//generate thumbnail and assign to thumbnail key
						getThumbnail(files.audio.name.split('.')[0] + '-merged.webm' , model._id);
				
						response.json(dataToUpload);
						//response.end(dataToUpload);
					}
				});					
					/*
								response.statusCode = 200;
					response.writeHead(200, {
						'Content-Type': 'application/json'
					});
					response.end(files.audio.name.split('.')[0] + '-merged.webm');
					*/
		
					// removing audio/video files
					fs.unlink(audioFile);
					fs.unlink(videoFile);
							 
			 }
			 }
			 })
						
        }

    });
}

function webm_to_MP4(mergedFile){
	if(mergedFile){
		var util = require('util'),
		exec = require('child_process').exec;
		
		var mergedFiletoMp4 = '';
		//mergedFiletoMp4 = mergedFile.replace('.webm','.mp4');
		mergedFiletoMp4 = mergedFile.replace('.'+mergedFile.split('.').pop(),'.mp4');
		
		var command = "ffmpeg -fflags +genpts -i " + mergedFile + " -r 24 " + mergedFiletoMp4;

		exec(command, function (error, stdout, stderr) {
			if (stdout) console.log(stdout);
			if (stderr) console.log(stderr);

			if (error) {
				console.log('exec error: ' + error);
				//response.statusCode = 404;
				//response.end();

			} else {
				console.log("Successfully converted from "+mergedFiletoMp4+" to .mp4...");
			}
		});
	}
	return;		
}

//added on 14012015 
function getThumbnail(inputFile , MediaId){
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
	
	var command = "ffmpeg -i " + config.upload_dir +'/'+inputFile + " -vframes 1 " + config.upload_dir +'/'+outputThumbnail;
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
				//outputFile = inputFile.replace('.'+extension,'.webm');
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

var saveRequiredThumbnail__video = function( file_name ){
	//add thumbnail code
	var imgUrl = file_name;
	var mediaCenterPath = "/../../../../public/assets/Media/video/";
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

exports.home = home;
exports.upload = upload;
exports.serveStatic = serveStatic;
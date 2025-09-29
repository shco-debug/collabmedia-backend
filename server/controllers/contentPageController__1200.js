var Page = require('./../models/pageModel.js');
var media = require('./../models/mediaModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var counters=require('./../models/countersModel.js');
var fs = require('fs');
var formidable = require('formidable');
var im   = require('imagemagick');
var path = require('path');

var Chapter = require('./../models/chapterModel.js');
var resultCounter = 0;
function saveFileFromUrl(fileUrl , fileName , mediaId , res , resultLength){
    console.log("saveFileFromUrl called");
    if( fileUrl ){
        console.log("saveFileFromUrl called in if");
        var mediaCenterPath = "/../../public/assets/Media/img/";
        var dlDir = __dirname + mediaCenterPath;

        console.log("Download From = "+fileUrl.replace(/&/g,'\\&'));
        console.log("To = "+dlDir+fileName);

        var exec = require('child_process').exec;
        //in curl we have to escape '&' from fileUrl
        var curl =  'curl ' + fileUrl.replace(/&/g,'\\&') +' -o ' + dlDir+fileName + ' --create-dirs';

        console.log("Command to download : "+curl);

        try{
            var child = exec(curl, function(err, stdout, stderr) {
                if (err){ 
                    console.log(stderr); //throw err; 
                } 
                else {
                    console.log(fileName + ' downloaded to ' + dlDir);

                    //crop
                    var srcPath = dlDir+fileName;
                    var imgUrl = fileName;
                    if (fs.existsSync(srcPath)) {
                        var dstPathCrop_SMALL = __dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl;
                        var dstPathCrop_SG = __dirname+ mediaCenterPath + process.urls.SG__thumbnail+"/"+imgUrl;
                        var dstPathCrop_MEDIUM = __dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl;
                        var dstPathCrop_LARGE = __dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl;
                        var dstPathCrop_ORIGNAL = __dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl; 
                        crop_image(srcPath,dstPathCrop_SMALL,100,100);
                        crop_image(srcPath,dstPathCrop_SG,300,300);
                        //crop_image(srcPath,dstPathCrop_400,400,400);
                        //crop_image(srcPath,dstPathCrop_500,500,500);
                        crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
                        crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
                        resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);
                    }

                    if(mediaId){
                        var query={_id:mediaId};
                        var options={};
                        var fields = {};
                        fields.thumbnail=fileName;
                        media.update(query, { $set: fields}, options, generateCounter)
                    }
                }
            });
        }
        catch(e){
            console.log("E = ",e);

        }

        function generateCounter(){
            resultCounter++;
            console.log("resultCounter = "+resultCounter);
            if( resultCounter > (resultLength/2) ){
                res.json({"code":"200","msg":resultCounter+" Links have been processed..",responselength:resultCounter});
                return;
            }
        }
    }
    else{
        console.log("fileUrl Error = "+fileUrl);
    }
}


var dateFormat =function(){
    var d = new Date,
    dformat = [(d.getMonth()+1)>10?(d.getMonth()+1):'0'+(d.getMonth()+1),
            (d.getDate())>10?d.getDate():'0'+d.getDate(),
            d.getFullYear()].join('')+''+
            [d.getHours(),
            d.getMinutes(),
            d.getSeconds()].join('');
    return dformat;
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
                    console.log('========================================================================== here');
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
                    console.log('========================================================================== here');
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
                    console.log('========================================================================== here');
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

/***
 * Image crop..
 * Available gravity options are [NorthWest, North, NorthEast, West, Center, East, SouthWest, South, SouthEast]
***/
function crop_image(srcPath,dstPath,width,height){
    var strtxt = srcPath+'|'+dstPath+'|'+width+'|'+height+'| _crop';
    console.log(strtxt);
    
    var im   = require('imagemagick');
   
    im.crop({
        srcPath: srcPath,
        dstPath: dstPath,
        width: width,
        height: height+"^",
        quality: 1,
        gravity: "Center"
    }, function(err, stdout, stderr){
        if (err) throw err;
        console.log('Success crop.');
    });
}

//apis
var ContentPage = {
	create : function(req , res){},
        updateWidgets : function(req , res){},
	Background : {
            setImage : function(req , res){},
            setVideo : function(req , res){}
	},
	Widgets : {
            Text : {
                create : function(req , res){},
                update :  function(req , res){},
                delete :  function(req , res){}, 
                setStyle : function(req , res){}
            },
            Image : {
                create : function(req , res){},
                update :  function(req , res){},
                delete :  function(req , res){},
                setStyle : function(req , res){}
            },
            Video : {
                create : function(req , res){},
                update :  function(req , res){},
                delete :  function(req , res){},
                setStyle : function(req , res){}
            },
            Audio : {
                create : function(req , res){},
                update :  function(req , res){},
                delete :  function(req , res){},
                setStyle : function(req , res){}
            },
            QuestAnswer : {
                create : function(req , res){},
                update :  function(req , res){},
                delete :  function(req , res){},
                setStyle : function(req , res){}
            }
	}
};

/*________________________________________________________________________
   * @Date:      		11 Dec 2015
   * @Method :   		getPageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR" + "CR" + "PE"
_________________________________________________________________________
*/

ContentPage.getPageName = function ( req , res ){
	var conditions = {
		ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
		_id : req.headers.page_id ? req.headers.page_id : 0, 
		IsDeleted : 0
	};
	
	var fields = {
		Title : true
	}; 
		
	Page.findOne(conditions , fields , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page Title",
				result : result.Title
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}

/*________________________________________________________________________
   * @Date:      		11 Dec 2015
   * @Method :   		updatePageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.updatePageName = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	data.Title = req.body.page_name ? req.body.page_name : "";
	data.UpdatedOn = Date.now();
	
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page name updated successfully 1.",
				result : result				
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}

ContentPage.create = function ( req , res ){
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var data = {};
	data.CreaterId = req.session.user._id;
	data.OwnerId = req.session.user._id;
	
	data.ChapterId = req.headers.chapter_id ? req.headers.chapter_id : null;
	data.PageType = req.body.page_type ? req.body.page_type : "content";  
	 
	 
	data.CommonParams =  {};
	data.CommonParams.Background =  {};
	data.ViewportDesktopSections = {};
	data.ViewportDesktopSections.Background = {};
	data.ViewportDesktopSections.Widgets = [];
	//data.ViewportDesktopSections.Widgets[0] = {};
	
	data.ViewportTabletSections = {};
	data.ViewportTabletSections.Background = {};
	data.ViewportTabletSections.Widgets = [];
	//data.ViewportTabletSections.Widgets[0] = {};
	
	data.ViewportMobileSections = {};
	data.ViewportMobileSections.Background = {};
	data.ViewportMobileSections.Widgets = [];
	//data.ViewportMobileSections.Widgets[0] = {};
	
	Page(data).save(function( err , result ){
            if( !err ){
                var response = {
                    status: 200,
                    message: "Page created successfully.",
                    result : result
                }
				pushPageId(data.ChapterId,result._id)
                res.json(response);
            }
            else{
                console.log(err);
                var response = {
                    status: 501,
                    message: "Something went wrong." 
                }
                res.json(response);
            }
	});

}

// Questtion Answer Widget's hidden board
ContentPage.create_QawGallery = function ( req , res ){
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var data = {};
	data.CreaterId = req.session.user._id;
	data.OwnerId = req.session.user._id;
	
	data.ChapterId = req.headers.chapter_id ? req.headers.chapter_id : null;
	data.PageType = "qaw-gallery";  
	 
	Page(data).save(function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page created successfully.",
				result : result
			}
			//pushPageId(data.ChapterId,result._id) - need to know this case - anyways I don't think it would be needed as It's not a SG page while a hidden board
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}

/*________________________________________________________________________
   * @Date:      		20 Jan 2016
   * @Method :   		updatePageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.updateWidgets = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	
	var currentViewport = req.body.currentViewport ? req.body.currentViewport : "desktop";

	switch(currentViewport){
		case 'desktop':
			data.ViewportDesktopSections = req.body.ViewportDesktopSections ? req.body.ViewportDesktopSections : {};
			break;
		case 'tablet':
			data.ViewportTabletSections = req.body.ViewportTabletSections ? req.body.ViewportTabletSections : {};
			break;
		case 'mobile':
			data.ViewportMobileSections = req.body.ViewportMobileSections ? req.body.ViewportMobileSections : {};
			break;
		default : 
			console.log("Error-99999 : Wrong value of currentViewport = ",currentViewport);
			var response = {
					status: 501,
					message: "Something went wrong." 
			}
			res.json(response);
			return;
	}
	
	//data.ViewportDesktopSections = req.body.ViewportDesktopSections ? req.body.ViewportDesktopSections : {};
	data.UpdatedOn = Date.now();
	console.log("conditions = ",conditions,data);
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page name updated successfully 2.",
				result : result				
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}


/*________________________________________________________________________
   * @Date:      		20 Jan 2016
   * @Method :   		updatePageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.updateBackground = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {
		CommonParams : {
			Background : {
				Type : "",
				Data : "",
				LqData : "",
				Thumbnail : "",
				BgOpacity : ""
			}
		}
	};
        
	console.log("req.body ================= " , req.body);
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	
	data.CommonParams.Background.Type = req.body.Type ? req.body.Type : "color";
	data.CommonParams.Background.Data = req.body.Data ? req.body.Data : "";
	data.CommonParams.Background.LqData = req.body.LqData ? req.body.LqData : "";
	data.CommonParams.Background.Thumbnail = req.body.Thumbnail ? req.body.Thumbnail : "";
	data.CommonParams.Background.BgOpacity = String(req.body.BgOpacity) ? String(req.body.BgOpacity) : "";

	console.log("data ================= " , data);
	console.log("conditions = ",conditions);
	data.UpdatedOn = Date.now();
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page updated successfully.",
				result : result				
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});
}


/*________________________________________________________________________
   * @Date:      		20 Jan 2016
   * @Method :   		updatePageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.updateCommonParams = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {
		CommonParams : req.body.CommonParams,
		UpdatedOn : Date.now()
	}
        
	console.log("req.body ================= " , req.body);
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	
        console.log("data ================= " , data);
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
            if( !err ){
                var response = {
                    status: 200,
                    message: "Page updated successfully.",
                    result : result				
                }
                res.json(response);
            }
            else{
                console.log(err);
                var response = {
                    status: 501,
                    message: "Something went wrong." 
                }
                res.json(response);
            }
	});

}


/*________________________________________________________________________
   * @Date:      		20 Jan 2016
   * @Method :   		createWidget
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.createWidget = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
        
        var widgetType = req.body.currentViewport ? req.body.currentViewport : ""; 
        //"text","image","audio","video","questAnswer"
        
        switch(widgetType){
            case "text" : 
                data = {
                    SrNo : 1,
                    Animation : "fadeIn",
                    BgMusic : "",
                    Type : "text",
                    Data : "Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum",
                    W : 610,
                    H : 322,
                    X : 100,
                    Y : 400
                };
                break;
            case "image" : 
                data = {
                    SrNo : 1,
                    Animation : "fadeIn",
                    BgMusic : "",
                    Type : "image",
                    Data : "",
                    W : 610,
                    H : 322,
                    X : 100,
                    Y : 400
                };
                break;
            case "video" : 
                data = {
                    SrNo : 1,
                    Animation : "fadeIn",
                    BgMusic : "",
                    Type : "video",
                    Data : "",
                    W : 610,
                    H : 322,
                    X : 100,
                    Y : 400
                };
                break;
            case "audio" : 
                data = {
                    SrNo : 1,
                    Animation : "fadeIn",
                    BgMusic : "",
                    Type : "text",
                    Data : "",
                    W : 610,
                    H : 322,
                    X : 100,
                    Y : 400
                };
                break;
            case "questAnswer" : 
                data = {
                    SrNo : 1,
                    Animation : "fadeIn",
                    BgMusic : "",
                    Type : "questAnswer",
                    Data : "",
                    W : 610,
                    H : 322,
                    X : 100,
                    Y : 400
                };
                break;
            default :
                console.log("Input Error : Wrong Widget Type = ",widgetType);
                return;
                
        }
        
        var currentViewport = req.body.currentViewport ? req.body.currentViewport : "";
        var finalData = {};
        
        switch(currentViewport){
            case "desktop" : 
                finalData.ViewportDesktopSections.Widgets.push(data);
                break;
            case "tablet" : 
                finalData.ViewportTabletSections.Widgets.push(data);
                break;
            case "mobile" : 
                finalData.ViewportMobileSections.Widgets.push(data);
                break;
            default:
                console.log("Input Error : Wrong currentViewport Value = ",currentViewport);
                return;
        }
        
	data.ViewportDesktopSections = req.body.ViewportDesktopSections ? req.body.ViewportDesktopSections : {};
	data.UpdatedOn = Date.now();
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page name updated successfully 3.",
				result : result				
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}

/*________________________________________________________________________
   * @Date:      		20 Jan 2016
   * @Method :   		removeWidget
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

ContentPage.removeWidget = function ( req , res ){
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)
	
	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	data.ViewportDesktopSections = req.body.ViewportDesktopSections ? req.body.ViewportDesktopSections : {};
	data.UpdatedOn = Date.now();
	console.log("conditions = ",conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Page.update(conditions , {$set:data} , function( err , result ){
		if( !err ){
			var response = {
				status: 200,
				message: "Page name updated successfully 4.",
				result : result				
			}
			res.json(response);
		}
		else{
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong." 
			}
			res.json(response);
		}
	});

}


//updated on 06012015
//req.body.MediaType = 'WidgetImage' //'WidgetImage','WidgetVideo','WidgetAudio','WidgetQuestAnswer','WidgetBgImage','WidgetBgVideo'
ContentPage.uploadMedia = function(req,res){
    var AddedWhere = "contentPage";
    var AddedHow = req.body.AddedHow ? req.body.AddedHow : 'hardDrive';        //hardDrive,'dragDropLink','dragDropFile'
    var MediaType = ""; //'WidgetBgImage','WidgetBgVideo','WidgetImage','WidgetVideo','WidgetAudio','WidgetQuestAnswer'
    console.log("req.body-------------",req.body);
    console.log("------MediaType--------",MediaType);
    
    var RecordLocator = "";
    var incNum = 0;
    counters.findOneAndUpdate(
        { _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
        if (!err) {
            console.log('=========================')
            console.log(data);
            //data.seq=(data.seq)+1;
            console.log(data.seq);
            incNum=data.seq;
            //data.save();
            console.log("incNum="+incNum);
            
            var form = new formidable.IncomingForm();
            form.parse(req, function(err, fields, files) {
            var file_name="";
            console.log("Fields",fields);
            
            MediaType = fields.MediaType ? fields.MediaType : '';        
            
            //'WidgetBgImage', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetBgVideo', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetImage',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetVideo',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetAudio',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetQuestAnswer'
            if(MediaType == 'WidgetBgVideo' || MediaType == 'WidgetVideo' || MediaType == 'WidgetAudio'){
                switch(MediaType){
                    case "WidgetBgVideo" :
                        saveFile(req,res,"Video" , MediaType , files);
                        break;
                    case "WidgetVideo" :
                        saveFile(req,res,"Video" , MediaType , files);
                        break;
                    case "WidgetAudio" :
                        saveFile(req,res,"Audio" , MediaType , files);
                        break;
                    default :
                        console.log("Something went wrong-876675755----------------");
                }
            }
            else{
                //image or document case
                if(files.myFile.name){	  
                    uploadDir = __dirname + "/../../public/assets/Media/img";
                    file_name=files.myFile.name;
                    file_name=file_name.split('.');
                    ext=file_name[file_name.length-1];
                    RecordLocator = file_name[0];
                    var name = '';
                    name = dateFormat()+'_'+incNum;
                    file_name=name+'.'+ext;

                    fs.renameSync(files.myFile.path, uploadDir + "/" + file_name)

                    var media_type='';

                    if(files.myFile.type=="application/pdf" || files.myFile.type=="application/msword" || files.myFile.type=="application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||  files.myFile.type=="application/vnd.ms-excel" || files.myFile.type=="application/vnd.oasis.opendocument.spreadsheet" ||  files.myFile.type=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || files.myFile.type=="application/vnd.ms-powerpoint" || files.myFile.type=='application/vnd.openxmlformats-officedocument.presentationml.presentation'){
                        media_type='Document';
                    }
                    else if(files.myFile.type=='video/mp4' || files.myFile.type=='video/ogg' || files.myFile.type=='video/webm'){
                        media_type='Video';			    
                        //gridfs code will be here

                    }
                    else if(files.myFile.type=='audio/mpeg' || files.myFile.type=='audio/ogg'){
                        media_type='Audio';			    
                        //gridfs code will be here
                    }
                    else{
                        media_type='Image'; //not in work - using MediaType - coming from client end req.body.MediaType

                        //add thumbnail code
                        var imgUrl = file_name;
                        var mediaCenterPath = path.join("/../../public/assets/Media/img/");
                        var srcPath = path.join(__dirname + mediaCenterPath + imgUrl);

                        if (fs.existsSync(srcPath)) {
                            var dstPathCrop_SMALL = path.join(__dirname + mediaCenterPath + process.urls.small__thumbnail+"/"+ imgUrl);
                            var dstPathCrop_SG = path.join(__dirname + mediaCenterPath + process.urls.SG__thumbnail+"/"+ imgUrl);
                            var dstPathCrop_MEDIUM = path.join(__dirname+ mediaCenterPath + process.urls.medium__thumbnail+"/"+imgUrl);
                            var dstPathCrop_LARGE = path.join(__dirname+ mediaCenterPath + process.urls.large__thumbnail+"/"+imgUrl);
                            var dstPathCrop_ORIGNAL = path.join(__dirname+ mediaCenterPath +process.urls.aspectfit__thumbnail+"/"+imgUrl);

                            try{
                                crop_image(srcPath,dstPathCrop_SMALL,100,100);
                                crop_image(srcPath,dstPathCrop_SG,300,300);
                                //crop_image(srcPath,dstPathCrop_400,400,400);
                                //crop_image(srcPath,dstPathCrop_500,500,500);

                                //updated on 09022015 as per client request
                                crop_image(srcPath,dstPathCrop_MEDIUM,600,600);
                                crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
                                resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);

                            }
                            catch(err){
                                console.log("Error Caught : ",err)
                            }
                        }
                    }

                    if (req.session.user.FSGs) {

                    }
                    else{
                        req.session.user.FSGs={};
                    }
                    console.log('-------------------------------------------------------------------------------');

                    dataToUpload={
                    Location:[],
                    UploadedBy:"user",
                    UploadedOn:Date.now(),
                    UploaderID:req.session.user._id,
                    AutoId:incNum,
                    Source:"ThinkStock",
                    //SourceUniqueID:null,
                    SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
                    //Domains:fields.domain,
                    Domains:"53ad6993f222ef325c05039c",
                    GroupTags:[],
                    //Collection:fields.collection,
                    Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
                    Status:2, 
                    MetaMetaTags:null,
                    MetaTags:null,
                    //AddedWhere:"hardDrive", //directToPf,hardDrive,dragDrop
                    AddedWhere:AddedWhere , //directToPf,board,capsule,contentPage
                    IsDeleted:0,
                    TagType:"",
                    ContentType:files.myFile.type,
                    MediaType:MediaType,
                    AddedHow:AddedHow,
                    //OwnerFSGs:req.session.user.FSGs,
                    OwnerFSGs:req.session.user.FSGsArr2,
                    Locator:RecordLocator+"_"+incNum
                    }
                    if(fields.gt){ 
                        dataToUpload.GroupTags.push({
                            GroupTagID:fields.gt
                        })
                    }

                    dataToUpload.Location.push({
                        Size:files.myFile.size,
                        URL:file_name
                    })

                    console.log('===========================================================================')
                    console.log(dataToUpload)
                    console.log('===========================================================================')

                    media(dataToUpload).save(function(err,model){
                        if(err){		    
                            res.json(err);
                        }
                        else{
                            console.log("Data",model)
                            dataToUpload._id=model._id
                            res.json(dataToUpload);
                        }
                    });
                }
            }
        });
    }
    })
}

ContentPage.uploadLink = function(req,res){
    var AddedWhere = "contentPage";
    var AddedHow = req.body.AddedHow ? req.body.AddedHow : 'dragDropLink';        //hardDrive,'dragDropLink','dragDropFile',pasteLink
    
    var incNum = 0;
    counters.findOneAndUpdate(
    { _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
        if (!err) {
            console.log('=========================');console.log(data);console.log(data.seq);
            incNum=data.seq;console.log("incNum="+incNum);
            
            req.body.linkType = req.body.linkType ? req.body.linkType : "";     //image,video,audio
            req.body.content = req.body.content ? req.body.content : "";
            req.body.thumbnail = req.body.thumbnail ? req.body.thumbnail : "";
            req.body.MediaType = req.body.MediaType ? req.body.MediaType : "WidgetLink";     //'WidgetBgLink,'WidgetLink'
            
            //'WidgetBgImage', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetBgVideo', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetImage',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetVideo',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetAudio',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
            //'WidgetQuestAnswer',
            //'WidgetBgLink'
            
            var LinkType = '';
            if( req.body.linkType ){
                LinkType = req.body.linkType;
            }

            var thumbnail = '';
            
            if(req.body.thumbnail){
                thumbnail = req.body.thumbnail;
                //console.log("Thumbnail = "+thumbnail);
                var url = require('url');
                var f = '';
                var fArr = [];
                //var fileName = "web-link-"+Date.now()+url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
                f = url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
                fArr = f.split('.');
                RecordLocator = fArr[0];
                console.log("RecordLocator = "+RecordLocator);//return;
                ext = fArr[fArr.length - 1];
                //var fileName = Date.now()+'_'+incNum+'.'+ext;
                var name = '';
                name = RecordLocator;
                   var fileName = dateFormat()+'_'+incNum+'.'+ext;
                //asynchronous call - child process command execution
                saveFileFromUrl(thumbnail , fileName);
                thumbnail = fileName;
            }
            console.log("------------------name = ",name);

            var dataToUpload={
                Location:[],
                AutoId:incNum,
                UploadedBy:"user",
                UploadedOn:Date.now(),
                UploaderID:req.session.user._id,
                Source:"Thinkstock",
                //SourceUniqueID:null,
                SourceUniqueID:"53ceb02d3aceabbe5d573dba", //updated on 06012015
                //Domains:null,
                Domains:"53ad6993f222ef325c05039c",
                GroupTags:[],
                //Collection:null,
                Collection:["53ceaf933aceabbe5d573db4","53ceaf9d3aceabbe5d573db6","549323f9610706c30a70679e"],
                //Status:0,
                Status:2, //updated on 25122014 by manishp after discussing with amitchh - for more detail on Status codes check the comments on media model
                MetaMetaTags:null,
                MetaTags:null,
                //AddedWhere:"directToPf", //directToPf,hardDrive,dragDrop
                AddedWhere:AddedWhere, //directToPf,board,capsule,contentPage
                AddedHow:AddedHow,      //hardDrive,'dragDropLink','dragDropFile',pasteLink
                IsDeleted:0,
                TagType:"",
                Content:req.body.content,
                ContentType:req.body.MediaType,
                MediaType:req.body.MediaType,
                thumbnail:thumbnail,	//added on 24122014 by manishp embedded link thumbnail case.
                Locator:name+"_"+incNum,
                LinkType:LinkType,
                OwnerFSGs:req.session.user.FSGsArr2
            }
            
            dataToUpload.Location.push({
                Size:"",
                URL:thumbnail
            })

            //console.log("dataToUpload = ",dataToUpload);return;
            media(dataToUpload).save(function(err,tata){
                if(err){
                  res.json({"code":"404","message":err});
                }
                else{
                    res.json({"code":"200","message":"success","response":tata})
                }
            });   
        }
    });
}

/*________________________________________________________________________
	* @Date:      	13 Oct 2015
	* @Method :   	gridFsSaveVideo
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-
	* @Purpose:   	-
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/
var gridFsSaveVideo = function(req,res){
    var form = new formidable.IncomingForm();
    form.keepExtensions = true;     //keep file extension
    form.uploadDir = (__dirname+"/../../public/assets/Media/video/widgets/");       //set upload directory
    form.parse(req, function(err, fields, files) {
        var source_path = files.file.path;
        var isFirefox = req.params.browser == 'f' ? true : false;
        var command = ffmpeg();
        var type = source_path.split('.').pop();
        console.log(type.toUpperCase()+"============================================");
        console.log(isFirefox+"============================================");
        try {
            if (isFirefox && type.toUpperCase() != 'WEBM') {
                console.log('converting to webm');
                console.log('source_path  ==  '+source_path);
                var output_path = source_path.replace('.'+type,'.webm');
                var fileName = files.file.name.replace('.'+type,'.webm');
                console.log('output_path  ==  '+output_path);
                ffmpeg(source_path)
                .format('webm')
                .save(output_path)
                .on('end', function () {
                        console.log('here000000000000000000000000000000000000000000000000000000000000');
                        //if (!error){
                                //console.log('Video file: ' + file);
                                var conn =  mongoose.createConnection('mongodb://172.24.3.129/test-coll-import',function(err){
                                })
                                conn.once('open',function(){
                                        console.log('conection open');
                                        var gfs = Grid(conn.db);
                                        var writestream = gfs.createWriteStream({filename:files.file.name, metadata:{ mimetype : files.file.type} });
                                        fs.createReadStream(output_path).pipe(writestream);
                                        writestream.on('close', function (file) {
                                                // do something with `file`
                                                console.log(file.mimetype);
                                                res.json(file);
                                        });
                                });
                        //}else{
                        //	console.log("--------------------error---------------------------------")
                        //	console.log(error)
                        //}
                });
            }else if(!isFirefox && type.toUpperCase() != 'MP4' ){
                console.log('converting to mp4');
                console.log('source_path  ==  '+source_path);
                var output_path = source_path.replace('.'+type,'.mp4');
                var fileName = files.file.name.replace('.'+type,'.mp4');
                console.log('output_path  ==  '+output_path);
                ffmpeg(source_path)
                .format('mp4')
                .save(output_path)
                .on('end', function () {
                        var conn =  mongoose.createConnection('mongodb://172.24.3.129/test-coll-import',function(err){
                        })
                        conn.once('open',function(){
                                console.log('conection open');
                                var gfs = Grid(conn.db);
                                var writestream = gfs.createWriteStream({filename:fileName , metadata:{ mimetype : 'video/mp4'} });
                                fs.createReadStream(output_path).pipe(writestream);
                                writestream.on('close', function (file) {
                                        // do something with `file`
                                        console.log(file.mimetype);
                                        res.json(file);
                                });
                        });
                });
            }
            else{
                console.log('saving as it is');
                var conn =  mongoose.createConnection('mongodb://172.24.3.129/test-coll-import',function(err){
                })
                conn.once('open',function(){
                        console.log('conection open');
                        var gfs = Grid(conn.db);
                        var writestream = gfs.createWriteStream({filename:files.file.name, metadata:{ mimetype : files.file.type} });
                        fs.createReadStream(source_path).pipe(writestream);
                        writestream.on('close', function (file) {
                                // do something with `file`
                                console.log(file.mimetype);
                                res.json(file);
                        });
                });
            }
        } catch (e) {
            console.log('-----------------------error');
            console.log(e);
            console.log(e.code);
            console.log(e.msg);
        }
    });
}
exports.gridFsSaveVideo = gridFsSaveVideo;
	

	
		
	
/*________________________________________________________________________
	* @Date:      	13 Oct 2015
	* @Method :   	streamGridfsVideo
	* Created By: 	smartData Enterprises Ltd
	* Modified On:	-27 02 2015- 
	* @Purpose:   	This function is used to Update all un.
	* @Param:     	2
	* @Return:    	no
	_________________________________________________________________________
*/
var streamGridfsVideo = function(req,res){
        console.log('-----------here in streamGridfsVideo-----------------');
                var conn =  mongoose.createConnection('mongodb://172.24.3.129/test-coll-import',function(err){
                })
                conn.once('open',function(){
                        console.log('-----------connection open---------------');
                                var options = {_id:req.params.id};
                                var gfs = Grid(conn.db);
                                gfs.files.findOne({_id : mongoose.mongo.BSONPure.ObjectID(req.params.id)}, function(err,file){
                                        if (!err) {
                                                gfs.exist(options, function (err, found) {
                                                        if (err) res.json(err);
                                                        if(found){
                                                                console.log(file);
                                                                var readstream = gfs.createReadStream(options, {range: {
                                                                                                                                                                startPos: 0,
                                                                                                                                                                endPos: (file.length-1)
                                                                                                                                                          }});
                                                                console.log(req.headers['range']);
                                                                //res.status(206);
                                                                res.header("Accept-Ranges", "bytes"+ 1 + '-' + (file.length-1) + '/' + file.length);
                                                                res.header("Content-Length", file.length);
                                                                res.header("Cache-Control", 'public, max-age=31536000');
                                                                console.log('------------------------------------');
                                                                console.log(file);
                                                                console.log('------------------------------------');
                                                                res.contentType(file.metadata.mimetype);
                                                                readstream.pipe(res);
                                                        }
                                                        else{
                                                                console.log('File does not exist');
                                                        }
                                                });
                                        }else{
                                                res.json(err);
                                        }
                                })

                });
}
exports.streamGridfsVideo = streamGridfsVideo;	


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
function saveFile(req,res,fileType,MediaType,files){
    var MediaType = MediaType ? MediaType : "recording";
    console.log('========================================= here =========================================')
    //var form = new formidable.IncomingForm();
    //form.keepExtensions = true;     //keep file extension
    //form.uploadDir = (__dirname+"/../../public/assets/Media/video/");       //set upload directory
    //form.keepExtensions = true;     //keep file extension
    
    //form.parse(req, function(err, fields, files) {
        console.log('========================================= here2 =========================================',files)
        console.log("file size: "+JSON.stringify(files.myFile.size));
        console.log("file path: "+JSON.stringify(files.myFile.path));
        console.log("file name: "+JSON.stringify(files.myFile.name));
        console.log("file type: "+JSON.stringify(files.myFile.type));
        console.log("lastModifiedDate: "+JSON.stringify(files.myFile.lastModifiedDate));
        var temp = files.myFile.name.split('.');
        var ext = temp.pop();
        var incNum = 0;
        var dateTime = new Date().toISOString().replace(/T/,'').replace(/\..+/, '').split(" ");
        counters.findOneAndUpdate({ _id: "userId" },{$inc:{seq:1}},{new:true},function(err,data){
            if (!err) {
                incNum=data.seq;
                var fileName = Date.now()+"_"+MediaType+"_"+ incNum + "." + ext;

                fs.rename(files.myFile.path, __dirname+"/../../public/assets/Media/video/"+ fileName, function(err) {
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
                        saveMedia__toDB(req,res,incNum, fileName,fileType , MediaType);
                        //res.json({'filename':"../assets/Media/video/Recorded_" + incNum + '.' + ext});
                    }
                });
            }
        })
    //});
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
function saveMedia__toDB(req,res,incNum, fileName,fileType , MediaType){
    var AddedWhere = "contentPage";
    var AddedHow = req.body.AddedHow ? req.body.AddedHow : 'hardDrive';        //hardDrive,'dragDropLink','dragDropFile'
    
    
    if (req.session.user.FSGsArr2) {
    }
    else{
        req.session.user.FSGsArr2={};
    }
    if (incNum) {
        var thumbName = fileName.replace( '.'+fileName.split('.').pop() , '.png');
        var locator = fileName.replace( '.'+fileName.split('.').pop() , '');
        //'Recorded_'+incNum+'.png'

        var cType = 'video/webm';
        if ( fileType == 'Audio' ) {
            cType = 'audio/mp3';
            thumbName = 'default_audio_thumb.png';
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
            AddedWhere:AddedWhere, //directToPf,board,capsule
            IsDeleted:0,
            TagType:"",
            ContentType: cType,
            MediaType:MediaType,
            AddedHow:AddedHow,
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
                    video__getNsaveThumbnail(fileName , dataToUpload._id , dataToUpload , res);	
                }
                else{
                    console.log("==================================" + dataToUpload._id);
                    res.json(dataToUpload);
                }
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
function video__getNsaveThumbnail(inputFile , MediaId , dataToUpload , res){
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
                                        res.json(dataToUpload);
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

// To get images by Arun sahani
ContentPage.getMedia = function(req,res){
	var MediaType = req.body.type ? req.body.type : "";
	var selectedKeyword = req.body.selectedKeyword ? req.body.selectedKeyword : false;
	var conditions = {};
	var fields = {
		Posts : false,
		Stamps : false,
		Marks : false
	};
	switch (MediaType){
		case "Image" : 
			conditions = {
				$or:[{"MediaType":'Image'},{"MediaType":'Link',"LinkType":'image'}]
			}
			break;
		case "Video" : 
			conditions = {
				$or:[{"MediaType":'Video'},{"MediaType":'Link',"LinkType":{$ne:'image'},"$or":[{"Content":new RegExp("youtu", 'i')},{"Content":new RegExp("vimeo", 'i')}]}]
			}
			break;
		default : 
			console.log("Unexpected Case found = ",MediaType);
			res.json({"code":"404","msg":"Not Found",responselength:0});
			return;
	}
	
	if(selectedKeyword != false){
		conditions["GroupTags.GroupTagID"] = selectedKeyword;
	}
	
	conditions.Status = 1;
	conditions.IsDeleted = 0;
	conditions.IsPrivate = {$ne:1}
	conditions.AddedWhere = {$ne:"contentPage"};
	console.log("conditions----------" , conditions);//return;
     
    media.find(conditions , fields).sort({UploadedOn: 'desc'}).skip(req.body.skip).limit(req.body.limit).exec(function(err,result){
	    if(err){ 		
		 res.json(err);
	    } else{
			media.find(conditions).count().exec(function(err,count){
				//console.log("Count",result);
				res.json({"code":"200","msg":"Success","response":result,"count": count});
			})
	    }
    })
}

// For Text Search added by arun

ContentPage.getallKeywords = function(req, res){
	//var regex = new RegExp('^('+req.body.startsWith+')','i');
	var regex = new RegExp('\s*\s*^\s*\s*'+req.body.startsWith,'i');
	console.log(regex);
    //groupTags.find({$or:[{status:1,'Tags.TagTitle':regex},{status:1,'GroupTagTitle':regex},{status:3,'Tags.TagTitle':regex},{status:3,'GroupTagTitle':regex}]},function(err,result){		
	//groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){		
	//groupTags.find({$or:[{status:1},{status:3}]},function(err,result){
	//groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){		
	var conditions = {
		GroupTagTitle:regex,
		status : 3
	};
	var fields = {
	    _id : true,
	    GroupTagTitle : true,
	    Tags : true
    };
    var sort = {
	    GroupTagTitle:1
    };
    var limit = 100;
	
	groupTags.find(conditions,fields).sort(sort).limit(limit).exec(function(err,result){			
		if(err){ 		
			res.json(err);
		}
		else{
			if(result.length==0){
				res.json({"code":"404","msg":"Not Found"})
			}
			else{				
				res.json({"code":"200","msg":"Success","response":result})
			}
		}
    });
};



ContentPage.dashEditCreate = function ( req , res ){
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	var data = {};
	data.CreaterId = req.session.user._id;
	data.OwnerId = req.session.user._id;
	data.IsDeleted = 1;
	
	data.ChapterId = req.headers.chapter_id ? req.headers.chapter_id : null;
	data.PageType = req.body.page_type ? req.body.page_type : "content";  
	 
	 
	data.CommonParams =  {};
	data.CommonParams.Background =  {};
	data.ViewportDesktopSections = {};
	data.ViewportDesktopSections.Background = {};
	data.ViewportDesktopSections.Widgets = [];
	//data.ViewportDesktopSections.Widgets[0] = {};
	
	data.ViewportTabletSections = {};
	data.ViewportTabletSections.Background = {};
	data.ViewportTabletSections.Widgets = [];
	//data.ViewportTabletSections.Widgets[0] = {};
	
	data.ViewportMobileSections = {};
	data.ViewportMobileSections.Background = {};
	data.ViewportMobileSections.Widgets = [];
	//data.ViewportMobileSections.Widgets[0] = {};
	
	Page(data).save(function( err , result ){
            if( !err ){
		    var data = {};
			    data = result.toObject();
			    delete data._id;		//so that new id will be created automartically
			    delete data.IsDeleted;
			    data.UpdatedOn = Date.now();
			    data.OriginatedFrom = result._id;
			    data.Origin = "publishNewChanges";
			    data.IsDasheditpage = true;
			    data.IsLaunched = false;


			    Page(data).save(function( err , results ){
				    if( !err ){
					    var response = {
						    status: 200,
						    message: "Page duplicated successfully.",
						    result : results				
					    }
					    res.json(response);
				    }
				    else{
					    console.log(err);
					    var response = {
						    status: 501,
						    message: "Something went wrong." 
					    }
					    res.json(response);
				    }
			    });
            }
            else{
                console.log(err);
                var response = {
                    status: 501,
                    message: "Something went wrong." 
                }
                res.json(response);
            }
	});

}

// To push page id in chapter by arun sahani 20-05-2016
var pushPageId = function(chapterId , pageId){
	Chapter.update({_id: chapterId},{ $push: { pages: pageId} },function(err,data){
		if (err) {
			console.log(err);
		}else{
			console.log("page saved in chapter successfully.");
		}
	})
}
//My Pages Apis
module.exports = ContentPage;
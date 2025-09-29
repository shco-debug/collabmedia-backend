var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');

var async = require('async');

Array.prototype.contains = function(v) {
    for(var i = 0; i < this.length; i++) {
        if(this[i] === v) return true;
    }
    return false;
};

Array.prototype.unique = function() {
    var arr = [];
    for(var i = 0; i < this.length; i++) {
        if(!arr.contains(this[i])) {
            arr.push(this[i]);
        }
    }
    return arr; 
}

//posts Apis

/*________________________________________________________________________
   * @Date:      		25 Oct 2017
   * @Method :   		getCommunityPosts
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR" + "CR"
_________________________________________________________________________
STEPS : ----
#) filters :
		- Check for - whether the page is allowed to show community posts or not ?
		- This is only for public/retail capsules - check for the same.

#) get all instance of the purchased capsule


*/
var getCommunityPosts = function ( req , res ){
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ( (req.body.pageNo-1) * limit) : 0;
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0,
		Origin : {"$ne":"publishNewChanges"},
		OwnerId : req.session.user._id,
		//IsDashEditPage : {$exists:false},
		IsDeleted : 0,
		PageType : {$in : ["gallery" , "content"]}
	};
	
	if(req.body.chapterCheck){
		conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
	}
	
	var sortObj = {
		UpdatedOn : -1
	};
	
	var fields = {
		SelectedMedia : false,
        SelectedKeywords : false,
		SelectedFilters : false,
		SelectedGts : false,
		AddAnotherGts : false,
		ExcludedGts : false,
		UploadedMedia : false,
		Medias : false,
		CommonParams : false,
        ViewportDesktopSections : false,
        ViewportTabletSections : false,
        ViewportMobileSections : false
	}; 
		
	Page.find(conditions , fields).skip(offset).limit(limit).populate('ChapterId').sort(sortObj).exec(function( err , results ){
		if( !err ){
			Page.find(conditions , fields).count().exec(function( errr , resultsLength ){
				if (!errr) {
					var response = {
						count : resultsLength,
						status: 200,
						message: "Pages listing",
						results : results
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
			})
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
	
	//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
	async.series({
		createNewInstance__HiddenBoard : function(callback){
			if( finalObj.UNIQUE__allHiddenBoardId_Arr.length ){
				var conditions = {
					_id : {$in : finalObj.UNIQUE__allHiddenBoardId_Arr}
				}
				var fields = {
					Medias : false
				}
				Page.find(conditions , fields).lean().exec(function(err , results){
					if(!err){
						console.log("-------------results------------",results);
						var results = results ? results : [];
						var returnCounter = 0;
						var totalOps = results.length ? results.length : 0;
						if(totalOps){
							var oldPageId = null;
							for( var loop = 0; loop < totalOps; loop++ ){
								oldPageId = results[loop]._id;
								var newInstanceData = results[loop];
								newInstanceData.OriginatedFrom = oldPageId;
								newInstanceData.Origin = 'duplicated';
								
								//console.log("WTF-----------------------",oldPageId);
								delete newInstanceData._id;
								//console.log("WTF-----------------------",oldPageId);
								
								newInstanceData.CreatedOn = Date.now();
								newInstanceData.UpdatedOn = Date.now();
								//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
								CreateNewInstance__HiddenBoardFunc ( oldPageId , newInstanceData , totalOps );
							}
							
							function CreateNewInstance__HiddenBoardFunc ( sourcePageId , dataToSave , totalOps ) {
								var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
								//sourcePageId__DestinationPageId
								Page(dataToSave).save(function(err , result){
									returnCounter++;
									if(!err){
										var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
										sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
									}
									else{
										console.log("DB ERROR : ",err);
										return callback(err);
									}
									
									if( totalOps == returnCounter ){
										callback(null , sourcePageId__DestinationPageId__Arr);
									}
								})
							}
						}
						else{
							callback(null , sourcePageId__DestinationPageId__Arr);
						}
					}
					else{
						console.log("DB ERROR : ",err);
						return callback(err);
					}
				});
			}
			else{
				callback(null , sourcePageId__DestinationPageId__Arr);
			}
		}
	},
	function(err, results) {
		//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
		if(!err){
			console.log("*************************************** results**************",results);
			var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
			for( var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++  ){
				var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
				var SourcePageId = recordArr[0];
				var NewPageId = recordArr[1];
				console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ",finalObj.margedArrOfAllQAPageIds );
				console.log("*************************************** SourcePageId**************NewPageId ",SourcePageId+"------------------"+NewPageId );
				for( var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++ ){
					var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
					var SourcePageId_2 = recordArr2[0];
					var WidgetIndex = recordArr2[1];
					var Viewport = recordArr2[2];
					if( SourcePageId_2 == SourcePageId ){
						console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2+" ====== "+ SourcePageId );
						switch (Viewport){
							case 'DESKTOP' : 
								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
								data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
								break;
								
							case 'TABLET' : 
								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
								data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
								break;
								
							case 'MOBILE' : 
								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
								data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
								break;
						}
					}
				}
			}
		}
		else{
			console.log("**************************************************DB ERROR :",err);
		}
		
		console.log("data = ",data);
		Page(data).save(function( err , result ){
			if( !err ){
				var response = {
					status: 200,
					message: "Page duplicated successfully.",
					result : result,
					finalObj : finalObj,
					sourcePageId__DestinationPageId__Arr : sourcePageId__DestinationPageId__Arr
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
	});
}

//Posts Apis
exports.getCommunityPosts = getCommunityPosts;

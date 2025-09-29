var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');


/*
just to update chapter's and capsule's modifiedBy parameter on any change on the associated pages :
no return, background processing used by multiple apis...

Operations for which this function will be called.
Capsule Operations
	- Update Title

Chapter Operations : For the below operations, we will update Capsule's ModifiedOn Field
---> __capsule_touchUpdateFlag ( capsuleId )
	- add
	- Update Title
	- duplicate
	- addFromLibrary
	- delete
	- publish
		- changeCoverArt
		- addInvitee
		- addOwners

	- publishNewChanges

Page Operations : For the below operations, we will update Capsule's and Chapter's ModifiedOn Field --->
-----> __capsule_touchUpdateFlag ( capsuleId )
-----> __chapter__touchUpdateFlag ( chapterId )

	- add
	- Update Title
	- duplicate
	- addFromLibrary
	- delete
*/

var __capsule_touchUpdateFlag = function ( capsuleId ) {
	console.log("--@@@@@@@@@@@@@@@@@---------------------__capsule_touchUpdateFlag ======= ",capsuleId);
	if(capsuleId){
		var conditions = {
			_id : capsuleId
		}
		var setObj = {
			ModifiedOn : Date.now()
		}
		Capsule.update(conditions , {$set : setObj} , {multi:false} , function(err , result){
			if( !err ){
				console.log("__capsule_touchUpdateFlag.....SUCCESS",result);
			}
			else{
				console.log("__capsule_touchUpdateFlag.....ERROR",err);
			}
		})
	}
}

var __chapter__touchUpdateFlag = function ( chapterId ) {
	if(chapterId) {
		var conditions = {
			_id : chapterId
		}
		var setObj = {
			ModifiedOn : Date.now()
		}
		Chapter.update(conditions , {$set : setObj}, {multi:false} , function(err , result){
			if( !err ){
				console.log("__chapter__touchUpdateFlag.....SUCCESS",result);
			}
			else{
				console.log("__chapter__touchUpdateFlag.....ERROR",err);
			}
		})
	}
}

exports.__capsule_touchUpdateFlag = __capsule_touchUpdateFlag;
exports.__chapter__touchUpdateFlag = __chapter__touchUpdateFlag;
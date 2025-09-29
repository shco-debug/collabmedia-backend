var User = require('./../models/userModel.js');
var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');

//To Fetch All Users
var getAllReports = function (req, res) {

	var finalReport = {
		userCount : 0,
		capsuleCount : 0,
		chapterCount : 0,
		pagesCount : 0
	}
	var noOfReportDone = 0;
	function finalResult(){
		noOfReportDone++;
		
		if(noOfReportDone == 4){
			res.json({"code": "200", "msg": "Success", "userCount": finalReport.userCount, "chapterCount": finalReport.chapterCount, "capsuleCount": finalReport.capsuleCount, "pagesCount": finalReport.pagesCount});
		}
	}

    //To Get All User Count
    User.find({IsDeleted: false}).count(function (err, userCount) {
        if (err) {
            res.json(err);
        } else {
			finalReport.userCount = userCount;
			finalResult();
        }
    });
	
	//To Get All Capsules Count
	Capsule.find({Status: 1, IsDeleted: 1}).count(function (err, capsuleCount) {
		if (err) {
			res.json(err);
		} else {
			finalReport.capsuleCount = capsuleCount;
			finalResult();
		}
	});
	
	//To Get All Chapters Count
	Chapter.find({IsDeleted: false}).count(function (err, chapterCount) {
		if (err) {
			res.json(err);
		} else {
			finalReport.chapterCount = chapterCount;
			finalResult();
		}
	});
	
	//To Get All Pages Count
	Page.find({IsDeleted: 0}).count(function (err, pagesCount) {
		if (err) {
			res.json(err);
		} else {
			finalReport.pagesCount = pagesCount;
			finalResult();
		}
	});
};
exports.getAllReports = getAllReports;

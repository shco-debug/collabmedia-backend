var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var User = require('./../models/userModel.js');
var Friend = require('./../models/friendsModel.js');
var fs = require('fs');
var formidable = require('formidable');
var mediaController = require('./../controllers/mediaController.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
//var Page = require('./../models/pageModel.js');
var im = require('imagemagick');
var counters = require('./../models/countersModel.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var async = require('async');
var mongoose = require('mongoose');
// added by arun sahani 20/05/2016
var Capsule = require('./../models/capsuleModel.js');

var Order = require('./../models/orderModel.js');

var AppController = require('./../controllers/appController.js');	//Shared functions are inside this file.

var dateFormat = function () {
	var d = new Date,
		dformat = [(d.getMonth() + 1) > 10 ? (d.getMonth() + 1) : '0' + (d.getMonth() + 1),
		(d.getDate()) > 10 ? d.getDate() : '0' + d.getDate(),
		d.getFullYear()].join('') + '' +
			[d.getHours(),
			d.getMinutes(),
			d.getSeconds()].join('');
	return dformat;
}
//Chapters In the making Apis

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		find
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var find = function (req, res) {
	if(!req.headers.is_journal) {
		var conditions = {
			//CreaterId : req.session.user._id,
			_id: req.headers.chapter_id ? req.headers.chapter_id : 0,
			Status: 1,
			//IsLaunched : 0,
			IsDeleted: 0
		};

		var fields = {};
		console.log('===========================================');
		console.log(conditions);
		console.log('===========================================');

		Chapter.findOne(conditions).populate('CapsuleId').lean().exec(function (err, results) {
			if (!err) {
				//attach the UniqueIdPerOwner_CapsuleData
				results = results ? results : {};
				results.CapsuleId = results.CapsuleId ? results.CapsuleId : {};
				var UniqueIdPerOwner = results.CapsuleId.UniqueIdPerOwner ? results.CapsuleId.UniqueIdPerOwner : false;

				var IsRetailCapsule = false;
				if (UniqueIdPerOwner) {
					console.log("@@@@@@@@@@@@@-----------------UniqueIdPerOwner = ", UniqueIdPerOwner);
					Order.aggregate([
						{ $match: { TransactionState: "Completed", "CartItems.Owners.UniqueIdPerOwner": UniqueIdPerOwner } },
						{ $unwind: "$CartItems" },
						{ $unwind: "$CartItems.Owners" },
						{
							$project: {
								_id: "$_id",
								OrderInitiatedFrom: "$OrderInitiatedFrom",
								CreatedById: "$CreatedById",
								CreatedByEmail: "$CreatedByEmail",
								CapsuleId: "$CartItems.CapsuleId",
								UniqueIdPerOwner: "$CartItems.Owners.UniqueIdPerOwner",
								OwnerEmail: "$CartItems.Owners.OwnerEmail",
								OwnerName: "$CartItems.Owners.OwnerName",
								CreatedOn: "$CreatedOn",
								UpdatedOn: "$UpdatedOn",
							}
						},
						{
							$lookup: {
								from: "Capsules",
								localField: "UniqueIdPerOwner",
								foreignField: "UniqueIdPerOwner",
								as: "UniqueIdPerOwner_CapsuleData"
							}
						},
						{ $match: { UniqueIdPerOwner: UniqueIdPerOwner, OrderInitiatedFrom: "PGALLARY" } }
					]).exec(function (errAg, resAg) {
						//console.log("@@@@@@@@@@@@@@@22--------------resAg = ",resAg);
						if (errAg) {
							console.log(errAg);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
						else {
							if (resAg.length) {
								IsRetailCapsule = true;
							}
							else {
								IsRetailCapsule = false;
							}
							results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
							var response = {
								status: 200,
								message: "Chapters listing",
								result: results
							}
							res.json(response);
						}
					});
				}
				else {
					//console.log("@@@@@@@@@@@@@-----------------ELSE = ",UniqueIdPerOwner);
					results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
					var response = {
						status: 200,
						message: "Chapters listing",
						result: results
					}
					res.json(response);
				}
			}
			else {
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
		var conditions = {
			//CreaterId : req.session.user._id,
			_id: req.headers.chapter_id ? req.headers.chapter_id : 0,
			Status: 1,
			//IsLaunched : 0,
			IsDeleted: 0
		};

		var fields = {};
		console.log('===========================================');
		console.log(conditions);
		console.log('===========================================');

		Chapter.findOne(conditions).populate('CapsuleId').lean().exec(function (err, results) {
			if (!err) {
				//get the chapter playlist from General folder and attach with results - JOURNAL MODULE
				Chapter.findOne({_id : mongoose.Types.ObjectId("5c1ccf12b76f62790084f97c")} , {ChapterPlaylist:1}).lean().exec(function (err, ChapterPlaylistObj) {
					if(!err){
						ChapterPlaylistObj = ChapterPlaylistObj ? ChapterPlaylistObj : {};
						
						//attach the UniqueIdPerOwner_CapsuleData
						results = results ? results : {};
						results.CapsuleId = results.CapsuleId ? results.CapsuleId : {};
						
						results.ChapterPlaylist = ChapterPlaylistObj.ChapterPlaylist ? ChapterPlaylistObj.ChapterPlaylist : [];
						
						var UniqueIdPerOwner = results.CapsuleId.UniqueIdPerOwner ? results.CapsuleId.UniqueIdPerOwner : false;

						var IsRetailCapsule = false;
						if (UniqueIdPerOwner) {
							console.log("@@@@@@@@@@@@@-----------------UniqueIdPerOwner = ", UniqueIdPerOwner);
							Order.aggregate([
								{ $match: { TransactionState: "Completed", "CartItems.Owners.UniqueIdPerOwner": UniqueIdPerOwner } },
								{ $unwind: "$CartItems" },
								{ $unwind: "$CartItems.Owners" },
								{
									$project: {
										_id: "$_id",
										OrderInitiatedFrom: "$OrderInitiatedFrom",
										CreatedById: "$CreatedById",
										CreatedByEmail: "$CreatedByEmail",
										CapsuleId: "$CartItems.CapsuleId",
										UniqueIdPerOwner: "$CartItems.Owners.UniqueIdPerOwner",
										OwnerEmail: "$CartItems.Owners.OwnerEmail",
										OwnerName: "$CartItems.Owners.OwnerName",
										CreatedOn: "$CreatedOn",
										UpdatedOn: "$UpdatedOn",
									}
								},
								{
									$lookup: {
										from: "Capsules",
										localField: "UniqueIdPerOwner",
										foreignField: "UniqueIdPerOwner",
										as: "UniqueIdPerOwner_CapsuleData"
									}
								},
								{ $match: { UniqueIdPerOwner: UniqueIdPerOwner, OrderInitiatedFrom: "PGALLARY" } }
							]).exec(function (errAg, resAg) {
								//console.log("@@@@@@@@@@@@@@@22--------------resAg = ",resAg);
								if (errAg) {
									console.log(errAg);
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									res.json(response);
								}
								else {
									if (resAg.length) {
										IsRetailCapsule = true;
									}
									else {
										IsRetailCapsule = false;
									}
									results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
									var response = {
										status: 200,
										message: "Chapters listing",
										result: results
									}
									res.json(response);
								}
							});
						}
						else {
							//console.log("@@@@@@@@@@@@@-----------------ELSE = ",UniqueIdPerOwner);
							results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
							var response = {
								status: 200,
								message: "Chapters listing",
								result: results
							}
							res.json(response);
						}
						
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
			else {
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});
	}
}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAll = function (req, res) {
	/*
	var conditions = {
		$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/

	var conditions = {
		CreaterId: req.session.user._id,
		CapsuleId: req.headers.capsule_id,
		$or: [
			{ Origin: "created" },
			{ Origin: "duplicated" },
			{ Origin: "addedFromLibrary" }
		],
		IsLaunched: false,
		Status: true,
		IsDeleted: false
	};

	var sortObj = {
		Order: 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var response = {
				status: 200,
				message: "Chapters listing",
				results: results
			}
			res.json(response);
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		findAllPaginated
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAllPaginated = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	/*
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or : [{CreaterId : req.session.user._id, Origin:{$ne : "createdForMe"}},{OwnerId : req.session.user._id , OwnerEmail:req.session.user.Email}],
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/

	var conditions = {
		$or: [
			{ CreaterId: req.session.user._id, Origin: "created", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, Origin: "duplicated", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, Origin: "addedFromLibrary", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" },
			{ CreaterId: { $ne: req.session.user._id }, OwnerId: req.session.user._id, Origin: "shared" } //this may not have option for further share. ? - May be key for furtherSharable ?
		],
		Status: true,
		IsDeleted: false
	};

	if (req.body.capsuleCheck) {
		conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
	}

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};
	if (req.body.sortBy) {
		var sortObjBy = req.body.sortBy;
		if (sortObjBy == "Title") {
			sortObj = {
				//Order : 1,
				Title: -1
			};
		} else if (sortObjBy == "CreatedOn") {
			sortObj = {
				//Order : 1,
				CreatedOn: -1
			};
		} else if (sortObjBy == "ModifiedOn") {
			sortObj = {
				//Order : 1,
				ModifiedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "ModifiedOnAsc") {
			sortObj = {
				//Order : 1,
				ModifiedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		createdByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createdByMe = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	/*
	var conditions = {
		$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/
	var conditions = {
		$or: [
			{ CreaterId: req.session.user._id, Origin: "created", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, Origin: "duplicated", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, Origin: "addedFromLibrary", IsLaunched: true, "LaunchSettings.MakingFor": "ME" },
			{ CreaterId: req.session.user._id, IsLaunched: true, "LaunchSettings.MakingFor": "OTHERS" }
		],
		Status: true,
		IsDeleted: false
	};

	if (req.body.capsuleCheck) {
		conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
	}

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};
	if (req.body.sortBy) {
		var sortObjBy = req.body.sortBy;
		if (sortObjBy == "Title") {
			sortObj = {
				//Order : 1,
				Title: -1
			};
		} else if (sortObjBy == "CreatedOn") {
			sortObj = {
				//Order : 1,
				CreatedOn: -1
			};
		} else if (sortObjBy == "ModifiedOn") {
			sortObj = {
				//Order : 1,
				ModifiedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "ModifiedOnAsc") {
			sortObj = {
				//Order : 1,
				ModifiedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		sharedWithMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var sharedWithMe = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	/*
	var conditions = {
		Origin : "shared",
		CreaterId : {$ne:req.session.user._id},
		OwnerId : req.session.user._id,
		Status : 1,
		IsLaunched : 0,
		IsDeleted : 0
	};
	*/

	var conditions = {
		$or: [
			{ CreaterId: { $ne: req.session.user._id }, OwnerId: req.session.user._id, Origin: "shared" } //this may not have option for further share. ? - May be key for furtherSharable ?
		],
		Status: true,
		IsDeleted: false
	};

	if (req.body.capsuleCheck) {
		conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
	}

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};

	if (req.body.sortBy) {
		var sortObjBy = req.body.sortBy;
		if (sortObjBy == "Title") {
			sortObj = {
				//Order : 1,
				Title: -1
			};
		} else if (sortObjBy == "CreatedOn") {
			sortObj = {
				//Order : 1,
				CreatedOn: -1
			};
		} else if (sortObjBy == "ModifiedOn") {
			sortObj = {
				//Order : 1,
				ModifiedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "ModifiedOnAsc") {
			sortObj = {
				//Order : 1,
				ModifiedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		createdByMe
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var createdForMe = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	var conditions = {
		Origin: "createdForMe",
		OwnerId: req.session.user._id,
		Status: 1,
		IsLaunched: 0,
		IsDeleted: 0
	};

	if (req.body.capsuleCheck) {
		conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
	}

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};
	if (req.body.sortBy) {
		var sortObjBy = req.body.sortBy;
		if (sortObjBy == "Title") {
			sortObj = {
				//Order : 1,
				Title: -1
			};
		} else if (sortObjBy == "CreatedOn") {
			sortObj = {
				//Order : 1,
				CreatedOn: -1
			};
		} else if (sortObjBy == "ModifiedOn") {
			sortObj = {
				//Order : 1,
				ModifiedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "ModifiedOnAsc") {
			sortObj = {
				//Order : 1,
				ModifiedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		byTheHouse
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var byTheHouse = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	var conditions = {
		Origin: "byTheHouse",
		CreaterId: req.session.user._id,
		Status: 1,
		IsLaunched: 0,
		IsDeleted: 0
	};

	if (req.body.capsuleCheck) {
		conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
	}

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};
	if (req.body.sortBy) {
		var sortObjBy = req.body.sortBy;
		if (sortObjBy == "Title") {
			sortObj = {
				//Order : 1,
				Title: -1
			};
		} else if (sortObjBy == "CreatedOn") {
			sortObj = {
				//Order : 1,
				CreatedOn: -1
			};
		} else if (sortObjBy == "ModifiedOn") {
			sortObj = {
				//Order : 1,
				ModifiedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "ModifiedOnAsc") {
			sortObj = {
				//Order : 1,
				ModifiedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		create
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var create = function (req, res) {
	var data = {};
	//set required field of the chapterModel
	data = {
		CapsuleId: req.headers.capsule_id ? req.headers.capsule_id : 0,
		CreaterId: req.session.user._id,
		OwnerId: req.session.user._id,
		IsPublished: req.body.IsPublished ? req.body.IsPublished : false
	}
	console.log("data = ", data);
	Chapter(data).save(function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Chapter created successfully.",
				result: result
			}
			pushChapterId(data.CapsuleId, result._id);
			res.json(response);
		}
		else {
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
   * @Date:      		17 June 2015
   * @Method :   		duplicate
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var duplicate = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title: 1,
		CoverArt: 1,
		CapsuleId: 1,
		CoverArtFirstPage: 1,
		ChapterPlaylist: 1
	};

	conditions._id = req.headers.chapter_id;

	Chapter.findOne(conditions, fields, function (err, result) {
		if (!err) {
			var data = {};
			data.Origin = "duplicated";
			data.OriginatedFrom = conditions._id;

			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			data.CapsuleId = result.CapsuleId;
			data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
			data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];

			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;

			//console.log("data = ",data);
			Chapter(data).save(function (err, result) {
				if (!err) {
					//pages under chapters duplication will be implemented later
					var conditions = {
						ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
						OwnerId: req.session.user._id,
						IsDeleted: 0,
						PageType: { $in: ["gallery", "content"] }
					};
					var sortObj = {
						Order: 1,
						UpdatedOn: -1
					};
					var fields = {
						_id: true
					};

					var newChapterId = result._id;
					Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {
						if (!err) {
							var fields = {
								_id: true,
								Title: true,
								TitleInvitees: true,
								PageType: true,
								Order: true,
								HeaderImage: true,
								BackgroundMusic: true,
								CommonParams: true,
								ViewportDesktopSections: true,
								ViewportTabletSections: true,
								ViewportMobileSections: true,
								SelectedMedia: true,
								SelectedCriteria: true,
								HeaderBlurValue: true,
								HeaderTransparencyValue: true
							};
							for (var loop = 0; loop < results.length; loop++) {
								var conditions = {};
								conditions._id = results[loop]._id;
								Page.findOne(conditions, fields, function (err, result) {
									//delete result._id;
									var data = {};
									data.CreaterId = req.session.user._id;
									data.OwnerId = req.session.user._id;
									data.ChapterId = newChapterId ? newChapterId : "";
									data.Title = result.Title;
									data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : result.Title;
									data.PageType = result.PageType;
									data.Order = result.Order;
									data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
									data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
									data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
									data.SelectedCriteria = result.SelectedCriteria;
									data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
									data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;

									data.CreatedOn = nowDate;
									data.UpdatedOn = nowDate;

									var Desktop__allHiddenBoardId_Arr = [];
									var Tablet__allHiddenBoardId_Arr = [];
									var Mobile__allHiddenBoardId_Arr = [];

									var allHiddenBoardId_Arr = [];

									var Desktop__allHiddenBoardId__index_Arr = [];
									var Tablet__allHiddenBoardId__index_Arr = [];
									var Mobile__allHiddenBoardId__index_Arr = [];

									var margedArrOfAllQAPageIds = [];
									var UNIQUE__margedArrOfAllQAPageIds = [];

									var sourcePageId__DestinationPageId__Arr = [];

									if (data.PageType == "content") {
										data.CommonParams = result.CommonParams ? result.CommonParams : {};
										data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
										data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
										data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};


										//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
										//desktop viewport filter
										data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++) {
											var widObj = data.ViewportDesktopSections.Widgets[loop];
											widObj.Type = widObj.Type ? widObj.Type : "";
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
													Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
												}
											}
										}

										//tablet viewport filter
										data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++) {
											var widObj = data.ViewportTabletSections.Widgets[loop];
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
													Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
												}
											}
										}

										//mobile viewport filter
										data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++) {
											var widObj = data.ViewportMobileSections.Widgets[loop];
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
													Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
												}
											}
										}


										margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
										margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);

										//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

										allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
										allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);

										UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();

										//just for testing...
										var finalObj = {
											Desktop__allHiddenBoardId__index_Arr: Desktop__allHiddenBoardId__index_Arr,
											Tablet__allHiddenBoardId__index_Arr: Tablet__allHiddenBoardId__index_Arr,
											Mobile__allHiddenBoardId__index_Arr: Mobile__allHiddenBoardId__index_Arr,
											margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
											UNIQUE__allHiddenBoardId_Arr: UNIQUE__allHiddenBoardId_Arr
										}

										//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
										async.series({
											createNewInstance__HiddenBoard: function (callback) {
												if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
													var conditions = {
														_id: { $in: finalObj.UNIQUE__allHiddenBoardId_Arr }
													}
													var fields = {
														Medias: false
													}
													Page.find(conditions, fields).lean().exec(function (err, results) {
														if (!err) {
															console.log("-------------results------------", results);
															var results = results ? results : [];
															var returnCounter = 0;
															var totalOps = results.length ? results.length : 0;
															if (totalOps) {
																var oldPageId = null;
																for (var loop = 0; loop < totalOps; loop++) {
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
																	CreateNewInstance__HiddenBoardFunc(oldPageId, newInstanceData, totalOps);
																}

																function CreateNewInstance__HiddenBoardFunc(sourcePageId, dataToSave, totalOps) {
																	var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																	//sourcePageId__DestinationPageId
																	Page(dataToSave).save(function (err, result) {
																		returnCounter++;
																		if (!err) {
																			var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																			sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																		}
																		else {
																			console.log("DB ERROR : ", err);
																			return callback(err);
																		}

																		if (totalOps == returnCounter) {
																			callback(null, sourcePageId__DestinationPageId__Arr);
																		}
																	})
																}
															}
															else {
																callback(null, sourcePageId__DestinationPageId__Arr);
															}
														}
														else {
															console.log("DB ERROR : ", err);
															return callback(err);
														}
													});
												}
												else {
													callback(null, sourcePageId__DestinationPageId__Arr);
												}
											}
										},
											function (err, results) {
												//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
												if (!err) {
													console.log("*************************************** results**************", results);
													var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
													for (var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++) {
														var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
														var SourcePageId = recordArr[0];
														var NewPageId = recordArr[1];
														console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ", finalObj.margedArrOfAllQAPageIds);
														console.log("*************************************** SourcePageId**************NewPageId ", SourcePageId + "------------------" + NewPageId);
														for (var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++) {
															var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
															var SourcePageId_2 = recordArr2[0];
															var WidgetIndex = recordArr2[1];
															var Viewport = recordArr2[2];
															if (SourcePageId_2 == SourcePageId) {
																console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2 + " ====== " + SourcePageId);
																switch (Viewport) {
																	case 'DESKTOP':
																		data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;

																	case 'TABLET':
																		data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;

																	case 'MOBILE':
																		data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;
																}
															}
														}
													}
												}
												else {
													console.log("**************************************************DB ERROR :", err);
												}

												console.log("data = ", data);
												Page(data).save(function (err, result) {
													if (!err) {
														console.log("----new page instance created..", result);
													}
													else {
														console.log(err);
													}
												});
											});
									}
									else {
										console.log("data = ", data);
										Page(data).save(function (err, result) {
											if (!err) {
												console.log("----new page instance created..", result);
											}
											else {
												console.log(err);
											}
										});
									}
								});
							}

							var response = {
								status: 200,
								message: "Chapter duplicated successfully.",
								result: result
							}
							res.json(response);

						}
						else {
							console.log(err);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
					});
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			});
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		deleteChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var remove = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 

	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)

	conditions._id = req.headers.chapter_id;
	data.IsDeleted = 1;
	data.ModifiedOn = Date.now();
	var capsuleId = req.headers.capsule_id;
	console.log("conditions = ", conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Chapter.update(conditions, { $set: data }, function (err, result) {
		if (!err) {
			var conditions = {};
			var data = {};

			conditions.ChapterId = req.headers.chapter_id;
			data.IsDeleted = 1;

			console.log("----", conditions, "------ set data = ", { $set: data });

			Page.update(conditions, { $set: data }, { multi: true }, function (err, result) {
				if (!err) {
					var response = {
						status: 200,
						message: "page deleted successfully.",
						result: result
					}
					console.log(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					console.log(response);
				}
			});

			var response = {
				status: 200,
				message: "Chapter deleted successfully.",
				result: result
			}
			pullChapterId(capsuleId, conditions.ChapterId);
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}


var remove_V2 = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {
		_id: req.headers.chapter_id,
		OwnerId: req.session.user._id,
		IsDeleted: 0
	};

	var fields = {
		OwnerId: true
	};

	Capsule.find(conditions, fields).count().exec(function (err, resultLength) {
		if (!err) {
			if (resultLength) {	//Owner wants to delete - just delete the capsule paranently. 
				var conditions = {};
				var data = {};
				//console.log("req.headers = " , req.headers)

				conditions._id = req.headers.chapter_id;
				data.IsDeleted = 1;
				data.ModifiedOn = Date.now();
				var capsuleId = req.headers.capsule_id;
				console.log("conditions = ", conditions);
				//Chapter.update(query , $set:data , function( err , result ){
				Chapter.update(conditions, { $set: data }, function (err, result) {
					if (!err) {
						var conditions = {};
						var data = {};

						conditions.ChapterId = req.headers.chapter_id;
						data.IsDeleted = 1;

						console.log("----", conditions, "------ set data = ", { $set: data });

						Page.update(conditions, { $set: data }, { multi: true }, function (err, result) {
							if (!err) {
								var response = {
									status: 200,
									message: "page deleted successfully.",
									result: result
								}
								console.log(response);
							}
							else {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								console.log(response);
							}
						});

						var response = {
							status: 200,
							message: "Chapter deleted successfully.",
							result: result
						}
						pullChapterId(capsuleId, conditions.ChapterId);
						res.json(response);
					}
					else {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				});
			}
			else {				//Member wants to delete - just un-follow the member from this association.
				var UserEmail = req.session.user.Email;
				var findConditions = {
					_id: req.headers.chapter_id,
					'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(UserEmail, "i") } } },
					IsLaunched: true,	//member of the chapter case
					IsDeleted: 0
				};

				Chapter.update(findConditions, { $pull: { 'LaunchSettings.Invitees': { UserEmail: { $regex: new RegExp(UserEmail, "i") } } } }, { multi: false }, function (err, result) {
					if (err) {
						var response = {
							status: 501,
							message: "something went wrong"
						}
						res.json(response);
					} else {
						var response = {
							status: 200,
							message: "Chapter deleted successfully.",
							result: result
						}
						res.json(response);
					}
				});
			}
		}
		else {

		}
	});
}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		reorder
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

function getObjArrayIdxByKey(ObjArr, matchKey, matchVal) {
	var idx;
	for (var loop = 0; loop < ObjArr.length; loop++) {
		if (ObjArr[loop].hasOwnProperty(matchKey)) {
			if (ObjArr[loop][matchKey] == matchVal) {
				idx = loop;
				break;
			}
		}
	}
	return idx;
}

var reorder = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var chapterIds = req.body.chapter_ids ? req.body.chapter_ids : [];
	//console.log("chapterIds = ",chapterIds);
	var resultCount = 0;
	for (var loop = 0; loop < chapterIds.length; loop++ , resultCount++) {
		var chapterId = chapterIds[loop];
		var conditions = {};
		var data = {};
		//console.log("req.headers = " , req.headers)
		conditions._id = chapterId;
		//console.log("conditions = ",conditions);
		findAndUpdate(conditions, loop + 1);
	}

	function findAndUpdate(conditions, order) {
		Chapter.findOne(conditions, function (err, result) {
			if (!err) {
				result.Order = order;
				//console.log("result = ",result);
				result.save(function (err, result) {
					//console.log("Reordered = ",result);
				});
			}
		});
	}

	console.log("chapterIds.length = " + chapterIds.length + "------------------------ resultCount = " + resultCount);

	if (chapterIds.length > 0 && resultCount == chapterIds.length) {
		var response = {
			status: 200,
			message: "Chapters reordered successfully."
		}
		res.json(response);

	}
	else {
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		res.json(response);
	}
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		updateChapterName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id)"
_________________________________________________________________________
*/

var updateChapterName = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 

	var conditions = {};
	var data = {};
	//console.log("req.headers = " , req.headers)

	conditions._id = req.headers.chapter_id;
	data.Title = req.body.chapter_name ? req.body.chapter_name : "Untitled Chapter";
	data.ModifiedOn = Date.now();
	console.log("conditions = ", conditions);
	//Chapter.update(query , $set:data , function( err , result ){
	Chapter.update(conditions, { $set: data }, function (err, result) {
		if (!err) {
			var response = {
				status: 200,
				message: "Chapter name updated successfully.",
				result: result
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});

}


//Chapter library Apis

/*________________________________________________________________________
   * @Date:      		31 Aug 2015
   * @Method :   		addFromLibrary
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var addFromLibrary = function (req, res) {

	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		CapsuleId: true,
		Title: true,
		CoverArt: true,
		CoverArtFirstPage: true,
		ChapterPlaylist: true
	};

	conditions._id = req.headers.chapter_id;

	Chapter.findOne(conditions, fields, function (err, result) {
		if (!err) {
			console.log("9999999999999999999999", result);
			var data = {};
			data.Origin = "addedFromLibrary";
			data.OriginatedFrom = conditions._id;

			data.CapsuleId = req.headers.capsule_id ? req.headers.capsule_id : 0;


			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.Title = result.Title;
			data.CoverArt = result.CoverArt;
			data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
			data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];

			var nowDate = Date.now();
			data.CreatedOn = nowDate;
			data.ModifiedOn = nowDate;
			console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^data = ", data);
			Chapter(data).save(function (err, result) {
				if (!err) {
					//pages under chapters duplication will be implemented later
					var conditions = {
						Origin: { $ne: "publishNewChanges" },
						ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
						OwnerId: req.session.user._id,
						IsDeleted: 0,
						PageType: { $in: ["gallery", "content"] }
					};
					var sortObj = {
						Order: 1,
						UpdatedOn: -1
					};
					var fields = {
						_id: true
					};

					var newChapterId = result._id;
					Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {

						if (!err) {
							var fields = {
								_id: true,
								Title: true,
								TitleInvitees: true,
								PageType: true,
								Order: true,
								HeaderImage: true,
								BackgroundMusic: true,
								CommonParams: true,
								ViewportDesktopSections: true,
								ViewportTabletSections: true,
								ViewportMobileSections: true,
								SelectedMedia: true,
								SelectedCriteria: true,
								HeaderBlurValue: true,
								HeaderTransparencyValue: true
							};
							for (var loop = 0; loop < results.length; loop++) {
								var conditions = {};
								conditions._id = results[loop]._id;
								Page.findOne(conditions, fields, function (err, result) {
									//delete result._id;
									var data = {};
									data.CreaterId = req.session.user._id;
									data.OwnerId = req.session.user._id;
									data.ChapterId = newChapterId ? newChapterId : "";
									data.Title = result.Title;
									data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : result.Title;
									data.PageType = result.PageType;
									data.Order = result.Order;
									data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
									data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
									data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
									data.SelectedCriteria = result.SelectedCriteria;
									data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
									data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;

									data.CreatedOn = nowDate;
									data.UpdatedOn = nowDate;

									var Desktop__allHiddenBoardId_Arr = [];
									var Tablet__allHiddenBoardId_Arr = [];
									var Mobile__allHiddenBoardId_Arr = [];

									var allHiddenBoardId_Arr = [];

									var Desktop__allHiddenBoardId__index_Arr = [];
									var Tablet__allHiddenBoardId__index_Arr = [];
									var Mobile__allHiddenBoardId__index_Arr = [];

									var margedArrOfAllQAPageIds = [];
									var UNIQUE__margedArrOfAllQAPageIds = [];

									var sourcePageId__DestinationPageId__Arr = [];

									if (data.PageType == "content") {
										data.CommonParams = result.CommonParams ? result.CommonParams : {};
										data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
										data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
										data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};


										//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
										//desktop viewport filter
										data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++) {
											var widObj = data.ViewportDesktopSections.Widgets[loop];
											widObj.Type = widObj.Type ? widObj.Type : "";
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
													Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
												}
											}
										}

										//tablet viewport filter
										data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++) {
											var widObj = data.ViewportTabletSections.Widgets[loop];
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
													Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
												}
											}
										}

										//mobile viewport filter
										data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];

										for (var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++) {
											var widObj = data.ViewportMobileSections.Widgets[loop];
											if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
												widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
												var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
												if (HiddenBoardId != 'SOMETHING__WRONG') {
													Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
													Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
												}
											}
										}


										margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
										margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);

										//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

										allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
										allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);

										UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();

										//just for testing...
										var finalObj = {
											Desktop__allHiddenBoardId__index_Arr: Desktop__allHiddenBoardId__index_Arr,
											Tablet__allHiddenBoardId__index_Arr: Tablet__allHiddenBoardId__index_Arr,
											Mobile__allHiddenBoardId__index_Arr: Mobile__allHiddenBoardId__index_Arr,
											margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
											UNIQUE__allHiddenBoardId_Arr: UNIQUE__allHiddenBoardId_Arr
										}

										//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
										async.series({
											createNewInstance__HiddenBoard: function (callback) {
												if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
													var conditions = {
														_id: { $in: finalObj.UNIQUE__allHiddenBoardId_Arr }
													}
													var fields = {
														Medias: false
													}
													Page.find(conditions, fields).lean().exec(function (err, results) {
														if (!err) {
															console.log("-------------results------------", results);
															var results = results ? results : [];
															var returnCounter = 0;
															var totalOps = results.length ? results.length : 0;
															if (totalOps) {
																var oldPageId = null;
																for (var loop = 0; loop < totalOps; loop++) {
																	oldPageId = results[loop]._id;
																	var newInstanceData = results[loop];
																	newInstanceData.OriginatedFrom = oldPageId;
																	newInstanceData.Origin = 'addedFromLibrary';

																	//console.log("WTF-----------------------",oldPageId);
																	delete newInstanceData._id;
																	//console.log("WTF-----------------------",oldPageId);

																	newInstanceData.CreatedOn = Date.now();
																	newInstanceData.UpdatedOn = Date.now();
																	//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																	CreateNewInstance__HiddenBoardFunc(oldPageId, newInstanceData, totalOps);
																}

																function CreateNewInstance__HiddenBoardFunc(sourcePageId, dataToSave, totalOps) {
																	var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																	//sourcePageId__DestinationPageId
																	Page(dataToSave).save(function (err, result) {
																		returnCounter++;
																		if (!err) {
																			var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																			sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																		}
																		else {
																			console.log("DB ERROR : ", err);
																			return callback(err);
																		}

																		if (totalOps == returnCounter) {
																			callback(null, sourcePageId__DestinationPageId__Arr);
																		}
																	})
																}
															}
															else {
																callback(null, sourcePageId__DestinationPageId__Arr);
															}
														}
														else {
															console.log("DB ERROR : ", err);
															return callback(err);
														}
													});
												}
												else {
													callback(null, sourcePageId__DestinationPageId__Arr);
												}
											}
										},
											function (err, results) {
												//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
												if (!err) {
													console.log("*************************************** results**************", results);
													var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
													for (var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++) {
														var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
														var SourcePageId = recordArr[0];
														var NewPageId = recordArr[1];
														console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ", finalObj.margedArrOfAllQAPageIds);
														console.log("*************************************** SourcePageId**************NewPageId ", SourcePageId + "------------------" + NewPageId);
														for (var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++) {
															var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
															var SourcePageId_2 = recordArr2[0];
															var WidgetIndex = recordArr2[1];
															var Viewport = recordArr2[2];
															if (SourcePageId_2 == SourcePageId) {
																console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2 + " ====== " + SourcePageId);
																switch (Viewport) {
																	case 'DESKTOP':
																		data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;

																	case 'TABLET':
																		data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;

																	case 'MOBILE':
																		data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																		data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																		break;
																}
															}
														}
													}
												}
												else {
													console.log("**************************************************DB ERROR :", err);
												}

												console.log("data = ", data);
												Page(data).save(function (err, result) {
													if (!err) {
														console.log("----new page instance created..", result);
													}
													else {
														console.log(err);
													}
												});
											});
									}
									else {
										console.log("data = ", data);
										Page(data).save(function (err, result) {
											if (!err) {
												console.log("----new page instance created..", result);
											}
											else {
												console.log(err);
											}
										});
									}
								});
							}

							var response = {
								status: 200,
								message: "Chapter duplicated successfully.",
								result: result
							}
							res.json(response);

						}
						else {
							console.log(err);
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response);
						}
					});
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			});
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})

}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		previewChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var preview = function (req, res) {
	var query = {};
	var fields = {};
	query._id = req.header.chapter_id;

	Chapter.findOne(query, fields, function (err, result) {

		var query = {};
		var fields = {};
		query._id = req.header.chapter_id;

		Page.find(data, function (err, result) {
			if (!err) {
				var response = {
					status: 200,
					message: "Chapter added successfully.",
					result: result
				}
				res.json(response);
			}
			else {
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		});

	})

}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		shareChapter
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title: 1,
		CoverArt: 1,
		CapsuleId: 1,
		CoverArtFirstPage: 1,
		ChapterPlaylist: 1
	};

	conditions._id = req.headers.chapter_id;

	Chapter.findOne(conditions, fields, function (err, result) {
		if (!err) {
			var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
			var shareWithName = req.body.share_with_name ? req.body.share_with_name : '';

			if (shareWithEmail) {
				var conditions = {};
				conditions.Email = shareWithEmail;

				var fields = {
					Email: true
				};

				User.find(conditions, fields, function (err, UserData) {
					if (!err) {
						var data = {};
						data.Origin = "shared";
						data.OriginatedFrom = req.headers.chapter_id;
						data.CreaterId = req.session.user._id;

						if (!UserData.length) {
							//Non-Registered user case
							data.OwnerId = req.session.user._id;
							data.OwnerEmail = req.session.user.Email;
						}
						else {
							data.OwnerId = UserData[0]._id;
							data.OwnerEmail = UserData[0].Email;
						}

						data.Title = result.Title;
						data.CoverArt = result.CoverArt;
						data.CoverArtFirstPage = result.CoverArtFirstPage ? result.CoverArtFirstPage : "";
						data.ChapterPlaylist = result.ChapterPlaylist ? result.ChapterPlaylist : [];

						//data.CapsuleId = result.CapsuleId;

						var nowDate = Date.now();
						data.CreatedOn = nowDate;
						data.ModifiedOn = nowDate;

						//console.log("data = ",data);
						Chapter(data).save(function (err, result) {
							if (!err) {
								//pages under chapters duplication will be implemented later
								var conditions = {
									ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
									OwnerId: req.session.user._id,
									IsDeleted: 0,
									PageType: { $in: ["gallery", "content"] }
								};
								var sortObj = {
									Order: 1,
									UpdatedOn: -1
								};
								var fields = {
									_id: true
								};

								var newChapterId = result._id;
								Page.find(conditions, fields).sort(sortObj).exec(function (err, results) {
									if (!err) {
										var fields = {
											_id: true,
											Title: true,
											PageType: true,
											Order: true,
											HeaderImage: true,
											BackgroundMusic: true,
											CommonParams: true,
											ViewportDesktopSections: true,
											ViewportTabletSections: true,
											ViewportMobileSections: true,
											SelectedMedia: true,
											SelectedCriteria: true,
											HeaderBlurValue: true,
											HeaderTransparencyValue: true
										};
										for (var loop = 0; loop < results.length; loop++) {
											var conditions = {};
											conditions._id = results[loop]._id;
											Page.findOne(conditions, fields, function (err, result) {
												//delete result._id;
												var data = {};
												data.Origin = "shared";
												data.OriginatedFrom = result._id;
												data.CreaterId = req.session.user._id;

												if (!UserData.length) {
													//Non-Registered user case
													data.OwnerId = req.session.user._id;
													data.OwnerEmail = req.session.user.Email;
												}
												else {
													data.OwnerId = UserData[0]._id;
													data.OwnerEmail = UserData[0].Email;
												}

												data.ChapterId = newChapterId ? newChapterId : "";
												data.Title = result.Title;
												data.PageType = result.PageType;
												data.Order = result.Order;
												data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
												data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
												data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
												data.SelectedCriteria = result.SelectedCriteria;
												data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
												data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;

												data.CreatedOn = nowDate;
												data.UpdatedOn = nowDate;

												var Desktop__allHiddenBoardId_Arr = [];
												var Tablet__allHiddenBoardId_Arr = [];
												var Mobile__allHiddenBoardId_Arr = [];

												var allHiddenBoardId_Arr = [];

												var Desktop__allHiddenBoardId__index_Arr = [];
												var Tablet__allHiddenBoardId__index_Arr = [];
												var Mobile__allHiddenBoardId__index_Arr = [];

												var margedArrOfAllQAPageIds = [];
												var UNIQUE__margedArrOfAllQAPageIds = [];

												var sourcePageId__DestinationPageId__Arr = [];

												if (data.PageType == "content") {
													data.CommonParams = result.CommonParams ? result.CommonParams : {};
													data.ViewportDesktopSections = result.ViewportDesktopSections ? result.ViewportDesktopSections : {};
													data.ViewportTabletSections = result.ViewportTabletSections ? result.ViewportTabletSections : {};
													data.ViewportMobileSections = result.ViewportMobileSections ? result.ViewportMobileSections : {};


													//AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
													//desktop viewport filter
													data.ViewportDesktopSections.Widgets = data.ViewportDesktopSections.Widgets ? data.ViewportDesktopSections.Widgets : [];

													for (var loop = 0; loop < data.ViewportDesktopSections.Widgets.length; loop++) {
														var widObj = data.ViewportDesktopSections.Widgets[loop];
														widObj.Type = widObj.Type ? widObj.Type : "";
														if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
															widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
															var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
															if (HiddenBoardId != 'SOMETHING__WRONG') {
																Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
																Desktop__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'DESKTOP');
															}
														}
													}

													//tablet viewport filter
													data.ViewportTabletSections.Widgets = data.ViewportTabletSections.Widgets ? data.ViewportTabletSections.Widgets : [];

													for (var loop = 0; loop < data.ViewportTabletSections.Widgets.length; loop++) {
														var widObj = data.ViewportTabletSections.Widgets[loop];
														if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
															widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
															var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING_WRONG';
															if (HiddenBoardId != 'SOMETHING__WRONG') {
																Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
																Tablet__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'TABLET');
															}
														}
													}

													//mobile viewport filter
													data.ViewportMobileSections.Widgets = data.ViewportMobileSections.Widgets ? data.ViewportMobileSections.Widgets : [];

													for (var loop = 0; loop < data.ViewportMobileSections.Widgets.length; loop++) {
														var widObj = data.ViewportMobileSections.Widgets[loop];
														if (widObj.Type == 'questAnswer') {	// If Widget is a QA Widget then ...
															widObj.QAWidObj = widObj.QAWidObj ? widObj.QAWidObj : {};
															var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
															if (HiddenBoardId != 'SOMETHING__WRONG') {
																Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
																Mobile__allHiddenBoardId__index_Arr.push(HiddenBoardId + '__' + loop + '__' + 'MOBILE');
															}
														}
													}


													margedArrOfAllQAPageIds = Desktop__allHiddenBoardId__index_Arr.concat(Tablet__allHiddenBoardId__index_Arr);
													margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(Mobile__allHiddenBoardId__index_Arr);

													//UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

													allHiddenBoardId_Arr = Desktop__allHiddenBoardId_Arr.concat(Tablet__allHiddenBoardId_Arr);
													allHiddenBoardId_Arr =
														allHiddenBoardId_Arr.concat(Mobile__allHiddenBoardId_Arr);

													UNIQUE__allHiddenBoardId_Arr = allHiddenBoardId_Arr.unique();

													//just for testing...
													var finalObj = {
														Desktop__allHiddenBoardId__index_Arr: Desktop__allHiddenBoardId__index_Arr,
														Tablet__allHiddenBoardId__index_Arr: Tablet__allHiddenBoardId__index_Arr,
														Mobile__allHiddenBoardId__index_Arr: Mobile__allHiddenBoardId__index_Arr,
														margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
														UNIQUE__allHiddenBoardId_Arr: UNIQUE__allHiddenBoardId_Arr
													}

													//now create new instances of the unique hidden boards and update the PageId on corresponding entries... 
													async.series({
														createNewInstance__HiddenBoard: function (callback) {
															if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
																var conditions = {
																	_id: { $in: finalObj.UNIQUE__allHiddenBoardId_Arr }
																}
																var fields = {
																	Medias: false
																}
																Page.find(conditions, fields).lean().exec(function (err, results) {
																	if (!err) {
																		console.log("-------------results------------", results);
																		var results = results ? results : [];
																		var returnCounter = 0;
																		var totalOps = results.length ? results.length : 0;
																		if (totalOps) {
																			var oldPageId = null;
																			for (var loop = 0; loop < totalOps; loop++) {
																				oldPageId = results[loop]._id;
																				var newInstanceData = results[loop];
																				newInstanceData.OriginatedFrom = oldPageId;
																				newInstanceData.Origin = 'shared';

																				//console.log("WTF-----------------------",oldPageId);
																				delete newInstanceData._id;
																				//console.log("WTF-----------------------",oldPageId);

																				newInstanceData.CreatedOn = Date.now();
																				newInstanceData.UpdatedOn = Date.now();
																				//console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
																				CreateNewInstance__HiddenBoardFunc(oldPageId, newInstanceData, totalOps);
																			}

																			function CreateNewInstance__HiddenBoardFunc(sourcePageId, dataToSave, totalOps) {
																				var sourcePageId = sourcePageId ? sourcePageId : "SOMETHING_WRONG";
																				//sourcePageId__DestinationPageId
																				Page(dataToSave).save(function (err, result) {
																					returnCounter++;
																					if (!err) {
																						var sourcePageId__DestinationPageId = sourcePageId + '__' + result._id;
																						sourcePageId__DestinationPageId__Arr.push(sourcePageId__DestinationPageId);
																					}
																					else {
																						console.log("DB ERROR : ", err);
																						return callback(err);
																					}

																					if (totalOps == returnCounter) {
																						callback(null, sourcePageId__DestinationPageId__Arr);
																					}
																				})
																			}
																		}
																		else {
																			callback(null, sourcePageId__DestinationPageId__Arr);
																		}
																	}
																	else {
																		console.log("DB ERROR : ", err);
																		return callback(err);
																	}
																});
															}
															else {
																callback(null, sourcePageId__DestinationPageId__Arr);
															}
														}
													},
														function (err, results) {
															//results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
															if (!err) {
																console.log("*************************************** results**************", results);
																var createNewInstance__HiddenBoardOutputArr = results.createNewInstance__HiddenBoard ? results.createNewInstance__HiddenBoard : [];
																for (var loop = 0; loop < createNewInstance__HiddenBoardOutputArr.length; loop++) {
																	var recordArr = createNewInstance__HiddenBoardOutputArr[loop].split('__');
																	var SourcePageId = recordArr[0];
																	var NewPageId = recordArr[1];
																	console.log("*************************************** finalObj.margedArrOfAllQAPageIds**************** ", finalObj.margedArrOfAllQAPageIds);
																	console.log("*************************************** SourcePageId**************NewPageId ", SourcePageId + "------------------" + NewPageId);
																	for (var loop2 = 0; loop2 < finalObj.margedArrOfAllQAPageIds.length; loop2++) {
																		var recordArr2 = finalObj.margedArrOfAllQAPageIds[loop2].split('__');
																		var SourcePageId_2 = recordArr2[0];
																		var WidgetIndex = recordArr2[1];
																		var Viewport = recordArr2[2];
																		if (SourcePageId_2 == SourcePageId) {
																			console.log("************************************************************************** SourcePageId_2 == SourcePageId ===========", SourcePageId_2 + " ====== " + SourcePageId);
																			switch (Viewport) {
																				case 'DESKTOP':
																					data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj = data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj : {};
																					data.ViewportDesktopSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																					break;

																				case 'TABLET':
																					data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj = data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj : {};
																					data.ViewportTabletSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																					break;

																				case 'MOBILE':
																					data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj = data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj ? data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj : {};
																					data.ViewportMobileSections.Widgets[WidgetIndex].QAWidObj.PageId = NewPageId;
																					break;
																			}
																		}
																	}
																}
															}
															else {
																console.log("**************************************************DB ERROR :", err);
															}

															Page(data).save(function (err, result) {
																if (!err) {
																	console.log("----new page instance created..", result);
																}
																else {
																	console.log(err);
																}
															});
														});
												}
												else {
													Page(data).save(function (err, result) {
														if (!err) {
															console.log("----new page instance created..", result);
														}
														else {
															console.log(err);
														}
													});
												}
											});
										}

										var response = {
											status: 200,
											message: "Chapter shared successfully.",
											result: result
										}
										res.json(response);

										/*
										var transporter = nodemailer.createTransport({
											service: 'Gmail',
											auth: {
												user: 'collabmedia.scrpt@gmail.com',
												pass: 'scrpt123_2014collabmedia#1909'
											}
										});	
										var to = shareWithEmail;
										
										var mailOptions = {
											from: 'collabmedia support  <collabmedia.scrpt@gmail.com>', // sender address
											to: to, // list of receivers
											subject: 'Scrpt - '+req.session.user.Name+' has sent you a Chapter!',
											text: 'http://203.100.79.94:8888/#/login', 
											html: "Hi , <br/><br/> Scrpt - "+req.session.user.Name+" has sent you a Chapter : '"+data.Title+"'.<br/><br/>Sincerely,<br>The Scrpt team. "
										};

										transporter.sendMail(mailOptions, function(error, info){
											if(error){
												console.log(error);
												//res.json(err);
											}else{
												console.log('Message sent to: '+to + info.response);
												//res.json({'msg':'done','code':'200'});
											}
										});
										*/
										var condition = {};
										condition.name = "Share__Chapter"

										EmailTemplate.find(condition, {}, function (err, results) {
											if (!err) {
												if (results.length) {

													var RecipientName = shareWithName ? shareWithName : '';
													User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
														if (name.length > 0) {
															var name = name[0].Name ? name[0].Name.split(' ') : "";
															RecipientName = name[0];
														}
														var SharedByUserName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

														var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
														newHtml = newHtml.replace(/{ChapterName}/g, data.Title)
														newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
														console.log("**** New Html - - >*****", newHtml);
														/*
														var transporter = nodemailer.createTransport({
															service: 'Gmail',
															auth: {
																user: 'collabmedia.scrpt@gmail.com',
																pass: 'scrpt123_2014collabmedia#1909'
															}
														});
														*/
														var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions));
														var to = shareWithEmail;
														results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
														var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

														var mailOptions = {
															//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
															from: process.EMAIL_ENGINE.info.senderLine,
															to: to, // list of receivers
															subject: subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has shared a Chapter with you!',
															//text: 'http://203.100.79.94:8888/#/login',
															html: newHtml
															//html: "Hi , <br/><br/> Scrpt - " + req.session.user.Name + " has sent you a Capsule : '" + data.Title + "'.<br/><br/>Sincerely,<br>The Scrpt team. "
														};

														transporter.sendMail(mailOptions, function (error, info) {
															if (error) {
																console.log(error);
															} else {
																console.log('Message sent to: ' + to + info.response);
															}
														});
													})
												}
											}
										})

									}
									else {
										console.log(err);
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response);
									}
								});
							}
							else {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
							}
						});
					}
					else {

					}
				});
			}
			else {

			}
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}


/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		uploadCover
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var uploadCover = function (req, res) {
	var form = new formidable.IncomingForm();
	form.keepExtensions = true;     //keep file extension
	var uploadDir = "/../../public/assets/Media/Covers/";       //set upload directory
	form.keepExtensions = true;     //keep file extension
	form.parse(req, function (err, fields, files) {
		console.log("form.bytesReceived");
		console.log("file path: " + JSON.stringify(files.file.path));
		console.log("file name: " + JSON.stringify(files.file.name));
		console.log("fields: " + fields);
		console.log("fields: " + JSON.stringify(fields));
		var dateTime = new Date().toISOString().replace(/T/, '').replace(/\..+/, '').split(" ");
		var imgUrl = fields.chapter_id + '_' + Date.now() + files.file.name;
		var mediaCenterPath = "/../../public/assets/Media/covers/";
		var srcPath = __dirname + mediaCenterPath + imgUrl;

		fs.rename(files.file.path, srcPath, function (err) {
			if (err) {
				throw err;
			}
			else {
				setTimeout(function () {
					if (fs.existsSync(srcPath)) {
						var dstPathCrop_300 = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
						var dstPathCrop_600 = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
						var dstPathCrop_SMALL = __dirname + mediaCenterPath + 'small' + "/" + imgUrl;
						var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + 'medium' + "/" + imgUrl;
						mediaController.crop_image(srcPath, dstPathCrop_300, 100, 100);
						mediaController.crop_image(srcPath, dstPathCrop_600, 600, 600);
						mediaController.crop_image(srcPath, dstPathCrop_SMALL, 155, 121);
						mediaController.crop_image(srcPath, dstPathCrop_MEDIUM, 262, 162);
						//mediaController.resize_image(srcPath,dstPathCrop_ORIGNAL,2300,1440);

						//update chapter's CoverArt field
						var conditions = { _id: fields.chapter_id };
						var data = {
							$set: {
								CoverArt: imgUrl,
								ModifiedOn: Date.now()
							}
						};
						Chapter.update(conditions, data, function (err, data) {
							if (!err) {
								var response = {
									status: 200,
									message: "Chapter cover uploaded successfully.",
									result: '/assets/Media/covers/' + 'medium' + "/" + imgUrl
								}
								res.json(response);
							}
							else {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
							}
						});



					} else {
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
				}, 10)
			}
			console.log('renamed complete');
		});
	});
}


/*________________________________________________________________________
   * @Date:      		26 Aug 2015
   * @Method :   		invite
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
/*
var chapter__sendInvitations = function (ChapterData, invitees, req) {

	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL) {
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}
			var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has invited you in a chapter to join!';

			var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions));

			var mailOptions = {
				//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to, // list of receivers
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
				} else {
					console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}

	//make chapter view url
	var condition = {};
	condition = {
		ChapterId: ChapterData._id ? ChapterData._id : 0,
		IsDeleted: 0,
		IsDasheditpage: { $ne: true },
		PageType: { $in: ["gallery", "content"] }
	};


	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		ChapterId: true,
		PageType: true
	};

	var ChapterViewURL = "";
	Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var data = {
				status: 200,
				message: "Pages listing",
				results: results
			}
			//res.json(response);

			if (data.results.length) {
				if (data.results[0].PageType == "content") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
				} else if (data.results[0].PageType == "gallery") {
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				} else {
					console.log("Something went wrong.");
					ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
				}

				var conditions = {};
				conditions.name = "Chapter__Invitation";

				EmailTemplate.find(conditions, {}, function (err, results) {
					if (!err) {
						if (results.length) {
							for (var loop = 0; loop < invitees.length; loop++) {
								var shareWithEmail = invitees[loop].UserEmail;
								var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

								console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
								sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);

							}
						}
					}
				})
			} else {
				console.log("No Page Found...");
			}
		} else {
			console.log(err);
		}
	});
};
*/
var chapter__sendInvitations = function (ChapterData, invitees, req) {
	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL) {
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}
			var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{ChapterName}/g, ChapterData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{ChapterViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{ChapterName}/g, ChapterData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has invited you in a chapter to join!';
			/*
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'collabmedia.scrpt@gmail.com',
                    pass: 'scrpt123_2014collabmedia#1909'
                }
            });
			*/
			var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions));
			var mailOptions = {
				//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to, // list of receivers
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					// //console.log(error);
				} else {
					// //console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}

	
	//check type of capsule here and map email template accordingly!
	//make chapter view url
	var condition1 = {};
	condition1 = {
		_id: ChapterData.CapsuleId ? ChapterData.CapsuleId : 0,
		"LaunchSettings.CapsuleFor" : "Birthday",
		IsDeleted: 0
	};
	var fields1 = {
	
	};
	var IsBirthdayCapsule = false;
	
	Capsule.find(condition1 , fields1 , function( err , results) {
		if(!err){
			if(results.length) {
				IsBirthdayCapsule = true;
			}
			goAhead(ChapterData, invitees, req);
		}
	})
	
	function goAhead (ChapterData, invitees, req) {
		//make chapter view url
		var condition = {};
		condition = {
			ChapterId: ChapterData._id ? ChapterData._id : 0,
			IsDeleted: 0,
			IsDasheditpage: { $ne: true },
			PageType: { $in: ["gallery", "content"] }
		};


		var sortObj = {
			Order: 1
		};

		var fields = {
			_id: true,
			ChapterId: true,
			PageType: true
		};

		var ChapterViewURL = "";

		var invitees = invitees ? invitees : [];
		if (invitees.length) {
			Page.find(condition, fields).sort(sortObj).exec(function (err, results) {
				if (!err) {
					console.log("-------------------------------Pages found---------------------------------");
					var data = {
						status: 200,
						message: "Pages listing",
						results: results
					}
					//res.json(response);

					if (data.results.length) {
						var conditions = {};
						if(IsBirthdayCapsule) {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_BIRTHDAY";
						}
						else {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								// //console.log("Something went wrong.");
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__Invitation";
						}

						EmailTemplate.find(conditions, {}, function (err, results) {
							if (!err) {
								if (results.length) {
									for (var loop = 0; loop < invitees.length; loop++) {
										var shareWithEmail = invitees[loop].UserEmail;
										var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

										// //console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
										sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);

									}
								}
							}
						})
					} else {
						//console.log("No Page Found...");
					}
				} else {
					//console.log(err);
				}
			});
		}
		else {
			//console.log("-------------------- No invitees -----------------");
		}
	}
};

var page__sendInvitations = function (PageData, invitees, req) {

	function sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL) {
		User.find({ 'Email': shareWithEmail }, { 'Name': true }, function (err, name) {
			var RecipientName = shareWithName ? shareWithName : "";
			if (name.length > 0) {
				var name = name[0].Name ? name[0].Name.split(' ') : "";
				RecipientName = name.length ? name[0] : "";
			}
			var OwnerName = req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

			var newHtml = results[0].description.replace(/{OwnerName}/g, OwnerName);
			newHtml = newHtml.replace(/{PageName}/g, PageData.Title);
			newHtml = newHtml.replace(/{RecipientName}/g, RecipientName);
			newHtml = newHtml.replace(/{PageViewURL}/g, ChapterViewURL);

			var to = shareWithEmail;
			results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
			var subject = results[0].subject.replace(/{OwnerName}/g, OwnerName);
			subject = subject.replace(/{PageName}/g, PageData.Title);
			subject = subject != '' ? subject : 'Scrpt - ' + req.session.user.Name + ' has invited you in his space page to join!';

            /*
            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'collabmedia.scrpt@gmail.com',
                    pass: 'scrpt123_2014collabmedia#1909'
                }
            });
			*/
			var transporter = nodemailer.createTransport(smtpTransport(process.EMAIL_ENGINE.info.smtpOptions));

			var mailOptions = {
				//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to, // list of receivers
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log(error);
				} else {
					console.log('Message sent to: ' + mailOptions.to + info.response);
				}
			});
		});
	}

	var ChapterViewURL = process.HOST_URL + '/space/' + PageData.ChapterId + '/' + PageData._id;

	var conditions = {};
	conditions.name = "Page__Invitation";

	EmailTemplate.find(conditions, {}, function (err, results) {
		if (!err) {
			if (results.length) {
				for (var loop = 0; loop < invitees.length; loop++) {
					var shareWithEmail = invitees[loop].UserEmail;
					var shareWithName = invitees[loop].UserName ? invitees[loop].UserName : " ";

					console.log("* * * * * Share with Email * * * * * ", shareWithEmail);
					sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);

				}
			}
		}
	})
};


var invite = function (req, res) {
	if(req.headers.page_id){	//check whether it is Journal/Space Module case or not?
		invite__pageLevel(req, res);
	}
	else{
		console.log('in function========================================',req.body);
		var chapter_id = req.headers.chapter_id;
		var invitee = {};
		invitee.email = req.body.invitee.email ? req.body.invitee.email : '';
		invitee.name = req.body.invitee.name ? req.body.invitee.name : '';
		invitee.relation = req.body.invitee.relation ? req.body.invitee.relation : '';
		var rel = invitee.relation;
		rel = rel.split('~');
		console.log(new RegExp(invitee.email, "i").test(req.session.user.Email));
		if (new RegExp(invitee.email, "i").test(req.session.user.Email)) {
			var response = {
				status: 402,
				message: "Can not invite yourself."
			}
			res.json(response)
		} else {
			Chapter.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(invitee.email, "i") } } } }, function (errr, dataa) {
				if (errr) {
					console.log('eerrrr1');
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response)
				}
				else {
					console.log(dataa);
					if (dataa.length == 0) {

						User.findOne({ Email: { $regex: new RegExp(invitee.email, "i") } }, function (err, data) {
							if (err) {
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response)
							} else {
								console.log('in find user');
								if (data != undefined && data != null) {
									console.log('user found');
									var newInvitee = {};
									newInvitee.UserID = data._id;
									newInvitee.UserEmail = data.Email;
									newInvitee.UserName = invitee.name;
									newInvitee.UserNickName = data.NickName;
									newInvitee.CreatedOn = Date.now();
									newInvitee.Relation = rel[0].trim();
									newInvitee.RelationId = rel[1].trim();
									newInvitee.UserPic = data.ProfilePic;
									newInvitee.IsRegistered = true;
									var userPic = data.ProfilePic;
									console.log(req.session.user._id);

									console.log(invitee.email);
									Friend.find({ UserID: req.session.user._id, 'Friend.Email': { $regex: new RegExp(invitee.email, "i") }, Status: 1, IsDeleted: 0 }, function (err1, data2) {
										if (err1) {
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											res.json(response)
										} else {

											if (data2.length > 0) {
												//do nothing
												console.log('already friend');
											} else {
												//call function to add member
												console.log('saving as friend');
												var newFriendData = {};
												newFriendData.ID = newInvitee.UserID;
												newFriendData.Email = newInvitee.UserEmail;
												newFriendData.Name = newInvitee.UserName;
												newFriendData.NickName = newInvitee.UserNickName;
												newFriendData.Pic = userPic;
												newFriendData.Relation = rel[0].trim();
												newFriendData.RelationID = rel[1].trim();
												newFriendData.IsRegistered = true;

												var friendship = new Friend();
												friendship.UserID = req.session.user._id;
												friendship.Friend = newFriendData;
												friendship.Status = 1;
												friendship.IsDeleted = 0;
												friendship.CreatedOn = Date.now();
												friendship.ModifiedOn = Date.now();
												friendship.save(function (err4, data) {
													if (err4) {
														console.log(err4)
													}
												});
											}
											console.log('===========================================');
											console.log(newInvitee);
											console.log('===========================================');
											console.log(chapter_id);
											Chapter.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": newInvitee } }, { multi: false }, function (err, data3) {
												if (err) {
													var response = {
														status: 501,
														message: "Something went wrong."
													}
													res.json(response)
												} else {
													console.log('updating chapter');
													
													Chapter.findOne({ _id: chapter_id }, {}, function (err, result) {
														if (!err) {
															var ChapterData = result;
															console.log("ChapterData = ", ChapterData);
															if (ChapterData.IsLaunched) {
																console.log("----------------LAUNCHED CHAPTER CASE------------------");
																var invitees = new Array();
																//invitees.push(member);
																invitees.push(newInvitee);
																chapter__sendInvitations(ChapterData, invitees, req)
															}
														}
													});
													
													var response = {
														status: 200,
														message: "user invited sucessfully",
														result: data3
													}
													res.json(response);
												}
											})
										}
									})

								} else {

									console.log('user not found');
									var newInvitee = {};
									newInvitee.UserEmail = invitee.email;
									newInvitee.UserName = invitee.name;
									newInvitee.CreatedOn = Date.now();
									newInvitee.Relation = rel[0].trim();
									newInvitee.RelationId = rel[1].trim();
									newInvitee.IsRegistered = false;
									console.log(req.session.user._id);

									console.log(invitee.email);
									Friend.find({ UserID: req.session.user._id, 'Friend.Email': { $regex: new RegExp(invitee.email, "i") }, Status: 1, IsDeleted: 0 }, function (err1, data2) {
										if (err1) {
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											res.json(response)
										} else {

											if (data2.length > 0) {
												//do nothing
												console.log('already friend');
											} else {
												//call function to add member
												console.log('saving as friend');
												var newFriendData = {};
												newFriendData.Email = newInvitee.UserEmail;
												newFriendData.Name = newInvitee.UserName;
												newFriendData.Relation = rel[0].trim();
												newFriendData.RelationID = rel[1].trim();
												newFriendData.IsRegistered = false;

												var friendship = new Friend();
												friendship.UserID = req.session.user._id;
												friendship.Friend = newFriendData;
												friendship.Status = 1;
												friendship.IsDeleted = 0;
												friendship.CreatedOn = Date.now();
												friendship.ModifiedOn = Date.now();
												friendship.IsRegistered = false;

												friendship.save(function (err4, data) {
													if (err4) {
														console.log(err4)
													}
												});
											}
											console.log('===========================================');
											console.log(newInvitee);
											console.log('===========================================');
											console.log(chapter_id);
											Chapter.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": newInvitee } }, { multi: false }, function (err, data3) {
												if (err) {
													var response = {
														status: 501,
														message: "Something went wrong."
													}
													res.json(response)
												} else {
													console.log('updating chapter');
													//send email if the chapter has already been launched...
													Chapter.findOne({ _id: chapter_id }, {}, function (err, result) {
														if (!err) {
															var ChapterData = result;
															console.log("ChapterData = ", ChapterData);
															if (ChapterData.IsLaunched) {
																console.log("----------------LAUNCHED CHAPTER CASE------------------");
																var invitees = new Array();
																//invitees.push(member);
																invitees.push(newInvitee);
																chapter__sendInvitations(ChapterData, invitees, req)
															}
														}
													});
													var response = {
														status: 200,
														message: "user invited sucessfully",
														result: data3
													}
													res.json(response);
												}
											})
										}
									});
								}
							}
						});
					} else {
						var response = {
							status: 401,
							message: "already invited"
						}
						res.json(response);
					}
				}
			});
		}
	
	}
}

var invite__pageLevel = function (req, res) {
	var chapter_id = req.headers.page_id;
	Page.find({ _id: chapter_id, LaunchSettings : {$exists:false}},{}, function (errr, dataa) {
		if(!errr){
			dataa = dataa ? dataa : [];
			console.log("MP testing-----@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ",dataa);
			if(dataa.length){
				var dataToSave = {
					"OthersData" : [],
					"Invitees" : [],
					"ShareMode" : "friend-group",
					"NamingConvention" : "realnames",
					"MakingFor" : "ME"
				};
				Page.update({ _id: chapter_id }, { $set: { "LaunchSettings": dataToSave } }, { multi: false }, function (err, data3) {
					if(!err){
						invite__pageLevel_Final(req , res);
					}
					else{
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response)
					}
				})
			}
			else{
				invite__pageLevel_Final(req , res);
			}
		}
		else{
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		}
	})
}

var invite__pageLevel_Final = function (req, res) {
	console.log('in invite__pageLevel_Final function========================================',req.body);
	var chapter_id = req.headers.page_id;
	var invitee = {};
	invitee.email = req.body.invitee.email ? req.body.invitee.email : '';
	invitee.name = req.body.invitee.name ? req.body.invitee.name : '';
	invitee.relation = req.body.invitee.relation ? req.body.invitee.relation : '';
	var rel = invitee.relation;
	rel = rel.split('~');
	console.log(new RegExp(invitee.email, "i").test(req.session.user.Email));
	if (new RegExp(invitee.email, "i").test(req.session.user.Email)) {
		var response = {
			status: 402,
			message: "Can not invite yourself."
		}
		res.json(response)
	} else {
		Page.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(invitee.email, "i") } } } }, function (errr, dataa) {
			if (errr) {
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response)
			}
			else {
				console.log(dataa);
				if (dataa.length == 0) {

					User.findOne({ Email: { $regex: new RegExp(invitee.email+"$", "i") } }, function (err, data) {
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response)
						} else {
							console.log('in find user');
							if (data != undefined && data != null) {
								console.log('user found');
								var newInvitee = {};
								newInvitee.UserID = data._id;
								newInvitee.UserEmail = data.Email;
								newInvitee.UserName = invitee.name;
								newInvitee.UserNickName = data.NickName;
								newInvitee.CreatedOn = Date.now();
								newInvitee.Relation = rel[0].trim();
								newInvitee.RelationId = rel[1].trim();
								newInvitee.UserPic = data.ProfilePic;
								newInvitee.IsRegistered = true;
								var userPic = data.ProfilePic;
								console.log(req.session.user._id);

								console.log(invitee.email);
								Friend.find({ UserID: req.session.user._id, 'Friend.Email': { $regex: new RegExp(invitee.email + '$', "i") }, Status: 1, IsDeleted: 0 }, function (err1, data2) {
									if (err1) {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response)
									} else {

										if (data2.length > 0) {
											//do nothing
											console.log('already friend');
										} else {
											//call function to add member
											console.log('saving as friend');
											var newFriendData = {};
											newFriendData.ID = newInvitee.UserID;
											newFriendData.Email = newInvitee.UserEmail;
											newFriendData.Name = newInvitee.UserName;
											newFriendData.NickName = newInvitee.UserNickName;
											newFriendData.Pic = userPic;
											newFriendData.Relation = rel[0].trim();
											newFriendData.RelationID = rel[1].trim();
											newFriendData.IsRegistered = true;

											var friendship = new Friend();
											friendship.UserID = req.session.user._id;
											friendship.Friend = newFriendData;
											friendship.Status = 1;
											friendship.IsDeleted = 0;
											friendship.CreatedOn = Date.now();
											friendship.ModifiedOn = Date.now();
											friendship.save(function (err4, data) {
												if (err4) {
													console.log(err4)
												}
											});
										}
										console.log('===========================================');
										console.log(newInvitee);
										console.log('===========================================');
										console.log(chapter_id);
										Page.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": newInvitee } }, { multi: false }, function (err, data3) {
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												res.json(response)
											} else {
												
												Page.findOne({ _id: chapter_id }, {}, function (err, result) {
													if (!err) {
														var PageData = result;
														console.log("PageData = ", PageData);
														var invitees = new Array();
														invitees.push(newInvitee);
														page__sendInvitations(PageData, invitees, req)
													}
												});
											
											
												console.log('updating chapter');
												var response = {
													status: 200,
													message: "user invited sucessfully",
													result: data3
												}
												res.json(response);
											}
										})
									}
								})

							} else {

								console.log('user not found');
								var newInvitee = {};
								newInvitee.UserEmail = invitee.email;
								newInvitee.UserName = invitee.name;
								newInvitee.CreatedOn = Date.now();
								newInvitee.Relation = rel[0].trim();
								newInvitee.RelationId = rel[1].trim();
								newInvitee.IsRegistered = false;
								console.log(req.session.user._id);

								console.log(invitee.email);
								Friend.find({ UserID: req.session.user._id, 'Friend.Email': { $regex: new RegExp(invitee.email + '$', "i") }, Status: 1, IsDeleted: 0 }, function (err1, data2) {
									if (err1) {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response)
									} else {

										if (data2.length > 0) {
											//do nothing
											console.log('already friend');
										} else {
											//call function to add member
											console.log('saving as friend');
											var newFriendData = {};
											newFriendData.Email = newInvitee.UserEmail;
											newFriendData.Name = newInvitee.UserName;
											newFriendData.Relation = rel[0].trim();
											newFriendData.RelationID = rel[1].trim();
											newFriendData.IsRegistered = false;

											var friendship = new Friend();
											friendship.UserID = req.session.user._id;
											friendship.Friend = newFriendData;
											friendship.Status = 1;
											friendship.IsDeleted = 0;
											friendship.CreatedOn = Date.now();
											friendship.ModifiedOn = Date.now();
											friendship.IsRegistered = false;

											friendship.save(function (err4, data) {
												if (err4) {
													console.log(err4)
												}
											});
										}
										console.log('===========================================');
										console.log(newInvitee);
										console.log('===========================================');
										console.log(chapter_id);
										
										Page.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": newInvitee } }, { multi: false }, function (err, data3) {
											if (err) {
												var response = {
													status: 501,
													message: "Something went wrong."
												}
												res.json(response)
											} else {
												//console.log('updating chapter');
												//send email if the chapter has already been launched...
												Page.findOne({ _id: chapter_id }, {}, function (err, result) {
													if (!err) {
														var PageData = result;
														console.log("PageData = ", PageData);
														var invitees = new Array();
														invitees.push(newInvitee);
														page__sendInvitations(PageData, invitees, req)
													}
												});
												var response = {
													status: 200,
													message: "user invited sucessfully",
													result: data3
												}
												res.json(response);
											}
										})
									}
								});
							}
						}
					});
				} else {
					var response = {
						status: 401,
						message: "already invited"
					}
					res.json(response);
				}
			}
		});
	}
}

var inviteMember = function (req, res) {
	if(req.headers.page_id){	//check whether it is Journal/Space Module case or not?
		inviteMember__pageLevel(req, res);
	}
	else{
		var chapter_id = req.headers.chapter_id;
		var member = req.body.member ? req.body.member : '';
		Chapter.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, function (errr, dataa) {
			
			console.log("Chapter---1212133333-----",dataa.length,errr)
			if (errr) {
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response)
			}
			else {
				console.log(chapter_id);
				if (dataa.length == 0) {
					Chapter.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": member }, ModifiedOn: Date.now() }, { multi: false }, function (err, data3) {
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response)
						} else {
							console.log('updating chapter');
							//send email if the chapter has already been launched...
							Chapter.findOne({ _id: chapter_id }, {}, function (err, result) {
								if (!err) {
									var ChapterData = result;
									//console.log("ChapterData = ",ChapterData);

									AppController.__capsule_touchUpdateFlag(ChapterData.CapsuleId);

									if (ChapterData.IsLaunched) {
										console.log("----------------LAUNCHED CHAPTER CASE------------------");
										var invitees = new Array();
										invitees.push(member);
										chapter__sendInvitations(ChapterData, invitees, req)
									}
								}
							})
							var response = {
								status: 200,
								message: "user invited sucessfully",
								result: data3
							}
							res.json(response);
						}
					})
				} else {
					var response = {
						status: 401,
						message: "already invited"
					}
					res.json(response);
				}
			}
		})
	}

}

var inviteMember__pageLevel = function (req, res) {
	var chapter_id = req.headers.page_id;
	Page.find({ _id: chapter_id, LaunchSettings : {$exists:false}}, function (errr, dataa) {
		if(!errr){
			dataa = dataa ? dataa : [];
			console.log("MP testing-----@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ ",dataa);
			if(dataa.length){
				var dataToSave = {
					"OthersData" : [],
					"Invitees" : [],
					"ShareMode" : "friend-group",
					"NamingConvention" : "realnames",
					"MakingFor" : "ME"
				};
				Page.update({ _id: chapter_id }, { $set: { "LaunchSettings": dataToSave } }, { multi: false }, function (err, data3) {
					if(!err){
						inviteMember__pageLevel_Final(req , res);
					}
					else{
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response)
					}
				})
			}
			else{
				inviteMember__pageLevel_Final(req , res);
			}
		}
		else{
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		}
	})
}
var inviteMember__pageLevel_Final = function (req, res) {
	var chapter_id = req.headers.page_id;
	var member = req.body.member ? req.body.member : '';
	Page.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, function (errr, dataa) {
		
		console.log("Chapter---1212133333-----",dataa.length,errr)
		if (errr) {
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		}
		else {
			console.log(chapter_id);
			if (dataa.length == 0) {
				//now sync the latest user detail by checking from user collection
				User.find({Email : member.UserEmail , IsDeleted : 0} , {Name : 1 , NickName : 1, ProfilePic : 1} , function(err , userRecord){
					if(!err) {
						userRecord = userRecord ? userRecord : [];
						member.UserName = userRecord[0].Name ? userRecord[0].Name : member.UserName;
						member.UserNickName = userRecord[0].NickName ? userRecord[0].NickName : member.UserNickName;
						member.UserPic = userRecord[0].ProfilePic ? userRecord[0].ProfilePic : "/assets/users/default.png";
						
						Page.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": member } }, { multi: false }, function (err, data3) {
							if (err) {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response)
							} else {
								console.log('updating chapter');
								//send email if the chapter has already been launched...
								Page.findOne({ _id: chapter_id }, {}, function (err, result) {
									if (!err) {
										var ChapterData = result;
										//AppController.__capsule_touchUpdateFlag(ChapterData.CapsuleId);

										var invitees = new Array();
										invitees.push(member);
										page__sendInvitations(ChapterData, invitees, req)
									
									}
								})
								var response = {
									status: 200,
									message: "user invited sucessfully",
									result: data3
								}
								res.json(response);
							}
						})
					}
					else{
						Page.update({ _id: chapter_id }, { $push: { "LaunchSettings.Invitees": member } }, { multi: false }, function (err, data3) {
							if (err) {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response)
							} else {
								console.log('updating chapter');
								//send email if the chapter has already been launched...
								Page.findOne({ _id: chapter_id }, {}, function (err, result) {
									if (!err) {
										var ChapterData = result;
										//AppController.__capsule_touchUpdateFlag(ChapterData.CapsuleId);

										var invitees = new Array();
										invitees.push(member);
										page__sendInvitations(ChapterData, invitees, req)
									
									}
								})
								var response = {
									status: 200,
									message: "user invited sucessfully",
									result: data3
								}
								res.json(response);
							}
						})
					}
				})
			} else {
				var response = {
					status: 401,
					message: "already invited"
				}
				res.json(response);
			}
		}
	})

}

var removeInvitee = function (req, res) {
	if(req.headers.page_id){	//check whether it is Journal/Space Module case or not?
		removeInvitee__pageLevel(req, res);
	}
	else{
		console.log('inviteMember');
		var chapter_id = req.headers.chapter_id;
		var member = req.body.member ? req.body.member : '';

		if (member.UserEmail) {
			//code
			Chapter.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, function (errr, dataa) {
				if (errr) {
					console.log('eerrrr1', errr);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response)
				}
				else {
					console.log(chapter_id);
					if (dataa.length == 0) {
						var response = {
							status: 401,
							message: "not a member"
						}
						res.json(response);
					} else {
						Chapter.update({ _id: chapter_id }, { $pull: { 'LaunchSettings.Invitees': { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, { multi: false }, function (err, data) {
							if (err) {
								var response = {
									status: 502,
									message: "something went wrong"
								}
								res.json(response);
							} else {
								var response = {
									status: 200,
									message: "user deleted sucessfully",
									result: data
								}
								res.json(response);
							}
						})
					}
				}
			})
		}
		else {
			console.log('eerrrr2222');
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)

		}
	}
}

var removeInvitee__pageLevel = function (req, res) {
	console.log('removeInvitee__pageLevel');
	var chapter_id = req.headers.page_id;
	var member = req.body.member ? req.body.member : '';

	if (member.UserEmail) {
		//code
		Page.find({ _id: chapter_id, 'LaunchSettings.Invitees': { $elemMatch: { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, function (errr, dataa) {
			if (errr) {
				console.log('eerrrr1', errr);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response)
			}
			else {
				console.log(chapter_id);
				if (dataa.length == 0) {
					var response = {
						status: 401,
						message: "not a member"
					}
					res.json(response);
				} else {
					Page.update({ _id: chapter_id }, { $pull: { 'LaunchSettings.Invitees': { UserEmail: { $regex: new RegExp(member.UserEmail, "i") } } } }, { multi: false }, function (err, data) {
						if (err) {
							var response = {
								status: 502,
								message: "something went wrong"
							}
							res.json(response);
						} else {
							var response = {
								status: 200,
								message: "user deleted sucessfully",
								result: data
							}
							res.json(response);
						}
					})
				}
			}
		})
	}
	else {
		console.log('eerrrr2222');
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		res.json(response)

	}

}


var addOwner = function (req, res) {
	console.log('in function');
	var chapter_id = req.headers.chapter_id;
	var email = req.body.email ? req.body.email : '';
	if (new RegExp(email, "i").test(req.session.user.Email)) {
		var response = {
			status: 402,
			message: "Can not invite yourself."
		}
		res.json(response)
	} else {
		Chapter.find({ _id: chapter_id, 'LaunchSettings.OthersData': { $elemMatch: { UserEmail: { $regex: new RegExp(email, "i") } } } }, function (errr, dataa) {
			if (errr) {
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response)
			}
			else {
				//console.log(dataa);
				if (dataa.length == 0) {

					User.findOne({ Email: { $regex: new RegExp(email, "i") } }, function (err, data) {
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong."
							}
							res.json(response)
						} else {
							console.log('in find user');
							if (data != undefined && data != null) {
								console.log('user found');
								var newOwner = {};
								newOwner.UserID = data._id;
								newOwner.UserEmail = data.Email;
								newOwner.UserName = data.Name;
								newOwner.UserNickName = data.NickName;
								newOwner.CreatedOn = Date.now();
								newOwner.UserPic = data.ProfilePic;
								newOwner.IsRegistered = true;
								var userPic = data.ProfilePic;
								console.log('===========================================');
								console.log(newOwner);
								console.log('===========================================');
								console.log(chapter_id);
								Chapter.update({ _id: chapter_id }, { $push: { "LaunchSettings.OthersData": newOwner } }, { multi: false }, function (err, data3) {
									if (err) {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response)
									} else {
										console.log('updating chapter');

										var response = {
											status: 200,
											message: "user invited sucessfully",
											result: data3
										}
										res.json(response);
									}
								})

							} else {

								console.log('user found');
								var newOwner = {};
								newOwner.UserEmail = email;
								newOwner.CreatedOn = Date.now();
								newOwner.IsRegistered = false;
								console.log(req.session.user._id);
								Chapter.update({ _id: chapter_id }, { $push: { "LaunchSettings.OthersData": newOwner } }, { multi: false }, function (err, data3) {
									if (err) {
										var response = {
											status: 501,
											message: "Something went wrong."
										}
										res.json(response)
									} else {
										console.log('updating chapter');

										var response = {
											status: 200,
											message: "user invited sucessfully",
											result: data3
										}
										res.json(response);
									}
								})
							}
						}
					});
				} else {
					var response = {
						status: 401,
						message: "already added to owners"
					}
					res.json(response);
				}
			}
		});
	}
}

var removeOwner = function (req, res) {
	console.log('removeOwner');
	var chapter_id = req.headers.chapter_id;
	var email = req.body.email ? req.body.email : '';
	Chapter.find({ _id: chapter_id, 'LaunchSettings.OthersData': { $elemMatch: { UserEmail: { $regex: new RegExp(email, "i") } } } }, function (errr, dataa) {
		if (errr) {
			console.log('eerrrr1');
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		}
		else {
			console.log(chapter_id);
			if (dataa.length == 0) {
				var response = {
					status: 401,
					message: "not a member"
				}
				res.json(response);
			} else {
				Chapter.update({ _id: chapter_id }, { $pull: { 'LaunchSettings.OthersData': { UserEmail: { $regex: new RegExp(email, "i") } } } }, { multi: false }, function (err, data) {
					if (err) {
						var response = {
							status: 502,
							message: "something went wrong"
						}
						res.json(response);
					} else {
						var response = {
							status: 200,
							message: "owner deleted sucessfully",
							result: data
						}
						res.json(response);
					}
				})
			}
		}
	})
}


/*________________________________________________________________________
   * @Date:      		25 Aug 2015
   * @Method :   		saveSetting
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/
var saveSetting = function (req, res) {
	console.log('server side saveSetting function');
	var condition = {};
	condition._id = req.headers.chapter_id ? req.headers.chapter_id : '0';

	var title = req.body.newTitle ? req.body.newTitle : "Untitled Chapter";
	var ShareMode = req.body.participation ? req.body.participation : "private";
	var NamingConvention = req.body.namingConvention ? req.body.namingConvention : "realnames";

	Chapter.update(condition, { $set: { Title: title, 'LaunchSettings.ShareMode': ShareMode, 'LaunchSettings.NamingConvention': NamingConvention } }, { multi: false }, function (err, numAffected) {
		if (err) {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response)
		} else {
			var response = {
				status: 200,
				message: "Chapter name updated successfully.",
				result: numAffected
			}
			res.json(response);
		}
	})
}

/*________________________________________________________________________
   * @Date:      		25 September 2015
   * @Method :   		all__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var all__getLaunchedChapters = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or: [{ "LaunchSettings.Invitees.UserEmail": req.session.user.Email }, { CreaterId: req.session.user._id, Origin: { $ne: "createdForMe" } }, { OwnerId: req.session.user._id, OwnerEmail: req.session.user.Email }],
		Status: 1,
		IsLaunched: 1,
		IsDeleted: 0
	};

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).exec(function (errr, results2) {
				if (!errr) {
					var response = {
						count: results2.length,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		25 September 2015
   * @Method :   		launchedByMe__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var launchedByMe__getLaunchedChapters = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		$or: [{ CreaterId: req.session.user._id }, { OwnerId: req.session.user._id }],
		Status: 1,
		IsLaunched: 1,
		IsDeleted: 0
	};

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).exec(function (errr, results2) {
				if (!errr) {
					var response = {
						count: results2.length,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
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
   * @Date:      		25 September 2015
   * @Method :   		invitationForMe__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var invitationForMe__getLaunchedChapters = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	console.log('--------------------limit = ' + limit);
	console.log('--------------------Offset = ' + offset);
	var conditions = {
		//CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		"LaunchSettings.Invitees.UserEmail": req.session.user.Email,
		Status: 1,
		IsLaunched: 1,
		IsDeleted: 0
	};

	var sortObj = {
		//Order : 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, results) {
		if (!err) {
			Chapter.find(conditions, fields).exec(function (errr, results2) {
				if (!errr) {
					var response = {
						count: results2.length,
						status: 200,
						message: "Chapters listing",
						results: results
					}
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			})
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

//dashboard apis
/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		dashboard__findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var dashboard__findAll = function (req, res) {
	/*
	var conditions = {
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		CapsuleId : req.headers.capsule_id ? req.headers.capsule_id : 0,
		OwnerId : req.session.user._id,
		Status : 1,
		//IsLaunched : 0,
		IsDeleted : 0
	};
	*/

	var conditions = {
		CapsuleId: req.headers.capsule_id,
		$or: [
			{ CreaterId: req.session.user._id, Origin: "created", "LaunchSettings.MakingFor": "ME", IsLaunched: true },
			{ CreaterId: req.session.user._id, Origin: "duplicated", "LaunchSettings.MakingFor": "ME", IsLaunched: true },
			{ CreaterId: req.session.user._id, Origin: "addedFromLibrary", "LaunchSettings.MakingFor": "ME", IsLaunched: true },
			{ CreaterId: { $ne: req.session.user._id }, OwnerId: req.session.user._id },  //this may not have option for further share. ? - May be key for furtherSharable ?
			{ Origin: "published", OwnerId: req.session.user._id },
			//{"LaunchSettings.Invitees.UserID":req.session.user._id,IsLaunched : true}	//member of the chapter case
			{ "LaunchSettings.Invitees.UserEmail": req.session.user.Email, IsLaunched: true }	//member of the chapter case
		],
		Status: true,
		IsDeleted: false
	};

	var sortObj = {
		Order: 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).lean().exec(function (err, results) {
		if (!err) {
			//check whether chapter has intro page or not
			for(var loop = 0; loop < results.length; loop++) {
				var srcPath = __dirname + "/../../public/views/intro-pages/" + String(results[loop]._id) + ".html";
				
				var srcPath_owner = __dirname + "/../../public/views/intro-pages/" + String(results[loop]._id) + "_O.html";
				
				var IsIntroPageExists = false;
				if(fs.existsSync(srcPath) && fs.existsSync(srcPath_owner)) {
					IsIntroPageExists = true;
				}
				results[loop].IsIntroPageExists = IsIntroPageExists;
			}
			
			
			
			var response = {
				status: 200,
				message: "Chapters listing",
				results: results
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

//upload menu icon for chapter by arun sahani
var uploadMenuIcon = function (req, res) {
	var incNum = 0;
	counters.findOneAndUpdate(
		{ _id: "userId" }, { $inc: { seq: 1 } }, { new: true }, function (err, data) {
			if (!err) {
				console.log('=========================')
				console.log(data);
				//data.seq=(data.seq)+1;
				console.log(data.seq);
				incNum = data.seq;
				//data.save(function(err){
				//if( !err ){
				console.log("incNum=" + incNum);
				var form = new formidable.IncomingForm();
				var RecordLocator = "";

				form.parse(req, function (err, fields, files) {
					var file_name = "";
					console.log("fields --", fields)
					console.log("Files  --", files)
					if (files.myFile.name) {
						uploadDir = __dirname + "/../../public/assets/Media/menu/";
						file_name = files.myFile.name;
						file_name = file_name.split('.');
						ext = file_name[file_name.length - 1];
						RecordLocator = file_name[0];
						var name = '';
						name = dateFormat() + '_' + incNum;
						name = Math.floor(Date.now() / 1000).toString() + '_' + incNum;
						file_name = name + '.' + ext;
						file_name = name + '.' + ext; //updated on 09022015 by manishp : <timestamp>_<media_unique_number>_<size>.<extension> = 1421919905373_101_600.jpeg
						console.log(files.myFile.type);
						fs.renameSync(files.myFile.path, uploadDir + "/" + file_name)

						var media_type = '';
						if (files.myFile.type == "application/pdf" || files.myFile.type == "application/msword" || files.myFile.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || files.myFile.type == "application/vnd.ms-excel" || files.myFile.type == "application/vnd.oasis.opendocument.spreadsheet" || files.myFile.type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || files.myFile.type == "application/vnd.ms-powerpoint" || files.myFile.type == 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
							media_type = 'Document';
						}
						else if (files.myFile.type == 'video/mp4' || files.myFile.type == 'video/ogg') {
							media_type = 'Video';
						}
						else if (files.myFile.type == 'audio/mpeg' || files.myFile.type == 'audio/ogg') {
							media_type = 'Audio';
						}
						else {
							media_type = 'Image';
							//add thumbnail code
							var imgUrl = file_name;
							var mediaCenterPath = "/../../public/assets/Media/menu/";
							var srcPath = __dirname + mediaCenterPath + imgUrl;

							if (fs.existsSync(srcPath)) {
								console.log("In Synccc")
								try {
									im.identify(srcPath, function (err, features) {
										if (err) {
											console.log(err);
										} else {
											//if (features.width == features.height) {
											if (features.width == 50 && features.height == 50) {
												var dstPath = __dirname + mediaCenterPath + "resized/" + imgUrl;
												resize_image(srcPath, dstPath, 30, 30);
												var conditions = {},
													setData = {};

												conditions._id = fields.chapter_id;
												setData.MenuIcon = file_name;

												Chapter.update(conditions, { $set: setData }, function (err, numAffected) {
													if (!err) {
														var response = {
															status: 200,
															message: "Image saved successfully.",
															result: {
																MenuIcon: file_name
															}
														}
														res.json(response);
													}
													else {
														console.log(err);
														var response = {
															status: 501,
															message: "Something went wrong."
														}
														res.json(response);
													}
												})
											}
											else {
												res.json({ 'code': 400, 'msg': 'file dimension error.', result: { dimensions: { width: features.width, height: features.height } } });
												//now unlink
												if (fs.existsSync(srcPath)) {
													fs.unlink(srcPath);
												}
											}
										}
									})
								}
								catch (e) {
									console.log("=========================ERROR : ", e);
								}
							}
						}
					}
				});
			}
		});
}

var resize_image = function (srcPath, dstPath, w, h) {

	console.log("source : ", srcPath + " ---- destination : " + dstPath);

	try {
		im.identify(srcPath, function (err, features) {
			if (err) {
				console.log(err);
			} else {
				console.log(features.width + "======================" + features.height);
				if (features.height >= 50) {
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
				else if (features.width >= 50) {
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
				else {
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
	catch (e) {
		console.log("=========================ERROR : ", e);
	}
}

var delMenuIcon = function (req, res) {
	console.log("------------------------------------------");
	console.log("Data come---", req.body);

	var conditions = {},
		fields = {};
	conditions._id = req.body.chapter_id;
	fields.MenuIcon = null;

	Chapter.update(conditions, { $set: fields }, function (err, numAffected) {
		if (!err) {
			var response = {
				status: 200,
				message: "Menu Icon deleted successfully.",
				result: numAffected
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}
var delCoverArt = function (req, res) {
	console.log("------------------------------------------");
	console.log("Data come---", req.body);

	var conditions = {},
		fields = {};
	conditions._id = req.body.chapter_id;
	fields.CoverArt = null;

	Chapter.update(conditions, { $set: fields }, function (err, numAffected) {
		if (!err) {
			var response = {
				status: 200,
				message: "Cover Art deleted successfully.",
				result: numAffected
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	})
}

// To push chapter id in capsule by arun sahani 20-05-2016
var pushChapterId = function (capsuleId, chapterId) {
	Capsule.update({ _id: capsuleId }, { $push: { Chapters: chapterId } }, function (err, data) {
		if (err) {
			console.log(err);
		} else {
			console.log("Chapter saved in capsule successfully.");
		}
	})
}

// To delete chapter id in capsule by arun sahani 20-05-2016
var pullChapterId = function (capsuleId, chapterId) {
	var chpId = mongoose.Types.ObjectId(chapterId);
	//db.Capsules.update({"_id": ObjectId("573ea437217581540bb6acab")},
	//{$pull: {'Chapters': {$in: [ObjectId('573ea914689766de10851e96')]}}})

	Capsule.update({ _id: capsuleId }, { $pull: { 'Chapters': { $in: [chpId] } } }, function (err, data1) {
		if (err) {
			console.log(err);
		} else {
			console.log("Chapter removed successfully.")
		}
	});
}

/*
var updateChapterForPageId = function(req,res){
	
	var conditionsIntial = {
		_id : req.headers.chapter_id,
	}
	Chapter.findOne(conditionsIntial).exec(function( err , results ){
		if( err ){
			console.log(err);
		}
		else{
			if(results.pages.length){
				var response = {
					status: 200,
					message: "Already updated.",
					result : results.length
				res.json(response);	
				}
			}else{
				var conditions = {
					ChapterId : req.headers.chapter_id,
					PageType : {$in : ["gallery" , "content"]}
				};
				var fields = {};
				Page.find(conditions , fields).exec(function( err , results ){
					if( err ){
						console.log(err);
					}
					else{
						console.log("Searching:",results)
						var conditions = {
							_id : req.headers.chapter_id,
						
						};
						
						if (results.length) {
							var pageCount = 0;
							for(var i=0;i< results.length;i++){
								Chapter.update({_id: conditions._id},{ $push: { pages: results[i]._id} },function(err,data){
									if (err) {
										console.log(err);
									}else{
										console.log("Page saved in chapter successfully.");
										
									}
								})
								pageCount++;
							}
							console.log("pageCount--------------------",pageCount);
							console.log("results.length +++++++++++++++++++",results.length);
							if (pageCount == results.length) {
								var response = {
									status: 200,
									message: "Chapter updated successfully.",
									result : results.length
								}
								res.json(response);
							}
						}else{
							var response = {
								status: 200,
								message: "No page exists.",
								result : results.length
							}
							res.json(response);
						}
					}
				});
			}
		}
	})
}
*/

var updateChapterForPageId = function (req, res) {

	var conditionsIntial = {
		_id: req.headers.chapter_id,
	}
	Chapter.findOne(conditionsIntial).exec(function (err, results) {
		if (err) {
			console.log(err);
		}
		else {
			if (results.pages.length) {
				var response = {
					status: 200,
					message: "Already updated.",
					result: results.length
				}
				res.json(response);
			} else {
				var conditions = {
					ChapterId: req.headers.chapter_id,

				};
				var fields = {};
				Page.find(conditions, fields).exec(function (err, results) {
					if (err) {
						console.log(err);
					}
					else {
						console.log("Searching:", results)
						var conditions = {
							_id: req.headers.chapter_id,

						};

						if (results.length) {
							var pageCount = 0;
							for (var i = 0; i < results.length; i++) {
								Chapter.update({ _id: conditions._id }, { $push: { pages: results[i]._id } }, function (err, data) {
									if (err) {
										console.log(err);
									} else {
										console.log("Page saved in chapter successfully.");

									}
								})
								pageCount++;
							}
							console.log("pageCount--------------------", pageCount);
							console.log("results.length +++++++++++++++++++", results.length);
							if (pageCount == results.length) {
								var response = {
									status: 200,
									message: "Chapter updated successfully.",
									result: results.length
								}
								res.json(response);
							}
						} else {
							var response = {
								status: 200,
								message: "No page exists.",
								result: results.length
							}
							res.json(response);
						}
					}
				});
			}
		}
	})
}

var addAudioToChapter = function (req, res) {
	var conditions = {
		_id: req.body.chapter_id ? req.body.chapter_id : null
	}
	var audio = req.body.audio ? req.body.audio : {};
	var data = {
		track: audio.Track ? audio.Track : null,
		filename: audio.Filename ? audio.Filename : null,
		size: audio.Bytes ? audio.Bytes : null,
		duration: audio.Duration ? audio.Duration : null
	}
	Chapter.update({ _id: conditions._id }, { $push: { ChapterPlaylist: data } }, function (err, data) {
		if (err) {
			console.log(err);
		} else {
			Chapter.findOne({ _id: conditions._id }).exec(function (err, results) {
				if (err) {
					console.log(err);
				} else {
					var response = {
						status: 200,
						message: "Added To playlist",
						result: results
					}
					res.json(response);
				}
			});
		}
	})
}

var deleteAudioToChapter = function (req, res) {
	var conditions = {
		_id: req.body.chapter_id ? req.body.chapter_id : null
	}
	var playListId = req.body.playListId ? req.body.playListId : null;
	if (playListId != null) {
		Chapter.update({ _id: conditions._id }, { $pull: { ChapterPlaylist: { _id: playListId } } }, function (err, data) {
			if (err) {
				console.log(err);
			} else {
				Chapter.findOne({ _id: conditions._id }).exec(function (err, results) {
					if (err) {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong.",
							result: results
						}
						res.json(response);
					} else {
						var response = {
							status: 200,
							message: "Removed Successfully",
							result: results
						}
						res.json(response);
					}
				});
			}
		})
	}
	else {
		var response = {
			status: 501,
			message: "Something went wrong.",
			result: results
		}
		res.json(response);
	}
}

//dashboard
exports.dashboard__findAll = dashboard__findAll;

/*________________________________________________________________________
   * @Date:      		05 July 2017
   * @Method :   		allVerifyAndGalleryList__getLaunchedChapters
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var allByCapsuleId__getLaunchedChapters = function (req, res) {
	var conditions = {
		CapsuleId: req.headers.capsule_id
	};

	var sortObj = {
		Order: 1,
		ModifiedOn: -1
	};

	var fields = {};

	Chapter.find(conditions, fields).sort(sortObj).exec(function (err, results) {
		if (!err) {
			var response = {
				status: 200,
				message: "Chapters listing",
				results: results
			}
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

var chapterIntroDetails = function (req, res) {
	if (req.body.chapter_id) {
		Chapter.findOne({ _id: req.body.chapter_id }).populate('CapsuleId','MetaData Title').populate('OwnerId','Email Name ProfilePic').exec(function (err, chapterData) {
			if (err) {
				res.json({ status: 500, message: 'Server error', error: err });
			}
			else {
				res.json({ status: 200, msg: 'Chapter Data got', results: chapterData });
			}
		})
	}
	else if (req.body.page_id) {	//Journal Module Integration
		Page.findOne({ _id: req.body.page_id } , {Medias : 0} , function (err, chapterData) {
			if (err) {
				res.json({ status: 500, message: 'Server error', error: err });
			}
			else {
				res.json({ status: 200, msg: 'Page data fetched successfully!', results: chapterData });
			}
		})
	}
	else {
		res.json({ status: 404, message: 'Params missing' });
	}

}

//Chapters In the making Apis
exports.find = find;
exports.findAll = findAll;
exports.findAllPaginated = findAllPaginated;
exports.createdByMe = createdByMe;
exports.sharedWithMe = sharedWithMe;
exports.createdForMe = createdForMe;
exports.byTheHouse = byTheHouse;
exports.saveSetting = saveSetting;

exports.all__getLaunchedChapters = all__getLaunchedChapters;
exports.launchedByMe__getLaunchedChapters = launchedByMe__getLaunchedChapters;
exports.invitationForMe__getLaunchedChapters = invitationForMe__getLaunchedChapters;

exports.create = create;
exports.duplicate = duplicate;
exports.remove = remove;
//exports.remove = remove_V2;		//both case 1) remove action by Owner 2) remove Action by Member 
exports.reorder = reorder;
exports.updateChapterName = updateChapterName;
exports.uploadCover = uploadCover;
exports.invite = invite;
exports.inviteMember = inviteMember;
exports.removeInvitee = removeInvitee;
exports.addOwner = addOwner;
exports.removeOwner = removeOwner;

//Chapter library Apis
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
exports.share = share;

exports.uploadMenuIcon = uploadMenuIcon;
exports.delMenuIcon = delMenuIcon;
exports.delCoverArt = delCoverArt;
exports.updateChapterForPageId = updateChapterForPageId;

exports.addAudioToChapter = addAudioToChapter;
exports.deleteAudioToChapter = deleteAudioToChapter;

exports.allByCapsuleId__getLaunchedChapters = allByCapsuleId__getLaunchedChapters;	//For Verify and Public Gallery Capsule listing
exports.chapterIntroDetails = chapterIntroDetails;

//Journal / Space Module page level invitations -- trying to reuse the chapter level code and guidelines.
exports.invite__pageLevel = invite__pageLevel;
exports.inviteMember__pageLevel = inviteMember__pageLevel;
exports.removeInvitee__pageLevel = removeInvitee__pageLevel;
//Journal / Space Module page level invitations -- trying to reuse the chapter level code and guidelines.

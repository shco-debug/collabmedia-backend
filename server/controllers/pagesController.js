var Capsule = require('./../models/capsuleModel.js');
var Chapter = require('./../models/chapterModel.js');
var Page = require('./../models/pageModel.js');
var SearchGalleryPage = require('./../controllers/searchGalleryPageController.js');
var User = require('./../models/userModel.js');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var ContentPage = require('./../controllers/contentPageController.js');
//var AlgoLibrary = require('./../controllers/commonAlgos.js');
var EmailTemplate = require('./../models/emailTemplateModel.js');

var AlgoLibrary = require('./../components/commonAlgorithms.js');
var AppController = require('./../controllers/appController.js');

var async = require('async');

var metaMetaTags = require('./../models/metaMetaTagsModel.js');
var groupTags = require('./../models/groupTagsModel.js');
var LearningTheme = require('./../models/learningThemeModel.js');
var Labels = require('./../models/labelsModel.js');
var mongoose = require('mongoose');

Array.prototype.contains = function (v) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] === v) return true;
	}
	return false;
};

Array.prototype.unique = function () {
	var arr = [];
	for (var i = 0; i < this.length; i++) {
		if (!arr.contains(this[i])) {
			arr.push(this[i]);
		}
	}
	return arr;
}

/*
var ContentPage = {
	create : function(req , res){res.json({status:404});},
	update : function(req , res){res.json({status:200});}
}
*/
//My Pages Apis

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		getChapterName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR" + "CR"
_________________________________________________________________________
*/

var getChapterName = async function (req, res) {
	try {
		if (!req.headers.chapter_id) {
			return res.json({
				status: 400,
				message: "Chapter ID is required in headers."
			});
		}

		var conditions = {
			_id: req.headers.chapter_id,
			OwnerId: req.session.user._id,
			IsDeleted: 0
		};

		var fields = {
			Title: true
		};

		const result = await Chapter.findOne(conditions, fields).exec();

		if (result) {
			var response = {
				status: 200,
				message: "Chapter Title",
				result: result.Title ? result.Title : "Chapter Title"
			};
			res.json(response);
		}
		else {
			var response = {
				status: 404,
				message: "Chapter not found."
			};
			res.json(response);
		}
	}
	catch (err) {
		console.log(err);
		var response = {
			status: 501,
			message: "Something went wrong."
		};
		res.json(response);
	}
};

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		getPageName
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR" + "CR" + "PE"
_________________________________________________________________________
*/

var getPageData = async function (req, res) {
	console.log("getPageData called with headers:", req.headers);
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
		_id: req.headers.page_id ? req.headers.page_id : 0,
		//IsDeleted : 0
	};
	console.log("Search conditions:", conditions);

	var fields = {
		Medias: 0,
		UploadedMedia: 0
	};

	try {
		const result = await Page.findOne(conditions, fields).populate('ChapterId').lean();
		console.log("Page query result:", result);
		
		if (result && result._id) {
			console.log("Page found, processing OwnerData...");
			//result.OwnerId = result.OwnerId._id ? String(result.OwnerId._id) : null;
			try {
				console.log("Looking for OwnerId:", result.OwnerId);
				const OwnerData = await User.find({_id: new mongoose.Types.ObjectId(result.OwnerId)}, {ProfilePic:true, Name: true}).lean();
				console.log("OwnerData found:", OwnerData);
				
				if (OwnerData) {
					result.OwnerData = OwnerData.length ? OwnerData[0] : {};
					console.log("Processing CommonPageObj...");
			
					try {
						console.log("Querying CommonPageObj with ID: 5c1ccf15b76f62790084fcfe");
						const CommonPageObj = await Page.findOne({_id : new mongoose.Types.ObjectId("5c1ccf15b76f62790084fcfe")} , {HeaderImage:1}).lean();
						console.log("CommonPageObj query result:", CommonPageObj);
						
						if (CommonPageObj) {
							console.log("CommonPageObj found, processing HeaderImage...");
							CommonPageObj.HeaderImage = CommonPageObj.HeaderImage ? CommonPageObj.HeaderImage : "";
						
							result.HeaderImage = result.HeaderImage ? result.HeaderImage : CommonPageObj.HeaderImage;
							console.log("HeaderImage set to:", result.HeaderImage);
							
							result.ChapterId = result.ChapterId ? result.ChapterId : {};
							console.log("ChapterId processed:", result.ChapterId);

							//check do we have a menu icon at capsule level, if it is, then return this.
							var conditions = {
								_id: result.ChapterId.CapsuleId
							};
							var fields = {
								MenuIcon: true,
								Title: true,
								CoverArt: true,
								LaunchSettings : true
							};
							console.log("About to query Capsule with conditions:", conditions);

							try {
								console.log("Looking for Capsule with ID:", result.ChapterId.CapsuleId);
								const CapsuleData = await Capsule.findOne(conditions, fields);
								console.log("Capsule query result:", CapsuleData);
								
								if (CapsuleData != null) {
									result['capsule_title'] = CapsuleData.Title;

										if (result.ChapterId.MenuIcon) {
										console.log("Sending response: Page Data 1");
											var response = {
												status: 200,
												message: "Page Data 1",
											capsule_data: CapsuleData,
												result: result
											}
											res.json(response);
										}
										else {
										console.log("Sending response: Page Data 2");
										result.ChapterId.MenuIcon = CapsuleData.MenuIcon ? CapsuleData.MenuIcon : null;
											var response = {
												status: 200,
												message: "Page Data 2",
											capsule_data: CapsuleData,
												result: result
											}
											res.json(response);
										}

									}
									else {
										var response = {
											status: 501,
										message: "Something went wrong."
										}
										res.json(response);
									}
							} catch (err) {
								console.log("Capsule query error, sending Page Data 3:", err);
									var response = {
										status: 200,
										message: "Page Data 3",
										result: result
									}
									res.json(response);
								}
							
						} else {
							console.log("CommonPageObj not found, continuing without header image");
							// Continue processing without the common header image
							result.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
							result.ChapterId = result.ChapterId ? result.ChapterId : {};
							
							//check do we have a menu icon at capsule level, if it is, then return this.
							var conditions = {
								_id: result.ChapterId.CapsuleId
							};
							var fields = {
								MenuIcon: true,
								Title: true,
								CoverArt: true,
								LaunchSettings : true
							};
							console.log("About to query Capsule with conditions:", conditions);
							
							try {
								console.log("Looking for Capsule with ID:", result.ChapterId.CapsuleId);
								const CapsuleData = await Capsule.findOne(conditions, fields);
								console.log("Capsule query result:", CapsuleData);
								
								if (CapsuleData != null) {
									console.log("Sending response: Page Data 1 (from else block)");
									result['capsule_title'] = CapsuleData.Title;
									result.ChapterId.MenuIcon = CapsuleData.MenuIcon ? CapsuleData.MenuIcon : null;
									var response = {
										status: 200,
										message: "Page Data 2",
										capsule_data: CapsuleData,
										result: result
									}
									res.json(response);
								} else {
									console.log("Capsule not found, sending basic response");
									var response = {
										status: 200,
										message: "Page Data 3",
										result: result
									}
									res.json(response);
								}
							} catch (err) {
								console.log("Capsule query error, sending Page Data 3:", err);
								var response = {
									status: 200,
									message: "Page Data 3",
									result: result
								}
								res.json(response);
							}
						}
					} catch (err) {
						console.log("CommonPageObj error:", err);
							var response = {
								status: 501,
								message: "Something went wrong.",
								error : err
							}
							res.json(response);
						}
				} else {
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
			} catch (err) {
				console.log("OwnerData error:", err);
					var response = {
						status: 501,
						message: "Something went wrong.",
						error : err
					}
					res.json(response);
				}
		} else {
			console.log("No page found with conditions:", conditions);
			var response = {
				status: 404,
				message: "Page not found"
			}
			res.json(response);
		}
	} catch (err) {
		console.log("getPageData Error:", err);
			var response = {
				status: 501,
			message: "Something went wrong."
			}
			res.json(response);
		}
}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		getPageLibrary
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var getPageLibrary = async function (req, res) {
	try {
		const limit = req.body.perPage ? req.body.perPage : 0;
		const offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
		
		const conditions = {
			$or: [
				{ CreaterId: req.session.user._id, Origin: "published" }, 
				{ OwnerId: req.session.user._id, Origin: "shared" }
			],
			IsDeleted: 0,
			PageType: { $in: ["gallery", "content"] },
			IsDasheditpage: false,
		};

		if (req.body.chapterCheck) {
			conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
		}

		const sortObj = {
			UpdatedOn: -1
		};

		if (req.body.sortBy) {
			const sortObjBy = req.body.sortBy;
			if (sortObjBy == "Title") {
				sortObj.Title = -1;
				delete sortObj.UpdatedOn;
			} else if (sortObjBy == "CreatedOn") {
				sortObj.CreatedOn = -1;
				delete sortObj.UpdatedOn;
			} else if (sortObjBy == "UpdatedOn") {
				sortObj.UpdatedOn = -1;
			} else if (sortObjBy == "CreatedOnAsc") {
				sortObj.CreatedOn = 1;
				delete sortObj.UpdatedOn;
			} else if (sortObjBy == "UpdatedOnAsc") {
				sortObj.UpdatedOn = 1;
			} else if (sortObjBy == "TitleAsc") {
				sortObj.Title = 1;
				delete sortObj.UpdatedOn;
			}
		}

		// Exclude old viewport data and large fields
		const fields = {
			SelectedMedia: 0,
			SelectedKeywords: 0,
			SelectedFilters: 0,
			SelectedGts: 0,
			AddAnotherGts: 0,
			ExcludedGts: 0,
			UploadedMedia: 0,
			Medias: 0,
			CommonParams: 0,
			ViewportDesktopSections: 0,
			ViewportTabletSections: 0,
			ViewportMobileSections: 0
		};

		const results = await Page.find(conditions, fields)
			.skip(offset)
			.limit(limit)
			.populate('ChapterId')
			.sort(sortObj)
			.exec();
			
		const resultsLength = await Page.countDocuments(conditions).exec();

		const response = {
			count: resultsLength,
			status: 200,
			message: "Pages listing",
			results: results
		};
		res.json(response);
	} catch (err) {
		console.log(err);
		const response = {
			status: 500,
			message: "Something went wrong."
		};
		res.json(response);
	}
};

/*________________________________________________________________________
   * @Date:      		31 August 2015
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
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
		//Origin : "created",
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"}],
		CreaterId: req.session.user._id,
		//OwnerId : req.session.user._id,
		//$or : [{Origin : 'created'},{Origin : 'duplicated'},{Origin : 'addedFromLibrary'}],
		Origin: "published",
		IsDeleted: 0,
		PageType: { $in: ["gallery", "content"] }
	};

	if (req.body.chapterCheck) {
		conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
	}

	var sortObj = {
		//Order : 1,
		UpdatedOn: -1
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
		} else if (sortObjBy == "UpdatedOn") {
			sortObj = {
				//Order : 1,
				UpdatedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "UpdatedOnAsc") {
			sortObj = {
				//Order : 1,
				UpdatedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}
	var fields = {};

	Page.find(conditions, fields).skip(offset).limit(limit).populate('ChapterId').sort(sortObj).exec(function (err, results) {
		if (!err) {
			Page.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Pages listing",
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
   * @Date:      		31 August 2015
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
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
		//CreaterId : req.session.user._id, 
		Origin: 'shared',
		CreaterId: { $ne: req.session.user._id },
		OwnerId: req.session.user._id,
		IsDeleted: 0
	};

	if (req.body.chapterCheck) {
		conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
	}

	var sortObj = {
		//Order : 1,
		UpdatedOn: -1
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
		} else if (sortObjBy == "UpdatedOn") {
			sortObj = {
				//Order : 1,
				UpdatedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "UpdatedOnAsc") {
			sortObj = {
				//Order : 1,
				UpdatedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}
	var fields = {
		SelectedMedia: 0,
		SelectedKeywords: 0,
		SelectedFilters: 0,
		SelectedGts: 0,
		AddAnotherGts: 0,
		ExcludedGts: 0,
		UploadedMedia: 0,
		Medias: 0,
		CommonParams: 0,
		ViewportDesktopSections: 0,
		ViewportTabletSections: 0,
		ViewportMobileSections: 0
	};

	Page.find(conditions, fields).skip(offset).limit(limit).populate('ChapterId').sort(sortObj).exec(function (err, results) {
		if (!err) {
			Page.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Pages listing",
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
   * @Date:      		31 August 2015
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
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0, 
		CreaterId: req.session.user._id,
		OwnerId: req.session.user._id,
		Origin: 'byTheHouse',
		IsDeleted: 0,
		PageType: { $in: ["gallery", "content"] }
	};

	if (req.body.chapterCheck) {
		conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
	}

	var sortObj = {
		//Order : 1,
		UpdatedOn: -1
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
		} else if (sortObjBy == "UpdatedOn") {
			sortObj = {
				//Order : 1,
				UpdatedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "UpdatedOnAsc") {
			sortObj = {
				//Order : 1,
				UpdatedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}
	var fields = {
		SelectedMedia: 0,
		SelectedKeywords: 0,
		SelectedFilters: 0,
		SelectedGts: 0,
		AddAnotherGts: 0,
		ExcludedGts: 0,
		UploadedMedia: 0,
		Medias: 0,
		CommonParams: 0,
		ViewportDesktopSections: 0,
		ViewportTabletSections: 0,
		ViewportMobileSections: 0
	};

	Page.find(conditions, fields).skip(offset).limit(limit).populate('ChapterId').sort(sortObj).exec(function (err, results) {
		if (!err) {
			Page.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Pages listing",
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
   * @Method :   		findAll
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var findAll = async function (req, res) {
	var conditions = {};
	
	// Support both header and query param for chapter_id
	const chapterId = req.headers.chapter_id || req.query.chapter_id;
	
	var edit_mode = req.query.edit_mode ? req.query.edit_mode : "before_publish";
	if (edit_mode == "after_publish") {
		//console.log("IF   -------edit_mode-------",edit_mode);return;
		conditions = {
			//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"},{Origin : "published"}],
			Origin: "publishNewChanges",
			ChapterId: chapterId ? chapterId : 0,
			OwnerId: req.session.user._id,
			IsDeleted: 0,
			//IsDasheditpage:{$exists:true, IsDasheditpage: {$eq:true}}
			IsDasheditpage: true,
			PageType: { $in: ["gallery", "content", "qaw-gallery"] }
		};
	}
	else if (edit_mode == "view_mode") {
		//console.log("IF   -------edit_mode-------",edit_mode);return;
		conditions = {
			//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"},{Origin : "published"}],
			//Origin : "published",
			//Origin : {$ne:"publishNewChanges"},
			ChapterId: chapterId ? chapterId : 0,
			//OwnerId : req.session.user._id,
			IsDeleted: 0,
			//IsDasheditpage:{$exists:true, IsDasheditpage: {$eq:true}}
			IsDasheditpage: { $ne: true },
			PageType: { $in: ["gallery", "content", "qaw-gallery"] }
		};
	}
	else {
		//console.log("ELSE----------   -------edit_mode-------",edit_mode);return;
		conditions = {
			$or: [
				{ Origin: "created", CreaterId: req.session.user._id },
				{ Origin: "duplicated", CreaterId: req.session.user._id },
				{ Origin: "addedFromLibrary", CreaterId: req.session.user._id },
				{ Origin: "created", OwnerId: req.session.user._id },
				{ Origin: "duplicated", OwnerId: req.session.user._id },
				{ Origin: "addedFromLibrary", OwnerId: req.session.user._id }
			],
			ChapterId: chapterId ? chapterId : 0,
			//IsDasheditpage: { $exists: false},
			//IsLaunched : false,
			IsDeleted: 0,
			PageType: { $in: ["gallery", "content", "qaw-gallery"] }
		};
	}

	var sortObj = {
		Order: 1
	};

	var fields = {
		SelectedMedia: 0,
		SelectedKeywords: 0,
		SelectedFilters: 0,
		SelectedGts: 0,
		AddAnotherGts: 0,
		ExcludedGts: 0,
		UploadedMedia: 0,
		Medias: 0,
		CommonParams: 0,
		ViewportTabletSections: 0,
		ViewportMobileSections: 0
	};
	var dontSelect__ChaperFields = {
		'ChapterPlaylist': 0
	};

	try {
		const results = await Page.find(conditions, fields).populate({ path: "ViewportDesktopSections.Widgets.QAWidObj.PageId", select: { "Title": 1 } }).populate({ path: 'ChapterId', select: dontSelect__ChaperFields }).sort(sortObj).lean();
		
		if (results) {
			var rs = [];
			results.forEach(function (item, index) {
				var show_left_title = false;
				var left_title = item.Title;
				var left_page_id = item._id;
				if (item.ViewportDesktopSections && item.ViewportDesktopSections.Widgets) {
					item.ViewportDesktopSections.Widgets.forEach(function (witem, ind) {
						if (witem.QAWidObj && witem.QAWidObj.PageId) {
							show_left_title = true;
							left_title = JSON.parse(JSON.stringify(witem.QAWidObj.PageId)).Title;
							left_page_id = JSON.parse(JSON.stringify(witem.QAWidObj.PageId))._id;
						}
					})

				}
				if (item.PageType == "gallery") {
					show_left_title = true;
				}

				item = Object.assign(item, { 'show_left_title': show_left_title, 'left_title': left_title , 'left_page_id' : left_page_id });

				delete item.ViewportDesktopSections;

				rs.push(item);

			})

			var response = {
				status: 200,
				message: "Pages listing1111111111",
				results: results,
				data: rs
			}
			res.json(response);
		} else {
			var response = {
				status: 501,
				message: "Something went wrong."
		}
			res.json(response);
		}
	} catch (err) {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		getAllPages - For Preview
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR"
_________________________________________________________________________
*/

var getAllPages = async function (req, res) {
	var conditions = {
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"},{Origin : "createdForMe"},{Origin : "shared"}],
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		//OwnerId : req.session.user._id,
		IsDeleted: 0,
		PageType: { $in: ["gallery", "content"] }
	};
	var sortObj = {
		Order: 1,
		UpdatedOn: -1
	};

	//var fields = {}; 
	var fields = {
		SelectedMedia: 0,
		SelectedKeywords: 0,
		SelectedFilters: 0,
		SelectedGts: 0,
		AddAnotherGts: 0,
		ExcludedGts: 0,
		UploadedMedia: 0,
		Medias: 0,
		CommonParams: 0,
		ViewportDesktopSections: 0,
		ViewportTabletSections: 0,
		ViewportMobileSections: 0
	};

	try {
		const results = await Page.find(conditions, fields).populate('ChapterId').sort(sortObj);
		
		if (results) {
			var response = {
				status: 200,
				message: "Pages listing",
				results: results
			}
			res.json(response);
		} else {
			var response = {
				status: 501,
				message: "Something went wrong."
		}
			res.json(response);
		}
	} catch (err) {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
}


/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		create
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.header.chapter_id) + PE (req.header.page_id)"
_________________________________________________________________________
*/

const create = async (req, res) => {
	try {
		const pageType = req.body.page_type ? req.body.page_type : "";
		
		switch (pageType) {
			case "gallery":
				await SearchGalleryPage.create(req, res);
				break;

			case "content":
				await ContentPage.create(req, res);
				break;

			case "qaw-gallery":
				await ContentPage.create_QawGallery(req, res);
				break;

			default:
				const response = {
					status: 400,
					message: "Invalid page_type. Must be 'gallery', 'content', or 'qaw-gallery'."
				};
				res.json(response);
		}
	} catch (error) {
		console.log("Error in page create:", error);
		const response = {
			status: 501,
			message: "Something went wrong."
		};
		res.json(response);
	}
};

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		duplicate
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.headers.chapter_id) + PE (req.header.page_id)"
_________________________________________________________________________
*/

const duplicate = async function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	var fields = {
		Title: 1,
		TitleInvitees: 1,
		PageType: 1,
		HeaderImage: 1,
		BackgroundMusic: 1,
		CommonParams: 1,
		ViewportDesktopSections: 1,
		ViewportTabletSections: 1,
		ViewportMobileSections: 1,
		SelectedMedia: 1,
		SelectedCriteria: 1,
		HeaderBlurValue: 1,
		HeaderTransparencyValue: 1
	};

	conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	// Handle both boolean and numeric IsDeleted values since schemas use mixed types
	conditions.$or = [
		{ IsDeleted: false },
		{ IsDeleted: 0 }
	];

	try {
		const result = await Page.findOne(conditions, fields);
		
		if (!result) {
			return res.json({
				status: 404,
				message: "Page not found."
			});
		}

			var data = {};
		data.Origin = "duplicated";
				data.OriginatedFrom = req.headers.page_id;

		// Hardcoded user ID for testing (bypassing session)
		data.CreaterId = "68a733773931522f1b7f4632";
		data.OwnerId = "68a733773931522f1b7f4632";
			data.ChapterId = req.headers.chapter_id;
			data.Title = result.Title ? result.Title : "Untitled Page";
			data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : data.Title;
			data.PageType = result.PageType;
			data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
			data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
			data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
			data.SelectedCriteria = result.SelectedCriteria;
			data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
			data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
			//return;
			data.CreatedOn = Date.now();
			data.UpdatedOn = Date.now();

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
								Medias: 0
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
						Page(data).save().then(function (result) {
								var response = {
									status: 200,
									message: "Page duplicated successfully.",
									result: result,
									finalObj: finalObj,
									sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
								}
								res.json(response);
						}).catch(function (err) {
								console.log(err);
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
						});
					});
			}
			else {
				console.log("data = ", data);
				Page(data).save().then(function (result) {
						var response = {
							status: 200,
							message: "Page duplicated successfully.",
							result: result,
							finalObj: finalObj,
							sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
						}
						res.json(response);
				}).catch(function (err) {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
				});
			}
		} catch (err) {
			console.log("Error in duplicate function:", err);
			var response = {
				status: 500,
				message: "Something went wrong.",
				error: err.message
			}
			res.json(response);
		}
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		remove
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR (req.header.chapter_id)"
_________________________________________________________________________
*/

var remove = async function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 
	try {
		const data = {};
		const query = {};

	query._id = req.headers.page_id;
		const chapterId = req.headers.chapter_id;
	data.IsDeleted = 1;
	data.UpdatedOn = Date.now();
		
		const result = await Page.updateOne(query, { $set: data });
		
			//console.log("result = ",result);return;
		const response = {
				status: 200,
				message: "Page deleted successfully.",
				result: result
			}
		await pullPageId(chapterId, query._id)
			res.json(response);
		}
	catch (err) {
			console.log(err);
		const response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
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

var reorder = async function (req, res) {
	try {
		var pageIds = req.body.page_ids ? req.body.page_ids : [];

		if (!pageIds.length) {
			return res.json({
				status: 501,
				message: "No page IDs provided.",
			});
		}

		// Update all pages in parallel
		const updatePromises = pageIds.map((pageId, index) => {
			return Page.findByIdAndUpdate(
				pageId,
				{ Order: index + 1 },
				{ new: true }
			);
		});

		const updatedPages = await Promise.all(updatePromises);

		// Update chapter's default thumbnail if first page changed
		if (updatedPages.length > 0 && updatedPages[0]) {
			const firstPage = updatedPages[0];
			if (firstPage.IsDasheditpage == false && firstPage.ChapterId && firstPage.HeaderImage) {
				__updateCoverArt__Chapter(firstPage.ChapterId, firstPage.HeaderImage);
			}
		}

		var response = {
			status: 200,
			message: "Pages reordered successfully.",
		};
		res.json(response);
	} catch (error) {
		console.log("Reorder error:", error);
		var response = {
			status: 501,
			message: "Something went wrong.",
		};
		res.json(response);
	}
};

var reorder_V2 = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var pageIds = req.body.page_ids || req.body.pageOrder || [];
	console.log("pageIds = ", pageIds);
	
	if (pageIds.length === 0) {
		var response = {
			status: 400,
			message: "No page IDs provided for reordering. Please provide 'page_ids' or 'pageOrder' in request body."
		}
		return res.json(response);
	}

	var completedCount = 0;
	var errorOccurred = false;
	var totalPages = pageIds.length;

	function findAndUpdate(conditions, order) {
		Page.findOne(conditions).then(function (result) {
			if (!result) {
				console.log("Page not found for conditions:", conditions);
				errorOccurred = true;
				completedCount++;
				checkCompletion();
				return;
			}

				result.Order = order;
			console.log("Updating page order:", result._id, "to order:", order);

			Page.updateOne(conditions, { $set: { Order: order } }).then(function (updateResult) {
				console.log("Reordered page:", result._id, "numAffected:", updateResult.modifiedCount);
				
				//update chapter's default thumbanil - if chapter is not launched yet...
				if (result.IsDasheditpage == false && order == 1) {
					var ChapID = result.ChapterId;
					__updateCoverArt__Chapter(ChapID, result.HeaderImage);	//no return ---- no wait ...
				}
				
				completedCount++;
				checkCompletion();
			}).catch(function (err) {
				console.log("Error updating page order:", err);
				errorOccurred = true;
				completedCount++;
				checkCompletion();
			});
		}).catch(function (err) {
			console.log("Error finding page:", err);
			errorOccurred = true;
			completedCount++;
			checkCompletion();
		});
	}

	function checkCompletion() {
		if (completedCount === totalPages) {
			if (errorOccurred) {
				var response = {
					status: 501,
					message: "Some pages failed to reorder. Please try again."
				}
				res.json(response);
			} else {
		var response = {
			status: 200,
			message: "Pages reordered successfully."
		}
		res.json(response);
			}
		}
	}

	// Start processing all pages
	for (var loop = 0; loop < pageIds.length; loop++) {
		var pageId = pageIds[loop];
		var conditions = {};
		conditions._id = pageId;
		console.log("Processing page:", pageId, "for order:", loop + 1);
		findAndUpdate(conditions, loop + 1);
	}
}



//Page library Apis

/*________________________________________________________________________
   * @Date:      		31 August 2015
   * @Method :   		addFromLibrary
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + PE"
_________________________________________________________________________
*/

var addFromLibrary = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};

	var fields = {
		Title: true,
		TitleInvitees: true,
		PageType: true,
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

	conditions._id = req.headers.page_id;
	conditions.IsDeleted = 0;

	console.log("conditions ============", conditions);
	Page.findOne(conditions, fields, function (err, result) {
		if (!err) {
			var data = {};
			data.Origin = "addedFromLibrary";
			data.OriginatedFrom = req.headers.page_id;

			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.ChapterId = req.headers.chapter_id;
			data.Title = result.Title ? result.Title : "Untitled Page";
			data.TitleInvitees = result.TitleInvitees ? result.TitleInvitees : data.Title;
			data.PageType = result.PageType;
			data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
			data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
			data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
			data.SelectedCriteria = result.SelectedCriteria;
			data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
			data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
			data.CreatedOn = Date.now();
			data.UpdatedOn = Date.now();

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
								var response = {
									status: 200,
									message: "A new instance of the page has been added from library.",
									result: result,
									finalObj: finalObj,
									sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
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
					});
			}
			else {
				console.log("data = ", data);
				Page(data).save(function (err, result) {
					if (!err) {
						var response = {
							status: 200,
							message: "A new instance of the page has been added from library.",
							result: result,
							finalObj: finalObj,
							sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
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
			/*
			console.log("data = ",data);
			Page(data).save(function( err , result ){
				if( !err ){
					var response = {
						status: 200,
						message: "A new instance of the page has been added from library.",
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
			*/
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
   * @Method :   		preview
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var preview = async function (req, res) {
	try {
		const query = {};
		const fields = {};
	query._id = req.headers.chapter_id;

		const result = await Page.findOne(query, fields);

		const response = {
				status: 200,
				message: "Chapter added successfully.",
				result: result
			}
			res.json(response);
		}
	catch (err) {
			console.log(err);
		const response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
}

/*________________________________________________________________________
   * @Date:      		17 June 2015
   * @Method :   		share
   * Created By: 		smartData Enterprises Ltd
   * Modified On:		-
   * @Purpose:   	
   * @Param:     		2
   * @Return:    	 	yes
   * @Access Category:	"UR + CR"
_________________________________________________________________________
*/

var share = async function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	
	// Debug logging
	console.log("Share function called with body:", req.body);
	console.log("Share function called with headers:", req.headers);
	
	var conditions = {};
	var fields = {
		Title: true,
		PageType: true,
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

	//conditions.ChapterId = req.headers.chapter_id;
	conditions._id = req.headers.page_id;
	conditions.IsDeleted = 0;

	try {
		const result = await Page.findOne(conditions, fields);
		if (!result) {
			var response = {
				status: 501,
				message: "Page not found."
			}
			return res.json(response);
		}

			var shareWithEmail = req.body.share_with_email ? req.body.share_with_email : false;
			var shareWithName = req.body.share_with_name ? req.body.share_with_name : '';
		
		console.log("shareWithEmail:", shareWithEmail);
		console.log("shareWithName:", shareWithName);

			if (shareWithEmail) {
				var conditions = {};
				conditions.Email = shareWithEmail;

				var fields = {
					Email: true
				};

			try {
				const UserData = await User.find(conditions, fields);

						var data = {};
						data.Origin = "shared",
							data.OriginatedFrom = req.headers.page_id;

				// Using specific user ID for testing
				data.CreaterId = "68a733773931522f1b7f4632";

						if (!UserData.length) {
							//Non-Registered user case
					data.OwnerId = "68a733773931522f1b7f4632";
					data.OwnerEmail = "test@example.com";
						}
						else {
							data.OwnerId = UserData[0]._id;
							data.OwnerEmail = UserData[0].Email;
						}

						data.Title = result.Title ? result.Title : "Untitled Page";
						data.PageType = result.PageType;
						data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
						data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
						data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
						data.SelectedCriteria = result.SelectedCriteria;
						data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
						data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;
						data.CreatedOn = Date.now();
						data.UpdatedOn = Date.now();

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
							var HiddenBoardId = widObj.QAWidObj.PageId ? widObj.QAWidObj.PageId : 'SOMETHING__WRONG';
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
					try {
						const results = await async.series({
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
						});

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
					} catch (err) {
										console.log("**************************************************DB ERROR :", err);
									}

					try {
						const result = await Page(data).save();
											var response = {
												status: 200,
												message: "Page shared successfully.",
												result: result
											}
											res.json(response);

											var condition = {};
											condition.name = "Share__Page";

						try {
							const results = await EmailTemplate.find(condition, {});
													if (results.length) {

														var RecipientName = shareWithName ? shareWithName : '';
								try {
									const userData = await User.find({ 'Email': shareWithEmail }, { 'Name': true });
									if (userData.length > 0) {
										var userName = userData[0].Name ? userData[0].Name.split(' ') : "";
										RecipientName = userName[0];
									}
									// Temporarily commented out session dependencies for testing
									var SharedByUserName = "Test User"; // req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";

															var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
															newHtml = newHtml.replace(/{PageName}/g, data.Title);
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
															var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);

															var to = shareWithEmail;
															results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
															var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

															var mailOptions = {
																//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
																from: process.EMAIL_ENGINE.info.senderLine,
																to: to, // list of receivers
										subject: subject != '' ? subject : 'Scrpt - Test User has shared a Page with you!',
																text: process.HOST_URL + '/#/login',
																html: newHtml
															};

															transporter.sendMail(mailOptions, function (error, info) {
																if (error) {
																	console.log(error);
																} else {
																	console.log('Message sent to: ' + to + info.response);
																}
															});
								} catch (err) {
									console.log("Error finding user name:", err);
													}
												}
						} catch (err) {
							console.log("Error finding email template:", err);
										}

					} catch (err) {
											console.log(err);
											var response = {
												status: 501,
												message: "Something went wrong."
											}
											res.json(response);
										}
						}
						else {
					try {
						const result = await Page(data).save();
									var response = {
										status: 200,
										message: "Page shared successfully.",
										result: result
									}
									res.json(response);

									var condition = {};
									condition.name = "Share__Page"

						try {
							const results = await EmailTemplate.find(condition, {});
											if (results.length) {

												var RecipientName = shareWithName ? shareWithName : '';
								try {
									const userData = await User.find({ 'Email': shareWithEmail }, { 'Name': true });
									if (userData.length > 0) {
										var userName = userData[0].Name ? userData[0].Name.split(' ') : "";
										RecipientName = userName[0];
									}
									// Temporarily commented out session dependencies for testing
									var SharedByUserName = "Test User"; // req.session.user.Name ? req.session.user.Name.split(' ')[0] : "";
													var newHtml = results[0].description.replace(/{SharedByUserName}/g, SharedByUserName);
													newHtml = newHtml.replace(/{PageName}/g, data.Title);
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
													var to = shareWithEmail;
													results[0].subject = typeof (results[0].subject) == 'string' ? results[0].subject : '';
													var subject = results[0].subject.replace(/{SharedByUserName}/g, SharedByUserName);

													var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
													var mailOptions = {
														//from: 'Scrpt <collabmedia.scrpt@gmail.com>', // sender address
														from: process.EMAIL_ENGINE.info.senderLine,
														to: to, // list of receivers
										subject: subject != '' ? subject : 'Scrpt - Test User has shared a page with you!',
														text: process.HOST_URL + '/#/login',
														html: newHtml
													};

													transporter.sendMail(mailOptions, function (error, info) {
														if (error) {
															console.log(error);
														} else {
															console.log('Message sent to: ' + to + info.response);
														}
													});
								} catch (err) {
									console.log("Error finding user name:", err);
											}
										}
						} catch (err) {
							console.log("Error finding email template:", err);
								}

					} catch (err) {
									console.log(err);
									var response = {
										status: 501,
										message: "Something went wrong."
									}
									res.json(response);
								}
						}
			} catch (err) {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}

			}
			else {
			console.log("No share email provided");
				var response = {
					status: 501,
				message: "Share email is required."
				}
				res.json(response);
			}
	} catch (err) {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
}

var findAll_dashedit = function (req, res) {
	//console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.i am here');return

	var conditions = {
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"},{Origin : "published"}],
		Origin: "publishNewChanges",
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		OwnerId: req.session.user._id,
		IsDeleted: 0,
		//IsDasheditpage:{$exists:true, IsDasheditpage: {$eq:true}}
		IsDasheditpage: true,
		PageType: { $in: ["gallery", "content"] }
	};
	var conditionsforInitialCase = {
		$or: [{ Origin: "created" }, { Origin: "duplicated" }, { Origin: "addedFromLibrary" }, { Origin: "published" }],
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		OwnerId: req.session.user._id,
		IsDeleted: 0,
		PageType: { $in: ["gallery", "content"] }
	}
	var sortObj = {
		Order: 1
	};

	var fields = {
		_id: true,
		PageType: true
	};
	//console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",conditions);return
	Page.find(conditions).populate('ChapterId').sort(sortObj).exec(function (err, results) {
		if (!err) {
			if (results.length) {
				//console.log("theeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
				var response = {
					status: 200,
					message: "Pages listing",
					results: results
				}
				res.json(response);
			} else {
				Page.find(conditionsforInitialCase).populate('ChapterId').sort(sortObj).exec(function (err, resultz) {
					if (!err) {
						var pageCreatedCount = createDashEditCopy(resultz, conditions.ChapterId, conditions.OwnerId);
						console.log("pagecount55555555555555555555555555555555555555555555555555555", pageCreatedCount);
						if (pageCreatedCount) {
							setTimeout(function () {
								Page.find(conditions).populate('ChapterId').sort(sortObj).exec(function (err, results) {
									if (!err) {
										var response = {
											status: 200,
											message: "Pages listing",
											results: results
										}
										res.json(response);
									} else {
										console.log(err);
										var response = {
											status: 501,
											message: "Something very went wrong."
										}
										res.json(response);
									}

								});
							}, 1000);
						} else {
							console.log("no page counttttttttttttttttttttttttttttttttttttttttttttttttttttt");//return	
						}
					} else {
						console.log(err);
						var response = {
							status: 501,
							message: "Something very went wrong."
						}
						res.json(response);
					}

				});
				//console.log("00000000000000000000000000000000000000000000000000000000000000");return
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

var createDashEditCopy = function (pages, ChapterId, OwnerId) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check
	var countPages = 0;
	var pageId = '';
	//console.log("-----------------------------------page are--------------------------------",pages.length);return
	for (var i = 0; i < pages.length; i++) {

		//console.log("theeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",pages[i]);return

		var conditions = {};
		var fields = {};

		conditions.ChapterId = ChapterId;
		conditions._id = pages[i]._id;
		//pageId = pages[i]._id;
		conditions.IsDeleted = 0;

		Page.findOne(conditions, fields, function (err, result) {
			if (!err) {
				//console.log("77777777777777788888888888888888888888888888888888888888888------------",result);return;
				var data = {};
				//delete result._id;

				data = result.toObject();
				delete data._id;		//so that new id will be created automartically

				data.UpdatedOn = Date.now();

				data.OriginatedFrom = result._id;
				data.Origin = "publishNewChanges";

				data.IsDasheditpage = true;

				data.IsLaunched = false;
				//data._id = null;

				console.log("data------------------------------------------->>>>>>>", data);//return;
				Page(data).save(function (err, result) {
					if (!err) {
						var response = {
							status: 200,
							message: "Page duplicated successfully.",
							result: result
						}
						//res.json(response);
					}
					else {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						//res.json(response);
					}
				});
			}
			else {
				console.log(err);
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				//res.json(response);
			}
		})
		countPages++;
	}
	return countPages;


}


var publishNewUpdates_dashedit = function (req, res) {
	//console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++');return
	var fields = {
		IsDasheditpage: true
	}
	var sortObj = {
		Order: 1,
		UpdatedOn: -1
	};

	var conditions = {
		Origin: "publishNewChanges",
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		OwnerId: req.session.user._id,
		//IsDeleted : 1,
		//IsDasheditpage:{$exists:true, IsDasheditpage: {$eq:true}}
		IsDasheditpage: true,
		PageType: { $in: ["gallery", "content"] }
	};
	var pageCheckCout = 0;

	Page.find(conditions).populate('ChapterId').sort(sortObj).exec(function (err, result) {
		//console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',result);return
		if (!err) {
			for (var i = 0; i < result.length; i++) {
				//console.log(result[i]._id,'--------------------------------------------',result[i].OriginatedFrom);return


				var data = {};
				//delete result._id;

				data = result[i].toObject();

				var dashEditInstance__id = false;
				var IsAutoNameFilterApplied = false;

				//AUTO NAME REPLACE FILTER
				/*
				if(data.PageType == "gallery"){
					var UserData = req.session.user ? req.session.user : {};
					var OwnerGender = UserData.Gender ? UserData.Gender : "male";
					var OwnerName = UserData.Name ? UserData.Name : "Manish Podiyal";
					var str = data.Title;
					var resStr = str;
					if( OwnerGender == 'male' ){
						resStr = resStr.replace(/\bJack\b/g, OwnerName);
						resStr = resStr.replace(/\bJill\b/g, OwnerName);
						resStr = resStr.replace(/\bShe\b/g, "He");
						resStr = resStr.replace(/\bshe\b/g, "he");
						resStr = resStr.replace(/\bher\b/g, "his");
						resStr = resStr.replace(/\bHer\b/g, "His");
						resStr = resStr.replace(/\bherself\b/g, "himself");
						resStr = resStr.replace(/\bHerself\b/g, "Himself");
					}
					else{
						resStr = resStr.replace(/\bJack\b/g, OwnerName);
						resStr = resStr.replace(/\bJill\b/g, OwnerName);
						resStr = resStr.replace(/\bHe\b/g, "She");
						resStr = resStr.replace(/\bhe\b/g, "she");
						resStr = resStr.replace(/\bhis\b/g, "her");
						resStr = resStr.replace(/\bHis\b/g, "Her");
						resStr = resStr.replace(/\bhim\b/g, "her");
						resStr = resStr.replace(/\bHim\b/g, "Her");
						resStr = resStr.replace(/\bhimself\b/g, "herself");
						resStr = resStr.replace(/\bHimself\b/g, "Herself");
					}
					
					if(data.Title != resStr){		//if at last both are different It means AutoNameFilterApplied;
						IsAutoNameFilterApplied = true;
						dashEditInstance__id = data._id;
					}
					
					data.Title = resStr;
				}
				*/

				if (i == 0) {
					data.ChapterId = data.ChapterId ? data.ChapterId : {};
					var ChapID = data.ChapterId._id ? data.ChapterId._id : 0;

					__updateCoverArt__Chapter(ChapID, data.HeaderImage);	//no return ---- no wait ...
					var CapID = data.ChapterId.CapsuleId ? data.ChapterId.CapsuleId : false;
					AppController.__capsule_touchUpdateFlag(CapID);
				}

				delete data._id;		//so that new id will be created automartically
				delete data.OriginatedFrom;
				delete data.CreaterId;
				delete data.OwnerId;
				delete data.ChapterId;
				delete data.PageType;
				delete data.IsDasheditpage;
				delete data.IsLaunched;
				delete data.CreatedOn;
				delete data.Status;
				delete data.Order;
				delete data.Origin;
				delete data.Medias;
				//data.UpdatedOn = Date.now();





				/*data._id = null;
				
				var data = {};
				
				data.Title = result[i].Title ? result[i].Title : "Untitled Page";
				data.PageType = result[i].PageType;
				data.HeaderImage = result[i].HeaderImage?result[i].HeaderImage:"";
				data.BackgroundMusic = result[i].BackgroundMusic ? result[i].BackgroundMusic : "";
				
				if(data.PageType == "content"){
				    data.CommonParams = result[i].CommonParams ? result[i].CommonParams : {};
				    data.ViewportDesktopSections = result[i].ViewportDesktopSections ? result[i].ViewportDesktopSections : {};
				    data.ViewportTabletSections = result[i].ViewportTabletSections ? result[i].ViewportTabletSections : {};
				    data.ViewportMobileSections = result[i].ViewportMobileSections ? result[i].ViewportMobileSections : {};
				}*/


				//console.log("data << -----------> ",data);return
				var conditionsToUpdate = {
					_id: result[i].OriginatedFrom,
					//Origin : {$ne : "publishNewChanges"},
					ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
					OwnerId: req.session.user._id,
					PageType: { $in: ["gallery", "content"] }//,
					//IsDeleted : false
				};
				Page.update(conditionsToUpdate, { $set: data }, { multi: false }, function (err, result) {
					if (!err) {
						//console.log("YOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO");
						var response = {
							status: 200,
							message: "Page name updated successfully.",
							result: result
						}
						//res.json(response);
					}
					else {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						//res.json(response);
					}
				});
				if (IsAutoNameFilterApplied != false) {
					Page.update({ _id: dashEditInstance__id }, { $set: { Title: data.Title } }, function (err, DEDITInstResult) {
						if (!err) {
							console.log("DEDITInstResult done!");
						}
					});
				}
				pageCheckCout++;
			}

			if (pageCheckCout == result.length) {
				var responseNewPublish = {
					status: 200,
					message: "New changes has been published successfully.",
				}
				res.json(responseNewPublish);
			}
		} else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

function __updateCoverArt__Chapter(ChapID, HeaderImage) {
	console.log("ChapID-------------------------", ChapID);
	console.log("HeaderImage-------------------------", HeaderImage);
	var HeaderImage = HeaderImage ? HeaderImage : null;
	if (ChapID) {
		var conditions = {
			_id: ChapID
		};
		var fields = {};
		if (HeaderImage != null) {
			console.log("IFFFFFFFFF-----------------------------------------HeaderImage-------------------------", HeaderImage);
			var imgUrl = HeaderImage;
			var mediaCenterPath = "/../../public/assets/Media/covers/";
			var srcPath = __dirname + '/../../public/assets/Media/headers/aspectfit/' + imgUrl;
			var fs = require('fs');
			if (fs.existsSync(srcPath)) {
				var mediaController = require('./../controllers/mediaController.js');

				Chapter.find(conditions, fields).then(function (data) {
						console.log("data----------------------------------------------------------------------", data);
						if (data.length) {
							var ChapData = data[0];
							ChapData.CoverArtFirstPage = HeaderImage;
							//if( !ChapData.CoverArt ){
							//ChapData.CoverArt = HeaderImage;
							//}
							//create the required thumbnails ...
							var dstPathCrop_300 = __dirname + mediaCenterPath + process.urls.small__thumbnail + "/" + imgUrl;
							var dstPathCrop_600 = __dirname + mediaCenterPath + process.urls.medium__thumbnail + "/" + imgUrl;
							var dstPathCrop_SMALL = __dirname + mediaCenterPath + 'small' + "/" + imgUrl;
							var dstPathCrop_MEDIUM = __dirname + mediaCenterPath + 'medium' + "/" + imgUrl;
							mediaController.crop_image(srcPath, dstPathCrop_300, 100, 100);
							mediaController.crop_image(srcPath, dstPathCrop_600, 600, 600);
							mediaController.crop_image(srcPath, dstPathCrop_SMALL, 155, 121);
							mediaController.crop_image(srcPath, dstPathCrop_MEDIUM, 262, 162);

						Chapter.updateOne(conditions, { $set: { "CoverArtFirstPage": HeaderImage, ModifiedOn: Date.now() } }).then(function (updatedData) {
							console.log("Chapter cover art updated successfully:", updatedData);
						}).catch(function (err) {
							console.log("ERROR updating chapter cover art:", err);
						});
					}
				}).catch(function (err) {
					console.log("ERROR2222------------------------------------------------------------------", err);
				});
			}
		}
		else {
			console.log("----------ELSE-----------------------------------------HeaderImage-------------------------", HeaderImage);
			Chapter.updateOne(conditions, { $set: { "CoverArtFirstPage": null, ModifiedOn: Date.now() } }).then(function (updatedData) {
				console.log("Chapter cover art cleared successfully:", updatedData);
			}).catch(function (err) {
				console.log("ERROR clearing chapter cover art:", err);
			});
		}
	}
}

var dashEditCreate = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 

	//separate functionality of Search Gallery page & Content page
	var pageType = req.body.page_type ? req.body.page_type : "";
	console.log("page create called..........");
	switch (pageType) {
		case "gallery":
			console.log("calling ----- SearchGalleryPage.create(req , res)");
			SearchGalleryPage.dashEditCreate(req, res);
			break;

		case "content":
			ContentPage.dashEditCreate(req, res);
			break;

		default:
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
	}
}

// To delete page id in chapter by arun sahani 20-05-2016
var pullPageId = async function (chapterId, pageId) {
	try {
		const mongoose = require('mongoose');
		const pageObjId = new mongoose.Types.ObjectId(pageId);
	//db.Capsules.update({"_id": ObjectId("573ea437217581540bb6acab")},
	//{$pull: {'Chapters': {$in: [ObjectId('573ea914689766de10851e96')]}}})

		const data1 = await Chapter.updateOne({ _id: chapterId }, { $pull: { 'pages': { $in: [pageObjId] } } });
		console.log("page pulled from chapter's pages[] successfully.");
	} catch (err) {
			console.log(err);
		}
}

// To restore the latest changes by arun sahani
var revertDashEditCopy = function (req, res) {
	//console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>.i am here');return

	var conditions = {
		//$or : [{Origin : "created"},{Origin : "duplicated"},{Origin : "addedFromLibrary"},{Origin : "published"}],
		Origin: "publishNewChanges",
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		OwnerId: req.session.user._id,
		IsDeleted: 0,
		//IsDasheditpage:{$exists:true, IsDasheditpage: {$eq:true}}
		IsDasheditpage: true,
		PageType: { $in: ["gallery", "content"] }
	};
	var conditionsforInitialCase = {
		$or: [{ Origin: "created" }, { Origin: "duplicated" }, { Origin: "addedFromLibrary" }, { Origin: "published" }],
		ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
		OwnerId: req.session.user._id,
		//IsDeleted : 0
		PageType: { $in: ["gallery", "content"] }
	}
	var sortObj = {
		Order: 1,
		UpdatedOn: -1
	};

	var fields = {
		_id: true
	};
	//console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",conditions);return
	Page.find(conditionsforInitialCase).sort(sortObj).exec(function (err, resultz) {
		if (!err) {

			var pageCreatedCount = revertEditCopy(resultz, conditions.ChapterId, conditions.OwnerId);
			//console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$4mailID",pageCreatedCount);	//return

			if (pageCreatedCount == resultz.length) {
				setTimeout(function () {
					Page.find(conditions).populate('ChapterId').sort(sortObj).exec(function (err, results) {
						if (!err) {
							var response = {
								status: 200,
								message: "Pages listing",
								results: results
							}
							res.json(response);
						} else {
							console.log(err);
							var response = {
								status: 501,
								message: "Something very went wrong."
							}
							res.json(response);
						}

					});
				}, 1000);
			} else {
				console.log("no page counttttttttttttttttttttttttttttttttttttttttttttttttttttt");//retur	
			}
		} else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something very went wrong."
			}
			res.json(response);
		}

	});
}

// Used in 'revertDashEditCopy' function by arun sahani
var revertEditCopy = function (pages, ChapterId, OwnerId) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check
	var countPages = 0;
	var pageId = '';
	//console.log("-----------------------------------page are--------------------------------",pages.length);return
	for (var i = 0; i < pages.length; i++) {

		var conditions = {};
		//var fields = {'_id':true};
		conditions.ChapterId = ChapterId;
		var mongoose = require('mongoose');

		conditions.OriginatedFrom = new mongoose.Types.ObjectId(pages[i]._id);
		conditions.Origin = "publishNewChanges",
			conditions.IsDasheditpage = true,
			conditions.IsDeleted = 0;


		var data = {};

		data = pages[i].toObject();
		data.OriginatedFrom = data._id;
		delete data._id;		//so that new id will be created automartically

		data.UpdatedOn = Date.now();
		data.Origin = "publishNewChanges";
		data.IsDasheditpage = true;
		data.IsLaunched = false;
		//console.log(conditions.OriginatedFrom,'------------------------------------------------------------',data);return

		Page.update(conditions, { $set: data }, { upsert: true }, function (err, result) {
			if (!err) {

				//code
			}
		});
		countPages++;
	}

	return countPages;


}
//  To add page from library in edit case

var addFromLibrary_dashEdit = function (req, res) {
	//check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check 
	var conditions = {};
	/*
	var fields = {
		Title : 1,
		PageType : 1,
		HeaderImage : 1
	};
	*/
	var fields = {
		Title: true,
		PageType: true,
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

	conditions._id = req.headers.page_id;
	conditions.IsDeleted = 0;
	console.log("conditions ============", conditions);
	Page.findOne(conditions, fields, function (err, result) {
		if (!err) {
			var data = {};
			data.Origin = "addedFromLibrary";
			data.OriginatedFrom = req.headers.page_id;

			data.CreaterId = req.session.user._id;
			data.OwnerId = req.session.user._id;
			data.ChapterId = req.headers.chapter_id;
			data.Title = result.Title ? result.Title : "Untitled Page";
			data.PageType = result.PageType;

			data.HeaderImage = result.HeaderImage ? result.HeaderImage : "";
			data.BackgroundMusic = result.BackgroundMusic ? result.BackgroundMusic : "";
			data.SelectedMedia = result.SelectedMedia ? result.SelectedMedia : [];
			data.SelectedCriteria = result.SelectedCriteria;
			data.HeaderBlurValue = result.HeaderBlurValue ? result.HeaderBlurValue : 0;
			data.HeaderTransparencyValue = result.HeaderTransparencyValue ? result.HeaderTransparencyValue : 0;

			data.IsDeleted = 1;
			data.CreatedOn = Date.now();
			data.UpdatedOn = Date.now();

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
								var data = {};
								data = result.toObject();
								delete data._id;		//so that new id will be created automartically
								delete data.IsDeleted;
								data.UpdatedOn = Date.now();
								data.OriginatedFrom = result._id;
								data.Origin = "publishNewChanges";
								data.IsDasheditpage = true;
								data.IsLaunched = false;
								data.IsDeleted = 0;

								Page(data).save(function (err, results) {
									if (!err) {
										var response = {
											status: 200,
											message: "A new instance of the page has been added from library..",
											result: results,
											finalObj: finalObj,
											sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
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
					});
			}
			else {
				console.log("data = ", data);
				Page(data).save(function (err, result) {
					if (!err) {
						var data = {};
						data = result.toObject();
						delete data._id;		//so that new id will be created automartically
						delete data.IsDeleted;
						data.UpdatedOn = Date.now();
						data.OriginatedFrom = result._id;
						data.Origin = "publishNewChanges";
						data.IsDasheditpage = true;
						data.IsLaunched = false;
						data.IsDeleted = 0;

						Page(data).save(function (err, results) {
							if (!err) {
								var response = {
									status: 200,
									message: "A new instance of the page has been added from library..",
									result: results,
									finalObj: finalObj,
									sourcePageId__DestinationPageId__Arr: sourcePageId__DestinationPageId__Arr
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
			/*
			console.log("data = ",data);
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
					data.IsDeleted = 0;
					
					Page(data).save(function( err , results ){
						if( !err ){
							var response = {
								status: 200,
								message: "A new instance of the page has been added from library..",
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
			*/
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

var changeHeaderBlurValue = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 

	var data = {};
	var query = {};

	query._id = req.body.pageId;
	data.HeaderBlurValue = req.body.blurValue;
	data.UpdatedOn = Date.now();
	Page.update(query, { $set: data }, function (err, result) {
		if (!err) {
			//console.log("result = ",result);return;
			var response = {
				status: 200,
				message: "BlurValue Changed successfully.",
				result: result,
				blurValue: req.body.blurValue
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
var changeTransparencyValue = function (req, res) {
	//check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check 

	var data = {};
	var query = {};

	query._id = req.body.pageId;
	data.HeaderTransparencyValue = req.body.transparencyValue;
	data.UpdatedOn = Date.now();
	Page.update(query, { $set: data }, function (err, result) {
		if (!err) {
			//console.log("result = ",result);return;
			var response = {
				status: 200,
				message: "Transparency Value Changed successfully.",
				result: result,
				transparencyValue: req.body.transparencyValue
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

var getPageLibrary__MyBoards = function (req, res) {
	var limit = req.body.perPage ? req.body.perPage : 0;
	var offset = req.body.pageNo ? ((req.body.pageNo - 1) * limit) : 0;
	var conditions = {
		//ChapterId : req.headers.chapter_id ? req.headers.chapter_id : 0,
		//Origin : {"$ne":"publishNewChanges"},
		Origin : {$ne : "journal"},			//added on 12 May 2018 for integrating journal module
		OwnerId: req.session.user._id,
		//IsDashEditPage : {$exists:false},
		IsDeleted: 0,
		IsDasheditpage: 0,
		PageType: { $in: ["gallery", "qaw-gallery"] }
	};

	if (req.body.chapterCheck) {
		conditions.ChapterId = req.body.chapterId ? req.body.chapterId : 0;
	}

	var sortObj = {
		//Order : 1,
		UpdatedOn: -1
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
		} else if (sortObjBy == "UpdatedOn") {
			sortObj = {
				//Order : 1,
				UpdatedOn: -1
			};
		} else if (sortObjBy == "CreatedOnAsc") {
			sortObj = {
				//Order : 1,
				CreatedOn: 1
			};
		} else if (sortObjBy == "UpdatedOnAsc") {
			sortObj = {
				//Order : 1,
				UpdatedOn: 1
			};
		} else if (sortObjBy == "TitleAsc") {
			sortObj = {
				//Order : 1,
				Title: 1
			};
		}
	}

	var fields = {
		SelectedMedia: false,
		SelectedKeywords: false,
		SelectedFilters: false,
		SelectedGts: false,
		AddAnotherGts: false,
		ExcludedGts: false,
		UploadedMedia: false,
		Medias: false,
		CommonParams: false,
		ViewportDesktopSections: false,
		ViewportTabletSections: false,
		ViewportMobileSections: false
	};

	Page.find(conditions, fields).skip(offset).limit(limit).populate('ChapterId').sort(sortObj).exec(function (err, results) {
		if (!err) {
			Page.find(conditions, fields).count().exec(function (errr, resultsLength) {
				if (!errr) {
					var response = {
						count: resultsLength,
						status: 200,
						message: "Pages listing",
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

function addPageVoiceOver(req, res, fileType) {

	//console.log(req.body.pageID);return

	fs = require('fs'),
		sys = require('sys'),
		exec = require('child_process').exec;

	var dir = process.urls.__PAGE_VOICEOVER_DIR;

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}

	var formidable = require('formidable');
	console.log('========================================= here =========================================')
	var form = new formidable.IncomingForm();
	form.keepExtensions = true;     //keep file extension
	form.uploadDir = dir; //(__dirname+"/../../playList_"+req.session.user._id);       //set upload directory

	var path = dir;
	var ffmetadata = require("ffmetadata");
	form.keepExtensions = true;     //keep file extension

	form.parse(req, function (err, fields, files) {
		var temp = files.file.name.split('.');
		console.log('*********************', fields.pageID);
		var tmpVar = fields.pageID ? fields.pageID : Date.now();

		var ext = temp.pop();
		var fileName = "voiceover_" + tmpVar + "." + ext;

		fs.rename(files.file.path, path + "/" + fileName, function (err) {
			if (err) {
				res.json(err);
			}
			else {
				Page.update({ '_id': fields.pageID }, { $set: { 'VoiceOverFile': fileName } }, function (err, result) {
					if (!err) {
						//console.log("result = ",result);return;
						var response = {
							status: 200,
							message: "Audio file has been added successfully.",
							result: result,
							src: fileName
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

				//res.json({'code': 200, msg: 'Audio file has been added successfully.'});   
				Audio__ConvertToMP3_N_OGG(fileName, path)
			}
		});
	});
}

function Audio__ConvertToMP3_N_OGG(inputFile, path) {
	if (inputFile) {
		var outputFile = '';
		var extension = '';
		extension = inputFile.split('.').pop();
		extensionUpper = extension.toUpperCase();

		switch (extensionUpper) {
			case 'OGG':
				outputFile = inputFile.replace('.' + extension, '.mp3');
				__convertAudio(inputFile, outputFile, path);
				break;

			case 'MP3':
				//no need to convert
				outputFile = inputFile.replace('.' + extension, '.ogg');
				__convertAudio(inputFile, outputFile, path);
				break;

			default:
				console.log("------Unknown extension found = ", extension);
				if (extension != '' && extension != null) {
					outputFile = inputFile.replace('.' + extension, '.ogg');
					__convertAudio(inputFile, outputFile, path);
				}
				break;
		}
	}
	return;
}


function __convertAudio(inputFile, outputFile, path) {

	var util = require('util'),
		exec = require('child_process').exec;

	var command = "ffmpeg -fflags +genpts -i " + path + '/' + inputFile + " -r 24 " + path + '/' + outputFile;

	exec(command, function (error, stdout, stderr) {
		if (stdout) console.log(stdout);
		if (stderr) console.log(stderr);

		if (error) {
			console.log('exec error: ' + error);
			//response.statusCode = 404;
			//response.end();

		} else {
			console.log("==========Successfully converted from " + inputFile + " to " + outputFile);
		}
	});

}

var deleteVoiceOver = function (req, res) {

	var data = {};
	var query = {};

	query._id = req.body.pageId;
	Page.update(query, { $unset: { 'VoiceOverFile': 1 } }, function (err, result) {
		if (!err) {
			//console.log("result = ",result);return;
			var response = {
				status: 200,
				message: "Voice over has been removed successfully.",
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

var editStatement = function (req, res) {
	var data = {};
	var query = {};
	//console.log(ownerObj);return
	var mediaID = req.body.MediaID ? req.body.MediaID : 0;   //this is actually postId not the mediaId ;)
	var Statement = req.body.Statement ? req.body.Statement : '';
	var query = { 'Medias._id': new mongoose.Types.ObjectId(mediaID) };
	var doc = {
		$set: { 'Medias.$.PostStatement': Statement }
	}

	Page.update(query, doc, function (err, result) {
		if (!err) {
			//console.log("result = ",result);return;
			var response = {
				status: 200,
				message: "Voice over has been removed successfully.",
				result: result,
				statement: Statement
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

var getCommunityPosts = function (req, res) {
	var mongoose = require('mongoose');

	var CurrentPageId = req.body.CurrentPageId ? req.body.CurrentPageId : 0;

	Page.findOne({ _id: new mongoose.Types.ObjectId(CurrentPageId) }, { OriginatedFrom: true }, function (err, data) {
		if (!err) {
			data = data ? data : {};
			var OriginatedFrom = data.OriginatedFrom ? data.OriginatedFrom : 0;
			var loginUserId = req.session.user._id;

			var limit = 30;
			var skip = 0;

			if (CurrentPageId && OriginatedFrom) {
				var conditions = {
					_id: { $ne: new mongoose.Types.ObjectId(CurrentPageId) },
					OriginatedFrom: OriginatedFrom,
					Origin: "published",
					IsDeleted: false,
					//$where: "this.Medias.length > 0"	//if page has some posts
				};

				var fields = {};
				console.log('===========================================');
				console.log(conditions);
				console.log('===========================================');

				Page.aggregate([
					{ $match: conditions },
					{ $unwind: "$Medias" },
					{
						$project: {
							_id: "$_id",
							Medias: {
								PageId: "$_id",
								_id: "$Medias._id",	//post Id
								MediaID: "$Medias.MediaID",
								MediaURL: "$Medias.MediaURL",
								MediaTitle: "$Medias.MediaTitle",
								Title: "$Medias.Title",
								Prompt: "$Medias.Prompt",
								Locator: "$Medias.Locator",
								MediaType: "$Medias.MediaType",
								ContentType: "$Medias.ContentType",
								PostedBy: "$Medias.PostedBy",
								PostedByNickName: "$Medias.PostedByNickName",
								PostedOn: "$Medias.PostedOn",
								ThemeID: "$Medias.ThemeID",
								ThemeTitle: "$Medias.ThemeTitle",
								Votes: "$Medias.Votes",
								Marks: "$Medias.Marks",
								OwnerId: "$Medias.OwnerId",
								VoteCount: "$Medias.VoteCount",
								Content: "$Medias.Content",
								thumbnail: "$Medias.thumbnail",
								PostStatement: "$Medias.PostStatement",
								PostStatement__real: "$Medias.PostStatement",
								IsOnlyForOwner: "$Medias.IsOnlyForOwner",
								Themes: "$Medias.Themes"
							}
						}
					},
					//{$match : {IsOnlyForOwner : false}},
					{ $match: { "Medias.MediaType": { $in: ["Image", "Link", "Montage", "Notes"] }, "Medias.IsOnlyForOwner": false, "Medias.PostedBy": { $ne: loginUserId } } }		//this will restrict only public post and posts from other user not from the same user.

				]).exec(function (err, results) {
					//console.log("@@@@@@@@@@@@@@@22--------------resAg = ",resAg);
					if (err) {
						console.log(err);
						var response = {
							status: 501,
							message: "Something went wrong."
						}
						res.json(response);
					}
					else {
						User.populate(results, { path: 'Medias.PostedBy', select: { Name: 1, NickName: 1, Email: 1, ProfilePic: 1 } }, function (err, data) {
							if (!err) {
								//res.json({'code':200,'response':results});
								var response = {
									status: 200,
									message: "Community posts",
									result: results
								}
								res.json(response);
							} else {
								var response = {
									status: 501,
									message: "Something went wrong."
								}
								res.json(response);
							}
						})
					}
				});
			}
			else {
				var response = {
					status: 501,
					message: "Something went wrong."
				}
				res.json(response);
			}
		}
		else {
			var response = {
				status: 501,
				message: "Something went wrong."
			}
			res.json(response);
		}
	});
}

var updateCommunityPostFlag = function (req, res) {
	var pageId = req.body.page_id ? req.body.page_id : null;
	var flag = req.body.flag ? req.body.flag : false;

	var setObj = {
		IsCommunityPost: flag
	};
	var query = {};
	query._id = pageId;

	if (pageId) {
		Page.update(query, { $set: setObj }, { multi: false }, function (err, result) {
			if (!err) {
				//console.log("result = ",result);return;
				var response = {
					status: 200,
					message: "Community post setting has been updated.",
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
		var response = {
			status: 501,
			message: "Something went wrong."
		}
		res.json(response);
	}
};

//getPlateformPosts is different than getCommunityPosts - Community posts are from the related capsule while theme post search is all public post(Link/Video type) on platform.
var getPlateformPosts = async function (req, res) {
	var mongoose = require('mongoose');

	var CurrentPageId = req.body.CurrentPageId ? req.body.CurrentPageId : 0;
	var loginUserId = "68a733773931522f1b7f4632"; // Hardcoded for testing
	var ThemeId = req.body.ThemeId ? req.body.ThemeId : null;

	var conditions = {
		//_id : {$ne : mongoose.Types.ObjectId(CurrentPageId)},
		//OriginatedFrom : OriginatedFrom,
		//Origin: "published",
		IsDeleted: false
		//$where: "this.Medias.length > 0"	//if page has some posts
	};

	if (ThemeId) {
		conditions = {
			//_id : {$ne : mongoose.Types.ObjectId(CurrentPageId)},
			//OriginatedFrom : OriginatedFrom,
			"Medias.Themes.id": {$in : [ThemeId,new mongoose.Types.ObjectId(ThemeId)]},
			//Origin: "published",
			IsDeleted: false
			//$where: "this.Medias.length > 0"	//if page has some posts
		};
	}


	var fields = {};
	var matchCond = {};
	var matchCond2 = {
		$or: [
			{ 'value.IsAdminApproved': { $exists: false } },
			//{ 'value.IsAdminApproved': { $exists: true }, 'value.IsAdminApproved': true }
			{ $and : [{'value.IsAdminApproved': { $exists: true }},{'value.IsAdminApproved': true }]}
		],
		"value.MediaType": "Link",
		"value.IsOnlyForOwner": false,
		//"value.PostedBy": { $ne: loginUserId }
	};

	if (ThemeId) {
		matchCond = { "Medias.Themes.id": ThemeId }
		matchCond2 = {

			$or: [
				{ 'value.IsAdminApproved': { $exists: false } },
				//{ 'value.IsAdminApproved': { $exists: true }, 'value.IsAdminApproved': true }
				{ $and : [{'value.IsAdminApproved': { $exists: true }},{'value.IsAdminApproved': true }]}
			],
			"value.MediaType": "Link",
			"value.IsOnlyForOwner": false,

			//"value.PostedBy": { $ne: loginUserId },
			"value.Themes.id": {$in : [ThemeId,new mongoose.Types.ObjectId(ThemeId)]},
		};
	}

	Page.aggregate([
		{$match : conditions},
		//{ $match: matchCond },
		{ $unwind: "$Medias" },
		{
			$project: {
				_id: "$Medias.MediaID",
				value: {
					_id: "$Medias.MediaID",
					PostId: "$Medias._id",
					UploaderID: "$Medias.PostedBy",
					PostedBy: "$Medias.PostedBy",
					ContentType: "$Medias.ContentType",
					MediaType: "$Medias.MediaType",
					Locator: "$Medias.Locator",
					UploadedOn: "$Medias.PostedOn",
					Title: "$Medias.Title",
					Prompt: "$Medias.Prompt",
					URL: "$Medias.MediaURL",
					thumbnail: "$Medias.thumbnail",
					Content: "$Medias.Content",
					PostStatement: "$Medias.PostStatement",
					PostStatement__real: "$Medias.PostStatement",
					IsOnlyForOwner: "$Medias.IsOnlyForOwner",
					Themes: "$Medias.Themes",
					IsAdminApproved: "$Medias.IsAdminApproved"

				}
			}
		},
		{$group : {_id:"$_id",value: { $first: "$value" }, MediaCount:{$sum:1}}},
		{	//This will restrict only public post(Link type) and posts from other user not from the same user.
			$match: matchCond2
		},
		{$sort : {MediaCount : -1}},
		{ $skip: 0 },
		{ $limit: 96 }

	]);
	
	try {
		const results = await Page.aggregate([
			{$match : conditions},
			//{ $match: matchCond },
			{ $unwind: "$Medias" },
			{
				$project: {
					_id: "$Medias.MediaID",
					value: {
						_id: "$Medias.MediaID",
						PostId: "$Medias._id",
						UploaderID: "$Medias.PostedBy",
						PostedBy: "$Medias.PostedBy",
						ContentType: "$Medias.ContentType",
						MediaType: "$Medias.MediaType",
						Locator: "$Medias.Locator",
						UploadedOn: "$Medias.PostedOn",
						Title: "$Medias.Title",
						Prompt: "$Medias.Prompt",
						URL: "$Medias.MediaURL",
						thumbnail: "$Medias.thumbnail",
						Content: "$Medias.Content",
						PostStatement: "$Medias.PostStatement",
						PostStatement__real: "$Medias.PostStatement",
						IsOnlyForOwner: "$Medias.IsOnlyForOwner",
						Themes: "$Medias.Themes",
						IsAdminApproved: "$Medias.IsAdminApproved"

					}
				}
			},
			{$group : {_id:"$_id",value: { $first: "$value" }, MediaCount:{$sum:1}}},
			{	//This will restrict only public post(Link type) and posts from other user not from the same user.
				$match: matchCond2
			},
			{$sort : {MediaCount : -1}},
			{ $skip: 0 },
			{ $limit: 96 }

		]).allowDiskUse(true);

			var response = {
				status: 200,
				message: "Community posts",
				result: results
			}
			res.json(response);
	} catch (err) {
		console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					}
					res.json(response);
				}
};

var getMTsForIdeas = function (req, res) {
	var conditions = {
		_id: "5464931fde9f6868484be3d7"
	};
	var fields = {};

	metaMetaTags.find(conditions, fields, function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found" })
			}
			else {
				var data = [];
				for (i = 0; i < result[0].MetaTags.length; i++) {
					//code
					if (result[0].MetaTags[i].status == 0 || result[0].MetaTags[i].IsAllowedForIdeas == false) {
						//code
					} else {
						data.push(result[0].MetaTags[i]);
					}
				}
				res.json({ "code": "200", "msg": "Success", "response": data })
			}
		}
	});

};

var getThemes = function (req, res) {
	var ObjectID = require('mongodb').ObjectID;
	var mmts = new ObjectID("5464931fde9f6868484be3d7");
	var mt = req.body.mtSq ? req.body.mtSq : null;

	var searchCriteria = {
		status: 1
	};

	var fields = {
		// _id : true,
		// GroupTagTitle : true,
		// status : true
	};

	var skip = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 500;

	if (mt) {
		searchCriteria = {
			status: {$in : [1,2]},
			MetaMetaTagID: mmts,
			MetaTagID: mt
		}

		groupTags.find(searchCriteria, fields).sort({ GroupTagTitle: 1, DateAdded: 1 }).skip(skip).limit(limit).exec(function (err, result) {
			if (err) {
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({ "code": "404", "msg": "Not Found" })
				} else {
					groupTags.find(searchCriteria).count().exec(function (err, dataLength) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": result, "count": dataLength })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": result, "count": 0 })
						}
					});
				}
			}
		});
	}
	else {
		var conditions = {
			_id: "5464931fde9f6868484be3d7"
		};
		var fields = {};

		metaMetaTags.find(conditions, fields, function (err, result) {
			if (err) {
				res.json(err);
			}
			else {
				var ignore__metaTagIds = [];
				if (result.length == 0) {
					res.json({ "code": "404", "msg": "Not Found" })
				}
				else {
					for (i = 0; i < result[0].MetaTags.length; i++) {
						//code
						if (result[0].MetaTags[i].IsAllowedForIdeas == false) {
							//code
							ignore__metaTagIds.push(String(result[0].MetaTags[i]._id));

						}
					}

					searchCriteria = {
						status: {$in : [1,2]},
						MetaMetaTagID: mmts,
						MetaTagID: { $nin: ignore__metaTagIds }
					}
					groupTags.find(searchCriteria, fields).sort({ GroupTagTitle: 1, DateAdded: 1 }).skip(skip).limit(limit).exec(function (err, result) {
						if (err) {
							res.json(err);
						}
						else {
							if (result.length == 0) {
								res.json({ "code": "404", "msg": "Not Found" })
							} else {
								groupTags.find(searchCriteria).count().exec(function (err, dataLength) {
									if (!err) {
										res.json({ "code": "200", "msg": "Success", "response": result, "count": dataLength })
									}
									else {
										res.json({ "code": "200", "msg": "Success", "response": result, "count": 0 })
									}
								});
							}
						}
					});
				}
			}
		});
	}
};

var getMetaThemes_fromAvailablePosts = function (req, res) {
	var mongoose = require('mongoose');
	var mmts = new mongoose.Types.ObjectId("5464931fde9f6868484be3d7");
	var mt = req.body.mtSq ? req.body.mtSq : null;
	req.body.availableThemeIds = req.body.availableThemeIds ? req.body.availableThemeIds : [];
	
	var availableThemeIds = [];
	for ( var loop = 0; loop < req.body.availableThemeIds.length; loop++ ) {
		availableThemeIds.push(new mongoose.Types.ObjectId(req.body.availableThemeIds[loop]))
	}
	
	if(!availableThemeIds.length) {
		return res.json({ "code": "200", "msg": "Success", "response": [], "count": 0 });
	}
	
	var searchCriteria = {
		//status: 1,
		_id : { $in : availableThemeIds }
	};

	var fields = {
		// _id : true,
		// GroupTagTitle : true,
		// status : true
	};

	var skip = req.body.offset ? parseInt(req.body.offset) : 0;
	var limit = req.body.limit ? parseInt(req.body.limit) : 500;

	if (mt) {
		searchCriteria = {
			//status: {$in : [1,2]},
			MetaMetaTagID: mmts,
			MetaTagID: mt,
			_id : { $in : availableThemeIds }
		}

		groupTags.find(searchCriteria, fields).sort({ GroupTagTitle: 1, DateAdded: 1 }).skip(skip).limit(limit).exec(function (err, result) {
			if (err) {
				res.json(err);
			}
			else {
				if (result.length == 0) {
					res.json({ "code": "404", "msg": "Not Found" })
				} else {
					groupTags.find(searchCriteria).count().exec(function (err, dataLength) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": result, "count": dataLength })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": result, "count": 0 })
						}
					});
				}
			}
		});
	}
	else {
		var conditions = {
			//_id: "5464931fde9f6868484be3d7"
		};
		var fields = {};

		metaMetaTags.find(conditions, fields, function (err, result) {
			if (err) {
				res.json(err);
			}
			else {
				var ignore__metaTagIds = [];
				if (result.length == 0) {
					res.json({ "code": "404", "msg": "Not Found" })
				}
				else {
					for (i = 0; i < result[0].MetaTags.length; i++) {
						//code
						if (result[0].MetaTags[i].IsAllowedForIdeas == false) {
							//code
							ignore__metaTagIds.push(String(result[0].MetaTags[i]._id));

						}
					}

					searchCriteria = {
						//status: {$in : [1,2]},
						//MetaMetaTagID: mmts,
						MetaTagID: { $nin: ignore__metaTagIds },
						_id : { $in : availableThemeIds }
					}
					groupTags.find(searchCriteria, fields).sort({ GroupTagTitle: 1, DateAdded: 1 }).skip(skip).limit(limit).exec(function (err, result) {
						if (err) {
							res.json(err);
						}
						else {
							if (result.length == 0) {
								res.json({ "code": "404", "msg": "Not Found" })
							} else {
								groupTags.find(searchCriteria).count().exec(function (err, dataLength) {
									if (!err) {
										res.json({ "code": "200", "msg": "Success", "response": result, "count": dataLength })
									}
									else {
										res.json({ "code": "200", "msg": "Success", "response": result, "count": 0 })
									}
								});
							}
						}
					});
				}
			}
		});
	}
};

var getThemesFromPosts = function (req, res) {
	const board = require('./../models/pageModel.js');
	
	var fields = {};
	var perpage = 0;
	var offset = 0;
	var pageNo = 0;
	if (typeof (req.body.pageNo) != 'undefined') {
		pageNo = parseInt(req.body.pageNo);
	}
	if (typeof (req.body.perPage) != 'undefined') {
		perpage = parseInt(req.body.perPage);
	}
	if (typeof (req.body.perPage) != 'undefined' && typeof (req.body.pageNo) != 'undefined') {
		console.log('here');
		offset = (pageNo - 1) * perpage;
	}
	if (typeof (req.body.project) != 'undefined') {
		//fields['ProjectID']=req.body.project;
	}
	if (typeof (req.body.id) != 'undefined') {
		fields['_id'] = req.body.id;
		//fields['_id']=new mongoose.Types.ObjectId(req.body.id)
	}
	if (typeof (req.body.gt) != 'undefined' && typeof (req.body.gt) == 'String') {
		//fields['Medias.ThemeID']=req.body.gt;
	}
	
	var dontSelect__ChaperFields = {
		'ChapterPlaylist' : 0
	};
	var dontSelect__UserFields = {
		'Name' : 1,
		'NickName' : 1,
		//'Email' : 1,
		'ProfilePic' : 1
	};
	
	board.find(fields, {_id: 1, ChapterId: 1, Title: 1, Domain: 1, OwnerId: 1, ProjectID: 1, isDeleted: 1, Invitees: 1, ModifiedDate: 1, CreatedDate: 1, PrivacySetting: 1, Collection: 1, HeaderImage: 1})
	.populate([
		{ path: 'ChapterId', select: dontSelect__ChaperFields },
		{ path: 'OwnerId', select: dontSelect__UserFields },
		{ path: 'Medias.PostedBy', select: dontSelect__UserFields }
		
	]).exec(function(err, result) {
		var boardData = result;
		
		if(!req.body.criteria) {
			var id = req.body.id;		//board id.
			var ShareMode__OwnerPrivacyCheck = result[0].ChapterId.LaunchSettings.ShareMode ? result[0].ChapterId.LaunchSettings.ShareMode : 'friend-solo';
			var IsOnlyForOwner__PosterPrivacyCheck = {
				$or : [
					{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
					{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
				]
			};
			
			if(String(id) != String(req.session.user.AllPagesId)){
				if (ShareMode__OwnerPrivacyCheck == 'friend-solo' && result[0].ChapterId.OwnerId != req.session.user._id) {
					board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},							
							{'$unwind': '$Medias'},
							{'$project': {'Medias': 1}},
							{
								'$match': {
									$or:[
										{
											'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
											$or : [
												{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
												{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
											]
										},
										{
											'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
											$or : [
												{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
												{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
											]
										}
									]
								}
							},
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						}
					)
				} else {
					if( result[0].ChapterId.OwnerId == req.session.user._id ){
						board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1,'commentData':1}},
							{'$match': {}},
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						})
					}
					else{
						board.aggregate([
							{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							
							{'$unwind': '$Medias'},
						
							{'$project': {'Medias': 1,'commentData':1}},
							{
								'$match': {
									$or : [
										{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
										{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
									]
								}
							},
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						})
					}
				}
			}
			else{
				board.aggregate([
						{
							'$match': {
								IsDeleted: false, 
								IsDasheditpage : false,
								PageType : {$in: ["gallery", "qaw-gallery"]}
							}
						},
						{'$unwind': '$Medias'},
						{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
						{
							'$match': {
								$or : [
									{OwnerId : {$ne : String(req.session.user._id)} , "Medias.PostedBy" : new mongoose.Types.ObjectId(req.session.user._id)},
									{OwnerId: String(req.session.user._id)}
								]
							}
						},		
						{'$unwind': '$Medias.Themes'},
						{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
						{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
					],
					function(err, results) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
					}
				)
			}
		}
		else if(req.body.criteria == "MyPosts"){
			var id = req.body.id;
			if(String(id) != String(req.session.user.AllPagesId)){
				var mediaMatchCond = {
					"Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)
				};
				
				var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
				if(searchByTagName) {
					mediaMatchCond["Medias.Themes"] = { 
						$elemMatch : {
							"text" : searchByTagName
						}
					};
					
				}
				
				board.aggregate([
						{'$match': {_id: new mongoose.Types.ObjectId(id)}},								
						{'$unwind': '$Medias'},
						{'$project': {'Medias': 1,'commentData':1}},
						{'$match': mediaMatchCond},
						{'$unwind': '$Medias.Themes'},
						{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
						{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
					],
					function(err, results) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
					}
				)
			}
			else{	//If General Page - Show all my posts in Space or Capsules
				board.aggregate([
					{
						'$match': {
							IsDeleted: false, 
							IsDasheditpage : false,
							PageType : {$in: ["gallery", "qaw-gallery"]}
						}
					},
					{'$unwind': '$Medias'},
					{'$project': {'Medias': 1,'commentData':1}},
					{
						'$match': {
							"Medias.PostedBy" : new mongoose.Types.ObjectId(req.session.user._id),
							//"Medias.Origin" : {$nin : ["Copy"]}
						}
					},		
					{'$unwind': '$Medias.Themes'},
					{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
					{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
				],
				function(err, results) {
					if (!err) {
						res.json({ "code": "200", "msg": "Success", "response": results })
					}
					else {
						res.json({ "code": "200", "msg": "Success", "response": results })
					}
				})
			}
		}
		else if(req.body.criteria == "GlobalCommunity"){
			var id = req.body.id;		//board id.
			var matchCond = {};
			matchCond["_id"] = {$ne : new mongoose.Types.ObjectId(id)};
			matchCond["IsDeleted"] = false;
			matchCond["IsDasheditpage"] = false;
			matchCond["PageType"] = {$in: ["gallery", "qaw-gallery"]};
			var attachedThemes = [];
			if(boardData.length){
				boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
				var themesCount = boardData[0].Themes.length;
				if(boardData[0].Themes.length){
					for(var loop = 0; loop < themesCount ; loop++){
						if(boardData[0].Themes[loop].id){
							attachedThemes.push(boardData[0].Themes[loop].id);
						}
					}
				}
				if(attachedThemes.length){
					matchCond["Medias.Themes.id"] = {$in : attachedThemes};
				}
			}
			if(attachedThemes.length){
				if(String(id) != String(req.session.user.AllPagesId)){
					board.aggregate([
							//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							{'$match': matchCond},
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1}},
							{'$match': 
								{
									"Medias.Themes.id" : {$in : attachedThemes},
									"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
									$or: [
										{ 'Medias.IsAdminApproved': { $exists: false } },
										{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
									],
									"Medias.Origin" : {$nin : ["Copy"]}
								}
							},						
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						}
					)
				}
				else{
					board.aggregate([
							//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							{'$match': matchCond},
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1}},
							{'$match': 
								{
									//"Medias.Themes.id" : {$in : attachedThemes},
									"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
									$or: [
										{ 'Medias.IsAdminApproved': { $exists: false } },
										{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
									],
									"Medias.Origin" : {$nin : ["Copy"]}
								}
							},						
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						}
					)
				}
			}
			else{
				if(String(id) == String(req.session.user.AllPagesId)){
					board.aggregate([
							//{'$match': {_id: new mongoose.Types.ObjectId(id)}},
							{'$match': matchCond},
							{'$unwind': '$Medias'},
							
							{'$project': {'Medias': 1}},
							{'$match': 
								{
									//"Medias.Themes.id" : {$in : attachedThemes},
									"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
									$or: [
										{ 'Medias.IsAdminApproved': { $exists: false } },
										{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
									],
									"Medias.Origin" : {$nin : ["Copy"]}
								}
							},						
							{'$unwind': '$Medias.Themes'},
							{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
							{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
						],
						function(err, results) {
							if (!err) {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
							else {
								res.json({ "code": "200", "msg": "Success", "response": results })
							}
						}
					)
				}
				else{
					res.json({"code": "200", "msg": "Success1", "response": []});
				}
			}
		}
		else if(req.body.criteria == "All"){
			var id = req.body.id;
			var IsOnlyForOwner__PosterPrivacyCheck = {
				$or : [
					{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
					{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
				]
			};
			
			var matchCond = {};
			var matchCond_2 = [];
			matchCond["IsDeleted"] = false;
			matchCond["IsDasheditpage"] = false;
			matchCond["PageType"] = {$in: ["gallery", "qaw-gallery"]};
			var attachedThemes = [];
			if(boardData.length){
				boardData[0].Themes = boardData[0].Themes ? boardData[0].Themes :[];
				var themesCount = boardData[0].Themes.length;
				if(boardData[0].Themes.length){
					for(var loop = 0; loop < themesCount ; loop++){
						if(boardData[0].Themes[loop].id){
							attachedThemes.push(boardData[0].Themes[loop].id);
						}
					}
				}
				matchCond_2 = [
					{
								_id : new mongoose.Types.ObjectId(id),
						'Medias.PostedBy': new mongoose.Types.ObjectId(req.session.user._id),
						$or : [
							{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
							{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
						]
					},
					{
								_id : new mongoose.Types.ObjectId(id),
						'Medias.PostedBy': new mongoose.Types.ObjectId(result[0].ChapterId.OwnerId),
						$or : [
							{"Medias.PostPrivacySetting" : {$ne : "OnlyForOwner"}},
							{"Medias.PostPrivacySetting" : "OnlyForOwner","Medias.PostedBy":new mongoose.Types.ObjectId(req.session.user._id)}
						]
					}
				];
				
				if(attachedThemes.length){
					matchCond_2.push(
						{
							"Medias.Themes.id" : {$in : attachedThemes},
							"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
							$or: [
								{ 'Medias.IsAdminApproved': { $exists: false } },
								{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
							],
							"Medias.Origin" : {$nin : ["Copy"]}
						}
					);
				} else {
					matchCond["_id"] = new mongoose.Types.ObjectId(id);
				}
			}
			if(String(id) != String(req.session.user.AllPagesId)){
				board.aggregate([
						{'$match': matchCond},							
						{'$unwind': '$Medias'},
						
						{'$project': {'Medias': 1}},
						{
							'$match': {
								$or: matchCond_2
							}
						},							
						{'$unwind': '$Medias.Themes'},
						{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
						{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
					],
					function(err, results) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
					}
				)
			}
			else{
				matchCond_2 = [
					{
						//"Medias.Themes.id" : {$in : attachedThemes},
						"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
						$or: [
							{ 'Medias.IsAdminApproved': { $exists: false } },
							{ 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
						],
						"Medias.Origin" : {$nin : ["Copy"]}
					},
					{
						OwnerId : {$ne : String(req.session.user._id)} , 
						"Medias.PostedBy" : new mongoose.Types.ObjectId(req.session.user._id)
					},
					{
						OwnerId: String(req.session.user._id)
					}
				];
				board.aggregate([
						{
							'$match': {
								/*
								$or : [
									{OwnerId: String(req.session.user._id)},
									{"LaunchSettings.Invitees.UserEmail" :req.session.user.Email}
								],
								*/
								IsDeleted: false, 
								IsDasheditpage : false,
								PageType : {$in: ["gallery", "qaw-gallery"]}
							}
						},
						{'$unwind': '$Medias'},
						{'$project': {'OwnerId':1,'Medias': 1,'commentData':1}},
						{
							'$match': {
								$or : matchCond_2
							}
						},		
						{'$unwind': '$Medias.Themes'},
						{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
						{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
					],
					function(err, results) {
						if (!err) {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
						else {
							res.json({ "code": "200", "msg": "Success", "response": results })
						}
					}
				)
			
			}
		}
		else if(req.body.criteria == "CuratedPosts"){
			var currentPageId = req.body.id ? req.body.id : null;	//board id.;
			var ___id = "5d9bfb3210a9895a29cc81d1";	//Curated Posts page id. -- Perserverence Page
			var matchCond = {
				$or: [
					{ 
						_id : {
							$in :[ 
								new mongoose.Types.ObjectId(___id), 
								new mongoose.Types.ObjectId(currentPageId)
							]
						}
					},
					{ 'Medias.IsEditorPicked': true }
				]
			}
			var mediaMatchCond = {
				//"Medias.Themes.id" : {$in : attachedThemes},
				//"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
				$or: [
					{ 
						_id : {
							$in :[ 
								new mongoose.Types.ObjectId(___id), 
								new mongoose.Types.ObjectId(currentPageId)
							]
						},
						"Medias.PostPrivacySetting" : {
							$nin : ["OnlyForOwner"] 
						}
						//"Medias.Origin" : {$nin : ["Copy"]}
					},
					{ 
						_id : {
							$nin :[ 
								new mongoose.Types.ObjectId(___id), 
								new mongoose.Types.ObjectId(currentPageId)
							]
						},
						'Medias.IsEditorPicked': true,
						/*
						$or : [
							{'Medias.IsEditorPicked': { $exists: true },'Medias.IsEditorPicked': true}
						],
						*/
						"Medias.PostPrivacySetting" : {
							$nin : ["OnlyForOwner","InvitedFriends"]
						}, 
						$or : [
							{'Medias.IsAdminApproved': { $exists: false }},
							{'Medias.IsAdminApproved': { $exists: true },'Medias.IsAdminApproved': true}
						],
						"Medias.Origin" : {$nin : ["Copy"]}
					}
				]
				//"Medias.Origin" : {$nin : ["Copy"]}
			}
			
			var searchByTagName = req.body.searchByTagName ? req.body.searchByTagName : null;
			if(searchByTagName) {
				mediaMatchCond["Medias.Themes"] = { 
					$elemMatch : {
						"text" : searchByTagName
					}
				};
				
			}
			
			
			//check if filterByUser is requested.
			var filterByUserId = req.body.filterByUserId ? req.body.filterByUserId : null;
			if(filterByUserId) {
				if(filterByUserId != 'NOT_FOUND') {
					mediaMatchCond["Medias.PostedBy"] = new mongoose.Types.ObjectId(String(filterByUserId));
				}
				else {
					mediaMatchCond["Medias.PostedBy"] = new mongoose.Types.ObjectId("5d9bfb3210a9895a29cc81d1");		//just faking the logic - this is not a userid - it's page id so we will always get No records.
					
				}
			}
			
			board.aggregate([
				{'$match': matchCond},
				{'$unwind': '$Medias'},
				
				{'$project': {'Medias': 1,'_id' : 1}},
				{'$match': mediaMatchCond},						
				{'$unwind': '$Medias.Themes'},
				{ '$match' : { 'Medias.Themes.id' : {$exists : true} } },
				{'$group': {_id : '$Medias.Themes.id', text: { $first : '$Medias.Themes.text'}} }
			],
			function(err, results) {
				if (!err) {
					res.json({ "code": "200", "msg": "Success", "response": results })
				}
				else {
					res.json({ "code": "200", "msg": "Success", "response": results })
				}
			});
		}
		else{
			console.log("---------UNWANTED CASE-------------");
			res.json({code:501 , message : "---------UNWANTED CASE-------------"});
		}
	});
};


/*
//move/copy feature keys
OriginalPostId : {type:mongoose.Schema.Types.ObjectId},		//optional this key will be used to track the all Move and Copy features of a post, and This id will be the actual parent post which was generated originally.
Origin : {type : String , enum : ["Move","Copy"]},
OriginatedFrom : {type:mongoose.Schema.Types.ObjectId},		//this is the id of the post from where It has been Moved or copied
//move/copy feature keys
*/
const movePost = async function(req, res) {
	const selectedPageId = req.body.selectedPageId ? req.body.selectedPageId : null;
	const postId = req.body.post_id ? req.body.post_id : null;
	
	// Hardcoded user ID for testing (bypassing session)
	const userId = "68a733773931522f1b7f4632";
	
	if (!selectedPageId || !postId) {
		return res.json({ "code": "400", "msg": "Missing required parameters" });
	}
	
	const conditionsToPush = {
		_id: selectedPageId
	};
	
	const conditions = {
		"Medias._id": postId,
		"Medias.PostedBy": userId
	};
	
	const projection = { 
		Medias: { $elemMatch: { _id: postId } } 
	};
    
	try {
		// Find the source post
		const result = await Page.find(conditions, projection);
		
		if (result.length === 0) {
			return res.json({ "code": "404", "msg": "Post not found!" });
		}
		
		// Get the post object
		const postObject = result[0].Medias[0] ? result[0].Medias[0].toObject() : {};
		
		if (!postObject._id) {
			return res.json({ "code": "404", "msg": "Post data not found!" });
		}
		
		// Set post privacy setting
		postObject.PostPrivacySetting = postObject.PostPrivacySetting ? postObject.PostPrivacySetting : "PublicWithoutName";
		
		// Update post metadata
		const nowDate = Date.now();
				postObject.PostedOn = nowDate;
				postObject.UpdatedOn = nowDate;
				postObject.Origin = "Move";
		postObject.OriginatedFrom = postObject._id;
				postObject.OriginalPostId = postObject.OriginalPostId ? postObject.OriginalPostId : postObject.OriginatedFrom;
				
		// Remove the _id to create a new one
				delete postObject._id;
				
		// Remove post from source page
		const pullObj = {
			$pull: { "Medias": { "_id": postId, "PostedBy": userId } }
		};
		
		const pullResult = await Page.updateOne(conditions, pullObj);
		
		if (pullResult.modifiedCount === 0) {
			return res.json({ "code": "404", "msg": "Post not found in source page!" });
		}
		
		// Add post to target page
		const pushObject = {
			$push: { "Medias": postObject }
		};
		
		const pushResult = await Page.updateOne(conditionsToPush, pushObject);
		
		if (pushResult.modifiedCount === 0) {
			return res.json({ "code": "404", "msg": "Target page not found!" });
		}
		
		res.json({ "code": "200", "message": "Media moved successfully!" });
		
	} catch (err) {
		console.log("Error in movePost:", err);
		res.json({ "code": "500", "message": "Something went wrong", error: err.message });
	}

}

/*
//move/copy feature keys
OriginalPostId : {type:mongoose.Schema.Types.ObjectId},		//optional this key will be used to track the all Move and Copy features of a post, and This id will be the actual parent post which was generated originally.
Origin : {type : String , enum : ["Move","Copy"]},
OriginatedFrom : {type:mongoose.Schema.Types.ObjectId},		//this is the id of the post from where It has been Moved or copied
//move/copy feature keys
*/
const copyPost = async function(req, res) {
	try {
		const selectedPageId = req.body.selectedPageId ? req.body.selectedPageId : null;
		const postId = req.body.post_id ? req.body.post_id : null;
		
		// Import shortid for generating unique IDs
		const shortid = require("shortid");
		
		// Validate authentication (using session mapped from JWT)
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.status(401).json({
				"code": "401",
				"msg": "Unauthorized. Please login to continue."
			});
		}
		
		const userId = req.session.user._id;
		
		// Validate required parameters
		if (!selectedPageId || !postId) {
			return res.status(400).json({ 
				"code": "400", 
				"msg": "Missing required parameters. Both 'selectedPageId' and 'post_id' are required." 
			});
		}
		
		// First, find the original media in the Media collection
		const Media = require('./../models/mediaModel.js');
		const originalMedia = await Media.findById(postId);
		
		if (!originalMedia) {
			return res.status(404).json({ "code": "404", "msg": "Media not found!" });
		}
		
		// Create a copy of the entire media object (same as before)
		const mediaCopy = originalMedia.toObject();
		
		// Remove the _id to create a new one
		delete mediaCopy._id;
		
		// Generate unique Locator using shortid to avoid duplicate key error
		mediaCopy.Locator = `copy_${shortid.generate()}`;
		
		// Generate unique AutoId to avoid duplicate key error
		// Get the highest AutoId and increment it
		const maxAutoIdDoc = await Media.findOne().sort({ AutoId: -1 }).select('AutoId');
		mediaCopy.AutoId = maxAutoIdDoc ? maxAutoIdDoc.AutoId + 1 : 1;
		
		// Update metadata for the copy (exactly as in earlier version)
		const nowDate = Date.now();
		mediaCopy.PostedOn = nowDate;
		mediaCopy.UpdatedOn = nowDate;
		mediaCopy.Origin = "Copy";
		mediaCopy.OriginatedFrom = originalMedia._id;
		mediaCopy.OriginalPostId = originalMedia.OriginalPostId ? originalMedia.OriginalPostId : originalMedia._id;
		
		// For copy we should change the PostedBy etc too as a user can copy other user's public post
		mediaCopy.PostedBy = userId;
		
		// Set post privacy setting
		mediaCopy.PostPrivacySetting = mediaCopy.PostPrivacySetting ? mediaCopy.PostPrivacySetting : "PublicWithoutName";
		
		// Save the new media copy in Media collection
		const newMedia = new Media(mediaCopy);
		const savedMedia = await newMedia.save();
		
		// Add only the new media ID to the target page's Medias array
		const pushResult = await Page.updateOne(
			{ _id: selectedPageId },
			{ $push: { Medias: savedMedia._id } }
		);
		
		if (pushResult.modifiedCount === 0) {
			return res.status(404).json({ "code": "404", "msg": "Target page not found!" });
		}
		
		res.json({ 
			"code": "200", 
			"message": "Media copied successfully!",
			"newMediaId": savedMedia._id,
			"originalMediaId": originalMedia._id,
			"copiedBy": userId
		});
		
	} catch (err) {
		console.error("Error in copyPost:", err);
		res.status(500).json({ 
			"code": "500", 
			"message": "Error copying post. Please try again.", 
			"error": err.message 
		});
	}
};

var saveUserTheme = function(req,res){
	var selectedPageId = req.body.selectedPageId ? req.body.selectedPageId : null;
	var postId = req.body.post_id ? req.body.post_id : null;
	
	var conditionsToPush = {
		_id : selectedPageId
	};
	
	var conditions = {
		"Medias._id" : postId ? postId : '',
		//"Medias.PostPrivacySetting" : { $in : ["PublicWithName","PublicWithoutName"] }
	};
	
	var projection = { 
		Medias: { $elemMatch: { _id: req.body.post_id ? req.body.post_id : '' } } 
	};
    
	Page.find(conditions, projection).lean().exec(function(err, result) {
		var boardData = result;
		if (err) {
			//throw err;
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({"code": "404", "msg": "Not Found!"})
			}
			else {
				result[0].Medias[0].PostPrivacySetting = result[0].Medias[0].PostPrivacySetting ? result[0].Medias[0].PostPrivacySetting : "PublicWithoutName";
				
				var postObject = result[0].Medias[0] ? result[0].Medias[0] : {};
				var nowDate = Date.now();
				postObject.PostedOn = nowDate;
				postObject.UpdatedOn = nowDate;
				postObject.Origin = "Copy";
				postObject.OriginatedFrom = result[0].Medias[0]._id;
				postObject.OriginalPostId = postObject.OriginalPostId ? postObject.OriginalPostId : postObject.OriginatedFrom;
				
				//for copy we should change the PostedBy etc too as a user can copy other user's public post. but the name of the copied post should be changed as who has copied the content
				postObject.PostedBy = req.session.user._id;
				
				
				delete postObject._id;
				
				var pushObject = {
					$push : { "Medias" : postObject }
				};
				Page.update(conditionsToPush,pushObject,function(err,result){
					if(!err){
						var dontSelect__UserFields = {
							'Name' : 1,
							'NickName' : 1,
							//'Email' : 1,
							'ProfilePic' : 1
						};
						res.json({"code":"200","message":"Media copied successfully!"});
						/*
						User.populate(result, {path: 'Medias.PostedBy', select: dontSelect__UserFields}, function(err, data) {
							if (!err) {
								res.json({"code":"200","message":"Media copied successfully!",postObject : result});
								
							} else {
								res.json({"code":"501","message":"Error!"});
							}
						})
						*/
					}
					else{
						res.json({"code":"501","message":"Error!"});
					}
				});
			}
		}
	});
}

var saveThemeForLearning = function (req, res) {
	var conditions = {
		PageId : req.body.PageId ? new mongoose.Types.ObjectId(req.body.PageId) : null,
		UserId : new mongoose.Types.ObjectId(req.session.user._id)
	}
	var nowDate = Date.now();
	var data = {
		PageId : req.body.PageId ? new mongoose.Types.ObjectId(req.body.PageId) : null,
		ThemeId : req.body.ThemeId ? new mongoose.Types.ObjectId(req.body.ThemeId) : null,
		ThemeTitle : req.body.ThemeTitle ? req.body.ThemeTitle : null,
		UserId : new mongoose.Types.ObjectId(req.session.user._id),
		CreatedOn: nowDate,
		ModifiedOn: nowDate
	};
	var options = {
		upsert: true
	}
	if(data.PageId && data.ThemeTitle && data.UserId) {
		LearningTheme.update(conditions, data, options, function (err, result) {
			if(!err) {
				res.json({"code":"200","message":"Learning theme has been saved successfully!"});
			} else {
				res.json({"code":"501","message":"Error!"});
			}
		})
	} else {
		res.json({"code":"501","message":"validation Error!"});
	}
}

//this function will be called through ajax from tumult UI - Store: Tree capsule case
var getLearningTheme = function (req, res) {
	var conditions = {
		PageId: req.query.PageId ? new mongoose.Types.ObjectId(req.query.PageId) : null,
		UserId: req.session.user._id
	};
	var fields = {
		ThemeId: true,
		ThemeTitle: true
	};
	
	LearningTheme.find(conditions, fields).lean().exec(function (err, result) {
		if(!err) {
			result = typeof result == 'object' ? result : [];
			if(result.length) {
				res.json({"code":"200","result":result[0]});
			} else {
				res.json({"code":"200","result":{}});
			}
		} else {
			res.json({"code":"501","message":"validation Error!"});
		}
	})
}

//this function will be called through ajax from tumult UI - Store: Tree capsule case - will work for friend's filter case as well- see the first line for trick
/*
{
	PageId : "",
	StoryThemes: []
}
*/
var getStoryPosts = function (req, res) {
	var postedByFilter = req.body.UserId ? req.body.UserId : req.session.user._id;
	var conditions = {
		_id: req.body.PageId ? new mongoose.Types.ObjectId(req.body.PageId) : null
	};
	
	var mediaMatchCond = {
		"Medias.PostedBy": new mongoose.Types.ObjectId(postedByFilter),
		"Medias.PostPrivacySetting" : {$ne : "OnlyForYou"}
	};
	
	if(postedByFilter != req.session.user._id) {
		mediaMatchCond ["Medias.PostPrivacySetting"] = {$ne : "OnlyForOwner"};
	}
	
	var StoryThemes = typeof req.body.StoryThemes == 'object' ? req.body.StoryThemes : [];
	
	var storyObject = {};
	
	if(StoryThemes.length) {
		for(var loop = 0; loop < StoryThemes.length; loop++) {
			storyObject[StoryThemes[loop]] = [];
		}
		mediaMatchCond["Medias.Themes"] = { 
			$elemMatch : {
				"text" : {$in : StoryThemes}
			}
		};
		var aggregateStages = [
			{'$match': conditions},								
			{'$unwind': '$Medias'},
			{'$project': {'Medias': 1}},
			{'$match': mediaMatchCond},
			{'$sort': {'Medias.PostedOn': -1}}
		];
		
		Page.aggregate(aggregateStages, function(err, results) {
			if (!err) {
				results = typeof results == 'object' ? results : [];
				if(results.length) {
					for ( var loop = 0; loop < results.length; loop++ ) {
						var post = results[loop].Medias ? results[loop].Medias : {};
						
						post.Themes = typeof post.Themes == 'object' ? post.Themes : [];
						for ( var loop2 = 0; loop2 < post.Themes.length; loop2++ ) {
							var themeText = post.Themes[loop2].text ? post.Themes[loop2].text : null;
							if(storyObject[themeText]) {
								storyObject[themeText].push(post);
							}
						}
					}
				}
				res.json({"code": "200", "msg": "Success2", "storyObject": storyObject});
			} else {
				res.json(err);
			}
		});
	} else {
		res.json({"code":"200","storyObject":storyObject});
	}
}

var addNewTheme = function (req, res) {
	var mmt = req.body.mmt ? req.body.mmt : null;
	var mt = req.body.mt ? req.body.mt : null;
	var themes = req.body.Themes ? req.body.Themes : [];
	//removing the hiphen between two words
	
	for (var loop = 0; loop < themes.length; loop++) {
		var gtId = themes[loop].id ? themes[loop].id : null;
		if (!gtId) {
			themes[loop].text = typeof themes[loop].text == 'string' ? themes[loop].text.replace(/-/g,' ') : "";
		}
	}
	//removing the hiphen between two words
	
	var postThemeArr = themes ? themes : [];
	var userSuggestedGts = [];
	for (var loop = 0; loop < postThemeArr.length; loop++) {
		var gtId = postThemeArr[loop].id ? postThemeArr[loop].id : null;
		if (!gtId) {
			userSuggestedGts.push(postThemeArr[loop]);
		}
	}
	var AsyncOpsCounter = 0;
	if (userSuggestedGts.length) {
		for (var loop2 = 0; loop2 < userSuggestedGts.length; loop2++) {
			var userSuggestedGt = userSuggestedGts[loop2];
			userSuggestedGt.text = userSuggestedGt.text ? userSuggestedGt.text : "";
			if(userSuggestedGt.text.trim() != ""){
				chkUserGt(userSuggestedGt.text, function (response) {
					AsyncOpsCounter++;
					if (response.length >= 1) {
						if(response[0].status == 3) {
							var conditions = {
								_id : response[0]._id
							}
							var dataToUpdate = {
								MetaMetaTagID : new mongoose.Types.ObjectId(mmt),
								MetaTagID : mt,
								status: 2,
								SuggestedBy: req.session.user._id
							};
							groupTags.update(conditions, { $set: dataToUpdate }, function (err, data) {
								if (err) {
									//res.json(err);
									console.log("ERROR----", err);
								}
								else {
									if (AsyncOpsCounter == userSuggestedGts.length) {
										NextStepAfterUserSuggestedTagMapping();
									}
								}
							})
						}else if(response[0].status == 1 || response[0].status == 2) {
							if (AsyncOpsCounter == userSuggestedGts.length) {
								NextStepAfterUserSuggestedTagMapping('AlreadyAdded');
							}
						} else {
							if (AsyncOpsCounter == userSuggestedGts.length) {
								NextStepAfterUserSuggestedTagMapping();
							}
						}
					}
					else {
						var GT_fields = {
							GroupTagTitle: userSuggestedGt.text,
							Notes: "",
							DateAdded: Date.now(),
							MetaMetaTagID : new mongoose.Types.ObjectId(mmt),
							MetaTagID : mt,
							status: 2,
							SuggestedBy: req.session.user._id
						};

						groupTags(GT_fields).save(function (err, data) {
							if (err) {
								//res.json(err);
								console.log("ERROR----", err);
							}
							else {
								groupTags.findOne({ _id: data._id }, function (err, gtData) {
									gtData.Tags.push({
										TagTitle:userSuggestedGt.text,
										status: 1
									});
									gtData.save();
								})
								
								if (AsyncOpsCounter == userSuggestedGts.length) {
									NextStepAfterUserSuggestedTagMapping();
								}
							}
						});
					}
				});
			}
			else{
				AsyncOpsCounter++;
				if (AsyncOpsCounter == userSuggestedGts.length) {
					NextStepAfterUserSuggestedTagMapping();
				}
			}
		}
	}
	else {
		NextStepAfterUserSuggestedTagMapping('AlreadyAdded');
	}
	
	function NextStepAfterUserSuggestedTagMapping(flag) {
		flag = flag ? flag : null;
		if(flag == 'AlreadyAdded') {
			res.json({"code": "204", "msg": "Already exist"});
		} else {
			res.json({"code": "200", "msg": "Your theme has been added successfully."});
		}
		
	}
	
}

function chkUserGt(abc, callback) {
	if (abc) {
		abc = abc ? abc.trim() : null;	//added by manishp on 09032016
	}
	if (abc) {
		groupTags.find({ status: { $in: [1, 2, 3] }, GroupTagTitle: { $regex: new RegExp("^"+abc+"$", "i") } }, function (err, result) {
			if (err) {
				throw err;
			}
			else {
				result = result ? result : [];
				if(!result.length){
					groupTags.find({ status: { $in: [1, 2, 3] }, "Tags.TagTitle": { $regex: new RegExp("^"+abc+"$", "i")}, "Tags.status" : 1 }, function (err, result2) {
						if (err) {
							throw err;
						}
						else{
							result2 = result2 ? result2 : [];
							if(result2.length == 1) {
								callback(result2);
							}
							else{
								callback(result);
							}
						}
					})
				}
				else{
					callback(result);
				}
			}
		});
	}
}

var getLabels = function (req, res) {
	var LabelsArr = req.body.LabelsArr ? req.body.LabelsArr : [];
	if(LabelsArr.length) {
		var LabelsArrIds = [];
		for(var i = 0; i < LabelsArr.length; i++) {
			LabelsArrIds.push(new mongoose.Types.ObjectId(LabelsArr[i]));
		}
		var conditions = {_id : {"$in" : LabelsArrIds}};
		console.log("conditions - ", conditions);
		var fields = {};
		Labels.find(conditions, fields, function(err, results) {
			if(!err) {
				console.log("results - ", results);
				var finalResult = {
					"5ff179065a0a9a452c791f54": "Goal",
					"5ff179155a0a9a452c791f55": "Mirror",
					"5ff179255a0a9a452c791f56": "Old story",
					"5ff179375a0a9a452c791f57": "Inspiration",
					"5ff179465a0a9a452c791f58": "New story", 
					"5ff179555a0a9a452c791f59": "Action",
					"5ff179615a0a9a452c791f5a": "Danger-zone",
					"5ff1796c5a0a9a452c791f5b": "Temptation", 
					"5ff179785a0a9a452c791f5c": "Practices", 
					"5ff1797f5a0a9a452c791f5d" : "Victory"
				};
				for(var i = 0; i < results.length; i++) {
					finalResult[String(results[i]._id)] = results[i].Label;
				}
				console.log("finalResult - ", finalResult);
				res.json({ status: "success", message: "All associated labels.", result: finalResult });
			} else {
				
				res.json({ status: "error", message: "Something went wrong.", result : {} });
			}
		});
	}
}

//Page library Apis - common
exports.getChapterName = getChapterName;
exports.getPageData = getPageData;
exports.getPageLibrary = getPageLibrary;
exports.createdByMe = createdByMe;
exports.sharedWithMe = sharedWithMe;
exports.byTheHouse = byTheHouse;
exports.getPageLibrary__MyBoards = getPageLibrary__MyBoards;

exports.findAll = findAll;
exports.getAllPages = getAllPages;		//For Preview
exports.create = create;
exports.duplicate = duplicate;
exports.remove = remove;
//exports.reorder = reorder;
exports.reorder = reorder_V2;
exports.addFromLibrary = addFromLibrary;
exports.preview = preview;
exports.share = share;

exports.findAll_dashedit = findAll_dashedit;
exports.publishNewUpdates_dashedit = publishNewUpdates_dashedit;
exports.revertDashEditCopy = revertDashEditCopy;
exports.addFromLibrary_dashEdit = addFromLibrary_dashEdit;

exports.dashEditCreate = dashEditCreate;
exports.changeHeaderBlurValue = changeHeaderBlurValue;
exports.changeTransparencyValue = changeTransparencyValue;
exports.addPageVoiceOver = addPageVoiceOver;
exports.deleteVoiceOver = deleteVoiceOver;

exports.getCommunityPosts = getCommunityPosts;	//added on 3 Nov 2017 by manishp
exports.updateCommunityPostFlag = updateCommunityPostFlag;

//Search Gallery - Theme post search module (Ideas) APIs
exports.getPlateformPosts = getPlateformPosts;
exports.getMTsForIdeas = getMTsForIdeas;
exports.getThemes = getThemes;

// Use modernized version for getThemesFromPosts
const modernizedBoard = require('./boardController_MODERNIZED.js');
exports.getThemesFromPosts = modernizedBoard.getThemesFromPosts;
exports.getThemesFromPosts_OLD = getThemesFromPosts; // Backup

exports.getMetaThemes_fromAvailablePosts = getMetaThemes_fromAvailablePosts;

exports.movePost = movePost;
exports.copyPost = copyPost;
exports.getLabels = getLabels;

exports.saveUserTheme = saveUserTheme;

exports.saveThemeForLearning = saveThemeForLearning;
exports.getLearningTheme = getLearningTheme;
exports.getStoryPosts = getStoryPosts;
exports.addNewTheme = addNewTheme;

//Page library Apis - specific :- Exported from SearchGalleryPageController & ContentPageController
exports.SearchGalleryPage = SearchGalleryPage;
exports.ContentPage = ContentPage;

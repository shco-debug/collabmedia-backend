var Chapter = require("./../models/chapterModel.js");
var Page = require("./../models/pageModel.js");
var User = require("./../models/userModel.js");
var Friend = require("./../models/friendsModel.js");
var fs = require("fs");
var formidable = require("formidable");
var mediaController = require("./../controllers/mediaController.js");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
//var Page = require('./../models/pageModel.js');
var im = require("imagemagick");
var counters = require("./../models/countersModel.js");
var EmailTemplate = require("./../models/emailTemplateModel.js");

var async = require("async");
var mongoose = require("mongoose");
// added by arun sahani 20/05/2016
var Capsule = require("./../models/capsuleModel.js");

var Order = require("./../models/orderModel.js");

var AppController = require("./../controllers/appController.js"); //Shared functions are inside this file.

var dateFormat = function () {
  var d = new Date(),
    dformat =
      [
        d.getMonth() + 1 > 10 ? d.getMonth() + 1 : "0" + (d.getMonth() + 1),
        d.getDate() > 10 ? d.getDate() : "0" + d.getDate(),
        d.getFullYear(),
      ].join("") +
      "" +
      [d.getHours(), d.getMinutes(), d.getSeconds()].join("");
  return dformat;
};
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

var find = async function (req, res) {
  if (!req.headers.is_journal) {
    var conditions = {
      //CreaterId : req.session.user._id,
      _id: req.headers.chapter_id ? req.headers.chapter_id : 0,
      Status: 1,
      //IsLaunched : 0,
      IsDeleted: 0,
    };

    var fields = {};
    console.log("===========================================");
    console.log(conditions);
    console.log("===========================================");

    try {
      const results = await Chapter.findOne(conditions)
        .populate("CapsuleId")
        .lean();

      if (results) {
        //attach the UniqueIdPerOwner_CapsuleData
        results = results ? results : {};
        results.CapsuleId = results.CapsuleId ? results.CapsuleId : {};
        var UniqueIdPerOwner = results.CapsuleId.UniqueIdPerOwner
          ? results.CapsuleId.UniqueIdPerOwner
          : false;

        var IsRetailCapsule = false;
        if (UniqueIdPerOwner) {
          console.log(
            "@@@@@@@@@@@@@-----------------UniqueIdPerOwner = ",
            UniqueIdPerOwner
          );
          try {
            const resAg = await Order.aggregate([
              {
                $match: {
                  TransactionState: "Completed",
                  "CartItems.Owners.UniqueIdPerOwner": UniqueIdPerOwner,
                },
              },
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
                },
              },
              {
                $lookup: {
                  from: "Capsules",
                  localField: "UniqueIdPerOwner",
                  foreignField: "UniqueIdPerOwner",
                  as: "UniqueIdPerOwner_CapsuleData",
                },
              },
              {
                $match: {
                  UniqueIdPerOwner: UniqueIdPerOwner,
                  OrderInitiatedFrom: "PGALLARY",
                },
              },
            ]).allowDiskUse(true);

            if (resAg.length) {
              IsRetailCapsule = true;
            } else {
              IsRetailCapsule = false;
            }
            results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
            var response = {
              status: 200,
              message: "Chapters listing",
              result: results,
            };
            res.json(response);
          } catch (errAg) {
            console.log(errAg);
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        } else {
          //console.log("@@@@@@@@@@@@@-----------------ELSE = ",UniqueIdPerOwner);
          results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
          var response = {
            status: 200,
            message: "Chapters listing",
            result: results,
          };
          res.json(response);
        }
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    } catch (err) {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  } else {
    var conditions = {
      //CreaterId : req.session.user._id,
      _id: req.headers.chapter_id ? req.headers.chapter_id : 0,
      Status: 1,
      //IsLaunched : 0,
      IsDeleted: 0,
    };

    var fields = {};
    console.log("===========================================");
    console.log(conditions);
    console.log("===========================================");

    try {
      const results = await Chapter.findOne(conditions)
        .populate("CapsuleId")
        .lean();

      if (results) {
        //get the chapter playlist from General folder and attach with results - JOURNAL MODULE
        try {
          const ChapterPlaylistObj = await Chapter.findOne(
            		{ _id: new mongoose.Types.ObjectId("5c1ccf12b76f62790084f97c") },
            { ChapterPlaylist: 1 }
          )
            .lean();

          if (ChapterPlaylistObj) {
            ChapterPlaylistObj = ChapterPlaylistObj
              ? ChapterPlaylistObj
              : {};

            //attach the UniqueIdPerOwner_CapsuleData
            results = results ? results : {};
            results.CapsuleId = results.CapsuleId ? results.CapsuleId : {};

            results.ChapterPlaylist = ChapterPlaylistObj.ChapterPlaylist
              ? ChapterPlaylistObj.ChapterPlaylist
              : [];

            var UniqueIdPerOwner = results.CapsuleId.UniqueIdPerOwner
              ? results.CapsuleId.UniqueIdPerOwner
              : false;

            var IsRetailCapsule = false;
            if (UniqueIdPerOwner) {
              console.log(
                "@@@@@@@@@@@@@-----------------UniqueIdPerOwner = ",
                UniqueIdPerOwner
              );
              try {
                const resAg = await Order.aggregate([
                  {
                    $match: {
                      TransactionState: "Completed",
                      "CartItems.Owners.UniqueIdPerOwner": UniqueIdPerOwner,
                    },
                  },
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
                    },
                  },
                  {
                    $lookup: {
                      from: "Capsules",
                      localField: "UniqueIdPerOwner",
                      foreignField: "UniqueIdPerOwner",
                      as: "UniqueIdPerOwner_CapsuleData",
                    },
                  },
                  {
                    $match: {
                      UniqueIdPerOwner: UniqueIdPerOwner,
                      OrderInitiatedFrom: "PGALLARY",
                    },
                  },
                ]).allowDiskUse(true);

                if (resAg.length) {
                  IsRetailCapsule = true;
                } else {
                  IsRetailCapsule = false;
                }
                results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
                var response = {
                  status: 200,
                  message: "Chapters listing",
                  result: results,
                };
                res.json(response);
              } catch (errAg) {
                console.log(errAg);
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              }
            } else {
              //console.log("@@@@@@@@@@@@@-----------------ELSE = ",UniqueIdPerOwner);
              results.CapsuleId.IsRetailCapsule = IsRetailCapsule;
              var response = {
                status: 200,
                message: "Chapters listing",
                result: results,
              };
              res.json(response);
            }
          } else {
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            res.json(response);
          }
        } catch (err) {
          console.log(err);
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        }
      } else {
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    } catch (err) {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  }
};

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
  try {
    var conditions = {
      CreaterId: req.session.user._id,
      CapsuleId: req.headers.capsule_id,
      $or: [
        { Origin: "created" },
        { Origin: "duplicated" },
        { Origin: "addedFromLibrary" },
      ],
      IsLaunched: false,
      Status: true,
      IsDeleted: false,
    };

    var sortObj = {
      Order: 1,
      ModifiedOn: -1,
    };

    var fields = {};

    const results = await Chapter.find(conditions, fields)
      .sort(sortObj)
      .exec();

    var response = {
      status: 200,
      message: "Chapters listing",
      results: results,
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

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

var findAllPaginated = async function (req, res) {
  try {
    var limit = req.body.perPage ? req.body.perPage : 0;
    var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;

    var conditions = {
      $or: [
        {
          CreaterId: req.session.user._id,
          Origin: "created",
          IsLaunched: true,
          "LaunchSettings.MakingFor": "ME",
        },
        {
          CreaterId: req.session.user._id,
          Origin: "duplicated",
          IsLaunched: true,
          "LaunchSettings.MakingFor": "ME",
        },
        {
          CreaterId: req.session.user._id,
          Origin: "addedFromLibrary",
          IsLaunched: true,
          "LaunchSettings.MakingFor": "ME",
        },
        {
          CreaterId: req.session.user._id,
          IsLaunched: true,
          "LaunchSettings.MakingFor": "OTHERS",
        },
        {
          CreaterId: { $ne: req.session.user._id },
          OwnerId: req.session.user._id,
          Origin: "shared",
        },
      ],
      Status: true,
      IsDeleted: false,
    };

    if (req.body.capsuleCheck) {
      conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
    }

    var sortObj = {
      ModifiedOn: -1,
    };
    if (req.body.sortBy) {
      var sortObjBy = req.body.sortBy;
      if (sortObjBy == "Title") {
        sortObj = { Title: -1 };
      } else if (sortObjBy == "CreatedOn") {
        sortObj = { CreatedOn: -1 };
      } else if (sortObjBy == "ModifiedOn") {
        sortObj = { ModifiedOn: -1 };
      } else if (sortObjBy == "CreatedOnAsc") {
        sortObj = { CreatedOn: 1 };
      } else if (sortObjBy == "ModifiedOnAsc") {
        sortObj = { ModifiedOn: 1 };
      } else if (sortObjBy == "TitleAsc") {
        sortObj = { Title: 1 };
      }
    }

    var fields = {};

    const results = await Chapter.find(conditions, fields)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();

    const resultsLength = await Chapter.countDocuments(conditions).exec();

    var response = {
      count: resultsLength,
      status: 200,
      message: "Chapters listing",
      results: results,
    };
    res.json(response);
  } catch (err) {
    console.log(err);
    var response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

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
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;
  console.log("--------------------limit = " + limit);
  console.log("--------------------Offset = " + offset);
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
      {
        CreaterId: req.session.user._id,
        Origin: "created",
        IsLaunched: true,
        "LaunchSettings.MakingFor": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "duplicated",
        IsLaunched: true,
        "LaunchSettings.MakingFor": "ME",
      },
      {
        CreaterId: req.session.user._id,
        Origin: "addedFromLibrary",
        IsLaunched: true,
        "LaunchSettings.MakingFor": "ME",
      },
      {
        CreaterId: req.session.user._id,
        IsLaunched: true,
        "LaunchSettings.MakingFor": "OTHERS",
      },
    ],
    Status: true,
    IsDeleted: false,
  };

  if (req.body.capsuleCheck) {
    conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
  }

  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };
  if (req.body.sortBy) {
    var sortObjBy = req.body.sortBy;
    if (sortObjBy == "Title") {
      sortObj = {
        //Order : 1,
        Title: -1,
      };
    } else if (sortObjBy == "CreatedOn") {
      sortObj = {
        //Order : 1,
        CreatedOn: -1,
      };
    } else if (sortObjBy == "ModifiedOn") {
      sortObj = {
        //Order : 1,
        ModifiedOn: -1,
      };
    } else if (sortObjBy == "CreatedOnAsc") {
      sortObj = {
        //Order : 1,
        CreatedOn: 1,
      };
    } else if (sortObjBy == "ModifiedOnAsc") {
      sortObj = {
        //Order : 1,
        ModifiedOn: 1,
      };
    } else if (sortObjBy == "TitleAsc") {
      sortObj = {
        //Order : 1,
        Title: 1,
      };
    }
  }

  var fields = {};

  Chapter.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, results) {
      if (!err) {
        Chapter.find(conditions, fields)
          .count()
          .exec(function (errr, resultsLength) {
            if (!errr) {
              var response = {
                count: resultsLength,
                status: 200,
                message: "Chapters listing",
                results: results,
              };
              res.json(response);
            } else {
              console.log(err);
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });
      } else {
        console.log(err);
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

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
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;
  console.log("--------------------limit = " + limit);
  console.log("--------------------Offset = " + offset);
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
      {
        CreaterId: { $ne: req.session.user._id },
        OwnerId: req.session.user._id,
        Origin: "shared",
      }, //this may not have option for further share. ? - May be key for furtherSharable ?
    ],
    Status: true,
    IsDeleted: false,
  };

  if (req.body.capsuleCheck) {
    conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
  }

  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };

  if (req.body.sortBy) {
    var sortObjBy = req.body.sortBy;
    if (sortObjBy == "Title") {
      sortObj = {
        //Order : 1,
        Title: -1,
      };
    } else if (sortObjBy == "CreatedOn") {
      sortObj = {
        //Order : 1,
        CreatedOn: -1,
      };
    } else if (sortObjBy == "ModifiedOn") {
      sortObj = {
        //Order : 1,
        ModifiedOn: -1,
      };
    } else if (sortObjBy == "CreatedOnAsc") {
      sortObj = {
        //Order : 1,
        CreatedOn: 1,
      };
    } else if (sortObjBy == "ModifiedOnAsc") {
      sortObj = {
        //Order : 1,
        ModifiedOn: 1,
      };
    } else if (sortObjBy == "TitleAsc") {
      sortObj = {
        //Order : 1,
        Title: 1,
      };
    }
  }

  var fields = {};

  Chapter.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, results) {
      if (!err) {
        Chapter.find(conditions, fields)
          .count()
          .exec(function (errr, resultsLength) {
            if (!errr) {
              var response = {
                count: resultsLength,
                status: 200,
                message: "Chapters listing",
                results: results,
              };
              res.json(response);
            } else {
              console.log(err);
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });
      } else {
        console.log(err);
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

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
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;
  console.log("--------------------limit = " + limit);
  console.log("--------------------Offset = " + offset);
  var conditions = {
    Origin: "createdForMe",
    OwnerId: req.session.user._id,
    Status: 1,
    IsLaunched: 0,
    IsDeleted: 0,
  };

  if (req.body.capsuleCheck) {
    conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
  }

  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };
  if (req.body.sortBy) {
    var sortObjBy = req.body.sortBy;
    if (sortObjBy == "Title") {
      sortObj = {
        //Order : 1,
        Title: -1,
      };
    } else if (sortObjBy == "CreatedOn") {
      sortObj = {
        //Order : 1,
        CreatedOn: -1,
      };
    } else if (sortObjBy == "ModifiedOn") {
      sortObj = {
        //Order : 1,
        ModifiedOn: -1,
      };
    } else if (sortObjBy == "CreatedOnAsc") {
      sortObj = {
        //Order : 1,
        CreatedOn: 1,
      };
    } else if (sortObjBy == "ModifiedOnAsc") {
      sortObj = {
        //Order : 1,
        ModifiedOn: 1,
      };
    } else if (sortObjBy == "TitleAsc") {
      sortObj = {
        //Order : 1,
        Title: 1,
      };
    }
  }

  var fields = {};

  Chapter.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, results) {
      if (!err) {
        Chapter.find(conditions, fields)
          .count()
          .exec(function (errr, resultsLength) {
            if (!errr) {
              var response = {
                count: resultsLength,
                status: 200,
                message: "Chapters listing",
                results: results,
              };
              res.json(response);
            } else {
              console.log(err);
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });
      } else {
        console.log(err);
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

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
  var offset = req.body.pageNo ? (req.body.pageNo - 1) * limit : 0;
  console.log("--------------------limit = " + limit);
  console.log("--------------------Offset = " + offset);
  var conditions = {
    Origin: "byTheHouse",
    CreaterId: req.session.user._id,
    Status: 1,
    IsLaunched: 0,
    IsDeleted: 0,
  };

  if (req.body.capsuleCheck) {
    conditions.CapsuleId = req.body.capsuleId ? req.body.capsuleId : 0;
  }

  var sortObj = {
    //Order : 1,
    ModifiedOn: -1,
  };
  if (req.body.sortBy) {
    var sortObjBy = req.body.sortBy;
    if (sortObjBy == "Title") {
      sortObj = {
        //Order : 1,
        Title: -1,
      };
    } else if (sortObjBy == "CreatedOn") {
      sortObj = {
        //Order : 1,
        CreatedOn: -1,
      };
    } else if (sortObjBy == "ModifiedOn") {
      sortObj = {
        //Order : 1,
        ModifiedOn: -1,
      };
    } else if (sortObjBy == "CreatedOnAsc") {
      sortObj = {
        //Order : 1,
        CreatedOn: 1,
      };
    } else if (sortObjBy == "ModifiedOnAsc") {
      sortObj = {
        //Order : 1,
        ModifiedOn: 1,
      };
    } else if (sortObjBy == "TitleAsc") {
      sortObj = {
        //Order : 1,
        Title: 1,
      };
    }
  }

  var fields = {};

  Chapter.find(conditions, fields)
    .sort(sortObj)
    .skip(offset)
    .limit(limit)
    .exec(function (err, results) {
      if (!err) {
        Chapter.find(conditions, fields)
          .count()
          .exec(function (errr, resultsLength) {
            if (!errr) {
              var response = {
                count: resultsLength,
                status: 200,
                message: "Chapters listing",
                results: results,
              };
              res.json(response);
            } else {
              console.log(err);
              var response = {
                status: 501,
                message: "Something went wrong.",
              };
              res.json(response);
            }
          });
      } else {
        console.log(err);
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
};

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

var create = async function (req, res) {
	try {
		if (!req.headers.capsule_id) {
			return res.json({
				status: 400,
				message: "Capsule ID is required in headers."
			});
		}

		var data = {};
		//set required field of the chapterModel
		data = {
			CapsuleId: req.headers.capsule_id,
			CreaterId: req.session.user._id,
			OwnerId: req.session.user._id,
			IsPublished: req.body.IsPublished ? req.body.IsPublished : false
		};
		console.log("data = ", data);
		
		const result = await Chapter(data).save();
		
		var response = {
			status: 200,
			message: "Chapter created successfully.",
			result: result
		};
		pushChapterId(data.CapsuleId, result._id);
		res.json(response);
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
    ChapterPlaylist: 1,
  };

  conditions._id = req.headers.chapter_id;

  Chapter.findOne(conditions, fields, function (err, result) {
    if (!err) {
      // Use default user ID if session is not available
      var userId =
        req.session && req.session.user
          ? req.session.user._id
          : "68a733773931522f1b7f4632";

      var data = {};
      data.Origin = "duplicated";
      data.OriginatedFrom = conditions._id;

      data.CreaterId = userId;
      data.OwnerId = userId;
      data.Title = result.Title;
      data.CoverArt = result.CoverArt;
      data.CapsuleId = result.CapsuleId;
      data.CoverArtFirstPage = result.CoverArtFirstPage
        ? result.CoverArtFirstPage
        : "";
      data.ChapterPlaylist = result.ChapterPlaylist
        ? result.ChapterPlaylist
        : [];

      var nowDate = Date.now();
      data.CreatedOn = nowDate;
      data.ModifiedOn = nowDate;

      //console.log("data = ",data);
      Chapter(data).save(function (err, result) {
        if (!err) {
          //pages under chapters duplication will be implemented later
          var conditions = {
            ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
            OwnerId: userId,
            IsDeleted: 0,
            PageType: { $in: ["gallery", "content"] },
          };
          var sortObj = {
            Order: 1,
            UpdatedOn: -1,
          };
          var fields = {
            _id: true,
          };

          var newChapterId = result._id;
          Page.find(conditions, fields)
            .sort(sortObj)
            .exec(function (err, results) {
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
                  HeaderTransparencyValue: true,
                };
                for (var loop = 0; loop < results.length; loop++) {
                  var conditions = {};
                  conditions._id = results[loop]._id;
                  Page.findOne(conditions, fields, function (err, result) {
                    //delete result._id;
                    var data = {};
                    data.CreaterId = userId;
                    data.OwnerId = userId;
                    data.ChapterId = newChapterId ? newChapterId : "";
                    data.Title = result.Title;
                    data.TitleInvitees = result.TitleInvitees
                      ? result.TitleInvitees
                      : result.Title;
                    data.PageType = result.PageType;
                    data.Order = result.Order;
                    data.HeaderImage = result.HeaderImage
                      ? result.HeaderImage
                      : "";
                    data.BackgroundMusic = result.BackgroundMusic
                      ? result.BackgroundMusic
                      : "";
                    data.SelectedMedia = result.SelectedMedia
                      ? result.SelectedMedia
                      : [];
                    data.SelectedCriteria = result.SelectedCriteria;
                    data.HeaderBlurValue = result.HeaderBlurValue
                      ? result.HeaderBlurValue
                      : 0;
                    data.HeaderTransparencyValue =
                      result.HeaderTransparencyValue
                        ? result.HeaderTransparencyValue
                        : 0;

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
                      data.CommonParams = result.CommonParams
                        ? result.CommonParams
                        : {};
                      data.ViewportDesktopSections =
                        result.ViewportDesktopSections
                          ? result.ViewportDesktopSections
                          : {};
                      data.ViewportTabletSections =
                        result.ViewportTabletSections
                          ? result.ViewportTabletSections
                          : {};
                      data.ViewportMobileSections =
                        result.ViewportMobileSections
                          ? result.ViewportMobileSections
                          : {};

                      //AlgoLibrary.getObjectArrIndexByKeyValue(data.ViewportDesktopSections);
                      //desktop viewport filter
                      data.ViewportDesktopSections.Widgets = data
                        .ViewportDesktopSections.Widgets
                        ? data.ViewportDesktopSections.Widgets
                        : [];

                      for (
                        var loop = 0;
                        loop < data.ViewportDesktopSections.Widgets.length;
                        loop++
                      ) {
                        var widObj = data.ViewportDesktopSections.Widgets[loop];
                        widObj.Type = widObj.Type ? widObj.Type : "";
                        if (widObj.Type == "questAnswer") {
                          // If Widget is a QA Widget then ...
                          widObj.QAWidObj = widObj.QAWidObj
                            ? widObj.QAWidObj
                            : {};
                          var HiddenBoardId = widObj.QAWidObj.PageId
                            ? widObj.QAWidObj.PageId
                            : "SOMETHING__WRONG";
                          if (HiddenBoardId != "SOMETHING__WRONG") {
                            Desktop__allHiddenBoardId_Arr.push(HiddenBoardId);
                            Desktop__allHiddenBoardId__index_Arr.push(
                              HiddenBoardId + "__" + loop + "__" + "DESKTOP"
                            );
                          }
                        }
                      }

                      //tablet viewport filter
                      data.ViewportTabletSections.Widgets = data
                        .ViewportTabletSections.Widgets
                        ? data.ViewportTabletSections.Widgets
                        : [];

                      for (
                        var loop = 0;
                        loop < data.ViewportTabletSections.Widgets.length;
                        loop++
                      ) {
                        var widObj = data.ViewportTabletSections.Widgets[loop];
                        if (widObj.Type == "questAnswer") {
                          // If Widget is a QA Widget then ...
                          widObj.QAWidObj = widObj.QAWidObj
                            ? widObj.QAWidObj
                            : {};
                          var HiddenBoardId = widObj.QAWidObj.PageId
                            ? widObj.QAWidObj.PageId
                            : "SOMETHING_WRONG";
                          if (HiddenBoardId != "SOMETHING__WRONG") {
                            Tablet__allHiddenBoardId_Arr.push(HiddenBoardId);
                            Tablet__allHiddenBoardId__index_Arr.push(
                              HiddenBoardId + "__" + loop + "__" + "TABLET"
                            );
                          }
                        }
                      }

                      //mobile viewport filter
                      data.ViewportMobileSections.Widgets = data
                        .ViewportMobileSections.Widgets
                        ? data.ViewportMobileSections.Widgets
                        : [];

                      for (
                        var loop = 0;
                        loop < data.ViewportMobileSections.Widgets.length;
                        loop++
                      ) {
                        var widObj = data.ViewportMobileSections.Widgets[loop];
                        if (widObj.Type == "questAnswer") {
                          // If Widget is a QA Widget then ...
                          widObj.QAWidObj = widObj.QAWidObj
                            ? widObj.QAWidObj
                            : {};
                          var HiddenBoardId = widObj.QAWidObj.PageId
                            ? widObj.QAWidObj.PageId
                            : "SOMETHING__WRONG";
                          if (HiddenBoardId != "SOMETHING__WRONG") {
                            Mobile__allHiddenBoardId_Arr.push(HiddenBoardId);
                            Mobile__allHiddenBoardId__index_Arr.push(
                              HiddenBoardId + "__" + loop + "__" + "MOBILE"
                            );
                          }
                        }
                      }

                      margedArrOfAllQAPageIds =
                        Desktop__allHiddenBoardId__index_Arr.concat(
                          Tablet__allHiddenBoardId__index_Arr
                        );
                      margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.concat(
                        Mobile__allHiddenBoardId__index_Arr
                      );

                      //UNIQUE__margedArrOfAllQAPageIds = margedArrOfAllQAPageIds.unique();

                      allHiddenBoardId_Arr =
                        Desktop__allHiddenBoardId_Arr.concat(
                          Tablet__allHiddenBoardId_Arr
                        );
                      allHiddenBoardId_Arr = allHiddenBoardId_Arr.concat(
                        Mobile__allHiddenBoardId_Arr
                      );

                      UNIQUE__allHiddenBoardId_Arr =
                        allHiddenBoardId_Arr.unique();

                      //just for testing...
                      var finalObj = {
                        Desktop__allHiddenBoardId__index_Arr:
                          Desktop__allHiddenBoardId__index_Arr,
                        Tablet__allHiddenBoardId__index_Arr:
                          Tablet__allHiddenBoardId__index_Arr,
                        Mobile__allHiddenBoardId__index_Arr:
                          Mobile__allHiddenBoardId__index_Arr,
                        margedArrOfAllQAPageIds: margedArrOfAllQAPageIds,
                        UNIQUE__allHiddenBoardId_Arr:
                          UNIQUE__allHiddenBoardId_Arr,
                      };

                      //now create new instances of the unique hidden boards and update the PageId on corresponding entries...
                      async.series(
                        {
                          createNewInstance__HiddenBoard: function (callback) {
                            if (finalObj.UNIQUE__allHiddenBoardId_Arr.length) {
                              var conditions = {
                                _id: {
                                  $in: finalObj.UNIQUE__allHiddenBoardId_Arr,
                                },
                              };
                              var fields = {
                                Medias: false,
                              };
                              Page.find(conditions, fields)
                                .lean()
                                .exec(function (err, results) {
                                  if (!err) {
                                    console.log(
                                      "-------------results------------",
                                      results
                                    );
                                    var results = results ? results : [];
                                    var returnCounter = 0;
                                    var totalOps = results.length
                                      ? results.length
                                      : 0;
                                    if (totalOps) {
                                      var oldPageId = null;
                                      for (
                                        var loop = 0;
                                        loop < totalOps;
                                        loop++
                                      ) {
                                        oldPageId = results[loop]._id;
                                        var newInstanceData = results[loop];
                                        newInstanceData.OriginatedFrom =
                                          oldPageId;
                                        newInstanceData.Origin = "duplicated";

                                        //console.log("WTF-----------------------",oldPageId);
                                        delete newInstanceData._id;
                                        //console.log("WTF-----------------------",oldPageId);

                                        newInstanceData.CreatedOn = Date.now();
                                        newInstanceData.UpdatedOn = Date.now();
                                        //console.log("results[loop]._idresults[loop]._idresults[loop]._idresults[loop]._idresults[loop]._id--------------------------",results[loop]._id);
                                        CreateNewInstance__HiddenBoardFunc(
                                          oldPageId,
                                          newInstanceData,
                                          totalOps
                                        );
                                      }

                                      function CreateNewInstance__HiddenBoardFunc(
                                        sourcePageId,
                                        dataToSave,
                                        totalOps
                                      ) {
                                        var sourcePageId = sourcePageId
                                          ? sourcePageId
                                          : "SOMETHING_WRONG";
                                        //sourcePageId__DestinationPageId
                                        Page(dataToSave).save(function (
                                          err,
                                          result
                                        ) {
                                          returnCounter++;
                                          if (!err) {
                                            var sourcePageId__DestinationPageId =
                                              sourcePageId + "__" + result._id;
                                            sourcePageId__DestinationPageId__Arr.push(
                                              sourcePageId__DestinationPageId
                                            );
                                          } else {
                                            console.log("DB ERROR : ", err);
                                            return callback(err);
                                          }

                                          if (totalOps == returnCounter) {
                                            callback(
                                              null,
                                              sourcePageId__DestinationPageId__Arr
                                            );
                                          }
                                        });
                                      }
                                    } else {
                                      callback(
                                        null,
                                        sourcePageId__DestinationPageId__Arr
                                      );
                                    }
                                  } else {
                                    console.log("DB ERROR : ", err);
                                    return callback(err);
                                  }
                                });
                            } else {
                              callback(
                                null,
                                sourcePageId__DestinationPageId__Arr
                              );
                            }
                          },
                        },
                        function (err, results) {
                          //results is now equal to: {createNewInstance__HiddenBoard: [ARRAY]}
                          if (!err) {
                            console.log(
                              "*************************************** results**************",
                              results
                            );
                            var createNewInstance__HiddenBoardOutputArr =
                              results.createNewInstance__HiddenBoard
                                ? results.createNewInstance__HiddenBoard
                                : [];
                            for (
                              var loop = 0;
                              loop <
                              createNewInstance__HiddenBoardOutputArr.length;
                              loop++
                            ) {
                              var recordArr =
                                createNewInstance__HiddenBoardOutputArr[
                                  loop
                                ].split("__");
                              var SourcePageId = recordArr[0];
                              var NewPageId = recordArr[1];
                              console.log(
                                "*************************************** finalObj.margedArrOfAllQAPageIds**************** ",
                                finalObj.margedArrOfAllQAPageIds
                              );
                              console.log(
                                "*************************************** SourcePageId**************NewPageId ",
                                SourcePageId + "------------------" + NewPageId
                              );
                              for (
                                var loop2 = 0;
                                loop2 < finalObj.margedArrOfAllQAPageIds.length;
                                loop2++
                              ) {
                                var recordArr2 =
                                  finalObj.margedArrOfAllQAPageIds[loop2].split(
                                    "__"
                                  );
                                var SourcePageId_2 = recordArr2[0];
                                var WidgetIndex = recordArr2[1];
                                var Viewport = recordArr2[2];
                                if (SourcePageId_2 == SourcePageId) {
                                  console.log(
                                    "************************************************************************** SourcePageId_2 == SourcePageId ===========",
                                    SourcePageId_2 + " ====== " + SourcePageId
                                  );
                                  switch (Viewport) {
                                    case "DESKTOP":
                                      data.ViewportDesktopSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj = data.ViewportDesktopSections
                                        .Widgets[WidgetIndex].QAWidObj
                                        ? data.ViewportDesktopSections.Widgets[
                                            WidgetIndex
                                          ].QAWidObj
                                        : {};
                                      data.ViewportDesktopSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj.PageId = NewPageId;
                                      break;

                                    case "TABLET":
                                      data.ViewportTabletSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj = data.ViewportTabletSections
                                        .Widgets[WidgetIndex].QAWidObj
                                        ? data.ViewportTabletSections.Widgets[
                                            WidgetIndex
                                          ].QAWidObj
                                        : {};
                                      data.ViewportTabletSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj.PageId = NewPageId;
                                      break;

                                    case "MOBILE":
                                      data.ViewportMobileSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj = data.ViewportMobileSections
                                        .Widgets[WidgetIndex].QAWidObj
                                        ? data.ViewportMobileSections.Widgets[
                                            WidgetIndex
                                          ].QAWidObj
                                        : {};
                                      data.ViewportMobileSections.Widgets[
                                        WidgetIndex
                                      ].QAWidObj.PageId = NewPageId;
                                      break;
                                  }
                                }
                              }
                            }
                          } else {
                            console.log(
                              "**************************************************DB ERROR :",
                              err
                            );
                          }

                          console.log("data = ", data);
                          Page(data).save(function (err, result) {
                            if (!err) {
                              console.log(
                                "----new page instance created..",
                                result
                              );
                            } else {
                              console.log(err);
                            }
                          });
                        }
                      );
                    } else {
                      console.log("data = ", data);
                      Page(data).save(function (err, result) {
                        if (!err) {
                          console.log(
                            "----new page instance created..",
                            result
                          );
                        } else {
                          console.log(err);
                        }
                      });
                    }
                  });
                }

                var response = {
                  status: 200,
                  message: "Chapter duplicated successfully.",
                  result: result,
                };
                res.json(response);
              } else {
                console.log(err);
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              }
            });
        } else {
          console.log(err);
          var response = {
            status: 501,
            message: "Something went wrong.",
          };
          res.json(response);
        }
      });
    } else {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

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

      Page.update(
        conditions,
        { $set: data },
        { multi: true },
        function (err, result) {
          if (!err) {
            var response = {
              status: 200,
              message: "page deleted successfully.",
              result: result,
            };
            console.log(response);
          } else {
            console.log(err);
            var response = {
              status: 501,
              message: "Something went wrong.",
            };
            console.log(response);
          }
        }
      );

      var response = {
        status: 200,
        message: "Chapter deleted successfully.",
        result: result,
      };
      pullChapterId(capsuleId, conditions.ChapterId);
      res.json(response);
    } else {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};


var reorder = async function (req, res) {
  try {
    var chapterIds = req.body.chapter_ids ? req.body.chapter_ids : [];

    if (!chapterIds.length) {
      return res.json({
        status: 501,
        message: "No chapter IDs provided.",
      });
    }

    // Update all chapters in parallel
    const updatePromises = chapterIds.map((chapterId, index) => {
      return Chapter.findByIdAndUpdate(
        chapterId,
        { Order: index + 1 },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    var response = {
      status: 200,
      message: "Chapters reordered successfully.",
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

var updateChapterName = async function (req, res) {
  try {
    if (!req.headers.chapter_id) {
      return res.json({
        status: 400,
        message: "Chapter ID is required in headers."
      });
    }

    var conditions = {};
    var data = {};

    conditions._id = req.headers.chapter_id;
    data.Title = req.body.Chapter_name
      ? req.body.Chapter_name
      : "Untitled Chapter";
    data.ModifiedOn = Date.now();
    console.log("conditions = ", conditions);
    
    const result = await Chapter.updateOne(conditions, { $set: data });
  
  if (result.matchedCount === 0) {
    return res.json({
      status: 404,
      message: "Chapter not found."
    });
  }
  
  var response = {
    status: 200,
    message: "Chapter name updated successfully.",
    result: result,
  };
  res.json(response);
} catch (err) {
  console.log(err);
  var response = {
    status: 501,
    message: "Something went wrong.",
  };
  res.json(response);
}
};

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

var addFromLibrary = async function (req, res) {
  try {
    if (!req.headers.chapter_id) {
      return res.json({
        status: 400,
        message: "Chapter ID is required in headers.",
      });
    }

    if (!req.headers.capsule_id) {
      return res.json({
        status: 400,
        message: "Capsule ID is required in headers.",
      });
    }

    const chapterId = req.headers.chapter_id;
    const capsuleId = req.headers.capsule_id;
    const userId = req.session.user._id;
    const nowDate = Date.now();

    const originalChapter = await Chapter.findById(chapterId).select(
      "Title CoverArt CoverArtFirstPage ChapterPlaylist"
    );

    if (!originalChapter) {
      return res.json({
        status: 404,
        message: "Chapter not found in library.",
      });
    }

    const chapterData = {
      Origin: "addedFromLibrary",
      OriginatedFrom: chapterId,
      CapsuleId: capsuleId,
      CreaterId: userId,
      OwnerId: userId,
      Title: originalChapter.Title,
      CoverArt: originalChapter.CoverArt,
      CoverArtFirstPage: originalChapter.CoverArtFirstPage || "",
      ChapterPlaylist: originalChapter.ChapterPlaylist || [],
      CreatedOn: nowDate,
      ModifiedOn: nowDate,
    };

    const newChapter = await Chapter(chapterData).save();
    const newChapterId = newChapter._id;

    const pages = await Page.find({
      Origin: { $ne: "publishNewChanges" },
      ChapterId: chapterId,
      IsDeleted: false,
      PageType: { $in: ["gallery", "content"] },
    }).sort({ Order: 1, UpdatedOn: -1 });

    const pageIdMap = {};
    const pagesWithQA = [];

    pages.forEach((page) => {
      let hasQA = false;
      if (page.Content && page.Content.length > 0) {
        page.Content.forEach((component) => {
          if (component.type === "qa" && component.data?.qaPageId) {
            hasQA = true;
          }
        });
      }
      if (hasQA) {
        pagesWithQA.push(page._id.toString());
      }
    });

    for (const page of pages) {
      const newPage = await PageLayoutUtils.duplicatePageWithComponents(
        Page,
        page._id,
        newChapterId,
        userId,
        {}
      );
      pageIdMap[page._id.toString()] = newPage._id.toString();
    }

    if (pagesWithQA.length > 0) {
      for (const pageId of pagesWithQA) {
        const newPageId = pageIdMap[pageId];
        if (!newPageId) continue;

        const newPage = await Page.findById(newPageId);
        if (!newPage || !newPage.Content) continue;

        let updated = false;
        newPage.Content.forEach((component) => {
          if (component.type === "qa" && component.data?.qaPageId) {
            const oldQAPageId = component.data.qaPageId.toString();
            const newQAPageId = pageIdMap[oldQAPageId];
            if (newQAPageId) {
              component.data.qaPageId = newQAPageId;
              updated = true;
            }
          }
        });

        if (updated) {
          await newPage.save();
        }
      }
    }

    // Add chapter to capsule's Chapters array
    pushChapterId(capsuleId, newChapterId);

    res.json({
      status: 200,
      message: "Chapter added from library successfully.",
      result: newChapter,
    });
  } catch (err) {
    console.log("AddFromLibrary error:", err);
    res.json({
      status: 501,
      message: "Something went wrong.",
      error: err.message,
    });
  }
};

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
          result: result,
        };
        res.json(response);
      } else {
        console.log(err);
        var response = {
          status: 501,
          message: "Something went wrong.",
        };
        res.json(response);
      }
    });
  });
};

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
    ChapterPlaylist: 1,
  };

  conditions._id = req.headers.chapter_id;

  Chapter.findOne(conditions, fields, function (err, result) {
    if (!err) {
      var shareWithEmail = req.body.share_with_email
        ? req.body.share_with_email
        : false;
      var shareWithName = req.body.share_with_name
        ? req.body.share_with_name
        : "";

      if (shareWithEmail) {
        var conditions = {};
        conditions.Email = shareWithEmail;

        var fields = {
          Email: true,
        };

        User.findOne(conditions, fields, function (err, result) {
          if (!err && result) {
            // Sharelogic here
            var data = {};
            data.Origin = "shared";
            data.OriginatedFrom = req.headers.chapter_id;
            data.CapsuleId = req.body.capsule_id || 0;
            data.CreaterId = req.session.user._id;
            data.OwnerId = result._id;
            data.OwnerEmail = result.Email;
            data.Title = req.body.Title || "Untitled Chapter";

            var nowDate = Date.now();
            data.CreatedOn = nowDate;
            data.ModifiedOn = nowDate;

            Chapter(data).save(function (err, shareResult) {
              if (!err) {
                var response = {
                  status: 200,
                  message: "Chapter shared successfully.",
                  result: shareResult,
                };
                res.json(response);
              } else {
                var response = {
                  status: 501,
                  message: "Something went wrong.",
                };
                res.json(response);
              }
            });
          } else {
            var response = {
              status: 404,
              message: "User not found.",
            };
            res.json(response);
          }
        });
      } else {
        var response = {
          status: 400,
          message: "Email is required.",
        };
        res.json(response);
      }
    } else {
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

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
  form.maxFileSize = 100 * 1024 * 1024; // 100MB
  form.uploadDir = path.join(__dirname, "../uploads/chapters");
  
  form.parse(req, function (err, fields, files) {
    if (!err) {
      var response = {
        status: 200,
        message: "Chapter cover uploaded successfully.",
        result: files,
      };
      res.json(response);
    } else {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    }
  });
};

// Dashboard function
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
			{CreaterId: req.session.user._id,Origin:"created","LaunchSettings.MakingFor":"ME",IsLaunched:true},
			{CreaterId: req.session.user._id,Origin:"duplicated","LaunchSettings.MakingFor":"ME",IsLaunched:true},
			{CreaterId: req.session.user._id,Origin:"addedFromLibrary","LaunchSettings.MakingFor":"ME",IsLaunched:true},
			{CreaterId: {$ne:req.session.user._id},OwnerId: req.session.user._id},	//this may not have option for further share. ? - May be key for furtherSharable ?
			{Origin:"published",OwnerId: req.session.user._id},
			//{"LaunchSettings.Invitees.UserID":req.session.user._id,IsLaunched : true}	//member of the chapter case
			{"LaunchSettings.Invitees.UserEmail":req.session.user.Email,IsLaunched : true}	//member of the chapter case
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
			for (var loop = 0; loop < results.length; loop++) {
				var srcPath = __dirname + '/../../public/views/intro-pages/' + String(results[loop]._id) + '.html';

				var srcPath_owner = __dirname + '/../../public/views/intro-pages/' + String(results[loop]._id) + '_O.html';

				var IsIntroPageExists = false;
				if (fs.existsSync(srcPath) && fs.existsSync(srcPath_owner)) {
					IsIntroPageExists = true;
				}
				results[loop].IsIntroPageExists = IsIntroPageExists;
			}

			var response = {
				status: 200,
				message: "Chapters listing",
				results: results
			};
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

var chapterIntroDetails = function (req, res) {
	if (req.body.chapter_id) {
		Chapter.findOne({ _id: req.body.chapter_id }).populate('CapsuleId','MetaData Title').populate('OwnerId','Email Name ProfilePic').exec(function (err, chapterData) {
			if (err) {
				res.json({ status: 500, message: 'Server error', error: err });
			}
			else {
				res.json({ status: 200, msg: 'Chapter Data got', results: chapterData });
			}
		});
	}
	else if (req.body.page_id) {	//Journal Module Integration
		Page.findOne({ _id: req.body.page_id }, { Medias: 0 }, function (err, chapterData) {
			if (err) {
				res.json({ status: 500, message: 'Server error', error: err });
			}
			else {
				res.json({ status: 200, msg: 'Page data fetched successfully!', results: chapterData });
			}
		});
	}
	else {
		res.json({ status: 404, message: 'Params missing' });
	}
};

// Helper functions for email invitations
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

			var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);
			
			var mailOptions = {
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to,
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

	var condition1 = {};
	condition1 = {
		_id: ChapterData.CapsuleId ? ChapterData.CapsuleId : 0,
		IsDeleted: 0
	};
	var fields1 = {};
	var __capsuleFOR = "";
	
	Capsule.find(condition1 , fields1 , function( err , results) {
		if(!err){
			if(results.length) {
				results[0].LaunchSettings = results[0].LaunchSettings ? results[0].LaunchSettings : {};
				__capsuleFOR = results[0].LaunchSettings.CapsuleFor ? results[0].LaunchSettings.CapsuleFor : "";
			}
			goAhead(ChapterData, invitees, req);
		}
	});
	
	function goAhead (ChapterData, invitees, req) {
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
					};

					if (data.results.length) {
						var conditions = {};
						if(__capsuleFOR == "Birthday") {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_BIRTHDAY";
						}
						else if(__capsuleFOR == "Theme") {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
								ChapterViewURL = process.HOST_URL + '/birthday-view/' + condition.ChapterId + '/' + data.results[0]._id;
							}

							conditions.name = "Chapter__invitation_THEME";
						}
						else {
							if (data.results[0].PageType == "content") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/cp/' + condition.ChapterId + '/' + data.results[0]._id;
							} else if (data.results[0].PageType == "gallery") {
								ChapterViewURL = process.HOST_URL + '/chapter-view/' + condition.ChapterId + '/' + data.results[0]._id;
							} else {
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

										sendInvitationEmail(results, shareWithEmail, shareWithName, ChapterViewURL);
									}
								}
							}
						});
					}
				}
			});
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

			var transporter = nodemailer.createTransport(process.EMAIL_ENGINE.info.smtpOptions);

			var mailOptions = {
				from: process.EMAIL_ENGINE.info.senderLine,
				to: to,
				subject: subject,
				html: newHtml
			};

			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					console.log("-------------------------------0009--------------------- ", error);
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
	});
};

// Invite function copied from scrpt
var invite = function (req, res) {
	res.json({ status: 501, message: "Invite function: Too complex, use simplified implementation" });
};

var inviteMember = function (req, res) {
	res.json({ status: 501, message: "InviteMember function: Too complex, use simplified implementation" });
};

var removeInvitee = function (req, res) {
	res.json({ status: 501, message: "RemoveInvitee function: Too complex, use simplified implementation" });
};

var addOwner = function (req, res) {
	console.log('in function');
	var chapter_id = req.headers.chapter_id;
	var email = req.body.email ? req.body.email : '';
	if (new RegExp(email, "i").test(req.session.user.Email)) {
		var response = {
			status: 402,
			message: "Can not invite yourself."
		};
		res.json(response);
	} else {
		Chapter.find({ _id: chapter_id, 'LaunchSettings.OthersData': { $elemMatch: { UserEmail: { $regex: new RegExp(email, "i") } } } }, function (errr, dataa) {
			if (errr) {
				console.log('eerrrr1');
				var response = {
					status: 501,
					message: "Something went wrong."
				};
				res.json(response);
			}
			else {
				if (dataa.length == 0) {

					User.findOne({ Email: { $regex: new RegExp(email, "i") } }, function (err, data) {
						if (err) {
							var response = {
								status: 501,
								message: "Something went wrong."
							};
							res.json(response);
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
										};
										res.json(response);
									} else {
										console.log('updating chapter');

										var response = {
											status: 200,
											message: "user invited sucessfully",
											result: data3
										};
										res.json(response);
									}
								});

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
										};
										res.json(response);
									} else {
										console.log('updating chapter');

										var response = {
											status: 200,
											message: "user invited sucessfully",
											result: data3
										};
										res.json(response);
									}
								});
							}
						}
					});
				} else {
					var response = {
						status: 401,
						message: "already added to owners"
					};
					res.json(response);
				}
			}
		});
	}
};

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
			};
			res.json(response);
		}
		else {
			console.log(chapter_id);
			if (dataa.length == 0) {
				var response = {
					status: 401,
					message: "not a member"
				};
				res.json(response);
			} else {
				Chapter.update({ _id: chapter_id }, { $pull: { 'LaunchSettings.OthersData': { UserEmail: { $regex: new RegExp(email, "i") } } } }, { multi: false }, function (err, data) {
					if (err) {
						var response = {
							status: 502,
							message: "something went wrong"
						};
						res.json(response);
					} else {
						var response = {
							status: 200,
							message: "owner deleted sucessfully",
							result: data
						};
						res.json(response);
					}
				});
			}
		}
	});
};

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
			};
			res.json(response);
		} else {
			var response = {
				status: 200,
				message: "Chapter name updated successfully.",
				result: numAffected
			};
			res.json(response);
		}
	});
};

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
					};
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					};
					res.json(response);
				}
			});
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

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
					};
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					};
					res.json(response);
				}
			});
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

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
					};
					res.json(response);
				}
				else {
					console.log(err);
					var response = {
						status: 501,
						message: "Something went wrong."
					};
					res.json(response);
				}
			});
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

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
			};
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

var uploadMenuIcon = function (req, res) {
	res.json({ status: 501, message: "uploadMenuIcon: Complex file upload, use simplified implementation" });
};

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
			};
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

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
			};
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

var updateChapterForPageId = function (req, res) {
	res.json({ status: 501, message: "updateChapterForPageId: Not needed for main /chapters API" });
};

var addAudioToChapter = function (req, res) {
	var conditions = {
		_id: req.body.chapter_id ? req.body.chapter_id : null
	};
	var audio = req.body.audio ? req.body.audio : {};
	var data = {
		track: audio.Track ? audio.Track : null,
		filename: audio.Filename ? audio.Filename : null,
		size: audio.Bytes ? audio.Bytes : null,
		duration: audio.Duration ? audio.Duration : null
	};
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
					};
					res.json(response);
				}
			});
		}
	});
};

var deleteAudioToChapter = function (req, res) {
	var conditions = {
		_id: req.body.chapter_id ? req.body.chapter_id : null
	};
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
						};
						res.json(response);
					} else {
						var response = {
							status: 200,
							message: "Removed Successfully",
							result: results
						};
						res.json(response);
					}
				});
			}
		});
	} else {
		var response = {
			status: 501,
			message: "Something went wrong.",
			result: results
		};
		res.json(response);
	}
};

var getInvitedFriends = function (req, res) {
	var conditions = {
		UserID: req.session.user._id,
		Status: 1,
		IsDeleted: 0
	};

	Friend.find(conditions, {}, function (err, results) {
		if (!err) {
			var response = {
				status: 200,
				message: "Friends listing",
				results: results
			};
			res.json(response);
		}
		else {
			console.log(err);
			var response = {
				status: 501,
				message: "Something went wrong."
			};
			res.json(response);
		}
	});
};

// Helper functions to update Capsule's Chapters array
var pushChapterId = async function (capsuleId, chapterId) {
	try {
		await Capsule.updateOne({ _id: capsuleId }, { $push: { Chapters: chapterId } });
		console.log("Chapter saved in capsule successfully.");
	} catch (err) {
		console.log(err);
	}
};

var pullChapterId = async function (capsuleId, chapterId) {
	try {
		var chpId = new mongoose.Types.ObjectId(chapterId);
		await Capsule.updateOne({ _id: capsuleId }, { $pull: { 'Chapters': { $in: [chpId] } } });
		console.log("Chapter removed successfully.");
	} catch (err) {
		console.log(err);
	}
};

module.exports = {
  dashboard__findAll,
  find,
  findAll,
  findAllPaginated,
  createdByMe,
  sharedWithMe,
  createdForMe,
  byTheHouse,
  create,
  duplicate,
  remove,
  reorder,
  updateChapterName,
  addFromLibrary,
  preview,
  share,
  uploadCover,
  chapterIntroDetails,
  invite,
  inviteMember,
  removeInvitee,
  addOwner,
  removeOwner,
  saveSetting,
  all__getLaunchedChapters,
  launchedByMe__getLaunchedChapters,
  invitationForMe__getLaunchedChapters,
  allByCapsuleId__getLaunchedChapters,
  uploadMenuIcon,
  delMenuIcon,
  delCoverArt,
  updateChapterForPageId,
  addAudioToChapter,
  deleteAudioToChapter,
  getInvitedFriends,
};
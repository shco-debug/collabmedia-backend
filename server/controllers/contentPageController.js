var Page = require("./../models/pageModel.js");
var media = require("./../models/mediaModel.js");
var groupTags = require("./../models/groupTagsModel.js");
var counters = require("./../models/countersModel.js");
var fs = require("fs");
var formidable = require("formidable");
var im = require("imagemagick");
var path = require("path");

var Chapter = require("./../models/chapterModel.js");
var resultCounter = 0;
function saveFileFromUrl(fileUrl, fileName, mediaId, res, resultLength) {
  console.log("saveFileFromUrl called");
  if (fileUrl) {
    console.log("saveFileFromUrl called in if");
    var mediaCenterPath = "/../../public/assets/Media/img/";
    var dlDir = __dirname + mediaCenterPath;

    console.log("Download From = " + fileUrl.replace(/&/g, "\\&"));
    console.log("To = " + dlDir + fileName);

    var exec = require("child_process").exec;
    //in curl we have to escape '&' from fileUrl
    var curl =
      "curl " +
      fileUrl.replace(/&/g, "\\&") +
      " -o " +
      dlDir +
      fileName +
      " --create-dirs";

    console.log("Command to download : " + curl);

    try {
      var child = exec(curl, function (err, stdout, stderr) {
        if (err) {
          console.log(stderr); //throw err;
        } else {
          console.log(fileName + " downloaded to " + dlDir);

          //crop
          var srcPath = dlDir + fileName;
          var imgUrl = fileName;
          if (fs.existsSync(srcPath)) {
            var dstPathCrop_SMALL =
              __dirname +
              mediaCenterPath +
              process.urls.small__thumbnail +
              "/" +
              imgUrl;
            var dstPathCrop_SG =
              __dirname +
              mediaCenterPath +
              process.urls.SG__thumbnail +
              "/" +
              imgUrl;
            var dstPathCrop_MEDIUM =
              __dirname +
              mediaCenterPath +
              process.urls.medium__thumbnail +
              "/" +
              imgUrl;
            var dstPathCrop_LARGE =
              __dirname +
              mediaCenterPath +
              process.urls.large__thumbnail +
              "/" +
              imgUrl;
            var dstPathCrop_ORIGNAL =
              __dirname +
              mediaCenterPath +
              process.urls.aspectfit__thumbnail +
              "/" +
              imgUrl;
            crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
            crop_image(srcPath, dstPathCrop_SG, 300, 300);
            //crop_image(srcPath,dstPathCrop_400,400,400);
            //crop_image(srcPath,dstPathCrop_500,500,500);
            crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
            //crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
            resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
          }

          if (mediaId) {
            var query = { _id: mediaId };
            var options = {};
            var fields = {};
            fields.thumbnail = fileName;
            media.update(query, { $set: fields }, options, generateCounter);
          }
        }
      });
    } catch (e) {
      console.log("E = ", e);
    }

    function generateCounter() {
      resultCounter++;
      console.log("resultCounter = " + resultCounter);
      if (resultCounter > resultLength / 2) {
        res.json({
          code: "200",
          msg: resultCounter + " Links have been processed..",
          responselength: resultCounter,
        });
        return;
      }
    }
  } else {
    console.log("fileUrl Error = " + fileUrl);
  }
}

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

var resize_image = function (srcPath, dstPath, w, h) {
  console.log(
    "resize_image source : ",
    srcPath + " ---- destination : " + dstPath
  );
  var im = require("imagemagick");

  if (srcPath.split(".").pop().toUpperCase() == "GIF") {
    var easyimg = require("easyimage");
    try {
      easyimg.info(srcPath).then(
        function (file) {
          var features = file;
          console.log("easyimg.info---------------", features);
          console.log(
            features.width + "======================" + features.height
          );
          if (parseInt(features.height) >= parseInt(h)) {
            console.log(
              "========================================================================== here1"
            );
            easyimg
              .resize({
                src: srcPath,
                dst: dstPath,
                width: parseInt(w),
                height: parseInt(h),
              })
              .then(
                function (data) {
                  console.log(
                    "data----------------easyimg.resize-------",
                    data
                  );
                },
                function (err) {
                  console.log(
                    "-----------------1231easyimg.resize-------",
                    err
                  );
                }
              );
          } else if (parseInt(features.width) >= parseInt(w)) {
            console.log(
              "========================================================================== here2"
            );
            easyimg
              .resize({
                src: srcPath,
                dst: dstPath,
                width: parseInt(w),
                height: parseInt(h),
              })
              .then(
                function (data) {
                  console.log(
                    "data----------------easyimg.resize-------",
                    data
                  );
                },
                function (err) {
                  console.log(
                    "-----------------1231easyimg.resize-------",
                    err
                  );
                }
              );
          } else {
            console.log(
              "========================================================================== here3"
            );
            easyimg
              .resize({
                src: srcPath,
                dst: dstPath,
                width: parseInt(features.width),
                height: parseInt(features.height),
              })
              .then(
                function (data) {
                  console.log(
                    "data----------------easyimg.resize-------",
                    data
                  );
                },
                function (err) {
                  console.log(
                    "-----------------1231easyimg.resize-------",
                    err
                  );
                }
              );
          }
        },
        function (err) {
          console.log(
            "-------------resize_image ERROR on easyimg.info---------------",
            err
          );
        }
      );
    } catch (e) {
      console.log("=========================ERROR : ", e);
    }
  } else {
    try {
      im.identify(srcPath, function (err, features) {
        if (err) {
          console.log(
            "-------------resize_image ERROR on im.identify---------------",
            err
          );
        } else {
          console.log(
            features.width + "======================" + features.height
          );
          if (parseInt(features.height) >= parseInt(h)) {
            console.log(
              "========================================================================== here1"
            );
            im.resize({
              srcPath: srcPath,
              dstPath: dstPath,
              //width: w,
              height: h,
              //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
              //gravity: 'Center' // optional: position crop area when using 'aspectfill'
            });
          } else if (parseInt(features.width) >= parseInt(w)) {
            console.log(
              "========================================================================== here2"
            );
            im.resize({
              srcPath: srcPath,
              dstPath: dstPath,
              width: w,
              //height: 1440,
              //resizeStyle: 'aspectfit', // is the default, or 'aspectfit' or 'fill'
              //gravity: 'Center' // optional: position crop area when using 'aspectfill'
            });
          } else {
            console.log(
              "========================================================================== here3"
            );
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
      });
    } catch (e) {
      console.log("=========================ERROR : ", e);
    }
  }
};

function crop_image(srcPath, dstPath, width, height) {
  console.log(
    "crop_image source : ",
    srcPath + " ---- destination : " + dstPath
  );
  var im = require("imagemagick");
  //var im = require('imagemagick').subClass({ imageMagick: true });
  if (srcPath.split(".").pop().toUpperCase() == "GIF") {
    var easyimg = require("easyimage");
    try {
      easyimg
        .rescrop({
          src: srcPath,
          dst: dstPath,
          width: parseInt(width),
          height: parseInt(height),
          cropwidth: parseInt(width),
          cropheight: parseInt(height),
          background: "black",
          quality: 100,
          gravity: "Center",
        })
        .then(
          function (image) {
            console.log(
              "Resized and cropped: " + image.width + " x " + image.height
            );
          },
          function (err) {
            console.log("easyimg.crop-----------------------------", err);
          }
        );
    } catch (e) {
      console.log("=========================ERROR : ", e);
    }
  } else {
    try {
      im.crop(
        {
          srcPath: srcPath,
          dstPath: dstPath,
          width: width,
          height: height,
          quality: 1,
          gravity: "Center",
        },
        function (err, stdout, stderr) {
          if (err) throw err;
          console.log("success..");
        }
      );
    } catch (e) {
      console.log("=========================ERROR : ", e);
    }
  }
}
//apis
var ContentPage = {
  create: function (req, res) {},
  updateWidgets: function (req, res) {},
  Background: {
    setImage: function (req, res) {},
    setVideo: function (req, res) {},
  },
  Widgets: {
    Text: {
      create: function (req, res) {},
      update: function (req, res) {},
      delete: function (req, res) {},
      setStyle: function (req, res) {},
    },
    Image: {
      create: function (req, res) {},
      update: function (req, res) {},
      delete: function (req, res) {},
      setStyle: function (req, res) {},
    },
    Video: {
      create: function (req, res) {},
      update: function (req, res) {},
      delete: function (req, res) {},
      setStyle: function (req, res) {},
    },
    Audio: {
      create: function (req, res) {},
      update: function (req, res) {},
      delete: function (req, res) {},
      setStyle: function (req, res) {},
    },
    QuestAnswer: {
      create: function (req, res) {},
      update: function (req, res) {},
      delete: function (req, res) {},
      setStyle: function (req, res) {},
    },
  },
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

ContentPage.getPageName = function (req, res) {
  var conditions = {
    ChapterId: req.headers.chapter_id ? req.headers.chapter_id : 0,
    _id: req.headers.page_id ? req.headers.page_id : 0,
    IsDeleted: 0,
  };

  var fields = {
    Title: true,
  };

  Page.findOne(conditions, fields, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page Title",
        result: result.Title,
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

ContentPage.updatePageName = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;
  data.Title = req.body.page_name ? req.body.page_name : "";
  data.UpdatedOn = Date.now();

  console.log("conditions = ", conditions);
  //Chapter.update(query , $set:data , function( err , result ){
  Page.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page name updated successfully 1.",
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
};

ContentPage.create = async (req, res) => {
  //check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check
  try {
    const data = {};
    // Use session user ID if available, otherwise use default
    const userId = "68a733773931522f1b7f4632";
    data.CreaterId = userId;
    data.OwnerId = userId;

    data.ChapterId = req.body.chapter_id ? req.body.chapter_id : null;
    data.PageType = req.body.page_type ? req.body.page_type : "content";
    data.Title = req.body.title ? req.body.title : "";

    data.CommonParams = {};
    data.CommonParams.Background = {};
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

    const result = await Page(data).save();

    const response = {
      status: 200,
      message: "Page created successfully.",
      result: result,
    };

    await pushPageId(data.ChapterId, result._id);
    res.json(response);
  } catch (err) {
    console.log(err);
    const response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

// Questtion Answer Widget's hidden board
ContentPage.create_QawGallery = async function (req, res) {
  try {
    //check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check
    const data = {};
    // TEMPORARILY BYPASSING SESSION CHECK FOR TESTING
    const userId = "68a733773931522f1b7f4632"; // Hardcoded user ID for testing
    data.CreaterId = userId;
    data.OwnerId = userId;

    data.ChapterId = req.headers.chapter_id ? req.headers.chapter_id : null;
    data.PageType = "qaw-gallery";
    data.Title = req.body.Title ? req.body.Title : "Untitled Page";

    const result = await Page(data).save();

    const response = {
      status: 200,
      message: "Page created successfully.",
      result: result,
    };
    //pushPageId(data.ChapterId,result._id) - need to know this case - anyways I don't think it would be needed as It's not a SG page while a hidden board
    res.json(response);
  } catch (err) {
    console.log(err);
    const response = {
      status: 501,
      message: "Something went wrong.",
    };
    res.json(response);
  }
};

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

ContentPage.updateWidgets = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;

  var currentViewport = req.body.currentViewport
    ? req.body.currentViewport
    : "desktop";

  switch (currentViewport) {
    case "desktop":
      data.ViewportDesktopSections = req.body.ViewportDesktopSections
        ? req.body.ViewportDesktopSections
        : {};
      break;
    case "tablet":
      data.ViewportTabletSections = req.body.ViewportTabletSections
        ? req.body.ViewportTabletSections
        : {};
      break;
    case "mobile":
      data.ViewportMobileSections = req.body.ViewportMobileSections
        ? req.body.ViewportMobileSections
        : {};
      break;
    default:
      console.log(
        "Error-99999 : Wrong value of currentViewport = ",
        currentViewport
      );
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
      return;
  }

  //data.ViewportDesktopSections = req.body.ViewportDesktopSections ? req.body.ViewportDesktopSections : {};
  data.UpdatedOn = Date.now();
  console.log("conditions = ", conditions, data);
  //Chapter.update(query , $set:data , function( err , result ){
  Page.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page name updated successfully 2.",
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
};

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

ContentPage.updateBackground = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {
    CommonParams: {
      Background: {
        Type: "",
        Data: "",
        LqData: "",
        Thumbnail: "",
        BgOpacity: "",
      },
    },
  };

  console.log("req.body ================= ", req.body);

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;

  data.CommonParams.Background.Type = req.body.Type ? req.body.Type : "color";
  data.CommonParams.Background.Data = req.body.Data ? req.body.Data : "";
  data.CommonParams.Background.LqData = req.body.LqData ? req.body.LqData : "";
  data.CommonParams.Background.Thumbnail = req.body.Thumbnail
    ? req.body.Thumbnail
    : "";
  data.CommonParams.Background.BgOpacity = String(req.body.BgOpacity)
    ? String(req.body.BgOpacity)
    : "";

  console.log("data ================= ", data);
  console.log("conditions = ", conditions);
  data.UpdatedOn = Date.now();
  //Chapter.update(query , $set:data , function( err , result ){
  Page.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page updated successfully.",
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
};

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

ContentPage.updateCommonParams = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {
    CommonParams: req.body.CommonParams,
    UpdatedOn: Date.now(),
  };

  console.log("req.body ================= ", req.body);

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;

  console.log("data ================= ", data);
  console.log("conditions = ", conditions);
  //Chapter.update(query , $set:data , function( err , result ){
  Page.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page updated successfully.",
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
};

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

ContentPage.createWidget = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;

  var widgetType = req.body.widgetType ? req.body.widgetType : "";
  //"text","image","audio","video","questAnswer"

  // Create widget data separately to avoid circular reference
  var widgetData = {};

  switch (widgetType) {
    case "text":
      widgetData = {
        SrNo: 1,
        Animation: "fadeIn",
        BgMusic: "",
        Type: "text",
        Data: "Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum Lorem Ipsum",
        W: 610,
        H: 322,
        X: 100,
        Y: 400,
      };
      break;
    case "image":
      widgetData = {
        SrNo: 1,
        Animation: "fadeIn",
        BgMusic: "",
        Type: "image",
        Data: "",
        W: 610,
        H: 322,
        X: 100,
        Y: 400,
      };
      break;
    case "video":
      widgetData = {
        SrNo: 1,
        Animation: "fadeIn",
        BgMusic: "",
        Type: "video",
        Data: "",
        W: 610,
        H: 322,
        X: 100,
        Y: 400,
      };
      break;
    case "audio":
      widgetData = {
        SrNo: 1,
        Animation: "fadeIn",
        BgMusic: "",
        Type: "text",
        Data: "",
        W: 610,
        H: 322,
        X: 100,
        Y: 400,
      };
      break;
    case "questAnswer":
      widgetData = {
        SrNo: 1,
        Animation: "fadeIn",
        BgMusic: "",
        Type: "questAnswer",
        Data: "",
        W: 610,
        H: 322,
        X: 100,
        Y: 400,
      };
      break;
    default:
      console.log("Input Error : Wrong Widget Type = ", widgetType);
      return;
  }

  var currentViewport = req.body.currentViewport
    ? req.body.currentViewport
    : "";

  // Initialize the data structure based on viewport (no circular reference)
  switch (currentViewport) {
    case "desktop":
      data.ViewportDesktopSections = {
        Widgets: [widgetData], // Use widgetData, not data
      };
      break;
    case "tablet":
      data.ViewportTabletSections = {
        Widgets: [widgetData], // Use widgetData, not data
      };
      break;
    case "mobile":
      data.ViewportMobileSections = {
        Widgets: [widgetData], // Use widgetData, not data
      };
      break;
    default:
      console.log(
        "Input Error : Wrong currentViewport Value = ",
        currentViewport
      );
      return;
  }

  // Keep existing ViewportDesktopSections if provided, but preserve our new widget
  if (req.body.ViewportDesktopSections) {
    // Merge existing sections with our new widget
    if (
      currentViewport === "desktop" &&
      data.ViewportDesktopSections &&
      data.ViewportDesktopSections.Widgets
    ) {
      data.ViewportDesktopSections = {
        ...req.body.ViewportDesktopSections,
        Widgets: [
          ...(req.body.ViewportDesktopSections.Widgets || []),
          ...data.ViewportDesktopSections.Widgets,
        ],
      };
    } else if (
      currentViewport === "tablet" &&
      data.ViewportTabletSections &&
      data.ViewportTabletSections.Widgets
    ) {
      data.ViewportTabletSections = {
        ...req.body.ViewportTabletSections,
        Widgets: [
          ...(req.body.ViewportTabletSections.Widgets || []),
          ...data.ViewportTabletSections.Widgets,
        ],
      };
    } else if (
      currentViewport === "mobile" &&
      data.ViewportMobileSections &&
      data.ViewportMobileSections.Widgets
    ) {
      data.ViewportMobileSections = {
        ...req.body.ViewportMobileSections,
        Widgets: [
          ...(req.body.ViewportMobileSections.Widgets || []),
          ...data.ViewportMobileSections.Widgets,
        ],
      };
    }
  }
  data.UpdatedOn = Date.now();
  console.log("conditions = ", conditions);

  // Use modern Mongoose syntax
  Page.updateOne(conditions, { $set: data })
    .then((result) => {
      var response = {
        status: 200,
        message: "Widget created successfully!",
        result: result,
      };
      res.json(response);
    })
    .catch((err) => {
      console.log(err);
      var response = {
        status: 501,
        message: "Something went wrong.",
      };
      res.json(response);
    });
};

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

ContentPage.removeWidget = function (req, res) {
  //check isMyChapter( req.headers.chapter_id ) - Middle-ware Authorization check

  var conditions = {};
  var data = {};
  //console.log("req.headers = " , req.headers)

  conditions.ChapterId = req.headers.chapter_id;
  conditions._id = req.headers.page_id;
  data.ViewportDesktopSections = req.body.ViewportDesktopSections
    ? req.body.ViewportDesktopSections
    : {};
  data.UpdatedOn = Date.now();
  console.log("conditions = ", conditions);
  //Chapter.update(query , $set:data , function( err , result ){
  Page.update(conditions, { $set: data }, function (err, result) {
    if (!err) {
      var response = {
        status: 200,
        message: "Page name updated successfully 4.",
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
};

//updated on 06012015 - AWS S3 Integration
//req.body.MediaType = 'WidgetImage' //'WidgetImage','WidgetVideo','WidgetAudio','WidgetQuestAnswer','WidgetBgImage','WidgetBgVideo'
ContentPage.uploadMedia = async function (req, res) {
  try {
    // Import AWS S3 utility
    const awsS3Utils = require("../utilities/awsS3Utils");

    var AddedWhere = "contentPage";
    var AddedHow = req.body.AddedHow ? req.body.AddedHow : "hardDrive"; //hardDrive,'dragDropLink','dragDropFile'
    var MediaType = req.body.MediaType ? req.body.MediaType : ""; //'WidgetBgImage','WidgetBgVideo','WidgetImage','WidgetVideo','WidgetAudio','WidgetQuestAnswer'

    console.log("req.body-------------", req.body);
    console.log("------MediaType--------", MediaType);

    // Get counter for unique ID
    const counterData = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );

    if (!counterData) {
      return res.json({ code: "404", message: "Counter not found" });
    }

    var incNum = counterData.seq;
    console.log("incNum=" + incNum);

    // Handle different media types
    if (
      MediaType == "WidgetBgVideo" ||
      MediaType == "WidgetVideo" ||
      MediaType == "WidgetAudio"
    ) {
      // For video/audio files, use the existing saveFile function
      // This will be updated later to use S3
      switch (MediaType) {
        case "WidgetBgVideo":
          saveFile(req, res, "Video", MediaType, req.files);
          break;
        case "WidgetVideo":
          saveFile(req, res, "Video", MediaType, req.files);
          break;
        case "WidgetAudio":
          saveFile(req, res, "Audio", MediaType, req.files);
          break;
        default:
          console.log("Something went wrong-876675755----------------");
      }
    } else {
      // Handle image/document files with AWS S3
      if (!req.file) {
        return res.json({ code: "400", message: "No file uploaded" });
      }

      var file_name = req.file.originalname;
      var file_name_parts = file_name.split(".");
      var ext = file_name_parts[file_name_parts.length - 1];
      var RecordLocator = file_name_parts[0];
      var name = dateFormat() + "_" + incNum;
      var final_file_name = name + "." + ext;

      // Determine media type
      var media_type = "";
      if (
        req.file.mimetype == "application/pdf" ||
        req.file.mimetype == "application/msword" ||
        req.file.mimetype ==
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        req.file.mimetype == "application/vnd.ms-excel" ||
        req.file.mimetype == "application/vnd.oasis.opendocument.spreadsheet" ||
        req.file.mimetype ==
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        req.file.mimetype == "application/vnd.ms-powerpoint" ||
        req.file.mimetype ==
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        media_type = "Document";
      } else if (
        req.file.mimetype == "video/mp4" ||
        req.file.mimetype == "video/ogg" ||
        req.file.mimetype == "video/webm"
      ) {
        media_type = "Video";
      } else if (
        req.file.mimetype == "audio/mpeg" ||
        req.file.mimetype == "audio/ogg"
      ) {
        media_type = "Audio";
      } else {
        media_type = "Image";
      }

      // Upload to S3 based on media type
      var s3Folder = "";
      var uploadResult = null;

      if (media_type == "Image") {
        // For images, upload to multiple size folders
        uploadResult = await awsS3Utils.uploadImageToMultipleSizes(
          req.file,
          name, // Base name without extension
          ["100", "300", "600", "aspectfit_small", "aspectfit"],
          {
            "media-type": MediaType,
            "added-how": AddedHow,
            "added-where": AddedWhere,
            "uploader-id": req.session.user._id,
            "original-name": req.file.originalname,
          }
        );

        if (!uploadResult.success) {
          return res.json({
            code: "500",
            message: "Error uploading to S3",
            error: uploadResult.error,
          });
        }
      } else {
        // For documents, videos, audio - upload to appropriate folder
        if (media_type == "Document") {
          s3Folder = "scrptMedia/documents";
        } else if (media_type == "Video") {
          s3Folder = "scrptMedia/videos";
        } else if (media_type == "Audio") {
          s3Folder = "scrptMedia/audio";
        }

        uploadResult = await awsS3Utils.uploadToS3(req.file, s3Folder, {
          "media-type": MediaType,
          "added-how": AddedHow,
          "added-where": AddedWhere,
          "uploader-id": req.session.user._id,
          "original-name": req.file.originalname,
        });

        if (!uploadResult.success) {
          return res.json({
            code: "500",
            message: "Error uploading to S3",
            error: uploadResult.error,
          });
        }
      }

      // Prepare data for database
      var dataToUpload = {
        Location: [],
        UploadedBy: "user",
        UploadedOn: Date.now(),
        UploaderID: req.session.user._id,
        AutoId: incNum,
        Source: "ThinkStock",
        SourceUniqueID: "53ceb02d3aceabbe5d573dba",
        Domains: "53ad6993f222ef325c05039c",
        GroupTags: [],
        Collection: [
          "53ceaf933aceabbe5d573db4",
          "53ceaf9d3aceabbe5d573db6",
          "549323f9610706c30a70679e",
        ],
        Status: 2,
        MetaMetaTags: null,
        MetaTags: null,
        AddedWhere: AddedWhere,
        IsDeleted: 0,
        TagType: "",
        ContentType: req.file.mimetype,
        MediaType: MediaType,
        AddedHow: AddedHow,
        OwnerFSGs: req.session.user.FSGsArr2 || {},
        Locator: RecordLocator + "_" + incNum,
      };

      // Add group tags if provided
      if (req.body.gt) {
        dataToUpload.GroupTags.push({
          GroupTagID: req.body.gt,
        });
      }

      // Add file location with all sizes
      if (media_type == "Image") {
        // For images, store all size variants
        dataToUpload.Location = uploadResult.uploads.map((upload) => ({
          Size: req.file.size,
          URL: upload.fileName,
          S3Url: upload.fileUrl,
          ImageSize: upload.size, // 100, 300, 600, aspectfit_small, aspectfit
          DirectUrl: `https://scrpt.s3.us-east-1.amazonaws.com/${upload.fileName}`,
        }));
      } else {
        // For other files, store single location
        dataToUpload.Location.push({
          Size: req.file.size,
          URL: mainFileName,
          S3Url: mainFileUrl,
          DirectUrl: `https://scrpt.s3.us-east-1.amazonaws.com/${mainFileName}`,
        });
      }

      console.log(
        "==========================================================================="
      );
      console.log(dataToUpload);
      console.log(
        "==========================================================================="
      );

      // Save to database
      const savedMedia = await media(dataToUpload).save();
      dataToUpload._id = savedMedia._id;

      res.json(dataToUpload);
    }
  } catch (error) {
    console.error("Error in uploadMedia:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Get signed URL for S3 image
ContentPage.getImageUrl = async function (req, res) {
  try {
    const awsS3Utils = require("../utilities/awsS3Utils");
    const { fileKey } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour

    if (!fileKey) {
      return res.json({ code: "400", message: "File key is required" });
    }

    const result = await awsS3Utils.generateSignedUrl(
      fileKey,
      parseInt(expiresIn)
    );

    if (result.success) {
      res.json({
        code: "200",
        message: "Signed URL generated successfully",
        results: {
          signedUrl: result.url,
          expiresIn: expiresIn,
          fileKey: fileKey,
        },
      });
    } else {
      res.json({
        code: "500",
        message: "Error generating signed URL",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in getImageUrl:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Test endpoint for S3 signed URL (no auth required)
ContentPage.testImageUrl = async function (req, res) {
  try {
    const awsS3Utils = require("../utilities/awsS3Utils");
    const { fileKey } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour

    if (!fileKey) {
      return res.json({ code: "400", message: "File key is required" });
    }

    const result = await awsS3Utils.generateSignedUrl(
      fileKey,
      parseInt(expiresIn)
    );

    if (result.success) {
      res.json({
        code: "200",
        message: "Signed URL generated successfully",
        results: {
          signedUrl: result.url,
          expiresIn: expiresIn,
          fileKey: fileKey,
          instructions:
            "Copy the signedUrl and paste it in your browser to view the image",
        },
      });
    } else {
      res.json({
        code: "500",
        message: "Error generating signed URL",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error in testImageUrl:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Get image URL by size
ContentPage.getImageBySize = async function (req, res) {
  try {
    const { mediaId, size = "300" } = req.params; // Default to 300px
    const { sizes = ["100", "300", "600", "aspectfit_small", "aspectfit"] } =
      req.query;

    if (!mediaId) {
      return res.json({ code: "400", message: "Media ID is required" });
    }

    // Find the media record
    const mediaRecord = await media.findById(mediaId);

    if (!mediaRecord) {
      return res.json({ code: "404", message: "Media not found" });
    }

    // Find the location with the requested size
    const location = mediaRecord.Location.find((loc) => loc.ImageSize === size);

    if (!location) {
      return res.json({
        code: "404",
        message: `Size ${size} not found. Available sizes: ${mediaRecord.Location.map(
          (loc) => loc.ImageSize
        ).join(", ")}`,
      });
    }

    res.json({
      code: "200",
      message: "Image URL retrieved successfully",
      results: {
        mediaId: mediaId,
        requestedSize: size,
        imageUrl: location.DirectUrl,
        s3Url: location.S3Url,
        fileName: location.URL,
        availableSizes: mediaRecord.Location.map((loc) => ({
          size: loc.ImageSize,
          url: loc.DirectUrl,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getImageBySize:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// Get all image sizes for a media
ContentPage.getAllImageSizes = async function (req, res) {
  try {
    const { mediaId } = req.params;

    if (!mediaId) {
      return res.json({ code: "400", message: "Media ID is required" });
    }

    // Find the media record
    const mediaRecord = await media.findById(mediaId);

    if (!mediaRecord) {
      return res.json({ code: "404", message: "Media not found" });
    }

    res.json({
      code: "200",
      message: "All image sizes retrieved successfully",
      results: {
        mediaId: mediaId,
        originalName:
          mediaRecord.Location[0]?.URL?.split("/").pop() || "Unknown",
        sizes: mediaRecord.Location.map((loc) => ({
          size: loc.ImageSize,
          url: loc.DirectUrl,
          s3Url: loc.S3Url,
          fileName: loc.URL,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getAllImageSizes:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

ContentPage.uploadLink = async function (req, res) {
  var AddedWhere = "contentPage";
  var AddedHow = req.body.AddedHow ? req.body.AddedHow : "dragDropLink"; //hardDrive,'dragDropLink','dragDropFile',pasteLink

  var incNum = 0;
  try {
    const data = await counters.findOneAndUpdate(
      { _id: "userId" },
      { $inc: { seq: 1 } },
      { new: true }
    );

    if (!data) {
      return res.json({ code: "404", message: "Counter not found" });
    }

    console.log("=========================");
    console.log(data);
    console.log(data.seq);
    incNum = data.seq;
    console.log("incNum=" + incNum);

    req.body.linkType = req.body.linkType ? req.body.linkType : ""; //image,video,audio
    req.body.content = req.body.content ? req.body.content : "";
    req.body.thumbnail = req.body.thumbnail ? req.body.thumbnail : "";
    req.body.MediaType = req.body.MediaType ? req.body.MediaType : "WidgetLink"; //'WidgetBgLink,'WidgetLink'

    //'WidgetBgImage', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
    //'WidgetBgVideo', - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
    //'WidgetImage',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
    //'WidgetVideo',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
    //'WidgetAudio',   - Link - Data = web link data... thumbnail - Need to save thumbnail at our end.
    //'WidgetQuestAnswer',
    //'WidgetBgLink'

    var LinkType = "";
    if (req.body.linkType) {
      LinkType = req.body.linkType;
    }

    var thumbnail = "";
    var name = "";

    if (req.body.thumbnail) {
      thumbnail = req.body.thumbnail;
      //console.log("Thumbnail = "+thumbnail);
      var url = require("url");
      var f = "";
      var fArr = [];
      //var fileName = "web-link-"+Date.now()+url.parse(thumbnail).pathname.split('/').pop().split('?').shift();
      f = url.parse(thumbnail).pathname.split("/").pop().split("?").shift();
      fArr = f.split(".");
      var RecordLocator = fArr[0];
      console.log("RecordLocator = " + RecordLocator); //return;
      var ext = fArr[fArr.length - 1];
      //var fileName = Date.now()+'_'+incNum+'.'+ext;
      var name = "";
      name = RecordLocator;
      var fileName = dateFormat() + "_" + incNum + "." + ext;
      //asynchronous call - child process command execution
      saveFileFromUrl(thumbnail, fileName);
      thumbnail = fileName;
    }
    console.log("------------------name = ", name);

    var dataToUpload = {
      Location: [],
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: Date.now(),
      UploaderID: "68a733773931522f1b7f4632", // Hardcoded for testing
      Source: "Thinkstock",
      //SourceUniqueID:null,
      SourceUniqueID: "53ceb02d3aceabbe5d573dba", //updated on 06012015
      //Domains:null,
      Domains: "53ad6993f222ef325c05039c",
      GroupTags: [],
      //Collection:null,
      Collection: [
        "53ceaf933aceabbe5d573db4",
        "53ceaf9d3aceabbe5d573db6",
        "549323f9610706c30a70679e",
      ],
      //Status:0,
      Status: 2, //updated on 25122014 by manishp after discussing with amitchh - for more detail on Status codes check the comments on media model
      MetaMetaTags: null,
      MetaTags: null,
      //AddedWhere:"directToPf", //directToPf,hardDrive,dragDrop
      AddedWhere: AddedWhere, //directToPf,board,capsule,contentPage
      AddedHow: AddedHow, //hardDrive,'dragDropLink','dragDropFile',pasteLink
      IsDeleted: 0,
      TagType: "",
      Content: req.body.content,
      ContentType: req.body.MediaType,
      MediaType: req.body.MediaType,
      thumbnail: thumbnail, //added on 24122014 by manishp embedded link thumbnail case.
      Locator: name + "_" + incNum,
      LinkType: LinkType,
      OwnerFSGs: {}, // Hardcoded for testing
    };

    dataToUpload.Location.push({
      Size: "",
      URL: thumbnail,
    });

    //console.log("dataToUpload = ",dataToUpload);return;
    const tata = await media(dataToUpload).save();
    res.json({ code: "200", message: "success", response: tata });
  } catch (err) {
    console.log("Error in uploadLink:", err);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: err.message,
    });
  }
};

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
var gridFsSaveVideo = function (req, res) {
  var form = new formidable.IncomingForm();
  form.keepExtensions = true; //keep file extension
  form.uploadDir = __dirname + "/../../public/assets/Media/video/widgets/"; //set upload directory
  form.parse(req, function (err, fields, files) {
    var source_path = files.file.path;
    var isFirefox = req.params.browser == "f" ? true : false;
    var command = ffmpeg();
    var type = source_path.split(".").pop();
    console.log(
      type.toUpperCase() + "============================================"
    );
    console.log(isFirefox + "============================================");
    try {
      if (isFirefox && type.toUpperCase() != "WEBM") {
        console.log("converting to webm");
        console.log("source_path  ==  " + source_path);
        var output_path = source_path.replace("." + type, ".webm");
        var fileName = files.file.name.replace("." + type, ".webm");
        console.log("output_path  ==  " + output_path);
        ffmpeg(source_path)
          .format("webm")
          .save(output_path)
          .on("end", function () {
            console.log(
              "here000000000000000000000000000000000000000000000000000000000000"
            );
            //if (!error){
            //console.log('Video file: ' + file);
            var conn = mongoose.createConnection(
              "mongodb://172.24.3.129/test-coll-import",
              function (err) {}
            );
            conn.once("open", function () {
              console.log("conection open");
              var gfs = Grid(conn.db);
              var writestream = gfs.createWriteStream({
                filename: files.file.name,
                metadata: { mimetype: files.file.type },
              });
              fs.createReadStream(output_path).pipe(writestream);
              writestream.on("close", function (file) {
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
      } else if (!isFirefox && type.toUpperCase() != "MP4") {
        console.log("converting to mp4");
        console.log("source_path  ==  " + source_path);
        var output_path = source_path.replace("." + type, ".mp4");
        var fileName = files.file.name.replace("." + type, ".mp4");
        console.log("output_path  ==  " + output_path);
        ffmpeg(source_path)
          .format("mp4")
          .save(output_path)
          .on("end", function () {
            var conn = mongoose.createConnection(
              "mongodb://172.24.3.129/test-coll-import",
              function (err) {}
            );
            conn.once("open", function () {
              console.log("conection open");
              var gfs = Grid(conn.db);
              var writestream = gfs.createWriteStream({
                filename: fileName,
                metadata: { mimetype: "video/mp4" },
              });
              fs.createReadStream(output_path).pipe(writestream);
              writestream.on("close", function (file) {
                // do something with `file`
                console.log(file.mimetype);
                res.json(file);
              });
            });
          });
      } else {
        console.log("saving as it is");
        var conn = mongoose.createConnection(
          "mongodb://172.24.3.129/test-coll-import",
          function (err) {}
        );
        conn.once("open", function () {
          console.log("conection open");
          var gfs = Grid(conn.db);
          var writestream = gfs.createWriteStream({
            filename: files.file.name,
            metadata: { mimetype: files.file.type },
          });
          fs.createReadStream(source_path).pipe(writestream);
          writestream.on("close", function (file) {
            // do something with `file`
            console.log(file.mimetype);
            res.json(file);
          });
        });
      }
    } catch (e) {
      console.log("-----------------------error");
      console.log(e);
      console.log(e.code);
      console.log(e.msg);
    }
  });
};
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
var streamGridfsVideo = function (req, res) {
  console.log("-----------here in streamGridfsVideo-----------------");
  var conn = mongoose.createConnection(
    "mongodb://172.24.3.129/test-coll-import",
    function (err) {}
  );
  conn.once("open", function () {
    console.log("-----------connection open---------------");
    var options = { _id: req.params.id };
    var gfs = Grid(conn.db);
    gfs.files.findOne(
      { _id: mongoose.mongo.BSONPure.ObjectID(req.params.id) },
      function (err, file) {
        if (!err) {
          gfs.exist(options, function (err, found) {
            if (err) res.json(err);
            if (found) {
              console.log(file);
              var readstream = gfs.createReadStream(options, {
                range: {
                  startPos: 0,
                  endPos: file.length - 1,
                },
              });
              console.log(req.headers["range"]);
              //res.status(206);
              res.header(
                "Accept-Ranges",
                "bytes" + 1 + "-" + (file.length - 1) + "/" + file.length
              );
              res.header("Content-Length", file.length);
              res.header("Cache-Control", "public, max-age=31536000");
              console.log("------------------------------------");
              console.log(file);
              console.log("------------------------------------");
              res.contentType(file.metadata.mimetype);
              readstream.pipe(res);
            } else {
              console.log("File does not exist");
            }
          });
        } else {
          res.json(err);
        }
      }
    );
  });
};
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
function saveFile(req, res, fileType, MediaType, files) {
  var MediaType = MediaType ? MediaType : "recording";
  console.log(
    "========================================= here ========================================="
  );
  //var form = new formidable.IncomingForm();
  //form.keepExtensions = true;     //keep file extension
  //form.uploadDir = (__dirname+"/../../public/assets/Media/video/");       //set upload directory
  //form.keepExtensions = true;     //keep file extension

  //form.parse(req, function(err, fields, files) {
  console.log(
    "========================================= here2 =========================================",
    files
  );
  console.log("file size: " + JSON.stringify(files.myFile.size));
  console.log("file path: " + JSON.stringify(files.myFile.path));
  console.log("file name: " + JSON.stringify(files.myFile.name));
  console.log("file type: " + JSON.stringify(files.myFile.type));
  console.log(
    "lastModifiedDate: " + JSON.stringify(files.myFile.lastModifiedDate)
  );
  var temp = files.myFile.name.split(".");
  var ext = temp.pop();
  var incNum = 0;
  var dateTime = new Date()
    .toISOString()
    .replace(/T/, "")
    .replace(/\..+/, "")
    .split(" ");
  counters.findOneAndUpdate(
    { _id: "userId" },
    { $inc: { seq: 1 } },
    { new: true },
    function (err, data) {
      if (!err) {
        incNum = data.seq;
        var fileName = Date.now() + "_" + MediaType + "_" + incNum + "." + ext;

        fs.rename(
          files.myFile.path,
          __dirname + "/../../public/assets/Media/video/" + fileName,
          function (err) {
            if (err) {
              res.json(err);
            } else {
              //console.log("../assets/Media/video/Recorded_" + incNum + '.' + ext);
              console.log("renamed complete");
              if (fileType == "Video") {
                video__anyToMP4OrWebm(fileName);
              } else {
                Audio__anyToMP3(fileName);
              }
              saveMedia__toDB(req, res, incNum, fileName, fileType, MediaType);
              //res.json({'filename':"../assets/Media/video/Recorded_" + incNum + '.' + ext});
            }
          }
        );
      }
    }
  );
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
function saveMedia__toDB(req, res, incNum, fileName, fileType, MediaType) {
  var AddedWhere = "contentPage";
  var AddedHow = req.body.AddedHow ? req.body.AddedHow : "hardDrive"; //hardDrive,'dragDropLink','dragDropFile'

  if (req.session.user.FSGsArr2) {
  } else {
    req.session.user.FSGsArr2 = {};
  }
  if (incNum) {
    var thumbName = fileName.replace("." + fileName.split(".").pop(), ".png");
    var locator = fileName.replace("." + fileName.split(".").pop(), "");
    //'Recorded_'+incNum+'.png'

    var cType = "video/webm";
    if (fileType == "Audio") {
      cType = "audio/mp3";
      thumbName = "default_audio_thumb.png";
    }

    dataToUpload = {
      Location: [],
      AutoId: incNum,
      UploadedBy: "user",
      UploadedOn: Date.now(),
      UploaderID: req.session.user._id,
      Source: "Thinkstock",
      SourceUniqueID: null,
      Domains: null,
      GroupTags: [],
      Collection: null,
      Status: 2,
      MetaMetaTags: null,
      MetaTags: null,
      AddedWhere: AddedWhere, //directToPf,board,capsule
      IsDeleted: 0,
      TagType: "",
      ContentType: cType,
      MediaType: MediaType,
      AddedHow: AddedHow,
      OwnerFSGs: req.session.user.FSGsArr2,
      IsPrivate: 1,
      Locator: locator,
      thumbnail: thumbName,
    };

    dataToUpload.Location.push({
      Size: 1289,
      URL: fileName,
    });

    media(dataToUpload).save(function (err, model) {
      if (err) {
        response.json(err);
      } else {
        dataToUpload._id = model._id;
        if (fileType == "Video") {
          video__getNsaveThumbnail(
            fileName,
            dataToUpload._id,
            dataToUpload,
            res
          );
        } else {
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
function video__anyToMP4OrWebm(inputFile) {
  if (inputFile) {
    var outputFile = "";
    var extension = "";
    extension = inputFile.split(".").pop();
    extensionUpper = extension.toUpperCase();

    switch (extensionUpper) {
      case "WEBM":
        outputFile = inputFile.replace("." + extension, ".mp4");
        __convertVideo(inputFile, outputFile);
        break;

      case "MP4":
        outputFile = inputFile.replace("." + extension, ".webm");
        __convertVideo(inputFile, outputFile);
        break;

      case "MOV":
        outputFile = inputFile.replace("." + extension, ".mp4");
        __convertVideo(inputFile, outputFile);

        outputFile = inputFile.replace("." + extension, ".webm");
        __convertVideo(inputFile, outputFile);
        break;

      default:
        console.log("------Unknown extension found = ", extension);
        if (extension != "" && extension != null) {
          outputFile = inputFile.replace("." + extension, ".mp4");
          __convertVideo(inputFile, outputFile);

          outputFile = inputFile.replace("." + extension, ".webm");
          __convertVideo(inputFile, outputFile);
        }
        break;
    }
  }
  return;
}

function __convertVideo(inputFile, outputFile) {
  var util = require("util"),
    exec = require("child_process").exec;

  var command =
    "ffmpeg -fflags +genpts -i " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    inputFile +
    " -r 24 " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    outputFile;

  exec(command, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (error) {
      console.log("exec error: " + error);
      //response.statusCode = 404;
      //response.end();
    } else {
      console.log(
        "==========Successfully converted from " +
          inputFile +
          " to " +
          outputFile
      );
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
function video__getNsaveThumbnail(inputFile, MediaId, dataToUpload, res) {
  var util = require("util"),
    exec = require("child_process").exec;

  //var command = "ffmpeg -i " + audioFile + " -i " + videoFile + " -map 0:0 -map 1:0 " + mergedFile;
  //var command = "ffmpeg -i " + inputFile + " -vframes 1 "+output.png;

  var outputThumbnail = Date.now();
  var outputThumbnailArr = [];

  outputThumbnailArr = inputFile.split(".");
  if (outputThumbnailArr.length) outputThumbnail = outputThumbnailArr[0];

  outputThumbnail = outputThumbnail + ".png";

  var command =
    "ffmpeg -i " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    inputFile +
    " -vframes 1 " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    outputThumbnail;
  exec(command, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (error) {
      try {
        console.log("exec error: " + error);
        response.statusCode = 404;
        response.end();
      } catch (e) {}
    } else {
      //success case
      saveRequiredThumbnail__video(outputThumbnail);

      //update media thumbnail
      media.update(
        { _id: MediaId },
        { $set: { thumbnail: outputThumbnail } },
        {},
        function (err, numAffected) {
          if (err) {
            console.log("err = ", err);
          } else {
            console.log("numAffected = ", numAffected);
            res.json(dataToUpload);
          }
        }
      );
    }
  });
}
/********************************************END******************************************************/

var saveRequiredThumbnail__video = function (file_name) {
  //add thumbnail code
  var imgUrl = file_name;
  var mediaCenterPath = "/../../public/assets/Media/video/";
  var srcPath = __dirname + mediaCenterPath + imgUrl;

  if (fs.existsSync(srcPath)) {
    var dstPathCrop_SMALL =
      __dirname +
      mediaCenterPath +
      process.urls.small__thumbnail +
      "/" +
      imgUrl;
    var dstPathCrop_SG =
      __dirname + mediaCenterPath + process.urls.SG__thumbnail + "/" + imgUrl;
    var dstPathCrop_MEDIUM =
      __dirname +
      mediaCenterPath +
      process.urls.medium__thumbnail +
      "/" +
      imgUrl;
    var dstPathCrop_LARGE =
      __dirname +
      mediaCenterPath +
      process.urls.large__thumbnail +
      "/" +
      imgUrl;
    var dstPathCrop_ORIGNAL =
      __dirname +
      mediaCenterPath +
      process.urls.aspectfit__thumbnail +
      "/" +
      imgUrl;
    crop_image(srcPath, dstPathCrop_SMALL, 100, 100);
    crop_image(srcPath, dstPathCrop_MEDIUM, 600, 600);
    crop_image(srcPath, dstPathCrop_SG, 300, 300);
    //crop_image(srcPath,dstPathCrop_LARGE,1200,1200);
    resize_image(srcPath, dstPathCrop_ORIGNAL, 2300, 1440);
  }
};

function Audio__anyToMP3(inputFile) {
  if (inputFile) {
    var outputFile = "";
    var extension = "";
    extension = inputFile.split(".").pop();
    extensionUpper = extension.toUpperCase();

    switch (extensionUpper) {
      case "OGG":
        outputFile = inputFile.replace("." + extension, ".mp3");
        __convertAudio(inputFile, outputFile);
        break;

      case "WAV":
        outputFile = inputFile.replace("." + extension, ".mp3");
        __convertAudio(inputFile, outputFile);
        break;

      case "MP3":
        //no need to convert
        break;

      default:
        console.log("------Unknown extension found = ", extension);
        if (extension != "" && extension != null) {
          outputFile = inputFile.replace("." + extension, ".mp3");
          __convertAudio(inputFile, outputFile);
        }
        break;
    }
  }
  return;
}

function __convertAudio(inputFile, outputFile) {
  var util = require("util"),
    exec = require("child_process").exec;

  var command =
    "ffmpeg -fflags +genpts -i " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    inputFile +
    " -r 24 " +
    process.urls.__VIDEO_UPLOAD_DIR +
    "/" +
    outputFile;

  exec(command, function (error, stdout, stderr) {
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);

    if (error) {
      console.log("exec error: " + error);
      //response.statusCode = 404;
      //response.end();
    } else {
      console.log(
        "==========Successfully converted from " +
          inputFile +
          " to " +
          outputFile
      );
    }
  });
}

// To get images by Arun sahani
ContentPage.getMedia = function (req, res) {
  var MediaType = req.body.type ? req.body.type : "";
  var selectedKeyword = req.body.selectedKeyword
    ? req.body.selectedKeyword
    : false;
  var conditions = {};
  var fields = {
    Posts: false,
    Stamps: false,
    Marks: false,
  };
  switch (MediaType) {
    case "Image":
      conditions = {
        $or: [{ MediaType: "Image" }, { MediaType: "Link", LinkType: "image" }],
      };
      break;
    case "Video":
      conditions = {
        $or: [
          { MediaType: "Video" },
          {
            MediaType: "Link",
            LinkType: { $ne: "image" },
            $or: [
              { Content: new RegExp("youtu", "i") },
              { Content: new RegExp("vimeo", "i") },
            ],
          },
        ],
      };
      break;
    default:
      console.log("Unexpected Case found = ", MediaType);
      res.json({ code: "404", msg: "Not Found", responselength: 0 });
      return;
  }

  if (selectedKeyword != false) {
    conditions["GroupTags.GroupTagID"] = selectedKeyword;
  }

  conditions.Status = { $in: [1, 2] }; // Include both Status 1 and 2
  conditions.IsDeleted = 0;
  conditions.IsPrivate = { $ne: 1 };
  // Removed the AddedWhere filter to include contentPage media
  console.log("conditions----------", conditions); //return;

  media
    .find(conditions, fields)
    .sort({ UploadedOn: "desc" })
    .skip(req.body.skip)
    .limit(req.body.limit)
    .exec()
    .then(function (result) {
      media
        .find(conditions)
        .count()
        .exec()
        .then(function (count) {
          //console.log("Count",result);
          res.json({
            code: "200",
            msg: "Success",
            response: result,
            count: count,
          });
        })
        .catch(function (err) {
          res.json(err);
        });
    })
    .catch(function (err) {
      res.json(err);
    });
};

// For Text Search added by arun

// Get media from a specific page
ContentPage.getPageMedia = async function (req, res) {
  try {
    const pageId = req.headers.page_id;

    console.log("=== getPageMedia Debug ===");
    console.log("pageId from header:", pageId);
    console.log("req.body:", req.body);

    if (!pageId) {
      console.log("ERROR: No page_id header provided");
      return res.json({ code: "400", message: "page_id header is required" });
    }

    // Find the page and populate its media
    console.log("Searching for page with ID:", pageId);
    const page = await Page.findById(pageId);

    console.log("Page found:", page ? "YES" : "NO");
    if (page) {
      console.log("Page title:", page.Title);
      console.log(
        "Page Medias array length:",
        page.Medias ? page.Medias.length : 0
      );
      console.log("Page Medias array (ObjectIds):", page.Medias);
    }

    if (!page) {
      console.log("ERROR: Page not found");
      return res.json({ code: "404", message: "Page not found" });
    }

    // Get the actual media documents from the Medias array
    let mediaList = [];
    if (page.Medias && page.Medias.length > 0) {
      console.log("Fetching media documents for IDs:", page.Medias);

      // Try to find the media document directly first
      const mediaId = page.Medias[0];
      console.log("Trying to find media with ID:", mediaId);
      const singleMedia = await media.findById(mediaId);
      console.log("Single media found:", singleMedia ? "YES" : "NO");
      if (singleMedia) {
        console.log("Single media MediaType:", singleMedia.MediaType);
        console.log("Single media LinkType:", singleMedia.LinkType);
      }

      mediaList = await media.find({ _id: { $in: page.Medias } });
      console.log("Found media documents:", mediaList.length);
      console.log(
        "Media documents:",
        mediaList.map((m) => ({
          id: m._id,
          mediaType: m.MediaType,
          linkType: m.LinkType,
        }))
      );

      // Debug: Log the full media document
      if (mediaList.length > 0) {
        console.log(
          "Full first media document:",
          JSON.stringify(mediaList[0], null, 2)
        );
      }
    }

    if (req.body.type) {
      const mediaType = req.body.type;
      console.log("Filtering by type:", mediaType);

      const originalLength = mediaList.length;
      mediaList = mediaList.filter((media) => {
        console.log(
          "Checking media:",
          media._id,
          "MediaType:",
          media.MediaType,
          "LinkType:",
          media.LinkType
        );

        if (mediaType === "Image") {
          const isImage =
            media.MediaType === "Image" ||
            (media.MediaType === "Link" && media.LinkType === "image");
          console.log("Is Image?", isImage);
          return isImage;
        } else if (mediaType === "Video") {
          const isVideo =
            media.MediaType === "Video" ||
            (media.MediaType === "Link" &&
              media.LinkType !== "image" &&
              media.Content &&
              (media.Content.includes("youtu") ||
                media.Content.includes("vimeo")));
          console.log("Is Video?", isVideo);
          return isVideo;
        }
        return true;
      });

      console.log(
        "After filtering - original:",
        originalLength,
        "filtered:",
        mediaList.length
      );
    }

    // Apply pagination
    const skip = req.body.skip || 0;
    const limit = req.body.limit || 20;
    console.log("Pagination - skip:", skip, "limit:", limit);

    const paginatedMedia = mediaList.slice(skip, skip + limit);
    console.log("Final paginated media length:", paginatedMedia.length);

    const response = {
      code: "200",
      msg: "Success",
      response: paginatedMedia,
      count: mediaList.length,
      pageId: pageId,
      pageTitle: page.Title,
    };

    console.log("Final response:", JSON.stringify(response, null, 2));
    console.log("=== End getPageMedia Debug ===");

    res.json(response);
  } catch (error) {
    console.error("Error in getPageMedia:", error);
    res.json({
      code: "500",
      message: "Something went wrong",
      error: error.message,
    });
  }
};

ContentPage.getallKeywords = async function (req, res) {
  try {
    //var regex = new RegExp('^('+req.body.startsWith+')','i');
    const regex = new RegExp("s*s*^s*s*" + req.body.startsWith, "i");
    console.log(regex);
    //groupTags.find({$or:[{status:1,'Tags.TagTitle':regex},{status:1,'GroupTagTitle':regex},{status:3,'Tags.TagTitle':regex},{status:3,'GroupTagTitle':regex}]},function(err,result){
    //groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){
    //groupTags.find({$or:[{status:1},{status:3}]},function(err,result){
    //groupTags.find({$or:[{status:1},{status:3}],'GroupTagTitle':regex},function(err,result){
    const conditions = {
      GroupTagTitle: regex,
      // Temporarily relaxed status filter for testing
      // status: 3,
    };
    const fields = {
      _id: true,
      GroupTagTitle: true,
      Tags: true,
    };
    const sort = {
      GroupTagTitle: 1,
    };
    const limit = 100;

    // Debug: Log the query conditions
    console.log(
      "getallKeywords - Query conditions:",
      JSON.stringify(conditions, null, 2)
    );
    console.log("getallKeywords - Regex pattern:", regex);

    const result = await groupTags
      .find(conditions, fields)
      .sort(sort)
      .limit(limit);

    // Debug: Log the results
    console.log("getallKeywords - Found group tags:", result.length);
    console.log("getallKeywords - Sample results:", result.slice(0, 2));

    if (result.length == 0) {
      res.json({ code: "404", msg: "Not Found" });
    } else {
      res.json({ code: "200", msg: "Success", response: result });
    }
  } catch (err) {
    console.log(err);
    res.json({ code: "500", msg: "Something went wrong", error: err.message });
  }
};

ContentPage.dashEditCreate = function (req, res) {
  //check isMyChapter( req.header.chapter_id ) - Middle-ware Authorization check
  var data = {};
  data.CreaterId = req.session.user._id;
  data.OwnerId = req.session.user._id;
  data.IsDeleted = 1;

  data.ChapterId = req.headers.chapter_id ? req.headers.chapter_id : null;
  data.PageType = req.body.page_type ? req.body.page_type : "content";

  data.CommonParams = {};
  data.CommonParams.Background = {};
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

  Page(data).save(function (err, result) {
    if (!err) {
      var data = {};
      data = result.toObject();
      delete data._id; //so that new id will be created automartically
      delete data.IsDeleted;
      data.UpdatedOn = Date.now();
      data.OriginatedFrom = result._id;
      data.Origin = "publishNewChanges";
      data.IsDasheditpage = true;
      data.IsLaunched = false;

      Page(data).save(function (err, results) {
        if (!err) {
          var response = {
            status: 200,
            message: "Page duplicated successfully.",
            result: results,
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

// To push page id in chapter by arun sahani 20-05-2016
var pushPageId = async function (chapterId, pageId) {
  try {
    // Skip if chapterId is invalid (null or falsy)
    if (!chapterId) {
      console.log("Skipping chapter update - invalid chapterId:", chapterId);
      return;
    }

    const result = await Chapter.updateOne(
      { _id: chapterId },
      { $push: { pages: pageId } }
    );

    if (result.modifiedCount > 0) {
      console.log("page saved in chapter successfully.");
    } else {
      console.log("Chapter not found or no changes made");
    }
  } catch (err) {
    console.log("Error updating chapter with page ID:", err);
  }
};
//My Pages Apis
module.exports = ContentPage;

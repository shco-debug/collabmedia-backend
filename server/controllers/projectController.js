var project = require('./../models/projectModel.js');
var formidable = require('formidable');

// To fetch all project
var findAll = async function(req, res){    
  try {
    const result = await project.find({isDeleted:{$ne:1},OwnerID:req.session.user._id}).populate('Domain');
    
    if(result.length==0){
      res.json({"code":"404","msg":"Not Found"})
    }
    else{				
      res.json({"code":"200","msg":"Success","response":result})
    }
  } catch(err) {
    res.json(err);
  }
};

exports.findAll = findAll;

// Get boardsCount for a specific project
var getBoardsCount = async function(req, res) {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    
    if (!projectId) {
      return res.json({
        "code": "400",
        "message": "Project ID is required"
      });
    }
    
    const result = await project.findById(projectId).select('boardsCount ProjectTitle');
    
    if (!result) {
      return res.json({
        "code": "404",
        "message": "Project not found"
      });
    }
    
    res.json({
      "code": "200",
      "message": "Success",
      "response": {
        projectId: result._id,
        projectTitle: result.ProjectTitle,
        boardsCount: result.boardsCount
      }
    });
    
  } catch(err) {
    res.json({
      "code": "500",
      "message": "Error fetching boards count",
      "error": err.message
    });
  }
};

exports.getBoardsCount = getBoardsCount;

// Fix boardsCount data type for existing projects
var fixBoardsCountDataType = async function(req, res) {
  try {
    console.log('🔧 Fixing boardsCount data type for existing projects...');
    
    // Find all projects where boardsCount might be a string
    const projects = await project.find({});
    let fixedCount = 0;
    
    for (const proj of projects) {
      if (typeof proj.boardsCount === 'string') {
        const numericCount = parseInt(proj.boardsCount) || 0;
        await project.updateOne(
          { _id: proj._id },
          { $set: { boardsCount: numericCount } }
        );
        fixedCount++;
        console.log(`   ✅ Fixed project ${proj._id}: "${proj.boardsCount}" → ${numericCount}`);
      }
    }
    
    res.json({
      "code": "200",
      "message": `Successfully fixed ${fixedCount} projects`,
      "response": {
        totalProjects: projects.length,
        fixedProjects: fixedCount
      }
    });
    
  } catch(err) {
    res.json({
      "code": "500",
      "message": "Error fixing boardsCount data type",
      "error": err.message
    });
  }
};

exports.fixBoardsCountDataType = fixBoardsCountDataType;


// Add a new project
/*
var add = function(req,res){
  fields={
    ProjectTitle:req.body.name,
    OwnerID:req.session.user._id,
	Domain:req.body.domain,
	isDeleted:0
  };
  project(fields).save(function(err){
    if(err){
      res.json(err);
    }
    else{
      findAll(req,res)
    }
  });
  
};
*/
//static domain: Work case on 07012015
var add = async function(req,res){
  try {
    fields={
      ProjectTitle:req.body.name,
      OwnerID:req.session.user._id,
      //Domain:req.body.domain,
      Domain:"53ad6993f222ef325c05039c",
      isDeleted:0
    };
    await project(fields).save();
    findAll(req,res);
  } catch(err) {
    res.json(err);
  }
};
exports.add = add;

/*
var edit = function(req,res){
  
	var  fields={
		ProjectTitle:req.body.name,
		OwnerID:req.session.user._id,
		Domain:req.body.domain,
		isDeleted:0,
		ModifiedOn:Date.now()
	};
	var query={_id:req.body.id};
	var options = { multi: true };
	project.update(query, { $set: fields}, options, callback)
	function callback (err, numAffected) {
		if(err){
			res.json(err)
		}
		else{
			findAll(req,res)
		}
	} 
};
*/

//static domain: Work case on 07012015
var edit = async function(req,res){
  try {
    var  fields={
      ProjectTitle:req.body.name,
      OwnerID:req.session.user._id,
      //Domain:req.body.domain,
      Domain:"53ad6993f222ef325c05039c",
      isDeleted:0,
      ModifiedOn:Date.now()
    };
    var query={_id:req.body.id};
    var options = { multi: true };
    await project.updateOne(query, { $set: fields}, options);
    findAll(req,res);
  } catch(err) {
    res.json(err);
  }
};
exports.edit = edit;


var deleteOne = async function(req,res){
  try {
    var fields={
      isDeleted:1
    };
    var query={_id:req.body.id};
    var options = { multi: false };
    await project.updateOne(query, { $set: fields}, options);
    findAll(req,res);
  } catch(err) {
    res.json(err);
  }
}
exports.deleteOne = deleteOne;
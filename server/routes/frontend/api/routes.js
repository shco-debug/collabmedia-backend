var admin = require('../../../controllers/adminController.js');
var metaMetaTags = require('../../../controllers/metaMetaTagsController.js');
var groupTags = require('../../../controllers/groupTagsController.js');
var domains = require('../../../controllers/domainsController.js');
var fsg = require('../../../controllers/fsgController.js');
var media = require('../../../controllers/mediaController.js');
var collections = require('../../../controllers/collectionsController.js');
var sources = require('../../../controllers/sourcesController.js');
var contribution = require('../../../controllers/contributionController.js');
var randomMedia = require('../../../controllers/randomMediaGeneration.js');
var user = require('../../../controllers/userController.js');
var project = require('../../../controllers/projectController.js');
var board = require('../../../controllers/boardController.js');
var mediaActionLogs =require('../../../controllers/mediaActionLogsController.js');
var mediaSearchEngine =require('../../../controllers/mediaSearchEngineController.js');

module.exports = function(router){
	//console.log("in routes.js",router);
	//testing url area	added on 16092014
	router.post('/search_engine/search_v_3',function(req,res){
		mediaSearchEngine.search_v_3(req,res)
	});
	router.post('/search_engine/search_v_4',function(req,res){
		mediaSearchEngine.search_v_4(req,res)
	})
	router.post('/search_engine/search_v_5',function(req,res){
		mediaSearchEngine.search_v_5(req,res)
	})
	//end testing url area
	
	//---------/user
	router.post('/login',function(req,res){
		user.login(req,res);
	});
	
	router.get('/chklogin', function(req, res){
		//console.log("m in chklogin...");
		user.chklogin(req,res);
	});
	
	router.get('/view', function(req, res){
		user.view(req,res);
	});
	
	router.post('/register', function(req, res){
		user.register(req,res);
	});
	
	router.post('/addFsg', function(req, res){
		user.addFsg(req,res);
	});
	
	router.get('/logout', function(req, res){
		if (req.session.user) {
			req.session.user = null; // Deletes the cookie.
			res.json({"logout":"200","msg":"Success"});
		}        
	});
	
	/*
	//updated by manishp on 01102014 session issue
	router.get('/user/logout', function(req, res){
        if (req.session.user) {
			req.session.user = null; // Deletes the cookie.
			req.session.destroy(function(err) {
			  // cannot access session here
			  res.json({"logout":"200","msg":"Success"});
			})
		}        
    });
	*/
	
	//----------/admin
	router.post('/signin',function(req,res){
		admin.login(req,res);
	});
	router.get('/chklogin', function(req, res){
		admin.chklogin(req,res);
	});

	router.get('/logout', function(req, res){
		if (req.session.admin) {
				req.session.admin = null; // Deletes the cookie.
				res.json({"logout":"200","msg":"Success"});
		}        
	});
	
	/*
	//updated by manishp on 01102014 session issue
	router.get('/admin/logout', function(req, res){
        if (req.session.admin) {
			req.session.admin = null; // Deletes the cookie.
			req.session.destroy(function(err) {
			  // cannot access session here
			  res.json({"logout":"200","msg":"Success"});
			})
		}        
    });
	*/
	
	//----------/metaMetaTags
	
	router.get('/view', function(req,res){
		metaMetaTags.findAll(req,res);
	})
	router.post('/view', function(req,res){
		metaMetaTags.findDomainAll(req,res);
	})
	router.post('/add', function(req,res){
		metaMetaTags.add(req,res);
	})
	router.post('/edit', function(req,res){
		metaMetaTags.edit(req,res);
	})
	router.post('/delete', function(req,res){
		metaMetaTags.deleteOne(req,res);
	})
	router.post('/addDomain', function(req,res){
		metaMetaTags.addDomain(req,res);
	})
	router.post('/addDomains', function(req,res){
		metaMetaTags.addDomains(req,res);
	})
	
	
	//------------------/metaTags
	router.post('/view', function(req,res){
		metaMetaTags.findMeta(req,res);
	})
	router.post('/add', function(req,res){
		metaMetaTags.addMeta(req,res);
	})
	router.post('/edit', function(req,res){
		metaMetaTags.editMeta(req,res);
	})
	router.post('/delete', function(req,res){
		metaMetaTags.deleteMeta(req,res);
	})
	
	
	//---------/groupTags
	
	router.get('/view', function(req,res){
		groupTags.findAll(req,res);
	})
	router.post('/add', function(req,res){
		groupTags.add(req,res);
	})
	router.post('/edit', function(req,res){
		groupTags.edit(req,res);
	})
	router.post('/delete', function(req,res){
		groupTags.deleteOne(req,res);
	})
	router.post('/viewmt', function(req,res){
		groupTags.findMTAll(req,res);
	})
	
	
	//----------/gtbinding
	router.post('/view', function(req,res){
		groupTags.findAllBinding(req,res);
	})	
	router.post('/add', function(req,res){
		groupTags.addBinding(req,res);
	})
	router.post('/delete',function(req,res){
		groupTags.deleteBinding(req,res);
	})
	
	
	//---------------/tags
	router.post('/view', function(req,res){
		groupTags.findTag(req,res);
	})
	router.post('/add', function(req,res){
		groupTags.addTag(req,res);
	})
	router.post('/edit', function(req,res){
		groupTags.editTag(req,res);
	})
	router.post('/delete', function(req,res){
		groupTags.deleteTag(req,res);
	})
	
	
	//-----------/domains
	router.get('/view', function(req,res){
		domains.findAll(req,res);
	})
	router.post('/add', function(req,res){
		domains.add(req,res);
	})
	router.post('/edit', function(req,res){
		domains.edit(req,res);
	})
	router.post('/delete', function(req,res){
		domains.deleteOne(req,res);
	})
	
	
	
	//-----/fsg
	
	router.get('/view', function(req,res){
		fsg.findAll(req,res);
	})
	router.post('/add', function(req,res){
		fsg.add(req,res);
	})
	router.post('/edit', function(req,res){
		fsg.edit(req,res);
	})
	router.post('/delete', function(req,res){
		fsg.deleteOne(req,res);
	})
	
	
	//-----------/massmediaupload
	
	router.post('/add',function(req,res){
		media.uploadfile(req,res);
	})
	
	router.post('/edit',function(req,res){
		media.edit(req,res);
	})
	router.post('/editall',function(req,res){
		media.editAll(req,res);
	})
	router.post('/editTag',function(req,res){
		media.editTags(req,res);
	})	
	router.post('/view',function(req,res){
		media.findAll(req,res);
	})
	router.post('/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	router.post('/delete',function(req,res){
		media.deleteMedia(req,res);
	})
	
	
	//------------/collections
	
	//added by manish podiyal on 01/07/2014
	router.get('/view', function(req,res){
		collections.findAll(req,res);
	})
	router.post('/add', function(req,res){
		collections.add(req,res);
	})
	router.post('/edit', function(req,res){
		collections.edit(req,res);
	})
	router.post('/delete', function(req,res){
		collections.deleteOne(req,res);
	})
	
	
	//------------/sources
	
	router.get('/view', function(req,res){
		sources.findAll(req,res);
	})
	router.post('/add', function(req,res){
		sources.add(req,res);
	})
	router.post('/edit', function(req,res){
		sources.edit(req,res);
	})
	router.post('/delete', function(req,res){
		sources.deleteOne(req,res);
	})
	
	
	//--------------/contribution
	router.get('/view', function(req,res){
		contribution.findAll(req,res);
	})
	router.post('/add', function(req,res){
		contribution.add(req,res);
	})
	router.post('/edit', function(req,res){
		contribution.edit(req,res);
	})
	
	
	//----/projects
	router.get('/',function(req,res){
		project.findAll(req,res);
	});
	
	router.post('/add',function(req,res){
		project.add(req,res);
	});
	
	router.post('/edit',function(req,res){
		project.edit(req,res);
	});
	
	router.post('/delete',function(req,res){
		project.deleteOne(req,res);
	});
	
	//-------/boards
	router.post('/',function(req,res){
		board.findAll(req,res);
	});
	
	router.post('/add',function(req,res){
		board.add(req,res);
	});
	
	router.post('/edit',function(req,res){
		board.edit(req,res);
	});
	
	router.post('/delete',function(req,res){
		board.deleteOne(req,res);
	});
	
	router.post('/addMedia',function(req,res){
		board.addMediaToBoard(req,res)	
	})
	
	router.post('/uploadMedia',function(req,res){
		board.uploadMedia(req,res)	
	})
	
	router.post('/uploadHeader',function(req,res){
		board.uploadHeader(req,res)	
	})
	
	router.post('/duplicate',function(req,res){
		board.duplicate(req,res)	
	})
	
	router.post('/addComment',function(req,res){
		board.addComment(req,res)	
	})
	
	router.get('/userBoards',function(req,res){
		board.userBoards(req,res)
	})
	
	router.post('/addMembers',function(req,res){
		board.addMember(req,res)	
	})
	
	router.post('/createGroupTag',function(req,res){
		board.createGroupTag(req,res)	
	})
	
	router.post('/addGroupTag',function(req,res){
		board.addGroupTag(req,res)	
	})
	
	router.post('/deleteGroupTag',function(req,res){
		board.deleteGroupTag(req,res)	
	})
	
	router.post('/deleteInvitee',function(req,res){
		board.deleteInvitee(req,res)	
	})
	
	router.post('/deleteMedia',function(req,res){
		board.deleteMedia(req,res)	
	})
	
	router.post('/move',function(req,res){
		board.moveBoard(req,res)	
	})
	
	router.post('/rename',function(req,res){
		board.renameBoard(req,res)	
	})
	
	router.post('/renameTheme',function(req,res){
		board.renameTheme(req,res)	
	})
	
	//----------/media
	
	router.post('/mediaActionLogs',function(req,res){
		mediaActionLogs.addMediaAction(req,res)
	})
	
	router.post('/searchEngine',function(req,res){
		//mediaSearchEngine.search_v_4(req,res)
		mediaSearchEngine.search_v_5(req,res)	//added on 16092014
	})
	
	router.post('/addTagsToUploadedMedia',function(req,res){
		media.addTagsToUploadedMedia(req,res)	
	})
	
	router.post('/addViews',function(req,res){
		media.viewMedia(req,res)	
	})
	
	router.get('/test_userscore',function(req,res){
		mediaActionLogs.test_userscore(req,res)	
	})
	
	router.post('/actions',function(req,res){
		mediaActionLogs.logMediaAction(req,res);	
	})
	
	router.post('/uploadLink',function(req,res){
		media.uploadLink(req,res);
	})
	
	//---------/myInvitees
	
	router.get('/',function(req,res){
		board.myInvitees(req,res)
	})
	
	//---------/myBoards
	router.post('/',function(req,res){
		board.myBoards(req,res);
	})
	
	//-------/addBoardMediaToBoard
	
	router.post('/',function(req,res){
		board.addBoardMediaToBoard(req,res);	
	})
}
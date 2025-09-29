var admin = require('../controllers/adminController.js');
var metaMetaTags = require('../controllers/metaMetaTagsController.js');
var groupTags = require('../controllers/groupTagsController.js');
var domains = require('../controllers/domainsController.js');
var fsg = require('../controllers/fsgController.js');
var media = require('../controllers/mediaController.js');
var collections = require('../controllers/collectionsController.js');
var sources = require('../controllers/sourcesController.js');
var contribution = require('../controllers/contributionController.js');
var randomMedia = require('../controllers/randomMediaGeneration.js');
var user = require('../controllers/userController.js');
var project = require('../controllers/projectController.js');
var board = require('../controllers/boardController.js');
var mediaActionLogs =require('../controllers/mediaActionLogsController.js');
var mediaSearchEngine =require('../controllers/mediaSearchEngineController.js');

module.exports = function(router){
	console.log("in routes.js",router);
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
	
	router.post('/user/login',function(req,res){
		user.login(req,res);
	});
	
	router.get('/user/chklogin', function(req, res){
		user.chklogin(req,res);
	});
	
	router.get('/user/view', function(req, res){
		user.view(req,res);
	});
	
	router.post('/user/register', function(req, res){
		user.register(req,res);
	});
	
	router.post('/user/addFsg', function(req, res){
		user.addFsg(req,res);
	});
	
	
	router.get('/user/logout', function(req, res){
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
	
	router.post('/admin/signin',function(req,res){
		admin.login(req,res);
	});
	router.get('/admin/chklogin', function(req, res){
		admin.chklogin(req,res);
	});

	router.get('/admin/logout', function(req, res){
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
	router.get('/metaMetaTags/view', function(req,res){
		metaMetaTags.findAll(req,res);
	})
	router.post('/metaMetaTags/view', function(req,res){
		metaMetaTags.findDomainAll(req,res);
	})
	router.post('/metaMetaTags/add', function(req,res){
		metaMetaTags.add(req,res);
	})
	router.post('/metaMetaTags/edit', function(req,res){
		metaMetaTags.edit(req,res);
	})
	router.post('/metaMetaTags/delete', function(req,res){
		metaMetaTags.deleteOne(req,res);
	})
	router.post('/metaMetaTags/addDomain', function(req,res){
		metaMetaTags.addDomain(req,res);
	})
	router.post('/metaMetaTags/addDomains', function(req,res){
		metaMetaTags.addDomains(req,res);
	})
	
	router.post('/metaTags/view', function(req,res){
		metaMetaTags.findMeta(req,res);
	})
	router.post('/metaTags/add', function(req,res){
		metaMetaTags.addMeta(req,res);
	})
	router.post('/metaTags/edit', function(req,res){
		metaMetaTags.editMeta(req,res);
	})
	router.post('/metaTags/delete', function(req,res){
		metaMetaTags.deleteMeta(req,res);
	})
	
	
	
	
	router.get('/groupTags/view', function(req,res){
		groupTags.findAll(req,res);
	})
	router.post('/groupTags/add', function(req,res){
		groupTags.add(req,res);
	})
	router.post('/groupTags/edit', function(req,res){
		groupTags.edit(req,res);
	})
	router.post('/groupTags/delete', function(req,res){
		groupTags.deleteOne(req,res);
	})
	router.post('/groupTags/viewmt', function(req,res){
		groupTags.findMTAll(req,res);
	})
	
	
	router.post('/gtbinding/view', function(req,res){
		groupTags.findAllBinding(req,res);
	})	
	router.post('/gtbinding/add', function(req,res){
		groupTags.addBinding(req,res);
	})
	router.post('/gtbinding/delete',function(req,res){
		groupTags.deleteBinding(req,res);
	})
	
	
	
	router.post('/tags/view', function(req,res){
		groupTags.findTag(req,res);
	})
	router.post('/tags/add', function(req,res){
		groupTags.addTag(req,res);
	})
	router.post('/tags/edit', function(req,res){
		groupTags.editTag(req,res);
	})
	router.post('/tags/delete', function(req,res){
		groupTags.deleteTag(req,res);
	})
	
	
	router.get('/domains/view', function(req,res){
		domains.findAll(req,res);
	})
	router.post('/domains/add', function(req,res){
		domains.add(req,res);
	})
	router.post('/domains/edit', function(req,res){
		domains.edit(req,res);
	})
	router.post('/domains/delete', function(req,res){
		domains.deleteOne(req,res);
	})
	
	
	
	
	router.get('/fsg/view', function(req,res){
		fsg.findAll(req,res);
	})
	router.post('/fsg/add', function(req,res){
		fsg.add(req,res);
	})
	router.post('/fsg/edit', function(req,res){
		fsg.edit(req,res);
	})
	router.post('/fsg/delete', function(req,res){
		fsg.deleteOne(req,res);
	})
	
	
	
	
	router.post('/massmediaupload/add',function(req,res){
		media.uploadfile(req,res);
	})
	router.post('/media/uploadLink',function(req,res){
		media.uploadLink(req,res);
	})
	
	router.post('/massmediaupload/edit',function(req,res){
		media.edit(req,res);
	})
	router.post('/massmediaupload/editall',function(req,res){
		media.editAll(req,res);
	})
	router.post('/massmediaupload/editTag',function(req,res){
		media.editTags(req,res);
	})	
	router.post('/massmediaupload/view',function(req,res){
		media.findAll(req,res);
	})
	router.post('/massmediaupload/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	router.post('/massmediaupload/delete',function(req,res){
		media.deleteMedia(req,res);
	})
	
	
	//added by manish podiyal on 01/07/2014
	router.get('/collections/view', function(req,res){
		collections.findAll(req,res);
	})
	router.post('/collections/add', function(req,res){
		collections.add(req,res);
	})
	router.post('/collections/edit', function(req,res){
		collections.edit(req,res);
	})
	router.post('/collections/delete', function(req,res){
		collections.deleteOne(req,res);
	})
	
	
	router.get('/sources/view', function(req,res){
		sources.findAll(req,res);
	})
	router.post('/sources/add', function(req,res){
		sources.add(req,res);
	})
	router.post('/sources/edit', function(req,res){
		sources.edit(req,res);
	})
	router.post('/sources/delete', function(req,res){
		sources.deleteOne(req,res);
	})
	
	
	router.get('/contribution/view', function(req,res){
		contribution.findAll(req,res);
	})
	router.post('/contribution/add', function(req,res){
		contribution.add(req,res);
	})
	router.post('/contribution/edit', function(req,res){
		contribution.edit(req,res);
	})
	
	
	
	router.get('/projects',function(req,res){
		project.findAll(req,res);
	});
	
	router.post('/projects/add',function(req,res){
		project.add(req,res);
	});
	
	router.post('/projects/edit',function(req,res){
		project.edit(req,res);
	});
	
	router.post('/projects/delete',function(req,res){
		project.deleteOne(req,res);
	});
	
	router.post('/boards',function(req,res){
		board.findAll(req,res);
	});
	
	router.post('/boards/add',function(req,res){
		board.add(req,res);
	});
	
	router.post('/boards/edit',function(req,res){
		board.edit(req,res);
	});
	
	router.post('/boards/delete',function(req,res){
		board.deleteOne(req,res);
	});
	
	router.post('/boards/addMedia',function(req,res){
		board.addMediaToBoard(req,res)	
	})
	
	router.post('/boards/uploadMedia',function(req,res){
		board.uploadMedia(req,res)	
	})
	
	
	router.post('/media/mediaActionLogs',function(req,res){
		mediaActionLogs.addMediaAction(req,res)
	})
	
	router.post('/media/searchEngine',function(req,res){
		//mediaSearchEngine.search_v_4(req,res)
		mediaSearchEngine.search_v_5(req,res)	//added on 16092014
	})
	
	router.post('/media/addTagsToUploadedMedia',function(req,res){
		media.addTagsToUploadedMedia(req,res)	
	})
	
	router.post('/media/addViews',function(req,res){
		media.viewMedia(req,res)	
	})
	
	router.get('/media/test_userscore',function(req,res){
		mediaActionLogs.test_userscore(req,res)	
	})
	
	router.post('/boards/uploadHeader',function(req,res){
		board.uploadHeader(req,res)	
	})
	
	router.post('/boards/duplicate',function(req,res){
		board.duplicate(req,res)	
	})
	
	router.post('/boards/addComment',function(req,res){
		board.addComment(req,res)	
	})
	
	router.get('/boards/userBoards',function(req,res){
		board.userBoards(req,res)
	})
	
	router.post('/boards/addMembers',function(req,res){
		board.addMember(req,res)	
	})
	
	router.post('/boards/createGroupTag',function(req,res){
		board.createGroupTag(req,res)	
	})
	
	router.post('/boards/addGroupTag',function(req,res){
		board.addGroupTag(req,res)	
	})
	
	router.post('/boards/deleteGroupTag',function(req,res){
		board.deleteGroupTag(req,res)	
	})
	
	router.post('/boards/deleteInvitee',function(req,res){
		board.deleteInvitee(req,res)	
	})
	
	router.post('/boards/deleteMedia',function(req,res){
		board.deleteMedia(req,res)	
	})
	
	router.post('/board/move',function(req,res){
		board.moveBoard(req,res)	
	})
	
	router.post('/boards/rename',function(req,res){
		board.renameBoard(req,res)	
	})
	
	router.post('/boards/renameTheme',function(req,res){
		board.renameTheme(req,res)	
	})
		
	router.post('/media/actions',function(req,res){
		mediaActionLogs.logMediaAction(req,res);	
	})
	
	router.get('/myInvitees',function(req,res){
		board.myInvitees(req,res)
	})
	
	router.post('/myBoards',function(req,res){
		board.myBoards(req,res);
	})
	
	router.post('/addBoardMediaToBoard',function(req,res){
		board.addBoardMediaToBoard(req,res);	
	})
	
	
	//render layout code at last
	//front-end renders
	router.get('/',function(req,res){
		res.render('layouts/frontend/frontLayout.html');
	});
	
	router.get('/board',function(req,res){
		res.render('layouts/frontend/boardsLayout.html');
	});
	
	//back-end renders
	router.get('/admin',function(req,res){
		res.render('layouts/backend/adminLayout.html');
	});
	
	router.get('/admin/login',function(req,res){
		res.render('admin/login.html');
	});
	
}
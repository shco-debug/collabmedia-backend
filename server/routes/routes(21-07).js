var admin = require('../controllers/adminController.js');
var metaMetaTags = require('../controllers/metaMetaTagsController.js');
var groupTags = require('../controllers/groupTagsController.js');
var domains = require('../controllers/domainsController.js');
var media = require('../controllers/mediaController.js');
var collections = require('../controllers/collectionsController.js');
var sources = require('../controllers/sourcesController.js');

module.exports = function(app){

	app.get('/admin',function(req,res){
		res.render('layouts/backend/adminLayout.html');
	});
	
	app.get('/admin/login',function(req,res){
		res.render('admin/login.html');
	});

	app.post('/admin/signin',function(req,res){
		admin.login(req,res);
	});
	app.get('/admin/chklogin', function(req, res){
        admin.chklogin(req,res);
    });

	app.get('/admin/logout', function(req, res){
        if (req.session.admin) {
            req.session.destroy(function(){
                res.json({"logout":"200","msg":"Success"});
            });    
        }        
    });
	
	app.get('/metaMetaTags/view', function(req,res){
		metaMetaTags.findAll(req,res);
	})
	app.post('/metaMetaTags/view', function(req,res){
		metaMetaTags.findDomainAll(req,res);
	})
	app.post('/metaMetaTags/add', function(req,res){
		metaMetaTags.add(req,res);
	})
	app.post('/metaMetaTags/edit', function(req,res){
		metaMetaTags.edit(req,res);
	})
	app.post('/metaMetaTags/delete', function(req,res){
		metaMetaTags.deleteOne(req,res);
	})
	app.post('/metaMetaTags/addDomain', function(req,res){
		metaMetaTags.addDomain(req,res);
	})
	app.post('/metaTags/view', function(req,res){
		metaMetaTags.findMeta(req,res);
	})
	app.post('/metaTags/add', function(req,res){
		metaMetaTags.addMeta(req,res);
	})
	app.post('/metaTags/edit', function(req,res){
		metaMetaTags.editMeta(req,res);
	})
	app.post('/metaTags/delete', function(req,res){
		metaMetaTags.deleteMeta(req,res);
	})
	
	
	
	
	app.get('/groupTags/view', function(req,res){
		groupTags.findAll(req,res);
	})
	app.post('/groupTags/add', function(req,res){
		groupTags.add(req,res);
	})
	app.post('/groupTags/edit', function(req,res){
		groupTags.edit(req,res);
	})
	app.post('/groupTags/delete', function(req,res){
		groupTags.deleteOne(req,res);
	})
	app.post('/groupTags/viewmt', function(req,res){
		groupTags.findMTAll(req,res);
	})
	
	
	app.post('/gtbinding/view', function(req,res){
		groupTags.findAllBinding(req,res);
	})	
	app.post('/gtbinding/add', function(req,res){
		groupTags.addBinding(req,res);
	})
	app.post('/gtbinding/delete',function(req,res){
		groupTags.deleteBinding(req,res);
	})
	
	
	
	app.post('/tags/view', function(req,res){
		groupTags.findTag(req,res);
	})
	app.post('/tags/add', function(req,res){
		groupTags.addTag(req,res);
	})
	app.post('/tags/edit', function(req,res){
		groupTags.editTag(req,res);
	})
	app.post('/tags/delete', function(req,res){
		groupTags.deleteTag(req,res);
	})
	
	
	app.get('/domains/view', function(req,res){
		domains.findAll(req,res);
	})
	app.post('/domains/add', function(req,res){
		domains.add(req,res);
	})
	app.post('/domains/edit', function(req,res){
		domains.edit(req,res);
	})
	app.post('/domains/delete', function(req,res){
		domains.deleteOne(req,res);
	})
	
	app.post('/massmediaupload/add',function(req,res){
		media.uploadfile(req,res);
	})
	app.post('/massmediaupload/edit',function(req,res){
		media.edit(req,res);
	})
	app.post('/massmediaupload/editTag',function(req,res){
		media.editTags(req,res);
	})	
	app.get('/massmediaupload/view',function(req,res){
		media.findAll(req,res);
	})
	app.get('/massmediaupload/view/all',function(req,res){
		media.findAllStatus(req,res);
	})
	
	
	//added by manish podiyal on 01/07/2014
	app.get('/collections/view', function(req,res){
		collections.findAll(req,res);
	})
	app.post('/collections/add', function(req,res){
		collections.add(req,res);
	})
	app.post('/collections/edit', function(req,res){
		collections.edit(req,res);
	})
	app.post('/collections/delete', function(req,res){
		collections.deleteOne(req,res);
	})
	
	app.get('/sources/view', function(req,res){
		sources.findAll(req,res);
	})
	app.post('/sources/add', function(req,res){
		console.log("source add api called....");
		sources.add(req,res);
	})
	app.post('/sources/edit', function(req,res){
		sources.edit(req,res);
	})
	app.post('/sources/delete', function(req,res){
		sources.deleteOne(req,res);
	})
}

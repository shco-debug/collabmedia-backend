const subAdmin = require('../../../controllers/subAdminController.js');

module.exports = function(router) {
    
    //-----/subadmin
    router.get('/', function(req, res) {
        //if(req.session.subAdmin)
        res.render('layouts/backend/subAdminLayout.html');
        //else{
        //    var reqUrl = req.baseUrl + req.path;
        //    if( reqUrl != '/subadmin/signin' ){
        //        res.render('subadmin/login.html');
        //    }
        //}
        //res.render('subadmin/login.html');
    });

    // Authentication routes
    router.post('/signin', function(req, res) {
        subAdmin.login(req, res);
    });

    router.get('/chklogin', function(req, res) {
        subAdmin.chklogin(req, res);
    });

    router.get('/logout', function(req, res) {
        subAdmin.logout(req, res);
    });

    // SubAdmin management routes
    router.get('/subadmins', function(req, res) {
        subAdmin.getAllSubAdmins(req, res);
    });

    router.post('/create', function(req, res) {
        subAdmin.createSubAdmin(req, res);
    });

    router.put('/profile/:id', function(req, res) {
        subAdmin.updateProfile(req, res);
    });

    router.delete('/:id', function(req, res) {
        subAdmin.deleteSubAdmin(req, res);
    });
};
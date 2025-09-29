var mediaCopyrightClaimsRoutes = require('../../../controllers/mediaCopyrightClaimsController.js');
module.exports = function (router) {
    
    // To Get All Copyrights
    router.post('/view', function (req, res) {
        console.log("Inside mediaCopyrightClaims routes in view");
        mediaCopyrightClaimsRoutes.findPerPage(req, res);
    })
    
    // To Get Searched Copyrights
    router.post('/search', function (req, res) {
        mediaCopyrightClaimsRoutes.findPerPage(req, res);
    });
    
    
    /** 17-January-2k17 Changes **/
    
    // To Get All Users By MediaID
    router.post('/get_usersByMediaID', function (req, res) {
        mediaCopyrightClaimsRoutes.get_usersByMediaID(req, res);
    });
    
    // To Get Searched Users
    router.post('/searchUser', function (req, res) {
        console.log("Inside searchQuery routes - -- >")
        mediaCopyrightClaimsRoutes.searchQuery(req, res);
    });

}
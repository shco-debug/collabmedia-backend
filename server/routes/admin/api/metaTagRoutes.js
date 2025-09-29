const metaMetaTags = require('../../../controllers/metaMetaTagsController.js');

module.exports = function(router) {
    // View meta tags by meta meta tag
    router.post('/view', function(req, res) {
        metaMetaTags.findMeta(req, res);
    });
    
    // Add new meta tag
    router.post('/add', function(req, res) {
        metaMetaTags.addMeta(req, res);
    });
    
    // Edit meta tag
    router.post('/edit', function(req, res) {
        metaMetaTags.editMeta(req, res);
    });
    
    // Delete meta tag
    router.post('/delete', function(req, res) {
        metaMetaTags.deleteMeta(req, res);
    });
};
/**
 * Share Routes
 * Public endpoints for post sharing
 */

const ShareController = require('../../../controllers/shareController.js');

module.exports = function(router) {
  
  /**
   * Get public post data by ID
   * GET /api/share/post/:id
   * No authentication required - public endpoint
   */
  router.get('/post/:id', function(req, res) {
    ShareController.getPublicPost(req, res);
  });

  /**
   * Get blended image metadata
   * GET /api/share/image/:postHashCode
   * No authentication required - public endpoint
   */
  router.get('/image/:postHashCode', function(req, res) {
    ShareController.getBlendedImage(req, res);
  });

  /**
   * Get public media/post data by ID
   * GET /api/share/media/:id
   * No authentication required - public endpoint
   */
  router.get('/media/:id', function(req, res) {
    ShareController.getPublicMedia(req, res);
  });

};


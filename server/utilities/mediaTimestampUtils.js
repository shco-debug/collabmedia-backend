/**
 * Media Timestamp Utilities
 * 
 * Provides helper functions to automatically add createdAt and updatedAt timestamps
 * to media documents for both Mongoose .save() and native .collection.insertOne/insertMany() operations.
 */

/**
 * Adds createdAt and updatedAt timestamps to a media data object
 * @param {Object|Array} data - Media data object or array of media objects
 * @param {Boolean} isNew - Whether this is a new document (true) or update (false)
 * @returns {Object|Array} Data object(s) with timestamps added
 */
function addMediaTimestamps(data, isNew = true) {
  const now = new Date();
  
  if (Array.isArray(data)) {
    // For insertMany - add timestamps to each item
    return data.map(item => {
      const timestampedItem = { ...item };
      if (isNew && !timestampedItem.createdAt) {
        timestampedItem.createdAt = now;
      }
      timestampedItem.updatedAt = now;
      return timestampedItem;
    });
  } else {
    // For insertOne or single object
    const timestampedData = { ...data };
    if (isNew && !timestampedData.createdAt) {
      timestampedData.createdAt = now;
    }
    timestampedData.updatedAt = now;
    return timestampedData;
  }
}

/**
 * Updates only the updatedAt timestamp (for update operations)
 * @param {Object} data - Media data object
 * @returns {Object} Data object with updatedAt timestamp
 */
function updateMediaTimestamp(data) {
  return {
    ...data,
    updatedAt: new Date()
  };
}

module.exports = {
  addMediaTimestamps,
  updateMediaTimestamp
};





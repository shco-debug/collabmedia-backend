var Relationship = require('./../models/relationshipModel.js');

// Get all active relationships
const getAllRelationships = async function(req, res) {
    try {
        const relationships = await Relationship.getActive();
        res.json({
            'code': 200,
            'msg': 'Relationships retrieved successfully',
            'relationships': relationships
        });
    } catch (error) {
        console.error('Error in getAllRelationships:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Get default relationship
const getDefaultRelationship = async function(req, res) {
    try {
        const defaultRel = await Relationship.getDefault();
        if (!defaultRel) {
            return res.json({'code': 404, 'error': 'No default relationship found'});
        }
        res.json({
            'code': 200,
            'msg': 'Default relationship retrieved',
            'relationship': defaultRel
        });
    } catch (error) {
        console.error('Error in getDefaultRelationship:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Add new relationship
const addRelationship = async function(req, res) {
    try {
        const { title, description, icon, color, order, isDefault } = req.body;
        
        if (!title) {
            return res.json({'code': 400, 'error': 'Relationship title is required'});
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await Relationship.updateMany(
                { IsDefault: true },
                { $set: { IsDefault: false } }
            );
        }

        const newRelationship = new Relationship({
            RelationshipTitle: title,
            Description: description || '',
            Icon: icon || '👥',
            Color: color || '#007bff',
            Order: order || 1000,
            IsDefault: isDefault || false
        });

        await newRelationship.save();

        res.json({
            'code': 200,
            'msg': 'Relationship added successfully',
            'relationship': newRelationship
        });
    } catch (error) {
        console.error('Error in addRelationship:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Update relationship
const updateRelationship = async function(req, res) {
    try {
        const { id, title, description, icon, color, order, isActive, isDefault } = req.body;
        
        if (!id) {
            return res.json({'code': 400, 'error': 'Relationship ID is required'});
        }

        const updateData = {};
        if (title) updateData.RelationshipTitle = title;
        if (description !== undefined) updateData.Description = description;
        if (icon) updateData.Icon = icon;
        if (color) updateData.Color = color;
        if (order !== undefined) updateData.Order = order;
        if (isActive !== undefined) updateData.IsActive = isActive;
        if (isDefault !== undefined) updateData.IsDefault = isDefault;

        // If this is set as default, unset other defaults
        if (isDefault) {
            await Relationship.updateMany(
                { _id: { $ne: id }, IsDefault: true },
                { $set: { IsDefault: false } }
            );
        }

        const updatedRelationship = await Relationship.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedRelationship) {
            return res.json({'code': 404, 'error': 'Relationship not found'});
        }

        res.json({
            'code': 200,
            'msg': 'Relationship updated successfully',
            'relationship': updatedRelationship
        });
    } catch (error) {
        console.error('Error in updateRelationship:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Delete relationship (soft delete)
const deleteRelationship = async function(req, res) {
    try {
        const { id } = req.body;
        
        if (!id) {
            return res.json({'code': 400, 'error': 'Relationship ID is required'});
        }

        const relationship = await Relationship.findById(id);
        if (!relationship) {
            return res.json({'code': 404, 'error': 'Relationship not found'});
        }

        // Don't allow deletion of default relationship
        if (relationship.IsDefault) {
            return res.json({'code': 400, 'error': 'Cannot delete default relationship'});
        }

        // Soft delete
        relationship.IsActive = false;
        await relationship.save();

        res.json({
            'code': 200,
            'msg': 'Relationship deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteRelationship:', error);
        res.json({'code': 400, 'error': error.message});
    }
};

// Initialize default relationships
const initializeDefaultRelationships = async function() {
    try {
        const defaultRelationships = [
            {
                RelationshipTitle: 'Friend',
                Description: 'General friendship relationship',
                Icon: '👥',
                Color: '#007bff',
                Order: 1,
                IsDefault: true,
                IsActive: true
            },
            {
                RelationshipTitle: 'Family',
                Description: 'Family member relationship',
                Icon: '👨‍👩‍👧‍👦',
                Color: '#28a745',
                Order: 2,
                IsActive: true
            },
            {
                RelationshipTitle: 'Colleague',
                Description: 'Work colleague relationship',
                Icon: '💼',
                Color: '#ffc107',
                Order: 3,
                IsActive: true
            },
            {
                RelationshipTitle: 'Acquaintance',
                Description: 'Casual acquaintance relationship',
                Icon: '🤝',
                Color: '#6c757d',
                Order: 4,
                IsActive: true
            }
        ];

        for (const rel of defaultRelationships) {
            const existing = await Relationship.findOne({ 
                RelationshipTitle: rel.RelationshipTitle 
            });
            
            if (!existing) {
                await new Relationship(rel).save();
                console.log(`Created default relationship: ${rel.RelationshipTitle}`);
            }
        }
        
        console.log('Default relationships initialized');
    } catch (error) {
        console.error('Error initializing default relationships:', error);
    }
};

// Export functions
exports.getAllRelationships = getAllRelationships;
exports.getDefaultRelationship = getDefaultRelationship;
exports.addRelationship = addRelationship;
exports.updateRelationship = updateRelationship;
exports.deleteRelationship = deleteRelationship;
exports.initializeDefaultRelationships = initializeDefaultRelationships;

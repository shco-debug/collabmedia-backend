var socketio = require('socket.io');
var socketConnection = exports = module.exports = {};

socketConnection.listen = function listen(app) {
    io = socketio.listen(app);
    exports.sockets = io.sockets;
    global.socketIO = io.sockets;
    io.sockets.on('connection', function (socket) {
        //console.log('socket connected');
        socket.on('newPostNotification', function (data) {
			data.page_id = data.page_id ? data.page_id : null;
            if(data.page_id){
                socketConnection.socketNewPostNotification({page_id:data.page_id});
            }
        });
        
		//console.log("device "+socket.id+" connected");
        socket.on('disconnect', function () {
            console.log('One disconnect request found!');
        });
		
    });
    return io;
};

socketConnection.socketNewPostNotification = function (data) {
    try {
        // Validate input data
        if (!data || typeof data !== 'object') {
            console.error('❌ socketNewPostNotification: Invalid data provided:', data);
            return false;
        }

        // Check if socketIO is available
        if (!global.socketIO) {
            console.warn('⚠️ socketNewPostNotification: SocketIO not initialized, skipping notification');
            return false;
        }

        // Validate page_id
        if (!data.page_id) {
            console.warn('⚠️ socketNewPostNotification: No page_id provided, skipping notification');
            return false;
        }

        // Create enhanced notification payload
        const notificationPayload = {
            page_id: data.page_id,
            timestamp: new Date().toISOString(),
            type: 'new_post',
            action: data.action || 'post_created',
            user_id: data.user_id || null,
            media_id: data.media_id || null,
            board_id: data.board_id || data.page_id,
            metadata: {
                source: 'media_action_logs',
                version: '2.0',
                ...data.metadata
            }
        };

        // Emit notification with error handling
        global.socketIO.emit('newPostNotification', notificationPayload);
        
        // Log successful notification
        console.log('✅ socketNewPostNotification: Notification sent successfully', {
            page_id: data.page_id,
            timestamp: notificationPayload.timestamp,
            recipients: global.socketIO.engine.clientsCount || 'unknown'
        });

        return true;

    } catch (error) {
        console.error('❌ socketNewPostNotification: Error sending notification:', {
            error: error.message,
            stack: error.stack,
            data: data
        });
        return false;
    }
};

// Advanced socket notification functions
socketConnection.socketCommentNotification = function (data) {
    try {
        if (!data || !data.page_id) {
            console.warn('⚠️ socketCommentNotification: Invalid data or missing page_id');
            return false;
        }

        if (!global.socketIO) {
            console.warn('⚠️ socketCommentNotification: SocketIO not initialized');
            return false;
        }

        const notificationPayload = {
            page_id: data.page_id,
            timestamp: new Date().toISOString(),
            type: 'new_comment',
            action: data.action || 'comment_added',
            user_id: data.user_id || null,
            comment_id: data.comment_id || null,
            post_id: data.post_id || null,
            metadata: {
                source: 'board_controller',
                version: '2.0',
                ...data.metadata
            }
        };

        global.socketIO.emit('newCommentNotification', notificationPayload);
        console.log('✅ socketCommentNotification: Comment notification sent', { page_id: data.page_id });
        return true;

    } catch (error) {
        console.error('❌ socketCommentNotification: Error:', error.message);
        return false;
    }
};

socketConnection.socketLikeNotification = function (data) {
    try {
        if (!data || !data.page_id) {
            console.warn('⚠️ socketLikeNotification: Invalid data or missing page_id');
            return false;
        }

        if (!global.socketIO) {
            console.warn('⚠️ socketLikeNotification: SocketIO not initialized');
            return false;
        }

        const notificationPayload = {
            page_id: data.page_id,
            timestamp: new Date().toISOString(),
            type: 'like_action',
            action: data.action || 'post_liked',
            user_id: data.user_id || null,
            media_id: data.media_id || null,
            like_type: data.like_type || '1',
            metadata: {
                source: 'media_action_logs',
                version: '2.0',
                ...data.metadata
            }
        };

        global.socketIO.emit('likeNotification', notificationPayload);
        console.log('✅ socketLikeNotification: Like notification sent', { page_id: data.page_id });
        return true;

    } catch (error) {
        console.error('❌ socketLikeNotification: Error:', error.message);
        return false;
    }
};

socketConnection.socketUserActivityNotification = function (data) {
    try {
        if (!data || !data.user_id) {
            console.warn('⚠️ socketUserActivityNotification: Invalid data or missing user_id');
            return false;
        }

        if (!global.socketIO) {
            console.warn('⚠️ socketUserActivityNotification: SocketIO not initialized');
            return false;
        }

        const notificationPayload = {
            user_id: data.user_id,
            timestamp: new Date().toISOString(),
            type: 'user_activity',
            action: data.action || 'activity_logged',
            page_id: data.page_id || null,
            activity_type: data.activity_type || 'general',
            metadata: {
                source: 'user_controller',
                version: '2.0',
                ...data.metadata
            }
        };

        global.socketIO.emit('userActivityNotification', notificationPayload);
        console.log('✅ socketUserActivityNotification: Activity notification sent', { user_id: data.user_id });
        return true;

    } catch (error) {
        console.error('❌ socketUserActivityNotification: Error:', error.message);
        return false;
    }
};

socketConnection.socketBroadcastToPage = function (pageId, eventName, data) {
    try {
        if (!pageId || !eventName) {
            console.warn('⚠️ socketBroadcastToPage: Missing pageId or eventName');
            return false;
        }

        if (!global.socketIO) {
            console.warn('⚠️ socketBroadcastToPage: SocketIO not initialized');
            return false;
        }

        const payload = {
            page_id: pageId,
            timestamp: new Date().toISOString(),
            data: data || {},
            metadata: {
                source: 'socket_broadcast',
                version: '2.0'
            }
        };

        global.socketIO.emit(eventName, payload);
        console.log('✅ socketBroadcastToPage: Broadcast sent', { pageId, eventName });
        return true;

    } catch (error) {
        console.error('❌ socketBroadcastToPage: Error:', error.message);
        return false;
    }
};

socketConnection.socketGetConnectionCount = function () {
    try {
        if (!global.socketIO) {
            return 0;
        }
        return global.socketIO.engine.clientsCount || 0;
    } catch (error) {
        console.error('❌ socketGetConnectionCount: Error:', error.message);
        return 0;
    }
};

socketConnection.socketIsInitialized = function () {
    try {
        return !!(global.socketIO && global.socketIO.engine);
    } catch (error) {
        console.error('❌ socketIsInitialized: Error:', error.message);
        return false;
    }
};

//socketConnection.socketNewPostNotification(data);
/*
Session Compatibility Middleware
Maps JWT user data to req.session.user for backward compatibility
*/

module.exports = function(req, res, next) {
    console.log('🔄 Session compatibility middleware called for:', req.originalUrl);
    console.log('🔄 req.user exists:', !!req.user);
    console.log('🔄 req.session exists:', !!req.session);
    
    // If we have JWT user data, create a session-like object for backward compatibility
    if (req.user) {
        req.session = {
            user: {
                _id: req.user.userId,
                Email: req.user.email,
                Name: req.user.name,
                Role: req.user.role,
                Status: req.user.status,
                EmailConfirmationStatus: req.user.emailConfirmationStatus,
                AllowCreate: req.user.allowCreate,
                ProfilePic: req.user.profilePic,
                Gender: req.user.gender,
                CreatedOn: req.user.createdOn,
                ModifiedOn: req.user.modifiedOn,
                LastActiveTime: req.user.lastActiveTime,
                // Add any other fields that might be needed
                NickName: req.user.nickName || '',
                UserName: req.user.userName || '',
                BrowserPolicyAccepted: req.user.browserPolicyAccepted || false,
                ApplicationPolicyAccepted: req.user.applicationPolicyAccepted || false,
                IsDeleted: req.user.isDeleted || false,
                StripeStatus: req.user.stripeStatus || false,
                SelectedTheme: req.user.selectedTheme || 'default',
                Subdomain: req.user.subdomain || '',
                Subdomain_name: req.user.subdomain_name || '',
                Subdomain_title: req.user.subdomain_title || '',
                Subdomain_description: req.user.subdomain_description || '',
                Subdomain_profilePic: req.user.subdomain_profilePic || '',
                MarketingEmail: req.user.marketingEmail || false,
                PostActionsNotification: req.user.postActionsNotification || false,
                CommentLikesNotification: req.user.commentLikesNotification || false,
                UnsubscribedStreams: req.user.unsubscribedStreams || [],
                AutoPlayerSeenStreams: req.user.autoPlayerSeenStreams || [],
                PostActionAnnouncementSeenStreams: req.user.postActionAnnouncementSeenStreams || [],
                IsAddDetailsSeen: req.user.isAddDetailsSeen || false,
                IsWelcomeSeen: req.user.isWelcomeSeen || false,
                IsHowItWorksSeen: req.user.isHowItWorksSeen || false,
                IsPostLaunchVideoSeen: req.user.isPostLaunchVideoSeen || false,
                SpeechToTextMediaId: req.user.speechToTextMediaId || '',
                referralCode: req.user.referralCode || '',
                resetPasswordToken: req.user.resetPasswordToken || '',
                FSGsArr: req.user.fsgsArr || [],
                FSGsArr2: req.user.fsgsArr2 || null,
                Settings: req.user.settings || [],
                IsCredit: req.user.isCredit || false,
                CreditAmount: req.user.creditAmount || 0,
                TourView: req.user.tourView || {
                    CapsuleDashboard: false,
                    DashboardChapters: false,
                    QAView: false,
                    SearchList: false,
                    SearchView: false,
                    DiscussList: false,
                    DiscussView: false
                },
                __v: req.user.__v || 0
            }
        };
        
        console.log('🔄 Session compatibility: Created req.session.user from JWT data for user:', req.user.email);
    } else {
        console.log('🔄 Session compatibility: No req.user found, skipping session creation');
    }
    
    next();
};

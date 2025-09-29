/*
* Date - 3 June 2014
* Comments - Creates the instance of the application and sets the environment
* Modernized for ES6+ and updated packages
*/

const express = require('express');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bp = require('body-parser');
const url = require('url');

//enabling gZip compression : It will reduce the web site size to 70% - Added on 13052015
const compress = require('compression');

const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');

const user = require('../../server/models/userModel.js');
const Capsule = require('../../server/models/capsuleModel.js');
const StreamMembers = require('../../server/models/StreamMembersModel.js');
const StreamConversation = require('../../server/models/StreamConversationModel.js');
const StreamEmailTracker = require('../../server/models/StreamEmailTrackerModel.js');
const AppSetting = require('../../server/models/appSettingModel.js')
const CommonAlgo = require('../../server/components/commonAlgorithms.js');

const ObjectId = mongoose.Types.ObjectId;
const SyncedPost = require('../../server/models/syncedpostModel.js');

module.exports = (app) => {
	
	require('./../env/default_2.js')(app);
	
	//set cron job manager
	//require('../../server/cron-jobs/cronJobs__Manager.js');
	/*
	function requireHTTPS(req, res, next) {
		//console.log(" --------------- req.secure -----------------", req.secure);
		if (!req.secure) {
			if(req.get('host') == 'scrpt.com/' || req.get('host') == 'scrpt.com') {
				return res.redirect('https://www.' + req.get('host') + req.url);
				next();
			}
			
			//FYI this should work for local development as well
			var hostArr = req.get('host').split('.');
			//console.log("hostArr 11 ------------- ", hostArr);
			if(hostArr[0] != 'www' && hostArr.length == 2){
				return res.redirect('https://www.' + req.get('host') + req.url);
				next();
			}
			
			
			if(hostArr[0] != 'www' && hostArr.length == 3){
				return res.redirect('https://' + req.get('host') + req.url);
				next();
			}
			//else{
				//return res.redirect('https://' + req.get('host') + req.url);
			//}
		}
		else{
			if(req.get('host') == 'scrpt.com/' || req.get('host') == 'scrpt.com') {
				return res.redirect('https://www.' + req.get('host') + req.url);
				next();
			}
			
			var hostArr = req.get('host').split('.');
			//console.log("hostArr 22 ------------- ", hostArr);
			if(hostArr[0] != 'www' && hostArr.length == 2){
				return res.redirect('https://www.' + req.get('host') + req.url);
			}
			
			//if(hostArr[0] != 'www' && hostArr.length == 3){
				//return res.redirect('https://' + req.get('host') + req.url);
			//}
		}
		next();
	}
	*/
	//app.use(requireHTTPS);		//to enable redirect of all user entered urls to https://www.
	
	// Move compression AFTER session middleware to prevent cookie header interference
	// app.use(compress()); 
	
	app.use(cookieParser());
	// GLOBAL SESSION MIDDLEWARE - ENABLED WITH 7-DAY TIMEOUT
	app.use(
		expressSession({
			secret : process.env.SESSION_SECRET || '3q8753248o5_mnasxvda@!#$@%@#$iwqer6y39',
			store : MongoStore.create({
				mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabmedia',
				collectionName: 'my_app_sessions', //default - sessions
				ttl: 7 * 24 * 60 * 60, // 7 days in seconds
				autoRemove: 'native', // Use MongoDB's TTL index
				// Add error handling
				onError: function(error) {
					console.error('❌ Session store error:', error);
				},
				// Add connection success callback
				onConnect: function() {
					console.log('✅ Session store connected to MongoDB');
				},
				// Add session events
				onSession: function(session) {
					console.log('📝 Session created/updated:', session.id);
				}
			}),
			cookie: {
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
				httpOnly: true, // Secure: prevent JavaScript access
				secure: process.env.NODE_ENV === 'production', // HTTPS only in production
				sameSite: 'lax',
				path: '/'
			},
			resave: false, // Don't save session if unmodified
			saveUninitialized: false, // Don't create session until something stored
			name: 'connect.sid',
			// Add better error handling
			unset: 'destroy'
		})
	);
	
	// Apply compression AFTER session middleware to prevent cookie header interference
	app.use(compress({
		filter: (req, res) => {
			return (/json|text|javascript|css/).test(res.getHeader('Content-Type'));
		},
		// Levels are specified in a range of 0 to 9, where-as 0 is
		// no compression and 9 is best compression, but slowest
		level: 9
	}));
	//app.use(bp());
	app.use(bp.json({limit: '50mb'}));
	app.use(bp.urlencoded({limit: '50mb', extended: true}));
	//app.use(bp({uploadDir:'./uploads'})); //did not work, check in project.js configuration (process.env.TMPDIR = './uploads')
	
	// CORS is now handled by the main server.js with proper configuration
	// This prevents conflicts with the main CORS middleware
	
	app.get("/streams", (req, res) => {
		// SESSION CHECK TEMPORARILY DISABLED
		// if(req.session.user) {
		// 	//const queryObject = url.parse(req.url, true).query;
		// 	//console.log("queryObject -----------------------------------------------------------", queryObject);
			
		// 	return res.render('../views/layouts/frontend/streamLayout.html'); //next();
		// }
		// else{
		// 	return res.render('layouts/frontend/frontLayout.html');
		// }
		return res.render('../views/layouts/frontend/streamLayout.html'); // Always render stream layout
	});
	
	app.get("/streams/:chapterId/:pageId", (req, res) => {
		// SESSION CHECK TEMPORARILY DISABLED
		// if(req.session.user) {
		//   return res.render('../views/layouts/frontend/capsuleLayout.html'); //next();
		// }
		// else{
		//   return res.render('layouts/frontend/frontLayout.html');
		// }
		return res.render('../views/layouts/frontend/capsuleLayout.html'); // Always render capsule layout
	});

	app.get("/streamsnew", (req, res) => {
		// SESSION CHECK TEMPORARILY DISABLED
		// if(req.session.user) {
		//   return res.render('layouts/frontend/frontLayout.html');
		// }
		// else{
		//   return res.render('layouts/frontend/frontLayout.html');
		// }
		return res.render('layouts/frontend/capsuleLayout.html'); // Always render capsule layout
		//return res.render('../views/layouts/frontend/capsuleLayout.html'); //next();
	});

	
	app.get("/", (req, res) => {
		req.subdomain = req.subdomain || '';
		
		if (req.subdomain) {
		  return res.render('../views/layouts/frontend/profilePageLayout.html'); //next();
		}
		
		req.headers = req.headers || '';
		req.headers.host = req.headers.host || '';
		
		if(req.headers.host.indexOf('topmost.us') >= 0) {
			return res.render('../topmost/index.html');
		}
		
		// --- New block to handle spoilty.com ---
		if(req.headers.host.indexOf('spoilty.com') >= 0) {
			return res.render('../spoilty/index.html');
		}
		
		if(req.headers.host.indexOf('scrpt.com') >= 0) {
			return res.render('../office/website/scrpt_index.html'); //next();
		} 
		
		if(req.headers.host.indexOf('journale.co') >= 0) {
			return res.render('../office/journale/index.html'); //next();
		}
	});
	
	//Email tracker code
	app.use(async (req, res, next) => {
		const reqUrl = req.baseUrl + req.path;
		//console.log("req.path = ", req.path);
		if( reqUrl.substring(0, 27) == '/assets/img/email-stats.png') {
			try {
				//console.log("------------ trackPageStreamEmails Called -----------");
				const CapsuleId = req.query.CapsuleId ? req.query.CapsuleId : null;
				const PageId = req.query.PageId ? req.query.PageId : null;
				const PostId = req.query.PostId ? req.query.PostId : null;
				const EmailIndex = req.query.EmailIndex ? req.query.EmailIndex : null;
				const UserEmail = req.query.UserEmail ? req.query.UserEmail : null;
				
				if(CapsuleId && PageId && PostId && EmailIndex && UserEmail) {
					const dataRecord = {
						CapsuleId : new ObjectId(CapsuleId),
						PageId : new ObjectId(PageId),
						PostId : new ObjectId(PostId),
						EmailIndex : EmailIndex,
						UserEmail : UserEmail,
						Status : 1,
						IsDeleted : 0,
						CreatedOn : Date.now(),
						UpdatedOn : Date.now()
					};

					const conditions = {
						CapsuleId : CapsuleId,
						PageId : PageId,
						PostId : PostId,
						EmailIndex : EmailIndex,
						UserEmail : UserEmail
					};
					
					const data = await StreamEmailTracker.update(conditions, {$set : dataRecord}, {upsert : true});
					if(!data){
						console.log({"code":"204", message : "Email tracker error"});
						next();
					} else {
						console.log({"code":"200", message : "Email tracker success"});
						next();
					}
				} else {
					console.log({"code":"204", message : "Email tracker error - Missing input parameters"});
					next();
				}
			} catch(err) {
				console.log("Email tracker error - Catch Block - ", err);
				next();
			}
			
		} else {
			next();
		}
	});
	//Email tracker code
	
	app.set('views',__dirname+'/../../public/views/');
	app.use(express.static(__dirname + '/../../public'));
	app.use(express.static(__dirname + '/../../public/static.scrpt.com'));
	app.use(express.static(__dirname + '/../../media-assets'));
	app.use(express.static(__dirname + '/../../music_library'));
	app.use(express.static(__dirname + '/../../dest'));
	app.use(express.static(__dirname + '/../../screen-guides'));
	//app.use(express.static(__dirname + '/../../public/office/tree1'));
	app.use(express.static(__dirname + '/../../public/office/store_capsules'));
	app.use(express.static(__dirname + '/../../public/office/journale'));
	app.use(express.static(__dirname + '/../../public/office/website'));
	app.use(express.static(__dirname + '/../../public/topmost'));
	//app.use(express.static(__dirname + '/../../public/office/tree/A Tree - 18- Singlepage.hyperesources'));
	//app.use(express.static(__dirname + '/../../public/v2'));
	app.engine('html', (path, opt, fn) => {
		fs.readFile(path,'utf-8', (err, str) => {
			if(err) return str;
			return fn(null,str);
		});
	});
	
	
	const path = require('path');
	const FroalaEditor = require('wysiwyg-editor-node-sdk/lib/froalaEditor.js');

	// Path to upload froala image.
	app.post('/upload_fr_image', (req, res) => {
	  // Store image.
	  FroalaEditor.Image.upload(req, '/media-assets/fr_uploads/', (err, data) => {
		// Return data.
		if (err) {
		  return res.send(JSON.stringify(err));
		}
		
		data.link = typeof data.link==='string' ? 'https://www.scrpt.com'+data.link.replace('/media-assets', '') : '';
		res.send(data);
	  });
	});
	
	
	
	//Referral Jade page routes-------------------------------------------------
	const engines = require('consolidate');
	app.set('view engine', 'html');
	
	// Handle different consolidate versions
	let jadeEngine;
	if (engines.jade) {
		if (typeof engines.jade === 'function') {
			jadeEngine = engines.jade;
		} else if (engines.jade.render) {
			jadeEngine = engines.jade.render;
		} else if (engines.jade.renderFile) {
			jadeEngine = engines.jade.renderFile;
		}
	}
	
	if (jadeEngine) {
		app.engine('jade', jadeEngine);
	} else {
		// Silently handle missing jade engine - not critical for API functionality
		// console.warn('Warning: Jade engine not available, jade templates may not render correctly');
	}
	
	app.get('/referral/:id/:capsule_id', (req, res) => {
		// console.log("re1---", req)
		if (req.session.user) {
			res.render('layouts/frontend/capsuleLayout.html');
		}
		else {
			const fields = {};
			fields.referralCode = req.params.id;
			fields.capsule_id = req.params.capsule_id;
			const referralData = {};
			const conditions = {
				_id: fields.capsule_id,
				IsDeleted: false
			}
			//console.log("checkReferralCode------")
			//console.log("fields--------@@@@@@@@@@@@@@@------------",fields);
			if (fields.referralCode) {
				const referralCode = fields.referralCode;
				user.findOne({ referralCode: referralCode, IsDeleted: false }).exec((err, userReferData) => {
					//console.log("data==============", err, userReferData);
					if (!err) {
						Capsule.findOne(conditions).exec((err, capsuleReferdata) => {
							if (!err) {
								referralData.capsuleReferdata = capsuleReferdata;
								referralData.userReferData = userReferData;
								const newreferralData = {};
								newreferralData.referralData = referralData;
								newreferralData.metaDescription = referralData.capsuleReferdata.MetaData.description ? referralData.capsuleReferdata.MetaData.description : 'Scrpt publishes digital treats to elevate special days & those between them!';
								newreferralData.metaImage = "http://www.scrpt.com/assets/Media/capsules/600/" + referralData.capsuleReferdata.CoverArt;
								
								newreferralData.metaTitle = referralData.capsuleReferdata.Title;
								
								referralData.capsuleReferdata.LaunchSettings = referralData.capsuleReferdata.LaunchSettings ? referralData.capsuleReferdata.LaunchSettings : {};
								const capsuleFor = referralData.capsuleReferdata.LaunchSettings.CapsuleFor ? referralData.capsuleReferdata.LaunchSettings.CapsuleFor : null;
								
								switch ( capsuleFor ) {
									case 'Birthday' : 
										newreferralData.metaTitle = `"The new way" to say Happy Birthday`;
									break;
									
									default : 
										newreferralData.metaTitle = referralData.capsuleReferdata.Title;
									break;
								}
								
								newreferralData.metaUrl = 'http://www.scrpt.com' + req.url;
								//console.log("referralData-------------", newreferralData);

								res.render('referral.jade', newreferralData);

								//res.json({ "code": "200", "response": referralData });
							} else {

								res.render('referral.jade', { newreferralData });
							}
						})
					} else {
						//console.log("ERROR in userReferData ================>",err);
						res.render('referral.jade', { newreferralData });
					}
				});
			} else {
				res.render('referral.jade', { newreferralData });
			}
		}

	})

	app.get('/referral/:id', (req, res) => {
		if (req.session.user) {
			res.render('layouts/frontend/capsuleLayout.html');
		} else {
			const fields = {};
			const referralData = {};
			fields.referralCode = req.params.id;
			if (fields.referralCode) {
				const referralCode = fields.referralCode;
				user.findOne({ referralCode: referralCode, IsDeleted: false }).exec((err, userReferData) => {
					if (!err) {
						AppSetting.findOne({ isDeleted: false }, (err, AppSettingData) => {
							//console.log("AppSettingData-------",AppSettingData);
							if (!err) {
								AppSettingData = AppSettingData ? AppSettingData :{};
								AppSettingData.ReferralDiscount = AppSettingData.ReferralDiscount ? AppSettingData.ReferralDiscount : 0;
							}
							
							referralData.userReferData = userReferData;
							const newreferralData = {};
							newreferralData.referralData = referralData;
							newreferralData.metaDescription = `Scrpt publishes digital treats to elevate special days & those between them!`;
							newreferralData.metaImage = "https://www.scrpt.com/assets/img/new/capsule-1.jpg";
							newreferralData.metaTitle = "Scrpt referral join & earn $"+AppSettingData.ReferralDiscount;
							newreferralData.metaUrl = 'https://www.scrpt.com' + req.url;
							res.render('referral.jade', newreferralData );
						});
					}
				})
			}
		}

	})
	//Referral Jade page routes-------------------------------------------------
	
	app.get('/public-invite/:id/:capsule_id', (req, res) => {
		const fields = {};
		fields.referralCode = req.params.id;
		fields.capsule_id = req.params.capsule_id;
		const referralData = {};
		const conditions = {
			_id: fields.capsule_id,
			IsDeleted: false
		}
		if (fields.referralCode) {
			const referralCode = fields.referralCode;
			user.findOne({ referralCode: referralCode, IsDeleted: false }).exec((err, userReferData) => {
				if (!err) {
					try {
						conditions.OwnerId = userReferData._id;
						Capsule.findOne(conditions).exec((err, capsuleReferdata) => {
							if (!err) {
								try {
									referralData.capsuleReferdata = capsuleReferdata;
									referralData.userReferData = userReferData;
									const newreferralData = {};
									newreferralData.referralData = referralData;
									newreferralData.metaDescription = referralData.capsuleReferdata.MetaData.description ? referralData.capsuleReferdata.MetaData.description : 'Scrpt publishes digital treats to elevate special days & those between them!';
									newreferralData.metaImage = "http://www.scrpt.com/assets/Media/capsules/600/" + referralData.capsuleReferdata.CoverArt;
									
									newreferralData.metaTitle = referralData.capsuleReferdata.Title;
									
									referralData.capsuleReferdata.LaunchSettings = referralData.capsuleReferdata.LaunchSettings ? referralData.capsuleReferdata.LaunchSettings : {};
									const capsuleFor = referralData.capsuleReferdata.LaunchSettings.CapsuleFor ? referralData.capsuleReferdata.LaunchSettings.CapsuleFor : null;
									
									switch ( capsuleFor ) {
										case 'Birthday' : 
											newreferralData.metaTitle = `"The new way" to say Happy Birthday`;
										break;
										
										default : 
											newreferralData.metaTitle = referralData.capsuleReferdata.Title;
										break;
									}
									
									newreferralData.metaUrl = 'http://www.scrpt.com' + req.url;
									
									res.render('publicInvite.jade', newreferralData);
								}
								catch (error) {
									res.render('layouts/frontend/capsuleLayout.html');
								}
							} else {

								res.render('publicInvite.jade', { newreferralData });
							}
						})
					} catch(error) {
						res.render('layouts/frontend/capsuleLayout.html');
					}
				} else {
					res.render('layouts/frontend/capsuleLayout.html');
				}
			});
		} else {
			res.render('layouts/frontend/capsuleLayout.html');
		}
	})
	
	app.get('/share/:id/:postHashCode', async (req, res) => {
		const id = req.params.id || null;
		const postHashCode = req.params.postHashCode || null;
		
		const data = {};
		data.metaDescription = `Scrpt publishes digital treats to elevate special days & those between them!`;
		data.metaImage = "https://www.scrpt.com/streamposts/"+postHashCode;
		data.metaTitle = "Join Scrpt";
		data.metaUrl = 'https://www.scrpt.com' + req.url;
		
		if(id && postHashCode) {
			const result = await SyncedPost.find({ _id: new ObjectId(id), IsDeleted: false });
			result = Array.isArray(result) ? result : [];
			result = result.length ? result[0] : {};
			
			const PostStatement = result.PostStatement || "";
			const PostStatement_PlainText = PostStatement.replace(/<[^>]+>/g, '');

			data.metaDescription = PostStatement_PlainText || `Scrpt publishes digital treats to elevate special days & those between them!`;
			data.metaImage = "https://www.scrpt.com/streamposts/"+postHashCode;
			data.metaTitle = "Join Scrpt";
			data.metaUrl = 'https://www.scrpt.com' + req.url;
		}
		return res.render('socialStreamPost.jade', data);
	});
	
	async function __getActiveStreamsByUserId( userId, userEmail, userBirthdate ) {
		const finalResults = [];
		//get all streams where login user has been invited
		/*var InvitedInResult = await StreamMembers.find({Members : ObjectId(userId)}, {StreamId : 1});
		InvitedInResult = Array.isArray(InvitedInResult) ? InvitedInResult : [];

		var InvitedInStreamIds = [];
		for(var i = 0; i < InvitedInResult.length; i++) {
			InvitedInStreamIds.push(ObjectId(InvitedInResult[i].StreamId));
		}*/

		//console.log("InvitedInStreamIds - ", InvitedInStreamIds);
		const conditions = {
			"$or" : [
				{
					PurchasedBy : {$exists : false},
					OwnerId : userId,
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					IsSurpriseGift : {$exists : false}
				},
				{
					PurchasedBy : userId,
					OwnerId : userId,
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					//IsSurpriseGift : {$exists : false}
				},
				{
					PurchasedBy : {$exists : false},
					OwnerId : userId,
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					IsSurpriseGift : false
				},
				{
					PurchasedBy : {$ne : userId},
					OwnerId : userId,
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					IsSurpriseGift : true
				},
				/*{
					PurchasedBy : userId,
					OwnerId : {$ne : userId},
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					IsSurpriseGift : true
				},*/
				{
					PurchasedBy : {$ne : userId},
					OwnerId : userId,
					Origin : "published",
					IsPublished : true,
					"LaunchSettings.Audience":"ME",
					"LaunchSettings.CapsuleFor" : "Stream",
					IsSurpriseGift : false
				},
				/*{
					CreaterId : userId, 
					OwnerId : userId,
					"LaunchSettings.Audience":"CELEBRITY",
					"LaunchSettings.CapsuleFor":"Stream",
					"LaunchSettings.StreamType":"Group"
				}*/
			],
			Status : true,
			IsDeleted : false
		};

		/*if(InvitedInStreamIds.length) {
			conditions["$or"].push({
				_id : { $in : InvitedInStreamIds }
			});
		}*/

		const fields = {}; 
		const sortObj = {
			_id : 1,
			Order: 1,
			ModifiedOn: -1
		};
		let results = await Capsule.find(conditions , fields).populate('OwnerId').populate('PurchasedBy').sort(sortObj).lean();
		results = results ? results : [];

		const todayEnd = new Date();
		todayEnd.setHours(23,59,59,999);
				
		if( results.length ){
			console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!--------------------- results.length ====== ", results.length);
			for( let loop = 0; loop < results.length; loop++ ){
				//var CreaterDetails = typeof results[loop].CreaterId == 'object' ? results[loop].CreaterId : {};
				const OwnerDetails = typeof results[loop].OwnerId == 'object' ? results[loop].OwnerId : {};
				const PurchasedByObj = typeof results[loop].PurchasedBy == 'object' ? results[loop].PurchasedBy : {};
				
				results[loop].OwnerName = OwnerDetails.Name ? OwnerDetails.Name : '';
				results[loop].OwnerId = OwnerDetails._id ? OwnerDetails._id : '';
				results[loop].OwnerProfilePic = OwnerDetails.ProfilePic ? OwnerDetails.ProfilePic : '';
				results[loop].OwnerBirthdate = OwnerDetails.Birthdate ? OwnerDetails.Birthdate : '';
				results[loop].OwnerReferralCode = OwnerDetails.referralCode ? OwnerDetails.referralCode : '';
				
				results[loop].PurchasedByName = PurchasedByObj.Name ? PurchasedByObj.Name : '';
				results[loop].PurchasedBy = PurchasedByObj._id ? PurchasedByObj._id : '';
				results[loop].PurchasedByProfilePic = PurchasedByObj.ProfilePic ? PurchasedByObj.ProfilePic : '';
				
				
				results[loop].LaunchSettings.StreamType = results[loop].LaunchSettings.StreamType ? results[loop].LaunchSettings.StreamType : '';
				results[loop].IsSurpriseGift = results[loop].IsSurpriseGift ? results[loop].IsSurpriseGift : false;
				
				if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId != String(userId)) {
					results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
					if(results[loop].IsSurpriseGift) {
						if(String(results[loop].PurchasedBy) == String(userId)) {
							results[loop].Title = results[loop].Title+ " (Surprise Gift)";
							
							let todayYear = todayEnd.getFullYear();
							let todayTimestamp = todayEnd.getTime();
							
							OwnerDetails.Birthdate = OwnerDetails.Birthdate ? OwnerDetails.Birthdate : null;
							if(!OwnerDetails.Birthdate) {
								//continue;
							} else {
								let OwnerBirthdate = new Date(OwnerDetails.Birthdate);
								OwnerBirthdate.setFullYear(todayYear);
								
								let OBTimestamp = OwnerBirthdate.getTime();
								
								if(parseInt(todayTimestamp) >= parseInt(OBTimestamp)) {
									//continue;
								}
							}
						} else {
							
							//continue;
						}
					} else {
						if(!results[loop].LaunchSettings.Audience == "CELEBRITY") {
							results[loop].Title = results[loop].OwnerName.split(' ')[0] +"'s " + results[loop].Title;
						}
					}
				}
				
				
				if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(userId) && !results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != '' && String(results[loop].PurchasedBy) != String(userId)) {
					results[loop].Title = results[loop].Title;// + " (Gifted by "+ results[loop].PurchasedByName.split(' ')[0]+")";
					results[loop].MetaData = results[loop].MetaData ? results[loop].MetaData : {};
					results[loop].MetaData.StickerTextOwner = "Gifted by "+results[loop].PurchasedByName.split(' ')[0];
				}
							
				if(results[loop].LaunchSettings.StreamType == 'Group' && results[loop].OwnerId == String(userId) && results[loop].IsSurpriseGift && String(results[loop].PurchasedBy) != '' && String(results[loop].PurchasedBy) != String(userId)) {
					results[loop].Title = results[loop].Title + " (Surprise from "+ results[loop].PurchasedByName.split(' ')[0]+")";
					
					let todayYear = todayEnd.getFullYear();
					let todayTimestamp = todayEnd.getTime();
					
					var userBirthdate = userBirthdate ? userBirthdate : null;
					if(!userBirthdate) {
						//continue;
					} else {
						let OwnerBirthdate = new Date(userBirthdate);
						OwnerBirthdate.setFullYear(todayYear);
						let OBTimestamp = OwnerBirthdate.getTime();
						
						if(todayTimestamp < OBTimestamp) {
							//continue;
						}
					}
				}
				
				const CapsuleId = results[loop]._id;
				const UserEmail = userEmail ? userEmail : null;
				let StreamOpenedEmailCount = 0;
				let ConversationCount = 0;
				if(CapsuleId && UserEmail) {
					const conditions = {
						CapsuleId : CapsuleId,
						UserEmail : UserEmail
					};
					
					StreamOpenedEmailCount = await StreamEmailTracker.find(conditions, {}).count();
					StreamOpenedEmailCount = StreamOpenedEmailCount ? StreamOpenedEmailCount : 0;
					
					const StreamConversation_conditions = {
						CapsuleId : CapsuleId ? CapsuleId : null,
						UserId : userId ? userId : null
					};
					const result = await StreamConversation.findOne(StreamConversation_conditions, {});
					result = result ? result : {};
					result.ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
					if(result.ConversationCount) {
						ConversationCount = result.ConversationCount ? result.ConversationCount : 0;
					}
				}
				results[loop].StreamOpenedEmailCount = StreamOpenedEmailCount;
				results[loop].ConversationCount = ConversationCount;
				
				if(results[loop].LaunchSettings.Audience == "CELEBRITY" && results[loop].OwnerId == String(userId)) {
					results[loop].Title = results[loop].Title + ' (For Celebrities)';
				} else if (results[loop].LaunchSettings.Audience == "CELEBRITY" && results[loop].OwnerId != String(userId)) {
					results[loop].Title = results[loop].Title + ' (Invited as Celebrity)';
				}
				
				finalResults.push(results[loop]);
			}
		}
		return finalResults;
	}
	
	app.get('/unsubscribe/:id', (req, res) => {
		const inputData = {
			unsubscribeDataObject : {
				userData : {},
				capsuleData : []
			}
		};
		const emailHash = req.params.id || null;
		if(!emailHash) {
			return res.send('404 - Not Found.');
		}
		const conditions = {
			Email: CommonAlgo.commonModule.customHashToStr(emailHash), 
			IsDeleted: false
		};
		
		user.findOne(conditions).exec(async (err, userData) => {
			if (!err) {
				try {
					userData = userData || null;
					if(!userData) {
						return res.send('404 - Not Found.');
					}
					userData.MarketingEmails = userData.MarketingEmails ? userData.MarketingEmails : false;
					userData.PostActionsNotification = userData.PostActionsNotification ? userData.PostActionsNotification : false;
					userData.CommentLikesNotification = userData.CommentLikesNotification ? userData.CommentLikesNotification : false;
					inputData.unsubscribeDataObject.userData = userData;
					//fetch user capsule details
					inputData.unsubscribeDataObject.capsuleData = await __getActiveStreamsByUserId(userData._id, userData.Email, userData.Birthdate);
					//console.log("LENGTH ---- ", inputData.unsubscribeDataObject.capsuleData.length);
					res.render('unsubscribe.jade', inputData);
				} catch(error) {
					console.log("error -------------- ", error);
					return res.send('404 - Not Found.');
				}
			} else {
				return res.send('404 - Not Found.');
			}
		});
	});
	
	const router = {};
	
	//Creating the custom router for the application - front-end
	const userRoutes = express.Router();
	app.use('/user', userRoutes);
	router.userRoutes = userRoutes;
	
	const projectRoutes = express.Router();
	app.use('/projects', projectRoutes);
	router.projectRoutes = projectRoutes;
	
	const boardRoutes = express.Router();
	app.use('/boards', boardRoutes);
	router.boardRoutes = boardRoutes;
	
	//should be in boards route
	const myInviteeRoutes = express.Router();
	app.use('/myInvitees', myInviteeRoutes);
	router.myInviteeRoutes = myInviteeRoutes;
	
	//should be in boards route
	const myBoardRoutes = express.Router();
	app.use('/myBoards', myBoardRoutes);
	router.myBoardRoutes = myBoardRoutes;
	
	//should be in boards route
	const addBoardMediaToBoardRoutes = express.Router();
	app.use('/addBoardMediaToBoard', addBoardMediaToBoardRoutes);
	router.addBoardMediaToBoardRoutes = addBoardMediaToBoardRoutes;
	
	const mediaRoutes = express.Router();
	app.use('/media', mediaRoutes);
	router.mediaRoutes = mediaRoutes;
	
	//added on 24022015 : resolved browser CORS problem
	const proxyRoutes = express.Router();
	app.use('/proxy', proxyRoutes);
	router.proxyRoutes = proxyRoutes;
	
	const originalImageRoutes = express.Router();
	app.use('/assets/Media/img', originalImageRoutes);
	router.originalImageRoutes = originalImageRoutes;
	
	
	const keywordRoutes = express.Router();
	app.use('/keywords', keywordRoutes);
	router.keywordRoutes = keywordRoutes;
	//Creating the custom router for the application - front-end
	
	//Creating the custom router for the application - back-end
	router.admin = {};
	
	const adminRoutes = express.Router();
	app.use('/admin', adminRoutes);
	router.admin.adminRoutes = adminRoutes;
	
	const fsgRoutes = express.Router();
	app.use('/fsg', fsgRoutes);
	router.admin.fsgRoutes = fsgRoutes;
	
	const domainRoutes = express.Router();
	app.use('/domains', domainRoutes);
	router.admin.domainRoutes = domainRoutes;
	
	const collectionRoutes = express.Router();
	app.use('/collections', collectionRoutes);
	router.admin.collectionRoutes = collectionRoutes;
	
	const groupTagRoutes = express.Router();
	app.use('/groupTags', groupTagRoutes);
	router.admin.groupTagRoutes = groupTagRoutes;
	
	const metaMetaTagRoutes = express.Router();
	app.use('/metaMetaTags', metaMetaTagRoutes);
	router.admin.metaMetaTagRoutes = metaMetaTagRoutes;
	
	const gtbindingRoutes = express.Router();
	app.use('/gtbinding', gtbindingRoutes);
	router.admin.gtbindingRoutes = gtbindingRoutes;
	
	const tagRoutes = express.Router();
	app.use('/tags', tagRoutes);
	router.admin.tagRoutes = tagRoutes;
	
	const massmediauploadRoutes = express.Router();
	app.use('/massmediaupload', massmediauploadRoutes);
	router.admin.massmediauploadRoutes = massmediauploadRoutes;
	
	const sourceRoutes = express.Router();
	app.use('/sources', sourceRoutes);
	router.admin.sourceRoutes = sourceRoutes;
	
	const contributionRoutes = express.Router();
	app.use('/contribution', contributionRoutes);
	router.admin.contributionRoutes = contributionRoutes;	
	
	const metaTagRoutes = express.Router();
	app.use('/metaTags', metaTagRoutes);
	router.admin.metaTagRoutes = metaTagRoutes;
	
	const emailTemplateRoutes = express.Router();
	app.use('/emailTemplate', emailTemplateRoutes);
	router.admin.emailTemplateRoutes = emailTemplateRoutes;
	
	const userManagementRoutes = express.Router();
	app.use('/userManagement', userManagementRoutes);
	router.admin.userManagementRoutes = userManagementRoutes;
	
	const copyrightClaimsRoutes = express.Router();
	app.use('/copyrightClaims', copyrightClaimsRoutes);
	router.admin.copyrightClaimsRoutes = copyrightClaimsRoutes;
	
	const postManagerRoutes = express.Router();
	app.use('/postManager', postManagerRoutes);
	router.admin.postManagerRoutes = postManagerRoutes;
	
	const unsplashGrapperRoutes = express.Router();
	app.use('/unsplashgrapper', unsplashGrapperRoutes);
	router.admin.unsplashGrapperRoutes = unsplashGrapperRoutes;
	//Creating the custom router for the application - back-end
	
	//recorder routing instance
	const recorderRoutes = express.Router();
	app.use('/recorder', recorderRoutes);
	router.recorderRoutes = recorderRoutes;
	
	
	//Creating the custom router for the application - back-end-subadmin
	router.subadmin = {};
	
	const subadminRoutes = express.Router();
	app.use('/subadmin', subadminRoutes);
	router.subadmin.subadminRoutes = subadminRoutes;
	
	//31 july 2015 - collab-7.2
	const chapterRoutes = express.Router();
	app.use('/chapters', chapterRoutes);
	router.chapterRoutes = chapterRoutes;
	
	// New ES6 Chapters Routes
	const newChapterRoutes = express.Router();
	app.use('/newChapters', newChapterRoutes);
	router.newChapterRoutes = newChapterRoutes;
	
	const pageRoutes = express.Router();
	app.use('/pages', pageRoutes);
	router.pageRoutes = pageRoutes;

	
	const groupRoutes = express.Router();
	app.use('/groups', groupRoutes);
	router.groupRoutes = groupRoutes;
	
	const memberRoutes = express.Router();
	app.use('/members', memberRoutes);
	router.memberRoutes = memberRoutes;
	
	//07 September 2015 - collab-7.2
	const capsuleRoutes = express.Router();
	app.use('/capsules', capsuleRoutes);
	router.capsuleRoutes = capsuleRoutes;
	
	const referralRoutes = express.Router();
	app.use('/refer', referralRoutes);
	router.referralRoutes = referralRoutes;
	
	const journalRoutes = express.Router();
	app.use('/journal', journalRoutes);
	router.journalRoutes = journalRoutes;
	
	// Relationship management routes
	const relationshipRoutes = express.Router();
	app.use('/relationships', relationshipRoutes);
	router.relationshipRoutes = relationshipRoutes;
	
	// Main API routes (for general endpoints like /media/createSinglePost)
	const mainRoutes = express.Router();
	app.use('/', mainRoutes);
	router.mainRoutes = mainRoutes;
	
	// New Journal Routes for V2
	const newJournalRoutes = express.Router();
	app.use('/newJournal', newJournalRoutes);
	router.newJournalRoutes = newJournalRoutes;
	
	//console.log("router :",router);
	return router;
}

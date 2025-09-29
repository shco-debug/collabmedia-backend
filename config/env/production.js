/*
* Author - Dipin Behl
* Date - 3 June 2014
* Comments - Sets the environment variable values for the production environment
*/
process.globalSettings = process.globalSettings || {};

module.exports = function(){
    // Set the default port to run the app
    process.env.PORT = process.env.PORT || 9090;

    // Ensure these global objects exist first
    process.globalSettings = process.globalSettings || {};
    process.urls = process.urls || {}; // Added to prevent undefined errors

    process.globalSettings.init__urlLocations = function(){
        process.urls.small__thumbnail = 'small';
        process.urls.medium__thumbnail = 'medium';
        process.urls.large__thumbnail = 'large';
    };

    process.globalSettings.init__urlLocations();
};

	process.STRIPE_CONFIG = {
		DEV : {
			token_api : "https://connect.stripe.com/oauth/token",
			stripe_client_id : "ca_AynXWWXR3loPwmLaGAvEAJHmm0GEObyE",
			secret_key : "sk_test_5M7DrMG5iek1yRa8DEwhcG2W"
		},
		LIVE : {
			token_api : "https://connect.stripe.com/oauth/token",
			stripe_client_id : "ca_AynXWWXR3loPwmLaGAvEAJHmm0GEObyE",
			secret_key : "sk_live_3kZkuWPnVFoIIqCCY295aAJp00D7sADLR0"
		}
	};
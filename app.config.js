const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
	// Path where we expect google-services.json
	const googleServicesPath = path.resolve(__dirname, 'google-services.json');
	const hasGoogleServices = fs.existsSync(googleServicesPath);

	// Ensure we keep existing config values from app.json
	const updatedConfig = Object.assign({}, config);

	// Conditionally add googleServicesFile to android config if file exists
	if (!updatedConfig.android) updatedConfig.android = {};
	if (hasGoogleServices) {
		updatedConfig.android.googleServicesFile = './google-services.json';
	} else {
		// Remove if present to avoid parse errors
		if (updatedConfig.android.googleServicesFile) delete updatedConfig.android.googleServicesFile;
	}

	// Ensure required plugins exist and include dev-client & notifications
	updatedConfig.plugins = updatedConfig.plugins || [];
	const ensurePlugin = (p) => {
		if (!updatedConfig.plugins.includes(p)) updatedConfig.plugins.push(p);
	};
	ensurePlugin('expo-secure-store');
	ensurePlugin('expo-notifications');
	ensurePlugin('expo-dev-client');

	return updatedConfig;
};

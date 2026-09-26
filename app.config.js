const fs = require('fs');
const path = require('path');

const pluginName = (plugin) =>
  Array.isArray(plugin)
    ? plugin[0]
    : plugin;

module.exports = ({ config }) => {
  const googleServicesPath =
    path.resolve(
      __dirname,
      'google-services.json'
    );

  const hasGoogleServices =
    fs.existsSync(googleServicesPath);

  const updatedConfig = {
    ...config,
    android: {
      ...(config.android || {}),
    },
    extra: {
      ...(config.extra || {}),
      privacyPolicyUrl:
        process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
        '',
      accountDeletionUrl:
        process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ||
        '',
      supportEmail:
        process.env.EXPO_PUBLIC_SUPPORT_EMAIL ||
        '',
      appEnvironment:
        process.env.EXPO_PUBLIC_APP_ENV ||
        'production',
    },
  };

  if (hasGoogleServices) {
    updatedConfig.android.googleServicesFile =
      './google-services.json';
  } else {
    delete updatedConfig.android.googleServicesFile;
  }

  // The app only needs one-off image selection and QR camera access.
  // Block broad media library permissions and camera audio recording.
  const blocked = new Set([
    ...(
      updatedConfig.android
        .blockedPermissions || []
    ),
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.RECORD_AUDIO',
  ]);

  updatedConfig.android.blockedPermissions =
    Array.from(blocked);

  updatedConfig.plugins =
    updatedConfig.plugins || [];

  const ensurePlugin = (plugin) => {
    const name = pluginName(plugin);
    const exists =
      updatedConfig.plugins.some(
        (item) =>
          pluginName(item) === name
      );

    if (!exists) {
      updatedConfig.plugins.push(plugin);
    }
  };

  ensurePlugin('expo-secure-store');
  ensurePlugin('expo-notifications');
  ensurePlugin('expo-dev-client');
  ensurePlugin('expo-camera');

  const sentryOrg =
    process.env.SENTRY_ORG;
  const sentryProject =
    process.env.SENTRY_PROJECT;

  // Source-map/native build integration is enabled only
  // after the release environment contains the Sentry project identifiers.
  if (sentryOrg && sentryProject) {
    updatedConfig.plugins =
      updatedConfig.plugins.filter(
        (item) =>
          ![
            '@sentry/react-native',
            '@sentry/react-native/expo',
          ].includes(pluginName(item))
      );

    updatedConfig.plugins.push([
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization: sentryOrg,
        project: sentryProject,
      },
    ]);
  }

  return updatedConfig;
};
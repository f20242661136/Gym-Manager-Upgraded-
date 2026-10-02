const fs = require('fs');
const path = require('path');

const pluginName = (plugin) =>
  Array.isArray(plugin) ? plugin[0] : plugin;

module.exports = ({ config }) => {
  const googleServicesPath = path.resolve(
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
        process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '',
      accountDeletionUrl:
        process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL || '',
      supportEmail:
        process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '',
      appEnvironment:
        process.env.EXPO_PUBLIC_APP_ENV || 'production',
    },
  };

  if (hasGoogleServices) {
    updatedConfig.android.googleServicesFile =
      './google-services.json';
  } else {
    delete updatedConfig.android.googleServicesFile;
  }

  const blocked = new Set([
    ...(updatedConfig.android.blockedPermissions || []),
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.RECORD_AUDIO',
  ]);

  updatedConfig.android.blockedPermissions =
    Array.from(blocked);

  updatedConfig.plugins =
    updatedConfig.plugins || [];

  const removePlugin = (name) => {
    updatedConfig.plugins =
      updatedConfig.plugins.filter(
        (item) => pluginName(item) !== name
      );
  };

  const ensurePlugin = (plugin) => {
    const name = pluginName(plugin);
    const exists =
      updatedConfig.plugins.some(
        (item) => pluginName(item) === name
      );

    if (!exists) {
      updatedConfig.plugins.push(plugin);
    }
  };

  ensurePlugin('expo-secure-store');
  ensurePlugin('expo-system-ui');

  removePlugin('expo-notifications');
  updatedConfig.plugins.push([
    'expo-notifications',
    {
      icon: './assets/notification-icon.png',
      color: '#4338CA',
      defaultChannel: 'default',
    },
  ]);

  removePlugin('expo-camera');
  updatedConfig.plugins.push([
    'expo-camera',
    {
      recordAudioAndroid: false,
    },
  ]);

  removePlugin('expo-image-picker');
  updatedConfig.plugins.push([
    'expo-image-picker',
    {
      microphonePermission: false,
      photosPermission:
        'Allow Gym Manager to choose a member profile photo.',
    },
  ]);

  // Keep expo-dev-client in development builds, but do not
  // deliberately add its config plugin to production builds.
  removePlugin('expo-dev-client');

  if (
    process.env.EAS_BUILD_PROFILE === 'development'
  ) {
    ensurePlugin('expo-dev-client');
  }

  const sentryOrg =
    process.env.SENTRY_ORG;
  const sentryProject =
    process.env.SENTRY_PROJECT;

  if (sentryOrg && sentryProject) {
    removePlugin('@sentry/react-native');
    removePlugin('@sentry/react-native/expo');

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

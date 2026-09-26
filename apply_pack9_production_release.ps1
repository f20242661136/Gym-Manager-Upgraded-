param(
  [switch]$SkipTypeCheck,
  [switch]$SkipDependencies
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Need([string]$Path) {
  if (-not (Test-Path $Path)) {
    throw "Required file not found: $Path. Run this from the GymManagementApp project root."
  }
}

function WriteUtf8([string]$Path, [string]$Content) {
  $full = Join-Path (Get-Location) $Path
  $parent = Split-Path -Parent $full

  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  [System.IO.File]::WriteAllText(
    $full,
    $Content,
    [System.Text.UTF8Encoding]::new($false)
  )
}

function BackupFile([string]$Path, [string]$Root) {
  if (-not (Test-Path $Path)) { return }
  $safe = $Path.Replace("\", "__").Replace("/", "__")
  Copy-Item $Path (Join-Path $Root $safe) -Force
}

Need "package.json"
Need "app.json"
Need "app.config.js"
Need "eas.json"
Need "metro.config.js"
Need "App.tsx"
Need "src\navigation\AppNavigator.tsx"
Need "src\screens\SettingsScreen.tsx"
Need "src\contexts\AuthContext.tsx"
Need "src\contexts\SyncContext.tsx"
Need "src\components\SyncStatusBanner.tsx"
Need "supabase\migrations\008_offline_sync_idempotency.sql"

$projectRoot = (Get-Location).Path
$projectParent = Split-Path $projectRoot -Parent
$backupRoot = Join-Path $projectParent "_GymManagementAppBackups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $backupRoot "pack9-production-$stamp"

Step "Creating production backup outside the TypeScript project"

New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach ($file in @(
  "package.json",
  "app.json",
  "app.config.js",
  "eas.json",
  "metro.config.js",
  "App.tsx",
  "src\navigation\AppNavigator.tsx",
  "src\screens\SettingsScreen.tsx",
  "src\screens\PrivacyAccountScreen.tsx",
  "src\services\telemetry.ts",
  "src\services\logger.ts",
  "src\components\ProductionErrorBoundary.tsx",
  "scripts\validate-release.mjs",
  ".github\workflows\quality.yml",
  "docs\PLAY_STORE_RELEASE.md",
  ".env.example"
)) {
  BackupFile $file $backup
}

Write-Host "Backup: $backup" -ForegroundColor Green

# =============================================================================
# DEPENDENCY
# =============================================================================

if (-not $SkipDependencies) {
  Step "Installing Sentry SDK aligned with Expo"

  npx expo install @sentry/react-native

  if ($LASTEXITCODE -ne 0) {
    throw "Sentry installation failed."
  }
}

# =============================================================================
# METRO / SENTRY BUILD SUPPORT
# =============================================================================

Step "Configuring Metro for production crash symbolication"

$metro = @'
const {
  getSentryExpoConfig,
} = require('@sentry/react-native/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
});

module.exports = config;
'@

WriteUtf8 "metro.config.js" $metro

# =============================================================================
# APP CONFIG
# =============================================================================

Step "Hardening Expo app config and Android permissions"

$appConfig = @'
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
'@

WriteUtf8 "app.config.js" $appConfig

# =============================================================================
# EAS
# =============================================================================

Step "Switching production Android build to Play Store AAB"

$eas = @'
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
'@

WriteUtf8 "eas.json" $eas

# =============================================================================
# RELEASE ENV
# =============================================================================

Step "Creating release environment template"

$envExample = @'
# Supabase public client configuration
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY

# Required for Google Play release when the app supports account creation
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://YOUR_DOMAIN/privacy
EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://YOUR_DOMAIN/delete-account

# Recommended
EXPO_PUBLIC_SUPPORT_EMAIL=support@YOUR_DOMAIN
EXPO_PUBLIC_APP_ENV=production

# Optional Sentry runtime reporting
EXPO_PUBLIC_SENTRY_DSN=

# Optional Sentry release/source-map integration for EAS Build
SENTRY_ORG=
SENTRY_PROJECT=
# Set SENTRY_AUTH_TOKEN as a secret/sensitive EAS environment variable.
'@

WriteUtf8 ".env.example" $envExample

# =============================================================================
# TELEMETRY
# =============================================================================

Step "Adding privacy-conscious production telemetry"

$telemetry = @'
type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (
    error: unknown,
    context?: Record<string, unknown>
  ) => string;
  captureMessage: (
    message: string,
    level?: string
  ) => string;
  setTag: (
    key: string,
    value: string
  ) => void;
};

let sentry: SentryLike | null = null;
let initialized = false;

const dsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

export const initializeTelemetry = () => {
  if (initialized) return;
  initialized = true;

  if (!dsn) {
    if (__DEV__) {
      console.info(
        '[telemetry] Sentry DSN not configured; production crash upload is disabled.'
      );
    }
    return;
  }

  try {
    // Loaded only when a DSN exists, so local/dev builds without
    // Sentry configuration do not require the native module at runtime.
    const module =
      require('@sentry/react-native') as SentryLike;

    module.init({
      dsn,
      enabled: !__DEV__,
      environment:
        process.env.EXPO_PUBLIC_APP_ENV ||
        (__DEV__
          ? 'development'
          : 'production'),
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
      attachStacktrace: true,
    });

    module.setTag(
      'app.product',
      'gym-management'
    );

    sentry = module;
  } catch (error) {
    console.warn(
      '[telemetry] Sentry could not initialize:',
      error
    );
  }
};

export const telemetry = {
  captureException: (
    error: unknown,
    context?: Record<string, unknown>
  ) => {
    if (sentry) {
      sentry.captureException(
        error,
        context
          ? {
              extra: context,
            }
          : undefined
      );
      return;
    }

    if (__DEV__) {
      console.error(
        '[telemetry]',
        error,
        context || {}
      );
    }
  },

  captureMessage: (
    message: string,
    level:
      | 'debug'
      | 'info'
      | 'warning'
      | 'error' = 'info'
  ) => {
    if (sentry) {
      sentry.captureMessage(
        message,
        level
      );
      return;
    }

    if (__DEV__) {
      console.log(
        `[telemetry:${level}]`,
        message
      );
    }
  },
};
'@

WriteUtf8 "src\services\telemetry.ts" $telemetry

$logger = @'
import { telemetry } from './telemetry';

type Context =
  Record<string, unknown>;

const SENSITIVE_KEYS =
  /password|token|secret|authorization|anon.?key|service.?role|phone|email|address|photo/i;

const sanitize = (
  value: unknown,
  depth = 0
): unknown => {
  if (depth > 3) {
    return '[truncated]';
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map(item =>
        sanitize(item, depth + 1)
      );
  }

  if (typeof value === 'object') {
    const output:
      Record<string, unknown> = {};

    Object.entries(
      value as Record<
        string,
        unknown
      >
    ).forEach(([key, item]) => {
      output[key] =
        SENSITIVE_KEYS.test(key)
          ? '[redacted]'
          : sanitize(
              item,
              depth + 1
            );
    });

    return output;
  }

  return String(value);
};

const safeContext = (
  context?: Context
): Context | undefined =>
  context
    ? (sanitize(context) as Context)
    : undefined;

export const logger = {
  debug: (
    message: string,
    context?: Context
  ) => {
    if (__DEV__) {
      console.debug(
        message,
        safeContext(context) || ''
      );
    }
  },

  info: (
    message: string,
    context?: Context
  ) => {
    if (__DEV__) {
      console.info(
        message,
        safeContext(context) || ''
      );
    }
  },

  warn: (
    message: string,
    context?: Context
  ) => {
    console.warn(
      message,
      safeContext(context) || ''
    );

    telemetry.captureMessage(
      message,
      'warning'
    );
  },

  error: (
    message: string,
    error: unknown,
    context?: Context
  ) => {
    console.error(
      message,
      error,
      safeContext(context) || ''
    );

    telemetry.captureException(
      error,
      {
        message,
        ...(safeContext(context) || {}),
      }
    );
  },
};
'@

WriteUtf8 "src\services\logger.ts" $logger

$errorBoundary = @'
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { logger } from '../services/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ProductionErrorBoundary
  extends React.Component<
    Props,
    State
  > {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError():
    State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: React.ErrorInfo
  ) {
    logger.error(
      'Unhandled React render error',
      error,
      {
        componentStack:
          info.componentStack,
      }
    );
  }

  private tryAgain = () => {
    this.setState({
      hasError: false,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>
            SOMETHING WENT WRONG
          </Text>

          <Text style={styles.title}>
            The app hit an unexpected
            error.
          </Text>

          <Text style={styles.body}>
            Your data was not
            intentionally changed by
            this error. Try opening
            the screen again. If the
            problem continues, contact
            support.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={this.tryAgain}
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 22,
  },
  eyebrow: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 7,
  },
  body: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  button: {
    minHeight: 49,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
'@

WriteUtf8 "src\components\ProductionErrorBoundary.tsx" $errorBoundary

# =============================================================================
# APP
# =============================================================================

Step "Wiring production error handling into App"

$app = @'
import React, {
  useEffect,
  useRef,
} from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import {
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import { notificationService } from './src/services/notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { GymProvider } from './src/contexts/GymContext';
import { SyncProvider } from './src/contexts/SyncContext';
import { SyncStatusBanner } from './src/components/SyncStatusBanner';
import { ProductionErrorBoundary } from './src/components/ProductionErrorBoundary';
import { initializeTelemetry } from './src/services/telemetry';
import { logger } from './src/services/logger';

initializeTelemetry();

export default function App() {
  const notificationListener =
    useRef<
      Notifications.Subscription | null
    >(null);

  const responseListener =
    useRef<
      Notifications.Subscription | null
    >(null);

  useEffect(() => {
    notificationService
      .initialize({
        enableRemotePush: false,
        subscribeSupabase: true,
      })
      .catch(error =>
        logger.error(
          'Notification service initialization failed',
          error
        )
      );

    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (
          nextAppState:
            AppStateStatus
        ) => {
          if (
            nextAppState ===
            'active'
          ) {
            notificationService
              .checkMembershipExpirations()
              .catch(error =>
                logger.error(
                  'Membership expiry check failed',
                  error
                )
              );
          }
        }
      );

    notificationListener.current =
      Notifications
        .addNotificationReceivedListener(
          notification => {
            logger.debug(
              'Notification received',
              {
                identifier:
                  notification
                    .request
                    .identifier,
              }
            );
          }
        );

    responseListener.current =
      Notifications
        .addNotificationResponseReceivedListener(
          response => {
            const data =
              response.notification
                .request.content.data;

            logger.debug(
              'Notification opened',
              {
                type:
                  data?.type,
                hasClientId:
                  Boolean(
                    data?.clientId
                  ),
              }
            );
          }
        );

    return () => {
      appStateSubscription.remove();

      notificationListener.current
        ?.remove();

      responseListener.current
        ?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1 }}
    >
      <SafeAreaProvider>
        <ProductionErrorBoundary>
          <AuthProvider>
            <GymProvider>
              <SyncProvider>
                <StatusBar
                  style="auto"
                />
                <AppNavigator />
                <SyncStatusBanner />
              </SyncProvider>
            </GymProvider>
          </AuthProvider>
        </ProductionErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
'@

WriteUtf8 "App.tsx" $app

# =============================================================================
# PRIVACY + ACCOUNT
# =============================================================================

Step "Creating Play-compliant privacy/account-deletion path"

$privacy = @'
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const openRequiredUrl = async (
  value: string | undefined,
  label: string
) => {
  const url = value?.trim();

  if (!url) {
    Alert.alert(
      `${label} not configured`,
      'The app owner must configure the production web URL before release.'
    );
    return;
  }

  try {
    const supported =
      await Linking.canOpenURL(url);

    if (!supported) {
      throw new Error(
        'This link cannot be opened.'
      );
    }

    await Linking.openURL(url);
  } catch (error: any) {
    Alert.alert(
      `Unable to open ${label.toLowerCase()}`,
      error?.message ||
        'Please try again.'
    );
  }
};

const PrivacyAccountScreen:
  React.FC = () => {
  const { user, signOut } = useAuth();

  const privacyUrl =
    process.env
      .EXPO_PUBLIC_PRIVACY_POLICY_URL;

  const deletionUrl =
    process.env
      .EXPO_PUBLIC_ACCOUNT_DELETION_URL;

  const supportEmail =
    process.env
      .EXPO_PUBLIC_SUPPORT_EMAIL;

  const contactSupport = async () => {
    if (!supportEmail) {
      Alert.alert(
        'Support email not configured'
      );
      return;
    }

    await Linking.openURL(
      `mailto:${supportEmail}?subject=${encodeURIComponent(
        'Gym Management App support'
      )}`
    );
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="shield-checkmark-outline"
            size={27}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.eyebrow}>
          ACCOUNT & DATA
        </Text>

        <Text style={styles.heroTitle}>
          Privacy controls
        </Text>

        <Text
          style={styles.heroSubtitle}
        >
          Review privacy information,
          request deletion, or sign out
          of this device.
        </Text>
      </View>

      <View style={styles.accountCard}>
        <Text style={styles.label}>
          SIGNED IN AS
        </Text>
        <Text style={styles.email}>
          {user?.email ||
            'Authenticated user'}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>
        YOUR DATA
      </Text>

      <Action
        icon="document-text-outline"
        title="Privacy policy"
        subtitle="See what information the app processes and why."
        onPress={() =>
          openRequiredUrl(
            privacyUrl,
            'Privacy policy'
          )
        }
      />

      <Action
        icon="trash-outline"
        title="Request account deletion"
        subtitle="Open the external deletion page to request deletion of your account and associated data."
        danger
        onPress={() =>
          openRequiredUrl(
            deletionUrl,
            'Account deletion page'
          )
        }
      />

      {supportEmail ? (
        <Action
          icon="help-circle-outline"
          title="Contact support"
          subtitle={supportEmail}
          onPress={contactSupport}
        />
      ) : null}

      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color="#475569"
        />

        <Text style={styles.infoText}>
          Gym business records may
          have retention requirements
          separate from your login
          account. The deletion page
          must explain any data the
          operator is legally required
          to retain.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.signOut}
        onPress={() => {
          Alert.alert(
            'Sign out?',
            'You will need to sign in again to access gym data.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                  signOut().catch(
                    error =>
                      Alert.alert(
                        'Unable to sign out',
                        String(
                          error?.message ||
                            error
                        )
                      )
                  );
                },
              },
            ]
          );
        }}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#B91C1C"
        />

        <Text
          style={styles.signOutText}
        >
          Sign out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const Action = ({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.action}
    onPress={onPress}
  >
    <View
      style={[
        styles.actionIcon,
        danger &&
          styles.actionIconDanger,
      ]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={
          danger
            ? '#B91C1C'
            : '#4F46E5'
        }
      />
    </View>

    <View style={styles.actionCopy}>
      <Text
        style={[
          styles.actionTitle,
          danger &&
            styles.actionTitleDanger,
        ]}
      >
        {title}
      </Text>

      <Text
        style={
          styles.actionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>

    <Ionicons
      name="open-outline"
      size={18}
      color="#94A3B8"
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  hero: {
    backgroundColor: '#312E81',
    borderRadius: 23,
    padding: 20,
    marginBottom: 13,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 3,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  label: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  email: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  action: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  actionIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  actionTitleDanger: {
    color: '#B91C1C',
  },
  actionSubtitle: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: '#475569',
    fontSize: 10,
    lineHeight: 15,
  },
  signOut: {
    minHeight: 51,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  signOutText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '900',
  },
});

export default PrivacyAccountScreen;
'@

WriteUtf8 "src\screens\PrivacyAccountScreen.tsx" $privacy

# =============================================================================
# SETTINGS
# =============================================================================

Step "Upgrading Settings without changing core workflows"

$settings = @'
import React, {
  useEffect,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGym } from '../contexts/GymContext';
import { storage } from '../services/storage';
import { exportDataAsCSV } from '../utils/dataExport';

const SettingsScreen: React.FC = () => {
  const navigation =
    useNavigation<any>();

  const { signOut } = useAuth();
  const { activeGym } = useGym();

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);

  useEffect(() => {
    storage
      .getItem(
        'notificationsEnabled'
      )
      .then(value => {
        if (value !== null) {
          setNotificationsEnabled(
            value === 'true'
          );
        }
      })
      .catch(() => {});
  }, []);

  const toggleNotifications =
    async () => {
      const next =
        !notificationsEnabled;

      setNotificationsEnabled(next);

      try {
        await storage.setItem(
          'notificationsEnabled',
          String(next)
        );
      } catch {
        setNotificationsEnabled(
          !next
        );

        Alert.alert(
          'Unable to save setting'
        );
      }
    };

  const logout = () => {
    Alert.alert(
      'Sign out?',
      'You will need to sign in again to access gym data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            signOut().catch(error =>
              Alert.alert(
                'Unable to sign out',
                String(
                  error?.message ||
                    error
                )
              )
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        styles.content
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          {activeGym?.name ||
            'GYM WORKSPACE'}
        </Text>

        <Text style={styles.heroTitle}>
          Settings
        </Text>

        <Text
          style={styles.heroSubtitle}
        >
          Workspace, privacy and app
          controls.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>
        WORKSPACE
      </Text>

      <Action
        icon="business-outline"
        title="Gym management"
        subtitle="Team, finance, plans and workspace controls."
        onPress={() =>
          navigation.navigate(
            'GymManagement'
          )
        }
      />

      <Action
        icon="people-circle-outline"
        title="Join another gym"
        subtitle="Use a staff invitation to join another workspace."
        onPress={() =>
          navigation.navigate(
            'JoinGym'
          )
        }
      />

      <Text style={styles.sectionLabel}>
        APP
      </Text>

      <View style={styles.action}>
        <View style={styles.actionIcon}>
          <Ionicons
            name="notifications-outline"
            size={21}
            color="#4F46E5"
          />
        </View>

        <View style={styles.actionCopy}>
          <Text
            style={styles.actionTitle}
          >
            Notifications
          </Text>

          <Text
            style={
              styles.actionSubtitle
            }
          >
            Control local membership
            reminders on this device.
          </Text>
        </View>

        <Switch
          value={
            notificationsEnabled
          }
          onValueChange={
            toggleNotifications
          }
        />
      </View>

      <Action
        icon="download-outline"
        title="Export data"
        subtitle="Create a CSV export for your records."
        onPress={() => {
          exportDataAsCSV()
            .then(() =>
              Alert.alert(
                'Export ready'
              )
            )
            .catch(error =>
              Alert.alert(
                'Export failed',
                String(
                  error?.message ||
                    error
                )
              )
            );
        }}
      />

      <Text style={styles.sectionLabel}>
        PRIVACY & SUPPORT
      </Text>

      <Action
        icon="shield-checkmark-outline"
        title="Privacy & account"
        subtitle="Privacy policy, account deletion and support."
        onPress={() =>
          navigation.navigate(
            'PrivacyAccount'
          )
        }
      />

      <Action
        icon="information-circle-outline"
        title="About"
        subtitle="Gym Management App · production workspace."
        onPress={() =>
          Alert.alert(
            'Gym Management App',
            'Version 1.0.0\nBuilt with React Native, Expo and Supabase.'
          )
        }
      />

      <TouchableOpacity
        style={styles.logout}
        onPress={logout}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#B91C1C"
        />
        <Text
          style={styles.logoutText}
        >
          Sign out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const Action = ({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.action}
    onPress={onPress}
  >
    <View style={styles.actionIcon}>
      <Ionicons
        name={icon}
        size={21}
        color="#4F46E5"
      />
    </View>

    <View style={styles.actionCopy}>
      <Text style={styles.actionTitle}>
        {title}
      </Text>

      <Text
        style={
          styles.actionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>

    <Ionicons
      name="chevron-forward"
      size={20}
      color="#94A3B8"
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  hero: {
    backgroundColor: '#312E81',
    borderRadius: 23,
    padding: 20,
    marginBottom: 23,
  },
  eyebrow: {
    color: '#C7D2FE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 11,
    marginTop: 4,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 3,
  },
  action: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 17,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  actionSubtitle: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  logout: {
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 17,
  },
  logoutText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '900',
  },
});

export default SettingsScreen;
'@

WriteUtf8 "src\screens\SettingsScreen.tsx" $settings

# =============================================================================
# CLEAN NAVIGATOR
# =============================================================================

Step "Rewriting navigator cleanly with privacy route"

$navigator = @'
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import AddClientScreen from '../screens/AddClientScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import AddPaymentScreen from '../screens/AddPaymentScreen';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import GymSetupScreen from '../screens/GymSetupScreen';
import GymManagementScreen from '../screens/GymManagementScreen';
import JoinGymScreen from '../screens/JoinGymScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';
import AuditLogScreen from '../screens/AuditLogScreen';
import MembershipPlansScreen from '../screens/MembershipPlansScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import MemberCardScreen from '../screens/MemberCardScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import WhatsAppToolsScreen from '../screens/WhatsAppToolsScreen';
import PrivacyAccountScreen from '../screens/PrivacyAccountScreen';

import { useAuth } from '../contexts/AuthContext';
import { useGym } from '../contexts/GymContext';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();
const ClientStackNavigator = createStackNavigator();
const PaymentStackNavigator = createStackNavigator();
const OnboardingStackNavigator = createStackNavigator();
const SignedOutStackNavigator = createStackNavigator();

const sharedHeaderOptions = {
  headerStyle: {
    backgroundColor: '#312E81',
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
    fontSize: 18,
  },
  headerTitleAlign:
    'center' as const,
};

const ClientStack = () => (
  <ClientStackNavigator.Navigator
    screenOptions={
      sharedHeaderOptions
    }
  >
    <ClientStackNavigator.Screen
      name="ClientsList"
      component={ClientsScreen}
      options={{
        title: 'Clients',
        headerShown: false,
      }}
    />
    <ClientStackNavigator.Screen
      name="ClientDetail"
      component={ClientDetailScreen}
      options={{
        headerShown: false,
      }}
    />
    <ClientStackNavigator.Screen
      name="AddClient"
      component={AddClientScreen}
      options={{
        title: 'Add Client',
        headerShown: false,
      }}
    />
  </ClientStackNavigator.Navigator>
);

const PaymentStack = () => (
  <PaymentStackNavigator.Navigator
    screenOptions={
      sharedHeaderOptions
    }
  >
    <PaymentStackNavigator.Screen
      name="PaymentsList"
      component={PaymentsScreen}
      options={{
        title: 'Payments',
        headerShown: false,
      }}
    />
    <PaymentStackNavigator.Screen
      name="AddPayment"
      component={AddPaymentScreen}
      options={{
        title: 'Add Payment',
        headerShown: false,
      }}
    />
  </PaymentStackNavigator.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({
        focused,
        color,
        size,
      }) => {
        let iconName:
          keyof typeof Ionicons.glyphMap;

        if (
          route.name === 'Dashboard'
        ) {
          iconName = focused
            ? 'stats-chart'
            : 'stats-chart-outline';
        } else if (
          route.name === 'Clients'
        ) {
          iconName = focused
            ? 'people'
            : 'people-outline';
        } else if (
          route.name ===
          'Attendance'
        ) {
          iconName = focused
            ? 'scan-circle'
            : 'scan-circle-outline';
        } else if (
          route.name === 'Payments'
        ) {
          iconName = focused
            ? 'card'
            : 'card-outline';
        } else {
          iconName = focused
            ? 'settings'
            : 'settings-outline';
        }

        return (
          <Ionicons
            name={iconName}
            size={size}
            color={color}
          />
        );
      },
      tabBarActiveTintColor:
        '#4F46E5',
      tabBarInactiveTintColor:
        '#64748B',
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
      },
      tabBarStyle: {
        height: 64,
        paddingTop: 5,
        paddingBottom: 7,
        borderTopColor: '#E2E8F0',
      },
      headerStyle: {
        backgroundColor: '#312E81',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerTitleAlign: 'center',
    })}
  >
    <Tab.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={({ navigation }) => ({
        headerRight: () => (
          <TouchableOpacity
            style={
              styles.headerButton
            }
            onPress={() =>
              navigation
                .getParent()
                ?.navigate(
                  'Notifications'
                )
            }
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        ),
      })}
    />
    <Tab.Screen
      name="Clients"
      component={ClientStack}
    />
    <Tab.Screen
      name="Attendance"
      component={AttendanceScreen}
      options={{
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Payments"
      component={PaymentStack}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        headerShown: false,
      }}
    />
  </Tab.Navigator>
);

const SignedOutStack = () => (
  <SignedOutStackNavigator.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <SignedOutStackNavigator.Screen
      name="Login"
      component={LoginScreen}
    />
  </SignedOutStackNavigator.Navigator>
);

const GymOnboardingStack = () => (
  <OnboardingStackNavigator.Navigator
    initialRouteName="GymSetup"
    screenOptions={
      sharedHeaderOptions
    }
  >
    <OnboardingStackNavigator.Screen
      name="GymSetup"
      component={GymSetupScreen}
      options={{
        title: 'Create or Join Gym',
        headerShown: false,
      }}
    />
    <OnboardingStackNavigator.Screen
      name="JoinGym"
      component={JoinGymScreen}
      options={{
        title: 'Join Gym',
      }}
    />
  </OnboardingStackNavigator.Navigator>
);

const AuthenticatedApp = () => (
  <RootStack.Navigator
    screenOptions={
      sharedHeaderOptions
    }
  >
    <RootStack.Screen
      name="Main"
      component={MainTabs}
      options={{
        headerShown: false,
      }}
    />
    <RootStack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{
        title: 'Notifications',
      }}
    />
    <RootStack.Screen
      name="GymManagement"
      component={GymManagementScreen}
      options={{
        title: 'Gym Management',
      }}
    />
    <RootStack.Screen
      name="JoinGym"
      component={JoinGymScreen}
      options={{
        title: 'Join Gym',
      }}
    />
    <RootStack.Screen
      name="StaffManagement"
      component={StaffManagementScreen}
      options={{
        title: 'Staff & Roles',
      }}
    />
    <RootStack.Screen
      name="AuditLog"
      component={AuditLogScreen}
      options={{
        title: 'Activity Log',
      }}
    />
    <RootStack.Screen
      name="MembershipPlans"
      component={
        MembershipPlansScreen
      }
      options={{
        title: 'Membership Plans',
      }}
    />
    <RootStack.Screen
      name="QRScanner"
      component={QRScannerScreen}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
    <RootStack.Screen
      name="MemberCard"
      component={MemberCardScreen}
      options={{
        title: 'Member Card',
      }}
    />
    <RootStack.Screen
      name="FinanceDashboard"
      component={
        FinanceDashboardScreen
      }
      options={{
        title: 'Finance',
      }}
    />
    <RootStack.Screen
      name="Expenses"
      component={ExpensesScreen}
      options={{
        title: 'Expenses',
      }}
    />
    <RootStack.Screen
      name="Receipt"
      component={ReceiptScreen}
      options={{
        title: 'Receipt',
      }}
    />
    <RootStack.Screen
      name="WhatsAppTools"
      component={
        WhatsAppToolsScreen
      }
      options={{
        title: 'WhatsApp Tools',
      }}
    />
    <RootStack.Screen
      name="PrivacyAccount"
      component={
        PrivacyAccountScreen
      }
      options={{
        title: 'Privacy & Account',
      }}
    />
  </RootStack.Navigator>
);

const AppNavigator = () => {
  const {
    user,
    isLoading: authLoading,
  } = useAuth();

  const {
    activeGym,
    isLoading: gymsLoading,
  } = useGym();

  if (
    authLoading ||
    (user && gymsLoading)
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.loadingText
          }
        >
          Loading gym access...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <SignedOutStack />
      ) : activeGym ? (
        <AuthenticatedApp />
      ) : (
        <GymOnboardingStack />
      )}
    </NavigationContainer>
  );
};

const styles =
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
    },
    loadingText: {
      fontSize: 16,
      color: '#475569',
      fontWeight: '700',
    },
    headerButton: {
      width: 42,
      height: 42,
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AppNavigator;
'@

WriteUtf8 "src\navigation\AppNavigator.tsx" $navigator

# =============================================================================
# RELEASE VALIDATOR
# =============================================================================

Step "Creating release validator"

$validator = @'
import fs from 'node:fs';

const fail = [];
const warn = [];

const requiredUrl = (
  name
) => {
  const value =
    process.env[name]?.trim();

  if (!value) {
    fail.push(
      `${name} is missing.`
    );
    return;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== 'https:'
    ) {
      fail.push(
        `${name} must use HTTPS for production.`
      );
    }
  } catch {
    fail.push(
      `${name} is not a valid URL.`
    );
  }
};

const requiredValue = (
  name
) => {
  if (!process.env[name]?.trim()) {
    fail.push(
      `${name} is missing.`
    );
  }
};

requiredValue(
  'EXPO_PUBLIC_SUPABASE_URL'
);
requiredValue(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
);
requiredUrl(
  'EXPO_PUBLIC_PRIVACY_POLICY_URL'
);
requiredUrl(
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL'
);

if (
  process.env
    .EXPO_PUBLIC_SUPABASE_ANON_KEY
    ?.toLowerCase()
    .includes('service_role')
) {
  fail.push(
    'A Supabase service-role key must never be shipped in the mobile app.'
  );
}

const eas =
  JSON.parse(
    fs.readFileSync(
      'eas.json',
      'utf8'
    )
  );

if (
  eas?.build?.production
    ?.android?.buildType !==
  'app-bundle'
) {
  fail.push(
    'Production Android buildType must be app-bundle.'
  );
}

const app =
  JSON.parse(
    fs.readFileSync(
      'app.json',
      'utf8'
    )
  );

const sdkPackage =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8'
    )
  )?.dependencies?.expo;

if (
  !String(sdkPackage || '')
    .includes('54')
) {
  warn.push(
    'Verify targetSdkVersion is at least API 36 before Google Play submission.'
  );
}

if (
  !app?.expo?.android?.package
) {
  fail.push(
    'expo.android.package is missing.'
  );
}

if (
  !process.env
    .EXPO_PUBLIC_SENTRY_DSN
) {
  warn.push(
    'Sentry DSN is not configured; production crash upload is disabled.'
  );
}

if (
  !process.env.SENTRY_ORG ||
  !process.env.SENTRY_PROJECT ||
  !process.env.SENTRY_AUTH_TOKEN
) {
  warn.push(
    'Sentry source-map upload is not fully configured.'
  );
}

console.log('');
console.log(
  'Gym Management App release validation'
);
console.log(
  '-------------------------------------'
);

warn.forEach(message =>
  console.warn(
    `WARN: ${message}`
  )
);

if (fail.length) {
  fail.forEach(message =>
    console.error(
      `FAIL: ${message}`
    )
  );

  console.error('');
  console.error(
    `Release validation failed with ${fail.length} blocking issue(s).`
  );

  process.exit(1);
}

console.log('');
console.log(
  'Release validation passed.'
);
console.log(
  'Remember to verify Supabase migrations are fully remote before building production.'
);
'@

WriteUtf8 "scripts\validate-release.mjs" $validator

# =============================================================================
# CI
# =============================================================================

Step "Adding CI quality gate"

$workflow = @'
name: quality

on:
  push:
    branches:
      - main
      - master
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: TypeScript
        run: npm run typecheck

      - name: Expo Doctor
        run: npx expo-doctor
'@

WriteUtf8 ".github\workflows\quality.yml" $workflow

# =============================================================================
# PACKAGE SCRIPTS
# =============================================================================

Step "Adding repeatable quality/release commands"

$package = Get-Content "package.json" -Raw | ConvertFrom-Json

if (-not $package.scripts) {
  $package | Add-Member `
    -NotePropertyName scripts `
    -NotePropertyValue ([pscustomobject]@{})
}

$package.scripts | Add-Member `
  -NotePropertyName "typecheck" `
  -NotePropertyValue "tsc --noEmit" `
  -Force

$package.scripts | Add-Member `
  -NotePropertyName "doctor" `
  -NotePropertyValue "expo-doctor" `
  -Force

$package.scripts | Add-Member `
  -NotePropertyName "check" `
  -NotePropertyValue "npm run typecheck && npm run doctor" `
  -Force

$package.scripts | Add-Member `
  -NotePropertyName "release:validate" `
  -NotePropertyValue "node scripts/validate-release.mjs" `
  -Force

$package.scripts | Add-Member `
  -NotePropertyName "build:android" `
  -NotePropertyValue "npm run release:validate && eas build -p android --profile production" `
  -Force

$packageJson = $package |
  ConvertTo-Json -Depth 100

WriteUtf8 "package.json" ($packageJson + "`n")

# =============================================================================
# RELEASE DOC
# =============================================================================

Step "Creating Play Store release checklist"

$releaseDoc = @'
# Google Play release checklist

Updated for September 2026.

## Technical build

- Expo SDK 54 targets Android 16 / API 36.
- Production Android build must be an AAB, not an APK.
- Run `npm run check`.
- Run `npm run release:validate`.
- Confirm every local Supabase migration is also remote.
- Build with `npm run build:android`.
- Use Play App Signing.

## Required web URLs

Because this app supports account creation, configure:

- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_ACCOUNT_DELETION_URL`

The account-deletion web page must work without requiring the user to reinstall the app. It should clearly identify this app/developer and provide a way to request account/data deletion.

## Play Console forms

Complete accurately:

- Data safety
- Account deletion URL
- Financial features declaration
- App access / reviewer instructions for login-gated functionality
- Content rating
- Ads declaration
- Target audience
- Privacy policy URL

Recording gym membership payments does not automatically mean the app is a wallet, money-transfer service, or financial institution. Answer the Financial features declaration based on the actual product behavior.

## Permissions

This project blocks broad Android media permissions:

- READ_MEDIA_IMAGES
- READ_MEDIA_VIDEO
- READ_EXTERNAL_STORAGE

It also blocks RECORD_AUDIO because QR scanning does not need microphone access.

Use the system image picker for occasional member-photo selection.

## New personal Play developer accounts

If the Play developer account is a personal account created after November 13, 2023, Google currently requires a closed test with at least 12 opted-in testers continuously for 14 days before applying for production access.

## Crash reporting

Runtime error upload is enabled only when:

- `EXPO_PUBLIC_SENTRY_DSN` is set.

For symbolicated EAS production builds also configure:

- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` as a sensitive EAS environment variable.

Do not commit Sentry auth tokens.

## Pre-release smoke test

Test on a release/development build, not only Metro:

1. Sign up / sign in.
2. Create or join gym.
3. Add/edit/delete member.
4. Record membership payment.
5. Open receipt and share PDF.
6. WhatsApp message handoff.
7. Attendance manual check-in.
8. QR scan and checkout.
9. Expense entry.
10. Finance dashboard.
11. Staff invitation and role enforcement.
12. Offline member create/edit and reconnect sync.
13. Privacy policy opens.
14. Account deletion web resource opens.
15. Sign out and sign back in.
16. Verify notification permission/behavior.
17. Inspect Android permissions in the final AAB/APK.
18. Verify Sentry receives a controlled test error before launch.

## Database gate

Do not ship while migration history is divergent.

Expected final form:

`001 | 001`
`002 | 002`
`003 | 003`
`004 | 004`
`005 | 005`
`006 | 006`
`007 | 007`
`008 | 008`

No production build should be promoted while the app expects RPCs that are missing remotely.
'@

WriteUtf8 "docs\PLAY_STORE_RELEASE.md" $releaseDoc

# =============================================================================
# TYPECHECK
# =============================================================================

if (-not $SkipTypeCheck) {
  Step "Running TypeScript"

  npx tsc --noEmit

  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TypeScript reported errors." -ForegroundColor Red
    Write-Host "Backup:"
    Write-Host $backup
    exit 1
  }

  Write-Host "TypeScript passed." -ForegroundColor Green
}

Step "Running Expo Doctor"

npx expo-doctor

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Expo Doctor reported warnings/errors. Review them before release." -ForegroundColor Yellow
}

Step "PACK 9 local implementation complete"

Write-Host ""
Write-Host "Created:" -ForegroundColor Green
Write-Host "  src\services\telemetry.ts"
Write-Host "  src\services\logger.ts"
Write-Host "  src\components\ProductionErrorBoundary.tsx"
Write-Host "  src\screens\PrivacyAccountScreen.tsx"
Write-Host "  scripts\validate-release.mjs"
Write-Host "  .github\workflows\quality.yml"
Write-Host "  docs\PLAY_STORE_RELEASE.md"
Write-Host "  .env.example"
Write-Host ""
Write-Host "Updated:" -ForegroundColor Green
Write-Host "  App.tsx"
Write-Host "  src\screens\SettingsScreen.tsx"
Write-Host "  src\navigation\AppNavigator.tsx"
Write-Host "  app.config.js"
Write-Host "  metro.config.js"
Write-Host "  eas.json"
Write-Host "  package.json"
Write-Host ""
Write-Host "Production Android now builds AAB." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  1. Configure real HTTPS privacy + deletion URLs before release."
Write-Host "  2. Do not build production until migrations 006, 007 and 008 are remote."
Write-Host "  3. Sentry is a native dependency. Rebuild the dev client before enabling EXPO_PUBLIC_SENTRY_DSN."
Write-Host ""
Write-Host "Suggested next local checks:"
Write-Host "  npm run typecheck"
Write-Host "  npm run doctor"
Write-Host ""
Write-Host "After setting release environment variables:"
Write-Host "  npm run release:validate"
Write-Host "  npm run build:android"

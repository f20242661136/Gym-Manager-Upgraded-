import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
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

const styles = createAdaptiveStyles({
  page: {
    flex: 1,
    backgroundColor: ui.color.canvas,
  },
  content: {
    padding: 18,
    paddingBottom: 44,
  },
  hero: {
    backgroundColor: ui.color.brandStrong,
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
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  label: {
    color: ui.color.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  email: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  sectionLabel: {
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  action: {
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
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
    backgroundColor: ui.color.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  actionIconDanger: {
    backgroundColor: ui.color.dangerSoft,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },
  actionTitleDanger: {
    color: ui.color.danger,
  },
  actionSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: ui.color.surfaceSubtle,
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    color: ui.color.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
  signOut: {
    minHeight: 51,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.color.dangerBorder,
    backgroundColor: ui.color.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  signOutText: {
    color: ui.color.danger,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default PrivacyAccountScreen;
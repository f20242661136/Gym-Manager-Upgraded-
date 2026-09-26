import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import { ui } from '../ui/theme';
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
        title="Owner workspace"
        subtitle="Finance, plans, team, security and gym workspace controls."
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
        subtitle="Gym Management App - production workspace."
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
    color: ui.color.textSecondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 3,
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
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
  },
  actionSubtitle: {
    color: ui.color.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  logout: {
    minHeight: 51,
    borderRadius: 15,
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 17,
  },
  logoutText: {
    color: ui.color.danger,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default SettingsScreen;
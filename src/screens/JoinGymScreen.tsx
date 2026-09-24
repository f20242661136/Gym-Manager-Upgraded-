import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../contexts/GymContext';
import { staffService } from '../services/staffService';

const JoinGymScreen: React.FC = () => {
  const { refreshGyms, setActiveGym } = useGym();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinGym = async () => {
    const value = code.replace(/\s+/g, '').trim().toUpperCase();

    if (!value) {
      Alert.alert(
        'Invitation code required',
        'Enter the temporary invitation code shared by your gym owner or admin.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const gym = await staffService.acceptInvitation(value);

      await refreshGyms();
      await setActiveGym(gym.id);

      Alert.alert(
        'Welcome to the team',
        `You now have access to ${gym.name}.`
      );
    } catch (error: any) {
      console.error('Error accepting gym invitation:', error);
      Alert.alert(
        'Unable to join gym',
        error?.message ||
          'The invitation may be invalid, expired or created for another email address.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="people-outline" size={32} color="#4F46E5" />
        </View>

        <Text style={styles.title}>Join your gym team</Text>

        <Text style={styles.subtitle}>
          Enter the temporary invitation code from your gym owner or admin.
          Invitations expire automatically for better security.
        </Text>

        <Text style={styles.label}>Invitation code</Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={text => setCode(text.toUpperCase())}
          placeholder="E.G. A1B2C3D4E5F6G7H8"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
          onSubmitEditing={handleJoinGym}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSubmitting && styles.disabledButton,
          ]}
          onPress={handleJoinGym}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="log-in-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                Accept invitation
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.notice}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color="#047857"
          />
          <Text style={styles.noticeText}>
            Your role and permissions are assigned by the gym that invited you.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 26,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#0F172A',
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  notice: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: '#065F46',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

export default JoinGymScreen;
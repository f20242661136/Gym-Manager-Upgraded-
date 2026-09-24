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
} from 'react-native';
import { useGym } from '../contexts/GymContext';
import { joinGymBySlug } from '../services/gymService';

const JoinGymScreen: React.FC = () => {
  const { refreshGyms, setActiveGym } = useGym();
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinGym = async () => {
    const trimmed = slug.trim();
    if (!trimmed) {
      Alert.alert('Enter a gym slug', 'Please enter the gym slug or code to join.');
      return;
    }

    try {
      setIsSubmitting(true);
      const gym = await joinGymBySlug(trimmed);
      await refreshGyms();
      await setActiveGym(gym.id);
      Alert.alert('Joined gym', `You have joined ${gym.name}.`);
    } catch (error: any) {
      console.error('Error joining gym:', error);
      Alert.alert('Unable to join gym', error?.message || 'Please try again.');
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
        <Text style={styles.title}>Join an existing gym</Text>
        <Text style={styles.subtitle}>
          Enter the gym slug provided by your owner or manager.
        </Text>

        <TextInput
          style={styles.input}
          value={slug}
          onChangeText={setSlug}
          placeholder="gym-slug"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleJoinGym}
        />

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleJoinGym}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Joining...' : 'Join gym'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 18,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default JoinGymScreen;

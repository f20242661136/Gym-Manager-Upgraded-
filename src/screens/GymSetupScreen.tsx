import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useGym } from '../contexts/GymContext';
import { createGym } from '../services/gymService';

const GymSetupScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { refreshGyms } = useGym();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatedSlug = useMemo(() => {
    const raw = slug.trim() || name.trim();
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }, [name, slug]);

  const handleCreateGym = async () => {
    const trimmedName = name.trim();
    const finalSlug = generatedSlug;

    if (!trimmedName) {
      Alert.alert('Missing gym name', 'Please enter your gym name.');
      return;
    }

    if (!finalSlug) {
      Alert.alert('Missing slug', 'Please enter a valid gym slug or name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createGym({
        name: trimmedName,
        slug: finalSlug,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      });
      await refreshGyms();
      Alert.alert('Gym ready', 'Your gym has been created successfully.');
    } catch (error: any) {
      console.error('Error creating gym:', error);
      Alert.alert('Unable to create gym', error?.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create your first gym</Text>
        <Text style={styles.subtitle}>
          This new Supabase project is empty, so add your gym details to get started.
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Gym name"
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={setSlug}
            placeholder="Slug (optional, auto-generated from name)"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.previewText}>Slug preview: {generatedSlug || 'gym-name'}</Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={handleCreateGym}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Creating gym...' : 'Create gym'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={async () => {
              try {
                await signOut();
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    lineHeight: 22,
  },
  formContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  previewText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default GymSetupScreen;

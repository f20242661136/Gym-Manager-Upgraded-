import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import type { CountryCode } from '../types';
import { MARKET_CONFIG } from '../config/markets';

const GymSetupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { refreshGyms } = useGym();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('PK');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const market = MARKET_CONFIG[countryCode];

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

      const gym = await createGym({
        name: trimmedName,
        slug: finalSlug,
        countryCode,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      });

      await refreshGyms();

      Alert.alert(
        'Gym ready',
        `Your gym has been created.\n\nJoin code: ${gym.joinCode ?? 'Open Gym Management to view it.'}`
      );
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
          Set the gym country now so currency, payment methods and timezone work correctly.
        </Text>

        <View style={styles.choiceCard}>
          <Text style={styles.choiceTitle}>Already invited by a gym?</Text>
          <Text style={styles.choiceText}>
            Use your temporary staff invitation instead of creating another gym.
          </Text>
          <TouchableOpacity
            style={styles.joinExistingButton}
            onPress={() => navigation.navigate('JoinGym')}
          >
            <Text style={styles.joinExistingText}>Join an existing gym</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Country</Text>
          <View style={styles.countryRow}>
            {(['PK', 'IN'] as CountryCode[]).map(code => {
              const selected = countryCode === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.countryButton, selected && styles.countryButtonActive]}
                  onPress={() => setCountryCode(code)}
                >
                  <Text style={[styles.countryButtonText, selected && styles.countryButtonTextActive]}>
                    {MARKET_CONFIG[code].countryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.marketHint}>
            {market.currency} Ã¢â‚¬Â¢ {market.timezone} Ã¢â‚¬Â¢ {market.callingCode}
          </Text>

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

          <Text style={styles.previewText}>
            Slug preview: {generatedSlug || 'gym-name'}
          </Text>

          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={`Phone (${market.callingCode})`}
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
  choiceCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  choiceTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '800',
  },
  choiceText: {
    color: '#4F46E5',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  joinExistingButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  joinExistingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  formContainer: {
    gap: 12,
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  countryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  countryButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  countryButtonText: {
    color: '#374151',
    fontWeight: '700',
  },
  countryButtonTextActive: {
    color: '#4F46E5',
  },
  marketHint: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 4,
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
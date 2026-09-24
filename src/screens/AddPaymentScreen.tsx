import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';
import type { Payment, PaymentMethod } from '../types';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { notificationService } from '../services/notifications';
import { useGym } from '../contexts/GymContext';
import { MARKET_CONFIG } from '../config/markets';
import { formatMoney } from '../utils/currency';

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const AddPaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { clientId, clientName } = route.params as {
    clientId: string;
    clientName: string;
  };

  const { activeGym } = useGym();
  const isConnected = useNetworkStatus();

  const market = MARKET_CONFIG[activeGym?.countryCode ?? 'PK'];

  const durationOptions = useMemo(
    () => [
      { days: 30, label: '1 Month' },
      { days: 90, label: '3 Months' },
      { days: 180, label: '6 Months' },
      { days: 365, label: '1 Year' },
    ],
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [duration, setDuration] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [currentMembershipExpiry, setCurrentMembershipExpiry] = useState<string | null>(null);

  const calculateExpiryFrom = (dateString: string, days: number) => {
    const start = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(start.getTime())) return '';

    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + days);
    return toDateString(expiry);
  };

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      let baseDate = toDateString(today);

      try {
        const client = await api.getClient(clientId);

        if (client?.membershipDueDate) {
          setCurrentMembershipExpiry(client.membershipDueDate);

          const currentExpiry = new Date(client.membershipDueDate);
          if (!Number.isNaN(currentExpiry.getTime()) && currentExpiry > today) {
            baseDate = toDateString(currentExpiry);
          }
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      }

      setStartDate(baseDate);
      setExpiryDate(calculateExpiryFrom(baseDate, 30));
    };

    load();
  }, [clientId]);

  const calculateExpiryDate = (days: number) => {
    setDuration(days);
    setExpiryDate(calculateExpiryFrom(startDate, days));
  };

  const handleStartDateChange = (dateString: string) => {
    setStartDate(dateString);
    setExpiryDate(calculateExpiryFrom(dateString, duration));
  };

  const handleSubmit = async () => {
    if (!amount || !startDate || !expiryDate) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    const start = new Date(`${startDate}T12:00:00`);
    const expiry = new Date(`${expiryDate}T12:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(expiry.getTime())) {
      Alert.alert('Error', 'Please use a valid date in YYYY-MM-DD format.');
      return;
    }

    if (expiry <= start) {
      Alert.alert('Error', 'Expiry date must be after the membership start date.');
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date();

      const newPayment: Omit<Payment, 'id'> = {
        clientId,
        clientName,
        amount: paymentAmount,
        paymentDate: toDateString(today),
        dueDate: expiryDate,
        status: 'Paid',
        duration,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || null,
        providerTransactionId: null,
        notes: null,
      };

      await api.addPayment(newPayment, isConnected);

      try {
        await notificationService.schedulePaymentNotification(
          clientId,
          clientName,
          duration
        );
      } catch (notificationError) {
        console.error('Error scheduling notifications:', notificationError);
      }

      Alert.alert(
        'Payment recorded',
        `${formatMoney(paymentAmount, market.currency)} recorded via ${
          market.paymentMethods.find(item => item.value === paymentMethod)?.label ?? paymentMethod
        }.`
      );

      navigation.goBack();
    } catch (error) {
      console.error('Failed to record payment:', error);
      Alert.alert('Error', 'Failed to record payment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{clientName}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{market.currencySymbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Method</Text>

          <View style={styles.optionGrid}>
            {market.paymentMethods.map(method => {
              const selected = paymentMethod === method.value;

              return (
                <TouchableOpacity
                  key={method.value}
                  style={[styles.optionButton, selected && styles.optionButtonActive]}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {paymentMethod !== 'cash' ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Transaction / Reference Number</Text>
            <TextInput
              style={styles.input}
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="Optional"
              autoCapitalize="characters"
            />
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Membership Start Date *</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={handleStartDateChange}
            placeholder="YYYY-MM-DD"
          />

          {currentMembershipExpiry ? (
            <Text style={styles.helperText}>
              Existing membership expiry: {currentMembershipExpiry}
            </Text>
          ) : (
            <Text style={styles.helperText}>
              New memberships start from the selected date.
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Membership Duration</Text>

          <View style={styles.optionGrid}>
            {durationOptions.map(option => {
              const selected = duration === option.days;

              return (
                <TouchableOpacity
                  key={option.days}
                  style={[styles.optionButton, selected && styles.optionButtonActive]}
                  onPress={() => calculateExpiryDate(option.days)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date *</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            editable={false}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>
              {formatMoney(Number(amount) || 0, market.currency)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Method</Text>
            <Text style={styles.summaryValue}>
              {market.paymentMethods.find(item => item.value === paymentMethod)?.label}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valid until</Text>
            <Text style={styles.summaryValue}>{expiryDate}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="card" size={20} color="white" />
            <Text style={styles.submitButtonText}>Record Payment</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.goBackButton}
        onPress={() =>
          navigation.navigate('Clients', {
            screen: 'ClientDetail',
            params: { clientId },
          })
        }
      >
        <Ionicons name="arrow-back" size={20} color="#6B7280" />
        <Text style={styles.goBackButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    padding: 12,
    paddingRight: 8,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionButton: {
    minWidth: '46%',
    flexGrow: 1,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionTextActive: {
    color: '#4F46E5',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#111827',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  summary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  goBackButton: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  goBackButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
});

export default AddPaymentScreen;
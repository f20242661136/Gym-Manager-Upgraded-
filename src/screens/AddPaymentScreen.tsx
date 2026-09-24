import React, { useState, useEffect } from 'react';
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
import { Payment } from '../types';
import { useNetworkStatus } from '../hook/useNetworkStatus';
import { notificationService } from '../services/notifications';

const AddPaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { clientId, clientName } = route.params as { clientId: string; clientName: string };
  const isConnected = useNetworkStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [duration, setDuration] = useState(1); // duration in days
  const [currentMembershipExpiry, setCurrentMembershipExpiry] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current membership expiry date for client
    const fetchClientData = async () => {
      try {
        const client = await api.getClient(clientId);
        if (client && client.membershipDueDate) {
          setCurrentMembershipExpiry(client.membershipDueDate);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      }
    };

    fetchClientData();

    // Set default start date to today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setStartDate(todayStr);
    // Calculate default expiry date (today + 1 day)
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + 1);
    setExpiryDate(`${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`);
  }, []);

  const handleSubmit = async () => {
    if (!amount || !startDate || !expiryDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check for active membership overlap
    if (currentMembershipExpiry) {
      const now = new Date();
      const currentExpiryDate = new Date(currentMembershipExpiry);
      const selectedExpiryDate = new Date(expiryDate);

      // If current membership expiry is in the future and overlaps with selected expiry
      if (currentExpiryDate > now && selectedExpiryDate <= currentExpiryDate) {
        Alert.alert(
          'Active Membership Exists',
          'You already have an active membership. Please wait until it expires before making another payment.'
        );
        return;
      }
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date();
      const newPayment: Omit<Payment, 'id'> = {
        clientId,
        clientName,
        amount: paymentAmount,
        paymentDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        dueDate: expiryDate,
        status: 'Paid',
        duration,
      };

      await api.addPayment(newPayment, isConnected);

      // Schedule notifications based on duration
      try {
        // Calculate expiry date based on startDate and duration
        const start = new Date(startDate);
        const expiry = new Date(start);
        expiry.setDate(expiry.getDate() + duration);

        // Schedule notifications 3 days before expiry and on expiry date
        await notificationService.schedulePaymentNotification(clientId, clientName, duration);
      } catch (notificationError) {
        console.error('Error scheduling notifications:', notificationError);
        // Don't fail the payment if notification scheduling fails
      }

      Alert.alert('Success', 'Payment recorded successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateExpiryDate = (days: number) => {
    if (!startDate) return;

    const start = new Date(startDate);
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + days);
    const expiryStr = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`;
    setExpiryDate(expiryStr);
    setDuration(days);
  };

  const handleStartDateChange = (dateStr: string) => {
    setStartDate(dateStr);
    // Recalculate expiry date when start date changes
    if (duration > 0) {
      calculateExpiryDate(duration);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <View style={styles.section}>
        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Amount *</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>Rs.</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Start Date Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={handleStartDateChange}
            placeholder="YYYY-MM-DD"
          />
          <Text style={styles.helperText}>
            Membership start date
          </Text>
        </View>

        {/* Membership Duration */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Membership Duration</Text>
          <View style={styles.durationButtons}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => calculateExpiryDate(1)}
            >
              <Text style={styles.durationButtonText}>1 Day</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => calculateExpiryDate(3)}
            >
              <Text style={styles.durationButtonText}>3 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => calculateExpiryDate(7)}
            >
              <Text style={styles.durationButtonText}>1 Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => calculateExpiryDate(30)}
            >
              <Text style={styles.durationButtonText}>1 Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Expiry Date Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date *</Text>
          <TextInput
            style={styles.input}
            value={expiryDate}
            editable={false}
            placeholder="YYYY-MM-DD"
          />
          <Text style={styles.helperText}>
            Automatically calculated from start date + duration
          </Text>
        </View>

        {/* Payment Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>Rs. {amount || '0.00'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expiry Date:</Text>
            <Text style={styles.summaryValue}>{expiryDate}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>Rs. {amount || '0.00'}</Text>
          </View>
        </View>
      </View>

      {/* Submit Button */}
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

      {/* Go Back Button */}
      <TouchableOpacity
        style={[styles.goBackButton]}
        onPress={() => navigation.navigate('Clients', { screen: 'ClientDetail', params: { clientId, clientName } })}
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  durationButton: {
    flex: 1,
    minWidth: '45%',
    margin: 4,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  goBackButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  goBackButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddPaymentScreen;

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
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId, clientName } = route.params as { clientId: string; clientName: string };
  const isConnected = useNetworkStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    // Set default due date to one month from now
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDueDate(nextMonth.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async () => {
    if (!amount || !dueDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    try {
      const newPayment: Omit<Payment, 'id'> = {
        clientId,
        clientName,
        amount: paymentAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        dueDate,
        status: 'Paid',
      };

      await api.addPayment(newPayment, isConnected);

      // Re-schedule membership expiry reminders after payment update
      try {
        await notificationService.rescheduleMembershipReminders();
      } catch (notificationError) {
        console.error('Error re-scheduling notifications:', notificationError);
        // Don't fail the payment if notification re-scheduling fails
      }

      Alert.alert('Success', 'Payment recorded successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDueDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setDueDate(date.toISOString().split('T')[0]);
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

        {/* Due Date Quick Select */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Membership Duration</Text>
          <View style={styles.durationButtons}>
            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => calculateDueDate(1)}
            >
              <Text style={styles.durationButtonText}>1 Month</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => calculateDueDate(3)}
            >
              <Text style={styles.durationButtonText}>3 Months</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => calculateDueDate(6)}
            >
              <Text style={styles.durationButtonText}>6 Months</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => calculateDueDate(12)}
            >
              <Text style={styles.durationButtonText}>1 Year</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Due Date Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
          />
          <Text style={styles.helperText}>
            Current due date: {dueDate}
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
            <Text style={styles.summaryLabel}>Due Date:</Text>
            <Text style={styles.summaryValue}>{dueDate}</Text>
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
});

export default AddPaymentScreen;
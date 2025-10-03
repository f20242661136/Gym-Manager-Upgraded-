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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { Client, Payment } from '../types';

const AddPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    dueDate: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await api.getClients();
      setClients(clientsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load clients');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.clientId || !formData.amount || !formData.dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (!selectedClient) {
        Alert.alert('Error', 'Selected client not found');
        return;
      }

      const newPayment: Omit<Payment, 'id'> = {
        clientId: formData.clientId,
        clientName: selectedClient.name,
        amount: parseFloat(formData.amount),
        paymentDate: '', // Will be set when paid
        dueDate: formData.dueDate,
        status: 'Pending',
      };

      await api.addPayment(newPayment);
      Alert.alert('Success', 'Payment added successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add payment');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Payment</Text>
        <Text style={styles.subtitle}>Record a payment for a client</Text>
      </View>

      {/* Payment Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Client *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.clientId}
              onValueChange={(value) => handleInputChange('clientId', value)}
              style={styles.picker}
            >
              <Picker.Item label="Select a client..." value="" />
              {clients.map(client => (
                <Picker.Item key={client.id} label={client.name} value={client.id} />
              ))}
            </Picker>
          </View>
        </View>

        {selectedClient && (
          <View style={styles.clientInfo}>
            <Text style={styles.clientInfoText}>
              Membership: {selectedClient.membershipStatus}
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(value) => handleInputChange('amount', value)}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.dueDate}
            onChangeText={(value) => handleInputChange('dueDate', value)}
            placeholder="YYYY-MM-DD"
          />
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
          <Text style={styles.submitButtonText}>Add Payment</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  clientInfo: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  clientInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
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

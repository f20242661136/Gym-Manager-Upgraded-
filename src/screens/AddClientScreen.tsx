import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { Client } from '../types';

const AddClientScreen: React.FC = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    chest: '',
    waist: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.name || !formData.phone || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const weight = parseFloat(formData.weight) || 0;
      const height = parseFloat(formData.height) || 0;
      const bmi = calculateBMI(weight, height);

      const newClient: Omit<Client, 'id'> = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        weight: weight,
        height: height,
        chest: parseFloat(formData.chest) || 0,
        waist: parseFloat(formData.waist) || 0,
        bmi: bmi,
        photoUrl: '',
        membershipStatus: 'Unpaid',
        registrationDate: new Date().toISOString().split('T')[0],
      };

      await api.addClient(newClient);
      Alert.alert('Success', 'Client added successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add client');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Client</Text>
        <Text style={styles.subtitle}>Enter client information</Text>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter full name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={formData.age}
              onChangeText={(value) => handleInputChange('age', value)}
              placeholder="Age"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={styles.input}
              value={formData.gender}
              onChangeText={(value) => handleInputChange('gender', value)}
              placeholder="Gender"
            />
          </View>
        </View>
      </View>

      {/* Body Measurements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Measurements</Text>
        
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={formData.weight}
              onChangeText={(value) => handleInputChange('weight', value)}
              placeholder="Weight"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.height}
              onChangeText={(value) => handleInputChange('height', value)}
              placeholder="Height"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Chest (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.chest}
              onChangeText={(value) => handleInputChange('chest', value)}
              placeholder="Chest"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Waist (cm)</Text>
            <TextInput
              style={styles.input}
              value={formData.waist}
              onChangeText={(value) => handleInputChange('waist', value)}
              placeholder="Waist"
              keyboardType="numeric"
            />
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
          <Text style={styles.submitButtonText}>Add Client</Text>
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
  row: {
    flexDirection: 'row',
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

export default AddClientScreen;
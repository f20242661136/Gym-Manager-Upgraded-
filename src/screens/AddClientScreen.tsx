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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';
import { Client } from '../types';
import { pickImage, takePhoto } from '../utils/imagePicker';
import { useNetworkStatus } from '../hook/useNetworkStatus';

interface AddClientScreenProps {
  route?: any;
}

const AddClientScreen: React.FC<AddClientScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const isEditing = route?.params?.isEditing;
  const existingClient = route?.params?.client;
  const isConnected = useNetworkStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState(existingClient?.photoUrl || '');
  
  const [formData, setFormData] = useState({
    name: existingClient?.name || '',
    phone: existingClient?.phone || '',
    email: existingClient?.email || '',
    age: existingClient?.age?.toString() || '',
    gender: existingClient?.gender || '',
    weight: existingClient?.weight?.toString() || '',
    height: existingClient?.height?.toString() || '',
    chest: existingClient?.chest?.toString() || '',
    waist: existingClient?.waist?.toString() || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagePick = async () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await takePhoto();
            if (uri) setPhotoUri(uri);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setPhotoUri(uri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const weightNum = parseFloat(formData.weight) || 0;
  const heightNum = parseFloat(formData.height) || 0;
  const bmi = weightNum > 0 && heightNum > 0 ? calculateBMI(weightNum, heightNum).toFixed(1) : '';

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.includes('@')) return 'Please enter a valid email';
    
    const age = parseInt(formData.age);
    if (age && (age < 15 || age > 100)) return 'Please enter a valid age (15-100)';
    
    const weight = parseFloat(formData.weight);
    if (weight && (weight < 30 || weight > 200)) return 'Please enter a valid weight (30-200 kg)';
    
    const height = parseFloat(formData.height);
    if (height && (height < 100 || height > 250)) return 'Please enter a valid height (100-250 cm)';
    
    return null;
  };

  // In handleSubmit function, after validation:
const handleSubmit = async () => {
  const validationError = validateForm();
  if (validationError) {
    Alert.alert('Validation Error', validationError);
    return;
  }

  setIsLoading(true);

  try {
    let finalPhotoUrl = photoUri;

    // Upload image if a new one was selected
    if (photoUri && !photoUri.startsWith('http')) {
      const fileName = `client_${Date.now()}.jpg`;
      finalPhotoUrl = await api.uploadImage(photoUri, fileName);
    }

    const weight = parseFloat(formData.weight) || 0;
    const height = parseFloat(formData.height) || 0;
    const bmi = calculateBMI(weight, height);

    const today = new Date();
    const clientData: Omit<Client, 'id'> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      age: parseInt(formData.age) || 0,
      gender: formData.gender.trim(),
      weight: weight,
      height: height,
      chest: parseFloat(formData.chest) || 0,
      waist: parseFloat(formData.waist) || 0,
      bmi: bmi,
      photoUrl: finalPhotoUrl,
      membershipStatus: existingClient?.membershipStatus || 'Unpaid',
      registrationDate: existingClient?.registrationDate || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      membershipDueDate: existingClient?.membershipDueDate || '',
    };

    if (isEditing && existingClient) {
      await api.updateClient(existingClient.id, { ...clientData, id: existingClient.id }, isConnected);
      Alert.alert('Success', 'Client updated successfully!');
    } else {
      await api.addClient(clientData, isConnected);
      Alert.alert('Success', 'Client added successfully!');
    }
    
    navigation.goBack();
  } catch (error) {
    Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} client`);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <ScrollView style={styles.container}>

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Photo</Text>
        <View style={styles.photoContainer}>
          <TouchableOpacity style={styles.photoButton} onPress={handleImagePick}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.clientPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#6B7280" />
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity 
              style={styles.removePhotoButton}
              onPress={() => setPhotoUri('')}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Rest of the form remains the same... */}
      {/* Personal Information Section */}
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

      {/* Body Measurements Section */}
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

        {bmi ? (
          <View style={styles.bmiContainer}>
            <Text style={styles.bmiLabel}>Calculated BMI:</Text>
            <Text style={styles.bmiValue}>{bmi}</Text>
          </View>
        ) : null}

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
          <Text style={styles.submitButtonText}>
            {isEditing ? 'Update Client' : 'Add Client'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
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
  photoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  clientPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 0,
    right: 80,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  bmiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  bmiLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bmiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366F1',
  },
});

export default AddClientScreen;
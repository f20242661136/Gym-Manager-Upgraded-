import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../services/api';
import { Client } from '../types';

const ClientDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId } = route.params as { clientId: string };

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    try {
      const clientData = await api.getClient(clientId);
      if (clientData) {
        setClient(clientData);
      } else {
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load client details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.centerContainer}>
        <Text>Client not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{client.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: client.membershipStatus === 'Paid' ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{client.membershipStatus}</Text>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{client.name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{client.phone}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{client.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Age:</Text>
          <Text style={styles.infoValue}>{client.age} years</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="male-female" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Gender:</Text>
          <Text style={styles.infoValue}>{client.gender}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time" size={20} color="#6B7280" />
          <Text style={styles.infoLabel}>Joined:</Text>
          <Text style={styles.infoValue}>{client.registrationDate}</Text>
        </View>
      </View>

      {/* Body Measurements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Measurements</Text>

        <View style={styles.measurementGrid}>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Weight</Text>
            <Text style={styles.measurementValue}>{client.weight} kg</Text>
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Height</Text>
            <Text style={styles.measurementValue}>{client.height} cm</Text>
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Chest</Text>
            <Text style={styles.measurementValue}>{client.chest} cm</Text>
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>Waist</Text>
            <Text style={styles.measurementValue}>{client.waist} cm</Text>
          </View>

          <View style={styles.measurementItem}>
            <Text style={styles.measurementLabel}>BMI</Text>
            <Text style={styles.measurementValue}>{client.bmi.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
    minWidth: 60,
  },
  infoValue: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});

export default ClientDetailScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootTabParamList, ClientStackParamList } from '../types/navigation';
import { api } from '../services/api';
import { Client, Payment } from '../types';

const formatMeasurement = (value: number | null | undefined, decimals = 0): string => {
  if (value == null) {
    return '-';
  }

  return decimals > 0 ? value.toFixed(decimals) : String(value);
};

const ClientDetailScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootTabParamList>>();
  const route = useRoute<RouteProp<ClientStackParamList, 'ClientDetail'>>();
  const { clientId } = route.params;

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageUri, setImageUri] = useState<string>(client?.photoUrl || 'https://via.placeholder.com/120x120?text=No+Image');

  const loadClientData = async () => {
    try {
      const [clientData, paymentsData] = await Promise.all([
        api.getClient(clientId),
        api.getPayments(clientId)
      ]);
      
      setClient(clientData || null);
      setPayments(paymentsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  useEffect(() => {
    if (client?.photoUrl) {
      setImageUri(client.photoUrl);
    }
  }, [client]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClientData();
  };

  const handleAddPayment = () => {
    if (client) {
      navigation.navigate('Payments', {
        screen: 'AddPayment',
        params: {
          clientId: client.id,
          clientName: client.name
        }
      });
    }
  };

  const handleEditClient = () => {
    if (client) {
      navigation.navigate('Clients', { 
        screen: 'AddClient', 
        params: { client: client, isEditing: true } 
      });
    }
  };

  const handleDeleteClient = () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteClient(clientId);
              Alert.alert('Success', 'Client deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading client details...</Text>
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
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{client.name}</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Client Image */}
        {client.photoUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.clientImage}
              onError={() => setImageUri('https://via.placeholder.com/120x120?text=No+Image')}
            />
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddPayment}>
            <Ionicons name="card" size={20} color="#6366F1" />
            <Text style={styles.actionButtonText}>Add Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEditClient}>
            <Ionicons name="create" size={20} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDeleteClient}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{client.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{client.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#6B7280" />
            <Text style={styles.infoText}>Joined: {client.registrationDate}</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{client.age} years</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{client.gender}</Text>
            </View>
          </View>
        </View>

        {/* Body Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Measurements</Text>

          <View style={styles.measurementsGrid}>
            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{formatMeasurement(client.weight)} kg</Text>
              <Text style={styles.measurementLabel}>Weight</Text>
            </View>

            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{formatMeasurement(client.height)} cm</Text>
              <Text style={styles.measurementLabel}>Height</Text>
            </View>

            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{formatMeasurement(client.bmi, 1)}</Text>
              <Text style={styles.measurementLabel}>BMI</Text>
            </View>

            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{formatMeasurement(client.chest)} cm</Text>
              <Text style={styles.measurementLabel}>Chest</Text>
            </View>

            <View style={styles.measurementItem}>
              <Text style={styles.measurementValue}>{formatMeasurement(client.waist)} cm</Text>
              <Text style={styles.measurementLabel}>Waist</Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <Text style={styles.paymentCount}>{payments.length} payments</Text>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyPayments}>
              <Ionicons name="card-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No payments yet</Text>
              <Text style={styles.emptySubtext}>
                Record the first payment for this client
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>Rs. {payment.amount}</Text>
                  <Text style={styles.paymentDate}>{payment.paymentDate}</Text>
                </View>
                <View style={[
                  styles.paymentStatus,
                  { backgroundColor: payment.status === 'Paid' ? '#10B981' : '#F59E0B' }
                ]}>
                  <Text style={styles.paymentStatusText}>{payment.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    marginRight: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  imageContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white'
  },
  clientImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB'
  },

  actionButtons: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  paymentCount: {
    fontSize: 14,
    color: '#6B7280'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12
  },
  infoGrid: {
    flexDirection: 'row'
  },
  infoItem: {
    flex: 1
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500'
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  measurementItem: {
    width: '50%',
    padding: 8,
    alignItems: 'center'
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  measurementLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  paymentInfo: {
    flex: 1
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280'
  },
  paymentStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  paymentStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyPayments: {
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default ClientDetailScreen;

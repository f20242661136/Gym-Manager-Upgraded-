import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { PaymentStackParamList } from '../types/navigation';
import { api } from '../services/api';
import { Payment } from '../types/index';

const PaymentsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<PaymentStackParamList>>();
  const route = useRoute<RouteProp<PaymentStackParamList, 'PaymentsList'>>();
  const { clientId, clientName } = route.params || {};
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'due'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const paymentsData = await api.getPayments();
      setPayments(paymentsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const getFilteredPayments = () => {
    let filtered = payments;

    // Filter by client if clientId is provided
    if (clientId) {
      filtered = filtered.filter(payment => payment.clientId === clientId);
    }

    if (filter === 'due') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(payment => payment.dueDate <= today);
    }

    return filtered;
  };

  const PaymentCard: React.FC<{ payment: Payment }> = ({ payment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <Text style={styles.clientName}>{payment.clientName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: payment.status === 'Paid' ? '#10B981' : '#F59E0B' }
        ]}>
          <Text style={styles.statusText}>{payment.status}</Text>
        </View>
      </View>
      
      <View style={styles.paymentBody}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>Rs. {payment.amount}</Text>
          <Text style={styles.currency}>PKR</Text>
        </View>
        
        <View style={styles.datesContainer}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Paid</Text>
            <Text style={styles.dateValue}>{payment.paymentDate}</Text>
          </View>
          
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Due</Text>
            <Text style={[
              styles.dateValue,
              payment.dueDate <= new Date().toISOString().split('T')[0] && styles.overdueDate
            ]}>
              {payment.dueDate}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header for Client Payments */}
      {clientId && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{clientName}'s Payments</Text>
        </View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterButtonText,
            filter === 'all' && styles.filterButtonTextActive
          ]}>
            All Payments
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'due' && styles.filterButtonActive]}
          onPress={() => setFilter('due')}
        >
          <Text style={[
            styles.filterButtonText,
            filter === 'due' && styles.filterButtonTextActive
          ]}>
            Due Payments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments List */}
      <FlatList
        data={getFilteredPayments()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {filter === 'due' ? 'No due payments' : 'No payments recorded'}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === 'due' 
                ? 'All payments are up to date!' 
                : 'Start recording payments to see them here'
              }
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{payments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            Rs. {payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {payments.filter(p => p.status === 'Paid').length}
          </Text>
          <Text style={styles.statLabel}>Paid</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 100,
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currency: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  datesContainer: {
    gap: 8,
  },
  dateItem: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  overdueDate: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default PaymentsScreen;
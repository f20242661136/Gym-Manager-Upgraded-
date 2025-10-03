import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types/navigation';
import { api } from '../services/api';
import { DashboardStats, Client, Payment } from '../types';

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    paidClients: 0,
    unpaidClients: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, clients, payments] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentClients(),
        api.getRecentPayments(),
      ]);
      setStats(dashboardStats);
      setRecentClients(clients);
      setRecentPayments(payments);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#6366F1' }]}>
            <Ionicons name="people" size={24} color="white" />
          </View>
          <Text style={styles.statNumber}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
          </View>
          <Text style={styles.statNumber}>{stats.paidClients}</Text>
          <Text style={styles.statLabel}>Paid Clients</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={24} color="white" />
          </View>
          <Text style={styles.statNumber}>{stats.unpaidClients}</Text>
          <Text style={styles.statLabel}>Unpaid Clients</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Clients', { screen: 'AddClient', params: {} })}>
            <Ionicons name="person-add" size={32} color="#6366F1" />
            <Text style={styles.actionText}>Add Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Payments', { screen: 'PaymentsList', params: {} })}>
            <Ionicons name="card" size={32} color="#10B981" />
            <Text style={styles.actionText}>Record Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications" size={32} color="#F59E0B" />
            <Text style={styles.actionText}>Reminders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentClients.map(client => (
          <TouchableOpacity
            key={client.id}
            style={styles.activityItem}
            onPress={() => navigation.navigate('Clients', { screen: 'ClientDetail', params: { clientId: client.id } })}
          >
            <View style={styles.activityIcon}>
              <Ionicons name="person-add" size={20} color="#10B981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New client registered: {client.name}</Text>
              <Text style={styles.activityTime}>{new Date(client.registrationDate).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {recentPayments.map(payment => (
          <TouchableOpacity
            key={payment.id}
            style={styles.activityItem}
            onPress={() => navigation.navigate('Payments', { screen: 'PaymentsList', params: { clientId: payment.clientId, clientName: payment.clientName } })}
          >
            <View style={styles.activityIcon}>
              <Ionicons name="card" size={20} color="#6366F1" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Payment received from {payment.clientName}</Text>
              <Text style={styles.activityTime}>{new Date(payment.paymentDate).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionItem: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default DashboardScreen;
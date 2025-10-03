import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: Date;
}

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setRefreshing(true);
    try {
      const clients = await api.getClients();
      const now = new Date();
      const notifList: NotificationItem[] = [];

      clients.forEach(client => {
        if (client.membershipDueDate) {
          const dueDate = new Date(client.membershipDueDate);
          if (dueDate < now) {
            notifList.push({
              id: `expired_${client.id}`,
              title: 'Membership Expired',
              body: `${client.name}'s membership has expired. Please renew.`,
              date: dueDate,
            });
          } else {
            const reminderDate3 = new Date(dueDate);
            reminderDate3.setDate(reminderDate3.getDate() - 3);
            if (reminderDate3 > now) {
              notifList.push({
                id: `reminder3_${client.id}`,
                title: 'Membership Expiring Soon',
                body: `${client.name}'s membership expires in 3 days. Consider renewing.`,
                date: reminderDate3,
              });
            }
            const reminderDate1 = new Date(dueDate);
            reminderDate1.setDate(reminderDate1.getDate() - 1);
            if (reminderDate1 > now) {
              notifList.push({
                id: `reminder1_${client.id}`,
                title: 'Membership Expires Tomorrow',
                body: `${client.name}'s membership expires tomorrow. Please renew.`,
                date: reminderDate1,
              });
            }
          }
        }
      });

      notifList.sort((a, b) => b.date.getTime() - a.date.getTime());

      setNotifications(notifList);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadNotifications();
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={styles.notificationItem}>
      <Ionicons name="notifications" size={24} color="#6366F1" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationDescription}>{item.body}</Text>
        <Text style={styles.notificationDate}>{item.date.toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Title provided by navigator - avoid duplicate heading */}
      {notifications.length === 0 ? (
        <Text style={styles.emptyText}>No notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default NotificationsScreen;

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../types';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{client.name}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: client.membershipStatus === 'Paid' ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>{client.membershipStatus}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={16} color="#666" />
          <Text style={styles.infoText}>{client.phone}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={16} color="#666" />
          <Text style={styles.infoText}>{client.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.infoText}>Joined: {client.registrationDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ClientCard;
// Use legacy import for deprecated writeAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../services/api';
import { Client, Payment } from '../types';

import { Platform, Alert } from 'react-native';

let Sharing: any = null;
try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.warn('expo-sharing module not found, sharing disabled');
}

const getDocumentDirectory = () => (FileSystem as any).documentDirectory || '';
const encodingUTF8 = 'utf8';

export interface ExportData {
  clients: Client[];
  payments: Payment[];
  exportDate: string;
}

export const exportDataAsCSV = async (): Promise<void> => {
  try {
    // Fetch all data
    const [clients, payments] = await Promise.all([
      api.getClients(),
      api.getPayments()
    ]);

    const exportData: ExportData = {
      clients,
      payments,
      exportDate: new Date().toISOString()
    };

    // Generate CSV content
    const csvContent = generateCSVContent(exportData);

    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `gym_data_export_${timestamp}.csv`;
    const fileUri = getDocumentDirectory() + fileName;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: encodingUTF8,
    });

    // Share file
    if (Sharing && await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Gym Data',
      });
    } else {
      if (Platform.OS === 'web') {
        Alert.alert('Export Complete', 'File saved to: ' + fileUri);
      } else {
        throw new Error('Sharing is not available on this device');
      }
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

const generateCSVContent = (data: ExportData): string => {
  const lines: string[] = [];

  // Header
  lines.push('Gym Management Data Export');
  lines.push(`Export Date: ${new Date(data.exportDate).toLocaleString()}`);
  lines.push('');

  // Clients section
  lines.push('CLIENTS');
  lines.push('ID,Name,Phone,Email,Age,Gender,Weight (kg),Height (cm),Chest (cm),Waist (cm),BMI,Membership Status,Registration Date,Membership Due Date,Photo URL');

  data.clients.forEach(client => {
    const row = [
      client.id,
      `"${client.name}"`,
      `"${client.phone}"`,
      `"${client.email}"`,
      client.age?.toString() || '',
      `"${client.gender || ''}"`,
      client.weight?.toString() || '',
      client.height?.toString() || '',
      client.chest?.toString() || '',
      client.waist?.toString() || '',
      client.bmi?.toFixed(2) || '',
      `"${client.membershipStatus}"`,
      `"${client.registrationDate}"`,
      `"${client.membershipDueDate || ''}"`,
      `"${client.photoUrl || ''}"`
    ];
    lines.push(row.join(','));
  });

  lines.push('');
  lines.push('');

  // Payments section
  lines.push('PAYMENTS');
  lines.push('ID,Client ID,Amount,Payment Date,Status');

  data.payments.forEach(payment => {
    const row = [
      payment.id,
      payment.clientId,
      payment.amount?.toString() || '',
      `"${payment.paymentDate}"`,
      `"${payment.status}"`
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
};

export const exportDataAsJSON = async (): Promise<void> => {
  try {
    // Fetch all data
    const [clients, payments] = await Promise.all([
      api.getClients(),
      api.getPayments()
    ]);

    const exportData: ExportData = {
      clients,
      payments,
      exportDate: new Date().toISOString()
    };

    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `gym_data_export_${timestamp}.json`;
    const fileUri = getDocumentDirectory() + fileName;

    // Write JSON file
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2), {
      encoding: encodingUTF8,
    });

    // Share file
    if (Sharing && await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Gym Data (JSON)',
      });
    } else {
      if (Platform.OS === 'web') {
        Alert.alert('Export Complete', 'File saved to: ' + fileUri);
      } else {
        throw new Error('Sharing is not available on this device');
      }
    }

  } catch (error) {
    console.error('Error exporting data as JSON:', error);
    throw error;
  }
};

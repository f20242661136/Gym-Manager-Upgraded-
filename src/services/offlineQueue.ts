import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineAction {
  type: string;
  payload: any;
  timestamp: number;
}

class OfflineQueueService {
  private readonly STORAGE_KEY = 'offline_queue';

  async addAction(action: OfflineAction): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push(action);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding action to offline queue:', error);
    }
  }

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  async processQueue(): Promise<void> {
    // This would be implemented to sync offline actions when back online
    // For now, just clear the queue
    await this.clearQueue();
  }
}

export const offlineQueue = new OfflineQueueService();

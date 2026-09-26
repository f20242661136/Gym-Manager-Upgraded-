import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY =
  '@gymmanager/onboarding-complete-v1';

export const onboardingStorage = {
  isComplete: async () =>
    (
      await AsyncStorage.getItem(
        KEY
      )
    ) === '1',

  complete: async () =>
    AsyncStorage.setItem(
      KEY,
      '1'
    ),

  reset: async () =>
    AsyncStorage.removeItem(
      KEY
    ),
};
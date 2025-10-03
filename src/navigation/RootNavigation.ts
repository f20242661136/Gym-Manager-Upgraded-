import { createNavigationContainerRef } from '@react-navigation/native';
import { RootTabParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

export function navigate(name: keyof RootTabParamList, params?: any) {
  if (navigationRef.isReady()) {
    // For tab navigation, navigate accepts the tab name and optionally nested params
    navigationRef.navigate(name as any, params);
  }
}

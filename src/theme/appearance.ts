import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Appearance,
  type ColorSchemeName,
} from 'react-native';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  darkPalette,
  lightPalette,
  type AppPalette,
} from './palette';

export type AppearanceMode =
  | 'system'
  | 'light'
  | 'dark';

const KEY =
  '@gymmanager/appearance-mode';

let currentMode:
  AppearanceMode = 'system';

const listeners =
  new Set<
    (mode: AppearanceMode) => void
  >();

const applyNativeMode = (
  mode: AppearanceMode
) => {
  Appearance.setColorScheme(
    mode === 'system'
      ? null
      : mode
  );
};

export const appearanceStorage = {
  load: async () => {
    const stored =
      await AsyncStorage.getItem(
        KEY
      );

    if (
      stored === 'light' ||
      stored === 'dark' ||
      stored === 'system'
    ) {
      currentMode = stored;
    }

    applyNativeMode(
      currentMode
    );

    listeners.forEach(
      listener =>
        listener(
          currentMode
        )
    );

    return currentMode;
  },

  set: async (
    mode: AppearanceMode
  ) => {
    currentMode = mode;

    applyNativeMode(mode);

    await AsyncStorage.setItem(
      KEY,
      mode
    );

    listeners.forEach(
      listener =>
        listener(mode)
    );
  },

  get: () => currentMode,

  subscribe: (
    listener:
      (mode: AppearanceMode) => void
  ) => {
    listeners.add(listener);

    return () => {
      listeners.delete(
        listener
      );
    };
  },
};

const resolvedFrom = (
  mode: AppearanceMode,
  system:
    ColorSchemeName
): 'light' | 'dark' => {
  if (mode === 'dark') {
    return 'dark';
  }

  if (mode === 'light') {
    return 'light';
  }

  return system === 'dark'
    ? 'dark'
    : 'light';
};

export const currentResolvedScheme =
  (): 'light' | 'dark' =>
    Appearance.getColorScheme() ===
    'dark'
      ? 'dark'
      : 'light';

export const currentPalette =
  (): AppPalette =>
    currentResolvedScheme() ===
    'dark'
      ? darkPalette
      : lightPalette;

export const useAppearanceTheme =
  () => {
    const [
      mode,
      setModeState,
    ] =
      useState<AppearanceMode>(
        appearanceStorage.get()
      );

    const [
      system,
      setSystem,
    ] =
      useState<ColorSchemeName>(
        Appearance.getColorScheme()
      );

    useEffect(() => {
      let mounted = true;

      appearanceStorage
        .load()
        .then(
          loaded => {
            if (mounted) {
              setModeState(
                loaded
              );
              setSystem(
                Appearance
                  .getColorScheme()
              );
            }
          }
        )
        .catch(() => {
          applyNativeMode(
            'system'
          );
        });

      const unsubscribe =
        appearanceStorage
          .subscribe(
            next => {
              if (mounted) {
                setModeState(
                  next
                );
                setSystem(
                  Appearance
                    .getColorScheme()
                );
              }
            }
          );

      const subscription =
        Appearance
          .addChangeListener(
            ({
              colorScheme,
            }) => {
              if (mounted) {
                setSystem(
                  colorScheme
                );
              }
            }
          );

      return () => {
        mounted = false;
        unsubscribe();
        subscription.remove();
      };
    }, []);

    const resolved =
      resolvedFrom(
        mode,
        system
      );

    const colors =
      resolved === 'dark'
        ? darkPalette
        : lightPalette;

    return useMemo(
      () => ({
        mode,
        resolved,
        colors,
        isDark:
          resolved === 'dark',
        setMode:
          appearanceStorage.set,
      }),
      [
        colors,
        mode,
        resolved,
      ]
    );
  };
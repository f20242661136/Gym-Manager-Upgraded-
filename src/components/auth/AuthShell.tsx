import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import {
  useAppearanceTheme,
} from '../../theme/appearance';

export const AuthShell = ({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) => {
  const theme =
    useAppearanceTheme();

  return (
    <KeyboardAvoidingView
      style={[
        styles.page,
        {
          backgroundColor:
            theme.colors.canvas,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <StatusBar
        style={
          theme.isDark
            ? 'light'
            : 'dark'
        }
      />

      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbOne,
          {
            backgroundColor:
              theme.isDark
                ? '#312E81'
                : '#E0E7FF',
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTwo,
          {
            backgroundColor:
              theme.isDark
                ? '#172554'
                : '#DBEAFE',
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          centered &&
            styles.centered,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    overflow: 'hidden',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 34,
  },

  centered: {
    justifyContent: 'center',
  },

  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },

  orbOne: {
    width: 240,
    height: 240,
    top: -90,
    right: -95,
  },

  orbTwo: {
    width: 170,
    height: 170,
    bottom: 20,
    left: -100,
  },
});
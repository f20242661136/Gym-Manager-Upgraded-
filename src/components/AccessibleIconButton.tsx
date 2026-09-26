import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  type ColorValue,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ui } from '../ui/theme';

export const AccessibleIconButton = ({
  icon,
  label,
  hint,
  onPress,
  disabled = false,
  selected = false,
  size = 20,
  color = ui.color.textSecondary,
  style,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  size?: number;
  color?: ColorValue;
  style?: ViewStyle;
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={hint}
    accessibilityState={{
      disabled,
      selected,
    }}
    hitSlop={{
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
    }}
    activeOpacity={0.72}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.button,
      disabled &&
        styles.disabled,
      style,
    ]}
  >
    <Ionicons
      name={icon}
      size={size}
      color={color}
    />
  </TouchableOpacity>
);

const styles = createAdaptiveStyles({
  button: {
    width: ui.touch.min,
    height: ui.touch.min,
    minWidth: ui.touch.min,
    minHeight: ui.touch.min,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabled: {
    opacity: 0.45,
  },
});
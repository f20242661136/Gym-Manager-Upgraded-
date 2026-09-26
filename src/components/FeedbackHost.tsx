import { createAdaptiveStyles } from '../ui/adaptiveStyles';
import React, {
  useEffect,
  useRef,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useFeedback,
  type FeedbackTone,
} from '../contexts/FeedbackContext';
import { useReducedMotion } from '../hook/useReducedMotion';
import { ui } from '../ui/theme';

const toneStyle = (
  tone: FeedbackTone
) => {
  if (tone === 'success') {
    return {
      background:
        ui.color.successSoft,
      border:
        ui.color.successBorder,
      foreground:
        ui.color.success,
      icon:
        'checkmark-circle-outline' as const,
    };
  }

  if (tone === 'warning') {
    return {
      background:
        ui.color.warningSoft,
      border:
        ui.color.warningBorder,
      foreground:
        ui.color.warning,
      icon:
        'alert-circle-outline' as const,
    };
  }

  if (tone === 'danger') {
    return {
      background:
        ui.color.dangerSoft,
      border:
        ui.color.dangerBorder,
      foreground:
        ui.color.danger,
      icon:
        'close-circle-outline' as const,
    };
  }

  return {
    background:
      ui.color.infoSoft,
    border: '#BFDBFE',
    foreground:
      ui.color.info,
    icon:
      'information-circle-outline' as const,
  };
};

export const FeedbackHost:
  React.FC = () => {
  const {
    message,
    dismissFeedback,
  } = useFeedback();

  const insets =
    useSafeAreaInsets();

  const reduceMotion =
    useReducedMotion();

  const translateY =
    useRef(
      new Animated.Value(-90)
    ).current;

  const opacity =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    if (reduceMotion) {
      translateY.setValue(0);
      opacity.setValue(
        message ? 1 : 0
      );
      return;
    }

    if (!message) {
      Animated.parallel([
        Animated.timing(
          translateY,
          {
            toValue: -90,
            duration: 170,
            useNativeDriver: true,
          }
        ),
        Animated.timing(
          opacity,
          {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }
        ),
      ]).start();

      return;
    }

    if (
      message.tone ===
      'success'
    ) {
      Vibration.vibrate(28);
    } else if (
      message.tone === 'danger'
    ) {
      Vibration.vibrate([
        0,
        45,
        55,
        45,
      ]);
    }

    Animated.parallel([
      Animated.spring(
        translateY,
        {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          mass: 0.8,
          useNativeDriver: true,
        }
      ),
      Animated.timing(
        opacity,
        {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }
      ),
    ]).start();
  }, [
    message,
    opacity,
    reduceMotion,
    translateY,
  ]);

  if (!message) {
    return null;
  }

  const colors =
    toneStyle(message.tone);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top:
            insets.top + 8,
          opacity,
          transform: [
            {
              translateY,
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={
          message.title +
          (
            message.detail
              ? '. ' +
                message.detail
              : ''
          )
        }
        accessibilityHint="Dismiss message"
        onPress={dismissFeedback}
        style={[
          styles.card,
          {
            backgroundColor:
              colors.background,
            borderColor:
              colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                colors.foreground,
            },
          ]}
        >
          <Ionicons
            name={colors.icon}
            size={19}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.copy}>
          <Text
            style={[
              styles.title,
              {
                color:
                  colors.foreground,
              },
            ]}
          >
            {message.title}
          </Text>

          {message.detail ? (
            <Text
              style={styles.detail}
            >
              {message.detail}
            </Text>
          ) : null}
        </View>

        <Ionicons
          name="close"
          size={17}
          color={
            ui.color.textMuted
          }
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = createAdaptiveStyles({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 10000,
    elevation: 20,
  },

  card: {
    minHeight: 64,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: ui.color.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  copy: {
    flex: 1,
    paddingRight: 8,
  },

  title: {
    fontSize: 11,
    fontWeight: '900',
  },

  detail: {
    color:
      ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 2,
  },
});
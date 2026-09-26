import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export const BrandMark = ({
  compact = false,
  dark = false,
}: {
  compact?: boolean;
  dark?: boolean;
}) => (
  <View
    accessible
    accessibilityLabel="Gym Manager"
    style={styles.row}
  >
    <View
      style={[
        styles.mark,
        compact &&
          styles.markCompact,
      ]}
    >
      <View
        style={styles.markCore}
      />
    </View>

    {!compact ? (
      <View>
        <Text
          style={[
            styles.name,
            dark &&
              styles.nameDark,
          ]}
        >
          GYM MANAGER
        </Text>
        <Text
          style={[
            styles.caption,
            dark &&
              styles.captionDark,
          ]}
        >
          FRONT DESK - MEMBERS - FEES
        </Text>
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  mark: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      {
        rotate: '8deg',
      },
    ],
  },

  markCompact: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },

  markCore: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    transform: [
      {
        rotate: '37deg',
      },
    ],
  },

  name: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  nameDark: {
    color: '#F8FAFC',
  },

  caption: {
    color: '#64748B',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 2,
  },

  captionDark: {
    color: '#94A3B8',
  },
});
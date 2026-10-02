import { createAdaptiveStyles } from './adaptiveStyles';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type ColorValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ui, shadow } from './theme';

export const SurfaceCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionCopy}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>

    {actionLabel && onAction ? (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onAction}
        style={styles.sectionAction}
      >
        <Text style={styles.sectionActionText}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export type Tone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

const tone = {
  brand: {
    bg: ui.color.brandSoft,
    fg: ui.color.brand,
    border: ui.color.brandBorder,
  },
  success: {
    bg: ui.color.successSoft,
    fg: ui.color.success,
    border: ui.color.successBorder,
  },
  warning: {
    bg: ui.color.warningSoft,
    fg: ui.color.warning,
    border: ui.color.warningBorder,
  },
  danger: {
    bg: ui.color.dangerSoft,
    fg: ui.color.danger,
    border: ui.color.dangerBorder,
  },
  neutral: {
    bg: ui.color.surfaceSubtle,
    fg: ui.color.textSecondary,
    border: ui.color.border,
  },
} satisfies Record<
  Tone,
  {
    bg: ColorValue;
    fg: ColorValue;
    border: ColorValue;
  }
>;

const getTone = () => ({
  ...tone,

  neutral: {
    bg: ui.color.surfaceSubtle,
    fg: ui.color.textSecondary,
    border: ui.color.border,
  },

  brand: {
    bg: ui.color.brandSoft,
    fg: ui.color.brand,
    border: ui.color.brand,
  },

  success: {
    bg: ui.color.surfaceSubtle,
    fg: ui.color.success,
    border: ui.color.success,
  },

  warning: {
    bg: ui.color.surfaceSubtle,
    fg: ui.color.warning,
    border: ui.color.warning,
  },

  danger: {
    bg: ui.color.surfaceSubtle,
    fg: ui.color.danger,
    border: ui.color.danger,
  },
});
export const StatusPill = ({
  label,
  toneName = 'neutral',
}: {
  label: string;
  toneName?: Tone;
}) => {
  const colors = getTone()[toneName];

  return (
    <View accessible accessibilityLabel={'Status: ' + label} style={[styles.pill,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: colors.fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const MetricCard = ({
  icon,
  label,
  value,
  helper,
  toneName = 'brand',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  helper?: string;
  toneName?: Tone;
}) => {
  const colors = getTone()[toneName];

  return (
    <SurfaceCard style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: colors.bg },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={colors.fg}
        />
      </View>

      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text style={styles.metricValue}>
        {value}
      </Text>

      {helper ? (
        <Text style={styles.metricHelper}>
          {helper}
        </Text>
      ) : null}
    </SurfaceCard>
  );
};

export const QuickAction = ({
  icon,
  label,
  helper,
  toneName = 'brand',
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  toneName?: Tone;
  onPress: () => void;
}) => {
  const colors = getTone()[toneName];

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label} accessibilityHint={helper} activeOpacity={0.78}
      onPress={onPress}
      style={styles.quickAction}
    >
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: colors.bg },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={colors.fg}
        />
      </View>

      <Text style={styles.quickLabel}>
        {label}
      </Text>

      {helper ? (
        <Text style={styles.quickHelper}>
          {helper}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

export const EmptyState = ({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons
        name={icon}
        size={22}
        color={ui.color.textMuted}
      />
    </View>
    <Text style={styles.emptyTitle}>
      {title}
    </Text>
    <Text style={styles.emptyBody}>
      {body}
    </Text>
  </View>
);

const styles = createAdaptiveStyles({
  card: {
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    ...shadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ui.space.md,
  },
  sectionCopy: {
    flex: 1,
    paddingRight: ui.space.md,
  },
  sectionTitle: { flexShrink: 1, color: ui.color.text,
    fontSize: ui.type.titleSm,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: ui.color.textSecondary,
    fontSize: ui.type.caption,
    lineHeight: 15,
    marginTop: 3,
  },
  sectionAction: {
    minHeight: ui.touch.min,
    justifyContent: 'center',
    paddingHorizontal: ui.space.sm,
  },
  sectionActionText: {
    color: ui.color.brand,
    fontSize: ui.type.bodySm,
    fontWeight: '900',
  },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: ui.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  metricCard: {
    flex: 1,
    minHeight: 112,
    padding: ui.space.md,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.sm,
  },
  metricLabel: {
    color: ui.color.textSecondary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.65,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: ui.color.text,
    fontSize: ui.type.metric,
    fontWeight: '900',
    marginTop: ui.space.xxs,
  },
  metricHelper: {
    color: ui.color.textMuted,
    fontSize: 9,
    marginTop: ui.space.xxs,
  },
  quickAction: {
    flex: 1,
    minHeight: 116,
    minWidth: '46%',
    backgroundColor: ui.color.surface,
    borderWidth: 1,
    borderColor: ui.color.border,
    borderRadius: ui.radius.lg,
    padding: ui.space.md,
    justifyContent: 'center',
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ui.space.sm,
  },
  quickLabel: {
    color: ui.color.text,
    fontSize: 12,
    fontWeight: '900',
  },
  quickHelper: {
    color: ui.color.textSecondary,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: ui.space.xxl,
    paddingHorizontal: ui.space.lg,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ui.color.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: ui.color.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: ui.space.sm,
  },
  emptyBody: {
    color: ui.color.textSecondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: ui.space.xxs,
  },
});
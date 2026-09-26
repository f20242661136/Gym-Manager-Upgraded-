import {
  Appearance,
} from 'react-native';

import {
  darkPalette,
  lightPalette,
  type AppPalette,
} from '../theme/palette';

const activePalette =
  (): AppPalette =>
    Appearance
      .getColorScheme() ===
    'dark'
      ? darkPalette
      : lightPalette;

export const shadow = {
  shadowColor: '#000000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.10,
  shadowRadius: 8,
  elevation: 2,
} as const;

export const ui = {
  color: {
    get canvas() {
      return activePalette().canvas;
    },
    get surface() {
      return activePalette().surface;
    },
    get surfaceSubtle() {
      return activePalette().surfaceSubtle;
    },
    get surfaceStrong() {
      return activePalette().surfaceStrong;
    },
    get raised() {
      return activePalette().raised;
    },
    get brand() {
      return activePalette().brand;
    },
    get brandStrong() {
      return activePalette().brandStrong;
    },
    get brandSoft() {
      return activePalette().brandSoft;
    },
    get brandBorder() {
      return activePalette().brandBorder;
    },
    get text() {
      return activePalette().text;
    },
    get textSecondary() {
      return activePalette().secondary;
    },
    get textMuted() {
      return activePalette().muted;
    },
    get textOnBrand() {
      return activePalette().textOnBrand;
    },
    get border() {
      return activePalette().border;
    },
    get divider() {
      return activePalette().divider;
    },
    get input() {
      return activePalette().input;
    },
    get inputBorder() {
      return activePalette().inputBorder;
    },
    get success() {
      return activePalette().success;
    },
    get successSoft() {
      return activePalette().successSoft;
    },
    get successBorder() {
      return activePalette().successBorder;
    },
    get warning() {
      return activePalette().warning;
    },
    get warningSoft() {
      return activePalette().warningSoft;
    },
    get warningBorder() {
      return activePalette().warningBorder;
    },
    get danger() {
      return activePalette().danger;
    },
    get dangerSoft() {
      return activePalette().dangerSoft;
    },
    get dangerBorder() {
      return activePalette().dangerBorder;
    },
    get info() {
      return activePalette().info;
    },
    get infoSoft() {
      return activePalette().infoSoft;
    },
    get infoBorder() {
      return activePalette().infoBorder;
    },
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },

  space: {
    xxs: 4,
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  type: {
    eyebrow: 9,
    caption: 10,
    bodySm: 11,
    body: 13,
    titleSm: 15,
    title: 18,
    page: 26,
    metric: 24,
  },

  touch: {
    min: 48,
  },

  shadow,
} as const;
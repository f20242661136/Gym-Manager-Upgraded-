export interface AppPalette {
  canvas: string;
  surface: string;
  surfaceSubtle: string;
  raised: string;
  surfaceStrong: string;

  brand: string;
  brandStrong: string;
  brandSoft: string;
  brandBorder: string;

  text: string;
  secondary: string;
  muted: string;
  textOnBrand: string;

  border: string;
  divider: string;

  input: string;
  inputBorder: string;

  success: string;
  successSoft: string;
  successBorder: string;

  warning: string;
  warningSoft: string;
  warningBorder: string;

  danger: string;
  dangerSoft: string;
  dangerBorder: string;

  info: string;
  infoSoft: string;
  infoBorder: string;
}

export const lightPalette:
  AppPalette = {
  canvas: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  raised: '#FFFFFF',
  surfaceStrong: '#EEF2FF',

  brand: '#4F46E5',
  brandStrong: '#312E81',
  brandSoft: '#EEF2FF',
  brandBorder: '#C7D2FE',

  text: '#111827',
  secondary: '#64748B',
  muted: '#94A3B8',
  textOnBrand: '#FFFFFF',

  border: '#E2E8F0',
  divider: '#EEF2F7',

  input: '#FFFFFF',
  inputBorder: '#CBD5E1',

  success: '#15803D',
  successSoft: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#B45309',
  warningSoft: '#FFFBEB',
  warningBorder: '#FDE68A',

  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#2563EB',
  infoSoft: '#EFF6FF',
  infoBorder: '#BFDBFE',
};

export const darkPalette:
  AppPalette = {
  canvas: '#0B1020',
  surface: '#121A2B',
  surfaceSubtle: '#0F172A',
  raised: '#182236',
  surfaceStrong: '#1E293B',

  brand: '#818CF8',
  brandStrong: '#4F46E5',
  brandSoft: '#1E1B4B',
  brandBorder: '#4338CA',

  text: '#F8FAFC',
  secondary: '#CBD5E1',
  muted: '#94A3B8',
  textOnBrand: '#FFFFFF',

  border: '#2A3850',
  divider: '#1F2A3D',

  input: '#121A2B',
  inputBorder: '#3A4961',

  success: '#4ADE80',
  successSoft: '#123522',
  successBorder: '#166534',

  warning: '#FBBF24',
  warningSoft: '#3B2A0A',
  warningBorder: '#92400E',

  danger: '#F87171',
  dangerSoft: '#3B151A',
  dangerBorder: '#991B1B',

  info: '#60A5FA',
  infoSoft: '#102A4C',
  infoBorder: '#1D4ED8',
};

export const paletteFor = (
  scheme: 'light' | 'dark'
): AppPalette =>
  scheme === 'dark'
    ? darkPalette
    : lightPalette;
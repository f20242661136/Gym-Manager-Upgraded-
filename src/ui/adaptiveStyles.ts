import {
  Appearance,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  darkPalette,
  lightPalette,
  type AppPalette,
} from '../theme/palette';

type NamedStyles<T> = {
  [P in keyof T]:
    | ViewStyle
    | TextStyle
    | ImageStyle;
};

const normalize =
  (value: string) =>
    value
      .trim()
      .toLowerCase();

const same =
  (
    left: string,
    right: string
  ) =>
    normalize(left) ===
    normalize(right);

const paletteNow =
  (): AppPalette =>
    Appearance
      .getColorScheme() ===
    'dark'
      ? darkPalette
      : lightPalette;

const tokenFor = (
  value: string,
  tokens:
    (keyof AppPalette)[]
):
  keyof AppPalette | null => {
  for (
    const token
    of tokens
  ) {
    if (
      same(
        value,
        lightPalette[token]
      ) ||
      same(
        value,
        darkPalette[token]
      )
    ) {
      return token;
    }
  }

  return null;
};

const backgroundLegacy:
  Record<
    string,
    keyof AppPalette
  > = {
  '#f7f8fc': 'canvas',
  '#f8fafc': 'canvas',
  '#f9fafb': 'canvas',
  '#f5f5f5': 'canvas',
  '#ffffff': 'surface',
  'white': 'surface',
  '#f1f5f9': 'surfaceSubtle',
  '#f3f4f6': 'surfaceSubtle',
  '#eef2ff': 'brandSoft',
  '#f5f3ff': 'brandSoft',
  '#ecfdf5': 'successSoft',
  '#fffbeb': 'warningSoft',
  '#fff7ed': 'warningSoft',
  '#fef2f2': 'dangerSoft',
  '#eff6ff': 'infoSoft',
  '#312e81': 'brandStrong',
  '#4338ca': 'brand',
  '#4f46e5': 'brand',
  '#6366f1': 'brand',
};

const textLegacy:
  Record<
    string,
    keyof AppPalette
  > = {
  '#0f172a': 'text',
  '#111827': 'text',
  '#1f2937': 'text',
  '#334155': 'secondary',
  '#374151': 'secondary',
  '#475569': 'secondary',
  '#4b5563': 'secondary',
  '#64748b': 'secondary',
  '#6b7280': 'secondary',
  '#94a3b8': 'muted',
  '#9ca3af': 'muted',
  '#312e81': 'brand',
  '#4338ca': 'brand',
  '#4f46e5': 'brand',
  '#6366f1': 'brand',
  '#047857': 'success',
  '#10b981': 'success',
  '#15803d': 'success',
  '#b45309': 'warning',
  '#f59e0b': 'warning',
  '#b91c1c': 'danger',
  '#ef4444': 'danger',
  '#2563eb': 'info',
  '#3b82f6': 'info',
};

const borderLegacy:
  Record<
    string,
    keyof AppPalette
  > = {
  '#e2e8f0': 'border',
  '#e5e7eb': 'border',
  '#d1d5db': 'inputBorder',
  '#cbd5e1': 'inputBorder',
  '#c7d2fe': 'brandBorder',
  '#a7f3d0': 'successBorder',
  '#fde68a': 'warningBorder',
  '#fecaca': 'dangerBorder',
  '#bfdbfe': 'infoBorder',
};

const backgroundTokens:
  (keyof AppPalette)[] = [
  'canvas',
  'surface',
  'surfaceSubtle',
  'raised',
  'surfaceStrong',
  'brand',
  'brandStrong',
  'brandSoft',
  'successSoft',
  'warningSoft',
  'dangerSoft',
  'infoSoft',
];

const textTokens:
  (keyof AppPalette)[] = [
  'text',
  'secondary',
  'muted',
  'brand',
  'brandStrong',
  'success',
  'warning',
  'danger',
  'info',
];

const borderTokens:
  (keyof AppPalette)[] = [
  'border',
  'divider',
  'inputBorder',
  'brandBorder',
  'successBorder',
  'warningBorder',
  'dangerBorder',
  'infoBorder',
];

const adaptColor = (
  property: string,
  value: string
): string => {
  const palette =
    paletteNow();

  const lower =
    normalize(value);

  if (
    property ===
    'shadowColor'
  ) {
    return value;
  }

  if (
    property === 'color' ||
    property === 'tintColor' ||
    property ===
      'textDecorationColor'
  ) {
    if (
      lower === '#fff' ||
      lower === '#ffffff' ||
      lower === 'white'
    ) {
      return '#FFFFFF';
    }

    const token =
      tokenFor(
        value,
        textTokens
      ) ||
      textLegacy[lower];

    return token
      ? palette[token]
      : value;
  }

  if (
    property ===
      'backgroundColor' ||
    property ===
      'overlayColor'
  ) {
    const token =
      tokenFor(
        value,
        backgroundTokens
      ) ||
      backgroundLegacy[
        lower
      ];

    return token
      ? palette[token]
      : value;
  }

  if (
    property
      .toLowerCase()
      .includes('border') &&
    property
      .toLowerCase()
      .endsWith('color')
  ) {
    const token =
      tokenFor(
        value,
        borderTokens
      ) ||
      borderLegacy[lower];

    return token
      ? palette[token]
      : value;
  }

  return value;
};

const adaptNode = (
  value: unknown,
  property:
    string | null = null
): unknown => {
  if (
    typeof value ===
      'string' &&
    property
  ) {
    return adaptColor(
      property,
      value
    );
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      item =>
        adaptNode(
          item,
          property
        )
    );
  }

  if (
    value &&
    typeof value ===
      'object'
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const output:
      Record<
        string,
        unknown
      > = {};

    for (
      const [
        key,
        item,
      ] of Object.entries(
        source
      )
    ) {
      output[key] =
        adaptNode(
          item,
          key
        );
    }

    return output;
  }

  return value;
};

export function createAdaptiveStyles<
  T extends
    NamedStyles<T> |
    NamedStyles<any>
>(
  source:
    T & NamedStyles<any>
): T {
  return new Proxy(
    source as T,
    {
      get(
        target,
        property,
        receiver
      ) {
        const raw =
          Reflect.get(
            target,
            property,
            receiver
          );

        return adaptNode(
          raw
        );
      },
    }
  ) as T;
}
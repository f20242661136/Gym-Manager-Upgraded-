import {
  PixelRatio,
  useWindowDimensions,
} from 'react-native';

export type DeviceLayoutClass =
  | 'compact'
  | 'regular'
  | 'wide';

export const useResponsiveProfile = () => {
  const {
    width,
    height,
    fontScale: dimensionFontScale,
  } = useWindowDimensions();

  const fontScale =
    dimensionFontScale ||
    PixelRatio.getFontScale() ||
    1;

  const layoutClass:
    DeviceLayoutClass =
      width < 390
        ? 'compact'
        : width >= 720
          ? 'wide'
          : 'regular';

  return {
    width,
    height,
    fontScale,
    layoutClass,
    isCompact:
      layoutClass === 'compact',
    isWide:
      layoutClass === 'wide',
    hasLargeText:
      fontScale >= 1.2,
    shouldStackColumns:
      width < 390 ||
      fontScale >= 1.25,
  };
};
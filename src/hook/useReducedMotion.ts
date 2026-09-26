import {
  AccessibilityInfo,
} from 'react-native';
import {
  useEffect,
  useState,
} from 'react';

export const useReducedMotion = () => {
  const [reduced, setReduced] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo
      .isReduceMotionEnabled()
      .then(value => {
        if (mounted) {
          setReduced(Boolean(value));
        }
      })
      .catch(() => {});

    const subscription =
      AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        value => {
          setReduced(Boolean(value));
        }
      );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduced;
};
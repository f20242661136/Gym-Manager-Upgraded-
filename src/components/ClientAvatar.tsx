import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppearanceTheme } from '../theme/appearance';

type ClientAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
};

const getInitials = (
  name?: string | null
) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'M';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
};

const ClientAvatar: React.FC<
  ClientAvatarProps
> = ({
  name,
  photoUrl,
  size = 48,
}) => {
  const theme =
    useAppearanceTheme();

  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const validPhoto =
    useMemo(() => {
      const value =
        photoUrl?.trim();

      return value
        ? value
        : null;
    }, [photoUrl]);

  const radius =
    Math.round(size / 2);

  if (
    validPhoto &&
    !imageFailed
  ) {
    return (
      <Image
        source={{
          uri: validPhoto,
        }}
        resizeMode="cover"
        accessibilityLabel={
          name
            ? `${name} profile photo`
            : 'Member profile photo'
        }
        onError={() =>
          setImageFailed(true)
        }
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor:
            theme.colors.surfaceSubtle,
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel={
        name
          ? `${name} profile placeholder`
          : 'Member profile placeholder'
      }
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor:
            theme.colors.brandSoft,
          borderColor:
            theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color:
              theme.colors.brand,
            fontSize:
              Math.max(
                12,
                Math.round(
                  size * 0.32
                )
              ),
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles =
  StyleSheet.create({
    fallback: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      overflow: 'hidden',
    },

    initials: {
      fontWeight: '900',
    },
  });

export default ClientAvatar;
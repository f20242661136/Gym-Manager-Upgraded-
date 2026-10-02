import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ui } from '../ui/theme';

type ClientAvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
};

const getInitials = (name?: string | null): string => {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'M';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const ClientAvatar: React.FC<ClientAvatarProps> = ({
  name,
  photoUrl,
  size = 48,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const uri = useMemo(() => {
    const value = photoUrl?.trim();
    return value || null;
  }, [photoUrl]);

  const radius = size / 2;

  if (uri && !imageFailed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
        accessibilityLabel={
          name ? `${name} profile photo` : 'Member profile photo'
        }
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: ui.color.surfaceSubtle,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: ui.color.brandSoft,
          borderColor: ui.color.border,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: ui.color.brand,
            fontSize: Math.max(12, Math.round(size * 0.31)),
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },

  initials: {
    fontWeight: '900',
  },
});

export default ClientAvatar;
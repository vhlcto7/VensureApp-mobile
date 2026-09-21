import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';

type InsurerLogoProps = {
  name: string;
  logoUrl?: string;
  size?: number;
};

export function InsurerLogo({ name, logoUrl, size = 56 }: InsurerLogoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  const initial = name.trim().slice(0, 1).toUpperCase() || 'I';

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (showImage && logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        accessibilityLabel={`${name} logo`}
        style={[styles.logo, { width: size, height: size, borderRadius: Math.round(size / 5) }]}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: Math.round(size / 5) },
      ]}
    >
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  fallback: {
    backgroundColor: colors.sky50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.heading,
    color: colors.sky700,
  },
});

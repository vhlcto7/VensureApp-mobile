import {
  Image,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontFamily } from '../theme';

type BrandLogoProps = {
  height?: number;
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LOGO = require('../../assets/logo/vensure-logo.png');
const SOURCE = Image.resolveAssetSource(LOGO);
const LOGO_ASPECT = SOURCE?.width && SOURCE?.height ? SOURCE.width / SOURCE.height : 4.3;

export function BrandLogo({ height = 48, onDark = false, style }: BrandLogoProps) {
  const displayHeight = PixelRatio.roundToNearestPixel(height);
  const displayWidth = PixelRatio.roundToNearestPixel(displayHeight * LOGO_ASPECT);
  const taglineSize = Math.max(12, Math.round(displayHeight * 0.22));
  const palette = onDark ? darkTagline : lightTagline;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="VenSure. Click, Compare, Cover"
      style={[styles.wrap, style]}
    >
      <Image
        source={LOGO}
        accessible={false}
        resizeMode="contain"
        fadeDuration={0}
        {...(Platform.OS === 'android' ? { resizeMethod: 'resize' as const } : {})}
        style={{ width: displayWidth, height: displayHeight }}
      />
      <Text
        accessible={false}
        numberOfLines={1}
        style={[
          styles.tagline,
          onDark ? styles.taglineOnDark : null,
          {
            width: displayWidth,
            fontSize: taglineSize,
            lineHeight: taglineSize + 3,
            letterSpacing: displayHeight >= 48 ? 0.6 : 0.3,
          },
        ]}
      >
        <Text style={{ color: palette.click }}>Click</Text>
        <Text style={{ color: palette.separator }}> | </Text>
        <Text style={{ color: palette.compare }}>Compare</Text>
        <Text style={{ color: palette.separator }}> | </Text>
        <Text style={{ color: palette.cover }}>Cover</Text>
      </Text>
    </View>
  );
}

const lightTagline = {
  click: colors.sky700,
  compare: colors.slate700,
  cover: colors.accentGreen,
  separator: colors.slate400,
};

const darkTagline = {
  click: colors.sky300,
  compare: colors.white,
  cover: colors.accentGreen,
  separator: 'rgba(255,255,255,0.78)',
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tagline: {
    fontFamily,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  taglineOnDark: {
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

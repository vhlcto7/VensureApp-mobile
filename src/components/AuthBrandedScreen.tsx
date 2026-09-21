import type { ReactNode } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from './BrandLogo';
import { colors, spacing, typography } from '../theme';

type AuthBrandedScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  heroRatio?: number;
};

export function AuthBrandedScreen({
  title,
  subtitle,
  children,
  footer,
  heroRatio = 0.28,
}: AuthBrandedScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const heroHeight = Math.max(compact ? 168 : 188, Math.round(height * heroRatio));

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ImageBackground
            source={require('../../assets/images/login-background.png')}
            accessibilityLabel="VenSure insurance coverage for every journey"
            resizeMode="cover"
            style={[styles.hero, { height: heroHeight }]}
          >
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.58)',
                'rgba(255, 255, 255, 0.18)',
                'rgba(255, 255, 255, 0)',
              ]}
              locations={[0, 0.46, 1]}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.45 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <SafeAreaView edges={['top']} style={styles.heroSafe}>
              <View style={styles.heroTop}>
                <BrandLogo height={compact ? 48 : 56} style={styles.logo} />
                <View style={styles.country} accessibilityLabel="Zambia">
                  <Text style={styles.countryText}>Zambia</Text>
                  <Text style={styles.flag}>🇿🇲</Text>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>

          <View
            style={[
              styles.panel,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
            ]}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.white,
  },
  hero: {
    width: '100%',
    overflow: 'hidden',
  },
  heroSafe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 48,
    justifyContent: 'flex-start',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    alignItems: 'flex-start',
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryText: {
    ...typography.label,
    fontSize: 13,
    color: colors.slate700,
  },
  flag: {
    fontSize: 16,
  },
  panel: {
    flexGrow: 1,
    marginTop: -40,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.slate900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate600,
    marginBottom: spacing.xl,
  },
});

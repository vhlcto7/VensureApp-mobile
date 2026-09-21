import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo, Button } from '../../components';
import type { AuthStackScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type WelcomeScreenProps = AuthStackScreenProps<'Welcome'>;

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const headingSize = Math.min(44, Math.max(34, width * 0.108));

  return (
    <View style={styles.root}>
      <Image
        source={require('../../../assets/images/home-hero.png')}
        accessibilityLabel="VenSure customers comparing insurance on a phone"
        resizeMode="cover"
        style={styles.heroImage}
      />
      <LinearGradient
        colors={[
          'rgba(3, 15, 38, 0.88)',
          'rgba(6, 29, 68, 0.42)',
          'rgba(9, 42, 86, 0.18)',
          'rgba(3, 15, 38, 0.82)',
        ]}
        locations={[0, 0.32, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.top}>
          <BrandLogo height={56} onDark style={styles.logo} />
        </View>

        <View style={styles.copy}>
          <Text style={[styles.heading, { fontSize: headingSize, lineHeight: headingSize + 2 }]}>
            Compare.{'\n'}Choose.{'\n'}Cover.
          </Text>
          <Text style={styles.subtitle}>
            Get the best insurance quotes from trusted insurers in minutes.
          </Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>Quick</Text>
            <View style={styles.dot} />
            <Text style={styles.trustLabel}>Easy</Text>
            <View style={styles.dot} />
            <Text style={styles.trustLabel}>Reliable</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Get Quote Now"
            variant="cta"
            onPress={() => navigation.navigate('MotorQuote')}
          />
          <Button
            label="Sign In"
            variant="onDark"
            onPress={() => navigation.navigate('Login')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create Account"
            hitSlop={12}
            onPress={() => navigation.navigate('SignUp')}
            style={styles.createAccount}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.heroNavy,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '155%',
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  logo: {
    alignItems: 'flex-start',
  },
  copy: {
    maxWidth: 420,
    gap: spacing.lg,
  },
  heading: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1.6,
    color: colors.white,
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.86)',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  trustLabel: {
    ...typography.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentGreen,
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  createAccount: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    ...typography.button,
    color: colors.white,
  },
});

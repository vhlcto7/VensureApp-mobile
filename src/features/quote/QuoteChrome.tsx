import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';
import { MOTOR_STEPS, type MotorStep } from './types';

type QuoteChromeProps = {
  currentStep?: MotorStep;
  title?: string;
  subtitle?: string;
  showStepper?: boolean;
  hideCopy?: boolean;
  onBack: () => void;
};

const V_MARK = require('../../../assets/logo/vensure-mark.png');

export function QuoteChrome({
  currentStep = 'lookup',
  title = 'Get Motor Insurance Quote',
  subtitle = 'Confirm the vehicle first, then select vehicle use, cover type, and only the customer inputs needed for rating.',
  showStepper = true,
  hideCopy = false,
  onBack,
}: QuoteChromeProps) {
  const index = Math.max(0, MOTOR_STEPS.findIndex((step) => step.id === currentStep));
  const current = MOTOR_STEPS[index];

  return (
    <>
      <View pointerEvents="none" accessibilityElementsHidden style={styles.backdrop}>
        <Image
          source={V_MARK}
          resizeMode="contain"
          fadeDuration={0}
          style={styles.mark}
        />
      </View>
      <SafeAreaView edges={['top']} style={[styles.safe, hideCopy ? styles.safeCompact : null]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={12} style={styles.back}>
            <Ionicons name="chevron-back" size={20} color={colors.primaryCta} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
        {hideCopy ? null : <Text style={styles.title}>{title}</Text>}
        {hideCopy || !subtitle ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
        {showStepper ? (
          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>
              Step {index + 1} of {MOTOR_STEPS.length}: {current?.label}
            </Text>
            <View style={styles.bars}>
              {MOTOR_STEPS.map((step, stepIndex) => (
                <View
                  key={step.id}
                  style={[
                    styles.bar,
                    stepIndex < index ? styles.barDone : null,
                    stepIndex === index ? styles.barActive : null,
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
    top: 28,
    right: -48,
    width: 260,
    height: 260,
    opacity: 0.14,
  },
  safe: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    zIndex: 1,
  },
  safeCompact: {
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  back: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.slate900,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  stepCard: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: colors.slate50,
    gap: spacing.sm,
  },
  stepLabel: {
    ...typography.label,
    color: colors.slate700,
  },
  bars: {
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.slate200,
  },
  barActive: {
    backgroundColor: colors.primaryCta,
  },
  barDone: {
    backgroundColor: colors.brandGreen,
  },
});

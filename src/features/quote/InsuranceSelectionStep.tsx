import { useEffect, useMemo, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';
import type { CustomerVehicleRecord } from '../../services/vehicles';
import { joinMeta } from '../customer-lists/helpers';
import { displayVehicleRegistration } from '../vehicles/helpers';
import { InsurerLogo } from './InsurerLogo';

const MOTOR_BENEFITS = ['RTSA Vehicle Lookup', 'Compare Insurers', 'Buy Online'] as const;

const COMING_SOON_PRODUCTS = [
  {
    id: 'medical',
    title: 'Medical Insurance',
    description: 'Health cover for you and your family.',
    icon: 'heart-outline' as const,
  },
  {
    id: 'travel',
    title: 'Travel Insurance',
    description: 'Trip cover for work and family travel.',
    icon: 'airplane-outline' as const,
  },
] as const;

type InsuranceSelectionStepProps = {
  vehicles: CustomerVehicleRecord[];
  vehiclesLoading: boolean;
  vehiclesError: string;
  canOpenVehicles: boolean;
  quoteFromVehicleLoading?: boolean;
  insurers?: Array<{ id: string; name: string; logoUrl?: string }>;
  insurersLoading?: boolean;
  onStartMotorQuote: () => void;
  onQuoteSavedVehicle: (vehicleId: string) => void;
  onRetryVehicles: () => void;
  onViewAllVehicles: () => void;
};

function vehicleSubtitle(vehicle: CustomerVehicleRecord) {
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return joinMeta([makeModel || undefined, vehicle.year]);
}

function compactText(value?: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '');
}

const INSURER_CARD_WIDTH = 124;
const INSURER_CARD_STEP = INSURER_CARD_WIDTH + spacing.sm;
const INSURER_MS_PER_CARD = 2600;

type QuoteInsurerCard = { id: string; name: string; logoUrl?: string };

function InsurerAutoCarousel({ insurers }: { insurers: QuoteInsurerCard[] }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pausedRef = useRef(false);
  const runFromRef = useRef<(fromOffset: number) => void>(() => undefined);
  const [reduceMotion, setReduceMotion] = useState(false);

  const loopWidth = insurers.length * INSURER_CARD_STEP;
  const loopedInsurers = insurers.length > 1 ? [...insurers, ...insurers] : insurers;
  const canAnimate = insurers.length > 1 && loopWidth > 0 && !reduceMotion;

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const runFrom = (fromOffset: number) => {
      if (!canAnimate) {
        return;
      }
      const wrapped = ((fromOffset % loopWidth) + loopWidth) % loopWidth;
      translateX.setValue(-wrapped);
      animationRef.current = Animated.timing(translateX, {
        toValue: -loopWidth,
        duration: Math.max(400, ((loopWidth - wrapped) / loopWidth) * insurers.length * INSURER_MS_PER_CARD),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animationRef.current.start(({ finished }) => {
        if (!finished || pausedRef.current) {
          return;
        }
        runFrom(0);
      });
    };

    runFromRef.current = runFrom;
    pausedRef.current = false;
    animationRef.current?.stop();
    animationRef.current = null;
    translateX.setValue(0);
    runFrom(0);

    return () => {
      pausedRef.current = true;
      animationRef.current?.stop();
      animationRef.current = null;
    };
  }, [canAnimate, insurers.length, loopWidth, translateX]);

  const pause = () => {
    if (!canAnimate || pausedRef.current) {
      return;
    }
    pausedRef.current = true;
    translateX.stopAnimation();
    animationRef.current = null;
  };

  const resume = () => {
    if (!canAnimate || !pausedRef.current) {
      return;
    }
    translateX.stopAnimation((value) => {
      pausedRef.current = false;
      runFromRef.current(((-value % loopWidth) + loopWidth) % loopWidth);
    });
  };

  return (
    <View
      style={styles.insurerViewport}
      onTouchStart={pause}
      onTouchEnd={resume}
      onTouchCancel={resume}
    >
      <Animated.View
        style={[
          styles.insurerTrack,
          canAnimate ? { width: loopWidth * 2, transform: [{ translateX }] } : null,
        ]}
      >
        {loopedInsurers.map((company, index) => (
          <View
            key={`${company.id}-${index}`}
            style={styles.insurerCard}
            accessibilityLabel={company.name}
          >
            <InsurerLogo name={company.name} logoUrl={company.logoUrl} size={56} />
            <Text numberOfLines={2} style={styles.insurerName}>
              {company.name}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function vehicleMatchesQuery(vehicle: CustomerVehicleRecord, query: string) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const registration = displayVehicleRegistration(vehicle.registrationNumber);
  const subtitle = vehicleSubtitle(vehicle);
  const haystack = [registration, vehicle.make, vehicle.model, vehicle.year, subtitle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(trimmed) || compactText(registration).includes(compactText(trimmed));
}

export function InsuranceSelectionStep({
  vehicles,
  vehiclesLoading,
  vehiclesError,
  canOpenVehicles,
  quoteFromVehicleLoading,
  insurers = [],
  insurersLoading = false,
  onStartMotorQuote,
  onQuoteSavedVehicle,
  onRetryVehicles,
  onViewAllVehicles,
}: InsuranceSelectionStepProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const showVehicles = vehicles.length > 0;
  const showViewAll = showVehicles && canOpenVehicles;
  const matchingVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicleMatchesQuery(vehicle, vehicleQuery)),
    [vehicleQuery, vehicles],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.eyebrow}>Get insured</Text>
      <Text style={styles.title}>Choose your insurance</Text>
      <Text style={styles.subtitle}>Select a cover and we'll guide you through the rest.</Text>

      <View style={styles.heroWrap}>
        <LinearGradient colors={['#dbeafe', '#eff6ff', '#ffffff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon} accessibilityElementsHidden>
              <Ionicons name="car-sport" size={22} color={colors.primaryCta} />
            </View>
            <View style={styles.availablePill}>
              <Text style={styles.availableText}>Available</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Motor Third Party Insurance</Text>
          <Text style={styles.heroCopy}>Quick motor cover from trusted insurers.</Text>
          <View style={styles.benefits}>
            {MOTOR_BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
                <Text style={styles.benefit}>{benefit}</Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get Motor Third Party Quote"
            onPress={onStartMotorQuote}
            style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}
          >
            <Text style={styles.ctaLabel}>Get Motor Third Party Quote</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </Pressable>
        </LinearGradient>
      </View>

      {showVehicles ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Your vehicles</Text>
          <Text style={styles.sectionCopy}>Choose a saved vehicle to get a quote faster.</Text>
          <View style={styles.dropdown}>
            <View style={styles.dropdownTrigger}>
              <View style={styles.vehicleIcon}>
                <Ionicons name="car-outline" size={18} color={colors.sky700} />
              </View>
              <TextInput
                value={vehicleQuery}
                editable={!quoteFromVehicleLoading}
                placeholder="Search or select a vehicle"
                placeholderTextColor={colors.slate400}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Choose a saved vehicle"
                accessibilityState={{ expanded: pickerOpen, disabled: quoteFromVehicleLoading }}
                onFocus={() => setPickerOpen(true)}
                onChangeText={(value) => {
                  setVehicleQuery(value);
                  setPickerOpen(true);
                }}
                style={styles.dropdownInput}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={pickerOpen ? 'Hide saved vehicles' : 'Show saved vehicles'}
                hitSlop={8}
                disabled={quoteFromVehicleLoading}
                onPress={() => setPickerOpen((open) => !open)}
                style={styles.dropdownChevron}
              >
                <Ionicons
                  name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.slate500}
                />
              </Pressable>
            </View>
            {pickerOpen
              ? matchingVehicles.map((vehicle) => {
                  const subtitle = vehicleSubtitle(vehicle);
                  return (
                    <Pressable
                      key={vehicle.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Quote for ${displayVehicleRegistration(vehicle.registrationNumber)}`}
                      disabled={quoteFromVehicleLoading}
                      onPress={() => onQuoteSavedVehicle(vehicle.id)}
                      style={({ pressed }) => [styles.dropdownOption, pressed ? styles.pressed : null]}
                    >
                      <View style={styles.vehicleCopy}>
                        <Text style={styles.vehicleReg}>
                          {displayVehicleRegistration(vehicle.registrationNumber)}
                        </Text>
                        {subtitle ? (
                          <Text numberOfLines={1} style={styles.vehicleMeta}>
                            {subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.quoteChipLabel}>Quote</Text>
                    </Pressable>
                  );
                })
              : null}
            {pickerOpen && matchingVehicles.length === 0 ? (
              <Text style={styles.dropdownEmpty}>No matching vehicles</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Insure another vehicle"
            onPress={onStartMotorQuote}
            style={styles.anotherVehicle}
          >
            <Ionicons name="add" size={18} color={colors.primaryCta} />
            <Text style={styles.anotherVehicleLabel}>Insure Another Vehicle</Text>
          </Pressable>
          {showViewAll ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View all vehicles"
              onPress={onViewAllVehicles}
              style={styles.viewAll}
            >
              <Text style={styles.viewAllLabel}>View All Vehicles</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {vehiclesLoading && !showVehicles ? (
        <View style={styles.vehicleStatus} accessibilityLabel="Loading saved vehicles">
          <ActivityIndicator size="small" color={colors.primaryCta} />
          <Text style={styles.vehicleStatusText}>Checking saved vehicles…</Text>
        </View>
      ) : null}

      {vehiclesError && !showVehicles ? (
        <View style={styles.vehicleStatus}>
          <Text style={styles.vehicleStatusText}>{vehiclesError}</Text>
          <Pressable accessibilityRole="button" onPress={onRetryVehicles} hitSlop={8}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>More insurance products</Text>
        {COMING_SOON_PRODUCTS.map((product) => (
          <View
            key={product.id}
            accessible
            accessibilityLabel={`${product.title}, Coming Soon`}
            style={styles.soonCard}
          >
            <View style={styles.soonIcon}>
              <Ionicons name={product.icon} size={18} color={colors.slate500} />
            </View>
            <View style={styles.soonCopy}>
              <Text style={styles.soonTitle}>{product.title}</Text>
              <Text style={styles.soonDescription}>{product.description}</Text>
            </View>
            <View style={styles.soonPill}>
              <Text style={styles.soonPillLabel}>Coming Soon</Text>
            </View>
          </View>
        ))}
      </View>

      {insurersLoading && insurers.length === 0 ? (
        <View style={styles.insurerStatus} accessibilityLabel="Loading insurers">
          <ActivityIndicator size="small" color={colors.primaryCta} />
          <Text style={styles.vehicleStatusText}>Loading insurers…</Text>
        </View>
      ) : null}

      {insurers.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Buy from top insurers</Text>
          <Text style={styles.sectionCopy}>Onboarded insurers you can compare and buy from.</Text>
          <InsurerAutoCarousel insurers={insurers} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.sky700,
  },
  title: {
    ...typography.heading,
    fontSize: 24,
    lineHeight: 28,
    color: colors.slate950,
    marginTop: -spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.slate600,
    marginTop: -spacing.sm,
  },
  heroWrap: {
    borderRadius: 22,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.28)',
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availablePill: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  availableText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#047857',
  },
  heroTitle: {
    ...typography.heading,
    fontSize: 20,
    lineHeight: 24,
    color: colors.heroNavy,
  },
  heroCopy: {
    ...typography.caption,
    color: colors.slate600,
  },
  benefits: {
    gap: 6,
    marginTop: spacing.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefit: {
    ...typography.label,
    color: colors.slate700,
    fontWeight: '600',
  },
  cta: {
    minHeight: 52,
    marginTop: spacing.sm,
    borderRadius: 14,
    backgroundColor: colors.primaryCta,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaLabel: {
    ...typography.button,
    color: colors.white,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
    color: colors.slate500,
  },
  sectionCopy: {
    ...typography.caption,
    color: colors.slate600,
    marginTop: -spacing.xs,
  },
  dropdown: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dropdownTrigger: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownInput: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    padding: 0,
    color: colors.slate950,
  },
  dropdownChevron: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownEmpty: {
    ...typography.caption,
    color: colors.slate500,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dropdownOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  vehicleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.sky50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleReg: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  vehicleMeta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 1,
  },
  quoteChipLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  anotherVehicle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  anotherVehicleLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  viewAll: {
    minHeight: 40,
    justifyContent: 'center',
  },
  viewAllLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate600,
  },
  vehicleStatus: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vehicleStatusText: {
    ...typography.caption,
    color: colors.slate500,
    flex: 1,
  },
  retry: {
    ...typography.label,
    fontWeight: '700',
    color: colors.primaryCta,
  },
  soonCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  soonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonCopy: {
    flex: 1,
    minWidth: 0,
  },
  soonTitle: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate700,
  },
  soonDescription: {
    ...typography.caption,
    color: colors.slate400,
    marginTop: 1,
  },
  soonPill: {
    borderRadius: 999,
    backgroundColor: colors.slate100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  soonPillLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.slate500,
  },
  insurerStatus: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  insurerViewport: {
    overflow: 'hidden',
  },
  insurerTrack: {
    flexDirection: 'row',
  },
  insurerCard: {
    width: INSURER_CARD_WIDTH,
    marginRight: spacing.sm,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  insurerName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.slate700,
    textAlign: 'center',
  },
});

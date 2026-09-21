import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, ErrorMessage, ScreenContainer } from '../../components';
import { BrandLogo } from '../../components/BrandLogo';
import { ROAD_TAX_URL } from '../../constants/external-links';
import type { CustomerTabScreenProps } from '../../navigation/types';
import { getCustomerDashboard } from '../../services/customer-dashboard';
import { useAuth } from '../../store/auth-context';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { InsurerLogo } from '../quote/InsurerLogo';
import { StatusBadge } from '../customer-lists/StatusBadge';
import { DashboardIcon } from './DashboardIcon';
import {
  formatMoney,
  formatPolicyDate,
  formatRenewalDue,
  getGreetingName,
  getInitials,
  getTimeOfDayGreeting,
  pickFeaturedPolicy,
  shortenReference,
} from './helpers';
import type { CustomerDashboardData, CustomerPolicyStatus } from './types';

type CustomerHomeScreenProps = CustomerTabScreenProps<'Home'>;

const RTSA_LOGO = require('../../../assets/logo/rtsa-logo.jpg');

const HOME_CARD = {
  borderRadius: radius.lg,
  padding: spacing.lg,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
} as const;

export function CustomerHomeScreen({ navigation }: CustomerHomeScreenProps) {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setData(await getCustomerDashboard({ bypassCache: isRefresh }));
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load dashboard statistics.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard(true);
    }, [loadDashboard]),
  );

  const displayName = data?.customerName || session?.user.fullName;
  const firstName = getGreetingName(displayName);
  const featured = useMemo(() => {
    if (!data) return undefined;
    const picked = pickFeaturedPolicy(data.recentPolicies);
    if (!picked) return undefined;
    if (picked.policy.status === 'Expired') return undefined;
    return picked;
  }, [data]);
  const latestQuote = data?.recentQuotes.find((quote) => quote.isActionable) ?? data?.recentQuotes[0];
  const pendingPayment = data?.pendingTransactions[0];
  const showPendingPayment = Boolean(pendingPayment) && (data?.pendingPayments ?? 0) > 0;
  const showExpiry = featured?.policy.status === 'Expiring Soon';
  const hasActivePolicies = (data?.activePolicies ?? 0) > 0;
  const vehicleCount = data?.totalVehicles;

  const goToQuote = () => navigation.navigate('MotorQuote');
  const goToVehicles = () => navigation.navigate('Vehicles');
  const goToPolicies = () => navigation.navigate('Policies');
  const goToQuotes = () => navigation.navigate('Quotes');
  const goToPayments = () => navigation.navigate('Payments');
  const goToProfile = () => navigation.navigate('Profile');
  const goToRenew = () => {
    const vehicleId = featured?.policy.vehicleId;
    if (vehicleId) {
      navigation.navigate('MotorQuote', { customerVehicleId: vehicleId });
      return;
    }
    navigation.navigate('MotorQuote');
  };

  function openRoadTaxPortal() {
    void WebBrowser.openBrowserAsync(ROAD_TAX_URL, {
      toolbarColor: colors.primaryCta,
      controlsColor: colors.white,
      enableBarCollapsing: true,
      showTitle: true,
    }).catch((openError) => {
      Alert.alert(
        'Unable to open Road Tax',
        getErrorMessage(openError, 'The RTSA e-Services page could not be opened.'),
      );
    });
  }

  return (
    <ScreenContainer
      scroll
      includeBottomSafeArea={false}
      contentStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard(true)} />
      }
    >
      <View style={styles.appBar}>
        <BrandLogo height={36} style={styles.logo} />
        <View style={styles.appBarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => void signOut()}
            hitSlop={8}
            style={({ pressed }) => [styles.signOutChip, pressed ? styles.pressed : null]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.sky700} />
            <Text style={styles.signOutChipLabel}>Sign out</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={goToProfile}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.greetingBlock}>
        <View style={styles.heroCopy}>
          <Text style={styles.greeting}>
            {getTimeOfDayGreeting()}, {firstName}
          </Text>
          <Text style={styles.lede}>Here&apos;s what&apos;s happening with your insurance today.</Text>
        </View>
        {refreshing && data ? (
          <ActivityIndicator color={colors.primaryCta} accessibilityLabel="Refreshing dashboard" />
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBlock}>
          <ErrorMessage message={error} />
          <Button label="Retry" variant="outline" onPress={() => void loadDashboard()} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get a Quote"
        onPress={goToQuote}
        style={({ pressed }) => [styles.heroPress, pressed ? styles.pressed : null]}
      >
        <LinearGradient
          colors={[colors.primaryCta, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <DashboardIcon name="car-sport" tone="brand" size={22} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Get a Quote</Text>
            <Text style={styles.heroSubtitle}>Compare insurers and get covered in minutes.</Text>
          </View>
          <View style={styles.heroArrow} accessibilityElementsHidden>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
        </LinearGradient>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buy Road Tax"
        onPress={openRoadTaxPortal}
        style={({ pressed }) => [styles.vehicleShortcut, pressed ? styles.pressed : null]}
      >
        <RtsaMark />
        <View style={styles.heroCopy}>
          <Text style={styles.vehicleTitle}>Buy Road Tax</Text>
          <Text style={styles.vehicleMeta}>Pay via RTSA e-Services</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
      </Pressable>

      {loading && !data ? (
        <HomeSkeleton />
      ) : data ? (
        <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="My Vehicles"
        onPress={goToVehicles}
        style={({ pressed }) => [styles.vehicleShortcut, pressed ? styles.pressed : null]}
      >
        <DashboardIcon name="car-outline" tone="sky" size={18} />
        <View style={styles.heroCopy}>
          <Text style={styles.vehicleTitle}>My Vehicles</Text>
          <Text style={styles.vehicleMeta}>{vehicleShortcutLabel(vehicleCount)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
      </Pressable>

      <Card style={HOME_CARD}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <DashboardIcon name="shield-checkmark" tone="green" size={16} />
            <Text style={styles.sectionTitle}>My Policies</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View all policies" onPress={goToPolicies} hitSlop={8} style={styles.linkHit}>
            <Text style={styles.link}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data?.activePolicies ?? 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data?.expiringSoon ?? 0}</Text>
            <Text style={styles.statLabel}>Expiring soon</Text>
          </View>
        </View>
        {!loading && !hasActivePolicies ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Get your first policy</Text>
            <Pressable accessibilityRole="button" onPress={goToQuote} hitSlop={8} style={styles.linkHit}>
              <Text style={styles.link}>Get Quote</Text>
            </Pressable>
          </View>
        ) : null}
      </Card>

      {featured ? (
        <Card style={HOME_CARD}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Active Policy</Text>
            <StatusBadge label={featured.policy.status} tone={policyBadgeTone(featured.policy.status)} />
          </View>
          <View style={styles.policyHeader}>
            <InsurerLogo name={featured.policy.insurerName} logoUrl={featured.policy.logoUrl} size={40} />
            <Text style={styles.policyTitle} numberOfLines={1}>
              {featured.policy.insurerName}
            </Text>
          </View>
          <View style={styles.detailGrid}>
            <Detail label="Cover type" value={featured.policy.coverType} />
            <Detail label="Policy number" value={featured.policy.policyNumber} compact />
            <Detail label="Registration" value={featured.policy.vehicleRegistrationNumber} />
            <Detail label="Expiry date" value={formatPolicyDate(featured.policy.expiryDate)} />
          </View>
          {showExpiry ? (
            <View style={styles.renewal}>
              <DashboardIcon name="alert-circle" tone="amber" size={16} />
              <Text style={styles.renewalText}>{formatRenewalDue(featured.daysRemaining)}</Text>
            </View>
          ) : null}
          <View style={styles.buttonRow}>
            <Button
              label="View Policy"
              variant="outline"
              style={[styles.buttonFlex, styles.compactButton]}
              onPress={() => navigation.navigate('PolicyDetails', { policyId: featured.policy.id })}
            />
            {showExpiry ? (
              <Button
                label="Renew Now"
                variant="cta"
                style={[styles.buttonFlex, styles.compactButton]}
                onPress={goToRenew}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {showPendingPayment && pendingPayment ? (
        <Card style={HOME_CARD}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleRow}>
              <DashboardIcon name="wallet-outline" tone="amber" size={16} />
              <Text style={styles.sectionTitle}>Payment Pending</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {shortenReference(pendingPayment.quoteReference || pendingPayment.transactionId) || 'Quote'}
          </Text>
          {pendingPayment.amount !== undefined ? (
            <Text style={styles.meta}>{formatMoney(pendingPayment.amount, pendingPayment.currencyCode)}</Text>
          ) : (
            <Text style={styles.meta}>Complete this payment to finish your cover.</Text>
          )}
          <Button
            label="Complete Payment"
            variant="cta"
            style={styles.compactButton}
            onPress={() =>
              pendingPayment.transactionId
                ? navigation.navigate('PaymentDetails', { transactionId: pendingPayment.transactionId })
                : goToPayments()
            }
          />
        </Card>
      ) : null}

      {latestQuote ? (
        <Card style={HOME_CARD}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionTitleRow}>
              <DashboardIcon name="document-text-outline" tone="sky" size={16} />
              <Text style={styles.sectionTitle}>Recent Quote</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="View all quotes" onPress={goToQuotes} hitSlop={8} style={styles.linkHit}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {latestQuote.vehicleRegistrationNumber || latestQuote.id}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {[
              latestQuote.insurerName,
              latestQuote.totalPremium !== undefined
                ? formatMoney(latestQuote.totalPremium, latestQuote.currency)
                : undefined,
              latestQuote.validUntil ? `Expires ${formatPolicyDate(latestQuote.validUntil)}` : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Button
            label={latestQuote.isActionable ? 'Continue Quote' : 'View Quote'}
            variant="outline"
            style={styles.compactButton}
            onPress={() =>
              latestQuote.id
                ? navigation.navigate('CustomerQuoteDetails', { quoteId: latestQuote.id })
                : goToQuotes()
            }
          />
        </Card>
      ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

function RtsaMark() {
  return (
    <View style={styles.rtsaMark} accessibilityElementsHidden>
      <Image source={RTSA_LOGO} style={styles.rtsaLogo} resizeMode="contain" />
    </View>
  );
}

function policyBadgeTone(status: CustomerPolicyStatus) {
  if (status === 'Active') return 'success' as const;
  if (status === 'Expiring Soon') return 'warning' as const;
  return 'danger' as const;
}

function vehicleShortcutLabel(count?: number) {
  if (count === undefined) return 'View saved vehicles';
  if (count === 0) return 'Add your first vehicle';
  if (count === 1) return '1 saved vehicle';
  return `${count} saved vehicles`;
}

function Detail({
  label,
  value,
  compact,
}: {
  label: string;
  value?: string;
  compact?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={styles.detailValue}
        numberOfLines={compact ? 1 : 2}
        ellipsizeMode={compact ? 'middle' : 'tail'}
      >
        {value}
      </Text>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityLabel="Loading dashboard">
      <View style={styles.skeletonCard} />
      <View style={[styles.skeletonCard, styles.skeletonWide]} />
      <View style={[styles.skeletonCard, styles.skeletonWide]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  logo: {
    alignItems: 'flex-start',
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signOutChip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.sky50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutChipLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sky100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
  greeting: {
    ...typography.heading,
    fontSize: 24,
    lineHeight: 28,
    color: colors.slate950,
  },
  greetingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lede: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
  },
  errorBlock: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  heroPress: {
    minHeight: 44,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 76,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
    shadowColor: colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  vehicleTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
  },
  vehicleMeta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  rtsaMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rtsaLogo: {
    width: 34,
    height: 34,
  },
  heroTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  heroSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.slate950,
  },
  link: {
    ...typography.label,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  linkHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    ...typography.heading,
    fontSize: 24,
    lineHeight: 28,
    color: colors.slate950,
  },
  statLabel: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.slate200,
    marginHorizontal: spacing.md,
  },
  empty: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.slate500,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  policyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
  },
  meta: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  detailGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.slate500,
    width: 108,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate900,
    flex: 1,
    textAlign: 'right',
  },
  renewal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amber50,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  renewalText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.amber800,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonFlex: {
    flex: 1,
  },
  compactButton: {
    minHeight: 44,
  },
  skeleton: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.slate100,
  },
  skeletonWide: {
    height: 96,
  },
});

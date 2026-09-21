import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import type { CustomerPolicyRecord } from '../../services/customer-portal';
import { InsurerLogo } from '../quote/InsurerLogo';
import { formatCoverType, formatRenewalDue } from '../dashboard/helpers';
import {
  formatCustomerDate,
  joinMeta,
  policyDaysRemaining,
  policyStatusTone,
} from './helpers';
import { StatusBadge } from './StatusBadge';

type PolicyListCardProps = {
  policy: CustomerPolicyRecord;
  onPress: () => void;
};

export function PolicyListCard({ policy, onPress }: PolicyListCardProps) {
  const remaining = policyDaysRemaining(policy.expiryDate);
  const showRenewalDue = policy.displayStatus === 'Expiring Soon' && Number.isFinite(remaining);
  const insurerName = policy.insurerName || 'Insurer';
  const meta = joinMeta([
    policy.vehicleRegistrationNumber || 'Vehicle',
    formatCoverType(policy.policyProductType),
    formatCoverType(policy.coverType),
  ]);

  return (
    <Card style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.press}>
        <View style={styles.top}>
          <InsurerLogo name={insurerName} logoUrl={policy.logoUrl} size={32} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.insurer}>
              {insurerName}
            </Text>
            {meta ? (
              <Text numberOfLines={1} style={styles.meta}>
                {meta}
              </Text>
            ) : null}
          </View>
          <StatusBadge label={policy.displayStatus} tone={policyStatusTone(policy.displayStatus)} />
        </View>
        <View style={styles.footer}>
          <Text numberOfLines={1} style={styles.policyNo}>
            {policy.policyNumber}
          </Text>
          <Text style={[styles.expiry, showRenewalDue ? styles.renewal : null]}>
            {showRenewalDue ? formatRenewalDue(remaining) : formatCustomerDate(policy.expiryDate) || '—'}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 0,
  },
  press: {
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  insurer: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  meta: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate500,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  policyNo: {
    ...typography.caption,
    color: colors.slate500,
    flex: 1,
  },
  expiry: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
  },
  renewal: {
    color: colors.amber800,
  },
});

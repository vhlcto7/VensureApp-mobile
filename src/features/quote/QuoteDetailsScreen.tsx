import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../../components';
import { fetchCustomerDocumentFile, type CustomerDocumentFile } from '../../services/customer-documents';
import { useAuth } from '../../store/auth-context';
import { getGuestQuoteSession } from '../../store/quote-draft';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DocumentPreviewModal } from '../policies/DocumentPreviewModal';
import { InsurerLogo } from './InsurerLogo';
import { QuoteChrome } from './QuoteChrome';
import {
  formatDisplayDate,
  formatQuoteCurrency,
  getMotorCoverPeriodDetails,
  getPolicyDurationLabel,
  getPolicyProductTypeLabel,
  getQuoteLiabilityItems,
  getQuotePricingSummary,
} from './helpers';
import { selectQuoteForPurchase, isQuotePurchasable } from './quote-purchase';

type QuoteDetailsScreenProps = {
  navigation: {
    goBack: () => void;
    navigate: (name: 'Login' | 'QuoteReview', params?: { quoteId: string }) => void;
  };
  route: {
    params: { quoteId: string };
  };
};

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function QuoteDetailsScreen({ navigation, route }: QuoteDetailsScreenProps) {
  const { session } = useAuth();
  const [showAllBenefits, setShowAllBenefits] = useState(false);
  const [openingDoc, setOpeningDoc] = useState('');
  const [preview, setPreview] = useState<CustomerDocumentFile | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const guestSession = getGuestQuoteSession();
  const quote = guestSession?.quoteResponses?.find((item) => item.id === route.params.quoteId);
  const form = guestSession?.quoteRequestData;
  const pricing = quote ? getQuotePricingSummary(quote) : null;
  const liabilityItems = quote ? getQuoteLiabilityItems(quote) : [];
  const canBuy = Boolean(quote && isQuotePurchasable(quote));
  const signedIn = Boolean(session?.user);

  if (!quote) {
    return (
      <View style={styles.root}>
        <QuoteChrome showStepper={false} title="Quote details" onBack={() => navigation.goBack()} />
        <Text style={styles.missing}>This quote is no longer available. Go back and refresh the results.</Text>
      </View>
    );
  }

  const vehicle = form?.manualVehicle;
  const coverPeriod = form ? getMotorCoverPeriodDetails(form.coverage, form.rtsaVehicle) : null;
  const vehicleLabel = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ');
  const durationValue =
    quote.durationLabel ||
    (quote.durationMonths ? `${quote.durationMonths} months` : undefined) ||
    coverPeriod?.coverPeriod ||
    getPolicyDurationLabel(quote.policyDuration || form?.coverage.policyDuration);
  const visibleBenefits = showAllBenefits ? quote.benefits : quote.benefits.slice(0, 3);
  const hiddenBenefitCount = Math.max(0, quote.benefits.length - 3);
  const keyFactsId = quote.keyFactStatementDocumentId;
  const policyWordingId = quote.policyWordingDocumentId;

  async function openProductDocument(kind: 'keyFacts' | 'policyWording') {
    if (!signedIn) {
      navigation.navigate('Login');
      return;
    }
    const documentId = kind === 'keyFacts' ? keyFactsId : policyWordingId;
    const fileName = kind === 'keyFacts' ? 'Key Fact Statement' : 'Policy Wording';
    if (!documentId) {
      Alert.alert('Document unavailable', 'This document is not available for the selected product yet.');
      return;
    }
    try {
      setOpeningDoc(documentId);
      setPreview(null);
      setPreviewVisible(true);
      setPreview(
        await fetchCustomerDocumentFile({
          path: `/customer/documents/${documentId}/download`,
          fileName,
        }),
      );
    } catch (openError) {
      setPreviewVisible(false);
      setPreview(null);
      Alert.alert('Document unavailable', getErrorMessage(openError, 'This document could not be opened.'));
    } finally {
      setOpeningDoc('');
    }
  }

  return (
    <View style={styles.root}>
      <QuoteChrome
        showStepper={false}
        title="Quote details"
        subtitle={quote.coverType || 'Motor cover'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.summaryHeader}>
            <InsurerLogo name={quote.insurerName} logoUrl={quote.logoUrl} size={48} />
            <View style={styles.summaryCopy}>
              <Text style={styles.insurer}>{quote.insurerName}</Text>
              {quote.coverType ? <Text style={styles.helper}>{quote.coverType}</Text> : null}
            </View>
          </View>
          <Text style={styles.kicker}>Insurance Premium</Text>
          <Text style={styles.premium}>{quote.premiumLabel}</Text>
          <Text style={styles.helper}>Includes statutory levy</Text>
          {pricing?.hasSavings ? <Text style={styles.savings}>{pricing.savingsLabel}</Text> : null}
          {!pricing?.hasSavings && pricing?.isDiscountApplied ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Discount applied</Text>
            </View>
          ) : null}
          {pricing?.isPromotionApplied ? (
            <View style={[styles.chip, styles.promoChip]}>
              <Text style={styles.promoChipText}>{quote.promotionName || 'Promotion applied'}</Text>
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Quote</Text>
          <DetailRow label="Product" value={quote.productName} />
          <DetailRow label="Valid until" value={formatDisplayDate(quote.validUntil)} />
          <DetailRow label="Duration" value={durationValue} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <DetailRow label="Registration" value={form?.registrationNumber} />
          <DetailRow label="Vehicle" value={vehicleLabel || undefined} />
          <DetailRow label="Year" value={vehicle?.yearOfManufacture || vehicle?.year} />
          <DetailRow label="Colour" value={vehicle?.colour || vehicle?.color} />
          <DetailRow
            label="Vehicle use"
            value={
              form?.coverage.policyProductType
                ? getPolicyProductTypeLabel(form.coverage.policyProductType)
                : undefined
            }
          />
          <DetailRow
            label="Sum insured"
            value={
              form?.coverage.sumInsured
                ? formatQuoteCurrency(form.coverage.sumInsured, quote.currency)
                : undefined
            }
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Cover period</Text>
          <DetailRow
            label="Start date"
            value={formatDisplayDate(
              quote.startDate || coverPeriod?.startDate || form?.coverage.preferredStartDate,
            )}
          />
          <DetailRow
            label="End date"
            value={formatDisplayDate(quote.endDate || coverPeriod?.endDate)}
          />
        </Card>

        {pricing?.breakdown.length ? (
          <Card>
            <Text style={styles.sectionTitle}>Premium breakdown</Text>
            {pricing.breakdown.map((item) => (
              <View key={item.label} style={styles.row}>
                <Text style={item.highlight ? styles.rowLabelStrong : styles.rowLabel}>{item.label}</Text>
                <Text style={item.highlight ? styles.rowValueStrong : styles.rowValue}>{item.value}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {liabilityItems.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>Third party liability</Text>
            {liabilityItems.map((item) => (
              <DetailRow key={item.label} label={item.label} value={item.value} />
            ))}
          </Card>
        ) : null}

        {visibleBenefits.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>Benefits</Text>
            {visibleBenefits.map((item) => (
              <Text key={item} style={styles.benefit}>
                {item}
              </Text>
            ))}
            {hiddenBenefitCount > 0 ? (
              <Pressable onPress={() => setShowAllBenefits((current) => !current)} hitSlop={8}>
                <Text style={styles.moreBenefits}>
                  {showAllBenefits
                    ? 'Show fewer benefits'
                    : `Show ${hiddenBenefitCount} more benefit${hiddenBenefitCount === 1 ? '' : 's'}`}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Policy documents</Text>
          <Text style={styles.helper}>
            {signedIn
              ? 'Review the Policy Wording and Key Fact Statement for this cover.'
              : 'Sign in to open the Policy Wording and Key Fact Statement.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Key Fact Statement"
            onPress={() => void openProductDocument('keyFacts')}
            disabled={Boolean(openingDoc)}
            style={styles.documentButton}
          >
            <Text style={styles.documentButtonText}>
              {openingDoc && openingDoc === keyFactsId ? 'Opening…' : 'View Key Fact Statement'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Policy Wording"
            onPress={() => void openProductDocument('policyWording')}
            disabled={Boolean(openingDoc)}
            style={styles.documentButton}
          >
            <Text style={styles.documentButtonText}>
              {openingDoc && openingDoc === policyWordingId ? 'Opening…' : 'View Policy Wording'}
            </Text>
          </Pressable>
        </Card>

        <Button
          label={!canBuy ? 'Unavailable' : signedIn ? 'Buy Now' : 'Sign in to Buy'}
          variant="cta"
          disabled={!canBuy}
          onPress={() =>
            void selectQuoteForPurchase({
              quote,
              quoteRequestId: guestSession?.quoteRequestId,
              onContinue: (quoteId) => {
                if (signedIn) {
                  navigation.navigate('QuoteReview', { quoteId });
                  return;
                }
                navigation.navigate('Login');
              },
            })
          }
        />
      </ScrollView>
      <DocumentPreviewModal
        visible={previewVisible}
        document={preview}
        loading={Boolean(openingDoc) && !preview}
        onClose={() => {
          setPreviewVisible(false);
          setPreview(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  missing: {
    ...typography.body,
    color: colors.slate600,
    padding: spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  insurer: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  kicker: {
    ...typography.label,
    color: colors.slate500,
    textTransform: 'uppercase',
  },
  premium: {
    ...typography.heading,
    fontSize: 26,
    color: colors.primaryCta,
    marginTop: spacing.xs,
  },
  savings: {
    ...typography.caption,
    color: '#047857',
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  promoChip: {
    backgroundColor: '#fff7ed',
  },
  promoChipText: {
    color: '#c2410c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate200,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.slate500,
    flex: 1,
  },
  rowLabelStrong: {
    ...typography.caption,
    color: colors.slate700,
    fontWeight: '700',
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    color: colors.slate900,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  rowValueStrong: {
    ...typography.body,
    color: colors.slate950,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  benefit: {
    ...typography.body,
    color: colors.slate700,
    backgroundColor: colors.slate50,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  moreBenefits: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  documentButton: {
    minHeight: 44,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sky300,
    backgroundColor: colors.sky50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  documentButtonText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.sky700,
  },
});

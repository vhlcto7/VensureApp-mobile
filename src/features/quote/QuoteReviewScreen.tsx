import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, Checkbox, ErrorMessage, LoadingIndicator } from '../../components';
import {
  fetchCustomerDocumentFile,
  type CustomerDocumentFile,
} from '../../services/customer-documents';
import {
  claimCustomerQuote,
  getCustomerPaymentSettings,
  getQuotePurchaseSummary,
  type CustomerPaymentSettings,
  type QuotePurchaseSummary,
} from '../../services/customer-portal';
import { useAuth } from '../../store/auth-context';
import { getGuestQuoteSession } from '../../store/quote-draft';
import { createGeePayCheckoutSession } from '../../services/geepay';
import { saveCheckoutState, savePendingPurchase } from '../../store/purchase-state';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';
import { DetailRow } from '../customer-lists/DetailRow';
import { formatCustomerDate, formatCustomerMoney, formatEnumLabel } from '../customer-lists/helpers';
import { formatCoverType } from '../dashboard/helpers';
import { DocumentPreviewModal } from '../policies/DocumentPreviewModal';
import { toFiniteNumber } from './helpers';
import { InsurerLogo } from './InsurerLogo';
import {
  calculateGrossedUpGatewayAmounts,
  getLevyLabel,
  resolveServiceChargePercentForMethod,
  roundMoney,
} from './payment-amounts';

function parseQuotedAmount(value: unknown) {
  const direct = toFiniteNumber(value);
  if (direct !== undefined) return direct;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return toFiniteNumber(value.replace(/[^0-9.-]/g, ''));
}

type QuoteReviewScreenProps = {
  navigation: {
    goBack: () => void;
    navigate: (
      name: 'Login' | 'QuotePayment' | 'QuoteResults',
      params?: { quoteId?: string; transactionRef?: string; quoteRequestId?: string },
    ) => void;
  };
  route: {
    params: { quoteId: string };
  };
};

export function QuoteReviewScreen({ navigation, route }: QuoteReviewScreenProps) {
  const quoteId = route.params.quoteId;
  const { session } = useAuth();
  const guestQuote = getGuestQuoteSession()?.quoteResponses?.find((item) => item.id === quoteId);
  const form = getGuestQuoteSession()?.quoteRequestData;
  const [loading, setLoading] = useState(Boolean(session?.user));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [summary, setSummary] = useState<QuotePurchaseSummary | null>(null);
  const [settings, setSettings] = useState<CustomerPaymentSettings | null>(null);
  const [method, setMethod] = useState<'MOBILE_MONEY' | 'CARD'>('MOBILE_MONEY');
  const [openingDoc, setOpeningDoc] = useState('');
  const [preview, setPreview] = useState<CustomerDocumentFile | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    void savePendingPurchase({
      quoteId,
      quoteRequestId: getGuestQuoteSession()?.quoteRequestId,
    });
  }, [quoteId]);

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setAmountError('');
    try {
      const paymentSettings = await getCustomerPaymentSettings();
      setSettings(paymentSettings);
      setMethod((current) => {
        if (current === 'MOBILE_MONEY' && paymentSettings.mobileMoneyEnabled) return current;
        if (current === 'CARD' && paymentSettings.cardEnabled) return current;
        if (paymentSettings.mobileMoneyEnabled) return 'MOBILE_MONEY';
        return 'CARD';
      });
      await claimCustomerQuote(quoteId);
      const nextSummary = await getQuotePurchaseSummary(quoteId);
      setSummary(nextSummary);
      if (
        guestQuote?.insurancePremium !== undefined &&
        nextSummary.quote.premium !== undefined &&
        Number(guestQuote.insurancePremium) !== Number(nextSummary.quote.premium)
      ) {
        setAmountError('Unable to confirm payment amount. Please refresh your quote.');
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load this quote for purchase.'));
    } finally {
      setLoading(false);
    }
  }, [guestQuote?.insurancePremium, quoteId, session?.user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const quote = summary?.quote;
  const breakdown = quote?.premiumBreakdown;
  const insurerName = quote?.insurerName || guestQuote?.insurerName || 'Insurer';
  const logoUrl = quote?.logoUrl || guestQuote?.logoUrl;
  const currency = quote?.currency || guestQuote?.currency || 'ZMW';
  const premium =
    parseQuotedAmount(breakdown?.insurancePremium) ??
    quote?.premium ??
    guestQuote?.insurancePremium ??
    parseQuotedAmount(guestQuote?.premiumLabel);
  const basePremium = parseQuotedAmount(breakdown?.basePremium) ?? guestQuote?.basePremium;
  const insurerDiscount =
    parseQuotedAmount(breakdown?.insurerDiscountAmount) ?? guestQuote?.insurerDiscountAmount ?? 0;
  const promotionDiscount =
    parseQuotedAmount(breakdown?.promotionDiscountAmount) ?? guestQuote?.promotionDiscountAmount ?? 0;
  const combinedDiscount =
    parseQuotedAmount(breakdown?.discountAmount) ?? insurerDiscount + promotionDiscount;
  const levyAmount = parseQuotedAmount(breakdown?.levyAmount) ?? guestQuote?.levyAmount;
  const levyPercentage = parseQuotedAmount(breakdown?.levyPercentage) ?? guestQuote?.levyPercentage;
  const insurancePayable =
    parseQuotedAmount(quote?.totalPayable) ??
    parseQuotedAmount(breakdown?.totalPayable) ??
    guestQuote?.totalPayable ??
    premium;
  const serviceFee = parseQuotedAmount(breakdown?.serviceFee) ?? guestQuote?.serviceFee;
  const methods: Array<{ id: 'MOBILE_MONEY' | 'CARD'; label: string }> = [];
  if (settings?.mobileMoneyEnabled) methods.push({ id: 'MOBILE_MONEY', label: 'Mobile Money' });
  if (settings?.cardEnabled) methods.push({ id: 'CARD', label: 'Card' });
  const selectedChargePercent = resolveServiceChargePercentForMethod({
    method: methods.length > 0 ? method : '',
    mobileMoneyServiceChargePercent: settings?.mobileMoneyServiceChargePercent ?? 0,
    cardServiceChargePercent: settings?.cardServiceChargePercent ?? 0,
  });
  const feeEstimate =
    insurancePayable !== undefined && methods.length > 0
      ? calculateGrossedUpGatewayAmounts(insurancePayable, selectedChargePercent)
      : null;
  const paymentProcessingFee = feeEstimate?.serviceChargeAmount;
  const totalPayable = feeEstimate?.totalAmount ?? insurancePayable;
  const processingFeeLabel =
    selectedChargePercent > 0
      ? 'Processing Fee'
      : 'Processing Fee';
  const totalSavings = combinedDiscount > 0 ? combinedDiscount : 0;
  const coverType = quote?.coverType || guestQuote?.coverType;
  const productType = quote?.policyProductType || guestQuote?.policyProductType || form?.coverage.policyProductType;
  const startDate = quote?.startDate || guestQuote?.startDate || form?.coverage.preferredStartDate;
  const endDate = quote?.endDate || guestQuote?.endDate;
  const registration = quote?.vehicleRegistrationNumber || form?.registrationNumber;
  const vehicle = [quote?.vehicleMake || form?.manualVehicle.make, quote?.vehicleModel || form?.manualVehicle.model]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[review-fee]', {
      method,
      selectedChargePercent,
      insurancePayable,
      paymentProcessingFee,
      totalPayable,
      settingsPercents: settings
        ? {
            mobileMoney: settings.mobileMoneyServiceChargePercent,
            card: settings.cardServiceChargePercent,
          }
        : null,
    });
  }, [
    insurancePayable,
    method,
    paymentProcessingFee,
    selectedChargePercent,
    settings,
    totalPayable,
  ]);

  async function openDocument(kind: 'keyFacts' | 'policyWording') {
    const document = kind === 'keyFacts' ? summary?.keyFacts : summary?.policyWording;
    if (!document?.id) {
      Alert.alert('Document unavailable', 'This document is not available for the selected product yet.');
      return;
    }
    try {
      setOpeningDoc(document.id);
      setPreview(null);
      setPreviewVisible(true);
      setPreview(
        await fetchCustomerDocumentFile({
          path: `/customer/documents/${document.id}/download`,
          fileName: document.fileName || document.title,
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

  async function startPayment() {
    if (!session?.user) {
      await savePendingPurchase({ quoteId, quoteRequestId: getGuestQuoteSession()?.quoteRequestId });
      navigation.navigate('Login');
      return;
    }
    if (amountError) return;
    if (!settings?.mobileMoneyEnabled && !settings?.cardEnabled) {
      setError('No payment methods are currently enabled.');
      return;
    }
    if (summary && !summary.paymentAllowed) {
      setError(summary.reason || 'This quote is not ready for payment.');
      return;
    }
    const wordingId = summary?.policyWording?.id;
    const keyFactsId = summary?.keyFacts?.id;
    if (!wordingId || !keyFactsId) {
      setError('Key Facts and Policy Wording must be available before payment.');
      return;
    }
    if (summary?.documentConsentRequired && !accepted) {
      setError('Please confirm that you have reviewed the Key Facts and Policy Wording.');
      return;
    }

    setPaying(true);
    setError('');
    try {
      const checkout = await createGeePayCheckoutSession({
        quoteId,
        paymentMethod: method,
        documentAcknowledgement: true,
        acknowledgedDocumentIds: [wordingId, keyFactsId],
      });
      if (
        checkout.totalAmount !== undefined &&
        totalPayable !== undefined &&
        roundMoney(Number(checkout.totalAmount)) !== roundMoney(Number(totalPayable))
      ) {
        setAmountError('Unable to confirm payment amount. Please refresh your quote.');
        return;
      }
      await saveCheckoutState({
        quoteId,
        transactionRef: checkout.transactionRef,
        checkoutUrl: checkout.checkoutUrl,
        createdAt: new Date().toISOString(),
      });
      navigation.navigate('QuotePayment', { quoteId, transactionRef: checkout.transactionRef });
    } catch (payError) {
      setError(getErrorMessage(payError, 'Payment could not be started. Please try again.'));
    } finally {
      setPaying(false);
    }
  }

  return (
    <View style={styles.root}>
      <DetailHeader title="Review & Buy" subtitle={insurerName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Card>
            <Text style={styles.helper}>Loading quote...</Text>
            <LoadingIndicator />
          </Card>
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
        {amountError ? <ErrorMessage message={amountError} /> : null}

        <Card>
          <View style={styles.insurerRow}>
            <InsurerLogo name={insurerName} logoUrl={logoUrl} size={52} />
            <View style={styles.copy}>
              <Text style={styles.insurer}>{insurerName}</Text>
              <Text style={styles.helper}>{formatCoverType(coverType)}</Text>
            </View>
          </View>
          <Text style={styles.premium}>{formatCustomerMoney(premium, currency) || guestQuote?.premiumLabel}</Text>
          <Text style={styles.premiumHint}>Insurance Premium</Text>
          <DetailRow label="Registration" value={registration} />
          <DetailRow label="Vehicle" value={vehicle || undefined} />
          <DetailRow label="Cover type" value={formatEnumLabel(coverType)} />
          <DetailRow label="Vehicle use" value={formatEnumLabel(productType)} />
          <DetailRow label="Cover start" value={formatCustomerDate(startDate)} />
          <DetailRow label="Cover end" value={formatCustomerDate(endDate)} />
        </Card>

        <Card>
          <Text style={styles.section}>Payment Summary</Text>
          {session?.user && methods.length > 0 ? (
            <View>
              <Text style={styles.subSection}>Payment method</Text>
              <Text style={[styles.helper, styles.methodHint]}>
                Processing charges to be applied.
              </Text>
              <View style={styles.methodRow}>
                {methods.map((item) => {
                  const selected = item.id === method;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setMethod(item.id)}
                      style={[styles.methodChip, selected ? styles.methodChipSelected : null]}
                    >
                      <Text style={[styles.methodChipText, selected ? styles.methodChipTextSelected : null]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {totalSavings > 0 ? (
            <View style={styles.savings}>
              <Text style={styles.savingsLabel}>Total Savings</Text>
              <Text style={styles.savingsValue}>{formatCustomerMoney(totalSavings, currency)}</Text>
            </View>
          ) : null}
          {basePremium !== undefined ? (
            <DetailRow label="Base Premium" value={formatCustomerMoney(basePremium, currency)} />
          ) : null}
          {insurerDiscount > 0 ? (
            <DetailRow
              label="Insurer Discount"
              value={`-${formatCustomerMoney(insurerDiscount, currency)}`}
            />
          ) : null}
          {promotionDiscount > 0 ? (
            <DetailRow
              label={guestQuote?.promotionName || 'VenSure Promotion'}
              value={`-${formatCustomerMoney(promotionDiscount, currency)}`}
            />
          ) : null}
          {levyAmount !== undefined ? (
            <DetailRow
              label={getLevyLabel(levyPercentage)}
              value={formatCustomerMoney(levyAmount, currency)}
            />
          ) : null}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Premium</Text>
            <Text style={styles.amountValue}>{formatCustomerMoney(premium, currency)}</Text>
          </View>
          {serviceFee ? (
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Service Fee</Text>
              <Text style={styles.amountValue}>{formatCustomerMoney(serviceFee, currency)}</Text>
            </View>
          ) : null}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{processingFeeLabel}</Text>
            <Text style={styles.amountValue}>
              {formatCustomerMoney(
                methods.length > 0 ? (paymentProcessingFee ?? 0) : undefined,
                currency,
              ) || (session?.user ? 'Unavailable' : 'Sign in to see charges')}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Total Payable</Text>
            <Text style={styles.feeValue}>
              {formatCustomerMoney(totalPayable, currency) || formatCustomerMoney(premium, currency)}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Product documents</Text>
          <Text style={styles.helper}>Review the Key Facts and Policy Wording before payment.</Text>
          <View style={styles.docRow}>
            <Button
              label={openingDoc && openingDoc === summary?.keyFacts?.id ? 'Loading documents...' : 'View Key Facts'}
              variant="outline"
              disabled={!session?.user || !summary?.keyFacts?.id || Boolean(openingDoc)}
              onPress={() => void openDocument('keyFacts')}
              style={styles.docAction}
            />
            <Button
              label={
                openingDoc && openingDoc === summary?.policyWording?.id
                  ? 'Loading documents...'
                  : 'View Policy Wording'
              }
              variant="outline"
              disabled={!session?.user || !summary?.policyWording?.id || Boolean(openingDoc)}
              onPress={() => void openDocument('policyWording')}
              style={styles.docAction}
            />
          </View>
          {!session?.user ? (
            <Text style={styles.helper}>Sign in to open Key Facts and Policy Wording.</Text>
          ) : null}
          {session?.user && summary?.documentConsentRequired ? (
            <Checkbox
              label="I confirm that I have read and understood the Policy Wording and Key Fact Statement."
              checked={accepted}
              onPress={() => setAccepted((value) => !value)}
            />
          ) : null}
        </Card>

        <Button
          label={
            paying
              ? 'Preparing payment...'
              : session?.user
                ? 'Proceed to Payment'
                : 'Sign in to continue'
          }
          variant="cta"
          loading={paying}
          disabled={Boolean(amountError) || paying}
          onPress={() => void startPayment()}
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  insurerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  insurer: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    fontSize: 17,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  methodHint: {
    marginBottom: spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodChipSelected: {
    backgroundColor: colors.sky100,
    borderColor: colors.primary,
  },
  methodChipText: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate600,
  },
  methodChipTextSelected: {
    color: colors.sky700,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.slate500,
    flex: 1,
  },
  amountValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate950,
    flex: 1,
    textAlign: 'right',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.sky50,
    borderWidth: 1,
    borderColor: colors.sky100,
  },
  feeLabel: {
    ...typography.caption,
    color: colors.sky700,
    flex: 1,
    fontWeight: '700',
  },
  feeValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.sky700,
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.slate200,
    marginTop: spacing.xs,
  },
  totalLabel: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate600,
    flex: 1,
  },
  totalValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.slate950,
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
  premium: {
    ...typography.heading,
    fontSize: 26,
    color: colors.heroNavy,
  },
  premiumHint: {
    ...typography.label,
    color: colors.slate500,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  section: {
    ...typography.heading,
    fontSize: 18,
    color: colors.slate950,
    marginBottom: spacing.sm,
  },
  subSection: {
    ...typography.label,
    color: colors.slate500,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  savings: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  savingsLabel: {
    ...typography.label,
    color: '#047857',
    textTransform: 'uppercase',
  },
  savingsValue: {
    ...typography.body,
    fontWeight: '700',
    color: '#065f46',
    fontSize: 16,
    marginTop: 2,
  },
  docRow: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  docAction: {
    flex: 1,
  },
});

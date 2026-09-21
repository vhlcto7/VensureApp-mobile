import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Button, Card, ErrorMessage, LoadingIndicator } from '../../components';
import { getCustomerPolicy } from '../../services/customer-portal';
import { confirmGeePayReturn, getGeePayStatus, type GeePayPaymentStatus } from '../../services/geepay';
import { clearCheckoutState, getCheckoutState, saveCheckoutState } from '../../store/purchase-state';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { DetailHeader } from '../customer-lists/DetailHeader';

const POLL_MS = 2500;
const MAX_POLLS = 24;
/** Wall-clock cap while the GeePay WebView is open. Does not close checkout. */
const MAX_OPEN_WATCH_MS = 5 * 60 * 1000;

type Phase = 'opening' | 'confirming' | 'finalizing' | 'pending' | 'failed' | 'reversed' | 'timeout';

type QuotePaymentScreenProps = {
  navigation: {
    goBack: () => void;
    replace: (
      name: 'QuotePurchaseSuccess' | 'QuoteReview',
      params: { policyId?: string; quoteId: string },
    ) => void;
    navigate: (
      name: 'CustomerTabs' | 'QuoteReview',
      params?: { quoteId?: string; screen?: 'Payments' },
    ) => void;
  };
  route: {
    params: { quoteId: string; transactionRef: string };
  };
};

function isSuccess(status: GeePayPaymentStatus) {
  return status === 'SUCCESS';
}

function isGeePayReturnUrl(url: string) {
  try {
    return new URL(url).pathname.includes('/payment/geepay/return');
  } catch {
    return url.includes('/payment/geepay/return');
  }
}

export function QuotePaymentScreen({ navigation, route }: QuotePaymentScreenProps) {
  const { quoteId, transactionRef } = route.params;
  const [phase, setPhase] = useState<Phase>('opening');
  const [error, setError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const opened = useRef(false);
  const stopped = useRef(false);
  const settled = useRef(false);
  const intercepting = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const appStateRef = useRef(AppState.currentState);

  const finishWithPolicy = useCallback(
    async (policyId: string) => {
      if (settled.current) return;
      settled.current = true;
      stopped.current = true;
      intercepting.current = true;
      setCheckoutUrl('');
      await clearCheckoutState();
      navigation.replace('QuotePurchaseSuccess', { policyId, quoteId });
    },
    [navigation, quoteId],
  );

  const inspectOpenCheckoutStatus = useCallback(async () => {
    if (stopped.current || settled.current || intercepting.current) return;
    try {
      const status = await getGeePayStatus(transactionRef);
      if (status.status === 'FAILED') {
        intercepting.current = true;
        setCheckoutUrl('');
        setPhase('failed');
        return;
      }
      if (status.status === 'REVERSED') {
        intercepting.current = true;
        setCheckoutUrl('');
        setPhase('reversed');
        return;
      }
      if (isSuccess(status.status) && status.policyId) {
        try {
          await getCustomerPolicy(status.policyId);
          await finishWithPolicy(status.policyId);
        } catch {
          setPhase('finalizing');
        }
      }
    } catch {
      // Keep the checkout open until GeePay returns or the user leaves.
    }
  }, [finishWithPolicy, transactionRef]);

  const pollUntilSettled = useCallback(async () => {
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      if (stopped.current || settled.current) return;
      const status = await getGeePayStatus(transactionRef);
      if (status.status === 'FAILED') {
        setPhase('failed');
        return;
      }
      if (status.status === 'REVERSED') {
        setPhase('reversed');
        return;
      }
      if (isSuccess(status.status) && status.policyId) {
        setPhase('finalizing');
        try {
          await getCustomerPolicy(status.policyId);
          await finishWithPolicy(status.policyId);
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
          continue;
        }
      }
      if (isSuccess(status.status) && !status.policyId) {
        setPhase('finalizing');
      } else {
        setPhase('pending');
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    if (!settled.current) {
      setPhase('timeout');
    }
  }, [finishWithPolicy, transactionRef]);

  const confirmAndPoll = useCallback(async () => {
    if (settled.current) return;
    setCheckoutUrl('');
    setPhase('confirming');
    setError('');
    try {
      const confirmed = await confirmGeePayReturn(transactionRef);
      if (confirmed.status === 'FAILED') {
        setPhase('failed');
        return;
      }
      if (confirmed.status === 'REVERSED') {
        setPhase('reversed');
        return;
      }
      if (isSuccess(confirmed.status) && confirmed.policyId) {
        setPhase('finalizing');
        try {
          await getCustomerPolicy(confirmed.policyId);
          await finishWithPolicy(confirmed.policyId);
          return;
        } catch {
          await pollUntilSettled();
          return;
        }
      }
      await pollUntilSettled();
    } catch (confirmError) {
      setError(getErrorMessage(confirmError, 'We could not confirm this payment yet.'));
      setPhase('pending');
    }
  }, [finishWithPolicy, pollUntilSettled, transactionRef]);

  const hideCheckoutAndConfirm = useCallback(() => {
    if (intercepting.current || settled.current) return;
    intercepting.current = true;
    setCheckoutUrl('');
    void confirmAndPoll();
  }, [confirmAndPoll]);

  const handleCheckoutNavigation = useCallback(
    (navState: Pick<WebViewNavigation, 'url' | 'loading'>) => {
      if (!navState.url || !isGeePayReturnUrl(navState.url)) return;
      hideCheckoutAndConfirm();
    },
    [hideCheckoutAndConfirm],
  );

  const onShouldStartLoadWithRequest = useCallback(
    (request: { url: string; isTopFrame?: boolean }) => {
      if (request.isTopFrame === false) return true;
      if (!isGeePayReturnUrl(request.url)) return true;
      hideCheckoutAndConfirm();
      return false;
    },
    [hideCheckoutAndConfirm],
  );

  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const checkout = getCheckoutState();
    const nextCheckoutUrl = checkout?.transactionRef === transactionRef ? checkout.checkoutUrl : '';

    if (nextCheckoutUrl && !checkout?.browserOpened) {
      setPhase('opening');
      setCheckoutUrl(nextCheckoutUrl);
      if (checkout) {
        void saveCheckoutState({ ...checkout, browserOpened: true });
      }
      return;
    }

    void confirmAndPoll();
  }, [confirmAndPoll, transactionRef]);

  useEffect(() => {
    if (!checkoutUrl || settled.current) return;
    let cancelled = false;
    const startedAt = Date.now();

    async function watchWhileCheckoutOpen() {
      while (!cancelled && !stopped.current && !settled.current && !intercepting.current) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (cancelled || stopped.current || settled.current || intercepting.current) return;
        if (Date.now() - startedAt >= MAX_OPEN_WATCH_MS) return;
        if (appStateRef.current !== 'active') continue;
        await inspectOpenCheckoutStatus();
      }
    }

    void watchWhileCheckoutOpen();
    return () => {
      cancelled = true;
    };
  }, [checkoutUrl, inspectOpenCheckoutStatus]);

  useEffect(() => {
    if (!checkoutUrl) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      if (previous !== 'active' && nextState === 'active') {
        void inspectOpenCheckoutStatus();
      }
    });

    return () => subscription.remove();
  }, [checkoutUrl, inspectOpenCheckoutStatus]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !checkoutUrl) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [checkoutUrl]);

  const copy = {
    opening: {
      title: 'Opening secure payment',
      message: 'Complete payment on GeePay. This screen will update when payment is confirmed.',
    },
    confirming: {
      title: 'Confirming your payment',
      message: 'Please wait while we confirm your payment.',
    },
    finalizing: {
      title: 'Payment confirmed',
      message: 'Creating your policy...',
    },
    pending: {
      title: 'Payment is being confirmed',
      message: 'Your payment is still being verified. No policy has been created yet.',
    },
    failed: {
      title: 'Payment unsuccessful',
      message: 'The payment did not complete. No policy has been created.',
    },
    reversed: {
      title: 'Payment reversed',
      message: 'This payment was reversed. No policy has been created. Contact support if money was deducted.',
    },
    timeout: {
      title: 'Confirmation is taking longer than expected',
      message: 'Your payment is still being verified. You can check again or view Payments.',
    },
  }[phase];

  const subtitle =
    phase === 'opening'
      ? 'Secure checkout'
      : phase === 'confirming' || phase === 'pending'
        ? 'Confirming'
        : phase === 'finalizing'
          ? 'Creating policy'
          : undefined;

  return (
    <View style={styles.root}>
      <DetailHeader title="Payment" subtitle={subtitle} onBack={() => navigation.goBack()} />
      {checkoutUrl ? (
        <WebView
          ref={webViewRef}
          source={{ uri: checkoutUrl }}
          style={styles.checkout}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          renderLoading={() => (
            <View style={styles.checkoutLoading}>
              <LoadingIndicator />
            </View>
          )}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={(event) => handleCheckoutNavigation(event.nativeEvent)}
          onNavigationStateChange={handleCheckoutNavigation}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.message}>{copy.message}</Text>
            {phase === 'opening' || phase === 'confirming' || phase === 'finalizing' || phase === 'pending' ? (
              <LoadingIndicator />
            ) : null}
            {error ? <ErrorMessage message={error} /> : null}
          </Card>
          {phase === 'pending' || phase === 'timeout' ? (
            <Button label="Check Payment Status" variant="cta" onPress={() => void confirmAndPoll()} />
          ) : null}
          {phase === 'timeout' || phase === 'failed' || phase === 'reversed' || phase === 'pending' ? (
            <Button
              label="Back to Payments"
              variant="outline"
              onPress={() => navigation.navigate('CustomerTabs', { screen: 'Payments' })}
            />
          ) : null}
          {phase === 'failed' ? (
            <Button
              label="Try again"
              variant="outline"
              onPress={() => navigation.replace('QuoteReview', { quoteId })}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  checkout: {
    flex: 1,
    backgroundColor: colors.white,
  },
  checkoutLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    color: colors.slate950,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.slate600,
    marginBottom: spacing.lg,
  },
});

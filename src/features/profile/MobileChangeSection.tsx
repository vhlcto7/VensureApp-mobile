import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Input, OtpCodeInput, PhoneNumberField } from '../../components';
import { CUSTOMER_OTP_LENGTH } from '../../constants/auth';
import {
  cancelCustomerMobileChangeRequest,
  getCustomerMobileChangeRequests,
  sendCustomerMobileChangeOtp,
  submitCustomerMobileChangeRequest,
} from '../../services/customer-profile';
import { colors, radius, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { normalizeMobileForApi } from '../../utils/phone';
import { getMobileValidationError } from '../../utils/validation';
import { StatusBadge } from '../customer-lists/StatusBadge';
import { formatCustomerDate } from '../customer-lists/helpers';
import {
  formatMobileChangeStatus,
  mobileChangeStatusTone,
  toNationalMobileDigits,
} from './helpers';
import type { CustomerMobileChangeRequest } from './types';

type MobileChangeSectionProps = {
  currentMobileNumber: string;
  onApproved?: () => void;
};

export function MobileChangeSection({ currentMobileNumber, onApproved }: MobileChangeSectionProps) {
  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;

  const [requests, setRequests] = useState<CustomerMobileChangeRequest[]>([]);
  const [newMobileNumber, setNewMobileNumber] = useState('');
  const [reason, setReason] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const pendingRequest = useMemo(
    () => requests.find((request) => request.status === 'PENDING_REVIEW' || request.status === 'PENDING_OTP'),
    [requests],
  );
  const formDisabled = Boolean(pendingRequest) || submitting || sendingOtp;

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getCustomerMobileChangeRequests();
      setRequests(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load mobile change requests.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleSendOtp() {
    const mobileError = getMobileValidationError(newMobileNumber);
    if (mobileError) {
      setError(mobileError);
      return;
    }
    if (normalizeMobileForApi(newMobileNumber) === normalizeMobileForApi(currentMobileNumber || '')) {
      setError('The new mobile number must be different from the current number.');
      return;
    }

    try {
      setSendingOtp(true);
      setError('');
      setInfo('');
      await sendCustomerMobileChangeOtp(newMobileNumber);
      setInfo('OTP sent to the new mobile number.');
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Unable to send OTP.'));
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit() {
    const mobileError = getMobileValidationError(newMobileNumber);
    if (mobileError) {
      setError(mobileError);
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (!otp.trim()) {
      setError('OTP is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setInfo('');
      const created = await submitCustomerMobileChangeRequest({
        newMobileNumber,
        reason: reason.trim(),
        otp: otp.trim(),
      });
      setRequests((current) => [created, ...current]);
      setNewMobileNumber('');
      setReason('');
      setOtp('');
      setInfo('Mobile change request submitted for admin review.');
      if (created.status === 'APPROVED') {
        onApprovedRef.current?.();
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to submit the mobile change request.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(requestId: string) {
    try {
      setCancellingId(requestId);
      setError('');
      const updated = await cancelCustomerMobileChangeRequest(requestId);
      setRequests((current) => current.map((request) => (request.id === requestId ? updated : request)));
      setInfo('Mobile change request cancelled.');
    } catch (cancelError) {
      setError(getErrorMessage(cancelError, 'Unable to cancel the mobile change request.'));
    } finally {
      setCancellingId('');
    }
  }

  return (
    <Card>
      <Text style={styles.title}>Mobile Number Change Request</Text>
      <Text style={styles.lede}>
        Your current mobile number stays active until an admin reviews and approves your request.
      </Text>

      {pendingRequest ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            A mobile change request is already pending admin review. Cancel it before submitting a new one.
          </Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Current Mobile Number</Text>
        <Text style={styles.readonly}>{currentMobileNumber || 'Not provided'}</Text>
      </View>

      <PhoneNumberField
        label="New Mobile Number"
        value={newMobileNumber}
        onChangeText={(value) => {
          setNewMobileNumber(toNationalMobileDigits(value));
          setError('');
        }}
      />
      <Input
        label="Reason"
        value={reason}
        editable={!formDisabled}
        placeholder="Why do you need to change this number?"
        onChangeText={(value) => {
          setReason(value);
          setError('');
        }}
      />
      <OtpCodeInput
        length={CUSTOMER_OTP_LENGTH}
        value={otp}
        autoFocus={false}
        onChangeText={(value) => {
          setOtp(value);
          setError('');
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <Button
        label={sendingOtp ? 'Sending OTP...' : 'Send OTP to new number'}
        variant="outline"
        disabled={formDisabled}
        loading={sendingOtp}
        onPress={() => void handleSendOtp()}
      />
      <Button
        label={submitting ? 'Submitting...' : 'Submit for Admin Review'}
        variant="cta"
        disabled={formDisabled}
        loading={submitting}
        onPress={() => void handleSubmit()}
      />

      <Text style={styles.sectionLabel}>Request Status</Text>
      {loading ? (
        <Text style={styles.muted}>Loading mobile change requests...</Text>
      ) : requests.length === 0 ? (
        <Text style={styles.muted}>No mobile change requests submitted yet.</Text>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHead}>
              <Text style={styles.requestTitle}>
                {request.currentMobileNumber} to {request.newMobileNumber}
              </Text>
              <StatusBadge
                label={formatMobileChangeStatus(request.status)}
                tone={mobileChangeStatusTone(request.status)}
              />
            </View>
            {request.reason ? <Text style={styles.muted}>{request.reason}</Text> : null}
            {request.adminMessage ? <Text style={styles.error}>{request.adminMessage}</Text> : null}
            {request.createdAt ? (
              <Text style={styles.muted}>Submitted {formatCustomerDate(request.createdAt)}</Text>
            ) : null}
            {request.status === 'PENDING_REVIEW' || request.status === 'PENDING_OTP' ? (
              <Button
                label={cancellingId === request.id ? 'Cancelling...' : 'Cancel Request'}
                variant="outline"
                disabled={Boolean(cancellingId)}
                loading={cancellingId === request.id}
                onPress={() => void handleCancel(request.id)}
              />
            ) : null}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.slate950,
  },
  lede: {
    ...typography.caption,
    color: colors.slate500,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  warnBox: {
    backgroundColor: colors.amber50,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnText: {
    ...typography.caption,
    color: colors.amber800,
  },
  field: {
    marginBottom: spacing.md,
    gap: 8,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate950,
  },
  readonly: {
    ...typography.body,
    color: colors.slate900,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
  info: {
    ...typography.caption,
    color: '#047857',
  },
  muted: {
    ...typography.caption,
    color: colors.slate500,
  },
  sectionLabel: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate500,
    marginTop: spacing.md,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.slate50,
  },
  requestHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  requestTitle: {
    ...typography.label,
    fontWeight: '700',
    color: colors.slate950,
    flex: 1,
  },
});

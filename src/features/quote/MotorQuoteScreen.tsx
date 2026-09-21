import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';

import {
  Button,
  Card,
  DatePickerField,
  ErrorMessage,
  Input,
  PhoneNumberField,
} from '../../components';
import {
  coverTypesFromMotorProducts,
  createMotorQuoteRequest,
  getActiveMotorProducts,
  getActiveQuoteInsurers,
  lookupVehicleWithRtsa,
} from '../../services/quote';
import {
  getCustomerVehicleQuotePrefill,
  listCustomerVehicles,
  type CustomerVehicleRecord,
} from '../../services/vehicles';
import { API_BASE_URL } from '../../config/env';
import { useAuth } from '../../store/auth-context';
import { saveGuestQuoteSession } from '../../store/quote-draft';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../utils/errors';
import { InsuranceSelectionStep } from './InsuranceSelectionStep';
import { InsurerLogo } from './InsurerLogo';
import { QuoteChrome } from './QuoteChrome';
import { SelectField } from './SelectField';
import { SavedVehiclePicker } from '../vehicles/SavedVehiclePicker';
import { applySavedVehiclePrefill } from '../vehicles/helpers';
import {
  DURATION_OPTIONS,
  FUEL_TYPE_OPTIONS,
  MOTOR_STEPS,
  POLICY_PRODUCT_TYPE_OPTIONS,
  RtsaLookupError,
  createEmptyMotorQuoteForm,
  type MotorProduct,
  type MotorQuoteFormData,
  type MotorStep,
  type QuoteFormErrors,
  type QuoteInsurerOption,
} from './types';
import {
  formatDisplayDate,
  getCoverDayCount,
  getMotorCoverPeriodDetails,
  getPolicyDurationLabel,
  getPolicyProductTypeLabel,
  getRtsaLockedFields,
  getTodayDateString,
  getVehicleFormDataFromRtsa,
  getVisibleVehicleFields,
  hasUsableRtsaVehicleData,
  isUnavailableRtsaValue,
  isValidVehicleLookupNumber,
  matchesSelectedCoverage,
  normalizeLookupUsageType,
  normalizeVehicleLookupNumber,
  resolveInitialCoverPeriodMode,
  sanitizeDecimalInput,
  sanitizeRegistrationInput,
  type VehicleFieldKey,
} from './helpers';
import { validateMotorStep } from './validation';

type MotorQuoteScreenProps = {
  navigation: {
    goBack: () => void;
    navigate: (name: 'QuoteResults' | 'Vehicles', params?: { quoteRequestId: string }) => void;
    getState?: () => { routeNames?: string[] };
  };
};

const RTSA_DATE_LABELS = new Set([
  'First Registration Date',
  'Road Tax Expiry Date',
  'Current Licence Expiry Date',
  'Roadworthiness Expiry Date',
  'Registration Anniversary Date',
]);

const STEP_COPY: Record<MotorStep, { title: string; description: string }> = {
  lookup: {
    title: 'Vehicle lookup',
    description: 'Start with the registration number and we will try RTSA first.',
  },
  vehicle: {
    title: 'Confirm vehicle details',
    description: 'Check the prefilled details or complete the missing fields manually.',
  },
  coverage: {
    title: 'Motor cover details',
    description: 'Choose vehicle use first, then select the relevant cover path for this quote.',
  },
  contact: {
    title: 'Contact details',
    description: 'Add the essentials so we can return the right quotes.',
  },
  review: {
    title: 'Review your request',
    description: 'Give everything a final check before opening the quote results.',
  },
};

export function MotorQuoteScreen({ navigation }: MotorQuoteScreenProps) {
  const { session } = useAuth();
  const route = useRoute();
  const routeParams = (route.params ?? {}) as {
    customerVehicleId?: string;
    skipSavedPicker?: boolean;
  };
  const incomingVehicleId = routeParams.customerVehicleId;
  const { width: windowWidth } = useWindowDimensions();
  const insurerCardWidth = Math.floor((windowWidth - spacing.xl * 2 - spacing.sm * 2) / 3);
  const scrollRef = useRef<ScrollView>(null);
  const [insuranceLineSelected, setInsuranceLineSelected] = useState(Boolean(incomingVehicleId));
  const [step, setStep] = useState<MotorStep>('lookup');
  const [values, setValues] = useState<MotorQuoteFormData>(() => {
    const form = createEmptyMotorQuoteForm(getTodayDateString());
    if (!session?.user) return form;
    return {
      ...form,
      contact: {
        ...form.contact,
        fullName: session.user.fullName || '',
        email: session.user.email || '',
        phone: session.user.mobileNumber || '',
      },
    };
  });
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [insurers, setInsurers] = useState<QuoteInsurerOption[]>([]);
  const [insurersError, setInsurersError] = useState('');
  const [insurersLoading, setInsurersLoading] = useState(true);
  const [products, setProducts] = useState<MotorProduct[]>([]);
  const [productsError, setProductsError] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);
  const [hasExplicitCoverPeriodModeSelection, setHasExplicitCoverPeriodModeSelection] =
    useState(false);
  const [showSavedPicker, setShowSavedPicker] = useState(false);
  const [savedVehicles, setSavedVehicles] = useState<CustomerVehicleRecord[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(() => Boolean(session?.user));
  const [vehiclesError, setVehiclesError] = useState('');
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [prefillError, setPrefillError] = useState('');
  const canOpenVehicles = Boolean(navigation.getState?.()?.routeNames?.includes('Vehicles'));

  const loadSavedVehicles = useCallback(async () => {
    if (!session?.user) {
      setSavedVehicles([]);
      setVehiclesError('');
      setVehiclesLoading(false);
      return;
    }
    setVehiclesLoading(true);
    setVehiclesError('');
    try {
      const result = await listCustomerVehicles({ page: 1, limit: 100 });
      setSavedVehicles(result.data);
      setSelectedSavedId((current) => current || result.data[0]?.id || '');
    } catch {
      setSavedVehicles([]);
      setVehiclesError('Saved vehicles could not be loaded.');
    } finally {
      setVehiclesLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const companies = await getActiveQuoteInsurers();
        if (!cancelled) setInsurers(companies);
      } catch (error) {
        if (!cancelled) {
          setInsurersError(getErrorMessage(error, "We couldn't load active insurers right now."));
        }
      } finally {
        if (!cancelled) setInsurersLoading(false);
      }
    })();
    void (async () => {
      try {
        const nextProducts = await getActiveMotorProducts();
        if (!cancelled) setProducts(nextProducts);
      } catch (error) {
        if (!cancelled) {
          setProductsError(
            getErrorMessage(error, "We couldn't load quote configuration right now."),
          );
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadSavedVehicles();
  }, [loadSavedVehicles]);

  const applyPrefill = useCallback(async (vehicleId: string) => {
    setPrefillLoading(true);
    setPrefillError('');
    try {
      const prefill = await getCustomerVehicleQuotePrefill(vehicleId);
      setValues((current) => applySavedVehiclePrefill(current, prefill));
      setHasExplicitCoverPeriodModeSelection(false);
      setShowSavedPicker(false);
      setStep('vehicle');
    } catch (error) {
      setPrefillError(getErrorMessage(error, 'Unable to load this saved vehicle.'));
      setShowSavedPicker(false);
      setStep('lookup');
    } finally {
      setPrefillLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!incomingVehicleId) return;
    void applyPrefill(incomingVehicleId);
  }, [applyPrefill, incomingVehicleId]);

  const coverPeriodDetails = getMotorCoverPeriodDetails(values.coverage, values.rtsaVehicle);
  const canAlignWithRoadTax =
    values.isRtsaVerified &&
    values.vehicleSource === 'RTSA' &&
    coverPeriodDetails.rtsaAlignment.valid &&
    Boolean(coverPeriodDetails.alignedPolicyDuration);

  useEffect(() => {
    const nextMode = resolveInitialCoverPeriodMode({
      currentMode: values.coverage.coverPeriodMode,
      hasExplicitUserSelection: hasExplicitCoverPeriodModeSelection,
      isRtsaVerified: values.isRtsaVerified,
      vehicleSource: values.vehicleSource,
      rtsaVehicle: values.rtsaVehicle,
      startDate: values.coverage.preferredStartDate,
    });
    if (nextMode !== values.coverage.coverPeriodMode) {
      setValues((current) => ({
        ...current,
        coverage: { ...current.coverage, coverPeriodMode: nextMode },
      }));
    }
  }, [
    hasExplicitCoverPeriodModeSelection,
    values.coverage.coverPeriodMode,
    values.coverage.preferredStartDate,
    values.isRtsaVerified,
    values.rtsaVehicle,
    values.vehicleSource,
  ]);

  const matchedProducts = products.filter((product) => matchesSelectedCoverage(product, values));
  const coverTypeOptions = useMemo(() => {
    const available = coverTypesFromMotorProducts(products);
    if (available.length === 0) {
      return [{ label: 'Third Party', value: 'THIRD_PARTY' as const }];
    }
    return available.map((coverType) => ({ label: coverType.label, value: coverType.code }));
  }, [products]);
  useEffect(() => {
    const allowed = new Set(coverTypeOptions.map((option) => option.value));
    if (values.coverage.coverType && !allowed.has(values.coverage.coverType)) {
      const fallback = coverTypeOptions[0]?.value ?? 'THIRD_PARTY';
      setValues((current) => ({
        ...current,
        coverage: {
          ...current.coverage,
          coverType: fallback,
          currency: fallback === 'THIRD_PARTY' ? 'ZMW' : current.coverage.currency,
        },
      }));
    }
  }, [coverTypeOptions, values.coverage.coverType]);

  const tpProducts = matchedProducts.filter((product) => product.coverageType === 'THIRD_PARTY');
  const hasStandard = tpProducts.some((product) => product.standardLimitTypeEnabled);
  const hasCombined = tpProducts.some((product) => product.combinedLimitTypeEnabled);
  const combinedProduct = tpProducts.find((product) => product.combinedLimitTypeEnabled);
  const requireThirdPartyLimitType =
    values.coverage.coverType === 'THIRD_PARTY' && hasStandard && hasCombined;
  const requireSelectedLiability =
    values.coverage.coverType === 'THIRD_PARTY' &&
    values.coverage.thirdPartyLimitType === 'combined' &&
    Boolean(combinedProduct);
  const comprehensiveCombinedProduct = matchedProducts.find(
    (product) => product.coverageType === 'COMPREHENSIVE' && product.combinedLimitTypeEnabled,
  );
  const comprehensiveCombinedLiabilityMinimum = Number(
    comprehensiveCombinedProduct?.combinedThirdPartyLiability ?? '',
  );
  const comprehensiveCombinedLiabilityMaximum = Number(
    comprehensiveCombinedProduct?.maximumLiability ??
      comprehensiveCombinedProduct?.minimumLiability ??
      '',
  );
  const comprehensiveCombinedLiabilityConfigured =
    Number.isFinite(comprehensiveCombinedLiabilityMinimum) &&
    Number.isFinite(comprehensiveCombinedLiabilityMaximum) &&
    comprehensiveCombinedLiabilityMaximum >= comprehensiveCombinedLiabilityMinimum;
  const lockedFields = getRtsaLockedFields(values.isRtsaVerified ? values.rtsaVehicle : undefined);
  const visibleFields = getVisibleVehicleFields(values, lockedFields);
  const coverPeriodWarning =
    (values.isRtsaVerified && values.vehicleSource === 'RTSA'
      ? coverPeriodDetails.rtsaAlignment.message
      : '') ||
    (values.isRtsaVerified &&
    values.vehicleSource === 'RTSA' &&
    coverPeriodDetails.rtsaAlignment.valid &&
    !coverPeriodDetails.alignedPolicyDuration
      ? 'The RTSA expiry date does not produce a supported cover duration. Please select Manual Duration to continue.'
      : '');
  const coverDayCount =
    coverPeriodDetails.startDate && coverPeriodDetails.endDate
      ? getCoverDayCount(coverPeriodDetails.startDate, coverPeriodDetails.endDate)
      : undefined;

  const validationOptions = {
    requireThirdPartyLimitType,
    requireSelectedLiability,
    minimumLiability: combinedProduct?.minimumLiability,
    maximumLiability: combinedProduct?.maximumLiability,
    requireInsurerSelection: true,
    comprehensiveCombinedLiabilityMinimum,
    comprehensiveCombinedLiabilityMaximum,
    comprehensiveCombinedLiabilityConfigured,
    rtsaAlignment: coverPeriodDetails.rtsaAlignment,
    selectedRtsaExpiryDate: coverPeriodDetails.selectedRtsaExpiryDate,
    coverPeriodDetails,
  };

  useEffect(() => {
    if (values.coverage.coverType !== 'THIRD_PARTY') {
      if (!values.coverage.thirdPartyLimitType && !values.coverage.selectedLiability) return;
      setValues((current) => ({
        ...current,
        coverage: { ...current.coverage, thirdPartyLimitType: '', selectedLiability: '' },
      }));
      return;
    }

    setValues((current) =>
      current.coverage.currency === 'ZMW' && !current.coverage.sumInsured
        ? current
        : {
            ...current,
            coverage: { ...current.coverage, currency: 'ZMW', sumInsured: '' },
          },
    );

    if (hasStandard !== hasCombined && (hasStandard || hasCombined)) {
      const onlyOption = hasCombined && !hasStandard ? 'combined' : 'standard';
      setValues((current) =>
        current.coverage.thirdPartyLimitType === onlyOption
          ? current
          : { ...current, coverage: { ...current.coverage, thirdPartyLimitType: onlyOption } },
      );
    }
  }, [
    hasCombined,
    hasStandard,
    values.coverage.coverType,
    values.coverage.selectedLiability,
    values.coverage.thirdPartyLimitType,
  ]);

  useEffect(() => {
    if (!insuranceLineSelected) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [insuranceLineSelected, step]);

  const startMotorQuote = () => {
    setShowSavedPicker(false);
    setInsuranceLineSelected(true);
    setStep('lookup');
  };

  const startQuoteFromSavedVehicle = (vehicleId: string) => {
    setSelectedSavedId(vehicleId);
    setInsuranceLineSelected(true);
    void applyPrefill(vehicleId);
  };

  const goBack = () => {
    if (!insuranceLineSelected) {
      navigation.goBack();
      return;
    }
    const index = MOTOR_STEPS.findIndex((item) => item.id === step);
    if (index <= 0) {
      setInsuranceLineSelected(false);
      return;
    }
    setStep(MOTOR_STEPS[index - 1].id);
  };

  const goNext = () => {
    const nextErrors = validateMotorStep(step, values, validationOptions);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const index = MOTOR_STEPS.findIndex((item) => item.id === step);
    const next = MOTOR_STEPS[index + 1];
    if (next) setStep(next.id);
  };

  const handleSavedVehicleContinue = async () => {
    if (!selectedSavedId) return;
    await applyPrefill(selectedSavedId);
  };

  const handleLookup = async () => {
    const normalized = normalizeVehicleLookupNumber(values.registrationNumber);
    if (!normalized) {
      setErrors({ registrationNumber: 'Vehicle number is required.' });
      return;
    }
    if (!isValidVehicleLookupNumber(normalized)) {
      setErrors({
        registrationNumber:
          'Vehicle number must contain both letters and numbers, with no special characters.',
      });
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const result = await lookupVehicleWithRtsa(normalized);
      if (!hasUsableRtsaVehicleData(result)) {
        setValues((current) => ({
          ...current,
          customerVehicleId: undefined,
          registrationNumber: normalized,
          vehicleSource: 'Manual',
          vehicleDataSource: 'MANUAL',
          isRtsaVerified: false,
          rtsaVehicle: undefined,
        }));
        setLookupError(
          'Vehicle details could not be retrieved from RTSA. Please enter the vehicle details manually.',
        );
        setStep('vehicle');
        return;
      }
      setValues((current) => ({
        ...current,
        customerVehicleId: undefined,
        registrationNumber: normalizeVehicleLookupNumber(result.registrationNumber || normalized),
        vehicleSource: 'RTSA',
        vehicleDataSource: 'RTSA',
        isRtsaVerified: true,
        rtsaVehicle: result,
        manualVehicle: getVehicleFormDataFromRtsa(result),
        coverage: {
          ...current.coverage,
          coverPeriodMode: resolveInitialCoverPeriodMode({
            currentMode: current.coverage.coverPeriodMode,
            hasExplicitUserSelection: false,
            isRtsaVerified: true,
            vehicleSource: 'RTSA',
            rtsaVehicle: result,
            startDate: current.coverage.preferredStartDate,
          }),
          policyProductType:
            normalizeLookupUsageType(result.usageType) ?? current.coverage.policyProductType,
        },
      }));
      setHasExplicitCoverPeriodModeSelection(false);
      setStep('vehicle');
    } catch (error) {
      setValues((current) => ({
        ...current,
        customerVehicleId: undefined,
        registrationNumber: normalized,
        vehicleSource: 'Manual',
        vehicleDataSource: 'MANUAL',
        isRtsaVerified: false,
        rtsaVehicle: undefined,
      }));
      setLookupError(
        error instanceof RtsaLookupError
          ? error.message
          : 'Vehicle details could not be found from RTSA. You may enter the details manually.',
      );
      setStep('vehicle');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateMotorStep('review', values, validationOptions);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitLoading(true);
    try {
      const result = await createMotorQuoteRequest(values);
      saveGuestQuoteSession({
        quoteRequestId: result.id,
        displayQuoteReference: result.reference,
        quoteRequestData: values,
      });
      navigation.navigate('QuoteResults', { quoteRequestId: result.id });
    } catch (error) {
      setSubmitError(getErrorMessage(error, "We couldn't create the quote request."));
    } finally {
      setSubmitLoading(false);
    }
  };

  const updateCoverage = <K extends keyof MotorQuoteFormData['coverage']>(
    field: K,
    value: MotorQuoteFormData['coverage'][K],
  ) => {
    if (field === 'coverPeriodMode') setHasExplicitCoverPeriodModeSelection(true);
    setValues((current) => ({
      ...current,
      coverage: { ...current.coverage, [field]: value },
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleInsurer = (company: QuoteInsurerOption) => {
    setValues((current) => {
      const alreadySelected = current.insurerSelection.selectedCompanyIds.includes(company.id);
      const ids = alreadySelected
        ? current.insurerSelection.selectedCompanyIds.filter((id) => id !== company.id)
        : [...current.insurerSelection.selectedCompanyIds, company.id];
      const names = alreadySelected
        ? (current.insurerSelection.selectedCompanyNames || []).filter((name) => name !== company.name)
        : [...(current.insurerSelection.selectedCompanyNames || []), company.name];
      return {
        ...current,
        insurerSelection: {
          ...current.insurerSelection,
          selectedCompanyIds: ids,
          selectedCompanyNames: names,
        },
      };
    });
    setErrors((current) => ({ ...current, selectedCompanyIds: undefined }));
  };

  const updateVehicleField = (field: VehicleFieldKey, value: string) => {
    if (field === 'registrationNumber') {
      const sanitized = sanitizeRegistrationInput(value);
      setValues((current) => ({
        ...current,
        registrationNumber: sanitized,
        isRtsaVerified:
          sanitized !== current.registrationNumber ? false : current.isRtsaVerified,
        vehicleSource:
          sanitized !== current.registrationNumber && current.isRtsaVerified
            ? 'Manual'
            : current.vehicleSource,
      }));
      return;
    }
    setValues((current) => {
      const manualVehicle = { ...current.manualVehicle, [field]: value };
      if (field === 'yearOfManufacture') manualVehicle.year = value;
      if (field === 'colour') manualVehicle.color = value;
      return { ...current, manualVehicle };
    });
    setErrors((current) => ({ ...current, [field]: undefined, year: undefined, color: undefined }));
  };

  return (
    <View style={[styles.root, !insuranceLineSelected ? styles.selectionRoot : null]}>
      <QuoteChrome
        currentStep={step}
        onBack={goBack}
        showStepper={insuranceLineSelected}
        hideCopy={!insuranceLineSelected}
        title="Get Motor Insurance Quote"
        subtitle="Confirm the vehicle first, then select vehicle use, cover type, and only the customer inputs needed for rating."
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {!insuranceLineSelected ? (
            <InsuranceSelectionStep
              vehicles={session?.user ? savedVehicles : []}
              vehiclesLoading={Boolean(session?.user) && vehiclesLoading}
              vehiclesError={session?.user ? vehiclesError : ''}
              canOpenVehicles={canOpenVehicles}
              quoteFromVehicleLoading={prefillLoading}
              insurers={insurers}
              insurersLoading={insurersLoading}
              onStartMotorQuote={startMotorQuote}
              onQuoteSavedVehicle={startQuoteFromSavedVehicle}
              onRetryVehicles={() => void loadSavedVehicles()}
              onViewAllVehicles={() => navigation.navigate('Vehicles')}
            />
          ) : null}

          {insuranceLineSelected ? (
            <>
          <Text style={styles.eyebrow}>
            {showSavedPicker && step === 'lookup' ? 'Choose a vehicle' : STEP_COPY[step].title}
          </Text>
          <Text style={styles.stepDescription}>
            {showSavedPicker && step === 'lookup'
              ? 'Select a saved vehicle to continue, or look up another registration.'
              : STEP_COPY[step].description}
          </Text>
          {prefillError ? <ErrorMessage message={prefillError} /> : null}

          {step === 'lookup' ? (
            <View style={styles.section}>
              {showSavedPicker ? (
                <SavedVehiclePicker
                  vehicles={savedVehicles}
                  selectedId={selectedSavedId}
                  onSelect={setSelectedSavedId}
                  onContinue={() => void handleSavedVehicleContinue()}
                  onLookupAnother={() => {
                    setShowSavedPicker(false);
                    setValues((current) => ({ ...current, customerVehicleId: undefined }));
                  }}
                  loading={prefillLoading}
                />
              ) : (
                <>
              <Input
                label="Registration number"
                value={values.registrationNumber}
                error={errors.registrationNumber}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                placeholder="e.g. BAX4455ZM"
                onChangeText={(value) =>
                  setValues((current) => ({
                    ...current,
                    registrationNumber: sanitizeRegistrationInput(value),
                  }))
                }
              />
              <Button
                label={lookupLoading ? 'Checking RTSA vehicle records...' : 'Look Up Vehicle'}
                variant="cta"
                loading={lookupLoading}
                disabled={lookupLoading || !API_BASE_URL.trim()}
                onPress={() => void handleLookup()}
              />
              {!API_BASE_URL.trim() ? (
                <ErrorMessage message="API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in mobile/.env, then stop Expo and run npx expo start --clear." />
              ) : null}
              {lookupError ? <ErrorMessage message={lookupError} /> : (
                <Text style={styles.helper}>
                  We'll try RTSA first, then you can switch to manual entry if needed.
                </Text>
              )}
              <Pressable onPress={() => setStep('vehicle')} hitSlop={12} style={styles.linkButton}>
                <Text style={styles.link}>Enter details manually / New vehicle</Text>
              </Pressable>
              {savedVehicles.length > 0 ? (
                <Pressable onPress={() => setShowSavedPicker(true)} hitSlop={12} style={styles.linkButton}>
                  <Text style={styles.link}>Choose a saved vehicle</Text>
                </Pressable>
              ) : null}
                </>
              )}
            </View>
          ) : null}

          {step === 'vehicle' ? (
            <View style={styles.section}>
              {lookupError ? <ErrorMessage message={lookupError} /> : null}
              {values.isRtsaVerified && values.rtsaVehicle ? (
                <Card>
                  <Text style={styles.verified}>RTSA match found</Text>
                  {([
                    ['Registration Number', values.rtsaVehicle.registrationNumber],
                    ['Make', values.rtsaVehicle.make],
                    ['Model', values.rtsaVehicle.model],
                    ['Year of Manufacture', values.rtsaVehicle.yearOfManufacture || values.rtsaVehicle.year],
                    ['Colour', values.rtsaVehicle.colour || values.rtsaVehicle.color],
                    ['Engine Number', values.rtsaVehicle.engineNumber],
                    ['Chassis Number', values.rtsaVehicle.chassisNumber],
                    ['First Registration Date', values.rtsaVehicle.firstRegDate],
                    ['Registration Status', values.rtsaVehicle.registrationStatus],
                    ['Vehicle Type', values.rtsaVehicle.vehicleType],
                    ['Body type', values.rtsaVehicle.bodyType],
                    ['Fuel type', values.rtsaVehicle.fuelType],
                    ['Road Tax Expiry Date', values.rtsaVehicle.roadTaxExpiryDate],
                    ['Current Licence Expiry Date', values.rtsaVehicle.currentLicenseExpiryDate],
                    ['Roadworthiness Expiry Date', values.rtsaVehicle.roadworthinessExpiryDate],
                    ['Registration Anniversary Date', values.rtsaVehicle.registrationAnniversaryDate],
                    ['GVM', values.rtsaVehicle.gvm],
                    ['Number of Seats', values.rtsaVehicle.numberOfSeats],
                    ['Vehicle Use', values.rtsaVehicle.usageType],
                  ] as Array<[string, string | undefined]>).map(([label, value]) =>
                    isUnavailableRtsaValue(value) ? null : (
                      <View key={label} style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>
                          {RTSA_DATE_LABELS.has(label) ? formatDisplayDate(value) || value : value}
                        </Text>
                      </View>
                    ),
                  )}
                </Card>
              ) : lookupError ? null : (
                <Text style={styles.manualBanner}>
                  Vehicle could not be retrieved from RTSA. Please enter vehicle details manually.
                </Text>
              )}
              {visibleFields.includes('registrationNumber') ? (
                <Input
                  label="Registration Number (optional for new vehicles)"
                  value={values.registrationNumber}
                  error={errors.registrationNumber}
                  editable={!lockedFields.registrationNumber}
                  autoCapitalize="characters"
                  onChangeText={(value) => updateVehicleField('registrationNumber', value)}
                />
              ) : null}
              {visibleFields.includes('make') ? (
                <Input label="Make" value={values.manualVehicle.make} error={errors.make} editable={!lockedFields.make} onChangeText={(value) => updateVehicleField('make', value)} />
              ) : null}
              {visibleFields.includes('model') ? (
                <Input label="Model" value={values.manualVehicle.model} error={errors.model} editable={!lockedFields.model} onChangeText={(value) => updateVehicleField('model', value)} />
              ) : null}
              {visibleFields.includes('yearOfManufacture') ? (
                <Input label="Year of Manufacture" value={values.manualVehicle.yearOfManufacture || values.manualVehicle.year} error={errors.year} keyboardType="number-pad" maxLength={4} editable={!lockedFields.yearOfManufacture} onChangeText={(value) => updateVehicleField('yearOfManufacture', value)} />
              ) : null}
              {visibleFields.includes('colour') ? (
                <Input label="Colour" value={values.manualVehicle.colour || values.manualVehicle.color} error={errors.color} editable={!lockedFields.colour} onChangeText={(value) => updateVehicleField('colour', value)} />
              ) : null}
              {visibleFields.includes('engineNumber') ? (
                <Input label="Engine Number" value={values.manualVehicle.engineNumber || ''} editable={!lockedFields.engineNumber} onChangeText={(value) => updateVehicleField('engineNumber', value)} />
              ) : null}
              {visibleFields.includes('chassisNumber') ? (
                <Input label="Chassis Number" value={values.manualVehicle.chassisNumber || ''} error={errors.chassisNumber} editable={!lockedFields.chassisNumber} onChangeText={(value) => updateVehicleField('chassisNumber', value)} />
              ) : null}
              {visibleFields.includes('firstRegDate') ? (
                <DatePickerField
                  label="First Registration Date"
                  value={values.manualVehicle.firstRegDate || ''}
                  error={errors.firstRegDate}
                  placeholder="Select date"
                  editable={!lockedFields.firstRegDate}
                  maximumDate={getTodayDateString()}
                  minimumDate="1900-01-01"
                  onChange={(value) => updateVehicleField('firstRegDate', value)}
                />
              ) : null}
              {visibleFields.includes('registrationStatus') ? (
                <Input label="Registration Status" value={values.manualVehicle.registrationStatus || ''} editable={!lockedFields.registrationStatus} onChangeText={(value) => updateVehicleField('registrationStatus', value)} />
              ) : null}
              {visibleFields.includes('vehicleType') ? (
                <Input label="Vehicle Type" value={values.manualVehicle.vehicleType || ''} editable={!lockedFields.vehicleType} onChangeText={(value) => updateVehicleField('vehicleType', value)} />
              ) : null}
              {visibleFields.includes('bodyType') ? (
                <Input label="Body type" value={values.manualVehicle.bodyType || ''} editable={!lockedFields.bodyType} onChangeText={(value) => updateVehicleField('bodyType', value)} />
              ) : null}
              {visibleFields.includes('fuelType') ? (
                <SelectField
                  label="Fuel type"
                  value={values.manualVehicle.fuelType || ''}
                  options={FUEL_TYPE_OPTIONS}
                  onChange={(value) => updateVehicleField('fuelType', value)}
                />
              ) : null}
              <View style={styles.actions}>
                <Button label="Back" variant="outline" onPress={goBack} />
                <Button label="Continue" variant="cta" onPress={goNext} />
              </View>
            </View>
          ) : null}

          {step === 'coverage' ? (
            <View style={styles.section}>
              {productsLoading ? (
                <Text style={styles.helper}>Loading motor quote configuration...</Text>
              ) : null}
              {productsError ? <ErrorMessage message={productsError} /> : null}
              <Text style={styles.requiredHint}>Highlighted fields with * must be completed.</Text>
              <SelectField
                label="Vehicle use"
                required
                value={values.coverage.policyProductType}
                options={POLICY_PRODUCT_TYPE_OPTIONS}
                error={errors.policyProductType}
                onChange={(value) => updateCoverage('policyProductType', value as MotorQuoteFormData['coverage']['policyProductType'])}
              />
              <SelectField
                label="Cover type"
                required
                value={values.coverage.coverType}
                options={coverTypeOptions}
                error={errors.coverType}
                onChange={(value) => {
                  updateCoverage('coverType', value as MotorQuoteFormData['coverage']['coverType']);
                  if (value === 'THIRD_PARTY') updateCoverage('currency', 'ZMW');
                }}
              />
              <SelectField
                label="Policy currency"
                required
                value={values.coverage.currency}
                options={[
                  { label: 'ZMW', value: 'ZMW' },
                  { label: 'USD', value: 'USD', disabled: values.coverage.coverType === 'THIRD_PARTY' },
                ]}
                error={errors.currency}
                onChange={(value) => updateCoverage('currency', value as MotorQuoteFormData['coverage']['currency'])}
              />

              <Text style={styles.sectionTitle}>Cover Period</Text>
              <Text style={styles.helper}>
                Choose a manual duration or align the insurance period with RTSA road tax dates.
              </Text>
              {coverPeriodWarning ? (
                <Text style={styles.manualBanner}>{coverPeriodWarning}</Text>
              ) : null}
              <SelectField
                label="Cover period option"
                required
                value={values.coverage.coverPeriodMode}
                error={errors.coverPeriodMode}
                options={[
                  { label: 'Manual Duration', value: 'MANUAL_DURATION' },
                  {
                    label: 'Align with Road Tax',
                    value: 'ALIGN_WITH_ROAD_TAX',
                    disabled: !canAlignWithRoadTax,
                  },
                ]}
                onChange={(value) =>
                  updateCoverage('coverPeriodMode', value as MotorQuoteFormData['coverage']['coverPeriodMode'])
                }
              />
              <DatePickerField
                label="Start Date"
                required
                value={values.coverage.preferredStartDate}
                error={errors.preferredStartDate}
                placeholder="Select date"
                helper="Cover can start from today onwards. Backdating is not allowed."
                minimumDate={getTodayDateString()}
                onChange={(value) => updateCoverage('preferredStartDate', value)}
              />
              {values.coverage.coverPeriodMode === 'MANUAL_DURATION' ? (
                <SelectField
                  label="Policy Duration"
                  required
                  value={values.coverage.policyDuration}
                  options={DURATION_OPTIONS}
                  error={errors.policyDuration}
                  onChange={(value) =>
                    updateCoverage('policyDuration', value as MotorQuoteFormData['coverage']['policyDuration'])
                  }
                />
              ) : (
                <Card>
                  {/* <Text style={styles.detailLabel}>Aligned with RTSA Expiry</Text>
                  <Text style={styles.helper}>
                    {coverPeriodDetails.alignmentMessage ||
                      'Insurance period aligned with the RTSA expiry date.'}
                  </Text> */}
                  <Text style={styles.detailLabel}>RTSA Expiry Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDisplayDate(coverPeriodDetails.selectedRtsaExpiryDate) || 'Not available'}
                  </Text>
                  <Text style={styles.detailLabel}>Calculated Duration</Text>
                  <Text style={styles.detailValue}>
                    {getPolicyDurationLabel(coverPeriodDetails.alignedPolicyDuration) || 'Not available'}
                  </Text>
                  <Text style={styles.detailLabel}>Calculated Insurance Expiry Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDisplayDate(coverPeriodDetails.endDate) || 'Not available'}
                  </Text>
                </Card>
              )}
              {values.coverage.coverPeriodMode === 'MANUAL_DURATION' ? (
              <Text style={styles.helper}>
                Calculated End Date:{' '}
                {coverPeriodDetails.endDate
                  ? `${getPolicyDurationLabel(values.coverage.policyDuration)} | ${formatDisplayDate(coverPeriodDetails.endDate)}`
                  : 'Select start date and policy duration.'}
              </Text>
              ) : null}
              {values.coverage.coverType === 'COMPREHENSIVE' && coverDayCount ? (
                <Text style={styles.helper}>
                  Number of Days: {coverDayCount} | Premium Method: Pro-rata
                </Text>
              ) : null}

              {values.coverage.coverType === 'COMPREHENSIVE' ? (
                <>
                  <Input
                    label="Sum insured"
                    required
                    value={values.coverage.sumInsured}
                    error={errors.sumInsured}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => updateCoverage('sumInsured', sanitizeDecimalInput(value))}
                  />
                  <SelectField
                    label="Third Party Liability Type"
                    required
                    value={values.coverage.thirdPartyLiabilityType}
                    options={[
                      { label: 'Standard Limits', value: 'STANDARD' },
                      { label: 'Combined Single Limit', value: 'COMBINED' },
                    ]}
                    error={errors.thirdPartyLiabilityType}
                    onChange={(value) =>
                      updateCoverage(
                        'thirdPartyLiabilityType',
                        value as MotorQuoteFormData['coverage']['thirdPartyLiabilityType'],
                      )
                    }
                  />
                  {values.coverage.thirdPartyLiabilityType === 'COMBINED' ? (
                    <Input
                      label="Combined liability amount"
                      required
                      value={values.coverage.combinedLiabilityAmount}
                      error={errors.combinedLiabilityAmount}
                      keyboardType="number-pad"
                      onChangeText={(value) => updateCoverage('combinedLiabilityAmount', value.replace(/\D/g, ''))}
                    />
                  ) : null}
                </>
              ) : null}

              {values.coverage.coverType === 'THIRD_PARTY' ? (
                <>
                  {requireThirdPartyLimitType ? (
                    <SelectField
                      label="Third-party limit type"
                      required
                      value={values.coverage.thirdPartyLimitType}
                      options={[
                        { label: 'Standard', value: 'standard' },
                        { label: 'Combined', value: 'combined' },
                      ]}
                      error={errors.thirdPartyLimitType}
                      onChange={(value) =>
                        updateCoverage(
                          'thirdPartyLimitType',
                          value as MotorQuoteFormData['coverage']['thirdPartyLimitType'],
                        )
                      }
                    />
                  ) : (
                    <Card>
                      <Text style={styles.detailLabel}>Third-party limit type</Text>
                      <Text style={styles.helper}>
                        {values.coverage.thirdPartyLimitType === 'combined'
                          ? 'Combined limit pricing is the only available option for the matched products.'
                          : 'Standard third-party limits are the only available option for the matched products.'}
                      </Text>
                    </Card>
                  )}
                  {requireSelectedLiability ? (
                    <>
                      <Input
                        label="Liability amount"
                        required
                        value={values.coverage.selectedLiability}
                        error={errors.selectedLiability}
                        keyboardType="decimal-pad"
                        placeholder={combinedProduct?.minimumLiability || '0.00'}
                        onChangeText={(value) =>
                          updateCoverage('selectedLiability', sanitizeDecimalInput(value))
                        }
                      />
                      <Card>
                        <Text style={styles.detailLabel}>Combined limit pricing</Text>
                        <Text style={styles.helper}>
                          Minimum liability: {combinedProduct?.minimumLiability || 'Not configured'}
                        </Text>
                        <Text style={styles.helper}>
                          Maximum liability: {combinedProduct?.maximumLiability || 'Not configured'}
                        </Text>
                      </Card>
                    </>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.sectionTitle}>Choose which insurers should respond</Text>
              <SelectField
                label="Quote preference"
                required
                value={values.insurerSelection.quoteScope}
                options={[
                  { label: 'All active insurers', value: 'ALL' },
                  { label: 'Select specific insurers', value: 'SELECTED' },
                ]}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    insurerSelection: {
                      ...current.insurerSelection,
                      quoteScope: value as 'ALL' | 'SELECTED',
                      selectedCompanyIds: value === 'ALL' ? [] : current.insurerSelection.selectedCompanyIds,
                    },
                  }))
                }
              />
              {insurersLoading ? (
                <Text style={styles.helper}>Loading insurers...</Text>
              ) : null}
              {insurersError ? <ErrorMessage message={insurersError} /> : null}
              {values.insurerSelection.quoteScope === 'SELECTED' ? (
                <View style={styles.insurerSection}>
                  <Text style={styles.helper}>Tap one insurer or several. Tap again to remove.</Text>
                  <View style={styles.insurerGrid}>
                    {insurers.map((company) => {
                      const selected = values.insurerSelection.selectedCompanyIds.includes(company.id);
                      return (
                        <Pressable
                          key={company.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={company.name}
                          onPress={() => toggleInsurer(company)}
                          style={[
                            styles.insurerCard,
                            { width: insurerCardWidth },
                            selected ? styles.insurerSelected : null,
                          ]}
                        >
                          {selected ? (
                            <View style={styles.insurerCheck} accessibilityElementsHidden>
                              <Ionicons name="checkmark" size={12} color={colors.white} />
                            </View>
                          ) : null}
                          <InsurerLogo name={company.name} logoUrl={company.logoUrl} size={36} />
                          <Text numberOfLines={2} style={styles.insurerName}>
                            {company.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {errors.selectedCompanyIds ? (
                    <Text style={styles.error}>{errors.selectedCompanyIds}</Text>
                  ) : null}
                </View>
              ) : null}

              {values.coverage.policyProductType &&
              values.coverage.coverType &&
              matchedProducts.length === 0 &&
              !productsLoading &&
              !productsError ? (
                <ErrorMessage message="No active motor products currently match this vehicle use and cover type combination. You can still continue, but the quote results may come back empty until matching products are configured." />
              ) : null}

              <View style={styles.actions}>
                <Button label="Back" variant="outline" onPress={goBack} />
                <Button label="Continue" variant="cta" onPress={goNext} />
              </View>
            </View>
          ) : null}

          {step === 'contact' ? (
            <View style={styles.section}>
              <Input
                label="Full name"
                value={values.contact.fullName}
                error={errors.fullName}
                onChangeText={(value) =>
                  setValues((current) => ({
                    ...current,
                    contact: { ...current.contact, fullName: value },
                  }))
                }
              />
              <Input
                label="Email"
                value={values.contact.email}
                error={errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(value) =>
                  setValues((current) => ({
                    ...current,
                    contact: { ...current.contact, email: value },
                  }))
                }
              />
              <PhoneNumberField
                label="Phone number"
                value={values.contact.phone}
                error={errors.phone}
                onChangeText={(value) =>
                  setValues((current) => ({
                    ...current,
                    contact: { ...current.contact, phone: value },
                  }))
                }
              />
              <Input
                label="Optional notes"
                value={values.contact.notes}
                placeholder="Anything useful for the insurers to know"
                onChangeText={(value) =>
                  setValues((current) => ({
                    ...current,
                    contact: { ...current.contact, notes: value },
                  }))
                }
              />
              <View style={styles.actions}>
                <Button label="Back" variant="outline" onPress={goBack} />
                <Button label="Continue" variant="cta" onPress={goNext} />
              </View>
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.section}>
              <Card>
                <Text style={styles.verified}>Vehicle summary</Text>
                <Text style={styles.helper}>Registration: {values.registrationNumber || 'TBA'}</Text>
                <Text style={styles.helper}>
                  Vehicle: {values.manualVehicle.make} {values.manualVehicle.model}
                </Text>
                <Text style={styles.helper}>
                  Year: {values.manualVehicle.yearOfManufacture || values.manualVehicle.year || '-'}
                </Text>
                <Text style={styles.helper}>Source: {values.vehicleSource}</Text>
              </Card>
              <Card>
                <Text style={styles.verified}>Quote summary</Text>
                <Text style={styles.helper}>
                  Vehicle use: {getPolicyProductTypeLabel(values.coverage.policyProductType)}
                </Text>
                <Text style={styles.helper}>
                  Cover type:{' '}
                  {values.coverage.coverType === 'THIRD_PARTY' ? 'Third Party' : 'Comprehensive'}
                </Text>
                <Text style={styles.helper}>Currency: {values.coverage.currency || '-'}</Text>
                <Text style={styles.helper}>Start Date: {formatDisplayDate(coverPeriodDetails.startDate) || '-'}</Text>
                <Text style={styles.helper}>End Date: {formatDisplayDate(coverPeriodDetails.endDate) || '-'}</Text>
                {values.coverage.coverType === 'COMPREHENSIVE' ? (
                  <>
                    <Text style={styles.helper}>Number of Days: {coverDayCount ?? '-'}</Text>
                    <Text style={styles.helper}>Premium Method: Pro-rata</Text>
                    {values.coverage.sumInsured ? (
                      <Text style={styles.helper}>Sum insured: {values.coverage.sumInsured}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.helper}>
                    Cover Period: {coverPeriodDetails.coverPeriod || '-'}
                  </Text>
                )}
                <Text style={styles.helper}>Customer: {values.contact.fullName}</Text>
                <Text style={styles.helper}>
                  Email / Phone: {values.contact.email} | {values.contact.phone}
                </Text>
              </Card>
              {submitError ? <ErrorMessage message={submitError} /> : null}
              <View style={styles.actions}>
                <Button label="Back" variant="outline" disabled={submitLoading} onPress={goBack} />
                <Button
                  label={submitLoading ? 'Creating Quote...' : 'Submit and See Quotes'}
                  variant="cta"
                  loading={submitLoading}
                  onPress={() => void handleSubmit()}
                />
              </View>
            </View>
          ) : null}
            </>
          ) : null}
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
  selectionRoot: {
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate900,
  },
  stepDescription: {
    ...typography.subtitle,
    color: colors.slate600,
  },
  section: {
    gap: spacing.lg,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
  },
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    ...typography.body,
    color: colors.primaryCta,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  verified: {
    ...typography.label,
    color: colors.sky700,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  detailRow: {
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.slate900,
  },
  manualBanner: {
    ...typography.body,
    color: colors.amber800,
    backgroundColor: colors.amber50,
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.sky700,
    fontWeight: '700',
  },
  requiredHint: {
    ...typography.caption,
    color: colors.sky700,
    fontWeight: '700',
  },
  insurerSection: {
    gap: spacing.sm,
  },
  insurerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  insurerCard: {
    position: 'relative',
    minHeight: 108,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  insurerName: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: colors.slate700,
    textAlign: 'center',
  },
  insurerCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insurerSelected: {
    borderColor: colors.primaryCta,
    backgroundColor: colors.sky50,
  },
  error: {
    ...typography.caption,
    color: colors.rose700,
  },
});

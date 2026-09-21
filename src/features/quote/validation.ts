import { getEmailValidationError, getMobileValidationError } from '../../utils/validation';
import { isFutureRegistrationDate, isPastDate, toIsoDateString } from './helpers';
import type { MotorQuoteFormData, MotorStep, QuoteFormErrors } from './types';

const registrationPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;
const makePattern = /^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$/;
const modelPattern = /^[A-Za-z0-9]+(?:[ ./\\-][A-Za-z0-9]+)*$/;
const colorPattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const chassisPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?$/;
const positiveNumberPattern = /^\d+(?:\.\d{1,2})?$/;
const currentYear = new Date().getFullYear();

export type MotorValidationOptions = {
  requireThirdPartyLimitType?: boolean;
  requireSelectedLiability?: boolean;
  minimumLiability?: string;
  maximumLiability?: string;
  requireInsurerSelection?: boolean;
  comprehensiveCombinedLiabilityMinimum?: number;
  comprehensiveCombinedLiabilityMaximum?: number;
  comprehensiveCombinedLiabilityConfigured?: boolean;
  rtsaAlignment?: { valid: boolean; message: string };
  selectedRtsaExpiryDate?: string;
  coverPeriodDetails?: { endDate?: string; alignedPolicyDuration?: string };
};

export function validateMotorStep(
  step: MotorStep,
  values: MotorQuoteFormData,
  options: MotorValidationOptions = {},
): QuoteFormErrors {
  const errors: QuoteFormErrors = {};

  if (step === 'vehicle' || step === 'review') {
    const vehicle = values.manualVehicle;
    if (!vehicle.make.trim()) errors.make = 'Vehicle make is required.';
    else if (!makePattern.test(vehicle.make.trim())) {
      errors.make = 'Make can only contain letters, numbers, spaces, and hyphens.';
    }
    if (!vehicle.model.trim()) errors.model = 'Vehicle model is required.';
    else if (!modelPattern.test(vehicle.model.trim())) {
      errors.model =
        'Model can only contain letters, numbers, spaces, dots, hyphens, and slashes.';
    }
    const year = (vehicle.yearOfManufacture || vehicle.year || '').trim();
    if (!year) errors.year = 'Vehicle year is required.';
    else if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > currentYear + 1) {
      errors.year = `Year must be between 1900 and ${currentYear + 1}.`;
    }
    const color = (vehicle.colour || vehicle.color || '').trim();
    if (!color) errors.color = 'Vehicle color is required.';
    else if (!colorPattern.test(color)) {
      errors.color = 'Color can only contain letters and spaces.';
    }
    if (vehicle.chassisNumber && !chassisPattern.test(vehicle.chassisNumber.trim())) {
      errors.chassisNumber = 'Chassis number can only contain letters, numbers, and hyphens.';
    }
    if (vehicle.firstRegDate?.trim() && !toIsoDateString(vehicle.firstRegDate)) {
      errors.firstRegDate = 'First registration date must be a valid date in DD-MM-YYYY format.';
    } else if (isFutureRegistrationDate(vehicle.firstRegDate)) {
      errors.firstRegDate = 'First Registration Date cannot be in the future.';
    }
    const registration = values.registrationNumber?.trim() || '';
    if (registration && !registrationPattern.test(registration)) {
      errors.registrationNumber =
        'Vehicle number must contain both letters and numbers, with no special characters.';
    } else if (!registration && !vehicle.chassisNumber?.trim()) {
      errors.chassisNumber =
        'Chassis number is required when registration number is not provided.';
    }
  }

  if (step === 'coverage' || step === 'review') {
    const coverage = values.coverage;
    if (!coverage.policyProductType) errors.policyProductType = 'Vehicle use is required.';
    if (!coverage.coverType) errors.coverType = 'Cover type is required.';
    if (!coverage.currency) errors.currency = 'Policy currency is required.';
    if (!coverage.coverPeriodMode) errors.coverPeriodMode = 'Cover period option is required.';
    if (!coverage.preferredStartDate.trim()) {
      errors.preferredStartDate = 'Preferred start date is required.';
    } else if (!toIsoDateString(coverage.preferredStartDate)) {
      errors.preferredStartDate = 'Start date must be a valid date in DD-MM-YYYY format.';
    } else if (isPastDate(coverage.preferredStartDate)) {
      errors.preferredStartDate = 'Start date cannot be in the past. Cover can start from today only.';
    }
    if (coverage.coverPeriodMode === 'MANUAL_DURATION' && !coverage.policyDuration) {
      errors.policyDuration = 'Policy duration is required for manual cover period selection.';
    }
    if (coverage.coverType === 'THIRD_PARTY' && coverage.currency !== 'ZMW') {
      errors.currency = 'Third-party cover only supports ZMW.';
    }
    if (coverage.coverType === 'COMPREHENSIVE') {
      if (!coverage.thirdPartyLiabilityType) {
        errors.thirdPartyLiabilityType =
          'Third-party liability type is required for comprehensive cover.';
      }
      if (!coverage.sumInsured.trim()) {
        errors.sumInsured = 'Sum insured is required for comprehensive cover.';
      } else if (
        !positiveNumberPattern.test(coverage.sumInsured.trim()) ||
        Number(coverage.sumInsured) <= 0
      ) {
        errors.sumInsured = 'Sum insured must be a valid positive number.';
      }
      if (coverage.thirdPartyLiabilityType === 'COMBINED') {
        if (options.comprehensiveCombinedLiabilityConfigured === false) {
          errors.combinedLiabilityAmount =
            'Combined liability settings are not configured. Please contact admin.';
        } else if (!coverage.combinedLiabilityAmount.trim()) {
          errors.combinedLiabilityAmount = 'Combined liability amount is required.';
        } else {
          const amount = Number(coverage.combinedLiabilityAmount);
          const minimum = options.comprehensiveCombinedLiabilityMinimum;
          const maximum = options.comprehensiveCombinedLiabilityMaximum;
          if (!Number.isFinite(amount)) {
            errors.combinedLiabilityAmount = 'Combined liability amount must be a valid number.';
          } else if (typeof minimum === 'number' && Number.isFinite(minimum) && amount < minimum) {
            errors.combinedLiabilityAmount = `Combined liability amount must be at least ${minimum}.`;
          } else if (typeof maximum === 'number' && Number.isFinite(maximum) && amount > maximum) {
            errors.combinedLiabilityAmount = `Combined liability amount must not exceed ${maximum}.`;
          } else if (
            typeof minimum === 'number' &&
            Number.isFinite(minimum) &&
            (amount - minimum) % 25000 !== 0
          ) {
            errors.combinedLiabilityAmount =
              'Combined liability amount must increase in steps of 25000.';
          }
        }
      }
    }
    if (
      coverage.coverType === 'THIRD_PARTY' &&
      options.requireThirdPartyLimitType &&
      !coverage.thirdPartyLimitType
    ) {
      errors.thirdPartyLimitType = 'Select the third-party limit type.';
    }
    if (
      coverage.coverType === 'THIRD_PARTY' &&
      coverage.thirdPartyLimitType === 'combined' &&
      options.requireSelectedLiability &&
      !coverage.selectedLiability.trim()
    ) {
      errors.selectedLiability = 'Liability amount is required for combined third-party cover.';
    }
    if (options.requireInsurerSelection && coverage) {
      if (
        values.insurerSelection.quoteScope === 'SELECTED' &&
        values.insurerSelection.selectedCompanyIds.length < 1
      ) {
        errors.selectedCompanyIds = 'Select at least one insurance company.';
      }
    }
    if (coverage.coverPeriodMode === 'ALIGN_WITH_ROAD_TAX') {
      if (!options.rtsaAlignment?.valid) {
        errors.coverPeriodMode =
          options.rtsaAlignment?.message ||
          'Align with Road Tax is unavailable for the selected dates. Please use Manual Duration.';
      } else if (!options.selectedRtsaExpiryDate) {
        errors.coverPeriodMode =
          'Align with Road Tax is unavailable for the selected dates. Please use Manual Duration.';
      } else if (options.coverPeriodDetails?.endDate !== options.selectedRtsaExpiryDate) {
        errors.coverPeriodMode =
          'The calculated insurance expiry date must match the RTSA expiry date when alignment is selected.';
      } else if (!options.coverPeriodDetails?.alignedPolicyDuration) {
        errors.coverPeriodMode =
          'A valid RTSA-aligned duration is unavailable for the selected start date. Please use Manual Duration.';
      }
    }
  }

  if (step === 'contact' || step === 'review') {
    if (!values.contact.fullName.trim()) errors.fullName = 'Full name is required.';
    const emailError = getEmailValidationError(values.contact.email, { required: true });
    if (emailError) errors.email = emailError;
    const phoneError = getMobileValidationError(values.contact.phone);
    if (phoneError) errors.phone = phoneError;
  }

  return errors;
}

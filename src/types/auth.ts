export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export type CustomerSignupRequest = {
  fullName: string;
  email?: string;
  mobileNumber: string;
  nrcOrPassportNumber: string;
  customerType?: CustomerType;
  password: string;
  confirmPassword: string;
  acceptedLegalAgreement: boolean;
  legalAgreementDocumentId: string;
  acceptedMarketing?: boolean;
};

export type VerifyCustomerSignupOtpRequest = {
  signupToken: string;
  otp: string;
  mobileNumber?: string;
  email?: string;
};

export type ResendCustomerSignupOtpRequest = {
  signupToken: string;
  mobileNumber?: string;
  email?: string;
};

export type CustomerSignupInitiation =
  | {
      state: 'PENDING_OTP';
      challenge: CustomerSignupOtpChallenge;
    }
  | {
      state: 'AUTHENTICATED';
      session: CustomerAuthSession;
    };

export type CustomerLoginForm = {
  emailOrMobile: string;
  password: string;
};

export type CustomerSignUpDraft = {
  fullName: string;
  email: string;
  mobileNumber: string;
  customerType: CustomerType;
  password: string;
  confirmPassword: string;
  nrcOrPassportNumber: string;
  acceptedLegalAgreement: boolean;
  acceptedMarketing: boolean;
};

export type CustomerAccountCreationForm = {
  nrcOrPassportNumber: string;
  acceptedLegalAgreement: boolean;
  acceptedMarketing: boolean;
};

export type CustomerForgotPasswordForm = {
  email: string;
};

export type CustomerAuthUser = {
  id: string;
  customerId: string;
  role: string;
  email: string | null;
  fullName: string;
  name: string;
  mobileNumber: string | null;
  customerType: CustomerType | string;
};

export type CustomerAuthSession = {
  accessToken: string;
  user: CustomerAuthUser;
};

export type CustomerLoginOtpChallenge = {
  loginToken: string;
  otpExpiresAt?: string;
  loginExpiresAt?: string;
  otpSent: boolean;
};

export type CustomerSignupOtpChallenge = {
  signupToken: string;
  otpExpiresAt?: string;
  signupExpiresAt?: string;
  otpSent: boolean;
};

export type SignupConsentDocument = {
  id: string;
  title: string;
  version?: string;
  viewUrl?: string;
};

export type AppRole = 'CUSTOMER' | 'AGENT';

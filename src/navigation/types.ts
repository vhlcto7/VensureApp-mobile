import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  CustomerApp: undefined;
  // AgentApp can be added here when agent screens are implemented.
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  AccountCreation: undefined;
  OtpVerification: undefined;
  ForgotPassword: undefined;
  MotorQuote: { customerVehicleId?: string; skipSavedPicker?: boolean } | undefined;
  QuoteResults: { quoteRequestId: string };
  QuoteDetails: { quoteId: string };
  QuoteReview: { quoteId: string };
};

export type CustomerTabParamList = {
  Home: undefined;
  Quotes: undefined;
  Policies: undefined;
  Payments: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  MotorQuote: { customerVehicleId?: string; skipSavedPicker?: boolean } | undefined;
  Vehicles: undefined;
  VehicleDetails: { vehicleId: string };
  VehicleAdd: undefined;
  QuoteResults: { quoteRequestId: string };
  QuoteDetails: { quoteId: string };
  QuoteReview: { quoteId: string };
  QuotePayment: { quoteId: string; transactionRef: string };
  QuotePurchaseSuccess: { policyId: string; quoteId: string };
  CustomerQuoteDetails: { quoteId: string };
  PolicyDetails: { policyId: string };
  PaymentDetails: { transactionId: string };
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type CustomerStackScreenProps<T extends keyof CustomerStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<CustomerStackParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type CustomerTabScreenProps<T extends keyof CustomerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<CustomerTabParamList, T>,
    CustomerStackScreenProps<'CustomerTabs'>
  >;

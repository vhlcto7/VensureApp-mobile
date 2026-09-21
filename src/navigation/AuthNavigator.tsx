import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AccountCreationScreen } from '../features/auth/AccountCreationScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { OtpVerificationScreen } from '../features/auth/OtpVerificationScreen';
import { SignUpScreen } from '../features/auth/SignUpScreen';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { MotorQuoteScreen } from '../features/quote/MotorQuoteScreen';
import { QuoteDetailsScreen } from '../features/quote/QuoteDetailsScreen';
import { QuoteResultsScreen } from '../features/quote/QuoteResultsScreen';
import { QuoteReviewScreen } from '../features/quote/QuoteReviewScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AccountCreation" component={AccountCreationScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MotorQuote" component={MotorQuoteScreen} />
      <Stack.Screen name="QuoteResults" component={QuoteResultsScreen} />
      <Stack.Screen name="QuoteDetails" component={QuoteDetailsScreen} />
      <Stack.Screen name="QuoteReview" component={QuoteReviewScreen} />
    </Stack.Navigator>
  );
}

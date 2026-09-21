import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerHomeScreen } from '../features/dashboard/CustomerHomeScreen';
import { PaymentsScreen } from '../features/payments/PaymentsScreen';
import { PaymentDetailsScreen } from '../features/payments/PaymentDetailsScreen';
import { PoliciesScreen } from '../features/policies/PoliciesScreen';
import { PolicyDetailsScreen } from '../features/policies/PolicyDetailsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { MotorQuoteScreen } from '../features/quote/MotorQuoteScreen';
import { QuoteDetailsScreen } from '../features/quote/QuoteDetailsScreen';
import { QuotePaymentScreen } from '../features/quote/QuotePaymentScreen';
import { QuotePurchaseSuccessScreen } from '../features/quote/QuotePurchaseSuccessScreen';
import { QuoteResultsScreen } from '../features/quote/QuoteResultsScreen';
import { QuoteReviewScreen } from '../features/quote/QuoteReviewScreen';
import { CustomerQuoteDetailsScreen } from '../features/quotes/CustomerQuoteDetailsScreen';
import { QuotesScreen } from '../features/quotes/QuotesScreen';
import { VehicleAddScreen } from '../features/vehicles/VehicleAddScreen';
import { VehicleDetailsScreen } from '../features/vehicles/VehicleDetailsScreen';
import { VehiclesScreen } from '../features/vehicles/VehiclesScreen';
import { colors } from '../theme';
import type { CustomerStackParamList, CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

const TAB_ICONS: Record<
  keyof CustomerTabParamList,
  { default: ComponentProps<typeof Ionicons>['name']; focused: ComponentProps<typeof Ionicons>['name'] }
> = {
  Home: { default: 'home-outline', focused: 'home' },
  Quotes: { default: 'document-text-outline', focused: 'document-text' },
  Policies: { default: 'shield-checkmark-outline', focused: 'shield-checkmark' },
  Payments: { default: 'card-outline', focused: 'card' },
  Profile: { default: 'person-outline', focused: 'person' },
};

function CustomerTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryCta,
        tabBarInactiveTintColor: colors.slate400,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.slate200,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          elevation: 12,
          shadowColor: colors.slate900,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name].focused : TAB_ICONS[route.name].default}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={CustomerHomeScreen} />
      <Tab.Screen name="Quotes" component={QuotesScreen} />
      <Tab.Screen name="Policies" component={PoliciesScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function CustomerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CustomerTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <Stack.Screen name="VehicleAdd" component={VehicleAddScreen} />
      <Stack.Screen name="MotorQuote" component={MotorQuoteScreen} />
      <Stack.Screen name="QuoteResults" component={QuoteResultsScreen} />
      <Stack.Screen name="QuoteDetails" component={QuoteDetailsScreen} />
      <Stack.Screen name="QuoteReview" component={QuoteReviewScreen} />
      <Stack.Screen name="QuotePayment" component={QuotePaymentScreen} />
      <Stack.Screen name="QuotePurchaseSuccess" component={QuotePurchaseSuccessScreen} />
      <Stack.Screen name="CustomerQuoteDetails" component={CustomerQuoteDetailsScreen} />
      <Stack.Screen name="PolicyDetails" component={PolicyDetailsScreen} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
    </Stack.Navigator>
  );
}

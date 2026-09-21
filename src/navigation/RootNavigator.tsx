import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoadingIndicator } from '../components';
import { SupportChatButton } from '../features/support/SupportChatButton';
import { useAuth } from '../store/auth-context';
import { AuthNavigator } from './AuthNavigator';
import { CustomerNavigator } from './CustomerNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status, session } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {session ? (
          <Stack.Screen
            name="CustomerApp"
            component={CustomerNavigator}
            options={{ gestureEnabled: false }}
          />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
      {session ? <SupportChatButton /> : null}
    </View>
  );
}

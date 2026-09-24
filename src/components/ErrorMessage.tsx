import { useEffect } from 'react';
import { Alert } from 'react-native';

type ErrorMessageProps = {
  message?: string | null;
  title?: string;
};

export function ErrorMessage({ message, title = 'Unable to continue' }: ErrorMessageProps) {
  useEffect(() => {
    const text = message?.trim();
    if (!text) return;
    Alert.alert(title, text);
  }, [message, title]);

  return null;
}

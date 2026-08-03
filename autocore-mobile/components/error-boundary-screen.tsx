import { ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ExpoRouterErrorBoundaryProps = {
  error: Error;
  retry: () => void;
};

/**
 * Shows the real stack — expo-router's default only prints the message,
 * which made "Maximum call stack size exceeded" impossible to locate.
 */
export function ErrorBoundary({ error, retry }: ExpoRouterErrorBoundaryProps) {
  const stack = error?.stack ?? String(error);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0d0e12' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>Something went wrong</Text>
        <Text style={{ color: '#f87171', fontSize: 15, fontWeight: '600' }}>{error?.message}</Text>
        <Text
          selectable
          style={{
            color: '#a1a1aa',
            fontSize: 11,
            fontFamily: 'Courier',
            lineHeight: 16,
          }}
        >
          {stack}
        </Text>
        <Pressable
          onPress={retry}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: '#fff',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

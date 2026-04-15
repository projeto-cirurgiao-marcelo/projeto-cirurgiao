import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="specializations" />
      <Stack.Screen name="profile-info" />
    </Stack>
  );
}

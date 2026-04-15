/**
 * Layout do Fórum - Stack navigation para sub-telas
 */

import { Stack } from 'expo-router';

export default function ForumLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="category/[categoryId]/index" />
      <Stack.Screen name="category/[categoryId]/new" />
      <Stack.Screen name="topic/[topicId]" />
    </Stack>
  );
}

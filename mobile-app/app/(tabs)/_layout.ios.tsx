/**
 * Layout das Tabs - iOS
 * NativeTabs com SF Symbols — Liquid Glass automatico no iOS 26+
 */

import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Colors } from '../../src/constants/colors';

export default function TabLayoutIOS() {
  return (
    <NativeTabs tintColor={Colors.accent}>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Início</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="forum">
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <Label>Fórum</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mentor-ia">
        <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        <Label>Mentor</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

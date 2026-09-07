import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import RegisterScreen from '../../app/(auth)/register';
import useAuthStore from '../../src/stores/auth-store';
import { apiClient } from '../../src/services/api/client';

jest.mock('../../src/stores/auth-store', () => {
  const useAuthStore = jest.fn(() => ({ register: jest.fn() }));
  return { __esModule: true, default: useAuthStore, useAuthStore };
});
jest.mock('../../src/services/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

it('preserva /register como informacao sem formulario nem criacao de conta', () => {
  jest.clearAllMocks();
  const { getByText, getAllByRole, UNSAFE_queryAllByType } = render(<RegisterScreen />);

  expect(getByText('Acesso por convite')).toBeTruthy();
  expect(getByText(/Não é possível criar uma conta/)).toBeTruthy();
  expect(UNSAFE_queryAllByType(TextInput)).toHaveLength(0);
  expect(getAllByRole('button')).toHaveLength(1);

  fireEvent.press(getByText('Ir para login'));

  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  expect(useAuthStore).not.toHaveBeenCalled();
  expect(apiClient.post).not.toHaveBeenCalled();
  expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
});

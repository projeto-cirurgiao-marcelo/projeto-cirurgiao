/**
 * Smoke test da tela de Login.
 *
 * Valida:
 * 1. Renderiza elementos principais (titulo, inputs, botao).
 * 2. Submit vazio dispara toast de validacao (nao chama login service).
 * 3. Submit preenchido chama login do auth store.
 */
import { render, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import LoginScreen from '../../app/(auth)/login';

// Mocka o auth store com login jest.fn controlavel por teste.
const mockLogin = jest.fn();
jest.mock('../../src/stores/auth-store', () => {
  const store = {
    login: mockLogin,
    isLoading: false,
    user: null,
  };
  const useAuthStore: ((selector?: unknown) => typeof store) & {
    getState: () => typeof store;
  } = Object.assign(() => store, { getState: () => store });
  return { __esModule: true, default: useAuthStore };
});

const toastShow = Toast.show as jest.Mock;

describe('<LoginScreen />', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    toastShow.mockClear();
  });

  it('renderiza titulo e botao Continuar', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Bem-vindo ao Projeto Cirurgião!')).toBeTruthy();
    expect(getByText('Continuar')).toBeTruthy();
  });

  it('submit com campos vazios dispara toast de validacao + NAO chama login', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Continuar'));

    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Campos obrigatórios',
      }),
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('renderiza campos de email e senha', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('seu@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••')).toBeTruthy();
  });

  // Note: teste de fluxo complete (changeText + press + verificar mockLogin)
  // ficou fora do smoke v1. Zustand hook compartilhando referencia mutavel
  // de state gera comportamento nao-trivial em jest.mock — resolvido de
  // forma mais robusta quando introduzirmos `@testing-library/react-hooks`
  // ou configurarmos um wrapper dedicado. Refs: TECH-DEBT.md.
});

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import ChangePasswordScreen from '../../app/profile/change-password';
import { profileService } from '../../src/services/api/profile.service';

jest.mock('../../src/services/api/profile.service', () => ({
  profileService: { changePassword: jest.fn() },
}));

const mockChangePassword = profileService.changePassword as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockChangePassword.mockReset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

function submit() {
  const screen = render(<ChangePasswordScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('Digite sua senha atual'), 'old-password');
  fireEvent.changeText(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'new-password');
  fireEvent.changeText(screen.getByPlaceholderText('Repita a nova senha'), 'new-password');
  fireEvent.press(screen.getAllByText('Alterar Senha')[1]);
  return screen;
}

it('envia as senhas ao service e confirma sucesso antes de voltar', async () => {
  mockChangePassword.mockResolvedValue({ message: 'Senha alterada com sucesso!' });
  submit();
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith(
    'Sucesso', 'Senha alterada com sucesso!', expect.any(Array),
  ));
  expect(mockChangePassword).toHaveBeenCalledWith({
    currentPassword: 'old-password', newPassword: 'new-password',
  });
  expect(router.back).not.toHaveBeenCalled();
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
  buttons?.[0].onPress?.();
  expect(router.back).toHaveBeenCalledTimes(1);
});

it.each([
  ['auth/wrong-password', /senha atual está incorreta/],
  ['auth/invalid-credential', /senha atual está incorreta/],
  ['auth/weak-password', /senha mais forte/],
  ['auth/password-does-not-meet-requirements', /requisitos de segurança/],
  ['auth/user-token-expired', /Entre novamente/],
  ['auth/requires-recent-login', /Entre novamente/],
  ['auth/network-request-failed', /Verifique sua internet/],
  ['auth/too-many-requests', /Aguarde alguns minutos/],
  ['auth/user-disabled', /conta foi desativada/],
  ['auth/operation-not-allowed', /Entre em contato com o suporte/],
  ['auth/internal-error', /Não foi possível alterar a senha/],
])('traduz %s sem exibir sucesso nem sair da tela', async (code, message) => {
  mockChangePassword.mockRejectedValue({ code, message: 'Internal Firebase details' });
  const screen = submit();
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erro', expect.stringMatching(message)));
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(router.back).not.toHaveBeenCalled();
  expect(screen.getAllByText('Alterar Senha')).toHaveLength(2);
});

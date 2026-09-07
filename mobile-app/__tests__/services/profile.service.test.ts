import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { apiClient } from '../../src/services/api/client';
import { profileService } from '../../src/services/api/profile.service';

jest.mock('firebase/app', () => ({
  FirebaseError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
  updatePassword: jest.fn(),
}));
jest.mock('../../src/services/firebase', () => ({
  auth: { authStateReady: jest.fn(), currentUser: null },
}));
jest.mock('../../src/services/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockAuth = auth as unknown as {
  authStateReady: jest.Mock;
  currentUser: { email: string | null } | null;
};
const mockReauthenticate = reauthenticateWithCredential as jest.Mock;
const mockUpdatePassword = updatePassword as jest.Mock;
const user = { email: 'invited@example.com' };
const credential = { providerId: 'password' };
const data = { currentPassword: 'old-password', newPassword: 'new-password' };

beforeEach(() => {
  jest.resetAllMocks();
  mockAuth.currentUser = user;
  mockAuth.authStateReady.mockResolvedValue(undefined);
  (EmailAuthProvider.credential as jest.Mock).mockReturnValue(credential);
  mockReauthenticate.mockResolvedValue({ user });
  mockUpdatePassword.mockResolvedValue(undefined);
});

afterEach(() => {
  expect(apiClient.post).not.toHaveBeenCalled();
});

it('aguarda restauracao Firebase e reautenticacao antes de atualizar a senha', async () => {
  let restore!: () => void;
  let reauthenticate!: () => void;
  mockAuth.currentUser = null;
  mockAuth.authStateReady.mockImplementation(() => new Promise<void>((resolve) => {
    restore = () => { mockAuth.currentUser = user; resolve(); };
  }));
  mockReauthenticate.mockImplementation(() => new Promise<void>((resolve) => {
    reauthenticate = resolve;
  }));

  const change = profileService.changePassword(data);
  expect(mockAuth.authStateReady).toHaveBeenCalledTimes(1);
  expect(EmailAuthProvider.credential).not.toHaveBeenCalled();
  expect(mockReauthenticate).not.toHaveBeenCalled();
  expect(mockUpdatePassword).not.toHaveBeenCalled();

  restore();
  await Promise.resolve();
  expect(EmailAuthProvider.credential).toHaveBeenCalledWith(user.email, data.currentPassword);
  expect(mockReauthenticate).toHaveBeenCalledWith(user, credential);
  expect(mockUpdatePassword).not.toHaveBeenCalled();

  reauthenticate();
  await expect(change).resolves.toEqual({ message: 'Senha alterada com sucesso!' });
  expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
  expect(mockUpdatePassword).toHaveBeenCalledWith(user, data.newPassword);
});

it.each(['auth/wrong-password', 'auth/invalid-credential', 'auth/network-request-failed'])(
  'nao altera senha quando reautenticacao falha: %s', async (code) => {
    const error = { code };
    mockReauthenticate.mockRejectedValue(error);
    await expect(profileService.changePassword(data)).rejects.toBe(error);
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  },
);

it('recusa sessao sem usuario Firebase', async () => {
  mockAuth.currentUser = null;
  await expect(profileService.changePassword(data)).rejects.toMatchObject({
    code: 'auth/user-token-expired',
  });
  expect(EmailAuthProvider.credential).not.toHaveBeenCalled();
  expect(mockReauthenticate).not.toHaveBeenCalled();
  expect(mockUpdatePassword).not.toHaveBeenCalled();
});

it('recusa usuario sem email', async () => {
  mockAuth.currentUser = { email: null };
  await expect(profileService.changePassword(data)).rejects.toMatchObject({
    code: 'auth/operation-not-allowed',
  });
  expect(mockReauthenticate).not.toHaveBeenCalled();
  expect(mockUpdatePassword).not.toHaveBeenCalled();
});

it('propaga erro do updatePassword sem retornar sucesso', async () => {
  const error = { code: 'auth/weak-password' };
  mockUpdatePassword.mockRejectedValue(error);
  await expect(profileService.changePassword(data)).rejects.toBe(error);
  expect(mockReauthenticate).toHaveBeenCalledTimes(1);
});

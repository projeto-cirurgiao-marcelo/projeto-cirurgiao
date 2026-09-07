import React from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import HelpScreen from '../app/help';
import NativeHelpScreen from '../app/profile/help';
import FAQScreen from '../app/profile/faq';
import * as urls from '../src/constants/urls';

jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

jest.mock('react-native-webview', () => ({
  WebView: jest.fn((props) => {
    const { View } = require('react-native');
    return <View {...props} testID="help-webview" />;
  }),
}));

const originalOS = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  jest.mocked(router.canGoBack).mockReturnValue(false);
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  jest.spyOn(urls, 'helpUrl');
});

afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

describe('/help on iOS', () => {
  it.each([
    undefined,
    '',
    'castracao-descomplicada',
    'unknown-showcase',
    'https://checkout.example.com/product',
    '../checkout?desbloquear=all',
    ['first', 'second'],
  ])('renders only native support for showcase=%j', (showcase) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ showcase } as never);

    const screen = render(<HelpScreen />);

    expect(screen.getByText('Ajuda e Suporte')).toBeTruthy();
    expect(screen.getByText('Perguntas Frequentes')).toBeTruthy();
    expect(screen.getByText('Enviar Email')).toBeTruthy();
    expect(screen.queryByTestId('help-webview')).toBeNull();
    expect(screen.queryByText(/checkout|desbloquear|inscreva-se|comprar/i)).toBeNull();
    expect(WebView).not.toHaveBeenCalled();
    expect(urls.helpUrl).not.toHaveBeenCalled();
    expect(useLocalSearchParams).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('opens the native FAQ and returns using navigation history', () => {
    const screen = render(<HelpScreen />);
    fireEvent.press(screen.getByText('Perguntas Frequentes'));
    expect(router.push).toHaveBeenCalledWith('/profile/faq');

    screen.unmount();
    const faq = render(<FAQScreen />);
    fireEvent.press(faq.getByText('Quais aulas posso assistir?'));
    expect(faq.getByText(/Iniciar um curso n\u00e3o libera automaticamente/)).toBeTruthy();
    jest.mocked(router.canGoBack).mockReturnValue(true);
    fireEvent.press(faq.getByRole('button', { name: 'Voltar' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(WebView).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('keeps the legitimate support mailto', () => {
    const screen = render(<HelpScreen />);
    fireEvent.press(screen.getByText('Enviar Email'));
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'mailto:contato@projetocirurgiao.app?subject=Suporte - App Projeto Cirurgi\u00e3o',
    );
    expect(WebView).not.toHaveBeenCalled();
  });

  it('reports mailto failure without falling back to a web page', async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('No mail app'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = render(<HelpScreen />);
    fireEvent.press(screen.getByText('Enviar Email'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(WebView).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([HelpScreen, NativeHelpScreen])('returns safely from direct support entry (%p)', (Screen) => {
    const screen = render(<Screen />);
    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('uses back when support has history', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    const screen = render(<HelpScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('returns from a direct FAQ entry to /help', () => {
    const screen = render(<FAQScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(router.replace).toHaveBeenCalledWith('/help');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('keeps every FAQ answer native without purchase CTAs or roadmap promises', () => {
    const screen = render(<FAQScreen />);
    const questions = screen.getAllByText(/\?$/);
    for (const question of questions) {
      fireEvent.press(question);
      expect(screen.queryByText(/inscreva-se|checkout|comprar|https?:\/\/|atualiza.*futura|acesso imediato/i)).toBeNull();
    }
    expect(screen.getByText(/Android 7\.0 \(API 24\).*iOS 15\.1/)).toBeTruthy();
    expect(WebView).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});

describe.each(['android', 'web'] as const)('/help on %s', (platform) => {
  it.each([undefined, 'castracao-descomplicada'])('preserves the web route for showcase=%s', (showcase) => {
    Platform.OS = platform;
    jest.mocked(useLocalSearchParams).mockReturnValue({ showcase } as never);
    const screen = render(<HelpScreen />);
    const webview = screen.getByTestId('help-webview');
    const params = new URLSearchParams({ embed: '1' });
    if (showcase) params.set('desbloquear', showcase);
    expect(webview.props.source).toEqual({ uri: `${urls.WEB_URL}/ajuda?${params}` });
    expect(screen.queryByText('Enviar Email')).toBeNull();

    const checkout = 'https://checkout.example.com/product';
    expect(webview.props.onShouldStartLoadWithRequest({ url: checkout })).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledWith(checkout);
    expect(webview.props.onShouldStartLoadWithRequest({ url: urls.WEB_URL + '/ajuda' })).toBe(true);
  });
});

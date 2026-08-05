import { render, screen, act, fireEvent } from '@testing-library/react-native';

import { GelpiCelebrateModal } from '../../../src/components/juice/GelpiCelebrateModal';

/**
 * O DOM component real roda dentro de uma WebView, que não existe em ambiente
 * de teste. O mock expõe o contrato que importa aqui: se `onReady` é chamado
 * (WebView viva) ou não (WebView muda — o caso que travava o quiz no Android).
 */
let mockDomShouldSignalReady = true;

jest.mock('../../../src/components/juice/dom/GelpiCelebrateModalDOM', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onReady }: { onReady?: () => Promise<void> }) => {
      React.useEffect(() => {
        if (mockDomShouldSignalReady) void onReady?.();
      }, []);
      return null;
    },
  };
});

const baseProps = {
  kind: 'correct' as const,
  xpGained: 15,
  comboValue: 1,
  accuracyPct: 100,
  onSelectConfidence: jest.fn(),
  onContinue: jest.fn(),
};

describe('GelpiCelebrateModal — fallback quando a WebView não responde', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDomShouldSignalReady = true;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('não mostra o fallback quando a WebView sinaliza que montou', () => {
    render(<GelpiCelebrateModal {...baseProps} />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Continuar →')).toBeNull();
  });

  it('mostra o fallback nativo quando a WebView fica muda', () => {
    mockDomShouldSignalReady = false;
    render(<GelpiCelebrateModal {...baseProps} />);

    // Antes do timeout, ainda apostamos na WebView.
    expect(screen.queryByText('Continuar →')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(2600);
    });

    expect(screen.getByText('Continuar →')).toBeTruthy();
    expect(screen.getByText('Como você se sentiu?')).toBeTruthy();
  });

  it('fallback permite escolher confiança e avançar — o caminho que destrava o quiz', () => {
    mockDomShouldSignalReady = false;
    const onSelectConfidence = jest.fn();
    const onContinue = jest.fn();

    const { rerender } = render(
      <GelpiCelebrateModal
        {...baseProps}
        onSelectConfidence={onSelectConfidence}
        onContinue={onContinue}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2600);
    });

    fireEvent.press(screen.getByText('Sabia'));
    expect(onSelectConfidence).toHaveBeenCalledWith('KNEW');

    // Sem confiança escolhida o botão fica inerte (espelha o guard do
    // QuizPlayer, que exige selectedConfidence para avançar).
    fireEvent.press(screen.getByText('Continuar →'));
    expect(onContinue).not.toHaveBeenCalled();

    rerender(
      <GelpiCelebrateModal
        {...baseProps}
        selectedConfidence="KNEW"
        onSelectConfidence={onSelectConfidence}
        onContinue={onContinue}
      />,
    );
    fireEvent.press(screen.getByText('Continuar →'));
    expect(onContinue).toHaveBeenCalled();
  });
});

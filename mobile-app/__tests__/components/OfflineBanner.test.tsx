/**
 * Smoke test do OfflineBanner.
 *
 * Valida que:
 * 1. Nao renderiza conteudo quando online (retorna null).
 * 2. Renderiza texto "Sem conexão com a internet" quando rede cai.
 */
import { render, act } from '@testing-library/react-native';
import NetInfoMock from '@react-native-community/netinfo';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';

type NetInfoTestable = typeof NetInfoMock & {
  __emit: (state: { isConnected: boolean; isInternetReachable?: boolean | null }) => void;
};
const NetInfo = NetInfoMock as unknown as NetInfoTestable;

describe('<OfflineBanner />', () => {
  it('nao renderiza banner quando online (default)', () => {
    const { queryByText } = render(<OfflineBanner />);
    expect(queryByText('Sem conexão com a internet')).toBeNull();
  });

  it('renderiza banner quando rede cai', () => {
    const { queryByText } = render(<OfflineBanner />);

    act(() => {
      NetInfo.__emit({ isConnected: false, isInternetReachable: false });
    });

    expect(queryByText('Sem conexão com a internet')).not.toBeNull();
  });
});

import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import WatchVideoScreen from '../../app/course/[id]/watch/[videoId]';
import { videosService } from '../../src/services/api/videos.service';

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams = { id: 'course_1', videoId: 'vid_1' };
let mockFocused = true;

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(() => {
      if (mockFocused) return callback();
    }, [callback, mockFocused]);
  },
}));

jest.mock('../../src/components/video/VideoPlayer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) =>
      React.createElement(View, { ...props, ref, testID: 'player' })),
  };
});
jest.mock('../../src/components/video/VideoActionBar', () => {
  const { View } = require('react-native');
  const React = require('react');
  return { VideoActionBar: (props: any) => React.createElement(View, { ...props, testID: 'actions' }) };
});
jest.mock('../../src/components/video/VideoLessonsList', () => ({ VideoLessonsList: () => null }));
jest.mock('../../src/components/video/VideoSummaries', () => ({ VideoSummaries: () => null }));
jest.mock('../../src/components/video/VideoMaterials', () => ({ VideoMaterials: () => null }));
jest.mock('../../src/components/video/VideoNotes', () => ({ VideoNotes: () => null }));
jest.mock('../../src/components/video/VideoQuiz', () => ({ VideoQuiz: () => null }));
jest.mock('../../src/components/chat/ExpandableFAB', () => ({ ExpandableFAB: () => null }));
jest.mock('../../src/components/chat/ChatModal', () => ({ ChatModal: () => null }));
jest.mock('../../src/components/ui/CustomTabView', () => ({ CustomTabView: () => null }));
jest.mock('../../src/components/course/LockedShowcaseCard', () => ({ openUnlockHelp: jest.fn() }));
jest.mock('../../src/stores/chat-store', () => ({
  __esModule: true,
  default: (selector: (state: any) => unknown) => selector({ modalChatType: null, closeChat: jest.fn() }),
}));
jest.mock('../../src/hooks/useNetworkStatus', () => ({ useNetworkStatus: () => ({ onlineSince: null }) }));
jest.mock('../../src/lib/logger', () => ({ logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../src/services/api/videos.service', () => ({ videosService: { getById: jest.fn() } }));
jest.mock('../../src/services/api/progress.service', () => ({
  progressService: {
    getVideoPosition: jest.fn().mockResolvedValue(0),
    getVideoProgress: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('../../src/services/api/courses.service', () => ({
  coursesService: {
    getById: jest.fn().mockResolvedValue({
      modules: [{ id: 'mod_1', videos: [{ id: 'vid_1' }, { id: 'vid_2' }, { id: 'vid_3' }] }],
    }),
  },
}));

describe('<WatchVideoScreen /> next lesson timer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockParams = { id: 'course_1', videoId: 'vid_1' };
    mockFocused = true;
    (videosService.getById as jest.Mock).mockImplementation(async (id: string) => ({
      id,
      title: 'Aula teste',
      moduleId: 'mod_1',
      hasAccess: true,
      playback: { kind: 'hls', playbackUrl: 'https://cdn.example.com/playlist.m3u8' },
    }));
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  const renderScreen = async () => {
    const screen = render(<WatchVideoScreen />);
    await act(async () => {});
    expect(screen.getByTestId('player')).toBeTruthy();
    return screen;
  };

  it('progress at 95% does not navigate; end schedules only one navigation after 3s', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'progressUpdate', 95, 100);
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('player'), 'ended');
    act(() => jest.advanceTimersByTime(1000));
    fireEvent(screen.getByTestId('player'), 'ended');
    act(() => jest.advanceTimersByTime(1999));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(mockRouter.replace).toHaveBeenCalledWith('/course/course_1/watch/vid_2');
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('cancels navigation on unmount', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'ended');
    screen.unmount();
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('cancels navigation on blur and ignores end events while unfocused', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'ended');
    mockFocused = false;
    screen.rerender(<WatchVideoScreen />);
    fireEvent(screen.getByTestId('player'), 'ended');
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('cancels the old timer on video change and allows the new video to navigate', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'ended');
    mockParams = { ...mockParams, videoId: 'vid_2' };
    screen.rerender(<WatchVideoScreen />);
    await act(async () => {});
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId('player'), 'ended');
    act(() => jest.advanceTimersByTime(3000));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/course/course_1/watch/vid_3');
  });

  it('manual next cancels pending automatic navigation immediately', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'ended');
    fireEvent(screen.getByTestId('actions'), 'next');
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('back cancels pending automatic navigation immediately', async () => {
    const screen = await renderScreen();
    fireEvent(screen.getByTestId('player'), 'ended');
    fireEvent.press(screen.getByTestId('icon-Ionicons-chevron-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('preview cannot schedule navigation even if the player reports end', async () => {
    (videosService.getById as jest.Mock).mockResolvedValueOnce({
      id: 'vid_1', title: 'Preview', moduleId: 'mod_1', hasAccess: false, previewSeconds: 120,
      playback: { kind: 'hls', playbackUrl: 'https://cdn.example.com/playlist.m3u8' },
    });
    const screen = await renderScreen();
    expect(screen.getByTestId('player').props.previewSeconds).toBe(120);
    fireEvent(screen.getByTestId('player'), 'ended');
    act(() => jest.advanceTimersByTime(4000));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Concluída')).toBeNull();
  });
});

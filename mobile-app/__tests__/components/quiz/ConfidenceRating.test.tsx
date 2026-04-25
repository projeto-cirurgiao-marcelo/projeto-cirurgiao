import { render, fireEvent, screen } from '@testing-library/react-native';
import { ConfidenceRating } from '../../../src/components/quiz/ConfidenceRating';

describe('ConfidenceRating', () => {
  it('calls onSelect with KNEW when "Sabia" pressed', () => {
    const onSelect = jest.fn();
    render(<ConfidenceRating onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Sabia'));
    expect(onSelect).toHaveBeenCalledWith('KNEW');
  });

  it('calls onSelect with GUESSED when "Chutei" pressed', () => {
    const onSelect = jest.fn();
    render(<ConfidenceRating onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Chutei'));
    expect(onSelect).toHaveBeenCalledWith('GUESSED');
  });

  it('does not fire when disabled', () => {
    const onSelect = jest.fn();
    render(<ConfidenceRating onSelect={onSelect} disabled />);
    fireEvent.press(screen.getByText('Sabia'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders all 4 options', () => {
    render(<ConfidenceRating onSelect={() => {}} />);
    expect(screen.getByText('Chutei')).toBeTruthy();
    expect(screen.getByText('Achei que sabia')).toBeTruthy();
    expect(screen.getByText('Sabia')).toBeTruthy();
    expect(screen.getByText('Dominei')).toBeTruthy();
  });
});

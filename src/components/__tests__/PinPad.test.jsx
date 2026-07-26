import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PinPad from '../PinPad';

describe('PinPad', () => {
  it('renders a digit button for 0-9', () => {
    render(<PinPad onSubmit={() => {}} />);
    for (let d = 0; d <= 9; d++) {
      expect(screen.getByRole('button', { name: String(d) })).toBeInTheDocument();
    }
  });

  it('calls onSubmit with the 4-digit pin once 4 digits are entered', () => {
    const onSubmit = vi.fn();
    render(<PinPad onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onSubmit).not.toHaveBeenCalled(); // only 3 digits so far

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('clear button resets entered digits without submitting', () => {
    const onSubmit = vi.fn();
    render(<PinPad onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '6' }));

    expect(onSubmit).toHaveBeenCalledWith('3456'); // not '1234', the clear worked
  });
});

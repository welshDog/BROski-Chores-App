import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AvatarColorSwatches from '../AvatarColorSwatches';

describe('AvatarColorSwatches', () => {
  it("calls onChange with the clicked swatch's color", () => {
    const onChange = vi.fn();
    render(<AvatarColorSwatches value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '#4A90D9' }));

    expect(onChange).toHaveBeenCalledWith('#4A90D9');
  });

  it('marks the swatch matching value as pressed, and every other swatch as not', () => {
    render(<AvatarColorSwatches value="#4A90D9" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '#4A90D9' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '#FF6B6B' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders exactly 8 swatches', () => {
    render(<AvatarColorSwatches value="" onChange={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(8);
  });
});

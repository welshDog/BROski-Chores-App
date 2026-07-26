import { useState } from 'react';

export default function PinPad({ onSubmit, digits = 4 }) {
  const [entered, setEntered] = useState('');

  function press(digit) {
    const next = entered + String(digit);
    if (next.length >= digits) {
      onSubmit(next.slice(0, digits));
      setEntered('');
    } else {
      setEntered(next);
    }
  }

  return (
    <div className="max-w-xs mx-auto">
      <div className="text-center text-2xl tracking-widest mb-4" data-testid="pin-display">
        {entered.padEnd(digits, '•').replace(/\d/g, '●')}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 text-2xl font-semibold bg-white rounded-xl shadow hover:bg-gray-100"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setEntered('')}
          className="h-16 text-sm font-medium bg-gray-200 rounded-xl hover:bg-gray-300"
        >
          Clear
        </button>
        <button
          onClick={() => press(0)}
          className="h-16 text-2xl font-semibold bg-white rounded-xl shadow hover:bg-gray-100"
        >
          0
        </button>
      </div>
    </div>
  );
}

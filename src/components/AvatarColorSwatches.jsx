const SWATCHES = ['#FF6B6B', '#4A90D9', '#F5A623', '#7ED321', '#BD10E0', '#50E3C2', '#F8E71C', '#FF7AA2'];

export default function AvatarColorSwatches({ value, onChange }) {
  return (
    <div role="group" aria-label="Avatar color" className="flex gap-2 flex-wrap">
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-pressed={value === color}
          aria-label={color}
          className={`w-8 h-8 rounded-full border-2 transition-colors ${
            value === color ? 'border-gray-800' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

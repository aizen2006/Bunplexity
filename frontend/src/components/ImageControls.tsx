'use client';

import type {
  ImageOptions,
  ImageStyle,
  ImageSize,
  ImageQuality,
  ImageModel,
  ImageOutputFormat,
} from '@/types';
import { IMAGE_STYLES, IMAGE_SIZES, IMAGE_QUALITIES } from '@/types';

interface ImageControlsProps {
  options: ImageOptions;
  onChange: (next: ImageOptions) => void;
  disabled?: boolean;
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-base)',
  border: '1px solid var(--fg-subtle)',
  color: 'var(--fg-primary)',
  fontFamily: 'var(--font-mono)',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ImageControls({ options, onChange, disabled }: ImageControlsProps) {
  const set = <K extends keyof ImageOptions>(key: K, value: ImageOptions[K]) =>
    onChange({ ...options, [key]: value });

  const cls = 'rounded-lg px-2.5 py-1.5 text-xs outline-none disabled:opacity-50 cursor-pointer';

  return (
    <div className="flex flex-wrap gap-3">
      <Field label="Style">
        <select
          className={cls}
          style={selectStyle}
          value={options.style}
          disabled={disabled}
          onChange={e => set('style', e.target.value as ImageStyle)}
        >
          {IMAGE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <Field label="Aspect">
        <select
          className={cls}
          style={selectStyle}
          value={options.size}
          disabled={disabled}
          onChange={e => set('size', e.target.value as ImageSize)}
        >
          {IMAGE_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>

      <Field label="Quality">
        <select
          className={cls}
          style={selectStyle}
          value={options.quality}
          disabled={disabled}
          onChange={e => set('quality', e.target.value as ImageQuality)}
        >
          {IMAGE_QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </Field>

      <Field label="Model">
        <select
          className={cls}
          style={selectStyle}
          value={options.model}
          disabled={disabled}
          onChange={e => set('model', e.target.value as ImageModel)}
        >
          <option value="gpt-image-1">gpt-image-1</option>
          <option value="gpt-image-2">gpt-image-2</option>
        </select>
      </Field>

      <Field label="Format">
        <select
          className={cls}
          style={selectStyle}
          value={options.output_format}
          disabled={disabled}
          onChange={e => set('output_format', e.target.value as ImageOutputFormat)}
        >
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </Field>
    </div>
  );
}

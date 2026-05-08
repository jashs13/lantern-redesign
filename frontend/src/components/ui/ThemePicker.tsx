import { useState, useCallback, useRef, useEffect } from 'react';
import { Palette, X, Copy, RotateCcw } from 'lucide-react';

/**
 * Generate a color scale from a base hex color.
 * Produces lighter and darker variants by mixing with white/black.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function mix(c1: [number, number, number], c2: [number, number, number], t: number): string {
  return rgbToHex(
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  );
}

function generateScale(base: string) {
  const rgb = hexToRgb(base);
  const black: [number, number, number] = [0, 0, 0];
  const white: [number, number, number] = [255, 255, 255];
  return {
    950: mix(rgb, black, 0.4),
    900: base,
    800: mix(rgb, white, 0.15),
    700: mix(rgb, white, 0.3),
    600: mix(rgb, white, 0.45),
    500: mix(rgb, white, 0.55),
    400: mix(rgb, white, 0.65),
    300: mix(rgb, white, 0.8),
  };
}

/** Inject a <style> tag that overrides Tailwind's compiled navy-* classes. */
function applyTailwindOverrides(id: string, scale: Record<number, string>, prefix: string) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }

  // Build CSS that overrides Tailwind's bg-navy-*, text-navy-*, border-navy-* etc.
  const rules = Object.entries(scale)
    .map(([shade, hex]) => {
      return [
        `.${prefix}-${shade} { --tw-bg-opacity:1; background-color: ${hex} !important; }`,
        `.text-${prefix}-${shade} { color: ${hex} !important; }`,
        `.border-${prefix}-${shade} { border-color: ${hex} !important; }`,
      ].join('\n');
    })
    .join('\n');

  el.textContent = rules;
}

function applyCssVarOverrides(scale: Record<number, string>) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary-darkest', scale[950]);
  root.style.setProperty('--color-primary-dark', scale[900]);
  root.style.setProperty('--color-primary', scale[700]);
  root.style.setProperty('--color-primary-light', scale[400]);
  root.style.setProperty('--color-primary-lighter', scale[300]);
}

function clearOverrides() {
  const root = document.documentElement;
  ['--color-primary-darkest', '--color-primary-dark', '--color-primary', '--color-primary-light', '--color-primary-lighter'].forEach(
    (p) => root.style.removeProperty(p),
  );
  document.getElementById('theme-picker-sidebar')?.remove();
  document.getElementById('theme-picker-header')?.remove();
}

const PRESETS = [
  { label: 'Current', sidebar: '#051359', header: '#051359' },
  { label: 'USWDS', sidebar: '#162e51', header: '#162e51' },
  { label: 'HealthIT Teal', sidebar: '#003947', header: '#003947' },
  { label: 'Deep Indigo', sidebar: '#1a1054', header: '#1a1054' },
  { label: 'Classic Navy', sidebar: '#0b1a3e', header: '#0b1a3e' },
  { label: 'Charcoal', sidebar: '#1c2331', header: '#1c2331' },
];

export function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarColor, setSidebarColor] = useState('#051359');
  const [headerColor, setHeaderColor] = useState('#051359');
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const applyColors = useCallback((sidebar: string, header: string) => {
    const sidebarScale = generateScale(sidebar);
    const headerScale = generateScale(header);

    // Sidebar overrides: target bg-navy-950 (sidebar bg) and related shades
    applyTailwindOverrides('theme-picker-sidebar', sidebarScale, 'bg-navy');

    // Header uses bg-navy-900, so override that specifically
    const headerStyle = document.getElementById('theme-picker-header') || (() => {
      const el = document.createElement('style');
      el.id = 'theme-picker-header';
      document.head.appendChild(el);
      return el;
    })();
    headerStyle.textContent = `
      header.bg-navy-900 { background-color: ${header} !important; }
      aside.bg-navy-900 { background-color: ${sidebar} !important; }
      thead.bg-navy-900 { background-color: ${headerScale[900]} !important; }
      .text-navy-900 { color: ${sidebarScale[900]} !important; }
      .text-navy-700 { color: ${sidebarScale[700]} !important; }
      .border-navy-700 { border-color: ${sidebarScale[700]} !important; }
    `;

    applyCssVarOverrides(sidebarScale);
  }, []);

  // Apply on mount and when colors change
  useEffect(() => {
    applyColors(sidebarColor, headerColor);
  }, [sidebarColor, headerColor, applyColors]);

  const handleReset = () => {
    clearOverrides();
    setSidebarColor('#051359');
    setHeaderColor('#051359');
    // Re-apply defaults after a tick
    setTimeout(() => applyColors('#051359', '#051359'), 10);
  };

  const handleCopy = () => {
    const text = `Sidebar: ${sidebarColor}\nHeader: ${headerColor}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePreset = (sidebar: string, header: string) => {
    setSidebarColor(sidebar);
    setHeaderColor(header);
  };

  // Cleanup on unmount
  useEffect(() => () => clearOverrides(), []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg hover:shadow-xl transition-shadow border border-neutral-200"
        title="Open theme picker"
        style={{ borderWidth: 2 }}
      >
        <Palette size={22} />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-[9999] w-72 rounded-lg bg-white shadow-xl border border-neutral-200"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-neutral-800">
          <Palette size={16} />
          Theme Picker
        </div>
        <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600">
          <X size={16} />
        </button>
      </div>

      {/* Color pickers */}
      <div className="space-y-4 px-4 py-4">
        {/* Sidebar color */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Sidebar
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sidebarColor}
              onChange={(e) => setSidebarColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
            />
            <input
              type="text"
              value={sidebarColor}
              onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setSidebarColor(e.target.value); }}
              className="flex-1 rounded border border-neutral-200 px-2 py-1 font-mono text-xs text-neutral-700"
              maxLength={7}
            />
          </div>
        </div>

        {/* Header color */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Top Nav
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={headerColor}
              onChange={(e) => setHeaderColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-neutral-200 p-0.5"
            />
            <input
              type="text"
              value={headerColor}
              onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setHeaderColor(e.target.value); }}
              className="flex-1 rounded border border-neutral-200 px-2 py-1 font-mono text-xs text-neutral-700"
              maxLength={7}
            />
          </div>
        </div>

        {/* Generated scale preview */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Scale Preview</div>
          <div className="flex gap-0.5 rounded overflow-hidden">
            {Object.entries(generateScale(sidebarColor)).map(([shade, hex]) => (
              <div
                key={shade}
                className="h-6 flex-1"
                style={{ backgroundColor: hex }}
                title={`${shade}: ${hex}`}
              />
            ))}
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Presets</div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.sidebar, p.header)}
                className="flex items-center gap-1.5 rounded border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.sidebar }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
        >
          <RotateCcw size={12} />
          Reset
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded bg-neutral-800 px-3 py-1 text-xs font-semibold text-white hover:bg-neutral-700"
        >
          <Copy size={12} />
          {copied ? 'Copied!' : 'Copy Values'}
        </button>
      </div>
    </div>
  );
}

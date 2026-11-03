import type { ReactNode } from 'react';

/**
 * Standard "About this data" info box — gives each page context on where its
 * data comes from. Mirrors the .info pattern in the design mockups.
 */
export function AboutDataNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-100 px-4 py-3.5 text-[13.5px] text-neutral-700">
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-700 text-[13px] font-bold text-white">
        i
      </span>
      <p>{children}</p>
    </div>
  );
}

'use client';

import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export function StreamCopyButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
      }}
      className="btn-ghost min-h-10 px-3 py-2 text-xs"
    >
      <Copy size={14} />
      Copy
    </button>
  );
}

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export type ActionFeedbackTone = 'loading' | 'success' | 'error' | 'info';

export interface ActionFeedbackState {
  tone: ActionFeedbackTone;
  title: string;
  detail?: string;
}

interface ActionFeedbackProps extends ActionFeedbackState {
  className?: string;
}

const TONE_STYLES: Record<ActionFeedbackTone, string> = {
  loading:
    'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]',
  success:
    'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]',
  error:
    'border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.1)] text-[var(--text-primary)]',
  info:
    'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-primary)]',
};

function getToneIcon(tone: ActionFeedbackTone): ReactNode {
  if (tone === 'loading') {
    return <Loader2 size={16} className="animate-spin" />;
  }

  if (tone === 'success') {
    return <CheckCircle2 size={16} />;
  }

  if (tone === 'error') {
    return <AlertTriangle size={16} />;
  }

  return <Info size={16} />;
}

export function ActionFeedback({
  tone,
  title,
  detail,
  className = '',
}: ActionFeedbackProps) {
  const role = tone === 'error' ? 'alert' : 'status';
  const liveMode = tone === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={liveMode}
      className={`rounded-2xl border px-4 py-3 ${TONE_STYLES[tone]} ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0">{getToneIcon(tone)}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {detail ? (
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

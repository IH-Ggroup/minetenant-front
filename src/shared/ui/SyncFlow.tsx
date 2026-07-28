import { classNames } from '@/shared/lib/class-names';

interface SyncFlowProps {
  activeStep?: number;
}

const steps = ['Web', '共通データ', 'Minecraft'];

export function SyncFlow({ activeStep = 3 }: SyncFlowProps) {
  return (
    <ol className="sync-flow" aria-label="Minecraft同期の予定フロー">
      {steps.map((step, index) => (
        <li
          key={step}
          className={classNames(index + 1 <= activeStep && 'is-active')}
        >
          <span>{step}</span>
          {index < steps.length - 1 && <b aria-hidden="true">→</b>}
        </li>
      ))}
    </ol>
  );
}

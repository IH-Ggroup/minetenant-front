import { classNames } from '@/shared/lib/class-names';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  label?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  label = '進行状況',
}: StepIndicatorProps) {
  return (
    <nav className="steps" aria-label={label}>
      <ol>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          return (
            <li
              key={step}
              className={classNames(
                stepNumber === currentStep && 'is-current',
                stepNumber < currentStep && 'is-complete',
              )}
              aria-current={stepNumber === currentStep ? 'step' : undefined}
            >
              <span>{stepNumber}</span>
              {step}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface BaseOnboardingStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  translationKey: string;
}

export interface OnboardingStep extends BaseOnboardingStep {
  position?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  offset?: number;
}

export interface OnboardingProps<T extends BaseOnboardingStep> {
  steps: T[];
  onComplete?: () => void;
  onSkip?: () => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

export interface OnboardingComponentProps {
  steps: OnboardingStep[];
  onComplete?: () => void;
  storageKey?: string;
  autoStart?: boolean;
} 
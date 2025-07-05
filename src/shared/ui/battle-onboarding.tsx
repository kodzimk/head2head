import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { X, ArrowRight, ArrowLeft, Swords, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BattleOnboardingStep {
  id: string;
  target: string;
  translationKey: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: { x: number; y: number };
}

interface BattleOnboardingProps {
  steps: BattleOnboardingStep[];
  onComplete: () => void;
  storageKey: string;
  autoStart?: boolean;
}

export default function BattleOnboarding({ steps, onComplete, storageKey, autoStart = true }: BattleOnboardingProps) {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Skip onboarding on mobile devices
  useEffect(() => {
    if (isMobile && isActive) {
      setIsActive(false);
      if (storageKey) {
        localStorage.setItem(storageKey, 'completed');
      }
      onComplete?.();
    }
  }, [isMobile, isActive, storageKey, onComplete]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && !isMobile) {
      const hasCompletedOnboarding = storageKey ? localStorage.getItem(storageKey) === 'completed' : false;
      if (!hasCompletedOnboarding) {
        setIsActive(true);
      }
    }
  }, [autoStart, storageKey, isMobile]);

  // Disable scrolling and interactions when onboarding is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
      
      const disableInteractions = (e: Event) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-onboarding]') && !target.closest('.fixed.z-\\[10000\\]')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      document.addEventListener('click', disableInteractions, true);
      document.addEventListener('touchstart', disableInteractions, true);
      document.addEventListener('keydown', disableInteractions, true);
      
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        
        document.removeEventListener('click', disableInteractions, true);
        document.removeEventListener('touchstart', disableInteractions, true);
        document.removeEventListener('keydown', disableInteractions, true);
      };
    }
  }, [isActive]);

  // Find target element and update position when step changes
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    
    const findElementAndHighlight = async () => {
      let element: HTMLElement | null = null;
      let retryCount = 0;
      const maxRetries = 15;
      
      while (!element && retryCount < maxRetries) {
        element = document.querySelector(step.target) as HTMLElement;
        
        if (element) {
          break;
        }
        
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!element) {
        console.warn('[Battle Onboarding] Element not found:', step.target);
        return;
      }

      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );

      if (!isInViewport) {
        const bodyStyle = document.body.style;
        const wasLocked = bodyStyle.overflow === 'hidden';
        
        if (wasLocked) {
          bodyStyle.overflow = 'auto';
          bodyStyle.position = 'static';
          bodyStyle.top = 'auto';
          bodyStyle.width = 'auto';
        }
        
        element.scrollIntoView({ behavior: 'instant', block: 'center' });
        
        if (wasLocked) {
          bodyStyle.overflow = 'hidden';
          bodyStyle.position = 'fixed';
          bodyStyle.top = `-${window.scrollY}px`;
          bodyStyle.width = '100%';
        }
      }

      setTargetElement(element);
      const newRect = element.getBoundingClientRect();
      setElementRect(newRect);
      
      const position = calculateTooltipPosition(step, newRect);
      setTooltipPosition(position);
    };

    findElementAndHighlight();
  }, [currentStep, isActive, steps]);

  const calculateTooltipPosition = (step: BattleOnboardingStep, rect: DOMRect) => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const margin = 20;
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let position = step.position || 'auto';
    let x = 0;
    let y = 0;
    
    if (position === 'auto') {
      const spaceAbove = rect.top;
      const spaceBelow = viewport.height - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewport.width - rect.right;
      
      if (spaceBelow >= tooltipHeight + margin) {
        position = 'bottom';
      } else if (spaceAbove >= tooltipHeight + margin) {
        position = 'top';
      } else if (spaceRight >= tooltipWidth + margin) {
        position = 'right';
      } else if (spaceLeft >= tooltipWidth + margin) {
        position = 'left';
      } else {
        position = 'bottom';
      }
    }
    
    setActualPosition(position as 'top' | 'bottom' | 'left' | 'right');
    
    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2 - tooltipWidth / 2;
        y = rect.top - tooltipHeight - margin;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2 - tooltipWidth / 2;
        y = rect.bottom + margin;
        break;
      case 'left':
        x = rect.left - tooltipWidth - margin;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        x = rect.right + margin;
        y = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
    }
    
    x = Math.max(margin, Math.min(x, viewport.width - tooltipWidth - margin));
    y = Math.max(margin, Math.min(y, viewport.height - tooltipHeight - margin));
    
    if (step.offset) {
      x += step.offset.x;
      y += step.offset.y;
    }
    
    return { x, y };
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'completed');
    }
    onComplete?.();
  };

  const handleSkip = () => {
    setIsActive(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'completed');
    }
    onComplete?.();
  };

  if (!isActive || !steps[currentStep] || !targetElement || !elementRect) {
    return null;
  }

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9999]" />
      
      {/* Highlight */}
      <div
        className="fixed border-4 border-primary rounded-lg shadow-2xl z-[10000] pointer-events-none animate-pulse"
        style={{
          left: elementRect.left - 4,
          top: elementRect.top - 4,
          width: elementRect.width + 8,
          height: elementRect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
        }}
      />
      
      {/* Tooltip */}
      <Card
        className="fixed z-[10000] w-80 bg-card/95 backdrop-blur-sm border-primary/20 shadow-2xl"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
        }}
        data-onboarding
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                {step.id === 'battle-page-overview' && <Swords className="w-4 h-4 text-primary" />}
                {step.id === 'create-battle-section' && <Plus className="w-4 h-4 text-primary" />}
                {step.id === 'join-battle-section' && <Users className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t(`${step.translationKey}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(`${step.translationKey}.description`)}
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.previous')}
              </Button>
              
              <Button
                onClick={handleNext}
                size="sm"
                className="gap-2"
              >
                {isLastStep ? t('common.finish') : t('common.next')}
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
} 
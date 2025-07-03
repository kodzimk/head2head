import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Target, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileOnboardingStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  translationKey: string; // Key for i18n translation
  position?: 'top' | 'bottom' | 'center';
  offset?: { x: number; y: number };
}

interface MobileOnboardingProps {
  steps: MobileOnboardingStep[];
  onComplete: () => void;
  storageKey: string;
  autoStart?: boolean;
}

export default function MobileOnboarding({ 
  steps, 
  onComplete, 
  storageKey, 
  autoStart = true 
}: MobileOnboardingProps) {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  console.log('[Mobile Onboarding] 📱 COMPONENT RENDERED WITH:', {
    stepsCount: steps.length,
    autoStart,
    storageKey,
    isActive,
    isMobile,
    currentStep,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'undefined'
  });

  // Force mobile detection for debugging
  React.useEffect(() => {
    console.log('[Mobile Onboarding] DEBUGGING - Force checking mobile state');
    console.log('[Mobile Onboarding] Current window width:', window.innerWidth);
    console.log('[Mobile Onboarding] Is mobile (< 768):', window.innerWidth < 768);
    console.log('[Mobile Onboarding] autoStart:', autoStart);
    console.log('[Mobile Onboarding] isActive:', isActive);
    
    // Force set mobile for testing if screen is small
    if (window.innerWidth < 768) {
      console.log('[Mobile Onboarding] FORCING mobile detection to true');
      setIsMobile(true);
    }
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      console.log('[Mobile Onboarding] Screen width:', window.innerWidth, 'Is Mobile:', isMobileDevice);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  // Auto-start effect for mobile devices ONLY - SIMPLIFIED
  useEffect(() => {
    console.log('[Mobile Onboarding] 📱 MOBILE-ONLY AUTO-START CHECK:', {
      autoStart,
      isMobile,
      windowWidth: window.innerWidth
    });
    
    if (autoStart && isMobile) {
      console.log('[Mobile Onboarding] ✅ Auto-start triggered for mobile device (screen < 768px)');
      setIsActive(true);
    } else if (!isMobile) {
      console.log('[Mobile Onboarding] ❌ Not a mobile device (screen >= 768px), deactivating mobile onboarding');
      setIsActive(false);
    }
  }, [autoStart, isMobile]);

  // Find target element and update position when step changes
  useEffect(() => {
    if (!isActive || !steps[currentStep] || !isMobile) return;

    const step = steps[currentStep];
    console.log('[Mobile Onboarding] Step changed to:', step.id, step.target);

    const findElementAndHighlight = async () => {
      console.log('[Mobile Onboarding] Finding element:', step.target);
      
      // Try to find element with retries
      let element: HTMLElement | null = null;
      let retryCount = 0;
      const maxRetries = 15;
      
      while (!element && retryCount < maxRetries) {
        element = document.querySelector(step.target) as HTMLElement;
        
        if (element) {
          console.log('[Mobile Onboarding] Element found on attempt', retryCount + 1);
          break;
        }
        
        retryCount++;
        console.log(`[Mobile Onboarding] Retry ${retryCount}/${maxRetries} for element:`, step.target);
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!element) {
        console.warn('[Mobile Onboarding] Element not found after all retries:', step.target);
        console.log('[Mobile Onboarding] Automatic step skipping disabled - onboarding will wait for user action');
        return;
      }

      // Check if element is in viewport
      const rect = element.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );

      // Calculate position first
      setElementRect(rect);
      setTargetElement(element);

      // If element is not in viewport, instantly scroll to it
      if (!isInViewport) {
        console.log('[Mobile Onboarding] Element out of viewport, scrolling into view');
        
        // Instant scroll without smooth behavior
        element.scrollIntoView({
          behavior: 'instant',
          block: 'center',
          inline: 'center'
        });

        // Get updated rect after scrolling
        const updatedRect = element.getBoundingClientRect();
        if (updatedRect.top !== rect.top || updatedRect.left !== rect.left) {
          setElementRect(updatedRect);
        }
      }
    };

    findElementAndHighlight();
  }, [currentStep, isActive, steps, isMobile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Dispatch step change event before changing step
      window.dispatchEvent(new CustomEvent('onboardingStepChange', {
        detail: { stepIndex: currentStep + 1 }
      }));
      
      // Wait for tab transition before changing step
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 100);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      // Dispatch step change event before changing step
      window.dispatchEvent(new CustomEvent('onboardingStepChange', {
        detail: { stepIndex: currentStep - 1 }
      }));
      
      // Wait for tab transition before changing step
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
      }, 100);
    }
  };

  const handleComplete = () => {
    console.log('[Mobile Onboarding] 📱 Onboarding completed');
    setIsActive(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'completed');
    }
    onComplete?.();
  };

  const handleSkip = () => {
    console.log('[Mobile Onboarding] 📱 Onboarding skipped');
    setIsActive(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'completed');
    }
    onComplete?.();
  };

  // Calculate tooltip position for mobile with better viewport handling
  const getTooltipPosition = () => {
    if (!elementRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const step = steps[currentStep];
    const position = step.position || 'bottom';
    const offset = step.offset || { x: 0, y: 0 };
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Tooltip dimensions
    const tooltipWidth = Math.min(280, viewportWidth - 32); // Max 280px but leave 16px margin on each side
    const tooltipHeight = 200; // Estimated height
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = Math.max(16, elementRect.top - tooltipHeight - 20 + offset.y);
        left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, elementRect.left + elementRect.width / 2 - tooltipWidth / 2 + offset.x));
        // If tooltip would go above viewport, place it below instead
        if (top < 16) {
          top = elementRect.bottom + 20 + offset.y;
        }
        break;
      case 'bottom':
        top = elementRect.bottom + 20 + offset.y;
        left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, elementRect.left + elementRect.width / 2 - tooltipWidth / 2 + offset.x));
        // If tooltip would go below viewport, place it above instead
        if (top + tooltipHeight > viewportHeight - 16) {
          top = Math.max(16, elementRect.top - tooltipHeight - 20 + offset.y);
        }
        break;
      case 'center':
      default:
        // Always center in viewport for center position
        top = Math.max(16, Math.min(viewportHeight - tooltipHeight - 16, viewportHeight / 2 - tooltipHeight / 2 + offset.y));
        left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, viewportWidth / 2 - tooltipWidth / 2 + offset.x));
        break;
    }

    // Ensure tooltip never goes out of bounds
    top = Math.max(16, Math.min(viewportHeight - tooltipHeight - 16, top));
    left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, left));

    return { 
      top: `${top}px`, 
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      maxHeight: `${Math.min(tooltipHeight, viewportHeight - 32)}px`
    };
  };

  // Render highlight overlay for mobile
  const renderMobileHighlight = () => {
    if (!targetElement || !elementRect) return null;

    const padding = 8;
    
    return (
      <>
        {/* Dark overlay with cutout */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity duration-300 z-[9997]"
          style={{
            clipPath: `polygon(
              0% 0%, 
              0% 100%, 
              ${elementRect.left - padding}px 100%, 
              ${elementRect.left - padding}px ${elementRect.top - padding}px, 
              ${elementRect.right + padding}px ${elementRect.top - padding}px, 
              ${elementRect.right + padding}px ${elementRect.bottom + padding}px, 
              ${elementRect.left - padding}px ${elementRect.bottom + padding}px, 
              ${elementRect.left - padding}px 100%, 
              100% 100%, 
              100% 0%
            )`
          }}
        />
        
        {/* Highlight border */}
        <div
          className="fixed pointer-events-none z-[9998] transition-all duration-300"
          style={{
            left: elementRect.left - padding,
            top: elementRect.top - padding,
            width: elementRect.width + padding * 2,
            height: elementRect.height + padding * 2,
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
          }}
        />
      </>
    );
  };


  // Simple mobile-only render conditions
  console.log('[Mobile Onboarding] 🔍 SIMPLE RENDER CHECK:', {
    isMobile,
    isActive,
    hasSteps: !!steps[currentStep],
    windowWidth: window.innerWidth,
    willRender: isMobile && isActive && steps[currentStep]
  });
  
  // Only render on mobile devices (screen < 768px)
  if (!isMobile) {
    console.log('[Mobile Onboarding] ❌ Not rendering - not a mobile device (screen >= 768px)');
    return null;
  }
  
  if (!isActive) {
    console.log('[Mobile Onboarding] ❌ Not rendering - not active');
    return null;
  }
  
  if (!steps[currentStep]) {
    console.log('[Mobile Onboarding] ❌ Not rendering - no current step');
    return null;
  }
  
  console.log('[Mobile Onboarding] ✅ RENDERING - Mobile device with active onboarding');
  
  if (!targetElement || !elementRect) {
    console.log('[Mobile Onboarding] No target element found, showing fallback onboarding');
    
    console.log('[Mobile Onboarding] 📱 Showing fallback mobile onboarding without element targeting');
    // Show fallback onboarding without element highlighting
    const step = steps[currentStep];
    
    return (
      <>
        {/* Fallback dark overlay without cutout */}
        <div className="fixed inset-0 bg-black/70 transition-opacity duration-300 z-[9997]" />
        
        {/* Mobile tooltip */}
        <div
          ref={tooltipRef}
          className="fixed z-[10000] bg-card border border-border rounded-xl shadow-2xl p-4 transition-all duration-300 overflow-hidden"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'calc(100% - 32px)',
            width: '280px'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {currentStep + 1}/{steps.length}
              </span>
            </div>
            <button 
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3 overflow-y-auto max-h-32">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-xs mb-1 leading-tight">
                  {t(`dashboard.onboarding.${step.translationKey}.title`)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {t(`dashboard.onboarding.${step.translationKey}.description`)}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {t('common.previous')}
            </button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              {currentStep === steps.length - 1 ? t('common.finish') : t('common.next')}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </>
    );
  }

  const step = steps[currentStep];
  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {renderMobileHighlight()}
      
      {/* Mobile tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] bg-card border border-border rounded-xl shadow-2xl p-4 transition-all duration-300 overflow-hidden"
        style={tooltipPosition}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {currentStep + 1}/{steps.length}
            </span>
          </div>
          <button 
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 overflow-y-auto max-h-32">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-xs mb-1 leading-tight">
                {t(`dashboard.onboarding.${step.translationKey}.title`)}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                {t(`dashboard.onboarding.${step.translationKey}.description`)}
              </p>
            </div>
          </div>
        </div>

                   {/* Controls */}
           <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
             <button
               onClick={handlePrevious}
               disabled={currentStep === 0}
               className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               <ArrowLeft className="w-3 h-3" />
               {t('onboarding.previous')}
             </button>

             <div className="flex gap-1">
               {steps.map((_, index) => (
                 <div
                   key={index}
                   className={`w-1.5 h-1.5 rounded-full transition-colors ${
                     index === currentStep ? 'bg-primary' : 'bg-muted'
                   }`}
                 />
               ))}
             </div>

             <button
               onClick={handleNext}
               className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
             >
               {currentStep === steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
               <ArrowRight className="w-3 h-3" />
             </button>
           </div>
      </div>
    </>
  );
} 
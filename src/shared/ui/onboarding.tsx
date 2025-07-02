import { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { X, ArrowRight, ArrowLeft, Target, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OnboardingStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  translationKey: string; // Key for i18n translation
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: { x: number; y: number };
}

interface OnboardingProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  storageKey: string;
  autoStart?: boolean;
}

export default function Onboarding({ steps, onComplete, storageKey, autoStart = true }: OnboardingProps) {
  const { t } = useTranslation();
  
  // Early mobile detection - skip onboarding completely for mobile devices
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // If mobile device, skip onboarding entirely
  if (isMobile) {
    return null;
  }

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Restart function for manual activation
  const restart = () => {
    console.log('[Onboarding] Manual restart triggered');
    setCurrentStep(0);
    setIsActive(true);
  };

  // Expose restart function globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).restartOnboarding = restart;
    }
  }, []);

  // Disable scrolling and interactions when onboarding is active
  useEffect(() => {
    if (isActive) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.width = '100%';
      
      // Disable all interactions except onboarding
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
        // Re-enable scrolling
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        
        // Re-enable interactions
        document.removeEventListener('click', disableInteractions, true);
        document.removeEventListener('touchstart', disableInteractions, true);
        document.removeEventListener('keydown', disableInteractions, true);
      };
    }
  }, [isActive]);

  // Check if onboarding has been completed and start immediately
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(storageKey);
    console.log(`[Onboarding] Checking storage key "${storageKey}":`, hasCompletedOnboarding);
    console.log(`[Onboarding] AutoStart:`, autoStart);
    console.log(`[Onboarding] Steps available:`, steps.length);
    
    if (!hasCompletedOnboarding && autoStart && steps.length > 0) {
      console.log(`[Onboarding] Starting onboarding immediately for ${storageKey}`);
      setIsActive(true);
      setCurrentStep(0);
    } else {
      console.log(`[Onboarding] Skipping onboarding - completed: ${hasCompletedOnboarding}, autoStart: ${autoStart}, steps: ${steps.length}`);
    }
  }, [storageKey, autoStart, steps.length]);

  // Find target element and update position when step changes
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    console.log('[Onboarding] Step changed to:', step.id, step.target);

    // Auto-switch tabs based on onboarding step content
    const handleTabSwitching = () => {
      if (step.id === 'battle-history-content' || step.id === 'battle-stats-content') {
        console.log('[Onboarding] Switching to battles tab for content demonstration');
        
        // Look specifically for the battles tab within the TabsList
        const tabsList = document.querySelector('[data-onboarding="dashboard-tabs"] [role="tablist"]') || 
                        document.querySelector('[data-onboarding="dashboard-tabs"] div[class*="TabsList"]') ||
                        document.querySelector('[data-onboarding="dashboard-tabs"] div:first-child');
        
        let battlesTab: HTMLElement | null = null;
        
        if (tabsList) {
          console.log('[Onboarding] Found tabs container, searching within it...');
          
          // Look for battles tab within the tabs container only
          const tabButtons = tabsList.querySelectorAll('button');
          for (const button of tabButtons) {
            const value = button.getAttribute('value');
            const text = button.textContent?.toLowerCase() || '';
            
            if (value === 'battles' || text.includes('my battles')) {
              battlesTab = button as HTMLElement;
              console.log('[Onboarding] Found battles tab within tabs container:', text);
              break;
            }
          }
        } else {
          console.warn('[Onboarding] Could not find tabs container!');
          
          // Fallback: try direct selectors but be more specific
          const selectors = [
            'button[value="battles"][role="tab"]',
            '[role="tab"][value="battles"]',
            'button[value="battles"]:not([class*="btn-neon"])'  // Exclude Quick Battle button
          ];
          
          for (const selector of selectors) {
            battlesTab = document.querySelector(selector) as HTMLElement;
            if (battlesTab) {
              console.log(`[Onboarding] Found battles tab with fallback selector: ${selector}`);
              break;
            }
          }
        }
        
        if (battlesTab) {
          console.log('[Onboarding] Clicking battles tab...');
          battlesTab.click();
          
          // Force trigger events if click doesn't work
          battlesTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          battlesTab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        } else {
          console.warn('[Onboarding] Battles tab not found with any selector!');
          console.log('[Onboarding] Available elements:', document.querySelectorAll('button'));
        }
        
      } else if (step.id === 'friends-list-content') {
        console.log('[Onboarding] Switching to friends tab for content demonstration');
        
        // Look specifically for the friends tab within the TabsList
        const tabsList = document.querySelector('[data-onboarding="dashboard-tabs"] [role="tablist"]') || 
                        document.querySelector('[data-onboarding="dashboard-tabs"] div[class*="TabsList"]') ||
                        document.querySelector('[data-onboarding="dashboard-tabs"] div:first-child');
        
        let friendsTab: HTMLElement | null = null;
        
        if (tabsList) {
          console.log('[Onboarding] Found tabs container, searching within it...');
          
          // Look for friends tab within the tabs container only
          const tabButtons = tabsList.querySelectorAll('button');
          for (const button of tabButtons) {
            const value = button.getAttribute('value');
            const text = button.textContent?.toLowerCase() || '';
            
            if (value === 'friends' || text.includes('friends') || text.includes('social')) {
              friendsTab = button as HTMLElement;
              console.log('[Onboarding] Found friends tab within tabs container:', text);
              break;
            }
          }
        } else {
          console.warn('[Onboarding] Could not find tabs container!');
          
          // Fallback: try direct selectors but be more specific
          const selectors = [
            'button[value="friends"][role="tab"]',
            '[role="tab"][value="friends"]'
          ];
          
          for (const selector of selectors) {
            friendsTab = document.querySelector(selector) as HTMLElement;
            if (friendsTab) {
              console.log(`[Onboarding] Found friends tab with fallback selector: ${selector}`);
              break;
            }
          }
        }
        
        if (friendsTab) {
          console.log('[Onboarding] Clicking friends tab...');
          friendsTab.click();
          
          // Force trigger events if click doesn't work
          friendsTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          friendsTab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        } else {
          console.warn('[Onboarding] Friends tab not found with any selector!');
          console.log('[Onboarding] Available elements:', document.querySelectorAll('button'));
        }
      }
    };

    // Handle tab switching first, then find element
    handleTabSwitching();

    // Simple and reliable element finding with better scrolling
    const findElementAndScroll = async () => {
      console.log('[Onboarding] Finding element:', step.target);
      
      // Try to find element with retries
      let element: HTMLElement | null = null;
      let retryCount = 0;
      const maxRetries = 15;
      
      while (!element && retryCount < maxRetries) {
        element = document.querySelector(step.target) as HTMLElement;
        
        if (element) {
          console.log('[Onboarding] Element found on attempt', retryCount + 1);
          break;
        }
        
        retryCount++;
        console.log(`[Onboarding] Retry ${retryCount}/${maxRetries} for element:`, step.target);
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!element) {
        console.warn('[Onboarding] Element not found after all retries:', step.target);
        // Skip to next step if element not found
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleComplete();
        }
        return;
      }
      
      // Element found, now scroll to it
      console.log('[Onboarding] Scrolling element into view...');
      
      // Store current body state
      const bodyStyle = document.body.style;
      const wasLocked = bodyStyle.overflow === 'hidden';
      let originalScrollY = 0;
      
      if (wasLocked) {
        // Temporarily unlock body for smooth scrolling
        originalScrollY = parseInt(bodyStyle.top?.replace('-', '') || '0');
        bodyStyle.overflow = '';
        bodyStyle.position = '';
        bodyStyle.top = '';
        bodyStyle.width = '';
        window.scrollTo(0, originalScrollY);
      }
      
      // Use modern scrollIntoView for smooth, reliable scrolling
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (wasLocked) {
        // Re-lock body with new scroll position
        const newScrollY = window.pageYOffset || document.documentElement.scrollTop;
        bodyStyle.overflow = 'hidden';
        bodyStyle.position = 'fixed';
        bodyStyle.top = `-${newScrollY}px`;
        bodyStyle.width = '100%';
      }
      
      // Set target element and calculate positioning
      setTargetElement(element);
      const rect = element.getBoundingClientRect();
      setElementRect(rect);
      calculateTooltipPosition(step, rect);
    };

    // For tab-switching steps, wait a moment for content to load
    const needsTabSwitch = step.id === 'battle-history-content' || step.id === 'battle-stats-content' || step.id === 'friends-list-content';
    const initialDelay = needsTabSwitch ? 200 : 0;

    setTimeout(() => {
      findElementAndScroll();
    }, initialDelay);
  }, [currentStep, isActive, steps]);

  
  const calculateTooltipPosition = ( step: OnboardingStep, rect: DOMRect) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Store element rect for the radial gradient
    setElementRect(rect);
    
    // Viewport dimensions with safety margins
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Desktop sizing for optimal experience
    const tooltipWidth = Math.min(400, viewportWidth * 0.35);
    const tooltipHeight = 300;
    const minSpacing = 60; // Greater distance from highlighted elements
    const safeZone = 40; // Larger safe zone to prevent edge cutoff
    
    console.log('[Onboarding] Conservative sizing:', { 
      viewport: { width: viewportWidth, height: viewportHeight },
      tooltip: { width: tooltipWidth, height: tooltipHeight }
    });
    
    // Calculate absolute safe boundaries (never cross these)
    const absoluteBounds = {
      minX: scrollLeft + safeZone,
      maxX: scrollLeft + viewportWidth - tooltipWidth - safeZone,
      minY: scrollTop + safeZone,
      maxY: scrollTop + viewportHeight - tooltipHeight - safeZone
    };
    
    // Element center and boundaries
    const elementCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    const elementBounds = {
      left: rect.left + scrollLeft,
      top: rect.top + scrollTop,
      right: rect.right + scrollLeft,
      bottom: rect.bottom + scrollTop
    };
    
    // Calculate available space in each direction
    const availableSpaces = {
      top: rect.top - safeZone,
      bottom: viewportHeight - rect.bottom - safeZone,
      left: rect.left - safeZone,
      right: viewportWidth - rect.right - safeZone
    };
    
    console.log('[Onboarding] Available spaces:', availableSpaces);
    
    let position = step.position || 'auto';
    let x = 0;
    let y = 0;
    
    // Desktop positioning logic
    if (position === 'auto') {
      // Try sides first, then top/bottom
      if (availableSpaces.left >= tooltipWidth + 20) {
        position = 'left';
      } else if (availableSpaces.right >= tooltipWidth + 20) {
        position = 'right';
      } else if (availableSpaces.top >= tooltipHeight + 20) {
        position = 'top';
      } else if (availableSpaces.bottom >= tooltipHeight + 20) {
        position = 'bottom';
      } else {
        // Force best available space
        const maxSpace = Math.max(...Object.values(availableSpaces));
        if (maxSpace === availableSpaces.left) position = 'left';
        else if (maxSpace === availableSpaces.right) position = 'right';
        else if (maxSpace === availableSpaces.top) position = 'top';
        else position = 'bottom';
      }
    }
    
    // Calculate initial position (before constraints)
    switch (position) {
      case 'top':
        x = elementCenter.x;
        y = elementBounds.top - minSpacing;
        break;
      case 'bottom':
        x = elementCenter.x;
        y = elementBounds.bottom + minSpacing;
        break;
      case 'left':
        x = elementBounds.left - minSpacing;
        y = elementCenter.y + scrollTop;
        break;
      case 'right':
        x = elementBounds.right + minSpacing;
        y = elementCenter.y + scrollTop;
        break;
    }
    
    // Apply transform offset based on position
    if (position === 'top' || position === 'bottom') {
      x -= tooltipWidth / 2; // Center horizontally
    } else {
      y -= tooltipHeight / 2; // Center vertically
    }
    
    // STRICT constraint enforcement - never allow overflow
    x = Math.max(absoluteBounds.minX, Math.min(absoluteBounds.maxX, x));
    y = Math.max(absoluteBounds.minY, Math.min(absoluteBounds.maxY, y));
    
    // Final bounds check with element collision
    const finalTooltipBounds = {
      left: x,
      top: y,
      right: x + tooltipWidth,
      bottom: y + tooltipHeight
    };
    
    // Enhanced collision detection with generous clearance
    const clearanceBuffer = 50; // Larger buffer for clearer separation
    const hasOverlap = !(
      finalTooltipBounds.right + clearanceBuffer < elementBounds.left ||
      finalTooltipBounds.left > elementBounds.right + clearanceBuffer ||
      finalTooltipBounds.bottom + clearanceBuffer < elementBounds.top ||
      finalTooltipBounds.top > elementBounds.bottom + clearanceBuffer
    );
    
    if (hasOverlap) {
      console.log('[Onboarding] Collision detected, using smart repositioning...');
      
      // Smart positioning: Analyze available space and choose best option
      const elementInLeft = elementCenter.x < viewportWidth / 2;
      const elementInTop = elementCenter.y < viewportHeight / 2;
      
      // Calculate available space in each direction from element
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;
      
      console.log('[Onboarding] Available spaces:', { spaceAbove, spaceBelow, spaceLeft, spaceRight });
      
      // Desktop: Intelligent positioning based on available space
      let bestPosition: { x: number; y: number; score: number; name?: string } = { x: 0, y: 0, score: 0 };
      
      // Test different positions and score them
      const positions = [
        // Right side
        { 
          x: rect.right + scrollLeft + minSpacing, 
          y: elementCenter.y + scrollTop - tooltipHeight / 2,
          score: spaceRight,
          name: 'right'
        },
        // Left side
        { 
          x: rect.left + scrollLeft - tooltipWidth - minSpacing, 
          y: elementCenter.y + scrollTop - tooltipHeight / 2,
          score: spaceLeft,
          name: 'left'
        },
        // Below
        { 
          x: elementCenter.x + scrollLeft - tooltipWidth / 2, 
          y: rect.bottom + scrollTop + minSpacing,
          score: spaceBelow,
          name: 'below'
        },
        // Above
        { 
          x: elementCenter.x + scrollLeft - tooltipWidth / 2, 
          y: rect.top + scrollTop - tooltipHeight - minSpacing,
          score: spaceAbove,
          name: 'above'
        }
      ];
      
      // Find position with most space that fits within bounds
      for (const pos of positions) {
        if (pos.x >= absoluteBounds.minX && pos.x + tooltipWidth <= absoluteBounds.maxX &&
            pos.y >= absoluteBounds.minY && pos.y + tooltipHeight <= absoluteBounds.maxY &&
            pos.score > bestPosition.score) {
          bestPosition = pos;
        }
      }
      
      if (bestPosition.score > 0) {
        console.log('[Onboarding] Using best fit position:', bestPosition.name || 'unknown');
        x = bestPosition.x;
        y = bestPosition.y;
      } else {
        // Fallback to corner positioning
        console.log('[Onboarding] Using corner fallback positioning');
        if (elementInTop && elementInLeft) {
          x = viewportWidth - tooltipWidth - safeZone + scrollLeft;
          y = viewportHeight - tooltipHeight - safeZone + scrollTop;
        } else if (elementInTop && !elementInLeft) {
          x = safeZone + scrollLeft;
          y = viewportHeight - tooltipHeight - safeZone + scrollTop;
        } else if (!elementInTop && elementInLeft) {
          x = viewportWidth - tooltipWidth - safeZone + scrollLeft;
          y = safeZone + scrollTop;
        } else {
          x = safeZone + scrollLeft;
          y = safeZone + scrollTop;
        }
      }
      
      // Final constraint enforcement
      x = Math.max(absoluteBounds.minX, Math.min(absoluteBounds.maxX, x));
      y = Math.max(absoluteBounds.minY, Math.min(absoluteBounds.maxY, y));
    }
    
    // Adjust position for transform origin
    if (position === 'top' || position === 'bottom') {
      x += tooltipWidth / 2; // Restore center point for transform
    } else {
      y += tooltipHeight / 2; // Restore center point for transform
    }
    
    console.log('[Onboarding] Final bulletproof position:', { 
      position, 
      x, 
      y, 
      tooltipSize: { width: tooltipWidth, height: tooltipHeight },
      bounds: absoluteBounds
    });
    
    setTooltipPosition({ x, y });
    setActualPosition(position as 'top' | 'bottom' | 'left' | 'right');
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
    localStorage.setItem(storageKey, 'completed');
    setIsActive(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'skipped');
    setIsActive(false);
    onComplete();
  };

  if (!isActive || !steps[currentStep] || !targetElement || !elementRect) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <>
      {/* Complete page lock overlay - immediate display */}
      <div 
        className="fixed inset-0 z-[9997]"
        style={{ 
          pointerEvents: 'auto',
          background: 'transparent'
        }}
      />
      
      {/* Spotlight Overlay - immediate display without delays */}
      <div 
        className="fixed inset-0 z-[9998]"
        style={{ 
          pointerEvents: 'none',
          background: `
            radial-gradient(
              ellipse ${elementRect.width + 40}px ${elementRect.height + 40}px 
              at ${elementRect.left + elementRect.width / 2}px ${elementRect.top + elementRect.height / 2}px,
              transparent 0%,
              transparent 50%,
              rgba(0, 0, 0, 0.95) 70%,
              rgba(0, 0, 0, 1) 100%
            )
          `,
          transition: 'none' // Remove any transition delays
        }}
      />
      
      {/* Clean border around highlighted element - immediate display */}
      <div
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: elementRect.left + window.pageXOffset - 3,
          top: elementRect.top + window.pageYOffset - 3,
          width: elementRect.width + 6,
          height: elementRect.height + 6,
          border: '3px solid rgb(var(--primary))',
          borderRadius: '8px',
          boxShadow: '0 0 20px rgba(var(--primary), 0.6)',
          transition: 'none' // Remove any transition delays
        }}
      />

      {/* Tooltip - immediate display */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] pointer-events-auto"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: actualPosition === 'left' || actualPosition === 'right' 
            ? 'translateY(-50%)' 
            : 'translateX(-50%)',
          maxWidth: '95vw',
          width: `${Math.min(380, window.innerWidth * 0.3)}px`,
          maxHeight: '90vh',
          overflow: 'hidden',
          opacity: 1, // Ensure immediate visibility
          transition: 'none' // Remove any transition delays
        }}
      >
        <Card className="bg-background/98 backdrop-blur-xl border-primary/40 shadow-2xl ring-1 ring-primary/20">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/40">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">
                    {t(`dashboard.onboarding.${step.translationKey}.title`)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                    <div className="px-2 py-0.5 bg-primary/20 rounded-full">
                      <span className="text-xs font-medium text-primary">
                        {Math.round(((currentStep + 1) / steps.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-foreground leading-relaxed text-[15px]">
                {t(`dashboard.onboarding.${step.translationKey}.description`)}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-primary/80 rounded-full h-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground border-muted-foreground/30"
                >
                  <span className="text-sm">Skip</span>
                </Button>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="text-sm">Previous</span>
                  </Button>
                )}
              </div>
              
              <Button
                onClick={handleNext}
                className="btn-neon font-semibold px-6"
                size="sm"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    <span className="text-sm">Finish</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">Next</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

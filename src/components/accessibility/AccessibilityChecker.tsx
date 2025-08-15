import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: HTMLElement;
  guideline: string;
}

/**
 * Development-only component for basic accessibility checking
 * This should only be used in development mode
 */
export function AccessibilityChecker() {
  const [issues, setIssues] = React.useState<AccessibilityIssue[]>([]);
  const [isChecking, setIsChecking] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  // Only show in development
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
  }, []);

  const checkAccessibility = React.useCallback(() => {
    setIsChecking(true);
    const foundIssues: AccessibilityIssue[] = [];

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.alt && !img.getAttribute('aria-hidden')) {
        foundIssues.push({
          type: 'error',
          message: `Image missing alt text: ${img.src}`,
          element: img,
          guideline: 'WCAG 1.1.1 - Non-text Content'
        });
      }
    });

    // Check for missing form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        foundIssues.push({
          type: 'error',
          message: `Form control missing label: ${input.tagName.toLowerCase()}`,
          element: input as HTMLElement,
          guideline: 'WCAG 3.3.2 - Labels or Instructions'
        });
      }
    });

    // Check for missing heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    if (headings.length > 0) {
      let lastLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > lastLevel + 1) {
          foundIssues.push({
            type: 'warning',
            message: `Heading level skipped: ${heading.tagName} after h${lastLevel}`,
            element: heading as HTMLElement,
            guideline: 'WCAG 1.3.1 - Info and Relationships'
          });
        }
        lastLevel = level;
      });
    }

    // Check for interactive elements without focus styles
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
    interactiveElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element as Element);
      const focusStyles = computedStyle.getPropertyValue('outline') || computedStyle.getPropertyValue('box-shadow');
      
      if (!focusStyles || focusStyles === 'none') {
        foundIssues.push({
          type: 'warning',
          message: `Interactive element may lack focus indicator: ${element.tagName.toLowerCase()}`,
          element: element as HTMLElement,
          guideline: 'WCAG 2.4.7 - Focus Visible'
        });
      }
    });

    // Check for missing landmarks
    const main = document.querySelector('main');
    if (!main) {
      foundIssues.push({
        type: 'error',
        message: 'Page missing main landmark',
        guideline: 'WCAG 1.3.1 - Info and Relationships'
      });
    }

    const nav = document.querySelector('nav, [role="navigation"]');
    if (!nav) {
      foundIssues.push({
        type: 'info',
        message: 'Page may be missing navigation landmark',
        guideline: 'WCAG 1.3.1 - Info and Relationships'
      });
    }

    // Check for color contrast (basic check)
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th');
    textElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const backgroundColor = style.backgroundColor;
      const color = style.color;
      
      // This is a simplified check - in a real implementation, you'd calculate actual contrast ratios
      if (backgroundColor === 'transparent' && color === 'rgba(0, 0, 0, 0)') {
        foundIssues.push({
          type: 'warning',
          message: `Text element may have insufficient color contrast: ${element.tagName.toLowerCase()}`,
          element: element as HTMLElement,
          guideline: 'WCAG 1.4.3 - Contrast (Minimum)'
        });
      }
    });

    // Check for table accessibility
    const tables = document.querySelectorAll('table');
    tables.forEach((table) => {
      const hasCaption = table.querySelector('caption');
      const hasHeaders = table.querySelector('th');
      
      if (!hasCaption) {
        foundIssues.push({
          type: 'warning',
          message: 'Table missing caption',
          element: table,
          guideline: 'WCAG 1.3.1 - Info and Relationships'
        });
      }
      
      if (!hasHeaders) {
        foundIssues.push({
          type: 'error',
          message: 'Table missing header cells',
          element: table,
          guideline: 'WCAG 1.3.1 - Info and Relationships'
        });
      }
    });

    setIssues(foundIssues);
    setIsChecking(false);
  }, []);

  const highlightElement = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid red';
    element.style.outlineOffset = '2px';
    
    setTimeout(() => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }, 3000);
  };

  const getIssueIcon = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return <Icons.alertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <Icons.alertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Icons.info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getIssueBadgeVariant = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 p-0"
        variant="secondary"
        aria-label="Toggle accessibility checker"
        title="Accessibility Checker (Development Only)"
      >
        <Icons.accessibility className="h-6 w-6" />
      </Button>

      {/* Accessibility checker panel */}
      {isVisible && (
        <Card className="fixed bottom-20 right-4 z-50 w-96 max-h-96 overflow-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Accessibility Checker</CardTitle>
                <CardDescription>Development tool for WCAG compliance</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                aria-label="Close accessibility checker"
              >
                <Icons.x className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={checkAccessibility}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Icons.loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Icons.search className="h-4 w-4 mr-2" />
                  Check Accessibility
                </>
              )}
            </Button>

            {issues.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Issues Found:</h3>
                  <Badge variant="destructive">{issues.length}</Badge>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-auto">
                  {issues.map((issue, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => issue.element && highlightElement(issue.element)}
                    >
                      <div className="flex items-start gap-2">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{issue.message}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={getIssueBadgeVariant(issue.type)} className="text-xs">
                              {issue.type.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {issue.guideline}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {issues.length === 0 && !isChecking && (
              <div className="text-center py-4 text-muted-foreground">
                <Icons.checkCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No accessibility issues found!</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>This is a basic checker. Use professional tools like axe-core for comprehensive testing.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
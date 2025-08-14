
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import React from "react"

export function Toaster() {
  // Comprehensive React availability check
  if (
    !React || 
    typeof React !== 'object' ||
    !React.useState || 
    !React.useEffect || 
    !React.useContext ||
    typeof React.useState !== 'function' ||
    typeof React.useEffect !== 'function' ||
    typeof React.useContext !== 'function'
  ) {
    console.warn('React hooks not available in Toaster, skipping render');
    return null;
  }

  // Test if React context is working by attempting a hook call
  let testState;
  try {
    testState = React.useState(null);
    if (!testState || !Array.isArray(testState)) {
      console.warn('React hooks not working properly in Toaster');
      return null;
    }
  } catch (error) {
    console.warn('React hooks failed in Toaster, skipping render:', error);
    return null;
  }

  // Now try to get toasts
  let toasts;
  try {
    const toastHook = useToast();
    toasts = toastHook.toasts;
  } catch (error) {
    console.warn('useToast hook failed in Toaster, skipping render:', error);
    return null;
  }

  // Validate toasts
  if (!Array.isArray(toasts)) {
    console.warn('Toasts is not an array in Toaster, skipping render');
    return null;
  }

  // Only render if we have no toasts (to avoid rendering ToastProvider unnecessarily)
  if (toasts.length === 0) {
    return null;
  }

  // Final safety check before rendering ToastProvider
  try {
    return (
      <ToastProvider>
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport />
      </ToastProvider>
    )
  } catch (error) {
    console.warn('Error rendering ToastProvider in Toaster:', error);
    return null;
  }
}

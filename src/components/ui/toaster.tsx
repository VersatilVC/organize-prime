
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
  // Enhanced safety checks to ensure React is fully initialized
  if (!React || typeof React.useState !== 'function' || typeof React.useEffect !== 'function' || typeof React.useContext !== 'function') {
    console.warn('React hooks not fully available in Toaster, rendering null');
    return null;
  }

  // Check if we're in a proper React render context
  try {
    // This will throw if React context is not properly set up
    React.useState(false);
  } catch (error) {
    console.warn('React context not ready in Toaster, rendering null:', error);
    return null;
  }

  // Additional check to ensure we can safely call useToast
  let toasts;
  try {
    const toastHook = useToast();
    toasts = toastHook.toasts;
  } catch (error) {
    console.warn('useToast hook failed, rendering null:', error);
    return null;
  }

  // Final safety check: ensure toasts is an array
  if (!Array.isArray(toasts)) {
    console.warn('Toasts is not an array, rendering null');
    return null;
  }

  // Only render ToastProvider when we're absolutely sure React is ready
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
    console.warn('Error rendering ToastProvider, returning null:', error);
    return null;
  }
}

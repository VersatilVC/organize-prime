
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
  // Safety check to ensure React hooks are available
  if (!React || typeof React.useState !== 'function') {
    console.warn('React hooks not available in Toaster, rendering null');
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

  // Only render ToastProvider when we're sure React is ready
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
}

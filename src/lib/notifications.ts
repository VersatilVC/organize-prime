import { useToast } from '@/hooks/use-toast';
import { FEATURE_ERROR_MESSAGES, SUCCESS_MESSAGES } from './error-messages';

// Create a toast instance that can be used outside of React components
let toastInstance: ReturnType<typeof useToast>['toast'] | null = null;

export const initializeToast = (toast: ReturnType<typeof useToast>['toast']) => {
  toastInstance = toast;
};

export const showFeatureSuccess = (message: string) => {
  if (toastInstance) {
    toastInstance({
      title: "Success",
      description: message,
      duration: 4000,
    });
  }
};

export const showFeatureError = (message: string = FEATURE_ERROR_MESSAGES.ENABLE_FAILED) => {
  if (toastInstance) {
    toastInstance({
      title: "Error",
      description: message,
      variant: "destructive",
      duration: 6000,
    });
  }
};

export const showFeatureInfo = (message: string) => {
  if (toastInstance) {
    toastInstance({
      title: "Information",
      description: message,
      duration: 5000,
    });
  }
};

// Hook versions for use in React components
export const useFeatureNotifications = () => {
  const { toast } = useToast();

  const success = (message: string) => {
    toast({
      title: "Success",
      description: message,
      duration: 4000,
    });
  };

  const error = (message: string = FEATURE_ERROR_MESSAGES.ENABLE_FAILED) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
      duration: 6000,
    });
  };

  const info = (message: string) => {
    toast({
      title: "Information",
      description: message,
      duration: 5000,
    });
  };

  return { success, error, info };
};
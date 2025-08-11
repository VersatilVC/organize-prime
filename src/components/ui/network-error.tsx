import { Wifi } from "lucide-react";
import { EmptyState } from "@/components/composition/EmptyState";

interface NetworkErrorProps {
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function NetworkError({ 
  onRetry,
  title = "Connection Problem",
  description = "We're having trouble connecting to our servers. Please check your internet connection and try again."
}: NetworkErrorProps) {
  return (
    <EmptyState
      icon={Wifi}
      title={title}
      description={description}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
    />
  );
}
// Marketplace components
export { FeatureDetailModal } from './FeatureDetailModal';
export { FeatureReviews } from './FeatureReviews';
export { InstallationModal } from './InstallationModal';

// Types
export interface MarketplaceFeature {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: string;
  iconName: string;
  screenshots: string[];
  pricing: 'free' | 'premium' | 'enterprise';
  rating: number;
  reviewCount: number;
  installCount: number;
  requirements: string[];
  permissions: string[];
  features: string[];
  status: 'available' | 'installed' | 'requires_upgrade';
  compatibility: {
    minPlan: 'free' | 'basic' | 'pro' | 'enterprise';
    requiresIntegration: boolean;
  };
}

export interface FeatureReview {
  id: string;
  userName: string;
  userTitle: string;
  companySize: string;
  rating: number;
  title: string;
  review: string;
  pros: string[];
  cons: string[];
  helpfulVotes: number;
  createdAt: string;
}

export interface InstallationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  error?: string;
}
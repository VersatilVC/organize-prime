import { lazy } from 'react';

// Route-based code splitting
export const Index = lazy(() => import('../pages/Index'));
export const Auth = lazy(() => import('../pages/Auth'));
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const Users = lazy(() => import('../pages/Users'));
export const Organizations = lazy(() => import('../pages/Organizations'));
export const CompanySettings = lazy(() => import('../pages/CompanySettings'));
export const ProfileSettings = lazy(() => import('../pages/ProfileSettings'));
export const SystemSettings = lazy(() => import('../pages/SystemSettings'));
export const Billing = lazy(() => import('../pages/Billing'));

export const Feedback = lazy(() => import('../pages/Feedback'));
export const FeedbackDetail = lazy(() => import('../pages/FeedbackDetail'));
export const MyFeedback = lazy(() => import('../pages/MyFeedback'));
export const InviteAcceptance = lazy(() => import('../pages/InviteAcceptance'));
export const NotFound = lazy(() => import('../pages/NotFound'));

// Admin pages
export const FeedbackManagement = lazy(() => import('../pages/admin/FeedbackManagement'));

// Heavy components - these components don't use default exports, so we'll create them lazy directly
export const InviteUserDialog = lazy(() => 
  import('./InviteUserDialog').then(module => ({ 
    default: module.InviteUserDialog || (() => <div>Component not found</div>)
  }))
);

export const OrganizationSetup = lazy(() => 
  import('./OrganizationSetup').then(module => ({ 
    default: module.OrganizationSetup || (() => <div>Component not found</div>)
  }))
);

// Settings components
export const BaseSettingsForm = lazy(() => 
  import('./settings/BaseSettingsForm').then(module => ({ 
    default: module.BaseSettingsForm || (() => <div>Component not found</div>)
  }))
);

// Chart components
export const ChartWidget = lazy(() => 
  import('./ChartWidget').then(module => ({ 
    default: module.ChartWidget || (() => <div>Component not found</div>)
  }))
);

// Specific chart components
export const DashboardLineChart = lazy(() => 
  import('./ChartWidget').then(module => ({ 
    default: module.DashboardLineChart || (() => <div>Chart not found</div>)
  }))
);

export const DashboardBarChart = lazy(() => 
  import('./ChartWidget').then(module => ({ 
    default: module.DashboardBarChart || (() => <div>Chart not found</div>)
  }))
);

export const DashboardAreaChart = lazy(() => 
  import('./ChartWidget').then(module => ({ 
    default: module.DashboardAreaChart || (() => <div>Chart not found</div>)
  }))
);

export const DashboardPieChart = lazy(() => 
  import('./ChartWidget').then(module => ({ 
    default: module.DashboardPieChart || (() => <div>Chart not found</div>)
  }))
);

// File upload components
export const FileUpload = lazy(() => 
  import('./ui/file-upload').then(module => ({ 
    default: module.FileUpload || (() => <div>Component not found</div>)
  }))
);

// Third-party library loaders
export const loadChartsLibrary = () => import('recharts');
export const loadDateLibrary = () => import('date-fns');
export const loadFormLibrary = () => import('react-hook-form');

// Icon optimization - extract only used icons
export const loadIcon = (iconName: string) => {
  const iconMap: Record<string, () => Promise<any>> = {
    'users': () => import('lucide-react').then(mod => ({ default: mod.Users })),
    'settings': () => import('lucide-react').then(mod => ({ default: mod.Settings })),
    'building': () => import('lucide-react').then(mod => ({ default: mod.Building })),
    'feedback': () => import('lucide-react').then(mod => ({ default: mod.MessageSquare })),
    'dashboard': () => import('lucide-react').then(mod => ({ default: mod.LayoutDashboard })),
    'plus': () => import('lucide-react').then(mod => ({ default: mod.Plus })),
    'search': () => import('lucide-react').then(mod => ({ default: mod.Search })),
    'filter': () => import('lucide-react').then(mod => ({ default: mod.Filter })),
    'download': () => import('lucide-react').then(mod => ({ default: mod.Download })),
    'upload': () => import('lucide-react').then(mod => ({ default: mod.Upload })),
    'edit': () => import('lucide-react').then(mod => ({ default: mod.Edit })),
    'trash': () => import('lucide-react').then(mod => ({ default: mod.Trash2 })),
    'eye': () => import('lucide-react').then(mod => ({ default: mod.Eye })),
    'more': () => import('lucide-react').then(mod => ({ default: mod.MoreHorizontal })),
    'check': () => import('lucide-react').then(mod => ({ default: mod.Check })),
    'x': () => import('lucide-react').then(mod => ({ default: mod.X })),
    'chevron-down': () => import('lucide-react').then(mod => ({ default: mod.ChevronDown })),
    'chevron-up': () => import('lucide-react').then(mod => ({ default: mod.ChevronUp })),
    'chevron-left': () => import('lucide-react').then(mod => ({ default: mod.ChevronLeft })),
    'chevron-right': () => import('lucide-react').then(mod => ({ default: mod.ChevronRight })),
    'menu': () => import('lucide-react').then(mod => ({ default: mod.Menu })),
    'bell': () => import('lucide-react').then(mod => ({ default: mod.Bell })),
    'user': () => import('lucide-react').then(mod => ({ default: mod.User })),
    'mail': () => import('lucide-react').then(mod => ({ default: mod.Mail })),
    'phone': () => import('lucide-react').then(mod => ({ default: mod.Phone })),
    'calendar': () => import('lucide-react').then(mod => ({ default: mod.Calendar })),
    'clock': () => import('lucide-react').then(mod => ({ default: mod.Clock })),
    'star': () => import('lucide-react').then(mod => ({ default: mod.Star })),
    'heart': () => import('lucide-react').then(mod => ({ default: mod.Heart })),
    'share': () => import('lucide-react').then(mod => ({ default: mod.Share })),
    'link': () => import('lucide-react').then(mod => ({ default: mod.Link })),
    'copy': () => import('lucide-react').then(mod => ({ default: mod.Copy })),
    'external-link': () => import('lucide-react').then(mod => ({ default: mod.ExternalLink })),
    'refresh': () => import('lucide-react').then(mod => ({ default: mod.RefreshCw })),
    'loading': () => import('lucide-react').then(mod => ({ default: mod.Loader2 })),
    'alert': () => import('lucide-react').then(mod => ({ default: mod.AlertTriangle })),
    'info': () => import('lucide-react').then(mod => ({ default: mod.Info })),
    'help': () => import('lucide-react').then(mod => ({ default: mod.HelpCircle })),
    'home': () => import('lucide-react').then(mod => ({ default: mod.Home })),
    'folder': () => import('lucide-react').then(mod => ({ default: mod.Folder })),
    'file': () => import('lucide-react').then(mod => ({ default: mod.File })),
    'image': () => import('lucide-react').then(mod => ({ default: mod.Image })),
    'video': () => import('lucide-react').then(mod => ({ default: mod.Video })),
    'music': () => import('lucide-react').then(mod => ({ default: mod.Music })),
    'lock': () => import('lucide-react').then(mod => ({ default: mod.Lock })),
    'unlock': () => import('lucide-react').then(mod => ({ default: mod.Unlock })),
    'shield': () => import('lucide-react').then(mod => ({ default: mod.Shield })),
    'key': () => import('lucide-react').then(mod => ({ default: mod.Key })),
    'logout': () => import('lucide-react').then(mod => ({ default: mod.LogOut })),
    'login': () => import('lucide-react').then(mod => ({ default: mod.LogIn })),
  };

  return iconMap[iconName] || (() => import('lucide-react').then(mod => ({ default: mod.HelpCircle })));
};
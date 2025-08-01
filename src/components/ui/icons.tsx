import {
  Search,
  Bell,
  Settings,
  Users,
  Building2,
  CreditCard,
  FileText,
  BarChart3,
  Key,
  Shield,
  Webhook,
  HelpCircle,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Eye,
  EyeOff,
  Upload,
  Download,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  MoreVertical,
  type LucideIcon,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  search: Search,
  bell: Bell,
  settings: Settings,
  users: Users,
  building: Building2,
  creditCard: CreditCard,
  fileText: FileText,
  barChart: BarChart3,
  key: Key,
  shield: Shield,
  webhook: Webhook,
  helpCircle: HelpCircle,
  user: User,
  logOut: LogOut,
  menu: Menu,
  close: X,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  home: Home,
  plus: Plus,
  mail: Mail,
  phone: Phone,
  mapPin: MapPin,
  calendar: Calendar,
  clock: Clock,
  checkCircle: CheckCircle,
  alertCircle: AlertCircle,
  xCircle: XCircle,
  info: Info,
  eye: Eye,
  eyeOff: EyeOff,
  upload: Upload,
  download: Download,
  edit: Edit,
  trash: Trash2,
  copy: Copy,
  externalLink: ExternalLink,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  moreVertical: MoreVertical,
  google: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="currentColor"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="currentColor"
      />
    </svg>
  ),
};
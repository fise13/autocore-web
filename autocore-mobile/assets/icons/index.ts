/**
 * Central icon registry — import icons only from here.
 */
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  Coins,
  ExternalLink,
  FileStack,
  FileText,
  HelpCircle,
  Images,
  LayoutGrid,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Phone,
  Plus,
  Receipt,
  Search,
  Settings2,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react-native';

import { createIcon } from './create-icon';

// Navigation
export const LayoutGridIcon = createIcon(LayoutGrid, 'LayoutGridIcon');
export const BarChart3Icon = createIcon(BarChart3, 'BarChart3Icon');
export const ShoppingCartIcon = createIcon(ShoppingCart, 'ShoppingCartIcon');
export const FileTextIcon = createIcon(FileText, 'FileTextIcon');
export const UsersIcon = createIcon(Users, 'UsersIcon');
export const MegaphoneIcon = createIcon(Megaphone, 'MegaphoneIcon');
export const SettingsIcon = createIcon(Settings2, 'SettingsIcon');
export const HelpCircleIcon = createIcon(HelpCircle, 'HelpCircleIcon');
export const ActivityIcon = createIcon(Activity, 'ActivityIcon');

// Actions
export const SearchIcon = createIcon(Search, 'SearchIcon');
export const PlusIcon = createIcon(Plus, 'PlusIcon');
export const ArrowRightIcon = createIcon(ArrowRight, 'ArrowRightIcon');
export const ArrowLeftIcon = createIcon(ArrowLeft, 'ArrowLeftIcon');
export const ChevronDownIcon = createIcon(ChevronDown, 'ChevronDownIcon');
export const ChevronRightIcon = createIcon(ChevronRight, 'ChevronRightIcon');
export const ChevronsUpDownIcon = createIcon(ChevronsUpDown, 'ChevronsUpDownIcon');
export const CheckIcon = createIcon(Check, 'CheckIcon');
export const CheckCircle2Icon = createIcon(CheckCircle2, 'CheckCircle2Icon');
export const XIcon = createIcon(X, 'XIcon');
export const Loader2Icon = createIcon(Loader2, 'Loader2Icon');
export const BellIcon = createIcon(Bell, 'BellIcon');
export const ExternalLinkIcon = createIcon(ExternalLink, 'ExternalLinkIcon');

// Business domain
export const PackageIcon = createIcon(Package, 'PackageIcon');
export const BoxIcon = createIcon(Box, 'BoxIcon');
export const StoreIcon = createIcon(Store, 'StoreIcon');
export const CarIcon = createIcon(Car, 'CarIcon');
export const WrenchIcon = createIcon(Wrench, 'WrenchIcon');
export const ClipboardListIcon = createIcon(ClipboardList, 'ClipboardListIcon');
export const ReceiptIcon = createIcon(Receipt, 'ReceiptIcon');
export const FileStackIcon = createIcon(FileStack, 'FileStackIcon');
export const MapPinIcon = createIcon(MapPin, 'MapPinIcon');
export const TagIcon = createIcon(Tag, 'TagIcon');
export const ClockIcon = createIcon(Clock, 'ClockIcon');
export const ImagesIcon = createIcon(Images, 'ImagesIcon');

// Analytics
export const TrendingUpIcon = createIcon(TrendingUp, 'TrendingUpIcon');
export const TrendingDownIcon = createIcon(TrendingDown, 'TrendingDownIcon');
export const CoinsIcon = createIcon(Coins, 'CoinsIcon');

// People
export const UserRoundIcon = createIcon(UserRound, 'UserRoundIcon');

// Status
export const AlertTriangleIcon = createIcon(AlertTriangle, 'AlertTriangleIcon');
export const SparklesIcon = createIcon(Sparkles, 'SparklesIcon');
export const LogOutIcon = createIcon(LogOut, 'LogOutIcon');
export const LifeBuoyIcon = createIcon(LifeBuoy, 'LifeBuoyIcon');
export const MailIcon = createIcon(Mail, 'MailIcon');
export const PhoneIcon = createIcon(Phone, 'PhoneIcon');

/** Registry map for dynamic icon lookup */
export const iconRegistry = {
  layoutGrid: LayoutGridIcon,
  barChart3: BarChart3Icon,
  shoppingCart: ShoppingCartIcon,
  fileText: FileTextIcon,
  users: UsersIcon,
  megaphone: MegaphoneIcon,
  settings: SettingsIcon,
  helpCircle: HelpCircleIcon,
  activity: ActivityIcon,
  search: SearchIcon,
  plus: PlusIcon,
  package: PackageIcon,
  box: BoxIcon,
  store: StoreIcon,
  car: CarIcon,
  wrench: WrenchIcon,
  clipboardList: ClipboardListIcon,
  receipt: ReceiptIcon,
  mapPin: MapPinIcon,
  tag: TagIcon,
  bell: BellIcon,
  trendingUp: TrendingUpIcon,
  trendingDown: TrendingDownIcon,
  userRound: UserRoundIcon,
  alertTriangle: AlertTriangleIcon,
} as const;

export type IconName = keyof typeof iconRegistry;

export { createIcon } from './create-icon';
export type { IconProps, IconState } from './create-icon';

declare module 'lucide-react' {
  import * as React from 'react';

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Crown: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Users: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Play: LucideIcon;
  export const Copy: LucideIcon;
  export const Check: LucideIcon;
  export const Plus: LucideIcon;
  export const Trash2: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const LogOut: LucideIcon;
  export const Trophy: LucideIcon;
  export const Clock: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const Dice1: LucideIcon;
  export const Dice2: LucideIcon;
  export const Dice3: LucideIcon;
  export const Dice4: LucideIcon;
  export const Dice5: LucideIcon;
  export const Dice6: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const QrCode: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Loader2: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const XCircle: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const MousePointer2: LucideIcon;
  export const Mail: LucideIcon;
  export const User: LucideIcon;
  export const Lock: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Home: LucideIcon;

  const icons: { [key: string]: LucideIcon };
  export default icons;
}

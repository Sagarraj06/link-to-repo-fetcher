import { useAuth } from '@/contexts/AuthContext';
import { Coins } from 'lucide-react';

export const CreditBadge = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getCreditColor = (credits: number) => {
    if (credits >= 10) return 'text-green-600 bg-green-50 border-green-200';
    if (credits >= 3) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getCreditColor(user.credits)}`}>
      <Coins className="h-5 w-5" />
      <div className="flex flex-col">
        <span className="text-xs font-medium opacity-80">Credits</span>
        <span className="text-lg font-bold leading-none">{user.credits}</span>
      </div>
    </div>
  );
};

import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Dumbbell className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold text-primary font-headline">Zenith Gym OS</h1>
    </div>
  );
}

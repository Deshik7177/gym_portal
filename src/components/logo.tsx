import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
        <Dumbbell className="h-5 w-5 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-primary font-headline tracking-tight">Thrive Fit</h1>
    </div>
  );
}

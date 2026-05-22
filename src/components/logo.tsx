import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center font-bold text-primary-foreground font-headline">Z</div>
      <h1 className="text-xl font-bold text-primary font-headline tracking-tight">Zenith Gym OS</h1>
    </div>
  );
}

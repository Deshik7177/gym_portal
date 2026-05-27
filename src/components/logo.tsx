import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image 
        src="/favicon.ico" 
        alt="Thrive Fit Logo" 
        width={32} 
        height={32} 
        className="rounded-sm object-contain"
      />
      <h1 className="text-xl font-bold text-primary font-headline tracking-tight">Thrive Fit</h1>
    </div>
  );
}

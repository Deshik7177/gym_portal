import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image src="/thrive_fit.jpg" alt="Thrive Fit Logo" width={32} height={32} className="rounded-md" />
      <h1 className="text-xl font-bold text-primary font-headline">Thrive Fit</h1>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useProfile } from '@/firebase';
import {
  Users,
  BarChart3,
  UserPlus,
  Clock,
  Settings,
  LayoutDashboard,
  Loader2,
  Wifi,
  WifiOff,
  Scan,
  ShieldCheck,
  History,
  ShieldAlert
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import UserNav from '@/components/user-nav';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const { profile, isAdmin, isMissingProfile, loading: profileLoading } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (!loading && !user) {
      router.push('/login');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, loading, router]);

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Members List', icon: Users },
    { href: '/admin/entrance', label: 'Entrance Kiosk', icon: Scan },
    { href: '/admin/attendance', label: 'Attendance Logs', icon: History },
    { href: '/admin/sales', label: 'Sales Report', icon: BarChart3 },
    { href: '/admin/absent', label: 'Retention Alerts', icon: Clock },
    { href: '/admin/register', label: 'Registration', icon: UserPlus },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background/95">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card/50 backdrop-blur-sm sm:flex shadow-xl">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-lg font-headline text-primary">Thrive Fit</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-4 py-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-primary/5",
                pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-4 py-4 space-y-2">
           <Badge variant={isOnline ? "outline" : "destructive"} className="w-full justify-center gap-2 py-1 text-[10px] uppercase tracking-wider">
             {isOnline ? (
               <> <Wifi className="h-3 w-3 text-green-500" /> Cloud Sync Active </>
             ) : (
               <> <WifiOff className="h-3 w-3" /> Offline (Saving Locally) </>
             )}
           </Badge>
        </div>
        <nav className="flex flex-col gap-1 px-4 pb-6">
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            System Settings
          </Link>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-6 sm:h-16">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <LayoutDashboard className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="px-6 pt-6 pb-2 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  Thrive Fit
                </SheetTitle>
                <SheetDescription>Staff Management Menu</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-1 px-4 py-6 text-lg font-medium">
                {navItems.map((item) => (
                   <Link 
                    key={item.href}
                    href={item.href} 
                    className={cn(
                      "flex items-center gap-4 rounded-lg px-3 py-2 hover:bg-primary/5",
                      pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex items-center gap-4">
             <h2 className="font-semibold text-lg hidden md:block text-primary font-headline">
               {navItems.find(item => item.href === pathname)?.label || 'Portal'}
             </h2>
             {isAdmin && <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[9px] font-black tracking-widest px-2">Administrator</Badge>}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-6">
            {isMissingProfile && (
              <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/5">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Role Configuration Required</AlertTitle>
                <AlertDescription className="text-xs">
                  Your account (UID: <code className="bg-black/20 px-1 rounded">{user.uid}</code>) is authenticated but has no role assigned in Firestore. 
                  Please go to the Firebase Console and create a document in the <b>users</b> collection with this UID as the document ID and set <b>role</b> to "admin" or "staff".
                </AlertDescription>
              </Alert>
            )}
            {children}
        </main>
      </div>
    </div>
  );
}

import Link from 'next/link';
import {
  Bell,
  Home,
  User,
  CreditCard,
  History,
  PanelLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import UserNav from '@/components/user-nav';
import Logo from '@/components/logo';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
                <SheetHeader>
                    <SheetTitle>
                        <Logo />
                    </SheetTitle>
                    <SheetDescription>
                        Navigate through your member dashboard.
                    </SheetDescription>
                </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium mt-6">
                <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-foreground">
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="/dashboard/profile" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <User className="h-5 w-5" />
                  Profile
                </Link>
                <Link href="/dashboard/billing" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <CreditCard className="h-5 w-5" />
                  Billing & Invoices
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="hidden sm:block">
            <Logo />
          </div>

          <nav className="hidden sm:flex sm:items-center sm:gap-5 sm:text-sm sm:font-medium sm:ml-10">
              <Link href="/dashboard" className="text-foreground transition-colors hover:text-foreground/80">Dashboard</Link>
              <Link href="/dashboard/profile" className="text-muted-foreground transition-colors hover:text-foreground">Profile</Link>
              <Link href="/dashboard/billing" className="text-muted-foreground transition-colors hover:text-foreground">Billing</Link>
          </nav>

          <div className="relative ml-auto flex-1 md:grow-0">
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5"/>
            <span className="sr-only">Notifications</span>
          </Button>
          <UserNav />
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  );
}

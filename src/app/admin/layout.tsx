
import Link from 'next/link';
import {
  Home,
  Users,
  BarChart3,
  UserPlus,
  Clock,
  Settings,
  Dumbbell,
  PanelLeft,
  LayoutDashboard,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserNav from '@/components/user-nav';

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background/95">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card/50 backdrop-blur-sm sm:flex shadow-xl">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="text-lg font-headline text-primary">Thrive Fit</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 px-4 py-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/5"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/members"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/5"
          >
            <Users className="h-4 w-4" />
            Members List
          </Link>
          <Link
            href="/admin/sales"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/5"
          >
            <BarChart3 className="h-4 w-4" />
            Sales Report
          </Link>
          <Link
            href="/admin/absent"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/5"
          >
            <Clock className="h-4 w-4" />
            Frequent Absents
          </Link>
          <Link
            href="/admin/register"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:bg-primary/5"
          >
            <UserPlus className="h-4 w-4" />
            New Registration
          </Link>
        </nav>
        <nav className="mt-auto flex flex-col gap-1 px-4 py-6 border-t border-border/40">
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
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <div className="flex h-16 items-center border-b px-6">
                <Dumbbell className="h-6 w-6 text-primary" />
                <span className="ml-2 text-lg font-headline text-primary">Thrive Fit</span>
              </div>
              <nav className="grid gap-1 px-4 py-6 text-lg font-medium">
                <Link href="/admin" className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="/admin/members" className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <Users className="h-5 w-5" />
                  Members
                </Link>
                <Link href="/admin/sales" className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <BarChart3 className="h-5 w-5" />
                  Sales Report
                </Link>
                <Link href="/admin/absent" className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <Clock className="h-5 w-5" />
                  Absents
                </Link>
                <Link href="/admin/register" className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
                  <UserPlus className="h-5 w-5" />
                  Register
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex-1">
             <h2 className="font-semibold text-lg hidden md:block">Front Desk Portal</h2>
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-6">
            {children}
        </main>
      </div>
    </div>
  );
}

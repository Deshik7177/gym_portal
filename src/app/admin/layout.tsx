
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserNav from '@/components/user-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/admin"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Dumbbell className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Thrive Fit</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/members"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Users className="h-4 w-4" />
            Members List
          </Link>
          <Link
            href="/admin/sales"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <BarChart3 className="h-4 w-4" />
            Sales Report
          </Link>
          <Link
            href="/admin/absent"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Clock className="h-4 w-4" />
            Frequent Absent
          </Link>
          <Link
            href="/admin/register"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            New Registration
          </Link>
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="#"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="/admin"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Dumbbell className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Thrive Fit</span>
                </Link>
                <Link href="/admin" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="/admin/members" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Users className="h-5 w-5" />
                  Members
                </Link>
                <Link href="/admin/sales" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <BarChart3 className="h-5 w-5" />
                  Sales
                </Link>
                <Link href="/admin/absent" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Clock className="h-5 w-5" />
                  Absents
                </Link>
                <Link href="/admin/register" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <UserPlus className="h-5 w-5" />
                  Register
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative ml-auto flex-1 md:grow-0">
            <h1 className="font-semibold text-lg font-headline">Thrive Fit Portal</h1>
          </div>
          <UserNav />
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  );
}

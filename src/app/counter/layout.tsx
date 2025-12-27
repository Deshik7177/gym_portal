import Link from 'next/link';
import {
  Home,
  Users,
  History,
  Dumbbell,
  PanelLeft,
  UserPlus,
  Repeat
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserNav from '@/components/user-nav';

export default function CounterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/counter"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Dumbbell className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Zenith Gym OS</span>
          </Link>
          <Link
            href="/counter"
            className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <UserPlus className="h-4 w-4" />
            New Registration
          </Link>
           <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Repeat className="h-4 w-4" />
            Renew Subscription
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <History className="h-4 w-4" />
            Today's Logs
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
                    href="/counter"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                    <Dumbbell className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">Zenith Gym OS</span>
                </Link>
                <Link href="/counter" className="flex items-center gap-4 px-2.5 text-foreground">
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <UserPlus className="h-5 w-5" />
                  New Registration
                </Link>
                <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <Repeat className="h-5 w-5" />
                  Renew Subscription
                </Link>
                 <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                  <History className="h-5 w-5" />
                  Today's Logs
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg font-headline">Counter Portal</h1>
          <div className="relative ml-auto flex-1 md:grow-0">
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

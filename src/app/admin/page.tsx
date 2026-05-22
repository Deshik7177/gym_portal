'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Clock,
  UserPlus,
  Users,
  ArrowUpRight,
  Activity,
  Loader2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Lazy load the heavy chart component to improve TBT and FCP
const Overview = dynamic(() => import('./components/overview').then(mod => mod.Overview), {
  loading: () => <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-xl" />,
  ssr: false
});

export default function ReceptionDashboard() {
  const db = useFirestore();
  
  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading: membersLoading } = useCollection<any>(membersRef);

  const salesRef = useMemo(() => db ? query(collection(db, 'sales')) : null, [db]);
  const { data: sales } = useCollection<any>(salesRef);

  const stats = useMemo(() => {
    if (!members) return { total: 0, group: 0, personal: 0, active: 0, nonActive: 0 };
    return {
      total: members.length,
      group: members.filter(m => m.type === 'group').length,
      personal: members.filter(m => m.type === 'personal').length,
      active: members.filter(m => m.status === 'active').length,
      nonActive: members.filter(m => m.status === 'non-active').length
    };
  }, [members]);

  const totalRevenue = useMemo(() => {
    if (!sales) return 0;
    return sales.reduce((acc, sale) => acc + (sale.amount || 0), 0);
  }, [sales]);

  if (membersLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h1 className="text-3xl font-bold font-headline tracking-tight">Hello, Deshik</h1>
        </div>
        <p className="text-muted-foreground">Welcome to your Zenith Gym OS project overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/sales" aria-label="View Sales Report">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total collections synced</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/members" aria-label="View Member Directory">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Cloud database count</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/absent" aria-label="View Retention Alerts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.nonActive}</div>
              <p className="text-xs text-muted-foreground">Members with lapsed subs</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer group shadow-lg border-none">
          <Link href="/admin/register" aria-label="Register New Member">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
              <UserPlus className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Add Member</div>
              <p className="text-xs opacity-80">Quick registration</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <div className="col-span-4">
          <Overview />
        </div>
        <Card className="col-span-3 shadow-md border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Membership Breakdown
            </CardTitle>
            <CardDescription>Real-time category distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">Group Members</span>
                </div>
                <span className="font-bold">{stats.group}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: stats.total > 0 ? `${(stats.group / stats.total) * 100}%` : '0%' }} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <span className="text-sm font-medium">Personal Training</span>
                </div>
                <span className="font-bold">{stats.personal}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-accent/60 h-2 rounded-full transition-all duration-500" 
                  style={{ width: stats.total > 0 ? `${(stats.personal / stats.total) * 100}%` : '0%' }} 
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Status</span>
                <span className="text-sm text-green-500 font-bold flex items-center gap-1 uppercase tracking-tighter">
                  Active: {stats.active}
                </span>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full mt-2">
              <Link href="/admin/members">
                Detailed Directory <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

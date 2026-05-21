'use client';

import {
  BarChart3,
  Clock,
  UserPlus,
  Users,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Overview } from './components/overview';

export default function ReceptionDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reception Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening at Thrive Fit today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/sales">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Report</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,845.00</div>
              <p className="text-xs text-muted-foreground">View Revenue Analytics</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members List</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,248</div>
              <p className="text-xs text-muted-foreground">Manage All Profiles</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/absent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Frequent Absents</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34</div>
              <p className="text-xs text-muted-foreground">Absent &gt; 2 Days</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer group shadow-lg border-none">
          <Link href="/admin/register">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Registration</CardTitle>
              <UserPlus className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Add Member</div>
              <p className="text-xs opacity-80">Quick Enrollment Form</p>
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
              Real-time Analytics
            </CardTitle>
            <CardDescription>Membership breakdown by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium">Group Members</span>
                </div>
                <span className="font-bold">850</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent/60" />
                  <span className="text-sm font-medium">Personal Training</span>
                </div>
                <span className="font-bold">398</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent/60 h-2 rounded-full" style={{ width: '32%' }} />
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium Monthly Growth</span>
                <span className="text-sm text-green-500 font-bold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic">*Compared to previous 30 days</p>
            </div>

            <Button asChild variant="outline" className="w-full mt-2">
              <Link href="/admin/members">
                Detailed Member Logs <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

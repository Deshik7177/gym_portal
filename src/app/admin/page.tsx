
'use client';

import {
  BarChart3,
  Clock,
  UserPlus,
  Users,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
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

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-colors cursor-pointer group">
          <Link href="/admin/sales">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,845.00</div>
              <p className="text-xs text-muted-foreground">View Sales Report</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-colors cursor-pointer group">
          <Link href="/admin/members">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,248</div>
              <p className="text-xs text-muted-foreground">Manage Members List</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-colors cursor-pointer group">
          <Link href="/admin/absent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Frequent Absents</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">34</div>
              <p className="text-xs text-muted-foreground">Absent > 2 days</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer group">
          <Link href="/admin/register">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Registration</CardTitle>
              <UserPlus className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Add Member</div>
              <p className="text-xs opacity-80">Start registration form</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <div className="col-span-4">
          <Overview />
        </div>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Analytics Summary</CardTitle>
            <CardDescription>Members Breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm">Group Members</span>
              </div>
              <span className="font-bold">850</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-sm">Personal Members</span>
              </div>
              <span className="font-bold">398</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Growth Rate</span>
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12%
                </span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/admin/members">
                Detailed Analytics <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

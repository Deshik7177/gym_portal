'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Clock,
  UserPlus,
  Users,
  ArrowUpRight,
  Activity,
  Loader2,
  TrendingUp,
  Sparkles,
  UserCircle,
  DoorOpen,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { parseISO, isAfter, startOfDay } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const Overview = dynamic(() => import('./components/overview').then(mod => mod.Overview), {
  loading: () => <div className="h-[350px] w-full bg-muted/20 animate-pulse rounded-xl" />,
  ssr: false
});

export default function ReceptionDashboard() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  
  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading: membersLoading } = useCollection<any>(membersRef);

  const recentMembersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'members'), orderBy('createdAt', 'desc'), limit(5));
  }, [db]);
  const { data: recentMembers } = useCollection<any>(recentMembersQuery);

  const salesRef = useMemo(() => db ? query(collection(db, 'sales')) : null, [db]);
  const { data: sales } = useCollection<any>(salesRef);

  const stats = useMemo(() => {
    if (!members) return { total: 0, group: 0, personal: 0, active: 0, expired: 0 };
    
    const activeMembers = members.filter(m => {
      const expiryDate = m.endDate ? parseISO(m.endDate) : null;
      return expiryDate ? !isAfter(today, expiryDate) : true;
    });

    return {
      total: members.length,
      group: members.filter(m => m.type === 'group').length,
      personal: members.filter(m => m.type === 'personal').length,
      active: activeMembers.length,
      expired: members.length - activeMembers.length
    };
  }, [members, today]);

  const totalRevenue = useMemo(() => {
    if (!sales) return 0;
    return sales.reduce((acc, sale) => acc + (sale.amount || 0), 0);
  }, [sales]);

  const handleManualGateOpen = async () => {
    if (!db || isOpening) return;
    setIsOpening(true);
    try {
      const expiresAt = Date.now() + 5000;

      await setDoc(doc(db, 'gateControl', 'latest'), {
        command: 'OPEN',
        status: 'pending',
        method: 'manual',
        memberId: 'DASHBOARD_OVERRIDE',
        timestamp: serverTimestamp(),
        expiresAt: expiresAt
      });
      
      toast({
        title: "Override Dispatched",
        description: "Secure command sent to gateControl/latest (Expires in 5s).",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Override Failed",
        description: "Cloud sync failed. Check your connection.",
      });
    } finally {
      setIsOpening(false);
    }
  };

  if (membersLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Hello, Staff</h1>
          </div>
          <p className="text-muted-foreground">Welcome to your Thrive Fit project overview.</p>
        </div>

        <Card className="border-primary/20 bg-primary/5 flex items-center p-4 gap-4 rounded-2xl shadow-sm border">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Hardware Link</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase text-foreground">ESP32 Online</span>
            </div>
          </div>
          <Button 
            onClick={handleManualGateOpen} 
            disabled={isOpening}
            className="h-12 px-6 font-black uppercase tracking-tighter text-xs shadow-xl shadow-primary/20 rounded-xl"
          >
            {isOpening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DoorOpen className="h-4 w-4 mr-2" />}
            Open Gate
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/sales" aria-label="View Sales Report">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-foreground">₹{totalRevenue.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Cloud database count</p>
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary transition-all cursor-pointer group shadow-md border-border/40">
          <Link href="/admin/absent" aria-label="View Retention Alerts">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Subscription lapsed</p>
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
        <div className="col-span-4 space-y-4">
          <Overview />
          <Card className="shadow-md border-border/40">
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest members added to the cloud database.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMembers && recentMembers.length > 0 ? (
                  recentMembers.map((member: any) => (
                    <div key={member.phone} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{member.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">{member.phone}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{member.type}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-10">No recent registrations found.</p>
                )}
              </div>
              <Button asChild variant="ghost" className="w-full mt-4 text-xs">
                <Link href="/admin/members">View Full Directory</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-3 space-y-4">
          <Card className="shadow-md border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 text-foreground">
                <Zap className="h-4 w-4 text-primary" /> Command Center
              </CardTitle>
              <CardDescription>Manual hardware triggers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Main Entrance</span>
                     <Badge variant="outline" className="h-5 text-[9px] bg-green-500/10 text-green-500 border-none">READY</Badge>
                  </div>
                  <Button 
                    onClick={handleManualGateOpen} 
                    disabled={isOpening}
                    className="w-full h-14 font-black uppercase tracking-widest text-sm rounded-xl"
                  >
                    {isOpening ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <DoorOpen className="h-5 w-5 mr-2" />}
                    Pulse Gate Relay
                  </Button>
                  <p className="text-[9px] text-muted-foreground text-center italic">Sends secure pending command with 5s expiry window</p>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-border/40 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Breakdown
              </CardTitle>
              <CardDescription>Real-time category distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium text-foreground">Group Members</span>
                  </div>
                  <span className="font-bold text-foreground">{stats.group}</span>
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
                    <span className="text-sm font-medium text-foreground">Personal Training</span>
                  </div>
                  <span className="font-bold text-foreground">{stats.personal}</span>
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
                  <span className="text-sm font-medium text-foreground">System Status</span>
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
    </div>
  );
}

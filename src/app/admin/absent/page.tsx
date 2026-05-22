'use client';

import { useMemo } from 'react';
import { Clock, AlertTriangle, UserMinus, Phone, Calendar, Loader2 } from 'lucide-react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { differenceInDays, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FrequentAbsentPage() {
  const db = useFirestore();
  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  const absentMembers = useMemo(() => {
    if (!members) return [];
    
    const now = new Date();
    return members
      .map((m: any) => {
        // Use lastCheckIn or fallback to createdAt
        const lastSeenTimestamp = m.lastCheckIn || m.createdAt;
        const lastSeenDate = lastSeenTimestamp?.seconds 
          ? new Date(lastSeenTimestamp.seconds * 1000) 
          : null;
        
        const days = lastSeenDate ? differenceInDays(now, lastSeenDate) : 99;
        return { ...m, daysAbsent: days, lastSeenDate };
      })
      .filter(m => m.daysAbsent >= 2 && m.status === 'active')
      .sort((a, b) => b.daysAbsent - a.daysAbsent);
  }, [members]);

  const severeAbsents = absentMembers.filter(a => a.daysAbsent > 5).length;
  const recentAbsents = absentMembers.filter(a => a.daysAbsent >= 2 && a.daysAbsent <= 5).length;

  if (loading) {
    return (
      <div className="flex h-60 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline">Retention Alerts</h1>
        <p className="text-muted-foreground">Members who haven't checked in for 2 or more days.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-destructive/10 border-destructive/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2 text-sm uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" /> Critical Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{severeAbsents}</div>
            <p className="text-xs opacity-70">Absent for &gt; 5 days</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4" /> At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentAbsents}</div>
            <p className="text-xs text-muted-foreground">Absent for 2-5 days</p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <UserMinus className="h-4 w-4" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
                {members ? ((absentMembers.length / members.length) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Churn Probability</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Absent Members List</CardTitle>
          <CardDescription>Follow up with members who are losing consistency.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Last Check-In</TableHead>
                <TableHead>Days Absent</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {absentMembers.length > 0 ? absentMembers.map((member) => (
                <TableRow key={member.phone} className={member.daysAbsent > 5 ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{member.fullName}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-2 w-2" /> {member.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px] h-5">{member.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {member.lastSeenDate ? format(member.lastSeenDate, 'MMM dd, yyyy') : 'Never'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold text-sm ${member.daysAbsent > 5 ? 'text-destructive' : 'text-orange-500'}`}>
                          {member.daysAbsent} days
                      </span>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${member.daysAbsent > 5 ? 'bg-destructive' : 'bg-orange-500'}`} 
                          style={{ width: `${Math.min(member.daysAbsent * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={member.daysAbsent > 5 ? 'destructive' : 'outline'} className="h-8">
                      {member.daysAbsent > 5 ? 'Urgent Call' : 'Send Reminder'}
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Excellent! No members are currently flagged as absent.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
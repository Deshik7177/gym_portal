
'use client';

import { Clock, AlertTriangle, UserMinus, Phone, Calendar } from 'lucide-react';

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

const MOCK_ABSENTS = [
  { id: '1', name: 'Alice Green', phone: '1234567890', days: 5, lastSeen: '2024-05-16', type: 'group' },
  { id: '2', name: 'Bob White', phone: '0987654321', days: 3, lastSeen: '2024-05-18', type: 'personal' },
  { id: '3', name: 'Charlie Black', phone: '5551234567', days: 7, lastSeen: '2024-05-14', type: 'group' },
  { id: '4', name: 'Diana Prince', phone: '4449876543', days: 12, lastSeen: '2024-05-09', type: 'personal' },
  { id: '5', name: 'Frank Castle', phone: '7776665555', days: 2, lastSeen: '2024-05-19', type: 'group' },
];

export default function FrequentAbsentPage() {
  const severeAbsents = MOCK_ABSENTS.filter(a => a.days > 5).length;
  const recentAbsents = MOCK_ABSENTS.filter(a => a.days >= 2 && a.days <= 5).length;

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
            <p className="text-xs opacity-70">Absent for > 5 days</p>
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
                <UserMinus className="h-4 w-4" /> Weekly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">+4%</div>
            <p className="text-xs text-muted-foreground">Vs. previous week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Absent Members List</CardTitle>
          <CardDescription>Daily report for front-desk follow-ups.</CardDescription>
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
              {MOCK_ABSENTS.map((member) => (
                <TableRow key={member.id} className={member.days > 5 ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{member.name}</span>
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
                      {member.lastSeen}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold text-sm ${member.days > 5 ? 'text-destructive' : 'text-orange-500'}`}>
                          {member.days} days
                      </span>
                      <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${member.days > 5 ? 'bg-destructive' : 'bg-orange-500'}`} 
                          style={{ width: `${Math.min(member.days * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={member.days > 5 ? 'destructive' : 'outline'} className="h-8">
                      {member.days > 5 ? 'Urgent Call' : 'Send Reminder'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

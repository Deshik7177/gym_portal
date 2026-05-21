
'use client';

import { Clock, AlertTriangle, UserMinus } from 'lucide-react';

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

const MOCK_ABSENTS = [
  { id: '1', name: 'Alice Green', phone: '1234567890', days: 5, lastSeen: '2024-05-16' },
  { id: '2', name: 'Bob White', phone: '0987654321', days: 3, lastSeen: '2024-05-18' },
  { id: '3', name: 'Charlie Black', phone: '5551234567', days: 7, lastSeen: '2024-05-14' },
  { id: '4', name: 'Diana Prince', phone: '4449876543', days: 12, lastSeen: '2024-05-09' },
];

export default function FrequentAbsentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Frequent Absents</h1>
        <p className="text-muted-foreground">Members who haven't checked in for more than 2 days.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Urgent Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs opacity-80">Absent > 1 week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Recent Absents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">22</div>
            <p className="text-xs text-muted-foreground">Absent 2-6 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" /> Retention Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5.2%</div>
            <p className="text-xs text-muted-foreground">Of total membership</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Absent Members List</CardTitle>
          <CardDescription>Follow up with these members to improve retention.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last Check-In</TableHead>
                <TableHead>Days Absent</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ABSENTS.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>{member.lastSeen}</TableCell>
                  <TableCell>
                    <span className={`font-bold ${member.days > 5 ? 'text-destructive' : 'text-orange-500'}`}>
                        {member.days} days
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">Reach Out</Button>
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

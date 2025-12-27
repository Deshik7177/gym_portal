import { Badge } from '@/components/ui/badge';
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

const entryHistory = [
  { date: '2024-05-21', time: '18:05:32', status: 'Granted' },
  { date: '2024-05-20', time: '18:10:15', status: 'Granted' },
  { date: '2024-05-19', time: '07:30:00', status: 'Granted' },
  { date: '2024-05-18', time: '19:00:45', status: 'Granted' },
  { date: '2024-05-17', time: '07:25:50', status: 'Denied - Out of credits' },
];

export default function MemberDashboard() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Membership Status</CardTitle>
            <CardDescription>Your current standing</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="text-lg bg-[#2E7D32] text-white hover:bg-[#2E7D32]/80">Active</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Active Plan</CardTitle>
            <CardDescription>Annual Gold Membership</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Expires: 2025-05-15</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Remaining Credits</CardTitle>
            <CardDescription>For special classes</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Member ID</CardTitle>
            <CardDescription>Your unique identifier</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-xl font-mono font-bold">USR001</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry History</CardTitle>
          <CardDescription>Your recent check-ins at the gym.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Access Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entryHistory.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.time}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'Granted' ? 'default' : 'destructive'} className={entry.status === 'Granted' ? 'bg-[#2E7D32] hover:bg-[#2E7D32]/80 text-white' : ''}>
                      {entry.status}
                    </Badge>
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

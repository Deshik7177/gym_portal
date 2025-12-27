import { Badge } from '@/components/ui/badge';
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
import { Repeat, UserPlus } from 'lucide-react';

const accessLogs = [
    { time: '18:05:32', memberId: 'USR001', name: 'John Doe', status: 'Granted' },
    { time: '18:02:11', memberId: 'USR003', name: 'Mike Johnson', status: 'Granted' },
    { time: '17:55:03', memberId: 'USR002', name: 'Jane Smith', status: 'Denied' },
    { time: '17:40:45', memberId: 'N/A', name: 'Unknown', status: 'Denied' },
    { time: '17:30:19', memberId: 'USR005', name: 'Chris Wilson', status: 'Granted' },
];

export default function CounterPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-3 flex flex-col gap-4">
             <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Perform common front-desk tasks.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button size="lg" className="h-24 text-lg">
                        <UserPlus className="mr-4 h-8 w-8"/>
                        Register New User
                    </Button>
                     <Button size="lg" variant="secondary" className="h-24 text-lg">
                        <Repeat className="mr-4 h-8 w-8"/>
                        Renew Subscription
                    </Button>
                </CardContent>
            </Card>
        </div>
        <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Today's Access Logs</CardTitle>
          <CardDescription>
            Live feed of member check-ins for today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessLogs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>{log.time}</TableCell>
                  <TableCell className="font-medium">{log.memberId}</TableCell>
                  <TableCell>{log.name}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'Granted' ? 'default' : 'destructive'} className={log.status === 'Granted' ? 'bg-green-500 text-white' : ''}>
                      {log.status}
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

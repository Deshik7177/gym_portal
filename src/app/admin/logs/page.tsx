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

const accessLogs = [
  { time: '2024-05-21 18:05:32', memberId: 'USR001', name: 'John Doe', rfid: 'A1B2C3D4', status: 'Granted', reason: 'Active Subscription' },
  { time: '2024-05-21 18:02:11', memberId: 'USR003', name: 'Mike Johnson', rfid: 'E5F6G7H8', status: 'Granted', reason: 'Active Subscription' },
  { time: '2024-05-21 17:55:03', memberId: 'USR002', name: 'Jane Smith', rfid: 'I9J0K1L2', status: 'Denied', reason: 'Subscription Expired' },
  { time: '2024-05-21 17:40:45', memberId: 'N/A', name: 'Unknown', rfid: 'M3N4O5P6', status: 'Denied', reason: 'Card not registered' },
  { time: '2024-05-21 17:30:19', memberId: 'USR005', name: 'Chris Wilson', rfid: 'Q7R8S9T0', status: 'Granted', reason: 'Active Subscription' },
  { time: '2024-05-21 08:30:00', memberId: 'USR004', name: 'Emily Brown', rfid: 'U1V2W3X4', status: 'Denied', reason: 'Card Suspended' },
];

export default function AdminLogsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RFID Access Logs</CardTitle>
        <CardDescription>
          A real-time log of all member entry attempts via RFID.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>RFID UID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accessLogs.map((log, index) => (
              <TableRow key={index}>
                <TableCell>{log.time}</TableCell>
                <TableCell className="font-medium">{log.memberId}</TableCell>
                <TableCell>{log.name}</TableCell>
                <TableCell>{log.rfid}</TableCell>
                <TableCell>
                  <Badge variant={log.status === 'Granted' ? 'default' : 'destructive'} className={log.status === 'Granted' ? 'bg-green-500 text-white' : ''}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>{log.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

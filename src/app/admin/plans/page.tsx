import { PlusCircle } from 'lucide-react';

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

const plans = [
  { name: 'Monthly Basic', price: '29.99', duration: '30 days', entryType: 'Unlimited', timeSlots: 'All Day' },
  { name: 'Quarterly Pro', price: '79.99', duration: '90 days', entryType: 'Unlimited', timeSlots: 'All Day' },
  { name: 'Annual Gold', price: '299.99', duration: '365 days', entryType: 'Unlimited', timeSlots: 'All Day' },
  { name: '10-Credit Pack', price: '50.00', duration: '90 days', entryType: 'Credit-based', timeSlots: 'Off-peak' },
  { name: 'Morning Bird', price: '19.99', duration: '30 days', entryType: 'Unlimited', timeSlots: '5am - 10am' },
];

export default function AdminPlansPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage membership plans.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
          <CardDescription>A list of all available subscription plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price (USD)</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Entry Type</TableHead>
                <TableHead>Allowed Times</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.name}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${plan.price}</TableCell>
                  <TableCell>{plan.duration}</TableCell>
                  <TableCell>
                    <Badge variant={plan.entryType === 'Unlimited' ? 'default' : 'secondary'}>{plan.entryType}</Badge>
                  </TableCell>
                  <TableCell>{plan.timeSlots}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

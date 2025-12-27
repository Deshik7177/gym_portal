import { Download } from 'lucide-react';
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

const invoices = [
  { invoiceId: 'INV001', date: '2024-05-15', amount: '$299.99', status: 'Paid', description: 'Annual Gold Plan' },
  { invoiceId: 'INV002', date: '2024-02-10', amount: '$50.00', status: 'Paid', description: '10-Credit Pack' },
  { invoiceId: 'INV003', date: '2023-05-15', amount: '$299.99', status: 'Paid', description: 'Annual Gold Plan' },
];

export default function BillingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices & Payment History</CardTitle>
        <CardDescription>
          A record of all your payments and invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.invoiceId}>
                <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                <TableCell>{invoice.date}</TableCell>
                <TableCell>{invoice.description}</TableCell>
                <TableCell>{invoice.amount}</TableCell>
                <TableCell>
                  <Badge className="bg-[#2E7D32] hover:bg-[#2E7D32]/80 text-white">{invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download Invoice</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

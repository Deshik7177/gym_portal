
'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  Calendar as CalendarIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MOCK_SALES = [
  { id: 'S1', member: 'John Doe', amount: 300, date: '2024-05-20', category: 'membership', desc: 'Annual Gold' },
  { id: 'S2', member: 'Jane Smith', amount: 50, date: '2024-05-21', category: 'personal training', desc: '1 Session' },
  { id: 'S3', member: 'Mike Johnson', amount: 150, date: '2024-05-19', category: 'membership', desc: 'Quarterly Pro' },
  { id: 'S4', member: 'Sarah Wilson', amount: 50, date: '2024-05-18', category: 'personal training', desc: '1 Session' },
  { id: 'S5', member: 'Chris Brown', amount: 29.99, date: '2024-05-15', category: 'membership', desc: 'Monthly Basic' },
];

export default function SalesReportPage() {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('month');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
          <p className="text-muted-foreground">Analyze gym revenue and transaction history.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-8"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="personal training">Personal Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_SALES.filter(s => filter === 'all' || s.category === filter).map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell className="font-medium">{sale.member}</TableCell>
                  <TableCell className="capitalize">{sale.category}</TableCell>
                  <TableCell>{sale.desc}</TableCell>
                  <TableCell className="text-right font-bold">${sale.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

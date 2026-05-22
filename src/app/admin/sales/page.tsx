'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  Calendar as CalendarIcon,
  Loader2,
  X,
  CalendarDays
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SalesReportPage() {
  const db = useFirestore();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  const salesRef = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'sales'), orderBy('date', 'desc'));
  }, [db]);
  
  const { data: sales, loading } = useCollection<any>(salesRef);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    return sales.filter(s => {
      const matchesSearch = s.memberName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filter === 'all' || s.category === filter;
      
      let matchesDate = true;
      if (s.date) {
        const saleDate = parseISO(s.date);
        if (dateFrom && saleDate < startOfDay(dateFrom)) matchesDate = false;
        if (dateTo && saleDate > endOfDay(dateTo)) matchesDate = false;
      } else if (dateFrom || dateTo) {
        matchesDate = false; // If filtering by date but sale has no date
      }
      
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [sales, searchTerm, filter, dateFrom, dateTo]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [filteredSales]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (loading) {
    return (
      <div className="flex h-60 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Sales Report</h1>
          <p className="text-muted-foreground">Gym revenue and transaction history.</p>
        </div>
        <div className="flex gap-2">
          {(searchTerm || filter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-9">
              <X className="mr-1 h-3 w-3" /> Clear Filters
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Filtered Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">Transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="lg:col-span-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="personal training">Personal Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-3">
              <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>From Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      setIsFromOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="lg:col-span-3">
              <Popover open={isToOpen} onOpenChange={setIsToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>To Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      setIsToOpen(false);
                    }}
                    disabled={(date) => dateFrom ? date < dateFrom : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-xs font-mono">
                      {sale.date ? format(parseISO(sale.date), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">{sale.memberName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] py-0">
                        {sale.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sale.description}</TableCell>
                    <TableCell className="text-right font-bold text-primary">₹{sale.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                    No transactions found for the selected filters.
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

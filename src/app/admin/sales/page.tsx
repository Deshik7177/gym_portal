'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  Calendar as CalendarIcon,
  Loader2,
  X,
  CalendarDays,
  TrendingUp,
  CreditCard
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
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold font-headline tracking-tight text-primary">Sales Report</h1>
          <p className="text-muted-foreground">Gym revenue and transaction history overview.</p>
        </div>
        <div className="flex gap-3">
          {(searchTerm || filter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={resetFilters} className="text-xs h-10 px-4 hover:bg-destructive/10 hover:text-destructive transition-colors">
              <X className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          )}
          <Button variant="outline" className="h-10 px-4 border-primary/20 hover:border-primary/50">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtered Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Total value of results</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSales.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Total count of entries</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 shadow-md overflow-hidden bg-card/30 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/20 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by member name..."
                className="pl-10 h-11 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="lg:col-span-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-11 bg-background/50">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Categories" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="personal training">Personal Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-11 justify-start text-left font-normal bg-background/50 border-input",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
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

              <Popover open={isToOpen} onOpenChange={setIsToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-11 justify-start text-left font-normal bg-background/50 border-input",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
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
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="w-[150px] font-bold uppercase text-[10px] tracking-widest pl-6">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Member</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Category</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Description</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-primary/[0.02] transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground pl-6">
                      {sale.date ? format(parseISO(sale.date), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">{sale.memberName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "capitalize text-[10px] py-0 px-2 font-bold",
                        sale.category === 'membership' ? "border-primary/20 text-primary bg-primary/5" : "border-accent/20 text-accent bg-accent/5"
                      )}>
                        {sale.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{sale.description}</TableCell>
                    <TableCell className="text-right font-bold text-primary pr-6">₹{sale.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <CreditCard className="h-10 w-10 mb-2" />
                      <p>No transactions found for the selected filters.</p>
                    </div>
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

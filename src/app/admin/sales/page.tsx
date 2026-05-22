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
  CreditCard
} from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
        matchesDate = false; 
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Sales Report</h1>
          <p className="text-muted-foreground text-sm">Review transaction history and financial performance.</p>
        </div>
        <div className="flex gap-2">
          {(searchTerm || filter !== 'all' || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={resetFilters} className="text-xs h-9 px-3">
              <X className="mr-2 h-3.5 w-3.5" /> Reset
            </Button>
          )}
          <Button variant="outline" className="h-9 px-3 text-xs border-primary/20">
            <Download className="mr-2 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <Card className="border-border/40 shadow-md overflow-hidden bg-card/30 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/20 pb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member name..."
                className="pl-10 h-10 bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full lg:w-48">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-10 bg-background/50">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="personal training">Personal Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-10 flex-1 lg:w-40 justify-start text-left font-normal bg-background/50 border-input text-xs",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                    {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>From</span>}
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
                      "h-10 flex-1 lg:w-40 justify-start text-left font-normal bg-background/50 border-input text-xs",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                    {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>To</span>}
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
                <TableHead className="w-[140px] font-bold uppercase text-[10px] tracking-widest pl-6">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Member</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Category</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest hidden md:table-cell">Description</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate hidden md:table-cell">
                      {sale.description}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary pr-6">₹{sale.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <CreditCard className="h-10 w-10 mb-2" />
                      <p>No transactions found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="p-4 border-t bg-muted/5 flex justify-end">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Filtered Revenue</span>
              <span className="text-lg font-black text-primary">₹{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  CreditCard,
  ChevronRight,
  TrendingUp,
  History
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
  CardDescription,
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
            <History className="h-8 w-8" />
            LEDGER
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold opacity-60">Financial Performance & Audit</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Settled Revenue</span>
            <span className="text-2xl font-black text-white">₹{totalRevenue.toLocaleString()}</span>
          </div>
          <Button variant="outline" size="sm" className="h-10 border-primary/20 bg-primary/5 hover:bg-primary/10">
            <Download className="mr-2 h-4 w-4" /> EXPORT
          </Button>
        </div>
      </div>

      {/* Filter Architecture */}
      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-4 px-6 bg-white/[0.02]">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="w-full lg:flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search ledger by member name..."
                className="pl-10 h-11 bg-black/40 border-white/10 focus:border-primary/50 transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full lg:w-56">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-11 bg-black/40 border-white/10">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary/70" />
                    <SelectValue placeholder="All Streams" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Revenue Streams</SelectItem>
                  <SelectItem value="membership">Member Subscriptions</SelectItem>
                  <SelectItem value="personal training">PT Packages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
              <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-11 flex-1 lg:w-40 justify-start text-left font-normal bg-black/40 border-white/10 text-xs",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                    {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>Start Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-white/10" align="start">
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
                      "h-11 flex-1 lg:w-40 justify-start text-left font-normal bg-black/40 border-white/10 text-xs",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                    {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>End Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-white/10" align="start">
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
              
              {(searchTerm || filter !== 'all' || dateFrom || dateTo) && (
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[140px] font-bold uppercase text-[10px] tracking-[0.2em] pl-8">Transaction Date</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-[0.2em]">Member Identity</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-[0.2em]">Stream</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-[0.2em] hidden md:table-cell">Memo</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] tracking-[0.2em] pr-8">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <TableCell className="text-xs font-mono text-muted-foreground/80 pl-8">
                        {sale.date ? format(parseISO(sale.date), 'MMM dd, yyyy') : 'NO DATE'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-primary transition-colors">{sale.memberName}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize text-[9px] py-0 px-2 font-black tracking-widest border-none rounded-sm",
                          sale.category === 'membership' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                        )}>
                          {sale.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground/60 max-w-[240px] truncate hidden md:table-cell italic">
                        {sale.description}
                      </TableCell>
                      <TableCell className="text-right font-black text-white pr-8">
                        ₹{sale.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-72 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <CreditCard className="h-16 w-16" />
                        <div className="space-y-1">
                          <p className="text-xl font-headline font-bold">NO TRANSACTIONS RECORDED</p>
                          <p className="text-xs font-mono">ADJUST FILTERS OR SEARCH PARAMETERS</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer Summary Bar */}
          <div className="p-6 border-t border-white/5 bg-primary/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-40">
              <TrendingUp className="h-4 w-4" />
              Showing {filteredSales.length} Transactions
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Filtered Gross</span>
                <span className="text-3xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">₹{totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  Calendar as CalendarDays,
  Loader2,
  X,
  CreditCard,
  ChevronRight,
  TrendingUp,
  History,
  Trash2,
  MoreHorizontal,
  Edit3,
  CheckCircle2
} from 'lucide-react';
import { collection, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useProfile } from '@/firebase';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function SalesReportPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const { isAdmin, loading: profileLoading } = useProfile();
  
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleDeleteSale = async (saleId: string) => {
    if (!db || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'sales', saleId));
      toast({ title: "Transaction Voided", description: "The entry has been removed from the ledger." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action Denied", description: "Only admins can void transactions." });
    }
  };

  const handleOpenEdit = (sale: any) => {
    setEditingSale(sale);
    setEditAmount(sale.amount?.toString() || '');
    setEditCategory(sale.category || '');
    setEditDescription(sale.description || '');
  };

  const handleSaveEdit = async () => {
    if (!db || !editingSale || !isAdmin) return;
    setIsSaving(true);
    
    const updateData = {
      amount: parseFloat(editAmount) || 0,
      category: editCategory,
      description: editDescription,
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(doc(db, 'sales', editingSale.id), updateData);
      toast({ title: "Transaction Updated", description: "Changes saved to the ledger." });
      setEditingSale(null);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `sales/${editingSale.id}`,
        operation: 'update',
        requestResourceData: updateData
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (loading || profileLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-primary/10 pb-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black font-headline tracking-tighter text-primary flex items-center gap-4">
            <History className="h-10 w-10 text-primary/80" />
            LEDGER
          </h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-bold opacity-50 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            Financial Performance & Audit Control
          </p>
        </div>
        <div className="flex items-center gap-6 bg-primary/5 p-4 rounded-2xl border border-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Total Settled Revenue</span>
            <span className="text-4xl font-black text-white tabular-nums">₹{totalRevenue.toLocaleString()}</span>
          </div>
          <Button variant="default" className="h-12 px-6 font-bold shadow-xl shadow-primary/10">
            <Download className="mr-2 h-4 w-4" /> EXPORT
          </Button>
        </div>
      </div>

      {/* Filter Architecture */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          <div className="w-full lg:flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by member name..."
              className="pl-11 h-12 bg-card border-primary/10 focus:border-primary/40 focus:ring-primary/20 transition-all text-sm rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full lg:w-56">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-12 bg-card border-primary/10 rounded-xl">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary/60" />
                  <SelectValue placeholder="All Streams" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="personal training">PT Packages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 flex-1 lg:w-44 justify-start text-left font-normal bg-card border-primary/10 text-xs rounded-xl",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>Start Date</span>}
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
                  variant="outline"
                  className={cn(
                    "h-12 flex-1 lg:w-44 justify-start text-left font-normal bg-card border-primary/10 text-xs rounded-xl",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-primary/60" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>End Date</span>}
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
            
            {(searchTerm || filter !== 'all' || dateFrom || dateTo) && (
              <Button variant="ghost" size="icon" onClick={resetFilters} className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <Card className="border border-primary/10 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-primary/[0.02]">
                  <TableRow className="border-primary/10 hover:bg-transparent">
                    <TableHead className="w-[180px] font-black uppercase text-[9px] tracking-[0.3em] pl-8 py-5">Date</TableHead>
                    <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                    <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Category</TableHead>
                    <TableHead className="font-black uppercase text-[9px] tracking-[0.3em] hidden md:table-cell">Memo</TableHead>
                    <TableHead className="text-right font-black uppercase text-[9px] tracking-[0.3em] pr-8">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="border-primary/5 hover:bg-primary/[0.02] transition-colors group">
                        <TableCell className="text-xs font-mono text-muted-foreground/80 pl-8 py-4">
                          {sale.date ? format(parseISO(sale.date), 'MMM dd, yyyy') : 'NO DATE'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white group-hover:text-primary transition-colors">{sale.memberName}</span>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-all -translate-x-1 group-hover:translate-x-0" />
                            </div>
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
                        <TableCell className="text-xs text-muted-foreground/60 max-w-[300px] truncate hidden md:table-cell italic font-medium">
                          {sale.description}
                        </TableCell>
                        <TableCell className="text-right font-black text-white pr-8 tabular-nums">
                           <div className="flex items-center justify-end gap-3">
                             <span>₹{sale.amount.toLocaleString()}</span>
                             {isAdmin && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-3 w-3" />
                                   </Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 rounded-xl">
                                   <DropdownMenuItem onSelect={() => handleOpenEdit(sale)} className="gap-2 cursor-pointer">
                                     <Edit3 className="h-3 w-3 text-primary" /> Edit Transaction
                                   </DropdownMenuItem>
                                   <DropdownMenuItem onSelect={() => handleDeleteSale(sale.id)} className="text-destructive gap-2 cursor-pointer">
                                     <Trash2 className="h-3 w-3" /> Void Transaction
                                   </DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-80 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <CreditCard className="h-16 w-16" />
                          <div className="space-y-1">
                            <p className="text-xl font-headline font-bold">NO TRANSACTIONS</p>
                            <p className="text-[10px] font-mono tracking-widest uppercase">Adjust filters to see more</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Footer Summary Bar */}
            <div className="p-6 border-t border-primary/10 bg-primary/[0.03] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40">
                Showing {filteredSales.length} of {sales?.length || 0} Records
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.3em]">Filtered Gross Total</span>
                  <span className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.2)] tabular-nums">₹{totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Edit Dialog */}
      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
              <Edit3 className="h-6 w-6" /> EDIT TRANSACTION
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
              Update record for {editingSale?.memberName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Amount (INR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                <Input 
                  type="number" 
                  className="pl-8 h-12 bg-black/20 border-white/10 font-bold text-lg" 
                  value={editAmount} 
                  onChange={(e) => setEditAmount(e.target.value)} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="h-12 bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="personal training">Personal Training</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Audit Memo</Label>
              <Textarea 
                className="bg-black/20 border-white/10 min-h-[80px]" 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  COMMIT CHANGES
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

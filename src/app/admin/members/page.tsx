'use client';

import { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  User, 
  MoreHorizontal, 
  Loader2, 
  Plus, 
  QrCode,
  History,
  UserCheck,
  Edit3,
  Trash2,
  AlertTriangle,
  Filter,
  Calendar as CalendarIcon,
  X,
  CheckCircle
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useProfile } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfDay, isToday, parseISO, isAfter, isBefore, endOfDay } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import { generateMemberQrPayload } from '@/lib/qr-logic';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isAdmin, isStaff, loading: profileLoading } = useProfile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [validityFilter, setValidityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  const [memberQrToShow, setMemberQrToShow] = useState<any>(null);
  const [memberForHistory, setMemberForHistory] = useState<any>(null);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  const attendanceQuery = useMemo(() => {
    if (!db || !memberForHistory) return null;
    return query(
      collection(db, 'attendance'),
      where('memberId', '==', memberForHistory.phone || memberForHistory.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
  }, [db, memberForHistory]);

  const { data: memberLogs, loading: logsLoading } = useCollection<any>(attendanceQuery);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => {
      const matchesSearch = (m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.phone?.includes(searchTerm));
      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || m.status === categoryFilter;

      const expiryDate = m.endDate ? parseISO(m.endDate) : null;
      const startDate = m.startDate ? parseISO(m.startDate) : null;
      const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
      const notStarted = startDate ? isAfter(startDate, today) : false;
      const isValid = !isExpired && !notStarted;

      let matchesValidity = true;
      if (validityFilter === 'live_active') matchesValidity = isValid;
      if (validityFilter === 'live_expired') matchesValidity = isExpired;

      let matchesDates = true;
      if (expiryDate) {
        if (dateFrom && isBefore(expiryDate, startOfDay(dateFrom))) matchesDates = false;
        if (dateTo && isAfter(expiryDate, endOfDay(dateTo))) matchesDates = false;
      } else if (dateFrom || dateTo) {
        matchesDates = false;
      }

      return matchesSearch && matchesType && matchesCategory && matchesValidity && matchesDates;
    });
  }, [members, searchTerm, typeFilter, categoryFilter, validityFilter, dateFrom, dateTo, today]);

  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, personal: 0 };
    return {
      total: members.length,
      active: members.filter(m => {
        const expiryDate = m.endDate ? parseISO(m.endDate) : null;
        return expiryDate ? !isAfter(today, expiryDate) : true;
      }).length,
      personal: members.filter(m => m.type === 'personal').length,
    };
  }, [members, today]);

  const handleManualCheckIn = async (member: any) => {
    if (!db || isProcessingCheckIn) return;

    const expiryDate = member.endDate ? parseISO(member.endDate) : null;
    const startDate = member.startDate ? parseISO(member.startDate) : null;
    const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
    const notStarted = startDate ? isAfter(startDate, today) : false;

    if (isExpired || notStarted) {
        toast({ 
          variant: "destructive", 
          title: "Access Denied", 
          description: isExpired ? "Membership has expired." : "Access not yet active." 
        });
        return;
    }

    setIsProcessingCheckIn(member.phone);
    const memberId = member.phone || member.id;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceDocId = `${memberId}_${todayStr}`;
    const timestamp = serverTimestamp();
    const expiresAt = Date.now() + 5000;
    
    setDoc(doc(db, 'gateControl', 'latest'), {
      command: 'OPEN',
      status: 'pending',
      timestamp: timestamp,
      expiresAt: expiresAt,
      memberId: memberId,
      method: 'manual'
    }).catch(() => {});

    updateDoc(doc(db, 'members', memberId), {
      lastCheckIn: timestamp,
      updatedAt: timestamp
    }).catch(() => {});

    setDoc(doc(db, 'attendance', attendanceDocId), {
      memberId: memberId,
      memberName: member.fullName,
      timestamp: timestamp,
      method: 'manual',
      latency: 0
    }, { merge: true }).catch(() => {});

    toast({ title: "Attendance Recorded" });
    setIsProcessingCheckIn(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setValidityFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleDeleteMember = async () => {
    if (!db || !memberToDelete || !isAdmin) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'members', memberToDelete.phone));
      toast({ title: "Member Deleted" });
      setMemberToDelete(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || profileLoading) return <div className="flex h-60 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase tracking-tighter text-primary">Vault Directory</h1>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">System Registry</p>
        </div>
        <Button asChild className="h-12 px-8 rounded-xl font-bold">
          <Link href="/admin/register"><Plus className="mr-2 h-4 w-4" /> Enroll New Member</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Registered Population</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-black">{stats.total}</div></CardContent>
         </Card>
         <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Current Active</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-black text-green-500">{stats.active}</div></CardContent>
         </Card>
         <Card className="bg-accent/5 border-accent/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Personal Training</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-black text-accent">{stats.personal}</div></CardContent>
         </Card>
      </div>

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search member ID or name..." className="pl-10 h-11 bg-black/20 border-white/10 rounded-xl w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-11 w-40 bg-black/20 border-white/10 rounded-xl"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="personal">Personal Training</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11 w-40 bg-black/20 border-white/10 rounded-xl"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="active">Active Term</SelectItem>
                    <SelectItem value="non-active">Non-Active Term</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={validityFilter} onValueChange={setValidityFilter}>
                  <SelectTrigger className="h-11 w-40 bg-black/20 border-white/10 rounded-xl"><SelectValue placeholder="Live Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Live Status</SelectItem>
                    <SelectItem value="live_active">Currently Active</SelectItem>
                    <SelectItem value="live_expired">Currently Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-11 w-48 justify-start text-left font-normal bg-black/20 border-white/10 rounded-xl", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-40" />
                      {dateFrom ? format(dateFrom, "MMM dd, yyyy") : <span>Expiry From</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-11 w-48 justify-start text-left font-normal bg-black/20 border-white/10 rounded-xl", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-40" />
                      {dateTo ? format(dateTo, "MMM dd, yyyy") : <span>Expiry To</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={(date) => dateFrom ? date < dateFrom : false} initialFocus /></PopoverContent>
                </Popover>
                {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || validityFilter !== 'all' || dateFrom || dateTo) && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive rounded-xl"><X className="h-5 w-5" /></Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Status & Plan</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Term</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Phone</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? filteredMembers.map((member) => {
                const expiryDate = member.endDate ? parseISO(member.endDate) : null;
                const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
                return (
                  <TableRow key={member.phone} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {member.photoData ? <img src={member.photoData} className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{member.fullName}</span>
                          <span className="text-[9px] font-black uppercase opacity-30">{member.status} TERM</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={!isExpired ? 'default' : 'destructive'} className={cn("text-[8px] font-black uppercase", !isExpired ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive")}>
                          {isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[8px] font-black uppercase border-none">{member.type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                       <span className={cn("text-[10px] font-bold", isExpired ? "text-destructive" : "text-foreground/80")}>
                          {member.endDate ? format(parseISO(member.endDate), 'MMM dd, yyyy') : 'N/A'}
                       </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs opacity-40">{member.phone}</TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl">{isProcessingCheckIn === member.phone ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover border-border rounded-xl">
                          <DropdownMenuItem onSelect={() => handleManualCheckIn(member)} className={cn("p-3 gap-3", isExpired ? "opacity-50" : "text-green-500")} disabled={isExpired}>
                            <UserCheck className="h-4 w-4" /> Manual Check-In
                          </DropdownMenuItem>
                          {(isAdmin || isStaff) && (
                            <DropdownMenuItem onSelect={() => router.push(`/admin/register?edit=${member.phone}`)} className="p-3 gap-3">
                              <Edit3 className="h-4 w-4 text-primary" /> Edit Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setMemberForHistory(member)} className="p-3 gap-3"><History className="h-4 w-4 text-accent" /> View History</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMemberQrToShow(member)} className="p-3 gap-3"><QrCode className="h-4 w-4 text-primary" /> View Entry QR</DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onSelect={() => setMemberToDelete(member)} className="p-3 gap-3 text-destructive"><Trash2 className="h-4 w-4" /> Delete Member</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={5} className="h-32 text-center opacity-30 uppercase text-xs">No members found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!memberForHistory} onOpenChange={(open) => !open && setMemberForHistory(null)}>
        <DialogContent className="sm:max-w-lg bg-popover border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline uppercase">Entry History: {memberForHistory?.fullName}</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold opacity-40">Last 20 Logged Entries</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto rounded-xl border border-border bg-muted/20">
             {logsLoading ? (
               <div className="h-32 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
             ) : (
               <Table>
                 <TableHeader><TableRow><TableHead className="text-[9px] font-black uppercase pl-6">Timestamp</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-6">Method</TableHead></TableRow></TableHeader>
                 <TableBody>
                   {memberLogs && memberLogs.length > 0 ? memberLogs.map((log: any) => (
                     <TableRow key={log.id} className="border-white/5">
                        <TableCell className="pl-6 py-4"><span className="text-xs font-bold">{log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : 'Recently'}</span></TableCell>
                        <TableCell className="text-right pr-6"><Badge variant="outline" className="text-[9px] font-black uppercase">{log.method}</Badge></TableCell>
                     </TableRow>
                   )) : <TableRow><TableCell colSpan={2} className="h-32 text-center opacity-20 text-xs">NO ENTRIES RECORDED</TableCell></TableRow>}
                 </TableBody>
               </Table>
             )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberQrToShow} onOpenChange={(open) => !open && setMemberQrToShow(null)}>
        <DialogContent className="sm:max-w-md bg-popover border-border rounded-3xl p-6 flex flex-col items-center">
             <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-muted">
                {memberQrToShow && <QRCodeCanvas value={generateMemberQrPayload(memberQrToShow.phone)} size={256} level="M" includeMargin={true} />}
             </div>
             <p className="text-[9px] font-mono opacity-40 uppercase mt-4">Passport ID: {memberQrToShow?.phone}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && !isDeleting && setMemberToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-popover border-border rounded-3xl p-8">
          <DialogHeader>
            <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
            <DialogTitle className="text-2xl font-black font-headline uppercase">Delete Member?</DialogTitle>
            <DialogDescription className="text-muted-foreground">Are you sure you want to remove <b>{memberToDelete?.fullName}</b>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="ghost" onClick={() => setMemberToDelete(null)} disabled={isDeleting} className="flex-1 rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isDeleting} className="flex-1 rounded-xl font-bold">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

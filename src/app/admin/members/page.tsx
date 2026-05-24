'use client';

import { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  User, 
  MoreHorizontal, 
  ArrowUpRight, 
  Loader2, 
  Trash2, 
  Plus, 
  Calendar as CalendarIcon,
  CreditCard,
  QrCode,
  Download,
  Filter,
  X,
  UserCheck,
  History,
  ShieldAlert,
  CalendarDays
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, serverTimestamp, addDoc, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useProfile } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfDay, isToday, parseISO } from 'date-fns';
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isAdmin, loading: profileLoading } = useProfile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [memberForPT, setMemberForPT] = useState<any>(null);
  const [memberQrToShow, setMemberQrToShow] = useState<any>(null);
  const [memberForHistory, setMemberForHistory] = useState<any>(null);
  const [isUpdatingPT, setIsUpdatingPT] = useState(false);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState<string | null>(null);
  
  const [ptPrice, setPtPrice] = useState('');
  const [ptStartDate, setPtStartDate] = useState<Date | undefined>(undefined);
  const [ptEndDate, setPtEndDate] = useState<Date | undefined>(undefined);
  const [isPtStartDateOpen, setIsPtStartDateOpen] = useState(false);
  const [isPtEndDateOpen, setIsPtEndDateOpen] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  const attendanceQuery = useMemo(() => {
    if (!db || !memberForHistory) return null;
    return query(
      collection(db, 'attendance'),
      where('memberId', '==', memberForHistory.phone),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [db, memberForHistory]);

  const { data: memberLogs, loading: logsLoading } = useCollection<any>(attendanceQuery);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => {
      const matchesSearch = (m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.phone?.includes(searchTerm));
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      const matchesType = filterType === 'all' || m.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [members, searchTerm, filterStatus, filterType]);

  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, personal: 0 };
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      personal: members.filter(m => m.type === 'personal').length,
    };
  }, [members]);

  // Helpers for PT date restrictions (Moved up to follow Rules of Hooks)
  const ptLimits = useMemo(() => {
    if (!memberForPT) return null;
    return {
      start: memberForPT.startDate ? parseISO(memberForPT.startDate) : today,
      end: memberForPT.endDate ? parseISO(memberForPT.endDate) : undefined
    };
  }, [memberForPT, today]);

  const handleDeleteMember = () => {
    if (!db || !memberToDelete || !isAdmin) return;
    deleteDoc(doc(db, 'members', memberToDelete.phone))
      .then(() => {
        toast({ title: "Member Removed" });
        setMemberToDelete(null);
      });
  };

  const handleManualCheckIn = async (member: any) => {
    if (!db || isProcessingCheckIn) return;
    setIsProcessingCheckIn(member.phone);
    try {
      const timestamp = serverTimestamp();
      const lastCheckInDate = member.lastCheckIn?.seconds 
        ? new Date(member.lastCheckIn.seconds * 1000) 
        : null;

      const alreadyLoggedToday = lastCheckInDate && isToday(lastCheckInDate);

      const tasks: Promise<any>[] = [
        updateDoc(doc(db, 'members', member.phone), {
          lastCheckIn: timestamp,
          updatedAt: timestamp
        })
      ];

      if (!alreadyLoggedToday) {
        tasks.push(addDoc(collection(db, 'attendance'), {
          memberId: member.phone,
          memberName: member.fullName,
          timestamp: timestamp,
          method: 'manual',
          latency: 0
        }));
      }

      await Promise.all(tasks);
      
      toast({ 
        title: alreadyLoggedToday ? "Entry Freshness Updated" : "Manual Attendance Recorded", 
        description: alreadyLoggedToday 
          ? `Member ${member.fullName} was already logged today.` 
          : `Check-in logged for ${member.fullName}.` 
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Check-In Failed" });
    } finally {
      setIsProcessingCheckIn(null);
    }
  };

  const handleExportQr = () => {
    if (!memberQrToShow || !qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Passport_${memberQrToShow.fullName.replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      toast({ title: "Export Success", description: "Member Passport saved." });
    }
  };

  const handleSavePT = async () => {
    if (!db || !memberForPT) return;
    if (!ptPrice || !ptStartDate || !ptEndDate) {
      toast({ variant: "destructive", title: "Missing Data" });
      return;
    }
    setIsUpdatingPT(true);
    const saleData = {
      memberId: memberForPT.phone,
      memberName: memberForPT.fullName,
      amount: parseFloat(ptPrice) || 0,
      date: new Date().toISOString().split('T')[0],
      category: 'personal training',
      description: `PT: ${format(ptStartDate, 'MMM dd')} to ${format(ptEndDate, 'MMM dd')}`,
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'sales'), saleData);
      await updateDoc(doc(db, 'members', memberForPT.phone), {
        type: 'personal',
        updatedAt: serverTimestamp()
      });
      toast({ title: "PT Session Added" });
      setMemberForPT(null);
      setPtPrice('');
      setPtStartDate(undefined);
      setPtEndDate(undefined);
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `sales/new`, operation: 'create', requestResourceData: saleData }));
    } finally {
      setIsUpdatingPT(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
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
            <CardContent>
                <div className="text-3xl font-black">{stats.total}</div>
            </CardContent>
         </Card>
         <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Active Contracts</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-green-500">{stats.active}</div>
            </CardContent>
         </Card>
         <Card className="bg-accent/5 border-accent/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Personal Training</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-accent">{stats.personal}</div>
            </CardContent>
         </Card>
      </div>

      {!isAdmin && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-center gap-3">
           <ShieldAlert className="h-5 w-5 text-orange-500" />
           <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Limited View: Edit Profile/Delete Restricted to Admins</p>
        </div>
      )}

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-6">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member ID or name..."
                className="pl-10 h-11 bg-black/20 border-white/5 focus:border-primary/50 rounded-xl w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 bg-black/20 border-white/5 rounded-xl lg:w-40">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 opacity-40" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="non-active">Non-Active</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-11 bg-black/20 border-white/5 rounded-xl lg:w-40">
                   <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 opacity-40" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="personal">Personal Training</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || filterStatus !== 'all' || filterType !== 'all') && (
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Category & Status</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Membership Term</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Phone ID</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? filteredMembers.map((member) => (
                <TableRow key={member.phone} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                        {member.photoData ? <img src={member.photoData} className="w-full h-full object-cover" alt={member.fullName} /> : <User className="h-5 w-5 text-primary" />}
                      </div>
                      <span className="font-bold text-sm tracking-tight">{member.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className={cn("rounded-sm px-2 text-[8px] font-black uppercase tracking-widest border-none h-4", member.status === 'active' ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/40")}>
                          {member.status}
                        </Badge>
                        <Badge variant="outline" className={cn("rounded-sm border-none bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest h-4")}>{member.type}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                       <div className="flex flex-col">
                          <span className="text-muted-foreground uppercase text-[8px] opacity-40">Starts</span>
                          <span className="text-white/80">{member.startDate ? format(parseISO(member.startDate), 'MMM dd, yyyy') : 'N/A'}</span>
                       </div>
                       <div className="w-px h-6 bg-white/5" />
                       <div className="flex flex-col">
                          <span className="text-muted-foreground uppercase text-[8px] opacity-40">Ends</span>
                          <span className={cn(member.endDate && parseISO(member.endDate) < today ? "text-destructive" : "text-white/80")}>
                            {member.endDate ? format(parseISO(member.endDate), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs opacity-40 tracking-tighter">{member.phone}</TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                          {isProcessingCheckIn === member.phone ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-40 p-4">Member Control</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleManualCheckIn(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer text-green-500"><UserCheck className="h-4 w-4" /> Manual Check-In</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMemberForHistory(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"><History className="h-4 w-4 text-accent" /> View History</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMemberQrToShow(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"><QrCode className="h-4 w-4 text-primary" /> View Entry QR</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMemberForPT(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"><CreditCard className="h-4 w-4" /> Add PT Session</DropdownMenuItem>
                        
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onSelect={() => router.push(`/admin/register?edit=${member.phone}`)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"><ArrowUpRight className="h-4 w-4" /> Edit Profile</DropdownMenuItem>
                            <DropdownMenuItem className="p-3 gap-3 rounded-lg mx-1 text-destructive cursor-pointer" onSelect={() => setMemberToDelete(member)}><Trash2 className="h-4 w-4" /> Terminate Record</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 italic font-medium uppercase tracking-[0.2em]">No members found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Entry History Dialog */}
      <Dialog open={!!memberForHistory} onOpenChange={(open) => !open && setMemberForHistory(null)}>
        <DialogContent className="sm:max-w-lg bg-zinc-900 border-white/10 rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <History className="h-5 w-5 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Entry History</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{memberForHistory?.fullName}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-auto rounded-xl border border-white/5 bg-black/20">
             <Table>
               <TableHeader className="bg-white/[0.02]">
                 <TableRow className="border-white/5">
                   <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6">Time</TableHead>
                   <TableHead className="text-[9px] font-black uppercase tracking-widest">Method</TableHead>
                   <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-6">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {logsLoading ? (
                   <TableRow>
                     <TableCell colSpan={3} className="h-32 text-center">
                       <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto" />
                     </TableCell>
                   </TableRow>
                 ) : memberLogs && memberLogs.length > 0 ? memberLogs.map((log: any) => (
                   <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.01]">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{log.timestamp ? format(log.timestamp.toDate(), 'MMM dd') : 'Recent'}</span>
                          <span className="text-[10px] opacity-40 font-mono">{log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : '--:--:--'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-black uppercase py-0 px-2 h-5 border-white/10 opacity-60">
                          {log.method || 'manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                         <span className="text-[10px] font-black text-green-500 uppercase">Verified</span>
                      </TableCell>
                   </TableRow>
                 )) : (
                   <TableRow>
                     <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-xs italic font-medium uppercase tracking-widest opacity-20">No entry logs found</TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
          </div>
          
          <div className="mt-6">
            <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 uppercase font-black text-xs tracking-widest" onClick={() => setMemberForHistory(null)}>
              Close Audit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Passport Dialog */}
      <Dialog open={!!memberQrToShow} onOpenChange={(open) => !open && setMemberQrToShow(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter uppercase">Member Passport</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Permanent Entry ID: {memberQrToShow?.fullName}</DialogDescription>
          </div>
          <div className="flex flex-col items-center justify-center py-6 gap-6">
             <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-white/10">
                {memberQrToShow && (
                  <QRCodeCanvas 
                    value={generateMemberQrPayload(memberQrToShow.phone)} 
                    size={256}
                    level="M"
                    includeMargin={true}
                  />
                )}
             </div>
             <p className="text-[9px] font-mono opacity-40 tracking-widest uppercase">Valid Passport ID: {memberQrToShow?.phone}</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button className="w-full h-12 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 uppercase tracking-widest" onClick={handleExportQr}>
               <Download className="mr-2 h-4 w-4" /> Export Passport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PT Session Dialog with Restricted Dates */}
      <Dialog open={!!memberForPT} onOpenChange={(open) => !open && setMemberForPT(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
              <CreditCard className="h-6 w-6" /> ADD PT SESSION
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">For {memberForPT?.fullName}</DialogDescription>
          </DialogHeader>

          {memberForPT && (
            <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl mb-4 flex items-center gap-3">
               <CalendarDays className="h-4 w-4 text-primary" />
               <div className="text-[10px]">
                  <p className="font-black uppercase tracking-widest opacity-40">Membership Window</p>
                  <p className="font-bold text-white/80">
                    {memberForPT.startDate ? format(parseISO(memberForPT.startDate), 'MMM dd, yyyy') : 'N/A'} 
                    <span className="mx-2">→</span>
                    {memberForPT.endDate ? format(parseISO(memberForPT.endDate), 'MMM dd, yyyy') : 'N/A'}
                  </p>
               </div>
            </div>
          )}

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Package Price (INR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                <Input type="number" className="pl-8 h-12 bg-black/20 border-white/10 font-bold text-lg" placeholder="0.00" value={ptPrice} onChange={(e) => setPtPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Start Date</Label>
                <Popover open={isPtStartDateOpen} onOpenChange={setIsPtStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start font-bold bg-black/20 border-white/10">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {ptStartDate ? format(ptStartDate, "MMM dd") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={ptStartDate} 
                      onSelect={(date) => { setPtStartDate(date); setIsPtStartDateOpen(false); }} 
                      disabled={(date) => {
                        if (!ptLimits) return false;
                        // PT must be within membership start/end AND >= today
                        const isBeforeMembership = date < ptLimits.start;
                        const isAfterMembership = ptLimits.end ? date > ptLimits.end : false;
                        const isBeforeToday = date < today;
                        return isBeforeMembership || isAfterMembership || isBeforeToday;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">End Date</Label>
                <Popover open={isPtEndDateOpen} onOpenChange={setIsPtEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-start font-bold bg-black/20 border-white/10">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {ptEndDate ? format(ptEndDate, "MMM dd") : "Pick"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar 
                      mode="single" 
                      selected={ptEndDate} 
                      onSelect={(date) => { setPtEndDate(date); setIsPtEndDateOpen(false); }} 
                      disabled={(date) => {
                        if (!ptLimits) return false;
                        // PT end must be within membership AND >= PT start
                        const isBeforePtStart = date < (ptStartDate || today);
                        const isAfterMembership = ptLimits.end ? date > ptLimits.end : false;
                        return isBeforePtStart || isAfterMembership;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={handleSavePT} disabled={isUpdatingPT}>
              {isUpdatingPT ? <Loader2 className="h-5 w-5 animate-spin" /> : "CONFIRM & LOG SALE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold font-headline text-primary">Permanently Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>This will remove all biometric and transaction data for <b>{memberToDelete?.fullName}</b>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12">Confirm Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

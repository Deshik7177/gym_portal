
'use client';

import { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  User, 
  MoreHorizontal, 
  Loader2, 
  Plus, 
  Calendar as CalendarIcon,
  QrCode,
  History,
  UserCheck,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, setDoc, serverTimestamp, addDoc, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useProfile } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfDay, isToday, parseISO, endOfDay, isAfter } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { isAdmin, isStaff, loading: profileLoading } = useProfile();
  
  const [searchTerm, setSearchTerm] = useState('');
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
      where('memberId', '==', memberForHistory.phone),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
  }, [db, memberForHistory]);

  const { data: memberLogs } = useCollection<any>(attendanceQuery);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => {
      return (m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
              m.phone?.includes(searchTerm));
    });
  }, [members, searchTerm]);

  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, personal: 0 };
    return {
      total: members.length,
      active: members.filter(m => {
        const expiryDate = m.endDate ? parseISO(m.endDate) : null;
        const startDate = m.startDate ? parseISO(m.startDate) : null;
        return (expiryDate ? !isAfter(today, expiryDate) : true) && (startDate ? !isAfter(startDate, today) : true);
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
    try {
      const timestamp = serverTimestamp();
      const expiresAt = Date.now() + 5000;
      
      const lastCheckInDate = member.lastCheckIn?.seconds 
        ? new Date(member.lastCheckIn.seconds * 1000) 
        : null;

      const alreadyLoggedToday = lastCheckInDate && isToday(lastCheckInDate);

      const tasks: Promise<any>[] = [
        updateDoc(doc(db, 'members', member.phone), {
          lastCheckIn: timestamp,
          updatedAt: timestamp
        }),
        setDoc(doc(db, 'gateControl', 'latest'), {
          command: 'OPEN',
          status: 'pending',
          timestamp: timestamp,
          expiresAt: expiresAt,
          memberId: member.phone,
          method: 'manual'
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
      toast({ title: alreadyLoggedToday ? "Welcome Back!" : "Attendance Recorded" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Check-In Failed" });
    } finally {
      setIsProcessingCheckIn(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!db || !memberToDelete || !isAdmin) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'members', memberToDelete.phone));
      toast({ title: "Member Deleted", description: "Records removed from registry." });
      setMemberToDelete(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Failed" });
    } finally {
      setIsDeleting(false);
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
            <CardContent>
                <div className="text-3xl font-black text-foreground">{stats.total}</div>
            </CardContent>
         </Card>
         <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Current Active</CardTitle>
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

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search member ID or name..." className="pl-10 h-11 bg-black/20 border-white/5 rounded-xl w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Status & Plan</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Membership Term</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Phone ID</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? filteredMembers.map((member) => {
                const expiryDate = member.endDate ? parseISO(member.endDate) : null;
                const startDate = member.startDate ? parseISO(member.startDate) : null;
                
                const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
                const notStarted = startDate ? isAfter(startDate, today) : false;
                const isValid = !isExpired && !notStarted;

                return (
                  <TableRow key={member.phone} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="pl-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {member.photoData ? <img src={member.photoData} className="w-full h-full object-cover" alt={member.fullName} /> : <User className="h-5 w-5 text-primary" />}
                        </div>
                        <span className="font-bold text-sm text-foreground">{member.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={isValid ? 'default' : 'destructive'} className={cn("text-[8px] font-black uppercase", isValid ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive")}>
                          {isExpired ? 'EXPIRED' : notStarted ? 'FUTURE' : 'ACTIVE'}
                        </Badge>
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[8px] font-black uppercase border-none">{member.type}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-[10px] font-bold">
                        <span className="text-muted-foreground uppercase text-[8px] opacity-40">Ends</span>
                        <span className={cn(isExpired ? "text-destructive" : "text-foreground/80")}>
                          {member.endDate ? format(parseISO(member.endDate), 'MMM dd, yyyy') : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs opacity-40 text-foreground">{member.phone}</TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                            {isProcessingCheckIn === member.phone ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4 text-foreground" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-popover border-border rounded-xl">
                          <DropdownMenuItem onSelect={() => handleManualCheckIn(member)} className={cn("p-3 gap-3 cursor-pointer", !isValid ? "text-muted-foreground opacity-50" : "text-green-500")}>
                            <UserCheck className="h-4 w-4" /> Manual Check-In
                          </DropdownMenuItem>
                          {(isAdmin || isStaff) && (
                            <DropdownMenuItem onSelect={() => router.push(`/admin/register?edit=${member.phone}`)} className="p-3 gap-3 cursor-pointer">
                              <Edit3 className="h-4 w-4 text-primary" /> Edit Profile
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setMemberForHistory(member)} className="p-3 gap-3 cursor-pointer"><History className="h-4 w-4 text-accent" /> View History</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMemberQrToShow(member)} className="p-3 gap-3 cursor-pointer"><QrCode className="h-4 w-4 text-primary" /> View Entry QR</DropdownMenuItem>
                          
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator className="bg-border" />
                              <DropdownMenuItem onSelect={() => setMemberToDelete(member)} className="p-3 gap-3 cursor-pointer text-destructive focus:bg-destructive/10">
                                <Trash2 className="h-4 w-4" /> Delete Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 uppercase tracking-widest">No members found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!memberForHistory} onOpenChange={(open) => !open && setMemberForHistory(null)}>
        <DialogContent className="sm:max-w-lg bg-popover border-border rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-headline text-foreground uppercase tracking-tight">Entry History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto rounded-xl border border-border bg-muted/20">
             <Table>
               <TableHeader><TableRow><TableHead className="text-[9px] font-black uppercase pl-6">Time</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-6">Status</TableHead></TableRow></TableHeader>
               <TableBody>
                 {memberLogs && memberLogs.length > 0 ? memberLogs.map((log: any) => (
                   <TableRow key={log.id} className="border-white/5">
                      <TableCell className="pl-6 py-4">
                        <span className="text-xs font-bold text-foreground">{log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm') : 'Recent'}</span>
                      </TableCell>
                      <TableCell className="text-right pr-6"><span className="text-[10px] font-black text-green-500 uppercase">Verified</span></TableCell>
                   </TableRow>
                 )) : <TableRow><TableCell colSpan={2} className="h-32 text-center opacity-20">No logs</TableCell></TableRow>}
               </TableBody>
             </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberQrToShow} onOpenChange={(open) => !open && setMemberQrToShow(null)}>
        <DialogContent className="sm:max-w-md bg-popover border-border rounded-3xl p-6">
          <div className="flex flex-col items-center py-6 gap-6">
             <div ref={qrRef} className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-muted">
                {memberQrToShow && <QRCodeCanvas value={generateMemberQrPayload(memberQrToShow.phone)} size={256} level="M" includeMargin={true} />}
             </div>
             <p className="text-[9px] font-mono opacity-40 uppercase text-foreground">Valid Passport ID: {memberQrToShow?.phone}</p>
             <Button className="w-full h-12 rounded-2xl font-black uppercase" onClick={handleExportQr}>Download Passport</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && !isDeleting && setMemberToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-popover border-border rounded-3xl p-8">
          <DialogHeader>
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight text-foreground uppercase">Delete Registry?</DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              Are you sure you want to remove <b>{memberToDelete?.fullName}</b> from the system? This action is irreversible and will purge their biometric passport.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-6">
            <Button variant="ghost" onClick={() => setMemberToDelete(null)} disabled={isDeleting} className="flex-1 rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={isDeleting} className="flex-1 rounded-xl font-bold">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Purge Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

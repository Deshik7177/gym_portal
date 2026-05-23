
'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  UserCircle, 
  MoreHorizontal, 
  Users, 
  User, 
  ArrowUpRight, 
  Loader2, 
  Trash2, 
  Plus, 
  Calendar as CalendarIcon,
  CreditCard,
  QrCode,
  Download,
  Info
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, startOfDay, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { generateMemberQrPayload } from '@/lib/qr-logic';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { FirestorePermissionError } from '@/firebase/errors';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action States
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [memberForPT, setMemberForPT] = useState<any>(null);
  const [memberQrToShow, setMemberQrToShow] = useState<any>(null);
  const [isUpdatingPT, setIsUpdatingPT] = useState(false);
  
  // PT Dialog States
  const [ptPrice, setPtPrice] = useState('');
  const [ptStartDate, setPtStartDate] = useState<Date | undefined>(undefined);
  const [ptEndDate, setPtEndDate] = useState<Date | undefined>(undefined);
  const [isPtStartDateOpen, setIsPtStartDateOpen] = useState(false);
  const [isPtEndDateOpen, setIsPtEndDateOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => 
      m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.phone?.includes(searchTerm)
    );
  }, [members, searchTerm]);

  const stats = useMemo(() => {
    if (!members) return { total: 0, active: 0, personal: 0 };
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      personal: members.filter(m => m.type === 'personal').length,
    };
  }, [members]);

  const handleDeleteMember = () => {
    if (!db || !memberToDelete) return;
    deleteDoc(doc(db, 'members', memberToDelete.phone))
      .then(() => {
        toast({ title: "Member Removed" });
        setMemberToDelete(null);
      });
  };

  const handleAddPT = () => {
    if (!db || !memberForPT || !ptStartDate || !ptEndDate) return;
    setIsUpdatingPT(true);
    const updateData = {
      type: 'personal',
      price: parseFloat(ptPrice) || memberForPT.price,
      startDate: format(ptStartDate, 'yyyy-MM-dd'),
      endDate: format(ptEndDate, 'yyyy-MM-dd'),
      updatedAt: serverTimestamp(),
    };
    updateDoc(doc(db, 'members', memberForPT.phone), updateData)
      .then(() => {
        setMemberForPT(null);
        toast({ title: "PT Added" });
      })
      .finally(() => setIsUpdatingPT(false));
  };

  if (loading) return <div className="flex h-60 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase tracking-tighter">Vault Directory</h1>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">Staff Control Panel</p>
        </div>
        <Button asChild className="h-12 px-8 rounded-xl font-bold">
          <Link href="/admin/register"><Plus className="mr-2 h-4 w-4" /> Enroll New Member</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Total Capacity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black">{stats.total}</div>
            </CardContent>
         </Card>
         <Card className="bg-green-500/5 border-green-500/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Active Sync</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-green-500">{stats.active}</div>
            </CardContent>
         </Card>
         <Card className="bg-accent/5 border-accent/10 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">PT Coverage</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-accent">{stats.personal}</div>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member ID or name..."
              className="pl-10 h-11 bg-black/20 border-white/5 focus:border-primary/50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Phone ID</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Status</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Category</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.phone} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell className="pl-8">
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                        {member.photoData ? <img src={member.photoData} className="w-full h-full object-cover" /> : <User className="h-5 w-5 text-primary" />}
                      </div>
                      <span className="font-bold text-sm tracking-tight">{member.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs opacity-40 tracking-tighter">{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className={cn("rounded-sm px-2 text-[9px] font-black uppercase tracking-widest border-none", member.status === 'active' ? "bg-green-500/20 text-green-500" : "bg-white/5 text-white/40")}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className={cn("rounded-sm border-none bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest")}>{member.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-40 p-4">Member Control</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setMemberQrToShow(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer">
                          <QrCode className="h-4 w-4 text-primary" /> View Entry QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/register?edit=${member.phone}`)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer">
                          <ArrowUpRight className="h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMemberForPT(member)} className="p-3 gap-3 rounded-lg mx-1 cursor-pointer">
                          <CreditCard className="h-4 w-4" /> Add PT Session
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem className="p-3 gap-3 rounded-lg mx-1 text-destructive cursor-pointer" onClick={() => setMemberToDelete(member)}>
                          <Trash2 className="h-4 w-4" /> Terminate Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member QR Dialog */}
      <Dialog open={!!memberQrToShow} onOpenChange={() => setMemberQrToShow(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-8">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter">MEMBER PASSPORT</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Digital Key for {memberQrToShow?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-8">
             <div className="bg-white p-6 rounded-3xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]">
                {memberQrToShow && (
                  <QRCodeSVG 
                    value={generateMemberQrPayload(memberQrToShow.phone)} 
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                )}
             </div>
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Secure Dynamic Token</p>
                <p className="text-xs font-mono opacity-40">{memberQrToShow?.phone}</p>
             </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={() => setMemberQrToShow(null)}>
               <Download className="mr-2 h-5 w-5" /> EXPORT TO DEVICE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold font-headline">Permanently Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all biometric and transaction data for <b>{memberToDelete?.fullName}</b>. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12">
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

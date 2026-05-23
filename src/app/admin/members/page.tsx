'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfDay } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  
  // Action States
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [memberForPT, setMemberForPT] = useState<any>(null);
  const [memberQrToShow, setMemberQrToShow] = useState<any>(null);
  const [isUpdatingPT, setIsUpdatingPT] = useState(false);
  const [dynamicQrPayload, setDynamicQrPayload] = useState('');
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState<string | null>(null);
  
  // PT Dialog States
  const [ptPrice, setPtPrice] = useState('');
  const [ptStartDate, setPtStartDate] = useState<Date | undefined>(undefined);
  const [ptEndDate, setPtEndDate] = useState<Date | undefined>(undefined);
  const [isPtStartDateOpen, setIsPtStartDateOpen] = useState(false);
  const [isPtEndDateOpen, setIsPtEndDateOpen] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  // Effect to handle dynamic QR rotation
  useEffect(() => {
    if (!memberQrToShow) {
      setDynamicQrPayload('');
      return;
    }

    const refreshQr = () => {
      setDynamicQrPayload(generateMemberQrPayload(memberQrToShow.phone));
    };

    refreshQr(); // Initial set
    const interval = setInterval(refreshQr, 30000); // Rotate every 30 seconds

    return () => clearInterval(interval);
  }, [memberQrToShow]);

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

  const handleDeleteMember = () => {
    if (!db || !memberToDelete) return;
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
      
      // 1. Update Member
      updateDoc(doc(db, 'members', member.phone), {
        lastCheckIn: timestamp,
        updatedAt: timestamp
      });

      // 2. Log Attendance
      addDoc(collection(db, 'attendance'), {
        memberId: member.phone,
        memberName: member.fullName,
        timestamp: timestamp,
        method: 'manual',
        score: 1.0,
        staffAction: true
      });

      toast({
        title: "Check-In Recorded",
        description: `Manual attendance logged for ${member.fullName}.`
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Check-In Failed",
        description: "Could not record attendance."
      });
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
      link.download = `ThriveFit_QR_${memberQrToShow.fullName.replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      toast({
        title: "Export Success",
        description: "Member Daily Passport saved to your device."
      });
    }
  };

  const handleSavePT = async () => {
    if (!db || !memberForPT) return;
    if (!ptPrice || !ptStartDate || !ptEndDate) {
      toast({ variant: "destructive", title: "Missing Data", description: "Please fill all PT session details." });
      return;
    }

    setIsUpdatingPT(true);

    const saleData = {
      memberId: memberForPT.phone,
      memberName: memberForPT.fullName,
      amount: parseFloat(ptPrice) || 0,
      date: new Date().toISOString().split('T')[0],
      category: 'personal training',
      description: `PT Package: ${format(ptStartDate, 'MMM dd')} to ${format(ptEndDate, 'MMM dd')}`,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'sales'), saleData);
      await updateDoc(doc(db, 'members', memberForPT.phone), {
        type: 'personal',
        updatedAt: serverTimestamp()
      });

      toast({ title: "PT Session Added", description: "Transaction and profile updated." });
      setMemberForPT(null);
      setPtPrice('');
      setPtStartDate(undefined);
      setPtEndDate(undefined);
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: `sales/new`,
        operation: 'create',
        requestResourceData: saleData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsUpdatingPT(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
  };

  if (loading) return <div className="flex h-60 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline uppercase tracking-tighter text-primary">Vault Directory</h1>
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
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Phone ID</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Status</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Category</TableHead>
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
                          {isProcessingCheckIn === member.phone ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-40 p-4">Member Control</DropdownMenuLabel>
                        <DropdownMenuItem 
                          onSelect={() => handleManualCheckIn(member)}
                          className="p-3 gap-3 rounded-lg mx-1 cursor-pointer text-green-500"
                        >
                          <UserCheck className="h-4 w-4" /> Manual Check-In
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={(e) => { e.preventDefault(); setTimeout(() => setMemberQrToShow(member), 10); }} 
                          className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"
                        >
                          <QrCode className="h-4 w-4 text-primary" /> View Entry QR
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => router.push(`/admin/register?edit=${member.phone}`)} 
                          className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"
                        >
                          <ArrowUpRight className="h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={(e) => { e.preventDefault(); setTimeout(() => setMemberForPT(member), 10); }} 
                          className="p-3 gap-3 rounded-lg mx-1 cursor-pointer"
                        >
                          <CreditCard className="h-4 w-4" /> Add PT Session
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem 
                          className="p-3 gap-3 rounded-lg mx-1 text-destructive cursor-pointer" 
                          onSelect={(e) => { e.preventDefault(); setTimeout(() => setMemberToDelete(member), 10); }}
                        >
                          <Trash2 className="h-4 w-4" /> Terminate Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 italic font-medium uppercase tracking-[0.2em]">
                    No members match these filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Member QR Dialog */}
      <Dialog open={!!memberQrToShow} onOpenChange={(open) => { if (!open) setMemberQrToShow(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-8">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter">DAILY PASSPORT</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Expires in 24 hours • Valid for {memberQrToShow?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-8">
             <div ref={qrRef} className="bg-white p-6 rounded-3xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]">
                {dynamicQrPayload && (
                  <QRCodeCanvas 
                    value={dynamicQrPayload} 
                    size={256}
                    level="H"
                  />
                )}
             </div>
             <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Anti-Fraud Rotation Active
                </div>
                <p className="text-xs font-mono opacity-40">{memberQrToShow?.phone}</p>
             </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={handleExportQr}>
               <Download className="mr-2 h-5 w-5" /> EXPORT TO DEVICE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add PT Session Dialog */}
      <Dialog open={!!memberForPT} onOpenChange={(open) => { if (!open) setMemberForPT(null); }}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-headline tracking-tighter text-primary flex items-center gap-3">
              <CreditCard className="h-6 w-6" /> ADD PT SESSION
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">For {memberForPT?.fullName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Package Price (INR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                <Input 
                  type="number" 
                  className="pl-8 h-12 bg-black/20 border-white/10 font-bold text-lg" 
                  placeholder="0.00"
                  value={ptPrice}
                  onChange={(e) => setPtPrice(e.target.value)}
                />
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
                      disabled={(date) => date < today}
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
                      disabled={(date) => date < (ptStartDate || today)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" 
              onClick={handleSavePT}
              disabled={isUpdatingPT}
            >
              {isUpdatingPT ? <Loader2 className="h-5 w-5 animate-spin" /> : "CONFIRM & LOG SALE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => { if (!open) setMemberToDelete(null); }}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold font-headline text-primary">Permanently Delete Record?</AlertDialogTitle>
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

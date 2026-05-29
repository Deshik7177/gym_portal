
'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Loader2, 
  Calendar as CalendarIcon, 
  FileText,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Dumbbell
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from 'firebase/firestore';
import { useFirestore, useProfile } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format, startOfDay } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
import { Badge } from '@/components/ui/badge';

function RegisterForm() {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { isAdmin, isStaff, loading: profileLoading } = useProfile();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'active' | 'non-active'>('active');
  const [memberType, setMemberType] = useState<'group' | 'personal'>('group');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (editId && db) {
      setLoading(true);
      getDoc(doc(db, 'members', editId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setPhone(data.phone || '');
          setFullName(data.fullName || '');
          setSubscriptionType(data.status || 'active');
          setMemberType(data.type || 'group');
          setPrice(data.price?.toString() || '');
          setDescription(data.description || '');
          setStartDate(data.startDate ? new Date(data.startDate) : undefined);
          setEndDate(data.endDate ? new Date(data.endDate) : undefined);
          setIsEditMode(true);
        }
      }).finally(() => setLoading(false));
    }
  }, [editId, db]);

  const handleSearch = async () => {
    if (!searchQuery || !db) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'members', searchQuery);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPhone(data.phone);
        setFullName(data.fullName);
        setSubscriptionType(data.status);
        setMemberType(data.type || 'group');
        setPrice(data.price?.toString() || '');
        setDescription(data.description || '');
        setStartDate(data.startDate ? new Date(data.startDate) : undefined);
        setEndDate(data.endDate ? new Date(data.endDate) : undefined);
        setIsEditMode(true);
        toast({ title: "Member Loaded", description: `Registry found for ${data.fullName}.` });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "No member found with this phone number." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch member." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (isEditMode && !isAdmin) {
      toast({ variant: "destructive", title: "Action Denied", description: "Staff members cannot edit existing member details." });
      return;
    }

    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Dates Required", description: "Please provide start and end dates." });
      return;
    }

    setLoading(true);

    const amountValue = parseFloat(price) || 0;
    const memberData: any = {
      fullName,
      phone,
      status: subscriptionType,
      type: memberType,
      price: amountValue,
      description: description || '',
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      updatedAt: serverTimestamp(),
    };

    if (!isEditMode) {
      memberData.createdAt = serverTimestamp();
      memberData.qrToken = `TFIT-${phone}`;
    }

    const docRef = doc(db, 'members', phone);
    
    try {
      await setDoc(docRef, memberData, { merge: true });

      if (!isEditMode && amountValue > 0) {
        await addDoc(collection(db, 'sales'), {
          memberId: phone,
          memberName: fullName,
          amount: amountValue,
          date: new Date().toISOString().split('T')[0],
          category: memberType === 'personal' ? 'personal training' : 'membership',
          description: description || `New ${memberType === 'personal' ? 'PT' : 'Membership'} Registration: ${memberData.startDate} to ${memberData.endDate}`,
          createdAt: serverTimestamp()
        });
      } else if (isEditMode && isAdmin) {
        const salesRef = collection(db, 'sales');
        const q = query(
          salesRef, 
          where('memberId', '==', phone)
        );
        const saleSnap = await getDocs(q);
        if (!saleSnap.empty) {
          const latestSaleDoc = saleSnap.docs.sort((a, b) => {
             const timeA = a.data().createdAt?.seconds || 0;
             const timeB = b.data().createdAt?.seconds || 0;
             return timeB - timeA;
          })[0];

          await updateDoc(doc(db, 'sales', latestSaleDoc.id), {
            amount: amountValue,
            memberName: fullName,
            updatedAt: serverTimestamp()
          });
        }
      }

      toast({ 
        title: "Database Synced", 
        description: isEditMode ? "Profile and ledger updated." : "Member registered successfully." 
      });
      
      if (isEditMode) {
        router.push('/admin/members');
      } else {
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: memberData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setPhone('');
    setFullName('');
    setPrice('');
    setDescription('');
    setSearchQuery('');
    setStartDate(today);
    setEndDate(undefined);
    setSubscriptionType('active');
    setMemberType('group');
    router.replace('/admin/register');
  };

  if (isEditMode && !isAdmin && !profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 text-center max-w-md mx-auto">
        <ShieldAlert className="h-20 w-20 text-destructive animate-pulse" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground">Only Administrators can modify existing member registry details.</p>
        <Button onClick={() => router.push('/admin/members')} variant="outline" className="rounded-xl px-10">Return to Directory</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter uppercase text-primary">Member Enrollment</h1>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">Facility Registry Control</p>
        </div>
        <div className="flex gap-2">
           <Input 
             placeholder="Lookup Phone..." 
             className="w-48 bg-black/20 border-white/5 rounded-xl h-11" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
           />
           <Button variant="outline" onClick={handleSearch} disabled={loading} className="h-11 w-11 p-0 rounded-xl">
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
           </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-2xl border-none bg-card/40 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
             <div className="flex items-center justify-between">
               <CardTitle className="text-xl font-bold font-headline uppercase tracking-tight">{isEditMode ? 'Modify Registry' : 'Core Profile'}</CardTitle>
               {isEditMode && <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[9px] font-black tracking-widest px-2">ADMIN EDIT MODE</Badge>}
             </div>
             <CardDescription>Enter primary identifiers and package terms.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Legal Full Name</Label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required 
                  placeholder="e.g. John Wick" 
                  className="h-12 bg-black/20 border-white/10 focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Mobile ID (Primary Path)</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  readOnly={isEditMode} 
                  placeholder="10-digit primary contact" 
                  className="h-12 bg-black/20 border-white/10 focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Plan Category</Label>
                <Select value={memberType} onValueChange={(val: any) => setMemberType(val)}>
                  <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      {memberType === 'personal' ? <Dumbbell className="h-4 w-4 text-accent" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                      <SelectValue placeholder="Select Plan" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Standard Group</SelectItem>
                    <SelectItem value="personal">Personal Training (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Duration Logic</Label>
                <Select value={subscriptionType} onValueChange={(val: any) => setSubscriptionType(val)}>
                  <SelectTrigger className="h-12 bg-black/20 border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      {subscriptionType === 'active' ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldX className="h-4 w-4 text-destructive" />}
                      <SelectValue placeholder="Select Category" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Term</SelectItem>
                    <SelectItem value="non-active">Non-Active Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Membership Lifecycle (Hard Access Control)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-bold bg-black/20 border-white/10 rounded-xl",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                          {startDate ? format(startDate, "MMM dd, yyyy") : <span>Start Date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[60]" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => { setStartDate(date); setIsStartDateOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-bold bg-black/20 border-white/10 rounded-xl",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                          {endDate ? format(endDate, "MMM dd, yyyy") : <span>Expiration Date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[60]" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => { setEndDate(date); setIsEndDateOpen(false); }}
                          disabled={(date) => date < (startDate || today)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Package Price (INR)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                <Input 
                  type="number" 
                  className="pl-8 h-12 text-xl font-black bg-black/20 border-white/10 rounded-xl" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  required 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 flex items-center gap-2">
                <FileText className="h-3 w-3" /> Package Notes
              </Label>
              <Textarea 
                placeholder="e.g. 3 Months + Personal Training" 
                className="min-h-[48px] h-12 resize-none bg-black/20 border-white/10 rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-white/[0.01] border-t border-white/5 p-8 flex gap-4">
            <Button type="submit" className="flex-1 h-16 text-xl font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 rounded-2xl" disabled={loading}>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : (isEditMode ? 'Commit Changes' : 'Register Member')}
            </Button>
            {isEditMode && (
              <Button type="button" variant="outline" onClick={resetForm} className="h-16 px-8 rounded-2xl border-white/10 uppercase font-black">
                Cancel
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function RegisterMemberPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

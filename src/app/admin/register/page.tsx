'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, CheckCircle2, Loader2, Info, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function RegisterForm() {
  const { toast } = useToast();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationStatus, setDurationStatus] = useState<'active' | 'non-active'>('active');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const totalDays = useMemo(() => {
    if (startDate && endDate) {
      const days = differenceInDays(endDate, startDate);
      return days >= 0 ? days : 0;
    }
    return 0;
  }, [startDate, endDate]);

  useEffect(() => {
    if (editId && db) {
      setLoading(true);
      getDoc(doc(db, 'members', editId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setPhone(data.phone || '');
          setFullName(data.fullName || '');
          setDurationStatus(data.status || 'active');
          setPrice(data.price?.toString() || '');
          setDescription(data.description || '');
          setStartDate(data.startDate ? new Date(data.startDate) : undefined);
          setEndDate(data.endDate ? new Date(data.endDate) : undefined);
          setIsEnrolled(!!data.faceEmbedding);
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
        setDurationStatus(data.status);
        setPrice(data.price?.toString() || '');
        setDescription(data.description || '');
        setStartDate(data.startDate ? new Date(data.startDate) : undefined);
        setEndDate(data.endDate ? new Date(data.endDate) : undefined);
        setIsEnrolled(!!data.faceEmbedding);
        setIsEditMode(true);
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

    if (durationStatus === 'non-active' && (!startDate || !endDate)) {
      toast({ variant: "destructive", title: "Dates Required", description: "Please provide start and end dates for fixed-term membership." });
      return;
    }

    setLoading(true);

    const memberData: any = {
      fullName,
      phone,
      status: durationStatus,
      type: 'group',
      price: parseFloat(price) || 0,
      description: description || '',
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      countOfDays: durationStatus === 'non-active' ? totalDays : null,
      updatedAt: serverTimestamp(),
    };

    if (!isEditMode) {
      memberData.createdAt = serverTimestamp();
    }

    const docRef = doc(db, 'members', phone);
    
    setDoc(docRef, memberData, { merge: true })
      .then(() => {
        const saleData = {
          memberId: phone,
          memberName: fullName,
          amount: parseFloat(price) || 0,
          date: new Date().toISOString().split('T')[0],
          category: 'membership',
          description: isEditMode ? `Update: Group Membership` : `New: Group Membership`,
          createdAt: serverTimestamp()
        };
        addDoc(collection(db, 'sales'), saleData);

        toast({ 
          title: "Saved Successfully", 
          description: "Member records are synced with the cloud." 
        });
        
        if (!isEditMode) resetForm();
        setLoading(false);
      })
      .catch(async (err: any) => {
        setLoading(false);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: memberData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const resetForm = () => {
    setIsEditMode(false);
    setPhone('');
    setFullName('');
    setPrice('');
    setDescription('');
    setSearchQuery('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsEnrolled(false);
    router.replace('/admin/register');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">{isEditMode ? 'Manage Profile' : 'New Registration'}</h1>
          <p className="text-muted-foreground italic">Thrive Fit Management</p>
        </div>
        <div className="flex gap-2">
           <Input 
             placeholder="Search phone..." 
             className="w-48" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
           />
           <Button variant="outline" onClick={handleSearch} disabled={loading}>
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
           </Button>
           {isEditMode && <Button variant="ghost" onClick={resetForm}>New</Button>}
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Thrive Fit Cloud Sync</AlertTitle>
        <AlertDescription>
          Member data is automatically synchronized with your Cloud Firestore database.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Card className="shadow-lg border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Member Details</CardTitle>
              {isEnrolled && <Badge className="bg-green-500">Biometrics Active</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number (Primary ID)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required readOnly={isEditMode} placeholder="10-digit mobile" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Membership Type</Label>
              <RadioGroup value={durationStatus} onValueChange={(v: any) => setDurationStatus(v)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Label htmlFor="am" className={cn("border p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between", durationStatus === 'active' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
                      <span className="font-bold">Active (Subscription)</span>
                      <RadioGroupItem value="active" id="am" className="sr-only" />
                      {durationStatus === 'active' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </Label>
                  <Label htmlFor="nm" className={cn("border p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between", durationStatus === 'non-active' ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
                      <span className="font-bold">Fixed Term (Non-Active)</span>
                      <RadioGroupItem value="non-active" id="nm" className="sr-only" />
                      {durationStatus === 'non-active' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </Label>
              </RadioGroup>
            </div>

            {durationStatus === 'non-active' && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <Label className="flex items-center gap-2 mb-1.5">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      Start Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label className="flex items-center gap-2 mb-1.5">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      End Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-10",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {startDate && endDate && (
                  <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Membership Duration</p>
                        <p className="text-lg font-bold text-primary">{totalDays} Total Days</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="h-6">Fixed Term</Badge>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Fee (INR)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <Input type="number" className="pl-8 h-12 text-xl font-bold" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" />
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t p-6">
            <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : (isEditMode ? 'Update Profile' : 'Register Member')}
            </Button>
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

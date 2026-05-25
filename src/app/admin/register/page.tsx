'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  CheckCircle2, 
  Loader2, 
  Info, 
  Calendar as CalendarIcon, 
  Clock, 
  FileText,
  ScanFace,
  Camera,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { format, differenceInDays, startOfDay } from 'date-fns';

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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/alert';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FaceEnrollment } from '@/components/FaceEnrollment';

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
  
  // Biometric states
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [isEnrollingFace, setIsEnrollingFace] = useState(false);
  
  // Date states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Popover open states
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);

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
          setFaceEmbedding(data.faceEmbedding || null);
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
        setFaceEmbedding(data.faceEmbedding || null);
        setIsEnrolled(!!data.faceEmbedding);
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

    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Dates Required", description: "Please provide start and end dates." });
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
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      countOfDays: totalDays,
      faceEmbedding: faceEmbedding || null,
      updatedAt: serverTimestamp(),
    };

    if (!isEditMode) {
      memberData.createdAt = serverTimestamp();
    }

    const docRef = doc(db, 'members', phone);
    
    setDoc(docRef, memberData, { merge: true })
      .then(() => {
        toast({ 
          title: "Database Synced", 
          description: "Records have been updated in the cloud ledger." 
        });
        
        if (isEditMode) {
          router.push('/admin/members');
        } else {
          resetForm();
        }
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
    setFaceEmbedding(null);
    setIsEnrolled(false);
    router.replace('/admin/register');
  };

  const handleFaceEnrolled = (embedding: number[]) => {
    setFaceEmbedding(embedding);
    setIsEnrollingFace(false);
    toast({
      title: "Biometrics Captured",
      description: "Face template extracted and ready for synchronization."
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter uppercase text-primary">Registry Enrollment</h1>
          <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">System Personnel Control</p>
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
           {isEditMode && <Button variant="ghost" onClick={resetForm} className="h-11 rounded-xl">New</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Details */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <Card className="shadow-2xl border-none bg-card/40 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
               <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold font-headline uppercase tracking-tight">Core Profile</CardTitle>
                  {faceEmbedding && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 uppercase text-[9px] font-black tracking-widest px-2 h-5">
                       <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Biometrics Valid
                    </Badge>
                  )}
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

              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Contract Lifecycle</Label>
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
                            {startDate ? format(startDate, "MMM dd, yyyy") : <span>Effective Date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[60]" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => { setStartDate(date); setIsStartDateOpen(false); }}
                            disabled={(date) => date < today}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">Settlement Amount (INR)</Label>
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
                    <FileText className="h-3 w-3" /> Audit Memo
                  </Label>
                  <Textarea 
                    placeholder="e.g. 3 Months + Diwali Special" 
                    className="min-h-[48px] h-12 resize-none bg-black/20 border-white/10 rounded-xl"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white/[0.01] border-t border-white/5 p-8">
              <Button type="submit" className="w-full h-16 text-xl font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 rounded-2xl" disabled={loading}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : (isEditMode ? 'Commit Profile Update' : 'Finalize Registration')}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Right Column: Biometrics Enrollment */}
        <div className="lg:col-span-5 space-y-6">
           <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden flex flex-col h-full min-h-[500px]">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
                <CardTitle className="text-xl font-bold font-headline uppercase tracking-tight flex items-center gap-3">
                  <ScanFace className="h-6 w-6 text-primary" />
                  Biometric Link
                </CardTitle>
                <CardDescription>Calibrate face recognition for hands-free entry.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0 relative flex flex-col">
                 {isEnrollingFace ? (
                   <div className="flex-1 flex flex-col">
                     <FaceEnrollment onComplete={handleFaceEnrolled} onCancel={() => setIsEnrollingFace(false)} />
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-8">
                      {faceEmbedding ? (
                        <>
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                            <CheckCircle2 className="h-32 w-32 text-primary relative" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">ID Active</h3>
                            <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed uppercase tracking-widest font-bold opacity-40">
                              Biometric feature vector has been extracted and stored locally.
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => setIsEnrollingFace(true)} className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 uppercase font-black text-xs tracking-[0.2em]">
                             <RotateCcw className="mr-3 h-4 w-4" /> Recalibrate Optics
                          </Button>
                        </>
                      ) : (
                        <>
                           <div className="relative">
                             <div className="absolute inset-0 bg-white/5 blur-[40px] rounded-full" />
                             <Camera className="h-32 w-32 text-white/5 relative" />
                           </div>
                           <div className="space-y-2">
                             <h3 className="text-2xl font-black uppercase tracking-tighter opacity-20 italic">ID Pending</h3>
                             <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed uppercase tracking-widest font-bold opacity-30">
                               Optical enrollment required for autonomous portal authentication.
                             </p>
                           </div>
                           <Button onClick={() => setIsEnrollingFace(true)} className="h-16 px-12 rounded-2xl shadow-xl shadow-primary/10 font-black uppercase tracking-widest">
                             <ScanFace className="mr-3 h-5 w-5" /> Enroll Face ID
                           </Button>
                        </>
                      )}
                   </div>
                 )}
              </CardContent>
           </Card>

           <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-start gap-4">
              <Info className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Protocol</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Registration creates a cloud profile. Biometric data stays encrypted on the user's terminal for localized gate triggering.
                 </p>
              </div>
           </div>
        </div>
      </div>
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

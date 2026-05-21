
'use client';

import { useState, useEffect } from 'react';
import { Search, UserCircle, Save, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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

export default function RegisterMemberPage() {
  const { toast } = useToast();
  const db = useFirestore();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationStatus, setDurationStatus] = useState<'active' | 'non-active'>('active');
  const [membershipType, setMembershipType] = useState<'group' | 'personal'>('group');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

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
        setMembershipType(data.type);
        setDurationStatus(data.status);
        setPrice(data.price?.toString() || '');
        setDescription(data.description || '');
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setDaysCount(data.countOfDays?.toString() || '');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    if (durationStatus === 'non-active' && (!startDate || !endDate)) {
      toast({ variant: "destructive", title: "Date Required", description: "Non-active members require validity dates." });
      return;
    }

    setLoading(true);

    const docRef = doc(db, 'members', phone);
    const data = {
      fullName,
      phone,
      status: durationStatus,
      type: membershipType,
      price: parseFloat(price) || 0,
      description,
      startDate: durationStatus === 'non-active' ? startDate : null,
      endDate: durationStatus === 'non-active' ? endDate : null,
      countOfDays: durationStatus === 'non-active' ? parseInt(daysCount) || 0 : null,
      updatedAt: serverTimestamp(),
      createdAt: isEditMode ? undefined : serverTimestamp(),
    };

    setDoc(docRef, data, { merge: true })
      .then(() => {
        setLoading(false);
        toast({ 
          title: "Member Data Saved", 
          description: "Member details registered. Proceed to Kiosk for face enrollment." 
        });
        if (!isEditMode) resetForm();
      })
      .catch(async () => {
        setLoading(false);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data,
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
    setStartDate('');
    setEndDate('');
    setDaysCount('');
    setIsEnrolled(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{isEditMode ? 'Manage Profile' : 'New Registration'}</h1>
          <p className="text-muted-foreground italic">Step 1: Register member details on laptop.</p>
        </div>
        <div className="flex gap-2">
           <Input 
             placeholder="Search phone..." 
             className="w-48" 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
           <Button variant="outline" onClick={handleSearch} disabled={loading}>
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
           </Button>
           {isEditMode && <Button variant="ghost" onClick={resetForm}>New</Button>}
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Workflow Tip</AlertTitle>
        <AlertDescription>
          Register basic info here on the laptop. Then, use the <b>Entrance Kiosk</b> on a mobile device to capture the member's face identity.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Member Information</CardTitle>
              {isEnrolled && <Badge className="bg-green-500">Biometrics Enrolled</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number (Primary ID)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required readOnly={isEditMode} placeholder="10-digit mobile" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Training Category</Label>
              <RadioGroup value={membershipType} onValueChange={(v: any) => setMembershipType(v)} className="flex gap-8">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="group" id="g" /><Label htmlFor="g" className="cursor-pointer">Group Training</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="p" /><Label htmlFor="p" className="cursor-pointer">Personal Training</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Membership Status</Label>
              <RadioGroup value={durationStatus} onValueChange={(v: any) => setDurationStatus(v)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Label htmlFor="am" className={durationStatus === 'active' ? 'border-primary bg-primary/5 p-4 border-2 rounded-lg cursor-pointer' : 'border p-4 rounded-lg cursor-pointer'}>
                      <div className="flex justify-between items-center">
                          <span className="font-bold">Active (Ongoing)</span>
                          <RadioGroupItem value="active" id="am" className="sr-only" />
                          {durationStatus === 'active' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                  </Label>
                  <Label htmlFor="nm" className={durationStatus === 'non-active' ? 'border-primary bg-primary/5 p-4 border-2 rounded-lg cursor-pointer' : 'border p-4 rounded-lg cursor-pointer'}>
                      <div className="flex justify-between items-center">
                          <span className="font-bold">Non-Active (Fixed Term)</span>
                          <RadioGroupItem value="non-active" id="nm" className="sr-only" />
                          {durationStatus === 'non-active' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                  </Label>
              </RadioGroup>
            </div>

            {durationStatus === 'non-active' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg animate-in fade-in zoom-in duration-200">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Sessions/Days</Label>
                  <Input type="number" placeholder="e.g. 30" value={daysCount} onChange={(e) => setDaysCount(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="space-y-2">
                <Label>Membership Price (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                  <Input type="number" className="pl-7 h-12 text-lg" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" />
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t p-6">
            <Button type="submit" className="w-full h-14 text-lg font-bold shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEditMode ? 'Update Member Data' : 'Register & Proceed to Kiosk')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

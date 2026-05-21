
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Search, UserCircle, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function RegisterMemberPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationStatus, setDurationStatus] = useState<'active' | 'non-active'>('active');
  const [membershipType, setMembershipType] = useState<'group' | 'personal'>('group');
  const [photo, setPhoto] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState('');
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions."
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

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
        setPhoto(data.photoData || null);
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setDaysCount(data.countOfDays?.toString() || '');
        setIsEditMode(true);
        toast({ title: "Member Found", description: `Loading profile for ${data.fullName}` });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "No member found with this phone number." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not retrieve member details." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setLoading(true);

    const memberId = isEditMode ? phone : phone;
    const docRef = doc(db, 'members', memberId);

    const data = {
      fullName,
      phone,
      status: durationStatus,
      type: membershipType,
      price: parseFloat(price) || 0,
      description,
      photoData: photo,
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
          title: isEditMode ? "Update Success" : "Registration Success",
          description: isEditMode ? "Member profile updated." : "New member registered successfully."
        });
        if (!isEditMode) {
          setPhone('');
          setFullName('');
          setPhoto(null);
          setPrice('');
          setDescription('');
        }
      })
      .catch(async (serverError) => {
        setLoading(false);
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: isEditMode ? 'update' : 'create',
          requestResourceData: data,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{isEditMode ? 'Edit Member' : 'Register New Member'}</h1>
          <p className="text-muted-foreground">Manage profile, duration, and photos for identity authentication.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search phone to edit..." 
                className="pl-8" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
           </div>
           <Button variant="outline" onClick={handleSearch} disabled={loading}>
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
           </Button>
           {isEditMode && (
             <Button variant="ghost" onClick={() => { setIsEditMode(false); setPhone(''); setFullName(''); setPhoto(null); }}>Cancel Edit</Button>
           )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Details</CardTitle>
              <CardDescription>Primary identification and membership type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input 
                    id="full-name" 
                    placeholder="John Doe" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Username/Primary ID)</Label>
                  <Input 
                    id="phone" 
                    placeholder="1234567890" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required 
                    readOnly={isEditMode} 
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Membership Category</Label>
                <RadioGroup 
                  value={membershipType} 
                  onValueChange={(v: any) => setMembershipType(v)} 
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="cat-group" />
                    <Label htmlFor="cat-group" className="cursor-pointer">Group Training</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personal" id="cat-personal" />
                    <Label htmlFor="cat-personal" className="cursor-pointer">Personal Training</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duration & Pricing</CardTitle>
              <CardDescription>Define the term and manual pricing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Plan Duration Mode</Label>
                <RadioGroup 
                  value={durationStatus} 
                  onValueChange={(v: any) => setDurationStatus(v)} 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="active-mode"
                    className={`flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all ${durationStatus === 'active' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">Active (Unlimited)</span>
                      <span className="text-xs text-muted-foreground">No fixed end date, ongoing access.</span>
                    </div>
                    <RadioGroupItem value="active" id="active-mode" className="sr-only" />
                    {durationStatus === 'active' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </Label>
                  <Label
                    htmlFor="non-active-mode"
                    className={`flex items-center justify-between rounded-lg border-2 p-4 cursor-pointer transition-all ${durationStatus === 'non-active' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-bold">Non-Active (Fixed Term)</span>
                      <span className="text-xs text-muted-foreground">Expires after a specific set of days.</span>
                    </div>
                    <RadioGroupItem value="non-active" id="non-active-mode" className="sr-only" />
                    {durationStatus === 'non-active' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </Label>
                </RadioGroup>
              </div>

              {durationStatus === 'non-active' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 animate-in fade-in slide-in-from-top-2 border">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input 
                      id="start-date" 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input 
                      id="end-date" 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="days-count">Total Count of Days</Label>
                    <Input 
                      id="days-count" 
                      type="number" 
                      placeholder="30" 
                      value={daysCount}
                      onChange={(e) => setDaysCount(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="price">Price (Manual Staff Entry)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-7" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required 
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Staff must verify payment before submission.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                id="description" 
                placeholder="Medical history, specific goals, or special requirements..." 
                className="min-h-[120px]" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Authentication Photo</CardTitle>
              <CardDescription>Required for visual identity verification at front desk.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-[4/5] bg-muted rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="Member" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-6 text-center">
                    <UserCircle className="h-20 w-20 mb-2 opacity-20" />
                    <p className="text-sm">No photo captured. Start camera to proceed.</p>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  className={`absolute inset-0 w-full h-full object-cover ${photo ? 'hidden' : ''}`} 
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex flex-col gap-2 w-full">
                {!photo ? (
                  <Button type="button" variant="outline" onClick={startCamera}>
                    <Camera className="mr-2 h-4 w-4" /> Start Camera
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => { setPhoto(null); startCamera(); }}>
                    Retake Photo
                  </Button>
                )}
                {!photo && (
                  <Button type="button" onClick={capturePhoto} className="w-full">
                    Capture Now
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-6 border-t">
              <Button type="submit" className="w-full h-12 text-lg" disabled={loading || !photo}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} 
                {loading ? 'Processing...' : (isEditMode ? 'Update Profile' : 'Complete Registration')}
              </Button>
              {isEditMode && (
                <p className="text-xs text-center text-muted-foreground italic">
                  *Photo is mandatory for authentication.
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}

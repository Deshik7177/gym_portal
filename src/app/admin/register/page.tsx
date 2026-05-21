
'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Search, UserCircle, Save, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { loadFaceModels, generateEmbedding } from '@/lib/face-logic';

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
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysCount, setDaysCount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true));
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Access denied." });
    }
  };

  const captureAndEnroll = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReady) return;
    
    setIsCapturing(true);
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    
    try {
      const descriptor = await generateEmbedding(videoRef.current);
      
      if (descriptor) {
        setEmbedding(descriptor);
        setPhoto(dataUrl);
        toast({ title: "Face Enrolled", description: "Biometric identity generated." });
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      } else {
        toast({ variant: "destructive", title: "No Face Detected", description: "Ensure face is visible." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Inference Error", description: "Failed to generate embedding." });
    } finally {
      setIsCapturing(false);
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
        setEmbedding(data.faceEmbedding || null);
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setDaysCount(data.countOfDays?.toString() || '');
        setIsEditMode(true);
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "No member found." });
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
    
    if (!embedding) {
      toast({ variant: "destructive", title: "Missing Identity", description: "Enroll a face before saving." });
      return;
    }

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
      photoData: photo,
      faceEmbedding: embedding,
      startDate: durationStatus === 'non-active' ? startDate : null,
      endDate: durationStatus === 'non-active' ? endDate : null,
      countOfDays: durationStatus === 'non-active' ? parseInt(daysCount) || 0 : null,
      updatedAt: serverTimestamp(),
      createdAt: isEditMode ? undefined : serverTimestamp(),
    };

    setDoc(docRef, data, { merge: true })
      .then(() => {
        setLoading(false);
        toast({ title: "Member Saved", description: "Registration successful." });
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
    setPhoto(null);
    setEmbedding(null);
    setPrice('');
    setDescription('');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setDaysCount('');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{isEditMode ? 'Edit Profile' : 'Member Enrollment'}</h1>
          <p className="text-muted-foreground italic">Biometric-ready registration.</p>
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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} required readOnly={isEditMode} />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <Label>Training Type</Label>
                <RadioGroup value={membershipType} onValueChange={(v: any) => setMembershipType(v)} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="g" /><Label htmlFor="g">Group</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personal" id="p" /><Label htmlFor="p">Personal</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Membership Status</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                <RadioGroup value={durationStatus} onValueChange={(v: any) => setDurationStatus(v)} className="grid grid-cols-2 gap-4">
                    <Label htmlFor="am" className={durationStatus === 'active' ? 'border-primary bg-primary/5 p-4 border-2 rounded-lg' : 'border p-4 rounded-lg'}>
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Active</span>
                            <RadioGroupItem value="active" id="am" className="sr-only" />
                            {durationStatus === 'active' && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                    </Label>
                    <Label htmlFor="nm" className={durationStatus === 'non-active' ? 'border-primary bg-primary/5 p-4 border-2 rounded-lg' : 'border p-4 rounded-lg'}>
                        <div className="flex justify-between items-center">
                            <span className="font-bold">Non-Active</span>
                            <RadioGroupItem value="non-active" id="nm" className="sr-only" />
                            {durationStatus === 'non-active' && <CheckCircle2 className="h-4 w-4" />}
                        </div>
                    </Label>
                </RadioGroup>

                {durationStatus === 'non-active' && (
                  <div className="grid grid-cols-3 gap-2 p-4 bg-muted/20 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Start Date</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">End Date</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Days Count</Label>
                      <Input type="number" placeholder="Days" value={daysCount} onChange={(e) => setDaysCount(e.target.value)} required />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                    <Label>Price (INR)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                      <Input type="number" className="pl-7" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-widest font-bold">Biometric ID</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border-2 border-primary/20">
                {photo ? (
                  <img src={photo} className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {isCapturing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                )}
                
                {embedding && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500">ID ENROLLED</Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 w-full gap-2">
                {!photo ? (
                  <>
                    <Button type="button" variant="outline" onClick={startCamera}>
                      <Camera className="mr-2 h-4 w-4" /> Start Camera
                    </Button>
                    <Button 
                      type="button" 
                      onClick={captureAndEnroll} 
                      disabled={isCapturing || !modelsReady}
                    >
                      Capture Identity
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={() => { setPhoto(null); setEmbedding(null); startCamera(); }}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Reset Photo
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/10">
              <Button type="submit" className="w-full h-12 font-bold" disabled={loading || !embedding}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Enrollment'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}

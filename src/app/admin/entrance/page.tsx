'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Cpu,
  UserPlus,
  Search,
  UserCheck,
  History,
  AlertCircle,
  Fingerprint
} from 'lucide-react';
import { collection, query, where, updateDoc, doc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, generateEmbedding, findBestMatch, isFaceInFrame } from '@/lib/face-logic';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [activeMode, setActiveMode] = useState<'kiosk' | 'enroll'>('kiosk');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [cachedMembers, setCachedMembers] = useState<any[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'members'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCachedMembers(members);
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true));
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [facingMode, isCameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Camera access is required." });
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const triggerManualVerification = async () => {
    if (!modelsReady || isProcessing || scanResult || !videoRef.current || !db) return;

    setIsProcessing(true);
    
    try {
      const isPresent = await isFaceInFrame(videoRef.current);
      if (!isPresent) {
        toast({ variant: "destructive", title: "No Face Detected", description: "Please look into the camera." });
        setIsProcessing(false);
        return;
      }

      const liveEmbedding = await generateEmbedding(videoRef.current);
      if (!liveEmbedding) {
        toast({ variant: "destructive", title: "Scan Error", description: "Could not generate biometric ID." });
        setIsProcessing(false);
        return;
      }

      const { bestMatch, confidence } = findBestMatch(liveEmbedding, cachedMembers);

      if (bestMatch && confidence > 0.82) {
        const memberRef = doc(db, 'members', bestMatch.id);
        const updateData = { lastCheckIn: serverTimestamp(), updatedAt: serverTimestamp() };

        updateDoc(memberRef, updateData).catch(async () => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: memberRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext));
        });

        setIdentifiedMember(bestMatch);
        setScanResult('success');
        setRecentLogs(prev => [{
            name: bestMatch.fullName,
            time: new Date().toLocaleTimeString(),
            confidence: (confidence * 100).toFixed(0) + '%'
        }, ...prev].slice(0, 10));

        setTimeout(() => { 
            setScanResult(null); 
            setIdentifiedMember(null); 
            setIsProcessing(false);
        }, 5000);
      } else {
        setScanResult('failure');
        setTimeout(() => {
          setScanResult(null);
          setIsProcessing(false);
        }, 3000);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const handleFindMember = async () => {
    if (!searchPhone || !db) return;
    setIsProcessing(true);
    try {
      const snap = await getDoc(doc(db, 'members', searchPhone));
      if (snap.exists()) setPendingMember({ id: snap.id, ...snap.data() });
      else toast({ variant: "destructive", title: "Not Found", description: "Check registration." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureEnrollment = async () => {
    if (!videoRef.current || !db || !pendingMember || !modelsReady) return;
    setIsCapturing(true);

    try {
      const embedding = await generateEmbedding(videoRef.current);
      if (embedding) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);

        const memberRef = doc(db, 'members', pendingMember.id);
        const updateData = { 
          faceEmbedding: embedding, 
          photoData: dataUri, 
          updatedAt: serverTimestamp() 
        };

        await updateDoc(memberRef, updateData);
        toast({ title: "Face Enrolled!", description: `${pendingMember.fullName} is ready.` });
        setPendingMember(null);
        setSearchPhone('');
      } else {
        toast({ variant: "destructive", title: "Face Not Found", description: "Look at camera." });
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-bold font-headline">Entrance Kiosk</h1>
         <p className="text-muted-foreground italic">Biometric Verification Portal</p>
      </div>

      <Tabs value={activeMode} onValueChange={(v: any) => { setActiveMode(v); setScanResult(null); setIsProcessing(false); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1">
          <TabsTrigger value="kiosk" className="text-lg font-bold"><Fingerprint className="mr-2 h-5 w-5" /> MANUAL SCAN</TabsTrigger>
          <TabsTrigger value="enroll" className="text-lg font-bold"><UserPlus className="mr-2 h-5 w-5" /> FACE ENROLL</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-2xl rounded-2xl min-h-[500px]">
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-primary font-mono"><Cpu className="h-3 w-3 mr-1" /> CLOUD SYNCED</Badge>
              {isCameraActive && <Badge className="bg-green-500 animate-pulse">LIVE</Badge>}
            </div>

            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <Button size="icon" variant="outline" className="bg-background/50 rounded-full border-white/10" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            <div className="relative flex-1 bg-black flex items-center justify-center">
              {isCameraActive ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={cn("w-full h-full object-cover transition-opacity", (scanResult === 'success' || isProcessing) ? "opacity-30" : "opacity-90")} 
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground/30">
                  <Camera className="h-20 w-20" />
                  <p className="font-headline text-xl">Camera Off</p>
                </div>
              )}
              
              {isProcessing && !scanResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                    <Loader2 className="h-20 w-20 animate-spin text-primary mb-4" />
                    <p className="text-white font-headline text-3xl tracking-widest animate-pulse">VERIFYING...</p>
                </div>
              )}

              {scanResult === 'success' && identifiedMember && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-900/40 animate-in zoom-in">
                  <CheckCircle2 className="h-48 w-48 text-green-500 mb-6 drop-shadow-xl" />
                  <h2 className="text-7xl font-headline font-bold text-white mb-2 tracking-tighter">WELCOME</h2>
                  <p className="text-4xl text-green-300 font-black uppercase tracking-tight">{identifiedMember.fullName}</p>
                  <div className="mt-8 bg-black/40 px-6 py-2 rounded-full border border-green-500/30 text-xs text-green-500 uppercase font-bold tracking-widest">Entry Recorded</div>
                </div>
              )}

              {scanResult === 'failure' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/30 backdrop-blur-sm">
                  <XCircle className="h-32 w-32 text-destructive mb-4" />
                  <p className="text-white font-headline text-2xl font-bold">REJECTED</p>
                  <p className="text-white/60 text-sm mt-2">Member not recognized.</p>
                </div>
              )}
            </div>

            <CardContent className="p-6 border-t bg-card/80 backdrop-blur-md">
              <TabsContent value="kiosk" className="m-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Biometric Check-In</p>
                    <span className="text-[10px] opacity-60 font-mono">Status: Ready</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {!isCameraActive ? (
                      <Button size="lg" onClick={() => setIsCameraActive(true)} className="w-full sm:px-12 font-bold h-14 text-lg rounded-xl">
                          <Camera className="mr-2 h-5 w-5" /> ACTIVATE
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="default" 
                        onClick={triggerManualVerification} 
                        disabled={isProcessing || scanResult !== null}
                        className="flex-1 sm:px-12 font-bold h-14 text-lg rounded-xl bg-primary"
                      >
                         {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Scan className="mr-2 h-5 w-5" />}
                         VERIFY NOW
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="enroll" className="m-0">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {!pendingMember ? (
                    <div className="flex-1 flex gap-2 w-full">
                       <Input 
                        placeholder="Member phone..." 
                        className="h-12 text-lg" 
                        value={searchPhone} 
                        onChange={(e) => setSearchPhone(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleFindMember()} 
                       />
                       <Button size="lg" className="h-12 px-8" onClick={handleFindMember} disabled={isProcessing}><Search className="h-5 w-5 mr-2" /> FIND</Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                       <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <UserCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold text-lg leading-tight">{pendingMember.fullName}</p>
                            <p className="text-xs text-muted-foreground italic">Enrollment Pending</p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" className="flex-1 h-12" onClick={() => setPendingMember(null)}>CANCEL</Button>
                          <Button 
                            size="lg" 
                            className="flex-1 h-12 px-8 font-bold" 
                            onClick={handleCaptureEnrollment} 
                            disabled={isCapturing || !isCameraActive}
                          >
                            <Camera className="h-5 w-5 mr-2" /> ENROLL FACE
                          </Button>
                       </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 overflow-hidden border-none shadow-xl bg-card/30 backdrop-blur-sm">
              <CardHeader className="bg-muted/10 border-b py-4 px-6">
                <CardTitle className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-muted-foreground"><History className="h-4 w-4" /> LIVE ACTIVITY</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
                <Table>
                    <TableBody>
                      {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                        <TableRow key={i} className="border-b border-white/5">
                            <TableCell className="text-[10px] font-mono opacity-50">{log.time}</TableCell>
                            <TableCell className="font-bold text-sm">{log.name}</TableCell>
                            <TableCell className="text-right text-[10px] text-green-500 font-bold">{log.confidence}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-40 text-center italic text-muted-foreground opacity-30 text-xs p-10 leading-relaxed">
                            No entries yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4 px-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2"><AlertCircle className="h-3 w-3" /> SYSTEM HEALTH</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                  <div className="flex justify-between"><span className="opacity-60">Status</span><span className="font-bold text-green-500">Live</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Database</span><span className="font-bold text-primary">Connected</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Profiles</span><span className="font-bold text-primary">{cachedMembers.length} Cached</span></div>
                  <p className="leading-relaxed opacity-70 border-t pt-4 italic">Attendance is synced to cloud in real-time.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
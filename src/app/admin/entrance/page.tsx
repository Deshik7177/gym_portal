
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  WifiOff, 
  History,
  AlertCircle,
  RefreshCw,
  Cpu,
  UserPlus,
  Search,
  UserCheck
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, limit, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, generateEmbedding, findBestMatch } from '@/lib/face-logic';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // App Modes
  const [activeMode, setActiveMode] = useState<'kiosk' | 'enroll'>('kiosk');
  
  // Kiosk States
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Enrollment States
  const [searchPhone, setSearchPhone] = useState('');
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    loadFaceModels().then(() => setModelsReady(true));
    startCamera();
    
    return () => {
      stopCamera();
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Camera access is required for both kiosk and enrollment." });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  // --- KIOSK LOGIC ---
  const triggerVerification = useCallback(async () => {
    if (!modelsReady || isProcessing || scanResult || !videoRef.current || !db || activeMode !== 'kiosk') return;

    setIsProcessing(true);
    
    try {
      const liveEmbedding = await generateEmbedding(videoRef.current);
      if (!liveEmbedding) {
        setIsProcessing(false);
        return;
      }

      const q = query(collection(db, 'members'), where('status', '==', 'active'), limit(100));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const { bestMatch, confidence } = findBestMatch(liveEmbedding, members);

      if (bestMatch && confidence > 0.85) {
        const memberRef = doc(db, 'members', bestMatch.id);
        const updateData = { lastCheckIn: serverTimestamp(), updatedAt: serverTimestamp() };

        updateDoc(memberRef, updateData).catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: memberRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        setIdentifiedMember(bestMatch);
        setScanResult('success');
        setRecentLogs(prev => [{
            name: bestMatch.fullName,
            time: new Date().toLocaleTimeString(),
            confidence: (confidence * 100).toFixed(0) + '%'
        }, ...prev].slice(0, 10));

        setTimeout(() => { setScanResult(null); setIdentifiedMember(null); }, 4000);
      } else {
        setScanResult('failure');
        setTimeout(() => setScanResult(null), 2000);
      }
    } catch (error) {
      console.error('Kiosk matching error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [modelsReady, isProcessing, scanResult, db, activeMode]);

  useEffect(() => {
    if (isKioskActive && activeMode === 'kiosk') {
      loopRef.current = setInterval(() => {
        if (!isProcessing && !scanResult) triggerVerification();
      }, 5000);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
    }
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [isKioskActive, isProcessing, scanResult, triggerVerification, activeMode]);

  // --- ENROLLMENT LOGIC ---
  const handleFindMember = async () => {
    if (!searchPhone || !db) return;
    setIsProcessing(true);
    try {
      const docRef = doc(db, 'members', searchPhone);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setPendingMember({ id: snap.id, ...snap.data() });
      } else {
        toast({ variant: "destructive", title: "Not Found", description: "Register member details on the laptop first." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureEnrollment = async () => {
    if (!videoRef.current || !db || !pendingMember || !modelsReady) return;
    setIsCapturing(true);

    try {
      // Capture High Quality Frame and Embedding
      const embedding = await generateEmbedding(videoRef.current);
      
      if (embedding) {
        // Create a photo canvas snapshot
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);

        const memberRef = doc(db, 'members', pendingMember.id);
        const updateData = {
          faceEmbedding: embedding,
          photoData: dataUri,
          updatedAt: serverTimestamp()
        };

        await updateDoc(memberRef, updateData);
        toast({ title: "Face Enrolled!", description: `${pendingMember.fullName} is now ready for Auto-Kiosk.` });
        setPendingMember(null);
        setSearchPhone('');
      } else {
        toast({ variant: "destructive", title: "Face Not Found", description: "Ensure the subject is looking directly at the camera." });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Enrollment Failed", description: "Biometric generation failed." });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Tabs value={activeMode} onValueChange={(v: any) => { setActiveMode(v); setIsKioskActive(false); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1">
          <TabsTrigger value="kiosk" className="text-lg font-bold">
            <Scan className="mr-2 h-5 w-5" /> AUTO-KIOSK
          </TabsTrigger>
          <TabsTrigger value="enroll" className="text-lg font-bold">
            <UserPlus className="mr-2 h-5 w-5" /> FACE ENROLLMENT
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-2xl rounded-2xl min-h-[500px]">
            {/* Overlay Badges */}
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-primary font-mono border-primary/20">
                  <Cpu className="h-3 w-3 mr-1" /> ON-DEVICE AI
              </Badge>
              {isKioskActive && activeMode === 'kiosk' && (
                <Badge className="bg-green-500 animate-pulse">AUTOPILOT ON</Badge>
              )}
            </div>

            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <Button size="icon" variant="outline" className="bg-background/50 rounded-full" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}>
                  <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Video Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-500",
                  scanResult === 'success' ? "opacity-30" : "opacity-90"
                )}
              />

              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
                    <div className="w-48 h-48 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-white font-headline text-2xl tracking-[0.2em] animate-pulse">IDENTIFYING...</p>
                </div>
              )}

              {/* Kiosk Feedback */}
              {activeMode === 'kiosk' && scanResult === 'success' && identifiedMember && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-600/20 animate-in zoom-in duration-300">
                  <CheckCircle2 className="h-56 w-56 text-green-500 mb-6 drop-shadow-2xl" />
                  <h2 className="text-7xl font-headline font-bold text-white mb-2 text-center px-4">WELCOME</h2>
                  <p className="text-4xl text-green-300 font-black uppercase tracking-widest text-center px-4">
                    {identifiedMember.fullName}
                  </p>
                  <div className="mt-10 bg-green-500 text-white px-10 py-3 rounded-full font-bold shadow-xl">
                      ACCESS GRANTED
                  </div>
                </div>
              )}

              {activeMode === 'kiosk' && scanResult === 'failure' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/10">
                  <XCircle className="h-32 w-32 text-destructive mb-4" />
                  <p className="text-white font-headline text-2xl uppercase tracking-widest">ID NOT RECOGNIZED</p>
                </div>
              )}
            </div>

            {/* Mode Controls */}
            <CardContent className="p-6 border-t bg-card/80 backdrop-blur-md">
              <TabsContent value="kiosk" className="m-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Smart Entry Terminal</p>
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-orange-500")} />
                        <span className="text-[10px] opacity-60 uppercase font-mono">{isOnline ? 'Network Synced' : 'Offline Engine'}</span>
                    </div>
                  </div>
                  <Button 
                      size="lg"
                      variant={isKioskActive ? "destructive" : "default"}
                      onClick={() => setIsKioskActive(!isKioskActive)}
                      className="px-12 font-bold h-14 text-lg rounded-xl shadow-lg transition-all active:scale-95"
                  >
                      {isKioskActive ? "STOP KIOSK" : "START AUTO-KIOSK"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="enroll" className="m-0">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {!pendingMember ? (
                    <div className="flex-1 flex gap-2 w-full">
                       <Input 
                        placeholder="Enter member phone number..." 
                        className="h-12 text-lg" 
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFindMember()}
                       />
                       <Button size="lg" className="h-12 px-8" onClick={handleFindMember} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 mr-2" />}
                          FIND
                       </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                       <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                             <UserCheck className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                             <p className="font-bold text-lg leading-none">{pendingMember.fullName}</p>
                             <p className="text-xs text-muted-foreground">Ready for enrollment</p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" className="h-12 px-6" onClick={() => setPendingMember(null)}>CANCEL</Button>
                          <Button 
                            size="lg" 
                            className="flex-1 h-12 px-12 font-bold bg-primary hover:bg-primary/90" 
                            onClick={handleCaptureEnrollment}
                            disabled={isCapturing}
                          >
                            {isCapturing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Camera className="h-5 w-5 mr-2" />}
                            CAPTURE & ENROLL
                          </Button>
                       </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Card>

          {/* Side Panel (Feed/Stats) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl bg-card/30">
              <CardHeader className="bg-muted/10 border-b py-4 px-6">
                <CardTitle className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-muted-foreground">
                  <History className="h-4 w-4 text-primary" /> LIVE ACCESS FEED
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
                <Table>
                    <TableBody>
                      {recentLogs.length > 0 ? (
                        recentLogs.map((log, i) => (
                          <TableRow key={i} className="animate-in slide-in-from-right border-b border-white/5">
                              <TableCell className="text-[10px] font-mono opacity-50 py-4">{log.time}</TableCell>
                              <TableCell className="font-bold text-sm py-4">{log.name}</TableCell>
                              <TableCell className="text-right py-4">
                                <Badge variant="outline" className="text-[9px] h-5 border-green-500/20 text-green-500 bg-green-500/5">
                                    {log.confidence}
                                </Badge>
                              </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={3} className="h-40 text-center italic text-muted-foreground opacity-30 text-xs">Waiting for member scans...</TableCell></TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4 px-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" /> MOBILE SETUP TIPS
                  </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                  <p className="leading-relaxed opacity-70">
                    1. Use the <b>Face Enrollment</b> tab on this phone to capture member IDs.
                  </p>
                  <p className="leading-relaxed opacity-70">
                    2. Switch to <b>Auto-Kiosk</b> and mount the phone securely at the entrance.
                  </p>
                  <p className="leading-relaxed opacity-70">
                    3. For best results, ensure the entrance area is well-lit.
                  </p>
                  <div className="pt-4 border-t border-primary/5 flex justify-between">
                    <span className="opacity-60">Avg. Matching Latency</span>
                    <span className="font-bold text-green-500">~140ms</span>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

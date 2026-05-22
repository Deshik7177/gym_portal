
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Zap,
  Activity,
  Cloud
} from 'lucide-react';
import { collection, query, updateDoc, doc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, detectFacePassive, findBestMatch, checkFrameQuality } from '@/lib/face-logic';
import * as faceapi from 'face-api.js';
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
import { Progress } from '@/components/ui/progress';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [activeMode, setActiveMode] = useState<'kiosk' | 'enroll'>('kiosk');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [cachedMembers, setCachedMembers] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [enrollProgress, setEnrollProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const passiveLoopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preload ALL members with embeddings, regardless of status
  useEffect(() => {
    if (!db) return;
    setIsSyncing(true);
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => 
          m.faceEmbedding && 
          Array.isArray(m.faceEmbedding) && 
          m.faceEmbedding.length > 0
        );
      setCachedMembers(members);
      setIsSyncing(false);
    }, (error) => {
      setIsSyncing(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'members',
        operation: 'list',
      }));
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
      toast({ variant: "destructive", title: "Camera Error", description: "Camera access is required for biometrics." });
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (passiveLoopTimeoutRef.current) clearTimeout(passiveLoopTimeoutRef.current);
  };

  const finalizeScan = useCallback((results: { member: any, similarity: number }[]) => {
    setIsProcessing(false);
    setFeedback('');

    if (results.length === 0) {
      setScanResult('failure');
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    const memberStats: Record<string, { member: any, totalSim: number, count: number }> = {};
    results.forEach(r => {
      if (!memberStats[r.member.id]) {
        memberStats[r.member.id] = { member: r.member, totalSim: 0, count: 0 };
      }
      memberStats[r.member.id].totalSim += r.similarity;
      memberStats[r.member.id].count++;
    });

    const bestFinal = Object.values(memberStats)
      .map(v => ({ member: v.member, avgSim: v.totalSim / v.count }))
      .sort((a, b) => b.avgSim - a.avgSim)[0];

    // Accurate Thresholds: 0.84 Stable Match
    if (bestFinal && bestFinal.avgSim >= 0.84 && db) {
      const memberRef = doc(db, 'members', bestFinal.member.id);
      const updateData = { lastCheckIn: serverTimestamp(), updatedAt: serverTimestamp() };

      updateDoc(memberRef, updateData).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: memberRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext));
      });

      setIdentifiedMember(bestFinal.member);
      setScanResult('success');
      setRecentLogs(prev => [{
          name: bestFinal.member.fullName,
          time: new Date().toLocaleTimeString(),
          confidence: (bestFinal.avgSim * 100).toFixed(0) + '%'
      }, ...prev].slice(0, 10));

      setTimeout(() => { 
          setScanResult(null); 
          setIdentifiedMember(null); 
      }, 5000);
    } else {
      setScanResult('failure');
      setTimeout(() => setScanResult(null), 3000);
    }
  }, [db]);

  const triggerVerification = useCallback(async () => {
    if (!modelsReady || isProcessing || scanResult || !videoRef.current || !db || cachedMembers.length === 0) return;

    setIsProcessing(true);
    setFeedback('HOLD STILL...');
    
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });
    const collectedResults: { member: any, similarity: number }[] = [];
    const requiredSamples = 10; // Multi-frame stability
    let framesAttempted = 0;
    const maxFrames = 60; 

    const processFrame = async () => {
      if (!videoRef.current || !isCameraActive || !isProcessing || videoRef.current.readyState < 2) {
        if (isProcessing) scanLoopRef.current = requestAnimationFrame(processFrame);
        return;
      }

      if (framesAttempted >= maxFrames || collectedResults.length >= requiredSamples) {
        finalizeScan(collectedResults);
        return;
      }

      framesAttempted++;
      
      try {
        const detection = await faceapi.detectSingleFace(videoRef.current, ssdOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const quality = await checkFrameQuality(detection);
          if (quality.isValid) {
            const { bestMatch, confidence } = findBestMatch(Array.from(detection.descriptor), cachedMembers);
            if (bestMatch) {
              collectedResults.push({ member: bestMatch, similarity: confidence });
              setFeedback(`VERIFYING: ${Math.round((collectedResults.length / requiredSamples) * 100)}%`);
            }
          } else {
            setFeedback(quality.reason || 'ADJUSTING...');
          }
        }
      } catch (err) {
        console.warn("Frame skip:", err);
      }

      scanLoopRef.current = requestAnimationFrame(processFrame);
    };

    scanLoopRef.current = requestAnimationFrame(processFrame);
  }, [modelsReady, isProcessing, scanResult, isCameraActive, cachedMembers, finalizeScan, db]);

  // SMART DETECTION: Passive detection triggers active verification
  useEffect(() => {
    if (activeMode === 'kiosk' && isCameraActive && modelsReady && !isProcessing && !scanResult) {
      const passiveDetection = async () => {
        if (!videoRef.current || isProcessing || scanResult || activeMode !== 'kiosk' || videoRef.current.readyState < 2) {
          passiveLoopTimeoutRef.current = setTimeout(passiveDetection, 1000);
          return;
        }

        try {
          const detection = await detectFacePassive(videoRef.current);
          if (detection && detection.score > 0.6) {
            triggerVerification();
          } else {
            passiveLoopTimeoutRef.current = setTimeout(passiveDetection, 400);
          }
        } catch (e) {
          passiveLoopTimeoutRef.current = setTimeout(passiveDetection, 1000);
        }
      };
      
      passiveDetection();
    }
    return () => {
      if (passiveLoopTimeoutRef.current) clearTimeout(passiveLoopTimeoutRef.current);
    };
  }, [activeMode, isCameraActive, modelsReady, isProcessing, scanResult, triggerVerification]);

  const handleFindMember = async () => {
    if (!searchPhone || !db) return;
    setIsProcessing(true);
    try {
      const snap = await getDoc(doc(db, 'members', searchPhone));
      if (snap.exists()) setPendingMember({ id: snap.id, ...snap.data() });
      else toast({ variant: "destructive", title: "Not Found", description: "Phone number not registered." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureEnrollment = async () => {
    if (!videoRef.current || !db || !pendingMember || !modelsReady) return;
    setIsProcessing(true);
    setEnrollProgress(0);
    setFeedback('SAMPLING BIOMETRICS...');

    const samples: number[][] = [];
    const maxSamples = 10;
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 });

    const enrollLoop = async () => {
      if (!videoRef.current || !isCameraActive || !isProcessing || videoRef.current.readyState < 2) {
        if (isProcessing) requestAnimationFrame(enrollLoop);
        return;
      }

      if (samples.length >= maxSamples) {
        const averaged = samples[0].map((_, i) => 
          samples.reduce((acc, sample) => acc + sample[i], 0) / samples.length
        );

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);

        const memberRef = doc(db, 'members', pendingMember.id);
        const updateData = { 
          faceEmbedding: averaged, 
          photoData: dataUri, 
          updatedAt: serverTimestamp() 
        };

        await updateDoc(memberRef, updateData);
        toast({ title: "Enrollment Complete", description: `${pendingMember.fullName} biometrics are now synced.` });
        setPendingMember(null);
        setSearchPhone('');
        setIsProcessing(false);
        setEnrollProgress(0);
        setFeedback('');
        return;
      }

      try {
        const detection = await faceapi.detectSingleFace(videoRef.current, ssdOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const quality = await checkFrameQuality(detection);
          if (quality.isValid) {
            samples.push(Array.from(detection.descriptor));
            setEnrollProgress(samples.length / maxSamples);
            setFeedback(`CAPTURING: ${samples.length}/${maxSamples}`);
          } else {
            setFeedback(quality.reason || 'STABILIZING...');
          }
        }
      } catch (err) {
        console.warn("Enrollment skip:", err);
      }

      requestAnimationFrame(enrollLoop);
    };

    enrollLoop();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-bold font-headline">Smart Entrance</h1>
         <div className="flex items-center gap-2">
            <p className="text-muted-foreground italic text-sm">Active Biometric Monitoring</p>
            {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse border-primary/20 bg-primary/5"><Cloud className="h-2 w-2 mr-1" /> REFRESHING CACHE</Badge>}
         </div>
      </div>

      <Tabs value={activeMode} onValueChange={(v: any) => { setActiveMode(v); setScanResult(null); setIsProcessing(false); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1">
          <TabsTrigger value="kiosk" className="text-lg font-bold"><Zap className="mr-2 h-5 w-5 text-primary" /> HANDS-FREE SCAN</TabsTrigger>
          <TabsTrigger value="enroll" className="text-lg font-bold"><UserPlus className="mr-2 h-5 w-5" /> MEMBER ENROLL</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-2xl rounded-2xl min-h-[500px]">
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-primary font-mono border-primary/20"><Cpu className="h-3 w-3 mr-1" /> SSD-AI PIPELINE</Badge>
              {isCameraActive && !isProcessing && <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse">WATCHING...</Badge>}
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
                  className={cn("w-full h-full object-cover transition-opacity duration-700", (scanResult === 'success' || isProcessing) ? "opacity-30" : "opacity-90")} 
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground/30">
                  <Camera className="h-20 w-20" />
                  <p className="font-headline text-xl">Camera Offline</p>
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/70 backdrop-blur-sm space-y-6">
                    <div className="relative h-24 w-24">
                        <Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" />
                        <Activity className="h-10 w-10 text-primary absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <p className="text-white font-headline text-2xl tracking-[0.2em] animate-pulse uppercase">{feedback || 'IDENTIFYING...'}</p>
                    {enrollProgress > 0 && (
                      <div className="w-64 space-y-3">
                        <Progress value={enrollProgress * 100} className="h-1.5 bg-white/10" />
                        <p className="text-[10px] text-center text-primary font-bold uppercase tracking-[0.3em]">Building Master Profile</p>
                      </div>
                    )}
                </div>
              )}

              {scanResult === 'success' && identifiedMember && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-950/40 animate-in zoom-in duration-500">
                  <CheckCircle2 className="h-40 w-40 text-green-500 mb-6 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]" />
                  <h2 className="text-6xl font-headline font-bold text-white mb-2 tracking-tighter">SUCCESS</h2>
                  <p className="text-4xl text-green-300 font-black uppercase tracking-tight">{identifiedMember.fullName}</p>
                  <div className="mt-8 bg-black/60 px-8 py-2.5 rounded-full border border-green-500/50 text-[10px] text-green-500 uppercase font-black tracking-[0.5em]">Access Granted</div>
                </div>
              )}

              {scanResult === 'failure' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/20 backdrop-blur-md">
                  <XCircle className="h-32 w-32 text-destructive mb-4 drop-shadow-xl" />
                  <p className="text-white font-headline text-2xl font-bold tracking-[0.2em] uppercase">RETRY SCAN</p>
                  <p className="text-white/60 text-xs mt-2 uppercase tracking-widest font-bold">Matching Uncertain</p>
                </div>
              )}
            </div>

            <CardContent className="p-6 border-t bg-card/90 backdrop-blur-xl">
              <TabsContent value="kiosk" className="m-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Biometric Status</p>
                    <span className="text-[10px] font-mono text-primary/80 uppercase">
                        {modelsReady ? (cachedMembers.length > 0 ? `Watching ${cachedMembers.length} Profiles` : 'Waiting for enrollment...') : 'Booting Neural Pipeline...'}
                    </span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {!isCameraActive ? (
                      <Button size="lg" onClick={() => setIsCameraActive(true)} className="w-full sm:px-12 font-black h-14 text-lg rounded-2xl shadow-xl shadow-primary/10">
                          <Camera className="mr-2 h-5 w-5" /> ACTIVATE SMART SCAN
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="secondary" 
                        onClick={triggerVerification} 
                        disabled={isProcessing || !modelsReady || scanResult !== null}
                        className="flex-1 sm:px-12 font-black h-14 text-lg rounded-2xl border-primary/20"
                      >
                         {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Scan className="mr-2 h-5 w-5 text-primary" />}
                         FORCE SCAN
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
                        placeholder="Member phone number..." 
                        className="h-14 text-lg bg-background/50 border-primary/10" 
                        value={searchPhone} 
                        onChange={(e) => setSearchPhone(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleFindMember()} 
                       />
                       <Button size="lg" className="h-14 px-8 rounded-2xl" onClick={handleFindMember} disabled={isProcessing}><Search className="h-5 w-5 mr-2" /> FIND</Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full animate-in slide-in-from-bottom-2">
                       <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                            <UserCheck className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="font-black text-xl leading-tight uppercase tracking-tight">{pendingMember.fullName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">Identity ready for sampling</p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="ghost" className="flex-1 h-14 rounded-2xl" onClick={() => setPendingMember(null)} disabled={isProcessing}>CANCEL</Button>
                          <Button 
                            size="lg" 
                            className="flex-1 h-14 px-10 font-black rounded-2xl shadow-xl shadow-primary/10" 
                            onClick={handleCaptureEnrollment} 
                            disabled={isProcessing || !isCameraActive || !modelsReady}
                          >
                            <Camera className="h-5 w-5 mr-2" /> START MASTER CAPTURE
                          </Button>
                       </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Card>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 overflow-hidden border-none shadow-2xl bg-card/40 backdrop-blur-xl rounded-2xl">
              <CardHeader className="bg-primary/[0.03] border-b border-primary/5 py-5 px-6">
                <CardTitle className="text-[10px] uppercase tracking-[0.4em] font-black flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4 text-primary/60" /> RECENT ENTRIES
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto max-h-[400px]">
                <Table>
                    <TableBody>
                      {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                        <TableRow key={i} className="border-b border-primary/5 hover:bg-primary/[0.02]">
                            <TableCell className="text-[10px] font-mono opacity-40 pl-6">{log.time}</TableCell>
                            <TableCell className="font-bold text-sm text-white/90">{log.name}</TableCell>
                            <TableCell className="text-right text-[10px] text-primary font-black pr-6">{log.confidence}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-48 text-center italic text-muted-foreground opacity-20 text-xs p-12 leading-relaxed uppercase tracking-widest font-black">
                            No recent logs
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/[0.02] border border-primary/10 rounded-2xl">
              <CardHeader className="py-4 px-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] uppercase font-black text-primary/60 flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5" /> BIOMETRIC TELEMETRY</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex justify-between"><span className="opacity-40">Precision</span><span className="text-primary">SSD Mobilenet</span></div>
                  <div className="flex justify-between"><span className="opacity-40">Auto-Detect</span><span className="text-green-500">Active</span></div>
                  <div className="flex justify-between"><span className="opacity-40">Preloaded Cache</span><span className="text-primary">{cachedMembers.length} Profiles</span></div>
                  <div className="flex justify-between"><span className="opacity-40">Threshold</span><span className="text-primary">0.84 Stable</span></div>
                  <p className="leading-relaxed opacity-40 border-t border-primary/5 pt-4 italic normal-case font-medium">Matching all members across all status levels.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  Fingerprint,
  Zap
} from 'lucide-react';
import { collection, query, where, updateDoc, doc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, detectFacePassive, findBestMatch, checkFrameQuality, cosineSimilarity } from '@/lib/face-logic';
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
  const [searchPhone, setSearchPhone] = useState('');
  const [pendingMember, setPendingMember] = useState<any>(null);
  const [enrollProgress, setEnrollProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLoopRef = useRef<number | null>(null);

  // Preload all active embeddings into local memory
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'members'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((m: any) => m.faceEmbedding && Array.isArray(m.faceEmbedding));
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
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
  };

  /**
   * Multi-frame verification logic:
   * Captures 10 stable frames, averages the best similarity scores.
   */
  const triggerMultiFrameVerification = async () => {
    if (!modelsReady || isProcessing || scanResult || !videoRef.current || !db) return;

    setIsProcessing(true);
    setFeedback('Positioning face...');
    
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
    const collectedResults: { member: any, similarity: number }[] = [];
    const requiredSamples = 5;
    let framesAttempted = 0;
    const maxFrames = 50; // Timeout after ~2 seconds of frames

    const processFrame = async () => {
      if (framesAttempted >= maxFrames || collectedResults.length >= requiredSamples) {
        finalizeScan(collectedResults);
        return;
      }

      framesAttempted++;
      
      const detection = await faceapi.detectSingleFace(videoRef.current!, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          const { bestMatch, confidence } = findBestMatch(Array.from(detection.descriptor), cachedMembers);
          if (bestMatch) {
            collectedResults.push({ member: bestMatch, similarity: confidence });
            setFeedback(`Analyzing... ${Math.round((collectedResults.length / requiredSamples) * 100)}%`);
          } else {
            setFeedback('Hold still...');
          }
        } else {
          setFeedback(quality.reason || 'Scanning...');
        }
      } else {
        setFeedback('Face not detected');
      }

      scanLoopRef.current = requestAnimationFrame(processFrame);
    };

    scanLoopRef.current = requestAnimationFrame(processFrame);
  };

  const finalizeScan = (results: { member: any, similarity: number }[]) => {
    setIsProcessing(false);
    setFeedback('');

    if (results.length === 0) {
      setScanResult('failure');
      setTimeout(() => setScanResult(null), 3000);
      return;
    }

    // Group by member and find average similarity
    const memberCounts: Record<string, { member: any, totalSim: number, count: number }> = {};
    results.forEach(r => {
      if (!memberCounts[r.member.id]) {
        memberCounts[r.member.id] = { member: r.member, totalSim: 0, count: 0 };
      }
      memberCounts[r.member.id].totalSim += r.similarity;
      memberCounts[r.member.id].count++;
    });

    const bestFinal = Object.values(memberCounts)
      .map(v => ({ member: v.member, avgSim: v.totalSim / v.count }))
      .sort((a, b) => b.avgSim - a.avgSim)[0];

    // Multi-frame optimized threshold: 0.84 for definite auth
    if (bestFinal && bestFinal.avgSim >= 0.84) {
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
      toast({ variant: "destructive", title: "Access Denied", description: "Uncertain identity. Please retry scan." });
      setTimeout(() => setScanResult(null), 3000);
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

  /**
   * Enrollment stabilization: Captures multiple high-quality frames and averages them.
   */
  const handleCaptureEnrollment = async () => {
    if (!videoRef.current || !db || !pendingMember || !modelsReady) return;
    setIsProcessing(true);
    setEnrollProgress(0);

    const samples: number[][] = [];
    const maxSamples = 10;
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    const enrollLoop = async () => {
      if (samples.length >= maxSamples) {
        // Average the embeddings for stability
        const averaged = samples[0].map((_, i) => 
          samples.reduce((acc, sample) => acc + sample[i], 0) / samples.length
        );

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current!.videoWidth;
        canvas.height = videoRef.current!.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current!, 0, 0);
        const dataUri = canvas.toDataURL('image/jpeg', 0.8);

        const memberRef = doc(db, 'members', pendingMember.id);
        const updateData = { 
          faceEmbedding: averaged, 
          photoData: dataUri, 
          updatedAt: serverTimestamp() 
        };

        await updateDoc(memberRef, updateData);
        toast({ title: "Face Enrolled!", description: `${pendingMember.fullName} is ready.` });
        setPendingMember(null);
        setSearchPhone('');
        setIsProcessing(false);
        setEnrollProgress(0);
        return;
      }

      const detection = await faceapi.detectSingleFace(videoRef.current!, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const quality = await checkFrameQuality(detection);
        if (quality.isValid) {
          samples.push(Array.from(detection.descriptor));
          setEnrollProgress(samples.length / maxSamples);
        }
      }

      requestAnimationFrame(enrollLoop);
    };

    enrollLoop();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-bold font-headline">Entrance Kiosk</h1>
         <p className="text-muted-foreground italic">High-Accuracy Biometric Portal</p>
      </div>

      <Tabs value={activeMode} onValueChange={(v: any) => { setActiveMode(v); setScanResult(null); setIsProcessing(false); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 p-1">
          <TabsTrigger value="kiosk" className="text-lg font-bold"><Zap className="mr-2 h-5 w-5 text-primary" /> SMART SCAN</TabsTrigger>
          <TabsTrigger value="enroll" className="text-lg font-bold"><UserPlus className="mr-2 h-5 w-5" /> FACE ENROLL</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-2xl rounded-2xl min-h-[500px]">
            <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-primary font-mono"><Cpu className="h-3 w-3 mr-1" /> NEURAL ENGINE</Badge>
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
              
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/60 backdrop-blur-sm space-y-4">
                    <Loader2 className="h-20 w-20 animate-spin text-primary" />
                    <p className="text-white font-headline text-3xl tracking-widest animate-pulse uppercase">{feedback || 'SCANNING...'}</p>
                    {enrollProgress > 0 && (
                      <div className="w-64 space-y-2">
                        <Progress value={enrollProgress * 100} className="h-2" />
                        <p className="text-[10px] text-center text-primary font-bold uppercase tracking-widest">Building Biometric Profile</p>
                      </div>
                    )}
                </div>
              )}

              {scanResult === 'success' && identifiedMember && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-900/40 animate-in zoom-in">
                  <CheckCircle2 className="h-48 w-48 text-green-500 mb-6 drop-shadow-xl" />
                  <h2 className="text-7xl font-headline font-bold text-white mb-2 tracking-tighter">WELCOME</h2>
                  <p className="text-4xl text-green-300 font-black uppercase tracking-tight">{identifiedMember.fullName}</p>
                  <div className="mt-8 bg-black/40 px-6 py-2 rounded-full border border-green-500/30 text-xs text-green-500 uppercase font-bold tracking-widest">Access Granted</div>
                </div>
              )}

              {scanResult === 'failure' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/30 backdrop-blur-sm">
                  <XCircle className="h-32 w-32 text-destructive mb-4" />
                  <p className="text-white font-headline text-2xl font-bold tracking-widest uppercase">RETRY SCAN</p>
                  <p className="text-white/60 text-sm mt-2">Authentication Uncertain</p>
                </div>
              )}
            </div>

            <CardContent className="p-6 border-t bg-card/80 backdrop-blur-md">
              <TabsContent value="kiosk" className="m-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Multi-Frame Verification</p>
                    <span className="text-[10px] opacity-60 font-mono">Status: {modelsReady ? 'Ready' : 'Initializing AI...'}</span>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {!isCameraActive ? (
                      <Button size="lg" onClick={() => setIsCameraActive(true)} className="w-full sm:px-12 font-bold h-14 text-lg rounded-xl">
                          <Camera className="mr-2 h-5 w-5" /> ACTIVATE CAMERA
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="default" 
                        onClick={triggerMultiFrameVerification} 
                        disabled={isProcessing || !modelsReady || scanResult !== null}
                        className="flex-1 sm:px-12 font-bold h-14 text-lg rounded-xl bg-primary"
                      >
                         {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Scan className="mr-2 h-5 w-5" />}
                         START SCAN
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
                            <p className="text-xs text-muted-foreground italic">Ready for Stable Enrollment</p>
                          </div>
                       </div>
                       <div className="flex gap-2 w-full sm:w-auto">
                          <Button variant="outline" className="flex-1 h-12" onClick={() => setPendingMember(null)} disabled={isProcessing}>CANCEL</Button>
                          <Button 
                            size="lg" 
                            className="flex-1 h-12 px-8 font-bold" 
                            onClick={handleCaptureEnrollment} 
                            disabled={isProcessing || !isCameraActive || !modelsReady}
                          >
                            <Camera className="h-5 w-5 mr-2" /> ENROLL MASTER FACE
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
                <CardTitle className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-muted-foreground"><History className="h-4 w-4" /> RECENT ACTIVITY</CardTitle>
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
                            Awaiting scan operations...
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4 px-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2"><AlertCircle className="h-3 w-3" /> NEURAL STATS</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                  <div className="flex justify-between"><span className="opacity-60">AI Resolution</span><span className="font-bold text-primary">640x480</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Active Pipeline</span><span className="font-bold text-green-500">SSD Mobilenet v1</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Cached Profiles</span><span className="font-bold text-primary">{cachedMembers.length} Preloaded</span></div>
                  <div className="flex justify-between"><span className="opacity-60">Matching Algorithm</span><span className="font-bold text-primary">Cosine Similarity</span></div>
                  <p className="leading-relaxed opacity-70 border-t pt-4 italic">Biometric matching is performed 100% locally in-browser.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

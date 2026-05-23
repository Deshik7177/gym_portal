
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Scan, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  QrCode,
  Zap,
  History,
  Cloud,
  ShieldCheck
} from 'lucide-react';
import { collection, query, updateDoc, doc, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, findBestMatch } from '@/lib/face-logic';
import * as faceapi from 'face-api.js';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';
import { validateQrPayload } from '@/lib/qr-logic';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [authMode, setAuthMode] = useState<'face' | 'qr'>('face');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string>('INITIALIZING...');
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [cachedMembers, setCachedMembers] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isComponentMounted = useRef(true);

  // Sync Member Cache
  useEffect(() => {
    if (!db) return;
    setIsSyncing(true);
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCachedMembers(members);
      setIsSyncing(false);
    });
    return () => {
      unsubscribe();
      isComponentMounted.current = false;
    };
  }, [db]);

  useEffect(() => {
    loadFaceModels().then(() => {
      if (isComponentMounted.current) {
        setModelsReady(true);
        setFeedback('SYSTEM READY');
      }
    });
    if (isCameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [facingMode, isCameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Error", description: "Webcam access required." });
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

  const triggerAccess = useCallback(async (member: any, method: 'face' | 'qr', score: number = 1) => {
    if (!db || !member || isProcessing) return;
    
    setIsProcessing(true);
    setScanResult('success');
    setIdentifiedMember(member);

    try {
      // 1. Log Attendance
      addDoc(collection(db, 'attendance'), {
        memberId: member.id,
        memberName: member.fullName,
        timestamp: serverTimestamp(),
        method,
        score
      });

      // 2. Update Last Check-in
      updateDoc(doc(db, 'members', member.id), {
        lastCheckIn: serverTimestamp()
      });

      // 3. Command Gate OPEN
      addDoc(collection(db, 'gateControl'), {
        command: 'OPEN',
        timestamp: serverTimestamp(),
        memberId: member.id,
        method
      });

      setRecentLogs(prev => [{
        name: member.fullName,
        time: new Date().toLocaleTimeString(),
        method: method.toUpperCase()
      }, ...prev].slice(0, 10));
    } catch (e) {
      console.error("Access trigger failed:", e);
    }

    setTimeout(() => {
      if (isComponentMounted.current) {
        setScanResult(null);
        setIdentifiedMember(null);
        setIsProcessing(false);
        setFeedback('WAITING FOR NEXT ENTRY');
      }
    }, 4000);
  }, [db, isProcessing]);

  const runHybridLoop = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || scanResult || isProcessing || !isComponentMounted.current) {
      scanLoopRef.current = requestAnimationFrame(runHybridLoop);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      scanLoopRef.current = requestAnimationFrame(runHybridLoop);
      return;
    }

    if (authMode === 'face' && modelsReady) {
      try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection && isComponentMounted.current) {
          setFeedback('FACE DETECTED - ANALYZING...');
          const { bestMatch, distance } = findBestMatch(Array.from(detection.descriptor), cachedMembers);
          
          if (bestMatch && distance < 0.55) {
            triggerAccess(bestMatch, 'face', 1 - distance);
            return;
          } else {
            setFeedback('ID NOT FOUND - TRY QR OR RE-ALIGN');
          }
        } else if (isComponentMounted.current) {
          setFeedback('SEARCHING FOR FACE...');
        }
      } catch (e) {
        console.warn("Biometric loop skip:", e);
      }
    } else if (authMode === 'qr') {
      if (canvasRef.current && isComponentMounted.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          const scale = 0.7; 
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && isComponentMounted.current) {
            setFeedback('QR TOKEN RECOGNIZED');
            const validated = validateQrPayload(code.data);
            if (validated) {
              const member = cachedMembers.find(m => m.phone === validated.memberId || m.id === validated.memberId);
              if (member) {
                triggerAccess(member, 'qr');
                return;
              } else {
                setFeedback('INVALID QR TOKEN');
              }
            } else {
              setFeedback('INVALID QR FORMAT');
            }
          } else if (isComponentMounted.current) {
            setFeedback('PRESENT QR TO SCANNER');
          }
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(runHybridLoop);
  }, [authMode, isCameraActive, scanResult, isProcessing, modelsReady, cachedMembers, triggerAccess]);

  useEffect(() => {
    if (isCameraActive) {
      scanLoopRef.current = requestAnimationFrame(runHybridLoop);
    }
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [isCameraActive, runHybridLoop]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-4xl font-black font-headline tracking-tighter text-white flex items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
            SECURE KIOSK
         </h1>
         <div className="flex items-center gap-2">
            <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">Biometric & QR Hybrid Gateway</p>
            {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse border-primary/20 bg-primary/5 text-primary"><Cloud className="h-2 w-2 mr-1" /> SYNCING CACHE</Badge>}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] rounded-3xl min-h-[600px]">
          {/* HUD Overlay */}
          <div className="absolute top-6 left-6 z-20 flex flex-wrap gap-3">
            <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-500", authMode === 'face' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground opacity-40")}>
              <Zap className="h-3 w-3 mr-2" /> PREMIUM FACE
            </Badge>
            <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-500", authMode === 'qr' ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground opacity-40")}>
              <QrCode className="h-3 w-3 mr-2" /> RELIABLE QR
            </Badge>
          </div>

          <div className="absolute top-6 right-6 z-20">
            <Button size="icon" variant="outline" className="bg-black/50 backdrop-blur-md rounded-full border-white/10 hover:bg-primary/20" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {/* Camera Viewport */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            {isCameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className={cn("w-full h-full object-cover transition-all duration-1000", (scanResult === 'success' || isProcessing) ? "scale-110 blur-xl opacity-20" : "scale-100 opacity-90")} 
              />
            ) : (
              <div className="flex flex-col items-center gap-6 text-muted-foreground/10">
                <Camera className="h-32 w-32" />
                <p className="font-headline text-2xl tracking-widest uppercase">Scanner Offline</p>
              </div>
            )}
            
            {/* Realtime UI Feedback */}
            {isCameraActive && !scanResult && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{authMode === 'face' ? 'AI Biometric' : 'Optical QR'}</p>
                     <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  </div>
                  <h3 className="text-xl font-headline font-bold text-white mb-2 uppercase tracking-tight min-h-[1.5em]">{feedback}</h3>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-500", authMode === 'face' ? "bg-primary w-1/3" : "bg-blue-500 w-full")} />
                  </div>
                </div>
              </div>
            )}

            {/* Success Animation */}
            {scanResult === 'success' && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 animate-in zoom-in duration-700">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse rounded-full" />
                   <CheckCircle2 className="h-56 w-56 text-primary relative drop-shadow-[0_0_50px_rgba(var(--primary),0.8)]" />
                </div>
                <h2 className="text-8xl font-black font-headline text-white mb-2 tracking-tighter italic">WELCOME</h2>
                <p className="text-4xl text-primary font-black uppercase tracking-tight border-b-4 border-primary pb-2">{identifiedMember.fullName}</p>
              </div>
            )}

            {/* Scanning Grids/Effects */}
            {isCameraActive && !scanResult && authMode === 'qr' && (
              <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-blue-500/50 rounded-3xl" />
                 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-blue-500/30 animate-scan-line" />
              </div>
            )}
          </div>

          <CardContent className="p-8 border-t border-white/5 bg-card/80 backdrop-blur-3xl">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mb-2">Manual Control Override</p>
                   <div className="flex items-center gap-4">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                      <span className="font-mono text-xs text-white/40 uppercase tracking-widest">RELAY-01: ONLINE</span>
                   </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                   {!isCameraActive ? (
                      <Button size="lg" onClick={() => setIsCameraActive(true)} className="w-full sm:px-16 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-primary/20">
                          <Camera className="mr-3 h-6 w-6" /> START SCANNER
                      </Button>
                   ) : (
                      <>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          onClick={() => {
                            setAuthMode(authMode === 'face' ? 'qr' : 'face');
                            setFeedback(authMode === 'face' ? 'QR MODE ACTIVE' : 'FACE MODE ACTIVE');
                          }}
                          className="flex-1 h-16 rounded-2xl border-white/10 hover:bg-white/5 font-bold"
                        >
                           {authMode === 'face' ? <QrCode className="mr-2 h-5 w-5" /> : <Scan className="mr-2 h-5 w-5" />}
                           SWITCH MODE
                        </Button>
                        <Button 
                          size="lg" 
                          variant="secondary" 
                          onClick={() => { 
                            setScanResult(null); 
                            setIsProcessing(false);
                            setFeedback('SCANNER RESET');
                          }}
                          className="flex-1 h-16 rounded-2xl font-bold bg-white/5 hover:bg-white/10"
                        >
                           RESET
                        </Button>
                      </>
                   )}
                </div>
             </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 overflow-auto border-none shadow-2xl bg-black/40 backdrop-blur-xl rounded-3xl">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 py-6 px-8">
              <CardTitle className="text-[10px] uppercase tracking-[0.5em] font-black flex items-center gap-3 text-primary">
                  <History className="h-4 w-4" /> ACCESS LOGS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px]">
              <Table>
                  <TableBody>
                    {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                      <TableRow key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm text-white/80">{log.name}</TableCell>
                          <TableCell className="text-right pr-8">
                             <Badge variant="outline" className={cn("text-[9px] font-black px-2 py-0 border-none", log.method === 'FACE' ? "text-primary" : "text-blue-400")}>{log.method}</Badge>
                          </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center italic text-muted-foreground opacity-20 text-xs p-12 leading-relaxed uppercase tracking-[0.3em] font-black">
                          Gateway Idle
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

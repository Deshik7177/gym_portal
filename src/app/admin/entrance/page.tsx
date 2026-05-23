
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  QrCode,
  History,
  Cloud,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { collection, query, updateDoc, doc, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';
import { validateQrPayload } from '@/lib/qr-logic';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string>('INITIALIZING...');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastLatency, setLastLatency] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isComponentMounted = useRef(true);
  
  const isProcessingRef = useRef(false);
  const cachedMembersRef = useRef<any[]>([]);

  // Local Cache Sync - This ensures zero-latency lookup
  useEffect(() => {
    if (!db) return;
    setIsSyncing(true);
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedMembersRef.current = members;
      setIsSyncing(false);
    });
    return () => {
      unsubscribe();
      isComponentMounted.current = false;
    };
  }, [db]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 60 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
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

  useEffect(() => {
    if (isCameraActive) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [facingMode, isCameraActive]);

  const triggerAccess = useCallback((member: any, startTime: number) => {
    if (!db || !member || isProcessingRef.current) return;
    
    // Calculate total verification time (usually < 50ms)
    const latency = performance.now() - startTime;
    
    // Instant UI Feedback
    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanResult('success');
    setIdentifiedMember(member);
    setLastLatency(Math.round(latency));

    // Background Database Sync (Non-blocking)
    const memberId = member.id || member.phone;
    
    addDoc(collection(db, 'attendance'), {
      memberId: memberId,
      memberName: member.fullName,
      timestamp: serverTimestamp(),
      method: 'qr',
      latency: Math.round(latency)
    });

    updateDoc(doc(db, 'members', memberId), {
      lastCheckIn: serverTimestamp()
    });

    addDoc(collection(db, 'gateControl'), {
      command: 'OPEN',
      timestamp: serverTimestamp(),
      memberId: memberId,
      method: 'qr'
    });

    setRecentLogs(prev => [{
      name: member.fullName,
      time: new Date().toLocaleTimeString(),
      method: 'QR'
    }, ...prev].slice(0, 10));

    // Auto-reset Kiosk for next person
    setTimeout(() => {
      if (isComponentMounted.current) {
        setScanResult(null);
        setIdentifiedMember(null);
        setIsProcessing(false);
        isProcessingRef.current = false;
        setFeedback('READY');
      }
    }, 2000);
  }, [db]);

  const runScanLoop = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || isProcessingRef.current || !isComponentMounted.current) {
      scanLoopRef.current = requestAnimationFrame(runScanLoop);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      scanLoopRef.current = requestAnimationFrame(runScanLoop);
      return;
    }

    if (canvasRef.current && isComponentMounted.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (context) {
        const startTime = performance.now();

        // High-Speed Optimization: Crop to a 400x400 center square
        // This significantly reduces the area the QR engine needs to process.
        const scanArea = Math.min(video.videoWidth, video.videoHeight) * 0.7;
        const sx = (video.videoWidth - scanArea) / 2;
        const sy = (video.videoHeight - scanArea) / 2;
        
        canvas.width = 400;
        canvas.height = 400;
        
        context.imageSmoothingEnabled = false;
        context.drawImage(video, sx, sy, scanArea, scanArea, 0, 0, 400, 400);
        
        const imageData = context.getImageData(0, 0, 400, 400);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });
        
        if (code && isComponentMounted.current) {
          const validated = validateQrPayload(code.data);
          
          if (validated.valid) {
            const member = cachedMembersRef.current.find(m => 
              m.phone === validated.memberId || m.id === validated.memberId
            );

            if (member && member.status === 'active') {
              triggerAccess(member, startTime);
              return; 
            } else {
              setFeedback(member ? 'EXPIRED MEMBERSHIP' : 'INVALID PASSPORT');
            }
          }
        } else {
          setFeedback('SCANNING PASSPORT');
        }
      }
    }

    scanLoopRef.current = requestAnimationFrame(runScanLoop);
  }, [isCameraActive, triggerAccess]);

  useEffect(() => {
    if (isCameraActive) {
      scanLoopRef.current = requestAnimationFrame(runScanLoop);
    }
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [isCameraActive, runScanLoop]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-4xl font-black font-headline tracking-tighter text-white flex items-center gap-3 uppercase">
            <ShieldCheck className="h-10 w-10 text-primary" />
            Entry Portal
         </h1>
         <div className="flex items-center gap-2">
            <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">Zero-Latency Optical Engine Active</p>
            {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse border-primary/20 bg-primary/5 text-primary"><Cloud className="h-2 w-2 mr-1" /> CACHE SYNC</Badge>}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] rounded-3xl min-h-[600px]">
          <div className="absolute top-6 right-6 z-20">
            <Button size="icon" variant="outline" className="bg-black/50 backdrop-blur-md rounded-full border-white/10" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            {isCameraActive ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className={cn("w-full h-full object-cover transition-all duration-300", (scanResult === 'success' || isProcessing) ? "scale-110 blur-xl opacity-20" : "scale-100 opacity-90")} 
              />
            ) : (
              <div className="flex flex-col items-center gap-6 text-muted-foreground/10">
                <QrCode className="h-32 w-32" />
                <p className="font-headline text-2xl tracking-widest uppercase">Scanner Offline</p>
              </div>
            )}
            
            {isCameraActive && !scanResult && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
                <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xl font-headline font-bold text-white mb-2 uppercase tracking-tight text-center">{feedback}</h3>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {scanResult === 'success' && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 animate-in zoom-in duration-300">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                   <CheckCircle2 className="h-48 w-48 text-primary relative" />
                </div>
                <h2 className="text-7xl font-black font-headline text-white mb-2 tracking-tighter italic uppercase">Welcome</h2>
                <p className="text-3xl text-primary font-black uppercase tracking-tight mb-4">{identifiedMember.fullName}</p>
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-mono text-[10px] tracking-widest px-4 py-1">
                   VERIFIED IN {lastLatency}ms
                </Badge>
              </div>
            )}

            {isCameraActive && !scanResult && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div className="w-64 h-64 border-2 border-primary/40 rounded-3xl relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                 </div>
              </div>
            )}
          </div>

          <CardContent className="p-8 border-t border-white/5 bg-card/80 backdrop-blur-3xl">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mb-2">System Health</p>
                   <div className="flex items-center gap-4">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" />
                      <span className="font-mono text-xs text-white/40 uppercase tracking-widest">GATEWAY LINK ACTIVE</span>
                   </div>
                </div>
                {!isCameraActive && (
                  <Button size="lg" onClick={() => setIsCameraActive(true)} className="w-full sm:px-16 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-primary/20 uppercase">
                      Start Scanning
                  </Button>
                )}
             </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 overflow-auto border-none shadow-2xl bg-black/40 backdrop-blur-xl rounded-3xl">
            <div className="bg-white/[0.02] border-b border-white/5 py-6 px-8">
              <h2 className="text-[10px] uppercase tracking-[0.5em] font-black flex items-center gap-3 text-primary">
                  <History className="h-4 w-4" /> RECENT TRAFFIC
              </h2>
            </div>
            <CardContent className="p-0">
              <Table>
                  <TableBody>
                    {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                      <TableRow key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm text-white/80">{log.name}</TableCell>
                          <TableCell className="text-right pr-8">
                             <Badge variant="outline" className="text-[9px] font-black px-2 py-0 border-none text-primary uppercase">QR</Badge>
                          </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center italic text-muted-foreground opacity-20 text-xs p-12 leading-relaxed uppercase tracking-[0.3em] font-black">
                          IDLE
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

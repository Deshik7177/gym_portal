'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  History,
  Cloud,
  ShieldCheck,
  Loader2,
  Smartphone,
  Zap,
  Camera,
  AlertCircle
} from 'lucide-react';
import { collection, query, updateDoc, doc, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const cachedMembersRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local Cache Sync for instant lookup
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [db]);

  const triggerAccess = useCallback(async (member: any) => {
    if (!db || !member || isProcessingRef.current) return;
    
    // Lock processing
    isProcessingRef.current = true;
    
    // Immediate UI Feedback
    setScanResult('success');
    setIdentifiedMember(member);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    const memberId = member.id || member.phone;
    
    // Log to local history for immediate display
    setRecentLogs(prev => [{
      name: member.fullName,
      time: new Date().toLocaleTimeString(),
      method: 'QR'
    }, ...prev].slice(0, 10));

    // UI Auto-Reset Timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setScanResult(null);
      setIdentifiedMember(null);
      // Unlock for next scan after animation finishes
      isProcessingRef.current = false; 
    }, 3000);

    // Background operations (Non-blocking)
    Promise.all([
      addDoc(collection(db, 'attendance'), {
        memberId: memberId,
        memberName: member.fullName,
        timestamp: serverTimestamp(),
        method: 'qr',
        latency: 0
      }),
      updateDoc(doc(db, 'members', memberId), {
        lastCheckIn: serverTimestamp()
      }),
      addDoc(collection(db, 'gateControl'), {
        command: 'OPEN',
        timestamp: serverTimestamp(),
        memberId: memberId,
        method: 'qr'
      })
    ]).catch(err => {
      console.error("Background Sync Failure:", err);
    });

  }, [db]);

  const startScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    try {
      setIsInitializing(true);
      
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("No camera hardware found.");
      }

      const preferredCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
      ) || devices[0];

      await scannerRef.current.start(
        preferredCamera.id,
        {
          fps: 15,
          qrbox: { width: 320, height: 320 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        (decodedText) => {
          if (isProcessingRef.current) return;
          
          const validated = validateQrPayload(decodedText);
          if (validated.valid) {
            const member = cachedMembersRef.current.find(m => 
              m.phone === validated.memberId || m.id === validated.memberId
            );

            if (member && member.status === 'active') {
              triggerAccess(member);
            } else {
              // Denied case
              isProcessingRef.current = true;
              setScanResult('failure');
              setTimeout(() => {
                setScanResult(null);
                isProcessingRef.current = false;
              }, 2000);
            }
          }
        },
        () => {} 
      );
      
      setIsCameraActive(true);
      setIsInitializing(false);
    } catch (err: any) {
      console.error("Camera start failure:", err);
      toast({ 
        variant: "destructive", 
        title: "Optical Pipeline Error", 
        description: err.message || "Failed to initialize camera sensor." 
      });
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (e) {
      console.warn("Scanner shutdown warning:", e);
    } finally {
      setIsCameraActive(false);
      setTorchOn(false);
      isProcessingRef.current = false;
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const state = !torchOn;
      const track = (scannerRef.current as any).getRunningTrack();
      if (track && typeof track.applyConstraints === 'function') {
        await track.applyConstraints({ advanced: [{ torch: state }] });
        setTorchOn(state);
      }
    } catch (e) {
      toast({ title: "Flash Control Not Available" });
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-2">
         <h1 className="text-4xl font-black font-headline tracking-tighter text-white flex items-center gap-3 uppercase">
            <ShieldCheck className="h-10 w-10 text-primary" />
            Entry Portal
         </h1>
         <div className="flex items-center gap-2">
            <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">High-Performance Optical Pipeline Active</p>
            {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse border-primary/20 bg-primary/5 text-primary"><Cloud className="h-2 w-2 mr-1" /> SYNCING CACHE</Badge>}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] rounded-3xl min-h-[600px]">
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            {isCameraActive && (
              <Button size="icon" variant="outline" className={cn("bg-black/50 backdrop-blur-md rounded-full border-white/10", torchOn && "text-primary border-primary")} onClick={toggleTorch}>
                  <Zap className={cn("h-4 w-4", torchOn && "fill-primary")} />
              </Button>
            )}
          </div>

          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <div id="qr-reader" className="w-full h-full" />
            
            {!isCameraActive && !isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-muted-foreground/10 bg-zinc-950">
                <Smartphone className="h-32 w-32" />
                <p className="font-headline text-2xl tracking-widest uppercase">Scanner Offline</p>
              </div>
            )}

            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl z-50">
                 <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest text-primary/60">Enumerating Devices...</p>
              </div>
            )}

            {scanResult === 'success' && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-black/95 backdrop-blur-3xl">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                   <CheckCircle2 className="h-48 w-48 text-primary relative" />
                </div>
                <h2 className="text-7xl font-black font-headline text-white mb-2 tracking-tighter italic uppercase">Welcome</h2>
                <p className="text-3xl text-primary font-black uppercase tracking-tight mb-4">{identifiedMember.fullName}</p>
                <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-mono text-[10px] tracking-widest px-4 py-1">
                   VERIFIED INSTANTLY
                </Badge>
              </div>
            )}

            {scanResult === 'failure' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-destructive/95 backdrop-blur-3xl">
                <h2 className="text-7xl font-black font-headline text-white mb-2 tracking-tighter italic uppercase">Denied</h2>
                <p className="text-xl text-white font-black uppercase tracking-widest opacity-60">Subscription Lapsed</p>
              </div>
            )}
          </div>

          <CardContent className="p-8 border-t border-white/5 bg-card/80 backdrop-blur-3xl">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mb-2">Sensor Status</p>
                      <div className="flex items-center gap-4">
                         <div className={cn("h-3 w-3 rounded-full", isCameraActive ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" : "bg-zinc-800")} />
                         <span className="font-mono text-xs text-white/40 uppercase tracking-widest">
                           {isCameraActive ? 'OPTICAL ENGINE: LIVE' : 'SYSTEM: STANDBY'}
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex gap-4 w-full sm:w-auto">
                  {!isCameraActive ? (
                    <Button size="lg" onClick={startScanner} disabled={isInitializing} className="flex-1 sm:px-12 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-primary/20 uppercase">
                        {isInitializing ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Camera className="mr-3 h-6 w-6" />}
                        Initialize Scanner
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={stopScanner} 
                      className="flex-1 sm:px-16 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-white/5 bg-white/5 text-white hover:bg-white/10 uppercase"
                    >
                      Disable Scanner
                    </Button>
                  )}
                </div>
             </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 overflow-auto border-none shadow-2xl bg-black/40 backdrop-blur-xl rounded-3xl">
            <div className="bg-white/[0.02] border-b border-white/5 py-6 px-8 flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.5em] font-black flex items-center gap-3 text-primary">
                  <History className="h-4 w-4" /> LIVE TRAFFIC
              </h2>
              <Badge variant="outline" className="h-5 text-[8px] border-white/10 opacity-40 uppercase">REAL-TIME</Badge>
            </div>
            <CardContent className="p-0">
              <Table>
                  <TableBody>
                    {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                      <TableRow key={i} className="border-b border-white/5 hover:bg-white/[0.02] animate-in slide-in-from-left-2">
                          <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm text-white/80">{log.name}</TableCell>
                          <TableCell className="text-right pr-8">
                             <Badge variant="outline" className="text-[9px] font-black px-2 py-0 border-none text-primary uppercase tracking-tighter">QR OK</Badge>
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
          
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
             <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
             <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">System Tip</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">The camera will automatically detect your <b>Passport QR</b>. Ensure your brightness is up and the code is centered.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

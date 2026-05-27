
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
  AlertCircle,
  Scan,
  UserCheck,
  UserPlus,
  Phone
} from 'lucide-react';
import { collection, query, updateDoc, doc, serverTimestamp, onSnapshot, addDoc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { cn } from '@/lib/utils';
import { validateQrPayload } from '@/lib/qr-logic';
import { isToday } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaceScanner } from '@/components/FaceScanner';
import { FaceEnrollment } from '@/components/FaceEnrollment';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [authMode, setAuthMode] = useState<'qr' | 'face' | 'enroll'>('qr');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Enrollment states
  const [enrollPhone, setEnrollPhone] = useState('');
  const [memberToEnroll, setMemberToEnroll] = useState<any>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const cachedMembersRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scanResult) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setScanResult(null);
        setIdentifiedMember(null);
        isProcessingRef.current = false;
      }, 3500); 
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scanResult]);

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
    };
  }, [db]);

  const triggerAccess = useCallback(async (member: any, method: 'qr' | 'face' | 'manual') => {
    if (!db || !member || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIdentifiedMember(member);
    setScanResult('success');
    
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    const memberId = member.id || member.phone;
    
    setRecentLogs(prev => [{
      name: member.fullName,
      time: new Date().toLocaleTimeString(),
      method: method.toUpperCase()
    }, ...prev].slice(0, 10));

    try {
      // Logic: Log attendance once per day, but always allow entry
      const lastCheckInDate = member.lastCheckIn?.seconds 
        ? new Date(member.lastCheckIn.seconds * 1000) 
        : null;

      const alreadyLoggedToday = lastCheckInDate && isToday(lastCheckInDate);

      const tasks: Promise<any>[] = [
        // Always update the member's last seen status
        updateDoc(doc(db, 'members', memberId), {
          lastCheckIn: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        // Always signal hardware gate via real-time queue
        addDoc(collection(db, 'gateControl'), {
          command: 'OPEN',
          timestamp: serverTimestamp(),
          memberId: memberId,
          method: method
        })
      ];

      // ONLY add to historical attendance ledger if it's the first time today
      if (!alreadyLoggedToday) {
        tasks.push(addDoc(collection(db, 'attendance'), {
          memberId: memberId,
          memberName: member.fullName,
          timestamp: serverTimestamp(),
          method: method,
          latency: 0
        }));
      }

      await Promise.all(tasks);
    } catch (err) {
      console.warn("Background Sync Warning:", err);
    }
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
        } as any,
        (decodedText) => {
          if (isProcessingRef.current) return;
          
          const validated = validateQrPayload(decodedText);
          if (validated.valid) {
            const member = cachedMembersRef.current.find(m => 
              m.phone === validated.memberId || m.id === validated.memberId
            );

            if (member && member.status === 'active') {
              triggerAccess(member, 'qr');
            } else {
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

  const handleAuthModeChange = (val: string) => {
    stopScanner();
    setAuthMode(val as any);
    setMemberToEnroll(null);
    setEnrollPhone('');
    
    if (val === 'face') {
        setIsCameraActive(true);
    } else {
        setIsCameraActive(false);
    }
  };

  const handleLookupForEnroll = async () => {
    if (!db || !enrollPhone) return;
    setIsInitializing(true);
    try {
      const docRef = doc(db, 'members', enrollPhone);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setMemberToEnroll({ id: snap.id, ...snap.data() });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Member Not Found", 
          description: "Please register the member in the admin portal first." 
        });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Lookup Failed" });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFaceEnrolled = async (embedding: number[]) => {
    if (!db || !memberToEnroll) return;
    setIsEnrolling(true);
    try {
      await updateDoc(doc(db, 'members', memberToEnroll.id), {
        faceEmbedding: embedding,
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: "Face ID Enrolled", 
        description: `Biometric identity linked to ${memberToEnroll.fullName}.` 
      });
      setAuthMode('face');
    } catch (e) {
      toast({ variant: "destructive", title: "Enrollment Failed" });
    } finally {
      setIsEnrolling(false);
      setMemberToEnroll(null);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div className="flex flex-col gap-2">
           <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3 uppercase">
              <ShieldCheck className="h-10 w-10 text-primary" />
              Entry Portal
           </h1>
           <div className="flex items-center gap-2">
              <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">Unified Biometric Pipeline Active</p>
              {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse border-primary/20 bg-primary/5 text-primary"><Cloud className="h-2 w-2 mr-1" /> SYNCING CACHE</Badge>}
           </div>
        </div>

        <Tabs value={authMode} onValueChange={handleAuthModeChange} className="bg-muted p-1 rounded-xl border border-border shadow-sm">
            <TabsList className="bg-transparent gap-1 h-10">
                <TabsTrigger value="qr" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-widest px-6 rounded-lg transition-all">
                    <Scan className="h-3.5 w-3.5 mr-2" /> QR Passport
                </TabsTrigger>
                <TabsTrigger value="face" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-widest px-6 rounded-lg transition-all">
                    <UserCheck className="h-3.5 w-3.5 mr-2" /> Face ID
                </TabsTrigger>
                <TabsTrigger value="enroll" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-black text-[10px] uppercase tracking-widest px-6 rounded-lg transition-all">
                    <UserPlus className="h-3.5 w-3.5 mr-2" /> Enrollment
                </TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-card border-border shadow-2xl rounded-3xl min-h-[600px]">
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            {isCameraActive && authMode === 'qr' && (
              <Button size="icon" variant="outline" className={cn("bg-background/50 backdrop-blur-md rounded-full border-border", torchOn && "text-primary border-primary")} onClick={toggleTorch}>
                  <Zap className={cn("h-4 w-4", torchOn && "fill-primary")} />
              </Button>
            )}
          </div>

          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {authMode === 'qr' ? (
                <>
                    <div id="qr-reader" className="w-full h-full" />
                    {!isCameraActive && !isInitializing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-muted-foreground/10 bg-muted/20">
                            <Smartphone className="h-32 w-32" />
                            <p className="font-headline text-2xl tracking-widest uppercase">Scanner Offline</p>
                        </div>
                    )}
                </>
            ) : authMode === 'face' ? (
                <FaceScanner 
                    members={cachedMembersRef.current} 
                    onMatch={(member) => triggerAccess(member, 'face')} 
                    isActive={authMode === 'face'}
                />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background p-12">
                {!memberToEnroll ? (
                  <div className="w-full max-w-md space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                        <UserPlus className="h-8 w-8 text-accent" />
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic text-foreground">New Face ID Link</h2>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-40">Identify member to begin biometric enrollment</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Enter Registered Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            value={enrollPhone}
                            onChange={(e) => setEnrollPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLookupForEnroll()}
                            placeholder="Mobile ID" 
                            className="pl-12 h-14 bg-muted border-border text-xl font-bold rounded-xl"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleLookupForEnroll} 
                        disabled={isInitializing || !enrollPhone}
                        className="w-full h-14 rounded-xl bg-accent text-accent-foreground font-black uppercase tracking-widest shadow-xl shadow-accent/20"
                      >
                        {isInitializing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Member Details"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FaceEnrollment 
                    onComplete={handleFaceEnrolled} 
                    onCancel={() => setMemberToEnroll(null)} 
                  />
                )}
              </div>
            )}

            {isInitializing && authMode === 'qr' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl z-50">
                 <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest text-primary/60">Enumerating Devices...</p>
              </div>
            )}

            {scanResult === 'success' && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-background/95 backdrop-blur-3xl">
                <div className="relative mb-8">
                   <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                   <CheckCircle2 className="h-48 w-48 text-primary relative" />
                </div>
                <h2 className="text-7xl font-black font-headline text-foreground mb-2 tracking-tighter italic uppercase">Welcome</h2>
                <p className="text-3xl text-primary font-black uppercase tracking-tight mb-4">{identifiedMember.fullName}</p>
                <Badge variant="outline" className="bg-muted border-border text-foreground font-mono text-[10px] tracking-widest px-4 py-1 uppercase">
                   Identity Verified: {authMode.toUpperCase()}
                </Badge>
              </div>
            )}

            {scanResult === 'failure' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-destructive/95 backdrop-blur-3xl">
                <h2 className="text-7xl font-black font-headline text-destructive-foreground mb-2 tracking-tighter italic uppercase">Denied</h2>
                <p className="text-xl text-destructive-foreground font-black uppercase tracking-widest opacity-60">Access Restricted</p>
              </div>
            )}
          </div>

          <CardContent className="p-8 border-t border-border bg-card">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                  <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] mb-2">Sensor Status</p>
                      <div className="flex items-center gap-4">
                          <div className={cn("h-3 w-3 rounded-full", isCameraActive ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]" : "bg-muted")} />
                          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                          {isCameraActive ? 'OPTICAL ENGINE: LIVE' : 'SYSTEM: STANDBY'}
                          </span>
                      </div>
                  </div>
                  </div>
                  
                  <div className="flex gap-4 w-full sm:w-auto">
                  {!isCameraActive ? (
                      <Button size="lg" onClick={startScanner} disabled={isInitializing} className="flex-1 sm:px-12 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-primary/20 uppercase">
                          {isInitializing ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <Camera className="mr-3 h-6 w-6" />}
                          Initialize {authMode === 'qr' ? 'QR' : 'Face'}
                      </Button>
                  ) : (
                      <Button 
                      size="lg" 
                      onClick={stopScanner} 
                      className="flex-1 sm:px-16 font-black h-16 text-xl rounded-2xl shadow-2xl shadow-muted/5 bg-muted text-foreground hover:bg-muted/80 uppercase"
                      >
                      Stop Scanner
                      </Button>
                  )}
                  </div>
              </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 overflow-auto border-border shadow-2xl bg-card rounded-3xl">
            <div className="bg-muted/50 border-b border-border py-6 px-8 flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.5em] font-black flex items-center gap-3 text-primary">
                  <History className="h-4 w-4" /> LIVE TRAFFIC
              </h2>
              <Badge variant="outline" className="h-5 text-[8px] border-border opacity-40 uppercase">REAL-TIME</Badge>
            </div>
            <CardContent className="p-0">
              <Table>
                  <TableBody>
                    {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                      <TableRow key={i} className="border-b border-border hover:bg-muted transition-colors animate-in slide-in-from-left-2">
                          <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm text-foreground">{log.name}</TableCell>
                          <TableCell className="text-right pr-8">
                             <Badge variant="outline" className="text-[9px] font-black px-2 py-0 border-none text-primary uppercase tracking-tighter">{log.method} OK</Badge>
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
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {authMode === 'qr' 
                        ? "Ensure your screen brightness is high and the code is centered."
                        : authMode === 'face'
                        ? "Look directly at the center oval for Face ID verification."
                        : "Enter the member's mobile number to begin biometric link."
                    }
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

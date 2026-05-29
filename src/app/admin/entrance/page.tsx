
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Phone,
  Link2,
  ShieldX,
  CheckCircle
} from 'lucide-react';
import { collection, query, updateDoc, doc, setDoc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { cn } from '@/lib/utils';
import { validateQrPayload } from '@/lib/qr-logic';
import { format, isToday, parseISO, isAfter, startOfDay } from 'date-fns';

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
  const [scanResult, setScanResult] = useState<'success' | 'failure' | 'expired' | 'not_started' | 'not_found' | 'already_verified' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [enrollPhone, setEnrollPhone] = useState('');
  const [memberToEnroll, setMemberToEnroll] = useState<any>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const cachedMembersRef = useRef<any[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const today = useMemo(() => startOfDay(new Date()), []);

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
    const q = collection(db, 'members');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cachedMembersRef.current = members;
      setIsSyncing(false);
    });
    return () => {
      unsubscribe();
    };
  }, [db]);

  const activeValidMembers = useMemo(() => {
    return cachedMembersRef.current.filter(m => {
      const expiryDate = m.endDate ? parseISO(m.endDate) : null;
      const startDate = m.startDate ? parseISO(m.startDate) : null;
      
      const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
      const hasStarted = startDate ? !isAfter(startDate, today) : true;
      
      return hasStarted && !isExpired;
    });
  }, [cachedMembersRef.current, today]);

  const triggerAccess = useCallback(async (member: any, method: 'qr' | 'face' | 'manual') => {
    if (!db || !member || isProcessingRef.current) return;
    
    const expiryDate = member.endDate ? parseISO(member.endDate) : null;
    const startDate = member.startDate ? parseISO(member.startDate) : null;

    const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
    const notStarted = startDate ? isAfter(startDate, today) : false;

    if (isExpired || notStarted) {
        isProcessingRef.current = true;
        setScanResult(isExpired ? 'expired' : 'not_started');
        setIdentifiedMember(member);
        return;
    }

    // Check if already checked in today for better UI feedback
    const lastCheckIn = member.lastCheckIn?.seconds ? new Date(member.lastCheckIn.seconds * 1000) : null;
    const alreadyVerified = lastCheckIn ? isToday(lastCheckIn) : false;

    isProcessingRef.current = true;
    setIdentifiedMember(member);
    setScanResult(alreadyVerified ? 'already_verified' : 'success');
    
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    const memberId = member.phone || member.id;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceDocId = `${memberId}_${todayStr}`;
    const expiresAt = Date.now() + 5000;

    setRecentLogs(prev => [{
      name: member.fullName,
      time: new Date().toLocaleTimeString(),
      method: method.toUpperCase()
    }, ...prev].slice(0, 10));

    try {
      const tasks: Promise<any>[] = [
        updateDoc(doc(db, 'members', memberId), {
          lastCheckIn: serverTimestamp(),
          updatedAt: serverTimestamp()
        }),
        setDoc(doc(db, 'gateControl', 'latest'), {
          command: 'OPEN',
          status: 'pending',
          timestamp: serverTimestamp(),
          expiresAt: expiresAt,
          memberId: memberId,
          method: method
        }),
        // USE DETERMINISTIC ID TO PREVENT DUPLICATE ROWS
        setDoc(doc(db, 'attendance', attendanceDocId), {
          memberId: memberId,
          memberName: member.fullName,
          timestamp: serverTimestamp(),
          method: method,
          latency: 0
        }, { merge: true })
      ];

      await Promise.all(tasks);
    } catch (err) {
      console.warn("Gate Dispatch Warning:", err);
    }
  }, [db, today]);

  const startScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    try {
      setIsInitializing(true);
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) throw new Error("No camera hardware found.");

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
            const member = cachedMembersRef.current.find(m => m.phone === validated.memberId || m.id === validated.memberId);
            if (member) {
              triggerAccess(member, 'qr');
            } else {
              isProcessingRef.current = true;
              setScanResult('not_found');
            }
          }
        },
        () => {} 
      );
      
      setIsCameraActive(true);
      setIsInitializing(false);
    } catch (err: any) {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
    } catch (e) {
    } finally {
      setIsCameraActive(false);
      isProcessingRef.current = false;
    }
  };

  const handleAuthModeChange = (val: string) => {
    stopScanner();
    setAuthMode(val as any);
    setMemberToEnroll(null);
    setEnrollPhone('');
    if (val === 'face') setIsCameraActive(true);
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
        toast({ variant: "destructive", title: "Member Not Found" });
      }
    } catch (e) {
    } finally {
      setIsInitializing(false);
    }
  };

  const handleFaceEnrolled = async (embedding: number[]) => {
    if (!db || !memberToEnroll) return;
    setIsEnrolling(true);
    try {
      await updateDoc(doc(db, 'members', memberToEnroll.phone || memberToEnroll.id), {
        faceEmbedding: embedding,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Face ID Enrolled" });
      setAuthMode('face');
    } catch (e) {
    } finally {
      setIsEnrolling(false);
      setMemberToEnroll(null);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
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
              <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">Biometric Pipeline Active</p>
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
                    members={activeValidMembers} 
                    onMatch={(member) => triggerAccess(member, 'face')} 
                    isActive={authMode === 'face'}
                />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background p-12">
                {!memberToEnroll ? (
                  <div className="w-full max-md space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                        <UserPlus className="h-8 w-8 text-accent" />
                      </div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic text-foreground">New Face ID Link</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest opacity-40">Enter Registered Mobile Number</Label>
                        <Input value={enrollPhone} onChange={(e) => setEnrollPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLookupForEnroll()} placeholder="Mobile ID" className="h-14 bg-muted border-border text-xl font-bold rounded-xl" />
                      </div>
                      <Button onClick={handleLookupForEnroll} disabled={isInitializing || !enrollPhone} className="w-full h-14 rounded-xl bg-accent font-black uppercase tracking-widest">Verify Member</Button>
                    </div>
                  </div>
                ) : (
                  <FaceEnrollment onComplete={handleFaceEnrolled} onCancel={() => setMemberToEnroll(null)} />
                )}
              </div>
            )}

            {(scanResult === 'success' || scanResult === 'already_verified') && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-background/95 backdrop-blur-3xl text-center px-6">
                {scanResult === 'already_verified' ? <CheckCircle className="h-48 w-48 text-primary mb-8 opacity-60" /> : <CheckCircle2 className="h-48 w-48 text-primary mb-8" />}
                <h2 className="text-7xl font-black font-headline text-foreground mb-2 tracking-tighter italic uppercase">
                  {scanResult === 'already_verified' ? 'Identified' : 'Welcome'}
                </h2>
                <p className="text-3xl text-primary font-black uppercase tracking-tight mb-4">{identifiedMember.fullName}</p>
                <div className="flex items-center gap-2 text-green-500 animate-pulse mt-2">
                    <Link2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {scanResult === 'already_verified' ? 'Already Verified Today' : 'Secure Command Dispatched'}
                    </span>
                </div>
              </div>
            )}

            {(scanResult === 'failure' || scanResult === 'expired' || scanResult === 'not_started' || scanResult === 'not_found') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in duration-300 bg-destructive/95 backdrop-blur-3xl text-center px-6">
                <ShieldX className="h-48 w-48 text-destructive-foreground mb-8" />
                <h2 className="text-7xl font-black font-headline text-destructive-foreground mb-2 tracking-tighter italic uppercase">Denied</h2>
                <p className="text-3xl text-destructive-foreground font-black uppercase tracking-widest">
                    {scanResult === 'expired' ? 'Subscription Expired' : scanResult === 'not_started' ? 'Access Not Yet Active' : scanResult === 'not_found' ? 'Member Not Found' : 'Access Restricted'}
                </p>
                {identifiedMember && <p className="text-xl text-destructive-foreground/60 font-bold mt-2">{identifiedMember.fullName}</p>}
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
                          Initialize {authMode === 'qr' ? 'QR' : 'Face'}
                      </Button>
                  ) : (
                      <Button size="lg" onClick={stopScanner} className="flex-1 sm:px-16 font-black h-16 text-xl rounded-2xl bg-muted text-foreground uppercase">
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
            </div>
            <CardContent className="p-0">
              <Table>
                  <TableBody>
                    {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                      <TableRow key={i} className="border-b border-border hover:bg-muted transition-colors">
                          <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm text-foreground">{log.name}</TableCell>
                          <TableCell className="text-right pr-8">
                             <Badge variant="outline" className="text-[9px] font-black border-none text-primary uppercase">{log.method} OK</Badge>
                          </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-64 text-center italic text-muted-foreground opacity-20 text-xs uppercase tracking-[0.3em] font-black">IDLE</TableCell>
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

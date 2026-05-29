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
  CheckCircle,
  Search,
  User
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

  const [enrollSearch, setEnrollSearch] = useState('');
  const [memberToEnroll, setMemberToEnroll] = useState<any>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
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
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
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
    return () => unsubscribe();
  }, [db]);

  const triggerAccess = useCallback(async (member: any, method: 'qr' | 'face' | 'manual') => {
    if (!db || !member || isProcessingRef.current) return;
    
    const expiryDate = member.endDate ? parseISO(member.endDate) : null;
    const isExpired = expiryDate ? isAfter(today, expiryDate) : false;

    if (isExpired) {
        isProcessingRef.current = true;
        setScanResult('expired');
        setIdentifiedMember(member);
        return;
    }

    const lastCheckIn = member.lastCheckIn?.seconds ? new Date(member.lastCheckIn.seconds * 1000) : null;
    const alreadyVerified = lastCheckIn ? isToday(lastCheckIn) : false;

    isProcessingRef.current = true;
    setIdentifiedMember(member);
    setScanResult(alreadyVerified ? 'already_verified' : 'success');
    
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
      await setDoc(doc(db, 'gateControl', 'latest'), {
        command: 'OPEN',
        status: 'pending',
        timestamp: serverTimestamp(),
        expiresAt: expiresAt,
        memberId: memberId,
        method: method
      });

      if (!alreadyVerified) {
        await updateDoc(doc(db, 'members', memberId), {
          lastCheckIn: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await setDoc(doc(db, 'attendance', attendanceDocId), {
          memberId: memberId,
          memberName: member.fullName,
          timestamp: serverTimestamp(),
          method: method,
          latency: 0
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Gate Sync Fault:", err);
    }
  }, [db, today]);

  const handleLookupMember = async () => {
    if (!enrollSearch || !db) return;
    setIsSearchingMember(true);
    try {
      const docRef = doc(db, 'members', enrollSearch);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setMemberToEnroll({ id: snap.id, ...snap.data() });
      } else {
        toast({ variant: "destructive", title: "Member not found", description: "Verify phone number." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Lookup failed" });
    } finally {
      setIsSearchingMember(false);
    }
  };

  const startScanner = async () => {
    if (authMode === 'face') return; // FaceScanner handles itself
    if (authMode === 'enroll') return;

    if (!scannerRef.current) scannerRef.current = new Html5Qrcode('qr-reader');
    try {
      setIsInitializing(true);
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) throw new Error("Camera missing");

      await scannerRef.current.start(
        devices[0].id,
        { fps: 15, qrbox: 250, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] } as any,
        (decodedText) => {
          if (isProcessingRef.current) return;
          const validated = validateQrPayload(decodedText);
          if (validated.valid) {
            const member = cachedMembersRef.current.find(m => m.phone === validated.memberId || m.id === validated.memberId);
            if (member) triggerAccess(member, 'qr');
            else { isProcessingRef.current = true; setScanResult('not_found'); }
          }
        },
        () => {} 
      );
      setIsCameraActive(true);
      setIsInitializing(false);
    } catch (err) {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    try { if (scannerRef.current?.isScanning) await scannerRef.current.stop(); } 
    catch (e) {} finally { setIsCameraActive(false); isProcessingRef.current = false; }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div className="flex flex-col gap-2">
           <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground flex items-center gap-3 uppercase">
              <ShieldCheck className="h-10 w-10 text-primary" /> ENTRY PORTAL
           </h1>
           <div className="flex items-center gap-2">
              <p className="text-muted-foreground italic text-xs uppercase tracking-widest font-bold opacity-60">Biometric Sensor Active</p>
              {isSyncing && <Badge variant="outline" className="h-5 text-[9px] animate-pulse">SYNCING CACHE</Badge>}
           </div>
        </div>
        <Tabs value={authMode} onValueChange={(v) => { 
          stopScanner(); 
          setAuthMode(v as any); 
          setMemberToEnroll(null);
          setEnrollSearch('');
          if (v === 'face') setIsCameraActive(true); 
          else setIsCameraActive(false);
        }} className="bg-muted p-1 rounded-xl">
            <TabsList className="bg-transparent gap-1">
                <TabsTrigger value="qr" className="data-[state=active]:bg-primary font-black text-[10px] uppercase px-6">QR PASSPORT</TabsTrigger>
                <TabsTrigger value="face" className="data-[state=active]:bg-primary font-black text-[10px] uppercase px-6">FACE ID</TabsTrigger>
                <TabsTrigger value="enroll" className="data-[state=active]:bg-accent font-black text-[10px] uppercase px-6">ENROLLMENT</TabsTrigger>
            </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 overflow-hidden relative bg-black min-h-[600px] flex flex-col border-none shadow-2xl rounded-[2rem]">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {authMode === 'qr' && <div id="qr-reader" className="w-full h-full" />}
            
            {authMode === 'face' && (
              <FaceScanner members={cachedMembersRef.current} onMatch={(m) => triggerAccess(m, 'face')} isActive={authMode === 'face'} />
            )}
            
            {authMode === 'enroll' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-background/5 p-8">
                {!memberToEnroll ? (
                  <div className="max-w-md w-full space-y-6 animate-in fade-in zoom-in">
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Biometric Registration</h2>
                      <p className="text-muted-foreground text-sm">Enter the member's phone number to begin face enrollment.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Member Phone..." 
                          className="pl-10 h-14 bg-black/20 border-white/10 rounded-xl"
                          value={enrollSearch}
                          onChange={(e) => setEnrollSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLookupMember()}
                        />
                      </div>
                      <Button onClick={handleLookupMember} disabled={isSearchingMember} className="h-14 w-14 rounded-xl">
                        {isSearchingMember ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FaceEnrollment 
                    onComplete={async (e) => {
                      setIsEnrolling(true);
                      try {
                        await updateDoc(doc(db!, 'members', memberToEnroll.phone), { 
                          faceEmbedding: e,
                          updatedAt: serverTimestamp()
                        });
                        toast({ title: "Face Enrolled Successfully", description: `Linked to ${memberToEnroll.fullName}` });
                        setAuthMode('face');
                      } catch (err) {
                        toast({ variant: "destructive", title: "Enrollment Failed" });
                      } finally {
                        setIsEnrolling(false);
                        setMemberToEnroll(null);
                      }
                    }} 
                    onCancel={() => setMemberToEnroll(null)} 
                  />
                )}
              </div>
            )}
            
            {(scanResult === 'success' || scanResult === 'already_verified') && identifiedMember && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in bg-background/95 backdrop-blur-3xl text-center px-6">
                {scanResult === 'already_verified' ? <CheckCircle className="h-48 w-48 text-primary/60 mb-8" /> : <CheckCircle2 className="h-48 w-48 text-primary mb-8" />}
                <h2 className="text-7xl font-black font-headline text-foreground mb-2 tracking-tighter uppercase italic">{scanResult === 'already_verified' ? 'IDENTIFIED' : 'WELCOME'}</h2>
                <p className="text-3xl text-primary font-black uppercase tracking-tight mb-4">{identifiedMember.fullName}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500">{scanResult === 'already_verified' ? 'ALREADY VERIFIED TODAY' : 'GATE COMMAND DISPATCHED'}</span>
              </div>
            )}

            {scanResult === 'expired' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[100] animate-in zoom-in bg-destructive/95 backdrop-blur-3xl text-center px-6">
                <ShieldX className="h-48 w-48 text-destructive-foreground mb-8" />
                <h2 className="text-7xl font-black font-headline text-destructive-foreground mb-2 tracking-tighter uppercase italic">DENIED</h2>
                <p className="text-3xl text-destructive-foreground font-black uppercase tracking-widest">SUBSCRIPTION EXPIRED</p>
                <p className="text-xl text-destructive-foreground/60 font-bold mt-2">{identifiedMember?.fullName}</p>
              </div>
            )}
          </div>
          {authMode !== 'enroll' && (
            <CardContent className="p-8 border-t bg-card flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn("h-3 w-3 rounded-full", isCameraActive ? "bg-green-500 animate-pulse" : "bg-muted")} />
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{isCameraActive ? 'ENGINE: LIVE' : 'ENGINE: STANDBY'}</span>
                </div>
                {authMode === 'qr' && (
                  <Button size="lg" onClick={isCameraActive ? stopScanner : startScanner} className="font-black uppercase tracking-widest h-16 px-12 rounded-2xl shadow-xl shadow-primary/20">
                    {isCameraActive ? 'STOP' : 'START'} SCANNER
                  </Button>
                )}
            </CardContent>
          )}
        </Card>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 overflow-auto bg-card rounded-3xl border-border shadow-xl">
            <div className="bg-muted/50 border-b py-6 px-8 flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.5em] font-black text-primary">LIVE TRAFFIC</h2>
              <History className="h-4 w-4 opacity-20" />
            </div>
            <Table>
                <TableBody>
                  {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                    <TableRow key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="text-[10px] font-mono opacity-30 pl-8">{log.time}</TableCell>
                        <TableCell className="font-bold text-sm">{log.name}</TableCell>
                        <TableCell className="text-right pr-8"><Badge variant="outline" className="text-[9px] font-black border-none text-primary bg-primary/5 uppercase">{log.method} OK</Badge></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="h-64 text-center italic opacity-20 text-xs uppercase font-black">IDLE</TableCell></TableRow>}
                </TableBody>
            </Table>
          </Card>
          
          <Card className="p-6 bg-primary/5 border-primary/10 rounded-3xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Cloud Engine</p>
              <p className="text-sm font-bold">Relay Sync Active</p>
            </div>
            <Badge className="bg-green-500/20 text-green-500 border-none h-6 text-[9px] font-black">STABLE</Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  WifiOff, 
  User, 
  History,
  AlertCircle,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { loadFaceModels, generateEmbedding, findBestMatch } from '@/lib/face-logic';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SmartEntrancePage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

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
      toast({ variant: "destructive", title: "Camera Error", description: "Access required for kiosk." });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const triggerVerification = useCallback(async () => {
    if (!modelsReady || isProcessing || scanResult || !videoRef.current || !db) return;

    setIsProcessing(true);
    
    try {
      // 1. Generate local embedding from video frame
      const liveEmbedding = await generateEmbedding(videoRef.current);
      if (!liveEmbedding) {
        setIsProcessing(false);
        return;
      }

      // 2. Fetch members (uses local cache if offline)
      const q = query(collection(db, 'members'), where('status', '==', 'active'), limit(50));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Compare locally (CPU bound, 0 cost)
      const { bestMatch, confidence } = findBestMatch(liveEmbedding, members);

      if (bestMatch && confidence > 0.8) {
        const memberRef = doc(db, 'members', bestMatch.id);
        const updateData = { lastCheckIn: serverTimestamp(), updatedAt: serverTimestamp() };

        // Non-blocking write
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
      console.error('Kiosk inference error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [modelsReady, isProcessing, scanResult, db]);

  useEffect(() => {
    if (isKioskActive) {
      loopRef.current = setInterval(() => {
        if (!isProcessing && !scanResult) triggerVerification();
      }, 5000);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
    }
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [isKioskActive, isProcessing, scanResult, triggerVerification]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-[calc(100vh-140px)]">
      <Card className="lg:col-span-8 overflow-hidden flex flex-col relative bg-black border-none shadow-2xl">
        <div className="absolute top-4 left-4 z-20 flex gap-2">
           <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-primary font-mono border-primary/20">
              <Cpu className="h-3 w-3 mr-1" /> LOCAL-AI ENABLED
           </Badge>
           {isKioskActive && (
             <Badge className="bg-green-500 animate-pulse">KIOSK ACTIVE</Badge>
           )}
        </div>

        <div className="absolute top-4 right-4 z-20 flex gap-2">
           <Button size="icon" variant="outline" className="bg-background/50 rounded-full" onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}>
              <RefreshCw className="h-4 w-4" />
           </Button>
        </div>

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
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 backdrop-blur-[2px]">
                <div className="w-48 h-48 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-headline text-xl tracking-widest animate-pulse">ANALYZING FACE...</p>
            </div>
          )}

          {scanResult === 'success' && identifiedMember && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-600/20 animate-in zoom-in duration-300">
               <CheckCircle2 className="h-48 w-48 text-green-500 mb-6 drop-shadow-2xl" />
               <h2 className="text-6xl font-headline font-bold text-white mb-2">WELCOME</h2>
               <p className="text-4xl text-green-300 font-black uppercase tracking-widest text-center px-4">
                 {identifiedMember.fullName}
               </p>
               <div className="mt-8 bg-green-500 text-white px-8 py-2 rounded-full font-bold shadow-lg">
                  ACCESS GRANTED
               </div>
            </div>
          )}

          {scanResult === 'failure' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/10">
               <XCircle className="h-32 w-32 text-destructive mb-4" />
               <p className="text-white font-headline text-2xl uppercase">Not Recognized</p>
            </div>
          )}
        </div>

        <CardContent className="p-4 border-t bg-card/50">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entrance Terminal</p>
                 <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-orange-500")} />
                    <span className="text-[10px] opacity-60 uppercase">{isOnline ? 'Cloud Synced' : 'Local Mode'}</span>
                 </div>
              </div>
              <Button 
                  size="lg"
                  variant={isKioskActive ? "destructive" : "default"}
                  onClick={() => setIsKioskActive(!isKioskActive)}
                  className="px-10 font-bold h-12"
              >
                  {isKioskActive ? "Stop Kiosk" : "Start Kiosk"}
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4 px-6">
            <CardTitle className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
               <History className="h-4 w-4 text-primary" /> Access Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
             <Table>
                <TableBody>
                   {recentLogs.length > 0 ? (
                     recentLogs.map((log, i) => (
                       <TableRow key={i} className="animate-in slide-in-from-right duration-300">
                          <TableCell className="text-[10px] font-mono opacity-50">{log.time}</TableCell>
                          <TableCell className="font-bold text-sm">{log.name}</TableCell>
                          <TableCell className="text-right">
                             <Badge variant="outline" className="text-[9px] h-5 border-green-500/20 text-green-500">
                                {log.confidence}
                             </Badge>
                          </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow><TableCell colSpan={3} className="h-40 text-center italic text-muted-foreground opacity-40">Awaiting members...</TableCell></TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        <Card className="bg-primary/5">
           <CardHeader className="py-4 px-6 border-b border-primary/10">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2">
                 <AlertCircle className="h-3 w-3" /> System Specs
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-4 text-xs">
              <div className="flex justify-between">
                 <span className="opacity-60">Engine</span>
                 <span className="font-bold text-primary">face-api.js (Tiny)</span>
              </div>
              <div className="flex justify-between">
                 <span className="opacity-60">Offline Latency</span>
                 <span className="font-bold text-green-500">~150ms</span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-50 italic">
                Embeddings are matched locally on your device. Zero face data is sent to external APIs, ensuring maximum privacy and speed.
              </p>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}


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
  RefreshCw
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { verifyFace } from '@/ai/flows/verify-face-flow';
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
  const [isOnline, setIsOnline] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    startCamera();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopCamera();
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
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
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions for the entrance kiosk."
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const triggerAutoVerify = useCallback(async () => {
    if (!isOnline || isScanning || scanResult === 'success' || !videoRef.current || !canvasRef.current || !db) return;

    setIsScanning(true);
    setIdentifiedMember(null);
    setScanResult(null);

    const context = canvasRef.current.getContext('2d');
    if (!context) {
      setIsScanning(false);
      return;
    }

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const livePhoto = canvasRef.current.toDataURL('image/jpeg');

    try {
      // 1. Fetch Active Members (Limited for performance)
      const q = query(collection(db, 'members'), where('status', '==', 'active'), limit(20));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      if (members.length === 0) {
        setIsScanning(false);
        return;
      }

      // 2. AI Identification Loop
      let matchedMember = null;
      for (const member of members) {
        if (!member.photoData) continue;
        
        try {
          const result = await verifyFace({
            storedPhotoDataUri: member.photoData,
            livePhotoDataUri: livePhoto
          });

          if (result.isMatch && result.confidence > 0.85) {
            matchedMember = member;
            break;
          }
        } catch (e) {
          continue; 
        }
      }

      if (matchedMember) {
        const memberRef = doc(db, 'members', matchedMember.id);
        const updateData = {
          lastCheckIn: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Non-blocking mutation
        updateDoc(memberRef, updateData)
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: memberRef.path,
              operation: 'update',
              requestResourceData: updateData,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });

        setIdentifiedMember(matchedMember);
        setScanResult('success');
        setRecentLogs(prev => [{
            name: matchedMember.fullName,
            time: new Date().toLocaleTimeString(),
            status: 'Authorized'
        }, ...prev].slice(0, 5));
        
        // Auto-reset
        setTimeout(() => {
          setScanResult(null);
          setIdentifiedMember(null);
        }, 5000);
      } else {
        setScanResult('failure');
        setTimeout(() => {
          setScanResult(null);
        }, 3000);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  }, [isOnline, isScanning, scanResult, db]);

  useEffect(() => {
    if (isKioskActive && isOnline) {
      scanIntervalRef.current = setInterval(() => {
        if (!isScanning && !scanResult) {
          triggerAutoVerify();
        }
      }, 7000);
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => {
       if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
  }, [isKioskActive, isOnline, isScanning, scanResult, triggerAutoVerify]);

  const toggleKiosk = () => {
    setIsKioskActive(!isKioskActive);
    if (!isKioskActive) {
      toast({ title: "Kiosk Mode Stopped", description: "Returning to manual control." });
    } else {
       toast({ title: "Kiosk Active", description: "Automated scanning engaged." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-[calc(100vh-140px)]">
      <Card className="lg:col-span-8 overflow-hidden border-2 flex flex-col shadow-2xl relative bg-black">
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
           {!isOnline && (
             <Badge variant="destructive" className="gap-1 px-3 py-1">
                <WifiOff className="h-3 w-3" /> Offline
             </Badge>
           )}
           <Badge variant="outline" className={cn(
             "bg-background/80 backdrop-blur-sm border-primary/20 transition-colors font-mono",
             isKioskActive ? "text-green-500 border-green-500/50" : "text-primary"
           )}>
              <Scan className={cn("h-3 w-3 mr-1", isKioskActive && "animate-pulse")} /> 
              {isKioskActive ? 'AUTO-KIOSK' : 'MANUAL'}
           </Badge>
        </div>

        <div className="absolute top-4 right-4 z-20 flex gap-2">
           <Button size="icon" variant="outline" className="bg-background/50 backdrop-blur-sm" onClick={toggleCamera}>
              <RefreshCw className="h-4 w-4" />
           </Button>
        </div>

        <div className="relative flex-1 bg-black group overflow-hidden flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              isScanning ? "brightness-50 scale-105 blur-[2px]" : "brightness-90",
              scanResult === 'success' ? "opacity-40" : ""
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="w-48 h-48 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                <div className="text-white font-headline text-2xl tracking-widest animate-pulse drop-shadow-lg uppercase">Scanning Identity...</div>
            </div>
          )}

          {scanResult === 'success' && identifiedMember && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-600/20 backdrop-blur-sm animate-in zoom-in duration-500">
               <CheckCircle2 className="h-40 w-40 text-green-500 mb-6 drop-shadow-2xl" />
               <h2 className="text-5xl font-headline font-bold text-white mb-2 tracking-tight">WELCOME</h2>
               <p className="text-3xl text-green-300 uppercase tracking-widest font-black drop-shadow-md text-center px-6">
                 {identifiedMember.fullName}
               </p>
               <div className="mt-8 bg-green-500 text-white px-8 py-3 rounded-full font-bold animate-bounce shadow-xl">
                  ENTRY GRANTED
               </div>
            </div>
          )}

          {scanResult === 'failure' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/10 backdrop-blur-[2px] animate-in shake duration-300">
               <XCircle className="h-32 w-32 text-destructive mb-6 drop-shadow-2xl" />
               <h2 className="text-4xl font-headline font-bold text-white mb-2">NOT RECOGNIZED</h2>
               <p className="text-xl text-destructive-foreground uppercase tracking-widest font-bold">Please see staff</p>
            </div>
          )}

          {!scanResult && !isScanning && isKioskActive && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-64 h-80 border-2 border-dashed border-white/50 rounded-[3rem] relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4">
                       <span className="text-white text-[10px] uppercase tracking-widest font-bold bg-black/40 px-2 py-1 rounded">Position Face Here</span>
                    </div>
                </div>
             </div>
          )}
        </div>

        <CardContent className="p-4 bg-background border-t">
           <div className="flex items-center justify-between gap-4">
              <div className="hidden sm:block space-y-0.5">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entrance Station #1</p>
                 <p className="text-[10px] italic opacity-60">Status: {isOnline ? 'Online' : 'Local Only'}</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                    variant={isKioskActive ? "destructive" : "default"}
                    onClick={toggleKiosk}
                    className="flex-1 sm:flex-initial h-12 px-8 font-bold shadow-lg"
                >
                    {isKioskActive ? "Disable Auto-Entry" : "Enable Auto-Entry"}
                </Button>
                {!isKioskActive && (
                    <Button 
                        variant="outline"
                        onClick={triggerAutoVerify} 
                        disabled={isScanning || !isOnline}
                        className="h-12 px-6 font-bold"
                    >
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manual Verification"}
                    </Button>
                )}
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 shadow-xl flex flex-col overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider font-bold">
               <History className="h-4 w-4 text-primary" />
               Access Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
             <Table>
                <TableHeader>
                   <TableRow className="bg-muted/50">
                      <TableHead className="text-[10px] h-8">TIME</TableHead>
                      <TableHead className="text-[10px] h-8">MEMBER</TableHead>
                      <TableHead className="text-right text-[10px] h-8">STATUS</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {recentLogs.length > 0 ? (
                     recentLogs.map((log, idx) => (
                       <TableRow key={idx} className="animate-in slide-in-from-right-4 duration-300">
                          <TableCell className="text-[10px] font-mono opacity-60">{log.time}</TableCell>
                          <TableCell className="font-bold text-xs truncate max-w-[120px]">{log.name}</TableCell>
                          <TableCell className="text-right">
                             <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] py-0 px-1.5 h-5">
                                OK
                             </Badge>
                          </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">
                           Waiting for scans...
                        </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
          <div className="p-4 border-t bg-muted/20">
             <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-primary" />
                <span>AI Identity Threshold: High (85%)</span>
             </div>
          </div>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
           <CardHeader className="py-3">
              <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2 font-bold text-muted-foreground">
                 <User className="h-3 w-3" /> System Metrics
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3 pb-4 text-[11px]">
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Mobile Camera</span>
                 <span className="font-bold uppercase text-primary">{facingMode}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Verification</span>
                 <span className="font-bold text-green-500">ACTIVE</span>
              </div>
              <div className="pt-2 border-t border-primary/10">
                 <p className="leading-relaxed opacity-60 italic text-[10px]">
                    Note: Members must have a valid profile photo for automatic entry.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

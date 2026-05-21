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
  Maximize
} from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { verifyFace } from '@/ai/flows/verify-face-flow';
import { cn } from '@/lib/utils';

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
      // 1. Fetch Active Members (Checking top 30 active members for speed)
      const q = query(collection(db, 'members'), where('status', '==', 'active'), limit(30));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      if (members.length === 0) {
        setIsScanning(false);
        return;
      }

      // 2. AI Identification
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
          // Continue if one individual match fails
          continue;
        }
      }

      if (matchedMember) {
        const memberRef = doc(db, 'members', matchedMember.id);
        updateDoc(memberRef, {
          lastCheckIn: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setIdentifiedMember(matchedMember);
        setScanResult('success');
        setRecentLogs(prev => [{
            name: matchedMember.fullName,
            time: new Date().toLocaleTimeString(),
            status: 'Authorized'
        }, ...prev].slice(0, 5));
        
        // Auto-reset after 5 seconds to scanning mode
        setTimeout(() => {
          setScanResult(null);
          setIdentifiedMember(null);
        }, 5000);
      } else {
        setScanResult('failure');
        // Reset failures quickly so next person can try
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

  // Heartbeat loop for Kiosk Mode
  useEffect(() => {
    if (isKioskActive && isOnline) {
      scanIntervalRef.current = setInterval(() => {
        if (!isScanning && !scanResult) {
          triggerAutoVerify();
        }
      }, 7000); // Pulse every 7 seconds
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
      toast({ title: "Kiosk Mode Active", description: "The system is now automatically scanning for faces." });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-[calc(100vh-140px)]">
      {/* Left Panel: Camera Scanner */}
      <Card className="lg:col-span-8 overflow-hidden border-2 flex flex-col shadow-2xl relative bg-black">
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
           {!isOnline && (
             <Badge variant="destructive" className="gap-1 px-3 py-1">
                <WifiOff className="h-3 w-3" /> Offline
             </Badge>
           )}
           <Badge variant="outline" className={cn(
             "bg-background/80 backdrop-blur-sm border-primary/20 transition-colors",
             isKioskActive ? "text-green-500 border-green-500/50" : "text-primary"
           )}>
              <Scan className={cn("h-3 w-3 mr-1", isKioskActive && "animate-pulse")} /> 
              {isKioskActive ? 'AUTO-SCAN ACTIVE' : 'MANUAL MODE'}
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
              scanResult === 'success' ? "opacity-30" : ""
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <div className="w-48 h-48 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                <div className="text-white font-headline text-2xl tracking-widest animate-pulse drop-shadow-lg">ANALYZING...</div>
            </div>
          )}

          {/* Result Overlays */}
          {scanResult === 'success' && identifiedMember && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-600/20 backdrop-blur-sm animate-in zoom-in duration-500">
               <CheckCircle2 className="h-40 w-40 text-green-500 mb-6 drop-shadow-2xl" />
               <h2 className="text-5xl font-headline font-bold text-white mb-2 tracking-tight">WELCOME BACK</h2>
               <p className="text-3xl text-green-300 uppercase tracking-widest font-black drop-shadow-md">
                 {identifiedMember.fullName}
               </p>
               <div className="mt-8 bg-green-500 text-white px-6 py-2 rounded-full font-bold animate-bounce">
                  ENTRY AUTHORIZED
               </div>
            </div>
          )}

          {scanResult === 'failure' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/10 backdrop-blur-[2px] animate-in shake duration-300">
               <XCircle className="h-32 w-32 text-destructive mb-6 drop-shadow-2xl" />
               <h2 className="text-4xl font-headline font-bold text-white mb-2">TRY AGAIN</h2>
               <p className="text-xl text-destructive-foreground uppercase tracking-widest font-bold">Face Not Recognized</p>
            </div>
          )}

          {/* Target Reticle */}
          {!scanResult && !isScanning && isKioskActive && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                <div className="w-64 h-80 border-2 border-white/30 rounded-[3rem] relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4">
                       <span className="text-white/60 text-[10px] uppercase tracking-widest">Position Face Here</span>
                    </div>
                </div>
             </div>
          )}
        </div>

        <CardContent className="p-4 bg-background border-t">
           <div className="flex items-center justify-between gap-4">
              <div className="hidden sm:block space-y-0.5">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mobile Kiosk Node #1</p>
                 <p className="text-[10px] italic opacity-60">Heartbeat: Every 7 seconds</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                    variant={isKioskActive ? "destructive" : "default"}
                    onClick={toggleKiosk}
                    className="flex-1 sm:flex-initial h-12 px-6 font-bold shadow-lg"
                >
                    {isKioskActive ? "Stop Auto-Kiosk" : "Start Auto-Kiosk"}
                </Button>
                {!isKioskActive && (
                    <Button 
                        variant="outline"
                        onClick={triggerAutoVerify} 
                        disabled={isScanning || !isOnline}
                        className="h-12 px-6 font-bold"
                    >
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Single Scan"}
                    </Button>
                )}
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Right Panel: Identity Info & Logs */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="flex-1 shadow-xl flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
               <History className="h-5 w-5 text-primary" />
               Daily Activity
            </CardTitle>
            <CardDescription className="text-xs">Live entrance tracking.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
             <Table>
                <TableHeader className="bg-muted/50">
                   <TableRow>
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
                          <TableCell className="font-bold text-xs">{log.name}</TableCell>
                          <TableCell className="text-right">
                             <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[9px] py-0">
                                {log.status}
                             </Badge>
                          </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">
                           Awaiting scans...
                        </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
          <div className="p-4 border-t bg-muted/20">
             <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>AI confidence threshold: 85%</span>
             </div>
          </div>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
           <CardHeader className="py-3">
              <CardTitle className="text-[11px] uppercase tracking-tighter flex items-center gap-2">
                 <User className="h-3 w-3" /> Mobile Optimization
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-3 pb-4 text-[10px]">
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Camera Type</span>
                 <span className="font-bold uppercase">{facingMode}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Network Mode</span>
                 <span className={cn("font-bold", isOnline ? "text-green-500" : "text-destructive")}>
                    {isOnline ? 'CLOUD SYNC' : 'OFFLINE'}
                 </span>
              </div>
              <div className="pt-2 border-t border-primary/10">
                 <p className="leading-relaxed opacity-60 italic">
                    *Kiosk mode will automatically cycle through potential matches in your member directory.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

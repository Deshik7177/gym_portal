'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  WifiOff, 
  User, 
  History,
  AlertCircle
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
  const [identifiedMember, setIdentifiedMember] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'failure' | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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

  const triggerAutoVerify = async () => {
    if (!isOnline) {
      toast({ variant: "destructive", title: "Offline", description: "AI verification requires an internet connection." });
      return;
    }
    if (!videoRef.current || !canvasRef.current || !db) return;

    setIsScanning(true);
    setIdentifiedMember(null);
    setScanResult(null);

    // 1. Capture Frame
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const livePhoto = canvasRef.current.toDataURL('image/jpeg');

    try {
      // 2. Fetch Active Members (Simplification: Just get active ones)
      const q = query(collection(db, 'members'), where('status', '==', 'active'), limit(50));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

      if (members.length === 0) {
        toast({ title: "No active members", description: "Register members to enable face auth." });
        setIsScanning(false);
        return;
      }

      // 3. AI Identification (Check live photo against potential matches)
      let matchedMember = null;
      
      for (const member of members) {
        if (!member.photoData) continue;
        
        const result = await verifyFace({
          storedPhotoDataUri: member.photoData,
          livePhotoDataUri: livePhoto
        });

        if (result.isMatch && result.confidence > 0.8) {
          matchedMember = member;
          break;
        }
      }

      if (matchedMember) {
        // 4. Mark Attendance
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
        
        toast({ title: "Welcome back!", description: `${matchedMember.fullName} has been checked in.` });
      } else {
        setScanResult('failure');
        toast({ variant: "destructive", title: "Access Denied", description: "Identity could not be verified." });
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "System Error", description: "Facial verification failed." });
    } finally {
      setIsScanning(false);
      // Reset after 4 seconds
      setTimeout(() => {
        setScanResult(null);
        setIdentifiedMember(null);
      }, 4000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-[calc(100vh-140px)]">
      {/* Left Panel: Camera Scanner */}
      <Card className="lg:col-span-7 overflow-hidden border-2 flex flex-col shadow-2xl relative">
        <div className="absolute top-4 left-4 z-20 flex gap-2">
           {!isOnline && (
             <Badge variant="destructive" className="gap-1 px-3 py-1">
                <WifiOff className="h-3 w-3" /> Offline Mode
             </Badge>
           )}
           <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-primary/20 text-primary">
              <Scan className="h-3 w-3 mr-1" /> Smart Gate Active
           </Badge>
        </div>

        <div className="relative flex-1 bg-black group overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className={cn(
              "w-full h-full object-cover transition-all duration-700",
              isScanning ? "brightness-50 scale-105 blur-[2px]" : "brightness-90",
              scanResult === 'success' ? "border-8 border-green-500/50" : "",
              scanResult === 'failure' ? "border-8 border-destructive/50" : ""
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="w-64 h-64 border-2 border-primary border-t-transparent rounded-full animate-spin mb-6" />
                <div className="text-white font-headline text-2xl tracking-widest animate-pulse">ANALYZING FACE...</div>
            </div>
          )}

          {/* Result Overlays */}
          {scanResult === 'success' && identifiedMember && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-green-500/10 backdrop-blur-[2px] animate-in zoom-in duration-300">
               <CheckCircle2 className="h-32 w-32 text-green-500 mb-6 drop-shadow-2xl" />
               <h2 className="text-4xl font-headline font-bold text-white mb-2">ACCESS GRANTED</h2>
               <p className="text-2xl text-green-300 uppercase tracking-widest font-bold">Welcome, {identifiedMember.fullName}</p>
            </div>
          )}

          {scanResult === 'failure' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-destructive/10 backdrop-blur-[2px] animate-in shake duration-300">
               <XCircle className="h-32 w-32 text-destructive mb-6 drop-shadow-2xl" />
               <h2 className="text-4xl font-headline font-bold text-white mb-2">ACCESS DENIED</h2>
               <p className="text-xl text-destructive-foreground uppercase tracking-widest font-bold">Identity Not Verified</p>
            </div>
          )}

          {/* Corner Decorations */}
          <div className="absolute top-8 right-8 border-t-4 border-r-4 border-primary/40 w-16 h-16 rounded-tr-3xl" />
          <div className="absolute bottom-8 left-8 border-b-4 border-l-4 border-primary/40 w-16 h-16 rounded-bl-3xl" />
        </div>

        <CardContent className="p-6 bg-card">
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <p className="text-sm font-medium text-muted-foreground">Entrance Gate #1</p>
                 <p className="text-xs italic opacity-60 flex items-center gap-1">
                   <AlertCircle className="h-3 w-3" /> Auto-attendance will log upon successful scan.
                 </p>
              </div>
              <Button 
                size="lg" 
                onClick={triggerAutoVerify} 
                disabled={isScanning || !isOnline}
                className="h-14 px-8 text-lg font-bold shadow-xl"
              >
                {isScanning ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying</>
                ) : (
                  <><Camera className="mr-2 h-5 w-5" /> Start Auto-Scan</>
                )}
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* Right Panel: Identity Info & Logs */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <Card className="flex-1 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <History className="h-5 w-5 text-primary" />
               Live Entrance Activity
            </CardTitle>
            <CardDescription>Recent automated check-ins from this station.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Result</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {recentLogs.length > 0 ? (
                     recentLogs.map((log, idx) => (
                       <TableRow key={idx} className="animate-in slide-in-from-right-4 duration-300">
                          <TableCell className="text-xs font-mono opacity-60">{log.time}</TableCell>
                          <TableCell className="font-bold">{log.name}</TableCell>
                          <TableCell className="text-right">
                             <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                                {log.status}
                             </Badge>
                          </TableCell>
                       </TableRow>
                     ))
                   ) : (
                     <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                           Awaiting scans...
                        </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
           <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-tighter flex items-center gap-2">
                 <User className="h-4 w-4" /> Kiosk Configuration
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                 <span className="text-muted-foreground">Mode</span>
                 <span className="font-bold text-primary">Unattended Gate</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                 <span className="text-muted-foreground">AI Confidence Threshold</span>
                 <span className="font-bold">85% Match</span>
              </div>
              <div className="pt-4 border-t border-primary/10">
                 <p className="text-[10px] leading-relaxed opacity-60 italic">
                    *Note: This kiosk requires an active internet connection for facial recognition. 
                    In case of outage, staff should use the Manual Check-In portal.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
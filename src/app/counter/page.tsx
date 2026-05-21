
'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  Search, 
  CheckCircle, 
  Loader2, 
  Phone, 
  UserCheck, 
  Camera, 
  ScanFace,
  History,
  WifiOff
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { verifyFace } from '@/ai/flows/verify-face-flow';

export default function CounterPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera for facial auth."
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const handleSearch = async () => {
    if (!searchPhone || !db) return;
    setLoading(true);
    setVerifiedMember(null);

    try {
      const docRef = doc(db, 'members', searchPhone);
      // getDoc will check local cache first if configured
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setVerifiedMember(data);
        toast({
          title: "Member Found",
          description: `Loaded profile for ${data.fullName}.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "No member found with this ID."
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch member details."
      });
    } finally {
      setLoading(false);
    }
  };

  const performFacialAuth = async () => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        title: "Offline Mode",
        description: "AI Facial Authentication requires an internet connection. Please verify identity manually."
      });
      return;
    }

    if (!videoRef.current || !canvasRef.current || !verifiedMember || !db) return;
    
    setVerifyingFace(true);
    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const livePhoto = canvasRef.current.toDataURL('image/jpeg');

      if (!verifiedMember.photoData) {
        throw new Error("Member has no stored profile photo.");
      }

      const result = await verifyFace({
        storedPhotoDataUri: verifiedMember.photoData,
        livePhotoDataUri: livePhoto
      });

      if (result.isMatch) {
        const docRef = doc(db, 'members', verifiedMember.phone);
        // Mutation is non-blocking, will sync when online
        updateDoc(docRef, {
          lastCheckIn: serverTimestamp()
        });

        toast({
          title: "Success",
          description: `Verified ${verifiedMember.fullName}. Confidence: ${(result.confidence * 100).toFixed(0)}%`
        });
        
        setVerifiedMember(prev => ({ ...prev, authenticated: true }));
        stopCamera();
      } else {
        toast({
          variant: "destructive",
          title: "Identity Mismatch",
          description: result.reason || "The face does not match."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "AI Auth Failed",
        description: err.message || "Could not reach AI services."
      });
    } finally {
      setVerifyingFace(false);
    }
  };

  const markAttendanceManually = async () => {
    if (!verifiedMember || !db) return;
    const docRef = doc(db, 'members', verifiedMember.phone);
    updateDoc(docRef, { lastCheckIn: serverTimestamp() });
    setVerifiedMember(prev => ({ ...prev, authenticated: true }));
    toast({ title: "Manual Check-In", description: "Attendance marked for " + verifiedMember.fullName });
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto">
        <div className="lg:col-span-5 flex flex-col gap-6">
            {!isOnline && (
              <div className="bg-orange-500/20 border border-orange-500/50 p-3 rounded-lg flex items-center gap-3 text-orange-500 text-sm">
                <WifiOff className="h-5 w-5" />
                <span>You are currently offline. Data will sync automatically, but AI verification is unavailable.</span>
              </div>
            )}

            <Card className="border-primary shadow-lg bg-card/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <ScanFace className="h-5 w-5" />
                        Staff Verification
                    </CardTitle>
                    <CardDescription>
                        Match live face or verify manually in offline mode.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Enter Member Phone..." 
                                className="pl-8"
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={loading} variant="secondary">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="relative aspect-[4/3] bg-muted rounded-xl overflow-hidden border-2 border-primary/20 group">
                        {verifiedMember?.authenticated ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 backdrop-blur-sm z-10 animate-in fade-in zoom-in">
                             <CheckCircle className="h-20 w-20 text-green-500 mb-2" />
                             <span className="font-bold text-green-500 uppercase tracking-widest">Entry Granted</span>
                          </div>
                        ) : null}

                        <video 
                          ref={videoRef} 
                          autoPlay 
                          className={`w-full h-full object-cover transition-opacity ${cameraActive ? 'opacity-100' : 'opacity-0'}`} 
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {!cameraActive && !verifiedMember?.authenticated && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                            <Camera className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-sm">Camera inactive. Search member to start.</p>
                          </div>
                        )}
                        
                        {verifyingFace && (
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                              <span className="text-white text-xs font-bold uppercase tracking-tighter">AI Verification...</span>
                           </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {isOnline ? (
                          <>
                            {!cameraActive ? (
                              <Button 
                                onClick={startCamera} 
                                disabled={!verifiedMember || verifiedMember.authenticated} 
                                className="w-full"
                              >
                                <Camera className="mr-2 h-4 w-4" /> Start AI Scanner
                              </Button>
                            ) : (
                              <Button 
                                onClick={performFacialAuth} 
                                disabled={verifyingFace || verifiedMember?.authenticated} 
                                className="w-full h-12 text-lg font-bold"
                              >
                                {verifyingFace ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanFace className="mr-2 h-5 w-5" />}
                                Verify Identity
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button 
                            variant="secondary"
                            disabled={!verifiedMember || verifiedMember.authenticated}
                            onClick={markAttendanceManually}
                            className="w-full h-12"
                          >
                            <UserCheck className="mr-2 h-5 w-5" /> Manual Check-In (Offline)
                          </Button>
                        )}
                        {cameraActive && (
                           <Button variant="ghost" size="sm" onClick={stopCamera}>
                              Cancel
                           </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Profile Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    {verifiedMember ? (
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/20">
                                {verifiedMember.photoData ? (
                                    <img src={verifiedMember.photoData} className="w-full h-full object-cover" alt="ID" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center"><UserCheck className="text-muted-foreground" /></div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold font-headline">{verifiedMember.fullName}</h4>
                                <div className="flex gap-2">
                                  <Badge variant={verifiedMember.status === 'active' ? 'default' : 'destructive'} className="text-[10px] h-4">
                                      {verifiedMember.status?.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] h-4 capitalize">{verifiedMember.type}</Badge>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No member searched.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card className="lg:col-span-7 shadow-xl border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Attendance History
                  </CardTitle>
                  <CardDescription>
                      Logs will sync with the cloud once online.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                   <Link href="/admin/absent">View Retention</Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-primary/5 transition-colors">
                            <TableCell className="text-xs font-mono">Recent</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">Live Feed</span>
                                    <span className="text-[10px] text-muted-foreground">Monitoring active sessions...</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px]">SYSTEM</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-none text-[10px]">READY</Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

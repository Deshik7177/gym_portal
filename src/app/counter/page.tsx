
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
  WifiOff,
  AlertCircle
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
      // Firestore SDK will check local persistent cache automatically
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setVerifiedMember(data);
        toast({
          title: "Member Found",
          description: `Identity pulled from ${isOnline ? 'cloud' : 'local cache'}.`
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
        title: "AI Offline",
        description: "Facial matching requires internet. Please use manual check-in."
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
        throw new Error("Member has no profile photo stored for comparison.");
      }

      const result = await verifyFace({
        storedPhotoDataUri: verifiedMember.photoData,
        livePhotoDataUri: livePhoto
      });

      if (result.isMatch) {
        const docRef = doc(db, 'members', verifiedMember.phone);
        updateDoc(docRef, { lastCheckIn: serverTimestamp() });

        toast({
          title: "Identity Verified",
          description: `Confidence: ${(result.confidence * 100).toFixed(0)}%`
        });
        
        setVerifiedMember(prev => ({ ...prev, authenticated: true }));
        stopCamera();
      } else {
        toast({
          variant: "destructive",
          title: "Mismatch",
          description: result.reason || "The face does not match the profile photo."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "AI Failed",
        description: "Communication error with AI model."
      });
    } finally {
      setVerifyingFace(false);
    }
  };

  const markAttendanceManually = async () => {
    if (!verifiedMember || !db) return;
    const docRef = doc(db, 'members', verifiedMember.phone);
    
    // updateDoc updates local cache immediately and syncs when online
    updateDoc(docRef, { lastCheckIn: serverTimestamp() });
    
    setVerifiedMember(prev => ({ ...prev, authenticated: true }));
    toast({ 
      title: "Manual Check-In", 
      description: `Attendance logged for ${verifiedMember.fullName}. (Will sync when online)` 
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto">
        <div className="lg:col-span-5 flex flex-col gap-6">
            {!isOnline && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                   <p className="font-bold text-sm text-destructive uppercase">Offline Mode Active</p>
                   <p className="text-xs opacity-80 leading-relaxed">AI facial matching is unavailable. Please verify identities manually using profile photos. Data will sync automatically.</p>
                </div>
              </div>
            )}

            <Card className="border-primary shadow-lg bg-card/50 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <ScanFace className="h-5 w-5" />
                        Verification Station
                    </CardTitle>
                    <CardDescription>
                        {isOnline ? 'Choose between AI matching or manual override.' : 'Manual identity verification only.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
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
                             <span className="font-bold text-green-500 uppercase tracking-widest text-xl">ACCESS GRANTED</span>
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
                            {verifiedMember ? (
                               <img src={verifiedMember.photoData} className="w-full h-full object-cover opacity-30 grayscale" alt="Ghost" />
                            ) : (
                               <Camera className="h-12 w-12 mb-3 opacity-20" />
                            )}
                            <p className="text-sm absolute z-10 font-bold bg-background/80 px-3 py-1 rounded-full border">
                              {verifiedMember ? 'Start Camera for AI' : 'Search Member to Begin'}
                            </p>
                          </div>
                        )}
                        
                        {verifyingFace && (
                           <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                              <span className="text-white text-xs font-bold uppercase tracking-widest animate-pulse">Running AI Analysis...</span>
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
                                className="w-full h-12 text-base"
                              >
                                <Camera className="mr-2 h-4 w-4" /> Open Identity Scanner
                              </Button>
                            ) : (
                              <Button 
                                onClick={performFacialAuth} 
                                disabled={verifyingFace || verifiedMember?.authenticated} 
                                className="w-full h-12 text-lg font-bold"
                              >
                                {verifyingFace ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanFace className="mr-2 h-5 w-5" />}
                                Confirm Identity (AI)
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="p-4 bg-muted/50 rounded-lg border border-dashed text-center">
                             <p className="text-xs text-muted-foreground mb-3">AI features are disabled while offline.</p>
                             <Button 
                                variant="default"
                                disabled={!verifiedMember || verifiedMember.authenticated}
                                onClick={markAttendanceManually}
                                className="w-full h-12"
                              >
                                <UserCheck className="mr-2 h-5 w-5" /> Manual ID Verification
                              </Button>
                          </div>
                        )}
                        
                        {verifiedMember && isOnline && !verifiedMember.authenticated && (
                           <Button variant="ghost" size="sm" onClick={markAttendanceManually} className="text-xs text-muted-foreground">
                              Override AI (Manual Check-In)
                           </Button>
                        )}

                        {cameraActive && (
                           <Button variant="outline" size="sm" onClick={stopCamera}>
                              Close Camera
                           </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className={verifiedMember?.status === 'non-active' ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Member Data Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    {verifiedMember ? (
                        <div className="flex items-center gap-5">
                            <div className="h-24 w-24 rounded-xl overflow-hidden border-4 border-background shadow-xl ring-2 ring-primary/20 shrink-0">
                                {verifiedMember.photoData ? (
                                    <img src={verifiedMember.photoData} className="w-full h-full object-cover" alt="Stored ID" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center"><UserCheck className="text-muted-foreground" /></div>
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-lg font-headline truncate">{verifiedMember.fullName}</h4>
                                  <Badge variant={verifiedMember.status === 'active' ? 'default' : 'destructive'} className="text-[10px] h-4">
                                      {verifiedMember.status?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                   <div className="bg-muted/50 p-2 rounded text-center">
                                      <p className="text-[10px] text-muted-foreground">Type</p>
                                      <p className="text-xs font-bold capitalize">{verifiedMember.type}</p>
                                   </div>
                                   <div className="bg-muted/50 p-2 rounded text-center">
                                      <p className="text-[10px] text-muted-foreground">Membership</p>
                                      <p className="text-xs font-bold">{verifiedMember.status === 'active' ? 'Unlimited' : 'Term-Based'}</p>
                                   </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                           <AlertCircle className="h-8 w-8 text-muted-foreground opacity-20 mb-2" />
                           <p className="text-sm text-muted-foreground italic">No member profile loaded.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card className="lg:col-span-7 shadow-xl border-border/40 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary">
                      <History className="h-5 w-5" />
                      Daily Access Log
                  </CardTitle>
                  <CardDescription>
                      {isOnline ? 'Real-time synchronization active.' : 'Queued entries will sync when online.'}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                   <Link href="/admin/absent">View Retention</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-24">Time</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Access Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="bg-primary/5 border-primary/10">
                            <TableCell className="text-xs font-mono text-primary animate-pulse">LIVE</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">System Monitoring</span>
                                    <span className="text-[10px] text-muted-foreground">Monitoring active gym traffic...</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-[10px] bg-background">SYSTEM</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge className="bg-green-500 hover:bg-green-500 text-white border-none text-[10px]">STANDBY</Badge>
                            </TableCell>
                        </TableRow>
                        {/* More logs could be mapped here from a 'logs' collection if desired */}
                    </TableBody>
                </Table>
                
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground opacity-40">
                   <Users className="h-12 w-12 mb-4" />
                   <p className="text-sm">Scan a member to start logging session entries.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

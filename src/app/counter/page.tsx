'use client';

import { useState, useRef, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  Search, 
  UserPlus, 
  Repeat, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Phone, 
  UserCheck, 
  Camera, 
  ScanFace,
  History
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setVerifiedMember(data);
        toast({
          title: "Member Found",
          description: `Loaded profile for ${data.fullName}. Proceed to Facial Auth.`
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
    if (!videoRef.current || !canvasRef.current || !verifiedMember || !db) return;
    
    setVerifyingFace(true);
    try {
      // Capture live photo
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const livePhoto = canvasRef.current.toDataURL('image/jpeg');

      if (!verifiedMember.photoData) {
        throw new Error("Member has no stored profile photo for comparison.");
      }

      // Call Genkit AI Flow
      const result = await verifyFace({
        storedPhotoDataUri: verifiedMember.photoData,
        livePhotoDataUri: livePhoto
      });

      if (result.isMatch) {
        // Mark Attendance in Firestore
        const docRef = doc(db, 'members', verifiedMember.phone);
        await updateDoc(docRef, {
          lastCheckIn: serverTimestamp()
        });

        toast({
          title: "Success: Attendance Marked",
          description: `Identity verified for ${verifiedMember.fullName}. Confidence: ${(result.confidence * 100).toFixed(0)}%`
        });
        
        // Success state
        setVerifiedMember(prev => ({ ...prev, authenticated: true }));
        stopCamera();
      } else {
        toast({
          variant: "destructive",
          title: "Identity Mismatch",
          description: result.reason || "The face does not match the profile photo."
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "AI Auth Failed",
        description: err.message || "An error occurred during facial verification."
      });
    } finally {
      setVerifyingFace(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto">
        <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="border-primary shadow-lg bg-card/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <ScanFace className="h-5 w-5" />
                        Facial Verification
                    </CardTitle>
                    <CardDescription>
                        Match live face with stored profile ID.
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
                            <p className="text-sm">Camera inactive. Search member to start authentication.</p>
                          </div>
                        )}
                        
                        {verifyingFace && (
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                              <span className="text-white text-xs font-bold uppercase tracking-tighter">AI Verification In Progress...</span>
                           </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {!cameraActive ? (
                           <Button 
                             onClick={startCamera} 
                             disabled={!verifiedMember || verifiedMember.authenticated} 
                             className="w-full"
                           >
                             <Camera className="mr-2 h-4 w-4" /> Start Auth Camera
                           </Button>
                        ) : (
                           <Button 
                             onClick={performFacialAuth} 
                             disabled={verifyingFace || verifiedMember?.authenticated} 
                             className="w-full h-12 text-lg font-bold"
                             variant="default"
                           >
                             {verifyingFace ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ScanFace className="mr-2 h-5 w-5" />}
                             Verify & Mark Attendance
                           </Button>
                        )}
                        {cameraActive && (
                           <Button variant="ghost" size="sm" onClick={stopCamera}>
                              Cancel Scan
                           </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Member Summary</CardTitle>
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
                        <p className="text-xs text-muted-foreground italic">No member selected for authentication.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card className="lg:col-span-7 shadow-xl border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Attendance Log
                  </CardTitle>
                  <CardDescription>
                      Real-time feed of successful AI authentications.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                   <Link href="/admin/absent">View Absents</Link>
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Verification</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-primary/5 transition-colors">
                            <TableCell className="text-xs font-mono">18:05:32</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">John Doe</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">ID: 1234567890</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]">
                                    <ScanFace className="h-3 w-3" /> 98% MATCH
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-none text-[10px]">SUCCESS</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="opacity-60">
                            <TableCell className="text-xs font-mono">17:55:03</TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">Jane Smith</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">ID: 0987654321</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-destructive font-bold text-[10px]">
                                    <ScanFace className="h-3 w-3" /> MISMATCH
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="destructive" className="text-[10px]">DENIED</Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

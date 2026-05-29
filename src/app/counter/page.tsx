'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc, collection, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  Search, 
  CheckCircle, 
  Loader2, 
  Phone, 
  UserCheck, 
  History,
  WifiOff,
  UserX,
  ShieldX,
  User
} from 'lucide-react';
import { format, isToday, parseISO, isAfter, startOfDay } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function CounterPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);

  const today = useMemo(() => startOfDay(new Date()), []);

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

  const handleSearch = async () => {
    if (!searchPhone || !db) return;
    setLoading(true);
    setVerifiedMember(null);

    try {
      const docRef = doc(db, 'members', searchPhone);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const expiryDate = data.endDate ? parseISO(data.endDate) : null;
        const startDate = data.startDate ? parseISO(data.startDate) : null;
        
        const isExpired = expiryDate ? isAfter(today, expiryDate) : false;
        const notStarted = startDate ? isAfter(startDate, today) : false;
        const isValid = !isExpired && !notStarted;

        const lastCheckIn = data.lastCheckIn?.seconds ? new Date(data.lastCheckIn.seconds * 1000) : null;
        const authenticated = lastCheckIn ? isToday(lastCheckIn) : false;

        setVerifiedMember({ ...data, id: docSnap.id, isExpired, notStarted, isValid, authenticated });
        
        if (!isValid) {
          toast({ 
            variant: "destructive", 
            title: "Access Denied", 
            description: isExpired ? "Subscription is expired." : "Access not yet active." 
          });
        } else if (authenticated) {
          toast({ title: "Already Verified", description: "This member already checked in today." });
        } else {
          toast({ title: "Member Found", description: "Account active." });
        }
      } else {
        toast({ variant: "destructive", title: "Not Found" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async () => {
    if (!verifiedMember || !db) return;
    
    if (!verifiedMember.isValid) {
        toast({ 
          variant: "destructive", 
          title: "Access Denied", 
          description: verifiedMember.isExpired ? "Membership has expired." : "Membership is not yet active." 
        });
        return;
    }

    const memberId = verifiedMember.id;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const attendanceDocId = `${memberId}_${todayStr}`;
    const docRef = doc(db, 'members', memberId);
    const timestamp = serverTimestamp();
    const expiresAt = Date.now() + 5000;
    
    setDoc(doc(db, 'gateControl', 'latest'), {
      command: 'OPEN',
      status: 'pending',
      timestamp: timestamp,
      expiresAt: expiresAt,
      memberId: memberId,
      method: 'manual'
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'gateControl/latest',
        operation: 'write'
      }));
    });

    updateDoc(docRef, { 
      lastCheckIn: timestamp,
      updatedAt: timestamp
    }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `members/${memberId}`,
        operation: 'update'
      }));
    });

    setDoc(doc(db, 'attendance', attendanceDocId), {
      memberId: memberId,
      memberName: verifiedMember.fullName,
      timestamp: timestamp,
      method: 'manual',
      score: 1.0
    }, { merge: true }).catch(err => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `attendance/${attendanceDocId}`,
        operation: 'write'
      }));
    });
    
    setVerifiedMember(prev => ({ ...prev, authenticated: true }));
  };

  const resetSearch = () => {
    setSearchPhone('');
    setVerifiedMember(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto">
        <div className="lg:col-span-5 flex flex-col gap-6">
            {!isOnline && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                   <p className="font-bold text-sm text-destructive uppercase">Offline Mode</p>
                </div>
              </div>
            )}

            <Card className="border-primary shadow-lg bg-card/50 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <UserCheck className="h-5 w-5" />
                        Reception Check-In
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Phone Number..." className="pl-8 h-12 text-lg" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                        </div>
                        <Button onClick={handleSearch} disabled={loading} variant="secondary" className="h-12 w-12 p-0">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        </Button>
                    </div>

                    {verifiedMember ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="relative aspect-[4/5] bg-muted/20 rounded-xl overflow-hidden border-2 border-primary/20 flex items-center justify-center">
                           <div className="flex flex-col items-center justify-center text-primary/40 text-center gap-4">
                              <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                                <User className="h-16 w-16" />
                              </div>
                              <p className="font-black text-xs uppercase tracking-widest">Biometric Profile Linked</p>
                           </div>
                           
                           {verifiedMember.authenticated && (
                             <div className="absolute inset-0 bg-green-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in zoom-in duration-500">
                                <CheckCircle className="h-24 w-24 text-green-500" />
                                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold mt-4 tracking-widest uppercase">Verified</span>
                             </div>
                           )}

                           {!verifiedMember.isValid && (
                              <div className="absolute inset-0 bg-destructive/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                                 <ShieldX className="h-24 w-24 text-destructive" />
                                 <span className="bg-destructive text-white px-4 py-1 rounded-full text-sm font-bold mt-4 tracking-widest uppercase">
                                    {verifiedMember.isExpired ? 'Expired' : 'Not Started'}
                                 </span>
                              </div>
                           )}
                        </div>

                        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                           <div className="flex items-center justify-between">
                              <h3 className="font-bold text-xl font-headline text-foreground">{verifiedMember.fullName}</h3>
                              <Badge variant={verifiedMember.isValid ? 'default' : 'destructive'}>
                                {verifiedMember.isExpired ? 'EXPIRED' : verifiedMember.notStarted ? 'FUTURE' : 'ACTIVE'}
                              </Badge>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3 text-sm text-foreground">
                              <div className="space-y-1">
                                 <p className="text-muted-foreground text-[10px] uppercase">Plan</p>
                                 <p className="font-semibold capitalize">{verifiedMember.type}</p>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-muted-foreground text-[10px] uppercase">Expiry</p>
                                 <p className={cn("font-semibold", verifiedMember.isExpired && "text-destructive")}>
                                    {verifiedMember.endDate ? verifiedMember.endDate : 'N/A'}
                                 </p>
                              </div>
                           </div>
                        </div>

                        {!verifiedMember.authenticated ? (
                          <div className="grid grid-cols-2 gap-3">
                             <Button onClick={markAttendance} className="h-14 text-lg font-bold" disabled={!verifiedMember.isValid}>
                                {verifiedMember.isValid ? 'Grant Access' : 'Access Denied'}
                             </Button>
                             <Button variant="outline" onClick={resetSearch} className="h-14">Clear</Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-center">
                              <p className="text-green-500 text-xs font-black uppercase tracking-widest">Attendance Recorded for Today</p>
                            </div>
                            <Button variant="outline" onClick={resetSearch} className="w-full h-12">Next Search</Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground/30 border-2 border-dashed rounded-xl">
                         <UserCheck className="h-16 w-16 mb-4" />
                         <p className="text-sm font-medium">Search member to verify.</p>
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
                      Session Log
                  </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-24">Time</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {verifiedMember?.authenticated ? (
                           <TableRow className="bg-primary/5 animate-in slide-in-from-left-4">
                              <TableCell className="text-xs font-mono font-bold text-primary">
                                 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-col">
                                    <span className="font-bold text-sm text-foreground">{verifiedMember.fullName}</span>
                                    <span className="text-[10px] text-muted-foreground">{verifiedMember.phone}</span>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <Badge variant="outline" className="text-[10px] capitalize">{verifiedMember.type}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                 <Badge className="bg-green-500 text-white border-none text-[10px]">VERIFIED</Badge>
                              </TableCell>
                           </TableRow>
                        ) : null}
                        
                        <TableRow>
                           <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic text-xs">End of session feed.</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

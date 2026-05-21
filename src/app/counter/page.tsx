
'use client';

import { useState } from 'react';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Search, UserPlus, Repeat, CheckCircle, XCircle, Loader2, Phone, UserCheck } from 'lucide-react';

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

export default function CounterPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<any>(null);

  const handleCheckIn = async () => {
    if (!searchPhone || !db) return;
    setLoading(true);
    setVerifiedMember(null);

    try {
      const docRef = doc(db, 'members', searchPhone);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setVerifiedMember(data);
        
        // Update last check-in timestamp
        updateDoc(docRef, {
          lastCheckIn: serverTimestamp()
        });

        toast({
          title: "Member Found",
          description: `Authenticating ${data.fullName}...`
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
        description: "Could not authenticate member."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="border-primary shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" />
                        Visual Authentication
                    </CardTitle>
                    <CardDescription>
                        Search member ID for photo verification.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Enter Phone Number..." 
                                className="pl-8"
                                value={searchPhone}
                                onChange={(e) => setSearchPhone(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                            />
                        </div>
                        <Button onClick={handleCheckIn} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>

                    {verifiedMember && (
                        <div className="pt-4 animate-in fade-in slide-in-from-top-4">
                            <div className="flex flex-col items-center gap-4 p-4 rounded-xl bg-card border shadow-inner">
                                <div className="relative w-48 aspect-[4/5] rounded-lg overflow-hidden border-4 border-primary/20 shadow-xl">
                                    {verifiedMember.photoData ? (
                                        <img src={verifiedMember.photoData} alt="Member Auth" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground italic text-xs text-center p-4">
                                            No Authentication Photo Available
                                        </div>
                                    )}
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-xl font-bold font-headline">{verifiedMember.fullName}</h3>
                                    <Badge variant={verifiedMember.status === 'active' ? 'default' : 'destructive'}>
                                        {verifiedMember.status === 'active' ? 'ACTIVE ACCESS' : 'FIXED TERM'}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-2">ID: {verifiedMember.phone}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <Button variant="outline" className="text-green-500 hover:text-green-600 border-green-500/20" onClick={() => setVerifiedMember(null)}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Grant Entry
                                    </Button>
                                    <Button variant="outline" className="text-destructive hover:text-destructive border-destructive/20" onClick={() => setVerifiedMember(null)}>
                                        <XCircle className="mr-2 h-4 w-4" /> Deny Access
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Counter Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Button asChild size="lg" className="h-20 flex-col gap-1">
                        <Link href="/admin/register">
                            <UserPlus className="h-6 w-6"/>
                            <span className="text-xs">New Registration</span>
                        </Link>
                    </Button>
                    <Button variant="secondary" size="lg" className="h-20 flex-col gap-1">
                        <Repeat className="h-6 w-6"/>
                        <span className="text-xs">Quick Renewal</span>
                    </Button>
                </CardContent>
            </Card>
        </div>

        <Card className="lg:col-span-7">
            <CardHeader>
                <CardTitle>Recent Entry Logs</CardTitle>
                <CardDescription>
                    Live feed of member visual authentications.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-xs">18:05:32</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">John Doe</span>
                                        <span className="text-[10px] text-muted-foreground">ID: 1234567890</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Authenticated</Badge>
                                </TableCell>
                                <TableCell className="text-right text-[10px] text-muted-foreground italic">Entry Granted</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-xs">17:55:03</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">Jane Smith</span>
                                        <span className="text-[10px] text-muted-foreground">ID: 0987654321</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Denied</Badge>
                                </TableCell>
                                <TableCell className="text-right text-[10px] text-muted-foreground italic">Term Expired</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

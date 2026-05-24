
'use client';

import { useMemo, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserCog, 
  Loader2, 
  CheckCircle2, 
  Info,
  UserPlus
} from 'lucide-react';
import { collection, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useProfile } from '@/firebase';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SystemUsersPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const usersRef = useMemo(() => db ? query(collection(db, 'users')) : null, [db]);
  const { data: users, loading: usersLoading } = useCollection<any>(usersRef);

  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'staff') => {
    if (!db || !isAdmin) return;
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Role Updated", description: `Permission changed to ${newRole}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Access Denied", description: "Could not update user role." });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin && !profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold uppercase tracking-tighter">Access Forbidden</h2>
        <p className="text-muted-foreground text-sm">System user management is restricted to Administrators.</p>
      </div>
    );
  }

  if (profileLoading || usersLoading) {
    return (
      <div className="flex h-60 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline uppercase tracking-tighter text-primary">System Access Control</h1>
        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">Staff & Admin Management</p>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Account Creation Guide</AlertTitle>
        <AlertDescription className="text-xs">
          To add a new member of your team: 
          1. Create their email/password account in the <b>Firebase Console</b>. 
          2. After they log in for the first time, their profile will appear here. 
          3. Use this panel to assign them <b>Admin</b> or <b>Staff</b> privileges.
        </AlertDescription>
      </Alert>

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 py-6 px-8">
           <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
             <UserCog className="h-4 w-4 text-primary" /> Registered Personnel
           </CardTitle>
           <CardDescription>Manage internal roles and facility permissions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.01]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">User Name</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Work Email</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">System Role</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? users.map((u: any) => (
                <TableRow key={u.id} className="border-white/5 hover:bg-white/[0.01] transition-colors">
                  <TableCell className="pl-8 font-bold text-sm">{u.name || 'Anonymous User'}</TableCell>
                  <TableCell className="text-xs opacity-60 font-mono">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className={cn(
                      "text-[9px] font-black uppercase tracking-widest border-none px-2",
                      u.role === 'admin' ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40"
                    )}>
                      {u.role === 'admin' ? <ShieldCheck className="h-2.5 w-2.5 mr-1" /> : null}
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Select 
                      disabled={updatingId === u.id} 
                      value={u.role} 
                      onValueChange={(val: any) => handleUpdateRole(u.id, val)}
                    >
                      <SelectTrigger className="h-8 w-32 bg-black/20 border-white/5 text-[10px] font-black uppercase tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                   <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic uppercase tracking-widest opacity-20 text-xs">
                     No users registered in cloud ledger
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

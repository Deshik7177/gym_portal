'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  UserCircle, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Users, 
  User, 
  ArrowUpRight, 
  Loader2, 
  Trash2, 
  Plus, 
  Calendar as CalendarIcon,
  CreditCard
} from 'lucide-react';
import { collection, query, doc, deleteDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';

export default function MembersListPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action States
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [memberForPT, setMemberForPT] = useState<any>(null);
  const [isUpdatingPT, setIsUpdatingPT] = useState(false);
  
  // PT Dialog States
  const [ptPrice, setPtPrice] = useState('');
  const [ptStartDate, setPtStartDate] = useState<Date | undefined>(undefined);
  const [ptEndDate, setPtEndDate] = useState<Date | undefined>(undefined);
  const [isPtStartDateOpen, setIsPtStartDateOpen] = useState(false);
  const [isPtEndDateOpen, setIsPtEndDateOpen] = useState(false);

  const membersRef = useMemo(() => db ? query(collection(db, 'members')) : null, [db]);
  const { data: members, loading } = useCollection<any>(membersRef);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(m => 
      m.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.phone?.includes(searchTerm)
    );
  }, [members, searchTerm]);

  const stats = useMemo(() => {
    if (!members) return { total: 0, group: 0, personal: 0, active: 0, nonActive: 0 };
    return {
      total: members.length,
      group: members.filter(m => m.type === 'group').length,
      personal: members.filter(m => m.type === 'personal').length,
      active: members.filter(m => m.status === 'active').length,
      nonActive: members.filter(m => m.status === 'non-active').length
    };
  }, [members]);

  const handleDeleteMember = () => {
    if (!db || !memberToDelete) return;

    const docRef = doc(db, 'members', memberToDelete.phone);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Member Deleted", description: `${memberToDelete.fullName} has been removed.` });
        setMemberToDelete(null);
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleAddPT = () => {
    if (!db || !memberForPT) return;
    setIsUpdatingPT(true);

    const docRef = doc(db, 'members', memberForPT.phone);
    const updateData = {
      type: 'personal',
      price: parseFloat(ptPrice) || memberForPT.price,
      startDate: ptStartDate ? format(ptStartDate, 'yyyy-MM-dd') : memberForPT.startDate || null,
      endDate: ptEndDate ? format(ptEndDate, 'yyyy-MM-dd') : memberForPT.endDate || null,
      updatedAt: serverTimestamp(),
    };

    updateDoc(docRef, updateData)
      .then(() => {
        const saleData = {
          memberId: memberForPT.phone,
          memberName: memberForPT.fullName,
          amount: parseFloat(ptPrice) || 0,
          date: new Date().toISOString().split('T')[0],
          category: 'personal training',
          description: `PT Package: ${ptStartDate ? format(ptStartDate, 'MMM dd') : 'Today'} to ${ptEndDate ? format(ptEndDate, 'MMM dd') : 'End'}`,
          createdAt: serverTimestamp()
        };
        
        addDoc(collection(db, 'sales'), saleData).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'sales',
            operation: 'create',
            requestResourceData: saleData,
          }));
        });

        toast({ 
          title: "PT Membership Added", 
          description: `${memberForPT.fullName} is now enrolled in Personal Training.` 
        });
        setMemberForPT(null);
        setPtPrice('');
        setPtStartDate(undefined);
        setPtEndDate(undefined);
      })
      .catch(async (e) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsUpdatingPT(false));
  };

  if (loading) {
    return (
      <div className="flex h-60 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Member Directory</h1>
          <p className="text-muted-foreground">Manage all registered gym members.</p>
        </div>
        <Button asChild>
          <Link href="/admin/register">
            Register New Member
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
         <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                   Total Members
                   <Users className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Database count</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Group Training
                  <Users className="h-4 w-4 text-primary" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{stats.group}</div>
                <p className="text-xs text-muted-foreground">Active group subs</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  Personal Training
                  <User className="h-4 w-4 text-accent" />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{stats.personal}</div>
                <p className="text-xs text-muted-foreground">Personal training sessions</p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Badge variant="outline" className="h-8">Active: {stats.active}</Badge>
            <Badge variant="outline" className="h-8">Non-Active: {stats.nonActive}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Phone / ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <TableRow key={member.phone}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {member.photoData ? (
                            <img src={member.photoData} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">{member.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{member.phone}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status === 'active' ? 'Active' : 'Non-Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${member.type === 'group' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                          {member.type}
                        </span>
                        {member.type !== 'personal' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full bg-accent/5 hover:bg-accent/20 text-accent"
                            onClick={() => setMemberForPT(member)}
                            title="Add Personal Training"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.status === 'active' ? 'Ongoing' : member.endDate || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/admin/register?edit=${member.phone}`)}>
                            <ArrowUpRight className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMemberForPT(member)}>
                            <CreditCard className="mr-2 h-4 w-4" /> Add PT Session
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setMemberToDelete(member)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No members found in directory.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <b>{memberToDelete?.fullName}</b> and all their records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add PT Dialog */}
      <Dialog open={!!memberForPT} onOpenChange={() => setMemberForPT(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Personal Training</DialogTitle>
            <DialogDescription>
              Upgrade <b>{memberForPT?.fullName}</b> to Personal Training membership.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>PT Package Price (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                <Input 
                  type="number" 
                  className="pl-7" 
                  placeholder="0.00" 
                  value={ptPrice}
                  onChange={(e) => setPtPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 flex flex-col">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <CalendarIcon className="h-3 w-3" /> Start
                </Label>
                <Popover open={isPtStartDateOpen} onOpenChange={setIsPtStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !ptStartDate && "text-muted-foreground"
                      )}
                    >
                      {ptStartDate ? format(ptStartDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={ptStartDate}
                      onSelect={(date) => {
                        setPtStartDate(date);
                        setIsPtStartDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2 flex flex-col">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <CalendarIcon className="h-3 w-3" /> End
                </Label>
                <Popover open={isPtEndDateOpen} onOpenChange={setIsPtEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !ptEndDate && "text-muted-foreground"
                      )}
                    >
                      {ptEndDate ? format(ptEndDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={ptEndDate}
                      onSelect={(date) => {
                        setPtEndDate(date);
                        setIsPtEndDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberForPT(null)}>Cancel</Button>
            <Button onClick={handleAddPT} disabled={isUpdatingPT}>
              {isUpdatingPT ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Assign PT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

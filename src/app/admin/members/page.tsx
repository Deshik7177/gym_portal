
'use client';

import { useState, useMemo } from 'react';
import { Search, UserCircle, MoreHorizontal, Mail, Phone, Users, User, ArrowUpRight, Loader2 } from 'lucide-react';
import { collection, query } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import Link from 'next/link';

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

export default function MembersListPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

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
                      <span className={`text-xs px-2 py-1 rounded-full ${member.type === 'group' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                        {member.type}
                      </span>
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
                          <DropdownMenuLabel>Member Ops</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/register?edit=${member.phone}`}>
                              <ArrowUpRight className="mr-2 h-4 w-4" /> Edit Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> View History</DropdownMenuItem>
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
    </div>
  );
}


'use client';

import { useState } from 'react';
import { Search, UserCircle, MoreHorizontal, Mail, Phone, Users, User, ArrowUpRight } from 'lucide-react';

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
import Link from 'next/link';

const MOCK_MEMBERS = [
  { phone: '1234567890', name: 'John Doe', status: 'active', type: 'group', expiry: 'N/A', joined: '2024-01-10' },
  { phone: '0987654321', name: 'Jane Smith', status: 'non-active', type: 'personal', expiry: '2024-06-15', joined: '2024-03-22' },
  { phone: '5551234567', name: 'Mike Johnson', status: 'active', type: 'group', expiry: 'N/A', joined: '2023-11-05' },
  { phone: '4449876543', name: 'Emily Davis', status: 'non-active', type: 'personal', expiry: '2024-05-30', joined: '2024-04-12' },
  { phone: '1112223333', name: 'Robert Brown', status: 'active', type: 'group', expiry: 'N/A', joined: '2024-02-15' },
];

export default function MembersListPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = MOCK_MEMBERS.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone.includes(searchTerm)
  );

  const groupCount = MOCK_MEMBERS.filter(m => m.type === 'group').length;
  const personalCount = MOCK_MEMBERS.filter(m => m.type === 'personal').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Member Directory</h1>
          <p className="text-muted-foreground">Complete list of registered gym members and analytics.</p>
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
                <div className="text-3xl font-bold">{MOCK_MEMBERS.length}</div>
                <p className="text-xs text-muted-foreground">All time registrations</p>
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
                <div className="text-3xl font-bold">{groupCount}</div>
                <p className="text-xs text-muted-foreground">{(groupCount/MOCK_MEMBERS.length * 100).toFixed(0)}% of directory</p>
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
                <div className="text-3xl font-bold">{personalCount}</div>
                <p className="text-xs text-muted-foreground">{(personalCount/MOCK_MEMBERS.length * 100).toFixed(0)}% of directory</p>
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
            <Badge variant="outline" className="h-8">Active: {MOCK_MEMBERS.filter(m => m.status === 'active').length}</Badge>
            <Badge variant="outline" className="h-8">Non-Active: {MOCK_MEMBERS.filter(m => m.status === 'non-active').length}</Badge>
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
                <TableHead>Expiry / Renewal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.phone}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status === 'active' ? 'Unlimited' : 'Fixed Term'}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    <span className={`text-xs px-2 py-1 rounded-full ${member.type === 'group' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                      {member.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{member.expiry}</TableCell>
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
                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

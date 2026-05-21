
'use client';

import { useState } from 'react';
import { Search, UserCircle, MoreHorizontal, Mail, Phone } from 'lucide-react';

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

const MOCK_MEMBERS = [
  { phone: '1234567890', name: 'John Doe', status: 'active', type: 'group', expiry: 'N/A' },
  { phone: '0987654321', name: 'Jane Smith', status: 'non-active', type: 'personal', expiry: '2024-06-15' },
  { phone: '5551234567', name: 'Mike Johnson', status: 'active', type: 'group', expiry: 'N/A' },
  { phone: '4449876543', name: 'Emily Davis', status: 'non-active', type: 'personal', expiry: '2024-05-30' },
];

export default function MembersListPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = MOCK_MEMBERS.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Members List</h1>
          <p className="text-muted-foreground">Manage gym membership profiles and analytics.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold">{MOCK_MEMBERS.length}</p>
            <p className="text-xs text-muted-foreground">Total Count</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Group Training</CardTitle>
                <CardDescription>Members in group sessions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">850</div>
                <p className="text-xs text-muted-foreground">68% of total</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Personal Training</CardTitle>
                <CardDescription>One-on-one coaching</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">398</div>
                <p className="text-xs text-muted-foreground">32% of total</p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.phone}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{member.type}</TableCell>
                  <TableCell>{member.expiry}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> Email Member</DropdownMenuItem>
                        <DropdownMenuItem><Phone className="mr-2 h-4 w-4" /> Call Member</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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

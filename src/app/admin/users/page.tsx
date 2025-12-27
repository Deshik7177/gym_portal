import { MoreHorizontal, PlusCircle } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';


const users = [
    { id: 'USR001', name: 'John Doe', email: 'john.d@example.com', status: 'Active', plan: 'Annual Gold', expiry: '2025-05-15' },
    { id: 'USR002', name: 'Jane Smith', email: 'jane.s@example.com', status: 'Expired', plan: 'Monthly Basic', expiry: '2024-04-30' },
    { id: 'USR003', name: 'Mike Johnson', email: 'mike.j@example.com', status: 'Active', plan: 'Quarterly Pro', expiry: '2024-08-20' },
    { id: 'USR004', name: 'Emily Brown', email: 'emily.b@example.com', status: 'Suspended', plan: 'Annual Gold', expiry: '2025-01-10' },
    { id: 'USR005', name: 'Chris Wilson', email: 'chris.w@example.com', status: 'Active', plan: 'Monthly Basic', expiry: '2024-06-25' },
];

export default function AdminUsersPage() {
  return (
    <Tabs defaultValue="all">
    <div className="flex items-center">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="expired">Expired</TabsTrigger>
        <TabsTrigger value="suspended" className="hidden sm:flex">
          Suspended
        </TabsTrigger>
      </TabsList>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add User
          </span>
        </Button>
      </div>
    </div>
    <TabsContent value="all">
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Manage your gym members and view their details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>
                  <Badge 
                    variant={user.status === 'Active' ? 'default' : user.status === 'Expired' ? 'destructive' : 'secondary'}
                    className={user.status === 'Active' ? 'bg-[#2E7D32] hover:bg-[#2E7D32]/80 text-white' : ''}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{user.plan}</TableCell>
                <TableCell>{user.expiry}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Suspend</DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </TabsContent>
    </Tabs>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { History, Search, Filter, Calendar as CalendarIcon, User, QrCode, Zap, Loader2, X } from 'lucide-react';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AttendanceLogsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const attendanceRef = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(100));
  }, [db]);

  const { data: logs, loading } = useCollection<any>(attendanceRef);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const matchesSearch = log.memberName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             log.memberId?.includes(searchTerm);
      const matchesMethod = methodFilter === 'all' || log.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [logs, searchTerm, methodFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setMethodFilter('all');
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
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-headline uppercase tracking-tighter text-primary">Entry Audit</h1>
        <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase opacity-60">Historical Attendance Records</p>
      </div>

      <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-6">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member name or ID..."
                className="pl-10 h-11 bg-black/20 border-white/5 focus:border-primary/50 rounded-xl w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-11 bg-black/20 border-white/5 rounded-xl lg:w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 opacity-40" />
                    <SelectValue placeholder="All Methods" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="face">Face Recognition</SelectItem>
                  <SelectItem value="qr">QR Scanner</SelectItem>
                  <SelectItem value="manual">Manual Staff</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm || methodFilter !== 'all') && (
                <Button variant="ghost" size="icon" onClick={resetFilters} className="h-11 w-11 hover:bg-destructive/10 hover:text-destructive rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead className="pl-8 font-black uppercase text-[9px] tracking-[0.3em]">Timestamp</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Member</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">ID Reference</TableHead>
                <TableHead className="font-black uppercase text-[9px] tracking-[0.3em]">Auth Method</TableHead>
                <TableHead className="text-right pr-8 font-black uppercase text-[9px] tracking-[0.3em]">Score/Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-2 text-xs font-mono opacity-60">
                      <CalendarIcon className="h-3 w-3" />
                      {log.timestamp ? format(log.timestamp.toDate(), 'MMM dd, HH:mm:ss') : 'Just now'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{log.memberName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] opacity-40">{log.memberId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.method === 'face' ? (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase px-2">
                          <Zap className="h-2.5 w-2.5 mr-1" /> Face
                        </Badge>
                      ) : log.method === 'qr' ? (
                        <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20 text-[9px] font-black uppercase px-2">
                          <QrCode className="h-2.5 w-2.5 mr-1" /> QR Code
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 text-[9px] font-black uppercase px-2">
                           Manual
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    {log.score ? (
                      <span className="text-[10px] font-black text-primary opacity-60">
                        {(log.score * 100).toFixed(0)}% Match
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-green-500 opacity-60 uppercase">Verified</span>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center text-muted-foreground opacity-30 italic font-medium uppercase tracking-[0.2em]">
                    No entry logs found matching your filters
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

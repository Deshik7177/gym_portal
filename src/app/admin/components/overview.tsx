
"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useFirestore, useCollection } from "@/firebase"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  total: {
    label: "Check-ins",
    color: "hsl(var(--primary))",
  },
};

export function Overview() {
  const db = useFirestore();
  
  // Fetch the last 500 attendance logs to calculate peak hours
  const attendanceRef = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(500));
  }, [db]);

  const { data: logs } = useCollection<any>(attendanceRef);

  const chartData = useMemo(() => {
    // Standard gym hours buckets
    const hoursMap: { [key: number]: number } = {
      6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0,
      16: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0
    };

    if (logs) {
      logs.forEach((log: any) => {
        const timestamp = log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000) : null;
        if (timestamp) {
          const hour = timestamp.getHours();
          if (hoursMap[hour] !== undefined) {
            hoursMap[hour]++;
          }
        }
      });
    }

    // Format for Recharts
    const formatHour = (h: number) => {
      if (h < 12) return `${h}am`;
      if (h === 12) return `12pm`;
      return `${h - 12}pm`;
    };

    return Object.entries(hoursMap).map(([hour, count]) => ({
      name: formatHour(parseInt(hour)),
      total: count
    }));
  }, [logs]);

  return (
    <Card className="col-span-4 shadow-md border-border/40">
      <CardHeader>
        <CardTitle className="text-xl font-black font-headline tracking-tight uppercase italic">Peak Usage Hours</CardTitle>
        <CardDescription>
          Real-time analysis of member traffic distribution.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <BarChart accessibilityLayer data={chartData}>
            <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                className="font-black uppercase tracking-tighter"
            />
            <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                className="font-mono opacity-40"
            />
            <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(var(--accent) / 0.05)' }}
             />
            <Bar 
              dataKey="total" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
              className="drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]"
            />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

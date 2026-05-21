
"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip } from "recharts"

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
  // Use useMemo to prevent unnecessary re-calculations and Math.random during hydration
  const data = useMemo(() => {
    const hours = ["6am", "7am", "8am", "9am", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm"];
    return hours.map(h => ({
      name: h,
      total: Math.floor(Math.random() * 75) + 5
    }));
  }, []);

  return (
    <Card className="col-span-4 shadow-md">
      <CardHeader>
        <CardTitle>Peak Usage Hours</CardTitle>
        <CardDescription>
          An overview of member check-ins throughout the day.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <BarChart accessibilityLayer data={data}>
            <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
            />
            <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
             />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

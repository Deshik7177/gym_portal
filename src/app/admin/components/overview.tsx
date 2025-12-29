"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { name: "6am", total: 0 },
  { name: "7am", total: 0 },
  { name: "8am", total: 0 },
  { name: "9am", total: 0 },
  { name: "4pm", total: 0 },
  { name: "5pm", total: 0 },
  { name: "6pm", total: 0 },
  { name: "7pm", total: 0 },
  { name: "8pm", total: 0 },
  { name: "9pm", total: 0 },
];

const chartConfig = {
  total: {
    label: "Check-ins",
    color: "hsl(var(--primary))",
  },
};


export function Overview() {
  const [data, setData] = useState(chartData);

  useEffect(() => {
    setData(chartData.map(item => ({
      ...item,
      total: Math.floor(Math.random() * 75) + 5
    })));
  }, []);

  return (
    <Card className="col-span-4">
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
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
            />
            <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
             />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

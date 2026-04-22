"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisStyle = {
  fill: "rgba(255,255,255,0.56)",
  fontSize: 12,
};

const tooltipStyle = {
  backgroundColor: "#101b2f",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1rem",
  color: "#fff",
};

export function WeeklySpendChart({
  data,
  dataKey,
  color,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisStyle} />
          <YAxis axisLine={false} tickLine={false} tick={axisStyle} width={40} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[10, 10, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CommunityGrowthChart({
  data,
  activeKeys,
}: {
  data: Array<Record<string, string | number | null>>;
  activeKeys: Array<{ key: string; color: string; label: string }>;
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisStyle} />
          <YAxis axisLine={false} tickLine={false} tick={axisStyle} width={48} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#fff" }} />
          <Legend />
          {activeKeys.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2.4}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

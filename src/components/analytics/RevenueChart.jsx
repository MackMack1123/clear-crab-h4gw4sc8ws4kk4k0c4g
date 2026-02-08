import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

// Custom tooltip component - must be defined outside to avoid hook issues
function ChartTooltip({ active, payload, label, formatValue }) {
    if (active && payload && payload.length) {
        const formattedValue = formatValue ? formatValue(payload[0].value) : `$${payload[0].value.toLocaleString()}`;
        return (
            <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900">{formattedValue}</p>
                {payload[0].payload.count !== undefined && (
                    <p className="text-sm text-gray-500">{payload[0].payload.count} sponsorships</p>
                )}
            </div>
        );
    }
    return null;
}

// Format date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RevenueChart({
    data = [],
    type = 'area', // 'area' or 'bar'
    dataKey = 'revenue',
    color = '#6366f1', // primary color
    height = 300,
    showGrid = true,
    formatValue = (v) => `$${v.toLocaleString()}`,
    formatYAxis
}) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl">
                <p className="text-gray-400">No data available</p>
            </div>
        );
    }

    const Chart = type === 'bar' ? BarChart : AreaChart;

    return (
        <ResponsiveContainer width="100%" height={height}>
            <Chart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                />
                <YAxis
                    tickFormatter={formatYAxis || ((v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`)}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                />
                <Tooltip content={<ChartTooltip formatValue={formatValue} />} />
                {type === 'bar' ? (
                    <Bar
                        dataKey={dataKey}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                    />
                ) : (
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        fill={`${color}20`}
                    />
                )}
            </Chart>
        </ResponsiveContainer>
    );
}


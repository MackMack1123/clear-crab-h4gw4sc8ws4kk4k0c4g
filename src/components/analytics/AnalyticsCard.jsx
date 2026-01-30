import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function AnalyticsCard({
    title,
    value,
    subtitle,
    trend, // 'up', 'down', or 'neutral'
    trendValue,
    icon: Icon,
    color = 'text-gray-900',
    bgColor = 'bg-white'
}) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

    return (
        <div className={`${bgColor} rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</span>
                {Icon && <Icon className={`w-5 h-5 ${color} opacity-70`} />}
            </div>
            <div className="space-y-1">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                {(subtitle || trendValue) && (
                    <div className="flex items-center gap-2">
                        {trendValue && (
                            <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                                <TrendIcon className="w-4 h-4" />
                                {trendValue}
                            </span>
                        )}
                        {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

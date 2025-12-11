'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface UsageStats {
    downloads: number;
    ai_calls: number;
    downloadsLimit: number;
    aiCallsLimit: number;
    plan: string;
}

export function UsageMeter() {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsageStats();
    }, []);

    const fetchUsageStats = async () => {
        try {
            const response = await fetch('/api/usage/stats');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch usage stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const downloadsPercent = (stats.downloads / stats.downloadsLimit) * 100;
    const aiCallsPercent = (stats.ai_calls / stats.aiCallsLimit) * 100;

    const showWarning = downloadsPercent > 80 || aiCallsPercent > 80;

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
            <h3 className="font-semibold text-lg">Usage (Last 30 Days)</h3>

            {/* Downloads */}
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Records Downloaded</span>
                    <span className="font-medium">
                        {stats.downloads.toLocaleString()} / {stats.downloadsLimit.toLocaleString()}
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${downloadsPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                        style={{ width: `${Math.min(downloadsPercent, 100)}%` }}
                    />
                </div>
            </div>

            {/* AI Calls */}
            <div>
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">AI Questions Asked</span>
                    <span className="font-medium">
                        {stats.ai_calls.toLocaleString()} / {stats.aiCallsLimit.toLocaleString()}
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${aiCallsPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(aiCallsPercent, 100)}%` }}
                    />
                </div>
            </div>

            {/* Warning */}
            {showWarning && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Approaching your limit
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            Upgrade your plan to continue using the service without interruption.
                        </p>
                        <Link
                            href="/pricing"
                            className="inline-block mt-2 text-xs font-medium text-yellow-800 dark:text-yellow-200 hover:underline"
                        >
                            View Plans →
                        </Link>
                    </div>
                </div>
            )}

            {/* Plan Info */}
            <div className="pt-2 border-t text-xs text-gray-500 dark:text-gray-400">
                Current plan: <span className="font-medium capitalize">{stats.plan.replace('_', ' ')}</span>
            </div>
        </div>
    );
}

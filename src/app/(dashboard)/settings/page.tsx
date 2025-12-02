'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Mock data - will be replaced with real data from Supabase
const PLAN_CHOICES = [
    { name: 'Small', topKCap: 100, desc: 'Top-K up to 100' },
    { name: 'Medium', topKCap: 500, desc: 'Top-K up to 500' },
    { name: 'Large', topKCap: 5000, desc: 'Top-K up to 5,000' },
] as const;

type PlanName = (typeof PLAN_CHOICES)[number]['name'];

const INITIAL_PLAN: { name: PlanName; topKCap: number } = { name: 'Medium', topKCap: 500 };

const DOWNLOADS: Array<{
    id: string;
    type: 'Lookalike CSV' | 'Q&A CSV';
    selection: string;
    createdAt: string;
    expiresAt: string;
    size: string;
}> = [
        {
            id: 'dl_01',
            type: 'Lookalike CSV',
            selection: 'sel_02',
            createdAt: '2025-10-10T15:09:00Z',
            expiresAt: '2025-10-17T15:09:00Z',
            size: '148 KB',
        },
        {
            id: 'dl_02',
            type: 'Q&A CSV',
            selection: 'sel_01',
            createdAt: '2025-10-12T10:02:00Z',
            expiresAt: '2025-10-19T10:02:00Z',
            size: '392 KB',
        },
    ];

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-3 text-lg font-semibold">{children}</h2>;
}

export default function SettingsPage() {
    const [plan, setPlan] = useState<PlanName>(INITIAL_PLAN.name);
    const [emailNotifs, setEmailNotifs] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<string>('overview');

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
                    <div className="font-semibold tracking-tight">⚙️ Settings</div>
                    <div className="ml-auto flex items-center gap-2">
                        <div className="text-sm text-gray-600">Signed in as</div>
                        <div className="text-sm font-medium">you@example.com</div>
                        <div className="h-6 w-px bg-gray-200" />
                        <Link href="/api/auth/signout">
                            <Button variant="outline" size="sm">
                                Sign out
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-12 gap-6">
                {/* Left nav */}
                <nav className="col-span-12 md:col-span-3">
                    <div className="rounded-2xl border bg-white p-3 shadow-sm">
                        <ul className="text-sm">
                            <li>
                                <button
                                    onClick={() => setActiveSection('overview')}
                                    className={`block w-full text-left px-3 py-2 rounded-lg ${activeSection === 'overview'
                                        ? 'bg-gray-900 text-white'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    Overview
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveSection('plan')}
                                    className={`block w-full text-left px-3 py-2 rounded-lg ${activeSection === 'plan' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    Plan
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveSection('notifications')}
                                    className={`block w-full text-left px-3 py-2 rounded-lg ${activeSection === 'notifications'
                                        ? 'bg-gray-900 text-white'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    Notifications
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveSection('downloads')}
                                    className={`block w-full text-left px-3 py-2 rounded-lg ${activeSection === 'downloads'
                                        ? 'bg-gray-900 text-white'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    Ready to download
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>

                {/* Right content */}
                <main className="col-span-12 md:col-span-9 space-y-6">
                    {/* Overview */}
                    {activeSection === 'overview' && (
                        <section className="rounded-2xl border bg-white p-4 shadow-sm">
                            <SectionTitle>Overview</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl border p-4">
                                    <div className="text-sm text-gray-600">Current plan</div>
                                    <div className="font-semibold mt-1">{plan}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        Top-K cap: {PLAN_CHOICES.find((p) => p.name === plan)?.topKCap}
                                    </div>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <div className="text-sm text-gray-600">Downloads ready</div>
                                    <div className="font-semibold mt-1">{DOWNLOADS.length}</div>
                                    <div className="text-xs text-gray-600 mt-1">Expire after 7 days</div>
                                </div>
                                <div className="rounded-xl border p-4">
                                    <div className="text-sm text-gray-600">Status</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        Email notifications: <b>{emailNotifs ? 'On' : 'Off'}</b>
                                    </div>
                                    <div className="text-xs text-gray-600">Billing handled in-app</div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Plan */}
                    {activeSection === 'plan' && (
                        <section className="rounded-2xl border bg-white p-4 shadow-sm">
                            <SectionTitle>Plan</SectionTitle>
                            <p className="text-sm text-gray-600 mb-3">
                                Choose your plan. Changes apply immediately to caps and limits.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {PLAN_CHOICES.map((p) => (
                                    <label
                                        key={p.name}
                                        className={`rounded-xl border p-4 cursor-pointer hover:shadow-sm ${plan === p.name ? 'border-gray-900 ring-2 ring-gray-900' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                name="plan"
                                                className="mt-1"
                                                checked={plan === p.name}
                                                onChange={() => setPlan(p.name)}
                                            />
                                            <div>
                                                <div className="font-semibold">{p.name}</div>
                                                <div className="text-sm text-gray-600">{p.desc}</div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <Button className="rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-black">
                                    Save changes
                                </Button>
                                <span className="text-xs text-gray-600">
                                    Top-K cap will update to {PLAN_CHOICES.find((p) => p.name === plan)?.topKCap}
                                </span>
                            </div>
                        </section>
                    )}

                    {/* Notifications */}
                    {activeSection === 'notifications' && (
                        <section className="rounded-2xl border bg-white p-4 shadow-sm">
                            <SectionTitle>Notifications</SectionTitle>
                            <p className="text-sm text-gray-600 mb-3">
                                Toggle e-mail notifications for: <span className="italic">export ready</span> and{' '}
                                <span className="italic">run ready</span>.
                            </p>

                            <div className="flex items-center justify-between rounded-xl border p-4">
                                <div>
                                    <div className="font-medium">Email notifications</div>
                                    <div className="text-sm text-gray-600">
                                        Receive an email when a CSV export is ready or a Q&A run finishes.
                                    </div>
                                </div>

                                {/* Simple switch */}
                                <button
                                    role="switch"
                                    aria-checked={emailNotifs}
                                    onClick={() => setEmailNotifs((v) => !v)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${emailNotifs ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${emailNotifs ? 'translate-x-5' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <Button className="rounded-lg bg-gray-900 text-white text-sm px-4 py-2 hover:bg-black">
                                    Save preferences
                                </Button>
                                <span className="text-xs text-gray-600">
                                    Current: {emailNotifs ? 'On' : 'Off'}
                                </span>
                            </div>
                        </section>
                    )}

                    {/* Ready to download */}
                    {activeSection === 'downloads' && (
                        <section className="rounded-2xl border bg-white p-4 shadow-sm">
                            <SectionTitle>Ready to download</SectionTitle>
                            <div className="overflow-auto rounded-xl border">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2">
                                                Type
                                            </th>
                                            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2">
                                                Selection
                                            </th>
                                            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2">
                                                Created
                                            </th>
                                            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2">
                                                Expires
                                            </th>
                                            <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2">
                                                Size
                                            </th>
                                            <th className="px-3 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DOWNLOADS.map((d) => (
                                            <tr key={d.id} className="border-t hover:bg-gray-50">
                                                <td className="px-3 py-2">{d.type}</td>
                                                <td className="px-3 py-2">{d.selection}</td>
                                                <td className="px-3 py-2 whitespace-nowrap" suppressHydrationWarning>
                                                    {new Date(d.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap" suppressHydrationWarning>
                                                    {new Date(d.expiresAt).toLocaleString()}
                                                </td>
                                                <td className="px-3 py-2">{d.size}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">Files expire after 7 days.</p>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

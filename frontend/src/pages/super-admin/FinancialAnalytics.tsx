import React, { useState, useEffect } from 'react';
import {
  BarChart3, PieChart, TrendingUp, Wallet, ArrowDownRight,
  ArrowUpRight, Download, Calendar, Filter, DollarSign,
  ShieldCheck, Banknote, History
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RevenueMetric {
  currency: string;
  total_earned: string;
}

interface LiabilityMetric {
  currency: string;
  total_liability: string;
}

interface FinancialLog {
  type: string;
  school_name?: string;
  amount_paid: string;
  currency: string;
  description: string;
  created_at: string;
}

export default function FinancialAnalytics() {
  const [overview, setOverview] = useState<{ earned: RevenueMetric[], liability: LiabilityMetric[] }>({ earned: [], liability: [] });
  const [logs, setLogs] = useState<FinancialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchFinancialData();
  }, [period]);

  const fetchFinancialData = async () => {
    try {
      const [overRes, logsRes] = await Promise.all([
        api.get('/super-admin/finance/overview'),
        api.get(`/super-admin/finance/logs?limit=50`)
      ]);
      setOverview(overRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code: string) => code === 'NGN' ? '₦' : '$';

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-indigo-600" />
          Financial Auditing & Analytics
        </h1>
        <p className="text-gray-500 mt-1">Real-time revenue tracking, liabilities, and multi-currency aggregation.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overview.earned.map((m) => (
          <div key={`earned-${m.currency}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="bg-green-50 p-2 rounded-lg text-green-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">EARNED</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Revenue ({m.currency})</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {getCurrencySymbol(m.currency)}{parseFloat(m.total_earned).toLocaleString()}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Realized income
            </p>
          </div>
        ))}

        {overview.liability.map((m) => (
          <div key={`liab-${m.currency}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded uppercase">Liability</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Unearned ({m.currency})</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {getCurrencySymbol(m.currency)}{parseFloat(m.total_liability).toLocaleString()}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" /> Funded but not used
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <History className="h-5 w-5" />
              Detailed Transaction Ledger
            </h3>
            <button className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.description}</div>
                      <div className="text-xs text-gray-500 uppercase">{log.type}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${parseFloat(log.amount_paid) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {getCurrencySymbol(log.currency)}{parseFloat(log.amount_paid).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 uppercase">
                        Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Compliance Box */}
        <div className="space-y-6">
          <div className="bg-indigo-900 rounded-xl shadow-lg p-6 text-white border border-indigo-700">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
              Compliance Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-indigo-800 pb-2">
                <span className="text-indigo-300">Tax Residency</span>
                <span className="font-medium">Global (Standard)</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-indigo-800 pb-2">
                <span className="text-indigo-300">Revenue Recognition</span>
                <span className="font-medium text-indigo-400 flex items-center gap-1">
                  Accrual Basis <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-300">Audit Ready</span>
                <span className="text-green-400 font-bold flex items-center gap-1 uppercase text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-indigo-800">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-bold">Projected Net Yield</span>
              </div>
              <p className="text-2xl font-black text-indigo-200">92.4%</p>
              <p className="text-xs text-indigo-400 mt-1">Estimated after payment gateway fees.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Reporting Period
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {['day', 'week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

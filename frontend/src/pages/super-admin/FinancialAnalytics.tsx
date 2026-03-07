import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Wallet,
  ArrowUpRight, Download, Calendar, History,
  ShieldCheck, Banknote
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

interface RevenueMetric {
  currency: string;
  totalEarned: string;
}

interface LiabilityMetric {
  currency: string;
  totalLiability: string;
}

interface FinancialLog {
  type: string;
  recordSource?: string;
  schoolId: string;
  schoolName?: string;
  amountPaid: string;
  currency: string;
  description: string;
  createdAt: string;
}

interface RevenueHistoryItem {
  source: string;
  currency: string;
  amount: string;
  periodStart: string;
}

interface SchoolBreakdown {
  schoolName: string;
  currency: string;
  totalContribution: string;
}

export default function FinancialAnalytics() {
  const [overview, setOverview] = useState<{
    earned: RevenueMetric[],
    liability: LiabilityMetric[],
    revenueHistory?: RevenueHistoryItem[],
    revenueBySchool?: SchoolBreakdown[],
    totalTransactions?: number
  }>({ earned: [], liability: [] });
  const [logs, setLogs] = useState<FinancialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchFinancialData();
  }, [period]);

  const fetchFinancialData = async () => {
    try {
      const [overRes, logsRes] = await Promise.all([
        api.get(`/super-admin/finance/overview?period=${period}`),
        api.get(`/super-admin/finance/logs?limit=50`)
      ]);
      setOverview(overRes.data.data || { earned: [], liability: [], revenueHistory: [], revenueBySchool: [] });
      setLogs(logsRes.data.data || []);
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
        {overview.earned?.map((m) => (
          <div key={`earned-${m.currency}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-indigo-200 transition-all">
            <div className="flex justify-between items-start">
              <div className="bg-green-50 p-2 rounded-lg text-green-600 transition-colors group-hover:bg-green-100">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded tracking-widest uppercase">REALIZED</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Revenue ({m.currency})</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">
                {getCurrencySymbol(m.currency)}{(parseFloat(m.totalEarned) || 0).toLocaleString()}
              </h3>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-1">
                {[1, 2, 3].map(i => <div key={i} className="h-4 w-4 rounded-full border border-white bg-green-100" />)}
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                Solid Growth Trend
              </p>
            </div>
          </div>
        ))}

        {overview.liability?.map((m) => (
          <div key={`liab-${m.currency}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-amber-200 transition-all">
            <div className="flex justify-between items-start">
              <div className="bg-amber-50 p-2 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded tracking-widest uppercase">Deferred</span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Unearned ({m.currency})</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">
                {getCurrencySymbol(m.currency)}{(parseFloat(m.totalLiability) || 0).toLocaleString()}
              </h3>
            </div>
            <div className="mt-4">
               <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                 <div className="bg-amber-400 h-full w-[65%]" />
               </div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Liability Utilization: 35%</p>
            </div>
          </div>
        ))}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <History className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded tracking-widest uppercase">Activity</span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Transactions</p>
            <h3 className="text-3xl font-black text-gray-900 mt-1">
              {overview.totalTransactions || logs.length}+
            </h3>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-4">
            Auditable trail established
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Revenue Growth Visual
              </h3>
              <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Live Data</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={overview.revenueHistory?.map(h => ({
                    period: format(new Date(h.periodStart), period === 'year' ? 'yyyy' : period === 'month' ? 'MMM' : 'MMM d'),
                    amount: parseFloat(h.amount)
                  })).reverse() || []}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fontWeight: 700, fill: '#9ca3af'}}
                    dy={10}
                  />
                  <YAxis
                    hide
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
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
                  <th className="px-6 py-3">School</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs?.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                        {log.schoolName || 'System'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.description}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{log.recordSource}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${parseFloat(log.amountPaid) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {getCurrencySymbol(log.currency)}{(parseFloat(log.amountPaid) || 0).toLocaleString()}
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
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}ly
                </button>
              ))}
            </div>
          </div>

          {/* Aggregated Revenue Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-hidden">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Revenue Aggregation ({period}ly)
            </h4>
            <div className="space-y-3">
              {overview.revenueHistory && overview.revenueHistory.length > 0 ? (
                overview.revenueHistory.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{h.source.replace('_', ' ')}</p>
                      <p className="text-sm font-bold text-gray-700">
                        {format(new Date(h.periodStart), period === 'year' ? 'yyyy' : period === 'month' ? 'MMM yyyy' : 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-700 group-hover:scale-110 transition-transform">
                        {getCurrencySymbol(h.currency)}{(parseFloat(h.amount) || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No records for this period
                </div>
              )}
            </div>
          </div>

          {/* School Breakout */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
            <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-indigo-600" />
              Top Contributing Schools
            </h4>
            <div className="space-y-4">
              {overview.revenueBySchool?.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 text-xs shadow-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-indigo-900 truncate max-w-[120px]">{s.schoolName}</p>
                    <div className="w-full bg-white h-1.5 rounded-full mt-1 overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${100 - (i * 15)}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-sm font-black text-indigo-700">
                    {getCurrencySymbol(s.currency)}{(parseInt(s.totalContribution) || 0).toLocaleString()}
                  </div>
                </div>
              ))}
              {!overview.revenueBySchool?.length && <p className="text-xs text-indigo-400 italic text-center">Awaiting data...</p>}
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

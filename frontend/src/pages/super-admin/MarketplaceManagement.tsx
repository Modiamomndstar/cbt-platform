import { useState, useEffect } from 'react';
import {
  ShoppingBag, Gift, ArrowUpRight,
  Package, History, AlertCircle, CheckCircle2
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MarketplaceItem {
  feature_key: string;
  display_name: string;
  credit_cost: number;
  item_type: string;
  category: string;
  is_active: boolean;
}

interface PurchaseLog {
  id: string;
  school_name: string;
  feature_key: string;
  credits: number;
  created_at: string;
  type: string;
}

export default function MarketplaceManagement() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [history, setHistory] = useState<PurchaseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGifting, setIsGifting] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);

  // Gifting State
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [giftQuantity, setGiftQuantity] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pricingRes, historyRes, schoolsRes] = await Promise.all([
        api.get('/super-admin/marketplace'),
        api.get('/super-admin/finance/logs?limit=20'), // Simplified for now
        api.get('/super-admin/schools')
      ]);
      setItems(pricingRes.data.data || []);
      setHistory(historyRes.data.data || []);
      setSchools(schoolsRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const handleGift = async () => {
    if (!selectedSchool || !selectedItem) return toast.error('Please select both a school and an item');

    try {
      setIsGifting(true);
      await api.post('/super-admin/marketplace/gift', {
        schoolId: selectedSchool,
        featureKey: selectedItem,
        quantity: giftQuantity
      });
      toast.success('Item gifted successfully!');
      fetchData();
      setSelectedItem('');
      setGiftQuantity(1);
    } catch (err) {
      toast.error('Failed to gift item');
    } finally {
      setIsGifting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-indigo-600" />
            Marketplace Management
          </h1>
          <p className="text-gray-500 mt-1">Monitor inventory, purchase trends, and manual distributions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory & Pricing
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Feature</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Cost (Credits)</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.feature_key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.display_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-indigo-600">
                      {item.credit_cost}
                    </td>
                    <td className="px-6 py-4">
                      {item.is_active ? (
                        <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1 text-sm font-medium">
                          <AlertCircle className="h-4 w-4" /> Disabled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Purchase history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <History className="h-5 w-5" />
                Global Purchase History
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">School</th>
                    <th className="px-6 py-3 text-right">Spent</th>
                    <th className="px-6 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{log.school_name || 'School'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-red-600 font-medium">-{log.credits} Cr</span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-500 uppercase">{log.feature_key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gifting Tools */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Gift className="h-6 w-6" />
              Gift Marketplace Item
            </h3>
            <p className="text-indigo-100 text-sm mb-6">
              Manually distribute marketplace features to schools for promotion or goodwill. No credits will be deducted.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wider">Target School</label>
                <select
                  className="w-full bg-indigo-500/30 border border-indigo-400 rounded-lg p-2.5 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                >
                  <option value="" className="text-gray-900">Select a school...</option>
                  {schools.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wider">Item to Gift</label>
                <select
                  className="w-full bg-indigo-500/30 border border-indigo-400 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                >
                  <option value="" className="text-gray-900">Select feature...</option>
                  {items.map(i => <option key={i.feature_key} value={i.feature_key} className="text-gray-900">{i.display_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1 uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-indigo-500/30 border border-indigo-400 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  value={giftQuantity}
                  onChange={(e) => setGiftQuantity(parseInt(e.target.value))}
                />
              </div>

              <button
                onClick={handleGift}
                disabled={isGifting}
                className="w-full bg-white text-indigo-700 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {isGifting ? 'Processing...' : (
                  <>
                    <ArrowUpRight className="h-5 w-5" />
                    Distribute Gift
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-amber-900 block mb-1">Accounting Note:</span>
              <p className="text-amber-800">
                Gifts do not generate "Earned Revenue" but are logged in the audit trail for financial transparency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

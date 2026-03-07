import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { billingAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  CreditCard,
  Bitcoin,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ShieldCheck,
  Zap,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface PaymentConfig {
    crypto: {
        address: string;
        network: string;
    };
    credits: {
        priceUsd: number;
        priceNgn: number;
    };
}

export default function CheckoutPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [config, setConfig] = useState<PaymentConfig | null>(null);
    const [step, setStep] = useState(1); // 1: Provider Selection, 2: Payment/Instructions, 3: Success
    const [provider, setProvider] = useState<'stripe' | 'paystack' | 'crypto' | null>(null);
    const [transactionHash, setTransactionHash] = useState('');

    const type = searchParams.get('type') as 'upgrade' | 'credits';
    const planType = searchParams.get('planType');
    const creditAmount = parseInt(searchParams.get('amount') || '0');
    const billingCycle = (searchParams.get('cycle') as 'monthly' | 'yearly') || 'monthly';

    const [checkoutDetails, setCheckoutDetails] = useState<any>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await billingAPI.getPaymentConfig();
            if (res.data.success) {
                setConfig(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load payment configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleInitialize = async (selectedProvider: 'stripe' | 'paystack' | 'crypto') => {
        setProvider(selectedProvider);
        setInitializing(true);
        try {
            const res = await billingAPI.initializeCheckout({
                type,
                planType: planType || undefined,
                creditAmount: creditAmount || undefined,
                provider: selectedProvider,
                billingCycle
            });

            if (res.data.success) {
                setCheckoutDetails(res.data.data);

                if (selectedProvider === 'paystack' && res.data.data.authorizationUrl) {
                    window.location.href = res.data.data.authorizationUrl;
                    return;
                }

                if (selectedProvider === 'stripe' && res.data.data.clientSecret) {
                    // In a real app, you'd mount Stripe Elements here
                    // For this demo, we'll simulate or redirect if using Checkout
                    toast.info('Stripe Checkout is being initialized...');
                    // window.location.href = ...;
                }

                setStep(2);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to initialize checkout');
        } finally {
            setInitializing(false);
        }
    };

    const handleSubmitCrypto = async () => {
        if (!transactionHash.trim()) {
            toast.error('Please enter your transaction hash');
            return;
        }

        setInitializing(true);
        try {
            const res = await billingAPI.submitCryptoProof({
                amount: checkoutDetails.amount,
                transactionHash,
                type,
                planType: planType || undefined,
                credits: creditAmount || undefined,
                billingCycle
            });

            if (res.data.success) {
                setStep(3);
                toast.success('Payment proof submitted successfully!');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Submission failed');
        } finally {
            setInitializing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                <p className="text-gray-500 font-medium tracking-tight">Preparing secure checkout...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 pt-8 px-4">
            <div className="max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6 hover:bg-slate-200 gap-2"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Billing
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Checkout Steps */}
                    <div className="lg:col-span-2 space-y-6">
                        {step === 1 && (
                            <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden">
                                <CardHeader className="bg-white border-b p-8">
                                    <CardTitle className="text-2xl font-black tracking-tight text-gray-900">Select Payment Method</CardTitle>
                                    <CardDescription>Choose how you would like to pay for your {type === 'upgrade' ? 'plan upgrade' : 'credits'}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4">
                                    <ProviderButton
                                        id="paystack"
                                        title="Paystack (NGN)"
                                        description="Pay with Card, Bank Transfer, or USSD in Naira"
                                        icon={CreditCard}
                                        color="text-emerald-600"
                                        bgColor="bg-emerald-50"
                                        loading={initializing && provider === 'paystack'}
                                        onClick={() => handleInitialize('paystack')}
                                    />
                                    <ProviderButton
                                        id="stripe"
                                        title="Stripe (USD)"
                                        description="Secure international payment with Credit/Debit Card"
                                        icon={ShieldCheck}
                                        color="text-indigo-600"
                                        bgColor="bg-indigo-50"
                                        loading={initializing && provider === 'stripe'}
                                        onClick={() => handleInitialize('stripe')}
                                    />
                                    <ProviderButton
                                        id="crypto"
                                        title="Crypto / USDT (USD)"
                                        description="Anonymous & secure payment via USDT TRC20"
                                        icon={Bitcoin}
                                        color="text-amber-600"
                                        bgColor="bg-amber-50"
                                        loading={initializing && provider === 'crypto'}
                                        onClick={() => handleInitialize('crypto')}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {step === 2 && provider === 'crypto' && (
                            <Card className="border-0 shadow-xl rounded-[32px] overflow-hidden">
                                <CardHeader className="bg-white border-b p-8">
                                    <CardTitle className="text-2xl font-black tracking-tight text-gray-900">USDT Transfer</CardTitle>
                                    <CardDescription>Send the exact amount to the wallet below</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-amber-100 rounded-lg">
                                                <AlertCircle className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-900">Payment Instructions</p>
                                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                                    1. Send exactly <strong>{checkoutDetails?.amount} USDT</strong> to the address below.<br />
                                                    2. Ensure you are using the <strong>{checkoutDetails?.network}</strong> network.<br />
                                                    3. Copy the <strong>Transaction Hash (TXID)</strong> after sending and paste it below.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-gray-50 border rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Amount Due</p>
                                                <p className="text-2xl font-black text-gray-900 tracking-tight">{checkoutDetails?.amount} <span className="text-sm font-bold opacity-50">USDT</span></p>
                                            </div>
                                            <div className="p-3 bg-white rounded-xl shadow-sm border text-amber-600 font-bold text-xs">
                                                TRC20 Network
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border rounded-2xl p-4 space-y-2">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Our USDT Wallet Address</p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-white p-3 rounded-xl border text-sm font-mono truncate">{checkoutDetails?.walletAddress}</code>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-11 w-11 shrink-0"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(checkoutDetails?.walletAddress);
                                                        toast.success('Address copied!');
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Transaction Hash (TXID)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-mono"
                                                placeholder="Paste your 64-character hash here..."
                                                value={transactionHash}
                                                onChange={(e) => setTransactionHash(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl text-lg shadow-lg shadow-amber-600/20"
                                            disabled={initializing}
                                            onClick={handleSubmitCrypto}
                                        >
                                            {initializing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                                            Submit Payment Proof
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === 3 && (
                            <Card className="border-0 shadow-2xl rounded-[40px] overflow-hidden py-12">
                                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                                    <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
                                        <CheckCircle2 className="h-12 w-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Proof Submitted!</h2>
                                        <p className="text-gray-500 max-w-sm mx-auto">
                                            Our financial team will verify your transaction within 1-12 hours. You'll receive a notification once your {type} is active.
                                        </p>
                                    </div>
                                    <div className="flex gap-4 w-full max-w-sm">
                                        <Button
                                            className="flex-1 h-12 rounded-2xl font-bold bg-indigo-600"
                                            onClick={() => navigate('/school-admin/billing')}
                                        >
                                            View History
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 rounded-2xl font-bold"
                                            onClick={() => navigate('/school-admin/dashboard')}
                                        >
                                            Dashboard
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-lg rounded-[28px] overflow-hidden sticky top-8">
                            <CardHeader className="bg-gray-50 border-b">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-black text-gray-900">{type === 'upgrade' ? `Plan: ${planType?.toUpperCase()}` : 'PAYG Credits'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {type === 'upgrade'
                                                    ? `Billing: ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`
                                                    : `Amount: ${creditAmount} credits`}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                            {type === 'upgrade' ? <ArrowLeft className="h-4 w-4 rotate-[135deg]" /> : <Zap className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="font-bold text-gray-900">
                                                {provider === 'paystack' ? '₦' : '$'}
                                                {checkoutDetails?.amount || (type === 'credits' ? (creditAmount * (provider === 'paystack' ? config?.credits.priceNgn || 100 : config?.credits.priceUsd || 0.1)) : '...')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Processing Fee</span>
                                            <span className="text-green-600 font-bold">FREE</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total Due</span>
                                        <div className="text-right">
                                            <p className="text-3xl font-black text-indigo-600 tracking-tighter">
                                                {provider === 'paystack' ? '₦' : '$'}
                                                {(checkoutDetails?.amount || (type === 'credits' ? (creditAmount * (provider === 'paystack' ? config?.credits.priceNgn || 100 : config?.credits.priceUsd || 0.1)) : 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                        <ShieldCheck className="h-3 w-3 text-green-500" /> 256-bit AES Encryption
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                        <ShieldCheck className="h-3 w-3 text-green-500" /> Verified Payment Gateway
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProviderButton({ title, description, icon: Icon, color, bgColor, onClick, loading }: any) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="w-full text-left p-6 rounded-2xl border border-gray-100 hover:border-indigo-600/30 hover:bg-slate-50 transition-all flex items-center justify-between group shadow-sm bg-white"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${bgColor} ${color} transition-transform group-hover:scale-110`}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
                </div>
                <div>
                    <p className="font-black text-gray-900 tracking-tight">{title}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </button>
    );
}

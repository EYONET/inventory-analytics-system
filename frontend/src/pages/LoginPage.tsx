import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, ShoppingBag, ArrowRight, Store, Sparkles, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, registerStore, isLoading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await registerStore({
        storeName,
        ownerName,
        email: regEmail,
        password: regPassword,
        phone,
        address,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  // Demo account quick fillers
  const fillCredentials = (demEmail: string, demPass: string) => {
    setIsRegistering(false);
    setEmail(demEmail);
    setPassword(demPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-teal-500/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-950/60 mb-4 border border-emerald-400/30">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Retail SaaS Platform
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Multi-Tenant POS, Inventory & Analytics Engine (Ethiopia)
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-6 pb-2">
            <button
              onClick={() => {
                setIsRegistering(false);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-bold border-b-2 transition-all ${
                !isRegistering
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-bold border-b-2 transition-all ${
                isRegistering
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              New Store (Free Trial)
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!isRegistering ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@store.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all text-sm mt-2"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Store Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Store / Business Name
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Merkato Mart"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Almaz Bekele"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="almaz@store.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone (+251)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251911..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Set Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all text-sm mt-3"
              >
                {isLoading ? (
                  <span>Creating Tenant...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Start 14-Day Free Trial</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              ⚡ 1-Click Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('bole_admin@store.com', 'admin123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left transition-colors"
              >
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> Bole Admin
                </div>
                <div className="text-[10px] text-slate-400">Store Owner Hub</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('cashier1@bole.com', 'cashier123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left transition-colors"
              >
                <div className="font-bold text-teal-400 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Bole Cashier
                </div>
                <div className="text-[10px] text-slate-400">Counter POS</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('superadmin@saas.com', 'admin123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left transition-colors"
              >
                <div className="font-bold text-purple-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
                </div>
                <div className="text-[10px] text-slate-400">Platform Portal</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('piazza_admin@store.com', 'admin123')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left transition-colors"
              >
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> Piazza Admin
                </div>
                <div className="text-[10px] text-slate-400">Store #2 Electronics</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


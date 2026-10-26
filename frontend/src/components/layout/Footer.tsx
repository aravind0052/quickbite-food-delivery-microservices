import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Server, Heart, Activity, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-10 sm:pt-16 pb-8 sm:pb-12 mt-12 sm:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Brand and Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white">
                  Quick<span className="text-orange-500">Bite</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Good food. Fast delivery.
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              A high-performance microservices food delivery platform powered by a centralized Node.js API Gateway, zero-trust backend billing, and real-time Socket.IO telemetry.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Services Operational
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Server className="w-3 h-3 text-orange-400" />
                Gateway Port 4000
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/" className="hover:text-orange-400 transition-colors">
                  Browse Restaurants
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-orange-400 transition-colors">
                  My Cart
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-orange-400 transition-colors">
                  Customer Profile
                </Link>
              </li>
              <li>
                <Link to="/profile?tab=orders" className="hover:text-orange-400 transition-colors">
                  Order Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Engineering & Gateway */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">System Architecture</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/gateway-monitor" className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors font-medium">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Live Gateway Monitor
                </Link>
              </li>
              <li>
                <Link to="/admin" className="flex items-center gap-1.5 hover:text-purple-400 transition-colors font-medium">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  Admin Dashboard
                </Link>
              </li>
              <li className="text-xs text-slate-400">
                Centralized JWT Auth
              </li>
              <li className="text-xs text-slate-400">
                Fixed-Window Rate Limiter
              </li>
            </ul>
          </div>

          {/* Microservices Port Registry */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Backend Mesh</h4>
            <div className="space-y-1.5 text-xs text-slate-400 font-mono">
              <div className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded">
                <span>API Gateway</span>
                <span className="text-orange-400">:4000</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded">
                <span>Auth Service</span>
                <span className="text-blue-400">:3001</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded">
                <span>User Service</span>
                <span className="text-teal-400">:3002</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded">
                <span>Restaurant Service</span>
                <span className="text-amber-400">:3003</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded">
                <span>Order Service</span>
                <span className="text-emerald-400">:3004</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} QuickBite Technologies. Built for Academic Demonstration & Defense.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> & Microservices Architecture
            </span>
            <span className="text-slate-700">|</span>
            <span>Windows Native & MySQL 8.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

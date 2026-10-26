import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Activity,
  Server,
  Zap,
  ShieldCheck,
  Clock,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import apiClient from '../api/client';
import type { LiveRequestEvent, GatewaySnapshot } from '../types';

interface ServiceHealthStatus {
  service: string;
  url: string;
  status: 'UP' | 'DOWN';
  statusCode?: number;
  latencyMs: number;
}

export const GatewayMonitorPage: React.FC = () => {
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<GatewaySnapshot>({
    totalRequests: 0,
    requestsPerSecond: 0,
    successRequests: 0,
    errorRequests: 0,
    rateLimitedRequests: 0,
    averageLatencyMs: 0,
    activeRequests: 0,
    serviceCounts: { auth: 0, user: 0, restaurant: 0, order: 0, gateway: 0 },
    statusCounts: {},
    recentRequests: [],
  });

  const [liveStream, setLiveStream] = useState<LiveRequestEvent[]>([]);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const [historySeries, setHistorySeries] = useState<
    { time: string; rps: number; latency: number }[]
  >([]);

  // Health checks
  const [healthResults, setHealthResults] = useState<ServiceHealthStatus[]>([]);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  // Active microservice animation pulses
  const [activePulses, setActivePulses] = useState<{ [key: string]: boolean }>({
    auth: false,
    user: false,
    restaurant: false,
    order: false,
  });

  const socketRef = useRef<Socket | null>(null);
  const streamPausedRef = useRef<boolean>(streamPaused);

  useEffect(() => {
    streamPausedRef.current = streamPaused;
  }, [streamPaused]);

  const formatTimestamp = (ts: string) => {
    if (!ts) return '—';
    if (ts.includes(':') && !ts.includes('T') && !ts.includes('-')) {
      return ts;
    }
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    return ts;
  };

  const fetchMetricsSnapshot = async () => {
    try {
      const resp = await apiClient.get<{ success: boolean; data: GatewaySnapshot }>(
        '/api/gateway/metrics'
      );
      if (resp.data?.data) {
        const data = resp.data.data;
        setSnapshot(data);
        if (data.recentRequests && Array.isArray(data.recentRequests) && data.recentRequests.length > 0) {
          setLiveStream(data.recentRequests.slice(0, 50));
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setHistorySeries((prev) => {
          if (prev.length === 0) {
            return [{ time: nowStr, rps: data.requestsPerSecond || 0, latency: Math.round(data.averageLatencyMs || 0) }];
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.warn('[Monitor] Failed to fetch REST metrics snapshot:', err);
    }
  };

  const checkAllServicesHealth = async () => {
    setCheckingHealth(true);
    try {
      const resp = await apiClient.get<any>('/api/gateway/services-health');
      const data = resp.data;

      const rawServices: any[] = Array.isArray(data?.services)
        ? data.services
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const portMap: Record<string, string> = {
        auth: ':3001/health',
        user: ':3002/health',
        restaurant: ':3003/health',
        order: ':3004/health',
      };

      const mapped: ServiceHealthStatus[] = rawServices.map((s: any) => {
        const isOnline = s.status === 'ONLINE' || s.status === 'UP';
        const parsedLatency =
          typeof s.responseTime === 'string'
            ? parseInt(s.responseTime.replace(/[^0-9]/g, ''), 10) || 0
            : (s.latencyMs ?? 0);

        return {
          service: s.service || s.name || 'Service',
          url: s.url || portMap[s.key] || `${s.key || 'service'}/health`,
          status: isOnline ? 'UP' : 'DOWN',
          statusCode: s.statusCode,
          latencyMs: parsedLatency,
        };
      });

      setHealthResults(mapped);
    } catch (err: any) {
      console.error('Failed to ping services:', err);
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    // Initial data hydration via REST
    fetchMetricsSnapshot();
    checkAllServicesHealth();

    // Connect strictly to Gateway on port 4000
    const gatewaySocketUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socket = io(gatewaySocketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Monitor] Connected to Gateway Socket.IO on port 4000');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.warn('[Monitor] Disconnected from Gateway Socket.IO');
    });

    const handleSnapshot = (data: GatewaySnapshot) => {
      if (!data) return;
      setSnapshot(data);
      if (data.recentRequests && Array.isArray(data.recentRequests) && data.recentRequests.length > 0) {
        setLiveStream(data.recentRequests.slice(0, 50));
      }
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistorySeries((prev) => {
        const next = [...prev, { time: nowStr, rps: data.requestsPerSecond || 0, latency: Math.round(data.averageLatencyMs || 0) }];
        return next.slice(-20); // Keep last 20 seconds
      });
    };

    const handleMetricsUpdate = (data: GatewaySnapshot) => {
      if (!data) return;
      setSnapshot(data);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistorySeries((prev) => {
        const next = [...prev, { time: nowStr, rps: data.requestsPerSecond || 0, latency: Math.round(data.averageLatencyMs || 0) }];
        return next.slice(-20); // Keep last 20 seconds
      });
    };

    const handleRequestStart = (event: { targetService?: string }) => {
      if (!event) return;
      const target = event.targetService?.toLowerCase() || 'gateway';
      setActivePulses((prev) => ({ ...prev, [target]: true }));
      setTimeout(() => {
        setActivePulses((prev) => ({ ...prev, [target]: false }));
      }, 700);
    };

    const handleRequestComplete = (event: LiveRequestEvent) => {
      if (!event) return;
      if (!streamPausedRef.current) {
        setLiveStream((prev) => [event, ...prev.slice(0, 49)]);
      }

      // Trigger visual pulse for the target service
      const target = event.targetService?.toLowerCase() || 'gateway';
      setActivePulses((prev) => ({ ...prev, [target]: true }));
      setTimeout(() => {
        setActivePulses((prev) => ({ ...prev, [target]: false }));
      }, 700);
    };

    // Subscriptions to actual Gateway Socket.IO events
    socket.on('metrics_snapshot', handleSnapshot);
    socket.on('metrics_update', handleMetricsUpdate);
    socket.on('request_start', handleRequestStart);
    socket.on('request_complete', handleRequestComplete);

    // Fallback aliases for resilience
    socket.on('metrics:snapshot', handleSnapshot);
    socket.on('metrics:init', handleSnapshot);
    socket.on('gateway:request', handleRequestComplete);

    return () => {
      socket.disconnect();
    };
  }, []);

  const serviceDistributionData = [
    { name: 'Auth (:3001)', count: snapshot.serviceCounts?.auth || 0, fill: '#3b82f6' },
    { name: 'User (:3002)', count: snapshot.serviceCounts?.user || 0, fill: '#14b8a6' },
    { name: 'Restaurant (:3003)', count: snapshot.serviceCounts?.restaurant || 0, fill: '#f59e0b' },
    { name: 'Order (:3004)', count: snapshot.serviceCounts?.order || 0, fill: '#10b981' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-5 h-5" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Centralized Node.js API Gateway Telemetry
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  socketConnected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    socketConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                ></span>
                {socketConnected ? 'LIVE SOCKET CONNECTED' : 'RECONNECTING...'}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            API Gateway Real-Time Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Observing incoming traffic on port 4000, fixed-window rate limiter (10 reqs/60s), JWT verification, and reverse proxy routing to ports 3001–3004.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={checkAllServicesHealth}
            disabled={checkingHealth}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
            <span>{checkingHealth ? 'Pinging...' : 'Ping Mesh'}</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Requests */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Requests
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {snapshot.totalRequests.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Since Gateway Boot</span>
        </div>

        {/* Current RPS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Traffic Rate
          </span>
          <p className="text-2xl font-black text-orange-600 mt-1">
            {snapshot.requestsPerSecond}{' '}
            <span className="text-xs font-bold text-slate-400">req/s</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">Real-time load</span>
        </div>

        {/* Average Latency */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg Latency
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {Math.round(snapshot.averageLatencyMs)}{' '}
            <span className="text-xs font-bold text-slate-400">ms</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">End-to-end trip</span>
        </div>

        {/* 2xx Success */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Success (2xx)
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {snapshot.successRequests.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {snapshot.totalRequests > 0
              ? `${Math.round((snapshot.successRequests / snapshot.totalRequests) * 100)}% pass rate`
              : '100%'}
          </span>
        </div>

        {/* 429 Rate Limited */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
            Rate Limited (429)
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {snapshot.rateLimitedRequests.toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
            Fixed Window Blocked
          </span>
        </div>

        {/* 4xx / 5xx Errors */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
            Errors (4xx / 5xx)
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {snapshot.errorRequests.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Fault isolation active</span>
        </div>
      </div>

      {/* Visual Microservice Topology Mesh with Live Animated Pulses */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-white">Live Microservices Mesh Topology</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Gateway Routes: R(path) → Target Service
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Node 1: Client / Web App */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-xs text-white">Client / Browser</h4>
            <p className="text-[10px] text-slate-400 font-mono">React App :5173</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300">
              Only Calls :4000
            </span>
          </div>

          {/* Central Hub: API Gateway Node */}
          <div className="md:col-span-1 bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-orange-500/60 rounded-2xl p-5 text-center space-y-3 relative shadow-lg shadow-orange-500/10">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-500/30">
              <Server className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">API Gateway</h4>
              <p className="text-[11px] text-orange-400 font-mono font-bold">Port 4000</p>
            </div>
            <div className="text-[10px] text-slate-300 space-y-1 text-left bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span>Rate Limiter:</span>
                <span className="text-emerald-400 font-bold">10 req/60s</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Central JWT:</span>
                <span className="text-blue-400 font-bold">Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Telemetry:</span>
                <span className="text-purple-400 font-bold">Socket.IO</span>
              </div>
            </div>
          </div>

          {/* Downstream Microservices: 4 Targets */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Auth Service */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 text-center space-y-2 ${
                activePulses.auth
                  ? 'border-blue-400 bg-blue-950/60 shadow-lg shadow-blue-500/30 scale-105'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-white">Auth Service</h4>
              <p className="text-[10px] text-blue-400 font-mono">:3001</p>
              <span className="text-[10px] text-slate-400 block">
                {snapshot.serviceCounts?.auth || 0} hits
              </span>
            </div>

            {/* User Service */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 text-center space-y-2 ${
                activePulses.user
                  ? 'border-teal-400 bg-teal-950/60 shadow-lg shadow-teal-500/30 scale-105'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-white">User Service</h4>
              <p className="text-[10px] text-teal-400 font-mono">:3002</p>
              <span className="text-[10px] text-slate-400 block">
                {snapshot.serviceCounts?.user || 0} hits
              </span>
            </div>

            {/* Restaurant Service */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 text-center space-y-2 ${
                activePulses.restaurant
                  ? 'border-amber-400 bg-amber-950/60 shadow-lg shadow-amber-500/30 scale-105'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-white">Restaurant</h4>
              <p className="text-[10px] text-amber-400 font-mono">:3003</p>
              <span className="text-[10px] text-slate-400 block">
                {snapshot.serviceCounts?.restaurant || 0} hits
              </span>
            </div>

            {/* Order Service */}
            <div
              className={`p-4 rounded-2xl border transition-all duration-300 text-center space-y-2 ${
                activePulses.order
                  ? 'border-emerald-400 bg-emerald-950/60 shadow-lg shadow-emerald-500/30 scale-105'
                  : 'border-slate-800 bg-slate-900'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-white">Order Service</h4>
              <p className="text-[10px] text-emerald-400 font-mono">:3004</p>
              <span className="text-[10px] text-slate-400 block">
                {snapshot.serviceCounts?.order || 0} hits
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latency & RPS Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Traffic & Latency</h3>
              <p className="text-xs text-slate-500">Real-time gateway measurements updated every second</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
              Socket Stream
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  name="Latency (ms)"
                  stroke="#ea580c"
                  fill="#ffedd5"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="rps"
                  name="RPS"
                  stroke="#10b981"
                  fill="#d1fae5"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Microservice Distribution Bar Chart */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Route Hits by Service</h3>
            <p className="text-xs text-slate-500">Breakdown of requests routed to ports</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceDistributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" name="Hits" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Downstream Mesh Health Status Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Downstream Microservices Health Pings
            </h3>
            <p className="text-xs text-slate-500">Live ping latency from Gateway to microservices</p>
          </div>
          <button
            onClick={checkAllServicesHealth}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Now
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthResults.map((h) => {
            const isUp = h.status === 'UP';
            return (
              <div
                key={h.service}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isUp ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isUp ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    ></span>
                    <h4 className="text-xs font-bold text-slate-900">{h.service}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">{h.url}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black ${
                      isUp ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isUp ? `${h.latencyMs} ms` : 'OFFLINE'}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {isUp ? 'HTTP 200' : 'Failed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Live Request Stream Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-orange-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Live HTTP Request Telemetry Stream
              </h3>
              <p className="text-xs text-slate-500">
                Inspecting headers, tokens, rate limits, and latency for every inbound request
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStreamPaused(!streamPaused)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                streamPaused
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {streamPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{streamPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>

            <button
              onClick={() => setLiveStream([])}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
              title="Clear event log"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {liveStream.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Awaiting incoming requests to Gateway on port 4000...
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Req ID</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Path</th>
                  <th className="py-2.5 px-3">Target Service</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">JWT Auth</th>
                  <th className="py-2.5 px-3">Rate Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {liveStream.map((ev, idx) => {
                  const isSuccess = ev.statusCode >= 200 && ev.statusCode < 300;
                  const isRateLimit = ev.statusCode === 429;

                  return (
                    <tr key={ev.id || `req-row-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[90px]" title={ev.id}>
                        {ev.id ? ev.id.slice(0, 8) : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {formatTimestamp(ev.timestamp)}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            ev.method === 'GET'
                              ? 'bg-blue-50 text-blue-700'
                              : ev.method === 'POST'
                              ? 'bg-emerald-50 text-emerald-700'
                              : ev.method === 'PATCH' || ev.method === 'PUT'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {ev.method}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-semibold truncate max-w-[180px]" title={ev.path}>
                        {ev.path}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {ev.targetService}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRateLimit
                              ? 'bg-amber-100 text-amber-800 font-black'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ev.statusCode}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        {ev.latencyMs} ms
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.jwtStatus === 'VALID'
                              ? 'bg-blue-100 text-blue-800'
                              : ev.jwtStatus === 'INVALID'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ev.jwtStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ev.rateLimitStatus === 'BLOCKED'
                              ? 'bg-rose-100 text-rose-800 font-black'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ev.rateLimitStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GatewayMonitorPage;

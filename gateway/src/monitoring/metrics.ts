import { Server as SocketIOServer } from 'socket.io';

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  targetService: string;
  statusCode: number;
  latencyMs: number;
  jwtStatus: 'PUBLIC' | 'VALID' | 'INVALID' | 'MISSING';
  rateLimitStatus: 'ALLOWED' | 'BLOCKED';
  userId?: number;
}

export interface GatewayMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  successRequests: number;
  errorRequests: number;
  rateLimitedRequests: number;
  averageLatencyMs: number;
  activeRequests: number;
  serviceCounts: {
    auth: number;
    user: number;
    restaurant: number;
    order: number;
    gateway: number;
  };
  statusCounts: { [statusCode: string]: number };
  recentRequests: RequestLogEntry[];
}

class MetricsManager {
  private io: SocketIOServer | null = null;
  private totalRequests = 0;
  private successRequests = 0;
  private errorRequests = 0;
  private rateLimitedRequests = 0;
  private activeRequests = 0;
  private totalLatencyMs = 0;
  private completedRequestsCount = 0;

  private serviceCounts = {
    auth: 0,
    user: 0,
    restaurant: 0,
    order: 0,
    gateway: 0,
  };

  private statusCounts: { [code: string]: number } = {
    '200': 0,
    '201': 0,
    '400': 0,
    '401': 0,
    '403': 0,
    '404': 0,
    '429': 0,
    '500': 0,
    '502': 0,
  };

  private recentRequests: RequestLogEntry[] = [];
  private requestTimestamps: number[] = [];

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    this.io.on('connection', (socket) => {
      // Send current state immediately on connection
      socket.emit('metrics_snapshot', this.getSnapshot());
    });
  }

  recordRequestStart(data: {
    id: string;
    method: string;
    path: string;
    targetService: string;
    jwtStatus: 'PUBLIC' | 'VALID' | 'INVALID' | 'MISSING';
    userId?: number;
  }): void {
    this.totalRequests++;
    this.activeRequests++;

    const now = Date.now();
    this.requestTimestamps.push(now);

    const sKey = (data.targetService.toLowerCase() || 'gateway') as keyof typeof this.serviceCounts;
    if (this.serviceCounts[sKey] !== undefined) {
      this.serviceCounts[sKey]++;
    } else {
      this.serviceCounts.gateway++;
    }

    if (this.io) {
      this.io.emit('request_start', {
        ...data,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }

  recordRequestComplete(entry: RequestLogEntry): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
    this.completedRequestsCount++;
    this.totalLatencyMs += entry.latencyMs;

    const codeStr = String(entry.statusCode);
    this.statusCounts[codeStr] = (this.statusCounts[codeStr] || 0) + 1;

    if (entry.statusCode === 429) {
      this.rateLimitedRequests++;
    } else if (entry.statusCode >= 200 && entry.statusCode < 400) {
      this.successRequests++;
    } else {
      this.errorRequests++;
    }

    // Keep only last 50 recent requests
    this.recentRequests.unshift(entry);
    if (this.recentRequests.length > 50) {
      this.recentRequests.pop();
    }

    if (this.io) {
      this.io.emit('request_complete', entry);
      this.io.emit('metrics_update', this.getSnapshot());
    }
  }

  getSnapshot(): GatewayMetrics {
    // Calculate RPS over last 5 seconds
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t <= 5000);
    const rps = Number((this.requestTimestamps.length / 5).toFixed(1));

    const avgLatency =
      this.completedRequestsCount > 0
        ? Math.round(this.totalLatencyMs / this.completedRequestsCount)
        : 0;

    return {
      totalRequests: this.totalRequests,
      requestsPerSecond: rps,
      successRequests: this.successRequests,
      errorRequests: this.errorRequests,
      rateLimitedRequests: this.rateLimitedRequests,
      averageLatencyMs: avgLatency,
      activeRequests: this.activeRequests,
      serviceCounts: { ...this.serviceCounts },
      statusCounts: { ...this.statusCounts },
      recentRequests: [...this.recentRequests],
    };
  }
}

export const metrics = new MetricsManager();
export default metrics;

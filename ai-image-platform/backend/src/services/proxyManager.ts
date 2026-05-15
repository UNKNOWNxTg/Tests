import envConfig from '../config/env';

interface Proxy {
  ip: string;
  port: number;
  protocol: 'http' | 'https';
  country?: string;
  anonymity?: string;
  lastChecked?: number;
  responseTime?: number;
  failures: number;
}

interface ProxySource {
  name: string;
  url: string;
  format: 'list' | 'json';
  parser: (data: string) => Proxy[];
}

class ProxyManager {
  private proxies: Proxy[] = [];
  private currentIndex: number = 0;
  private isRefreshing: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly maxFailures: number = 5;
  private readonly minProxies: number = 10;

  private sources: ProxySource[] = [
    {
      name: 'proxy-list',
      url: 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
      format: 'list',
      parser: this.parseListFormat,
    },
    {
      name: 'geonode',
      url: 'https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc',
      format: 'json',
      parser: this.parseGeoNodeFormat,
    },
    {
      name: 'openproxylist',
      url: 'https://openproxylist.xyz/http.txt',
      format: 'list',
      parser: this.parseListFormat,
    },
    {
      name: 'proxyscan',
      url: 'https://www.proxyscan.io/download?type=http',
      format: 'list',
      parser: this.parseListFormat,
    },
  ];

  constructor() {
    this.startAutoRefresh();
  }

  private parseListFormat(data: string): Proxy[] {
    const lines = data.trim().split('\n');
    const proxies: Proxy[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const ip = parts[0].trim();
        const port = parseInt(parts[1].trim(), 10);
        
        if (this.isValidIP(ip) && !isNaN(port) && port > 0 && port <= 65535) {
          proxies.push({
            ip,
            port,
            protocol: parts[2]?.toLowerCase() === 'https' ? 'https' : 'http',
            failures: 0,
          });
        }
      }
    }

    return proxies;
  }

  private parseGeoNodeFormat(data: string): Proxy[] {
    try {
      const json = JSON.parse(data);
      return json.result?.map((p: any) => ({
        ip: p.ip,
        port: p.port,
        protocol: p.protocols?.[0] === 'https' ? 'https' : 'http',
        country: p.country,
        anonymity: p.anonymity,
        failures: 0,
      })) || [];
    } catch {
      return [];
    }
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  async fetchProxiesFromSource(source: ProxySource): Promise<Proxy[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch from ${source.name}: ${response.statusText}`);
        return [];
      }

      const data = await response.text();
      return source.parser(data);
    } catch (error) {
      console.error(`Error fetching from ${source.name}:`, error);
      return [];
    }
  }

  async refreshProxies(): Promise<void> {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    console.log('🔄 Refreshing proxy list...');

    try {
      const allProxies: Proxy[] = [];
      
      // Fetch from multiple sources in parallel
      const fetchPromises = this.sources.map(source => 
        this.fetchProxiesFromSource(source)
      );

      const results = await Promise.allSettled(fetchPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allProxies.push(...result.value);
        }
      }

      // Remove duplicates
      const uniqueProxies = this.deduplicateProxies(allProxies);
      
      // Merge with existing proxies, keeping failure counts
      this.proxies = this.mergeProxies(this.proxies, uniqueProxies);
      
      // Sort by failures and response time
      this.proxies.sort((a, b) => a.failures - b.failures);

      console.log(`✅ Proxy list refreshed: ${this.proxies.length} proxies available`);
    } catch (error) {
      console.error('❌ Error refreshing proxies:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  private deduplicateProxies(proxies: Proxy[]): Proxy[] {
    const seen = new Set<string>();
    return proxies.filter(proxy => {
      const key = `${proxy.ip}:${proxy.port}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mergeProxies(existing: Proxy[], newProxies: Proxy[]): Proxy[] {
    const proxyMap = new Map<string, Proxy>();
    
    // Keep existing proxies with their failure counts
    for (const proxy of existing) {
      if (proxy.failures < this.maxFailures) {
        const key = `${proxy.ip}:${proxy.port}`;
        proxyMap.set(key, proxy);
      }
    }

    // Add new proxies
    for (const proxy of newProxies) {
      const key = `${proxy.ip}:${proxy.port}`;
      if (!proxyMap.has(key)) {
        proxyMap.set(key, proxy);
      }
    }

    return Array.from(proxyMap.values());
  }

  startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Initial fetch
    this.refreshProxies();

    // Auto refresh every 5 minutes
    this.refreshInterval = setInterval(
      () => this.refreshProxies(),
      envConfig.PROXY_REFRESH_INTERVAL
    );
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  getProxy(): Proxy | null {
    if (this.proxies.length === 0) return null;

    // Find the best available proxy (lowest failures)
    const availableProxies = this.proxies.filter(p => p.failures < this.maxFailures);
    
    if (availableProxies.length === 0) {
      // Reset all failures if all proxies are dead
      this.proxies.forEach(p => p.failures = 0);
      return this.proxies[0];
    }

    // Round-robin selection among good proxies
    let attempts = 0;
    while (attempts < availableProxies.length) {
      const proxy = availableProxies[this.currentIndex % availableProxies.length];
      this.currentIndex++;
      
      if (proxy.failures < this.maxFailures) {
        return proxy;
      }
      attempts++;
    }

    return availableProxies[0] || null;
  }

  markProxyFailed(proxy: Proxy): void {
    const existingProxy = this.proxies.find(
      p => p.ip === proxy.ip && p.port === proxy.port
    );
    
    if (existingProxy) {
      existingProxy.failures++;
      console.log(`⚠️ Proxy ${proxy.ip}:${proxy.port} marked as failed (${existingProxy.failures}/${this.maxFailures})`);
    }
  }

  markProxySuccess(proxy: Proxy, responseTime?: number): void {
    const existingProxy = this.proxies.find(
      p => p.ip === proxy.ip && p.port === proxy.port
    );
    
    if (existingProxy) {
      // Reduce failures on success
      existingProxy.failures = Math.max(0, existingProxy.failures - 1);
      if (responseTime) {
        existingProxy.responseTime = responseTime;
      }
    }
  }

  getStats(): { total: number; healthy: number; unhealthy: number } {
    const healthy = this.proxies.filter(p => p.failures < this.maxFailures).length;
    return {
      total: this.proxies.length,
      healthy,
      unhealthy: this.proxies.length - healthy,
    };
  }

  async validateProxy(proxy: Proxy): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://httpbin.org/ip', {
        signal: controller.signal,
        agent: this.createProxyAgent(proxy),
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseTime = Date.now() - startTime;
        this.markProxySuccess(proxy, responseTime);
        return true;
      }
    } catch {
      // Ignore validation errors
    }

    this.markProxyFailed(proxy);
    return false;
  }

  private createProxyAgent(proxy: Proxy): any {
    // This would use https-proxy-agent in production
    // For now, we'll return undefined and handle proxy differently
    return undefined;
  }

  getProxyURL(proxy: Proxy): string {
    return `${proxy.protocol}://${proxy.ip}:${proxy.port}`;
  }
}

// Singleton instance
export const proxyManager = new ProxyManager();
export default proxyManager;

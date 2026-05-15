const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GenerateOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  model?: string;
}

interface TaskStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  imageUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  metadata?: {
    generationTime?: number;
    seed?: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  task?: any;
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export const apiClient = {
  async generate(options: GenerateOptions) {
    return fetchAPI('/api/generate', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async getTaskStatus(taskId: string) {
    return fetchAPI<{ task: TaskStatus }>(`/api/generate/${taskId}`);
  },

  async getHistory(limit = 20, offset = 0) {
    return fetchAPI<{ tasks: TaskStatus[]; total: number; hasMore: boolean }>(
      `/api/history?limit=${limit}&offset=${offset}`
    );
  },

  async regenerate(taskId: string) {
    return fetchAPI(`/api/generate/${taskId}/regenerate`, {
      method: 'POST',
    });
  },

  async getModels() {
    return fetchAPI<{ models: Array<{ id: string; name: string }> }>('/api/models');
  },

  async getProxyStats() {
    return fetchAPI('/api/proxy/stats');
  },

  async healthCheck() {
    return fetchAPI('/api/health');
  },
};

// WebSocket client for real-time updates
export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private readonly wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyListeners('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data.type, data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyListeners('disconnected', {});
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('error', { error });
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(taskId: string, callback: (task: any) => void) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        taskId,
      }));
    }

    const listenerSet = this.listeners.get('task-update') || new Set();
    listenerSet.add(callback);
    this.listeners.set('task-update', listenerSet);

    return () => {
      listenerSet.delete(callback);
    };
  }

  on(event: string, callback: (data: any) => void) {
    const listenerSet = this.listeners.get(event) || new Set();
    listenerSet.add(callback);
    this.listeners.set(event, listenerSet);

    return () => {
      listenerSet.delete(callback);
    };
  }

  private notifyListeners(event: string, data: any) {
    const listenerSet = this.listeners.get(event);
    if (listenerSet) {
      listenerSet.forEach((callback) => callback(data));
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WSClient();

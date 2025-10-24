import axios, { AxiosInstance } from 'axios';
import { SabnzbdConfig, DownloadStatus } from '../../shared/types';

export interface SabnzbdQueueItem {
  nzo_id: string;
  filename: string;
  mb: string;
  mbleft: string;
  percentage: string;
  status: string;
}

export interface SabnzbdHistoryItem {
  nzo_id: string;
  name: string;
  status: string;
  fail_message: string;
  bytes: string;
  category: string;
  completed: number;
}

export interface SabnzbdAddResponse {
  nzo_ids: string[];
}

export class SabnzbdService {
  private client: AxiosInstance;
  private config: SabnzbdConfig;

  constructor(config: SabnzbdConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.url,
      timeout: 10000,
    });
  }

  /**
   * Test connection to SABnzbd by fetching version info
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api', {
        params: {
          mode: 'version',
          apikey: this.config.apiKey,
          output: 'json',
        },
      });

      return response.status === 200 && !!response.data.version;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `SABnzbd connection failed: ${error.message}. Please check URL and API key.`
        );
      }
      throw error;
    }
  }

  /**
   * Send NZB URL to SABnzbd queue
   */
  async sendNzbUrl(nzbUrl: string, category: string = 'music'): Promise<string> {
    try {
      const response = await this.client.get('/api', {
        params: {
          mode: 'addurl',
          name: nzbUrl,
          cat: category,
          apikey: this.config.apiKey,
          output: 'json',
        },
      });

      if (response.data.status === false) {
        throw new Error(response.data.error || 'Failed to add NZB to SABnzbd');
      }

      const addResponse = response.data as SabnzbdAddResponse;
      
      if (!addResponse.nzo_ids || addResponse.nzo_ids.length === 0) {
        throw new Error('SABnzbd did not return a download ID');
      }

      return addResponse.nzo_ids[0];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to send NZB to SABnzbd: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Query download status by SABnzbd ID
   */
  async getDownloadStatus(sabnzbdId: string): Promise<DownloadStatus> {
    try {
      // First check the queue
      const queueResponse = await this.client.get('/api', {
        params: {
          mode: 'queue',
          apikey: this.config.apiKey,
          output: 'json',
        },
      });

      const queueSlots = queueResponse.data.queue?.slots || [];
      const queueItem = queueSlots.find(
        (item: SabnzbdQueueItem) => item.nzo_id === sabnzbdId
      );

      if (queueItem) {
        const progress = parseInt(queueItem.percentage, 10) || 0;
        const status = this.mapSabnzbdStatus(queueItem.status);

        return {
          id: sabnzbdId,
          status,
          progress,
        };
      }

      // If not in queue, check history
      const historyResponse = await this.client.get('/api', {
        params: {
          mode: 'history',
          apikey: this.config.apiKey,
          output: 'json',
        },
      });

      const historySlots = historyResponse.data.history?.slots || [];
      const historyItem = historySlots.find(
        (item: SabnzbdHistoryItem) => item.nzo_id === sabnzbdId
      );

      if (historyItem) {
        const status = this.mapHistoryStatus(historyItem.status);
        const progress = status === 'completed' ? 100 : 0;

        return {
          id: sabnzbdId,
          status,
          progress,
          errorMessage: historyItem.fail_message || undefined,
        };
      }

      // Not found in queue or history
      throw new Error(`Download with ID ${sabnzbdId} not found in SABnzbd`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get download status: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch download history from SABnzbd
   */
  async getDownloadHistory(limit: number = 50): Promise<SabnzbdHistoryItem[]> {
    try {
      const response = await this.client.get('/api', {
        params: {
          mode: 'history',
          limit,
          apikey: this.config.apiKey,
          output: 'json',
        },
      });

      return response.data.history?.slots || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch download history: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Map SABnzbd queue status to our status enum
   */
  private mapSabnzbdStatus(
    status: string
  ): 'queued' | 'downloading' | 'completed' | 'failed' {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'paused' || statusLower === 'queued') {
      return 'queued';
    }
    
    if (statusLower === 'downloading' || statusLower === 'fetching') {
      return 'downloading';
    }
    
    return 'queued';
  }

  /**
   * Map SABnzbd history status to our status enum
   */
  private mapHistoryStatus(
    status: string
  ): 'queued' | 'downloading' | 'completed' | 'failed' {
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'completed') {
      return 'completed';
    }
    
    if (statusLower === 'failed') {
      return 'failed';
    }
    
    return 'completed';
  }
}

import axios, { AxiosInstance } from 'axios';
import { IndexerConfig, SearchResult, QualityProfile } from '../../shared/types';
import { QualityProfileService } from './QualityProfileService';

export interface NewznabSearchParams {
  t: string; // search type (e.g., 'search', 'music')
  apikey: string;
  q?: string; // query string
  artist?: string;
  album?: string;
  cat?: string; // category (e.g., '3000' for audio)
  limit?: number;
  offset?: number;
}

export interface NewznabItem {
  title: string;
  guid: string;
  link: string;
  pubDate: string;
  size: string;
  'newznab:attr'?: Array<{
    '@_name': string;
    '@_value': string;
  }>;
}

export interface NewznabResponse {
  rss: {
    channel: {
      item: NewznabItem | NewznabItem[];
    };
  };
}

export class IndexerService {
  private clients: Map<string, AxiosInstance> = new Map();

  constructor(
    private indexers: IndexerConfig[],
    private qualityProfileService?: QualityProfileService
  ) {
    // Create axios clients for each indexer
    this.indexers.forEach((indexer) => {
      this.clients.set(
        indexer.id,
        axios.create({
          baseURL: indexer.url,
          timeout: 30000,
        })
      );
    });
  }

  /**
   * Test connection to an indexer by performing a simple search
   */
  async testConnection(indexer: IndexerConfig): Promise<boolean> {
    try {
      const client = axios.create({
        baseURL: indexer.url,
        timeout: 10000,
      });

      const response = await client.get('/api', {
        params: {
          t: 'caps',
          apikey: indexer.apiKey,
        },
      });

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Indexer connection failed: ${error.message}. Please check URL and API key.`
        );
      }
      throw error;
    }
  }

  /**
   * Search for an album across all enabled indexers
   */
  async searchAlbum(
    artist: string,
    album: string,
    qualityProfile?: QualityProfile
  ): Promise<SearchResult[]> {
    const enabledIndexers = this.indexers.filter((i) => i.enabled);

    if (enabledIndexers.length === 0) {
      throw new Error('No enabled indexers configured');
    }

    // Search all indexers in parallel
    const searchPromises = enabledIndexers.map((indexer) =>
      this.searchIndexer(indexer, artist, album).catch((error) => {
        console.error(`Error searching indexer ${indexer.name}:`, error);
        return []; // Return empty array on error, don't fail entire search
      })
    );

    const results = await Promise.all(searchPromises);
    const allResults = results.flat();

    // Filter and rank by quality profile if provided
    if (qualityProfile && this.qualityProfileService) {
      const filteredResults = this.qualityProfileService.filterResults(allResults, qualityProfile);
      return this.qualityProfileService.rankResults(filteredResults, qualityProfile);
    }

    return allResults;
  }

  /**
   * Search a specific indexer for an album
   */
  private async searchIndexer(
    indexer: IndexerConfig,
    artist: string,
    album: string
  ): Promise<SearchResult[]> {
    const client = this.clients.get(indexer.id);
    if (!client) {
      throw new Error(`No client found for indexer ${indexer.id}`);
    }

    try {
      const response = await client.get('/api', {
        params: {
          t: 'music',
          apikey: indexer.apiKey,
          artist,
          album,
          cat: '3000', // Audio category
          limit: 100,
        } as NewznabSearchParams,
      });

      return this.parseNewznabResponse(response.data, indexer.name);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to search indexer ${indexer.name}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse Newznab XML/JSON response into SearchResult objects
   */
  private parseNewznabResponse(data: string, indexerName: string): SearchResult[] {
    try {
      // Try to parse as JSON first (some indexers support JSON output)
      if (typeof data === 'object') {
        return this.parseNewznabJson(data, indexerName);
      }

      // Parse XML response
      return this.parseNewznabXml(data, indexerName);
    } catch (error) {
      console.error(`Error parsing Newznab response from ${indexerName}:`, error);
      return [];
    }
  }

  /**
   * Parse Newznab JSON response
   */
  private parseNewznabJson(data: any, indexerName: string): SearchResult[] {
    const results: SearchResult[] = [];

    try {
      const items = data.rss?.channel?.item;
      if (!items) {
        return results;
      }

      const itemArray = Array.isArray(items) ? items : [items];

      for (const item of itemArray) {
        const result = this.parseNewznabItem(item, indexerName);
        if (result) {
          results.push(result);
        }
      }
    } catch (error) {
      console.error(`Error parsing JSON from ${indexerName}:`, error);
    }

    return results;
  }

  /**
   * Parse Newznab XML response
   */
  private parseNewznabXml(xmlData: string, indexerName: string): SearchResult[] {
    const results: SearchResult[] = [];

    try {
      // Simple XML parsing for <item> elements
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const matches = xmlData.matchAll(itemRegex);

      for (const match of matches) {
        const itemXml = match[1];
        const result = this.parseXmlItem(itemXml, indexerName);
        if (result) {
          results.push(result);
        }
      }
    } catch (error) {
      console.error(`Error parsing XML from ${indexerName}:`, error);
    }

    return results;
  }

  /**
   * Parse a single XML item element
   */
  private parseXmlItem(itemXml: string, indexerName: string): SearchResult | null {
    try {
      const title = this.extractXmlValue(itemXml, 'title');
      const link = this.extractXmlValue(itemXml, 'link');
      const size = this.extractXmlValue(itemXml, 'size');
      const pubDate = this.extractXmlValue(itemXml, 'pubDate');

      if (!title || !link) {
        return null;
      }

      // Extract format and bitrate from newznab attributes
      const format = this.extractNewznabAttr(itemXml, 'format') || 'Unknown';
      const bitrateStr = this.extractNewznabAttr(itemXml, 'bitrate');
      const bitrate = bitrateStr ? parseInt(bitrateStr, 10) : undefined;

      // Calculate age in days
      const age = pubDate ? this.calculateAge(pubDate) : 0;

      return {
        title,
        nzbUrl: link,
        size: size ? parseInt(size, 10) : 0,
        age,
        indexer: indexerName,
        quality: {
          format,
          bitrate,
        },
      };
    } catch (error) {
      console.error('Error parsing XML item:', error);
      return null;
    }
  }

  /**
   * Parse a single Newznab item (JSON format)
   */
  private parseNewznabItem(item: NewznabItem, indexerName: string): SearchResult | null {
    try {
      const { title, link, size, pubDate } = item;

      if (!title || !link) {
        return null;
      }

      // Extract format and bitrate from newznab attributes
      let format = 'Unknown';
      let bitrate: number | undefined;

      if (item['newznab:attr']) {
        const attrs = Array.isArray(item['newznab:attr'])
          ? item['newznab:attr']
          : [item['newznab:attr']];

        for (const attr of attrs) {
          if (attr['@_name'] === 'format') {
            format = attr['@_value'];
          } else if (attr['@_name'] === 'bitrate') {
            bitrate = parseInt(attr['@_value'], 10);
          }
        }
      }

      // Calculate age in days
      const age = pubDate ? this.calculateAge(pubDate) : 0;

      return {
        title,
        nzbUrl: link,
        size: size ? parseInt(size, 10) : 0,
        age,
        indexer: indexerName,
        quality: {
          format,
          bitrate,
        },
      };
    } catch (error) {
      console.error('Error parsing Newznab item:', error);
      return null;
    }
  }

  /**
   * Extract value from XML tag
   */
  private extractXmlValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract newznab attribute value
   */
  private extractNewznabAttr(xml: string, attrName: string): string | null {
    const regex = new RegExp(
      `<newznab:attr[^>]*name="${attrName}"[^>]*value="([^"]*)"`,
      'i'
    );
    const match = xml.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Calculate age in days from pubDate string
   */
  private calculateAge(pubDate: string): number {
    try {
      const date = new Date(pubDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

}

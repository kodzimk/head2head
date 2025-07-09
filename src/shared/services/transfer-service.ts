import axios from 'axios';

export interface TransferNews {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  imageUrl?: string;
  sport: string;
  status?: 'rumor' | 'confirmed' | 'completed';
  player?: string;
  fromTeam?: string;
  toTeam?: string;
  transferFee?: string;
}

class TransferService {
  private rapidApiKey: string;

  constructor() {
    // Use environment variables for API credentials
    this.rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY || '';
  }

  // Fallback transfer data when API is unavailable
  private getFallbackTransfers(): TransferNews[] {
    return [
      {
        id: 'fallback-1',
        title: 'Haaland to Real Madrid',
        description: 'Erling Haaland has completed his move to Real Madrid for a record fee of €200 million. The Norwegian striker will join the Spanish giants in a blockbuster transfer.',
        source: 'Transfer News',
        publishedAt: new Date().toISOString(),
        url: '#',
        imageUrl: '/images/sports-arena.jpg',
        sport: 'Football',
        status: 'completed',
        player: 'Erling Haaland',
        fromTeam: 'Manchester City',
        toTeam: 'Real Madrid',
        transferFee: '€200M'
      },
      {
        id: 'fallback-2',
        title: 'Mbappé to Liverpool',
        description: 'Kylian Mbappé has signed for Liverpool in a surprise transfer deal. The French forward will join the Premier League side.',
        source: 'Transfer News',
        publishedAt: new Date().toISOString(),
        url: '#',
        imageUrl: '/images/sports-arena.jpg',
        sport: 'Football',
        status: 'confirmed',
        player: 'Kylian Mbappé',
        fromTeam: 'PSG',
        toTeam: 'Liverpool',
        transferFee: '€180M'
      },
      {
        id: 'fallback-3',
        title: 'LeBron James Contract Extension',
        description: 'LeBron James has signed a contract extension with the Los Angeles Lakers, securing his future with the franchise.',
        source: 'Basketball News',
        publishedAt: new Date().toISOString(),
        url: '#',
        imageUrl: '/images/sports-arena.jpg',
        sport: 'Basketball',
        status: 'confirmed',
        player: 'LeBron James',
        fromTeam: 'Los Angeles Lakers',
        toTeam: 'Los Angeles Lakers',
        transferFee: '$97.1M'
      },
      {
        id: 'fallback-4',
        title: 'Kevin Durant Trade Rumors',
        description: 'Kevin Durant trade rumors continue to swirl as the Brooklyn Nets consider their options for the upcoming season.',
        source: 'Basketball News',
        publishedAt: new Date().toISOString(),
        url: '#',
        imageUrl: '/images/sports-arena.jpg',
        sport: 'Basketball',
        status: 'rumor',
        player: 'Kevin Durant',
        fromTeam: 'Brooklyn Nets',
        toTeam: 'Unknown',
        transferFee: 'TBD'
      }
    ];
  }

  // Fetch transfer news from multiple sources
  async getTransferNews( limit: number = 10): Promise<TransferNews[]> {
    // Validate API key
    if (!this.rapidApiKey) {
      console.warn('RapidAPI key is not set. Using fallback transfer data.');
      return this.getFallbackTransfers().slice(0, limit);
    }

    try {
      // Football transfer news
      const footballResponse = await this.fetchFootballTransfers(limit);
      
      // Basketball transfer news
      const basketballResponse = await this.fetchBasketballTransfers(limit);

      // Combine and limit results
      const combinedTransfers = [...footballResponse, ...basketballResponse]
        .slice(0, limit)
        .map((transfer, index) => ({
          ...transfer,
          id: transfer.id || `transfer-${index}`
        }));

      return combinedTransfers.length > 0 ? combinedTransfers : this.getFallbackTransfers().slice(0, limit);
    } catch (error) {
      console.error('Error fetching transfer news, using fallback data:', error);
      return this.getFallbackTransfers().slice(0, limit);
    }
  }

  // Fetch football transfers
  private async fetchFootballTransfers(limit: number): Promise<TransferNews[]> {
    try {
      const response = await axios.get('https://transfer-news.p.rapidapi.com/football/transfers', {
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': 'transfer-news.p.rapidapi.com'
        },
        params: { limit },
        timeout: 10000 // 10 second timeout
      });

      return (response.data || []).map((transfer: any) => ({
        id: transfer.id,
        title: transfer.title || `${transfer.player} Transfer`,
        description: transfer.description || `Transfer from ${transfer.fromTeam} to ${transfer.toTeam}`,
        source: transfer.source || 'Football Transfer News',
        publishedAt: transfer.publishedAt || new Date().toISOString(),
        url: transfer.url || '#',
        imageUrl: transfer.imageUrl || '/images/sports-arena.jpg',
        sport: 'Football',
        status: transfer.status || 'rumor',
        player: transfer.player,
        fromTeam: transfer.fromTeam,
        toTeam: transfer.toTeam,
        transferFee: transfer.transferFee
      }));
    } catch (error: any) {
      console.error('Error fetching football transfers:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limit exceeded for football transfers API');
      }
      return [];
    }
  }

  // Fetch basketball transfers
  private async fetchBasketballTransfers(limit: number): Promise<TransferNews[]> {
    try {
      const response = await axios.get('https://transfer-news.p.rapidapi.com/basketball/transfers', {
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': 'transfer-news.p.rapidapi.com'
        },
        params: { limit },
        timeout: 10000 // 10 second timeout
      });

      return (response.data || []).map((transfer: any) => ({
        id: transfer.id,
        title: transfer.title || `${transfer.player} Transfer`,
        description: transfer.description || `Transfer from ${transfer.fromTeam} to ${transfer.toTeam}`,
        source: transfer.source || 'Basketball Transfer News',
        publishedAt: transfer.publishedAt || new Date().toISOString(),
        url: transfer.url || '#',
        imageUrl: transfer.imageUrl || '/images/sports-arena.jpg',
        sport: 'Basketball',
        status: transfer.status || 'rumor',
        player: transfer.player,
        fromTeam: transfer.fromTeam,
        toTeam: transfer.toTeam,
        transferFee: transfer.transferFee
      }));
    } catch (error: any) {
      console.error('Error fetching basketball transfers:', error);
      if (error.response?.status === 429) {
        console.warn('Rate limit exceeded for basketball transfers API');
      }
      return [];
    }
  }
}

export const transferService = new TransferService(); 
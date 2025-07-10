import { API_BASE_URL } from '../interface/gloabL_var';

export interface Transfer {
  player_name: string;
  player_id: number;
  from_team: string;
  to_team: string;
  transfer_date: string;
  transfer_type: string;
  fee?: string | null;
  fee_value?: number | null;
  currency?: string | null;
}

export interface TransferStatus {
  status: string;
  service: string;
  data_count: number;
  last_fetch_time: string | null;
  is_fetching: boolean;
  next_fetch_in_minutes: number;
  background_task_running: boolean;
}

export interface TransferRefreshResponse {
  status: string;
  message: string;
  transfer_count: number;
  last_fetch_time: string;
}

class TransferService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get latest transfer data from backend
   */
  async getTransfers(): Promise<Transfer[]> {
    try {
      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 503) {
          throw new Error('Transfer service temporarily unavailable');
        }
        throw new Error(`Failed to fetch transfers: ${response.status}`);
      }

      const transfers: Transfer[] = await response.json();
      return transfers;
    } catch (error) {
      console.error('Error fetching transfers:', error);
      throw error;
    }
  }

  /**
   * Get transfer service status
   */
  async getTransferStatus(): Promise<TransferStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/transfers/status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transfer status: ${response.status}`);
      }

      const status: TransferStatus = await response.json();
      return status;
    } catch (error) {
      console.error('Error fetching transfer status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger transfer data refresh
   */
  async refreshTransfers(): Promise<TransferRefreshResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/transfers/refresh`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Refresh already in progress. Please wait.');
        }
        if (response.status === 503) {
          throw new Error('Failed to refresh transfer data. API may be unavailable.');
        }
        throw new Error(`Failed to refresh transfers: ${response.status}`);
      }

      const result: TransferRefreshResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error refreshing transfers:', error);
      throw error;
    }
  }

  /**
   * Check if transfer service is healthy
   */
  async getTransferHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/transfers/health`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Transfer health check failed: ${response.status}`);
      }

      const health = await response.json();
      return health;
    } catch (error) {
      console.error('Error checking transfer health:', error);
      throw error;
    }
  }

  /**
   * Format transfer fee for display
   */
  formatTransferFee(transfer: Transfer): string {
    if (!transfer.fee) {
      return 'Undisclosed';
    }
    
    // If fee is already formatted (contains currency symbols), return as is
    if (transfer.fee.includes('€') || transfer.fee.includes('$') || transfer.fee.includes('£')) {
      return transfer.fee;
    }

    // If it's a numeric value, try to format it
    if (transfer.fee_value && transfer.currency) {
      return `${transfer.currency}${transfer.fee_value.toLocaleString()}`;
    }

    return transfer.fee;
  }

  /**
   * Format transfer date for display
   */
  formatTransferDate(transfer: Transfer): string {
    if (!transfer.transfer_date) {
      return 'Unknown';
    }

    try {
      const date = new Date(transfer.transfer_date);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return transfer.transfer_date;
    }
  }

  /**
   * Get transfer type badge color
   */
  getTransferTypeColor(transferType: string): string {
    switch (transferType.toLowerCase()) {
      case 'loan':
        return 'bg-blue-100 text-blue-800';
      case 'permanent':
        return 'bg-green-100 text-green-800';
      case 'free':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  }
}

// Export singleton instance
export const transferService = new TransferService(); 
export default transferService; 
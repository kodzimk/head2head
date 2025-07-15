import { API_BASE_URL } from '../config';

export const fetchWithApiKey = async <T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem('access_token')?.replace(/"/g, '');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}; 
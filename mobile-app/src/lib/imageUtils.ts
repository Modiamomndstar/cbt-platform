import api from '../services/api';

// Extract the base URL from the axios instance configuration
// If API_BASE_URL is 'https://mycbtplatform.cc/api', we want 'https://mycbtplatform.cc'
const API_BASE_URL = api.defaults.baseURL || 'https://mycbtplatform.cc/api';
const BASE_URL = API_BASE_URL.replace(/\/api$/, '');

/**
 * Ensures an image path is a valid URL by prepending the backend base URL if necessary.
 * Handles both local storage paths (/uploads/...) and OCI storage URLs (https://...).
 */
export const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;

  // If it's already a full URL (data URI or http/https)
  if (path.startsWith('data:') || path.startsWith('http')) {
    // Resilience: Even if it's a full URL, it might have legacy segments like /logos/1/
    if (path.includes('/logos/')) {
        const parts = path.split('/logos/');
        const fileName = parts[1].split('/').pop();
        return `${parts[0]}/logos/${fileName}`;
    }
    return path;
  }

  // Ensure path starts with a slash and normalize separators
  let normalizedPath = path.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  // Resilience: Strip redundant '/1/' or similar segments from legacy logo paths
  if (normalizedPath.includes('/logos/')) {
    const parts = normalizedPath.split('/logos/');
    const fileName = parts[1].split('/').pop();
    normalizedPath = `${parts[0]}/logos/${fileName}`;
  }
  
  return `${BASE_URL}${normalizedPath}`;
};

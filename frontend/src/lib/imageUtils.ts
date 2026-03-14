import { API_BASE_URL } from '@/services/api';

/**
 * Ensures an image path is a valid URL by prepending the backend base URL if necessary.
 * Handles both local storage paths (/uploads/...) and OCI storage URLs (https://...).
 */
export const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;

  // If it's already a full URL (data URI or http/https)
  if (path.startsWith('data:') || path.startsWith('http')) {
    return path;
  }

  // Prepend backend base URL
  // If API_BASE_URL is '/api', we need to get the root (empty string)
  // If API_BASE_URL is 'http://localhost:5000/api', we need 'http://localhost:5000'
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  
  // Ensure path starts with a slash and normalize separators
  let normalizedPath = path.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('/') && !normalizedPath.startsWith('http')) {
    normalizedPath = `/${normalizedPath}`;
  }

  // Resilience: Strip redundant '/1/' or similar segments from legacy logo paths
  // e.g., '/uploads/logos/1/filename.jpg' -> '/uploads/logos/filename.jpg'
  if (normalizedPath.includes('/logos/')) {
    const parts = normalizedPath.split('/logos/');
    const fileName = parts[1].split('/').pop(); // Get just the actual file name
    normalizedPath = `${parts[0]}/logos/${fileName}`;
  }
  
  return `${baseUrl}${normalizedPath}`;
};

/**
 * API Error Handler Utility
 * Provides consistent error handling and user-friendly messages for API calls
 */

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as any;
    
    // Check for API error format
    if (err.error?.message) {
      return err.error.message;
    }
    
    if (err.message) {
      return err.message;
    }
  }

  return 'An unexpected error occurred';
}

/**
 * Handle API response errors
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'Request failed';
  
  try {
    const data = await response.json();
    errorMessage = getErrorMessage(data);
  } catch {
    // If JSON parsing fails, use status text
    errorMessage = response.statusText || `Request failed with status ${response.status}`;
  }

  throw new Error(errorMessage);
}

/**
 * Fetch wrapper with error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiError(response);
    }

    return await response.json();
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get user-friendly error messages for common scenarios
 */
export function getUserFriendlyErrorMessage(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  
  // Network errors
  if (message.includes('fetch') || message.includes('network')) {
    return 'Unable to connect to the server. Please check your connection.';
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Authentication failed. Please check your API key.';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return context ? `${context} not found.` : 'The requested resource was not found.';
  }

  // Server errors
  if (message.includes('500') || message.includes('server error')) {
    return 'A server error occurred. Please try again later.';
  }

  // Return the original message if no specific pattern matches
  return message;
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

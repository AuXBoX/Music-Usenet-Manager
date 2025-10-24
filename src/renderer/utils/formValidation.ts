/**
 * Form Validation Utilities
 * Provides reusable validation functions for form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL (e.g., http://localhost:8080)' };
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'API key is required' };
  }

  if (apiKey.length < 10) {
    return { isValid: false, error: 'API key seems too short' };
  }

  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string = 'This field'): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number,
  fieldName: string = 'Value'
): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { isValid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate file path
 */
export function validatePath(path: string): ValidationResult {
  if (!path || path.trim() === '') {
    return { isValid: false, error: 'Path is required' };
  }

  // Basic path validation (Windows and Unix)
  const pathRegex = /^([a-zA-Z]:\\|\/|\\\\).+/;
  if (!pathRegex.test(path)) {
    return { isValid: false, error: 'Please enter a valid file path' };
  }

  return { isValid: true };
}

/**
 * Validate bitrate value
 */
export function validateBitrate(bitrate: number): ValidationResult {
  return validateNumberRange(bitrate, 64, 320, 'Bitrate');
}

/**
 * Validate file size (in MB)
 */
export function validateFileSize(size: number): ValidationResult {
  return validateNumberRange(size, 1, 10000, 'File size');
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

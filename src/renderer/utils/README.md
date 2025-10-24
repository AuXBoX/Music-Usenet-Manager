# Utility Functions

This directory contains reusable utility functions for the Music Usenet Manager application.

## API Error Handler (`apiErrorHandler.ts`)

Provides consistent error handling and user-friendly messages for API calls.

### Key Functions

#### `getErrorMessage(error: unknown): string`
Extracts error messages from various error formats (Error objects, strings, API responses).

#### `handleApiError(response: Response): Promise<never>`
Handles API response errors by parsing the response and throwing a formatted error.

#### `fetchWithErrorHandling<T>(url: string, options?: RequestInit): Promise<T>`
Wrapper around fetch that automatically handles errors and returns typed responses.

#### `getUserFriendlyErrorMessage(error: unknown, context?: string): string`
Converts technical error messages into user-friendly messages. Handles common scenarios:
- Network errors
- Timeout errors
- Authentication errors (401)
- Not found errors (404)
- Server errors (500)

**Example:**
```typescript
try {
  const response = await fetch('/api/config/sabnzbd');
  if (!response.ok) {
    const error = await response.json();
    const message = getUserFriendlyErrorMessage(error, 'SABnzbd configuration');
    showToast('error', message);
  }
} catch (error) {
  const message = getUserFriendlyErrorMessage(error, 'SABnzbd configuration');
  showToast('error', message);
}
```

#### `retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, delayMs?: number): Promise<T>`
Retries a failed operation with exponential backoff.

**Example:**
```typescript
const data = await retryOperation(
  () => fetch('/api/data').then(r => r.json()),
  3,  // max retries
  1000  // initial delay in ms
);
```

## Form Validation (`formValidation.ts`)

Provides reusable validation functions for form inputs.

### Validation Functions

#### `validateUrl(url: string): ValidationResult`
Validates URL format.

#### `validateApiKey(apiKey: string): ValidationResult`
Validates API key (checks for presence and minimum length).

#### `validateRequired(value: string, fieldName?: string): ValidationResult`
Validates that a field is not empty.

#### `validateNumberRange(value: number, min?: number, max?: number, fieldName?: string): ValidationResult`
Validates that a number is within a specified range.

#### `validatePath(path: string): ValidationResult`
Validates file path format (Windows and Unix).

#### `validateBitrate(bitrate: number): ValidationResult`
Validates bitrate value (64-320 kbps).

#### `validateFileSize(size: number): ValidationResult`
Validates file size (1-10000 MB).

#### `combineValidations(...results: ValidationResult[]): ValidationResult`
Combines multiple validation results, returning the first error found.

### Usage Example

```typescript
import { validateUrl, validateApiKey } from '../../utils/formValidation';

const [errors, setErrors] = useState<{ url?: string; apiKey?: string }>({});

const validateForm = (): boolean => {
  const urlValidation = validateUrl(formData.url);
  const apiKeyValidation = validateApiKey(formData.apiKey);

  const newErrors: { url?: string; apiKey?: string } = {};

  if (!urlValidation.isValid) {
    newErrors.url = urlValidation.error;
  }

  if (!apiKeyValidation.isValid) {
    newErrors.apiKey = apiKeyValidation.error;
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    showToast('error', 'Please fix the validation errors');
    return;
  }
  
  // Proceed with submission
};
```

## Best Practices

### Error Handling Pattern

1. **Always use try-catch blocks** for async operations
2. **Provide user-friendly messages** using `getUserFriendlyErrorMessage`
3. **Add retry actions** for recoverable errors
4. **Clear inline errors** when user starts typing

```typescript
const handleSave = async () => {
  if (!validateForm()) {
    showToast('error', 'Please fix the validation errors');
    return;
  }

  setIsLoading(true);
  setError(undefined);
  
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showToast('success', 'Saved successfully');
    } else {
      const error = await response.json();
      const message = getUserFriendlyErrorMessage(error, 'Operation');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: handleSave,
        },
      });
    }
  } catch (error) {
    const message = getUserFriendlyErrorMessage(error, 'Operation');
    showToast('error', message, {
      action: {
        label: 'Retry',
        onClick: handleSave,
      },
    });
  } finally {
    setIsLoading(false);
  }
};
```

### Form Validation Pattern

1. **Validate on submit** to catch all errors
2. **Clear errors on input change** for better UX
3. **Show inline errors** using the Input component's error prop

```typescript
<Input
  label="URL"
  type="text"
  value={formData.url}
  onChange={(e) => {
    setFormData({ ...formData, url: e.target.value });
    if (errors.url) {
      setErrors({ ...errors, url: undefined });
    }
  }}
  error={errors.url}
/>
```

### Toast Notifications

Use the `useToast` hook for user feedback:

```typescript
import { useToast } from '../components/ui/Toast';

const { showToast } = useToast();

// Success message
showToast('success', 'Operation completed successfully');

// Error message with retry action
showToast('error', 'Operation failed', {
  action: {
    label: 'Retry',
    onClick: handleRetry,
  },
});

// Info message
showToast('info', 'Processing your request...');

// Warning message
showToast('warning', 'This action cannot be undone');
```

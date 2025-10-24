import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { SabnzbdConfig } from '../../../shared/types';
import { API_BASE_URL } from '../../config/api';
import { validateUrl, validateApiKey } from '../../utils/formValidation';
import { getUserFriendlyErrorMessage } from '../../utils/apiErrorHandler';

export default function SabnzbdSettings() {
  const [config, setConfig] = useState<SabnzbdConfig>({ url: '', apiKey: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; apiKey?: string }>({});
  const { showToast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/sabnzbd`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load SABnzbd config:', error);
      showToast('error', 'Failed to load configuration');
    }
  };

  const validateForm = (): boolean => {
    const urlValidation = validateUrl(config.url);
    const apiKeyValidation = validateApiKey(config.apiKey);

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

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/sabnzbd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showToast('success', 'SABnzbd configuration saved successfully');
        setErrors({});
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'SABnzbd configuration');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: handleSave,
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'SABnzbd configuration');
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

  const handleTest = async () => {
    if (!validateForm()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/sabnzbd/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showToast('success', 'Connection test successful');
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'Connection test');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: handleTest,
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Connection test');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: handleTest,
        },
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">SABnzbd Configuration</h2>
      <div className="space-y-4">
        <Input
          label="URL"
          type="text"
          placeholder="http://localhost:8080"
          value={config.url}
          onChange={(e) => {
            setConfig({ ...config, url: e.target.value });
            if (errors.url) {
              setErrors({ ...errors, url: undefined });
            }
          }}
          error={errors.url}
        />
        <Input
          label="API Key"
          type="password"
          placeholder="Enter API key"
          value={config.apiKey}
          onChange={(e) => {
            setConfig({ ...config, apiKey: e.target.value });
            if (errors.apiKey) {
              setErrors({ ...errors, apiKey: undefined });
            }
          }}
          error={errors.apiKey}
        />
        <div className="flex gap-3">
          <Button onClick={handleTest} isLoading={isTesting} variant="secondary">
            Test Connection
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}

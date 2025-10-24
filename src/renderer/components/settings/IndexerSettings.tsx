import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Power, PowerOff } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { useToast } from '../ui/Toast';
import { IndexerConfig } from '../../../shared/types';
import { API_BASE_URL } from '../../config/api';
import { getUserFriendlyErrorMessage } from '../../utils/apiErrorHandler';
import { validateUrl, validateApiKey, validateRequired } from '../../utils/formValidation';

export default function IndexerSettings() {
  const [indexers, setIndexers] = useState<IndexerConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndexer, setEditingIndexer] = useState<IndexerConfig | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadIndexers();
  }, []);

  const loadIndexers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/indexers`);
      if (response.ok) {
        const data = await response.json();
        setIndexers(data);
      }
    } catch (error) {
      console.error('Failed to load indexers:', error);
      showToast('error', getUserFriendlyErrorMessage(error, 'Failed to load indexers'));
    }
  };

  const handleAdd = () => {
    setEditingIndexer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (indexer: IndexerConfig) => {
    setEditingIndexer(indexer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this indexer?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/config/indexers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'Indexer deleted successfully');
        loadIndexers();
      } else {
        const error = await response.json();
        showToast('error', getUserFriendlyErrorMessage(error, 'Failed to delete indexer'), {
          action: {
            label: 'Retry',
            onClick: () => handleDelete(id),
          },
        });
      }
    } catch (error) {
      showToast('error', getUserFriendlyErrorMessage(error, 'Failed to delete indexer'), {
        action: {
          label: 'Retry',
          onClick: () => handleDelete(id),
        },
      });
    }
  };

  const handleToggleEnabled = async (indexer: IndexerConfig) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/indexers/${indexer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...indexer, enabled: !indexer.enabled }),
      });

      if (response.ok) {
        showToast('success', `Indexer ${!indexer.enabled ? 'enabled' : 'disabled'}`);
        loadIndexers();
      } else {
        const error = await response.json();
        showToast('error', getUserFriendlyErrorMessage(error, 'Failed to update indexer'), {
          action: {
            label: 'Retry',
            onClick: () => handleToggleEnabled(indexer),
          },
        });
      }
    } catch (error) {
      showToast('error', getUserFriendlyErrorMessage(error, 'Failed to update indexer'), {
        action: {
          label: 'Retry',
          onClick: () => handleToggleEnabled(indexer),
        },
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Indexers</h2>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Indexer
        </Button>
      </div>

      {indexers.length === 0 ? (
        <p className="text-muted-foreground">No indexers configured</p>
      ) : (
        <div className="space-y-3">
          {indexers.map((indexer) => (
            <div
              key={indexer.id}
              className="flex items-center justify-between p-4 bg-background border border-border rounded-md"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{indexer.name}</h3>
                  {indexer.enabled ? (
                    <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{indexer.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleEnabled(indexer)}
                  title={indexer.enabled ? 'Disable' : 'Enable'}
                >
                  {indexer.enabled ? (
                    <Power className="h-4 w-4" />
                  ) : (
                    <PowerOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(indexer)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(indexer.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IndexerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        indexer={editingIndexer}
        onSave={() => {
          loadIndexers();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

interface IndexerModalProps {
  isOpen: boolean;
  onClose: () => void;
  indexer: IndexerConfig | null;
  onSave: () => void;
}

function IndexerModal({ isOpen, onClose, indexer, onSave }: IndexerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    apiKey: '',
    enabled: true,
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; url?: string; apiKey?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (indexer) {
      setFormData({
        name: indexer.name,
        url: indexer.url,
        apiKey: indexer.apiKey,
        enabled: indexer.enabled,
      });
    } else {
      setFormData({ name: '', url: '', apiKey: '', enabled: true });
    }
    setFormErrors({});
  }, [indexer, isOpen]);

  const validateForm = (): boolean => {
    const nameValidation = validateRequired(formData.name, 'Name');
    const urlValidation = validateUrl(formData.url);
    const apiKeyValidation = validateApiKey(formData.apiKey);

    const newErrors: { name?: string; url?: string; apiKey?: string } = {};

    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }
    if (!urlValidation.isValid) {
      newErrors.url = urlValidation.error;
    }
    if (!apiKeyValidation.isValid) {
      newErrors.apiKey = apiKeyValidation.error;
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsTesting(true);
    try {
      const testUrl = indexer
        ? `${API_BASE_URL}/api/config/indexers/${indexer.id}/test`
        : `${API_BASE_URL}/api/config/indexers/test`;

      const response = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const url = indexer
        ? `${API_BASE_URL}/api/config/indexers/${indexer.id}`
        : `${API_BASE_URL}/api/config/indexers`;

      const response = await fetch(url, {
        method: indexer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('success', `Indexer ${indexer ? 'updated' : 'added'} successfully`);
        onSave();
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'Indexer');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: () => handleSubmit(e),
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Indexer');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: () => handleSubmit(e),
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={indexer ? 'Edit Indexer' : 'Add Indexer'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          type="text"
          placeholder="My Indexer"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (formErrors.name) {
              setFormErrors({ ...formErrors, name: undefined });
            }
          }}
          error={formErrors.name}
          required
        />
        <Input
          label="URL"
          type="text"
          placeholder="https://indexer.example.com"
          value={formData.url}
          onChange={(e) => {
            setFormData({ ...formData, url: e.target.value });
            if (formErrors.url) {
              setFormErrors({ ...formErrors, url: undefined });
            }
          }}
          error={formErrors.url}
          required
        />
        <Input
          label="API Key"
          type="password"
          placeholder="Enter API key"
          value={formData.apiKey}
          onChange={(e) => {
            setFormData({ ...formData, apiKey: e.target.value });
            if (formErrors.apiKey) {
              setFormErrors({ ...formErrors, apiKey: undefined });
            }
          }}
          error={formErrors.apiKey}
          required
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="enabled" className="text-sm font-medium">
            Enable this indexer
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" onClick={handleTest} isLoading={isTesting} variant="secondary">
            Test Connection
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {indexer ? 'Update' : 'Add'} Indexer
          </Button>
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

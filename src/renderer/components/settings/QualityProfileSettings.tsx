import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Star } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { useToast } from '../ui/Toast';
import { QualityProfile } from '../../../shared/types';
import { API_BASE_URL } from '../../config/api';
import { getUserFriendlyErrorMessage } from '../../utils/apiErrorHandler';
import { validateRequired, validateNumberRange } from '../../utils/formValidation';

const AVAILABLE_FORMATS = ['FLAC', 'MP3', 'M4A', 'AAC', 'OGG', 'ALAC'];

export default function QualityProfileSettings() {
  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<QualityProfile | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quality-profiles`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to load quality profiles:', error);
      showToast('error', getUserFriendlyErrorMessage(error, 'Failed to load quality profiles'));
    }
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const handleEdit = (profile: QualityProfile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quality profile?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/quality-profiles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'Quality profile deleted successfully');
        loadProfiles();
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'Quality profile');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: () => handleDelete(id),
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Quality profile');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: () => handleDelete(id),
        },
      });
    }
  };

  const handleSetDefault = async (profile: QualityProfile) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quality-profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, isDefault: true }),
      });

      if (response.ok) {
        showToast('success', 'Default quality profile updated');
        loadProfiles();
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'Quality profile');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: () => handleSetDefault(profile),
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Quality profile');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: () => handleSetDefault(profile),
        },
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quality Profiles</h2>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Profile
        </Button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-muted-foreground">No quality profiles configured</p>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-4 bg-background border border-border rounded-md"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{profile.name}</h3>
                  {profile.isDefault && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-600 text-white rounded flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>Formats: {profile.formats.join(', ')}</p>
                  {profile.minBitrate && <p>Min Bitrate: {profile.minBitrate} kbps</p>}
                  {profile.maxFileSize && <p>Max File Size: {profile.maxFileSize} MB</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!profile.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(profile)}
                    title="Set as default"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(profile)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(profile.id)}
                  disabled={profile.isDefault}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <QualityProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={editingProfile}
        onSave={() => {
          loadProfiles();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

interface QualityProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: QualityProfile | null;
  onSave: () => void;
}

function QualityProfileModal({ isOpen, onClose, profile, onSave }: QualityProfileModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    formats: [] as string[],
    minBitrate: '',
    maxFileSize: '',
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; minBitrate?: string; maxFileSize?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        formats: profile.formats,
        minBitrate: profile.minBitrate?.toString() || '',
        maxFileSize: profile.maxFileSize?.toString() || '',
        isDefault: profile.isDefault,
      });
    } else {
      setFormData({
        name: '',
        formats: [],
        minBitrate: '',
        maxFileSize: '',
        isDefault: false,
      });
    }
    setFormErrors({});
  }, [profile, isOpen]);

  const handleFormatToggle = (format: string) => {
    setFormData((prev) => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format],
    }));
  };

  const validateForm = (): boolean => {
    const nameValidation = validateRequired(formData.name, 'Name');
    const newErrors: { name?: string; minBitrate?: string; maxFileSize?: string } = {};

    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    if (formData.minBitrate) {
      const bitrateValidation = validateNumberRange(parseInt(formData.minBitrate), 64, 320, 'Minimum bitrate');
      if (!bitrateValidation.isValid) {
        newErrors.minBitrate = bitrateValidation.error;
      }
    }

    if (formData.maxFileSize) {
      const fileSizeValidation = validateNumberRange(parseInt(formData.maxFileSize), 1, 10000, 'Maximum file size');
      if (!fileSizeValidation.isValid) {
        newErrors.maxFileSize = fileSizeValidation.error;
      }
    }

    if (formData.formats.length === 0) {
      showToast('error', 'Please select at least one format');
      return false;
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name,
        formats: formData.formats,
        minBitrate: formData.minBitrate ? parseInt(formData.minBitrate) : undefined,
        maxFileSize: formData.maxFileSize ? parseInt(formData.maxFileSize) : undefined,
        isDefault: formData.isDefault,
      };

      const url = profile
        ? `${API_BASE_URL}/api/quality-profiles/${profile.id}`
        : `${API_BASE_URL}/api/quality-profiles`;

      const response = await fetch(url, {
        method: profile ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast('success', `Quality profile ${profile ? 'updated' : 'created'} successfully`);
        onSave();
      } else {
        const error = await response.json();
        const message = getUserFriendlyErrorMessage(error, 'Quality profile');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: () => handleSubmit(e),
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Quality profile');
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
      title={profile ? 'Edit Quality Profile' : 'Add Quality Profile'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Profile Name"
          type="text"
          placeholder="High Quality"
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

        <div>
          <label className="block text-sm font-medium mb-2">Formats</label>
          <div className="grid grid-cols-3 gap-2">
            {AVAILABLE_FORMATS.map((format) => (
              <label
                key={format}
                className="flex items-center gap-2 p-2 border border-border rounded cursor-pointer hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={formData.formats.includes(format)}
                  onChange={() => handleFormatToggle(format)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{format}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Minimum Bitrate (kbps)"
          type="number"
          placeholder="320"
          value={formData.minBitrate}
          onChange={(e) => {
            setFormData({ ...formData, minBitrate: e.target.value });
            if (formErrors.minBitrate) {
              setFormErrors({ ...formErrors, minBitrate: undefined });
            }
          }}
          error={formErrors.minBitrate}
        />

        <Input
          label="Maximum File Size (MB)"
          type="number"
          placeholder="500"
          value={formData.maxFileSize}
          onChange={(e) => {
            setFormData({ ...formData, maxFileSize: e.target.value });
            if (formErrors.maxFileSize) {
              setFormErrors({ ...formErrors, maxFileSize: undefined });
            }
          }}
          error={formErrors.maxFileSize}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="isDefault" className="text-sm font-medium">
            Set as default profile
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" isLoading={isLoading}>
            {profile ? 'Update' : 'Create'} Profile
          </Button>
          <Button type="button" onClick={onClose} variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

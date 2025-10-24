import React from 'react';
import SabnzbdSettings from '../components/settings/SabnzbdSettings';
import IndexerSettings from '../components/settings/IndexerSettings';
import QualityProfileSettings from '../components/settings/QualityProfileSettings';
import LibrarySettings from '../components/settings/LibrarySettings';
import AppSettings from '../components/settings/AppSettings';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-8 max-w-4xl">
        <AppSettings />
        <SabnzbdSettings />
        <IndexerSettings />
        <QualityProfileSettings />
        <LibrarySettings />
      </div>
    </div>
  );
}

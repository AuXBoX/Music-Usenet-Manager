import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import LibraryPage from './pages/LibraryPage';
import ArtistDetailPage from './pages/ArtistDetailPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { UpdateNotification } from './components/UpdateNotification';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <div className="flex">
              <Sidebar />

              {/* Main content area */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-h-screen lg:ml-0">
                <div className="max-w-7xl mx-auto">
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/library" element={<LibraryPage />} />
                      <Route path="/artists" element={<LibraryPage />} />
                      <Route path="/artists/:id" element={<ArtistDetailPage />} />
                      <Route path="/downloads" element={<DownloadsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                  </ErrorBoundary>
                </div>
              </main>
            </div>
            
            {/* Update notification */}
            <UpdateNotification />
          </div>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

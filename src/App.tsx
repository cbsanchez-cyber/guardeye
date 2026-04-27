/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { DashboardLayout } from './pages/DashboardLayout';
import { ScheduleSession } from './pages/ScheduleSession';
import { StartSession } from './pages/StartSession';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { SessionRecords } from './pages/SessionRecords';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="schedule" replace />} />
            <Route path="schedule" element={<ScheduleSession />} />
            <Route path="start" element={<StartSession />} />
            <Route path="monitoring" element={<LiveMonitoring />} />
            <Route path="records" element={<SessionRecords />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard/schedule" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

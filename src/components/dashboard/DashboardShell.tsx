'use client';

import React, { useState } from 'react';
import { colors, spacing, typography } from '@/lib/design-tokens';
import DashboardSidebar from './Sidebar';
import DashboardTopbar from './Topbar';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.body,
      }}
    >
      {/* Sidebar */}
      <DashboardSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Topbar */}
        <DashboardTopbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Area */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: spacing[6],
            backgroundColor: colors.background.primary,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

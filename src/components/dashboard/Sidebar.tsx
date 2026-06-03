'use client';

import SidebarWithSubmenu from '@/components/sidebar-with-submenu';

interface DashboardSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function DashboardSidebar({ open, onToggle }: DashboardSidebarProps) {
  return <SidebarWithSubmenu collapsed={!open} onToggle={onToggle} />;
}

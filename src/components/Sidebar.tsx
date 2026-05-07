'use client';

import SidebarWithSubmenu from '@/components/sidebar-with-submenu';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return <SidebarWithSubmenu collapsed={collapsed} onToggle={onToggle} />;
}

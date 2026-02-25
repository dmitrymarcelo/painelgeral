import { translations } from './i18n';

export const webSidebarItems = [
  { href: "/web/dashboard", label: translations.dashboard },
  { href: "/web/assets", label: translations.assetManagement },
  { href: "/web/maintenance", label: translations.workOrders },
  { href: "/web/calendar", label: translations.calendar },
];

export const mobileTabs = [
  { href: "/app/home", label: translations.panel },
  { href: "/app/assets", label: "Ativos" },
  { href: "/app/maintenance", label: "OS" },
  { href: "/app/agenda", label: translations.calendar },
];

export const metrics = {
  overdue: 8,
  nearDue: 15,
  compliance: 92,
  assetsTotal: 124,
};

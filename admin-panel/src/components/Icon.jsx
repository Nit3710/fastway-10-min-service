const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  orders: <><path d="M6 3h12l2 4v13H4V7l2-4Z"/><path d="M4 7h16M9 11h6"/></>,
  products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></>,
  categories: <><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3 2.5-5 6-5s5.5 2 6 5"/><circle cx="17" cy="9" r="2"/><path d="M17 14c2.5 0 3.5 1.5 4 3"/></>,
  delivery: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
  payments: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>,
  refresh: <><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/></>,
  inbox: <><path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5a2 2 0 0 0 0-3l-1-.4a7 7 0 0 0-.7-1.7l.4-1a2 2 0 0 0-2.1-2.1l-1 .4a7 7 0 0 0-1.7-.7l-.4-1a2 2 0 0 0-3 0l-.4 1a7 7 0 0 0-1.7.7l-1-.4A2 2 0 0 0 4.3 7.4l.4 1a7 7 0 0 0-.7 1.7l-1 .4a2 2 0 0 0 0 3l1 .4a7 7 0 0 0 .7 1.7l-.4 1a2 2 0 0 0 2.1 2.1l1-.4a7 7 0 0 0 1.7.7l.4 1a2 2 0 0 0 3 0l.4-1a7 7 0 0 0 1.7-.7l1 .4a2 2 0 0 0 2.1-2.1l-.4-1a7 7 0 0 0 .7-1.7l1-.4Z"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></>,
};

export default function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

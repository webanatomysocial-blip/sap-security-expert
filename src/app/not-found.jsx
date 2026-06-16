'use client';

import dynamic from 'next/dynamic';

// Renders the React SPA for any route Next.js doesn't recognise.
// Apache proxies all traffic to Next.js (port 3000). For paths that have no
// matching App Router page, Next.js renders this component which boots the SPA,
// letting react-router-dom handle client-side navigation correctly.
const App = dynamic(() => import('../AppWrapper'), { ssr: false });

export default function NotFound() {
  return <App />;
}

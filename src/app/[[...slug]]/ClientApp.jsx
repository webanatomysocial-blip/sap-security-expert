'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../../AppWrapper'), { ssr: false });

export default function ClientApp() {
  return <App />;
}

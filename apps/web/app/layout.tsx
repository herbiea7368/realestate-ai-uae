import type { ReactNode } from 'react';
import './styles.css';
import { IntlProviders } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <IntlProviders>{children}</IntlProviders>
      </body>
    </html>
  );
}

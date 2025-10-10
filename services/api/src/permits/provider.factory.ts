import { PermitProvider } from './provider.interface';
import { mockProvider } from './provider.mock';
import { dldProvider } from './provider.dld';

let resolvedProvider: PermitProvider | null = null;

function resolveProvider(): PermitProvider {
  if (resolvedProvider) {
    return resolvedProvider;
  }

  resolvedProvider = process.env.NODE_ENV === 'production' ? dldProvider : mockProvider;
  return resolvedProvider;
}

export function getProvider(): PermitProvider {
  return resolveProvider();
}

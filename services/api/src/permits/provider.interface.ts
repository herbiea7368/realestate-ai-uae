import { PermitRecord } from '../types';

export interface PermitProvider {
  verify(trakheesi: string): Promise<PermitRecord>;
}

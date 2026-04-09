import { backendFetch } from './backendApi';

export interface GeneticProfile {
  id: string;
  uid: string;
  rsIds: string[];
  prsT2d: number;
  prsCad: number;
  prsHtn: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneticFlag {
  id?: string;
  uid?: string;
  type: string;
  gene: string | null;
  severity: string;
  conditions: string[];
  plainLanguage: string;
  actionRequired: string;
  drugWarning?: string | null;
  source: string;
  createdAt?: string;
}

export interface GeneticProfilePayload {
  geneticProfile: GeneticProfile | null;
  flags: GeneticFlag[];
  summary?: {
    rsIdCount?: number;
    clinvarAnnotatedCount?: number;
    generatedFlagCount?: number;
  };
}

export interface UploadableVcf {
  uri: string;
  name?: string;
  mimeType?: string;
}

export async function uploadGenomicVcf(
  file: UploadableVcf
): Promise<GeneticProfilePayload> {
  const form = new FormData();
  const requestedName = (file.name || 'genome.vcf').trim();
  const filename = requestedName.toLowerCase().endsWith('.vcf')
    ? requestedName
    : `${requestedName}.vcf`;

  form.append('file', {
    uri: file.uri,
    name: filename,
    type: file.mimeType || 'text/plain'
  } as any);

  return backendFetch<GeneticProfilePayload>('/genomics/upload', {
    method: 'POST',
    body: form
  });
}

export async function getGeneticProfile(): Promise<GeneticProfilePayload> {
  return backendFetch<GeneticProfilePayload>('/genomics/profile', {
    method: 'GET'
  });
}

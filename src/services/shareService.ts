import { backendFetch } from './backendApi';

export type ShareLinkRecord = {
  id: string;
  assessmentId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastViewedAt?: string | null;
  viewCount?: number;
  status?: 'active' | 'expired' | 'revoked';
  shareUrl?: string;
};

export type OverallShareLinkRecord = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status?: 'active' | 'expired' | 'revoked';
  shareUrl?: string;
};

type CreateShareLinkResponse = {
  id: string;
  assessmentId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  shareUrl: string;
};

type ListShareLinksResponse = {
  shareLinks: ShareLinkRecord[];
};

type CreateOverallShareLinkResponse = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: 'active' | 'expired' | 'revoked';
  shareUrl: string;
};

export async function createShareLink(
  assessmentId: string,
  expiresInHours = 72
): Promise<ShareLinkRecord> {
  const response = await backendFetch<CreateShareLinkResponse>('/share-links', {
    method: 'POST',
    body: JSON.stringify({
      assessmentId,
      expiresInHours
    })
  });

  return {
    id: response.id,
    assessmentId: response.assessmentId,
    createdAt: response.createdAt,
    expiresAt: response.expiresAt,
    revokedAt: response.revokedAt,
    shareUrl: response.shareUrl,
    status: response.revokedAt ? 'revoked' : 'active'
  };
}

export async function listShareLinks(
  assessmentId?: string
): Promise<ShareLinkRecord[]> {
  const query = assessmentId
    ? `?assessmentId=${encodeURIComponent(assessmentId)}`
    : '';
  const response = await backendFetch<ListShareLinksResponse>(
    `/share-links${query}`,
    {
      method: 'GET'
    }
  );

  return Array.isArray(response.shareLinks) ? response.shareLinks : [];
}

export async function revokeShareLink(shareLinkId: string): Promise<void> {
  await backendFetch<{ ok: boolean; id: string }>(`/share-links/${shareLinkId}`, {
    method: 'DELETE'
  });
}

export async function createOverallShareLink(
  chatDetectedTitles: string[],
  expiresInHours = 72
): Promise<OverallShareLinkRecord> {
  const response = await backendFetch<CreateOverallShareLinkResponse>(
    '/overall-share-links',
    {
      method: 'POST',
      body: JSON.stringify({
        chatDetectedTitles,
        expiresInHours
      })
    }
  );

  return {
    id: response.id,
    createdAt: response.createdAt,
    expiresAt: response.expiresAt,
    revokedAt: response.revokedAt,
    status: response.status,
    shareUrl: response.shareUrl
  };
}

import { useEffect, useState } from 'react';
import { Assessment, getRecentAssessments } from '../services/assessmentService';

export function useRecentAssessments(uid?: string, limit: number = 3) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!uid) {
        setAssessments([]);
        return;
      }

      try {
        const data = await getRecentAssessments(uid, limit);
        if (!cancelled) setAssessments(data);
      } catch {
        if (!cancelled) setAssessments([]);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [uid, limit]);

  return { assessments };
}

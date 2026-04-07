import { useCallback, useEffect, useState } from 'react';
import { Assessment, getUserAssessments } from '../services/assessmentService';

export function useUserAssessments(uid?: string) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!uid) {
      setAssessments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getUserAssessments(uid);
      setAssessments(data);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { assessments, loading, reload };
}

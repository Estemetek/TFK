//dashboard
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DashboardPage() {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchUserCount = async () => {
      const { count, error } = await supabase
        .from('UserAccount')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setUserCount(count);
      } else {
        console.error('Error fetching user count:', error);
      }
    };

    fetchUserCount();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
    </div>
  );
}

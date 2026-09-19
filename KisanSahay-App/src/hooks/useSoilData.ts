import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';
import { useProfileStore } from '../store/profileStore';

export function useSoilData() {
  const { profile } = useProfileStore();
  const [soilProfile, setSoilProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSoil = useCallback(async (state: string, district: string) => {
    setIsLoading(true);
    const data = await ApiService.getSoilFertility(state, district);
    setSoilProfile(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSoil(profile.state, profile.district);
  }, [profile.state, profile.district, fetchSoil]);

  return {
    soilProfile,
    isLoading,
    refreshSoil: () => fetchSoil(profile.state, profile.district),
  };
}

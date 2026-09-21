import { useEffect, useState } from 'react';

import {
  getAvailableMotorCoverTypes,
  type MotorCoverTypeOption,
} from '../../services/quote';

export function useAvailableMotorCoverTypes() {
  const [options, setOptions] = useState<MotorCoverTypeOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getAvailableMotorCoverTypes().then((next) => {
      if (!cancelled) setOptions(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}

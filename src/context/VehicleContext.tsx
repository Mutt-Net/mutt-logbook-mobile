import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Vehicle } from '../types';
import { VehicleService } from '../services/database';
import { logger } from '../lib/logger';

interface VehicleContextType {
  selectedVehicleId: number | null;
  vehicles: Vehicle[];
  setSelectedVehicleId: (id: number) => void;
  refreshVehicles: () => Promise<void>;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

interface VehicleProviderProps {
  children: ReactNode;
}

export const VehicleProvider: React.FC<VehicleProviderProps> = ({ children }) => {
  const [selectedVehicleId, setSelectedVehicleIdState] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const refreshVehicles = useCallback(async () => {
    try {
      const allVehicles = await VehicleService.getAll();
      setVehicles(allVehicles);
    } catch (error) {
      logger.error('Failed to refresh vehicles', { error });
    }
  }, []);

  const setSelectedVehicleId = useCallback((id: number) => {
    setSelectedVehicleIdState(id);
  }, []);

  useEffect(() => {
    refreshVehicles();
  }, [refreshVehicles]);

  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicleId === null) {
      setSelectedVehicleIdState(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  return (
    <VehicleContext.Provider
      value={{
        selectedVehicleId,
        vehicles,
        setSelectedVehicleId,
        refreshVehicles,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicle = (): VehicleContextType => {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicle must be used within a VehicleProvider');
  }
  return context;
};

export default VehicleContext;

/**
 * Service status utility functions
 * Checks the status of various services required by the application
 */

// Define service types
export interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'checking';
  lastChecked: Date | null;
}

/**
 * Check if the Django backend API is running
 */
export const checkBackendAPI = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://150.230.123.106:8000/api/properties/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking backend API:', error);
    return false;
  }
};

/**
 * Check if the Django admin interface is accessible
 */
export const checkDjangoAdmin = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://150.230.123.106:8000/admin/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking Django admin:', error);
    return false;
  }
};

/**
 * Get the status of all services
 */
export const getAllServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const services: ServiceStatus[] = [
    {
      id: 'backend-api',
      name: 'Backend API',
      description: 'Django REST API server',
      status: 'checking',
      lastChecked: null,
    },
    {
      id: 'django-admin',
      name: 'Django Admin',
      description: 'Django administration interface',
      status: 'checking',
      lastChecked: null,
    },
  ];

  // Check each service
  for (const service of services) {
    try {
      let isOnline = false;
      
      switch (service.id) {
        case 'backend-api':
          isOnline = await checkBackendAPI();
          break;
        case 'django-admin':
          isOnline = await checkDjangoAdmin();
          break;
        default:
          isOnline = false;
      }
      
      service.status = isOnline ? 'online' : 'offline';
      service.lastChecked = new Date();
    } catch (error) {
      console.error(`Error checking service ${service.id}:`, error);
      service.status = 'offline';
      service.lastChecked = new Date();
    }
  }

  return services;
};

/**
 * Get service status by ID
 */
export const getServiceStatus = async (serviceId: string): Promise<ServiceStatus | null> => {
  const services = await getAllServiceStatuses();
  return services.find(service => service.id === serviceId) || null;
};

/**
 * Check if all required services are online
 */
export const checkAllServicesOnline = async (): Promise<boolean> => {
  const services = await getAllServiceStatuses();
  return services.every(service => service.status === 'online');
}; 
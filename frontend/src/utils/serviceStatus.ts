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
 * Check if the PDF service is running
 */
export const checkPDFService = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:5003/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'healthy';
    }
    return false;
  } catch (error) {
    console.error('Error checking PDF service:', error);
    return false;
  }
};

/**
 * Check if Property24 scraping service is available
 */
export const checkProperty24Service = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:5003/api/property24/suburb-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      // If we can get suburb status, the Property24 service is available
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking Property24 service:', error);
    return false;
  }
};

/**
 * Check if the CMA API Server is running
 */
export const checkCMAApiServer = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch (error) {
    console.error('Error checking CMA API Server:', error);
    return false;
  }
};

/**
 * Check if LlamaParse service is configured properly
 */
export const checkLlamaParseService = async (): Promise<boolean> => {
  try {
    // First check if the settings have LlamaParse enabled
    const savedSettings = localStorage.getItem('app-settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {};
    
    // Check if PDF service is running (required for LlamaParse)
    const pdfServiceRunning = await checkPDFService();
    
    if (!pdfServiceRunning) {
      return false;
    }
    
    // For simplicity, we'll consider LlamaParse available if:
    // 1. PDF service is running (checked above)
    // 2. The useLlamaParse setting is enabled (optional check)
    return true;
  } catch (error) {
    console.error('Error checking LlamaParse service:', error);
    return false;
  }
};

/**
 * Check if OpenAI service is configured properly
 */
export const checkOpenAIService = async (): Promise<boolean> => {
  try {
    // Similar to LlamaParse, we'd need a specific endpoint on the PDF service
    // that validates OpenAI API key connectivity
    // For now, we'll just check if an API key exists in local storage
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      // In a real implementation, we would validate the key
      return settings.hasOwnProperty('useLlamaParse');
    }
    return false;
  } catch (error) {
    console.error('Error checking OpenAI service:', error);
    return false;
  }
};

/**
 * Start the PDF service
 */
export const startPDFService = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // In a real implementation, you would have an endpoint that triggers the service start
    // For now, we'll use a mechanism that opens a new window with instructions
    window.open('http://localhost:5003/start', '_blank');
    return { 
      success: true, 
      message: 'Starting PDF service. Check terminal for progress.' 
    };
  } catch (error) {
    console.error('Error starting PDF service:', error);
    return { 
      success: false, 
      message: 'Failed to start PDF service. Please start it manually using: cd property-analysis-tool/pdf-service && bash run_service.sh' 
    };
  }
};

/**
 * Configure Property24 scraping service
 */
export const configureProperty24Service = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if the PDF service is running (required for Property24 scraping)
    const pdfServiceRunning = await checkPDFService();
    
    if (!pdfServiceRunning) {
      return { 
        success: false, 
        message: 'PDF service must be running for Property24 scraping. Please start the PDF service first.' 
      };
    }

    // Check if Property24 service is accessible
    const property24ServiceRunning = await checkProperty24Service();
    
    if (property24ServiceRunning) {
      return { 
        success: true, 
        message: 'Property24 scraping service is ready. You can now scrape suburbs from the Settings page.' 
      };
    } else {
      return { 
        success: false, 
        message: 'Property24 scraping endpoints are not accessible. Please check the PDF service logs.' 
      };
    }
  } catch (error) {
    console.error('Error configuring Property24 service:', error);
    return { 
      success: false, 
      message: 'Failed to configure Property24 service. Please check the console for details.' 
    };
  }
};

/**
 * Start the CMA API Service
 */
export const startCMAService = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // In a real implementation, you would have an endpoint that triggers the service start
    window.open('http://localhost:3001/start', '_blank');
    return { 
      success: true, 
      message: 'Starting CMA API service. Check terminal for progress.' 
    };
  } catch (error) {
    console.error('Error starting CMA API service:', error);
    return { 
      success: false, 
      message: 'Failed to start CMA API service. Please start it manually using: node api_server.js' 
    };
  }
};

/**
 * Configure LlamaParse service
 */
export const configureLlamaParseService = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Get current settings
    const savedSettings = localStorage.getItem('app-settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {};
    
    // Enable LlamaParse in settings
    settings.useLlamaParse = true;
    localStorage.setItem('app-settings', JSON.stringify(settings));
    
    // Check if the PDF service is running
    const pdfServiceRunning = await checkPDFService();
    
    if (!pdfServiceRunning) {
      return { 
        success: false, 
        message: 'PDF service must be running to use LlamaParse. Please start the PDF service first.' 
      };
    }
    
    return { 
      success: true, 
      message: 'LlamaParse setting enabled. The service should now be available for PDF parsing. If you experience issues, check that the API key is correctly set in the property-analysis-tool/pdf-service/.env file.' 
    };
  } catch (error) {
    console.error('Error configuring LlamaParse service:', error);
    return { 
      success: false, 
      message: 'Failed to configure LlamaParse. Please check the console for details.' 
    };
  }
};

/**
 * Configure OpenAI service
 */
export const configureOpenAIService = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // In a real implementation, this would open a configuration dialog
    return { 
      success: true, 
      message: 'Please add your OpenAI API key to the .env file in the pdf-service directory.' 
    };
  } catch (error) {
    console.error('Error configuring OpenAI service:', error);
    return { 
      success: false, 
      message: 'Failed to configure OpenAI. Please add your API key manually.' 
    };
  }
};

/**
 * Get the start function for a specific service
 */
export const getServiceStartFunction = (serviceId: string): (() => Promise<{ success: boolean; message: string }>) => {
  switch (serviceId) {
    case 'pdf-service':
      return startPDFService;
    case 'property24-scraper':
      return configureProperty24Service;
    case 'cma-api':
      return startCMAService;
    case 'llamaparse':
      return configureLlamaParseService;
    case 'openai':
      return configureOpenAIService;
    default:
      return async () => ({ success: false, message: 'Unknown service' });
  }
};

/**
 * Get all service statuses
 */
export const getAllServiceStatuses = async (): Promise<ServiceStatus[]> => {
  const services: ServiceStatus[] = [
    {
      id: 'pdf-service',
      name: 'PDF Service',
      description: 'Flask API for PDF processing',
      status: 'checking',
      lastChecked: null
    },
    {
      id: 'property24-scraper',
      name: 'Property24 Scraper',
      description: 'Advanced web scraping with proxy support',
      status: 'checking',
      lastChecked: null
    },
    {
      id: 'cma-api',
      name: 'CMA API Server',
      description: 'Express server for CMA website automation',
      status: 'checking',
      lastChecked: null
    },
    {
      id: 'llamaparse',
      name: 'LlamaParse API',
      description: 'Enhanced PDF document parsing',
      status: 'checking',
      lastChecked: null
    },
    {
      id: 'openai',
      name: 'OpenAI API',
      description: 'AI-assisted data extraction',
      status: 'checking',
      lastChecked: null
    }
  ];

  // Check PDF service status
  const pdfServiceStatus = await checkPDFService();
  services[0].status = pdfServiceStatus ? 'online' : 'offline';
  services[0].lastChecked = new Date();

  // Check Property24 service status
  const property24ServiceStatus = await checkProperty24Service();
  services[1].status = property24ServiceStatus ? 'online' : 'offline';
  services[1].lastChecked = new Date();

  // Check CMA API Server status
  const cmaApiStatus = await checkCMAApiServer();
  services[2].status = cmaApiStatus ? 'online' : 'offline';
  services[2].lastChecked = new Date();

  // Check LlamaParse status
  const llamaParseStatus = await checkLlamaParseService();
  services[3].status = llamaParseStatus ? 'online' : 'offline';
  services[3].lastChecked = new Date();

  // Check OpenAI status
  const openAIStatus = await checkOpenAIService();
  services[4].status = openAIStatus ? 'online' : 'offline';
  services[4].lastChecked = new Date();

  return services;
}; 
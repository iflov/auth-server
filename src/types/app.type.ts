export interface RootEndPointResponse {
  name: string;
  version: string;
  status: string;
  endpoints: {
    health: string;
    wellKnown: string;
    authorize: string;
    token: string;
    register: string;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
  };
}

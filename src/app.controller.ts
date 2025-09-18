import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { RootEndPointResponse, HealthCheckResponse } from './types/app.type';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRootEndPoint(): Promise<RootEndPointResponse> {
    return this.appService.getRootEndPoint();
  }

  @Get('health')
  getHealth(): Promise<HealthCheckResponse> {
    return this.appService.getHealth();
  }
}

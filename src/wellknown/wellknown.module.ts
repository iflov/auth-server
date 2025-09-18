import { Module } from '@nestjs/common';
import { WellknownController } from './wellknown.controller';
import { WellknownService } from './wellknown.service';

@Module({
  controllers: [WellknownController],
  providers: [WellknownService],
})
export class WellknownModule {}

import { Injectable } from '@nestjs/common';
import { OAuthOutboundPort } from './oauth.outbound-port';

@Injectable()
export class OAuthRepository implements OAuthOutboundPort {
  constructor(private readonly oauthOutboundPort: OAuthOutboundPort) {}
}

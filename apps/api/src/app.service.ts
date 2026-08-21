import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'globalwork-api',
      status: 'ok',
    };
  }
}

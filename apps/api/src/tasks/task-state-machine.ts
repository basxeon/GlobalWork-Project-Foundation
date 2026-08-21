import { Injectable } from '@nestjs/common';

const flow: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class TaskStateMachine {
  canTransition(current: string, target: string): boolean {
    return flow[current]?.includes(target) ?? false;
  }
}

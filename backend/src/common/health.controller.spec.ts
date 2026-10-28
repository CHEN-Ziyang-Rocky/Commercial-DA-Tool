import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('Database readiness', () => {
  it('returns unavailable without leaking the database error', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(new Error('private database details'));
    const controller = new HealthController({ query } as unknown as DataSource);
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(controller.check()).rejects.toThrow('Database unavailable');
  });
});

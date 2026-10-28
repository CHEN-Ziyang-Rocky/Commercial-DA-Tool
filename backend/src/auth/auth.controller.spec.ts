import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Public registration switch', () => {
  const original = process.env.ALLOW_REGISTRATION;
  const register = jest.fn();
  const controller = new AuthController({ register } as unknown as AuthService);
  const dto = {
    name: 'Visitor',
    email: 'visitor@example.com',
    password: 'Password123!',
  };
  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_REGISTRATION;
    else process.env.ALLOW_REGISTRATION = original;
    register.mockReset();
  });
  it.each([undefined, 'false', 'TRUE'])(
    'denies registration for %s without creating a user',
    (value) => {
      if (value === undefined) delete process.env.ALLOW_REGISTRATION;
      else process.env.ALLOW_REGISTRATION = value;
      expect(() => controller.register(dto)).toThrow(ForbiddenException);
      expect(register).not.toHaveBeenCalled();
    },
  );
  it('only allows an explicit true', async () => {
    process.env.ALLOW_REGISTRATION = 'true';
    await controller.register(dto);
    expect(register).toHaveBeenCalledWith(dto.name, dto.email, dto.password);
  });
});

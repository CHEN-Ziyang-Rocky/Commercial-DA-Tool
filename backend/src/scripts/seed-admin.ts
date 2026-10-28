import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateUserDto } from '../modules/user/dto/create-user.dto';
import { AppDataSource } from '../config/typeorm.config';
import { UserService } from '../modules/user/user.service';
import { User } from '../modules/user/user.entity';
async function main() {
  const visitor = process.argv.includes('--visitor');
  const email = visitor ? process.env.VISITOR_EMAIL : process.env.ADMIN_EMAIL;
  const password = visitor
    ? process.env.VISITOR_PASSWORD
    : process.env.ADMIN_PASSWORD;
  const dto = plainToInstance(CreateUserDto, {
    fullName: visitor ? 'Read-only Visitor' : 'Administrator',
    email,
    password,
    role: visitor ? 'user' : 'admin',
  });
  if (validateSync(dto).length)
    throw new Error(
      'Set a valid account EMAIL and PASSWORD (8–50 characters, at most 72 UTF-8 bytes)',
    );
  await AppDataSource.initialize();
  try {
    const service = new UserService(AppDataSource.getRepository(User));
    if (await service.findByEmail(email))
      throw new Error('Account exists; no role/password changes were made');
    await service.create(dto);
    console.log(
      visitor ? 'Read-only visitor created.' : 'Administrator created.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Operation failed');
  process.exitCode = 1;
});

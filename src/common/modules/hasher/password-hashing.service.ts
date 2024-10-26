import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/bcrypt';

@Injectable()
export class PasswordHashingService {
  async hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    return verify(password, hashedPassword);
  }
}

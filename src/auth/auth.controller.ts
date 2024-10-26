import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto';
import { LoginDto } from '@/auth/dto/login.dto';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto';
import { UserEmailConfirmDto } from '@/auth/dto/user-email-confirm.dto';

import { AuthService } from './auth.service';
import { UserRegisterDto } from './dto/user-register.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'New User Registration' })
  @ApiOkResponse({ description: 'User successfully registered.' })
  @ApiUnprocessableEntityResponse({
    description:
      'Invalid input data. Please ensure all required fields are correctly filled.',
  })
  @Post('register')
  async register(@Body() body: UserRegisterDto) {
    await this.authService.register(body);

    return { status: 'OK' };
  }

  @ApiOperation({ summary: 'Confirm Email Address' })
  @ApiOkResponse({ description: 'Email successfully confirmed.' })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid email or confirmation token.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request. Ensure email and token are provided.',
  })
  @Post('register/confirm')
  async confirm(@Body() { email, token }: UserEmailConfirmDto) {
    await this.authService.confirm(email, token);

    return { status: 'OK' };
  }

  @ApiOperation({ summary: 'Login' })
  @ApiOkResponse({})
  @ApiBadRequestResponse({
    description: 'Bad request. Ensure email and password are provided.',
  })
  @Post('login')
  async login(@Body() { email, password }: LoginDto) {
    const { accessToken, expiresIn } = await this.authService.login(
      email,
      password,
    );

    return { accessToken, expiresIn };
  }

  @ApiOperation({ summary: 'Forgot Password' })
  @ApiOkResponse({})
  @ApiBadRequestResponse({})
  @Post('password/forgot')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    await this.authService.forgotPassword(email);

    return { status: 'OK' };
  }

  @ApiOperation({ summary: 'Reset Password' })
  @Post('/password/reset')
  async resetPassword(@Body() { email, newPassword, token }: ResetPasswordDto) {
    await this.authService.resetPassword(email, newPassword, token);

    return { status: 'OK' };
  }
}

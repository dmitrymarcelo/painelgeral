import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(
    @Headers('x-tenant-id') tenantSlug: string | undefined,
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(
      tenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? 'frota-pro',
      dto,
    );
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@CurrentUser() user: AuthUser | undefined) {
    return this.authService.logout(user?.sub ?? '');
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser | undefined) {
    return { user };
  }
}

/**
 * RESPONSABILIDADE:
 * Endpoints de autenticacao (login, refresh, logout e sessao atual).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Delega regras de autenticacao para `AuthService`.
 * - Sera o ponto de integracao do frontend ao substituir o `auth-store` local.
 *
 * CONTRATO BACKEND:
 * - `POST /auth/login` recebe `{ email, password }` + header `x-tenant-id`.
 * - `POST /auth/refresh` recebe `{ refreshToken }`.
 * - `GET /auth/me` retorna payload de usuario autenticado.
 */
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
    // CONTRATO BACKEND: permite selecao de tenant por slug no header durante o login.
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
    // O frontend espera o mesmo shape do payload JWT para montar sessao/permissoes.
    return { user };
  }
}

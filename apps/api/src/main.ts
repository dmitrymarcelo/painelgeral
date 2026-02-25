/**
 * RESPONSABILIDADE:
 * Bootstrap da API NestJS (prefixo global, CORS e validacao padronizada).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Inicializa todos os modulos definidos em `AppModule`.
 * - Define contratos globais de entrada/erro para frontend e integracoes.
 *
 * CONTRATO BACKEND: respostas de validacao devem seguir payload padronizado:
 * `{ statusCode, message, erros: [{ campo, erros[] }] }`.
 */
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Prefixo unico para manter URLs de API consistentes entre ambientes.
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        // Regra de negocio: traduz erros de validacao para PT-BR e formato consumivel pela UI.
        const messages = errors.map((error) => ({
          campo: error.property,
          erros: Object.values(error.constraints ?? {}).map((msg) => {
            // Traduz mensagens comuns do class-validator para resposta amigavel em PT-BR.
            return msg
              .replace('must be a valid email', 'deve ser um e-mail valido')
              .replace('must be a string', 'deve ser um texto')
              .replace('must be a number', 'deve ser um numero')
              .replace('must be a valid enum', 'deve ser uma opcao valida')
              .replace('must be longer than or equal to', 'deve ter pelo menos')
              .replace('characters', 'caracteres')
              .replace('must be shorter than or equal to', 'deve ter no maximo')
              .replace('should not be empty', 'nao pode estar vazio')
              .replace(
                'must be a valid ISO 8601 date string',
                'deve ser uma data valida',
              )
              .replace('must be a boolean', 'deve ser verdadeiro ou falso')
              .replace('must be an integer', 'deve ser um numero inteiro')
              .replace('minimum', 'minimo')
              .replace('maximum', 'maximo');
          }),
        }));
        // Clean code/bugfix: retornar HttpException preserva status 400 no Nest.
        return new BadRequestException({
          statusCode: 400,
          message: 'Erro de validacao',
          erros: messages,
        });
      },
    }),
  );

  // CORS aberto para ambiente local (web + app/pwa em desenvolvimento).
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();

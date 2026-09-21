import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { JwtEstrategia } from './estrategias/jwt.estrategia';
import { ConfiguracionApp } from '../configuracion/configuracion';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<ConfiguracionApp, true>) => ({
        secret: config.get('jwt.secreto', { infer: true }),
        signOptions: { expiresIn: config.get('jwt.expiracion', { infer: true }) },
      }),
    }),
  ],
  providers: [AutenticacionService, JwtEstrategia],
  controllers: [AutenticacionController],
})
export class AutenticacionModule {}

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuario.entidad';
import { AccesosService } from '../accesos/accesos.service';
import { OrigenAcceso } from '../accesos/origen-acceso';
import { ConfiguracionApp } from '../configuracion/configuracion';
import { IngresarDto } from './dto/ingresar.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarClaveDto } from './dto/cambiar-clave.dto';
import { RegistrarDto } from './dto/registrar.dto';
import { InstitucionesService } from '../instituciones/instituciones.service';
import { LimiteIntentos } from './limite-intentos';

@Injectable()
export class AutenticacionService {
  private readonly clienteGoogle = new OAuth2Client();
  /** Codigos de registro equivocados: 10 por IP cada 15 minutos. */
  private readonly codigosFallidos = new LimiteIntentos(10, 15 * 60_000);

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly accesosService: AccesosService,
    private readonly institucionesService: InstitucionesService,
    private readonly config: ConfigService<ConfiguracionApp, true>,
  ) {}

  /** Lo que el frontend necesita saber antes de que haya sesion. */
  opciones() {
    const google = this.config.get('google', { infer: true });
    return {
      googleClientId: google.clientId || null,
      googleAnalyticsId: google.analyticsId || null,
    };
  }

  /**
   * El token lleva nombre y correo, asi que al editar el perfil hay que
   * reemitirlo para que la sesion no quede con datos viejos.
   */
  async actualizarPerfil(id: string, datos: ActualizarPerfilDto) {
    const usuario = await this.usuariosService.actualizarPerfil(id, datos);
    return this.construirSesion(usuario);
  }

  async cambiarClave(id: string, datos: CambiarClaveDto): Promise<void> {
    await this.usuariosService.cambiarClave(id, datos.claveActual, datos.claveNueva);
  }

  async ingresar(datos: IngresarDto, origen: OrigenAcceso) {
    const usuario = await this.usuariosService.buscarPorCorreoConClave(datos.correo);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    const claveValida = await bcrypt.compare(datos.clave, usuario.claveHash);
    if (!claveValida) {
      throw new UnauthorizedException('Correo o contrasena invalidos');
    }

    await this.accesosService.registrar(usuario.id, origen);
    return this.construirSesion(usuario);
  }

  /**
   * Registro de un estudiante nuevo desde la landing. El codigo dice a que
   * institucion entra; sin un codigo valido no hay registro libre. Deja la
   * sesion iniciada.
   */
  async registrar(datos: RegistrarDto, origen: OrigenAcceso) {
    if (this.codigosFallidos.bloqueado(origen.ip)) {
      throw new HttpException(
        'Demasiados codigos equivocados. Espera unos minutos y vuelve a intentarlo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const institucion = await this.institucionesService.porCodigo(datos.codigo);
    if (!institucion) {
      this.codigosFallidos.fallo(origen.ip);
      throw new BadRequestException('Ese codigo de institucion no existe o ya no es valido. Pideselo a tu docente.');
    }
    const usuario = await this.usuariosService.registrarEstudiante({
      nombre: datos.nombre,
      correo: datos.correo,
      clave: datos.clave,
      institucionId: institucion.id,
    });
    await this.accesosService.registrar(usuario.id, origen);
    return { ...this.construirSesion(usuario), institucion: institucion.nombre };
  }

  /**
   * Inicio de sesion con Google. Google solo confirma de quien es el correo;
   * la cuenta tiene que existir en Ludus (la crea un admin o la importacion
   * masiva, o el estudiante con el codigo de su institucion). No hay registro
   * libre con Google: cualquiera tiene una cuenta de Google.
   */
  async ingresarConGoogle(credencial: string, origen: OrigenAcceso) {
    const clientId = this.config.get('google', { infer: true }).clientId;
    if (!clientId) {
      throw new ServiceUnavailableException('El inicio de sesion con Google no esta configurado');
    }

    let correo: string | undefined;
    try {
      const ticket = await this.clienteGoogle.verifyIdToken({ idToken: credencial, audience: clientId });
      const datos = ticket.getPayload();
      if (datos?.email && datos.email_verified) correo = datos.email;
    } catch {
      throw new UnauthorizedException('Google no confirmo la sesion. Vuelve a intentarlo.');
    }
    if (!correo) throw new UnauthorizedException('Tu cuenta de Google no tiene un correo verificado');

    const usuario = await this.usuariosService.buscarPorCorreo(correo);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException(
        `No hay una cuenta activa de Ludus para ${correo}. Pide a tu institucion que te de de alta.`,
      );
    }

    await this.accesosService.registrar(usuario.id, origen);
    return this.construirSesion(usuario);
  }

  private construirSesion(usuario: Usuario) {
    const carga = {
      sub: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      institucionId: usuario.institucionId,
    };

    return {
      tokenAcceso: this.jwtService.sign(carga),
      usuario: carga,
    };
  }
}

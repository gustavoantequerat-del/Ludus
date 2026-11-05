import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './usuario.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { ActualizarPerfilDto } from '../autenticacion/dto/actualizar-perfil.dto';

const RONDAS_SAL = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  /** Usado solo por autenticacion: incluye el hash de la clave. */
  buscarPorCorreoConClave(correo: string): Promise<Usuario | null> {
    return this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.claveHash')
      .where('usuario.correo = :correo', { correo })
      .getOne();
  }

  /** Para el login con Google: el correo de Google puede venir con otras mayusculas. */
  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return this.usuariosRepo
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.correo) = LOWER(:correo)', { correo })
      .getOne();
  }

  /** Datos propios del usuario que inicio sesion (nombre y correo). */
  async actualizarPerfil(id: string, datos: ActualizarPerfilDto): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (datos.correo && datos.correo !== usuario.correo) {
      const existente = await this.usuariosRepo.findOne({
        where: { correo: datos.correo },
      });
      if (existente) throw new ConflictException('Ya existe un usuario con ese correo');
      usuario.correo = datos.correo;
    }
    if (datos.nombre) usuario.nombre = datos.nombre;

    return this.usuariosRepo.save(usuario);
  }

  /** Cambia la clave propia; exige conocer la clave actual. */
  async cambiarClave(id: string, claveActual: string, claveNueva: string): Promise<void> {
    const usuario = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.claveHash')
      .where('usuario.id = :id', { id })
      .getOne();
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const coincide = await bcrypt.compare(claveActual, usuario.claveHash);
    if (!coincide) throw new UnauthorizedException('La contrasena actual no es correcta');

    if (claveActual === claveNueva) {
      throw new BadRequestException('La contrasena nueva debe ser distinta a la actual');
    }

    usuario.claveHash = await bcrypt.hash(claveNueva, RONDAS_SAL);
    await this.usuariosRepo.save(usuario);
  }

  listar(quien: UsuarioAutenticado, filtro: FiltroUsuariosDto): Promise<Usuario[]> {
    const consulta = this.usuariosRepo
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.institucion', 'institucion')
      .orderBy('usuario.nombre', 'ASC');

    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.andWhere('usuario.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    }
    if (filtro.rol) {
      consulta.andWhere('usuario.rol = :rol', { rol: filtro.rol });
    }
    return consulta.getMany();
  }

  async obtener(quien: UsuarioAutenticado, id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({
      where: { id },
      relations: ['institucion'],
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    this.verificarAlcance(quien, usuario);
    return usuario;
  }

  async crear(quien: UsuarioAutenticado, datos: CrearUsuarioDto): Promise<Usuario> {
    const institucionId = this.resolverInstitucionParaCreacion(quien, datos);
    this.verificarRolPermitido(quien, datos.rol);

    const existente = await this.usuariosRepo.findOne({
      where: { correo: datos.correo },
    });
    if (existente) throw new ConflictException('Ya existe un usuario con ese correo');

    const claveHash = await bcrypt.hash(datos.clave, RONDAS_SAL);
    const usuario = this.usuariosRepo.create({
      nombre: datos.nombre,
      correo: datos.correo,
      claveHash,
      rol: datos.rol,
      institucionId,
    });
    const guardado = await this.usuariosRepo.save(usuario);
    // Se vuelve a leer para que la respuesta no incluya el hash de la clave.
    return this.usuariosRepo.findOneOrFail({ where: { id: guardado.id } });
  }

  /**
   * Registro publico: el estudiante crea su propia cuenta en la institucion
   * del codigo. Siempre como estudiante; los demas roles los da un admin.
   */
  async registrarEstudiante(datos: { nombre: string; correo: string; clave: string; institucionId: string }): Promise<Usuario> {
    if (await this.buscarPorCorreo(datos.correo)) {
      throw new ConflictException('Ya existe una cuenta con ese correo. Ingresa con tu contrasena.');
    }
    const guardado = await this.usuariosRepo.save(
      this.usuariosRepo.create({
        nombre: datos.nombre,
        correo: datos.correo,
        claveHash: await bcrypt.hash(datos.clave, RONDAS_SAL),
        rol: Rol.ESTUDIANTE,
        institucionId: datos.institucionId,
      }),
    );
    return this.usuariosRepo.findOneOrFail({ where: { id: guardado.id } });
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.obtener(quien, id);
    if (datos.rol) this.verificarRolPermitido(quien, datos.rol);
    this.protegerCuentasClave(quien, usuario, datos);
    Object.assign(usuario, datos);
    // Un superadmin es global: no queda atado a una institucion.
    if (usuario.rol === Rol.SUPERADMIN) usuario.institucionId = null;
    return this.usuariosRepo.save(usuario);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const usuario = await this.obtener(quien, id);
    if (usuario.rol === Rol.SUPERADMIN) {
      throw new ForbiddenException('Un superadministrador no se puede eliminar');
    }
    if (usuario.id === quien.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    await this.usuariosRepo.remove(usuario);
  }

  /**
   * Para no quedarse afuera: a un superadmin no se le quita el rol ni se lo
   * desactiva, y nadie se quita su propio rol ni se desactiva a si mismo.
   * (Si hace falta recuperar el acceso: npm run superadmin:crear.)
   */
  private protegerCuentasClave(quien: UsuarioAutenticado, usuario: Usuario, datos: ActualizarUsuarioDto): void {
    const cambiaRol = datos.rol !== undefined && datos.rol !== usuario.rol;
    const desactiva = datos.activo === false && usuario.activo;
    if (usuario.rol === Rol.SUPERADMIN && (cambiaRol || desactiva)) {
      throw new ForbiddenException('A un superadministrador no se le puede quitar el rol ni desactivar');
    }
    if (usuario.id === quien.id && (cambiaRol || desactiva)) {
      throw new ForbiddenException('No puedes cambiar tu propio rol ni desactivar tu cuenta');
    }
  }

  private resolverInstitucionParaCreacion(
    quien: UsuarioAutenticado,
    datos: CrearUsuarioDto,
  ): string | null {
    if (quien.rol === Rol.SUPERADMIN) {
      if (datos.rol === Rol.SUPERADMIN) return null;
      if (!datos.institucionId) {
        throw new BadRequestException('Debes indicar la institucion del usuario');
      }
      return datos.institucionId;
    }
    if (quien.rol === Rol.ADMIN_INSTITUCION) {
      return quien.institucionId;
    }
    throw new ForbiddenException('No tienes permiso para crear usuarios');
  }

  private verificarRolPermitido(quien: UsuarioAutenticado, rolObjetivo: Rol): void {
    if (quien.rol === Rol.SUPERADMIN) return;
    if (quien.rol === Rol.ADMIN_INSTITUCION) {
      if (rolObjetivo === Rol.DOCENTE || rolObjetivo === Rol.ESTUDIANTE) return;
      throw new ForbiddenException(
        'Un administrador de institucion solo puede crear docentes y estudiantes',
      );
    }
    throw new ForbiddenException('No tienes permiso para asignar roles');
  }

  private verificarAlcance(quien: UsuarioAutenticado, usuario: Usuario): void {
    if (quien.rol === Rol.SUPERADMIN) return;
    if (usuario.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este usuario');
    }
  }
}

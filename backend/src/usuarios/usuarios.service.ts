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
    return this.usuariosRepo.save(usuario);
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarUsuarioDto,
  ): Promise<Usuario> {
    const usuario = await this.obtener(quien, id);
    if (datos.rol) this.verificarRolPermitido(quien, datos.rol);
    Object.assign(usuario, datos);
    return this.usuariosRepo.save(usuario);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const usuario = await this.obtener(quien, id);
    await this.usuariosRepo.remove(usuario);
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

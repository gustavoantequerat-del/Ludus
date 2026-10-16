import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuario.entidad';
import { Institucion } from '../../instituciones/institucion.entidad';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { FilaCruda, generarPlantilla, leerFilas, normalizar } from './excel-usuarios';

const RONDAS_SAL = 10;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FilaRevisada {
  fila: number;
  nombre: string;
  correo: string;
  rol: Rol | string;
  institucion: string;
  errores: string[];
}

export interface ResultadoImportacion {
  filas: FilaRevisada[];
  validas: number;
  conErrores: number;
  /** Solo al confirmar: cuantos usuarios se crearon. */
  creados?: number;
}

interface FilaLista extends FilaRevisada {
  clave: string;
  institucionId: string | null;
}

/**
 * Alta masiva desde un .xlsx. Primero se revisa el archivo entero y se
 * devuelven los errores por fila (vista previa); al confirmar se crean, en
 * una sola transaccion, solo las filas sin errores.
 *
 * Mismas reglas que el alta individual: un admin de institucion importa
 * docentes y estudiantes de su institucion; el superadmin elige la
 * institucion de cada fila. Superadmins no se importan: se crean a mano.
 */
@Injectable()
export class ImportacionUsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Institucion) private readonly institucionesRepo: Repository<Institucion>,
    private readonly fuenteDatos: DataSource,
  ) {}

  async plantilla(quien: UsuarioAutenticado): Promise<Buffer> {
    const esSuperadmin = quien.rol === Rol.SUPERADMIN;
    const instituciones = esSuperadmin
      ? await this.institucionesRepo.find({ order: { nombre: 'ASC' } })
      : [];
    return generarPlantilla(
      esSuperadmin,
      instituciones.map((i) => ({ nombre: i.nombre, dominio: i.dominio })),
    );
  }

  async importar(
    quien: UsuarioAutenticado,
    contenido: Buffer | undefined,
    confirmar: boolean,
  ): Promise<ResultadoImportacion> {
    if (!Buffer.isBuffer(contenido) || !contenido.length) {
      throw new BadRequestException('Adjunta el archivo .xlsx con los usuarios');
    }
    const revisadas = await this.revisar(quien, await leerFilas(contenido));
    const listas = revisadas.filter((f) => !f.errores.length);
    const resultado: ResultadoImportacion = {
      filas: revisadas.map(({ clave: _clave, institucionId: _inst, ...visible }) => visible),
      validas: listas.length,
      conErrores: revisadas.length - listas.length,
    };
    if (!confirmar) return resultado;

    if (!listas.length) throw new BadRequestException('Ninguna fila es valida; no se creo ningun usuario');
    const nuevos: Pick<Usuario, 'nombre' | 'correo' | 'claveHash' | 'rol' | 'institucionId'>[] = [];
    for (const f of listas) {
      nuevos.push({
        nombre: f.nombre,
        correo: f.correo,
        claveHash: await bcrypt.hash(f.clave, RONDAS_SAL),
        rol: f.rol as Rol,
        institucionId: f.institucionId,
      });
    }
    await this.fuenteDatos.transaction((gestor) => gestor.getRepository(Usuario).insert(nuevos));
    return { ...resultado, creados: nuevos.length };
  }

  private rolesImportables(quien: UsuarioAutenticado): Rol[] {
    if (quien.rol === Rol.SUPERADMIN) return [Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN_INSTITUCION];
    if (quien.rol === Rol.ADMIN_INSTITUCION) return [Rol.ESTUDIANTE, Rol.DOCENTE];
    throw new ForbiddenException('No tienes permiso para crear usuarios');
  }

  private async revisar(quien: UsuarioAutenticado, filas: FilaCruda[]): Promise<FilaLista[]> {
    const roles = this.rolesImportables(quien);
    const esSuperadmin = quien.rol === Rol.SUPERADMIN;

    const correos = filas.map((f) => normalizar(f.correo)).filter(Boolean);
    const existentes = new Set(
      correos.length
        ? (
            await this.usuariosRepo
              .createQueryBuilder('usuario')
              .select('LOWER(usuario.correo)', 'correo')
              .where('LOWER(usuario.correo) IN (:...correos)', { correos })
              .getRawMany<{ correo: string }>()
          ).map((u) => u.correo)
        : [],
    );

    const instituciones = esSuperadmin ? await this.institucionesRepo.find() : [];
    const buscarInstitucion = (texto: string) => {
      const buscado = normalizar(texto);
      return instituciones.find((i) => normalizar(i.dominio) === buscado || normalizar(i.nombre) === buscado);
    };

    const vistos = new Map<string, number>();
    return filas.map((f) => {
      const errores: string[] = [];
      const correo = normalizar(f.correo);
      const rol = f.rol ? normalizar(f.rol).replace(/\s+/g, '_') : Rol.ESTUDIANTE;

      if (f.nombre.length < 2 || f.nombre.length > 120) errores.push('El nombre debe tener entre 2 y 120 caracteres');
      if (!correo) errores.push('Falta el correo');
      else if (!PATRON_CORREO.test(correo) || correo.length > 160) errores.push('El correo no es valido');
      else if (existentes.has(correo)) errores.push('Ya existe un usuario con ese correo');
      else if (vistos.has(correo)) errores.push(`El correo se repite en la fila ${vistos.get(correo)}`);
      if (correo && !vistos.has(correo)) vistos.set(correo, f.fila);
      if (f.clave.length < 6 || f.clave.length > 72) errores.push('La clave debe tener entre 6 y 72 caracteres');
      if (!roles.includes(rol as Rol)) errores.push(`Rol no permitido; usa: ${roles.join(', ')}`);

      let institucionId: string | null = quien.institucionId;
      let institucion = '';
      if (esSuperadmin) {
        const encontrada = f.institucion ? buscarInstitucion(f.institucion) : undefined;
        if (!f.institucion) errores.push('Falta la institucion');
        else if (!encontrada) errores.push(`No existe la institucion "${f.institucion}"`);
        institucionId = encontrada?.id ?? null;
        institucion = encontrada?.nombre ?? f.institucion;
      }

      return { fila: f.fila, nombre: f.nombre, correo, clave: f.clave, rol, institucion, institucionId, errores };
    });
  }
}

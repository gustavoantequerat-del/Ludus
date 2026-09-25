import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import JSZip from 'jszip';
import { PaqueteScorm } from './paquete-scorm.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { ConfiguracionApp } from '../configuracion/configuracion';
import { AutenticacionService } from '../autenticacion/autenticacion.service';
import { ResultadosService } from '../resultados/resultados.service';
import { JuegosService } from '../juegos/juegos.service';
import { RespuestaJugador } from '../juegos/mesa-cumplimiento/mesa-cumplimiento.service';
import { Decision } from '../juegos/mesa-cumplimiento/casos';
import { IngresarDto } from '../autenticacion/dto/ingresar.dto';
import { RegistrarResultadoScormDto } from './dto/registrar-resultado-scorm.dto';

const ARCHIVOS_PLANTILLA = ['index.html', 'estilos.css', 'ludus-scorm.js'];

@Injectable()
export class ScormService {
  constructor(
    @InjectRepository(PaqueteScorm)
    private readonly paquetesRepo: Repository<PaqueteScorm>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    private readonly config: ConfigService<ConfiguracionApp, true>,
    private readonly autenticacionService: AutenticacionService,
    private readonly resultadosService: ResultadosService,
    private readonly juegosService: JuegosService,
  ) {}

  /* ---------------------------------------------------------------- *
   * Partida del juego real dentro del LMS
   * ---------------------------------------------------------------- */

  async armarPartida(token: string, quien: UsuarioAutenticado) {
    const paquete = await this.paqueteActivo(token);
    return this.juegosService.armarPartida(quien, paquete.moduloId);
  }

  verificarCaso(casoId: string, decision: Decision) {
    return this.juegosService.verificarCaso(casoId, decision);
  }

  async terminarPartida(
    token: string,
    quien: UsuarioAutenticado,
    respuestas: RespuestaJugador[],
  ) {
    const paquete = await this.paqueteActivo(token);
    const modulo = await this.moduloCompleto(paquete.moduloId);
    const datos = await this.juegosService.terminarPartida(
      quien,
      paquete.moduloId,
      respuestas,
    );
    return { ...datos, califica: modulo.califica };
  }

  /* ---------------------------------------------------------------- *
   * Paquetes (docente / admin / superadmin)
   * ---------------------------------------------------------------- */

  async listar(quien: UsuarioAutenticado): Promise<PaqueteScorm[]> {
    const consulta = this.paquetesRepo
      .createQueryBuilder('paquete')
      .leftJoinAndSelect('paquete.modulo', 'modulo')
      .leftJoinAndSelect('modulo.curso', 'curso')
      .leftJoinAndSelect('paquete.creadoPor', 'creadoPor')
      .orderBy('paquete.creadoEn', 'DESC');

    if (quien.rol === Rol.DOCENTE) {
      consulta.andWhere('curso.docenteId = :docenteId', { docenteId: quien.id });
    } else if (quien.rol === Rol.ADMIN_INSTITUCION) {
      consulta.andWhere('curso.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, moduloId: string): Promise<PaqueteScorm> {
    const modulo = await this.moduloConAcceso(quien, moduloId);

    const configuracion = await this.configuracionesRepo.findOne({ where: { moduloId } });
    if (!configuracion) {
      throw new BadRequestException(
        'El modulo necesita un juego configurado antes de exportarlo a SCORM',
      );
    }

    const paquete = this.paquetesRepo.create({
      token: randomBytes(16).toString('hex'),
      moduloId: modulo.id,
      creadoPorId: quien.id,
    });
    return this.paquetesRepo.save(paquete);
  }

  async cambiarEstado(
    quien: UsuarioAutenticado,
    id: string,
    activo: boolean,
  ): Promise<PaqueteScorm> {
    const paquete = await this.paqueteConAcceso(quien, id);
    paquete.activo = activo;
    return this.paquetesRepo.save(paquete);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const paquete = await this.paqueteConAcceso(quien, id);
    await this.paquetesRepo.remove(paquete);
  }

  /** Arma el ZIP del paquete listo para subir al LMS. */
  async generarZip(
    quien: UsuarioAutenticado,
    id: string,
  ): Promise<{ nombreArchivo: string; contenido: Buffer }> {
    const paquete = await this.paqueteConAcceso(quien, id);
    const modulo = await this.moduloCompleto(paquete.moduloId);
    const configuracion = await this.configuracionesRepo.findOne({
      where: { moduloId: paquete.moduloId },
    });
    if (!configuracion) {
      throw new BadRequestException('El modulo ya no tiene un juego configurado');
    }

    const zip = new JSZip();
    const carpetaPlantilla = join(__dirname, 'plantilla');
    for (const archivo of ARCHIVOS_PLANTILLA) {
      zip.file(archivo, await readFile(join(carpetaPlantilla, archivo), 'utf8'));
    }

    zip.file('configuracion.js', this.archivoConfiguracion(paquete.token));
    zip.file(
      'imsmanifest.xml',
      this.manifiesto(paquete, `${modulo.curso.nombre} - ${modulo.titulo}`, modulo.titulo),
    );
    zip.file('LEEME.txt', this.instruccionesDeUso(modulo.curso.nombre, modulo.titulo));

    const contenido = await zip.generateAsync({ type: 'nodebuffer' });
    return { nombreArchivo: `ludus-${this.nombreSeguro(modulo.titulo)}.zip`, contenido };
  }

  /* ---------------------------------------------------------------- *
   * Ejecucion del paquete dentro del LMS (publico)
   * ---------------------------------------------------------------- */

  /** Datos minimos para pintar la pantalla de login; no expone configuracion. */
  async informacionPublica(token: string) {
    const paquete = await this.paqueteActivo(token);
    const modulo = await this.moduloCompleto(paquete.moduloId);
    const configuracion = await this.configuracionesRepo.findOne({
      where: { moduloId: paquete.moduloId },
    });

    return {
      modulo: { titulo: modulo.titulo, descripcion: modulo.descripcion },
      curso: { nombre: modulo.curso.nombre },
      juego: configuracion ? { nombre: configuracion.juego.nombre } : null,
    };
  }

  /**
   * Login del estudiante desde el LMS. Ademas de validar la contrasena, exige
   * que sea estudiante y que este inscrito en el curso del modulo.
   */
  async ingresar(token: string, datos: IngresarDto) {
    const paquete = await this.paqueteActivo(token);
    const modulo = await this.moduloCompleto(paquete.moduloId);
    const configuracion = await this.configuracionesRepo.findOne({
      where: { moduloId: paquete.moduloId },
    });
    if (!configuracion) {
      throw new BadRequestException('El modulo ya no tiene un juego configurado');
    }

    const sesion = await this.autenticacionService.ingresar(datos);
    if (sesion.usuario.rol !== Rol.ESTUDIANTE) {
      throw new ForbiddenException('Este modulo solo puede abrirlo un estudiante');
    }

    const inscrito = await this.inscripcionesRepo.findOne({
      where: { estudianteId: sesion.usuario.sub, cursoId: modulo.cursoId },
    });
    if (!inscrito) {
      throw new ForbiddenException('No estas inscrito en el curso de este modulo');
    }

    return {
      tokenAcceso: sesion.tokenAcceso,
      estudiante: { nombre: sesion.usuario.nombre, correo: sesion.usuario.correo },
      modulo: { titulo: modulo.titulo, califica: modulo.califica },
      juego: {
        clave: configuracion.juego.clave,
        jugable: configuracion.juego.jugable,
        nombre: configuracion.juego.nombre,
        descripcion: configuracion.juego.descripcion,
      },
      configuracion: {
        titulo: configuracion.titulo,
        instrucciones: configuracion.instrucciones,
        velocidad: configuracion.velocidad,
        tiempoLimiteSegundos: configuracion.tiempoLimiteSegundos,
        intentosPermitidos: configuracion.intentosPermitidos,
        puntajeMaximo: configuracion.puntajeMaximo,
      },
    };
  }

  /** Guarda el intento en Ludus y devuelve lo que el lanzador reporta al LMS. */
  async registrarResultado(
    token: string,
    quien: UsuarioAutenticado,
    datos: RegistrarResultadoScormDto,
  ) {
    const paquete = await this.paqueteActivo(token);
    const modulo = await this.moduloCompleto(paquete.moduloId);
    const configuracion = await this.configuracionesRepo.findOne({
      where: { moduloId: paquete.moduloId },
    });

    const resultado = await this.resultadosService.crear(quien, {
      moduloId: paquete.moduloId,
      puntaje: datos.puntaje,
    });

    return {
      intento: resultado.intento,
      puntaje: resultado.puntaje,
      nota: resultado.nota,
      califica: modulo.califica,
      puntajeMaximo: configuracion?.puntajeMaximo ?? 100,
    };
  }

  /* ---------------------------------------------------------------- *
   * Apoyo
   * ---------------------------------------------------------------- */

  private async paqueteActivo(token: string): Promise<PaqueteScorm> {
    const paquete = await this.paquetesRepo.findOne({ where: { token } });
    if (!paquete) throw new NotFoundException('El paquete no existe');
    if (!paquete.activo) {
      throw new UnauthorizedException('El docente desactivo este paquete');
    }
    return paquete;
  }

  private async moduloCompleto(moduloId: string): Promise<ModuloCurso & { curso: any }> {
    const modulo = await this.modulosRepo.findOne({
      where: { id: moduloId },
      relations: ['curso'],
    });
    if (!modulo) throw new NotFoundException('Modulo no encontrado');
    return modulo as ModuloCurso & { curso: any };
  }

  private async moduloConAcceso(
    quien: UsuarioAutenticado,
    moduloId: string,
  ): Promise<ModuloCurso> {
    const modulo = await this.moduloCompleto(moduloId);
    if (quien.rol === Rol.SUPERADMIN) return modulo;
    if (modulo.curso.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este modulo');
    }
    if (quien.rol === Rol.DOCENTE && modulo.curso.docenteId !== quien.id) {
      throw new ForbiddenException('Solo el docente del curso puede exportar este modulo');
    }
    return modulo;
  }

  private async paqueteConAcceso(
    quien: UsuarioAutenticado,
    id: string,
  ): Promise<PaqueteScorm> {
    const paquete = await this.paquetesRepo.findOne({ where: { id } });
    if (!paquete) throw new NotFoundException('El paquete no existe');
    await this.moduloConAcceso(quien, paquete.moduloId);
    return paquete;
  }

  private archivoConfiguracion(token: string): string {
    const urlApi = this.config.get('urlPublicaApi', { infer: true });
    return [
      '/* Generado por Ludus al exportar el paquete. */',
      'window.LUDUS_CONFIG = {',
      `  urlApi: ${JSON.stringify(urlApi)},`,
      `  token: ${JSON.stringify(token)}`,
      '};',
      '',
    ].join('\n');
  }

  private manifiesto(paquete: PaqueteScorm, tituloOrganizacion: string, tituloItem: string): string {
    const identificador = `LUDUS-${paquete.token.slice(0, 12).toUpperCase()}`;
    const archivos = [...ARCHIVOS_PLANTILLA, 'configuracion.js']
      .map((archivo) => `      <file href="${archivo}" />`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identificador}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-LUDUS">
    <organization identifier="ORG-LUDUS">
      <title>${this.escaparXml(tituloOrganizacion)}</title>
      <item identifier="ITEM-LUDUS" identifierref="RES-LUDUS" isvisible="true">
        <title>${this.escaparXml(tituloItem)}</title>
        <adlcp:masteryscore>60</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-LUDUS" type="webcontent" adlcp:scormtype="sco" href="index.html">
${archivos}
    </resource>
  </resources>
</manifest>
`;
  }

  private instruccionesDeUso(nombreCurso: string, tituloModulo: string): string {
    const urlApi = this.config.get('urlPublicaApi', { infer: true });
    return [
      'Paquete SCORM 1.2 generado por Ludus',
      '=====================================',
      '',
      `Curso:  ${nombreCurso}`,
      `Modulo: ${tituloModulo}`,
      '',
      'Como usarlo:',
      '1. Sube este ZIP tal cual como actividad SCORM en tu LMS (Moodle,',
      '   Blackboard, Canvas u otro compatible con SCORM 1.2).',
      '2. Al abrirlo, el estudiante inicia sesion con su cuenta de Ludus.',
      '3. Solo pueden entrar estudiantes inscritos en el curso del modulo.',
      '4. Al terminar, el intento queda registrado en Ludus y el puntaje se',
      '   reporta al LMS (score.raw y lesson_status).',
      '',
      `Este paquete consulta la API de Ludus en: ${urlApi}`,
      'Esa direccion debe ser alcanzable desde el navegador del estudiante.',
      '',
    ].join('\n');
  }

  private escaparXml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private nombreSeguro(texto: string): string {
    return (
      texto
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'modulo'
    );
  }
}

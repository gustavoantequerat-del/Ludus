import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtGuardia } from '../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../comun/guardias/roles.guardia';
import { Roles } from '../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { ImportacionUsuariosService } from './importacion/importacion-usuarios.service';
import { TIPO_XLSX } from './importacion/excel-usuarios';

@Controller('usuarios')
@UseGuards(JwtGuardia, RolesGuardia)
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly importacionService: ImportacionUsuariosService,
  ) {}

  @Get()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
  listar(@UsuarioActual() quien: UsuarioAutenticado, @Query() filtro: FiltroUsuariosDto) {
    return this.usuariosService.listar(quien, filtro);
  }

  /** Excel de ejemplo con el formato que espera la importacion masiva. */
  @Get('plantilla')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  async plantilla(@UsuarioActual() quien: UsuarioAutenticado, @Res() respuesta: Response) {
    const archivo = await this.importacionService.plantilla(quien);
    respuesta.set({
      'Content-Type': TIPO_XLSX,
      'Content-Disposition': 'attachment; filename="plantilla-usuarios.xlsx"',
    });
    respuesta.send(archivo);
  }

  /**
   * Alta masiva: el cuerpo es el .xlsx crudo. Sin `confirmar=true` solo
   * devuelve la vista previa con los errores de cada fila.
   */
  @Post('importar')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  importar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Req() peticion: Request,
    @Query('confirmar') confirmar?: string,
  ) {
    return this.importacionService.importar(quien, peticion.body as Buffer, confirmar === 'true');
  }

  @Get(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION, Rol.DOCENTE)
  obtener(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.usuariosService.obtener(quien, id);
  }

  @Post()
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  crear(@UsuarioActual() quien: UsuarioAutenticado, @Body() datos: CrearUsuarioDto) {
    return this.usuariosService.crear(quien, datos);
  }

  @Patch(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  actualizar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() datos: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(quien, id, datos);
  }

  @Delete(':id')
  @Roles(Rol.SUPERADMIN, Rol.ADMIN_INSTITUCION)
  eliminar(@UsuarioActual() quien: UsuarioAutenticado, @Param('id') id: string) {
    return this.usuariosService.eliminar(quien, id);
  }
}

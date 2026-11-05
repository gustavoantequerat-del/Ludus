import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuardia } from '../../comun/guardias/jwt.guardia';
import { RolesGuardia } from '../../comun/guardias/roles.guardia';
import { Roles } from '../../comun/decoradores/roles.decorador';
import { UsuarioActual } from '../../comun/decoradores/usuario-actual.decorador';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { AjedrezService } from './ajedrez.service';
import { PedirPreguntaDto, ResponderPreguntaDto, TerminarAjedrezDto } from './dto/partida-ajedrez.dto';
import { CLAVE_AJEDREZ } from '../catalogo-nuevos';

/* Partida del Ajedrez de Preguntas: solo la juega un estudiante. */
@Controller(`juegos/${CLAVE_AJEDREZ}/partida/:moduloId`)
@UseGuards(JwtGuardia, RolesGuardia)
@Roles(Rol.ESTUDIANTE)
export class AjedrezController {
  constructor(private readonly ajedrezService: AjedrezService) {}

  @Post()
  iniciar(@UsuarioActual() quien: UsuarioAutenticado, @Param('moduloId') moduloId: string) {
    return this.ajedrezService.iniciar(quien, moduloId);
  }

  @Post(':partidaId/pregunta')
  pedirPregunta(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Param('partidaId') partidaId: string,
    @Body() datos: PedirPreguntaDto,
  ) {
    return this.ajedrezService.pedirPregunta(quien, moduloId, partidaId, datos.modo);
  }

  @Post(':partidaId/responder')
  responder(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Param('partidaId') partidaId: string,
    @Body() datos: ResponderPreguntaDto,
  ) {
    return this.ajedrezService.responder(quien, moduloId, partidaId, datos);
  }

  @Post(':partidaId/terminar')
  terminar(
    @UsuarioActual() quien: UsuarioAutenticado,
    @Param('moduloId') moduloId: string,
    @Param('partidaId') partidaId: string,
    @Body() datos: TerminarAjedrezDto,
  ) {
    return this.ajedrezService.terminar(quien, moduloId, partidaId, datos.desenlace);
  }
}

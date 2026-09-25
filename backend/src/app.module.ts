import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuracion from './configuracion/configuracion';
import { construirOpcionesTypeOrm } from './configuracion/opciones-typeorm';
import { ArchivosModule } from './archivos/archivos.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { PersonajesModule } from './juegos/mesa-cumplimiento/personajes/personajes.module';
import { InstitucionesModule } from './instituciones/instituciones.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CursosModule } from './cursos/cursos.module';
import { RutasModule } from './rutas/rutas.module';
import { JuegosModule } from './juegos/juegos.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { ResultadosModule } from './resultados/resultados.module';
import { PanelModule } from './panel/panel.module';
import { ScormModule } from './scorm/scorm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuracion] }),
    TypeOrmModule.forRoot(construirOpcionesTypeOrm()),
    ArchivosModule,
    AutenticacionModule,
    PersonajesModule,
    InstitucionesModule,
    UsuariosModule,
    CursosModule,
    RutasModule,
    JuegosModule,
    InscripcionesModule,
    SolicitudesModule,
    ResultadosModule,
    PanelModule,
    ScormModule,
  ],
})
export class AppModule {}

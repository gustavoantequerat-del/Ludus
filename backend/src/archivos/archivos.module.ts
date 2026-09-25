import { Global, Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';

/**
 * Global porque escribir imagenes es un servicio de infraestructura: lo usan
 * personajes hoy y cualquier otro modulo con imagenes manana.
 */
@Global()
@Module({
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class ArchivosModule {}

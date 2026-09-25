import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearPersonajeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  /**
   * Imagen nueva como data URL (data:image/png;base64,...). Se usa cuando el
   * docente sube un archivo desde su computadora.
   */
  @IsOptional()
  @IsString()
  imagenSubida?: string;

  /**
   * Imagen que ya esta en el servidor (/archivos/personajes/...). Se usa
   * cuando el docente elige una de las que vienen con el proyecto.
   */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imagenExistente?: string;
}

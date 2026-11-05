import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Registro publico de un estudiante nuevo con el codigo de su institucion. */
export class RegistrarDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2, { message: 'Escribe tu nombre completo' })
  @MaxLength(120)
  nombre: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Escribe un correo valido' })
  @MaxLength(160)
  correo: string;

  @IsString()
  @MinLength(6, { message: 'La contrasena debe tener al menos 6 caracteres' })
  @MaxLength(72)
  clave: string;

  @IsString()
  @MinLength(4, { message: 'Escribe el codigo que te dio tu institucion' })
  @MaxLength(20)
  codigo: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class IngresarDto {
  @IsString()
  @MaxLength(160)
  correo: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  clave: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarClaveDto {
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  claveActual: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  claveNueva: string;
}

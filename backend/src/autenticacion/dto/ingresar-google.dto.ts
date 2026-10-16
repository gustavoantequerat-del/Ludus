import { IsString, MaxLength, MinLength } from 'class-validator';

export class IngresarGoogleDto {
  /** El ID token (JWT) que entrega el boton de Google Identity Services. */
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  credencial: string;
}

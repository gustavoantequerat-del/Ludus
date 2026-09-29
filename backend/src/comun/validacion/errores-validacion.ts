import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Mensajes de validacion en espanol. class-validator los trae en ingles y el
 * frontend muestra el primero de la lista tal cual.
 *
 * class-validator no expone los parametros de cada regla (el 120 de
 * MaxLength(120)), pero su mensaje en ingles trae un unico numero: de ahi se
 * toma.
 */
const MENSAJES: Record<string, (campo: string, n: string) => string> = {
  isArray: (c) => `El campo ${c} debe ser una lista.`,
  isBoolean: (c) => `El campo ${c} debe ser verdadero o falso.`,
  isEnum: (c) => `El valor de ${c} no es valido.`,
  isIn: (c) => `El valor de ${c} no es valido.`,
  isInt: (c) => `El campo ${c} debe ser un numero entero.`,
  isString: (c) => `El campo ${c} debe ser texto.`,
  isUuid: (c) => `El campo ${c} debe ser un identificador valido.`,
  max: (c, n) => `El campo ${c} no puede ser mayor que ${n}.`,
  min: (c, n) => `El campo ${c} debe ser al menos ${n}.`,
  maxLength: (c, n) => `El campo ${c} no puede tener mas de ${n} caracteres.`,
  minLength: (c, n) => `El campo ${c} debe tener al menos ${n} caracteres.`,
  arrayMaxSize: (c, n) => `El campo ${c} no puede tener mas de ${n} elementos.`,
  arrayMinSize: (c, n) => `El campo ${c} debe tener al menos ${n} elementos.`,
  arrayNotEmpty: (c) => `El campo ${c} debe tener al menos 1 elementos.`,
  whitelistValidation: (c) => `La propiedad ${c} no esta permitida.`,
};

function traducir(regla: string, campo: string, original: string): string {
  const mensaje = MENSAJES[regla];
  if (!mensaje) return original;
  return mensaje(campo, original.match(/-?\d+(\.\d+)?/)?.[0] ?? '');
}

function aplanar(errores: ValidationError[], padre = ''): string[] {
  return errores.flatMap((error) => {
    const campo = padre ? `${padre}.${error.property}` : error.property;
    const reglas = Object.entries(error.constraints ?? {});
    const propias =
      error.value === undefined && reglas.length > 0 && !('whitelistValidation' in (error.constraints ?? {}))
        ? [`El campo ${campo} es obligatorio.`]
        : reglas.map(([regla, original]) => traducir(regla, campo, original));
    return [...propias, ...aplanar(error.children ?? [], campo)];
  });
}

export function crearErrorValidacion(errores: ValidationError[]): BadRequestException {
  return new BadRequestException(aplanar(errores));
}

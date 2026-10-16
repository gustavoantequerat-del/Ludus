import ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { Rol } from '../../comun/enums/rol.enum';

/** Tipo MIME de un .xlsx; tambien es el que acepta el endpoint de importacion. */
export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Tope de filas por archivo: cada clave se cifra con bcrypt y eso lleva su tiempo. */
export const MAXIMO_FILAS = 500;

export const HOJA_USUARIOS = 'Usuarios';

export interface FilaCruda {
  fila: number;
  nombre: string;
  correo: string;
  clave: string;
  rol: string;
  institucion: string;
}

export interface InstitucionPlantilla {
  nombre: string;
  dominio: string;
}

const COLOR_CABECERA = 'FF4F46E5';

/** Quita acentos, espacios y mayusculas para comparar encabezados y valores. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Texto de una celda sin importar como la guardo Excel: los correos suelen
 * quedar como hipervinculo, los numeros como number y el texto con formato
 * como richText.
 */
function textoDeCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
    if ('text' in valor) return textoDeCelda(valor.text as ExcelJS.CellValue);
    if ('result' in valor) return textoDeCelda(valor.result as ExcelJS.CellValue);
  }
  return String(valor).trim();
}

/**
 * Plantilla de ejemplo. El superadmin la recibe con la columna "institucion"
 * y una hoja con los dominios validos; un admin de institucion no la necesita
 * porque todo lo que importa queda en su propia institucion.
 */
export async function generarPlantilla(
  conInstitucion: boolean,
  instituciones: InstitucionPlantilla[],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Ludus';

  const hoja = libro.addWorksheet(HOJA_USUARIOS);
  const columnas: Partial<ExcelJS.Column>[] = [
    { header: 'nombre', key: 'nombre', width: 30 },
    { header: 'correo', key: 'correo', width: 34 },
    { header: 'clave', key: 'clave', width: 16 },
    { header: 'rol', key: 'rol', width: 20 },
  ];
  if (conInstitucion) columnas.push({ header: 'institucion', key: 'institucion', width: 30 });
  hoja.columns = columnas;

  const ejemploInstitucion = instituciones[0]?.dominio ?? 'mi-escuela.edu';
  const ejemplos = [
    { nombre: 'Ana Torres', correo: 'ana.torres@ejemplo.com', clave: 'cambiar123', rol: Rol.ESTUDIANTE },
    { nombre: 'Luis Perez', correo: 'luis.perez@ejemplo.com', clave: 'cambiar123', rol: Rol.ESTUDIANTE },
    { nombre: 'Marta Ruiz', correo: 'marta.ruiz@ejemplo.com', clave: 'cambiar123', rol: Rol.DOCENTE },
  ];
  ejemplos.forEach((e) => hoja.addRow(conInstitucion ? { ...e, institucion: ejemploInstitucion } : e));

  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  // Lista desplegable en "rol" para que no se escriba un valor invalido.
  const roles = conInstitucion
    ? [Rol.ESTUDIANTE, Rol.DOCENTE, Rol.ADMIN_INSTITUCION]
    : [Rol.ESTUDIANTE, Rol.DOCENTE];
  for (let fila = 2; fila <= MAXIMO_FILAS + 1; fila++) {
    hoja.getCell(fila, 4).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${roles.join(',')}"`],
    };
  }

  const ayuda = libro.addWorksheet('Instrucciones');
  ayuda.getColumn(1).width = 18;
  ayuda.getColumn(2).width = 90;
  const lineas: [string, string][] = [
    ['Columna', 'Como llenarla'],
    ['nombre', 'Obligatorio. Nombre y apellido (2 a 120 caracteres).'],
    ['correo', 'Obligatorio. Con este correo inicia sesion; no puede repetirse.'],
    ['clave', 'Obligatorio. Contrasena inicial, de 6 a 72 caracteres. El usuario puede cambiarla en "Mi perfil".'],
    ['rol', `Opcional. ${roles.join(', ')}. Si se deja vacio, el usuario se crea como estudiante.`],
  ];
  if (conInstitucion) {
    lineas.push(['institucion', 'Obligatorio. Dominio (o nombre) de la institucion; ver la hoja "Instituciones".']);
  }
  lineas.push(
    ['', ''],
    ['Notas', `Solo se lee la hoja "${HOJA_USUARIOS}". Maximo ${MAXIMO_FILAS} filas por archivo.`],
    ['', 'Las filas de ejemplo se pueden borrar o reemplazar. Las filas vacias se ignoran.'],
    ['', 'Antes de crear nada, Ludus muestra una vista previa con los errores de cada fila.'],
  );
  lineas.forEach((l) => ayuda.addRow(l));
  ayuda.getRow(1).font = { bold: true };

  if (conInstitucion) {
    const hojaInst = libro.addWorksheet('Instituciones');
    hojaInst.columns = [
      { header: 'nombre', key: 'nombre', width: 34 },
      { header: 'dominio', key: 'dominio', width: 30 },
    ];
    instituciones.forEach((i) => hojaInst.addRow(i));
    hojaInst.getRow(1).font = { bold: true };
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Lee la hoja de usuarios y devuelve las filas no vacias, sin validar todavia. */
export async function leerFilas(contenido: Buffer): Promise<FilaCruda[]> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException('El archivo no es un Excel valido (.xlsx)');
  }

  const hoja = libro.getWorksheet(HOJA_USUARIOS) ?? libro.worksheets[0];
  if (!hoja) throw new BadRequestException('El archivo no tiene hojas');

  const indices: Record<string, number> = {};
  hoja.getRow(1).eachCell((celda, columna) => {
    indices[normalizar(textoDeCelda(celda.value))] = columna;
  });
  const faltantes = ['nombre', 'correo', 'clave'].filter((c) => !indices[c]);
  if (faltantes.length) {
    throw new BadRequestException(
      `Faltan columnas en la primera fila: ${faltantes.join(', ')}. Descarga la plantilla para ver el formato.`,
    );
  }

  const filas: FilaCruda[] = [];
  hoja.eachRow((fila, numero) => {
    if (numero === 1) return;
    const leer = (columna: string) => (indices[columna] ? textoDeCelda(fila.getCell(indices[columna]).value) : '');
    const cruda: FilaCruda = {
      fila: numero,
      nombre: leer('nombre'),
      correo: leer('correo'),
      clave: leer('clave'),
      rol: leer('rol'),
      institucion: leer('institucion'),
    };
    if (cruda.nombre || cruda.correo || cruda.clave) filas.push(cruda);
  });

  if (!filas.length) throw new BadRequestException('La hoja no tiene usuarios para importar');
  if (filas.length > MAXIMO_FILAS) {
    throw new BadRequestException(
      `El archivo tiene ${filas.length} filas; el maximo es ${MAXIMO_FILAS}. Dividelo en varios archivos.`,
    );
  }
  return filas;
}

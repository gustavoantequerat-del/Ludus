/**
 * Catalogo base de casos de la "Mesa de Cumplimiento".
 *
 * Estos 13 expedientes salen del curso de Cripto Compliance (modulos 1 a 4):
 * criterio funcional de PSAV de la R.A. UIF 19/2025, ROG-04, Recomendacion 15
 * y Travel Rule de GAFI, due diligence de PSAV/VASP y analisis de exposicion
 * on-chain.
 *
 * La migracion los carga en la tabla casos_cumplimiento como catalogo base
 * (institucion_id en null). Desde ahi el docente los edita, los duplica o
 * escribe los suyos: este archivo es la semilla, no la fuente en vivo.
 *
 * Regla de diseno: los casos NO marcan visualmente lo sospechoso. El jugador
 * decide leyendo el expediente contra lo que aprendio, igual que en la mesa
 * real. Y hay tantas trampas para el que aprueba de mas como para el que
 * rechaza por reflejo: el curso es explicito en que el de-risking
 * indiscriminado tambien es una mala decision.
 */
import { CampoExpediente, Decision } from './caso-cumplimiento.entidad';

export type { Decision, CampoExpediente };

export const ETIQUETAS_DECISION: Record<Decision, string> = {
  aprobar: 'Aprobar',
  reforzar: 'Aprobar con EDD',
  rechazar: 'Rechazar',
};

/**
 * Los seis campos fijos del expediente, con el texto que ve el jugador. El
 * docente cambia los valores; las etiquetas son del dominio y no se editan.
 */
export const ETIQUETAS_EXPEDIENTE = {
  registroLicencia: 'Registro / licencia',
  travelRule: 'Travel Rule',
  beneficiarioFinal: 'Beneficiario final',
  controlesAml: 'Controles AML',
  sanciones: 'Sanciones',
  exposicionOnchain: 'Exposicion on-chain',
} as const;

export type ClaveCampoExpediente = keyof typeof ETIQUETAS_EXPEDIENTE;

export const CAMPOS_EXPEDIENTE = Object.keys(ETIQUETAS_EXPEDIENTE) as ClaveCampoExpediente[];

export interface CasoBase {
  entidad: string;
  tipo: string;
  jurisdiccion: string;
  solicitud: string;
  registroLicencia: string;
  travelRule: string;
  beneficiarioFinal: string;
  controlesAml: string;
  sanciones: string;
  exposicionOnchain: string;
  camposExtra: CampoExpediente[];
  decisionCorrecta: Decision;
  regla: string;
  explicacion: string;
  origen: string;
}

export const CASOS_BASE: CasoBase[] = [
  {
    entidad: 'Andes Digital PSAV S.R.L.',
    tipo: 'PSAV - intercambio fiat/AV y custodia',
    jurisdiccion: 'Bolivia',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'Vigente como Sujeto Obligado (R.A. 19/2025)',
    travelRule: 'Implementada con sus contrapartes principales',
    beneficiarioFinal: 'Declarado y verificado: 2 socios bolivianos',
    controlesAml: 'Onboarding, screening, monitoreo y KYT documentados',
    sanciones: '',
    exposicionOnchain: 'Contrapartes identificadas; 6% hacia servicios DeFi',
    camposExtra: [
      { etiqueta: 'Modelo operativo', valor: 'CEX + mesa OTC + canal P2P entre usuarios' },
      { etiqueta: 'Proveedores', valor: 'Liquidez tercerizada en dos proveedores extranjeros' },
    ],
    decisionCorrecta: 'reforzar',
    regla: 'Complejidad operativa no es ilicitud: exige comprension y mitigantes',
    explicacion:
      'El expediente esta completo y la entidad es supervisable, asi que rechazar seria de-risking. Pero combina P2P, proveedores de liquidez extranjeros y exposicion DeFi: eso aumenta complejidad y dependencia de controles de terceros. La respuesta proporcional es aceptar con mitigantes (limites, monitoreo reforzado y revision mas frecuente), no cerrar la puerta.',
    origen: 'Modulo 3 - Tema 5: Due Diligence de PSAV/VASP',
  },
  {
    entidad: 'Khana Pay S.A.',
    tipo: 'PSAV - intercambio fiat/AV',
    jurisdiccion: 'Bolivia',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'Vigente como Sujeto Obligado',
    travelRule: '',
    beneficiarioFinal: 'Estructura simple, UBO identificado y documentado',
    controlesAml: 'Oficial de cumplimiento designado; politicas y auditoria anual',
    sanciones: '',
    exposicionOnchain: 'Sin conexiones con categorias de riesgo',
    camposExtra: [
      {
        etiqueta: 'Modelo operativo',
        valor: 'Compra/venta de stablecoins contra bolivianos, sin P2P ni DeFi',
      },
      { etiqueta: 'Contrapartes', valor: 'Dos exchanges regulados, ambos identificados' },
      {
        etiqueta: 'Volumen declarado',
        valor: 'Consistente con el perfil y la actividad informada',
      },
    ],
    decisionCorrecta: 'aprobar',
    regla: 'El enfoque basado en riesgos no excluye por categoria',
    explicacion:
      'Que la contraparte sea un PSAV no la vuelve inaceptable. Aqui hay registro, UBO claro, modelo simple, contrapartes conocidas y sin exposicion de riesgo: el riesgo residual entra en el apetito con controles estandar. Rechazar este caso es exactamente el de-risking indiscriminado que GAFI desaconseja.',
    origen: 'Modulo 2 - Tema 5: no de-risking automatico',
  },
  {
    entidad: 'Ferrum Exchange Ltd.',
    tipo: 'VASP extranjero - intercambio AV/AV',
    jurisdiccion: 'Jurisdiccion offshore',
    solicitud: 'Relacion de corresponsalia para liquidacion',
    registroLicencia: 'Sin licencia ni registro en su jurisdiccion',
    travelRule: 'No aplica ningun mecanismo',
    beneficiarioFinal: 'No revelado; estructura con sociedades interpuestas',
    controlesAml: 'No presenta politicas ni oficial responsable',
    sanciones: 'Entidad y dos de sus socios aparecen en listas de sanciones',
    exposicionOnchain: '22% del volumen con entidades sancionadas',
    camposExtra: [],
    decisionCorrecta: 'rechazar',
    regla: 'Sanciones financieras dirigidas: el riesgo no es mitigable',
    explicacion:
      'Aqui no hay analisis de proporcionalidad posible. Hay coincidencia en listas de sanciones, sin licencia, sin UBO y con exposicion directa y material a entidades sancionadas. Cuando existen prohibiciones aplicables y el riesgo no puede gestionarse dentro del apetito, la decision es no iniciar la relacion.',
    origen: 'Modulo 2 - Tema 5: sanciones financieras dirigidas',
  },
  {
    entidad: 'Cripto Yungas',
    tipo: 'Empresa que opera intercambio y custodia para terceros',
    jurisdiccion: 'Bolivia',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'No registrada; sostiene que "solo intermedia, no es un banco"',
    travelRule: '',
    beneficiarioFinal: 'Un socio unico, identificado',
    controlesAml: 'Sin politicas formales ni oficial de cumplimiento',
    sanciones: '',
    exposicionOnchain: '',
    camposExtra: [
      {
        etiqueta: 'Actividad declarada',
        valor: 'Compra, venta y custodia de activos virtuales por encargo de clientes',
      },
      {
        etiqueta: 'Fines',
        valor: 'Actividad comercial con fines de lucro; cobra comision por operacion',
      },
      { etiqueta: 'Clientes', valor: 'Alrededor de 400 personas naturales y 30 empresas' },
    ],
    decisionCorrecta: 'rechazar',
    regla: 'Criterio funcional: la etiqueta surge de la actividad real',
    explicacion:
      'Intercambia y custodia activos virtuales para terceros con fines de lucro: por la R.A. UIF 19/2025 es un PSAV y debe estar registrado como Sujeto Obligado, sin importar como se autodenomine. Opera fuera del perimetro regulatorio y sin controles. No corresponde iniciar la relacion mientras no regularice su situacion.',
    origen: 'Modulo 2 - Tema 3: PSAV = actividad comercial para terceros',
  },
  {
    entidad: 'Textiles Illimani S.R.L.',
    tipo: 'Empresa comercial - usuaria de activos virtuales',
    jurisdiccion: 'Bolivia',
    solicitud: 'Mantener cuenta operativa; declara compras de AV',
    registroLicencia: 'No tiene registro UIF como PSAV',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: '',
    sanciones: '',
    exposicionOnchain: '',
    camposExtra: [
      {
        etiqueta: 'Actividad principal',
        valor: 'Confeccion y venta de textiles; 12 anios de operacion',
      },
      { etiqueta: 'Uso de AV', valor: 'Compra stablecoins para pagar a un proveedor en el exterior' },
      {
        etiqueta: 'Servicios a terceros',
        valor: 'Ninguno: no intercambia ni custodia por cuenta de otros',
      },
      { etiqueta: 'Contraparte', valor: 'Opera a traves de un PSAV local registrado ante la UIF' },
      {
        etiqueta: 'Razonabilidad economica',
        valor: 'Montos coherentes con sus importaciones declaradas',
      },
    ],
    decisionCorrecta: 'aprobar',
    regla: 'Usuario de activos virtuales no equivale a PSAV',
    explicacion:
      'No presta servicios de AV a terceros: compra para su propia operacion. No le corresponde registrarse como PSAV y no hay nada que regularizar. Las operaciones si deben identificarse y clasificarse para el ROG-04, pero eso es una obligacion del banco, no un motivo para rechazar al cliente.',
    origen: 'Modulo 2 - Tema 3: usuario de AV no es PSAV',
  },
  {
    entidad: 'Sur Global VASP',
    tipo: 'VASP extranjero - intercambio y transferencias',
    jurisdiccion: 'Jurisdiccion con Travel Rule de implementacion parcial',
    solicitud: 'Ser contraparte receptora de transferencias de clientes',
    registroLicencia: 'Licencia vigente y supervisor identificado',
    travelRule:
      'La jurisdiccion la implementa parcialmente; el VASP ya la aplica por politica propia',
    beneficiarioFinal: 'Declarado, con estructura verificable',
    controlesAml: 'Programa documentado; auditoria externa reciente',
    sanciones: 'Screening activo; sin coincidencias',
    exposicionOnchain: 'Mayoritariamente exchanges regulados; 3% sin atribucion',
    camposExtra: [],
    decisionCorrecta: 'reforzar',
    regla: 'Sunrise issue: la implementacion desigual no decide por si sola',
    explicacion:
      'Que la jurisdiccion de destino no tenga la regla en identicos terminos no bloquea automaticamente la relacion: GAFI llama a esa asimetria el sunrise issue. Hay licencia, supervision y controles verificables, asi que el camino es aceptar con condiciones y monitoreo reforzado sobre las transferencias alcanzadas, no cortar la relacion.',
    origen: 'Modulo 2 - Tema 5: Travel Rule y sunrise issue',
  },
  {
    entidad: 'Nodo Central S.A.',
    tipo: 'PSAV - declara intercambio AV/AV',
    jurisdiccion: 'Bolivia',
    solicitud: 'Ampliacion de limites operativos',
    registroLicencia: 'Vigente',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: '',
    sanciones: '',
    exposicionOnchain: '',
    camposExtra: [
      { etiqueta: 'Modelo declarado', valor: 'Solo intercambio entre activos virtuales, sin custodia' },
      {
        etiqueta: 'Evidencia operativa',
        valor: 'Mantiene saldos de clientes en wallets propias por semanas',
      },
      {
        etiqueta: 'Servicios no declarados',
        valor: 'Opera cuentas anidadas (nested) de dos brokers extranjeros',
      },
      { etiqueta: 'Clientes de esos brokers', valor: 'No identificados por Nodo Central' },
      {
        etiqueta: 'Respuesta a consultas',
        valor: 'Presenta documentacion que contradice el modelo declarado',
      },
    ],
    decisionCorrecta: 'rechazar',
    regla: 'Los controles deben corresponder al modelo operativo real',
    explicacion:
      'El registro esta vigente, pero el modelo declarado no es el modelo real: custodia saldos de terceros y presta nested services a brokers cuyos clientes no identifica. La contradiccion entre lo declarado y lo evidenciado invalida la base de la debida diligencia y deja sin cobertura el riesgo asumido.',
    origen: 'Modulo 3 - Tema 5: nested services y modelo operativo',
  },
  {
    entidad: 'Altiplano Pay',
    tipo: 'PSAV - billetera y pagos',
    jurisdiccion: 'Bolivia',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'Vigente',
    travelRule: '',
    beneficiarioFinal: 'Identificado',
    controlesAml: 'Programa documentado y probado',
    sanciones: '',
    exposicionOnchain: 'Exposicion indirecta a un mixer',
    camposExtra: [
      { etiqueta: 'Distancia', valor: '5 hops de distancia' },
      { etiqueta: 'Materialidad', valor: '0,2% del volumen total' },
      { etiqueta: 'Temporalidad', valor: 'Operaciones de hace mas de dos anios; sin repeticion' },
    ],
    decisionCorrecta: 'aprobar',
    regla: 'Una senal no es una conclusion: pesa distancia, monto y temporalidad',
    explicacion:
      'Aparece la palabra mixer y el reflejo es rechazar, pero la exposicion es indirecta, a 5 hops, por 0,2% del volumen y sin repeticion en dos anios. No es material. El hop por si solo no es indicador suficiente: hay que leerlo junto con direccion, monto, porcentaje, temporalidad y contexto.',
    origen: 'Modulo 4 - Tema 2: hops y analisis de exposicion',
  },
  {
    entidad: 'Rio Blanco Digital',
    tipo: 'PSAV - intercambio y transferencias',
    jurisdiccion: 'Bolivia',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'Vigente',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: 'Politicas presentadas; monitoreo on-chain incipiente',
    sanciones: '',
    exposicionOnchain: 'Servicios de darknet y direcciones asociadas a ransomware',
    camposExtra: [
      { etiqueta: 'Distancia', valor: 'Exposicion directa, 1 hop' },
      { etiqueta: 'Materialidad', valor: '31% del volumen del ultimo trimestre' },
      { etiqueta: 'Temporalidad', valor: 'Actividad recurrente y en curso' },
      { etiqueta: 'Explicacion de la entidad', valor: 'No la identifico ni la reporto' },
    ],
    decisionCorrecta: 'rechazar',
    regla: 'Exposicion directa, material y vigente: el riesgo no se mitiga con limites',
    explicacion:
      'Es el contraste del caso anterior. Aqui la exposicion es directa, a 1 hop, por 31% del volumen, recurrente y ademas la entidad no la detecto: su monitoreo no funciona. Con esa combinacion no hay mitigante proporcional; la relacion no puede sostenerse.',
    origen: 'Modulo 4 - Tema 3: tipologias y senales de alerta',
  },
  {
    entidad: 'Meridiano Holding Group',
    tipo: 'PSAV - custodia institucional',
    jurisdiccion: 'Bolivia con matriz en el exterior',
    solicitud: 'Apertura de cuenta corporativa',
    registroLicencia: 'Vigente',
    travelRule: '',
    beneficiarioFinal: 'No revelado; se niega a informarlo por "politica del grupo"',
    controlesAml: 'Politicas formales presentadas',
    sanciones: '',
    exposicionOnchain: 'Sin hallazgos relevantes',
    camposExtra: [
      {
        etiqueta: 'Estructura societaria',
        valor: 'Cuatro niveles de sociedades en tres jurisdicciones',
      },
      { etiqueta: 'Gobierno corporativo', valor: 'No identifica a los responsables de Cumplimiento' },
    ],
    decisionCorrecta: 'rechazar',
    regla: 'Sin beneficiario final no hay debida diligencia posible',
    explicacion:
      'El registro esta vigente y no hay hallazgos on-chain, pero la primera capa de la debida diligencia no se puede completar: no se sabe quien controla la entidad. Sin UBO ni responsables identificables no hay forma de evaluar el riesgo ni de sustentar una decision explicable.',
    origen: 'Modulo 3 - Tema 5: capa 1, quien es y quien lo controla',
  },
  {
    entidad: 'Comercial Andina S.A.',
    tipo: 'Cliente corporativo con operaciones en AV',
    jurisdiccion: 'Bolivia',
    solicitud: 'Revision de perfil por aumento de operaciones',
    registroLicencia: '',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: '',
    sanciones: '',
    exposicionOnchain: 'Recibe stablecoins desde una wallet no informada',
    camposExtra: [
      { etiqueta: 'Perfil declarado', valor: 'Importadora; movimiento esperado de USD 80.000 al mes' },
      { etiqueta: 'Comportamiento real', valor: 'Transfiere USD 2.400.000 al mes hacia un PSAV local' },
      { etiqueta: 'Origen de fondos', valor: 'No documentado para el incremento' },
      { etiqueta: 'Contraparte', valor: 'PSAV registrado ante la UIF, con controles verificados' },
      { etiqueta: 'Actitud', valor: 'Dispuesta a presentar documentacion de respaldo' },
    ],
    decisionCorrecta: 'reforzar',
    regla: 'Razonabilidad economica: la incoherencia abre analisis, no condena',
    explicacion:
      'El salto de 80 mil a 2,4 millones rompe la razonabilidad economica y hay una wallet no informada, pero la contraparte es solida y el cliente ofrece respaldo. Corresponde debida diligencia ampliada: Source of Funds y Source of Wealth, actualizacion de perfil y monitoreo reforzado. Decidir sin pedir esa evidencia seria prematuro en cualquiera de los dos sentidos.',
    origen: 'Modulo 3 - Tema 4: Source of Funds y razonabilidad economica',
  },
  {
    entidad: 'Puente Sur PSAV',
    tipo: 'PSAV - transferencias transfronterizas',
    jurisdiccion: 'Bolivia',
    solicitud: 'Habilitacion de transferencias hacia VASP del exterior',
    registroLicencia: 'Vigente',
    travelRule: 'Sin capacidad de transmitir datos de originador y beneficiario',
    beneficiarioFinal: 'Identificado y verificado',
    controlesAml: 'KYC y monitoreo bancario adecuados',
    sanciones: '',
    exposicionOnchain: '',
    camposExtra: [
      { etiqueta: 'Volumen transfronterizo', valor: 'Alto y creciente hacia tres VASP extranjeros' },
      { etiqueta: 'Contrapartes', valor: 'Dos con licencia verificada; una sin informacion suficiente' },
    ],
    decisionCorrecta: 'reforzar',
    regla: 'Brecha identificada, mitigante proporcional',
    explicacion:
      'La entidad es supervisable y tiene controles, pero hay una brecha concreta: mueve volumen transfronterizo alto sin capacidad de Travel Rule y con una contraparte sin informacion suficiente. La respuesta es condicionar: limites, exigencia de informacion sobre esa contraparte y plan de implementacion, con revision. Evidencia, brecha, mitigacion y riesgo residual.',
    origen: 'Modulo 3 - Tema 5: de la evidencia al riesgo residual',
  },
  {
    entidad: 'Entidad Financiera Cordillera',
    tipo: 'EIF que inicia actividad como PSAV',
    jurisdiccion: 'Bolivia',
    solicitud: 'Relacion interbancaria por nueva linea de negocio en AV',
    registroLicencia: 'Actualizo su registro ante la UIF al iniciar la actividad PSAV',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: 'Sistema existente ampliado a operaciones con AV',
    sanciones: '',
    exposicionOnchain: 'Contrapartes identificadas, sin categorias de riesgo',
    camposExtra: [
      {
        etiqueta: 'Condicion previa',
        valor: 'Entidad de intermediacion financiera, ya Sujeto Obligado',
      },
      { etiqueta: 'Nueva actividad', valor: 'Comienza a ofrecer compra/venta de AV a sus clientes' },
      { etiqueta: 'Reporte', valor: 'Clasifica e informa operaciones con AV mediante ROG-04' },
    ],
    decisionCorrecta: 'aprobar',
    regla: 'Las categorias se superponen: ser EIF no exime de la nueva actividad',
    explicacion:
      'Hizo exactamente lo que corresponde: al iniciar actividad como PSAV actualizo su registro ante la UIF, amplio sus controles e incorporo las operaciones con AV al ROG-04. Ser banco no elimina las obligaciones de la nueva actividad, y aqui estan cubiertas.',
    origen: 'Modulo 2 - Tema 3: EIF que inicia actividad PSAV',
  },
];

# Imagenes del juego

Todo lo que hay en esta carpeta se sirve tal cual en `/archivos/...` (sin el
prefijo `/api`). La ruta se puede mover con `RUTA_ARCHIVOS` en `backend/.env`.

## `fondos/`

Fondo de la escena de la Mesa de Cumplimiento. El juego busca **un nombre fijo**:

```
fondos/mesa-cumplimiento.png
```

Si el archivo no esta, la escena usa un degradado de respaldo y el juego
funciona igual. Sirve PNG, JPG o WEBP (la extension tiene que ser `.png` para
que el nombre coincida; si prefieres otro formato, renombra el archivo).

Recomendado: 1600x900 o mas, apaisado. La parte inferior central queda tapada
por el personaje y el expediente, asi que conviene que lo importante este arriba
y a los costados.

## `personajes/`

Fotos o ilustraciones de los CEO que aparecen frente al jugador.

Hay dos formas de que un personaje llegue al juego, y ambas terminan igual (una
fila en la tabla `personajes`):

1. **Dejar el archivo aqui.** Cualquier imagen suelta en esta carpeta aparece en
   Ludus, en *Personajes*, como "imagen disponible en el servidor". El docente le
   pone nombre y cargo y queda registrada.
2. **Subirla desde Ludus.** El docente elige el archivo en *Personajes > Nuevo
   personaje*; se guarda aqui con un nombre aleatorio.

Recomendado: PNG con fondo transparente, vertical, de medio cuerpo, mirando al
frente. El juego lo ancla al borde inferior de la escena, asi que la imagen debe
estar recortada a la altura del pecho o la cintura. Maximo 3 MB por archivo.

Un personaje se asigna a cada caso desde *Casos de cumplimiento*. Un caso sin
personaje se juega igual: la escena muestra una silueta neutra.

## `fichas/`

Iconos y fichas de los mazos del Memorama y el Mahjong.

- `fichas/base/memorama/` y `fichas/base/mahjong/`: los iconos de los mazos
  base ("Clasico"), generados a partir de [Lucide](https://lucide.dev) (licencia
  ISC). No se borran nunca solos.
- Lo que el docente sube desde *Editor > Memorama/Mahjong > Mazos* se guarda
  aqui con un nombre aleatorio y se borra cuando ningun mazo lo usa.

Recomendado: imagenes cuadradas; para el Mahjong, PNG con fondo transparente.
Maximo 3 MB por imagen. Los fondos de mesa van a `fondos/`.

## `videos/`

Videos del Runner Narrativo: **MP4 (H.264), maximo 10 segundos y 10 MB cada
uno.** El servidor revisa los tres limites al subir (lee la duracion y el codec
del propio archivo). Un video que ninguna historia usa se borra solo.

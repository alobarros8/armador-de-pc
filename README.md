# Armador de PC

Armador de PC completo, inspirado en la experiencia de [Compra Gamer](https://compragamer.com/armatupc) pero con validaciones más profundas, presets por gama, optimizador por presupuesto y exportación de la build.

- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS 4
- **Datos:** 100 % frontend, sin backend. La build se guarda en `localStorage` y en el hash de la URL.
- **Precios:** referencia en ARS, relevados en octubre de 2026. No incluyen envío ni variaciones del mercado.

## Funcionalidad

- Catálogo de 149 componentes y periféricos para AMD (AM4/AM5) e Intel (LGA1700/LGA1851).
- **Pantalla de inicio** con la build vacía: el usuario elige entre cargar una build preestablecida o empezar de cero. Si ya hay una build en el link o en `localStorage`, se abre directamente; **Limpiar** vuelve a la pantalla de inicio.
- Flujo guiado por categorías: CPU, cooler, motherboard, RAM, GPU, almacenamiento, fuente, gabinete, monitor, teclado, mouse, auriculares y extras.
- Filtro **Solo compatibles** activado por defecto, búsqueda, filtro por marca y orden por precio o rendimiento.
- Ficha de detalle con foto, especificaciones, notas y compatibilidad con la build actual.
- 12 presets completos: oficina, gama baja, media, alta, entusiasta, workstation y una compacta ITX.
- **Armá por presupuesto**: elegí monto, uso y preferencia; el optimizador genera 2 o 3 builds completas y compatibles listas para aplicar.
- **Optimizar mi build actual**: fijá las piezas de la torre que ya elegiste y dejá que el optimizador complete o ajuste el resto dentro del presupuesto.
- Panel de build con progreso de esenciales, subtotales, total y acceso rápido a cada categoría.
- **Mis builds guardadas**: guardá builds con nombre en el navegador, volvé a cargar cualquiera y compará opciones.
- Resumen con presupuesto, consumo estimado, fuente recomendada, índices de gaming/productividad y avisos.
- Compartir por link, exportar/importar JSON, copiar lista en texto y descargar archivo.

## Armá por presupuesto

El botón **Presupuesto** del header, el panel de build, el resumen y el estado vacío del catálogo abren el optimizador. Solo hay que elegir:

- **Presupuesto para la torre:** cubre CPU, cooler, motherboard, RAM, GPU, almacenamiento, fuente y gabinete. No incluye monitor, teclado, mouse, auriculares ni envío.
- **Uso:** gaming 1080p, gaming 1440p, edición, streaming u oficina.
- **Preferencia:** máximo rendimiento, equilibrada o compacta y silenciosa.

El motor combina los componentes con una búsqueda tipo beam search, descarta las builds incompletas o incompatibles y devuelve 2 o 3 propuestas:

- **Máximo rendimiento:** la mayor potencia que entra en el presupuesto.
- **Equilibrada:** el mejor balance entre rendimiento, calidad y precio.
- **Mejor valor:** la opción más económica de las tres sin resignar lo esencial.

Reglas que aplica el optimizador:

- Todas las propuestas son builds completas, sin errores ni advertencias, y entran en el presupuesto.
- Gaming, edición y streaming requieren GPU dedicada, RAM en dual channel y SSD NVMe. Edición, streaming y gaming 1440p piden al menos 32 GB de RAM.
- Oficina usa únicamente gráficos integrados.
- Con GPU dedicada se exige motherboard PCIe 4.0 y se descartan chipsets de entrada como H610 o A520.
- Las configuraciones de gama alta exigen mothers de mejor gama, fuentes Gold/Platinum y gabinetes con buen flujo de aire.
- La preferencia compacta prioriza Mini-ITX con fuente SFX. Si el presupuesto no permite al menos dos propuestas ITX, relaja el formato a gabinetes chicos y lo informa en el resultado.
- Si el presupuesto no alcanza, muestra un mínimo orientativo y permite reintentar con un clic.
- Aplicar una propuesta desde cero reemplaza la build actual, fija el presupuesto y cierra el diálogo.

### Optimizar mi build actual

Desde el resumen, el botón **Optimizar mi build actual** abre el optimizador con el interruptor **Mantener mis piezas actuales** activado. También podés activarlo a mano si ya hay piezas de torre cargadas.

- Las piezas de la torre que ya elegiste quedan fijas; el motor completa las categorías faltantes y elige el resto para mejorar el resultado.
- Los precios de las piezas fijas se cuentan dentro del presupuesto. Los periféricos (monitor, teclado, mouse, auriculares y extras) no se tocan ni se suman.
- Antes de buscar, valida que las piezas fijas cumplan el uso elegido: socket, RAM, NVMe, PCIe, eficiencia de fuente, flujo de aire y requisitos de gama alta.
- Si hay un conflicto que solo se resolvería cambiando una pieza fija, no devuelve builds con advertencias: explica el conflicto y ofrece optimizar sin fijar piezas.
- Si las piezas fijas ya superan el presupuesto, muestra cuánto suman y sugiere subir el presupuesto o destrabar alguna.
- En preferencia compacta, si una pieza fija impide Mini-ITX, mantiene tus piezas y avisa que la propuesta no es Mini-ITX.
- Cada propuesta marca las piezas fijas con **Fija**. Al aplicar, se conservan esas piezas y los periféricos; se reemplaza el resto de la torre.

## Validaciones de compatibilidad

- Socket CPU ↔ motherboard y tipo de RAM (DDR4/DDR5).
- Cantidad de módulos de RAM ↔ slots de la motherboard.
- Formato de motherboard ↔ gabinete (ATX, Micro-ATX, Mini-ITX).
- Largo de GPU y altura de cooler ↔ espacio del gabinete.
- Radiador de AIO ↔ soporte del gabinete.
- Socket y TDP del cooler ↔ CPU; coolers de fábrica solo con CPUs que los incluyen.
- Consumo estimado ↔ potencia de la fuente, con margen recomendado.
- Formato de fuente (ATX/SFX) ↔ gabinete, incluyendo builds ITX.
- Slots M.2 para unidades NVMe, velocidad PCIe y builds solo-HDD.
- Salida de video (CPU sin iGPU y sin GPU dedicada).
- Cuello de botella CPU/GPU y monitor por resolución/refresco.
- Avisos por RAM insuficiente o single channel, fuente Bronze en gama alta y más.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # chequeo de tipos + build de producción
npm run preview  # servir el build
npm run lint     # oxlint
npm run test     # vitest (compatibilidad, optimizador, share e historial)
```

Para refrescar las instantáneas de referencia del catálogo público de Compra Gamer:

```bash
node scripts/fetch-compragamer.mjs
```

Los archivos quedan en `data/cg-*.json` y se usan solo como referencia de precios; la app no los carga en runtime.

## Imágenes

Cada componente muestra una foto de referencia en la tarjeta del catálogo y en la ficha de detalle. Las 149 piezas tienen foto y se sirven localmente, sin hotlinks ni dependencia de un CDN.

- **146 fotos** de componentes descargadas del catálogo público de Compra Gamer (`public/parts/<id>.jpg`, 450 × 402 px, ~2,9 MB).
- **3 fotos oficiales** para los productos que no están en ese catálogo:
  - **AMD Wraith Stealth**, desde [amd.com](https://www.amd.com/en/products/processors/ecosystem/cpu-cooler-solutions.html).
  - **Intel Laminar RM1**, desde el [artículo de soporte de Intel](https://www.intel.com/content/www/us/en/support/articles/000089190.html).
  - **Windows 11 Home**, arte oficial de [Microsoft Store](https://www.microsoft.com/en-us/d/windows-11-home/dg7gmgf0krt0).
- Si una imagen falta o falla al cargar, `PartImage` muestra el icono de la categoría y la leyenda «Imagen referencial» sin dejar un ícono roto.

El mapa `src/data/images.ts` relaciona cada pieza con su archivo, y `data/part-images.json` guarda la trazabilidad (ID y nombre del producto original, más la fuente de las fotos oficiales). Para volver a descargar las 146 fotos de Compra Gamer:

```bash
node scripts/fetch-part-images.mjs          # solo baja las que faltan
node scripts/fetch-part-images.mjs --force  # vuelve a bajar las 146
```

Las 3 fotos oficiales ya están procesadas a 450 × 402 y se incluyen en el repo; el script solo verifica que existan. Las fotos pertenecen a sus marcas y a Compra Gamer; se usan únicamente como referencia visual de los productos.

## Estructura

```
src/
  App.tsx                 # shell, layout, modales y toasts
  components/
    Catalog.tsx           # tabs, filtros y grilla de componentes
    PartCard.tsx          # tarjeta de componente
    PartImage.tsx         # foto local con fallback por categoría
    BuildPanel.tsx        # panel de build por slots
    Summary.tsx           # total, presupuesto y compatibilidad
    OptimizerDialog.tsx   # formulario y propuestas de "Armá por presupuesto"
    Dialogs.tsx           # presets, compartir/importar y detalle
    ui.tsx                # Modal, badges, progreso e iconos
  data/
    catalog.ts            # catálogo curado y builders tipados
    presets.ts            # 12 builds de referencia
    images.ts             # mapa id de pieza → /parts/<id>.jpg
  lib/
    compat.ts             # motor de análisis y compatibilidad por pieza
    optimizer.ts          # motor de builds por presupuesto (beam search)
    optimizer.test.ts     # cobertura del optimizador
    useBuild.ts           # estado, persistencia y acciones
    history.ts            # builds guardadas con nombre (localStorage)
    share.ts              # base64url, JSON, texto y portapapeles
    cn.ts                 # utilidad de clases
    format.ts             # moneda y utilidades
  types.ts                # tipos de dominio
scripts/
  fetch-compragamer.mjs   # descarga el catálogo de referencia
  fetch-part-images.mjs   # descarga las fotos de Compra Gamer y verifica las oficiales
public/
  parts/                  # 149 fotos locales de componentes
```

## Formato del link

La build se serializa en base64url dentro del hash:

```
https://tu-dominio/#b=eyJ2IjoxLCJiIjpudWxsLCJzIjp7ImNwdSI6WyJ...
```

Payload: `{ v: 1, b: presupuesto | null, s: selecciones }`. Al importar se validan las categorías, los IDs y los límites de cada slot, así que un link viejo o manipulado no rompe la app.

## Notas

- Los precios y el índice de rendimiento son orientativos; no representan FPS medidos ni stock real.
- Windows 11 es una licencia de referencia: también se puede usar Windows sin licencia o Linux.
- El catálogo prioriza piezas verificables antes que volumen: es fácil agregar más modelos en `src/data/catalog.ts` usando los builders existentes.

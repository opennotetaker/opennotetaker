// Español.
//
// Conventions this follows:
//
// - **Tú-form**, as Apple and Google use in consumer software. Usted would
//   sound like a bank; this is a tool someone opens before a meeting.
// - **Controls are infinitives**: Grabar, Cancelar, Descargar. Spanish
//   interfaces use the infinitive for a button and the imperative only when
//   the app is genuinely telling you to do something ("Lee esto en voz alta").
// - **Neutral Spanish**, not regional: computadora/ordenador avoided in favour
//   of "este dispositivo"; grabación, not grabado.
// - Kept in English because they are the interface's own words elsewhere:
//   pestaña is translated, but Markdown, JSON, CSV and HTML are not.

import type { Catalogue } from "../lib/i18n";

export const es: Catalogue = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "Inicio",
  "nav.library": "Biblioteca",
  "nav.ask": "Preguntar",
  "nav.privacy": "Privacidad",
  "nav.account": "Cuenta",
  "nav.language": "Idioma",
  "shell.starting": "Iniciando…",
  "shell.recording": "Grabando",
  "shell.paused": "En pausa",
  "shell.goToRecorder": "Ir a la grabadora",
  "shell.footerTagline": "OpenNoteTaker — transcripción que se queda en tu dispositivo.",
  "shell.footerPrivacy": "Qué sale de este dispositivo",
  "shell.footerSource": "Código fuente (MIT / Apache-2.0)",
  "shell.startAgain": "Empezar de nuevo",
  "shell.somethingWrong": "Algo salió mal.",
  "shell.noticeStorage":
    "Este navegador no deja que la página guarde nada, así que no quedará nada al cerrar la pestaña. Todo lo demás funciona.",
  "shell.noticeExpired":
    "{count} notas superaron el periodo de conservación que fijaste y se han borrado.",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "Nadie se une a tu llamada. Nada sale de tu dispositivo.",
  "home.lede":
    "OpenNoteTaker graba, transcribe y separa a quien habla dentro de esta pestaña del navegador. El audio nunca se sube, no aparece ningún bot en la lista de participantes y no hay suscripción que cancelar.",
  "home.record": "Grabar una reunión",
  "home.open": "Abrir una grabación",
  "home.readyGpu":
    "Listo en este dispositivo — usando tu GPU. El modelo {model} ({size}) se descarga una sola vez, la primera vez que transcribas.",
  "home.readyWasm":
    "Listo en este dispositivo — usando WebAssembly. El modelo {model} ({size}) se descarga una sola vez, la primera vez que transcribas.",
  "home.claim1.title": "La grabación se queda aquí",
  "home.claim1.body":
    "El reconocimiento de voz se ejecuta en esta pestaña, en tu procesador o tu GPU. Lo único que se descarga es el modelo, y una sola vez. Para las funciones gratuitas no se envía absolutamente nada a ninguna parte.",
  "home.claim1.link": "Qué sale de este dispositivo",
  "home.claim2.title": "Te pedimos que preguntes",
  "home.claim2.body":
    "La grabación empieza tras una comprobación de consentimiento de un solo paso, con una frase que puedes leer en voz alta. Lo acordado se guarda junto a la grabación y se imprime en cada exportación, para que dentro de seis semanas siga sirviendo como prueba.",
  "home.claim3.title": "Sin suscripción, sin sorpresas",
  "home.claim3.body":
    "La transcripción, las marcas de tiempo, la separación de voces, los resúmenes de lo dicho y todos los formatos de exportación son gratis y lo seguirán siendo: a nosotros no nos cuestan nada. Lo que escribe una IA cuesta créditos, y ves el precio exacto antes de pulsar.",
  "home.claim3.link": "Ver cuánto cuesta cada cosa",
  "home.table.heading": "Qué hace",
  "home.table.feature": "Función",
  "home.table.where": "Dónde se ejecuta",
  "home.table.price": "Precio",
  "home.table.inTab": "En esta pestaña",
  "home.table.ourServer": "Nuestro servidor, nuestra clave de modelo",
  "home.table.split": "La búsqueda aquí, la respuesta en nuestro servidor",
  "home.table.free": "Gratis",
  "home.table.credits": "Créditos",
  "home.feature.transcribe": "Transcripción, 99 idiomas",
  "home.feature.timeline": "Una marca de tiempo en cada frase",
  "home.feature.speakers": "Distinguir quién habla",
  "home.feature.record": "Grabar sin ningún bot",
  "home.feature.export": "Subtítulos, texto, Markdown, JSON, CSV, HTML",
  "home.feature.summary": "Temas, frases clave, tareas, decisiones",
  "home.feature.search": "Buscar en todo lo que has grabado",
  "home.feature.translateFree": "Traducir mientras transcribe (al inglés)",
  "home.feature.minutes": "Actas y tareas escritas por IA",
  "home.feature.ask": "Preguntar a través de todas tus reuniones",
  "home.feature.translatePaid": "Traducir una transcripción terminada a cualquier idioma",
  "home.table.note":
    "Esa línea no es una decisión comercial disfrazada: todo lo que está por encima se ejecuta en tu hardware y a nosotros no nos cuesta nada, así que cobrarlo sería cobrar por la cuenta. Todo lo que está por debajo es una factura que le pagamos a un proveedor de modelos.",
  "home.selfhost.title": "También funciona en tu propio servidor",
  "home.selfhost.body":
    "Toda la aplicación son archivos estáticos y un módulo WebAssembly. Descarga una versión y ábrela, o sírvela desde una máquina que controles tú: una vez guardado el modelo en caché, las funciones gratuitas funcionan sin red alguna.",
  "home.selfhost.note":
    "Consulta docs/self-hosting.md en el repositorio. Esto es lo único que no ofrece ninguno de los once productos que comparamos: los que procesan en local te obligan a instalar algo, y los que se abren en el navegador suben tu audio.",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "Esta grabación se queda en este dispositivo. Se transcribe aquí, en este navegador, y no se sube a ninguna parte. A todas las personas que puedan oírse se les ha dicho que se está grabando.",
  "consent.script":
    "Antes de empezar: voy a grabar esto para tomar notas. La grabación se queda en mi equipo. ¿Os parece bien a todos?",
  "consent.method.announced": "Lo dije en voz alta",
  "consent.method.announcedHint": "El caso habitual. Lee la frase de arriba si te ayuda.",
  "consent.method.written": "Está acordado por escrito",
  "consent.method.writtenHint": "Una nota en el calendario, un mensaje, una política que todos han visto.",
  "consent.method.solo": "Estoy solo",
  "consent.method.soloHint": "Una nota de voz, un ensayo, una llamada sin nadie más.",
  "consent.record.at": "Grabado el {at}.",
  "consent.record.solo": "No había nadie más presente.",
  "consent.record.method": "Consentimiento: {method}.",
  "consent.record.present": "Presentes: {names}.",
  "consent.record.captured": "Capturado: {sources}.",
  "consent.record.told": "A todos los presentes se les dijo: «{disclosure}»",
  "record.title": "Antes de grabar",
  "record.lede": "Una pantalla, una vez. Esta es la parte que casi todas las herramientas se saltan.",
  "record.scriptHeading": "Lee esto en voz alta, si te ayuda",
  "record.scriptNote":
    "Lo difícil de pedirlo no es que acepten: es encontrar las palabras mientras ocho personas esperan.",
  "record.whoHeading": "¿Quién participa en esta conversación?",
  "record.whoHint":
    "Opcional, y solo se guarda aquí. Pasa al registro y a las notas exportadas.",
  "record.whoPlaceholder": "Ana, Priya y dos personas del cliente",
  "record.afterHeading": "Después",
  "record.keepAudio": "Conservar la grabación, no solo la transcripción",
  "record.keepAudioHint":
    "Se guarda solo en este navegador y se borra junto con la nota. Es la mitad más grande y más delicada, y por eso está desactivado salvo que lo pidas.",
  "record.keepAudioWarning":
    "El audio se descartará al cerrar la nota. Si la transcripción sale mal — un idioma que no esperaba, dos personas fundidas en una — no quedará nada con lo que volver a intentarlo.",
  "record.sourcesHeading": "¿Qué hay que grabar?",
  "record.source.mic": "Tu micrófono",
  "record.source.micHint": "Tú y quien esté contigo en la sala.",
  "record.source.tab": "El sonido de una pestaña o ventana",
  "record.source.tabHint":
    "Todos los de una videollamada. Se te preguntará qué pestaña, y tienes que marcar «compartir audio de la pestaña».",
  "record.source.tabUnsupported":
    "Este navegador no comparte el audio de una pestaña con una página. Chrome o Edge sí.",
  "record.micOnlyOnACall":
    "Grabar solo el micrófono sirve para una reunión en la sala. En una llamada no: el navegador elimina lo que sale por tus altavoces, así que los demás no quedan bajos, quedan cancelados. Marca también la pestaña, o graba una entrada de bucle.",
  "record.inputs.heading": "Qué entrada",
  "record.inputs.add": "Añadir un micrófono",
  "record.inputs.switched": "Grabando ahora desde {input}.",
  "record.inputs.liveHint":
    "El cambio se aplica al instante y no deja hueco en la grabación: el archivo continúa como una sola pieza.",
  "record.inputs.reveal": "Elegir la entrada",
  "record.inputs.label": "Entrada",
  "record.inputs.default": "La predeterminada del sistema",
  "record.inputs.none": "Este navegador no dirá el nombre de tus entradas. La predeterminada graba igualmente.",
  "record.inputs.clean": "Limpiar el sonido",
  "record.inputs.cleanHint":
    "Cancelación de eco, supresión de ruido y ganancia automática. Correcto para un micrófono en una sala; desactívalo para un dispositivo de bucle o una mesa de mezclas, donde no tiene nada que cancelar y estropea de forma audible lo que recibe.",
  "record.source.handedTab": "La pestaña de {platform}",
  "record.source.handedTabHint":
    "Entregada por el detector, así que no hay pestaña que elegir ni casilla que marcar.",
  "record.detectorOn":
    "El detector de reuniones está instalado, así que esta pantalla se abre sola cuando entras en una llamada.",
  "record.handoffHeading": "Abierto desde tu llamada de {platform}",
  "record.handoffDirect":
    "El sonido de esa pestaña ya está elegido. No se captura nada hasta que pulses empezar, y después nada sale de este navegador.",
  "record.handoffPicker":
    "El atajo a esa pestaña ha caducado, así que se te preguntará qué pestaña compartir. Marca «compartir audio de la pestaña».",
  "record.agreeHeading": "Con qué estás de acuerdo",
  "record.agreeNote":
    "Se guarda palabra por palabra con esta grabación, de modo que cambiar este texto más adelante no puede reescribir lo que aceptas ahora.",
  "record.pickOne": "Elige al menos una cosa que grabar.",
  "record.start": "Empezar a grabar",
  "record.cancel": "Cancelar",
  "record.capturing": "Capturando {sources}",
  "record.mic": "tu micrófono",
  "record.tab": "una pestaña compartida",
  "record.pause": "Pausar",
  "record.resume": "Reanudar",
  "record.finish": "Terminar y transcribir",
  "record.levelHint":
    "Si esa barra no se mueve nunca, no se está oyendo nada: comprueba el micrófono antes de llegar al final de la reunión.",
  "record.nameLabel": "Ponle nombre ahora, o luego",
  "record.namePlaceholder": "¿De qué es esta reunión?",
  "record.nameNote":
    "Nada ha salido de este equipo, y nada saldrá. La transcripción empieza cuando termines, y se ejecuta aquí.",
  "record.discard": "Descartar la grabación",
  "record.discardConfirm": "¿Descartar esta grabación? No se puede recuperar.",
  "record.defaultTitle": "Grabación, {when}",
  "record.tabEnded":
    "La pestaña que compartías se ha detenido. Termina ahora para conservar lo grabado hasta este momento.",
  "record.consentHeading": "Registro de consentimiento",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "Preparando…",
  "run.reading": "Leyendo el archivo",
  "run.decoding": "Descodificando el audio",
  "run.ready": "Listo",
  "run.loadingModel": "Cargando el modelo de voz",
  "run.downloadingModel": "Descargando el modelo de voz ({percent} %)",
  "run.listeningShort": "Escuchando menos de un minuto de audio",
  "run.listening": "Escuchando {minutes} minutos de audio",
  "run.diarizing": "Averiguando quién dijo qué",
  "run.summarising": "Sacando los temas y las tareas",
  "run.modelNote":
    "El modelo de voz se descarga una vez y luego lo guarda en caché el navegador. No se sube nada.",
  "run.localNote":
    "Esto se está ejecutando en tu propio equipo. Dejar esta pestaña en segundo plano lo ralentiza; cerrarla lo detiene.",
  "run.failedTitle": "Eso no ha funcionado",
  "run.failedNote":
    "No se subió nada y no se guardó nada. Si la grabación no está en silencio, un modelo más grande en Privacidad suele ayudar.",
  "run.back": "Volver al principio",
  "run.cancel": "Cancelar",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "Esa grabación no está aquí",
  "note.missingBody":
    "Puede que haya superado el periodo de conservación que fijaste, o que se abriera en otro dispositivo: no se sincroniza nada en ninguna parte.",
  "note.backToLibrary": "Volver a la biblioteca",
  "note.titleLabel": "Título",
  "note.metaDetected": "{language} detectado",
  "note.metaLines": "{count} líneas",
  "note.metaRecorded": "grabado aquí",
  "note.metaImported": "importado",
  "note.noAudio":
    "La grabación en sí no se conservó, solo esta transcripción. Activa «conservar el audio» en Privacidad si quieres poder reproducirla.",
  "note.whoHeading": "Quién está hablando",
  "note.speakerAuto": "Que lo averigüe",
  "note.speakerCount": "{count} personas",
  "note.speakerOne": "1 persona",
  "note.rediarize": "Volver a averiguar quién habla",
  "note.rediarizeNoAudio":
    "El audio no se conservó, así que no se puede volver a averiguar quién habla.",
  "note.rediarizeRunning": "Escuchando otra vez…",
  "note.rediarizeDone": "{count} voces",
  "note.rediarizeUnassigned": ", {count} líneas demasiado cortas para distinguirlas",
  "note.speakerNote":
    "Las voces se distinguen aquí, en este dispositivo, por el timbre de cada una. Funciona bien con dos o tres personas de voces distintas; le cuesta con voces parecidas, con gente hablando a la vez y con alguien que cambia de micrófono. Si encuentra más personas de las que había en la sala — o menos — indica el número arriba y vuelve a calcularlo. Haz clic en un nombre de la transcripción para pasar una sola línea a otra persona.",
  "note.transcriptHeading": "Transcripción",
  "note.findPlaceholder": "Buscar en esta transcripción",
  "note.playFromHere": "Reproducir desde aquí",
  "note.reassign": "Asignar esta línea a otra persona",
  "note.split": "Dividir",
  "note.splitHint": "Divide esta línea en dos por su punto medio",
  "note.speakerNameFor": "Nombre para {name}",
  "note.recordingHeading": "Esta grabación",
  "note.downloadAudio": "Descargar el audio",
  "note.transcribeAgain": "Transcribir otra vez",
  "note.transcribeAgainConfirm":
    "¿Transcribir esta grabación otra vez? La transcripción actual, sus etiquetas de voz y cualquier cambio que le hayas hecho se sustituyen. El audio se conserva.",
  "note.deleteAudio": "Borrar el audio y conservar la transcripción",
  "note.deleteAudioConfirm":
    "¿Borrar el audio y conservar la transcripción? Esto no se puede deshacer.",
  "note.deleteAll": "Borrarlo todo",
  "note.deleteAllConfirm": "¿Borrar «{title}» por completo? Esto no se puede deshacer.",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "De lo que se dijo",
  "summary.freeBadge": "Hecho en este dispositivo · gratis",
  "summary.redo": "Rehacer",
  "summary.empty": "No destacó nada: puede que la transcripción sea demasiado corta para encontrar temas.",
  "summary.stats": "{sentences} frases · unos {minutes} min · {speakers} voces",
  "summary.topics": "Temas: ",
  "summary.keyPoints": "Puntos clave",
  "summary.decisions": "Decisiones",
  "summary.actionItems": "Tareas",
  "summary.questionsAsked": "Preguntas que salieron",
  "summary.questionsOpen": "Preguntas abiertas",
  "summary.whoTalked": "Quién habló",
  "summary.freeNote":
    "Cada línea de arriba está citada de la transcripción, con la hora en que se dijo. Nada de esto lo escribió un modelo, y nada de esto salió de este dispositivo.",
  "summary.cueLanguages":
    "Las tareas, las decisiones y los plazos se reconocen en {languages}. Los temas y las frases clave funcionan en todos los idiomas.",
  "summary.paidHeading": "Escrito por IA",
  "summary.paidBought": "Pagado · ya comprado",
  "summary.paidBody":
    "Un modelo lee la transcripción y escribe el acta: de qué iba la reunión, qué se decidió, quién debe qué y para cuándo. A diferencia del panel de arriba, son frases nuevas y no citas, con una marca de tiempo en cada una para que puedas comprobarlas.",
  "summary.steer": "Indicación opcional",
  "summary.steerPlaceholder": "¿Algo en concreto? Por ejemplo: «céntrate en lo que pidió el cliente»",
  "summary.write": "Escribir el acta — {price}",
  "summary.writing": "Escribiendo el acta…",
  "summary.discard": "Descartar y escribirla otra vez",
  "summary.signInFirst": "Inicia sesión primero",
  "summary.balance": "Tienes {credits}",
  "summary.revealOne": "Exactamente lo que se enviaría: una petición, solo texto, sin audio",
  "summary.revealMany": "Exactamente lo que se enviaría: {count} peticiones, solo texto, sin audio",
  "summary.redactNone":
    "No se encontró nada que parezca una dirección de correo, un teléfono, un número largo o un enlace, así que esto va tal cual.",
  "summary.redactSome":
    "{items} se sustituirán antes de enviar esto. Puedes desactivarlo en Privacidad.",
  "summary.redactOff":
    "El ocultado antes de enviar está desactivado en Privacidad, así que esto va tal cual.",
  "summary.moreChars": "… y {count} caracteres más",
  "summary.paidNote":
    "Se cobra una vez, cuando funciona. Nada recurrente, nada que cancelar, y una petición fallida no cuesta nada.",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "Exportar",
  "export.download": "Descargar",
  "export.copy": "Copiar",
  "export.withSpeakers": "Incluir quién dijo qué",
  "export.withSummary": "Incluir el resumen",
  "export.withConsent": "Incluir el registro de consentimiento",
  "export.note":
    "Todos los formatos, gratis, para siempre. Son texto dado forma sobre datos que ya están en esta pestaña, así que aquí no hay nada cuya entrega nos cueste algo.",
  "export.clip": "Recortar un fragmento",
  "export.clipFrom": "Desde",
  "export.clipTo": "hasta",
  "export.clipWords": "Las palabras",
  "export.clipSound": "El sonido",
  "export.clipBadRange": "El final tiene que ir después del principio.",
  "export.clipCutting": "Recortando…",
  "export.clipDone": "Listo.",
  "export.clipNote": "Ambos se recortan aquí, en este dispositivo. No se sube nada para hacer un fragmento.",
  "export.excerptTitle": "{title} (fragmento)",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "Resumen",
  "export.label.keyPoints": "Puntos clave",
  "export.label.decisions": "Decisiones",
  "export.label.actionItems": "Tareas",
  "export.label.questionsAsked": "Preguntas que salieron",
  "export.label.questionsOpen": "Preguntas abiertas",
  "export.label.topics": "Temas",
  "export.label.whoSpoke": "Quién habló",
  "export.label.transcript": "Transcripción",
  "export.label.consent": "Consentimiento de grabación",
  "export.label.unknown": "Desconocido",
  "export.label.due": "para",
  "export.label.stats": "{sentences} frases · unos {minutes} min · {speakers} voces",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "Traducir esta transcripción",
  "translate.go": "Traducir — {price}",
  "translate.englishIsFree":
    "El inglés es gratis: vuelve a transcribir con «traducir al inglés» en Privacidad.",
  "translate.batches": "{lines} líneas, en bloques de {size}.",
  "translate.progress": "Traduciendo {from}–{to} de {total}…",
  "translate.done": "Traducido. ",
  "translate.open": "Abrir «{title}»",
  "translate.note":
    "La traducción se guarda como una nota aparte, así que la transcripción original y sus marcas de tiempo quedan intactas. Si un bloque vuelve con el número de líneas equivocado, se rechaza en vez de aplicarse, y no se te cobra.",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "Biblioteca",
  "library.record": "Grabar",
  "library.open": "Abrir un archivo",
  "library.durable":
    "Guardado en este navegador, solo en este dispositivo. No se sincroniza nada y no hay copia en ninguna otra parte.",
  "library.memory":
    "Solo en memoria: no se está escribiendo nada en disco, así que esta lista se vacía cuando cierres la pestaña.",
  "library.searchPlaceholder": "Buscar en todo lo que has grabado",
  "library.searchPlaceholderCount": "Buscar en todo lo que has grabado ({lines} líneas)",
  "library.noMatch": "No coincidió nada.",
  "library.empty": "Todavía no hay nada. Graba una reunión o abre un archivo desde la pantalla de inicio.",
  "library.voices": "{count} voces",
  "library.oneVoice": "1 voz",
  "library.audioKept": "audio conservado",
  "library.transcriptOnly": "solo transcripción",
  "library.hasMinutes": "acta con IA",
  "library.daysLeft": "quedan {days} d",
  "library.expiring": "a punto de caducar",
  "library.deletedOn": "Se borra el {date}",
  "library.retentionHeading": "Cuánto tiempo se conserva",
  "library.retentionNote":
    "Se comprueba cada vez que abres la aplicación, no con un temporizador, así que nada sobrevive al plazo que elegiste solo porque no hayas entrado.",
  "library.retention.session": "Hasta que cierre esta pestaña",
  "library.retention.sessionHint": "No se escribe absolutamente nada en disco.",
  "library.retention.7d": "7 días",
  "library.retention.30d": "30 días",
  "library.retention.90d": "90 días",
  "library.retention.90dHint": "El valor por defecto.",
  "library.retention.forever": "Hasta que lo borre yo",
  "library.retention.foreverHint": "Nada caduca por su cuenta.",
  "library.movedToMemory": "Movido a memoria. La base de datos en disco se ha vaciado.",
  "library.retentionRemoved":
    "{count} notas superaban el nuevo límite y se han borrado.",
  "library.dataHeading": "Tus datos",
  "library.dataNote":
    "Si este dispositivo tiene la única copia, tienes que poder llevártela a otro sitio sin pedírnoslo. Para eso están estas opciones.",
  "library.exportAll": "Exportarlo todo",
  "library.importAll": "Importar una exportación",
  "library.deleteAll": "Borrarlo todo",
  "library.deleteAllConfirm":
    "¿Borrar las {count} grabaciones y sus transcripciones? Esto no se puede deshacer.",
  "library.restored": "{count} restauradas.",
  "library.exportNote":
    "La exportación es cada transcripción, resumen y registro de consentimiento en un único archivo JSON. El audio no se incluye, porque haría el archivo enorme: descarga una grabación desde su propia página.",
  "library.notAnExport": "Ese no es un archivo de exportación de OpenNoteTaker.",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "Preguntar a través de tus reuniones",
  "ask.lede": "Buscando en {notes} grabaciones — {lines} líneas, indexadas aquí en esta pestaña.",
  "ask.ledeEmpty":
    "Todavía no has grabado nada. Esto busca en toda tu biblioteca en cuanto haya algo en ella.",
  "ask.placeholder": "¿Qué decidimos sobre la migración del alojamiento?",
  "ask.found":
    "{count} momentos de tus grabaciones parecen relevantes. Encontrarlos no costó nada y ocurrió en este dispositivo.",
  "ask.andMore": "…y {count} más, todos los cuales se enviarían.",
  "ask.nothing": "Nada en tus grabaciones coincide con eso.",
  "ask.answer": "Que lo respondan — {price}",
  "ask.thinking": "Pensando…",
  "ask.sources": "De dónde salió",
  "ask.noCitations": "La respuesta no citó nada, así que compruébala con los pasajes de arriba.",
  "ask.charged": "Se cobraron {charged}. Te quedan {balance}.",
  "ask.splitHeading": "Cómo se reparte esto",
  "ask.splitBody":
    "La búsqueda es gratis y se ejecuta en este dispositivo, sobre un índice construido con tus propias transcripciones. Lo único que cuesta es la respuesta, y solo se envían los pasajes que ves arriba: nunca tus grabaciones, y nunca el resto de tu biblioteca.",
  "ask.splitNote":
    "El precio no crece con el tamaño de tu biblioteca: el número de pasajes enviados tiene un tope, así que una pregunta cuesta más o menos lo mismo en tu reunión quinientos que en la quinta.",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "Qué sale de este dispositivo",
  "privacy.lede":
    "Cuatro servidores, y esta aplicación solo puede contactarlos por los motivos de abajo. Abre el panel de red de tu navegador y compruébalo.",
  "privacy.tableHeading": "Todas las peticiones que esta aplicación puede hacer",
  "privacy.host": "Servidor",
  "privacy.when": "Cuándo",
  "privacy.what": "Qué lleva dentro",
  "privacy.thisSite": "este sitio",
  "privacy.hfWhen":
    "La primera vez que transcribes con un modelo dado, y nunca más: el navegador lo guarda en caché.",
  "privacy.hfWhat": "Nada tuyo. Es una descarga: los pesos del modelo vienen hacia ti.",
  "privacy.siteWhen": "Al cargar la página, y para el entorno ONNX que el modelo necesita.",
  "privacy.siteWhat":
    "Nada tuyo. Se sirve desde aquí a propósito, para que ese entorno no sea un segundo tercero silencioso.",
  "privacy.authWhen":
    "Cuando abres la página de Cuenta —pregunta qué métodos de inicio de sesión existen— y después, mientras tengas la sesión iniciada, para leer tu saldo.",
  "privacy.authWhat": "Tu método de inicio de sesión y tu saldo. Transcripciones, nunca.",
  "privacy.gatewayWhen": "Solo cuando pulsas un botón que muestra un precio.",
  "privacy.gatewayWhat":
    "El texto de la transcripción o de los pasajes que ese botón nombra, y nada más. Audio, nunca.",
  "privacy.noTrackers":
    "En esta página no hay script de analítica, ni gestor de etiquetas, ni informador de errores, ni CDN de fuentes. Se puede comprobar viendo el código fuente, y por eso vale la pena decirlo.",
  "privacy.testedClaim":
    "Grabar, transcribir, distinguir voces, buscar, resumir en este dispositivo y todas las exportaciones no hacen ninguna petición. La propia prueba de la compilación lo verifica: recorre cada una de esas pantallas y falla si la página contacta con algo.",
  "privacy.audioHeading": "El audio no va a ninguna parte",
  "privacy.audioBody":
    "Ni como subida, ni como muestra, ni para mejorar un modelo. Las rutas de pago llevan texto: la transcripción que ya tienes y puedes leer. Eso es una propiedad de lo que lleva la petición, no una política que pudiéramos cambiar en silencio: el cuerpo de la petición está en pantalla antes de enviarla, en «exactamente lo que se enviaría».",
  "privacy.audioNote":
    "La grabación la descodifica y transcribe WebAssembly ejecutándose en esta pestaña, en tu procesador o tu GPU.",
  "privacy.storedHeading": "Qué se guarda, y dónde",
  "privacy.storedBody":
    "{count} grabaciones en el almacenamiento propio de este navegador, en este dispositivo. Alrededor de {size}. No hay copia en ningún servidor y no se sincroniza nada.",
  "privacy.storedNothing":
    "No se está escribiendo nada en disco: la biblioteca está en memoria y desaparece al cerrar la pestaña.",
  "privacy.changeRetention": "Cambiar cuánto tiempo se conserva",
  "privacy.redactHeading": "Antes de enviar nada",
  "privacy.redactLabel": "Quitar primero los secretos evidentes",
  "privacy.redactHint":
    "Sustituye {kinds} por un marcador antes de construir una petición de pago.",
  "privacy.redactNote":
    "Esto detecta patrones bien formados. No detectará un número de tarjeta dictado en palabras, y no es un control de cumplimiento: es un valor por defecto sensato para el único momento en que un texto sale de este equipo. De tu propia copia no se oculta nada.",
  "privacy.recordingHeading": "Cómo se hacen las grabaciones",
  "privacy.keepAudio": "Conservar el audio además de la transcripción",
  "privacy.keepAudioHint":
    "Desactivado por defecto. La transcripción es para lo que sirve la aplicación; el audio es la parte grande y delicada que rara vez vuelves a abrir. Conservarlo es lo que te permite reproducirlo y volver a calcular quién habla.",
  "privacy.diarize": "Averiguar quién está hablando",
  "privacy.diarizeHint": "Se ejecuta aquí, añade unos segundos y no necesita descargar ningún modelo.",
  "privacy.modelHeading": "El modelo de voz",
  "privacy.modelNote":
    "Se descarga de Hugging Face una vez y tu navegador lo guarda en caché. Después, la transcripción funciona sin red alguna.",
  "privacy.languageHeading": "El idioma de la grabación",
  "language.none": "Sin segundo idioma",
  "common.listJoin": " y ",
  "privacy.secondLanguageHint":
    "Se escuchan ambos idiomas, y cada tramo se transcribe en el que se está hablando de verdad. Nombrarlos evita que la detección se desvíe hacia un tercero.",
  "run.listeningForLanguage": "Escuchando para saber el idioma",
  "run.rereading": "Releyendo {seconds} s — el reconocedor se los saltó",
  "privacy.languageHint":
    "Whisper maneja 99. Déjalo en detección automática salvo que siga acertando mal.",
  "privacy.translateToEnglish": "Traducir al inglés mientras transcribe",
  "privacy.translateHint":
    "Es la propia traducción de Whisper, así que se ejecuta aquí y no cuesta nada. Para cualquier otro idioma de destino, usa «Traducir esta transcripción» en una nota, que es de pago.",
  "privacy.selfHostHeading": "Ejecutarlo tú mismo",
  "privacy.selfHostBody":
    "Esta aplicación son archivos estáticos y un módulo WebAssembly, sin backend. Sírvela desde una máquina que controles, o abre directamente desde el disco una versión descargada: las funciones gratuitas funcionan igual, y las de pago simplemente no aparecen salvo que las apuntes a una pasarela.",
  "privacy.selfHostNote":
    "Ninguno de los once productos que comparamos ofrece esta combinación. Los que procesan en local te obligan a instalar una aplicación; los que se abren en el navegador suben tu audio.",
  "privacy.interfaceHeading": "El idioma de la interfaz",
  "privacy.interfaceHint":
    "Cambia las palabras de la propia aplicación y los encabezados de los documentos exportados. No afecta a la transcripción, que sigue a la grabación.",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "Cuenta",
  "account.lede":
    "La necesitas para exactamente tres cosas: actas escritas por IA, preguntas a través de tus reuniones y traducir una transcripción terminada a un idioma que no sea el inglés. Todo lo demás funciona sin iniciar sesión, para siempre.",
  "account.signInHeading": "Iniciar sesión en OpenNoteTaker",
  "account.signInBody":
    "Una cuenta para todas nuestras aplicaciones. Aquí casi nada la necesita — grabar, transcribir, separar voces, buscar y exportar funcionan sin iniciar sesión.",
  "account.creditsHeading": "Créditos",
  "account.creditsNote":
    "{packCredits} créditos cuestan {packPrice} — {each} cada uno. No caducan, no se renuevan y no hay suscripción que cancelar porque no hay suscripción.",
  "account.costHeading": "Cuánto cuesta cada cosa",
  "account.job": "Trabajo",
  "account.typical": "Precio habitual",
  "account.cost30": "Acta con IA de una reunión de 30 minutos",
  "account.cost60": "Acta con IA de una reunión de 60 minutos",
  "account.costAsk": "Una pregunta a toda tu biblioteca",
  "account.costNote":
    "Estimaciones para una reunión típica. El precio exacto de tu transcripción real está en el botón, antes de que lo pulses, calculado por el mismo código que hace el cobro, así que los dos no pueden discrepar.",
  "account.historyHeading": "En qué se fueron tus créditos",
  "account.notHeading": "Lo que una cuenta no hace",
  "account.notBody":
    "No desbloquea la transcripción, la separación de voces, las exportaciones, la búsqueda ni el resumen hecho en tu dispositivo: eso se ejecuta en tu hardware y a nosotros no nos cuesta nada, así que cobrarlo sería cobrar por el inicio de sesión. Tampoco guarda tus grabaciones, tus transcripciones ni tus títulos: la cuenta tiene un método de acceso y un saldo.",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "Inicia sesión para usar las funciones de IA. Todo lo demás funciona sin cuenta.",
  "error.signIn": "Iniciar sesión",
  "error.insufficient": "Esto necesita {need} créditos y tienes {have}.",
  "error.topUp": "Recargar — {price} compra {credits}",
  "error.notConfigured":
    "Los resúmenes con IA no están disponibles ahora mismo. El resumen hecho en tu dispositivo sigue funcionando.",
  "error.miscount":
    "La traducción volvió con un número de líneas equivocado, así que se rechazó en vez de arriesgarse a descuadrar tu transcripción. No se te cobró, así que inténtalo otra vez.",
  "error.emptyReply": "El modelo no devolvió nada aprovechable. No se te cobró, así que inténtalo otra vez.",
  "error.unreachable": "No se pudo contactar con el servicio de IA. No se te cobró.",
  "error.tooLarge": "Esa petición era demasiado grande. Resume un fragmento más corto.",
  "error.status": "El servicio de IA devolvió {status}.",
  "error.micDenied":
    "Se denegó el permiso. Permite el acceso al micrófono para este sitio en la barra de direcciones del navegador y vuelve a intentarlo.",
  "error.micMissing": "No se encontró ningún micrófono. Conecta uno, o graba el audio de una pestaña.",
  "error.micBusy": "Otra aplicación está usando el micrófono. Ciérrala y vuelve a intentarlo.",
  "error.alreadyRecording": "Ya está grabando.",
  "error.notRecording": "No está grabando.",
  "error.nothingRecorded": "No se pudo grabar nada. Comprueba los permisos del navegador.",
  "error.noTabAudio":
    "Este navegador no comparte el audio de una pestaña con una página. Se grabará solo el micrófono, que aun así capta una llamada por altavoz.",
  "error.tabAudioUnticked":
    "No se compartió audio de la pestaña: la casilla «compartir audio de la pestaña» no estaba marcada. Se grabará solo el micrófono.",
  "error.tabAudioDeclined": "No se compartió el audio de la pestaña. Se grabará solo el micrófono.",
  "error.handoffExpired":
    "El atajo desde la pestaña de la reunión ha caducado. Elige la pestaña de la reunión en el diálogo de compartir y marca «compartir audio de la pestaña».",
  "error.inputGone":
    "Esa entrada ya no está disponible. Elige otra, o graba la predeterminada del sistema.",
  "error.recorderStopped": "La grabación se detuvo de forma inesperada.",
  "error.undecodable":
    "No se pudo descodificar el audio de este archivo. Prueba con MP3, WAV, M4A, WebM o MP4.",
  "error.noAudioInFile": "Este archivo no tiene audio.",
  "error.noSpeech":
    "No se reconoció ninguna voz. Si la grabación no está en silencio, prueba con un modelo más grande.",
  "error.unsupported": "Este navegador no admite Web Audio.",
  "error.emptyRange": "Ese intervalo está vacío.",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} créditos",
  "common.credit": "1 crédito",
  "language.detect": "Detectar automáticamente",
  "model.tiny": "El más rápido. Vale para una sola voz clara.",
  "model.base": "Un buen punto de partida para una reunión. 99 idiomas.",
  "model.small": "Bastante mejor con acentos y con gente hablando a la vez.",
  "model.turbo": "El más preciso de estos. Necesita WebGPU y paciencia en la primera carga.",
  "error.libraryOpen": "No se pudo abrir la biblioteca.",
  "error.libraryBlocked": "La biblioteca está abierta en otra pestaña.",
  "error.libraryWrite": "La biblioteca rechazó una escritura.",
  "library.exportFileNote": "El audio no se incluye; exporta una grabación desde su propia página.",
  "format.srt": "Subtítulos SubRip (.srt)",
  "format.vtt": "Subtítulos WebVTT (.vtt)",
  "format.text": "Texto simple (.txt)",
  "format.text_timestamped": "Texto con marcas de tiempo (.txt)",
  "format.markdown": "Notas en Markdown (.md)",
  "format.json": "JSON (.json)",
  "format.csv": "Hoja de cálculo (.csv)",
  "format.html": "Página web (.html)",
  "common.importedTitle": "Grabación importada",
};

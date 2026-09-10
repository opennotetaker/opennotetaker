// Deutsch.
//
// Conventions this follows:
//
// - **Sie-Form throughout.** Both Windows and macOS use it in system UI, and
//   this product asks people to record their colleagues — du would be an odd
//   register for a screen about consent.
// - **Controls are nouns or infinitives**, not sentences: Aufnahme starten,
//   Abbrechen, Herunterladen. The imperative appears only where the app is
//   genuinely instructing ("Lesen Sie das vor").
// - **Compounds are written closed**, as German does: Spracherkennungsmodell,
//   Einverständniserklärung, Aufbewahrungsdauer. Hyphenating them to keep
//   lines short is the tell of a translation.
// - Kept in English because they are the interface's own words elsewhere:
//   Tab, Browser, Markdown, JSON, CSV, HTML.

import type { Catalogue } from "../lib/i18n";

export const de: Catalogue = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "Start",
  "nav.library": "Bibliothek",
  "nav.ask": "Fragen",
  "nav.privacy": "Datenschutz",
  "nav.account": "Konto",
  "nav.language": "Sprache",
  "shell.starting": "Wird gestartet…",
  "shell.recording": "Nimmt auf",
  "shell.paused": "Pausiert",
  "shell.goToRecorder": "Zur Aufnahme",
  "shell.footerTagline": "OpenNoteTaker — Transkription, die auf Ihrem Gerät bleibt.",
  "shell.footerPrivacy": "Was dieses Gerät verlässt",
  "shell.footerSource": "Quelltext (MIT / Apache-2.0)",
  "shell.startAgain": "Neu beginnen",
  "shell.somethingWrong": "Etwas ist schiefgelaufen.",
  "shell.noticeStorage":
    "Dieser Browser lässt die Seite nichts speichern, deshalb bleibt nach dem Schließen des Tabs nichts erhalten. Alles andere funktioniert.",
  "shell.noticeExpired":
    "{count} Notizen haben die von Ihnen gesetzte Aufbewahrungsdauer überschritten und wurden gelöscht.",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "Niemand tritt Ihrem Gespräch bei. Nichts verlässt Ihr Gerät.",
  "home.lede":
    "OpenNoteTaker nimmt auf, transkribiert und trennt Sprecher — alles in diesem Browser-Tab. Die Aufnahme wird nie hochgeladen, in der Teilnehmerliste erscheint kein Bot, und es gibt kein Abo zu kündigen.",
  "home.record": "Besprechung aufnehmen",
  "home.open": "Aufnahme öffnen",
  "home.readyGpu":
    "Auf diesem Gerät einsatzbereit — mit Ihrer GPU. Das Modell {model} ({size}) wird einmalig geladen, beim ersten Transkribieren.",
  "home.readyWasm":
    "Auf diesem Gerät einsatzbereit — mit WebAssembly. Das Modell {model} ({size}) wird einmalig geladen, beim ersten Transkribieren.",
  "home.claim1.title": "Die Aufnahme bleibt hier",
  "home.claim1.body":
    "Die Spracherkennung läuft in diesem Tab, auf Ihrem Prozessor oder Ihrer GPU. Heruntergeladen wird nur das Modell selbst, ein einziges Mal. Für die kostenlosen Funktionen wird überhaupt nichts irgendwohin gesendet.",
  "home.claim1.link": "Was dieses Gerät verlässt",
  "home.claim2.title": "Sie werden ans Fragen erinnert",
  "home.claim2.body":
    "Die Aufnahme beginnt erst nach einer einstufigen Einverständnisprüfung — mit einem Satz, den Sie vorlesen können. Was vereinbart wurde, wird zusammen mit der Aufnahme gespeichert und in jedem Export ausgegeben, damit es auch in sechs Wochen noch belastbar ist.",
  "home.claim3.title": "Kein Abo, keine Überraschung",
  "home.claim3.body":
    "Transkription, Zeitstempel, Sprechertrennung, Zusammenfassungen des Gesagten und sämtliche Exportformate sind kostenlos und bleiben es — sie kosten uns nichts. Was eine KI schreibt, kostet Guthaben, und Sie sehen den genauen Preis, bevor Sie klicken.",
  "home.claim3.link": "Preise ansehen",
  "home.table.heading": "Was es kann",
  "home.table.feature": "Funktion",
  "home.table.where": "Läuft wo",
  "home.table.price": "Preis",
  "home.table.inTab": "In diesem Tab",
  "home.table.ourServer": "Unser Server, unser Modellschlüssel",
  "home.table.split": "Suche hier, Antwort auf unserem Server",
  "home.table.free": "Kostenlos",
  "home.table.credits": "Guthaben",
  "home.feature.transcribe": "Transkription, 99 Sprachen",
  "home.feature.timeline": "Ein Zeitstempel an jedem Satz",
  "home.feature.speakers": "Sprecher auseinanderhalten",
  "home.feature.record": "Aufnehmen ohne Bot",
  "home.feature.export": "Untertitel, Text, Markdown, JSON, CSV, HTML",
  "home.feature.summary": "Themen, Kernaussagen, Aufgaben, Entscheidungen",
  "home.feature.search": "Alles Aufgenommene durchsuchen",
  "home.feature.translateFree": "Beim Transkribieren übersetzen (ins Englische)",
  "home.feature.minutes": "KI-geschriebenes Protokoll und Aufgaben",
  "home.feature.ask": "Fragen über alle Besprechungen hinweg",
  "home.feature.translatePaid": "Fertiges Transkript in jede Sprache übersetzen",
  "home.table.note":
    "Diese Trennlinie ist keine als Technik verkleidete Geschäftsentscheidung: Alles darüber läuft auf Ihrer Hardware und kostet uns nichts — dafür Geld zu nehmen hieße, für das Konto Geld zu nehmen. Alles darunter ist eine Rechnung, die wir einem Modellanbieter bezahlen.",
  "home.selfhost.title": "Läuft auch auf Ihrem eigenen Server",
  "home.selfhost.body":
    "Die ganze Anwendung besteht aus statischen Dateien und einem WebAssembly-Modul. Laden Sie ein Release herunter und öffnen Sie es, oder liefern Sie es von einem Rechner aus, den Sie kontrollieren — sobald das Modell zwischengespeichert ist, funktionieren die kostenlosen Funktionen ganz ohne Netz.",
  "home.selfhost.note":
    "Siehe docs/self-hosting.md im Repository. Das ist das eine, was keines der elf verglichenen Produkte bietet: Die lokal arbeitenden verlangen alle eine Installation, und die im Browser laufenden laden alle Ihre Aufnahme hoch.",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "Diese Aufnahme bleibt auf diesem Gerät. Sie wird hier im Browser transkribiert und nirgendwohin hochgeladen. Alle, die zu hören sind, wurden darüber informiert, dass aufgenommen wird.",
  "consent.script":
    "Bevor wir anfangen — ich nehme das auf und mache damit meine Notizen. Die Aufnahme bleibt auf meinem Rechner. Ist das für alle in Ordnung?",
  "consent.method.announced": "Ich habe es laut gesagt",
  "consent.method.announcedHint": "Der Normalfall. Lesen Sie den Satz oben vor, wenn es hilft.",
  "consent.method.written": "Es ist schriftlich vereinbart",
  "consent.method.writtenHint": "Eine Kalendernotiz, eine Nachricht, eine Regelung, die alle kennen.",
  "consent.method.solo": "Ich bin allein",
  "consent.method.soloHint": "Eine Sprachnotiz, eine Probe, ein Gespräch ohne andere.",
  "consent.record.at": "Aufgenommen am {at}.",
  "consent.record.solo": "Es war niemand sonst anwesend.",
  "consent.record.method": "Einverständnis: {method}.",
  "consent.record.present": "Anwesend: {names}.",
  "consent.record.captured": "Aufgenommen: {sources}.",
  "consent.record.told": "Allen Anwesenden wurde gesagt: „{disclosure}“",
  "record.title": "Bevor Sie aufnehmen",
  "record.lede": "Ein Bildschirm, einmal. Genau diesen Teil lassen die meisten Werkzeuge weg.",
  "record.scriptHeading": "Lesen Sie das vor, wenn es hilft",
  "record.scriptNote":
    "Das Schwierige am Fragen ist nicht die Zustimmung — es ist, die Worte zu finden, während acht Leute warten.",
  "record.whoHeading": "Wer ist an diesem Gespräch beteiligt?",
  "record.whoHint":
    "Freiwillig und nur hier gespeichert. Es geht in den Nachweis und in die exportierten Notizen ein.",
  "record.whoPlaceholder": "Ana, Priya und zwei Personen vom Kunden",
  "record.afterHeading": "Danach",
  "record.keepAudio": "Die Aufnahme behalten, nicht nur das Transkript",
  "record.keepAudioHint":
    "Nur in diesem Browser gespeichert und zusammen mit der Notiz gelöscht. Es ist die größere und heiklere Hälfte — deshalb ist es aus, solange Sie es nicht verlangen.",
  "record.keepAudioWarning":
    "Die Aufnahme wird verworfen, sobald Sie die Notiz schließen. Wenn das Transkript falsch herauskommt — eine unerwartete Sprache, zwei Personen zu einer verschmolzen — bleibt nichts übrig, womit man es noch einmal versuchen könnte.",
  "record.sourcesHeading": "Was soll aufgenommen werden?",
  "record.source.mic": "Ihr Mikrofon",
  "record.source.micHint": "Sie und alle, die mit Ihnen im Raum sind.",
  "record.source.tab": "Der Ton eines Tabs oder Fensters",
  "record.source.tabHint":
    "Alle in einer Videokonferenz. Sie werden gefragt, welcher Tab — und müssen „Tab-Audio teilen“ ankreuzen.",
  "record.source.tabUnsupported":
    "Dieser Browser gibt den Ton eines Tabs nicht an eine Seite weiter. Chrome oder Edge können es.",
  "record.micOnlyOnACall":
    "Nur das Mikrofon aufzunehmen genügt für eine Besprechung im Raum. Bei einem Anruf nicht: Der Browser entfernt, was aus Ihren Lautsprechern kommt — die anderen werden also nicht bloß leise, sondern ausgelöscht. Kreuzen Sie den Tab mit an oder nehmen Sie einen Loopback-Eingang auf.",
  "record.inputs.heading": "Welcher Eingang",
  "record.inputs.add": "Mikrofon hinzufügen",
  "record.inputs.switched": "Nimmt jetzt von {input} auf.",
  "record.inputs.liveHint":
    "Die Änderung wirkt sofort und hinterlässt keine Lücke in der Aufnahme — die Datei läuft als ein Stück weiter.",
  "record.inputs.reveal": "Eingang auswählen",
  "record.inputs.label": "Eingang",
  "record.inputs.default": "Systemstandard",
  "record.inputs.none": "Dieser Browser nennt Ihre Eingänge nicht. Der Standardeingang nimmt trotzdem auf.",
  "record.inputs.clean": "Den Klang aufbereiten",
  "record.inputs.cleanHint":
    "Echounterdrückung, Rauschunterdrückung und automatische Aussteuerung. Richtig für ein Mikrofon im Raum; für ein Loopback-Gerät oder ein Mischpult ausschalten — dort gibt es nichts zu unterdrücken, und es beschädigt hörbar, was es bekommt.",
  "record.source.handedTab": "Der {platform}-Tab",
  "record.source.handedTabHint":
    "Von der Erkennung übergeben, deshalb gibt es keinen Tab auszuwählen und kein Kästchen anzukreuzen.",
  "record.detectorOn":
    "Die Besprechungserkennung ist installiert, deshalb öffnet sich dieser Bildschirm von selbst, sobald Sie einem Gespräch beitreten.",
  "record.handoffHeading": "Aus Ihrem {platform}-Gespräch geöffnet",
  "record.handoffDirect":
    "Der Ton dieses Tabs ist bereits ausgewählt. Bis Sie auf Start drücken, wird nichts aufgenommen — und danach verlässt nichts diesen Browser.",
  "record.handoffPicker":
    "Die Abkürzung zu diesem Tab ist abgelaufen, deshalb werden Sie gefragt, welchen Tab Sie teilen möchten. Kreuzen Sie „Tab-Audio teilen“ an.",
  "record.agreeHeading": "Womit Sie sich einverstanden erklären",
  "record.agreeNote":
    "Wortwörtlich zusammen mit dieser Aufnahme gespeichert — eine spätere Änderung dieses Textes kann also nicht umschreiben, wozu Sie jetzt Ihr Einverständnis geben.",
  "record.pickOne": "Wählen Sie mindestens eine Quelle zum Aufnehmen.",
  "record.start": "Aufnahme starten",
  "record.cancel": "Abbrechen",
  "record.capturing": "Nimmt {sources} auf",
  "record.mic": "Ihr Mikrofon",
  "record.tab": "einen geteilten Tab",
  "record.pause": "Pause",
  "record.resume": "Fortsetzen",
  "record.finish": "Beenden und transkribieren",
  "record.levelHint":
    "Wenn sich dieser Balken nie bewegt, wird nichts gehört — prüfen Sie das Mikrofon, bevor Sie am Ende der Besprechung angekommen sind.",
  "record.nameLabel": "Jetzt benennen oder später",
  "record.namePlaceholder": "Worum geht es in dieser Besprechung?",
  "record.nameNote":
    "Nichts hat diesen Rechner verlassen, und nichts wird es. Die Transkription beginnt, wenn Sie beenden, und läuft hier.",
  "record.discard": "Aufnahme verwerfen",
  "record.discardConfirm": "Diese Aufnahme verwerfen? Sie lässt sich nicht wiederherstellen.",
  "record.defaultTitle": "Aufnahme, {when}",
  "record.tabEnded":
    "Der geteilte Tab wurde beendet. Beenden Sie jetzt, um das bisher Aufgenommene zu behalten.",
  "record.consentHeading": "Einverständnisnachweis",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "Wird vorbereitet…",
  "run.reading": "Datei wird gelesen",
  "run.decoding": "Audio wird dekodiert",
  "run.ready": "Bereit",
  "run.loadingModel": "Spracherkennungsmodell wird geladen",
  "run.downloadingModel": "Spracherkennungsmodell wird heruntergeladen ({percent} %)",
  "run.listeningShort": "Hört sich weniger als eine Minute Audio an",
  "run.listening": "Hört sich {minutes} Minuten Audio an",
  "run.diarizing": "Ermittelt, wer was gesagt hat",
  "run.summarising": "Sucht Themen und Aufgaben heraus",
  "run.modelNote":
    "Das Spracherkennungsmodell wird einmal heruntergeladen und danach vom Browser zwischengespeichert. Es wird nichts hochgeladen.",
  "run.localNote":
    "Das läuft auf Ihrem eigenen Rechner. Diesen Tab im Hintergrund zu lassen bremst es; ihn zu schließen bricht es ab.",
  "run.failedTitle": "Das hat nicht geklappt",
  "run.failedNote":
    "Es wurde nichts hochgeladen und nichts gespeichert. Wenn die Aufnahme nicht stumm ist, hilft oft ein größeres Modell unter Datenschutz.",
  "run.back": "Zurück zum Anfang",
  "run.cancel": "Abbrechen",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "Diese Aufnahme ist nicht hier",
  "note.missingBody":
    "Vielleicht hat sie die von Ihnen gesetzte Aufbewahrungsdauer überschritten oder wurde auf einem anderen Gerät geöffnet — es wird nichts irgendwohin synchronisiert.",
  "note.backToLibrary": "Zurück zur Bibliothek",
  "note.titleLabel": "Titel",
  "note.metaDetected": "{language} erkannt",
  "note.metaLines": "{count} Zeilen",
  "note.metaRecorded": "hier aufgenommen",
  "note.metaImported": "importiert",
  "note.noAudio":
    "Die Aufnahme selbst wurde nicht behalten — nur dieses Transkript. Schalten Sie unter Datenschutz „Audio behalten“ ein, wenn Sie es wieder abspielen können möchten.",
  "note.whoHeading": "Wer spricht",
  "note.speakerAuto": "Selbst ermitteln",
  "note.speakerCount": "{count} Personen",
  "note.speakerOne": "1 Person",
  "note.rediarize": "Sprecher erneut ermitteln",
  "note.rediarizeNoAudio":
    "Die Aufnahme wurde nicht behalten, deshalb lassen sich die Sprecher nicht erneut ermitteln.",
  "note.rediarizeRunning": "Hört noch einmal zu…",
  "note.rediarizeDone": "{count} Stimmen",
  "note.rediarizeUnassigned": ", {count} Zeilen sind zu kurz zum Unterscheiden",
  "note.speakerNote":
    "Sprecher werden hier auf diesem Gerät am Klang der jeweiligen Stimme unterschieden. Bei zwei oder drei Personen mit deutlich verschiedenen Stimmen klappt das gut; bei ähnlichen Stimmen, Durcheinanderreden und einer Person, die das Mikrofon wechselt, tut es sich schwer. Wenn mehr Personen gefunden werden, als im Raum waren — oder weniger — geben Sie die Anzahl oben an und lassen Sie es erneut ermitteln. Klicken Sie im Transkript auf einen Namen, um eine einzelne Zeile jemand anderem zuzuordnen.",
  "note.transcriptHeading": "Transkript",
  "note.findPlaceholder": "In diesem Transkript suchen",
  "note.playFromHere": "Ab hier abspielen",
  "note.reassign": "Diese Zeile jemand anderem zuordnen",
  "note.split": "Teilen",
  "note.splitHint": "Teilt diese Zeile in der Mitte in zwei",
  "note.speakerNameFor": "Name für {name}",
  "note.recordingHeading": "Diese Aufnahme",
  "note.downloadAudio": "Audio herunterladen",
  "note.transcribeAgain": "Erneut transkribieren",
  "note.transcribeAgainConfirm":
    "Diese Aufnahme erneut transkribieren? Das aktuelle Transkript, die Sprecherzuordnungen und alle Änderungen daran werden ersetzt. Die Aufnahme bleibt erhalten.",
  "note.deleteAudio": "Audio löschen, Transkript behalten",
  "note.deleteAudioConfirm":
    "Das Audio löschen und das Transkript behalten? Das lässt sich nicht rückgängig machen.",
  "note.deleteAll": "Alles löschen",
  "note.deleteAllConfirm": "„{title}“ vollständig löschen? Das lässt sich nicht rückgängig machen.",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "Aus dem Gesagten",
  "summary.freeBadge": "Auf diesem Gerät erstellt · kostenlos",
  "summary.redo": "Neu",
  "summary.empty": "Nichts stach heraus — das Transkript ist womöglich zu kurz, um Themen darin zu finden.",
  "summary.stats": "{sentences} Sätze · etwa {minutes} Min. · {speakers} Sprecher",
  "summary.topics": "Themen: ",
  "summary.keyPoints": "Kernaussagen",
  "summary.decisions": "Entscheidungen",
  "summary.actionItems": "Aufgaben",
  "summary.questionsAsked": "Gestellte Fragen",
  "summary.questionsOpen": "Offene Fragen",
  "summary.whoTalked": "Wer gesprochen hat",
  "summary.freeNote":
    "Jede Zeile oben ist wörtlich aus dem Transkript zitiert, mit dem Zeitpunkt des Gesagten. Nichts davon wurde von einem Modell geschrieben, und nichts davon hat dieses Gerät verlassen.",
  "summary.cueLanguages":
    "Aufgaben, Entscheidungen und Fristen werden in {languages} erkannt. Themen und Kernaussagen funktionieren in jeder Sprache.",
  "summary.paidHeading": "Von einer KI geschrieben",
  "summary.paidBought": "Bezahlt · bereits gekauft",
  "summary.paidBody":
    "Ein Modell liest das Transkript und schreibt ein Protokoll: worum es ging, was entschieden wurde, wer was bis wann schuldet. Anders als im Feld darüber sind das neue Sätze statt Zitate — jeweils mit einem Zeitstempel, damit Sie sie nachprüfen können.",
  "summary.steer": "Optionaler Hinweis",
  "summary.steerPlaceholder": "Etwas Bestimmtes? z. B. „auf die Wünsche des Kunden konzentrieren“",
  "summary.write": "Protokoll schreiben — {price}",
  "summary.writing": "Protokoll wird geschrieben…",
  "summary.discard": "Verwerfen und neu schreiben",
  "summary.signInFirst": "Erst anmelden",
  "summary.balance": "Sie haben {credits}",
  "summary.revealOne": "Genau das, was gesendet würde — eine Anfrage, nur Text, kein Audio",
  "summary.revealMany": "Genau das, was gesendet würde — {count} Anfragen, nur Text, kein Audio",
  "summary.redactNone":
    "Es wurde nichts gefunden, das nach E-Mail-Adresse, Telefonnummer, langer Zahl oder Link aussieht — das geht also so hinaus.",
  "summary.redactSome":
    "{items} werden vor dem Senden ersetzt. Unter Datenschutz abschaltbar.",
  "summary.redactOff":
    "Das Schwärzen vor dem Senden ist unter Datenschutz abgeschaltet, das geht also so hinaus.",
  "summary.moreChars": "… und {count} weitere Zeichen",
  "summary.paidNote":
    "Einmal berechnet, wenn es klappt. Nichts Wiederkehrendes, nichts zu kündigen, und eine fehlgeschlagene Anfrage kostet nichts.",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "Export",
  "export.download": "Herunterladen",
  "export.copy": "Kopieren",
  "export.withSpeakers": "Wer was gesagt hat, mit aufnehmen",
  "export.withSummary": "Zusammenfassung mit aufnehmen",
  "export.withConsent": "Einverständnisnachweis mit aufnehmen",
  "export.note":
    "Jedes Format, kostenlos, für immer. Es ist Textformatierung über Daten, die ohnehin schon in diesem Tab liegen — hier gibt es also nichts, dessen Herausgabe uns etwas kostet.",
  "export.clip": "Ausschnitt herausschneiden",
  "export.clipFrom": "Von",
  "export.clipTo": "bis",
  "export.clipWords": "Der Text",
  "export.clipSound": "Der Ton",
  "export.clipBadRange": "Das Ende muss nach dem Anfang liegen.",
  "export.clipCutting": "Wird geschnitten…",
  "export.clipDone": "Fertig.",
  "export.clipNote": "Beides wird hier auf diesem Gerät geschnitten. Für einen Ausschnitt wird nichts hochgeladen.",
  "export.excerptTitle": "{title} (Ausschnitt)",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "Zusammenfassung",
  "export.label.keyPoints": "Kernaussagen",
  "export.label.decisions": "Entscheidungen",
  "export.label.actionItems": "Aufgaben",
  "export.label.questionsAsked": "Gestellte Fragen",
  "export.label.questionsOpen": "Offene Fragen",
  "export.label.topics": "Themen",
  "export.label.whoSpoke": "Wer gesprochen hat",
  "export.label.transcript": "Transkript",
  "export.label.consent": "Einverständnis zur Aufnahme",
  "export.label.unknown": "Unbekannt",
  "export.label.due": "fällig",
  "export.label.stats": "{sentences} Sätze · etwa {minutes} Min. · {speakers} Sprecher",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "Dieses Transkript übersetzen",
  "translate.go": "Übersetzen — {price}",
  "translate.englishIsFree":
    "Englisch ist kostenlos: Transkribieren Sie stattdessen mit „Ins Englische übersetzen“ unter Datenschutz neu.",
  "translate.batches": "{lines} Zeilen, in Blöcken zu {size}.",
  "translate.progress": "Übersetzt {from}–{to} von {total}…",
  "translate.done": "Übersetzt. ",
  "translate.open": "„{title}“ öffnen",
  "translate.note":
    "Die Übersetzung wird als eigene Notiz gespeichert, damit das ursprüngliche Transkript und seine Zeitstempel unangetastet bleiben. Kommt ein Block mit der falschen Zeilenzahl zurück, wird er verworfen statt übernommen — und Ihnen nicht berechnet.",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "Bibliothek",
  "library.record": "Aufnehmen",
  "library.open": "Datei öffnen",
  "library.durable":
    "In diesem Browser gespeichert, nur auf diesem Gerät. Es wird nichts synchronisiert, und es gibt nirgendwo sonst eine Kopie.",
  "library.memory":
    "Nur im Arbeitsspeicher — es wird nichts auf die Festplatte geschrieben, diese Liste leert sich also, wenn Sie den Tab schließen.",
  "library.searchPlaceholder": "Alles Aufgenommene durchsuchen",
  "library.searchPlaceholderCount": "Alles Aufgenommene durchsuchen ({lines} Zeilen)",
  "library.noMatch": "Nichts gefunden.",
  "library.empty": "Noch nichts da. Nehmen Sie eine Besprechung auf oder öffnen Sie über den Startbildschirm eine Datei.",
  "library.voices": "{count} Stimmen",
  "library.oneVoice": "1 Stimme",
  "library.audioKept": "Audio behalten",
  "library.transcriptOnly": "nur Transkript",
  "library.hasMinutes": "KI-Protokoll",
  "library.daysLeft": "noch {days} T.",
  "library.expiring": "läuft ab",
  "library.deletedOn": "Gelöscht am {date}",
  "library.retentionHeading": "Wie lange das aufbewahrt wird",
  "library.retentionNote":
    "Wird bei jedem Öffnen der Anwendung geprüft, nicht per Zeitgeber — nichts überdauert also die von Ihnen gewählte Frist nur deshalb, weil Sie nicht vorbeigeschaut haben.",
  "library.retention.session": "Bis ich diesen Tab schließe",
  "library.retention.sessionHint": "Es wird überhaupt nichts auf die Festplatte geschrieben.",
  "library.retention.7d": "7 Tage",
  "library.retention.30d": "30 Tage",
  "library.retention.90d": "90 Tage",
  "library.retention.90dHint": "Die Voreinstellung.",
  "library.retention.forever": "Bis ich es lösche",
  "library.retention.foreverHint": "Nichts läuft von selbst ab.",
  "library.movedToMemory": "In den Arbeitsspeicher verschoben. Die Datenbank auf der Festplatte wurde geleert.",
  "library.retentionRemoved":
    "{count} Notizen lagen über der neuen Grenze und wurden gelöscht.",
  "library.dataHeading": "Ihre Daten",
  "library.dataNote":
    "Wenn dieses Gerät die einzige Kopie hat, müssen Sie sie ohne uns zu fragen woanders hinbringen können. Genau dafür sind diese da.",
  "library.exportAll": "Alles exportieren",
  "library.importAll": "Einen Export einlesen",
  "library.deleteAll": "Alles löschen",
  "library.deleteAllConfirm":
    "Alle {count} Aufnahmen und ihre Transkripte löschen? Das lässt sich nicht rückgängig machen.",
  "library.restored": "{count} wiederhergestellt.",
  "library.exportNote":
    "Der Export enthält jedes Transkript, jede Zusammenfassung und jeden Einverständnisnachweis als eine JSON-Datei. Audio ist nicht dabei, weil die Datei sonst riesig würde — laden Sie eine Aufnahme über ihre eigene Seite herunter.",
  "library.notAnExport": "Das ist keine OpenNoteTaker-Exportdatei.",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "Über alle Besprechungen hinweg fragen",
  "ask.lede": "Durchsucht {notes} Aufnahmen — {lines} Zeilen, hier in diesem Tab indexiert.",
  "ask.ledeEmpty":
    "Noch nichts aufgenommen. Sobald etwas in Ihrer Bibliothek liegt, wird hier alles davon durchsucht.",
  "ask.placeholder": "Was haben wir zur Hosting-Migration entschieden?",
  "ask.found":
    "{count} Stellen in Ihren Aufnahmen wirken einschlägig. Sie zu finden hat nichts gekostet und ist auf diesem Gerät passiert.",
  "ask.andMore": "…und {count} weitere, die alle mitgesendet würden.",
  "ask.nothing": "In Ihren Aufnahmen passt dazu nichts.",
  "ask.answer": "Beantworten lassen — {price}",
  "ask.thinking": "Denkt nach…",
  "ask.sources": "Woher das kam",
  "ask.noCitations": "Die Antwort hat nichts zitiert — prüfen Sie sie also gegen die Stellen oben.",
  "ask.charged": "{charged} berechnet. Sie haben noch {balance}.",
  "ask.splitHeading": "Wie sich das aufteilt",
  "ask.splitBody":
    "Die Suche ist kostenlos und läuft auf diesem Gerät, über einen Index aus Ihren eigenen Transkripten. Nur die Antwort kostet etwas, und gesendet werden ausschließlich die oben gezeigten Stellen — nie Ihre Aufnahmen und nie der Rest Ihrer Bibliothek.",
  "ask.splitNote":
    "Der Preis wächst nicht mit Ihrer Bibliothek: Die Zahl der gesendeten Stellen ist gedeckelt, eine Frage kostet bei Ihrer fünfhundertsten Besprechung also ungefähr dasselbe wie bei Ihrer fünften.",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "Was dieses Gerät verlässt",
  "privacy.lede":
    "Vier Hosts, und diese Anwendung kann sie nur aus den unten genannten Gründen überhaupt kontaktieren. Öffnen Sie den Netzwerkbereich Ihres Browsers und prüfen Sie es.",
  "privacy.tableHeading": "Jede Anfrage, die diese Anwendung stellen kann",
  "privacy.host": "Host",
  "privacy.when": "Wann",
  "privacy.what": "Was darin steht",
  "privacy.thisSite": "diese Seite",
  "privacy.hfWhen":
    "Beim ersten Transkribieren mit einem bestimmten Modell und nie wieder — der Browser speichert es zwischen.",
  "privacy.hfWhat": "Nichts von Ihnen. Es ist ein Download: Die Modellgewichte kommen zu Ihnen.",
  "privacy.siteWhen": "Beim Laden der Seite und für die ONNX-Laufzeit, die das Modell braucht.",
  "privacy.siteWhat":
    "Nichts von Ihnen. Absichtlich von hier ausgeliefert, damit die Laufzeit nicht zu einem zweiten, stillen Dritten wird.",
  "privacy.authWhen":
    "Wenn Sie die Kontoseite öffnen — sie fragt, welche Anmeldeverfahren es gibt — und danach, solange Sie angemeldet sind, um Ihr Guthaben zu lesen.",
  "privacy.authWhat": "Ihr Anmeldeverfahren und Ihr Guthaben. Niemals Transkripte.",
  "privacy.gatewayWhen": "Nur wenn Sie eine Schaltfläche drücken, auf der ein Preis steht.",
  "privacy.gatewayWhat":
    "Der Text des Transkripts oder der Stellen, die diese Schaltfläche nennt, und sonst nichts. Niemals Audio.",
  "privacy.noTrackers":
    "Auf dieser Seite gibt es kein Analyseskript, keinen Tag-Manager, keinen Fehlerberichterstatter und kein Font-CDN. Das lässt sich im Quelltext nachprüfen — deshalb lohnt es sich, es zu sagen.",
  "privacy.testedClaim":
    "Aufnehmen, Transkribieren, Sprecher unterscheiden, Suchen, das Zusammenfassen auf diesem Gerät und sämtliche Exporte stellen überhaupt keine Anfragen. Der Test des Builds prüft genau das: Er bedient jeden dieser Bildschirme und schlägt fehl, wenn die Seite irgendetwas kontaktiert.",
  "privacy.audioHeading": "Audio geht nirgendwohin",
  "privacy.audioBody":
    "Nicht als Upload, nicht als Stichprobe, nicht zur Verbesserung eines Modells. Die kostenpflichtigen Wege nehmen Text — das Transkript, das Sie ohnehin schon haben und lesen können. Das ist eine Eigenschaft dessen, was die Anfrage trägt, keine Richtlinie, die wir still ändern könnten: Der Anfragetext steht vor dem Senden unter „Genau das, was gesendet würde“ auf dem Bildschirm.",
  "privacy.audioNote":
    "Die Aufnahme wird von WebAssembly in diesem Tab dekodiert und transkribiert, auf Ihrem Prozessor oder Ihrer GPU.",
  "privacy.storedHeading": "Was gespeichert wird und wo",
  "privacy.storedBody":
    "{count} Aufnahmen im eigenen Speicher dieses Browsers, auf diesem Gerät. Ungefähr {size}. Es gibt keine serverseitige Kopie, und es wird nichts synchronisiert.",
  "privacy.storedNothing":
    "Es wird nichts auf die Festplatte geschrieben — die Bibliothek liegt im Arbeitsspeicher und verschwindet, wenn Sie den Tab schließen.",
  "privacy.changeRetention": "Aufbewahrungsdauer ändern",
  "privacy.redactHeading": "Bevor irgendetwas gesendet wird",
  "privacy.redactLabel": "Offensichtliche Geheimnisse vorher herausnehmen",
  "privacy.redactHint":
    "Ersetzt {kinds} durch einen Platzhalter, bevor eine kostenpflichtige Anfrage gebaut wird.",
  "privacy.redactNote":
    "Das erwischt wohlgeformte Muster. Eine ausgesprochene Kartennummer erwischt es nicht, und es ist keine Compliance-Maßnahme — es ist eine vernünftige Voreinstellung für den einen Moment, in dem Text diesen Rechner verlässt. Aus Ihrer eigenen Kopie wird nichts geschwärzt.",
  "privacy.recordingHeading": "Wie Aufnahmen entstehen",
  "privacy.keepAudio": "Das Audio zusätzlich zum Transkript behalten",
  "privacy.keepAudioHint":
    "Standardmäßig aus. Das Transkript ist der Zweck dieser Anwendung; das Audio ist der große, heikle Teil, den Sie selten wieder öffnen. Es zu behalten ist das, was Abspielen und ein erneutes Ermitteln der Sprecher möglich macht.",
  "privacy.diarize": "Ermitteln, wer spricht",
  "privacy.diarizeHint": "Läuft hier, dauert ein paar Sekunden länger und braucht keinen Modell-Download.",
  "privacy.modelHeading": "Das Spracherkennungsmodell",
  "privacy.modelNote":
    "Einmal von Hugging Face heruntergeladen und von Ihrem Browser zwischengespeichert. Danach funktioniert die Transkription ganz ohne Netz.",
  "privacy.languageHeading": "Die Sprache der Aufnahme",
  "language.none": "Keine zweite Sprache",
  "common.listJoin": " und ",
  "privacy.secondLanguageHint":
    "Auf beide Sprachen wird gehört, und jeder Abschnitt wird in der tatsächlich gesprochenen transkribiert. Sie zu benennen verhindert, dass die Erkennung in eine dritte abdriftet.",
  "run.listeningForLanguage": "Hört auf die Sprache",
  "run.rereading": "Liest {seconds}s noch einmal — die Erkennung hat sie übersprungen",
  "privacy.languageHint":
    "Whisper beherrscht 99. Lassen Sie es auf Erkennen, außer es rät immer wieder falsch.",
  "privacy.translateToEnglish": "Beim Transkribieren ins Englische übersetzen",
  "privacy.translateHint":
    "Whispers eigene Übersetzung — sie läuft also hier und kostet nichts. Für jede andere Zielsprache nutzen Sie „Dieses Transkript übersetzen“ an einer Notiz; das ist kostenpflichtig.",
  "privacy.selfHostHeading": "Selbst betreiben",
  "privacy.selfHostBody":
    "Diese Anwendung besteht aus statischen Dateien und einem WebAssembly-Modul, ohne Backend. Liefern Sie sie von einem Rechner aus, den Sie kontrollieren, oder öffnen Sie ein heruntergeladenes Release direkt von der Festplatte — die kostenlosen Funktionen laufen so oder so, und die kostenpflichtigen erscheinen schlicht nicht, solange Sie kein Gateway angeben.",
  "privacy.selfHostNote":
    "Keines der elf verglichenen Produkte bietet diese Kombination. Die lokal arbeitenden verlangen alle die Installation einer Anwendung; die im Browser laufenden laden alle Ihre Aufnahme hoch.",
  "privacy.interfaceHeading": "Die Sprache der Oberfläche",
  "privacy.interfaceHint":
    "Ändert die Worte dieser Anwendung selbst und die Überschriften in exportierten Dokumenten. Auf die Transkription hat es keinen Einfluss — die richtet sich nach der Aufnahme.",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "Konto",
  "account.lede":
    "Sie brauchen eins für genau drei Dinge: KI-geschriebene Protokolle, Fragen über Ihre Besprechungen hinweg und das Übersetzen eines fertigen Transkripts in eine andere Sprache als Englisch. Alles andere funktioniert abgemeldet, für immer.",
  "account.signInHeading": "Bei OpenNoteTaker anmelden",
  "account.signInBody":
    "Ein Konto für alle unsere Anwendungen. Hier braucht es fast nichts davon — Aufnehmen, Transkribieren, Sprecher, Suche und Export funktionieren abgemeldet.",
  "account.creditsHeading": "Guthaben",
  "account.creditsNote":
    "{packCredits} Guthaben kosten {packPrice} — {each} das Stück. Es verfällt nicht, es verlängert sich nicht, und es gibt kein Abo zu kündigen, weil es kein Abo gibt.",
  "account.costHeading": "Was was kostet",
  "account.job": "Vorgang",
  "account.typical": "Üblicher Preis",
  "account.cost30": "KI-Protokoll einer 30-minütigen Besprechung",
  "account.cost60": "KI-Protokoll einer 60-minütigen Besprechung",
  "account.costAsk": "Eine Frage über Ihre gesamte Bibliothek",
  "account.costNote":
    "Schätzungen für eine typische Besprechung. Der genaue Preis für Ihr tatsächliches Transkript steht auf der Schaltfläche, bevor Sie sie drücken — berechnet vom selben Code, der auch abrechnet, die beiden können also nicht auseinandergehen.",
  "account.historyHeading": "Wohin Ihr Guthaben ging",
  "account.notHeading": "Was ein Konto nicht tut",
  "account.notBody":
    "Es schaltet weder Transkription noch Sprechertrennung, Exporte, Suche oder die auf Ihrem Gerät erstellte Zusammenfassung frei — die laufen auf Ihrer Hardware und kosten uns nichts, dafür Geld zu nehmen hieße also, für die Anmeldung Geld zu nehmen. Es speichert weder Ihre Aufnahmen noch Ihre Transkripte oder Titel: Das Konto hält ein Anmeldeverfahren und einen Kontostand.",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "Melden Sie sich an, um die KI-Funktionen zu nutzen. Alles andere funktioniert ohne Konto.",
  "error.signIn": "Anmelden",
  "error.insufficient": "Dafür werden {need} Guthaben gebraucht, und Sie haben {have}.",
  "error.topUp": "Aufladen — {price} für {credits}",
  "error.notConfigured":
    "KI-Zusammenfassungen sind gerade nicht verfügbar. Die auf Ihrem Gerät erstellte Zusammenfassung funktioniert weiterhin.",
  "error.miscount":
    "Die Übersetzung kam mit der falschen Zeilenzahl zurück und wurde verworfen, statt zu riskieren, dass Ihr Transkript aus dem Takt gerät. Es wurde nichts berechnet — versuchen Sie es noch einmal.",
  "error.emptyReply": "Das Modell hat nichts Brauchbares zurückgegeben. Es wurde nichts berechnet — versuchen Sie es noch einmal.",
  "error.unreachable": "Der KI-Dienst war nicht erreichbar. Es wurde nichts berechnet.",
  "error.tooLarge": "Diese Anfrage war zu groß. Fassen Sie einen kürzeren Abschnitt zusammen.",
  "error.status": "Der KI-Dienst hat {status} zurückgegeben.",
  "error.micDenied":
    "Die Berechtigung wurde verweigert. Erlauben Sie den Mikrofonzugriff für diese Seite in der Adressleiste des Browsers und versuchen Sie es erneut.",
  "error.micMissing": "Es wurde kein Mikrofon gefunden. Schließen Sie eines an oder nehmen Sie stattdessen den Ton eines Tabs auf.",
  "error.micBusy": "Das Mikrofon wird von einer anderen Anwendung benutzt. Schließen Sie sie und versuchen Sie es erneut.",
  "error.alreadyRecording": "Nimmt bereits auf.",
  "error.notRecording": "Nimmt nicht auf.",
  "error.nothingRecorded": "Es konnte nichts aufgenommen werden. Prüfen Sie die Berechtigungen des Browsers.",
  "error.noTabAudio":
    "Dieser Browser gibt den Ton eines Tabs nicht an eine Seite weiter. Es wird nur das Mikrofon aufgenommen — was ein Gespräch über Lautsprecher trotzdem erfasst.",
  "error.tabAudioUnticked":
    "Es wurde kein Tab-Audio geteilt — das Kästchen „Tab-Audio teilen“ war nicht angekreuzt. Es wird nur das Mikrofon aufgenommen.",
  "error.tabAudioDeclined": "Tab-Audio wurde nicht geteilt. Es wird nur das Mikrofon aufgenommen.",
  "error.handoffExpired":
    "Die Abkürzung aus dem Besprechungstab ist abgelaufen. Wählen Sie den Besprechungstab im Freigabedialog und kreuzen Sie „Tab-Audio teilen“ an.",
  "error.inputGone":
    "Dieser Eingang steht nicht mehr zur Verfügung. Wählen Sie einen anderen oder nehmen Sie den Systemstandard auf.",
  "error.recorderStopped": "Die Aufnahme wurde unerwartet beendet.",
  "error.undecodable":
    "Das Audio dieser Datei ließ sich nicht dekodieren. Versuchen Sie MP3, WAV, M4A, WebM oder MP4.",
  "error.noAudioInFile": "Diese Datei enthält kein Audio.",
  "error.noSpeech":
    "Es wurde keine Sprache erkannt. Wenn die Aufnahme nicht stumm ist, versuchen Sie ein größeres Modell.",
  "error.unsupported": "Dieser Browser unterstützt Web Audio nicht.",
  "error.emptyRange": "Dieser Bereich ist leer.",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} Guthaben",
  "common.credit": "1 Guthaben",
  "language.detect": "Automatisch erkennen",
  "model.tiny": "Am schnellsten. Reicht für eine klare Stimme.",
  "model.base": "Eine gute Voreinstellung für eine Besprechung. 99 Sprachen.",
  "model.small": "Merklich besser bei Akzenten und Durcheinanderreden.",
  "model.turbo": "Das genaueste hier. Braucht WebGPU und beim ersten Laden Geduld.",
  "error.libraryOpen": "Die Bibliothek ließ sich nicht öffnen.",
  "error.libraryBlocked": "Die Bibliothek ist in einem anderen Tab geöffnet.",
  "error.libraryWrite": "Die Bibliothek hat einen Schreibvorgang abgelehnt.",
  "library.exportFileNote": "Audio ist nicht enthalten; exportieren Sie eine Aufnahme über ihre eigene Seite.",
  "format.srt": "SubRip-Untertitel (.srt)",
  "format.vtt": "WebVTT-Untertitel (.vtt)",
  "format.text": "Reiner Text (.txt)",
  "format.text_timestamped": "Text mit Zeitstempeln (.txt)",
  "format.markdown": "Markdown-Notizen (.md)",
  "format.json": "JSON (.json)",
  "format.csv": "Tabelle (.csv)",
  "format.html": "Webseite (.html)",
  "common.importedTitle": "Importierte Aufnahme",
};

// The canonical catalogue. Every other locale is typed against this one, so a
// missing string is a build error rather than a sentence that silently reverts
// to English mid-paragraph.
//
// Keys are namespaced by where they appear. Where a string carries a number or
// a name, the placeholder is named — word order is the first thing that changes
// between languages, and a positional substitution would swap two numbers
// without anything noticing.

export const en = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "Start",
  "nav.library": "Library",
  "nav.ask": "Ask",
  "nav.privacy": "Privacy",
  "nav.account": "Account",
  "nav.language": "Language",
  "shell.starting": "Starting…",
  "shell.recording": "Recording",
  "shell.paused": "Paused",
  "shell.goToRecorder": "Go to the recorder",
  "shell.footerTagline": "OpenNoteTaker — transcription that stays on your machine.",
  "shell.footerPrivacy": "What leaves this device",
  "shell.footerSource": "Source (MIT / Apache-2.0)",
  "shell.startAgain": "Start again",
  "shell.somethingWrong": "Something went wrong.",
  "shell.noticeStorage":
    "This browser will not let the page store anything, so nothing will be kept after you close the tab. Everything else works.",
  "shell.noticeExpired":
    "{count} notes passed the retention period you set and have been deleted.",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "Nobody joins your call. Nothing leaves your machine.",
  "home.lede":
    "OpenNoteTaker records, transcribes and separates speakers inside this browser tab. The audio is never uploaded, there is no bot in the participant list, and there is no subscription to cancel.",
  "home.record": "Record a meeting",
  "home.open": "Open a recording",
  "home.readyGpu":
    "Ready on this device — using your GPU. The {model} model ({size}) downloads once, the first time you transcribe.",
  "home.readyWasm":
    "Ready on this device — using WebAssembly. The {model} model ({size}) downloads once, the first time you transcribe.",
  "home.claim1.title": "The recording stays here",
  "home.claim1.body":
    "Speech recognition runs in this tab, on your processor or GPU. The only thing downloaded is the model itself, once. Nothing is sent anywhere for the free features at all.",
  "home.claim1.link": "What leaves this device",
  "home.claim2.title": "You are asked to ask",
  "home.claim2.body":
    "Recording starts behind a one-step consent check, with a line you can read out. What was agreed is stored with the recording and printed in every export — so it is still evidence in six weeks.",
  "home.claim3.title": "No subscription, no surprise",
  "home.claim3.body":
    "Transcription, timestamps, speakers, summaries of what was said and every export format are free and always will be — they cost us nothing to run. AI writing costs credits, and you see the exact price before you press the button.",
  "home.claim3.link": "See what things cost",
  "home.table.heading": "What it does",
  "home.table.feature": "Feature",
  "home.table.where": "Where it runs",
  "home.table.price": "Price",
  "home.table.inTab": "In this tab",
  "home.table.ourServer": "Our server, our model key",
  "home.table.split": "Retrieval here, the answer on our server",
  "home.table.free": "Free",
  "home.table.credits": "Credits",
  "home.feature.transcribe": "Transcription, 99 languages",
  "home.feature.timeline": "A timestamp on every sentence",
  "home.feature.speakers": "Telling speakers apart",
  "home.feature.record": "Recording without a bot",
  "home.feature.export": "Subtitles, text, Markdown, JSON, CSV, HTML",
  "home.feature.summary": "Topics, key lines, actions, decisions",
  "home.feature.search": "Searching everything you have recorded",
  "home.feature.translateFree": "Translating as it transcribes (into English)",
  "home.feature.minutes": "AI-written minutes and action items",
  "home.feature.ask": "Asking questions across your meetings",
  "home.feature.translatePaid": "Translating a finished transcript, any language",
  "home.table.note":
    "The line between the two is not a business decision dressed up: everything above it runs on your hardware and costs us nothing, so charging for it would be charging for the account. Everything below it is a bill we pay a model vendor.",
  "home.selfhost.title": "It also runs on your own server",
  "home.selfhost.body":
    "The whole app is static files and a WebAssembly module. Download a release and open it, or serve it from a machine you control — the free features work with no network at all once the model is cached.",
  "home.selfhost.note":
    "See docs/self-hosting.md in the repository. This is the one thing none of the eleven products we compared offers: the ones that process locally all make you install something, and the ones you open in a browser all upload your audio.",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "This recording stays on this device. It is transcribed here, in this browser, and is not uploaded anywhere. Everyone who can be heard has been told they are being recorded.",
  "consent.script":
    "Before we start — I'm recording this and taking notes with it. The recording stays on my machine. Is that alright with everyone?",
  "consent.method.announced": "I told everyone out loud",
  "consent.method.announcedHint": "The usual case. Read the line above if it helps.",
  "consent.method.written": "It is agreed in writing",
  "consent.method.writtenHint": "A calendar note, a message, a policy everyone has seen.",
  "consent.method.solo": "It is only me",
  "consent.method.soloHint": "A voice note, a rehearsal, a call with nobody else on it.",
  "consent.record.at": "Recorded {at}.",
  "consent.record.solo": "No one else was present.",
  "consent.record.method": "Consent: {method}.",
  "consent.record.present": "Present: {names}.",
  "consent.record.captured": "Captured: {sources}.",
  "consent.record.told": "Everyone present was told: “{disclosure}”",
  "record.title": "Before you record",
  "record.lede": "One screen, once. This is the part most tools leave out.",
  "record.scriptHeading": "Read this out, if it helps",
  "record.scriptNote":
    "The hard part of asking is not agreeing to it — it is finding the words while eight people wait.",
  "record.whoHeading": "Who is in this conversation?",
  "record.whoHint":
    "Optional, and only stored here. It goes into the record and the exported notes.",
  "record.whoPlaceholder": "Ana, Priya, and two people from the client",
  "record.sourcesHeading": "What should be recorded?",
  "record.source.mic": "Your microphone",
  "record.source.micHint": "You and anyone in the room with you.",
  "record.source.tab": "A tab or window's sound",
  "record.source.tabHint":
    "Everyone on a video call. You will be asked which tab, and you must tick “share tab audio”.",
  "record.source.tabUnsupported":
    "This browser will not share a tab's audio with a page. Chrome or Edge will.",
  "record.micOnlyOnACall":
    "Recording the microphone alone works for a meeting in the room. On a call it does not: the browser removes whatever comes out of your speakers, so the other people are cancelled out rather than merely quiet. Tick the tab as well, or record a loopback input.",
  "record.inputs.heading": "Which input",
  "record.inputs.add": "Add a microphone",
  "record.inputs.switched": "Now recording from {input}.",
  "record.inputs.liveHint":
    "Changing this takes effect at once and leaves no gap in the recording — the file continues as one piece.",
  "record.inputs.reveal": "Choose which input",
  "record.inputs.label": "Input",
  "record.inputs.default": "The system default",
  "record.inputs.none": "This browser will not name your inputs. The default one still records.",
  "record.inputs.clean": "Clean up the sound",
  "record.inputs.cleanHint":
    "Echo cancellation, noise suppression and automatic gain. Right for a microphone in a room; turn it off for a loopback device or a mixer, where it has nothing to cancel and audibly damages what it is given.",
  "record.source.handedTab": "The {platform} tab",
  "record.source.handedTabHint":
    "Handed over by the detector, so there is no tab to pick and no box to tick.",
  "record.detectorOn":
    "The meeting detector is installed, so this screen opens by itself when you join a call.",
  "record.handoffHeading": "Opened from your {platform} call",
  "record.handoffDirect":
    "That tab's sound is already chosen. Nothing is captured until you press start, and nothing leaves this browser after you do.",
  "record.handoffPicker":
    "The shortcut to that tab expired, so you will be asked which tab to share. Tick “share tab audio”.",
  "record.agreeHeading": "What you are agreeing to",
  "record.agreeNote":
    "Stored word for word with this recording, so changing this text later cannot rewrite what you agreed to now.",
  "record.pickOne": "Choose at least one thing to record.",
  "record.start": "Start recording",
  "record.cancel": "Cancel",
  "record.capturing": "Capturing {sources}",
  "record.mic": "your microphone",
  "record.tab": "a shared tab",
  "record.pause": "Pause",
  "record.resume": "Resume",
  "record.finish": "Finish and transcribe",
  "record.levelHint":
    "If that bar never moves, nothing is being heard — check the microphone before you get to the end of the meeting.",
  "record.nameLabel": "Name it now, or later",
  "record.namePlaceholder": "What is this meeting?",
  "record.nameNote":
    "Nothing has left this machine, and nothing will. Transcription starts when you finish, and runs here.",
  "record.discard": "Discard the recording",
  "record.discardConfirm": "Discard this recording? It cannot be recovered.",
  "record.defaultTitle": "Recording, {when}",
  "record.tabEnded":
    "The tab you were sharing stopped. Finish now to keep what has been recorded so far.",
  "record.consentHeading": "Consent record",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "Getting ready…",
  "run.reading": "Reading the file",
  "run.decoding": "Decoding the audio",
  "run.ready": "Ready",
  "run.loadingModel": "Loading the speech model",
  "run.downloadingModel": "Downloading the speech model ({percent}%)",
  "run.listeningShort": "Listening to under a minute of audio",
  "run.listening": "Listening to {minutes} minutes of audio",
  "run.diarizing": "Working out who said what",
  "run.summarising": "Picking out the topics and actions",
  "run.modelNote":
    "The speech model is downloaded once and then cached by the browser. Nothing is uploaded.",
  "run.localNote":
    "This is running on your own machine. Leaving this tab in the background will slow it down; closing it will stop it.",
  "run.failedTitle": "That did not work",
  "run.failedNote":
    "Nothing was uploaded and nothing was saved. If the recording is not silent, a larger model under Privacy often helps.",
  "run.back": "Back to the start",
  "run.cancel": "Cancel",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "That recording is not here",
  "note.missingBody":
    "It may have passed the retention period you set, or been opened on a different device — nothing is synced anywhere.",
  "note.backToLibrary": "Back to the library",
  "note.titleLabel": "Title",
  "note.metaDetected": "detected {language}",
  "note.metaLines": "{count} lines",
  "note.metaRecorded": "recorded here",
  "note.metaImported": "imported",
  "note.noAudio":
    "The recording itself was not kept — only this transcript. Turn on “keep the audio” under Privacy if you want to be able to play it back.",
  "note.whoHeading": "Who is speaking",
  "note.speakerAuto": "Work it out",
  "note.speakerCount": "{count} people",
  "note.speakerOne": "1 person",
  "note.rediarize": "Work out the speakers again",
  "note.rediarizeNoAudio":
    "The audio was not kept, so speakers cannot be worked out again.",
  "note.rediarizeRunning": "Listening again…",
  "note.rediarizeDone": "{count} voices",
  "note.rediarizeUnassigned": ", {count} lines too short to tell apart",
  "note.speakerNote":
    "Speakers are told apart here on this device, by the sound of each voice. It works well for two or three people with distinct voices; it struggles with similar voices, crosstalk, and one person who changes microphone. If it finds more people than were in the room \u2014 or fewer \u2014 set the number above and work them out again. Click a name in the transcript to move a single line to someone else.",
  "note.transcriptHeading": "Transcript",
  "note.findPlaceholder": "Find in this transcript",
  "note.playFromHere": "Play from here",
  "note.reassign": "Assign this line to someone else",
  "note.split": "Split",
  "note.splitHint": "Split this line in two at its midpoint",
  "note.speakerNameFor": "Name for {name}",
  "note.recordingHeading": "This recording",
  "note.downloadAudio": "Download the audio",
  "note.transcribeAgain": "Transcribe again",
  "note.transcribeAgainConfirm":
    "Transcribe this recording again? The current transcript, its speaker labels and any edits to it are replaced. The audio is kept.",
  "note.deleteAudio": "Delete the audio, keep the transcript",
  "note.deleteAudioConfirm":
    "Delete the audio and keep the transcript? This cannot be undone.",
  "note.deleteAll": "Delete everything",
  "note.deleteAllConfirm": "Delete “{title}” entirely? This cannot be undone.",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "From what was said",
  "summary.freeBadge": "Made on this device · free",
  "summary.redo": "Redo",
  "summary.empty": "Nothing stood out — the transcript may be too short to find topics in.",
  "summary.stats": "{sentences} sentences · about {minutes} min · {speakers} speakers",
  "summary.topics": "Topics: ",
  "summary.keyPoints": "Key points",
  "summary.decisions": "Decisions",
  "summary.actionItems": "Action items",
  "summary.questionsAsked": "Questions asked",
  "summary.questionsOpen": "Open questions",
  "summary.whoTalked": "Who talked",
  "summary.freeNote":
    "Every line above is quoted from the transcript, with the time it was said. Nothing here was written by a model, and none of it left this device.",
  "summary.cueLanguages":
    "Action items, decisions and deadlines are recognised in {languages}. Topics and key lines work in every language.",
  "summary.paidHeading": "Written by AI",
  "summary.paidBought": "Paid for · already bought",
  "summary.paidBody":
    "A model reads the transcript and writes minutes: what the meeting was about, what was decided, who owes what and by when. Unlike the panel above, these are new sentences rather than quotes — with a timestamp on each so you can check them.",
  "summary.steer": "Optional steer",
  "summary.steerPlaceholder": "Anything specific? e.g. “focus on what the client asked for”",
  "summary.write": "Write the minutes — {price}",
  "summary.writing": "Writing the minutes…",
  "summary.discard": "Discard and write it again",
  "summary.signInFirst": "Sign in first",
  "summary.balance": "You have {credits}",
  "summary.revealOne": "Exactly what would be sent — one request, text only, no audio",
  "summary.revealMany": "Exactly what would be sent — {count} requests, text only, no audio",
  "summary.redactNone":
    "Nothing that looks like an email address, phone number, long number or link was found, so this goes as it is.",
  "summary.redactSome":
    "{items} will be replaced before this is sent. Switch that off under Privacy.",
  "summary.redactOff":
    "Redaction before sending is switched off under Privacy, so this goes as it is.",
  "summary.moreChars": "… and {count} more characters",
  "summary.paidNote":
    "Charged once, when it works. Nothing recurring, nothing to cancel, and a failed request costs nothing.",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "Export",
  "export.download": "Download",
  "export.copy": "Copy",
  "export.withSpeakers": "Include who said what",
  "export.withSummary": "Include the summary",
  "export.withConsent": "Include the consent record",
  "export.note":
    "Every format, free, for ever. They are text formatting over data already in this tab, so there is nothing here that costs us anything to give you.",
  "export.clip": "Cut out a clip",
  "export.clipFrom": "From",
  "export.clipTo": "to",
  "export.clipWords": "The words",
  "export.clipSound": "The sound",
  "export.clipBadRange": "The end has to come after the start.",
  "export.clipCutting": "Cutting…",
  "export.clipDone": "Done.",
  "export.clipNote": "Both are cut here, on this device. Nothing is uploaded to make a clip.",
  "export.excerptTitle": "{title} (excerpt)",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "Summary",
  "export.label.keyPoints": "Key points",
  "export.label.decisions": "Decisions",
  "export.label.actionItems": "Action items",
  "export.label.questionsAsked": "Questions asked",
  "export.label.questionsOpen": "Open questions",
  "export.label.topics": "Topics",
  "export.label.whoSpoke": "Who spoke",
  "export.label.transcript": "Transcript",
  "export.label.consent": "Recording consent",
  "export.label.unknown": "Unknown",
  "export.label.due": "due",
  "export.label.stats": "{sentences} sentences · about {minutes} min · {speakers} speakers",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "Translate this transcript",
  "translate.go": "Translate — {price}",
  "translate.englishIsFree":
    "English is free: re-transcribe with “translate into English” under Privacy instead.",
  "translate.batches": "{lines} lines, in batches of {size}.",
  "translate.progress": "Translating {from}–{to} of {total}…",
  "translate.done": "Translated. ",
  "translate.open": "Open “{title}”",
  "translate.note":
    "The translation is saved as a separate note, so the original transcript and its timestamps are left alone. If a batch comes back with the wrong number of lines it is rejected rather than applied, and you are not charged for it.",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "Library",
  "library.record": "Record",
  "library.open": "Open a file",
  "library.durable":
    "Stored in this browser, on this device only. Nothing is synced and there is no copy anywhere else.",
  "library.memory":
    "Held in memory only — nothing is being written to disk, so this list empties when you close the tab.",
  "library.searchPlaceholder": "Search everything you have recorded",
  "library.searchPlaceholderCount": "Search everything you have recorded ({lines} lines)",
  "library.noMatch": "Nothing matched.",
  "library.empty": "Nothing here yet. Record a meeting or open a file from the Start screen.",
  "library.voices": "{count} voices",
  "library.oneVoice": "1 voice",
  "library.audioKept": "audio kept",
  "library.transcriptOnly": "transcript only",
  "library.hasMinutes": "AI minutes",
  "library.daysLeft": "{days}d left",
  "library.expiring": "expiring",
  "library.deletedOn": "Deleted on {date}",
  "library.retentionHeading": "How long this is kept",
  "library.retentionNote":
    "Checked every time you open the app, not on a timer — so nothing outlives the period you chose just because you did not visit.",
  "library.retention.session": "Until I close this tab",
  "library.retention.sessionHint": "Nothing is written to disk at all.",
  "library.retention.7d": "7 days",
  "library.retention.30d": "30 days",
  "library.retention.90d": "90 days",
  "library.retention.90dHint": "The default.",
  "library.retention.forever": "Until I delete it",
  "library.retention.foreverHint": "Nothing expires on its own.",
  "library.movedToMemory": "Moved into memory. The database on disk has been emptied.",
  "library.retentionRemoved":
    "{count} notes were past the new limit and have been deleted.",
  "library.dataHeading": "Your data",
  "library.dataNote":
    "If this device holds the only copy, you must be able to take it elsewhere without asking us. That is what these do.",
  "library.exportAll": "Export everything",
  "library.importAll": "Import an export",
  "library.deleteAll": "Delete everything",
  "library.deleteAllConfirm":
    "Delete all {count} recordings and their transcripts? This cannot be undone.",
  "library.restored": "{count} restored.",
  "library.exportNote":
    "The export is every transcript, summary and consent record as one JSON file. Audio is not included, because it would make the file enormous — download a recording from its own page.",
  "library.notAnExport": "That is not an OpenNoteTaker export file.",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "Ask across your meetings",
  "ask.lede": "Searching {notes} recordings — {lines} lines, indexed here in this tab.",
  "ask.ledeEmpty":
    "Nothing recorded yet. This searches everything in your library once there is something in it.",
  "ask.placeholder": "What did we decide about the hosting migration?",
  "ask.found":
    "{count} moments in your recordings look relevant. Finding them cost nothing and happened on this device.",
  "ask.andMore": "…and {count} more, all of which would be sent.",
  "ask.nothing": "Nothing in your recordings matches that.",
  "ask.answer": "Have it answered — {price}",
  "ask.thinking": "Thinking…",
  "ask.sources": "Where that came from",
  "ask.noCitations": "The answer cited nothing, so check it against the passages above.",
  "ask.charged": "Charged {charged}. You have {balance} left.",
  "ask.splitHeading": "How this is split",
  "ask.splitBody":
    "The search is free and runs on this device, over an index built from your own transcripts. Only the answer costs anything, and only the passages shown above are sent — never your recordings, and never the rest of your library.",
  "ask.splitNote":
    "The price does not grow with the size of your library: the number of passages sent is capped, so a question costs about the same on your five-hundredth meeting as on your fifth.",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "What leaves this device",
  "privacy.lede":
    "Four hosts, and this app can only ever contact them for the reasons below. Open your browser's network panel and check.",
  "privacy.tableHeading": "Every request this app can make",
  "privacy.host": "Host",
  "privacy.when": "When",
  "privacy.what": "What is in it",
  "privacy.thisSite": "this site",
  "privacy.hfWhen":
    "The first time you transcribe with a given model, and never again — the browser caches it.",
  "privacy.hfWhat": "Nothing of yours. It is a download: the model weights come to you.",
  "privacy.siteWhen": "Loading the page, and the ONNX runtime the model needs.",
  "privacy.siteWhat":
    "Nothing of yours. Served from here on purpose, so the runtime is not a second, silent third party.",
  "privacy.authWhen":
    "When you open the Account page — it asks which sign-in methods exist — and thereafter while you are signed in, to read your balance.",
  "privacy.authWhat": "Your sign-in method and your balance. No transcripts, ever.",
  "privacy.gatewayWhen": "Only when you press a button that shows a price.",
  "privacy.gatewayWhat":
    "The text of the transcript or passages that button names, and nothing else. Never audio.",
  "privacy.noTrackers":
    "There is no analytics script, no tag manager, no error reporter and no font CDN in this page. That is checkable in view-source, which is why it is worth saying.",
  "privacy.testedClaim":
    "Recording, transcribing, telling speakers apart, searching, summarising on this device and every export make no requests at all. The build's own test asserts that: it drives each of those screens and fails if the page contacts anything.",
  "privacy.audioHeading": "Audio never goes anywhere",
  "privacy.audioBody":
    "Not as an upload, not as a sample, not to improve a model. The paid routes take text — the transcript you already have and can read. That is a property of what the request carries, not a policy we could quietly change: the request body is on screen before you send it, under “exactly what would be sent”.",
  "privacy.audioNote":
    "The recording is decoded and transcribed by WebAssembly running in this tab, on your processor or GPU.",
  "privacy.storedHeading": "What is stored, and where",
  "privacy.storedBody":
    "{count} recordings in this browser's own storage, on this device. Roughly {size}. There is no server-side copy and nothing syncs.",
  "privacy.storedNothing":
    "Nothing is being written to disk — the library is held in memory and goes when you close the tab.",
  "privacy.changeRetention": "Change how long it is kept",
  "privacy.redactHeading": "Before anything is sent",
  "privacy.redactLabel": "Take out the obvious secrets first",
  "privacy.redactHint":
    "Replaces {kinds} with a placeholder before a paid request is built.",
  "privacy.redactNote":
    "This catches well-formed patterns. It will not catch a card number read out as words, and it is not a compliance control — it is a sensible default for the one moment text leaves this machine. Nothing is redacted from your own copy.",
  "privacy.recordingHeading": "How recordings are made",
  "privacy.keepAudio": "Keep the audio as well as the transcript",
  "privacy.keepAudioHint":
    "Off by default. The transcript is what the app is for; the audio is the large, sensitive part you rarely open again. Keeping it is what lets you play back and re-run the speaker detection.",
  "privacy.diarize": "Work out who is speaking",
  "privacy.diarizeHint": "Runs here, adds a few seconds, and needs no model download.",
  "privacy.modelHeading": "The speech model",
  "privacy.modelNote":
    "Downloaded from Hugging Face once and cached by your browser. After that, transcription works with no network at all.",
  "privacy.languageHeading": "The language of the recording",
  "language.none": "No second language",
  "common.listJoin": " and ",
  "privacy.secondLanguageHint":
    "Both languages are listened for, and each stretch is transcribed in the one actually being spoken. Naming them stops detection wandering into a third.",
  "run.listeningForLanguage": "Listening for the language",
  "privacy.languageHint":
    "Whisper handles 99. Leave it on detect unless it keeps guessing wrong.",
  "privacy.translateToEnglish": "Translate into English while transcribing",
  "privacy.translateHint":
    "Whisper's own translation, so it runs here and costs nothing. For any other target language, use “Translate this transcript” on a note, which is a paid feature.",
  "privacy.selfHostHeading": "Run it yourself",
  "privacy.selfHostBody":
    "This app is static files plus a WebAssembly module and no backend. Serve it from a machine you control, or open a downloaded release straight from disk — the free features work either way, and the paid ones simply do not appear unless you point them at a gateway.",
  "privacy.selfHostNote":
    "None of the eleven products we compared offers this combination. The ones that process locally all make you install an application; the ones you open in a browser all upload your audio.",
  "privacy.interfaceHeading": "The language of the interface",
  "privacy.interfaceHint":
    "Changes this app's own words, and the headings in exported documents. It does not affect transcription, which follows the recording.",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "Account",
  "account.lede":
    "You need one for exactly three things: AI-written minutes, questions across your meetings, and translating a finished transcript into a language other than English. Everything else works signed out, for ever.",
  "account.signInHeading": "Sign in to OpenNoteTaker",
  "account.signInBody":
    "One account across our apps. Almost nothing here needs it \u2014 recording, transcription, speakers, search and export all work signed out.",
  "account.creditsHeading": "Credits",
  "account.creditsNote":
    "{packCredits} credits cost {packPrice} — {each} each. They do not expire, they do not renew, and there is no subscription to cancel because there is no subscription.",
  "account.costHeading": "What things cost",
  "account.job": "Job",
  "account.typical": "Typical price",
  "account.cost30": "AI minutes for a 30-minute meeting",
  "account.cost60": "AI minutes for a 60-minute meeting",
  "account.costAsk": "One question across your library",
  "account.costNote":
    "Estimates for a typical meeting. The exact price for your actual transcript is on the button, before you press it — computed from the same code that does the charging, so the two cannot disagree.",
  "account.historyHeading": "Where your credits went",
  "account.notHeading": "What an account does not do",
  "account.notBody":
    "It does not unlock transcription, speaker separation, exports, search or the summary made on your device — those run on your hardware and cost us nothing, so charging for them would be charging for the login. It does not store your recordings, your transcripts or your titles: the account holds a sign-in method and a balance.",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "Sign in to use the AI features. Everything else works without an account.",
  "error.signIn": "Sign in",
  "error.insufficient": "This needs {need} credits and you have {have}.",
  "error.topUp": "Top up — {price} buys {credits}",
  "error.notConfigured":
    "AI summaries are not available right now. The summary made on your device still works.",
  "error.miscount":
    "The translation came back with the wrong number of lines, so it was rejected rather than risk desynchronising your transcript. You were not charged, so try again.",
  "error.emptyReply": "The model returned nothing usable. You were not charged, so try again.",
  "error.unreachable": "The AI service could not be reached. You were not charged.",
  "error.tooLarge": "That request was too large. Summarise a shorter section.",
  "error.status": "The AI service returned {status}.",
  "error.micDenied":
    "Permission was refused. Allow microphone access for this site in the browser's address bar, then try again.",
  "error.micMissing": "No microphone was found. Plug one in, or record a tab's audio instead.",
  "error.micBusy": "The microphone is in use by another application. Close it and try again.",
  "error.alreadyRecording": "Already recording.",
  "error.notRecording": "Not recording.",
  "error.nothingRecorded": "Nothing could be recorded. Check the browser's permissions.",
  "error.noTabAudio":
    "This browser will not share a tab's audio with a page. Recording the microphone only — which still captures a call on speaker.",
  "error.tabAudioUnticked":
    "No tab audio was shared — the “share tab audio” box was not ticked. Recording the microphone only.",
  "error.tabAudioDeclined": "Tab audio was not shared. Recording the microphone only.",
  "error.handoffExpired":
    "The shortcut from the meeting tab expired. Pick the meeting tab in the sharing dialog, and tick “share tab audio”.",
  "error.inputGone":
    "That input is no longer available. Choose another, or record the system default.",
  "error.recorderStopped": "The recording stopped unexpectedly.",
  "error.undecodable":
    "This file's audio could not be decoded. Try an MP3, WAV, M4A, WebM or MP4.",
  "error.noAudioInFile": "This file has no audio in it.",
  "error.noSpeech":
    "No speech was recognised. If the recording is not silent, try a larger model.",
  "error.unsupported": "This browser has no Web Audio support.",
  "error.emptyRange": "That range is empty.",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} credits",
  "common.credit": "1 credit",
  "language.detect": "Detect automatically",
  "model.tiny": "Fastest. Fine for one clear speaker.",
  "model.base": "A good default for a meeting. 99 languages.",
  "model.small": "Noticeably better on accents and crosstalk.",
  "model.turbo": "The most accurate here. Needs WebGPU and patience on first load.",
  "error.libraryOpen": "Could not open the library.",
  "error.libraryBlocked": "The library is open in another tab.",
  "error.libraryWrite": "The library refused a write.",
  "library.exportFileNote": "Audio is not included; export a recording from its own page.",
  "format.srt": "SubRip subtitles (.srt)",
  "format.vtt": "WebVTT subtitles (.vtt)",
  "format.text": "Plain text (.txt)",
  "format.text_timestamped": "Timestamped text (.txt)",
  "format.markdown": "Markdown notes (.md)",
  "format.json": "JSON (.json)",
  "format.csv": "Spreadsheet (.csv)",
  "format.html": "Web page (.html)",
  "common.importedTitle": "Imported recording",
} as const;

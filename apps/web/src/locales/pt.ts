// Português.
//
// Conventions this follows:
//
// - **Brazilian usage**, as the suite standardised: Salvar not Guardar, aba
//   not separador, arquivo not ficheiro, tela not ecrã, gravação not gravação
//   de voz. A European Portuguese reader understands all of it; the reverse is
//   less true, which is why this is the direction to pick.
// - **Você-form, implicit.** Brazilian interfaces address the reader without
//   naming them: "Escolha uma entrada", not "Você deve escolher".
// - **Controls are infinitives or nouns**: Gravar, Cancelar, Baixar.
// - Kept in English because they are the interface's own words elsewhere:
//   Markdown, JSON, CSV, HTML.

import type { Catalogue } from "../lib/i18n";

export const pt: Catalogue = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "Início",
  "nav.library": "Biblioteca",
  "nav.ask": "Perguntar",
  "nav.privacy": "Privacidade",
  "nav.account": "Conta",
  "nav.language": "Idioma",
  "shell.starting": "Iniciando…",
  "shell.recording": "Gravando",
  "shell.paused": "Pausado",
  "shell.goToRecorder": "Ir para a gravação",
  "shell.footerTagline": "OpenNoteTaker — transcrição que fica no seu aparelho.",
  "shell.footerPrivacy": "O que sai deste aparelho",
  "shell.footerSource": "Código-fonte (MIT / Apache-2.0)",
  "shell.startAgain": "Começar de novo",
  "shell.somethingWrong": "Algo deu errado.",
  "shell.noticeStorage":
    "Este navegador não deixa a página guardar nada, então nada será mantido depois que você fechar a aba. Todo o resto funciona.",
  "shell.noticeExpired":
    "{count} notas passaram do prazo de retenção que você definiu e foram excluídas.",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "Ninguém entra na sua chamada. Nada sai do seu aparelho.",
  "home.lede":
    "O OpenNoteTaker grava, transcreve e separa quem fala dentro desta aba do navegador. O áudio nunca é enviado, nenhum bot aparece na lista de participantes e não há assinatura para cancelar.",
  "home.record": "Gravar uma reunião",
  "home.open": "Abrir uma gravação",
  "home.readyGpu":
    "Pronto neste aparelho — usando sua GPU. O modelo {model} ({size}) é baixado uma única vez, na primeira transcrição.",
  "home.readyWasm":
    "Pronto neste aparelho — usando WebAssembly. O modelo {model} ({size}) é baixado uma única vez, na primeira transcrição.",
  "home.claim1.title": "A gravação fica aqui",
  "home.claim1.body":
    "O reconhecimento de fala roda nesta aba, no seu processador ou na sua GPU. A única coisa baixada é o modelo em si, uma vez só. Nas funções gratuitas nada é enviado a lugar nenhum.",
  "home.claim1.link": "O que sai deste aparelho",
  "home.claim2.title": "A gente lembra você de pedir",
  "home.claim2.body":
    "A gravação começa depois de uma checagem de consentimento de uma etapa, com uma frase que dá para ler em voz alta. O que foi combinado fica guardado junto da gravação e sai impresso em toda exportação — para ainda valer como prova daqui a seis semanas.",
  "home.claim3.title": "Sem assinatura, sem surpresa",
  "home.claim3.body":
    "Transcrição, marcações de tempo, separação de vozes, resumos do que foi dito e todos os formatos de exportação são gratuitos e vão continuar sendo — não custam nada para a gente. O que a IA escreve custa créditos, e você vê o preço exato antes de clicar.",
  "home.claim3.link": "Ver quanto custa cada coisa",
  "home.table.heading": "O que ele faz",
  "home.table.feature": "Recurso",
  "home.table.where": "Onde roda",
  "home.table.price": "Preço",
  "home.table.inTab": "Nesta aba",
  "home.table.ourServer": "Nosso servidor, nossa chave de modelo",
  "home.table.split": "A busca aqui, a resposta no nosso servidor",
  "home.table.free": "Grátis",
  "home.table.credits": "Créditos",
  "home.feature.transcribe": "Transcrição, 99 idiomas",
  "home.feature.timeline": "Uma marcação de tempo em cada frase",
  "home.feature.speakers": "Distinguir quem fala",
  "home.feature.record": "Gravar sem nenhum bot",
  "home.feature.export": "Legendas, texto, Markdown, JSON, CSV, HTML",
  "home.feature.summary": "Temas, frases-chave, tarefas, decisões",
  "home.feature.search": "Buscar em tudo que você gravou",
  "home.feature.translateFree": "Traduzir enquanto transcreve (para o inglês)",
  "home.feature.minutes": "Ata e tarefas escritas por IA",
  "home.feature.ask": "Perguntar através de todas as suas reuniões",
  "home.feature.translatePaid": "Traduzir uma transcrição pronta para qualquer idioma",
  "home.table.note":
    "Essa linha não é uma decisão comercial disfarçada: tudo acima dela roda no seu equipamento e não custa nada para a gente, então cobrar por isso seria cobrar pela conta. Tudo abaixo dela é uma fatura que pagamos a um fornecedor de modelos.",
  "home.selfhost.title": "Também roda no seu próprio servidor",
  "home.selfhost.body":
    "O aplicativo inteiro são arquivos estáticos e um módulo WebAssembly. Baixe uma versão e abra, ou sirva de uma máquina que você controla — depois que o modelo estiver em cache, as funções gratuitas funcionam sem rede nenhuma.",
  "home.selfhost.note":
    "Veja docs/self-hosting.md no repositório. Essa é a única coisa que nenhum dos onze produtos que comparamos oferece: os que processam localmente exigem instalar algo, e os que abrem no navegador enviam o seu áudio.",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "Esta gravação fica neste aparelho. Ela é transcrita aqui, neste navegador, e não é enviada para lugar nenhum. Todos que podem ser ouvidos foram avisados de que está sendo gravado.",
  "consent.script":
    "Antes de a gente começar — vou gravar isso para fazer minhas anotações. A gravação fica na minha máquina. Tudo bem para todo mundo?",
  "consent.method.announced": "Avisei em voz alta",
  "consent.method.announcedHint": "O caso normal. Leia a frase acima se ajudar.",
  "consent.method.written": "Está combinado por escrito",
  "consent.method.writtenHint": "Uma nota na agenda, uma mensagem, uma política que todos viram.",
  "consent.method.solo": "Sou só eu",
  "consent.method.soloHint": "Um áudio para si mesmo, um ensaio, uma chamada sem mais ninguém.",
  "consent.record.at": "Gravado em {at}.",
  "consent.record.solo": "Não havia mais ninguém presente.",
  "consent.record.method": "Consentimento: {method}.",
  "consent.record.present": "Presentes: {names}.",
  "consent.record.captured": "Capturado: {sources}.",
  "consent.record.told": "Todos os presentes foram avisados: “{disclosure}”",
  "record.title": "Antes de gravar",
  "record.lede": "Uma tela, uma vez. Essa é a parte que a maioria das ferramentas deixa de fora.",
  "record.scriptHeading": "Leia isto em voz alta, se ajudar",
  "record.scriptNote":
    "O difícil de pedir não é a concordância — é achar as palavras enquanto oito pessoas esperam.",
  "record.whoHeading": "Quem está nesta conversa?",
  "record.whoHint":
    "Opcional, e guardado só aqui. Entra no registro e nas notas exportadas.",
  "record.whoPlaceholder": "Ana, Priya e duas pessoas do cliente",
  "record.afterHeading": "Depois",
  "record.keepAudio": "Manter a gravação, não só a transcrição",
  "record.keepAudioHint":
    "Guardada só neste navegador e excluída junto com a nota. É a metade maior e mais sensível, por isso fica desligado a menos que você peça.",
  "record.keepAudioWarning":
    "O áudio será descartado quando você fechar a nota. Se a transcrição sair errada — um idioma que ela não esperava, duas pessoas viradas em uma — não vai sobrar nada para rodar de novo.",
  "record.sourcesHeading": "O que deve ser gravado?",
  "record.source.mic": "Seu microfone",
  "record.source.micHint": "Você e quem estiver na sala com você.",
  "record.source.tab": "O som de uma aba ou janela",
  "record.source.tabHint":
    "Todo mundo numa videochamada. O navegador vai perguntar qual aba, e você precisa marcar “compartilhar áudio da aba”.",
  "record.source.tabUnsupported":
    "Este navegador não compartilha o áudio de uma aba com uma página. Chrome ou Edge compartilham.",
  "record.micOnlyOnACall":
    "Gravar só o microfone funciona para uma reunião na sala. Numa chamada, não: o navegador remove o que sai das suas caixas de som, então as outras pessoas não ficam baixinhas, ficam canceladas. Marque a aba também, ou grave uma entrada de loopback.",
  "record.inputs.heading": "Qual entrada",
  "record.inputs.add": "Adicionar um microfone",
  "record.inputs.switched": "Gravando agora de {input}.",
  "record.inputs.liveHint":
    "A mudança vale na hora e não deixa buraco na gravação — o arquivo continua como uma peça só.",
  "record.inputs.reveal": "Escolher a entrada",
  "record.inputs.label": "Entrada",
  "record.inputs.default": "O padrão do sistema",
  "record.inputs.none": "Este navegador não vai dizer o nome das suas entradas. A padrão grava assim mesmo.",
  "record.inputs.clean": "Limpar o som",
  "record.inputs.cleanHint":
    "Cancelamento de eco, supressão de ruído e ganho automático. Certo para um microfone numa sala; desligue para um dispositivo de loopback ou uma mesa de som, onde não há o que cancelar e o resultado piora de forma audível.",
  "record.source.handedTab": "A aba do {platform}",
  "record.source.handedTabHint":
    "Entregue pelo detector, então não há aba para escolher nem caixa para marcar.",
  "record.detectorOn":
    "O detector de reuniões está instalado, então esta tela abre sozinha quando você entra numa chamada.",
  "record.handoffHeading": "Aberto a partir da sua chamada do {platform}",
  "record.handoffDirect":
    "O som daquela aba já está escolhido. Nada é capturado até você apertar iniciar, e nada sai deste navegador depois disso.",
  "record.handoffPicker":
    "O atalho para aquela aba expirou, então vão perguntar qual aba compartilhar. Marque “compartilhar áudio da aba”.",
  "record.agreeHeading": "Com o que você está concordando",
  "record.agreeNote":
    "Guardado palavra por palavra com esta gravação, para que mudar este texto depois não possa reescrever com o que você concordou agora.",
  "record.pickOne": "Escolha pelo menos uma coisa para gravar.",
  "record.start": "Começar a gravar",
  "record.cancel": "Cancelar",
  "record.capturing": "Capturando {sources}",
  "record.mic": "seu microfone",
  "record.tab": "uma aba compartilhada",
  "record.pause": "Pausar",
  "record.resume": "Retomar",
  "record.finish": "Encerrar e transcrever",
  "record.levelHint":
    "Se essa barra nunca se mexer, nada está sendo ouvido — confira o microfone antes de chegar ao fim da reunião.",
  "record.nameLabel": "Dê um nome agora, ou depois",
  "record.namePlaceholder": "Que reunião é esta?",
  "record.nameNote":
    "Nada saiu desta máquina, e nada vai sair. A transcrição começa quando você encerrar, e roda aqui.",
  "record.discard": "Descartar a gravação",
  "record.discardConfirm": "Descartar esta gravação? Não dá para recuperar.",
  "record.defaultTitle": "Gravação, {when}",
  "record.tabEnded":
    "A aba que você estava compartilhando parou. Encerre agora para manter o que já foi gravado.",
  "record.consentHeading": "Registro de consentimento",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "Preparando…",
  "run.reading": "Lendo o arquivo",
  "run.decoding": "Decodificando o áudio",
  "run.ready": "Pronto",
  "run.loadingModel": "Carregando o modelo de fala",
  "run.downloadingModel": "Baixando o modelo de fala ({percent}%)",
  "run.listeningShort": "Ouvindo menos de um minuto de áudio",
  "run.listening": "Ouvindo {minutes} minutos de áudio",
  "run.diarizing": "Descobrindo quem disse o quê",
  "run.summarising": "Separando os temas e as tarefas",
  "run.modelNote":
    "O modelo de fala é baixado uma vez e depois fica em cache no navegador. Nada é enviado.",
  "run.localNote":
    "Isto está rodando na sua própria máquina. Deixar esta aba em segundo plano deixa mais lento; fechá-la interrompe.",
  "run.failedTitle": "Isso não funcionou",
  "run.failedNote":
    "Nada foi enviado e nada foi salvo. Se a gravação não estiver muda, um modelo maior em Privacidade costuma resolver.",
  "run.back": "Voltar ao início",
  "run.cancel": "Cancelar",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "Essa gravação não está aqui",
  "note.missingBody":
    "Ela pode ter passado do prazo de retenção que você definiu, ou ter sido aberta em outro aparelho — nada é sincronizado em lugar nenhum.",
  "note.backToLibrary": "Voltar para a biblioteca",
  "note.titleLabel": "Título",
  "note.metaDetected": "{language} detectado",
  "note.metaLines": "{count} linhas",
  "note.metaRecorded": "gravado aqui",
  "note.metaImported": "importado",
  "note.noAudio":
    "A gravação em si não foi mantida — só esta transcrição. Ligue “manter o áudio” em Privacidade se quiser poder ouvir de novo.",
  "note.whoHeading": "Quem está falando",
  "note.speakerAuto": "Descobrir sozinho",
  "note.speakerCount": "{count} pessoas",
  "note.speakerOne": "1 pessoa",
  "note.rediarize": "Descobrir quem fala de novo",
  "note.rediarizeNoAudio":
    "O áudio não foi mantido, então não dá para descobrir quem fala de novo.",
  "note.rediarizeRunning": "Ouvindo de novo…",
  "note.rediarizeDone": "{count} vozes",
  "note.rediarizeUnassigned": ", {count} linhas curtas demais para distinguir",
  "note.speakerNote":
    "As vozes são separadas aqui, neste aparelho, pelo timbre de cada uma. Funciona bem com duas ou três pessoas de vozes diferentes; tem dificuldade com vozes parecidas, com gente falando junto e com alguém que troca de microfone. Se ele achar mais pessoas do que havia na sala — ou menos — informe o número acima e mande calcular de novo. Clique num nome na transcrição para passar uma linha só para outra pessoa.",
  "note.transcriptHeading": "Transcrição",
  "note.findPlaceholder": "Buscar nesta transcrição",
  "note.playFromHere": "Tocar a partir daqui",
  "note.reassign": "Atribuir esta linha a outra pessoa",
  "note.split": "Dividir",
  "note.splitHint": "Divide esta linha em duas pelo meio",
  "note.speakerNameFor": "Nome de {name}",
  "note.recordingHeading": "Esta gravação",
  "note.downloadAudio": "Baixar o áudio",
  "note.transcribeAgain": "Transcrever de novo",
  "note.transcribeAgainConfirm":
    "Transcrever esta gravação de novo? A transcrição atual, os nomes das vozes e qualquer edição feita nela são substituídos. O áudio é mantido.",
  "note.deleteAudio": "Excluir o áudio e manter a transcrição",
  "note.deleteAudioConfirm":
    "Excluir o áudio e manter a transcrição? Isso não dá para desfazer.",
  "note.deleteAll": "Excluir tudo",
  "note.deleteAllConfirm": "Excluir “{title}” por completo? Isso não dá para desfazer.",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "Do que foi dito",
  "summary.freeBadge": "Feito neste aparelho · grátis",
  "summary.redo": "Refazer",
  "summary.empty": "Nada se destacou — a transcrição pode estar curta demais para achar temas.",
  "summary.stats": "{sentences} frases · cerca de {minutes} min · {speakers} vozes",
  "summary.topics": "Temas: ",
  "summary.keyPoints": "Pontos principais",
  "summary.decisions": "Decisões",
  "summary.actionItems": "Tarefas",
  "summary.questionsAsked": "Perguntas feitas",
  "summary.questionsOpen": "Perguntas em aberto",
  "summary.whoTalked": "Quem falou",
  "summary.freeNote":
    "Cada linha acima é citada da transcrição, com a hora em que foi dita. Nada aqui foi escrito por um modelo, e nada disso saiu deste aparelho.",
  "summary.cueLanguages":
    "Tarefas, decisões e prazos são reconhecidos em {languages}. Temas e frases-chave funcionam em qualquer idioma.",
  "summary.paidHeading": "Escrito por IA",
  "summary.paidBought": "Pago · já comprado",
  "summary.paidBody":
    "Um modelo lê a transcrição e escreve a ata: sobre o que foi a reunião, o que foi decidido, quem deve o quê e até quando. Diferente do painel acima, são frases novas e não citações — cada uma com uma marcação de tempo para você conferir.",
  "summary.steer": "Orientação opcional",
  "summary.steerPlaceholder": "Algo específico? Por exemplo: “foque no que o cliente pediu”",
  "summary.write": "Escrever a ata — {price}",
  "summary.writing": "Escrevendo a ata…",
  "summary.discard": "Descartar e escrever de novo",
  "summary.signInFirst": "Entre na conta primeiro",
  "summary.balance": "Você tem {credits}",
  "summary.revealOne": "Exatamente o que seria enviado — uma requisição, só texto, sem áudio",
  "summary.revealMany": "Exatamente o que seria enviado — {count} requisições, só texto, sem áudio",
  "summary.redactNone":
    "Não foi achado nada que pareça e-mail, telefone, número longo ou link, então isto vai como está.",
  "summary.redactSome":
    "{items} serão substituídos antes de isto ser enviado. Dá para desligar em Privacidade.",
  "summary.redactOff":
    "A ocultação antes do envio está desligada em Privacidade, então isto vai como está.",
  "summary.moreChars": "… e mais {count} caracteres",
  "summary.paidNote":
    "Cobrado uma vez, quando dá certo. Nada recorrente, nada para cancelar, e uma requisição que falha não custa nada.",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "Exportar",
  "export.download": "Baixar",
  "export.copy": "Copiar",
  "export.withSpeakers": "Incluir quem disse o quê",
  "export.withSummary": "Incluir o resumo",
  "export.withConsent": "Incluir o registro de consentimento",
  "export.note":
    "Todos os formatos, grátis, para sempre. São texto formatado sobre dados que já estão nesta aba, então não há aqui nada cuja entrega custe alguma coisa para a gente.",
  "export.clip": "Recortar um trecho",
  "export.clipFrom": "De",
  "export.clipTo": "até",
  "export.clipWords": "As palavras",
  "export.clipSound": "O som",
  "export.clipBadRange": "O fim tem que vir depois do começo.",
  "export.clipCutting": "Recortando…",
  "export.clipDone": "Pronto.",
  "export.clipNote": "Os dois são recortados aqui, neste aparelho. Nada é enviado para fazer um trecho.",
  "export.excerptTitle": "{title} (trecho)",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "Resumo",
  "export.label.keyPoints": "Pontos principais",
  "export.label.decisions": "Decisões",
  "export.label.actionItems": "Tarefas",
  "export.label.questionsAsked": "Perguntas feitas",
  "export.label.questionsOpen": "Perguntas em aberto",
  "export.label.topics": "Temas",
  "export.label.whoSpoke": "Quem falou",
  "export.label.transcript": "Transcrição",
  "export.label.consent": "Consentimento de gravação",
  "export.label.unknown": "Desconhecido",
  "export.label.due": "até",
  "export.label.stats": "{sentences} frases · cerca de {minutes} min · {speakers} vozes",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "Traduzir esta transcrição",
  "translate.go": "Traduzir — {price}",
  "translate.englishIsFree":
    "Inglês é grátis: transcreva de novo com “traduzir para o inglês” em Privacidade.",
  "translate.batches": "{lines} linhas, em lotes de {size}.",
  "translate.progress": "Traduzindo {from}–{to} de {total}…",
  "translate.done": "Traduzido. ",
  "translate.open": "Abrir “{title}”",
  "translate.note":
    "A tradução é salva como uma nota separada, então a transcrição original e suas marcações de tempo ficam intactas. Se um lote voltar com o número errado de linhas, ele é rejeitado em vez de aplicado, e você não é cobrado por ele.",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "Biblioteca",
  "library.record": "Gravar",
  "library.open": "Abrir um arquivo",
  "library.durable":
    "Guardado neste navegador, só neste aparelho. Nada é sincronizado e não há cópia em nenhum outro lugar.",
  "library.memory":
    "Mantido só na memória — nada está sendo escrito em disco, então esta lista esvazia quando você fechar a aba.",
  "library.searchPlaceholder": "Buscar em tudo que você gravou",
  "library.searchPlaceholderCount": "Buscar em tudo que você gravou ({lines} linhas)",
  "library.noMatch": "Nada corresponde.",
  "library.empty": "Nada aqui ainda. Grave uma reunião ou abra um arquivo pela tela de início.",
  "library.voices": "{count} vozes",
  "library.oneVoice": "1 voz",
  "library.audioKept": "áudio mantido",
  "library.transcriptOnly": "só transcrição",
  "library.hasMinutes": "ata por IA",
  "library.daysLeft": "faltam {days} d",
  "library.expiring": "expirando",
  "library.deletedOn": "Excluído em {date}",
  "library.retentionHeading": "Por quanto tempo isto é guardado",
  "library.retentionNote":
    "Conferido toda vez que você abre o aplicativo, não por um temporizador — então nada sobrevive ao prazo que você escolheu só porque você não apareceu.",
  "library.retention.session": "Até eu fechar esta aba",
  "library.retention.sessionHint": "Nada é escrito em disco.",
  "library.retention.7d": "7 dias",
  "library.retention.30d": "30 dias",
  "library.retention.90d": "90 dias",
  "library.retention.90dHint": "O padrão.",
  "library.retention.forever": "Até eu excluir",
  "library.retention.foreverHint": "Nada expira sozinho.",
  "library.movedToMemory": "Movido para a memória. O banco de dados em disco foi esvaziado.",
  "library.retentionRemoved":
    "{count} notas estavam além do novo limite e foram excluídas.",
  "library.dataHeading": "Seus dados",
  "library.dataNote":
    "Se este aparelho tem a única cópia, você precisa conseguir levá-la para outro lugar sem pedir para a gente. É para isso que servem estas opções.",
  "library.exportAll": "Exportar tudo",
  "library.importAll": "Importar uma exportação",
  "library.deleteAll": "Excluir tudo",
  "library.deleteAllConfirm":
    "Excluir todas as {count} gravações e suas transcrições? Isso não dá para desfazer.",
  "library.restored": "{count} restauradas.",
  "library.exportNote":
    "A exportação é toda transcrição, resumo e registro de consentimento num único arquivo JSON. O áudio não vai junto, porque deixaria o arquivo enorme — baixe uma gravação pela página dela.",
  "library.notAnExport": "Esse não é um arquivo de exportação do OpenNoteTaker.",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "Perguntar através das suas reuniões",
  "ask.lede": "Buscando em {notes} gravações — {lines} linhas, indexadas aqui nesta aba.",
  "ask.ledeEmpty":
    "Nada gravado ainda. Isto busca em tudo na sua biblioteca assim que houver alguma coisa nela.",
  "ask.placeholder": "O que a gente decidiu sobre a migração da hospedagem?",
  "ask.found":
    "{count} momentos das suas gravações parecem relevantes. Achá-los não custou nada e aconteceu neste aparelho.",
  "ask.andMore": "…e mais {count}, todos os quais seriam enviados.",
  "ask.nothing": "Nada nas suas gravações corresponde a isso.",
  "ask.answer": "Mandar responder — {price}",
  "ask.thinking": "Pensando…",
  "ask.sources": "De onde isso veio",
  "ask.noCitations": "A resposta não citou nada, então confira com os trechos acima.",
  "ask.charged": "Cobrado {charged}. Você tem {balance} restantes.",
  "ask.splitHeading": "Como isto se divide",
  "ask.splitBody":
    "A busca é grátis e roda neste aparelho, sobre um índice construído das suas próprias transcrições. Só a resposta custa alguma coisa, e só os trechos mostrados acima são enviados — nunca as suas gravações, e nunca o resto da sua biblioteca.",
  "ask.splitNote":
    "O preço não cresce com o tamanho da sua biblioteca: o número de trechos enviados tem um teto, então uma pergunta custa mais ou menos o mesmo na sua quingentésima reunião e na sua quinta.",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "O que sai deste aparelho",
  "privacy.lede":
    "Quatro servidores, e este aplicativo só consegue contatá-los pelos motivos abaixo. Abra o painel de rede do seu navegador e confira.",
  "privacy.tableHeading": "Toda requisição que este aplicativo pode fazer",
  "privacy.host": "Servidor",
  "privacy.when": "Quando",
  "privacy.what": "O que vai dentro",
  "privacy.thisSite": "este site",
  "privacy.hfWhen":
    "Na primeira vez que você transcreve com um dado modelo, e nunca mais — o navegador guarda em cache.",
  "privacy.hfWhat": "Nada seu. É um download: os pesos do modelo vêm para você.",
  "privacy.siteWhen": "Ao carregar a página, e para o ambiente ONNX que o modelo precisa.",
  "privacy.siteWhat":
    "Nada seu. Servido daqui de propósito, para esse ambiente não virar um segundo terceiro silencioso.",
  "privacy.authWhen":
    "Quando você abre a página Conta — ela pergunta quais formas de entrar existem — e depois, enquanto você estiver conectado, para ler seu saldo.",
  "privacy.authWhat": "Sua forma de entrar e seu saldo. Transcrições, nunca.",
  "privacy.gatewayWhen": "Só quando você aperta um botão que mostra um preço.",
  "privacy.gatewayWhat":
    "O texto da transcrição ou dos trechos que aquele botão nomeia, e nada mais. Áudio, nunca.",
  "privacy.noTrackers":
    "Nesta página não há script de análise, nem gerenciador de tags, nem relator de erros, nem CDN de fontes. Dá para conferir vendo o código-fonte, e por isso vale a pena dizer.",
  "privacy.testedClaim":
    "Gravar, transcrever, distinguir vozes, buscar, resumir neste aparelho e todas as exportações não fazem requisição nenhuma. O próprio teste da compilação verifica isso: ele percorre cada uma dessas telas e falha se a página contatar qualquer coisa.",
  "privacy.audioHeading": "O áudio não vai a lugar nenhum",
  "privacy.audioBody":
    "Nem como envio, nem como amostra, nem para melhorar um modelo. Os caminhos pagos levam texto — a transcrição que você já tem e consegue ler. Isso é uma propriedade do que a requisição carrega, não uma política que a gente pudesse mudar em silêncio: o corpo da requisição fica na tela antes de você enviar, em “exatamente o que seria enviado”.",
  "privacy.audioNote":
    "A gravação é decodificada e transcrita por WebAssembly rodando nesta aba, no seu processador ou na sua GPU.",
  "privacy.storedHeading": "O que é guardado, e onde",
  "privacy.storedBody":
    "{count} gravações no armazenamento do próprio navegador, neste aparelho. Cerca de {size}. Não há cópia em servidor e nada é sincronizado.",
  "privacy.storedNothing":
    "Nada está sendo escrito em disco — a biblioteca está na memória e some quando você fecha a aba.",
  "privacy.changeRetention": "Mudar por quanto tempo é guardado",
  "privacy.redactHeading": "Antes de qualquer coisa ser enviada",
  "privacy.redactLabel": "Tirar os segredos óbvios antes",
  "privacy.redactHint":
    "Substitui {kinds} por um marcador antes de montar uma requisição paga.",
  "privacy.redactNote":
    "Isto pega padrões bem formados. Não vai pegar um número de cartão ditado por extenso, e não é um controle de conformidade — é um padrão sensato para o único momento em que um texto sai desta máquina. Da sua própria cópia nada é ocultado.",
  "privacy.recordingHeading": "Como as gravações são feitas",
  "privacy.keepAudio": "Manter o áudio além da transcrição",
  "privacy.keepAudioHint":
    "Desligado por padrão. A transcrição é para o que o aplicativo serve; o áudio é a parte grande e sensível que você raramente abre de novo. Mantê-lo é o que permite ouvir de novo e recalcular quem fala.",
  "privacy.diarize": "Descobrir quem está falando",
  "privacy.diarizeHint": "Roda aqui, leva alguns segundos a mais e não precisa baixar modelo nenhum.",
  "privacy.modelHeading": "O modelo de fala",
  "privacy.modelNote":
    "Baixado do Hugging Face uma vez e guardado em cache pelo seu navegador. Depois disso, a transcrição funciona sem rede nenhuma.",
  "privacy.languageHeading": "O idioma da gravação",
  "language.none": "Sem segundo idioma",
  "common.listJoin": " e ",
  "privacy.secondLanguageHint":
    "Os dois idiomas são escutados, e cada trecho é transcrito naquele que está sendo falado de fato. Nomeá-los impede que a detecção escorregue para um terceiro.",
  "run.listeningForLanguage": "Escutando para saber o idioma",
  "run.rereading": "Relendo {seconds}s — o reconhecedor pulou esse trecho",
  "privacy.languageHint":
    "O Whisper dá conta de 99. Deixe na detecção automática, a não ser que ele continue errando.",
  "privacy.translateToEnglish": "Traduzir para o inglês enquanto transcreve",
  "privacy.translateHint":
    "É a tradução do próprio Whisper, então roda aqui e não custa nada. Para qualquer outro idioma de destino, use “Traduzir esta transcrição” numa nota, que é um recurso pago.",
  "privacy.selfHostHeading": "Rodar você mesmo",
  "privacy.selfHostBody":
    "Este aplicativo são arquivos estáticos mais um módulo WebAssembly, sem backend. Sirva de uma máquina que você controla, ou abra direto do disco uma versão baixada — as funções gratuitas funcionam dos dois jeitos, e as pagas simplesmente não aparecem a menos que você aponte para um gateway.",
  "privacy.selfHostNote":
    "Nenhum dos onze produtos que comparamos oferece essa combinação. Os que processam localmente exigem instalar um aplicativo; os que abrem no navegador enviam o seu áudio.",
  "privacy.interfaceHeading": "O idioma da interface",
  "privacy.interfaceHint":
    "Muda as palavras do próprio aplicativo e os títulos nos documentos exportados. Não afeta a transcrição, que segue a gravação.",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "Conta",
  "account.lede":
    "Você precisa de uma para exatamente três coisas: atas escritas por IA, perguntas através das suas reuniões e traduzir uma transcrição pronta para um idioma que não seja o inglês. Todo o resto funciona sem entrar na conta, para sempre.",
  "account.signInHeading": "Entrar no OpenNoteTaker",
  "account.signInBody":
    "Uma conta para todos os nossos aplicativos. Aqui quase nada precisa dela — gravar, transcrever, separar vozes, buscar e exportar funcionam sem entrar.",
  "account.creditsHeading": "Créditos",
  "account.creditsNote":
    "{packCredits} créditos custam {packPrice} — {each} cada um. Eles não expiram, não se renovam, e não há assinatura para cancelar porque não existe assinatura.",
  "account.costHeading": "Quanto custa cada coisa",
  "account.job": "Serviço",
  "account.typical": "Preço típico",
  "account.cost30": "Ata por IA de uma reunião de 30 minutos",
  "account.cost60": "Ata por IA de uma reunião de 60 minutos",
  "account.costAsk": "Uma pergunta em toda a sua biblioteca",
  "account.costNote":
    "Estimativas para uma reunião típica. O preço exato da sua transcrição real está no botão, antes de você apertar — calculado pelo mesmo código que faz a cobrança, então os dois não podem divergir.",
  "account.historyHeading": "Para onde foram seus créditos",
  "account.notHeading": "O que uma conta não faz",
  "account.notBody":
    "Ela não libera transcrição, separação de vozes, exportações, busca nem o resumo feito no seu aparelho — isso roda no seu equipamento e não custa nada para a gente, então cobrar seria cobrar pelo login. Ela também não guarda suas gravações, suas transcrições nem seus títulos: a conta tem uma forma de entrar e um saldo.",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "Entre na conta para usar os recursos de IA. Todo o resto funciona sem conta.",
  "error.signIn": "Entrar",
  "error.insufficient": "Isto precisa de {need} créditos e você tem {have}.",
  "error.topUp": "Recarregar — {price} compra {credits}",
  "error.notConfigured":
    "Os resumos por IA não estão disponíveis agora. O resumo feito no seu aparelho continua funcionando.",
  "error.miscount":
    "A tradução voltou com o número errado de linhas, então foi rejeitada em vez de arriscar dessincronizar a sua transcrição. Você não foi cobrado, então tente de novo.",
  "error.emptyReply": "O modelo não devolveu nada aproveitável. Você não foi cobrado, então tente de novo.",
  "error.unreachable": "Não foi possível alcançar o serviço de IA. Você não foi cobrado.",
  "error.tooLarge": "Essa requisição era grande demais. Resuma um trecho mais curto.",
  "error.status": "O serviço de IA devolveu {status}.",
  "error.micDenied":
    "A permissão foi negada. Libere o acesso ao microfone para este site na barra de endereços do navegador e tente de novo.",
  "error.micMissing": "Nenhum microfone foi encontrado. Conecte um, ou grave o áudio de uma aba.",
  "error.micBusy": "O microfone está em uso por outro aplicativo. Feche-o e tente de novo.",
  "error.alreadyRecording": "Já está gravando.",
  "error.notRecording": "Não está gravando.",
  "error.nothingRecorded": "Não foi possível gravar nada. Confira as permissões do navegador.",
  "error.noTabAudio":
    "Este navegador não compartilha o áudio de uma aba com uma página. Gravando só o microfone — o que ainda capta uma chamada no viva-voz.",
  "error.tabAudioUnticked":
    "Nenhum áudio de aba foi compartilhado — a caixa “compartilhar áudio da aba” não estava marcada. Gravando só o microfone.",
  "error.tabAudioDeclined": "O áudio da aba não foi compartilhado. Gravando só o microfone.",
  "error.handoffExpired":
    "O atalho vindo da aba da reunião expirou. Escolha a aba da reunião na janela de compartilhamento e marque “compartilhar áudio da aba”.",
  "error.inputGone":
    "Essa entrada não está mais disponível. Escolha outra, ou grave a padrão do sistema.",
  "error.recorderStopped": "A gravação parou de forma inesperada.",
  "error.undecodable":
    "Não foi possível decodificar o áudio deste arquivo. Tente um MP3, WAV, M4A, WebM ou MP4.",
  "error.noAudioInFile": "Este arquivo não tem áudio.",
  "error.noSpeech":
    "Nenhuma fala foi reconhecida. Se a gravação não estiver muda, tente um modelo maior.",
  "error.unsupported": "Este navegador não tem suporte a Web Audio.",
  "error.emptyRange": "Esse intervalo está vazio.",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} créditos",
  "common.credit": "1 crédito",
  "language.detect": "Detectar automaticamente",
  "model.tiny": "O mais rápido. Serve para uma voz só, bem clara.",
  "model.base": "Um bom padrão para uma reunião. 99 idiomas.",
  "model.small": "Bem melhor com sotaques e com gente falando junto.",
  "model.turbo": "O mais preciso daqui. Precisa de WebGPU e de paciência no primeiro carregamento.",
  "error.libraryOpen": "Não foi possível abrir a biblioteca.",
  "error.libraryBlocked": "A biblioteca está aberta em outra aba.",
  "error.libraryWrite": "A biblioteca recusou uma escrita.",
  "library.exportFileNote": "O áudio não vai junto; exporte uma gravação pela página dela.",
  "format.srt": "Legendas SubRip (.srt)",
  "format.vtt": "Legendas WebVTT (.vtt)",
  "format.text": "Texto simples (.txt)",
  "format.text_timestamped": "Texto com marcações de tempo (.txt)",
  "format.markdown": "Notas em Markdown (.md)",
  "format.json": "JSON (.json)",
  "format.csv": "Planilha (.csv)",
  "format.html": "Página web (.html)",
  "common.importedTitle": "Gravação importada",
};

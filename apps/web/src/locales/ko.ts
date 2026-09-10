// 한국어.
//
// Conventions this follows:
//
// - **Sentences take -습니다, controls take a bare noun.** A button reads
//   녹음 시작 rather than 녹음을 시작합니다 — the polite ending belongs in
//   prose addressed to the reader, not on a control, and mixing the two is
//   the clearest sign copy was translated rather than written.
// - **The consent copy is spoken aloud**, so it is written the way someone
//   would actually say it to a room: -해요체 softened, not the stiff -하십시오
//   form a notice would use.
// - **Loanwords where Korean software uses them** — 브라우저, 탭, 마이크,
//   크레딧 — and native words where it does not: 문서 not 도큐먼트.

import type { Catalogue } from "../lib/i18n";

export const ko: Catalogue = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "시작",
  "nav.library": "보관함",
  "nav.ask": "질문",
  "nav.privacy": "개인정보",
  "nav.account": "계정",
  "nav.language": "언어",
  "shell.starting": "시작하는 중…",
  "shell.recording": "녹음 중",
  "shell.paused": "일시정지됨",
  "shell.goToRecorder": "녹음 화면으로",
  "shell.footerTagline": "OpenNoteTaker — 받아쓰기는 이 기기를 벗어나지 않습니다.",
  "shell.footerPrivacy": "이 기기를 나가는 것",
  "shell.footerSource": "소스 (MIT / Apache-2.0)",
  "shell.startAgain": "다시 시작",
  "shell.somethingWrong": "문제가 발생했습니다.",
  "shell.noticeStorage":
    "이 브라우저는 페이지가 아무것도 저장하지 못하게 막고 있어, 탭을 닫으면 아무것도 남지 않습니다. 나머지는 모두 정상 작동합니다.",
  "shell.noticeExpired":
    "설정하신 보관 기간이 지난 노트 {count}개를 삭제했습니다.",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "통화에 아무도 들어오지 않습니다. 이 기기를 나가는 것도 없습니다.",
  "home.lede":
    "OpenNoteTaker는 이 브라우저 탭 안에서 녹음하고, 받아쓰고, 화자를 구분합니다. 오디오는 업로드되지 않고, 참가자 목록에 봇이 나타나지 않으며, 해지할 구독도 없습니다.",
  "home.record": "회의 녹음하기",
  "home.open": "녹음 파일 열기",
  "home.readyGpu":
    "이 기기에서 사용할 수 있습니다 — GPU를 사용합니다. {model} 모델({size})은 처음 받아쓸 때 한 번만 내려받습니다.",
  "home.readyWasm":
    "이 기기에서 사용할 수 있습니다 — WebAssembly를 사용합니다. {model} 모델({size})은 처음 받아쓸 때 한 번만 내려받습니다.",
  "home.claim1.title": "녹음은 여기에 남습니다",
  "home.claim1.body":
    "음성 인식은 이 탭 안에서, 사용자의 프로세서나 GPU로 돌아갑니다. 내려받는 것은 모델 자체뿐이고 그것도 한 번입니다. 무료 기능에서는 어디로도 아무것도 보내지 않습니다.",
  "home.claim1.link": "이 기기를 나가는 것",
  "home.claim2.title": "묻도록 권합니다",
  "home.claim2.body":
    "녹음은 한 단계의 동의 확인을 거쳐 시작되며, 소리 내어 읽을 문장이 준비되어 있습니다. 합의한 내용은 녹음과 함께 저장되고 모든 내보내기에 인쇄됩니다 — 여섯 주 뒤에도 증거로 남도록.",
  "home.claim3.title": "구독 없음, 예상 밖의 청구 없음",
  "home.claim3.body":
    "받아쓰기, 타임스탬프, 화자 구분, 발언에서 뽑은 요약, 그리고 모든 내보내기 형식은 무료이고 앞으로도 무료입니다 — 저희에게 비용이 들지 않기 때문입니다. AI가 쓰는 글에는 크레딧이 들고, 누르기 전에 정확한 금액이 보입니다.",
  "home.claim3.link": "비용 보기",
  "home.table.heading": "할 수 있는 일",
  "home.table.feature": "기능",
  "home.table.where": "실행 위치",
  "home.table.price": "가격",
  "home.table.inTab": "이 탭 안에서",
  "home.table.ourServer": "저희 서버, 저희 모델 키",
  "home.table.split": "검색은 여기, 답변은 저희 서버",
  "home.table.free": "무료",
  "home.table.credits": "크레딧",
  "home.feature.transcribe": "받아쓰기, 99개 언어",
  "home.feature.timeline": "모든 문장에 타임스탬프",
  "home.feature.speakers": "화자 구분",
  "home.feature.record": "봇 없는 녹음",
  "home.feature.export": "자막, 텍스트, Markdown, JSON, CSV, HTML",
  "home.feature.summary": "주제, 핵심 문장, 할 일, 결정 사항",
  "home.feature.search": "녹음한 모든 것 검색",
  "home.feature.translateFree": "받아쓰면서 번역 (영어로)",
  "home.feature.minutes": "AI가 쓰는 회의록과 할 일",
  "home.feature.ask": "여러 회의를 가로지르는 질문",
  "home.feature.translatePaid": "완성된 받아쓰기를 어떤 언어로든 번역",
  "home.table.note":
    "이 경계선은 포장한 사업적 결정이 아닙니다. 위쪽은 모두 사용자의 하드웨어에서 돌아가 저희에게 비용이 들지 않으므로, 여기에 요금을 매긴다면 그것은 계정에 요금을 매기는 셈입니다. 아래쪽은 저희가 모델 공급사에 실제로 내는 청구서입니다.",
  "home.selfhost.title": "직접 운영하는 서버에서도 돌아갑니다",
  "home.selfhost.body":
    "앱 전체가 정적 파일과 WebAssembly 모듈입니다. 릴리스를 내려받아 열거나, 직접 관리하는 기기에서 제공하세요 — 모델이 캐시된 뒤에는 무료 기능이 네트워크 없이도 동작합니다.",
  "home.selfhost.note":
    "저장소의 docs/self-hosting.md를 보세요. 비교한 11개 제품 중 이것을 제공하는 곳은 하나도 없습니다. 로컬에서 처리하는 쪽은 모두 무언가를 설치하게 하고, 브라우저에서 여는 쪽은 모두 오디오를 업로드합니다.",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "이 녹음은 이 기기에 남습니다. 받아쓰기도 이 브라우저 안에서 이루어지며 어디로도 업로드되지 않습니다. 목소리가 들어갈 수 있는 모든 분께 녹음 중임을 알렸습니다.",
  "consent.script":
    "시작하기 전에 한 가지만요 — 이거 녹음하면서 메모를 남기려고 합니다. 녹음은 제 기기에만 남습니다. 다들 괜찮으실까요?",
  "consent.method.announced": "그 자리에서 말로 알렸다",
  "consent.method.announcedHint": "보통은 이쪽입니다. 위 문장을 그대로 읽으셔도 됩니다.",
  "consent.method.written": "서면으로 합의되어 있다",
  "consent.method.writtenHint": "캘린더 메모, 메시지, 모두가 본 사내 방침 등.",
  "consent.method.solo": "저 혼자입니다",
  "consent.method.soloHint": "음성 메모, 연습, 다른 사람이 없는 통화.",
  "consent.record.at": "{at}에 녹음.",
  "consent.record.solo": "다른 사람은 없었습니다.",
  "consent.record.method": "동의: {method}.",
  "consent.record.present": "참석: {names}.",
  "consent.record.captured": "수록: {sources}.",
  "consent.record.told": "그 자리의 모든 사람에게 알린 내용: “{disclosure}”",
  "record.title": "녹음하기 전에",
  "record.lede": "한 화면, 한 번. 대부분의 도구가 빼놓는 부분이 바로 이것입니다.",
  "record.scriptHeading": "도움이 된다면 그대로 읽으세요",
  "record.scriptNote":
    "묻는 일의 어려움은 동의를 얻는 데 있지 않습니다 — 여덟 명이 기다리는 동안 말을 찾는 데 있습니다.",
  "record.whoHeading": "이 대화에 누가 있나요",
  "record.whoHint":
    "선택 사항이고 여기에만 저장됩니다. 기록과 내보낸 노트에 들어갑니다.",
  "record.whoPlaceholder": "김 팀장, 이 대리, 고객사 두 분",
  "record.afterHeading": "녹음이 끝난 뒤",
  "record.keepAudio": "받아쓰기만이 아니라 녹음도 보관하기",
  "record.keepAudioHint":
    "이 브라우저에만 저장되고 노트와 함께 삭제됩니다. 더 크고 더 민감한 쪽이라서, 요청하지 않으면 보관하지 않습니다.",
  "record.keepAudioWarning":
    "노트를 닫으면 오디오는 버려집니다. 받아쓰기가 잘못 나오면 — 예상하지 못한 언어, 두 사람이 한 사람으로 합쳐짐 — 다시 돌릴 재료가 남지 않습니다.",
  "record.sourcesHeading": "무엇을 녹음할까요",
  "record.source.mic": "마이크",
  "record.source.micHint": "본인과 같은 공간에 있는 사람들.",
  "record.source.tab": "탭이나 창의 소리",
  "record.source.tabHint":
    "화상 통화에 있는 모든 사람. 어느 탭인지 물어보며, “탭 오디오 공유”를 반드시 체크해야 합니다.",
  "record.source.tabUnsupported":
    "이 브라우저는 탭 오디오를 페이지에 공유하지 않습니다. Chrome이나 Edge에서는 됩니다.",
  "record.micOnlyOnACall":
    "마이크만 녹음하는 것은 같은 공간의 회의라면 괜찮습니다. 통화에서는 다릅니다. 브라우저가 스피커로 나온 소리를 제거하므로, 상대방 목소리는 작아지는 게 아니라 아예 상쇄됩니다. 탭도 함께 체크하거나 루프백 입력을 녹음하세요.",
  "record.inputs.heading": "어느 입력을 쓸지",
  "record.inputs.add": "마이크 추가",
  "record.inputs.switched": "{input}에서 녹음 중입니다.",
  "record.inputs.liveHint":
    "변경은 즉시 적용되며 녹음에 끊김을 남기지 않습니다 — 파일은 한 덩어리로 이어집니다.",
  "record.inputs.reveal": "입력 선택",
  "record.inputs.label": "입력",
  "record.inputs.default": "시스템 기본값",
  "record.inputs.none": "이 브라우저는 입력 이름을 알려주지 않습니다. 기본 입력으로는 녹음됩니다.",
  "record.inputs.clean": "소리 다듬기",
  "record.inputs.cleanHint":
    "에코 제거, 잡음 억제, 자동 이득. 공간의 마이크에는 알맞지만, 루프백 장치나 믹서에서는 제거할 것이 없어 받은 소리를 눈에 띄게 망가뜨리므로 꺼 두세요.",
  "record.source.handedTab": "{platform} 탭",
  "record.source.handedTabHint":
    "감지 기능이 넘겨주었으므로 고를 탭도, 체크할 상자도 없습니다.",
  "record.detectorOn":
    "회의 감지 확장이 설치되어 있어, 통화에 들어가면 이 화면이 저절로 열립니다.",
  "record.handoffHeading": "{platform} 통화에서 열림",
  "record.handoffDirect":
    "그 탭의 소리는 이미 선택되어 있습니다. 시작을 누르기 전에는 아무것도 수록되지 않고, 누른 뒤에도 이 브라우저를 나가는 것은 없습니다.",
  "record.handoffPicker":
    "그 탭으로 가는 지름길이 만료되어, 어느 탭을 공유할지 묻게 됩니다. “탭 오디오 공유”를 체크하세요.",
  "record.agreeHeading": "동의하시는 내용",
  "record.agreeNote":
    "이 녹음과 함께 한 글자도 바꾸지 않고 저장되므로, 나중에 이 문구를 바꾸더라도 지금 동의한 내용은 달라지지 않습니다.",
  "record.pickOne": "녹음할 대상을 최소 하나 선택하세요.",
  "record.start": "녹음 시작",
  "record.cancel": "취소",
  "record.capturing": "{sources} 수록 중",
  "record.mic": "마이크",
  "record.tab": "공유 중인 탭",
  "record.pause": "일시정지",
  "record.resume": "다시 시작",
  "record.finish": "끝내고 받아쓰기",
  "record.levelHint":
    "저 막대가 전혀 움직이지 않으면 아무것도 들리지 않는 것입니다 — 회의가 끝난 뒤에 알아차리기 전에 마이크를 확인하세요.",
  "record.nameLabel": "지금 이름 붙이기, 또는 나중에",
  "record.namePlaceholder": "무슨 회의인가요",
  "record.nameNote":
    "이 기기를 나간 것은 없고 앞으로도 없습니다. 받아쓰기는 끝낼 때 시작되며 여기서 돌아갑니다.",
  "record.discard": "녹음 버리기",
  "record.discardConfirm": "이 녹음을 버릴까요? 되돌릴 수 없습니다.",
  "record.defaultTitle": "녹음, {when}",
  "record.tabEnded":
    "공유하던 탭이 멈췄습니다. 지금까지 녹음된 것을 남기려면 지금 끝내세요.",
  "record.consentHeading": "동의 기록",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "준비하는 중…",
  "run.reading": "파일을 읽는 중",
  "run.decoding": "오디오를 디코딩하는 중",
  "run.ready": "준비됨",
  "run.loadingModel": "음성 모델을 불러오는 중",
  "run.downloadingModel": "음성 모델을 내려받는 중 ({percent}%)",
  "run.listeningShort": "1분 미만의 오디오를 듣는 중",
  "run.listening": "{minutes}분 분량의 오디오를 듣는 중",
  "run.diarizing": "누가 말했는지 가려내는 중",
  "run.summarising": "주제와 할 일을 뽑아내는 중",
  "run.modelNote":
    "음성 모델은 한 번만 내려받고 이후에는 브라우저가 캐시합니다. 업로드는 없습니다.",
  "run.localNote":
    "이것은 사용자의 기기에서 돌아갑니다. 이 탭을 뒤로 두면 느려지고, 닫으면 멈춥니다.",
  "run.failedTitle": "잘 되지 않았습니다",
  "run.failedNote":
    "아무것도 업로드되지 않았고 저장되지도 않았습니다. 녹음이 무음이 아니라면, 개인정보 화면에서 더 큰 모델을 쓰면 해결되는 경우가 많습니다.",
  "run.back": "처음으로",
  "run.cancel": "취소",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "그 녹음은 여기에 없습니다",
  "note.missingBody":
    "설정하신 보관 기간이 지났거나, 다른 기기에서 열렸을 수 있습니다 — 어디로도 동기화하지 않습니다.",
  "note.backToLibrary": "보관함으로",
  "note.titleLabel": "제목",
  "note.metaDetected": "{language} 감지됨",
  "note.metaLines": "{count}줄",
  "note.metaRecorded": "여기서 녹음",
  "note.metaImported": "가져옴",
  "note.noAudio":
    "녹음 자체는 보관되지 않았습니다 — 이 받아쓰기만 있습니다. 다시 들으시려면 개인정보 화면에서 “오디오 보관”을 켜세요.",
  "note.whoHeading": "누가 말하고 있는지",
  "note.speakerAuto": "알아서 판단",
  "note.speakerCount": "{count}명",
  "note.speakerOne": "1명",
  "note.rediarize": "화자를 다시 가려내기",
  "note.rediarizeNoAudio":
    "오디오가 보관되지 않아 화자를 다시 가려낼 수 없습니다.",
  "note.rediarizeRunning": "다시 듣는 중…",
  "note.rediarizeDone": "{count}개의 목소리",
  "note.rediarizeUnassigned": ", {count}줄은 너무 짧아 구분할 수 없습니다",
  "note.speakerNote":
    "화자는 이 기기에서 각자의 목소리로 구분합니다. 목소리가 뚜렷이 다른 두세 명이면 잘 되지만, 비슷한 목소리, 말 겹침, 도중에 마이크를 바꾼 사람에는 약합니다. 그 자리에 있던 사람보다 많이 — 또는 적게 — 잡혔다면 위에서 인원 수를 지정하고 다시 가려내세요. 받아쓰기의 이름을 누르면 그 한 줄만 다른 사람에게 옮길 수 있습니다.",
  "note.transcriptHeading": "받아쓰기",
  "note.findPlaceholder": "이 받아쓰기에서 찾기",
  "note.playFromHere": "여기서부터 재생",
  "note.reassign": "이 줄을 다른 사람에게 배정",
  "note.split": "나누기",
  "note.splitHint": "이 줄을 가운데에서 둘로 나눕니다",
  "note.speakerNameFor": "{name}의 이름",
  "note.recordingHeading": "이 녹음",
  "note.downloadAudio": "오디오 내려받기",
  "note.transcribeAgain": "다시 받아쓰기",
  "note.transcribeAgainConfirm":
    "이 녹음을 다시 받아쓸까요? 지금의 받아쓰기, 화자 이름표, 손댄 내용이 모두 대체됩니다. 오디오는 남습니다.",
  "note.deleteAudio": "오디오를 지우고 받아쓰기는 남기기",
  "note.deleteAudioConfirm":
    "오디오를 지우고 받아쓰기를 남길까요? 되돌릴 수 없습니다.",
  "note.deleteAll": "전부 삭제",
  "note.deleteAllConfirm": "“{title}”을(를) 완전히 삭제할까요? 되돌릴 수 없습니다.",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "말한 내용에서",
  "summary.freeBadge": "이 기기에서 생성 · 무료",
  "summary.redo": "다시",
  "summary.empty": "눈에 띄는 것이 없었습니다 — 주제를 찾기에는 받아쓰기가 너무 짧을 수 있습니다.",
  "summary.stats": "{sentences}문장 · 약 {minutes}분 · {speakers}명",
  "summary.topics": "주제: ",
  "summary.keyPoints": "핵심 내용",
  "summary.decisions": "결정 사항",
  "summary.actionItems": "할 일",
  "summary.questionsAsked": "나온 질문",
  "summary.questionsOpen": "미해결 질문",
  "summary.whoTalked": "누가 말했는지",
  "summary.freeNote":
    "위의 각 줄은 말한 시각과 함께 받아쓰기에서 그대로 인용한 것입니다. 여기에 모델이 쓴 문장은 없고, 어느 것도 이 기기를 나가지 않았습니다.",
  "summary.cueLanguages":
    "할 일, 결정 사항, 기한은 {languages}에서 인식됩니다. 주제와 핵심 문장은 모든 언어에서 작동합니다.",
  "summary.paidHeading": "AI가 쓴 것",
  "summary.paidBought": "결제됨 · 이미 구매함",
  "summary.paidBody":
    "모델이 받아쓰기를 읽고 회의록을 씁니다. 무엇에 대한 회의였는지, 무엇이 정해졌는지, 누가 언제까지 무엇을 하는지. 위 패널과 달리 인용이 아니라 새로 쓴 문장이며 — 확인하실 수 있도록 각각에 시각이 붙습니다.",
  "summary.steer": "선택 지시",
  "summary.steerPlaceholder": "특별히 원하는 게 있나요? 예: “고객이 요청한 것에 집중”",
  "summary.write": "회의록 쓰기 — {price}",
  "summary.writing": "회의록을 쓰는 중…",
  "summary.discard": "버리고 다시 쓰기",
  "summary.signInFirst": "먼저 로그인하세요",
  "summary.balance": "잔액 {credits}",
  "summary.revealOne": "보내질 내용 그대로 — 요청 1건, 텍스트만, 오디오 없음",
  "summary.revealMany": "보내질 내용 그대로 — 요청 {count}건, 텍스트만, 오디오 없음",
  "summary.redactNone":
    "이메일 주소, 전화번호, 긴 숫자, 링크처럼 보이는 것이 없어 이대로 보냅니다.",
  "summary.redactSome":
    "보내기 전에 {items}이(가) 대체됩니다. 개인정보 화면에서 끌 수 있습니다.",
  "summary.redactOff":
    "보내기 전 가리기가 개인정보 화면에서 꺼져 있어 이대로 보냅니다.",
  "summary.moreChars": "… 그리고 {count}자 더",
  "summary.paidNote":
    "성공했을 때 한 번만 청구됩니다. 반복 결제도, 해지할 것도 없고, 실패한 요청에는 비용이 들지 않습니다.",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "내보내기",
  "export.download": "내려받기",
  "export.copy": "복사",
  "export.withSpeakers": "누가 말했는지 포함",
  "export.withSummary": "요약 포함",
  "export.withConsent": "동의 기록 포함",
  "export.note":
    "모든 형식이 언제까지나 무료입니다. 이미 이 탭에 있는 데이터를 글자로 배치하는 것일 뿐이라, 드리는 데 비용이 드는 것이 없습니다.",
  "export.clip": "일부 잘라내기",
  "export.clipFrom": "시작",
  "export.clipTo": "끝",
  "export.clipWords": "글",
  "export.clipSound": "소리",
  "export.clipBadRange": "끝은 시작보다 뒤여야 합니다.",
  "export.clipCutting": "잘라내는 중…",
  "export.clipDone": "완료했습니다.",
  "export.clipNote": "둘 다 이 기기에서 잘립니다. 잘라내기를 위해 업로드하는 것은 없습니다.",
  "export.excerptTitle": "{title} (발췌)",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "요약",
  "export.label.keyPoints": "핵심 내용",
  "export.label.decisions": "결정 사항",
  "export.label.actionItems": "할 일",
  "export.label.questionsAsked": "나온 질문",
  "export.label.questionsOpen": "미해결 질문",
  "export.label.topics": "주제",
  "export.label.whoSpoke": "발언자",
  "export.label.transcript": "받아쓰기",
  "export.label.consent": "녹음 동의",
  "export.label.unknown": "알 수 없음",
  "export.label.due": "기한",
  "export.label.stats": "{sentences}문장 · 약 {minutes}분 · {speakers}명",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "이 받아쓰기 번역하기",
  "translate.go": "번역 — {price}",
  "translate.englishIsFree":
    "영어는 무료입니다. 대신 개인정보 화면의 “영어로 번역하며 받아쓰기”로 다시 받아쓰세요.",
  "translate.batches": "{lines}줄을 {size}줄씩 묶어 처리합니다.",
  "translate.progress": "전체 {total}줄 중 {from}–{to}을(를) 번역하는 중…",
  "translate.done": "번역했습니다. ",
  "translate.open": "“{title}” 열기",
  "translate.note":
    "번역은 별도의 노트로 저장되므로 원래 받아쓰기와 그 시각은 그대로 남습니다. 한 묶음이 줄 수가 맞지 않게 돌아오면 적용하지 않고 거부하며, 그에 대한 비용도 청구하지 않습니다.",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "보관함",
  "library.record": "녹음",
  "library.open": "파일 열기",
  "library.durable":
    "이 브라우저의, 이 기기에만 저장되어 있습니다. 동기화하지 않으며 다른 어디에도 사본이 없습니다.",
  "library.memory":
    "메모리에만 있습니다 — 디스크에 아무것도 쓰지 않으므로 탭을 닫으면 이 목록은 비워집니다.",
  "library.searchPlaceholder": "녹음한 모든 것 검색",
  "library.searchPlaceholderCount": "녹음한 모든 것 검색 ({lines}줄)",
  "library.noMatch": "일치하는 것이 없습니다.",
  "library.empty": "아직 아무것도 없습니다. 시작 화면에서 회의를 녹음하거나 파일을 여세요.",
  "library.voices": "{count}개의 목소리",
  "library.oneVoice": "1개의 목소리",
  "library.audioKept": "오디오 보관됨",
  "library.transcriptOnly": "받아쓰기만",
  "library.hasMinutes": "AI 회의록",
  "library.daysLeft": "{days}일 남음",
  "library.expiring": "곧 만료",
  "library.deletedOn": "{date}에 삭제됨",
  "library.retentionHeading": "얼마나 보관할지",
  "library.retentionNote":
    "타이머가 아니라 앱을 열 때마다 확인합니다 — 한동안 들르지 않았다는 이유만으로 정하신 기간보다 오래 남아 있지 않습니다.",
  "library.retention.session": "이 탭을 닫을 때까지",
  "library.retention.sessionHint": "디스크에는 전혀 쓰지 않습니다.",
  "library.retention.7d": "7일",
  "library.retention.30d": "30일",
  "library.retention.90d": "90일",
  "library.retention.90dHint": "기본값입니다.",
  "library.retention.forever": "직접 지울 때까지",
  "library.retention.foreverHint": "저절로 만료되는 것은 없습니다.",
  "library.movedToMemory": "메모리로 옮겼습니다. 디스크의 데이터베이스는 비웠습니다.",
  "library.retentionRemoved":
    "새 한도를 넘긴 노트 {count}개를 삭제했습니다.",
  "library.dataHeading": "사용자의 데이터",
  "library.dataNote":
    "유일한 사본이 이 기기에 있다면, 저희에게 묻지 않고도 다른 곳으로 가져갈 수 있어야 합니다. 이것들이 그 역할을 합니다.",
  "library.exportAll": "전부 내보내기",
  "library.importAll": "내보낸 파일 가져오기",
  "library.deleteAll": "전부 삭제",
  "library.deleteAllConfirm":
    "녹음 {count}개와 그 받아쓰기를 모두 삭제할까요? 되돌릴 수 없습니다.",
  "library.restored": "{count}개를 복원했습니다.",
  "library.exportNote":
    "내보내기에는 모든 받아쓰기, 요약, 동의 기록이 하나의 JSON 파일로 담깁니다. 파일이 너무 커지므로 오디오는 포함되지 않습니다 — 녹음은 각자의 페이지에서 내려받으세요.",
  "library.notAnExport": "이것은 OpenNoteTaker 내보내기 파일이 아닙니다.",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "여러 회의를 가로질러 질문하기",
  "ask.lede": "녹음 {notes}개, {lines}줄을 검색합니다 — 색인은 이 탭 안에서 만들어졌습니다.",
  "ask.ledeEmpty":
    "아직 녹음이 없습니다. 보관함에 무언가 들어오면 그 전부를 검색합니다.",
  "ask.placeholder": "호스팅 이전에 대해 우리가 뭘 정했죠?",
  "ask.found":
    "녹음 안의 {count}개 지점이 관련 있어 보입니다. 찾는 데 비용은 들지 않았고 이 기기에서 이루어졌습니다.",
  "ask.andMore": "…그리고 {count}개 더. 모두 함께 보내집니다.",
  "ask.nothing": "녹음 중 일치하는 것이 없습니다.",
  "ask.answer": "답변받기 — {price}",
  "ask.thinking": "생각하는 중…",
  "ask.sources": "근거가 된 곳",
  "ask.noCitations": "답변이 아무것도 인용하지 않았으니 위의 발췌와 대조해 확인하세요.",
  "ask.charged": "{charged}을(를) 청구했습니다. 잔액은 {balance}입니다.",
  "ask.splitHeading": "어디서 무엇이 이루어지는지",
  "ask.splitBody":
    "검색은 무료이며, 사용자의 받아쓰기로 만든 색인을 써서 이 기기에서 이루어집니다. 비용이 드는 것은 답변뿐이고, 보내지는 것은 위에 보이는 발췌뿐입니다 — 녹음도, 보관함의 나머지도 보내지 않습니다.",
  "ask.splitNote":
    "가격은 보관함 크기에 따라 늘지 않습니다. 보내는 발췌 수에 상한이 있어, 500번째 회의에서도 다섯 번째와 거의 같은 비용입니다.",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "이 기기를 나가는 것",
  "privacy.lede":
    "호스트는 넷이며, 이 앱이 연결할 수 있는 것은 아래 이유일 때뿐입니다. 브라우저의 네트워크 패널을 열어 확인해 보세요.",
  "privacy.tableHeading": "이 앱이 보낼 수 있는 모든 요청",
  "privacy.host": "호스트",
  "privacy.when": "언제",
  "privacy.what": "무엇이 담기는지",
  "privacy.thisSite": "이 사이트",
  "privacy.hfWhen":
    "특정 모델로 처음 받아쓸 때 한 번뿐이고 이후에는 없습니다 — 브라우저가 캐시합니다.",
  "privacy.hfWhat": "사용자의 것은 없습니다. 내려받기이며, 모델 가중치가 이쪽으로 올 뿐입니다.",
  "privacy.siteWhen": "페이지를 불러올 때와, 모델에 필요한 ONNX 런타임을 받을 때.",
  "privacy.siteWhat":
    "사용자의 것은 없습니다. 런타임이 두 번째의 보이지 않는 제3자가 되지 않도록 일부러 여기서 제공합니다.",
  "privacy.authWhen":
    "계정 화면을 열 때 — 어떤 로그인 방법이 있는지 묻습니다 — 그리고 이후 로그인해 있는 동안 잔액을 읽기 위해.",
  "privacy.authWhat": "로그인 방법과 잔액. 받아쓰기는 결코 보내지 않습니다.",
  "privacy.gatewayWhen": "가격이 적힌 버튼을 눌렀을 때만.",
  "privacy.gatewayWhat":
    "그 버튼이 가리키는 받아쓰기나 발췌의 글자뿐이며, 그 밖에는 없습니다. 오디오는 결코 보내지 않습니다.",
  "privacy.noTrackers":
    "이 페이지에는 분석 스크립트도, 태그 관리자도, 오류 수집기도, 폰트 CDN도 없습니다. 소스 보기로 확인할 수 있으며, 그래서 말할 가치가 있습니다.",
  "privacy.testedClaim":
    "녹음, 받아쓰기, 화자 구분, 검색, 이 기기에서의 요약, 그리고 모든 내보내기는 아무 요청도 보내지 않습니다. 빌드 자체의 테스트가 이를 검증합니다. 각 화면을 실제로 조작하고, 페이지가 어딘가에 연결하면 실패합니다.",
  "privacy.audioHeading": "오디오는 어디로도 가지 않습니다",
  "privacy.audioBody":
    "업로드로도, 표본으로도, 모델 개선을 위해서도 보내지 않습니다. 유료 경로가 다루는 것은 글자 — 이미 손에 있고 읽을 수 있는 받아쓰기입니다. 이것은 정책이 아니라 요청에 무엇이 담기는가의 성질이라, 저희가 조용히 바꿀 수 없습니다. 보내기 전에 “보내질 내용 그대로”에서 요청 본문이 화면에 나옵니다.",
  "privacy.audioNote":
    "녹음은 이 탭에서 돌아가는 WebAssembly가 사용자의 프로세서나 GPU로 디코딩하고 받아씁니다.",
  "privacy.storedHeading": "무엇이 어디에 저장되는지",
  "privacy.storedBody":
    "이 브라우저 자체의 저장소에, 이 기기에 녹음 {count}개. 대략 {size}입니다. 서버 쪽 사본은 없고 동기화하지 않습니다.",
  "privacy.storedNothing":
    "디스크에는 아무것도 쓰지 않고 있습니다 — 보관함은 메모리에 있고 탭을 닫으면 사라집니다.",
  "privacy.changeRetention": "보관 기간 바꾸기",
  "privacy.redactHeading": "무언가를 보내기 전에",
  "privacy.redactLabel": "명백한 비밀은 먼저 걷어내기",
  "privacy.redactHint":
    "유료 요청을 만들기 전에 {kinds}을(를) 자리표시자로 바꿉니다.",
  "privacy.redactNote":
    "형식이 뚜렷한 패턴을 잡아냅니다. 말로 읽은 카드 번호는 잡지 못하며, 컴플라이언스 통제도 아닙니다 — 글자가 이 기기를 떠나는 유일한 순간을 위한 합리적인 기본값입니다. 사용자 본인의 사본에서는 아무것도 가려지지 않습니다.",
  "privacy.recordingHeading": "녹음하는 방식",
  "privacy.keepAudio": "받아쓰기와 함께 오디오도 보관",
  "privacy.keepAudioHint":
    "기본값은 꺼짐입니다. 이 앱의 목적은 받아쓰기이고, 오디오는 크고 민감하며 다시 열어보는 일이 드문 쪽입니다. 보관해 두면 다시 듣기와 화자 판별 재실행이 가능합니다.",
  "privacy.diarize": "누가 말하는지 가려내기",
  "privacy.diarizeHint": "여기서 돌아가고 몇 초가 더 들며, 모델 내려받기는 필요 없습니다.",
  "privacy.modelHeading": "음성 모델",
  "privacy.modelNote":
    "Hugging Face에서 한 번 내려받고 브라우저가 캐시합니다. 그 뒤로는 네트워크 없이도 받아쓰기가 됩니다.",
  "privacy.languageHeading": "녹음되는 언어",
  "language.none": "제2 언어 없음",
  "common.listJoin": "와(과) ",
  "privacy.secondLanguageHint":
    "두 언어를 모두 듣고, 각 구간을 실제로 말해진 언어로 받아씁니다. 지정해 두면 감지가 세 번째 언어로 흘러가는 것을 막습니다.",
  "run.listeningForLanguage": "언어를 가려내는 중",
  "run.rereading": "{seconds}초를 다시 읽는 중 — 인식기가 건너뛴 부분입니다",
  "privacy.languageHint":
    "Whisper는 99개 언어를 다룹니다. 계속 잘못 추측하지 않는 한 자동 감지로 두세요.",
  "privacy.translateToEnglish": "받아쓰면서 영어로 번역",
  "privacy.translateHint":
    "Whisper 자체의 번역이라 여기서 돌아가고 비용이 들지 않습니다. 다른 언어로 옮기려면 노트의 “이 받아쓰기 번역하기”를 쓰세요. 그쪽은 유료입니다.",
  "privacy.selfHostHeading": "직접 운영하기",
  "privacy.selfHostBody":
    "이 앱은 정적 파일과 WebAssembly 모듈뿐이고 백엔드가 없습니다. 직접 관리하는 기기에서 제공하거나, 내려받은 릴리스를 그대로 여세요 — 어느 쪽이든 무료 기능은 동작하고, 게이트웨이를 지정하지 않는 한 유료 기능은 나타나지 않습니다.",
  "privacy.selfHostNote":
    "비교한 11개 제품 중 이 조합을 제공하는 곳은 없습니다. 로컬에서 처리하는 쪽은 모두 애플리케이션 설치를 요구하고, 브라우저에서 여는 쪽은 모두 오디오를 업로드합니다.",
  "privacy.interfaceHeading": "화면의 언어",
  "privacy.interfaceHint":
    "이 앱 자체의 문구와 내보낸 문서의 제목이 바뀝니다. 받아쓰기에는 영향이 없으며, 그쪽은 녹음을 따릅니다.",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "계정",
  "account.lede":
    "필요한 것은 정확히 세 가지뿐입니다. AI가 쓰는 회의록, 여러 회의를 가로지르는 질문, 그리고 완성된 받아쓰기를 영어가 아닌 언어로 번역하는 것. 나머지는 로그인 없이 언제까지나 됩니다.",
  "account.signInHeading": "OpenNoteTaker에 로그인",
  "account.signInBody":
    "저희 앱들이 함께 쓰는 계정입니다. 여기서는 거의 필요하지 않습니다 — 녹음, 받아쓰기, 화자, 검색, 내보내기는 로그인 없이 동작합니다.",
  "account.creditsHeading": "크레딧",
  "account.creditsNote":
    "{packCredits} 크레딧에 {packPrice} — 개당 {each}입니다. 유효기간이 없고, 자동 갱신도 없으며, 구독이 없으니 해지할 것도 없습니다.",
  "account.costHeading": "비용 안내",
  "account.job": "작업",
  "account.typical": "대략적인 가격",
  "account.cost30": "30분 회의의 AI 회의록",
  "account.cost60": "60분 회의의 AI 회의록",
  "account.costAsk": "보관함 전체에 대한 질문 1회",
  "account.costNote":
    "일반적인 회의 기준의 추정치입니다. 실제 받아쓰기에 대한 정확한 가격은 누르기 전에 버튼에 나옵니다 — 청구와 같은 코드로 계산하므로 둘이 어긋날 수 없습니다.",
  "account.historyHeading": "크레딧을 어디에 썼는지",
  "account.notHeading": "계정으로 할 수 없는 것",
  "account.notBody":
    "받아쓰기, 화자 구분, 내보내기, 검색, 이 기기에서 만드는 요약은 계정으로 열리는 것이 아닙니다 — 모두 사용자의 하드웨어에서 돌아가 저희에게 비용이 들지 않으므로, 여기에 요금을 매긴다면 로그인에 요금을 매기는 셈입니다. 녹음도, 받아쓰기도, 제목도 저장하지 않습니다. 계정이 가진 것은 로그인 방법과 잔액뿐입니다.",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "AI 기능을 쓰려면 로그인하세요. 나머지는 계정 없이 동작합니다.",
  "error.signIn": "로그인",
  "error.insufficient": "여기에는 {need} 크레딧이 필요한데 잔액은 {have}입니다.",
  "error.topUp": "충전 — {price}로 {credits}",
  "error.notConfigured":
    "AI 요약을 지금은 쓸 수 없습니다. 이 기기에서 만드는 요약은 그대로 됩니다.",
  "error.miscount":
    "번역이 줄 수가 맞지 않게 돌아와, 받아쓰기가 어긋날 위험을 피하려고 거부했습니다. 청구되지 않았으니 다시 시도해 주세요.",
  "error.emptyReply": "모델이 쓸 만한 내용을 돌려주지 않았습니다. 청구되지 않았으니 다시 시도해 주세요.",
  "error.unreachable": "AI 서비스에 연결하지 못했습니다. 청구되지 않았습니다.",
  "error.tooLarge": "요청이 너무 컸습니다. 더 짧은 구간을 요약해 주세요.",
  "error.status": "AI 서비스가 {status}을(를) 반환했습니다.",
  "error.micDenied":
    "권한이 거부되었습니다. 브라우저 주소창에서 이 사이트의 마이크 사용을 허용한 뒤 다시 시도해 주세요.",
  "error.micMissing": "마이크를 찾지 못했습니다. 연결하시거나, 대신 탭의 오디오를 녹음하세요.",
  "error.micBusy": "다른 애플리케이션이 마이크를 쓰고 있습니다. 닫고 다시 시도해 주세요.",
  "error.alreadyRecording": "이미 녹음 중입니다.",
  "error.notRecording": "녹음 중이 아닙니다.",
  "error.nothingRecorded": "아무것도 녹음되지 않았습니다. 브라우저의 권한을 확인해 주세요.",
  "error.noTabAudio":
    "이 브라우저는 탭 오디오를 페이지에 공유하지 않습니다. 마이크만 녹음합니다 — 스피커폰 통화라면 이것으로도 담깁니다.",
  "error.tabAudioUnticked":
    "탭 오디오가 공유되지 않았습니다 — “탭 오디오 공유”가 체크되지 않았습니다. 마이크만 녹음합니다.",
  "error.tabAudioDeclined": "탭 오디오가 공유되지 않았습니다. 마이크만 녹음합니다.",
  "error.handoffExpired":
    "회의 탭으로 가는 지름길이 만료되었습니다. 공유 대화상자에서 회의 탭을 고르고 “탭 오디오 공유”를 체크하세요.",
  "error.inputGone":
    "그 입력은 더 이상 쓸 수 없습니다. 다른 것을 고르거나 시스템 기본값을 녹음하세요.",
  "error.recorderStopped": "녹음이 예기치 않게 멈췄습니다.",
  "error.undecodable":
    "이 파일의 오디오를 디코딩하지 못했습니다. MP3, WAV, M4A, WebM, MP4를 시도해 보세요.",
  "error.noAudioInFile": "이 파일에는 오디오가 없습니다.",
  "error.noSpeech":
    "음성이 인식되지 않았습니다. 녹음이 무음이 아니라면 더 큰 모델을 시도해 보세요.",
  "error.unsupported": "이 브라우저는 Web Audio를 지원하지 않습니다.",
  "error.emptyRange": "그 구간은 비어 있습니다.",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} 크레딧",
  "common.credit": "1 크레딧",
  "language.detect": "자동으로 감지",
  "model.tiny": "가장 빠름. 또렷한 한 명이면 충분합니다.",
  "model.base": "회의에 알맞은 기본값. 99개 언어.",
  "model.small": "억양과 말 겹침에 눈에 띄게 강합니다.",
  "model.turbo": "여기서 가장 정확합니다. WebGPU가 필요하고 첫 로딩에 인내가 필요합니다.",
  "error.libraryOpen": "보관함을 열지 못했습니다.",
  "error.libraryBlocked": "보관함이 다른 탭에서 열려 있습니다.",
  "error.libraryWrite": "보관함이 쓰기를 거부했습니다.",
  "library.exportFileNote": "오디오는 포함되지 않습니다. 녹음은 각자의 페이지에서 내보내세요.",
  "format.srt": "SubRip 자막 (.srt)",
  "format.vtt": "WebVTT 자막 (.vtt)",
  "format.text": "일반 텍스트 (.txt)",
  "format.text_timestamped": "시각이 붙은 텍스트 (.txt)",
  "format.markdown": "Markdown 노트 (.md)",
  "format.json": "JSON (.json)",
  "format.csv": "스프레드시트 (.csv)",
  "format.html": "웹 페이지 (.html)",
  "common.importedTitle": "가져온 녹음",
};

// 繁體中文。
//
// Not a character conversion of the Simplified catalogue. Running one through
// a converter produces text that is technically Traditional and reads as
// mainland Chinese in Traditional clothing — the vocabulary differs, not just
// the glyphs:
//
//   簡          繁          
//   积分        點數        credits
//   文件        檔案        file
//   数据        資料        data
//   默认        預設        default
//   设置        設定        settings
//   服务器      伺服器      server
//   标签页      分頁        browser tab
//   识别        辨識        recognition
//   文字记录    逐字稿      transcript
//
// 逐字稿 in particular is the term a Taiwanese or Hong Kong reader expects for
// a meeting transcript, and it has no natural equivalent in the Simplified
// list, which is one more reason the two catalogues are written separately.

import type { Catalogue } from "../lib/i18n";

export const zhHant: Catalogue = {
  "app.name": "OpenNoteTaker",
  "nav.start": "開始",
  "nav.library": "紀錄庫",
  "nav.ask": "提問",
  "nav.privacy": "隱私",
  "nav.account": "帳戶",
  "nav.language": "語言",
  "shell.starting": "正在啟動…",
  "shell.recording": "錄音中",
  "shell.paused": "已暫停",
  "shell.goToRecorder": "回到錄音畫面",
  "shell.footerTagline": "OpenNoteTaker —— 轉錄只在你自己的裝置上進行。",
  "shell.footerPrivacy": "哪些資料會離開這台裝置",
  "shell.footerSource": "原始碼（MIT / Apache-2.0）",
  "shell.startAgain": "重新開始",
  "shell.somethingWrong": "出了點問題。",
  "shell.noticeStorage":
    "這個瀏覽器不允許網頁儲存任何資料，所以關閉分頁後不會留下任何內容。其他功能一切正常。",
  "shell.noticeExpired": "有 {count} 筆紀錄超過你設定的保留期限，已被刪除。",

  "home.title": "沒有機器人加入你的會議。沒有資料離開你的裝置。",
  "home.lede":
    "OpenNoteTaker 在這個瀏覽器分頁裡完成錄音、轉錄與語者分離。音訊從不上傳，與會者名單不會多出一個機器人，也沒有需要取消的訂閱。",
  "home.record": "錄製會議",
  "home.open": "開啟錄音檔",
  "home.readyGpu":
    "這台裝置已就緒 —— 正在使用你的 GPU。{model} 模型（{size}）只在第一次轉錄時下載一次。",
  "home.readyWasm":
    "這台裝置已就緒 —— 正在使用 WebAssembly。{model} 模型（{size}）只在第一次轉錄時下載一次。",
  "home.claim1.title": "錄音留在這裡",
  "home.claim1.body":
    "語音辨識就在這個分頁裡執行，用的是你自己的處理器或 GPU。唯一會下載的是模型本身，而且只下載一次。免費功能完全不向任何地方傳送資料。",
  "home.claim1.link": "哪些資料會離開這台裝置",
  "home.claim2.title": "我們提醒你先徵得同意",
  "home.claim2.body":
    "錄音前有一個一步完成的同意確認，並附上一句你可以直接唸出來的話。同意的內容會隨錄音一併保存，並寫進每一份匯出檔 —— 六週之後它仍然是憑據。",
  "home.claim3.title": "沒有訂閱，沒有意外扣款",
  "home.claim3.body":
    "轉錄、時間軸、語者分離、依原話整理的摘要，以及全部匯出格式都是免費的，而且會一直免費 —— 它們不消耗我們任何成本。AI 撰寫需要點數，而且在按下按鈕之前你就能看到確切價格。",
  "home.claim3.link": "看看各項功能的價格",
  "home.table.heading": "它能做什麼",
  "home.table.feature": "功能",
  "home.table.where": "在哪裡執行",
  "home.table.price": "價格",
  "home.table.inTab": "在這個分頁裡",
  "home.table.ourServer": "我們的伺服器，我們的模型金鑰",
  "home.table.split": "檢索在本機，答案在我們的伺服器",
  "home.table.free": "免費",
  "home.table.credits": "點數",
  "home.feature.transcribe": "轉錄，支援 99 種語言",
  "home.feature.timeline": "每句話都有時間戳記",
  "home.feature.speakers": "區分語者",
  "home.feature.record": "不需機器人的錄音",
  "home.feature.export": "字幕、純文字、Markdown、JSON、CSV、HTML",
  "home.feature.summary": "主題、重點句、行動項目、決議",
  "home.feature.search": "搜尋你錄製過的全部內容",
  "home.feature.translateFree": "轉錄的同時翻譯（譯成英文）",
  "home.feature.minutes": "AI 撰寫的會議紀錄與行動項目",
  "home.feature.ask": "跨會議提問",
  "home.feature.translatePaid": "把完成的逐字稿譯成任意語言",
  "home.table.note":
    "這條分界線不是包裝過的商業決策：線以上的功能都跑在你自己的硬體上，我們不承擔任何成本，對它們收費等於對帳號收費。線以下的每一項，都是我們要付給模型供應商的帳單。",
  "home.selfhost.title": "它也可以跑在你自己的伺服器上",
  "home.selfhost.body":
    "整個應用程式就是一堆靜態檔案加一個 WebAssembly 模組。下載發行版直接開啟，或者放到你自己掌控的機器上 —— 模型快取之後，免費功能在完全離線的情況下也能用。",
  "home.selfhost.note":
    "詳見程式庫中的 docs/self-hosting.md。這是我們比較的十一款產品裡沒有一款提供的組合：在本機處理的都要你安裝程式，在瀏覽器裡開啟的都要上傳你的音訊。",

  "consent.disclosure":
    "這段錄音只保存在這台裝置上。轉錄也在這個瀏覽器裡完成，不會上傳到任何地方。所有可能被錄到聲音的人都已被告知正在錄音。",
  "consent.script":
    "開始之前先說一下 —— 我會把這次會議錄下來做紀錄，錄音只留在我自己的電腦裡。大家都可以嗎？",
  "consent.method.announced": "我已經口頭告知所有人",
  "consent.method.announcedHint": "最常見的情況。上面那句話可以直接唸。",
  "consent.method.written": "已有書面約定",
  "consent.method.writtenHint": "行事曆備註、訊息，或大家都看過的規範。",
  "consent.method.solo": "只有我一個人",
  "consent.method.soloHint": "語音備忘、排練，或沒有其他人在的通話。",
  "consent.record.at": "錄製於 {at}。",
  "consent.record.solo": "現場沒有其他人。",
  "consent.record.method": "同意方式：{method}。",
  "consent.record.present": "在場人員：{names}。",
  "consent.record.captured": "錄製來源：{sources}。",
  "consent.record.told": "已告知在場所有人：「{disclosure}」",
  "record.title": "錄音之前",
  "record.lede": "一個畫面，一次確認。這正是大多數工具略過的一步。",
  "record.scriptHeading": "需要的話，可以直接唸這句",
  "record.scriptNote": "難的從來不是徵得同意，而是八個人等著你時想不出該怎麼開口。",
  "record.whoHeading": "這次對話裡有誰？",
  "record.whoHint": "選填，且只儲存在本機。它會寫進同意紀錄與匯出的筆記裡。",
  "record.whoPlaceholder": "小安、Priya，還有客戶那邊的兩位",
  "record.sourcesHeading": "要錄製什麼？",
  "record.source.mic": "你的麥克風",
  "record.source.micHint": "你，以及和你在同一個房間裡的人。",
  "record.source.tab": "某個分頁或視窗的聲音",
  "record.source.tabHint":
    "視訊會議裡的所有人。系統會請你選擇分頁，而且必須勾選「分享分頁音訊」。",
  "record.source.tabUnsupported":
    "這個瀏覽器不會把分頁的音訊提供給網頁。Chrome 或 Edge 可以。",
  "record.micOnlyOnACall":
    "只錄麥克風適合面對面的會議。線上通話則不行：瀏覽器會把喇叭放出來的聲音當成回音去掉，對方不是變小聲，而是被消掉了。請一併勾選分頁，或改錄回送輸入裝置。",
  "record.inputs.heading": "輸入裝置",
  "record.inputs.add": "加入麥克風",
  "record.inputs.switched": "正在從 {input} 錄製。",
  "record.inputs.liveHint": "更改會立即生效，錄音不會中斷——檔案仍是完整的一段。",
  "record.inputs.reveal": "選擇輸入裝置",
  "record.inputs.label": "輸入",
  "record.inputs.default": "系統預設",
  "record.inputs.none": "這個瀏覽器不會列出輸入裝置的名稱。預設裝置仍可錄製。",
  "record.inputs.clean": "優化聲音",
  "record.inputs.cleanHint":
    "回音消除、降噪與自動增益。房間裡的麥克風適合開啟；如果選的是回送裝置或混音器，請關閉——它沒有回音可消，反而會明顯損傷聲音。",
  "record.source.handedTab": "{platform} 分頁",
  "record.source.handedTabHint": "由偵測擴充功能直接交接，不需要挑選分頁，也不需要勾選任何選項。",
  "record.detectorOn": "會議偵測擴充功能已安裝，你加入通話時這個畫面會自動開啟。",
  "record.handoffHeading": "來自你的 {platform} 通話",
  "record.handoffDirect":
    "該分頁的聲音已經選好。按下開始之前不會錄製任何內容，按下之後也不會離開這個瀏覽器。",
  "record.handoffPicker": "通往該分頁的捷徑已失效，因此仍會詢問要分享哪個分頁。請勾選「分享分頁音訊」。",
  "record.agreeHeading": "你所確認的內容",
  "record.agreeNote":
    "這段文字會一字不差地隨錄音保存，所以日後修改這段措辭，也無法改寫你此刻確認過的內容。",
  "record.pickOne": "至少選擇一個錄製來源。",
  "record.start": "開始錄音",
  "record.cancel": "取消",
  "record.capturing": "正在錄製：{sources}",
  "record.mic": "你的麥克風",
  "record.tab": "分享的分頁",
  "record.pause": "暫停",
  "record.resume": "繼續",
  "record.finish": "結束並轉錄",
  "record.levelHint":
    "如果這條音量條一直不動，代表什麼都沒錄到 —— 請在會議結束前檢查麥克風。",
  "record.nameLabel": "現在命名，或稍後再說",
  "record.namePlaceholder": "這是什麼會議？",
  "record.nameNote":
    "到目前為止沒有任何資料離開這台機器，之後也不會。轉錄會在你結束錄音後開始，而且就在這裡執行。",
  "record.discard": "捨棄這段錄音",
  "record.discardConfirm": "捨棄這段錄音？它將無法復原。",
  "record.defaultTitle": "錄音，{when}",
  "record.tabEnded": "你分享的分頁已停止。請立即結束，以保留目前已錄到的內容。",
  "record.consentHeading": "同意紀錄",

  "run.preparing": "正在準備…",
  "run.reading": "正在讀取檔案",
  "run.decoding": "正在解碼音訊",
  "run.ready": "就緒",
  "run.loadingModel": "正在載入語音模型",
  "run.downloadingModel": "正在下載語音模型（{percent}%）",
  "run.listeningShort": "正在辨識不到一分鐘的音訊",
  "run.listening": "正在辨識 {minutes} 分鐘的音訊",
  "run.diarizing": "正在判斷每句話是誰說的",
  "run.summarising": "正在擷取主題與行動項目",
  "run.modelNote": "語音模型只下載一次，之後由瀏覽器快取。沒有任何內容被上傳。",
  "run.localNote":
    "這一步在你自己的機器上執行。把分頁切到背景會變慢，關掉它則會中斷。",
  "run.failedTitle": "這次沒有成功",
  "run.failedNote":
    "沒有上傳任何內容，也沒有儲存任何內容。如果錄音不是靜音，在「隱私」裡換一個較大的模型通常會有幫助。",
  "run.back": "回到開始畫面",
  "run.cancel": "取消",

  "note.missingTitle": "找不到這段錄音",
  "note.missingBody":
    "它可能已超過你設定的保留期限，或是在另一台裝置上開啟的 —— 這裡沒有任何同步。",
  "note.backToLibrary": "返回紀錄庫",
  "note.titleLabel": "標題",
  "note.metaDetected": "辨識為 {language}",
  "note.metaLines": "{count} 句",
  "note.metaRecorded": "在本機錄製",
  "note.metaImported": "匯入的檔案",
  "note.noAudio":
    "錄音本身沒有保留 —— 只保留了這份逐字稿。如果你希望能回放，請在「隱私」裡開啟「保留音訊」。",
  "note.whoHeading": "誰在說話",
  "note.speakerAuto": "自動判斷",
  "note.speakerCount": "{count} 人",
  "note.speakerOne": "1 人",
  "note.rediarize": "重新判斷語者",
  "note.rediarizeNoAudio": "音訊沒有保留，因此無法重新判斷語者。",
  "note.rediarizeRunning": "正在重新辨識…",
  "note.rediarizeDone": "{count} 個聲音",
  "note.rediarizeUnassigned": "，其中 {count} 句太短，無法區分",
  "note.speakerNote":
    "語者是在這台裝置上依每個人的音色區分的。兩三個音色差異明顯的人效果很好；音色相近、互相插話，或同一個人中途換了麥克風時會比較吃力。如果它認出的人數比實際在場的多——或者少——可以在上面直接指定人數，再重新辨識一次。點擊逐字稿裡的名字，就能把某一句改到別人名下。",
  "note.transcriptHeading": "逐字稿",
  "note.findPlaceholder": "在這份逐字稿中尋找",
  "note.playFromHere": "從這裡開始播放",
  "note.reassign": "把這一句改到別人名下",
  "note.split": "拆分",
  "note.splitHint": "從中間把這一句拆成兩句",
  "note.speakerNameFor": "{name} 的名稱",
  "note.recordingHeading": "這段錄音",
  "note.downloadAudio": "下載音訊",
  "note.transcribeAgain": "重新轉寫",
  "note.transcribeAgainConfirm": "重新轉寫這段錄音？目前的逐字稿、說話人標記以及所有編輯都會被取代。音訊會保留。",
  "note.deleteAudio": "刪除音訊，保留逐字稿",
  "note.deleteAudioConfirm": "刪除音訊並保留逐字稿？此操作無法復原。",
  "note.deleteAll": "全部刪除",
  "note.deleteAllConfirm": "徹底刪除「{title}」？此操作無法復原。",

  "summary.freeHeading": "來自原話",
  "summary.freeBadge": "在本裝置產生 · 免費",
  "summary.redo": "重新產生",
  "summary.empty": "沒有找到明顯的重點 —— 這份逐字稿可能太短，擷取不出主題。",
  "summary.stats": "{sentences} 句 · 約 {minutes} 分鐘 · {speakers} 位發言者",
  "summary.topics": "主題：",
  "summary.keyPoints": "重點",
  "summary.decisions": "決議",
  "summary.actionItems": "行動項目",
  "summary.questionsAsked": "提出的問題",
  "summary.questionsOpen": "尚未解決的問題",
  "summary.whoTalked": "誰說得多",
  "summary.freeNote":
    "上面每一條都摘自逐字稿原文，並附有說出的時間。這裡沒有任何一句是模型寫的，也沒有任何內容離開過這台裝置。",
  "summary.cueLanguages":
    "行動項目、決議與截止時間可在以下語言中辨識：{languages}。主題與重點句在任何語言下都有效。",
  "summary.paidHeading": "由 AI 撰寫",
  "summary.paidBought": "已付費 · 已購買",
  "summary.paidBody":
    "模型會讀完整份逐字稿並撰寫會議紀錄：這次會議在談什麼、做了哪些決議、誰該在什麼時候完成什麼。與上面那一欄不同，這些是新寫的句子而非原話摘錄 —— 每一條都附時間戳記，方便你核對。",
  "summary.steer": "補充要求（選填）",
  "summary.steerPlaceholder": "有什麼特別關注的？例如「重點寫客戶提出的要求」",
  "summary.write": "撰寫會議紀錄 —— {price}",
  "summary.writing": "正在撰寫會議紀錄…",
  "summary.discard": "捨棄並重新撰寫",
  "summary.signInFirst": "請先登入",
  "summary.balance": "你有 {credits}",
  "summary.revealOne": "將要傳送的確切內容 —— 一次請求，僅文字，不含音訊",
  "summary.revealMany": "將要傳送的確切內容 —— {count} 次請求，僅文字，不含音訊",
  "summary.redactNone":
    "沒有發現類似電子郵件地址、電話號碼、長數字或連結的內容，因此將依原樣傳送。",
  "summary.redactSome": "傳送前將替換掉 {items}。可在「隱私」裡關閉此功能。",
  "summary.redactOff": "「隱私」裡已關閉傳送前遮蔽，因此將依原樣傳送。",
  "summary.moreChars": "…… 以及另外 {count} 個字元",
  "summary.paidNote":
    "成功時只扣款一次。沒有週期扣款，沒有需要取消的訂閱，請求失敗也不收費。",

  "export.heading": "匯出",
  "export.download": "下載",
  "export.copy": "複製",
  "export.withSpeakers": "包含發言者",
  "export.withSummary": "包含摘要",
  "export.withConsent": "包含同意紀錄",
  "export.note":
    "所有格式永久免費。它們只是對這個分頁裡已有的資料做文字排版，我們提供這些不需要任何成本。",
  "export.clip": "剪出一個片段",
  "export.clipFrom": "從",
  "export.clipTo": "到",
  "export.clipWords": "文字",
  "export.clipSound": "聲音",
  "export.clipBadRange": "結束時間必須晚於開始時間。",
  "export.clipCutting": "正在剪輯…",
  "export.clipDone": "完成。",
  "export.clipNote": "兩者都在這台裝置上完成剪輯。製作片段不會上傳任何內容。",
  "export.excerptTitle": "{title}（片段）",
  "export.label.summary": "摘要",
  "export.label.keyPoints": "重點",
  "export.label.decisions": "決議",
  "export.label.actionItems": "行動項目",
  "export.label.questionsAsked": "提出的問題",
  "export.label.questionsOpen": "尚未解決的問題",
  "export.label.topics": "主題",
  "export.label.whoSpoke": "發言情形",
  "export.label.transcript": "逐字稿",
  "export.label.consent": "錄音同意紀錄",
  "export.label.unknown": "未知",
  "export.label.due": "截止",
  "export.label.stats": "{sentences} 句 · 約 {minutes} 分鐘 · {speakers} 位發言者",

  "translate.heading": "翻譯這份逐字稿",
  "translate.go": "翻譯 —— {price}",
  "translate.englishIsFree":
    "譯成英文是免費的：請在「隱私」裡開啟「轉錄時譯成英文」後重新轉錄。",
  "translate.batches": "{lines} 句，每 {size} 句一批。",
  "translate.progress": "正在翻譯第 {from}–{to} 句，共 {total} 句…",
  "translate.done": "翻譯完成。",
  "translate.open": "開啟「{title}」",
  "translate.note":
    "譯文會另存為一筆獨立的紀錄，原始逐字稿與它的時間戳記不受影響。若某一批回傳的句數對不上，系統會拒絕而不是套用，而且不會向你收費。",

  "library.title": "紀錄庫",
  "library.record": "錄音",
  "library.open": "開啟檔案",
  "library.durable":
    "儲存在這個瀏覽器裡，只在這台裝置上。沒有任何同步，別處也沒有副本。",
  "library.memory":
    "只保存在記憶體中 —— 不會寫入磁碟，因此關閉分頁後這個清單會清空。",
  "library.searchPlaceholder": "搜尋你錄製過的全部內容",
  "library.searchPlaceholderCount": "搜尋你錄製過的全部內容（共 {lines} 句）",
  "library.noMatch": "沒有相符的內容。",
  "library.empty": "這裡還是空的。從「開始」畫面錄製會議或開啟一個檔案吧。",
  "library.voices": "{count} 個聲音",
  "library.oneVoice": "1 個聲音",
  "library.audioKept": "已保留音訊",
  "library.transcriptOnly": "僅逐字稿",
  "library.hasMinutes": "含 AI 會議紀錄",
  "library.daysLeft": "還剩 {days} 天",
  "library.expiring": "即將到期",
  "library.deletedOn": "將於 {date} 刪除",
  "library.retentionHeading": "保留多久",
  "library.retentionNote":
    "每次開啟應用程式時檢查，而不是靠計時器 —— 所以不會因為你很久沒來，內容就超期留存。",
  "library.retention.session": "關閉分頁前",
  "library.retention.sessionHint": "完全不寫入磁碟。",
  "library.retention.7d": "7 天",
  "library.retention.30d": "30 天",
  "library.retention.90d": "90 天",
  "library.retention.90dHint": "預設值。",
  "library.retention.forever": "直到我手動刪除",
  "library.retention.foreverHint": "不會自動到期。",
  "library.movedToMemory": "已轉入記憶體。磁碟上的資料庫已清空。",
  "library.retentionRemoved": "有 {count} 筆紀錄超過新的期限，已被刪除。",
  "library.dataHeading": "你的資料",
  "library.dataNote":
    "如果這台裝置上是唯一的副本，你必須能夠不經我們同意就把它帶走。這幾個按鈕就是為此而存在。",
  "library.exportAll": "匯出全部",
  "library.importAll": "匯入備份檔",
  "library.deleteAll": "全部刪除",
  "library.deleteAllConfirm": "刪除全部 {count} 筆錄音及其逐字稿？此操作無法復原。",
  "library.restored": "已復原 {count} 筆。",
  "library.exportNote":
    "匯出檔包含全部逐字稿、摘要與同意紀錄，是一個 JSON 檔。不含音訊，否則檔案會大得離譜 —— 音訊請到各筆紀錄自己的頁面下載。",
  "library.notAnExport": "這不是 OpenNoteTaker 的匯出檔。",

  "ask.title": "跨會議提問",
  "ask.lede": "正在搜尋 {notes} 筆錄音 —— 共 {lines} 句，索引就建在這個分頁裡。",
  "ask.ledeEmpty": "還沒有任何錄音。等紀錄庫裡有內容之後，這裡可以搜尋全部紀錄。",
  "ask.placeholder": "關於搬遷主機的事，我們當時決定了什麼？",
  "ask.found":
    "在你的錄音裡找到 {count} 處相關內容。檢索不花任何費用，而且是在這台裝置上完成的。",
  "ask.andMore": "…… 還有 {count} 處，它們也都會被傳送。",
  "ask.nothing": "你的錄音裡沒有與之相符的內容。",
  "ask.answer": "讓 AI 回答 —— {price}",
  "ask.thinking": "正在思考…",
  "ask.sources": "答案的出處",
  "ask.noCitations": "這個答案沒有給出出處，請對照上面的原文自行核對。",
  "ask.charged": "已扣除 {charged}，剩餘 {balance}。",
  "ask.splitHeading": "費用是怎麼分的",
  "ask.splitBody":
    "檢索免費，而且在這台裝置上執行，索引由你自己的逐字稿產生。只有答案需要付費，而且只有上面顯示的那些片段會被傳送 —— 永遠不會傳送你的錄音，也不會傳送紀錄庫的其餘部分。",
  "ask.splitNote":
    "價格不會隨紀錄庫變大而上漲：傳送的片段數量有上限，所以第五百次會議提問的花費，和第五次時差不多。",

  "privacy.title": "哪些資料會離開這台裝置",
  "privacy.lede":
    "一共四個主機位址，這個應用程式只會因為下面這些原因聯繫它們。打開瀏覽器的網路面板自己核對。",
  "privacy.tableHeading": "這個應用程式可能發出的全部請求",
  "privacy.host": "主機",
  "privacy.when": "什麼時候",
  "privacy.what": "請求裡有什麼",
  "privacy.thisSite": "本站",
  "privacy.hfWhen": "第一次使用某個模型轉錄時，此後不再請求 —— 瀏覽器會快取它。",
  "privacy.hfWhat": "不含你的任何資料。這是一次下載：模型權重傳給你。",
  "privacy.siteWhen": "載入頁面，以及模型所需的 ONNX 執行環境。",
  "privacy.siteWhat":
    "不含你的任何資料。特意由本站提供，這樣執行環境就不會成為第二個隱形的第三方。",
  "privacy.authWhen":
    "開啟「帳戶」頁面時 —— 它會查詢有哪些登入方式 —— 以及登入狀態下讀取你的餘額。",
  "privacy.authWhat": "只有你的登入方式與餘額。永遠不包含逐字稿。",
  "privacy.gatewayWhen": "只有當你按下一個標著價格的按鈕時。",
  "privacy.gatewayWhat":
    "只有那個按鈕所指明的逐字稿或片段文字，別無其他。永遠不含音訊。",
  "privacy.noTrackers":
    "這個頁面裡沒有分析腳本、沒有標籤管理器、沒有錯誤回報，也沒有字型 CDN。這一點在檢視原始碼時就能核實，所以值得寫出來。",
  "privacy.testedClaim":
    "錄音、轉錄、區分語者、搜尋、在本裝置產生摘要，以及全部匯出功能，都完全不發出任何請求。建置時的測試會驗證這一點：它會逐個開啟這些畫面，只要頁面聯繫了任何位址就判定失敗。",
  "privacy.audioHeading": "音訊不會去往任何地方",
  "privacy.audioBody":
    "不會被上傳，不會被抽樣，也不會用於改進模型。付費介面接收的是文字 —— 就是你手上這份可以讀到的逐字稿。這是請求內容本身決定的，而不是一條我們可以悄悄改掉的政策：在你傳送之前，請求內文就顯示在「將要傳送的確切內容」裡。",
  "privacy.audioNote":
    "錄音由執行在這個分頁裡的 WebAssembly 解碼與轉錄，用的是你自己的處理器或 GPU。",
  "privacy.storedHeading": "儲存了什麼，儲存在哪裡",
  "privacy.storedBody":
    "{count} 筆錄音儲存在這個瀏覽器自己的儲存空間裡，只在這台裝置上，大約 {size}。伺服器端沒有副本，也沒有任何同步。",
  "privacy.storedNothing":
    "沒有任何內容寫入磁碟 —— 紀錄庫保存在記憶體中，關閉分頁後即消失。",
  "privacy.changeRetention": "修改保留期限",
  "privacy.redactHeading": "傳送之前",
  "privacy.redactLabel": "先去掉明顯的敏感資訊",
  "privacy.redactHint": "在組出付費請求之前，把 {kinds} 替換成佔位符。",
  "privacy.redactNote":
    "它只能辨識格式規整的內容，辨識不出用文字唸出來的卡號，也不是法遵控管手段 —— 它只是文字離開這台機器那一刻的一個合理預設。你自己的副本不會被替換。",
  "privacy.recordingHeading": "錄音方式",
  "privacy.keepAudio": "同時保留音訊與逐字稿",
  "privacy.keepAudioHint":
    "預設關閉。這個應用程式是為逐字稿而生的；音訊檔案大、敏感，而且很少再開啟。保留它才能回放，以及重新判斷語者。",
  "privacy.diarize": "判斷誰在說話",
  "privacy.diarizeHint": "在本機執行，多花幾秒鐘，不需要下載任何模型。",
  "privacy.modelHeading": "語音模型",
  "privacy.modelNote":
    "從 Hugging Face 下載一次，之後由你的瀏覽器快取。此後轉錄完全不需要網路。",
  "privacy.languageHeading": "錄音的語言",
  "language.none": "沒有第二語言",
  "common.listJoin": "和",
  "privacy.secondLanguageHint":
    "兩種語言都會聆聽，每一段都以實際所說的那一種轉寫。指明語言可以避免偵測跑到第三種去。",
  "run.listeningForLanguage": "正在辨識語言",
  "run.rereading": "重新辨識這 {seconds} 秒——辨識器漏掉了",
  "privacy.languageHint": "Whisper 支援 99 種。除非它老是猜錯，否則保持自動偵測即可。",
  "privacy.translateToEnglish": "轉錄時同步譯成英文",
  "privacy.translateHint":
    "這是 Whisper 內建的翻譯，在本機執行且不花錢。若要譯成其他語言，請在某筆紀錄裡使用「翻譯這份逐字稿」，那是付費功能。",
  "privacy.selfHostHeading": "自行部署",
  "privacy.selfHostBody":
    "這個應用程式是靜態檔案加一個 WebAssembly 模組，沒有後端。把它放到你自己掌控的機器上，或直接從磁碟開啟下載好的發行版 —— 兩種方式下免費功能都能用，而付費功能只是不會出現，除非你把它指向一個閘道。",
  "privacy.selfHostNote":
    "我們比較的十一款產品裡沒有一款提供這樣的組合。在本機處理的都要你安裝程式；在瀏覽器裡開啟的都要上傳你的音訊。",
  "privacy.interfaceHeading": "介面語言",
  "privacy.interfaceHint":
    "只影響這個應用程式自己的文字，以及匯出文件裡的標題。不影響轉錄，轉錄跟隨錄音本身的語言。",

  "account.title": "帳戶",
  "account.lede":
    "只有三件事需要帳戶：AI 撰寫會議紀錄、跨會議提問，以及把完成的逐字稿譯成英文以外的語言。其餘功能永遠都能在未登入狀態下使用。",
  "account.signInHeading": "登入 OpenNoteTaker",
  "account.signInBody":
    "一個帳戶通用於我們的各個應用程式。這裡幾乎沒有功能需要它——錄音、轉錄、說話者區分、搜尋與匯出在未登入時都能使用。",
  "account.creditsHeading": "點數",
  "account.creditsNote":
    "{packCredits} 點售價 {packPrice} —— 每點 {each}。點數不會過期，不會自動續訂，也沒有需要取消的訂閱，因為根本就沒有訂閱。",
  "account.costHeading": "各項功能的價格",
  "account.job": "項目",
  "account.typical": "參考價格",
  "account.cost30": "30 分鐘會議的 AI 會議紀錄",
  "account.cost60": "60 分鐘會議的 AI 會議紀錄",
  "account.costAsk": "跨紀錄庫提一個問題",
  "account.costNote":
    "這是依典型會議估算的。你那份逐字稿的確切價格會顯示在按鈕上，按下之前就能看到 —— 它由執行扣款的同一份程式碼算出，所以兩者不可能對不上。",
  "account.historyHeading": "點數花在哪裡",
  "account.notHeading": "帳戶不做什麼",
  "account.notBody":
    "它不解鎖轉錄、語者分離、匯出、搜尋，也不解鎖在你裝置上產生的摘要 —— 這些跑在你自己的硬體上，我們沒有成本，對它們收費等於對登入收費。它也不儲存你的錄音、逐字稿或標題：帳戶裡只有一種登入方式和一個餘額。",

  "error.notSignedIn": "使用 AI 功能需要登入。其餘功能不需帳戶即可使用。",
  "error.signIn": "登入",
  "error.insufficient": "這項需要 {need} 點，你現有 {have}。",
  "error.topUp": "儲值 —— {price} 可購買 {credits}",
  "error.notConfigured": "AI 摘要暫時無法使用。在你裝置上產生的摘要仍然可以使用。",
  "error.miscount":
    "譯文回傳的句數不對，為避免整份逐字稿的時間軸錯位，系統已拒絕套用。沒有向你收費，請重試。",
  "error.emptyReply": "模型沒有回傳可用的內容。沒有向你收費，請重試。",
  "error.unreachable": "無法連線到 AI 服務。沒有向你收費。",
  "error.tooLarge": "這次請求太大了。請分段產生摘要。",
  "error.status": "AI 服務回傳了 {status}。",
  "error.micDenied": "權限被拒絕。請在瀏覽器網址列中允許本站使用麥克風，然後重試。",
  "error.micMissing": "找不到麥克風。請接上一個，或改為錄製分頁的音訊。",
  "error.micBusy": "麥克風正被另一個程式占用。關掉它再試一次。",
  "error.alreadyRecording": "已經在錄音了。",
  "error.notRecording": "目前沒有在錄音。",
  "error.nothingRecorded": "沒有任何內容可以錄製。請檢查瀏覽器權限。",
  "error.noTabAudio":
    "這個瀏覽器不會把分頁的音訊提供給網頁。將只錄製麥克風 —— 如果通話開了擴音，這樣也能錄到。",
  "error.tabAudioUnticked":
    "沒有分享分頁音訊 —— 「分享分頁音訊」沒有勾選。將只錄製麥克風。",
  "error.tabAudioDeclined": "未分享分頁音訊。將只錄製麥克風。",
  "error.handoffExpired":
    "來自會議分頁的捷徑已失效。請在分享對話框中選擇會議分頁，並勾選「分享分頁音訊」。",
  "error.inputGone": "該輸入裝置已無法使用。請另選一個，或改用系統預設裝置錄製。",
  "error.recorderStopped": "錄音意外中斷。",
  "error.undecodable": "無法解碼這個檔案的音訊。請試試 MP3、WAV、M4A、WebM 或 MP4。",
  "error.noAudioInFile": "這個檔案裡沒有音訊。",
  "error.noSpeech": "沒有辨識到語音。如果錄音不是靜音，請換一個較大的模型。",
  "error.unsupported": "這個瀏覽器不支援 Web Audio。",
  "error.emptyRange": "這個時間範圍是空的。",

  "common.credits": "{count} 點",
  "common.credit": "1 點",
  "language.detect": "自動偵測",
  "model.tiny": "最快。適合單人、口齒清晰的錄音。",
  "model.base": "會議情境的合理預設值。支援 99 種語言。",
  "model.small": "在口音與插話較多時明顯更準。",
  "model.turbo": "這裡最準的一個。需要 WebGPU，首次載入要有點耐心。",
  "error.libraryOpen": "無法開啟紀錄庫。",
  "error.libraryBlocked": "紀錄庫已在另一個分頁中開啟。",
  "error.libraryWrite": "紀錄庫拒絕了一次寫入。",
  "library.exportFileNote": "不含音訊；音訊請到各筆紀錄自己的頁面下載。",
  "format.srt": "SubRip 字幕（.srt）",
  "format.vtt": "WebVTT 字幕（.vtt）",
  "format.text": "純文字（.txt）",
  "format.text_timestamped": "附時間戳記的文字（.txt）",
  "format.markdown": "Markdown 筆記（.md）",
  "format.json": "JSON（.json）",
  "format.csv": "試算表（.csv）",
  "format.html": "網頁（.html）",
  "common.importedTitle": "匯入的錄音",
};

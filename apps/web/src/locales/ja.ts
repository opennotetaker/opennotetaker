// 日本語。
//
// Conventions this follows, because they are what a machine rendering of the
// English gets wrong:
//
// - **Controls take the dictionary form**, sentences end in 。 A button reads
//   録音を開始 rather than 録音を開始します — the polite verb ending belongs in
//   prose, not on a control, and mixing the two is the clearest tell that copy
//   was translated rather than written.
// - **です・ます for anything addressed to the reader**, plain form for labels
//   and table cells. The consent copy is all です・ます: it is spoken aloud to
//   other people and has to sound like a person asking, not a notice.
// - **Han characters are read as Japanese here**, which is why `<html lang>`
//   matters: 直, 会 and 説 are drawn differently in a Chinese font, and a page
//   that does not declare its language gets whichever the browser guesses.

import type { Catalogue } from "../lib/i18n";

export const ja: Catalogue = {
  // ─── shell ──────────────────────────────────────────────────────────────
  "app.name": "OpenNoteTaker",
  "nav.start": "ホーム",
  "nav.library": "ライブラリ",
  "nav.ask": "質問",
  "nav.privacy": "プライバシー",
  "nav.account": "アカウント",
  "nav.language": "言語",
  "shell.starting": "開始しています…",
  "shell.recording": "録音中",
  "shell.paused": "一時停止中",
  "shell.goToRecorder": "録音画面へ",
  "shell.footerTagline": "OpenNoteTaker — 文字起こしはこの端末から出ません。",
  "shell.footerPrivacy": "この端末から出るもの",
  "shell.footerSource": "ソース（MIT / Apache-2.0）",
  "shell.startAgain": "やり直す",
  "shell.somethingWrong": "問題が発生しました。",
  "shell.noticeStorage":
    "このブラウザーはページによる保存を許可していないため、タブを閉じると何も残りません。それ以外はすべて動作します。",
  "shell.noticeExpired":
    "設定した保存期間を過ぎた {count} 件のノートを削除しました。",

  // ─── home ───────────────────────────────────────────────────────────────
  "home.title": "通話に誰も参加しません。何もこの端末から出ません。",
  "home.lede":
    "OpenNoteTaker はこのブラウザータブの中で録音し、文字起こしし、話者を聞き分けます。音声がアップロードされることはなく、参加者一覧にボットは現れず、解約すべきサブスクリプションもありません。",
  "home.record": "会議を録音する",
  "home.open": "録音ファイルを開く",
  "home.readyGpu":
    "この端末で利用できます — GPU を使用します。{model} モデル（{size}）は初回の文字起こし時に一度だけダウンロードされます。",
  "home.readyWasm":
    "この端末で利用できます — WebAssembly を使用します。{model} モデル（{size}）は初回の文字起こし時に一度だけダウンロードされます。",
  "home.claim1.title": "録音はここに残ります",
  "home.claim1.body":
    "音声認識はこのタブの中で、お使いのプロセッサーまたは GPU 上で動きます。ダウンロードされるのはモデルそのものだけで、それも一度きりです。無料の機能では、どこにも何も送信されません。",
  "home.claim1.link": "この端末から出るもの",
  "home.claim2.title": "尋ねることを促します",
  "home.claim2.body":
    "録音は一段階の同意確認の先にあり、読み上げられる一文が用意されています。合意した内容は録音と一緒に保存され、書き出しにも必ず印字されます — 六週間後でも証拠として残るように。",
  "home.claim3.title": "サブスクなし、想定外の請求なし",
  "home.claim3.body":
    "文字起こし、タイムスタンプ、話者の区別、発言からの要約、そしてすべての書き出し形式は無料で、これからも無料です — 提供に費用がかからないからです。AI による作文には積分がかかり、押す前に正確な金額が表示されます。",
  "home.claim3.link": "料金を見る",
  "home.table.heading": "できること",
  "home.table.feature": "機能",
  "home.table.where": "実行される場所",
  "home.table.price": "料金",
  "home.table.inTab": "このタブの中",
  "home.table.ourServer": "当方のサーバー、当方のモデルキー",
  "home.table.split": "検索はここ、回答は当方のサーバー",
  "home.table.free": "無料",
  "home.table.credits": "積分",
  "home.feature.transcribe": "文字起こし、99 言語",
  "home.feature.timeline": "すべての文にタイムスタンプ",
  "home.feature.speakers": "話者の聞き分け",
  "home.feature.record": "ボットなしの録音",
  "home.feature.export": "字幕、テキスト、Markdown、JSON、CSV、HTML",
  "home.feature.summary": "話題、要点、アクション、決定事項",
  "home.feature.search": "録音したものすべてを検索",
  "home.feature.translateFree": "文字起こししながら翻訳（英語へ）",
  "home.feature.minutes": "AI が書く議事録とアクションアイテム",
  "home.feature.ask": "複数の会議をまたいだ質問",
  "home.feature.translatePaid": "完成した文字起こしを任意の言語へ翻訳",
  "home.table.note":
    "この境界線は体裁を整えた商売上の判断ではありません。線より上はすべてお使いのハードウェアで動き、当方に費用は生じません。ですから課金するとしたら、それはアカウントに課金することになってしまいます。線より下は、当方がモデル提供元に支払う請求そのものです。",
  "home.selfhost.title": "自分のサーバーでも動きます",
  "home.selfhost.body":
    "アプリ全体が静的ファイルと WebAssembly モジュールです。リリースをダウンロードして開くか、ご自身が管理する機械から配信してください — モデルがキャッシュされたあとは、無料の機能はネットワークなしで動きます。",
  "home.selfhost.note":
    "リポジトリの docs/self-hosting.md をご覧ください。比較した 11 製品のどれもこれを提供していません。ローカルで処理するものはどれも何かのインストールを求め、ブラウザーで開くものはどれも音声をアップロードします。",

  // ─── consent and recording ──────────────────────────────────────────────
  "consent.disclosure":
    "この録音はこの端末に留まります。文字起こしもこのブラウザーの中で行われ、どこにもアップロードされません。声が入る可能性のある全員に、録音していることを伝えてあります。",
  "consent.script":
    "始める前にひとつだけ — これを録音して、メモを取らせてもらいます。録音は私の端末から出ません。皆さん、それで大丈夫でしょうか。",
  "consent.method.announced": "その場で口頭で伝えた",
  "consent.method.announcedHint": "通常はこちらです。上の一文をそのまま読んでも構いません。",
  "consent.method.written": "書面で合意している",
  "consent.method.writtenHint": "カレンダーの記載、メッセージ、全員が見ている規程など。",
  "consent.method.solo": "自分ひとりだけ",
  "consent.method.soloHint": "ボイスメモ、練習、ほかに誰もいない通話。",
  "consent.record.at": "{at} に録音。",
  "consent.record.solo": "ほかに誰もいませんでした。",
  "consent.record.method": "同意：{method}。",
  "consent.record.present": "参加者：{names}。",
  "consent.record.captured": "収録：{sources}。",
  "consent.record.told": "その場の全員に伝えた内容：「{disclosure}」",
  "record.title": "録音する前に",
  "record.lede": "一画面、一度だけ。多くのツールが省いているのはここです。",
  "record.scriptHeading": "そのまま読み上げても構いません",
  "record.scriptNote":
    "尋ねることの難しさは、同意してもらうことではありません — 八人に待たれながら言葉を探すことです。",
  "record.whoHeading": "この会話にいるのは誰ですか",
  "record.whoHint":
    "任意で、ここにしか保存されません。記録と書き出したノートに入ります。",
  "record.whoPlaceholder": "田中さん、佐藤さん、先方から二名",
  "record.afterHeading": "録音のあと",
  "record.keepAudio": "文字起こしだけでなく、録音も残す",
  "record.keepAudioHint":
    "このブラウザーにのみ保存され、ノートと一緒に削除されます。容量が大きく、より機微な側なので、指定しない限り保存しません。",
  "record.keepAudioWarning":
    "ノートを閉じると音声は破棄されます。文字起こしがうまくいかなかった場合 — 想定しない言語、二人が一人にまとめられた — やり直す材料は何も残りません。",
  "record.sourcesHeading": "何を録音しますか",
  "record.source.mic": "マイク",
  "record.source.micHint": "あなたと、同じ部屋にいる人。",
  "record.source.tab": "タブまたはウィンドウの音声",
  "record.source.tabHint":
    "ビデオ通話の相手全員。どのタブか尋ねられるので、「タブの音声を共有」に必ずチェックを入れてください。",
  "record.source.tabUnsupported":
    "このブラウザーはタブの音声をページに共有しません。Chrome か Edge なら可能です。",
  "record.micOnlyOnACall":
    "マイクだけの録音は、同じ部屋での会議なら問題ありません。通話では違います。ブラウザーはスピーカーから出た音を取り除くので、相手の声は小さくなるのではなく打ち消されます。タブにもチェックを入れるか、ループバック入力を録音してください。",
  "record.inputs.heading": "どの入力を使うか",
  "record.inputs.add": "マイクを追加",
  "record.inputs.switched": "{input} から録音しています。",
  "record.inputs.liveHint":
    "変更はすぐに反映され、録音に切れ目は生じません — ファイルは一続きのまま続きます。",
  "record.inputs.reveal": "入力を選ぶ",
  "record.inputs.label": "入力",
  "record.inputs.default": "システムの既定",
  "record.inputs.none": "このブラウザーは入力名を教えません。既定の入力での録音はできます。",
  "record.inputs.clean": "音を整える",
  "record.inputs.cleanHint":
    "エコー除去、ノイズ抑制、自動ゲイン。部屋のマイクには適していますが、ループバック機器やミキサーでは打ち消すものがなく、渡された音を目に見えて損なうので切ってください。",
  "record.source.handedTab": "{platform} のタブ",
  "record.source.handedTabHint":
    "検出機能から引き渡されたので、タブを選ぶ必要も、チェックを入れる必要もありません。",
  "record.detectorOn":
    "会議検出の拡張機能が入っているので、通話に参加するとこの画面が自動的に開きます。",
  "record.handoffHeading": "{platform} の通話から開きました",
  "record.handoffDirect":
    "そのタブの音声はすでに選ばれています。開始を押すまで何も収録されず、押したあともこのブラウザーから何も出ません。",
  "record.handoffPicker":
    "そのタブへのショートカットが期限切れになったため、どのタブを共有するか尋ねられます。「タブの音声を共有」にチェックを入れてください。",
  "record.agreeHeading": "同意する内容",
  "record.agreeNote":
    "この録音と一緒に一字一句そのまま保存されるので、あとからこの文言を変えても、いま同意した内容は書き換わりません。",
  "record.pickOne": "録音するものを少なくともひとつ選んでください。",
  "record.start": "録音を開始",
  "record.cancel": "キャンセル",
  "record.capturing": "{sources} を収録中",
  "record.mic": "マイク",
  "record.tab": "共有中のタブ",
  "record.pause": "一時停止",
  "record.resume": "再開",
  "record.finish": "終了して文字起こし",
  "record.levelHint":
    "このバーがまったく動かないなら、何も聞こえていません — 会議の終わりに気づく前に、マイクを確認してください。",
  "record.nameLabel": "いま名前を付ける、またはあとで",
  "record.namePlaceholder": "これは何の会議ですか",
  "record.nameNote":
    "この端末から何も出ていませんし、これからも出ません。文字起こしは終了時に始まり、ここで動きます。",
  "record.discard": "録音を破棄",
  "record.discardConfirm": "この録音を破棄しますか。元に戻せません。",
  "record.defaultTitle": "録音、{when}",
  "record.tabEnded":
    "共有していたタブが停止しました。ここまでの録音を残すには、いま終了してください。",
  "record.consentHeading": "同意の記録",

  // ─── the transcription run ──────────────────────────────────────────────
  "run.preparing": "準備しています…",
  "run.reading": "ファイルを読み込んでいます",
  "run.decoding": "音声をデコードしています",
  "run.ready": "準備完了",
  "run.loadingModel": "音声モデルを読み込んでいます",
  "run.downloadingModel": "音声モデルをダウンロードしています（{percent}%）",
  "run.listeningShort": "1 分未満の音声を聞いています",
  "run.listening": "{minutes} 分の音声を聞いています",
  "run.diarizing": "誰が話したかを判定しています",
  "run.summarising": "話題とアクションを抜き出しています",
  "run.modelNote":
    "音声モデルは一度だけダウンロードされ、あとはブラウザーがキャッシュします。アップロードは行われません。",
  "run.localNote":
    "これはお使いの端末で動いています。このタブを背面に置くと遅くなり、閉じると止まります。",
  "run.failedTitle": "うまくいきませんでした",
  "run.failedNote":
    "何もアップロードされず、何も保存されていません。録音が無音でないなら、プライバシー画面でより大きなモデルにすると解決することが多いです。",
  "run.back": "最初に戻る",
  "run.cancel": "キャンセル",

  // ─── the note ───────────────────────────────────────────────────────────
  "note.missingTitle": "その録音はここにありません",
  "note.missingBody":
    "設定した保存期間を過ぎたか、別の端末で開かれたのかもしれません — どこにも同期していません。",
  "note.backToLibrary": "ライブラリに戻る",
  "note.titleLabel": "タイトル",
  "note.metaDetected": "{language} を検出",
  "note.metaLines": "{count} 行",
  "note.metaRecorded": "ここで録音",
  "note.metaImported": "読み込み",
  "note.noAudio":
    "録音そのものは保存されていません — この文字起こしだけです。再生できるようにしたい場合は、プライバシー画面で「音声を残す」を有効にしてください。",
  "note.whoHeading": "話しているのは誰か",
  "note.speakerAuto": "自動で判定",
  "note.speakerCount": "{count} 人",
  "note.speakerOne": "1 人",
  "note.rediarize": "話者をもう一度判定する",
  "note.rediarizeNoAudio":
    "音声が保存されていないため、話者をもう一度判定することはできません。",
  "note.rediarizeRunning": "もう一度聞いています…",
  "note.rediarizeDone": "{count} 人の声",
  "note.rediarizeUnassigned": "、{count} 行は短すぎて判別できません",
  "note.speakerNote":
    "話者はこの端末で、それぞれの声の響きから聞き分けています。声のはっきり違う二、三人ならよく働きますが、似た声、話しかぶり、途中でマイクを変えた人には弱いです。その場にいたより多く — あるいは少なく — 検出された場合は、上で人数を指定してもう一度判定してください。文字起こしの中の名前をクリックすると、その一行だけ別の人に移せます。",
  "note.transcriptHeading": "文字起こし",
  "note.findPlaceholder": "この文字起こしの中を検索",
  "note.playFromHere": "ここから再生",
  "note.reassign": "この行を別の人に割り当てる",
  "note.split": "分割",
  "note.splitHint": "この行を中間で二つに分けます",
  "note.speakerNameFor": "{name} の名前",
  "note.recordingHeading": "この録音",
  "note.downloadAudio": "音声をダウンロード",
  "note.transcribeAgain": "もう一度文字起こしする",
  "note.transcribeAgainConfirm":
    "この録音をもう一度文字起こししますか。いまの文字起こし、話者のラベル、加えた修正はすべて置き換わります。音声は残ります。",
  "note.deleteAudio": "音声を削除して文字起こしを残す",
  "note.deleteAudioConfirm":
    "音声を削除して文字起こしを残しますか。元に戻せません。",
  "note.deleteAll": "すべて削除",
  "note.deleteAllConfirm": "「{title}」を完全に削除しますか。元に戻せません。",

  // ─── the summary panel ──────────────────────────────────────────────────
  "summary.freeHeading": "話された内容から",
  "summary.freeBadge": "この端末で作成 · 無料",
  "summary.redo": "やり直す",
  "summary.empty": "目立つものはありませんでした — 話題を見つけるには文字起こしが短すぎるのかもしれません。",
  "summary.stats": "{sentences} 文 · 約 {minutes} 分 · {speakers} 人",
  "summary.topics": "話題：",
  "summary.keyPoints": "要点",
  "summary.decisions": "決定事項",
  "summary.actionItems": "アクションアイテム",
  "summary.questionsAsked": "出た質問",
  "summary.questionsOpen": "未解決の問い",
  "summary.whoTalked": "誰が話したか",
  "summary.freeNote":
    "上の各行は、発言された時刻とともに文字起こしからそのまま引用したものです。ここにモデルが書いた文章はなく、どれもこの端末から出ていません。",
  "summary.cueLanguages":
    "アクションアイテム、決定事項、期限は {languages} で認識されます。話題と要点はすべての言語で機能します。",
  "summary.paidHeading": "AI が書いたもの",
  "summary.paidBought": "支払い済み · 購入済み",
  "summary.paidBody":
    "モデルが文字起こしを読み、議事録を書きます。何についての会議だったか、何が決まったか、誰がいつまでに何をするか。上のパネルと違い、これは引用ではなく新しく書かれた文章です — 確認できるよう、それぞれに時刻が付きます。",
  "summary.steer": "任意の指示",
  "summary.steerPlaceholder": "何か指定はありますか。例：「先方の要望に絞って」",
  "summary.write": "議事録を書く — {price}",
  "summary.writing": "議事録を書いています…",
  "summary.discard": "破棄してもう一度書く",
  "summary.signInFirst": "先にサインインしてください",
  "summary.balance": "残高 {credits}",
  "summary.revealOne": "送信される内容そのもの — 1 リクエスト、テキストのみ、音声なし",
  "summary.revealMany": "送信される内容そのもの — {count} リクエスト、テキストのみ、音声なし",
  "summary.redactNone":
    "メールアドレス、電話番号、長い数字、リンクらしきものは見つからなかったので、このまま送られます。",
  "summary.redactSome":
    "送信前に {items} が置き換えられます。プライバシー画面で無効にできます。",
  "summary.redactOff":
    "送信前の伏せ字はプライバシー画面で無効になっているので、このまま送られます。",
  "summary.moreChars": "…ほか {count} 文字",
  "summary.paidNote":
    "成功したときに一度だけ課金されます。継続課金はなく、解約するものもなく、失敗したリクエストには課金されません。",

  // ─── export ─────────────────────────────────────────────────────────────
  "export.heading": "書き出し",
  "export.download": "ダウンロード",
  "export.copy": "コピー",
  "export.withSpeakers": "誰が話したかを含める",
  "export.withSummary": "要約を含める",
  "export.withConsent": "同意の記録を含める",
  "export.note":
    "すべての形式が、ずっと無料です。どれもこのタブにすでにあるデータを整形しているだけなので、差し上げるのに費用がかかるものは何もありません。",
  "export.clip": "一部を切り出す",
  "export.clipFrom": "開始",
  "export.clipTo": "終了",
  "export.clipWords": "文字",
  "export.clipSound": "音声",
  "export.clipBadRange": "終了は開始より後でなければなりません。",
  "export.clipCutting": "切り出しています…",
  "export.clipDone": "完了しました。",
  "export.clipNote": "どちらもこの端末で切り出されます。切り出しのためのアップロードはありません。",
  "export.excerptTitle": "{title}（抜粋）",
  // These cross into the Rust exporters — see `i18n.exportLabels`.
  "export.label.summary": "要約",
  "export.label.keyPoints": "要点",
  "export.label.decisions": "決定事項",
  "export.label.actionItems": "アクションアイテム",
  "export.label.questionsAsked": "出た質問",
  "export.label.questionsOpen": "未解決の問い",
  "export.label.topics": "話題",
  "export.label.whoSpoke": "発言者",
  "export.label.transcript": "文字起こし",
  "export.label.consent": "録音への同意",
  "export.label.unknown": "不明",
  "export.label.due": "期限",
  "export.label.stats": "{sentences} 文 · 約 {minutes} 分 · {speakers} 人",

  // ─── translation ────────────────────────────────────────────────────────
  "translate.heading": "この文字起こしを翻訳する",
  "translate.go": "翻訳する — {price}",
  "translate.englishIsFree":
    "英語は無料です。代わりにプライバシー画面の「英語に翻訳しながら」で文字起こしし直してください。",
  "translate.batches": "{lines} 行を {size} 行ずつに分けて処理します。",
  "translate.progress": "{total} 行のうち {from}–{to} を翻訳しています…",
  "translate.done": "翻訳しました。",
  "translate.open": "「{title}」を開く",
  "translate.note":
    "翻訳は別のノートとして保存されるので、元の文字起こしとその時刻はそのまま残ります。まとまりの行数が合わずに返ってきた場合は、適用せずに破棄され、課金もされません。",

  // ─── library ────────────────────────────────────────────────────────────
  "library.title": "ライブラリ",
  "library.record": "録音",
  "library.open": "ファイルを開く",
  "library.durable":
    "このブラウザーの、この端末にのみ保存されています。同期はされず、ほかのどこにも複製はありません。",
  "library.memory":
    "メモリー上にのみ保持されています — ディスクには何も書かれないので、タブを閉じるとこの一覧は空になります。",
  "library.searchPlaceholder": "録音したものすべてを検索",
  "library.searchPlaceholderCount": "録音したものすべてを検索（{lines} 行）",
  "library.noMatch": "該当するものはありませんでした。",
  "library.empty": "まだ何もありません。ホーム画面から会議を録音するか、ファイルを開いてください。",
  "library.voices": "{count} 人の声",
  "library.oneVoice": "1 人の声",
  "library.audioKept": "音声あり",
  "library.transcriptOnly": "文字起こしのみ",
  "library.hasMinutes": "AI 議事録",
  "library.daysLeft": "残り {days} 日",
  "library.expiring": "まもなく期限",
  "library.deletedOn": "{date} に削除されます",
  "library.retentionHeading": "保存しておく期間",
  "library.retentionNote":
    "タイマーではなく、アプリを開くたびに確認します — しばらく訪れなかったというだけで、選んだ期間を超えて残り続けることはありません。",
  "library.retention.session": "このタブを閉じるまで",
  "library.retention.sessionHint": "ディスクには一切書き込みません。",
  "library.retention.7d": "7 日間",
  "library.retention.30d": "30 日間",
  "library.retention.90d": "90 日間",
  "library.retention.90dHint": "既定値です。",
  "library.retention.forever": "自分で削除するまで",
  "library.retention.foreverHint": "自動的に消えるものはありません。",
  "library.movedToMemory": "メモリー上に移しました。ディスク上のデータベースは空にしてあります。",
  "library.retentionRemoved":
    "新しい上限を超えていた {count} 件のノートを削除しました。",
  "library.dataHeading": "あなたのデータ",
  "library.dataNote":
    "唯一の複製がこの端末にあるのなら、当方に断らずによそへ持ち出せなければなりません。そのためのものです。",
  "library.exportAll": "すべて書き出す",
  "library.importAll": "書き出したものを読み込む",
  "library.deleteAll": "すべて削除",
  "library.deleteAllConfirm":
    "{count} 件の録音と文字起こしをすべて削除しますか。元に戻せません。",
  "library.restored": "{count} 件を復元しました。",
  "library.exportNote":
    "書き出しには、すべての文字起こし、要約、同意の記録が 1 つの JSON ファイルとして入ります。ファイルが巨大になるため音声は含まれません — 録音はそれぞれのページからダウンロードしてください。",
  "library.notAnExport": "これは OpenNoteTaker の書き出しファイルではありません。",

  // ─── ask ────────────────────────────────────────────────────────────────
  "ask.title": "会議をまたいで質問する",
  "ask.lede": "{notes} 件の録音、{lines} 行を検索します — 索引はこのタブの中で作られています。",
  "ask.ledeEmpty":
    "まだ録音がありません。ライブラリに何か入れば、そのすべてを検索します。",
  "ask.placeholder": "ホスティングの移行について何を決めましたか",
  "ask.found":
    "録音の中の {count} 箇所が関係していそうです。探すのに費用はかからず、この端末で行われました。",
  "ask.andMore": "…ほか {count} 件。いずれも送信されます。",
  "ask.nothing": "録音の中に該当するものはありません。",
  "ask.answer": "回答してもらう — {price}",
  "ask.thinking": "考えています…",
  "ask.sources": "根拠となった箇所",
  "ask.noCitations": "回答は何も引用しなかったので、上の抜粋と照らして確かめてください。",
  "ask.charged": "{charged} を請求しました。残高は {balance} です。",
  "ask.splitHeading": "どこで何が行われるか",
  "ask.splitBody":
    "検索は無料で、あなた自身の文字起こしから作った索引を使い、この端末で行われます。費用がかかるのは回答だけで、送られるのは上に表示された抜粋のみです — 録音そのものも、ライブラリの残りも送られません。",
  "ask.splitNote":
    "料金はライブラリの大きさとともに増えません。送る抜粋の数には上限があるので、500 回目の会議でも 5 回目とほぼ同じ料金です。",

  // ─── privacy ────────────────────────────────────────────────────────────
  "privacy.title": "この端末から出るもの",
  "privacy.lede":
    "4 つのホストがあり、このアプリが接続できるのは以下の理由の場合だけです。ブラウザーのネットワークパネルを開いて確かめてください。",
  "privacy.tableHeading": "このアプリが送りうるすべてのリクエスト",
  "privacy.host": "ホスト",
  "privacy.when": "いつ",
  "privacy.what": "中身",
  "privacy.thisSite": "このサイト",
  "privacy.hfWhen":
    "あるモデルで初めて文字起こしするときだけで、以後はありません — ブラウザーがキャッシュします。",
  "privacy.hfWhat": "あなたのものは何も。ダウンロードであり、モデルの重みがこちらに来るだけです。",
  "privacy.siteWhen": "ページの読み込みと、モデルが必要とする ONNX ランタイムの取得。",
  "privacy.siteWhat":
    "あなたのものは何も。ランタイムが二つめの見えない第三者にならないよう、意図的にここから配信しています。",
  "privacy.authWhen":
    "アカウント画面を開いたとき — どのサインイン方法があるかを尋ねます — と、その後サインインしている間、残高を読むために。",
  "privacy.authWhat": "サインイン方法と残高。文字起こしは決して送りません。",
  "privacy.gatewayWhen": "料金が表示されたボタンを押したときだけ。",
  "privacy.gatewayWhat":
    "そのボタンが示す文字起こしまたは抜粋のテキストだけで、ほかには何も。音声は決して送りません。",
  "privacy.noTrackers":
    "このページには解析スクリプトも、タグマネージャーも、エラー収集も、フォント CDN もありません。ソースを表示すれば確認できます。だからこそ書く意味があります。",
  "privacy.testedClaim":
    "録音、文字起こし、話者の聞き分け、検索、この端末での要約、そしてすべての書き出しは、一切リクエストを送りません。ビルド自体のテストがそれを検証します。各画面を実際に操作し、ページがどこかに接続したら失敗します。",
  "privacy.audioHeading": "音声はどこにも行きません",
  "privacy.audioBody":
    "アップロードとしても、サンプルとしても、モデルの改善のためにも送りません。有料の経路が扱うのはテキスト — すでに手元にあり、読める文字起こしです。これは方針ではなくリクエストの中身そのものの性質なので、こちらが黙って変えることはできません。送信前に「送信される内容そのもの」でリクエスト本文が画面に出ます。",
  "privacy.audioNote":
    "録音はこのタブの中で動く WebAssembly が、お使いのプロセッサーまたは GPU 上でデコードし、文字起こしします。",
  "privacy.storedHeading": "何がどこに保存されるか",
  "privacy.storedBody":
    "このブラウザー自身のストレージに、この端末上で {count} 件の録音。およそ {size} です。サーバー側の複製はなく、同期もしません。",
  "privacy.storedNothing":
    "ディスクには何も書かれていません — ライブラリはメモリー上にあり、タブを閉じると消えます。",
  "privacy.changeRetention": "保存期間を変更する",
  "privacy.redactHeading": "何かを送る前に",
  "privacy.redactLabel": "明らかな秘密を先に取り除く",
  "privacy.redactHint":
    "有料リクエストを組み立てる前に、{kinds} を伏せ字に置き換えます。",
  "privacy.redactNote":
    "これは形の整ったパターンを捉えます。言葉で読み上げられたカード番号は捉えられませんし、コンプライアンス上の統制でもありません — テキストがこの端末を離れる唯一の瞬間のための、まっとうな既定値です。あなた自身の控えからは何も伏せられません。",
  "privacy.recordingHeading": "録音のしかた",
  "privacy.keepAudio": "文字起こしに加えて音声も残す",
  "privacy.keepAudioHint":
    "既定では無効です。このアプリの目的は文字起こしであり、音声は大きく機微で、めったに開き直さない部分です。残しておくと、再生と話者判定のやり直しができます。",
  "privacy.diarize": "誰が話しているかを判定する",
  "privacy.diarizeHint": "ここで動き、数秒増えるだけで、モデルのダウンロードは不要です。",
  "privacy.modelHeading": "音声モデル",
  "privacy.modelNote":
    "Hugging Face から一度だけダウンロードされ、ブラウザーがキャッシュします。以後、文字起こしはネットワークなしで動きます。",
  "privacy.languageHeading": "録音されている言語",
  "language.none": "第二言語なし",
  "common.listJoin": "と",
  "privacy.secondLanguageHint":
    "両方の言語を聞き分け、それぞれの区間を実際に話されている方の言語で文字起こしします。指定しておくと、検出が三つめの言語へ迷い込むのを防げます。",
  "run.listeningForLanguage": "言語を聞き分けています",
  "run.rereading": "{seconds} 秒を読み直しています — 認識器が飛ばした部分です",
  "privacy.languageHint":
    "Whisper は 99 言語に対応します。繰り返し誤って推測される場合を除き、自動検出のままにしてください。",
  "privacy.translateToEnglish": "文字起こししながら英語に翻訳する",
  "privacy.translateHint":
    "Whisper 自身の翻訳なので、ここで動き、費用はかかりません。ほかの言語へ訳す場合はノートの「この文字起こしを翻訳する」を使ってください。そちらは有料です。",
  "privacy.selfHostHeading": "自分で動かす",
  "privacy.selfHostBody":
    "このアプリは静的ファイルと WebAssembly モジュールだけで、バックエンドはありません。ご自身が管理する機械から配信するか、ダウンロードしたリリースをそのまま開いてください — どちらでも無料の機能は動き、ゲートウェイを指定しない限り有料の機能は現れません。",
  "privacy.selfHostNote":
    "比較した 11 製品のどれもこの組み合わせを提供していません。ローカルで処理するものはどれもアプリケーションのインストールを求め、ブラウザーで開くものはどれも音声をアップロードします。",
  "privacy.interfaceHeading": "画面の言語",
  "privacy.interfaceHint":
    "このアプリ自身の言葉と、書き出した文書の見出しが変わります。文字起こしには影響せず、そちらは録音に従います。",

  // ─── account ────────────────────────────────────────────────────────────
  "account.title": "アカウント",
  "account.lede":
    "必要になるのはちょうど三つのことだけです。AI が書く議事録、会議をまたいだ質問、そして完成した文字起こしを英語以外へ翻訳すること。それ以外はサインインしなくてもずっと使えます。",
  "account.signInHeading": "OpenNoteTaker にサインイン",
  "account.signInBody":
    "当方のアプリ共通のアカウントです。ここではほとんど必要ありません — 録音、文字起こし、話者、検索、書き出しはサインインしなくても動きます。",
  "account.creditsHeading": "積分",
  "account.creditsNote":
    "{packCredits} 積分で {packPrice} — 1 つあたり {each} です。有効期限はなく、自動更新もなく、サブスクリプションがないので解約するものもありません。",
  "account.costHeading": "料金の目安",
  "account.job": "処理",
  "account.typical": "目安の料金",
  "account.cost30": "30 分の会議の AI 議事録",
  "account.cost60": "60 分の会議の AI 議事録",
  "account.costAsk": "ライブラリ全体への質問 1 回",
  "account.costNote":
    "一般的な会議での目安です。実際の文字起こしに対する正確な料金は、押す前にボタンに出ます — 課金と同じコードで計算されるので、両者が食い違うことはありません。",
  "account.historyHeading": "積分の使いみち",
  "account.notHeading": "アカウントでできないこと",
  "account.notBody":
    "文字起こし、話者の区別、書き出し、検索、この端末で作る要約は、アカウントでは解錠されません — どれもお使いのハードウェアで動き、当方に費用は生じないので、課金するとしたらログインに課金することになってしまいます。録音も文字起こしもタイトルも保存しません。アカウントが持つのはサインイン方法と残高だけです。",

  // ─── errors ─────────────────────────────────────────────────────────────
  "error.notSignedIn":
    "AI 機能を使うにはサインインしてください。それ以外はアカウントなしで動きます。",
  "error.signIn": "サインイン",
  "error.insufficient": "これには {need} 積分が必要ですが、残高は {have} です。",
  "error.topUp": "追加する — {price} で {credits}",
  "error.notConfigured":
    "AI 要約はいま利用できません。この端末で作る要約は使えます。",
  "error.miscount":
    "翻訳の行数が合わずに返ってきたため、文字起こしがずれる危険を避けて破棄しました。課金されていないので、もう一度お試しください。",
  "error.emptyReply": "モデルから使える内容が返りませんでした。課金されていないので、もう一度お試しください。",
  "error.unreachable": "AI サービスに接続できませんでした。課金されていません。",
  "error.tooLarge": "リクエストが大きすぎました。より短い範囲で要約してください。",
  "error.status": "AI サービスが {status} を返しました。",
  "error.micDenied":
    "許可されませんでした。ブラウザーのアドレスバーからこのサイトのマイク使用を許可し、もう一度お試しください。",
  "error.micMissing": "マイクが見つかりませんでした。接続するか、代わりにタブの音声を録音してください。",
  "error.micBusy": "マイクを別のアプリケーションが使用しています。閉じてからもう一度お試しください。",
  "error.alreadyRecording": "すでに録音中です。",
  "error.notRecording": "録音していません。",
  "error.nothingRecorded": "何も録音できませんでした。ブラウザーの許可設定を確認してください。",
  "error.noTabAudio":
    "このブラウザーはタブの音声をページに共有しません。マイクのみを録音します — スピーカー通話ならこれでも収録できます。",
  "error.tabAudioUnticked":
    "タブの音声が共有されませんでした — 「タブの音声を共有」にチェックが入っていません。マイクのみを録音します。",
  "error.tabAudioDeclined": "タブの音声は共有されませんでした。マイクのみを録音します。",
  "error.handoffExpired":
    "会議タブへのショートカットが期限切れになりました。共有ダイアログで会議タブを選び、「タブの音声を共有」にチェックを入れてください。",
  "error.inputGone":
    "その入力は使えなくなりました。別のものを選ぶか、システムの既定を録音してください。",
  "error.recorderStopped": "録音が予期せず停止しました。",
  "error.undecodable":
    "このファイルの音声をデコードできませんでした。MP3、WAV、M4A、WebM、MP4 をお試しください。",
  "error.noAudioInFile": "このファイルには音声が入っていません。",
  "error.noSpeech":
    "音声が認識されませんでした。録音が無音でないなら、より大きなモデルをお試しください。",
  "error.unsupported": "このブラウザーは Web Audio に対応していません。",
  "error.emptyRange": "その範囲は空です。",

  // ─── shared ─────────────────────────────────────────────────────────────
  "common.credits": "{count} 積分",
  "common.credit": "1 積分",
  "language.detect": "自動で判定",
  "model.tiny": "最速。はっきりした一人の話者なら十分です。",
  "model.base": "会議に適した既定値。99 言語。",
  "model.small": "訛りや話しかぶりに目に見えて強くなります。",
  "model.turbo": "ここでは最も正確。WebGPU が必要で、初回の読み込みには時間がかかります。",
  "error.libraryOpen": "ライブラリを開けませんでした。",
  "error.libraryBlocked": "ライブラリが別のタブで開かれています。",
  "error.libraryWrite": "ライブラリが書き込みを拒否しました。",
  "library.exportFileNote": "音声は含まれません。録音はそれぞれのページから書き出してください。",
  "format.srt": "SubRip 字幕（.srt）",
  "format.vtt": "WebVTT 字幕（.vtt）",
  "format.text": "プレーンテキスト（.txt）",
  "format.text_timestamped": "時刻付きテキスト（.txt）",
  "format.markdown": "Markdown ノート（.md）",
  "format.json": "JSON（.json）",
  "format.csv": "表計算（.csv）",
  "format.html": "ウェブページ（.html）",
  "common.importedTitle": "読み込んだ録音",
};

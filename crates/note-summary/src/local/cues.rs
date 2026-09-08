//! The phrasings that mark an action, a decision, a question or a deadline,
//! per language.
//!
//! # Why this is a table and not five flat lists
//!
//! Topic extraction and key-sentence ranking are arithmetic over word
//! frequency, so they work in any language `crate::text` can segment. Cue
//! detection is different: it is pattern matching against how people actually
//! phrase a commitment, and a phrase list is per-language by nature.
//!
//! Holding them as one table per language buys three things a set of flat
//! lists could not:
//!
//! 1. **The interface can say which languages this works in.** See
//!    [`languages`]. Silently finding no action items in a French meeting and
//!    letting the user conclude their meeting had none is the failure mode
//!    worth engineering against — it is indistinguishable from a correct
//!    empty result.
//! 2. **Code-switching works.** Every language's cues are matched against
//!    every sentence, so a Singapore or Hong Kong meeting that runs half in
//!    English and half in Chinese gets both. That is the normal case in this
//!    product's own back yard, not an edge case.
//! 3. **Adding a language is one entry**, and it cannot be half-added — the
//!    struct has no optional fields.
//!
//! # Choosing a cue
//!
//! Every cue is matched as a substring of the lowercased sentence, against
//! *all* languages at once, so a cue that is also an ordinary word in another
//! language produces cross-language false positives. Prefer multi-word
//! phrases in Latin scripts (`"vamos a "`, not `"vamos"`); CJK cues cannot
//! collide with Latin ones and can be shorter.

/// One language's phrasings.
pub struct Cues {
    /// The endonym, for the interface to list. A user looking for their own
    /// language looks for the word they call it.
    pub language: &'static str,
    /// BCP-47-ish, to line up with what Whisper reports.
    pub code: &'static str,
    /// "Somebody is to do this."
    pub actions: &'static [&'static str],
    /// "This was settled."
    pub decisions: &'static [&'static str],
    /// Openers that make a sentence a question even where the transcript
    /// dropped the question mark, which speech recognition does constantly.
    pub question_leads: &'static [&'static str],
    /// Endings that do the same job in languages that mark questions at the
    /// end rather than the start — Japanese か, Korean 까요.
    pub question_endings: &'static [&'static str],
    /// Deadline phrasings. Copied into the summary as said, never converted
    /// to a date: we do not know today's date and a wrong one is worse than
    /// the speaker's own words.
    pub due: &'static [&'static str],
    /// "I will do it" — the speaker committing themselves, which is the
    /// commonest phrasing of all and whose owner is whoever was talking.
    pub first_person: &'static [&'static str],
    /// What follows a name when the name is the owner: "Ana **will** send it".
    pub owner_markers: &'static [&'static str],
}

pub const ALL: &[Cues] = &[
    ENGLISH,
    SIMPLIFIED,
    TRADITIONAL,
    JAPANESE,
    KOREAN,
    SPANISH,
    FRENCH,
    GERMAN,
    PORTUGUESE,
];

/// The languages whose action items, decisions and deadlines this can find.
///
/// Surfaced so the interface can name them rather than leaving a user to
/// discover by absence.
pub fn languages() -> Vec<&'static str> {
    ALL.iter().map(|c| c.language).collect()
}

const ENGLISH: Cues = Cues {
    language: "English",
    code: "en",
    actions: &[
        "action item",
        "i'll ",
        "i will ",
        "we'll ",
        "we will ",
        "you'll ",
        "can you ",
        "could you ",
        "please ",
        "needs to ",
        "need to ",
        "we should ",
        "you should ",
        "let's ",
        "let us ",
        "going to ",
        "follow up",
        "to-do",
        "todo",
        "deadline",
        "take care of",
        "look into",
        "circle back",
        "make sure",
    ],
    decisions: &[
        "we decided",
        "we've decided",
        "we have decided",
        "decision is",
        "the decision",
        "we agreed",
        "we've agreed",
        "agreed to",
        "we're going with",
        "we will go with",
        "signed off",
        "approved",
        "let's go with",
        "settled on",
        "the call is",
    ],
    question_leads: &[
        "who ",
        "what ",
        "when ",
        "where ",
        "why ",
        "how ",
        "which ",
        "should we ",
        "do we ",
        "can we ",
        "are we ",
        "is there ",
        "does anyone ",
    ],
    question_endings: &[],
    due: &[
        "by end of day",
        "by eod",
        "by tomorrow",
        "by monday",
        "by tuesday",
        "by wednesday",
        "by thursday",
        "by friday",
        "by saturday",
        "by sunday",
        "by next week",
        "by the end of the week",
        "by the end of the month",
        "by the end of the quarter",
        "this week",
        "next week",
        "next month",
        "next quarter",
        "today",
        "tomorrow",
    ],
    first_person: &["i'll ", "i will ", "i'm going to ", "i can ", "i'd better "],
    owner_markers: &[
        " will ",
        " to ",
        " is going to ",
        " should ",
        " can ",
        " owns ",
    ],
};

const SIMPLIFIED: Cues = Cues {
    language: "简体中文",
    code: "zh-Hans",
    actions: &[
        "行动项",
        "待办",
        "我会",
        "我们会",
        "我来",
        "我去",
        "需要",
        "记得",
        "截止",
        "负责",
        "跟进",
        "落实",
        "安排一下",
        "麻烦你",
        "请你",
        "你来",
        "下周之前",
        "务必",
        "尽快",
        "推进",
    ],
    decisions: &[
        "我们决定",
        "决定了",
        "就这么定",
        "达成一致",
        "确定下来",
        "批准",
        "通过了",
        "拍板",
        "定下来了",
        "同意了",
    ],
    // Chinese marks questions with a particle or an interrogative, both of
    // which sit inside the sentence rather than at its start, so these are
    // matched anywhere — see `crate::local::is_question`.
    question_leads: &[
        "是不是",
        "为什么",
        "什么时候",
        "谁来",
        "谁负责",
        "怎么",
        "怎样",
        "多少",
        "哪个",
        "哪些",
        "要不要",
        "能不能",
        "可以吗",
        "对吗",
        "好吗",
    ],
    // 吗 and 呢 mark a question; 吧 does not -- it softens a statement
    // ("应该是小林吧" is "it's probably Lin", not a question), and listing it
    // here files ordinary sentences under Questions.
    question_endings: &["吗", "呢"],
    due: &[
        "下周",
        "本周",
        "这周",
        "明天",
        "今天",
        "后天",
        "月底",
        "周五前",
        "下个月",
        "本月底",
        "季度末",
        "尽快",
    ],
    first_person: &["我会", "我来", "我去", "我负责", "我跟进"],
    owner_markers: &["会", "来", "负责", "跟进", "去"],
};

/// Traditional Chinese.
///
/// Not derivable from the Simplified list: several of these differ by more
/// than the characters. 拍板 is used in both, but 落實 / 落实 differ in script
/// while 敲定 and 確認 are the more natural Taiwan and Hong Kong phrasings for
/// "settled". Running a character conversion over the Simplified list would
/// produce text that is technically Traditional and idiomatically wrong.
const TRADITIONAL: Cues = Cues {
    language: "繁體中文",
    code: "zh-Hant",
    actions: &[
        "行動項",
        "待辦",
        "我會",
        "我們會",
        "我來",
        "我去",
        "需要",
        "記得",
        "截止",
        "負責",
        "跟進",
        "落實",
        "安排一下",
        "麻煩你",
        "請你",
        "你來",
        "下週之前",
        "務必",
        "盡快",
        "推進",
    ],
    decisions: &[
        "我們決定",
        "決定了",
        "就這麼定",
        "達成一致",
        "確定下來",
        "批准",
        "通過了",
        "拍板",
        "敲定",
        "確認了",
        "同意了",
    ],
    question_leads: &[
        "是不是",
        "為什麼",
        "什麼時候",
        "誰來",
        "誰負責",
        "怎麼",
        "怎樣",
        "多少",
        "哪個",
        "哪些",
        "要不要",
        "能不能",
        "可以嗎",
        "對嗎",
        "好嗎",
    ],
    // See the Simplified list: 吧 softens, it does not ask.
    question_endings: &["嗎", "呢"],
    due: &[
        "下週",
        "本週",
        "這週",
        "明天",
        "今天",
        "後天",
        "月底",
        "週五前",
        "下個月",
        "本月底",
        "季度末",
        "盡快",
    ],
    first_person: &["我會", "我來", "我去", "我負責", "我跟進"],
    owner_markers: &["會", "來", "負責", "跟進", "去"],
};

const JAPANESE: Cues = Cues {
    language: "日本語",
    code: "ja",
    actions: &[
        "アクションアイテム",
        "対応します",
        "やります",
        "私がやり",
        "確認します",
        "お願いします",
        "対応してください",
        "必要があります",
        "しなければ",
        "フォローアップ",
        "タスク",
        "宿題",
        "までに",
        "担当します",
    ],
    decisions: &[
        "決定しました",
        "決まりました",
        "合意しました",
        "承認されました",
        "そうしましょう",
        "決定です",
        "確定しました",
        "こうしましょう",
    ],
    question_leads: &[
        "なぜ",
        "いつ",
        "どこ",
        "誰が",
        "どう",
        "何を",
        "どの",
        "いくつ",
    ],
    // Japanese marks a question at the end, so the leads above catch only some
    // of them.
    question_endings: &["か", "か？", "ですか", "ますか", "でしょうか"],
    due: &[
        "明日",
        "今日",
        "今週",
        "来週",
        "来月",
        "月末",
        "金曜まで",
        "至急",
    ],
    first_person: &["私が", "僕が", "やります", "対応します"],
    owner_markers: &["さんが", "さんは", "が担当", "がやり"],
};

const KOREAN: Cues = Cues {
    language: "한국어",
    code: "ko",
    actions: &[
        "액션 아이템",
        "제가 하겠습니다",
        "하겠습니다",
        "확인하겠습니다",
        "부탁드립니다",
        "해주세요",
        "필요합니다",
        "해야 합니다",
        "팔로업",
        "담당하겠습니다",
        "까지",
    ],
    decisions: &[
        "결정했습니다",
        "결정되었습니다",
        "합의했습니다",
        "승인되었습니다",
        "그렇게 하기로",
        "확정되었습니다",
    ],
    question_leads: &["왜", "언제", "어디", "누가", "어떻게", "무엇을", "몇"],
    question_endings: &["까요", "나요", "습니까", "인가요"],
    due: &[
        "내일",
        "오늘",
        "이번 주",
        "다음 주",
        "다음 달",
        "월말",
        "금요일까지",
    ],
    first_person: &["제가", "저는", "하겠습니다"],
    owner_markers: &["님이", "씨가", "이 담당"],
};

const SPANISH: Cues = Cues {
    language: "Español",
    code: "es",
    actions: &[
        "voy a ",
        "vamos a ",
        "hay que ",
        "tenemos que ",
        "tienes que ",
        "por favor ",
        "puedes ",
        "podrías ",
        "me encargo",
        "te encargas",
        "hacer seguimiento",
        "pendiente",
        "tarea",
    ],
    decisions: &[
        "hemos decidido",
        "decidimos",
        "estamos de acuerdo",
        "quedamos en",
        "acordamos",
        "aprobado",
        "la decisión es",
    ],
    question_leads: &[
        "quién ",
        "qué ",
        "cuándo ",
        "dónde ",
        "por qué ",
        "cómo ",
        "cuánto ",
    ],
    question_endings: &[],
    due: &[
        "para mañana",
        "para el viernes",
        "esta semana",
        "la próxima semana",
        "el próximo mes",
        "hoy",
        "mañana",
        "fin de mes",
    ],
    first_person: &["voy a ", "me encargo", "yo lo "],
    owner_markers: &[" va a ", " se encarga", " tiene que "],
};

const FRENCH: Cues = Cues {
    language: "Français",
    code: "fr",
    actions: &[
        "je vais ",
        "on va ",
        "il faut ",
        "nous devons ",
        "tu dois ",
        "peux-tu ",
        "pourrais-tu ",
        "s'il te plaît",
        "s'il vous plaît",
        "je m'occupe",
        "tu t'occupes",
        "à faire",
        "relancer",
        "suivi",
    ],
    decisions: &[
        "nous avons décidé",
        "on a décidé",
        "nous sommes d'accord",
        "on est d'accord",
        "c'est décidé",
        "approuvé",
        "la décision est",
    ],
    question_leads: &[
        "qui ",
        "quoi ",
        "quand ",
        "où ",
        "pourquoi ",
        "comment ",
        "combien ",
    ],
    question_endings: &[],
    due: &[
        "pour demain",
        "pour vendredi",
        "cette semaine",
        "la semaine prochaine",
        "le mois prochain",
        "aujourd'hui",
        "demain",
        "fin du mois",
    ],
    first_person: &["je vais ", "je m'occupe", "je le "],
    owner_markers: &[" va ", " doit ", " s'occupe"],
};

const GERMAN: Cues = Cues {
    language: "Deutsch",
    code: "de",
    actions: &[
        "ich werde ",
        "wir werden ",
        "wir müssen ",
        "du musst ",
        "kannst du ",
        "könntest du ",
        "bitte ",
        "ich kümmere mich",
        "du kümmerst dich",
        "nachfassen",
        "aufgabe",
        "bis freitag",
        "bis montag",
    ],
    decisions: &[
        "wir haben entschieden",
        "wir entscheiden",
        "wir sind uns einig",
        "beschlossen",
        "genehmigt",
        "die entscheidung ist",
    ],
    question_leads: &[
        "wer ", "was ", "wann ", "wo ", "warum ", "wie ", "welche ", "wieviel ",
    ],
    question_endings: &[],
    due: &[
        "bis morgen",
        "bis freitag",
        "diese woche",
        "nächste woche",
        "nächsten monat",
        "heute",
        "morgen",
        "ende des monats",
    ],
    first_person: &["ich werde ", "ich kümmere mich", "ich mache "],
    owner_markers: &[" wird ", " muss ", " kümmert sich"],
};

const PORTUGUESE: Cues = Cues {
    language: "Português",
    code: "pt",
    actions: &[
        "vou ",
        "vamos ",
        "precisamos ",
        "você precisa ",
        "por favor ",
        "pode ",
        "poderia ",
        "eu cuido",
        "você cuida",
        "acompanhar",
        "pendência",
        "tarefa",
    ],
    decisions: &[
        "decidimos",
        "nós decidimos",
        "estamos de acordo",
        "ficou decidido",
        "aprovado",
        "a decisão é",
    ],
    question_leads: &[
        "quem ", "o que ", "quando ", "onde ", "por que ", "como ", "quanto ",
    ],
    question_endings: &[],
    due: &[
        "até amanhã",
        "até sexta",
        "esta semana",
        "semana que vem",
        "mês que vem",
        "hoje",
        "amanhã",
        "fim do mês",
    ],
    first_person: &["vou ", "eu cuido", "eu faço "],
    owner_markers: &[" vai ", " precisa ", " cuida"],
};

#[cfg(test)]
mod tests {
    use super::*;

    /// Every entry has to be usable: an empty list means the language is
    /// advertised in `languages()` while finding nothing, which is exactly the
    /// silent-absence failure this table exists to prevent.
    #[test]
    fn every_language_carries_real_cues() {
        for cue in ALL {
            assert!(!cue.language.is_empty(), "{} has no name", cue.code);
            assert!(!cue.actions.is_empty(), "{} has no action cues", cue.code);
            assert!(
                !cue.decisions.is_empty(),
                "{} has no decision cues",
                cue.code
            );
            assert!(!cue.due.is_empty(), "{} has no deadline cues", cue.code);
            assert!(
                !cue.question_leads.is_empty() || !cue.question_endings.is_empty(),
                "{} can recognise no questions at all",
                cue.code
            );
        }
    }

    /// Cues are matched lowercased, so an uppercase one can never fire.
    #[test]
    fn every_latin_cue_is_already_lowercase() {
        for cue in ALL {
            for phrase in cue
                .actions
                .iter()
                .chain(cue.decisions)
                .chain(cue.question_leads)
                .chain(cue.due)
                .chain(cue.first_person)
                .chain(cue.owner_markers)
            {
                assert_eq!(
                    *phrase,
                    phrase.to_lowercase(),
                    "{}: {phrase:?} would never match",
                    cue.code
                );
            }
        }
    }

    #[test]
    fn the_languages_are_named_by_their_own_endonym() {
        let names = languages();
        assert!(names.contains(&"简体中文"));
        assert!(names.contains(&"繁體中文"));
        assert!(names.contains(&"日本語"));
        assert!(names.len() >= 9);
    }

    /// Simplified and Traditional must not be the same list under different
    /// names: a character conversion would produce technically-Traditional
    /// text that reads wrong in Taipei and Hong Kong.
    #[test]
    fn the_two_chinese_lists_are_actually_different() {
        assert_ne!(SIMPLIFIED.decisions, TRADITIONAL.decisions);
        assert!(TRADITIONAL.decisions.contains(&"敲定"));
        assert!(SIMPLIFIED.actions.iter().any(|c| c.contains('会')));
        assert!(TRADITIONAL.actions.iter().any(|c| c.contains('會')));
    }
}

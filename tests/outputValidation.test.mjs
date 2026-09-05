import assert from 'node:assert/strict'
import test from 'node:test'
import {
  InvalidRenditionError,
  InvalidSemanticSimilarityError,
  MIN_SEMANTIC_SIMILARITY_SCORE,
  isSemanticallySameAsOriginal,
  validateRenditionText,
  validateSemanticSimilarityForRendition
} from '../server/utils/ai/outputValidation.ts'
import { buildSystemPrompt } from '../server/utils/ai/prompt.ts'
import { countParagraphs, countSentences, hasRewritableContent } from '../server/utils/ai/textShape.ts'
import { TONES, findTone } from '../shared/utils/tones.ts'

const tone = id => findTone(id)
const expectCode = (action, code) => assert.throws(action, error => error instanceof InvalidRenditionError && error.code === code)
const expectSimilarityCode = (action, code) => assert.throws(action, error => error instanceof InvalidSemanticSimilarityError && error.code === code)

test('接受非空且未過度膨脹的改寫', () => {
  assert.doesNotThrow(() => validateRenditionText('今天 3 點開會。', '今天 3 點要開會，請大家留意。', tone('gentle_friendly')))
  assert.doesNotThrow(() => validateRenditionText('你為什麼不回我', '你為什麼還沒有回我呢', tone('gentle_friendly')))
})

test('拒絕空輸出與過長輸出', () => {
  expectCode(() => validateRenditionText('短文', ' \n', tone('gentle_friendly')), 'invalid_model_output')
  expectCode(() => validateRenditionText('短文', '字'.repeat(501), tone('gentle_friendly')), 'output_too_long')
})

test('網址、數字、金額、標籤與帳號必須原樣保留', () => {
  const original = '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Demo，找 @alice。'
  for (const rendition of [
    '請看 https://example.com/b，預算 $1,200，完成 30%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,300，完成 30%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 31%，標記 #Demo，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Prod，找 @alice。',
    '請看 https://example.com/a，預算 $1,200，完成 30%，標記 #Demo，找 @bob。'
  ]) {
    expectCode(() => validateRenditionText(original, rendition, tone('gentle_friendly')), 'token_changed')
  }
})

test('第一人稱被改成第三人稱、對作者說話、你我反轉都拒絕', () => {
  const post = '完全不知道為什麼對我敵意很重，我真的找他問問題都憋氣憋到快瘋掉。'
  expectCode(() => validateRenditionText(post, '真的很抱歉您近期的上班經驗非常令人煩躁，希望能盡快好轉。', tone('gentle_friendly')), 'perspective_changed')
  expectCode(() => validateRenditionText(post, '同事對他敵意很重，讓當事人憋氣憋到快瘋掉。', tone('objective_neutral')), 'perspective_changed')
  expectCode(() => validateRenditionText('幹 這樣我還要為了你花這個錢???', '辛苦為了我花錢了，希望下次能更省心一點。', tone('gentle_friendly')), 'perspective_changed')
  assert.doesNotThrow(() => validateRenditionText('幹 這樣我還要為了你花這個錢???', '這樣我還得為了你花這筆錢嗎？', tone('gentle_friendly')))
})

test('描述原文而不是改寫原文的輸出拒絕', () => {
  expectCode(() => validateRenditionText('欸欸欸欸欸欸', '有重複的聲音。', tone('objective_neutral')), 'meta_description')
  expectCode(() => validateRenditionText('???', '原文為疑問符號', tone('clear_concise')), 'meta_description')
  expectCode(() => validateRenditionText('我她媽要在太陽下等兩小時你好意思==', '用戶表示要在太陽下等兩小時，對此表示驚訝或質疑。', tone('objective_neutral')), 'meta_description')
  assert.doesNotThrow(() => validateRenditionText('外面的聲音好大', '外面的聲音真的很大耶', tone('gentle_friendly')))
})

test('抄了範例句片段或佔位字母句型的輸出拒絕', () => {
  expectCode(() => validateRenditionText('兩小時吧 笑死', '兩小時…好笑…重點…要…抓緊…', tone('caige')), 'sample_leaked')
  expectCode(() => validateRenditionText('幹這樣會不會買不到', '如果 A，那 B 就是 C。\n\n那麼，就會變成買不到。', tone('huangshanliao')), 'sample_leaked')
  assert.doesNotThrow(() => validateRenditionText('今天的會議沒有達到期待', '今天的會議沒有達到期待，有點可惜。', tone('gentle_friendly')))
})

test('砍掉大半內容的輸出拒絕，清楚簡潔可以短一點', () => {
  const post = '今天上班一個月了，工作真的很多。同事講話陰陽怪氣，我聽得很不爽。像我一樣每天早起一個半小時不好嗎。'
  expectCode(() => validateRenditionText(post, '上班一個月工作很多。', tone('clear_concise')), 'content_dropped')
  expectCode(() => validateRenditionText(post, '上班一個月。工作很多。我不爽。', tone('gentle_friendly')), 'content_dropped')
  assert.doesNotThrow(() => validateRenditionText(post, '上班一個月，工作很多。同事講話帶刺，我不太舒服。像我一樣每天早起不好嗎。', tone('clear_concise')))
})

test('沒有命題可改的短內容不進改寫', () => {
  for (const text of ['欸欸欸欸欸欸', '???', '傻眼', '哈哈哈哈', '好喔', '啥', 'ok', '謝謝']) {
    assert.equal(hasRewritableContent(text), false, text)
  }
  for (const text of ['我大遲到^^', '兩小時吧 笑死', '你為什麼不回我', '這個人就是這樣']) {
    assert.equal(hasRewritableContent(text), true, text)
  }
})

test('句數與段數的量法不被刪節號與空行灌水', () => {
  assert.equal(countSentences('今天很累。明天再說！好嗎？'), 3)
  assert.equal(countSentences('兩小時…好笑…重點…'), 3)
  assert.equal(countSentences('欸欸欸'), 1)
  assert.equal(countParagraphs('第一段\n\n第二段\n第三段'), 3)
})

test('語意相似度必須高於門檻且不可缺少分數', () => {
  assert.equal(MIN_SEMANTIC_SIMILARITY_SCORE, 0.7)
  assert.doesNotThrow(() => validateSemanticSimilarityForRendition({
    status: 'ok',
    score: 0.801,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }))
  expectSimilarityCode(() => validateSemanticSimilarityForRendition({
    status: 'ok',
    score: 0.7,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), 'semantic_similarity_too_low')
  expectSimilarityCode(() => validateSemanticSimilarityForRendition({
    status: 'unavailable',
    score: null,
    error: 'no_embedding_credential'
  }), 'semantic_similarity_unavailable')
})

test('語意相似度等同一百趴時視為原文', () => {
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 1,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), true)
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 0.9999999999,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), true)
  assert.equal(isSemanticallySameAsOriginal({
    status: 'ok',
    score: 0.999,
    model: 'text-embedding-3-small',
    version: 'cosine-nfc-v1'
  }), false)
  assert.equal(isSemanticallySameAsOriginal(null), false)
})

test('系統提示包含共通不變量、人稱規則與原文的段句數，且不附範例句', () => {
  const original = '你為什麼不回我。\n\n我等了一整天！'
  const prompt = buildSystemPrompt(TONES, 'message', original)
  assert.match(prompt, /不可曲解原文立場/)
  assert.match(prompt, /不可增加、刪除或改動任何客觀事實、數字、人物/)
  assert.match(prompt, /保留人稱與視角/)
  assert.match(prompt, /不得描述原文/)
  assert.match(prompt, /原文共 2 段、約 2 句/)
  assert.match(prompt, /語意相似度都必須高於 70%/)
  assert.match(prompt, /採最小改寫原則/)
  assert.match(prompt, /必須保留否定、程度、副詞、條件、時間順序、因果關係與不確定語氣/)
  assert.match(prompt, /輸出前先在內部自檢/)
  assert.match(prompt, /「你」就是讀者本人/)
  assert.doesNotMatch(prompt, /範例輸出/)
  for (const item of TONES) {
    assert.match(prompt, new RegExp(`"${item.id}"（${item.label}）`))
    assert.equal(prompt.includes(item.sample), false, item.id)
  }
  assert.match(buildSystemPrompt(TONES, 'post', original), /公開發表的貼文/)
  assert.match(buildSystemPrompt(TONES, 'comment', original), /留言/)
})

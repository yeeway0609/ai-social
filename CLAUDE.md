# AI Social 開發慣例

## 文件與程式碼註解的撰寫風格

### 語言、標點與空格間距

- 一律用**正體中文**。
- 標點一律用**全形**——文件、規格書、程式碼註解與 docstring 皆同
- 下列維持半形：程式碼區塊與行內程式碼、Markdown 連結網址、檔名／路徑／URL／識別碼、mermaid 語法字元；註解裡引用到這些（如 `user.id`、`sort: saves`）也照原樣半形。
- 中文↔英文、中文↔數字、數字↔單位之間各加一個半形空格（「外部 API」「第 3 場」「30 秒」）。
- 全形標點與相鄰字元之間不加空格（「公開／私人」不是「公開 ／ 私人」；「清單。」不是「清單 。」）。

### 程式碼註解

- 只解釋**為什麼**與不明顯的邏輯、邊界、gotcha（並發／唯一約束／軟刪除）；顯而易見的事不寫。
- **不引用規格文件、不帶編號**（`doc-9`、`decision-11`、`§3.1`）；要指涉就用領域概念名。
- **不要用 RST 雙反引號**框路徑／識別碼（本專案無 Sphinx renderer），直接寫 `/playlists`、`user_id`。
- module docstring 一句話說模組負責什麼；簡單易懂的模組（例如 /health）不寫；不放冗長規則清單。

**刪除判準**——問「拿掉這行註解，讀者會少知道什麼？」，答案是「什麼都不會少」就刪。三種典型該刪的：

- 複述功能的多行 header（把檔案做什麼用中文再敘述一遍）。
- 把函式名或下一行程式碼翻成中文（例：`// 向後端確認目前登入者；未登入則設為 null` 配一個 try／catch 已寫明的 `fetchMe`）。
- 為顯而易見的實作選擇辯護（例：`// 行元素用原生 Map 存即可，不需要響應性`）。

反過來，**跨模組共享、型別表達不了的約定要留，並寫成 JSDoc** 讓呼叫端 hover 得到：

```ts
/** 跨元件共享的登入者狀態；null 代表未登入、undefined 代表尚未查詢。 */
const user = useState<CurrentUser | null | undefined>('auth-user', () => undefined)
```

### 註解與規格文件的分工

- **PRD 寫「產品要什麼」**：需求、規則、值域、權限、流程。**註解寫「這段程式為什麼這樣寫」**：不變量、邊界、效能或並發上的取捨。
- **判準**——換一種實作方式後這句話仍然成立，就屬於 doc；只在目前這個寫法下才成立，才屬於註解。
- **兩者不互相複製**：規則本身只寫在 doc；程式碼只在「不看註解會誤以為可以簡化」的地方，用領域概念名點出它在滿足哪條規則。把 doc 的規則清單抄進註解，等同於製造第二份會過期的規格。

## 命名慣例（前後端共用）

- **不縮寫**：`rvPage` 要寫成 `revisionPage`、`fmtTime` 要寫成 `formatTime`。例外是行業慣例縮寫（`idx`、`el`、`ctx`、`e`），限區域變數與參數使用；跨模組的 export 仍寫全名。
- **不用自創術語**：只在本 repo 有意義、新人得先讀別處才懂的詞不要用（用「歌詞」不用「主軌」、用「字元組」不用「cluster」）。
- **數字欄位帶維度後綴**（`Index`／`Ms`／`Count`）：同一物件裡已有 `startMs` 時，另一個 `start` 單看不知道是毫秒還是索引，要寫成 `startIndex`。

## 領域詞彙表（CONTEXT.md）

repo 根目錄的 `CONTEXT.md` 是領域詞彙表（glossary）：定義每個領域概念的正式名稱、對應的程式碼識別碼，以及該避免的同義詞。命名、文件與註解的用詞以它為準；發現術語衝突或敲定新術語時，當下就更新它。它只是詞彙表——需求寫 PRD、實作細節寫程式碼或 `docs/`，都不進 `CONTEXT.md`。

## 分支與部署環境

| 分支 | 環境 | 說明 |
|------|------|------|
| `dev` | Vercel Preview | **預設的開發分支**，推上去即自動部署 |
| `main` | Vercel Production（demo 當天才啟用） | 只接受由 `dev` 合併進來的變更，不直接在上面開發 |
| `feature/*`、`fix/*` | 臨時 Preview | 需要隔離時才開，完成後合回 `dev` |

沒有特別指示就在 `dev` 上工作。部署拓撲與環境變數見 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 任務管理（Backlog.md）

本專案用 [Backlog.md](https://github.com/MrLesk/Backlog.md) 管理待辦事項

- **存放**：`backlog/tasks/`（任務）、`backlog/docs/`（PRD 規格）、`backlog/decisions/`（ADR 決策紀錄）
- **標籤慣例**：`backend`／`frontend` 標分層；`feature`／`bug`／`security`／`tech-debt` 標性質；`spec` 標「由某份 PRD 衍生的待決問題」（見「### 與 backlog.md 的整合」）。

工作流：**動工前先 `search`／`list` 找有沒有既有任務**；需要規劃或交接的工作才建任務，瑣碎機械修改直接做。**一律用 `backlog` CLI 操作，不要手改 `backlog/` 底下的 markdown**（否則 metadata／關聯／歷史會不一致），唯一例外是 `backlog/docs/` 的正文內容

### Commit 訊息慣例（backlog 與規格文件）

採 Conventional Commits，以下幾種特別說明：

- **`docs(spec):`** - 規格文件的實質內容修訂：`backlog/docs/` 的 PRD 本文、`backlog/decisions/` 的決策紀錄。
- **`chore(backlog):`** - 任務流轉的流水帳：開單、改狀態、調優先級、勾驗收條件、補完成筆記等 `backlog/tasks/` 的變更。

## 規格文件（PRD／決策）

### 存放位置

- **PRD／規格書**：以 backlog doc 管理，放 `backlog/docs/`（type `specification`）
- **程式架構或其他說明文件**：放 `docs/`（如 `docs/ARCHITECTURE.md`，維持一般 Markdown，不進 backlog）。

### 與 backlog.md 的整合

規格本文、決策、待決問題三者分工，一份 PRD 拆成三種 backlog 物件：

- **PRD 本文** → backlog doc（`backlog/docs/`）：需求、場景、流程圖等「現在成立的設計」。**doc 本文不留「未解問題」區塊**，doc 永遠反映當前已定案的設計。
- **已定案的決策** → backlog decision（`backlog/decisions/`，ADR 三段式 Context／Decision／Consequences）：正文開頭標 `> PRD：<標題>（doc-N）` 註明屬於哪份 PRD。決策一旦 accepted，要把結論**整合回對應 doc 本文**。
- **待決策的開放問題** → backlog task（label 加 `spec`）：用 `--doc doc-N` 連回所屬 PRD。拍板後產出 decision 並更新 doc。

連結方向一律是 **task／decision 記錄「屬於哪份 PRD doc」**（task 用 `documentation` 欄位、decision 在正文標註），doc 不反向列舉

### 撰寫流程

- **訂製新規格**（新產品／新功能）：一律先用 `spec-writer` skill 訪談釐清，再依上述拆成 doc ＋ task／decision，不要直接動筆。
- **更新既有規格**：依上述三分工改 doc 本文、開 decision 或 `spec` task；小修訂不需走 `spec-writer`。
- doc 本文用 Edit 直接改（`backlog doc update --content` 會整份覆寫，不適合局部修訂）——這是「不手改 `backlog/` markdown」的唯一例外。
- doc 只留**當前設計**，不寫成修訂歷史；「原本 X 改為 Y」屬於 decision 的職責。

### 規格與實作的一致性（每次變更都適用）

**實作偏離了 doc 已寫的設計時，在同一次變更內把 doc 改成新設計**，不接受「之後再補」——doc 一旦落後就不再是可信的事實來源，而它正是日後回答「這裡當初為什麼這樣設計」的依據。

動筆前先分清楚三種情況，處置完全不同：

| 情況 | 判別 | 處置 |
|---|---|---|
| **doc 過期** | 這次是刻意改設計，實作比 doc 新 | 更新 doc 本文貼合現況 |
| **實作偏離** | 不小心違反了仍然有效的設計 | 這是 bug；**不可改 doc 去遷就它**，回報使用者決定修或開 task |
| **尚未實作** | doc 描述的是未來要做的事 | 不是漂移，確認有無對應 task |

- 判不準屬於哪一種就**問使用者**，不要自行認定哪一邊是對的。規格是使用者的產品決策紀錄，不是可自動對齊的衍生檔案。
- 推翻既有設計選擇的變更，除了更新 doc，還要補一則 decision。
- doc 沒提到、但實作長出來的新能力，同樣是漂移，要一併補進 doc。
- 使用者自己改了實作而規格沒跟上（同步模式），或想回頭全面稽核既有漂移（稽核模式），都用 `check-spec-drift` skill。

<!-- BACKLOG.MD GUIDELINES START -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Use the detailed guides when needed:
- `backlog instructions task-creation` for creating or splitting tasks
- `backlog instructions task-execution` for planning and implementation workflow
- `backlog instructions task-finalization` for completion and handoff

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->


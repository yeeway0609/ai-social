---
paths:
  - "app/**/*.vue"
  - "app/**/*.{ts,mts,mjs,js}"
  - "shared/**/*.ts"
---

涵蓋範圍由通用到特定語言：架構原則 → TypeScript → Vue → Nuxt。伺服端（server/）另見 server-style.md。

## 架構原則

### 不為了分層而分層

每一層都要能說出它封裝了什麼，說不出來就內聯：

- **`utils/` 只留有實質邏輯的共用純函式**。純常數集中到 `constants.ts`（用 `// ── 分節 ──` 區隔不相關的組別）；為了抹平型別差異而生的薄包裝直接內聯到使用處（`getHttpStatus` → `err instanceof FetchError && err.status`）。判斷句：一個 util 檔若拿掉常數後只剩一個十行內、無分支的函式，它多半該被內聯或併入 `constants.ts`。
- **只服務單一欄位、沒有複用的子元件併回父層**。SongPicker 只是「歌曲」這個欄位的搜尋與已選卡片，拆成獨立元件只是多一層 props／emit。

## TypeScript

### Boolean 變數命名

以語意前綴開頭，避免被誤認為 callback：loading 狀態用 `isLoading`、可見性用 `isVisible`／`shouldShow`、禁用狀態用 `isDisabled`（如 `isLoadingUsers`、`isVisibleEditModal`）。

### Event handler 命名

格式為 `handle` ＋事件＋修飾詞，修飾詞放最後：

```ts
// Good
handleClickCreate
handleSubmitForm

// Bad——修飾詞放中間容易混淆
handleCreateClick
```

### 型別斷言（避免多餘的 as）

- **框架標好的值別再用型別斷言 `as`**：例如 `useFetch` 的 `error.value` 已吃 ofetch 的 `FetchError`，可以先拿掉跑 `pnpm typecheck`，照樣過且型別沒被悄悄放寬就代表不用型別斷言。
- **套件有提供型別就 import，別手刻**：例如 fetch 錯誤用 ofetch `FetchError`；第三方全域用 `@types/*`（如 `@types/youtube`）。
- **catch 的 `err`（`unknown`）用 `instanceof` 收窄**，別 cast 成手刻 shape：`err instanceof FetchError ? err.data?.detail : undefined`。
- **但保留有意義的收窄**：有些 `as` 編碼了型別系統不知道的事實，拿掉會讓型別悄悄變寬。如未開 `typedPages` 時 `route.params.id` 是 `string | string[]`，`as string` 要留。
- **DOM 事件目標的 `as` 是必要的**：`event.target` 型別是 `EventTarget | null`，`e.target as HTMLInputElement` 屬標準寫法，不需清理。

### 型別的命名與歸檔

- **API 型別與後端 schema 同名**：回應用 `XxxSummary`／`XxxDetail`／實體名，請求 body 用 `XxxCreate`／`XxxUpdate`／`XxxRequest`——同一份資料前後端一個名字，grep 一次打到兩邊。方向後綴（`Out`／`In`／`Ref`）在後端就不用（見 server-style），前端同樣不用。
- 例外：**不直接對應 API 形狀、屬於前端自身概念的型別，用前端語彙命名**——`useAuth` 的登入者狀態叫 `CurrentUser` 而非後端的 `UserMe`，`SongSnapshot`（投稿時送出的歌曲快照）也是前端視角的名字。
- **粗細粒度的型別用 `extends`，不重抄欄位**：

  ```ts
  // Good——一眼看出 Detail 是 Summary 多了哪幾個欄位
  export interface FanchantDetail extends FanchantSummary {
    start_sec: number | null
    end_sec: number | null
    content: LyricContent
  }
  ```

  重抄的欄位是靠人工同步的隱形契約，後端加欄位時很容易只改一邊。前提是包含關係真的成立；欄位剛好重疊但語意無從屬關係時不要硬 `extends`。

## Vue

### `<script setup>` 宣告順序

由上而下依序排列，同類放一起：

1. **型別宣告**：`interface`、`type`。
2. **常數**：模組層級不變的值（`const MAX_XXX`、對照表、regex 等）。
3. **composables／hooks**：`useI18n()`、`useRoute()`、`useApi()`、`useAuth()` 等 `useXXX` 呼叫。
4. **狀態變數**：`ref()`、`reactive()` 等本地狀態。
5. **衍生值**：`computed()` 等由狀態計算出來的值。
6. **生命週期與副作用**：`onMounted()`、`watch()`、`watchDebounced()` 等，以及事件處理函式。

例外：宣告必須先於使用（TDZ），依賴狀態的 composable（如 `useAsyncData`、`useYtPlayer`）放在其依賴之後；註冊順序有語意的 watcher（如必須先於 `useAsyncData` 註冊的重置 watcher）保持原位並加註解說明。

### composable 的 export

composable 最後的 `return { ... }` 一律一行一個成員展開、不擠成單行，讓呼叫端一眼看出有哪些東西可用：

```ts
return {
  user,
  fetchMe,
  loginWithGoogle,
  logout
}
```

### 標籤屬性順序

`class` 屬性排在標籤屬性的最前面，方便一眼看出樣式。唯一例外是 `key`或結構型指令（`v-if`／`v-else-if`／`v-else`／`v-for`等等）：

```vue
<!-- Good -->
<div class="flex gap-2">
<li v-for="item in items" :key="item.id" class="row">

<!-- Bad——class 不在最前 -->
<Button :label="t('save')" class="w-full">
<!-- Bad——結構型指令被 class 蓋過 -->
<li class="row" v-for="item in items" :key="item.id">
```

### v-for 的 key 要用穩定 id

`vue/require-v-for-key` 只保證「有 key」，不保證 key 是對的——**key 要用穩定 id**（`post.id`、`tone.id`）。只有「元素本身即位置」的序列才可以用 index。時間軸會插入新貼文、切語氣會整批換內容，用 index 當 key 會讓 Vue 復用錯的節點，是會出真 bug 的地方。

## Nuxt

### useAsyncData

- 一律 `await`、給**顯式 key**、並帶 `server: false`。
- key 用 kebab-case 的資源名（`review-queue`、`my-fanchants`）；帶動態參數就用 template literal 接（`` `fanchant-${route.params.id}` ``）。**兩個查詢撞到同一個 key 會共用快取**，症狀是換頁後資料沒更新，追起來極痛。

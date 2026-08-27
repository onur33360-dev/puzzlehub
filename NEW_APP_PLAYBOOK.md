# NEW_APP_PLAYBOOK.md

**A permanent playbook for building a new Android + iOS app.**

This file is the distilled residue of one project's worth of lessons — almost
all of them learned by breaking something on a real device, not by reading a
guide. Its only purpose: **do not pay for the same lesson twice.**

Every entry here carries at least one of three things: a decision that becomes
irreversible, a trap that fails *silently*, or a measurement. Nothing is here
because it is "good practice".

---

## 0. How to use this file

**In a new project, this file is the first commit.** Not code. The reason is
that half the decisions below become unchangeable shortly after the second
commit.

Setup:

1. Copy this file into the new repo as `PLAYBOOK.md`. It is reference material
   and does not change.
2. Next to it, create `CLAUDE.md` from the template in §13. **This file is
   static; `CLAUDE.md` is alive.** The playbook holds *how things are done in
   general*; CLAUDE.md holds *what we actually did here and why*.
3. Have Claude read both at the start of every session.
4. Breaking a rule here is allowed — but **never silently.** Record it in
   `CLAUDE.md` as "we are not applying playbook §X because ...".

**Instruction to Claude:** do not memorize numbers from this file. Anything of
the form "the store currently requires X" is time-dependent — check the console
at upload time and treat the value here only as "a requirement of this kind
exists".

---

## 1. Phase 0 — Permanent decisions, made before any code

Everything in this table becomes impossible or expensive after the first store
upload. All of it is decided, in writing, before implementation starts.

| Decision | Locks at | Cost of getting it wrong |
|---|---|---|
| **Bundle / package id** (`com.company.app`) | **Permanent** at first store publish | New app listing; all installs, ratings and reviews lost |
| App display name | Changeable, but brand/SEO cost | Medium |
| Set of supported languages | Technically addable later; in practice, if i18n is not wired on day 1 it becomes a migration | High |
| Monetization model (ads / IAP / subscription / mixed) | Store product ids are permanent | High |
| Minimum OS version | Raising it later drops devices | Medium |
| Target device class (phone / tablet / both) | Determines the entire layout architecture | High |
| Orientation lock | Foundation of interaction design | High |
| Whose account the app is published under (individual / company) | Transfers are painful | High |

### 1.1 The bundle id rule

**Use the same id on both stores.** `com.company.product`. Lowercase, no
hyphens, no words like `test`, `demo`, `app` — you will ship under this id.

The id is written in **four or five files at once** (§6.1, §7.1) and they must
all agree. When one drifts, the failure is at **runtime, not build time**:
FileProvider authority collides, deep links stop opening, purchase validation
does not match.

### 1.2 Accounts and fees — apply before you write code

- **Google Play Console** — one-time fee, identity verification.
- **Apple Developer Program** — annual fee, identity verification; publishing
  as a company requires a **D-U-N-S number**, which can take weeks.
- **Closed-testing requirement for new individual Play accounts:** individual
  accounts created after a certain date must run a closed test with a minimum
  number of testers, opted in continuously for a minimum period, before they can
  ship to production. This is a **calendar** obstacle, not an engineering one —
  finishing the code does not help. Put it on the schedule at project start.
- **AdMob / RevenueCat / analytics** accounts — no money moves until payment and
  tax forms are filed, and those also queue for approval.

**Rule: never leave account setup to the end of development.** The day the code
is done you will otherwise discover 2–6 weeks of paperwork in front of you.

### 1.3 The iOS-on-Windows problem — solve it now

**Xcode runs only on macOS.** You cannot build iOS on Windows. Options:

| Path | Cost | Note |
|---|---|---|
| Physical Mac (mini / MacBook) | High upfront | Smoothest; Xcode, simulator, device debugging all local |
| Cloud CI (GitHub Actions macOS runners, Codemagic, Bitrise, EAS Build) | Per-minute / monthly | Builds fine; **does not give you interactive debugging** |
| Rented remote Mac (MacStadium etc.) | Monthly | Full Xcode over screen sharing |

**The deciding question: will you *debug* on iOS, or only *build*?** CI is
enough for builds. But the moment an iOS-specific bug appears (WKWebView, audio,
safe area, keyboard), CI cannot help you — you need a Mac that day.

**The most expensive lesson in this playbook:** most real bugs were found *on a
device*, not in a desktop browser. That will be equally true for iOS. Do not
promise an iOS release without Mac access.

---

## 2. Phase 1 — Technology choice

Decide by **how deeply the product touches native**, not by fashion.

| Approach | Choose when | Do not choose when |
|---|---|---|
| **Capacitor** (web → native shell) | The screen is mostly web tech, you draw your own UI/game, native needs stop at ads + payments | Heavy native UI, camera/AR/background services, 120fps native feel expected |
| **React Native / Expo** | Classic app made of real native components, JS team | Heavy graphics/game loop |
| **Flutter** | One codebase + its own renderer, visually consistent | Web is also a primary surface |
| **Native (Kotlin + Swift)** | Deeply platform-bound, performance critical | Solo developer — two codebases, double maintenance |

**Experience from the previous project:** Capacitor was chosen and it was the
right call — the app was already web, and the only thing wanted from native was
ads + payments. **Capacitor is packaging, not a runtime dependency.** Keep that
as a rule: no screen or game imports Capacitor, so the web surface keeps working
standalone. That property is what keeps the fast development loop alive.

### 2.1 Dependency policy — written on day 1

Put this sentence in CLAUDE.md and obey it:

> Zero runtime dependencies is the default. Every new package/plugin is a
> **separate decision**; approval of one does not cover the next.

The reason is not tidiness, it is three concrete costs:
1. Every plugin brings a **version-matching trap** (§2.2).
2. Every SDK inflates APK/IPA size (the ad SDK alone was ~7 MB in the previous
   project).
3. Every SDK creates a **privacy disclosure obligation** (§10). Undeclared means
   rejected.

### 2.2 The plugin version trap — it bit three times; assume a fourth

`npm install <plugin>` installs the **latest major** by default. That major
usually demands the **next** major of the core runtime. Result: a peer
dependency error, or worse, a quietly mismatched install.

**Rule: pin every plugin to the core's major** (`@scope/plugin@^7`). Do not push
past it with `--force` / `--legacy-peer-deps` — those flags do not fix the
mismatch, they hide it.

---

## 3. Phase 2 — Repo skeleton and day-one rules

### 3.1 The order of the first ten commits

The order is not arbitrary; each step prevents the next one's silent failure.

1. `PLAYBOOK.md` + empty `CLAUDE.md` + `.gitignore`
2. App skeleton (one screen, "hello") — **zero features**
3. **i18n runtime + one locale file** (§4.1) — before the first string is written
4. Theme/token layer (§4.5)
5. Native shells — **Android and iOS at the same time** (§3.3)
6. Build script + **whitelist cross-check guard** (§3.4)
7. Single source of truth for version/cache (§3.5)
8. First real screen + first device test (**both platforms**)
9. Analytics/event gate (§4.4)
10. Store accounts + empty app records (lock the id)

**Step 5 being simultaneous is critical.** Defer iOS and every iOS-specific
constraint (WKWebView, safe area, audio unlock, ATT) comes back later as a
*migration*. With both shells open from day one, each feature is validated in
two places as it is born.

### 3.2 `.gitignore` — generated output is never committed

Generated, never committed, **never hand-edited**:
- Web build output (`www/`, `dist/`, `build/`)
- `node_modules/`, `Pods/`, `.gradle/`, `DerivedData/`
- Machine-specific config (`local.properties`, `*.xcuserdatad`)
- Signing keys and passwords (**never, under any circumstance**)

**The trap:** editing a file in a generated folder does not error. The next build
silently overwrites it and the change never reaches the repo. This can eat hours.
Drop a `README` in the folder saying "GENERATED — DO NOT EDIT".

### 3.3 Two platforms, one source

```
/src (or /core, /features …)  ← the single source of truth, platform-agnostic
/platform-android             ← native shell only
/platform-ios                 ← native shell only
/tools                        ← build + validation scripts
/docs                         ← permanent rules
/store                        ← screenshots, listing copy, policy pages
```

**If business logic leaks into a platform folder it is written twice, and one
copy silently rots.** Native side holds only: manifest/Info.plist, icons, splash,
signing, plugin bridges.

### 3.4 The build guard — make "forgot to register the file" impossible

Adding a file to the app but not to the build list is the **hardest bug class to
diagnose** in this kind of project: it works on web, and the packaged app opens
to a blank screen.

**The fix is code, not a rule:** the build script cross-checks the copy list
against the cache/precache list and **fails the build on disagreement.** Do not
remove the guard because it is noisy; being noisy is exactly its job.

The generalized form: **anything that requires registration gets a test.** If a
new screen/feature must be registered in N places, write a harness that catches
the missing Nth — and understand that **the harness breaking when you add a
feature is the point**, not a defect.

### 3.5 Version and cache — one line

Define the version in **exactly one place** and let it flow everywhere. Shipping
an update must be "bump that one line".

If there is a web/PWA surface:
- Shell assets go in a versioned cache bucket; media/fonts in a separate,
  version-independent one. Otherwise every release re-downloads megabytes.
- **Do not register a service worker inside the native shell.** Every asset is
  already local there; the SW adds only a staleness layer. "New build installed,
  old code running" is an unreproducible bug report.

### 3.6 Version numbers mean different things per platform

| | Android | iOS |
|---|---|---|
| What the user sees | `versionName` | `CFBundleShortVersionString` |
| What the store counts | `versionCode` (**monotonic integer**) | `CFBundleVersion` (build number) |

**Neither may decrease or be reused.** Uploading a duplicate build number is
rejected. Increment the build number in CI — a hand-managed integer eventually
collides.

---

## 4. Phase 3 — Architectural contracts (set on day 1, never retrofitted)

Everything in this section turns into a migration if postponed.

### 4.1 i18n is wired on day 1 — no exceptions

Even if you ship one language, build a **key-based string system**. The reason
is not translation; it is these two rules:

**Rule A — user-visible text can never be an identifier.**
This is the most general rule in the whole file. Concrete violations and their
cost:
- Keying a screen/game map by its localized display name → after translation
  nothing matches and the screen says "coming soon".
- `badge: 'Popular'` where the CSS class is chosen by comparing that string →
  translation silently drops the highlight.
- Carrying difficulty as the string `'Hard'` and comparing it to pick a color →
  every card renders the wrong color.

The correct shape: everything has an `id`, display text travels as a `nameKey`,
and **resolution happens at render time, not at module load** (resolving at load
freezes the string in whatever language booted, so a language change leaves it
stale).

**Rule B — definition tables store keys, never resolved text.**

Also from day one:
- Language preference is stored as a **MODE** (`system` | `manual`), not as a
  resolved locale. Storing the resolved value freezes it: the user changes their
  phone language and the app does not follow — a manual choice wearing the
  system's name.
- Number/date/currency formatting uses the **app's** locale, not an argument-less
  `toLocaleString()` (which uses the *device* locale and is wrong for anyone who
  picked a language manually).
- `<html lang>` / platform locale must be correct: case conversion reads it.
  In Turkish, `i → İ` versus `i → I` is a **correctness** issue, not a cosmetic
  one. Every language has one of these.
- **Decide RTL on day one:** the shell mirrors, the "world" (game board,
  direction-carrying interaction) does not. Use logical properties
  (`start`/`end`) instead of physical ones — identical in LTR, free RTL later.
  Note that `translateX` is *not* logical; carry the direction sign in a
  variable.

### 4.2 Storage schema — prefix and doc from day one

- Pick one prefix (`app_`) and never deviate. The previous project has three
  generations of prefix and none can be renamed: **renaming orphans the user's
  data.**
- Keep the key list and shapes in `docs/DATA_AND_STORAGE.md`, starting the day
  you write the first key.
- A deleted feature's key is **not** cleaned up without a migration plan.
- **Cross-platform:** on iOS, WebView local storage can be purged by the system.
  Anything that must survive (purchase state, user identity) lives natively or
  on a server. **Nothing money-related may have the device as its only source of
  truth.**

### 4.3 Economy/balance numbers in one file

Rewards, prices, limits, durations — all in one `Config` block. Every number
buried in code is a "where does this 20 come from" question six months later.

And: **balance numbers are the product owner's decision.** Claude proposes them,
never changes them unilaterally.

### 4.4 One event gate (foundation for analytics/missions/achievements)

Every screen/flow reports through **one function**. Design lessons already paid
for:

- Two events are enough: `x_started` and `x_ended`. The outcome is a `result`
  **field** (`won` | `lost` | `quit`), not separate events. Reason: some flows
  have no "lost" state at all; with separate events those flows look half
  integrated, and every subscriber must reason about both.
- **At most one open round.** A new `started` closes the previous one as `quit`.
  This self-healing is what lets every in-app restart button work without being
  wired individually.
- An `ended` with no open round **does not touch counters** (otherwise
  `completed > started`).
- "Continue after an ad" **reopens** the round; it does not start a new one.
- Counters are derived centrally and name no specific feature — adding a feature
  must not require editing this file.

### 4.5 Theme/token layer

- Colors/sizes as tokens in one layer. If more than one token root ends up
  existing, **document that they do not see each other** — otherwise you get
  "I changed the theme and half the app stayed the same".
- Colors baked into canvas/native drawing are **unreachable by any CSS token.**
  Drawing code must read tokens programmatically, never inline literals.
- The brand color is written in **five places** (app theme, web manifest, meta
  tag, native config, native color resources). When they drift, the app shows the
  wrong color for one frame during the splash handoff. Keep the list in one place.

---

## 5. Phase 4 — Layout and UI safety

**The lesson:** text overflow is not discovered by buying phones one at a time.
In the previous project a 384px device clipped a heading, then a 360px device
clipped **the app's own name**. The problem was the method, not the devices:
fixed-pixel boxes plus "does this string happen to fit" verification means
"correct on the phones I own", never "cannot break".

### 5.1 Structurally safe layout rules

1. **Size icon/boxes in `em`, not px.** When the system font scale grows, the box
   grows with the glyph. This single change fixed the majority of failures.
2. **Let the top bar wrap** (`flex-wrap`). If something must be clipped, it will
   not be the app's name.
3. **Cards size to content** (`max-content`), never a fixed width.
4. **Last-resort guarantee on free text:** `overflow-wrap: anywhere`. Breaking a
   word is ugly; clipping it destroys information.
5. **Breakpoints handle spatial composition only** (is element A beside or below
   B), never text fitting.

### 5.2 System font scale and dynamic type

- Android WebView **inflates** text: a CSS `10px` computes to `11px` on device.
  This produces a defect that is **invisible in a desktop browser at the same
  viewport width**.
- iOS Dynamic Type creates the same class of problem.
- Disabling it (`text-size-adjust: 100%`) **overrides an accessibility
  preference** — that is a product decision, not a silent fix.

### 5.3 Safe area — mandatory on both platforms

- **Without `viewport-fit=cover`, `env(safe-area-inset-*)` returns 0 in a WebView,
  always.** The CSS looks correct and does nothing. Remember this failure shape.
- Recent Android versions make edge-to-edge mandatory for apps targeting the
  current API level and **removed the opt-out** — the WebView extends under the
  status and navigation bars.
- iOS wants the same for the notch/dynamic island and the home indicator.
- Put the padding on **shared containers**, not screen by screen — otherwise a
  new screen depends on someone remembering.
- The rule self-adjusts: on older OS versions the inset is 0 and
  `calc(14px + 0px)` equals the old value. No device detection needed.

### 5.4 Automated layout matrix (high-return tool)

Sweep **width × font-scale × screen** in a headless browser and fail on
sub-pixel text overflow or horizontal scroll.

Measurement trap: `scrollWidth` is rounded to an integer, so a 0.78px overflow
reads as clean. Compare the text's own box
(`Range.selectNodeContents(el).getBoundingClientRect()`) against the element's rect.

Second trap: **the scale simulation must be idempotent.** Scale a parent, then
read a child, and the multiplier is applied twice. Snapshot every computed size
before writing any. A measuring tool that errs in the strict direction invents
failures and burns exactly the time it was built to save.

### 5.5 How languages affect layout

Do not multiply the matrix by every language — runtime explodes, and **a tool
nobody runs is a tool that does not work.** The matrix already proves structural
safety; the question a language adds ("does longer text break it?") is hardest at
the **narrowest width and largest scale**. Run all languages in that one cell, on
a single page load.

---

## 6. Phase 5 — The Android track

### 6.1 Where the package id lives (all must agree)

- Capacitor/RN config `appId`
- `build.gradle` → **`namespace` AND `applicationId` are separate keys**; neither
  derives from the other
- `strings.xml` → package name / custom url scheme
- **The Java/Kotlin source directory itself** — the path must match the `package`
  line inside `MainActivity` (a real move, not a string edit)

`AndroidManifest.xml` usually needs no edit: `.MainActivity` and
`${applicationId}` resolve relatively.

### 6.2 Target API level — a calendar obligation

Play blocks **updates** from apps whose target API falls more than a fixed
window behind the latest release, with a hard deadline each year. "It works,
don't touch it" is not a strategy; it is an annual maintenance item.

When raising it:
- Install the new SDK Platform + build-tools **first**.
- The build plugin (AGP) may have to move up too; the ceiling is usually the
  Gradle wrapper, not the plugin.
- Raising `minSdk` is **not** required and every step costs devices.
- The real risk is not the build, it is **behavior changes** (edge-to-edge being
  the current example). Read the release notes, not just the compiler output.

### 6.3 Signing and Play App Signing

- **Upload key ≠ app signing key.** Play re-signs.
- The invisible consequence: identifiers SDKs derive from the signature (e.g. the
  ad test-device hash) **change with the signing key.** The same phone yields
  **three different values** under debug, release, and a Play-installed build. A
  protection verified in debug may not carry into release — measure, don't assume.
- Never commit the keystore or its password. Losing the upload key has a reset
  path; losing the app signing key is fatal unless Play holds it.

### 6.4 Splash / icons

- Modern Android has **no full-screen native splash**; the system centers the
  launcher icon and ignores your custom background drawable.
- If you want a scene: **hold** the system icon phase via the splash plugin, draw
  the scene inside the app, and release the icon phase only **after the image has
  actually painted**. "Loaded" (decoded) ≠ "drawn" (painted); wait a frame.
- Icon-generation tooling will **regenerate and overwrite your hand-made splash**
  and create folders you never had (dark-mode variants). A device in dark mode
  then silently never shows your scene. Write down the generation order.

### 6.5 Measuring on Android

- **Record thermal state; do not normalize it.** If the device throttles during
  normal use, that throttling is part of the player's experience. Report the
  **tail (P90/P95/P99)**, not the average — the average hides the dropped-frame
  clusters people actually feel.
- Any in-app FPS overlay must be **off** while measuring; it runs its own render
  loop and changes what you are measuring.
- System metrics gathered around synthetic input injection are not comparable —
  the injection's own latency becomes the dominant term. Drive the real event
  handlers from inside the page and sample frame deltas yourself.

---

## 7. Phase 6 — The iOS track

**The core difference: Apple's checklist runs at review time, not build time.**
On Android most mistakes produce a warning; on iOS you get rejected and re-queue.

### 7.1 Identity and signing

- The **Bundle ID** binds to the app once registered in App Store Connect.
- **Certificates / Identifiers / Profiles**: development and distribution
  certificates plus provisioning profiles. Xcode's "Automatically manage signing"
  handles most of it locally — **it does not work in CI**, where you must install
  the certificate and profile explicitly (a fastlane `match`-style setup).
- Capabilities (IAP, push, Sign in with Apple…) must be enabled in **both** Xcode
  and the developer portal; if one is missing the failure appears **at runtime**.

### 7.2 Info.plist — where most rejections come from

Every sensitive API needs a **usage description**, and the text must be
meaningful; a description that just says "required" gets rejected.

- Camera / microphone / photos / location / notifications → each has its own key
- **`NSUserTrackingUsageDescription`** — mandatory if you touch the advertising
  identifier (§7.5)
- **`ITSAppUsesNonExemptEncryption`** — set to `false` to skip the export
  compliance question on every upload (the correct answer when you use nothing
  beyond standard HTTPS)
- Orientation lock, minimum version, scene/UI configuration

### 7.3 Privacy manifest and required-reason APIs

Apple requires a **declaration file** (`PrivacyInfo.xcprivacy`) describing data
collection for your app *and* for third-party SDKs, plus declared "reason codes"
for a set of otherwise ordinary APIs (user-defaults storage, file timestamps,
disk space, system boot time, active keyboard info, and similar).

**Practical consequence:** your SDKs must be on versions that ship this file. An
old SDK version means a rejected upload. Here, updating an SDK is not
"nice to have", it is "otherwise you cannot ship".

### 7.4 WKWebView traps (if you are Capacitor/web-based)

These do not exist on Android and are only visible **on a device**:

1. **Audio will not start without a user gesture.** The Web Audio context is born
   `suspended`; you must `resume()` it inside a real touch handler. Otherwise you
   get "no sound on iOS" with no console error at all.
2. **The mute switch** silences audio entirely under some audio categories. Game
   audio may need a native category selection.
3. **Rubber-band scrolling** — for a full-screen app feel you must disable
   overscroll, or the UI sags on drag.
4. **Keyboard layout behavior** differs from Android; `100vh` and
   `position: fixed` will not do what you expect. Listen to the visual viewport.
5. **`touch-action` / gesture conflicts**: system edge gestures (back,
   control center) eat your drag area. Design edge-starting interactions
   accordingly.
6. **File access and scheme**: the web origin and the native scheme differ, so
   `fetch`ing local data is two different behaviors in two worlds. Loading data
   **as a module** (a JS file) removes the difference entirely — that is exactly
   why the previous project ships locale data as `.js`, not JSON.

### 7.5 App Tracking Transparency (ATT)

If you show ads:
- You must present the tracking permission prompt to access the advertising id.
- A refusal is normal and the app **must keep working** — you simply serve
  non-personalized ads (and earn less).
- Ask at the **right moment**: a prompt in the app's first seconds gets the
  lowest opt-in rate. Show value first, then ask.
- ATT and GDPR consent are **different things**; you may need both (§9.3).

### 7.6 App review — common rejection reasons

- **Minimum functionality / "just a website wrapper"**: being built with web tech
  is fine; *wrapping a web page* is not. The app must do something that makes
  sense as an app.
- **Digital content must be sold through IAP.** External payment links are
  rejected.
- **A "Restore Purchases" button is mandatory.** Missing it is a rejection.
- **Subscription screens** must show price, duration, auto-renewal terms, and
  links to Terms of Use and Privacy Policy.
- **Account deletion**: if users can create an account, they must be able to
  delete it in-app.
- **Broken/placeholder content**: "coming soon", empty screens, dead buttons =
  rejection. This is the concrete price of shipping mockup values (§8.2).
- Not writing a **test account and reproduction steps** in the review notes drags
  the process out.

### 7.7 TestFlight

- Internal testers (your team) get builds without review.
- External testers require a **beta review** — faster than release review, but
  not zero.
- Builds expire. If you will test continuously, automate build production.

---

## 8. Phase 7 — Product-honesty rules

Not technical, but this is where the most time gets lost.

### 8.1 Write down what is deliberately mocked

If a system is intentionally fake (payments, ads, leaderboard), record it in
CLAUDE.md. Otherwise you — or Claude — will "fix" it six months later.

And note the split: **the delivery can be fake while the rules are real.** The ad
video may be simulated, but the daily limit, prices and subscription benefits
should be real code. If the rules are fake too, you build habits on a fantasy
economy and it explodes on the day you go live.

### 8.2 Mark every placeholder number

Any value that comes from a design mockup with no system behind it carries a
`TODO:` comment that **names the system that will replace it.** Scan for `TODO:`
before release.

Specifically: **a placeholder that promises a reward cannot ship.** Showing a
number is risky; promising a reward that does not exist is a rejection reason.

### 8.3 "Green tests" is not "it works"

One of the most expensive lessons in the previous project: the harness stayed
green for months while the screen displayed a raw key name. The cause was that
the sandbox's `querySelector` never returned `null` — **the mock was not
imitating reality.**

Two rules:
1. **A mock is only as honest as the thing it imitates.** If the real API can
   return `null`, so must the mock; if the real bridge returns a string, the mock
   must not return a Promise. The fake side is always better behaved than the
   real one, and that is what makes tests lie.
2. **A measurement is not a rendered screen — look at one.** Take a real device
   screenshot after any significant change. In the previous project, Arabic
   screenshots surfaced five bugs no automated test could see.

### 8.4 If you write source-scanning tests

- **Normalize line endings.** On Windows the working copy is CRLF, so every line
  counts one extra character. A "this call appears within 900 characters of that
  one" assertion can pass or fail depending on how the file was checked out.
  Measured once at 889 chars with LF and 907 with CRLF against a 900 budget —
  a fresh clone would have found the suite broken.
- "The first N matches in a file" is never a sound anchor. Scope to the relevant
  block.
- **Trust a guard only after you have watched it fail.** Reintroduce the bug on
  purpose, confirm the test breaks, then fix it.

---

## 9. Phase 8 — Monetization

Order matters: **economy rules first, SDKs second.** Wire the SDK first and you
end up shaping the rules around the SDK.

### 9.1 One entry point

There is exactly **one function** that triggers a rewarded ad / purchase. Limit
checks, subscription bypass, reward payout and counter consumption all live
there. **Never** call the SDK's `show()` from outside it — every side door is an
unlimited-reward hole.

### 9.2 The reward event is the only source of truth

Ad SDKs emit both "dismissed" and "rewarded", and **dismissed fires in both
cases.** Bind the reward to the reward event only. Likewise "shown" ≠ "dismissed":
an ad can close without ever appearing.

And: **a failed ad grants nothing and consumes nothing** — never fall back to the
simulation. Falling back means handing out rewards with no ad in production.

### 9.3 The consent gate

- Do not guess the region; let the SDK's consent library decide.
- **Absent information defaults to "no".** If you do not know the region, do not
  request an ad; the cost is one unshown ad, the alternative is legal exposure.
- Refusing consent does not mean "no ads" — non-personalized ads continue. Do not
  implement that by hand; verify the SDK does it.
- In regions that require it, users must be able to **change their choice later**
  (a settings row) — but show that row only when actually required, or it opens a
  form that does not exist.
- Await the consent gate **before the first ad request**: kick it off at boot and
  have the ad path await the same promise.

### 9.4 Ad frequency — two axes, ANDed

For interstitials, require **both** a time threshold and an event-count
threshold. One axis alone fails in both directions: time-only means a fast user
eats an ad every N minutes; count-only means three short sessions fit inside one
minute.

Also:
- Give the interstitial **exactly one call site** (e.g. "exiting a session").
  That guarantees "never at boot, never during play" **structurally**, not via a
  flag.
- A rewarded ad the user **chose** to watch resets the interstitial timer.
  Otherwise a chosen ad becomes the justification for an unwanted one.
- Exempt discovery/trial surfaces outright — an ad there kills the reason that
  surface exists.

### 9.5 IAP / subscriptions

- **Never write a price in the repo.** It comes from the store; when it does not
  arrive, show a neutral `—` and **never fall back to an old hardcoded number.**
  Showing a wrong price is worse than showing none — the user assumes they will
  be charged what they see.
- **Quantities/content stay in code**; only the price comes from the store.
  Renaming a store product must not move the app's economy.
- Play subscription product ids can arrive **composite** (`product:base_plan`).
  Register packages under both the full and the base id, or the price renders
  empty **and the purchase silently fails**.
- **A platform asymmetry that affects planning:** Play requires a published track
  and a store-installed build to test real purchases; App Store sandbox can be
  tested before publishing. So Android purchase verification lands
  *chronologically after* iOS.
- For subscription state, use an **async source / sync reader** shape: the store
  is truth, a local snapshot is read synchronously. **Missing information is not
  "not subscribed"** — a subscriber on a plane must not lose what they paid for.
- Do not confuse keys: a **public SDK key** designed to ship in the client can
  live in the repo; a **secret/REST key** never can — it controls the account and
  an app package is unzippable. The two are confusable by copy-paste; assert both
  directions in a test.

### 9.6 Watching your own ads

Developing against live ad units is **invalid traffic and can get the account
suspended.** The fix is not hiding the ad unit id (packages are unzippable; it is
readable from any published build) — it is a **test-device list** fed to the
SDK's own mechanism.

Critically: **a wrong hash fails silently** and real ads get served. The only
proof is seeing the "this request is sent from a test device" line in the device
log. The hash varies by signing key (§6.3), so measure the release build
separately.

---

## 10. Phase 9 — Release checklists

### 10.1 Common (both stores)

- [ ] Privacy policy live at a real URL
- [ ] The policy names **every SDK and every network host** you use (ads,
      payments, analytics, fonts, remote image sources — that last one is the
      most-forgotten)
- [ ] A test that compares the policy text against the SDK list and fails when
      one is missing (force it instead of remembering it)
- [ ] Terms of use (mandatory with subscriptions)
- [ ] Store assets: icon, screenshots, description
- [ ] **No volatile numbers inside screenshots** ("11 games" becomes a lie the
      moment the count changes, and regenerating art is expensive)
- [ ] Age rating questionnaire
- [ ] Test account + review notes
- [ ] Version/build number incremented
- [ ] `TODO:` / placeholder sweep done
- [ ] Cold-start test on a real device, both platforms

### 10.2 Google Play specific

- [ ] Target API level meets the current requirement
- [ ] Data Safety form — check the **merged manifest**; SDKs add permissions you
      never asked for (the advertising id permission being the classic), and the
      form must match reality
- [ ] Signed AAB, Play App Signing configured
- [ ] Closed-testing requirement satisfied (individual accounts)
- [ ] `app-ads.txt` at the **domain root** (a subdirectory does not count) and the
      listing's website field points at the same domain
- [ ] Internal → closed → production flow exercised

### 10.3 App Store specific

- [ ] `PrivacyInfo.xcprivacy` present, and your SDKs ship theirs
- [ ] ATT copy and flow (if you show ads)
- [ ] "Restore Purchases" button
- [ ] Subscription screen shows all mandatory information
- [ ] Export-compliance key set
- [ ] Screenshots for every required device size (the required set changes over
      time — check the console at upload)
- [ ] In-app account deletion (if accounts exist)
- [ ] At least one real usage round through TestFlight

---

## 11. Universal trap catalog

Format: **symptom → cause → rule.**

1. **"My HTML change landed, my CSS change didn't"** → the cache strategy differs
   per file type. → Diagnose caching before hunting a specificity bug.
2. **"Works on web, blank screen in the package"** → file missing from the build
   list. → Write the guard (§3.4).
3. **"The CSS is correct and does nothing"** → `env(safe-area-*)` returns 0
   without the viewport setting. → §5.3.
4. **"The screen freezes, no error"** → a backgrounded or unfocused browser
   suspends `requestAnimationFrame`. → Verify the loop is actually ticking before
   concluding anything about your logic.
5. **"Taps do nothing at all"** → `setPointerCapture` retargets the following
   `click` to the capturing element. → Capture only once a drag *actually*
   starts. Test trap: a synthetic `click` bypasses capture, so it passes in tests
   and is dead in production — dispatch the full event chain.
6. **"The counter/limit fired multiple times"** → a second tap during an async
   operation. → In-flight guard on every async show path; **both exit paths** must
   release it, or the user gets permanently locked out.
7. **"The same content keeps coming / never comes"** → independent random draws
   cluster by definition. → Use a shuffled bag, plus a repeat guard at the bag
   seam.
8. **"The measurement got worse after I optimized"** → the runs are not
   comparable (different frame counts, thermal state, injection latency). → Drive
   the measurement from your own code and record the conditions.
9. **"Tests are green but the screen is broken"** → the mock is better behaved
   than reality. → §8.3.
10. **"I remember the number"** → the number in the doc is stale. → **Count,
    don't recall.** Every number in a doc carries the date it was measured.
11. **"This was measured on a hot device, let me redo it"** → no. If it heats up
    in real use, that is the experience. Record it, don't discard it (§6.5).
12. **"The doc and the code disagree"** → the code is probably right. → Fix the
    doc; never quietly work around the mismatch.

---

## 12. Working protocol with Claude

This section is addressed to Claude directly.

1. **At the start of every session** read `PLAYBOOK.md`, `CLAUDE.md`, and the
   numbered files under `docs/`. On conflict, **the numbered docs win** and
   CLAUDE.md gets corrected.
2. **Propose before implementing anything non-trivial**, wait for approval, then
   act. Analysis and plans are conversation text; do not create or modify files
   unless that is the actual request of the turn.
3. **Ask before destructive or scope-expanding actions:** deleting code, changing
   stored data formats, adding dependencies, touching monetization/economy values.
4. **Keep changes scoped to exactly what was asked.** "While I'm here" cleanup is
   separate work.
5. **Check the trap list before calling something a bug** — most of these entries
   are deliberate decisions.
6. **If a decision is not yours, ask.** Product direction, economy balance, UX
   tradeoffs: surface them as questions instead of picking an answer.
7. **When an architectural decision changes, update the docs in the same change**,
   not as a follow-up. Never write a rule without its reason — a rule with no
   reason gets deleted as "unnecessary" six months later.
8. **Never optimize without measuring**, and record the conditions next to the
   measurement.
9. **Never say "it works" without device verification.** A desktop browser is a
   lying approximation of both platforms.
10. **Never report unfinished work as finished.** If part of the scope is blocked,
    complete the rest and say explicitly what was left out and why.

---

## 13. Appendix A — `CLAUDE.md` template for the new project

```markdown
# CLAUDE.md

Permanent instructions for everyone working on this project — human or AI.
Read in full at the start of every session, alongside PLAYBOOK.md.

## 1. Project snapshot
- Product name / bundle id (PERMANENT) / target platforms
- Stage: prototype | beta | live
- Tech stack, and **what is deliberately absent** (framework, bundler, …)

## 2. How to run
- Web/development surface
- Android build chain (required JDK/SDK versions)
- iOS build chain (how Mac/CI access works)
- Mandatory steps before upload

## 3. Documentation map
| Doc | Status | Read it when |

## 4. Architecture cheat-sheet (30 seconds)

## 5. Landmines — DO NOT "FIX" SILENTLY
> Every deliberate decision goes here WITH ITS REASON.
> Format: what was done → why → what breaks if you change it.

## 6. Development philosophy & conventions
- Language rule: UI strings and comments in X, identifiers in English
- Prefix/scoping rules
- Dependency policy

## 7. Working agreement (project-specific form of PLAYBOOK §12)

## 8. Current priorities / what not to assume
- Systems that are deliberately mocked
- Features deliberately not built

## 9. Keeping this file honest
When an architectural decision changes, update this file in the same change.
If this file and the code disagree, the code is probably right — fix the file.
```

---

## 14. Appendix B — The cost of deferring a decision

| Decision | Cost on day 1 | Cost six months in |
|---|---|---|
| i18n infrastructure | One day of work | Multi-phase migration + an invisible bug class |
| Opening the iOS shell too | Setup fatigue | An iOS surprise inside every feature |
| Display text ≠ identifier | Zero | Silently broken lookups, wrong colors, screens that say "coming soon" |
| Build guard | Half a day | Undiagnosable blank screen |
| Economy constants in one place | Zero | Archaeology across scattered literals |
| Structural layout safety | One day of work | Clipping bugs discovered one phone at a time |
| Single version/cache source | Zero | Permanently stale code on users' devices |
| Storage prefix | Zero | Never fixable (data-loss risk) |
| Store accounts | Waiting time | 2–6 weeks of paperwork the day the code is done |
| Privacy policy | One hour | Upload rejection, delayed launch |

---

**Closing note:** nothing in this file is theoretical. Every entry either broke
on a device, delayed a release, or ate a day. You do not have to learn them
again in the new project — but you do have to read them.

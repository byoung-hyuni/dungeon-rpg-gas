# 함수 · 클래스 다이어그램

코드는 클래스 대신 **파일(모듈) 단위 함수 + 일반 객체**로 짜여 있습니다. 아래 클래스 다이어그램은 모듈을 클래스처럼, 게임 객체(P, RUN, 플레이어, 몬스터 등)를 데이터 클래스로 표현한 것입니다. 모든 이름은 실제 코드와 같습니다.

## 1. 모듈 의존 관계

```mermaid
flowchart LR
    subgraph 브라우저["브라우저 (Index.html이 include로 합침)"]
        Style[Style.html<br/>CSS]
        Api[Api.html<br/>Api]
        Render[Render.html<br/>SpriteSource · Renderer]
        Game[Game.html<br/>게임 로직]
    end
    subgraph 서버["Apps Script 서버"]
        Code[Code.gs<br/>공개 API · 내부 도우미]
        Setup[Setup.gs<br/>메뉴 · 초기 설정]
        Data[Data.gs<br/>SEED · 헤더 상수]
    end
    Sheet[(스프레드시트)]
    Props[(Script Properties)]
    Cache[(CacheService)]

    Game --> Api
    Game --> Render
    Api -- google.script.run --> Code
    Code --> Sheet
    Code --> Props
    Code --> Cache
    Setup --> Data
    Setup --> Code
    Setup --> Sheet
```

## 2. 서버 모듈

```mermaid
classDiagram
    direction LR
    class Code_gs {
        <<module>>
        +doGet() HtmlOutput
        +include(name) string
        +getGameData() string~JSON~
        +login(name, pin) LoginResult
        +savePlayer(name, pin, data, expectNew) SaveResult
        +submitRecord(name, pin, rec) RecordResult
        +getRankings() string~JSON~
        +calcClearResult(dungeon, clearSec, hits, maxCombo, cfg) ClearResult
        -loadGameData_() GameData
        -adminResetPin_(name, newPin) string
        -buildRankings_(gd) Rankings
        -indexOfName_(list, lowerName) int
        -getSS_() Spreadsheet
        -sheet_(name) Sheet
        -headers_(sh) string[]
        -readTable_(sh) object[]
        -findPlayer_(sh, name) row_rec
        -publicPlayer_(rec) Player
        -sanitizePlayer_(d, gd) SaveData
        -cleanName_(name) string
        -checkPin_(pin)
        -getSalt_() string
        -hashPin_(name, pin) string
        -isLocked_(name) bool
        -addFail_(name)
        -clearFail_(name)
        -parseJson_(s, fallback)
        -fmtTime_(d) string
    }
    class Setup_gs {
        <<module>>
        +onOpen()
        +onEdit(e)
        +setup()
        +resetGameData()
        +clearGameCache(silent)
        +menuResetPin()
        +showWebAppUrl()
        -notify_(msg)
        -ensureSheet_(ss, name, def, overwrite, textCols) Sheet
        -ensureGuideSheet_(ss)
    }
    class Data_gs {
        <<module>>
        +SEED : Config·Levels·Classes·Skills·Dungeons·Monsters·Items
        +PLAYER_HEADERS
        +PLAYER_NOTES
        +RANK_HEADERS
        +RANK_NOTES
    }
    Setup_gs ..> Data_gs : SEED로 시트 채움
    Setup_gs ..> Code_gs : getSS_, getSalt_, adminResetPin_
    Code_gs ..> Data_gs : (헤더는 시트에서 읽음)
```
`+` = `google.script.run`으로 호출 가능한 전역 함수, `-` = `_`로 끝나는 비공개 함수.

## 3. 클라이언트 모듈

```mermaid
classDiagram
    direction TB
    class Api {
        <<Api.html>>
        +offline bool
        +getGameData() Promise~GameData~
        +login(name, pin) Promise
        +save(name, pin, data, expectNew) Promise
        +submitRecord(name, pin, rec) Promise
        +getRankings() Promise~Rankings~
    }
    class SpriteSource {
        <<Render.html>>
        +FONT
        +cache
        +get(emoji, size, variant) Canvas
    }
    class Renderer {
        <<Render.html>>
        +drawBackground(ctx, theme, camX, roomW, t)
        +drawTown(ctx, t, heroEmoji)
        +drawShadow(ctx, sx, sy, size)
        +drawActor(ctx, a, camX, t)
        +drawWeapon(ctx, p, camX)
        +drawProjectile(ctx, pr, camX, t)
        +drawDrop(ctx, d, camX, t)
        +drawDoor(ctx, x, open, isBossNext, camX, t)
        +drawEffects(ctx, list, camX)
        +bar(ctx, x, y, w, h, ratio, color, label)
        +skillSlot(ctx, x, y, s, emoji, key, cdRatio, disabled, locked)
    }
    class Game_Data {
        <<Game.html §2 캐릭터 데이터>>
        buildIndex()
        calcStats(p) Stats
        newCharacter(classId)
        invAdd(id, qty) bool
        invRemoveAt(i, qty)
        invUse(id) bool
        invCount(id) int
        gainExp(n) int
        isUnlocked(d) bool
        lockReason(d) string
        exportP() SaveData
        doSave() Promise~bool~
    }
    class Game_UI {
        <<Game.html §4·5 화면>>
        setScreen(name, html, onKey)
        toast(msg, ms)
        choice(html, options) Promise
        confirmBox(html) Promise~bool~
        makeList(container, items, opts) List
        showLogin() showClassSelect() showTown()
        showDungeonSelect() showShop() showInventory()
        showSkills() showRanking() showHelp() logout()
    }
    class Game_Combat {
        <<Game.html §6 전투 엔진>>
        startDungeon(d)
        enterRoom(i)
        updateRun(dt)
        updatePlayer(dt)
        startAttack() runAction(p, dt)
        trySkill(sk) bool
        runSkill(p, a, dt)
        usePotion(kind)
        hitMobs(p, o) int
        damageMob(m, mult, o)
        killMob(m) rollDrops(m) spawnDrop(it, m)
        onLevelUp(ups)
        hurtPlayer(m, mult)
        updateMob(m, dt) runMobAction(m, dt)
        approach(m, tx, ty, dt, mul)
        separateMobs() updateProjs(dt) updateDrops(dt) updateFx(dt)
        onDungeonClear() onPlayerDead()
    }
    class Game_Result {
        <<Game.html §7>>
        showPause() showDead() revive(cost)
        showResult() registerRank() updateRankLine(msg)
    }
    class Game_Loop {
        <<Game.html §8>>
        frame(now)
        renderRun()
        drawHud()
    }
    Game_Data ..> Api : doSave
    Game_UI ..> Api : login, getRankings
    Game_Result ..> Api : submitRecord
    Game_Loop ..> Game_Combat : updateRun
    Game_Loop ..> Renderer
    Renderer ..> SpriteSource
    Game_UI ..> Game_Data
    Game_Combat ..> Game_Data : gainExp, invAdd, calcStats
```

## 4. 게임 객체 (데이터 클래스)

```mermaid
classDiagram
    direction LR
    class SaveData_P {
        <<전역 P · 저장 대상>>
        classId : string
        level : int
        exp : int
        gold : int
        equip : weapon·armor·accessory
        inventory : InvSlot[]
        cleared : int
        bestGrades : dungeonId→grade
        playSec : number
    }
    class InvSlot { id : string  qty : int }
    class Session_S {
        <<전역 S>>
        name pin
        saved : bool
        dirty : bool
        expectNew : bool
        lastSavedAt saving townSel
    }
    class Run {
        <<전역 RUN>>
        d : Dungeon row
        tier rooms roomIdx
        state : play|fade|clear|dead|pause
        time hits combo maxCombo kills
        expGained goldGained itemsGot
        player : PlayerEntity
        mobs : MobEntity[]
        projs : Projectile[]
        drops : Drop[]
        fx : Effect[]
        shake hitStop
        result : ClearResult
        submitted startLevel
    }
    class Actor {
        <<공통 필드>>
        x y z vz vx
        facing : 1|-1
        size emoji emojiFacing
        flash hurt
    }
    class PlayerEntity {
        st : Stats
        hp mp
        action : Action
        atkStep comboWin invul
        cds : skillId→초
        buffAtk buffT dash backCd potCd swing
    }
    class MobEntity {
        data : Monsters row
        boss : bool
        hp maxHp atk defense speed range
        ai : melee|charger|ranged|boss
        cd aggro action windup hitstun
        dead deathT alpha rot enraged cdBase
    }
    class Projectile {
        owner : p|m
        x y z vx range travelled
        emoji size mult rangeY once src spin
    }
    class Drop { id emoji color x y z vz t warned }
    class Effect {
        type : text|slash|ring|tele|spark|banner
        t life x y z
    }
    class Stats { atk def maxHp maxMp crit speed }
    class Action {
        type : atk|jatk|back|skill (플레이어) / melee|charge|shoot|slam (몬스터)
        t dur hit ...
    }
    SaveData_P "1" *-- "0..30" InvSlot
    Run "1" *-- "1" PlayerEntity
    Run "1" *-- "*" MobEntity
    Run "1" *-- "*" Projectile
    Run "1" *-- "*" Drop
    Run "1" *-- "*" Effect
    Actor <|-- PlayerEntity
    Actor <|-- MobEntity
    PlayerEntity --> Stats
    PlayerEntity --> Action
    MobEntity --> Action
```

## 5. 화면 상태 전이 (`screen`)

```mermaid
stateDiagram-v2
    [*] --> loading
    loading --> login : getGameData 성공
    loading --> error : 실패
    login --> classSelect : status=new
    login --> town : status=ok
    classSelect --> login : Esc
    classSelect --> town : Enter (newCharacter)
    town --> dungeonSelect
    town --> shop
    town --> inventory : I
    town --> skills : K
    town --> ranking : R
    town --> help : H
    town --> login : 로그아웃
    dungeonSelect --> town : Esc
    shop --> town
    inventory --> town
    skills --> town
    ranking --> town
    help --> town
    dungeonSelect --> game : startDungeon
    game --> pause : Esc
    pause --> game : 계속
    pause --> town : 마을로
    game --> dead : HP 0
    dead --> game : 부활(골드)
    dead --> town : 귀환
    game --> result : 보스 처치
    result --> game : 다시 도전
    result --> town : 마을로
```

## 6. 던전 진행 상태 (`RUN.state`)

```mermaid
stateDiagram-v2
    [*] --> play : startDungeon / enterRoom(0)
    play --> fade : 방 클리어 + 오른쪽 문 통과
    fade --> play : enterRoom(i+1) (0.5초)
    play --> clear : 보스방 몬스터 전멸 (onDungeonClear)
    clear --> [*] : 1.2초 슬로모션 후 showResult
    play --> dead : HP 0 (onPlayerDead)
    dead --> play : revive
    play --> pause : Esc
    pause --> play : 계속
```

## 7. 메인 루프 호출 흐름

```mermaid
flowchart TD
    F["frame(now)<br/>requestAnimationFrame"] --> Q{screen == 'game'?}
    Q -- 예 --> UR["updateRun(dt)"]
    Q -- 아니오 --> R2{RUN 있음?}
    UR --> HS{hitStop > 0?}
    HS -- 예 --> FX1[updateFx 느리게] --> DRAW
    HS -- 아니오 --> UP["updatePlayer<br/>(포션 → 스킬 → runAction → 공격/백스텝/점프 → 이동·물리)"]
    UP --> UM["updateMob × N<br/>(물리 → 경직 → AI 선택 → runMobAction)"]
    UM --> SEP[separateMobs] --> PR["updateProjs<br/>(damageMob / hurtPlayer)"] --> DR["updateDrops<br/>(pickupDrop)"] --> FX2[updateFx]
    FX2 --> CL{방 몬스터 전멸?}
    CL -- 보스방 --> ODC[onDungeonClear]
    CL -- 일반방 + 문 통과 --> FADE["state = fade → enterRoom"]
    CL -- 아니오 --> DRAW
    ODC --> DRAW
    FADE --> DRAW
    R2 --> DRAW
    DRAW{"RUN 화면?<br/>(game·pause·dead·result)"} -- 예 --> RR["renderRun → drawHud"]
    DRAW -- 아니오 --> TOWN["Renderer.drawTown"]
```

## 8. 타격 처리 흐름

```mermaid
flowchart LR
    A[기본공격 / 스킬 / 투사체] --> H["hitMobs(p, o)<br/>범위 판정: 전방·중심·전체"]
    H --> D["damageMob(m, mult, o)<br/>데미지·치명타·콤보·경직·띄우기"]
    D --> K{"m.hp ≤ 0"}
    K -- 예 --> KM["killMob<br/>EXP·골드 → gainExp → onLevelUp<br/>rollDrops → spawnDrop"]
    K -- 아니오 --> E[이펙트]
    M[몬스터 공격 / 투사체 / 보스 장판] --> HP["hurtPlayer(m, mult)<br/>무적 0.6초, hits+1"]
    HP --> Z{"hp ≤ 0"}
    Z -- 예 --> OPD[onPlayerDead → showDead]
```

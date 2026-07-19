# Meadow species naming slate — for one-batch review (issue #4)

**Status: PROPOSED, awaiting Season's approval.** This is the single bilingual
naming slate asked for in
[#4](https://github.com/season179/pokemath/issues/4) and in
[meadow-isle.md](meadow-isle.md)'s open question on bilingual naming. It covers
the three preview species with provisional names (Fluffball, Balltail Hare,
Woolly Ram), the provisional starter name (Sproutkit), all remaining planned
Meadow families from the island roster, and the guardian.

**How to review:** approve the whole batch, or mark individual rows
`adjust → <preference>` and only those rows come back for a second look. Nothing
is renamed in code until this slate is approved.

## Permanence rules (what the registry will guarantee)

1. **`speciesId` is permanent save identity.** Once a species ships in a save,
   its id never changes. Owned creatures, `teamIds`, `starterCreatureId`, and
   Field Guide entries all key on it. Ids are opaque — their spelling carries
   no meaning we ever rely on.
2. **Names are replaceable display data.** English and Chinese names can change
   at any time without touching saves. (This slate exists so we only ever
   change them once.)
3. **`artRef` is replaceable.** Pack sheet paths, generated filenames, and R2
   bucket keys are *art candidates*, never identity. A missing or swapped sheet
   falls back to the placeholder blob; the creature's identity, stats, and save
   record are untouched.
4. **Grandfathered ids.** The preview already shipped `woolly/fluffball`,
   `woolly/hare`, `woolly/ram` into real saves (the kids' collections). Those
   ids stay exactly as-is; renaming them would orphan existing Field Guide and
   collection entries. New families get `meadow/<name>` ids. The prefix mix is
   accepted — ids are opaque (rule 1).

## The slate

Naming aims: readable by a Standard-1 SJKC kid (simple, common characters),
cute enough for a seven-year-old, and honest to the whole evolution line —
one name per family, carried by every stage (mascot-name convention: the cute
stage-1 identity survives evolution, like a nickname that grows up with you).

| # | speciesId | EN name | 中文名 | Pinyin | Stages | Rarity | Art candidate (replaceable) | Line read |
|---|-----------|---------|--------|--------|--------|--------|------------------------------|-----------|
| 1 | `meadow/mothling` | Mothling | 毛毛虫 | máo mao chóng | 3 | common | pack `3EVO/05` | larva → cocoon → great moth |
| 2 | `woolly/fluffball` *(keep)* | Fluffball *(ratify)* | 毛球 | máo qiú | 3 | common | pack `3EVO/06` — **bound** | fluffball → winged lambkin → meadow fae |
| 3 | `meadow/pufftail` | Pufftail | 团子鼠 | tuán zi shǔ | 2 | common | pack `2EVO/10` | pufftail mouse → roly-poly mouse |
| 4 | `meadow/plumelet` | Plumelet | 小羽 | xiǎo yǔ | 3 | common | pack `3EVO/21` | chick → gamefowl → plumed strider |
| 5 | `woolly/hare` *(keep)* | Balltail Hare *(ratify)* | 球尾兔 | qiú wěi tù | 3 | uncommon | pack `3EVO/13` — **bound** | ball-tail hare, quadruped throughout |
| 6 | `sproutkit` *(keep)* | Sproutkit *(ratify)* | 苗苗 | miáo miáo | 3 | starter | pack `3EVO/02` — **bound** | sprout kitten → leaf cat → orchard lynx |
| 7 | `meadow/blossomfox` | Blossomfox | 花狐 | huā hú | 3 | uncommon | pack `3EVO/08` | pink squirrel kit → squirrel-fox → blossom fox |
| 8 | `meadow/owlet` | Owlet | 咕咕 | gū gū | 2 | uncommon | pack `2EVO/04` | round chick → owl |
| 9 | `meadow/barnpup` | Barnpup | 汪汪 | wāng wāng | 2 | uncommon | pack `2EVO/06` | farm pup → hound |
| 10 | `woolly/ram` *(keep)* | Woolly Ram *(ratify)* | 卷卷 | juǎn juǎn | 2 | rare | pack `2EVO/03` — **bound** | woolly ram → bull |
| 11 | `meadow/petalfae` | Petalfae | 朵朵 | duǒ duǒ | 3 | rare | pack `3EVO/01` | petal sprite → blossom fae |
| 12 | `meadow/cloudmane` | Cloudmane | 天马 | tiān mǎ | 1 | **guardian (Unique)** | pack `Uniques/03` | the Cloud-Maned Horse, Hundred Stones guardian |

### Row notes (the reasoning, where a choice is debatable)

- **Rows 2, 5, 10 — ratify, don't rename.** The kids already play with
  Fluffball, Balltail Hare, and Woolly Ram. The English names are good; the
  cost of re-learning outweighs any polish. The Chinese names are the new
  addition: 毛球 ("fur ball"), 球尾兔 (literal "ball-tail rabbit"), 卷卷
  ("curly-curly", for the fleece — the grown bull keeps his childhood nickname).
- **Row 1 — 毛毛虫** is stage-1-forward (the adult is a great moth, not a
  caterpillar). That's the mascot-name convention on purpose: the larva is
  what kids meet first at the dock. Alternative if you'd rather name the
  adult: 飞蛾 (fēi'é, "flying moth") — less cute, slightly harder character.
- **Row 3 — 团子鼠** ("dumpling mouse") leans on the roly-poly roundness both
  stages share. 团子 is a food word SJKC kids already love.
- **Row 4 — 小羽 / Plumelet** ("little feather" / "little plume") fits every
  stage of the chick → strider line, including the final riding bird.
- **Row 6 — 苗苗** ("little sprout") carries the plant-cat theme from kitten
  to orchard lynx. `sproutkit` is the flat starter id convention (like
  `cloudhorn`, `lumentail`) and stays.
- **Row 7 — 花狐** names the blossom-fox endgame; stage 1 is a *pink* squirrel
  kit, so the flower reading still fits visually. Blossomfox / 花狐 vs
  Petalfae / 朵朵 keeps the two pink families clearly distinct.
- **Row 8 — 咕咕** is the owl's hoot; **Row 9 — 汪汪** is a bark. The
  onomatopoeia pair suits the clock-tower owl and barn dog, and both are
  effortless for early readers. The adult hound keeping 汪汪 is the mascot
  convention again.
- **Row 11 — 朵朵** is the flower measure word doubled (朵朵小花) — blossom
  fairy without colliding with 花狐.
- **Row 12 — 天马** ("sky horse") is deliberately not a literal 云鬃马:
  鬃 is far too hard for the target reader, and 天马 gives the guardian its
  mythic weight with two Standard-1 characters. English keeps the working
  read: **Cloudmane**. Also keeps it distinct from starter Cloudhorn (云角).

## Appendix: starter Chinese names (same batch, for UI consistency)

The other two starters already have locked English names and permanent flat
ids; they only lack Chinese names. Included here so every creature a Meadow
player can own is bilingual after one approval.

| speciesId | EN name (locked) | 中文名 | Pinyin | Why |
|-----------|------------------|--------|--------|-----|
| `cloudhorn` | Cloudhorn | 云角 | yún jiǎo | sky-goat with golden horns; "cloud horn" |
| `lumentail` | Lumentail | 灯尾 | dēng wěi | the lantern-tailed fox; "lantern tail" |

Out of scope: `astralune` and the reserved families for later islands
(sea serpents, desert lion, cave bats, etc. in the roster's reserve list) —
they get their slates when their islands are designed.

## Habitat coverage check (acceptance criterion 3)

Every ordinary family maps to its roster habitat by **speciesId**; rarity
distribution stays exactly as the island roster intends, and the guardian
appears in **no** ordinary table — Unique capture pressure is excluded by
construction (roster: only the guardian is Unique, and it is a fixed authored
battle, not a wild roll).

| speciesId | Dockside | Woolly Meadows | Orchard | Gardens | Barn | Ticktock | Festival | Stones |
|-----------|----------|----------------|---------|---------|------|----------|----------|--------|
| `meadow/mothling` | common (first encounter) | | | common | | | | |
| `woolly/fluffball` | | common | | | | | | |
| `meadow/pufftail` | common | common | common | common | common | common | common | |
| `meadow/plumelet` | | | common | | common | | | |
| `woolly/hare` | | uncommon | | uncommon | | | | |
| `meadow/blossomfox` | | | uncommon | | | uncommon | | |
| `meadow/owlet` | | | | | | uncommon | | |
| `meadow/barnpup` | | | | | uncommon | | | |
| `woolly/ram` | | | | | | | | rare (edge) |
| `meadow/petalfae` | | | | | | | rare (dusk) | |
| `meadow/cloudmane` | | | | | | | | guardian battle only — **never in a wild table** |

Numeric weights are set per area when the tables land in code (post-approval);
the only weights shipped so far are the preview's Woolly Meadows table
(`fluffball 65 / hare 27 / ram 8`), which this slate leaves untouched.

## After approval (the code work, in order)

1. `shared/creature.ts`: extend `Species` with `nameZh`, `stages`, `rarity`,
   and rename `art` → `artRef` semantics (replaceable, optional); register the
   nine new families + guardian with the ids above; replace the three
   PROVISIONAL comments.
2. Habitat tables keyed by the new ids, replacing pack-code references in
   `meadow-isle.md`'s roster table (doc updated to point at the registry as
   the source of truth).
3. A test that every table entry resolves through `SPECIES_BY_ID`, no
   `Uniques/` pack code or file path appears as an id, and missing `artRef`
   falls back to the placeholder blob without changing identity.
4. Worker/client surfaces `nameZh` alongside `name` (zh-first UI comes with
   the encounter slice in M2A/M2B).

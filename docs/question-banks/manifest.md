# Question-bank manifests: routing and rollback (M3, #13)

Battles never name a question-bank file. They ask for a curriculum slice —
grade, topic, curriculum profile (and a TP level when bands overlap) — and the
**active manifest** decides which approved bank version serves it. A bad
content batch is disabled or rolled back at the manifest layer: battle code,
saves, and the immutable bank artifacts never change.

## Artifacts

All under `game/assets/resources/question-banks/`:

| File | Role | Mutability |
| --- | --- | --- |
| `std1/<bank>.v{N}.json` | The questions (schema: `question-bank-v1/v2`) | Immutable. New content ships as a new version. |
| `manifest.v{N}.json` | Approval record: which bank version serves which slice | Immutable. New approvals ship as a new manifest. |
| `active-manifest.json` | Pointer to the live manifest | The only file edited in routine operations. |

Validation layers, all enforced before any battle starts
(`shared/question-bank-manifest.ts`, loaded by
`game/assets/src/questions/loadQuestionBankManifest.ts`):

1. The pointer parses (`parseActiveManifestPointer`) and names a manifest file.
2. The manifest parses (`parseQuestionBankManifest`): known grade/topic/profile
   vocabulary, TP bands in [1, 6], no duplicate bank references, and **no
   overlapping routes** — an ambiguous manifest fails at load, not mid-battle.
3. The route resolves (`resolveManifestEntry`): exactly one entry serves the
   request, or the load fails and encounters stay off.
4. The bank parses (`parseQuestionBankData`) — unknown bank schema versions
   are rejected here.
5. The bank matches its route (`verifyManifestEntryAgainstBank`): same
   `bank_id` and `version`, and every question tagged inside the route's
   topic, TP band, and profile. Drift between manifest and content fails
   loudly.

If any layer fails, GameApp logs the cause and encounters stay off. There is
no fallback content in Woolly (#8).

## Approving a new bank version

1. Ship the new immutable bank (`std1/<bank>.v{N+1}.json`) through the normal
   review (and, from #14/#15, the mechanical validator + generator pipeline).
2. Author `manifest.v{M+1}.json` whose entry routes the slice to the new
   `(bank_id, version)`. Bump the manifest `version`; never edit a shipped
   manifest.
3. Repoint `active-manifest.json` at `question-banks/manifest.v{M+1}`.
4. Deploy. The bank and manifest tests (`shared/tests/bank-manifest.test.ts`)
   must pass: they prove the live pointer chain resolves and verifies against
   the real files.

## Rollback

To restore the previous approved manifest (bad batch, regression in review):

1. Edit `active-manifest.json` to name the previous manifest file, e.g.
   `"question-banks/manifest.v1"`.
2. Deploy.

That is the whole procedure. Bank JSONs and old manifests stay in the tree,
untouched — the previous manifest remains valid (the test suite proves an
older manifest still resolves and verifies), so rollback never depends on
recovering deleted artifacts.

## Disabling a slice

To pull a curriculum slice entirely (e.g. a systemic content problem): approve
a new manifest without that route. Requests for it fail at resolution ("no
approved question-bank route") and encounters stay off — visible and safe,
never a silent serve of unapproved content.

## Route key notes

- `grade`: bank-directory grade (`std1` today; extend
  `QUESTION_BANK_GRADES` with new directories).
- `topic`: the `QUESTION_TOPICS` vocabulary (`4.1`…`4.7`, `extra`).
- `tp_min`/`tp_max`: the PBD performance-level band the bank covers. Bands let
  two banks share a topic without ambiguity; a request may pass `tpLevel` to
  pick a band.
- `profile`: the curriculum profile the bank was approved for. A
  `dpk3_2026_core` route serves every profile (extras are gated per-question
  downstream); an `original_dskp_extra` route serves only that profile.

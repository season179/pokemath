# Offline question batches: generate → gate → review → import (M4, #15)

The pipeline that turns generated Standard-1 questions into served banks.
Generation **never runs during a child's battle** — every step is an offline
CLI in `tools/` (never imported by the game or the worker), and battles only
ever see banks that survived the [validation gate](std1-corpus-checklist.md) (#14), human review, and
[manifest approval](manifest.md) (#13).

```
generate-question-batch   →   validate-question-bank   →   review-question-batch   →   import-question-batch
 immutable candidate           mechanical + adversarial      sampling policy +          bank + manifest +
 + provenance                  gate (#14), ACCEPT or         review doc + decisions     pointer (opt-in) +
 (seeded, reproducible)        bounce to regeneration        template for the human     ledger + rollback
```

## 1. Generate — immutable candidate with provenance

```sh
npm run generate:questions -- \
  --bank std1.sample-money --topic 4.3 --tp 2-3 \
  --profile dpk3_2026_core --count 20 --seed 43
```

Writes two files under `question-batches/candidates/` (committed — git is the
immutability and audit trail; the directory sits outside `game/assets/`, so
candidates are never bundled into the game):

- `<batch-id>.candidate.json` — a schema-v2 bank envelope (the exact shape
  the gate and the runtime parse), `source` carrying the provenance summary;
- `<batch-id>.provenance.json` — the structured record: generator version,
  every parameter, the seed, per-format counts, and the content SHA-256.

The generator is **procedural and seeded**: the same parameters and seed
reproduce a batch byte-for-byte (the provenance file prints the exact
reproduction command), so the gate verdict, the review sample, and the
import record all correlate to exact content. Candidates are never
overwritten — a re-run with the same parameters fails; pick a new `--seed`.

**Honest scope note:** this generator is *volume scaffolding*. Its template
registry (`TEMPLATES_BY_TOPIC`) covers the serveable v2 answer forms with
wording drawn from the style doc's authentic exemplars — counting (4.1),
arithmetic (4.2), money (4.3), calendar/ordering (4.4), and the extras
bucket (`extra`, which requires `--profile original_dskp_extra`). It proves
the pipeline at volume; it is not a content-quality ceiling. Figure-first
topics (4.5–4.7) arrive with the FigureView kit (#16), and a future LLM
front-end can emit the same candidate format — the gate treats both
identically. Batches declare their bank version up front (next free version
for `--bank`); if an import lands first, the version check fails and the
batch must be regenerated.

## 2. Gate — every item passes before human review

```sh
npm run validate:questions -- question-batches/candidates/<batch>.candidate.json
```

The #14 gate: structural (schema v2 + AJV), mechanical (answers re-derived,
scope enforced), adversarial (corpus checklist over the raw JSON). Verdicts
are REJECT-only — a single error fails the whole batch and it goes back to
generation. The gate never edits content.

## 3. Review — the first-200 quota, then a reproducible 5% sample

```sh
npm run review:question-batch -- question-batches/candidates/<batch>.candidate.json
```

Applies the sampling policy from `docs/question-banks/review-ledger.json`:

- **Full mode** — while the ledger's `reviewed_total` is under 200, every
  question in the batch must be human-reviewed. (The ledger seeds at 20:
  the hand-reviewed Woolly v1 bank, issue #6.)
- **Sample mode** — once 200 questions have been human-reviewed, a
  reproducible 5% sample (rounded up, minimum 1) is reviewed. The sample is
  drawn by a PRNG seeded from the batch's content SHA-256: the same batch
  always yields the same sample, so a reviewer can re-derive it, and a
  swapped batch yields a different one.

Writes the review doc (`<batch>-review.md`: exactly the required questions,
bilingual, with answers and distractor rationales) and a **decisions
template** (`<batch>.decisions.json`). The human fills it: keep only
actually-reviewed ids in `reviewed`, move rejections into `rejected` with a
reason, sign `reviewer` / `reviewed_at`. The decisions file is human work —
the tool refuses to overwrite it (`--force` restarts a review).

## 4. Import — approved content becomes a routed bank version

```sh
npm run import:questions -- question-batches/candidates/<batch>.candidate.json \
  --decisions docs/question-banks/<batch>.decisions.json [--activate]
```

Hard gates, all verified **in memory before any file is written**:

1. The decisions hash-locks the exact candidate (SHA-256) — a batch that
   changed after review bounces.
2. Review coverage: every required id must be in `reviewed`; rejections must
   come from reviewed questions; at least one question must survive.
3. The **final bank** — merged content included — must pass the gate and AJV
   again. Nothing is repaired to make it pass; a failure aborts the import.
4. The new manifest must **parse** (no overlapping routes) and the new entry
   must verify against the new bank — an import can never brick the pointer
   that rollback depends on.

Then, in order: the immutable bank (`std1/<bank>.v{N}.json` + Cocos `.meta`),
the new manifest (`manifest.v{M}.json` + `.meta`), and — **only with
`--activate`** — the `active-manifest.json` pointer. The ledger records the
import (reviewed/rejected/imported ids, hash, reviewer) and the gate
evidence (`<bank>.v{N}.gate.{json,md}`) ships alongside.

**Import modes** (matched by full slice — bank_id + topic + TP band +
profile, never bank_id alone):

- `new-bank` — a fresh bank_id at v1 (candidate ids become bank ids).
- `new-route` — a disjoint slice on an existing bank_id (immutable banks:
  the disjoint content ships as that bank_id's next version with its own
  manifest entry).
- `merge` — the batch's slice equals an existing route: approved questions
  are **appended with fresh ids** to the routed bank's questions (carried
  verbatim — old ids are stable for telemetry) as the next bank version.
  Schema-v1 bases (the hand-authored Woolly bank) cannot merge — v1 predates
  the v2 wire; extend those slices with a new bank on a disjoint TP band.

**Rejected items never enter the served manifest and are never silently
repaired**: they are simply absent from the final bank, the ledger records
them with reasons, and the only way back is regeneration (new seed).

## Rollback and selection

Selection is the pointer; rollback is repointing it at a previous manifest —
validated first, so a broken target is never selected:

```sh
npm run import:questions -- rollback --to manifest.v1
```

Every route in the target manifest is parsed, resolved, and verified against
the bank on disk before the pointer moves. Bank artifacts and old manifests
stay untouched (see [manifest.md](manifest.md#rollback)).

## Files

| Path | Role |
| --- | --- |
| `tools/generate-question-batch.mjs` | Seeded procedural generator + template registry |
| `tools/review-question-batch.mjs` | Sampling policy, review doc, decisions template |
| `tools/import-question-batch.mjs` | Import/merge, manifest authoring, activation, rollback |
| `question-batches/candidates/` | Immutable candidate batches + provenance |
| `docs/question-banks/review-ledger.json` | Human-review quota state + import history |
| `docs/question-banks/<batch>-review.md` / `.decisions.json` | Review surface + human record |

---
version: 1
slug: "public-passiton-index-html"
primary_target: "public/passiton/index.html"
related_targets: ["public/passiton/styles.css","public/passiton/views.js"]
---

# Knowledge workspace

Scope: `/app` and its question, contribution, review and funding modes. Visitor mode: Operate.

Readers choose a question and language; volunteers explain, compare claims with the handbook and correct them; the demo reviewer checks the source before approval. Optional sponsorship follows review. Keep those actions and their state labels distinct.

The built learning studio uses question selection at left, an active task in the center and reference evidence at right on wide screens. The recurring moment is reading an explanation and its source in the same working area. Narrow layouts replace the question rail with a native selector and ultimately place the source after the task. Coverage and integration explanations remain below the workspace.

Keep existing consent, editable transcripts, microphone limits, source version checks, demo role disclosures and payment safeguards. No new product decisions remain in this design pass.

Evidence: finish reviewer reported SHIP; 32 existing tests passed. Review screenshots `desktop.png`, `mobile.png`, `user-792.png` and `dark.png` under `.impeccable/review/` show initial viewports only. Regex detector fallback supplies no computed contrast proof or complete interaction verification.

## Answer reuse

Shared reviewed answers include Copy question link and Save answer beside voice playback. Public links select question/language and enter reading mode without changing stored contributions. UTF-8 handouts keep source excerpts, demo status, review date and source version. Clipboard denial opens a labelled, selectable link in a native dialog.

## Real guide collection

A labelled collection selector switches between the real Open Source Guides collection and fictional grant practice. Source attribution, license, checked date and pinned revision appear beside the excerpts. Starter explanations are labelled separately from community reviews. On mobile the decorative introduction is hidden to bring guidance into view sooner.

## Interaction feedback

Navigation uses a short sliding marker and a 220ms task transition. Async actions show a spinner on the initiating button, a pending notice and an indeterminate workspace edge. Source reading remains available while a task runs; mutating controls preserve their disabled gates across renders. Unchanged task markup is retained so background refreshes do not discard focus or open excerpts. Dialogs and source disclosures have brief transitions. Reduced motion keeps static state feedback and removes spatial movement. No animation delays a request.

Verified 7 September 2026: 40 tests passed. Desktop and 390px mobile browser checks covered navigation, provider-error recovery, pending spinners under an artificial 1.8-second local API delay, and preserved draft text/focus after delayed retrieval. Mobile document width matched 390px. These were local interaction checks, not new provider success claims.

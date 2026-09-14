# Bounded queues: where the waiting goes

1. **Audience and promise:** A software engineer new to backpressure will follow a request from offer to completion, see exactly why a bounded queue fills, and understand what backpressure can and cannot do.
2. **Format:** Approximately 4:00, landscape technical explainer. Eight connected beats; 537 spoken words, with room for pauses and visible state changes. This deliverable is the storyboard and complete narration only.
3. **Visual direction:** Warm white background, dark text, simple rectangular request cards. Keep one map throughout: **Producer → admission gate → four queue slots → Consumer → Completed**. A producer-side waiting lane sits below the producer. Blue means queued, amber means waiting, and a green check means completed; text labels reinforce every color. Request A has a persistent outline. Camera moves reveal detail within this map rather than replacing it with unrelated slides.
4. **Sound direction:** One calm narrator. Quiet during arithmetic; optional soft clicks only when a request changes state. No dramatic overload alarms or music competing with the explanation.

## Storyboard and complete narration

### 1. 0:00–0:28 — Build the intuition

**Picture/action:** Start with one engineer-facing service receiving one request. Reveal a small waiting area beside the worker. Then show a brief group of incoming requests and the finite room available. Keep the numbers hidden until the mechanism is introduced.

**On-screen copy:** “Work arrives. Work takes time.” → “Where does the waiting happen?”

**Narration:**

> Imagine a service that receives work faster than it can finish it. A queue gives arriving requests somewhere to wait. That helps with a short burst. But a queue with limited space eventually forces a decision: what happens to the next request? Backpressure makes that limit matter upstream. Instead of admitting everything, the system makes the producer wait for room.

### 2. 0:28–0:57 — Follow one complete request

**Picture/action:** Expand into the persistent map. Begin empty. Follow outlined request A from producer, through an open gate, into one queue slot, then through service to Completed. Keep a small producer-to-completion bracket visible. This is a single-request orientation, before the sustained-load experiment.

**On-screen copy:** “Offer → Admit → Queue → Serve → Complete”

**Narration:**

> First, follow one request all the way through. The producer offers request A. The admission gate checks for space. With a slot available, A enters the queue. The consumer takes it, does the work, and completes it. Notice the boundaries: being offered is not being admitted, and being admitted is not being completed. The queue holds unfinished work; the consumer is what actually finishes it.

### 3. 0:57–1:28 — Follow the whole journey when space runs out

**Picture/action:** Return to the entire map. Label this pass “Schematic: full queue.” Show a new request held in the producer-side lane. Existing work completes; a reverse control arrow communicates available room; the held request is admitted and later completed. Keep the work arrow and reverse control arrow in separate lanes.

**On-screen copy:** “No room → wait upstream” → “Room available → admit”

**Narration:**

> Now follow the same journey when the queue is full. A new request stays at the producer. Existing queued work completes, freeing space. That available capacity lets waiting work enter, and eventually complete too. The work moves toward the consumer; information about capacity travels back toward the producer. That feedback is the backpressure. Waiting has moved upstream. It has not vanished, and the consumer has not become faster.

### 4. 1:28–2:00 — Open the gate and define the model

**Picture/action:** Reset the same map to empty, explicitly labeled “Synthetic tick model.” Reveal four slots, then three offers per tick and two completions per tick. Animate tick 1: service finds no queued work, then three requests are admitted. Show tick 2: complete two, then admit three, filling the queue.

**On-screen copy:** “Capacity: 4 items” / “Offers: 3 items/tick” / “Service: up to 2 items/tick” / “First serve. Then admit.”

**Narration:**

> Let's make that precise with a synthetic example. The queue holds four items. The producer offers three new items each tick, while the consumer can complete two. A tick is our model's time unit. Order matters: first, serve already queued work; then, admit arrivals into available slots. Starting empty, tick one completes nothing and admits three. Tick two completes two, then admits three, leaving all four slots occupied.

### 5. 2:00–2:33 — Watch one full computation repeat

**Picture/action:** Zoom into the queue and gate while retaining a small full-map inset. Tick 3: four queued → two complete → two vacancies → two admissions → one held upstream. Tick 4 repeats, admitting older waiting work first; two items now remain upstream. Accumulate a compact ledger one row at a time.

**On-screen copy:** “Tick 3: 9 offered = 4 completed + 4 queued + 1 waiting”

**Narration:**

> At tick three, service removes two items from the full queue. Only two slots open, but three new items are offered. Two enter; one waits at the producer. Check every item: nine have been offered, four completed, four remain queued, and one waits upstream. Nothing disappeared. At tick four, service again frees two slots. Admit waiting work first. The queue stays full, and the upstream waiting count grows to two.

### 6. 2:33–3:03 — Separate the possible responses

**Picture/action:** Pull back to the gate on the full map. Use the held card to demonstrate each policy sequentially, clearly labeled “Alternative mechanisms—not simultaneous.” Restore the main waiting model after each illustrative branch.

**On-screen copy:** “Wait · Block · Drop · Retry · Signal demand”

**Narration:**

> These responses have different meanings. Waiting means an item remains pending. Blocking means a producer's operation cannot proceed until a condition changes. Dropping discards work. Retrying attempts it again later, potentially adding load. Demand signaling tells a producer how much downstream is ready to accept. Implementations differ. In our example, excess offers wait upstream without being dropped. Bounding this queue alone does not bound every other place work might accumulate.

### 7. 3:03–3:34 — Change buffer size, then observe the result

**Picture/action:** Return to the four-slot map, then extend the same queue to eight slots. Label “New capacity: 8; same rates; restart empty.” Run the synthetic trace in compressed time: end-of-tick queue counts 3, 4, 5, 6, 7, 8, then upstream waiting begins. The consumer's completion cadence never changes.

**On-screen copy:** “A bigger buffer buys time” → “It does not increase service capacity”

**Narration:**

> What if we double the buffer? Keep the same arrival and service rates. More space can absorb a temporary burst, especially if arrivals later slow enough for the consumer to catch up. But sustained overload still wins. Three items arrive per tick; only two can finish. The extra slots delay saturation. They do not fix that imbalance. Eventually, production must slow, service capacity must increase, or some work must be rejected or dropped.

### 8. 3:34–4:00 — Connect the mechanism to what you measure

**Picture/action:** Restore the full map. Highlight Completed for throughput, then trace request A's entire producer-to-completion bracket for latency, including upstream waiting. End with a held frame of the bounded queue, reverse capacity signal, and visible waiting lane.

**On-screen copy:** “Throughput: completed items/tick” / “Latency: ticks per item, offer → completion” / “Backpressure makes capacity limits travel upstream.”

**Narration:**

> Measure the right things. Throughput counts completed work per unit time: here, two per tick once busy. Latency measures an item's elapsed time. For our end-to-end view, include waiting at the producer as well as inside the queue. A bounded queue limits its own backlog. Backpressure communicates that constraint upstream. The crucial question is whether the producer can actually respond by slowing down.

## Trace and continuity notes

1. **Source basis:** The supplied curator-written reference notes at `/private/tmp/clapper-skill-optimization/baseline-v1/runs/D05-0/input/sources/queue.txt`. Those notes identify Reactive Streams as the vocabulary source. This plan uses the supplied notes; it does not claim to quote or independently verify that publication.
2. **Explicit illustrative conventions:** Start empty; use FIFO admission with older producer-side waiting items first. Model service as atomic completion during the service phase, with no persistent in-service state between phases. Request transport is illustrative, not an additional modeled time delay. All table values are settled end-of-tick states.

| Tick | Newly offered | Completed this tick | Admitted this tick | Queued | Waiting upstream | Cumulative offered | Cumulative completed |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 3 | 0 | 3 | 3 | 0 | 3 | 0 |
| 2 | 3 | 2 | 3 | 4 | 0 | 6 | 2 |
| 3 | 3 | 2 | 2 | 4 | 1 | 9 | 4 |
| 4 | 3 | 2 | 2 | 4 | 2 | 12 | 6 |

3. **Conservation:** At each settled state, cumulative offered = cumulative completed + queued + waiting upstream. Admitted is a boundary-crossing count, not an additional inventory to add to that equation. No drops occur in this trace.
4. **Causal animation:** Keep a card assigned to its previous inventory during travel; label it “entering” or “serving.” Transfer its count exactly when admission or completion finishes. Move the phase marker, cards, and counters together. Never show a completion count increasing while its card is still labeled queued. Keep card travel clear of gate labels, the reverse signal, and arithmetic.
5. **Timing:** The storyboard totals 240 seconds. Narration is complete; timings are planned windows, not measured voice takes. Preserve short holds after the tick-three equation and the closing question if later produced.

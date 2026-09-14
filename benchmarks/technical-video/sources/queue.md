# Original deterministic bounded-queue model; backpressure vocabulary from Reactive Streams

Source: https://www.reactive-streams.org/

Pack type: curator-written reference notes, not a verbatim copy of the primary publication. Freeze/approve these notes before confirmatory evaluation.

Use a discrete tick model, a queue capacity4, a producer offering3 items per tick and a consumer serving2 items per tick. Define event order: service queued work first, then admit arrivals up to available capacity; remaining offered items wait at the producer under backpressure.
Conservation must account for all offered items: admitted, completed, queued, waiting or explicitly dropped. Backpressure does not create service capacity or make sustained overload disappear.
A larger buffer can absorb a transient burst. If offered load stays above sustainable service, a bigger finite buffer delays saturation but cannot stabilize that overload. Distinguish waiting, blocking, dropping, retrying and demand signaling.
Throughput is completed work per unit time; latency is time per item. Neither can be substituted for the other. Label synthetic traces and define units and event ordering.

## 00:00.0 — Who should be reviewed first?

A fraud model scores every payment. You can only review a few today, so the highest scores go first. But how do you know that ordering is any good, before you pick a cutoff? One number answers that: the area under a curve, or A U C. You'll compute it by hand from these six payments, then see why the same three letters can mean very different things.

## 00:32.0 — Scores → thresholds → curve → area

Here is the whole journey. On held-out examples, the model produces scores. A threshold turns each score into a yes or no decision. Move the threshold, and each setting gives one point. Plot those points as a curve, then summarize the curve with its area. We'll use the same six payments for two kinds of curve, so you can see exactly what changes.

## 00:58.0 — A score gives an ordering

Here are the six payments, sorted from highest score to lowest. Plus means actual fraud; minus means legitimate. The scores only need to put payments in order; they need not be calibrated probabilities. Notice one mistake: payment B is legitimate, yet it ranks above two frauds, C and D. Keep B in mind. Its mistake will become a missing piece of area.

## 01:25.0 — One threshold gives one decision

Set the threshold at zero point six five. We flag A, B, and C. A and C are frauds we caught: true positives. B is a legitimate payment we flagged: a false positive. D is a fraud we missed: a false negative. And E and F are correctly left alone: true negatives. One threshold gives one confusion matrix, not yet a curve.

## 01:51.5 — Two rates, two different denominators

The true positive rate asks: of all the actual frauds, what fraction did we catch? Two out of three. The false positive rate asks: of all the legitimate payments, what fraction did we wrongly flag? One out of three. An R O C curve, short for receiver operating characteristic, plots false positive rate across and true positive rate up. Our threshold becomes this single point.

## 02:21.5 — Lower the threshold. Trace the tradeoff.

Start above the highest score: nothing is flagged, so both rates are zero. Now lower the threshold past one payment at a time. Each fraud steps the curve up by a third; each legitimate payment steps it right by a third. At the bottom, everything is flagged, and we reach one, one. That staircase is the R O C curve.

## 02:46.0 — Width × height, added across the curve

Now shade the area under the curve. Each legitimate payment adds a vertical strip, one third wide. The heights are one third, one, and one. So the area is one ninth plus one third plus one third: seven ninths, about zero point seven eight. The empty corner above the first strip is payment B's mistake. And A U C is this area, not the accuracy at any one threshold.

## 03:15.5 — Area is also a ranking game

There's a second way to get the same answer. Pair every fraud with every legitimate payment, and give a point whenever the fraud scores higher. Three frauds times three legitimate payments makes nine pairs. A beats all three. C and D each beat two, and both lose to B. Seven wins out of nine: exactly seven ninths again.

## 03:41.0 — Each strip is one column of comparisons

Why do they agree? Take legitimate payment B, scored zero point eight. Only one of the three frauds outranks it, so its strip is one third tall. Legitimate payments E and F are outranked by all three frauds, so their strips are full height. Averaging the strip heights counts exactly the winning pairs. That's the bridge from area to probability.

## 04:08.0 — The probability behind ROC-AUC

Here is the exact statement. Pick one random fraud and one random legitimate payment. R O C area is the probability that the fraud scores higher, with ties counting half. On a finite sample, that is just the fraction of winning pairs, like our seven out of nine. And because the horizontal axis is false positive rate, that is what the area integrates over, not the threshold.

## 04:37.5 — Equal scores mean no ranking preference

Ties need a rule. Take a separate tiny example: one fraud and one legitimate payment, both scored zero point five. Any threshold flags both or neither, so the R O C curve jumps straight from zero, zero to one, one. That diagonal has area one half, the same as giving the tied pair half credit. So a model that gives everything the same score has an A U C of one half.

## 05:07.5 — 1 is perfect. 0.5 is the chance reference.

A perfect ranking climbs to the top before moving right, and fills the whole square. Random ordering has an expected area of one half. A completely reversed ranking scores zero. Below one half can signal a flipped score direction, but don't flip a model just because of your test set. And an A U C of zero point eight does not mean eighty percent of predictions are correct.

## 05:34.5 — Same ordering. Same AUC. Different numbers.

Now square every score. The numbers change, but the order doesn't, so the R O C curve and its area stay at seven ninths. A U C can't tell you which set of numbers makes better probabilities. A fixed cutoff has to move too: zero point six five becomes its square, about zero point four two. Check calibration separately, and pick the threshold from the costs of mistakes.

## 06:02.5 — A small false-positive rate can mean many alarms

Suppose a threshold catches eighty percent of frauds and flags ten percent of legitimate payments. With a hundred of each, that's eighty true alarms and ten false ones: about eighty nine percent precision. Now take ten frauds among nine hundred ninety legitimate payments. The same rates give eight true alarms and ninety nine false ones: only seven and a half percent precision. The R O C point never moved: eighty percent, ten percent. Precision did, because prevalence, the Greek letter pi, changes what the flagged pile is made of.

## 06:41.5 — Precision asks about the flagged pile

Back to our six payments. Recall is just another name for the true positive rate. Precision asks a different question: of the payments we flagged, how many are really fraud? A precision recall curve plots recall across and precision up, as we sweep the same threshold. Each fraud we find raises recall; each legitimate payment we flag drags precision down. Before anything is flagged, precision is undefined, so plots usually start the curve at one.

## 07:15.0 — Reward precision when a new positive is found

A common summary is average precision, or A P. Each new fraud raises recall by one third. At those moments, precision is one, then two thirds, then three quarters. Weight each by its recall step and add them up. Twenty-nine over thirty-six, about zero point eight one. Same predictions as our R O C area of seven ninths, but a different question, and a different number.

## 07:44.5 — PR-AUC and AP are not interchangeable labels

Average precision sums recall steps times precision: zero point eight oh six. Join the raw precision recall points with straight lines and take trapezoids, and you get zero point seven six four. Those straight lines aren't even a valid interpolation in precision recall space. Other benchmarks use an interpolated envelope: at each recall, the best precision at that recall or higher. Here it lifts the middle step from two thirds to three quarters. And on large samples, a random ranker's baseline precision is the prevalence: one half here, only because half our payments are fraud. Always name the convention.

## 08:30.0 — Partial AUC: only the region you operate in

Say you can tolerate almost no false alarms. Partial A U C keeps only false positive rates up to zero point one. Here the raw area is one thirtieth, out of a possible one tenth. Scikit-learn's max F P R setting rescales that so one half is chance and one is perfect: about zero point six five. Always state the range, and whether it was rescaled.

## 08:58.5 — Multiclass AUC needs a decomposition and an average

Now suppose a second model sorts confirmed frauds into three types. One versus rest turns each class into its own binary problem, with its own R O C area; one versus one compares pairs of classes instead. The macro average weights the classes equally: about zero point seven eight. Weighting by class size gives zero point nine one, because the biggest class is the easiest. Same model, two honest numbers with different priorities. And when an example can carry several labels, a micro average pools every example label pair into one curve; that is not an average of areas.

## 09:42.0 — Same letters, different curves

Outside classification, the same letters show up on different curves. In search, average precision rewards relevant results near the top, and mean average precision averages it over queries. With three relevant results, at ranks one, three, and four, it's our twenty-nine over thirty-six again. Object detection first matches each predicted box to a true one by their overlap, called I O U. These two boxes overlap by two thirds: a match at one half, a miss at three quarters. Only then does it build precision recall curves, so Coco's A P is not an R O C area. Survival models compute an A U C at each time horizon t. A machine that failed by t is a case, one still running at t is a control, and one last seen before t is unknown, not a negative. And area under a learning curve measures performance across a training budget, not ranking at all.

## 10:42.5 — Keep the curve, the data, and the decision separate

In practice, feed the metric scores, not hard labels, and make sure larger means more likely positive. Evaluate on held-out data, and report uncertainty that matches how you sampled. Look at the curve and at important subgroups, not just one number. Then choose a threshold from your costs and your prevalence. No kind of A U C chooses that for you.

## 11:08.5 — Ask five questions when someone says “AUC”

Same six payments, two curves, and two different numbers: seven ninths, and twenty-nine over thirty-six. Neither is wrong; they answer different questions. R O C area asks whether frauds outrank legitimate payments. Precision recall asks how clean the flagged pile stays as recall grows. So when you hear A U C, ask: which curve, which positive class, which population, which range, and which average?

# AUC in machine learning — source and scope

A narrated, intuition-first explanation for a software engineer comfortable with
basic algebra. Core ROC and AP derivations use one original six-payment example.
Other ML contexts are explicitly new examples or a map of variants, not claims
that every use of “AUC” shares one definition. No pharmacokinetic content.

Primary/official references checked 2026-09-15:

1. [Fawcett, An introduction to ROC analysis (2006)](https://www.math.ucdavis.edu/~saito/data/roc/fawcett-roc.pdf): threshold sweeps, ROC geometry, ranking interpretation, chance reference and deployment cautions.
2. [scikit-learn ROC-AUC API](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.roc_auc_score.html): score inputs, OvR/OvO, macro/weighted aggregation and standardized partial AUC.
3. [scikit-learn average precision API](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.average_precision_score.html): recall-weighted non-interpolated AP and distinction from linear trapezoidal PR area.
4. [scikit-learn metric guide](https://scikit-learn.org/stable/modules/model_evaluation.html): ROC/PR definitions, averaging and score-based evaluation.
5. [Davis & Goadrich, The Relationship Between Precision-Recall and ROC Curves (2006)](https://research.cs.wisc.edu/techreports/2006/TR1551.pdf): relationships and interpolation caveats. The original worked numbers below are independently calculated.
6. [COCO official evaluator](https://github.com/cocodataset/cocoapi/blob/master/PythonAPI/pycocotools/cocoeval.py): detection matching, interpolated precision, 101 recall thresholds and IoU thresholds .50:.05:.95.
7. [scikit-survival cumulative/dynamic AUC](https://scikit-survival.readthedocs.io/en/stable/api/generated/sksurv.metrics.cumulative_dynamic_auc.html): event-by-horizon cases, event-free controls, censoring-aware weights and time aggregation. Use the standard FPR/TPR ROC axes from ref1; the API page's background sentence about specificity is not our axis definition.
8. [scikit-learn ROC cross-validation example](https://scikit-learn.org/stable/auto_examples/model_selection/plot_roc_crossval.html): out-of-sample evaluation and variation across splits.

9. [TensorFlow AUC metric](https://www.tensorflow.org/api_docs/python/tf/keras/metrics/AUC): fixed-threshold discretization can approximate ROC/PR area; exact rank invariance does not promise invariant coarse-grid estimates.

## Original numerical examples

- Sorted scores: A+ .9, B− .8, C+ .7, D+ .6, E− .4, F− .1.
- At cutoff .65: TP2, FP1, FN1, TN2; TPR2/3, FPR1/3, precision2/3.
- ROC points: (0,0),(0,1/3),(1/3,1/3),(1/3,2/3),(1/3,1),(2/3,1),(1,1).
- ROC area: 7/9; positive-negative wins: 7/9, no ties.
- Non-interpolated AP: (1 + 2/3 + 3/4)/3 = 29/36.
- Linear trapezoidal area of raw PR points, with endpoint (recall0,precision1): 55/72.
- Partial raw ROC area over FPR[0,.1]: 1/30; maximum raw area .1. McClish-standardized (scikit-learn `max_fpr=0.1`): ½(1+(1/30−.005)/(.1−.005)) ≈ .649, hand-computed.
- Prevalence example: fixed TPR.8/FPR.1 gives precision80/90 for100P/100N, but8/107 for10P/990N. Invariance is conditional on keeping class-conditional scoring behavior fixed.
- Interpolated precision envelope (max precision at recall ≥ r): 1 to recall 1/3, then 3/4.
- Retrieval callback: relevant results at ranks 1, 3, 4 give the same AP, 29/36.
- Separate multiclass illustration (labelled as three fraud types): per-class areas .95,.80,.60, supports80,15,5. Macro47/60≈.78333; support-weighted.91.
- Detection illustration: equal100×100 boxes offset20 horizontally have IoU2/3. Matching passes a.5 IoU cutoff and fails.75.

`verify_math.py` checks these independently with exact rational arithmetic.
The six-item sample teaches mechanics; it cannot establish real model quality.

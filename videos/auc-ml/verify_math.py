from fractions import Fraction as F
import json
from pathlib import Path
scores=[F(9,10),F(8,10),F(7,10),F(6,10),F(4,10),F(1,10)]
y=[1,0,1,1,0,0]
pos=[s for s,l in zip(scores,y) if l];neg=[s for s,l in zip(scores,y) if not l]
def pair_auc(p,n):return sum(F(a>b)+F(1,2)*F(a==b) for a in p for b in n)/(len(p)*len(n))
roc=[(F(0),F(0))];pr=[(F(0),F(1))];tp=fp=0;ap=F(0)
for k,l in enumerate(y,1):
 tp+=l;fp+=1-l;roc.append((F(fp,3),F(tp,3)));pr.append((F(tp,3),F(tp,k)))
 if l:ap+=F(1,3)*F(tp,k)
def trap(points):return sum((x1-x0)*(y0+y1)/2 for (x0,y0),(x1,y1) in zip(points,points[1:]))
chosen=[i for i,s in enumerate(scores) if s>=F(65,100)]
assert chosen==[0,1,2] and sum(y[i] for i in chosen)==2
assert F(80,90)==F(8,9) and F(8,8+99)==F(8,107)
assert pair_auc(pos,neg)==trap(roc)==F(7,9)
assert ap==F(29,36)
assert trap(pr)==F(55,72)
assert pair_auc([s*s for s in pos],[s*s for s in neg])==F(7,9)
assert pair_auc([-s for s in pos],[-s for s in neg])==F(2,9)
assert pair_auc([F(1,2)],[F(1,2)])==F(1,2)
assert F(1,10)*F(1,3)==F(1,30)
assert sum([F(95,100),F(80,100),F(60,100)])/3==F(47,60)
assert F(95,100)*F(80,100)+F(80,100)*F(15,100)+F(60,100)*F(5,100)==F(91,100)
assert F(8000,20000-8000)==F(2,3)
# Standardized partial AUC (McClish, as scikit-learn max_fpr): 0.5*(1+(A-min)/(max-min)), min = a^2/2.
a=F(1,10);pa=F(1,30);std=F(1,2)*(1+(pa-a*a/2)/(a-a*a/2))
assert abs(float(std)-0.649)<0.0005
# Interpolated precision envelope used on screen: max precision at recall >= r.
env={r:max(p for rr,p in pr[1:] if rr>=r) for r in (F(1,3),F(2,3),F(1))}
assert env=={F(1,3):F(1),F(2,3):F(3,4),F(1):F(3,4)}
# Retrieval callback: relevant at ranks 1,3,4 of 6 is the same AP.
assert ap==F(1,3)*(F(1,1)+F(2,3)+F(3,4))
# Imbalance: identical ROC point in both populations.
assert (F(80,100),F(10,100))==(F(8,10),F(99,990))
result={'roc_auc':str(trap(roc)),'pair_auc':str(pair_auc(pos,neg)),'average_precision':str(ap),'linear_pr_auc':str(trap(pr)),'roc':[[float(x),float(y)] for x,y in roc],'pr':[[float(x),float(y)] for x,y in pr],'checks':'threshold counts, pair equality, AP, trapezoids, ties, reversal, monotone transform, partial area, averaging, IoU, standardized partial AUC, interpolated envelope, retrieval AP, prevalence-invariant ROC point'}
out=Path(__file__).parent/'out';out.mkdir(exist_ok=True);(out/'math-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

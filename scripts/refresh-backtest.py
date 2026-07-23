#!/usr/bin/env python3
"""Regenerate src/data/backtest.json from live FRED data (Phase R1).

Self-contained port of modeling/python/07_backtest/backtest.py: identical
walk-forward hedge logic and numbers, but instead of reading pre-downloaded
CSVs it pulls the two FRED daily series straight into memory over urllib.
Runs monthly under .github/workflows/backtest.yml so the "live pipeline"
claim in the Backtest module is real, not a frozen snapshot.

Out-of-sample walk-forward hedge backtest for the WTI x USD/KRW program.
NOT an alpha strategy: a Korean crude importer carries a MANDATED physical
exposure (buy oil in USD, pay in KRW), a multiplicative two-factor exposure.
The only question is how much of the residual CASH-FLOW VARIANCE the optimal
hedge removes out of sample, versus naive alternatives, after costs.

Requires: numpy + Python stdlib only (urllib, no requests). Reads the FRED
API key from the FRED_API_KEY environment variable.
"""
import json, math, os, datetime as dt
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "backtest.json"

# ---- config -----------------------------------------------------------------
BUDGET = 1.0          # total hedge coverage (in "one fully-hedged leg" units); <2 binds
WINDOW = 60           # rolling estimation window, months (5y)
TC_BPS = 5.0          # round-trip transaction cost per unit turnover, basis points
ANNUALIZE = math.sqrt(12)
OBS_START = "1986-01-01"

# ---- load FRED daily series directly into memory ----------------------------
def load(series):
    key = os.environ.get("FRED_API_KEY")
    if not key:
        raise SystemExit("FRED_API_KEY environment variable is not set")
    q = urlencode({
        "series_id": series,
        "api_key": key,
        "file_type": "json",
        "observation_start": OBS_START,
    })
    url = f"https://api.stlouisfed.org/fred/series/observations?{q}"
    with urlopen(url, timeout=60) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    rows = {}
    for o in payload["observations"]:
        v = o["value"]
        if v == ".":                      # FRED missing-value marker
            continue
        rows[o["date"]] = float(v)
    if not rows:
        raise SystemExit(f"{series}: no numeric observations returned")
    return rows

wti, fx = load("DCOILWTICO"), load("DEXKOUS")
dates = sorted(set(wti) & set(fx))
# month-end level = last available observation in each calendar month
def month_end_levels(series, dates):
    by_month = {}
    for d in dates:
        ym = d[:7]
        by_month[ym] = series[d]  # dates sorted asc -> last wins
    return by_month

wti_m = month_end_levels(wti, dates)
fx_m = month_end_levels(fx, dates)
months = sorted(set(wti_m) & set(fx_m))

# monthly log returns
r_oil, r_fx, rmonths = [], [], []
for i in range(1, len(months)):
    a, b = months[i - 1], months[i]
    r_oil.append(math.log(wti_m[b] / wti_m[a]))
    r_fx.append(math.log(fx_m[b] / fx_m[a]))
    rmonths.append(b)
r_oil = np.array(r_oil); r_fx = np.array(r_fx)
R = np.column_stack([r_oil, r_fx])           # (T, 2) : [oil, fx]
T = len(R)

# ---- budget-constrained minimum-variance coverage split ---------------------
# residual return u = (1-h1) r_oil + (1-h2) r_fx ; minimize Var(u)
# s.t. h1 + h2 <= BUDGET, 0 <= h1,h2 <= 1.  Sigma is 2x2 estimation covariance.
def mv_split(Sigma, budget=BUDGET):
    s1, s2 = Sigma[0, 0], Sigma[1, 1]
    s12 = Sigma[0, 1]
    best, bh = None, (0.0, 0.0)
    # the constraint binds at the optimum when budget < unconstrained (h1=h2=1);
    # search the active edge h1 in [max(0,budget-1), min(1,budget)]
    lo = max(0.0, budget - 1.0); hi = min(1.0, budget)
    for k in range(0, 2001):
        h1 = lo + (hi - lo) * k / 2000
        h2 = budget - h1
        u1, u2 = 1 - h1, 1 - h2
        var = u1 * u1 * s1 + u2 * u2 * s2 + 2 * u1 * u2 * s12
        if best is None or var < best:
            best, bh = var, (h1, h2)
    return bh

# ---- policies ---------------------------------------------------------------
def policy_unhedged(*_):        return (0.0, 0.0)
def policy_naive(*_):           return (BUDGET / 2, BUDGET / 2)   # even split
def policy_oracle(Sig_full):    return mv_split(Sig_full)          # look-ahead (full sample)

# ---- walk-forward run -------------------------------------------------------
Sig_full = np.cov(R.T, ddof=1)
oracle_h = mv_split(Sig_full)

results = {"unhedged": [], "naive": [], "oracle": [], "walkforward": []}
hprev = {"naive": (0, 0), "oracle": (0, 0), "walkforward": (0, 0), "unhedged": (0, 0)}
tc = {k: 0.0 for k in results}
wf_track = []   # rolling estimated split + correlation (static MV: neg rho -> small FX cover)

for t in range(WINDOW, T):
    past = R[t - WINDOW:t]                       # STRICTLY past -> no look-ahead
    Sig = np.cov(past.T, ddof=1)
    rho = Sig[0, 1] / math.sqrt(Sig[0, 0] * Sig[1, 1])
    hset = {
        "unhedged": policy_unhedged(),
        "naive": policy_naive(),
        "oracle": oracle_h,                      # oracle uses full-sample (deliberately)
        "walkforward": mv_split(Sig),
    }
    ro, rf = R[t]
    for name, (h1, h2) in hset.items():
        resid = (1 - h1) * ro + (1 - h2) * rf
        turnover = abs(h1 - hprev[name][0]) + abs(h2 - hprev[name][1])
        cost = turnover * TC_BPS / 1e4
        results[name].append(resid - cost)
        tc[name] += cost
        hprev[name] = (h1, h2)
    wf_track.append({"month": rmonths[t], "w1": hset["walkforward"][0],
                     "w2": hset["walkforward"][1], "rho": rho})

# ---- metrics ----------------------------------------------------------------
def cvar95(x):
    x = np.sort(np.asarray(x)); k = max(1, int(0.05 * len(x)))
    return float(-np.mean(x[:k]))                # mean of worst 5% losses (as a positive #)

def max_drawdown(x):
    cum = np.cumsum(x); peak = np.maximum.accumulate(cum)
    return float(np.max(peak - cum))

def summarize(name):
    x = np.array(results[name])
    vol = float(np.std(x, ddof=1) * ANNUALIZE)
    return {
        "policy": name,
        "ann_vol": vol,
        "cvar95": cvar95(x),
        "mdd": max_drawdown(x),
        "total_cost": tc[name],
        "n": len(x),
    }

base = summarize("unhedged")["ann_vol"]
summary = []
for name in ["unhedged", "naive", "oracle", "walkforward"]:
    s = summarize(name)
    s["var_reduction"] = 1 - (s["ann_vol"] / base) ** 2   # variance, not vol
    s["vol_reduction"] = 1 - s["ann_vol"] / base
    summary.append(s)

# cumulative residual paths (subsampled for the chart)
def cum_path(name):
    cum = np.cumsum(results[name])
    idx = np.linspace(0, len(cum) - 1, min(len(cum), 240)).astype(int)
    return [{"month": rmonths[WINDOW + int(i)], "cum": float(cum[int(i)])} for i in idx]

# rolling correlation + wf split, subsampled
idx = np.linspace(0, len(wf_track) - 1, min(len(wf_track), 240)).astype(int)
roll = [wf_track[int(i)] for i in idx]

out = {
    "meta": {
        "source": "FRED DCOILWTICO (WTI) + DEXKOUS (USD/KRW), monthly from daily",
        "span": [rmonths[WINDOW], rmonths[-1]],
        "n_months": T - WINDOW,
        "window": WINDOW, "budget": BUDGET, "tc_bps": TC_BPS,
        "oracle_split": {"w1": oracle_h[0], "w2": oracle_h[1]},
        "full_sample_rho": float(Sig_full[0, 1] / math.sqrt(Sig_full[0, 0] * Sig_full[1, 1])),
        "generated": dt.date.today().isoformat(),
    },
    "summary": summary,
    "paths": {name: cum_path(name) for name in results},
    "rolling": roll,
    # raw monthly returns so the ERP can re-run the walk-forward engine live as
    # the user drags the window / budget / cost sliders (4dp keeps the JSON small)
    "returns": [{"m": rmonths[i], "o": round(float(r_oil[i]), 4), "f": round(float(r_fx[i]), 4)}
                for i in range(T)],
}
OUT.write_text(json.dumps(out, indent=1))

# ---- print --------------------------------------------------------------------
print(f"span {rmonths[WINDOW]}..{rmonths[-1]}  ({T-WINDOW} OOS months, window {WINDOW}m, budget {BUDGET}, tc {TC_BPS}bp)")
print(f"full-sample rho(r_oil, r_fx) = {out['meta']['full_sample_rho']:+.3f}   oracle split w1/w2 = {oracle_h[0]:.3f}/{oracle_h[1]:.3f}")
print(f"{'policy':<12}{'annVol':>9}{'varRed%':>9}{'CVaR95':>9}{'MDD':>9}{'cost':>9}")
for s in summary:
    print(f"{s['policy']:<12}{s['ann_vol']*100:>8.2f}%{s['var_reduction']*100:>8.1f}%"
          f"{s['cvar95']*100:>8.2f}%{s['mdd']*100:>8.1f}%{s['total_cost']*100:>8.2f}%")
neg = sum(1 for w in wf_track if w["rho"] < 0)
print(f"rolling rho<0 in {neg}/{len(wf_track)} months ({100*neg/len(wf_track):.0f}%) "
      f"-> negative-correlation regime keeps optimal FX coverage small (Paper 1 w2)")
print(f"wrote {OUT.relative_to(ROOT)}")

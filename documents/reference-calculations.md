# Key Calculations

## LVR (Loan-to-Value Ratio)
```
LVR = (Loan Amount / Estimated Property Value) × 100
```

## ICR (Interest Coverage Ratio)
```
Total Income = Net Profit + Amortisation + Depreciation + Existing Interest + Rental Expense + Proposed Rental Income
Total Interest = Existing Interest + (Loan Amount × Interest Rate / 100)
ICR = Total Income / Total Interest
```

## Pre-Assessment Color Coding
| Outcome | Condition |
|---------|-----------|
| Green | ICR >= 2 AND LVR <= 65 |
| Yellow | ICR >= 2 AND LVR 65-80 |
| Red | ICR < 1.5 OR LVR > 80 |

## Important Notes
- **ICR and LVR**: Auto-calculated in edit dialogs, stored in DB, displayed as read-only
- **Interest rate**: NEVER hardcode — always fetch from `/api/settings/interest-rate` (default fallback: 8.5). Use `useState` + `useEffect` pattern
- **No hardcoded fallbacks**: Use database values only (single source of truth)

-- AmEx Gold/Platinum are paid in full monthly: nothing to roll (applied 2026-11-05).
update debt_accounts set recommendation = 'keep', updated_at = now()
where name in ('AmEx Gold Card (5007)', 'AmEx Platinum Card (3002)') and coalesce(recommendation, '') <> 'keep';

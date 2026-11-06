-- Refresh debt-payment bills to live minimums / current plan (rows updated, none deleted).
update bills set updated_at = now(), amount = 2650, status = 'manual', note = 'Paid in full monthly (no promos) — Nov statement ~$2,650, due 11/10' where id = '0b41ef6a-1e1a-4658-8382-1515e0cddce4';
update bills set updated_at = now(), amount = 3350, status = 'manual', note = 'Paid in full monthly (no promos) — Nov statement ~$3,350, due 11/28' where id = 'b1f31f58-d748-488d-a758-56cf50bc123c';
update bills set updated_at = now(), amount = 325, note = '8.5% family loan (VACU) — keep; $17,481 balance' where id = '13f50ff9-8e2c-4520-b74a-5318ccaeebc5';
update bills set updated_at = now(), amount = 974, note = 'Interest-only-ish on $185,718 @ 6.85% variable (Credit Union of Texas)' where id = '34e9ff2c-e00d-4505-ae7b-fcc6ff116239';
update bills set updated_at = now(), amount = 114, note = '0% BT thru Jun 18 2027 — $11,411' where id = '7106d37f-43b9-40fc-a90c-57c477732fb7';
update bills set updated_at = now(), amount = 249.56, note = 'Equal Pay plans (0%) — minimum from the Oct statement' where id = '830b2e2b-74b4-43d2-a9d4-5721a92ec751';
update bills set updated_at = now(), amount = 29, note = 'Promo 2 (deferred interest) — pay $660 in full before 12/27' where id = 'c1d9465b-2f41-4dfe-96eb-77f80ee47617';
update bills set updated_at = now(), amount = 40, note = 'BT3 ($2,724) ends 12/12 — pay off or balance-transfer' where id = 'd568f381-2bf5-4fe3-8240-6fbb560be4cb';
update bills set updated_at = now(), amount = 40, note = 'BT4 ends 12/9 — pay off or balance-transfer (~$3,574 card balance)' where id = 'efc7112e-7895-4720-937b-02c223dfdbc5';

insert into bills (due_date, payee, amount, bill_type, status, note, is_active)
select v.due, v.payee, v.amount, v.type, v.status, v.note, true
from (values
  ('15th', 'BofA BankAmericard (1205)', 161::numeric, 'Credit Card', 'manual', '0% BT + cash advance thru Oct 18 2027'),
  ('28th', 'RH Card (Synchrony 1380)', 357::numeric, 'Credit Card', 'recurring', '3.99% — $13,853'),
  ('Var',  'Apple Card installments', 167::numeric, 'Credit Card', 'recurring', '0% installments — $900 left'),
  ('Var',  'UT Southwestern payment plan', 80::numeric, 'Loan', 'recurring', '0% medical plan — $1,192 left')
) as v(due, payee, amount, type, status, note)
where not exists (select 1 from bills b where b.payee = v.payee);

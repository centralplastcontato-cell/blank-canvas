do $$
declare
  ev record;
  op record;
  saldo_gross numeric;
  parcelas_count integer;
  taxa numeric;
  total_net_cents integer;
  base_cents integer;
  remainder_cents integer;
  slice_cents integer;
  first_due date;
  gross_per_slice numeric;
  i integer;
begin
  for ev in
    select
      ce.id,
      ce.company_id,
      ce.payment_details
    from public.company_events ce
    where ce.payment_details is not null
      and coalesce(ce.status, '') <> 'cancelado'
      and (ce.payment_details->>'saldo_forma') in ('cartao', 'cartao_credito')
      and coalesce((ce.payment_details->>'parcelas')::integer, 1) > 1
      and coalesce((ce.payment_details->>'saldo_valor')::numeric, 0) > 0
      and not exists (
        select 1
        from public.event_payments ep
        where ep.event_id = ce.id
          and ep.type = 'parcela'
          and coalesce(ep.card_installments, 1) = coalesce((ce.payment_details->>'parcelas')::integer, 1)
          and ep.notes ilike '%sem antecipação%'
      )
      and not exists (
        select 1
        from public.event_payments ep
        where ep.event_id = ce.id
          and ep.type = 'parcela'
          and ep.status = 'paid'
          and coalesce(ep.notes, '') not ilike '[extra:%'
          and coalesce(ep.notes, '') not ilike '%opcional%'
          and coalesce(ep.notes, '') not ilike '%ajuste pós-contrato%'
      )
  loop
    parcelas_count := greatest(1, least(12, coalesce((ev.payment_details->>'parcelas')::integer, 1)));
    saldo_gross := coalesce((ev.payment_details->>'saldo_valor')::numeric, 0);

    select ccf.*
      into op
    from public.company_card_fees ccf
    where ccf.company_id = ev.company_id
      and ccf.is_active = true
      and ccf.id = nullif(ev.payment_details->>'card_operator_id', '')::uuid;

    if op.id is null then
      select ccf.*
        into op
      from public.company_card_fees ccf
      where ccf.company_id = ev.company_id
        and ccf.is_active = true
      order by ccf.operator_name
      limit 1;
    end if;

    if op.id is null or op.antecipado is distinct from false then
      continue;
    end if;

    taxa := coalesce((ev.payment_details->>'saldo_taxa_percent')::numeric, 0);
    if taxa <= 0 then
      taxa := coalesce(to_jsonb(op)->>(format('taxa_credito_%sx', parcelas_count)), '0')::numeric;
    end if;

    if taxa <= 0 then
      continue;
    end if;

    delete from public.event_payments ep
    where ep.event_id = ev.id
      and ep.status <> 'paid'
      and ep.type = 'parcela'
      and (
        coalesce(ep.notes, '') ilike '%ajuste pós-contrato%'
        or (
          ep.payment_method in ('cartao', 'cartao_credito')
          and coalesce(ep.card_installments, parcelas_count) = parcelas_count
        )
      );

    total_net_cents := round((saldo_gross * (1 - taxa / 100)) * 100)::integer;
    base_cents := floor(total_net_cents::numeric / parcelas_count)::integer;
    remainder_cents := total_net_cents - (base_cents * parcelas_count);
    first_due := (coalesce(nullif(ev.payment_details->>'saldo_data', '')::date, current_date) + make_interval(days => coalesce(op.prazo_recebimento_dias, 30)));
    gross_per_slice := round((saldo_gross / parcelas_count) * 100) / 100;

    for i in 1..parcelas_count loop
      slice_cents := base_cents + case when i = parcelas_count then remainder_cents else 0 end;

      insert into public.event_payments (
        event_id,
        company_id,
        type,
        amount,
        gross_amount,
        due_date,
        status,
        payment_method,
        notes,
        card_operator_id,
        card_installments,
        card_fee_percent
      ) values (
        ev.id,
        ev.company_id,
        'parcela',
        slice_cents::numeric / 100,
        gross_per_slice,
        first_due + ((i - 1) * interval '30 days'),
        'pending',
        ev.payment_details->>'saldo_forma',
        format('Parcela %s/%s — Cartão %sx %s (sem antecipação)', i, parcelas_count, parcelas_count, coalesce(op.operator_name, '')),
        op.id,
        parcelas_count,
        taxa
      );
    end loop;
  end loop;
end $$;
# README — SOMA

## 1. Objetivo deste README

Este documento existe para evitar dois tipos de problema que já aconteceram no projeto:

1. front-end aparentemente "quebrado" por causa de cache / deploy inconsistente no GitHub Pages;
2. funcionalidades que parecem não funcionar, mas na verdade estão bloqueadas por policy / RLS no Supabase.

A regra é simples:

- primeiro garantir que o banco está correto;
- depois subir os arquivos certos;
- depois validar com um checklist curto;
- só então mexer em UX ou lógica nova.

---

## 2. Estado estável atual

A base estável atual usa os seguintes arquivos no front:

- `index.html`
- `register.html`
- `styles.css`
- `supabase.js`
- `app.rollback.js`

### Importante

Hoje o recomendado **não é** voltar a usar `app.js` como arquivo principal de produção.

O motivo é simples: já aconteceu desencontro entre o comportamento real do site e o código do `app.js`, com forte sinal de cache / publicação servindo um JS antigo.

Por isso, a base estável foi isolada em:

- `app.rollback.js`

E os HTMLs devem apontar para ele com versionamento na URL, por exemplo:

```html
<script type="module" src="./app.rollback.js?v=20260401-02"></script>
```

Se no futuro você mudar esse JS e o GitHub Pages parecer ignorar a atualização, o caminho mais seguro é:

- trocar o nome do arquivo JS; ou
- trocar o parâmetro de versão (`?v=...`).

---

## 3. Estrutura do projeto

### Front-end

Arquivos principais:

- `index.html` → login + aplicação principal
- `register.html` → cadastro
- `styles.css` → visual
- `supabase.js` → conexão com Supabase
- `app.rollback.js` → lógica da aplicação

### Back-end

- Supabase Auth
- Supabase Postgres
- RLS ativo
- GitHub Pages para hospedagem do front

---

## 4. Ordem correta de setup do banco

Essa ordem importa. Não invente pular etapa.

### Passo 1 — Rodar o schema base

No Supabase, abra o **SQL Editor** e rode primeiro o SQL base do projeto.

Esse arquivo cria:

- `profiles`
- `households`
- `household_members`
- `categories`
- `monthly_budgets`
- `transactions`
- funções auxiliares
- triggers
- RLS inicial

Sem isso, o resto não faz sentido.

---

### Passo 2 — Garantir a coluna `created_by` em `households`

Esse ajuste é importante porque o app cria a casa e já precisa conseguir ler a linha criada.

Rode:

```sql
alter table public.households
add column if not exists created_by uuid references public.profiles(id) on delete set null;

drop policy if exists "households_select_member" on public.households;
drop policy if exists "households_insert_authenticated" on public.households;

create policy "households_select_member_or_creator"
  on public.households
  for select
  to authenticated
  using (
    public.is_household_member(id)
    or created_by = auth.uid()
  );

create policy "households_insert_authenticated"
  on public.households
  for insert
  to authenticated
  with check (created_by = auth.uid());
```

Se esse ajuste não estiver aplicado, a criação de casa pode parecer errada ou inconsistente.

---

### Passo 3 — Permitir visão entre membros da mesma casa e edição/exclusão por contexto da casa

Esse foi um dos pontos reais que já quebraram o projeto.

Rode:

```sql
create or replace function public.share_household_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members other
      on other.household_id = me.household_id
    where me.user_id = auth.uid()
      and other.user_id = target_user_id
  );
$$;

drop policy if exists "profiles_select_household_member" on public.profiles;
create policy "profiles_select_household_member"
  on public.profiles
  for select
  to authenticated
  using (public.share_household_with(id));

drop policy if exists "transactions_update_member" on public.transactions;
drop policy if exists "transactions_delete_member" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_update_member"
  on public.transactions
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "transactions_delete_member"
  on public.transactions
  for delete
  to authenticated
  using (public.is_household_member(household_id));
```

### O que esse passo resolve

1. um membro da casa consegue ver o nome do outro;
2. edição e exclusão de lançamento passam a funcionar no contexto da casa, e não só para o próprio autor.

Sem esse passo, o sistema pode até confirmar a exclusão, mas nada acontecer visualmente porque a policy bloqueia a operação.

---

## 5. Checklist de deploy no GitHub Pages

Sempre siga esta ordem:

### Arquivos que devem ser enviados

- `index.html`
- `register.html`
- `styles.css`
- `app.rollback.js`

### Arquivo que deve ser mantido

- `supabase.js`

A não ser que a URL / anon key mudem, **não troque o `supabase.js`**.

### Depois de subir

1. confirme que `index.html` aponta para `app.rollback.js`;
2. confirme que `register.html` também aponta para `app.rollback.js`;
3. faça **refresh forçado** com `Ctrl + F5`;
4. se o navegador continuar se comportando como uma versão antiga:
   - troque o `?v=...` do script; ou
   - renomeie o arquivo JS.

### Regra operacional importante

Se o comportamento do navegador não bate com o código que está no repositório, **suspeite de cache / publicação antes de reescrever lógica**.

---

## 6. Checklist de testes após deploy

Faça pelo menos estes testes:

### Autenticação

- login funciona;
- logout funciona;
- cadastro funciona;
- voltar do cadastro para login funciona.

### Casa

- criar casa funciona;
- entrar em casa por ID funciona;
- copiar ID da casa ativa funciona.

### Gestão financeira

- criar categoria funciona;
- categoria continua aparecendo ao virar o mês;
- lançar gasto funciona;
- excluir lançamento funciona;
- editar lançamento funciona;
- trocar entre `Casa`, pessoa e `Compartilhado` funciona.

### Regra do mês

- ao virar o mês, **lançamentos somem** do recorte mensal;
- ao virar o mês, **categorias não somem**;
- o sistema usa o último orçamento conhecido da categoria para evitar sensação de desaparecimento estrutural.

---

## 7. Erros mais comuns do SOMA

### 1. “Cliquei e nada aconteceu”

Pode ser uma de duas coisas:

- cache / JS antigo sendo servido pelo GitHub Pages;
- erro retornando em `#appMessage` no topo da tela, fora do campo de visão.

### 2. “Salvar gasto não funciona”

Antes de culpar o front:

- confira se o HTML realmente está apontando para o JS atual;
- faça refresh forçado;
- confira se o arquivo publicado é o mesmo que você editou.

### 3. “Excluir lançamento não funciona”

Se a caixinha de confirmação aparece e, depois de confirmar, nada acontece, a causa mais provável é RLS / policy da tabela `transactions`.

O ajuste correto é o bloco SQL do item 4, passo 3.

### 4. “Criar casa falha ou parece inconsistente”

Provável causa:

- falta da coluna `created_by` em `households`;
- policies antigas ainda ativas.

### 5. “O navegador está rodando um comportamento que não existe no código local”

Isso é sinal clássico de:

- cache;
- arquivo antigo publicado;
- HTML apontando para JS errado.

---

## 8. Princípios para próximas mudanças

Antes de mexer no produto, siga esta ordem:

1. confirmar se o problema é de deploy/cache;
2. confirmar se o problema é de policy/RLS;
3. só depois mexer em lógica do front.

### Não repetir este erro

Não sair criando v2, v3, v4, v5 de correção sem antes validar:

- o arquivo certo está sendo servido?
- a policy certa está ativa no Supabase?

---

## 9. Fluxo mínimo recomendado para evoluir o SOMA sem quebrar tudo

### Para mudança só de front

1. editar arquivo local;
2. subir no GitHub;
3. confirmar referência do script;
4. versionar a URL do JS;
5. testar com `Ctrl + F5`.

### Para mudança que depende do banco

1. escrever SQL;
2. rodar no Supabase primeiro;
3. validar policy / tabela;
4. só depois testar a interface.

### Para bugs críticos

1. testar em cima da base estável atual;
2. não acumular correções experimentais sobre uma base que já está suspeita;
3. se necessário, fazer rollback limpo em vez de remendo em cascata.

---

## 10. Estado atual que deve ser preservado

Hoje o que precisa ser preservado é:

- categorias fixas entre meses;
- lançamentos mensais sumindo no recorte correto;
- exclusão funcionando com policy de membro da casa;
- uso de `app.rollback.js` como base estável de publicação.

Se for mexer em cima disso, faça de forma incremental.

Não trate essa base como brinquedo.

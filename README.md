# AD Montese System

Sistema administrativo ministerial da Assembleia de Deus Montese.

## Tecnologias

- React 19, TypeScript, Vite e Tailwind CSS
- Supabase (login, banco de dados e permissoes por perfil)
- Google Sheets, lido pelo servidor (`api/sheets.ts`) para a chave nunca ir ao navegador
- Hospedagem na Vercel

## Como os dados funcionam

1. **Planilha (hoje):** o sistema le a planilha do Google pelo servidor. O que for cadastrado no sistema (bens, dizimistas, lancamentos) fica salvo no banco e aparece para todos.
2. **Importacao:** em Configuracoes, o administrador copia todas as abas da planilha para o banco (tabelas `sheet_tabs` e `sheet_rows`). Pode repetir quantas vezes quiser.
3. **Banco (depois):** quando estiver conferido, o administrador troca a fonte para "banco de dados". Os lancamentos passam a entrar direto no banco e a planilha vira arquivo historico.

## Primeira configuracao

1. Crie um projeto no [Supabase](https://supabase.com) (de preferencia numa conta da igreja).
2. Abra o SQL Editor e rode `supabase/migrations/0001_estrutura_inicial.sql`.
3. Em Authentication > URL Configuration, coloque o endereco do sistema como Site URL.
4. Na Vercel, cadastre as variaveis de `.env.example` (as `VITE_SUPABASE_*` e uma das opcoes do Google) e publique de novo.
5. Entre no sistema e clique em **Pedir acesso**. **O primeiro cadastro vira administrador automaticamente**; os proximos ficam aguardando aprovacao em Usuarios.
6. Em Configuracoes, informe o link da planilha.

### Conta de servico do Google (recomendado)

1. No Google Cloud Console, crie uma conta de servico e gere uma chave JSON.
2. Ative a Google Sheets API no projeto.
3. Compartilhe a planilha com o email da conta de servico, como **Leitor**.
4. Na Vercel, cadastre `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (o campo `private_key` do JSON).
5. Tire o compartilhamento "qualquer pessoa com o link" da planilha.

## Perfis de acesso

| Perfil | Pode |
| --- | --- |
| Administrador | Tudo, inclusive usuarios e configuracoes |
| Tesouraria | Lancar dizimos e movimentacoes |
| Patrimonio | Cadastrar bens, inventarios e manutencoes |
| Secretaria | Cadastros gerais |
| Somente leitura | Consultar |

As regras ficam no banco (RLS), entao valem mesmo para quem tentar acessar a API direto.

## Comandos

```bash
npm install
npm run dev      # sem Supabase configurado, roda em "modo local" (dados so no navegador)
npm run build
```

Para testar a leitura da planilha localmente use `vercel dev`, que tambem roda a pasta `api/`.

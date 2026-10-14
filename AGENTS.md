# AGENTS.md

## Contexto do projeto
- Este repositório é uma SPA em React 19 + TypeScript + Vite para o sistema administrativo da Assembleia de Deus Monte-se.
- A arquitetura está organizada por camadas e features, com foco em manutenção de código legível, previsível e consistente.
- Consulte [package.json](package.json) para scripts e dependências, [src/app/App.tsx](src/app/App.tsx) para as rotas e [src/components/ui](src/components/ui) para componentes reutilizáveis da interface.

## Comandos principais
- `npm run dev` — inicia o ambiente de desenvolvimento local.
- `npm run build` — gera a build de produção.
- `npm run lint` — executa a checagem de qualidade e estilo do código.
- Antes de concluir alterações visuais ou de comportamento, prefira validar com `npm run build` e `npm run lint`.

## Convenções de desenvolvimento
- Use TypeScript com `strict: true` e mantenha tipos explícitos sempre que a inferência não for suficiente.
- Prefira imports com o alias `@/*` para arquivos dentro de [src](src).
- Siga a estrutura por feature:
  - [src/features](src/features) para telas e fluxos de negócio.
  - [src/application](src/application) para casos de uso e orquestração.
  - [src/domain](src/domain) para tipos, contratos e regras de negócio.
  - [src/infrastructure](src/infrastructure) para integrações externas e repositórios.
- Preserve o padrão de componentes funcionais com exportação nomeada.
- Ao alterar rotas, atualize também a navegação e os menus em [src/app/App.tsx](src/app/App.tsx) e [src/components/layout/nav-items.ts](src/components/layout/nav-items.ts).
- Use Tailwind para estilos e mantenha componentes visuais reutilizáveis em [src/components/ui](src/components/ui).

## Dados e seguranca
- Login, perfis e dados ficam no Supabase (`supabase/migrations`). As permissoes valem no banco (RLS); a tela so esconde o que o perfil nao pode usar.
- Cadastros feitos no sistema usam `recordStore` ([src/infrastructure/storage/RecordStore.ts](src/infrastructure/storage/RecordStore.ts)); nao grave dados de negocio em `localStorage`.
- Configuracoes globais ficam em `settingsStore` (tabela `settings`).
- A planilha do Google e lida somente pelo servidor ([api/sheets.ts](api/sheets.ts)). Nunca coloque chaves do Google em variaveis `VITE_*` nem no codigo.

## Diretrizes de mudança
- Evite refatorações amplas sem necessidade; prefira ajustes locais e bem delimitados.
- Ao adicionar nova tela ou módulo, alinhe-se com o padrão já existente em [src/features](src/features).
- Não remova dependências, integrações ou serviços sem verificar o impacto nos fluxos de dados.
- Se houver dúvida sobre convenções específicas, priorize o padrão já presente no código e nas pastas citadas acima.
- Responda sempre em português e descreva mudanças com clareza, objetivo e contexto.

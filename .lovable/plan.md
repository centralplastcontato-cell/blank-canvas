

## Problema Real

A margem negativa no `FollowUpsTab` só compensa o padding do `PullToRefresh` (`p-3 md:p-5`), mas **não escapa** do `max-w-7xl mx-auto` que está no `div` pai na linha 227 de `Inteligencia.tsx`. Esse é o verdadeiro gargalo -- os cards ficam limitados a 1280px mesmo em telas maiores.

## Solução

**Arquivo: `src/pages/Inteligencia.tsx` (linha 227)**

Tornar o `max-w-7xl` condicional: quando a aba ativa for `follow-ups`, remover o limite de largura para que o grid ocupe toda a área disponível.

```tsx
// De:
<div className="max-w-7xl mx-auto space-y-4">

// Para:
<div className={`mx-auto space-y-4 ${activeTab === "follow-ups" ? "" : "max-w-7xl"}`}>
```

**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**

Reverter o `containerClass` para vazio (a expansão agora vem do parent):

```tsx
const containerClass = "";
```

Isso faz com que as 5 colunas ocupem 100% da largura da tela (menos a sidebar), ficando com tamanho similar ao layout de 4 colunas que o usuário aprovou na imagem 3.


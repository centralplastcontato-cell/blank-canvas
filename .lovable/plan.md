

# Onboarding Banner — Layout empilhado no mobile

## O que muda

No mobile, o banner atual tenta colocar tudo em uma linha horizontal (ícone + título + barra + botão), o que pode ficar apertado. A mudança empilha verticalmente no mobile e mantém horizontal no desktop.

## Alteracao

**Arquivo**: `src/components/admin/OnboardingBanner.tsx` (linhas 33-46)

O container interno passa de `flex items-center` fixo para um layout que empilha no mobile:

- **Mobile**: Icone + titulo na primeira linha, barra de progresso na segunda linha (largura total), botao "Ver passos" na terceira linha
- **Desktop (md+)**: Mantém o layout horizontal atual (tudo em uma linha)

Detalhes:
- Container: `flex flex-col md:flex-row md:items-center gap-2 md:gap-4`
- Primeira linha (mobile): `flex items-center gap-3` com icone + titulo + contador
- Barra de progresso: `w-full md:flex-1` para ocupar largura total no mobile
- Botao "Ver passos": `self-start md:self-auto` no mobile fica alinhado a esquerda
- Padding do botao dismiss ajustado para nao sobrepor o titulo

Nenhum arquivo novo, nenhuma dependencia nova. Apenas ajuste de classes Tailwind no componente existente.


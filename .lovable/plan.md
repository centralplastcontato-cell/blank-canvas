

## Minimizar Dialog de Envio para Grupos

### Problema
Com 10 grupos e intervalo de 60s, o envio leva ~10 minutos. Hoje o dialog trava a tela inteira durante esse tempo, impedindo o usuario de fazer qualquer outra coisa.

### Solucao
Adicionar um botao "Minimizar" no dialog durante o envio. Ao minimizar:
- O dialog fecha visualmente
- Um **banner flutuante compacto** aparece no canto inferior da tela mostrando o progresso (ex: "Enviando 3/10...")
- O processo continua rodando em background
- Ao finalizar, o dialog **reabre automaticamente** mostrando o resultado (sucesso/falhas)
- O banner tambem permite clicar para reabrir o dialog a qualquer momento

### Alteracoes

**Arquivo: `src/components/freelancer/SendScheduleToGroupsDialog.tsx`**

1. Adicionar estado `minimized` (boolean)
2. Quando `minimized=true`, o Dialog fecha (`open={false}`) mas o loop de envio continua
3. Renderizar um **portal flutuante** (fixed bottom-right) com:
   - Icone de progresso animado
   - Texto "Enviando X de Y..."
   - Barra de progresso compacta
   - Clique para maximizar (reabrir dialog)
4. Botao "Minimizar" (icone Minus) visivel apenas durante o envio, ao lado do X
5. Ao finalizar o envio:
   - Se minimizado: automaticamente seta `minimized=false` e reabre o dialog com o resultado
   - Mostrar resumo (X enviados, Y falhas) antes de fechar

**Arquivo: `src/components/freelancer/FreelancerSchedulesTab.tsx`**
- Nenhuma alteracao necessaria -- a logica fica toda dentro do dialog

### Detalhes tecnicos

```text
+------------------------------------------+
|  Dialog (open && !minimized)             |
|  [Minimizar]  durante envio              |
+------------------------------------------+

Quando minimizado:
+------------------------------------------+
|                                          |
|  (pagina normal, usuario navega livre)   |
|                                          |
|  +-----------------------------+         |
|  | Enviando 3/10... [===>   ]  |  fixed  |
|  +-----------------------------+  bottom |
+------------------------------------------+

Ao finalizar:
-> Dialog reabre com resumo do resultado
```

- O estado de envio (`sending`, `progress`, resultados) fica no componente, que permanece montado mesmo com dialog fechado
- O banner flutuante usa `ReactDOM.createPortal` para renderizar fora do dialog
- Ao clicar no banner, seta `minimized=false` para reabrir
- Resultado final mostrado em tela de resumo dentro do dialog antes de fechar


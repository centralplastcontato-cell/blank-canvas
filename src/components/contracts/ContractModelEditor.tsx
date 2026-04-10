import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Info, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getAvailableVariables, resolveSystemVariables } from "@/lib/template-resolver";
import { RichContractEditor } from "./RichContractEditor";

/** Convert **bold** markdown markers into <strong> tags.
 *  Handles bold blocks that span multiple lines by tracking open/close state. */
function parseBoldMarkdown(text: string): string {
  const lines = text.split('\n');
  let inBold = false;
  const result = lines.map(line => {
    // First handle complete **..** pairs within this line
    line = line.replace(/\*\*([^\n]+?)\*\*/g, (_m, inner) => `<strong>${inner}</strong>`);
    // Count remaining unmatched ** markers
    const parts = line.split('**');
    if (parts.length > 1) {
      let rebuilt = '';
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          inBold = !inBold;
          rebuilt += inBold ? '<strong>' : '</strong>';
        }
        rebuilt += parts[i];
      }
      return rebuilt;
    }
    if (inBold) {
      return `<strong>${line}</strong>`;
    }
    return line;
  });
  let output = result.join('\n');
  if (inBold) output += '</strong>';
  output = output.replace(/<strong><\/strong>/g, '');
  return output;
}

const TIPO_OPTIONS = [
  { value: "aniversario", label: "Aniversário" },
  { value: "aniversario_kids", label: "Aniversário Kids" },
  { value: "escolar", label: "Escolar" },
  { value: "formatura", label: "Formatura" },
  { value: "externo", label: "Externo" },
  { value: "personalizado", label: "Personalizado" },
];

interface Props {
  model: {
    id: string;
    nome_modelo: string;
    tipo_evento: string;
    descricao: string | null;
    conteudo_template: string;
    versao: number;
    company_id: string;
  } | null;
  userId: string;
  onClose: () => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  lead: "Lead / Contratante",
  company: "Empresa",
  event: "Evento",
  contract: "Contrato / Dados Extras",
  visit: "Visita",
  schedule: "Escala",
};

export function ContractModelEditor({ model, userId, onClose }: Props) {
  const { currentCompany } = useCompany();
  const [nome, setNome] = useState(model?.nome_modelo || "");
  const [tipo, setTipo] = useState(model?.tipo_evento || "aniversario");
  const [descricao, setDescricao] = useState(model?.descricao || "");
  const [conteudo, setConteudo] = useState(model?.conteudo_template || DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("editor");

  const variables = useMemo(() => getAvailableVariables(), []);
  const groupedVars = useMemo(() => {
    const groups: Record<string, typeof variables> = {};
    variables.forEach(v => {
      const d = v.domain;
      if (!groups[d]) groups[d] = [];
      groups[d].push(v);
    });
    return groups;
  }, [variables]);

  // Detect unrecognized variables
  const unresolvedVars = useMemo(() => {
    const varPattern = /\{\{?\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}?\}/g;
    const allKeys = new Set(variables.map(v => v.key));
    const allAliases = new Set(variables.flatMap(v => v.aliases));
    const unresolved: string[] = [];
    let match;
    while ((match = varPattern.exec(conteudo)) !== null) {
      const key = match[1].toLowerCase();
      if (!allKeys.has(key) && !allAliases.has(key)) {
        if (!unresolved.includes(match[1])) unresolved.push(match[1]);
      }
    }
    return unresolved;
  }, [conteudo, variables]);

  // Preview with sample data
  const previewContent = useMemo(() => {
    return resolveSystemVariables(conteudo, {
      lead: { name: "Maria Silva", whatsapp: "(11) 99999-9999", guests: "80", unit: "Unidade Centro" },
      company: { name: currentCompany?.name || "Buffet Exemplo" },
      event: { date: "15/03/2026", time: "14:00", end_time: "18:00", package_name: "Pacote Gold", value: 5000, guest_count: 80, unit: "Unidade Centro", event_type: "Aniversário" },
      contract: {
        responsible_name: "Maria Silva", cpf: "123.456.789-00", rg: "12.345.678-9",
        email: "maria@email.com", address: "Rua das Flores", numero: "123", complemento: "Apto 45",
        bairro: "Centro", cidade: "São Paulo", cep: "01234-567",
        nome_aniversariante: "João", idade_aniversariante: "5", data_nascimento: "15/03/1990", data_nascimento_aniversariante: "15/03/2021",
        nomes_pais: "Maria Silva e Pedro Silva",
        value: "R$ 5.000,00", valor_sinal: "R$ 1.500,00", valor_restante: "R$ 3.500,00",
        forma_pagamento: "3x no cartão", brindes: "Brinquedo surpresa", date: new Date().toLocaleDateString("pt-BR"),
      },
    });
  }, [conteudo, currentCompany?.name]);

  const generateSlug = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!currentCompany?.id || !nome.trim() || !conteudo.trim()) {
      toast({ title: "Preencha o nome e o conteúdo do contrato", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (model) {
      // Save version before updating
      await (supabase as any).from("contract_model_versions").insert({
        model_id: model.id,
        company_id: model.company_id,
        versao: model.versao,
        conteudo_template: model.conteudo_template,
        tipo_evento: model.tipo_evento,
        nome_modelo: model.nome_modelo,
        changed_by: userId,
      });

      const newVersion = model.versao + 1;
      const { error } = await (supabase as any).from("contract_models").update({
        nome_modelo: nome.trim(),
        tipo_evento: tipo,
        descricao: descricao.trim() || null,
        conteudo_template: conteudo,
        versao: newVersion,
        updated_by: userId,
        slug: generateSlug(nome.trim()),
      }).eq("id", model.id);

      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); }
      else { toast({ title: `Modelo atualizado (v${newVersion})!` }); }
    } else {
      const { error } = await (supabase as any).from("contract_models").insert({
        company_id: currentCompany.id,
        nome_modelo: nome.trim(),
        slug: generateSlug(nome.trim()),
        tipo_evento: tipo,
        descricao: descricao.trim() || null,
        conteudo_template: conteudo,
        created_by: userId,
      });
      if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Modelo criado!" }); }
    }
    setSaving(false);
    onClose();
  };

  const insertVariable = (key: string) => {
    setConteudo(prev => prev + `{{${key}}}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
        <h2 className="text-lg font-bold">{model ? "Editar Modelo" : "Novo Modelo de Contrato"}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Use variáveis como {"{{nome}}"} para preencher automaticamente</p>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Name + Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs font-semibold">Nome do Modelo</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Contrato Festa Aniversário" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold">Tipo de Evento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-semibold">Descrição (opcional)</Label>
          <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do modelo..." className="mt-1" />
        </div>

        {/* Editor + Preview tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-full md:max-w-sm">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</TabsTrigger>
            <TabsTrigger value="variables"><Info className="h-3.5 w-3.5 mr-1" /> Variáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-3">
            <div className="flex items-center gap-2 mb-2 p-2.5 rounded-lg bg-muted/50 border border-border/30">
              {currentCompany?.logo_url && <img src={currentCompany.logo_url} alt="" className="h-6 rounded" />}
              <p className="text-xs text-muted-foreground">
                🏷️ O logotipo e nome de <strong>{currentCompany?.name || "sua empresa"}</strong> serão adicionados automaticamente no topo de todo contrato gerado.
              </p>
            </div>
            <RichContractEditor
              value={conteudo}
              onChange={setConteudo}
              placeholder="Digite o conteúdo do contrato aqui..."
            />
            {unresolvedVars.length > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-300/30 text-sm">
                <p className="font-semibold text-amber-700 text-xs mb-1">⚠️ Variáveis não reconhecidas:</p>
                <div className="flex flex-wrap gap-1">
                  {unresolvedVars.map(v => <Badge key={v} variant="outline" className="text-xs border-amber-400 text-amber-700">{`{{${v}}}`}</Badge>)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="mt-3">
            <div className="bg-muted/30 rounded-2xl p-4 md:p-6 max-h-[500px] overflow-y-auto">
              <div className="max-w-[680px] mx-auto bg-white dark:bg-card rounded-xl shadow-sm border border-border/30 p-8 md:p-10">
                {/* Document header — matches print */}
                <div className="text-center mb-6 pb-3 border-b-2 border-foreground/15">
                  {currentCompany?.logo_url && (
                    <img src={currentCompany.logo_url} alt="" className="h-28 mx-auto mb-2" />
                  )}
                  <h2 className="text-sm md:text-base font-bold text-foreground tracking-wide uppercase">
                    Contrato de festa {currentCompany?.name || "Buffet"}
                  </h2>
                </div>

                {/* Document body — matches ContractDocumentViewer */}
                <div
                  className="whitespace-pre-wrap text-sm leading-[1.85] text-foreground/90 font-serif text-justify"
                  dangerouslySetInnerHTML={{
                     __html: parseBoldMarkdown(previewContent),
                  }}
                />

                {/* Document footer */}
                <div className="mt-12 pt-3 border-t border-border/30 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Documento gerado pela plataforma CELEBREI — {new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variables" className="mt-3">
            <div className="rounded-2xl border border-border/40 p-4 max-h-[400px] overflow-y-auto space-y-4">
              {Object.entries(groupedVars).map(([domain, vars]) => (
                <div key={domain}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{DOMAIN_LABELS[domain] || domain}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vars.map(v => (
                      <button
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="text-xs px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                      >
                        {`{{${v.key}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">Clique em uma variável para inserí-la no editor</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {model ? "Salvar Alterações" : "Criar Modelo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_TEMPLATE = `FESTA PACOTE CASTELO
Contrato de Prestação de Serviço de Buffet Infantil

O Buffet {{empresa}}, com sede na Avenida General Osório, 1442 – CNPJ 43.883.010.0001/25 denominado CONTRATADO e:

Nome: {{nome_completo}}
Data de Nascimento: {{data_nascimento}}
CPF: {{cpf}}
RG: {{rg}}
Endereço: {{endereco}}, {{numero}}
Complemento: {{complemento}}
Bairro: {{bairro}}
CEP: {{cep}}
Cidade: {{cidade}}
E-mail: {{email}}

**Aniversariante: {{nome_aniversariante}}, Idade a comemorar: {{idade_aniversariante}}, Data Nascimento: {{data_nascimento_aniversariante}}, Data do Evento: {{data_evento}}, Data do Contrato: {{data_contrato}}, Pacote escolhido: {{pacote}}, Tema: {{tema}}, Nome dos pais: {{nomes_pais}}, Telefone dos pais: {{telefone}}, Denominada CONTRATANTE.**

Cláusula 1ª.) O BUFFET {{empresa}} prestará serviços, em seu salão de eventos localizado à Avenida General Osório, 1442 - Trujillo - O CONTRATADO assume a responsabilidade de planejar, organizar e executar as expensas do CONTRATANTE, destinada à {{convidados}} pessoas no dia {{data_evento}}, das {{hora_inicio}} às {{hora_fim}}, devendo para tanto fornecer toda mão de obra bem como todo o material necessário para o evento, que será composto de: serviço de Buffet.

Cláusula 2ª.) O preço certo e contratado para o serviço descrito é: {{valor_total}} cujo pagamento deverá ser efetuado da seguinte maneira.
DESCRIÇÃO: {{forma_pagamento}}
BRINDE: {{brindes}}

Cláusula 3ª.) O serviço do Buffet terá início a partir do horário combinado, conforme estabelecido no contrato, e terá duração de 4 horas, com direito a quinze minutos de tolerância que poderá ser computado no final do evento.

Cláusula 4ª.) Caso o(a) CONTRATANTE exceda o limite de tolerância, será cobrado como multa 20% (vinte por cento) do valor total do contrato a cada 30 minutos excedidos, ou fração.

Cláusula 5ª.) O salão será disponibilizado à(o) CONTRATANTE, 15 (quinze) minutos antes do horário estabelecido para o início do evento, sendo certo que os serviços somente serão iniciados na hora prevista para o início do evento.
Opcionais como massa show tem duração de 2 horas e 30 minutos, dentro das 4 horas de festa, sendo iniciado pontualmente com o horário da festa.
Para melhor aproveitamento do tempo do evento o Buffet segue seu próprio cronograma de andamento de festa, não sendo possível fazer qualquer alteração do mesmo.

Cláusula 6ª.) O número de convidados do(a) CONTRATANTE é de {{convidados}} pessoas. Fica pactuado entre as partes contratantes que, na hipótese de não comparecimento de todas as pessoas previstas neste contrato, não haverá restituição proporcional dos valores pagos. Se estendendo também a regra para possíveis convidados adicionais contratados.

Cláusula 7ª.) O não comparecimento do número previsto de convidados não implicará na redução do preço total do evento contratado.

Cláusula 8ª.) Crianças com até 4 anos serão consideradas como cortesia do {{empresa}}, não sendo computadas para efeito de cobrança, no limite de até 15 crianças acompanhadas de um responsável (maior de idade). Pai e mãe do(a) aniversariante, serão considerados como cortesia. No caso das festas duplas será considerado apenas um pai e mãe como brinde no contrato fechado.
Importante: O BUFFET {{empresa}}, se reserva no direito de não aceitar crianças menores de 06 anos desacompanhadas dos pais ou responsáveis.

Cláusula 9ª.) O controle de convidados será feito em lista nominal. É obrigação do(a) CONTRATANTE ou de pessoa por Ele(a) designada, acompanhar o seu preenchimento, sendo-lhe assegurado o direito de contestar durante a realização do evento. Não sendo aceito, averiguação, reclamação e/ou devolução de valores após o evento.

Cláusula 10ª.) Se o(a) CONTRATANTE desejar alterar a data da realização do evento, deverá comunicar o BUFFET {{empresa}}. O CONTRATADO procederá com a alteração, desde que haja disponibilidade na agenda de eventos do BUFFET dentro do ano contratado, e o CONTRATANTE deverá arcar com a multa de R$ 500,00 (quinhentos reais) referente a reserva de data, se o mesmo desejar a alteração para o ano seguinte, deverá arcar com as custas referente ao reequilíbrio de custos para a mudança. A transferência do evento: será possível desde que não haja reserva para o dia e horário desejado. Se a transferência for solicitada com menos de 60 (sessenta) dias, incidirá uma taxa de 20% sobre o valor total do contrato.
Para alteração de data solicitada em 48h antes do evento, incidirá uma multa de 50% sobre o valor contratado a titulo de indenização por perdas e danos;
Em caso de doença, falecimento, ou algum acidente envolvendo, exclusivamente, aniversariante, pai, mãe ou irmãos do aniversariante, é necessário a apresentação de um documento médico atestando a doença e impossibilidade da realização do evento.

Cláusula 11ª.) A falta de pagamento nos prazos estipulados sujeita o CONTRATANTE ao pagamento de juros legais e atualização monetária com base na variação do IGPM/GV, a partir da data de vencimento, além de despesas bancárias, sem prejuízo da rescisão do contrato que poderá ser exigida pelo CONTRATADO.

Cláusula 12ª.) Em caso de inadimplência, fica autorizado a inclusão do nome do(a) CONTRATANTE junto aos órgãos de proteção ao crédito, permanecendo as negativações até a quitação do débito.

Cláusula 13ª.) No caso de atraso no pagamento da(s) parcela(s), arcará o(a) CONTRATANTE com multa de 10% (dez por cento), além de juros de mora de 1% ao mês e correção monetária pela variação do IGP-M da Fundação Getúlio Vargas.
Os boletos já emitidos não poderão ser cancelados e nem reemitidos.
Após o vencimento deverão ser pagos diretamente nas agências bancárias juntamente com seus juros e multa.

Cláusula 14ª.) O não pagamento, total ou parcial de quaisquer das parcelas, será interpretado como desistência do evento, acarretando o seu imediato cancelamento, independente de qualquer aviso ou notificação.

Cláusula 15ª.) O(a) CONTRATANTE poderá aumentar o número de convidados, devendo para tanto comunicar o BUFFET {{empresa}} em até no máximo 10 (DEZ) dias que antecedem o evento, sob pena dos serviços atenderem apenas a demanda contratada.

Cláusula 16ª.) Caso o número de convidados ultrapasse o número já contratado, o valor adicional por convidado será: {{pacote}} - {{valor_convidado_adicional}} por "convidado adicional". Será concedido desconto de R$ 5,00 por "convidado adicional" se o pagamento ocorrer com antecedência de 10 (dez) dias da data do evento.
Valores adicionais descritos acima é referente a realização do evento até {{data_evento}}

Cláusula 17ª.) O valor correspondente aos "convidados adicionais", deverá ser pago à vista e ao final do evento, sob pena de sofrer acréscimo de 10% (dez por cento).

Cláusula 18ª.) Obriga-se o BUFFET {{empresa}} a reservar o seu espaço e garantir a qualidade de seus serviços, desde que o número total de convidados presentes não exceda a 10% (dez por cento) do número previamente contratado, sem prejuízo da cobrança do valor previsto para "convidado adicional", nos termos deste contrato.

Cláusula 19ª.) Não está incluída em nenhum dos nossos pacotes bebida alcoólica.

Cláusula 20ª.) A cerveja (deve ser em lata, proibido garrafa em vidro) poderá ser gelada e servida pelo Buffet {{empresa}} e, será cobrado o valor de R$ 150,00 (cento e cinquenta reais) a ser pago junto no contrato e antes do dia do evento, se optar por contratar chopp a taxa passa a ser R$ 200,00 (duzentos reais) devendo ser chopeira elétrica e não gelo, o mesmo deve ser retirado logo após o término da festa. Fica expressamente proibida a entrada com cooler no estabelecimento ou bebida de fora, sendo necessário o contratante trazer ao salão dia antes do evento toda a bebida alcoólica.

Cláusula 21ª.) O cancelamento do evento poderá ser requerido pelo(a) CONTRATANTE, desde que o faça mediante o prévio e necessário envio de carta por escrito ao BUFFET {{empresa}} observando-se o seguinte:
- Até 60 (sessenta) dias antes do evento, serão restituídos 70% (setenta por cento) do valor contratado;
- Desistência comunicada em prazo inferior a 60 (sessenta) dias que antecedem o evento, serão restituídos 50% (cinquenta por cento) do valor contratado, a título de indenização por perdas e danos.

Cláusula 22ª.) O BUFFET não será responsabilizado por problemas advindos de falhas dos serviços públicos, tais como suspensão de energia elétrica, água, gás, etc. Se por motivo de caso fortuito ou de força maior não for possível realizar o evento, as partes em comum acordo definirão nova data, observando-se a disponibilidade da agenda do BUFFET {{empresa}}. Caso o(a) CONTRATANTE desista do evento não haverá restituição dos valores pagos.

Cláusula 23ª.) Não estão incluídos nos serviços, a taxa de estacionamento dos veículos e os serviços de manobristas.

Cláusula 24ª.) Comprovado que o(a) CONTRATANTE, terceiros contratados pelo mesmo ou seus convidados tenham dolosamente danificado móveis, chão, parede, equipamentos, utensílios tais como copos, pratos, talheres, toalhas e demais bens do BUFFET {{empresa}}, os prejuízos serão indenizados pelo(a) CONTRATANTE pelo valor de mercado.

Cláusula 25ª.) Caso haja acidente de qualquer natureza durante o evento sem a ocorrência de culpa ou dolo do BUFFET {{empresa}}, este não terá nenhuma responsabilidade, podendo, se entender necessário prestar a assistência cabível.

Cláusula 26ª.) O buffet estará disponível para montagem da decoração externa duas horas antes da festa. Sempre que tiver uma festa primeiro esse tempo se reduz para 1:45 min.
É proibida a utilização da energia elétrica do buffet para quaisquer serviços externos.
É responsabilidade do CONTRATANTE, decoração, vela, doces, papelaria, lembrancinhas para crianças e convidados, arranjos de mesa, toalhas de mesa e balões, sendo assim, não fornecidos pelo CONTRATADO.

Cláusula 27ª.) Havendo qualquer danificação no salão (piso, parede, brinquedos, utensílios, etc) durante a festa, o Contratante terá que arcar com o valor de mercado referente ao dano causado, no final do evento, sendo pago à vista.

Cláusula 28ª.) Quando for realizada a adesão dos opcionais cobertura fotográfica ou locação de projetor para vídeo vida os mesmos não poderão ser cancelados ou trocados por outros itens. No caso de qualquer outro opcional contratado a solicitação de troca pode ser realizada até 20 dias antes do evento.

Cláusula 29ª.) Ao assinar este contrato, o CONTRATANTE está de acordo com o Uso de Imagem, pois o salão publica nas redes sociais, um vídeo com fotos do Evento realizado. Caso o CONTRATANTE não queira esta exposição, é necessário informar o CONTRATADO no ato do fechamento do contrato.

Cláusula 30ª.) O BUFFET {{empresa}} não se responsabiliza por objetos esquecidos ou perdidos durante ou após a realização do evento.

Cláusula 31ª.) O BUFFET {{empresa}} realiza periodicamente a manutenção preventiva dos brinquedos elétricos ou eletrônicos, porém, não será responsabilizado por brinquedos ou aparelhos que tenham quebrado de um evento para outro, sem tempo hábil para manutenção, nestes casos, O BUFFET {{empresa}} se reserva o direito do não funcionamento de até 10% dos equipamentos eletrônicos oferecidos na locação do salão.

Cláusula 32ª.) O BUFFET {{empresa}} poderá indicar ou autorizar serviços profissionais e prestadores de serviços diversos tais como manobristas, estacionamento, shows, fotos, filmagens, retrospectiva, etc., os quais serão contratados diretamente pelo(a) CONTRATANTE, não ensejando para o BUFFET {{empresa}} qualquer responsabilização por tais serviços, ou de eventuais danos deles advindos. Caso seja necessário algum material do BUFFET {{empresa}}, o(a) CONTRATANTE deverá solicitar com antecedência de 10 (dez) dias da data de realização do evento.

Cláusula 33ª.) Por haver preparo e manutenção de alimentos, é proibida a entrada e permanência de animais em nosso Buffet.

Cláusula 34ª.) Após fechamento do contrato, não será possível a troca de pacote apenas inclusão de convidados adicionais não sendo possível também a transferência de uma unidade para outra, sendo Unidade I situada na Rua Abner Pacheco, 286 – Parque Manchester e Unidade II, situada na Avenida General Osório, 1442 – Bairro Trujillo, ambas na cidade de Sorocaba.

Cláusula 35ª.) As partes contratantes elegem o foro da cidade de Sorocaba, Estado de São Paulo, para dirimir quaisquer controvérsias oriundas deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

Sorocaba, {{data_contrato}}

_______________________________
CONTRATANTE - CPF {{cpf}}
{{nome_completo}}

_______________________________
BUFFET {{empresa}}`;
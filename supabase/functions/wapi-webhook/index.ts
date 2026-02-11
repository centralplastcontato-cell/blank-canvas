import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

// Menu options - numbered choices for structured input
const MONTH_OPTIONS = [
  { num: 1, value: 'Fevereiro' },
  { num: 2, value: 'Março' },
  { num: 3, value: 'Abril' },
  { num: 4, value: 'Maio' },
  { num: 5, value: 'Junho' },
  { num: 6, value: 'Julho' },
  { num: 7, value: 'Agosto' },
  { num: 8, value: 'Setembro' },
  { num: 9, value: 'Outubro' },
  { num: 10, value: 'Novembro' },
  { num: 11, value: 'Dezembro' },
];

const DAY_OPTIONS = [
  { num: 1, value: 'Segunda a Quinta' },
  { num: 2, value: 'Sexta' },
  { num: 3, value: 'Sábado' },
  { num: 4, value: 'Domingo' },
];

// Extract options from question text dynamically
function extractOptionsFromQuestion(questionText: string): { num: number; value: string }[] | null {
  const lines = questionText.split('\n');
  const options: { num: number; value: string }[] = [];
  
  for (const line of lines) {
    // Match patterns like "1 - 50 pessoas" or "*1* - 50 pessoas" or "1. 50 pessoas"
    const match = line.match(/^\*?(\d+)\*?\s*[-\.]\s*(.+)$/);
    if (match) {
      options.push({ num: parseInt(match[1]), value: match[2].trim() });
    }
  }
  
  return options.length > 0 ? options : null;
}

// Default guest options (fallback only)
const DEFAULT_GUEST_OPTIONS = [
  { num: 1, value: '50 pessoas' },
  { num: 2, value: '60 pessoas' },
  { num: 3, value: '70 pessoas' },
  { num: 4, value: '80 pessoas' },
  { num: 5, value: '90 pessoas' },
  { num: 6, value: '100 pessoas' },
];

// Default tipo options (cliente, orçamento ou trabalhe conosco)
const TIPO_OPTIONS = [
  { num: 1, value: 'Já sou cliente' },
  { num: 2, value: 'Quero um orçamento' },
  { num: 3, value: 'Trabalhe no Castelo' },
];

// Default próximo passo options
const PROXIMO_PASSO_OPTIONS = [
  { num: 1, value: 'Agendar visita' },
  { num: 2, value: 'Tirar dúvidas' },
  { num: 3, value: 'Analisar com calma' },
];

// Build menu text
function buildMenuText(options: { num: number; value: string }[]): string {
  return options.map(opt => `*${opt.num}* - ${opt.value}`).join('\n');
}

// Validation functions
function validateName(input: string): { valid: boolean; value?: string; error?: string } {
  const name = input.trim();
  if (name.length < 2) {
    return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite seu nome completo:' };
  }
  // Accept any reasonable name (letters, spaces, accents)
  if (!/^[\p{L}\s'-]+$/u.test(name)) {
    return { valid: false, error: 'Por favor, digite apenas seu nome (sem números ou símbolos):' };
  }
  return { valid: true, value: name };
}

function validateMenuChoice(input: string, options: { num: number; value: string }[], stepName: string): { valid: boolean; value?: string; error?: string } {
  const normalized = input.trim();
  
  // Extract number from input
  const numMatch = normalized.match(/^\d+$/);
  if (numMatch) {
    const num = parseInt(numMatch[0]);
    const option = options.find(opt => opt.num === num);
    if (option) {
      return { valid: true, value: option.value };
    }
  }
  
  // Build error message with valid options
  const validNumbers = options.map(opt => opt.num).join(', ');
  return { 
    valid: false, 
    error: `Por favor, responda apenas com o *número* da opção desejada (${validNumbers}) 👇\n\n${buildMenuText(options)}` 
  };
}

function validateMonth(input: string): { valid: boolean; value?: string; error?: string } {
  return validateMenuChoice(input, MONTH_OPTIONS, 'mês');
}

function validateDay(input: string): { valid: boolean; value?: string; error?: string } {
  return validateMenuChoice(input, DAY_OPTIONS, 'dia');
}

function validateGuests(input: string, customOptions?: { num: number; value: string }[]): { valid: boolean; value?: string; error?: string } {
  const options = customOptions || DEFAULT_GUEST_OPTIONS;
  return validateMenuChoice(input, options, 'convidados');
}

// Validation router by step - now accepts question context for dynamic options
function validateAnswer(step: string, input: string, questionText?: string): { valid: boolean; value?: string; error?: string } {
  switch (step) {
    case 'nome': return validateName(input);
    case 'tipo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || TIPO_OPTIONS, 'tipo');
    }
    case 'mes': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || MONTH_OPTIONS, 'mês');
    }
    case 'dia': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || DAY_OPTIONS, 'dia');
    }
    case 'convidados': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateGuests(input, customOptions || undefined);
    }
    case 'proximo_passo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || PROXIMO_PASSO_OPTIONS, 'próximo passo');
    }
    default: return { valid: true, value: input.trim() };
  }
}

// Default questions fallback with numbered menus
const DEFAULT_QUESTIONS: Record<string, { question: string; confirmation: string | null; next: string }> = {
  nome: { 
    question: 'Para começar, me conta: qual é o seu nome? 👑', 
    confirmation: 'Muito prazer, {nome}! 👑✨', 
    next: 'tipo' 
  },
  tipo: {
    question: `Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n${buildMenuText(TIPO_OPTIONS)}`,
    confirmation: null,
    next: 'mes'
  },
  mes: { 
    question: `Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n${buildMenuText(MONTH_OPTIONS)}`, 
    confirmation: '{mes}, ótima escolha! 🎊', 
    next: 'dia' 
  },
  dia: { 
    question: `Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n${buildMenuText(DAY_OPTIONS)}`, 
    confirmation: 'Anotado!', 
    next: 'convidados' 
  },
  convidados: { 
    question: `E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n${buildMenuText(DEFAULT_GUEST_OPTIONS)}`, 
    confirmation: null, 
    next: 'complete' 
  },
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

async function isVipNumber(supabase: SupabaseClient, instanceId: string, phone: string): Promise<boolean> {
  const n = normalizePhone(phone);
  const { data } = await supabase.from('wapi_vip_numbers').select('id').eq('instance_id', instanceId)
    .or(`phone.ilike.%${n}%,phone.ilike.%${n.replace(/^55/, '')}%`).limit(1);
  return Boolean(data?.length);
}

async function getBotSettings(supabase: SupabaseClient, instanceId: string) {
  const { data } = await supabase.from('wapi_bot_settings').select('*').eq('instance_id', instanceId).single();
  return data;
}

async function getBotQuestions(supabase: SupabaseClient, instanceId: string): Promise<Record<string, { question: string; confirmation: string | null; next: string }>> {
  const { data } = await supabase.from('wapi_bot_questions')
    .select('step, question_text, confirmation_text, sort_order')
    .eq('instance_id', instanceId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!data || data.length === 0) {
    return DEFAULT_QUESTIONS;
  }

  // Build question chain based on sort order
  const questions: Record<string, { question: string; confirmation: string | null; next: string }> = {};
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const nextStep = i < data.length - 1 ? data[i + 1].step : 'complete';
    questions[q.step] = {
      question: q.question_text,
      confirmation: q.confirmation_text || null,
      next: nextStep,
    };
  }
  return questions;
}

function replaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
  }
  return result;
}
async function sendBotMessage(instanceId: string, instanceToken: string, remoteJid: string, message: string): Promise<string | null> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    console.log(`[Bot] Sending message to ${phone} via instance ${instanceId}`);
    const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instanceToken}` },
      body: JSON.stringify({ phone, message, delayTyping: 1 }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Bot] send-text failed: ${res.status} ${errBody}`);
      return null;
    }
    const r = await res.json();
    const msgId = r.messageId || r.data?.messageId || r.id || null;
    console.log(`[Bot] send-text response: msgId=${msgId}`);
    return msgId;
  } catch (e) {
    console.error(`[Bot] send-text exception:`, e);
    return null;
  }
}

// ============= FLOW BUILDER PROCESSOR =============

async function processFlowBuilderMessage(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  content: string,
  contactPhone: string,
  contactName: string | null
) {
  const companyId = instance.company_id;
  
  console.log(`[FlowBuilder] ========== PROCESSING MESSAGE ==========`);
  console.log(`[FlowBuilder] Company: ${companyId}, Conv: ${conv.id}, Phone: ${contactPhone}`);
  console.log(`[FlowBuilder] Content: "${content}", BotStep: ${conv.bot_step}, BotEnabled: ${conv.bot_enabled}`);
  
  // 1. Find the default active flow for this company
  const { data: flow, error: flowErr } = await supabase
    .from('conversation_flows')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_default', true)
    .eq('is_active', true)
    .single();
  
  if (flowErr || !flow) {
    console.log(`[FlowBuilder] ❌ No active default flow found for company ${companyId}. Error: ${flowErr?.message || 'no flow'}`);
    return;
  }
  
  const flowId = flow.id;
  console.log(`[FlowBuilder] ✅ Found flow: "${flow.name}" (${flowId})`);
  
  // 2. Fetch all nodes, edges, and options for this flow
  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from('flow_nodes').select('*').eq('flow_id', flowId),
    supabase.from('flow_edges').select('*').eq('flow_id', flowId),
  ]);
  
  const nodes = nodesRes.data || [];
  const edges = edgesRes.data || [];
  
  console.log(`[FlowBuilder] Loaded ${nodes.length} nodes, ${edges.length} edges`);
  
  if (nodes.length === 0) {
    console.log(`[FlowBuilder] ❌ Flow ${flowId} has no nodes`);
    return;
  }
  
  // 3. Fetch or create lead state
  let { data: state } = await supabase
    .from('flow_lead_state')
    .select('*')
    .eq('conversation_id', conv.id)
    .eq('flow_id', flowId)
    .maybeSingle();
  
  const startNode = nodes.find(n => n.node_type === 'start');
  if (!startNode) {
    console.log(`[FlowBuilder] ❌ No start node in flow ${flowId}`);
    return;
  }
  
  console.log(`[FlowBuilder] Lead state: ${state ? `exists (node: ${state.current_node_id}, waiting: ${state.waiting_for_reply})` : 'NEW (first message)'}`);
  
  // 4. If no state, initialize at start node and send first message chain
  if (!state) {
    console.log(`[FlowBuilder] 🆕 Initializing flow state for conversation ${conv.id}`);
    
    // Create state at start node
    const { data: newState, error: stateErr } = await supabase
      .from('flow_lead_state')
      .insert({
        conversation_id: conv.id,
        flow_id: flowId,
        current_node_id: startNode.id,
        collected_data: {},
        waiting_for_reply: false,
      })
      .select()
      .single();
    
    if (stateErr) {
      console.error(`[FlowBuilder] Error creating state:`, stateErr.message);
      return;
    }
    
    state = newState;
    
    // Follow edges from start node to first real node
    await advanceFlowFromNode(supabase, instance, conv, state, startNode, nodes, edges, contactPhone, contactName, null);
    return;
  }
  
  // 5. If waiting_for_reply, process the user's response
  if (state.waiting_for_reply && state.current_node_id) {
    const currentNode = nodes.find(n => n.id === state.current_node_id);
    if (!currentNode) {
      console.log(`[FlowBuilder] Current node ${state.current_node_id} not found`);
      return;
    }
    
    console.log(`[FlowBuilder] 💬 Processing reply for node "${currentNode.title}" (${currentNode.node_type}), extract_field: ${currentNode.extract_field || 'none'}`);
    
    // Extract data if needed
    const collectedData = (state.collected_data || {}) as Record<string, string>;
    if (currentNode.extract_field) {
      collectedData[currentNode.extract_field] = content.trim();
      console.log(`[FlowBuilder] 📝 Extracted: ${currentNode.extract_field} = "${content.trim()}"`);
    }
    
    // Update collected_data
    await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
    state.collected_data = collectedData;
    
    // Find matching edge from current node
    // First check if this is a question node with options
    const { data: nodeOptions } = await supabase
      .from('flow_node_options')
      .select('*')
      .eq('node_id', currentNode.id)
      .order('display_order', { ascending: true });
    
    let matchedEdge = null;
    
    console.log(`[FlowBuilder] Node has ${nodeOptions?.length || 0} options`);
    
    if (nodeOptions && nodeOptions.length > 0) {
      // Try to match by number (e.g., user types "1", "2", etc.)
      const userChoice = content.trim();
      const numMatch = userChoice.match(/^\d+$/);
      
      if (numMatch) {
        const choiceNum = parseInt(numMatch[0]);
        console.log(`[FlowBuilder] User chose number: ${choiceNum} (valid range: 1-${nodeOptions.length})`);
        if (choiceNum >= 1 && choiceNum <= nodeOptions.length) {
          const selectedOption = nodeOptions[choiceNum - 1];
          // Find edge for this option
          matchedEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === selectedOption.id);
          
          // Store the selected option value
          if (currentNode.extract_field) {
            collectedData[currentNode.extract_field] = selectedOption.value;
            await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
          }
        }
      }
      
      if (!matchedEdge) {
        // Try AI interpretation if enabled
        if (currentNode.allow_ai_interpretation) {
          // Simple text matching fallback
          for (const opt of nodeOptions) {
            if (content.toLowerCase().includes(opt.value.toLowerCase()) || content.toLowerCase().includes(opt.label.toLowerCase())) {
              matchedEdge = edges.find(e => e.source_node_id === currentNode.id && e.source_option_id === opt.id);
              if (matchedEdge) {
                if (currentNode.extract_field) {
                  collectedData[currentNode.extract_field] = opt.value;
                  await supabase.from('flow_lead_state').update({ collected_data: collectedData }).eq('id', state.id);
                }
                break;
              }
            }
          }
        }
        
        // If still no match, re-send the question with options
        if (!matchedEdge) {
          console.log(`[FlowBuilder] ⚠️ No option matched for input "${content}". Re-sending question.`);
          const optionsText = nodeOptions.map((o, i) => `*${i + 1}* - ${o.label}`).join('\n');
          const retryMsg = `Por favor, responda com o *número* da opção desejada:\n\n${optionsText}`;
          
          const retryMsgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, retryMsg);
          if (retryMsgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: retryMsgId, from_me: true,
              message_type: 'text', content: retryMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: companyId,
            });
          }
          return;
        }
      }
    } else {
      // No options - find any edge from this node (fallback/default edge)
      matchedEdge = edges.find(e => e.source_node_id === currentNode.id && !e.source_option_id);
      if (!matchedEdge) {
        matchedEdge = edges.find(e => e.source_node_id === currentNode.id);
      }
    }
    
    if (!matchedEdge) {
      console.log(`[FlowBuilder] ❌ No matching edge from node "${currentNode.title}" (${currentNode.id}). Flow ends here.`);
      await supabase.from('flow_lead_state').update({ waiting_for_reply: false }).eq('id', state.id);
      return;
    }
    
    // Find target node
    const targetNode = nodes.find(n => n.id === matchedEdge!.target_node_id);
    if (!targetNode) {
      console.log(`[FlowBuilder] ❌ Target node ${matchedEdge.target_node_id} not found in flow`);
      return;
    }
    
    console.log(`[FlowBuilder] ➡️ Matched edge → advancing to "${targetNode.title}" (${targetNode.node_type})`);
    console.log(`[FlowBuilder] Collected data so far: ${JSON.stringify(collectedData)}`);
    
    // Advance to target node
    await advanceFlowFromNode(supabase, instance, conv, state, targetNode, nodes, edges, contactPhone, contactName, collectedData);
  }
}

async function advanceFlowFromNode(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  state: { id: string; collected_data: unknown },
  currentNode: { id: string; node_type: string; title: string; message_template: string | null; action_type: string | null; action_config: unknown; extract_field: string | null; require_extraction: boolean | null },
  allNodes: typeof currentNode[],
  allEdges: { id: string; source_node_id: string; target_node_id: string; source_option_id: string | null; condition_type: string | null; condition_value: string | null }[],
  contactPhone: string,
  contactName: string | null,
  collectedData: Record<string, string> | null
) {
  const data = collectedData || (state.collected_data as Record<string, string>) || {};
  
  console.log(`[FlowBuilder] ▶️ Advancing to node: "${currentNode.title}" (type: ${currentNode.node_type}, id: ${currentNode.id})`);
  console.log(`[FlowBuilder] Data so far: ${JSON.stringify(data)}`);
  
  // Replace variables in message template
  const replaceVars = (text: string) => {
    let result = text;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'gi'), value);
    }
    result = result.replace(/\{nome\}/gi, data.nome || contactName || contactPhone);
    return result;
  };
  
  switch (currentNode.node_type) {
    case 'start': {
      // Start node - just follow to next node
      console.log(`[FlowBuilder] ⏩ Start node - auto-advancing`);
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        } else {
          console.log(`[FlowBuilder] ❌ Next node not found: ${nextEdge.target_node_id}`);
        }
      } else {
        console.log(`[FlowBuilder] ❌ No edge from start node`);
      }
      break;
    }
    
    case 'message': {
      // Send message and auto-advance to next node
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        console.log(`[FlowBuilder] 📤 Sending message: "${msg.substring(0, 80)}..."`);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });
        }
        
        // Update conversation
        await supabase.from('wapi_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_content: msg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);
      }
      
      // Auto-advance to next node
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          // Small delay between messages
          await new Promise(r => setTimeout(r, 2000));
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        }
      } else {
        // No more edges - end
        await supabase.from('flow_lead_state').update({ current_node_id: currentNode.id, waiting_for_reply: false }).eq('id', state.id);
      }
      break;
    }
    
    case 'question': {
      // Send question with options and wait for reply
      const { data: options } = await supabase
        .from('flow_node_options')
        .select('*')
        .eq('node_id', currentNode.id)
        .order('display_order', { ascending: true });
      
      console.log(`[FlowBuilder] ❓ Question node with ${options?.length || 0} options, extract_field: ${currentNode.extract_field || 'none'}`);
      
      let msg = currentNode.message_template ? replaceVars(currentNode.message_template) : currentNode.title;
      
      if (options && options.length > 0) {
        const optionsText = options.map((o, i) => `*${i + 1}* - ${o.label}`).join('\n');
        msg += `\n\n${optionsText}`;
      }
      
      console.log(`[FlowBuilder] 📤 Sending question: "${msg.substring(0, 80)}..."`);
      const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
      if (msgId) {
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: msg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
        });
      }
      
      // Update state to wait for reply
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: true,
        last_sent_at: new Date().toISOString(),
      }).eq('id', state.id);
      
      // Update conversation
      await supabase.from('wapi_conversations').update({
        bot_step: `flow_${currentNode.id}`,
        last_message_at: new Date().toISOString(),
        last_message_content: msg.substring(0, 100),
        last_message_from_me: true,
      }).eq('id', conv.id);
      break;
    }
    
    case 'action': {
      const actionType = currentNode.action_type;
      const actionConfig = (currentNode.action_config || {}) as Record<string, unknown>;
      
      console.log(`[FlowBuilder] Executing action: ${actionType}`);
      
      switch (actionType) {
        case 'handoff': {
          // Disable bot and notify team
          if (currentNode.message_template) {
            const msg = replaceVars(currentNode.message_template);
            const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
            if (msgId) {
              await supabase.from('wapi_messages').insert({
                conversation_id: conv.id, message_id: msgId, from_me: true,
                message_type: 'text', content: msg, status: 'sent',
                timestamp: new Date().toISOString(), company_id: instance.company_id,
              });
            }
          }
          
          await supabase.from('wapi_conversations').update({
            bot_enabled: false,
            bot_step: 'flow_handoff',
            last_message_at: new Date().toISOString(),
            last_message_from_me: true,
          }).eq('id', conv.id);
          
          await supabase.from('flow_lead_state').update({
            current_node_id: currentNode.id,
            waiting_for_reply: false,
          }).eq('id', state.id);
          
          // Create notification
          try {
            const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
            const unitLower = instance.unit?.toLowerCase() || '';
            const unitPermission = `leads.unit.${unitLower}`;
            const { data: userPerms } = await supabase.from('user_permissions').select('user_id').eq('granted', true).in('permission', [unitPermission, 'leads.unit.all']);
            
            const userIds = new Set<string>();
            userPerms?.forEach(p => userIds.add(p.user_id));
            adminRoles?.forEach(r => userIds.add(r.user_id));
            
            const notifications = Array.from(userIds).map(userId => ({
              user_id: userId,
              type: 'flow_handoff',
              title: '🔄 Lead transferido pelo Flow Builder',
              message: `${data.nome || contactName || contactPhone} foi transferido para atendimento humano.`,
              data: { conversation_id: conv.id, contact_phone: contactPhone, unit: instance.unit },
              read: false,
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
          } catch (e) {
            console.error('[FlowBuilder] Notification error:', e);
          }
          break;
        }
        
        case 'extract_data': {
          // Data extraction already happened via extract_field. Now sync to CRM.
          await syncCollectedDataToLead(supabase, instance, conv, data, contactPhone, contactName);
          
          // Auto-advance
          const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
          if (nextEdge) {
            const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
            if (nextNode) {
              await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
            }
          }
          break;
        }
        
        case 'schedule_visit': {
          await supabase.from('wapi_conversations').update({ has_scheduled_visit: true }).eq('id', conv.id);
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({ status: 'em_contato' }).eq('id', conv.lead_id);
          }
          
          if (currentNode.message_template) {
            const msg = replaceVars(currentNode.message_template);
            const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
            if (msgId) {
              await supabase.from('wapi_messages').insert({
                conversation_id: conv.id, message_id: msgId, from_me: true,
                message_type: 'text', content: msg, status: 'sent',
                timestamp: new Date().toISOString(), company_id: instance.company_id,
              });
            }
          }
          
          // Auto-advance
          const nextEdge2 = allEdges.find(e => e.source_node_id === currentNode.id);
          if (nextEdge2) {
            const nextNode = allNodes.find(n => n.id === nextEdge2.target_node_id);
            if (nextNode) {
              await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
            }
          }
          break;
        }
        
        default: {
          // Unknown action, auto-advance
          if (currentNode.message_template) {
            const msg = replaceVars(currentNode.message_template);
            const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
            if (msgId) {
              await supabase.from('wapi_messages').insert({
                conversation_id: conv.id, message_id: msgId, from_me: true,
                message_type: 'text', content: msg, status: 'sent',
                timestamp: new Date().toISOString(), company_id: instance.company_id,
              });
            }
          }
          const nextEdge3 = allEdges.find(e => e.source_node_id === currentNode.id);
          if (nextEdge3) {
            const nextNode = allNodes.find(n => n.id === nextEdge3.target_node_id);
            if (nextNode) {
              await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
            }
          }
          break;
        }
      }
      break;
    }
    
    case 'end': {
      console.log(`[FlowBuilder] 🏁 END node reached. Final collected data: ${JSON.stringify(data)}`);
      // Send final message and disable bot
      if (currentNode.message_template) {
        const msg = replaceVars(currentNode.message_template);
        const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });
        }
      }
      
      // Sync data to CRM
      await syncCollectedDataToLead(supabase, instance, conv, data, contactPhone, contactName);
      
      // Disable bot
      await supabase.from('wapi_conversations').update({
        bot_enabled: false,
        bot_step: 'flow_complete',
        last_message_at: new Date().toISOString(),
        last_message_from_me: true,
      }).eq('id', conv.id);
      
      await supabase.from('flow_lead_state').update({
        current_node_id: currentNode.id,
        waiting_for_reply: false,
      }).eq('id', state.id);
      break;
    }
    
    default: {
      // Unknown node type, try to advance
      const nextEdge = allEdges.find(e => e.source_node_id === currentNode.id);
      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target_node_id);
        if (nextNode) {
          await advanceFlowFromNode(supabase, instance, conv, state, nextNode, allNodes, allEdges, contactPhone, contactName, data);
        }
      }
      break;
    }
  }
}

async function syncCollectedDataToLead(
  supabase: SupabaseClient,
  instance: { id: string; unit: string | null; company_id: string },
  conv: { id: string; lead_id: string | null },
  data: Record<string, string>,
  contactPhone: string,
  contactName: string | null
) {
  const n = normalizePhone(contactPhone);
  const leadData: Record<string, unknown> = {};
  
  if (data.nome) leadData.name = data.nome;
  if (data.mes) leadData.month = data.mes;
  if (data.dia) leadData.day_preference = data.dia;
  if (data.convidados) leadData.guests = data.convidados;
  
  if (Object.keys(leadData).length === 0 && !data.nome) return;
  
  if (conv.lead_id) {
    await supabase.from('campaign_leads').update(leadData).eq('id', conv.lead_id);
    console.log(`[FlowBuilder] Updated lead ${conv.lead_id}`);
  } else {
    const { data: newLead } = await supabase.from('campaign_leads').insert({
      name: data.nome || contactName || contactPhone,
      whatsapp: n,
      unit: instance.unit,
      campaign_id: 'flow-builder',
      campaign_name: 'WhatsApp (Flow Builder)',
      status: 'novo',
      company_id: instance.company_id,
      ...leadData,
    }).select('id').single();
    
    if (newLead) {
      await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
      console.log(`[FlowBuilder] Created lead ${newLead.id}`);
    }
  }
}

// ============= ORIGINAL BOT QUALIFICATION =============

async function processBotQualification(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null },
  content: string, contactPhone: string, contactName: string | null
) {
  const settings = await getBotSettings(supabase, instance.id);
  if (!settings) return;
  
  // Check if Flow Builder mode is enabled — delegate to flow processor
  if (settings.use_flow_builder) {
    console.log(`[Bot] Flow Builder mode enabled for instance ${instance.id}, delegating...`);
    await processFlowBuilderMessage(supabase, instance, conv, content, contactPhone, contactName);
    return;
  }

  const n = normalizePhone(contactPhone);
  const tn = settings.test_mode_number ? normalizePhone(settings.test_mode_number) : null;
  const isTest = tn && n.includes(tn.replace(/^55/, ''));
  
  // Check if bot settings allow running
  const botSettingsAllow = (settings.test_mode_enabled && isTest) || (settings.bot_enabled && !settings.test_mode_enabled);
  
  // If bot_enabled is false, check if this is an LP lead that needs bot activation
  // This happens when the LP sends the first message (outgoing), creating the conversation with bot_enabled=false
  // Then when the lead responds, bot_enabled is still false but we need to activate the flow
  if (conv.bot_enabled === false && botSettingsAllow) {
    // Check if there's an LP lead linked or findable by phone number
    const vars = [n, n.replace(/^55/, ''), `55${n}`];
    let lpLead = null;
    
    if (conv.lead_id) {
      const { data: linked } = await supabase.from('campaign_leads')
        .select('id, name, month, day_of_month, guests, campaign_id')
        .eq('id', conv.lead_id)
        .single();
      if (linked?.campaign_id && !linked.campaign_id.startsWith('whatsapp')) lpLead = linked;
    }
    
    if (!lpLead) {
      const { data: found } = await supabase.from('campaign_leads')
        .select('id, name, month, day_of_month, guests, campaign_id')
        .or(vars.map(p => `whatsapp.ilike.%${p}%`).join(','))
        .eq('company_id', instance.company_id)
        .not('campaign_id', 'like', 'whatsapp%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (found) lpLead = found;
    }
    
    if (lpLead && lpLead.name && lpLead.month) {
      console.log(`[Bot] LP lead detected (${lpLead.id}), re-enabling bot for conversation ${conv.id}`);
      // Re-enable bot and link lead
      await supabase.from('wapi_conversations').update({
        bot_enabled: true,
        bot_step: 'welcome',
        lead_id: lpLead.id,
      }).eq('id', conv.id);
      conv.bot_enabled = true;
      conv.bot_step = 'welcome';
      conv.lead_id = lpLead.id;
    } else {
      return; // No LP lead found, don't activate bot
    }
  } else if (conv.bot_enabled === false) {
    return;
  }
  
  if (!botSettingsAllow) return;
  if (await isVipNumber(supabase, instance.id, contactPhone)) return;
  
  // Check if lead already exists and has complete data - send welcome message instead of bot
  if (conv.lead_id) {
    const { data: existingLead } = await supabase.from('campaign_leads')
      .select('name, month, day_preference, day_of_month, guests')
      .eq('id', conv.lead_id)
      .single();
    
      // If lead already has all qualification data, send welcome message for qualified leads
      // LP leads have day_of_month, bot leads have day_preference - check both
      const hasCompleteData = existingLead?.name && existingLead?.month && (existingLead?.day_preference || existingLead?.day_of_month) && existingLead?.guests;
      if (hasCompleteData) {
        console.log(`[Bot] Lead ${conv.lead_id} already qualified from LP, bot_step: ${conv.bot_step}`);
        
        // If we're waiting for proximo_passo answer, don't return - let it process below
        if (conv.bot_step === 'proximo_passo' || conv.bot_step === 'proximo_passo_reminded') {
          console.log(`[Bot] Lead is qualified but waiting for proximo_passo answer, continuing...`);
          // Don't return - continue to process the proximo_passo step below
        } else if (!conv.bot_step || conv.bot_step === 'welcome') {
          // First message from LP lead — send welcome + materials + next step question (same as direct leads)
          const defaultQualifiedMsg = `Olá, {nome}! 👋\n\nRecebemos seu interesse pelo site e já temos seus dados aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}`;
          const qualifiedTemplate = settings.qualified_lead_message || defaultQualifiedMsg;
          
          const dayDisplay = existingLead.day_of_month ? `Dia ${existingLead.day_of_month}` : (existingLead.day_preference || '');
          const leadData: Record<string, string> = {
            nome: existingLead.name,
            mes: existingLead.month || '',
            dia: dayDisplay,
            convidados: existingLead.guests || '',
          };
          
          const welcomeMsg = replaceVariables(qualifiedTemplate, leadData);
          
          // Send welcome message
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, welcomeMsg);
          
          if (msgId) {
            // Save message to database
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              company_id: instance.company_id,
              content: welcomeMsg,
              status: 'sent',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update step to sending_materials (same as direct flow)
          await supabase.from('wapi_conversations').update({
            bot_step: 'sending_materials',
            bot_data: leadData,
            last_message_at: new Date().toISOString(),
            last_message_content: welcomeMsg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          console.log(`[Bot] Sent qualified lead welcome message to ${contactPhone}, now sending materials...`);
          
          // Send materials + next step question in background (same as direct flow after qualification)
          const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
          const nextStepQuestion = settings.next_step_question || defaultNextStepQuestion;
          
          EdgeRuntime.waitUntil(
            sendQualificationMaterialsThenQuestion(
              supabase,
              instance,
              conv,
              leadData,
              settings,
              nextStepQuestion
            ).catch(err => console.error('[Bot] Error sending LP lead materials:', err))
          );
          
          return;
        } else if (conv.bot_step === 'sending_materials') {
          // Materials are being sent, ignore incoming messages during this phase
          console.log(`[Bot] Lead ${conv.lead_id} is in sending_materials phase, ignoring message`);
          return;
        } else {
          // For other steps (like complete_final, qualified_from_lp), return
          return;
        }
      }
  }

  // Get questions from database
  const questions = await getBotQuestions(supabase, instance.id);
  const questionSteps = Object.keys(questions);
  const firstStep = questionSteps[0] || 'nome';

  const step = conv.bot_step || 'welcome';
  const botData = (conv.bot_data || {}) as Record<string, string>;
  let nextStep: string;
  let msg: string = '';
  const updated = { ...botData };

  if (step === 'welcome') {
    // Send welcome message + first question
    const firstQ = questions[firstStep];
    msg = settings.welcome_message + '\n\n' + (firstQ?.question || DEFAULT_QUESTIONS.nome.question);
    nextStep = firstStep;
  } else if (questions[step] || step === 'proximo_passo' || step === 'proximo_passo_reminded') {
    // Get the current question text for dynamic option extraction
    const currentQuestionText = questions[step]?.question;
    
    // Validate the answer
    const validation = validateAnswer(step, content, currentQuestionText);
    
    if (!validation.valid) {
      // Invalid answer - re-send error with menu
      msg = validation.error || 'Não entendi sua resposta. Por favor, tente novamente.';
      nextStep = step;
      console.log(`[Bot] Invalid answer for step ${step}: "${content.substring(0, 50)}"`);
    } else {
      // Valid answer - save and proceed
      updated[step] = validation.value || content.trim();
      
      const currentQ = questions[step];
      const nextStepKey = currentQ?.next || (step === 'proximo_passo' || step === 'proximo_passo_reminded' ? 'complete_final' : 'complete');
      
      // Special handling for "tipo" step - check if already client
      if (step === 'tipo') {
        const isAlreadyClient = validation.value === 'Já sou cliente' || content.trim() === '1';
        
        if (isAlreadyClient) {
          // User is already a client - transfer to commercial team, disable bot, don't create lead
          console.log(`[Bot] User ${contactPhone} is already a client. Transferring to commercial team.`);
          
          // Use configurable transfer message or default
          const defaultTransfer = `Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑`;
          const transferTemplate = settings.transfer_message || defaultTransfer;
          msg = replaceVariables(transferTemplate, updated);
          nextStep = 'transferred';
          
          // Send message, disable bot, and DON'T create lead
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          
          if (msgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            });
          }
          
          // Mark as transferred and disable bot - DO NOT create lead
          await supabase.from('wapi_conversations').update({
            bot_step: 'transferred',
            bot_data: updated,
            bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          // Create notifications for users with permission for this unit
          try {
            const unitLower = instance.unit?.toLowerCase() || '';
            const unitPermission = `leads.unit.${unitLower}`;
            
            // Get users with permission for this unit or all units
            const { data: userPerms } = await supabase
              .from('user_permissions')
              .select('user_id')
              .eq('granted', true)
              .in('permission', [unitPermission, 'leads.unit.all']);
            
            // Also get admin users
            const { data: adminRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');
            
            // Combine unique user IDs
            const userIds = new Set<string>();
            userPerms?.forEach(p => userIds.add(p.user_id));
            adminRoles?.forEach(r => userIds.add(r.user_id));
            
            // Create notification for each user
            const notifications = Array.from(userIds).map(userId => ({
              user_id: userId,
              type: 'existing_client',
              title: 'Cliente existente precisa de atenção',
              message: `${updated.nome || contactName || contactPhone} disse que já é cliente`,
              data: {
                conversation_id: conv.id,
                contact_name: updated.nome || contactName || contactPhone,
                contact_phone: contactPhone,
                unit: instance.unit || 'Unknown'
              },
              read: false
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
              console.log(`[Bot] Created ${notifications.length} notifications for existing client alert`);
            }
          } catch (notifErr) {
            console.error('[Bot] Error creating client notifications:', notifErr);
          }
          
          console.log(`[Bot] Conversation transferred. Bot disabled. No lead created.`);
          return; // Exit early - don't continue with normal flow
        }
        // Check if wants to work here (option 3)
        const wantsWork = validation.value === 'Trabalhe no Castelo' || content.trim() === '3';
        
        if (wantsWork) {
          console.log(`[Bot] User ${contactPhone} wants to work here. Creating RH lead.`);
          
          const defaultWorkResponse = `Que legal que você quer fazer parte do nosso time! 🏰✨\n\nEnvie seu currículo aqui nesta conversa e nossa equipe de RH vai analisar!\n\nObrigado pelo interesse! 👑`;
          const workResponseTemplate = settings.work_here_response || defaultWorkResponse;
          msg = replaceVariables(workResponseTemplate, updated);
          nextStep = 'work_interest';
          
          // Send message
          const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
          
          if (msgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id,
              message_id: msgId,
              from_me: true,
              message_type: 'text',
              content: msg,
              status: 'sent',
              timestamp: new Date().toISOString(),
              company_id: instance.company_id,
            });
          }
          
          // Create lead with "Trabalhe Conosco" unit
          const leadName = updated.nome || contactName || contactPhone;
          const { data: newLead, error: leadErr } = await supabase.from('campaign_leads').insert({
            name: leadName,
            whatsapp: n,
            unit: 'Trabalhe Conosco',
            campaign_id: 'whatsapp-bot-rh',
            campaign_name: 'WhatsApp (Bot) - RH',
            status: 'trabalhe_conosco',
            company_id: instance.company_id,
          }).select('id').single();
          
          if (leadErr) {
            console.error(`[Bot] Error creating RH lead:`, leadErr.message);
          } else {
            console.log(`[Bot] RH Lead created: ${newLead.id}`);
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }
          
          // Disable bot
          await supabase.from('wapi_conversations').update({
            bot_step: 'work_interest',
            bot_data: updated,
            bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true
          }).eq('id', conv.id);
          
          // Create notifications for admins
          try {
            const { data: adminRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');
            
            const notifications = (adminRoles || []).map(r => ({
              user_id: r.user_id,
              type: 'work_interest',
              title: '👷 Interesse em trabalhar no Castelo',
              message: `${leadName} quer trabalhar no Castelo! Enviou interesse via WhatsApp.`,
              data: {
                conversation_id: conv.id,
                contact_name: leadName,
                contact_phone: contactPhone,
              },
              read: false
            }));
            
            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
              console.log(`[Bot] Created ${notifications.length} notifications for work interest`);
            }
          } catch (notifErr) {
            console.error('[Bot] Error creating work interest notifications:', notifErr);
          }
          
          console.log(`[Bot] Work interest flow complete. Bot disabled.`);
          return;
        }
        
        // If wants quote (option 2), continue with normal flow
        console.log(`[Bot] User ${contactPhone} wants a quote. Continuing qualification.`);
      }
      
      if (nextStepKey === 'complete') {
        // All qualification questions answered - create or update lead
        // Then: send completion msg -> send materials -> send next step question
        nextStep = 'sending_materials'; // New intermediate step
        
        // Build completion message from settings or use default
        const defaultCompletion = `Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}`;
        const completionTemplate = settings.completion_message || defaultCompletion;
        let completionMsg = replaceVariables(completionTemplate, updated);
        
        console.log(`[Bot] Qualification complete for ${contactPhone}. Data:`, JSON.stringify(updated));
        
        // Create or update lead
        if (conv.lead_id) {
          console.log(`[Bot] Updating existing lead ${conv.lead_id}`);
          const { error: updateErr } = await supabase.from('campaign_leads').update({
            name: updated.nome || contactName || contactPhone,
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
          }).eq('id', conv.lead_id);
          
          if (updateErr) {
            console.error(`[Bot] Error updating lead:`, updateErr.message);
          } else {
            console.log(`[Bot] Lead ${conv.lead_id} updated successfully`);
          }
        } else {
          console.log(`[Bot] Creating new lead for phone ${n}, unit ${instance.unit}`);
          const { data: newLead, error } = await supabase.from('campaign_leads').insert({
            name: updated.nome || contactName || contactPhone,
            whatsapp: n,
            unit: instance.unit,
            campaign_id: 'whatsapp-bot',
            campaign_name: 'WhatsApp (Bot)',
            status: 'novo',
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
            company_id: instance.company_id,
          }).select('id').single();
          
          if (error) {
            console.error(`[Bot] Error creating lead:`, error.message);
          } else {
            console.log(`[Bot] Lead created successfully: ${newLead.id}`);
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }
        }
        
        // Only send completion message now - materials and next step question will follow
        msg = completionMsg;
        
      } else if (nextStepKey === 'proximo_passo' || step === 'proximo_passo' || step === 'proximo_passo_reminded') {
        // Processing proximo_passo answer
        nextStep = 'complete_final';
        
        const choice = validation.value || '';
        let responseMsg = '';
        let newLeadStatus: 'em_contato' | 'aguardando_resposta' | 'novo' = 'novo';
        let scheduleVisit = false;
        let notificationType = '';
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationPriority = false;
        
        // Default responses
        const defaultVisitResponse = `Ótima escolha! 🏰✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!\n\nAguarde um momento que já vamos te chamar! 👑`;
        const defaultQuestionsResponse = `Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!\n\nEstamos à disposição! 👑`;
        const defaultAnalyzeResponse = `Sem problemas! 📋\n\nVou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!\n\nEstamos à disposição! 👑✨`;
        
        const leadName = updated.nome || contactName || contactPhone;
        
        if (choice === 'Agendar visita' || content.trim() === '1') {
          // User wants to schedule a visit - HIGH PRIORITY
          scheduleVisit = true;
          newLeadStatus = 'em_contato';
          responseMsg = settings.next_step_visit_response || defaultVisitResponse;
          notificationType = 'visit_scheduled';
          notificationTitle = '🗓️ VISITA AGENDADA - Ação urgente!';
          notificationMessage = `${leadName} quer agendar uma visita no Castelo! Entre em contato o mais rápido possível.`;
          notificationPriority = true;
          console.log(`[Bot] User ${contactPhone} wants to schedule a visit - updating status to em_contato`);
        } else if (choice === 'Tirar dúvidas' || content.trim() === '2') {
          // User wants to ask questions
          newLeadStatus = 'aguardando_resposta';
          responseMsg = settings.next_step_questions_response || defaultQuestionsResponse;
          notificationType = 'lead_questions';
          notificationTitle = '💬 Lead com dúvidas';
          notificationMessage = `${leadName} quer tirar dúvidas. Responda assim que possível!`;
          notificationPriority = false;
          console.log(`[Bot] User ${contactPhone} wants to ask questions - updating status to aguardando_resposta`);
        } else if (choice === 'Analisar com calma' || content.trim() === '3') {
          // User wants time to think
          newLeadStatus = 'aguardando_resposta';
          responseMsg = settings.next_step_analyze_response || defaultAnalyzeResponse;
          notificationType = 'lead_analyzing';
          notificationTitle = '📋 Lead analisando materiais';
          notificationMessage = `${leadName} está analisando os materiais. Aguarde ou faça follow-up em breve.`;
          notificationPriority = false;
          console.log(`[Bot] User ${contactPhone} wants time to analyze - updating status to aguardando_resposta`);
        } else {
          // Invalid choice, re-ask
          nextStep = 'proximo_passo';
          const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
          msg = `Por favor, responda apenas com o *número* da opção desejada (1, 2 ou 3) 👇\n\n${settings.next_step_question || defaultNextStepQuestion}`;
        }
        
        if (nextStep === 'complete_final') {
          msg = responseMsg;
          
          // Update conversation flags
          await supabase.from('wapi_conversations').update({
            has_scheduled_visit: scheduleVisit
          }).eq('id', conv.id);
          
          // Update lead status
          if (conv.lead_id) {
            await supabase.from('campaign_leads').update({
              status: newLeadStatus
            }).eq('id', conv.lead_id);
            
            // Record in lead history
            await supabase.from('lead_history').insert({
              lead_id: conv.lead_id,
              action: 'Próximo passo escolhido',
              old_value: 'novo',
              new_value: choice,
              company_id: instance.company_id,
            });
            
            console.log(`[Bot] Lead ${conv.lead_id} status updated to ${newLeadStatus}`);
          }
          
          // Create notifications for team
          if (notificationType) {
            try {
              const unitLower = instance.unit?.toLowerCase() || '';
              const unitPermission = `leads.unit.${unitLower}`;
              
              // Get users with permission for this unit or all units
              const { data: userPerms } = await supabase
                .from('user_permissions')
                .select('user_id')
                .eq('granted', true)
                .in('permission', [unitPermission, 'leads.unit.all']);
              
              // Also get admin users
              const { data: adminRoles } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'admin');
              
              // Combine unique user IDs
              const userIds = new Set<string>();
              userPerms?.forEach(p => userIds.add(p.user_id));
              adminRoles?.forEach(r => userIds.add(r.user_id));
              
              // Create notification for each user
              const notifications = Array.from(userIds).map(userId => ({
                user_id: userId,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                data: {
                  conversation_id: conv.id,
                  lead_id: conv.lead_id,
                  contact_name: leadName,
                  contact_phone: contactPhone,
                  unit: instance.unit || 'Unknown',
                  choice: choice,
                  priority: notificationPriority
                },
                read: false
              }));
              
              if (notifications.length > 0) {
                await supabase.from('notifications').insert(notifications);
                console.log(`[Bot] Created ${notifications.length} notifications for next step choice: ${choice}`);
              }
            } catch (notifErr) {
              console.error('[Bot] Error creating next step notifications:', notifErr);
            }
          }
        }
      } else {
        // More questions to ask
        nextStep = nextStepKey;
        const nextQ = questions[nextStepKey];
        
        // Build confirmation + next question
        let confirmation = currentQ.confirmation || '';
        if (confirmation) {
          confirmation = replaceVariables(confirmation, updated);
        }
        
        msg = confirmation ? `${confirmation}\n\n${nextQ?.question || ''}` : (nextQ?.question || '');
      }
    }
  } else {
    // Unknown step, reset
    return;
  }

  // Send the text message
  const msgId = await sendBotMessage(instance.instance_id, instance.instance_token, conv.remote_jid, msg);
  
  if (msgId) {
    await supabase.from('wapi_messages').insert({
      conversation_id: conv.id,
      message_id: msgId,
      from_me: true,
      message_type: 'text',
      content: msg,
      status: 'sent',
      timestamp: new Date().toISOString(),
      company_id: instance.company_id,
    });
  }
  
  await supabase.from('wapi_conversations').update({
    bot_step: nextStep,
    bot_data: updated,
    last_message_at: new Date().toISOString(),
    last_message_content: msg.substring(0, 100),
    last_message_from_me: true
  }).eq('id', conv.id);

  // After qualification complete (sending_materials step), send materials and then the next step question
  if (nextStep === 'sending_materials') {
    // Get next step question from database or use default
    const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${buildMenuText(PROXIMO_PASSO_OPTIONS)}`;
    const nextStepQuestion = settings.next_step_question || defaultNextStepQuestion;
    
    // Use background task to send materials, then send the next step question
    EdgeRuntime.waitUntil(
      sendQualificationMaterialsThenQuestion(
        supabase,
        instance,
        conv,
        updated,
        settings,
        nextStepQuestion
      ).catch(err => console.error('[Bot] Error sending materials:', err))
    );
  }
  
  // Disable bot after proximo_passo is answered
  if (nextStep === 'complete_final') {
    await supabase.from('wapi_conversations').update({
      bot_enabled: false
    }).eq('id', conv.id);
  }
}

// ============= AUTO-SEND MATERIALS AFTER QUALIFICATION =============

async function sendQualificationMaterials(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: {
    auto_send_materials?: boolean;
    auto_send_photos?: boolean;
    auto_send_presentation_video?: boolean;
    auto_send_promo_video?: boolean;
    auto_send_pdf?: boolean;
    auto_send_photos_intro?: string | null;
    auto_send_pdf_intro?: string | null;
    message_delay_seconds?: number;
  } | null
) {
  // Check if auto-send is enabled
  if (settings?.auto_send_materials === false) {
    console.log('[Bot Materials] Auto-send is disabled in settings');
    return;
  }

  const unit = instance.unit;
  const month = botData.mes || '';
  const guestsStr = botData.convidados || '';
  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  
  console.log(`[Bot Materials] Starting auto-send for ${phone}, unit: ${unit}, month: ${month}, guests: ${guestsStr}`);
  
  if (!unit) {
    console.log('[Bot Materials] No unit configured, skipping');
    return;
  }
  
  // Settings for which materials to send (default to true if not set)
  const sendPhotos = settings?.auto_send_photos !== false;
  const sendPresentationVideo = settings?.auto_send_presentation_video !== false;
  const sendPromoVideo = settings?.auto_send_promo_video !== false;
  const sendPdf = settings?.auto_send_pdf !== false;
  
  // Configurable delay between messages (default 5 seconds, convert to milliseconds)
  const messageDelay = (settings?.message_delay_seconds || 5) * 1000;
  
  // Custom intro messages
  const photosIntro = settings?.auto_send_photos_intro || '✨ Conheça nosso espaço incrível! 🏰🎉';
  const pdfIntro = settings?.auto_send_pdf_intro || '📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. Qualquer dúvida é só chamar! 💜';
  
  // Delay to ensure completion message is delivered first (uses configured delay)
  await new Promise(r => setTimeout(r, messageDelay));
  
  // Fetch captions for different material types
  const { data: captions } = await supabase
    .from('sales_material_captions')
    .select('caption_type, caption_text')
    .eq('is_active', true);
  
  const captionMap: Record<string, string> = {};
  captions?.forEach(c => { captionMap[c.caption_type] = c.caption_text; });
  
  // Fetch all active materials for this unit
  const { data: materials, error: matError } = await supabase
    .from('sales_materials')
    .select('*')
    .eq('unit', unit)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  
  if (matError || !materials?.length) {
    console.log(`[Bot Materials] No materials found for unit ${unit}`);
    return;
  }
  
  console.log(`[Bot Materials] Found ${materials.length} materials for ${unit}`);
  
  // Group materials by type
  const photoCollections = materials.filter(m => m.type === 'photo_collection');
  const presentationVideos = materials.filter(m => m.type === 'video' && m.name?.toLowerCase().includes('apresentação'));
  const promoVideos = materials.filter(m => m.type === 'video' && (m.name?.toLowerCase().includes('promo') || m.name?.toLowerCase().includes('carnaval')));
  const pdfPackages = materials.filter(m => m.type === 'pdf_package');
  
  // Extract guest count from string (e.g., "50 pessoas" -> 50)
  const guestMatch = guestsStr.match(/(\d+)/);
  const guestCount = guestMatch ? parseInt(guestMatch[1]) : null;
  
  // Determine if promo video should be sent (Feb/March)
  const isPromoMonth = month === 'Fevereiro' || month === 'Março';
  
  // Helper to send via W-API
  const sendImage = async (url: string, caption: string) => {
    try {
      // Download image to base64
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 32768) {
        const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
        bin += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const ct = imgRes.headers.get('content-type') || 'image/jpeg';
      const base64 = `data:${ct};base64,${btoa(bin)}`;
      
      const res = await fetch(`${WAPI_BASE_URL}/message/send-image?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, image: base64, caption })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending image:', e);
      return null;
    }
  };
  
  const sendVideo = async (url: string, caption: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-video?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, video: url, caption })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending video:', e);
      return null;
    }
  };
  
  const sendDocument = async (url: string, fileName: string) => {
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
      const res = await fetch(`${WAPI_BASE_URL}/message/send-document?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, document: url, fileName, extension: ext })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending document:', e);
      return null;
    }
  };
  
  const sendText = async (message: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, message, delayTyping: 1 })
      });
      
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) {
      console.error('[Bot Materials] Error sending text:', e);
      return null;
    }
  };
  
  const saveMessage = async (msgId: string, type: string, content: string, mediaUrl?: string) => {
    await supabase.from('wapi_messages').insert({
      conversation_id: conv.id,
      message_id: msgId,
      from_me: true,
      message_type: type,
      content,
      media_url: mediaUrl || null,
      status: 'sent',
      timestamp: new Date().toISOString(),
      company_id: instance.company_id,
    });
  };
  
  // 1. SEND PHOTO COLLECTION (with intro text)
  if (sendPhotos && photoCollections.length > 0) {
    const collection = photoCollections[0];
    const photos = collection.photo_urls || [];
    
    if (photos.length > 0) {
      console.log(`[Bot Materials] Sending ${photos.length} photos from collection`);
      
      // Send intro text (use custom or default caption)
      const introText = photosIntro.replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(introText);
      if (introMsgId) await saveMessage(introMsgId, 'text', introText);
      
      await new Promise(r => setTimeout(r, messageDelay / 2)); // Half delay for intro before photos
      
      // Send photos in parallel
      await Promise.all(photos.map(async (photoUrl: string) => {
        const msgId = await sendImage(photoUrl, '');
        if (msgId) await saveMessage(msgId, 'image', '📷', photoUrl);
      }));
      
      console.log(`[Bot Materials] Photos sent`);
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }
  
  // 2. SEND PRESENTATION VIDEO
  if (sendPresentationVideo && presentationVideos.length > 0) {
    const video = presentationVideos[0];
    console.log(`[Bot Materials] Sending presentation video: ${video.name}`);
    
    const videoCaption = captionMap['video'] || `🎬 Conheça a unidade ${unit}! ✨`;
    const caption = videoCaption.replace(/\{unidade\}/gi, unit);
    
    const msgId = await sendVideo(video.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, video.file_url);
    
    await new Promise(r => setTimeout(r, messageDelay));
  }
  
  // 3. SEND PDF PACKAGE (matching guest count) - Send PDF BEFORE promo video
  if (sendPdf && guestCount && pdfPackages.length > 0) {
    // Find exact match or closest package
    let matchingPdf = pdfPackages.find(p => p.guest_count === guestCount);
    
    if (!matchingPdf) {
      // Find closest package (equal or greater)
      const sortedPackages = pdfPackages.filter(p => p.guest_count).sort((a, b) => (a.guest_count || 0) - (b.guest_count || 0));
      matchingPdf = sortedPackages.find(p => (p.guest_count || 0) >= guestCount) || sortedPackages[sortedPackages.length - 1];
    }
    
    if (matchingPdf) {
      console.log(`[Bot Materials] Sending PDF package: ${matchingPdf.name} for ${guestCount} guests`);
      
      // Send intro message for PDF (use custom template with variables)
      const firstName = (botData.nome || '').split(' ')[0] || 'você';
      const pdfIntroText = pdfIntro
        .replace(/\{nome\}/gi, firstName)
        .replace(/\{convidados\}/gi, guestsStr)
        .replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(pdfIntroText);
      if (introMsgId) await saveMessage(introMsgId, 'text', pdfIntroText);
      
      await new Promise(r => setTimeout(r, messageDelay / 4)); // Short delay before PDF file
      
      // Send PDF with proper filename
      const fileName = matchingPdf.name?.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim() + '.pdf' || `Pacote ${guestCount} pessoas.pdf`;
      const msgId = await sendDocument(matchingPdf.file_url, fileName);
      if (msgId) await saveMessage(msgId, 'document', fileName, matchingPdf.file_url);
      
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }
  
  // 4. SEND PROMO VIDEO (only for Feb/March) - LAST material before next step question
  if (sendPromoVideo && isPromoMonth && promoVideos.length > 0) {
    const promoVideo = promoVideos[0];
    console.log(`[Bot Materials] Sending promo video for ${month}: ${promoVideo.name}`);
    
    const promoCaption = captionMap['video_promo'] || `🎭 Promoção especial! Garanta sua festa em ${month}! 🎉`;
    const caption = promoCaption.replace(/\{unidade\}/gi, unit);
    
    const msgId = await sendVideo(promoVideo.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, promoVideo.file_url);
    
    // Wait for video to be delivered before proceeding
    await new Promise(r => setTimeout(r, messageDelay * 1.5)); // Longer delay for video processing
  }
  
  // Update conversation last message
  await supabase.from('wapi_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_content: '📄 Materiais enviados',
    last_message_from_me: true
  }).eq('id', conv.id);
  
  console.log(`[Bot Materials] Auto-send complete for ${phone}`);
}

// Wrapper function that sends materials AND THEN the next step question
async function sendQualificationMaterialsThenQuestion(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: {
    auto_send_materials?: boolean;
    auto_send_photos?: boolean;
    auto_send_presentation_video?: boolean;
    auto_send_promo_video?: boolean;
    auto_send_pdf?: boolean;
    auto_send_photos_intro?: string | null;
    auto_send_pdf_intro?: string | null;
    message_delay_seconds?: number;
  } | null,
  nextStepQuestion: string
) {
  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  const messageDelay = (settings?.message_delay_seconds || 5) * 1000;
  
  try {
    // First, send all materials
    await sendQualificationMaterials(supabase, instance, conv, botData, settings);
    
    // Delay after materials (uses configured delay)
    await new Promise(r => setTimeout(r, messageDelay));
    
    // Now send the next step question
    console.log(`[Bot] Sending next step question to ${phone}`);
    
    const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
      body: JSON.stringify({ phone, message: nextStepQuestion, delayTyping: 2 })
    });
    
    let msgId = null;
    if (res.ok) {
      const r = await res.json();
      msgId = r.messageId || null;
    }
    
    if (msgId) {
      await supabase.from('wapi_messages').insert({
        conversation_id: conv.id,
        message_id: msgId,
        from_me: true,
        message_type: 'text',
        content: nextStepQuestion,
        status: 'sent',
        timestamp: new Date().toISOString(),
        company_id: instance.company_id,
      });
    }
    
    // Update conversation to proximo_passo step
    await supabase.from('wapi_conversations').update({
      bot_step: 'proximo_passo',
      last_message_at: new Date().toISOString(),
      last_message_content: nextStepQuestion.substring(0, 100),
      last_message_from_me: true
    }).eq('id', conv.id);
    
    console.log(`[Bot] Next step question sent to ${phone}`);
    
  } catch (err) {
    console.error(`[Bot] Error in sendQualificationMaterialsThenQuestion:`, err);
  }
}

function isPdfContent(bytes: Uint8Array): boolean { return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; }

function getExt(mime: string, fn?: string): string {
  if (fn) { const p = fn.split('.'); if (p.length > 1) return p[p.length - 1].toLowerCase(); }
  const m: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };
  return m[mime] || 'bin';
}

async function downloadMedia(supabase: SupabaseClient, iId: string, iToken: string, msgId: string, type: string, fn?: string, mKey?: string | null, dPath?: string | null, mUrl?: string | null, mime?: string | null): Promise<{ url: string; fileName: string } | null> {
  try {
    if (!mKey || !dPath) {
      console.log(`[${msgId}] Skipping download - missing mediaKey or directPath`);
      return null;
    }
    
    console.log(`[${msgId}] Starting download for type: ${type}`);
    const defMime = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/ogg' : mime || 'application/pdf';
    const body = { messageId: msgId, type, mimetype: defMime, mediaKey: mKey, directPath: dPath, ...(mUrl && !mUrl.includes('supabase.co') ? { url: mUrl } : {}) };
    
    const res = await fetch(`${WAPI_BASE_URL}/message/download-media?instanceId=${iId}`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${iToken}` }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[${msgId}] W-API download failed: ${res.status} - ${errText.substring(0, 200)}`);
      return null;
    }
    
    const r = await res.json();
    console.log(`[${msgId}] W-API response keys: ${Object.keys(r).join(', ')}`);
    
    let b64 = r.base64 || r.data || r.media;
    let rMime = r.mimetype || r.mimeType || defMime;
    const link = r.fileLink || r.file_link || r.url || r.link;
    
    // If W-API returns a fileLink instead of base64, fetch it
    if (!b64 && link) {
      console.log(`[${msgId}] Fetching from fileLink: ${link.substring(0, 50)}...`);
      const fr = await fetch(link);
      if (!fr.ok) {
        console.error(`[${msgId}] Failed to fetch fileLink: ${fr.status}`);
        return null;
      }
      const ct = fr.headers.get('content-type');
      if (ct) rMime = ct.split(';')[0].trim();
      
      const ab = await fr.arrayBuffer();
      const bytes = new Uint8Array(ab);
      console.log(`[${msgId}] Downloaded ${bytes.length} bytes from fileLink`);
      
      // PDF validation
      if (type === 'document' && rMime === 'application/pdf' && !isPdfContent(bytes)) {
        console.log(`[${msgId}] Invalid PDF content, skipping`);
        return null;
      }
      
      // Convert to base64 in chunks to avoid memory issues
      const CHUNK_SIZE = 32768;
      let bin = '';
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        bin += String.fromCharCode.apply(null, Array.from(chunk));
      }
      b64 = btoa(bin);
    }
    
    if (!b64) {
      console.log(`[${msgId}] No base64 data received from W-API`);
      return null;
    }
    
    console.log(`[${msgId}] Got base64 data, length: ${b64.length}`);
    
    // Decode base64 in chunks
    const bs = atob(b64);
    const bytes = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) bytes[i] = bs.charCodeAt(i);
    
    // PDF validation
    if (type === 'document' && (rMime === 'application/pdf' || fn?.toLowerCase().endsWith('.pdf')) && !isPdfContent(bytes)) {
      console.log(`[${msgId}] Invalid PDF content after decode, skipping`);
      return null;
    }
    
    const ext = getExt(rMime, fn);
    const path = type === 'document' && fn ? `received/documents/${msgId}_${fn.replace(/[^a-zA-Z0-9\-_\.]/g, '_').substring(0, 100)}` : `received/${type}s/${msgId}.${ext}`;
    
    console.log(`[${msgId}] Uploading ${bytes.length} bytes to ${path}`);
    const { error } = await supabase.storage.from('whatsapp-media').upload(path, bytes, { contentType: rMime, upsert: true });
    
    if (error) {
      console.error(`[${msgId}] Storage upload error:`, error.message);
      return null;
    }
    
    // Use signed URL for private bucket (7-day expiry)
    const { data: signedUrlData, error: signedErr } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
    if (signedErr || !signedUrlData?.signedUrl) {
      console.error(`[${msgId}] Signed URL creation error:`, signedErr?.message);
      return null;
    }
    console.log(`[${msgId}] Upload successful, signed URL: ${signedUrlData.signedUrl.substring(0, 60)}...`);
    return { url: signedUrlData.signedUrl, fileName: fn || `${msgId}.${ext}` };
  } catch (err) {
    console.error(`[${msgId}] Download error:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Fetch profile picture from W-API and update conversation (fire-and-forget)
async function fetchAndUpdateProfilePicture(
  supabase: SupabaseClient,
  instanceId: string,
  instanceToken: string,
  conversationId: string,
  remoteJid: string
): Promise<void> {
  try {
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
    
    // Try W-API profile picture endpoint
    const res = await fetch(
      `${WAPI_BASE_URL}/misc/profile-picture?instanceId=${instanceId}&phone=${phone}`,
      { headers: { 'Authorization': `Bearer ${instanceToken}` } }
    );
    
    if (!res.ok) {
      // Try alternative endpoint format
      const res2 = await fetch(
        `${WAPI_BASE_URL}/contact/profile-picture?instanceId=${instanceId}&phone=${phone}`,
        { headers: { 'Authorization': `Bearer ${instanceToken}` } }
      );
      if (!res2.ok) return;
      const data2 = await res2.json();
      const picUrl = data2?.profilePicture || data2?.profilePictureUrl || data2?.imgUrl || data2?.url || data2?.picture;
      if (picUrl) {
        await supabase.from('wapi_conversations').update({ contact_picture: picUrl }).eq('id', conversationId);
        console.log(`[ProfilePic] Updated profile picture for conversation ${conversationId}`);
      }
      return;
    }
    
    const data = await res.json();
    const picUrl = data?.profilePicture || data?.profilePictureUrl || data?.imgUrl || data?.url || data?.picture;
    if (picUrl) {
      await supabase.from('wapi_conversations').update({ contact_picture: picUrl }).eq('id', conversationId);
      console.log(`[ProfilePic] Updated profile picture for conversation ${conversationId}`);
    }
  } catch (err) {
    // Silent fail - profile picture is not critical
    console.warn(`[ProfilePic] Failed to fetch profile picture:`, err instanceof Error ? err.message : String(err));
  }
}

function extractMsgContent(mc: Record<string, unknown>, msg: Record<string, unknown>) {
  let type = 'text', content = '', url: string | null = null, key: string | null = null, path: string | null = null, fn: string | undefined, download = false, mime: string | null = null;
  
  if (mc.locationMessage) { type = 'location'; const l = mc.locationMessage as Record<string, unknown>; content = `📍 Localização: ${(l.degreesLatitude as number)?.toFixed(6) || '?'}, ${(l.degreesLongitude as number)?.toFixed(6) || '?'}`; }
  else if (mc.liveLocationMessage) { type = 'location'; content = '📍 Localização ao vivo'; }
  else if (mc.contactMessage || mc.contactsArrayMessage) { type = 'contact'; content = `👤 ${(mc.contactMessage as Record<string, unknown>)?.displayName || 'Contato'}`; }
  else if (mc.stickerMessage) { type = 'sticker'; content = '🎭 Figurinha'; }
  else if (mc.reactionMessage) return null;
  else if (mc.pollCreationMessage || mc.pollUpdateMessage) { type = 'poll'; content = '📊 Enquete'; }
  else if ((mc as Record<string, unknown>).conversation) content = (mc as Record<string, string>).conversation;
  else if ((mc.extendedTextMessage as Record<string, unknown>)?.text) content = ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  else if (mc.imageMessage) { const m = mc.imageMessage as Record<string, unknown>; type = 'image'; content = (m.caption as string) || '[Imagem]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.videoMessage) { const m = mc.videoMessage as Record<string, unknown>; type = 'video'; content = (m.caption as string) || '[Vídeo]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.audioMessage) { const m = mc.audioMessage as Record<string, unknown>; type = 'audio'; content = '[Áudio]'; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentMessage) { const m = mc.documentMessage as Record<string, unknown>; type = 'document'; content = (m.fileName as string) || '[Documento]'; fn = m.fileName as string; url = m.url as string || null; key = m.mediaKey as string || null; path = m.directPath as string || null; download = true; mime = m.mimetype as string || null; }
  else if (mc.documentWithCaptionMessage) { const d = ((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>; if (d) { type = 'document'; content = (d.caption as string) || (d.fileName as string) || '[Documento]'; fn = d.fileName as string; url = d.url as string || null; key = d.mediaKey as string || null; path = d.directPath as string || null; download = true; mime = d.mimetype as string || null; } }
  else if ((msg as Record<string, string>).body || (msg as Record<string, string>).text) content = (msg as Record<string, string>).body || (msg as Record<string, string>).text;
  
  return { type, content, url, key, path, fn, download, mime };
}

function getPreview(mc: Record<string, unknown>, msg: Record<string, unknown>): string {
  if ((mc as Record<string, unknown>).conversation) return (mc as Record<string, string>).conversation;
  if ((mc.extendedTextMessage as Record<string, unknown>)?.text) return ((mc.extendedTextMessage as Record<string, unknown>).text as string);
  if (mc.imageMessage) return '📷 Imagem';
  if (mc.videoMessage) return '🎥 Vídeo';
  if (mc.audioMessage) return '🎤 Áudio';
  if (mc.documentMessage) return '📄 ' + ((mc.documentMessage as Record<string, unknown>).fileName || 'Documento');
  if (mc.documentWithCaptionMessage) return '📄 ' + (((mc.documentWithCaptionMessage as Record<string, unknown>).message as Record<string, unknown>)?.documentMessage as Record<string, unknown>)?.fileName || 'Documento';
  if (mc.locationMessage) return '📍 Localização';
  if (mc.contactMessage || mc.contactsArrayMessage) return '👤 Contato';
  if (mc.stickerMessage) return '🎭 Figurinha';
  return (msg as Record<string, string>).body || (msg as Record<string, string>).text || '';
}

// Background processor - runs after response is sent
async function processWebhookEvent(body: Record<string, unknown>) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  
  const { event, instanceId, data } = body;
  const { data: instance, error: iErr } = await supabase.from('wapi_instances').select('*').eq('instance_id', instanceId).single();
  if (iErr || !instance) {
    console.log('Instance not found:', instanceId);
    return;
  }

  let evt = event || body.event;

  // If event is undefined but body contains message-like data, treat as message
  if (!evt) {
    const rawD = data as Record<string, unknown> | undefined;
    const hasKey = rawD?.key || body.key;
    const hasRemoteJid = rawD?.key?.remoteJid || rawD?.remoteJid || rawD?.from || body.key?.remoteJid || body.remoteJid || body.from;
    const hasMessageContent = rawD?.message || rawD?.msgContent || rawD?.body || rawD?.text || body.message || body.body || body.text;
    if (hasKey || (hasRemoteJid && hasMessageContent)) {
      console.log('[Webhook] No event field but message data detected, routing as messages.upsert');
      evt = 'messages.upsert';
    }
  }

  switch (evt) {
    case 'connection': case 'webhookConnected': {
      const c = (data as Record<string, unknown>)?.connected ?? body.connected ?? false;
      await supabase.from('wapi_instances').update({ status: c ? 'connected' : 'disconnected', phone_number: (data as Record<string, unknown>)?.phone || body.connectedPhone || null, connected_at: c ? new Date().toISOString() : null }).eq('id', instance.id);
      break;
    }
    case 'disconnection': case 'webhookDisconnected':
      await supabase.from('wapi_instances').update({ status: 'disconnected', connected_at: null }).eq('id', instance.id);
      break;
    case 'call': case 'webhookCall': case 'call_offer': case 'call_reject': case 'call_timeout': break;
    case 'message': case 'message-received': case 'messages.upsert': case 'webhookReceived': {
      // ⏱️ LATENCY: Start timing at beginning of message processing
      const processingStartAt = Date.now();
      
      // For messages.upsert, the message data is directly in `data` (with key, pushName, message, etc.)
      // For other events, message may be nested in data.message
      const rawData = data as Record<string, unknown>;
      const msg = rawData?.key ? rawData : (rawData?.message as Record<string, unknown>) || rawData || body;
      if (!msg) break;
      const mc = (msg as Record<string, unknown>).message || (msg as Record<string, unknown>).msgContent || {};
      if ((mc as Record<string, unknown>).protocolMessage) break;
      
      let rj = (msg as Record<string, unknown>).key?.remoteJid || (msg as Record<string, unknown>).from || (msg as Record<string, unknown>).remoteJid || ((msg as Record<string, unknown>).chat?.id ? `${(msg as Record<string, unknown>).chat?.id}` : null) || ((msg as Record<string, unknown>).sender?.id ? `${(msg as Record<string, unknown>).sender?.id}@s.whatsapp.net` : null);
      if (!rj) break;
      const isGrp = (rj as string).includes('@g.us');
      if (!isGrp && !(rj as string).includes('@')) rj = `${rj}@s.whatsapp.net`;
      else if ((rj as string).includes('@c.us')) rj = (rj as string).replace('@c.us', '@s.whatsapp.net');
      
      const fromMe = (msg as Record<string, unknown>).key?.fromMe || (msg as Record<string, unknown>).fromMe || false;
      const msgId = (msg as Record<string, unknown>).key?.id || (msg as Record<string, unknown>).id || (msg as Record<string, unknown>).messageId;
      const phone = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
      
      let cName = isGrp ? ((msg as Record<string, unknown>).chat?.name || (msg as Record<string, unknown>).groupName || (msg as Record<string, unknown>).subject || null) : ((msg as Record<string, unknown>).pushName || (msg as Record<string, unknown>).verifiedBizName || (msg as Record<string, unknown>).sender?.pushName || phone);
      const cPic = (msg as Record<string, unknown>).chat?.profilePicture || (msg as Record<string, unknown>).sender?.profilePicture || null;

      if (Object.keys(mc as object).length === 0 && !(msg as Record<string, unknown>).body && !(msg as Record<string, unknown>).text) break;
      if ((mc as Record<string, unknown>).call || (mc as Record<string, unknown>).callLogMessage || (mc as Record<string, unknown>).bcallMessage || (mc as Record<string, unknown>).missedCallMessage || (msg as Record<string, unknown>).type === 'call' || (msg as Record<string, unknown>).callId) break;

      // Extract message content early (no DB call)
      const ext = extractMsgContent(mc as Record<string, unknown>, msg as Record<string, unknown>);
      if (!ext) break;
      let { type, content, url, key, path, fn, download, mime } = ext;
      
      const preview = getPreview(mc as Record<string, unknown>, msg as Record<string, unknown>);
      const messageTimestamp = (msg as Record<string, unknown>).messageTimestamp 
        ? new Date(((msg as Record<string, unknown>).messageTimestamp as number) * 1000).toISOString() 
        : (msg as Record<string, unknown>).moment 
          ? new Date(((msg as Record<string, unknown>).moment as number) * 1000).toISOString() 
          : new Date().toISOString();
      
      // ⏱️ LATENCY: Log after parsing, before DB operations
      console.log(`[Latency] parsing_complete: ${Date.now() - processingStartAt}ms`);
      
      // Fetch existing conversation (single DB call) - use maybeSingle to handle 0 or 1 rows
      const { data: ex, error: exErr } = await supabase.from('wapi_conversations')
        .select('id, remote_jid, bot_enabled, bot_step, bot_data, unread_count, is_closed, contact_name, lead_id')
        .eq('instance_id', instance.id)
        .eq('remote_jid', rj)
        .maybeSingle();
      
      if (exErr) {
        console.error(`[Webhook] Error fetching conversation: ${exErr.message}`);
      }
      
      console.log(`[Latency] conversation_fetch: ${Date.now() - processingStartAt}ms, found: ${!!ex}`);
      
      let conv: { id: string; remote_jid: string; bot_enabled: boolean | null; bot_step: string | null; bot_data: Record<string, unknown> | null; lead_id: string | null };
      
      if (ex) {
        conv = ex;
        // Build update object
        const upd: Record<string, unknown> = { 
          last_message_at: new Date().toISOString(), 
          unread_count: fromMe ? ex.unread_count : (ex.unread_count || 0) + 1, 
          last_message_content: preview.substring(0, 100), 
          last_message_from_me: fromMe 
        };
        if (!fromMe && ex.is_closed) upd.is_closed = false;
        // Only disable bot for manual (human) outgoing messages, not bot-sent messages
        // Bot steps that are part of the active flow should NOT trigger bot disable
        const activeBotSteps = ['welcome', 'tipo', 'nome', 'mes', 'dia', 'convidados', 'sending_materials', 'proximo_passo', 'proximo_passo_reminded'];
        const isFlowBuilderStep = (ex.bot_step || '').startsWith('flow_');
        const isBotActiveStep = activeBotSteps.includes(ex.bot_step || '') || isFlowBuilderStep;
        if (fromMe && ex.bot_step && ex.bot_step !== 'complete' && !isBotActiveStep) upd.bot_enabled = false;
        if (isGrp) { 
          const gn = (msg as Record<string, unknown>).chat?.name || (msg as Record<string, unknown>).groupName || (msg as Record<string, unknown>).subject; 
          if (gn && gn !== ex.contact_name) upd.contact_name = gn; 
        } else if (cName && cName !== ex.contact_name) {
          upd.contact_name = cName;
        }
        if (cPic) upd.contact_picture = cPic;
        
        // Don't await - fire and forget for conversation update
        supabase.from('wapi_conversations').update(upd).eq('id', ex.id).then(() => {});
        
        // If no profile picture, fetch it in background
        if (!cPic && !ex.contact_picture) {
          fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, ex.id, rj as string)
            .catch(() => {});
        }
      } else {
        // New conversation - need to check for existing lead
        // First, do a final check to prevent race conditions (upsert-like behavior)
        const { data: raceCheck } = await supabase.from('wapi_conversations')
          .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id')
          .eq('instance_id', instance.id)
          .eq('remote_jid', rj)
          .maybeSingle();
        
        if (raceCheck) {
          // Conversation was created by another request in the meantime
          console.log(`[Webhook] Race condition avoided - conversation already exists: ${raceCheck.id}`);
          conv = raceCheck;
          // Update it with latest message info
          supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(), 
            unread_count: fromMe ? 0 : 1, 
            last_message_content: preview.substring(0, 100), 
            last_message_from_me: fromMe 
          }).eq('id', raceCheck.id).then(() => {});
        } else {
          const n = phone.replace(/\D/g, ''), vars = [n, n.replace(/^55/, ''), `55${n}`];
          const { data: lead } = await supabase.from('campaign_leads')
            .select('id, name, month, day_preference, guests')
            .or(vars.map(p => `whatsapp.ilike.%${p}%`).join(','))
            .eq('unit', instance.unit)
            .limit(1)
            .single();
          
          const hasCompleteLead = lead?.name && lead?.month && lead?.day_preference && lead?.guests;
          const shouldStartBot = !hasCompleteLead;
          
          const { data: nc, error: ce } = await supabase.from('wapi_conversations').insert({
            instance_id: instance.id, remote_jid: rj, contact_phone: phone, 
            contact_name: cName || (isGrp ? `Grupo ${phone}` : phone), contact_picture: cPic,
            last_message_at: new Date().toISOString(), unread_count: fromMe ? 0 : 1, 
            last_message_content: preview.substring(0, 100), last_message_from_me: fromMe,
            lead_id: lead?.id || null, bot_enabled: shouldStartBot, 
            bot_step: shouldStartBot ? 'welcome' : null, bot_data: {},
            company_id: instance.company_id,
          }).select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id').single();
          
          if (ce) {
            // If insert fails due to unique constraint, fetch existing
            console.log(`[Webhook] Insert failed (likely duplicate): ${ce.message}`);
            const { data: fallback } = await supabase.from('wapi_conversations')
              .select('id, remote_jid, bot_enabled, bot_step, bot_data, lead_id')
              .eq('instance_id', instance.id)
              .eq('remote_jid', rj)
              .single();
            if (!fallback) break;
            conv = fallback;
          } else {
            conv = nc;
            // Fetch profile picture in background for new conversations
            if (!cPic && nc?.id) {
              fetchAndUpdateProfilePicture(supabase, instance.instance_id, instance.instance_token, nc.id, rj as string)
                .catch(() => {});
            }
          }
        }
      }
      
      console.log(`[Latency] conversation_ready: ${Date.now() - processingStartAt}ms`);

      // Download media in parallel with message insert if needed (but only for received messages)
      let mediaPromise: Promise<{ url: string; fileName: string } | null> | null = null;
      if (download && !fromMe && msgId) {
        mediaPromise = downloadMedia(supabase, instance.instance_id, instance.instance_token, msgId as string, type, fn, key, path, url, mime);
      }

      // Insert message immediately (don't wait for media download)
      const insertStartAt = Date.now();
      await supabase.from('wapi_messages').insert({
        conversation_id: conv.id, message_id: msgId, from_me: fromMe, message_type: type, content,
        media_url: url, media_key: key, media_direct_path: path, status: fromMe ? 'sent' : 'received',
        timestamp: messageTimestamp,
        company_id: instance.company_id,
      });
      
      console.log(`[Latency] message_inserted: ${Date.now() - insertStartAt}ms (total: ${Date.now() - processingStartAt}ms)`);

      // If media download was started, wait for it and update the message
      if (mediaPromise) {
        mediaPromise.then(async (res) => {
          if (res) {
            await supabase.from('wapi_messages')
              .update({ media_url: res.url, media_key: null, media_direct_path: null })
              .eq('message_id', msgId);
            console.log(`[Latency] media_updated: ${Date.now() - processingStartAt}ms`);
          }
        }).catch(err => console.error('[Media download error]', err));
      }

      // Process bot qualification - MUST await to ensure bot messages are saved before function terminates
      if (!fromMe && !isGrp && type === 'text' && content) {
        try {
          await processBotQualification(supabase, instance, conv, content, phone, cName as string | null);
        } catch (err) {
          console.error('[Bot qualification error]', err);
        }
      }
      break;
    }
    case 'message-status': case 'message_ack': case 'webhookStatus': case 'webhookDelivery': {
      const sd = data || body, mId = (sd as Record<string, unknown>)?.messageId || body?.messageId, st = (sd as Record<string, unknown>)?.status, ack = (sd as Record<string, unknown>)?.ack;
      const fm = body?.fromMe || (sd as Record<string, unknown>)?.fromMe || false, mcd = body?.msgContent || (sd as Record<string, unknown>)?.msgContent;
      
      if (fm && mcd && mId) {
        const { data: em } = await supabase.from('wapi_messages').select('id').eq('message_id', mId).single();
        if (!em) {
          const cId = (body?.chat as Record<string, unknown>)?.id || (sd as Record<string, unknown>)?.chat?.id;
          if (cId) {
            let rj = (cId as string).includes('@') ? cId : `${cId}@s.whatsapp.net`;
            const p = (rj as string).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
            if (!(rj as string).includes('@g.us')) {
              const { data: ec } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', rj).single();
              let pv = '';
              if ((mcd as Record<string, unknown>).conversation) pv = (mcd as Record<string, unknown>).conversation as string;
              else if ((mcd as Record<string, unknown>).extendedTextMessage?.text) pv = (mcd as Record<string, unknown>).extendedTextMessage?.text as string;
              else if ((mcd as Record<string, unknown>).imageMessage) pv = '📷 Imagem';
              else if ((mcd as Record<string, unknown>).documentMessage) pv = '📄 ' + ((mcd as Record<string, unknown>).documentMessage?.fileName || 'Documento');
              
              let cv;
              if (ec) { cv = ec; await supabase.from('wapi_conversations').update({ last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, ...(ec.bot_step && ec.bot_step !== 'complete' ? { bot_enabled: false } : {}) }).eq('id', ec.id); }
              else { const { data: nc } = await supabase.from('wapi_conversations').insert({ instance_id: instance.id, remote_jid: rj, contact_phone: p, contact_name: (body?.chat as Record<string, unknown>)?.name || p, last_message_at: new Date().toISOString(), last_message_content: pv.substring(0, 100), last_message_from_me: true, bot_enabled: false, company_id: instance.company_id }).select().single(); cv = nc; }
              
              if (cv) {
                let ct = '', tp = 'text', mu = null;
                if ((mcd as Record<string, unknown>).conversation) ct = (mcd as Record<string, unknown>).conversation as string;
                else if ((mcd as Record<string, unknown>).extendedTextMessage?.text) ct = (mcd as Record<string, unknown>).extendedTextMessage?.text as string;
                else if ((mcd as Record<string, unknown>).imageMessage) { tp = 'image'; ct = (mcd as Record<string, unknown>).imageMessage?.caption || '[Imagem]'; mu = (mcd as Record<string, unknown>).imageMessage?.url; }
                else if ((mcd as Record<string, unknown>).documentMessage) { tp = 'document'; ct = (mcd as Record<string, unknown>).documentMessage?.fileName || '[Documento]'; mu = (mcd as Record<string, unknown>).documentMessage?.url; }
                await supabase.from('wapi_messages').insert({ conversation_id: cv.id, message_id: mId, from_me: true, message_type: tp, content: ct, media_url: mu, status: 'sent', timestamp: body.moment ? new Date((body.moment as number) * 1000).toISOString() : new Date().toISOString(), company_id: instance.company_id });
              }
            }
          }
        }
      }
      
      const sm: Record<string | number, string> = { 0: 'error', 1: 'pending', 2: 'sent', 3: 'delivered', 4: 'read', 'PENDING': 'pending', 'SENT': 'sent', 'DELIVERY': 'delivered', 'READ': 'read', 'PLAYED': 'read', 'ERROR': 'error' };
      const ns = sm[st as string | number] || sm[ack as string | number] || 'unknown';
      if (mId && ns !== 'unknown') await supabase.from('wapi_messages').update({ status: ns }).eq('message_id', mId);
      break;
    }
    default: {
      // Log the full body for unknown events to help debug
      console.log('Unhandled event:', evt);
      
      // Try to extract message from unknown events - W-API sometimes sends messages with different event names
      const unknownMsg = (data as Record<string, unknown>)?.message || data || body;
      const unknownMc = (unknownMsg as Record<string, unknown>)?.message || (unknownMsg as Record<string, unknown>)?.msgContent || {};
      const unknownFromMe = (unknownMsg as Record<string, unknown>)?.key?.fromMe || (unknownMsg as Record<string, unknown>)?.fromMe || false;
      
      // If this looks like a message we haven't handled, log details
      if (unknownFromMe || (unknownMsg as Record<string, unknown>)?.key?.id || (unknownMsg as Record<string, unknown>)?.messageId) {
        const msgId = (unknownMsg as Record<string, unknown>)?.key?.id || (unknownMsg as Record<string, unknown>)?.messageId;
        const rj = (unknownMsg as Record<string, unknown>)?.key?.remoteJid || (unknownMsg as Record<string, unknown>)?.from || (unknownMsg as Record<string, unknown>)?.remoteJid;
        console.log(`[Unknown event with message data] fromMe: ${unknownFromMe}, msgId: ${msgId}, remoteJid: ${rj}`);
        
        // If it's a fromMe message we haven't seen, process it like a regular message
        if (unknownFromMe && msgId && rj) {
          let jid = rj as string;
          if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;
          else if (jid.includes('@c.us')) jid = jid.replace('@c.us', '@s.whatsapp.net');
          
          const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '').replace('@lid', '');
          const isGrp = jid.includes('@g.us');
          
          // Skip group messages
          if (!isGrp) {
            const { data: existingConv } = await supabase.from('wapi_conversations').select('*').eq('instance_id', instance.id).eq('remote_jid', jid).single();
            
            if (existingConv) {
              // Check if message already exists
              const { data: existingMsg } = await supabase.from('wapi_messages').select('id').eq('message_id', msgId).single();
              
              if (!existingMsg) {
                // Extract content from unknown message
                let content = '';
                let type = 'text';
                let mediaUrl = null;
                
                if ((unknownMc as Record<string, unknown>).conversation) content = (unknownMc as Record<string, string>).conversation;
                else if ((unknownMc as Record<string, unknown>).extendedTextMessage?.text) content = ((unknownMc as Record<string, unknown>).extendedTextMessage as Record<string, unknown>).text as string;
                else if ((unknownMc as Record<string, unknown>).imageMessage) { type = 'image'; content = ((unknownMc as Record<string, unknown>).imageMessage as Record<string, unknown>).caption as string || '[Imagem]'; mediaUrl = ((unknownMc as Record<string, unknown>).imageMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).documentMessage) { type = 'document'; content = ((unknownMc as Record<string, unknown>).documentMessage as Record<string, unknown>).fileName as string || '[Documento]'; mediaUrl = ((unknownMc as Record<string, unknown>).documentMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).videoMessage) { type = 'video'; content = ((unknownMc as Record<string, unknown>).videoMessage as Record<string, unknown>).caption as string || '[Vídeo]'; mediaUrl = ((unknownMc as Record<string, unknown>).videoMessage as Record<string, unknown>).url as string; }
                else if ((unknownMc as Record<string, unknown>).audioMessage) { type = 'audio'; content = '[Áudio]'; mediaUrl = ((unknownMc as Record<string, unknown>).audioMessage as Record<string, unknown>).url as string; }
                else if ((unknownMsg as Record<string, string>).body) content = (unknownMsg as Record<string, string>).body;
                else if ((unknownMsg as Record<string, string>).text) content = (unknownMsg as Record<string, string>).text;
                
                if (content) {
                  console.log(`[Unknown event] Saving fromMe message: ${content.substring(0, 50)}...`);
                  
                  await supabase.from('wapi_messages').insert({
                    conversation_id: existingConv.id,
                    message_id: msgId,
                    from_me: true,
                    message_type: type,
                    content,
                    media_url: mediaUrl,
                    status: 'sent',
                    timestamp: (unknownMsg as Record<string, unknown>).messageTimestamp 
                      ? new Date(((unknownMsg as Record<string, unknown>).messageTimestamp as number) * 1000).toISOString() 
                      : new Date().toISOString(),
                    company_id: instance.company_id,
                  });
                  
                  // Update conversation
                  await supabase.from('wapi_conversations').update({
                    last_message_at: new Date().toISOString(),
                    last_message_content: content.substring(0, 100),
                    last_message_from_me: true,
                    ...(existingConv.bot_step && existingConv.bot_step !== 'complete' ? { bot_enabled: false } : {})
                  }).eq('id', existingConv.id);
                  
                  console.log(`[Unknown event] Message saved successfully`);
                }
              }
            }
          }
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Quick validation - check if instance exists
    const instanceId = body.instanceId;
    if (!instanceId) {
      console.log('No instanceId in webhook');
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Log minimal info for debugging
    const evt = body.event || 'unknown';
    console.log(`Webhook: ${evt} from ${instanceId}`);
    
    // Process in background - return response immediately
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processWebhookEvent(body));
    } else {
      // Fallback for environments without waitUntil - process async but don't await
      processWebhookEvent(body).catch(e => console.error('Background processing error:', e));
    }

    // Return immediately - don't wait for processing
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    console.error('Webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

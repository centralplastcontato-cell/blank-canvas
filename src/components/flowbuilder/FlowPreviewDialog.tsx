import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationFlow, FlowNode, FlowEdge } from './types';
import { Send, RotateCcw, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: ConversationFlow;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface Message {
  id: string;
  content: string;
  sender: 'bot' | 'user';
  options?: { label: string; value: string; id: string }[];
}

export function FlowPreviewDialog({
  open,
  onOpenChange,
  flow,
  nodes,
  edges,
}: FlowPreviewDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Find start node
  const findStartNode = useCallback(() => {
    return nodes.find(n => n.node_type === 'start');
  }, [nodes]);

  // Find next node based on edge
  const findNextNode = useCallback((fromNodeId: string, optionId?: string) => {
    const edge = edges.find(e => 
      e.source_node_id === fromNodeId && 
      (optionId ? e.source_option_id === optionId : e.condition_type === 'fallback')
    );
    
    if (!edge) {
      // Try fallback edge if option edge not found
      const fallbackEdge = edges.find(e => 
        e.source_node_id === fromNodeId && 
        (e.condition_type === 'fallback' || !e.source_option_id)
      );
      if (fallbackEdge) {
        return nodes.find(n => n.id === fallbackEdge.target_node_id);
      }
      return null;
    }

    return nodes.find(n => n.id === edge.target_node_id);
  }, [nodes, edges]);

  // Process a node (send its message)
  const processNode = useCallback((node: FlowNode) => {
    if (!node.message_template) return;

    setIsTyping(true);
    
    setTimeout(() => {
      const newMessage: Message = {
        id: crypto.randomUUID(),
        content: node.message_template || '',
        sender: 'bot',
        options: node.node_type === 'question' ? node.options?.map(o => ({
          label: o.label,
          value: o.value,
          id: o.id,
        })) : undefined,
      };

      setMessages(prev => [...prev, newMessage]);
      setCurrentNodeId(node.id);
      setIsTyping(false);

      // If it's an action or message without options, auto-advance
      if (node.node_type === 'action' || 
          (node.node_type === 'message' && (!node.options || node.options.length === 0))) {
        const nextNode = findNextNode(node.id);
        if (nextNode) {
          setTimeout(() => processNode(nextNode), 500);
        }
      }
    }, 800);
  }, [findNextNode]);

  // Start conversation
  const startConversation = useCallback(() => {
    const startNode = findStartNode();
    if (startNode) {
      setMessages([]);
      processNode(startNode);
    }
  }, [findStartNode, processNode]);

  // Handle user message
  const handleSendMessage = useCallback((message: string, optionId?: string) => {
    if (!message.trim() && !optionId) return;

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: message,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Find next node
    if (currentNodeId) {
      const nextNode = findNextNode(currentNodeId, optionId);
      if (nextNode) {
        processNode(nextNode);
      } else {
        // No next node - end of flow or AI fallback
        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            content: '(Aqui a IA assumiria para responder naturalmente)',
            sender: 'bot',
          }]);
          setIsTyping(false);
        }, 800);
      }
    }
  }, [currentNodeId, findNextNode, processNode]);

  // Handle option click
  const handleOptionClick = (label: string, optionId: string) => {
    handleSendMessage(label, optionId);
  };

  // Reset and start
  React.useEffect(() => {
    if (open) {
      startConversation();
    }
  }, [open, startConversation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Teste do Fluxo: {flow.name}</span>
            <Button variant="outline" size="sm" onClick={startConversation}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reiniciar
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.sender === 'user' && "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  msg.sender === 'bot' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {msg.sender === 'bot' ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className={cn(
                  "max-w-[80%] space-y-2",
                  msg.sender === 'user' && "text-right"
                )}>
                  <div className={cn(
                    "rounded-lg px-3 py-2 inline-block",
                    msg.sender === 'bot' 
                      ? "bg-muted text-foreground" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {msg.content}
                  </div>

                  {/* Quick reply options */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.options.map((opt) => (
                        <Button
                          key={opt.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleOptionClick(opt.label, opt.id)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite uma mensagem..."
              disabled={isTyping}
            />
            <Button type="submit" size="icon" disabled={isTyping || !inputValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

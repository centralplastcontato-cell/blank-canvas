UPDATE wapi_bot_settings SET 
  guest_limit = 91, 
  guest_limit_message = 'Nossa capacidade máxima é de 90 convidados. Para melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic, próximo de nós, para envio de orçamento sem compromisso.', 
  guest_limit_redirect_name = 'Buffet Mega Magic' 
WHERE instance_id = 'de1ab5b0-b867-4004-8c48-8cdd0691ea9e';
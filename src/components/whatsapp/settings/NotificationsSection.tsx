import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, BellRing, Clock, VolumeX, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NotificationSettings {
  soundEnabled: boolean;
  soundVolume: number;
  browserNotifications: boolean;
  unreadAlerts: boolean;
  alertDelayMinutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundVolume: 70,
  browserNotifications: true,
  unreadAlerts: true,
  alertDelayMinutes: 30,
};

const STORAGE_KEY = 'whatsapp_notification_settings';

export function NotificationsSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleSaveSettings = () => {
    setIsSaving(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    }, 500);
  };

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        setSettings({ ...settings, browserNotifications: true });
        toast({
          title: "Notificações ativadas",
          description: "Você receberá alertas no navegador.",
        });
      } else {
        toast({
          title: "Permissão negada",
          description: "As notificações do navegador foram bloqueadas.",
          variant: "destructive",
        });
      }
    }
  };

  const playTestSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = settings.soundVolume / 100 * 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    toast({
      title: "Som de teste",
      description: `Volume: ${settings.soundVolume}%`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Som de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Som de Notificações
          </CardTitle>
          <CardDescription>
            Configure o som que toca ao receber novas mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Ativar som</Label>
              <p className="text-sm text-muted-foreground">
                Tocar som ao receber novas mensagens
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
            />
          </div>

          {settings.soundEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-muted-foreground">{settings.soundVolume}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    value={[settings.soundVolume]}
                    onValueChange={([value]) => setSettings({ ...settings, soundVolume: value })}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <Button variant="outline" onClick={playTestSound} className="w-full sm:w-auto">
                <BellRing className="w-4 h-4 mr-2" />
                Testar Som
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notificações do Navegador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações do Navegador
          </CardTitle>
          <CardDescription>
            Receba alertas mesmo quando o app não estiver em foco
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationPermission === 'denied' ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4">
              <p className="text-sm font-medium">Notificações bloqueadas</p>
              <p className="text-sm mt-1">
                As notificações foram bloqueadas no seu navegador. Para ativá-las, 
                clique no ícone de cadeado na barra de endereços e permita notificações.
              </p>
            </div>
          ) : notificationPermission === 'default' ? (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Permissão necessária</p>
              <Button onClick={handleRequestNotificationPermission}>
                <Bell className="w-4 h-4 mr-2" />
                Permitir Notificações
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="browser-notifications">Notificações push</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir alertas quando receber novas mensagens
                </p>
              </div>
              <Switch
                id="browser-notifications"
                checked={settings.browserNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, browserNotifications: checked })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas de Leads Não Respondidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Alertas de Leads Não Respondidos
          </CardTitle>
          <CardDescription>
            Receba lembretes quando leads ficarem sem resposta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="unread-alerts">Ativar alertas</Label>
              <p className="text-sm text-muted-foreground">
                Alertar quando mensagens ficarem sem resposta
              </p>
            </div>
            <Switch
              id="unread-alerts"
              checked={settings.unreadAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, unreadAlerts: checked })}
            />
          </div>

          {settings.unreadAlerts && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tempo sem resposta</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.alertDelayMinutes} minutos
                </span>
              </div>
              <Slider
                value={[settings.alertDelayMinutes]}
                onValueChange={([value]) => setSettings({ ...settings, alertDelayMinutes: value })}
                min={5}
                max={120}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Alertar após {settings.alertDelayMinutes} minutos sem resposta
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MessageSquare, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { adminApi } from '../../api';
import { toast } from '../../components/ui/Toast';
import type { TelegramChat } from '../../types/admin';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: '#FFB300' },
  approved: { label: 'Одобрен', color: '#10B981' },
  rejected: { label: 'Отклонён', color: '#FF1744' },
};

export default function TelegramChatsPage() {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = () => {
    setLoading(true);
    adminApi.getTelegramChats()
      .then(setChats)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchChats(); }, []);

  const updateStatus = async (chatId: number, status: 'approved' | 'rejected') => {
    try {
      await adminApi.updateTelegramChat(chatId, { status });
      toast.success(status === 'approved' ? 'Чат одобрен' : 'Чат отклонён');
      fetchChats();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ошибка');
    }
  };

  const deleteChat = async (chatId: number) => {
    try {
      await adminApi.deleteTelegramChat(chatId);
      toast.success('Чат удалён');
      fetchChats();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const chatTypeLabel = (type: string) => {
    switch (type) {
      case 'group': return 'Группа';
      case 'supergroup': return 'Супергруппа';
      case 'channel': return 'Канал';
      case 'private': return 'Личный';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Telegram чаты</h1>
        <button
          onClick={fetchChats}
          className="flex items-center gap-2 text-sm bg-bg-card border border-border rounded-lg px-4 py-2 hover:border-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Instruction */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-primary">Как подключить Telegram-уведомления</p>
            <ol className="text-text-secondary space-y-1 list-decimal list-inside">
              <li>Добавьте бота в нужную группу или канал</li>
              <li>Отправьте команду <code className="bg-bg-card-hover px-1.5 py-0.5 rounded text-xs">/start</code> в чат с ботом</li>
              <li>Чат появится здесь со статусом «Ожидает»</li>
              <li>Нажмите «Одобрить» — и бот начнёт отправлять уведомления в этот чат</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Chats list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chats.length === 0 ? (
        <div className="bg-bg-card shadow-sm rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">Нет зарегистрированных чатов</p>
          <p className="text-text-muted text-sm mt-1">Добавьте бота в группу и отправьте /start</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {chats.map(chat => {
            const statusInfo = STATUS_MAP[chat.status] || STATUS_MAP.pending;
            return (
              <div key={chat.id} className="bg-bg-card shadow-sm rounded-xl p-5 flex items-center gap-4">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${statusInfo.color}15` }}
                >
                  <MessageSquare className="w-6 h-6" style={{ color: statusInfo.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{chat.title || `Chat ${chat.chat_id}`}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ color: statusInfo.color, background: `${statusInfo.color}20` }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                    <span>{chatTypeLabel(chat.chat_type)}</span>
                    {chat.username && <span>@{chat.username}</span>}
                    <span>ID: {chat.chat_id}</span>
                    <span>{new Date(chat.registered_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {chat.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(chat.id, 'approved')}
                        className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg px-3 py-2 hover:bg-green-500/25 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Одобрить
                      </button>
                      <button
                        onClick={() => updateStatus(chat.id, 'rejected')}
                        className="flex items-center gap-1.5 text-xs bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg px-3 py-2 hover:bg-red-500/25 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Отклонить
                      </button>
                    </>
                  )}
                  {chat.status === 'rejected' && (
                    <button
                      onClick={() => updateStatus(chat.id, 'approved')}
                      className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg px-3 py-2 hover:bg-green-500/25 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Одобрить
                    </button>
                  )}
                  {chat.status === 'approved' && (
                    <button
                      onClick={() => updateStatus(chat.id, 'rejected')}
                      className="flex items-center gap-1.5 text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded-lg px-3 py-2 hover:bg-yellow-500/25 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Отключить
                    </button>
                  )}
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

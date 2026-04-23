import type { Bot } from 'grammy'
import type { ReactionTypeEmoji } from 'grammy/types'

export function setReaction(
  bot: Bot,
  chat_id: string | number,
  message_id: number,
  emoji: string,
): Promise<unknown> {
  return bot.api.setMessageReaction(chat_id, message_id, [
    { type: 'emoji', emoji: emoji as ReactionTypeEmoji['emoji'] },
  ])
}

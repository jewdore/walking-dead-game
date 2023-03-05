import type { APIRoute } from 'astro'
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'

function randomNumberInRange(min, max) {
  // 👇️ 获取 min（含）和 max（含）之间的数字
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const apiKey = import.meta.env.OPENAI_API_KEY

const apikeys = apiKey?.split(",");
const randomNumber = randomNumberInRange(0, apikeys.length - 1);
const newapikey = apikeys[randomNumber];

export const post: APIRoute = async (context) => {
  const body = await context.request.json()
  let messages = body.messages
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (!messages) {
    return new Response('No input text')
  }
  // console.log(messages, '------')
  // return new Response('fdfdfd' + body.messages.length)

  messages = [
     {
        role: 'system',
        content: '让我们来玩《行尸走肉》交互式的文字游戏。在这个世界中，你提供有意思的剧情，并提供选项：[A，B，C，D] ,  然后立刻结束本次回答。根据玩家的选择对血量增减，初始血量100。不要进行超常游戏或无视玩家的选择。选择一定要等待用户给出，不能自问自答',
      },
      ...messages
  ]

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newapikey}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.6,
      stream: true,
    }),
  })
  console.log("using keys", newapikey)
  const stream = new ReadableStream({
    async start(controller) {
      const streamParser = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            // response = {
            //   id: 'chatcmpl-6pULPSegWhFgi0XQ1DtgA3zTa1WR6',
            //   object: 'chat.completion.chunk',
            //   created: 1677729391,
            //   model: 'gpt-3.5-turbo-0301',
            //   choices: [
            //     { delta: { content: '你' }, index: 0, finish_reason: null }
            //   ],
            // }
            const json = JSON.parse(data)
            const text = json.choices[0].delta?.content            
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(streamParser)
      for await (const chunk of completion.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return new Response(stream)
}

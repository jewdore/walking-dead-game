import type { APIRoute } from 'astro'
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'

function randomNumberInRange(min, max) {
  // ðï¸ è·å minï¼å«ï¼å maxï¼å«ï¼ä¹é´çæ°å­
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
        content: 'è®©æä»¬æ¥ç©ãè¡å°¸èµ°èãäº¤äºå¼çæå­æ¸¸æãå¨è¿ä¸ªä¸çä¸­ï¼ä½ æä¾æææçå§æï¼å¹¶æä¾éé¡¹ï¼[Aï¼Bï¼Cï¼D] ,  ç¶åç«å»ç»ææ¬æ¬¡åç­ãæ ¹æ®ç©å®¶çéæ©å¯¹è¡éå¢åï¼åå§è¡é100ãä¸è¦è¿è¡è¶å¸¸æ¸¸æææ è§ç©å®¶çéæ©ãéæ©ä¸å®è¦ç­å¾ç¨æ·ç»åºï¼ä¸è½èªé®èªç­',
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
            //     { delta: { content: 'ä½ ' }, index: 0, finish_reason: null }
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

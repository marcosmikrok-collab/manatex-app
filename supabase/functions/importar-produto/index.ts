import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url, produto_id } = await req.json()
    if (!url || !produto_id) throw new Error("URL e produto_id são obrigatórios")

    // 1. Descarrega o HTML da página do produto no site
    const htmlResponse = await fetch(url)
    const htmlText = await htmlResponse.text()

    // 2. Chama o Gemini para extrair os dados estruturados do HTML
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const prompt = `
      Analise o HTML abaixo de um produto de e-commerce e extraia as variações de cores e imagens.
      Retorne APENAS um JSON válido no seguinte formato sem formatação markdown:
      {
        "cores": [
          { "nome_cor": "Nome da Cor", "codigo_hex": "#HEX", "imagem_url": "URL_DA_IMAGEM" }
        ]
      }
      Se a imagem for relativa, converta para URL absoluta usando a base: ${new URL(url).origin}
      HTML:
      ${htmlText.substring(0, 100000)}
    `

    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    })

    const aiData = await aiRes.json()
    const extractedData = JSON.parse(aiData.candidates[0].content.parts[0].text)

    // 3. Inicializa o cliente Admin do Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const resultados = []

    // 4. Processa cada cor encontrada, faz upload no Storage e insere no banco
    for (const cor of extractedData.cores) {
      let finalImgUrl = cor.imagem_url

      try {
        const imgFetch = await fetch(cor.imagem_url)
        const imgBlob = await imgFetch.blob()
        const fileName = `${produto_id}/${Date.now()}_${cor.nome_cor.toLowerCase().replace(/\s+/g, '_')}.jpg`

        const { error: storageError } = await supabase
          .storage
          .from('produtos')
          .upload(fileName, imgBlob, { contentType: 'image/jpeg', upsert: true })

        if (!storageError) {
          const { data: publicUrlData } = supabase.storage.from('produtos').getPublicUrl(fileName)
          finalImgUrl = publicUrlData.publicUrl
        }
      } catch (e) {
        console.error(`Erro ao baixar imagem da cor ${cor.nome_cor}:`, e)
      }

      const { data: insertData, error: insertError } = await supabase
        .from('produto_cores')
        .insert([{
          produto_id: produto_id,
          nome_cor: cor.nome_cor,
          codigo_hex: cor.codigo_hex || '#000000',
          imagem_url: finalImgUrl
        }])
        .select()

      if (!insertError) resultados.push(insertData[0])
    }

    return new Response(
      JSON.stringify({ success: true, adicionados: resultados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
